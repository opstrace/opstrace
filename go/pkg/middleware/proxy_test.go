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
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"net/url"
	"regexp"
	"strings"
	"testing"

	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
)

func TestReverseProxy_healthy(t *testing.T) {
	tenantName := "test"

	// Create an actual HTTP server to be used as upstream (backend) for the
	// proxy. Any request to / checks the X-Scope-Orgid header and writes
	// the tenant name to the response.
	router := mux.NewRouter()
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, tenantName, r.Header.Get("X-Scope-Orgid"))
		fmt.Fprintln(w, tenantName)
	})
	backend := httptest.NewServer(router)
	defer backend.Close()
	upstreamURL, err := url.Parse(backend.URL)
	if err != nil {
		t.Errorf("got %w", err)
	}

	// Reuse the same backend for both the querier and distributor requests.
	disableAPIAuth := true
	rp := NewReverseProxy(tenantName, upstreamURL, upstreamURL, disableAPIAuth)

	// Create a request to the proxy (not to the backend/upstream). The URL
	// does not really matter because we're bypassing the actual router.
	req := httptest.NewRequest("GET", "http://localhost", nil)

	checker := func(w *httptest.ResponseRecorder) {
		resp := w.Result()

		if resp.StatusCode != http.StatusOK {
			t.Errorf("want 200 Status OK got %v", resp.StatusCode)
		}

		b, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			t.Errorf("got %v", err)
		}

		got := strings.TrimSpace(string(b))
		if got != tenantName {
			t.Errorf("want %v test got %v", tenantName, got)
		}
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

		rbody, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			t.Errorf("got %v", err)
		}

		// Confirm that the original error message (for why the request could
		// not be proxied) is contained in the response body.
		assert.Regexp(
			t,
			regexp.MustCompile("^dial tcp .* connect: connection refused$"),
			strings.TrimSpace(string(rbody)),
		)
	}

	w := httptest.NewRecorder()
	rp.HandleWithDistributorProxy(w, req)
	checker(w)

	w = httptest.NewRecorder()
	rp.HandleWithQuerierProxy(w, req)
	checker(w)
}
	}

	w := httptest.NewRecorder()
	rp.HandleWithDistributorProxy(w, req)
	checker(w)

	w = httptest.NewRecorder()
	rp.HandleWithQuerierProxy(w, req)
	checker(w)
}
