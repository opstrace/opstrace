# GCP project configuration

Note: For a detailed walk-through showing how to set up a fresh GCP project for Opstrace, please try our corresponding [admin guide](../guides/administrator/gcp-setup.md).

## Required services (APIs)

Creating an Opstrace cluster in a GCP project requires the following APIs to be [enabled](https://cloud.google.com/service-usage/docs/enable-disable) in that project:

* Cloud DNS API
* Compute Engine API
* Kubernetes Engine API
* Cloud SQL Admin API
* Service Networking API
* Cloud Resource Manager API

We try to keep this list up to date—if in doubt, please [contact us](https://go.opstrace.com/community)!

## Required service account permissions

Creating an Opstrace cluster in a GCP project requires a service account.
That service account must have certain security roles applied in the GCP project:

* `roles/compute.networkAdmin`
* `roles/container.admin`
* `roles/editor`
* `roles/iam.securityAdmin`

If you would like to know which individual permissions are implied by any of these roles, please search for that role (e.g. `roles/container.admin`) on the [GCP IAM permissions reference page](https://cloud.google.com/iam/docs/permissions-reference).

Note: we didn't quite arrive at fulfilling the [principle of least privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege) here—this is an ongoing effort.
If you have specific ideas for reducing the set of privileges required, please [open an issue](https://github.com/opstrace/opstrace/issues/new/choose)!
