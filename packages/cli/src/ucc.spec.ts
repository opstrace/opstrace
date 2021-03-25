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

import fs from 'fs';

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn,
    info: jest.fn
  }
}));

import {
    LatestAWSInfraConfigType,
    LatestGCPInfraConfigType
 } from "@opstrace/config";

import {
    LatestClusterConfigFileSchemaType
} from "./schemas";

import { uccGetAndValidate } from "./ucc";

var tmpDir = "";

beforeAll(() => {
    // create temp dir to store config files used in the tests
    tmpDir = fs.mkdtempSync("ucctests")
});

afterAll(() => {
    // cleanup the temp dir
    fs.rmdirSync(tmpDir, {recursive: true});
});

test("should parse and validate latest cluster config file for AWS", async () => {
    const filename = tmpDir + "/" + "aws-test.yaml";
    const configFile = `
tenants:
    - prod
    - dev
env_label: unit-tests
node_count: 3
aws:
    eks_admin_roles:
    - SomeRoleName
`
    fs.writeFileSync(filename, configFile);

    const [userClusterConfig, infraConfigAWS, infraConfigGCP]: [
        LatestClusterConfigFileSchemaType,
        LatestAWSInfraConfigType | undefined,
        LatestGCPInfraConfigType | undefined
    ] = await uccGetAndValidate(filename, "aws");

    expect(userClusterConfig).toEqual(
        {
          "cert_issuer": "letsencrypt-staging",
          "controller_image": "opstrace/controller:7e47b0d89-dev",
          "data_api_authentication_disabled": false,
          "data_api_authorized_ip_ranges": [
            "0.0.0.0/0",
          ],
          "env_label": "unit-tests",
          "log_retention_days": 7,
          "metric_retention_days": 7,
          "node_count": 3,
          "tenants": [
            "prod",
            "dev",
          ],
        }
    );
    expect(infraConfigAWS).toEqual(
        {
          "eks_admin_roles": [
            "SomeRoleName",
          ],
          "instance_type": "t3.xlarge",
          "region": "us-west-2",
          "zone_suffix": "a",
        }
    );
    expect(infraConfigGCP).toBeUndefined();
});

test("should parse and validate latest cluster config file for GCP", async () => {
    const filename = tmpDir + "/" + "gcp-test.yaml";
    const configFile = `
tenants:
    - prod
    - dev
env_label: unit-tests
node_count: 3
`
    fs.writeFileSync(filename, configFile);

    const [userClusterConfig, infraConfigAWS, infraConfigGCP]: [
        LatestClusterConfigFileSchemaType,
        LatestAWSInfraConfigType | undefined,
        LatestGCPInfraConfigType | undefined
    ] = await uccGetAndValidate(filename, "gcp");

    expect(userClusterConfig).toEqual(
        {
          "cert_issuer": "letsencrypt-staging",
          "controller_image": "opstrace/controller:7e47b0d89-dev",
          "data_api_authentication_disabled": false,
          "data_api_authorized_ip_ranges": [
            "0.0.0.0/0",
          ],
          "env_label": "unit-tests",
          "log_retention_days": 7,
          "metric_retention_days": 7,
          "node_count": 3,
          "tenants": [
            "prod",
            "dev",
          ],
        }
    );
    expect(infraConfigAWS).toBeUndefined();
    expect(infraConfigGCP).toEqual(
        {
          "machine_type": "n1-standard-4",
          "region": "us-west2",
          "zone_suffix": "a",
        }
    );
});
