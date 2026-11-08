// src/journal/trialHarness.js
// ---------------------------------------------------------------------------
// A ~100-line testing library for fix-the-bug trials, running in the browser.
//
//   1. Transpile the learner's JSX with sucrase (the same compiler react-live uses).
//   2. Evaluate it with the shared SCOPE and pull out `App`.
//   3. Mount it with createRoot into an off-screen container, under StrictMode
//      (so impure renders misbehave exactly like they do in dev).
//   4. Run each check with helpers that wrap interactions in act(), which
//      flushes React's queued work so assertions see the committed DOM.
//
// It's a miniature React Testing Library: query by what the user sees
// (text, labels), interact like a user, assert on output, never on internals.
// ---------------------------------------------------------------------------
import { act, createElement, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { transform } from 'sucrase'
import { SCOPE } from './liveScope.js'

export function compileApp(code) {
  const js = transform(code, { transforms: ['jsx'], production: true }).code
  const names = Object.keys(SCOPE)
  // new Function: sloppy mode, its own scope; only SCOPE names are visible.
  const factory = new Function(...names, `${js}\n;return typeof App === 'function' ? App : undefined;`)
  return factory(...names.map((n) => SCOPE[n]))
}

const norm = (s) => s.replace(/\s+/g, ' ').trim()

function setNativeValue(el, value) {
  // React tracks the input's last value; setting `el.value = x` directly is
  // swallowed as "no change". Calling the prototype setter bypasses the
  // tracker, so the subsequent 'input' event reaches onChange.
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value)
}

function helpers(container) {
  const text = () => norm(container.textContent)

  const clickable = (label) => {
    const all = [...container.querySelectorAll('button, a, label, summary, [role="button"], input[type="checkbox"], input[type="radio"]')]
    return (
      all.find((el) => norm(el.textContent) === label || el.getAttribute('aria-label') === label) ??
      all.find((el) => norm(el.textContent).includes(label))
    )
  }

  const field = (label) => {
    const esc = CSS.escape(label)
    const direct = container.querySelector(`[aria-label="${esc}"], [placeholder="${esc}"], [name="${esc}"]`)
    if (direct) return direct
    const lab = [...container.querySelectorAll('label')].find((l) => norm(l.textContent).includes(label))
    return lab?.control ?? lab?.querySelector('input, textarea, select') ?? null
  }

  return {
    text,
    async click(label) {
      const el = clickable(label)
      if (!el) throw new Error(`Couldn't find anything clickable labelled "${label}".`)
      await act(async () => el.click())
    },
    async type(label, value) {
      const el = field(label)
      if (!el) throw new Error(`Couldn't find a field labelled "${label}".`)
      await act(async () => {
        setNativeValue(el, value)
        el.dispatchEvent(new Event('input', { bubbles: true }))
      })
    },
    async wait(ms) {
      // Real timers inside act(): intervals/timeouts fire, React flushes after.
      await act(() => new Promise((r) => setTimeout(r, ms)))
    },
    expectText(s) {
      if (!text().includes(s)) throw new Error(`Expected to see "${s}". The page reads: "${text().slice(0, 160)}"`)
    },
    expectNoText(s) {
      if (text().includes(s)) throw new Error(`Did not expect "${s}" on the page, but it's there.`)
    },
    expectCount(selector, n) {
      const k = container.querySelectorAll(selector).length
      if (k !== n) throw new Error(`Expected ${n} <${selector}> element(s), found ${k}.`)
    },
    expectValue(label, v) {
      const el = field(label)
      if (!el) throw new Error(`Couldn't find a field labelled "${label}".`)
      if (el.value !== v) throw new Error(`Field "${label}" holds "${el.value}", expected "${v}".`)
    },
  }
}

/**
 * @returns {Promise<{pass:boolean, results:{label:string,pass:boolean,message?:string}[], error?:string}>}
 */
export async function runTrial(code, checks) {
  let App
  try {
    App = compileApp(code)
  } catch (e) {
    return { pass: false, error: `The code doesn't compile: ${e.message}`, results: [] }
  }
  if (!App) return { pass: false, error: 'No `function App` found. Keep the component named App.', results: [] }

  const container = document.createElement('div')
  container.className = 'trial-sandbox' // off-screen but attached: label clicks & focus need a real document
  document.body.appendChild(container)
  const prevFlag = globalThis.IS_REACT_ACT_ENVIRONMENT
  globalThis.IS_REACT_ACT_ENVIRONMENT = true

  let crash = null
  // React 19 root error hooks: catch render-time throws instead of letting
  // them surface as window errors.
  const root = createRoot(container, {
    onUncaughtError: (err) => (crash ??= err),
    onCaughtError: (err) => (crash ??= err),
  })

  const results = []
  try {
    await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
    const t = helpers(container)
    for (const check of checks) {
      if (crash) {
        results.push({ label: check.label, pass: false, message: `The component crashed: ${crash.message}` })
        continue
      }
      try {
        await check.run(t)
        results.push({ label: check.label, pass: true })
      } catch (e) {
        results.push({ label: check.label, pass: false, message: e.message })
      }
    }
  } catch (e) {
    return { pass: false, error: `The component crashed: ${e.message}`, results }
  } finally {
    await act(async () => root.unmount())
    container.remove()
    globalThis.IS_REACT_ACT_ENVIRONMENT = prevFlag
  }
  return { pass: results.length > 0 && results.every((r) => r.pass), results }
}
