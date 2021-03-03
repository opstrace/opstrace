# Generating JSON Schema

The `schema.json` file was orginially generated from the Typescript definitions in `types.ts` with the following package:

> npm install typescript-json-schema -g

Once installed, the this command will generate a new schema:

> typescript-json-schema types.ts AlertmanagerConfig --ignoreErrors > schema.json

It was then hand edited DRYing up common definitions such as `http_config` and splitting receiver configs out to make it easier to manager.
