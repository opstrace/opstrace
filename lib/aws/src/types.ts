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
import { EC2 } from "aws-sdk";

export declare interface Dict<T = unknown> {
  [key: string]: T;
}

export type PickRequired<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

export const awsConfigSchema = yup.object({
  certManagerRoleArn: yup.string()
});

export type AWSConfig = yup.InferType<typeof awsConfigSchema>;

type SubnetPublicDefinition = { Public: boolean };

export type Subnet = EC2.Subnet & SubnetPublicDefinition;

// It would be nice if the aws-sdk-js would expose AWS API errors in a way so
// that it is easy to check for them in an error handler in a TypeScript code
// base. However, that's not the case, see
// https://github.com/aws/aws-sdk-js/issues/2611 In those local code sections
// where we do AWS API calls use the `originalError` trick for detecting AWS
// API errors reliably, and then throw _this_ error here so that error handlers
// a little further outside do not need to know about the `originalError`
// trick, and so that outer error handling code reads nicely.
export class AWSApiError extends Error {
  public name: string;
  public statusCode: number;
  constructor(msg: string, name: string, statusCode: number) {
    super(msg);
    this.name = name;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, AWSApiError);
  }
}
