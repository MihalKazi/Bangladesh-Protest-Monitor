import { colorForCategory } from "../utils/categoryColors";

export default function Legend({ categories, lang, selectedCategory, setSelectedCategory, t }) {
  return (
    <div className="legend">
      <div className="legend-title">{t.legendTitle}</div>
      {categories.map((c) => (
        <button
          key={c.key}
          className={`legend-item ${selectedCategory === c.key ? "active" : ""}`}
          onClick={() =>
            setSelectedCategory(selectedCategory === c.key ? "all" : c.key)
          }
        >
          <span className="legend-swatch" style={{ background: colorForCategory(c.key) }} />
          {lang === "bn" ? c.bn : c.en}
        </button>
      ))}
    </div>
  );
}
