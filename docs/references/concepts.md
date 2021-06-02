---
description: Fundamental user-facing concepts
---

# Key Concepts

## Instance

An "instance" of Opstrace runs inside your cloud account.
It is installed with the CLI `opstrace create` command.
This name must be _globally_ unique and limited to 23 characters (`[a-z0-9-_]`) because it used to provide a conveient DNS name:  `<instance_name>.opstrace.io`.
Once chosen, an instance name cannot be changed.

## Tenants

A "tenant" is a unit of isolation.
[Multi-tenant systems](https://en.wikipedia.org/wiki/Multitenancy) allow for logical separation of concerns, while otherwise sharing the same underlying system.

Opstrace instances support multiple, secured tenants.
The tenant primitive extended from the underlying projects—Cortex and Loki.
Tenants isolate isolate data, dashboards, and API endpoints.
For example, isolate by:

* Teams (e.g., `team-revenue` vs. `team-fraud`)
* Environment (e.g., `prod`, `staging`, `dev`)
* A combination of these things, or anything else important to you.

Sometimes this isolation is used to address security concerns, but more generally, it helps keep things well-organized: because, after all, separation of concerns is a valuable best practice to keep in mind.

Opstrace comes with a default "system tenant" which ingests internal system logs and metrics.
The system tenant is useful for the administrator to monitor the overall health of Opstrace, across tenants.
It cannot be deleted.

During creation at least one "user tenant" must be specified.
Additional user tenants can be added to a running Opstrace instance (see our [Adding and Managing Tenants](../guides/administrator/adding-and-managing-tenants.md) Guide).

## Data API

The data API of an Opstrace cluster encompasses HTTP API endpoints meant for pushing data into and querying from that Opstrace cluster.

That is, if you consider an Opstrace cluster as a black box, the data API is how you get your payload data into the cluster, and how you can look it up again.

The most prominent use case for the data API is for external systems to push logs \(via e.g.
FluentD or Promtail\) or metrics \(via Prometheus' remote\_write protocol\) into an Opstrace cluster.

### Data API authentication

An external system that desires to integrate with the data API needs to present authentication proof, a "data API token".

Upon Opstrace cluster creation, one such API token file is generated per tenant.
These tokens are long-lived and need to be managed carefully by the Opstrace cluster administrator.

#### Anatomy of a data API token, and how to present it

A data API token is a long-lived JSON Web Token \(JWT\) signed with an RSA private key.
It gets issued by the Opstrace cluster management CLI as part of the cluster `create` operation.

A data API token contains a set of standard JWT claims as well as an Opstrace cluster-specific claim set.

To authenticate an HTTP request towards the data API, the API token must be presented within an `Authorization` header using the so-called `Bearer` scheme:

```text
Authorization: Bearer <token>
```

#### Background: key material, and the concept of a non-sensitive cluster config

At the time of writing, the _private_ key for token creation is generated upon cluster creation time within the Opstrace cluster management CLI.
It never enters the Opstrace cluster itself and is in fact persisted nowhere.

The corresponding _public_ key, though, is passed into the Opstrace cluster and is then subsequently used within the data API _authenticator_ to cryptographically validate each putative authentication token presented within incoming HTTP requests.

Given these details, you can think of the API tokens as long-lived client certificates -- it's just that instead X.509 the system uses JWT as the meta data container format.

Note that this concept does not allow for secure, immediate, individual API token revocation: the most predictable \(and secure\) way to invalidate API tokens in this model is to invalidate all of them at the same time by using a fresh public key for token verification.
