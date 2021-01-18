## Opstrace Module Library

This folder contains all the code we want to export and make available to the user in the module editor.

### How this code maps to an import in the module editor

Each folder in this directory is treated as a module name. For instance, a user will be able to import `@opstrace/components/button` and that will resolve to a built and bundled version of the entrypoint `/src/lib/components/button.ts`.

The [dtsGenerator](../../scripts/dtsGenerator.ts) is used to compile all the library types into a single dts file ([opstrace.d.ts](../opstrace.d.ts)). This dts file is loaded into the [OpScriptWorker](../workers) as an extraLib so the typings for `@opstrace/` user libraries are available.