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
	"fmt"
	"log"

	"github.com/opstrace/opstrace/go/pkg/opstraceauthextension"

	// There's still a jaegerexporter in the stock/non-contrib collector
	// at "go.opentelemetry.io/collector/exporter/jaegerexporter",
	// however it hasn't had changes as recently.
	"github.com/open-telemetry/opentelemetry-collector-contrib/exporter/jaegerexporter"
	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/exporter/loggingexporter"
	"go.opentelemetry.io/collector/receiver/otlpreceiver"
	"go.opentelemetry.io/collector/service"
)

// Components returns the enabled components in our collector.
// This omits components that we don't use, and adds the opstrace authentication validator.
func Components() (component.Factories, error) {
	extensions, err := component.MakeExtensionFactoryMap(
		opstraceauthextension.NewFactory(),
	)
	if err != nil {
		return component.Factories{}, err
	}

	receivers, err := component.MakeReceiverFactoryMap(
		otlpreceiver.NewFactory(),
	)
	if err != nil {
		return component.Factories{}, err
	}

	processors, err := component.MakeProcessorFactoryMap(
	// nothing yet
	)
	if err != nil {
		return component.Factories{}, err
	}

	exporters, err := component.MakeExporterFactoryMap(
		jaegerexporter.NewFactory(),
		loggingexporter.NewFactory(), // optional, for debugging
	)
	if err != nil {
		return component.Factories{}, err
	}

	return component.Factories{
		Extensions: extensions,
		Receivers:  receivers,
		Processors: processors,
		Exporters:  exporters,
	}, nil
}

func main() {
	factories, err := Components()
	if err != nil {
		log.Fatalf("failed to build components: %v", err)
	}

	factories.Extensions[opstraceauthextension.TypeStr] = opstraceauthextension.NewFactory()

	info := component.BuildInfo{
		Command:     "otelcol-opstrace",
		Description: "OpenTelemetry Collector + Opstrace auth",
		Version:     "",
	}

	if err = runInteractive(service.CollectorSettings{BuildInfo: info, Factories: factories}); err != nil {
		log.Fatal(err)
	}
}

func runInteractive(params service.CollectorSettings) error {
	cmd := service.NewCommand(params)
	if err := cmd.Execute(); err != nil {
		return fmt.Errorf("collector server run finished with error: %w", err)
	}

	return nil
}
