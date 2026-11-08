// src/game/RankMedal.jsx — the insignia for a rank (engraved medal, or a wax seal until the art lands).
import { art } from '../art/index.js'
import { WaxSeal } from './WaxSeal.jsx'

/** @param {{ index: number, size?: number, title?: string }} props  index = 0-based rank index */
export function RankMedal({ index, size = 40, title }) {
  const src = art(`game/rank-${index + 1}`)
  if (!src) return <WaxSeal size={size} letter={String(index + 1)} title={title} />
  // Trimmed medals are taller than wide (ribbon on top): fixed height, auto width
  // keeps every medal the same visual height in the header and the log.
  return <img src={src} height={size} alt={title ?? `Rank ${index + 1}`} className="rank-medal" draggable="false" />
}
