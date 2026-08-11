export function buildDayList(events) {
  if (!events.length) return [];
  const dates = events.map((e) => e.date).sort();
  const start = new Date(dates[0] + "T00:00:00Z");
  const end = new Date(dates[dates.length - 1] + "T00:00:00Z");
  const days = [];
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

// A day-by-day scrubber is only legible over a short span. Past a threshold,
// bucket by month instead of rendering hundreds of cramped dots - and
// because ~a third of this dataset only knows its month anyway, day-level
// scrubbing over a long range would imply false precision besides being
// unusable.
const MONTH_BUCKET_THRESHOLD_DAYS = 60;

export function granularityFor(events) {
  if (events.length < 2) return "day";
  const dates = events.map((e) => e.date).sort();
  const start = new Date(dates[0] + "T00:00:00Z");
  const end = new Date(dates[dates.length - 1] + "T00:00:00Z");
  const spanDays = (end - start) / 86400000;
  return spanDays > MONTH_BUCKET_THRESHOLD_DAYS ? "month" : "day";
}

export function periodKeyFor(ev, granularity) {
  return granularity === "month" ? ev.date.slice(0, 7) : ev.date;
}

export function buildMonthList(events) {
  if (!events.length) return [];
  const months = events.map((e) => e.date.slice(0, 7)).sort();
  const [startY, startM] = months[0].split("-").map(Number);
  const [endY, endM] = months[months.length - 1].split("-").map(Number);
  const list = [];
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    list.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return list;
}

export function formatMonthLabel(monthStr) {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

export function shortDayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.getUTCDate();
}

export function formatDateLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
