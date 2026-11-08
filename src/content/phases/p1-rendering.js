// src/content/phases/p1-rendering.js — Render Falls
// ---------------------------------------------------------------------------
// Lesson shape:
//   why       one sentence shown on the map waypoint
//   how       paragraphs (inline `code` supported) — the mechanics
//   pitfall   the bug you will actually write
//   example   { code, tryThis[] } — live editor; code must define function App
//   visualizer  name in src/visualizers/index.js, or null
//   trial     { symptom, code, checks[] } — broken code; checks run against it
//             check.run(t) gets the harness helpers (see journal/trialHarness.js)
// ---------------------------------------------------------------------------

export default [
  {
    id: 'jsx-calls',
    title: 'JSX is function calls',
    charted: true,
    prereqs: [],
    why: 'JSX looks like HTML but compiles to plain function calls that return plain objects, so you can store, map and pass UI like any other value.',
    how: [
      '`<Badge tone="gold">New</Badge>` compiles to `jsx(Badge, { tone: "gold", children: "New" })`. That call does **not** run `Badge`. It returns a small description object: `{ type: Badge, props, key }`.',
      'React calls `Badge` later, during render, when it walks the tree of those objects. That is why a component is "just a function that returns a tree of descriptions".',
      'Because elements are values, anything an *expression* can do, JSX can do: variables, arrays, ternaries, `&&`, function arguments. Statements (`if`, `for`) cannot sit inside `{}` because `{}` holds an expression.',
    ],
    pitfall: '`{items.forEach(i => <li>{i}</li>)}` renders nothing: `forEach` returns `undefined`. `map` returns an array of elements, which React can render.',
    reactDev: 'https://react.dev/learn/writing-markup-with-jsx',
    visualizer: null,
    example: {
      code: `function Badge({ tone, children }) {
  return <span className={'badge ' + tone}>{children}</span>
}

function App() {
  const element = <Badge tone="gold">New</Badge>
  // element is a plain object. React has NOT called Badge yet.
  const shape = { type: element.type.name, props: element.props }

  return (
    <div>
      {element}
      <pre>{JSON.stringify(shape, null, 2)}</pre>
    </div>
  )
}`,
      tryThis: [
        'Put two elements in an array and render the array directly: `{[a, b]}`. What does React ask you for in the console?',
        'Replace `<Badge ...>` with a direct call `Badge({ tone: "gold", children: "New" })`. It renders the same, so why is this a bad idea once Badge uses a hook?',
        'Add a ternary: render `<Badge>` only when a boolean is true.',
      ],
    },
    trial: {
      symptom: 'The crew list renders an empty <ul>. Nobody is aboard.',
      code: `const crew = ['Ada', 'Charles', 'Mary']

function App() {
  return (
    <ul>
      {crew.forEach((name) => <li key={name}>{name}</li>)}
    </ul>
  )
}`,
      checks: [
        { label: 'Renders three <li> items', run: (t) => t.expectCount('li', 3) },
        { label: 'Ada, Charles and Mary are listed', run: (t) => ['Ada', 'Charles', 'Mary'].forEach((n) => t.expectText(n)) },
      ],
    },
  },

  {
    id: 'props-purity',
    title: 'Props & pure components',
    charted: true,
    prereqs: ['jsx-calls'],
    why: 'Same props and state must give the same JSX. Purity is what lets React render in any order, pause, or render twice.',
    how: [
      'Props are a read-only object the parent hands to the child for **this** render. A component is a function from props (and state) to UI.',
      'React may call your component more than once for a single screen update. StrictMode does it on purpose in development; concurrent rendering may start a render and throw it away. If rendering *changes* something outside itself, those extra calls leak.',
      'So during render: do not mutate props, do not mutate variables declared outside the component, do not touch the DOM. Create new values instead. Side effects belong in event handlers or effects.',
    ],
    pitfall: 'Mutating a module-level variable or a prop array during render (`prices.push(5)`). It "works" until StrictMode doubles it, or until a second instance renders.',
    reactDev: 'https://react.dev/learn/keeping-components-pure',
    visualizer: null,
    example: {
      code: `let guest = 0

function Cup() {
  // Impure: mutates a variable that lives OUTSIDE this render
  guest = guest + 1
  return <li>Tea cup for guest #{guest}</li>
}

function App() {
  return (
    <ul>
      <Cup />
      <Cup />
      <Cup />
    </ul>
  )
}`,
      tryThis: [
        'Why do you only see even numbers? (This preview runs in StrictMode, which renders each component twice in dev.)',
        'Make Cup pure: pass `guest` as a prop from App instead of mutating a shared variable.',
      ],
    },
    trial: {
      symptom: 'The total should be 35 (10 + 20 + a 5 service charge) and there are 2 items, but the numbers come out wrong.',
      code: `const prices = [10, 20]

function Total({ prices }) {
  prices.push(5) // add the service charge
  const sum = prices.reduce((a, b) => a + b, 0)
  return <p>Total: {sum}</p>
}

function App() {
  return (
    <div>
      <Total prices={prices} />
      <p>Items: {prices.length}</p>
    </div>
  )
}`,
      checks: [
        { label: 'Shows "Total: 35"', run: (t) => t.expectText('Total: 35') },
        { label: 'Shows "Items: 2" (the original array is untouched)', run: (t) => t.expectText('Items: 2') },
      ],
    },
  },

  {
    id: 'composition',
    title: 'Composition & children',
    charted: true,
    prereqs: ['props-purity'],
    why: 'Passing JSX as children lets a component wrap content it does not need to understand, which cures prop-drilling.',
    how: [
      '`children` is just a prop that holds whatever elements you nested inside the tag. A `Frame` component renders `{children}` wherever it likes.',
      'You can pass elements through named props too ("slots"): `<Layout sidebar={<Nav />} />`. The wrapper never needs to know what is inside.',
      'Under the hood: the elements were created by the *parent*. When the wrapper re-renders because of its own state, those child element objects are the same references, so React can skip re-rendering them. Composition is also a performance tool.',
    ],
    pitfall: 'Drilling `user` through four components that never read it, just to reach the one that does. Pass the finished `<Avatar user={user} />` down as children instead.',
    reactDev: 'https://react.dev/learn/passing-props-to-a-component#passing-jsx-as-children',
    visualizer: null,
    example: {
      code: `function Frame({ title, children, footer }) {
  return (
    <section style={{ border: '3px double #2b2118', padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
      {footer && <footer style={{ marginTop: 8, fontStyle: 'italic' }}>{footer}</footer>}
    </section>
  )
}

function App() {
  return (
    <Frame title="Field note" footer={<span>Surveyed in 1851</span>}>
      <p>The river bends north past the falls.</p>
    </Frame>
  )
}`,
      tryThis: [
        'Nest a second Frame inside the first.',
        'Add a `toolbar` slot prop and render it above the title.',
      ],
    },
    trial: {
      symptom: 'The storm warning panel shows its title but the instruction inside never appears.',
      code: `function Panel({ title }) {
  return (
    <div className="panel">
      <h3>{title}</h3>
    </div>
  )
}

function App() {
  return (
    <Panel title="Storm ahead">
      <p>Lower the sails.</p>
    </Panel>
  )
}`,
      checks: [
        { label: 'Title "Storm ahead" is shown', run: (t) => t.expectText('Storm ahead') },
        { label: 'The nested "Lower the sails." is shown', run: (t) => t.expectText('Lower the sails.') },
      ],
    },
  },

  {
    id: 'state-snapshot',
    title: 'State as a snapshot',
    charted: true,
    prereqs: ['props-purity'],
    why: 'State is not a variable that changes. Each render gets its own constant copy, which is why `console.log` after `setX` shows the old value.',
    how: [
      '`const [count, setCount] = useState(0)`: `count` is a **const** in this call of your function. React stored the value on the component\'s fiber and handed you a copy for this render.',
      '`setCount(count + 1)` does not touch `count`. It queues an update and schedules a re-render. The *next* call of your component receives the new value in a brand-new `count` const.',
      'Every function created during a render (event handlers, timeouts) closes over that render\'s values forever. A timeout created in render #3 will read render #3\'s `count` even if it fires during render #9.',
    ],
    pitfall: 'Reading state right after setting it (`setText(v); setShout(text.toUpperCase())`) uses the previous snapshot. Use the new value you already have, or derive it.',
    reactDev: 'https://react.dev/learn/state-as-a-snapshot',
    visualizer: 'SnapshotInspector',
    example: {
      code: `function App() {
  const [count, setCount] = useState(0)
  const [log, setLog] = useState([])

  function handleClick() {
    setCount(count + 1)
    // count is a constant captured by THIS render's closure:
    setLog((l) => [...l, 'clicked while count was ' + count])
  }

  function handleDelayed() {
    setTimeout(() => {
      // 3 seconds later... still this render's snapshot
      setLog((l) => [...l, 'timeout saw count = ' + count])
    }, 3000)
  }

  return (
    <div>
      <p>count: {count}</p>
      <button onClick={handleClick}>+1</button>{' '}
      <button onClick={handleDelayed}>log in 3s</button>
      <ul>{log.map((line, i) => <li key={i}>{line}</li>)}</ul>
    </div>
  )
}`,
      tryThis: [
        'Click "log in 3s", then quickly click +1 three times. What does the timeout report, and why?',
        'Call `setCount(count + 1)` three times in handleClick. Why does it only go up by one?',
      ],
    },
    trial: {
      symptom: 'Type "ahoy" and the shout line should read AHOY. It is always one keystroke behind.',
      code: `function App() {
  const [text, setText] = useState('')
  const [shout, setShout] = useState('')

  function handleChange(e) {
    setText(e.target.value)
    setShout(text.toUpperCase())
  }

  return (
    <div>
      <input aria-label="message" value={text} onChange={handleChange} />
      <p>Shout: {shout}</p>
    </div>
  )
}`,
      checks: [
        {
          label: 'Typing "ahoy" shows "Shout: AHOY"',
          run: async (t) => {
            await t.type('message', 'ahoy')
            t.expectText('Shout: AHOY')
          },
        },
        {
          label: 'Typing "land" afterwards shows "Shout: LAND"',
          run: async (t) => {
            await t.type('message', 'land')
            t.expectText('Shout: LAND')
          },
        },
      ],
    },
  },

  {
    id: 'render-commit',
    title: 'Render vs commit',
    charted: true,
    prereqs: ['state-snapshot'],
    why: '"Rendering" does not mean "touching the DOM". React separates calculating the UI from writing it, which keeps it fast and predictable.',
    how: [
      '**Trigger:** the first mount, or a state update somewhere in the tree.',
      '**Render:** React calls your components to compute the new tree of elements and compares it with the previous one (reconciliation). This step is pure; React may pause it, repeat it, or throw it away.',
      '**Commit:** React applies the *minimal* set of DOM changes it found. Only changed nodes are touched. Then the browser paints.',
      'Consequence: a parent re-rendering every second does not rebuild its children\'s DOM. An `<input>` keeps its typed text and focus because its element type and position did not change.',
    ],
    pitfall: 'Defining a component *inside* another component. Each render creates a new function, so the type is "different", and React unmounts and remounts it, wiping its DOM and state.',
    reactDev: 'https://react.dev/learn/render-and-commit',
    visualizer: 'RenderCommitTimeline',
    example: {
      code: `function App() {
  const [time, setTime] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <h3>{time.toLocaleTimeString()}</h3>
      {/* App re-renders every second, but only the text node above is committed. */}
      <input placeholder="type here; it survives" />
    </div>
  )
}`,
      tryThis: [
        'Open DevTools → Elements and watch which node flashes each second.',
        'Give the input `key={time.getTime()}`. What happens to your text, and why?',
      ],
    },
    trial: {
      symptom: 'The note you type vanishes a moment later, every time the ticker moves.',
      code: `function App() {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 200)
    return () => clearInterval(id)
  }, [])

  function NoteField() {
    return <input aria-label="note" placeholder="Write a note" />
  }

  return (
    <div>
      <p>Tick {tick}</p>
      <NoteField />
    </div>
  )
}`,
      checks: [
        {
          label: 'Typed text "north" survives 600ms of ticking',
          run: async (t) => {
            await t.type('note', 'north')
            await t.wait(600)
            t.expectValue('note', 'north')
          },
        },
      ],
    },
  },

  {
    id: 'batching',
    title: 'Batching & updater functions',
    charted: true,
    prereqs: ['state-snapshot'],
    why: 'React waits until your handler finishes, then processes every queued update in one render: fewer renders, no half-updated UI.',
    how: [
      'Each `setX` call adds an entry to a queue for that piece of state. `setX(5)` means "replace with 5". `setX(n => n + 1)` means "compute from whatever the pending value is".',
      'After the event handler returns, React walks the queue: start from the current state, apply each entry in order, render once with the result.',
      'Since React 18 this batching happens everywhere: timeouts, promises, native listeners, not only React event handlers.',
    ],
    pitfall: '`setN(n + 1)` three times queues "replace with 1" three times, so n becomes 1. Use the updater form `setN(n => n + 1)` when the next value depends on the previous one.',
    reactDev: 'https://react.dev/learn/queueing-a-series-of-state-updates',
    visualizer: 'BatchingQueue',
    example: {
      code: `function App() {
  const [n, setN] = useState(0)

  function snapshotWay() {
    setN(n + 1)
    setN(n + 1)
    setN(n + 1)
  }

  function updaterWay() {
    setN((x) => x + 1)
    setN((x) => x + 1)
    setN((x) => x + 1)
  }

  return (
    <div>
      <h2>{n}</h2>
      <button onClick={snapshotWay}>+3 (snapshot)</button>{' '}
      <button onClick={updaterWay}>+3 (updater)</button>{' '}
      <button onClick={() => setN(0)}>reset</button>
    </div>
  )
}`,
      tryThis: [
        'Predict, then try: `setN(n + 5); setN(x => x + 1)`. What is the result?',
        'And `setN(x => x + 1); setN(42)`?',
      ],
    },
    trial: {
      symptom: 'The "Board 3 passengers" button only ever boards one.',
      code: `function App() {
  const [aboard, setAboard] = useState(0)

  function boardThree() {
    setAboard(aboard + 1)
    setAboard(aboard + 1)
    setAboard(aboard + 1)
  }

  return (
    <div>
      <p>Aboard: {aboard}</p>
      <button onClick={boardThree}>Board 3 passengers</button>
    </div>
  )
}`,
      checks: [
        {
          label: 'One click: "Aboard: 3"',
          run: async (t) => {
            await t.click('Board 3 passengers')
            t.expectText('Aboard: 3')
          },
        },
        {
          label: 'Second click: "Aboard: 6"',
          run: async (t) => {
            await t.click('Board 3 passengers')
            t.expectText('Aboard: 6')
          },
        },
      ],
    },
  },

  {
    id: 'derived-state',
    title: "Derive, don't store",
    charted: true,
    prereqs: ['state-snapshot'],
    why: 'If you can calculate it from props or state, calculate it during render. Storing it creates two sources of truth that drift apart.',
    how: [
      'Redundant state (a full name built from first + last, a filtered list, a "selected count") has to be kept in sync by hand, in every handler that touches the source. Miss one and the UI lies.',
      'Computing it in the render body is free for cheap work and always correct. If it is genuinely expensive, wrap it in `useMemo`, but measure first.',
      'The effect version `useEffect(() => setFiltered(items.filter(...)), [items])` is worse still: React renders once with stale data, commits, runs the effect, then renders again.',
    ],
    pitfall: 'A `count` state next to a `list` state. The list is the truth; the count is `list.filter(...).length`.',
    reactDev: 'https://react.dev/learn/choosing-the-state-structure#avoid-redundant-state',
    visualizer: null,
    example: {
      code: `const ISLANDS = ['Ascension', 'Bermuda', 'Cocos', 'Galapagos', 'St Helena', 'Tristan']

function App() {
  const [query, setQuery] = useState('')
  // Derived during render: no state, no effect, never out of sync
  const visible = ISLANDS.filter((i) => i.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <input aria-label="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="filter islands" />
      <p>{visible.length} of {ISLANDS.length} islands</p>
      <ul>{visible.map((i) => <li key={i}>{i}</li>)}</ul>
    </div>
  )
}`,
      tryThis: [
        'Add a "sort A→Z / Z→A" toggle. The sorted list is derived too; which single piece of state do you need?',
        'Rewrite it with `useState` for `visible` plus a `useEffect`. Count the renders per keystroke (add a console.log). Then delete it.',
      ],
    },
    trial: {
      symptom: 'Ticking crates does not update the "Loaded: x of y" line.',
      code: `function App() {
  const [crates, setCrates] = useState([
    { id: 1, name: 'Tea', loaded: false },
    { id: 2, name: 'Spice', loaded: false },
    { id: 3, name: 'Silk', loaded: true },
  ])
  const [loadedCount, setLoadedCount] = useState(1)

  function toggle(id) {
    setCrates(crates.map((c) => (c.id === id ? { ...c, loaded: !c.loaded } : c)))
  }

  return (
    <div>
      <p>Loaded: {loadedCount} of {crates.length}</p>
      {crates.map((c) => (
        <label key={c.id} style={{ display: 'block' }}>
          <input type="checkbox" checked={c.loaded} onChange={() => toggle(c.id)} /> {c.name}
        </label>
      ))}
    </div>
  )
}`,
      checks: [
        {
          label: 'Loading Tea shows "Loaded: 2 of 3"',
          run: async (t) => {
            await t.click('Tea')
            t.expectText('Loaded: 2 of 3')
          },
        },
        {
          label: 'Unloading Silk shows "Loaded: 1 of 3"',
          run: async (t) => {
            await t.click('Silk')
            t.expectText('Loaded: 1 of 3')
          },
        },
      ],
    },
  },

  {
    id: 'keys-identity',
    title: 'Keys & component identity',
    charted: true,
    prereqs: ['render-commit'],
    why: "React ties state to a component's position in the tree plus its key. Change either and the state is gone; keep both and it survives.",
    how: [
      'During reconciliation React compares the old and new trees slot by slot. Same type in the same slot: update it and keep its state. Different type: unmount the old subtree (state destroyed) and mount a fresh one.',
      'In a list, the `key` is the identity. With `key={index}`, inserting at the top shifts every index, so state (and uncontrolled DOM like typed text) stays with the *slot*, not with the item.',
      'Changing a key on purpose is the cleanest way to reset a component: `<Profile key={userId} />` gives each user a fresh form.',
    ],
    pitfall: '`key={index}` on a list that can be reordered, filtered or prepended, especially when items contain inputs or local state.',
    reactDev: 'https://react.dev/learn/preserving-and-resetting-state',
    visualizer: 'ReconciliationTree',
    example: {
      code: `let nextId = 4

function App() {
  const [sailors, setSailors] = useState([
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Mary' },
    { id: 3, name: 'Charles' },
  ])
  const [useIndex, setUseIndex] = useState(true)

  function addTop() {
    setSailors([{ id: nextId++, name: 'New #' + nextId }, ...sailors])
  }

  return (
    <div>
      <label>
        <input type="checkbox" checked={useIndex} onChange={(e) => setUseIndex(e.target.checked)} /> key = index
      </label>
      <p><button onClick={addTop}>Add sailor at top</button></p>
      {sailors.map((s, i) => (
        <div key={useIndex ? i : s.id}>
          {s.name}: <input placeholder={'note for ' + s.name} />
        </div>
      ))}
    </div>
  )
}`,
      tryThis: [
        'Type a note next to Ada, then add a sailor at the top. Whose row is your note on now?',
        'Untick "key = index" and repeat. What changed, and why?',
      ],
    },
    trial: {
      symptom: 'Adding a sailor at the top shifts everyone\'s notes down onto the wrong person.',
      code: `let nextId = 3

function App() {
  const [sailors, setSailors] = useState([
    { id: 1, name: 'Ada' },
    { id: 2, name: 'Mary' },
  ])

  function addGrace() {
    setSailors([{ id: nextId++, name: 'Grace' }, ...sailors])
  }

  return (
    <div>
      <button onClick={addGrace}>Add Grace</button>
      {sailors.map((s, index) => (
        <div key={index}>
          {s.name}: <input aria-label={'note for ' + s.name} />
        </div>
      ))}
    </div>
  )
}`,
      checks: [
        {
          label: "Ada's note stays with Ada after Grace is added",
          run: async (t) => {
            await t.type('note for Ada', 'brave')
            await t.click('Add Grace')
            t.expectValue('note for Ada', 'brave')
          },
        },
        { label: "Grace's note starts empty", run: (t) => t.expectValue('note for Grace', '') },
      ],
    },
  },

  {
    id: 'lifting-state',
    title: 'Lifting state up',
    charted: true,
    prereqs: ['derived-state', 'composition'],
    why: 'When two components need the same changing data, move the state to their closest common parent and pass it down. One source of truth.',
    how: [
      'The parent owns the state and passes both the value and a callback to change it. The children become *controlled*: they render what they are told and report events upward.',
      'Siblings stay in sync automatically because they render from the same state on the same render pass. No effects, no syncing.',
      'Lift only as high as the closest common parent. Lifting further than needed makes more of the tree re-render on every change.',
    ],
    pitfall: 'Keeping a copy of the state in each child and trying to sync them with effects or callbacks. Two copies always drift.',
    reactDev: 'https://react.dev/learn/sharing-state-between-components',
    visualizer: null,
    example: {
      code: `function Panel({ title, isActive, onShow, children }) {
  return (
    <section style={{ borderBottom: '1px solid #7a5c3e', padding: '6px 0' }}>
      <strong>{title}</strong>{' '}
      {isActive ? <p>{children}</p> : <button onClick={onShow}>Show</button>}
    </section>
  )
}

function App() {
  // The parent owns which panel is open
  const [active, setActive] = useState(0)
  return (
    <div>
      <Panel title="Ports" isActive={active === 0} onShow={() => setActive(0)}>
        Plymouth, Falmouth, Cape Town.
      </Panel>
      <Panel title="Hazards" isActive={active === 1} onShow={() => setActive(1)}>
        Reefs south of the cape.
      </Panel>
    </div>
  )
}`,
      tryThis: [
        'Allow "all closed": clicking the open panel\'s title closes it.',
        'Add a third panel. How many lines of state code did you need to add?',
      ],
    },
    trial: {
      symptom: 'Opening one cabin should close the other, but both can be open at once.',
      code: `function Panel({ title, children }) {
  const [isOpen, setIsOpen] = useState(false)
  return (
    <section>
      <h4>{title}</h4>
      {isOpen ? <p>{children}</p> : <button onClick={() => setIsOpen(true)}>Show {title}</button>}
    </section>
  )
}

function App() {
  return (
    <div>
      <Panel title="Cabin A">A details: two berths, port side.</Panel>
      <Panel title="Cabin B">B details: the captain's quarters.</Panel>
    </div>
  )
}`,
      checks: [
        {
          label: 'Opening Cabin A shows its details',
          run: async (t) => {
            await t.click('Show Cabin A')
            t.expectText('A details')
          },
        },
        {
          label: 'Opening Cabin B closes Cabin A',
          run: async (t) => {
            await t.click('Show Cabin B')
            t.expectText('B details')
            t.expectNoText('A details')
          },
        },
      ],
    },
  },
]

export const checkpoint = [
  {
    q: 'Why does `console.log(count)` right after `setCount(count + 1)` print the old value?',
    model:
      '`count` is a constant captured by this render\'s closure. `setCount` queues an update and schedules a new render; it never changes the current snapshot. The new value only exists when the component function runs again.',
  },
  {
    q: 'A parent re-renders 60 times a second. Does its child input lose the text you typed? Explain using render vs commit.',
    model:
      'No, as long as the input has the same type and position (and key). Render recomputes the element tree; reconciliation finds the input unchanged, so commit never touches that DOM node. Its value and focus survive.',
  },
  {
    q: 'You store `filteredItems` in state and update it in a `useEffect` when `items` or `query` change. What is wrong, and what should you do?',
    model:
      "It's redundant state: two sources of truth. The effect adds an extra render with stale data in between. Compute `items.filter(...)` during render instead (useMemo only if profiling shows it is expensive).",
  },
  {
    q: 'What does a `key` tell React, and why is `key={index}` dangerous in a list you can prepend to?',
    model:
      'A key is the identity React uses to match an element to its previous fiber and state. With index keys, prepending shifts every index, so state and DOM stay with the slot instead of the item, landing on the wrong row.',
  },
]
