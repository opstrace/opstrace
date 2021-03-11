// Copyright 2020 Opstrace, Inc.
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
	"net/http"
	"net/http/httptest"
	"net/url"
	"regexp"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	"github.com/stretchr/testify/assert"
)

const tenantName string = "test"
const tenantHeaderName string = "X-Scope-Orgid"

/*
Create an HTTP server to be used as upstream (backend) for the proxies to be
tested.

This server responds to requests to the path /.

It checks the value of the `X-Scope-Orgid` (well, `tenantHeaderName`)` header
and writes the tenant name to the response.
*/
func createUpstreamTenantEcho(tenantName string, t *testing.T) (*url.URL, func()) {
	router := mux.NewRouter()
	router.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, tenantName, r.Header.Get(tenantHeaderName))
		fmt.Fprintf(w, "%s %s", r.URL.String(), tenantName)
	})

	backend := httptest.NewServer(router)

	upstreamURL, err := url.Parse(backend.URL)

	if err != nil {
		panic(err)
	}

	return upstreamURL, backend.Close
}

func TestReverseProxy_healthy(t *testing.T) {
	upstreamURL, upstreamClose := createUpstreamTenantEcho(tenantName, t)
	defer upstreamClose()

	// Reuse the same backend for both the querier and distributor requests.
	disableAPIAuth := true
	rp := NewReverseProxyFixedTenant(tenantName, tenantHeaderName, upstreamURL, disableAPIAuth)

	// Create a request to the proxy (not to the backend/upstream). The URL
	// does not really matter because we're bypassing the actual router.
	req := httptest.NewRequest("GET", "http://localhost", nil)
	w := httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp := w.Result()
	assert.Equal(t, 200, resp.StatusCode)
	// Check that the proxy's upstream has indeed written the response.
	assert.Equal(t, "/ test", GetStrippedBody(resp))

	req = httptest.NewRequest("GET", "http://localhost/robots.txt", nil)
	w = httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp = w.Result()
	assert.Equal(t, 200, resp.StatusCode)
	// Check that the proxy's upstream has indeed written the response.
	assert.Equal(t, "/robots.txt test", GetStrippedBody(resp))
}

func TestReverseProxy_pathreplace(t *testing.T) {
	upstreamURL, upstreamClose := createUpstreamTenantEcho(tenantName, t)
	defer upstreamClose()

	// Reuse the same backend for both the querier and distributor requests.
	pathReplacement := func(requrl *url.URL) string {
		if strings.HasPrefix(requrl.Path, "/replaceme") {
			return strings.Replace(requrl.Path, "/replaceme", "/foo", 1)
		}
		return requrl.Path
	}
	disableAPIAuth := true
	rp := NewReverseProxyFixedTenant(
		tenantName,
		tenantHeaderName,
		upstreamURL,
		disableAPIAuth,
	).ReplacePaths(pathReplacement)

	// /replaceme => /foo
	req := httptest.NewRequest("GET", "http://localhost/replaceme", nil)
	w := httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp := w.Result()
	assert.Equal(t, 200, resp.StatusCode)
	// Check that the proxy's upstream has indeed written the response.
	assert.Equal(t, "/foo test", GetStrippedBody(resp))

	// /replaceme/bar => /foo/bar
	req = httptest.NewRequest("GET", "http://localhost/replaceme/bar", nil)
	w = httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp = w.Result()
	assert.Equal(t, 200, resp.StatusCode)
	// Check that the proxy's upstream has indeed written the response.
	assert.Equal(t, "/foo/bar test", GetStrippedBody(resp))

	// /other/bar => /other/bar (no change)
	req = httptest.NewRequest("GET", "http://localhost/other/bar", nil)
	w = httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp = w.Result()
	assert.Equal(t, 200, resp.StatusCode)
	// Check that the proxy's upstream has indeed written the response.
	assert.Equal(t, "/other/bar test", GetStrippedBody(resp))
}

func TestReverseProxy_unhealthy(t *testing.T) {
	// set a url for the querier and distributor so that it always fail to
	// simulate an error reaching the backend
	u, err := url.Parse("http://localhost:0")
	if err != nil {
		t.Errorf("got %w", err)
	}

	// we can reuse the same backend to send both the querier and distributor
	// requests
	disableAPIAuth := true
	rp := NewReverseProxyFixedTenant(tenantName, tenantHeaderName, u, disableAPIAuth)
	// create a request to the test backend
	req := httptest.NewRequest("GET", "http://localhost", nil)

	w := httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp := w.Result()
	assert.Equal(t, http.StatusBadGateway, resp.StatusCode)

	// Confirm that the original error message (for why the request could
	// not be proxied) is contained in the response body.
	assert.Regexp(
		t,
		regexp.MustCompile("^dial tcp .* connect: connection refused$"),
		GetStrippedBody(resp),
	)
}

func TestReverseProxyAuthenticator_noheader(t *testing.T) {
	disableAPIAuth := false

	fakeURL, _ := url.Parse("http://localhost")

	// No need for a proxy backend here because the request is expected to be
	// processed in the proxy only, not going beyond the authenticator stage.
	rp := NewReverseProxyFixedTenant(tenantName, tenantHeaderName, fakeURL, disableAPIAuth)

	req := httptest.NewRequest("GET", "http://localhost", nil)

	w := httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp := w.Result()
	// Expect 401 response because no authentication proof is set.
	assert.Equal(t, 401, resp.StatusCode)

	// Confirm that a helpful error message is in the body.
	assert.Equal(
		t,
		"Authorization header missing",
		GetStrippedBody(resp),
	)
}

func TestReverseProxyAuthenticator_badtoken(t *testing.T) {
	disableAPIAuth := false

	fakeURL, _ := url.Parse("http://localhost")

	// No need for a proxy backend here because the request is expected to be
	// processed in the proxy only, not going beyond the authenticator stage.
	rp := NewReverseProxyFixedTenant(tenantName, tenantHeaderName, fakeURL, disableAPIAuth)

	req := httptest.NewRequest("GET", "http://localhost", nil)
	req.Header.Set("Authorization", "Bearer foobarbadtoken")

	w := httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp := w.Result()
	// Expect 401 response because no authentication proof is set.
	assert.Equal(t, 401, resp.StatusCode)

	// Confirm that a helpful error message is in the body.
	assert.Equal(t, "bad authentication token", GetStrippedBody(resp))
}
