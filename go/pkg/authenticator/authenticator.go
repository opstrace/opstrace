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

// General note: authentication failure is an expected scenario, which is why
// the boolean `ok` paradigm is used instead of returning an error or nil.

// HTTP Request header used by GetTenant when disableAPIAuthentication is true
// and requireTenantName is nil. This is only meant for use in testing, and
// lines up with the tenant HTTP header used by Cortex and Loki.
const TestTenantHeader = "X-Scope-OrgID"

/*
Infer tenant identity (name) from request or context.

Return 2-tuple (tenantName: string, ok: bool).

Callers can rely on a 401 response to have been emitted when `ok` is `false`,
and should terminate request processing. If `ok` is `false` do not use
`tenantName`.

When `ok` is true, the request has been inspected and the returned `tenantName`
can be used by the caller.

If `disableAPIAuthentication` is `false` and `ok` is `true` then the returned
`tenantName` has been read from a validated dOpstrace tenant API authentication
token.

If `expectedTenantName` is non-nil, then each request's identity is required to
match this tenant. Otherwise, the tenant may vary per-request.

If `disableAPIAuthentication` is `true`, then the `expectedTenantName` or
X-Scope-OrgID header value is used (no cryptographic verification, insecure).

For clarity, the four states and their resulting behavior in tabular
representation:


expected.. |  disableAPIAuthentication | behavior
--------------------------------------------------------------------------
 set       |  false (proof required)   | production setting: common
           |                           |   tenant from authn proof must match
           |                           |
 set       |  true (no proof req)      | production setting: not so common
           |                           |   tenant from authn proof is ignored
		   |						   |   (INSECURE)
           |                           |
 not set   |  false (proof req)        | production setting:
           |                           |  deployment accepts requests for more
		   |                           |  than one tenant. tenant name inferred
           |                           |  from (verified) authn proof.
           |                           |
 not set   |  true (no proof req)      | testing setting:
           |                           |  tenant name read from X-Scope-OrgID header
*/
func GetTenantNameOr401(
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

/*
Expect HTTP request to specify a URL containing the query parameter
api_key=<AUTHTOKEN>

Extract and cryptographically verify that authentication token.

Emit error HTTP responses and return `false` upon any failure.

Return `true` only when the authentication proof is valid and matches the
expected Opstrace tenant name.

Callers can rely on a 401 response to have been emitted when `ok` is `false`.
*/
func AuthenticateSpecificTenantByDDQueryParamOr401(
	w http.ResponseWriter,
	r *http.Request,
	expectedTenantName string,
) bool {
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

/*
Expect HTTP request to be authenticated. Accept any tenant (identified by name).

Require the tenant authentication token to be presented via the Bearer scheme
in the `Authorization` header.

Return 2-tuple `(tenantName: string, ok: bool)`.

If `ok` is `false` then do not use tenant name (it is an empty string).

Write a 401 response to `w` when the authentication proof is not present,
in a bad format, or invalid in any way.

Callers can rely on a 401 response to have been emitted when `ok` is `false`.
*/
func AuthenticateAnyTenantByHeaderOr401(w http.ResponseWriter, r *http.Request) (string, bool) {
	authTokenUnverified, ok := getAuthTokenUnverifiedFromHeaderOr401(w, r)
	if !ok {
		return "", false
	}

	tenantNameFromToken, veriferr := validateAuthTokenGetTenantName(authTokenUnverified)
	if veriferr != nil {
		return "", exit401(w, veriferr.Error())
	}

	return tenantNameFromToken, true
}

/*
Expect HTTP request to be authenticated. Require that the tenant (identified by
its name) matches `expectedTenantName`.

Require the tenant authentication token to be presented via the Bearer scheme
in the `Authorization` header.

Return `true` when authentication succeeded.

Write a 401 response to `w` when the authentication proof is not present, in a
bad format, or invalid in any way. Return `false`.

Callers can rely on a 401 response to have been emitted when `ok` is `false`.
*/
func AuthenticateSpecificTenantByHeaderOr401(w http.ResponseWriter, r *http.Request, expectedTenantName string) bool {
	authTokenUnverified, ok := getAuthTokenUnverifiedFromHeaderOr401(w, r)
	if !ok {
		return false
	}

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
