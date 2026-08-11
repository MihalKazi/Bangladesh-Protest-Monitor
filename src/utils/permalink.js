// Minimal hash-based permalink scheme: #/event/<id>. No router dependency -
// this is a static single-view app, the hash is the only URL state it has.
const HASH_PREFIX = "#/event/";

export function eventIdFromHash(hash) {
  if (!hash || !hash.startsWith(HASH_PREFIX)) return null;
  return decodeURIComponent(hash.slice(HASH_PREFIX.length)) || null;
}

export function hashForEventId(id) {
  return HASH_PREFIX + encodeURIComponent(id);
}

export function setEventIdHash(id) {
  window.location.hash = hashForEventId(id);
}

export function clearEventIdHash() {
  // Drop the hash without adding a new history entry or triggering a jump.
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}
