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
	"net/http"
)

// HTTP Request header used by GetTenant when disableAPIAuthentication is true
// and requireTenantName is nil. This is only meant for use in testing, and
// lines up with the tenant HTTP header used by Cortex and Loki.
const TestTenantHeader = "X-Scope-OrgID"

/*
Return 2-tuple `(tenantName: string, ok: bool)`.

If `ok` is `false` then do not use tenant name (empty string).

embedded in the request's Authorization header and
returns (tenantName, true), or writes a 401 error to the response and returns
('', false) if the tenant was invalid or not found.

If expectedTenantName is non-nil, then all requests are required to have a
matching tenant, otherwise the tenant may vary per-request and is extracted
from the verified Authorization header.

If disableAPIAuthentication is true, then the expectedTenantName or
X-Scope-OrgID is used without verification.

expected.. |  disableAPIAuthentication | behavior
--------------------------------------------------------------------------
 set       |  false (proof required)   | production setting: common
           |                           |   authn proof tenant name must match
           |                           |
 set       |  true (no proof req)      | production setting: not so common
           |                           |   authn proof tenant name ignored
           |                           |
 not set   |  false (proof req)        | production setting:
           |                           |  deployment supports more than one tenant
           |                           |  tenant name inferred from (verified) authn proof
           |                           |
 not set   |  true (no proof req)      | testing setting:
           |                           |  tenant name read from X-Scope-OrgID header
*/
func GetTenant(
	w http.ResponseWriter,
	r *http.Request,
	expectedTenantName *string,
	disableAPIAuthentication bool,
) (string, bool) {
	if expectedTenantName != nil {
		if !disableAPIAuthentication {
			// Authenticate and expect specific tenant. Otherwise send 401 response.
			if !AuthenticateSpecificTenantByHeaderOr401(w, r, *expectedTenantName) {
				return "", false
			}

			// Request is authenticated as the expected tenant.
			return *expectedTenantName, true
		}

		// ONLY FOR TESTING: do not inspect request, assume the expected tenant
		return *expectedTenantName, true
	}

	// Do not expect specific tenant: allow for incoming requests to be
	// authenticated with a variety of tenants.

	if !disableAPIAuthentication {
		// Authenticate (accept any tenant name). Otherwise send 401 response.
		tnFromReq, ok := AuthenticateAnyTenantByHeaderOr401(w, r)
		if !ok {
			return "", false
		}

		return tnFromReq, true
	}

	// ONLY FOR TESTING: no single expected tenant, and authenticator
	// is disabled: check for tenant in the X-Scope-OrgID header
	tenantName := r.Header.Get(TestTenantHeader)
	if tenantName == "" {
		exit401(w, fmt.Sprintf("missing test %s header specifying tenant", TestTenantHeader))
		return "", false
	}
	return tenantName, true
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

	tenantNameFromToken, veriferr := validateAuthTokenGetTenantName(authTokenUnverified)
	if veriferr != nil {
		return exit401(w, veriferr.Error())
	}

	if expectedTenantName != tenantNameFromToken {
		return exit401(w, fmt.Sprintf("bad authentication token: unexpected tenant: %s",
			tenantNameFromToken))
	}
	return true
}
