// src/journal/Inline.jsx — tiny inline-markdown renderer.
// Its own module on purpose: it used to live in Specimen.jsx, so every screen
// that formatted a sentence (gate, brief) dragged react-live + sucrase + prism
// into the main bundle with it.

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
