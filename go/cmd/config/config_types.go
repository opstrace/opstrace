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
)

var (
	// All supported integration types via this API.
	validIntegrationTypes = map[string]struct{}{
		"azure":       {},
		"blackbox":    {},
		"cloudwatch":  {},
		"stackdriver": {},
	}
)

type AWSCredentialValue struct {
	AwsAccessKeyID     string `json:"AWS_ACCESS_KEY_ID"`
	AwsSecretAccessKey string `json:"AWS_SECRET_ACCESS_KEY"`
}

type AzureCredentialValue struct {
	SubscriptionID string `json:"AZURE_SUBSCRIPTION_ID"`
	TenantID       string `json:"AZURE_TENANT_ID"`
	ClientID       string `json:"AZURE_CLIENT_ID"`
	ClientSecret   string `json:"AZURE_CLIENT_SECRET"`
}

// Converts an HTTP/YAML credential value for writing to GraphQL as JSON.
func convertYAMLCredValue(credName string, integrationType string, credValue interface{}) (*string, error) {
	switch integrationType {
	case "cloudwatch":
		// Expect regular object fields (not as a nested string)
		switch v := credValue.(type) {
		case map[interface{}]interface{}:
			vstrkeys, err := toStringKeys(v)
			if err != nil {
				return nil, err
			}
			json, err := convertAwsCredential(credName, integrationType, vstrkeys)
			if err != nil {
				return nil, err
			}
			jsonstr := string(json)
			return &jsonstr, nil
		default:
			return nil, errors.New("expected a map")
		}
	case "azure":
		// Expect regular object fields (not as a nested string)
		switch v := credValue.(type) {
		case map[interface{}]interface{}:
			vstrkeys, err := toStringKeys(v)
			if err != nil {
				return nil, err
			}
			json, err := convertAzureCredential(credName, integrationType, vstrkeys)
			if err != nil {
				return nil, err
			}
			jsonstr := string(json)
			return &jsonstr, nil
		default:
			return nil, errors.New("expected a map")
		}
	case "stackdriver":
		// Expect string containing a valid JSON payload
		switch v := credValue.(type) {
		case string:
			if !json.Valid([]byte(v)) {
				return nil, fmt.Errorf("%s integration '%s' credential is not a valid JSON string", integrationType, credName)
			}
			return &v, nil
		default:
			return nil, fmt.Errorf("expected %s integration '%s' credential to be a JSON string, got %s", integrationType, credName, v)
		}
	default:
		keys := make([]string, len(validIntegrationTypes))
		i := 0
		for k := range validIntegrationTypes {
			keys[i] = k
			i++
		}
		return nil, fmt.Errorf("unsupported integration type: %s (expected one of %s)", integrationType, keys)
	}
}

// Validates that a GraphQL JSON credential type and value look superficially valid.
func validateCredentialValue(integrationName string, integrationType string, credValueJSON string) error {
	switch integrationType {
	case "cloudwatch":
		// Expect JSON object payload with AWS_X keys
		var v map[string]interface{}
		err := json.Unmarshal([]byte(credValueJSON), &v)
		if err != nil {
			return fmt.Errorf("decoding %s credential '%s' JSON value failed: %s", integrationType, integrationName, err.Error())
		}
		_, err = convertAwsCredential(integrationName, integrationType, v)
		return err
	case "azure":
		// Expect JSON object payload with AZURE_X keys
		var v map[string]interface{}
		err := json.Unmarshal([]byte(credValueJSON), &v)
		if err != nil {
			return fmt.Errorf("decoding %s credential '%s' JSON value failed: %s", integrationType, integrationName, err.Error())
		}
		_, err = convertAzureCredential(integrationName, integrationType, v)
		return err
	case "stackdriver":
		// Expect valid JSON payload, but don't enforce content
		if !json.Valid([]byte(credValueJSON)) {
			return fmt.Errorf("%s credential '%s' value is not a valid JSON string", integrationType, integrationName)
		}
	default:
		keys := make([]string, len(validIntegrationTypes))
		i := 0
		for k := range validIntegrationTypes {
			keys[i] = k
			i++
		}
		return fmt.Errorf("unsupported credential type: %s (expected one of %s)", integrationType, keys)
	}
	return nil
}

func convertAwsCredential(credName string, integrationType string, v map[string]interface{}) ([]byte, error) {
	errfmt := "expected %s credential '%s' value to contain string fields: " +
		"AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (%s)"
	if len(v) != 2 {
		return nil, fmt.Errorf(errfmt, integrationType, credName, "wrong size")
	}
	keyid, keyidok := v["AWS_ACCESS_KEY_ID"]
	accesskey, accesskeyok := v["AWS_SECRET_ACCESS_KEY"]
	if !keyidok || !accesskeyok {
		return nil, fmt.Errorf(errfmt, integrationType, credName, "missing fields")
	}
	keyidstr, keyidok := keyid.(string)
	accesskeystr, accesskeyok := accesskey.(string)
	if !keyidok || !accesskeyok {
		return nil, fmt.Errorf(errfmt, integrationType, credName, "non-string fields")
	}
	json, err := json.Marshal(AWSCredentialValue{
		AwsAccessKeyID:     keyidstr,
		AwsSecretAccessKey: accesskeystr,
	})
	if err != nil {
		return nil, fmt.Errorf(errfmt, integrationType, credName, "failed to reserialize as JSON")
	}
	return json, nil
}

func convertAzureCredential(credName string, integrationType string, v map[string]interface{}) ([]byte, error) {
	errfmt := "expected %s credential '%s' value to contain string fields: " +
		"AZURE_SUBSCRIPTION_ID, AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET (%s)"
	if len(v) != 4 {
		return nil, fmt.Errorf(errfmt, integrationType, credName, "wrong size")
	}
	subid, subidok := v["AZURE_SUBSCRIPTION_ID"]
	tenantid, tenantidok := v["AZURE_TENANT_ID"]
	clientid, clientidok := v["AZURE_CLIENT_ID"]
	clientsecret, clientsecretok := v["AZURE_CLIENT_SECRET"]
	if !subidok || !tenantidok || !clientidok || !clientsecretok {
		return nil, fmt.Errorf(errfmt, integrationType, credName, "missing fields")
	}
	subidstr, subidok := subid.(string)
	tenantidstr, tenantidok := tenantid.(string)
	clientidstr, clientidok := clientid.(string)
	clientsecretstr, clientsecretok := clientsecret.(string)
	if !subidok || !tenantidok || !clientidok || !clientsecretok {
		return nil, fmt.Errorf(errfmt, integrationType, credName, "non-string fields")
	}
	json, err := json.Marshal(AzureCredentialValue{
		SubscriptionID: subidstr,
		TenantID:       tenantidstr,
		ClientID:       clientidstr,
		ClientSecret:   clientsecretstr,
	})
	if err != nil {
		return nil, fmt.Errorf(errfmt, integrationType, credName, "failed to reserialize as JSON")
	}
	return json, nil
}

// Converts an HTTP/YAML exporter config for writing to GraphQL as JSON.
func convertYAMLExporterConfig(exporterName string, exporterConfig interface{}) (*string, error) {
	switch yamlMap := exporterConfig.(type) {
	case map[interface{}]interface{}:
		// Encode the parsed YAML config tree as JSON
		convMap, err := recurseMapStringKeys(yamlMap)
		if err != nil {
			return nil, fmt.Errorf(
				"Exporter '%s' config could not be encoded as JSON: %s", exporterName, err,
			)
		}
		json, err := json.Marshal(convMap)
		if err != nil {
			return nil, fmt.Errorf(
				"Exporter '%s' config could not be encoded as JSON: %s", exporterName, err,
			)
		}
		jsonstr := string(json)
		return &jsonstr, nil
	default:
		return nil, fmt.Errorf(
			"Exporter '%s' config is invalid (must be YAML map)", exporterName,
		)
	}
}

// Converts the map to have string keys instead of interface keys.
func toStringKeys(in map[interface{}]interface{}) (map[string]interface{}, error) {
	strMap := make(map[string]interface{})
	for k, v := range in {
		switch kType := k.(type) {
		case string:
			strMap[kType] = v
		default:
			return nil, errors.New("map is invalid (keys must be strings)")
		}
	}
	return strMap, nil
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
