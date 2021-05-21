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

	"github.com/opstrace/opstrace/go/cmd/config/actions"
)

type HasuraHandler struct {
	alertmanagerURL *url.URL
	expectedSecret  string
	api             *integrationAPI
}

func NewHasuraHandler(
	alertmanagerURL *url.URL,
	expectedSecret string,
	api *integrationAPI,
) *HasuraHandler {
	return &HasuraHandler{
		alertmanagerURL,
		expectedSecret,
		api,
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

	reqbody, err := ioutil.ReadAll(r.Body)
	if err != nil {
		writeGraphQLError(w, "invalid payload")
		return
	}

	actionName, err := actions.GetActionName(reqbody)
	if err != nil {
		// This implies invalid request from hasura itself, so use plain HTTP error
		writeGraphQLError(w, fmt.Sprintf("invalid/missing action name: %s", err.Error()))
		return
	}

	// use action name to decide how to unmarshal the input
	var response interface{}
	switch actionName {
	case "getAlertmanager":
		var request actions.GetAlertmanagerPayload
		err = json.Unmarshal(reqbody, &request)
		if err != nil {
			writeGraphQLError(w, "invalid request payload")
			return
		}

		// see https://cortexmetrics.io/docs/api/#get-alertmanager-configuration
		httpresp, err := h.cortexQuery(request.Input.TenantID, "GET", "/api/v1/alerts", "")
		response, err = toGetAlertmanagerResponse(request.Input.TenantID, httpresp, err)
		if err != nil {
			writeGraphQLError(w, err.Error())
			return
		}

	case "updateAlertmanager":
		var request actions.UpdateAlertmanagerPayload
		err = json.Unmarshal(reqbody, &request)
		if err != nil {
			writeGraphQLError(w, "invalid request payload")
			return
		}

		if request.Input.Input == nil {
			httpresp, err := h.cortexQuery(request.Input.TenantID, "DELETE", "/api/v1/alerts", "")
			response = actions.ToDeleteResponse("Alertmanager config", httpresp, err)
		} else {
			httpresp, err := h.cortexQuery(request.Input.TenantID, "POST", "/api/v1/alerts", request.Input.Input.Config)
			response = actions.ToUpdateResponse("Alertmanager config", httpresp, err)
		}

	case "listRules":
		var request actions.ListRulesPayload
		err = json.Unmarshal(reqbody, &request)
		if err != nil {
			writeGraphQLError(w, "invalid request payload")
			return
		}

		httpresp, err := h.cortexQuery(request.Input.TenantID, "GET", "/api/v1/rules", "")
		response, err = toListRulesResponse(request.Input.TenantID, httpresp, err)
		if err != nil {
			writeGraphQLError(w, err.Error())
			return
		}

	case "getRuleGroup":
		var request actions.GetRuleGroupPayload
		err = json.Unmarshal(reqbody, &request)
		if err != nil {
			writeGraphQLError(w, "invalid request payload")
			return
		}

		path := fmt.Sprintf("/api/v1/rules/%s/%s", request.Input.Namespace, request.Input.RuleGroupName)
		httpresp, err := h.cortexQuery(request.Input.TenantID, "GET", path, "")
		response, err = toGetRuleGroupResponse(
			request.Input.TenantID,
			request.Input.Namespace,
			request.Input.RuleGroupName,
			httpresp,
			err,
		)
		if err != nil {
			writeGraphQLError(w, err.Error())
			return
		}

	case "updateRuleGroup":
		var request actions.UpdateRuleGroupPayload
		err = json.Unmarshal(reqbody, &request)
		if err != nil {
			writeGraphQLError(w, "invalid request payload")
			return
		}

		path := fmt.Sprintf("/api/v1/rules/%s", request.Input.Namespace)
		httpresp, err := h.cortexQuery(request.Input.TenantID, "POST", path, request.Input.RuleGroup.RuleGroup)
		response = actions.ToUpdateResponse("Rule group", httpresp, err)

	case "deleteRuleGroup":
		var request actions.DeleteRuleGroupPayload
		err = json.Unmarshal(reqbody, &request)
		if err != nil {
			writeGraphQLError(w, "invalid request payload")
			return
		}

		path := fmt.Sprintf("/api/v1/rules/%s/%s", request.Input.Namespace, request.Input.RuleGroupName)
		httpresp, err := h.cortexQuery(request.Input.TenantID, "DELETE", path, "")
		response = actions.ToDeleteResponse("Rule group", httpresp, err)

	case "validateIntegration":
		var request actions.ValidateIntegrationPayload
		err = json.Unmarshal(reqbody, &request)
		if err != nil {
			writeGraphQLError(w, "invalid request payload")
			return
		}

		response = h.validateIntegration(request)
	}

	data, err := json.Marshal(response)
	if err != nil {
		writeGraphQLError(w, fmt.Sprintf("serializing response body failed: %s", err))
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func toGetAlertmanagerResponse(tenantID string, httpresp *http.Response, err error) (*actions.Alertmanager, error) {
	if err != nil {
		switch {
		case httpresp == nil:
			// Network failure
			log.Warnf("Failed to retrieve alertmanager config for tenant %s: %s", tenantID, err.Error())
			return &actions.Alertmanager{
				TenantID: tenantID,
				Config:   nil,
				Online:   false,
			}, nil
		case httpresp.StatusCode == http.StatusNotFound:
			// Query succeeded, config not assigned yet
			emptyConfig := ""
			return &actions.Alertmanager{
				TenantID: tenantID,
				Config:   &emptyConfig,
				Online:   true,
			}, nil
		default:
			// Other HTTP error (e.g. serialization/storage error)
			log.Warnf("Error when retrieving alertmanager config for tenant %s: %s", tenantID, err.Error())
			return &actions.Alertmanager{
				TenantID: tenantID,
				Config:   nil,
				Online:   true,
			}, nil
		}
	} else {
		// NOTE: Returning the full cortex content (with template_files and/or alertmanager_config fields)
		respBody, err := ioutil.ReadAll(httpresp.Body)
		if err != nil {
			return nil, fmt.Errorf("cortex response body failed: %s", err)
		}
		respBodyStr := string(respBody)
		return &actions.Alertmanager{
			TenantID: tenantID,
			Config:   &respBodyStr,
			Online:   true,
		}, nil
	}
}

func toListRulesResponse(tenantID string, httpresp *http.Response, err error) (*actions.Rules, error) {
	if err != nil {
		switch {
		case httpresp == nil:
			// Network failure
			log.Warnf("Failed to retrieve rules for tenant %s: %s", tenantID, err.Error())
			return &actions.Rules{
				TenantID: tenantID,
				Rules:    nil,
				Online:   false,
			}, nil
		case httpresp.StatusCode == http.StatusNotFound:
			// Query succeeded, rules not assigned yet (TODO recheck if this is how no-rules response behaves?)
			emptyConfig := ""
			return &actions.Rules{
				TenantID: tenantID,
				Rules:    &emptyConfig,
				Online:   true,
			}, nil
		default:
			// Other HTTP error (e.g. serialization/storage error)
			log.Warnf("Error when retrieving rules for tenant %s: %s", tenantID, err.Error())
			return &actions.Rules{
				TenantID: tenantID,
				Rules:    nil,
				Online:   true,
			}, nil
		}
	} else {
		respBody, err := ioutil.ReadAll(httpresp.Body)
		if err != nil {
			return nil, fmt.Errorf("cortex response body failed: %s", err)
		}
		respBodyStr := string(respBody)
		return &actions.Rules{
			TenantID: tenantID,
			Rules:    &respBodyStr,
			Online:   true,
		}, nil
	}
}

func toGetRuleGroupResponse(
	tenantID string,
	namespace string,
	ruleGroupName string,
	httpresp *http.Response,
	err error,
) (*actions.RuleGroup, error) {
	if err != nil {
		switch {
		case httpresp == nil:
			// Network failure
			log.Warnf(
				"Failed to retrieve rule group %s/%s for tenant %s: %s",
				namespace,
				ruleGroupName,
				tenantID,
				err.Error(),
			)
			return &actions.RuleGroup{
				TenantID:      tenantID,
				Namespace:     namespace,
				RuleGroupName: ruleGroupName,
				RuleGroup:     nil,
				Online:        false,
			}, nil
		case httpresp.StatusCode == http.StatusNotFound:
			// Query succeeded, rule group not assigned yet
			emptyConfig := ""
			return &actions.RuleGroup{
				TenantID:      tenantID,
				Namespace:     namespace,
				RuleGroupName: ruleGroupName,
				RuleGroup:     &emptyConfig,
				Online:        true,
			}, nil
		default:
			// Other HTTP error (e.g. serialization/storage error)
			log.Warnf(
				"Error when retrieving rule group %s/%s for tenant %s: %s",
				namespace,
				ruleGroupName,
				tenantID,
				err.Error(),
			)
			return &actions.RuleGroup{
				TenantID:      tenantID,
				Namespace:     namespace,
				RuleGroupName: ruleGroupName,
				RuleGroup:     nil,
				Online:        true,
			}, nil
		}
	} else {
		respBody, err := ioutil.ReadAll(httpresp.Body)
		if err != nil {
			return nil, fmt.Errorf("cortex response body failed: %s", err)
		}
		respBodyStr := string(respBody)
		return &actions.RuleGroup{
			TenantID:      tenantID,
			Namespace:     namespace,
			RuleGroupName: ruleGroupName,
			RuleGroup:     &respBodyStr,
			Online:        true,
		}, nil
	}
}

func (h *HasuraHandler) validateIntegration(request actions.ValidateIntegrationPayload) actions.StatusResponse {
	existingKinds, err := h.api.listIntegrationKinds(request.Input.TenantID)
	if err != nil {
		return actions.ToValidateError(actions.ServiceErrorType, "listing integrations failed", err.Error())
	}

	// Combine the graphql fields into a Credential object for validation
	credential := Integration{
		Name:     request.Input.Name,
		Kind:     request.Input.Kind,
		DataJSON: request.Input.Data,
	}

	_, err = h.api.validateIntegration(existingKinds, credential)
	if err != nil {
		return actions.ToValidateError(actions.ValidationFailedType, "integration validation failed", err.Error())
	}

	return actions.StatusResponse{
		Success: true,
	}
}

func (h *HasuraHandler) cortexQuery(tenant, method, path, body string) (*http.Response, error) {
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
