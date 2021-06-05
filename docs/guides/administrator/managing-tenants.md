# Managing Tenants Guide

This guide will show you how to:

* Add tenants during the initial create operation
* Add a new tenant to a running cluster
* Delete a tenant

## Introduction

Opstrace supports multiple, secured tenants to logically isolate concerns on otherwise shared infrastructure.
If you are not familiar with what a "tenant" is, see our [tenant key concepts](../../references/concepts.md#tenants) documentation.

Tenants are presented in the Cluster Admin section of our UI:

![tenant overview page](../../assets/tenants-guide-overview-1.png)

Let's walk through an example of adding a new tenant named `newtenant` to a running Opstrace instance named `showdown`.

<!-- TODO link to the integrations guide when it exists
If you’re coming from the [quick start](../../quickstart.md), and haven’t yet sent data to one of your tenants, stay tuned for our forthcoming integrations guide to make that process easy.
-->

## Create a Tenant API Token with the CLI

Because Opstrace is secure by default we will first create a public/private keypair that will be used to authenticate clients that wish to access the tenant API.
If you have created your cluster with [authentication disabled](https://opstrace.com/docs/references/cluster-configuration#data_api_authentication_disabled), option you can skip to the [add a new tenant with the UI](managing-tenants.md#add-a-new-tenant-with-the-ui) section.

### 1) Create a new RSA Key Pair

Create a new RSA key pair and store it in a file with this command:

```bash
./opstrace ta-create-keypair ./custom-keypair.pem
```

Note: The `ta-` prefix represents the idea of "tenant API authentication." All
`ta-*` commands offered by the Opstrace CLI are new and should be thought of as
experimental (command names and signatures are subject to potentially big
changes in the future).

After running this command, you have a local file `./custom-keypair.pem` in your
file system, with locked-down file permissions.
It is important to understand
that this file contains a secret, the _private_ key.

### 2) Create the Token

The following command creates a new authentication token, signed with the
private key of the key pair generated in the first step:

```bash
./opstrace ta-create-token showdown newtenant custom-keypair.pem > token-showdown-newtenant.jwt
```

The token (emitted via `stdout` and captured in the file
`token-showdown-newtenant.jwt`) is a standards-compliant JSON Web Token (JWT),
implementing Opstrace-specific conventions:

* in the JWT header, it encodes an ID of the public key via which it can be
  cryptographically validated.
* in the JWT payload section, it encodes the name of the associated tenant.

For this token to become useful, an Opstrace instance needs to be configured
with the _public key_ corresponding to the private key that was used to sign the
token.
Let's do that.

### 3) Add the Public Key to a Running Opstrace Instance

You can think of this step as adding a new trust anchor to the trust store of a
running Opstrace instance.
Just like with X.509 certificates, trusting a public
key means that authentication proof signed with the correspond _private_ key is
accepted (reminder: in
[public-key cryptography](https://en.wikipedia.org/wiki/Public-key_cryptography),
verification of authentication proof only ever needs the non-sensitive public
key material and not the private key data—that's the beauty).

So, to make an existing Opstrace instance _trust_ the authentication token
generated in the previous step, we have to put the public key into the instance:

```bash
./opstrace ta-pubkeys-add aws showdown custom-keypair.pem
```

## Add a New Tenant in the UI

Visit `https://showdown.opstrace.io/cluster/tenants` and press the `Add Tenant` button.
Type the name of the new tenant (here: `newtenant`).

![add tenant gif](../../assets/tenants-guide-add.gif)

**Warning**: we do not yet do strict tenant name validation.
To make sure things
work, please keep the name lower case `[a-z]` for now.

The Opstrace controller running in the Opstrace instance will start a number of new components and initiate a DNS reconfiguration.

Effectively, we're now waiting for the DNS name
`cortex.newtenant.showdown.opstrace.io` to become available.

We can probe that from our point of view with `curl`:

```bash
curl https://cortex.newtenant.showdown.opstrace.io/api/v1/labels
```

It should take about 5 minutes for DNS name resolution errors to disappear.
Next
up, expect an HTTP response with status code `401`, showing the error message
`Authorization header missing` in the response body.

## Test Tenant API Authentication

Let's add said header and make an example API call against the Cortex API for
the new tenant:

```bash
$ curl -vH "Authorization: Bearer $(cat token-showdown-newtenant.jwt)" \
    https://cortex.newtenant.showdown.opstrace.io/api/v1/labels
...
< HTTP/2 200
...
{"status":"success","data":[]}
```

Getting a `200` response (and not a `401` response) means: the authentication token provided in the request was accepted.
The so-called _authenticator_ in the Opstrace instance extracted the public key ID from the token's header section, found a corresponding public key in its trust store (think: "set of public keys that I am configured to trust"), and then performed a cryptographic verification using that public key.
It also confirmed that the tenant name encoded in the token matches the tenant associated with the API endpoint.

You could now go ahead and take this authentication token and configure serious API clients with it, such as a Prometheus instance to be able to `remote_write` to `https://cortex.newtenant.showdown.opstrace.io/api/v1/push`.

## Send Data to a new Tenant with an Integration

Opstrace provides integrations that simplify collection of data from various data sources.
This includes automating the use of the API tokens in the assocated configuration.
For example, collecting metrics and logs from a Kubernetes cluster.

## Delete a Tenant

Deleting a tenant is simple, although we do not currently purge the data automatically.  We don't deploy the purgers for Cortex or Loki yet, so we, therefore, don't purge the data that exists in Cortex or Loki for a tenant. (In other words, while we delete the tenants, there are still remnants of the data in storage, which means a new tenant could be created with the same name, and it would have access to the existing data left behind.) We will ship this in a future release.

![deleting a tenant gif](../../assets/tenants-guide-delete.gif)
