/**
 * Copyright 2019-2021 Opstrace, Inc.
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

import { Route53 } from "aws-sdk";
import { DNSZone, DNSRecord } from "./types";
import { constructNSRecordOptions } from "./util";

export const getZone = async ({
  dnsName,
  dns
}: {
  dnsName: string;
  dns: Route53;
}): Promise<{
  zone: DNSZone | undefined;
  records: DNSRecord[] | undefined;
}> => {
  // Note(JP):it might be more convenient to use `listHostedZonesByName()`
  // with DNSname and maxItems set, also see lib/aws/route53.ts
  return new Promise((resolve, reject) =>
    dns.listHostedZones(async (err, data) => {
      if (err) {
        reject(err);
      }
      const zones = data.HostedZones;
      const zone = zones.find(z => z.Name === dnsName);

      if (zone) {
        const { Name, Id } = zone;
        dns.listResourceRecordSets({ HostedZoneId: Id }, (err, data) => {
          if (err) {
            return resolve({
              zone: { name: Id, dnsName: Name },
              records: undefined
            });
          }
          const records: DNSRecord[] = data.ResourceRecordSets.map(r => ({
            name: r.Name,
            type: r.Type,
            ttl: r.TTL,
            rrdatas: r.ResourceRecords?.map(r => r.Value)
          }));
          resolve({ zone: { name: Id, dnsName: Name }, records });
        });
      } else {
        resolve({ zone: undefined, records: undefined });
      }
    })
  );
};

// Note(JP): this does not follow the change, also see lib/aws/route53.ts
export const createZone = async ({
  dnsName,
  dns
}: {
  dnsName: string;
  dns: Route53;
}): Promise<void> => {
  return new Promise((resolve, reject) =>
    dns.createHostedZone(
      {
        CallerReference: Date.now().toString(),
        Name: dnsName,
        HostedZoneConfig: {
          Comment: `Managed by Opstrace`,
          PrivateZone: false
        }
      },
      err => {
        if (err) {
          reject(err);
        }
        resolve();
      }
    )
  );
};

// Note(JP): this does not follow the change, also see lib/aws/route53.ts
export const addNSRecord = async ({
  dns,
  zone,
  record
}: {
  dns: Route53;
  zone: DNSZone;
  record: ReturnType<typeof constructNSRecordOptions>;
}): Promise<void> => {
  return new Promise((resolve, reject) =>
    dns.changeResourceRecordSets(
      {
        ChangeBatch: {
          Changes: [
            {
              Action: "CREATE",
              ResourceRecordSet: {
                Name: record.name,
                ResourceRecords: record.data.map(d => ({ Value: d })),
                TTL: record.ttl,
                Type: "NS"
              }
            }
          ],
          Comment: `Managed by Opstrace`
        },
        // FIXME: What if our zone.name is indeed undefined?
        HostedZoneId: zone.name ?? ""
      },
      err => {
        if (err) {
          reject(err);
        }
        resolve();
      }
    )
  );
};
