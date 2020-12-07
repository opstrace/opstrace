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

import { STS } from "aws-sdk";

import { log, ExitError } from "@opstrace/utils";

import { awsPromErrFilter, stsClient } from "./util";
import { AWSResource } from "./resource";
import { AWSApiError } from "./types";

export class STSRegionCheck extends AWSResource<true> {
  protected rname = "STS region check";

  protected async tryCreate(): Promise<boolean> {
    return true;
  }

  protected async checkCreateSuccess(): Promise<boolean> {
    let result: STS.GetSessionTokenResponse;

    try {
      result = await awsPromErrFilter(stsClient().getSessionToken().promise());
    } catch (e) {
      if (e instanceof AWSApiError) {
        if (
          e.message.includes("STS is not activated in this region for account")
        ) {
          log.error(
            "Pre-flight check failed: the AWS Security Token Service is not active in region %s",
            stsClient().config.region
          );
          // The complete error message is something like "STS is not activated
          // in this region for account:959325414060. Your account
          // administrator can activate STS in this region using the IAM
          // Console." Emit this verbatim.
          throw new ExitError(
            1,
            `Non-retryable error, requires human intervention: ${e.message}`
          );
        }
      }
      throw e;
    }
    if (result) {
      return true;
    }
    return false;
  }

  protected async tryDestroy() {
    log.warning("tryDestroy() should never be called: %s", this.rname);
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    log.warning("tryDestroy() should never be called: %s", this.rname);
    return true;
  }
}

// This does not really set up a resource, but is for getting the AWS account
// ID in a robust fashion (think: a wrapper around  sts.getCallerIdentity()).
export class STSAccountIDRes extends AWSResource<string> {
  protected rname = "STS account ID check";

  protected async tryCreate(): Promise<boolean> {
    return true;
  }

  protected async checkCreateSuccess(): Promise<string | false> {
    const result: STS.GetCallerIdentityResponse = await awsPromErrFilter(
      stsClient().getCallerIdentity().promise()
    );

    if (result.Account) {
      return result.Account;
    }
    return false;
  }

  protected async tryDestroy() {
    log.warning("tryDestroy() should never be called: %s", this.rname);
  }

  protected async checkDestroySuccess(): Promise<true | string> {
    log.warning("tryDestroy() should never be called: %s", this.rname);
    return true;
  }
}
