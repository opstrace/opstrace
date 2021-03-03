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

	"github.com/dgrijalva/jwt-go"
	log "github.com/sirupsen/logrus"
)

func validateAuthTokenGetTenantName(authTokenUnverified string) (string, error) {
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
		return "", fmt.Errorf("bad authentication token")
	}

	// The `err` check above should be enough, but the documentation for
	// `jwt-go` is kind of bad and most code examples check this `Valid`
	// property, too. Update(JP): accessing `tokenstruct.Valid` can result in a
	// segmentation fault here when `parseerr` above is not `nil`! That is
	// why there are two checks and exit routes now.
	if !(tokenstruct.Valid) {
		log.Infof("jwt verification failed: %s", parseerr)
		return "", fmt.Errorf("bad authentication token")
	}

	// https://godoc.org/github.com/dgrijalva/jwt-go#StandardClaims
	claims := tokenstruct.Claims.(*jwt.StandardClaims)
	// log.Infof("claims: %+v", claims)

	// Custom convention: encode Opstrace tenant name in subject, expect
	// a specific prefix.
	ssplits := strings.Split(claims.Subject, "tenant-")
	if len(ssplits) != 2 {
		log.Infof("invalid subject (tenant- prefix missing)")
		return "", fmt.Errorf("bad authentication token")
	}

	// Note: we could also inspect the `aud` claim: should be an Opstrace
	// cluster name, and match the cluster name of the Opstrace cluster that
	// this authenticator runs in. However, technically, the cryptographic
	// verification already confirms that (if key pairs are not shared between
	// Opstrace clusters).

	tenantNameFromToken := ssplits[1]
	// log.Debugf("authenticated for tenant: %s", tenantNameFromToken)

	return tenantNameFromToken, nil
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
