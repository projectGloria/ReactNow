// src/game/CheckpointGate.jsx — the Customs House: answer before you may pass.
import { useState } from 'react'
import { PHASES, checkpointFor } from '../content/index.js'
import { navigate } from '../router/useHashRoute.js'
import { useExpedition, useRecord } from '../store/ExpeditionProvider.jsx'
import { XP, isUnlocked } from '../store/derive.js'
import { Inline } from '../journal/Inline.jsx'
import { WaxSeal } from './WaxSeal.jsx'
import { dialogProps } from '../ui/dialog.js'

// Word count is a crude proxy, but a 6-word answer to a question whose model
// answer is 60 words is almost never "the essentials". It doesn't block you; it
// makes you look twice before self-grading, and the ratio goes to the log so
// Claude can see which passes were generous.
const words = (t) => t.trim().split(/\s+/).filter(Boolean).length
const THIN = 0.35

export function CheckpointGate({ phase }) {
  const { progress } = useExpedition()
  const record = useRecord()
  const questions = checkpointFor(phase)
  const cleared = progress.checkpoints[phase.id]?.passed
  const nextPhase = PHASES[phase.index + 1]

  // One piece of state per question: 'open' | 'revealed' | 'passed'.
  const [states, setStates] = useState(() => questions.map(() => 'open'))
  const [answers, setAnswers] = useState(() => questions.map(() => ''))
  const [nudge, setNudge] = useState(null)
  // Derived, not stored: "all passed" is just a fold over `states`.
  const allPassed = states.every((s) => s === 'passed')
  const done = allPassed && cleared

  if (!isUnlocked(progress, phase.index)) {
    return (
      <Shell phase={phase}>
        <p>The Customs House is shuttered. Clear the previous territory first.</p>
      </Shell>
    )
  }

  function reveal(i) {
    if (!answers[i].trim()) {
      setNudge(i)
      return
    }
    setNudge(null)
    setStates((s) => s.with(i, 'revealed')) // Array.prototype.with: immutable index update
  }

  function grade(i, ok) {
    const ratio = Math.round((words(answers[i]) / Math.max(1, words(questions[i].model))) * 100) / 100
    record('checkpoint_answer', { phase: phase.id, index: i, question: questions[i].q, answer: answers[i], selfGrade: ok ? 'pass' : 'miss', lengthRatio: ratio })
    const next = states.with(i, ok ? 'passed' : 'open')
    setStates(next)
    // Event handler, not effect: we know right here that this click completed
    // the gate, so we record it directly instead of "reacting" to state later.
    if (next.every((s) => s === 'passed') && !cleared) record('checkpoint_passed', { phase: phase.id })
  }

  return (
    <Shell phase={phase}>
      {cleared && !allPassed && (
        <p className="gate-cleared">
          <WaxSeal size={34} letter="✓" /> Cleared on {new Date(progress.checkpoints[phase.id].passedAt).toLocaleDateString()}. You may sit the questions again for practice.
        </p>
      )}
      <p className="gate-intro">
        Write your answer <em>before</em> you reveal the model. Your answers are logged to the journal so Claude can grade them properly later. Honest self-grading
        only; the sea finds out anyway.
      </p>

      <ol className="gate-questions">
        {questions.map((q, i) => (
          <li key={i} className={`gate-card is-${states[i]}`}>
            <div className="flip">
              <div className="flip-inner">
                <div className="face front">
                  <div className="q">
                    <Inline text={q.q} />
                  </div>
                  <textarea
                    value={answers[i]}
                    onChange={(e) => setAnswers((a) => a.with(i, e.target.value))}
                    placeholder="Your answer…"
                    rows={4}
                    disabled={states[i] !== 'open'}
                  />
                  {nudge === i && <div className="gate-nudge">Commit to an answer first; that's where the learning happens.</div>}
                  {states[i] === 'open' && (
                    <button className="btn" onClick={() => reveal(i)}>
                      Reveal the model answer
                    </button>
                  )}
                </div>
                <div className="face back">
                  <div className="pane-label">Model answer</div>
                  <p>
                    <Inline text={q.model} />
                  </p>
                  <div className="pane-label">You wrote</div>
                  <p className="yours">{answers[i]}</p>
                  {states[i] === 'revealed' && words(answers[i]) < words(q.model) * THIN && (
                    <p className="gate-thin">
                      Your answer is {words(answers[i])} words; the model is {words(q.model)}. Compare them point by point before you claim the essentials.
                    </p>
                  )}
                  {states[i] === 'revealed' ? (
                    <div className="gate-grade">
                      <button className="btn btn-primary" onClick={() => grade(i, true)}>
                        I had the essentials
                      </button>
                      <button className="btn" onClick={() => grade(i, false)}>
                        I missed something
                      </button>
                    </div>
                  ) : (
                    <div className="gate-passed-mark">✓ passed</div>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ol>

      {done && (
        <div className="gate-done">
          <WaxSeal size={72} letter="✓" fresh />
          <div>
            <h2>The Customs House stamps your papers.</h2>
            <p>
              +{XP.checkpoint} XP. {nextPhase ? `The route to ${nextPhase.landmark} is now charted.` : 'The whole chart is yours.'}
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Sail on to the Atlas →
            </button>
          </div>
        </div>
      )}
    </Shell>
  )
}

function Shell({ phase, children }) {
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && navigate(`/${phase.id}`)}>
      <article className="sheet gate" {...dialogProps} aria-label="The Customs House">
        <button className="book-close" onClick={() => navigate(`/${phase.id}`)} aria-label="Close">
          ✕
        </button>
        <div className="page-kicker">
          {phase.num} · {phase.landmark}
        </div>
        <h1 className="drop-title">The Customs House</h1>
        {children}
      </article>
    </div>
  )
}
