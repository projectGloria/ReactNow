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
      "edited": true,              // experimented with the live example
      "trialAttempts": 2,
      "trialPassed": true,
      "firstTry": false,
      "noted": true,               // has a non-empty margin note
      "masteredAt": "<iso ts>"     // edited + trialPassed + noted = wax seal
    }
  },
  "checkpoints": { "p0": { "attempts": 3, "passed": true, "passedAt": "<iso ts>" } },
  "summary": {                     // write-time projection for humans/Claude
    "xp": 0, "rank": "Deckhand", "streak": 0, "day": 1,
    "lessonsMastered": 0, "lessonsExpectedByToday": 2, "behindSchedule": true,
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
| `trial_attempt` | `phase`, `lesson`, `pass`, `code` (what you submitted), `failed` (labels of failed checks) |
| `checkpoint_answer` | `phase`, `index`, `question`, `answer` (verbatim), `selfGrade` (`pass`/`miss`) |
| `checkpoint_passed` | `phase` |

## notes/

`notes/<phase>/<lesson>.md`: your Marginalia, with frontmatter (`title`, `updated`). Edit them in your editor too if you like; the app reads them at startup.
