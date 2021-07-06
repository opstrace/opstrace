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

import { ClusterConfigFileSchemaV2 } from "./schemasv2"


describe("ClusterConfigFileSchemaV2", () => {
    const generateValidClusterConfigFile = (overwrite = {}) => ({
        node_count: 3,
        controller_image: "some-controller-image",
        tenants: ["validtenant"],
        env_label: "some-env-label",
        cert_issuer: "letsencrypt-staging",
        log_retention_days: 7,
        metric_retention_days: 7,
        data_api_authentication_disabled: true,
        data_api_authorized_ip_ranges: ["0.0.0.0/0"],
        aws: {},
        gcp: {},
        ...overwrite
    })
    it("should accept valid schema", async () => {
        const configFile = generateValidClusterConfigFile()
        expect(await ClusterConfigFileSchemaV2.isValid(configFile)).toBe(true)
    })

    describe("tenants", () => {
        it("length may not be <1", async () => {
            const configFile = generateValidClusterConfigFile({ tenants: [] })
            expect(await ClusterConfigFileSchemaV2.isValid(configFile)).toBe(false)
        })

        it("name may not contain capital letters", async () => {
            const configFile = generateValidClusterConfigFile({ tenants: ["Capital"] })
            expect(await ClusterConfigFileSchemaV2.isValid(configFile)).toBe(false)
        })

        it("name may include numbers", async () => {
            const configFile = generateValidClusterConfigFile({ tenants: ["luckynumber7"] })
            expect(await ClusterConfigFileSchemaV2.isValid(configFile)).toBe(true)
        })

        it("name may start with number", async () => {
            const configFile = generateValidClusterConfigFile({ tenants: ["7yeah"] })
            expect(await ClusterConfigFileSchemaV2.isValid(configFile)).toBe(true)
        })

        it("name may contain only numbers", async () => {
            const configFile = generateValidClusterConfigFile({ tenants: ["123456"] })
            expect(await ClusterConfigFileSchemaV2.isValid(configFile)).toBe(true)
        })

        it("name may be very short", async () => {
            const configFile = generateValidClusterConfigFile({ tenants: ["a"] })
            expect(await ClusterConfigFileSchemaV2.isValid(configFile)).toBe(true)
        })

        it("name may not contain special characters", async () => {
            const configFile = generateValidClusterConfigFile({ tenants: ["abc^def"] })
            expect(await ClusterConfigFileSchemaV2.isValid(configFile)).toBe(false)
        })

        it("name may not contain hyphen", async () => {
            const configFile = generateValidClusterConfigFile({ tenants: ["my-tenant"] })
            expect(await ClusterConfigFileSchemaV2.isValid(configFile)).toBe(false)
        })
    })
})