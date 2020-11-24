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
import { BUILD_INFO } from "./buildinfo";
// This hard coded repo string makes it hard for anyone else to use their own
// image, but we could expose this variable as an env var if desired.
// Let's cross that bridge if/when we get to it.
// We build the opstrace/app at the same we build opstrace/controller in CI
// so we expect to always have matching image tags for both image repos,
// where that tag is BUILD_INFO.VERSION_STRING.
const APP_CONTAINER_IMAGE = `opstrace/app:${BUILD_INFO.VERSION_STRING}`;

export default APP_CONTAINER_IMAGE;
