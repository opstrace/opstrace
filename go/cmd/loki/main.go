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

package main

import (
	"flag"
	"net/http"
	"net/url"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	log "github.com/sirupsen/logrus"

	"github.com/opstrace/opstrace/go/pkg/middleware"
)

var (
	loglevel                 string
	listenAddress            string
	lokiQuerierURL           string
	lokiDistributorURL       string
	tenantName               string
	disableAPIAuthentication bool
)

func main() {
	flag.StringVar(&listenAddress, "listen", "", "")
	flag.StringVar(&lokiQuerierURL, "loki-querier-url", "", "")
	flag.StringVar(&lokiDistributorURL, "loki-distributor-url", "", "")
	flag.StringVar(&tenantName, "tenantname", "", "")
	flag.StringVar(&loglevel, "loglevel", "info", "error|info|debug")
	flag.BoolVar(&disableAPIAuthentication, "disable-api-authn", false, "")

	flag.Parse()

	level, lerr := log.ParseLevel(loglevel)
	if lerr != nil {
		log.Fatalf("bad log level: %s", lerr)
	}
	log.SetLevel(level)

	lokiqurl, uerr := url.Parse(lokiQuerierURL)
	if uerr != nil {
		log.Fatalf("bad loki querier URL: %s", uerr)
	}

	lokidurl, uerr := url.Parse(lokiDistributorURL)
	if uerr != nil {
		log.Fatalf("bad loki distributor URL: %s", uerr)
	}

	if !disableAPIAuthentication {
		middleware.ReadAuthTokenVerificationKeyFromEnvOrCrash()
	}

	log.Infof("loki querier URL: %s", lokiqurl)
	log.Infof("loki distributor URL: %s", lokidurl)
	log.Infof("listen address: %s", listenAddress)
	log.Infof("tenant name: %s", tenantName)
	log.Infof("API authentication enabled: %v", !disableAPIAuthentication)

	reverseProxy := middleware.NewReverseProxy(tenantName, lokiqurl, lokidurl, disableAPIAuthentication)

	// mux matches based on registration order, not prefix length.
	router := mux.NewRouter()

	// The intended push path.
	router.PathPrefix("/loki/api/v1/push").HandlerFunc(reverseProxy.HandleWithDistributorProxy)

	// Maybe we should not expose this?
	// From loki API docs: WARNING: /api/prom/push is DEPRECATED; use /loki/api/v1/push instead.
	// router.PathPrefix("/api/prom/push").HandlerFunc(reverseProxy.HandleWithDistributorProxy)

	// The intended query / readout path(s)
	router.PathPrefix("/loki/api/v1/").HandlerFunc(reverseProxy.HandleWithQuerierProxy)

	// I think we can outcomment this one here, too. Want to encourage to use
	// /loki/api/v1/ for readout.
	// router.PathPrefix("/api/prom/").HandlerFunc(reverseProxy.HandleWithQuerierProxy)

	router.Handle("/metrics", promhttp.Handler())
	router.Use(middleware.PrometheusMetrics("loki_api_proxy"))

	log.Fatalf("terminated: %s", http.ListenAndServe(listenAddress, router))
}
