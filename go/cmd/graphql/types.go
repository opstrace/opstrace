// Copyright 2019-2021 Opstrace, Inc.
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

	"github.com/opstrace/opstrace/go/pkg/graphql"
)

var (
	// All supported credential types.
	validCredentialTypes = map[string]struct{}{
		"aws-key":             {},
		"gcp-service-account": {},
	}
	// All supported exporter types, and the credential types that they may be paired with.
	validExporterCredentials = map[string][]string{
		"cloudwatch":  {"aws-key"},
		"stackdriver": {"gcp-service-account"},
	}
)

// Accepts and validates a credential YAML value for writing to graphql as JSON.
func convertCredValue(credName string, credType string, credValue interface{}) (*graphql.Json, error) {
	switch credType {
	case "aws-key":
		// Expect regular YAML fields (not as a nested string)
		errfmt := "expected %s credential '%s' value to contain YAML string fields: " +
			"AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (%s)"
		switch v := credValue.(type) {
		case map[interface{}]interface{}:
			if len(v) != 2 {
				return nil, fmt.Errorf(errfmt, credType, credName, "wrong size")
			}
			key, keyok := v["AWS_ACCESS_KEY_ID"]
			val, valok := v["AWS_SECRET_ACCESS_KEY"]
			if len(v) != 2 || !keyok || !valok {
				return nil, fmt.Errorf(errfmt, credType, credName, "missing fields")
			}
			keystr, keyok := key.(string)
			valstr, valok := val.(string)
			if !keyok || !valok {
				return nil, fmt.Errorf(errfmt, credType, credName, "non-string fields")
			}
			json, err := json.Marshal(AWSCredentialValue{
				AwsAccessKeyID:     keystr,
				AwsSecretAccessKey: valstr,
			})
			if err != nil {
				return nil, fmt.Errorf(errfmt, credType, credName, "failed to reserialize as JSON")
			}
			gjson := graphql.Json(json)
			return &gjson, nil
		default:
			return nil, fmt.Errorf(errfmt, credType, credName, "expected a map")
		}
	case "gcp-service-account":
		// Expect string containing a valid JSON payload
		switch v := credValue.(type) {
		case string:
			if !json.Valid([]byte(v)) {
				return nil, fmt.Errorf("%s credential '%s' value is not a valid JSON string", credType, credName)
			}
			gjson := graphql.Json(v)
			return &gjson, nil
		default:
			return nil, fmt.Errorf("expected %s credential '%s' value to be a JSON string", credType, credName)
		}
	default:
		keys := make([]string, len(validCredentialTypes))
		i := 0
		for k := range validCredentialTypes {
			keys[i] = k
			i++
		}
		return nil, fmt.Errorf("unsupported credential type: %s (expected one of %s)", credType, keys)
	}
}

// Validates that the exporter type is compatible with the associated credential type (if any).
func validateExporterTypes(exporterType string, credType *string) error {
	// Validate exporter type is supported
	validCredTypes, ok := validExporterCredentials[exporterType]
	if !ok {
		keys := make([]string, len(validExporterCredentials))
		i := 0
		for k := range validExporterCredentials {
			keys[i] = k
			i++
		}
		return fmt.Errorf("unsupported exporter type %s, expected one of: %s", exporterType, keys)
	}
	if credType == nil {
		return nil
	}

	// Validate cred type is compatible with exporter type
	for _, validCredType := range validCredTypes {
		if *credType == validCredType {
			return nil
		}
	}
	return fmt.Errorf(
		"incompatible exporter type %s with credential type %s (expected one of credential types: %s)",
		exporterType, *credType, validCredTypes,
	)
}
