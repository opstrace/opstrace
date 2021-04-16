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

	"github.com/opstrace/opstrace/go/pkg/config"
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

// Exporter entry for validation and interaction with GraphQL.
type Exporter struct {
	Name       string
	Type       string
	Credential string
	ConfigJSON string
}

// Raw exporter entry received from a POST request, converted to an Exporter.
type yamlExporter struct {
	Name       string      `yaml:"name"`
	Type       string      `yaml:"type"`
	Credential string      `yaml:"credential,omitempty"`
	Config     interface{} `yaml:"config"` // nested yaml
}

type exporterAPI struct {
	credentialAccess *config.CredentialAccess
	exporterAccess   *config.ExporterAccess
}

func newExporterAPI(credentialAccess *config.CredentialAccess, exporterAccess *config.ExporterAccess) *exporterAPI {
	return &exporterAPI{
		credentialAccess,
		exporterAccess,
	}
}

func (e *exporterAPI) listExporters(tenant string, w http.ResponseWriter, r *http.Request) {
	resp, err := e.exporterAccess.List(tenant)
	if err != nil {
		log.Warnf("Listing exporters failed: %s", err)
		http.Error(w, fmt.Sprintf("Listing exporters failed: %s", err), http.StatusInternalServerError)
		return
	}

	log.Debugf("Listing %d exporters", len(resp.Exporter))

	// Create list payload to respond with.
	// Avoid passing entries individually to encoder since that won't consistently produce a list.
	entries := make([]ExporterInfo, len(resp.Exporter))
	for i, exporter := range resp.Exporter {
		configJSON := make(map[string]interface{})
		err := json.Unmarshal([]byte(exporter.Config), &configJSON)
		if err != nil {
			// give up and pass-through the json
			log.Warnf("Failed to decode JSON config for exporter %s (err: %s): %s", exporter.Name, err, exporter.Config)
			configJSON["json"] = exporter.Config
		}
		entries[i] = ExporterInfo{
			Name:       exporter.Name,
			Type:       exporter.Type,
			Credential: exporter.Credential,
			Config:     configJSON,
			CreatedAt:  exporter.CreatedAt,
			UpdatedAt:  exporter.UpdatedAt,
		}
	}

	encoder := yaml.NewEncoder(w)
	encoder.Encode(entries)
}

func (e *exporterAPI) writeExporters(tenant string, w http.ResponseWriter, r *http.Request) {
	decoder := yaml.NewDecoder(r.Body)
	// Return error for unrecognized or duplicate fields in the input
	decoder.SetStrict(true)

	// Collect map of existing name->type so that we can decide between insert vs update
	existingTypes, err := e.listExporterTypes(tenant)
	if err != nil {
		http.Error(w, fmt.Sprintf("Listing exporters failed: %s", err), http.StatusInternalServerError)
		return
	}

	now := nowTimestamp()

	var inserts []graphql.ExporterInsertInput
	var updates []graphql.UpdateExporterVariables
	for {
		var yamlExporter yamlExporter
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

		config, err := convertYAMLExporterConfig(yamlExporter.Name, yamlExporter.Config)
		if err != nil {
			log.Debugf("Parsing exporter input at index=%d failed: %s", len(inserts)+len(updates), err)
			http.Error(w, fmt.Sprintf(
				"Parsing exporter input at index=%d failed: %s", len(inserts)+len(updates), err,
			), http.StatusBadRequest)
			return
		}

		exists, err := e.validateExporter(
			tenant,
			existingTypes,
			Exporter{
				Name:       yamlExporter.Name,
				Type:       yamlExporter.Type,
				Credential: yamlExporter.Credential,
				ConfigJSON: *config,
			},
		)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		name := graphql.String(yamlExporter.Name)
		gconfig := graphql.Json(*config)
		if exists {
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
		if err := e.exporterAccess.Insert(tenant, inserts); err != nil {
			log.Warnf("Insert: %d exporters failed: %s", len(inserts), err)
			http.Error(w, fmt.Sprintf("Creating %d exporters failed: %s", len(inserts), err), http.StatusInternalServerError)
			return
		}
	}
	if len(updates) != 0 {
		for _, update := range updates {
			if err := e.exporterAccess.Update(tenant, update); err != nil {
				log.Warnf("Update: Exporter %s/%s failed: %s", tenant, update.Name, err)
				http.Error(w, fmt.Sprintf("Updating exporter %s failed: %s", update.Name, err), http.StatusInternalServerError)
				return
			}
		}
	}
}

func (e *exporterAPI) getExporter(tenant string, w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]
	log.Debugf("Getting exporter: %s", name)

	resp, err := e.exporterAccess.Get(tenant, name)
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

func (e *exporterAPI) deleteExporter(tenant string, w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]
	log.Debugf("Deleting exporter: %s/%s", tenant, name)

	resp, err := e.exporterAccess.Delete(tenant, name)
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

func (e *exporterAPI) listExporterTypes(tenant string) (map[string]string, error) {
	// Collect map of existing name->type so that we can decide between insert vs update
	existingTypes := make(map[string]string)
	resp, err := e.exporterAccess.List(tenant)
	if err != nil {
		log.Warnf("Listing exporters failed: %s", err)
		return nil, err
	}
	for _, exporter := range resp.Exporter {
		existingTypes[exporter.Name] = exporter.Type
	}
	return existingTypes, nil
}

// Accepts the tenant name, the name->type mapping of any existing exporters, and the new exporter payload.
// Returns whether the exporter already exists, and any validation error.
func (e *exporterAPI) validateExporter(
	tenant string,
	existingTypes map[string]string,
	exporter Exporter,
) (bool, error) {
	// Check that the exporter name is suitable for use in K8s object names
	if err := config.ValidateName(exporter.Name); err != nil {
		return false, err
	}

	if exporter.Credential == "" {
		if err := validateExporterTypes(exporter.Type, nil); err != nil {
			msg := fmt.Sprintf("Invalid exporter input %s: %s", exporter.Name, err)
			log.Debug(msg)
			return false, errors.New(msg)
		}
	} else {
		// Check that the referenced credential exists and has a compatible type for this exporter.
		// If the credential didn't exist, then the graphql insert would fail anyway due to a missing relation,
		// but type mismatches are not validated by graphql.
		cred, err := e.credentialAccess.Get(tenant, exporter.Credential)
		if err != nil {
			return false, fmt.Errorf(
				"failed to read credential %s referenced in new exporter %s",
				exporter.Credential, exporter.Name,
			)
		} else if cred == nil {
			return false, fmt.Errorf(
				"missing credential %s referenced in exporter %s", exporter.Credential, exporter.Name,
			)
		} else if err := validateExporterTypes(exporter.Type, &cred.CredentialByPk.Type); err != nil {
			return false, fmt.Errorf("invalid exporter input %s: %s", exporter.Name, err)
		}
	}

	var existingType string
	var exists bool
	if existingType, exists = existingTypes[exporter.Name]; exists {
		// Explicitly check and complain if the user tries to change the exporter type
		if exporter.Type != "" && existingType != exporter.Type {
			return false, fmt.Errorf(
				"Exporter '%s' type cannot be updated (current=%s, updated=%s)",
				exporter.Name, existingType, exporter.Type,
			)
		}
	}
	return exists, nil
}
