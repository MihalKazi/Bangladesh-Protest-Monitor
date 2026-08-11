// One fixed color per known category key. Hardcoded rather than assigned
// by first-seen order, so the mapping can't drift depending on which
// component (map, legend, list) happens to touch a category first.
const CATEGORY_COLORS = {
  "education-and-student-movements": "#1f6fb2",
  "job-seekers-and-employment-movements": "#c97f1e",
  "professional-employee-and-institutional-movements": "#6a3fb5",
  "social-political-and-rights-based-movements": "#1f8f5f",
  "other-miscellaneous-movements": "#54595f",
  "transport-and-communication-sector-movements": "#d1451f",
  "garment-and-industrial-workers-movements": "#c22a63",
};

const FALLBACK_COLOR = "#3a3f3a";

export function colorForCategory(categoryKey) {
  return CATEGORY_COLORS[categoryKey] || FALLBACK_COLOR;
}
