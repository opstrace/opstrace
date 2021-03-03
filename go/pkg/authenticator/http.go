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
	"net/http"

	log "github.com/sirupsen/logrus"
)

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
