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
	"fmt"
	"io"
	"net/http"

	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"

	"github.com/opstrace/opstrace/go/pkg/graphql"
)

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

func listExporterTypes(tenant string) (map[string]string, error) {
	// Collect map of existing name->type so that we can decide between insert vs update
	existingTypes := make(map[string]string)
	resp, err := exporterAccess.List(tenant)
	if err != nil {
		log.Warnf("Listing exporters failed: %s", err)
		return nil, err
	}
	for _, exporter := range resp.Exporter {
		existingTypes[exporter.Name] = exporter.Type
	}
	return existingTypes, nil
}

// Returns the JSON exporter value, whether the exporter already exists, and any validation error.
func validateExporter(
	tenant string,
	existingTypes map[string]string,
	yamlExporter Exporter,
) (*graphql.Json, bool, error) {
	if yamlExporter.Credential == "" {
		if err := validateExporterTypes(yamlExporter.Type, nil); err != nil {
			msg := fmt.Sprintf("Invalid exporter input %s: %s", yamlExporter.Name, err)
			log.Debug(msg)
			return nil, false, errors.New(msg)
		}
	} else {
		// Check that the referenced credential exists and has a compatible type for this exporter.
		// If the credential didn't exist, then the graphql insert would fail anyway due to a missing relation,
		// but type mismatches are not validated by graphql.
		cred, err := credentialAccess.Get(tenant, yamlExporter.Credential)
		if err != nil {
			return nil, false, fmt.Errorf(
				"failed to read credential %s referenced in new exporter %s",
				yamlExporter.Credential, yamlExporter.Name,
			)
		} else if cred == nil {
			return nil, false, fmt.Errorf(
				"missing credential %s referenced in exporter %s", yamlExporter.Credential, yamlExporter.Name,
			)
		} else if err := validateExporterTypes(yamlExporter.Type, &cred.CredentialByPk.Type); err != nil {
			return nil, false, fmt.Errorf("invalid exporter input %s: %s", yamlExporter.Name, err)
		}
	}

	var gconfig graphql.Json
	switch yamlMap := yamlExporter.Config.(type) {
	case map[interface{}]interface{}:
		// Encode the parsed YAML config tree as JSON
		convMap, err := recurseMapStringKeys(yamlMap)
		if err != nil {
			return nil, false, fmt.Errorf(
				"Exporter '%s' config could not be encoded as JSON: %s", yamlExporter.Name, err,
			)
		}
		json, err := json.Marshal(convMap)
		if err != nil {
			return nil, false, fmt.Errorf(
				"Exporter '%s' config could not be encoded as JSON: %s", yamlExporter.Name, err,
			)
		}
		gconfig = graphql.Json(json)
	default:
		return nil, false, fmt.Errorf(
			"Exporter '%s' config is invalid (must be YAML map)", yamlExporter.Name,
		)
	}

	var existingType string
	var exists bool
	if existingType, exists = existingTypes[yamlExporter.Name]; exists {
		// Explicitly check and complain if the user tries to change the exporter type
		if yamlExporter.Type != "" && existingType != yamlExporter.Type {
			return nil, false, fmt.Errorf(
				"Exporter '%s' type cannot be updated (current=%s, updated=%s)",
				yamlExporter.Name, existingType, yamlExporter.Type,
			)
		}
	}
	return &gconfig, exists, nil
}

func writeExporters(tenant string, w http.ResponseWriter, r *http.Request) {
	decoder := yaml.NewDecoder(r.Body)
	// Return error for unrecognized or duplicate fields in the input
	decoder.SetStrict(true)

	// Collect map of existing name->type so that we can decide between insert vs update
	existingTypes, err := listExporterTypes(tenant)
	if err != nil {
		http.Error(w, fmt.Sprintf("Listing exporters failed: %s", err), http.StatusInternalServerError)
		return
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
			credential = nil
		} else {
			gcredential := graphql.String(yamlExporter.Credential)
			credential = &gcredential
		}

		gconfig, exists, err := validateExporter(tenant, existingTypes, yamlExporter)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		name := graphql.String(yamlExporter.Name)
		if exists {
			// TODO check for no-op updates and skip them (and avoid unnecessary changes to UpdatedAt)
			updates = append(updates, graphql.UpdateExporterVariables{
				Name:       name,
				Credential: credential,
				Config:     *gconfig,
				UpdatedAt:  now,
			})
		} else {
			expType := graphql.String(yamlExporter.Type)
			inserts = append(inserts, graphql.ExporterInsertInput{
				Name:       &name,
				Type:       &expType,
				Credential: credential,
				Config:     gconfig,
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
