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
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"

	"github.com/opstrace/opstrace/go/pkg/authenticator"
	"github.com/opstrace/opstrace/go/pkg/config"
	"github.com/opstrace/opstrace/go/pkg/graphql"
	"github.com/opstrace/opstrace/go/pkg/middleware"
)

var (
	credentialAccess         config.CredentialAccess
	exporterAccess           config.ExporterAccess
	disableAPIAuthentication bool
)

func main() {
	var loglevel string
	flag.StringVar(&loglevel, "loglevel", "info", "error|info|debug")
	var listenAddress string
	flag.StringVar(&listenAddress, "listen", "", "")

	flag.BoolVar(&disableAPIAuthentication, "disable-api-authn", false, "")

	flag.Parse()

	level, lerr := log.ParseLevel(loglevel)
	if lerr != nil {
		log.Fatalf("bad --loglevel: %s", lerr)
	}
	log.SetLevel(level)

	if listenAddress == "" {
		log.Fatalf("missing required --listen")
	}
	log.Infof("listen address: %s", listenAddress)

	cortexDefault := "http://localhost"
	rulerURL := envEndpointURL("CORTEX_RULER_ENDPOINT", &cortexDefault)
	log.Infof("cortex ruler URL: %v", rulerURL)
	alertmanagerURL := envEndpointURL("CORTEX_ALERTMANAGER_ENDPOINT", &cortexDefault)
	log.Infof("cortex alertmanager URL: %v", alertmanagerURL)

	graphqlDefault := "http://localhost:8080/v1/graphql"
	graphqlURL := envEndpointURL("GRAPHQL_ENDPOINT", &graphqlDefault)
	log.Infof("graphql URL: %v", graphqlURL)

	graphqlSecret := os.Getenv("HASURA_GRAPHQL_ADMIN_SECRET")
	if graphqlSecret == "" {
		log.Fatalf("missing required HASURA_GRAPHQL_ADMIN_SECRET")
	}

	credentialAccess = config.NewCredentialAccess(graphqlURL, graphqlSecret)
	exporterAccess = config.NewExporterAccess(graphqlURL, graphqlSecret)

	if disableAPIAuthentication {
		log.Infof("authentication disabled, use '%s' header in requests to specify tenant", authenticator.TestTenantHeader)
	} else {
		// Requires API_AUTHTOKEN_VERIFICATION_PUBKEY
		log.Info("authentication enabled")
		authenticator.LegacyReadAuthTokenVerificationKeyFromEnv()
		authenticator.ReadKeySetJSONFromEnvOrCrash()
	}

	router := mux.NewRouter()
	router.Handle("/metrics", promhttp.Handler())

	// Cortex config, see: https://github.com/cortexproject/cortex/blob/master/docs/api/_index.md

	// Cortex Ruler config
	cortexTenantHeader := "X-Scope-OrgID"
	rulerPathReplacement := func(requrl *url.URL) string {
		// Route /api/v1/ruler* requests to /ruler* on the backend
		// Note: /api/v1/rules does not need to change on the way to the backend.
		if replaced := replacePathPrefix(requrl, "/api/v1/ruler", "/ruler"); replaced != nil {
			return *replaced
		}
		return requrl.Path
	}
	rulerProxy := middleware.NewReverseProxyDynamicTenant(
		cortexTenantHeader,
		rulerURL,
		disableAPIAuthentication,
	).ReplacePaths(rulerPathReplacement)
	router.PathPrefix("/api/v1/ruler").HandlerFunc(rulerProxy.HandleWithProxy)
	router.PathPrefix("/api/v1/rules").HandlerFunc(rulerProxy.HandleWithProxy)

	// Cortex Alertmanager config
	alertmanagerPathReplacement := func(requrl *url.URL) string {
		// NOTE: We leave /api/v1/alertmanager for the Alertmanager UI as-is.
		// By default Cortex would serve it at /alertmanager, but we configure it via 'api.alertmanager-http-prefix'.
		// This avoids us needing to rewrite HTTP responses to fix e.g. any absolute img/href URLs.
		// SEE ALSO: controller/src/resources/cortex/index.ts

		// Route /api/v1/multitenant_alertmanager* requests to /multitenant_alertmanager* on the backend.
		// Unlike with /alertmanager, this doesn't appear to involve a UI and just has status endpoints.
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
		cortexTenantHeader,
		alertmanagerURL,
		disableAPIAuthentication,
	).ReplacePaths(alertmanagerPathReplacement)
	router.PathPrefix("/api/v1/alerts").HandlerFunc(alertmanagerProxy.HandleWithProxy)
	router.PathPrefix("/api/v1/alertmanager").HandlerFunc(alertmanagerProxy.HandleWithProxy)
	router.PathPrefix("/api/v1/multitenant_alertmanager").HandlerFunc(alertmanagerProxy.HandleWithProxy)

	// Credentials/exporters: Specify exact paths, but manually allow with and without a trailing '/'
	credentials := router.PathPrefix("/api/v1/credentials").Subrouter()
	setupConfigAPI(credentials, listCredentials, writeCredentials, getCredential, deleteCredential)
	exporters := router.PathPrefix("/api/v1/exporters").Subrouter()
	setupConfigAPI(exporters, listExporters, writeExporters, getExporter, deleteExporter)

	log.Fatalf("terminated: %v", http.ListenAndServe(listenAddress, router))
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

// setupAPI configures GET/POST/DELETE endpoints for the provided handler callbacks.
// The paths are configured to be exact, with optional trailing slashes.
func setupConfigAPI(
	router *mux.Router,
	listFunc func(string, http.ResponseWriter, *http.Request),
	writeFunc func(string, http.ResponseWriter, *http.Request),
	getFunc func(string, http.ResponseWriter, *http.Request),
	deleteFunc func(string, http.ResponseWriter, *http.Request),
) {
	// Ensure that each call is authenticated before proceeding
	router.HandleFunc("", getTenantThenCall(listFunc)).Methods("GET")
	router.HandleFunc("/", getTenantThenCall(listFunc)).Methods("GET")
	router.HandleFunc("", getTenantThenCall(writeFunc)).Methods("POST")
	router.HandleFunc("/", getTenantThenCall(writeFunc)).Methods("POST")
	router.HandleFunc("/{name}", getTenantThenCall(getFunc)).Methods("GET")
	router.HandleFunc("/{name}/", getTenantThenCall(getFunc)).Methods("GET")
	router.HandleFunc("/{name}", getTenantThenCall(deleteFunc)).Methods("DELETE")
	router.HandleFunc("/{name}/", getTenantThenCall(deleteFunc)).Methods("DELETE")
}

// Wraps `f` in a preceding check that authenticates the request headers for the expected tenant name.
// The check is skipped if `disableAPIAuthentication` is true.
func getTenantThenCall(f func(string, http.ResponseWriter, *http.Request)) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		tenantName, ok := authenticator.GetTenant(w, r, nil, disableAPIAuthentication)
		if !ok {
			return
		}
		f(tenantName, w, r)
	}
}

// Information about a credential. Custom type which omits the tenant field.
// This also given some extra protection that the value isn't disclosed,
// even if it was mistakenly added to the underlying graphql interface.
type CredentialInfo struct {
	Name      string `yaml:"name"`
	Type      string `yaml:"type,omitempty"`
	CreatedAt string `yaml:"created_at,omitempty"`
	UpdatedAt string `yaml:"updated_at,omitempty"`
}

func listCredentials(tenant string, w http.ResponseWriter, r *http.Request) {
	resp, err := credentialAccess.List(tenant)
	if err != nil {
		log.Warnf("Listing credentials failed: %s", err)
		http.Error(w, fmt.Sprintf("Listing credentials failed: %s", err), http.StatusInternalServerError)
		return
	}

	log.Debugf("Listing %d credentials", len(resp.Credential))

	encoder := yaml.NewEncoder(w)
	for _, credential := range resp.Credential {
		encoder.Encode(CredentialInfo{
			Name:      credential.Name,
			Type:      credential.Type,
			CreatedAt: credential.CreatedAt,
			UpdatedAt: credential.UpdatedAt,
		})
	}
}

// Full credential entry (with secret value) received from a POST request.
type Credential struct {
	Name  string      `yaml:"name"`
	Type  string      `yaml:"type"`
	Value interface{} `yaml:"value"` // nested yaml, or payload string, depending on type
}

func writeCredentials(tenant string, w http.ResponseWriter, r *http.Request) {
	decoder := yaml.NewDecoder(r.Body)
	// Return error for unrecognized or duplicate fields in the input
	decoder.SetStrict(true)

	// Collect list of existing names so that we can decide between insert vs update
	existingTypes := make(map[string]string)
	resp, err := credentialAccess.List(tenant)
	if err != nil {
		log.Warnf("Listing credentials failed: %s", err)
		http.Error(w, fmt.Sprintf("Listing credentials failed: %s", err), http.StatusInternalServerError)
		return
	}
	for _, credential := range resp.Credential {
		existingTypes[credential.Name] = credential.Type
	}

	now := nowTimestamp()

	var inserts []graphql.CredentialInsertInput
	var updates []graphql.UpdateCredentialVariables
	for {
		var yamlCredential Credential
		err := decoder.Decode(&yamlCredential)
		if err != nil {
			if err != io.EOF {
				log.Debugf("Decoding credential input at index=%d failed: %s", len(inserts)+len(updates), err)
				http.Error(w, fmt.Sprintf(
					"Decoding credential input at index=%d failed: %s", len(inserts)+len(updates), err,
				), http.StatusBadRequest)
				return
			}
			break
		}
		name := graphql.String(yamlCredential.Name)
		credType := graphql.String(yamlCredential.Type)
		value, err := convertCredValue(yamlCredential.Name, yamlCredential.Type, yamlCredential.Value)
		if err != nil {
			log.Debugf("Invalid credential value format: %s", err)
			http.Error(w, fmt.Sprintf("Credential format validation failed: %s", err), http.StatusBadRequest)
			return
		}
		if existingType, ok := existingTypes[yamlCredential.Name]; ok {
			// Explicitly check and complain if the user tries to change the credential type
			if yamlCredential.Type != "" && existingType != yamlCredential.Type {
				log.Debugf("Invalid credential '%s' type change", yamlCredential.Name)
				http.Error(w, fmt.Sprintf(
					"Credential '%s' type cannot be updated (current=%s, updated=%s)",
					yamlCredential.Name, existingType, yamlCredential.Type,
				), http.StatusBadRequest)
				return
			}
			// TODO check for no-op updates and skip them (and avoid unnecessary changes to UpdatedAt)
			updates = append(updates, graphql.UpdateCredentialVariables{
				Name:      name,
				Value:     *value,
				UpdatedAt: now,
			})
		} else {
			inserts = append(inserts, graphql.CredentialInsertInput{
				Name:      &name,
				Type:      &credType,
				Value:     value,
				CreatedAt: &now,
				UpdatedAt: &now,
			})
		}
	}

	if len(inserts)+len(updates) == 0 {
		log.Debugf("Writing credentials: No data provided")
		http.Error(w, "Missing credential YAML data in request body", http.StatusBadRequest)
		return
	}

	log.Debugf("Writing credentials: %d insert, %d update", len(inserts), len(updates))

	if len(inserts) != 0 {
		err := credentialAccess.Insert(tenant, inserts)
		if err != nil {
			log.Warnf("Insert: %d credentials failed: %s", len(inserts), err)
			http.Error(w, fmt.Sprintf("Creating %d credentials failed: %s", len(inserts), err), http.StatusInternalServerError)
			return
		}
	}
	if len(updates) != 0 {
		for _, update := range updates {
			err := credentialAccess.Update(tenant, update)
			if err != nil {
				log.Warnf("Update: Credential %s failed: %s", update.Name, err)
				http.Error(w, fmt.Sprintf("Updating credential %s failed: %s", update.Name, err), http.StatusInternalServerError)
				return
			}
		}
	}
}

type AWSCredentialValue struct {
	AwsAccessKeyID     string `json:"AWS_ACCESS_KEY_ID"`
	AwsSecretAccessKey string `json:"AWS_SECRET_ACCESS_KEY"`
}

func getCredential(tenant string, w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]
	log.Debugf("Getting credential: %s", name)

	resp, err := credentialAccess.Get(tenant, name)
	if err != nil {
		log.Warnf("Get: Credential %s failed: %s", name, err)
		http.Error(w, fmt.Sprintf("Getting credential failed: %s", err), http.StatusInternalServerError)
		return
	}
	if resp == nil {
		log.Debugf("Get: Credential %s not found", name)
		http.Error(w, fmt.Sprintf("Credential not found: %s", name), http.StatusNotFound)
		return
	}

	encoder := yaml.NewEncoder(w)
	encoder.Encode(CredentialInfo{
		Name:      resp.CredentialByPk.Name,
		Type:      resp.CredentialByPk.Type,
		CreatedAt: resp.CredentialByPk.CreatedAt,
		UpdatedAt: resp.CredentialByPk.UpdatedAt,
	})
}

func deleteCredential(tenant string, w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]
	log.Debugf("Deleting credential: %s", name)

	resp, err := credentialAccess.Delete(tenant, name)
	if err != nil {
		log.Warnf("Delete: Credential %s failed: %s", name, err)
		http.Error(w, fmt.Sprintf("Deleting credential failed: %s", err), http.StatusInternalServerError)
		return
	}
	if resp == nil {
		log.Debugf("Delete: Credential %s not found", name)
		http.Error(w, fmt.Sprintf("Credential not found: %s", name), http.StatusNotFound)
		return
	}

	encoder := yaml.NewEncoder(w)
	encoder.Encode(CredentialInfo{Name: resp.DeleteCredentialByPk.Name})
}

// Information about an exporter. Custom type which omits the tenant field.
type ExporterInfo struct {
	Name       string      `yaml:"name"`
	Type       string      `yaml:"type,omitempty"`
	Credential string      `yaml:"credential,omitempty"`
	Config     interface{} `yaml:"config,omitempty"`
	CreatedAt  string      `yaml:"created_at,omitempty"`
	UpdatedAt  string      `yaml:"updated_at,omitempty"`
}

func listExporters(tenant string, w http.ResponseWriter, r *http.Request) {
	resp, err := exporterAccess.List(tenant)
	if err != nil {
		log.Warnf("Listing exporters failed: %s", err)
		http.Error(w, fmt.Sprintf("Listing exporters failed: %s", err), http.StatusInternalServerError)
		return
	}

	log.Debugf("Listing %d exporters", len(resp.Exporter))

	encoder := yaml.NewEncoder(w)
	for _, exporter := range resp.Exporter {
		configJSON := make(map[string]interface{})
		err := json.Unmarshal([]byte(exporter.Config), &configJSON)
		if err != nil {
			// give up and pass-through the json
			log.Warnf("Failed to decode JSON config for exporter %s (err: %s): %s", exporter.Name, err, exporter.Config)
			configJSON["json"] = exporter.Config
		}
		encoder.Encode(ExporterInfo{
			Name:       exporter.Name,
			Type:       exporter.Type,
			Credential: exporter.Credential,
			Config:     configJSON,
			CreatedAt:  exporter.CreatedAt,
			UpdatedAt:  exporter.UpdatedAt,
		})
	}
}

// Exporter entry received from a POST request.
type Exporter struct {
	Name       string      `yaml:"name"`
	Type       string      `yaml:"type"`
	Credential string      `yaml:"credential,omitempty"`
	Config     interface{} `yaml:"config"` // nested yaml
}

func writeExporters(tenant string, w http.ResponseWriter, r *http.Request) {
	decoder := yaml.NewDecoder(r.Body)
	// Return error for unrecognized or duplicate fields in the input
	decoder.SetStrict(true)

	// Collect list of existing names so that we can decide between insert vs update
	existingTypes := make(map[string]string)
	resp, err := exporterAccess.List(tenant)
	if err != nil {
		log.Warnf("Listing exporters failed: %s", err)
		http.Error(w, fmt.Sprintf("Listing exporters failed: %s", err), http.StatusInternalServerError)
		return
	}
	for _, exporter := range resp.Exporter {
		existingTypes[exporter.Name] = exporter.Type
	}

	now := nowTimestamp()

	var inserts []graphql.ExporterInsertInput
	var updates []graphql.UpdateExporterVariables
	for {
		var yamlExporter Exporter
		if err := decoder.Decode(&yamlExporter); err != nil {
			if err != io.EOF {
				msg := fmt.Sprintf("Decoding exporter input at index=%d failed: %s", len(inserts)+len(updates), err)
				log.Debug(msg)
				http.Error(w, msg, http.StatusBadRequest)
				return
			}
			break
		}

		var credential *graphql.String
		if yamlExporter.Credential == "" {
			if err := validateExporterTypes(yamlExporter.Type, nil); err != nil {
				msg := fmt.Sprintf("Invalid exporter input %s: %s", yamlExporter.Name, err)
				log.Debug(msg)
				http.Error(w, msg, http.StatusBadRequest)
				return
			}
			credential = nil
		} else {
			// Check that the credential exists and a compatible type.
			// If the credential didn't exist, then the graphql insert would fail anyway due to a missing relation,
			// but type mismatches are not validated by graphql.
			cred, err := credentialAccess.Get(tenant, yamlExporter.Credential)
			if err != nil {
				msg := fmt.Sprintf(
					"Failed to read credential %s referenced in new exporter %s",
					yamlExporter.Credential, yamlExporter.Name,
				)
				log.Debug(msg)
				http.Error(w, msg, http.StatusBadRequest)
				return
			} else if cred == nil {
				msg := fmt.Sprintf("Missing credential %s referenced in exporter %s", yamlExporter.Credential, yamlExporter.Name)
				log.Debug(msg)
				http.Error(w, msg, http.StatusBadRequest)
				return
			} else if err := validateExporterTypes(yamlExporter.Type, &cred.CredentialByPk.Type); err != nil {
				msg := fmt.Sprintf("Invalid exporter input %s: %s", yamlExporter.Name, err)
				log.Debug(msg)
				http.Error(w, msg, http.StatusBadRequest)
				return
			}
			gcredential := graphql.String(yamlExporter.Credential)
			credential = &gcredential
		}

		var gconfig graphql.Json
		switch yamlMap := yamlExporter.Config.(type) {
		case map[interface{}]interface{}:
			// Encode the parsed YAML config tree as JSON
			convMap, err := recurseMapStringKeys(yamlMap)
			if err != nil {
				log.Debugf("Unable to serialize exporter '%s' config as JSON: %s", yamlExporter.Name, err)
				http.Error(w, fmt.Sprintf(
					"Exporter '%s' config could not be encoded as JSON: %s", yamlExporter.Name, err,
				), http.StatusBadRequest)
				return
			}
			json, err := json.Marshal(convMap)
			if err != nil {
				log.Debugf("Unable to serialize exporter '%s' config as JSON: %s", yamlExporter.Name, err)
				http.Error(w, fmt.Sprintf(
					"Exporter '%s' config could not be encoded as JSON: %s", yamlExporter.Name, err,
				), http.StatusBadRequest)
				return
			}
			gconfig = graphql.Json(json)
		default:
			log.Debugf("Invalid exporter '%s' config type", yamlExporter.Name)
			http.Error(w, fmt.Sprintf(
				"Exporter '%s' config is invalid (must be YAML map)", yamlExporter.Name,
			), http.StatusBadRequest)
			return
		}

		name := graphql.String(yamlExporter.Name)
		if existingType, ok := existingTypes[yamlExporter.Name]; ok {
			// Explicitly check and complain if the user tries to change the exporter type
			if yamlExporter.Type != "" && existingType != yamlExporter.Type {
				log.Debugf("Invalid exporter '%s' type change", yamlExporter.Name)
				http.Error(w, fmt.Sprintf(
					"Exporter '%s' type cannot be updated (current=%s, updated=%s)",
					yamlExporter.Name, existingType, yamlExporter.Type,
				), http.StatusBadRequest)
				return
			}
			// TODO check for no-op updates and skip them (and avoid unnecessary changes to UpdatedAt)
			updates = append(updates, graphql.UpdateExporterVariables{
				Name:       name,
				Credential: credential,
				Config:     gconfig,
				UpdatedAt:  now,
			})
		} else {
			expType := graphql.String(yamlExporter.Type)
			inserts = append(inserts, graphql.ExporterInsertInput{
				Name:       &name,
				Type:       &expType,
				Credential: credential,
				Config:     &gconfig,
				CreatedAt:  &now,
				UpdatedAt:  &now,
			})
		}
	}

	if len(inserts)+len(updates) == 0 {
		log.Debugf("Writing exporters: No data provided")
		http.Error(w, "Missing exporter YAML data in request body", http.StatusBadRequest)
		return
	}

	log.Debugf("Writing exporters: %d insert, %d update", len(inserts), len(updates))

	if len(inserts) != 0 {
		if err := exporterAccess.Insert(tenant, inserts); err != nil {
			log.Warnf("Insert: %d exporters failed: %s", len(inserts), err)
			http.Error(w, fmt.Sprintf("Creating %d exporters failed: %s", len(inserts), err), http.StatusInternalServerError)
			return
		}
	}
	if len(updates) != 0 {
		for _, update := range updates {
			if err := exporterAccess.Update(tenant, update); err != nil {
				log.Warnf("Update: Exporter %s/%s failed: %s", tenant, update.Name, err)
				http.Error(w, fmt.Sprintf("Updating exporter %s failed: %s", update.Name, err), http.StatusInternalServerError)
				return
			}
		}
	}
}

// Searches through the provided object tree for any maps with interface keys (from YAML),
// and converts those keys to strings (required for JSON).
func recurseMapStringKeys(in interface{}) (interface{}, error) {
	switch inType := in.(type) {
	case map[interface{}]interface{}: // yaml type for maps. needs string keys to work with JSON
		// Ensure the map keys are converted, RECURSE into values to find nested maps
		strMap := make(map[string]interface{})
		for k, v := range inType {
			switch kType := k.(type) {
			case string:
				conv, err := recurseMapStringKeys(v)
				if err != nil {
					return nil, err
				}
				strMap[kType] = conv
			default:
				return nil, errors.New("map is invalid (keys must be strings)")
			}
		}
		return strMap, nil
	case []interface{}:
		// RECURSE into entries to convert any nested maps are converted
		for i, v := range inType {
			conv, err := recurseMapStringKeys(v)
			if err != nil {
				return nil, err
			}
			inType[i] = conv
		}
		return inType, nil
	default:
		return in, nil
	}
}

func getExporter(tenant string, w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]
	log.Debugf("Getting exporter: %s", name)

	resp, err := exporterAccess.Get(tenant, name)
	if err != nil {
		log.Warnf("Get: Exporter %s/%s failed: %s", tenant, name, err)
		http.Error(w, fmt.Sprintf("Getting exporter failed: %s", err), http.StatusInternalServerError)
		return
	}
	if resp == nil {
		log.Debugf("Get: Exporter %s/%s not found", tenant, name)
		http.Error(w, fmt.Sprintf("Exporter not found: %s", name), http.StatusNotFound)
		return
	}

	configJSON := make(map[string]interface{})
	if err = json.Unmarshal([]byte(resp.ExporterByPk.Config), &configJSON); err != nil {
		// give up and pass-through the json
		log.Warnf(
			"Failed to decode JSON config for exporter %s (err: %s): %s",
			resp.ExporterByPk.Name, err, resp.ExporterByPk.Config,
		)
		configJSON["json"] = resp.ExporterByPk.Config
	}

	encoder := yaml.NewEncoder(w)
	encoder.Encode(ExporterInfo{
		Name:       resp.ExporterByPk.Name,
		Type:       resp.ExporterByPk.Type,
		Credential: resp.ExporterByPk.Credential,
		Config:     configJSON,
		CreatedAt:  resp.ExporterByPk.CreatedAt,
		UpdatedAt:  resp.ExporterByPk.UpdatedAt,
	})
}

func deleteExporter(tenant string, w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]
	log.Debugf("Deleting exporter: %s/%s", tenant, name)

	resp, err := exporterAccess.Delete(tenant, name)
	if err != nil {
		log.Warnf("Delete: Exporter %s/%s failed: %s", tenant, name, err)
		http.Error(w, fmt.Sprintf("Deleting exporter failed: %s", err), http.StatusInternalServerError)
		return
	}
	if resp == nil {
		log.Debugf("Delete: Exporter %s/%s not found", tenant, name)
		http.Error(w, fmt.Sprintf("Exporter not found: %s", name), http.StatusNotFound)
		return
	}

	encoder := yaml.NewEncoder(w)
	encoder.Encode(ExporterInfo{Name: resp.DeleteExporterByPk.Name})
}

// Returns a string representation of the current time in UTC, suitable for passing to Hasura as a timestamptz
// See also https://hasura.io/blog/postgres-date-time-data-types-on-graphql-fd926e86ee87/
func nowTimestamp() graphql.Timestamptz {
	return graphql.Timestamptz(time.Now().Format(time.RFC3339))
}
