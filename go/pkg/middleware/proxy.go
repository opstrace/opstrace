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

package middleware

import (
	"net/http"
	"net/http/httputil"
	"net/url"

	log "github.com/sirupsen/logrus"
)

// TenantReverseProxy is a proxy that adds a specified tenant name as an HTTP request header.
//
// If tenantName is non-nil, then all requests are expected to be for that tenant, and the
// Authentication header/Bearer token will be checked for a matching tenant if !disableAPIAuthentication.
//
// If tenantName is nil, then the tenant will be extracted from the requests on a per-request basis,
// either from the Authentication header/Bearer token, or from a custom "X-Scope-OrgID" header if
// disableAPIAuthentication is true.
type TenantReverseProxy struct {
	tenantName               *string
	headerName               string
	revproxy                 *httputil.ReverseProxy
	disableAPIAuthentication bool
}

func NewTenantReverseProxy(
	tenantName *string,
	headerName string,
	backendURL *url.URL,
	disableAPIAuthentication bool) *TenantReverseProxy {
	revproxy := httputil.NewSingleHostReverseProxy(backendURL)
	trp := &TenantReverseProxy{tenantName, headerName, revproxy, disableAPIAuthentication}
	trp.revproxy.ErrorHandler = proxyErrorHandler
	return trp
}

func (trp *TenantReverseProxy) HandleWithProxy(w http.ResponseWriter, r *http.Request) {
	tenantName, ok := GetTenant(w, r, trp.tenantName, trp.disableAPIAuthentication)
	if !ok {
		// Error response has already been written. Terminate request handling.
		return
	}

	// Add the tenant in the request header and then forward the request to the backend.
	r.Header.Add(trp.headerName, tenantName)
	trp.revproxy.ServeHTTP(w, r)
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
