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

// note: webkit doesn't support "look behind" syntax which means can't use the preferred regex for this
// const tenantNameValidatorWithLookBehind = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

// 2021.07.06 - [terrcin] I've removed "-" as a valid char as we're having problems with it in Grafana
// pod names. This means that only alphanumeric chars are allowed.
// Related issue: https://github.com/opstrace/opstrace/issues/957
export const tenantNameValidator = /^[a-z0-9]{2,63}$/;
