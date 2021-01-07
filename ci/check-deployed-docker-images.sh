#
# https://kubernetes.io/docs/tasks/access-application-cluster/list-all-running-container-images/#list-all-container-images-in-all-namespaces
#
# Get the list of images running on the cluster.
#
DEPLOYED_IMAGES=$(kubectl get pods --all-namespaces -o jsonpath="{.items[*].spec.containers[*].image}" |\
tr -s '[[:space:]]' '\n' |\
sort |\
uniq)

echo "list of images deployed to the cluster"
echo "${DEPLOYED_IMAGES}"
echo

#
# Get the expected list of deployed docker images from docker-images.json into a
# bash array.
#
readarray -t EXPECTED_IMAGES < <(jq -r ' . | to_entries[] | .value ' packages/controller-config/src/docker-images.json)

#
# Iterate over list of expected images and check if they are in the list of
# deployed images using grep. Print all that are not found. Exit with failure if
# at least one is not found.
#
FAIL=0
for img in "${EXPECTED_IMAGES[@]}"
do
    if ! grep -q ${img} <<< "${DEPLOYED_IMAGES}" ; then
        echo "ERROR: image ${img} was not deployed"
        FAIL=1
    fi
done

if [ ${FAIL} -eq 1 ]; then
    exit 1
fi
