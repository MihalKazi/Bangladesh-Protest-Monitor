import { MapContainer, TileLayer, Marker, Popup, GeoJSON, Polygon } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import { useRef } from "react";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import boundary from "../data/bangladesh-boundary.json";
import maskBoundary from "../data/bangladesh-mask.json";

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

function radiusForCrowd(crowdSize) {
  if (!crowdSize) return 4;
  const r = Math.sqrt(crowdSize) / 14;
  return Math.min(Math.max(r, 4), 16);
}

function colorForEvent(deaths) {
  return deaths > 0 ? "#a4293a" : "#3d5c4f";
}

function spawnClickEcho(map, latlng, color) {
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
  setTimeout(() => map.removeLayer(echo), 750);
}

function eventIcon(dotRadius, color) {
  const hitSize = Math.max(dotRadius * 2, 26);
  const dotSize = dotRadius * 2;
  return L.divIcon({
    html: `<div style="
      width:${hitSize}px;height:${hitSize}px;display:flex;align-items:center;justify-content:center;
    "><div class="event-marker-dot" style="
      width:${dotSize}px;height:${dotSize}px;border-radius:50%;
      background:${color};border:1px solid ${color};opacity:0.9;
    "></div></div>`,
    className: "event-marker-wrap",
    iconSize: [hitSize, hitSize],
  });
}

function createClusterIcon(cluster) {
  const count = cluster.getChildCount();
  const deaths = cluster
    .getAllChildMarkers()
    .reduce((sum, m) => sum + (m.options.eventDeaths || 0), 0);
  const size = count < 10 ? 28 : count < 50 ? 33 : 38;
  const bg = deaths > 0 ? "#a4293a" : "#3d5c4f";
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:50%;
      background:${bg};color:#f4f2ec;display:flex;align-items:center;justify-content:center;
      font-size:${size > 34 ? 12 : 11}px;font-weight:600;border:1px solid rgba(244,242,236,0.6);
      font-family:Inter,system-ui,sans-serif;
    ">${count}</div>`,
    className: "cluster-marker",
    iconSize: [size, size],
  });
}

export default function MapView({ events, t, lang }) {
  const maskPositions = [OUTER_RING, ...holeRingsFrom(maskBoundary)];
  const mapRef = useRef(null);
  const eventsByIdRef = useRef(new Map());
  eventsByIdRef.current = new Map(events.map((ev) => [ev.id, ev]));

  const handleGroupClickRef = useRef(null);
  handleGroupClickRef.current = (e) => {
    const marker = e.layer;
    const ev = eventsByIdRef.current.get(marker.options.evId);
    if (!ev) return;

    const map = mapRef.current;
    if (!map) return;

    spawnClickEcho(map, [ev.lat, ev.lng], colorForEvent(ev.deaths));

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
      duration: 1.1,
      easeLinearity: 0.25,
    });
  };

  // stable callback-ref identity so React doesn't re-invoke it (and re-bind
  // the click listener) on every re-render
  const clusterGroupRef = useRef((group) => {
    if (!group) return;
    group.on("click", (e) => handleGroupClickRef.current(e));
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
          spiderfyOnMaxZoom={true}
          zoomToBoundsOnClick={true}
          spiderfyDistanceMultiplier={1.6}
          disableClusteringAtZoom={18}
          showCoverageOnHover={false}
        >
          {events.map((ev) => {
            return (
              <Marker
                key={ev.id}
                position={[ev.lat, ev.lng]}
                icon={eventIcon(radiusForCrowd(ev.crowdSize), colorForEvent(ev.deaths))}
                eventDeaths={ev.deaths || 0}
                evId={ev.id}
              >
              <Popup>
                <div className="popup-content">
                  <h3>{ev.location}</h3>
                  <div className="popup-row">
                    <span className="label">{t.popupMovement}</span>
                    <span className="value">
                      {lang === "bn" ? ev.movement_bn : ev.movement_en}
                    </span>
                  </div>
                  <div className="popup-row">
                    <span className="label">{t.popupDate}</span>
                    <span className="value">{ev.date}</span>
                  </div>
                  <div className="popup-row">
                    <span className="label">{t.popupLocation}</span>
                    <span className="value">{ev.district}</span>
                  </div>
                  <div className="popup-row">
                    <span className="label">{t.popupCrowd}</span>
                    <span className="value">
                      {ev.crowdSize?.toLocaleString()}
                    </span>
                  </div>
                  <div className="popup-row">
                    <span className="label">{t.popupDeaths}</span>
                    <span className="value deaths">{ev.deaths}</span>
                  </div>
                  <div className="popup-row">
                    <span className="label">{t.popupInjuries}</span>
                    <span className="value">{ev.injuries}</span>
                  </div>
                  <p className="popup-desc">
                    {lang === "bn" ? ev.description_bn : ev.description_en}
                  </p>
                  {ev.sources?.length > 0 && (
                    <div className="popup-sources">
                      <div className="label">{t.popupSources}</div>
                      {ev.sources.map((s, i) => (
                        <a
                          key={i}
                          href={s}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {s}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
          })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
