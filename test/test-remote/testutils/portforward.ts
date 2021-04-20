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

import events from "events";
import fs from "fs";
import child_process from "child_process";

import {
  log,
  createTempfile,
  mtimeDeadlineInSeconds,
  mtime,
  sleep,
  readFirstNBytes
} from "./index";

const PORT_FORWARD_LISTEN_PATTERN = /^Forwarding from 127\.0\.0\.1:(\d+) -> \d+/g;

export class PortForward {
  /*
  Represents a local port-forward to a service running a in K8S cluster,
  initiated via `kubectl port-forward`.

  Mode of operation:

  Run a child process with the following command line signature:

      kubectl port-forward TYPE/NAME [options] [LOCAL_PORT:]REMOTE_PORT

  Wait for the port-forward to be successfully set up or throw an Error.

  Redirect stderr to stdout, and redirect stdout to a file in TMPDIR for decent
  post-testfailure debuggability (don't just keep the stdout/err in memory of
  the test runner).
  */

  private name: string;
  private kubectlArgs: Array<string>;
  private kubectlCmd: string;
  private outfilePath: string;
  private process: child_process.ChildProcess | null;
  // To be populated by the "error" event emitter of the child process.
  private processStartupError: Error | null;
  // To be populated by the "exit" event emitter of the child process.
  private processExitCode: number | null;

  constructor(
    name: string,
    k8sobj: string,
    port_remote: number,
    namespace: string
  ) {
    /*
    name: arbitrary name for this port-foward, used in log and output filename.
    k8sobj: the TYPE/NAME in the cmdline signature for kubectl
    port_remote: remote port
    namespace: passed as --namespace <namespace> to kubectl
    */

    this.name = name;

    this.kubectlArgs = [
      "port-forward",
      "--namespace",
      namespace,
      k8sobj,
      // local port 0: Select a random ephemeral port on each invocation.
      // This avoids collisions with other parallel test runs or other services on the same machine.
      // kubectl will print the local ephemeral port that it has selected and we will return it to the caller.
      `0:${port_remote}`
    ];

    this.outfilePath = createTempfile("kubectl-port-forward-", ".outerr");

    this.kubectlCmd = "kubectl " + this.kubectlArgs.join(" ");

    this.processStartupError = null;
    this.processExitCode = null;
    this.process = null;
  }

  private async startProcess() {
    const outstream = fs.createWriteStream(this.outfilePath);

    // `child_process.spawn()` can fail if this event is not waited for.
    await events.once(outstream, "open");

    log.info(
      "%s: exec in child: '%s' -- redirect output to %s",
      this,
      this.kubectlCmd,
      this.outfilePath
    );
    const process = child_process.spawn("kubectl", this.kubectlArgs, {
      stdio: ["ignore", outstream, outstream]
    });

    // Note: the system call(s) towards starting the process might have failed,
    // but there is no synchronous error reporting for common errors like
    // ENOENT.

    process.once("error", err => {
      // Catch ENOENT (executable not found) and EACCESS and the likes. Carry
      // this error information over to the (periodically polling) success
      // resolver, handle it there.

      // Note: if startup succeeded but killing later does not succeed for
      // whichever reason then (at least according to docs) this handler might
      // be triggered, too, resulting in a confusing log message.
      log.error("'error' handler: process could not be started: %s", err);
      this.processStartupError = err;
    });

    process.on("exit", (code, signal) => {
      log.info(
        "%s: 'exit' handler: process exited. Code: %s, signal: %s",
        this,
        code,
        signal
      );
      this.processExitCode = code;
      // keep `this.process` object around (we could set it to `null` again
      // here, but other logic can and should also check for
      // this.processExitCode being *not* null to know when the project was
      // started but is already gone again).
    });
    this.process = process;
  }

  // Starts the port forward and returns the local port number to connect to.
  // If the port forward fails, an error is thrown.
  public async setup(): Promise<number> {
    /*
    Wait for the port-forward setup to become ready.

    Positive check for robustness: require process stdout to show a particular
    message. Return `true` in that case.

    Treat all other cases as failure. Throw an Error in those cases.

    Periodically poll for the success criterion. If that is not met within a
    deadline then throw an Error. As short-cut, check for expected error
    scenarios on the way to that deadline (fail fast).

    If this function throws an Error then it must not leave a child process
    behind (resource cleanup guarantee).
    */

    log.info(`${this}: initialize`);

    await this.startProcess();

    const maxWaitSeconds = 30;
    const deadline = mtimeDeadlineInSeconds(maxWaitSeconds);
    log.info(`${this}: waiting for port-forward to become ready, deadline in ${maxWaitSeconds}s`);

    while (true) {
      // `break`ing out the loop enters the error path, returning `true`
      // indicates success.

      if (mtime() > deadline) {
        log.error(`${this}: port-forward deadline hit`);
        break;
      }

      // There is no documented synchronous check for process liveness.
      // Cf. https://github.com/nodejs/help/issues/1191

      // `processStartupError` and `processExitCode` state changes are picked
      // up in the next loop iteration _after_ the corresponding event handlers
      // fired.
      if (this.processStartupError) {
        log.error(`${this}: kubectl process startup error, stop waiting`);
        break;
      }

      if (this.processExitCode) {
        log.error(`${this}: kubectl process exited unexpectedly, stop waiting`);
        break;
      }

      // Wait for kubectl to print the ephemeral ipv4 port
      const kubectlOut = new TextDecoder("utf-8").decode(await readFirstNBytes(this.outfilePath, 100));
      const regexResult = PORT_FORWARD_LISTEN_PATTERN.exec(kubectlOut)
      if (regexResult != null && regexResult.length > 1) {
        log.info(`${this}: port-forward listening on port ${regexResult[1]}`);
        return parseInt(regexResult[1], 10);
      }
      await sleep(0.1);
    }

    // Note that I should look into _reliable_ resource cleanup which should be
    // performed e.g. when Ctrl+Cing things. The testsuite teardown is not a
    // reliable resource cleanup place, it's called very early, e.g. when the
    // test suite times out, or not at all (e.g. when SIGINTing the test
    // runner). How to do reliable resource cleanup?
    // Some loose refs:
    // - https://github.com/jtlapp/node-cleanup
    // - https://www.npmjs.com/package/node-cleanup
    // - https://stackoverflow.com/a/21947851/145400

    if (this.processStartupError === null && this.processExitCode === null) {
      // The port-forward setup failed as of  one of many possible reasons
      // (kubectl misconfiguration, transport errors, ...), and the process
      // (most likely) did not exit yet. Reliably terminate the child process
      // before throwing the Error (indicating setup failure to the test
      // suite). Note: the check through `processExitCode` is an indirect check
      // subject to race conditions; it's no direct check performed by the
      // operating system on the process. This indicator for the process to
      // still be alive is expected to be credible in most cases. If it is not
      // (if the process is gone by now) then the SIGTERM will likely do no
      // harm.
      log.info(
        "%s: port-forward failed but child process (most likely) did not exit yet, terminate",
        this
      );
      await this.terminate();
    }

    if (this.processExitCode) {
      log.info("%s: child process exit code: %s", this, this.processExitCode);
    }

    // Not documented, but this performs a surrogate escape if necessary, see
    // https://github.com/nodejs/node/pull/30706
    log.info(
      "%s: process stdout/err:\n%s",
      this,
      fs.readFileSync(this.outfilePath, { encoding: "utf-8" })
    );

    throw new Error("kubectl port-forward setup failed");
  }

  public async terminate() {
    if (!this.process) {
      log.info("%s: terminate() called, but process does not exist", this);
      return;
    }

    if (this.processExitCode !== null) {
      log.info("%s: terminate() called, but process is already gone", this);
      return;
    }

    log.info("%s: send SIGTERM to process with PID %s", this, this.process.pid);
    this.process.kill("SIGTERM");

    // `kill()` might silently swallow errors. `.killed` is synchronously set to
    // `true` only when the system call succeeded.
    // Cf. https://github.com/nodejs/node/issues/30668
    if (!this.process.killed) {
      log.error("kill() system call failed");
    }

    log.info("%s: waiting for process to terminate", this);
    const [code, signal] = await events.once(this.process, "close");
    log.info("%s: process exited. code: %s, signal: %s", this, code, signal);
    this.process = null;
  }

  public toString = (): string => {
    return `PortForward(${this.name})`;
  };
}
