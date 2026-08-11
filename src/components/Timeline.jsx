import { useEffect, useMemo, useRef } from "react";
import { buildDayList, buildMonthList, formatMonthLabel, granularityFor } from "../utils/dateRange";

export default function Timeline({
  events,
  eventsByPeriod,
  selectedPeriod,
  setSelectedPeriod,
  playing,
  setPlaying,
  t,
}) {
  const granularity = useMemo(() => granularityFor(events), [events]);
  const PERIODS = useMemo(
    () => (granularity === "month" ? buildMonthList(events) : buildDayList(events)),
    [events, granularity]
  );
  const maxCount = Math.max(1, ...PERIODS.map((p) => eventsByPeriod[p]?.events.length || 0));
  const intervalRef = useRef(null);
  const activeDotRef = useRef(null);

  useEffect(() => {
    if (!playing) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSelectedPeriod((prev) => {
        const idx = prev ? PERIODS.indexOf(prev) : -1;
        const next = idx + 1 >= PERIODS.length ? 0 : idx + 1;
        return PERIODS[next];
      });
    }, 700);
    return () => clearInterval(intervalRef.current);
  }, [playing, setSelectedPeriod, PERIODS]);

  useEffect(() => {
    activeDotRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedPeriod]);

  const step = (delta) => {
    setPlaying(false);
    const idx = selectedPeriod ? PERIODS.indexOf(selectedPeriod) : -1;
    const next = Math.min(Math.max(idx + delta, 0), PERIODS.length - 1);
    setSelectedPeriod(PERIODS[next]);
  };

  const labelFor = (period) => (granularity === "month" ? formatMonthLabel(period) : period);

  return (
    <div className="timeline-vertical">
      <button
        className="tv-icon"
        title={t.resetFilter}
        onClick={() => {
          setSelectedPeriod(null);
          setPlaying(false);
        }}
      >
        ☰
      </button>

      <div className="tv-track">
        {PERIODS.map((period) => {
          const count = eventsByPeriod[period]?.events.length || 0;
          const hasEvents = !!eventsByPeriod[period];
          const isSelected = period === selectedPeriod;
          const size = hasEvents ? 14 + (count / maxCount) * 20 : 9;
          return (
            <button
              key={period}
              ref={isSelected ? activeDotRef : null}
              className={`tv-dot ${isSelected ? "selected" : ""} ${!hasEvents ? "empty" : ""}`}
              style={{ width: size, height: size }}
              title={labelFor(period)}
              onClick={() => {
                setPlaying(false);
                setSelectedPeriod(period === selectedPeriod ? null : period);
              }}
            />
          );
        })}
      </div>

      <div className="tv-nav">
        <button className="tv-nav-btn" onClick={() => step(-1)} aria-label="Previous">
          ‹
        </button>
        <button
          className="tv-nav-btn"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? t.pause : t.play}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <button className="tv-nav-btn" onClick={() => step(1)} aria-label="Next">
          ›
        </button>
      </div>
    </div>
  );
}
