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

// Tries BasicAuth before falling back to checking the Authorization header.
func getUnverifiedHTTPAuthTokenOr401(w http.ResponseWriter, r *http.Request) (string, bool) {
	_, authTokenUnverifiedFromBasicAuth, ok := r.BasicAuth()
	if ok {
		// It's not documented what `ok` being `true` really means so this
		// next check is just for sanity
		if len(authTokenUnverifiedFromBasicAuth) > 1 {
			return authTokenUnverifiedFromBasicAuth, true
		}
	}

	authTokenUnverified, err := getUnverifiedAuthHeader(r.Header, "Authorization")
	if err != nil {
		return "", exit401(w, err.Error())
	}
	return authTokenUnverified, true
}

// Expect HTTP request to have a header of the shape
//
//      `<headerName>: Bearer <AUTHTOKEN>`
//
// set. Extract (and do _not_ verify) the authentication token. Emit error HTTP
// response and return `false` upon any failure.
//
// Added later, for legacy software: if this HTTP request has an Authorization
// header with the Basic scheme then extract the Basic auth credentials
// (username, password), ignore the username, and treat the password as
// <AUTHTOKEN>.
func getUnverifiedAuthHeader(headers map[string][]string, headerName string) (string, error) {
	// Read first value set for Authorization header. (no support for multiple
	// of these headers yet, maybe never.)
	av, ok := headers[headerName]
	if !ok || len(av) == 0 || av[0] == "" {
		return "", fmt.Errorf("%s header missing or invalid", headerName)
	}
	asplits := strings.Split(av[0], "Bearer ")

	if len(asplits) != 2 {
		return "", fmt.Errorf("%s header format invalid. Expecting 'Bearer <AUTHTOKEN>'", headerName)
	}

	authTokenUnverified := asplits[1]
	return authTokenUnverified, nil
}

/* Write 401 response and return false.

The return value is just for convenience: write `return exit401()` in the
caller instead of `exit401(); return false`.

`errmsg` is written to response body and should therefore be short and not
undermine security. Useful hints: yes (such as "authentication token missing"
or "unexpected Authorization header format"). No security hints such as
"signature verification failed".

Note that HTTP status code 401 is canonical for "not authenticated" although
the corresponding name is 'Unauthorized'.
*/
func exit401(resp http.ResponseWriter, errmsg string) bool {
	resp.WriteHeader(http.StatusUnauthorized)
	log.Infof("emit 401. Err: %s", errmsg)

	_, werr := resp.Write([]byte(errmsg))
	if werr != nil {
		log.Errorf("writing response failed: %v", werr)
	}
	return false
}
