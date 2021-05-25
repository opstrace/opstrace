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

package config

import (
	"net/url"

	"github.com/opstrace/opstrace/go/pkg/graphql"
)

type IntegrationAccess struct {
	access *graphql.GraphqlAccess
}

func NewIntegrationAccess(graphqlURL *url.URL, graphqlSecret string) IntegrationAccess {
	return IntegrationAccess{
		graphql.NewGraphqlAccess(graphqlURL, graphqlSecret),
	}
}

func (c *IntegrationAccess) List(tenantId string) (*graphql.GetIntegrationsResponse, error) {
	req, err := graphql.NewGetIntegrationsRequest(
		c.access.URL,
		&graphql.GetIntegrationsVariables{TenantId: graphql.UUID(tenantId)},
	)
	if err != nil {
		return nil, err
	}

	var result graphql.GetIntegrationsResponse
	if err := c.access.Execute(req.Request, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *IntegrationAccess) Get(tenantId string, name string) (*graphql.GetIntegrationResponse, error) {
	req, err := graphql.NewGetIntegrationRequest(
		c.access.URL,
		&graphql.GetIntegrationVariables{TenantId: graphql.UUID(tenantId), Name: graphql.String(name)},
	)
	if err != nil {
		return nil, err
	}

	var result graphql.GetIntegrationResponse
	if err := c.access.Execute(req.Request, &result); err != nil {
		return nil, err
	}
	if len(result.Integration) != 1 {
		// Not found
		return nil, nil
	}
	return &result, nil
}

func (c *IntegrationAccess) Delete(tenantId string, integrationId string) (*graphql.DeleteIntegrationResponse, error) {
	req, err := graphql.NewDeleteIntegrationRequest(
		c.access.URL,
		&graphql.DeleteIntegrationVariables{TenantId: graphql.UUID(tenantId), ID: graphql.UUID(integrationId)},
	)
	if err != nil {
		return nil, err
	}

	// Use custom type to deserialize since the generated one is broken
	var result graphql.DeleteIntegrationResponse
	if err := c.access.Execute(req.Request, &result); err != nil {
		return nil, err
	}
	if len(result.DeleteIntegration.Returning) != 1 {
		// Not found
		return nil, nil
	}
	return &result, nil
}

// Insert inserts one or more integrations, returns an error if any already exists.
func (c *IntegrationAccess) Insert(tenantId string, inserts []graphql.IntegrationInsertInput) error {
	// Ensure the inserts each have the correct tenant name
	gtenantId := graphql.UUID(tenantId)
	insertsWithTenant := make([]graphql.IntegrationInsertInput, 0)
	for _, insert := range inserts {
		insert.TenantId = &gtenantId
		insertsWithTenant = append(insertsWithTenant, insert)
	}

	req, err := graphql.NewInsertIntegrationsRequest(
		c.access.URL,
		&graphql.InsertIntegrationsVariables{Integrations: &insertsWithTenant},
	)
	if err != nil {
		return err
	}

	var result graphql.InsertIntegrationsResponse
	return c.access.Execute(req.Request, &result)
}

// UpdateData updates an existing integration's configuration data.
// Returns an error if an integration of the same ID doesn't exist.
func (c *IntegrationAccess) UpdateData(integrationId string, data string) error {
	update := graphql.UpdateIntegrationDataVariables{
		ID: graphql.UUID(integrationId),
		Data: graphql.Jsonb(data),
	}
	req, err := graphql.NewUpdateIntegrationDataRequest(c.access.URL, &update)
	if err != nil {
		return err
	}

	var result graphql.UpdateIntegrationDataResponse
	return c.access.Execute(req.Request, &result)
}

// UpdateName updates an existing integration's user-facing name.
// Returns an error if an integration of the same ID doesn't exist.
func (c *IntegrationAccess) UpdateName(integrationId string, name string) error {
	update := graphql.UpdateIntegrationNameVariables{
		ID: graphql.UUID(integrationId),
		Name: graphql.String(name),
	}
	req, err := graphql.NewUpdateIntegrationNameRequest(c.access.URL, &update)
	if err != nil {
		return err
	}

	var result graphql.UpdateIntegrationNameResponse
	return c.access.Execute(req.Request, &result)
}
