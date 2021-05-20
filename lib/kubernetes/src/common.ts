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

// It may be worth it to fix proper typing for `any` later.
// Right now it may affect too much parts

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

import localVarRequest from "request";
import { KubeConfig, V1Status } from "@kubernetes/client-node";
import { BUILD_INFO } from "@opstrace/buildinfo";

export const OPSTRACE_MANAGED_KEY = "opstrace";
export const OPSTRACE_MANAGED_VERSION_KEY = "opstrace/version";
/**
 * ResourceCache represents a "actual" list of state as retrieved from k8s.
 */
export interface ResourceCache<T extends K8sResource> {
  loaded: boolean;
  error: Error | null;
  resources: T[];
}

export type ResourceList<T extends K8sResource> = T[];

/**
 * Resource represents a kubernetes object wrapped in an API.
 */
export interface Resource {
  create(): Promise<any>;
  read(): Promise<any>;
  update(): Promise<any>;
  delete(): Promise<any>;
}

/**
 * Adds new items to the existingItems and ensures no item exists more than once in the returned array.
 * New items replace existing items, when they represent the same K8sResource.
 * @param existingItems Existing array of resources
 * @param items New resources to be adde to existingItems
 */
export function union<T extends K8sResource>(
  existingItems: T[],
  items: T[]
): T[] {
  const map = new Map<string, T>();

  existingItems.forEach(existing =>
    map.set(`${existing.namespace}-${existing.name}`, existing)
  );
  items.forEach(newItem =>
    map.set(`${newItem.namespace}-${newItem.name}`, newItem)
  );

  return [...map.values()];
}

/**
 * isSameObject returns true if the two resources (a and b) reference the same kubernetes object
 * @param o1
 * @param o2
 */
export function isSameObject<T extends K8sResource>(o1: T, o2: T): boolean {
  return o1.name === o2.name && o1.namespace === o2.namespace;
}

/**
 * find K8sResource in a list of K8sResources. Returns undefined if not found.
 *
 * @param resource1
 * @param list
 */
export function find<T extends K8sResource>(
  resource1: T,
  list: T[]
): T | undefined {
  return list.find(resource2 => isSameObject(resource1, resource2));
}

/**
 * PromiseAllWithCatch is a helper function for wrapping an array of promises with a generic catch.
 *
 * @param errMsg message to prefix the error with
 * @param promises an array of promises
 */
export async function PromiseAllWithCatch(
  errMsg: string,
  promises: Array<Promise<Resource>>
): Promise<void | Resource[]> {
  return Promise.all(promises).catch(reason => {
    console.error(`${errMsg}: ${JSON.stringify(reason)}`);
  });
}

/**
 * ResourceCollection holds a collection of Resource objects
 */
export class ResourceCollection {
  protected resources: Array<K8sResource>;
  protected collections: Array<ResourceCollection>;
  constructor() {
    this.resources = [];
    this.collections = [];
  }
  add(obj: K8sResource | ResourceCollection): void {
    obj instanceof K8sResource
      ? this.resources.push(obj)
      : this.collections.push(obj);
  }
  get(): K8sResource[] {
    return this.collections
      .reduce((acc, collection) => {
        return acc.concat(collection.get());
      }, this.resources)
      .map(resource => {
        // don't override ownership if it's already set
        if (!resource.isProtected() && !resource.isImmutable()) {
          resource.setManagementOption({ protect: false });
        }
        return resource;
      });
  }
}

/**
 * K8sResource represents a Kubernetes resource.
 */
export class K8sResource implements Resource {
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  constructor(protected resource: any, protected kubeConfig: KubeConfig) {}
  get namespace(): string {
    return this.resource.metadata?.namespace || "default";
  }
  get name(): string {
    return this.resource.metadata?.name;
  }
  get annotations(): { [key: string]: string } {
    if (this.resource.metadata?.annotations) {
      return this.resource.metadata.annotations;
    }
    return {};
  }
  get labels(): { [key: string]: string } {
    if (this.resource.metadata?.labels) {
      return this.resource.metadata.labels;
    }
    return {};
  }
  create(): Promise<{ response: any; body: any }> {
    return Promise.resolve({ response: {}, body: {} });
  }
  read(): Promise<{ response: any; body: any }> {
    return Promise.resolve({ response: {}, body: {} });
  }
  update(): Promise<{ response: any; body: any }> {
    return Promise.resolve({ response: {}, body: {} });
  }
  delete(): Promise<{ response: any; body: any }> {
    return Promise.resolve({ response: {}, body: {} });
  }
  setManagementOption({ protect }: { protect?: boolean }): void {
    if (!this.resource.metadata.annotations) {
      this.resource.metadata.annotations = {};
    }
    this.resource.metadata.annotations[OPSTRACE_MANAGED_KEY] = protect
      ? "protected"
      : "owned";
  }
  setManagementVersion(): void {
    if (!this.resource.metadata.annotations) {
      this.resource.metadata.annotations = {};
    }
    this.resource.metadata.annotations[OPSTRACE_MANAGED_VERSION_KEY] =
      BUILD_INFO.VERSION_STRING;
  }
  setImmutable(): void {
    if (!this.resource.metadata.annotations) {
      this.resource.metadata.annotations = {};
    }
    this.resource.metadata.annotations[OPSTRACE_MANAGED_KEY] = "no-update";
  }
  isOurs(): boolean {
    return (
      OPSTRACE_MANAGED_KEY in this.annotations &&
      !this.resource.metadata.ownerReferences
    );
  }
  isProtected(): boolean {
    return (
      OPSTRACE_MANAGED_KEY in this.annotations &&
      this.annotations[OPSTRACE_MANAGED_KEY] === "protected"
    );
  }
  isImmutable(): boolean {
    return (
      OPSTRACE_MANAGED_KEY in this.annotations &&
      this.annotations[OPSTRACE_MANAGED_KEY] === "no-update"
    );
  }
  isTerminating(): boolean {
    return this.resource.metadata.deletionTimestamp !== undefined;
  }
}

const primitives = [
  "string",
  "boolean",
  "double",
  "integer",
  "long",
  "float",
  "number",
  "any"
];
const enumsMap: { [index: string]: any } = {};

const typeMap: { [index: string]: any } = {
  V1Status: V1Status
};
/**
 * From https://github.com/kubernetes-client/javascript/blob/master/src/gen/model/models.ts#L1835
 */
export class ObjectSerializer {
  public static findCorrectType(data: any, expectedType: string): string {
    if (data == undefined) {
      return expectedType;
    } else if (primitives.indexOf(expectedType.toLowerCase()) !== -1) {
      return expectedType;
    } else if (expectedType === "Date") {
      return expectedType;
    } else {
      if (enumsMap[expectedType]) {
        return expectedType;
      }

      if (!typeMap[expectedType]) {
        return expectedType; // w/e we don't know the type
      }

      // Check the discriminator
      const discriminatorProperty = typeMap[expectedType].discriminator;
      /* eslint-disable-next-line  */
      if (discriminatorProperty == null) {
        return expectedType; // the type does not have a discriminator. use it.
      } else {
        if (data[discriminatorProperty]) {
          const discriminatorType = data[discriminatorProperty];
          if (typeMap[discriminatorType]) {
            return discriminatorType; // use the type given in the discriminator
          } else {
            return expectedType; // discriminator did not map to a type
          }
        } else {
          return expectedType; // discriminator was not present (or an empty string)
        }
      }
    }
  }

  public static serialize(data: any, type: string) {
    /* eslint-disable-next-line  */
    if (data == undefined) {
      return data;
    } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
      return data;
    } else if (type.lastIndexOf("Array<", 0) === 0) {
      // string.startsWith pre es6
      let subType: string = type.replace("Array<", ""); // Array<Type> => Type>
      subType = subType.substring(0, subType.length - 1); // Type> => Type
      const transformedData: any[] = [];
      for (const index in data) {
        const date = data[index];
        transformedData.push(ObjectSerializer.serialize(date, subType));
      }
      return transformedData;
    } else if (type === "Date") {
      return data.toISOString();
    } else {
      if (enumsMap[type]) {
        return data;
      }
      if (!typeMap[type]) {
        // in case we dont know the type
        return data;
      }

      // Get the actual type of this object
      type = this.findCorrectType(data, type);

      // get the map for the correct type.
      const attributeTypes = typeMap[type].getAttributeTypeMap();
      const instance: { [index: string]: any } = {};
      for (const index in attributeTypes) {
        const attributeType = attributeTypes[index];
        instance[attributeType.baseName] = ObjectSerializer.serialize(
          data[attributeType.name],
          attributeType.type
        );
      }
      return instance;
    }
  }

  public static deserialize(data: any, type: string) {
    // polymorphism may change the actual type.
    type = ObjectSerializer.findCorrectType(data, type);
    /* eslint-disable-next-line  */
    if (data == undefined) {
      return data;
    } else if (primitives.indexOf(type.toLowerCase()) !== -1) {
      return data;
    } else if (type.lastIndexOf("Array<", 0) === 0) {
      // string.startsWith pre es6
      let subType: string = type.replace("Array<", ""); // Array<Type> => Type>
      subType = subType.substring(0, subType.length - 1); // Type> => Type
      const transformedData: any[] = [];
      for (const index in data) {
        const date = data[index];
        transformedData.push(ObjectSerializer.deserialize(date, subType));
      }
      return transformedData;
    } else if (type === "Date") {
      return new Date(data);
    } else {
      if (enumsMap[type]) {
        // is Enum
        return data;
      }

      if (!typeMap[type]) {
        // dont know the type
        return data;
      }
      const instance = new typeMap[type]();
      const attributeTypes = typeMap[type].getAttributeTypeMap();
      for (const index in attributeTypes) {
        const attributeType = attributeTypes[index];
        instance[attributeType.name] = ObjectSerializer.deserialize(
          data[attributeType.baseName],
          attributeType.type
        );
      }
      return instance;
    }
  }
}
/**
 * Taken from https://github.com/kubernetes-client/javascript/blob/master/src/gen/model/models.ts
 */
export interface Authentication {
  /**
   * Apply authentication settings to header and query params.
   */
  applyToRequest(requestOptions: localVarRequest.Options): Promise<void> | void;
}
/**
 * Taken from https://github.com/kubernetes-client/javascript/blob/master/src/gen/model/models.ts
 */
export class HttpBasicAuth implements Authentication {
  public username = "";
  public password = "";

  applyToRequest(requestOptions: localVarRequest.Options): void {
    requestOptions.auth = {
      username: this.username,
      password: this.password
    };
  }
}
/**
 * Taken from https://github.com/kubernetes-client/javascript/blob/master/src/gen/model/models.ts
 */
export class ApiKeyAuth implements Authentication {
  public apiKey = "";

  constructor(private location: string, private paramName: string) {}

  applyToRequest(requestOptions: localVarRequest.Options): void {
    /* eslint-disable-next-line */
    if (this.location == "query") {
      /* eslint-disable-next-line */
      (<any>requestOptions.qs)[this.paramName] = this.apiKey;
    } else if (
      /* eslint-disable-next-line */
      this.location == "header" &&
      requestOptions &&
      requestOptions.headers
    ) {
      requestOptions.headers[this.paramName] = this.apiKey;
    }
  }
}
/**
 * Taken from https://github.com/kubernetes-client/javascript/blob/master/src/gen/model/models.ts
 */
export class OAuth implements Authentication {
  public accessToken = "";

  applyToRequest(requestOptions: localVarRequest.Options): void {
    if (requestOptions && requestOptions.headers) {
      requestOptions.headers["Authorization"] = "Bearer " + this.accessToken;
    }
  }
}
/**
 * Taken from https://github.com/kubernetes-client/javascript/blob/master/src/gen/model/models.ts
 */
export class VoidAuth implements Authentication {
  public username = "";
  public password = "";

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  applyToRequest(_: localVarRequest.Options): void {
    // Do nothing
  }
}
