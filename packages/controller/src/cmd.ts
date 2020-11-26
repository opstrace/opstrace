/**
 * Copyright 2020 Opstrace, Inc.
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

import { KubeConfig } from "@kubernetes/client-node";

import { fork, call } from "redux-saga/effects";
import { createStore, applyMiddleware } from "redux";
import createSagaMiddleware from "redux-saga";

import { fetch as fetchTenants } from "@opstrace/tenants";

import { setLogger, buildLogger, log } from "@opstrace/utils";

import {
  reconciliationLoop,
  runInformers,
  blockUntilCacheHydrated,
  runReporter
} from "./tasks";
import { rootReducer } from "./reducer";

function* core() {
  setLogger(
    buildLogger({
      stderrLevel: "info",
      filePath: undefined
    })
  );

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

  log.debug("Parsing command line arguments");
  const args = parser.parseArgs();

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

  log.info(`starting kubernetes informers`);
  yield fork(runInformers, kubeConfig);

  yield call(blockUntilCacheHydrated);
  log.info(`state is now fully loaded`);

  log.info(`starting kubernetes readiness reporter`);
  yield fork(runReporter);

  log.info(`starting reconciliation`);
  yield fork(reconciliationLoop, kubeConfig);
}

async function main() {
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
    log.debug("Received SIGINT, exiting");
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
