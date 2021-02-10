/**
 * Copyright 2019-2021 Opstrace, Inc.
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

export class Queue {
  private items: Array<any>;
  private maxLength: number;
  private pendingPuts: Array<[any, CallableFunction]>;
  private pendingGets: Array<CallableFunction>;
  private isclosed: boolean;

  constructor(maxLength: number) {
    this.maxLength = maxLength;
    this.items = [];
    this.pendingPuts = [];
    this.pendingGets = [];
    this.isclosed = false;
  }

  private addPendingPut(item: any, resolvefunc: CallableFunction) {
    this.pendingPuts.unshift([item, resolvefunc]);
  }

  private addPendingGet(resolvefunc: CallableFunction) {
    this.pendingGets.unshift(resolvefunc);
  }

  private acceptOldestPendingPut() {
    // If there are pending puts then accept the oldest one.
    if (this.pendingPuts.length) {
      // @ts-ignore (it thinks that pop() can return undefined)
      const [item, resolvefunc] = this.pendingPuts.pop();
      this.items.unshift(item);
      // Notify the caller that is awaiting the put() call to return.
      resolvefunc();
    }
  }

  private serveOldestPendingGet(item: any): boolean {
    // If there are pending gets then serve the oldest one.
    if (this.pendingGets.length) {
      const resolvefunc = this.pendingGets.pop();
      // Notify the caller that is awaiting the put() call to return.
      //console.log("serve oldest pending get!");
      // @ts-ignore (TS thinks the array may be empty)
      resolvefunc(item);
      // Indicate to our caller that the item was served to a pending getter.
      // That is, do _not_ put it into buffer.
      return true;
    }
    // Indicate that item was not served, i.e. put into buffer.
    return false;
  }

  async put(item: any) {
    this.checkClosed();
    return new Promise<void>((resolvefunc, reject) => {
      if (this.length < this.maxLength) {
        // Accept item immediately (resolve promise immediately). Store in
        // buffer or -- if there is at least one pending get -- then serve item
        // directly to it, and don't buffer it.
        const served = this.serveOldestPendingGet(item);
        if (!served) {
          // Buffer the item in queue.
          this.items.unshift(item);
        }
        // Indicate to the caller that the item was accepted.
        resolvefunc();
      } else {
        // Put this into the "accept queue" which itself is infinitely long.
        // (do not resolve the promise yet).
        //console.log("queue is full, add pending PUT to accept queue");
        this.addPendingPut(item, resolvefunc);
      }
    });
  }

  public async get(): Promise<any> {
    return new Promise((resolvefunc, reject) => {
      // Return oldest item immediately (resolve promise immediately) if there
      // is at least one item in the buffer.
      if (this.length > 0) {
        const item = this.items.pop();
        // If there are pending puts then accept the oldest one now.
        this.acceptOldestPendingPut();
        resolvefunc(item);
      } else {
        if (this.isclosed) {
          resolvefunc(null);
        }
        // or put this into the "return queue" which itself is infinitely long.
        //console.log("queue is emtpy, add pending GET to return queue");
        this.addPendingGet(resolvefunc);
      }
    });
  }

  private checkClosed() {
    if (this.isclosed) throw new Error("queue is closed");
  }

  public close() {
    // Closing the queue is only possible when no more PUTs are pending. After
    // the queue has been closed subsequent put()s throw an error and
    // subsequent get()s return items as they are still in the buffer. Once the
    // buffer is empty a get() Promise resolves to `null` indicating to the
    // consumer that the queue is closed, that the work is done.
    if (this.pendingPuts.length) {
      throw new Error("cannt close queue with pending PUTs");
    }

    this.isclosed = true;
  }

  public get closed() {
    return this.isclosed === true;
  }

  public peek() {
    return this.items[this.length - 1];
  }

  public get length() {
    return this.items.length;
  }

  public isEmpty() {
    return this.items.length === 0;
  }
}
