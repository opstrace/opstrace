#!/usr/bin/env bash
# script adapted from https://adaptjs.org/blog/2019/10/14/fixing-dns-timeouts-in-docker, thank you!

: "${IMAGE:=mvance/unbound:1.12.0}"
: "${NAME:=unbound}"
: "${DNS_IP_FILE:=/tmp/dns_cache_ip}"

unbound_ip() {
    # Get the IP address of the container and other containers will send DNS
    # requests to.
    IP_ADDR=$(docker inspect --type container unbound  --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' | tr -d '[:space]')
    if [ -z "${IP_ADDR}" ]; then
        echo Cannot start DNS cache. Could not find container ip address. >&2
        exit 1
    fi
    # Remember what IP address to use as DNS server, then output it.
    echo ${IP_ADDR} > "${DNS_IP_FILE}"
    echo ${IP_ADDR}
}

dns_cache() {

    if docker inspect --type container "${NAME}" >& /dev/null ; then
        if [ -f "${DNS_IP_FILE}" ]; then
            # dns cache is already started
            cat "${DNS_IP_FILE}"
            exit 0
        else
            unbound_ip
            exit 0
        fi
    fi

    # Run the dns cache container.
    docker run \
        --rm \
        -d \
        --name "${NAME}" \
        -v $(pwd)/ci/unbound/unbound.conf:/opt/unbound/etc/unbound/unbound.conf \
        "${IMAGE}" > /dev/null

    if [ $? -ne 0 ]; then
        echo Cannot start DNS cache. Docker run failed.
        exit 1
    fi

    unbound_ip
}

if [ "$(uname)" = "Linux" ]; then
    (
    #
    # Check https://github.com/opstrace/opstrace-prelaunch/issues/1744
    #
    # acquire an exclusive scoped lock, fail after 90s
    # https://linux.die.net/man/1/flock
    #
    flock -x -w 90 200 || exit 1

    dns_cache

    ) 200>/tmp/unbound.lock
else
    dns_cache
fi

