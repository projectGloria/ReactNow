// src/atlas/Ornaments.jsx
// Static engraving: <defs>, border, rhumb lines, compass rose, cartouche,
// sea serpent. All memoized; none of it depends on progress except the
// cartouche tally and the compass needle angle.
import { memo } from 'react'
import { art } from '../art/index.js'

export const ChartDefs = memo(function ChartDefs() {
  return (
    <defs>
      {/* Diagonal engraving hatch for shaded land & glyphs */}
      <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
        <rect width="5" height="5" fill="var(--parchment-light)" />
        <line x1="0" y1="0" x2="0" y2="5" stroke="var(--ink)" strokeWidth="0.9" />
      </pattern>
      <pattern id="hatch-faint" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="var(--sepia)" strokeWidth="0.6" opacity="0.5" />
      </pattern>
      {/* Fog over unsurveyed territories */}
      <pattern id="fog" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(-20)">
        <rect width="10" height="10" fill="var(--parchment-dark)" />
        <line x1="0" y1="0" x2="0" y2="10" stroke="var(--sepia-faint)" strokeWidth="0.7" opacity="0.6" />
      </pattern>
      <radialGradient id="land-wash" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#f8f0dc" />
        <stop offset="100%" stopColor="#e8d7ae" />
      </radialGradient>
      <radialGradient id="land-done" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stopColor="#eef0d8" />
        <stop offset="100%" stopColor="#c9d3b0" />
      </radialGradient>
      {/* Backing for raster islands: hides the route under the transparent
          lagoon/ripples, then fades out so its edge never shows as a disc. */}
      <radialGradient id="isle-backing">
        <stop offset="0%" stopColor="#efe3c6" stopOpacity="1" />
        <stop offset="72%" stopColor="#efe3c6" stopOpacity="1" />
        <stop offset="100%" stopColor="#efe3c6" stopOpacity="0" />
      </radialGradient>
      <radialGradient id="seal-wax" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#b5382e" />
        <stop offset="70%" stopColor="#7d1f1a" />
        <stop offset="100%" stopColor="#5a1410" />
      </radialGradient>
    </defs>
  )
})

// Width/height of the processed (trimmed) WebPs. Measured, not guessed: an
// <image> with the wrong box letterboxes its art (preserveAspectRatio meet).
const CARTOUCHE_ASPECT = 1368 / 158
const SERPENT_ASPECT = 1069 / 633

// ---- engraved border (art/raw/chart/frame-corner.png) -----------------------
// The corner art's rules were measured in raw pixels (scripts: probe of the
// untrimmed 1024px tile): heavy 94-102, hairline 108-110, pair 173-177 and
// 182-186, rosette block 94-434. Scale K maps pixel 94 onto the chart inset
// (16), so SVG rules drawn at the same offsets meet the mirrored corners exactly.
// The edges stay SVG because the world stretches to any aspect; a raster edge
// would distort.
const CORNER_PX = 1024
const K = 0.26
const px = (p) => 16 + (p - 94) * K // raw pixel -> world offset from the edge
const RULES = [
  [px(98), 8 * K], // heavy outer
  [px(109), 2 * K], // hairline
  [px(175), 4 * K], // inner pair
  [px(184), 4 * K],
]
const BLOCK = px(434) // rosette block ends here; ticks start after it

function EngravedBorder({ src, worldW: W, worldH: H }) {
  const S = CORNER_PX * K
  const o = 16 - 94 * K // tile origin so pixel 94 lands on the inset
  // Graduated scale in the gap between hairline and inner pair, stopping at the
  // blocks: a thin band boxed by its own hairlines, so the alternating blocks
  // read as a measured scale instead of floating bars.
  const band = [px(126), 4]
  const ticks = []
  const step = 40
  for (let x = BLOCK, i = 0; x + step <= W - BLOCK; x += step, i++)
    if (i % 2)
      ticks.push(
        <rect key={`t${i}`} x={x} y={band[0]} width={step} height={band[1]} />,
        <rect key={`b${i}`} x={x} y={H - band[0] - band[1]} width={step} height={band[1]} />,
      )
  for (let y = BLOCK, i = 0; y + step <= H - BLOCK; y += step, i++)
    if (i % 2)
      ticks.push(
        <rect key={`l${i}`} x={band[0]} y={y} width={band[1]} height={step} />,
        <rect key={`r${i}`} x={W - band[0] - band[1]} y={y} width={band[1]} height={step} />,
      )
  // Mirror one tile into four corners: scale(-1) flips around the tile's own
  // origin, so each corner is translated to its chart corner first.
  const corners = [`translate(0 0)`, `translate(${W} 0) scale(-1 1)`, `translate(0 ${H}) scale(1 -1)`, `translate(${W} ${H}) scale(-1 -1)`]
  return (
    <g pointerEvents="none">
      {RULES.map(([c, w]) => (
        <rect key={c} x={c} y={c} width={W - 2 * c} height={H - 2 * c} fill="none" stroke="var(--ink)" strokeWidth={w} />
      ))}
      <g fill="var(--ink)">{ticks}</g>
      <g fill="none" stroke="var(--ink)" strokeWidth="0.5">
        {[band[0], band[0] + band[1]].map((b) => (
          <g key={b}>
            <path d={`M${BLOCK} ${b} H${W - BLOCK} M${BLOCK} ${H - b} H${W - BLOCK}`} />
            <path d={`M${b} ${BLOCK} V${H - BLOCK} M${W - b} ${BLOCK} V${H - BLOCK}`} />
          </g>
        ))}
      </g>
      {corners.map((t) => (
        <image key={t} href={src} x={o} y={o} width={S} height={S} transform={t} />
      ))}
    </g>
  )
}

/** Double rule with alternating degree ticks, like a graduated chart border. */
export const BorderFrame = memo(function BorderFrame({ worldW, worldH }) {
  const corner = art('chart/frame-corner')
  if (corner) return <EngravedBorder src={corner} worldW={worldW} worldH={worldH} />
  const inset = 16
  const w = worldW - inset * 2
  const h = worldH - inset * 2
  const ticks = []
  const step = 40
  for (let x = 0, i = 0; x < w; x += step, i++)
    ticks.push(
      <rect key={`t${i}`} x={inset + x} y={inset} width={step} height={6} fill={i % 2 ? 'var(--ink)' : 'none'} />,
      <rect key={`b${i}`} x={inset + x} y={inset + h - 6} width={step} height={6} fill={i % 2 ? 'var(--ink)' : 'none'} />,
    )
  for (let y = 0, i = 0; y < h; y += step, i++)
    ticks.push(
      <rect key={`l${i}`} x={inset} y={inset + y} width={6} height={step} fill={i % 2 ? 'none' : 'var(--ink)'} />,
      <rect key={`r${i}`} x={inset + w - 6} y={inset + y} width={6} height={step} fill={i % 2 ? 'none' : 'var(--ink)'} />,
    )
  return (
    <g pointerEvents="none">
      <rect x={inset} y={inset} width={w} height={h} fill="none" stroke="var(--ink)" strokeWidth="1.5" />
      {ticks}
      <rect x={inset + 6} y={inset + 6} width={w - 12} height={h - 12} fill="none" stroke="var(--ink)" strokeWidth="0.8" />
      <rect x={inset + 12} y={inset + 12} width={w - 24} height={h - 24} fill="none" stroke="var(--ink)" strokeWidth="2.2" />
    </g>
  )
})

/** Faint 32-point rhumb lines radiating from the compass, as on portolan charts. */
export const RhumbLines = memo(function RhumbLines({ cx, cy }) {
  const lines = []
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * Math.PI * 2
    lines.push(
      <line
        key={i}
        x1={cx}
        y1={cy}
        x2={cx + Math.cos(a) * 4000}
        y2={cy + Math.sin(a) * 4000}
        stroke={i % 4 === 0 ? 'var(--sepia)' : 'var(--sepia-faint)'}
        strokeWidth={i % 4 === 0 ? 0.6 : 0.35}
        opacity="0.45"
      />,
    )
  }
  return (
    <g pointerEvents="none" clipPath="url(#world-clip)">
      {lines}
    </g>
  )
})

/** Compass rose. `heading` (degrees) swings the fleur-de-lis toward the hovered region. */
export function CompassRose({ cx, cy, r = 78, heading = 0 }) {
  const points = []
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2
    const major = i % 4 === 0
    const mid = i % 2 === 0
    const len = major ? r : mid ? r * 0.68 : r * 0.48
    const half = (Math.PI / 16) * (major ? 1 : 0.8)
    const w = major ? r * 0.15 : r * 0.1
    const tip = [Math.cos(a) * len, Math.sin(a) * len]
    const l = [Math.cos(a - half) * w, Math.sin(a - half) * w]
    const rr = [Math.cos(a + half) * w, Math.sin(a + half) * w]
    // Two half-blades per point: one dark, one light — the classic engraved rose.
    points.push(
      <g key={i}>
        <path d={`M0 0 L${l[0]} ${l[1]} L${tip[0]} ${tip[1]}Z`} fill={major ? 'var(--ink)' : 'var(--sepia)'} />
        <path d={`M0 0 L${rr[0]} ${rr[1]} L${tip[0]} ${tip[1]}Z`} fill="var(--parchment-light)" stroke="var(--ink)" strokeWidth="0.7" />
      </g>,
    )
  }
  const labels = ['N', 'E', 'S', 'W']
  const src = art('chart/compass-rose')
  // The engraved rose has its own rings, so it gets more room and the
  // cardinal letters move outward to clear it.
  const size = r * 2.3
  const labelR = src ? r * 1.42 : r * 1.3
  return (
    <g transform={`translate(${cx} ${cy})`} pointerEvents="none">
      {!src && <circle r={r * 1.12} fill="none" stroke="var(--ink)" strokeWidth="1" />}
      {!src && <circle r={r * 1.04} fill="none" stroke="var(--ink)" strokeWidth="0.5" strokeDasharray="2 3" />}
      <g className="compass-needle" style={{ transform: `rotate(${heading}deg)` }}>
        {/* The whole engraved rose rotates (its fleur-de-lis is the needle).
            Trimmed square art, so its centre is the rotation centre. */}
        {src ? (
          <image href={src} x={-size / 2} y={-size / 2} width={size} height={size} />
        ) : (
          <>
            {points.slice().reverse()}
            <circle r={r * 0.08} fill="var(--gilt)" stroke="var(--ink)" strokeWidth="1" />
          </>
        )}
      </g>
      {labels.map((t, i) => {
        const a = (i / 4) * Math.PI * 2 - Math.PI / 2
        return (
          <text key={t} x={Math.cos(a) * labelR} y={Math.sin(a) * labelR + 7} textAnchor="middle" className="chart-sc" fontSize="20">
            {t}
          </text>
        )
      })}
    </g>
  )
}

/** Ornate title cartouche: scrolls, double frame, gilt rule, survey tally. */
export function Cartouche({ x, y, sealed, total, rank }) {
  const src = art('chart/cartouche')
  if (src) {
    // Engraved banner: ~8.7:1 after trim. 960 wide keeps it ≤ ~110 tall, the
    // free band above the top row of islands (their ripples start ~y 150).
    const w = 960
    const h = w / CARTOUCHE_ASPECT
    return (
      <g transform={`translate(${x - w / 2} ${y - h / 2 + 4})`}>
        {/* The scroll's interior is keyed to transparent; back it so rhumb
            lines don't run through the title. */}
        <rect x={w * 0.07} y={h * 0.12} width={w * 0.86} height={h * 0.76} fill="var(--parchment-light)" />
        <image href={src} width={w} height={h} />
        <text x={w / 2} y={h * 0.42} textAnchor="middle" className="chart-display" fontSize="30">
          Chart of the Reactive Territories
        </text>
        <line x1={w / 2 - 170} x2={w / 2 + 170} y1={h * 0.52} y2={h * 0.52} stroke="var(--gilt)" strokeWidth="1.5" />
        <text x={w / 2} y={h * 0.67} textAnchor="middle" className="chart-italic" fontSize="15">
          being a Route from the Isle of Closures to the Summit of the Capstone,
        </text>
        <text x={w / 2} y={h * 0.83} textAnchor="middle" className="chart-italic" fontSize="14" fill="var(--sepia)">
          surveyed by {rank} N. · {sealed} of {total} waypoints sealed
        </text>
      </g>
    )
  }
  const w = 600
  const h = 104
  return (
    <g transform={`translate(${x - w / 2} ${y - h / 2})`}>
      {/* scroll curls */}
      <path d={`M-18 18 Q-34 ${h / 2} -18 ${h - 18} Q-6 ${h - 4} 8 ${h - 14}`} fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      <path d={`M${w + 18} 18 Q${w + 34} ${h / 2} ${w + 18} ${h - 18} Q${w + 6} ${h - 4} ${w - 8} ${h - 14}`} fill="none" stroke="var(--ink)" strokeWidth="1.6" />
      <circle cx="-18" cy="18" r="6" fill="url(#hatch)" stroke="var(--ink)" />
      <circle cx={w + 18} cy="18" r="6" fill="url(#hatch)" stroke="var(--ink)" />
      <rect width={w} height={h} fill="var(--parchment-light)" stroke="var(--ink)" strokeWidth="2" />
      <rect x="6" y="6" width={w - 12} height={h - 12} fill="none" stroke="var(--ink)" strokeWidth="0.7" />
      <text x={w / 2} y="42" textAnchor="middle" className="chart-display" fontSize="32">
        Chart of the Reactive Territories
      </text>
      <line x1={w / 2 - 170} x2={w / 2 + 170} y1="53" y2="53" stroke="var(--gilt)" strokeWidth="1.5" />
      <text x={w / 2} y="72" textAnchor="middle" className="chart-italic" fontSize="16">
        being a Route from the Isle of Closures to the Summit of the Capstone,
      </text>
      <text x={w / 2} y="91" textAnchor="middle" className="chart-italic" fontSize="15" fill="var(--sepia)">
        surveyed by {rank} N. · {sealed} of {total} waypoints sealed
      </text>
    </g>
  )
}

/** A sea serpent, because no Victorian chart is complete without one. */
export const Serpent = memo(function Serpent({ x, y }) {
  const src = art('chart/sea-serpent')
  if (src) {
    // ~1.7:1 after trim; sits on the caption like the SVG one did (waterline ≈ y 12).
    const w = 210
    const h = w / SERPENT_ASPECT
    return (
      <g transform={`translate(${x} ${y})`} pointerEvents="none">
        <g className="serpent">
          <image href={src} x={-w / 2} y={18 - h} width={w} height={h} />
          <text x="0" y="40" textAnchor="middle" className="chart-italic" fontSize="15" fill="var(--sepia)">
            Here be needless re-renders
          </text>
        </g>
      </g>
    )
  }
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <g className="serpent">
      <path d="M-70 10 Q-60 -18 -46 6" fill="url(#hatch)" stroke="var(--ink)" strokeWidth="1.4" />
      <path d="M-28 10 Q-16 -26 -2 6" fill="url(#hatch)" stroke="var(--ink)" strokeWidth="1.4" />
      <path d="M14 10 Q22 -14 34 6" fill="url(#hatch)" stroke="var(--ink)" strokeWidth="1.4" />
      <path d="M48 8 Q50 -30 70 -32 Q84 -32 82 -22 Q74 -22 66 -18 Q60 -10 62 8" fill="var(--parchment-light)" stroke="var(--ink)" strokeWidth="1.4" />
      <circle cx="72" cy="-27" r="1.6" fill="var(--ink)" />
      <path d="M82 -24 L92 -26 M82 -23 L90 -18" stroke="var(--oxblood)" strokeWidth="1.2" />
      <path d="M-84 12 Q-70 18 -56 12 T-28 12 T0 12 T28 12 T56 12 T80 12" fill="none" stroke="var(--ink)" strokeWidth="0.9" />
      <text x="0" y="40" textAnchor="middle" className="chart-italic" fontSize="15" fill="var(--sepia)">
        Here be needless re-renders
      </text>
      </g>
    </g>
  )
})
