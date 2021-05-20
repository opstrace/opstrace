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
)

func main() {
	flag.StringVar(&listenAddress, "listen", "", "")
	flag.StringVar(&cortexQuerierURL, "cortex-querier-url", "", "")
	flag.StringVar(&cortexDistributorURL, "cortex-distributor-url", "", "")
	flag.StringVar(&tenantName, "tenantname", "", "")
	flag.StringVar(&loglevel, "loglevel", "info", "error|info|debug")
	flag.BoolVar(&disableAPIAuthentication, "disable-api-authn", false, "")

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

	// Hook into reverse proxy for flexible treatment of responses to requests
	// to `/api/v1/push`.
	distributorProxy.Revproxy.ModifyResponse = CortexPushRewrite429

	log.Fatalf("terminated: %s", http.ListenAndServe(listenAddress, router))
}

/*
Context: https://github.com/opstrace/opstrace/issues/464
*/
func CortexPushRewrite429(resp *http.Response) (err error) {
	if strings.Contains(resp.Request.URL.Path, "/api/v1/push") {
		if resp.StatusCode == 429 {
			// Read original error message from (original) response body.
			origBodyBytes, err := ioutil.ReadAll(resp.Body)
			if err != nil {
				log.Warnf("CortexPushRewrite429: could not read resp body: %s", err)
			}

			// Now set new response status code, and tweak the error message.
			// Note(JP): does the old resp.Body need to be close()d?
			resp.StatusCode = 503
			errmsg := fmt.Sprintf("429-to-503: %s", string(origBodyBytes))
			bodybytes := []byte(errmsg)
			resp.Body = ioutil.NopCloser(bytes.NewReader(bodybytes))
			resp.ContentLength = int64(len(bodybytes))
			resp.Header.Set("Content-Length", strconv.Itoa(len(bodybytes)))
		}
	}

	return nil
}
