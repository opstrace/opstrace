# How to set up a GCP project for Opstrace

This is a detailed walk-through showing how to set up a fresh GCP project for Opstrace.

## Step 1: create a project

Start by creating a fresh project with the [GCP UI](https://console.cloud.google.com/projectcreate).
In addition to using a good project name (which you can change later), be sure to choose an expressive **project ID** on that screen (as the UI says: the project ID **cannot be changed later**).


**Note:** to prevent confusion, maybe first pick the project ID and then make the name match the ID.

Take note of that project ID.
We will use it down below.

Next up, enable billing for that new project: link a GCP billing account to it, via the [GCP UI](https://console.cloud.google.com/billing/linkedaccount). Some of the next steps will not work if you don't link a billing account.

**Note:** If you are using a new GCP account, please keep in mind the [quotas](https://cloud.google.com/compute/quotas). Every new account has a limited quota for resources like vCPU per region among others. New accounts, receives a quota of 8vCPUs, less than the minimum required for this quickstart.

## Step 2: set up the  `gcloud` CLI

The `gcloud` command-line tool is a part of the Google Cloud SDK.
You have to [download and install that SDK](https://cloud.google.com/sdk/docs/install) on your system and initialize it before you can use the `gcloud` CLI.

After installing `gcloud`, start the login process with `gcloud auth login`.
Log in using the same GCP account that you created the project with above.

Review `gcloud`'s authentication state:

```bash
gcloud auth list
```

The remaining steps assume that `gcloud` is now in fact logged in to a GCP account that has admin privileges for the newly created project.

In the current terminal, set these two environment variables:

```text
export GCP_PROJECT_ID="<your-new-project-id>"
export GCP_SVC_ACC="${GCP_PROJECT_ID}-svc-acc@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
```

Throughout all following steps, it is assumed that these two environment variables are set in the current terminal.

**Note:** be sure that `GCP_PROJECT_ID` is set to the ID of the project, not to the name.
The ID is all lowercase and does not contain whitespace.

## Step 3: create a service account

Issue this command to create a new service account in the new project:

```text
$ gcloud iam service-accounts create "${GCP_PROJECT_ID}-svc-acc" "--project=${GCP_PROJECT_ID}"
Created service account [<project>-svc-acc].
```

## Step 4: set service account permissions

With the following command you can confirm that this service account does not yet have any security roles assigned in the current project:

```text
gcloud projects get-iam-policy ${GCP_PROJECT_ID}  \
    --flatten="bindings[].members" \
    --format='table(bindings.role)' \
    --filter="bindings.members:${GCP_SVC_ACC}"
```

Expected: no output

Next up, grant privileges to the newly created service account:

```text
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} "--member=serviceAccount:${GCP_SVC_ACC}" \
    --role=roles/container.admin
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} "--member=serviceAccount:${GCP_SVC_ACC}" \
    --role=roles/compute.networkAdmin
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} "--member=serviceAccount:${GCP_SVC_ACC}" \
    --role=roles/editor
gcloud projects add-iam-policy-binding ${GCP_PROJECT_ID} "--member=serviceAccount:${GCP_SVC_ACC}" \
    --role=roles/iam.securityAdmin
```

Repeat the command from above, listing the security roles assigned to the service account in the current project:

```text
$ gcloud projects get-iam-policy ${GCP_PROJECT_ID}  \
    --flatten="bindings[].members" \
    --format='table(bindings.role)' \
    --filter="bindings.members:${GCP_SVC_ACC}"
ROLE
roles/compute.networkAdmin
roles/container.admin
roles/editor
roles/iam.securityAdmin
```

## Step 5: enable GCP APIs

Cloud DNS API:

```text
$ gcloud services enable dns.googleapis.com "--project=${GCP_PROJECT_ID}"
Operation "operations/<snip>" finished successfully.
```

Compute Engine API:

```text
$ gcloud services enable compute.googleapis.com "--project=${GCP_PROJECT_ID}"
Operation "operations/<snip>" finished successfully.
```

Kubernetes Engine API:

```text
$ gcloud services enable container.googleapis.com "--project=${GCP_PROJECT_ID}"
Operation "operations/<snip>" finished successfully.
```

Cloud SQL Admin API:

```text
$ gcloud services enable sqladmin.googleapis.com "--project=${GCP_PROJECT_ID}"
Operation "operations/<snip>" finished successfully.
```

Service Networking API:

```text
$ gcloud services enable servicenetworking.googleapis.com "--project=${GCP_PROJECT_ID}"
Operation "operations/<snip>" finished successfully.
```

Cloud Resource Manager API:

```text
$ gcloud services enable cloudresourcemanager.googleapis.com "--project=${GCP_PROJECT_ID}"
Operation "operations/<snip>" finished successfully.
```

## Step 6: create a key and credentials file for the service account

Issue the following command to generate a private key for the service account, and to store it together with credential metadata in a JSON file (in your current working directory):

```text
$ gcloud iam service-accounts keys create \
    --iam-account "${GCP_SVC_ACC}" \
    "${GCP_PROJECT_ID}-svc-acc.json"
created key [<snip>] of type [json] as [<project>-svc-acc.json] for [<project>-svc-acc@<project>.iam.gserviceaccount.com]
```

Lock the file permissions down:

```text
chmod 600 "${GCP_PROJECT_ID}-svc-acc.json"
```

Now, move this credential file wherever you need it to be and remember to always treat it securely: for a production workflow, you may want to submit it to a system designed for storing secrets, and then wipe it from your local machine.

## Further steps

For creating an Opstrace cluster using this project and service account, all you need to do is to set the environment variable `GOOGLE_APPLICATION_CREDENTIALS` (to point to the credentials file created in step 7) before invoking `opstrace create gcp ...`.
For further information, please have a look at the [CLI reference documentation](../../references/cli.md).
