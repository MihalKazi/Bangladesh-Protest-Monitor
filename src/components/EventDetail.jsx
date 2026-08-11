import { titleFor, categoryFor, descriptionFor, isEnFallback } from "../utils/eventText";

// The permalink target (#/event/<id>). Works for every record, including
// the 177 city-precision ones that have no individual pin on the map - the
// list and this panel are how those get reached at all.
export default function EventDetail({ event, t, lang, onClose }) {
  const title = titleFor(event, lang);
  const description = descriptionFor(event, lang);

  return (
    <div className="event-detail-backdrop" onClick={onClose}>
      <div className="event-detail-panel" onClick={(e) => e.stopPropagation()}>
        <button className="event-detail-close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <h2 className="event-detail-title">
          {title}
          {lang === "bn" && isEnFallback(event.title_bn) && (
            <span className="en-only-tag">{t.popupEnOnly}</span>
          )}
        </h2>

        <div className="event-detail-row">
          <span className="label">{t.popupCategory}</span>
          <span className="value">{categoryFor(event, lang)}</span>
        </div>
        <div className="event-detail-row">
          <span className="label">{t.popupDate}</span>
          <span className="value">
            {event.dateLabel}
            {event.datePrecision === "month" && (
              <span className="precision-tag"> ({t.popupMonthOnly})</span>
            )}
          </span>
        </div>
        <div className="event-detail-row">
          <span className="label">{t.popupLocation}</span>
          <span className="value">
            {event.location || event.district}
            {event.geoPrecision === "city" && (
              <span className="precision-tag"> ({t.popupCityPrecisionShort})</span>
            )}
          </span>
        </div>

        {description && (
          <p className="event-detail-desc">
            {description}
            {lang === "bn" && isEnFallback(event.description_bn) && (
              <span className="en-only-tag">{t.popupEnOnly}</span>
            )}
          </p>
        )}

        {event.sources?.length > 0 && (
          <div className="event-detail-sources">
            <div className="label">{t.popupSources}</div>
            {event.sources.map((s, i) =>
              s.url ? (
                <a key={i} href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.name}
                </a>
              ) : (
                <span key={i} className="source-unverified">
                  {s.name} <span className="unverified-tag">({t.popupUnverified})</span>
                </span>
              )
            )}
          </div>
        )}

        <div className="event-detail-permalink">
          {t.eventDetailPermalinkNote}
        </div>
      </div>
    </div>
  );
}
