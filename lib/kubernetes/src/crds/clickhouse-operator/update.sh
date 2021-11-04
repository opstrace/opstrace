#!/bin/bash

# The clickhouse-operator version to fetch
OPERATOR_VERSION=0.16.0
OPERATOR_URL="https://raw.githubusercontent.com/Altinity/clickhouse-operator/$OPERATOR_VERSION/deploy/operator/clickhouse-operator-install-bundle.yaml"

if [ -z "$(which yq)" ]; then
    echo "This command requires yq 4.x+"
    exit 1
fi

CRDS_FILENAME=clickhouse-operator-install-bundle_crds.yaml

# fetch the install bundle, retain only the CRDs
if [ ! -f $CRDS_FILENAME ]; then
    curl -L $OPERATOR_URL | yq eval 'select(.kind == "CustomResourceDefinition")' - > $CRDS_FILENAME
fi

# break up the CRDs into separate json files
IDX=0
while true; do
    filename=$(yq eval "select(documentIndex == ${IDX}) | .spec.group + \"_\" + .spec.names.plural + \".json\"" $CRDS_FILENAME)
    if [ -z "$filename" ]; then
        # end of CRDs
        break
    fi
    echo "-> $filename"
    yq -o=json eval "select(documentIndex == ${IDX})" $CRDS_FILENAME > ${filename}
    IDX=$((IDX+1))
done
