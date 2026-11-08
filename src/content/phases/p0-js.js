// src/content/phases/p0-js.js — The Isle of Closures
// JS fundamentals that React leans on. Examples render their output through a
// tiny React App so everything runs in the same live editor.

export default [
  {
    id: 'closures',
    title: 'Closures',
    charted: true,
    prereqs: [],
    why: 'A function remembers the variables from where it was created, not where it is called. Every hook and every stale-state bug is built on this.',
    how: [
      'When a function is created it keeps a live link to its surrounding scope (its *lexical environment*). It can read and write those variables later, even after the outer function has returned.',
      'Each **call** of the outer function makes a fresh scope. Two counters made by `makeCounter()` never share `n`.',
      'In React each render is a call of your component, so every handler made during that render closes over that render\'s props and state. That single fact explains state snapshots and stale closures.',
      'Loop detail: `let` creates a new binding per iteration; `var` has one binding for the whole function, so every callback sees its final value.',
    ],
    pitfall: '`for (var i ...)` with callbacks created inside the loop: they all print the last value of `i`.',
    reactDev: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures',
    visualizer: null,
    example: {
      code: `function makeCounter(label) {
  let n = 0 // private to THIS call of makeCounter
  return () => label + ': ' + (++n)
}

const a = makeCounter('A')
const b = makeCounter('B')
const results = [a(), a(), b(), a()]

function App() {
  return (
    <ol>
      {results.map((r, i) => <li key={i}>{r}</li>)}
    </ol>
  )
}`,
      tryThis: [
        'Predict the four lines before reading them. Then add `b()` twice more.',
        'Move `let n = 0` outside makeCounter. What changes, and why?',
      ],
    },
    trial: {
      symptom: 'Three buoys should read Buoy 1, 2 and 3. They all say "Buoy 4".',
      code: `const buoys = []
for (var i = 1; i <= 3; i++) {
  buoys.push(() => 'Buoy ' + i)
}

function App() {
  return <ul>{buoys.map((b, idx) => <li key={idx}>{b()}</li>)}</ul>
}`,
      checks: [
        { label: 'Lists Buoy 1, Buoy 2, Buoy 3', run: (t) => ['Buoy 1', 'Buoy 2', 'Buoy 3'].forEach((s) => t.expectText(s)) },
        { label: 'No "Buoy 4"', run: (t) => t.expectNoText('Buoy 4') },
      ],
    },
  },

  {
    id: 'references',
    title: 'Values, references & immutability',
    charted: true,
    prereqs: [],
    why: 'React decides "did this change?" with `Object.is`. Mutate an object in place and React sees the same reference, so nothing updates.',
    how: [
      'Primitives (numbers, strings, booleans) compare by value. Objects and arrays compare by **identity**: two variables are equal only if they point at the same object in memory.',
      '`const` stops re-assignment, not mutation. `const list = []; list.push(1)` is legal and is exactly the bug.',
      'React\'s bail-out check is `Object.is(oldState, newState)`. Same reference means "nothing changed, skip". So updates must create *new* objects: spread, `map`, `filter`, `toSorted`, or `structuredClone` for deep copies.',
    ],
    pitfall: '`cargo.push(x); setCargo(cargo)`: same array reference, so React bails out and the UI never updates.',
    reactDev: 'https://react.dev/learn/updating-arrays-in-state',
    visualizer: null,
    example: {
      code: `const a = { port: 'Bristol' }
const b = { port: 'Bristol' }
const c = a

const rows = [
  ['a === b', a === b],
  ['a === c', a === c],
  ['Object.is(1, 1)', Object.is(1, 1)],
  ['[...arr] === arr', (() => { const arr = [1]; return [...arr] === arr })()],
]

function App() {
  return (
    <table>
      <tbody>
        {rows.map(([expr, val]) => (
          <tr key={expr}><td><code>{expr}</code></td><td>{String(val)}</td></tr>
        ))}
      </tbody>
    </table>
  )
}`,
      tryThis: [
        'Add `c.port = "Leith"` before the rows. What is `a.port` now?',
        'Add a row comparing two equal strings. Why is it true when the objects were false?',
      ],
    },
    trial: {
      symptom: 'Clicking "Add spice" does nothing: the manifest stays "Tea".',
      code: `function App() {
  const [cargo, setCargo] = useState(['Tea'])

  function add() {
    cargo.push('Spice')
    setCargo(cargo)
  }

  return (
    <div>
      <p>Manifest: {cargo.join(', ')}</p>
      <button onClick={add}>Add spice</button>
    </div>
  )
}`,
      checks: [
        {
          label: 'After one click: "Manifest: Tea, Spice"',
          run: async (t) => {
            await t.click('Add spice')
            t.expectText('Manifest: Tea, Spice')
          },
        },
      ],
    },
  },

  {
    id: 'array-transforms',
    title: 'map, filter, reduce, toSorted',
    charted: true,
    prereqs: ['references'],
    why: 'JSX lists are built from expressions. Array methods that return new arrays are exactly what a pure render needs.',
    how: [
      '`map` transforms each item, `filter` keeps some, `reduce` folds into one value. All three return a **new** value and leave the original alone.',
      'Watch the mutators: `sort`, `reverse`, `splice`, `push` change the array in place. Modern JS gives non-mutating twins: `toSorted`, `toReversed`, `toSpliced`, `with`.',
      'Chaining reads like a pipeline: `crew.filter(c => c.onDuty).map(c => <li key={c.id}>{c.name}</li>)`.',
    ],
    pitfall: 'Calling `.sort()` on props or state during render: it silently reorders the original for everyone else who reads it.',
    reactDev: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/toSorted',
    visualizer: null,
    example: {
      code: `const crew = [
  { name: 'Ada', knots: 18, onDuty: true },
  { name: 'Mary', knots: 12, onDuty: false },
  { name: 'Charles', knots: 9, onDuty: true },
]

function App() {
  const onDuty = crew.filter((c) => c.onDuty)
  const fastestFirst = crew.toSorted((a, b) => b.knots - a.knots)
  const totalKnots = crew.reduce((sum, c) => sum + c.knots, 0)

  return (
    <div>
      <p>On duty: {onDuty.map((c) => c.name).join(', ')}</p>
      <p>Fastest first: {fastestFirst.map((c) => c.name).join(', ')}</p>
      <p>Total knots: {totalKnots}</p>
      <p>Original order untouched: {crew.map((c) => c.name).join(', ')}</p>
    </div>
  )
}`,
      tryThis: [
        'Replace `toSorted` with `sort`. Which line changed that should not have?',
        'Compute the average knots of the on-duty crew in one chain.',
      ],
    },
    trial: {
      symptom: 'The "Fastest" line is right, but the roster below it has been reordered too.',
      code: `const crew = [
  { name: 'Mary', knots: 12 },
  { name: 'Ada', knots: 18 },
  { name: 'Charles', knots: 9 },
]

function App() {
  const fastest = crew.sort((a, b) => b.knots - a.knots)
  return (
    <div>
      <p>Fastest: {fastest[0].name}</p>
      <p>Roster: {crew.map((c) => c.name).join(', ')}</p>
    </div>
  )
}`,
      checks: [
        { label: 'Shows "Fastest: Ada"', run: (t) => t.expectText('Fastest: Ada') },
        { label: 'Roster keeps the original order "Mary, Ada, Charles"', run: (t) => t.expectText('Roster: Mary, Ada, Charles') },
      ],
    },
  },

  {
    id: 'destructuring-spread',
    title: 'Destructuring & spread',
    charted: true,
    prereqs: ['array-transforms'],
    why: 'React code is full of `{ a, ...rest }` and `[value, setValue]`. Spread copies only one level deep, which bites nested state.',
    how: [
      'Destructuring pulls values out by name (`const { name } = ship`) or position (`const [x, setX] = useState()`), with defaults (`{ size = 1 }`) and renames (`{ name: shipName }`).',
      'Rest collects the remainder: `function Button({ variant, ...rest }) { return <button {...rest} /> }`.',
      'Spread `{ ...obj }` makes a **shallow** copy: a new outer object whose nested objects are still the *same references*. To update nested data, spread every level you change: `{ ...ship, captain: { ...ship.captain, rank } }`.',
    ],
    pitfall: 'Spreading the outer object and then mutating a nested one: the "copy" and the original share the nested object.',
    reactDev: 'https://react.dev/learn/updating-objects-in-state#updating-a-nested-object',
    visualizer: null,
    example: {
      code: `function Flag({ colour = 'navy', label, ...rest }) {
  return <span {...rest} style={{ color: colour }}>⚑ {label}</span>
}

const ship = { name: 'Beagle', captain: { name: 'FitzRoy' } }
const shallow = { ...ship }
const deep = { ...ship, captain: { ...ship.captain } }

function App() {
  return (
    <div>
      <Flag label="Beagle" title="hover me" />
      <p>shallow.captain === ship.captain: {String(shallow.captain === ship.captain)}</p>
      <p>deep.captain === ship.captain: {String(deep.captain === ship.captain)}</p>
    </div>
  )
}`,
      tryThis: [
        'Pass `colour="crimson"` to Flag.',
        'Destructure `name` from `ship.captain` in one line with a rename to `captainName`.',
      ],
    },
    trial: {
      symptom: 'After promoting, the "Was" line should still show the old rank (Commander). It shows Captain too.',
      code: `function App() {
  const [ship, setShip] = useState({
    name: 'Beagle',
    captain: { name: 'FitzRoy', rank: 'Commander' },
  })
  const [previous, setPrevious] = useState(null)

  function promote() {
    setPrevious(ship)
    const next = { ...ship }
    next.captain.rank = 'Captain'
    setShip(next)
  }

  return (
    <div>
      <p>Now: {ship.captain.name}, {ship.captain.rank}</p>
      {previous && <p>Was: {previous.captain.rank}</p>}
      <button onClick={promote}>Promote</button>
    </div>
  )
}`,
      checks: [
        {
          label: 'After promoting: "Now: FitzRoy, Captain"',
          run: async (t) => {
            await t.click('Promote')
            t.expectText('Now: FitzRoy, Captain')
          },
        },
        { label: 'History keeps "Was: Commander"', run: (t) => t.expectText('Was: Commander') },
      ],
    },
  },

  {
    id: 'modules',
    title: 'Modules & module scope',
    charted: true,
    prereqs: ['closures'],
    why: 'Every component file is an ES module. Module scope runs once and is shared by every instance, which explains "why is this variable shared?".',
    how: [
      'A module\'s top level runs **once**, on first import. Every importer gets the same instance of everything declared there. A module is a singleton.',
      'Named exports (`export function Map`) are imported by exact name; a default export can be imported under any name. Imports are live, read-only bindings.',
      'Use module scope for constants, pure helpers and genuinely app-wide singletons. Never use it for per-instance data: every `<Poll />` would share one variable, and React would not know it changed.',
    ],
    pitfall: 'A module-level `let` used as if it were component state. Instances share it, and React never re-renders the others.',
    reactDev: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules',
    visualizer: null,
    example: {
      code: `// The live editor is one module, so this top level runs once per edit.
let created = 0 // module scope: shared by every Lantern

function Lantern({ name }) {
  // useState's initializer runs once per INSTANCE
  const [serial] = useState(() => ++created)
  return <li>{name}: lantern #{serial} (module has made {created})</li>
}

function App() {
  return (
    <ul>
      <Lantern name="Bow" />
      <Lantern name="Stern" />
    </ul>
  )
}`,
      tryThis: [
        'Add a third Lantern. Why does the "module has made" number differ per line? (Hint: render order.)',
        'Move `created` into Lantern as `let created = 0`. What breaks?',
      ],
    },
    trial: {
      symptom: 'Each poll should count its own votes. Voting North twice and South once should read North: 2, South: 1.',
      code: `let votes = 0 // module scope

function Poll({ topic }) {
  const [, forceRender] = useState(0)
  function vote() {
    votes++
    forceRender((n) => n + 1)
  }
  return (
    <p>
      {topic}: {votes} <button onClick={vote}>Vote {topic}</button>
    </p>
  )
}

function App() {
  return (
    <div>
      <Poll topic="North" />
      <Poll topic="South" />
    </div>
  )
}`,
      checks: [
        {
          label: 'Vote North twice, South once: "North: 2" and "South: 1"',
          run: async (t) => {
            await t.click('Vote North')
            await t.click('Vote North')
            await t.click('Vote South')
            t.expectText('North: 2')
            t.expectText('South: 1')
          },
        },
      ],
    },
  },

  {
    id: 'async-await',
    title: 'Promises & async/await',
    charted: true,
    prereqs: ['closures', 'array-transforms'],
    why: 'Fetching, Actions and Suspense are all promises underneath. `await` only pauses the current function; everything else keeps running.',
    how: [
      'A promise is a placeholder for a value that arrives later. It settles once: fulfilled with a value or rejected with an error.',
      '`async` functions always return a promise. `await p` pauses *that function* until `p` settles, then resumes with the value (or throws the error, so `try/catch` works).',
      'Independent work should run in parallel: `await Promise.all([a(), b()])` instead of awaiting one after the other.',
    ],
    pitfall: 'Forgetting `await` (or `Promise.all`) and doing maths on promises. You get `NaN` or `"[object Promise]"`.',
    reactDev: 'https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Promises',
    visualizer: null,
    example: {
      code: `const sail = (port, ms) => new Promise((resolve) => setTimeout(() => resolve(port), ms))

function App() {
  const [result, setResult] = useState('')

  async function oneByOne() {
    const t0 = performance.now()
    const a = await sail('Lisbon', 600)
    const b = await sail('Madeira', 600)
    setResult(a + ' + ' + b + ' in ' + Math.round(performance.now() - t0) + 'ms (sequential)')
  }

  async function together() {
    const t0 = performance.now()
    const [a, b] = await Promise.all([sail('Lisbon', 600), sail('Madeira', 600)])
    setResult(a + ' + ' + b + ' in ' + Math.round(performance.now() - t0) + 'ms (parallel)')
  }

  return (
    <div>
      <button onClick={oneByOne}>Sequential</button>{' '}
      <button onClick={together}>Parallel</button>
      <p>{result || 'Choose a route'}</p>
    </div>
  )
}`,
      tryThis: [
        'Make one voyage reject (`reject(new Error("storm"))`) and catch it with try/catch.',
        'Remove one `await` from oneByOne. What gets rendered?',
      ],
    },
    trial: {
      symptom: 'After weighing, the total should be 120. It shows a mangled "[object Promise]" string.',
      code: `const weigh = (item) =>
  new Promise((resolve) => setTimeout(() => resolve(item.length * 10), 50))

function App() {
  const [total, setTotal] = useState(null)

  async function weighAll() {
    const items = ['tea', 'silk', 'spice']
    const weights = items.map((i) => weigh(i))
    setTotal(weights.reduce((a, b) => a + b, 0))
  }

  return (
    <div>
      <button onClick={weighAll}>Weigh cargo</button>
      <p>Total: {total ?? '—'}</p>
    </div>
  )
}`,
      checks: [
        {
          label: 'After weighing: "Total: 120"',
          run: async (t) => {
            await t.click('Weigh cargo')
            await t.wait(300)
            t.expectText('Total: 120')
          },
        },
      ],
    },
  },

  {
    id: 'this-arrows',
    title: 'this & arrow functions',
    charted: true,
    prereqs: ['closures'],
    why: 'Regular functions get `this` from how they are called; arrows take it from where they are written. You still meet this in classes, listeners and libraries.',
    how: [
      '`ship.hail()` calls `hail` with `this = ship`. Pull the method off (`const h = ship.hail; h()`) and the call has no receiver, so `this` is `undefined` (strict mode) or the global object.',
      'Arrow functions have no `this` of their own; they close over the surrounding one, like any other variable. `.bind(obj)` creates a function with `this` fixed.',
      'Function components avoid `this` completely. Props and state are ordinary closure variables, which is one reason hooks replaced classes.',
    ],
    pitfall: 'Passing a method as a callback (`onClick={ship.hail}`) and losing `this`.',
    reactDev: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this',
    visualizer: null,
    example: {
      code: `const ship = {
  name: 'Endeavour',
  regular() { return 'regular: ' + (this && this.name) },
  arrowInside() {
    const inner = () => 'arrow inside method: ' + this.name
    return inner()
  },
}

const detached = ship.regular

function App() {
  return (
    <ul>
      <li>{ship.regular()}</li>
      <li>{ship.arrowInside()}</li>
      <li>detached: {String(detached())}</li>
      <li>{detached.call({ name: 'Resolution' })}</li>
    </ul>
  )
}`,
      tryThis: [
        'Fix `detached` with `.bind(ship)`.',
        'Turn `regular` into an arrow property `regular: () => ...`. Why does it break?',
      ],
    },
    trial: {
      symptom: 'Hailing should say "Ahoy from Endeavour". The name is missing.',
      code: `const ship = {
  name: 'Endeavour',
  hail() {
    return 'Ahoy from ' + ((this && this.name) || 'nobody')
  },
}

function App() {
  const [msg, setMsg] = useState('')
  const hail = ship.hail
  return (
    <div>
      <button onClick={() => setMsg(hail())}>Hail</button>
      <p>{msg}</p>
    </div>
  )
}`,
      checks: [
        {
          label: 'Clicking Hail shows "Ahoy from Endeavour"',
          run: async (t) => {
            await t.click('Hail')
            t.expectText('Ahoy from Endeavour')
          },
        },
      ],
    },
  },

  {
    id: 'event-loop',
    title: 'The event loop',
    charted: true,
    prereqs: ['async-await'],
    why: 'Why does a resolved promise beat `setTimeout(fn, 0)`? Why does a heavy loop freeze clicks? The event loop answers both, and it explains React batching and transitions.',
    how: [
      'JavaScript runs on one call stack. Code runs to completion; nothing interrupts a running function.',
      'When the stack empties, the loop drains **all** microtasks (promise callbacks, `queueMicrotask`), then takes **one** macrotask (a timer, an input event), then the browser may paint a frame. Repeat.',
      'So `Promise.resolve().then(f)` runs before `setTimeout(g, 0)`. And a 300ms synchronous loop blocks clicks, paint and React until it finishes; that is what `useTransition` and chunking work around.',
    ],
    pitfall: 'Heavy synchronous work in an event handler. The UI freezes because the browser cannot paint until the stack is empty.',
    reactDev: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop',
    visualizer: 'EventLoop',
    example: {
      code: `function runOrder() {
  const out = []
  out.push('sync: start')
  setTimeout(() => out.push('macrotask: setTimeout 0'), 0)
  Promise.resolve().then(() => out.push('microtask: promise.then'))
  queueMicrotask(() => out.push('microtask: queueMicrotask'))
  out.push('sync: end')
  return new Promise((resolve) => setTimeout(() => resolve(out), 20))
}

function App() {
  const [lines, setLines] = useState([])
  return (
    <div>
      <button onClick={async () => setLines(await runOrder())}>Run</button>
      <ol>{lines.map((l, i) => <li key={i}>{l}</li>)}</ol>
    </div>
  )
}`,
      tryThis: [
        'Add a `.then` chained after the first `.then`. Where does it land, and why?',
        'Put `setTimeout` *inside* a `.then`. Before or after the original timeout?',
      ],
    },
    trial: {
      symptom: 'The steps should read "load → parse → render". They read "load → render → parse".',
      code: `function App() {
  const [steps, setSteps] = useState([])

  function start() {
    const out = ['load']
    setTimeout(() => out.push('parse'), 0)
    Promise.resolve().then(() => out.push('render'))
    setTimeout(() => setSteps([...out]), 50)
  }

  return (
    <div>
      <button onClick={start}>Start</button>
      <p>Steps: {steps.join(' → ')}</p>
    </div>
  )
}`,
      checks: [
        {
          label: 'Shows "Steps: load → parse → render"',
          run: async (t) => {
            await t.click('Start')
            await t.wait(150)
            t.expectText('Steps: load → parse → render')
          },
        },
      ],
    },
  },
]

export const checkpoint = [
  {
    q: 'What is a closure, and how does it explain a "stale" value inside a `setTimeout` callback?',
    model:
      'A closure is a function plus the scope it was created in. The callback reads the variables of the call that created it, so a timeout made in an earlier call (or render) keeps reading that call\'s values, even if newer ones exist.',
  },
  {
    q: 'Why does `list.push(x); setList(list)` not re-render, and what is the fix?',
    model:
      'React compares old and new state with Object.is. The pushed array is the same reference, so React bails out. Create a new array instead: `setList([...list, x])`.',
  },
  {
    q: 'In what order do these run: sync code, a resolved promise `.then`, a `setTimeout(…, 0)`? Why?',
    model:
      'Sync code first (it owns the stack), then all microtasks (the .then), then one macrotask (the timeout). The loop drains the microtask queue completely before taking the next macrotask.',
  },
]
