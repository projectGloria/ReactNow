// src/store/derive.js
// ---------------------------------------------------------------------------
// Everything here is *derived* from progress + log + content. None of it is
// stored in React state: storing it would create a second source of truth that
// can drift (the classic "XP says 120 but seals say 3" bug).
// ---------------------------------------------------------------------------
import { PHASES } from '../content/index.js'
import { toLocalDate, today } from './expedition.js'

export const RANKS = [
  { xp: 0, title: 'Deckhand', motto: 'Every chart begins with a blank page.' },
  { xp: 150, title: 'Apprentice Surveyor', motto: 'You can read the coastline.' },
  { xp: 500, title: 'Surveyor', motto: 'You chart what others only sail past.' },
  { xp: 1200, title: 'Cartographer', motto: 'Others navigate by your maps.' },
  { xp: 2200, title: 'Expedition Leader', motto: 'You choose the route.' },
  { xp: 3500, title: 'Fellow of the Royal Geographical Society', motto: 'The Society requests your lectures.' },
]

export const XP = { edited: 5, trial: 20, trialFirstTry: 40, noted: 10, checkpoint: 100 }

export const isMastered = (l) => Boolean(l?.edited && l?.trialPassed && l?.noted)

export function computeXp(progress) {
  let xp = 0
  for (const l of Object.values(progress.lessons)) {
    if (l.edited) xp += XP.edited
    if (l.noted) xp += XP.noted
    if (l.trialPassed) xp += l.firstTry ? XP.trialFirstTry : XP.trial
  }
  for (const c of Object.values(progress.checkpoints)) if (c.passed) xp += XP.checkpoint
  return xp
}

export function rankFor(xp) {
  let i = 0
  while (i + 1 < RANKS.length && xp >= RANKS[i + 1].xp) i++
  return { ...RANKS[i], index: i, next: RANKS[i + 1] ?? null }
}

/** Phase i is unlocked when the previous phase's checkpoint gate is passed. */
export function isUnlocked(progress, phaseIndex) {
  if (phaseIndex === 0) return true
  return Boolean(progress.checkpoints[PHASES[phaseIndex - 1].id]?.passed)
}

export function phaseStatus(progress, i) {
  if (progress.checkpoints[PHASES[i].id]?.passed) return 'done'
  return isUnlocked(progress, i) ? 'current' : 'locked'
}

/** Consecutive days with at least one logged event, ending today (or yesterday). */
export function computeStreak(log) {
  const days = new Set(log.map((e) => toLocalDate(e.ts)))
  const d = new Date()
  if (!days.has(toLocalDate(d))) d.setDate(d.getDate() - 1) // today not started yet: streak still alive
  let streak = 0
  while (days.has(toLocalDate(d))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}

export function dayNumber(progress) {
  const start = new Date(`${progress.startDate}T00:00:00`)
  const now = new Date(`${today()}T00:00:00`)
  return Math.floor((now - start) / 86_400_000) + 1
}

/** Flat ordered list of all lessons with their phase — the itinerary. */
export const ITINERARY = PHASES.flatMap((p, pi) => p.lessons.map((l) => ({ phase: p, phaseIndex: pi, lesson: l })))

export function schedule(progress) {
  const day = dayNumber(progress)
  const total = ITINERARY.length
  const mastered = ITINERARY.filter(({ phase, lesson }) => isMastered(progress.lessons[`${phase.id}/${lesson.id}`])).length
  // Quota due by the *start* of today: you're only behind for days already over.
  const expected = Math.min(total, Math.floor((total * Math.min(day - 1, progress.planDays)) / progress.planDays))
  return { day, planDays: progress.planDays, total, mastered, expected, behind: mastered < expected }
}

/** Next suggested lesson: first un-mastered, charted lesson in an unlocked phase. */
export function nextLesson(progress) {
  return (
    ITINERARY.find(
      ({ phase, phaseIndex, lesson }) =>
        lesson.charted && isUnlocked(progress, phaseIndex) && !isMastered(progress.lessons[`${phase.id}/${lesson.id}`]),
    ) ?? null
  )
}

/**
 * Write-time projection for progress.json so Claude gets a human summary
 * without recomputing. Not React state — computed only when saving.
 */
export function summarize(progress, log) {
  const xp = computeXp(progress)
  const s = schedule(progress)
  const next = nextLesson(progress)
  return {
    xp,
    rank: rankFor(xp).title,
    streak: computeStreak(log),
    day: s.day,
    lessonsMastered: s.mastered,
    lessonsExpectedByToday: s.expected,
    behindSchedule: s.behind,
    phasesPassed: PHASES.filter((p) => progress.checkpoints[p.id]?.passed).map((p) => p.id),
    suggestedNext: next ? `${next.phase.id}/${next.lesson.id}` : null,
    generatedAt: new Date().toISOString(),
  }
}
