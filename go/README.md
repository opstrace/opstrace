
# Cortex

## Test Cortex locally

```bash
$ make build-cortex
$ ./cortex-api -listen=localhost:8080 -cortex-querier-url http://loki.url -cortex-distributor-url http://loki2.url -tenantname peter
INFO[0000] loki querier URL: http://loki.url
INFO[0000] loki distributor URL: http://loki2.url
INFO[0000] listen address: localhost:8080
INFO[0000] tenant name: peter
2020/04/07 13:37:57 http: proxy error: dial tcp: lookup loki2.url on 192.168.0.1:53: no such host

```

```bash
curl -v localhost:8080/metrics
curl -v localhost:8080/api/prom/
curl -v localhost:8080/metrics
```

# Loki

## Test Loki locally

```bash
$ make build-loki
$ ./loki-api -listen=localhost:8080 -loki-querier-url http://loki.url -loki-distributor-url http://loki2.url -tenantname peter
INFO[0000] loki querier URL: http://loki.url
INFO[0000] loki distributor URL: http://loki2.url
INFO[0000] listen address: localhost:8080
INFO[0000] tenant name: peter
2020/04/07 13:37:57 http: proxy error: dial tcp: lookup loki2.url on 192.168.0.1:53: no such host

```

```bash
curl -v localhost:8080/metrics
curl -v localhost:8080/api/prom/
curl -v localhost:8080/metrics
```

# Test in opstrace cluster

Build and push container images with the following script:

```bash
./ci/build-docker-images-update-controller-config.sh
```

`packages/controller-config/src/docker-images.json` will be updated to refer to newly built images.


Build the controller to use the new configuration:

```bash
make dependencies
```

