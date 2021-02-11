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

type ExporterAccess struct {
	access *graphql.GraphqlAccess
}

func NewExporterAccess(graphqlURL *url.URL, graphqlSecret string) ExporterAccess {
	return ExporterAccess{
		graphql.NewGraphqlAccess(graphqlURL, graphqlSecret),
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

func (c *ExporterAccess) List(tenant string) (*FixedGetExportersResponse, error) {
	req, err := graphql.NewGetExportersRequest(
		c.access.URL,
		&graphql.GetExportersVariables{Tenant: graphql.String(tenant)},
	)
	if err != nil {
		return nil, err
	}

	var result FixedGetExportersResponse
	if err := c.access.Execute(req.Request, &result); err != nil {
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

func (c *ExporterAccess) Get(tenant string, name string) (*FixedGetExporterResponse, error) {
	req, err := graphql.NewGetExporterRequest(
		c.access.URL,
		&graphql.GetExporterVariables{Tenant: graphql.String(tenant), Name: graphql.String(name)},
	)
	if err != nil {
		return nil, err
	}

	var result FixedGetExporterResponse
	if err := c.access.Execute(req.Request, &result); err != nil {
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

func (c *ExporterAccess) Delete(tenant string, name string) (*FixedDeleteExporterResponse, error) {
	req, err := graphql.NewDeleteExporterRequest(
		c.access.URL,
		&graphql.DeleteExporterVariables{Tenant: graphql.String(tenant), Name: graphql.String(name)},
	)
	if err != nil {
		return nil, err
	}

	var result FixedDeleteExporterResponse
	if err := c.access.Execute(req.Request, &result); err != nil {
		return nil, err
	}
	if result.DeleteExporterByPk.Name == "" {
		// Not found
		return nil, nil
	}
	return &result, nil
}

// Insert inserts one or more exporters, returns an error if any already exists.
func (c *ExporterAccess) Insert(tenant string, inserts []graphql.ExporterInsertInput) error {
	// Ensure the inserts each have the correct tenant name
	gtenant := graphql.String(tenant)
	insertsWithTenant := make([]graphql.ExporterInsertInput, 0)
	for _, insert := range inserts {
		insert.Tenant = &gtenant
		insertsWithTenant = append(insertsWithTenant, insert)
	}

	req, err := graphql.NewCreateExportersRequest(
		c.access.URL,
		&graphql.CreateExportersVariables{Exporters: &insertsWithTenant},
	)
	if err != nil {
		return err
	}

	var result graphql.CreateExportersResponse
	return c.access.Execute(req.Request, &result)
}

// Update updates an existing exporter, returns an error if a exporter of the same tenant/name doesn't exist.
func (c *ExporterAccess) Update(tenant string, update graphql.UpdateExporterVariables) error {
	// Ensure the update has the correct tenant name
	update.Tenant = graphql.String(tenant)

	req, err := graphql.NewUpdateExporterRequest(c.access.URL, &update)
	if err != nil {
		return err
	}

	var result graphql.UpdateExporterResponse
	return c.access.Execute(req.Request, &result)
}
