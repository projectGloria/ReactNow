// src/game/WaxSeal.jsx — the reward stamp for a mastered lesson.
// Drawn as an SVG <g> so it can live inside the chart, plus a standalone
// <svg> wrapper for HTML pages (journal, log).
import { art } from '../art/index.js'

function sealBlob(r) {
  // Irregular wax edge: a circle with 18 soft bumps.
  let d = ''
  for (let i = 0; i <= 36; i++) {
    const a = (i / 36) * Math.PI * 2
    const rr = r * (1 + (i % 2 ? 0.06 : -0.02) + Math.sin(i * 1.7) * 0.03)
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)}`
  }
  return d + 'Z'
}

const SEAL = art('game/wax-seal')

export function WaxSealMark({ x = 0, y = 0, r = 18, letter = 'R', fresh = false }) {
  if (SEAL) {
    // Photographed wax: the art's blob is ~1.15r across its bumps, so draw it
    // at 2.3r. The letter is *pressed in*: a dark glyph with a pale copy 1px
    // lower reads as an impression lit from above (a debossed edge highlight).
    const s = r * 2.3
    const fs = r * 0.78
    return (
      <g transform={`translate(${x} ${y})`}>
        <g className={fresh ? 'seal-stamp' : undefined}>
          <image href={SEAL} x={-s / 2} y={-s / 2} width={s} height={s} />
          <text className="seal-letter" y={r * 0.27 + r * 0.04} textAnchor="middle" fontSize={fs} fill="#e9a093" fillOpacity="0.35" style={{ fontFamily: 'var(--font-display)' }}>
            {letter}
          </text>
          <text className="seal-letter" y={r * 0.27} textAnchor="middle" fontSize={fs} fill="#3a0907" fillOpacity="0.8" style={{ fontFamily: 'var(--font-display)' }}>
            {letter}
          </text>
        </g>
      </g>
    )
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <g className={fresh ? 'seal-stamp' : undefined}>
        <path d={sealBlob(r)} fill="url(#seal-wax)" stroke="#4a100c" strokeWidth={r * 0.04} />
        <circle r={r * 0.68} fill="none" stroke="#e8a89c" strokeOpacity="0.5" strokeWidth={r * 0.05} />
        <circle r={r * 0.6} fill="none" stroke="#3e0c09" strokeOpacity="0.5" strokeWidth={r * 0.04} strokeDasharray={`${r * 0.08} ${r * 0.08}`} />
        <text className="seal-letter" y={r * 0.26} textAnchor="middle" fontSize={r * 0.8} fill="#f3c9bf" fillOpacity="0.85" style={{ fontFamily: 'var(--font-display)' }}>
          {letter}
        </text>
      </g>
    </g>
  )
}

/** Standalone seal for HTML contexts; carries its own gradient. */
export function WaxSeal({ size = 44, letter = 'R', fresh = false, title }) {
  return (
    <svg width={size} height={size} viewBox="-24 -24 48 48" role="img" aria-label={title ?? 'Wax seal'} className="wax-seal">
      <defs>
        <radialGradient id="seal-wax" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#b5382e" />
          <stop offset="70%" stopColor="#7d1f1a" />
          <stop offset="100%" stopColor="#5a1410" />
        </radialGradient>
      </defs>
      <WaxSealMark r={20} letter={letter} fresh={fresh} />
    </svg>
  )
}
