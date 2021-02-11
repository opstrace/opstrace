# Troubleshooting

## Kubernetes-based debugging

When the Opstrace cluster or parts of it appear to not be healthy then debugging should start with getting insights about the underlying Kubernetes (k8s) cluster and its deployments.

### Connect `kubectl` to your Opstrace cluster


<!--tabs-->
#### AWS

Make sure use the same `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` that were used for creating the Opstrace cluster.
Then run

```text
aws eks update-kubeconfig --name <clustername> --region <awsregion>
```

For example:

```text
aws eks update-kubeconfig --name testcluster --region us-west-2
```

#### GCP

Make sure `gcloud` is configured for the GCP project under which the Opstrace cluster was created.
Then run

```text
gcloud container clusters get-credentials <clustername> --zone <gcpzone> --project <gcpproject>
```

For example:

```text
gcloud container clusters get-credentials testcluster --zone us-west2-a --project vast-pad-13337
```

<!--/tabs-->

### Get an overview over all container states

When the Opstrace cluster or parts of it appear to not be healthy then debugging should start with getting an overview over all k8s deployments and individual container states.
This can be obtained with the following command:

```text
kubectl describe all --all-namespaces > describe_all.out
```

This will reveal when a certain container is for example in a crash loop, or when it never started in the first place as of for example an error while pulling the corresponding container image.

### Fetch Opstrace controller logs

When the Opstrace controller (a deployment running in the Opstrace cluster) is suspected to have run into a problem then it is important to fetch and inspect its logs:

```text
kubectl logs deployment/opstrace-controller \
  --all-containers=true --namespace=kube-system > controller.log
```

## Known Issues

It's possible your installation can fail waiting for the certificates to be ready. When this happens, you'll see messages such as the following:

```text
info: waiting for 0 DaemonSets
info: waiting for 0 StatefulSets
info: waiting for 1 Certificates
debug:   Waiting for Certificate ingress/https-cert to be ready
```

And when the installation fails:

```text
info: waiting for 0 DaemonSets
info: waiting for 0 StatefulSets
info: waiting for 1 Certificates
warning: cluster creation attempt timed out after 2400 seconds
error: 3 attempt(s) failed. Stop retrying. Exit.
```

This is a known problem that we are tracking in these issues:

* [ci: waiting "for Certificate ingress/https-cert to be ready" didn't resolve](https://github.com/opstrace/opstrace/issues/151)
* [Certificate sometimes fails to issue properly](https://github.com/jetstack/cert-manager/issues/3594)

If this happens, the recommended workaround is to restart the certificate request process.

First, if the installation process is stuck, you can exit by pressing Ctrl-C. Then proceed to [connect kubectl to your Opstrace cluster](./troubleshooting.md#kubernetes-based-debugging).

Afterward, find the certificate request created by cert-manager:

```bash
$ kubectl -n ingress get certificaterequest
NAME                         READY   AGE
https-cert-XXXXX             False   30m
kubed-apiserver-cert-XXXXX   True    30m
```

The certificate request starts with `https-cert-` followed by five random characters.

Delete the failed certificate request:

```bash
kubectl -n ingress delete certificaterequest https-cert-XXXXX
```

And delete the certificate to have the controller recreate it and restart the request process:

```bash
kubectl -n ingress delete certificate http-cert
```

Check the installation succeeded by reissuing the `create` command:

<!--tabs-->

### AWS

```bash
./opstrace create aws $OPSTRACE_NAME \
  -c opstrace-config.yaml
```

When everything is done, you'll see the following log line:

`info: cluster creation finished: $OPSTRACE_NAME (aws)`

### GCP

```bash
./opstrace create gcp $OPSTRACE_NAME \
  -c opstrace-config.yaml
```

When everything is done, you'll see the following log line:

`info: cluster creation finished: $OPSTRACE_NAME (gcp)`

<!--/tabs-->
