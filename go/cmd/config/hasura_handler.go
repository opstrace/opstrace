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
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"

	log "github.com/sirupsen/logrus"
	"gopkg.in/yaml.v2"

	"github.com/opstrace/opstrace/go/cmd/config/actions"
)

type HasuraHandler struct {
	rulerURL        *url.URL
	alertmanagerURL *url.URL
	expectedSecret  string
}

func NewHasuraHandler(rulerURL *url.URL, alertmanagerURL *url.URL, expectedSecret string) *HasuraHandler {
	return &HasuraHandler{
		rulerURL,
		alertmanagerURL,
		expectedSecret,
	}
}

func (h *HasuraHandler) handler(w http.ResponseWriter, r *http.Request) {
	// FIRST: Check secret header is correct - ensure this is actually Hasura sending the request
	if h.expectedSecret != "" {
		gotSecret := r.Header.Get(actionSecretHeaderName)
		if gotSecret != h.expectedSecret {
			// This implies invalid request from hasura itself, so use plain HTTP error
			writeGraphQLError(w, fmt.Sprintf("Missing or invalid %s", actionSecretHeaderName))
			return
		}
	}

	body, err := ioutil.ReadAll(r.Body)
	if err != nil {
		writeGraphQLError(w, "invalid payload")
		return
	}

	actionName, err := actions.GetActionName(body)
	if err != nil {
		// This implies invalid request from hasura itself, so use plain HTTP error
		writeGraphQLError(w, fmt.Sprintf("invalid/missing action name: %s", err.Error()))
		return
	}

	// use action name to decide how to unmarshal the input
	var data []byte
	switch actionName {
	case "getAlertmanager":
		var request actions.GetAlertmanagerPayload
		err = json.Unmarshal(body, &request)
		if err != nil {
			writeGraphQLError(w, "invalid request payload")
			return
		}

		// see https://cortexmetrics.io/docs/api/#get-alertmanager-configuration
		var response actions.Alertmanager
		resp, err := h.alertmanagerQuery(request.Input.TenantID, "GET", "/api/v1/alerts", "")
		if err != nil {
			switch {
			case resp == nil:
				// Network failure
				log.Warnf("Failed to retrieve alertmanager config for tenant %s: %s", request.Input.TenantID, err.Error())
				response = actions.Alertmanager{
					TenantID: request.Input.TenantID,
					Config:   nil,
					Online:   false,
				}
			case resp.StatusCode == 404:
				// Query succeeded, config not assigned yet
				emptyConfig := ""
				response = actions.Alertmanager{
					TenantID: request.Input.TenantID,
					Config:   &emptyConfig,
					Online:   true,
				}
			default:
				// Other HTTP error (e.g. serialization/storage error)
				log.Warnf("Error when retrieving alertmanager config for tenant %s: %s", request.Input.TenantID, err.Error())
				response = actions.Alertmanager{
					TenantID: request.Input.TenantID,
					Config:   nil,
					Online:   true,
				}
			}
		} else {
			// NOTE: Returning the full cortex content (with template_files and/or alertmanager_config fields)
			respBody, err := ioutil.ReadAll(resp.Body)
			if err != nil {
				writeGraphQLError(w, fmt.Sprintf("cortex response body failed: %s", err))
				return
			}
			respBodyStr := string(respBody)
			response = actions.Alertmanager{
				TenantID: request.Input.TenantID,
				Config:   &respBodyStr,
				Online:   true,
			}
		}

		data, err = json.Marshal(response)
		if err != nil {
			writeGraphQLError(w, fmt.Sprintf("serializing response body failed: %s", err))
			return
		}

	case "updateAlertmanager":
		var request actions.UpdateAlertmanagerPayload
		err = json.Unmarshal(body, &request)
		if err != nil {
			writeGraphQLError(w, "invalid request payload")
			return
		}

		// NOTE: Expecting the full cortex content (with template_files and/or alertmanager_config fields)
		var response actions.AlertmanagerUpdateResponse
		resp, err := h.alertmanagerQuery(request.Input.TenantID, "POST", "/api/v1/alerts", request.Input.Input.Config)
		if err != nil {
			var errType actions.ErrorType
			var errMsg string
			var errRaw string
			switch {
			case resp == nil:
				// Network failure
				errType = actions.ServiceOfflineType
				errMsg = "Alertmanager query failed"
				errRaw = err.Error()
			case resp.StatusCode == http.StatusBadRequest:
				// Query succeeded, config parsing/validation failed
				errType = actions.ValidationFailedType
				errMsg = "Alertmanager config validation failed"
				// Try to include original content returned by cortex
				errRawBytes, err := ioutil.ReadAll(resp.Body)
				if err != nil || len(errRawBytes) == 0 {
					// Give up and just give generic "cortex returned <code> response"
					errRaw = err.Error()
				} else {
					errRaw = string(errRawBytes)
				}
			default:
				// Other HTTP error (e.g. storage error)
				errType = actions.ServiceErrorType
				errMsg = "Error when updating Alertmanager config"
				// Try to include original content returned by cortex
				errRawBytes, err := ioutil.ReadAll(resp.Body)
				if err != nil || len(errRawBytes) == 0 {
					// Give up and just give generic "cortex returned <code> response"
					errRaw = err.Error()
				} else {
					errRaw = string(errRawBytes)
				}
			}
			response = actions.AlertmanagerUpdateResponse{
				Success:          false,
				ErrorType:        &errType,
				ErrorMessage:     &errMsg,
				ErrorRawResponse: &errRaw,
			}
		} else {
			response = actions.AlertmanagerUpdateResponse{
				Success: true,
			}
		}

		data, err = json.Marshal(response)
		if err != nil {
			writeGraphQLError(w, fmt.Sprintf("serializing response body failed: %s", err))
			return
		}

	case "validateCredential":
		var request actions.ValidateCredentialPayload
		err = json.Unmarshal(body, &request)
		if err != nil {
			writeGraphQLError(w, "invalid request payload")
			return
		}

		data, err = json.Marshal(h.validateCredential(request))
		if err != nil {
			writeGraphQLError(w, fmt.Sprintf("serializing response body failed: %s", err))
			return
		}

	case "validateExporter":
		var request actions.ValidateExporterPayload
		err = json.Unmarshal(body, &request)
		if err != nil {
			writeGraphQLError(w, "invalid request payload")
			return
		}

		data, err = json.Marshal(h.validateExporter(request))
		if err != nil {
			writeGraphQLError(w, fmt.Sprintf("serializing response body failed: %s", err))
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func (h *HasuraHandler) validateCredential(request actions.ValidateCredentialPayload) actions.ValidateOutput {
	existingTypes, err := listCredentialTypes(request.Input.TenantID)
	if err != nil {
		return actions.ValidateError(actions.ServiceErrorType, "listing credentials failed", err.Error())
	}

	var yamlCredential Credential
	err = yaml.UnmarshalStrict([]byte(request.Input.Content), &yamlCredential)
	if err != nil {
		return actions.ValidateError(actions.ValidationFailedType, "decoding yaml content failed", err.Error())
	}

	_, _, err = validateCredential(existingTypes, yamlCredential)
	if err != nil {
		return actions.ValidateError(actions.ValidationFailedType, "config validation failed", err.Error())
	}

	return actions.ValidateOutput{
		Success: true,
	}
}

func (h *HasuraHandler) validateExporter(request actions.ValidateExporterPayload) actions.ValidateOutput {
	existingTypes, err := listExporterTypes(request.Input.TenantID)
	if err != nil {
		return actions.ValidateError(actions.ServiceErrorType, "listing exporters failed", err.Error())
	}

	var yamlExporter Exporter
	err = yaml.UnmarshalStrict([]byte(request.Input.Content), &yamlExporter)
	if err != nil {
		return actions.ValidateError(actions.ValidationFailedType, "decoding yaml content failed", err.Error())
	}

	_, _, err = validateExporter(request.Input.TenantID, existingTypes, yamlExporter)
	if err != nil {
		return actions.ValidateError(actions.ValidationFailedType, "config validation failed", err.Error())
	}

	return actions.ValidateOutput{
		Success: true,
	}
}

func (h *HasuraHandler) alertmanagerQuery(tenant, method, path, body string) (*http.Response, error) {
	url := *h.alertmanagerURL
	url.Path = path
	req := http.Request{
		Method: method,
		URL:    &url,
		Header: map[string][]string{
			cortexTenantHeaderName: {tenant},
		},
	}
	if body != "" {
		req.Body = ioutil.NopCloser(strings.NewReader(body))
	}
	client := http.Client{
		Timeout: 10 * time.Second,
	}
	resp, err := client.Do(&req)
	if err != nil {
		return nil, fmt.Errorf("cortex query failed: %s", err)
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return resp, fmt.Errorf("cortex returned %d response", resp.StatusCode)
	}
	return resp, nil
}

func writeGraphQLError(w http.ResponseWriter, err string) {
	errorObject := actions.GraphQLError{
		Message: err,
	}
	errorBody, _ := json.Marshal(errorObject)
	w.WriteHeader(http.StatusBadRequest)
	w.Write(errorBody)
}
