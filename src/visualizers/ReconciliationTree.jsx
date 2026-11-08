// ReconciliationTree — the same list, keyed by index vs by id, rendered for real.
import { useState } from 'react'

let seq = 0
const NAMES = ['Grace', 'Ada', 'Mary', 'Charles', 'Isambard', 'Florence', 'Michael']

/**
 * Each row mints an "instance tag" once, at mount (lazy useState initializer).
 * The tag is the row's fiber identity made visible: if the tag moves with the
 * name, React kept the instance; if it stays put while names shift, React
 * reused the *slot* and handed the old state to a different item.
 */
function Row({ name, k }) {
  const [tag] = useState(() => `#${(++seq).toString(36).padStart(2, '0')}`)
  return (
    <li className="recon-row">
      <span className="recon-key">key={k}</span>
      <span className="recon-tag">{tag}</span>
      <strong>{name}</strong>
      <input aria-label={`note for ${name}`} placeholder="type a note" />
    </li>
  )
}

export default function ReconciliationTree() {
  const [items, setItems] = useState([
    { id: 'a', name: 'Ada' },
    { id: 'b', name: 'Mary' },
    { id: 'c', name: 'Charles' },
  ])

  function addTop() {
    const used = new Set(items.map((i) => i.name))
    const name = NAMES.find((n) => !used.has(n)) ?? `Sailor ${items.length + 1}`
    setItems([{ id: crypto.randomUUID().slice(0, 4), name }, ...items])
  }

  return (
    <div className="viz">
      <p className="viz-intro">
        Type a note beside Ada in <em>both</em> lists, then add a sailor at the top. The <span className="recon-tag">#tag</span> is the component instance
        React kept (minted once at mount).
      </p>
      <div className="viz-controls">
        <button className="btn" onClick={addTop}>Add sailor at top</button>
        <button className="btn" onClick={() => setItems((it) => it.toReversed())}>Reverse</button>
        <button className="btn" onClick={() => setItems((it) => it.slice(1))}>Remove first</button>
      </div>
      <div className="viz-cols">
        <div>
          <div className="pane-label">key = index</div>
          <ul className="recon-list">
            {items.map((it, i) => (
              <Row key={i} k={i} name={it.name} />
            ))}
          </ul>
        </div>
        <div>
          <div className="pane-label">key = item.id</div>
          <ul className="recon-list">
            {items.map((it) => (
              <Row key={it.id} k={`"${it.id}"`} name={it.name} />
            ))}
          </ul>
        </div>
      </div>
      <p className="viz-callout">
        Left: instances stay in their slots, so the notes stay too and now sit beside the wrong names. Right: instances travel with their items. Keys are
        identity, not a formality.
      </p>
    </div>
  )
}
