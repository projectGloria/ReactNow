// src/main.jsx
import { StrictMode, Suspense, use } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/parchment.css'
import { loadLedger } from './ledger/client.js'
import { initNotes } from './ledger/notes.js'
import { ExpeditionProvider } from './store/ExpeditionProvider.jsx'
import { App } from './App.jsx'

// Kick off loading *before* React renders, at module scope. Creating the
// promise inside a component would create a new promise on every render and
// `use()` would suspend forever. One promise, created once, read by use().
const ledgerPromise = loadLedger().then((data) => {
  initNotes(data.notes)
  return data
})

function Boot() {
  const initial = use(ledgerPromise) // suspends until the journal is read
  return (
    <ExpeditionProvider initial={initial}>
      <App />
    </ExpeditionProvider>
  )
}

function Unrolling() {
  return <div className="unrolling">Unrolling the chart…</div>
}

// HMR: editing a non-component module (content, store) bubbles up and
// re-executes this file. Calling createRoot twice on one container corrupts
// both trees, so we keep a single root on the container and just re-render
// the freshly imported tree into it.
const container = document.getElementById('root')
container.__root ??= createRoot(container)
container.__root.render(
  <StrictMode>
    <Suspense fallback={<Unrolling />}>
      <Boot />
    </Suspense>
  </StrictMode>,
)
