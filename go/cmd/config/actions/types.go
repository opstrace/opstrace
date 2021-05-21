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

package actions

type GraphQLError struct {
	Message string `json:"message"`
}

// Common types.

type ErrorType string

const (
	ServiceOfflineType   ErrorType = "SERVICE_OFFLINE"
	ServiceErrorType     ErrorType = "SERVICE_ERROR"
	ValidationFailedType ErrorType = "VALIDATION_FAILED"
)

type StatusResponse struct {
	Success          bool       `json:"success"`
	ErrorType        *ErrorType `json:"error_type"`
	ErrorMessage     *string    `json:"error_message"`
	ErrorRawResponse *string    `json:"error_raw_response"`
}

// Alertmanager types.

type GetAlertmanagerArgs struct {
	TenantID string `json:"tenant_id"`
}

type GetAlertmanagerPayload struct {
	SessionVariables map[string]interface{} `json:"session_variables"`
	Input            GetAlertmanagerArgs    `json:"input"`
}

type UpdateAlertmanagerArgs struct {
	TenantID string             `json:"tenant_id"`
	Input    *AlertmanagerInput `json:"input"`
}

type UpdateAlertmanagerPayload struct {
	SessionVariables map[string]interface{} `json:"session_variables"`
	Input            UpdateAlertmanagerArgs `json:"input"`
}

type Alertmanager struct {
	TenantID string  `json:"tenant_id"`
	Config   *string `json:"config"`
	Online   bool    `json:"online"`
}

type AlertmanagerInput struct {
	Config string `json:"config"`
}

// Rules types.

type ListRulesArgs struct {
	TenantID string `json:"tenant_id"`
}

type GetRuleGroupArgs struct {
	TenantID      string `json:"tenant_id"`
	Namespace     string `json:"namespace"`
	RuleGroupName string `json:"rule_group_name"`
}

type UpdateRuleGroupArgs struct {
	TenantID  string         `json:"tenant_id"`
	Namespace string         `json:"namespace"`
	RuleGroup RuleGroupInput `json:"rule_group"`
}

type DeleteRuleGroupArgs struct {
	TenantID      string `json:"tenant_id"`
	Namespace     string `json:"namespace"`
	RuleGroupName string `json:"rule_group_name"`
}

type ListRulesPayload struct {
	SessionVariables map[string]interface{} `json:"session_variables"`
	Input            ListRulesArgs          `json:"input"`
}

type GetRuleGroupPayload struct {
	SessionVariables map[string]interface{} `json:"session_variables"`
	Input            GetRuleGroupArgs       `json:"input"`
}

type UpdateRuleGroupPayload struct {
	SessionVariables map[string]interface{} `json:"session_variables"`
	Input            UpdateRuleGroupArgs    `json:"input"`
}

type DeleteRuleGroupPayload struct {
	SessionVariables map[string]interface{} `json:"session_variables"`
	Input            DeleteRuleGroupArgs    `json:"input"`
}

type Rules struct {
	TenantID string  `json:"tenant_id"`
	Rules    *string `json:"rules"`
	Online   bool    `json:"online"`
}

type RuleGroup struct {
	TenantID      string  `json:"tenant_id"`
	Namespace     string  `json:"namespace"`
	RuleGroupName string  `json:"rule_group_name"`
	RuleGroup     *string `json:"rule_group"`
	Online        bool    `json:"online"`
}

type RuleGroupInput struct {
	RuleGroup string `json:"rule_group"`
}

// Integration types.

type ValidateIntegrationArgs struct {
	TenantID string `json:"tenant_id"`
	Name     string `json:"name"`
	Kind     string `json:"kind"`
	Data     string `json:"data"`
}

type ValidateIntegrationPayload struct {
	SessionVariables map[string]interface{}  `json:"session_variables"`
	Input            ValidateIntegrationArgs `json:"input"`
}
