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

package ddapi

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"text/template"
	"time"

	log "github.com/sirupsen/logrus"
	"github.com/testcontainers/testcontainers-go"
	"github.com/testcontainers/testcontainers-go/wait"
)

func createJSONBody(metricname string) string {
	const jsonTextTemplate = `
	{
		"series": [
		  {
			"metric": "unit.test.metric.{{.metricname}}",
			"points": [
			  [
				{{.secondsSinceEpoch}},
				1
			  ]
			],
			"tags": [
			  "version:7.24.1"
			],
			"host": "x1carb6",
			"type": "rate",
			"interval": 10
		  }
		]
	  }
`
	data := map[string]interface{}{
		"metricname":        metricname,
		"secondsSinceEpoch": fmt.Sprintf("%v", time.Now().Unix()),
	}

	// Render template, store result in string.

	t := template.Must(template.New("").Parse(jsonTextTemplate))

	buf := &bytes.Buffer{}
	if err := t.Execute(buf, data); err != nil {
		panic(err)
	}

	// Return buffer (type *bytes.Buffer), can be passed as third argument to
	// httptest.NewRequest(). This buffer holds UTF-8-encoded JSON. return buf

	// Return string (JSON doc as text). Need to create strings.NewReader(s)
	// then for passing it as third arg to httptest.NewRequest()
	return buf.String()
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
