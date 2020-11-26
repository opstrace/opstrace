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

//@ts-ignore : don't know the reason but have to add one now for ESLint :-).
import Compute from "@google-cloud/compute";
import { SECOND } from "@opstrace/utils";

class Router extends Compute {
  constructor(options = {}) {
    super(options);
  }
  createGateway(
    name: string,
    region: string,
    network: string,
    project: string,
    callback: (err: any, data: any) => Record<string, unknown>
  ) {
    //@ts-ignore : don't know the reason but have to add one now for ESLint :-).
    this.request(
      {
        method: "POST",
        uri: `/regions/${region}/routers`,
        json: {
          name,
          network: `projects/${project}/global/networks/${network}`,
          nats: [
            {
              name,
              natIpAllocateOption: "AUTO_ONLY",
              sourceSubnetworkIpRangesToNat: "ALL_SUBNETWORKS_ALL_IP_RANGES"
            }
          ]
        }
      },
      callback
    );
  }
  destroyGateway(
    name: string,
    region: string,
    callback: (err: any, data: any) => Record<string, unknown>
  ) {
    //@ts-ignore: don't know the reason but have to add one now for ESLint :-).
    this.request(
      {
        method: "DELETE",
        uri: `/regions/${region}/routers/${name}`
      },
      callback
    );
  }
  getGateway(
    name: string,
    region: string,
    callback: (err: any, data: any) => void
  ) {
    //@ts-ignore: don't know the reason but have to add one now for ESLint :-).
    this.request(
      {
        method: "GET",
        uri: `/regions/${region}/routers/${name}`
      },
      callback
    );
  }
}

const doesGatewayExist = async (
  client: Router,
  { name, region }: { name: string; region: string }
): Promise<boolean> =>
  // Note(JP): we certainly want to clean that code up.
  // eslint-disable-next-line no-async-promise-executor
  new Promise(async res => {
    try {
      await new Promise((resolve, reject) => {
        client.getGateway(name, region, (err: any, data: any) => {
          if (err) {
            reject(err);
          } else {
            resolve(true);
          }
        });
      });
      res(true);
    } catch (e) {
      res(false);
    }
  });

const createGateway = (
  client: any,
  {
    name,
    region,
    network,
    project
  }: {
    name: string;
    region: string;
    network: string;
    project: string;
  }
) =>
  new Promise((resolve, reject) => {
    client.createGateway(name, region, network, project, (err: any, _: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });

const destroyGateway = (
  client: any,
  {
    name,
    region
  }: {
    name: string;
    region: string;
  }
) =>
  new Promise((resolve, reject) => {
    client.destroyGateway(name, region, (err: any, _: any) => {
      if (err) {
        reject(err);
      } else {
        resolve(true);
      }
    });
  });

export interface NatRequest {
  name: string;
  region: string;
  gcpProjectID: string;
}

export function* ensureGatewayExists({
  name,
  region,
  gcpProjectID
}: NatRequest) {
  const client = new Router();

  while (true) {
    const existingGateway: boolean = yield call(doesGatewayExist, client, {
      name,
      region
    });

    if (!existingGateway) {
      try {
        yield call(createGateway, client, {
          name,
          network: name,
          project: gcpProjectID,
          region
        });
      } catch (e) {
        if (!e.code || (e.code && e.code !== 409)) {
          throw e;
        }
      }
    }
    if (existingGateway) {
      return existingGateway;
    }

    yield delay(10 * SECOND);
  }
}

export function* ensureGatewayDoesNotExist(
  opstraceClusterName: string,
  gcpRegion: string
) {
  const client = new Router();

  while (true) {
    const existingGateway: boolean = yield call(doesGatewayExist, client, {
      name: opstraceClusterName,
      region: gcpRegion
    });

    if (!existingGateway) {
      return;
    }
    try {
      yield call(destroyGateway, client, {
        name: opstraceClusterName,
        region: gcpRegion
      });
    } catch (e) {
      if (!e.code || (e.code && e.code !== 404)) {
        throw e;
      }
    }

    yield delay(30 * SECOND);
  }
}
