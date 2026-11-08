// src/journal/FieldJournal.jsx — the open-book lesson view.
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { navigate } from '../router/useHashRoute.js'
import { useExpedition, useRecord } from '../store/ExpeditionProvider.jsx'
import { XP, isMastered, isReviewDue, isUnlocked } from '../store/derive.js'
import { NOTE_MIN } from '../store/expedition.js'
import { WaxSeal } from '../game/WaxSeal.jsx'
import { Specimen } from './Specimen.jsx'
import { Inline } from './Inline.jsx'
import { Trial } from './Trial.jsx'
import { Marginalia } from './Marginalia.jsx'
import { dialogProps } from '../ui/dialog.js'

// Visualizers are code-split: you only download the apparatus you open.
const Apparatus = lazy(() => import('../visualizers/index.jsx'))

export function FieldJournal({ phase, lesson, index }) {
  const { progress } = useExpedition()
  const record = useRecord()
  const key = `${phase.id}/${lesson.id}`
  const rec = progress.lessons[key] ?? {}
  const mastered = isMastered(rec)
  // Captured once at mount (FieldJournal is keyed by lesson): lets us play the
  // stamp animation only when the seal is earned *during this visit*.
  const [masteredAtOpen] = useState(mastered)
  const reviewDue = isReviewDue(rec)
  // Same trick for reviews: re-stamp animation only if it was due when you arrived.
  const [dueAtOpen] = useState(reviewDue)
  const locked = !isUnlocked(progress, phase.index)
  // A due review opens straight on the trial: that's the work to do.
  const [tab, setTab] = useState(() => (reviewDue ? 'trial' : 'specimen'))

  // Logging "you opened this" is synchronising with an external system (the
  // journal), so an effect is right. The ref stops StrictMode's dev double-mount
  // from logging two opens.
  const logged = useRef(false)
  useEffect(() => {
    if (logged.current || locked || !lesson.charted) return
    logged.current = true
    record('lesson_opened', { phase: phase.id, lesson: lesson.id })
  }, [record, phase.id, lesson.id, locked, lesson.charted])

  const prev = phase.lessons[index - 1]
  const next = phase.lessons[index + 1]
  const ev = (type, extra) => record(type, { phase: phase.id, lesson: lesson.id, ...extra })

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && navigate(`/${phase.id}`)}>
      <article className="book" {...dialogProps} aria-labelledby="lesson-title">
        <button className="book-close" onClick={() => navigate(`/${phase.id}`)} aria-label="Close and return to the survey">
          ✕
        </button>

        {/* ---------------- left page ---------------- */}
        <section className="page page-left">
          <div className="page-kicker">
            {phase.num} · {phase.landmark} · Waypoint {index + 1} of {phase.lessons.length}
          </div>
          <h1 id="lesson-title" className="drop-title">
            {lesson.title}
          </h1>

          <h3 className="rubric">Why it exists</h3>
          <p className="lede">
            <Inline text={lesson.why} />
          </p>

          {lesson.charted ? (
            <>
              <h3 className="rubric">How it works</h3>
              {lesson.how.map((para, i) => (
                <p key={i}>
                  <Inline text={para} />
                </p>
              ))}
              <div className="pitfall">
                <span className="pane-label">The reef to avoid</span>
                <p>
                  <Inline text={lesson.pitfall} />
                </p>
              </div>
              <p className="ref-link">
                Further reading:{' '}
                <a href={lesson.reactDev} target="_blank" rel="noreferrer">
                  {new URL(lesson.reactDev).hostname}
                </a>
              </p>
              {lesson.prereqs.length > 0 && (
                <p className="prereqs">
                  Prerequisites:{' '}
                  {lesson.prereqs.map((p) => {
                    const pl = phase.lessons.find((l) => l.id === p)
                    return (
                      <button key={p} className="chip" onClick={() => navigate(`/${phase.id}/${p}`)}>
                        {pl?.title ?? p}
                      </button>
                    )
                  })}
                </p>
              )}
            </>
          ) : (
            <Uncharted phase={phase} lesson={lesson} />
          )}

          {lesson.charted && !locked && (
            <>
              <SealProgress rec={rec} mastered={mastered} reviewDue={reviewDue} fresh={(mastered && !masteredAtOpen) || (dueAtOpen && !reviewDue)} />
              <Marginalia noteKey={key} title={`${phase.num} · ${lesson.title}`} onSaved={(length) => ev('note_saved', { length })} />
            </>
          )}
        </section>

        {/* ---------------- right page ---------------- */}
        <section className="page page-right">
          {locked ? (
            <div className="locked-page">
              <h2>Beyond the Customs House</h2>
              <p>This territory is not yet open to you. Clear the previous region&rsquo;s checkpoint to land here.</p>
              <button className="btn" onClick={() => navigate('/')}>
                Back to the Atlas
              </button>
            </div>
          ) : lesson.charted ? (
            <>
              <div className="tabs" role="tablist">
                <Tab id="specimen" tab={tab} setTab={setTab} label="Specimen" hint="live example" done={rec.edited} />
                {lesson.visualizer && <Tab id="apparatus" tab={tab} setTab={setTab} label="Apparatus" hint="see the mechanism" />}
                <Tab id="trial" tab={tab} setTab={setTab} label="Trial" hint="fix the bug" done={rec.trialPassed} />
              </div>
              {/* Hidden instead of unmounted: switching tabs keeps your edits in each pane. */}
              <div hidden={tab !== 'specimen'}>
                <Specimen example={lesson.example} onFirstEdit={() => ev('example_edited')} />
              </div>
              {lesson.visualizer && tab === 'apparatus' && (
                <Suspense fallback={<p className="muted">Assembling the apparatus…</p>}>
                  <Apparatus name={lesson.visualizer} />
                </Suspense>
              )}
              <div hidden={tab !== 'trial'}>
                <Trial
                  trial={lesson.trial}
                  passed={rec.trialPassed}
                  reviewing={reviewDue}
                  attempts={rec.trialAttempts ?? 0}
                  // review: true makes a passing re-run count as a review in the reducer
                  onAttempt={(r) => ev('trial_attempt', reviewDue ? { ...r, review: true } : r)}
                />
              </div>
            </>
          ) : (
            <div className="locked-page">
              <h2>Survey pending</h2>
              <p>The specimen, apparatus and trial for this waypoint have not been drawn yet.</p>
            </div>
          )}

          <nav className="page-nav">
            {prev ? (
              <button className="btn" onClick={() => navigate(`/${phase.id}/${prev.id}`)}>
                ← {prev.title}
              </button>
            ) : (
              <span />
            )}
            {next ? (
              <button className="btn" onClick={() => navigate(`/${phase.id}/${next.id}`)}>
                {next.title} →
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate(`/${phase.id}/gate`)}>
                To the Customs House →
              </button>
            )}
          </nav>
        </section>
      </article>
    </div>
  )
}

function Tab({ id, tab, setTab, label, hint, done }) {
  return (
    <button role="tab" aria-selected={tab === id} className={`tab${tab === id ? ' is-active' : ''}`} onClick={() => setTab(id)}>
      {label} {done && <span className="tab-done">✓</span>}
      <small>{hint}</small>
    </button>
  )
}

function SealProgress({ rec, mastered, reviewDue, fresh }) {
  const items = [
    [rec.edited, `Experiment with the specimen (+${XP.edited} XP)`],
    [rec.trialPassed, `Pass the trial (+${XP.trial} XP, ${XP.trialFirstTry} on the first try)`],
    [rec.noted, `Write a margin note of ${NOTE_MIN}+ characters (+${XP.noted} XP)`],
  ]
  return (
    <div className={`seal-progress${mastered ? ' is-sealed' : ''}${reviewDue ? ' is-review' : ''}`}>
      <div className="seal-slot">{mastered ? <WaxSeal size={64} fresh={fresh} title={reviewDue ? 'Seal fading: review due' : 'Waypoint sealed'} /> : <div className="seal-empty">seal</div>}</div>
      <ul>
        {reviewDue && (
          <li className="review-due">
            <span className="mark">↻</span> Review due: the seal is fading. Pass the trial again from the original buggy code to re-stamp it.
          </li>
        )}
        {items.map(([ok, label]) => (
          <li key={label} className={ok ? 'ok' : ''}>
            <span className="mark">{ok ? '✓' : '○'}</span> {label}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Uncharted({ phase, lesson }) {
  const [copied, setCopied] = useState(false)
  const prompt = `Chart the lesson "${lesson.title}" (id: ${lesson.id}) in phase ${phase.id} (${phase.title}) of my ReactNow atlas. Follow the lesson shape used in src/content/phases/p1-rendering.js: why, how[], pitfall, reactDev, example {code, tryThis}, optional visualizer, and a trial {symptom, code, checks}.`
  return (
    <div className="uncharted">
      <h3 className="rubric">Not yet surveyed</h3>
      <p>
        This waypoint&rsquo;s full lesson hasn&rsquo;t been written. In a Claude Code session in this repo, ask Claude to chart it:
      </p>
      <blockquote>{prompt}</blockquote>
      <button
        className="btn btn-small"
        onClick={async () => {
          await navigator.clipboard.writeText(prompt)
          setCopied(true)
        }}
      >
        {copied ? 'Copied ✓' : 'Copy request'}
      </button>
    </div>
  )
}
