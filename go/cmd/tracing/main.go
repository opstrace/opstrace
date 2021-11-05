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
	"context"
	"flag"
	"net/http"
	"net/url"

	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/jaegerexporter"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/receiver/otlpreceiver"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
	"go.uber.org/zap"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	log "github.com/sirupsen/logrus"

	"github.com/opstrace/opstrace/go/pkg/authenticator"
	"github.com/opstrace/opstrace/go/pkg/middleware"
)

var (
	loglevel                 string
	listenAddress            string
	jaegerCollectorURL       string
	tenantName               string
	disableAPIAuthentication bool
)

func main() {
	flag.StringVar(&listenAddress, "listen", "", "Endpoint for listening to incoming OTLP traces from the Internet")
	flag.StringVar(
		&jaegerCollectorURL,
		"jaeger-collector-url", // TODO should be at port=14250, https://www.jaegertracing.io/docs/1.27/deployment/#collectors
		"",
		"Endpoint for reaching the Jaeger Collector for writes of Jaeger-gRPC traces",
	)
	flag.StringVar(&tenantName, "tenantname", "", "Name of the tenant that the API is serving")
	flag.StringVar(&loglevel, "loglevel", "info", "error|info|debug")
	flag.BoolVar(
		&disableAPIAuthentication,
		"disable-api-authn",
		false,
		"Whether to skip validation of Authentication headers in requests, for testing only",
	)

	flag.Parse()

	level, err := log.ParseLevel(loglevel)
	if err != nil {
		log.Fatalf("bad log level: %s", err)
	}
	log.SetLevel(level)

	// TODO jaegerurl, err := url.Parse(jaegerCollectorURL)
	_, err = url.Parse(jaegerCollectorURL)
	if err != nil {
		log.Fatalf("bad jaeger collector URL: %s", err)
	}

	log.Infof("jaeger collector URL: %s", jaegerCollectorURL)
	log.Infof("listen address: %s", listenAddress)
	log.Infof("tenant name: %s", tenantName)
	log.Infof("API authentication enabled: %v", !disableAPIAuthentication)

	if !disableAPIAuthentication {
		authenticator.ReadConfigFromEnvOrCrash()
	}

	telemetrySettings := component.TelemetrySettings{
		Logger:         zap.L(),
		TracerProvider: trace.NewNoopTracerProvider(),
		MeterProvider:  metric.NewNoopMeterProvider(),
	}

	buildInfo := component.BuildInfo{
		Command:     "opstrace-tracing-api",
		Description: "",
		Version:     "",
	}

	jaegerExp, err := jaegerexporter.NewFactory().CreateTracesExporter(
		context.Background(),
		component.ExporterCreateSettings{
			TelemetrySettings: telemetrySettings,
			BuildInfo:         buildInfo,
		},
		// TODO https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/jaegerexporter
		&jaegerexporter.Config{},
	)
	if err != nil {
		log.Fatalf("failed to build jaeger exporter: %s", err)
	}

	// TODO otlpRcv, err := otlpreceiver.NewFactory().CreateTracesReceiver(
	_, err = otlpreceiver.NewFactory().CreateTracesReceiver(
		context.Background(),
		component.ReceiverCreateSettings{
			TelemetrySettings: telemetrySettings,
			BuildInfo:         buildInfo,
		},
		// TODO https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/config.md
		&otlpreceiver.Config{},
		jaegerExp,
	)
	if err != nil {
		log.Fatalf("failed to build otlp receiver: %s", err)
	}

	// mux matches based on registration order, not prefix length.
	router := mux.NewRouter()

	// Expose a special endpoint /metrics exposing metrics for _this API
	// proxy_.
	router.Handle("/metrics", promhttp.Handler())
	router.Use(middleware.PrometheusMetrics("cortex_api_proxy"))

	log.Fatalf("terminated: %s", http.ListenAndServe(listenAddress, router))
}
