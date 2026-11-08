// src/store/ExpeditionProvider.jsx
// ---------------------------------------------------------------------------
// Owns the expedition reducer and syncs it to the Ledger.
//
// Two contexts on purpose: components that only *record* events (buttons deep
// in the journal) subscribe to the stable `record` function and never
// re-render when progress changes. Context consumers re-render whenever the
// context *value identity* changes — so splitting read/write is the cheap fix.
// ---------------------------------------------------------------------------
import { createContext, use, useCallback, useEffect, useReducer, useRef } from 'react'
import { expeditionReducer, emptyProgress } from './expedition.js'
import { appendLog, saveProgress } from '../ledger/client.js'
import { summarize } from './derive.js'

const StateCtx = createContext(null)
const RecordCtx = createContext(null)

export function ExpeditionProvider({ initial, children }) {
  const [state, dispatch] = useReducer(expeditionReducer, initial, (init) => ({
    progress: init.progress ?? emptyProgress(),
    log: init.log ?? [],
  }))

  // Stable forever: dispatch identity never changes, so neither does record.
  const record = useCallback((type, payload = {}) => {
    const event = { type, ts: new Date().toISOString(), ...payload }
    dispatch({ type: 'record', event })
    appendLog(event) // side effect lives in the event handler path, not in render
  }, [])

  // Syncing React state -> external system (disk) is exactly what effects are
  // for. Skip the first run: the data we just loaded doesn't need re-saving.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    saveProgress({ ...state.progress, summary: summarize(state.progress, state.log) })
  }, [state.progress, state.log])

  // One session_start per page load. The ref guards StrictMode's dev-only
  // mount -> unmount -> mount, which would otherwise log two sessions.
  const started = useRef(false)
  useEffect(() => {
    if (started.current) return
    started.current = true
    record('session_start')
  }, [record])

  return (
    <RecordCtx value={record}>
      <StateCtx value={state}>{children}</StateCtx>
    </RecordCtx>
  )
}

// React 19: `use(Context)` works like useContext but may be called conditionally.
export const useExpedition = () => use(StateCtx)
export const useRecord = () => use(RecordCtx)
