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

import { log, SECOND } from "@opstrace/utils";
import { google, iam_v1 } from "googleapis";
import { delay, call, CallEffect } from "redux-saga/effects";

const iam = google.iam("v1");
const resourcemanager = google.cloudresourcemanager("v1");

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
}): Promise<iam_v1.Schema$ServiceAccount | undefined> {
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
    if (e.code === undefined || e.code !== 404) {
      throw e;
    }
  }

  return undefined;
}

async function createServiceAccount({
  accountId,
  projectId
}: {
  accountId: string;
  projectId: string;
}): Promise<iam_v1.Schema$ServiceAccount> {
  await authorize();
  const params = {
    name: `projects/${projectId}`,
    accountId: accountId
  };
  const sa = await iam.projects.serviceAccounts.create(params);
  return sa.data;
}

async function getIAMPolicy({
  sa
}: {
  sa: iam_v1.Schema$ServiceAccount;
}): Promise<iam_v1.Schema$Policy | undefined> {
  try {
    await authorize();
    const resp = await resourcemanager.projects.getIamPolicy({
      resource: sa.projectId ?? undefined
    });
    return resp.data;
  } catch (e) {
    if (e.code === undefined || e.code !== 404) {
      throw e;
    }
  }
  return undefined;
}

// We can't add a policy binding. We have to fetch the project iam policy
// bindings and add the one we want and send the full policy again.
//
// https://cloud.google.com/resource-manager/reference/rest/v1/projects/getIamPolicy
//
// https://stackoverflow.com/questions/42564112/adding-roles-to-service-accounts-on-google-cloud-platform-using-rest-api
// https://github.com/hashicorp/terraform-provider-google/issues/1225
//
async function ensurePolicyBindingExists({
  sa,
  role
}: {
  sa: iam_v1.Schema$ServiceAccount;
  role: string;
}) {
  await authorize();

  log.debug(`apply policy to sa: ${JSON.stringify(sa, null, 2)}`);

  const policy = (await getIAMPolicy({ sa })) ?? {};

  // handle empty policy bindings
  if (policy.bindings === undefined) {
    policy.bindings = [];
  }

  const member = `serviceAccount:${sa.email}`;

  let done = false;
  for (const b of policy.bindings) {
    if (b.role === role) {
      for (const m of b.members ?? []) {
        if (m === member) {
          log.debug("policy is already set, nothing to do");
          done = true;
        }
      }
      if (!done) {
        log.debug("adding member to existing role");
        done = true;
        const members = b.members ?? [];
        members.push(member);
        b.members = members;
      }
    }
  }

  // role does not exist in policy so add it now
  if (!done) {
    log.debug("adding new policy binding");
    policy.bindings.push({ members: [member], role: role });
  }

  //
  // https://cloud.google.com/resource-manager/reference/rest/v1/projects/setIamPolicy
  //
  const request: iam_v1.Params$Resource$Projects$Serviceaccounts$Setiampolicy = {
    resource: sa.projectId ?? undefined,
    requestBody: {
      policy: policy
    }
  };
  log.debug(`policy request: ${JSON.stringify(request, null, 2)}`);

  await resourcemanager.projects.setIamPolicy(request);
}

// We manage this service account so just go ahead and set the required policy.
// Otherwise we have to fetch the policies, update it (if necessary) and send it
// back again.
async function ensureGSAKSALinkExists({
  kubernetesServiceAccount,
  sa
}: {
  kubernetesServiceAccount: string;
  sa: iam_v1.Schema$ServiceAccount;
}) {
  await authorize();

  const role = "roles/iam.workloadIdentityUser";
  const member = `serviceAccount:${sa.projectId}.svc.id.goog[${kubernetesServiceAccount}]`;

  const policy = {
    bindings: [{ members: [member], role: role }]
  };

  await iam.projects.serviceAccounts.setIamPolicy({
    resource: sa.name ?? undefined,
    requestBody: {
      policy: policy
    }
  });
}

export function* ensureServiceAccountExists({
  name,
  projectId,
  role,
  kubernetesServiceAccount
}: {
  name: string;
  projectId: string;
  role: string;
  kubernetesServiceAccount: string; // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Generator<CallEffect, string, any> {
  while (true) {
    try {
      const sa =
        (yield call(getServiceAccount, { projectId, name })) ??
        (yield call(createServiceAccount, { projectId, accountId: name }));

      yield call(ensurePolicyBindingExists, { sa, role });
      yield call(ensureGSAKSALinkExists, { kubernetesServiceAccount, sa });
      return sa.email;
    } catch (e) {
      log.error(
        `caught error and will retry later: ${JSON.stringify(e, null, 2)}`
      );
      yield delay(5 * SECOND);
    }
  }
}

async function ensurePolicyBindingDoesNotExist({
  sa,
  role
}: {
  sa: iam_v1.Schema$ServiceAccount;
  role: string;
}) {
  await authorize();

  const policy = await getIAMPolicy({ sa });

  if (policy === undefined) {
    throw new Error("failed to fetch IAM policy");
  }

  const member = `serviceAccount:${sa.email}`;

  for (const b of policy.bindings ?? []) {
    if (b.role === role) {
      b.members = b.members?.filter(m => m !== member);
    }
  }

  //
  // https://cloud.google.com/resource-manager/reference/rest/v1/projects/setIamPolicy
  //
  const request: iam_v1.Params$Resource$Projects$Serviceaccounts$Setiampolicy = {
    resource: sa.projectId ?? undefined,
    requestBody: {
      policy: policy
    }
  };
  log.debug(`policy request: ${JSON.stringify(request, null, 2)}`);

  await resourcemanager.projects.setIamPolicy(request);
}

async function deleteServiceAccount({
  sa
}: {
  sa: iam_v1.Schema$ServiceAccount;
}) {
  await authorize();
  await iam.projects.serviceAccounts.delete({ name: sa.name ?? undefined });
}

export function* ensureServiceAccountDoesNotExist({
  name,
  projectId,
  role
}: {
  name: string;
  projectId: string;
  role: string; // eslint-disable-next-line @typescript-eslint/no-explicit-any
}): Generator<unknown, void, any> {
  while (true) {
    try {
      const sa = yield call(getServiceAccount, { projectId, name });
      if (sa !== undefined) {
        yield call(ensurePolicyBindingDoesNotExist, { sa, role });
        yield call(deleteServiceAccount, { sa });
      }
      return;
    } catch (e) {
      log.error(
        `caught error and will retry later: ${JSON.stringify(e, null, 2)}`
      );
      yield delay(5 * SECOND);
    }
  }
}
