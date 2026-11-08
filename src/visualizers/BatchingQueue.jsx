// BatchingQueue — build a handler's queue, then watch React process it.
import { useEffect, useState } from 'react'

const KINDS = [
  { label: 'setN(n + 1)', kind: 'replace', make: (snap) => snap + 1, show: (snap) => `replace with ${snap + 1}` },
  { label: 'setN(n => n + 1)', kind: 'updater', apply: (x) => x + 1, show: () => 'n => n + 1' },
  { label: 'setN(5)', kind: 'replace', make: () => 5, show: () => 'replace with 5' },
  { label: 'setN(n => n * 2)', kind: 'updater', apply: (x) => x * 2, show: () => 'n => n * 2' },
]

export default function BatchingQueue() {
  const [n, setN] = useState(0)
  const [queue, setQueue] = useState([])
  const [shown, setShown] = useState(-1) // how many rows of the processing table are revealed

  // Reveal rows one by one; a timer is an external system -> effect with cleanup.
  useEffect(() => {
    if (shown < 0 || shown >= queue.length) return
    const id = setTimeout(() => setShown((s) => s + 1), 650)
    return () => clearTimeout(id)
  }, [shown, queue.length])

  // Derived: the whole processing table from (n, queue). No stored copies.
  const rows = []
  let acc = n
  for (const q of queue) {
    const before = acc
    acc = q.kind === 'replace' ? q.value : q.apply(acc)
    rows.push({ label: q.label, desc: q.desc, before, after: acc })
  }
  const finished = shown >= queue.length && queue.length > 0

  function add(k) {
    if (shown >= 0) return
    // "replace" values are computed from the snapshot n when the call happens.
    setQueue((qq) => [...qq, { ...k, value: k.make?.(n), desc: k.show(n) }])
  }

  return (
    <div className="viz">
      <p className="viz-intro">
        Compose an event handler by clicking calls. Every call is written to a queue; nothing changes until the handler returns. In this render{' '}
        <code>n = {n}</code>.
      </p>
      <div className="viz-controls">
        {KINDS.map((k) => (
          <button key={k.label} className="btn" onClick={() => add(k)} disabled={shown >= 0}>
            <code>{k.label}</code>
          </button>
        ))}
      </div>
      <div className="queue">
        <span className="pane-label">Queue</span>
        {queue.length === 0 ? <em className="muted">empty</em> : queue.map((q, i) => <span key={i} className="queue-chip">{q.desc}</span>)}
      </div>
      <div className="viz-controls">
        <button className="btn btn-primary" disabled={!queue.length || shown >= 0} onClick={() => setShown(0)}>
          Handler returns → process queue
        </button>
        <button
          className="btn"
          onClick={() => {
            if (finished) setN(acc)
            setQueue([])
            setShown(-1)
          }}
        >
          {finished ? `Render with n = ${acc} and start again` : 'Clear'}
        </button>
      </div>
      {shown >= 0 && (
        <table className="viz-table">
          <thead>
            <tr>
              <th>queued update</th>
              <th>n before</th>
              <th>returns</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, shown).map((r, i) => (
              <tr key={i}>
                <td>
                  <code>{r.desc}</code>
                </td>
                <td>{r.before}</td>
                <td>
                  <strong>{r.after}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {finished && <p className="viz-callout">One render. React stores {acc} and calls your component once with n = {acc}.</p>}
    </div>
  )
}
