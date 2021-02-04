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

package graphql

import (
	"encoding/json"
	"net/http"
	"net/url"
)

type ExporterAccess struct {
	tenant        String
	client        *Client
	graphqlSecret string
}

func NewExporterAccess(tenant string, graphqlURL *url.URL, graphqlSecret string) ExporterAccess {
	return ExporterAccess{
		String(tenant),
		NewClient(graphqlURL.String()),
		graphqlSecret,
	}
}

// FixedGetExportersResponse fixes missing underscores in GetExporterResponse fields.
// Remove this if/when the generator is fixed.
type FixedGetExportersResponse struct {
	Exporter []struct {
		Tenant     string `json:"Tenant"`
		Name       string `json:"Name"`
		Type       string `json:"Type"`
		Credential string `json:"Credential"`
		Config     string `json:"Config"`
		CreatedAt  string `json:"Created_At"` // fix missing underscore
		UpdatedAt  string `json:"Updated_At"` // fix missing underscore
	} `json:"Exporter"`
}

func (c *ExporterAccess) List() (*FixedGetExportersResponse, error) {
	req, err := NewGetExportersRequest(c.client.Url, &GetExportersVariables{Tenant: c.tenant})
	if err != nil {
		return nil, err
	}
	c.addSecret(req.Request)

	resp, err := execute(c.client.Client, req.Request)
	if err != nil {
		return nil, err
	}

	var result FixedGetExportersResponse
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// FixedGetExporterResponse fixes missing underscores in GetExporterResponse fields.
// Remove this if/when the generator is fixed.
type FixedGetExporterResponse struct {
	ExporterByPk struct {
		Tenant     string `json:"Tenant"`
		Name       string `json:"Name"`
		Type       string `json:"Type"`
		Credential string `json:"Credential"`
		Config     string `json:"Config"`
		CreatedAt  string `json:"Created_At"` // fix missing underscore
		UpdatedAt  string `json:"Updated_At"` // fix missing underscore
	} `json:"Exporter_By_Pk"` // fix missing underscores
}

func (c *ExporterAccess) Get(name string) (*FixedGetExporterResponse, error) {
	req, err := NewGetExporterRequest(c.client.Url, &GetExporterVariables{Tenant: c.tenant, Name: String(name)})
	if err != nil {
		return nil, err
	}
	c.addSecret(req.Request)

	resp, err := execute(c.client.Client, req.Request)
	if err != nil {
		return nil, err
	}

	var result FixedGetExporterResponse
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return nil, err
	}
	if result.ExporterByPk.Name == "" {
		// Not found
		return nil, nil
	}
	return &result, nil
}

// FixedDeleteExporterResponse fixes missing underscores in DeleteExporterResponse fields.
// Remove this if/when the generator is fixed.
type FixedDeleteExporterResponse struct {
	DeleteExporterByPk struct {
		Tenant string `json:"Tenant"`
		Name   string `json:"Name"`
	} `json:"Delete_Exporter_By_Pk"` // fix missing underscores
}

func (c *ExporterAccess) Delete(name string) (*FixedDeleteExporterResponse, error) {
	req, err := NewDeleteExporterRequest(c.client.Url, &DeleteExporterVariables{Tenant: c.tenant, Name: String(name)})
	if err != nil {
		return nil, err
	}
	c.addSecret(req.Request)

	resp, err := execute(c.client.Client, req.Request)
	if err != nil {
		return nil, err
	}

	// Use custom type to deserialize since the generated one is broken
	var result FixedDeleteExporterResponse
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return nil, err
	}
	if result.DeleteExporterByPk.Name == "" {
		// Not found
		return nil, nil
	}
	return &result, nil
}

// Insert inserts one or more exporters, returns an error if any already exists.
func (c *ExporterAccess) Insert(inserts []ExporterInsertInput) error {
	// Ensure the inserts each have the correct tenant name
	insertsWithTenant := make([]ExporterInsertInput, 0)
	for _, insert := range inserts {
		insert.Tenant = &c.tenant
		insertsWithTenant = append(insertsWithTenant, insert)
	}

	req, err := NewCreateExportersRequest(c.client.Url, &CreateExportersVariables{Exporters: &insertsWithTenant})
	if err != nil {
		return err
	}
	c.addSecret(req.Request)

	_, err = req.Execute(c.client.Client)
	return err
}

// Update updates an existing exporter, returns an error if a exporter of the same tenant/name doesn't exist.
func (c *ExporterAccess) Update(update UpdateExporterVariables) error {
	// Ensure the update has the correct tenant name
	update.Tenant = c.tenant

	req, err := NewUpdateExporterRequest(c.client.Url, &update)
	if err != nil {
		return err
	}
	c.addSecret(req.Request)

	_, err = req.Execute(c.client.Client)
	return err
}

// addSecret adds the required HTTP header for talking to the Hasura graphql server.
func (c *ExporterAccess) addSecret(req *http.Request) {
	if c.graphqlSecret != "" {
		req.Header.Add("x-hasura-admin-secret", c.graphqlSecret)
	}
}
