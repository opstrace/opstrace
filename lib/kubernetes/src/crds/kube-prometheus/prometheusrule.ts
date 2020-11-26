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
 * taken from https://github.com/prometheus-operator/kube-prometheus/tree/45e2cd1248eb61f9eb3c1ea0206db1e0479b05d8/manifests/setup
 *
 * 1. copy the correct yaml
 * 2. covert to json (https://www.convertjson.com/yaml-to-json.htm)
 * 3. paste here
 * 4. `yarn generate-apis` (this will take this CRD and turn it into a KubernetesResource Class that we use in our Typescript).
 *     Output from this command is in https://github.com/opstrace/opstrace/tree/6be8da8aa2db3479d72acb47b0156ff2b04939a2/lib/kubernetes/src/custom-resources directory.
 * 5. it's likely you'll have compiler errors now in packages like the controller, where we now need to update the resource spec
 * 5. adjust any specs that now use the updated resources so they conform to the new spec.
 */
export const prometheusrule = {
  apiVersion: "apiextensions.k8s.io/v1",
  kind: "CustomResourceDefinition",
  metadata: {
    annotations: {
      "controller-gen.kubebuilder.io/version": "v0.2.4"
    },
    name: "prometheusrules.monitoring.coreos.com"
  },
  spec: {
    group: "monitoring.coreos.com",
    names: {
      kind: "PrometheusRule",
      listKind: "PrometheusRuleList",
      plural: "prometheusrules",
      singular: "prometheusrule"
    },
    scope: "Namespaced",
    versions: [
      {
        name: "v1",
        schema: {
          openAPIV3Schema: {
            description:
              "PrometheusRule defines alerting rules for a Prometheus instance",
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
                description:
                  "Specification of desired alerting rule definitions for Prometheus.",
                properties: {
                  groups: {
                    description: "Content of Prometheus rule file",
                    items: {
                      description:
                        "RuleGroup is a list of sequentially evaluated recording and alerting rules. Note: PartialResponseStrategy is only used by ThanosRuler and will be ignored by Prometheus instances.  Valid values for this field are 'warn' or 'abort'.  More info: https://github.com/thanos-io/thanos/blob/master/docs/components/rule.md#partial-response",
                      properties: {
                        interval: {
                          type: "string"
                        },
                        name: {
                          type: "string"
                        },
                        partial_response_strategy: {
                          type: "string"
                        },
                        rules: {
                          items: {
                            description:
                              "Rule describes an alerting or recording rule.",
                            properties: {
                              alert: {
                                type: "string"
                              },
                              annotations: {
                                additionalProperties: {
                                  type: "string"
                                },
                                type: "object"
                              },
                              expr: {
                                anyOf: [
                                  {
                                    type: "integer"
                                  },
                                  {
                                    type: "string"
                                  }
                                ],
                                "x-kubernetes-int-or-string": true
                              },
                              for: {
                                type: "string"
                              },
                              labels: {
                                additionalProperties: {
                                  type: "string"
                                },
                                type: "object"
                              },
                              record: {
                                type: "string"
                              }
                            },
                            required: ["expr"],
                            type: "object"
                          },
                          type: "array"
                        }
                      },
                      required: ["name", "rules"],
                      type: "object"
                    },
                    type: "array"
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
        storage: true
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
