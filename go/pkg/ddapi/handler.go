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
	"fmt"
	"io/ioutil"
	"mime"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/gogo/protobuf/proto"
	"github.com/golang/snappy"
	"github.com/prometheus/prometheus/prompb"

	log "github.com/sirupsen/logrus"

	"github.com/opstrace/opstrace/go/pkg/middleware"
)

type DDCortexProxy struct {
	tenantName           string
	authenticatorEnabled bool
	remoteWriteURL       string
	rwHTTPClient         *http.Client
}

func NewDDCortexProxy(
	tenantName string,
	remoteWriteURL string,
	disableAPIAuthentication bool) *DDCortexProxy {
	p := &DDCortexProxy{
		tenantName:     tenantName,
		remoteWriteURL: remoteWriteURL,
		// Instantiate HTTP client for writing to a Prometheus remote_write
		// endpoint (in this case this is expected to be served by Cortex).
		rwHTTPClient:         buildRemoteWriteHTTPClient(),
		authenticatorEnabled: !disableAPIAuthentication,
	}

	return p
}

func logErrorEmit500(w http.ResponseWriter, e error) {
	log.Error(fmt.Errorf("emit 500: %v", e))
	http.Error(w, e.Error(), 500)
}

func logErrorEmit400(w http.ResponseWriter, e error) {
	log.Error(fmt.Errorf("emit 400: %v", e))
	http.Error(w, e.Error(), 400)
}

// Determine whether the request includes a content-type header listing
// application/json. Inspiration from
// https://gist.github.com/rjz/fe283b02cbaa50c5991e1ba921adf7c9
// https://github.com/dcos/bouncer/blob/master/bouncer/app/wsgiapp.py
func checkJSONContentType(r *http.Request) error {
	ct := r.Header.Get("Content-type")

	// Require header to be set.
	if ct == "" {
		return fmt.Errorf("request lacks content-type header")
	}

	// Note(JP): extract type and subtype of the Content-Type header (to make
	// the checks invariant w.r.t. to further parameters such as charset). Also
	// account for type and subtype being case- insensitive. See
	// https://www.ietf.org/rfc/rfc1521.txt page 9.
	for _, v := range strings.Split(ct, ",") {
		t, _, err := mime.ParseMediaType(v)
		if err != nil {
			break
		}
		if t == "application/json" {
			return nil
		}
	}
	return fmt.Errorf("unexpected content-type header (expecting: application/json)")
}

/* Common request validation and processing for the URL handlers below. */
func (ddcp *DDCortexProxy) ReadAndValidateRequest(w http.ResponseWriter, r *http.Request) ([]byte, error) {
	cterr := checkJSONContentType(r)
	if cterr != nil {
		logErrorEmit400(w, fmt.Errorf("bad request: %v", cterr))
		return nil, fmt.Errorf("content type error")
	}

	bodybytes, rerr := ioutil.ReadAll(r.Body)
	defer r.Body.Close()

	if rerr != nil {
		logErrorEmit500(w, fmt.Errorf("error while reading request body: %v", rerr))
		return nil, fmt.Errorf("body read error")
	}

	if r.Header.Get("Content-Encoding") == "deflate" {
		var zerr error
		bodybytes, zerr = ZlibDecode(bodybytes)
		if zerr != nil {
			// Most likely bad input (bad request).
			logErrorEmit400(w, fmt.Errorf("bad request: error while zlib-decoding request body: %v", zerr))
			return nil, fmt.Errorf("zlib decode error")
		}
	}

	// Log detail on debug level. In particular the request body.
	// apiKey := r.URL.Query().Get("api_key")
	// log.Debugf("url='%s', apikey='%s', body='%s'", r.URL.Path, apiKey, string(bodybytes))

	return bodybytes, nil
}

func (ddcp *DDCortexProxy) HandlerCommonAfterJSONTranslate(
	w http.ResponseWriter,
	r *http.Request,
	ptsf []*prompb.TimeSeries,
) {
	// Create Prometheus/Cortex "write request", and serialize it into
	// protobuf message (a byte sequence).
	writeRequest := &prompb.WriteRequest{
		Timeseries: ptsf,
	}

	// log.Debugf("Prom write request: %s", writeRequest)
	pbmsgbytes, perr := proto.Marshal(writeRequest)
	if perr != nil {
		logErrorEmit500(w, fmt.Errorf("error while constructing Prometheus protobuf message: %v", perr))
		return
	}

	// Snappy-compress the byte sequence.
	spbmsgbytes := snappy.Encode(nil, pbmsgbytes)

	// Attempt to write this to Cortex via HTTP.
	writeerr := ddcp.postPromWriteRequestAndHandleErrors(w, spbmsgbytes)

	if writeerr != nil {
		// That's the signal to terminate request processing. Error details can
		// be ignored (rely on `postPromWriteRequestAndHandleErrors()` to have
		// taken proper action, including logging).
		return
	}

	// Make the DD agent's HTTP client happy: emit 202 response.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte("{\"status\": \"ok\"}"))
}

func (ddcp *DDCortexProxy) CheckPostHandler(w http.ResponseWriter, r *http.Request) {
	if ddcp.authenticatorEnabled && !middleware.DDAPIRequestAuthenticator(w, r, ddcp.tenantName) {
		// Error response has already been written. Terminate request handling.
		return
	}

	bodybytes, err := ddcp.ReadAndValidateRequest(w, r)
	if err != nil {
		// Error response has already been written. Terminate request handling.
		return
	}

	promTimeSeriesFragments, terr := TranslateDDCheckRunJSON(bodybytes)
	if terr != nil {
		// Most likely bad input (bad request).
		logErrorEmit400(w, fmt.Errorf("bad request: error while translating body: %v", terr))
		// Log request body to facilitate debugging what was 'wrong' with the
		// request.
		log.Infof("Request body was: %s", string(bodybytes))
		return
	}

	ddcp.HandlerCommonAfterJSONTranslate(w, r, promTimeSeriesFragments)
}

func (ddcp *DDCortexProxy) SeriesPostHandler(w http.ResponseWriter, r *http.Request) {
	if ddcp.authenticatorEnabled && !middleware.DDAPIRequestAuthenticator(w, r, ddcp.tenantName) {
		// Error response has already been written. Terminate request handling.
		return
	}

	bodybytes, err := ddcp.ReadAndValidateRequest(w, r)
	if err != nil {
		// Error response has already been written. Terminate request handling.
		return
	}

	promTimeSeriesFragments, terr := TranslateDDSeriesJSON(bodybytes)
	if terr != nil {
		// Most likely bad input (bad request).
		logErrorEmit400(w, fmt.Errorf("bad request: error while translating body: %v", terr))
		return
	}

	ddcp.HandlerCommonAfterJSONTranslate(w, r, promTimeSeriesFragments)
}

/*
Try to send the HTTP POST request to a Prometheus remote_write endpoint, as
provided by the Cortex distributor/ingester system.

Maybe change this approach to using a ReverseProxy
object as we do in
https://github.com/opstrace/opstrace/blob/3f405cd4baa709c5d624d8966b8e2820b28ea37f/go/pkg/middleware/proxy.go#L75
?

The challenge with this approach might be response translation -- after all, we
may need to have more flexibility in translating Cortex responses for the DD
agent.
*/
func (ddcp *DDCortexProxy) postPromWriteRequestAndHandleErrors(w http.ResponseWriter, spbmsgbytes []byte) error {
	req, err := http.NewRequest(
		http.MethodPost,
		ddcp.remoteWriteURL,
		bytes.NewBuffer(spbmsgbytes),
	)

	// In which cases does this hit in (when does request construction fail)?
	if err != nil {
		return err
	}

	// Cortex's remote_write endpoint expects a snappy-compressed protobuf
	// message. Be explicit about what's sent.
	req.Header.Add("X-Prometheus-Remote-Write-Version", "0.1.0")
	req.Header.Add("Content-Encoding", "snappy")
	req.Header.Set("Content-Type", "application/x-protobuf")

	// Specify Cortex tenant to insert to.
	req.Header.Set("X-Scope-OrgID", ddcp.tenantName)

	resp, reqerr := ddcp.rwHTTPClient.Do(req)

	if reqerr != nil {
		// Which kinds of errors are handled here? Probably all those cases
		// where the request could not be written to the tcp conn. TODO: emit
		// 50x indicating gateway error?  I assume this would handle all
		// transport-related errors while trying to interact with the remote
		// system. For timeouts, we should therefore emit a 504 Gateway
		// Timeout.
		logErrorEmit500(w, fmt.Errorf("error while interacting with remote_write endpoint: %v", reqerr))
		return reqerr
	}
	defer resp.Body.Close()

	bodybytes, readerr := ioutil.ReadAll(resp.Body)

	if readerr != nil {
		logErrorEmit500(w, fmt.Errorf("error while reading upstream response: %v", readerr))
		return readerr
	}

	if resp.StatusCode >= 200 && resp.StatusCode <= 299 {
		// Signal to the caller that the write to Cortex was successful.
		return nil
	} else {
		bodytext := string(bodybytes)
		log.Infof("cortex HTTP response code: %v, HTTP response body: %v", resp.StatusCode, bodytext)
		// TODO: think about how to translate Cortex error codes into errors
		// that mean something to the DD agent? For now, forward the error
		// response as-is.
		w.WriteHeader(resp.StatusCode)
		w.Write(bodybytes)
		return fmt.Errorf("non-2xx HTTP response received from Cortex: %d", resp.StatusCode)
	}
}

func buildRemoteWriteHTTPClient() *http.Client {
	transport := &http.Transport{
		//Proxy: http.ProxyFromEnvironment,
		DialContext: (&net.Dialer{
			Timeout:   5 * time.Second,
			KeepAlive: 30 * time.Second,
			//DualStack: true,
		}).DialContext,
		// ForceAttemptHTTP2:     true,
		MaxIdleConns:    50,
		IdleConnTimeout: 90 * time.Second,
		//TLSHandshakeTimeout:   10 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
		// TLSClientConfig
	}

	client := http.Client{
		Transport: transport,
		// Global request timeout (includes connection time, any redirects,
		// response generation time, time reading response body, etc).
		Timeout: 120 * time.Second,
	}

	return &client
}
