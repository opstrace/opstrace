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

	"github.com/opstrace/opstrace/go/pkg/authenticator"
)

// TenantReverseProxy is a proxy that adds a specified tenant name as an HTTP request header.
//
// If tenantName is non-nil, then all requests are expected to be for that tenant, and the
// Authentication header/Bearer token will be checked for a matching tenant if !disableAPIAuthentication.
//
// If tenantName is nil, then the tenant will be extracted from the requests on a per-request basis,
// either from the Authentication header/Bearer token, or from a custom "X-Scope-OrgID" header if
// disableAPIAuthentication is true.
//
// If backendPathReplacement is non-nil, then it will be invoked with the request URL, and the request
// Path and RawPath (respectively) will be updated with its return values.
// This is to allow e.g. /api/v1/* -> /foo/* redirects but can be used for any replacement.
type TenantReverseProxy struct {
	tenantName               *string
	headerName               string
	backendURL               *url.URL
	Revproxy                 *httputil.ReverseProxy
	disableAPIAuthentication bool
}

func NewReverseProxyFixedTenant(
	tenantName string,
	headerName string,
	backendURL *url.URL,
	disableAPIAuthentication bool) *TenantReverseProxy {
	trp := &TenantReverseProxy{
		&tenantName,
		headerName,
		backendURL,
		httputil.NewSingleHostReverseProxy(backendURL),
		disableAPIAuthentication,
	}
	trp.Revproxy.ErrorHandler = proxyErrorHandler
	if backendURL.Path != "" && backendURL.Path != "/" {
		log.Fatalf("Backend path must be empty, use backendPathReplacement: %s", backendURL.String())
	}
	return trp
}

func NewReverseProxyDynamicTenant(
	headerName string,
	backendURL *url.URL,
	disableAPIAuthentication bool) *TenantReverseProxy {
	trp := &TenantReverseProxy{
		nil,
		headerName,
		backendURL,
		httputil.NewSingleHostReverseProxy(backendURL),
		disableAPIAuthentication,
	}
	trp.Revproxy.ErrorHandler = proxyErrorHandler
	if backendURL.Path != "" && backendURL.Path != "/" {
		log.Fatalf("Backend path must be empty, use backendPathReplacement: %s", backendURL.String())
	}
	return trp
}

// Replaces the internal ReverseProxy with one that will apply the provided backendPathReplacement
// to request paths.
// This does not currently support rewriting responses, which may be needed for any HTML with embedded URLs.
func (trp *TenantReverseProxy) ReplacePaths(reqPathReplacement func(*url.URL) string) *TenantReverseProxy {
	if reqPathReplacement != nil {
		// Requests: Update URL path with replacement
		trp.Revproxy.Director = pathReplacementDirector(trp.backendURL, reqPathReplacement)
	}
	return trp
}

// Copied from httputil.NewSingleHostReverseProxy with tweaks to url.Path handling to support non-append overrides.
func pathReplacementDirector(backendURL *url.URL, reqPathReplacement func(*url.URL) string) func(req *http.Request) {
	targetQuery := backendURL.RawQuery
	return func(req *http.Request) {
		req.URL.Scheme = backendURL.Scheme
		req.URL.Host = backendURL.Host

		// CUSTOM PATH LOGIC vs stock NewSingleHostReverseProxy.Director, which only supports appends
		origPath := req.URL.Path
		req.URL.Path = reqPathReplacement(req.URL)
		log.Debugf("Redirecting req=%s to dest=%s%s", origPath, backendURL.Host, req.URL.Path)
		if req.URL.RawPath != "" {
			// Also update RawPath with escaped version of replacement
			req.URL.RawPath = url.PathEscape(req.URL.Path)
		}

		if targetQuery == "" || req.URL.RawQuery == "" {
			req.URL.RawQuery = targetQuery + req.URL.RawQuery
		} else {
			req.URL.RawQuery = targetQuery + "&" + req.URL.RawQuery
		}
		if _, ok := req.Header["User-Agent"]; !ok {
			// explicitly disable User-Agent so it's not set to default value
			req.Header.Set("User-Agent", "")
		}
	}
}

func (trp *TenantReverseProxy) HandleWithProxy(w http.ResponseWriter, r *http.Request) {
	tenantName, ok := authenticator.GetTenant(w, r, trp.tenantName, trp.disableAPIAuthentication)
	if !ok {
		// Error response has already been written. Terminate request handling.
		return
	}

	// Add the tenant in the request header and then forward the request to the backend.
	r.Header.Add(trp.headerName, tenantName)
	trp.Revproxy.ServeHTTP(w, r)
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
