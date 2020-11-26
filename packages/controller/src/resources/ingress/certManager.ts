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

import { KubeConfig } from "@kubernetes/client-node";
import {
  ResourceCollection,
  ServiceAccount,
  Secret,
  ClusterRole,
  ClusterRoleBinding,
  RoleBinding,
  Service,
  V1IssuerResource,
  V1CertificateResource,
  CustomResourceDefinition,
  Role,
  Deployment,
  certificates,
  certificaterequests,
  challenges,
  clusterIssuers,
  issuers,
  orders,
  V1ClusterissuerResource
} from "@opstrace/kubernetes";
import {
  getControllerConfig,
  getDomain,
  getTenantNamespace,
  getTenantDomain
} from "../../helpers";
import { State } from "../../reducer";
import { entries } from "@opstrace/utils";
import { DockerImages } from "@opstrace/controller-config";

function newGCPCredentialsSecret(
  namespace: string,
  gcpAuthOptions: any,
  kubeConfig: KubeConfig
): Secret {
  // Ensure keys are ordered or it will trigger an update
  // TODO: extract into a util
  const ordered: { [key: string]: string } = {};
  entries(gcpAuthOptions!.credentials)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(function ([key, value]) {
      ordered[key] = value;
    });

  return new Secret(
    {
      apiVersion: "v1",
      data: {
        "service-account.json": Buffer.from(JSON.stringify(ordered)).toString(
          "base64"
        )
      },
      kind: "Secret",
      metadata: {
        name: `gcp-service-account`,
        namespace: namespace
      },
      type: "Opaque"
    },
    kubeConfig
  );
}

function newAWSCredentialsSecret(
  namespace: string,
  awsAuthOptions: any,
  kubeConfig: KubeConfig
): Secret {
  return new Secret(
    {
      apiVersion: "v1",
      data: {
        secretAccessKey: Buffer.from(awsAuthOptions!.secretAccessKey).toString(
          "base64"
        )
      },
      kind: "Secret",
      metadata: {
        name: `aws-secret-access-key`,
        namespace: namespace
      },
      type: "Opaque"
    },
    kubeConfig
  );
}

export function CertManagerResources(
  state: State,
  kubeConfig: KubeConfig,
  namespace: string
): ResourceCollection {
  const collection = new ResourceCollection();
  //@ts-ignore: some of the versions in the CRD don't align with the extenstions/v1 CustomResourceDefinition.
  collection.add(new CustomResourceDefinition(certificates, kubeConfig));
  //@ts-ignore: some of the versions in the CRD don't align with the extenstions/v1 CustomResourceDefinition.
  collection.add(new CustomResourceDefinition(certificaterequests, kubeConfig));
  //@ts-ignore: some of the versions in the CRD don't align with the extenstions/v1 CustomResourceDefinition.
  collection.add(new CustomResourceDefinition(challenges, kubeConfig));
  collection.add(new CustomResourceDefinition(clusterIssuers, kubeConfig));
  collection.add(new CustomResourceDefinition(issuers, kubeConfig));
  //@ts-ignore: some of the versions in the CRD don't align with the extenstions/v1 CustomResourceDefinition.
  collection.add(new CustomResourceDefinition(orders, kubeConfig));

  const {
    target,
    gcpAuthOptions,
    region,
    awsAuthOptions,
    tlsCertificateIssuer
  } = getControllerConfig(state);

  let dns01 = {};

  if (target === "gcp") {
    if (!gcpAuthOptions) {
      throw new Error(
        "require gcpAuthOptions to set up dns challenge for certManager"
      );
    }

    dns01 = {
      cloudDNS: {
        project: gcpAuthOptions.projectId,
        serviceAccountSecretRef: {
          name: "gcp-service-account",
          key: "service-account.json"
        }
      }
    };

    collection.add(
      newGCPCredentialsSecret(namespace, gcpAuthOptions, kubeConfig)
    );
  }

  if (target === "aws") {
    if (!awsAuthOptions) {
      throw new Error(
        "require awsAuthOptions to set up dns challenge for certManager"
      );
    }
    dns01 = {
      route53: {
        accessKeyID: awsAuthOptions.accessKeyId,
        region,
        secretAccessKeySecretRef: {
          key: "secretAccessKey",
          name: "aws-secret-access-key"
        }
      }
    };

    collection.add(
      newAWSCredentialsSecret(namespace, awsAuthOptions, kubeConfig)
    );
  }

  //
  // list of domain names to include in the certificate.
  // example of how it looks with the system tenant:
  //
  // [
  //   "clustername.aws.opstrace.io",
  //   "system.clustername.aws.opstrace.io",
  //   *.system.clustername.aws.opstrace.io
  // ]
  //
  let domains: string[] = [getDomain(state)];
  state.tenants.list.tenants.forEach(tenant => {
    const tenantNamespace = getTenantNamespace(tenant);
    const host = getTenantDomain(tenant, state);

    if (target === "aws") {
      collection.add(
        newAWSCredentialsSecret(tenantNamespace, awsAuthOptions, kubeConfig)
      );
    }

    if (target === "gcp") {
      collection.add(
        newGCPCredentialsSecret(tenantNamespace, gcpAuthOptions, kubeConfig)
      );
    }

    domains = domains.concat([host, `*.${host}`]);
  });

  //
  // Self signed Issuers will issue self signed certificates. This is useful
  // when building PKI within Kubernetes, or as a means to generate a root CA
  // for use with the CA Issuer. A self-signed Issuer contains no additional
  // configuration fields.
  //
  collection.add(
    new V1ClusterissuerResource(
      {
        apiVersion: "cert-manager.io/v1",
        kind: "ClusterIssuer",
        metadata: {
          name: "selfsigning-issuer"
        },
        spec: {
          selfSigned: {}
        }
      },
      kubeConfig
    )
  );

  // Create a placeholder secret with the required kubed annotation to sync this
  // secret to the tenant namespaces. Later, cert-manager will update this
  // secret with the certificate generated by letsencrypt.
  collection.add(
    new Secret(
      {
        apiVersion: "v1",
        data: {
          "ca.crt": "",
          "tls.crt": "",
          "tls.key": ""
        },
        kind: "Secret",
        metadata: {
          name: "https-cert",
          namespace: namespace,
          annotations: {
            // kubed will synchronize this secret to the tenant namespaces and
            // will copy the annotations. mark it protected so the controller
            // doesn't delete the new resources it's not aware of.
            opstrace: "protected",
            // select the namespaces that have a label named `tenant`
            "kubed.appscode.com/sync": "tenant"
          }
        },
        type: "kubernetes.io/tls"
      },
      kubeConfig
    )
  );

  // Create a certificate and kubed will synchronize it to
  // tenant namespaces. https://github.com/jetstack/cert-manager/issues/494#issuecomment-382687271
  collection.add(
    new V1CertificateResource(
      {
        apiVersion: "cert-manager.io/v1",
        kind: "Certificate",
        metadata: {
          name: "https-cert",
          namespace: namespace
        },
        spec: {
          secretName: "https-cert",
          dnsNames: domains,
          issuerRef: {
            name: tlsCertificateIssuer,
            kind: "Issuer"
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new V1IssuerResource(
      {
        apiVersion: "cert-manager.io/v1",
        kind: "Issuer",
        metadata: {
          name: "letsencrypt-prod",
          namespace: namespace
        },
        spec: {
          acme: {
            server: "https://acme-v02.api.letsencrypt.org/directory",
            email: "mat@opstrace.com",
            privateKeySecretRef: {
              name: "letsencrypt-prod"
            },
            solvers: [
              {
                selector: {},
                dns01: dns01
              }
            ]
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new V1IssuerResource(
      {
        apiVersion: "cert-manager.io/v1",
        kind: "Issuer",
        metadata: {
          name: "letsencrypt-staging",
          namespace: namespace
        },
        spec: {
          acme: {
            server: "https://acme-staging-v02.api.letsencrypt.org/directory",
            email: "mat@opstrace.com",
            privateKeySecretRef: {
              name: "letsencrypt-staging"
            },
            solvers: [
              {
                selector: {},
                dns01: dns01
              }
            ]
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: "cert-manager-cainjector",
          namespace,
          labels: {
            app: "cainjector",
            "app.kubernetes.io/component": "cainjector",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cainjector"
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new ServiceAccount(
      {
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: "cert-manager",
          namespace,
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          labels: {
            app: "cainjector",
            "app.kubernetes.io/component": "cainjector",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cainjector"
          },
          name: "cert-manager-cainjector"
        },
        rules: [
          {
            apiGroups: ["cert-manager.io"],
            resources: ["certificates"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["secrets"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["events"],
            verbs: ["get", "create", "update", "patch"]
          },
          {
            apiGroups: ["admissionregistration.k8s.io"],
            resources: [
              "validatingwebhookconfigurations",
              "mutatingwebhookconfigurations"
            ],
            verbs: ["get", "list", "watch", "update"]
          },
          {
            apiGroups: ["apiregistration.k8s.io"],
            resources: ["apiservices"],
            verbs: ["get", "list", "watch", "update"]
          },
          {
            apiGroups: ["apiextensions.k8s.io"],
            resources: ["customresourcedefinitions"],
            verbs: ["get", "list", "watch", "update"]
          },
          {
            apiGroups: ["auditregistration.k8s.io"],
            resources: ["auditsinks"],
            verbs: ["get", "list", "watch", "update"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-issuers"
        },
        rules: [
          {
            apiGroups: ["cert-manager.io"],
            resources: ["issuers", "issuers/status"],
            verbs: ["update"]
          },
          {
            apiGroups: ["cert-manager.io"],
            resources: ["issuers"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["secrets"],
            verbs: ["get", "list", "watch", "create", "update", "delete"]
          },
          {
            apiGroups: [""],
            resources: ["events"],
            verbs: ["create", "patch"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-clusterissuers"
        },
        rules: [
          {
            apiGroups: ["cert-manager.io"],
            resources: ["clusterissuers", "clusterissuers/status"],
            verbs: ["update"]
          },
          {
            apiGroups: ["cert-manager.io"],
            resources: ["clusterissuers"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["secrets"],
            verbs: ["get", "list", "watch", "create", "update", "delete"]
          },
          {
            apiGroups: [""],
            resources: ["events"],
            verbs: ["create", "patch"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-certificates"
        },
        rules: [
          {
            apiGroups: ["cert-manager.io"],
            resources: [
              "certificates",
              "certificates/status",
              "certificaterequests",
              "certificaterequests/status"
            ],
            verbs: ["update"]
          },
          {
            apiGroups: ["cert-manager.io"],
            resources: [
              "certificates",
              "certificaterequests",
              "clusterissuers",
              "issuers"
            ],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: ["cert-manager.io"],
            resources: [
              "certificates/finalizers",
              "certificaterequests/finalizers"
            ],
            verbs: ["update"]
          },
          {
            apiGroups: ["acme.cert-manager.io"],
            resources: ["orders"],
            verbs: ["create", "delete", "get", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["secrets"],
            verbs: ["get", "list", "watch", "create", "update", "delete"]
          },
          {
            apiGroups: [""],
            resources: ["events"],
            verbs: ["create", "patch"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-orders"
        },
        rules: [
          {
            apiGroups: ["acme.cert-manager.io"],
            resources: ["orders", "orders/status"],
            verbs: ["update"]
          },
          {
            apiGroups: ["acme.cert-manager.io"],
            resources: ["orders", "challenges"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: ["cert-manager.io"],
            resources: ["clusterissuers", "issuers"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: ["acme.cert-manager.io"],
            resources: ["challenges"],
            verbs: ["create", "delete"]
          },
          {
            apiGroups: ["acme.cert-manager.io"],
            resources: ["orders/finalizers"],
            verbs: ["update"]
          },
          {
            apiGroups: [""],
            resources: ["secrets"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["events"],
            verbs: ["create", "patch"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-challenges"
        },
        rules: [
          {
            apiGroups: ["acme.cert-manager.io"],
            resources: ["challenges", "challenges/status"],
            verbs: ["update"]
          },
          {
            apiGroups: ["acme.cert-manager.io"],
            resources: ["challenges"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: ["cert-manager.io"],
            resources: ["issuers", "clusterissuers"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["secrets"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: [""],
            resources: ["events"],
            verbs: ["create", "patch"]
          },
          {
            apiGroups: [""],
            resources: ["pods", "services"],
            verbs: ["get", "list", "watch", "create", "delete"]
          },
          {
            apiGroups: ["extensions"],
            resources: ["ingresses"],
            verbs: ["get", "list", "watch", "create", "delete", "update"]
          },
          {
            apiGroups: ["route.openshift.io"],
            resources: ["routes/custom-host"],
            verbs: ["create"]
          },
          {
            apiGroups: ["acme.cert-manager.io"],
            resources: ["challenges/finalizers"],
            verbs: ["update"]
          },
          {
            apiGroups: [""],
            resources: ["secrets"],
            verbs: ["get", "list", "watch"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-ingress-shim"
        },
        rules: [
          {
            apiGroups: ["cert-manager.io"],
            resources: ["certificates", "certificaterequests"],
            verbs: ["create", "update", "delete"]
          },
          {
            apiGroups: ["cert-manager.io"],
            resources: [
              "certificates",
              "certificaterequests",
              "issuers",
              "clusterissuers"
            ],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: ["extensions"],
            resources: ["ingresses"],
            verbs: ["get", "list", "watch"]
          },
          {
            apiGroups: ["extensions"],
            resources: ["ingresses/finalizers"],
            verbs: ["update"]
          },
          {
            apiGroups: [""],
            resources: ["events"],
            verbs: ["create", "patch"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager",
            "rbac.authorization.k8s.io/aggregate-to-admin": "true",
            "rbac.authorization.k8s.io/aggregate-to-edit": "true",
            "rbac.authorization.k8s.io/aggregate-to-view": "true"
          },
          name: "cert-manager-view"
        },
        rules: [
          {
            apiGroups: ["cert-manager.io"],
            resources: ["certificates", "certificaterequests", "issuers"],
            verbs: ["get", "list", "watch"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRole(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRole",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager",
            "rbac.authorization.k8s.io/aggregate-to-admin": "true",
            "rbac.authorization.k8s.io/aggregate-to-edit": "true"
          },
          name: "cert-manager-edit"
        },
        rules: [
          {
            apiGroups: ["cert-manager.io"],
            resources: ["certificates", "certificaterequests", "issuers"],
            verbs: ["create", "delete", "deletecollection", "patch", "update"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          labels: {
            app: "cainjector",
            "app.kubernetes.io/component": "cainjector",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cainjector"
          },
          name: "cert-manager-cainjector"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "cert-manager-cainjector"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "cert-manager-cainjector",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-issuers"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "cert-manager-controller-issuers"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "cert-manager",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-clusterissuers"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "cert-manager-controller-clusterissuers"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "cert-manager",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-certificates"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "cert-manager-controller-certificates"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "cert-manager",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-orders"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "cert-manager-controller-orders"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "cert-manager",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-challenges"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "cert-manager-controller-challenges"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "cert-manager",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new ClusterRoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "ClusterRoleBinding",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager-controller-ingress-shim"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "ClusterRole",
          name: "cert-manager-controller-ingress-shim"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "cert-manager",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new Role(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "Role",
        metadata: {
          labels: {
            app: "cainjector",
            "app.kubernetes.io/component": "cainjector",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cainjector"
          },
          name: "cert-manager-cainjector:leaderelection",
          namespace: "kube-system"
        },
        rules: [
          {
            apiGroups: [""],
            resourceNames: [
              "cert-manager-cainjector-leader-election",
              "cert-manager-cainjector-leader-election-core"
            ],
            resources: ["configmaps"],
            verbs: ["get", "update", "patch"]
          },
          {
            apiGroups: [""],
            resources: ["configmaps"],
            verbs: ["create"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new Role(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "Role",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager:leaderelection",
          namespace: "kube-system"
        },
        rules: [
          {
            apiGroups: [""],
            resourceNames: ["cert-manager-controller"],
            resources: ["configmaps"],
            verbs: ["get", "update", "patch"]
          },
          {
            apiGroups: [""],
            resources: ["configmaps"],
            verbs: ["create"]
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new RoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "RoleBinding",
        metadata: {
          labels: {
            app: "cainjector",
            "app.kubernetes.io/component": "cainjector",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cainjector"
          },
          name: "cert-manager-cainjector:leaderelection",
          namespace: "kube-system"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "Role",
          name: "cert-manager-cainjector:leaderelection"
        },
        subjects: [
          {
            kind: "ServiceAccount",
            name: "cert-manager-cainjector",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new RoleBinding(
      {
        apiVersion: "rbac.authorization.k8s.io/v1",
        kind: "RoleBinding",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager:leaderelection",
          namespace: "kube-system"
        },
        roleRef: {
          apiGroup: "rbac.authorization.k8s.io",
          kind: "Role",
          name: "cert-manager:leaderelection"
        },
        subjects: [
          {
            apiGroup: "",
            kind: "ServiceAccount",
            name: "cert-manager",
            namespace
          }
        ]
      },
      kubeConfig
    )
  );

  collection.add(
    new Service(
      {
        apiVersion: "v1",
        kind: "Service",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager",
          namespace
        },
        spec: {
          ports: [
            {
              port: 9402,
              protocol: "TCP",
              targetPort: 9402 as any
            }
          ],
          selector: {
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          type: "ClusterIP"
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          labels: {
            app: "cainjector",
            "app.kubernetes.io/component": "cainjector",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cainjector"
          },
          name: "cert-manager-cainjector",
          namespace
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "app.kubernetes.io/component": "cainjector",
              "app.kubernetes.io/instance": "cert-manager",
              "app.kubernetes.io/name": "cainjector"
            }
          },
          template: {
            metadata: {
              labels: {
                app: "cainjector",
                "app.kubernetes.io/component": "cainjector",
                "app.kubernetes.io/instance": "cert-manager",
                "app.kubernetes.io/name": "cainjector"
              }
            },
            spec: {
              containers: [
                {
                  args: ["--v=2", "--leader-election-namespace=kube-system"],
                  env: [
                    {
                      name: "POD_NAMESPACE",
                      valueFrom: {
                        fieldRef: {
                          fieldPath: "metadata.namespace"
                        }
                      }
                    }
                  ],
                  image: DockerImages.certManagerCAInjector,
                  imagePullPolicy: "IfNotPresent",
                  name: "cert-manager",
                  resources: {}
                }
              ],
              serviceAccountName: "cert-manager-cainjector"
            }
          }
        }
      },
      kubeConfig
    )
  );

  collection.add(
    new Deployment(
      {
        apiVersion: "apps/v1",
        kind: "Deployment",
        metadata: {
          labels: {
            app: "cert-manager",
            "app.kubernetes.io/component": "controller",
            "app.kubernetes.io/instance": "cert-manager",
            "app.kubernetes.io/name": "cert-manager"
          },
          name: "cert-manager",
          namespace
        },
        spec: {
          replicas: 1,
          selector: {
            matchLabels: {
              "app.kubernetes.io/component": "controller",
              "app.kubernetes.io/instance": "cert-manager",
              "app.kubernetes.io/name": "cert-manager"
            }
          },
          template: {
            metadata: {
              annotations: {
                "prometheus.io/path": "/metrics",
                "prometheus.io/port": "9402",
                "prometheus.io/scrape": "true"
              },
              labels: {
                app: "cert-manager",
                "app.kubernetes.io/component": "controller",
                "app.kubernetes.io/instance": "cert-manager",
                "app.kubernetes.io/name": "cert-manager"
              }
            },
            spec: {
              containers: [
                {
                  args: [
                    "--v=2",
                    "--cluster-resource-namespace=$(POD_NAMESPACE)",
                    "--leader-election-namespace=kube-system"
                  ],
                  env: [
                    {
                      name: "POD_NAMESPACE",
                      valueFrom: {
                        fieldRef: {
                          fieldPath: "metadata.namespace"
                        }
                      }
                    }
                  ],
                  image: DockerImages.certManagerController,
                  imagePullPolicy: "IfNotPresent",
                  name: "cert-manager",
                  ports: [
                    {
                      containerPort: 9402,
                      protocol: "TCP"
                    }
                  ],
                  resources: {}
                }
              ],
              serviceAccountName: "cert-manager"
            }
          }
        }
      },
      kubeConfig
    )
  );

  return collection;
}
