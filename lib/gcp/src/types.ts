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

import * as yup from "yup";
import * as t from "io-ts";
import { CredentialBody } from "google-auth-library";

export const gcpConfigSchema = yup.object({
  projectId: yup.string(),
  certManagerServiceAccount: yup.string()
});

export type GCPConfig = yup.InferType<typeof gcpConfigSchema>;

export const serviceAccountSchema = yup
  .object({
    auth_uri: yup.string().required(),
    auth_provider_x509_cert_url: yup.string().required(),
    client_email: yup.string().required(),
    client_id: yup.string().required(),
    client_x509_cert_url: yup.string().required(),
    private_key: yup.string().required(),
    private_key_id: yup.string().required(),
    project_id: yup.string().required(),
    type: yup.string().required(),
    token_uri: yup.string().required()
  })
  .noUnknown()
  .defined();

export type GCPServiceAccount = CredentialBody;

export const gcpAuthOptionsSchema = yup
  .object({
    projectId: yup.string().required("must provide projectId"),
    credentials: serviceAccountSchema.required()
  })
  .defined();

export type GCPAuthOptions = yup.InferType<typeof gcpAuthOptionsSchema>;

export type BigtableDeploymentType = "development" | "production";
export type BigtableStorageType = "hdd" | "ssd";

// GKE cluster status constants
export const ERROR = "ERROR";
export const DEGRADED = "DEGRADED";
export const STOPPING = "STOPPING";
export const RECONCILING = "RECONCILING";
export const RUNNING = "RUNNING";
export const PROVISIONING = "PROVISIONING";
export const STATUS_UNSPECIFIED = "STATUS_UNSPECIFIED";

// GKE NetworkProviders
export const PROVIDER_UNSPECIFIED = "PROVIDER_UNSPECIFIED";
export const CALICO = "CALICO";

// GKE etcd encryption
export const ENCRYPTED = "ENCRYPTED";
export const DECRYPTED = "DECRYPTED";
// Also has UNKNOWN type too but it's already declared below

// GKE node taints
export const EFFECT_UNSPECIFIED = "EFFECT_UNSPECIFIED";
export const NO_SCHEDULE = "NO_SCHEDULE";
export const PREFER_NO_SCHEDULE = "PREFER_NO_SCHEDULE";
export const NO_EXECUTE = "NO_EXECUTE";

// GKE node StatusConditions
export const UNKNOWN = "UNKNOWN";
export const GCE_STOCKOUT = "GCE_STOCKOUT";
export const GKE_SERVICE_ACCOUNT_DELETED = "GKE_SERVICE_ACCOUNT_DELETED";
export const GCE_QUOTA_EXCEEDED = "GCE_QUOTA_EXCEEDED";
export const SET_BY_OPERATOR = "SET_BY_OPERATOR";
export const CLOUD_KMS_KEY_ERROR = "CLOUD_KMS_KEY_ERROR";

const nodePoolConfig = t.interface({
  machineType: t.string,
  diskSizeGb: t.number,
  oauthScopes: t.array(t.string),
  serviceAccount: t.string,
  metadata: t.any,
  imageType: t.string,
  labels: t.any,
  localSsdCount: t.number,
  tags: t.array(t.string),
  preemptible: t.boolean,
  accelerators: t.array(
    t.partial(
      t.interface({
        acceleratorCount: t.string,
        acceleratorType: t.string
      }).props
    )
  ),
  diskType: t.string,
  minCpuPlatform: t.string,
  taints: t.array(
    t.partial(
      t.interface({
        key: t.string,
        value: t.string,
        effect: t.keyof({
          EFFECT_UNSPECIFIED: null,
          NO_SCHEDULE: null,
          PREFER_NO_SCHEDULE: null,
          NO_EXECUTE: null
        })
      }).props
    )
  ),
  shieldedInstanceConfig: t.partial(
    t.interface({
      enableSecureBoot: t.boolean,
      enableIntegrityMonitoring: t.boolean
    }).props
  )
});

export const nodePool = t.interface({
  name: t.string,
  config: t.partial(nodePoolConfig.props),
  initialNodeCount: t.number,
  selfLink: t.string,
  version: t.string,
  instanceGroupUrls: t.array(t.string),
  status: t.keyof({
    ERROR: null,
    DEGRADED: null,
    STOPPING: null,
    RECONCILING: null,
    RUNNING: null,
    PROVISIONING: null,
    STATUS_UNSPECIFIED: null
  }),
  statusMessage: t.string,
  autoscaling: t.partial(
    t.interface({
      enabled: t.boolean,
      minNodeCount: t.number,
      maxNodeCount: t.number,
      autoprovisioned: t.boolean
    }).props
  ),
  management: t.partial(
    t.interface({
      autoUpgrade: t.boolean,
      autoRepair: t.boolean,
      upgradeOptions: t.partial(
        t.interface({
          autoUpgradeStartTime: t.string,
          description: t.string
        }).props
      )
    }).props
  ),
  maxPodsConstraint: t.partial(
    t.interface({
      maxPodsPerNode: t.string
    }).props
  ),
  conditions: t.array(
    t.partial(
      t.interface({
        code: t.keyof({
          UNKNOWN: null,
          GCE_STOCKOUT: null,
          GKE_SERVICE_ACCOUNT_DELETED: null,
          GCE_QUOTA_EXCEEDED: null,
          SET_BY_OPERATOR: null,
          CLOUD_KMS_KEY_ERROR: null
        }),
        message: t.string
      }).props
    )
  ),
  podIpv4CidrSize: t.number
});

export const partialNodePool = t.partial(nodePool.props);

export const gkeCluster = t.partial(
  t.interface({
    name: t.string,
    description: t.string,
    releaseChannel: t.partial(
      t.interface({
        channel: t.keyof({
          RAPID: null,
          REGULAR: null,
          STABLE: null
        })
      }).props
    ),
    masterAuth: t.partial(
      t.interface({
        username: t.string,
        password: t.string,
        clientCertificateConfig: t.partial(
          t.interface({
            issueClientCertificate: t.boolean
          }).props
        ),
        clusterCaCertificate: t.string,
        clientCertificate: t.string,
        clientKey: t.string
      }).props
    ),
    loggingService: t.string,
    monitoringService: t.string,
    network: t.string,
    clusterIpv4Cidr: t.string,
    addonsConfig: t.partial(
      t.interface({
        httpLoadBalancing: t.partial(
          t.interface({
            disabled: t.boolean
          }).props
        ),
        horizontalPodAutoscaling: t.partial(
          t.interface({
            disabled: t.boolean
          }).props
        ),
        networkPolicyConfig: t.partial(
          t.interface({
            disabled: t.boolean
          }).props
        )
      }).props
    ),
    subnetwork: t.string,
    nodePools: t.array(partialNodePool),
    locations: t.array(t.string),
    enableKubernetesAlpha: t.boolean,
    resourceLabels: t.any,
    labelFingerprint: t.string,
    legacyAbac: t.partial(
      t.interface({
        enabled: t.boolean
      }).props
    ),
    networkPolicy: t.partial(
      t.interface({
        provider: t.keyof({
          CALICO: null,
          PROVIDER_UNSPECIFIED: null
        }),
        enabled: t.boolean
      }).props
    ),
    ipAllocationPolicy: t.partial(
      t.interface({
        useIpAliases: t.boolean,
        createSubnetwork: t.boolean,
        subnetworkName: t.string,
        clusterSecondaryRangeName: t.string,
        servicesSecondaryRangeName: t.string,
        clusterIpv4CidrBlock: t.string,
        nodeIpv4CidrBlock: t.string,
        servicesIpv4CidrBlock: t.string,
        tpuIpv4CidrBlock: t.string
      }).props
    ),
    masterAuthorizedNetworksConfig: t.partial(
      t.interface({
        enabled: t.boolean,
        cidrBlocks: t.array(
          t.partial(
            t.interface({
              displayName: t.string,
              cidrBlock: t.string
            }).props
          )
        )
      }).props
    ),
    maintenancePolicy: t.partial(
      t.interface({
        window: t.interface({
          dailyMaintenanceWindow: t.partial(
            t.interface({
              startTime: t.string,
              duration: t.string
            }).props
          )
        })
      }).props
    ),
    binaryAuthorization: t.partial(
      t.interface({
        enabled: t.boolean
      }).props
    ),
    autoscaling: t.partial(
      t.interface({
        enableNodeAutoprovisioning: t.boolean,
        resourceLimits: t.array(
          t.partial(
            t.interface({
              resourceType: t.string,
              minimum: t.string,
              maximum: t.string
            }).props
          )
        ),
        autoprovisioningNodePoolDefaults: t.partial(
          t.interface({
            oauthScopes: t.array(t.string),
            serviceAccount: t.string
          }).props
        ),
        autoprovisioningLocations: t.array(t.string)
      }).props
    ),
    networkConfig: t.partial(
      t.interface({
        network: t.string,
        subnetwork: t.string,
        enableIntraNodeVisibility: t.boolean
      }).props
    ),
    resourceUsageExportConfig: t.partial(
      t.interface({
        bigqueryDestination: t.partial(
          t.interface({
            datasetId: t.string
          }).props
        ),
        enableNetworkEgressMetering: t.boolean,
        consumptionMeteringConfig: t.partial(
          t.interface({
            enabled: t.boolean
          }).props
        )
      }).props
    ),
    authenticatorGroupsConfig: t.partial(
      t.interface({
        enabled: t.boolean,
        securityGroup: t.string
      }).props
    ),
    privateClusterConfig: t.partial(
      t.interface({
        enablePrivateNodes: t.boolean,
        enablePrivateEndpoint: t.boolean,
        masterIpv4CidrBlock: t.string,
        privateEndpoint: t.string,
        publicEndpoint: t.string
      }).props
    ),
    databaseEncryption: t.partial(
      t.interface({
        state: t.keyof({
          UNKNOWN: null,
          ENCRYPTED: null,
          DECRYPTED: null
        }),
        keyName: t.string
      }).props
    ),
    verticalPodAutoscaling: t.partial(
      t.interface({
        enabled: t.boolean
      }).props
    ),
    // https://cloud.google.com/kubernetes-engine/docs/reference/rest/v1/projects.locations.clusters
    workloadIdentityConfig: t.partial(
      t.interface({
        workloadPool: t.string
      }).props
    ),
    selfLink: t.string,
    endpoint: t.string,
    initialClusterVersion: t.string,
    currentMasterVersion: t.string,
    createTime: t.string,
    status: t.keyof({
      ERROR: null,
      DEGRADED: null,
      STOPPING: null,
      RECONCILING: null,
      RUNNING: null,
      PROVISIONING: null,
      STATUS_UNSPECIFIED: null,
      DOES_NOT_EXIST: null,
      UNKNOWN: null
    }),
    statusMessage: t.string,
    nodeIpv4CidrSize: t.number,
    servicesIpv4Cidr: t.string,
    expireTime: t.string,
    location: t.string,
    enableTpu: t.boolean,
    tpuIpv4CidrBlock: t.string,
    conditions: t.array(
      t.partial(
        t.interface({
          code: t.keyof({
            UNKNOWN: null,
            GCE_STOCKOUT: null,
            GKE_SERVICE_ACCOUNT_DELETED: null,
            GCE_QUOTA_EXCEEDED: null,
            SET_BY_OPERATOR: null,
            CLOUD_KMS_KEY_ERROR: null,
            DOES_NOT_EXIST: null
          }),
          message: t.string
        }).props
      )
    )
  }).props
);

export const network = t.interface({
  cidr: t.string,
  subnet: t.string
});

export type GKECluster = t.TypeOf<typeof gkeCluster>;
export type Network = t.TypeOf<typeof network>;
