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
	"fmt"
	"strings"

	"github.com/golang-jwt/jwt/v4"
	log "github.com/sirupsen/logrus"
)

/*
The error message corresponding to the error returned in the 2-tuple is meant
to be exposed in an HTTP response. That is, it must not expose too much detail
(trade-off between debuggability / devX and security).
*/
func validateAuthTokenGetTenantName(authTokenUnverified string) (string, error) {
	// Perform RFC 7519-compliant JWT verification (standard claims, such as
	// exp and nbf, but also cryptographic signature verification). Expect a
	// set of standard claims to be present (`sub`, `iss` and the likes), and
	// custom claims to not be present.
	tokenstruct, veriferr := jwt.ParseWithClaims(
		authTokenUnverified, &jwt.RegisteredClaims{}, keyLookupCallback)

	if veriferr != nil {
		log.Infof("jwt verification failed: %s", veriferr)
		// See below: must exit here, because `tokenstruct.Valid` may not
		// be accessible. See #282.
		return "", fmt.Errorf("bad authentication token")
	}

	// The `err` check above should be enough, but the documentation for
	// `jwt-go` is kind of bad and most code examples check this `Valid`
	// property, too. Update(JP): accessing `tokenstruct.Valid` can result in a
	// segmentation fault here when `veriferr` above is not `nil`! That is
	// why there are two checks and exit routes now.
	if !(tokenstruct.Valid) {
		log.Infof("jwt verification failed: %s", veriferr)
		return "", fmt.Errorf("bad authentication token")
	}

	// https://pkg.go.dev/github.com/golang-jwt/jwt/v4#RegisteredClaims
	claims := tokenstruct.Claims.(*jwt.RegisteredClaims)
	// log.Infof("claims: %+v", claims)

	// Custom convention: encode Opstrace tenant name in subject, expect
	// a specific prefix.
	if !strings.HasPrefix(claims.Subject, "tenant-") {
		log.Infof("invalid subject (tenant- prefix missing): %s", claims.Subject)
		return "", fmt.Errorf("bad authentication token")
	}

	// Another part of custom spec/convection: we should also inspect the `aud`
	// claim: should be an Opstrace cluster name, and match the cluster name of
	// the Opstrace cluster that this authenticator runs in. Let's do this in
	// the future. For now, technically, the cryptographic verification already
	// confirms that (if key pairs are not shared between Opstrace clusters).

	tenantNameFromToken := strings.TrimPrefix(claims.Subject, "tenant-")
	// log.Debugf("authenticated for tenant: %s", tenantNameFromToken)

	return tenantNameFromToken, nil
}

/*
First return value is of type `*rsa.PublicKey`. However, need to specify as
type `interface{}` for compat with jwt lib.
*/
func keyLookupCallback(unveriftoken *jwt.Token) (interface{}, error) {
	// Receives the parsed, but unverified JWT payload. Can inspect claims to
	// decide which public key for verification to use. Use this to enforce the
	// RS256 signing method for now.

	unverfClaimsStr := fmt.Sprintf("%v", unveriftoken.Claims)
	kid, kidset := unveriftoken.Header["kid"]

	if unveriftoken.Header["alg"] != "RS256" {
		return nil, fmt.Errorf(
			"jwt verif: invalid alg: %s (unverif. claims: %v)",
			unveriftoken.Header["alg"],
			unverfClaimsStr,
		)
	}

	if kidset {
		kidStr := fmt.Sprintf("%s", kid)
		pkey, keyknown := authtokenVerificationPubKeys[kidStr]

		if keyknown {
			// A public key with the key ID as referred to by this unverified
			// authentication token is configured for the authenticator. That's
			// the happy path. Use that key to cryptographically verify the
			// token.
			return pkey, nil
		} else {
			// This could be an accident or a malicious token.
			return nil, fmt.Errorf("jwt verif: unknown kid: %s", kidStr)
		}
	} else {
		if authtokenVerificationPubKeyFallback == nil {
			return nil, fmt.Errorf(
				"kid not set in auth token, fallback key not set, consider token invalid (unverif. claims: %v)",
				unverfClaimsStr,
			)
		}

		log.Debug("kid not set in auth token, use fallback key (is configured)")
		return authtokenVerificationPubKeyFallback, nil
	}
}
