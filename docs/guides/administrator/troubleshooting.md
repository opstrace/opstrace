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
