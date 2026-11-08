// src/router/useHashRoute.js
// ---------------------------------------------------------------------------
// A whole router in ~30 lines. The URL hash is an external mutable source, so
// the correct React primitive is useSyncExternalStore — it subscribes to
// `hashchange` and reads a snapshot during render. No useEffect+useState mirror
// (that pattern renders once with stale data, then again; and can tear under
// concurrent rendering).
//
// Routes:  #/            atlas
//          #/p1          region survey of phase p1
//          #/p1/props    field journal for lesson "props" in p1
//          #/p1/brief    surveyor's brief of p1 (what you'll learn, and why)
//          #/p1/gate     checkpoint gate of p1
//          #/log         captain's log
// ---------------------------------------------------------------------------
import { useSyncExternalStore } from 'react'

function subscribe(cb) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}
// Snapshot must be a primitive (or cached) — returning a fresh object every
// call would make React think the store changed on every render -> infinite loop.
const getHash = () => window.location.hash

export function parseRoute(hash) {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  if (parts[0] === 'log') return { view: 'log' }
  if (!parts[0]) return { view: 'atlas' }
  if (!parts[1]) return { view: 'region', phaseId: parts[0] }
  if (parts[1] === 'gate') return { view: 'gate', phaseId: parts[0] }
  if (parts[1] === 'brief') return { view: 'brief', phaseId: parts[0] }
  return { view: 'lesson', phaseId: parts[0], lessonId: parts[1] }
}

export function useHashRoute() {
  const hash = useSyncExternalStore(subscribe, getHash)
  // Parsing a string is cheap; deriving during render beats storing route state.
  return parseRoute(hash)
}

export function navigate(path) {
  window.location.hash = path.startsWith('#') ? path : `#${path}`
}
