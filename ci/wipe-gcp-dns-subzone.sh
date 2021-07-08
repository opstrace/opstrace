# These two helpers require `gcloud` to be set up (with authentication state of
# choice)

gcloud_wipe_and_delete_dns_sub_zone () {
    DNSZONE="${1}"  # the name of the zone, e.g. `zone-prs-bk-4877-bef-g`
    set -x
    # Deletion of a DNS zone only works when only Google-managed records (SOA
    # and NS) remain. Try to delete all custom records (A, TXT, ...) in that
    # DNS zone. Refs:
    # - https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/transaction/remove
    # - https://github.com/kubernetes-sigs/external-dns/issues/466#issuecomment-365980642
    # - https://stackoverflow.com/a/38644483/145400
    # - https://serverfault.com/a/840489/121951

    gcloud dns record-sets import -z "${DNSZONE}" \
        --delete-all-existing /dev/null || true

    # The deletion of DNS records triggered above is asynchronously
    # happening behind the scenes. Give this a tiny bit of time before
    # trying to delete the zone itself (but do not waste too much to,, it's
    # OK if things don't suceed: future CI runs clean up past CI runs, the
    # next CI run will take care of this).

    sleep 7
    gcloud dns managed-zones delete "${DNSZONE}" || true
    set +x
}

gcloud_remove_ns_records_from_root_opstracegcp () {
    RSNAME="${1}."  # the name of the record set, e.g. `prs-bk-4877-bef-g.opstracegcp.com.`
    ROOT_ZONE_NAME="root-opstracegcp"
    TXNFILEPATH="_gcp_cloud_dns_transaction_file_nsrec_removal"

    echo "* start a record set removal transaction on the zone ${ROOT_ZONE_NAME}"
    set -x
    gcloud dns record-sets transaction start \
        --zone=${ROOT_ZONE_NAME} \
        --transaction-file="${TXNFILEPATH}"

    # Assume that either of the following two record sets exists exactly as
    # written here, including TTL. Do not be smart about
    # ns-cloud-[a,b,c,d][1,2,3,4], just try to delete all four of them -- one
    # is expected to succeed

    for _VARIANT in a b c d
    do
        gcloud dns record-sets transaction remove --zone=${ROOT_ZONE_NAME} \
            --transaction-file="${TXNFILEPATH}" \
            --name "${RSNAME}" \
            --type NS --ttl 300 \
                "ns-cloud-${_VARIANT}1.googledomains.com." \
                "ns-cloud-${_VARIANT}2.googledomains.com." \
                "ns-cloud-${_VARIANT}3.googledomains.com." \
                "ns-cloud-${_VARIANT}4.googledomains.com." || true
    done

    gcloud dns record-sets transaction execute \
        --zone=${ROOT_ZONE_NAME} \
        --transaction-file="${TXNFILEPATH}"
    set +x

}
