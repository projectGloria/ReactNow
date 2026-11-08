// src/journal/Trial.jsx — fix-the-bug challenge with auto-checked results.
import { useState, useTransition } from 'react'
import { Editor } from 'react-live'
import { PARCHMENT_THEME } from './liveScope.js'
import { runTrial } from './trialHarness.js'

export function Trial({ trial, passed, reviewing = false, attempts, onAttempt }) {
  const [code, setCode] = useState(trial.code)
  const [outcome, setOutcome] = useState(null)
  // React 19: async functions inside startTransition are "Actions"; isPending
  // stays true until the promise settles. No manual loading flag needed.
  const [isPending, startTransition] = useTransition()

  function submit() {
    startTransition(async () => {
      // Yield first. Everything before the first `await` runs inside the
      // transition scope, which would make the sandbox's root.render() a
      // *transition* update that act() never flushes, leaving an empty page.
      // After an await, React 19 no longer treats updates as part of this
      // transition (the documented async-transition caveat), which we want here.
      await null
      const result = await runTrial(code, trial.checks)
      // State updates after an await need their own startTransition to be
      // part of the transition (React 19 caveat); plain setState is fine here.
      setOutcome(result)
      onAttempt({ pass: result.pass, code, failed: result.results.filter((r) => !r.pass).map((r) => r.label).concat(result.error ?? []) })
    })
  }

  return (
    <div className="trial">
      <div className="trial-symptom">
        <span className="pane-label">Reported symptom</span>
        <p>{trial.symptom}</p>
      </div>
      <Editor className="live-editor trial-editor" code={code} language="jsx" theme={PARCHMENT_THEME} onChange={setCode} />
      <div className="trial-actions">
        <button className="btn btn-primary" onClick={submit} disabled={isPending}>
          {isPending ? 'Surveying…' : 'Submit to the Surveyor'}
        </button>
        <button className="btn" onClick={() => (setCode(trial.code), setOutcome(null))} disabled={isPending}>
          Reset code
        </button>
        <span className="trial-meta">
          {reviewing ? 'Review: fix it again from scratch, without peeking at your notes' : passed ? 'Trial passed ✓' : attempts ? `${attempts} attempt${attempts > 1 ? 's' : ''} so far` : 'First try earns double XP'}
        </span>
      </div>

      {outcome && (
        <div className={`checklist${outcome.pass ? ' is-pass' : ' is-fail'}`} role="status">
          <div className="pane-label">{outcome.pass ? 'Surveyor’s verdict: sound' : 'Surveyor’s verdict: not yet'}</div>
          {outcome.error && <p className="check-error">{outcome.error}</p>}
          <ul>
            {outcome.results.map((r) => (
              <li key={r.label} className={r.pass ? 'ok' : 'bad'}>
                <span className="mark">{r.pass ? '✓' : '✗'}</span> {r.label}
                {r.message && <div className="check-msg">{r.message}</div>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
