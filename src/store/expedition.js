// src/store/expedition.js
// ---------------------------------------------------------------------------
// Event-sourced reducer. Every meaningful thing you do is an *event* appended
// to journal/log.jsonl; `progress` is just a fold over those events.
// Benefits:
//   - The log is the source of truth Claude reads to see *how* you learn
//     (failed trial attempts, checkpoint answers), not only *what* you finished.
//   - The reducer is pure, so StrictMode's double-invoke is harmless.
// ---------------------------------------------------------------------------

export const today = () => toLocalDate(new Date())
export function toLocalDate(d) {
  // Local calendar date, not UTC — a 1am session in Europe is still "today".
  const z = new Date(d)
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`
}

export function emptyProgress() {
  return { version: 1, startDate: today(), planDays: 36, lessons: {}, checkpoints: {} }
}

const lessonKey = (e) => `${e.phase}/${e.lesson}`

/** Pure: (progress, event) -> progress. Never mutates. */
export function applyEvent(progress, e) {
  switch (e.type) {
    case 'lesson_opened':
    case 'example_edited':
    case 'note_saved':
    case 'trial_attempt': {
      const key = lessonKey(e)
      const prev = progress.lessons[key] ?? { trialAttempts: 0 }
      const next = { ...prev }
      if (e.type === 'lesson_opened') next.opened ??= e.ts
      if (e.type === 'example_edited') next.edited = true
      if (e.type === 'note_saved') next.noted = e.length > 0
      if (e.type === 'trial_attempt' && !prev.trialPassed) {
        next.trialAttempts = prev.trialAttempts + 1
        if (e.pass) {
          next.trialPassed = true
          next.firstTry = next.trialAttempts === 1
        }
      }
      if (next.edited && next.trialPassed && next.noted) next.masteredAt ??= e.ts
      return { ...progress, lessons: { ...progress.lessons, [key]: next } }
    }
    case 'checkpoint_answer': {
      const prev = progress.checkpoints[e.phase] ?? { attempts: 0 }
      return { ...progress, checkpoints: { ...progress.checkpoints, [e.phase]: { ...prev, attempts: prev.attempts + 1 } } }
    }
    case 'checkpoint_passed': {
      const prev = progress.checkpoints[e.phase] ?? { attempts: 0 }
      if (prev.passed) return progress
      return { ...progress, checkpoints: { ...progress.checkpoints, [e.phase]: { ...prev, passed: true, passedAt: e.ts } } }
    }
    default:
      return progress // session_start etc. only matter to the log
  }
}

/**
 * @typedef {{ progress: ReturnType<typeof emptyProgress>, log: any[] }} ExpeditionState
 * @param {ExpeditionState} state
 */
export function expeditionReducer(state, action) {
  switch (action.type) {
    case 'record':
      return { progress: applyEvent(state.progress, action.event), log: [...state.log, action.event] }
    case 'reset':
      return { progress: emptyProgress(), log: [] }
    default:
      throw new Error(`Unknown action ${action.type}`)
  }
}
