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

import { delay, call, cancel, fork } from "redux-saga/effects";
import { Task, Saga } from "redux-saga";
import { SECOND } from "@opstrace/utils";
import {
  DaemonSets,
  Deployments,
  StatefulSets,
  PersistentVolumes
} from "../kinds";

import {
  DaemonSetType,
  DeploymentType,
  StatefulSetType,
  PersistentVolumeType
} from "../kinds";

import { getStatefulSetRolloutMessage } from "./statefulset";
import { getDaemonSetRolloutMessage } from "./daemonset";
import { getDeploymentRolloutMessage } from "./deployment";
import { getPersistentVolumeReleaseMessage } from "./persistentVolume";
import {
  V1CertificateResource,
  V1CertificateResourceType
} from "../custom-resources";
import { getCertificateRolloutMessage } from "./certificates";

export function clusterIsEmpty(
  deployments: DeploymentType[],
  daemonsets: DaemonSetType[],
  statefulsets: StatefulSetType[],
  certificates: V1CertificateResourceType[]
) {
  return (
    daemonsets.filter(r => r.isOurs()).length === 0 &&
    deployments.filter(r => r.isOurs() && !r.isProtected()).length === 0 &&
    statefulsets.filter(r => r.isOurs()).length === 0 &&
    certificates.filter(r => r.isOurs()).length == 0
  );
}

export function activePersistentVolumes(
  persistentVolumes: PersistentVolumeType[]
) {
  return persistentVolumes
    .map(pv => getPersistentVolumeReleaseMessage(pv))
    .sort()
    .filter(m => !!m);
}

export function activeDeployments(deployments: DeploymentType[]) {
  return deployments
    .map(r => getDeploymentRolloutMessage(r))
    .sort()
    .filter(m => !!m);
}

export function activeDaemonsets(daemonsets: DaemonSetType[]) {
  return daemonsets
    .map(r => getDaemonSetRolloutMessage(r))
    .sort()
    .filter(m => !!m);
}

export function activeStatefulsets(statefulsets: StatefulSetType[]) {
  return statefulsets
    .map(r => getStatefulSetRolloutMessage(r))
    .sort()
    .filter(m => !!m);
}

export function activeCertificates(certificates: V1CertificateResourceType[]) {
  return certificates
    .map(r => getCertificateRolloutMessage(r))
    .sort()
    .filter(m => !!m);
}

export function* reporter(
  runningReporterOptions: RunningReporterOptions,
  destroyingReporterOptions: DestroyingReporterOptions,
  shouldDestroy: Saga
) {
  return yield call(function* () {
    let reportRunning: Task | null = null;
    let reportDestroying: Task | null = null;

    while (true) {
      if (yield call(shouldDestroy)) {
        if (reportRunning) {
          yield cancel(reportRunning);
          reportRunning = null;
        }
        if (!reportDestroying) {
          reportDestroying = yield fork(
            destroyingReporter,
            destroyingReporterOptions
          );
        }
      } else {
        if (reportDestroying) {
          yield cancel(reportDestroying);
          reportDestroying = null;
        }
        if (!reportRunning) {
          reportRunning = yield fork(runningReporter, runningReporterOptions);
        }
      }

      yield delay(1 * SECOND);
    }
  });
}

export interface DestroyingReporterResourceInputs {
  PersistentVolumes: PersistentVolumes;
}

export type GetDestroyingReporterResourceInputs = () => DestroyingReporterResourceInputs;
export interface DestroyingReporterChangeEvent {
  ready: boolean;
  remainingPersistentVolumes: string[];
}

export interface DestroyingReporterOptions {
  getResourceInputs: Saga;
  onChange: Saga;
}

export function* destroyingReporter(options: DestroyingReporterOptions) {
  let existingPersistentVolumes: string[] = [];
  let lastHeartbeat: number = Infinity;
  let firstReport = true;

  while (true) {
    const { PersistentVolumes } = yield call(options.getResourceInputs);

    // Check PVs
    const PVs = activePersistentVolumes(PersistentVolumes);

    const shouldSendHeartbeat = Date.now() - lastHeartbeat > 30 * SECOND;

    if (
      PVs.length !== existingPersistentVolumes.length ||
      shouldSendHeartbeat ||
      firstReport
    ) {
      yield call(options.onChange, {
        ready: PVs.length === 0,
        remainingPersistentVolumes: PVs
      });

      firstReport = false;
      lastHeartbeat = Date.now();
      existingPersistentVolumes = PVs;
    }

    yield delay(1 * SECOND);
  }
}

export interface RunningReporterResourceInputs {
  DaemonSets: DaemonSets;
  Deployments: Deployments;
  StatefulSets: StatefulSets;
  Certificates: V1CertificateResource[];
}

export type GetRunningReporterResourceInputs = () => RunningReporterResourceInputs;
export interface RunningReporterChangeEvent {
  ready: boolean;
  activeDeployments: string[];
  activeStatefulSets: string[];
  activeDaemonSets: string[];
}

export interface RunningReporterOptions {
  getResourceInputs: Saga;
  onChange: Saga;
}

export function* runningReporter(options: RunningReporterOptions) {
  let lastActiveDeployments: string[] = [];
  let lastActiveDaemonSets: string[] = [];
  let lastActiveStatefulSets: string[] = [];
  let lastActiveCerts: string[] = [];

  let noActivesSince: number = Infinity;
  let lastHeartbeat: number = Infinity;
  let ready: boolean = false;
  let firstReport = true;

  while (true) {
    const { DaemonSets, Deployments, StatefulSets, Certificates } = yield call(
      options.getResourceInputs
    );

    if (clusterIsEmpty(Deployments, DaemonSets, StatefulSets, Certificates)) {
      // Still starting up so skip processing
      yield delay(1 * SECOND);
      continue;
    }
    // Check DaemonSets
    const activeDaemonSets = activeDaemonsets(DaemonSets);

    // Check Deployments
    const activeDeploys = activeDeployments(Deployments);

    // Check StatefulSets
    const activeStatefulSets = activeStatefulsets(StatefulSets);

    // Check Certificates
    const activeCerts = activeCertificates(Certificates);

    const daemonSetStatusChange = activeDaemonSets.filter(
      active => !lastActiveDaemonSets.find(existing => existing === active)
    );

    const deploymentStatusChange = activeDeploys.filter(
      active => !lastActiveDeployments.find(existing => existing === active)
    );

    const statefulSetStatusChange = activeStatefulSets.filter(
      active => !lastActiveStatefulSets.find(existing => existing === active)
    );

    const certificateStatusChange = activeCerts.filter(
      active => !lastActiveCerts.find(existing => existing === active)
    );

    const waitingForCount =
      activeDaemonSets.length +
      activeDeployments.length +
      activeStatefulSets.length;

    const didWaitingForCountChange =
      lastActiveDaemonSets.length !== activeDaemonSets.length ||
      lastActiveDeployments.length !== activeDeployments.length ||
      lastActiveStatefulSets.length !== activeStatefulSets.length;

    const didWaitingForContentChange =
      daemonSetStatusChange.length ||
      deploymentStatusChange.length ||
      statefulSetStatusChange.length ||
      certificateStatusChange.length;

    if (waitingForCount > 0 && noActivesSince !== Infinity) {
      noActivesSince = Infinity;
    }

    if (waitingForCount === 0 && noActivesSince === Infinity) {
      noActivesSince = Date.now();
    }

    const isReadyNow = Date.now() - noActivesSince > 10 * SECOND;
    const shouldSendHeartbeat = Date.now() - lastHeartbeat > 60 * SECOND;

    if (
      didWaitingForCountChange ||
      didWaitingForContentChange ||
      ready !== isReadyNow ||
      shouldSendHeartbeat ||
      firstReport
    ) {
      yield call(options.onChange, {
        ready: isReadyNow,
        activeDaemonSets: activeDaemonSets,
        activeDeployments: activeDeploys,
        activeStatefulSets: activeStatefulSets,
        certificates: activeCerts
      });

      firstReport = false;
      ready = isReadyNow;
      lastHeartbeat = Date.now();
      lastActiveDaemonSets = activeDaemonSets;
      lastActiveDeployments = activeDeploys;
      lastActiveStatefulSets = activeStatefulSets;
      lastActiveCerts = activeCerts;
    }

    yield delay(1 * SECOND);
  }
}
