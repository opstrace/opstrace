## GitHub issue labels defined in code

`github-issue-labels.yaml` defines the set of labels we want to use in `opstrace/opstrace`.

We use [github-label-sync](https://github.com/Financial-Times/github-label-sync) for syncing the state defined in said configuration file with the repository's state.

Example invocation and output, for updating an existing label after changing the config file:

```text
$ ./node_modules/.bin/github-label-sync --labels opstrace-labels.yaml opstrace/opstrace
Syncing labels for "opstrace/opstrace"
Fetching labels from GitHub
 > Changed: the "area: ui" label in the repo is out of date. It will be updated to "area: ui/app stack" with color "#d4c5f9".
Applying label changes, please wait…
Labels updated
```

We could have CI execute this so that a pull request with a change to this config file takes effect immediately, driven by our CI.
This is also why I chose to put the config file into `ci/` for now/
For starters, however, let's run this program manually.

I suggest the following procedure:

1) A label config file change is proposed with a pull request and discussed among us
2) As part of the pull request we show the dry run output.
3) After merge, we run the actual sync and update the PR with the output.


Example output for a dry run:

```text
$ ./node_modules/.bin/github-label-sync  --dry-run --labels opstrace-labels.yaml opstrace/opstrace
Syncing labels for "opstrace/opstrace"
Fetching labels from GitHub
 > Missing: the "type: bug" label is missing from the repo. It will be created.
 > Missing: the "type: ci-instability" label is missing from the repo. It will be created.
 > Missing: the "priority: 0" label is missing from the repo. It will be created.
 > Missing: the "type: bump" label is missing from the repo. It will be created.
 > Missing: the "type: devprod" label is missing from the repo. It will be created.
 > Missing: the "type: code cleanup" label is missing from the repo. It will be created.
 > Missing: the "type: security" label is missing from the repo. It will be created.
 > Missing: the "type: task" label is missing from the repo. It will be created.
 > Missing: the "type: feature" label is missing from the repo. It will be created.
 > Missing: the "area: ui" label is missing from the repo. It will be created.
 > Missing: the "area: cli" label is missing from the repo. It will be created.
 > Missing: the "area: test-remote" label is missing from the repo. It will be created.
 > Missing: the "area: installer" label is missing from the repo. It will be created.
 > Missing: the "area: uninstaller" label is missing from the repo. It will be created.
 > Missing: the "area: controller" label is missing from the repo. It will be created.
 > Missing: the "area: ci" label is missing from the repo. It will be created.
 > Missing: the "area: docs" label is missing from the repo. It will be created.
 > Missing: the "thinktank: proposal" label is missing from the repo. It will be created.
 > Missing: the "thinktank: feedback" label is missing from the repo. It will be created.
 > Missing: the "thinktank: question" label is missing from the repo. It will be created.
 > Missing: the "state: backlog" label is missing from the repo. It will be created.
 > Missing: the "state: wontdo" label is missing from the repo. It will be created.
 > Missing: the "state: invalid" label is missing from the repo. It will be created.
 > Missing: the "state: in-progress" label is missing from the repo. It will be created.
 > Added: the "backlog" label in the repo is not expected. It will be deleted.
 > Added: the "bug" label in the repo is not expected. It will be deleted.
 > Added: the "documentation" label in the repo is not expected. It will be deleted.
 > Added: the "duplicate" label in the repo is not expected. It will be deleted.
 > Added: the "enhancement" label in the repo is not expected. It will be deleted.
 > Added: the "good first issue" label in the repo is not expected. It will be deleted.
 > Added: the "help wanted" label in the repo is not expected. It will be deleted.
 > Added: the "in progress" label in the repo is not expected. It will be deleted.
 > Added: the "invalid" label in the repo is not expected. It will be deleted.
 > Added: the "p0" label in the repo is not expected. It will be deleted.
 > Added: the "question" label in the repo is not expected. It will be deleted.
 > Added: the "wontfix" label in the repo is not expected. It will be deleted.
This is a dry run. No changes have been made on GitHub
```
