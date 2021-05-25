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
	"os"
	"strings"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	log "github.com/sirupsen/logrus"

	"github.com/opstrace/opstrace/go/pkg/authenticator"
	"github.com/opstrace/opstrace/go/pkg/middleware"
)

const actionSecretHeaderName string = "X-Action-Secret"
const cortexTenantHeaderName string = "X-Scope-OrgID"

func main() {
	var loglevel string
	flag.StringVar(&loglevel, "loglevel", "info", "error|info|debug")
	var configAddress string
	flag.StringVar(&configAddress, "config", "", "")
	var actionAddress string
	flag.StringVar(&actionAddress, "action", "", "")

	var disableAPIAuthentication bool
	flag.BoolVar(&disableAPIAuthentication, "disable-api-authn", false, "")

	flag.Parse()

	level, lerr := log.ParseLevel(loglevel)
	if lerr != nil {
		log.Fatalf("bad --loglevel: %s", lerr)
	}
	log.SetLevel(level)

	if configAddress == "" {
		log.Fatalf("missing required --config")
	}
	log.Infof("config listen address: %s", configAddress)
	log.Infof("action listen address: %s", actionAddress)

	cortexDefault := "http://localhost"
	rulerURL := envEndpointURL("CORTEX_RULER_ENDPOINT", &cortexDefault)
	log.Infof("cortex ruler URL: %v", rulerURL)
	alertmanagerURL := envEndpointURL("CORTEX_ALERTMANAGER_ENDPOINT", &cortexDefault)
	log.Infof("cortex alertmanager URL: %v", alertmanagerURL)

	if disableAPIAuthentication {
		log.Infof("authentication disabled, use '%s' header in requests to specify tenant", authenticator.TestTenantHeader)
	} else {
		log.Info("authentication enabled")
		authenticator.ReadConfigFromEnvOrCrash()
	}

	if actionAddress != "" {
		actionSecret := os.Getenv("HASURA_ACTION_SECRET")
		if actionSecret == "" {
			log.Fatalf("missing HASURA_ACTION_SECRET, required when -action is specified")
		}

		// Create separate access objects to avoid potential threading issues with config handler below
		handler := NewHasuraHandler(alertmanagerURL, actionSecret)
		// Not blocking on this one, but it will panic internally if there's a problem
		go runActionHandler(handler, actionAddress)
	}

	configHandler := buildConfigHandler(rulerURL, alertmanagerURL, disableAPIAuthentication)
	// Block on this one
	log.Fatalf("terminated config listener: %v", http.ListenAndServe(configAddress, configHandler))
}

func runActionHandler(handler *HasuraHandler, actionAddress string) {
	router := mux.NewRouter()
	// Run metrics listener on this internal-only addresss instead of the main/ingress address.
	router.Handle("/metrics", promhttp.Handler())
	router.HandleFunc("/", handler.handler)

	log.Fatalf("terminated action listener: %v", http.ListenAndServe(actionAddress, router))
}

func buildConfigHandler(
	rulerURL *url.URL,
	alertmanagerURL *url.URL,
	disableAPIAuthentication bool,
) *mux.Router {
	router := mux.NewRouter()

	// Cortex config, see: https://github.com/cortexproject/cortex/blob/master/docs/api/_index.md

	// Cortex Ruler config
	rulerPathReplacement := func(requrl *url.URL) string {
		// Route /api/v1/ruler* requests to /ruler* on the backend
		// Note: /api/v1/rules does not need to change on the way to the backend.
		if replaced := replacePathPrefix(requrl, "/api/v1/ruler", "/ruler"); replaced != nil {
			return *replaced
		}
		return requrl.Path
	}
	rulerProxy := middleware.NewReverseProxyDynamicTenant(
		cortexTenantHeaderName,
		rulerURL,
		disableAPIAuthentication,
	).ReplacePaths(rulerPathReplacement)
	router.PathPrefix("/api/v1/ruler").HandlerFunc(rulerProxy.HandleWithProxy)
	router.PathPrefix("/api/v1/rules").HandlerFunc(rulerProxy.HandleWithProxy)

	// Cortex Alertmanager config
	alertmanagerPathReplacement := func(requrl *url.URL) string {
		// Route /api/v1/multitenant_alertmanager* requests to /multitenant_alertmanager* on the backend.
		// Unlike with /alertmanager, this is more of an internal status page.
		// But we could switch it to an Ingress later if we wanted.
		if replaced := replacePathPrefix(
			requrl,
			"/api/v1/multitenant_alertmanager",
			"/multitenant_alertmanager",
		); replaced != nil {
			return *replaced
		}
		return requrl.Path
	}
	alertmanagerProxy := middleware.NewReverseProxyDynamicTenant(
		cortexTenantHeaderName,
		alertmanagerURL,
		disableAPIAuthentication,
	).ReplacePaths(alertmanagerPathReplacement)
	// We don't route /alertmanager for the Alertmanager UI since it isn't useful via curl.
	// The Alertmanager UI can be viewed at '<tenant>.<cluster>.opstrace.io/alertmanager/'
	router.PathPrefix("/api/v1/alerts").HandlerFunc(alertmanagerProxy.HandleWithProxy)
	router.PathPrefix("/api/v1/multitenant_alertmanager").HandlerFunc(alertmanagerProxy.HandleWithProxy)
	return router
}

func replacePathPrefix(url *url.URL, from string, to string) *string {
	if strings.HasPrefix(url.Path, from) {
		replaced := strings.Replace(url.Path, from, to, 1)
		return &replaced
	}
	return nil
}

func envEndpointURL(envName string, defaultEndpoint *string) *url.URL {
	endpoint := os.Getenv(envName)
	if endpoint == "" {
		if defaultEndpoint == nil {
			log.Fatalf("missing required %s", envName)
		} else {
			// Try default (dev/testing)
			endpoint = *defaultEndpoint
			log.Warnf("missing %s, trying %s", envName, endpoint)
		}
	}

	endpointURL, uerr := url.Parse(endpoint)
	if uerr != nil {
		log.Fatalf("bad %s: %s", envName, uerr)
	}
	return endpointURL
}
