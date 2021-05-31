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

import { KubeConfig } from "@kubernetes/client-node";
import { Secret } from "@opstrace/kubernetes";
import { State } from "../reducer";
import { log } from "@opstrace/utils";

export const getCertSecretCopy = (
  targetNameSpace: string,
  state: State,
  kubeConfig: KubeConfig,
  ingressNamespace: string,
  ingressCertSecretName: string
) => {
  const certSecretSource = state.kubernetes.cluster.Secrets.resources.find(
    secret =>
      secret.name === ingressCertSecretName &&
      secret.namespace === ingressNamespace
  );

  if (!certSecretSource) {
    log.debug(`Source Cert Secret ${ingressNamespace}/${ingressCertSecretName} not yet created. Skipping copy to namespace ${targetNameSpace}`);
    return;
  }

  const certSecretSourceTenant = new Secret(
    {
      apiVersion: "v1",
      data: {
        ...certSecretSource.data
      },
      kind: "Secret",
      metadata: {
        name: "https-cert",
        namespace: targetNameSpace
      },
      type: "kubernetes.io/tls"
    },
    kubeConfig
  );
  // We don't want this value to change once it exists either.
  // The value of this secret can always be updated manually in the cluster if needs be (kubectl delete <name> -n application) and the controller will create a new one.
  // The corresponding deployment pods that consume it will need to be restarted also to get the new env var containing the new secret.
  certSecretSourceTenant.setImmutable();

  return certSecretSourceTenant;
};
