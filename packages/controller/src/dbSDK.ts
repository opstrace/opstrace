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

import { GraphQLClient } from "graphql-request";
import { print } from "graphql";
import { GraphQLError } from "graphql-request/dist/types";
import { Headers } from "graphql-request/dist/types.dom";
import gql from "graphql-tag";
export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> &
  { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> &
  { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  json: any;
  jsonb: any;
  timestamp: any;
  timestamptz: any;
  uuid: any;
};

export type Alertmanager = {
  config?: Maybe<Scalars["String"]>;
  online: Scalars["Boolean"];
  tenant_id: Scalars["String"];
};

export type AlertmanagerInput = {
  config: Scalars["String"];
};

/** expression to compare columns of type Boolean. All fields are combined with logical 'AND'. */
export type Boolean_Comparison_Exp = {
  _eq?: Maybe<Scalars["Boolean"]>;
  _gt?: Maybe<Scalars["Boolean"]>;
  _gte?: Maybe<Scalars["Boolean"]>;
  _in?: Maybe<Array<Scalars["Boolean"]>>;
  _is_null?: Maybe<Scalars["Boolean"]>;
  _lt?: Maybe<Scalars["Boolean"]>;
  _lte?: Maybe<Scalars["Boolean"]>;
  _neq?: Maybe<Scalars["Boolean"]>;
  _nin?: Maybe<Array<Scalars["Boolean"]>>;
};

export enum ErrorType {
  ServiceError = "SERVICE_ERROR",
  ServiceOffline = "SERVICE_OFFLINE",
  ValidationFailed = "VALIDATION_FAILED"
}

export type RuleGroup = {
  namespace: Scalars["String"];
  online: Scalars["Boolean"];
  rule_group?: Maybe<Scalars["String"]>;
  rule_group_name: Scalars["String"];
  tenant_id: Scalars["String"];
};

export type RuleGroupInput = {
  rule_group: Scalars["String"];
};

export type Rules = {
  online: Scalars["Boolean"];
  rules?: Maybe<Scalars["String"]>;
  tenant_id: Scalars["String"];
};

export type StatusResponse = {
  error_message?: Maybe<Scalars["String"]>;
  error_raw_response?: Maybe<Scalars["String"]>;
  error_type?: Maybe<ErrorType>;
  success: Scalars["Boolean"];
};

/** expression to compare columns of type String. All fields are combined with logical 'AND'. */
export type String_Comparison_Exp = {
  _eq?: Maybe<Scalars["String"]>;
  _gt?: Maybe<Scalars["String"]>;
  _gte?: Maybe<Scalars["String"]>;
  _ilike?: Maybe<Scalars["String"]>;
  _in?: Maybe<Array<Scalars["String"]>>;
  _is_null?: Maybe<Scalars["Boolean"]>;
  _like?: Maybe<Scalars["String"]>;
  _lt?: Maybe<Scalars["String"]>;
  _lte?: Maybe<Scalars["String"]>;
  _neq?: Maybe<Scalars["String"]>;
  _nilike?: Maybe<Scalars["String"]>;
  _nin?: Maybe<Array<Scalars["String"]>>;
  _nlike?: Maybe<Scalars["String"]>;
  _nsimilar?: Maybe<Scalars["String"]>;
  _similar?: Maybe<Scalars["String"]>;
};

/** columns and relationships of "credential" */
export type Credential = {
  created_at: Scalars["timestamptz"];
  /** An array relationship */
  exporters: Array<Exporter>;
  /** An aggregated array relationship */
  exporters_aggregate: Exporter_Aggregate;
  name: Scalars["String"];
  tenant: Scalars["String"];
  /** An object relationship */
  tenantByTenant: Tenant;
  type: Scalars["String"];
  updated_at: Scalars["timestamptz"];
  value: Scalars["json"];
};

/** columns and relationships of "credential" */
export type CredentialExportersArgs = {
  distinct_on?: Maybe<Array<Exporter_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Exporter_Order_By>>;
  where?: Maybe<Exporter_Bool_Exp>;
};

/** columns and relationships of "credential" */
export type CredentialExporters_AggregateArgs = {
  distinct_on?: Maybe<Array<Exporter_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Exporter_Order_By>>;
  where?: Maybe<Exporter_Bool_Exp>;
};

/** columns and relationships of "credential" */
export type CredentialValueArgs = {
  path?: Maybe<Scalars["String"]>;
};

/** aggregated selection of "credential" */
export type Credential_Aggregate = {
  aggregate?: Maybe<Credential_Aggregate_Fields>;
  nodes: Array<Credential>;
};

/** aggregate fields of "credential" */
export type Credential_Aggregate_Fields = {
  count?: Maybe<Scalars["Int"]>;
  max?: Maybe<Credential_Max_Fields>;
  min?: Maybe<Credential_Min_Fields>;
};

/** aggregate fields of "credential" */
export type Credential_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Credential_Select_Column>>;
  distinct?: Maybe<Scalars["Boolean"]>;
};

/** order by aggregate values of table "credential" */
export type Credential_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<Credential_Max_Order_By>;
  min?: Maybe<Credential_Min_Order_By>;
};

/** input type for inserting array relation for remote table "credential" */
export type Credential_Arr_Rel_Insert_Input = {
  data: Array<Credential_Insert_Input>;
  on_conflict?: Maybe<Credential_On_Conflict>;
};

/** Boolean expression to filter rows from the table "credential". All fields are combined with a logical 'AND'. */
export type Credential_Bool_Exp = {
  _and?: Maybe<Array<Maybe<Credential_Bool_Exp>>>;
  _not?: Maybe<Credential_Bool_Exp>;
  _or?: Maybe<Array<Maybe<Credential_Bool_Exp>>>;
  created_at?: Maybe<Timestamptz_Comparison_Exp>;
  exporters?: Maybe<Exporter_Bool_Exp>;
  name?: Maybe<String_Comparison_Exp>;
  tenant?: Maybe<String_Comparison_Exp>;
  tenantByTenant?: Maybe<Tenant_Bool_Exp>;
  type?: Maybe<String_Comparison_Exp>;
  updated_at?: Maybe<Timestamptz_Comparison_Exp>;
  value?: Maybe<Json_Comparison_Exp>;
};

/** unique or primary key constraints on table "credential" */
export enum Credential_Constraint {
  /** unique or primary key constraint */
  CredentialPkey = "credential_pkey"
}

/** input type for inserting data into table "credential" */
export type Credential_Insert_Input = {
  created_at?: Maybe<Scalars["timestamptz"]>;
  exporters?: Maybe<Exporter_Arr_Rel_Insert_Input>;
  name?: Maybe<Scalars["String"]>;
  tenant?: Maybe<Scalars["String"]>;
  tenantByTenant?: Maybe<Tenant_Obj_Rel_Insert_Input>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamptz"]>;
  value?: Maybe<Scalars["json"]>;
};

/** aggregate max on columns */
export type Credential_Max_Fields = {
  created_at?: Maybe<Scalars["timestamptz"]>;
  name?: Maybe<Scalars["String"]>;
  tenant?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamptz"]>;
};

/** order by max() on columns of table "credential" */
export type Credential_Max_Order_By = {
  created_at?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  tenant?: Maybe<Order_By>;
  type?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Credential_Min_Fields = {
  created_at?: Maybe<Scalars["timestamptz"]>;
  name?: Maybe<Scalars["String"]>;
  tenant?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamptz"]>;
};

/** order by min() on columns of table "credential" */
export type Credential_Min_Order_By = {
  created_at?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  tenant?: Maybe<Order_By>;
  type?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** response of any mutation on the table "credential" */
export type Credential_Mutation_Response = {
  /** number of affected rows by the mutation */
  affected_rows: Scalars["Int"];
  /** data of the affected rows by the mutation */
  returning: Array<Credential>;
};

/** input type for inserting object relation for remote table "credential" */
export type Credential_Obj_Rel_Insert_Input = {
  data: Credential_Insert_Input;
  on_conflict?: Maybe<Credential_On_Conflict>;
};

/** on conflict condition type for table "credential" */
export type Credential_On_Conflict = {
  constraint: Credential_Constraint;
  update_columns: Array<Credential_Update_Column>;
  where?: Maybe<Credential_Bool_Exp>;
};

/** ordering options when selecting data from "credential" */
export type Credential_Order_By = {
  created_at?: Maybe<Order_By>;
  exporters_aggregate?: Maybe<Exporter_Aggregate_Order_By>;
  name?: Maybe<Order_By>;
  tenant?: Maybe<Order_By>;
  tenantByTenant?: Maybe<Tenant_Order_By>;
  type?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
  value?: Maybe<Order_By>;
};

/** primary key columns input for table: "credential" */
export type Credential_Pk_Columns_Input = {
  name: Scalars["String"];
  tenant: Scalars["String"];
};

/** select columns of table "credential" */
export enum Credential_Select_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Name = "name",
  /** column name */
  Tenant = "tenant",
  /** column name */
  Type = "type",
  /** column name */
  UpdatedAt = "updated_at",
  /** column name */
  Value = "value"
}

/** input type for updating data in table "credential" */
export type Credential_Set_Input = {
  created_at?: Maybe<Scalars["timestamptz"]>;
  name?: Maybe<Scalars["String"]>;
  tenant?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamptz"]>;
  value?: Maybe<Scalars["json"]>;
};

/** update columns of table "credential" */
export enum Credential_Update_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Name = "name",
  /** column name */
  Tenant = "tenant",
  /** column name */
  Type = "type",
  /** column name */
  UpdatedAt = "updated_at",
  /** column name */
  Value = "value"
}

/** columns and relationships of "exporter" */
export type Exporter = {
  config: Scalars["json"];
  created_at: Scalars["timestamptz"];
  credential?: Maybe<Scalars["String"]>;
  /** An object relationship */
  credentialByCredentialTenant?: Maybe<Credential>;
  name: Scalars["String"];
  tenant: Scalars["String"];
  /** An object relationship */
  tenantByTenant: Tenant;
  type: Scalars["String"];
  updated_at: Scalars["timestamptz"];
};

/** columns and relationships of "exporter" */
export type ExporterConfigArgs = {
  path?: Maybe<Scalars["String"]>;
};

/** aggregated selection of "exporter" */
export type Exporter_Aggregate = {
  aggregate?: Maybe<Exporter_Aggregate_Fields>;
  nodes: Array<Exporter>;
};

/** aggregate fields of "exporter" */
export type Exporter_Aggregate_Fields = {
  count?: Maybe<Scalars["Int"]>;
  max?: Maybe<Exporter_Max_Fields>;
  min?: Maybe<Exporter_Min_Fields>;
};

/** aggregate fields of "exporter" */
export type Exporter_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Exporter_Select_Column>>;
  distinct?: Maybe<Scalars["Boolean"]>;
};

/** order by aggregate values of table "exporter" */
export type Exporter_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<Exporter_Max_Order_By>;
  min?: Maybe<Exporter_Min_Order_By>;
};

/** input type for inserting array relation for remote table "exporter" */
export type Exporter_Arr_Rel_Insert_Input = {
  data: Array<Exporter_Insert_Input>;
  on_conflict?: Maybe<Exporter_On_Conflict>;
};

/** Boolean expression to filter rows from the table "exporter". All fields are combined with a logical 'AND'. */
export type Exporter_Bool_Exp = {
  _and?: Maybe<Array<Maybe<Exporter_Bool_Exp>>>;
  _not?: Maybe<Exporter_Bool_Exp>;
  _or?: Maybe<Array<Maybe<Exporter_Bool_Exp>>>;
  config?: Maybe<Json_Comparison_Exp>;
  created_at?: Maybe<Timestamptz_Comparison_Exp>;
  credential?: Maybe<String_Comparison_Exp>;
  credentialByCredentialTenant?: Maybe<Credential_Bool_Exp>;
  name?: Maybe<String_Comparison_Exp>;
  tenant?: Maybe<String_Comparison_Exp>;
  tenantByTenant?: Maybe<Tenant_Bool_Exp>;
  type?: Maybe<String_Comparison_Exp>;
  updated_at?: Maybe<Timestamptz_Comparison_Exp>;
};

/** unique or primary key constraints on table "exporter" */
export enum Exporter_Constraint {
  /** unique or primary key constraint */
  ExporterPkey = "exporter_pkey"
}

/** input type for inserting data into table "exporter" */
export type Exporter_Insert_Input = {
  config?: Maybe<Scalars["json"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  credential?: Maybe<Scalars["String"]>;
  credentialByCredentialTenant?: Maybe<Credential_Obj_Rel_Insert_Input>;
  name?: Maybe<Scalars["String"]>;
  tenant?: Maybe<Scalars["String"]>;
  tenantByTenant?: Maybe<Tenant_Obj_Rel_Insert_Input>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamptz"]>;
};

/** aggregate max on columns */
export type Exporter_Max_Fields = {
  created_at?: Maybe<Scalars["timestamptz"]>;
  credential?: Maybe<Scalars["String"]>;
  name?: Maybe<Scalars["String"]>;
  tenant?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamptz"]>;
};

/** order by max() on columns of table "exporter" */
export type Exporter_Max_Order_By = {
  created_at?: Maybe<Order_By>;
  credential?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  tenant?: Maybe<Order_By>;
  type?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Exporter_Min_Fields = {
  created_at?: Maybe<Scalars["timestamptz"]>;
  credential?: Maybe<Scalars["String"]>;
  name?: Maybe<Scalars["String"]>;
  tenant?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamptz"]>;
};

/** order by min() on columns of table "exporter" */
export type Exporter_Min_Order_By = {
  created_at?: Maybe<Order_By>;
  credential?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  tenant?: Maybe<Order_By>;
  type?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** response of any mutation on the table "exporter" */
export type Exporter_Mutation_Response = {
  /** number of affected rows by the mutation */
  affected_rows: Scalars["Int"];
  /** data of the affected rows by the mutation */
  returning: Array<Exporter>;
};

/** input type for inserting object relation for remote table "exporter" */
export type Exporter_Obj_Rel_Insert_Input = {
  data: Exporter_Insert_Input;
  on_conflict?: Maybe<Exporter_On_Conflict>;
};

/** on conflict condition type for table "exporter" */
export type Exporter_On_Conflict = {
  constraint: Exporter_Constraint;
  update_columns: Array<Exporter_Update_Column>;
  where?: Maybe<Exporter_Bool_Exp>;
};

/** ordering options when selecting data from "exporter" */
export type Exporter_Order_By = {
  config?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  credential?: Maybe<Order_By>;
  credentialByCredentialTenant?: Maybe<Credential_Order_By>;
  name?: Maybe<Order_By>;
  tenant?: Maybe<Order_By>;
  tenantByTenant?: Maybe<Tenant_Order_By>;
  type?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** primary key columns input for table: "exporter" */
export type Exporter_Pk_Columns_Input = {
  name: Scalars["String"];
  tenant: Scalars["String"];
};

/** select columns of table "exporter" */
export enum Exporter_Select_Column {
  /** column name */
  Config = "config",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Credential = "credential",
  /** column name */
  Name = "name",
  /** column name */
  Tenant = "tenant",
  /** column name */
  Type = "type",
  /** column name */
  UpdatedAt = "updated_at"
}

/** input type for updating data in table "exporter" */
export type Exporter_Set_Input = {
  config?: Maybe<Scalars["json"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  credential?: Maybe<Scalars["String"]>;
  name?: Maybe<Scalars["String"]>;
  tenant?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamptz"]>;
};

/** update columns of table "exporter" */
export enum Exporter_Update_Column {
  /** column name */
  Config = "config",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Credential = "credential",
  /** column name */
  Name = "name",
  /** column name */
  Tenant = "tenant",
  /** column name */
  Type = "type",
  /** column name */
  UpdatedAt = "updated_at"
}

/** columns and relationships of "integration" */
export type Integration = {
  created_at: Scalars["timestamp"];
  data: Scalars["jsonb"];
  grafana_metadata: Scalars["jsonb"];
  id: Scalars["uuid"];
  key: Scalars["String"];
  kind: Scalars["String"];
  name: Scalars["String"];
  /** An object relationship */
  tenant: Tenant;
  tenant_id: Scalars["uuid"];
  updated_at: Scalars["timestamp"];
};

/** columns and relationships of "integration" */
export type IntegrationDataArgs = {
  path?: Maybe<Scalars["String"]>;
};

/** columns and relationships of "integration" */
export type IntegrationGrafana_MetadataArgs = {
  path?: Maybe<Scalars["String"]>;
};

/** aggregated selection of "integration" */
export type Integration_Aggregate = {
  aggregate?: Maybe<Integration_Aggregate_Fields>;
  nodes: Array<Integration>;
};

/** aggregate fields of "integration" */
export type Integration_Aggregate_Fields = {
  count?: Maybe<Scalars["Int"]>;
  max?: Maybe<Integration_Max_Fields>;
  min?: Maybe<Integration_Min_Fields>;
};

/** aggregate fields of "integration" */
export type Integration_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Integration_Select_Column>>;
  distinct?: Maybe<Scalars["Boolean"]>;
};

/** order by aggregate values of table "integration" */
export type Integration_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<Integration_Max_Order_By>;
  min?: Maybe<Integration_Min_Order_By>;
};

/** append existing jsonb value of filtered columns with new jsonb value */
export type Integration_Append_Input = {
  data?: Maybe<Scalars["jsonb"]>;
  grafana_metadata?: Maybe<Scalars["jsonb"]>;
};

/** input type for inserting array relation for remote table "integration" */
export type Integration_Arr_Rel_Insert_Input = {
  data: Array<Integration_Insert_Input>;
  on_conflict?: Maybe<Integration_On_Conflict>;
};

/** Boolean expression to filter rows from the table "integration". All fields are combined with a logical 'AND'. */
export type Integration_Bool_Exp = {
  _and?: Maybe<Array<Maybe<Integration_Bool_Exp>>>;
  _not?: Maybe<Integration_Bool_Exp>;
  _or?: Maybe<Array<Maybe<Integration_Bool_Exp>>>;
  created_at?: Maybe<Timestamp_Comparison_Exp>;
  data?: Maybe<Jsonb_Comparison_Exp>;
  grafana_metadata?: Maybe<Jsonb_Comparison_Exp>;
  id?: Maybe<Uuid_Comparison_Exp>;
  key?: Maybe<String_Comparison_Exp>;
  kind?: Maybe<String_Comparison_Exp>;
  name?: Maybe<String_Comparison_Exp>;
  tenant?: Maybe<Tenant_Bool_Exp>;
  tenant_id?: Maybe<Uuid_Comparison_Exp>;
  updated_at?: Maybe<Timestamp_Comparison_Exp>;
};

/** unique or primary key constraints on table "integration" */
export enum Integration_Constraint {
  /** unique or primary key constraint */
  IntegrationKeyKey = "integration_key_key",
  /** unique or primary key constraint */
  IntegrationsNameTenantIdKey = "integrations_name_tenant_id_key",
  /** unique or primary key constraint */
  IntegrationsPkey = "integrations_pkey"
}

/** delete the field or element with specified path (for JSON arrays, negative integers count from the end) */
export type Integration_Delete_At_Path_Input = {
  data?: Maybe<Array<Maybe<Scalars["String"]>>>;
  grafana_metadata?: Maybe<Array<Maybe<Scalars["String"]>>>;
};

/** delete the array element with specified index (negative integers count from the end). throws an error if top level container is not an array */
export type Integration_Delete_Elem_Input = {
  data?: Maybe<Scalars["Int"]>;
  grafana_metadata?: Maybe<Scalars["Int"]>;
};

/** delete key/value pair or string element. key/value pairs are matched based on their key value */
export type Integration_Delete_Key_Input = {
  data?: Maybe<Scalars["String"]>;
  grafana_metadata?: Maybe<Scalars["String"]>;
};

/** input type for inserting data into table "integration" */
export type Integration_Insert_Input = {
  created_at?: Maybe<Scalars["timestamp"]>;
  data?: Maybe<Scalars["jsonb"]>;
  grafana_metadata?: Maybe<Scalars["jsonb"]>;
  id?: Maybe<Scalars["uuid"]>;
  key?: Maybe<Scalars["String"]>;
  kind?: Maybe<Scalars["String"]>;
  name?: Maybe<Scalars["String"]>;
  tenant?: Maybe<Tenant_Obj_Rel_Insert_Input>;
  tenant_id?: Maybe<Scalars["uuid"]>;
  updated_at?: Maybe<Scalars["timestamp"]>;
};

/** aggregate max on columns */
export type Integration_Max_Fields = {
  created_at?: Maybe<Scalars["timestamp"]>;
  id?: Maybe<Scalars["uuid"]>;
  key?: Maybe<Scalars["String"]>;
  kind?: Maybe<Scalars["String"]>;
  name?: Maybe<Scalars["String"]>;
  tenant_id?: Maybe<Scalars["uuid"]>;
  updated_at?: Maybe<Scalars["timestamp"]>;
};

/** order by max() on columns of table "integration" */
export type Integration_Max_Order_By = {
  created_at?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  key?: Maybe<Order_By>;
  kind?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  tenant_id?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Integration_Min_Fields = {
  created_at?: Maybe<Scalars["timestamp"]>;
  id?: Maybe<Scalars["uuid"]>;
  key?: Maybe<Scalars["String"]>;
  kind?: Maybe<Scalars["String"]>;
  name?: Maybe<Scalars["String"]>;
  tenant_id?: Maybe<Scalars["uuid"]>;
  updated_at?: Maybe<Scalars["timestamp"]>;
};

/** order by min() on columns of table "integration" */
export type Integration_Min_Order_By = {
  created_at?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  key?: Maybe<Order_By>;
  kind?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  tenant_id?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** response of any mutation on the table "integration" */
export type Integration_Mutation_Response = {
  /** number of affected rows by the mutation */
  affected_rows: Scalars["Int"];
  /** data of the affected rows by the mutation */
  returning: Array<Integration>;
};

/** input type for inserting object relation for remote table "integration" */
export type Integration_Obj_Rel_Insert_Input = {
  data: Integration_Insert_Input;
  on_conflict?: Maybe<Integration_On_Conflict>;
};

/** on conflict condition type for table "integration" */
export type Integration_On_Conflict = {
  constraint: Integration_Constraint;
  update_columns: Array<Integration_Update_Column>;
  where?: Maybe<Integration_Bool_Exp>;
};

/** ordering options when selecting data from "integration" */
export type Integration_Order_By = {
  created_at?: Maybe<Order_By>;
  data?: Maybe<Order_By>;
  grafana_metadata?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  key?: Maybe<Order_By>;
  kind?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  tenant?: Maybe<Tenant_Order_By>;
  tenant_id?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** primary key columns input for table: "integration" */
export type Integration_Pk_Columns_Input = {
  id: Scalars["uuid"];
};

/** prepend existing jsonb value of filtered columns with new jsonb value */
export type Integration_Prepend_Input = {
  data?: Maybe<Scalars["jsonb"]>;
  grafana_metadata?: Maybe<Scalars["jsonb"]>;
};

/** select columns of table "integration" */
export enum Integration_Select_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Data = "data",
  /** column name */
  GrafanaMetadata = "grafana_metadata",
  /** column name */
  Id = "id",
  /** column name */
  Key = "key",
  /** column name */
  Kind = "kind",
  /** column name */
  Name = "name",
  /** column name */
  TenantId = "tenant_id",
  /** column name */
  UpdatedAt = "updated_at"
}

/** input type for updating data in table "integration" */
export type Integration_Set_Input = {
  created_at?: Maybe<Scalars["timestamp"]>;
  data?: Maybe<Scalars["jsonb"]>;
  grafana_metadata?: Maybe<Scalars["jsonb"]>;
  id?: Maybe<Scalars["uuid"]>;
  key?: Maybe<Scalars["String"]>;
  kind?: Maybe<Scalars["String"]>;
  name?: Maybe<Scalars["String"]>;
  tenant_id?: Maybe<Scalars["uuid"]>;
  updated_at?: Maybe<Scalars["timestamp"]>;
};

/** update columns of table "integration" */
export enum Integration_Update_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Data = "data",
  /** column name */
  GrafanaMetadata = "grafana_metadata",
  /** column name */
  Id = "id",
  /** column name */
  Key = "key",
  /** column name */
  Kind = "kind",
  /** column name */
  Name = "name",
  /** column name */
  TenantId = "tenant_id",
  /** column name */
  UpdatedAt = "updated_at"
}

/** expression to compare columns of type json. All fields are combined with logical 'AND'. */
export type Json_Comparison_Exp = {
  _eq?: Maybe<Scalars["json"]>;
  _gt?: Maybe<Scalars["json"]>;
  _gte?: Maybe<Scalars["json"]>;
  _in?: Maybe<Array<Scalars["json"]>>;
  _is_null?: Maybe<Scalars["Boolean"]>;
  _lt?: Maybe<Scalars["json"]>;
  _lte?: Maybe<Scalars["json"]>;
  _neq?: Maybe<Scalars["json"]>;
  _nin?: Maybe<Array<Scalars["json"]>>;
};

/** expression to compare columns of type jsonb. All fields are combined with logical 'AND'. */
export type Jsonb_Comparison_Exp = {
  /** is the column contained in the given json value */
  _contained_in?: Maybe<Scalars["jsonb"]>;
  /** does the column contain the given json value at the top level */
  _contains?: Maybe<Scalars["jsonb"]>;
  _eq?: Maybe<Scalars["jsonb"]>;
  _gt?: Maybe<Scalars["jsonb"]>;
  _gte?: Maybe<Scalars["jsonb"]>;
  /** does the string exist as a top-level key in the column */
  _has_key?: Maybe<Scalars["String"]>;
  /** do all of these strings exist as top-level keys in the column */
  _has_keys_all?: Maybe<Array<Scalars["String"]>>;
  /** do any of these strings exist as top-level keys in the column */
  _has_keys_any?: Maybe<Array<Scalars["String"]>>;
  _in?: Maybe<Array<Scalars["jsonb"]>>;
  _is_null?: Maybe<Scalars["Boolean"]>;
  _lt?: Maybe<Scalars["jsonb"]>;
  _lte?: Maybe<Scalars["jsonb"]>;
  _neq?: Maybe<Scalars["jsonb"]>;
  _nin?: Maybe<Array<Scalars["jsonb"]>>;
};

/** mutation root */
export type Mutation_Root = {
  /** perform the action: "deleteRuleGroup" */
  deleteRuleGroup?: Maybe<StatusResponse>;
  /** delete data from the table: "credential" */
  delete_credential?: Maybe<Credential_Mutation_Response>;
  /** delete single row from the table: "credential" */
  delete_credential_by_pk?: Maybe<Credential>;
  /** delete data from the table: "exporter" */
  delete_exporter?: Maybe<Exporter_Mutation_Response>;
  /** delete single row from the table: "exporter" */
  delete_exporter_by_pk?: Maybe<Exporter>;
  /** delete data from the table: "integration" */
  delete_integration?: Maybe<Integration_Mutation_Response>;
  /** delete single row from the table: "integration" */
  delete_integration_by_pk?: Maybe<Integration>;
  /** delete data from the table: "tenant" */
  delete_tenant?: Maybe<Tenant_Mutation_Response>;
  /** delete single row from the table: "tenant" */
  delete_tenant_by_pk?: Maybe<Tenant>;
  /** delete data from the table: "user" */
  delete_user?: Maybe<User_Mutation_Response>;
  /** delete single row from the table: "user" */
  delete_user_by_pk?: Maybe<User>;
  /** delete data from the table: "user_preference" */
  delete_user_preference?: Maybe<User_Preference_Mutation_Response>;
  /** delete single row from the table: "user_preference" */
  delete_user_preference_by_pk?: Maybe<User_Preference>;
  /** insert data into the table: "credential" */
  insert_credential?: Maybe<Credential_Mutation_Response>;
  /** insert a single row into the table: "credential" */
  insert_credential_one?: Maybe<Credential>;
  /** insert data into the table: "exporter" */
  insert_exporter?: Maybe<Exporter_Mutation_Response>;
  /** insert a single row into the table: "exporter" */
  insert_exporter_one?: Maybe<Exporter>;
  /** insert data into the table: "integration" */
  insert_integration?: Maybe<Integration_Mutation_Response>;
  /** insert a single row into the table: "integration" */
  insert_integration_one?: Maybe<Integration>;
  /** insert data into the table: "tenant" */
  insert_tenant?: Maybe<Tenant_Mutation_Response>;
  /** insert a single row into the table: "tenant" */
  insert_tenant_one?: Maybe<Tenant>;
  /** insert data into the table: "user" */
  insert_user?: Maybe<User_Mutation_Response>;
  /** insert a single row into the table: "user" */
  insert_user_one?: Maybe<User>;
  /** insert data into the table: "user_preference" */
  insert_user_preference?: Maybe<User_Preference_Mutation_Response>;
  /** insert a single row into the table: "user_preference" */
  insert_user_preference_one?: Maybe<User_Preference>;
  /** perform the action: "updateAlertmanager" */
  updateAlertmanager?: Maybe<StatusResponse>;
  /** perform the action: "updateRuleGroup" */
  updateRuleGroup?: Maybe<StatusResponse>;
  /** update data of the table: "credential" */
  update_credential?: Maybe<Credential_Mutation_Response>;
  /** update single row of the table: "credential" */
  update_credential_by_pk?: Maybe<Credential>;
  /** update data of the table: "exporter" */
  update_exporter?: Maybe<Exporter_Mutation_Response>;
  /** update single row of the table: "exporter" */
  update_exporter_by_pk?: Maybe<Exporter>;
  /** update data of the table: "integration" */
  update_integration?: Maybe<Integration_Mutation_Response>;
  /** update single row of the table: "integration" */
  update_integration_by_pk?: Maybe<Integration>;
  /** update data of the table: "tenant" */
  update_tenant?: Maybe<Tenant_Mutation_Response>;
  /** update single row of the table: "tenant" */
  update_tenant_by_pk?: Maybe<Tenant>;
  /** update data of the table: "user" */
  update_user?: Maybe<User_Mutation_Response>;
  /** update single row of the table: "user" */
  update_user_by_pk?: Maybe<User>;
  /** update data of the table: "user_preference" */
  update_user_preference?: Maybe<User_Preference_Mutation_Response>;
  /** update single row of the table: "user_preference" */
  update_user_preference_by_pk?: Maybe<User_Preference>;
};

/** mutation root */
export type Mutation_RootDeleteRuleGroupArgs = {
  namespace: Scalars["String"];
  rule_group_name: Scalars["String"];
  tenant_id: Scalars["String"];
};

/** mutation root */
export type Mutation_RootDelete_CredentialArgs = {
  where: Credential_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Credential_By_PkArgs = {
  name: Scalars["String"];
  tenant: Scalars["String"];
};

/** mutation root */
export type Mutation_RootDelete_ExporterArgs = {
  where: Exporter_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Exporter_By_PkArgs = {
  name: Scalars["String"];
  tenant: Scalars["String"];
};

/** mutation root */
export type Mutation_RootDelete_IntegrationArgs = {
  where: Integration_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Integration_By_PkArgs = {
  id: Scalars["uuid"];
};

/** mutation root */
export type Mutation_RootDelete_TenantArgs = {
  where: Tenant_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Tenant_By_PkArgs = {
  name: Scalars["String"];
};

/** mutation root */
export type Mutation_RootDelete_UserArgs = {
  where: User_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_User_By_PkArgs = {
  id: Scalars["uuid"];
};

/** mutation root */
export type Mutation_RootDelete_User_PreferenceArgs = {
  where: User_Preference_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_User_Preference_By_PkArgs = {
  id: Scalars["uuid"];
};

/** mutation root */
export type Mutation_RootInsert_CredentialArgs = {
  objects: Array<Credential_Insert_Input>;
  on_conflict?: Maybe<Credential_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Credential_OneArgs = {
  object: Credential_Insert_Input;
  on_conflict?: Maybe<Credential_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_ExporterArgs = {
  objects: Array<Exporter_Insert_Input>;
  on_conflict?: Maybe<Exporter_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Exporter_OneArgs = {
  object: Exporter_Insert_Input;
  on_conflict?: Maybe<Exporter_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_IntegrationArgs = {
  objects: Array<Integration_Insert_Input>;
  on_conflict?: Maybe<Integration_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Integration_OneArgs = {
  object: Integration_Insert_Input;
  on_conflict?: Maybe<Integration_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_TenantArgs = {
  objects: Array<Tenant_Insert_Input>;
  on_conflict?: Maybe<Tenant_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Tenant_OneArgs = {
  object: Tenant_Insert_Input;
  on_conflict?: Maybe<Tenant_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_UserArgs = {
  objects: Array<User_Insert_Input>;
  on_conflict?: Maybe<User_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_User_OneArgs = {
  object: User_Insert_Input;
  on_conflict?: Maybe<User_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_User_PreferenceArgs = {
  objects: Array<User_Preference_Insert_Input>;
  on_conflict?: Maybe<User_Preference_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_User_Preference_OneArgs = {
  object: User_Preference_Insert_Input;
  on_conflict?: Maybe<User_Preference_On_Conflict>;
};

/** mutation root */
export type Mutation_RootUpdateAlertmanagerArgs = {
  input?: Maybe<AlertmanagerInput>;
  tenant_id: Scalars["String"];
};

/** mutation root */
export type Mutation_RootUpdateRuleGroupArgs = {
  namespace: Scalars["String"];
  rule_group: RuleGroupInput;
  tenant_id: Scalars["String"];
};

/** mutation root */
export type Mutation_RootUpdate_CredentialArgs = {
  _set?: Maybe<Credential_Set_Input>;
  where: Credential_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Credential_By_PkArgs = {
  _set?: Maybe<Credential_Set_Input>;
  pk_columns: Credential_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_ExporterArgs = {
  _set?: Maybe<Exporter_Set_Input>;
  where: Exporter_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Exporter_By_PkArgs = {
  _set?: Maybe<Exporter_Set_Input>;
  pk_columns: Exporter_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_IntegrationArgs = {
  _append?: Maybe<Integration_Append_Input>;
  _delete_at_path?: Maybe<Integration_Delete_At_Path_Input>;
  _delete_elem?: Maybe<Integration_Delete_Elem_Input>;
  _delete_key?: Maybe<Integration_Delete_Key_Input>;
  _prepend?: Maybe<Integration_Prepend_Input>;
  _set?: Maybe<Integration_Set_Input>;
  where: Integration_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Integration_By_PkArgs = {
  _append?: Maybe<Integration_Append_Input>;
  _delete_at_path?: Maybe<Integration_Delete_At_Path_Input>;
  _delete_elem?: Maybe<Integration_Delete_Elem_Input>;
  _delete_key?: Maybe<Integration_Delete_Key_Input>;
  _prepend?: Maybe<Integration_Prepend_Input>;
  _set?: Maybe<Integration_Set_Input>;
  pk_columns: Integration_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_TenantArgs = {
  _set?: Maybe<Tenant_Set_Input>;
  where: Tenant_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Tenant_By_PkArgs = {
  _set?: Maybe<Tenant_Set_Input>;
  pk_columns: Tenant_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_UserArgs = {
  _set?: Maybe<User_Set_Input>;
  where: User_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_User_By_PkArgs = {
  _set?: Maybe<User_Set_Input>;
  pk_columns: User_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_User_PreferenceArgs = {
  _set?: Maybe<User_Preference_Set_Input>;
  where: User_Preference_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_User_Preference_By_PkArgs = {
  _set?: Maybe<User_Preference_Set_Input>;
  pk_columns: User_Preference_Pk_Columns_Input;
};

/** column ordering options */
export enum Order_By {
  /** in the ascending order, nulls last */
  Asc = "asc",
  /** in the ascending order, nulls first */
  AscNullsFirst = "asc_nulls_first",
  /** in the ascending order, nulls last */
  AscNullsLast = "asc_nulls_last",
  /** in the descending order, nulls first */
  Desc = "desc",
  /** in the descending order, nulls first */
  DescNullsFirst = "desc_nulls_first",
  /** in the descending order, nulls last */
  DescNullsLast = "desc_nulls_last"
}

/** query root */
export type Query_Root = {
  /** fetch data from the table: "credential" */
  credential: Array<Credential>;
  /** fetch aggregated fields from the table: "credential" */
  credential_aggregate: Credential_Aggregate;
  /** fetch data from the table: "credential" using primary key columns */
  credential_by_pk?: Maybe<Credential>;
  /** fetch data from the table: "exporter" */
  exporter: Array<Exporter>;
  /** fetch aggregated fields from the table: "exporter" */
  exporter_aggregate: Exporter_Aggregate;
  /** fetch data from the table: "exporter" using primary key columns */
  exporter_by_pk?: Maybe<Exporter>;
  /** perform the action: "getAlertmanager" */
  getAlertmanager?: Maybe<Alertmanager>;
  /** perform the action: "getRuleGroup" */
  getRuleGroup?: Maybe<RuleGroup>;
  /** fetch data from the table: "integration" */
  integration: Array<Integration>;
  /** fetch aggregated fields from the table: "integration" */
  integration_aggregate: Integration_Aggregate;
  /** fetch data from the table: "integration" using primary key columns */
  integration_by_pk?: Maybe<Integration>;
  /** perform the action: "listRules" */
  listRules?: Maybe<Rules>;
  /** fetch data from the table: "tenant" */
  tenant: Array<Tenant>;
  /** fetch aggregated fields from the table: "tenant" */
  tenant_aggregate: Tenant_Aggregate;
  /** fetch data from the table: "tenant" using primary key columns */
  tenant_by_pk?: Maybe<Tenant>;
  /** fetch data from the table: "user" */
  user: Array<User>;
  /** fetch aggregated fields from the table: "user" */
  user_aggregate: User_Aggregate;
  /** fetch data from the table: "user" using primary key columns */
  user_by_pk?: Maybe<User>;
  /** fetch data from the table: "user_preference" */
  user_preference: Array<User_Preference>;
  /** fetch aggregated fields from the table: "user_preference" */
  user_preference_aggregate: User_Preference_Aggregate;
  /** fetch data from the table: "user_preference" using primary key columns */
  user_preference_by_pk?: Maybe<User_Preference>;
  /** perform the action: "validateCredential" */
  validateCredential?: Maybe<StatusResponse>;
  /** perform the action: "validateExporter" */
  validateExporter?: Maybe<StatusResponse>;
};

/** query root */
export type Query_RootCredentialArgs = {
  distinct_on?: Maybe<Array<Credential_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Credential_Order_By>>;
  where?: Maybe<Credential_Bool_Exp>;
};

/** query root */
export type Query_RootCredential_AggregateArgs = {
  distinct_on?: Maybe<Array<Credential_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Credential_Order_By>>;
  where?: Maybe<Credential_Bool_Exp>;
};

/** query root */
export type Query_RootCredential_By_PkArgs = {
  name: Scalars["String"];
  tenant: Scalars["String"];
};

/** query root */
export type Query_RootExporterArgs = {
  distinct_on?: Maybe<Array<Exporter_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Exporter_Order_By>>;
  where?: Maybe<Exporter_Bool_Exp>;
};

/** query root */
export type Query_RootExporter_AggregateArgs = {
  distinct_on?: Maybe<Array<Exporter_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Exporter_Order_By>>;
  where?: Maybe<Exporter_Bool_Exp>;
};

/** query root */
export type Query_RootExporter_By_PkArgs = {
  name: Scalars["String"];
  tenant: Scalars["String"];
};

/** query root */
export type Query_RootGetAlertmanagerArgs = {
  tenant_id: Scalars["String"];
};

/** query root */
export type Query_RootGetRuleGroupArgs = {
  namespace: Scalars["String"];
  rule_group_name: Scalars["String"];
  tenant_id: Scalars["String"];
};

/** query root */
export type Query_RootIntegrationArgs = {
  distinct_on?: Maybe<Array<Integration_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Integration_Order_By>>;
  where?: Maybe<Integration_Bool_Exp>;
};

/** query root */
export type Query_RootIntegration_AggregateArgs = {
  distinct_on?: Maybe<Array<Integration_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Integration_Order_By>>;
  where?: Maybe<Integration_Bool_Exp>;
};

/** query root */
export type Query_RootIntegration_By_PkArgs = {
  id: Scalars["uuid"];
};

/** query root */
export type Query_RootListRulesArgs = {
  tenant_id: Scalars["String"];
};

/** query root */
export type Query_RootTenantArgs = {
  distinct_on?: Maybe<Array<Tenant_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Tenant_Order_By>>;
  where?: Maybe<Tenant_Bool_Exp>;
};

/** query root */
export type Query_RootTenant_AggregateArgs = {
  distinct_on?: Maybe<Array<Tenant_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Tenant_Order_By>>;
  where?: Maybe<Tenant_Bool_Exp>;
};

/** query root */
export type Query_RootTenant_By_PkArgs = {
  name: Scalars["String"];
};

/** query root */
export type Query_RootUserArgs = {
  distinct_on?: Maybe<Array<User_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<User_Order_By>>;
  where?: Maybe<User_Bool_Exp>;
};

/** query root */
export type Query_RootUser_AggregateArgs = {
  distinct_on?: Maybe<Array<User_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<User_Order_By>>;
  where?: Maybe<User_Bool_Exp>;
};

/** query root */
export type Query_RootUser_By_PkArgs = {
  id: Scalars["uuid"];
};

/** query root */
export type Query_RootUser_PreferenceArgs = {
  distinct_on?: Maybe<Array<User_Preference_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<User_Preference_Order_By>>;
  where?: Maybe<User_Preference_Bool_Exp>;
};

/** query root */
export type Query_RootUser_Preference_AggregateArgs = {
  distinct_on?: Maybe<Array<User_Preference_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<User_Preference_Order_By>>;
  where?: Maybe<User_Preference_Bool_Exp>;
};

/** query root */
export type Query_RootUser_Preference_By_PkArgs = {
  id: Scalars["uuid"];
};

/** query root */
export type Query_RootValidateCredentialArgs = {
  name: Scalars["String"];
  tenant_id: Scalars["String"];
  type: Scalars["String"];
  value: Scalars["json"];
};

/** query root */
export type Query_RootValidateExporterArgs = {
  config: Scalars["json"];
  credential?: Maybe<Scalars["String"]>;
  name: Scalars["String"];
  tenant_id: Scalars["String"];
  type: Scalars["String"];
};

/** subscription root */
export type Subscription_Root = {
  /** fetch data from the table: "credential" */
  credential: Array<Credential>;
  /** fetch aggregated fields from the table: "credential" */
  credential_aggregate: Credential_Aggregate;
  /** fetch data from the table: "credential" using primary key columns */
  credential_by_pk?: Maybe<Credential>;
  /** fetch data from the table: "exporter" */
  exporter: Array<Exporter>;
  /** fetch aggregated fields from the table: "exporter" */
  exporter_aggregate: Exporter_Aggregate;
  /** fetch data from the table: "exporter" using primary key columns */
  exporter_by_pk?: Maybe<Exporter>;
  /** perform the action: "getAlertmanager" */
  getAlertmanager?: Maybe<Alertmanager>;
  /** perform the action: "getRuleGroup" */
  getRuleGroup?: Maybe<RuleGroup>;
  /** fetch data from the table: "integration" */
  integration: Array<Integration>;
  /** fetch aggregated fields from the table: "integration" */
  integration_aggregate: Integration_Aggregate;
  /** fetch data from the table: "integration" using primary key columns */
  integration_by_pk?: Maybe<Integration>;
  /** perform the action: "listRules" */
  listRules?: Maybe<Rules>;
  /** fetch data from the table: "tenant" */
  tenant: Array<Tenant>;
  /** fetch aggregated fields from the table: "tenant" */
  tenant_aggregate: Tenant_Aggregate;
  /** fetch data from the table: "tenant" using primary key columns */
  tenant_by_pk?: Maybe<Tenant>;
  /** fetch data from the table: "user" */
  user: Array<User>;
  /** fetch aggregated fields from the table: "user" */
  user_aggregate: User_Aggregate;
  /** fetch data from the table: "user" using primary key columns */
  user_by_pk?: Maybe<User>;
  /** fetch data from the table: "user_preference" */
  user_preference: Array<User_Preference>;
  /** fetch aggregated fields from the table: "user_preference" */
  user_preference_aggregate: User_Preference_Aggregate;
  /** fetch data from the table: "user_preference" using primary key columns */
  user_preference_by_pk?: Maybe<User_Preference>;
  /** perform the action: "validateCredential" */
  validateCredential?: Maybe<StatusResponse>;
  /** perform the action: "validateExporter" */
  validateExporter?: Maybe<StatusResponse>;
};

/** subscription root */
export type Subscription_RootCredentialArgs = {
  distinct_on?: Maybe<Array<Credential_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Credential_Order_By>>;
  where?: Maybe<Credential_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootCredential_AggregateArgs = {
  distinct_on?: Maybe<Array<Credential_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Credential_Order_By>>;
  where?: Maybe<Credential_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootCredential_By_PkArgs = {
  name: Scalars["String"];
  tenant: Scalars["String"];
};

/** subscription root */
export type Subscription_RootExporterArgs = {
  distinct_on?: Maybe<Array<Exporter_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Exporter_Order_By>>;
  where?: Maybe<Exporter_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootExporter_AggregateArgs = {
  distinct_on?: Maybe<Array<Exporter_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Exporter_Order_By>>;
  where?: Maybe<Exporter_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootExporter_By_PkArgs = {
  name: Scalars["String"];
  tenant: Scalars["String"];
};

/** subscription root */
export type Subscription_RootGetAlertmanagerArgs = {
  tenant_id: Scalars["String"];
};

/** subscription root */
export type Subscription_RootGetRuleGroupArgs = {
  namespace: Scalars["String"];
  rule_group_name: Scalars["String"];
  tenant_id: Scalars["String"];
};

/** subscription root */
export type Subscription_RootIntegrationArgs = {
  distinct_on?: Maybe<Array<Integration_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Integration_Order_By>>;
  where?: Maybe<Integration_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootIntegration_AggregateArgs = {
  distinct_on?: Maybe<Array<Integration_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Integration_Order_By>>;
  where?: Maybe<Integration_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootIntegration_By_PkArgs = {
  id: Scalars["uuid"];
};

/** subscription root */
export type Subscription_RootListRulesArgs = {
  tenant_id: Scalars["String"];
};

/** subscription root */
export type Subscription_RootTenantArgs = {
  distinct_on?: Maybe<Array<Tenant_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Tenant_Order_By>>;
  where?: Maybe<Tenant_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootTenant_AggregateArgs = {
  distinct_on?: Maybe<Array<Tenant_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Tenant_Order_By>>;
  where?: Maybe<Tenant_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootTenant_By_PkArgs = {
  name: Scalars["String"];
};

/** subscription root */
export type Subscription_RootUserArgs = {
  distinct_on?: Maybe<Array<User_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<User_Order_By>>;
  where?: Maybe<User_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootUser_AggregateArgs = {
  distinct_on?: Maybe<Array<User_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<User_Order_By>>;
  where?: Maybe<User_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootUser_By_PkArgs = {
  id: Scalars["uuid"];
};

/** subscription root */
export type Subscription_RootUser_PreferenceArgs = {
  distinct_on?: Maybe<Array<User_Preference_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<User_Preference_Order_By>>;
  where?: Maybe<User_Preference_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootUser_Preference_AggregateArgs = {
  distinct_on?: Maybe<Array<User_Preference_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<User_Preference_Order_By>>;
  where?: Maybe<User_Preference_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootUser_Preference_By_PkArgs = {
  id: Scalars["uuid"];
};

/** subscription root */
export type Subscription_RootValidateCredentialArgs = {
  name: Scalars["String"];
  tenant_id: Scalars["String"];
  type: Scalars["String"];
  value: Scalars["json"];
};

/** subscription root */
export type Subscription_RootValidateExporterArgs = {
  config: Scalars["json"];
  credential?: Maybe<Scalars["String"]>;
  name: Scalars["String"];
  tenant_id: Scalars["String"];
  type: Scalars["String"];
};

/** columns and relationships of "tenant" */
export type Tenant = {
  created_at: Scalars["timestamp"];
  /** An array relationship */
  credentials: Array<Credential>;
  /** An aggregated array relationship */
  credentials_aggregate: Credential_Aggregate;
  /** An array relationship */
  exporters: Array<Exporter>;
  /** An aggregated array relationship */
  exporters_aggregate: Exporter_Aggregate;
  id: Scalars["uuid"];
  /** An array relationship */
  integrations: Array<Integration>;
  /** An aggregated array relationship */
  integrations_aggregate: Integration_Aggregate;
  key: Scalars["String"];
  name: Scalars["String"];
  type: Scalars["String"];
  updated_at: Scalars["timestamp"];
};

/** columns and relationships of "tenant" */
export type TenantCredentialsArgs = {
  distinct_on?: Maybe<Array<Credential_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Credential_Order_By>>;
  where?: Maybe<Credential_Bool_Exp>;
};

/** columns and relationships of "tenant" */
export type TenantCredentials_AggregateArgs = {
  distinct_on?: Maybe<Array<Credential_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Credential_Order_By>>;
  where?: Maybe<Credential_Bool_Exp>;
};

/** columns and relationships of "tenant" */
export type TenantExportersArgs = {
  distinct_on?: Maybe<Array<Exporter_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Exporter_Order_By>>;
  where?: Maybe<Exporter_Bool_Exp>;
};

/** columns and relationships of "tenant" */
export type TenantExporters_AggregateArgs = {
  distinct_on?: Maybe<Array<Exporter_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Exporter_Order_By>>;
  where?: Maybe<Exporter_Bool_Exp>;
};

/** columns and relationships of "tenant" */
export type TenantIntegrationsArgs = {
  distinct_on?: Maybe<Array<Integration_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Integration_Order_By>>;
  where?: Maybe<Integration_Bool_Exp>;
};

/** columns and relationships of "tenant" */
export type TenantIntegrations_AggregateArgs = {
  distinct_on?: Maybe<Array<Integration_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Integration_Order_By>>;
  where?: Maybe<Integration_Bool_Exp>;
};

/** aggregated selection of "tenant" */
export type Tenant_Aggregate = {
  aggregate?: Maybe<Tenant_Aggregate_Fields>;
  nodes: Array<Tenant>;
};

/** aggregate fields of "tenant" */
export type Tenant_Aggregate_Fields = {
  count?: Maybe<Scalars["Int"]>;
  max?: Maybe<Tenant_Max_Fields>;
  min?: Maybe<Tenant_Min_Fields>;
};

/** aggregate fields of "tenant" */
export type Tenant_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Tenant_Select_Column>>;
  distinct?: Maybe<Scalars["Boolean"]>;
};

/** order by aggregate values of table "tenant" */
export type Tenant_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<Tenant_Max_Order_By>;
  min?: Maybe<Tenant_Min_Order_By>;
};

/** input type for inserting array relation for remote table "tenant" */
export type Tenant_Arr_Rel_Insert_Input = {
  data: Array<Tenant_Insert_Input>;
  on_conflict?: Maybe<Tenant_On_Conflict>;
};

/** Boolean expression to filter rows from the table "tenant". All fields are combined with a logical 'AND'. */
export type Tenant_Bool_Exp = {
  _and?: Maybe<Array<Maybe<Tenant_Bool_Exp>>>;
  _not?: Maybe<Tenant_Bool_Exp>;
  _or?: Maybe<Array<Maybe<Tenant_Bool_Exp>>>;
  created_at?: Maybe<Timestamp_Comparison_Exp>;
  credentials?: Maybe<Credential_Bool_Exp>;
  exporters?: Maybe<Exporter_Bool_Exp>;
  id?: Maybe<Uuid_Comparison_Exp>;
  integrations?: Maybe<Integration_Bool_Exp>;
  key?: Maybe<String_Comparison_Exp>;
  name?: Maybe<String_Comparison_Exp>;
  type?: Maybe<String_Comparison_Exp>;
  updated_at?: Maybe<Timestamp_Comparison_Exp>;
};

/** unique or primary key constraints on table "tenant" */
export enum Tenant_Constraint {
  /** unique or primary key constraint */
  TenantIdKey = "tenant_id_key",
  /** unique or primary key constraint */
  TenantKeyKey = "tenant_key_key",
  /** unique or primary key constraint */
  TenantPkey = "tenant_pkey"
}

/** input type for inserting data into table "tenant" */
export type Tenant_Insert_Input = {
  created_at?: Maybe<Scalars["timestamp"]>;
  credentials?: Maybe<Credential_Arr_Rel_Insert_Input>;
  exporters?: Maybe<Exporter_Arr_Rel_Insert_Input>;
  id?: Maybe<Scalars["uuid"]>;
  integrations?: Maybe<Integration_Arr_Rel_Insert_Input>;
  key?: Maybe<Scalars["String"]>;
  name?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamp"]>;
};

/** aggregate max on columns */
export type Tenant_Max_Fields = {
  created_at?: Maybe<Scalars["timestamp"]>;
  id?: Maybe<Scalars["uuid"]>;
  key?: Maybe<Scalars["String"]>;
  name?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamp"]>;
};

/** order by max() on columns of table "tenant" */
export type Tenant_Max_Order_By = {
  created_at?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  key?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  type?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Tenant_Min_Fields = {
  created_at?: Maybe<Scalars["timestamp"]>;
  id?: Maybe<Scalars["uuid"]>;
  key?: Maybe<Scalars["String"]>;
  name?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamp"]>;
};

/** order by min() on columns of table "tenant" */
export type Tenant_Min_Order_By = {
  created_at?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  key?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  type?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** response of any mutation on the table "tenant" */
export type Tenant_Mutation_Response = {
  /** number of affected rows by the mutation */
  affected_rows: Scalars["Int"];
  /** data of the affected rows by the mutation */
  returning: Array<Tenant>;
};

/** input type for inserting object relation for remote table "tenant" */
export type Tenant_Obj_Rel_Insert_Input = {
  data: Tenant_Insert_Input;
  on_conflict?: Maybe<Tenant_On_Conflict>;
};

/** on conflict condition type for table "tenant" */
export type Tenant_On_Conflict = {
  constraint: Tenant_Constraint;
  update_columns: Array<Tenant_Update_Column>;
  where?: Maybe<Tenant_Bool_Exp>;
};

/** ordering options when selecting data from "tenant" */
export type Tenant_Order_By = {
  created_at?: Maybe<Order_By>;
  credentials_aggregate?: Maybe<Credential_Aggregate_Order_By>;
  exporters_aggregate?: Maybe<Exporter_Aggregate_Order_By>;
  id?: Maybe<Order_By>;
  integrations_aggregate?: Maybe<Integration_Aggregate_Order_By>;
  key?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  type?: Maybe<Order_By>;
  updated_at?: Maybe<Order_By>;
};

/** primary key columns input for table: "tenant" */
export type Tenant_Pk_Columns_Input = {
  name: Scalars["String"];
};

/** select columns of table "tenant" */
export enum Tenant_Select_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  Key = "key",
  /** column name */
  Name = "name",
  /** column name */
  Type = "type",
  /** column name */
  UpdatedAt = "updated_at"
}

/** input type for updating data in table "tenant" */
export type Tenant_Set_Input = {
  created_at?: Maybe<Scalars["timestamp"]>;
  id?: Maybe<Scalars["uuid"]>;
  key?: Maybe<Scalars["String"]>;
  name?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
  updated_at?: Maybe<Scalars["timestamp"]>;
};

/** update columns of table "tenant" */
export enum Tenant_Update_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Id = "id",
  /** column name */
  Key = "key",
  /** column name */
  Name = "name",
  /** column name */
  Type = "type",
  /** column name */
  UpdatedAt = "updated_at"
}

/** expression to compare columns of type timestamp. All fields are combined with logical 'AND'. */
export type Timestamp_Comparison_Exp = {
  _eq?: Maybe<Scalars["timestamp"]>;
  _gt?: Maybe<Scalars["timestamp"]>;
  _gte?: Maybe<Scalars["timestamp"]>;
  _in?: Maybe<Array<Scalars["timestamp"]>>;
  _is_null?: Maybe<Scalars["Boolean"]>;
  _lt?: Maybe<Scalars["timestamp"]>;
  _lte?: Maybe<Scalars["timestamp"]>;
  _neq?: Maybe<Scalars["timestamp"]>;
  _nin?: Maybe<Array<Scalars["timestamp"]>>;
};

/** expression to compare columns of type timestamptz. All fields are combined with logical 'AND'. */
export type Timestamptz_Comparison_Exp = {
  _eq?: Maybe<Scalars["timestamptz"]>;
  _gt?: Maybe<Scalars["timestamptz"]>;
  _gte?: Maybe<Scalars["timestamptz"]>;
  _in?: Maybe<Array<Scalars["timestamptz"]>>;
  _is_null?: Maybe<Scalars["Boolean"]>;
  _lt?: Maybe<Scalars["timestamptz"]>;
  _lte?: Maybe<Scalars["timestamptz"]>;
  _neq?: Maybe<Scalars["timestamptz"]>;
  _nin?: Maybe<Array<Scalars["timestamptz"]>>;
};

/** columns and relationships of "user" */
export type User = {
  active: Scalars["Boolean"];
  avatar?: Maybe<Scalars["String"]>;
  created_at: Scalars["timestamptz"];
  email: Scalars["String"];
  id: Scalars["uuid"];
  /** An object relationship */
  preference?: Maybe<User_Preference>;
  role: Scalars["String"];
  session_last_updated?: Maybe<Scalars["timestamptz"]>;
  username: Scalars["String"];
};

/** aggregated selection of "user" */
export type User_Aggregate = {
  aggregate?: Maybe<User_Aggregate_Fields>;
  nodes: Array<User>;
};

/** aggregate fields of "user" */
export type User_Aggregate_Fields = {
  count?: Maybe<Scalars["Int"]>;
  max?: Maybe<User_Max_Fields>;
  min?: Maybe<User_Min_Fields>;
};

/** aggregate fields of "user" */
export type User_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<User_Select_Column>>;
  distinct?: Maybe<Scalars["Boolean"]>;
};

/** order by aggregate values of table "user" */
export type User_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<User_Max_Order_By>;
  min?: Maybe<User_Min_Order_By>;
};

/** input type for inserting array relation for remote table "user" */
export type User_Arr_Rel_Insert_Input = {
  data: Array<User_Insert_Input>;
  on_conflict?: Maybe<User_On_Conflict>;
};

/** Boolean expression to filter rows from the table "user". All fields are combined with a logical 'AND'. */
export type User_Bool_Exp = {
  _and?: Maybe<Array<Maybe<User_Bool_Exp>>>;
  _not?: Maybe<User_Bool_Exp>;
  _or?: Maybe<Array<Maybe<User_Bool_Exp>>>;
  active?: Maybe<Boolean_Comparison_Exp>;
  avatar?: Maybe<String_Comparison_Exp>;
  created_at?: Maybe<Timestamptz_Comparison_Exp>;
  email?: Maybe<String_Comparison_Exp>;
  id?: Maybe<Uuid_Comparison_Exp>;
  preference?: Maybe<User_Preference_Bool_Exp>;
  role?: Maybe<String_Comparison_Exp>;
  session_last_updated?: Maybe<Timestamptz_Comparison_Exp>;
  username?: Maybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "user" */
export enum User_Constraint {
  /** unique or primary key constraint */
  UserEmailKey = "user_email_key",
  /** unique or primary key constraint */
  UserIdKey = "user_id_key",
  /** unique or primary key constraint */
  UserPkey = "user_pkey"
}

/** input type for inserting data into table "user" */
export type User_Insert_Input = {
  active?: Maybe<Scalars["Boolean"]>;
  avatar?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  email?: Maybe<Scalars["String"]>;
  id?: Maybe<Scalars["uuid"]>;
  preference?: Maybe<User_Preference_Obj_Rel_Insert_Input>;
  role?: Maybe<Scalars["String"]>;
  session_last_updated?: Maybe<Scalars["timestamptz"]>;
  username?: Maybe<Scalars["String"]>;
};

/** aggregate max on columns */
export type User_Max_Fields = {
  avatar?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  email?: Maybe<Scalars["String"]>;
  id?: Maybe<Scalars["uuid"]>;
  role?: Maybe<Scalars["String"]>;
  session_last_updated?: Maybe<Scalars["timestamptz"]>;
  username?: Maybe<Scalars["String"]>;
};

/** order by max() on columns of table "user" */
export type User_Max_Order_By = {
  avatar?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  email?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  role?: Maybe<Order_By>;
  session_last_updated?: Maybe<Order_By>;
  username?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type User_Min_Fields = {
  avatar?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  email?: Maybe<Scalars["String"]>;
  id?: Maybe<Scalars["uuid"]>;
  role?: Maybe<Scalars["String"]>;
  session_last_updated?: Maybe<Scalars["timestamptz"]>;
  username?: Maybe<Scalars["String"]>;
};

/** order by min() on columns of table "user" */
export type User_Min_Order_By = {
  avatar?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  email?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  role?: Maybe<Order_By>;
  session_last_updated?: Maybe<Order_By>;
  username?: Maybe<Order_By>;
};

/** response of any mutation on the table "user" */
export type User_Mutation_Response = {
  /** number of affected rows by the mutation */
  affected_rows: Scalars["Int"];
  /** data of the affected rows by the mutation */
  returning: Array<User>;
};

/** input type for inserting object relation for remote table "user" */
export type User_Obj_Rel_Insert_Input = {
  data: User_Insert_Input;
  on_conflict?: Maybe<User_On_Conflict>;
};

/** on conflict condition type for table "user" */
export type User_On_Conflict = {
  constraint: User_Constraint;
  update_columns: Array<User_Update_Column>;
  where?: Maybe<User_Bool_Exp>;
};

/** ordering options when selecting data from "user" */
export type User_Order_By = {
  active?: Maybe<Order_By>;
  avatar?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  email?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  preference?: Maybe<User_Preference_Order_By>;
  role?: Maybe<Order_By>;
  session_last_updated?: Maybe<Order_By>;
  username?: Maybe<Order_By>;
};

/** primary key columns input for table: "user" */
export type User_Pk_Columns_Input = {
  id: Scalars["uuid"];
};

/** columns and relationships of "user_preference" */
export type User_Preference = {
  dark_mode: Scalars["Boolean"];
  id: Scalars["uuid"];
  /** An object relationship */
  user?: Maybe<User>;
  user_id?: Maybe<Scalars["uuid"]>;
};

/** aggregated selection of "user_preference" */
export type User_Preference_Aggregate = {
  aggregate?: Maybe<User_Preference_Aggregate_Fields>;
  nodes: Array<User_Preference>;
};

/** aggregate fields of "user_preference" */
export type User_Preference_Aggregate_Fields = {
  count?: Maybe<Scalars["Int"]>;
  max?: Maybe<User_Preference_Max_Fields>;
  min?: Maybe<User_Preference_Min_Fields>;
};

/** aggregate fields of "user_preference" */
export type User_Preference_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<User_Preference_Select_Column>>;
  distinct?: Maybe<Scalars["Boolean"]>;
};

/** order by aggregate values of table "user_preference" */
export type User_Preference_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<User_Preference_Max_Order_By>;
  min?: Maybe<User_Preference_Min_Order_By>;
};

/** input type for inserting array relation for remote table "user_preference" */
export type User_Preference_Arr_Rel_Insert_Input = {
  data: Array<User_Preference_Insert_Input>;
  on_conflict?: Maybe<User_Preference_On_Conflict>;
};

/** Boolean expression to filter rows from the table "user_preference". All fields are combined with a logical 'AND'. */
export type User_Preference_Bool_Exp = {
  _and?: Maybe<Array<Maybe<User_Preference_Bool_Exp>>>;
  _not?: Maybe<User_Preference_Bool_Exp>;
  _or?: Maybe<Array<Maybe<User_Preference_Bool_Exp>>>;
  dark_mode?: Maybe<Boolean_Comparison_Exp>;
  id?: Maybe<Uuid_Comparison_Exp>;
  user?: Maybe<User_Bool_Exp>;
  user_id?: Maybe<Uuid_Comparison_Exp>;
};

/** unique or primary key constraints on table "user_preference" */
export enum User_Preference_Constraint {
  /** unique or primary key constraint */
  UserPreferenceIdKey = "user_preference_id_key",
  /** unique or primary key constraint */
  UserPreferencePkey = "user_preference_pkey",
  /** unique or primary key constraint */
  UserPreferenceUserIdKey = "user_preference_user_id_key"
}

/** input type for inserting data into table "user_preference" */
export type User_Preference_Insert_Input = {
  dark_mode?: Maybe<Scalars["Boolean"]>;
  id?: Maybe<Scalars["uuid"]>;
  user?: Maybe<User_Obj_Rel_Insert_Input>;
  user_id?: Maybe<Scalars["uuid"]>;
};

/** aggregate max on columns */
export type User_Preference_Max_Fields = {
  id?: Maybe<Scalars["uuid"]>;
  user_id?: Maybe<Scalars["uuid"]>;
};

/** order by max() on columns of table "user_preference" */
export type User_Preference_Max_Order_By = {
  id?: Maybe<Order_By>;
  user_id?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type User_Preference_Min_Fields = {
  id?: Maybe<Scalars["uuid"]>;
  user_id?: Maybe<Scalars["uuid"]>;
};

/** order by min() on columns of table "user_preference" */
export type User_Preference_Min_Order_By = {
  id?: Maybe<Order_By>;
  user_id?: Maybe<Order_By>;
};

/** response of any mutation on the table "user_preference" */
export type User_Preference_Mutation_Response = {
  /** number of affected rows by the mutation */
  affected_rows: Scalars["Int"];
  /** data of the affected rows by the mutation */
  returning: Array<User_Preference>;
};

/** input type for inserting object relation for remote table "user_preference" */
export type User_Preference_Obj_Rel_Insert_Input = {
  data: User_Preference_Insert_Input;
  on_conflict?: Maybe<User_Preference_On_Conflict>;
};

/** on conflict condition type for table "user_preference" */
export type User_Preference_On_Conflict = {
  constraint: User_Preference_Constraint;
  update_columns: Array<User_Preference_Update_Column>;
  where?: Maybe<User_Preference_Bool_Exp>;
};

/** ordering options when selecting data from "user_preference" */
export type User_Preference_Order_By = {
  dark_mode?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  user?: Maybe<User_Order_By>;
  user_id?: Maybe<Order_By>;
};

/** primary key columns input for table: "user_preference" */
export type User_Preference_Pk_Columns_Input = {
  id: Scalars["uuid"];
};

/** select columns of table "user_preference" */
export enum User_Preference_Select_Column {
  /** column name */
  DarkMode = "dark_mode",
  /** column name */
  Id = "id",
  /** column name */
  UserId = "user_id"
}

/** input type for updating data in table "user_preference" */
export type User_Preference_Set_Input = {
  dark_mode?: Maybe<Scalars["Boolean"]>;
  id?: Maybe<Scalars["uuid"]>;
  user_id?: Maybe<Scalars["uuid"]>;
};

/** update columns of table "user_preference" */
export enum User_Preference_Update_Column {
  /** column name */
  DarkMode = "dark_mode",
  /** column name */
  Id = "id",
  /** column name */
  UserId = "user_id"
}

/** select columns of table "user" */
export enum User_Select_Column {
  /** column name */
  Active = "active",
  /** column name */
  Avatar = "avatar",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Email = "email",
  /** column name */
  Id = "id",
  /** column name */
  Role = "role",
  /** column name */
  SessionLastUpdated = "session_last_updated",
  /** column name */
  Username = "username"
}

/** input type for updating data in table "user" */
export type User_Set_Input = {
  active?: Maybe<Scalars["Boolean"]>;
  avatar?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  email?: Maybe<Scalars["String"]>;
  id?: Maybe<Scalars["uuid"]>;
  role?: Maybe<Scalars["String"]>;
  session_last_updated?: Maybe<Scalars["timestamptz"]>;
  username?: Maybe<Scalars["String"]>;
};

/** update columns of table "user" */
export enum User_Update_Column {
  /** column name */
  Active = "active",
  /** column name */
  Avatar = "avatar",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Email = "email",
  /** column name */
  Id = "id",
  /** column name */
  Role = "role",
  /** column name */
  SessionLastUpdated = "session_last_updated",
  /** column name */
  Username = "username"
}

/** expression to compare columns of type uuid. All fields are combined with logical 'AND'. */
export type Uuid_Comparison_Exp = {
  _eq?: Maybe<Scalars["uuid"]>;
  _gt?: Maybe<Scalars["uuid"]>;
  _gte?: Maybe<Scalars["uuid"]>;
  _in?: Maybe<Array<Scalars["uuid"]>>;
  _is_null?: Maybe<Scalars["Boolean"]>;
  _lt?: Maybe<Scalars["uuid"]>;
  _lte?: Maybe<Scalars["uuid"]>;
  _neq?: Maybe<Scalars["uuid"]>;
  _nin?: Maybe<Array<Scalars["uuid"]>>;
};

export type DeleteIntegrationMutationVariables = Exact<{
  tenant_id: Scalars["uuid"];
  id: Scalars["uuid"];
}>;

export type DeleteIntegrationMutation = {
  delete_integration?: Maybe<{ returning: Array<Pick<Integration, "id">> }>;
};

export type GetIntegrationsQueryVariables = Exact<{
  tenant_id: Scalars["uuid"];
}>;

export type GetIntegrationsQuery = {
  integration: Array<
    Pick<
      Integration,
      | "id"
      | "tenant_id"
      | "name"
      | "key"
      | "kind"
      | "data"
      | "created_at"
      | "updated_at"
    >
  >;
};

export type GetIntegrationsDumpQueryVariables = Exact<{ [key: string]: never }>;

export type GetIntegrationsDumpQuery = {
  integration: Array<
    Pick<Integration, "id" | "tenant_id" | "name" | "key" | "kind" | "data">
  >;
};

export type InsertIntegrationMutationVariables = Exact<{
  name: Scalars["String"];
  kind: Scalars["String"];
  data: Scalars["jsonb"];
  tenant_id: Scalars["uuid"];
}>;

export type InsertIntegrationMutation = {
  insert_integration_one?: Maybe<
    Pick<
      Integration,
      | "id"
      | "kind"
      | "name"
      | "data"
      | "tenant_id"
      | "grafana_metadata"
      | "created_at"
      | "updated_at"
    >
  >;
};

export type SubscribeToIntegrationListSubscriptionVariables = Exact<{
  tenant_name: Scalars["String"];
}>;

export type SubscribeToIntegrationListSubscription = {
  tenant_by_pk?: Maybe<{
    integrations: Array<
      Pick<
        Integration,
        | "id"
        | "kind"
        | "name"
        | "key"
        | "data"
        | "tenant_id"
        | "grafana_metadata"
        | "created_at"
        | "updated_at"
      >
    >;
  }>;
};

export type UpdateIntegrationDataMutationVariables = Exact<{
  id: Scalars["uuid"];
  data: Scalars["jsonb"];
}>;

export type UpdateIntegrationDataMutation = {
  update_integration_by_pk?: Maybe<
    Pick<Integration, "id" | "data" | "updated_at">
  >;
};

export type UpdateIntegrationGrafanaMetadataMutationVariables = Exact<{
  id: Scalars["uuid"];
  grafana_metadata: Scalars["jsonb"];
}>;

export type UpdateIntegrationGrafanaMetadataMutation = {
  update_integration_by_pk?: Maybe<
    Pick<Integration, "id" | "grafana_metadata" | "updated_at">
  >;
};

export type UpdateIntegrationNameMutationVariables = Exact<{
  id: Scalars["uuid"];
  name: Scalars["String"];
}>;

export type UpdateIntegrationNameMutation = {
  update_integration_by_pk?: Maybe<
    Pick<Integration, "id" | "name" | "updated_at">
  >;
};

export type CreateTenantsMutationVariables = Exact<{
  tenants: Array<Tenant_Insert_Input> | Tenant_Insert_Input;
}>;

export type CreateTenantsMutation = {
  insert_tenant?: Maybe<{ returning: Array<Pick<Tenant, "name">> }>;
};

export type DeleteTenantMutationVariables = Exact<{
  name: Scalars["String"];
}>;

export type DeleteTenantMutation = {
  delete_tenant_by_pk?: Maybe<Pick<Tenant, "name">>;
};

export type GetAlertmanagerQueryVariables = Exact<{
  tenant_id: Scalars["String"];
}>;

export type GetAlertmanagerQuery = {
  getAlertmanager?: Maybe<Pick<Alertmanager, "config" | "online">>;
};

export type GetTenantsQueryVariables = Exact<{ [key: string]: never }>;

export type GetTenantsQuery = {
  tenant: Array<
    Pick<Tenant, "id" | "name" | "created_at" | "updated_at" | "type" | "key">
  >;
};

export type SubscribeToTenantListSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type SubscribeToTenantListSubscription = {
  tenant: Array<
    Pick<Tenant, "id" | "name" | "created_at" | "updated_at" | "type" | "key">
  >;
};

export type UpdateAlertmanagerMutationVariables = Exact<{
  tenant_id: Scalars["String"];
  input: AlertmanagerInput;
}>;

export type UpdateAlertmanagerMutation = {
  updateAlertmanager?: Maybe<
    Pick<
      StatusResponse,
      "success" | "error_type" | "error_message" | "error_raw_response"
    >
  >;
};

export type CreateUserMutationVariables = Exact<{
  email: Scalars["String"];
  username: Scalars["String"];
  avatar: Scalars["String"];
}>;

export type CreateUserMutation = {
  insert_user_preference_one?: Maybe<{
    user?: Maybe<
      Pick<
        User,
        | "id"
        | "email"
        | "username"
        | "role"
        | "active"
        | "avatar"
        | "created_at"
        | "session_last_updated"
      >
    >;
  }>;
};

export type DeactivateUserMutationVariables = Exact<{
  id: Scalars["uuid"];
}>;

export type DeactivateUserMutation = {
  update_user_by_pk?: Maybe<Pick<User, "id" | "active">>;
};

export type GetActiveUserForAuthQueryVariables = Exact<{
  email: Scalars["String"];
}>;

export type GetActiveUserForAuthQuery = {
  user: Array<Pick<User, "id" | "email" | "avatar" | "username" | "active">>;
  active_user_count: {
    aggregate?: Maybe<Pick<User_Aggregate_Fields, "count">>;
  };
};

export type GetCurrentUserQueryVariables = Exact<{ [key: string]: never }>;

export type GetCurrentUserQuery = {
  user: Array<
    Pick<User, "id" | "email" | "avatar" | "username" | "active"> & {
      preference?: Maybe<Pick<User_Preference, "dark_mode">>;
    }
  >;
};

export type GetUserQueryVariables = Exact<{
  id: Scalars["uuid"];
}>;

export type GetUserQuery = {
  user_by_pk?: Maybe<
    Pick<User, "id" | "email" | "avatar" | "username" | "active"> & {
      preference?: Maybe<Pick<User_Preference, "dark_mode">>;
    }
  >;
};

export type ReactivateUserMutationVariables = Exact<{
  id: Scalars["uuid"];
}>;

export type ReactivateUserMutation = {
  update_user_by_pk?: Maybe<Pick<User, "id" | "active">>;
};

export type SetDarkModeMutationVariables = Exact<{
  user_id: Scalars["uuid"];
  dark_mode?: Maybe<Scalars["Boolean"]>;
}>;

export type SetDarkModeMutation = {
  update_user_preference?: Maybe<{
    returning: Array<Pick<User_Preference, "dark_mode">>;
  }>;
};

export type SubscribeToUserListSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type SubscribeToUserListSubscription = {
  user: Array<
    Pick<
      User,
      | "id"
      | "email"
      | "username"
      | "session_last_updated"
      | "role"
      | "active"
      | "avatar"
      | "created_at"
    > & { preference?: Maybe<Pick<User_Preference, "dark_mode">> }
  >;
};

export type UpdateUserMutationVariables = Exact<{
  id: Scalars["uuid"];
  email: Scalars["String"];
  avatar: Scalars["String"];
  username: Scalars["String"];
}>;

export type UpdateUserMutation = {
  update_user_by_pk?: Maybe<
    Pick<User, "id" | "email" | "username" | "avatar" | "session_last_updated">
  >;
};

export type UpdateUserSessionMutationVariables = Exact<{
  id: Scalars["uuid"];
  timestamp: Scalars["timestamptz"];
}>;

export type UpdateUserSessionMutation = {
  update_user_by_pk?: Maybe<Pick<User, "id" | "session_last_updated">>;
};

export const DeleteIntegrationDocument = gql`
  mutation DeleteIntegration($tenant_id: uuid!, $id: uuid!) {
    delete_integration(
      where: { id: { _eq: $id }, tenant_id: { _eq: $tenant_id } }
    ) {
      returning {
        id
      }
    }
  }
`;
export const GetIntegrationsDocument = gql`
  query GetIntegrations($tenant_id: uuid!) {
    integration(where: { tenant_id: { _eq: $tenant_id } }) {
      id
      tenant_id
      name
      key
      kind
      data
      created_at
      updated_at
    }
  }
`;
export const GetIntegrationsDumpDocument = gql`
  query GetIntegrationsDump {
    integration {
      id
      tenant_id
      name
      key
      kind
      data
    }
  }
`;
export const InsertIntegrationDocument = gql`
  mutation InsertIntegration(
    $name: String!
    $kind: String!
    $data: jsonb!
    $tenant_id: uuid!
  ) {
    insert_integration_one(
      object: { name: $name, kind: $kind, data: $data, tenant_id: $tenant_id }
    ) {
      id
      kind
      name
      data
      tenant_id
      grafana_metadata
      created_at
      updated_at
    }
  }
`;
export const SubscribeToIntegrationListDocument = gql`
  subscription SubscribeToIntegrationList($tenant_name: String!) {
    tenant_by_pk(name: $tenant_name) {
      integrations {
        id
        kind
        name
        key
        data
        tenant_id
        grafana_metadata
        created_at
        updated_at
      }
    }
  }
`;
export const UpdateIntegrationDataDocument = gql`
  mutation UpdateIntegrationData($id: uuid!, $data: jsonb!) {
    update_integration_by_pk(pk_columns: { id: $id }, _set: { data: $data }) {
      id
      data
      updated_at
    }
  }
`;
export const UpdateIntegrationGrafanaMetadataDocument = gql`
  mutation UpdateIntegrationGrafanaMetadata(
    $id: uuid!
    $grafana_metadata: jsonb!
  ) {
    update_integration_by_pk(
      pk_columns: { id: $id }
      _set: { grafana_metadata: $grafana_metadata }
    ) {
      id
      grafana_metadata
      updated_at
    }
  }
`;
export const UpdateIntegrationNameDocument = gql`
  mutation UpdateIntegrationName($id: uuid!, $name: String!) {
    update_integration_by_pk(pk_columns: { id: $id }, _set: { name: $name }) {
      id
      name
      updated_at
    }
  }
`;
export const CreateTenantsDocument = gql`
  mutation CreateTenants($tenants: [tenant_insert_input!]!) {
    insert_tenant(objects: $tenants) {
      returning {
        name
      }
    }
  }
`;
export const DeleteTenantDocument = gql`
  mutation DeleteTenant($name: String!) {
    delete_tenant_by_pk(name: $name) {
      name
    }
  }
`;
export const GetAlertmanagerDocument = gql`
  query GetAlertmanager($tenant_id: String!) {
    getAlertmanager(tenant_id: $tenant_id) {
      config
      online
    }
  }
`;
export const GetTenantsDocument = gql`
  query GetTenants {
    tenant {
      id
      name
      created_at
      updated_at
      type
      key
    }
  }
`;
export const SubscribeToTenantListDocument = gql`
  subscription SubscribeToTenantList {
    tenant {
      id
      name
      created_at
      updated_at
      type
      key
    }
  }
`;
export const UpdateAlertmanagerDocument = gql`
  mutation UpdateAlertmanager($tenant_id: String!, $input: AlertmanagerInput!) {
    updateAlertmanager(tenant_id: $tenant_id, input: $input) {
      success
      error_type
      error_message
      error_raw_response
    }
  }
`;
export const CreateUserDocument = gql`
  mutation CreateUser($email: String!, $username: String!, $avatar: String!) {
    insert_user_preference_one(
      object: {
        dark_mode: false
        user: {
          data: {
            email: $email
            username: $username
            active: true
            avatar: $avatar
          }
        }
      }
    ) {
      user {
        id
        email
        username
        role
        active
        avatar
        created_at
        session_last_updated
      }
    }
  }
`;
export const DeactivateUserDocument = gql`
  mutation DeactivateUser($id: uuid!) {
    update_user_by_pk(_set: { active: false }, pk_columns: { id: $id }) {
      id
      active
    }
  }
`;
export const GetActiveUserForAuthDocument = gql`
  query GetActiveUserForAuth($email: String!) {
    user(
      where: { email: { _eq: $email }, active: { _eq: true } }
      limit: 1
      order_by: { created_at: asc }
    ) {
      id
      email
      avatar
      username
      active
    }
    active_user_count: user_aggregate(where: { active: { _eq: true } }) {
      aggregate {
        count
      }
    }
  }
`;
export const GetCurrentUserDocument = gql`
  query GetCurrentUser {
    user {
      id
      email
      avatar
      username
      active
      preference {
        dark_mode
      }
    }
  }
`;
export const GetUserDocument = gql`
  query GetUser($id: uuid!) {
    user_by_pk(id: $id) {
      id
      email
      avatar
      username
      active
      preference {
        dark_mode
      }
    }
  }
`;
export const ReactivateUserDocument = gql`
  mutation ReactivateUser($id: uuid!) {
    update_user_by_pk(pk_columns: { id: $id }, _set: { active: true }) {
      id
      active
    }
  }
`;
export const SetDarkModeDocument = gql`
  mutation SetDarkMode($user_id: uuid!, $dark_mode: Boolean = true) {
    update_user_preference(
      where: { user_id: { _eq: $user_id } }
      _set: { dark_mode: $dark_mode }
    ) {
      returning {
        dark_mode
      }
    }
  }
`;
export const SubscribeToUserListDocument = gql`
  subscription SubscribeToUserList {
    user {
      id
      email
      username
      session_last_updated
      role
      active
      avatar
      preference {
        dark_mode
      }
      created_at
    }
  }
`;
export const UpdateUserDocument = gql`
  mutation UpdateUser(
    $id: uuid!
    $email: String!
    $avatar: String!
    $username: String!
  ) {
    update_user_by_pk(
      pk_columns: { id: $id }
      _set: { email: $email, avatar: $avatar, username: $username }
    ) {
      id
      email
      username
      avatar
      session_last_updated
    }
  }
`;
export const UpdateUserSessionDocument = gql`
  mutation UpdateUserSession($id: uuid!, $timestamp: timestamptz!) {
    update_user_by_pk(
      pk_columns: { id: $id }
      _set: { session_last_updated: $timestamp }
    ) {
      id
      session_last_updated
    }
  }
`;

export type SdkFunctionWrapper = <T>(action: () => Promise<T>) => Promise<T>;

const defaultWrapper: SdkFunctionWrapper = sdkFunction => sdkFunction();
export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
) {
  return {
    DeleteIntegration(
      variables: DeleteIntegrationMutationVariables
    ): Promise<{
      data?: DeleteIntegrationMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<DeleteIntegrationMutation>(
          print(DeleteIntegrationDocument),
          variables
        )
      );
    },
    GetIntegrations(
      variables: GetIntegrationsQueryVariables
    ): Promise<{
      data?: GetIntegrationsQuery | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<GetIntegrationsQuery>(
          print(GetIntegrationsDocument),
          variables
        )
      );
    },
    GetIntegrationsDump(
      variables?: GetIntegrationsDumpQueryVariables
    ): Promise<{
      data?: GetIntegrationsDumpQuery | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<GetIntegrationsDumpQuery>(
          print(GetIntegrationsDumpDocument),
          variables
        )
      );
    },
    InsertIntegration(
      variables: InsertIntegrationMutationVariables
    ): Promise<{
      data?: InsertIntegrationMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<InsertIntegrationMutation>(
          print(InsertIntegrationDocument),
          variables
        )
      );
    },
    SubscribeToIntegrationList(
      variables: SubscribeToIntegrationListSubscriptionVariables
    ): Promise<{
      data?: SubscribeToIntegrationListSubscription | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<SubscribeToIntegrationListSubscription>(
          print(SubscribeToIntegrationListDocument),
          variables
        )
      );
    },
    UpdateIntegrationData(
      variables: UpdateIntegrationDataMutationVariables
    ): Promise<{
      data?: UpdateIntegrationDataMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<UpdateIntegrationDataMutation>(
          print(UpdateIntegrationDataDocument),
          variables
        )
      );
    },
    UpdateIntegrationGrafanaMetadata(
      variables: UpdateIntegrationGrafanaMetadataMutationVariables
    ): Promise<{
      data?: UpdateIntegrationGrafanaMetadataMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<UpdateIntegrationGrafanaMetadataMutation>(
          print(UpdateIntegrationGrafanaMetadataDocument),
          variables
        )
      );
    },
    UpdateIntegrationName(
      variables: UpdateIntegrationNameMutationVariables
    ): Promise<{
      data?: UpdateIntegrationNameMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<UpdateIntegrationNameMutation>(
          print(UpdateIntegrationNameDocument),
          variables
        )
      );
    },
    CreateTenants(
      variables: CreateTenantsMutationVariables
    ): Promise<{
      data?: CreateTenantsMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<CreateTenantsMutation>(
          print(CreateTenantsDocument),
          variables
        )
      );
    },
    DeleteTenant(
      variables: DeleteTenantMutationVariables
    ): Promise<{
      data?: DeleteTenantMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<DeleteTenantMutation>(
          print(DeleteTenantDocument),
          variables
        )
      );
    },
    GetAlertmanager(
      variables: GetAlertmanagerQueryVariables
    ): Promise<{
      data?: GetAlertmanagerQuery | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<GetAlertmanagerQuery>(
          print(GetAlertmanagerDocument),
          variables
        )
      );
    },
    GetTenants(
      variables?: GetTenantsQueryVariables
    ): Promise<{
      data?: GetTenantsQuery | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<GetTenantsQuery>(print(GetTenantsDocument), variables)
      );
    },
    SubscribeToTenantList(
      variables?: SubscribeToTenantListSubscriptionVariables
    ): Promise<{
      data?: SubscribeToTenantListSubscription | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<SubscribeToTenantListSubscription>(
          print(SubscribeToTenantListDocument),
          variables
        )
      );
    },
    UpdateAlertmanager(
      variables: UpdateAlertmanagerMutationVariables
    ): Promise<{
      data?: UpdateAlertmanagerMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<UpdateAlertmanagerMutation>(
          print(UpdateAlertmanagerDocument),
          variables
        )
      );
    },
    CreateUser(
      variables: CreateUserMutationVariables
    ): Promise<{
      data?: CreateUserMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<CreateUserMutation>(
          print(CreateUserDocument),
          variables
        )
      );
    },
    DeactivateUser(
      variables: DeactivateUserMutationVariables
    ): Promise<{
      data?: DeactivateUserMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<DeactivateUserMutation>(
          print(DeactivateUserDocument),
          variables
        )
      );
    },
    GetActiveUserForAuth(
      variables: GetActiveUserForAuthQueryVariables
    ): Promise<{
      data?: GetActiveUserForAuthQuery | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<GetActiveUserForAuthQuery>(
          print(GetActiveUserForAuthDocument),
          variables
        )
      );
    },
    GetCurrentUser(
      variables?: GetCurrentUserQueryVariables
    ): Promise<{
      data?: GetCurrentUserQuery | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<GetCurrentUserQuery>(
          print(GetCurrentUserDocument),
          variables
        )
      );
    },
    GetUser(
      variables: GetUserQueryVariables
    ): Promise<{
      data?: GetUserQuery | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<GetUserQuery>(print(GetUserDocument), variables)
      );
    },
    ReactivateUser(
      variables: ReactivateUserMutationVariables
    ): Promise<{
      data?: ReactivateUserMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<ReactivateUserMutation>(
          print(ReactivateUserDocument),
          variables
        )
      );
    },
    SetDarkMode(
      variables: SetDarkModeMutationVariables
    ): Promise<{
      data?: SetDarkModeMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<SetDarkModeMutation>(
          print(SetDarkModeDocument),
          variables
        )
      );
    },
    SubscribeToUserList(
      variables?: SubscribeToUserListSubscriptionVariables
    ): Promise<{
      data?: SubscribeToUserListSubscription | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<SubscribeToUserListSubscription>(
          print(SubscribeToUserListDocument),
          variables
        )
      );
    },
    UpdateUser(
      variables: UpdateUserMutationVariables
    ): Promise<{
      data?: UpdateUserMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<UpdateUserMutation>(
          print(UpdateUserDocument),
          variables
        )
      );
    },
    UpdateUserSession(
      variables: UpdateUserSessionMutationVariables
    ): Promise<{
      data?: UpdateUserSessionMutation | undefined;
      extensions?: any;
      headers: Headers;
      status: number;
      errors?: GraphQLError[] | undefined;
    }> {
      return withWrapper(() =>
        client.rawRequest<UpdateUserSessionMutation>(
          print(UpdateUserSessionDocument),
          variables
        )
      );
    }
  };
}
export type Sdk = ReturnType<typeof getSdk>;
