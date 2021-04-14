---
description: Parameter reference
---

# Cluster configuration

When installing Opstrace, one has to provide a corresponding configuration document in YAML format.
A minimal variant might look like this:

```yaml
tenants:
    - prod
    - ci
```

The following sections list individual configuration parameters and aim to provide a detailed specification for their purpose and meaning.

At a high level, there are two different types of parameters:

* required ones
* optional ones (but please do not assume sane defaults yet :-))

**Note:**  as of today, the cluster configuration cannot be updated at runtime.

## Required parameters

### `tenants`

The set of tenants \(their names\) to set up in the Opstrace cluster.
At least one name is required.

*Value type:* list of strings

*Example:*

```yaml
tenants:
    - prod
    - ci
```

## Optional parameters

### `node_count`

The number of underlying nodes for Opstrace to use.

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

Use the `eks_admin_roles` parameter (an enumeration of strings) to define individual AWS IAM roles that should have administrator access to the underlying EKS cluster, via e.g. the [EKS console](https://aws.amazon.com/blogs/containers/introducing-the-new-amazon-eks-console/).

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

Note: the example above shows the defaults.

**Note:**
we develop and test mainly with `region` set to `us-west2`.
To date, we test other regions only manually and rarely.

### `env_label`

Specifies a label that is subsequently attached to most cloud resources associated with the Opstrace cluster.

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
This flag enables or disables said authentication mechanism.

When required, any HTTP request arriving at the tenant HTTP API is expected to show an API token in an `Authorization` header \(using the `Bearer` scheme\).

Notes:

* When set to `false` \(default\), the Opstrace CLI creates one long-lived API token per tenant upon cluster creation.

Naming:

* might be renamed in the future

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

### `cert_issuer`

Defines the issuer to use for all TLS-terminating certificates in the cluster, such as for the externally available data API endpoints.

*Default:* `letsencrypt-prod`

*Value type:* string, one of `letsencrypt-prod` and `letsencrypt-staging`

*Example:*

```yaml
cert_issuer: letsencrypt-prod
```

Note:

* `letsencrypt-staging` should be used for test cluster setups and playgrounds.
  This results in certificates that are not automatically trusted by browsers, i.e. users are likely to see security warnings.
* `letsencrypt-prod` results in browser-trusted certificates, but is subject to quota/limits: [https://letsencrypt.org/docs/rate-limits/](https://letsencrypt.org/docs/rate-limits/).

### `controller_image`

Defines the Docker image to run the controller from.

*Default:* controller image corresponding to the CLI build in use.

*Value type:* string -- Docker image reference, including the Docker hub user/org, the repository name, and the image tag (cf. example).

*Example:*

```yaml
controller_image: opstrace/controller:297005c9-ci
```

This defines the Docker container image based on which the Opstrace cluster installer deploys the so-called Opstrace cluster controller into the cluster \(as a Kubernetes deployment\).

Note that the controller does not get deployed into the cluster when initiating the cluster setup with the `--hold-controller` command line argument.
In that case, `controller_image` must still be set but is ignored.

Change this (compared to the default value) only when you know what you're doing :-).
