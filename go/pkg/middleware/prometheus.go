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
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
)

type recordResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newRecordResponseWriter(w http.ResponseWriter) *recordResponseWriter {
	return &recordResponseWriter{w, 0}
}

func (rrw *recordResponseWriter) WriteHeader(code int) {
	rrw.statusCode = code
	rrw.ResponseWriter.WriteHeader(code)
}

func (rrw *recordResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	h := rrw.ResponseWriter.(http.Hijacker)
	conn, rw, err := h.Hijack()
	if err == nil && rrw.statusCode == 0 {
		// The status will be StatusSwitchingProtocols if there was no error and
		// WriteHeader has not been called yet
		rrw.statusCode = http.StatusSwitchingProtocols
	}
	return conn, rw, err
}

func PrometheusMetrics(name string) mux.MiddlewareFunc {
	requestDuration := prometheus.NewHistogramVec(prometheus.HistogramOpts{
		Namespace: name,
		Name:      "request_duration_seconds",
		Help:      "Time (in seconds) spent serving HTTP requests.",
		Buckets:   []float64{.005, .01, .025, .05, .1, .25, .5, 1, 2.5, 5, 10, 25, 50, 100},
	}, []string{"method", "route", "status_code"})
	prometheus.MustRegister(requestDuration)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			rw := newRecordResponseWriter(w)
			next.ServeHTTP(rw, r) // call original

			status := strconv.Itoa(rw.statusCode)
			took := time.Since(start)
			method := r.Method
			// this aligns with the way cortex and loki do it
			route := strings.ReplaceAll(strings.Replace(r.URL.Path, "/", "", 1), "/", "_")

			requestDuration.WithLabelValues(method, route, status).Observe(took.Seconds())
		})
	}
}
