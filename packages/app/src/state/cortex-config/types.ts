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

import * as yup from "yup";

const isDuration = {
  name: "is-duration",
  message: "Must be a valid duration: [number][s|m|h|d|w], e.g. 2d for 2 days.",
  test: (value: any) =>
    typeof value === "undefined" || /^\d+[s|m|h|d|w]{1}$/.test(value || "") // allow this field to be undefined or be a valid duration
};

export const cortexLimitsSchema = yup.object({
  ingestion_rate: yup.number().integer().min(0, "Cannot be negative").meta({
    description: "Ingestion rate limit in samples per second for this tenant."
  }),
  ingestion_burst_size: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "Allowed ingestion burst size (in number of samples) for this tenant."
    }),
  // Not including in first version. We can map to a comma separated text box for the values in the next iteration.
  // drop_labels: yup.array().of(yup.string()).meta({
  //   description:
  //     "Comma-separated list of labels to remove from all metrics in this tenant."
  // }),
  accept_ha_samples: yup.boolean().meta({
    description:
      "Enable handling of samples with external labels identifying replicas in an HA Prometheus setup."
  }),
  ha_cluster_label: yup.string().meta({
    description:
      "Prometheus label to look for in samples to identify a Prometheus HA cluster."
  }),
  ha_replica_label: yup.string().meta({
    description:
      "Prometheus label to look for in samples to identify a Prometheus HA replica."
  }),
  ha_max_clusters: yup.number().integer().min(0, "Cannot be negative").meta({
    description:
      "Maximum number of clusters that HA tracker will keep track of for single user."
  }),
  max_label_name_length: yup
    .number()
    .meta({ description: "Maximum length accepted for label names." }),
  max_label_value_length: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "Maximum length accepted for label value. This setting also applies to the metric name."
    }),
  max_label_names_per_series: yup
    .number()
    .meta({ description: "Maximum number of label names per series." }),
  max_metadata_length: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "Maximum length accepted for metric metadata. Metadata refers to Metric Name, HELP and UNIT."
    }),
  reject_old_samples: yup
    .boolean()
    .meta({ description: "Reject old samples." }),
  reject_old_samples_max_age: yup
    .string()
    .meta({
      description:
        "Maximum accepted sample age before rejecting, e.g. 8d or 2w."
    })
    .test(isDuration),
  creation_grace_period: yup
    .string()
    .meta({
      description:
        "Duration which table will be created/deleted before/after it's needed; Samples won't be accepted from before this time."
    })
    .test(isDuration),
  enforce_metadata_metric_name: yup
    .boolean()
    .meta({ description: "Enforce every metadata to have a metric name." }),
  enforce_metric_name: yup
    .boolean()
    .meta({ description: "Enforce every sample to have a metric name." }),
  ingestion_tenant_shard_size: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "The Tenant's shard size when the shuffle-sharding strategy is used. Must be set both on ingesters and distributors. A value of 0 disables shuffle sharding for the tenant."
    }),
  max_series_per_user: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "The maximum number of active series for this tenant, per ingester. 0 to disable."
    }),
  max_series_per_metric: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "The maximum number of active series per metric name, per ingester. 0 to disable."
    }),
  max_global_series_per_user: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "The maximum number of active series for this tenant, across the cluster. 0 to disable."
    }),
  max_global_series_per_metric: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "The maximum number of active series per metric name, across the cluster. 0 to disable."
    }),

  max_metadata_per_user: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "The maximum number of active metrics with metadata for this tenant, per ingester. 0 to disable."
    }),
  max_metadata_per_metric: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "The maximum number of metadata per metric, per ingester. 0 to disable."
    }),
  max_global_metadata_per_user: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "The maximum number of active metrics with metadata for this tenant, across the cluster. 0 to disable."
    }),
  max_global_metadata_per_metric: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "The maximum number of metadata per metric, across the cluster. 0 to disable."
    }),

  max_fetched_chunks_per_query: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "Maximum number of chunks that can be fetched in a single query from ingesters and long-term storage: the total number of actual fetched chunks could be 2x the limit, being independently applied when querying ingesters and long-term storage. This limit is enforced in the ingester (if chunks streaming is enabled), querier, ruler and store-gateway."
    }),
  max_query_lookback: yup
    .string()
    .meta({
      description:
        "Limit how long back data (series and metadata) can be queried, up until <lookback> duration ago. This limit is enforced in the query-frontend, querier and ruler. If the requested time range is outside the allowed range, the request will not fail but will be manipulated to only query data within the allowed time range. 0 to disable."
    })
    .test(isDuration),
  max_query_length: yup
    .string()
    .meta({
      description:
        "Limit the query time range (end - start time). This limit is enforced in the query-frontend (on the received query), in the querier (on the query possibly split by the query-frontend) and in the chunks storage. 0 to disable."
    })
    .test(isDuration),
  max_query_parallelism: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "Maximum number of split queries will be scheduled in parallel by the frontend."
    }),
  max_cache_freshness: yup
    .string()
    .meta({
      description:
        "Most recent allowed cacheable result for this tenant, to prevent caching very recent results that might still be in flux."
    })
    .test(isDuration),
  max_queriers_per_tenant: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "Maximum number of queriers that can handle requests for this tenant. If set to 0 or value higher than number of available queriers, *all* queriers will handle requests for the tenant. Each frontend (or query-scheduler, if used) will select the same set of queriers for the same tenant (given that all queriers are connected to all frontends / query-schedulers). This option only works with queriers connecting to the query-frontend / query-scheduler, not when using downstream URL."
    }),
  ruler_evaluation_delay_duration: yup
    .string()
    .meta({
      description:
        "Duration to delay the evaluation of rules to ensure the underlying metrics have been pushed to Cortex."
    })
    .test(isDuration),
  ruler_tenant_shard_size: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "This tenant's shard size. A value of 0 disables shuffle sharding for the Ruler in this tenant."
    }),
  ruler_max_rules_per_rule_group: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "Maximum number of rules per rule group for this tenant. 0 to disable."
    }),
  ruler_max_rule_groups_per_tenant: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "Maximum number of rule groups for this tenant. 0 to disable."
    }),
  store_gateway_tenant_shard_size: yup
    .number()
    .integer()
    .min(0, "Cannot be negative")
    .meta({
      description:
        "This tenant's shard size. A value of 0 disables shuffle sharding for the tenant."
    }),
  compactor_blocks_retention_period: yup
    .string()
    .meta({
      description:
        "Delete blocks containing samples older than the specified retention period. 0 to disable."
    })
    .test(isDuration)
});

export type CortexLimits = yup.InferType<typeof cortexLimitsSchema>;
export const CortexLimitsSchemaDescription = cortexLimitsSchema.fields;
export type CortexLimitsKeys = keyof typeof CortexLimitsSchemaDescription;
export type CortexLimitsValues = typeof CortexLimitsSchemaDescription[CortexLimitsKeys];

export type RuntimeConfig = {
  overrides: {
    [tenant: string]: CortexLimits;
  };
};

export type Config = {
  limits: CortexLimits;
};

// use this same id to unsubscribe
export type SubscriptionID = number;
