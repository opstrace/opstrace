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
	loglevel           string
	listenAddress      string
	PromRemoteWriteUrl string
)

func main() {

	flag.StringVar(&listenAddress, "listen", "127.0.0.1:8082", "the listen address")
	flag.StringVar(&PromRemoteWriteUrl,
		"prom-remote-write-url",
		"http://127.0.0.1:33333/api/v1/push",
		"A Prometheus remote_write endpoint (served by e.g. Cortex)")
	flag.StringVar(&loglevel, "loglevel", "info", "error|info|debug")

	//flag.StringVar(&tenantName, "tenantname", "", "")
	//flag.BoolVar(&disableAPIAuthentication, "disable-api-authn", false, "")

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

	_, uerr := url.Parse(PromRemoteWriteUrl)
	if uerr != nil {
		log.Fatalf("bad remote_write URL: %s", uerr)
	}

	log.Infof("Prometheus remote_write endpoint: %s", PromRemoteWriteUrl)

	router := mux.NewRouter()

	// DD API for "submitting metrics", which are actually time series
	// fragments. Served by DD at /api/v1/series. See
	// https://docs.datadoghq.com/api/v1/metrics/#submit-metrics
	router.PathPrefix("/api/v1/series").HandlerFunc(SeriesPostHandler).Methods(http.MethodPost)
	router.Handle("/metrics", promhttp.Handler())

	log.Infof("starting HTTP server on %s", listenAddress)
	log.Fatal(http.ListenAndServe(listenAddress, router))
}
