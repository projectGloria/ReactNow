// src/region/RegionBrief.jsx — the Surveyor's Brief (#/p0/brief).
// ---------------------------------------------------------------------------
// What a territory is about, before you see its waypoint map: why it matters,
// how it works, and every lesson with its own "why". It's a route, not a modal
// flag, so "click island -> brief" and "back from a lesson -> map" fall out of
// the URL alone: no "has the user seen the brief?" state to keep in sync.
// The Atlas still zooms underneath (the route carries phaseId), so dismissing
// the brief reveals a plate that's already in place.
// ---------------------------------------------------------------------------
import { checkpointFor } from '../content/index.js'
import { navigate } from '../router/useHashRoute.js'
import { useExpedition } from '../store/ExpeditionProvider.jsx'
import { isMastered, isReviewDue, isUnlocked } from '../store/derive.js'
import { Inline } from '../journal/Inline.jsx'
import { WaxSeal } from '../game/WaxSeal.jsx'
import { dialogProps } from '../ui/dialog.js'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

export function RegionBrief({ phase }) {
  const { progress } = useExpedition()
  const unlocked = isUnlocked(progress, phase.index)
  const cleared = Boolean(progress.checkpoints[phase.id]?.passed)
  const recOf = (l) => progress.lessons[`${phase.id}/${l.id}`]
  // All derived per render from progress: eight lessons, nothing worth memoizing.
  const sealed = phase.lessons.filter((l) => isMastered(recOf(l))).length
  const charted = phase.lessons.some((l) => l.charted)
  const next = unlocked ? phase.lessons.find((l) => l.charted && !isMastered(recOf(l))) : null
  // Uncharted phases get generic fallback questions, so there's always a gate.
  const questions = checkpointFor(phase).length
  const titleOf = Object.fromEntries(phase.lessons.map((l) => [l.id, l.title]))

  const toMap = () => navigate(`/${phase.id}`)
  const open = (l) => unlocked && l.charted && navigate(`/${phase.id}/${l.id}`)

  return (
    // Backdrop click = "show me the map", the same as the main button.
    <div className="overlay brief-overlay" onClick={(e) => e.target === e.currentTarget && toMap()}>
      <article className="sheet brief" {...dialogProps} aria-labelledby="brief-title">
        <button className="book-close" onClick={() => navigate('/')} aria-label="Back to the Atlas">
          ✕
        </button>
        {/* Landscape: the territory on the left, its waypoints across the right,
            so the whole brief fits one screen without scrolling. */}
        <header className="brief-side">
          <div className="page-kicker">
            Plate {ROMAN[phase.index] ?? phase.index + 1} · {phase.num} · The Surveyor's Brief
          </div>
          <h1 id="brief-title" className="drop-title">
            {phase.landmark}
          </h1>
          <p className="brief-sub">A survey of the {phase.title}</p>

          <h2 className="brief-h">Why chart this territory</h2>
          <p className="brief-lead">{phase.why}</p>
          <h2 className="brief-h">How it works</h2>
          <p className="brief-lead">{phase.how}</p>

          <p className="brief-stats">
            {phase.lessons.length} waypoints · {sealed} sealed · {questions} questions at the Customs House
            {cleared && ' · cleared ✓'}
          </p>
          {!unlocked && <p className="brief-warn">Unsurveyed: clear the previous Customs House before you can set foot here. You may read the brief.</p>}
          {unlocked && !charted && (
            <p className="brief-warn">
              Not yet charted: the lessons below are planned, but their examples and trials haven't been written. Ask Claude to chart this phase.
            </p>
          )}

          <div className="brief-actions">
            {next && (
              <button className="btn btn-primary" onClick={() => open(next)}>
                Start with: {next.title} →
              </button>
            )}
            <button className={`btn${next ? '' : ' btn-primary'}`} onClick={toMap}>
              Show the waypoint map
            </button>
            <button className="btn" onClick={() => navigate('/')}>
              ↩ The Atlas
            </button>
          </div>
        </header>

        <section className="brief-main">
          <h2 className="brief-h">What you will learn</h2>
          <ol className="brief-list">
            {phase.lessons.map((l, i) => {
              const done = isMastered(recOf(l))
              const review = isReviewDue(recOf(l))
              const go = unlocked && l.charted
              const after = l.prereqs.map((p) => titleOf[p]).filter(Boolean)
              return (
                <li key={l.id} className={`brief-item${done ? ' is-sealed' : ''}${review ? ' is-review' : ''}${go ? ' is-open' : ''}${l.id === next?.id ? ' is-next' : ''}`}>
                  <span className="brief-num" aria-hidden>
                    {done ? <WaxSeal size={30} letter={String(i + 1)} /> : i + 1}
                  </span>
                  {/* A real <button> when it's reachable: keyboard + screen readers for free. */}
                  {go ? (
                    <button className="brief-title" onClick={() => open(l)}>
                      {l.title}
                    </button>
                  ) : (
                    <span className="brief-title">{l.title}</span>
                  )}
                  <p className="brief-why">
                    <Inline text={l.why} />
                  </p>
                  {review && <p className="brief-after review-due">↻ review due</p>}
                  {after.length > 0 && <p className="brief-after">after {after.join(', ')}</p>}
                </li>
              )
            })}
          </ol>
        </section>
      </article>
    </div>
  )
}
