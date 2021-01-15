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

//nolint: gosec
package ddapi

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"testing"

	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func getPushURL(c testcontainers.Container, ctx context.Context) string {
	ip, err := c.Host(ctx)
	if err != nil {
		log.Fatal(err)
	}

	port, err := c.MappedPort(ctx, "33333")
	if err != nil {
		log.Fatal(err)
	}

	return fmt.Sprintf("http://%s:%s/api/v1/push", ip, port.Port())
}

func TestSimpleInsert(t *testing.T) {
	ctx := context.Background()

	dir, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	req := testcontainers.ContainerRequest{
		Image:        "cortexproject/cortex:v1.6.0",
		ExposedPorts: []string{"33333/tcp"},
		WaitingFor:   wait.ForHTTP("/ready").WithPort("33333/tcp"),
		BindMounts:   map[string]string{dir + "/test-resources/cortex-dev-cfg.yaml": "/cortex-config.yaml"},
		Cmd:          []string{"exec", "./cortex", "-config.file=/cortex-config.yaml"},
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})
	if err != nil {
		t.Error(err)
	}
	defer container.Terminate(ctx)

	pushURL := getPushURL(container, ctx)

	resp, _ := http.Get(pushURL)
	// Expect 405, method not allowed
	assert.Equal(t, resp.StatusCode, 405)
}
