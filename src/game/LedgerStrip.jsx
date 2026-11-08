// src/game/LedgerStrip.jsx — the header: rank, XP, day, streak, next lesson.
import { useState, useSyncExternalStore } from 'react'
import { useExpedition } from '../store/ExpeditionProvider.jsx'
import { computeStreak, computeXp, dueReviews, nextLesson, rankFor, schedule } from '../store/derive.js'
import { navigate } from '../router/useHashRoute.js'
import { ledgerStatus, retryLedger } from '../ledger/client.js'
import { buildDispatch } from './dispatch.js'
import { RankMedal } from './RankMedal.jsx'

// The browser owns fullscreen state; subscribe to it instead of mirroring it
// in useState (which would drift when the user presses Esc or F11).
const fullscreen = {
  subscribe(cb) {
    document.addEventListener('fullscreenchange', cb)
    return () => document.removeEventListener('fullscreenchange', cb)
  },
  get: () => Boolean(document.fullscreenElement),
}
function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else document.documentElement.requestFullscreen()
}

export function LedgerStrip() {
  const { progress, log } = useExpedition()
  // All derived, every render. Cheap arithmetic beats a cache that can go stale.
  const xp = computeXp(progress)
  const rank = rankFor(xp)
  const sched = schedule(progress)
  const streak = computeStreak(log)
  const next = nextLesson(progress)
  // Reviews first: a fading seal is cheaper to refresh now than to relearn later.
  const reviews = dueReviews(progress)
  const review = reviews[0] ?? null
  const pct = rank.next ? ((xp - rank.xp) / (rank.next.xp - rank.xp)) * 100 : 100
  const status = useSyncExternalStore(ledgerStatus.subscribe, ledgerStatus.get)
  const [copied, setCopied] = useState(false)
  const isFullscreen = useSyncExternalStore(fullscreen.subscribe, fullscreen.get)

  async function dispatch() {
    await navigator.clipboard.writeText(buildDispatch(progress, log))
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  return (
    <header className="ledger-strip">
      <div className="ledger-rank" title={rank.motto}>
        <RankMedal index={rank.index} size={40} title={`Rank ${rank.index + 1}: ${rank.title}`} />
        <div>
          <div className="ledger-kicker">Rank</div>
          <div className="ledger-title">{rank.title}</div>
          <div className="xp-bar" aria-label={`${xp} XP`}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <div className="ledger-small">
            {xp} XP{rank.next ? ` · ${rank.next.xp - xp} to ${rank.next.title}` : ' · the highest honour'}
          </div>
        </div>
      </div>

      <div className="ledger-day">
        <div className={`ledger-daynum${sched.behind ? ' is-behind' : ''}`}>
          Day {sched.day} <span>of {sched.planDays}</span>
        </div>
        <div className="ledger-small">
          {sched.mastered}/{sched.available} sealed
          {sched.available < sched.total && <span title={`${sched.total - sched.available} lessons not yet written`}> (of {sched.total} planned)</span>} ·{' '}
          {sched.behind ? `${sched.expected - sched.mastered} behind the plan` : sched.awaitingCharts ? 'waiting on new charts' : 'on schedule'}
          {reviews.length > 0 && ` · ${reviews.length} review${reviews.length > 1 ? 's' : ''} due`} · ⚓ {streak}-day streak
        </div>
      </div>

      <nav className="ledger-actions">
        {review ? (
          <button className="btn btn-primary" onClick={() => navigate(`/${review.phase.id}/${review.lesson.id}`)} title="This seal is fading: re-pass its trial">
            ↻ Review: {review.lesson.title}
          </button>
        ) : (
          next && (
            <button className="btn btn-primary" onClick={() => navigate(`/${next.phase.id}/${next.lesson.id}`)} title={next.lesson.why}>
              Next waypoint: {next.lesson.title}
            </button>
          )
        )}
        <button className="btn" onClick={() => navigate('/log')}>
          Captain&rsquo;s Log
        </button>
        <button className="btn" onClick={dispatch} title="Copy a markdown progress report for a Claude chat">
          {copied ? 'Copied ✓' : 'Dispatch to Claude'}
        </button>
        <button className="btn btn-icon" onClick={toggleFullscreen} title={isFullscreen ? 'Leave fullscreen (Esc)' : 'Fullscreen (F)'} aria-label="Toggle fullscreen">
          {isFullscreen ? '⤡' : '⤢'}
        </button>
        <span className={`ink-dot is-${status}`} title={`Journal: ${status}`} aria-label={`Journal ${status}`} />
      </nav>

      {status === 'offline' && (
        <div className="telegram" role="alert">
          {/* The ledger API only exists inside the Vite dev server. A production
              build can never reach it, so say *why* instead of offering a retry
              that can't succeed. */}
          <strong>TELEGRAM —</strong>{' '}
          {import.meta.env.PROD
            ? 'THIS IS A BUILT COPY STOP THE JOURNAL ONLY WRITES TO DISK UNDER NPM RUN DEV STOP PROGRESS HERE STAYS IN THIS BROWSER AND CLAUDE CANNOT READ IT STOP'
            : 'THE JOURNAL CANNOT BE REACHED STOP YOUR WORK IS KEPT IN THIS BROWSER STOP'}
          {!import.meta.env.PROD && (
            <button className="btn btn-small" onClick={retryLedger}>
              Retry
            </button>
          )}
        </div>
      )}
    </header>
  )
}
