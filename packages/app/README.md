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

Services launched by `yarn services:start`:

* __GraphQL server__: [Hasura](https://hasura.io) GraphQL API.
* __Postgres__: A single postgres instance backing our GraphQL server.
* __Minio__: A single minio server for module storage.

See the [docker compose]("./docker-compose.yml) file the services launched.

## Authentication

By default, Auth0 flow with PKCE is used to get a JWT for a user client-side. That JWT is then submitted to the web-server to create
a session upon successful validation of the the token. This session is then used to handle authentication for the graphql server, web ui, and nginx-ingress.

## Frequently used Scripts

In the project directory, you can run:

### `yarn storybook`

Starts Storybook for our application development kit and serves the storybook UI at [localhost:9009](http://localhost:9009).

### `yarn console`

Opens the Hasura console in a new browser window ([localhost:9009](http://localhost:9009)). We use [Hasura](https://hasura.io) for our GraphQL/Postgress backend.

### `yarn types:watch`

Watches for changes to the graphql schema and regenerates typescript code using [https://graphql-code-generator.com/docs/plugins/typescript](https://graphql-code-generator.com/docs/plugins/typescript)

### `yarn client:test`

Launches the test runner in the interactive watch mode.

See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the client for production to the `build` folder and builds the server for production to the `dist` folder. The server is configured to serve the client bundle under the sibling `build` directory.

It bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.

### Troubleshooting

__Killed: error Command failed with exit code 137.__: This usually means your default memory for docker is too low. See docker documentation on increasing the default memory. For MacOS users, you can
navigate to: Docker for Mac > Preferences > resources and increase the memory setting >= 4GB.

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
