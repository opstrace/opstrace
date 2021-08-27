#!/bin/bash

#
# Run this script when you need to clean up the routers leftover by CI builds.
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

ROUTERS=$(gcloud compute routers list | grep bk | awk '{print $1}' )
for ROUTER in ${ROUTERS}
do
    echo "Deleting router ${ROUTER}"
    gcloud compute routers delete ${ROUTER} --region us-west2 --quiet
done

SUBNETS=$(gcloud compute networks subnets list | grep bk | grep -v 5607 | grep -v 5609 | awk '{print $1}' )
for SUBNET in ${SUBNETS}
do
    echo "Deleting subnet ${SUBNET}"
    gcloud compute networks subnets delete ${SUBNET} --quiet --region us-west2
done


NETWORKS=$(gcloud compute networks list | grep bk | grep -v 5607 | grep -v 5609 | awk '{print $1}' )
for NETWORK in ${NETWORKS}
do
    echo "Deleting network ${NETWORK}"
    gcloud compute networks delete ${NETWORK} --quiet
done
