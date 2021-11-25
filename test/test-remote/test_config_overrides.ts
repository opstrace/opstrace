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

import { KubeConfig } from "@kubernetes/client-node";

import createSagaMiddleware, { SagaMiddleware } from "redux-saga";
import { applyMiddleware, createStore, combineReducers } from "redux";
import { call, cancel, delay, fork, race } from "redux-saga/effects";

import {
  ConfigMap,
  daemonSetsReducer,
  Deployment,
  deploymentsReducer,
  statefulSetsReducer
} from "@opstrace/kubernetes";

import { log } from "./testutils";

import {
  blockUntilCacheHydrated,
  runInformers,
  waitForReady
} from "./testutils/deployment";

suite("End-to-end controller config overrides", function () {
  const configMapName = "opstrace-controller-config-overrides";
  const configMapNamespace = "default";
  const maxWaitSeconds = 300;

  let kubeConfig: KubeConfig;
  let kubeContext: string;

  let sm: SagaMiddleware<any>;
  let informers: any;

  const rootReducers = {
    kubernetes: combineReducers({
      cluster: combineReducers({
        DaemonSets: daemonSetsReducer,
        Deployments: deploymentsReducer,
        StatefulSets: statefulSetsReducer
      })
    })
  };
  const rootReducer = combineReducers(rootReducers);

  suiteSetup(async function () {
    log.info("suite setup");

    // The test environment should already have kubectl working, so we can use
    // that.
    kubeConfig = new KubeConfig();
    kubeConfig.loadFromDefault();
    // loadFromDefault will fall back to e.g. localhost if it cant find
    // something. So let's explicitly try to communicate with the cluster.
    kubeContext = kubeConfig.getCurrentContext();
    if (kubeContext === null) {
      throw new Error(
        "Unable to communicate with kubernetes cluster. Is kubectl set up?"
      );
    }

    sm = createSagaMiddleware();
    createStore(rootReducer, applyMiddleware(sm));
  });

  suiteTeardown(async function () {
    log.info("suite teardown");
  });

  test("it can override cortex-operator querier deployment spec", async function () {
    const querierDeployment = new Deployment(
      {
        metadata: {
          name: "querier",
          namespace: "cortex"
        }
      },
      kubeConfig
    );

    await sm
      .run(function* () {
        //@ts-ignore: TS7075 generator lacks return type (TS 4.3)
        informers = yield fork(runInformers, kubeConfig);

        yield call(blockUntilCacheHydrated);

        // Wait for the cortex querier deployment is up and running.
        const waitForReadyDeployments = function* () {
          const { timeout } = yield race({
            wait: call(waitForReady, {
              originalDaemonSets: [],
              originalDeployments: [querierDeployment],
              originalStatefulSets: []
            }),
            timeout: delay(maxWaitSeconds * 1000)
          });
          if (timeout) {
            throw Error(
              `timeout waiting for deployments to be ready to start the test`
            );
          }
        };

        const assertDeploymentHasReplicas = function* (
          d: Deployment,
          replicas: number
        ) {
          yield new Promise((resolve, reject) => {
            return d
              .read()
              .then(d => {
                if (d.body.spec?.replicas !== replicas) {
                  throw new Error(
                    `number of replicas do not match: got ${d.body.spec?.replicas} expected ${replicas}`
                  );
                }
                resolve(d);
              })
              .catch(reject);
          });
        };

        // Create a config map to override the cortex querier spec.
        const overridesConfigMap = new ConfigMap(
          {
            apiVersion: "v1",
            kind: "ConfigMap",
            metadata: {
              name: configMapName,
              namespace: configMapNamespace,
              // The config map requires this annotation otherwise the
              // controller won't pick it up. Check
              // https://github.com/opstrace/opstrace/blob/b2646b68d2f17ff1d56df8846b3ad4262067c2ed/lib/kubernetes/src/kinds/ConfigMap.ts#L153-L155
              // for more details.
              annotations: {
                opstrace: "protected"
              }
            },
            data: {
              "Cortex__cortex__opstrace-cortex": `
spec:
  querier_spec:
    replicas: 1
`
            }
          },
          kubeConfig
        );

        log.info(`checking if all required deployments are ready`);
        yield waitForReadyDeployments();

        log.info(`creating config map with controller config overrides`);
        yield new Promise((resolve, reject) => {
          return overridesConfigMap.create().then(resolve).catch(reject);
        });
        log.info(`waiting for controller to pick-up changes`);
        yield delay(10 * 1000);
        log.info(`checking querier deployment has 1 replica`);
        yield assertDeploymentHasReplicas(querierDeployment, 1);

        log.info(`checking if all required deployments are ready`);
        yield waitForReadyDeployments();

        log.info(`deleting config map`);
        yield overridesConfigMap.delete();
        log.info(`waiting for controller to pick-up changes`);
        yield delay(10 * 1000);
        log.info(`checking querier deployment has 3 replicas`);
        yield assertDeploymentHasReplicas(querierDeployment, 3);

        log.info(`checking if all required deployments are ready`);
        yield waitForReadyDeployments();

        yield cancel(informers);
      })
      .toPromise();
  });
});
