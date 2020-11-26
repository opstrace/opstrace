# `systemlog-fluentd` container

This defines the container image for system log collection.
Each node in an Opstrace cluster runs one FluentD instance.
It collects logs from all node-local k8s-managed containers (with the [tail input plugin](https://docs.fluentd.org/input/tail)), and to pushes them to Loki (under the system tenant) with the [Loki output plugin](https://github.com/grafana/loki/tree/master/fluentd/fluent-plugin-grafana-loki) maintained by Grafana.

FluentD is robust. Robustness properties that we care about:

* log file rotation handling
* node-local log data buffer management
* push error handling (sophisticated retries and useful logging around errors in particular)

## Build and push a container image

```bash
$ make build-image
...
Successfully tagged opstrace/systemlog-fluentd:679f63dd-dev

$ make publish
docker push opstrace/systemlog-fluentd:679f63dd-dev
The push refers to repository [docker.io/opstrace/systemlog-fluentd]
...
679f63dd-dev: digest: sha256:a0172bf0f9392a5f87f8fccd1ea815c3cb918ef4252fff310e14bdd57496c86e size: 3874
```

Then change the image tag in `packages/controller/src/resources/apis/systemlogs.ts` correspondingly, for example:

```bash
± git diff
diff --git a/packages/controller/src/resources/apis/systemlogs.ts b/packages/controller/src/resources/apis/systemlogs.ts
index b121b377..ef763ae8 100644
--- a/packages/controller/src/resources/apis/systemlogs.ts
+++ b/packages/controller/src/resources/apis/systemlogs.ts
@@ -149,7 +149,7 @@ export function SystemLogAgentResources(
               containers: [
                 {
                   name: "fluentd",
-                  image: "opstrace/systemlog-fluentd:6171fc39-dev",
+                  image: "opstrace/systemlog-fluentd:39df992d-dev",
                   env: [
                     {
```

Also update the image tag in the `test-remote` project and then also in
the `rebuild-testrunner-container-images` Makefile target, otherwise
during `test-remote` an error like this can appear:

```text
[2020-07-06T20:30:48Z]   1) Loki API test suite
[2020-07-06T20:30:48Z]        insert w/ cntnrzd FluentD(loki plugin), then query:
[2020-07-06T20:30:48Z]      Error: (HTTP code 404) no such container - No such image: opstrace/systemlog-fluentd:39df992d-dev
[2020-07-06T20:30:48Z]       at /test/node_modules/docker-modem/lib/modem.js:301:17
[2020-07-06T20:30:48Z]       at getCause (node_modules/docker-modem/lib/modem.js:331:7)
[2020-07-06T20:30:48Z]       at Modem.buildPayload (node_modules/docker-modem/lib/modem.js:3
```
