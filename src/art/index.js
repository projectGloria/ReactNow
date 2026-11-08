// src/art/index.js — the art manifest.
// ---------------------------------------------------------------------------
// import.meta.glob is resolved by Vite at *build time*: the map below only
// contains files that actually exist. So "is this asset delivered yet?" is a
// plain lookup, with no runtime 404 probing and no onError fallback dance.
// Components ask `art('islands/p0')` and draw their SVG fallback on null.
//
// In dev, Vite watches the glob: drop a new file in, run `npm run art`, and the
// module re-evaluates via HMR. URLs are content-hashed in production builds.
// ---------------------------------------------------------------------------
const files = import.meta.glob('../assets/art/**/*.webp', { eager: true, query: '?url', import: 'default' })

const byKey = Object.fromEntries(
  Object.entries(files).map(([file, url]) => [file.replace('../assets/art/', '').replace(/\.webp$/, ''), url]),
)

/** @param {string} key e.g. 'islands/p0', 'chart/compass-rose' @returns {string|null} */
export const art = (key) => byKey[key] ?? null

// CSS can't call import.meta.glob, so paper textures reach the stylesheet as
// custom properties set once on the app root, plus a class per texture so the
// CSS can switch background layer lists (a var() that resolves to nothing
// would leave background-size lists mis-aligned).
const PAPER = { parchment: 'paper/parchment', page: 'paper/journal-page', foxing: 'paper/foxing' }
export const paperVars = Object.fromEntries(
  Object.entries(PAPER).flatMap(([name, key]) => (art(key) ? [[`--art-${name}`, `url(${art(key)})`]] : [])),
)
export const paperClasses = Object.keys(PAPER)
  .filter((name) => art(PAPER[name]))
  .map((name) => ` has-${name}`)
  .join('')
