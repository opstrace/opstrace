// Copyright 2019-2021 Opstrace, Inc.
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

package middleware

import (
	"bufio"
	"bytes"
	"net"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
)

// htttest.ResponseWriter doesn't implement Hijack interface so we have to
// implement our own for testing purposes.
type hijackableRecordResponseWriter struct {
	w *httptest.ResponseRecorder
}

func newHijackableRecordResponseWriter() *hijackableRecordResponseWriter {
	return &hijackableRecordResponseWriter{
		w: httptest.NewRecorder(),
	}
}

func (h *hijackableRecordResponseWriter) Body() *bytes.Buffer {
	return h.w.Body
}

func (h *hijackableRecordResponseWriter) Closed() bool {
	return false
}

func (h *hijackableRecordResponseWriter) Code() int {
	return h.w.Code
}

func (h *hijackableRecordResponseWriter) Flush() {
	h.w.Flush()
}

func (h *hijackableRecordResponseWriter) Flushed() bool {
	return h.w.Flushed
}

func (h *hijackableRecordResponseWriter) Header() http.Header {
	return h.w.Header()
}

func (h *hijackableRecordResponseWriter) HeaderMap() http.Header {
	return h.w.Result().Header
}

func (h *hijackableRecordResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	return nil, nil, nil
}

func (h *hijackableRecordResponseWriter) Result() *http.Response {
	return h.w.Result()
}

func (h *hijackableRecordResponseWriter) WriteHeader(code int) {
	h.w.WriteHeader(code)
}

func (h *hijackableRecordResponseWriter) Write(buf []byte) (int, error) {
	return h.w.Write(buf)
}

func (h *hijackableRecordResponseWriter) WriteString(str string) (int, error) {
	return h.w.WriteString(str)
}

func TestHijack(t *testing.T) {
	tests := []struct {
		name       string
		expected   int
		statusCode int
	}{
		{
			"should override status code when WriteHeader is not called",
			http.StatusSwitchingProtocols,
			0,
		},
		{
			"should override status code when WriteHeader is called",
			http.StatusOK,
			http.StatusOK,
		},
	}

	for _, tt := range tests {
		w := newHijackableRecordResponseWriter()
		rrw := newRecordResponseWriter(w)

		if tt.statusCode != 0 {
			rrw.WriteHeader(tt.statusCode)
		}

		_, _, err := rrw.Hijack()
		if err != nil {
			t.Errorf("Hijack() = %w", err)
		}

		if tt.expected != rrw.statusCode {
			t.Errorf("%s: rrw.StatusCode want %v got %v", tt.name, tt.expected, rrw.statusCode)
		}
	}
}

// Test custom prometheus middleware is gathering metrics on HTTP requests and
// saving them with a given prefix.
func TestPrometheusMetrics(t *testing.T) {
	router := mux.NewRouter()
	router.Use(PrometheusMetrics("test_prefix"))
	router.PathPrefix("/test").HandlerFunc(func(http.ResponseWriter, *http.Request) {
		// nothing to do here
	})

	backend := httptest.NewServer(router)
	defer backend.Close()

	url := backend.URL + "/test"
	//nolint:gosec
	resp, err := http.Get(url)

	if err != nil {
		t.Errorf("got %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		t.Errorf("want 200 OK got %v", resp.Status)
	}

	metrics, err := prometheus.DefaultGatherer.Gather()
	if err != nil {
		t.Errorf("got %w", err)
	}

	fail := true
	metricName := "test_prefix_request_duration_seconds"

	for _, m := range metrics {
		if m.Name != nil && *m.Name == metricName {
			fail = false
		}
	}

	if fail {
		t.Errorf("expected %s to be in the list of gathered metrics", metricName)
	}
}
