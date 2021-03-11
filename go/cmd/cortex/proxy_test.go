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
	"gotest.tools/assert"
)

func createUpstream429Responder() (*url.URL, func()) {
	router := mux.NewRouter()
	router.PathPrefix("/").HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		w.Write([]byte("429 error response"))
	})

	backend := httptest.NewServer(router)
	upstreamURL, err := url.Parse(backend.URL)

	if err != nil {
		panic(err)
	}

	return upstreamURL, backend.Close
}

func TestReverseProxy_CortexPushRewrite429(t *testing.T) {
	upstreamURL, upstreamClose := createUpstream429Responder()
	defer upstreamClose()

	disableAPIAuth := true
	rp := middleware.NewReverseProxyFixedTenant(tenantName, "test", upstreamURL, disableAPIAuth)

	rp.Revproxy.ModifyResponse = CortexPushRewrite429

	// Create a request to the proxy (not to the backend/upstream). Use the
	// decisive `/api/v1/push` ingredient to test the response modification.
	req := httptest.NewRequest("GET", "http://localhost/api/v1/push", nil)
	w := httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp := w.Result()
	assert.Equal(t, 503, resp.StatusCode)
	assert.Equal(t, "429-to-503", middleware.GetStrippedBody(resp))

	// Test without `/api/v1/push`, confirm that response is left intact.
	req = httptest.NewRequest("GET", "http://localhost/", nil)
	w = httptest.NewRecorder()
	rp.HandleWithProxy(w, req)
	resp = w.Result()
	assert.Equal(t, 429, resp.StatusCode)
}
