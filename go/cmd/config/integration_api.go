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
	"fmt"
	"io"
	"net/http"

	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"

	"github.com/opstrace/opstrace/go/pkg/config"
	"github.com/opstrace/opstrace/go/pkg/graphql"
)

// Information about an integration.
type IntegrationInfo struct {
	Name      string      `yaml:"name"`
	ID        string      `yaml:"id"`
	Kind      string      `yaml:"kind,omitempty"`
	Data      interface{} `yaml:"data,omitempty"`
	CreatedAt string      `yaml:"created_at,omitempty"`
	UpdatedAt string      `yaml:"updated_at,omitempty"`
}

// Integration entry for validation and interaction with GraphQL.
type Integration struct {
	Name     string
	Kind     string
	DataJSON string
}

// Raw integration entry received from POST request, converted to an Integration
type yamlIntegration struct {
	Name string      `yaml:"name"`
	Kind string      `yaml:"kind"`
	Data interface{} `yaml:"data"`
}

type integrationAPI struct {
	integrationAccess *config.IntegrationAccess
}

func newIntegrationAPI(integrationAccess *config.IntegrationAccess) *integrationAPI {
	return &integrationAPI{
		integrationAccess,
	}
}

func (c *integrationAPI) listIntegrations(tenant string, w http.ResponseWriter, r *http.Request) {
	resp, err := c.integrationAccess.List(tenant)
	if err != nil {
		log.Warnf("Listing integrations failed: %s", err)
		http.Error(w, fmt.Sprintf("Listing integrations failed: %s", err), http.StatusInternalServerError)
		return
	}

	// Create list payload to respond with.
	// Avoid passing entries individually to encoder since that won't consistently produce a list.
	entries := make([]IntegrationInfo, len(resp.Integration))
	for i, integration := range resp.Integration {
		entries[i] = IntegrationInfo{
			Name:      integration.Name,
			Kind:      integration.Kind,
			Data:      integration.Data,
			CreatedAt: integration.CreatedAt,
			UpdatedAt: integration.UpdatedAt,
		}
	}

	encoder := yaml.NewEncoder(w)
	encoder.Encode(entries)
}

func (c *integrationAPI) writeIntegrations(tenant string, w http.ResponseWriter, r *http.Request) {
	decoder := yaml.NewDecoder(r.Body)
	// Return error for unrecognized or duplicate fields in the input
	decoder.SetStrict(true)

	// Collect map of existing name->type so that we can decide between insert vs update
	existingKinds, err := c.listIntegrationKinds(tenant)
	if err != nil {
		http.Error(w, fmt.Sprintf("Listing integrations failed: %s", err), http.StatusInternalServerError)
		return
	}

	now := nowTimestamp()

	var inserts []graphql.IntegrationInsertInput
	var updateNames []string
	for {
		var yamlIntegration yamlIntegration
		err := decoder.Decode(&yamlIntegration)
		if err != nil {
			if err != io.EOF {
				http.Error(w, fmt.Sprintf(
					"Decoding integration input at index=%d failed: %s", len(inserts)+len(updateNames), err,
				), http.StatusBadRequest)
				return
			}
			break
		}
		// TODO should only convert the cred content within the data, not all the data
		data, err := convertYAMLCredValue(yamlIntegration.Name, yamlIntegration.Kind, yamlIntegration.Data)
		if err != nil {
			http.Error(w, fmt.Sprintf(
				"Parsing integration input at index=%d failed: %s", len(inserts)+len(updateNames), err,
			), http.StatusBadRequest)
			return
		}
		exists, err := c.validateIntegration(
			existingKinds,
			Integration{
				Name:      yamlIntegration.Name,
				Kind:      yamlIntegration.Kind,
				DataJSON: *data,
			},
		)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		name := graphql.String(yamlIntegration.Name)
		gKind := graphql.String(yamlIntegration.Kind)
		gData := graphql.Jsonb(*data)
		if exists {
			updateNames = append(updateNames, yamlIntegration.Name)
		} else {
			inserts = append(inserts, graphql.IntegrationInsertInput{
				Name:      &name,
				Kind:      &gKind,
				Data:      &gData,
				CreatedAt: &now,
				UpdatedAt: &now,
			})
		}
	}

	if len(inserts)+len(updateNames) == 0 {
		http.Error(w, "Missing integration YAML data in request body", http.StatusBadRequest)
		return
	}

	if len(inserts) != 0 {
		err := c.integrationAccess.Insert(tenant, inserts)
		if err != nil {
			log.Warnf("Insert: %d integrations failed: %s", len(inserts), err)
			http.Error(
				w,
				fmt.Sprintf("Creating %d integrations failed: %s", len(inserts), err),
				http.StatusInternalServerError,
			)
			return
		}
	}
	if len(updateNames) != 0 {
		// TODO implement integration updates
		http.Error(
			w,
			fmt.Sprintf("Updating integrations is not supported: %v+", updateNames),
			http.StatusInternalServerError,
		)
		return
	}
}

func (c *integrationAPI) getIntegration(tenant string, w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]

	resp, err := c.integrationAccess.Get(tenant, name)
	if err != nil {
		log.Warnf("Get: Integration %s failed: %s", name, err)
		http.Error(w, fmt.Sprintf("Getting integration failed: %s", err), http.StatusInternalServerError)
		return
	}
	if resp == nil {
		http.Error(w, fmt.Sprintf("Integration not found: %s", name), http.StatusNotFound)
		return
	}
	integration := resp.Integration[0];

	dataJSON := make(map[string]interface{})
	if err = json.Unmarshal([]byte(integration.Data), &dataJSON); err != nil {
		// give up and pass-through the json
		log.Warnf(
			"Failed to decode JSON config for integration %s (err: %s): %s",
			integration.Name, err, integration.Data,
		)
		dataJSON["json"] = integration.Data
	}

	encoder := yaml.NewEncoder(w)
	encoder.Encode(IntegrationInfo{
		Name:      integration.Name,
		Kind:      integration.Kind,
		CreatedAt: integration.CreatedAt,
		UpdatedAt: integration.UpdatedAt,
	})
}

func (c *integrationAPI) deleteIntegration(tenant string, w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]

	resp, err := c.integrationAccess.Delete(tenant, name)
	if err != nil {
		log.Warnf("Delete: Integration %s failed: %s", name, err)
		http.Error(w, fmt.Sprintf("Deleting integration failed: %s", err), http.StatusInternalServerError)
		return
	}
	if resp == nil {
		http.Error(w, fmt.Sprintf("Integration not found: %s", name), http.StatusNotFound)
		return
	}

	encoder := yaml.NewEncoder(w)
	encoder.Encode(IntegrationInfo{ID: resp.DeleteIntegration.Returning[0].ID})
}

func (c *integrationAPI) listIntegrationKinds(tenant string) (map[string]string, error) {
	// Collect map of existing name->kind so that we can decide between insert vs update
	existingKinds := make(map[string]string)
	resp, err := c.integrationAccess.List(tenant)
	if err != nil {
		log.Warnf("Listing integrations failed: %s", err)
		return nil, err
	}
	for _, integration := range resp.Integration {
		existingKinds[integration.Name] = integration.Kind
	}
	return existingKinds, nil
}

// Accepts the tenant name, the name->kind mapping of any existing integrations, and the new integration payload.
// Returns whether the integration already exists, and any validation error.
func (c *integrationAPI) validateIntegration(existingKinds map[string]string, integration Integration) (bool, error) {
	// Check that the integration name is suitable for use in K8s object names
	if err := config.ValidateName(integration.Name); err != nil {
		return false, err
	}

	// Check that the integration value is valid JSON
	if err := validateCredentialValue(integration.Name, integration.Kind, integration.DataJSON); err != nil {
		return false, err
	}

	// Check that the integration kind is not being changed from an existing integration of the same name
	var existingKind string
	var exists bool
	if existingKind, exists = existingKinds[integration.Name]; exists {
		if integration.Kind != "" && existingKind != integration.Kind {
			return false, fmt.Errorf(
				"Integration '%s' kind cannot be updated (current=%s, updated=%s)",
				integration.Name, existingKind, integration.Kind,
			)
		}
	}
	return exists, nil
}
