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

/**
 * taken from https://github.com/jetstack/cert-manager/releases/download/v1.0.3/cert-manager.yaml
 *
 * 1. copy the correct yaml
 * 2. covert to json (https://www.convertjson.com/yaml-to-json.htm)
 * 3. paste here
 * 4. `yarn generate-apis` (this will take this CRD and turn it into a KubernetesResource Class that we use in our Typescript).
 *     Output from this command is in https://github.com/opstrace/opstrace/tree/6be8da8aa2db3479d72acb47b0156ff2b04939a2/lib/kubernetes/src/custom-resources directory.
 * 5. it's likely you'll have compiler errors now in packages like the controller, where we now need to update the resource spec
 * 5. adjust any specs that now use the updated resources so they conform to the new spec.
 */

export const certificaterequests = {
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
    name: "certificaterequests.cert-manager.io"
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
    group: "cert-manager.io",
    names: {
      kind: "CertificateRequest",
      listKind: "CertificateRequestList",
      plural: "certificaterequests",
      shortNames: ["cr", "crs"],
      singular: "certificaterequest"
    },
    scope: "Namespaced",
    versions: [
      {
        additionalPrinterColumns: [
          {
            jsonPath: '.status.conditions[?(@.type=="Ready")].status',
            name: "Ready",
            type: "string"
          },
          {
            jsonPath: ".spec.issuerRef.name",
            name: "Issuer",
            priority: 1,
            type: "string"
          },
          {
            jsonPath: '.status.conditions[?(@.type=="Ready")].message',
            name: "Status",
            priority: 1,
            type: "string"
          },
          {
            description:
              "CreationTimestamp is a timestamp representing the server time when\nthis object was created. It is not guaranteed to be set in happens-before\norder across separate operations. Clients may not set this value. It is represented\nin RFC3339 form and is in UTC.",
            jsonPath: ".metadata.creationTimestamp",
            name: "Age",
            type: "date"
          }
        ],
        name: "v1alpha2",
        schema: {
          openAPIV3Schema: {
            description:
              "A CertificateRequest is used to request a signed certificate\nfrom one of the configured issuers. \n All fields within the CertificateRequest's\n`spec` are immutable after creation. A CertificateRequest will either succeed\nor fail, as denoted by its `status.state` field. \n A CertificateRequest\nis a 'one-shot' resource, meaning it represents a single point in time request\nfor a certificate and cannot be re-used.",
            properties: {
              apiVersion: {
                description:
                  "APIVersion defines the versioned schema of this representation\nof an object. Servers should convert recognized schemas to the latest\ninternal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources",
                type: "string"
              },
              kind: {
                description:
                  "Kind is a string value representing the REST resource this\nobject represents. Servers may infer this from the endpoint the client\nsubmits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds",
                type: "string"
              },
              metadata: {
                type: "object"
              },
              spec: {
                description:
                  "Desired state of the CertificateRequest resource.",
                properties: {
                  csr: {
                    description:
                      "The PEM-encoded x509 certificate signing request to be\nsubmitted to the CA for signing.",
                    format: "byte",
                    type: "string"
                  },
                  duration: {
                    description:
                      "The requested 'duration' (i.e. lifetime) of the Certificate.\nThis option may be ignored/overridden by some issuer types.",
                    type: "string"
                  },
                  isCA: {
                    description:
                      "IsCA will request to mark the certificate as valid for\ncertificate signing when submitting to the issuer. This will automatically\nadd the `cert sign` usage to the list of `usages`.",
                    type: "boolean"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef is a reference to the issuer for this CertificateRequest.  If\nthe 'kind' field is not set, or set to 'Issuer', an Issuer resource\nwith the given name in the same namespace as the CertificateRequest\nwill be used.  If the 'kind' field is set to 'ClusterIssuer', a\nClusterIssuer with the provided name will be used. The 'name' field\nin this stanza is required at all times. The group field refers\nto the API group of the issuer which defaults to 'cert-manager.io'\nif empty.",
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
                  usages: {
                    description:
                      "Usages is the set of x509 usages that are requested for\nthe certificate. Defaults to `digital signature` and `key encipherment`\nif not specified.",
                    items: {
                      description:
                        'KeyUsage specifies valid usage contexts for keys.\nSee: https://tools.ietf.org/html/rfc5280#section-4.2.1.3      https://tools.ietf.org/html/rfc5280#section-4.2.1.12\nValid KeyUsage values are as follows: "signing", "digital signature",\n"content commitment", "key encipherment", "key agreement", "data\nencipherment", "cert sign", "crl sign", "encipher only", "decipher\nonly", "any", "server auth", "client auth", "code signing", "email\nprotection", "s/mime", "ipsec end system", "ipsec tunnel", "ipsec\nuser", "timestamping", "ocsp signing", "microsoft sgc", "netscape\nsgc"',
                      enum: [
                        "signing",
                        "digital signature",
                        "content commitment",
                        "key encipherment",
                        "key agreement",
                        "data encipherment",
                        "cert sign",
                        "crl sign",
                        "encipher only",
                        "decipher only",
                        "any",
                        "server auth",
                        "client auth",
                        "code signing",
                        "email protection",
                        "s/mime",
                        "ipsec end system",
                        "ipsec tunnel",
                        "ipsec user",
                        "timestamping",
                        "ocsp signing",
                        "microsoft sgc",
                        "netscape sgc"
                      ],
                      type: "string"
                    },
                    type: "array"
                  }
                },
                required: ["csr", "issuerRef"],
                type: "object"
              },
              status: {
                description:
                  "Status of the CertificateRequest. This is set and managed\nautomatically.",
                properties: {
                  ca: {
                    description:
                      "The PEM encoded x509 certificate of the signer, also\nknown as the CA (Certificate Authority). This is set on a best-effort\nbasis by different issuers. If not set, the CA is assumed to be\nunknown/not available.",
                    format: "byte",
                    type: "string"
                  },
                  certificate: {
                    description:
                      "The PEM encoded x509 certificate resulting from the certificate\nsigning request. If not set, the CertificateRequest has either not\nbeen completed or has failed. More information on failure can be\nfound by checking the `conditions` field.",
                    format: "byte",
                    type: "string"
                  },
                  conditions: {
                    description:
                      "List of status conditions to indicate the status of a\nCertificateRequest. Known condition types are `Ready` and `InvalidRequest`.",
                    items: {
                      description:
                        "CertificateRequestCondition contains condition information\nfor a CertificateRequest.",
                      properties: {
                        lastTransitionTime: {
                          description:
                            "LastTransitionTime is the timestamp corresponding\nto the last status change of this condition.",
                          format: "date-time",
                          type: "string"
                        },
                        message: {
                          description:
                            "Message is a human readable description of the\ndetails of the last transition, complementing reason.",
                          type: "string"
                        },
                        reason: {
                          description:
                            "Reason is a brief machine readable explanation\nfor the condition's last transition.",
                          type: "string"
                        },
                        status: {
                          description:
                            "Status of the condition, one of ('True', 'False',\n'Unknown').",
                          enum: ["True", "False", "Unknown"],
                          type: "string"
                        },
                        type: {
                          description:
                            "Type of the condition, known values are ('Ready',\n'InvalidRequest').",
                          type: "string"
                        }
                      },
                      required: ["status", "type"],
                      type: "object"
                    },
                    type: "array"
                  },
                  failureTime: {
                    description:
                      "FailureTime stores the time that this CertificateRequest\nfailed. This is used to influence garbage collection and back-off.",
                    format: "date-time",
                    type: "string"
                  }
                },
                type: "object"
              }
            },
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
            jsonPath: '.status.conditions[?(@.type=="Ready")].status',
            name: "Ready",
            type: "string"
          },
          {
            jsonPath: ".spec.issuerRef.name",
            name: "Issuer",
            priority: 1,
            type: "string"
          },
          {
            jsonPath: '.status.conditions[?(@.type=="Ready")].message',
            name: "Status",
            priority: 1,
            type: "string"
          },
          {
            description:
              "CreationTimestamp is a timestamp representing the server time when\nthis object was created. It is not guaranteed to be set in happens-before\norder across separate operations. Clients may not set this value. It is represented\nin RFC3339 form and is in UTC.",
            jsonPath: ".metadata.creationTimestamp",
            name: "Age",
            type: "date"
          }
        ],
        name: "v1alpha3",
        schema: {
          openAPIV3Schema: {
            description:
              "A CertificateRequest is used to request a signed certificate\nfrom one of the configured issuers. \n All fields within the CertificateRequest's\n`spec` are immutable after creation. A CertificateRequest will either succeed\nor fail, as denoted by its `status.state` field. \n A CertificateRequest\nis a 'one-shot' resource, meaning it represents a single point in time request\nfor a certificate and cannot be re-used.",
            properties: {
              apiVersion: {
                description:
                  "APIVersion defines the versioned schema of this representation\nof an object. Servers should convert recognized schemas to the latest\ninternal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources",
                type: "string"
              },
              kind: {
                description:
                  "Kind is a string value representing the REST resource this\nobject represents. Servers may infer this from the endpoint the client\nsubmits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds",
                type: "string"
              },
              metadata: {
                type: "object"
              },
              spec: {
                description:
                  "Desired state of the CertificateRequest resource.",
                properties: {
                  csr: {
                    description:
                      "The PEM-encoded x509 certificate signing request to be\nsubmitted to the CA for signing.",
                    format: "byte",
                    type: "string"
                  },
                  duration: {
                    description:
                      "The requested 'duration' (i.e. lifetime) of the Certificate.\nThis option may be ignored/overridden by some issuer types.",
                    type: "string"
                  },
                  isCA: {
                    description:
                      "IsCA will request to mark the certificate as valid for\ncertificate signing when submitting to the issuer. This will automatically\nadd the `cert sign` usage to the list of `usages`.",
                    type: "boolean"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef is a reference to the issuer for this CertificateRequest.  If\nthe 'kind' field is not set, or set to 'Issuer', an Issuer resource\nwith the given name in the same namespace as the CertificateRequest\nwill be used.  If the 'kind' field is set to 'ClusterIssuer', a\nClusterIssuer with the provided name will be used. The 'name' field\nin this stanza is required at all times. The group field refers\nto the API group of the issuer which defaults to 'cert-manager.io'\nif empty.",
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
                  usages: {
                    description:
                      "Usages is the set of x509 usages that are requested for\nthe certificate. Defaults to `digital signature` and `key encipherment`\nif not specified.",
                    items: {
                      description:
                        'KeyUsage specifies valid usage contexts for keys.\nSee: https://tools.ietf.org/html/rfc5280#section-4.2.1.3      https://tools.ietf.org/html/rfc5280#section-4.2.1.12\nValid KeyUsage values are as follows: "signing", "digital signature",\n"content commitment", "key encipherment", "key agreement", "data\nencipherment", "cert sign", "crl sign", "encipher only", "decipher\nonly", "any", "server auth", "client auth", "code signing", "email\nprotection", "s/mime", "ipsec end system", "ipsec tunnel", "ipsec\nuser", "timestamping", "ocsp signing", "microsoft sgc", "netscape\nsgc"',
                      enum: [
                        "signing",
                        "digital signature",
                        "content commitment",
                        "key encipherment",
                        "key agreement",
                        "data encipherment",
                        "cert sign",
                        "crl sign",
                        "encipher only",
                        "decipher only",
                        "any",
                        "server auth",
                        "client auth",
                        "code signing",
                        "email protection",
                        "s/mime",
                        "ipsec end system",
                        "ipsec tunnel",
                        "ipsec user",
                        "timestamping",
                        "ocsp signing",
                        "microsoft sgc",
                        "netscape sgc"
                      ],
                      type: "string"
                    },
                    type: "array"
                  }
                },
                required: ["csr", "issuerRef"],
                type: "object"
              },
              status: {
                description:
                  "Status of the CertificateRequest. This is set and managed\nautomatically.",
                properties: {
                  ca: {
                    description:
                      "The PEM encoded x509 certificate of the signer, also\nknown as the CA (Certificate Authority). This is set on a best-effort\nbasis by different issuers. If not set, the CA is assumed to be\nunknown/not available.",
                    format: "byte",
                    type: "string"
                  },
                  certificate: {
                    description:
                      "The PEM encoded x509 certificate resulting from the certificate\nsigning request. If not set, the CertificateRequest has either not\nbeen completed or has failed. More information on failure can be\nfound by checking the `conditions` field.",
                    format: "byte",
                    type: "string"
                  },
                  conditions: {
                    description:
                      "List of status conditions to indicate the status of a\nCertificateRequest. Known condition types are `Ready` and `InvalidRequest`.",
                    items: {
                      description:
                        "CertificateRequestCondition contains condition information\nfor a CertificateRequest.",
                      properties: {
                        lastTransitionTime: {
                          description:
                            "LastTransitionTime is the timestamp corresponding\nto the last status change of this condition.",
                          format: "date-time",
                          type: "string"
                        },
                        message: {
                          description:
                            "Message is a human readable description of the\ndetails of the last transition, complementing reason.",
                          type: "string"
                        },
                        reason: {
                          description:
                            "Reason is a brief machine readable explanation\nfor the condition's last transition.",
                          type: "string"
                        },
                        status: {
                          description:
                            "Status of the condition, one of ('True', 'False',\n'Unknown').",
                          enum: ["True", "False", "Unknown"],
                          type: "string"
                        },
                        type: {
                          description:
                            "Type of the condition, known values are ('Ready',\n'InvalidRequest').",
                          type: "string"
                        }
                      },
                      required: ["status", "type"],
                      type: "object"
                    },
                    type: "array"
                  },
                  failureTime: {
                    description:
                      "FailureTime stores the time that this CertificateRequest\nfailed. This is used to influence garbage collection and back-off.",
                    format: "date-time",
                    type: "string"
                  }
                },
                type: "object"
              }
            },
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
            jsonPath: '.status.conditions[?(@.type=="Ready")].status',
            name: "Ready",
            type: "string"
          },
          {
            jsonPath: ".spec.issuerRef.name",
            name: "Issuer",
            priority: 1,
            type: "string"
          },
          {
            jsonPath: '.status.conditions[?(@.type=="Ready")].message',
            name: "Status",
            priority: 1,
            type: "string"
          },
          {
            description:
              "CreationTimestamp is a timestamp representing the server time when\nthis object was created. It is not guaranteed to be set in happens-before\norder across separate operations. Clients may not set this value. It is represented\nin RFC3339 form and is in UTC.",
            jsonPath: ".metadata.creationTimestamp",
            name: "Age",
            type: "date"
          }
        ],
        name: "v1beta1",
        schema: {
          openAPIV3Schema: {
            description:
              "A CertificateRequest is used to request a signed certificate\nfrom one of the configured issuers. \n All fields within the CertificateRequest's\n`spec` are immutable after creation. A CertificateRequest will either succeed\nor fail, as denoted by its `status.state` field. \n A CertificateRequest\nis a 'one-shot' resource, meaning it represents a single point in time request\nfor a certificate and cannot be re-used.",
            properties: {
              apiVersion: {
                description:
                  "APIVersion defines the versioned schema of this representation\nof an object. Servers should convert recognized schemas to the latest\ninternal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources",
                type: "string"
              },
              kind: {
                description:
                  "Kind is a string value representing the REST resource this\nobject represents. Servers may infer this from the endpoint the client\nsubmits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds",
                type: "string"
              },
              metadata: {
                type: "object"
              },
              spec: {
                description:
                  "Desired state of the CertificateRequest resource.",
                properties: {
                  duration: {
                    description:
                      "The requested 'duration' (i.e. lifetime) of the Certificate.\nThis option may be ignored/overridden by some issuer types.",
                    type: "string"
                  },
                  isCA: {
                    description:
                      "IsCA will request to mark the certificate as valid for\ncertificate signing when submitting to the issuer. This will automatically\nadd the `cert sign` usage to the list of `usages`.",
                    type: "boolean"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef is a reference to the issuer for this CertificateRequest.  If\nthe 'kind' field is not set, or set to 'Issuer', an Issuer resource\nwith the given name in the same namespace as the CertificateRequest\nwill be used.  If the 'kind' field is set to 'ClusterIssuer', a\nClusterIssuer with the provided name will be used. The 'name' field\nin this stanza is required at all times. The group field refers\nto the API group of the issuer which defaults to 'cert-manager.io'\nif empty.",
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
                      "The PEM-encoded x509 certificate signing request to be\nsubmitted to the CA for signing.",
                    format: "byte",
                    type: "string"
                  },
                  usages: {
                    description:
                      "Usages is the set of x509 usages that are requested for\nthe certificate. Defaults to `digital signature` and `key encipherment`\nif not specified.",
                    items: {
                      description:
                        'KeyUsage specifies valid usage contexts for keys.\nSee: https://tools.ietf.org/html/rfc5280#section-4.2.1.3      https://tools.ietf.org/html/rfc5280#section-4.2.1.12\nValid KeyUsage values are as follows: "signing", "digital signature",\n"content commitment", "key encipherment", "key agreement", "data\nencipherment", "cert sign", "crl sign", "encipher only", "decipher\nonly", "any", "server auth", "client auth", "code signing", "email\nprotection", "s/mime", "ipsec end system", "ipsec tunnel", "ipsec\nuser", "timestamping", "ocsp signing", "microsoft sgc", "netscape\nsgc"',
                      enum: [
                        "signing",
                        "digital signature",
                        "content commitment",
                        "key encipherment",
                        "key agreement",
                        "data encipherment",
                        "cert sign",
                        "crl sign",
                        "encipher only",
                        "decipher only",
                        "any",
                        "server auth",
                        "client auth",
                        "code signing",
                        "email protection",
                        "s/mime",
                        "ipsec end system",
                        "ipsec tunnel",
                        "ipsec user",
                        "timestamping",
                        "ocsp signing",
                        "microsoft sgc",
                        "netscape sgc"
                      ],
                      type: "string"
                    },
                    type: "array"
                  }
                },
                required: ["issuerRef", "request"],
                type: "object"
              },
              status: {
                description:
                  "Status of the CertificateRequest. This is set and managed\nautomatically.",
                properties: {
                  ca: {
                    description:
                      "The PEM encoded x509 certificate of the signer, also\nknown as the CA (Certificate Authority). This is set on a best-effort\nbasis by different issuers. If not set, the CA is assumed to be\nunknown/not available.",
                    format: "byte",
                    type: "string"
                  },
                  certificate: {
                    description:
                      "The PEM encoded x509 certificate resulting from the certificate\nsigning request. If not set, the CertificateRequest has either not\nbeen completed or has failed. More information on failure can be\nfound by checking the `conditions` field.",
                    format: "byte",
                    type: "string"
                  },
                  conditions: {
                    description:
                      "List of status conditions to indicate the status of a\nCertificateRequest. Known condition types are `Ready` and `InvalidRequest`.",
                    items: {
                      description:
                        "CertificateRequestCondition contains condition information\nfor a CertificateRequest.",
                      properties: {
                        lastTransitionTime: {
                          description:
                            "LastTransitionTime is the timestamp corresponding\nto the last status change of this condition.",
                          format: "date-time",
                          type: "string"
                        },
                        message: {
                          description:
                            "Message is a human readable description of the\ndetails of the last transition, complementing reason.",
                          type: "string"
                        },
                        reason: {
                          description:
                            "Reason is a brief machine readable explanation\nfor the condition's last transition.",
                          type: "string"
                        },
                        status: {
                          description:
                            "Status of the condition, one of ('True', 'False',\n'Unknown').",
                          enum: ["True", "False", "Unknown"],
                          type: "string"
                        },
                        type: {
                          description:
                            "Type of the condition, known values are ('Ready',\n'InvalidRequest').",
                          type: "string"
                        }
                      },
                      required: ["status", "type"],
                      type: "object"
                    },
                    type: "array"
                  },
                  failureTime: {
                    description:
                      "FailureTime stores the time that this CertificateRequest\nfailed. This is used to influence garbage collection and back-off.",
                    format: "date-time",
                    type: "string"
                  }
                },
                type: "object"
              }
            },
            required: ["spec"],
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
            jsonPath: '.status.conditions[?(@.type=="Ready")].status',
            name: "Ready",
            type: "string"
          },
          {
            jsonPath: ".spec.issuerRef.name",
            name: "Issuer",
            priority: 1,
            type: "string"
          },
          {
            jsonPath: '.status.conditions[?(@.type=="Ready")].message',
            name: "Status",
            priority: 1,
            type: "string"
          },
          {
            description:
              "CreationTimestamp is a timestamp representing the server time when\nthis object was created. It is not guaranteed to be set in happens-before\norder across separate operations. Clients may not set this value. It is represented\nin RFC3339 form and is in UTC.",
            jsonPath: ".metadata.creationTimestamp",
            name: "Age",
            type: "date"
          }
        ],
        name: "v1",
        schema: {
          openAPIV3Schema: {
            description:
              "A CertificateRequest is used to request a signed certificate\nfrom one of the configured issuers. \n All fields within the CertificateRequest's\n`spec` are immutable after creation. A CertificateRequest will either succeed\nor fail, as denoted by its `status.state` field. \n A CertificateRequest\nis a 'one-shot' resource, meaning it represents a single point in time request\nfor a certificate and cannot be re-used.",
            properties: {
              apiVersion: {
                description:
                  "APIVersion defines the versioned schema of this representation\nof an object. Servers should convert recognized schemas to the latest\ninternal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources",
                type: "string"
              },
              kind: {
                description:
                  "Kind is a string value representing the REST resource this\nobject represents. Servers may infer this from the endpoint the client\nsubmits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds",
                type: "string"
              },
              metadata: {
                type: "object"
              },
              spec: {
                description:
                  "Desired state of the CertificateRequest resource.",
                properties: {
                  duration: {
                    description:
                      "The requested 'duration' (i.e. lifetime) of the Certificate.\nThis option may be ignored/overridden by some issuer types.",
                    type: "string"
                  },
                  isCA: {
                    description:
                      "IsCA will request to mark the certificate as valid for\ncertificate signing when submitting to the issuer. This will automatically\nadd the `cert sign` usage to the list of `usages`.",
                    type: "boolean"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef is a reference to the issuer for this CertificateRequest.  If\nthe 'kind' field is not set, or set to 'Issuer', an Issuer resource\nwith the given name in the same namespace as the CertificateRequest\nwill be used.  If the 'kind' field is set to 'ClusterIssuer', a\nClusterIssuer with the provided name will be used. The 'name' field\nin this stanza is required at all times. The group field refers\nto the API group of the issuer which defaults to 'cert-manager.io'\nif empty.",
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
                      "The PEM-encoded x509 certificate signing request to be\nsubmitted to the CA for signing.",
                    format: "byte",
                    type: "string"
                  },
                  usages: {
                    description:
                      "Usages is the set of x509 usages that are requested for\nthe certificate. If usages are set they SHOULD be encoded inside\nthe CSR spec Defaults to `digital signature` and `key encipherment`\nif not specified.",
                    items: {
                      description:
                        'KeyUsage specifies valid usage contexts for keys.\nSee: https://tools.ietf.org/html/rfc5280#section-4.2.1.3      https://tools.ietf.org/html/rfc5280#section-4.2.1.12\nValid KeyUsage values are as follows: "signing", "digital signature",\n"content commitment", "key encipherment", "key agreement", "data\nencipherment", "cert sign", "crl sign", "encipher only", "decipher\nonly", "any", "server auth", "client auth", "code signing", "email\nprotection", "s/mime", "ipsec end system", "ipsec tunnel", "ipsec\nuser", "timestamping", "ocsp signing", "microsoft sgc", "netscape\nsgc"',
                      enum: [
                        "signing",
                        "digital signature",
                        "content commitment",
                        "key encipherment",
                        "key agreement",
                        "data encipherment",
                        "cert sign",
                        "crl sign",
                        "encipher only",
                        "decipher only",
                        "any",
                        "server auth",
                        "client auth",
                        "code signing",
                        "email protection",
                        "s/mime",
                        "ipsec end system",
                        "ipsec tunnel",
                        "ipsec user",
                        "timestamping",
                        "ocsp signing",
                        "microsoft sgc",
                        "netscape sgc"
                      ],
                      type: "string"
                    },
                    type: "array"
                  }
                },
                required: ["issuerRef", "request"],
                type: "object"
              },
              status: {
                description:
                  "Status of the CertificateRequest. This is set and managed\nautomatically.",
                properties: {
                  ca: {
                    description:
                      "The PEM encoded x509 certificate of the signer, also\nknown as the CA (Certificate Authority). This is set on a best-effort\nbasis by different issuers. If not set, the CA is assumed to be\nunknown/not available.",
                    format: "byte",
                    type: "string"
                  },
                  certificate: {
                    description:
                      "The PEM encoded x509 certificate resulting from the certificate\nsigning request. If not set, the CertificateRequest has either not\nbeen completed or has failed. More information on failure can be\nfound by checking the `conditions` field.",
                    format: "byte",
                    type: "string"
                  },
                  conditions: {
                    description:
                      "List of status conditions to indicate the status of a\nCertificateRequest. Known condition types are `Ready` and `InvalidRequest`.",
                    items: {
                      description:
                        "CertificateRequestCondition contains condition information\nfor a CertificateRequest.",
                      properties: {
                        lastTransitionTime: {
                          description:
                            "LastTransitionTime is the timestamp corresponding\nto the last status change of this condition.",
                          format: "date-time",
                          type: "string"
                        },
                        message: {
                          description:
                            "Message is a human readable description of the\ndetails of the last transition, complementing reason.",
                          type: "string"
                        },
                        reason: {
                          description:
                            "Reason is a brief machine readable explanation\nfor the condition's last transition.",
                          type: "string"
                        },
                        status: {
                          description:
                            "Status of the condition, one of ('True', 'False',\n'Unknown').",
                          enum: ["True", "False", "Unknown"],
                          type: "string"
                        },
                        type: {
                          description:
                            "Type of the condition, known values are ('Ready',\n'InvalidRequest').",
                          type: "string"
                        }
                      },
                      required: ["status", "type"],
                      type: "object"
                    },
                    type: "array"
                  },
                  failureTime: {
                    description:
                      "FailureTime stores the time that this CertificateRequest\nfailed. This is used to influence garbage collection and back-off.",
                    format: "date-time",
                    type: "string"
                  }
                },
                type: "object"
              }
            },
            required: ["spec"],
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
