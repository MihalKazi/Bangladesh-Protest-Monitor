// title_bn / description_bn are null on every interim record (the dataset
// is English-only) - these fall back to the English field and let callers
// know a fallback happened so they can show an "EN only" indicator instead
// of silently rendering blank text.
export function titleFor(ev, lang) {
  if (lang === "bn") return ev.title_bn || ev.title_en;
  return ev.title_en;
}

export function categoryFor(ev, lang) {
  if (lang === "bn") return ev.category_bn || ev.category_en;
  return ev.category_en;
}

export function descriptionFor(ev, lang) {
  if (lang === "bn") return ev.description_bn || ev.description_en;
  return ev.description_en;
}

export function isEnFallback(field_bn) {
  return !field_bn;
}
