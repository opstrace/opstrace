#
# This file is meant to be imported by the scripts in the ci/ directory. It
# contains a few useful helper functions.

#
# curl is a bash function with the same name as the binary to ensure we always
# call this function instead of the command directly. The purpose is to set a
# few default options in the curl command.
#
# curl manpage section https://curl.se/docs/manpage.html about retry flag:
#
# "If a transient error is returned when curl tries to perform a transfer, it
# will retry this number of times before giving up. Setting the number to 0
# makes curl do no retries (which is the default). Transient error means either:
# a timeout, an FTP 4xx response code or an HTTP 408 or 5xx response code.
#
# When curl is about to retry a transfer, it will first wait one second and then
# for all forthcoming retries it will double the waiting time until it reaches
# 10 minutes which then will be the delay between the rest of the retries. By
# using --retry-delay you disable this exponential backoff algorithm. See also
# --retry-max-time to limit the total time allowed for retries.
#
# Since curl 7.66.0, curl will comply with the Retry-After: response header if
# one was present to know when to issue the next retry.
#
# If this option is used several times, the last one will be used."
#
curl() {
    # circumvent normal bash function lookup
    command curl \
    --connect-timeout 10 \
    --retry 3 \
    --retry-delay 5 \
    "${@}"
}

configure_kubectl_aws_or_gcp() {
    if [[ "${OPSTRACE_CLOUD_PROVIDER}" == "aws" ]]; then
        aws eks --region ${AWS_CLI_REGION} update-kubeconfig --name ${OPSTRACE_CLUSTER_NAME}
    else
        gcloud container clusters get-credentials ${OPSTRACE_CLUSTER_NAME} \
            --zone ${GCLOUD_CLI_ZONE} \
            --project ${OPSTRACE_GCP_PROJECT_ID}
    fi
    kubectl cluster-info
}

check_certificate() {
    # Timeout the command after 10 seconds in case it's stuck. Redirect stderr
    # to stdout (for `timeout` and `openssl`), do the grep filter on stdout, but
    # also show all output on stderr via a tee shunt.
    timeout --kill-after=10 10 \
    openssl s_client -showcerts -connect "${1}"  </dev/null \
    | openssl x509 -noout -issuer \
    |& tee /dev/stderr | grep "Fake LE Intermediate"
}

retry_check_certificate() {
    # Retry the certificate check up to 3 times. Wait 5s before retrying.
    count=0
    retries=3
    until check_certificate "${1}"
    do
        retcode=$?
        wait=5
        count=$(($count + 1))
        if [ $count -lt $retries ]; then
            echo "failed checking if cluster is using certificate issued by LetsEncrypt, retrying in ${wait} seconds..."
            sleep $wait
        else
            exit ${retcode}
        fi
    done
}
