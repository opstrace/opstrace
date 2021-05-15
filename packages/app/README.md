# Quick Start

To get started:

```bash
# Ensure dependencies are installed and linked
yarn

# Ensure dependencies are compiled (this can take up to 2 mins sometimes...)
# This only has to be done once (and again when files change in linked packages)
yarn tsc -b

# Terminal 1) Start supporting services in containers with docker compose (you must have docker installed)
yarn services:start

# Terminal 2) Start the web-server/api in watch mode. The server will reload on changes.
yarn server:start

# Terminal 3) Start the ui client (webpack dev server to serve the ui in watch mode)
yarn client:start
```

Services launched by `yarn services:start` via [the docker compose file](docker-compose.yml):

* __GraphQL server__: [Hasura](https://hasura.io) GraphQL API.
* __Postgres__: A single postgres instance backing our GraphQL server.
* __pgadmin__: A dashboard for manually interacting with Postgres.
* __Minio__: A single S3/minio server for module storage.

## Frequently used Scripts

In the project directory, you can run:

### `yarn storybook`

Starts Storybook for our application development kit and serves the storybook UI at [localhost:9009](http://localhost:9009).

### `yarn console`

Opens the Hasura console in a new browser window ([localhost:9009](http://localhost:9009)). We use [Hasura](https://hasura.io) for our GraphQL/Postgress backend.

### `yarn seeds:dev:tenants`

Prepopulates the tenant table with the required "system" tenant and another tenant named "default".

### `yarn types:watch`

Watches for changes to the graphql schema and regenerates typescript code using [https://graphql-code-generator.com/docs/plugins/typescript](https://graphql-code-generator.com/docs/plugins/typescript)

### `yarn client:test`

Launches the test runner in the interactive watch mode.

See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the client for production to the `build` folder and builds the server for production to the `dist` folder. The server is configured to serve the client bundle under the sibling `build` directory.

It bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.

## Remote cluster development

Some features rely on other Opstrace services running in an Opstrace cluster. To develop against an Opstrace cluster, we use Telepresence to connect your remote Opstrace application pod to your local machine, enabling you to make changes locally and the container in the remote cluster will automatically reload with compiled changes. Instead of the usual workflow running `services:start`, `server:start` and `client:start` the needed steps are slightly different.

Make sure you are correctly setup to access the cluster, for example using

* Install [Telepresence](https://www.getambassador.io/docs/telepresence/latest/howtos/intercepts/#1-install-the-telepresence-cli) on your local machine
* On macos you'll be prompted with instructions to grant some permissions for filesystem access
* `source ../../secrets/aws-dev-svc-acc-env.sh`
* `aws eks update-kubeconfig --name <your cluster name here> --region us-west-2`

Then run all of the following commands:

* `make start-remote-dev`
* `yarn server:remote`
* `yarn client:start`

When finished with remote dev:

* `make stop-remote-dev`

The remote development workflow will compile client and server code changes locally and you'll then be able to *access the UI in the remote cluster* (i.e. {clustername}.Opstrace.io **NOTE: select "disable cache" under your browsers network tab) to see the updated changes. Hot reloading is disabled so you'll have to hit a browser refresh.

For accessing the remote Hasura console run the these scripts:

* `remote:services:start:graphql`
* `remote:console`

### What this does

The `remote:services:start:graphql` starts a port forward into your cluster making the Hasura server available locally on port `8090`. The `remote:console` script then connects to this using the Hasura admin secret it extracts from the appropriate k8s secret that are set as ENV VARs.

### Todo

* At the moment the main `services:start` script still runs everything locally with docker-compose even though some of it is not needed.


## Schema development

For changing the Postgres schema e.g. adding new tables or existing new tables, we will launch Hasura+Postgres in a docker-compose environment, and then locally run the Hasura console for interacting with that environment. See also [Hasura migrations docs](https://hasura.io/docs/1.0/graphql/core/migrations/migrations-setup.html).

Changes via the Hasura console will take effect immediately:

* The Postgres schema in the docker-compose environment will be updated to reflect schema changes.
* The Hasura `metadata/` and `migrations/` directories will be updated automatically (via mounts in the docker-compose environment).
* The Typescript and Go GraphQL client code will be automatically regenerated (via `yarn types:watch`).

`.gql` files must be explicitly created for any query/mutate calls to be included in the generated Typescript/Go client code. See existing `.gql` files under `src/state/` for examples.

```bash
# Ensure dependencies are installed and linked
yarn
docker-compose --version
hasura version # see also: https://hasura.io/docs/1.0/graphql/core/hasura-cli/install-hasura-cli.html
addlicense # run via codegen hook

# Terminal 1) Start Hasura server and Postgres via docker-compose
yarn services:start

# Terminal 2) Start the Hasura console on the host environment
yarn console

# Terminal 3) Talk to Hasura server to regenerate Typescript and Go client code automatically:
#             - /packages/app/src/state/graphql-api-types.ts
#             - /packages/controller/src/dbSDK.ts
#             - /go/pkg/graphql/client_generated.go (note: addlicense doesn't update this file because it appears generated)
yarn types:watch

# Browser: connect to localhost at the URL printed by "yarn console" and get to it
```

### pgadmin access

The docker-compose environment includes a pgadmin instance for inspecting Postgres directly.

1. With `yarn services:start` running in a terminal, connect to `http://localhost:5050`
2. Log in with `pgadmin@example.com`/`admin`
3. Right click `Servers` in left panel -> `Create` -> `Server`
4. General tab: name=`foo`
5. Connection tab: host=`postgres`, user=`postgres`, pass=`postgrespassword`, save password=`Y`
6. Save, then navigate to tables under `Databases`/`postgres`/`Schemas`/`public`/`Tables`

### Troubleshooting

__Killed: error Command failed with exit code 137.__: This usually means your default memory for docker is too low. See docker documentation on increasing the default memory. For MacOS users, you can
navigate to: Docker for Mac > Preferences > resources and increase the memory setting >= 4GB. Recommended to allocate 10GB and 6 cpus.

## Test Build and Deploy

Build and push container images with the following script (it will rebuild and push images if content has changed in this package):

```bash
../../ci/build-docker-images-update-controller-config.sh
```

`packages/controller-config/src/docker-images.json` will be updated to refer to newly built images.


Now build the controller to use the new configuration:

```bash
cd ../controller && yarn build
```

Run the controller locally if you don't have one already running in your remote cluster:

```bash
cd ../../ && make controller-local
```

The controller will now update the deployments with the new images specified in `packages/controller-config/src/docker-images.json`

__If you have a controller running in your cluster already, it's best to delete it and continue your testing by running the controller locally__. To check if you have a controller running:

```bash
kubectl get deploy opstrace-controller -n kube-system
```

To delete the in-cluster controller:

```bash
kubectl delete deploy opstrace-controller -n kube-system
```

## Background: login, authentication, session management

By default, the UI logs in to the cluster through a canonical single sign-on flow: an OAuth 2.0 Authorization Code Flow involving a so-called Proof Key for Code Exchange (PKCE).
The PKCE technique is specified in [RFC 7636](https://tools.ietf.org/html/rfc7636).

In this type of single sign-on flow, the UI/browser/user-agent is the so-called relying party (RP).
Because the RP is functionally and configuration-wise the same across potentially many Opstrace cluster environments, there is no OAuth 2.0 client secret associated with the RP.
The RP is identified by only the client ID -- which is _shared_ across environments.
That is the major reason for adopting the Proof Key for Code Exchange as a required layer of security.

We use Auth0 as the identity provider (IdP) in this flow and can therefore proxy to other popular IdPs like GitHub and Google.

By the end of the PKCE-based flow, the RP submits an artifact (OpenID Connect ID Token) to the UI backend (running in the Opstrace cluster) where it is verified using public key cryptography. When said verification succeeds, the RP (the UI) is considered as successfully logged in -- and the UI backend creates a "server-side" session in a key-value store.
The corresponding session identifier is persisted with the UI through a browser cookie.

In all subsequent HTTP requests issued by the UI, said cookie is sent and serves as authentication proof until the corresponding session expires, or gets otherwise revoked or invalidated.
