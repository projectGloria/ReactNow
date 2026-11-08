// src/atlas/useCamera.js
// ---------------------------------------------------------------------------
// Animates an <svg>'s viewBox toward a target box — a real zoom, not the
// draft's CSS scale-and-fade trick.
//
// Under the hood: we write the viewBox attribute *directly to the DOM* on each
// animation frame instead of calling setState 60 times a second. Routing every
// frame through React would re-render the whole chart (hundreds of paths) per
// frame for no reason: nothing React manages changes mid-flight. React is told
// only the two moments that matter: "flight started" and "arrived".
//
// Zoom interpolates width *geometrically* (w0 * (w1/w0)^t), which feels like
// constant-speed zooming; linear width interpolation feels like it lurches.
// ---------------------------------------------------------------------------
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const toAttr = (b) => `${b.x.toFixed(2)} ${b.y.toFixed(2)} ${b.w.toFixed(2)} ${b.h.toFixed(2)}`
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * @param {React.RefObject<SVGSVGElement>} svgRef
 * @param {{x:number,y:number,w:number,h:number}} target
 * @param {string} targetKey   identity of the target (e.g. phase id or 'world')
 * @returns {string|null} key of the target the camera has settled on, or null while flying
 */
export function useCamera(svgRef, target, targetKey, duration = 1100) {
  const current = useRef(target) // where the camera physically is right now
  const [settledKey, setSettledKey] = useState(targetKey)
  const prevKey = useRef(null)

  // Layout effect: start the flight before the browser paints the new route,
  // so there is no one-frame flash of the old view with new overlays.
  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const from = current.current
    const to = target
    const same = ['x', 'y', 'w', 'h'].every((k) => Math.abs(from[k] - to[k]) < 0.01)
    // Keys look like "p1@2484x1080". Same destination, different size means the
    // window was resized: snap, don't fly. Flying only makes sense for navigation.
    const resizedOnly = prevKey.current?.split('@')[0] === targetKey.split('@')[0]
    prevKey.current = targetKey
    if (same || resizedOnly || reducedMotion()) {
      current.current = to
      svg.setAttribute('viewBox', toAttr(to))
      setSettledKey(targetKey)
      return
    }

    setSettledKey(null)
    let raf
    const t0 = performance.now()
    const fromCx = from.x + from.w / 2
    const fromCy = from.y + from.h / 2
    const toCx = to.x + to.w / 2
    const toCy = to.y + to.h / 2
    const aspect = to.h / to.w

    const frame = (now) => {
      const k = Math.min(1, (now - t0) / duration)
      const e = ease(k)
      const w = from.w * Math.pow(to.w / from.w, e)
      const h = w * aspect
      const cx = fromCx + (toCx - fromCx) * e
      const cy = fromCy + (toCy - fromCy) * e
      const box = { x: cx - w / 2, y: cy - h / 2, w, h }
      current.current = box
      svg.setAttribute('viewBox', toAttr(box))
      if (k < 1) raf = requestAnimationFrame(frame)
      else setSettledKey(targetKey)
    }
    raf = requestAnimationFrame(frame)
    // Cleanup cancels a flight in progress if the target changes mid-air;
    // the next flight starts from wherever `current` stopped. No snapping.
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- target is described by targetKey
  }, [targetKey])

  // Keep the initial attribute right on first mount (deep link straight to a region).
  useEffect(() => {
    svgRef.current?.setAttribute('viewBox', toAttr(current.current))
  }, [svgRef])

  return settledKey
}
