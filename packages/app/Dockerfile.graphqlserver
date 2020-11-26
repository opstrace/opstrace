FROM hasura/graphql-engine:v1.3.3.cli-migrations-v2

# Copy over our current migration and metadata files
# The image in the FROM statement has an entrypoint that will
# first apply migration and metadata updates before running
# the command at the end of this file.
COPY metadata /hasura-metadata/
COPY migrations /hasura-migrations/

EXPOSE 8080

CMD graphql-engine \
    --database-url $HASURA_GRAPHQL_DATABASE_URL \
    serve \
    --server-port 8080