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

func TestKeysetFromEnv_TwoKeys(t *testing.T) {
	os.Setenv("API_AUTHTOKEN_VERIFICATION_PUBKEY_SET", TestKeysetEnvValTwoPubkeys)

	log.Infof("keyset map:\n%v", authtokenVerificationPubKeys)
	log.Infof("fallback key:\n%v", authtokenVerificationPubKeyFallback)

	assert.Empty(
		t,
		authtokenVerificationPubKeys,
		"map authtokenVerificationPubKeys expected to be empty",
	)
	readKeySetJSONFromEnvOrCrash()

	log.Infof("keyset map:\n%v", authtokenVerificationPubKeys)
	log.Infof("fallback key:\n%v", authtokenVerificationPubKeyFallback)

	assert.NotEmpty(
		t,
		authtokenVerificationPubKeys,
		"map authtokenVerificationPubKeys expected to not be empty",
	)
}

func TestKeysetFromEnv_EmtpySetButFallback(t *testing.T) {
	os.Setenv("API_AUTHTOKEN_VERIFICATION_PUBKEY_SET", "")
	os.Setenv("API_AUTHTOKEN_VERIFICATION_PUBKEY", TestPubKey)

	// This is now expected to _not_ crash, becuse a fallback key is
	// configured.
	ReadConfigFromEnvOrCrash()
	log.Infof("keyset map:\n%v", authtokenVerificationPubKeys)
	log.Infof("fallback key:\n%v", authtokenVerificationPubKeyFallback)
}
