# ReactNow — The Cartographer's Atlas of React

A Victorian expedition-chart learning game for React, built with Vite + React 19 (plain JS).
Nihil uses it to learn React; Claude acts as **coach** and **co-author of lessons**.

## Coaching contract (read this first in every session)

Nihil's learning data lives in plain files under `journal/` (written by the Vite dev server, see `vite-plugin-ledger.js`):

| File | What it is |
|---|---|
| `journal/progress.json` | Current progress. `summary` block = rank, XP, day, streak, behind-schedule flag, suggested next lesson. |
| `journal/log.jsonl` | Append-only event log, one JSON per line. The truth about *how* he learns. |
| `journal/notes/<phase>/<lesson>.md` | His own notes per lesson ("Marginalia"). |

Schema details: `journal/README.md`.

When Nihil asks "how am I doing?", "what next?", or starts a study session:

1. **Read** `journal/progress.json` (summary first), then the tail of `journal/log.jsonl`, then the notes for recently touched lessons.
2. **Grade checkpoint answers**: `checkpoint_answer` events contain his verbatim answer and his self-grade. Compare against the model answers in `src/content/phases/*.js` (`checkpoint` export). Call out self-grades that were too generous, and name precisely what was missing.
3. **Spot struggle**: repeated `trial_attempt` with `pass:false` on one lesson (the `code` field shows what he tried) means a misconception. Diagnose the misconception, not the typo.
4. **Read the notes critically**: correct anything wrong in his own words; that is where misunderstandings hide.
5. **Spaced review**: lessons sealed more than ~5 days ago with no recent activity get a 2-question oral quiz.
6. **Schedule**: if `summary.behindSchedule` is true, say so plainly and propose the smallest catch-up plan.
7. Keep his global style: brutally honest, no filler, explain the *why* and the under-the-hood mechanics.

Never edit `journal/` files yourself unless he asks (they are his record). Commit them when he asks to commit.

## Authoring lessons ("charting")

- Content lives in `src/content/phases/`. P0 (`p0-js.js`) and P1 (`p1-rendering.js`) are fully charted; P2+ are stubs in `src/content/index.js` (`stub(...)`, `charted: false`).
- To chart a phase: create `src/content/phases/pN-*.js` following the lesson shape documented at the top of `p1-rendering.js`, export `default` lessons and a `checkpoint` array, then import it in `src/content/index.js` replacing the stubs. **Keep lesson ids stable**, since progress and notes are keyed by `phase/lesson`.
- Every snippet must define `function App`. Hooks are injected via `src/journal/liveScope.js` (no imports in snippets).
- Trials: `checks[].run(t)` with helpers from `src/journal/trialHarness.js`: `click(text)`, `type(label, value)`, `wait(ms)`, `expectText`, `expectNoText`, `expectCount(selector, n)`, `expectValue(label, value)`. Checks run in order and share state. Verify the **buggy** code fails and a correct fix passes.
- Visualizers: `src/visualizers/*.jsx`, registered in `src/visualizers/index.jsx`, referenced by `visualizer: 'Name'`.
- Verify React 19 APIs against current docs (context7) before writing about them.

## Architecture notes

- Routing: hash router on `useSyncExternalStore` (`src/router/useHashRoute.js`). Routes: `#/`, `#/p1`, `#/p1/<lesson>`, `#/p1/gate`, `#/log`.
- State: event-sourced reducer (`src/store/expedition.js`); everything else (XP, rank, unlocks, streak, schedule) is derived in `src/store/derive.js`. Don't add stored copies of derived values.
- Camera: `src/atlas/useCamera.js` animates the SVG viewBox imperatively (no per-frame React renders).
- Commands: `npm run dev` (port 5173; the journal only works in dev), `npm run build`.
- Art: raw Gemini PNGs in `art/raw/<folder>/`, brief in `docs/ART_BRIEF.md`. `npm run art` (`scripts/ink-art.mjs`) keys white to alpha and writes WebPs to `src/assets/art/`. Components call `art('islands/p0')` from `src/art/index.js` (a build-time `import.meta.glob`) and draw their SVG fallback when it returns null. Don't use `mix-blend-mode` for art: opacity/transform on parent groups isolates the blend.
