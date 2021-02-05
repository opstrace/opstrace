// Copyright 2020 Opstrace, Inc.
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
	"net/http"
	"net/http/httputil"
	"net/url"

	log "github.com/sirupsen/logrus"
)

type ReverseProxy struct {
	tenantName           string
	revproxyQuerier      *httputil.ReverseProxy
	revproxyDistributor  *httputil.ReverseProxy
	revproxyRuler        *httputil.ReverseProxy
	revproxyAlertmanager *httputil.ReverseProxy
	authenticatorEnabled bool
}

func NewReverseProxy(
	tenantName string,
	querierURL,
	distributorURL,
	rulerURL,
	alertmanagerURL *url.URL,
	disableAPIAuthentication bool) *ReverseProxy {
	rp := &ReverseProxy{
		tenantName: tenantName,
		// See:
		// https://github.com/cortexproject/cortex/blob/master/docs/apis.md
		// https://github.com/grafana/loki/blob/master/docs/api.md#microservices-mode
		revproxyQuerier:      httputil.NewSingleHostReverseProxy(querierURL),
		revproxyDistributor:  httputil.NewSingleHostReverseProxy(distributorURL),
		revproxyRuler:        httputil.NewSingleHostReverseProxy(rulerURL),
		revproxyAlertmanager: httputil.NewSingleHostReverseProxy(alertmanagerURL),
		authenticatorEnabled: !disableAPIAuthentication,
	}

	rp.revproxyQuerier.ErrorHandler = proxyErrorHandler
	rp.revproxyDistributor.ErrorHandler = proxyErrorHandler
	rp.revproxyRuler.ErrorHandler = proxyErrorHandler
	rp.revproxyAlertmanager.ErrorHandler = proxyErrorHandler

	return rp
}

func (rp *ReverseProxy) HandleWithQuerierProxy(w http.ResponseWriter, r *http.Request) {
	if rp.authenticatorEnabled && !DataAPIRequestAuthenticator(w, r, rp.tenantName) {
		// Error response has already been written. Terminate request handling.
		return
	}

	r.Header.Add("X-Scope-OrgID", rp.tenantName)
	rp.revproxyQuerier.ServeHTTP(w, r)
}

func (rp *ReverseProxy) HandleWithDistributorProxy(w http.ResponseWriter, r *http.Request) {
	if rp.authenticatorEnabled && !DataAPIRequestAuthenticator(w, r, rp.tenantName) {
		// Error response has already been written. Terminate request handling.
		return
	}

	r.Header.Add("X-Scope-OrgID", rp.tenantName)
	rp.revproxyDistributor.ServeHTTP(w, r)
}

func (rp *ReverseProxy) HandleWithRulerProxy(w http.ResponseWriter, r *http.Request) {
	if rp.authenticatorEnabled && !DataAPIRequestAuthenticator(w, r, rp.tenantName) {
		// Error response has already been written. Terminate request handling.
		return
	}

	r.Header.Add("X-Scope-OrgID", rp.tenantName)
	rp.revproxyRuler.ServeHTTP(w, r)
}

func (rp *ReverseProxy) HandleWithAlertmanagerProxy(w http.ResponseWriter, r *http.Request) {
	if rp.authenticatorEnabled && !DataAPIRequestAuthenticator(w, r, rp.tenantName) {
		// Error response has already been written. Terminate request handling.
		return
	}

	r.Header.Add("X-Scope-OrgID", rp.tenantName)
	rp.revproxyAlertmanager.ServeHTTP(w, r)
}

func proxyErrorHandler(resp http.ResponseWriter, r *http.Request, proxyerr error) {
	// Native error handler behavior: set status and log
	resp.WriteHeader(http.StatusBadGateway)
	log.Warnf("http: proxy error: %s", proxyerr)

	// Additional: write string representation of proxy error (as bytes) to
	// response stream. Log when that fails.
	_, werr := resp.Write([]byte(proxyerr.Error()))
	if werr != nil {
		log.Errorf("writing response failed: %v", werr)
	}
}

func exit401(resp http.ResponseWriter, errmsg string) bool {
	// `errmsg` is written to response body and should therefore be short and
	// not undermine security. Useful hints: yes (such as "authentication token
	// missing" or "unexpected Authorization header format"). No security hints
	// such as "signature verification failed".

	// 401 is canonical for "not authenticated" although the corresponding
	// name is 'Unauthorized'
	resp.WriteHeader(http.StatusUnauthorized)
	log.Infof("emit 401. Err: %s", errmsg)

	_, werr := resp.Write([]byte(errmsg))
	if werr != nil {
		log.Errorf("writing response failed: %v", werr)
	}
	return false
}
