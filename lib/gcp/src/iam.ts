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

import { SECOND } from "@opstrace/utils";
import { google, iam_v1 } from "googleapis";
import { delay, call } from "redux-saga/effects";

const iam = google.iam("v1");

async function authorize() {
  // ensure we google sdk authorization is setup
  const auth = new google.auth.GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"]
  });
  const authClient = await auth.getClient();
  google.options({ auth: authClient });
}

async function getServiceAccount({
  projectId,
  name
}: {
  projectId: string;
  name: string;
}): Promise<iam_v1.Schema$ServiceAccount | false> {
  // https://cloud.google.com/iam/docs/reference/rest/v1/projects.serviceAccounts/get
  // Required. The resource name of the service account in the following
  // format: projects/{PROJECT_ID}/serviceAccounts/{ACCOUNT}. Using - as a
  // wildcard for the PROJECT_ID will infer the project from the account. The
  // ACCOUNT value can be the email address or the uniqueId of the service
  // account.
  //
  // We use the email address because we don't know the uniqueId ahead of
  // time.
  const resource = `projects/${projectId}/serviceAccounts/${name}@${projectId}.iam.gserviceaccount.com`;

  try {
    await authorize();
    const resp = await iam.projects.serviceAccounts.get({ name: resource });
    return resp.data;
  } catch (e) {
    // a 404 is expected if the resource does not exist,
    // otherwise throw the error back
    if (!e.code || (e.code && e.code !== "404")) {
      throw e;
    }
  }

  return false;
}

async function createServiceAccount({
  accountId,
  projectId
}: {
  accountId: string;
  projectId: string;
}) {
  try {
    await authorize();
    const params = {
      name: `projects/${projectId}`,
      accountId: accountId
    };
    iam.projects.serviceAccounts.create(params);
  } catch (e) {
    throw e;
  }
}

export function* ensureServiceAccountExists({
  name,
  projectId
}: {
  name: string;
  projectId: string;
}): Generator<any, string, any> {
  while (true) {
    let sa = yield call(getServiceAccount, { projectId, name });
    if (sa.email !== undefined) {
      return sa.email;
    }
    try {
      sa = yield call(createServiceAccount, { projectId, accountId: name });
      if (sa.email !== undefined) {
        return sa.email;
      }
    } catch (e) {
      yield delay(5 * SECOND);
    }
  }
}
