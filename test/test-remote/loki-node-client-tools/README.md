# loki-node-client-tools

These are the first baby steps towards a reusable NPM package providing Loki
client tooling.

## Usage

```javascript
import { DummyStream } from "./loki-node-client-tools";

const stream = new DummyStream({
  n_entries_per_stream_fragment: 10 ** 4,
  n_chars_per_message: 90,
  starttime: ZonedDateTime.now(),
  uniqueName: "example-dummystream,
  timediffNanoseconds: 100,
  includeTimeInMsg: true,
  labelset: {"custom-label-key": "foo"},
  compressability: "min"
});


// Generate 10 log stream fragments and push each fragment with an individual
// POST HTTP request to the Loki API.
await stream.postFragmentsToLoki(
  10,
  "https://loki-external.default.jpdev.opstrace.io:8443"
);
```
