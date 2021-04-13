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
	"fmt"
	"regexp"
)

// Maximum length is 63 characters, leave some room in the name for 'credential-' (11 chars) or 'exporter-' (8 chars).
const maxNameLength = (63 - 11)

// Validate that the name is a valid DNS RFC1123 label, as required by K8s for object names.
// See also: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#dns-label-names
var namePattern = regexp.MustCompile("^[a-z0-9]+(-[a-z0-9]+)*$")

// Check that the provided Credential or Exporter name is safe for the K8s objects that will contain the name.
func ValidateName(name string) error {
	if len(name) > maxNameLength {
		return fmt.Errorf(
			"name '%s' is %d characters, must be at most %d characters", name, len(name), maxNameLength,
		)
	}
	if !namePattern.Match([]byte(name)) {
		return fmt.Errorf(
			"name '%s' is invalid: must contain only lowercase letters, numbers, and '-' (regex: %s)",
			name,
			namePattern.String(),
		)
	}
	return nil
}
