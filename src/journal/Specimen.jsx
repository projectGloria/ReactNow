// src/journal/Specimen.jsx — live editor + preview for a lesson's example.
import { useRef, useState } from 'react'
import { Editor, LiveError, LivePreview, LiveProvider } from 'react-live'
import { PARCHMENT_THEME, SCOPE, appendRender } from './liveScope.js'

export function Specimen({ example, onFirstEdit }) {
  const [code, setCode] = useState(example.code)
  // A ref, not state: "have we reported the first edit yet?" never affects
  // what we render, so storing it in state would cause a pointless re-render.
  const reported = useRef(false)

  function handleChange(next) {
    setCode(next)
    if (!reported.current && next !== example.code) {
      reported.current = true
      onFirstEdit()
    }
  }

  return (
    <div className="specimen">
      <LiveProvider code={code} scope={SCOPE} noInline transformCode={appendRender} enableTypeScript={false} language="jsx" theme={PARCHMENT_THEME}>
        <div className="specimen-grid">
          <div className="specimen-pane">
            <div className="pane-label">
              Specimen <span>· edit freely; hooks are in scope, no imports needed</span>
              {code !== example.code && (
                <button className="btn btn-small" onClick={() => setCode(example.code)}>
                  Restore
                </button>
              )}
            </div>
            {/* Controlled: our state is the source of truth, the editor reports changes. */}
            <Editor className="live-editor" code={code} language="jsx" theme={PARCHMENT_THEME} onChange={handleChange} />
          </div>
          <div className="specimen-pane">
            <div className="pane-label">Result</div>
            <LivePreview className="live-preview" />
            <LiveError className="live-error" />
          </div>
        </div>
      </LiveProvider>
      {example.tryThis?.length > 0 && (
        <div className="try-this">
          <div className="pane-label">Experiments to try</div>
          <ol>
            {example.tryThis.map((t, i) => (
              <li key={i}>
                <Inline text={t} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

/** Tiny formatter: `code`, **bold**, *italic*. Splitting into React nodes (not innerHTML) keeps it XSS-safe. */
export function Inline({ text }) {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((p, i) => {
    if (p.startsWith('`')) return <code key={i}>{p.slice(1, -1)}</code>
    if (p.startsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('*') && p.length > 2) return <em key={i}>{p.slice(1, -1)}</em>
    return p
  })
}
