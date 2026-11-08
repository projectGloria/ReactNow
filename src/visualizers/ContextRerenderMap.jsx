// ContextRerenderMap — the same little ship, wired four ways. Fire an update
// and see which components React re-renders, and why each one did (or didn't).
// Pure simulation: the rules below ARE the lesson, written as code.
import { useState } from 'react'

// The tree. `reads` = which slice the component displays (via context or store).
const TREE = [
  { id: 'App', depth: 0 },
  { id: 'Masthead', depth: 1, parent: 'App', memo: true, reads: 'heading' },
  { id: 'Deck', depth: 1, parent: 'App' },
  { id: 'Compass', depth: 2, parent: 'Deck', memo: true, reads: 'heading' },
  { id: 'Galley', depth: 2, parent: 'Deck', memo: true, reads: 'rations' },
  { id: 'Lantern', depth: 1, parent: 'App', reads: 'bells' },
]

const MODES = {
  literal: {
    label: 'value={{…}}',
    code: 'const [heading, setHeading] = useState(…)\nconst [rations, setRations] = useState(…)\n<ShipContext value={{ heading, rations }}>',
  },
  memo: {
    label: 'useMemo value',
    code: 'const ship = useMemo(() => ({ heading, rations }), [heading, rations])\n<ShipContext value={ship}>',
  },
  split: {
    label: 'split contexts',
    code: '<HeadingContext value={heading}>\n  <RationsContext value={rations}>',
  },
  store: {
    label: 'selector store',
    code: '// state lives outside React; no provider\nconst heading = useShip((s) => s.heading)\nconst rations = useShip((s) => s.rations)',
  },
}

const ACTIONS = {
  bells: 'Ring the bell',
  heading: 'Turn the helm',
  rations: 'Issue rations',
}

/**
 * Which components render for one update, and why. Walks the tree top-down,
 * because a child's fate depends on whether its parent rendered.
 * @returns {{ rendered: Record<string,string>, skipped: Record<string,string> }}
 */
function simulate(mode, colocated, changed) {
  const rendered = {}
  const skipped = {}

  // 1. Who owns the state that changed? The owner re-renders first.
  if (changed === 'bells') rendered[colocated ? 'Lantern' : 'App'] = 'its own state changed'
  else if (mode !== 'store') rendered.App = 'owns ' + changed + ' (provider lives here)'

  // 2. Does a context reader of `slice` see a value that fails Object.is?
  const contextChanged = (slice) => {
    if (mode === 'store' || !rendered.App) return false // provider didn't render → value can't change
    if (mode === 'literal') return true // a fresh {} on every App render
    if (mode === 'memo') return changed !== 'bells' // any field → new object for EVERY reader
    return slice === changed // split: only that context's value changed
  }

  for (const node of TREE.slice(1)) {
    if (rendered[node.id]) continue
    const parentRendered = Boolean(rendered[node.parent])
    if (parentRendered && !node.memo) rendered[node.id] = 'parent rendered (no memo)'
    else if (node.reads && node.reads !== 'bells' && contextChanged(node.reads))
      rendered[node.id] = mode === 'literal' && changed !== node.reads ? 'context value is a new object' : 'context value changed'
    else if (mode === 'store' && node.reads === changed) rendered[node.id] = 'selected slice changed'
    else if (parentRendered && node.memo) skipped[node.id] = 'skipped: memo, props equal'
  }
  return { rendered, skipped }
}

function verdict(mode, colocated, changed, rendered) {
  const wasted = Object.keys(rendered).filter((id) => id !== 'App' && TREE.find((n) => n.id === id).reads !== changed)
  if (changed === 'bells' && rendered.Masthead)
    return 'App rendered, so it built a new { heading, rations } object. Object.is says "changed", and every consumer re-renders, memo or not.'
  if (changed === 'bells' && !colocated) return 'App owns the bell, so App and its un-memoized children (Deck, Lantern) render. Tick "colocate" to push the bell down.'
  if (changed === 'bells') return 'The bell lives in Lantern now: nothing above or beside it is even visited.'
  if (rendered.Galley && changed === 'heading') return 'The Galley only reads rations, but a single context has no selectors: any change to its value reaches every reader.'
  if (rendered.Masthead && changed === 'rations') return 'Masthead and Compass only read heading, but they share one context value with rations, so they re-render anyway.'
  if (mode === 'store') return 'Only the components whose selected slice changed re-render. App never renders: it does not hold this state.'
  if (wasted.length === 1 && wasted[0] === 'Deck') return 'Only the readers of this slice re-render, plus Deck, which renders because App did and it has no memo.'
  if (wasted.length)
    return `Only the ${changed} readers get a new context value, but ${wasted.join(' and ')} still render because App owns the state and they have no memo. A store moves the state out of App entirely.`
  return 'Only the readers of this slice re-render.'
}

const zero = () => Object.fromEntries(TREE.map((n) => [n.id, 0]))

export default function ContextRerenderMap() {
  const [mode, setMode] = useState('literal')
  const [colocated, setColocated] = useState(false)
  const [counts, setCounts] = useState(zero)
  // The last update: what changed and the simulation result. A sequence number
  // re-keys the rows so the flash animation replays on every click.
  const [last, setLast] = useState(null)

  function reset(nextMode = mode, nextColocated = colocated) {
    setMode(nextMode)
    setColocated(nextColocated)
    setCounts(zero())
    setLast(null)
  }

  function fire(changed) {
    const result = simulate(mode, colocated, changed)
    setCounts((c) => {
      const next = { ...c }
      for (const id of Object.keys(result.rendered)) next[id] += 1
      return next
    })
    setLast((l) => ({ ...result, changed, seq: (l?.seq ?? 0) + 1 }))
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)

  return (
    <div className="viz">
      <p className="viz-intro">
        One ship, four wirings. Pick one, fire an update, and read which components React re-rendered and the reason it gives for each.
      </p>
      <div className="viz-controls">
        {Object.entries(MODES).map(([key, m]) => (
          <button key={key} className={`btn${mode === key ? ' btn-primary' : ''}`} onClick={() => reset(key)} aria-pressed={mode === key}>
            <code>{m.label}</code>
          </button>
        ))}
        <label className="muted">
          <input type="checkbox" checked={colocated} onChange={(e) => reset(mode, e.target.checked)} /> colocate the bell in Lantern
        </label>
      </div>
      <pre className="viz-code">
        {MODES[mode].code.split('\n').map((line, i) => (
          <div key={i}>{line}</div>
        ))}
        <div>{colocated ? '// bells: useState inside <Lantern>' : '// bells: useState inside <App>, passed to <Lantern>'}</div>
      </pre>

      <ul className="crm-tree">
        {TREE.map((n) => {
          const why = last?.rendered[n.id]
          const skip = last?.skipped[n.id]
          const wasted = why && n.id !== 'App' && n.reads !== last.changed
          const cls = why ? (wasted ? ' is-wasted' : ' is-rendered') : skip ? ' is-skipped' : ''
          return (
            <li key={`${n.id}-${why ? last.seq : 0}`} className={`crm-node${cls}`} style={{ marginLeft: n.depth * 28 }}>
              <span className="crm-name">&lt;{n.id}&gt;</span>
              {n.memo && <span className="crm-tag">memo</span>}
              {n.reads && <span className="crm-tag">reads {n.reads}</span>}
              <span className="crm-count">{counts[n.id]}×</span>
              <span className="crm-why">{why ? (wasted ? 'wasted: ' : '') + why : (skip ?? '')}</span>
            </li>
          )
        })}
      </ul>

      <div className="viz-controls">
        {Object.entries(ACTIONS).map(([key, label]) => (
          <button key={key} className="btn" onClick={() => fire(key)}>
            {label}
          </button>
        ))}
        <button className="btn" onClick={() => reset()}>
          Reset
        </button>
        <span className="muted">renders so far: {total}</span>
      </div>

      <p className="viz-callout">
        {last ? verdict(mode, colocated, last.changed, last.rendered) : 'Memo only compares props. Context and stores reach a component directly, whatever its parent did.'}
      </p>
    </div>
  )
}
