// vite-plugin-ledger.js
// ---------------------------------------------------------------------------
// The Ledger: a tiny file-backed "database" that lives inside the Vite dev
// server. Why? Browser storage (localStorage/IndexedDB) is invisible to Claude
// Code. Writing plain JSON/Markdown into ./journal means any Claude session can
// `cat journal/progress.json` and coach you from real data, and git history
// becomes a timeline of your learning.
//
// Endpoints (dev server only — `vite build` output is a static read-only app):
//   GET  /api/ledger                    -> { progress, notes, log }
//   PUT  /api/progress                  -> overwrite journal/progress.json
//   PUT  /api/notes/:phase/:lesson      -> write journal/notes/<phase>/<lesson>.md
//   POST /api/log                       -> append one line to journal/log.jsonl
// ---------------------------------------------------------------------------
import fs from 'node:fs/promises'
import path from 'node:path'

const SAFE_ID = /^[a-z0-9-]+$/ // blocks path traversal like "../../etc"

/** Stable key order so `git diff journal/progress.json` stays readable. */
function stableStringify(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort)
    if (v && typeof v === 'object') {
      return Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, sort(v[k])]),
      )
    }
    return v
  }
  return JSON.stringify(sort(value), null, 2) + '\n'
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? JSON.parse(raw) : null
}

function send(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data ?? { ok: true }))
}

// Frontmatter keeps notes human-friendly *and* machine-parseable.
function toMarkdown({ title, body }) {
  return `---\ntitle: ${JSON.stringify(title ?? '')}\nupdated: ${new Date().toISOString()}\n---\n\n${body.trim()}\n`
}
function fromMarkdown(md) {
  const m = md.match(/^---\n[\s\S]*?\n---\n\n?([\s\S]*)$/)
  return (m ? m[1] : md).trimEnd()
}

async function walkNotes(dir) {
  const notes = {}
  let phases = []
  try {
    phases = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return notes // no notes yet
  }
  for (const p of phases) {
    if (!p.isDirectory()) continue
    for (const f of await fs.readdir(path.join(dir, p.name))) {
      if (!f.endsWith('.md')) continue
      const md = await fs.readFile(path.join(dir, p.name, f), 'utf8')
      notes[`${p.name}/${f.slice(0, -3)}`] = fromMarkdown(md)
    }
  }
  return notes
}

export default function ledgerPlugin({ dir = 'journal' } = {}) {
  let root
  return {
    name: 'reactnow-ledger',
    apply: 'serve',
    configResolved(cfg) {
      root = path.resolve(cfg.root, dir)
    },
    configureServer(server) {
      // Don't let our own writes trigger full-page reloads.
      server.watcher.unwatch(path.join(root, '**'))

      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next()
        try {
          await fs.mkdir(path.join(root, 'notes'), { recursive: true })
          const progressFile = path.join(root, 'progress.json')
          const logFile = path.join(root, 'log.jsonl')

          if (req.method === 'GET' && req.url === '/api/ledger') {
            const progress = await fs
              .readFile(progressFile, 'utf8')
              .then(JSON.parse)
              .catch(() => null)
            const log = await fs
              .readFile(logFile, 'utf8')
              .then((t) => t.split('\n').filter(Boolean).map((l) => JSON.parse(l)))
              .catch(() => [])
            const notes = await walkNotes(path.join(root, 'notes'))
            return send(res, 200, { progress, notes, log })
          }

          if (req.method === 'PUT' && req.url === '/api/progress') {
            const body = await readBody(req)
            await fs.writeFile(progressFile, stableStringify(body))
            return send(res, 200)
          }

          const noteMatch = req.url.match(/^\/api\/notes\/([^/]+)\/([^/?]+)$/)
          if (req.method === 'PUT' && noteMatch) {
            const [, phase, lesson] = noteMatch
            if (!SAFE_ID.test(phase) || !SAFE_ID.test(lesson)) return send(res, 400, { error: 'bad id' })
            const { title, body } = await readBody(req)
            const file = path.join(root, 'notes', phase, `${lesson}.md`)
            if (!body?.trim()) {
              await fs.rm(file, { force: true }) // empty note = no file, keeps journal tidy
            } else {
              await fs.mkdir(path.dirname(file), { recursive: true })
              await fs.writeFile(file, toMarkdown({ title, body }))
            }
            return send(res, 200)
          }

          if (req.method === 'POST' && req.url === '/api/log') {
            const events = [].concat(await readBody(req)) // accept one event or a batch
            await fs.appendFile(logFile, events.map((e) => JSON.stringify(e)).join('\n') + '\n')
            return send(res, 200)
          }

          return send(res, 404, { error: 'unknown ledger route' })
        } catch (err) {
          server.config.logger.error(`[ledger] ${err.stack ?? err}`)
          return send(res, 500, { error: String(err) })
        }
      })
    },
  }
}
