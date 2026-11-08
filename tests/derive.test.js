// tests/derive.test.js — the game rules, which are pure functions of progress.
import { describe, expect, it } from 'vitest'
import { applyEvent, emptyProgress, NOTE_MIN } from '../src/store/expedition.js'
import { ITINERARY, REVIEW_DAYS, dueReviews, isMastered, isReviewDue, schedule } from '../src/store/derive.js'
import { parseRoute } from '../src/router/useHashRoute.js'

const DAY = 86_400_000
const daysAgo = (n) => new Date(Date.now() - n * DAY).toISOString()
const startedDaysAgo = (n) => {
  const d = new Date(Date.now() - n * DAY)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const charted = ITINERARY.filter(({ lesson }) => lesson.charted)
const sealedRec = (at) => ({ edited: true, trialPassed: true, noted: true, masteredAt: at, trialAttempts: 1 })

describe('schedule', () => {
  it('never expects more lessons than have been written', () => {
    const p = { ...emptyProgress(), startDate: startedDaysAgo(30) }
    const s = schedule(p)
    expect(s.expected).toBeLessThanOrEqual(charted.length)
    expect(s.available).toBe(charted.length)
  })

  it('is not "behind" when every written lesson is sealed, and flags the content gap', () => {
    const lessons = Object.fromEntries(charted.map(({ phase, lesson }) => [`${phase.id}/${lesson.id}`, sealedRec(daysAgo(1))]))
    const s = schedule({ ...emptyProgress(), startDate: startedDaysAgo(30), lessons })
    expect(s.behind).toBe(false)
    expect(s.awaitingCharts).toBe(true)
  })

  it('is behind when written lessons are left unsealed past their day', () => {
    expect(schedule({ ...emptyProgress(), startDate: startedDaysAgo(5) }).behind).toBe(true)
  })
})

describe('mastery', () => {
  const ev = (type, extra) => ({ type, ts: new Date().toISOString(), phase: 'p0', lesson: 'closures', ...extra })

  it(`needs a margin note of at least ${NOTE_MIN} characters`, () => {
    let p = emptyProgress()
    p = applyEvent(p, ev('example_edited'))
    p = applyEvent(p, ev('trial_attempt', { pass: true }))
    p = applyEvent(p, ev('note_saved', { length: 12 }))
    expect(isMastered(p.lessons['p0/closures'])).toBe(false)
    p = applyEvent(p, ev('note_saved', { length: NOTE_MIN }))
    expect(isMastered(p.lessons['p0/closures'])).toBe(true)
  })
})

describe('spaced review', () => {
  it(`falls due ${REVIEW_DAYS[0]} days after sealing, not before`, () => {
    expect(isReviewDue(sealedRec(daysAgo(REVIEW_DAYS[0] - 1)))).toBe(false)
    expect(isReviewDue(sealedRec(daysAgo(REVIEW_DAYS[0] + 0.1)))).toBe(true)
    expect(isReviewDue({ trialPassed: true })).toBe(false) // unsealed lessons never are
  })

  it('a passing review re-stamps the seal and lengthens the next interval', () => {
    const key = 'p0/closures'
    let p = { ...emptyProgress(), lessons: { [key]: sealedRec(daysAgo(4)) } }
    expect(dueReviews(p).map((r) => r.lesson.id)).toEqual(['closures'])

    // A failing attempt changes nothing.
    p = applyEvent(p, { type: 'trial_attempt', ts: new Date().toISOString(), phase: 'p0', lesson: 'closures', pass: false, review: true })
    expect(isReviewDue(p.lessons[key])).toBe(true)

    p = applyEvent(p, { type: 'trial_attempt', ts: new Date().toISOString(), phase: 'p0', lesson: 'closures', pass: true, review: true })
    expect(p.lessons[key].reviews).toBe(1)
    expect(isReviewDue(p.lessons[key])).toBe(false)
    // Next one is REVIEW_DAYS[1] out, not REVIEW_DAYS[0].
    expect(isReviewDue(p.lessons[key], Date.now() + (REVIEW_DAYS[0] + 1) * DAY)).toBe(false)
    expect(isReviewDue(p.lessons[key], Date.now() + (REVIEW_DAYS[1] + 0.1) * DAY)).toBe(true)
  })
})

describe('router', () => {
  it.each([
    ['#/', { view: 'atlas' }],
    ['#/p1', { view: 'region', phaseId: 'p1' }],
    ['#/p1/brief', { view: 'brief', phaseId: 'p1' }],
    ['#/p1/gate', { view: 'gate', phaseId: 'p1' }],
    ['#/p1/props', { view: 'lesson', phaseId: 'p1', lessonId: 'props' }],
    ['#/log', { view: 'log' }],
  ])('%s', (hash, route) => expect(parseRoute(hash)).toEqual(route))
})
