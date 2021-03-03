# Generating JSON Schema

The `schema.json` file is generated from the Typescript definitions in `types.ts` with the following package:

> npm install typescript-json-schema -g

Once installed, the this command will generate a new schema:

> typescript-json-schema types.ts AlertmanagerConfig --ignoreErrors > schema.json
