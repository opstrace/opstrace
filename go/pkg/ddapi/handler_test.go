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
	"fmt"
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

const TenantName = "test"

func (suite *Suite) TestMissingCTH() {
	// Valid JSON in body, valid URL, valid method. Invalid: missing
	// content-type header.
	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series",
		strings.NewReader("{}"),
	)

	w := httptest.NewRecorder()
	suite.ddcp.SeriesPostHandler(w, req)

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

func (suite *Suite) TestBadCTH() {
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

	resp := w.Result()

	// Expect bad request, because there's no JSON body in the request.
	assert.Equal(suite.T(), 400, resp.StatusCode)

	// Confirm that the original error message (for why the request could
	// not be proxied) is contained in the response body.
	assert.Equal(
		suite.T(),
		"bad request: unexpected content-type header (expecting: application/json)",
		getStrippedBody(resp),
	)
}

func (suite *Suite) TestEmptyBody() {
	// Valid URL, valid method, valid CT header, invalid: missing body
	req := httptest.NewRequest("POST", "http://localhost/api/v1/series", nil)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	suite.ddcp.SeriesPostHandler(w, req)

	resp := w.Result()

	// Expect bad request, because there's no JSON body in the request.
	assert.Equal(suite.T(), 400, resp.StatusCode)

	// Confirm that the original error message (for why the request could
	// not be proxied) is contained in the response body.
	assert.Regexp(
		suite.T(),
		regexp.MustCompile("^bad request: error while translating body: invalid JSON doc: readObjectStart: expect .*$"),
		getStrippedBody(resp),
	)
}

func (suite *Suite) TestInsertOneSample() {
	testname := suite.T().Name()
	w := httptest.NewRecorder()

	// Parameterize a simple time series fragment with one data point.
	tsfragment := &DDTSFragment{
		metricname:  testname,
		sampleCount: 1,
	}

	suite.ddcp.SeriesPostHandler(
		w,
		genSubmitRequest(tsfragment.toJSON()),
	)

	expectInsertSuccessResponse(w, suite.T())
}

func (suite *Suite) TestInsertZeroSamples() {
	testname := suite.T().Name()
	w := httptest.NewRecorder()

	// Parameterize a simple time series fragment with zero data points.
	tsfragment := &DDTSFragment{
		metricname:  testname,
		sampleCount: 0,
	}

	// Note: the resulting JSON doc really has an empty JSON sample array:
	// "points": [],
	suite.ddcp.SeriesPostHandler(
		w,
		genSubmitRequest(tsfragment.toJSON()),
	)

	// And yet, as of the time of writing, the cortex HTTP response code is 200
	// and this submission doc is accepted. Review that in the future.
	expectInsertSuccessResponse(w, suite.T())
}

func (suite *Suite) TestInsertManySamples() {
	testname := suite.T().Name()
	w := httptest.NewRecorder()

	// Parameterize a simple time series fragment with one data point.
	tsfragment := &DDTSFragment{
		metricname:           testname,
		sampleCount:          10,
		sampleValueIncrement: 1,
	}

	suite.ddcp.SeriesPostHandler(
		w,
		genSubmitRequest(tsfragment.toJSON()),
	)

	expectInsertSuccessResponse(w, suite.T())
}

func expectInsertSuccessResponse(w *httptest.ResponseRecorder, t *testing.T) {
	resp := w.Result()
	assert.Equal(t, 202, resp.StatusCode)
	assert.Equal(
		t,
		"{\"status\": \"ok\"}",
		getStrippedBody(resp),
	)
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
	// log.Infof("generated POST request with body:\n%s", jsontext)
	fmt.Fprintf(os.Stdout, "generated POST request with body:\n%s", jsontext)
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

	disableAPIAuthentication := true
	suite.ddcp = NewDDCortexProxy(TenantName, suite.cortexPushURL, disableAPIAuthentication)

	// Test interacting straight with the containerized Cortex Expect 405
	// response: Method Not Allowed (only POST is supposed to work). In that
	// sense, this test explicitly checks availability of Cortex.
	resp, err := http.Get(suite.cortexPushURL)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), resp.StatusCode, 405)
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
func TestSubmitSeriesHandlerWithCortex(t *testing.T) {
	suite.Run(t, new(Suite))
}

func TestDDProxyAuthenticator_noapikey(t *testing.T) {
	// Instantiate proxy with enabled authenticator
	disableAPIAuthentication := false
	ddcp := NewDDCortexProxy(TenantName, "http://localhost", disableAPIAuthentication)

	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series",
		strings.NewReader("{}"),
	)

	w := httptest.NewRecorder()

	ddcp.SeriesPostHandler(w, req)
	resp := w.Result()
	assert.Equal(t, 401, resp.StatusCode)
	// Confirm that a helpful error message is in the body.
	assert.Equal(
		t,
		"DD API key missing (api_key URL query parameter)",
		getStrippedBody(resp),
	)
}

func TestDDProxyAuthenticator_badtoken(t *testing.T) {
	// Instantiate proxy with enabled authenticator
	disableAPIAuthentication := false
	ddcp := NewDDCortexProxy(TenantName, "http://localhost", disableAPIAuthentication)

	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series?api_key=foobarbadtoken",
		strings.NewReader("{}"),
	)

	w := httptest.NewRecorder()

	ddcp.SeriesPostHandler(w, req)
	resp := w.Result()
	assert.Equal(t, 401, resp.StatusCode)
	// Confirm that a helpful error message is in the body.
	assert.Equal(
		t,
		"bad authentication token",
		getStrippedBody(resp),
	)
}

// Read all response body bytes, and return response body as string, with
// leading and trailing whitespace stripped.
func getStrippedBody(resp *http.Response) string {
	rbody, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		panic(fmt.Errorf("readAll error: %v", err))
	}
	return strings.TrimSpace(string(rbody))
}
