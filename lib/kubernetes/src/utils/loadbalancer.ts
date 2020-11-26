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

import { Provider } from "../types";

export const getLoadBalancerAnnotations = ({
  isPublic,
  platform
}: {
  isPublic: boolean;
  platform: Provider;
}): { [key: string]: string } => {
  let annotations = {};

  if (platform === "aws") {
    annotations = {
      ...annotations,
      // Use an NLB type loadbalancer
      "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
      // Explicitly choose an L4 tcp loadbalancer
      "service.beta.kubernetes.io/aws-load-balancer-backend-protocol": "tcp",
      //  Ensure the ELB idle timeout is less than nginx keep-alive timeout. Because we're
      //  using WebSockets, the value will need to be
      //  increased to '3600' to avoid any potential issues. We set the NGINX timeout to 3700
      //  so that it's longer than the LB timeout.
      "service.beta.kubernetes.io/aws-load-balancer-connection-idle-timeout":
        "3600"
    };
    if (!isPublic) {
      annotations = {
        ...annotations,
        "service.beta.kubernetes.io/aws-load-balancer-internal": "0.0.0.0/0"
      };
    }
  }

  if (platform === "gcp") {
    if (!isPublic) {
      annotations = {
        ...annotations,
        "cloud.google.com/load-balancer-type": "Internal"
      };
    }
  }
  return annotations;
};
