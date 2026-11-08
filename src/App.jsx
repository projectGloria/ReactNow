// src/App.jsx — routes to overlays; the chart is always mounted underneath.
import { lazy, Suspense, useEffect } from 'react'
import { useHashRoute, navigate } from './router/useHashRoute.js'
import { Atlas } from './atlas/Atlas.jsx'
import { LedgerStrip } from './game/LedgerStrip.jsx'
import { CheckpointGate } from './game/CheckpointGate.jsx'
import { RegionBrief } from './region/RegionBrief.jsx'
import { CaptainsLog } from './game/CaptainsLog.jsx'
import { findLesson, phaseById } from './content/index.js'
import { paperClasses, paperVars } from './art/index.js'
import { dialogProps } from './ui/dialog.js'

// The lesson book carries react-live, sucrase and prism (~60% of the JS). The
// atlas, briefs and gates don't need any of it, so it loads on first lesson open.
const FieldJournal = lazy(() => import('./journal/FieldJournal.jsx').then((m) => ({ default: m.FieldJournal })))

// Views that cover the chart with a sheet. While one is open the chart is
// `inert`: unfocusable and unclickable, which keeps Tab inside the sheet.
const OVERLAYS = new Set(['lesson', 'gate', 'brief', 'log'])

export function App() {
  const route = useHashRoute()

  // Escape walks one level up the hierarchy: lesson -> region -> atlas.
  // A window listener is an external subscription, so an effect is correct here.
  useEffect(() => {
    function onKey(e) {
      if (e.target.closest?.('.live-editor, textarea, input, [contenteditable]')) return
      if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen()
        else document.documentElement.requestFullscreen()
        return
      }
      if (e.key !== 'Escape') return
      if (route.view === 'lesson' || route.view === 'gate') navigate(`/${route.phaseId}`)
      else if (route.view === 'region' || route.view === 'brief' || route.view === 'log') navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [route.view, route.phaseId])

  const found = route.view === 'lesson' ? findLesson(route.phaseId, route.lessonId) : null

  return (
    <div className={`app${paperClasses}`} style={paperVars}>
      <LedgerStrip />
      <main className="chart-wrap">
        {/* Atlas never unmounts: the camera keeps its position under overlays */}
        {/* `inert` is an HTML attribute: on the <svg> itself browsers ignore it,
            so it goes on a wrapper. display: contents keeps the layout unchanged. */}
        <div className="chart-layer" inert={OVERLAYS.has(route.view)}>
          <Atlas route={route.view === 'log' ? { view: 'atlas' } : route} />
        </div>
        {found && (
          <Suspense fallback={<div className="overlay overlay-loading">Opening the field journal…</div>}>
            {/* key = lesson: a new lesson gets fresh state everywhere below
                (editor code, trial results, notes draft) without any reset effect. */}
            <FieldJournal key={`${found.phase.id}/${found.lesson.id}`} phase={found.phase} lesson={found.lesson} index={found.index} />
          </Suspense>
        )}
        {route.view === 'brief' && phaseById[route.phaseId] && <RegionBrief phase={phaseById[route.phaseId]} />}
        {route.view === 'gate' && phaseById[route.phaseId] && <CheckpointGate key={route.phaseId} phase={phaseById[route.phaseId]} />}
        {route.view === 'log' && <CaptainsLog />}
        {route.view === 'lesson' && !found && <Lost />}
      </main>
    </div>
  )
}

function Lost() {
  return (
    <div className="overlay">
      <div className="sheet small" {...dialogProps} aria-label="Off the edge of the map">
        <h2>Off the edge of the map</h2>
        <p>No such waypoint has been charted.</p>
        <button className="btn" onClick={() => navigate('/')}>
          Return to the Atlas
        </button>
      </div>
    </div>
  )
}
