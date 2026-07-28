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
