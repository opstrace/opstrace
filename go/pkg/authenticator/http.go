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
	"strings"

	log "github.com/sirupsen/logrus"
)

// Expect HTTP request to have a header of the shape
//
//      `Authorization: Bearer <AUTHTOKEN>` set.
//
// Extract (and do _not_ verify authentication token from in HTTP request.
// Emit error HTTP responses and return `false` upon any failure.
func getAuthTokenUnverifiedFromHeaderOr401(w http.ResponseWriter, r *http.Request) (string, bool) {
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

/* Write 401 response and return false */
func exit401(resp http.ResponseWriter, errmsg string) bool {
	// `errmsg` is written to response body and should therefore be short and
	// not undermine security. Useful hints: yes (such as "authentication token
	// missing" or "unexpected Authorization header format"). No security hints
	// such as "signature verification failed".

	// 401 is canonical for "not authenticated" although the corresponding
	// name is 'Unauthorized'
	resp.WriteHeader(http.StatusUnauthorized)
	log.Infof("emit 401. Err: %s", errmsg)

	_, werr := resp.Write([]byte(errmsg))
	if werr != nil {
		log.Errorf("writing response failed: %v", werr)
	}
	return false
}

// Verify that the authentication token embedded in the request's Authorization
// header is valid.
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

// Verify that the tenant name embedded in the request's Authorization header
// is valid and matches the expectedTenantName. Return true in that case. Or
// write a 401 error response and return false in all other case.
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
