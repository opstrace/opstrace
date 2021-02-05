export function isRegistryImport(importPath: string) {
  return (
    importPath.startsWith("opstrace.com/x/") ||
    importPath.startsWith("https://cdn.skypack.dev/")
  );
}

export function cleanImport(importPath: string) {
  return importPath
    .replace(/^opstrace\.com\/x\//, "")
    .replace(/^.+cdn\.skypack\.dev\//, "");
}

export function rewriteRegistryImport(importPath: string) {
  if (importPath.startsWith("opstrace.com/x/sdk/")) {
    return importPath.replace("opstrace.com/", "/modules/") + ".js";
  }
  return importPath.replace("opstrace.com/x/", "https://cdn.skypack.dev/");
}
