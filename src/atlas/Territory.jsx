// src/atlas/Territory.jsx — one island on the chart.
import { memo } from 'react'
import { Glyph } from './Glyph.jsx'
import { islandPath, wrap } from './geometry.js'
import { art } from '../art/index.js'

function Incognita({ cx, cy }) {
  return (
    <text x={cx} y={cy + 6} textAnchor="middle" className="chart-italic incognita" fontSize="19" fill="var(--sepia)">
      Terra Incognita
    </text>
  )
}

const FILL = { done: 'url(#land-done)', current: 'url(#land-wash)', locked: 'url(#fog)' }

/**
 * memo + primitive props: hovering island A re-renders only A and the
 * previously hovered island, not all ten. That only works because the parent
 * passes stable callbacks and primitives (no inline objects).
 */
export const Territory = memo(function Territory({ phase, status, sealed, total, hovered, dimmed, onHover, onSelect }) {
  const [cx, cy] = phase.center
  const r = phase.radius
  const coast = islandPath(phase.center, r, phase.seed)
  // Island -> name -> annotation, stacked downward: a compact block that lets
  // staggered rows nest without titles colliding with the row above.
  const labelY = cy + r * 1.18 + 22
  const notes = wrap(phase.why, 38)
  const locked = status === 'locked'
  // Raster engraving if delivered, else the hand-coded SVG island below.
  // The art is drawn in a 1:1 frame whose land spans ~72% of the width, so
  // 3.6r makes the land ~2.6r, ripples ~3.3r: the same footprint as the SVG
  // coast + its water-lines (2.84r), since the engraving is flatter than round.
  const src = art(`islands/${phase.id}`)
  const size = r * 3.6

  const select = () => onSelect(phase.id)
  return (
    <g
      className={`territory is-${status}${hovered ? ' is-hovered' : ''}${dimmed ? ' is-dimmed' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${phase.num} ${phase.landmark}: ${phase.title}. ${status === 'locked' ? 'Unsurveyed.' : `${sealed} of ${total} waypoints sealed.`}`}
      onMouseEnter={() => onHover(phase.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(phase.id)}
      onBlur={() => onHover(null)}
      onClick={select}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), select())}
    >
      {src ? (
        <g className="territory-lift has-art">
          {/* The engraving carries its own coastline ripples, so no SVG water-lines.
              pointer-events off: the image's hit box is its whole square, which
              would steal hovers from the label; the ellipse below is the target. */}
          {/* Ink box of the art is ~93% x 68% of its frame. */}
          <ellipse cx={cx} cy={cy} rx={size * 0.45} ry={size * 0.33} fill="url(#isle-backing)" pointerEvents="none" />
          <image href={src} x={cx - size / 2} y={cy - size / 2} width={size} height={size} className="island-art" pointerEvents="none" />
          <ellipse cx={cx} cy={cy} rx={r * 1.35} ry={r * 1.05} className="island-hit" />
          {locked && <Incognita cx={cx} cy={cy} />}
        </g>
      ) : (
        <>
          {/* Fallback until the engraving is delivered. Engraved water-lines:
              progressively fainter offset coastlines. */}
          {[1.14, 1.27, 1.42].map((s, i) => (
            <path key={s} d={islandPath(phase.center, r, phase.seed, s)} fill="none" stroke="var(--sepia)" strokeWidth={0.8 - i * 0.2} opacity={0.75 - i * 0.22} />
          ))}
          <g className="territory-lift">
            <path d={coast} fill={FILL[status]} stroke="var(--ink)" strokeWidth="2" />
            {/* contour line inside the coast */}
            <path d={islandPath(phase.center, r, phase.seed, 0.82)} fill="none" stroke="var(--sepia)" strokeWidth="0.8" strokeDasharray="1 4" strokeLinecap="round" />
            {locked ? <Incognita cx={cx} cy={cy} /> : <Glyph type={phase.glyph} x={cx} y={cy - 4} scale={0.95} />}
          </g>
        </>
      )}

      {/* Name label with numbered roundel */}
      <g transform={`translate(${cx} ${labelY})`}>
        <circle cx={-phase.landmark.length * 5.6 - 22} cy={-6} r={15} fill={status === 'done' ? 'var(--verdigris)' : locked ? 'var(--parchment-dark)' : 'var(--oxblood)'} stroke="var(--ink)" />
        <text x={-phase.landmark.length * 5.6 - 22} y={-1} textAnchor="middle" className="chart-sc roundel-text" fontSize="13">
          {phase.num}
        </text>
        <text x={0} y={0} textAnchor="middle" className="chart-sc territory-name" fontSize="22">
          {phase.landmark}
        </text>
      </g>

      {/* The cartographer's annotation: the WHY, always visible */}
      <text x={cx} y={labelY + 26} textAnchor="middle" className="chart-italic annotation" fontSize="17">
        {notes.map((line, i) => (
          <tspan key={i} x={cx} dy={i === 0 ? 0 : 20}>
            {line}
          </tspan>
        ))}
        <tspan x={cx} dy={22} className="chart-sc tally" fontSize="13">
          {locked ? 'unsurveyed' : status === 'done' ? `charted · ${sealed}/${total} sealed` : `${phase.title} · ${sealed}/${total} sealed`}
        </tspan>
      </text>
    </g>
  )
})
