/* eslint-disable */
import localVarRequest from "request";
import { Request } from "request";
import {
  createReducer,
  createAsyncAction,
  ActionType,
  createAction
} from "typesafe-actions";
import {
  ApiKeyAuth,
  Authentication,
  ObjectSerializer,
  K8sResource,
  isSameObject,
  ResourceCache,
  VoidAuth
} from "../common";
import { IncomingMessage } from "http";
import {
  V1Status,
  V1ListMeta,
  KubeConfig,
  Watch,
  Interceptor
} from "@kubernetes/client-node";
import { log } from "@opstrace/utils";

// ===============================================
// This file is autogenerated - Please do not edit
// ===============================================

/* tslint:disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Probe defines monitoring for a set of static targets or ingresses.
 */
export interface V1Probe {
  /**
   * APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources
   */
  apiVersion?: string;
  /**
   * Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds
   */
  kind?: string;
  metadata?: {
    [k: string]: any;
  };
  /**
   * Specification of desired Ingress selection for target discovery by Prometheus.
   */
  spec: {
    /**
     * Interval at which targets are probed using the configured prober. If not specified Prometheus' global scrape interval is used.
     */
    interval?: string;
    /**
     * The job name assigned to scraped metrics by default.
     */
    jobName?: string;
    /**
     * The module to use for probing specifying how to probe the target. Example module configuring in the blackbox exporter: https://github.com/prometheus/blackbox_exporter/blob/master/example.yml
     */
    module?: string;
    /**
     * Specification for the prober to use for probing targets. The prober.URL parameter is required. Targets cannot be probed if left empty.
     */
    prober?: {
      /**
       * Path to collect metrics from. Defaults to `/probe`.
       */
      path?: string;
      /**
       * HTTP scheme to use for scraping. Defaults to `http`.
       */
      scheme?: string;
      /**
       * Mandatory URL of the prober.
       */
      url: string;
      [k: string]: any;
    };
    /**
     * Timeout for scraping metrics from the Prometheus exporter.
     */
    scrapeTimeout?: string;
    /**
     * Targets defines a set of static and/or dynamically discovered targets to be probed using the prober.
     */
    targets?: {
      /**
       * Ingress defines the set of dynamically discovered ingress objects which hosts are considered for probing.
       */
      ingress?: {
        /**
         * Select Ingress objects by namespace.
         */
        namespaceSelector?: {
          /**
           * Boolean describing whether all namespaces are selected in contrast to a list restricting them.
           */
          any?: boolean;
          /**
           * List of namespace names.
           */
          matchNames?: string[];
          [k: string]: any;
        };
        /**
         * RelabelConfigs to apply to samples before ingestion. More info: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config
         */
        relabelingConfigs?: {
          /**
           * Action to perform based on regex matching. Default is 'replace'
           */
          action?: string;
          /**
           * Modulus to take of the hash of the source label values.
           */
          modulus?: number;
          /**
           * Regular expression against which the extracted value is matched. Default is '(.*)'
           */
          regex?: string;
          /**
           * Replacement value against which a regex replace is performed if the regular expression matches. Regex capture groups are available. Default is '$1'
           */
          replacement?: string;
          /**
           * Separator placed between concatenated source label values. default is ';'.
           */
          separator?: string;
          /**
           * The source labels select values from existing labels. Their content is concatenated using the configured separator and matched against the configured regular expression for the replace, keep, and drop actions.
           */
          sourceLabels?: string[];
          /**
           * Label to which the resulting value is written in a replace action. It is mandatory for replace actions. Regex capture groups are available.
           */
          targetLabel?: string;
          [k: string]: any;
        }[];
        /**
         * Select Ingress objects by labels.
         */
        selector?: {
          /**
           * matchExpressions is a list of label selector requirements. The requirements are ANDed.
           */
          matchExpressions?: {
            /**
             * key is the label key that the selector applies to.
             */
            key: string;
            /**
             * operator represents a key's relationship to a set of values. Valid operators are In, NotIn, Exists and DoesNotExist.
             */
            operator: string;
            /**
             * values is an array of string values. If the operator is In or NotIn, the values array must be non-empty. If the operator is Exists or DoesNotExist, the values array must be empty. This array is replaced during a strategic merge patch.
             */
            values?: string[];
            [k: string]: any;
          }[];
          /**
           * matchLabels is a map of {key,value} pairs. A single {key,value} in the matchLabels map is equivalent to an element of matchExpressions, whose key field is "key", the operator is "In", and the values array contains only "value". The requirements are ANDed.
           */
          matchLabels?: {
            [k: string]: string;
          };
          [k: string]: any;
        };
        [k: string]: any;
      };
      /**
       * StaticConfig defines static targets which are considers for probing. More info: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#static_config.
       */
      staticConfig?: {
        /**
         * Labels assigned to all metrics scraped from the targets.
         */
        labels?: {
          [k: string]: string;
        };
        /**
         * Targets is a list of URLs to probe using the configured prober.
         */
        static?: string[];
        [k: string]: any;
      };
      [k: string]: any;
    };
    [k: string]: any;
  };
  [k: string]: any;
}

export interface V1ProbeList {
  /**
   * APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#resources
   */
  apiVersion?: string;
  /**
   * Items is the list of ControllerRevisions
   */
  items: Array<V1Probe>;
  /**
   * Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/api-conventions.md#types-kinds
   */
  kind?: string;
  metadata?: V1ListMeta;
}

let defaultBasePath = "http://localhost";

export enum V1ProbeApiApiKeys {
  BearerToken
}

export class V1ProbeApi {
  protected _basePath = defaultBasePath;
  protected _defaultHeaders: any = {};
  protected _useQuerystring: boolean = false;

  protected authentications = {
    default: <Authentication>new VoidAuth(),
    BearerToken: new ApiKeyAuth("header", "authorization")
  };

  protected interceptors: Interceptor[] = [];

  constructor(basePath?: string);
  constructor(
    basePathOrUsername: string,
    password?: string,
    basePath?: string
  ) {
    if (password) {
      if (basePath) {
        this.basePath = basePath;
      }
    } else {
      if (basePathOrUsername) {
        this.basePath = basePathOrUsername;
      }
    }
  }

  set useQuerystring(value: boolean) {
    this._useQuerystring = value;
  }

  set basePath(basePath: string) {
    this._basePath = basePath;
  }

  set defaultHeaders(defaultHeaders: any) {
    this._defaultHeaders = defaultHeaders;
  }

  get defaultHeaders() {
    return this._defaultHeaders;
  }

  get basePath() {
    return this._basePath;
  }

  public setDefaultAuthentication(auth: Authentication) {
    this.authentications.default = auth;
  }

  public setApiKey(key: V1ProbeApiApiKeys, value: string) {
    (this.authentications as any)[V1ProbeApiApiKeys[key]].apiKey = value;
  }

  public addInterceptor(interceptor: Interceptor) {
    this.interceptors.push(interceptor);
  }

  /**
   * create a V1Probe
   * @param namespace object name and auth scope, such as for teams and projects
   * @param body
   * @param includeUninitialized If true, partially initialized resources are included in the response.
   * @param pretty If &#39;true&#39;, then the output is pretty printed.
   * @param dryRun When present, indicates that modifications should not be persisted. An invalid or unrecognized dryRun directive will result in an error response and no further processing of the request. Valid values are: - All: all dry run stages will be processed
   */
  public async createNamespacedV1Probe(
    namespace: string,
    body: V1Probe,
    includeUninitialized?: boolean,
    pretty?: string,
    dryRun?: string,
    options: { headers: { [name: string]: string } } = { headers: {} }
  ): Promise<{ response: IncomingMessage; body: V1Probe }> {
    const localVarPath =
      this.basePath +
      "/apis/monitoring.coreos.com/v1/namespaces/{namespace}/probes".replace(
        "{" + "namespace" + "}",
        encodeURIComponent(String(namespace))
      );
    let localVarQueryParameters: any = {};
    let localVarHeaderParams: any = (<any>Object).assign(
      {},
      this.defaultHeaders
    );
    let localVarFormParams: any = {};

    // verify required parameter 'namespace' is not null or undefined
    if (namespace === null || namespace === undefined) {
      throw new Error(
        "Required parameter namespace was null or undefined when calling createNamespacedV1Probe."
      );
    }

    // verify required parameter 'body' is not null or undefined
    if (body === null || body === undefined) {
      throw new Error(
        "Required parameter body was null or undefined when calling createNamespacedV1Probe."
      );
    }

    if (includeUninitialized !== undefined) {
      localVarQueryParameters["includeUninitialized"] = includeUninitialized;
    }

    if (pretty !== undefined) {
      localVarQueryParameters["pretty"] = pretty;
    }

    if (dryRun !== undefined) {
      localVarQueryParameters["dryRun"] = dryRun;
    }

    (<any>Object).assign(localVarHeaderParams, options.headers);

    let localVarUseFormData = false;

    let localVarRequestOptions: localVarRequest.Options = {
      method: "POST",
      qs: localVarQueryParameters,
      headers: localVarHeaderParams,
      uri: localVarPath,
      useQuerystring: this._useQuerystring,
      json: true,
      body: body
    };

    let authenticationPromise = Promise.resolve();
    authenticationPromise = authenticationPromise.then(() =>
      this.authentications.BearerToken.applyToRequest(localVarRequestOptions)
    );

    authenticationPromise = authenticationPromise.then(() =>
      this.authentications.default.applyToRequest(localVarRequestOptions)
    );
    return authenticationPromise.then(() => {
      if (Object.keys(localVarFormParams).length) {
        if (localVarUseFormData) {
          (<any>localVarRequestOptions).formData = localVarFormParams;
        } else {
          localVarRequestOptions.form = localVarFormParams;
        }
      }
      return new Promise<{ response: IncomingMessage; body: V1Probe }>(
        (resolve, reject) => {
          localVarRequest(localVarRequestOptions, (error, response, body) => {
            if (error) {
              reject(error);
            } else {
              if (
                response.statusCode &&
                response.statusCode >= 200 &&
                response.statusCode <= 299
              ) {
                resolve({ response: response, body: body });
              } else {
                reject({ response: response, body: body });
              }
            }
          });
        }
      );
    });
  }

  /**
   * read the specified V1Probe
   * @param name name of the V1Probe
   * @param namespace object name and auth scope, such as for teams and projects
   * @param pretty If &#39;true&#39;, then the output is pretty printed.
   * @param exact Should the export be exact.  Exact export maintains cluster-specific fields like &#39;Namespace&#39;.
   * @param _export Should this value be exported.  Export strips fields that a user can not specify.
   */
  public async readNamespacedV1Probe(
    name: string,
    namespace: string,
    pretty?: string,
    exact?: boolean,
    _export?: boolean,
    options: { headers: { [name: string]: string } } = { headers: {} }
  ): Promise<{ response: IncomingMessage; body: V1Probe }> {
    const localVarPath =
      this.basePath +
      "/apis/monitoring.coreos.com/v1/namespaces/{namespace}/probes/{name}"
        .replace("{" + "name" + "}", encodeURIComponent(String(name)))
        .replace(
          "{" + "namespace" + "}",
          encodeURIComponent(String(namespace))
        );
    let localVarQueryParameters: any = {};
    let localVarHeaderParams: any = (<any>Object).assign(
      {},
      this.defaultHeaders
    );
    let localVarFormParams: any = {};

    // verify required parameter 'name' is not null or undefined
    if (name === null || name === undefined) {
      throw new Error(
        "Required parameter name was null or undefined when calling readNamespacedV1Probe."
      );
    }

    // verify required parameter 'namespace' is not null or undefined
    if (namespace === null || namespace === undefined) {
      throw new Error(
        "Required parameter namespace was null or undefined when calling readNamespacedV1Probe."
      );
    }

    if (pretty !== undefined) {
      localVarQueryParameters["pretty"] = pretty;
    }

    if (exact !== undefined) {
      localVarQueryParameters["exact"] = exact;
    }

    if (_export !== undefined) {
      localVarQueryParameters["export"] = _export;
    }

    (<any>Object).assign(localVarHeaderParams, options.headers);

    let localVarUseFormData = false;

    let localVarRequestOptions: localVarRequest.Options = {
      method: "GET",
      qs: localVarQueryParameters,
      headers: localVarHeaderParams,
      uri: localVarPath,
      useQuerystring: this._useQuerystring,
      json: true
    };

    let authenticationPromise = Promise.resolve();
    authenticationPromise = authenticationPromise.then(() =>
      this.authentications.BearerToken.applyToRequest(localVarRequestOptions)
    );

    authenticationPromise = authenticationPromise.then(() =>
      this.authentications.default.applyToRequest(localVarRequestOptions)
    );
    return authenticationPromise.then(() => {
      if (Object.keys(localVarFormParams).length) {
        if (localVarUseFormData) {
          (<any>localVarRequestOptions).formData = localVarFormParams;
        } else {
          localVarRequestOptions.form = localVarFormParams;
        }
      }
      return new Promise<{ response: IncomingMessage; body: V1Probe }>(
        (resolve, reject) => {
          localVarRequest(localVarRequestOptions, (error, response, body) => {
            if (error) {
              reject(error);
            } else {
              if (
                response.statusCode &&
                response.statusCode >= 200 &&
                response.statusCode <= 299
              ) {
                resolve({ response: response, body: body });
              } else {
                reject({ response: response, body: body });
              }
            }
          });
        }
      );
    });
  }

  /**
   * partially update the specified V1Probe
   * @param name name of the V1Probe
   * @param namespace object name and auth scope, such as for teams and projects
   * @param body
   * @param pretty If &#39;true&#39;, then the output is pretty printed.
   * @param dryRun When present, indicates that modifications should not be persisted. An invalid or unrecognized dryRun directive will result in an error response and no further processing of the request. Valid values are: - All: all dry run stages will be processed
   */
  public async patchNamespacedV1Probe(
    name: string,
    namespace: string,
    body: object,
    pretty?: string,
    dryRun?: string,
    options: { headers: { [name: string]: string } } = { headers: {} }
  ): Promise<{ response: IncomingMessage; body: V1Probe }> {
    const localVarPath =
      this.basePath +
      "/apis/monitoring.coreos.com/v1/namespaces/{namespace}/probes/{name}"
        .replace("{" + "name" + "}", encodeURIComponent(String(name)))
        .replace(
          "{" + "namespace" + "}",
          encodeURIComponent(String(namespace))
        );
    let localVarQueryParameters: any = {};
    let localVarHeaderParams: any = (<any>Object).assign(
      {},
      this.defaultHeaders
    );
    let localVarFormParams: any = {};

    // verify required parameter 'name' is not null or undefined
    if (name === null || name === undefined) {
      throw new Error(
        "Required parameter name was null or undefined when calling patchNamespacedV1Probe."
      );
    }

    // verify required parameter 'namespace' is not null or undefined
    if (namespace === null || namespace === undefined) {
      throw new Error(
        "Required parameter namespace was null or undefined when calling patchNamespacedV1Probe."
      );
    }

    // verify required parameter 'body' is not null or undefined
    if (body === null || body === undefined) {
      throw new Error(
        "Required parameter body was null or undefined when calling patchNamespacedV1Probe."
      );
    }

    if (pretty !== undefined) {
      localVarQueryParameters["pretty"] = pretty;
    }

    if (dryRun !== undefined) {
      localVarQueryParameters["dryRun"] = dryRun;
    }

    (<any>Object).assign(localVarHeaderParams, options.headers);

    let localVarUseFormData = false;

    let localVarRequestOptions: localVarRequest.Options = {
      method: "PATCH",
      qs: localVarQueryParameters,
      headers: localVarHeaderParams,
      uri: localVarPath,
      useQuerystring: this._useQuerystring,
      json: true,
      body: body
    };

    let authenticationPromise = Promise.resolve();
    authenticationPromise = authenticationPromise.then(() =>
      this.authentications.BearerToken.applyToRequest(localVarRequestOptions)
    );

    authenticationPromise = authenticationPromise.then(() =>
      this.authentications.default.applyToRequest(localVarRequestOptions)
    );
    return authenticationPromise.then(() => {
      if (Object.keys(localVarFormParams).length) {
        if (localVarUseFormData) {
          (<any>localVarRequestOptions).formData = localVarFormParams;
        } else {
          localVarRequestOptions.form = localVarFormParams;
        }
      }
      return new Promise<{ response: IncomingMessage; body: V1Probe }>(
        (resolve, reject) => {
          localVarRequest(localVarRequestOptions, (error, response, body) => {
            if (error) {
              reject(error);
            } else {
              if (
                response.statusCode &&
                response.statusCode >= 200 &&
                response.statusCode <= 299
              ) {
                resolve({ response: response, body: body });
              } else {
                reject({ response: response, body: body });
              }
            }
          });
        }
      );
    });
  }

  /**
   * delete a V1Probe
   * @param name name of the V1Probe
   * @param namespace object name and auth scope, such as for teams and projects
   * @param pretty If &#39;true&#39;, then the output is pretty printed.
   * @param dryRun When present, indicates that modifications should not be persisted. An invalid or unrecognized dryRun directive will result in an error response and no further processing of the request. Valid values are: - All: all dry run stages will be processed
   * @param gracePeriodSeconds The duration in seconds before the object should be deleted. Value must be non-negative integer. The value zero indicates delete immediately. If this value is nil, the default grace period for the specified type will be used. Defaults to a per object value if not specified. zero means delete immediately.
   * @param orphanDependents Deprecated: please use the PropagationPolicy, this field will be deprecated in 1.7. Should the dependent objects be orphaned. If true/false, the &quot;orphan&quot; finalizer will be added to/removed from the object&#39;s finalizers list. Either this field or PropagationPolicy may be set, but not both.
   * @param propagationPolicy Whether and how garbage collection will be performed. Either this field or OrphanDependents may be set, but not both. The default policy is decided by the existing finalizer set in the metadata.finalizers and the resource-specific default policy. Acceptable values are: &#39;Orphan&#39; - orphan the dependents; &#39;Background&#39; - allow the garbage collector to delete the dependents in the background; &#39;Foreground&#39; - a cascading policy that deletes all dependents in the foreground.
   * @param body
   */
  public async deleteNamespacedV1Probe(
    name: string,
    namespace: string,
    pretty?: string,
    dryRun?: string,
    gracePeriodSeconds?: number,
    orphanDependents?: boolean,
    propagationPolicy?: string,
    body?: any,
    options: { headers: { [name: string]: string } } = { headers: {} }
  ): Promise<{ response: IncomingMessage; body: V1Status }> {
    const localVarPath =
      this.basePath +
      "/apis/monitoring.coreos.com/v1/namespaces/{namespace}/probes/{name}"
        .replace("{" + "name" + "}", encodeURIComponent(String(name)))
        .replace(
          "{" + "namespace" + "}",
          encodeURIComponent(String(namespace))
        );
    let localVarQueryParameters: any = {};
    let localVarHeaderParams: any = (<any>Object).assign(
      {},
      this.defaultHeaders
    );
    let localVarFormParams: any = {};

    // verify required parameter 'name' is not null or undefined
    if (name === null || name === undefined) {
      throw new Error(
        "Required parameter name was null or undefined when calling deleteNamespacedV1Probe."
      );
    }

    // verify required parameter 'namespace' is not null or undefined
    if (namespace === null || namespace === undefined) {
      throw new Error(
        "Required parameter namespace was null or undefined when calling deleteNamespacedV1Probe."
      );
    }

    if (pretty !== undefined) {
      localVarQueryParameters["pretty"] = pretty;
    }

    if (dryRun !== undefined) {
      localVarQueryParameters["dryRun"] = dryRun;
    }

    if (gracePeriodSeconds !== undefined) {
      localVarQueryParameters["gracePeriodSeconds"] = gracePeriodSeconds;
    }

    if (orphanDependents !== undefined) {
      localVarQueryParameters["orphanDependents"] = orphanDependents;
    }

    if (propagationPolicy !== undefined) {
      localVarQueryParameters["propagationPolicy"] = propagationPolicy;
    }

    (<any>Object).assign(localVarHeaderParams, options.headers);

    let localVarUseFormData = false;

    let localVarRequestOptions: localVarRequest.Options = {
      method: "DELETE",
      qs: localVarQueryParameters,
      headers: localVarHeaderParams,
      uri: localVarPath,
      useQuerystring: this._useQuerystring,
      json: true,
      body: {}
    };

    let authenticationPromise = Promise.resolve();
    authenticationPromise = authenticationPromise.then(() =>
      this.authentications.BearerToken.applyToRequest(localVarRequestOptions)
    );

    authenticationPromise = authenticationPromise.then(() =>
      this.authentications.default.applyToRequest(localVarRequestOptions)
    );
    return authenticationPromise.then(() => {
      if (Object.keys(localVarFormParams).length) {
        if (localVarUseFormData) {
          (<any>localVarRequestOptions).formData = localVarFormParams;
        } else {
          localVarRequestOptions.form = localVarFormParams;
        }
      }
      return new Promise<{ response: IncomingMessage; body: V1Status }>(
        (resolve, reject) => {
          localVarRequest(localVarRequestOptions, (error, response, body) => {
            if (error) {
              reject(error);
            } else {
              body = ObjectSerializer.deserialize(body, "V1Status");
              if (
                response.statusCode &&
                response.statusCode >= 200 &&
                response.statusCode <= 299
              ) {
                resolve({ response: response, body: body });
              } else {
                reject({ response: response, body: body });
              }
            }
          });
        }
      );
    });
  }

  /**
   * list or watch objects of kind V1Probe
   * @param allowWatchBookmarks allowWatchBookmarks requests watch events with type &quot;BOOKMARK&quot;. Servers that do not implement bookmarks may ignore this flag and bookmarks are sent at the server&#39;s discretion. Clients should not assume bookmarks are returned at any specific interval, nor may they assume the server will send any BOOKMARK event during a session. If this is not a watch, this field is ignored. If the feature gate WatchBookmarks is not enabled in apiserver, this field is ignored.  This field is alpha and can be changed or removed without notice.
   * @param _continue The continue option should be set when retrieving more results from the server. Since this value is server defined, clients may only use the continue value from a previous query result with identical query parameters (except for the value of continue) and the server may reject a continue value it does not recognize. If the specified continue value is no longer valid whether due to expiration (generally five to fifteen minutes) or a configuration change on the server, the server will respond with a 410 ResourceExpired error together with a continue token. If the client needs a consistent list, it must restart their list without the continue field. Otherwise, the client may send another list request with the token received with the 410 error, the server will respond with a list starting from the next key, but from the latest snapshot, which is inconsistent from the previous list results - objects that are created, modified, or deleted after the first list request will be included in the response, as long as their keys are after the &quot;next key&quot;.  This field is not supported when watch is true. Clients may start a watch from the last resourceVersion value returned by the server and not miss any modifications.
   * @param fieldSelector A selector to restrict the list of returned objects by their fields. Defaults to everything.
   * @param labelSelector A selector to restrict the list of returned objects by their labels. Defaults to everything.
   * @param limit limit is a maximum number of responses to return for a list call. If more items exist, the server will set the &#x60;continue&#x60; field on the list metadata to a value that can be used with the same initial query to retrieve the next set of results. Setting a limit may return fewer than the requested amount of items (up to zero items) in the event all requested objects are filtered out and clients should only use the presence of the continue field to determine whether more results are available. Servers may choose not to support the limit argument and will return all of the available results. If limit is specified and the continue field is empty, clients may assume that no more results are available. This field is not supported if watch is true.  The server guarantees that the objects returned when using continue will be identical to issuing a single list call without a limit - that is, no objects created, modified, or deleted after the first request is issued will be included in any subsequent continued requests. This is sometimes referred to as a consistent snapshot, and ensures that a client that is using limit to receive smaller chunks of a very large result can ensure they see all possible objects. If objects are updated during a chunked list the version of the object that was present at the time the first list result was calculated is returned.
   * @param pretty If &#39;true&#39;, then the output is pretty printed.
   * @param resourceVersion When specified with a watch call, shows changes that occur after that particular version of a resource. Defaults to changes from the beginning of history. When specified for list: - if unset, then the result is returned from remote storage based on quorum-read flag; - if it&#39;s 0, then we simply return what we currently have in cache, no guarantee; - if set to non zero, then the result is at least as fresh as given rv.
   * @param timeoutSeconds Timeout for the list/watch call. This limits the duration of the call, regardless of any activity or inactivity.
   * @param watch Watch for changes to the described resources and return them as a stream of add, update, and remove notifications. Specify resourceVersion.
   */
  public async listV1ProbeForAllNamespaces(
    allowWatchBookmarks?: boolean,
    _continue?: string,
    fieldSelector?: string,
    labelSelector?: string,
    limit?: number,
    pretty?: string,
    resourceVersion?: string,
    timeoutSeconds?: number,
    watch?: boolean,
    options: { headers: { [name: string]: string } } = { headers: {} }
  ): Promise<{ response: IncomingMessage; body: V1ProbeList }> {
    const localVarPath =
      this.basePath + "/apis/monitoring.coreos.com/v1/probes";
    let localVarQueryParameters: any = {};
    let localVarHeaderParams: any = (<any>Object).assign(
      {},
      this.defaultHeaders
    );
    let localVarFormParams: any = {};

    if (allowWatchBookmarks !== undefined) {
      localVarQueryParameters["allowWatchBookmarks"] = allowWatchBookmarks;
    }

    if (_continue !== undefined) {
      localVarQueryParameters["continue"] = _continue;
    }

    if (fieldSelector !== undefined) {
      localVarQueryParameters["fieldSelector"] = fieldSelector;
    }

    if (labelSelector !== undefined) {
      localVarQueryParameters["labelSelector"] = labelSelector;
    }

    if (limit !== undefined) {
      localVarQueryParameters["limit"] = limit;
    }

    if (pretty !== undefined) {
      localVarQueryParameters["pretty"] = pretty;
    }

    if (resourceVersion !== undefined) {
      localVarQueryParameters["resourceVersion"] = resourceVersion;
    }

    if (timeoutSeconds !== undefined) {
      localVarQueryParameters["timeoutSeconds"] = timeoutSeconds;
    }

    if (watch !== undefined) {
      localVarQueryParameters["watch"] = watch;
    }

    (<any>Object).assign(localVarHeaderParams, options.headers);

    let localVarUseFormData = false;

    let localVarRequestOptions: localVarRequest.Options = {
      method: "GET",
      qs: localVarQueryParameters,
      headers: localVarHeaderParams,
      uri: localVarPath,
      useQuerystring: this._useQuerystring,
      json: true
    };

    let authenticationPromise = Promise.resolve();
    authenticationPromise = authenticationPromise.then(() =>
      this.authentications.BearerToken.applyToRequest(localVarRequestOptions)
    );

    authenticationPromise = authenticationPromise.then(() =>
      this.authentications.default.applyToRequest(localVarRequestOptions)
    );
    return authenticationPromise.then(() => {
      if (Object.keys(localVarFormParams).length) {
        if (localVarUseFormData) {
          (<any>localVarRequestOptions).formData = localVarFormParams;
        } else {
          localVarRequestOptions.form = localVarFormParams;
        }
      }
      return new Promise<{ response: IncomingMessage; body: V1ProbeList }>(
        (resolve, reject) => {
          localVarRequest(localVarRequestOptions, (error, response, body) => {
            if (error) {
              reject(error);
            } else {
              if (
                response.statusCode &&
                response.statusCode >= 200 &&
                response.statusCode <= 299
              ) {
                resolve({ response: response, body: body });
              } else {
                reject({ response: response, body: body });
              }
            }
          });
        }
      );
    });
  }
}

export type V1ProbeResourceType = V1ProbeResource;
export type V1ProbeResources = V1ProbeResourceType[];

export const isV1ProbeResource = <(r: K8sResource) => r is V1ProbeResourceType>(
  (resource => resource instanceof V1ProbeResource)
);

export const V1ProbeActions = {
  fetch: createAsyncAction(
    "FETCH_K8S_V1PROBES_REQUEST",
    "FETCH_K8S_V1PROBES_SUCCESS",
    "FETCH_K8S_V1PROBES_FAILURE"
  )<{}, { resources: V1ProbeResources }, { error: Error }>(),
  onUpdated: createAction("ON_UPDATED_K8S_V1PROBE")<V1ProbeResourceType>(),
  onAdded: createAction("ON_ADDED_K8S_V1PROBE")<V1ProbeResourceType>(),
  onDestroyed: createAction("ON_DESTROYED_K8S_V1PROBE")<V1ProbeResourceType>()
};
export type V1ProbeResourceActions = ActionType<typeof V1ProbeActions>;
export interface V1ProbeResourceState
  extends ResourceCache<V1ProbeResourceType> {}

const initialState: V1ProbeResourceState = {
  loaded: false,
  error: null,
  resources: []
};

export const V1ProbeReducer = createReducer<
  V1ProbeResourceState,
  V1ProbeResourceActions
>(initialState)
  .handleAction(
    V1ProbeActions.fetch.request,
    (state, _): V1ProbeResourceState => ({
      ...state,
      loaded: false
    })
  )
  .handleAction(
    V1ProbeActions.fetch.success,
    (state, action): V1ProbeResourceState => ({
      ...state,
      ...action.payload,
      error: null,
      loaded: true
    })
  )
  .handleAction(
    V1ProbeActions.fetch.failure,
    (state, action): V1ProbeResourceState => ({
      ...state,
      ...action.payload,
      loaded: false
    })
  )
  .handleAction(
    [V1ProbeActions.onUpdated, V1ProbeActions.onAdded],
    (state, action): V1ProbeResourceState => ({
      ...state,
      resources: [
        ...state.resources.filter(s => !isSameObject(s, action.payload)),
        action.payload
      ]
    })
  )
  .handleAction(
    V1ProbeActions.onDestroyed,
    (state, action): V1ProbeResourceState => ({
      ...state,
      resources: state.resources.filter(s => !isSameObject(s, action.payload))
    })
  );

export class V1ProbeResource extends K8sResource {
  protected api: V1ProbeApi;
  protected resource: V1Probe;

  constructor(resource: V1Probe, kubeConfig: KubeConfig) {
    super(resource, kubeConfig);

    this.resource = resource;
    this.api = kubeConfig.makeApiClient(V1ProbeApi);
  }
  get spec(): V1Probe {
    return this.resource;
  }
  static startInformer(
    kubeConfig: KubeConfig,
    channel: (input: unknown) => void
  ): () => void {
    const client = kubeConfig.makeApiClient(V1ProbeApi);
    let cancelled = false;
    let request: Request;
    const watch = async () => {
      if (cancelled) {
        return;
      }
      try {
        const res = await client.listV1ProbeForAllNamespaces();
        channel(
          V1ProbeActions.fetch.success({
            resources: res.body.items.map(
              r => new V1ProbeResource(r, kubeConfig)
            )
          })
        );
      } catch (error) {
        channel(V1ProbeActions.fetch.failure({ error }));
        log.warning("starting informer failed (will retry):  %s", error);
        return setTimeout(watch, 3000);
      }
      const informer = new Watch(kubeConfig);
      const watchHandler = (phase: string, obj: V1Probe) => {
        switch (phase) {
          case "ADDED":
            channel(
              V1ProbeActions.onAdded(new V1ProbeResource(obj, kubeConfig))
            );
            break;
          case "MODIFIED":
            channel(
              V1ProbeActions.onUpdated(new V1ProbeResource(obj, kubeConfig))
            );
            break;
          case "DELETED":
            channel(
              V1ProbeActions.onDestroyed(new V1ProbeResource(obj, kubeConfig))
            );
            break;
        }
      };
      request = await informer.watch(
        "/apis/monitoring.coreos.com/v1/probes",
        { resourceVersion: undefined },
        watchHandler,
        watch
      );
      return request;
    };
    watch();
    // Return a function to disable the informer and close the request
    return () => {
      cancelled = true;
      request && request.abort();
    };
  }
  create(): Promise<{
    response: IncomingMessage;
    body: V1Probe;
  }> {
    return this.api.createNamespacedV1Probe(this.namespace, this.resource);
  }
  read(): Promise<{
    response: IncomingMessage;
    body: V1Probe;
  }> {
    return this.api.readNamespacedV1Probe(this.name, this.namespace);
  }
  update(): Promise<{
    response: IncomingMessage;
    body: V1Probe;
  }> {
    return this.api.patchNamespacedV1Probe(
      this.name,
      this.namespace,
      this.resource,
      undefined,
      undefined,
      { headers: { "Content-Type": "application/merge-patch+json" } }
    );
  }
  delete(): Promise<{
    response: IncomingMessage;
    body: V1Status;
  }> {
    return this.api.deleteNamespacedV1Probe(this.name, this.namespace);
  }
}
