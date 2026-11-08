// src/atlas/chartSpace.js
// ---------------------------------------------------------------------------
// The chart has no fixed aspect ratio. A fixed ratio + preserveAspectRatio
// "meet" always letterboxes on screens of a different shape (a 1920px-wide
// browser minus chrome and header is ~2.3:1, not 16:9).
//
// Instead: content is *designed* in a 1920x1080 base space, and the live world
// is stretched to match the container. Positions are scaled; shapes are not:
// islands stay round, they just sit further apart on wider screens.
// ---------------------------------------------------------------------------
import { useLayoutEffect, useMemo, useState } from 'react'
import { PHASES, WORLD as BASE } from '../content/index.js'

/** Region plates are this tall in plate-local units; width follows the aspect. */
export const PLATE_H = 630
/** How many world units of height the camera shows when surveying a region. */
const REGION_H = 337.5

const round2 = (n) => Math.round(n * 100) / 100

export function makeSpace(aspect) {
  const w = Math.max(BASE.w, Math.round(BASE.h * aspect))
  const h = Math.max(BASE.h, Math.round(BASE.w / aspect))
  const sx = w / BASE.w
  const sy = h / BASE.h
  const project = ([x, y]) => [x * sx, y * sy]
  // New phase objects with projected centres, built once per aspect. Stable
  // identities matter: <Territory> is memo'd and receives these objects.
  const phases = PHASES.map((p, index) => ({ ...p, index, center: project(p.center) }))
  return {
    w,
    h,
    aspect: w / h,
    project,
    phases,
    byId: Object.fromEntries(phases.map((p) => [p.id, p])),
    worldBox: { x: 0, y: 0, w, h },
    plateW: Math.round(PLATE_H * (w / h)),
  }
}

/** Camera box for a region: same aspect as the screen, clamped inside the world. */
export function regionBox(phase, space) {
  const h = REGION_H
  const w = h * space.aspect
  const [cx, cy] = phase.center
  const x = Math.min(Math.max(cx - w / 2, 0), space.w - w)
  const y = Math.min(Math.max(cy - h / 2, 0), space.h - h)
  return { x, y, w, h }
}

/**
 * Measure the element the chart lives in. ResizeObserver is an external
 * system, so: subscribe in an effect. useLayoutEffect (not useEffect) so the
 * corrected size lands before the browser paints, with no one-frame letterbox.
 * The initial guess from window size makes the first render nearly right.
 */
export function useChartSpace(ref) {
  const [aspect, setAspect] = useState(() => round2(window.innerWidth / Math.max(1, window.innerHeight - 84)))
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      // Rounding means a 1px jiggle doesn't rebuild the whole chart.
      if (width > 0 && height > 0) setAspect(round2(width / height))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return useMemo(() => makeSpace(aspect), [aspect])
}
