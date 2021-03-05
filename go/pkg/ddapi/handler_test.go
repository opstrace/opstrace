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

	"github.com/opstrace/opstrace/go/pkg/authenticator"
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

func (suite *Suite) TestHandlerSeriesPost_MissingCTH() {
	// Valid JSON in body, valid URL, valid method. Invalid: missing
	// content-type header.
	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series",
		strings.NewReader("{}"),
	)

	w := httptest.NewRecorder()
	suite.ddcp.HandlerSeriesPost(w, req)

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

func (suite *Suite) TestHandlerSeriesPost_BadCTH() {
	// Valid JSON in body, valid URL, valid method. Invalid: unexpected
	// CT header
	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series",
		strings.NewReader("{}"),
	)
	req.Header.Set("Content-Type", "application/vnd.api+json")
	w := httptest.NewRecorder()
	suite.ddcp.HandlerSeriesPost(w, req)

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

func (suite *Suite) TestHandlerSeriesPost_EmptyBody() {
	// Valid URL, valid method, valid CT header, invalid: missing body
	req := httptest.NewRequest("POST", "http://localhost/api/v1/series", nil)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	suite.ddcp.HandlerSeriesPost(w, req)

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

func (suite *Suite) TestHandlerSeriesPost_InsertOneSample() {
	testname := suite.T().Name()
	w := httptest.NewRecorder()

	// Parameterize a simple time series fragment with one data point.
	tsfragment := &DDTSFragment{
		metricname:  testname,
		sampleCount: 1,
	}

	suite.ddcp.HandlerSeriesPost(
		w,
		genSubmitRequest(tsfragment.toJSON()),
	)

	expectInsertSuccessResponse(w, suite.T())
}

func (suite *Suite) TestHandlerSeriesPost_InsertZeroSamples() {
	testname := suite.T().Name()
	w := httptest.NewRecorder()

	// Parameterize a simple time series fragment with zero data points.
	tsfragment := &DDTSFragment{
		metricname:  testname,
		sampleCount: 0,
	}

	// Note: the resulting JSON doc really has an empty JSON sample array:
	// "points": [],
	suite.ddcp.HandlerSeriesPost(
		w,
		genSubmitRequest(tsfragment.toJSON()),
	)

	// And yet, as of the time of writing, the cortex HTTP response code is 200
	// and this submission doc is accepted. Review that in the future.
	expectInsertSuccessResponse(w, suite.T())
}

func (suite *Suite) TestHandlerSeriesPost_InsertManySamples() {
	testname := suite.T().Name()
	w := httptest.NewRecorder()

	// Parameterize a simple time series fragment with one data point.
	tsfragment := &DDTSFragment{
		metricname:           testname,
		sampleCount:          10,
		sampleValueIncrement: 1,
	}

	suite.ddcp.HandlerSeriesPost(
		w,
		genSubmitRequest(tsfragment.toJSON()),
	)

	expectInsertSuccessResponse(w, suite.T())
}

func (suite *Suite) TestHandlerSeriesPost_OutOfOrderSamples() {
	jsonText1 := `
	{
		"series": [{
			"metric": "unit.test.metric.ooo",
			"points": [[1610030001, 1]],
			"type": "rate",
			"interval": 10
			}
		]
	}
	`
	// Valid URL, valid method. Invalid data (duplicate timestamps)
	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series",
		strings.NewReader(jsonText1),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	suite.ddcp.HandlerSeriesPost(w, req)
	expectInsertSuccessResponse(w, suite.T())

	// same request, but sample older than the previous one
	jsonText2 := `
	{
		"series": [{
			"metric": "unit.test.metric.ooo",
			"points": [[1610030000, 1]],
			"type": "rate",
			"interval": 10
			}
		]
	}
	`
	req = httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series",
		strings.NewReader(jsonText2),
	)
	req.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	suite.ddcp.HandlerSeriesPost(w, req)
	resp := w.Result()

	// Expect bad request, because there's no JSON body in the request.
	assert.Equal(suite.T(), 400, resp.StatusCode)

	// Confirm that the Cortex-emitted error message is contained in the
	// response body.
	assert.Regexp(
		suite.T(),
		regexp.MustCompile(".*sample timestamp out of order; .*, incoming timestamp: 1610030000 .*$"),
		getStrippedBody(resp),
	)
}

func (suite *Suite) TestHandlerSeriesPost_NonMonotonicSamples() {
	// Test case where the points in the JSON doc are not ordered in time.
	// The translation layer is expected to sort them in time before
	// constructing the Prom write request.
	jsonText1 := `
	{
		"series": [{
			"metric": "unit.test.metric.aaa",
			"points": [[1610030001, 1], [1610030000, 2], [1610030002, 3]],
			"type": "rate",
			"interval": 10
			}
		]
	}
	`
	// Valid URL, valid method. Invalid data (duplicate timestamps)
	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series",
		strings.NewReader(jsonText1),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	suite.ddcp.HandlerSeriesPost(w, req)
	expectInsertSuccessResponse(w, suite.T())
}

func (suite *Suite) TestHandlerCheckPost_InsertOneSample() {
	jsonText := `
	[
	  {
		"check": "unit.test.check.aaa",
		"host_name": "x1carb6",
		"timestamp": 1613495770,
		"status": 0,
		"message": "",
		"tags": ["check:disk"]
	  }
	]
	`
	// Valid URL, valid method. Invalid data (duplicate timestamps)
	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/check_run",
		strings.NewReader(jsonText),
	)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	suite.ddcp.HandlerCheckPost(w, req)
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
		// ideally we can return an error here and the test runner would
		// not run the tests in this suite. this happens e.g. when the docker
		// daemon is not running, i.e. a common problem when executing these
		// tests locally. should show a nice error message then and leave
		// test suite early maybe.
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
func TestSuiteWithCortexCont_Series(t *testing.T) {
	suite.Run(t, new(Suite))
}

func TestHandlerSeriesPostAuthenticator_noapikey(t *testing.T) {
	// Instantiate proxy with enabled authenticator
	disableAPIAuthentication := false
	ddcp := NewDDCortexProxy(TenantName, "http://localhost", disableAPIAuthentication)

	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series",
		strings.NewReader("{}"),
	)

	w := httptest.NewRecorder()

	ddcp.HandlerSeriesPost(w, req)
	resp := w.Result()
	assert.Equal(t, 401, resp.StatusCode)
	// Confirm that a helpful error message is in the body.
	assert.Equal(
		t,
		"DD API key missing (api_key URL query parameter)",
		getStrippedBody(resp),
	)
}

func TestHandlerSeriesPostAuthenticator_badtokenstructure(t *testing.T) {
	// Instantiate proxy with enabled authenticator
	disableAPIAuthentication := false
	ddcp := NewDDCortexProxy(TenantName, "http://localhost", disableAPIAuthentication)

	req := httptest.NewRequest(
		"POST",
		"http://localhost/api/v1/series?api_key=foobarbadtoken",
		strings.NewReader("{}"),
	)

	w := httptest.NewRecorder()

	ddcp.HandlerSeriesPost(w, req)
	resp := w.Result()
	assert.Equal(t, 401, resp.StatusCode)
	// Confirm that a helpful error message is in the body.
	assert.Equal(
		t,
		"bad authentication token",
		getStrippedBody(resp),
	)
}

// These are actually authenticator tests which happen to be conveniently
// implemented in the ddapi test suite.
func TestHandlerSeriesPostAuthenticator_badtokenNoKidNoFallback(t *testing.T) {
	//nolint:lll,gosec // ignore long lines, and these are not interesting creds
	badtoken := "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE2MTEzOTQ4MDksImV4cCI6MTkyNjk3MDgwOSwiYXVkIjoib3BzdHJhY2UtY2x1c3Rlci1qcGRldiIsImlzcyI6Im9wc3RyYWNlLWNsaSIsInN1YiI6InRlbmFudC1kZWZhdWx0In0.kJIZqPTELbDjGojgQMN_DO2cZ1eR8R0Gdd6rPagqsUvmS6BdrCpf68rH5v_2xp8jtNWE_RMYGHg7E2x-S23S1H6FUhP48pgTk9Dc37mZPncSMJtdhYhvq6StDKdGkUxswHwh-p8fraS0TwobH1Lg6LmaE4Eaaj9PLLjp96z1XbiUDyAH95CsPDheNu4BiNxm5Ho_YQ63R5I2U0tpxLAApFqF0qU1pIuTL5_Q5uSUBMWjqYhokO3qK54Q8wCzGRoKQMYn52Vrj88j0-KM13k0Grg8_Ro5zO8huL1dthRPnprtFHoYHKgyyZsTmHGAlelkAMeKNkLylOu924le8b2gug"

	// Instantiate proxy with enabled authenticator
	disableAPIAuthentication := false

	os.Setenv("API_AUTHTOKEN_VERIFICATION_PUBKEY_SET", authenticator.TestKeysetEnvValTwoPubkeys)

	authenticator.ReadConfigFromEnvOrCrash()
	// log.Infof("keyset map:\n%v", authtokenVerificationPubKeys)
	// log.Infof("fallback key:\n%v", authtokenVerificationPubKeyFallback)

	ddcp := NewDDCortexProxy(TenantName, "http://localhost", disableAPIAuthentication)

	req := httptest.NewRequest(
		"POST",
		fmt.Sprintf("http://localhost/api/v1/series?api_key=%s", badtoken),
		strings.NewReader("{}"),
	)

	w := httptest.NewRecorder()

	ddcp.HandlerSeriesPost(w, req)
	resp := w.Result()
	assert.Equal(t, 401, resp.StatusCode)

	// The error is represented in a very generic way in the response, for
	// security reasons. In the log, expect
	// "jwt verification failed: kid not set in auth token, fallback key not set"
	assert.Equal(
		t,
		"bad authentication token",
		getStrippedBody(resp),
	)

	// Now set fallback key, and re-initialize the authenticator's
	// key config.
	os.Setenv("API_AUTHTOKEN_VERIFICATION_PUBKEY", authenticator.TestPubKey)
	authenticator.ReadConfigFromEnvOrCrash()

	// And repeat -- expect same outcome, but different error behind the
	// scenes! A pubkey that does _not_ match the priv key that was used
	// for signing the token.
	w = httptest.NewRecorder()

	ddcp.HandlerSeriesPost(w, req)
	resp = w.Result()
	assert.Equal(t, 401, resp.StatusCode)

	// The error is represented in a very generic way in the response, for
	// security reasons. In the log, expect
	// time="2021-03-04T16:19:42+01:00" level=info msg="kid not set in auth token, use fallback key (is configured)"
	// time="2021-03-04T16:19:42+01:00" level=info msg="jwt verification failed: crypto/rsa: verification error"
	// time="2021-03-04T16:19:42+01:00" level=info msg="emit 401. Err: bad authentication token"
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
