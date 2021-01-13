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

package main

import (
	"flag"
	"net/http"
	"net/url"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/sirupsen/logrus"
	log "github.com/sirupsen/logrus"

	"github.com/opstrace/opstrace/go/pkg/ddapi"
)

var (
	loglevel                 string
	listenAddress            string
	remoteWriteURL           string
	tenantName               string
	disableAPIAuthentication bool
)

func main() {

	flag.StringVar(&listenAddress, "listen", "127.0.0.1:8082", "the listen address")
	flag.StringVar(&remoteWriteURL,
		"prom-remote-write-url",
		"http://127.0.0.1:33333/api/v1/push",
		"A Prometheus remote_write endpoint (served by e.g. Cortex)")
	flag.StringVar(&loglevel, "loglevel", "info", "error|info|debug")

	//flag.StringVar(&tenantName, "tenantname", "", "")
	//flag.BoolVar(&disableAPIAuthentication, "disable-api-authn", false, "")

	tenantName = "test"
	disableAPIAuthentication = true

	flag.Parse()
	level, lerr := log.ParseLevel(loglevel)
	if lerr != nil {
		log.Fatalf("bad log level: %s", lerr)
	}
	log.SetLevel(level)

	// Show timestamps in TTY logger.
	customFormatter := new(logrus.TextFormatter)
	customFormatter.TimestampFormat = "2006-01-02 15:04:05.000"
	customFormatter.FullTimestamp = true
	logrus.SetFormatter(customFormatter)

	_, uerr := url.Parse(remoteWriteURL)
	if uerr != nil {
		log.Fatalf("bad remote_write URL: %s", uerr)
	}

	log.Infof("Prometheus remote_write endpoint: %s", remoteWriteURL)

	ddcp := ddapi.NewDDCortexProxy(tenantName, remoteWriteURL, disableAPIAuthentication)

	router := mux.NewRouter()

	// DD API for "submitting metrics", which are actually time series
	// fragments. Served by DD at /api/v1/series. See
	// https://docs.datadoghq.com/api/v1/metrics/#submit-metrics
	router.PathPrefix("/api/v1/series").HandlerFunc(ddcp.SeriesPostHandler).Methods(http.MethodPost)

	// Expose a Prometheus scrape endpoint.
	router.Handle("/metrics", promhttp.Handler())

	log.Infof("starting HTTP server on %s", listenAddress)
	log.Fatal(http.ListenAndServe(listenAddress, router))
}
