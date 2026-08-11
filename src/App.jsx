import { useEffect, useMemo, useState } from "react";
import dataset from "./data/events.interim-2024-2025.json";
import { translations } from "./data/translations";
import { granularityFor, periodKeyFor } from "./utils/dateRange";
import { eventIdFromHash, setEventIdHash, clearEventIdHash } from "./utils/permalink";
import SidePanel from "./components/SidePanel";
import MapView from "./components/MapView";
import Timeline from "./components/Timeline";
import EventList from "./components/EventList";
import EventDetail from "./components/EventDetail";
import Legend from "./components/Legend";

const events = dataset.events;
const eventsById = new Map(events.map((ev) => [ev.id, ev]));

function App() {
  const [lang, setLang] = useState("en");
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [playing, setPlaying] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(() => eventIdFromHash(window.location.hash));
  const t = translations[lang];

  // Permalinks are the only URL state this app has: #/event/<id>. Keep the
  // hash and the open detail view in sync in both directions (typed/shared
  // link -> opens detail; closing detail -> clears the hash).
  useEffect(() => {
    const onHashChange = () => setSelectedEventId(eventIdFromHash(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const openEvent = (id) => setEventIdHash(id);
  const closeEvent = () => {
    clearEventIdHash();
    setSelectedEventId(null);
  };

  const categories = useMemo(() => {
    const seen = new Map();
    for (const ev of events) {
      if (!seen.has(ev.categoryKey)) {
        seen.set(ev.categoryKey, { key: ev.categoryKey, en: ev.category_en, bn: ev.category_bn });
      }
    }
    return Array.from(seen.values());
  }, []);

  const categoryEvents = useMemo(() => {
    if (selectedCategory === "all") return events;
    return events.filter((ev) => ev.categoryKey === selectedCategory);
  }, [selectedCategory]);

  const granularity = useMemo(() => granularityFor(categoryEvents), [categoryEvents]);

  const eventsByPeriod = useMemo(() => {
    const map = {};
    for (const ev of categoryEvents) {
      const key = periodKeyFor(ev, granularity);
      if (!map[key]) map[key] = { events: [] };
      map[key].events.push(ev);
    }
    return map;
  }, [categoryEvents, granularity]);

  // Casualty/crowd fields are null for every record in this dataset (see
  // dataset.hasCasualtyData / hasCrowdData) - stats below report only what
  // the data actually contains, never a derived zero.
  const stats = useMemo(() => {
    const months = new Set();
    const cats = new Set();
    for (const ev of categoryEvents) {
      months.add(ev.date.slice(0, 7));
      cats.add(ev.categoryKey);
    }
    return {
      records: categoryEvents.length,
      months: months.size,
      categories: cats.size,
    };
  }, [categoryEvents]);

  const earliestDate = useMemo(() => {
    if (!categoryEvents.length) return null;
    return categoryEvents.map((e) => e.date).sort()[0];
  }, [categoryEvents]);

  const filteredEvents = selectedPeriod
    ? eventsByPeriod[selectedPeriod]?.events || []
    : categoryEvents;

  const selectedEvent = selectedEventId ? eventsById.get(selectedEventId) : null;

  const onCategoryChange = (c) => {
    setSelectedCategory(c);
    setSelectedPeriod(null);
    setPlaying(false);
  };

  return (
    <div className="app-shell">
      <MapView events={filteredEvents} t={t} lang={lang} onOpenEvent={openEvent} />

      <Legend
        t={t}
        lang={lang}
        categories={categories}
        selectedCategory={selectedCategory}
        setSelectedCategory={onCategoryChange}
      />

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
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={onCategoryChange}
        />
        <EventList
          t={t}
          lang={lang}
          events={categoryEvents}
          onSelectEvent={openEvent}
        />
      </div>

      {selectedEvent && (
        <EventDetail event={selectedEvent} t={t} lang={lang} onClose={closeEvent} />
      )}

      <div className="stat-card">
        {earliestDate && (
          <div className="stat-card-since">
            {t.statSince} {earliestDate}
          </div>
        )}
        <div className="stat-card-grid">
          <div className="stat-card-item">
            <div className="stat-card-value">{stats.records}</div>
            <div className="stat-card-label">{t.statRecords}</div>
          </div>
          <div className="stat-card-item">
            <div className="stat-card-value">{stats.months}</div>
            <div className="stat-card-label">{t.statMonths}</div>
          </div>
          <div className="stat-card-item">
            <div className="stat-card-value">{stats.categories}</div>
            <div className="stat-card-label">{t.statCategories}</div>
          </div>
        </div>
        <button className="stat-card-link" onClick={() => setDrawerOpen(true)}>
          {t.eventListDetails}
        </button>
      </div>

      <Timeline
        events={categoryEvents}
        eventsByPeriod={eventsByPeriod}
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        playing={playing}
        setPlaying={setPlaying}
        t={t}
      />
    </div>
  );
}

export default App;
