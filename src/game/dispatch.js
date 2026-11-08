// src/game/dispatch.js
// "Dispatch to Claude": a markdown progress report for chats that can't read
// the journal/ folder from disk (e.g. claude.ai). Claude Code sessions in this
// repo should read journal/ directly instead (see CLAUDE.md).
import { PHASES } from '../content/index.js'
import { allNotes } from '../ledger/notes.js'
import { computeStreak, isMastered, summarize } from '../store/derive.js'

export function buildDispatch(progress, log) {
  const s = summarize(progress, log)
  const notes = allNotes()
  const out = []
  out.push(`# Expedition dispatch — ${new Date().toLocaleDateString()}`)
  out.push('')
  out.push(`I'm learning React with my roadmap app. Please review my progress, grade my checkpoint answers, and tell me what to focus on next.`)
  out.push('')
  out.push(`- Rank: **${s.rank}** (${s.xp} XP) · streak ${computeStreak(log)} day(s)`)
  out.push(`- Day ${s.day} of ${progress.planDays} · ${s.lessonsMastered} lessons sealed, ${s.lessonsExpectedByToday} expected by today${s.behindSchedule ? ' (**behind**)' : ''}`)
  out.push(`- Checkpoints passed: ${s.phasesPassed.join(', ') || 'none yet'} · suggested next: ${s.suggestedNext ?? '—'}`)
  out.push('')

  for (const p of PHASES) {
    const touched = p.lessons.filter((l) => progress.lessons[`${p.id}/${l.id}`])
    if (!touched.length && !progress.checkpoints[p.id]) continue
    out.push(`## ${p.num} ${p.landmark} (${p.title})`)
    for (const l of touched) {
      const r = progress.lessons[`${p.id}/${l.id}`]
      const flags = [
        isMastered(r) ? 'SEALED' : null,
        r.edited ? 'example edited' : null,
        r.trialPassed ? `trial passed in ${r.trialAttempts} attempt(s)` : r.trialAttempts ? `trial failing (${r.trialAttempts} attempts)` : null,
      ].filter(Boolean)
      out.push(`- **${l.title}** — ${flags.join(', ') || 'opened'}`)
      const note = notes[`${p.id}/${l.id}`]
      if (note) out.push(`  - My note: ${note.replace(/\n+/g, ' ').slice(0, 400)}`)
    }
    out.push('')
  }

  const answers = log.filter((e) => e.type === 'checkpoint_answer').slice(-8)
  if (answers.length) {
    out.push('## My recent checkpoint answers (please grade)')
    for (const a of answers) {
      out.push(`- [${a.phase}] Q: ${a.question}`)
      out.push(`  - My answer: ${a.answer}`)
      out.push(`  - Self-grade: ${a.selfGrade}`)
    }
    out.push('')
  }

  const fails = log.filter((e) => e.type === 'trial_attempt' && !e.pass).slice(-5)
  if (fails.length) {
    out.push('## Recent failed trial attempts')
    for (const f of fails) out.push(`- ${f.phase}/${f.lesson}: failed "${(f.failed ?? []).join('; ')}"`)
  }
  return out.join('\n')
}
