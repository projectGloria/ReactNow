// SnapshotInspector — every render is a frozen plate; closures point at their plate.
import { useEffect, useRef, useState } from 'react'

export default function SnapshotInspector() {
  const [renders, setRenders] = useState([{ n: 1, count: 0, cause: 'initial mount' }])
  const [timers, setTimers] = useState([])
  const pending = useRef(new Set())
  const latest = renders.at(-1)

  // Clear outstanding timeouts on unmount (the visualizer is an external-ish
  // timer owner; leaking them would set state on an unmounted component).
  useEffect(() => {
    const set = pending.current
    return () => set.forEach(clearTimeout)
  }, [])

  function push(count, cause) {
    setRenders((r) => [...r, { n: latest.n + 1, count, cause }].slice(-5))
  }

  function snapshotClicks(times) {
    // Each call reads the SAME `latest.count` — exactly what your handler does.
    push(latest.count + 1, `${times}× setCount(${latest.count} + 1) → ${latest.count + 1}`)
  }
  function updaterClicks(times) {
    push(latest.count + times, `${times}× setCount(c => c + 1) → ${latest.count + times}`)
  }
  function startTimer() {
    const id = crypto.randomUUID()
    setTimers((t) => [...t, { id, n: latest.n, count: latest.count, fired: false }].slice(-4))
    const h = setTimeout(() => {
      pending.current.delete(h)
      setTimers((t) => t.map((x) => (x.id === id ? { ...x, fired: true } : x)))
    }, 3000)
    pending.current.add(h)
  }

  return (
    <div className="viz">
      <p className="viz-intro">
        Each card is one call of <code>App()</code>. Its <code>count</code> is a constant baked into that call. Handlers and timers created during a render
        hold on to <em>that</em> card, forever.
      </p>
      <div className="viz-row plates">
        {renders.map((r) => (
          <div key={r.n} className={`plate-card${r === latest ? ' is-latest' : ''}`}>
            <div className="plate-head">Render #{r.n}</div>
            <div className="plate-value">
              count = <strong>{r.count}</strong>
            </div>
            <div className="plate-cause">{r.cause}</div>
            {timers
              .filter((t) => t.n === r.n)
              .map((t) => (
                <div key={t.id} className={`plate-timer${t.fired ? ' is-fired' : ''}`}>
                  ⏱ {t.fired ? `fired: read count = ${t.count}` : `timer will read count = ${t.count}`}
                </div>
              ))}
          </div>
        ))}
      </div>
      <div className="viz-controls">
        <button className="btn" onClick={() => snapshotClicks(1)}>setCount(count + 1)</button>
        <button className="btn" onClick={() => snapshotClicks(3)}>…three times</button>
        <button className="btn" onClick={() => updaterClicks(3)}>setCount(c =&gt; c + 1) ×3</button>
        <button className="btn" onClick={startTimer}>Start a 3s timer here</button>
        <button className="btn" onClick={() => (setRenders([{ n: 1, count: 0, cause: 'initial mount' }]), setTimers([]))}>Reset</button>
      </div>
      {timers.some((t) => t.fired && t.count !== latest.count) && (
        <p className="viz-callout">
          A timer fired reading an old <code>count</code>, while the latest render shows {latest.count}. That&rsquo;s not a bug in React; it&rsquo;s a closure
          over an earlier render. The cure: an updater function, or a ref for &ldquo;latest value&rdquo;.
        </p>
      )}
    </div>
  )
}
