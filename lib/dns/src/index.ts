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

import { delay, call } from "redux-saga/effects";
import { DNS } from "@google-cloud/dns";
import { Route53 } from "aws-sdk";
import { DNSZone, DNSRecord, Provider } from "./types";
import { getSubdomain } from "./util";
import { DNSClient } from "./opstrace";

import * as GCP from "./gcp";
import * as AWS from "./aws";

import { SECOND, log } from "@opstrace/utils";

export { DNSClient } from "./opstrace";

type Zone = {
  zone: DNSZone | undefined;
  records: DNSRecord[] | undefined;
};

export const getZone = async ({
  provider,
  dnsName,
  dns
}: {
  dnsName: string;
  dns: DNS | Route53;
  provider: Provider;
}): Promise<Zone> => {
  if (provider === "gcp") {
    return GCP.getZone({ dnsName, dns: dns as DNS });
  }
  if (provider === "aws") {
    return AWS.getZone({ dnsName, dns: dns as Route53 });
  }
  return Promise.resolve({ zone: undefined, records: undefined });
};

const createZone = async ({
  dnsName,
  dns,
  provider
}: {
  dnsName: string;
  dns: DNS | Route53;
  provider: Provider;
}): Promise<any> => {
  if (provider === "gcp") {
    return GCP.createZone({ dnsName, dns: dns as DNS });
  }
  if (provider === "aws") {
    return AWS.createZone({ dnsName, dns: dns as Route53 });
  }
  return Promise.resolve(null);
};

const deleteZone = async ({
  dnsName,
  name,
  dns
}: {
  dnsName: string;
  name: string;
  dns: DNS | Route53;
}): Promise<any> => {
  log.debug("deleteZone()");
  // only for GCP since opstrace-prelaunch/issues/1225
  return GCP.deleteZone({ dnsName, dns: dns as DNS });
};

export interface DNSRequest {
  opstraceClusterName: string;
  dnsName: string;
  target: Provider;
  dnsProvider: Provider;
}

export function* ensureDNSExists({
  opstraceClusterName,
  dnsName,
  dnsProvider,
  target
}: DNSRequest) {
  const provider = dnsProvider;
  let gcpDNS;
  let awsDNS;

  const opstraceClient = yield call([DNSClient, DNSClient.getInstance]);

  // quick tranlation of canonical opstrace cluster name into legacy stack name
  const stackName = opstraceClusterName;

  log.info("setting up DNS");

  if (provider === "gcp" || target === "gcp") {
    gcpDNS = new DNS();
  }
  if (provider === "aws" || target === "aws") {
    awsDNS = new Route53();
  }

  const clusters = yield call([opstraceClient, opstraceClient.GetAll]);

  log.debug(
    "DNS API client GetAll() yielded clusters: %s",
    JSON.stringify(clusters, null, 2)
  );

  if (!clusters.find((e: any) => e["clustername"] == opstraceClusterName)) {
    log.debug(
      "cluster name nto find in opstraceClient.GetAll() response, call opstraceClient.Create()"
    );
    yield call([opstraceClient, opstraceClient.Create], opstraceClusterName);
  }
  // Ensure subzone exists
  const subZoneName = getSubdomain({ stackName, dnsName });

  while (true) {
    const subZone: Zone = yield call(getZone, {
      dnsName: subZoneName,
      dns: target === "aws" ? (awsDNS as Route53) : (gcpDNS as DNS),
      provider: target
    });

    yield delay(1 * SECOND);

    // Create the subZone
    if (!subZone.zone) {
      try {
        yield call(createZone, {
          dnsName: subZoneName,
          dns: target === "aws" ? (awsDNS as Route53) : (gcpDNS as DNS),
          provider: target
        });
      } catch (err) {
        if (!err.code || (err.code && err.code !== 409)) {
          throw err;
        } else {
          log.info("ignore: %s", err.message);
        }
      }
      continue;
    }
    // Add NS record to root
    const subdomainNsRecord = subZone.records!.find(r => r.type === "NS");
    yield call(
      [opstraceClient, opstraceClient.AddNameservers],
      stackName,
      subdomainNsRecord!.rrdatas!
    );
    return subZoneName;
  }
}

// note(jp): quickndirtily changed to only support GCP since
// opstrace-prelaunch/issues/1225
export function* destroyDNS({
  stackName,
  dnsName
}: {
  stackName: string;
  dnsName: string;
}) {
  const opstraceClient = yield call([DNSClient, DNSClient.getInstance]);

  const gcpDNS = new DNS();

  const subZoneName = getSubdomain({ stackName, dnsName });

  const subZone: Zone = yield call(getZone, {
    dnsName: subZoneName,
    dns: gcpDNS as DNS,
    provider: "gcp" as "gcp" | "aws"
  });

  // Delete the subZone
  if (subZone.zone) {
    try {
      yield call(deleteZone, {
        dnsName: subZoneName,
        name: subZone.zone.name!,
        dns: gcpDNS as DNS
      });
    } catch (err) {
      if (err.code && err.code === 404) {
        log.info("ignore: %s", err.message);
      } else {
        throw err;
      }
    }
  }

  yield call([opstraceClient, opstraceClient.Delete], stackName);
}
