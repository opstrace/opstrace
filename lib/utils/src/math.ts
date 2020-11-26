/**
 * Copyright 2020 Opstrace, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Returns minimum if value is less than minimum, otherwise returns value
 *
 * @param minimum number
 * @param value number
 */
export const min = (minimum: number, value: number) =>
  value < minimum ? minimum : value;

/**
 * Returns maximum if value is greater than maximum, otherwise returns value
 *
 * @param maximum number
 * @param value number
 */
export const max = (maximum: number, value: number) =>
  value > maximum ? maximum : value;

/**
 * Rounds down to nearest whole number
 *
 * @param value number
 */
export const roundDown = (value: number) => Math.floor(value);

/**
 * Rounds number down to the nearest odd number. If value is an odd number, will return the value,
 * so return value is either value - 1 (if value is event), or value - 0 (if value is odd).
 *
 * @param value number
 */
export const roundDownToOdd = (value: number) => Math.ceil(value - 1) | 1;

type Range = { "<=": number; choose: number };

/**
 * Will find the first range that satisfies: `value <= range["<="]` and returns range.choose for the matched range.
 * e.g.
 *
 * select(2, [{"<=": 1, choose: 1}, {"<=": 3: choose: 5}, {"<=": 5, choose: 10}])
 * > 5
 *
 * select(4, [{"<=": 1, choose: 1}, {"<=": 3: choose: 5}, {"<=": 5, choose: 10}])
 * > 10
 *
 * select(6, [{"<=": 1, choose: 1}, {"<=": 3: choose: 5}, {"<=": 5, choose: 10}])
 * > Error: No range match for value 6
 *
 * * select(4, [{"<=": 1, choose: 1}, {"<=": 3: choose: 5}, {"<=": Infinity, choose: 10}])
 * > 10
 *
 * @param value number
 * @param ranges [{ "<=": number, choose: number }]
 */
export const select = (value: number, ranges: Range[]) => {
  const val = ranges
    // Sort to make sure range is ordered from lowest "<=" to highest "<=".
    .sort((a, b) => a["<="] - b["<="])
    // Then find the first range that satisfies: value <= range["<="]
    .find(r => value <= r["<="]);

  if (!val) {
    throw Error(`No range match for value ${value}`);
  }
  return val.choose;
};
