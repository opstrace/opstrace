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
	"context"
	"io/ioutil"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strings"
	"testing"

	log "github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"github.com/testcontainers/testcontainers-go"
)

/*
Share these resources between tests:
- a containerized Cortex instance
- a DDCortexProxy instance

Use `testify/suite` primitives for managing setup and teardown of these
resources.

Start with the test definitions: Test* methods on Suite struct, and put the
boilerplate code (struct definition, setup/teardown) towards the bottom of the
file

Each suite method whose name starts with `Test` is run as a regular test.

Ref: https://godoc.org/github.com/stretchr/testify/suite

Interesting recipe:
https://github.com/stretchr/testify/pull/655#issuecomment-588500729

*/

func (suite *Suite) TestCortexDirectly() {
	// Test interacting straight with the containerized Cortex Expect 405
	// response: Method Not Allowed (only POST is supposed to work). In that
	// sense, this test explicitly checks availability of Cortex to other
	// tests.
	resp, err := http.Get(suite.cortexPushURL)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), resp.StatusCode, 405)
}

func (suite *Suite) TestPostMissingCTH() {

	// Valid JSON in body, valid URL, valid method. Invalid: missing
	// content-type header.
	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series",
		strings.NewReader("{}"),
	)

	w := httptest.NewRecorder()
	suite.ddcp.SeriesPostHandler(w, req)

	checker := func(w *httptest.ResponseRecorder) {
		resp := w.Result()
		assert.Equal(suite.T(), 400, resp.StatusCode)

		rbody, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			suite.T().Errorf("readAll error: %v", err)
		}

		// Confirm that the original error message (for why the request could
		// not be proxied) is contained in the response body.
		assert.Equal(
			suite.T(),
			"bad request: request lacks content-type header",
			strings.TrimSpace(string(rbody)),
		)
	}

	checker(w)
}

func (suite *Suite) TestPostBadCTH() {
	// Valid JSON in body, valid URL, valid method. Invalid: unexpected
	// CT header
	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series",
		strings.NewReader("{}"),
	)
	req.Header.Set("Content-Type", "application/vnd.api+json")
	w := httptest.NewRecorder()
	suite.ddcp.SeriesPostHandler(w, req)

	checker := func(w *httptest.ResponseRecorder) {
		resp := w.Result()

		// Expect bad request, because there's no JSON body in the request.
		assert.Equal(suite.T(), 400, resp.StatusCode)

		rbody, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			suite.T().Errorf("readAll error: %v", err)
		}

		// Confirm that the original error message (for why the request could
		// not be proxied) is contained in the response body.
		assert.Equal(
			suite.T(),
			"bad request: unexpected content-type header (expecting: application/json)",
			strings.TrimSpace(string(rbody)),
		)
	}

	checker(w)
}

func (suite *Suite) TestPostEmptyBody() {
	// Valid URL, valid method, valid CT header, invalid: missing body
	req := httptest.NewRequest("POST", "http://localhost/api/v1/series", nil)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	suite.ddcp.SeriesPostHandler(w, req)

	checker := func(w *httptest.ResponseRecorder) {
		resp := w.Result()

		// Expect bad request, because there's no JSON body in the request.
		assert.Equal(suite.T(), 400, resp.StatusCode)

		rbody, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			suite.T().Errorf("readAll error: %v", err)
		}

		// Confirm that the original error message (for why the request could
		// not be proxied) is contained in the response body.
		assert.Regexp(
			suite.T(),
			regexp.MustCompile("^bad request: error while translating body: invalid JSON doc: readObjectStart: expect .*$"),
			strings.TrimSpace(string(rbody)),
		)
	}

	checker(w)
}

func (suite *Suite) TestPostSimpleBody() {
	testname := suite.T().Name()
	w := httptest.NewRecorder()

	suite.ddcp.SeriesPostHandler(
		w,
		genSubmitRequest(createJSONBody(testname)),
	)

	checker := func(w *httptest.ResponseRecorder) {
		resp := w.Result()
		assert.Equal(suite.T(), 202, resp.StatusCode)

		rbody, err := ioutil.ReadAll(resp.Body)
		if err != nil {
			suite.T().Errorf("readAll error: %v", err)
		}

		assert.Equal(
			suite.T(),
			"{\"status\": \"ok\"}",
			strings.TrimSpace(string(rbody)),
		)
	}

	checker(w)
}

// Generate HTTP request to POST to the DD API proxy, specifically to
// <baseURL>/api/v1/series with valid header(s) and valid URL, so that
// individual tests do not need to repeat code for constructing a 'good' HTTP
// request.
func genSubmitRequest(jsontext string) *http.Request {
	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series",
		strings.NewReader(jsontext),
	)
	req.Header.Set("Content-Type", "application/json")
	log.Infof("generated POST request with body:\n%s", jsontext)
	return req
}

type Suite struct {
	suite.Suite

	// The remaining properties represent shared state across tests.
	tmpdir                 string
	cortexContainerContext context.Context
	cortexContainer        testcontainers.Container
	cortexPushURL          string
	ddcp                   *DDCortexProxy
}

// `SetupSuite()` is run once before the first test in the suite.
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

	// Instantiate DDCortexProxy, to be shared across tests in this suite (of
	// course, in a smart way: stop sharing when this thing ever changes
	// towards being stateful anymore).
	tenantName := "test"
	disableAPIAuthentication := true
	suite.ddcp = NewDDCortexProxy(tenantName, suite.cortexPushURL, disableAPIAuthentication)
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

// For 'go test' to run this suite, create a stdlib `testing` test function.
func TestWithCortexSuite(t *testing.T) {
	suite.Run(t, new(Suite))
}
