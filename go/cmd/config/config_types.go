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
	// All supported credential types.
	validCredentialTypes = map[string]struct{}{
		"aws-key":             {},
		"gcp-service-account": {},
	}
	// All supported exporter types, and the credential types that they may be paired with.
	validExporterCredentials = map[string][]string{
		"blackbox": {},
		"cloudwatch":  {"aws-key"},
		"stackdriver": {"gcp-service-account"},
	}
)

type AWSCredentialValue struct {
	AwsAccessKeyID     string `json:"AWS_ACCESS_KEY_ID"`
	AwsSecretAccessKey string `json:"AWS_SECRET_ACCESS_KEY"`
}

// Converts an HTTP/YAML credential value for writing to GraphQL as JSON.
func convertYAMLCredValue(credName string, credType string, credValue interface{}) (*string, error) {
	switch credType {
	case "aws-key":
		// Expect regular object fields (not as a nested string)
		errfmt := "expected %s credential '%s' value to contain string fields: " +
			"AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (%s)"
		switch v := credValue.(type) {
		case map[interface{}]interface{}:
			if len(v) != 2 {
				return nil, fmt.Errorf(errfmt, credType, credName, "wrong size")
			}
			keyid, keyidok := v["AWS_ACCESS_KEY_ID"]
			accesskey, accesskeyok := v["AWS_SECRET_ACCESS_KEY"]
			if !keyidok || !accesskeyok {
				return nil, fmt.Errorf(errfmt, credType, credName, "missing fields")
			}
			keyidstr, keyidok := keyid.(string)
			accesskeystr, accesskeyok := accesskey.(string)
			if !keyidok || !accesskeyok {
				return nil, fmt.Errorf(errfmt, credType, credName, "non-string fields")
			}
			json, err := json.Marshal(AWSCredentialValue{
				AwsAccessKeyID:     keyidstr,
				AwsSecretAccessKey: accesskeystr,
			})
			if err != nil {
				return nil, fmt.Errorf(errfmt, credType, credName, "failed to reserialize as JSON")
			}
			jsonstr := string(json)
			return &jsonstr, nil
		default:
			return nil, fmt.Errorf(errfmt, credType, credName, fmt.Sprintf("expected a map, got %s", v))
		}
	case "gcp-service-account":
		// Expect string containing a valid JSON payload
		switch v := credValue.(type) {
		case string:
			if !json.Valid([]byte(v)) {
				return nil, fmt.Errorf("%s credential '%s' value is not a valid JSON string", credType, credName)
			}
			return &v, nil
		default:
			return nil, fmt.Errorf("expected %s credential '%s' value to be a JSON string, got %s", credType, credName, v)
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

// Validates that a GraphQL JSON credential type and value look superficially valid.
func validateCredentialValue(credName string, credType string, credValueJSON string) error {
	switch credType {
	case "aws-key":
		// Expect JSON payload containing expected key pair
		errfmt := "expected %s credential '%s' value to contain string fields: " +
			"AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (%s)"

		// Manually decode into map so that we can e.g. check for unknown values
		var v map[string]interface{}
		err := json.Unmarshal([]byte(credValueJSON), &v)
		if err != nil {
			return fmt.Errorf("decoding %s credential '%s' JSON value failed: %s", credType, credName, err.Error())
		}
		if len(v) != 2 {
			return fmt.Errorf(errfmt, credType, credName, "wrong size")
		}
		keyid, keyidok := v["AWS_ACCESS_KEY_ID"]
		accesskey, accesskeyok := v["AWS_SECRET_ACCESS_KEY"]
		if !keyidok || !accesskeyok {
			return fmt.Errorf(errfmt, credType, credName, "missing fields")
		}
		_, keyidok = keyid.(string)
		_, accesskeyok = accesskey.(string)
		if !keyidok || !accesskeyok {
			return fmt.Errorf(errfmt, credType, credName, "non-string fields")
		}
	case "gcp-service-account":
		// Expect valid JSON payload, but don't enforce content
		if !json.Valid([]byte(credValueJSON)) {
			return fmt.Errorf("%s credential '%s' value is not a valid JSON string", credType, credName)
		}
	default:
		keys := make([]string, len(validCredentialTypes))
		i := 0
		for k := range validCredentialTypes {
			keys[i] = k
			i++
		}
		return fmt.Errorf("unsupported credential type: %s (expected one of %s)", credType, keys)
	}
	return nil
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

// Validates that a GraphQL JSON exporter type and credential type are valid and compatible.
func validateExporterTypes(exporterType string, credType *string) error {
	// Validate exporter type is known/supported
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
		// No credential provided with exporter, skip credential lookup
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
