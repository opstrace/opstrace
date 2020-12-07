// Copyright 2020 Opstrace, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package middleware

import (
	"crypto/rsa"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/dgrijalva/jwt-go"
	log "github.com/sirupsen/logrus"
)

type ReverseProxy struct {
	tenantName            string
	revproxyQuerier       *httputil.ReverseProxy
	revproxyDistributor   *httputil.ReverseProxy
	authenticationEnabled bool
}

// Use a single key for now. Further down the road there should be support
// for multiple public keys, each identified by a key id.
var authtokenVerificationPubKey *rsa.PublicKey

func NewReverseProxy(
	tenantName string,
	querierURL,
	distributorURL *url.URL,
	disableAPIAuthentication bool) *ReverseProxy {
	rp := &ReverseProxy{
		tenantName: tenantName,
		// See:
		// https://github.com/cortexproject/cortex/blob/master/docs/apis.md
		// https://github.com/grafana/loki/blob/master/docs/api.md#microservices-mode
		revproxyQuerier:       httputil.NewSingleHostReverseProxy(querierURL),
		revproxyDistributor:   httputil.NewSingleHostReverseProxy(distributorURL),
		authenticationEnabled: !disableAPIAuthentication,
	}

	rp.revproxyQuerier.ErrorHandler = proxyErrorHandler
	rp.revproxyDistributor.ErrorHandler = proxyErrorHandler

	rp.revproxyQuerier.ModifyResponse = rp.LogResponse
	rp.revproxyDistributor.ModifyResponse = rp.LogResponse

	transport := &http.Transport{
		Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   29 * time.Second, // WIP: checking which config option triggers an error
			KeepAlive: 28 * time.Second, // WIP: checking which config option triggers an error
			DualStack: true,
		}).DialContext,
		ForceAttemptHTTP2:     true,
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   9 * time.Second, // WIP: just checking the TLS handshake timeout triggers an error
		ExpectContinueTimeout: 1 * time.Second,
	}

	rp.revproxyQuerier.Transport = transport
	rp.revproxyDistributor.Transport = transport

	return rp
}

func (rp *ReverseProxy) LogResponse(resp *http.Response) error {
	log.Debugf("response status=%s request url=%s", resp.Status, resp.Request.URL.String())
	return nil
}

func (rp *ReverseProxy) HandleWithQuerierProxy(w http.ResponseWriter, r *http.Request) {
	if rp.authenticationEnabled && !requestAuthenticator(w, r, rp.tenantName) {
		// rely on response having been written, terminate request handling
		return
	}

	r.Header.Add("X-Scope-OrgID", rp.tenantName)
	rp.revproxyQuerier.ServeHTTP(w, r)
}

func (rp *ReverseProxy) HandleWithDistributorProxy(w http.ResponseWriter, r *http.Request) {
	if rp.authenticationEnabled && !requestAuthenticator(w, r, rp.tenantName) {
		// rely on response having been written, terminate request handling
		return
	}

	r.Header.Add("X-Scope-OrgID", rp.tenantName)
	rp.revproxyDistributor.ServeHTTP(w, r)
}

func proxyErrorHandler(resp http.ResponseWriter, r *http.Request, proxyerr error) {
	if r.Response != nil {
		log.Warnf("http: before overriding response status is %s", r.Response.Status)
	}
	// Native error handler behavior: set status and log
	resp.WriteHeader(http.StatusBadGateway)
	log.Warnf("http: proxy error: '%s'", proxyerr)

	// Additional: write string representation of proxy error (as bytes) to
	// response stream. Log when that fails.
	_, werr := resp.Write([]byte(proxyerr.Error()))
	if werr != nil {
		log.Errorf("writing response failed: %v", werr)
	}
}

func ReadAuthTokenVerificationKeyFromEnvOrCrash() {
	data, present := os.LookupEnv("API_AUTHTOKEN_VERIFICATION_PUBKEY")

	if !present {
		log.Errorf("API_AUTHTOKEN_VERIFICATION_PUBKEY must be set. Exit.")
		os.Exit(1)
	}

	if data == "" {
		log.Errorf("API_AUTHTOKEN_VERIFICATION_PUBKEY must not be empty. Exit.")
		os.Exit(1)
	}

	log.Infof("API_AUTHTOKEN_VERIFICATION_PUBKEY value: %s", data)

	// `os.LookupEnv` returns a string. We're interested in getting the bytes
	// underneath it.
	pubPem, _ := pem.Decode([]byte(data))

	badFormatMsg := "Unexpected key format. Expected: PEM-encoded X.509 SubjectPublicKeyInfo"

	if pubPem == nil {
		log.Error(badFormatMsg)
		panic(errors.New(badFormatMsg))
	}

	parsedkey, err := x509.ParsePKIXPublicKey(pubPem.Bytes)
	if err != nil {
		log.Error(badFormatMsg)
		panic(err)
	}

	// ParsePKIXPublicKey() above can deserialize various key types (RSA,
	// ECDSA, DSA). Use type assertion, support RSA only here for now.
	var pubkey *rsa.PublicKey
	var ok bool
	if pubkey, ok = parsedkey.(*rsa.PublicKey); !ok {
		panic(errors.New("pubkey is not of type RSA"))
	}

	// Set module global for subsequent consumption by authenticator logic.
	authtokenVerificationPubKey = pubkey
	log.Infof(
		"Got RSA public key from env var API_AUTHTOKEN_VERIFICATION_PUBKEY. Modulus size: %d bits",
		pubkey.Size()*8)
}

func requestAuthenticator(w http.ResponseWriter, r *http.Request, expectedTenantName string) bool {
	// Read first value set for Authorization header. (no support for multiple
	// of these headers yet, maybe never.)
	av := r.Header.Get("Authorization")
	if av == "" {
		return exit401(w, "Authorization header missing")
	}
	asplits := strings.Split(av, "Bearer ")

	if len(asplits) != 2 {
		return exit401(w, "Authorization header format invalid. Expecting `Authorization: Bearer <AUTHTOKEN>`")
	}

	authTokenUnverified := asplits[1]

	// Perform RFC 7519-compliant JWT verification (standard claims, such as
	// exp and nbf, but also cryptographic signature verification). Expect a
	// set of standard claims to be present (`sub`, `iss` and the likes), and
	// custom claims to not be present.
	tokenstruct, err := jwt.ParseWithClaims(
		authTokenUnverified, &jwt.StandardClaims{}, keyLookupCallback)

	if err != nil {
		log.Infof("jwt verification failed: %s", err)
	}

	// The `err` check above should be enough, but the documentation for
	// `jwt-go` is kind of bad and most code examples check this `Valid`
	// property, too.
	if !(tokenstruct.Valid) {
		log.Infof("jwt verification failed: %s", err)
		return exit401(w, "bad authentication token")
	}

	// https://godoc.org/github.com/dgrijalva/jwt-go#StandardClaims
	claims := tokenstruct.Claims.(*jwt.StandardClaims)
	// log.Infof("claims: %+v", claims)

	// Custom convention: encode Opstrace tenant name in subject, expect
	// a specific prefix.
	ssplits := strings.Split(claims.Subject, "tenant-")
	if len(ssplits) != 2 {
		log.Infof("invalid subject (tenant- prefix missing)")
		return exit401(w, "bad authentication token")
	}

	tenantNameFromToken := ssplits[1]
	// log.Debugf("authenticated for tenant: %s", tenantName)

	if expectedTenantName != tenantNameFromToken {
		return exit401(w, fmt.Sprintf("bad authentication token: unexpected tenant: %s",
			tenantNameFromToken))
	}
	return true
}

func keyLookupCallback(unveriftoken *jwt.Token) (interface{}, error) {
	// Receives the parsed, but unverified JWT payload. Can inspect claims to
	// decide which public key for verification to use. Use this to enforce the
	// RS256 signing method for now.

	if unveriftoken.Header["alg"] != "RS256" {
		err := fmt.Sprintf("jwt verif: invalid alg: %s", unveriftoken.Header["alg"])
		log.Info(err)
		return nil, fmt.Errorf(err)
	}

	return authtokenVerificationPubKey, nil
}

func exit401(resp http.ResponseWriter, errmsg string) bool {
	// `errmsg` is written to response body and should therefore be short and
	// not undermine security. Useful hints: yes (such as "authentication token
	// missing" or "unexpected Authorization header format"). No security hints
	// such as "signature verification failed".

	// 401 is canonical for "not authenticated" although the corresponding
	// name is 'Unauthorized'
	resp.WriteHeader(http.StatusUnauthorized)
	log.Infof("emit 401. Err: %s", errmsg)

	_, werr := resp.Write([]byte(errmsg))
	if werr != nil {
		log.Errorf("writing response failed: %v", werr)
	}
	return false
}
