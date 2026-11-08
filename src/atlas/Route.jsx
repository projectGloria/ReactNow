// src/atlas/Route.jsx — the inked sea route between territories.
import { memo } from 'react'
import { routeSegment } from './geometry.js'
import { art } from '../art/index.js'

/**
 * `pathLength="1"` normalises every path to length 1, so the CSS draw-on
 * animation (dashoffset 1 -> 0) works without measuring getTotalLength() —
 * the draft needed a DOM read per path; this needs none.
 *
 * `mask` is a string like "1100000000" rather than a boolean[]: a primitive
 * survives memo's shallow comparison, a freshly built array never does.
 */
export const Route = memo(function Route({ mask, phases, worldW }) {
  return (
    <g pointerEvents="none">
      {phases.slice(0, -1).map((p, i) => (
        <path key={`d${i}`} d={routeSegment(p, phases[i + 1], i, worldW)} fill="none" stroke="var(--sepia)" strokeWidth="2.2" strokeDasharray="2 9" strokeLinecap="round" />
      ))}
      {phases.slice(0, -1).map((p, i) =>
        mask[i] === '1' ? (
          <path key={`s${i}`} className="route-inked" pathLength="1" d={routeSegment(p, phases[i + 1], i, worldW)} fill="none" stroke="var(--oxblood)" strokeWidth="3.4" strokeLinecap="round" />
        ) : null,
      )}
    </g>
  )
})

/** "You are here": a little brig moored beside the current frontier. */
const SHIP = art('chart/ship')

export function Ship({ x, y }) {
  if (SHIP) {
    // Engraved frigate, bow right (toward the next waypoint), waterline at y≈18
    // like the SVG one. Same inner-group trick for the bobbing animation.
    const w = 84
    const h = w * (351 / 400) // processed ship.webp is 400x351
    return (
      <g transform={`translate(${x} ${y})`} pointerEvents="none">
        <g className="ship">
          <image href={SHIP} x={-w / 2} y={22 - h} width={w} height={h} />
        </g>
      </g>
    )
  }
  return (
    // CSS animations set `transform`, which would override the SVG transform
    // attribute that positions us, so the bobbing lives on an inner group.
    <g transform={`translate(${x} ${y})`} pointerEvents="none">
      <g className="ship">
      <path d="M-22 6 L22 6 L15 17 L-15 17Z" fill="url(#hatch)" stroke="var(--ink)" strokeWidth="1.3" />
      <path d="M-4 6 V-30 M8 6 V-22" stroke="var(--ink)" strokeWidth="1.4" />
      <path d="M-4 -28 Q-20 -14 -4 2Z" fill="var(--parchment-light)" stroke="var(--ink)" strokeWidth="1.1" />
      <path d="M8 -20 Q20 -8 8 3Z" fill="var(--parchment-light)" stroke="var(--ink)" strokeWidth="1.1" />
      <path d="M-4 -30 L8 -34 L-4 -26Z" fill="var(--oxblood)" />
      <path d="M-30 20 Q-20 24 -10 20 T10 20 T30 20" fill="none" stroke="var(--ink)" strokeWidth="0.9" />
      </g>
    </g>
  )
}
