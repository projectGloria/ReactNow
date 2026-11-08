// scripts/ink-art.mjs — `npm run art`
// ---------------------------------------------------------------------------
// Turns Gemini's raw PNGs (art/raw/<folder>/<name>.png) into app-ready WebPs
// (src/assets/art/<folder>/<name>.webp).
//
// Why not just CSS `mix-blend-mode: multiply` on the white-background art?
// Because blending only sees the backdrop *inside its isolation group*. The
// moment an island's <g> gets opacity (dimmed) or a transform (hover lift),
// the group is isolated, the image multiplies against transparent, and the
// white square shows up. Real alpha composites correctly everywhere.
//
// "Colour to alpha" (the GIMP algorithm, white as the key colour):
// treat each pixel C as foreground F composited over white with alpha a:
//     C = a·F + (1 − a)·255
// The smallest a that keeps F in gamut is a = (255 − min(R,G,B)) / 255,
// and F = (C − (1 − a)·255) / a. Over white it reproduces the original pixel
// exactly; over parchment it reads like ink printed on the page.
// ---------------------------------------------------------------------------
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const RAW = 'art/raw'
const OUT = 'src/assets/art'
const INK = [0x2b, 0x21, 0x18] // --ink: iron-gall brown, so engravings match the SVG linework

/**
 * Per-folder recipe.
 *  alpha:  key out the white background
 *  ink:    recolour to a single ink tone (monochrome engravings only)
 *  trim:   crop to the drawn content (keeps a small pad)
 *  max:    longest side in px after processing
 */
const RECIPES = {
  paper: { alpha: false, ink: false, trim: false, max: 2560 },
  chart: { alpha: true, ink: true, trim: true, max: 1536 },
  islands: { alpha: true, ink: true, trim: false, max: 1024 }, // no trim: every island must share one frame so sizes stay comparable
  plates: { alpha: true, ink: true, trim: false, max: 2560 },
  game: { alpha: true, ink: false, trim: true, max: 1024 },
}
// Per-asset overrides on top of the folder recipe.
const OVERRIDES = {
  'chart/compass-rose': { ink: false, max: 768 }, // tinted: keep the watercolour washes
  'game/wax-seal': { max: 384 }, // drawn ≤ 60px, up to 64 on screen: a small decode, shared by all
  'paper/foxing': { alpha: true, max: 1376 }, // stains only: keyed so the chart's own paper shows through
  'chart/ship': { max: 384 }, // drawn ~80 units wide
  'chart/frame-corner': { trim: false, max: 1024 }, // untrimmed: the rule offsets (94-187px) are measured in raw pixels
  // Plate icons, not plate backdrops: trimmed so the box fits the drawing.
  'plates/waypoint': { trim: true, max: 256 }, // drawn ~70 units, up to ~2x zoom on a retina screen
  'plates/customs-house': { trim: true, max: 512 },
  // Rank medals render at 40px in the header and 28px in the log: 256 covers 3x DPR.
  ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((n) => [`game/rank-${n}`, { max: 256 }])),
}
// Extra outputs cut from a raw file. The journal spread is a fixed 16:9 photo,
// but the lesson book is variable-height with asymmetric columns, so only a
// clean page crop is usable (as paper texture).
const DERIVED = {
  'paper/journal-page': { from: 'paper/journal-spread.png', extract: { left: 760, top: 64, width: 520, height: 630 } },
}

/** @param rel raw file  @param key output key (differs for DERIVED crops)  @param extra recipe additions */
async function processFile(rel, key = rel.replace(/\.\w+$/, ''), extra = {}) {
  const folder = rel.split('/')[0]
  if (!RECIPES[folder]) return console.warn(`skip ${rel}: unknown folder`)
  const r = { ...RECIPES[folder], ...OVERRIDES[key], ...extra }
  const ink = r.ink

  let img = sharp(path.join(RAW, rel)).removeAlpha()
  if (r.extract) img = sharp(await img.extract(r.extract).toBuffer())
  if (r.alpha) {
    const { data, info } = await img.raw().toBuffer({ resolveWithObject: true })
    const out = Buffer.alloc(info.width * info.height * 4)
    for (let i = 0, o = 0; i < data.length; i += 3, o += 4) {
      const R = data[i], G = data[i + 1], B = data[i + 2]
      // Anything within 6 of white is paper, not ink: kills JPEG-ish halo noise.
      const lo = Math.min(R, G, B)
      const a = lo >= 249 ? 0 : (255 - lo) / 255
      if (a === 0) continue // stays fully transparent (Buffer.alloc is zeroed)
      if (ink) {
        out[o] = INK[0]; out[o + 1] = INK[1]; out[o + 2] = INK[2]
      } else {
        out[o] = Math.round((R - (1 - a) * 255) / a)
        out[o + 1] = Math.round((G - (1 - a) * 255) / a)
        out[o + 2] = Math.round((B - (1 - a) * 255) / a)
      }
      out[o + 3] = Math.round(a * 255)
    }
    img = sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  }
  if (r.trim) img = sharp(await img.png().toBuffer()).trim({ threshold: 1 }).extend({ top: 8, bottom: 8, left: 8, right: 8, background: { r: 0, g: 0, b: 0, alpha: 0 } })
  img = img.resize({ width: r.max, height: r.max, fit: 'inside', withoutEnlargement: true })

  const dest = path.join(OUT, `${key}.webp`)
  await fs.mkdir(path.dirname(dest), { recursive: true })
  // alphaQuality 100: alpha *is* the linework here; lossy alpha smears hairlines.
  const info = await img.webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(dest)
  console.log(`${rel}${extra.extract ? ' (crop)' : ''} -> ${dest}  ${info.width}x${info.height}  ${(info.size / 1024).toFixed(0)} KB`)
}

const files = (await fs.readdir(RAW, { recursive: true }))
  .map((f) => f.split(path.sep).join('/'))
  .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
// `npm run art -- islands/p1` processes only matching files.
const only = process.argv[2]
for (const f of files) if (!only || f.includes(only)) await processFile(f)
for (const [key, d] of Object.entries(DERIVED))
  if (files.includes(d.from) && (!only || key.includes(only) || d.from.includes(only))) await processFile(d.from, key, { extract: d.extract })
