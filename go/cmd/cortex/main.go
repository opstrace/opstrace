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

package main

import (
	"bytes"
	"flag"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	log "github.com/sirupsen/logrus"

	"github.com/opstrace/opstrace/go/pkg/authenticator"
	"github.com/opstrace/opstrace/go/pkg/middleware"
)

var (
	loglevel                 string
	listenAddress            string
	cortexQuerierURL         string
	cortexDistributorURL     string
	tenantName               string
	disableAPIAuthentication bool
	allowPushRetries         bool
)

// The error code to use when replacing 429 errors with a consistently retryable error code.
// Prometheus clients do not consistently honor retries with 429, but they do with 500 errors.
// Therefore we remap 429 to 503.
const retryableStatusCode = 503

// The error code to use when replacing 5xx errors with non-retryable errors.
// Any 400 code (other than 429 Too Many Requests) should theoretically work.
// For now we use 409 Conflict, which is sufficiently ambiguous in meaning, while also not having
// any additional baggage in terms of client handling.
const nonRetryableStatusCode = 409

// Remap default-not-retryable HTTP 429 errors to always-retryable 503 errors.
// In this situation the server is acting healthy and is telling clients to back off/retry.
// Unlike in the 5xx remap case this shouldn't present issues around server load.
// Context: https://github.com/opstrace/opstrace/issues/464
//
// Remap "retryable" HTTP 500-599 errors to a different non-retryable error code.
// This avoids indefinite retries by clients which can make server problems worse.
// For example by default Prometheus retries 500 sample payloads every 50-100ms over 5s.
// Context: https://github.com/opstrace/opstrace/issues/1409
//
// The proxy may return its own 502 errors if the distributor isn't reachable.
// These are let through as-is with the assumption that the failure is temporary due to e.g.
// a new version rollout and so will go away when the distributors are back.
func replacePushErrors(resp *http.Response) error {
	// start with quick int comparison to weed out (hopefully) common success cases
	if resp.StatusCode != 429 && (resp.StatusCode < 500 || resp.StatusCode > 599) {
		// not a remappable error, ignore
		return nil
	}
	if !strings.Contains(resp.Request.URL.Path, "/api/v1/push") {
		// not a push request, ignore
		return nil
	}

	var origCode = resp.StatusCode
	if resp.StatusCode == 429 {
		// Server is healthy and telling a client to retry later.
		// Use 503 error to ensure the retry happens. See context above.
		resp.StatusCode = retryableStatusCode
	} else {
		// Server is not healthy with a 5xx error.
		// Use 409 error to ensure the client doesn't retry. See other context above.
		resp.StatusCode = nonRetryableStatusCode
	}

	// Try to update body to reflect the mapping.
	origBodyBytes, readErr := ioutil.ReadAll(resp.Body)
	if readErr != nil {
		// Treat body update as best-effort - proceed without update
		log.Warnf("CortexPushRewrite: could not read %d resp body: %s", origCode, readErr)
	} else {
		bodybytes := []byte(fmt.Sprintf("%d-to-%d: %s", origCode, resp.StatusCode, string(origBodyBytes)))
		resp.Body = ioutil.NopCloser(bytes.NewReader(bodybytes))
		resp.ContentLength = int64(len(bodybytes))
		resp.Header.Set("Content-Length", strconv.Itoa(len(bodybytes)))
	}
	return nil
}

func main() {
	flag.StringVar(&listenAddress, "listen", "", "Endpoint for listening to incoming requests from the Internet")
	flag.StringVar(&cortexQuerierURL, "cortex-querier-url", "", "Endpoint for reaching the cortex querier for reads")
	flag.StringVar(
		&cortexDistributorURL,
		"cortex-distributor-url",
		"",
		"Endpoint for reaching the cortex distributor for writes",
	)
	flag.StringVar(&tenantName, "tenantname", "", "Name of the tenant that the API is serving")
	flag.StringVar(&loglevel, "loglevel", "info", "error|info|debug")
	flag.BoolVar(
		&disableAPIAuthentication,
		"disable-api-authn",
		false,
		"Whether to skip validation of Authentication headers in requests, for testing only",
	)
	// By default we remap 500 and 429 errors to a 409 Conflict error, treated by clients as non-retryable.
	// This avoids problems with brief outages causing stock Prometheus clients to overload the server without progress.
	// See also: https://github.com/opstrace/opstrace/issues/1409
	flag.BoolVar(
		&allowPushRetries,
		"allow-push-retries",
		false,
		"Whether to allow write clients to receive retryable 429/500 errors on push requests",
	)

	flag.Parse()

	level, lerr := log.ParseLevel(loglevel)
	if lerr != nil {
		log.Fatalf("bad log level: %s", lerr)
	}
	log.SetLevel(level)

	cortexqurl, uerr := url.Parse(cortexQuerierURL)
	if uerr != nil {
		log.Fatalf("bad cortex querier URL: %s", uerr)
	}

	cortexdurl, uerr := url.Parse(cortexDistributorURL)
	if uerr != nil {
		log.Fatalf("bad cortex distributor URL: %s", uerr)
	}

	log.Infof("cortex querier URL: %s", cortexqurl)
	log.Infof("cortex distributor URL: %s", cortexdurl)
	log.Infof("listen address: %s", listenAddress)
	log.Infof("tenant name: %s", tenantName)
	log.Infof("API authentication enabled: %v", !disableAPIAuthentication)
	log.Infof("Remapping retryable distributor errors: %v", !allowPushRetries)

	if !disableAPIAuthentication {
		authenticator.ReadConfigFromEnvOrCrash()
	}

	// See: https://github.com/cortexproject/cortex/blob/master/docs/api/_index.md
	cortexTenantHeader := "X-Scope-OrgID"
	querierProxy := middleware.NewReverseProxyFixedTenant(
		tenantName,
		cortexTenantHeader,
		cortexqurl,
		disableAPIAuthentication,
	)
	distributorProxy := middleware.NewReverseProxyFixedTenant(
		tenantName,
		cortexTenantHeader,
		cortexdurl,
		disableAPIAuthentication,
	)
	if !allowPushRetries {
		distributorProxy.ReplaceResponses(replacePushErrors)
	}
	// mux matches based on registration order, not prefix length.
	router := mux.NewRouter()

	// Require non-deprecated push path (instead of also allowing /api/prom/push)
	router.PathPrefix("/api/v1/push").HandlerFunc(distributorProxy.HandleWithProxy)

	// /api/v1/read, /api/v1/query, /api/v1/labels etc: direct everything that's not
	// /api/v1/push to the querier for now.
	router.PathPrefix("/api/v1").HandlerFunc(querierProxy.HandleWithProxy)

	// All Cortex components expose various endpoints with configuration /
	// debug details. https://cortexmetrics.io/docs/api/#all-services Expose
	// some of them here. Maybe remove / restrict some of these later for
	// security / isolation reasons. Note that /runtime_config and /config and
	// /services are expected to look the same regardless of which Cortex
	// component serves them (use the distributor, here).
	router.PathPrefix("/runtime_config").HandlerFunc(distributorProxy.HandleWithProxy)
	router.PathPrefix("/config").HandlerFunc(distributorProxy.HandleWithProxy)
	router.PathPrefix("/services").HandlerFunc(distributorProxy.HandleWithProxy)
	// This is distributor-specific (must be served by the Cortex distributor).
	// "Displays a web page with the distributor hash ring status, including
	// the state, healthy and last heartbeat time of each distributor.""
	router.PathPrefix("/distributor/ring").HandlerFunc(distributorProxy.HandleWithProxy)

	// Expose a special endpoint /metrics exposing metrics for _this API
	// proxy_.
	router.Handle("/metrics", promhttp.Handler())
	router.Use(middleware.PrometheusMetrics("cortex_api_proxy"))

	log.Fatalf("terminated: %s", http.ListenAndServe(listenAddress, router))
}
