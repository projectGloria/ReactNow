// RenderCommitTimeline — trigger → render → reconcile → commit → paint, step by step.
import { useEffect, useState } from 'react'

const STAGES = [
  ['trigger', 'Trigger', 'A state update is queued. Nothing runs yet.'],
  ['render', 'Render', 'React calls your components top-down. Pure computation, no DOM. A parent rendering re-renders its children by default.'],
  ['reconcile', 'Reconcile', 'React diffs the new element tree against the previous one, node by node.'],
  ['commit', 'Commit', 'Only the differences are written to the DOM. Unchanged nodes are not touched.'],
  ['paint', 'Paint', 'The browser paints. Effects run after this.'],
]

function domNodes(s) {
  return [
    { id: 'h1', label: `<h1>${s.title}</h1>` },
    ...s.items.map((it) => ({ id: `li-${it}`, label: `<li>${it}</li>` })),
    { id: 'footer', label: '<footer>Est. 1830</footer>' },
  ]
}

export default function RenderCommitTimeline() {
  const [committed, setCommitted] = useState({ title: 'Ports of Call', items: ['Lisbon', 'Madeira'] })
  const [next, setNext] = useState(null) // the pending state while a pass is in flight
  const [stage, setStage] = useState(-1)
  const [auto, setAuto] = useState(true)

  // Auto-advance through stages: a timer is an external system, so an effect.
  useEffect(() => {
    if (!auto || stage < 0 || stage >= STAGES.length - 1) return
    const id = setTimeout(() => setStage((s) => s + 1), 1100)
    return () => clearTimeout(id)
  }, [auto, stage])

  // Derived for this render — what changed between committed and next.
  const before = domNodes(committed)
  const after = next ? domNodes(next) : before
  const beforeMap = new Map(before.map((n) => [n.id, n.label]))
  const changed = new Set(after.filter((n) => beforeMap.get(n.id) !== n.label).map((n) => n.id))
  const current = STAGES[stage]?.[0]
  const showNew = stage >= 3 // DOM shows new content from commit on

  // When the pass reaches "paint", fold `next` into `committed` lazily on the next trigger.
  function trigger(update) {
    const base = next && stage >= 3 ? next : committed
    setCommitted(base)
    setNext(update(base))
    setStage(0)
  }

  const calls = ['App', 'Header', 'List', 'Footer']
  return (
    <div className="viz">
      <div className="viz-controls">
        <button className="btn" onClick={() => trigger((s) => ({ ...s, title: s.title === 'Ports of Call' ? 'Ports of Refuge' : 'Ports of Call' }))}>
          Rename the title
        </button>
        <button className="btn" onClick={() => trigger((s) => ({ ...s, items: [...s.items, ['Cape Verde', 'Recife', 'Montevideo', 'Falklands'][s.items.length % 4]] }))}>
          Add a port
        </button>
        <button className="btn" onClick={() => trigger((s) => ({ ...s }))}>setState with identical data</button>
        <label className="viz-toggle">
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> auto-play
        </label>
        {!auto && stage >= 0 && stage < STAGES.length - 1 && (
          <button className="btn btn-primary" onClick={() => setStage((s) => s + 1)}>
            Next stage →
          </button>
        )}
      </div>

      <ol className="stages">
        {STAGES.map(([id, label], i) => (
          <li key={id} className={i === stage ? 'is-now' : i < stage ? 'is-past' : ''}>
            {label}
          </li>
        ))}
      </ol>
      <p className="viz-callout">{stage < 0 ? 'Trigger an update to begin.' : STAGES[stage][2]}</p>

      <div className="viz-cols">
        <div>
          <div className="pane-label">Component calls</div>
          <ul className="calls">
            {calls.map((c, i) => (
              <li key={c} style={{ paddingLeft: i ? 18 : 0 }} className={current === 'render' ? 'is-called' : stage > 1 ? 'was-called' : ''}>
                {c}()
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="pane-label">DOM</div>
          <ul className="dom">
            {(showNew ? after : before).map((n) => (
              <li
                key={n.id}
                className={[
                  current === 'reconcile' && changed.has(n.id) ? 'is-diff' : '',
                  current === 'commit' && changed.has(n.id) ? 'is-commit' : '',
                ].join(' ')}
              >
                <code>{n.label}</code>
              </li>
            ))}
          </ul>
          {stage >= 2 && <p className="muted">{changed.size === 0 ? 'No differences: the commit writes nothing at all.' : `${changed.size} node(s) differ; everything else is left alone.`}</p>}
        </div>
      </div>
    </div>
  )
}
