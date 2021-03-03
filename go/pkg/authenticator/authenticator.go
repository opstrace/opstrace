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
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/dgrijalva/jwt-go"
	json "github.com/json-iterator/go"
	log "github.com/sirupsen/logrus"
)

/*

# Public key serialization format

Public keys need to be injected in the PEM-encoded X.509 SubjectPublicKeyInfo
format, which is what OpenSSL uses when writing a public key to a "PEM file".

Example flow to generate an RSA keypair using OpenSSL, and to write the pub key
out to a PEM file containing the format expected here:

    $ openssl genrsa -out keypair.pem 2048
    $ openssl rsa -in keypair.pem -out public.pem -pubout
    $ cat public.pem
    -----BEGIN PUBLIC KEY-----
    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1dJBQDgTL8ltms5ksNrW
    ...
    JuMRuClKi4dAFJVtW64A/Z86cYZ92CtmEP3rVkX7oouMUy5bYwbRHcNtKf4JD2KR
    kQIDAQAB
    -----END PUBLIC KEY-----


# Key ID calculation

For raw RSA public keys, there is no canonical way to build a key id. Here, we
define the following procedure:
- Take PEM text : "-----BEGIN PUBLIC KEY----- .... -----END PUBLIC KEY-----"
- Strip leading and trailing whitespace (in case it sneaked in)
- Use byte representation of PEM text (use utf-8/ascii)
- Build SHA1 hash from these bytes, and represent the resulting hash as a
  string in hex notation.

Python program example:

    $ cat keyid.py
    import hashlib
    import sys

    keytext = ''.join(l for l in sys.stdin)
    data = keytext.strip().encode('utf-8')
    print(hashlib.sha1(data).hexdigest())

    $ cat public.pem | python keyid.py
    d6de1ae63a549c56307b0b0b20c39dcf921b4a8a

# Expected public key set JSON structure

A flat map, keys and values being strings. Each key-value pair is expected to
represent an RSA public key. Each JSON key is expected to be the key ID
corresponding to the RSA pub key (see above for method). Each value is expected
to be an escaped JSON string, describing the pub key in the PEM-encoded X.509
SubjectPublicKeyInfo format. Example Python program to generate such a JSON doc
for multiple keys:

    $ cat build-key-config-json.py
    import hashlib
    import sys
    import json

    infiles = sys.argv[1:]

    stripped_pem_strings = []
    for fp in infiles:
        with open(fp, 'rb') as f:
            stripped_pem_strings.append(f.read().decode('utf-8').strip())

    keymap = {}
    for sps in stripped_pem_strings:
        data = sps.encode('utf-8')
        kid = hashlib.sha1(data).hexdigest()
        keymap[kid] = sps

    outjson = json.dumps(keymap, indent=2)
    print(outjson)

    $ python build-key-config-json.py public.pem public2.pem
    {
    "d6de1ae63a549c56307b0b0b20c39dcf921b4a8a": "-----BEGIN PUBLIC KEY-----\nM[...]B\n-----END PUBLIC KEY-----",
    "44610d7c2277d33a68abae86315eb6ea9b3734a9": "-----BEGIN PUBLIC KEY-----\nM[...]B\n-----END PUBLIC KEY-----"
    }

Note: when injecting this JSON doc via environment then don't use JSON
indentation.
*/

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

func ReadKeySetJSONFromEnvOrCrash() {
	data, present := os.LookupEnv("API_AUTHTOKEN_VERIFICATION_PUBKEYS")

	if !present {
		log.Errorf("API_AUTHTOKEN_VERIFICATION_PUBKEYS must be set. Exit.")
		os.Exit(1)
	}

	if data == "" {
		log.Errorf("API_AUTHTOKEN_VERIFICATION_PUBKEYS must not be empty. Exit.")
		os.Exit(1)
	}

	log.Infof("API_AUTHTOKEN_VERIFICATION_PUBKEYS value: %s", data)

	// Declared an empty interface
	var keys map[string]string
	// Unmarshal or Decode the JSON to the interface.
	jerr := json.Unmarshal([]byte(data), &keys)
	if jerr != nil {
		log.Errorf("error while JSON-parsing API_AUTHTOKEN_VERIFICATION_PUBKEYS: %s", jerr)
		os.Exit(1)
	}

	// Initialize map
	authtokenVerificationPubKeys = make(map[string]*rsa.PublicKey)

	for kidFromConfig, pemstring := range keys {
		log.Infof("parse PEM bytes for key with ID %s", kidFromConfig)
		// We're interested in processing the (PEM) bytes underneath the string
		// value.
		pubkey, err := deserializeRSAPubKeyFromPEMBytes([]byte(pemstring))
		if err != nil {
			log.Errorf("%s", err)
			os.Exit(1)
		}

		kidFromKey := keyIDfromPEM(pemstring)
		log.Infof("calculated key ID from PEM data: %s", kidFromKey)
		if kidFromKey != kidFromConfig {
			log.Errorf("key ID from config (%s) does not match key ID calculated from key (%s)", kidFromConfig, kidFromKey)
			os.Exit(1)
		}
		log.Infof("key ID confirmed")

		log.Infof(
			"Parsed RSA public key. Modulus size: %d bits",
			pubkey.Size()*8)

		// Store in global authenticator key set.
		authtokenVerificationPubKeys[kidFromConfig] = pubkey
	}
}

func keyIDfromPEM(pemstring string) string {
	//nolint: gosec // a strong hash is not needed here, md5 would also do it.
	h := sha1.New()
	// Trim leading and trailing whitespace from PEM string, take underlying
	// bytes and build the SHA1 hash from it -- represent it in hex form as
	// a string.
	h.Write([]byte(strings.TrimSpace(pemstring)))
	return hex.EncodeToString(h.Sum(nil))
}

func LegacyReadAuthTokenVerificationKeyFromEnv() {
	// Upgrade consideration: support for one pubkey -> support for multiple
	// pubkeys: legacy auth tokens don't encode a key id. Read legacy env var,
	// do not fail if not set. If set: store key as fallback, for tokens that
	// do not encode a key id. That way, an Opstrace cluster state is supported
	// that is in mixed state (with valid auth tokens of both types).
	data, present := os.LookupEnv("API_AUTHTOKEN_VERIFICATION_PUBKEY")

	if !present {
		log.Infof("API_AUTHTOKEN_VERIFICATION_PUBKEY is not set")
		return
	}

	if data == "" {
		log.Infof("API_AUTHTOKEN_VERIFICATION_PUBKEY is empty")
		return
	}

	log.Infof("API_AUTHTOKEN_VERIFICATION_PUBKEY value: %s", data)

	// `os.LookupEnv` returns a string. We're interested in processing the
	// bytes underneath it.
	pubkey, err := deserializeRSAPubKeyFromPEMBytes([]byte(data))
	if err != nil {
		log.Errorf("%s", err)
		os.Exit(1)
	}

	// Set module global for subsequent consumption by authenticator logic.
	authtokenVerificationPubKeyFallback = pubkey
	log.Infof("Successfully read RSA public key from legacy env var API_AUTHTOKEN_VERIFICATION_PUBKEY")
}
