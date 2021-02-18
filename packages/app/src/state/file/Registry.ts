/**
 * Copyright 2021 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { init, parse } from "es-module-lexer";
import { opScriptDefaults } from "workers";
import { cleanImport, isRegistryImport } from "state/file/utils/registry";
import * as path from "state/file/utils/path";

export interface Dependency {
  filepath: string;
  content: string;
}

interface PackageDeps {
  [name: string]: string;
}

interface PackageTypes {
  packageSpec: string;
  url: string;
  content: string;
  deps: PackageDeps;
}

interface PackageJson {
  types?: string;
  typings?: string;
  devDependencies?: {};
  dependencies?: {};
}

function parseRawPackageImport(spec: string): [string, string | null] {
  const impParts = spec.split("/");
  if (spec.startsWith("@")) {
    const [scope, name, ...rest] = impParts;
    return [`${scope}/${name}`, rest.join("/") || null];
  }
  const [name, ...rest] = impParts;
  return [name, rest.join("/") || null];
}

export class Registry {
  private loadedTypes: Map<string, PackageTypes[]> = new Map();
  private packageSpecs = new Set<string>();
  // Cache the fetch responses. Use null for failures
  private fetchCache = new Map<string, Promise<Response>>();
  /**
   * Parses the content for imports and loads them if they're from the registry
   * @param content string
   */
  async parseAndLoadImports(content: string) {
    await init;
    try {
      const [imports] = parse(content);
      for (const { s, e } of imports) {
        const importPath = content.substring(s, e);

        if (isRegistryImport(importPath)) {
          this.loadTypings(cleanImport(importPath));
        }
      }
    } catch (err) {
      console.error(err, content);
      // don't care. Threw because we have invalid TS
    }
  }

  private async fetchText(url: string) {
    return this.fetch(url).then(resp => (resp.ok ? resp.clone().text() : ""));
  }

  private async fetchJson<T>(url: string) {
    return this.fetch(url).then(resp =>
      resp.ok ? resp.clone().json() : ({} as T)
    );
  }

  private async fetch(url: string) {
    const cached = this.fetchCache.get(url);
    if (cached) {
      return cached;
    }
    const res = fetch(url);
    this.fetchCache.set(url, res);
    return res;
  }

  private async loadTypings(packageSpec: string) {
    if (this.packageSpecs.has(packageSpec)) {
      return;
    }
    this.packageSpecs.add(packageSpec);

    if (packageSpec.startsWith("sdk/")) {
      // We already have the types loaded (opstrace.lib.d)
      return;
    }

    const types = await this.fetchPackageTypings(packageSpec);
    if (!types) {
      return;
    }
    // Parse the types file to see if it has dependencies and load em
    await this.loadDependencies(types);
  }

  private async loadDependencies(types: PackageTypes) {
    await init;
    if (!types.content) {
      return;
    }
    const [imports] = parse(types.content);
    let delta = 0;
    let updatedContent = types.content;

    for (const { s, e } of imports) {
      const importPath = types.content.substring(s, e);

      if (importPath.startsWith(".")) {
        // Load the relative path
        const url = path.join(
          path.dirname(types.url),
          importPath.endsWith(".d.ts") ? importPath : importPath + ".d.ts"
        );
        this.fetchText(url)
          .then(content => ({
            url,
            content,
            packageSpec: types.packageSpec,
            deps: types.deps
          }))
          .then(depTypes => this.loadDependencies(depTypes));
      } else {
        // map the import to the version in deps
        const packageSemver =
          types.deps[importPath] ||
          types.deps["@types/" + importPath] ||
          "latest";
        const depsPackageSpec = importPath + "@" + packageSemver;
        // Replace the import statement in the contents to reference this new depsPackageSpec
        // which includes the version. This allows us to load multiple versions of things
        // without them conflicting. So instead of:
        // import lodash from "lodash", we now have -> 'import lodash from lodash@latest',
        // where 'latest' can also be any valid semver specifer.
        updatedContent =
          updatedContent.slice(0, s + delta) +
          depsPackageSpec +
          updatedContent.slice(e + delta);
        delta += depsPackageSpec.length - importPath.length;
        // Load the dependency
        this.fetchPackageTypings(depsPackageSpec).then(depTypes => {
          if (depTypes) {
            this.loadDependencies(depTypes);
          }
        });
      }
    }
    this.addTypings({ ...types, content: updatedContent });
  }

  private addTypings(types: PackageTypes) {
    const existingTypes = this.loadedTypes.get(types.packageSpec) || [];
    this.loadedTypes.set(types.packageSpec, [...existingTypes, types]);
    let filepath =
      types.packageSpec +
      "/" +
      types.url
        .replace(/^.+\/unpkg\.com\/@types\//, "")
        .replace(/^.+\/unpkg\.com\//, "")
        .split("/")
        .slice(1)
        .join("/");

    opScriptDefaults.addExtraLib(
      types.content,
      `file:///node_modules/opstrace.com/x/${filepath}`
    );
  }

  private async fetchPackageJson(packageSpec: string) {
    const [packageName] = parseRawPackageImport(packageSpec);
    return this.fetchJson<PackageJson>(
      `https://unpkg.com/${packageName}/package.json`
    );
  }

  private async fetchPackageTypes(
    packageSpec: string,
    types: string,
    deps: PackageDeps
  ): Promise<PackageTypes> {
    packageSpec = packageSpec.endsWith("/" + types)
      ? packageSpec.substr(0, packageSpec.length - types.length - 1)
      : packageSpec;
    const url = path.join(
      `https://unpkg.com/`,
      packageSpec,
      types.endsWith(".d.ts") ? types : types + ".d.ts"
    );
    return this.fetchText(url).then(content => ({
      url,
      content,
      packageSpec,
      deps
    }));
  }

  private async fetchAtTypes(packageSpec: string): Promise<PackageTypes> {
    // Check for a package.json first. If one exists, that tells us these types might have dependencies
    let deps = {};
    let typings = "index.d.ts";

    const [packageName, packagePath] = parseRawPackageImport(packageSpec);
    if (packagePath) {
      typings = packagePath + ".d.ts";
    }
    packageSpec = packageSpec.endsWith("/" + packagePath)
      ? packageSpec.substr(
          0,
          packageSpec.length - (packagePath || "").length - 1
        )
      : packageSpec;
    try {
      deps = this.fetchJson<PackageJson>(
        `https://unpkg.com/@types/${
          // Convert scoped packages to @types package name, e.g. @opstrace/utils -> opstrace__utils.
          packageName.replace(/^@/, "").replace("/", "__")
        }/package.json`
      ).then(content => {
        if (content.typings) {
          typings = content.typings;
        }
        if (content.types) {
          typings = content.types;
        }
        return {
          ...(content.devDependencies || {}),
          ...(content.dependencies || {})
        };
      });
    } catch (err) {}

    const url = path.join(
      `https://unpkg.com/@types`,
      // Convert scoped packages to @types package name, e.g. @opstrace/utils -> opstrace__utils.
      packageName.replace(/^@/, "").replace("/", "__"),
      typings
    );

    return this.fetchText(url).then(content => ({
      url,
      content,
      packageSpec,
      deps
    }));
  }

  private async fetchPackageTypings(
    packageSpec: string
  ): Promise<PackageTypes | null> {
    if (this.loadedTypes.has(packageSpec)) {
      // Do nothing because we've already loaded
      return null;
    }

    const packagePath = parseRawPackageImport(packageSpec)[1];

    let packageJson: PackageJson = {
      devDependencies: {},
      dependencies: {}
    };
    if (!packagePath) {
      try {
        packageJson = await this.fetchPackageJson(packageSpec);
      } catch (err) {
        console.error(`package '${packageSpec}' does not exist`);
        return null;
      }
    }
    const typings: string | null =
      packageJson.types || packageJson.typings || null;

    if (typings) {
      try {
        return await this.fetchPackageTypes(
          packageSpec,
          packagePath ? packagePath + ".d.ts" : typings,
          {
            ...(packageJson.devDependencies || {}),
            ...(packageJson.dependencies || {})
          }
        );
      } catch (err) {
        console.warn(
          `package types '${typings}' for package '${packageSpec}' do not exist, trying @types/`
        );
      }
    }
    // Fallback to trying @types
    try {
      return await this.fetchAtTypes(packageSpec);
    } catch (err) {
      console.error(`package types '@types/${packageSpec}' do not exist`);
      return null;
    }
  }
}

export default new Registry();
