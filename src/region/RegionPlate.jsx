// src/region/RegionPlate.jsx
// ---------------------------------------------------------------------------
// The detailed survey of one territory, drawn *inside* the chart's SVG at the
// region's real coordinates. The camera flies in, then this plate fades up, so
// it reads as "the map revealing more detail as you zoom" (semantic zoom).
//
// Local coordinate system: W x H, scaled into the region box.
// ---------------------------------------------------------------------------
import { memo, useMemo, useState } from 'react'
import { ancestors, layoutLessons, wrap } from '../atlas/geometry.js'
import { PLATE_H, regionBox } from '../atlas/chartSpace.js'
import { navigate } from '../router/useHashRoute.js'
import { isMastered, isReviewDue } from '../store/derive.js'
import { WaxSealMark } from '../game/WaxSeal.jsx'
import { art } from '../art/index.js'

// Module-level: the manifest is fixed at build time, so look these up once.
const CAIRN = art('plates/waypoint')
const CUSTOMS = art('plates/customs-house')

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X']

function lessonState(l, rec) {
  if (!l.charted) return 'uncharted'
  if (isReviewDue(rec)) return 'review' // sealed, but the seal is fading
  if (isMastered(rec)) return 'sealed'
  if (rec?.edited || rec?.trialAttempts || rec?.noted) return 'begun'
  return 'fresh'
}

export const RegionPlate = memo(function RegionPlate({ phase, space, visible, locked, lessonsProgress, gatePassed, gateOpen }) {
  const [hovered, setHovered] = useState(null)
  // Layout only depends on the lesson list: memoize so hover doesn't recompute it.
  const W = space.plateW // plate width follows the screen's aspect; height is fixed
  const H = PLATE_H
  const pos = useMemo(() => layoutLessons(phase.lessons, W), [phase.lessons, W])
  // Derived on every hover — a Set of ids to light up. Cheap; no state needed.
  const lit = hovered ? new Set([hovered, ...ancestors(phase.lessons, hovered)]) : null
  const focus = phase.lessons.find((l) => l.id === hovered)

  const box = regionBox(phase, space)
  const scale = box.h / H
  const go = (lessonId) => !locked && navigate(`/${phase.id}/${lessonId}`)
  const paper = art('paper/parchment')
  const survey = art(`plates/${phase.id}`)
  const sealedCount = phase.lessons.filter((l) => isMastered(lessonsProgress[`${phase.id}/${l.id}`])).length

  return (
    <g
      className={`region-plate${visible ? ' is-visible' : ''}${survey ? ' has-survey' : ''}`}
      transform={`translate(${box.x} ${box.y}) scale(${scale})`}
      aria-hidden={!visible}
    >
      {/* plate paper + survey engraving + double frame. `slice` = cover: the
          art is ~2.33:1, the plate follows the screen, so edges may crop. */}
      {paper ? (
        <>
          <image href={paper} width={W} height={H} preserveAspectRatio="xMidYMid slice" />
          <rect width={W} height={H} className="plate-paper-wash" />
        </>
      ) : (
        <rect width={W} height={H} className="plate-paper" />
      )}
      {survey && <image href={survey} width={W} height={H} preserveAspectRatio="xMidYMid slice" className="plate-survey" />}
      <rect x="10" y="10" width={W - 20} height={H - 20} fill="none" stroke="var(--ink)" strokeWidth="2.5" />
      <rect x="18" y="18" width={W - 36} height={H - 36} fill="none" stroke="var(--ink)" strokeWidth="0.8" />

      {/* header */}
      <text x={W / 2} y="56" textAnchor="middle" className="chart-sc" fontSize="14" letterSpacing="1.5" fill="var(--sepia)">
        PLATE {ROMAN[phase.index] ?? phase.index + 1} · {phase.num} · A SURVEY OF THE {phase.title.toUpperCase()}
      </text>
      <text x={W / 2} y="94" textAnchor="middle" className="chart-display" fontSize="38">
        {phase.landmark}
      </text>
      <text x={W / 2} y="126" textAnchor="middle" className="chart-italic" fontSize="20">
        {wrap(phase.why, 84).map((line, i) => (
          <tspan key={i} x={W / 2} dy={i ? 23 : 0}>
            {line}
          </tspan>
        ))}
      </text>

      {/* back to atlas */}
      <g className="plate-button" role="button" tabIndex={visible ? 0 : -1} onClick={() => navigate('/')} onKeyDown={(e) => e.key === 'Enter' && navigate('/')} transform="translate(40 40)">
        <rect width="128" height="36" rx="3" />
        <text x="64" y="24" textAnchor="middle" className="chart-sc" fontSize="15">
          ↩ The Atlas
        </text>
      </g>
      {/* reopen the Surveyor's Brief (what this territory teaches, and why) */}
      <g className="plate-button" role="button" tabIndex={visible ? 0 : -1} onClick={() => navigate(`/${phase.id}/brief`)} onKeyDown={(e) => e.key === 'Enter' && navigate(`/${phase.id}/brief`)} transform="translate(180 40)">
        <rect width="128" height="36" rx="3" />
        <text x="64" y="24" textAnchor="middle" className="chart-sc" fontSize="15">
          § The Brief
        </text>
      </g>
      <text x={W - 40} y="62" textAnchor="end" className="chart-sc" fontSize="14" fill="var(--sepia)">
        {sealedCount}/{phase.lessons.length} sealed
      </text>

      {/* prerequisite trails */}
      <g>
        {phase.lessons.flatMap((l) =>
          l.prereqs
            .filter((p) => pos[p])
            .map((p) => {
              const [x1, y1] = pos[p]
              const [x2, y2] = pos[l.id]
              const on = lit?.has(l.id) && lit.has(p)
              const dx = (x2 - x1) / 2
              return (
                <path
                  key={`${p}-${l.id}`}
                  d={`M${x1 + 26} ${y1} C${x1 + dx} ${y1},${x2 - dx} ${y2},${x2 - 26} ${y2}`}
                  className={`trail${on ? ' is-lit' : ''}${lit && !on ? ' is-dim' : ''}`}
                />
              )
            }),
        )}
      </g>

      {/* waypoints */}
      {phase.lessons.map((l, i) => {
        const [x, y] = pos[l.id]
        const rec = lessonsProgress[`${phase.id}/${l.id}`]
        const st = lessonState(l, rec)
        const dim = lit && !lit.has(l.id)
        return (
          <g
            key={l.id}
            className={`waypoint is-${st}${dim ? ' is-dim' : ''}${locked ? ' is-locked' : ''}`}
            transform={`translate(${x} ${y})`}
            role="button"
            tabIndex={visible && !locked ? 0 : -1}
            aria-label={`Lesson ${i + 1}: ${l.title}.${st === 'review' ? ' Review due.' : ''} ${l.why}`}
            onMouseEnter={() => setHovered(l.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(l.id)}
            onBlur={() => setHovered(null)}
            onClick={() => go(l.id)}
            onKeyDown={(e) => e.key === 'Enter' && go(l.id)}
          >
            <circle r="34" className="waypoint-hit" />
            {st === 'sealed' || st === 'review' ? (
              <>
                <WaxSealMark r={24} letter={String(i + 1)} />
                {st === 'review' && <circle r="31" className="review-ring" />}
              </>
            ) : CAIRN ? (
              // Engraved cairn with a numbered benchmark tag; the ring/core
              // classes stay on the tag so hover and state styles still apply.
              <g>
                <image href={CAIRN} x="-36" y="-46" width="72" height="72" className="waypoint-art" />
                <circle cx="24" cy="16" r="12" className="waypoint-ring" />
                <text x="24" y="21" textAnchor="middle" className="chart-sc" fontSize="14">
                  {st === 'uncharted' ? '?' : i + 1}
                </text>
              </g>
            ) : (
              <g>
                <circle r="22" className="waypoint-ring" />
                <circle r="16" className="waypoint-core" />
                {/* surveyor's benchmark cross-hairs */}
                <path d="M-28 0 H-18 M18 0 H28 M0 -28 V-18 M0 18 V28" className="waypoint-cross" />
                <text y="6" textAnchor="middle" className="chart-sc" fontSize="16">
                  {st === 'uncharted' ? '?' : i + 1}
                </text>
              </g>
            )}
            <text y="54" textAnchor="middle" className="chart-sc waypoint-title" fontSize="17">
              {wrap(l.title, 20).map((line, k) => (
                <tspan key={k} x="0" dy={k ? 19 : 0}>
                  {line}
                </tspan>
              ))}
            </text>
          </g>
        )
      })}

      {/* customs house = checkpoint gate */}
      <g
        className={`customs${gatePassed ? ' is-cleared' : ''}${gateOpen ? '' : ' is-closed'}`}
        role="button"
        tabIndex={visible && gateOpen ? 0 : -1}
        aria-label={gatePassed ? 'Checkpoint cleared' : 'Open the checkpoint gate'}
        transform={`translate(${W - 92} ${H - 120})`}
        onClick={() => gateOpen && navigate(`/${phase.id}/gate`)}
        onKeyDown={(e) => e.key === 'Enter' && gateOpen && navigate(`/${phase.id}/gate`)}
      >
        {CUSTOMS ? (
          // bottom of the drawing sits at y=34, just above the label
          <image href={CUSTOMS} x="-56" y="-78" width="112" height="112" className="customs-art" />
        ) : (
          <>
            <path d="M-40 30 V-6 L0 -34 L40 -6 V30Z" fill="url(#hatch)" stroke="var(--ink)" strokeWidth="2" />
            <rect x="-12" y="4" width="24" height="26" fill="var(--parchment-light)" stroke="var(--ink)" />
          </>
        )}
        <text y="54" textAnchor="middle" className="chart-sc" fontSize="15">
          Customs House
        </text>
        <text y="72" textAnchor="middle" className="chart-italic" fontSize="14" fill="var(--sepia)">
          {gatePassed ? 'cleared ✓' : gateOpen ? 'the checkpoint' : 'closed'}
        </text>
        {gatePassed && <WaxSealMark x={30} y={-26} r={16} letter="✓" />}
      </g>

      {/* annotation strip: hovered lesson's WHY, else the phase's HOW */}
      <g transform={`translate(60 ${H - 92})`}>
        <line x1="0" x2={W - 260} y1="-14" y2="-14" stroke="var(--sepia)" strokeWidth="0.8" />
        <text className="chart-sc" fontSize="13" fill="var(--sepia)" letterSpacing="2">
          {locked ? 'UNSURVEYED' : focus ? `WAYPOINT · ${focus.title.toUpperCase()}` : 'HOW THIS TERRITORY WORKS'}
        </text>
        <text y="25" className="chart-italic" fontSize="20">
          {wrap(locked ? 'Clear the previous Customs House to survey this territory. You may study the waypoints, but not set foot on them yet.' : focus ? focus.why : phase.how, 86).map((line, k) => (
            <tspan key={k} x="0" dy={k ? 23 : 0}>
              {line}
            </tspan>
          ))}
        </text>
      </g>

      {locked && <rect width={W} height={H} className="plate-fog" pointerEvents="none" />}
    </g>
  )
})
