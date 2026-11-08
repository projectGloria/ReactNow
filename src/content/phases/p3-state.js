// src/content/phases/p3-state.js — The State Citadel
// ---------------------------------------------------------------------------
// Same lesson shape as p1-rendering.js (see the header there).
//
// Trial design notes (the harness mounts every trial under StrictMode):
//   - "Did it re-render?" is made visible by useRenderMeter (METER below), a
//     tiny hook that writes "(Name rendered N×)" into its own <small> after
//     every commit. It keys on a per-render `stamp` object, so StrictMode's
//     extra effect run on mount (same closure, same stamp) is not counted.
//     Checks compare the number before/after an action inside ONE check, so
//     nothing leaks between runs.
//   - Every external store (barometer, ship store, fake browser) is created
//     inside the snippet, so each run gets a fresh one. None start timers.
//   - The URL lesson uses an in-snippet fake browser: the app itself is
//     hash-routed, so touching the real location would navigate away.
//   - StrictMode double-calls reducers; the reducer trial leans on that to
//     catch the "push, then spread" half-fix.
// ---------------------------------------------------------------------------

// Shared instrument, pasted into the snippets that need it.
const METER = `// ── Surveyor's instrument (leave it be) ─────────────────────────
// Counts real commits of a component and writes them into its own <small>.
// A fresh \`stamp\` object exists per render. StrictMode re-runs the SAME
// effect on mount (same stamp), so that extra run is not counted.
function useRenderMeter(label) {
  const node = useRef(null)
  const seen = useRef(null)
  const count = useRef(0)
  const stamp = {}
  useEffect(() => {
    if (seen.current === stamp) return
    seen.current = stamp
    count.current += 1
    node.current.textContent = '(' + label + ' rendered ' + count.current + '×)'
  })
  return node
}
// ────────────────────────────────────────────────────────────────`

/** Read "(Label rendered N×)" off the page. */
function rendersOf(t, label) {
  const m = new RegExp('\\(' + label + ' rendered (\\d+)×\\)').exec(t.text())
  if (!m) throw new Error(`Couldn't read the ${label} render meter. Keep its <small ref={meter} /> on the page.`)
  return Number(m[1])
}

export default [
  {
    id: 'reducer',
    title: 'useReducer',
    charted: true,
    prereqs: [],
    why: 'Move "how state changes" out of handlers into one pure, testable function.',
    how: [
      '`const [state, dispatch] = useReducer(reducer, initialState)`. Handlers stop computing the next state; they **describe what happened**: `dispatch({ type: \'loaded\', cargo: \'Tea\' })`. The reducer `(state, action) => nextState` is the single place that decides what that means.',
      'It is called a reducer because it has the exact shape of the callback to `Array.prototype.reduce`: replay a list of actions through it and you get the final state. That is why it is trivially testable without React: it is a pure function of its two arguments.',
      'Under the hood `useState` *is* `useReducer` with a built-in reducer (`(s, a) => typeof a === \'function\' ? a(s) : a`). Dispatches are queued on the hook, and React runs the reducer during the next render. Then the same rule as `setState` applies: if the result is `Object.is`-equal to the old state, React bails out and does not re-render.',
      'So a reducer must **return new objects** and never mutate. StrictMode calls reducers twice in development to catch exactly that: a pure reducer gives the same answer twice; a mutating one does its damage twice. Reach for `useReducer` when several fields change together, or when the next state depends on what *kind* of event happened.',
    ],
    pitfall: '`state.hold.push(cargo); return state`. Same object back, so React bails out and nothing renders. Then `return { ...state }` "fixes" it, and StrictMode loads every crate twice, because the push still mutates the old array.',
    reactDev: 'https://react.dev/learn/extracting-state-logic-into-a-reducer',
    visualizer: null,
    example: {
      code: `const initial = { leagues: 0, anchored: true, log: [] }

// Pure: (state, action) -> new state. No React in sight.
function voyageReducer(state, action) {
  console.log('reducer called with', action.type) // StrictMode: twice per dispatch
  switch (action.type) {
    case 'weighed':
      return { ...state, anchored: false, log: [...state.log, 'Weighed anchor'] }
    case 'sailed':
      if (state.anchored) return state // same object: React bails out, no render
      return { ...state, leagues: state.leagues + action.leagues, log: [...state.log, 'Sailed ' + action.leagues + ' leagues'] }
    case 'anchored':
      return { ...state, anchored: true, log: [...state.log, 'Dropped anchor'] }
    default:
      throw new Error('Unknown action: ' + action.type)
  }
}

// A reducer replays like Array.reduce, which is where the name comes from.
const replayed = [{ type: 'weighed' }, { type: 'sailed', leagues: 3 }, { type: 'sailed', leagues: 2 }].reduce(voyageReducer, initial)

function App() {
  const [state, dispatch] = useReducer(voyageReducer, initial)
  return (
    <div>
      <p>{state.anchored ? 'At anchor' : 'Underway'}, {state.leagues} leagues logged</p>
      <button onClick={() => dispatch({ type: 'weighed' })}>Weigh anchor</button>{' '}
      <button onClick={() => dispatch({ type: 'sailed', leagues: 5 })}>Sail 5</button>{' '}
      <button onClick={() => dispatch({ type: 'anchored' })}>Drop anchor</button>
      <ol>{state.log.map((line, i) => <li key={i}>{line}</li>)}</ol>
      <p><em>Replayed without React: {replayed.leagues} leagues.</em></p>
    </div>
  )
}`,
      tryThis: [
        'Open the console and click "Sail 5". Why is the reducer called twice for one dispatch?',
        'Click "Sail 5" while at anchor. The reducer returns `state` unchanged: does the component render? (Add a `console.log` in App.)',
        'Add a `jettisoned` action that halves the leagues. How many handlers did you have to touch?',
      ],
    },
    trial: {
      symptom: 'Loading cargo does nothing: the hold reads "empty". Then you jettison the Tea and Rum appears, twice.',
      code: `function cargoReducer(state, action) {
  switch (action.type) {
    case 'loaded': {
      state.hold.push(action.cargo)
      return state
    }
    case 'jettisoned':
      return { ...state, hold: state.hold.filter((c) => c !== action.cargo) }
    default:
      throw new Error('Unknown action: ' + action.type)
  }
}

function App() {
  const [state, dispatch] = useReducer(cargoReducer, { hold: [] })

  return (
    <div>
      <p>Hold: {state.hold.length > 0 ? state.hold.join(', ') : 'empty'}</p>
      <ul>{state.hold.map((c, i) => <li key={i}>{c}</li>)}</ul>
      <button onClick={() => dispatch({ type: 'loaded', cargo: 'Tea' })}>Load Tea</button>
      <button onClick={() => dispatch({ type: 'loaded', cargo: 'Rum' })}>Load Rum</button>
      <button onClick={() => dispatch({ type: 'jettisoned', cargo: 'Tea' })}>Jettison Tea</button>
    </div>
  )
}`,
      checks: [
        {
          label: 'Loading Tea shows exactly one crate of Tea',
          run: async (t) => {
            await t.click('Load Tea')
            t.expectText('Hold: Tea')
            t.expectCount('li', 1)
          },
        },
        {
          label: 'Loading Rum adds exactly one crate of Rum',
          run: async (t) => {
            await t.click('Load Rum')
            t.expectText('Hold: Tea, Rum')
            t.expectCount('li', 2)
          },
        },
        {
          label: 'Jettisoning Tea leaves only Rum',
          run: async (t) => {
            await t.click('Jettison Tea')
            t.expectText('Hold: Rum')
            t.expectCount('li', 1)
          },
        },
      ],
    },
  },

  {
    id: 'context',
    title: 'Context',
    charted: true,
    prereqs: ['reducer'],
    why: 'Context removes prop-drilling, but every consumer re-renders when the value changes.',
    how: [
      '`const WatchContext = createContext(\'Nobody\')` creates a *channel*, not a store: it holds no state. The argument is the default, used only by a reader with **no provider above it**.',
      'React 19 renders the context itself as the provider: `<WatchContext value={watch}>…</WatchContext>` (`<WatchContext.Provider>` still works, and is on its way out). Any component below calls `useContext(WatchContext)` (or `use(WatchContext)`, which may also sit inside an `if`) and gets the value of the **nearest provider above it** in the tree.',
      'Under the hood, reading context makes the fiber a subscriber. When a provider renders with a value that is not `Object.is`-equal to the last one, React walks down from the provider and schedules a render for every fiber that reads that context, even ones inside `memo`. Context goes *through* memo; memo only compares props.',
      '"Above" is literal. A component that renders `<WatchContext value>` and calls `useContext(WatchContext)` itself reads from *its own* parents, not from the provider it returns. The provider affects only its children.',
    ],
    pitfall: 'Reading the context in the same component that renders its provider. You get the default value (or a provider further up), and it never changes when you update the state you passed as `value`.',
    reactDev: 'https://react.dev/learn/passing-data-deeply-with-context',
    visualizer: 'ContextRerenderMap',
    example: {
      code: `const FlagContext = createContext('no flag flown')

function Mast({ label }) {
  const flag = useContext(FlagContext) // nearest provider ABOVE this component
  return <li>{label}: <strong>{flag}</strong></li>
}

function App() {
  const [flag, setFlag] = useState('Union Jack')
  return (
    <div>
      <button onClick={() => setFlag(flag === 'Union Jack' ? 'Red Ensign' : 'Union Jack')}>Change the colours</button>
      <ul>
        <Mast label="Jolly boat (no provider above)" />
        <FlagContext value={flag}>
          <Mast label="Main mast" />
          <Mast label="Mizzen mast" />
          <FlagContext value="signal flags">
            <Mast label="Signal yard (nearest provider wins)" />
          </FlagContext>
        </FlagContext>
      </ul>
    </div>
  )
}`,
      tryThis: [
        'Change the colours. Which masts follow, and why does the jolly boat never change?',
        'Call `useContext(FlagContext)` inside App itself and print it. What do you get, and why not "Union Jack"?',
        'Replace `useContext` with `use` in Mast and wrap it in `if (label.startsWith("Main"))`. Why is that allowed for `use` but not for `useContext`?',
      ],
    },
    trial: {
      symptom: 'Mary takes the watch and the deck says so, but the masthead keeps reading "Nobody on watch".',
      code: `const WatchContext = createContext('Nobody')

function Deck() {
  const watch = useContext(WatchContext)
  return <p>Deck: {watch} at the helm</p>
}

function App() {
  const [watch, setWatch] = useState('Ada')
  const onWatch = useContext(WatchContext)

  return (
    <WatchContext value={watch}>
      <h3>Masthead: {onWatch} on watch</h3>
      <Deck />
      <button onClick={() => setWatch('Mary')}>Change the watch to Mary</button>
    </WatchContext>
  )
}`,
      checks: [
        {
          label: 'On arrival both read Ada',
          run: (t) => {
            t.expectText('Masthead: Ada on watch')
            t.expectText('Deck: Ada at the helm')
          },
        },
        {
          label: 'After the change both read Mary',
          run: async (t) => {
            await t.click('Change the watch to Mary')
            t.expectText('Masthead: Mary on watch')
            t.expectText('Deck: Mary at the helm')
          },
        },
      ],
    },
  },

  {
    id: 'context-cost',
    title: 'The cost of context',
    charted: true,
    prereqs: ['context'],
    why: 'A new object literal as the value re-renders every consumer on every parent render.',
    how: [
      '`<ShipContext value={{ heading, setHeading }}>` builds a **new object on every render** of the component that owns it. React compares provider values with `Object.is`, so a fresh `{}` is always "changed", and every consumer below re-renders, `memo` or not, even when `heading` is the same.',
      'That is harmless when the owner rarely renders. It hurts when the owner also holds fast-changing, unrelated state (a text input, a timer, a hover flag): now every keystroke re-renders every consumer in the app.',
      'Fixes, cheapest first. (1) **Move the unrelated state out** of the provider\'s owner (next lesson), so it does not render. (2) **Memoize the value**: `useMemo(() => ({ heading, setHeading }), [heading])`; the setter from `useState` is already stable. (3) **Split the context**: one for the value, one for the setters, so components that only dispatch never re-render on a value change.',
      'What none of these give you is a *selector*. A consumer of `{ heading, rations }` re-renders when rations change even if it only reads heading. If you need slice-level subscriptions, that is a store (two lessons on). The React Compiler memoizes the value literal for you; it still cannot add selectors.',
    ],
    pitfall: 'Wrapping every consumer in `memo` to stop the re-renders. Context ignores memo; the new object is still new.',
    reactDev: 'https://react.dev/reference/react/useContext#optimizing-re-renders-when-passing-objects-and-functions',
    visualizer: 'ContextRerenderMap',
    example: {
      code: `${METER}

const ShipContext = createContext(null)

const Compass = memo(function Compass() {
  const { heading } = useContext(ShipContext)
  const meter = useRenderMeter('Compass')
  return <p>Compass: {heading} <small ref={meter} /></p>
})

const Galley = memo(function Galley() {
  const { rations } = useContext(ShipContext) // reads ONLY rations
  const meter = useRenderMeter('Galley')
  return <p>Rations: {rations} <small ref={meter} /></p>
})

function App() {
  const [heading, setHeading] = useState('north')
  const [rations, setRations] = useState(40)
  const [bells, setBells] = useState(0)
  const [memoize, setMemoize] = useState(false)

  const literal = { heading, rations }                                  // new object every render
  const memoized = useMemo(() => ({ heading, rations }), [heading, rations]) // same object until a field changes
  const value = memoize ? memoized : literal

  return (
    <ShipContext value={value}>
      <label><input type="checkbox" checked={memoize} onChange={(e) => setMemoize(e.target.checked)} /> memoize the value</label>
      <p>
        <button onClick={() => setBells(bells + 1)}>Ring the bell ({bells})</button>{' '}
        <button onClick={() => setHeading(heading === 'north' ? 'east' : 'north')}>Turn</button>{' '}
        <button onClick={() => setRations(rations - 4)}>Issue rations</button>
      </p>
      <Compass />
      <Galley />
    </ShipContext>
  )
}`,
      tryThis: [
        'Ring the bell with the box unticked, then ticked. Watch both meters.',
        'With the value memoized, press Turn. Why does the Galley still re-render when it only reads rations?',
        'Split it into `HeadingContext` and `RationsContext`. Which meter moves on Turn now?',
      ],
    },
    trial: {
      symptom: 'Every ring of the ship\'s bell re-renders the Compass, even though it is wrapped in memo and the heading never changed.',
      code: `${METER}

const HeadingContext = createContext(null)

const Compass = memo(function Compass() {
  const { heading } = useContext(HeadingContext)
  const meter = useRenderMeter('Compass')
  return <p>Compass: {heading} <small ref={meter} /></p>
})

const Helm = memo(function Helm() {
  const { setHeading } = useContext(HeadingContext)
  return <button onClick={() => setHeading('east')}>Turn east</button>
})

function App() {
  const [heading, setHeading] = useState('north')
  const [bells, setBells] = useState(0)

  return (
    <HeadingContext value={{ heading, setHeading }}>
      <p>Bells rung: {bells}</p>
      <button onClick={() => setBells(bells + 1)}>Ring the bell</button>
      <Compass />
      <Helm />
    </HeadingContext>
  )
}`,
      checks: [
        {
          label: 'Ringing the bell twice does not re-render the Compass',
          run: async (t) => {
            const before = rendersOf(t, 'Compass')
            await t.click('Ring the bell')
            await t.click('Ring the bell')
            t.expectText('Bells rung: 2')
            const after = rendersOf(t, 'Compass')
            if (after !== before) throw new Error(`The Compass rendered ${after - before} more time(s) for two bells. Its heading never changed.`)
          },
        },
        {
          label: 'Turning east updates the Compass, with exactly one render',
          run: async (t) => {
            const before = rendersOf(t, 'Compass')
            await t.click('Turn east')
            t.expectText('Compass: east')
            const after = rendersOf(t, 'Compass')
            if (after !== before + 1) throw new Error(`Expected one Compass render for one turn, got ${after - before}.`)
          },
        },
      ],
    },
  },

  {
    id: 'colocation',
    title: 'Colocation',
    charted: true,
    prereqs: [],
    why: 'State as close as possible to where it is used keeps re-renders small and code obvious.',
    how: [
      'When state changes, React re-renders the component that **owns** it and, by default, its whole subtree. So the height at which state lives decides the blast radius of every update. State at the root means every keystroke renders the app.',
      'Colocation is the rule: put state in the lowest component that contains every reader. Lift it (P1) only when a second component genuinely needs it, and only as high as their closest common parent. When the need goes away, push it back down.',
      'The usual move is to **extract a component**: the input and the list that filters on it become `<PortSearch>`, which owns `query`. The expensive sibling (`<SeaChart>`) is no longer in the subtree of the state that changes, so it is not even visited. No `memo`, no comparisons, nothing to keep stable.',
      'The second move is **children as props**: a component that owns fast state but must wrap heavy content can take it as `children`. Those elements were created by the parent, so they are the same objects on the owner\'s re-render, and React skips them.',
    ],
    pitfall: 'Keeping "page state" (a search box, a hover flag, a draft) in the top-level component "so it is all in one place", then sprinkling `memo` everywhere to undo the damage. Moving the state down is the fix; memo is the bandage.',
    reactDev: 'https://react.dev/learn/choosing-the-state-structure',
    visualizer: 'ContextRerenderMap',
    example: {
      code: `${METER}

const PORTS = ['Plymouth', 'Falmouth', 'Portsmouth', 'Cape Town', 'Bombay']

// Owns the state that changes on every keystroke. Nothing else re-renders.
function PortSearch() {
  const [query, setQuery] = useState('')
  const meter = useRenderMeter('PortSearch')
  const matches = PORTS.filter((p) => p.toLowerCase().includes(query.toLowerCase()))
  return (
    <section>
      <input aria-label="Search ports" placeholder="search ports" value={query} onChange={(e) => setQuery(e.target.value)} />{' '}
      <small ref={meter} />
      <ul>{matches.map((p) => <li key={p}>{p}</li>)}</ul>
    </section>
  )
}

function SeaChart() {
  const meter = useRenderMeter('Sea chart')
  return <figure>Chart of the Western Approaches (pretend: 10,000 soundings) <small ref={meter} /></figure>
}

function App() {
  return (
    <div>
      <PortSearch />
      <SeaChart />
    </div>
  )
}`,
      tryThis: [
        'Type in the search box and watch both meters.',
        'Move `query` back up into App and pass it down as props. What happens to the Sea chart meter?',
        'Now wrap SeaChart in `memo` instead of moving state. It works; what new thing do you have to keep stable once SeaChart takes an `onPick` prop?',
      ],
    },
    trial: {
      symptom: 'Every keystroke in the port search redraws the whole sea chart, and the chart is the slowest thing aboard.',
      code: `${METER}

const PORTS = ['Plymouth', 'Falmouth', 'Portsmouth', 'Cape Town', 'Bombay']

function SeaChart() {
  const meter = useRenderMeter('Sea chart')
  // Pretend this draws 10,000 soundings
  return <figure>Chart of the Western Approaches <small ref={meter} /></figure>
}

function App() {
  const [query, setQuery] = useState('')
  const matches = PORTS.filter((p) => p.toLowerCase().includes(query.toLowerCase()))

  return (
    <div>
      <input aria-label="Search ports" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ul>{matches.map((p) => <li key={p}>{p}</li>)}</ul>
      <SeaChart />
    </div>
  )
}`,
      checks: [
        {
          label: 'Searching "mouth" lists the three -mouth ports',
          run: async (t) => {
            await t.type('Search ports', 'mouth')
            t.expectCount('li', 3)
            t.expectText('Portsmouth')
          },
        },
        {
          label: 'Typing in the search never re-renders the Sea chart',
          run: async (t) => {
            const before = rendersOf(t, 'Sea chart')
            await t.type('Search ports', 'cape')
            t.expectCount('li', 1)
            t.expectText('Cape Town')
            await t.type('Search ports', '')
            t.expectCount('li', 5)
            const after = rendersOf(t, 'Sea chart')
            if (after !== before) throw new Error(`The Sea chart rendered ${after - before} more time(s) while you typed.`)
          },
        },
      ],
    },
  },

  {
    id: 'external-store',
    title: 'useSyncExternalStore',
    charted: true,
    prereqs: ['context-cost'],
    why: 'The safe bridge to state that lives outside React, without tearing.',
    how: [
      'Some state lives outside React: a module-level store, `window.innerWidth`, `navigator.onLine`, the URL, a WebSocket cache. Reading it in render gives you the value *once*: nobody tells React when it changes, so the screen goes stale.',
      '`const value = useSyncExternalStore(subscribe, getSnapshot)`. `subscribe(callback)` hooks React\'s callback into the store and returns an unsubscribe. `getSnapshot()` returns the current value. When the store calls the callback, React calls `getSnapshot` again and re-renders only if the result is not `Object.is`-equal to the last one.',
      'Two rules from the docs. `getSnapshot` must return the **same value** while the store has not changed: returning a fresh object or array every call (`() => ({ ...store })`) makes React loop until it throws "The result of getSnapshot should be cached". And keep `subscribe` stable (module scope or `useCallback`), or React resubscribes on every render.',
      'Why not `useState` + a subscribing `useEffect`? Because during a concurrent render React may pause halfway through the tree; if the store changes in between, half the components show the old value and half the new: **tearing**. `useSyncExternalStore` re-checks the snapshot and forces a synchronous, consistent render. It also catches changes that land between render and subscription. This app\'s own router (`useHashRoute`) is built on it.',
    ],
    pitfall: 'A selector-style snapshot that builds an object: `useSyncExternalStore(sub, () => ({ a: store.a, b: store.b }))`. New object every call, infinite loop. Return a primitive, or the store\'s own immutable state object.',
    reactDev: 'https://react.dev/reference/react/useSyncExternalStore',
    visualizer: null,
    example: {
      code: `// 1. A store you own: plain JS, outside React.
function createTideTable() {
  let height = 2.0
  const listeners = new Set()
  return {
    getHeight: () => height, // a number: Object.is-stable while unchanged
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    rise() {
      height = Math.round((height + 0.5) * 10) / 10
      listeners.forEach((fn) => fn())
    },
  }
}
const tide = createTideTable()

// 2. A browser API: same two functions, module scope so they stay stable.
function subscribeToResize(fn) {
  window.addEventListener('resize', fn)
  return () => window.removeEventListener('resize', fn)
}
const getWidth = () => window.innerWidth

function App() {
  const height = useSyncExternalStore(tide.subscribe, tide.getHeight)
  const width = useSyncExternalStore(subscribeToResize, getWidth)
  return (
    <div>
      <p>Tide: {height} fathoms</p>
      <button onClick={() => tide.rise()}>The tide rises</button>
      <p>Window: {width}px wide (resize the window)</p>
    </div>
  )
}`,
      tryThis: [
        'Replace `useSyncExternalStore(tide.subscribe, tide.getHeight)` with `tide.getHeight()`. Click the button: why is the screen stuck?',
        'Make the snapshot `() => ({ h: tide.getHeight() })` and read `.h`. What does the console say, and why? (Undo it afterwards.)',
        'Move `subscribeToResize` inside App. Add a `console.log` in it: how often does React now resubscribe?',
      ],
    },
    trial: {
      symptom: 'A storm rolls in and the pressure falls, but both barometers keep reading fair weather.',
      code: `// The ship's barometer: a store that lives outside React.
function createBarometer() {
  let pressure = 1013
  const listeners = new Set()
  return {
    getPressure: () => pressure,
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    storm() {
      pressure -= 25
      listeners.forEach((fn) => fn())
    },
    listenerCount: () => listeners.size,
  }
}
const weather = createBarometer()

function Barometer({ where }) {
  const pressure = weather.getPressure()
  return <p>{where}: {pressure} hPa</p>
}

function App() {
  const [shown, setShown] = useState(true)
  const [count, setCount] = useState(null)

  return (
    <div>
      {shown && <Barometer where="Quarterdeck" />}
      {shown && <Barometer where="Chart room" />}
      <button onClick={() => weather.storm()}>Storm rolls in</button>
      <button onClick={() => setShown(!shown)}>{shown ? 'Stow the barometers' : 'Unstow the barometers'}</button>
      <button onClick={() => setCount(weather.listenerCount())}>Count listeners</button>
      <p>Listeners: {count ?? 'press Count'}</p>
    </div>
  )
}`,
      checks: [
        {
          label: 'A storm drops both barometers to 988 hPa',
          run: async (t) => {
            await t.click('Storm rolls in')
            t.expectText('Quarterdeck: 988 hPa')
            t.expectText('Chart room: 988 hPa')
          },
        },
        {
          label: 'A second storm: both read 963 hPa',
          run: async (t) => {
            await t.click('Storm rolls in')
            t.expectText('Quarterdeck: 963 hPa')
            t.expectText('Chart room: 963 hPa')
          },
        },
        {
          label: 'Stowed barometers leave no listeners behind, and read true when unstowed',
          run: async (t) => {
            await t.click('Stow the barometers')
            await t.click('Count listeners')
            t.expectText('Listeners: 0')
            await t.click('Storm rolls in')
            await t.click('Unstow the barometers')
            t.expectText('Quarterdeck: 938 hPa')
          },
        },
      ],
    },
  },

  {
    id: 'zustand',
    title: 'A lightweight store',
    charted: true,
    prereqs: ['external-store'],
    why: 'Selector-based stores re-render only the components that read the changed slice.',
    how: [
      'A store like zustand is about thirty lines on top of the previous lesson. State lives in a closure outside React; `setState` replaces it with a new object and notifies listeners; a hook reads it through `useSyncExternalStore`. No provider, no context: any component can import the hook.',
      'The trick is the **selector**. `useShip((s) => s.rations)` passes `() => selector(store.getState())` as the snapshot. On every store change React re-runs it for each subscriber and compares the *selected* value with `Object.is`. Rations changed? The Galley re-renders. Powder did not? The Magazine is not touched. That is what context cannot do.',
      'Apply the selector *outside* the snapshot (`selector(useSyncExternalStore(sub, getState))`) and you have rebuilt the context problem: the snapshot is the whole state object, it is new after every `setState`, so every subscriber re-renders on every change.',
      'Same rule as before: a selector must return something stable. `(s) => s.rations` is fine; `(s) => ({ rations: s.rations, powder: s.powder })` builds a new object on every call and loops. Select primitives separately, or use a shallow-equality helper (zustand ships `useShallow` for this). Real zustand adds middleware, devtools and a `create()` that bakes the hook for you, but the core is exactly this.',
    ],
    pitfall: 'Destructuring the whole store, `const { rations } = useShip((s) => s)`. It reads like a selector, but it selects everything, so it re-renders on every change.',
    reactDev: 'https://react.dev/reference/react/useSyncExternalStore#subscribing-to-an-external-store',
    visualizer: 'ContextRerenderMap',
    example: {
      code: `${METER}

// The whole "library": state in a closure, set() replaces it, listeners hear about it.
function createStore(initial) {
  let state = initial
  const listeners = new Set()
  return {
    getState: () => state,
    setState(update) {
      state = { ...state, ...update(state) } // new object: immutable updates
      listeners.forEach((fn) => fn())
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

const shipStore = createStore({ rations: 40, powder: 12 })

// The selector runs INSIDE getSnapshot, so React compares the slice, not the state.
function useShip(selector) {
  return useSyncExternalStore(shipStore.subscribe, () => selector(shipStore.getState()))
}

function Galley() {
  const rations = useShip((s) => s.rations)
  const meter = useRenderMeter('Galley')
  return <p>Rations: {rations} <small ref={meter} /></p>
}

function Magazine() {
  const powder = useShip((s) => s.powder)
  const meter = useRenderMeter('Magazine')
  return <p>Powder: {powder} kegs <small ref={meter} /></p>
}

function App() {
  return (
    <div>
      <Galley />
      <Magazine />
      <button onClick={() => shipStore.setState((s) => ({ rations: s.rations - 4 }))}>Issue rations</button>{' '}
      <button onClick={() => shipStore.setState((s) => ({ powder: s.powder - 1 }))}>Fire a broadside</button>
    </div>
  )
}`,
      tryThis: [
        'Issue rations and watch both meters. Then change the Magazine selector to `(s) => s` and read `.powder`. What changes?',
        'Write a selector that returns `{ rations: s.rations }`. What does React complain about, and why?',
        'Why does App never re-render here, even though it renders both readers?',
      ],
    },
    trial: {
      symptom: 'Issuing rations makes the powder magazine re-render too. Every subscriber wakes up for every change.',
      code: `${METER}

// A tiny store in the style of zustand: state outside React.
function createStore(initial) {
  let state = initial
  const listeners = new Set()
  return {
    getState: () => state,
    setState(update) {
      state = { ...state, ...update(state) }
      listeners.forEach((fn) => fn())
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

const shipStore = createStore({ rations: 40, powder: 12 })

// Read one slice of the store
function useShip(selector) {
  const state = useSyncExternalStore(shipStore.subscribe, shipStore.getState)
  return selector(state)
}

function Galley() {
  const rations = useShip((s) => s.rations)
  const meter = useRenderMeter('Galley')
  return <p>Rations: {rations} <small ref={meter} /></p>
}

function Magazine() {
  const powder = useShip((s) => s.powder)
  const meter = useRenderMeter('Magazine')
  return <p>Powder: {powder} kegs <small ref={meter} /></p>
}

function App() {
  return (
    <div>
      <Galley />
      <Magazine />
      <button onClick={() => shipStore.setState((s) => ({ rations: s.rations - 4 }))}>Issue rations</button>
      <button onClick={() => shipStore.setState((s) => ({ powder: s.powder - 1 }))}>Fire a broadside</button>
    </div>
  )
}`,
      checks: [
        {
          label: 'Issuing rations updates the Galley and leaves the Magazine alone',
          run: async (t) => {
            const magazine = rendersOf(t, 'Magazine')
            await t.click('Issue rations')
            t.expectText('Rations: 36')
            const after = rendersOf(t, 'Magazine')
            if (after !== magazine) throw new Error(`The Magazine rendered ${after - magazine} more time(s), but only rations changed.`)
          },
        },
        {
          label: 'A broadside updates the Magazine and leaves the Galley alone',
          run: async (t) => {
            const galley = rendersOf(t, 'Galley')
            const magazine = rendersOf(t, 'Magazine')
            await t.click('Fire a broadside')
            t.expectText('Powder: 11 kegs')
            if (rendersOf(t, 'Galley') !== galley) throw new Error('The Galley re-rendered for a change to powder.')
            if (rendersOf(t, 'Magazine') !== magazine + 1) throw new Error('The Magazine should render exactly once for one broadside.')
          },
        },
      ],
    },
  },

  {
    id: 'url-state',
    title: 'The URL as state',
    charted: true,
    prereqs: ['colocation'],
    why: 'Filters, tabs and pages belong in the URL so they survive reloads and can be shared.',
    how: [
      'Ask of every piece of state: should a **reload** keep it? Should a **link** reproduce it? Should **Back** undo it? If yes, it is not component state; it is the URL. Filters, the selected tab, the page number, the open item\'s id, a search query.',
      'The URL is an external store with a tiny API: read `location`, write with `history.pushState` (new Back entry) or `replaceState` (no entry), hear about Back/Forward through `popstate` (or `hashchange`). Reading it is exactly the previous lesson: `useSyncExternalStore(subscribe, () => location.search)`. This app\'s router does that with the hash.',
      'Then **derive**, do not copy: `const sea = new URLSearchParams(search).get(\'sea\') ?? \'all\'` during render. A `useState` initialised from the URL is the classic trap: it reads the URL once, then drifts away from it on Back, and two sources of truth disagree.',
      'Push for navigation-like changes (switching tab or filter), replace for noise (every keystroke in a search box), and keep truly transient things (hover, an open dropdown, a half-typed draft) in local state. In frameworks this is `useSearchParams` (React Router, Next.js); the mechanics underneath are the same.',
    ],
    pitfall: '`const [sea, setSea] = useState(params.get(\'sea\'))`. It looks URL-driven, but it reads the URL once. Back changes the address bar and the page ignores it.',
    reactDev: 'https://react.dev/reference/react/useSyncExternalStore#subscribing-to-a-browser-api',
    visualizer: null,
    example: {
      code: `// A stand-in for the browser, so this page's real URL is left alone.
// Real life: location.search, history.pushState and the 'popstate' event.
function createBrowser(start) {
  let entries = [start]
  let index = 0
  const listeners = new Set()
  const emit = () => listeners.forEach((fn) => fn())
  return {
    getUrl: () => entries[index],
    push(url) {
      entries = [...entries.slice(0, index + 1), url]
      index += 1
      emit()
    },
    back() {
      if (index > 0) {
        index -= 1
        emit()
      }
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}
const browser = createBrowser('/log?tab=crew')

const TABS = ['crew', 'cargo', 'weather']

function Logbook() {
  const url = useSyncExternalStore(browser.subscribe, browser.getUrl)
  // Derived from the URL on every render: one source of truth.
  const tab = new URLSearchParams(url.split('?')[1]).get('tab') ?? 'crew'
  return (
    <section>
      {TABS.map((t) => (
        <button key={t} aria-pressed={t === tab} onClick={() => browser.push('/log?tab=' + t)}>{t}</button>
      ))}
      <p>Showing the {tab} page of the log.</p>
    </section>
  )
}

function App() {
  const url = useSyncExternalStore(browser.subscribe, browser.getUrl)
  const [loads, setLoads] = useState(0)
  return (
    <div>
      <p><code>{url}</code> <button onClick={() => browser.back()}>Back</button> <button onClick={() => setLoads(loads + 1)}>Reload</button></p>
      <Logbook key={loads} />
    </div>
  )
}`,
      tryThis: [
        'Click through the tabs, then press Back a few times. Where does the history live?',
        'Press Reload (it remounts Logbook with a new key, losing all its state). Why does the tab survive?',
        'Change `push` to a `replace` you write yourself. What happens to Back?',
      ],
    },
    trial: {
      symptom: 'Filter to the North Sea and send the link to the Admiral: he sees every sea. Reload and your own filter is gone too, and Back does nothing.',
      code: `// A stand-in for the browser: an address bar with history.
function createBrowser(start) {
  let entries = [start]
  let index = 0
  const listeners = new Set()
  const emit = () => listeners.forEach((fn) => fn())
  return {
    getUrl: () => entries[index],
    push(url) {
      entries = [...entries.slice(0, index + 1), url]
      index += 1
      emit()
    },
    back() {
      if (index > 0) {
        index -= 1
        emit()
      }
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}
const browser = createBrowser('/charts')

const CHARTS = [
  { name: 'Dover Strait', sea: 'channel' },
  { name: 'Lizard Point', sea: 'channel' },
  { name: 'Dogger Bank', sea: 'north' },
  { name: 'Firth of Forth', sea: 'north' },
]

function ChartRoom() {
  const [sea, setSea] = useState('all')
  const shown = sea === 'all' ? CHARTS : CHARTS.filter((c) => c.sea === sea)

  return (
    <section>
      <button onClick={() => setSea('all')}>All seas</button>
      <button onClick={() => setSea('channel')}>Channel</button>
      <button onClick={() => setSea('north')}>North Sea</button>
      <ul>{shown.map((c) => <li key={c.name}>{c.name}</li>)}</ul>
    </section>
  )
}

// ── Browser chrome: the address bar, Back and Reload. No bug down here.
function App() {
  const url = useSyncExternalStore(browser.subscribe, browser.getUrl)
  const [loads, setLoads] = useState(0) // Reload = remount the page, keep the URL

  return (
    <div>
      <p>Address: {url}</p>
      <button onClick={() => browser.back()}>Back</button>
      <button onClick={() => setLoads(loads + 1)}>Reload</button>
      <ChartRoom key={loads} />
    </div>
  )
}`,
      checks: [
        {
          label: 'Filtering to the North Sea puts "?sea=north" in the address',
          run: async (t) => {
            await t.click('North Sea')
            t.expectCount('li', 2)
            t.expectText('Dogger Bank')
            t.expectText('Address: /charts?sea=north')
          },
        },
        {
          label: 'The filter survives a reload',
          run: async (t) => {
            await t.click('Reload')
            t.expectCount('li', 2)
            t.expectText('Dogger Bank')
            t.expectNoText('Dover Strait')
          },
        },
        {
          label: 'Back walks the filter back: Channel → North Sea → all seas',
          run: async (t) => {
            await t.click('Channel')
            t.expectText('Dover Strait')
            await t.click('Back')
            t.expectText('Address: /charts?sea=north')
            t.expectText('Dogger Bank')
            t.expectNoText('Dover Strait')
            await t.click('Back')
            t.expectText('Address: /charts')
            t.expectCount('li', 4)
          },
        },
      ],
    },
  },
]

export const checkpoint = [
  {
    q: 'A reducer does `state.items.push(x); return state`. Why does nothing re-render, and why does changing it to `return { ...state }` still give wrong results in development?',
    model:
      'React compares the reducer result with the old state using Object.is; the same object means "no change", so it bails out of rendering. Spreading makes a new outer object, but push still mutated the shared old array. StrictMode calls reducers twice in dev, so the mutation happens twice (duplicate items). A reducer must be pure: build new arrays/objects ([...items, x]) and never touch the old state.',
  },
  {
    q: 'A component wrapped in `memo` re-renders every time its provider\'s parent re-renders for unrelated state. Explain the mechanism and give two fixes.',
    model:
      'The provider value is an object literal, so every render of its owner creates a new object. React compares provider values with Object.is, sees a change and re-renders every consumer of that context; memo only compares props, so it cannot stop a context update. Fixes: memoize the value with useMemo (setters are stable), move the unrelated state out of the owner (colocate it), or split the context so readers depend only on what they use.',
  },
  {
    q: 'Why use `useSyncExternalStore` instead of `useState` plus a subscribing `useEffect`, and what contract must `getSnapshot` keep?',
    model:
      'useSyncExternalStore lets React read the store consistently during concurrent rendering: it re-checks the snapshot and forces a synchronous render if the store changed mid-render, so components never tear (show different values). It also catches changes between render and subscription and handles unsubscribe for you. getSnapshot must return the same value (Object.is) while the store has not changed; a new object per call loops forever. subscribe should be stable or React resubscribes every render.',
  },
  {
    q: 'You have a search query, a selected tab, a hover flag and the logged-in user. Where does each live, and what question decides it?',
    model:
      'Ask: should a reload keep it, should a link reproduce it, should Back undo it, and who reads it? Selected tab (and usually the committed search query) go in the URL, read via an external-store subscription and derived during render. The hover flag is transient local state colocated in the component that shows it. The logged-in user is read app-wide and changes rarely: context (or a store if many components need slices of it). Keep state as low as its readers allow.',
  },
]
