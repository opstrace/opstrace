// Copyright 2021 Opstrace, Inc.
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

package authenticator

import (
	"crypto/rsa"
	//nolint: gosec // a strong hash is not needed here, md5 would also do it.

	"fmt"
	"net/http"
	"strings"

	"github.com/dgrijalva/jwt-go"
	log "github.com/sirupsen/logrus"
)

// Use a single key for now. Further down the road there should be support
// for multiple public keys, each identified by a key id.
var authtokenVerificationPubKeyFallback *rsa.PublicKey

// map for key set. Key of map: key ID (sha1 of PEM bytes?)
var authtokenVerificationPubKeys map[string]*rsa.PublicKey

// HTTP Request header used by GetTenant when disableAPIAuthentication is true and requireTenantName is nil.
// This is only meant for use in testing, and lines up with the tenant HTTP header used by Cortex and Loki.
const TestTenantHeader = "X-Scope-OrgID"

// Validates and returns the tenant name embedded in the request's Authorization header and returns (tenantName, true),
// or writes a 401 error to the response and returns ('', false) if the tenant was invalid or not found.
//
// If expectedTenantName is non-nil, then all requests are required to have a matching tenant,
// otherwise the tenant may vary per-request and is extracted from the verified Authorization header.
//
// If disableAPIAuthentication is true, then the expectedTenantName or X-Scope-OrgID is used without verification.
func GetTenant(
	w http.ResponseWriter,
	r *http.Request,
	expectedTenantName *string,
	disableAPIAuthentication bool,
) (string, bool) {
	if expectedTenantName == nil {
		// Tenant may vary on a per-request basis to this endpoint
		if disableAPIAuthentication {
			// TESTING: No single expected tenant, so check for tenant in the X-Scope-OrgID header
			tenantName := r.Header.Get(TestTenantHeader)
			if tenantName == "" {
				exit401(w, fmt.Sprintf("missing test %s header specifying tenant", TestTenantHeader))
				return "", false
			}
			return tenantName, true
		} else {
			// Read/validate tenant from signed bearer token
			authTokenUnverified, ok := getAPIAuthTokenUnverified(w, r)
			if !ok {
				return "", false
			}
			return getRequestAuthenticator(w, authTokenUnverified)
		}
	} else {
		// Tenant must match configured value across all requests to this endpoint
		if disableAPIAuthentication {
			// TESTING: Just assume the expected tenant
			return *expectedTenantName, true
		} else {
			// Validate the Authentication/Bearer token in the request and check that it has the expected tenant.
			if !DataAPIRequestAuthenticator(w, r, *expectedTenantName) {
				return "", false
			}
			return *expectedTenantName, true
		}
	}
}

// Verifies that the tenant name embedded in the request's Authorization header is valid and matches the
// expectedTenantName and returns true, or writes a 401 error to the response and returns false if the
// tenant was invalid, not found, or didn't match expectedTenantName.
func DataAPIRequestAuthenticator(w http.ResponseWriter, r *http.Request, expectedTenantName string) bool {
	authTokenUnverified, ok := getAPIAuthTokenUnverified(w, r)
	if !ok {
		return false
	}
	return compareRequestAuthenticator(w, authTokenUnverified, expectedTenantName)
}

// Expect HTTP request to have a header of the shape
//
//      `Authorization: Bearer <AUTHTOKEN>` set.
//
// Extract and cryptographically verify authentication proof in HTTP request.
// Emit error HTTP responses and return `false` upon any failure. Return `true`
// only when the authentication proof is valid and matches the expected
// Opstrace tenant name.
func getAPIAuthTokenUnverified(w http.ResponseWriter, r *http.Request) (string, bool) {
	// Read first value set for Authorization header. (no support for multiple
	// of these headers yet, maybe never.)
	av := r.Header.Get("Authorization")
	if av == "" {
		return "", exit401(w, "Authorization header missing")
	}
	asplits := strings.Split(av, "Bearer ")

	if len(asplits) != 2 {
		return "", exit401(w, "Authorization header format invalid. Expecting `Authorization: Bearer <AUTHTOKEN>`")
	}

	authTokenUnverified := asplits[1]
	return authTokenUnverified, true
}

// Expect HTTP request to have URL containing a query parameter
// api_key=<AUTHTOKEN>
//
// Extract and cryptographically verify authentication proof in HTTP request.
// Emit error HTTP responses and return `false` upon any failure. Return `true`
// only when the authentication proof is valid and matches the expected
// Opstrace tenant name.
func DDAPIRequestAuthenticator(w http.ResponseWriter, r *http.Request, expectedTenantName string) bool {
	// Assume that the DD agent sends the API key that it was configured with
	// as a URL query parameter, e.g. ``...?api_key=1337`.
	// Use that API key as Opstrace data API authentication token.

	// Only one parameter of that name is expected.
	apikey := r.URL.Query().Get("api_key")

	if apikey == "" {
		return exit401(w, "DD API key missing (api_key URL query parameter)")
	}

	authTokenUnverified := apikey
	return compareRequestAuthenticator(w, authTokenUnverified, expectedTenantName)
}

func getRequestAuthenticator(w http.ResponseWriter, authTokenUnverified string) (string, bool) {
	// Perform RFC 7519-compliant JWT verification (standard claims, such as
	// exp and nbf, but also cryptographic signature verification). Expect a
	// set of standard claims to be present (`sub`, `iss` and the likes), and
	// custom claims to not be present.
	tokenstruct, parseerr := jwt.ParseWithClaims(
		authTokenUnverified, &jwt.StandardClaims{}, keyLookupCallback)

	if parseerr != nil {
		log.Infof("jwt verification failed: %s", parseerr)
		// See below: must exit here, because `tokenstruct.Valid` may not
		// be accessible. See #282.
		return "", exit401(w, "bad authentication token")
	}

	// The `err` check above should be enough, but the documentation for
	// `jwt-go` is kind of bad and most code examples check this `Valid`
	// property, too. Update(JP): accessing `tokenstruct.Valid` can result in a
	// segmentation fault here when `parseerr` above is not `nil`! That is
	// why there are two checks and exit routes now.
	if !(tokenstruct.Valid) {
		log.Infof("jwt verification failed: %s", parseerr)
		return "", exit401(w, "bad authentication token")
	}

	// https://godoc.org/github.com/dgrijalva/jwt-go#StandardClaims
	claims := tokenstruct.Claims.(*jwt.StandardClaims)
	// log.Infof("claims: %+v", claims)

	// Custom convention: encode Opstrace tenant name in subject, expect
	// a specific prefix.
	ssplits := strings.Split(claims.Subject, "tenant-")
	if len(ssplits) != 2 {
		log.Infof("invalid subject (tenant- prefix missing)")
		return "", exit401(w, "bad authentication token")
	}

	tenantNameFromToken := ssplits[1]
	// log.Debugf("authenticated for tenant: %s", tenantNameFromToken)

	return tenantNameFromToken, true
}

func compareRequestAuthenticator(w http.ResponseWriter, authTokenUnverified string, expectedTenantName string) bool {
	tenantNameFromToken, ok := getRequestAuthenticator(w, authTokenUnverified)
	if !ok {
		return false
	}

	if expectedTenantName != tenantNameFromToken {
		return exit401(w, fmt.Sprintf("bad authentication token: unexpected tenant: %s",
			tenantNameFromToken))
	}
	return true
}

/*
First return value is *rsa.PublicKey, but need to specify as type interface{}
for compat with jwt lib.
*/
func keyLookupCallback(unveriftoken *jwt.Token) (interface{}, error) {
	// Receives the parsed, but unverified JWT payload. Can inspect claims to
	// decide which public key for verification to use. Use this to enforce the
	// RS256 signing method for now.

	if unveriftoken.Header["alg"] != "RS256" {
		err := fmt.Sprintf("jwt verif: invalid alg: %s", unveriftoken.Header["alg"])
		log.Info(err)
		return nil, fmt.Errorf(err)
	}

	kid, kidset := unveriftoken.Header["kid"]

	if kidset {
		pkey, keyknown := authtokenVerificationPubKeys[fmt.Sprintf("%s", kid)]
		if keyknown {
			return pkey, nil
		} else {
			err := fmt.Sprintf("jwt verif: unknown kid: %s", kid)
			log.Info(err)
			return nil, fmt.Errorf(err)
		}
	} else {
		// Key ID not set in auth token. Use fallback.
		return authtokenVerificationPubKeyFallback, nil
	}
}
