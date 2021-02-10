// Copyright 2019-2021 Opstrace, Inc.
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
	"net/http/httptest"
	"net/url"
	"regexp"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
)

func createProxyUpstream(tenantName string, t *testing.T) (*url.URL, func()) {
	// Create an actual HTTP server to be used as upstream (backend) for the
	// proxies to be tested. Any request to / checks the X-Scope-Orgid header
	// and writes the tenant name to the response.
	router := mux.NewRouter()
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, tenantName, r.Header.Get("X-Scope-Orgid"))
		fmt.Fprintln(w, tenantName)
	})

	backend := httptest.NewServer(router)

	upstreamURL, err := url.Parse(backend.URL)

	if err != nil {
		panic(err)
	}

	return upstreamURL, backend.Close
}

func TestReverseProxy_healthy(t *testing.T) {
	tenantName := "test"
	upstreamURL, upstreamClose := createProxyUpstream(tenantName, t)
	defer upstreamClose()

	// Reuse the same backend for both the querier and distributor requests.
	disableAPIAuth := true
	rp := NewReverseProxy(tenantName, upstreamURL, upstreamURL, disableAPIAuth)

	// Create a request to the proxy (not to the backend/upstream). The URL
	// does not really matter because we're bypassing the actual router.
	req := httptest.NewRequest("GET", "http://localhost", nil)

	checker := func(w *httptest.ResponseRecorder) {
		resp := w.Result()
		assert.Equal(t, 200, resp.StatusCode)
		// Check that the proxy's upstream has indeed written the response.
		assert.Equal(t, tenantName, getStrippedBody(resp))
	}

	w := httptest.NewRecorder()
	rp.HandleWithDistributorProxy(w, req)
	checker(w)

	w = httptest.NewRecorder()
	rp.HandleWithQuerierProxy(w, req)
	checker(w)
}

func TestReverseProxy_unhealthy(t *testing.T) {
	tenantName := "test"

	// set a url for the querier and distributor so that it always fail to
	// simulate an error reaching the backend
	u, err := url.Parse("http://localhost:0")
	if err != nil {
		t.Errorf("got %w", err)
	}

	// we can reuse the same backend to send both the querier and distributor
	// requests
	disableAPIAuth := true
	rp := NewReverseProxy(tenantName, u, u, disableAPIAuth)
	// create a request to the test backend
	req := httptest.NewRequest("GET", "http://localhost", nil)

	checker := func(w *httptest.ResponseRecorder) {
		resp := w.Result()

		if resp.StatusCode != http.StatusBadGateway {
			t.Errorf("want 502 Bad Gateway got %v", resp.StatusCode)
		}

		// Confirm that the original error message (for why the request could
		// not be proxied) is contained in the response body.
		assert.Regexp(
			t,
			regexp.MustCompile("^dial tcp .* connect: connection refused$"),
			getStrippedBody(resp),
		)
	}

	w := httptest.NewRecorder()
	rp.HandleWithDistributorProxy(w, req)
	checker(w)

	w = httptest.NewRecorder()
	rp.HandleWithQuerierProxy(w, req)
	checker(w)
}

func TestReverseProxyAuthenticator_noheader(t *testing.T) {
	disableAPIAuth := false

	fakeURL, _ := url.Parse("http://localhost")

	// No need for a proxy backend here because the request is expected to be
	// processed in the proxy only, not going beyond the authenticator stage.
	rp := NewReverseProxy("test", fakeURL, fakeURL, disableAPIAuth)

	req := httptest.NewRequest("GET", "http://localhost", nil)

	checker := func(w *httptest.ResponseRecorder) {
		resp := w.Result()
		// Expect 401 response because no authentication proof is set.
		assert.Equal(t, 401, resp.StatusCode)

		// Confirm that a helpful error message is in the body.
		assert.Equal(
			t,
			"Authorization header missing",
			getStrippedBody(resp),
		)
	}

	w := httptest.NewRecorder()
	rp.HandleWithDistributorProxy(w, req)
	checker(w)

	w = httptest.NewRecorder()
	rp.HandleWithQuerierProxy(w, req)
	checker(w)
}

func TestReverseProxyAuthenticator_badtoken(t *testing.T) {
	disableAPIAuth := false

	fakeURL, _ := url.Parse("http://localhost")

	// No need for a proxy backend here because the request is expected to be
	// processed in the proxy only, not going beyond the authenticator stage.
	rp := NewReverseProxy("test", fakeURL, fakeURL, disableAPIAuth)

	req := httptest.NewRequest("GET", "http://localhost", nil)
	req.Header.Set("Authorization", "Bearer foobarbadtoken")

	checker := func(w *httptest.ResponseRecorder) {
		resp := w.Result()
		// Expect 401 response because no authentication proof is set.
		assert.Equal(t, 401, resp.StatusCode)

		// Confirm that a helpful error message is in the body.
		assert.Equal(
			t,
			"bad authentication token",
			getStrippedBody(resp),
		)
	}

	w := httptest.NewRecorder()
	rp.HandleWithDistributorProxy(w, req)
	checker(w)

	w = httptest.NewRecorder()
	rp.HandleWithQuerierProxy(w, req)
	checker(w)
}

// Read all response body bytes, and return response body as string, with
// leading and trailing whitespace stripped.
func getStrippedBody(resp *http.Response) string {
	rbody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		panic(fmt.Errorf("readAll error: %v", err))
	}
	return strings.TrimSpace(string(rbody))
}
