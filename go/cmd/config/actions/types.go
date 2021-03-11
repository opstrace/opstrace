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

type ErrorType string

const (
	ServiceOfflineType   ErrorType = "SERVICE_OFFLINE"
	ServiceErrorType     ErrorType = "SERVICE_ERROR"
	ValidationFailedType ErrorType = "VALIDATION_FAILED"
)

type Alertmanager struct {
	TenantID string  `json:"tenant_id"`
	Config   *string `json:"config"`
	Online   bool    `json:"online"`
}

type AlertmanagerUpdateResponse struct {
	Success          bool       `json:"success"`
	ErrorType        *ErrorType `json:"error_type"`
	ErrorMessage     *string    `json:"error_message"`
	ErrorRawResponse *string    `json:"error_raw_response"`
}

type ValidateOutput struct {
	Success          bool       `json:"success"`
	ErrorType        *ErrorType `json:"error_type"`
	ErrorMessage     *string    `json:"error_message"`
	ErrorRawResponse *string    `json:"error_raw_response"`
}

type AlertmanagerInput struct {
	Config string `json:"config"`
}

type GetAlertmanagerArgs struct {
	TenantID string `json:"tenant_id"`
}

type UpdateAlertmanagerArgs struct {
	TenantID string             `json:"tenant_id"`
	Input    *AlertmanagerInput `json:"input"`
}

type ValidateCredentialArgs struct {
	TenantID string `json:"tenant_id"`
	Content  string `json:"content"`
}

type ValidateExporterArgs struct {
	TenantID string `json:"tenant_id"`
	Content  string `json:"content"`
}

type GetAlertmanagerPayload struct {
	SessionVariables map[string]interface{} `json:"session_variables"`
	Input            GetAlertmanagerArgs    `json:"input"`
}

type UpdateAlertmanagerPayload struct {
	SessionVariables map[string]interface{} `json:"session_variables"`
	Input            UpdateAlertmanagerArgs `json:"input"`
}

type ValidateCredentialPayload struct {
	SessionVariables map[string]interface{} `json:"session_variables"`
	Input            ValidateCredentialArgs `json:"input"`
}

type ValidateExporterPayload struct {
	SessionVariables map[string]interface{} `json:"session_variables"`
	Input            ValidateExporterArgs   `json:"input"`
}
