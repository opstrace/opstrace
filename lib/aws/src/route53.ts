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

import { log, sleep } from "@opstrace/utils";

import { awsPromErrFilter, r53Client } from "./util";
import { AWSApiError } from "./types";

/**
 * Purge all Route 53 hosted zones associated with the provided DNS name.
 *
 * A hosted zone is a container for DNS record sets.
 *
 * There might be zero, one or many zones matching the provided DNS name.
 *
 * For every matching zone:
 *
 *  1) Iterate over one or more batches of DNS record sets in the zone.
 *
 *     For every batch of DNS record sets (yes, a set of sets)
 *
 *     1.1) construct a so-called change request, instructing Route 53 to
 *          delete the vast majority of records (all of those that are allowed
 *          to be deleted).
 *
 *     1.2) follow the status of this change request in a polling fashion (via
 *          its change ID). Wait for it to complete.
 *
 *  2) submit a request for deleting the zone entity itself, and then follow
 *     the status of this change request in a polling fashion (via its change
 *     ID). Wait for it to complete.
 *
 * Return after all matching zones have been deleted in the described fashion.
 */
export async function route53PurgeZonesForDnsName(
  dnsName: string
): Promise<void> {
  log.info("Purge Route53 hosted zone(s) for DNS name: %s", dnsName);

  while (true) {
    log.info("route53: get zone for DNS name: %s", dnsName);
    const zone = await getZoneForDNSName(dnsName);

    // Repeat the zone lookup/purge sequence until 0 zones associated with this
    // DNS name are returned by the ListHostedZonesByName API call.
    if (!zone) {
      log.info("route53: no hosted zone found, done");
      break;
    }

    log.info("route53: found hosted zone %s", zone.Id);

    // Enter loop for wiping all wipeable records from this zone.
    while (true) {
      // When many record sets are stored in this zone then a single
      // `getSomeRecordsForZone()` call might not return all of them.
      const recordsets = await getRecordsForZone(zone);

      //log.debug("record sets: %s", JSON.stringify(recordsets, null, 2));
      log.info(
        "route53: retrieved %s record sets from zone",
        recordsets.length
      );

      const deletionDone = await deleteRecordsInZone(recordsets, zone);

      if (deletionDone) {
        log.info("route53: no more records to delete");
        break;
      }
    }

    log.info("route53: delete the hosted zone itself");
    try {
      await deleteHostedZone(zone);
    } catch (e) {
      if (e instanceof AWSApiError && e.name == "NoSuchHostedZone") {
        log.info("error during zone deletion: %s, ignore", e.name);
      } else {
        throw e;
      }
    }
  }

  log.info("route53: deleted all zones for DNS name %s", dnsName);
}

/**
 * Delete a hosted zone.
 *
 * This task cannot be followed within a single HTTP request/response cycle,
 * but is reflected as an asynchronous task in the Route 53 HTTP API. Follow it
 * in a polling fashion.
 */
async function deleteHostedZone(zone: Route53.HostedZone) {
  const result: Route53.DeleteHostedZoneResponse = await awsPromErrFilter(
    r53Client().deleteHostedZone({ Id: zone.Id }).promise()
  );

  const changeinfo = result.ChangeInfo;

  if (changeinfo.Status == "INSYNC") {
    log.info("route53: zone deletion INSYNC, done");
    return;
  }

  log.info("route53: zone deletion status: %s", result.ChangeInfo.Status);

  await waitForChangeToComplete(changeinfo);
}

/**
 * Return a (at most one) Route53 hosted zone associated with the specified DNS
 * name, or `undefined` when no such zone could be found.
 *
 * The `listHostedZonesByName()` API call has peculiar behavior: even when
 * called with the `DNSName` parameter for narrowing down the search the
 * response will contain other zones for other DNS names (when those exist);
 * this parameter only makes it so that *if* a zone with that DNS name exists
 * it will be returned _first_ in the response enumeration. From docs: "include
 * the dnsname parameter only if you want to specify the name of the first
 * hosted zone in the response."
 *
 * Combine this with the `maxItems: 1` boundary condition.
 */
export async function getZoneForDNSName(
  dnsName: string
): Promise<Route53.HostedZone | undefined> {
  const params = { DNSName: dnsName, MaxItems: "1" };
  const res: Route53.ListHostedZonesByNameResponse = await awsPromErrFilter(
    r53Client().listHostedZonesByName(params).promise()
  );

  // There might be 0, 1 or many zones matching the DNS name in the request.
  // Identify case `1` or `many` vs `0` with the `Name == dnsName` check.
  // Distinguishing between `1` and `many` is not done by this function.
  if (res.HostedZones.length > 0 && res.HostedZones[0].Name == dnsName) {
    return res.HostedZones[0];
  }

  return undefined;
}

/**
 * Get at record sets for a specific zone.
 */
export async function getRecordsForZone(
  zone: Route53.HostedZone
): Promise<Route53.ResourceRecordSets> {
  log.info("route53: get records for zone (not necessarily all of them)");

  let result: Route53.ListResourceRecordSetsResponse;
  const records: Route53.ResourceRecordSets = [];
  const params: Route53.ListResourceRecordSetsRequest = {
    HostedZoneId: zone.Id
  };

  do {
    result = await awsPromErrFilter(
      r53Client().listResourceRecordSets(params).promise()
    );
    records.push(...result.ResourceRecordSets);

    if (result.IsTruncated) {
      log.debug(
        "route53: got truncated resource record sets response, fetching next batch"
      );
      params.StartRecordName = result.NextRecordName;
      params.StartRecordType = result.NextRecordType;
    }
  } while (result.IsTruncated);

  return records;
}

/**
 * Check if the provided record set is authoritative or not (if it can be
 * deleted from the zone or not).
 *
 * Background: if one submits a ChangeBatch for a zone and that tries to delete
 * too much then the change batch is rejected with:
 *
 *    InvalidChangeBatch: InvalidChangeBatch: [A HostedZone must contain at
 *    least one NS record for the zone itself., A HostedZone must contain
 *    exactly one SOA record.] (HTTP status code: 400)
 *
 * This function helps identifying these record sets.
 */
function isDefaultSOAorNSRecordset(
  recordset: Route53.ResourceRecordSet,
  zone: Route53.HostedZone
) {
  if (recordset.Type == "SOA" || recordset.Type == "NS") {
    if (recordset.Name == zone.Name) {
      return true;
    }
  }
  return false;
}

export async function sendChangeRequest(
  request: Route53.ChangeResourceRecordSetsRequest
): Promise<Route53.ChangeInfo> {
  const result: Route53.ChangeResourceRecordSetsResponse = await awsPromErrFilter(
    r53Client().changeResourceRecordSets(request).promise()
  );
  return result.ChangeInfo;
}

/**
 * Wait for so-called change request (identified by a change ID) to complete.
 *
 * Various kinds of asynchronous operations in the Route 53 API have to be
 * submitted as a "change request" and can then be followed with a so-called
 * change ID. Do this, wait for the task to complete.
 */
export async function waitForChangeToComplete(
  change: Route53.ChangeInfo
): Promise<void> {
  log.info("route53: wait for submitted change request to complete");

  while (true) {
    const result: Route53.GetChangeResponse = await awsPromErrFilter(
      r53Client().getChange({ Id: change.Id }).promise()
    );

    log.info("route53: change request status: %s", result.ChangeInfo.Status);

    if (result.ChangeInfo.Status == "INSYNC") {
      log.info("route53: change request completed");
      return;
    }

    await sleep(2);
  }
}

/**
 * Delete records `rsets` from the hosted zone `zone`.
 *
 * Filter `rsets` (do not try to delete records that are not allowed to be
 * deleted). Construct a so-called batch request. Send the request. Follow the
 * state change, wait for it to complete.
 *
 * (asynchronous state management: not reflected in a single HTTP request /
 * response cycle but through a change ID via which the status change /
 * progress can be followed in a polling fashion).
 *
 * Return `true` when no change request was submitted. i.e. when there was
 * nothing to delete anymore.
 *
 * Return `false` when a batch request was send and completed.
 */
async function deleteRecordsInZone(
  rsets: Route53.ResourceRecordSets,
  zone: Route53.HostedZone
): Promise<boolean> {
  const changes: Route53.Change[] = [];

  for (const recordset of rsets) {
    // recordset is Route53.ResourceRecordSet with for example the following
    // structure
    //
    // {
    //     "Name": "bk-1791-512-a.aws.opstrace.io.",
    //     "Type": "NS",
    //     "TTL": 172800,
    //     "ResourceRecords": [
    //       {
    //         "Value": "ns-988.awsdns-59.net."
    //       },
    //       {
    //         "Value": "ns-1349.awsdns-40.org."
    //       },
    //       {
    //         "Value": "ns-1608.awsdns-09.co.uk."
    //       },
    //       {
    //         "Value": "ns-334.awsdns-41.com."
    //       }
    //     ]
    //   },

    // Attempt to delete all non-default SOA/NS records, as inspired by
    // barnybug/cli53.
    if (!isDefaultSOAorNSRecordset(recordset, zone)) {
      // When we're here then certain recordsets might look like the following,
      // with an empty array set as `ResourceRecords`:
      // {
      //     "Name": "prometheus.default.bk-1791-512-a.aws.opstrace.io.",
      //     "Type": "A",
      //     "ResourceRecords": [],
      //     "AliasTarget": {
      //       "HostedZoneId": "Z18D5FSROUN65G",
      //       "DNSName": "ab827bb3ceff340a8824126b5595240c-5d11cee8ae0dfed2.elb.us-west-2.amazonaws.com.",
      //       "EvaluateTargetHealth": true
      //     }
      //   },
      //
      // Adding this as-is in a DELETE change request is invalidated by the API
      // implementation, with the following error being returned in a 400 Bad
      // Request response: "Invalid XML ; cvc-complex-type.2.4.b: The content of
      // element 'ResourceRecords' is not complete"
      // also see https://github.com/aws/aws-sdk-js/issues/3411

      if (recordset.ResourceRecords?.length == 0) {
        delete recordset.ResourceRecords;
      }

      log.debug("construct Change for record set type %s", recordset.Type);

      const change: Route53.Change = {
        Action: "DELETE",
        ResourceRecordSet: recordset
      };

      changes.push(change);
    }
  }

  if (changes.length > 0) {
    const changeBatch: Route53.ChangeBatch = {
      Comment: "opstrace uninstaller",
      Changes: changes
    };

    const request: Route53.ChangeResourceRecordSetsRequest = {
      ChangeBatch: changeBatch,
      HostedZoneId: zone.Id
    };

    log.info("route53: submit batch request for record set deletion");

    const changeInfo = await sendChangeRequest(request);

    await waitForChangeToComplete(changeInfo);
    return false;
  }

  log.info(
    "route53: no (or only default SOA/NS) records remaining: no change request submitted"
  );
  return true;
}
