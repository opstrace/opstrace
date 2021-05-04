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

import {
  Deployment,
  Secret,
  ConfigMap,
  CustomResourceDefinition,
  ClusterRole
} from "..";
import {
  hasClusterRoleChanged,
  hasConfigMapChanged,
  hasCustomResourceDefinitionChanged,
  hasDeploymentChanged,
  hasSecretChanged
} from ".";
import {
  KubeConfig,
  V1ClusterRole,
  V1ConfigMap,
  V1CustomResourceDefinition,
  V1Deployment,
  V1Secret
} from "@kubernetes/client-node";

// mock logger
jest.mock("@opstrace/utils", () => ({
  log: {
    debug: jest.fn
  }
}));

jest.mock("./general", () => ({
  logDifference: jest.fn()
}));

jest.mock("@kubernetes/client-node");

const generateDeployment = () => {
  const resource: V1Deployment = {
    spec: {
      strategy: {
        type: "RollingUpdate"
      },
      template: {},
      selector: {
        matchLabels: {
          some: "label"
        }
      }
    }
  };
  const kubeconfig = new KubeConfig();
  return new Deployment(resource, kubeconfig);
};

const generateSecret = () => {
  const resource: V1Secret = {
    data: {
      my: "data"
    },
    stringData: {
      my: "string-data"
    }
  };
  const kubeconfig = new KubeConfig();
  return new Secret(resource, kubeconfig);
};

const generateConfigMap = () => {
  const resource: V1ConfigMap = {
    data: {
      my: "data"
    },
    binaryData: {
      my: "binary-data"
    }
  };
  const kubeconfig = new KubeConfig();
  return new ConfigMap(resource, kubeconfig);
};

const generateCustomResourceDefinition = () => {
  const resource: V1CustomResourceDefinition = {
    metadata: {
      annotations: {
        my: "annotation"
      }
    },
    spec: {
      names: {
        kind: "kind",
        plural: "plural"
      },
      group: "my-group",
      scope: "my-scope",
      versions: []
    }
  };
  const kubeconfig = new KubeConfig();
  return new CustomResourceDefinition(resource, kubeconfig);
};

const generateClusterRole = () => {
  const resource: V1ClusterRole = {
    kind: "my-kind",
    rules: [
      {
        verbs: ["my-verb"]
      }
    ],
    aggregationRule: {
      clusterRoleSelectors: [{ matchLabels: { some: "label" } }]
    },
    metadata: {
      annotations: {
        my: "annotation"
      },
      labels: {
        my: "label"
      },
      name: "my-name"
    }
  };
  const kubeconfig = new KubeConfig();
  return new ClusterRole(resource, kubeconfig);
};

describe("hasDeploymentChanged()", () => {
  it("should return false when spec matches", () => {
    const existing = generateDeployment();
    const desired = generateDeployment();

    expect(hasDeploymentChanged(desired, existing)).toBe(false);
  });

  it("should return true when strategy has changed", () => {
    const existing = generateDeployment();
    const desired = generateDeployment();

    desired.spec.spec!.strategy!.type = "Recreate";

    expect(hasDeploymentChanged(desired, existing)).toBe(true);
  });

  it("should return true when selector has changed", () => {
    const existing = generateDeployment();
    const desired = generateDeployment();

    desired.spec.spec!.selector!.matchLabels = {};

    expect(hasDeploymentChanged(desired, existing)).toBe(true);
  });
});

describe("hasSecretChanged()", () => {
  it("should return false when spec matches", () => {
    const existing = generateSecret();
    const desired = generateSecret();

    expect(hasSecretChanged(desired, existing)).toBe(false);
  });

  it("should return true when data has changed", () => {
    const existing = generateSecret();
    const desired = generateSecret();

    desired.spec!.data = { new: "data" };

    expect(hasSecretChanged(desired, existing)).toBe(true);
  });

  it("should return true when stringData has changed", () => {
    const existing = generateSecret();
    const desired = generateSecret();

    desired.spec!.stringData = { new: "string-data" };

    expect(hasSecretChanged(desired, existing)).toBe(true);
  });
});

describe("hasConfigMapChanged()", () => {
  it("should return false when spec matches", () => {
    const existing = generateConfigMap();
    const desired = generateConfigMap();

    expect(hasConfigMapChanged(desired, existing)).toBe(false);
  });

  it("should return true when data has changed", () => {
    const existing = generateConfigMap();
    const desired = generateConfigMap();

    desired.spec!.data = { new: "data" };

    expect(hasConfigMapChanged(desired, existing)).toBe(true);
  });

  it("should return true when binaryData has changed", () => {
    const existing = generateConfigMap();
    const desired = generateConfigMap();

    desired.spec!.binaryData = { new: "binary-data" };

    expect(hasConfigMapChanged(desired, existing)).toBe(true);
  });
});

describe("hasCustomResourceDefinitionChanged()", () => {
  it("should return false when spec matches", () => {
    const existing = generateCustomResourceDefinition();
    const desired = generateCustomResourceDefinition();

    expect(hasCustomResourceDefinitionChanged(desired, existing)).toBe(false);
  });

  it("should return true when annotations have changed", () => {
    const existing = generateCustomResourceDefinition();
    const desired = generateCustomResourceDefinition();

    desired.spec.metadata!.annotations = { new: "annotation" };

    expect(hasCustomResourceDefinitionChanged(desired, existing)).toBe(true);
  });
});

describe("hasClusterRoleChanged()", () => {
  it("should return false when spec matches", () => {
    const existing = generateClusterRole();
    const desired = generateClusterRole();

    expect(hasClusterRoleChanged(desired, existing)).toBe(false);
  });

  it("should return true when kind has changed", () => {
    const existing = generateClusterRole();
    const desired = generateClusterRole();

    desired.spec.kind = "new-kind";

    expect(hasClusterRoleChanged(desired, existing)).toBe(true);
  });

  it("should return true when rules have changed", () => {
    const existing = generateClusterRole();
    const desired = generateClusterRole();

    desired.spec.rules = [{ verbs: ["new-verb"] }];

    expect(hasClusterRoleChanged(desired, existing)).toBe(true);
  });

  it("should return true when aggregationRule has changed", () => {
    const existing = generateClusterRole();
    const desired = generateClusterRole();

    desired.spec.aggregationRule = {
      clusterRoleSelectors: []
    };

    expect(hasClusterRoleChanged(desired, existing)).toBe(true);
  });

  it("should return true when metadata.annotations has changed", () => {
    const existing = generateClusterRole();
    const desired = generateClusterRole();

    desired.spec.metadata!.annotations = { new: "annotations" };

    expect(hasClusterRoleChanged(desired, existing)).toBe(true);
  });

  it("should return true when metadata.annotations has changed", () => {
    const existing = generateClusterRole();
    const desired = generateClusterRole();

    desired.spec.metadata!.labels = { new: "label" };

    expect(hasClusterRoleChanged(desired, existing)).toBe(true);
  });

  it("should return true when metadata.name has changed", () => {
    const existing = generateClusterRole();
    const desired = generateClusterRole();

    desired.spec.metadata!.name = "new name";

    expect(hasClusterRoleChanged(desired, existing)).toBe(true);
  });
});
