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
	"os"
	"testing"

	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

//nolint:lll // ignore long lines
var keysetEnvValTwoPubkeys = `
{
	"0773cd2a09713115bca465a5b12171cab7aecfe5": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAytbw9TvWedKzygbivO8t\n/6ZNT6uZxPAhNGITamwdgppvyf+7aHECHHAYgiqdI2bBRe8m+0+cHUceOwziewr7\nEClawdC61qGLp6Lw17nf8yM08ALSyAR976NCgCDFZ9Zxl5AAlfiyez88MFyjzXWC\nLmHWH02f9rs52PkYteXdhHe2nMvPNVKgWm1UUhEf80lFrFB51p7EkPmT8TW2lZ9p\nq2SnXQLi555ffaxOMos5tLx/Dji79q1Js5RzYCqrv0l+Wnr4IkSqYKSLrFnC/1ek\nAgM0R6DMFYRHGNnwGhNELPhd4DQKRUdNhEu0SLy0qSPpoTDpwgvXpcmOjUIUmRZU\nrwIDAQAB\n-----END PUBLIC KEY-----",
	"df99d68cf04b53c2697e4b537d6236a7a1ee79e9": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtJRlJmDqKfCO513D3pwV\n39VZh00MidESK0IQr6NQrG4DgL5H67VHuGZb4utdygQqqLxE6+cJfTi79Tlr7dmH\nWlgOxJ0swQLmjOgVAV4rowoYHj/L6dpFZzIseqwcqi5Rt4fyQm3FyMOCHX+mIRp6\ns1yV6/TfCe1OTz8ueS9WaSOROhtfv4Lh+DH2jwclT6PEEQtQjdBqxdlhFhptyWZf\nUldIEIwX1Cf8PrJpbUXNC7Vyr+iWC765hXwMq5w33jAS+s6E2QBs0UDUSp4Hgo1n\n53h7nGazgse5s6lCBddeclvOhEIWYRn4CXAbZsNntwOwveehou1l4RykMN34lNip\nDwIDAQAB\n-----END PUBLIC KEY-----"
}`

func TestKeysetFromEnv_TwoKeys(t *testing.T) {
	os.Setenv("API_AUTHTOKEN_VERIFICATION_PUBKEY_SET", keysetEnvValTwoPubkeys)

	log.Infof("keyset map:\n%v", authtokenVerificationPubKeys)
	log.Infof("fallback key:\n%v", authtokenVerificationPubKeyFallback)

	assert.Empty(
		t,
		authtokenVerificationPubKeys,
		"map authtokenVerificationPubKeys expected to be empty",
	)
	ReadKeySetJSONFromEnvOrCrash()

	log.Infof("keyset map:\n%v", authtokenVerificationPubKeys)
	log.Infof("fallback key:\n%v", authtokenVerificationPubKeyFallback)

	assert.NotEmpty(
		t,
		authtokenVerificationPubKeys,
		"map authtokenVerificationPubKeys expected to not be empty",
	)
}
