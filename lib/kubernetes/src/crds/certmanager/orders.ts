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

/**
 * taken from https://github.com/jetstack/cert-manager/releases/download/v1.2.0/cert-manager.yaml
 *
 * 1. copy the correct yaml
 * 2. covert to json (https://www.convertjson.com/yaml-to-json.htm)
 * 3. paste here
 * 4. `yarn generate-apis` (this will take this CRD and turn it into a KubernetesResource Class that we use in our Typescript).
 *     Output from this command is in https://github.com/opstrace/opstrace/tree/6be8da8aa2db3479d72acb47b0156ff2b04939a2/lib/kubernetes/src/custom-resources directory.
 * 5. it's likely you'll have compiler errors now in packages like the controller, where we now need to update the resource spec
 * 5. adjust any specs that now use the updated resources so they conform to the new spec.
 */
export const orders = {
  apiVersion: "apiextensions.k8s.io/v1",
  kind: "CustomResourceDefinition",
  metadata: {
    annotations: {
      "cert-manager.io/inject-ca-from-secret":
        "cert-manager/cert-manager-webhook-ca"
    },
    labels: {
      app: "cert-manager",
      "app.kubernetes.io/instance": "cert-manager",
      "app.kubernetes.io/name": "cert-manager"
    },
    name: "orders.acme.cert-manager.io"
  },
  spec: {
    conversion: {
      strategy: "Webhook",
      webhook: {
        clientConfig: {
          service: {
            name: "cert-manager-webhook",
            namespace: "cert-manager",
            path: "/convert"
          }
        },
        conversionReviewVersions: ["v1", "v1beta1"]
      }
    },
    group: "acme.cert-manager.io",
    names: {
      categories: ["cert-manager", "cert-manager-acme"],
      kind: "Order",
      listKind: "OrderList",
      plural: "orders",
      singular: "order"
    },
    scope: "Namespaced",
    versions: [
      {
        additionalPrinterColumns: [
          {
            jsonPath: ".status.state",
            name: "State",
            type: "string"
          },
          {
            jsonPath: ".spec.issuerRef.name",
            name: "Issuer",
            priority: 1,
            type: "string"
          },
          {
            jsonPath: ".status.reason",
            name: "Reason",
            priority: 1,
            type: "string"
          },
          {
            description:
              "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.",
            jsonPath: ".metadata.creationTimestamp",
            name: "Age",
            type: "date"
          }
        ],
        name: "v1alpha2",
        schema: {
          openAPIV3Schema: {
            description:
              "Order is a type to represent an Order with an ACME server",
            properties: {
              apiVersion: {
                description:
                  "APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources",
                type: "string"
              },
              kind: {
                description:
                  "Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds",
                type: "string"
              },
              metadata: {
                type: "object"
              },
              spec: {
                properties: {
                  commonName: {
                    description:
                      "CommonName is the common name as specified on the DER encoded CSR. If specified, this value must also be present in `dnsNames` or `ipAddresses`. This field must match the corresponding field on the DER encoded CSR.",
                    type: "string"
                  },
                  csr: {
                    description:
                      "Certificate signing request bytes in DER encoding. This will be used when finalizing the order. This field must be set on the order.",
                    format: "byte",
                    type: "string"
                  },
                  dnsNames: {
                    description:
                      "DNSNames is a list of DNS names that should be included as part of the Order validation process. This field must match the corresponding field on the DER encoded CSR.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  duration: {
                    description:
                      "Duration is the duration for the not after date for the requested certificate. this is set on order creation as pe the ACME spec.",
                    type: "string"
                  },
                  ipAddresses: {
                    description:
                      "IPAddresses is a list of IP addresses that should be included as part of the Order validation process. This field must match the corresponding field on the DER encoded CSR.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef references a properly configured ACME-type Issuer which should be used to create this Order. If the Issuer does not exist, processing will be retried. If the Issuer is not an 'ACME' Issuer, an error will be returned and the Order will be marked as failed.",
                    properties: {
                      group: {
                        description: "Group of the resource being referred to.",
                        type: "string"
                      },
                      kind: {
                        description: "Kind of the resource being referred to.",
                        type: "string"
                      },
                      name: {
                        description: "Name of the resource being referred to.",
                        type: "string"
                      }
                    },
                    required: ["name"],
                    type: "object"
                  }
                },
                required: ["csr", "issuerRef"],
                type: "object"
              },
              status: {
                properties: {
                  authorizations: {
                    description:
                      "Authorizations contains data returned from the ACME server on what authorizations must be completed in order to validate the DNS names specified on the Order.",
                    items: {
                      description:
                        "ACMEAuthorization contains data returned from the ACME server on an authorization that must be completed in order validate a DNS name on an ACME Order resource.",
                      properties: {
                        challenges: {
                          description:
                            "Challenges specifies the challenge types offered by the ACME server. One of these challenge types will be selected when validating the DNS name and an appropriate Challenge resource will be created to perform the ACME challenge process.",
                          items: {
                            description:
                              "Challenge specifies a challenge offered by the ACME server for an Order. An appropriate Challenge resource can be created to perform the ACME challenge process.",
                            properties: {
                              token: {
                                description:
                                  "Token is the token that must be presented for this challenge. This is used to compute the 'key' that must also be presented.",
                                type: "string"
                              },
                              type: {
                                description:
                                  "Type is the type of challenge being offered, e.g. 'http-01', 'dns-01', 'tls-sni-01', etc. This is the raw value retrieved from the ACME server. Only 'http-01' and 'dns-01' are supported by cert-manager, other values will be ignored.",
                                type: "string"
                              },
                              url: {
                                description:
                                  "URL is the URL of this challenge. It can be used to retrieve additional metadata about the Challenge from the ACME server.",
                                type: "string"
                              }
                            },
                            required: ["token", "type", "url"],
                            type: "object"
                          },
                          type: "array"
                        },
                        identifier: {
                          description:
                            "Identifier is the DNS name to be validated as part of this authorization",
                          type: "string"
                        },
                        initialState: {
                          description:
                            "InitialState is the initial state of the ACME authorization when first fetched from the ACME server. If an Authorization is already 'valid', the Order controller will not create a Challenge resource for the authorization. This will occur when working with an ACME server that enables 'authz reuse' (such as Let's Encrypt's production endpoint). If not set and 'identifier' is set, the state is assumed to be pending and a Challenge will be created.",
                          enum: [
                            "valid",
                            "ready",
                            "pending",
                            "processing",
                            "invalid",
                            "expired",
                            "errored"
                          ],
                          type: "string"
                        },
                        url: {
                          description:
                            "URL is the URL of the Authorization that must be completed",
                          type: "string"
                        },
                        wildcard: {
                          description:
                            "Wildcard will be true if this authorization is for a wildcard DNS name. If this is true, the identifier will be the *non-wildcard* version of the DNS name. For example, if '*.example.com' is the DNS name being validated, this field will be 'true' and the 'identifier' field will be 'example.com'.",
                          type: "boolean"
                        }
                      },
                      required: ["url"],
                      type: "object"
                    },
                    type: "array"
                  },
                  certificate: {
                    description:
                      "Certificate is a copy of the PEM encoded certificate for this Order. This field will be populated after the order has been successfully finalized with the ACME server, and the order has transitioned to the 'valid' state.",
                    format: "byte",
                    type: "string"
                  },
                  failureTime: {
                    description:
                      "FailureTime stores the time that this order failed. This is used to influence garbage collection and back-off.",
                    format: "date-time",
                    type: "string"
                  },
                  finalizeURL: {
                    description:
                      "FinalizeURL of the Order. This is used to obtain certificates for this order once it has been completed.",
                    type: "string"
                  },
                  reason: {
                    description:
                      "Reason optionally provides more information about a why the order is in the current state.",
                    type: "string"
                  },
                  state: {
                    description:
                      "State contains the current state of this Order resource. States 'success' and 'expired' are 'final'",
                    enum: [
                      "valid",
                      "ready",
                      "pending",
                      "processing",
                      "invalid",
                      "expired",
                      "errored"
                    ],
                    type: "string"
                  },
                  url: {
                    description:
                      "URL of the Order. This will initially be empty when the resource is first created. The Order controller will populate this field when the Order is first processed. This field will be immutable after it is initially set.",
                    type: "string"
                  }
                },
                type: "object"
              }
            },
            required: ["metadata"],
            type: "object"
          }
        },
        served: true,
        storage: false,
        subresources: {
          status: {}
        }
      },
      {
        additionalPrinterColumns: [
          {
            jsonPath: ".status.state",
            name: "State",
            type: "string"
          },
          {
            jsonPath: ".spec.issuerRef.name",
            name: "Issuer",
            priority: 1,
            type: "string"
          },
          {
            jsonPath: ".status.reason",
            name: "Reason",
            priority: 1,
            type: "string"
          },
          {
            description:
              "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.",
            jsonPath: ".metadata.creationTimestamp",
            name: "Age",
            type: "date"
          }
        ],
        name: "v1alpha3",
        schema: {
          openAPIV3Schema: {
            description:
              "Order is a type to represent an Order with an ACME server",
            properties: {
              apiVersion: {
                description:
                  "APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources",
                type: "string"
              },
              kind: {
                description:
                  "Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds",
                type: "string"
              },
              metadata: {
                type: "object"
              },
              spec: {
                properties: {
                  commonName: {
                    description:
                      "CommonName is the common name as specified on the DER encoded CSR. If specified, this value must also be present in `dnsNames` or `ipAddresses`. This field must match the corresponding field on the DER encoded CSR.",
                    type: "string"
                  },
                  csr: {
                    description:
                      "Certificate signing request bytes in DER encoding. This will be used when finalizing the order. This field must be set on the order.",
                    format: "byte",
                    type: "string"
                  },
                  dnsNames: {
                    description:
                      "DNSNames is a list of DNS names that should be included as part of the Order validation process. This field must match the corresponding field on the DER encoded CSR.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  duration: {
                    description:
                      "Duration is the duration for the not after date for the requested certificate. this is set on order creation as pe the ACME spec.",
                    type: "string"
                  },
                  ipAddresses: {
                    description:
                      "IPAddresses is a list of IP addresses that should be included as part of the Order validation process. This field must match the corresponding field on the DER encoded CSR.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef references a properly configured ACME-type Issuer which should be used to create this Order. If the Issuer does not exist, processing will be retried. If the Issuer is not an 'ACME' Issuer, an error will be returned and the Order will be marked as failed.",
                    properties: {
                      group: {
                        description: "Group of the resource being referred to.",
                        type: "string"
                      },
                      kind: {
                        description: "Kind of the resource being referred to.",
                        type: "string"
                      },
                      name: {
                        description: "Name of the resource being referred to.",
                        type: "string"
                      }
                    },
                    required: ["name"],
                    type: "object"
                  }
                },
                required: ["csr", "issuerRef"],
                type: "object"
              },
              status: {
                properties: {
                  authorizations: {
                    description:
                      "Authorizations contains data returned from the ACME server on what authorizations must be completed in order to validate the DNS names specified on the Order.",
                    items: {
                      description:
                        "ACMEAuthorization contains data returned from the ACME server on an authorization that must be completed in order validate a DNS name on an ACME Order resource.",
                      properties: {
                        challenges: {
                          description:
                            "Challenges specifies the challenge types offered by the ACME server. One of these challenge types will be selected when validating the DNS name and an appropriate Challenge resource will be created to perform the ACME challenge process.",
                          items: {
                            description:
                              "Challenge specifies a challenge offered by the ACME server for an Order. An appropriate Challenge resource can be created to perform the ACME challenge process.",
                            properties: {
                              token: {
                                description:
                                  "Token is the token that must be presented for this challenge. This is used to compute the 'key' that must also be presented.",
                                type: "string"
                              },
                              type: {
                                description:
                                  "Type is the type of challenge being offered, e.g. 'http-01', 'dns-01', 'tls-sni-01', etc. This is the raw value retrieved from the ACME server. Only 'http-01' and 'dns-01' are supported by cert-manager, other values will be ignored.",
                                type: "string"
                              },
                              url: {
                                description:
                                  "URL is the URL of this challenge. It can be used to retrieve additional metadata about the Challenge from the ACME server.",
                                type: "string"
                              }
                            },
                            required: ["token", "type", "url"],
                            type: "object"
                          },
                          type: "array"
                        },
                        identifier: {
                          description:
                            "Identifier is the DNS name to be validated as part of this authorization",
                          type: "string"
                        },
                        initialState: {
                          description:
                            "InitialState is the initial state of the ACME authorization when first fetched from the ACME server. If an Authorization is already 'valid', the Order controller will not create a Challenge resource for the authorization. This will occur when working with an ACME server that enables 'authz reuse' (such as Let's Encrypt's production endpoint). If not set and 'identifier' is set, the state is assumed to be pending and a Challenge will be created.",
                          enum: [
                            "valid",
                            "ready",
                            "pending",
                            "processing",
                            "invalid",
                            "expired",
                            "errored"
                          ],
                          type: "string"
                        },
                        url: {
                          description:
                            "URL is the URL of the Authorization that must be completed",
                          type: "string"
                        },
                        wildcard: {
                          description:
                            "Wildcard will be true if this authorization is for a wildcard DNS name. If this is true, the identifier will be the *non-wildcard* version of the DNS name. For example, if '*.example.com' is the DNS name being validated, this field will be 'true' and the 'identifier' field will be 'example.com'.",
                          type: "boolean"
                        }
                      },
                      required: ["url"],
                      type: "object"
                    },
                    type: "array"
                  },
                  certificate: {
                    description:
                      "Certificate is a copy of the PEM encoded certificate for this Order. This field will be populated after the order has been successfully finalized with the ACME server, and the order has transitioned to the 'valid' state.",
                    format: "byte",
                    type: "string"
                  },
                  failureTime: {
                    description:
                      "FailureTime stores the time that this order failed. This is used to influence garbage collection and back-off.",
                    format: "date-time",
                    type: "string"
                  },
                  finalizeURL: {
                    description:
                      "FinalizeURL of the Order. This is used to obtain certificates for this order once it has been completed.",
                    type: "string"
                  },
                  reason: {
                    description:
                      "Reason optionally provides more information about a why the order is in the current state.",
                    type: "string"
                  },
                  state: {
                    description:
                      "State contains the current state of this Order resource. States 'success' and 'expired' are 'final'",
                    enum: [
                      "valid",
                      "ready",
                      "pending",
                      "processing",
                      "invalid",
                      "expired",
                      "errored"
                    ],
                    type: "string"
                  },
                  url: {
                    description:
                      "URL of the Order. This will initially be empty when the resource is first created. The Order controller will populate this field when the Order is first processed. This field will be immutable after it is initially set.",
                    type: "string"
                  }
                },
                type: "object"
              }
            },
            required: ["metadata"],
            type: "object"
          }
        },
        served: true,
        storage: false,
        subresources: {
          status: {}
        }
      },
      {
        additionalPrinterColumns: [
          {
            jsonPath: ".status.state",
            name: "State",
            type: "string"
          },
          {
            jsonPath: ".spec.issuerRef.name",
            name: "Issuer",
            priority: 1,
            type: "string"
          },
          {
            jsonPath: ".status.reason",
            name: "Reason",
            priority: 1,
            type: "string"
          },
          {
            description:
              "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.",
            jsonPath: ".metadata.creationTimestamp",
            name: "Age",
            type: "date"
          }
        ],
        name: "v1beta1",
        schema: {
          openAPIV3Schema: {
            description:
              "Order is a type to represent an Order with an ACME server",
            properties: {
              apiVersion: {
                description:
                  "APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources",
                type: "string"
              },
              kind: {
                description:
                  "Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds",
                type: "string"
              },
              metadata: {
                type: "object"
              },
              spec: {
                properties: {
                  commonName: {
                    description:
                      "CommonName is the common name as specified on the DER encoded CSR. If specified, this value must also be present in `dnsNames` or `ipAddresses`. This field must match the corresponding field on the DER encoded CSR.",
                    type: "string"
                  },
                  dnsNames: {
                    description:
                      "DNSNames is a list of DNS names that should be included as part of the Order validation process. This field must match the corresponding field on the DER encoded CSR.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  duration: {
                    description:
                      "Duration is the duration for the not after date for the requested certificate. this is set on order creation as pe the ACME spec.",
                    type: "string"
                  },
                  ipAddresses: {
                    description:
                      "IPAddresses is a list of IP addresses that should be included as part of the Order validation process. This field must match the corresponding field on the DER encoded CSR.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef references a properly configured ACME-type Issuer which should be used to create this Order. If the Issuer does not exist, processing will be retried. If the Issuer is not an 'ACME' Issuer, an error will be returned and the Order will be marked as failed.",
                    properties: {
                      group: {
                        description: "Group of the resource being referred to.",
                        type: "string"
                      },
                      kind: {
                        description: "Kind of the resource being referred to.",
                        type: "string"
                      },
                      name: {
                        description: "Name of the resource being referred to.",
                        type: "string"
                      }
                    },
                    required: ["name"],
                    type: "object"
                  },
                  request: {
                    description:
                      "Certificate signing request bytes in DER encoding. This will be used when finalizing the order. This field must be set on the order.",
                    format: "byte",
                    type: "string"
                  }
                },
                required: ["issuerRef", "request"],
                type: "object"
              },
              status: {
                properties: {
                  authorizations: {
                    description:
                      "Authorizations contains data returned from the ACME server on what authorizations must be completed in order to validate the DNS names specified on the Order.",
                    items: {
                      description:
                        "ACMEAuthorization contains data returned from the ACME server on an authorization that must be completed in order validate a DNS name on an ACME Order resource.",
                      properties: {
                        challenges: {
                          description:
                            "Challenges specifies the challenge types offered by the ACME server. One of these challenge types will be selected when validating the DNS name and an appropriate Challenge resource will be created to perform the ACME challenge process.",
                          items: {
                            description:
                              "Challenge specifies a challenge offered by the ACME server for an Order. An appropriate Challenge resource can be created to perform the ACME challenge process.",
                            properties: {
                              token: {
                                description:
                                  "Token is the token that must be presented for this challenge. This is used to compute the 'key' that must also be presented.",
                                type: "string"
                              },
                              type: {
                                description:
                                  "Type is the type of challenge being offered, e.g. 'http-01', 'dns-01', 'tls-sni-01', etc. This is the raw value retrieved from the ACME server. Only 'http-01' and 'dns-01' are supported by cert-manager, other values will be ignored.",
                                type: "string"
                              },
                              url: {
                                description:
                                  "URL is the URL of this challenge. It can be used to retrieve additional metadata about the Challenge from the ACME server.",
                                type: "string"
                              }
                            },
                            required: ["token", "type", "url"],
                            type: "object"
                          },
                          type: "array"
                        },
                        identifier: {
                          description:
                            "Identifier is the DNS name to be validated as part of this authorization",
                          type: "string"
                        },
                        initialState: {
                          description:
                            "InitialState is the initial state of the ACME authorization when first fetched from the ACME server. If an Authorization is already 'valid', the Order controller will not create a Challenge resource for the authorization. This will occur when working with an ACME server that enables 'authz reuse' (such as Let's Encrypt's production endpoint). If not set and 'identifier' is set, the state is assumed to be pending and a Challenge will be created.",
                          enum: [
                            "valid",
                            "ready",
                            "pending",
                            "processing",
                            "invalid",
                            "expired",
                            "errored"
                          ],
                          type: "string"
                        },
                        url: {
                          description:
                            "URL is the URL of the Authorization that must be completed",
                          type: "string"
                        },
                        wildcard: {
                          description:
                            "Wildcard will be true if this authorization is for a wildcard DNS name. If this is true, the identifier will be the *non-wildcard* version of the DNS name. For example, if '*.example.com' is the DNS name being validated, this field will be 'true' and the 'identifier' field will be 'example.com'.",
                          type: "boolean"
                        }
                      },
                      required: ["url"],
                      type: "object"
                    },
                    type: "array"
                  },
                  certificate: {
                    description:
                      "Certificate is a copy of the PEM encoded certificate for this Order. This field will be populated after the order has been successfully finalized with the ACME server, and the order has transitioned to the 'valid' state.",
                    format: "byte",
                    type: "string"
                  },
                  failureTime: {
                    description:
                      "FailureTime stores the time that this order failed. This is used to influence garbage collection and back-off.",
                    format: "date-time",
                    type: "string"
                  },
                  finalizeURL: {
                    description:
                      "FinalizeURL of the Order. This is used to obtain certificates for this order once it has been completed.",
                    type: "string"
                  },
                  reason: {
                    description:
                      "Reason optionally provides more information about a why the order is in the current state.",
                    type: "string"
                  },
                  state: {
                    description:
                      "State contains the current state of this Order resource. States 'success' and 'expired' are 'final'",
                    enum: [
                      "valid",
                      "ready",
                      "pending",
                      "processing",
                      "invalid",
                      "expired",
                      "errored"
                    ],
                    type: "string"
                  },
                  url: {
                    description:
                      "URL of the Order. This will initially be empty when the resource is first created. The Order controller will populate this field when the Order is first processed. This field will be immutable after it is initially set.",
                    type: "string"
                  }
                },
                type: "object"
              }
            },
            required: ["metadata", "spec"],
            type: "object"
          }
        },
        served: true,
        storage: false,
        subresources: {
          status: {}
        }
      },
      {
        additionalPrinterColumns: [
          {
            jsonPath: ".status.state",
            name: "State",
            type: "string"
          },
          {
            jsonPath: ".spec.issuerRef.name",
            name: "Issuer",
            priority: 1,
            type: "string"
          },
          {
            jsonPath: ".status.reason",
            name: "Reason",
            priority: 1,
            type: "string"
          },
          {
            description:
              "CreationTimestamp is a timestamp representing the server time when this object was created. It is not guaranteed to be set in happens-before order across separate operations. Clients may not set this value. It is represented in RFC3339 form and is in UTC.",
            jsonPath: ".metadata.creationTimestamp",
            name: "Age",
            type: "date"
          }
        ],
        name: "v1",
        schema: {
          openAPIV3Schema: {
            description:
              "Order is a type to represent an Order with an ACME server",
            properties: {
              apiVersion: {
                description:
                  "APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources",
                type: "string"
              },
              kind: {
                description:
                  "Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds",
                type: "string"
              },
              metadata: {
                type: "object"
              },
              spec: {
                properties: {
                  commonName: {
                    description:
                      "CommonName is the common name as specified on the DER encoded CSR. If specified, this value must also be present in `dnsNames` or `ipAddresses`. This field must match the corresponding field on the DER encoded CSR.",
                    type: "string"
                  },
                  dnsNames: {
                    description:
                      "DNSNames is a list of DNS names that should be included as part of the Order validation process. This field must match the corresponding field on the DER encoded CSR.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  duration: {
                    description:
                      "Duration is the duration for the not after date for the requested certificate. this is set on order creation as pe the ACME spec.",
                    type: "string"
                  },
                  ipAddresses: {
                    description:
                      "IPAddresses is a list of IP addresses that should be included as part of the Order validation process. This field must match the corresponding field on the DER encoded CSR.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef references a properly configured ACME-type Issuer which should be used to create this Order. If the Issuer does not exist, processing will be retried. If the Issuer is not an 'ACME' Issuer, an error will be returned and the Order will be marked as failed.",
                    properties: {
                      group: {
                        description: "Group of the resource being referred to.",
                        type: "string"
                      },
                      kind: {
                        description: "Kind of the resource being referred to.",
                        type: "string"
                      },
                      name: {
                        description: "Name of the resource being referred to.",
                        type: "string"
                      }
                    },
                    required: ["name"],
                    type: "object"
                  },
                  request: {
                    description:
                      "Certificate signing request bytes in DER encoding. This will be used when finalizing the order. This field must be set on the order.",
                    format: "byte",
                    type: "string"
                  }
                },
                required: ["issuerRef", "request"],
                type: "object"
              },
              status: {
                properties: {
                  authorizations: {
                    description:
                      "Authorizations contains data returned from the ACME server on what authorizations must be completed in order to validate the DNS names specified on the Order.",
                    items: {
                      description:
                        "ACMEAuthorization contains data returned from the ACME server on an authorization that must be completed in order validate a DNS name on an ACME Order resource.",
                      properties: {
                        challenges: {
                          description:
                            "Challenges specifies the challenge types offered by the ACME server. One of these challenge types will be selected when validating the DNS name and an appropriate Challenge resource will be created to perform the ACME challenge process.",
                          items: {
                            description:
                              "Challenge specifies a challenge offered by the ACME server for an Order. An appropriate Challenge resource can be created to perform the ACME challenge process.",
                            properties: {
                              token: {
                                description:
                                  "Token is the token that must be presented for this challenge. This is used to compute the 'key' that must also be presented.",
                                type: "string"
                              },
                              type: {
                                description:
                                  "Type is the type of challenge being offered, e.g. 'http-01', 'dns-01', 'tls-sni-01', etc. This is the raw value retrieved from the ACME server. Only 'http-01' and 'dns-01' are supported by cert-manager, other values will be ignored.",
                                type: "string"
                              },
                              url: {
                                description:
                                  "URL is the URL of this challenge. It can be used to retrieve additional metadata about the Challenge from the ACME server.",
                                type: "string"
                              }
                            },
                            required: ["token", "type", "url"],
                            type: "object"
                          },
                          type: "array"
                        },
                        identifier: {
                          description:
                            "Identifier is the DNS name to be validated as part of this authorization",
                          type: "string"
                        },
                        initialState: {
                          description:
                            "InitialState is the initial state of the ACME authorization when first fetched from the ACME server. If an Authorization is already 'valid', the Order controller will not create a Challenge resource for the authorization. This will occur when working with an ACME server that enables 'authz reuse' (such as Let's Encrypt's production endpoint). If not set and 'identifier' is set, the state is assumed to be pending and a Challenge will be created.",
                          enum: [
                            "valid",
                            "ready",
                            "pending",
                            "processing",
                            "invalid",
                            "expired",
                            "errored"
                          ],
                          type: "string"
                        },
                        url: {
                          description:
                            "URL is the URL of the Authorization that must be completed",
                          type: "string"
                        },
                        wildcard: {
                          description:
                            "Wildcard will be true if this authorization is for a wildcard DNS name. If this is true, the identifier will be the *non-wildcard* version of the DNS name. For example, if '*.example.com' is the DNS name being validated, this field will be 'true' and the 'identifier' field will be 'example.com'.",
                          type: "boolean"
                        }
                      },
                      required: ["url"],
                      type: "object"
                    },
                    type: "array"
                  },
                  certificate: {
                    description:
                      "Certificate is a copy of the PEM encoded certificate for this Order. This field will be populated after the order has been successfully finalized with the ACME server, and the order has transitioned to the 'valid' state.",
                    format: "byte",
                    type: "string"
                  },
                  failureTime: {
                    description:
                      "FailureTime stores the time that this order failed. This is used to influence garbage collection and back-off.",
                    format: "date-time",
                    type: "string"
                  },
                  finalizeURL: {
                    description:
                      "FinalizeURL of the Order. This is used to obtain certificates for this order once it has been completed.",
                    type: "string"
                  },
                  reason: {
                    description:
                      "Reason optionally provides more information about a why the order is in the current state.",
                    type: "string"
                  },
                  state: {
                    description:
                      "State contains the current state of this Order resource. States 'success' and 'expired' are 'final'",
                    enum: [
                      "valid",
                      "ready",
                      "pending",
                      "processing",
                      "invalid",
                      "expired",
                      "errored"
                    ],
                    type: "string"
                  },
                  url: {
                    description:
                      "URL of the Order. This will initially be empty when the resource is first created. The Order controller will populate this field when the Order is first processed. This field will be immutable after it is initially set.",
                    type: "string"
                  }
                },
                type: "object"
              }
            },
            required: ["metadata", "spec"],
            type: "object"
          }
        },
        served: true,
        storage: true,
        subresources: {
          status: {}
        }
      }
    ]
  },
  status: {
    acceptedNames: {
      kind: "",
      plural: ""
    },
    conditions: [],
    storedVersions: []
  }
};
