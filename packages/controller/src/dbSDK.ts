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
import { GraphQLClient } from "graphql-request";
import { print } from "graphql";
import { GraphQLError } from "graphql-request/dist/types";
import gql from "graphql-tag";

export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  timestamp: number;
  timestamptz: number;
  uuid: unknown;
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

/** columns and relationships of "branch" */
export type Branch = {
  created_at: Scalars["timestamptz"];
  /** An array relationship */
  files: Array<File>;
  /** An aggregated array relationship */
  files_aggregate: File_Aggregate;
  has_merged: Scalars["Boolean"];
  /** An array relationship */
  modules: Array<Module>;
  /** An aggregated array relationship */
  modules_aggregate: Module_Aggregate;
  name: Scalars["String"];
  protected: Scalars["Boolean"];
  /** An array relationship */
  versions: Array<Module_Version>;
  /** An aggregated array relationship */
  versions_aggregate: Module_Version_Aggregate;
};

/** columns and relationships of "branch" */
export type BranchFilesArgs = {
  distinct_on?: Maybe<Array<File_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<File_Order_By>>;
  where?: Maybe<File_Bool_Exp>;
};

/** columns and relationships of "branch" */
export type BranchFiles_AggregateArgs = {
  distinct_on?: Maybe<Array<File_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<File_Order_By>>;
  where?: Maybe<File_Bool_Exp>;
};

/** columns and relationships of "branch" */
export type BranchModulesArgs = {
  distinct_on?: Maybe<Array<Module_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Order_By>>;
  where?: Maybe<Module_Bool_Exp>;
};

/** columns and relationships of "branch" */
export type BranchModules_AggregateArgs = {
  distinct_on?: Maybe<Array<Module_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Order_By>>;
  where?: Maybe<Module_Bool_Exp>;
};

/** columns and relationships of "branch" */
export type BranchVersionsArgs = {
  distinct_on?: Maybe<Array<Module_Version_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Version_Order_By>>;
  where?: Maybe<Module_Version_Bool_Exp>;
};

/** columns and relationships of "branch" */
export type BranchVersions_AggregateArgs = {
  distinct_on?: Maybe<Array<Module_Version_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Version_Order_By>>;
  where?: Maybe<Module_Version_Bool_Exp>;
};

/** aggregated selection of "branch" */
export type Branch_Aggregate = {
  aggregate?: Maybe<Branch_Aggregate_Fields>;
  nodes: Array<Branch>;
};

/** aggregate fields of "branch" */
export type Branch_Aggregate_Fields = {
  count?: Maybe<Scalars["Int"]>;
  max?: Maybe<Branch_Max_Fields>;
  min?: Maybe<Branch_Min_Fields>;
};

/** aggregate fields of "branch" */
export type Branch_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Branch_Select_Column>>;
  distinct?: Maybe<Scalars["Boolean"]>;
};

/** order by aggregate values of table "branch" */
export type Branch_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<Branch_Max_Order_By>;
  min?: Maybe<Branch_Min_Order_By>;
};

/** input type for inserting array relation for remote table "branch" */
export type Branch_Arr_Rel_Insert_Input = {
  data: Array<Branch_Insert_Input>;
  on_conflict?: Maybe<Branch_On_Conflict>;
};

/** Boolean expression to filter rows from the table "branch". All fields are combined with a logical 'AND'. */
export type Branch_Bool_Exp = {
  _and?: Maybe<Array<Maybe<Branch_Bool_Exp>>>;
  _not?: Maybe<Branch_Bool_Exp>;
  _or?: Maybe<Array<Maybe<Branch_Bool_Exp>>>;
  created_at?: Maybe<Timestamptz_Comparison_Exp>;
  files?: Maybe<File_Bool_Exp>;
  has_merged?: Maybe<Boolean_Comparison_Exp>;
  modules?: Maybe<Module_Bool_Exp>;
  name?: Maybe<String_Comparison_Exp>;
  protected?: Maybe<Boolean_Comparison_Exp>;
  versions?: Maybe<Module_Version_Bool_Exp>;
};

/** unique or primary key constraints on table "branch" */
export enum Branch_Constraint {
  /** unique or primary key constraint */
  BranchNameKey = "Branch_name_key",
  /** unique or primary key constraint */
  BranchPkey = "branch_pkey"
}

/** input type for inserting data into table "branch" */
export type Branch_Insert_Input = {
  created_at?: Maybe<Scalars["timestamptz"]>;
  files?: Maybe<File_Arr_Rel_Insert_Input>;
  has_merged?: Maybe<Scalars["Boolean"]>;
  modules?: Maybe<Module_Arr_Rel_Insert_Input>;
  name?: Maybe<Scalars["String"]>;
  protected?: Maybe<Scalars["Boolean"]>;
  versions?: Maybe<Module_Version_Arr_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Branch_Max_Fields = {
  created_at?: Maybe<Scalars["timestamptz"]>;
  name?: Maybe<Scalars["String"]>;
};

/** order by max() on columns of table "branch" */
export type Branch_Max_Order_By = {
  created_at?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Branch_Min_Fields = {
  created_at?: Maybe<Scalars["timestamptz"]>;
  name?: Maybe<Scalars["String"]>;
};

/** order by min() on columns of table "branch" */
export type Branch_Min_Order_By = {
  created_at?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
};

/** response of any mutation on the table "branch" */
export type Branch_Mutation_Response = {
  /** number of affected rows by the mutation */
  affected_rows: Scalars["Int"];
  /** data of the affected rows by the mutation */
  returning: Array<Branch>;
};

/** input type for inserting object relation for remote table "branch" */
export type Branch_Obj_Rel_Insert_Input = {
  data: Branch_Insert_Input;
  on_conflict?: Maybe<Branch_On_Conflict>;
};

/** on conflict condition type for table "branch" */
export type Branch_On_Conflict = {
  constraint: Branch_Constraint;
  update_columns: Array<Branch_Update_Column>;
  where?: Maybe<Branch_Bool_Exp>;
};

/** ordering options when selecting data from "branch" */
export type Branch_Order_By = {
  created_at?: Maybe<Order_By>;
  files_aggregate?: Maybe<File_Aggregate_Order_By>;
  has_merged?: Maybe<Order_By>;
  modules_aggregate?: Maybe<Module_Aggregate_Order_By>;
  name?: Maybe<Order_By>;
  protected?: Maybe<Order_By>;
  versions_aggregate?: Maybe<Module_Version_Aggregate_Order_By>;
};

/** primary key columns input for table: "branch" */
export type Branch_Pk_Columns_Input = {
  name: Scalars["String"];
};

/** select columns of table "branch" */
export enum Branch_Select_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  HasMerged = "has_merged",
  /** column name */
  Name = "name",
  /** column name */
  Protected = "protected"
}

/** input type for updating data in table "branch" */
export type Branch_Set_Input = {
  created_at?: Maybe<Scalars["timestamptz"]>;
  has_merged?: Maybe<Scalars["Boolean"]>;
  name?: Maybe<Scalars["String"]>;
  protected?: Maybe<Scalars["Boolean"]>;
};

/** update columns of table "branch" */
export enum Branch_Update_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  HasMerged = "has_merged",
  /** column name */
  Name = "name",
  /** column name */
  Protected = "protected"
}

/** columns and relationships of "file" */
export type File = {
  base_file_id?: Maybe<Scalars["uuid"]>;
  /** An object relationship */
  branch: Branch;
  branch_name: Scalars["String"];
  created_at: Scalars["timestamp"];
  ext: Scalars["String"];
  id: Scalars["uuid"];
  is_modified: Scalars["Boolean"];
  mark_deleted: Scalars["Boolean"];
  /** An object relationship */
  module?: Maybe<Module>;
  module_name: Scalars["String"];
  module_scope: Scalars["String"];
  module_version: Scalars["String"];
  path: Scalars["String"];
  /** An object relationship */
  version?: Maybe<Module_Version>;
};

/** aggregated selection of "file" */
export type File_Aggregate = {
  aggregate?: Maybe<File_Aggregate_Fields>;
  nodes: Array<File>;
};

/** aggregate fields of "file" */
export type File_Aggregate_Fields = {
  count?: Maybe<Scalars["Int"]>;
  max?: Maybe<File_Max_Fields>;
  min?: Maybe<File_Min_Fields>;
};

/** aggregate fields of "file" */
export type File_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<File_Select_Column>>;
  distinct?: Maybe<Scalars["Boolean"]>;
};

/** order by aggregate values of table "file" */
export type File_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<File_Max_Order_By>;
  min?: Maybe<File_Min_Order_By>;
};

/** input type for inserting array relation for remote table "file" */
export type File_Arr_Rel_Insert_Input = {
  data: Array<File_Insert_Input>;
  on_conflict?: Maybe<File_On_Conflict>;
};

/** Boolean expression to filter rows from the table "file". All fields are combined with a logical 'AND'. */
export type File_Bool_Exp = {
  _and?: Maybe<Array<Maybe<File_Bool_Exp>>>;
  _not?: Maybe<File_Bool_Exp>;
  _or?: Maybe<Array<Maybe<File_Bool_Exp>>>;
  base_file_id?: Maybe<Uuid_Comparison_Exp>;
  branch?: Maybe<Branch_Bool_Exp>;
  branch_name?: Maybe<String_Comparison_Exp>;
  created_at?: Maybe<Timestamp_Comparison_Exp>;
  ext?: Maybe<String_Comparison_Exp>;
  id?: Maybe<Uuid_Comparison_Exp>;
  is_modified?: Maybe<Boolean_Comparison_Exp>;
  mark_deleted?: Maybe<Boolean_Comparison_Exp>;
  module?: Maybe<Module_Bool_Exp>;
  module_name?: Maybe<String_Comparison_Exp>;
  module_scope?: Maybe<String_Comparison_Exp>;
  module_version?: Maybe<String_Comparison_Exp>;
  path?: Maybe<String_Comparison_Exp>;
  version?: Maybe<Module_Version_Bool_Exp>;
};

/** unique or primary key constraints on table "file" */
export enum File_Constraint {
  /** unique or primary key constraint */
  FilePathModuleVersionModuleNameModuleScopeBranchNameE = "file_path_module_version_module_name_module_scope_branch_name_e",
  /** unique or primary key constraint */
  FilePkey = "file_pkey"
}

/** input type for inserting data into table "file" */
export type File_Insert_Input = {
  base_file_id?: Maybe<Scalars["uuid"]>;
  branch?: Maybe<Branch_Obj_Rel_Insert_Input>;
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamp"]>;
  ext?: Maybe<Scalars["String"]>;
  id?: Maybe<Scalars["uuid"]>;
  is_modified?: Maybe<Scalars["Boolean"]>;
  mark_deleted?: Maybe<Scalars["Boolean"]>;
  module?: Maybe<Module_Obj_Rel_Insert_Input>;
  module_name?: Maybe<Scalars["String"]>;
  module_scope?: Maybe<Scalars["String"]>;
  module_version?: Maybe<Scalars["String"]>;
  path?: Maybe<Scalars["String"]>;
  version?: Maybe<Module_Version_Obj_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type File_Max_Fields = {
  base_file_id?: Maybe<Scalars["uuid"]>;
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamp"]>;
  ext?: Maybe<Scalars["String"]>;
  id?: Maybe<Scalars["uuid"]>;
  module_name?: Maybe<Scalars["String"]>;
  module_scope?: Maybe<Scalars["String"]>;
  module_version?: Maybe<Scalars["String"]>;
  path?: Maybe<Scalars["String"]>;
};

/** order by max() on columns of table "file" */
export type File_Max_Order_By = {
  base_file_id?: Maybe<Order_By>;
  branch_name?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  ext?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  module_name?: Maybe<Order_By>;
  module_scope?: Maybe<Order_By>;
  module_version?: Maybe<Order_By>;
  path?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type File_Min_Fields = {
  base_file_id?: Maybe<Scalars["uuid"]>;
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamp"]>;
  ext?: Maybe<Scalars["String"]>;
  id?: Maybe<Scalars["uuid"]>;
  module_name?: Maybe<Scalars["String"]>;
  module_scope?: Maybe<Scalars["String"]>;
  module_version?: Maybe<Scalars["String"]>;
  path?: Maybe<Scalars["String"]>;
};

/** order by min() on columns of table "file" */
export type File_Min_Order_By = {
  base_file_id?: Maybe<Order_By>;
  branch_name?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  ext?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  module_name?: Maybe<Order_By>;
  module_scope?: Maybe<Order_By>;
  module_version?: Maybe<Order_By>;
  path?: Maybe<Order_By>;
};

/** response of any mutation on the table "file" */
export type File_Mutation_Response = {
  /** number of affected rows by the mutation */
  affected_rows: Scalars["Int"];
  /** data of the affected rows by the mutation */
  returning: Array<File>;
};

/** input type for inserting object relation for remote table "file" */
export type File_Obj_Rel_Insert_Input = {
  data: File_Insert_Input;
  on_conflict?: Maybe<File_On_Conflict>;
};

/** on conflict condition type for table "file" */
export type File_On_Conflict = {
  constraint: File_Constraint;
  update_columns: Array<File_Update_Column>;
  where?: Maybe<File_Bool_Exp>;
};

/** ordering options when selecting data from "file" */
export type File_Order_By = {
  base_file_id?: Maybe<Order_By>;
  branch?: Maybe<Branch_Order_By>;
  branch_name?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  ext?: Maybe<Order_By>;
  id?: Maybe<Order_By>;
  is_modified?: Maybe<Order_By>;
  mark_deleted?: Maybe<Order_By>;
  module?: Maybe<Module_Order_By>;
  module_name?: Maybe<Order_By>;
  module_scope?: Maybe<Order_By>;
  module_version?: Maybe<Order_By>;
  path?: Maybe<Order_By>;
  version?: Maybe<Module_Version_Order_By>;
};

/** primary key columns input for table: "file" */
export type File_Pk_Columns_Input = {
  id: Scalars["uuid"];
};

/** select columns of table "file" */
export enum File_Select_Column {
  /** column name */
  BaseFileId = "base_file_id",
  /** column name */
  BranchName = "branch_name",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Ext = "ext",
  /** column name */
  Id = "id",
  /** column name */
  IsModified = "is_modified",
  /** column name */
  MarkDeleted = "mark_deleted",
  /** column name */
  ModuleName = "module_name",
  /** column name */
  ModuleScope = "module_scope",
  /** column name */
  ModuleVersion = "module_version",
  /** column name */
  Path = "path"
}

/** input type for updating data in table "file" */
export type File_Set_Input = {
  base_file_id?: Maybe<Scalars["uuid"]>;
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamp"]>;
  ext?: Maybe<Scalars["String"]>;
  id?: Maybe<Scalars["uuid"]>;
  is_modified?: Maybe<Scalars["Boolean"]>;
  mark_deleted?: Maybe<Scalars["Boolean"]>;
  module_name?: Maybe<Scalars["String"]>;
  module_scope?: Maybe<Scalars["String"]>;
  module_version?: Maybe<Scalars["String"]>;
  path?: Maybe<Scalars["String"]>;
};

/** update columns of table "file" */
export enum File_Update_Column {
  /** column name */
  BaseFileId = "base_file_id",
  /** column name */
  BranchName = "branch_name",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Ext = "ext",
  /** column name */
  Id = "id",
  /** column name */
  IsModified = "is_modified",
  /** column name */
  MarkDeleted = "mark_deleted",
  /** column name */
  ModuleName = "module_name",
  /** column name */
  ModuleScope = "module_scope",
  /** column name */
  ModuleVersion = "module_version",
  /** column name */
  Path = "path"
}

/** columns and relationships of "module" */
export type Module = {
  /** An object relationship */
  branch: Branch;
  branch_name: Scalars["String"];
  created_at: Scalars["timestamptz"];
  /** An array relationship */
  files: Array<File>;
  /** An aggregated array relationship */
  files_aggregate: File_Aggregate;
  name: Scalars["String"];
  scope: Scalars["String"];
  /** An array relationship */
  versions: Array<Module_Version>;
  /** An aggregated array relationship */
  versions_aggregate: Module_Version_Aggregate;
};

/** columns and relationships of "module" */
export type ModuleFilesArgs = {
  distinct_on?: Maybe<Array<File_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<File_Order_By>>;
  where?: Maybe<File_Bool_Exp>;
};

/** columns and relationships of "module" */
export type ModuleFiles_AggregateArgs = {
  distinct_on?: Maybe<Array<File_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<File_Order_By>>;
  where?: Maybe<File_Bool_Exp>;
};

/** columns and relationships of "module" */
export type ModuleVersionsArgs = {
  distinct_on?: Maybe<Array<Module_Version_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Version_Order_By>>;
  where?: Maybe<Module_Version_Bool_Exp>;
};

/** columns and relationships of "module" */
export type ModuleVersions_AggregateArgs = {
  distinct_on?: Maybe<Array<Module_Version_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Version_Order_By>>;
  where?: Maybe<Module_Version_Bool_Exp>;
};

/** aggregated selection of "module" */
export type Module_Aggregate = {
  aggregate?: Maybe<Module_Aggregate_Fields>;
  nodes: Array<Module>;
};

/** aggregate fields of "module" */
export type Module_Aggregate_Fields = {
  count?: Maybe<Scalars["Int"]>;
  max?: Maybe<Module_Max_Fields>;
  min?: Maybe<Module_Min_Fields>;
};

/** aggregate fields of "module" */
export type Module_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Module_Select_Column>>;
  distinct?: Maybe<Scalars["Boolean"]>;
};

/** order by aggregate values of table "module" */
export type Module_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<Module_Max_Order_By>;
  min?: Maybe<Module_Min_Order_By>;
};

/** input type for inserting array relation for remote table "module" */
export type Module_Arr_Rel_Insert_Input = {
  data: Array<Module_Insert_Input>;
  on_conflict?: Maybe<Module_On_Conflict>;
};

/** Boolean expression to filter rows from the table "module". All fields are combined with a logical 'AND'. */
export type Module_Bool_Exp = {
  _and?: Maybe<Array<Maybe<Module_Bool_Exp>>>;
  _not?: Maybe<Module_Bool_Exp>;
  _or?: Maybe<Array<Maybe<Module_Bool_Exp>>>;
  branch?: Maybe<Branch_Bool_Exp>;
  branch_name?: Maybe<String_Comparison_Exp>;
  created_at?: Maybe<Timestamptz_Comparison_Exp>;
  files?: Maybe<File_Bool_Exp>;
  name?: Maybe<String_Comparison_Exp>;
  scope?: Maybe<String_Comparison_Exp>;
  versions?: Maybe<Module_Version_Bool_Exp>;
};

/** unique or primary key constraints on table "module" */
export enum Module_Constraint {
  /** unique or primary key constraint */
  ModulePkey = "module_pkey"
}

/** input type for inserting data into table "module" */
export type Module_Insert_Input = {
  branch?: Maybe<Branch_Obj_Rel_Insert_Input>;
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  files?: Maybe<File_Arr_Rel_Insert_Input>;
  name?: Maybe<Scalars["String"]>;
  scope?: Maybe<Scalars["String"]>;
  versions?: Maybe<Module_Version_Arr_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type Module_Max_Fields = {
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  name?: Maybe<Scalars["String"]>;
  scope?: Maybe<Scalars["String"]>;
};

/** order by max() on columns of table "module" */
export type Module_Max_Order_By = {
  branch_name?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  scope?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Module_Min_Fields = {
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  name?: Maybe<Scalars["String"]>;
  scope?: Maybe<Scalars["String"]>;
};

/** order by min() on columns of table "module" */
export type Module_Min_Order_By = {
  branch_name?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  scope?: Maybe<Order_By>;
};

/** response of any mutation on the table "module" */
export type Module_Mutation_Response = {
  /** number of affected rows by the mutation */
  affected_rows: Scalars["Int"];
  /** data of the affected rows by the mutation */
  returning: Array<Module>;
};

/** input type for inserting object relation for remote table "module" */
export type Module_Obj_Rel_Insert_Input = {
  data: Module_Insert_Input;
  on_conflict?: Maybe<Module_On_Conflict>;
};

/** on conflict condition type for table "module" */
export type Module_On_Conflict = {
  constraint: Module_Constraint;
  update_columns: Array<Module_Update_Column>;
  where?: Maybe<Module_Bool_Exp>;
};

/** ordering options when selecting data from "module" */
export type Module_Order_By = {
  branch?: Maybe<Branch_Order_By>;
  branch_name?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  files_aggregate?: Maybe<File_Aggregate_Order_By>;
  name?: Maybe<Order_By>;
  scope?: Maybe<Order_By>;
  versions_aggregate?: Maybe<Module_Version_Aggregate_Order_By>;
};

/** primary key columns input for table: "module" */
export type Module_Pk_Columns_Input = {
  branch_name: Scalars["String"];
  name: Scalars["String"];
  scope: Scalars["String"];
};

/** select columns of table "module" */
export enum Module_Select_Column {
  /** column name */
  BranchName = "branch_name",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Name = "name",
  /** column name */
  Scope = "scope"
}

/** input type for updating data in table "module" */
export type Module_Set_Input = {
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  name?: Maybe<Scalars["String"]>;
  scope?: Maybe<Scalars["String"]>;
};

/** update columns of table "module" */
export enum Module_Update_Column {
  /** column name */
  BranchName = "branch_name",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Name = "name",
  /** column name */
  Scope = "scope"
}

/** columns and relationships of "module_version" */
export type Module_Version = {
  /** An object relationship */
  branch: Branch;
  branch_name: Scalars["String"];
  created_at: Scalars["timestamptz"];
  /** An array relationship */
  files: Array<File>;
  /** An aggregated array relationship */
  files_aggregate: File_Aggregate;
  /** An object relationship */
  module?: Maybe<Module>;
  module_name: Scalars["String"];
  module_scope: Scalars["String"];
  version: Scalars["String"];
};

/** columns and relationships of "module_version" */
export type Module_VersionFilesArgs = {
  distinct_on?: Maybe<Array<File_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<File_Order_By>>;
  where?: Maybe<File_Bool_Exp>;
};

/** columns and relationships of "module_version" */
export type Module_VersionFiles_AggregateArgs = {
  distinct_on?: Maybe<Array<File_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<File_Order_By>>;
  where?: Maybe<File_Bool_Exp>;
};

/** aggregated selection of "module_version" */
export type Module_Version_Aggregate = {
  aggregate?: Maybe<Module_Version_Aggregate_Fields>;
  nodes: Array<Module_Version>;
};

/** aggregate fields of "module_version" */
export type Module_Version_Aggregate_Fields = {
  count?: Maybe<Scalars["Int"]>;
  max?: Maybe<Module_Version_Max_Fields>;
  min?: Maybe<Module_Version_Min_Fields>;
};

/** aggregate fields of "module_version" */
export type Module_Version_Aggregate_FieldsCountArgs = {
  columns?: Maybe<Array<Module_Version_Select_Column>>;
  distinct?: Maybe<Scalars["Boolean"]>;
};

/** order by aggregate values of table "module_version" */
export type Module_Version_Aggregate_Order_By = {
  count?: Maybe<Order_By>;
  max?: Maybe<Module_Version_Max_Order_By>;
  min?: Maybe<Module_Version_Min_Order_By>;
};

/** input type for inserting array relation for remote table "module_version" */
export type Module_Version_Arr_Rel_Insert_Input = {
  data: Array<Module_Version_Insert_Input>;
  on_conflict?: Maybe<Module_Version_On_Conflict>;
};

/** Boolean expression to filter rows from the table "module_version". All fields are combined with a logical 'AND'. */
export type Module_Version_Bool_Exp = {
  _and?: Maybe<Array<Maybe<Module_Version_Bool_Exp>>>;
  _not?: Maybe<Module_Version_Bool_Exp>;
  _or?: Maybe<Array<Maybe<Module_Version_Bool_Exp>>>;
  branch?: Maybe<Branch_Bool_Exp>;
  branch_name?: Maybe<String_Comparison_Exp>;
  created_at?: Maybe<Timestamptz_Comparison_Exp>;
  files?: Maybe<File_Bool_Exp>;
  module?: Maybe<Module_Bool_Exp>;
  module_name?: Maybe<String_Comparison_Exp>;
  module_scope?: Maybe<String_Comparison_Exp>;
  version?: Maybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "module_version" */
export enum Module_Version_Constraint {
  /** unique or primary key constraint */
  ModuleVersionPkey = "module_version_pkey"
}

/** input type for inserting data into table "module_version" */
export type Module_Version_Insert_Input = {
  branch?: Maybe<Branch_Obj_Rel_Insert_Input>;
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  files?: Maybe<File_Arr_Rel_Insert_Input>;
  module?: Maybe<Module_Obj_Rel_Insert_Input>;
  module_name?: Maybe<Scalars["String"]>;
  module_scope?: Maybe<Scalars["String"]>;
  version?: Maybe<Scalars["String"]>;
};

/** aggregate max on columns */
export type Module_Version_Max_Fields = {
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  module_name?: Maybe<Scalars["String"]>;
  module_scope?: Maybe<Scalars["String"]>;
  version?: Maybe<Scalars["String"]>;
};

/** order by max() on columns of table "module_version" */
export type Module_Version_Max_Order_By = {
  branch_name?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  module_name?: Maybe<Order_By>;
  module_scope?: Maybe<Order_By>;
  version?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Module_Version_Min_Fields = {
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  module_name?: Maybe<Scalars["String"]>;
  module_scope?: Maybe<Scalars["String"]>;
  version?: Maybe<Scalars["String"]>;
};

/** order by min() on columns of table "module_version" */
export type Module_Version_Min_Order_By = {
  branch_name?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  module_name?: Maybe<Order_By>;
  module_scope?: Maybe<Order_By>;
  version?: Maybe<Order_By>;
};

/** response of any mutation on the table "module_version" */
export type Module_Version_Mutation_Response = {
  /** number of affected rows by the mutation */
  affected_rows: Scalars["Int"];
  /** data of the affected rows by the mutation */
  returning: Array<Module_Version>;
};

/** input type for inserting object relation for remote table "module_version" */
export type Module_Version_Obj_Rel_Insert_Input = {
  data: Module_Version_Insert_Input;
  on_conflict?: Maybe<Module_Version_On_Conflict>;
};

/** on conflict condition type for table "module_version" */
export type Module_Version_On_Conflict = {
  constraint: Module_Version_Constraint;
  update_columns: Array<Module_Version_Update_Column>;
  where?: Maybe<Module_Version_Bool_Exp>;
};

/** ordering options when selecting data from "module_version" */
export type Module_Version_Order_By = {
  branch?: Maybe<Branch_Order_By>;
  branch_name?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  files_aggregate?: Maybe<File_Aggregate_Order_By>;
  module?: Maybe<Module_Order_By>;
  module_name?: Maybe<Order_By>;
  module_scope?: Maybe<Order_By>;
  version?: Maybe<Order_By>;
};

/** primary key columns input for table: "module_version" */
export type Module_Version_Pk_Columns_Input = {
  branch_name: Scalars["String"];
  module_name: Scalars["String"];
  module_scope: Scalars["String"];
  version: Scalars["String"];
};

/** select columns of table "module_version" */
export enum Module_Version_Select_Column {
  /** column name */
  BranchName = "branch_name",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  ModuleName = "module_name",
  /** column name */
  ModuleScope = "module_scope",
  /** column name */
  Version = "version"
}

/** input type for updating data in table "module_version" */
export type Module_Version_Set_Input = {
  branch_name?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  module_name?: Maybe<Scalars["String"]>;
  module_scope?: Maybe<Scalars["String"]>;
  version?: Maybe<Scalars["String"]>;
};

/** update columns of table "module_version" */
export enum Module_Version_Update_Column {
  /** column name */
  BranchName = "branch_name",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  ModuleName = "module_name",
  /** column name */
  ModuleScope = "module_scope",
  /** column name */
  Version = "version"
}

/** mutation root */
export type Mutation_Root = {
  /** delete data from the table: "branch" */
  delete_branch?: Maybe<Branch_Mutation_Response>;
  /** delete single row from the table: "branch" */
  delete_branch_by_pk?: Maybe<Branch>;
  /** delete data from the table: "file" */
  delete_file?: Maybe<File_Mutation_Response>;
  /** delete single row from the table: "file" */
  delete_file_by_pk?: Maybe<File>;
  /** delete data from the table: "module" */
  delete_module?: Maybe<Module_Mutation_Response>;
  /** delete single row from the table: "module" */
  delete_module_by_pk?: Maybe<Module>;
  /** delete data from the table: "module_version" */
  delete_module_version?: Maybe<Module_Version_Mutation_Response>;
  /** delete single row from the table: "module_version" */
  delete_module_version_by_pk?: Maybe<Module_Version>;
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
  /** insert data into the table: "branch" */
  insert_branch?: Maybe<Branch_Mutation_Response>;
  /** insert a single row into the table: "branch" */
  insert_branch_one?: Maybe<Branch>;
  /** insert data into the table: "file" */
  insert_file?: Maybe<File_Mutation_Response>;
  /** insert a single row into the table: "file" */
  insert_file_one?: Maybe<File>;
  /** insert data into the table: "module" */
  insert_module?: Maybe<Module_Mutation_Response>;
  /** insert a single row into the table: "module" */
  insert_module_one?: Maybe<Module>;
  /** insert data into the table: "module_version" */
  insert_module_version?: Maybe<Module_Version_Mutation_Response>;
  /** insert a single row into the table: "module_version" */
  insert_module_version_one?: Maybe<Module_Version>;
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
  /** update data of the table: "branch" */
  update_branch?: Maybe<Branch_Mutation_Response>;
  /** update single row of the table: "branch" */
  update_branch_by_pk?: Maybe<Branch>;
  /** update data of the table: "file" */
  update_file?: Maybe<File_Mutation_Response>;
  /** update single row of the table: "file" */
  update_file_by_pk?: Maybe<File>;
  /** update data of the table: "module" */
  update_module?: Maybe<Module_Mutation_Response>;
  /** update single row of the table: "module" */
  update_module_by_pk?: Maybe<Module>;
  /** update data of the table: "module_version" */
  update_module_version?: Maybe<Module_Version_Mutation_Response>;
  /** update single row of the table: "module_version" */
  update_module_version_by_pk?: Maybe<Module_Version>;
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
export type Mutation_RootDelete_BranchArgs = {
  where: Branch_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Branch_By_PkArgs = {
  name: Scalars["String"];
};

/** mutation root */
export type Mutation_RootDelete_FileArgs = {
  where: File_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_File_By_PkArgs = {
  id: Scalars["uuid"];
};

/** mutation root */
export type Mutation_RootDelete_ModuleArgs = {
  where: Module_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Module_By_PkArgs = {
  branch_name: Scalars["String"];
  name: Scalars["String"];
  scope: Scalars["String"];
};

/** mutation root */
export type Mutation_RootDelete_Module_VersionArgs = {
  where: Module_Version_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_Module_Version_By_PkArgs = {
  branch_name: Scalars["String"];
  module_name: Scalars["String"];
  module_scope: Scalars["String"];
  version: Scalars["String"];
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
  email: Scalars["String"];
};

/** mutation root */
export type Mutation_RootDelete_User_PreferenceArgs = {
  where: User_Preference_Bool_Exp;
};

/** mutation root */
export type Mutation_RootDelete_User_Preference_By_PkArgs = {
  email: Scalars["String"];
};

/** mutation root */
export type Mutation_RootInsert_BranchArgs = {
  objects: Array<Branch_Insert_Input>;
  on_conflict?: Maybe<Branch_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Branch_OneArgs = {
  object: Branch_Insert_Input;
  on_conflict?: Maybe<Branch_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_FileArgs = {
  objects: Array<File_Insert_Input>;
  on_conflict?: Maybe<File_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_File_OneArgs = {
  object: File_Insert_Input;
  on_conflict?: Maybe<File_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_ModuleArgs = {
  objects: Array<Module_Insert_Input>;
  on_conflict?: Maybe<Module_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Module_OneArgs = {
  object: Module_Insert_Input;
  on_conflict?: Maybe<Module_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Module_VersionArgs = {
  objects: Array<Module_Version_Insert_Input>;
  on_conflict?: Maybe<Module_Version_On_Conflict>;
};

/** mutation root */
export type Mutation_RootInsert_Module_Version_OneArgs = {
  object: Module_Version_Insert_Input;
  on_conflict?: Maybe<Module_Version_On_Conflict>;
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
export type Mutation_RootUpdate_BranchArgs = {
  _set?: Maybe<Branch_Set_Input>;
  where: Branch_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Branch_By_PkArgs = {
  _set?: Maybe<Branch_Set_Input>;
  pk_columns: Branch_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_FileArgs = {
  _set?: Maybe<File_Set_Input>;
  where: File_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_File_By_PkArgs = {
  _set?: Maybe<File_Set_Input>;
  pk_columns: File_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_ModuleArgs = {
  _set?: Maybe<Module_Set_Input>;
  where: Module_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Module_By_PkArgs = {
  _set?: Maybe<Module_Set_Input>;
  pk_columns: Module_Pk_Columns_Input;
};

/** mutation root */
export type Mutation_RootUpdate_Module_VersionArgs = {
  _set?: Maybe<Module_Version_Set_Input>;
  where: Module_Version_Bool_Exp;
};

/** mutation root */
export type Mutation_RootUpdate_Module_Version_By_PkArgs = {
  _set?: Maybe<Module_Version_Set_Input>;
  pk_columns: Module_Version_Pk_Columns_Input;
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
  /** fetch data from the table: "branch" */
  branch: Array<Branch>;
  /** fetch aggregated fields from the table: "branch" */
  branch_aggregate: Branch_Aggregate;
  /** fetch data from the table: "branch" using primary key columns */
  branch_by_pk?: Maybe<Branch>;
  /** fetch data from the table: "file" */
  file: Array<File>;
  /** fetch aggregated fields from the table: "file" */
  file_aggregate: File_Aggregate;
  /** fetch data from the table: "file" using primary key columns */
  file_by_pk?: Maybe<File>;
  /** fetch data from the table: "module" */
  module: Array<Module>;
  /** fetch aggregated fields from the table: "module" */
  module_aggregate: Module_Aggregate;
  /** fetch data from the table: "module" using primary key columns */
  module_by_pk?: Maybe<Module>;
  /** fetch data from the table: "module_version" */
  module_version: Array<Module_Version>;
  /** fetch aggregated fields from the table: "module_version" */
  module_version_aggregate: Module_Version_Aggregate;
  /** fetch data from the table: "module_version" using primary key columns */
  module_version_by_pk?: Maybe<Module_Version>;
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
};

/** query root */
export type Query_RootBranchArgs = {
  distinct_on?: Maybe<Array<Branch_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Branch_Order_By>>;
  where?: Maybe<Branch_Bool_Exp>;
};

/** query root */
export type Query_RootBranch_AggregateArgs = {
  distinct_on?: Maybe<Array<Branch_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Branch_Order_By>>;
  where?: Maybe<Branch_Bool_Exp>;
};

/** query root */
export type Query_RootBranch_By_PkArgs = {
  name: Scalars["String"];
};

/** query root */
export type Query_RootFileArgs = {
  distinct_on?: Maybe<Array<File_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<File_Order_By>>;
  where?: Maybe<File_Bool_Exp>;
};

/** query root */
export type Query_RootFile_AggregateArgs = {
  distinct_on?: Maybe<Array<File_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<File_Order_By>>;
  where?: Maybe<File_Bool_Exp>;
};

/** query root */
export type Query_RootFile_By_PkArgs = {
  id: Scalars["uuid"];
};

/** query root */
export type Query_RootModuleArgs = {
  distinct_on?: Maybe<Array<Module_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Order_By>>;
  where?: Maybe<Module_Bool_Exp>;
};

/** query root */
export type Query_RootModule_AggregateArgs = {
  distinct_on?: Maybe<Array<Module_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Order_By>>;
  where?: Maybe<Module_Bool_Exp>;
};

/** query root */
export type Query_RootModule_By_PkArgs = {
  branch_name: Scalars["String"];
  name: Scalars["String"];
  scope: Scalars["String"];
};

/** query root */
export type Query_RootModule_VersionArgs = {
  distinct_on?: Maybe<Array<Module_Version_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Version_Order_By>>;
  where?: Maybe<Module_Version_Bool_Exp>;
};

/** query root */
export type Query_RootModule_Version_AggregateArgs = {
  distinct_on?: Maybe<Array<Module_Version_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Version_Order_By>>;
  where?: Maybe<Module_Version_Bool_Exp>;
};

/** query root */
export type Query_RootModule_Version_By_PkArgs = {
  branch_name: Scalars["String"];
  module_name: Scalars["String"];
  module_scope: Scalars["String"];
  version: Scalars["String"];
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
  email: Scalars["String"];
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
  email: Scalars["String"];
};

/** subscription root */
export type Subscription_Root = {
  /** fetch data from the table: "branch" */
  branch: Array<Branch>;
  /** fetch aggregated fields from the table: "branch" */
  branch_aggregate: Branch_Aggregate;
  /** fetch data from the table: "branch" using primary key columns */
  branch_by_pk?: Maybe<Branch>;
  /** fetch data from the table: "file" */
  file: Array<File>;
  /** fetch aggregated fields from the table: "file" */
  file_aggregate: File_Aggregate;
  /** fetch data from the table: "file" using primary key columns */
  file_by_pk?: Maybe<File>;
  /** fetch data from the table: "module" */
  module: Array<Module>;
  /** fetch aggregated fields from the table: "module" */
  module_aggregate: Module_Aggregate;
  /** fetch data from the table: "module" using primary key columns */
  module_by_pk?: Maybe<Module>;
  /** fetch data from the table: "module_version" */
  module_version: Array<Module_Version>;
  /** fetch aggregated fields from the table: "module_version" */
  module_version_aggregate: Module_Version_Aggregate;
  /** fetch data from the table: "module_version" using primary key columns */
  module_version_by_pk?: Maybe<Module_Version>;
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
};

/** subscription root */
export type Subscription_RootBranchArgs = {
  distinct_on?: Maybe<Array<Branch_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Branch_Order_By>>;
  where?: Maybe<Branch_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootBranch_AggregateArgs = {
  distinct_on?: Maybe<Array<Branch_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Branch_Order_By>>;
  where?: Maybe<Branch_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootBranch_By_PkArgs = {
  name: Scalars["String"];
};

/** subscription root */
export type Subscription_RootFileArgs = {
  distinct_on?: Maybe<Array<File_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<File_Order_By>>;
  where?: Maybe<File_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootFile_AggregateArgs = {
  distinct_on?: Maybe<Array<File_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<File_Order_By>>;
  where?: Maybe<File_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootFile_By_PkArgs = {
  id: Scalars["uuid"];
};

/** subscription root */
export type Subscription_RootModuleArgs = {
  distinct_on?: Maybe<Array<Module_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Order_By>>;
  where?: Maybe<Module_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootModule_AggregateArgs = {
  distinct_on?: Maybe<Array<Module_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Order_By>>;
  where?: Maybe<Module_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootModule_By_PkArgs = {
  branch_name: Scalars["String"];
  name: Scalars["String"];
  scope: Scalars["String"];
};

/** subscription root */
export type Subscription_RootModule_VersionArgs = {
  distinct_on?: Maybe<Array<Module_Version_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Version_Order_By>>;
  where?: Maybe<Module_Version_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootModule_Version_AggregateArgs = {
  distinct_on?: Maybe<Array<Module_Version_Select_Column>>;
  limit?: Maybe<Scalars["Int"]>;
  offset?: Maybe<Scalars["Int"]>;
  order_by?: Maybe<Array<Module_Version_Order_By>>;
  where?: Maybe<Module_Version_Bool_Exp>;
};

/** subscription root */
export type Subscription_RootModule_Version_By_PkArgs = {
  branch_name: Scalars["String"];
  module_name: Scalars["String"];
  module_scope: Scalars["String"];
  version: Scalars["String"];
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
  email: Scalars["String"];
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
  email: Scalars["String"];
};

/** columns and relationships of "tenant" */
export type Tenant = {
  created_at: Scalars["timestamp"];
  name: Scalars["String"];
  type: Scalars["String"];
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
  name?: Maybe<String_Comparison_Exp>;
  type?: Maybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "tenant" */
export enum Tenant_Constraint {
  /** unique or primary key constraint */
  TenantPkey = "tenant_pkey"
}

/** input type for inserting data into table "tenant" */
export type Tenant_Insert_Input = {
  created_at?: Maybe<Scalars["timestamp"]>;
  name?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
};

/** aggregate max on columns */
export type Tenant_Max_Fields = {
  created_at?: Maybe<Scalars["timestamp"]>;
  name?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
};

/** order by max() on columns of table "tenant" */
export type Tenant_Max_Order_By = {
  created_at?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  type?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type Tenant_Min_Fields = {
  created_at?: Maybe<Scalars["timestamp"]>;
  name?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
};

/** order by min() on columns of table "tenant" */
export type Tenant_Min_Order_By = {
  created_at?: Maybe<Order_By>;
  name?: Maybe<Order_By>;
  type?: Maybe<Order_By>;
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
  name?: Maybe<Order_By>;
  type?: Maybe<Order_By>;
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
  Name = "name",
  /** column name */
  Type = "type"
}

/** input type for updating data in table "tenant" */
export type Tenant_Set_Input = {
  created_at?: Maybe<Scalars["timestamp"]>;
  name?: Maybe<Scalars["String"]>;
  type?: Maybe<Scalars["String"]>;
};

/** update columns of table "tenant" */
export enum Tenant_Update_Column {
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Name = "name",
  /** column name */
  Type = "type"
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
  avatar?: Maybe<Scalars["String"]>;
  created_at: Scalars["timestamptz"];
  email: Scalars["String"];
  opaque_id: Scalars["uuid"];
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
  avatar?: Maybe<String_Comparison_Exp>;
  created_at?: Maybe<Timestamptz_Comparison_Exp>;
  email?: Maybe<String_Comparison_Exp>;
  opaque_id?: Maybe<Uuid_Comparison_Exp>;
  preference?: Maybe<User_Preference_Bool_Exp>;
  role?: Maybe<String_Comparison_Exp>;
  session_last_updated?: Maybe<Timestamptz_Comparison_Exp>;
  username?: Maybe<String_Comparison_Exp>;
};

/** unique or primary key constraints on table "user" */
export enum User_Constraint {
  /** unique or primary key constraint */
  UserPkey = "user_pkey"
}

/** input type for inserting data into table "user" */
export type User_Insert_Input = {
  avatar?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  email?: Maybe<Scalars["String"]>;
  opaque_id?: Maybe<Scalars["uuid"]>;
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
  opaque_id?: Maybe<Scalars["uuid"]>;
  role?: Maybe<Scalars["String"]>;
  session_last_updated?: Maybe<Scalars["timestamptz"]>;
  username?: Maybe<Scalars["String"]>;
};

/** order by max() on columns of table "user" */
export type User_Max_Order_By = {
  avatar?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  email?: Maybe<Order_By>;
  opaque_id?: Maybe<Order_By>;
  role?: Maybe<Order_By>;
  session_last_updated?: Maybe<Order_By>;
  username?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type User_Min_Fields = {
  avatar?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  email?: Maybe<Scalars["String"]>;
  opaque_id?: Maybe<Scalars["uuid"]>;
  role?: Maybe<Scalars["String"]>;
  session_last_updated?: Maybe<Scalars["timestamptz"]>;
  username?: Maybe<Scalars["String"]>;
};

/** order by min() on columns of table "user" */
export type User_Min_Order_By = {
  avatar?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  email?: Maybe<Order_By>;
  opaque_id?: Maybe<Order_By>;
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
  avatar?: Maybe<Order_By>;
  created_at?: Maybe<Order_By>;
  email?: Maybe<Order_By>;
  opaque_id?: Maybe<Order_By>;
  preference?: Maybe<User_Preference_Order_By>;
  role?: Maybe<Order_By>;
  session_last_updated?: Maybe<Order_By>;
  username?: Maybe<Order_By>;
};

/** primary key columns input for table: "user" */
export type User_Pk_Columns_Input = {
  email: Scalars["String"];
};

/** columns and relationships of "user_preference" */
export type User_Preference = {
  dark_mode: Scalars["Boolean"];
  email: Scalars["String"];
  /** An object relationship */
  user: User;
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
  email?: Maybe<String_Comparison_Exp>;
  user?: Maybe<User_Bool_Exp>;
};

/** unique or primary key constraints on table "user_preference" */
export enum User_Preference_Constraint {
  /** unique or primary key constraint */
  UserPreferencePkey = "user_preference_pkey"
}

/** input type for inserting data into table "user_preference" */
export type User_Preference_Insert_Input = {
  dark_mode?: Maybe<Scalars["Boolean"]>;
  email?: Maybe<Scalars["String"]>;
  user?: Maybe<User_Obj_Rel_Insert_Input>;
};

/** aggregate max on columns */
export type User_Preference_Max_Fields = {
  email?: Maybe<Scalars["String"]>;
};

/** order by max() on columns of table "user_preference" */
export type User_Preference_Max_Order_By = {
  email?: Maybe<Order_By>;
};

/** aggregate min on columns */
export type User_Preference_Min_Fields = {
  email?: Maybe<Scalars["String"]>;
};

/** order by min() on columns of table "user_preference" */
export type User_Preference_Min_Order_By = {
  email?: Maybe<Order_By>;
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
  email?: Maybe<Order_By>;
  user?: Maybe<User_Order_By>;
};

/** primary key columns input for table: "user_preference" */
export type User_Preference_Pk_Columns_Input = {
  email: Scalars["String"];
};

/** select columns of table "user_preference" */
export enum User_Preference_Select_Column {
  /** column name */
  DarkMode = "dark_mode",
  /** column name */
  Email = "email"
}

/** input type for updating data in table "user_preference" */
export type User_Preference_Set_Input = {
  dark_mode?: Maybe<Scalars["Boolean"]>;
  email?: Maybe<Scalars["String"]>;
};

/** update columns of table "user_preference" */
export enum User_Preference_Update_Column {
  /** column name */
  DarkMode = "dark_mode",
  /** column name */
  Email = "email"
}

/** select columns of table "user" */
export enum User_Select_Column {
  /** column name */
  Avatar = "avatar",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Email = "email",
  /** column name */
  OpaqueId = "opaque_id",
  /** column name */
  Role = "role",
  /** column name */
  SessionLastUpdated = "session_last_updated",
  /** column name */
  Username = "username"
}

/** input type for updating data in table "user" */
export type User_Set_Input = {
  avatar?: Maybe<Scalars["String"]>;
  created_at?: Maybe<Scalars["timestamptz"]>;
  email?: Maybe<Scalars["String"]>;
  opaque_id?: Maybe<Scalars["uuid"]>;
  role?: Maybe<Scalars["String"]>;
  session_last_updated?: Maybe<Scalars["timestamptz"]>;
  username?: Maybe<Scalars["String"]>;
};

/** update columns of table "user" */
export enum User_Update_Column {
  /** column name */
  Avatar = "avatar",
  /** column name */
  CreatedAt = "created_at",
  /** column name */
  Email = "email",
  /** column name */
  OpaqueId = "opaque_id",
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

export type CreateBranchMutationVariables = Exact<{
  name: Scalars["String"];
}>;

export type CreateBranchMutation = {
  insert_branch_one?: Maybe<Pick<Branch, "name">>;
};

export type SubscribeToBranchesSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type SubscribeToBranchesSubscription = {
  branch: Array<Pick<Branch, "name" | "created_at" | "protected">>;
};

export type SubscribeToFilesSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type SubscribeToFilesSubscription = {
  file: Array<
    Pick<
      File,
      | "id"
      | "ext"
      | "path"
      | "module_name"
      | "module_scope"
      | "module_version"
      | "created_at"
      | "branch_name"
      | "base_file_id"
      | "mark_deleted"
      | "is_modified"
    >
  >;
};

export type SubscribeToModulesSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type SubscribeToModulesSubscription = {
  module: Array<Pick<Module, "name" | "scope" | "created_at" | "branch_name">>;
};

export type SubscribeToModuleVersionsSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type SubscribeToModuleVersionsSubscription = {
  module_version: Array<
    Pick<
      Module_Version,
      "version" | "module_name" | "module_scope" | "created_at" | "branch_name"
    >
  >;
};

export type CreateTenantsMutationVariables = Exact<{
  tenants: Array<Tenant_Insert_Input>;
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

export type GetTenantsQueryVariables = Exact<{ [key: string]: never }>;

export type GetTenantsQuery = {
  tenant: Array<Pick<Tenant, "name" | "created_at" | "type">>;
};

export type SubscribeToTenantListSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type SubscribeToTenantListSubscription = {
  tenant: Array<Pick<Tenant, "name" | "created_at" | "type">>;
};

export type CreateUserMutationVariables = Exact<{
  email: Scalars["String"];
  username: Scalars["String"];
  avatar: Scalars["String"];
}>;

export type CreateUserMutation = {
  insert_user_preference_one?: Maybe<Pick<User_Preference, "email">>;
};

export type DeleteUserMutationVariables = Exact<{
  email: Scalars["String"];
}>;

export type DeleteUserMutation = {
  delete_user_by_pk?: Maybe<Pick<User, "email">>;
};

export type GetCurrentUserQueryVariables = Exact<{ [key: string]: never }>;

export type GetCurrentUserQuery = {
  user: Array<
    Pick<User, "email" | "avatar" | "username"> & {
      preference?: Maybe<Pick<User_Preference, "dark_mode">>;
    }
  >;
};

export type GetUserQueryVariables = Exact<{
  email: Scalars["String"];
}>;

export type GetUserQuery = {
  user_by_pk?: Maybe<Pick<User, "email" | "avatar" | "username">>;
  user_aggregate: { aggregate?: Maybe<Pick<User_Aggregate_Fields, "count">> };
};

export type SetDarkModeMutationVariables = Exact<{
  email: Scalars["String"];
  darkMode: Scalars["Boolean"];
}>;

export type SetDarkModeMutation = {
  update_user_preference_by_pk?: Maybe<Pick<User_Preference, "dark_mode">>;
};

export type SubscribeToUserListSubscriptionVariables = Exact<{
  [key: string]: never;
}>;

export type SubscribeToUserListSubscription = {
  user: Array<
    Pick<
      User,
      | "role"
      | "email"
      | "avatar"
      | "username"
      | "session_last_updated"
      | "created_at"
      | "opaque_id"
    > & { preference?: Maybe<Pick<User_Preference, "dark_mode">> }
  >;
};

export type UpdateUserMutationVariables = Exact<{
  email: Scalars["String"];
  username: Scalars["String"];
  avatar: Scalars["String"];
  time: Scalars["timestamptz"];
}>;

export type UpdateUserMutation = {
  update_user_by_pk?: Maybe<Pick<User, "email" | "opaque_id">>;
};

export const CreateBranchDocument = gql`
  mutation CreateBranch($name: String!) {
    insert_branch_one(object: { name: $name }) {
      name
    }
  }
`;
export const SubscribeToBranchesDocument = gql`
  subscription SubscribeToBranches {
    branch {
      name
      created_at
      protected
    }
  }
`;
export const SubscribeToFilesDocument = gql`
  subscription SubscribeToFiles {
    file {
      id
      ext
      path
      module_name
      module_scope
      module_version
      created_at
      branch_name
      base_file_id
      mark_deleted
      is_modified
    }
  }
`;
export const SubscribeToModulesDocument = gql`
  subscription SubscribeToModules {
    module {
      name
      scope
      created_at
      branch_name
    }
  }
`;
export const SubscribeToModuleVersionsDocument = gql`
  subscription SubscribeToModuleVersions {
    module_version {
      version
      module_name
      module_scope
      created_at
      branch_name
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
export const GetTenantsDocument = gql`
  query GetTenants {
    tenant {
      name
      created_at
      type
    }
  }
`;
export const SubscribeToTenantListDocument = gql`
  subscription SubscribeToTenantList {
    tenant {
      name
      created_at
      type
    }
  }
`;
export const CreateUserDocument = gql`
  mutation CreateUser($email: String!, $username: String!, $avatar: String!) {
    insert_user_preference_one(
      object: {
        dark_mode: true
        user: { data: { avatar: $avatar, email: $email, username: $username } }
      }
    ) {
      email
    }
  }
`;
export const DeleteUserDocument = gql`
  mutation DeleteUser($email: String!) {
    delete_user_by_pk(email: $email) {
      email
    }
  }
`;
export const GetCurrentUserDocument = gql`
  query GetCurrentUser {
    user {
      email
      avatar
      username
      preference {
        dark_mode
      }
    }
  }
`;
export const GetUserDocument = gql`
  query GetUser($email: String!) {
    user_by_pk(email: $email) {
      email
      avatar
      username
    }
    user_aggregate {
      aggregate {
        count
      }
    }
  }
`;
export const SetDarkModeDocument = gql`
  mutation SetDarkMode($email: String!, $darkMode: Boolean!) {
    update_user_preference_by_pk(
      pk_columns: { email: $email }
      _set: { dark_mode: $darkMode }
    ) {
      dark_mode
    }
  }
`;
export const SubscribeToUserListDocument = gql`
  subscription SubscribeToUserList {
    user {
      role
      email
      avatar
      username
      session_last_updated
      created_at
      opaque_id
      preference {
        dark_mode
      }
    }
  }
`;
export const UpdateUserDocument = gql`
  mutation UpdateUser(
    $email: String!
    $username: String!
    $avatar: String!
    $time: timestamptz!
  ) {
    update_user_by_pk(
      _set: {
        username: $username
        email: $email
        avatar: $avatar
        session_last_updated: $time
      }
      pk_columns: { email: $email }
    ) {
      email
      opaque_id
    }
  }
`;

export type SdkFunctionWrapper = <T>(action: () => Promise<T>) => Promise<T>;
export type SdkResponse<T> = {
  data?: T;
  extensions?: unknown;
  headers: Headers;
  status: number;
  errors?: GraphQLError[];
};

const defaultWrapper: SdkFunctionWrapper = sdkFunction => sdkFunction();

export function getSdk(
  client: GraphQLClient,
  withWrapper: SdkFunctionWrapper = defaultWrapper
): Sdk {
  return {
    CreateBranch(variables: CreateBranchMutationVariables) {
      return withWrapper(() =>
        client.rawRequest<CreateBranchMutation>(
          print(CreateBranchDocument),
          variables
        )
      );
    },
    SubscribeToBranches(variables?: SubscribeToBranchesSubscriptionVariables) {
      return withWrapper(() =>
        client.rawRequest<SubscribeToBranchesSubscription>(
          print(SubscribeToBranchesDocument),
          variables
        )
      );
    },
    SubscribeToFiles(variables?: SubscribeToFilesSubscriptionVariables) {
      return withWrapper(() =>
        client.rawRequest<SubscribeToFilesSubscription>(
          print(SubscribeToFilesDocument),
          variables
        )
      );
    },
    SubscribeToModules(variables?: SubscribeToModulesSubscriptionVariables) {
      return withWrapper(() =>
        client.rawRequest<SubscribeToModulesSubscription>(
          print(SubscribeToModulesDocument),
          variables
        )
      );
    },
    SubscribeToModuleVersions(
      variables?: SubscribeToModuleVersionsSubscriptionVariables
    ) {
      return withWrapper(() =>
        client.rawRequest<SubscribeToModuleVersionsSubscription>(
          print(SubscribeToModuleVersionsDocument),
          variables
        )
      );
    },
    CreateTenants(variables: CreateTenantsMutationVariables) {
      return withWrapper(() =>
        client.rawRequest<CreateTenantsMutation>(
          print(CreateTenantsDocument),
          variables
        )
      );
    },
    DeleteTenant(variables: DeleteTenantMutationVariables) {
      return withWrapper(() =>
        client.rawRequest<DeleteTenantMutation>(
          print(DeleteTenantDocument),
          variables
        )
      );
    },
    GetTenants(variables?: GetTenantsQueryVariables) {
      return withWrapper(() =>
        client.rawRequest<GetTenantsQuery>(print(GetTenantsDocument), variables)
      );
    },
    SubscribeToTenantList(
      variables?: SubscribeToTenantListSubscriptionVariables
    ) {
      return withWrapper(() =>
        client.rawRequest<SubscribeToTenantListSubscription>(
          print(SubscribeToTenantListDocument),
          variables
        )
      );
    },
    CreateUser(variables: CreateUserMutationVariables) {
      return withWrapper(() =>
        client.rawRequest<CreateUserMutation>(
          print(CreateUserDocument),
          variables
        )
      );
    },
    DeleteUser(variables: DeleteUserMutationVariables) {
      return withWrapper(() =>
        client.rawRequest<DeleteUserMutation>(
          print(DeleteUserDocument),
          variables
        )
      );
    },
    GetCurrentUser(variables?: GetCurrentUserQueryVariables) {
      return withWrapper(() =>
        client.rawRequest<GetCurrentUserQuery>(
          print(GetCurrentUserDocument),
          variables
        )
      );
    },
    GetUser(variables: GetUserQueryVariables) {
      return withWrapper(() =>
        client.rawRequest<GetUserQuery>(print(GetUserDocument), variables)
      );
    },
    SetDarkMode(variables: SetDarkModeMutationVariables) {
      return withWrapper(() =>
        client.rawRequest<SetDarkModeMutation>(
          print(SetDarkModeDocument),
          variables
        )
      );
    },
    SubscribeToUserList(variables?: SubscribeToUserListSubscriptionVariables) {
      return withWrapper(() =>
        client.rawRequest<SubscribeToUserListSubscription>(
          print(SubscribeToUserListDocument),
          variables
        )
      );
    },
    UpdateUser(variables: UpdateUserMutationVariables) {
      return withWrapper(() =>
        client.rawRequest<UpdateUserMutation>(
          print(UpdateUserDocument),
          variables
        )
      );
    }
  };
}

export type Sdk = {
  CreateBranch(
    variables: CreateBranchMutationVariables
  ): Promise<SdkResponse<CreateBranchMutation>>;
  CreateTenants(
    variables: CreateTenantsMutationVariables
  ): Promise<SdkResponse<CreateTenantsMutation>>;
  SetDarkMode(
    variables: SetDarkModeMutationVariables
  ): Promise<SdkResponse<SetDarkModeMutation>>;
  SubscribeToUserList(
    variables?: SubscribeToUserListSubscriptionVariables
  ): Promise<SdkResponse<SubscribeToUserListSubscription>>;
  DeleteTenant(
    variables: DeleteTenantMutationVariables
  ): Promise<SdkResponse<DeleteTenantMutation>>;
  CreateUser(
    variables: CreateUserMutationVariables
  ): Promise<SdkResponse<CreateUserMutation>>;
  DeleteUser(
    variables: DeleteUserMutationVariables
  ): Promise<SdkResponse<DeleteUserMutation>>;
  SubscribeToModules(
    variables?: SubscribeToModulesSubscriptionVariables
  ): Promise<SdkResponse<SubscribeToModulesSubscription>>;
  GetTenants(
    variables?: GetTenantsQueryVariables
  ): Promise<SdkResponse<GetTenantsQuery>>;
  SubscribeToModuleVersions(
    variables?: SubscribeToModuleVersionsSubscriptionVariables
  ): Promise<SdkResponse<SubscribeToModuleVersionsSubscription>>;
  UpdateUser(
    variables: UpdateUserMutationVariables
  ): Promise<SdkResponse<UpdateUserMutation>>;
  SubscribeToFiles(
    variables?: SubscribeToFilesSubscriptionVariables
  ): Promise<SdkResponse<SubscribeToFilesSubscription>>;
  GetCurrentUser(
    variables?: GetCurrentUserQueryVariables
  ): Promise<SdkResponse<GetCurrentUserQuery>>;
  SubscribeToBranches(
    variables?: SubscribeToBranchesSubscriptionVariables
  ): Promise<SdkResponse<SubscribeToBranchesSubscription>>;
  SubscribeToTenantList(
    variables?: SubscribeToTenantListSubscriptionVariables
  ): Promise<SdkResponse<SubscribeToTenantListSubscription>>;
  GetUser(variables: GetUserQueryVariables): Promise<SdkResponse<GetUserQuery>>;
};
