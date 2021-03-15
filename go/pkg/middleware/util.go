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

package middleware

import (
	"fmt"
	"io/ioutil"
	"net/http"
	"strings"
)

// Read all response body bytes, and return response body as string, with
// leading and trailing whitespace stripped.
func GetStrippedBody(resp *http.Response) string {
	rbody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		panic(fmt.Errorf("readAll error: %v", err))
	}
	return strings.TrimSpace(string(rbody))
}
