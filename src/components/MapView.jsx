import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polygon } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import boundary from "../data/bangladesh-boundary.json";
import maskBoundary from "../data/bangladesh-mask.json";
import { titleFor, categoryFor, descriptionFor, isEnFallback } from "../utils/eventText";
import { colorForCategory } from "../utils/categoryColors";

// Replace leaflet.markercluster's default spiderfy layout with clean,
// evenly-spaced concentric rings around the cluster (like Sudan Protest
// Monitor's spread) instead of a mechanical grid or lopsided spiral.
const RING_BASE_RADIUS = 46;
const RING_GAP = 38;
const RING_MARKER_SPAN = 34;

L.MarkerCluster.prototype._generatePointsCircle = function (count, centerPt) {
  const points = [];
  let placed = 0;
  let radius = RING_BASE_RADIUS;

  while (placed < count) {
    const circumference = 2 * Math.PI * radius;
    const capacity = Math.max(
      1,
      Math.min(count - placed, Math.floor(circumference / RING_MARKER_SPAN))
    );
    for (let i = 0; i < capacity; i++) {
      const angle = (2 * Math.PI * i) / capacity - Math.PI / 2;
      points.push(
        centerPt.add(
          new L.Point(radius * Math.cos(angle), radius * Math.sin(angle))
        )
      );
    }
    placed += capacity;
    radius += RING_GAP;
  }

  return points;
};

const BD_CENTER = [23.685, 90.3563];

const OUTER_RING = [
  [-90, -180],
  [-90, 180],
  [90, 180],
  [90, -180],
];

function holeRingsFrom(geojson) {
  const geom = geojson.features[0].geometry;
  const polygons = geom.type === "Polygon" ? [geom.coordinates] : geom.coordinates;
  const rings = [];
  for (const poly of polygons) {
    const outer = poly[0];
    rings.push(outer.map(([lng, lat]) => [lat, lng]));
  }
  return rings;
}

// This dataset carries no crowd-size or casualty figures (see
// dataset.hasCrowdData / hasCasualtyData), so marker radius is fixed - only
// color varies, by category, since that's the one dimension the data has.
const MARKER_RADIUS = 6;
const NEUTRAL_COLOR = "#a4293a";

function spawnClickEcho(map, latlng, color) {
  // two staggered rings for a richer "energy leaving" feel, plus a
  // lingering ghost dot that fades out slowly to read as a motion trace
  [0, 160].forEach((delay, i) => {
    setTimeout(() => {
      const icon = L.divIcon({
        html: `<div class="click-echo" style="border-color:${color};"></div>`,
        className: "click-echo-wrap",
        iconSize: [1, 1],
      });
      const echo = L.marker(latlng, {
        icon,
        interactive: false,
        keyboard: false,
        zIndexOffset: -500,
      }).addTo(map);
      setTimeout(() => map.removeLayer(echo), 1100);
    }, delay);
  });

  const ghostIcon = L.divIcon({
    html: `<div class="click-ghost" style="background:${color};"></div>`,
    className: "click-ghost-wrap",
    iconSize: [1, 1],
  });
  const ghost = L.marker(latlng, {
    icon: ghostIcon,
    interactive: false,
    keyboard: false,
    zIndexOffset: -600,
  }).addTo(map);
  setTimeout(() => map.removeLayer(ghost), 1600);
}

function eventIcon(dotRadius, color) {
  const hitSize = Math.max(dotRadius * 2, 26);
  const dotSize = dotRadius * 2;
  return L.divIcon({
    html: `<div style="
      width:${hitSize}px;height:${hitSize}px;display:flex;align-items:center;justify-content:center;
    "><div class="event-marker-dot" style="
      width:${dotSize}px;height:${dotSize}px;border-radius:50%;
      background:${color};border:1.5px solid #f4f2ec;box-shadow:0 0 0 1px rgba(0,0,0,0.35);
    "></div></div>`,
    className: "event-marker-wrap",
    iconSize: [hitSize, hitSize],
  });
}

function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 28 : count < 50 ? 33 : 38;
  // A cluster mixes categories, so it can't carry one category's color
  // without misrepresenting the others inside it - stays neutral.
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${NEUTRAL_COLOR};color:#f4f2ec;display:flex;align-items:center;justify-content:center;
      font-size:${size > 34 ? 12 : 11}px;font-weight:600;border:1px solid rgba(244,242,236,0.6);
      font-family:Inter,system-ui,sans-serif;
    ">${count}</div>`,
    className: "cluster-marker",
    iconSize: [size, size],
  });
}

// Records with geoPrecision "city" carry no named venue - they all share one
// central Dhaka coordinate. Spiderfying or clustering them individually
// would fabricate positional precision the data doesn't have, so they never
// enter the MarkerClusterGroup: one static marker, labelled with the count,
// opens a popup listing the underlying records instead.
function cityAggregateIcon(count) {
  return L.divIcon({
    html: `<div style="
      width:34px;height:34px;border-radius:6px;
      background:${NEUTRAL_COLOR};color:#f4f2ec;display:flex;align-items:center;justify-content:center;
      font-size:11px;font-weight:600;border:1px solid rgba(244,242,236,0.6);
      font-family:Inter,system-ui,sans-serif;
    ">${count}</div>`,
    className: "cluster-marker",
    iconSize: [34, 34],
  });
}

export default function MapView({ events, t, lang, onOpenEvent }) {
  const maskPositions = [OUTER_RING, ...holeRingsFrom(maskBoundary)];
  const pinnedEvents = events.filter((ev) => ev.geoPrecision !== "city");
  const cityEvents = events.filter((ev) => ev.geoPrecision === "city");
  const mapRef = useRef(null);
  const eventsByIdRef = useRef(new Map());
  eventsByIdRef.current = new Map(pinnedEvents.map((ev) => [ev.id, ev]));

  // Re-frame the view on whatever the current filter actually shows, rather
  // than staying pinned to the fixed Bangladesh-wide zoom regardless of
  // whether the filtered set is 300 records or 3.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const points = [
      ...pinnedEvents.map((ev) => [ev.lat, ev.lng]),
      ...(cityEvents.length ? [[cityEvents[0].lat, cityEvents[0].lng]] : []),
    ];
    if (!points.length) return;
    const bounds = L.latLngBounds(points);
    map.flyToBounds(bounds, { padding: [48, 48], maxZoom: 14, duration: 1.2 });
  }, [events]);

  const clusterGroupInstanceRef = useRef(null);

  const handleGroupClickRef = useRef(null);
  handleGroupClickRef.current = (e) => {
    const marker = e.layer;
    const ev = eventsByIdRef.current.get(marker.options.evId);
    if (!ev) return;

    const map = mapRef.current;
    if (!map) return;

    spawnClickEcho(map, [ev.lat, ev.lng], colorForCategory(ev.categoryKey));

    const el = marker.getElement && marker.getElement();
    const dot = el && el.querySelector(".event-marker-dot");
    if (dot) {
      dot.classList.remove("event-marker-dot-pulse");
      void dot.offsetWidth;
      dot.classList.add("event-marker-dot-pulse");
    }

    const currentZoom = map.getZoom();
    const targetZoom = Math.min(Math.max(currentZoom, 13), currentZoom + 4);
    map.flyTo([ev.lat, ev.lng], targetZoom, {
      duration: 2,
      easeLinearity: 0.08,
    });
  };

  const handleClusterClickRef = useRef(null);
  handleClusterClickRef.current = (e) => {
    const map = mapRef.current;
    if (!map) return;
    const cluster = e.layer;

    const currentZoom = map.getZoom();
    const maxZoom = map.getMaxZoom();
    const childCount = cluster.getChildCount();

    // A 100+ leg spiderfy ring is unreadable - past that count, always zoom
    // instead of fanning out. Below it, spiderfy is legible and consistent
    // regardless of whether the cluster's immediate children are raw
    // markers or sub-clusters (fan out sub-cluster badges, click again to
    // go a level deeper).
    const SPIDERFY_LIMIT = 100;
    const tooBigToSpiderfy = childCount > SPIDERFY_LIMIT;

    if (currentZoom >= maxZoom) {
      // No room left to fly - flying to the same spot/zoom is a no-op and
      // never fires moveend, so act immediately instead of waiting.
      if (!tooBigToSpiderfy) cluster.spiderfy();
      return;
    }

    if (tooBigToSpiderfy) {
      // Zoom toward this cluster's own bounds so it actually breaks apart,
      // capped since getBoundsZoom on a near-zero-area cluster can report
      // more room than really exists.
      const boundsZoom = map.getBoundsZoom(cluster.getBounds());
      const targetZoom = Math.min(boundsZoom, currentZoom + 4, maxZoom);
      map.flyTo(cluster.getLatLng(), Math.max(targetZoom, currentZoom + 1), {
        duration: 1.6,
        easeLinearity: 0.08,
      });
      return;
    }

    // markercluster auto-unspiderfies on movestart/zoomstart, so spiderfying
    // before/during a flyTo gets cancelled by that same fly's own
    // movestart. A zoom change also rebuilds the whole cluster tree, so the
    // `cluster` object captured on click can be stale by the time the fly
    // lands - spiderfying it then is a no-op on a detached layer. Re-resolve
    // the cluster containing this marker at the new zoom, and only spiderfy
    // once the fly has actually landed.
    const representativeMarker = cluster.getAllChildMarkers()[0];
    const group = clusterGroupInstanceRef.current;
    map.once("moveend", () => {
      const current = group?.getVisibleParent?.(representativeMarker);
      if (current && current.spiderfy) current.spiderfy();
      else cluster.spiderfy();
    });
    map.flyTo(cluster.getLatLng(), Math.max(currentZoom, 15), {
      duration: 1.2,
      easeLinearity: 0.08,
    });
  };

  // stable callback-ref identity so React doesn't re-invoke it (and re-bind
  // the click listener) on every re-render
  const clusterGroupRef = useRef((group) => {
    if (!group) return;
    clusterGroupInstanceRef.current = group;
    group.on("click", (e) => handleGroupClickRef.current(e));
    group.on("clusterclick", (e) => handleClusterClickRef.current(e));
  }).current;

  return (
    <div className="map-wrap">
      <MapContainer
        ref={mapRef}
        center={BD_CENTER}
        zoom={7}
        minZoom={6}
        maxZoom={18}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          maxZoom={18}
        />

        <Polygon
          positions={maskPositions}
          pathOptions={{
            stroke: false,
            fillColor: "#2b3138",
            fillOpacity: 0.45,
          }}
          interactive={false}
        />

        <GeoJSON
          data={boundary}
          style={{ color: "#006A4E", weight: 2, fillOpacity: 0 }}
          interactive={false}
        />

        <MarkerClusterGroup
          ref={clusterGroupRef}
          chunkedLoading
          iconCreateFunction={createClusterIcon}
          maxClusterRadius={60}
          spiderfyOnMaxZoom={false}
          zoomToBoundsOnClick={false}
          circleSpiralSwitchover={Infinity}
          disableClusteringAtZoom={18}
          showCoverageOnHover={false}
          animate={false}
        >
          {pinnedEvents.map((ev) => {
            const title = titleFor(ev, lang);
            const description = descriptionFor(ev, lang);
            return (
              <Marker
                key={ev.id}
                position={[ev.lat, ev.lng]}
                icon={eventIcon(MARKER_RADIUS, colorForCategory(ev.categoryKey))}
                evId={ev.id}
              >
              <Popup>
                <div className="popup-content">
                  <h3>
                    {title}
                    {lang === "bn" && isEnFallback(ev.title_bn) && (
                      <span className="en-only-tag">{t.popupEnOnly}</span>
                    )}
                  </h3>
                  <div className="popup-row">
                    <span className="label">{t.popupCategory}</span>
                    <span className="value">{categoryFor(ev, lang)}</span>
                  </div>
                  <div className="popup-row">
                    <span className="label">{t.popupDate}</span>
                    <span className="value">
                      {ev.dateLabel}
                      {ev.datePrecision === "month" && (
                        <span className="precision-tag"> ({t.popupMonthOnly})</span>
                      )}
                    </span>
                  </div>
                  <div className="popup-row">
                    <span className="label">{t.popupLocation}</span>
                    <span className="value">{ev.location || ev.district}</span>
                  </div>
                  {description && (
                    <p className="popup-desc">
                      {description}
                      {lang === "bn" && isEnFallback(ev.description_bn) && (
                        <span className="en-only-tag">{t.popupEnOnly}</span>
                      )}
                    </p>
                  )}
                  {ev.sources?.length > 0 && (
                    <div className="popup-sources">
                      <div className="label">{t.popupSources}</div>
                      {ev.sources.map((s, i) =>
                        s.url ? (
                          <a
                            key={i}
                            href={s.url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {s.name}
                          </a>
                        ) : (
                          <span key={i} className="source-unverified">
                            {s.name}{" "}
                            <span className="unverified-tag">
                              ({t.popupUnverified})
                            </span>
                          </span>
                        )
                      )}
                    </div>
                  )}
                  <button
                    className="popup-permalink-btn"
                    onClick={() => onOpenEvent(ev.id)}
                  >
                    {t.popupPermalink}
                  </button>
                </div>
              </Popup>
            </Marker>
          );
          })}
        </MarkerClusterGroup>

        {cityEvents.length > 0 && (
          <Marker
            position={[cityEvents[0].lat, cityEvents[0].lng]}
            icon={cityAggregateIcon(cityEvents.length)}
          >
            <Popup>
              <div className="popup-content city-agg-popup">
                <h3>{t.popupCityPrecision}</h3>
                <div className="city-agg-list">
                  {cityEvents.map((ev) => (
                    <button
                      key={ev.id}
                      className="city-agg-item"
                      onClick={() => onOpenEvent(ev.id)}
                    >
                      <div className="city-agg-item-title">{titleFor(ev, lang)}</div>
                      <div className="city-agg-item-meta">
                        {ev.dateLabel} · {categoryFor(ev, lang)}
                        {!ev.verified && (
                          <span className="unverified-tag"> · {t.popupUnverified}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
