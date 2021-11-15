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

package opstraceauthextension

import (
	"context"
	"fmt"

	"go.opentelemetry.io/collector/component"
	"go.opentelemetry.io/collector/config/configauth"
	"google.golang.org/grpc"

	"github.com/opstrace/opstrace/go/pkg/authenticator"
)

type oidcExtension struct {
	cfg               *Config
	unaryInterceptor  configauth.GRPCUnaryInterceptorFunc
	streamInterceptor configauth.GRPCStreamInterceptorFunc
}

var (
	_ configauth.ServerAuthenticator = (*oidcExtension)(nil)
)

func newExtension(cfg *Config) (*oidcExtension, error) {
	authenticator.ReadConfigFromEnvOrCrash()

	if cfg.TenantName == "" {
		return nil, fmt.Errorf("%s.tenantName is required", TypeStr)
	}

	return &oidcExtension{
		cfg:               cfg,
		unaryInterceptor:  configauth.DefaultGRPCUnaryServerInterceptor,
		streamInterceptor: configauth.DefaultGRPCStreamServerInterceptor,
	}, nil
}

func (e *oidcExtension) Start(ctx context.Context, _ component.Host) error {
	return nil
}

// Shutdown is invoked during service shutdown.
func (e *oidcExtension) Shutdown(context.Context) error {
	return nil
}

// Authenticate checks whether the given context contains valid auth data.
// Successfully authenticated calls will always return a nil error and a context with the auth data.
func (e *oidcExtension) Authenticate(ctx context.Context, headers map[string][]string) (context.Context, error) {
	// In HTTP the header is capitalized "Authorization"
	// Meanwhile for gRPC the header is (apparently) lowercase "authorization"
	err := authenticator.AuthenticateSpecificTenantByHeaderMap(headers, "authorization", e.cfg.TenantName)
	if err != nil {
		return ctx, err
	}

	return ctx, nil
}

// GRPCUnaryServerInterceptor is a helper method to provide a gRPC-compatible UnaryInterceptor,
// typically calling the authenticator's Authenticate method.
func (e *oidcExtension) GRPCUnaryServerInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (interface{}, error) {
	return e.unaryInterceptor(ctx, req, info, handler, e.Authenticate)
}

// GRPCStreamServerInterceptor is a helper method to provide a gRPC-compatible StreamInterceptor,
// typically calling the authenticator's Authenticate method.
func (e *oidcExtension) GRPCStreamServerInterceptor(
	srv interface{},
	str grpc.ServerStream,
	info *grpc.StreamServerInfo,
	handler grpc.StreamHandler,
) error {
	return e.streamInterceptor(srv, str, info, handler, e.Authenticate)
}
