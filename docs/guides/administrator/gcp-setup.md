
# How to set up a GCP project for Opstrace

## Create a fresh project

Create a fresh project with the UI: [https://console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate)

Be sure to choose an expressive **project ID** on that screen, too (s the UI says: **it cannot be changed later**).

Keep note of that project ID.
We will use it down below.


Next up, enable billing for that project: link a (one!) billing account to it, via [the UI](https://console.cloud.google.com/billing/linkedaccount).
Note: some of the next steps will not work if you skip this step


## set up `gcloud`

Now, switch to the command line.
Review `gcloud`'s authentication state:

```bash
gcloud auth list
```

Be sure that `gcloud` is logged in with admin privileges.

Now set these environment variables:

```text
export GCP_PROJECT_ID="<your-new-project-id>"
export GCP_SVC_ACC="${GCP_PROJECT_ID}-svc-acc@${GCP_PROJECT_ID}.iam.gserviceaccount.com"
```

### Create a service account

```text
$ gcloud iam service-accounts create "$GCP_PROJECT_ID-svc-acc" "--project=$GCP_PROJECT_ID"
Created service account [ci-shard-bbb-svc-acc].
```

Get the email representation of that service account:

```text
gcloud iam service-accounts list "--project=$GCP_PROJECT_ID"
```

Set this as an environment variable:

```text
export GCP_SVC_ACC="ci-shard-bbb-svc-acc@ci-shard-bbb.iam.gserviceaccount.com"
```

### Set service account permissions

Review: no permissions yet!

```text
gcloud projects get-iam-policy $GCP_PROJECT_ID  \
    --flatten="bindings[].members" \
    --format='table(bindings.role)' \
    --filter="bindings.members:${GCP_SVC_ACC}"
```

(notice: no output)


```text
$ gcloud iam service-accounts get-iam-policy "$GCP_SVC_ACC"
etag: ACAB
```

```text
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID "--member=serviceAccount:${GCP_SVC_ACC}" --role=roles/container.admin
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID "--member=serviceAccount:${GCP_SVC_ACC}" --role=roles/compute.networkAdmin
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID "--member=serviceAccount:${GCP_SVC_ACC}" --role=roles/editor
gcloud projects add-iam-policy-binding $GCP_PROJECT_ID "--member=serviceAccount:${GCP_SVC_ACC}" --role=roles/iam.securityAdmin
```

```text
$ gcloud projects get-iam-policy $GCP_PROJECT_ID  \
    --flatten="bindings[].members" \
    --format='table(bindings.role)' \
    --filter="bindings.members:${GCP_SVC_ACC}"
ROLE
roles/compute.networkAdmin
roles/container.admin
roles/editor
roles/iam.securityAdmin
```

### Enable APIs

Cloud DNS API:

```text
$ gcloud services enable dns.googleapis.com "--project=$GCP_PROJECT_ID"
Operation "operations/acf.0679b145-a036-4766-b030-d1a0d66869cd" finished successfully.
```

Compute Engine API:

```text
$ gcloud services enable compute.googleapis.com "--project=$GCP_PROJECT_ID"
Operation "operations/acf.2d797b72-c113-4e59-a6ec-647c8382c772" finished successfully.
```

Kubernetes Engine API:

```text
$ gcloud services enable container.googleapis.com "--project=$GCP_PROJECT_ID"
Operation "operations/acf.0ac51eeb-0872-4418-9cc6-1863b2a3eb22" finished successfully.
```

Cloud SQL Admin API:

```text
$ gcloud services enable sqladmin.googleapis.com "--project=$GCP_PROJECT_ID"
Operation "operations/acf.47a1162b-e502-4a12-8a7f-8bbbddd7637e" finished successfully.
```

Service Networking API:

```text
$ gcloud services enable servicenetworking.googleapis.com "--project=$GCP_PROJECT_ID"
Operation "operations/acf.22d4c45b-031a-4677-8ea1-476d04e6a6d7" finished successfully.
```

Cloud Resource Manager API:

```text
$ gcloud services enable cloudresourcemanager.googleapis.com "--project=$GCP_PROJECT_ID"
Operation "operations/acf.ec59f252-37b5-45e4-9d25-0351d30d18ba" finished successfully.
```
