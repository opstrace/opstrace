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

package opstraceauthextension

import (
	"context"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/config"
	"go.opentelemetry.io/collector/extension/extensionhelper"
)

const (
	// The value of extension "type" in configuration.
	TypeStr = "opstraceauth"
)

// NewFactory creates a factory for the OIDC Authenticator extension.
func NewFactory() component.ExtensionFactory {
	return extensionhelper.NewFactory(
		TypeStr,
		createDefaultConfig,
		createExtension)
}

func createDefaultConfig() config.Extension {
	return &Config{
		ExtensionSettings: config.NewExtensionSettings(config.NewComponentID(TypeStr)),
		TenantName:        "",
	}
}

func createExtension(
	_ context.Context,
	_ component.ExtensionCreateSettings,
	cfg config.Extension,
) (component.Extension, error) {
	return newExtension(cfg.(*Config))
}
