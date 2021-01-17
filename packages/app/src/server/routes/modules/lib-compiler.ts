/**
 * Copyright 2020 Opstrace, Inc.
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
import fs from "fs";
import path from "path";
import { debounce } from "lodash";
import { exec } from "child_process";
import glob from "glob";
import util from "util";
import { log } from "@opstrace/utils/lib/log";
import chokidar from "chokidar";
import { JSONSchemaForNPMPackageJsonFiles } from "@schemastore/package";

const asyncGlob = util.promisify(glob);
const asyncStat = util.promisify(fs.stat);
const asyncReadFile = util.promisify(fs.readFile);

export const DEVELOPING = process.env.NODE_ENV !== "production";
// compile all modules into BUILD_DIRECTORY
const BUILD_DIRECTORY = path.join(process.cwd(), "module_cache");
// directory for where to find all modules we want to compile
const MODULE_LIBRARY_DIRECTORY = path.join(process.cwd(), "../../modules");
// other directories containing packages we may need in order to resolve typings
const PACKAGES_DIRECTORY = path.join(process.cwd(), "../../packages");
const LIB_DIRECTORY = path.join(process.cwd(), "../../lib");

interface ModuleLibrary {
  name: string;
  src: string;
  // only modules in the MODULE_LIBRARY_DIRECTORY are executable since they bundle all dependencies.
  executable: boolean;
  jsDirectory: string;
  typingsDirectory: string;
  typingsExist: boolean;
}

async function getPackagesInDirectory(dir: string) {
  const allPkgPaths = await asyncGlob(`${dir}/**/package.json`);
  // filter out any packages nestled in node_module folders
  const pkgPaths = allPkgPaths.filter(p => p.indexOf("/node_modules/") === -1);

  const pkgs = await Promise.all(
    pkgPaths.map(pkg => asyncReadFile(pkg, "utf8"))
  );
  const pkgJSONs = pkgs.map<JSONSchemaForNPMPackageJsonFiles>(pkg =>
    JSON.parse(pkg)
  );

  return Promise.all(
    pkgJSONs.map<Promise<ModuleLibrary>>(async (pkg, idx) => {
      const name = pkg.name?.replace(/^@opstrace\//, "");
      const pkgPath = pkgPaths[idx].replace(/\/package\.json$/, "");

      if (!name) {
        // This should never happen, but let's handle this just in case
        log.error(`Package at path ${pkgPath} does not have a name`);
      }
      // path to where we can find compiled code (.js & .d.ts)
      const distPath = path.join(
        pkgPath,
        pkg.files && pkg.files.length ? pkg.files[0] : "lib"
      );
      // path to where we can find the main typings for this package
      const typingsPath = path.join(
        pkgPath,
        pkg.types || pkg.typings || "index.d.ts"
      );

      let typingsExist = false;

      try {
        // check if the package has been compiled by checking if the typings exist
        await asyncStat(typingsPath);
        typingsExist = true;
      } catch (err) {
        log.warning(`Cannot find typings for library ${pkg.name} at path: ${typingsPath}.
    This is likely fixed by executing yarn build or yarn watch in the ${pkg.name} package`);
      }

      return {
        name: name!,
        src: path.join(pkgPath, "src"),
        typingsDirectory: distPath,
        executable: dir.startsWith(MODULE_LIBRARY_DIRECTORY),
        // path to the js files is the same as the typings for all regular packages,
        // except for those we compile here under the MODULE_LIBRARY_DIRECTORY directory.
        jsDirectory: dir.startsWith(MODULE_LIBRARY_DIRECTORY)
          ? resolveOutputDirectory(name!)
          : distPath,
        typingsExist
      };
    })
  );
}

function resolveOutputDirectory(libName: string) {
  return path.join(BUILD_DIRECTORY, libName);
}

/**
 * Clean the directory of any existing build files
 */
async function cleanOutputDirectory(lib: ModuleLibrary) {
  const buildDir = resolveOutputDirectory(lib.name);
  // ensure buildDir exists on startup
  if (!fs.existsSync(buildDir)) {
    await execCommand(`mkdir -p", ${buildDir}`);
  }
  await execCommand(`rm -rf ${buildDir}`);
}

/**
 * Executes a command and return it as a Promise.
 */
function execCommand(cmd: string): Promise<Error | string> {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      if (stderr) {
        reject(stderr);
        return;
      }
      resolve(stdout);
    });
  });
}

/**
 * Bundle the library with code splitting
 */
export async function bundle(lib: ModuleLibrary) {
  const start = Date.now();
  log.info(`bundling library: ${lib.name}`);

  await cleanOutputDirectory(lib);

  const modules = await getAllModulesInLibrary(lib);
  const outDir = resolveOutputDirectory(lib.name);

  try {
    await execCommand(`${path.join(
      process.cwd(),
      "node_modules/.bin/esbuild"
    )} \
   --outdir=${outDir} \
   --sourcemap \
   --splitting \
   --format=esm \
   --platform=browser \
   '--define:process.env.NODE_ENV="production"' \
   --minify \
   ${modules.map(file => `--bundle ${file}`).join(" ")}`);
  } catch (err) {
    log.error(err);
    return;
  }

  log.info(
    `✨ finished bundling library ✨: @opstrace/${lib.name} took ${
      Date.now() - start
    }ms`
  );
}

/**
 * Get all files in the directory and return each file as an entrypoint.
 * This ensures any built-in module has all it's dependencies bundled with it.
 */
async function getAllModulesInLibrary(lib: ModuleLibrary) {
  const files = await asyncGlob(`${lib.src}/**/*{.ts,.tsx}`);
  // filter out any files that shouldn't be user facing
  return files.filter(f => !f.endsWith("setupTests.ts"));
}

/**
 * cache of all ModuleLibraries, by name
 */
const moduleLibraryCache = new Map<string, ModuleLibrary>();

/**
 * Compile all built in module libs, ready to be served
 */
async function runCompiler() {
  log.info("reading all packages in /modules directory");
  const builtInModules = await getPackagesInDirectory(MODULE_LIBRARY_DIRECTORY);

  log.info("reading all packages in /packages directory");
  const packages = await getPackagesInDirectory(PACKAGES_DIRECTORY);

  log.info("reading all packages in /lib directory");
  const libs = await getPackagesInDirectory(LIB_DIRECTORY);

  log.info("adding all packages to the moduleLibraryCache");

  builtInModules.forEach(lib => moduleLibraryCache.set(lib.name, lib));
  packages.forEach(lib => moduleLibraryCache.set(lib.name, lib));
  libs.forEach(lib => moduleLibraryCache.set(lib.name, lib));

  if (DEVELOPING) {
    log.info(
      "starting module library compiler in watch mode, so any file changes to packages in /modules-lib will trigger a recompile"
    );
  } else {
    log.info("compiling module libraries");
  }

  for (const lib of builtInModules) {
    await bundle(lib);

    if (DEVELOPING) {
      // recompile on changes
      const watcher = chokidar.watch(`${lib.src}/**/*{.ts,.tsx}`, {
        persistent: true
      });
      watcher.on(
        "all",
        debounce(() => bundle(lib), 300)
      );
    }
  }
}

export function isTSFile(filename: string) {
  return filename.endsWith(".ts") || filename.endsWith(".tsx");
}

/**
 * Returns a path that will resolve the file, or null if filename does not exist
 */
async function tryResolveFile(libName: string, filename: string) {
  const library = moduleLibraryCache.get(libName);
  if (!library) {
    return null;
  }
  // Resolve all DTS files no matter the lib.
  // We do this so we can load the dependencies when browsing our
  // libraries in the UI.
  if (filename.endsWith(".d.ts") || filename.endsWith(".d.ts.map")) {
    const filePath = path.resolve(
      path.join(library.typingsDirectory, filename.replace(/^\/lib/, ""))
    );
    try {
      await asyncStat(filePath);
      return filePath;
    } catch (err) {
      return null;
    }
  }

  // resolve the typescript file
  if (isTSFile(filename)) {
    const filePath = path.resolve(path.join(library.src, filename));
    try {
      await asyncStat(filePath);
      return filePath;
    } catch (err) {
      return null;
    }
  }

  // only move past here if library is executable
  if (!library.executable) {
    return null;
  }

  // resolve the executables
  const filePath = path.join(resolveOutputDirectory(library.name), filename);
  try {
    await asyncStat(filePath);
    return filePath;
  } catch (err) {
    return null;
  }
}

// We only want to execute `runCompiler` once
let compilerExecuted = false;

export default async function resolveFile(
  libraryName: string,
  filename: string
) {
  if (compilerExecuted) {
    return tryResolveFile(libraryName, filename);
  }
  // we run the compiler lazily, so make sure we wait for
  // it to compile before we resolve anything
  await runCompiler();
  compilerExecuted = true;

  return tryResolveFile(libraryName, filename);
}
