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

func (c *ExporterAccess) List(tenant string) (*graphql.GetExportersResponse, error) {
	req, err := graphql.NewGetExportersRequest(
		c.access.URL,
		&graphql.GetExportersVariables{Tenant: graphql.String(tenant)},
	)
	if err != nil {
		return nil, err
	}

	var result graphql.GetExportersResponse
	if err := c.access.Execute(req.Request, &result); err != nil {
		return nil, err
	}
	return &result, nil
}

func (c *ExporterAccess) Get(tenant string, name string) (*graphql.GetExporterResponse, error) {
	req, err := graphql.NewGetExporterRequest(
		c.access.URL,
		&graphql.GetExporterVariables{Tenant: graphql.String(tenant), Name: graphql.String(name)},
	)
	if err != nil {
		return nil, err
	}

	var result graphql.GetExporterResponse
	if err := c.access.Execute(req.Request, &result); err != nil {
		return nil, err
	}
	if result.ExporterByPk.Name == "" {
		// Not found
		return nil, nil
	}
	return &result, nil
}

func (c *ExporterAccess) Delete(tenant string, name string) (*graphql.DeleteExporterResponse, error) {
	req, err := graphql.NewDeleteExporterRequest(
		c.access.URL,
		&graphql.DeleteExporterVariables{Tenant: graphql.String(tenant), Name: graphql.String(name)},
	)
	if err != nil {
		return nil, err
	}

	var result graphql.DeleteExporterResponse
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
