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

/*
Create an HTTP server to be used as upstream (backend) for the proxies to be
tested.

This server responds to requests to the path /.

It always returns a 429 response.
*/

package main

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"

	"github.com/gorilla/mux"
	"github.com/opstrace/opstrace/go/pkg/middleware"
	"gotest.tools/v3/assert"
)

func createUpstreamResponder(code int, body string) (*url.URL, func()) {
	router := mux.NewRouter()
	router.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(code)
		w.Write([]byte(body))
	})

	backend := httptest.NewServer(router)
	upstreamURL, err := url.Parse(backend.URL)

	if err != nil {
		panic(err)
	}

	return upstreamURL, backend.Close
}

func TestReverseProxy_CortexPushRewrite429(t *testing.T) {
	upstreamURL, upstreamClose := createUpstreamResponder(http.StatusTooManyRequests, "original 429 error response")
	defer upstreamClose()

	disableAPIAuth := true
	rp := middleware.NewReverseProxyFixedTenant(tenantName, "test", upstreamURL, disableAPIAuth)
	rp.ReplaceResponses(replacePushErrors)

	// Create a request to the proxy (not to the backend/upstream). Use the
	// decisive `/api/v1/push` ingredient to test the response modification.
	req := httptest.NewRequest("GET", "http://localhost/api/v1/push", nil)
	w := httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp := w.Result()
	assert.Equal(t, 503, resp.StatusCode)
	assert.Equal(t, "429-to-503: original 429 error response", middleware.GetStrippedBody(resp))

	// Test without `/api/v1/push`, confirm that response is left intact.
	req = httptest.NewRequest("GET", "http://localhost/", nil)
	w = httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp = w.Result()
	assert.Equal(t, http.StatusTooManyRequests, resp.StatusCode)
}

func TestReverseProxy_CortexPushRewrite500(t *testing.T) {
	upstreamURL, upstreamClose := createUpstreamResponder(http.StatusInternalServerError, "original 500 error response")
	defer upstreamClose()

	disableAPIAuth := true
	rp := middleware.NewReverseProxyFixedTenant(tenantName, "test", upstreamURL, disableAPIAuth)
	rp.ReplaceResponses(replacePushErrors)

	// Create a request to the proxy (not to the backend/upstream). Use the
	// decisive `/api/v1/push` ingredient to test the response modification.
	req := httptest.NewRequest("GET", "http://localhost/api/v1/push", nil)
	w := httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp := w.Result()
	assert.Equal(t, 409, resp.StatusCode)
	assert.Equal(t, "500-to-409: original 500 error response", middleware.GetStrippedBody(resp))

	// Test without `/api/v1/push`, confirm that response is left intact.
	req = httptest.NewRequest("GET", "http://localhost/", nil)
	w = httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp = w.Result()
	assert.Equal(t, http.StatusInternalServerError, resp.StatusCode)
}

func TestReverseProxy_CortexPushNotRewrite202(t *testing.T) {
	upstreamURL, upstreamClose := createUpstreamResponder(http.StatusAccepted, "original 202 success response")
	defer upstreamClose()

	disableAPIAuth := true
	rp := middleware.NewReverseProxyFixedTenant(tenantName, "test", upstreamURL, disableAPIAuth)
	rp.ReplaceResponses(replacePushErrors)

	// Create a request to the proxy (not to the backend/upstream). Use the
	// decisive `/api/v1/push` ingredient to test the response modification.
	req := httptest.NewRequest("GET", "http://localhost/api/v1/push", nil)
	w := httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp := w.Result()
	assert.Equal(t, http.StatusAccepted, resp.StatusCode)
	assert.Equal(t, "original 202 success response", middleware.GetStrippedBody(resp))
}

func TestReverseProxy_CortexPushNotRewrite499(t *testing.T) {
	upstreamURL, upstreamClose := createUpstreamResponder(499, "original 499 error response")
	defer upstreamClose()

	disableAPIAuth := true
	rp := middleware.NewReverseProxyFixedTenant(tenantName, "test", upstreamURL, disableAPIAuth)
	rp.ReplaceResponses(replacePushErrors)

	// Create a request to the proxy (not to the backend/upstream). Use the
	// decisive `/api/v1/push` ingredient to test the response modification.
	req := httptest.NewRequest("GET", "http://localhost/api/v1/push", nil)
	w := httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp := w.Result()
	assert.Equal(t, 499, resp.StatusCode)
	assert.Equal(t, "original 499 error response", middleware.GetStrippedBody(resp))
}
