// src/ledger/notes.js
// Notes live outside the expedition reducer on purpose: typing a note fires a
// change per keystroke, and routing that through the global store would
// re-render the whole chart on every key. Instead each Marginalia owns its
// draft locally and this module just holds the loaded copies + persists.
import { useState } from 'react'
import { scheduleNote } from './client.js'

const notes = new Map()

export function initNotes(obj) {
  for (const [k, v] of Object.entries(obj ?? {})) notes.set(k, v)
}

export const getNote = (key) => notes.get(key) ?? ''
export const allNotes = () => Object.fromEntries(notes)

/**
 * Local draft state, initialised lazily from the loaded notes.
 * The *caller* must key the component by note key: React then gives each
 * lesson a fresh state slot, so we never need an effect to "reset on change".
 */
export function useNote(key, title) {
  const [body, setBody] = useState(() => getNote(key))
  function update(next) {
    setBody(next)
    notes.set(key, next)
    scheduleNote(key, title, next)
  }
  return [body, update]
}
