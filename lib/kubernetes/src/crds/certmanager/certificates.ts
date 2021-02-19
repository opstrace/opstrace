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

export const certificates = {
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
    name: "certificates.cert-manager.io"
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
      categories: ["cert-manager"],
      kind: "Certificate",
      listKind: "CertificateList",
      plural: "certificates",
      shortNames: ["cert", "certs"],
      singular: "certificate"
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
            jsonPath: ".spec.secretName",
            name: "Secret",
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
              "A Certificate resource should be created to ensure an up to date and signed x509 certificate is stored in the Kubernetes Secret resource named in `spec.secretName`. \n The stored certificate will be renewed before it expires (as configured by `spec.renewBefore`).",
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
                description: "Desired state of the Certificate resource.",
                properties: {
                  commonName: {
                    description:
                      "CommonName is a common name to be used on the Certificate. The CommonName should have a length of 64 characters or fewer to avoid generating invalid CSRs. This value is ignored by TLS clients when any subject alt name is set. This is x509 behaviour: https://tools.ietf.org/html/rfc6125#section-6.4.4",
                    type: "string"
                  },
                  dnsNames: {
                    description:
                      "DNSNames is a list of DNS subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  duration: {
                    description:
                      "The requested 'duration' (i.e. lifetime) of the Certificate. This option may be ignored/overridden by some issuer types. If overridden and `renewBefore` is greater than the actual certificate duration, the certificate will be automatically renewed 2/3rds of the way through the certificate's duration.",
                    type: "string"
                  },
                  emailSANs: {
                    description:
                      "EmailSANs is a list of email subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  encodeUsagesInRequest: {
                    description:
                      "EncodeUsagesInRequest controls whether key usages should be present in the CertificateRequest",
                    type: "boolean"
                  },
                  ipAddresses: {
                    description:
                      "IPAddresses is a list of IP address subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  isCA: {
                    description:
                      "IsCA will mark this Certificate as valid for certificate signing. This will automatically add the `cert sign` usage to the list of `usages`.",
                    type: "boolean"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef is a reference to the issuer for this certificate. If the `kind` field is not set, or set to `Issuer`, an Issuer resource with the given name in the same namespace as the Certificate will be used. If the `kind` field is set to `ClusterIssuer`, a ClusterIssuer with the provided name will be used. The `name` field in this stanza is required at all times.",
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
                  keyAlgorithm: {
                    description:
                      "KeyAlgorithm is the private key algorithm of the corresponding private key for this certificate. If provided, allowed values are either `rsa` or `ecdsa` If `keyAlgorithm` is specified and `keySize` is not provided, key size of 256 will be used for `ecdsa` key algorithm and key size of 2048 will be used for `rsa` key algorithm.",
                    enum: ["rsa", "ecdsa"],
                    type: "string"
                  },
                  keyEncoding: {
                    description:
                      "KeyEncoding is the private key cryptography standards (PKCS) for this certificate's private key to be encoded in. If provided, allowed values are `pkcs1` and `pkcs8` standing for PKCS#1 and PKCS#8, respectively. If KeyEncoding is not specified, then `pkcs1` will be used by default.",
                    enum: ["pkcs1", "pkcs8"],
                    type: "string"
                  },
                  keySize: {
                    description:
                      "KeySize is the key bit size of the corresponding private key for this certificate. If `keyAlgorithm` is set to `rsa`, valid values are `2048`, `4096` or `8192`, and will default to `2048` if not specified. If `keyAlgorithm` is set to `ecdsa`, valid values are `256`, `384` or `521`, and will default to `256` if not specified. No other values are allowed.",
                    type: "integer"
                  },
                  keystores: {
                    description:
                      "Keystores configures additional keystore output formats stored in the `secretName` Secret resource.",
                    properties: {
                      jks: {
                        description:
                          "JKS configures options for storing a JKS keystore in the `spec.secretName` Secret resource.",
                        properties: {
                          create: {
                            description:
                              "Create enables JKS keystore creation for the Certificate. If true, a file named `keystore.jks` will be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef`. The keystore file will only be updated upon re-issuance.",
                            type: "boolean"
                          },
                          passwordSecretRef: {
                            description:
                              "PasswordSecretRef is a reference to a key in a Secret resource containing the password used to encrypt the JKS keystore.",
                            properties: {
                              key: {
                                description:
                                  "The key of the entry in the Secret resource's `data` field to be used. Some instances of this field may be defaulted, in others it may be required.",
                                type: "string"
                              },
                              name: {
                                description:
                                  "Name of the resource being referred to. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names",
                                type: "string"
                              }
                            },
                            required: ["name"],
                            type: "object"
                          }
                        },
                        required: ["create", "passwordSecretRef"],
                        type: "object"
                      },
                      pkcs12: {
                        description:
                          "PKCS12 configures options for storing a PKCS12 keystore in the `spec.secretName` Secret resource.",
                        properties: {
                          create: {
                            description:
                              "Create enables PKCS12 keystore creation for the Certificate. If true, a file named `keystore.p12` will be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef`. The keystore file will only be updated upon re-issuance.",
                            type: "boolean"
                          },
                          passwordSecretRef: {
                            description:
                              "PasswordSecretRef is a reference to a key in a Secret resource containing the password used to encrypt the PKCS12 keystore.",
                            properties: {
                              key: {
                                description:
                                  "The key of the entry in the Secret resource's `data` field to be used. Some instances of this field may be defaulted, in others it may be required.",
                                type: "string"
                              },
                              name: {
                                description:
                                  "Name of the resource being referred to. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names",
                                type: "string"
                              }
                            },
                            required: ["name"],
                            type: "object"
                          }
                        },
                        required: ["create", "passwordSecretRef"],
                        type: "object"
                      }
                    },
                    type: "object"
                  },
                  organization: {
                    description:
                      "Organization is a list of organizations to be used on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  privateKey: {
                    description:
                      "Options to control private keys used for the Certificate.",
                    properties: {
                      rotationPolicy: {
                        description:
                          "RotationPolicy controls how private keys should be regenerated when a re-issuance is being processed. If set to Never, a private key will only be generated if one does not already exist in the target `spec.secretName`. If one does exists but it does not have the correct algorithm or size, a warning will be raised to await user intervention. If set to Always, a private key matching the specified requirements will be generated whenever a re-issuance occurs. Default is 'Never' for backward compatibility.",
                        type: "string"
                      }
                    },
                    type: "object"
                  },
                  renewBefore: {
                    description:
                      "The amount of time before the currently issued certificate's `notAfter` time that cert-manager will begin to attempt to renew the certificate. If this value is greater than the total duration of the certificate (i.e. notAfter - notBefore), it will be automatically renewed 2/3rds of the way through the certificate's duration.",
                    type: "string"
                  },
                  secretName: {
                    description:
                      "SecretName is the name of the secret resource that will be automatically created and managed by this Certificate resource. It will be populated with a private key and certificate, signed by the denoted issuer.",
                    type: "string"
                  },
                  subject: {
                    description:
                      "Full X509 name specification (https://golang.org/pkg/crypto/x509/pkix/#Name).",
                    properties: {
                      countries: {
                        description: "Countries to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      localities: {
                        description: "Cities to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      organizationalUnits: {
                        description:
                          "Organizational Units to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      postalCodes: {
                        description:
                          "Postal codes to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      provinces: {
                        description:
                          "State/Provinces to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      serialNumber: {
                        description:
                          "Serial number to be used on the Certificate.",
                        type: "string"
                      },
                      streetAddresses: {
                        description:
                          "Street addresses to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      }
                    },
                    type: "object"
                  },
                  uriSANs: {
                    description:
                      "URISANs is a list of URI subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  usages: {
                    description:
                      "Usages is the set of x509 usages that are requested for the certificate. Defaults to `digital signature` and `key encipherment` if not specified.",
                    items: {
                      description:
                        'KeyUsage specifies valid usage contexts for keys. See: https://tools.ietf.org/html/rfc5280#section-4.2.1.3      https://tools.ietf.org/html/rfc5280#section-4.2.1.12 Valid KeyUsage values are as follows: "signing", "digital signature", "content commitment", "key encipherment", "key agreement", "data encipherment", "cert sign", "crl sign", "encipher only", "decipher only", "any", "server auth", "client auth", "code signing", "email protection", "s/mime", "ipsec end system", "ipsec tunnel", "ipsec user", "timestamping", "ocsp signing", "microsoft sgc", "netscape sgc"',
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
                required: ["issuerRef", "secretName"],
                type: "object"
              },
              status: {
                description:
                  "Status of the Certificate. This is set and managed automatically.",
                properties: {
                  conditions: {
                    description:
                      "List of status conditions to indicate the status of certificates. Known condition types are `Ready` and `Issuing`.",
                    items: {
                      description:
                        "CertificateCondition contains condition information for an Certificate.",
                      properties: {
                        lastTransitionTime: {
                          description:
                            "LastTransitionTime is the timestamp corresponding to the last status change of this condition.",
                          format: "date-time",
                          type: "string"
                        },
                        message: {
                          description:
                            "Message is a human readable description of the details of the last transition, complementing reason.",
                          type: "string"
                        },
                        reason: {
                          description:
                            "Reason is a brief machine readable explanation for the condition's last transition.",
                          type: "string"
                        },
                        status: {
                          description:
                            "Status of the condition, one of (`True`, `False`, `Unknown`).",
                          enum: ["True", "False", "Unknown"],
                          type: "string"
                        },
                        type: {
                          description:
                            "Type of the condition, known values are (`Ready`, `Issuing`).",
                          type: "string"
                        }
                      },
                      required: ["status", "type"],
                      type: "object"
                    },
                    type: "array"
                  },
                  lastFailureTime: {
                    description:
                      "LastFailureTime is the time as recorded by the Certificate controller of the most recent failure to complete a CertificateRequest for this Certificate resource. If set, cert-manager will not re-request another Certificate until 1 hour has elapsed from this time.",
                    format: "date-time",
                    type: "string"
                  },
                  nextPrivateKeySecretName: {
                    description:
                      "The name of the Secret resource containing the private key to be used for the next certificate iteration. The keymanager controller will automatically set this field if the `Issuing` condition is set to `True`. It will automatically unset this field when the Issuing condition is not set or False.",
                    type: "string"
                  },
                  notAfter: {
                    description:
                      "The expiration time of the certificate stored in the secret named by this resource in `spec.secretName`.",
                    format: "date-time",
                    type: "string"
                  },
                  notBefore: {
                    description:
                      "The time after which the certificate stored in the secret named by this resource in spec.secretName is valid.",
                    format: "date-time",
                    type: "string"
                  },
                  renewalTime: {
                    description:
                      "RenewalTime is the time at which the certificate will be next renewed. If not set, no upcoming renewal is scheduled.",
                    format: "date-time",
                    type: "string"
                  },
                  revision: {
                    description:
                      "The current 'revision' of the certificate as issued. \n When a CertificateRequest resource is created, it will have the `cert-manager.io/certificate-revision` set to one greater than the current value of this field. \n Upon issuance, this field will be set to the value of the annotation on the CertificateRequest resource used to issue the certificate. \n Persisting the value on the CertificateRequest resource allows the certificates controller to know whether a request is part of an old issuance or if it is part of the ongoing revision's issuance by checking if the revision value in the annotation is greater than this field.",
                    type: "integer"
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
            jsonPath: ".spec.secretName",
            name: "Secret",
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
              "A Certificate resource should be created to ensure an up to date and signed x509 certificate is stored in the Kubernetes Secret resource named in `spec.secretName`. \n The stored certificate will be renewed before it expires (as configured by `spec.renewBefore`).",
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
                description: "Desired state of the Certificate resource.",
                properties: {
                  commonName: {
                    description:
                      "CommonName is a common name to be used on the Certificate. The CommonName should have a length of 64 characters or fewer to avoid generating invalid CSRs. This value is ignored by TLS clients when any subject alt name is set. This is x509 behaviour: https://tools.ietf.org/html/rfc6125#section-6.4.4",
                    type: "string"
                  },
                  dnsNames: {
                    description:
                      "DNSNames is a list of DNS subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  duration: {
                    description:
                      "The requested 'duration' (i.e. lifetime) of the Certificate. This option may be ignored/overridden by some issuer types. If overridden and `renewBefore` is greater than the actual certificate duration, the certificate will be automatically renewed 2/3rds of the way through the certificate's duration.",
                    type: "string"
                  },
                  emailSANs: {
                    description:
                      "EmailSANs is a list of email subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  encodeUsagesInRequest: {
                    description:
                      "EncodeUsagesInRequest controls whether key usages should be present in the CertificateRequest",
                    type: "boolean"
                  },
                  ipAddresses: {
                    description:
                      "IPAddresses is a list of IP address subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  isCA: {
                    description:
                      "IsCA will mark this Certificate as valid for certificate signing. This will automatically add the `cert sign` usage to the list of `usages`.",
                    type: "boolean"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef is a reference to the issuer for this certificate. If the `kind` field is not set, or set to `Issuer`, an Issuer resource with the given name in the same namespace as the Certificate will be used. If the `kind` field is set to `ClusterIssuer`, a ClusterIssuer with the provided name will be used. The `name` field in this stanza is required at all times.",
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
                  keyAlgorithm: {
                    description:
                      "KeyAlgorithm is the private key algorithm of the corresponding private key for this certificate. If provided, allowed values are either `rsa` or `ecdsa` If `keyAlgorithm` is specified and `keySize` is not provided, key size of 256 will be used for `ecdsa` key algorithm and key size of 2048 will be used for `rsa` key algorithm.",
                    enum: ["rsa", "ecdsa"],
                    type: "string"
                  },
                  keyEncoding: {
                    description:
                      "KeyEncoding is the private key cryptography standards (PKCS) for this certificate's private key to be encoded in. If provided, allowed values are `pkcs1` and `pkcs8` standing for PKCS#1 and PKCS#8, respectively. If KeyEncoding is not specified, then `pkcs1` will be used by default.",
                    enum: ["pkcs1", "pkcs8"],
                    type: "string"
                  },
                  keySize: {
                    description:
                      "KeySize is the key bit size of the corresponding private key for this certificate. If `keyAlgorithm` is set to `rsa`, valid values are `2048`, `4096` or `8192`, and will default to `2048` if not specified. If `keyAlgorithm` is set to `ecdsa`, valid values are `256`, `384` or `521`, and will default to `256` if not specified. No other values are allowed.",
                    type: "integer"
                  },
                  keystores: {
                    description:
                      "Keystores configures additional keystore output formats stored in the `secretName` Secret resource.",
                    properties: {
                      jks: {
                        description:
                          "JKS configures options for storing a JKS keystore in the `spec.secretName` Secret resource.",
                        properties: {
                          create: {
                            description:
                              "Create enables JKS keystore creation for the Certificate. If true, a file named `keystore.jks` will be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef`. The keystore file will only be updated upon re-issuance. A file named `truststore.jks` will also be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef` containing the issuing Certificate Authority.",
                            type: "boolean"
                          },
                          passwordSecretRef: {
                            description:
                              "PasswordSecretRef is a reference to a key in a Secret resource containing the password used to encrypt the JKS keystore.",
                            properties: {
                              key: {
                                description:
                                  "The key of the entry in the Secret resource's `data` field to be used. Some instances of this field may be defaulted, in others it may be required.",
                                type: "string"
                              },
                              name: {
                                description:
                                  "Name of the resource being referred to. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names",
                                type: "string"
                              }
                            },
                            required: ["name"],
                            type: "object"
                          }
                        },
                        required: ["create", "passwordSecretRef"],
                        type: "object"
                      },
                      pkcs12: {
                        description:
                          "PKCS12 configures options for storing a PKCS12 keystore in the `spec.secretName` Secret resource.",
                        properties: {
                          create: {
                            description:
                              "Create enables PKCS12 keystore creation for the Certificate. If true, a file named `keystore.p12` will be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef`. The keystore file will only be updated upon re-issuance. A file named `truststore.p12` will also be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef` containing the issuing Certificate Authority.",
                            type: "boolean"
                          },
                          passwordSecretRef: {
                            description:
                              "PasswordSecretRef is a reference to a key in a Secret resource containing the password used to encrypt the PKCS12 keystore.",
                            properties: {
                              key: {
                                description:
                                  "The key of the entry in the Secret resource's `data` field to be used. Some instances of this field may be defaulted, in others it may be required.",
                                type: "string"
                              },
                              name: {
                                description:
                                  "Name of the resource being referred to. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names",
                                type: "string"
                              }
                            },
                            required: ["name"],
                            type: "object"
                          }
                        },
                        required: ["create", "passwordSecretRef"],
                        type: "object"
                      }
                    },
                    type: "object"
                  },
                  privateKey: {
                    description:
                      "Options to control private keys used for the Certificate.",
                    properties: {
                      rotationPolicy: {
                        description:
                          "RotationPolicy controls how private keys should be regenerated when a re-issuance is being processed. If set to Never, a private key will only be generated if one does not already exist in the target `spec.secretName`. If one does exists but it does not have the correct algorithm or size, a warning will be raised to await user intervention. If set to Always, a private key matching the specified requirements will be generated whenever a re-issuance occurs. Default is 'Never' for backward compatibility.",
                        type: "string"
                      }
                    },
                    type: "object"
                  },
                  renewBefore: {
                    description:
                      "The amount of time before the currently issued certificate's `notAfter` time that cert-manager will begin to attempt to renew the certificate. If this value is greater than the total duration of the certificate (i.e. notAfter - notBefore), it will be automatically renewed 2/3rds of the way through the certificate's duration.",
                    type: "string"
                  },
                  secretName: {
                    description:
                      "SecretName is the name of the secret resource that will be automatically created and managed by this Certificate resource. It will be populated with a private key and certificate, signed by the denoted issuer.",
                    type: "string"
                  },
                  subject: {
                    description:
                      "Full X509 name specification (https://golang.org/pkg/crypto/x509/pkix/#Name).",
                    properties: {
                      countries: {
                        description: "Countries to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      localities: {
                        description: "Cities to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      organizationalUnits: {
                        description:
                          "Organizational Units to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      organizations: {
                        description:
                          "Organizations to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      postalCodes: {
                        description:
                          "Postal codes to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      provinces: {
                        description:
                          "State/Provinces to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      serialNumber: {
                        description:
                          "Serial number to be used on the Certificate.",
                        type: "string"
                      },
                      streetAddresses: {
                        description:
                          "Street addresses to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      }
                    },
                    type: "object"
                  },
                  uriSANs: {
                    description:
                      "URISANs is a list of URI subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  usages: {
                    description:
                      "Usages is the set of x509 usages that are requested for the certificate. Defaults to `digital signature` and `key encipherment` if not specified.",
                    items: {
                      description:
                        'KeyUsage specifies valid usage contexts for keys. See: https://tools.ietf.org/html/rfc5280#section-4.2.1.3      https://tools.ietf.org/html/rfc5280#section-4.2.1.12 Valid KeyUsage values are as follows: "signing", "digital signature", "content commitment", "key encipherment", "key agreement", "data encipherment", "cert sign", "crl sign", "encipher only", "decipher only", "any", "server auth", "client auth", "code signing", "email protection", "s/mime", "ipsec end system", "ipsec tunnel", "ipsec user", "timestamping", "ocsp signing", "microsoft sgc", "netscape sgc"',
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
                required: ["issuerRef", "secretName"],
                type: "object"
              },
              status: {
                description:
                  "Status of the Certificate. This is set and managed automatically.",
                properties: {
                  conditions: {
                    description:
                      "List of status conditions to indicate the status of certificates. Known condition types are `Ready` and `Issuing`.",
                    items: {
                      description:
                        "CertificateCondition contains condition information for an Certificate.",
                      properties: {
                        lastTransitionTime: {
                          description:
                            "LastTransitionTime is the timestamp corresponding to the last status change of this condition.",
                          format: "date-time",
                          type: "string"
                        },
                        message: {
                          description:
                            "Message is a human readable description of the details of the last transition, complementing reason.",
                          type: "string"
                        },
                        reason: {
                          description:
                            "Reason is a brief machine readable explanation for the condition's last transition.",
                          type: "string"
                        },
                        status: {
                          description:
                            "Status of the condition, one of (`True`, `False`, `Unknown`).",
                          enum: ["True", "False", "Unknown"],
                          type: "string"
                        },
                        type: {
                          description:
                            "Type of the condition, known values are (`Ready`, `Issuing`).",
                          type: "string"
                        }
                      },
                      required: ["status", "type"],
                      type: "object"
                    },
                    type: "array"
                  },
                  lastFailureTime: {
                    description:
                      "LastFailureTime is the time as recorded by the Certificate controller of the most recent failure to complete a CertificateRequest for this Certificate resource. If set, cert-manager will not re-request another Certificate until 1 hour has elapsed from this time.",
                    format: "date-time",
                    type: "string"
                  },
                  nextPrivateKeySecretName: {
                    description:
                      "The name of the Secret resource containing the private key to be used for the next certificate iteration. The keymanager controller will automatically set this field if the `Issuing` condition is set to `True`. It will automatically unset this field when the Issuing condition is not set or False.",
                    type: "string"
                  },
                  notAfter: {
                    description:
                      "The expiration time of the certificate stored in the secret named by this resource in `spec.secretName`.",
                    format: "date-time",
                    type: "string"
                  },
                  notBefore: {
                    description:
                      "The time after which the certificate stored in the secret named by this resource in spec.secretName is valid.",
                    format: "date-time",
                    type: "string"
                  },
                  renewalTime: {
                    description:
                      "RenewalTime is the time at which the certificate will be next renewed. If not set, no upcoming renewal is scheduled.",
                    format: "date-time",
                    type: "string"
                  },
                  revision: {
                    description:
                      "The current 'revision' of the certificate as issued. \n When a CertificateRequest resource is created, it will have the `cert-manager.io/certificate-revision` set to one greater than the current value of this field. \n Upon issuance, this field will be set to the value of the annotation on the CertificateRequest resource used to issue the certificate. \n Persisting the value on the CertificateRequest resource allows the certificates controller to know whether a request is part of an old issuance or if it is part of the ongoing revision's issuance by checking if the revision value in the annotation is greater than this field.",
                    type: "integer"
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
            jsonPath: ".spec.secretName",
            name: "Secret",
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
              "A Certificate resource should be created to ensure an up to date and signed x509 certificate is stored in the Kubernetes Secret resource named in `spec.secretName`. \n The stored certificate will be renewed before it expires (as configured by `spec.renewBefore`).",
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
                description: "Desired state of the Certificate resource.",
                properties: {
                  commonName: {
                    description:
                      "CommonName is a common name to be used on the Certificate. The CommonName should have a length of 64 characters or fewer to avoid generating invalid CSRs. This value is ignored by TLS clients when any subject alt name is set. This is x509 behaviour: https://tools.ietf.org/html/rfc6125#section-6.4.4",
                    type: "string"
                  },
                  dnsNames: {
                    description:
                      "DNSNames is a list of DNS subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  duration: {
                    description:
                      "The requested 'duration' (i.e. lifetime) of the Certificate. This option may be ignored/overridden by some issuer types. If overridden and `renewBefore` is greater than the actual certificate duration, the certificate will be automatically renewed 2/3rds of the way through the certificate's duration.",
                    type: "string"
                  },
                  emailSANs: {
                    description:
                      "EmailSANs is a list of email subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  encodeUsagesInRequest: {
                    description:
                      "EncodeUsagesInRequest controls whether key usages should be present in the CertificateRequest",
                    type: "boolean"
                  },
                  ipAddresses: {
                    description:
                      "IPAddresses is a list of IP address subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  isCA: {
                    description:
                      "IsCA will mark this Certificate as valid for certificate signing. This will automatically add the `cert sign` usage to the list of `usages`.",
                    type: "boolean"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef is a reference to the issuer for this certificate. If the `kind` field is not set, or set to `Issuer`, an Issuer resource with the given name in the same namespace as the Certificate will be used. If the `kind` field is set to `ClusterIssuer`, a ClusterIssuer with the provided name will be used. The `name` field in this stanza is required at all times.",
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
                  keystores: {
                    description:
                      "Keystores configures additional keystore output formats stored in the `secretName` Secret resource.",
                    properties: {
                      jks: {
                        description:
                          "JKS configures options for storing a JKS keystore in the `spec.secretName` Secret resource.",
                        properties: {
                          create: {
                            description:
                              "Create enables JKS keystore creation for the Certificate. If true, a file named `keystore.jks` will be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef`. The keystore file will only be updated upon re-issuance.",
                            type: "boolean"
                          },
                          passwordSecretRef: {
                            description:
                              "PasswordSecretRef is a reference to a key in a Secret resource containing the password used to encrypt the JKS keystore.",
                            properties: {
                              key: {
                                description:
                                  "The key of the entry in the Secret resource's `data` field to be used. Some instances of this field may be defaulted, in others it may be required.",
                                type: "string"
                              },
                              name: {
                                description:
                                  "Name of the resource being referred to. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names",
                                type: "string"
                              }
                            },
                            required: ["name"],
                            type: "object"
                          }
                        },
                        required: ["create", "passwordSecretRef"],
                        type: "object"
                      },
                      pkcs12: {
                        description:
                          "PKCS12 configures options for storing a PKCS12 keystore in the `spec.secretName` Secret resource.",
                        properties: {
                          create: {
                            description:
                              "Create enables PKCS12 keystore creation for the Certificate. If true, a file named `keystore.p12` will be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef`. The keystore file will only be updated upon re-issuance.",
                            type: "boolean"
                          },
                          passwordSecretRef: {
                            description:
                              "PasswordSecretRef is a reference to a key in a Secret resource containing the password used to encrypt the PKCS12 keystore.",
                            properties: {
                              key: {
                                description:
                                  "The key of the entry in the Secret resource's `data` field to be used. Some instances of this field may be defaulted, in others it may be required.",
                                type: "string"
                              },
                              name: {
                                description:
                                  "Name of the resource being referred to. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names",
                                type: "string"
                              }
                            },
                            required: ["name"],
                            type: "object"
                          }
                        },
                        required: ["create", "passwordSecretRef"],
                        type: "object"
                      }
                    },
                    type: "object"
                  },
                  privateKey: {
                    description:
                      "Options to control private keys used for the Certificate.",
                    properties: {
                      algorithm: {
                        description:
                          "Algorithm is the private key algorithm of the corresponding private key for this certificate. If provided, allowed values are either `RSA` or `ECDSA` If `algorithm` is specified and `size` is not provided, key size of 256 will be used for `ECDSA` key algorithm and key size of 2048 will be used for `RSA` key algorithm.",
                        enum: ["RSA", "ECDSA"],
                        type: "string"
                      },
                      encoding: {
                        description:
                          "The private key cryptography standards (PKCS) encoding for this certificate's private key to be encoded in. If provided, allowed values are `PKCS1` and `PKCS8` standing for PKCS#1 and PKCS#8, respectively. Defaults to `PKCS1` if not specified.",
                        enum: ["PKCS1", "PKCS8"],
                        type: "string"
                      },
                      rotationPolicy: {
                        description:
                          "RotationPolicy controls how private keys should be regenerated when a re-issuance is being processed. If set to Never, a private key will only be generated if one does not already exist in the target `spec.secretName`. If one does exists but it does not have the correct algorithm or size, a warning will be raised to await user intervention. If set to Always, a private key matching the specified requirements will be generated whenever a re-issuance occurs. Default is 'Never' for backward compatibility.",
                        type: "string"
                      },
                      size: {
                        description:
                          "Size is the key bit size of the corresponding private key for this certificate. If `algorithm` is set to `RSA`, valid values are `2048`, `4096` or `8192`, and will default to `2048` if not specified. If `algorithm` is set to `ECDSA`, valid values are `256`, `384` or `521`, and will default to `256` if not specified. No other values are allowed.",
                        type: "integer"
                      }
                    },
                    type: "object"
                  },
                  renewBefore: {
                    description:
                      "The amount of time before the currently issued certificate's `notAfter` time that cert-manager will begin to attempt to renew the certificate. If this value is greater than the total duration of the certificate (i.e. notAfter - notBefore), it will be automatically renewed 2/3rds of the way through the certificate's duration.",
                    type: "string"
                  },
                  secretName: {
                    description:
                      "SecretName is the name of the secret resource that will be automatically created and managed by this Certificate resource. It will be populated with a private key and certificate, signed by the denoted issuer.",
                    type: "string"
                  },
                  subject: {
                    description:
                      "Full X509 name specification (https://golang.org/pkg/crypto/x509/pkix/#Name).",
                    properties: {
                      countries: {
                        description: "Countries to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      localities: {
                        description: "Cities to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      organizationalUnits: {
                        description:
                          "Organizational Units to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      organizations: {
                        description:
                          "Organizations to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      postalCodes: {
                        description:
                          "Postal codes to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      provinces: {
                        description:
                          "State/Provinces to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      serialNumber: {
                        description:
                          "Serial number to be used on the Certificate.",
                        type: "string"
                      },
                      streetAddresses: {
                        description:
                          "Street addresses to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      }
                    },
                    type: "object"
                  },
                  uriSANs: {
                    description:
                      "URISANs is a list of URI subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  usages: {
                    description:
                      "Usages is the set of x509 usages that are requested for the certificate. Defaults to `digital signature` and `key encipherment` if not specified.",
                    items: {
                      description:
                        'KeyUsage specifies valid usage contexts for keys. See: https://tools.ietf.org/html/rfc5280#section-4.2.1.3      https://tools.ietf.org/html/rfc5280#section-4.2.1.12 Valid KeyUsage values are as follows: "signing", "digital signature", "content commitment", "key encipherment", "key agreement", "data encipherment", "cert sign", "crl sign", "encipher only", "decipher only", "any", "server auth", "client auth", "code signing", "email protection", "s/mime", "ipsec end system", "ipsec tunnel", "ipsec user", "timestamping", "ocsp signing", "microsoft sgc", "netscape sgc"',
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
                required: ["issuerRef", "secretName"],
                type: "object"
              },
              status: {
                description:
                  "Status of the Certificate. This is set and managed automatically.",
                properties: {
                  conditions: {
                    description:
                      "List of status conditions to indicate the status of certificates. Known condition types are `Ready` and `Issuing`.",
                    items: {
                      description:
                        "CertificateCondition contains condition information for an Certificate.",
                      properties: {
                        lastTransitionTime: {
                          description:
                            "LastTransitionTime is the timestamp corresponding to the last status change of this condition.",
                          format: "date-time",
                          type: "string"
                        },
                        message: {
                          description:
                            "Message is a human readable description of the details of the last transition, complementing reason.",
                          type: "string"
                        },
                        reason: {
                          description:
                            "Reason is a brief machine readable explanation for the condition's last transition.",
                          type: "string"
                        },
                        status: {
                          description:
                            "Status of the condition, one of (`True`, `False`, `Unknown`).",
                          enum: ["True", "False", "Unknown"],
                          type: "string"
                        },
                        type: {
                          description:
                            "Type of the condition, known values are (`Ready`, `Issuing`).",
                          type: "string"
                        }
                      },
                      required: ["status", "type"],
                      type: "object"
                    },
                    type: "array"
                  },
                  lastFailureTime: {
                    description:
                      "LastFailureTime is the time as recorded by the Certificate controller of the most recent failure to complete a CertificateRequest for this Certificate resource. If set, cert-manager will not re-request another Certificate until 1 hour has elapsed from this time.",
                    format: "date-time",
                    type: "string"
                  },
                  nextPrivateKeySecretName: {
                    description:
                      "The name of the Secret resource containing the private key to be used for the next certificate iteration. The keymanager controller will automatically set this field if the `Issuing` condition is set to `True`. It will automatically unset this field when the Issuing condition is not set or False.",
                    type: "string"
                  },
                  notAfter: {
                    description:
                      "The expiration time of the certificate stored in the secret named by this resource in `spec.secretName`.",
                    format: "date-time",
                    type: "string"
                  },
                  notBefore: {
                    description:
                      "The time after which the certificate stored in the secret named by this resource in spec.secretName is valid.",
                    format: "date-time",
                    type: "string"
                  },
                  renewalTime: {
                    description:
                      "RenewalTime is the time at which the certificate will be next renewed. If not set, no upcoming renewal is scheduled.",
                    format: "date-time",
                    type: "string"
                  },
                  revision: {
                    description:
                      "The current 'revision' of the certificate as issued. \n When a CertificateRequest resource is created, it will have the `cert-manager.io/certificate-revision` set to one greater than the current value of this field. \n Upon issuance, this field will be set to the value of the annotation on the CertificateRequest resource used to issue the certificate. \n Persisting the value on the CertificateRequest resource allows the certificates controller to know whether a request is part of an old issuance or if it is part of the ongoing revision's issuance by checking if the revision value in the annotation is greater than this field.",
                    type: "integer"
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
            jsonPath: ".spec.secretName",
            name: "Secret",
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
              "A Certificate resource should be created to ensure an up to date and signed x509 certificate is stored in the Kubernetes Secret resource named in `spec.secretName`. \n The stored certificate will be renewed before it expires (as configured by `spec.renewBefore`).",
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
                description: "Desired state of the Certificate resource.",
                properties: {
                  commonName: {
                    description:
                      "CommonName is a common name to be used on the Certificate. The CommonName should have a length of 64 characters or fewer to avoid generating invalid CSRs. This value is ignored by TLS clients when any subject alt name is set. This is x509 behaviour: https://tools.ietf.org/html/rfc6125#section-6.4.4",
                    type: "string"
                  },
                  dnsNames: {
                    description:
                      "DNSNames is a list of DNS subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  duration: {
                    description:
                      "The requested 'duration' (i.e. lifetime) of the Certificate. This option may be ignored/overridden by some issuer types. If overridden and `renewBefore` is greater than the actual certificate duration, the certificate will be automatically renewed 2/3rds of the way through the certificate's duration.",
                    type: "string"
                  },
                  emailAddresses: {
                    description:
                      "EmailAddresses is a list of email subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  encodeUsagesInRequest: {
                    description:
                      "EncodeUsagesInRequest controls whether key usages should be present in the CertificateRequest",
                    type: "boolean"
                  },
                  ipAddresses: {
                    description:
                      "IPAddresses is a list of IP address subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  isCA: {
                    description:
                      "IsCA will mark this Certificate as valid for certificate signing. This will automatically add the `cert sign` usage to the list of `usages`.",
                    type: "boolean"
                  },
                  issuerRef: {
                    description:
                      "IssuerRef is a reference to the issuer for this certificate. If the `kind` field is not set, or set to `Issuer`, an Issuer resource with the given name in the same namespace as the Certificate will be used. If the `kind` field is set to `ClusterIssuer`, a ClusterIssuer with the provided name will be used. The `name` field in this stanza is required at all times.",
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
                  keystores: {
                    description:
                      "Keystores configures additional keystore output formats stored in the `secretName` Secret resource.",
                    properties: {
                      jks: {
                        description:
                          "JKS configures options for storing a JKS keystore in the `spec.secretName` Secret resource.",
                        properties: {
                          create: {
                            description:
                              "Create enables JKS keystore creation for the Certificate. If true, a file named `keystore.jks` will be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef`. The keystore file will only be updated upon re-issuance. A file named `truststore.jks` will also be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef` containing the issuing Certificate Authority",
                            type: "boolean"
                          },
                          passwordSecretRef: {
                            description:
                              "PasswordSecretRef is a reference to a key in a Secret resource containing the password used to encrypt the JKS keystore.",
                            properties: {
                              key: {
                                description:
                                  "The key of the entry in the Secret resource's `data` field to be used. Some instances of this field may be defaulted, in others it may be required.",
                                type: "string"
                              },
                              name: {
                                description:
                                  "Name of the resource being referred to. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names",
                                type: "string"
                              }
                            },
                            required: ["name"],
                            type: "object"
                          }
                        },
                        required: ["create", "passwordSecretRef"],
                        type: "object"
                      },
                      pkcs12: {
                        description:
                          "PKCS12 configures options for storing a PKCS12 keystore in the `spec.secretName` Secret resource.",
                        properties: {
                          create: {
                            description:
                              "Create enables PKCS12 keystore creation for the Certificate. If true, a file named `keystore.p12` will be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef`. The keystore file will only be updated upon re-issuance. A file named `truststore.p12` will also be created in the target Secret resource, encrypted using the password stored in `passwordSecretRef` containing the issuing Certificate Authority",
                            type: "boolean"
                          },
                          passwordSecretRef: {
                            description:
                              "PasswordSecretRef is a reference to a key in a Secret resource containing the password used to encrypt the PKCS12 keystore.",
                            properties: {
                              key: {
                                description:
                                  "The key of the entry in the Secret resource's `data` field to be used. Some instances of this field may be defaulted, in others it may be required.",
                                type: "string"
                              },
                              name: {
                                description:
                                  "Name of the resource being referred to. More info: https://kubernetes.io/docs/concepts/overview/working-with-objects/names/#names",
                                type: "string"
                              }
                            },
                            required: ["name"],
                            type: "object"
                          }
                        },
                        required: ["create", "passwordSecretRef"],
                        type: "object"
                      }
                    },
                    type: "object"
                  },
                  privateKey: {
                    description:
                      "Options to control private keys used for the Certificate.",
                    properties: {
                      algorithm: {
                        description:
                          "Algorithm is the private key algorithm of the corresponding private key for this certificate. If provided, allowed values are either `RSA` or `ECDSA` If `algorithm` is specified and `size` is not provided, key size of 256 will be used for `ECDSA` key algorithm and key size of 2048 will be used for `RSA` key algorithm.",
                        enum: ["RSA", "ECDSA"],
                        type: "string"
                      },
                      encoding: {
                        description:
                          "The private key cryptography standards (PKCS) encoding for this certificate's private key to be encoded in. If provided, allowed values are `PKCS1` and `PKCS8` standing for PKCS#1 and PKCS#8, respectively. Defaults to `PKCS1` if not specified.",
                        enum: ["PKCS1", "PKCS8"],
                        type: "string"
                      },
                      rotationPolicy: {
                        description:
                          "RotationPolicy controls how private keys should be regenerated when a re-issuance is being processed. If set to Never, a private key will only be generated if one does not already exist in the target `spec.secretName`. If one does exists but it does not have the correct algorithm or size, a warning will be raised to await user intervention. If set to Always, a private key matching the specified requirements will be generated whenever a re-issuance occurs. Default is 'Never' for backward compatibility.",
                        type: "string"
                      },
                      size: {
                        description:
                          "Size is the key bit size of the corresponding private key for this certificate. If `algorithm` is set to `RSA`, valid values are `2048`, `4096` or `8192`, and will default to `2048` if not specified. If `algorithm` is set to `ECDSA`, valid values are `256`, `384` or `521`, and will default to `256` if not specified. No other values are allowed.",
                        type: "integer"
                      }
                    },
                    type: "object"
                  },
                  renewBefore: {
                    description:
                      "The amount of time before the currently issued certificate's `notAfter` time that cert-manager will begin to attempt to renew the certificate. If this value is greater than the total duration of the certificate (i.e. notAfter - notBefore), it will be automatically renewed 2/3rds of the way through the certificate's duration.",
                    type: "string"
                  },
                  secretName: {
                    description:
                      "SecretName is the name of the secret resource that will be automatically created and managed by this Certificate resource. It will be populated with a private key and certificate, signed by the denoted issuer.",
                    type: "string"
                  },
                  subject: {
                    description:
                      "Full X509 name specification (https://golang.org/pkg/crypto/x509/pkix/#Name).",
                    properties: {
                      countries: {
                        description: "Countries to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      localities: {
                        description: "Cities to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      organizationalUnits: {
                        description:
                          "Organizational Units to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      organizations: {
                        description:
                          "Organizations to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      postalCodes: {
                        description:
                          "Postal codes to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      provinces: {
                        description:
                          "State/Provinces to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      },
                      serialNumber: {
                        description:
                          "Serial number to be used on the Certificate.",
                        type: "string"
                      },
                      streetAddresses: {
                        description:
                          "Street addresses to be used on the Certificate.",
                        items: {
                          type: "string"
                        },
                        type: "array"
                      }
                    },
                    type: "object"
                  },
                  uris: {
                    description:
                      "URIs is a list of URI subjectAltNames to be set on the Certificate.",
                    items: {
                      type: "string"
                    },
                    type: "array"
                  },
                  usages: {
                    description:
                      "Usages is the set of x509 usages that are requested for the certificate. Defaults to `digital signature` and `key encipherment` if not specified.",
                    items: {
                      description:
                        'KeyUsage specifies valid usage contexts for keys. See: https://tools.ietf.org/html/rfc5280#section-4.2.1.3      https://tools.ietf.org/html/rfc5280#section-4.2.1.12 Valid KeyUsage values are as follows: "signing", "digital signature", "content commitment", "key encipherment", "key agreement", "data encipherment", "cert sign", "crl sign", "encipher only", "decipher only", "any", "server auth", "client auth", "code signing", "email protection", "s/mime", "ipsec end system", "ipsec tunnel", "ipsec user", "timestamping", "ocsp signing", "microsoft sgc", "netscape sgc"',
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
                required: ["issuerRef", "secretName"],
                type: "object"
              },
              status: {
                description:
                  "Status of the Certificate. This is set and managed automatically.",
                properties: {
                  conditions: {
                    description:
                      "List of status conditions to indicate the status of certificates. Known condition types are `Ready` and `Issuing`.",
                    items: {
                      description:
                        "CertificateCondition contains condition information for an Certificate.",
                      properties: {
                        lastTransitionTime: {
                          description:
                            "LastTransitionTime is the timestamp corresponding to the last status change of this condition.",
                          format: "date-time",
                          type: "string"
                        },
                        message: {
                          description:
                            "Message is a human readable description of the details of the last transition, complementing reason.",
                          type: "string"
                        },
                        reason: {
                          description:
                            "Reason is a brief machine readable explanation for the condition's last transition.",
                          type: "string"
                        },
                        status: {
                          description:
                            "Status of the condition, one of (`True`, `False`, `Unknown`).",
                          enum: ["True", "False", "Unknown"],
                          type: "string"
                        },
                        type: {
                          description:
                            "Type of the condition, known values are (`Ready`, `Issuing`).",
                          type: "string"
                        }
                      },
                      required: ["status", "type"],
                      type: "object"
                    },
                    type: "array"
                  },
                  lastFailureTime: {
                    description:
                      "LastFailureTime is the time as recorded by the Certificate controller of the most recent failure to complete a CertificateRequest for this Certificate resource. If set, cert-manager will not re-request another Certificate until 1 hour has elapsed from this time.",
                    format: "date-time",
                    type: "string"
                  },
                  nextPrivateKeySecretName: {
                    description:
                      "The name of the Secret resource containing the private key to be used for the next certificate iteration. The keymanager controller will automatically set this field if the `Issuing` condition is set to `True`. It will automatically unset this field when the Issuing condition is not set or False.",
                    type: "string"
                  },
                  notAfter: {
                    description:
                      "The expiration time of the certificate stored in the secret named by this resource in `spec.secretName`.",
                    format: "date-time",
                    type: "string"
                  },
                  notBefore: {
                    description:
                      "The time after which the certificate stored in the secret named by this resource in spec.secretName is valid.",
                    format: "date-time",
                    type: "string"
                  },
                  renewalTime: {
                    description:
                      "RenewalTime is the time at which the certificate will be next renewed. If not set, no upcoming renewal is scheduled.",
                    format: "date-time",
                    type: "string"
                  },
                  revision: {
                    description:
                      "The current 'revision' of the certificate as issued. \n When a CertificateRequest resource is created, it will have the `cert-manager.io/certificate-revision` set to one greater than the current value of this field. \n Upon issuance, this field will be set to the value of the annotation on the CertificateRequest resource used to issue the certificate. \n Persisting the value on the CertificateRequest resource allows the certificates controller to know whether a request is part of an old issuance or if it is part of the ongoing revision's issuance by checking if the revision value in the annotation is greater than this field.",
                    type: "integer"
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
