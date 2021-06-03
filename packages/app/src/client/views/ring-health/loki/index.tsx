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

import React from "react";
import RingHealth from "../RingHealth";

export const TABS = [
  {
    title: "Ingester",
    path: `/ingester`,
    endpoint: "/_/loki/ingester/ring"
  }
  // We haven't enabled the Ruler for Loki yet.
  // {
  //   title: "Ruler",
  //   path: `/ruler`,
  //   endpoint: "/_/loki/ruler/ring"
  // }
];

type Props = {
  baseUrl: string;
};

const LokiRingHealth = ({ baseUrl }: Props) => {
  const tabs = TABS.map(tab => ({ ...tab, path: baseUrl + tab.path }));

  return <RingHealth tabs={tabs} />;
};

export default LokiRingHealth;
