import { useMemo, useState } from "react";
import { titleFor } from "../utils/eventText";
import { formatMonthLabel } from "../utils/dateRange";

// The category filter lives one level up (SidePanel), shared with the map.
// This adds the two filters that only make sense for browsing a list: which
// month, and whether a record has a linked source.
export default function EventList({ t, lang, events, onSelectEvent }) {
  const [month, setMonth] = useState("all");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const months = useMemo(() => {
    const set = new Set(events.map((ev) => ev.date.slice(0, 7)));
    return Array.from(set).sort();
  }, [events]);

  const filtered = useMemo(() => {
    return events
      .filter((ev) => month === "all" || ev.date.slice(0, 7) === month)
      .filter((ev) => !verifiedOnly || ev.verified)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [events, month, verifiedOnly]);

  return (
    <section className="event-list-section">
      <h2>{t.eventListHeading}</h2>

      <div className="event-list-filters">
        <select
          className="movement-select"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        >
          <option value="all">{t.eventListAllMonths}</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {formatMonthLabel(m)}
            </option>
          ))}
        </select>

        <label className="event-list-verified-toggle">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
          />
          {t.eventListVerifiedOnly}
        </label>
      </div>

      <div className="event-list-count">
        {t.eventListShowing} {filtered.length}
      </div>

      <div className="event-list">
        {filtered.map((ev) => (
          <button
            key={ev.id}
            className="event-list-item"
            onClick={() => onSelectEvent(ev.id)}
          >
            <div className="event-list-item-title">{titleFor(ev, lang)}</div>
            <div className="event-list-item-meta">
              {ev.dateLabel} · {lang === "bn" ? ev.category_bn : ev.category_en}
              {!ev.verified && (
                <span className="unverified-tag"> · {t.popupUnverified}</span>
              )}
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="event-list-empty">{t.eventListEmpty}</div>
        )}
      </div>
    </section>
  );
}
