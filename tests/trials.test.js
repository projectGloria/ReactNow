// tests/trials.test.js — the guarantee every trial depends on.
// ---------------------------------------------------------------------------
// A fix-the-bug trial is only honest if the *buggy* code fails its checks.
// If it passes, the learner gets a free seal; if it doesn't even compile, the
// trial tests syntax instead of the misconception. So for every charted lesson:
//   - the trial's starting code compiles, defines App, and FAILS at least one check
//   - the lesson's example compiles and renders without crashing
// Uses the real in-browser harness (src/journal/trialHarness.js) under jsdom.
// ---------------------------------------------------------------------------
import { describe, expect, it } from 'vitest'
import { PHASES } from '../src/content/index.js'
import { compileApp, runTrial } from '../src/journal/trialHarness.js'

// jsdom doesn't ship CSS.escape; the harness uses it to look up fields by label.
globalThis.CSS ??= {}
CSS.escape ??= (s) => JSON.stringify(String(s)).slice(1, -1) // good enough for label text in attribute selectors

const charted = PHASES.flatMap((p) => p.lessons.filter((l) => l.charted).map((l) => [`${p.id}/${l.id}`, l]))

describe.each(charted)('%s', (_key, lesson) => {
  it('buggy trial code compiles but fails its checks', async () => {
    const result = await runTrial(lesson.trial.code, lesson.trial.checks)
    expect(result.error, 'should fail on behaviour, not on compile/crash').toBeUndefined()
    expect(result.pass).toBe(false)
  })

  it('example renders without crashing', async () => {
    expect(typeof compileApp(lesson.example.code)).toBe('function')
    const result = await runTrial(lesson.example.code, [{ label: 'renders', run: () => {} }])
    expect(result.error).toBeUndefined()
    expect(result.results[0]).toMatchObject({ pass: true })
  })
})
