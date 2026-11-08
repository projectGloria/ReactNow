// src/atlas/Atlas.jsx — the whole chart, plus the camera.
import { useCallback, useRef, useState } from 'react'
import { PHASES } from '../content/index.js'
import { useExpedition } from '../store/ExpeditionProvider.jsx'
import { computeXp, isMastered, phaseStatus, rankFor } from '../store/derive.js'
import { navigate } from '../router/useHashRoute.js'
import { useCamera } from './useCamera.js'
import { wrap } from './geometry.js'
import { regionBox, useChartSpace } from './chartSpace.js'
import { Territory } from './Territory.jsx'
import { Route, Ship } from './Route.jsx'
import { BorderFrame, Cartouche, ChartDefs, CompassRose, RhumbLines, Serpent } from './Ornaments.jsx'
import { RegionPlate } from '../region/RegionPlate.jsx'

// Ornament anchors in the 1920x1080 *design* space; projected onto the live world.
const COMPASS = [250, 870]
const LEGEND = [80, 500]
const SERPENT = [1745, 575]

export function Atlas({ route }) {
  const { progress } = useExpedition()
  // ---- live world, shaped like the container --------------------------------
  const svgRef = useRef(null)
  const space = useChartSpace(svgRef)
  const focus = route.phaseId ? space.byId[route.phaseId] ?? null : null

  // ---- camera ---------------------------------------------------------------
  const target = focus ? regionBox(focus, space) : space.worldBox
  // The key includes the world size: a resize is a new destination, so the
  // camera re-targets instead of keeping a box computed for the old shape.
  const cameraKey = `${focus?.id ?? 'world'}@${space.w}x${space.h}`
  const settledKey = useCamera(svgRef, target, cameraKey)
  // Read once: React must never overwrite the attribute the camera animates.
  const [initialViewBox] = useState(() => `${target.x} ${target.y} ${target.w} ${target.h}`)

  // ---- hover ----------------------------------------------------------------
  const [hovered, setHovered] = useState(null)
  // Stable callbacks so memoized <Territory>s don't re-render on every hover.
  // Clicking an island opens its brief first; the plate zooms in underneath.
  const onSelect = useCallback((id) => navigate(`/${id}/brief`), [])
  const onHover = setHovered // setState functions are already stable

  // ---- derived from progress (never stored) -----------------------------------
  const statuses = PHASES.map((_, i) => phaseStatus(progress, i))
  const mask = statuses.map((s) => (s === 'done' ? '1' : '0')).join('')
  const sealedBy = PHASES.map((p) => p.lessons.filter((l) => isMastered(progress.lessons[`${p.id}/${l.id}`])).length)
  const totalSealed = sealedBy.reduce((a, b) => a + b, 0)
  const totalLessons = PHASES.reduce((a, p) => a + p.lessons.length, 0)
  const rank = rankFor(computeXp(progress)).title
  const frontier = space.phases[statuses.indexOf('current')] ?? space.phases.at(-1)
  const [compassX, compassY] = space.project(COMPASS)

  const hoverPhase = hovered ? space.byId[hovered] : null
  const heading = hoverPhase
    ? (Math.atan2(hoverPhase.center[1] - compassY, hoverPhase.center[0] - compassX) * 180) / Math.PI + 90
    : 0

  return (
    <svg
      ref={svgRef}
      className={`chart${focus ? ' is-zoomed' : ''}`}
      viewBox={initialViewBox}
      preserveAspectRatio="xMidYMid slice"
      role="application"
      aria-label="Chart of the Reactive Territories"
    >
      <ChartDefs />
      <clipPath id="world-clip">
        <rect x="16" y="16" width={space.w - 32} height={space.h - 32} />
      </clipPath>
      <rect width={space.w} height={space.h} className="chart-sea" />
      <RhumbLines cx={compassX} cy={compassY} />
      <Route mask={mask} phases={space.phases} worldW={space.w} />

      {space.phases.map((p, i) => (
        <Territory
          key={p.id}
          phase={p}
          status={statuses[i]}
          sealed={sealedBy[i]}
          total={p.lessons.length}
          hovered={hovered === p.id}
          dimmed={Boolean(focus) && focus.id !== p.id}
          onHover={onHover}
          onSelect={onSelect}
        />
      ))}

      {/* 1.75r: clear of the engraved islands' ripples (they reach ~1.65r) */}
      <Ship x={frontier.center[0] - frontier.radius * 1.75} y={frontier.center[1] + 18} />
      <CompassRose cx={compassX} cy={compassY} heading={heading} />
      <Cartouche x={space.w / 2} y={86} sealed={totalSealed} total={totalLessons} rank={rank} />
      <Legend x={space.project(LEGEND)[0]} y={space.project(LEGEND)[1]} />
      <Serpent x={space.project(SERPENT)[0]} y={space.project(SERPENT)[1]} />
      <BorderFrame worldW={space.w} worldH={space.h} />

      {/* Hover card: the HOW of a territory, drawn last so nothing covers it */}
      {hoverPhase && !focus && <HowCard phase={hoverPhase} space={space} locked={statuses[hoverPhase.index] === 'locked'} />}

      {focus && (
        <RegionPlate
          key={focus.id}
          phase={focus}
          space={space}
          visible={settledKey === cameraKey}
          locked={statuses[focus.index] === 'locked'}
          lessonsProgress={progress.lessons}
          gatePassed={statuses[focus.index] === 'done'}
          gateOpen={statuses[focus.index] !== 'locked'}
        />
      )}
    </svg>
  )
}

function Legend({ x, y }) {
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" className="legend">
      <rect width="230" height="96" fill="var(--parchment-light)" stroke="var(--ink)" strokeWidth="1.2" />
      <text x="115" y="20" textAnchor="middle" className="chart-sc" fontSize="13" letterSpacing="2">
        REFERENCES
      </text>
      <path d="M16 38 H56" stroke="var(--oxblood)" strokeWidth="3.4" />
      <text x="66" y="43" className="chart-italic" fontSize="15">route charted</text>
      <path d="M16 58 H56" stroke="var(--sepia)" strokeWidth="2.2" strokeDasharray="2 9" strokeLinecap="round" />
      <text x="66" y="63" className="chart-italic" fontSize="15">route ahead</text>
      <rect x="22" y="72" width="28" height="16" fill="url(#fog)" stroke="var(--ink)" />
      <text x="66" y="85" className="chart-italic" fontSize="15">unsurveyed waters</text>
    </g>
  )
}

function HowCard({ phase, space, locked }) {
  const [cx, cy] = phase.center
  const lines = wrap(`${phase.how}`, 40)
  const w = 330
  const h = 50 + lines.length * 19
  // Flip to the left side for islands near the right edge.
  const x = cx + phase.radius * 1.35 + w > space.w - 30 ? cx - phase.radius * 1.35 - w : cx + phase.radius * 1.35
  const y = Math.min(cy - h / 2, space.h - h - 40)
  return (
    <g transform={`translate(${x} ${y})`} pointerEvents="none" className="how-card">
      <rect width={w} height={h} fill="var(--parchment-light)" stroke="var(--ink)" strokeWidth="1.4" />
      <rect x="4" y="4" width={w - 8} height={h - 8} fill="none" stroke="var(--ink)" strokeWidth="0.5" />
      <text x="16" y="26" className="chart-sc" fontSize="13" letterSpacing="2" fill="var(--oxblood)">
        {locked ? 'BEYOND THE CUSTOMS HOUSE' : 'HOW IT WORKS'}
      </text>
      <text x="16" y="48" className="chart-italic" fontSize="16">
        {lines.map((l, i) => (
          <tspan key={i} x="16" dy={i ? 19 : 0}>
            {l}
          </tspan>
        ))}
      </text>
    </g>
  )
}
