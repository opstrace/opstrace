import path from "path";
import * as glob from "glob";

export function getVirtualDtsPath(resolvedImportPath: string) {
  let importPath = /\/node_modules\//.test(resolvedImportPath)
    ? resolvedImportPath.replace(/^.*node_modules\//, "@node_modules/")
    : resolvedImportPath
        .replace(/^.*src\//, "opstrace.com/x/sdk/")
        .replace(/^opstrace.com\/x\/sdk\/client\//, "@node_modules/_internal/")
        .replace("/sdk/sdk/", "/sdk/")
        // .replace("/sdk/react", "/react");
  return importPath;
}

export function removeExtension(fileName: string) {
  return fileName
    .substr(0, fileName.length - path.extname(fileName).length)
    .replace(/\.d$/, "");
}

export function getEntrypoints(excludePrivate?: boolean) {
  return glob
    .sync(path.resolve(process.cwd(), "src/sdk/**/*{.ts,.tsx}"))
    .filter(
      f =>
        !/__tests__|\.spec\.|\.stories\.|index\.|compiler\./.test(f) &&
        (!excludePrivate || !/_runtime/.test(f))
    );
}

/**
 * Returns all files available to end users.
 */
export function getSDKFiles() {
  const entrypoints = getEntrypoints();
  return entrypoints
    .map(e => removeExtension(getVirtualDtsPath(e)))
    .filter(f => !/_runtime/.test(f));
}
