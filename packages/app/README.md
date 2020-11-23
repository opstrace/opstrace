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

By default, Auth0 implicit flow with PKCE is used to get a JWT for a user client-side. That JWT is then submitted to the web-server to create
a session upon successful validation of the the token. This session is then used to handle authentication for the graphql server, web ui, and nginx ingress.

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

