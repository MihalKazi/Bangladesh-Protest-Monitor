import { useEffect, useMemo, useRef } from "react";
import { buildDayList } from "../utils/dateRange";

export default function Timeline({
  events,
  eventsByDay,
  selectedDay,
  setSelectedDay,
  playing,
  setPlaying,
  t,
}) {
  const DAYS = useMemo(() => buildDayList(events), [events]);
  const maxDeaths = Math.max(1, ...DAYS.map((d) => eventsByDay[d]?.deaths || 0));
  const intervalRef = useRef(null);
  const activeDotRef = useRef(null);

  useEffect(() => {
    if (!playing) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSelectedDay((prev) => {
        const idx = prev ? DAYS.indexOf(prev) : -1;
        const next = idx + 1 >= DAYS.length ? 0 : idx + 1;
        return DAYS[next];
      });
    }, 700);
    return () => clearInterval(intervalRef.current);
  }, [playing, setSelectedDay, DAYS]);

  useEffect(() => {
    activeDotRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selectedDay]);

  const step = (delta) => {
    setPlaying(false);
    const idx = selectedDay ? DAYS.indexOf(selectedDay) : -1;
    const next = Math.min(Math.max(idx + delta, 0), DAYS.length - 1);
    setSelectedDay(DAYS[next]);
  };

  return (
    <div className="timeline-vertical">
      <button
        className="tv-icon"
        title={t.resetFilter}
        onClick={() => {
          setSelectedDay(null);
          setPlaying(false);
        }}
      >
        ☰
      </button>

      <div className="tv-track">
        {DAYS.map((day) => {
          const deaths = eventsByDay[day]?.deaths || 0;
          const hasEvents = !!eventsByDay[day];
          const isSelected = day === selectedDay;
          const size = hasEvents
            ? 14 + (deaths / maxDeaths) * 20
            : 9;
          return (
            <button
              key={day}
              ref={isSelected ? activeDotRef : null}
              className={`tv-dot ${deaths > 0 ? "has-deaths" : ""} ${
                isSelected ? "selected" : ""
              } ${!hasEvents ? "empty" : ""}`}
              style={{ width: size, height: size }}
              title={day}
              onClick={() => {
                setPlaying(false);
                setSelectedDay(day === selectedDay ? null : day);
              }}
            />
          );
        })}
      </div>

      <div className="tv-nav">
        <button
          className="tv-nav-btn"
          onClick={() => step(-1)}
          aria-label="Previous day"
        >
          ‹
        </button>
        <button
          className="tv-nav-btn"
          onClick={() => setPlaying((p) => !p)}
          aria-label={playing ? t.pause : t.play}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <button
          className="tv-nav-btn"
          onClick={() => step(1)}
          aria-label="Next day"
        >
          ›
        </button>
      </div>
    </div>
  );
}
