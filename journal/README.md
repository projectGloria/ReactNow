# The Journal

Written by the app (via the Vite dev server). Read by you and by Claude. Commit it: the git history is your learning timeline.

## progress.json

```jsonc
{
  "version": 1,
  "startDate": "2026-11-08",      // Day 1 of the plan (local date)
  "planDays": 36,
  "lessons": {
    "p1/state-snapshot": {
      "opened": "<iso ts>",        // first time opened
      "edited": true,              // changed a token in the live example (whitespace edits don't count)
      "trialAttempts": 2,
      "trialPassed": true,
      "firstTry": false,
      "noted": true,               // margin note of 120+ characters (NOTE_MIN)
      "masteredAt": "<iso ts>",    // edited + trialPassed + noted = wax seal
      "reviews": 1,                // passed spaced reviews (re-ran the trial from the buggy code)
      "reviewedAt": "<iso ts>"     // next review due 3 / 7 / 21 / 30 days after the last stamp
    }
  },
  "checkpoints": { "p0": { "attempts": 3, "passed": true, "passedAt": "<iso ts>" } },
  "summary": {                     // write-time projection for humans/Claude
    "xp": 0, "rank": "Deckhand", "streak": 0, "day": 1,
    "lessonsMastered": 0, "lessonsCharted": 17, "lessonsExpectedByToday": 2, "behindSchedule": true,
    "awaitingCharts": false,       // every written lesson sealed: the content is behind, not you
    "reviewsDue": ["p0/closures"], // sealed lessons whose seal is fading
    "phasesPassed": [], "suggestedNext": "p0/closures", "generatedAt": "<iso ts>"
  }
}
```

To change the plan length or restart the clock, edit `startDate` / `planDays` while the dev server is stopped.

## log.jsonl

One event per line, `{ "type", "ts", ...payload }`:

| type | payload |
|---|---|
| `session_start` | — |
| `lesson_opened` | `phase`, `lesson` |
| `example_edited` | `phase`, `lesson` (first edit per visit) |
| `note_saved` | `phase`, `lesson`, `length` (on blur after a change) |
| `trial_attempt` | `phase`, `lesson`, `pass`, `code` (what you submitted), `failed` (labels of failed checks), `review` (true when re-running a sealed lesson's trial as a spaced review) |
| `checkpoint_answer` | `phase`, `index`, `question`, `answer` (verbatim), `selfGrade` (`pass`/`miss`), `lengthRatio` (answer words / model words; a `pass` under ~0.35 deserves scrutiny) |
| `checkpoint_passed` | `phase` |

## notes/

`notes/<phase>/<lesson>.md`: your Marginalia, with frontmatter (`title`, `updated`). Edit them in your editor too if you like; the app reads them at startup.
