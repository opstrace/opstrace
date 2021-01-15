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
	"net"
	"net/http"
	"time"

	"github.com/gogo/protobuf/proto"
	"github.com/golang/snappy"
	"github.com/prometheus/prometheus/prompb"

	log "github.com/sirupsen/logrus"
)

type DDCortexProxy struct {
	tenantName            string
	authenticationEnabled bool
	remoteWriteURL        string
	rwHTTPClient          *http.Client
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
		rwHTTPClient:          buildRemoteWriteHTTPClient(),
		authenticationEnabled: !disableAPIAuthentication,
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

func (ddcp *DDCortexProxy) SeriesPostHandler(w http.ResponseWriter, r *http.Request) {
	// Log raw request detail (with compressed body)
	// dump, err := httputil.DumpRequest(r, false)
	// if err != nil {
	// 	log.Error(err)
	// 	http.Error(w, err.Error(), 500)
	// 	return
	// }
	// log.Info(string(dump))

	bodybytes, rerr := ioutil.ReadAll(r.Body)
	defer r.Body.Close()

	if rerr != nil {
		logErrorEmit500(w, fmt.Errorf("error while reading request body: %v", rerr))
		return
	}

	if r.Header.Get("Content-Encoding") == "deflate" {
		var zerr error
		bodybytes, zerr = ZlibDecode(bodybytes)
		if zerr != nil {
			// Most likely bad input (bad request).
			logErrorEmit400(w, fmt.Errorf("bad request: error while zlib-decoding request body: %v", zerr))
			return
		}
	}

	// Dev mode: log some details
	// apiKey := r.URL.Query().Get("api_key")
	// log.Infof("url='%s', apikey='%s', body='%s'", r.URL.Path, apiKey, string(bodybytes))

	promTimeSeriesFragments, terr := TranslateDDSeriesJSON(bodybytes)
	if terr != nil {
		// Most likely bad input (bad request).
		logErrorEmit400(w, fmt.Errorf("bad request: error while translating JSON doc: %v", terr))
		return
	}

	writeRequest := &prompb.WriteRequest{
		Timeseries: promTimeSeriesFragments,
	}

	log.Debugf("Prom write request: %s", writeRequest)

	// Serialize struct into protobuf message (byte sequence).
	pbmsgbytes, perr := proto.Marshal(writeRequest)
	if perr != nil {
		logErrorEmit500(w, fmt.Errorf("error while constructing Prometheus protobuf message: %v", perr))
		return
	}

	// Snappy-compress the byte sequence.
	spbmsgbytes := snappy.Encode(nil, pbmsgbytes)
	// log.Debugf("snappy-compressed pb msg: %s", spbmsgbytes)

	ddcp.postPromWriteRequestAndHandleErrors(w, spbmsgbytes)

	// Make the DD agent's HTTP client happy.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte("{\"status\": \"ok\"}"))
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

	// In which cases does this hit in?
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
	}
	defer resp.Body.Close()

	log.Infof("cortex HTTP response code: %v", resp.StatusCode)

	bodybytes, readerr := ioutil.ReadAll(resp.Body)

	if readerr != nil {
		logErrorEmit500(w, fmt.Errorf("error while reading upstream response: %v", readerr))
		return nil
	}

	bodytext := string(bodybytes)
	log.Infof("cortex HTTP response body: %v", bodytext)

	// TODO: think about how to translate Cortex error codes into errors
	// that mean something to the DD agent?
	// if resp.StatusCode != http.StatusOK {
	// 	return fmt.Errorf("%v", resp.Status)
	// }

	return nil
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
