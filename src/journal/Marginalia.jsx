// src/journal/Marginalia.jsx — your notes, saved to journal/notes/<phase>/<lesson>.md
import { useRef, useSyncExternalStore } from 'react'
import { useNote } from '../ledger/notes.js'
import { ledgerStatus } from '../ledger/client.js'
import { NOTE_MIN } from '../store/expedition.js'

export function Marginalia({ noteKey, title, onSaved }) {
  const [body, setBody] = useNote(noteKey, title)
  const status = useSyncExternalStore(ledgerStatus.subscribe, ledgerStatus.get)
  // Snapshot of the note when focus arrived; on blur we log only real changes.
  const atFocus = useRef(body)

  return (
    <div className="marginalia">
      <div className="pane-label">
        Marginalia <span>· in your own words: what, why, and what surprised you</span>
        <span className={`ink-dot is-${status}`} title={`Journal: ${status}`} />
      </div>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onFocus={() => (atFocus.current = body)}
        onBlur={() => body !== atFocus.current && onSaved(body.trim().length)}
        placeholder="e.g. State is a snapshot: each render's handlers see that render's values, so…"
        rows={6}
        spellCheck
      />
      <div className="marginalia-foot">
        {/* Derived from the draft every keystroke: no state, just a length. */}
        <span className={`note-meter${body.trim().length >= NOTE_MIN ? ' is-enough' : ''}`}>
          {body.trim().length >= NOTE_MIN ? 'Enough for the seal ✓' : `${body.trim().length}/${NOTE_MIN} characters toward the seal`}
        </span>{' '}
        · Saved to <code>journal/notes/{noteKey}.md</code>, where Claude can read it.
      </div>
    </div>
  )
}
