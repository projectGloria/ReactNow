// EventLoop — step through a program with the stack and both queues visible.
import { useState } from 'react'

const PROGRAM = [
  "console.log('A')",
  "setTimeout(() => console.log('B'), 0)",
  "Promise.resolve().then(() => console.log('C'))",
  "queueMicrotask(() => console.log('D'))",
  "console.log('E')",
]

// Precomputed frames: the model is fixed, so the timeline is data, not logic.
const FRAMES = [
  { line: -1, stack: [], micro: [], macro: [], out: [], say: 'The script is about to run. One call stack, two queues.' },
  { line: 0, stack: ['script', "log('A')"], micro: [], macro: [], out: ['A'], say: 'Synchronous code runs immediately on the stack.' },
  { line: 1, stack: ['script', 'setTimeout'], micro: [], macro: ["() => log('B')"], out: ['A'], say: 'setTimeout hands the callback to the timer API; when 0ms passes it joins the macrotask queue.' },
  { line: 2, stack: ['script', 'then'], micro: ["() => log('C')"], macro: ["() => log('B')"], out: ['A'], say: 'The promise is already resolved, so its .then callback joins the MICROtask queue.' },
  { line: 3, stack: ['script', 'queueMicrotask'], micro: ["() => log('C')", "() => log('D')"], macro: ["() => log('B')"], out: ['A'], say: 'queueMicrotask also goes to the microtask queue, behind C.' },
  { line: 4, stack: ['script', "log('E')"], micro: ["() => log('C')", "() => log('D')"], macro: ["() => log('B')"], out: ['A', 'E'], say: 'Still synchronous: E prints before any queued work.' },
  { line: -1, stack: [], micro: ["() => log('C')", "() => log('D')"], macro: ["() => log('B')"], out: ['A', 'E'], say: 'The stack is empty. The loop now drains ALL microtasks before touching a macrotask.' },
  { line: -1, stack: ["log('C')"], micro: ["() => log('D')"], macro: ["() => log('B')"], out: ['A', 'E', 'C'], say: 'Microtask C runs.' },
  { line: -1, stack: ["log('D')"], micro: [], macro: ["() => log('B')"], out: ['A', 'E', 'C', 'D'], say: 'Microtask D runs. Microtask queue empty.' },
  { line: -1, stack: [], micro: [], macro: ["() => log('B')"], out: ['A', 'E', 'C', 'D'], say: 'The browser may paint a frame here, between tasks.' },
  { line: -1, stack: ["log('B')"], micro: [], macro: [], out: ['A', 'E', 'C', 'D', 'B'], say: 'Now ONE macrotask runs: the timeout. Then the loop checks microtasks again, and so on.' },
]

export default function EventLoop() {
  const [i, setI] = useState(0)
  const f = FRAMES[i]
  return (
    <div className="viz">
      <pre className="viz-code">
        {PROGRAM.map((l, k) => (
          <div key={k} className={k === f.line ? 'is-now' : ''}>
            {l}
          </div>
        ))}
      </pre>
      <div className="viz-controls">
        <button className="btn" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={() => setI((x) => Math.min(FRAMES.length - 1, x + 1))} disabled={i === FRAMES.length - 1}>
          Step →
        </button>
        <button className="btn" onClick={() => setI(0)}>Restart</button>
        <span className="muted">
          frame {i + 1}/{FRAMES.length}
        </span>
      </div>
      <p className="viz-callout">{f.say}</p>
      <div className="loop-grid">
        <Box title="Call stack" items={[...f.stack].reverse()} />
        <Box title="Microtasks" items={f.micro} accent />
        <Box title="Macrotasks" items={f.macro} />
        <Box title="Console" items={f.out} mono />
      </div>
    </div>
  )
}

function Box({ title, items, accent, mono }) {
  return (
    <div className={`loop-box${accent ? ' is-accent' : ''}`}>
      <div className="pane-label">{title}</div>
      {items.length === 0 ? <em className="muted">empty</em> : items.map((it, k) => <div key={k} className={mono ? 'loop-out' : 'loop-item'}>{it}</div>)}
    </div>
  )
}
