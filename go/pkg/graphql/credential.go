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

type CredentialAccess struct {
	client        *Client
	graphqlSecret string
}

func NewCredentialAccess(graphqlURL *url.URL, graphqlSecret string) CredentialAccess {
	return CredentialAccess{
		NewClient(graphqlURL.String()),
		graphqlSecret,
	}
}

// FixedGetCredentialsResponse fixes missing underscores in GetCredentialResponse fields.
// Remove this if/when the generator is fixed.
type FixedGetCredentialsResponse struct {
	Credential []struct {
		Tenant    string `json:"Tenant"`
		Name      string `json:"Name"`
		Type      string `json:"Type"`
		CreatedAt string `json:"Created_At"`
		UpdatedAt string `json:"Updated_At"`
	} `json:"Credential"`
}

func (c *CredentialAccess) List(tenant string) (*FixedGetCredentialsResponse, error) {
	req, err := NewGetCredentialsRequest(c.client.Url, &GetCredentialsVariables{Tenant: String(tenant)})
	if err != nil {
		return nil, err
	}
	c.addSecret(req.Request)

	resp, err := execute(c.client.Client, req.Request)
	if err != nil {
		return nil, err
	}

	var result FixedGetCredentialsResponse
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

// FixedGetCredentialResponse fixes missing underscores in GetCredentialResponse fields.
// Remove this if/when the generator is fixed.
type FixedGetCredentialResponse struct {
	CredentialByPk struct {
		Tenant    string `json:"Tenant"`
		Name      string `json:"Name"`
		Type      string `json:"Type"`
		CreatedAt string `json:"Created_At"`
		UpdatedAt string `json:"Updated_At"`
	} `json:"Credential_By_Pk"`
}

func (c *CredentialAccess) Get(tenant string, name string) (*FixedGetCredentialResponse, error) {
	req, err := NewGetCredentialRequest(c.client.Url, &GetCredentialVariables{Tenant: String(tenant), Name: String(name)})
	if err != nil {
		return nil, err
	}
	c.addSecret(req.Request)

	resp, err := execute(c.client.Client, req.Request)
	if err != nil {
		return nil, err
	}

	var result FixedGetCredentialResponse
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return nil, err
	}
	if result.CredentialByPk.Name == "" {
		// Not found
		return nil, nil
	}
	return &result, nil
}

// FixedDeleteCredentialResponse missing underscores in DeleteCredentialResponse fields.
// Remove this if/when the generator is fixed.
type FixedDeleteCredentialResponse struct {
	DeleteCredentialByPk struct {
		Tenant string `json:"Tenant"`
		Name   string `json:"Name"`
	} `json:"Delete_Credential_By_Pk"`
}

func (c *CredentialAccess) Delete(tenant string, name string) (*FixedDeleteCredentialResponse, error) {
	req, err := NewDeleteCredentialRequest(
		c.client.Url,
		&DeleteCredentialVariables{Tenant: String(tenant), Name: String(name)},
	)
	if err != nil {
		return nil, err
	}
	c.addSecret(req.Request)

	resp, err := execute(c.client.Client, req.Request)
	if err != nil {
		return nil, err
	}

	// Use custom type to deserialize since the generated one is broken
	var result FixedDeleteCredentialResponse
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return nil, err
	}
	if result.DeleteCredentialByPk.Name == "" {
		// Not found
		return nil, nil
	}
	return &result, nil
}

// Insert inserts one or more credentials, returns an error if any already exists.
func (c *CredentialAccess) Insert(tenant string, inserts []CredentialInsertInput) error {
	// Ensure the inserts each have the correct tenant name
	insertsWithTenant := make([]CredentialInsertInput, 0)
	tenantg := String(tenant)
	for _, insert := range inserts {
		insert.Tenant = &tenantg
		insertsWithTenant = append(insertsWithTenant, insert)
	}

	req, err := NewCreateCredentialsRequest(c.client.Url, &CreateCredentialsVariables{Credentials: &insertsWithTenant})
	if err != nil {
		return err
	}
	c.addSecret(req.Request)

	_, err = req.Execute(c.client.Client)
	return err
}

// Update updates an existing credential, returns an error if a credential of the same tenant/name doesn't exist.
func (c *CredentialAccess) Update(tenant string, update UpdateCredentialVariables) error {
	// Ensure the update has the correct tenant name
	update.Tenant = String(tenant)

	req, err := NewUpdateCredentialRequest(c.client.Url, &update)
	if err != nil {
		return err
	}
	c.addSecret(req.Request)

	_, err = req.Execute(c.client.Client)
	return err
}

// addSecret adds the required HTTP header for talking to the Hasura graphql server.
func (c *CredentialAccess) addSecret(req *http.Request) {
	if c.graphqlSecret != "" {
		req.Header.Add("x-hasura-admin-secret", c.graphqlSecret)
	}
}
