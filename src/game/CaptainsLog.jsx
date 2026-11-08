// src/game/CaptainsLog.jsx — day-by-day record derived from journal/log.jsonl.
import { useMemo } from 'react'
import { PHASES, findLesson } from '../content/index.js'
import { navigate } from '../router/useHashRoute.js'
import { useExpedition } from '../store/ExpeditionProvider.jsx'
import { toLocalDate } from '../store/expedition.js'
import { RankMedal } from './RankMedal.jsx'
import { RANKS, XP, computeStreak, computeXp, rankFor, schedule } from '../store/derive.js'
import { dialogProps } from '../ui/dialog.js'

const VERB = {
  session_start: null, // noise; counted as a session instead
  lesson_opened: 'opened',
  example_edited: 'experimented with',
  note_saved: 'wrote marginalia on',
  trial_attempt: null, // rendered specially
  checkpoint_answer: null,
  checkpoint_passed: null,
}

export function CaptainsLog() {
  const { progress, log } = useExpedition()
  // Grouping a few hundred events is cheap, but the log only changes when you
  // act — useMemo keeps re-renders from the ledger status dot from regrouping.
  const days = useMemo(() => {
    const map = new Map()
    for (const e of log) {
      const d = toLocalDate(e.ts)
      if (!map.has(d)) map.set(d, [])
      map.get(d).push(e)
    }
    return [...map.entries()].reverse()
  }, [log])

  const xp = computeXp(progress)
  const rank = rankFor(xp)
  const sched = schedule(progress)

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && navigate('/')}>
      <article className="sheet log" {...dialogProps} aria-label="Captain's Log">
        <button className="book-close" onClick={() => navigate('/')} aria-label="Close">
          ✕
        </button>
        <div className="page-kicker">Kept since {new Date(`${progress.startDate}T00:00:00`).toLocaleDateString()}</div>
        <h1 className="drop-title">The Captain&rsquo;s Log</h1>

        <div className="log-stats">
          <Stat label="Day" value={`${sched.day} / ${sched.planDays}`} warn={sched.behind} />
          <Stat label="Streak" value={`${computeStreak(log)} days`} />
          <Stat label="Sealed" value={`${sched.mastered} / ${sched.available}`} />
          <Stat label="XP" value={xp} />
        </div>

        <h3 className="rubric">Ranks of the Society</h3>
        <ol className="ranks">
          {RANKS.map((r, i) => (
            <li key={r.title} className={i <= rank.index ? 'is-earned' : ''}>
              <RankMedal index={i} size={28} title={r.title} /> <strong>{r.title}</strong> <span>{r.xp} XP</span> <em>{r.motto}</em>
            </li>
          ))}
        </ol>
        <p className="muted">
          XP: experiment +{XP.edited}, margin note +{XP.noted}, trial +{XP.trial} (+{XP.trialFirstTry} first try), checkpoint +{XP.checkpoint}. A lesson is
          sealed when all three are done.
        </p>

        <h3 className="rubric">Entries</h3>
        {days.length === 0 && <p className="muted">No entries yet. Set sail from the Isle of Closures.</p>}
        {days.map(([day, events]) => (
          <section key={day} className="log-day">
            <h4>
              {new Date(`${day}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
              <span> · {events.filter((e) => e.type === 'session_start').length} session(s)</span>
            </h4>
            <ul>
              {events.map((e, i) => (
                <Entry key={i} e={e} />
              ))}
            </ul>
          </section>
        ))}
      </article>
    </div>
  )
}

function Entry({ e }) {
  const time = new Date(e.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const found = e.lesson ? findLesson(e.phase, e.lesson) : null
  const name = found?.lesson.title ?? e.lesson
  const link = found ? (
    <button className="linklike" onClick={() => navigate(`/${e.phase}/${e.lesson}`)}>
      {name}
    </button>
  ) : null
  let text
  if (e.type === 'trial_attempt') text = <>{e.pass ? 'passed the trial of' : 'failed the trial of'} {link}</>
  else if (e.type === 'checkpoint_answer') text = <>answered a Customs question at {e.phase.toUpperCase()} ({e.selfGrade === 'pass' ? 'had it' : 'missed'})</>
  else if (e.type === 'checkpoint_passed') text = <strong>cleared the Customs House of {PHASES.find((p) => p.id === e.phase)?.landmark}</strong>
  else if (VERB[e.type]) text = <>{VERB[e.type]} {link}</>
  else return null
  return (
    <li className={`log-entry is-${e.type}${e.pass === false ? ' is-fail' : ''}`}>
      <time>{time}</time> {text}
    </li>
  )
}

function Stat({ label, value, warn }) {
  return (
    <div className={`stat${warn ? ' is-warn' : ''}`}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  )
}
