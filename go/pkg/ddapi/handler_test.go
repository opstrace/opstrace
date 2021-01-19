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
	"io"
	"io/ioutil"
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

	// Assume that this is the directory that this package resides in.
	// That's true at least when clicking `run test` in vs code :P
	testdir, err := os.Getwd()
	if err != nil {
		log.Fatal(err)
	}

	//  It is the caller's responsibility to remove the directory when no
	//  longer needed.
	tempdir, err := ioutil.TempDir("/tmp", "opstrace-go-unit-tests")
	if err != nil {
		log.Fatal(err)
	}

	// Copy that file into /tmp so that it can be shared across containers,
	// and so that the bindMount source is valid _on the host_, too.
	cortexCfgSourcePath := testdir + "/test-resources/cortex-dev-cfg.yaml"
	cortexCfgHostPath := tempdir + "/cortex-dev-cfg.yaml"
	simpleFileCopy(cortexCfgSourcePath, cortexCfgHostPath)

	req := testcontainers.ContainerRequest{
		Image:        "cortexproject/cortex:v1.6.0",
		ExposedPorts: []string{"33333/tcp"},
		WaitingFor:   wait.ForHTTP("/ready").WithPort("33333/tcp"),
		BindMounts:   map[string]string{cortexCfgHostPath: "/cortex-config.yaml"},
		Cmd:          []string{"exec", "./cortex", "-config.file=/cortex-config.yaml"},
		// Attempt to work around
		// creating reaper failed: could not start container: dial tcp: i/o timeout
		// see #257
		// SkipReaper: true,
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

// Copy the src file to dst. Any existing file will be overwritten and will not
// copy file attributes. https://stackoverflow.com/a/21061062/145400
func simpleFileCopy(src, dst string) error {
	in, err := os.Open(src)
	if err != nil {
		return err
	}
	defer in.Close()

	out, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer out.Close()

	_, err = io.Copy(out, in)
	if err != nil {
		return err
	}
	return out.Close()
}
