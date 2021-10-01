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

// Note that the private key corresponding to the third public key
// (with ID 624bd0...) was used to sign the token stored as
// `TenantAPITokenForKey624` below.
//nolint:lll // ignore long lines
const TestKeysetEnvValThreePubkeys = `
{
	"0773cd2a09713115bca465a5b12171cab7aecfe5": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAytbw9TvWedKzygbivO8t\n/6ZNT6uZxPAhNGITamwdgppvyf+7aHECHHAYgiqdI2bBRe8m+0+cHUceOwziewr7\nEClawdC61qGLp6Lw17nf8yM08ALSyAR976NCgCDFZ9Zxl5AAlfiyez88MFyjzXWC\nLmHWH02f9rs52PkYteXdhHe2nMvPNVKgWm1UUhEf80lFrFB51p7EkPmT8TW2lZ9p\nq2SnXQLi555ffaxOMos5tLx/Dji79q1Js5RzYCqrv0l+Wnr4IkSqYKSLrFnC/1ek\nAgM0R6DMFYRHGNnwGhNELPhd4DQKRUdNhEu0SLy0qSPpoTDpwgvXpcmOjUIUmRZU\nrwIDAQAB\n-----END PUBLIC KEY-----",
	"df99d68cf04b53c2697e4b537d6236a7a1ee79e9": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtJRlJmDqKfCO513D3pwV\n39VZh00MidESK0IQr6NQrG4DgL5H67VHuGZb4utdygQqqLxE6+cJfTi79Tlr7dmH\nWlgOxJ0swQLmjOgVAV4rowoYHj/L6dpFZzIseqwcqi5Rt4fyQm3FyMOCHX+mIRp6\ns1yV6/TfCe1OTz8ueS9WaSOROhtfv4Lh+DH2jwclT6PEEQtQjdBqxdlhFhptyWZf\nUldIEIwX1Cf8PrJpbUXNC7Vyr+iWC765hXwMq5w33jAS+s6E2QBs0UDUSp4Hgo1n\n53h7nGazgse5s6lCBddeclvOhEIWYRn4CXAbZsNntwOwveehou1l4RykMN34lNip\nDwIDAQAB\n-----END PUBLIC KEY-----",
	"624bd05d77efb13d9d1ed923baef5483b5e07933": "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvdiYGI2880F3leaGWMw1\nhaXKL7kMA1JJn5zylkQeMK1pmy/DzcX+WyPDlgFJTJVDCt+geEIqMQg1TKdu+uYF\nAdt5Lsya6SuWLbGJQS5V8Hd6t9eFILvbI5gyR22Jbd3khtuLkkVVpFJVq5Qyh/6W\ngHaTyzfYRKrMK2OZNw3GtXj9VOXNYOclO38F5/hd3wroILGyBD9/SSs0EMujNE56\nKZF4IEFrXGxXbqM9x47q/JNFR2/ABD+A49ahVH7YHNXdzdtNanJ6eWOJhGPCDpgv\n4gO+zilBMdZtY1HmhUMAOwU0slrj9jCd/gYwwR5E1TkLzvuu8ssPX3U31okMuEnC\nUwIDAQAB\n-----END PUBLIC KEY-----"
}`

//nolint:lll // ignore long lines
const TestPubKey = "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtJRlJmDqKfCO513D3pwV\n39VZh00MidESK0IQr6NQrG4DgL5H67VHuGZb4utdygQqqLxE6+cJfTi79Tlr7dmH\nWlgOxJ0swQLmjOgVAV4rowoYHj/L6dpFZzIseqwcqi5Rt4fyQm3FyMOCHX+mIRp6\ns1yV6/TfCe1OTz8ueS9WaSOROhtfv4Lh+DH2jwclT6PEEQtQjdBqxdlhFhptyWZf\nUldIEIwX1Cf8PrJpbUXNC7Vyr+iWC765hXwMq5w33jAS+s6E2QBs0UDUSp4Hgo1n\n53h7nGazgse5s6lCBddeclvOhEIWYRn4CXAbZsNntwOwveehou1l4RykMN34lNip\nDwIDAQAB\n-----END PUBLIC KEY-----"

// Tenant API token created with
//	./build/bin/opstrace ta-create-token instancename tenantfoo keypair.pem
// Expires Oct 02, 2031
//nolint:lll,gosec // ignore long lines
const TenantAPITokenForKey624 = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjYyNGJkMDVkNzdlZmIxM2Q5ZDFlZDkyM2JhZWY1NDgzYjVlMDc5MzMifQ.eyJpYXQiOjE2MzMwODg0NTEsImV4cCI6MTk0ODY2NDQ1MSwiYXVkIjoib3BzdHJhY2UtY2x1c3Rlci1pbnN0YW5jZW5hbWUiLCJpc3MiOiJvcHN0cmFjZS1jbGkiLCJzdWIiOiJ0ZW5hbnQtdGVuYW50Zm9vIn0.vKHxvp_W_0HdZ6dxE6zJsrdFp8XdZrNprjyaAONOXmjps635CH3YQdv3vy6oPg7leGgjXEg0THRlmmn9pABRpeK71Yi_5ooU11-mbLKsKdPsu7ffvIGqhMhu_2fVXMOqTt4E_6zNlwkc2mwxRD4o4uH0o7RIErAPEaIUVnmp3LcvHKVU83yxamz8OXbFI1SfvxXYrPVGnUFFhxtRLwROgfts7cPO69hrn3mVHSUgrPuNbiSTa2UlLZas7Od1nfbguFXQTu880oo_72DgK1yEwMnCHb6IUJF8VNVGjv_j049gBBRpRCLSUXcZfJR7CVF-Lk_aKCRKFH4sZy_xyjUXtw"
