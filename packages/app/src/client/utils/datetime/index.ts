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

import formatFn from "date-fns/format";

const getLocale = (locale: string): Promise<Locale> =>
  import(`date-fns/locale/${locale}/index.js`);

/**
 * Wraps and lazy loads the locale for date-fns/format
 * @param date
 * @param formatStyle
 * @param locale
 */
export const format = async (
  date: number | Date,
  formatStyle: string,
  locale: string = "en-US"
) => {
  const asyncLocale = await getLocale(locale);
  return formatFn(date, formatStyle, {
    locale: asyncLocale
  });
};
