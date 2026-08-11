export default function SidePanel({
  t,
  lang,
  stats,
  categories,
  selectedCategory,
  setSelectedCategory,
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
        <h2>{t.categoryHeading}</h2>
        <select
          className="movement-select"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="all">{t.categoryAll}</option>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>
              {lang === "bn" ? c.bn : c.en}
            </option>
          ))}
        </select>
      </section>

      <section>
        <h2>{t.statsHeading}</h2>
        <div className="stats-grid">
          <div className="stat-tile">
            <div className="stat-value">{stats.records}</div>
            <div className="stat-label">{t.statRecords}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{stats.months}</div>
            <div className="stat-label">{t.statMonths}</div>
          </div>
          <div className="stat-tile">
            <div className="stat-value">{stats.categories}</div>
            <div className="stat-label">{t.statCategories}</div>
          </div>
        </div>
      </section>

      <section>
        <p className="footer-note">{t.footerNote}</p>
      </section>
    </aside>
  );
}
