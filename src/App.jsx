import { useMemo, useState } from "react";
import events from "./data/events.json";
import { translations } from "./data/translations";
import SidePanel from "./components/SidePanel";
import MapView from "./components/MapView";
import Timeline from "./components/Timeline";

function App() {
  const [lang, setLang] = useState("en");
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedMovement, setSelectedMovement] = useState("all");
  const [playing, setPlaying] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const t = translations[lang];

  const movements = useMemo(() => {
    const seen = new Map();
    for (const ev of events) {
      if (!seen.has(ev.movement_en)) {
        seen.set(ev.movement_en, { en: ev.movement_en, bn: ev.movement_bn });
      }
    }
    return Array.from(seen.values());
  }, []);

  const movementEvents = useMemo(() => {
    if (selectedMovement === "all") return events;
    return events.filter((ev) => ev.movement_en === selectedMovement);
  }, [selectedMovement]);

  const eventsByDay = useMemo(() => {
    const map = {};
    for (const ev of movementEvents) {
      if (!map[ev.date]) map[ev.date] = { deaths: 0, events: [] };
      map[ev.date].deaths += ev.deaths || 0;
      map[ev.date].events.push(ev);
    }
    return map;
  }, [movementEvents]);

  const stats = useMemo(() => {
    const days = new Set();
    const districts = new Set();
    let injured = 0;
    let killed = 0;
    for (const ev of movementEvents) {
      days.add(ev.date);
      districts.add(ev.district);
      injured += ev.injuries || 0;
      killed += ev.deaths || 0;
    }
    return {
      protestDays: days.size,
      districts: districts.size,
      injured,
      killed,
    };
  }, [movementEvents]);

  const earliestDate = useMemo(() => {
    if (!movementEvents.length) return null;
    return movementEvents.map((e) => e.date).sort()[0];
  }, [movementEvents]);

  const filteredEvents = selectedDay
    ? eventsByDay[selectedDay]?.events || []
    : movementEvents;

  return (
    <div className="app-shell">
      <MapView events={filteredEvents} t={t} lang={lang} />

      <button
        className="hamburger-btn"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open menu"
      >
        <span />
        <span />
        <span />
      </button>

      <div className="top-pill">
        <span className="top-pill-title">{t.title}</span>
        <div className="top-pill-divider" />
        <button
          className="lang-toggle"
          onClick={() => setLang(lang === "en" ? "bn" : "en")}
        >
          {t.langToggle}
        </button>
      </div>

      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)} />
      )}
      <div className={`drawer ${drawerOpen ? "open" : ""}`}>
        <button
          className="drawer-close"
          onClick={() => setDrawerOpen(false)}
          aria-label="Close menu"
        >
          &times;
        </button>
        <SidePanel
          t={t}
          lang={lang}
          stats={stats}
          movements={movements}
          selectedMovement={selectedMovement}
          setSelectedMovement={(m) => {
            setSelectedMovement(m);
            setSelectedDay(null);
            setPlaying(false);
          }}
        />
      </div>

      <div className="stat-card">
        {earliestDate && (
          <div className="stat-card-since">
            {t.statSince} {earliestDate}
          </div>
        )}
        <div className="stat-card-grid">
          <div className="stat-card-item">
            <div className="stat-card-value">{stats.protestDays}</div>
            <div className="stat-card-label">{t.statProtestDays}</div>
          </div>
          <div className="stat-card-item">
            <div className="stat-card-value">{stats.districts}</div>
            <div className="stat-card-label">{t.statDistricts}</div>
          </div>
          <div className="stat-card-item accent">
            <div className="stat-card-value">{stats.injured.toLocaleString()}</div>
            <div className="stat-card-label">{t.statInjured}</div>
          </div>
          <div className="stat-card-item accent">
            <div className="stat-card-value">{stats.killed.toLocaleString()}</div>
            <div className="stat-card-label">{t.statKilled}</div>
          </div>
        </div>
        <button className="stat-card-link" onClick={() => setDrawerOpen(true)}>
          {t.eventListDetails}
        </button>
      </div>

      <Timeline
        events={movementEvents}
        eventsByDay={eventsByDay}
        selectedDay={selectedDay}
        setSelectedDay={setSelectedDay}
        playing={playing}
        setPlaying={setPlaying}
        t={t}
      />
    </div>
  );
}

export default App;
