// src/atlas/geometry.js
// Pure geometry helpers for the chart. No React here: these are deterministic
// functions of (seed, centre, radius), so islands look identical every render
// and can be memoized safely at module level.

/** Tiny seeded PRNG (mulberry32): same seed -> same coastline, every reload. */
export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Closed Catmull-Rom spline through points, emitted as cubic Béziers. */
function smoothClosed(pts) {
  const n = pts.length
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C${c1[0].toFixed(1)} ${c1[1].toFixed(1)},${c2[0].toFixed(1)} ${c2[1].toFixed(1)},${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`
  }
  return d + 'Z'
}

/**
 * Irregular coastline: radius wobbles with two layered "noise" frequencies so
 * the island has bays and headlands instead of looking like a potato.
 */
export function islandPoints([cx, cy], r, seed, scale = 1) {
  const rand = rng(seed)
  const n = 22
  const phaseA = rand() * Math.PI * 2
  const phaseB = rand() * Math.PI * 2
  const pts = []
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const wobble =
      1 + 0.16 * Math.sin(a * 3 + phaseA) + 0.08 * Math.sin(a * 7 + phaseB) + (rand() - 0.5) * 0.12
    const rr = r * wobble * scale
    // islands are a little wider than tall, like most charted coasts
    pts.push([cx + Math.cos(a) * rr * 1.18, cy + Math.sin(a) * rr * 0.92])
  }
  return pts
}

export const islandPath = (center, r, seed, scale = 1) => smoothClosed(islandPoints(center, r, seed, scale))

/** Greedy word-wrap for SVG <text> (SVG has no automatic line wrapping). */
export function wrap(text, maxChars) {
  const words = text.split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) {
      lines.push(line)
      line = w
    } else line = (line + ' ' + w).trim()
  }
  if (line) lines.push(line)
  return lines
}

/** Sea route between consecutive territories; bends outward at row changes. */
export function routeSegment(a, b, i, worldW) {
  const [ax, ay] = a.center
  const [bx, by] = b.center
  const rowChange = Math.abs(by - ay) > 150
  if (rowChange) {
    const side = ax > worldW / 2 ? 1 : -1 // right edge bends right, left edge bends left
    const bulge = 170 * side
    return `M${ax} ${ay} C${ax + bulge} ${ay + 40},${bx + bulge} ${by - 60},${bx} ${by}`
  }
  const d = (bx - ax) / 3
  const lift = (i % 2 ? 1 : -1) * 45 // gentle alternating swell
  return `M${ax} ${ay} C${ax + d} ${ay + lift},${bx - d} ${by + lift},${bx} ${by}`
}

/**
 * Lay lessons out in columns by prerequisite depth (longest path from a root).
 * Deterministic and data-driven: add a lesson with prereqs and it finds its
 * own column. Returns { [lessonId]: [x, y] } in plate-local units.
 */
export function layoutLessons(lessons, plateW) {
  const byId = Object.fromEntries(lessons.map((l) => [l.id, l]))
  const depth = {}
  const visit = (id) => {
    if (depth[id] !== undefined) return depth[id]
    const pre = (byId[id]?.prereqs ?? []).filter((p) => byId[p])
    depth[id] = pre.length ? 1 + Math.max(...pre.map(visit)) : 0
    return depth[id]
  }
  lessons.forEach((l) => visit(l.id))
  const cols = Math.max(...Object.values(depth)) + 1
  const columns = Array.from({ length: cols }, () => [])
  lessons.forEach((l) => columns[depth[l.id]].push(l.id))

  // Spread across the plate's real width, but cap the gap between columns so
  // an ultrawide screen doesn't fling waypoints to opposite edges.
  const span = Math.min(plateW - 330, (cols - 1) * 260)
  const left = (plateW - 90 - span) / 2
  const right = left + span // leave room for the Customs House bottom-right
  const top = 200
  const bottom = 425
  const pos = {}
  columns.forEach((ids, c) => {
    const x = cols === 1 ? plateW / 2 : left + ((right - left) * c) / (cols - 1)
    ids.forEach((id, r) => {
      const y = ids.length === 1 ? (top + bottom) / 2 : top + ((bottom - top) * r) / (ids.length - 1)
      // stagger alternate columns a touch so trails don't overlap labels
      pos[id] = [x, y + (c % 2 ? 18 : -18) * (ids.length > 1 ? 1 : 0)]
    })
  })
  return pos
}

/** All transitive prerequisites of a lesson (for hover-ancestry highlighting). */
export function ancestors(lessons, id, acc = new Set()) {
  const l = lessons.find((x) => x.id === id)
  for (const p of l?.prereqs ?? []) {
    if (!acc.has(p)) {
      acc.add(p)
      ancestors(lessons, p, acc)
    }
  }
  return acc
}
