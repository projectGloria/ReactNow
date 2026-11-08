// src/content/phases/p2-effects.js — The Effect Marshes
// ---------------------------------------------------------------------------
// Same lesson shape as p1-rendering.js (see the header there).
//
// Trial design notes (the harness mounts every trial under StrictMode):
//   - Every "external system" is a module-level object inside the snippet, so
//     each run of the trial gets a fresh one (the harness re-evaluates code).
//   - No trial leaves a timer or subscription running after unmount, even in
//     its buggy form: the trial runs in the live page and in Vitest.
//   - Where a tempting half-fix exists (dropping a dep, a ref guard), a later
//     check is there to catch it.
// ---------------------------------------------------------------------------

export default [
  {
    id: 'sync-external',
    title: 'Synchronizing with the outside',
    charted: true,
    prereqs: [],
    why: 'Effects exist for one job: keeping an external system in step with your render output.',
    how: [
      'Render must be pure, so it cannot touch anything outside React: no DOM writes, no network, no third-party widgets. But your UI often *has* to drive such a system: a map library, a video element, `document.title`, a socket. An Effect is the place for that: code React runs **after it has committed** the render to the DOM.',
      'Order of one update: React calls your component (render) → applies DOM changes (commit) → runs effects whose dependencies changed. By the time your effect runs, `ref.current` points at the real node and the screen agrees with state. During render the node may not exist yet, which is why reading a DOM ref there is a bug.',
      'For updates not caused by a user interaction, React usually lets the browser **paint first**, then runs the effect. For a click-caused update it may run the effect before paint so event-driven results are observable. If an effect does something visual that must never flicker (measuring and positioning a tooltip), use `useLayoutEffect`, which runs before paint every time.',
      'Think of an effect as a sentence: "after every commit where `heading` changed, make the compass point to `heading`." Not "when X happens, do Y", that is an event handler.',
    ],
    pitfall: 'Calling a widget\'s API in the render body via `ref.current`. On the first render the ref is still `null`, so the widget misses its initial value; on later renders you are mutating the outside world from code React may throw away.',
    reactDev: 'https://react.dev/learn/synchronizing-with-effects',
    visualizer: null,
    example: {
      code: `// A non-React widget: plain DOM, it owns its own node.
function createLamp(node) {
  const glass = document.createElement('div')
  glass.style.padding = '10px'
  glass.style.border = '1px solid #2b2118'
  node.appendChild(glass)
  return {
    shine(colour) {
      glass.style.background = colour
      glass.textContent = 'The lamp shows ' + colour
    },
    remove() {
      glass.remove()
    },
  }
}

function App() {
  const [colour, setColour] = useState('gold')
  const box = useRef(null)
  const lamp = useRef(null)

  // During render the <div> below may not exist yet: box.current is null on mount.
  console.log('render, box.current =', box.current)

  // Effect 1: after the first commit the node exists, so create the widget.
  useEffect(() => {
    lamp.current = createLamp(box.current)
    return () => lamp.current.remove()
  }, [])

  // Effect 2: after every commit where colour changed, push it to the widget.
  useEffect(() => {
    lamp.current.shine(colour)
  }, [colour])

  return (
    <div>
      <div ref={box} />
      <p>
        <button onClick={() => setColour('gold')}>Gold</button>{' '}
        <button onClick={() => setColour('tomato')}>Red</button>{' '}
        <button onClick={() => setColour('seagreen')}>Green</button>
      </p>
    </div>
  )
}`,
      tryThis: [
        'Open the console. What does `box.current` hold on the very first render, and on the next one?',
        'Move `lamp.current.shine(colour)` out of the effect and into the render body. What breaks on mount, and why?',
        'Delete the `[colour]` dependency array entirely. When does Effect 2 run now? Is that wrong or just wasteful here?',
      ],
    },
    trial: {
      symptom: 'The compass needle should read north the moment the chart opens. It is blank until you turn the ship.',
      code: `// A non-React widget: it owns its node and must be told what to show.
function createCompass(node) {
  return {
    point(direction) {
      node.textContent = 'Needle: ' + direction
    },
  }
}

function App() {
  const [heading, setHeading] = useState('north')
  const dial = useRef(null)

  // Keep the compass pointing at the heading
  if (dial.current) createCompass(dial.current).point(heading)

  return (
    <div>
      <div ref={dial} className="dial" />
      <button onClick={() => setHeading('east')}>Turn east</button>
      <button onClick={() => setHeading('south')}>Turn south</button>
    </div>
  )
}`,
      checks: [
        { label: 'On arrival the needle reads "Needle: north"', run: (t) => t.expectText('Needle: north') },
        {
          label: 'Turning east shows "Needle: east"',
          run: async (t) => {
            await t.click('Turn east')
            t.expectText('Needle: east')
          },
        },
        {
          label: 'Turning south shows "Needle: south"',
          run: async (t) => {
            await t.click('Turn south')
            t.expectText('Needle: south')
          },
        },
      ],
    },
  },

  {
    id: 'deps-closures',
    title: 'Dependencies & stale closures',
    charted: true,
    prereqs: ['sync-external'],
    why: 'The deps array is not an optimization; it declares which snapshot values your effect reads.',
    how: [
      'An effect is a function created during a render, so it closes over **that render\'s** props and state, exactly like an event handler (P1: state as a snapshot). Anything it schedules (an interval, a listener, a promise callback) keeps reading that same snapshot.',
      'After each commit React compares every dependency with its previous value using `Object.is`. If any changed, it runs the old effect\'s cleanup, then the **new** effect, which closes over the new snapshot. If nothing changed, the old effect (and its old closure) stays in charge.',
      'So `[]` does not mean "run once, cleverly". It means "this effect reads nothing reactive". If it actually reads `knots`, you have lied to React, and your interval will read render #1\'s `knots` forever. The linter (`react-hooks/exhaustive-deps`) catches the lie; do not silence it.',
      'Honest ways out: list the dependency (the effect re-synchronizes when it changes), use an updater (`setX(x => ...)`) so you no longer need to read the state, or move non-reactive reads into an Effect Event (later lesson).',
    ],
    pitfall: '`useEffect(() => { setInterval(() => setTotal(total + step), 1000) }, [])`. Both `total` and `step` are frozen at their first-render values. The linter warned you; the `// eslint-disable-next-line` is the bug.',
    reactDev: 'https://react.dev/learn/lifecycle-of-reactive-effects',
    visualizer: 'StaleClosureLab',
    example: {
      code: `function App() {
  const [step, setStep] = useState(1)
  const [seen, setSeen] = useState(null)

  useEffect(() => {
    // This closure was created in the FIRST render. step = 1 inside it, forever.
    const id = setInterval(() => setSeen(step), 500)
    return () => clearInterval(id)
  }, []) // <- the lie: the effect reads step

  return (
    <div>
      <p>Rendered step: <strong>{step}</strong></p>
      <p>The interval reads step = <strong>{seen ?? '…'}</strong></p>
      <button onClick={() => setStep((s) => s + 1)}>step + 1</button>
    </div>
  )
}`,
      tryThis: [
        'Click "step + 1" a few times. Why does the interval keep reporting 1?',
        'Put `step` in the dependency array. Add a `console.log` in the cleanup: when does the old interval die?',
        'Count how many intervals are created when you click 5 times with `[step]`. Is that a problem here?',
      ],
    },
    trial: {
      symptom: 'Weigh anchor and the log should start counting leagues. The ship reports "Becalmed" forever.',
      code: `function App() {
  const [knots, setKnots] = useState(0)
  const [distance, setDistance] = useState(0)

  // Every 50ms, advance the log by the current speed
  useEffect(() => {
    const id = setInterval(() => setDistance((d) => d + knots), 50)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <p>Speed: {knots} knots</p>
      <p>Log: {distance} leagues, {distance > 0 ? 'Underway' : 'Becalmed'}</p>
      <button onClick={() => setKnots((k) => k + 1)}>Weigh anchor</button>
    </div>
  )
}`,
      checks: [
        {
          label: 'At anchor (0 knots) the ship stays "Becalmed"',
          run: async (t) => {
            await t.wait(200)
            t.expectText('Speed: 0 knots')
            t.expectText('Becalmed')
          },
        },
        {
          label: 'After weighing anchor the log reports "Underway"',
          run: async (t) => {
            await t.click('Weigh anchor')
            await t.wait(300)
            t.expectText('Underway')
          },
        },
      ],
    },
  },

  {
    id: 'cleanup',
    title: 'Cleanup',
    charted: true,
    prereqs: ['sync-external'],
    why: 'Every subscription you open must be closed, or it outlives the render that made it.',
    how: [
      'An effect may return a function: the **cleanup**. React calls it with the *old* values before running the effect again with new values, and once more when the component unmounts. Setup and cleanup are a pair: connect / disconnect, subscribe / unsubscribe, start / stop, add / remove.',
      'Sequence for a dependency change from 16 to 9: render with 9 → commit → `cleanup()` from the channel-16 effect → `setup()` for channel 9. The cleanup closure still sees `channel = 16`, which is exactly what you need to unsubscribe the right thing.',
      'Without cleanup, nothing stops the old subscription. It keeps calling `setState` with handlers from a dead render, so you get duplicates, wrong data from the previous id, and memory that never frees. In development StrictMode runs one extra setup+cleanup cycle on mount specifically to surface this (last lesson of the phase).',
      'The rule of thumb from the docs: the user should not be able to tell whether setup ran once, or setup → cleanup → setup.',
    ],
    pitfall: 'Subscribing in an effect that depends on an id (`roomId`, `channel`, `userId`) without returning an unsubscribe. Switching ids leaves the old listener alive, so you hear two rooms at once.',
    reactDev: 'https://react.dev/learn/synchronizing-with-effects#step-3-add-cleanup-if-needed',
    visualizer: 'EffectLifecycle',
    example: {
      code: `// The "server": logs what happens to each connection.
function createConnection(port, onLog) {
  return {
    connect: () => onLog('✅ connect to ' + port),
    disconnect: () => onLog('❌ disconnect from ' + port),
  }
}

function Harbour({ port, onLog }) {
  useEffect(() => {
    const conn = createConnection(port, onLog)
    conn.connect()
    // Cleanup sees THIS effect's port, even after the prop has moved on.
    return () => conn.disconnect()
  }, [port, onLog])
  return <p>Moored at {port}</p>
}

function App() {
  const [port, setPort] = useState('Plymouth')
  const [moored, setMoored] = useState(true)
  const [log, setLog] = useState([])
  // Stable identity, so it does not re-trigger the effect on every render.
  const onLog = useCallback((line) => setLog((l) => [...l, line].slice(-8)), [])

  return (
    <div>
      <select value={port} onChange={(e) => setPort(e.target.value)}>
        <option>Plymouth</option>
        <option>Falmouth</option>
        <option>Cape Town</option>
      </select>{' '}
      <button onClick={() => setMoored(!moored)}>{moored ? 'Cast off' : 'Moor'}</button>
      {moored && <Harbour port={port} onLog={onLog} />}
      <ol>{log.map((line, i) => <li key={i}>{line}</li>)}</ol>
    </div>
  )
}`,
      tryThis: [
        'Read the first three log lines. Why connect → disconnect → connect on mount? (The preview runs in StrictMode.)',
        'Switch ports. Which port does the disconnect line name, and why that one?',
        'Delete the `return () => conn.disconnect()` line and switch ports three times. How many harbours are you connected to now?',
      ],
    },
    trial: {
      symptom: 'Each Mayday is heard twice, and after tuning to channel 9 the ship still hears channel 16.',
      code: `// A tiny radio set: the external system, living outside React.
const radio = {
  listeners: [],
  subscribe(channel, fn) {
    this.listeners.push({ channel, fn })
  },
  unsubscribe(channel, fn) {
    this.listeners = this.listeners.filter((l) => !(l.channel === channel && l.fn === fn))
  },
  broadcast(channel) {
    this.listeners.filter((l) => l.channel === channel).forEach((l) => l.fn())
  },
}

function App() {
  const [channel, setChannel] = useState(16)
  const [heard, setHeard] = useState(0)

  useEffect(() => {
    function onMessage() {
      setHeard((h) => h + 1)
    }
    radio.subscribe(channel, onMessage)
  }, [channel])

  return (
    <div>
      <p>Listening on channel {channel}</p>
      <p>Heard: {heard}</p>
      <button onClick={() => setChannel(9)}>Tune to 9</button>
      <button onClick={() => radio.broadcast(16)}>Broadcast on 16</button>
      <button onClick={() => radio.broadcast(9)}>Broadcast on 9</button>
    </div>
  )
}`,
      checks: [
        {
          label: 'One broadcast on 16 is heard exactly once',
          run: async (t) => {
            await t.click('Broadcast on 16')
            t.expectText('Heard: 1')
          },
        },
        {
          label: 'After tuning to 9, a broadcast on 16 is not heard',
          run: async (t) => {
            await t.click('Tune to 9')
            await t.click('Broadcast on 16')
            t.expectText('Listening on channel 9')
            t.expectText('Heard: 1')
          },
        },
        {
          label: 'A broadcast on 9 is heard once',
          run: async (t) => {
            await t.click('Broadcast on 9')
            t.expectText('Heard: 2')
          },
        },
      ],
    },
  },

  {
    id: 'not-needed',
    title: 'You might not need an effect',
    charted: true,
    prereqs: ['deps-closures'],
    why: 'Derived data and event-driven logic in effects cause extra renders and sync bugs.',
    how: [
      'Ask one question: **why** should this code run? If the answer is "because the component is on screen and showing X", it is synchronization: an effect. If the answer is "because the user did something", it belongs in that event handler, where you know exactly what happened.',
      'An effect only sees *that a value changed*, not *who changed it or why*. `useEffect(() => notify(...), [cart])` also fires on mount, when the cart was restored from storage, or when another tab synced it. The handler knows "the user clicked Add".',
      'The other big family, already met in P1: values computable from props/state. Compute them during render. And to reset state when a prop changes, give the component a `key` instead of a `setState` in an effect; React then throws the old state away for you.',
      'The cost of getting it wrong: every `setState` inside an effect means render → commit → effect → render → commit. The user sees one frame of stale UI, and chains of these effects become a swamp where nobody can say what triggers what.',
    ],
    pitfall: 'An effect watching state to "react to" a user action: `useEffect(() => { if (submitted) post(form) }, [submitted])`. Do the work in `handleSubmit`; there is no flag to keep in sync.',
    reactDev: 'https://react.dev/learn/you-might-not-need-an-effect',
    visualizer: null,
    example: {
      code: `const SAILORS = ['Ada', 'Mary', 'Charles']

// Draft is local state; the parent resets it with a key, not with an effect.
function NoteBox({ sailor }) {
  const [draft, setDraft] = useState('')
  return <input aria-label="note" placeholder={'note about ' + sailor} value={draft} onChange={(e) => setDraft(e.target.value)} />
}

function App() {
  const [sailor, setSailor] = useState('Ada')
  const [praised, setPraised] = useState([])
  const [notice, setNotice] = useState('')

  // Derived during render: no state, no effect.
  const count = praised.filter((n) => n === sailor).length

  // Event logic lives in the event handler: it knows what the user did.
  function praise() {
    setPraised([...praised, sailor])
    setNotice('Praised ' + sailor)
  }

  return (
    <div>
      <p>{SAILORS.map((s) => <button key={s} onClick={() => setSailor(s)}>{s}</button>)}</p>
      <p>{sailor} has been praised {count} time(s).</p>
      <button onClick={praise}>Praise {sailor}</button>
      {notice && <p><em>{notice}</em></p>}
      <NoteBox key={sailor} sailor={sailor} />
    </div>
  )
}`,
      tryThis: [
        'Type a note about Ada, then switch to Mary. Why is the box empty? Remove `key={sailor}` and compare.',
        'Rewrite `notice` as `useEffect(() => setNotice(...), [praised])`. What does it show after you switch sailors, and why is that wrong?',
      ],
    },
    trial: {
      symptom: 'Nothing has been stowed yet, but the purser already announces "Stowed Tea" the moment the ledger opens.',
      code: `function App() {
  const [hold, setHold] = useState(['Tea'])
  const [notice, setNotice] = useState('')

  // Announce whatever was just stowed
  useEffect(() => {
    if (hold.length > 0) setNotice('Stowed ' + hold.at(-1))
  }, [hold])

  function stow(item) {
    setHold([...hold, item])
  }

  return (
    <div>
      <p>Hold: {hold.join(', ')}</p>
      {notice && <p role="status">{notice}</p>}
      <button onClick={() => stow('Rum')}>Stow Rum</button>
      <button onClick={() => stow('Spice')}>Stow Spice</button>
    </div>
  )
}`,
      checks: [
        {
          label: 'On arrival the hold holds Tea and no notice is shown',
          run: (t) => {
            t.expectText('Hold: Tea')
            t.expectNoText('Stowed')
          },
        },
        {
          label: 'Stowing Rum announces "Stowed Rum"',
          run: async (t) => {
            await t.click('Stow Rum')
            t.expectText('Hold: Tea, Rum')
            t.expectText('Stowed Rum')
          },
        },
        {
          label: 'Stowing Spice announces "Stowed Spice"',
          run: async (t) => {
            await t.click('Stow Spice')
            t.expectText('Stowed Spice')
          },
        },
      ],
    },
  },

  {
    id: 'refs',
    title: 'Refs: the escape hatch',
    charted: true,
    prereqs: ['deps-closures'],
    why: 'A ref is a mutable box React ignores during render; perfect for values that should not trigger renders.',
    how: [
      '`useRef(initial)` returns the **same** object `{ current: initial }` on every render of that component instance. React stores it on the fiber, like state, but changing `.current` does not schedule a render and React never reads it.',
      'A plain `let x` inside the component body is the opposite: it is re-created on every render. A handler from render #5 and a handler from render #6 see two different `x` variables. Anything you need to remember *between* renders lives in state (if it is shown) or a ref (if it is not).',
      'Use refs for: timer and interval ids, the previous value of something, a DOM node (`<input ref={inputRef}>` then `inputRef.current.focus()`), an instance of a non-React widget. Do not read or write `ref.current` during render (except lazy initialisation); that makes render impure and the result invisible to React.',
      'Rule: if the screen should change when it changes, it is state. If only your handlers and effects need it, it is a ref.',
    ],
    pitfall: 'Storing a timeout id in a `let` inside the component. The first re-render throws that variable away, so the Cancel button calls `clearTimeout(null)` and the timer fires anyway.',
    reactDev: 'https://react.dev/learn/referencing-values-with-refs',
    visualizer: null,
    example: {
      code: `function App() {
  const [startedAt, setStartedAt] = useState(null)
  const [now, setNow] = useState(null)
  const intervalRef = useRef(null) // needed by handlers, never shown: a ref
  const logRef = useRef(null)      // a DOM node

  function start() {
    setStartedAt(Date.now())
    setNow(Date.now())
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => setNow(Date.now()), 100)
  }

  function stop() {
    clearInterval(intervalRef.current)
    logRef.current.focus() // imperative DOM access, in a handler
  }

  // Don't leave the interval running if the component goes away.
  useEffect(() => () => clearInterval(intervalRef.current), [])

  const secs = startedAt && now ? ((now - startedAt) / 1000).toFixed(1) : '0.0'

  return (
    <div>
      <h3>{secs} s</h3>
      <button onClick={start}>Start</button> <button onClick={stop}>Stop</button>
      <p><input ref={logRef} placeholder="log entry (focused on stop)" /></p>
    </div>
  )
}`,
      tryThis: [
        'Replace `intervalRef` with `let intervalId = null` in the component body. Start, then Stop. Why does it keep running?',
        'Store `secs` in a ref instead of deriving it. What happens to the display?',
      ],
    },
    trial: {
      symptom: 'Undo should recall the dispatch before it leaves. You click Undo in time, and it is sent anyway.',
      code: `function App() {
  const [status, setStatus] = useState('Draft')
  let timeoutId = null

  function send() {
    setStatus('Sending…')
    timeoutId = setTimeout(() => setStatus('Sent to the Admiralty'), 300)
  }

  function undo() {
    clearTimeout(timeoutId)
    setStatus('Recalled')
  }

  return (
    <div>
      <p>Dispatch: {status}</p>
      <button onClick={send}>Send dispatch</button>
      <button onClick={undo}>Undo</button>
    </div>
  )
}`,
      checks: [
        {
          label: 'Sending shows "Sending…"',
          run: async (t) => {
            await t.click('Send dispatch')
            t.expectText('Dispatch: Sending')
          },
        },
        {
          label: 'Undo in time keeps it "Recalled", even 400ms later',
          run: async (t) => {
            await t.click('Undo')
            await t.wait(400)
            t.expectText('Dispatch: Recalled')
            t.expectNoText('Sent to the Admiralty')
          },
        },
        {
          label: 'Sending again without Undo delivers it',
          run: async (t) => {
            await t.click('Send dispatch')
            await t.wait(400)
            t.expectText('Dispatch: Sent to the Admiralty')
          },
        },
      ],
    },
  },

  {
    id: 'effect-event',
    title: 'useEffectEvent',
    charted: true,
    prereqs: ['deps-closures', 'refs'],
    why: 'Read the latest props inside an effect without re-subscribing every time they change.',
    how: [
      'Some code inside an effect is not about synchronization at all: it is an *event* the external system fires ("connected", "message arrived", "tick"). It wants the latest props, but a change to those props should not tear down the connection. Listing them as deps reconnects too often; leaving them out reads a stale closure.',
      '`const onHail = useEffectEvent(() => ...)` splits that logic out. Call it at the top level of your component. Inside, it always sees the **latest committed** props and state at the moment it is called, and it is *not* reactive, so it does not go in the deps array (the linter will tell you to leave it out).',
      'The rules (from the React docs): only call it from inside effects, or from other Effect Events of the same component. Never call it during render, never pass it to children or other hooks. Its identity changes on every render on purpose, so you can\'t smuggle it around.',
      'It is not a way to dodge the dependency linter. Reactive values that decide *what to connect to* (the room) stay real dependencies. Only the "what to do when it fires" part moves into the Effect Event. Under the hood it is the old "latest value in a ref" pattern, made safe for concurrent rendering.',
    ],
    pitfall: 'Removing `theme` from the deps with `// eslint-disable-next-line` to stop reconnects. The reconnects stop, and the notification shows the theme you had at mount forever.',
    reactDev: 'https://react.dev/learn/separating-events-from-effects',
    visualizer: 'StaleClosureLab',
    example: {
      code: `function App() {
  const [watchman, setWatchman] = useState('Ada')
  const [log, setLog] = useState([])

  // Not reactive: reads the latest watchman whenever the bell rings.
  const onBell = useEffectEvent((n) => {
    setLog((l) => [...l, 'Bell ' + n + ': ' + watchman + ' on watch'].slice(-5))
  })

  useEffect(() => {
    let n = 0
    const id = setInterval(() => onBell(++n), 1000)
    return () => clearInterval(id)
  }, []) // honest: the effect itself reads nothing reactive

  return (
    <div>
      {['Ada', 'Mary', 'Charles'].map((w) => (
        <button key={w} onClick={() => setWatchman(w)}>{w}</button>
      ))}
      <p>On watch: {watchman}</p>
      <ol>{log.map((line, i) => <li key={i}>{line}</li>)}</ol>
    </div>
  )
}`,
      tryThis: [
        'Switch watchman a few times. Does the bell count restart? Why not?',
        'Inline the body of onBell into the interval and add `watchman` to the deps. What happens to the bell numbers now?',
        'Try calling `onBell(0)` from a button\'s onClick. Why is that forbidden?',
      ],
    },
    trial: {
      symptom: 'Swapping the lantern drops the radio line and redials (watch the line number). Fix it without the hail reporting the wrong lantern.',
      code: `// The signal station: outside React. Each connect opens a new numbered line.
let nextLine = 1
const station = {
  open: new Set(),
  connect(port, onHail) {
    const entry = { port, onHail }
    this.open.add(entry)
    return { line: nextLine++, close: () => this.open.delete(entry) }
  },
  hail(port) {
    this.open.forEach((e) => e.port === port && e.onHail())
  },
}

function App() {
  const [port, setPort] = useState('Plymouth')
  const [lantern, setLantern] = useState('white')
  const [line, setLine] = useState(0)
  const [last, setLast] = useState('none yet')

  useEffect(() => {
    const conn = station.connect(port, () => {
      setLast('answered with a ' + lantern + ' lantern')
    })
    setLine(conn.line)
    return () => conn.close()
  }, [port, lantern])

  return (
    <div>
      <p>Port: {port}, line #{line}</p>
      <p>Lantern: {lantern}</p>
      <p>Last hail: {last}</p>
      <button onClick={() => setLantern(lantern === 'white' ? 'red' : 'white')}>Swap lantern</button>
      <button onClick={() => setPort('Falmouth')}>Sail to Falmouth</button>
      <button onClick={() => station.hail(port)}>Hail the ship</button>
    </div>
  )
}`,
      checks: [
        {
          label: 'Swapping the lantern keeps the same radio line',
          run: async (t) => {
            const before = /line #(\d+)/.exec(t.text())?.[1]
            await t.click('Swap lantern')
            t.expectText('Lantern: red')
            const after = /line #(\d+)/.exec(t.text())?.[1]
            if (before !== after) throw new Error(`The line changed from #${before} to #${after}: swapping the lantern reconnected.`)
          },
        },
        {
          label: 'A hail is answered with the current (red) lantern',
          run: async (t) => {
            await t.click('Hail the ship')
            t.expectText('answered with a red lantern')
          },
        },
        {
          label: 'Sailing to Falmouth does open a new line, and hails still work there',
          run: async (t) => {
            const before = /line #(\d+)/.exec(t.text())?.[1]
            await t.click('Sail to Falmouth')
            const after = /line #(\d+)/.exec(t.text())?.[1]
            if (before === after) throw new Error(`Still on line #${before}: changing port must reconnect.`)
            await t.click('Swap lantern')
            await t.click('Hail the ship')
            t.expectText('Port: Falmouth')
            t.expectText('answered with a white lantern')
          },
        },
      ],
    },
  },

  {
    id: 'custom-hooks',
    title: 'Custom hooks',
    charted: true,
    prereqs: ['cleanup', 'not-needed'],
    why: 'Hooks share stateful logic, not state. Each call gets its own slots on the fiber.',
    how: [
      'A custom hook is a function whose name starts with `use` and that calls other hooks. That is the whole mechanism: no registration, no magic. The `use` prefix tells you (and the linter) that it follows the rules of hooks.',
      'Under the hood, each component fiber keeps a linked list of hook slots, matched by **call order**. When `Roster` calls `useCrew()`, the `useState` inside it takes a slot on Roster\'s fiber. When `Headcount` calls `useCrew()`, it gets a different slot on a different fiber. Same code, two independent pieces of state.',
      'So a custom hook is a way to name and reuse a *recipe*: "subscribe to the window size", "an interval that cleans up", "a form field with validation". If two components must see the **same** data, the hook is not the answer; lift the state (P1) or put it in a store or context (P3).',
      'Good hooks hide effects. Components that call `useOnlineStatus()` read like a sentence and cannot forget the cleanup, because it lives once, inside the hook.',
    ],
    pitfall: 'Calling `useCart()` in the header and in the product page and expecting the header badge to update when the page adds an item. Two calls, two carts.',
    reactDev: 'https://react.dev/learn/reusing-logic-with-custom-hooks',
    visualizer: null,
    example: {
      code: `// The recipe: an interval that is always cleaned up.
function useTicker(ms) {
  const [ticks, setTicks] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTicks((t) => t + 1), ms)
    return () => clearInterval(id)
  }, [ms])
  return ticks
}

function Bell({ name, ms }) {
  // Each Bell gets its OWN ticks state: same hook, separate fiber slots.
  const ticks = useTicker(ms)
  return <li>{name}: {ticks} rings (every {ms} ms)</li>
}

function App() {
  return (
    <ul>
      <Bell name="Fore bell" ms={1000} />
      <Bell name="Aft bell" ms={1500} />
    </ul>
  )
}`,
      tryThis: [
        'Add a third Bell. How much new effect code did you write?',
        'Write `useToggle(initial)` returning `[on, toggle]` and use it for a lantern in each Bell.',
      ],
    },
    trial: {
      symptom: 'Signing Grace on adds her to the roster, but the headcount at the top still says 2.',
      code: `function useCrew() {
  const [crew, setCrew] = useState(['Ada', 'Mary'])
  function signOn(name) {
    setCrew((c) => [...c, name])
  }
  return { crew, signOn }
}

function Headcount() {
  const { crew } = useCrew()
  return <p>Headcount: {crew.length}</p>
}

function Roster() {
  const { crew, signOn } = useCrew()
  return (
    <section>
      <ul>{crew.map((name) => <li key={name}>{name}</li>)}</ul>
      <button onClick={() => signOn('Grace')}>Sign on Grace</button>
    </section>
  )
}

function App() {
  return (
    <div>
      <Headcount />
      <Roster />
    </div>
  )
}`,
      checks: [
        { label: 'Starts with "Headcount: 2"', run: (t) => t.expectText('Headcount: 2') },
        {
          label: 'Signing on Grace lists three sailors',
          run: async (t) => {
            await t.click('Sign on Grace')
            t.expectCount('li', 3)
            t.expectText('Grace')
          },
        },
        { label: 'The headcount agrees: "Headcount: 3"', run: (t) => t.expectText('Headcount: 3') },
      ],
    },
  },

  {
    id: 'strict-mode',
    title: 'StrictMode double-invoke',
    charted: true,
    prereqs: ['cleanup'],
    why: 'StrictMode mounts twice in dev to prove your cleanup is correct.',
    how: [
      'In development, `<StrictMode>` adds checks that production never runs: components render an extra time (catches impure render, P1), every effect runs **one extra setup → cleanup cycle** before the real setup, and callback refs get an extra setup → cleanup too.',
      'The extra effect cycle simulates what will happen for real later: the user navigates away and back, a list item is hidden and shown, or a future React feature preserves state while unmounting. If setup → cleanup → setup leaves things different from a single setup, your cleanup is incomplete, and those real scenarios will break.',
      'So when you see "my effect runs twice", the fix is never to switch StrictMode off and never to add a `useRef(false)` "already ran" guard. Make cleanup undo setup: disconnect what you connected, remove the node you appended, ignore the fetch result you no longer want.',
      'Some things legitimately should run once per app load (analytics init, reading a token). Those go in module scope or a top-level `if (!didInit)` outside components, not in a component effect.',
    ],
    pitfall: 'Leaflet\'s "Map container is already initialized" in dev. The tempting fix is a ref guard; it silences StrictMode and leaves the real bug (no `map.remove()`) for production navigation to find.',
    reactDev: 'https://react.dev/reference/react/StrictMode',
    visualizer: 'EffectLifecycle',
    example: {
      code: `// Module scope: survives re-renders and remounts, like a real server.
const lines = { open: 0 }

function Telegraph() {
  useEffect(() => {
    lines.open++
    console.log('setup, open lines:', lines.open)
    return () => {
      lines.open--
      console.log('cleanup, open lines:', lines.open)
    }
  }, [])
  return <p>Telegraph connected.</p>
}

function App() {
  const [on, setOn] = useState(true)
  const [reading, setReading] = useState(null)
  return (
    <div>
      <button onClick={() => setOn(!on)}>{on ? 'Unmount' : 'Mount'}</button>{' '}
      <button onClick={() => setReading(lines.open)}>Count open lines</button>
      {on && <Telegraph />}
      <p>Open lines: {reading ?? 'press Count'}</p>
    </div>
  )
}`,
      tryThis: [
        'Open the console: setup, cleanup, setup on mount. Press Count: is it 1? That is a correct effect.',
        'Delete the `lines.open--` line and remount a few times. What does the counter tell you production would leak on every navigation?',
      ],
    },
    trial: {
      symptom: 'The chart appears twice on top of itself, and switching seas stacks a third copy.',
      code: `// A third-party chart library (think Leaflet). Plain DOM, not React.
function createChart(node, sea) {
  const layer = document.createElement('div')
  layer.className = 'chart-layer'
  layer.textContent = 'Chart of the ' + sea
  node.appendChild(layer)
  return { destroy: () => layer.remove() }
}

function Chart({ sea }) {
  const box = useRef(null)
  useEffect(() => {
    createChart(box.current, sea)
  }, [sea])
  return <div ref={box} />
}

function App() {
  const [sea, setSea] = useState('Channel')
  const [shown, setShown] = useState(true)
  return (
    <div>
      <button onClick={() => setSea('North Sea')}>Survey the North Sea</button>
      <button onClick={() => setShown(!shown)}>{shown ? 'Stow the chart' : 'Unroll the chart'}</button>
      {shown && <Chart sea={sea} />}
    </div>
  )
}`,
      checks: [
        {
          label: 'Exactly one chart on arrival',
          run: (t) => {
            t.expectCount('.chart-layer', 1)
            t.expectText('Chart of the Channel')
          },
        },
        {
          label: 'Switching to the North Sea replaces the chart',
          run: async (t) => {
            await t.click('Survey the North Sea')
            t.expectCount('.chart-layer', 1)
            t.expectText('Chart of the North Sea')
            t.expectNoText('Chart of the Channel')
          },
        },
        {
          label: 'Stowing and unrolling leaves exactly one chart',
          run: async (t) => {
            await t.click('Stow the chart')
            t.expectCount('.chart-layer', 0)
            await t.click('Unroll the chart')
            t.expectCount('.chart-layer', 1)
          },
        },
      ],
    },
  },
]

export const checkpoint = [
  {
    q: 'When exactly does an effect\'s setup run, when does its cleanup run, and which values does the cleanup see?',
    model:
      'Setup runs after React commits the render to the DOM (usually after paint). After a later commit where a dependency changed (Object.is), React first runs the previous cleanup, then the new setup. On unmount it runs the last cleanup. The cleanup is a closure from the old render, so it sees the old props and state, which is how it unsubscribes the right thing.',
  },
  {
    q: 'An interval set up in `useEffect(..., [])` keeps using `count = 0` even though the screen shows 5. Explain the mechanism and give two correct fixes.',
    model:
      'The effect was created in the first render and closes over that render\'s count (0). With [] React never re-runs it, so the interval keeps the first snapshot. Fix 1: list count as a dependency so the effect re-synchronizes (cleanup old interval, start new). Fix 2: use an updater setCount(c => c + 1) so the effect no longer reads count. (For non-reactive reads: an Effect Event.)',
  },
  {
    q: 'Why does StrictMode run your effect twice in development, and why is a `useRef` "already ran" guard the wrong fix?',
    model:
      'In dev StrictMode runs one extra setup → cleanup cycle to prove cleanup mirrors setup; users should not be able to tell setup-once from setup-cleanup-setup. A ref guard only hides the symptom: the missing cleanup still leaks on real unmount/remount (navigation, hidden items). The fix is a cleanup that undoes the setup.',
  },
  {
    q: 'When is `useEffectEvent` the right tool, and when is it just an `eslint-disable` in disguise?',
    model:
      'Right: part of the effect is an event fired by the external system (connected, message, tick) that needs the latest props without re-synchronizing when they change. Wrong: hiding values that decide what to synchronize with (room id, url); those must stay dependencies. Effect Events are only called from effects, never in render or passed to children.',
  },
]
