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
	"fmt"
	"io"
	"net/http"

	"github.com/gorilla/mux"
	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"

	"github.com/opstrace/opstrace/go/pkg/config"
	"github.com/opstrace/opstrace/go/pkg/graphql"
)

// Information about a credential. Custom type which omits the tenant field.
// This also gives some extra protection that the value isn't disclosed,
// even if it was mistakenly added to the underlying graphql interface.
type CredentialInfo struct {
	Name      string `yaml:"name"`
	Type      string `yaml:"type,omitempty"`
	CreatedAt string `yaml:"created_at,omitempty"`
	UpdatedAt string `yaml:"updated_at,omitempty"`
}

// Full credential entry (with secret value) for validation and interaction with GraphQL.
type Credential struct {
	Name      string
	Type      string
	ValueJSON string
}

// Raw credential entry received from POST request, converted to a Credential.
type yamlCredential struct {
	Name  string      `yaml:"name"`
	Type  string      `yaml:"type"`
	Value interface{} `yaml:"value"`
}

type credentialAPI struct {
	credentialAccess *config.CredentialAccess
}

func newCredentialAPI(credentialAccess *config.CredentialAccess) *credentialAPI {
	return &credentialAPI{
		credentialAccess,
	}
}

func (c *credentialAPI) listCredentials(tenant string, w http.ResponseWriter, r *http.Request) {
	resp, err := c.credentialAccess.List(tenant)
	if err != nil {
		log.Warnf("Listing credentials failed: %s", err)
		http.Error(w, fmt.Sprintf("Listing credentials failed: %s", err), http.StatusInternalServerError)
		return
	}

	log.Debugf("Listing %d credentials", len(resp.Credential))

	// Create list payload to respond with.
	// Avoid passing entries individually to encoder since that won't consistently produce a list.
	entries := make([]CredentialInfo, len(resp.Credential))
	for i, credential := range resp.Credential {
		entries[i] = CredentialInfo{
			Name:      credential.Name,
			Type:      credential.Type,
			CreatedAt: credential.CreatedAt,
			UpdatedAt: credential.UpdatedAt,
		}
	}

	encoder := yaml.NewEncoder(w)
	encoder.Encode(entries)
}

func (c *credentialAPI) writeCredentials(tenant string, w http.ResponseWriter, r *http.Request) {
	decoder := yaml.NewDecoder(r.Body)
	// Return error for unrecognized or duplicate fields in the input
	decoder.SetStrict(true)

	// Collect map of existing name->type so that we can decide between insert vs update
	existingTypes, err := c.listCredentialTypes(tenant)
	if err != nil {
		http.Error(w, fmt.Sprintf("Listing credentials failed: %s", err), http.StatusInternalServerError)
		return
	}

	now := nowTimestamp()

	var inserts []graphql.CredentialInsertInput
	var updates []graphql.UpdateCredentialVariables
	for {
		var yamlCredential yamlCredential
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
		value, err := convertYAMLCredValue(yamlCredential.Name, yamlCredential.Type, yamlCredential.Value)
		if err != nil {
			log.Debugf("Parsing credential input at index=%d failed: %s", len(inserts)+len(updates), err)
			http.Error(w, fmt.Sprintf(
				"Parsing credential input at index=%d failed: %s", len(inserts)+len(updates), err,
			), http.StatusBadRequest)
			return
		}
		exists, err := c.validateCredential(
			existingTypes,
			Credential{
				Name:      yamlCredential.Name,
				Type:      yamlCredential.Type,
				ValueJSON: *value,
			},
		)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		name := graphql.String(yamlCredential.Name)
		credType := graphql.String(yamlCredential.Type)
		gvalue := graphql.Json(*value)
		if exists {
			// TODO check for no-op updates and skip them (and avoid unnecessary changes to UpdatedAt)
			updates = append(updates, graphql.UpdateCredentialVariables{
				Name:      name,
				Value:     gvalue,
				UpdatedAt: now,
			})
		} else {
			inserts = append(inserts, graphql.CredentialInsertInput{
				Name:      &name,
				Type:      &credType,
				Value:     &gvalue,
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
		err := c.credentialAccess.Insert(tenant, inserts)
		if err != nil {
			log.Warnf("Insert: %d credentials failed: %s", len(inserts), err)
			http.Error(
				w,
				fmt.Sprintf("Creating %d credentials failed: %s", len(inserts), err),
				http.StatusInternalServerError,
			)
			return
		}
	}
	if len(updates) != 0 {
		for _, update := range updates {
			err := c.credentialAccess.Update(tenant, update)
			if err != nil {
				log.Warnf("Update: Credential %s failed: %s", update.Name, err)
				http.Error(
					w,
					fmt.Sprintf("Updating credential %s failed: %s", update.Name, err),
					http.StatusInternalServerError,
				)
				return
			}
		}
	}
}

func (c *credentialAPI) getCredential(tenant string, w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]
	log.Debugf("Getting credential: %s", name)

	resp, err := c.credentialAccess.Get(tenant, name)
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

func (c *credentialAPI) deleteCredential(tenant string, w http.ResponseWriter, r *http.Request) {
	name := mux.Vars(r)["name"]
	log.Debugf("Deleting credential: %s", name)

	resp, err := c.credentialAccess.Delete(tenant, name)
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

func (c *credentialAPI) listCredentialTypes(tenant string) (map[string]string, error) {
	// Collect map of existing name->type so that we can decide between insert vs update
	existingTypes := make(map[string]string)
	resp, err := c.credentialAccess.List(tenant)
	if err != nil {
		log.Warnf("Listing credentials failed: %s", err)
		return nil, err
	}
	for _, credential := range resp.Credential {
		existingTypes[credential.Name] = credential.Type
	}
	return existingTypes, nil
}

// Accepts the tenant name, the name->type mapping of any existin credentials, and the new credential payload.
// Returns whether the credential already exists, and any validation error.
func (c *credentialAPI) validateCredential(existingTypes map[string]string, credential Credential) (bool, error) {
	// Check that the credential name is suitable for use in K8s object names
	if err := config.ValidateName(credential.Name); err != nil {
		return false, err
	}

	// Check that the credential value is valid JSON
	if err := validateCredentialValue(credential.Name, credential.Type, credential.ValueJSON); err != nil {
		return false, err
	}

	// Check that the credential type is not being changed from an existing credential of the same name
	var existingType string
	var exists bool
	if existingType, exists = existingTypes[credential.Name]; exists {
		if credential.Type != "" && existingType != credential.Type {
			return false, fmt.Errorf(
				"Credential '%s' type cannot be updated (current=%s, updated=%s)",
				credential.Name, existingType, credential.Type,
			)
		}
	}
	return exists, nil
}
