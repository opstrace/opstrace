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

module.exports = {
  extends: ["@commitlint/config-conventional"],
  parserPreset: "./commitlint-parser-cfg",
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "alerts", // use `alerts: ` for changes to alert rules, definitions, thresholds, etc.
        "ui", // use `ui: ` for changes to client, and `ui: app:` for changes to server
        "bump", // third-party lib/component bump (can be big, including Cortex, ...)
        "chore", // small routine tasks, very localized refactors
        "ci", // change to automated CI pipeline
        "cli", // change to the cluster management CLI (create, destroy, ..., )
        "cortex", // change to cortex (config change for example)
        "go", // change to golang modules/projects (unit test setup, makefile, etc)
        "ddapi", // change to dd api project
        "controller", // change in the k8s controller CLI
        "dashboards", // change to Grafana dashboards
        "docs", // any documentation change
        "looker", // change to looker project
        "loki", // change to loki (config change for example)
        "makefile", // change in main Makefile
        "revert", // specifically for a git revert commit
        "systemlogs", // change in opstrace system log arch/implementation
        "test-browser", // any change for the test-browser test suite
        "test-remote", // change in test-remote project
        "wip" // work in progress, later to be edited/squashed ("i don't want to think about choosing the right prefix now!")
      ]
    ]
  }
};
