#!/bin/bash

#
# Run this script when you need to clean up the cloud dns zones leftover by CI
# builds. Note, it can take a while to run the clean up procedure because it's
# deleting the record sets in a zone one by one.
#

set -eou pipefail

SERVICE_ACCOUNT=$1
PROJECT=$2

if [ -z "${SERVICE_ACCOUNT}" ] ||  [ -z "${PROJECT}" ]; then
    echo "usage: cleanup-cloud-dns.sh /path/to/gcp-svc-acc-ci-shard-xxx.json ci-shard-xxx"
    exit 1
fi

# Set up gcloud auth.
gcloud auth activate-service-account --key-file=${SERVICE_ACCOUNT}
gcloud config set project ${PROJECT}

# Get the list of managed zones created by CI in the project.
MANAGED_ZONES=$(gcloud dns managed-zones list | grep bk | awk '{print $1}' )

for ZONE in ${MANAGED_ZONES}
do
    echo "Clearing zone ${ZONE}"
    # Get the list of record sets in the zone and delete them. Skip the NS and
    # SOA records since those are there by default.
    RECORD_SETS=$(gcloud dns record-sets list --zone ${ZONE} --page-size=200 | awk '(NR>1) {print $1, $2}')
    while IF=' ' read -r NAME TYPE
    do
        if [ "${TYPE}" = "SOA" ] || [ "${TYPE}" = "NS" ]; then
            echo "    Skipping ${NAME} with type ${TYPE}"
        else
            echo "Deleting record set ${NAME} ${TYPE}"
            gcloud dns record-sets delete ${NAME} --type ${TYPE} --zone ${ZONE}
        fi
    done <<< ${RECORD_SETS}
    echo "Deleting managed zone ${ZONE}"
    gcloud dns managed-zones delete ${ZONE}
done
