const relativeTimeFormatter = new Intl.RelativeTimeFormat("ja", {
  numeric: "auto",
});

const timeFormatter = new Intl.DateTimeFormat("ja-JP", {
  hour: "2-digit",
  minute: "2-digit",
});

const SECOND_MS = 1_000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const MONTH_MS = 30 * DAY_MS;
const YEAR_MS = 365 * DAY_MS;

export function formatRelativeTime(dateText: string) {
  const elapsedMs = new Date(dateText).getTime() - Date.now();
  const absElapsedMs = Math.abs(elapsedMs);

  if (absElapsedMs < MINUTE_MS) {
    return relativeTimeFormatter.format(Math.round(elapsedMs / SECOND_MS), "second");
  }

  if (absElapsedMs < HOUR_MS) {
    return relativeTimeFormatter.format(Math.round(elapsedMs / MINUTE_MS), "minute");
  }

  if (absElapsedMs < DAY_MS) {
    return relativeTimeFormatter.format(Math.round(elapsedMs / HOUR_MS), "hour");
  }

  if (absElapsedMs < MONTH_MS) {
    return relativeTimeFormatter.format(Math.round(elapsedMs / DAY_MS), "day");
  }

  if (absElapsedMs < YEAR_MS) {
    return relativeTimeFormatter.format(Math.round(elapsedMs / MONTH_MS), "month");
  }

  return relativeTimeFormatter.format(Math.round(elapsedMs / YEAR_MS), "year");
}

export function formatTime(dateText: string) {
  return timeFormatter.format(new Date(dateText));
}
