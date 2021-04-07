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
	"fmt"
	"io/ioutil"
	"net/http"
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

func ToUpdateResponse(objectType string, httpresp *http.Response, err error) StatusResponse {
	if err == nil {
		return StatusResponse{
			Success: true,
		}
	}

	var errType ErrorType
	var errMsg string
	var errRaw string
	switch {
	case httpresp == nil:
		// Network failure
		errType = ServiceOfflineType
		errMsg = fmt.Sprintf("%s update query failed", objectType)
		errRaw = err.Error()
	case httpresp.StatusCode == http.StatusBadRequest:
		// Query succeeded, config parsing/validation failed
		errType = ValidationFailedType
		errMsg = fmt.Sprintf("%s validation failed", objectType)
		// Try to include original content returned by cortex
		errRawBytes, err := ioutil.ReadAll(httpresp.Body)
		if err != nil || len(errRawBytes) == 0 {
			// Give up and just give generic "cortex returned <code> response"
			errRaw = err.Error()
		} else {
			errRaw = string(errRawBytes)
		}
	default:
		// Other HTTP error (e.g. storage error)
		errType = ServiceErrorType
		errMsg = fmt.Sprintf("Error when updating %s", objectType)
		// Try to include original content returned by cortex
		errRawBytes, err := ioutil.ReadAll(httpresp.Body)
		if err != nil || len(errRawBytes) == 0 {
			// Give up and just give generic "cortex returned <code> response"
			errRaw = err.Error()
		} else {
			errRaw = string(errRawBytes)
		}
	}
	return StatusResponse{
		Success:          false,
		ErrorType:        &errType,
		ErrorMessage:     &errMsg,
		ErrorRawResponse: &errRaw,
	}
}

func ToDeleteResponse(objectType string, httpresp *http.Response, err error) StatusResponse {
	if err == nil {
		return StatusResponse{
			Success: true,
		}
	}

	var errType ErrorType
	var errMsg string
	var errRaw string
	switch {
	case httpresp == nil:
		// Network failure
		errType = ServiceOfflineType
		errMsg = fmt.Sprintf("%s delete query failed", objectType)
		errRaw = err.Error()
	case httpresp.StatusCode == http.StatusNotFound:
		// Item to delete was not found, but lets treat this as a success.
		return StatusResponse{
			Success: true,
		}
	default:
		// Other HTTP error (e.g. storage error)
		errType = ServiceErrorType
		errMsg = fmt.Sprintf("Error when deleting %s", objectType)
		// Try to include original content returned by cortex
		errRawBytes, err := ioutil.ReadAll(httpresp.Body)
		if err != nil || len(errRawBytes) == 0 {
			// Give up and just give generic "cortex returned <code> response"
			errRaw = err.Error()
		} else {
			errRaw = string(errRawBytes)
		}
	}
	return StatusResponse{
		Success:          false,
		ErrorType:        &errType,
		ErrorMessage:     &errMsg,
		ErrorRawResponse: &errRaw,
	}
}

func ToValidateError(t ErrorType, message string, rawResponse string) StatusResponse {
	var messagePtr *string
	if message != "" {
		messagePtr = &message
	}
	var rawResponsePtr *string
	if rawResponse != "" {
		rawResponsePtr = &rawResponse
	}
	return StatusResponse{
		Success:          false,
		ErrorType:        &t,
		ErrorMessage:     messagePtr,
		ErrorRawResponse: rawResponsePtr,
	}
}
