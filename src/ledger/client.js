// src/ledger/client.js
// ---------------------------------------------------------------------------
// Client half of the Ledger. Plain module (not React) on purpose: persistence
// is an *external system*, so React only talks to it through a subscription
// (useSyncExternalStore) and effects — never by stuffing fetch() into render.
//
// Strategy: optimistic UI, debounced writes, localStorage mirror as a fallback
// when the dev server is down. Queued log events are replayed on reconnect.
// ---------------------------------------------------------------------------

const LS_KEY = 'reactnow.ledger.mirror'
const LS_PENDING = 'reactnow.ledger.pendingLog'

/** @typedef {'ok'|'saving'|'offline'} LedgerStatus */

let status = /** @type {LedgerStatus} */ ('ok')
const listeners = new Set()
function setStatus(next) {
  if (status === next) return
  status = next
  listeners.forEach((l) => l())
}
export const ledgerStatus = {
  subscribe(cb) {
    listeners.add(cb)
    return () => listeners.delete(cb)
  },
  get: () => status,
}

function readMirror() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) ?? {}
  } catch {
    return {}
  }
}
function writeMirror(patch) {
  localStorage.setItem(LS_KEY, JSON.stringify({ ...readMirror(), ...patch }))
}

async function req(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status}`)
  return res.json()
}

/**
 * Load everything once at boot. Returns a promise so the app can `use()` it
 * under <Suspense> (React 19) instead of a loading-flag useState dance.
 */
export async function loadLedger() {
  try {
    await flushPendingLog() // replay offline events first so the GET includes them
    const data = await req('GET', '/api/ledger')
    // Notes typed while the server was down are "dirty" in the mirror: they win
    // over the disk copy and get pushed to disk right away.
    const dirty = readMirror().dirtyNotes ?? {}
    const notes = { ...data.notes }
    writeMirror({ progress: data.progress, notes })
    for (const [k, v] of Object.entries(dirty)) {
      notes[k] = v.body
      scheduleNote(k, v.title, v.body)
    }
    return { ...data, notes }
  } catch {
    setStatus('offline')
    const mirror = readMirror()
    const pending = JSON.parse(localStorage.getItem(LS_PENDING) ?? '[]')
    return { progress: mirror.progress ?? null, notes: mirror.notes ?? {}, log: [...(mirror.log ?? []), ...pending] }
  }
}

// ---- progress -------------------------------------------------------------
let progressTimer
export function saveProgress(progress) {
  writeMirror({ progress })
  clearTimeout(progressTimer)
  progressTimer = setTimeout(async () => {
    try {
      setStatus('saving')
      await req('PUT', '/api/progress', progress)
      setStatus('ok')
    } catch {
      setStatus('offline')
    }
  }, 400)
}

// ---- log ------------------------------------------------------------------
async function flushPendingLog() {
  const pending = JSON.parse(localStorage.getItem(LS_PENDING) ?? '[]')
  if (!pending.length) return
  await req('POST', '/api/log', pending)
  localStorage.removeItem(LS_PENDING)
}

export async function appendLog(event) {
  try {
    await flushPendingLog()
    await req('POST', '/api/log', event)
    setStatus('ok')
  } catch {
    const pending = JSON.parse(localStorage.getItem(LS_PENDING) ?? '[]')
    localStorage.setItem(LS_PENDING, JSON.stringify([...pending, event]))
    setStatus('offline')
  }
}

// ---- notes ----------------------------------------------------------------
// One timer per note key: typing in lesson A must not cancel A's pending save
// when you jump to lesson B.
const noteTimers = new Map()
const notePending = new Map()

export function scheduleNote(key, title, body) {
  const mirror = readMirror()
  writeMirror({
    notes: { ...mirror.notes, [key]: body },
    dirtyNotes: { ...mirror.dirtyNotes, [key]: { title, body } },
  })
  notePending.set(key, { title, body })
  clearTimeout(noteTimers.get(key))
  noteTimers.set(key, setTimeout(() => flushNote(key), 800))
}

async function flushNote(key) {
  const payload = notePending.get(key)
  if (!payload) return
  notePending.delete(key)
  noteTimers.delete(key)
  try {
    setStatus('saving')
    await req('PUT', `/api/notes/${key}`, payload)
    const mirror = readMirror()
    const { [key]: _done, ...rest } = mirror.dirtyNotes ?? {}
    writeMirror({ dirtyNotes: rest })
    setStatus('ok')
  } catch {
    setStatus('offline')
  }
}

// Tab hidden / closing: flush immediately instead of waiting for timers.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') return
    for (const key of notePending.keys()) flushNote(key)
  })
}

/** Manual retry button in the offline banner. */
export async function retryLedger() {
  try {
    await flushPendingLog()
    const mirror = readMirror()
    for (const [k, v] of Object.entries(mirror.dirtyNotes ?? {})) scheduleNote(k, v.title, v.body)
    if (mirror.progress) await req('PUT', '/api/progress', mirror.progress)
    setStatus('ok')
  } catch {
    setStatus('offline')
  }
}
