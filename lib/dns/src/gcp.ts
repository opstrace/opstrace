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

import { DNS } from "@google-cloud/dns";
import { DNSZone, DNSRecord } from "./types";
import { constructNSRecordOptions } from "./util";

const getName = (dnsName: string): string =>
  dnsName.replace(/\.$/, "").replace(/\./g, "-");

export const getZone = async ({
  dnsName,
  dns
}: {
  dnsName: string;
  dns: DNS;
}): Promise<{
  zone: DNSZone | undefined;
  records: DNSRecord[] | undefined;
}> => {
  return new Promise((resolve, reject) =>
    dns
      .getZones()
      .then(async results => {
        const zones = results[0];
        const zone = zones.find(z => z.metadata.dnsName === dnsName);
        if (zone) {
          await zone.getRecords().then(res => {
            const records: DNSRecord[] = res[0]
              .filter(r => r.type === "NS")
              .map(r => ({
                name: r.metadata.name,
                type: r.type,
                ttl: r.metadata.ttl,
                rrdatas: r.data as string[]
              }));
            const { name, dnsName } = zone.metadata;
            resolve({ zone: { name, dnsName }, records });
          });
        }
        resolve({ zone: undefined, records: undefined });
      })
      .catch(err => {
        reject(err);
      })
  );
};

export const createZone = async ({
  dnsName,
  dns
}: {
  dnsName: string;
  dns: DNS;
}): Promise<any> => {
  const name = getName(dnsName);
  return dns.createZone(name, {
    description: `Managed by Opstrace`,
    dnsName,
    name
  });
};

export const deleteZone = async ({
  dnsName,
  dns
}: {
  dnsName: string;
  dns: DNS;
}): Promise<any> => {
  const name = getName(dnsName);
  return dns.zone(name).delete({
    force: true
  });
};

export const addNSRecord = async ({
  dns,
  zone,
  record
}: {
  dns: DNS;
  zone: DNSZone;
  record: ReturnType<typeof constructNSRecordOptions>;
}): Promise<any> => {
  return dns
    .zone(zone.name!)
    .addRecords([dns.zone(zone.name!).record("ns", record)]);
};

export const removeNSRecord = async ({
  dns,
  zone,
  record
}: {
  dns: DNS;
  zone: DNSZone;
  record: DNSRecord;
}): Promise<any> => {
  return dns.zone(zone.name!).deleteRecords([
    dns.zone(zone.name!).record("ns", {
      name: record.name!,
      data: record.rrdatas!,
      ttl: record.ttl!
    })
  ]);
};
