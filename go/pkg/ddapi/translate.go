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
	"strings"

	json "github.com/json-iterator/go"

	"github.com/prometheus/prometheus/prompb"

	//"github.com/golang/snappy"

	"github.com/prometheus/common/log"
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
// is a JSON null"
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

type ddSeriesFragments struct {
	Fragments []*ddSeriesFragment `json:"series"`
}

var invalidCharRE = regexp.MustCompile(`[^a-zA-Z0-9_:]`)

func sanitizeMetricName(value string) string {
	return invalidCharRE.ReplaceAllString(value, "_")
}

func sanitizeLabelName(value string) string {
	return invalidCharRE.ReplaceAllString(value, "_")
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
	var sfragments ddSeriesFragments
	jerr := json.Unmarshal(doc, &sfragments)
	if jerr != nil {
		return nil, fmt.Errorf("invalid JSON doc: %v", jerr)
	}

	var promTimeSeriesFragments []*prompb.TimeSeries

	for _, fragment := range sfragments.Fragments {

		// Build up label set as a map to ensure uniqueness of keys.
		labels := map[string]string{
			// A time series fragment corresponds to a specific metric with a
			// name. Store this metric name in a reserved Prometheus label.
			"__name__": sanitizeMetricName(fragment.Name),
			"instance": fragment.Host,
			"job":      "ddagent",
			//"host": "host",  // do not set host, that's `instance` in the
			// Prom world.
			"device":           fragment.Device,
			"type":             fragment.Type,
			"source_type_name": fragment.SourceTypeName,
		}

		// Translate dd agent tags into label k/v pairs. Upon unexpected tag
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

		// https://github.com/open-telemetry/opentelemetry-go-contrib/blob/c047d14d67ab6fbd4895c7e57cdd163fc74c9f66/exporters/metric/cortex/cortex.go#L385

		var promSamples []prompb.Sample
		for _, point := range fragment.Points {

			// TODO: think about if `point.Value` should undergo a
			// transformation, depending on the DD metric type (count, rate,
			// gauge) and the `interval` property set in the input ts fragment.
			s := prompb.Sample{
				Value: point.Value,
				// A DD sample timestamp represents seconds since epoch. The
				// prompb.Sample.Timestamp represents milliseconds since epoch.
				Timestamp: point.Timestamp * 1000,
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
