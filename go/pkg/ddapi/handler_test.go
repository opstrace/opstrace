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
	"net/http/httptest"
	"os"
	"testing"

	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

// Define the suite, and absorb the built-in basic suite
// functionality from testify - including assertion methods.
type Suite struct {
	suite.Suite
	tmpdir                 string
	cortexContainerContext context.Context
	cortexContainer        testcontainers.Container
	cortexPushURL          string
}

// `SetupSuite()`: is run once before all tests in the suite.
func (suite *Suite) SetupSuite() {
	d, err := createTmpDir()
	if err != nil {
		suite.T().Errorf("failed to create suite tmp dir: %v", err)
		return
	}
	suite.tmpdir = d

	ctx, cont, url, err := startCortex(suite.tmpdir)
	if err != nil {
		suite.T().Errorf("failed to launch cortex: %v", err)
		return
	}
	suite.cortexContainerContext, suite.cortexContainer, suite.cortexPushURL = ctx, cont, url
}

// `TearDownSuite(): run once upon suite exit.
// Note(JP): guarantees are a bit unclear. Also see
// https://github.com/stretchr/testify/issues/764
func (suite *Suite) TearDownSuite() {
	// Destroy container (TODO: inspect state, fetch logs, etc)

	log.Infof("suite teardown: attempt to destroy Cortex container")
	err := suite.cortexContainer.Terminate(suite.cortexContainerContext)
	if err != nil {
		suite.T().Errorf("failed to destroy cortex container: %v", err)
	}

	// Note: leave this around for now for debugging?
	log.Infof("suite teardown: attempt to remove tmp dir %s", suite.tmpdir)
	err = os.RemoveAll(suite.tmpdir)
	if err != nil {
		suite.T().Errorf("failed to remove suite tmp dir: %v", err)
	}
}

// Each suite method whose name starts with `Test` is run as a regular test.
func (suite *Suite) TestCortexDirectly() {
	// Test interacting straight with the containerized Cortex
	// Expect 405 response: Method Not Allowed (only POST is supposed to work).
	resp, err := http.Get(suite.cortexPushURL)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), resp.StatusCode, 405)
}

func (suite *Suite) TestDDCP() {
	tenantName := "text"
	remoteWriteURL := suite.cortexPushURL
	disableAPIAuthentication := true
	ddcp := NewDDCortexProxy(tenantName, remoteWriteURL, disableAPIAuthentication)

	// resp, err := http.Get(suite.cortexPushURL)
	// assert.NotNil(suite.T(), err)
	// assert.Equal(suite.T(), resp.StatusCode, 405)

	req := httptest.NewRequest("POST", "http://localhost/api/v1/series", nil)

	checker := func(w *httptest.ResponseRecorder) {
		resp := w.Result()

		// Expect bad request, because there's no JSON body in the request
		// And no content type header.
		assert.Equal(suite.T(), resp.StatusCode, 400)

		rbody, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			suite.T().Errorf("got %v", err)
		}

		log.Infof("response body: %s", rbody)
	}

	w := httptest.NewRecorder()
	ddcp.SeriesPostHandler(w, req)
	checker(w)
}

// In order for 'go test' to run this suite, create a normal test function.
func TestSuite(t *testing.T) {
	suite.Run(t, new(Suite))
}

func createTmpDir() (string, error) {
	// Create a unique temporary directory for this test suite run. Note: "It
	// is the caller's responsibility to remove the directory when no longer
	// needed." -- do this in suite teardown.
	tempdir, err := ioutil.TempDir("/tmp", "opstrace-go-unit-tests")
	if err != nil {
		return "", err
	}

	log.Infof("created suite tmp dir: %s", tempdir)
	return tempdir, nil
}

func startCortex(tempdir string) (context.Context, testcontainers.Container, string, error) {
	ctx := context.Background()

	// Assume that this is the directory that this source file resides in.
	// That's true when clicking `run test` in vs code, and interestingly also
	// true when running `make unit-tests`, i.e. when running `go test ...`.
	// https://stackoverflow.com/a/23847429/145400
	testdir, err := os.Getwd()
	log.Infof("test dir: %s", testdir)
	if err != nil {
		log.Fatal(err)
	}

	// Copy the Cortex config file into `tempdir` (under /tmp) so that it can
	// so that the bindMount source is valid _on the host_, too (assume that
	// this test runner runs in a container, and that /tmp is shared between
	// host and containers).
	cortexCfgSourcePath := testdir + "/test-resources/cortex-dev-cfg.yaml"
	cortexCfgHostPath := tempdir + "/cortex-dev-cfg.yaml"
	simpleFileCopy(cortexCfgSourcePath, cortexCfgHostPath)

	req := testcontainers.ContainerRequest{
		Image:        "cortexproject/cortex:v1.6.0",
		ExposedPorts: []string{"33333/tcp"},
		WaitingFor:   wait.ForHTTP("/ready").WithPort("33333/tcp"),
		BindMounts:   map[string]string{cortexCfgHostPath: "/cortex-config.yaml"},
		Cmd:          []string{"exec", "./cortex", "-config.file=/cortex-config.yaml"},
	}

	container, err := testcontainers.GenericContainer(ctx, testcontainers.GenericContainerRequest{
		ContainerRequest: req,
		Started:          true,
	})

	if err != nil {
		return nil, nil, "", err
	}

	// Construct (base) URL to remote_write endpoint
	ip, err := container.Host(ctx)
	if err != nil {
		panic(err)
	}
	port, err := container.MappedPort(ctx, "33333")
	if err != nil {
		panic(err)
	}
	pushURL := fmt.Sprintf("http://%s:%s/api/v1/push", ip, port.Port())

	return ctx, container, pushURL, nil
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
