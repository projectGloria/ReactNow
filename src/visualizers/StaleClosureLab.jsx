// StaleClosureLab — which render's `knots` does the interval actually read?
// Three ways to write the same effect, and the closure each one ends up with.
import { useState } from 'react'

const MODES = {
  empty: {
    label: '[]',
    code: 'useEffect(() => {\n  const id = setInterval(() => advance(knots), 1000)\n  return () => clearInterval(id)\n}, [])',
    note: 'The interval was created in render #1 and is never replaced. It reads render #1’s knots forever.',
  },
  deps: {
    label: '[knots]',
    code: 'useEffect(() => {\n  const id = setInterval(() => advance(knots), 1000)\n  return () => clearInterval(id)\n}, [knots])',
    note: 'Every knots change runs the old cleanup and creates a new interval in the new render. Correct, but the interval restarts each time.',
  },
  event: {
    label: 'useEffectEvent',
    code: 'const onTick = useEffectEvent(() => advance(knots))\nuseEffect(() => {\n  const id = setInterval(() => onTick(), 1000)\n  return () => clearInterval(id)\n}, [])',
    note: 'The interval still lives in render #1 and never restarts, but onTick reads the latest committed knots at call time.',
  },
}

const first = { n: 1, knots: 0 }

export default function StaleClosureLab() {
  const [mode, setMode] = useState('empty')
  const [renders, setRenders] = useState([first])
  const [ownerN, setOwnerN] = useState(1) // the render whose closure owns the live interval
  const [intervals, setIntervals] = useState(1) // how many intervals have been created so far
  const [ticks, setTicks] = useState([]) // { readN, knots }

  const latest = renders.at(-1)
  const distance = ticks.reduce((sum, t) => sum + t.knots, 0)
  // Where does a tick read `knots` from? The whole lesson in one expression.
  const readFrom = mode === 'event' ? latest : renders.find((r) => r.n === ownerN)
  const stale = readFrom.knots !== latest.knots

  function pick(m) {
    setMode(m)
    setRenders([first])
    setOwnerN(1)
    setIntervals(1)
    setTicks([])
  }

  function faster() {
    const next = { n: latest.n + 1, knots: latest.knots + 1 }
    setRenders((r) => [...r, next])
    // Only the [knots] version re-synchronizes: cleanup old, set up a new interval in the new render.
    if (mode === 'deps') {
      setOwnerN(next.n)
      setIntervals((i) => i + 1)
    }
  }

  function tick() {
    setTicks((t) => [...t, { readN: readFrom.n, knots: readFrom.knots }].slice(-6))
  }

  // Keep the owning render visible even after it scrolls out of the last four.
  const visible = renders.filter((r, i) => r.n === ownerN || i >= renders.length - 4)

  return (
    <div className="viz">
      <p className="viz-intro">
        Each card is one render with its own constant <code>knots</code>. Raise the speed, then fire the interval by hand and see which card it reads.
      </p>
      <div className="viz-controls">
        {Object.entries(MODES).map(([key, m]) => (
          <button key={key} className={`btn${mode === key ? ' btn-primary' : ''}`} onClick={() => pick(key)} aria-pressed={mode === key}>
            <code>{m.label}</code>
          </button>
        ))}
      </div>
      <pre className="viz-code">
        {MODES[mode].code.split('\n').map((line, i) => (
          <div key={i}>{line || ' '}</div>
        ))}
      </pre>

      <div className="viz-row plates">
        {visible.map((r) => (
          <div key={r.n} className={`plate-card${r === latest ? ' is-latest' : ''}`}>
            <div className="plate-head">Render #{r.n}</div>
            <div className="plate-value">
              knots = <strong>{r.knots}</strong>
            </div>
            {r.n === ownerN && <div className="plate-cause">⏱ the live interval was created here</div>}
            {r.n === readFrom.n && <div className={`plate-timer${stale ? ' is-fired' : ''}`}>→ a tick reads knots = {r.knots} here</div>}
          </div>
        ))}
      </div>

      <div className="viz-controls">
        <button className="btn" onClick={faster}>
          +1 knot (re-render)
        </button>
        <button className="btn btn-primary" onClick={tick}>
          Fire the interval
        </button>
        <button className="btn" onClick={() => pick(mode)}>
          Reset
        </button>
        <span className="muted">
          intervals created: {intervals} · leagues logged: {distance}
        </span>
      </div>

      {ticks.length > 0 && (
        <div className="queue">
          <span className="pane-label">Ticks</span>
          {ticks.map((t, i) => (
            <span key={i} className="queue-chip">
              read #{t.readN}: +{t.knots}
            </span>
          ))}
        </div>
      )}

      <p className="viz-callout">
        {stale ? `Stale: the screen says ${latest.knots} knots, the interval reads ${readFrom.knots}. ` : ''}
        {MODES[mode].note}
      </p>
    </div>
  )
}
