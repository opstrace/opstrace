package main

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

// Instantiate HTTP client for writing to a Prometheus remote_write endpoint.
var rwHTTPClient = buildRemoteWriteHttpClient()

func logErrorEmit500(w http.ResponseWriter, e error) {
	log.Error(fmt.Errorf("emit 500: %v", e))
	http.Error(w, e.Error(), 500)
}

func logErrorEmit400(w http.ResponseWriter, e error) {
	log.Error(fmt.Errorf("emit 400: %v", e))
	http.Error(w, e.Error(), 400)
}

func SeriesPostHandler(w http.ResponseWriter, r *http.Request) {

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

	//var promTimeSeriesFragments []*prompb.TimeSeries
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

	// Convert the struct to a slice of bytes and then compress it.
	pbmsgbytes, perr := proto.Marshal(writeRequest)
	if perr != nil {
		logErrorEmit500(w, fmt.Errorf("error while constructing Prometheus protobuf message: %v", perr))
		return
	}

	spbmsgbytes := snappy.Encode(nil, pbmsgbytes)
	// log.Debugf("snappy-compressed pb msg: %s", spbmsgbytes)

	postPromWriteRequestAndHandleErrors(w, spbmsgbytes)

	// Make the DD agent's HTTP client happy.
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusAccepted)
	w.Write([]byte(fmt.Sprintf(`{"status": "%s"}`, "ok")))
}

/*
Try to send the HTTP POST request to a Prometheus remote_write endpoint, as
provided by the Cortex distributor/ingester system.

Don't overdo it yet -- maybe change this approach to using a ReverseProxy
object as we do in
https://github.com/opstrace/opstrace/blob/3f405cd4baa709c5d624d8966b8e2820b28ea37f/go/pkg/middleware/proxy.go#L75
?

The challenge with this approach might be response translation -- after all, we
may need to have more flexibility in translating Cortex responses for the DD
agent.
*/
func postPromWriteRequestAndHandleErrors(w http.ResponseWriter, spbmsgbytes []byte) error {

	req, err := http.NewRequest(
		http.MethodPost,
		PromRemoteWriteUrl,
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
	// TODO: Set tenant / X-Scope-OrgID  header.

	resp, reqerr := rwHTTPClient.Do(req)

	if reqerr != nil {
		// What kinds of errors are handled here? Probably all those cases
		// where not HTTP response is received. TODO: emit 50x indicating
		// gateway error?  I assume this would handle all transport-related
		// errors while trying to interact with the remote system. For
		// timeouts, we should therefore emit a 504 Gateway Timeout.
		logErrorEmit500(w, fmt.Errorf("error while interacting with remote_write endpoint: %v", reqerr))
	}
	defer resp.Body.Close()

	log.Infof("cortex HTTP response code: %v", resp.StatusCode)

	bodybytes, readerr := ioutil.ReadAll(resp.Body)
	if readerr != nil {
		log.Fatal(err)
		logErrorEmit500(w, fmt.Errorf("error while reading upstream response: %v", readerr))
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

func buildRemoteWriteHttpClient() *http.Client {

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
