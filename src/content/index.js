// src/content/index.js
// ---------------------------------------------------------------------------
// The chart's table of contents. Each phase is a territory on the atlas.
//
//   center/radius -> where the island sits in atlas world units (1920 x 1080, 16:9)
//   glyph         -> which engraved landmark to draw
//   why / how     -> the cartographer's annotations shown on the map
//   lessons       -> waypoints; `charted: true` once a lesson has full content
//
// Lessons for P0 and P1 live in their own files (full content). Later phases
// are "uncharted": titles + why are known, the survey (example/trial) is not.
// Ask Claude to chart them one phase at a time.
// ---------------------------------------------------------------------------
import p0, { checkpoint as p0Checkpoint } from './phases/p0-js.js'
import p1, { checkpoint as p1Checkpoint } from './phases/p1-rendering.js'

/** Helper for not-yet-surveyed lessons. */
const stub = (id, title, why, prereqs = []) => ({ id, title, why, prereqs, charted: false })

export const PHASES = [
  {
    id: 'p0',
    num: 'P0',
    title: 'JS gaps',
    landmark: 'The Isle of Closures',
    glyph: 'isle',
    center: [300, 250],
    radius: 80,
    seed: 3,
    why: 'React is just JavaScript. Every "React bug" you meet is usually a JS gap wearing a costume.',
    how: 'Closures, references and the event loop explain stale state, broken memo and racing effects before you ever import React.',
    lessons: p0,
    checkpoint: p0Checkpoint,
  },
  {
    id: 'p1',
    num: 'P1',
    title: 'Rendering model',
    landmark: 'Render Falls',
    glyph: 'falls',
    center: [720, 250],
    radius: 80,
    seed: 11,
    why: 'Rendering is React calling your function. Understand that and the rest stops being magic.',
    how: 'State is a per-render snapshot, render is pure computation, commit is the only DOM write, keys decide identity.',
    lessons: p1,
    checkpoint: p1Checkpoint,
  },
  {
    id: 'p2',
    num: 'P2',
    title: 'Effects',
    landmark: 'The Effect Marshes',
    glyph: 'marsh',
    center: [1140, 250],
    radius: 80,
    seed: 23,
    why: 'Effects synchronize React with things outside React. Used for anything else, they become a swamp.',
    how: 'Effects run after commit, close over one render, and must clean up. Most "effects" should be event handlers or derived values.',
    lessons: [
      stub('sync-external', 'Synchronizing with the outside', 'Effects exist for one job: keeping an external system in step with your render output.'),
      stub('deps-closures', 'Dependencies & stale closures', 'The deps array is not an optimization; it declares which snapshot values your effect reads.', ['sync-external']),
      stub('cleanup', 'Cleanup', 'Every subscription you open must be closed, or it outlives the render that made it.', ['sync-external']),
      stub('not-needed', 'You might not need an effect', 'Derived data and event-driven logic in effects cause extra renders and sync bugs.', ['deps-closures']),
      stub('refs', 'Refs: the escape hatch', 'A ref is a mutable box React ignores during render; perfect for values that should not trigger renders.', ['deps-closures']),
      stub('effect-event', 'useEffectEvent', 'Read the latest props inside an effect without re-subscribing every time they change.', ['deps-closures', 'refs']),
      stub('custom-hooks', 'Custom hooks', 'Hooks share stateful logic, not state. Each call gets its own slots on the fiber.', ['cleanup', 'not-needed']),
      stub('strict-mode', 'StrictMode double-invoke', 'StrictMode mounts twice in dev to prove your cleanup is correct.', ['cleanup']),
    ],
  },
  {
    id: 'p3',
    num: 'P3',
    title: 'State architecture',
    landmark: 'The State Citadel',
    glyph: 'citadel',
    center: [1560, 250],
    radius: 80,
    seed: 37,
    why: 'Where state lives decides what re-renders and how hard bugs are to find.',
    how: 'Colocate first, lift when shared, reduce when transitions are complex, and reach for context or stores only at real boundaries.',
    lessons: [
      stub('reducer', 'useReducer', 'Move "how state changes" out of handlers into one pure, testable function.'),
      stub('context', 'Context', 'Context removes prop-drilling, but every consumer re-renders when the value changes.', ['reducer']),
      stub('context-cost', 'The cost of context', 'A new object literal as the value re-renders every consumer on every parent render.', ['context']),
      stub('colocation', 'Colocation', 'State as close as possible to where it is used keeps re-renders small and code obvious.'),
      stub('external-store', 'useSyncExternalStore', 'The safe bridge to state that lives outside React, without tearing.', ['context-cost']),
      stub('zustand', 'A lightweight store', 'Selector-based stores re-render only the components that read the changed slice.', ['external-store']),
      stub('url-state', 'The URL as state', 'Filters, tabs and pages belong in the URL so they survive reloads and can be shared.', ['colocation']),
    ],
  },
  {
    id: 'p4',
    num: 'P4',
    title: 'Data & forms',
    landmark: 'Harbour of Data & Forms',
    glyph: 'harbour',
    center: [1350, 545],
    radius: 80,
    seed: 41,
    why: 'Real apps wait on networks and users. React 19 gives first-class tools for both.',
    how: 'Suspense and use() for reading async data, Actions for writing it, optimistic UI for speed, and cache libraries for everything between.',
    lessons: [
      stub('race-conditions', 'Fetch race conditions', 'Two requests in flight, the slow old one lands last: classic wrong-data bug.'),
      stub('suspense-use', 'Suspense & use()', 'Let components read a promise and let a boundary show the fallback.', ['race-conditions']),
      stub('tanstack-query', 'TanStack Query', 'Server state is a cache problem, not a useState problem.', ['race-conditions']),
      stub('actions', 'Actions & useActionState', 'Async transitions that handle pending, errors and results for forms.', ['suspense-use']),
      stub('form-status', 'useFormStatus', 'Children of a form read its pending state without prop-drilling.', ['actions']),
      stub('optimistic', 'useOptimistic', 'Show the result before the server confirms it, roll back if it fails.', ['actions']),
      stub('controlled', 'Controlled vs uncontrolled', 'Who owns the input value: React state or the DOM?'),
      stub('validation', 'Validation', 'Validate on the server always, on the client for kindness.', ['controlled', 'actions']),
    ],
  },
  {
    id: 'p5',
    num: 'P5',
    title: 'Performance',
    landmark: 'The Performance Peaks',
    glyph: 'peaks',
    center: [930, 545],
    radius: 80,
    seed: 53,
    why: 'Most React apps are slow for a handful of reasons; measure before you climb.',
    how: 'Profile, then cut wasted renders (memo, compiler), defer non-urgent work (transitions), and ship less code.',
    lessons: [
      stub('profiler', 'The Profiler', 'Guessing at performance is how you add memo everywhere and fix nothing.'),
      stub('memo', 'memo, useMemo, useCallback', 'Memoization only works when the inputs are referentially stable.', ['profiler']),
      stub('compiler', 'React Compiler', 'The compiler auto-memoizes pure components, if your code follows the rules.', ['memo']),
      stub('transitions', 'useTransition & useDeferredValue', 'Mark updates as interruptible so typing never waits on a heavy list.', ['profiler']),
      stub('code-splitting', 'lazy & code-splitting', 'The fastest code is the code you did not download yet.'),
      stub('virtualization', 'Virtualization', 'Render the 20 visible rows, not the 10,000 hidden ones.', ['profiler']),
    ],
  },
  {
    id: 'p6',
    num: 'P6',
    title: 'TypeScript',
    landmark: 'The Typed Fortress',
    glyph: 'fortress',
    center: [510, 545],
    radius: 80,
    seed: 61,
    why: 'Types turn runtime surprises into editor squiggles, and props into documentation.',
    how: 'Type props and children, model state with discriminated unions, and let generics carry types through reusable components.',
    lessons: [
      stub('props-types', 'Typing props & children', 'The component contract, enforced by the compiler.'),
      stub('generics', 'Generic components', 'A <List<T>> that knows what T is in its render prop.', ['props-types']),
      stub('unions', 'Discriminated-union state', 'Make impossible states unrepresentable: no loading && error at once.', ['props-types']),
      stub('typed-hooks', 'Typing context & hooks', 'Context with a default that cannot lie, hooks that return precise tuples.', ['unions']),
      stub('events', 'Event types', 'React.ChangeEvent<HTMLInputElement> and friends, without the guesswork.', ['props-types']),
    ],
  },
  {
    id: 'p7',
    num: 'P7',
    title: 'Next.js',
    landmark: 'The Next Frontier',
    glyph: 'frontier',
    center: [720, 840],
    radius: 80,
    seed: 71,
    why: 'Frameworks decide where code runs: server, client, or build. That changes everything.',
    how: 'Server Components fetch on the server and ship no JS; Client Components hydrate; Server Actions mutate.',
    lessons: [
      stub('app-router', 'App Router & layouts', 'The filesystem is the router; layouts persist across navigation.'),
      stub('rsc', 'Server vs Client Components', '"use client" marks a boundary, not a component.', ['app-router']),
      stub('server-actions', 'Server Actions', 'Call a server function from a form like it is local.', ['rsc']),
      stub('caching', 'Caching & revalidation', 'Know what is cached, where, and for how long, or debug forever.', ['rsc']),
      stub('streaming', 'Streaming', 'Send the shell now, stream slow parts as they resolve.', ['rsc']),
    ],
  },
  {
    id: 'p8',
    num: 'P8',
    title: 'Testing',
    landmark: 'The Proving Grounds',
    glyph: 'grounds',
    center: [1140, 840],
    radius: 80,
    seed: 83,
    why: 'Tests let you refactor without fear. Good tests check behaviour, not implementation.',
    how: 'Query like a user, interact like a user, mock the network not your modules, and keep a few end-to-end smoke tests.',
    lessons: [
      stub('rtl', 'Testing Library philosophy', 'The more your tests resemble usage, the more confidence they give.'),
      stub('user-event', 'user-event', 'Real interaction sequences, not synthetic fireEvent shortcuts.', ['rtl']),
      stub('msw', 'Mocking the network (MSW)', 'Intercept at the network layer so components run unmodified.', ['rtl']),
      stub('hooks-tests', 'Testing hooks', 'Test hooks through a component unless the hook is the product.', ['rtl']),
      stub('playwright', 'Playwright', 'A handful of true end-to-end paths catch what unit tests cannot.', ['user-event']),
    ],
  },
  {
    id: 'cap',
    num: 'C',
    title: 'Capstone',
    landmark: 'Summit of the Capstone',
    glyph: 'summit',
    center: [1560, 840],
    radius: 80,
    seed: 97,
    why: 'Build one real app end to end and every phase stops being theory.',
    how: 'A brief, milestones, and a review with Claude at each one.',
    lessons: [
      stub('brief', 'The brief', 'Pick a scope small enough to finish and real enough to show.'),
      stub('architecture', 'Architecture review', 'Decide state homes, data flow and boundaries before code.', ['brief']),
      stub('ship', 'Ship it', 'Deploy, test, and write the README a hiring manager will read.', ['architecture']),
    ],
  },
]

/**
 * Uncharted phases still need a gate, or progression would dead-end. Until the
 * real checkpoint is written, the gate asks you to teach the phase back.
 */
export function checkpointFor(phase) {
  return (
    phase.checkpoint ?? [
      { q: `Explain to a junior developer why "${phase.title}" matters. Use one concrete bug as an example.`, model: phase.why },
      { q: `Describe how ${phase.title.toLowerCase()} works under the hood, in your own words.`, model: phase.how },
    ]
  )
}

export const phaseById = Object.fromEntries(PHASES.map((p, i) => [p.id, { ...p, index: i }]))

export function findLesson(phaseId, lessonId) {
  const phase = phaseById[phaseId]
  if (!phase) return null
  const index = phase.lessons.findIndex((l) => l.id === lessonId)
  if (index < 0) return null
  return { phase, lesson: phase.lessons[index], index }
}

export const WORLD = { w: 1920, h: 1080 } // 16:9
