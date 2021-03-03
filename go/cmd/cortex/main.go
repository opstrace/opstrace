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
	"flag"
	"net/http"
	"net/url"

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

	if !disableAPIAuthentication {
		authenticator.LegacyReadAuthTokenVerificationKeyFromEnv()
		authenticator.ReadKeySetJSONFromEnvOrCrash()
	}

	log.Infof("cortex querier URL: %s", cortexqurl)
	log.Infof("cortex distributor URL: %s", cortexdurl)
	log.Infof("listen address: %s", listenAddress)
	log.Infof("tenant name: %s", tenantName)
	log.Infof("API authentication enabled: %v", !disableAPIAuthentication)

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
	// router.PathPrefix("/api/prom/push").HandlerFunc(reverseProxy.HandleWithDistributorProxy)

	// Require non-deprecated push path (instead of also allowing /api/prom/push)
	router.PathPrefix("/api/v1/push").HandlerFunc(distributorProxy.HandleWithProxy)

	// /api/v1/read, /api/v1/query, /api/v1/labels etc: direct everything that's not
	// /api/v1/push to the querier for now.
	router.PathPrefix("/api/v1").HandlerFunc(querierProxy.HandleWithProxy)

	router.Handle("/metrics", promhttp.Handler())
	router.Use(middleware.PrometheusMetrics("cortex_api_proxy"))
	log.Fatalf("terminated: %s", http.ListenAndServe(listenAddress, router))
}
