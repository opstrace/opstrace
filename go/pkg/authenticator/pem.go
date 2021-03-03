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
	"crypto/x509"
	"encoding/pem"
	"fmt"

	log "github.com/sirupsen/logrus"
)

/*
Decode RSA public key from PEM data, expecting the X.509 SubjectPublicKeyInfo
format (which is what OpenSSL uses when writing a public key to a "PEM file").

Assume byte sequence `data` to be ascii-encoded PEM text.

This is how the expected format looks like:
    $ openssl rsa -in keypair.pem -out public.pem -pubout
    $ cat public.pem
    -----BEGIN PUBLIC KEY-----
    MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1dJBQDgTL8ltms5ksNrW
    ...
    JuMRuClKi4dAFJVtW64A/Z86cYZ92CtmEP3rVkX7oouMUy5bYwbRHcNtKf4JD2KR
    kQIDAQAB
    -----END PUBLIC KEY-----

See https://stackoverflow.com/a/29707204/145400
for a lovely serialization format discussion.
*/
func deserializeRSAPubKeyFromPEMBytes(data []byte) (*rsa.PublicKey, error) {
	pubPem, _ := pem.Decode(data)

	badFormatMsg := "Unexpected key format. Expected: PEM-encoded X.509 SubjectPublicKeyInfo"

	if pubPem == nil {
		return nil, fmt.Errorf(badFormatMsg)
	}

	parsedkey, err := x509.ParsePKIXPublicKey(pubPem.Bytes)
	if err != nil {
		return nil, fmt.Errorf(badFormatMsg)
	}

	// ParsePKIXPublicKey() above can deserialize various key types (RSA,
	// ECDSA, DSA). Use type assertion to see of which type the key is, and
	// support RSA only here for now.
	var pubkey *rsa.PublicKey
	var ok bool
	if pubkey, ok = parsedkey.(*rsa.PublicKey); !ok {
		return nil, fmt.Errorf("pubkey is not of type RSA")
	}

	log.Infof(
		"Deserialized RSA public key with modulus size: %d bits",
		pubkey.Size()*8)

	return pubkey, nil
}
