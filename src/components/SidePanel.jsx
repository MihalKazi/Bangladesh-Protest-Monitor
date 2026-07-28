export default function SidePanel({
  t,
  lang,
  stats,
  movements,
  selectedMovement,
  setSelectedMovement,
}) {
  return (
    <aside className="side-panel">
      <section>
        <h2>{t.introHeading}</h2>
        <p>{t.introText}</p>
        <div className="sample-notice">{t.sampleNotice}</div>
      </section>

      <section>
        <h2>{t.contextHeading}</h2>
        <p>{t.contextText}</p>
      </section>

      <section>
        <h2>{t.movementHeading}</h2>
        <select
          className="movement-select"
          value={selectedMovement}
          onChange={(e) => setSelectedMovement(e.target.value)}
        >
          <option value="all">{t.movementAll}</option>
          {movements.map((m) => (
            <option key={m.en} value={m.en}>
              {lang === "bn" ? m.bn : m.en}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h2>{t.statsHeading}</h2>
        <div className="stats-grid">
          <div className="stat-tile">
            <div className="stat-value">{stats.protestDays}</div>
            <div className="stat-label">{t.statProtestDays}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{stats.districts}</div>
            <div className="stat-label">{t.statDistricts}</div>
          </div>
          <div className="stat-tile injured">
            <div className="stat-value">{stats.injured.toLocaleString()}</div>
            <div className="stat-label">{t.statInjured}</div>
          </div>
          <div className="stat-tile killed">
            <div className="stat-value">{stats.killed.toLocaleString()}</div>
            <div className="stat-label">{t.statKilled}</div>
          </div>
        </div>
      </section>

      <section>
        <p className="footer-note">{t.footerNote}</p>
      </section>
    </aside>
  );
}
