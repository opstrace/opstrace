---
description: Parameter reference
---

# Configuration

When creating a new Opstrace instance, one has to provide a corresponding configuration document in YAML format.
A minimal variant might look like this:

```yaml
tenants:
    - prod
    - ci
```

To add tenants after installation, see our [Managing Tenants Guide](../guides/administrator/managing-tenants.md).

The following sections list individual configuration parameters and aim to provide a detailed specification for their purpose and meaning.

At a high level, there are two different types of parameters:

* required ones
* optional ones (but please do not assume sane defaults yet :-))

## Required parameters

### `tenants`

The set of initial tenants \(their names\) to create.
At least one name is required.

*Value type:* list of strings

*Example:*

```yaml
tenants:
    - prod
    - staging
    - ci
```

## Optional parameters

### `node_count`

The number of underlying nodes (VMs/machines) to use.

*Value type:* number \(integer\)

*Example:*

```yaml
node_count: 3
```

**Note:**
we develop with three nodes, and—for now—we rarely test with less or more.

### `aws`

Allows for setting configuration specific to Amazon Web Services (AWS).

*Value type:* object

*Example:*

```yaml
aws:
    instance_type: t3.xlarge
    region: us-west-2
    zone_suffix: a
    eks_admin_roles:
        - AWSReservedSSO_AdministratorAccess_133333abc3333337
```

Use the `eks_admin_roles` parameter (an enumeration of strings) to define individual AWS IAM roles that should have administrator access to the underlying EKS cluster, via e.g. the [EKS console](https://aws.amazon.com/blogs/containers/introducing-the-new-amazon-eks-console).

**Note:**
we develop and test mainly with `region` set to `us-west-2`.
To date, we test other regions only manually and rarely.

### `gcp`

Allows for setting infrastructure-related configuration specific to Google Cloud Platform (GCP).

*Value type:* flat object

*Example:*

```yaml
gcp:
    machine_type: n1-standard-4
    region: us-west2
    zone_suffix: a
```

The example above shows the defaults.

**Note:**
we develop and test mainly with `region` set to `us-west2`.
To date, we test other regions only manually and rarely.

### `env_label`

Specifies a label that is subsequently attached to most of the underlying cloud resources.

*Default:* not set, not applied

*Value type:* string

*Example:*

```yaml
env_label: ci
```

The label name will be `env`, and the value will be what you provide here.

### `data_api_authentication_disabled`

*Default:* `false` \(the tenant API requires authentication proof\).

*Value type:* boolean

By default, authentication proof is required when accessing the HTTP API for pushing or querying data.
This flag can be used to disable said authentication mechanism, allowing for unauthenticated clients to write or read data.

When required, any HTTP request arriving at the tenant HTTP API is expected to show an API token in an `Authorization` header \(using the `Bearer` scheme\).

Notes:

* When set to `false` \(default\), the Opstrace CLI creates one long-lived API token per tenant during the `create` operation.

Naming:

* might be renamed in the future (to `tenant_api_...`)

### `data_api_authorized_ip_ranges`

Use this to specify the range of source IP addresses allowed to reach the data API through the Internet.

*Default:* one item: `0.0.0.0/0`

*Value type:* list of strings

*Example:*

```yaml
data_api_authorized_ip_ranges:
    - 54.190.201.152/32
```

Locking this down makes sense when setting `data_api_authentication_disabled` to `true`.

### `custom_dns_name`

Use this when your goal is to reach the Opstrace instance under a custom DNS name, using DNS infrastructure managed entirely by you.

Requires setting `custom_auth0_client_id` (see below).

Setting this parameter disables the default mechanism via which the Opstrace instance is made available under `<instance_name>.opstrace.io` (using Opstrace's DNS infrastructure). As a side effect, this removes the need for the Opstrace CLI to communicate with the Opstrace DNS configuration service and therefore removes the need to log in to that service during `opstrace create ...` and `opstrace destroy ...`.

*Default:* undefined

*Value type:* string

*Example:*

```yaml
custom_dns_name: myopstrace.powerteam.com
```

#### Further specification

* The parameter value needs to be a [fully qualified domain name](https://en.wikipedia.org/wiki/Fully_qualified_domain_name) _without the trailing dot_. It can be a top-level domain, but does not need to be.
* This DNS name will point to the specific Opstrace instance you are planning to create. For example, the UI will then be served under `https://<custom_dns_name>/`.


#### Prerequisites

* **A Google Cloud DNS or AWS Route53 DNS zone** created _a priori_ in your cloud account (during creation, the Opstrace instance will need to interact with the AWS/GCP API and reconfigure that DNS zone to add records for more fine-grained DNS names):
  * If you install the Opstrace instance in a GCP account, this DNS name must correspond to a so-called _managed zone_ in Google Cloud DNS which you must set up prior to installing Opstrace. A guide can be found [here](https://cloud.google.com/dns/docs/quickstart).
  * If you install the Opstrace instance in an AWS account, this DNS name must correspond to a so-called _hosted zone_ in AWS Route53 which you must set up prior to installing Opstrace. A guide can be found [here](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingHostedZone.html).
* **A custom Auth0 application** which you have to set up in advance. It needs to be configured specifically for the custom DNS name you are planning to use. A guide can be found here TODO. Take note of the so-called "client ID" of this Auth0 application and refer to it via `custom_auth0_client_id`. This is necessary for a **secure** single sign-on (SSO) experience; we cannot provide an out-of-the-box SSO experience that works against arbitrary DNS names.

### `cert_issuer`

Defines the issuer to use for all TLS-terminating certificates, such as for the externally available data API endpoints.

*Default:* `letsencrypt-prod`

*Value type:* string, one of `letsencrypt-prod` and `letsencrypt-staging`

*Example:*

```yaml
cert_issuer: letsencrypt-prod
```

Notes:

* `letsencrypt-staging` should be used for test setups and playgrounds.
  This results in certificates that are not automatically trusted by browsers, i.e. users are likely to see security warnings.
* `letsencrypt-prod` results in browser-trusted certificates, but is subject to quota/limits: [https://letsencrypt.org/docs/rate-limits/](https://letsencrypt.org/docs/rate-limits).


### `custom_auth0_client_id` and `custom_auth0_domain`

Use these two parameters when you want to log in to the web UI of your Opstrace instance via your custom Auth0 'application'.

This makes sense especially when you would like to connect to a special identity provider, and is obligatory when using a `custom_dns_name` (see above).

<!-- TODO -->

*Default:* undefined

*Value type:* string

*Example:*

```yaml
custom_auth0_client_id: 1333337
custom_auth0_domain: barfoo.us.auth0.com
```

These two parameters must be provided together.

### `controller_image`

Defines the Docker image to run the controller from.

*Default:* controller image corresponding to the CLI build in use.

*Value type:* string -- Docker image reference, including the Docker hub user/org, the repository name, and the image tag (cf. example).

*Example:*

```yaml
controller_image: opstrace/controller:297005c9-ci
```

This defines the Docker container image based on which the Opstrace installer deploys the Opstrace controller.

Note that the controller does not get deployed when initiating `create` with the `--hold-controller` command line argument.
In that case, `controller_image` must still be set but is ignored.

Change this (compared to the default value) only when you know what you're doing :-).

### `log_retention_days` and `metric_retention_days`

Defines data retention in terms of the number of desired days (for each data type).

*Default:* 7 days.

*Value type:* number \(integer\)

```yaml
log_retention_days: 90
metric_retention_days: 365
```

Notes:

* These options currently cannot be specified on a per-tenant basis.
* These options (as with the other options in the configuration file) currently cannot be changed after initial cluster creation.

