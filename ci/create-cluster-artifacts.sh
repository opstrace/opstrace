# to be `source`d as part of teardown
# assume that current working directory is OPSTRACE_BUILD_DIR, i.e.
# the directory where the opstrace CLI is executed.

kubectl describe all --all-namespaces 2> kubectl_describe_all.stderr > kubectl_describe_all-${OPSTRACE_CLUSTER_NAME}.log

# Filter out a specific warning that may appear thousands of times on AWS:
# See opstrace-prelaunch/issues/1029
cat kubectl_describe_all.stderr | grep -v 'many client instances from the same exec auth config can cause performance problems'

kubectl logs --namespace=kube-system deployment.apps/opstrace-controller \
    > kubectl_controller-${OPSTRACE_CLUSTER_NAME}.log

kubectl describe --namespace=kube-system deployment.apps/opstrace-controller \
    > kubectl_controller_describe-${OPSTRACE_CLUSTER_NAME}.log

# System Prometheus pushes system metrics into Cortex
kubectl logs statefulset.apps/prometheus-system-prometheus \
 --container prometheus --namespace=system-tenant > clusterlogs_systemprom-${OPSTRACE_CLUSTER_NAME}.log

# Fluentd collects and pushes system logs into Loki.
kubectl get all --namespace=system-tenant 2>/dev/null | awk '{print $1}' | \
    grep 'pod/systemlog' | while read PNAME; do echo "get logs for $PNAME" | \
    tee /dev/stderr ; kubectl logs $PNAME --namespace=system-tenant --all-containers=true; done \
    > clusterlogs_fluentd-${OPSTRACE_CLUSTER_NAME}.log

kubectl get all --namespace=loki 2>/dev/null | awk '{print $1}' | \
    grep 'pod/' | while read PNAME; do echo "get logs for $PNAME" | \
    tee /dev/stderr ; kubectl logs $PNAME --namespace=loki --all-containers=true; done \
    > clusterlogs_loki-${OPSTRACE_CLUSTER_NAME}.log

kubectl get all --namespace=cortex 2>/dev/null | awk '{print $1}' | \
    grep 'pod/' | while read PNAME; do echo "get logs for $PNAME" | \
    tee /dev/stderr ; kubectl logs $PNAME --namespace=cortex --all-containers=true; done \
    > clusterlogs_cortex-${OPSTRACE_CLUSTER_NAME}.log

# Fetch Cortex and Loki config
kubectl get configmap --namespace=cortex cortex -o yaml 2>/dev/null > clusterlogs_cortex_configmap.log

kubectl get configmap --namespace=loki loki -o yaml 2>/dev/null > clusterlogs_loki_configmap.log

# See opstrace-prelaunch/issues/1319
for LOKICORTEX in loki cortex dd
do
    for K8SNAMESPACE in system-tenant default-tenant
    do
        kubectl get all --namespace=${K8SNAMESPACE} 2>/dev/null | awk '{print $1}' | \
            grep "pod/${LOKICORTEX}-api" | while read PNAME; do echo "get logs for $PNAME" | \
            tee /dev/stderr ; kubectl logs $PNAME --namespace=${K8SNAMESPACE} --all-containers=true; done \
            > clusterlogs_${LOKICORTEX}-http-api-proxy-${OPSTRACE_CLUSTER_NAME}-${K8SNAMESPACE}.log
    done
done

# See opstrace-prelaunch/issues/2091
for RESOURCE in issuer certificate certificaterequest order challenge
do
    kubectl --namespace=ingress describe ${RESOURCE} > clusterlogs_${RESOURCE}-${OPSTRACE_CLUSTER_NAME}-ingress.log
done

cp opstrace_cli_*log ${OPSTRACE_ARTIFACT_DIR}
cp kubectl_* ${OPSTRACE_ARTIFACT_DIR}
cp clusterlogs_* ${OPSTRACE_ARTIFACT_DIR}
