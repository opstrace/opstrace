FROM fluent/fluentd:v1.11.3-debian-1.0
USER root

# What follows is a combination of instructions for how to customize the
# official fluentd debian image, combined with a technique for building and
# installing a gem from the local file system, for the
# `fluent-plugin-grafana-loki` plugin. Use a 'shallow clone' technique
# (https://stackoverflow.com/a/3489576/145400) to get a specific version
# of that plugin from the grafana/loki repo.
# Note(JP): quite a bit of sweat and tears went into this specific method
# of preparing fluent+plugins, also see history for
# test/test-remote/containers/fluentd/Dockerfile (deleted now)
RUN buildDeps="sudo make gcc g++ libc-dev git" \
   && apt-get update \
   && apt-get install -y --no-install-recommends $buildDeps \
   && oldpath=`pwd` && mkdir /tmp/lokicheckout && cd /tmp/lokicheckout \
   && git init && git remote add origin https://github.com/jgehrcke/loki \
   && git fetch origin 207ebdad69a318d2d81f419fba53ed85d73bd694 \
   && git reset --hard FETCH_HEAD \
   && cd /tmp/lokicheckout/cmd/fluentd/ \
   && gem build fluent-plugin-grafana-loki.gemspec \
   && gem install --ignore-dependencies *gem \
   && gem install fluent-plugin-kubernetes_metadata_filter -v 2.5.2 \
   && sudo gem sources --clear-all \
   && SUDO_FORCE_REMOVE=yes \
   apt-get purge -y --auto-remove \
   -o APT::AutoRemove::RecommendsImportant=false \
   $buildDeps \
   && rm -rf /var/lib/apt/lists/* \
   && rm -rf /tmp/* /var/tmp/* /usr/lib/ruby/gems/*/cache/*.gem

# Require a config file to be mounted into the container.
# To be sure that we don't actually use a default config.
RUN mv /fluentd/etc/fluent.conf /fluentd/etc/fluent.conf.orig.deactivated
