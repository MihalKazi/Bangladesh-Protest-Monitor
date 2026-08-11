# Project Audit — Bangladesh Protest Monitor

Read straight from code (`src/`, `package.json`, `vite.config.js`, git log) 2026-08-10. No changes made.

## 1. What It Is

Single-page map app plotting protest events across Bangladesh (Shahbagh Movement 2013, Quota Reform Movement 2018, July Uprising 2024) as dots on a Leaflet map, filterable by movement and by day via a vertical timeline scrubber with play/pause. Side drawer gives archive context (EN/BN toggle), aggregate stats (protest days, districts affected, injured, killed), and per-event popups with description, sources, casualty counts. Built as a "memorial archive" — framed for public/advocacy viewing, not an internal analytics tool. All 33 records are explicitly labeled sample/placeholder data pending verification (`sampleNotice` in [translations.js](src/data/translations.js), `[SAMPLE DATA]` prefix in every description).

## 2. Stack

| Layer | Choice | Version | Note |
|---|---|---|---|
| Framework | React | ^19.2.7 | current |
| Bundler | Vite | ^8.1.1 | current major |
| Language | JS (JSX), no TypeScript | — | `@types/react`/`@types/react-dom` installed but dead weight — nothing to type without `.ts`/`.tsx` files |
| Styling | Plain CSS, one file (`src/index.css`), CSS custom properties | — | no CSS framework/modules |
| State | React `useState`/`useMemo`, no external state lib | — | fine at this scale |
| Map | Leaflet ^1.9.4 + react-leaflet ^5.0.0 | current | ok pairing |
| Clustering | leaflet.markercluster ^1.5.3 + react-leaflet-cluster ^4.1.3 | — | markercluster hasn't shipped a real release since ~2018; still standard choice, low risk |
| Charting | none | — | no chart lib despite "visual archive" framing — timeline is hand-rolled dots, not a chart |
| Lint | oxlint ^1.71.0 | — | minimal ruleset (2 rules), only checks react-hooks + one react-refresh-style rule |
| i18n | hand-rolled `translations.js` object | — | no library, EN/BN only |

Flags:
- `@types/react`, `@types/react-dom` in devDependencies but codebase is pure `.jsx` — unused given no TS compiler runs against them.
- No test runner, no CI config, no `.env` handling — none needed yet but worth knowing before scaling data ingestion.
- `dist/` is committed-looking build output sitting in repo root (has `dist/assets/*.js/css`) — check `.gitignore` covers it (it does list common ignores, verify `dist` explicitly if you don't want stale builds tracked).

## 3. Structure

```
index.html                        Vite entry, loads Google Fonts (Inter, Noto Serif Bengali)
vite.config.js                    Bare — just @vitejs/plugin-react, no aliases/env
.oxlintrc.json                    2 active rules only
package.json                      deps as above
src/
  main.jsx                        ReactDOM root, StrictMode wrapper
  App.jsx                         Top-level state: lang, selectedDay, selectedMovement, playing, drawerOpen.
                                   Derives movements list, filtered events, per-day aggregation, stats — all inline useMemo, no separate state/store file.
  index.css                       Entire design system + component styles in one file (~680 lines)
  components/
    MapView.jsx                   Leaflet map, markers, clustering, custom spiderfy ring math, click-echo animation, boundary/mask overlays
    SidePanel.jsx                 Drawer content: about text, movement filter select, stats grid
    Timeline.jsx                  Vertical day-scrubber with autoplay
  utils/
    dateRange.js                  buildDayList / shortDayLabel / formatDateLabel — shortDayLabel unused (see below)
  data/
    events.json                   33 sample protest records (the actual dataset)
    translations.js                EN/BN strings
    bangladesh-boundary.json      GeoJSON outline, drawn as green border
    bangladesh-mask.json          GeoJSON used to darken everything outside Bangladesh (inverse mask via giant outer ring + holes)
public/favicon.svg
dist/                             Committed build output (stale artifact, not source — shouldn't need to read/edit this)
```

Dead/leftover:
- `shortDayLabel` in [dateRange.js](src/utils/dateRange.js) — exported, never imported anywhere (Timeline builds its own day labels via the `title` attribute using raw date strings). Left over from an earlier UI iteration.
- `dist/` folder — stale prebuilt bundle sitting in version control next to source; not "dead code" but is committed build output that will drift from source silently.
- One lint warning: `spawnClickEcho`'s `.forEach((delay, i) => ...)` in [MapView.jsx:77](src/components/MapView.jsx#L77) — `i` param unused, harmless.

## 4. Data

Lives at [src/data/events.json](src/data/events.json), imported directly as a static ES module (`import events from "./data/events.json"` in [App.jsx:2](src/App.jsx#L2)) — no fetch, no API, no build step transforms it. Vite inlines it at build time.

**Count:** 33 records total, across 3 movements (July Uprising 2024, Quota Reform Movement 2018, Shahbagh Movement 2013).

**Shape** (real sample record):
```json
{
  "id": "sample-01",
  "date": "2024-07-01",
  "district": "Dhaka",
  "location": "Dhaka University (Shahbagh)",
  "lat": 23.734,
  "lng": 90.3927,
  "crowdSize": 3000,
  "deaths": 0,
  "injuries": 5,
  "description_en": "[SAMPLE DATA] Students begin 'Bangla Blockade' sit-ins...",
  "description_bn": "[নমুনা তথ্য] শিক্ষার্থীরা কোটা ব্যবস্থার প্রতিবাদে...",
  "sources": ["https://example.com/source1"],
  "movement_en": "July Uprising 2024",
  "movement_bn": "জুলাই অভ্যুত্থান ২০২৪"
}
```
Every single record's `sources` field points at `example.com` — placeholder URLs, not real citations. Every description is prefixed `[SAMPLE DATA]`/`[নমুনা তথ্য]`. This is fabricated placeholder content, not scraped/researched real data — treat nothing in here as factual.

**Path from file → screen:**
1. `events.json` imported once in `App.jsx`.
2. `App.jsx` derives, in `useMemo` blocks: unique movement list, movement-filtered event list, per-day aggregation map (`eventsByDay`: deaths sum + event array), running stats (protest days / districts / injured / killed), earliest date, and finally `filteredEvents` (further narrowed by `selectedDay` if set).
3. `filteredEvents` passed to `MapView` as `events` prop → rendered as Leaflet markers inside a cluster group.
4. Full `movementEvents` (day-unfiltered) passed to `Timeline`, which calls `buildDayList` (in `dateRange.js`) to generate a contiguous day array between earliest/latest date (fills gaps with empty dots) and sizes each dot by that day's death count.

**Normalising/parsing:** minimal — no schema validation, no date parsing library (raw `YYYY-MM-DD` strings compared/sorted as strings, or parsed as UTC midnight in `dateRange.js` via `new Date(dateStr + "T00:00:00Z")`). No defensive checks for malformed records — `ev.deaths || 0` and `ev.injuries || 0` are the only guards, everywhere else fields are trusted as present (`ev.lat`, `ev.lng`, `ev.date`, `ev.district` used unchecked).

## 5. Features

**Finished and working:**
- Map render with clustering, custom concentric-ring spiderfy (deliberately reimplemented over the library default), color-coded markers (red = has deaths, green = none), crowd-size-scaled radius.
- Click interactions: fly-to zoom on marker/cluster click, click echo/ghost animation, cluster drill-down logic that falls back to spiderfy when zooming can't split markers further.
- Day timeline with autoplay (700ms/day), manual step buttons, click-to-select day, gap-filled empty days.
- Movement filter (dropdown), resets day selection on change.
- EN/BN language toggle — fully wired, all UI strings and event bilingual fields swap live.
- Stats aggregation (protest days / districts / injured / killed) — both in drawer and floating bottom-left card.
- Bangladesh boundary outline + darkened-outside-border mask overlay.
- Responsive breakpoint at 820px (stat card, timeline width adjust).

**Half done / rough:**
- Data is 33 hand-authored placeholder rows, not a real dataset or pipeline — there's no ingestion path (CSV/API/CMS) for adding real records; someone has to hand-edit JSON.
- No error/loading states anywhere — assumes `events.json` always present and well-formed.
- No routing — single view, drawer is the only "other page."
- No tests of any kind.
- `shortDayLabel` util written and abandoned mid-iteration.
- No accessibility pass beyond a few `aria-label`s on icon buttons; popups/stat cards have no keyboard nav consideration.

**Placeholder / hardcoded:**
- Every event's `sources` array → `example.com` — not real citations.
- `sampleNotice`/`footerNote` strings explicitly say data is unverified sample.
- Map center/zoom (`BD_CENTER`, zoom 7) hardcoded for Bangladesh only — nothing generalized.
- Cluster ring math constants (`RING_BASE_RADIUS`, `RING_GAP`, `RING_MARKER_SPAN`) tuned by eye, no config surface.

## 6. Map

- **Library:** Leaflet via `react-leaflet` v5, clustering via `react-leaflet-cluster` wrapping `leaflet.markercluster`.
- **Basemap:** CARTO's `light_all` raster tiles over OpenStreetMap data (free, no API key, rate-limited by CARTO's public policy — fine for low traffic, would need a paid tile provider or self-hosting at real scale).
- **Marker/cluster logic:** custom `iconCreateFunction` colors clusters red/green by aggregate deaths, sizes by count. Custom-overridden `_generatePointsCircle` (monkeypatches `L.MarkerCluster.prototype` globally at module load — this is a global mutation of the leaflet.markercluster library, not scoped to this map instance; if the app ever renders two independent cluster groups with different ring needs, this becomes a footgun). Click handling manually drives `flyTo` with custom easing instead of relying on library defaults, plus a hand-rolled decision tree (walk down single-child cluster chains) to decide spiderfy vs. zoom.
- **Coordinates:** `lat`/`lng` hardcoded per-record in `events.json`, presumably manually looked up — no geocoding step in the app.
- **Boundary/mask:** two separate local GeoJSON files (~50KB and ~63KB) — boundary drawn as outline, mask used as an inverted "spotlight" (world-covering polygon minus Bangladesh's holes) to darken everything outside the country.

**Adding a second dataset/layer:** moderately easy structurally, moderately annoying practically.
- Easy part: `MapContainer` accepts arbitrary additional layers; you could add another `MarkerClusterGroup` or `GeoJSON` layer alongside the existing one with little friction — react-leaflet composition supports this natively.
- Annoying part: the click-handling, icon logic (`eventIcon`, `colorForEvent`, `radiusForCrowd`), and the global marker-cluster monkeypatch are all written directly against the one event shape and one cluster group (`clusterGroupRef` closure references `eventsByIdRef`/`handleGroupClickRef` tied to a single dataset). A second dataset would need its own copies of these handlers/refs, or a refactor to parameterize `MapView` by layer. The global `_generatePointsCircle` override is shared state — a second cluster group with different visual needs would silently reuse the same ring geometry function since it's patched onto the shared prototype, not passed in per-instance.

## 7. Design System

Real, consistent, single-source. All tokens defined once in `:root` in `index.css`:
- **Colors:** dark theme base (`--bg`, `--bg-panel`, `--bg-raised`, `--border`/`--border-soft`), text tiers (`--text`/`--text-dim`/`--text-faint`), semantic accents (`--red` for deaths/injured, `--green` for neutral markers, `--gold` for links/selected state), plus a separate light-panel palette (`--panel-light`, `--text-light`, etc.) used for the floating chrome (hamburger, top pill, stat card, popups) which sits on a light background over the map while the drawer uses the dark palette — intentional dual-theme split, not accidental drift.
- **Type scale:** documented 1.125 ratio, 7 steps (`--fs-micro` through `--fs-xl`), commented with px equivalents and intended use per step.
- **Spacing scale:** 4px-base, 6 steps (`--sp-1`–`--sp-6`), used consistently throughout instead of magic numbers.
- **Components:** no component library, but consistent BEM-ish class naming (`.stat-card`, `.stat-card-item`, `.stat-card-value`) reused across drawer stats and floating stat card — same visual pattern, two contexts, not duplicated ad hoc.

This is a real, disciplined system for a prototype — better than typical prototype CSS. One file, ~680 lines, no framework, but tokens are genuinely used rather than declared and ignored.

## 8. State of the Code

- **Build:** clean. `vite build` succeeds, only warning is expected bundle-size notice (533KB JS, mostly Leaflet+React — normal for this stack, no code-splitting configured).
- **Lint:** `oxlint` passes with exactly one warning — unused `i` param in [MapView.jsx:77](src/components/MapView.jsx#L77) forEach callback. Ruleset is minimal (2 rules enabled) so this isn't a strong signal of overall quality — it wouldn't catch much.
- **Type errors:** none possible — no TypeScript in use despite `@types/*` packages present.
- **Runtime/console:** not verified live in a browser as part of this audit (no server was started); nothing in the source suggests runtime errors — no unguarded `undefined` access patterns beyond the untrusted-field-shape gaps noted in section 4.
- **What would bite you extending this:**
  - The global `L.MarkerCluster.prototype._generatePointsCircle` override (section 6) — surprising and easy to forget is global state, not local to one map instance.
  - No data validation layer — a malformed future record (missing `lat`/`lng`/`date`) will silently break rendering or produce `NaN` positions, not throw a helpful error.
  - Single 680-line CSS file with no scoping — safe now because there's one page, but will get harder to extend cleanly with more views.
  - No tests — any refactor of the cluster-click decision tree or day-aggregation logic in `App.jsx` has no safety net.

## 9. Verdict

Good base to extend, not a throwaway. The design system is real and disciplined, the map interaction layer (clustering, spiderfy, fly-to) is more thought-through than typical prototype code, and the data flow is simple and easy to reason about (one JSON import, a few `useMemo`s, no over-engineering). Build's clean, lint's clean, dependencies are current.

What would actually slow you down if you build straight on top of it, in order:
1. **No real data pipeline.** The entire dataset is 33 hand-written placeholder rows with `example.com` sources. Before this is a real archive you need an actual ingestion path — CSV import, CMS, or at minimum a documented schema + validation step. This is the biggest gap, not a code problem.
2. **Global monkeypatch on markercluster's prototype.** Fine with one dataset/one map. The moment you add a second layer or dataset with different clustering visuals, this bites — refactor to pass ring config through `iconCreateFunction`/instance options instead of a global prototype override.
3. **No validation at the data boundary.** Once real estate contributes data instead of you hand-writing it, a missing field will produce silent breakage (NaN marker positions) instead of a clear error. Add a thin schema check (even a manual field-presence guard) before this scales past one contributor.

None of these are rewrite-from-scratch problems — they're "harden before scaling" problems. I'd keep the map layer, the design tokens, and the App state-derivation pattern as-is, and spend the next effort on (a) a real data schema/pipeline and (b) decoupling the cluster-click logic from the global prototype so a second layer is safe to add.
