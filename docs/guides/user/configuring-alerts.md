# Configuring Alertmanager

BEFORE YOU START: *If you haven't used Prometheus Alertmanager before, we recommend checking out [their documentation](https://prometheus.io/docs/alerting/latest/alertmanager).*
*Opstrace uses [Cortex](https://cortexmetrics.io) which adds support for scaling and multiple tenants on top of Prometheus.*

Opstrace supports configuring Alertmanager rules and alert outputs on a per-tenant basis.
For example, you might have an alerting rule that metric `X` must be less than `5`, and an Alertmanager configuration to send a Slack message when the rule is failing.
This can all be visualized and edited with the new unified alerting in Grafana 8.

The ability to configure additional datasources for alerts is the other dramatic change in Grafana 8, allowing other providers to leverage the Grafana UI for alerts.
(The original Grafana alerts—now called "legacy alerts"—is still the default.)
Opstrace comes configured with Cortex and Loki as Grafana alert datasources.
This guide will focus on the UI because it is the most visual and self-explanatory.
The APIs are of course still available for anyone who would like to post changes directly there.

To begin, from the Opstrace UI, first select your tenant and then click "Alerting" in the sidebar:

![alerting page overview](../../assets/alerts-overview.gif)

## Configure an Alert Rule

[Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/) allow you to define alert conditions based on the [Prometheus expression language](https://prometheus.io/docs/prometheus/latest/querying/basics/).
Whenever the alert expression results in one or more vector elements at a given point in time, the alert counts as active for these elements' label sets.

To configure a rule, the UI will lead you through the following steps:

### Step 1: Describe the alert

Describe information about the alert, such as the name and type.
Select "Cortex/Loki" as the type (instead of Grafana) and then select "metrics" datasource.
You can choose the namespace and group to organize your alerts.

![describe the alert](../../alerts-rules-1-describe.png)

### Step 2: Create a query

Create a query to be alerted on.  This query should include a condition that, when true, will trigger the alert.

```text
api_success_rate{pod="myapp-1"} < 0.95
```

### Step 3: Define alert conditions

The expression from step #2 has to be true for this long for the alert to be fired.

![define alert conditions](../../alert-rules-3-define.png)

### Step 4: Add details for your alert

Add useful information to your alert, so when it comes in you can more quickly understand its meaning.
For example, provide a summary and description of the alert so anybody can understand what the alert means.
If you have it, a link to the runbook can make it faster to triage.

![add alert details](../../alert-rules-4-details.png)

See the whole thing in action:

TODO GIF

## Configure a Contact Point

TODO

## Configure a Notification Policy

TODO

## Silencing an Alert

Under the *Silences* tab...

1. First, select `alertmanager` from the *Choose alert manager*" drop-down.
2. Click the *New Silence* button.
3. Select the start and end date in *Silence start and end* to indicate when the silence should go into effect and expire.
4. Optionally, update the *Duration* to alter the time for the end of silence in the previous step to correspond to the start plus the duration.
5. Enter one or more matching labels by filling out the *Name* and *Value* fields. Matchers determine which rules the silence will apply to.
6. Optionally enter a comment.
7. Optionally edit the name of the owner in *Creator*.
8. Click *Create*.

![create silences example](../../assets/alerts-silences-define.png)

You can inspect your created silences on the same tab:

![inspect existing alerts](../../assets/alerts-silences-inspect.png)

Note:  Silences cannot be deleted manually; expired silences are automatically deleted after 5 days.

Attribution: some content was borrowed from [Grafana's documentation](https://github.com/grafana/grafana/blob/32b74e75a30a253602c630728d46ef2ae141d2c3/docs/sources/alerting/unified-alerting/silences.md#add-a-silence) itself.

## References

* [Grafana 8 Alerts](https://grafana.com/docs/grafana/latest/alerting/unified-alerting/)
* [Prometheus Alertmanager](https://www.prometheus.io/docs/alerting/latest/alertmanager)
* [Cortex Scalable Alertmanager](https://cortexmetrics.io/docs/proposals/scalable-alertmanager)
* [Alertmanager Configuration](https://www.prometheus.io/docs/alerting/latest/configuration)
* [Recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules)
* [Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules)
