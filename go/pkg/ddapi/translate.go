// Copyright 2021 Opstrace, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package ddapi

import (
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"

	json "github.com/json-iterator/go"
	"github.com/prometheus/common/log"
	"github.com/prometheus/prometheus/prompb"
)

type ddPoint struct {
	Timestamp int64
	Value     float64
}

// In the expected JSON document structure, an individual sample/point is
// provided as a 2-tuple via an array. For example: [1610032230, 0.1]. One
// can't just `json.Unmarshal()` an array into a struct. Use a custom
// deserialization method for `ddPoint`, to strictly check the length of the n
// tuple (array) and types of its elements. Kudos to
// https://eagain.net/articles/go-json-array-to-struct/  -- relevant docs: "To
// unmarshal JSON into a value implementing the Unmarshaler interface,
// Unmarshal calls that value's UnmarshalJSON method, including when the input
// is a JSON null".
func (p *ddPoint) UnmarshalJSON(buf []byte) error {
	dp := []interface{}{&p.Timestamp, &p.Value}

	if err := json.Unmarshal(buf, &dp); err != nil {
		return err
	}

	if len(dp) != 2 {
		return fmt.Errorf("unexpected length pf `points` array: %d (expected 2)", len(dp))
	}

	return nil
}

type ddSeriesFragment struct {
	Name           string    `json:"metric"`
	Points         []ddPoint `json:"points"`
	Tags           []string  `json:"tags"`
	Host           string    `json:"host"`
	Device         string    `json:"device,omitempty"`
	Type           string    `json:"type"`
	Interval       int64     `json:"interval"`
	SourceTypeName string    `json:"source_type_name,omitempty"`
}

// Type corresponding to JSON document structure expected to be POSTed to
// /api/v1/series.
type ddSeriesFragmentsSubmitBody struct {
	Fragments []*ddSeriesFragment `json:"series"`
}

type ddServiceCheck struct {
	Name      string   `json:"check"`
	Hostname  string   `json:"host_name"`
	Timestamp int64    `json:"timestamp"`
	Status    int64    `json:"status"`
	Message   string   `json:"message"`
	Tags      []string `json:"tags"`
}

// Type corresponding to JSON document structure expected to be POSTed to
// /api/v1/check_run.
type ddServiceChecksSubmitBody []*ddServiceCheck

var metricNameinvalidCharRE = regexp.MustCompile(`[^a-zA-Z0-9_:]`)

func sanitizeMetricName(value string) string {
	return metricNameinvalidCharRE.ReplaceAllString(value, "_")
}

func sanitizeLabelName(value string) string {
	return metricNameinvalidCharRE.ReplaceAllString(value, "_")
}

func TranslateDDCheckRunJSON(doc []byte) ([]*prompb.TimeSeries, error) {
	// Attempt to deserialize entire JSON document, using the type definitions
	// above.
	var checkupdates ddServiceChecksSubmitBody
	jerr := json.Unmarshal(doc, &checkupdates)
	if jerr != nil {
		return nil, fmt.Errorf("invalid JSON doc: %v", jerr)
	}

	promTimeSeriesFragments := make([]*prompb.TimeSeries, 0, len(checkupdates))
	for _, checkupdate := range checkupdates {
		// Build up label set as a map to ensure uniqueness of keys.
		labels := map[string]string{
			// A time series fragment corresponds to a specific metric with a
			// name. Store this metric name in the corresponding (reserved)
			// Prometheus label. Replace disallowed characters with
			// underscores; this typically affects the . separators.
			"__name__": sanitizeMetricName(checkupdate.Name),
			// In the Prometheus world, host is 'instance'. Maybe also add
			// `host` label later again carrying the same value. For now, try
			// to keep cardinality minimal.
			"instance": checkupdate.Hostname,
			"job":      "ddagent",
			// Do not store message as label value for now. This creates a
			// separate time series for the same service check -- which is
			// not the simplest thing we can do for starters. Instead, document
			// that the `message` associated with a service check gauge update
			// is not entering the system. A reasonable limitation for the
			// initiatal state.
			// "message": checkupdate.Message,
		}

		// As we would (for now) otherwise drop the mesasge, be nice and at
		// least log the message when status is non-zero (indicating a
		// problem).
		if checkupdate.Status > 0 && checkupdate.Message != "" {
			log.Infof(
				"Message for check %s with status %v (timestamp: %v): %s",
				checkupdate.Name,
				checkupdate.Status,
				checkupdate.Timestamp,
				checkupdate.Message,
			)
		}

		// Translate tags into label k/v pairs. Upon unexpected tag
		// structure, log a warning but otherwise proceed. Examples:
		// `check:memory`, check:cpu
		for _, tag := range checkupdate.Tags {
			t := strings.SplitN(tag, ":", 2)

			if len(t) != 2 {
				log.Warnf("Invalid tag %s for check: %s", tag, checkupdate.Name)
				continue
			}

			// Prefix the tag name so that the source of this label is known
			// (and can be queried for, with guarantees) and so that it can't
			// override an "important" label, such as "instance".
			tname := "ddtag_" + sanitizeLabelName(t[0])
			tvalue := t[1]
			labels[tname] = tvalue
		}

		// Create slice from `labels` map, with values being of type
		// prompb.Label. For `prompb.TimeSeries` construction below. Skip
		// prompb.Label construction for empty values (for example,
		// `fragment.Device` may be empty).
		promLabelset := make([]*prompb.Label, 0, len(labels))
		for k, v := range labels {
			if len(v) == 0 {
				continue
			}

			l := prompb.Label{
				Name:  k,
				Value: v,
			}
			promLabelset = append(promLabelset, &l)
		}

		// Inspiration from
		// https://github.com/open-telemetry/opentelemetry-go-contrib/blob/v0.15.0/exporters/metric/cortex/cortex.go#L385

		// Note that every service check update comes with a status value of 0,
		// 1, 2 or 3 and with a timestamp. Consider this to be the data point
		// we want to store. That is, expect precisely one data point.

		promSamples := make([]prompb.Sample, 0, 1)
		s := prompb.Sample{
			Value: float64(checkupdate.Status),
			// A DD sample timestamp represents seconds since epoch. The
			// prompb.Sample.Timestamp represents milliseconds since epoch.
			Timestamp: checkupdate.Timestamp * 1000,
		}
		promSamples = append(promSamples, s)

		// Construct the Prometheus protobuf time series fragment, comprised of
		// a set of labels and a set of samples.
		pts := prompb.TimeSeries{
			Samples: promSamples,
			Labels:  promLabelset,
		}

		promTimeSeriesFragments = append(promTimeSeriesFragments, &pts)
	}
	return promTimeSeriesFragments, nil
}

/*

Expected input JSON document structure: a set of time series fragments
that the DD agent POSTs to /api/v1/series. Example:

{
  "series": [
    {
      "metric": "datadog.trace_agent.trace_writer.traces",
      "points": [
        [
          1610032230,
          0
        ],
        ...
      ],
      "tags": [
        "version:7.24.1"
      ],
      "host": "x1carb6",
      "type": "rate",
      "interval": 10
    },
    {
      "metric": "datadog.dogstatsd.client.metrics",
      "points": [
    ...
    }
  ]
}

Note that each object in the `series` array is a time series fragment for a
specific metric. Each metric is defined by its name and other meta data (think:
labels). The time series fragment is comprised of one or multiple data points /
samples.
*/
func TranslateDDSeriesJSON(doc []byte) ([]*prompb.TimeSeries, error) {
	// Attempt to deserialize entire JSON document, using the type definitions
	// above including the custom deserialization function
	// ddPoint.UnmarshalJSON().
	var sfragments ddSeriesFragmentsSubmitBody
	jerr := json.Unmarshal(doc, &sfragments)
	if jerr != nil {
		return nil, fmt.Errorf("invalid JSON doc: %v", jerr)
	}

	promTimeSeriesFragments := make([]*prompb.TimeSeries, 0, len(sfragments.Fragments))
	for _, fragment := range sfragments.Fragments {
		// Build up label set as a map to ensure uniqueness of keys.
		labels := map[string]string{
			// A time series fragment corresponds to a specific metric with a
			// name. Store this metric name in the corresponding (reserved)
			// Prometheus label. Replace disallowed characters with
			// underscores; this typically affects the . separators. Some DD
			// metrics have a special noindex name prefix (example:
			// n_o_i_n_d_e_x.datadog.agent.payload.dropped) -- remove that.
			"__name__": sanitizeMetricName(strings.TrimPrefix(fragment.Name, "n_o_i_n_d_e_x.")),
			// In the Prometheus world, host is 'instance'. Maybe also add
			// `host` label later again carrying the same value. For now, try
			// to keep cardinality minimal.
			"instance":         fragment.Host,
			"job":              "ddagent",
			"device":           fragment.Device,
			"type":             fragment.Type,
			"source_type_name": fragment.SourceTypeName,
		}

		// One goal is to keep cardinality minimal, i.e. to not set useless
		// labels. That implies removing the `interval` label for DD metrics of
		// type gauge (where interval isn't well defined). Another goal is to
		// remove all interval values of 0 (which isn't well defined). In code,
		// it looks like only the latter needs to be done -- satisfies the
		// other goals, too.
		if fragment.Interval != 0 {
			labels["interval"] = strconv.FormatInt(fragment.Interval, 10)
		}

		// Translate DD agent tags into label k/v pairs. Upon unexpected tag
		// structure, log a warning but otherwise proceed.
		for _, tag := range fragment.Tags {
			t := strings.SplitN(tag, ":", 2)

			if len(t) != 2 {
				log.Warnf("Invalid tag %s for metric: %s", tag, fragment.Name)
				continue
			}

			// Prefix the tag name so that the source of this label is known
			// (and can be queried for, with guarantees) and so that it can't
			// override an "important" label, such as "instance".
			tname := "ddtag_" + sanitizeLabelName(t[0])
			tvalue := t[1]
			labels[tname] = tvalue
		}

		// Create slice from `labels` map, with values being of type
		// prompb.Label. For `prompb.TimeSeries` construction below. Skip
		// prompb.Label construction for empty values (for example,
		// `fragment.Device` may be empty).
		promLabelset := make([]*prompb.Label, 0, len(labels))
		for k, v := range labels {
			if len(v) == 0 {
				continue
			}

			l := prompb.Label{
				Name:  k,
				Value: v,
			}
			promLabelset = append(promLabelset, &l)
		}

		// Inspiration from
		// https://github.com/open-telemetry/opentelemetry-go-contrib/blob/v0.15.0/exporters/metric/cortex/cortex.go#L385

		// Handle special case of fragment.Points being of zero length: simply
		// drop this fragment.
		if len(fragment.Points) == 0 {
			log.Debugf("No samples in fragment, skip: %v", labels)
			continue
		}

		// log.Infof("fragment samples: %v", fragment.Points)

		// Note(JP): assume and require that `fragment.Points` contains samples
		// in strict descending time order, i.e. the first sample being the
		// newest. This is what the DD agent is expected to send. Update(JP):
		// with Datadog Agent v7.24.1 I've seen ascending order, too. Don't
		// assume anything. Sort the input.  The Prometheus `prompb.TimeSeries`
		// construct seems to require `Samples` in strict ascending order, with
		// the newest sample being last.
		sort.Slice(fragment.Points, func(i, j int) bool {
			// Sort ascendingly in time: newest sample last. Allow adjacent
			// samples to have equivalent timestamp (for now, not sure if
			// that's allowed by Prometheus / Cortex). Might want to use stable
			// sort instead to make sure that when adjacent samples have equal
			// timestamps that the sort behavior does not change between http
			// requests.
			return fragment.Points[i].Timestamp < fragment.Points[j].Timestamp
		})
		// log.Infof("fragment samples sorted: %v", fragment.Points)

		promSamples := make([]prompb.Sample, 0, len(fragment.Points))

		for _, p := range fragment.Points {
			// TODO: think about if `point.Value` should undergo a
			// transformation, depending on the DD metric type (count, rate,
			// gauge) and the `interval` property set in the input ts fragment.
			s := prompb.Sample{
				Value: p.Value,
				// A DD sample timestamp represents seconds since epoch. The
				// prompb.Sample.Timestamp represents milliseconds since epoch.
				Timestamp: p.Timestamp * 1000,
			}

			promSamples = append(promSamples, s)
		}

		// Construct the Prometheus protobuf time series fragment, comprised of
		// a set of labels and a set of samples.
		pts := prompb.TimeSeries{
			Samples: promSamples,
			Labels:  promLabelset,
		}

		promTimeSeriesFragments = append(promTimeSeriesFragments, &pts)
	}
	return promTimeSeriesFragments, nil
}
