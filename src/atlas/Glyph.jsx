// src/atlas/Glyph.jsx
// Engraved landmark symbols, drawn in a 100x100 box centred on (0,0).
// Strokes use `vector-effect: non-scaling-stroke` only where we want hairlines
// to stay hairlines while the camera zooms; the rest scale like real ink.
import { memo } from 'react'

const ink = { fill: 'none', stroke: 'var(--ink)', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }
const solid = { fill: 'var(--parchment-light)', stroke: 'var(--ink)', strokeWidth: 1.6, strokeLinejoin: 'round' }
const hatched = { fill: 'url(#hatch)', stroke: 'var(--ink)', strokeWidth: 1.6, strokeLinejoin: 'round' }

const GLYPHS = {
  // Lighthouse on a rock: the Isle of Closures keeps its light (scope) burning.
  isle: (
    <g>
      <path d="M-34 30 Q-20 14 -4 18 Q14 10 34 30Z" style={hatched} />
      <path d="M-9 18 L-6 -26 L6 -26 L9 18Z" style={solid} />
      <path d="M-8 4 H8 M-7 -10 H7" style={ink} />
      <path d="M-9 -26 H9 L6 -34 H-6Z" style={hatched} />
      <path d="M0 -34 V-40" style={ink} />
      <path d="M-14 -30 L-34 -38 M-14 -26 L-34 -24 M14 -30 L34 -38 M14 -26 L34 -24" style={{ ...ink, strokeWidth: 1, strokeDasharray: '3 3' }} />
    </g>
  ),
  // Cliffs with a falling cascade: render flows down the tree.
  falls: (
    <g>
      <path d="M-38 30 L-30 -20 L-14 -30 L-8 -10 L-8 30Z" style={hatched} />
      <path d="M8 30 L8 -12 L18 -32 L36 -18 L40 30Z" style={hatched} />
      <path d="M-7 -14 C-4 0 -6 18 -6 30 M-1 -16 C0 2 -1 18 0 30 M5 -14 C3 0 5 18 5 30" style={{ ...ink, stroke: 'var(--verdigris)' }} />
      <path d="M-16 32 Q-8 26 0 32 T16 32" style={ink} />
    </g>
  ),
  // Reeds over still water.
  marsh: (
    <g>
      <path d="M-36 26 Q-24 22 -12 26 T12 26 T36 26 M-28 34 Q-16 30 -4 34 T20 34" style={ink} />
      {[-22, -12, -2, 8, 18, 26].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 24 Q${x + (i % 2 ? 6 : -6)} 0 ${x + (i % 2 ? 2 : -2)} ${-20 - (i % 3) * 6}`} style={ink} />
          {i % 2 === 0 && <ellipse cx={x + (i % 2 ? 2 : -2)} cy={-22 - (i % 3) * 6} rx="2.5" ry="7" style={hatched} />}
        </g>
      ))}
    </g>
  ),
  citadel: (
    <g>
      <path d="M-34 30 V-6 H-22 V-28 H-16 V-24 H-12 V-28 H-6 V-6 H6 V-28 H12 V-24 H16 V-28 H22 V-6 H34 V30Z" style={solid} />
      <path d="M-5 30 V12 Q0 4 5 12 V30" style={hatched} />
      <path d="M-34 -6 H34" style={ink} />
      <path d="M0 -6 V-38 L12 -34 L0 -30" style={{ ...ink, fill: 'var(--oxblood)' }} />
      <path d="M-28 4 H-20 M20 4 H28 M-28 16 H-20 M20 16 H28" style={ink} />
    </g>
  ),
  harbour: (
    <g>
      <circle cx="0" cy="-26" r="6" style={solid} />
      <path d="M0 -20 V26 M-16 -12 H16" style={{ ...ink, strokeWidth: 2.4 }} />
      <path d="M-28 8 Q-26 28 0 28 Q26 28 28 8" style={{ ...ink, strokeWidth: 2.4 }} />
      <path d="M-28 8 L-34 14 M-28 8 L-22 14 M28 8 L22 14 M28 8 L34 14" style={ink} />
    </g>
  ),
  peaks: (
    <g>
      <path d="M-40 30 L-18 -18 L0 30Z" style={hatched} />
      <path d="M-12 30 L10 -34 L34 30Z" style={solid} />
      <path d="M10 -34 L18 -10 L26 30" style={{ ...ink, strokeWidth: 1 }} />
      <path d="M10 -34 L4 -18 L10 -14 L16 -20Z" style={{ ...solid, fill: '#fff8ea' }} />
      <path d="M14 -6 L22 30 M18 -2 L28 30 M22 4 L32 30" style={{ ...ink, strokeWidth: 0.8 }} />
    </g>
  ),
  // Star fort: types guard every gate.
  fortress: (
    <g>
      <path d="M0 -36 L10 -14 L34 -12 L16 4 L22 28 L0 16 L-22 28 L-16 4 L-34 -12 L-10 -14Z" style={hatched} />
      <path d="M0 -20 L6 -8 L18 -6 L9 2 L12 14 L0 8 L-12 14 L-9 2 L-18 -6 L-6 -8Z" style={solid} />
      <circle r="3" style={{ fill: 'var(--ink)' }} />
    </g>
  ),
  frontier: (
    <g>
      <path d="M-30 30 L-16 4 L-2 30Z M2 30 L16 8 L30 30Z" style={hatched} />
      <path d="M-16 4 V-36" style={{ ...ink, strokeWidth: 2 }} />
      <path d="M-16 -36 Q0 -40 12 -32 Q0 -26 -16 -22Z" style={{ ...ink, fill: 'var(--oxblood)' }} />
      <path d="M-40 34 H40" style={ink} />
    </g>
  ),
  // Target butts on a proving ground.
  grounds: (
    <g>
      <circle r="28" style={solid} />
      <circle r="19" style={hatched} />
      <circle r="10" style={solid} />
      <circle r="3" style={{ fill: 'var(--oxblood)' }} />
      <path d="M22 -30 L-2 -2 M22 -30 L16 -30 M22 -30 L22 -24" style={{ ...ink, strokeWidth: 2 }} />
    </g>
  ),
  summit: (
    <g>
      <path d="M-44 32 L-6 -30 L14 -4 L22 -14 L44 32Z" style={hatched} />
      <path d="M-6 -30 L-14 -10 L-4 -14 L4 -8Z" style={{ ...solid, fill: '#fff8ea' }} />
      <path d="M-6 -30 V-48" style={{ ...ink, strokeWidth: 1.8 }} />
      <path d="M-6 -48 L12 -43 L-6 -38Z" style={{ fill: 'var(--gilt)', stroke: 'var(--ink)', strokeWidth: 1 }} />
    </g>
  ),
}

/** memo: glyphs are static art; skip re-render on every camera/hover update. */
export const Glyph = memo(function Glyph({ type, x, y, scale = 1 }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}>{GLYPHS[type]}</g>
})
