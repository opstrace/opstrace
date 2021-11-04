/**
 * Copyright 2021 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import argparse from "argparse";
import * as pm from "./prommetrics";

import { KubeConfig } from "@kubernetes/client-node";

import { fork, call } from "redux-saga/effects";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";

import { fetch as fetchTenants } from "@opstrace/tenants";

import { setLogger, buildLogger, log, BUILD_INFO } from "@opstrace/utils";

// has to be set before we import the tasks because they depend
// on the logger
setLogger(
  buildLogger({
    stderrLevel: process.env.LOG_LEVEL || "info",
    filePath: undefined
  })
);

import {
  blockUntilCacheHydrated,
  clickhouseTenantsReconciler,
  cortexSystemRulesReconciler,
  reconciliationLoop,
  runInformers,
  runReporter,
  syncTenants
} from "./tasks";
import { rootReducer } from "./reducer";
import { fetchGKEVersion } from "./tasks/gke";

function* core() {
  const parser = new argparse.ArgumentParser({
    description: "Opstrace controller"
  });

  parser.addArgument("opstraceClusterName", {
    help: "The canonical Opstrace cluster name",
    type: "string",
    metavar: "OPSTRACE_CLUSTER_NAME"
  });

  parser.addArgument("--external", {
    help: "not running within k8s cluster, but outside",
    action: "storeTrue",
    defaultValue: false
  });

  parser.addArgument("--metrics-port", {
    help: "port for controller metrics, or 0 to disable",
    type: "int",
    defaultValue: 8900
  });

  log.debug("Parsing command line arguments");
  const args = parser.parseArgs();

  if (args.metrics_port === 0) {
    log.info("metrics server disabled: --metrics-port=0");
  } else {
    pm.setupPromExporter(args.metrics_port);
  }

  const kubeConfig = new KubeConfig();
  if (args.external) {
    log.info(
      "running controller not in cluster (--external): kubeConfig.loadFromDefault()"
    );
    kubeConfig.loadFromDefault();
  } else {
    // build kubeconfig, rely on controller to run in cluster and to have
    // privileged access to k8s api.
    log.info(
      "Load kubeconfig. Assume to run in cluster, rely on privileged access"
    );

    kubeConfig.loadFromCluster();
  }

  log.info(`fetching tenants`);
  yield call(fetchTenants, kubeConfig);

  log.info(`starting informers`);
  yield fork(runInformers, kubeConfig);

  yield call(blockUntilCacheHydrated);
  log.info(`state is now fully loaded`);

  log.info(`starting kubernetes readiness reporter`);
  yield fork(runReporter);

  log.info(`starting tenant sync`);
  yield fork(syncTenants, kubeConfig);

  log.info(`starting system rules reconciler`);
  yield fork(cortexSystemRulesReconciler);

  log.info(`starting clickhouse tenants reconciler`);
  yield fork(clickhouseTenantsReconciler);

  yield fork(fetchGKEVersion, kubeConfig);

  log.info(`starting reconciliation`);
  yield fork(reconciliationLoop, kubeConfig);
}

async function main() {
  log.info(
    `Starting Opstrace controller. Build information: ${JSON.stringify(
      BUILD_INFO,
      null,
      2
    )}`
  );

  const sagaMiddleware = createSagaMiddleware();
  createStore(rootReducer, applyMiddleware(sagaMiddleware));
  sagaMiddleware.run(function* () {
    return yield call(function* () {
      yield call(core);
    });
  });
}

if (require.main === module) {
  process.on("SIGINT", function () {
    log.info("Received SIGINT, exiting");
    process.exit(1);
  });

  // NodeJS 12 does not crash by default upon unhandled promise rejections.
  // Make it crash.
  process.on("unhandledRejection", err => {
    throw err;
  });

  // requires `module` be `system` or `esnext` in tsconfig
  //await main();
  // would fail `@typescript-eslint/no-floating-promises"`
  main();
}
