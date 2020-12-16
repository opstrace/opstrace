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

import moment from "moment";

export const SECOND = 1000;

function isToday(momentDate: moment.Moment) {
  const yesterday = moment().clone().startOf("day");
  return momentDate.isSame(yesterday, "d");
}

function isYesterday(momentDate: moment.Moment) {
  const yesterday = moment().clone().subtract(1, "days").startOf("day");
  return momentDate.isSame(yesterday, "d");
}

export function timeAgo(timestamp: number, DWMY_timeAgo = true): string {
  const momentDate = moment.unix(timestamp);
  const dateTime = {
    seconds: moment().diff(momentDate, "seconds"),
    minutes: moment().diff(momentDate, "minutes"),
    hours: moment().diff(momentDate, "hours"),
    days: moment().diff(momentDate, "days"),
    weeks: moment().diff(momentDate, "weeks"),
    months: moment().diff(momentDate, "months"),
    years: moment().diff(momentDate, "years"),
    today: isToday(momentDate),
    yesterday: isYesterday(momentDate),
    dayName: momentDate.format("dddd"),
    fullDateTime: momentDate.format("LLLL"),
    date: momentDate.format("LL"),
    time: momentDate.format("LT"),
    calendar: momentDate.calendar()
  };

  const datetime = dateTime.date + " at " + dateTime.time;
  let outputTime = "";

  if (dateTime.seconds > 0) {
    outputTime = "1 Second ago";
  }
  if (dateTime.seconds > 1) {
    outputTime = dateTime.seconds + " Seconds ago";
  }

  if (dateTime.minutes === 1) {
    outputTime = "1 Minute ago";
  }
  if (dateTime.minutes > 1) {
    outputTime = dateTime.minutes + " Minutes ago";
  }

  if (dateTime.hours === 1) {
    outputTime = "1 hour ago";
  }
  if (dateTime.hours > 1) {
    outputTime = dateTime.hours + " hours ago";
  }

  if (dateTime.days === 1) {
    if (DWMY_timeAgo) {
      outputTime = "1 Day ago";
    } else {
      outputTime = datetime;
    }
  }
  if (dateTime.days > 1) {
    if (DWMY_timeAgo) {
      outputTime = dateTime.days + " Days ago";
    } else {
      outputTime = datetime;
    }
  }

  if (dateTime.weeks === 1) {
    if (DWMY_timeAgo) {
      outputTime = dateTime.weeks + " Week";
    } else {
      outputTime = datetime;
    }
  }
  if (dateTime.weeks > 1) {
    if (DWMY_timeAgo) {
      outputTime = dateTime.weeks + " Weeks";
    } else {
      outputTime = datetime;
    }
  }
  if (dateTime.months === 1) {
    if (DWMY_timeAgo) {
      outputTime = "1 Month ago";
    } else {
      outputTime = datetime;
    }
  }
  if (dateTime.months > 1) {
    if (DWMY_timeAgo) {
      outputTime = dateTime.months + " Months ago";
    } else {
      outputTime = datetime;
    }
  }

  if (dateTime.years === 1) {
    if (DWMY_timeAgo) {
      outputTime = "1 Year ago";
    } else {
      outputTime = datetime;
    }
  }
  if (dateTime.years > 1) {
    if (DWMY_timeAgo) {
      outputTime = dateTime.years + " Years ago";
    } else {
      outputTime = datetime;
    }
  }

  if (dateTime.yesterday) {
    outputTime = dateTime.calendar;
  }

  return outputTime;
}
