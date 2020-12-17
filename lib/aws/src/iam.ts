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

import { IAM } from "aws-sdk";

import { log } from "@opstrace/utils";

import { awsPromErrFilter, iamClient } from "./util";
import { AWSResource } from "./resource";
import { AWSApiError } from "./types";

export class ServiceLinkedRoleRes extends AWSResource<true> {
  protected rname = "ServiceLinkedRole(elasticloadbalancing.amazonaws.com)";

  protected async tryCreate(): Promise<boolean> {
    const result: IAM.CreateServiceLinkedRoleResponse = await awsPromErrFilter(
      iamClient()
        .createServiceLinkedRole({
          AWSServiceName: "elasticloadbalancing.amazonaws.com"
        })
        .promise()
    );

    log.info(result);
    return true;
  }

  protected async checkCreateSuccess(): Promise<boolean> {
    try {
      await this.tryCreate();
    } catch (e) {
      if (e instanceof AWSApiError) {
        if (
          e.message.includes(
            "Service role name AWSServiceRoleForElasticLoadBalancing has been taken in this account"
          )
        ) {
          log.info(
            `${this.rname} setup: got expected creation error with 'has been taken in this account'`
          );
          return true;
        }
      }
      throw e;
    }
    return false;
  }

  protected async tryDestroy(): Promise<void> {
    log.warning("not cleaning up: %s", this.rname);
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    log.warning("not cleaning up: %s", this.rname);
    return true;
  }
}
