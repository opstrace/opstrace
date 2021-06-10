set +o xtrace
#
# https://kubernetes.io/docs/tasks/access-application-cluster/list-all-running-container-images/#list-all-container-images-in-all-namespaces
#
# Get the list of images running on the cluster.
#
DEPLOYED_IMAGES=$(kubectl get pods --all-namespaces -o jsonpath="{.items[*].spec.containers[*].image}" |\
tr -s '[[:space:]]' '\n' |\
sort |\
uniq)

echo "--- list of images deployed to the cluster"
echo "${DEPLOYED_IMAGES}"
echo

#
# List of images that are not expected to be included in the main containers list.
# - postgresql-client: Only in initContainers which we aren't checking
# - *exporter: Not deployed in initial cluster, only added after user (or test) adds an exporter
# - local-volume-provisioner: Not deployed on AWS
#
UNEXPECTED_IMAGES=(
    "tmaier/postgresql-client"
    "opstrace/azure_metrics_exporter"
    "prom/blackbox-exporter"
    "prom/cloudwatch-exporter"
    "prometheuscommunity/stackdriver-exporter"
)
if [[ "${OPSTRACE_CLOUD_PROVIDER}" == "aws" ]]; then
    UNEXPECTED_IMAGES+=("quay.io/external_storage/local-volume-provisioner")
fi

#
# Get the expected list of deployed docker images from docker-images.json into a
# bash array, then filter out the UNEXPECTED_IMAGES.
#
readarray -t ALL_IMAGES < <(jq -r ' . | to_entries[] | .value ' packages/controller-config/src/docker-images.json)
for img in "${ALL_IMAGES[@]}"; do
    SKIP=''
    for unexpected in "${UNEXPECTED_IMAGES[@]}"; do
        if [[ "$img" == *"$unexpected"* ]]; then
            echo "Skip: $img (vs $unexpected)"
            SKIP='y'
            break
        fi
    done
    if [ -n "$SKIP" ]; then
        continue
    fi
    EXPECTED_IMAGES+=($img)
done
echo
echo "Expected images from docker-images.json"
( IFS=$'\n'; echo "${EXPECTED_IMAGES[*]}" )
echo

#
# Iterate over list of expected images and check if they are in the list of
# deployed images using grep. Print all that are not found. Exit with failure if
# at least one is not found.
#
FAIL=0
for img in "${EXPECTED_IMAGES[@]}"; do
    if ! grep -q ${img} <<< "${DEPLOYED_IMAGES}" ; then
        echo "ERROR: expected image ${img} was not deployed"
        FAIL=1
    fi
done

if [ ${FAIL} -eq 1 ]; then
    exit 1
fi

set -o xtrace
