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

import { log, sleep, mtimeDiffSeconds, mtime } from "@opstrace/utils";

import { getWaitTimeSeconds } from "./util";
import { AWSApiError } from "./types";

type DestroyCheckResultType = Promise<true | string>;
type TryDestroyResultType = Promise<void>;

export abstract class AWSResource<
  CheckCreateSuccessType,
  SetupParameterType = void
> {
  /*
    Represents a cloud resource or a small set of cloud resources.

    Implements a setup loop and a teardown loop, both trying forever to either
    create (set up) or destroy (tear down) the entity/entities in question.

    Is an abstract class: needs to be extended by a child class for
    implementing the business logic for a specific kind of cloud resource.

    A key ingredient in both control loops is centralized handling of AWS API
    errors (with the default action being: log, but ignore). The paradigm here
    is to retry all AWS API errors (including seemingly non-retryable errors
    such as dependency errors, not-found-style errors, already-exists-style
    errors, validation errors) as well as transient errors until a definite
    exit (success) criterion is met (which might never be reached, which is why
    the setup and teardown loops need to be timeout-supervised).

    When orchestrating a complex set of AWS cloud resources with various
    inter-dependencies, the spectrum of AWS API errors that might be returned
    by AWS is broad; much broader than might initially be obvious. In
    particular, it might include even seeminly non-retryable errors and obvious
    false-negative errors (such as an AuthFailure -- see
    opstrace-prelaunch/issues/1081 -- and various 400 'bad
    request' errors). In cases like this, despite the putative
    non-retryability, retrying the *same* request often times yields the
    desired outcome. One reason to explain this is that after all the AWS API
    endpoints provide an only eventually consistent view.

    For Opstrace cluster creation and Opstrace cluster destruction the goal is
    to use concurrently retrying execution units (breaking dependency cycles,
    handling unforeseen API errors and also transient errors, etc). The
    aforementioned control loops are central primitives for implementing these
    concurrently retrying execution units.

    Each cloud resource is tied to a specific Opstrace cluster. Child classes
    often use the canonical Opstrace cluster name to construct derived resource
    names or to tag resources with that name, creating a naming convention.
    These naming conventions have the goal to create an unambiguous
    relationship between an individual cloud resource and an indvidual Opstrace
    cluster. This is why the canonical Opstrace cluster name is a required
    constructor argument.

    This is a "Generic Class" which requires child classes to set Typescript
    types:

      - `CheckCreateSuccessType`: the success-representing type returned by
        `checkCreateSuccess()` (private method), and then also returned by
        `setup()` (public method).

      - `SetupParameterType`: the type of the argument that needs to be
        provided to the `setup()` method. Note that if not specified in the
        child class the default is `void` which has the special meaning of
        making the parameter to `setup()` optional. When this type is specified
        by the child class and _not_ provided upon calling `setup()` then this
        technique makes tsc throw an error: `An argument for 'sparams' was not
        provided.`

    References:

      https://docs.aws.amazon.com/AWSEC2/latest/APIReference/errors-overview.html
  */

  // internal state for setup() method
  private creationTriggered = false;

  // the canonical opstrace cluster name.
  protected ocname: string;
  // resource name, mainly used for logging, must be set by child class.
  protected abstract rname: string;

  constructor(opstraceClusterName: string) {
    this.ocname = opstraceClusterName;
  }

  /**
   * Return `true`: desired teardown state is reached.
   *
   * Return string: desired teardown state not yet reached, string represents
   * how that is (for logging purposes).
   */
  protected abstract checkDestroySuccess(): DestroyCheckResultType;

  /**
   * Call `checkDestroySuccess()` in child class and handle expected errors.
   *
   * Swallow and log AWS API error (next attempt might be successful). Re-throw
   * all other errors (probably programming errors/genuine bugs).
   */
  private async checkDestroySuccessWrapper(): DestroyCheckResultType {
    try {
      return await this.checkDestroySuccess();
    } catch (e) {
      if (!(e instanceof AWSApiError)) {
        throw e;
      }
      log.info(
        `${this.rname} teardown: checkDestroy(): aws api error: ${e.message}`
      );
    }
    return "api error";
  }

  /**
   * No return value of interest. Expected to throw errors of type AWSApiError
   * upon all kinds of AWS HTTP API errors. Common kinds of errors then get
   * handled (ignored, logged) automatically (NotFound, DeleteConflict,
   * DependencyError, ...).
   *
   * This keeps getting called repetitively as part of the teardown loop until
   * `checkDestroySuccess()` confirms resource destruction.
   */
  protected abstract tryDestroy(): TryDestroyResultType;

  /**
   * Call `tryDestroy()` in child class and handle expected errors.
   *
   * Swallow and log AWS API error (next attempt might be successful). Re-throw
   * all other errors (probably programming errors/genuine bugs).
   */
  private async tryDestroyWrapper(): TryDestroyResultType {
    try {
      return await this.tryDestroy();
    } catch (e) {
      if (!(e instanceof AWSApiError)) {
        throw e;
      }
      log.info(
        `${this.rname} teardown: tryDestroy(): ignore aws api error: ${e.message}`
      );
    }
  }

  /**
   * Check if desired state is reached.
   *
   * Return `false`: desired state is not yet reached.
   *
   * Return `CheckCreateSuccessType`: desired state is reached. The returned
   * object represents state and is returned by `setup()`.
   *
   * Expected to throw `AWSApiError` which might mean that state could not be
   * checked or that desired state is not reached.
   */
  protected abstract checkCreateSuccess(): Promise<
    CheckCreateSuccessType | false
  >;

  /**
   * Call `checkCreateSuccess()` in child class and handles expected errors.
   *
   * Swallow and log AWS API error (next attempt might be successful). Re-throw
   * all other errors (probably programming errors/genuine bugs).
   */
  private async checkCreateSuccessWrapper(): Promise<
    CheckCreateSuccessType | false
  > {
    try {
      return await this.checkCreateSuccess();
    } catch (e) {
      if (!(e instanceof AWSApiError)) {
        throw e;
      }
      log.info(
        `${this.rname} setup: checkCreateSuccess(): aws api error: ${e.message}`
      );
    }

    // Indicate that creation did not succeed.
    return false;
  }

  /**
   * Attempt (once!) to create resource.
   *
   * Return `true`: calling code assumes creation success.
   *
   * Return `false`: calling code assumes creation failure.
   *
   * When `setup()` is being called with a parameter object then this will be
   * passed to `tryCreate()`.
   *
   * Expected to throw `AWSApiError` which is assumed to mean that the creation
   * attempt failed.
   *
   * Upon assumed creation success there will be no further creation attempt
   * (call to `tryCreate()`) within `setupForever()`.
   *
   * Note that certain common 409-style API errors ("Conflict"/
   * "AlreadyExists") do not need to be treated specially in the child
   * implementation. The caller treats those (as stated above) as creation
   * failure -- which is true, and fine as long as `checkCreateSuccess()` at
   * some points yields a positive result.
   *
   * **False-positive outcome**:
   *
   * When the assumed creation success is a wrong assumption then
   * `setupForever()` will spin forever waiting for `checkCreateSuccess()` to
   * yield success which will not happen. This is either an indicator for a bug
   * in the specific `tryCreate()` implementation or a rare challenge we can do
   * little about (cloud provider API weakness: confirms creation, but does not
   * create?).
   *
   * **False-negative outcome**:
   *
   * Interesting edge case we can do nothing about: errors like 5xx HTTP errors
   * where we think that the resource creation attempt failed but the resource
   * creation was nevertheless initiated -- in this case `setupForever()` will
   * keep retrying to create the resource. That kind of "create loop" will stop
   * once `checkCreateSuccess()` detects actual success. The "create loop" can
   * result in two different scenarios: subsequent attempts either (and
   * hopefully) fail with 409-style conflict errors (good!) or (bad!) an
   * instance of the resource is being created with each create loop iteration.
   * That depends on the specific resource type and the specific implementation
   * of `tryCreate()` in the child class.
   */
  protected abstract tryCreate(params: SetupParameterType): Promise<boolean>;

  /**
   * Call `tryCreate()` in child class and handles expected errors. Assume
   * creation success: return value is not `undefined`. Assume creation
   * failure: return value is `undefined`.
   *
   * Swallow and log AWS API error (next attempt might be successful). Re-throw
   * all other errors (probably programming errors/genuine bugs).
   *
   */
  private async tryCreateWrapper(params: SetupParameterType): Promise<boolean> {
    try {
      return await this.tryCreate(params);
    } catch (e) {
      if (!(e instanceof AWSApiError)) {
        throw e;
      }
      log.info(
        `${this.rname} setup: tryCreate(): assume that creation failed: ${e.message}`
      );
    }
    return false;
  }

  public async teardown(): Promise<void> {
    log.info(`${this.rname} teardown: start`);

    let cycle = 1;

    while (true) {
      log.debug(`${this.rname} teardown: cycle ${cycle}`);

      const dres = await this.checkDestroySuccessWrapper();

      if (dres === true) {
        log.info(`${this.rname} teardown: reached desired state, done`);
        return;
      }

      log.debug(`${this.rname} teardown: not yet done. state: ${dres}`);

      // getWaitTimeSeconds(1) is expected to return 0;
      const stime = getWaitTimeSeconds(cycle);
      if (stime > 0) {
        log.debug(`${this.rname} teardown: sleep ${stime.toFixed(2)} s`);
        await sleep(stime);
      }

      // note(jp): we could pass `dres` in here to maybe save a lookup within
      // tryDestroy.
      await this.tryDestroyWrapper();

      cycle++;
    }
  }

  /**
   * Invoke resource setup/creation loop.
   *
   * Returns the value that the custom `checkCreateSuccess()` implementation
   * returns when it is not `false`.
   *
   * Optional argument `params`: if provided this object will be passed
   * unaltered to `tryCreate()`. Should be used for providing input parameters
   * required for resource creation.
   *
   * coarse-grained structure of the setup loop:

      ```
      let cycle = 1;
      while(true) {
        if (getCurrentState() == desiredState) {
          return;
        }

        sleep(getWaitTimeSeconds(cycle));

        tryCreate();

        cycle++;
      }
      ```

   * - Note that in cycle/attempt/loop_iteration 1 the wait time is 0 so
   *   that the state check is immediately followed by state modification
   *   (resource creation attempt).
   *
   * - Note that the sleep is between state checking and state
   *   modification so that state modification is always directly followed by
   *   state checking (fastest exit in happy path).
   *
   * - Note that the loop body starts with state checking so that a previously
   *   partially performed cluster setup/create operation can be continued
   *   efficiently.
   *
   * I would love to make `CheckCreateSuccessType` somewhat dynamic, would
   * love to define it in the child class!
   */
  public async setup(
    sparams: SetupParameterType
  ): Promise<CheckCreateSuccessType> {
    log.info(`${this.rname} setup: start`);

    let cycle = 1;
    const t0 = mtime();

    while (true) {
      log.debug(`${this.rname} setup: cycle ${cycle}`);

      // "structural typing" vs. "nominal typing": might want to use branded
      // type to distinguish TryCreateResultType (boolean) and... see
      // https://stackoverflow.com/a/50300807/145400
      const sres = await this.checkCreateSuccessWrapper();

      if (sres !== false) {
        const durationSeconds = mtimeDiffSeconds(t0);

        log.debug(
          `${this.rname} setup: state check result: ${JSON.stringify(
            sres,
            null,
            2
          )}`
        );

        log.info(
          "%s setup: reached desired state, done (duration: %s s)",
          this.rname,
          durationSeconds.toFixed(2)
        );
        return sres;
      }

      // getWaitTimeSeconds(1) is expected to return 0;
      const stime = getWaitTimeSeconds(cycle);
      if (stime > 0) {
        log.info(
          `${
            this.rname
          } setup: desired state not reached, sleep ${stime.toFixed(2)} s`
        );
        await sleep(stime);
      }

      if (this.creationTriggered === false) {
        this.creationTriggered = await this.tryCreateWrapper(sparams);
      }

      cycle++;
    }
  }

  // Allow for a child class instance to dynamically override `rname`. To work
  // around "Abstract property 'rname' in class 'AWSResource' cannot be
  // accessed in the constructor"
  protected changeRname(rname: string): void {
    this.rname = rname;
  }

  /**
   * Use this when "creation" was confirmed by AWS, but later in the process
   * turns out to have failed -- then flipping this switch results in another
   * CREATE attempt to be made during setup(). This is useful for long-running
   * async creation processes like for EKS or NAT Gateway (can transition into
   * the FAILED state during creation within AWS).
   */
  protected resetCreationState(): void {
    log.info(`${this.rname} setup: trigger CREATE again in next iteration`);
    this.creationTriggered = false;
  }
}
