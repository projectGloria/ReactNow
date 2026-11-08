# Handoff: state of the Atlas (2026-11-08)

Read this first in a new session, then the root `CLAUDE.md` (coaching contract, architecture, authoring rules).
Last commit: `f80c06c` on `main`, pushed to `projectGloria/ReactNow`. The working tree was clean.

---

## 1. What exists

### The app
- **Atlas (`#/`)**: a Victorian expedition chart in SVG with ten territories (P0 to Capstone).
  - Ornaments: route, ship, compass, cartouche, legend, serpent and frame.
  - Hover shows a "how it works" card. Each island has an italic "why" annotation; the annotations were made bolder (weight 600, parchment halo).
- **Surveyor's Brief (`#/pX/brief`)**: clicking an island opens this first. It is landscape and never scrolls vertically (checked at 1920×915 and 1366×768).
  - **Left column:** why, how, stats, warnings, and the buttons "Start with" / "Show the waypoint map" / "↩ The Atlas".
  - **Right column:** a grid of lessons. Each shows its why, its prerequisites, its seal and a review-due mark.
- **Region plate (`#/pX`)**: waypoint map with prerequisite trails, the Customs House gate and a "§ The Brief" button. The camera animates the SVG viewBox imperatively.
- **Field Journal (`#/pX/<lesson>`)**: a book spread, lazy-loaded.
  - **Left page:** why, how, pitfall, react.dev link.
  - **Right page tabs:** Specimen (react-live), Apparatus (visualizer) and Trial (fix-the-bug, run by `trialHarness`).
  - **Marginalia:** notes saved to `journal/notes/`, with a 120-character meter.
- **Checkpoint Gate (`#/pX/gate`)**: flip cards with self-grading. A warning appears when an answer is under 35% of the model answer's length, and `lengthRatio` is logged.
- **Captain's Log (`#/log`)**: ranks with medals, stats and history. The "Dispatch to Claude" button copies a markdown report.

### Game rules (all derived in `src/store/derive.js`)
- **Mastery:** the example was edited (whitespace changes don't count), the trial passed, and a note of at least 120 characters exists.
- **Spaced review:** a seal fades 3, 7, 21 and 30 days after its last stamp. Re-passing the trial with `review: true` re-stamps it.
  - The ledger strip, the brief, the plate (dashed ring) and the journal (opens on the Trial tab) all show it.
- **Schedule:** the expected pace is capped at the lessons that are actually charted. When everything charted is sealed, `awaitingCharts` is true and you are not shown as "behind".
- **XP, six ranks, streak, 36-day plan.**

### Infrastructure
- `vite-plugin-ledger.js` writes `journal/` to disk. It only runs in dev; in production the telegram says so.
- Tests: `npm test` (Vitest + jsdom) runs 46 tests: game rules, router, and every charted trial (the buggy code must fail, the example must render).
- `npm run lint` (ESLint 9) uses `react/jsx-no-undef`. The build does **not** catch a missing JSX import; lint does.
- The main bundle was 628 KB and is now 335 KB, because the journal (react-live, sucrase, prism) is a lazy chunk.
- Accessibility: sheets get focus on mount and restore it on close; the chart is `inert` under overlays. The `inert` attribute sits on a `display: contents` wrapper, because it does nothing on `<svg>`.
- Git: `.gitattributes` forces LF endings, and `art/raw/**/*.png` is stored in **LFS**.
- The journal was reset: `progress.json` does not exist yet, `log.jsonl` is empty, and there are no notes.

### Content

| Phase | Status |
|---|---|
| P0 JS gaps (`p0-js.js`) | 8 lessons fully charted, visualizer: EventLoop |
| P1 Rendering (`p1-rendering.js`) | 9 lessons fully charted, visualizers: SnapshotInspector, RenderCommitTimeline, BatchingQueue, ReconciliationTree |
| P2 to Capstone | **47 stubs** in `src/content/index.js` (title, why and prerequisites only, `charted: false`); the gates use generic fallback questions |

### Art (Gemini, then `npm run art`, then `src/assets/art/*.webp`)
- **Done:**
  - paper: parchment, foxing, journal-spread;
  - chart: compass-rose, cartouche, ship, sea-serpent, frame-corner;
  - islands: all 10;
  - plates: p0 and p1;
  - game: wax-seal.
- **Wired but missing:** the components load these automatically and use an SVG fallback until the files exist.
  - E1 `plates/waypoint.png` (the cairn shown on each waypoint)
  - E2 `plates/customs-house.png`
  - F2 to F7 `game/rank-1.png` … `rank-6.png`
  - D2 to D9 `plates/p2.png` … `plates/p8.png`, `plates/cap.png` (picked up by phase id)
- **Not wired, Tier 3:** A4 ledger-page, A5 card-back, B5 wind-head, F8 lost, F9 favicon.

---

## 2. What needs to be done

### Next (in priority order)
1. **Chart P2, The Effect Marshes.** It is the next territory, and once P1 is sealed the app will report `awaitingCharts`.
   - Create `src/content/phases/p2-effects.js` following the lesson shape at the top of `p1-rendering.js`.
   - Replace the stubs in `src/content/index.js`, and **keep the lesson ids**: `sync-external`, `deps-closures`, `cleanup`, `not-needed`, `refs`, `effect-event`, `custom-hooks`, `strict-mode`.
   - Write a `checkpoint` array of 3 or 4 questions.
   - Check `useEffectEvent` and StrictMode behaviour against the current React 19 docs (context7) before writing.
   - Write visualizers **EffectLifecycle** and **StaleClosureLab**, and register them in `src/visualizers/index.jsx`.
   - Done means: `npm test` is green (the buggy trial fails), each fix has been checked by hand to pass, lint is clean, and the lessons were clicked through in the browser.
2. **Process the Gemini art once the quota resets.** Drop the PNGs into `art/raw/<folder>/`, run `npm run art`, check them visually on the plate and in the Captain's Log, and adjust `OVERRIDES` in `scripts/ink-art.mjs` (trim, max size) if needed.
3. **Chart P3 to P8 and the Capstone**, one phase per iteration, with the remaining visualizers:
   - ContextRerenderMap (P3)
   - SuspenseWaterfall (P4)
   - TransitionPriority (P5)

### Later / optional
- Wire the Tier 3 art: ledger-page as the Captain's Log background, card-back on the gate cards, wind-head as a chart ornament, lost on the "Off the edge of the map" sheet, and the favicon.
- History still holds about 25 MB of PNGs from the first commit (`04f4ef1`), because they went into LFS only from `f80c06c` on. Removing them needs a history rewrite and a force push, so do it only if you ask for it.
- There is no CI. A GitHub Action running `npm test`, `npm run lint` and `npm run build` would be cheap.

### Notes and gotchas
- Never edit `journal/` (it is Nihil's record) unless he asks. Two dev servers on different ports (5173 and 5174) write to the **same** `journal/`. A stale tab can overwrite progress, so reload old tabs after a reset.
- On Windows, Python in text mode writes CRLF. `.gitattributes` normalizes line endings on commit; for files written by hand, use `newline=''`.
- Snippets must define `function App`; hooks come from `src/journal/liveScope.js`, so snippets have no imports.
- jsdom has no `CSS.escape`, so `tests/trials.test.js` shims it.
- Code style: no semicolons, single quotes, print width 160, and `//` comments that explain *why*.
