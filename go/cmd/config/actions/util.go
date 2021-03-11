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

import (
	"encoding/json"
)

type hasuraActionInfo struct {
	Action hasuraActionName `json:"action"`
}

type hasuraActionName struct {
	Name string `json:"name"`
}

// Extracts and returns the name of the action specified in the payload.
func GetActionName(body []byte) (string, error) {
	var actionInfo hasuraActionInfo
	err := json.Unmarshal(body, &actionInfo)
	if err != nil {
		return "", err
	}
	return actionInfo.Action.Name, nil
}

func ValidateError(t ErrorType, message string, rawResponse string) ValidateOutput {
	var messagePtr *string
	if message != "" {
		messagePtr = &message
	}
	var rawResponsePtr *string
	if rawResponse != "" {
		rawResponsePtr = &rawResponse
	}
	return ValidateOutput{
		Success:          false,
		ErrorType:        &t,
		ErrorMessage:     messagePtr,
		ErrorRawResponse: rawResponsePtr,
	}
}
