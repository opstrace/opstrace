# Opstrace tenant API authenticator

## Public key serialization format

Public keys need to be injected in the PEM-encoded `X.509 SubjectPublicKeyInfo` format, which is what OpenSSL uses when writing a public key to a "PEM file".


See [this StackOverflow answer](https://stackoverflow.com/a/29707204/145400) for a lovely discussion about the `X.509 SubjectPublicKeyInfo` PEM serialization format, and how the difference
between the header `BEGIN PUBLIC KEY` (supported here) and `BEGIN RSA PUBLIC KEY` (not supported here) matters a lot.

Example flow for generating an RSA keypair using OpenSSL, and for subsequently writing the public key out to a PEM file containing the format expected here:

```bash
$ openssl genrsa -out keypair.pem 2048
$ openssl rsa -in keypair.pem -out public.pem -pubout
$ cat public.pem
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1dJBQDgTL8ltms5ksNrW
...
JuMRuClKi4dAFJVtW64A/Z86cYZ92CtmEP3rVkX7oouMUy5bYwbRHcNtKf4JD2KR
kQIDAQAB
-----END PUBLIC KEY-----
```

## Key ID calculation

For raw RSA public keys, there is no canonical way to build a key id.
Here, we define the following procedure:

* Take PEM text : `-----BEGIN PUBLIC KEY-<...>-END PUBLIC KEY-----`
* Strip leading and trailing whitespace (in case it sneaked in).
* Use byte representation of PEM text (use utf-8/ascii).
* Build SHA1 hash from these bytes, and represent the resulting hash as a string in hex notation.

Python program example:

```python
import hashlib
import sys

keytext = ''.join(l for l in sys.stdin)
data = keytext.strip().encode('utf-8')
print(hashlib.sha1(data).hexdigest())
```

In this case saved as `keyid.py`.
Usage:

```bash
$ cat public.pem | python keyid.py
d6de1ae63a549c56307b0b0b20c39dcf921b4a8a
```

## Key set config: JSON structure spec

A flat map (object), with keys and values being strings.

Each key-value pair is expected to represent an RSA public key.

Each JSON key is expected to be the key ID corresponding to the RSA pub key (see above for key ID derivation method specification).

Each value is expected to be a JSON string, describing the pub key in the PEM-encoded `X.509 SubjectPublicKeyInfo` format (JSON string with escaped newlines).

Example Python program to generate such a JSON doc for multiple keys:

```python
import hashlib
import sys
import json

infiles = sys.argv[1:]

stripped_pem_strings = []
for fp in infiles:
    with open(fp, 'rb') as f:
        stripped_pem_strings.append(f.read().decode('utf-8').strip())

keymap = {}
for sps in stripped_pem_strings:
    data = sps.encode('utf-8')
    kid = hashlib.sha1(data).hexdigest()
    keymap[kid] = sps

outjson = json.dumps(keymap, indent=2)
print(outjson)
```


In this case saved as `build-key-config-json.py`.
Usage:

```bash
$ python build-key-config-json.py public.pem public2.pem
{
  "d6de1ae63a549c56307b0b0b20c39dcf921b4a8a": "-----BEGIN PUBLIC KEY-----\nM[...]B\n-----END PUBLIC KEY-----",
  "44610d7c2277d33a68abae86315eb6ea9b3734a9": "-----BEGIN PUBLIC KEY-----\nM[...]B\n-----END PUBLIC KEY-----"
}
```

Note: when injecting this JSON doc via environment through a `docker run` layer then keep the JSON doc on a single line (no literal newline char).
In the Python program above, this means removing `indent=2`.
You can always pretty-print that JSON with `| jq`.
