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

// Build information (build time, commit, etc) needs to be available at
// runtime. Previously, we generated a typescript file containing these details
// as typescript constants. This typescript file was generated as part of the
// build chain before TSC compilation. That is, the build information was
// properly set _before_ TSC compilation. However, obviously this invalidates a
// compilation output cache for _every build_ (because at least the build time
// changes, but especially in every in CI run also the commit hash is different
// from the one in all other CI runs). That's not desired: when typescript code
// does not change, we want to be able to use a previously created compile
// result (e.g., through a Docker image layer cache). So, the idea is to inject
// the build information from a file which is read by code _early_ (during
// import chain)

import fs from "fs";

export interface BUILD_INFO_TYPE {
  BRANCH_NAME: string;
  VERSION_STRING: string;
  COMMIT: string;
  BUILD_TIME_RFC3339: string;
  BUILD_HOSTNAME: string;
}

export let BUILD_INFO: BUILD_INFO_TYPE;

// Exanmple:
// {
//     "BRANCH_NAME": "jp/cli-node-16",
//     "VERSION_STRING": "cf21f5dda-dev",
//     "COMMIT": "cf21f5dd",
//     "BUILD_TIME_RFC3339": "2021-07-08 17:27:51+00:00",
//     "BUILD_HOSTNAME": "x1carb6"
// }

// Define paths to look for the buildinfo file before falling back to toe
// environment variable OPSTRACE_BUILDINFO_PATH.
//
// __dirname is `/snapshot/opstrace/packages/cli/build` in a vercel/pkg-based
// single-binary build. We use
//
// "pkg": {     "assets": "../../buildinfo.json"   },
//
// as part of the CLI's package.json, so that after all the resulting path in
// the single binary build is `/snapshot/opstrace/buildinfo.json`.
//
// In other build artifacts such as container images, we place the
// buildinfo.json file right into the root /.

const CANDIDATE_PATHS = [
  "/snapshot/opstrace/buildinfo.json",
  "/snapshot/build/buildinfo.json", // this is happening in CI
  "/buildinfo.json"
];

function parseFile(p: string): void {
  // Delibereately let things blow up with reading the file or parsing the
  // content does not work; to expose all error detail to the dev
  BUILD_INFO = JSON.parse(fs.readFileSync(p, "utf8"));
  // TODO: validation of properties
}

function probeAndParseFile(p: string): boolean {
  let exists = false;

  try {
    if (fs.existsSync(p)) {
      exists = true;
    }
  } catch (err) {
    // ignore errors probing the existence of this path: treat as non-existing
  }

  if (exists) {
    parseFile(p);
    return true;
  }

  return false;
}

function readBuildInfo() {
  for (const p of CANDIDATE_PATHS) {
    if (probeAndParseFile(p)) return;
  }

  // None of the candidate file paths led to success. Fall back to env.
  if (!process.env.OPSTRACE_BUILDINFO_PATH) {
    throw Error(
      `environment variable OPSTRACE_BUILDINFO_PATH not set ` +
        `and none of [${JSON.stringify(CANDIDATE_PATHS)}] found/readable`
    );
  }

  // If this path is invalid / file cannot be opened, file contents are
  // unexpected: expose underlying error detail
  try {
    parseFile(process.env.OPSTRACE_BUILDINFO_PATH);
  } catch (err) {
    // this is expected to put the entire stack trace of the original error
    // into the string template
    throw Error(
      `environment variable OPSTRACE_BUILDINFO_PATH set ` +
        `but saw the following error while trying to read file:\n${err}`
    );
  }
}

// This throws an error or populates `BUILD_INFO` so that it can be imported by
// other modules
readBuildInfo();
