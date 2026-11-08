// EffectLifecycle — drive a pretend <Harbour port={…}> and watch React's
// render → commit → cleanup(old) → setup(new) sequence, StrictMode included.
import { useState } from 'react'

const PORTS = ['Plymouth', 'Falmouth', 'Cape Town']

const KIND_LABEL = { render: 'render', commit: 'commit', setup: 'setup', cleanup: 'cleanup', skip: 'effect skipped' }

export default function EffectLifecycle() {
  const [mounted, setMounted] = useState(false)
  const [port, setPort] = useState(PORTS[0])
  const [strict, setStrict] = useState(true)
  const [forgetCleanup, setForgetCleanup] = useState(false)
  // The only stored history: one batch of steps per user action.
  const [batches, setBatches] = useState([])

  // Derived: which subscriptions are open right now. Walk every step; a
  // cleanup only closes a line if cleanup actually exists (not forgotten).
  const open = []
  for (const b of batches)
    for (const s of b.steps) {
      if (s.kind === 'setup') open.push(s.port)
      if (s.kind === 'cleanup' && !s.missing) open.splice(open.indexOf(s.port), 1)
    }
  const leaking = open.length > 1 || (!mounted && open.length > 0)

  // A cleanup step is still drawn when forgotten, crossed out: the moment the
  // line *should* have closed is the whole lesson.
  const cleanup = (p, dev) => ({ kind: 'cleanup', port: p, dev, missing: forgetCleanup })

  function record(action, steps) {
    // Keep the full history: `open` is derived from it, so truncating here
    // would silently "close" old leaked lines. Only the view is truncated.
    setBatches((bs) => [...bs, { id: bs.length, action, steps }])
  }

  function mount() {
    const steps = [{ kind: 'render', port }]
    if (strict) steps.push({ kind: 'render', port, dev: true })
    steps.push({ kind: 'commit', port }, { kind: 'setup', port })
    // StrictMode (dev only): one extra setup → cleanup cycle before the real setup is kept.
    if (strict) steps.push(cleanup(port, true), { kind: 'setup', port, dev: true })
    setMounted(true)
    record(`mount <Harbour port="${port}">`, steps)
  }

  function rerender() {
    const steps = [{ kind: 'render', port }]
    if (strict) steps.push({ kind: 'render', port, dev: true })
    steps.push({ kind: 'commit', port }, { kind: 'skip', port })
    record('parent re-renders, port unchanged', steps)
  }

  function changePort() {
    const next = PORTS[(PORTS.indexOf(port) + 1) % PORTS.length]
    const steps = [{ kind: 'render', port: next }]
    if (strict) steps.push({ kind: 'render', port: next, dev: true })
    // Cleanup runs with the OLD props, then setup with the new ones.
    steps.push({ kind: 'commit', port: next }, cleanup(port), { kind: 'setup', port: next })
    setPort(next)
    record(`port: "${port}" → "${next}"`, steps)
  }

  function unmount() {
    setMounted(false)
    record('unmount', [cleanup(port)])
  }

  function reset(patch) {
    setBatches([])
    setMounted(false)
    setPort(PORTS[0])
    patch?.()
  }

  return (
    <div className="viz">
      <p className="viz-intro">
        <code>{'useEffect(() => { connect(port); return () => disconnect(port) }, [port])'}</code>. Drive the component and read each row left to right:
        that is the order React runs things in.
      </p>
      <div className="viz-controls">
        <label className="viz-toggle">
          <input type="checkbox" checked={strict} onChange={(e) => reset(() => setStrict(e.target.checked))} /> StrictMode (dev)
        </label>
        <label className="viz-toggle">
          <input type="checkbox" checked={forgetCleanup} onChange={(e) => reset(() => setForgetCleanup(e.target.checked))} /> forget the cleanup
        </label>
      </div>
      <div className="viz-controls">
        <button className="btn" onClick={mount} disabled={mounted}>
          Mount
        </button>
        <button className="btn" onClick={rerender} disabled={!mounted}>
          Re-render (same port)
        </button>
        <button className="btn" onClick={changePort} disabled={!mounted}>
          Change port
        </button>
        <button className="btn" onClick={unmount} disabled={!mounted}>
          Unmount
        </button>
        <button className="btn" onClick={() => reset()}>
          Reset
        </button>
      </div>

      <ol className="lc-batches">
        {batches.length === 0 && <li className="muted">Press Mount.</li>}
        {batches.slice(-4).map((b) => (
          <li key={b.id} className="lc-batch">
            <div className="lc-action">{b.action}</div>
            <div className="lc-steps">
              {b.steps.map((s, i) => (
                <span
                  key={i}
                  className={`lc-step is-${s.kind}${s.dev ? ' is-dev' : ''}${s.missing ? ' is-missing' : ''}`}
                  // Stagger the reveal with CSS only: no timers to clean up.
                  style={{ animationDelay: `${i * 120}ms` }}
                  title={s.dev ? 'Development only (StrictMode)' : undefined}
                >
                  {KIND_LABEL[s.kind]}
                  {s.kind !== 'commit' && s.kind !== 'render' && s.kind !== 'skip' && <em> {s.port}</em>}
                  {s.dev && <sup>dev</sup>}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className={`lc-open${leaking ? ' is-leak' : ''}`}>
        <span className="pane-label">Open connections</span> <strong>{open.length}</strong>
        {open.length > 0 && <span className="muted"> ({open.join(', ')})</span>}
      </div>

      {leaking ? (
        <p className="viz-callout">
          Leak: more lines are open than components on screen. Without a cleanup nothing closes the old connection, and StrictMode&rsquo;s extra cycle exposed
          it on the very first mount.
        </p>
      ) : (
        strict &&
        batches.length > 0 && (
          <p className="viz-callout">
            The <sup>dev</sup> steps never happen in production. With a correct cleanup, setup → cleanup → setup ends with exactly one open line, the same as a
            single setup. That equivalence is the test StrictMode runs.
          </p>
        )
      )}
    </div>
  )
}
