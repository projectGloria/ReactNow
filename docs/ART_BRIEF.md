# Art Brief — The Cartographer's Atlas of React

Raster art to replace the hand-coded SVG drawings. Generate with Gemini, drop the PNGs into
`art/raw/<folder>/<exact filename>`, then run `npm run art` (or tell Claude). The script keys out the white,
recolours engravings to the chart ink, trims, and writes WebPs to `src/assets/art/`; the app picks them up automatically.

## 0. Rules that apply to every image (read once)

1. **No text in any image.** No titles, labels, letters, numbers, "Terra Incognita", nothing.
   Generators mangle lettering, and every label in the app is live SVG text (selectable, crisp at any zoom,
   changes with progress). If Gemini sneaks in text, regenerate or say so and Claude will mask it.
2. **Pure white background (#FFFFFF) for every "ink" asset.** No paper texture, no shadow, no frame.
   `npm run art` turns white into transparency (colour-to-alpha), so the ink reads as printed on the chart and the
   chart's own paper shows through. Paper-on-paper would double the texture and look like a sticker.
   Coloured objects (seals, medals) also go on white; the same step keeps their colour.
3. **Centred subject, generous margin** (~10% empty white on every side). Claude crops; it can't un-crop.
4. **Highest resolution Gemini offers.** Minimums are listed per asset. Downscaling is free, upscaling isn't.
5. **Keep the style locked.** Generate the first island, then attach it as a reference image to every later
   prompt with: *"Match the exact engraving style, line weight and ink colour of the attached image."*
6. Deliver **PNG**. Claude converts to WebP and trims.

### Style preamble (prefix to every prompt unless the asset says otherwise)

> Victorian 1860s copperplate engraving for a Royal Geographical Society expedition chart. Fine
> cross-hatching and stipple shading, single dark sepia-brown iron-gall ink (#2b2118), no colour,
> no grey wash. Crisp hairlines, confident burin strokes, engraved-map aesthetic. Isolated on a pure
> white background, no paper texture, no border, no shadow, no text, no lettering, no numbers.

Where an asset says **"tinted"**, append instead:

> Hand-tinted with sparse, faded watercolour washes in verdigris green (#3f6b5c), oxblood (#7d1f1a) and
> old gilt (#b08d3c), as on an antique hand-coloured map. Ink lines stay dominant.

---

## 1. What stays vector (do NOT generate)

| Element | Why it stays SVG |
|---|---|
| All text (titles, annotations, legend, labels) | See rule 1. |
| Route line + ship's wake | Animated stroke-by-stroke (`pathLength` draw-on); a raster can't be inked progressively. |
| Border frame (the long edges) | The chart stretches to any screen shape (16:9 to 2.4:1). A raster frame would distort. Only the **corners** are raster (asset B6). |
| Rhumb lines, scale bar, prerequisite trails | Thin geometric lines; they must stay 1px-sharp at 3× zoom. |
| Visualizers (event loop, render timeline, etc.) | They are diagrams driven by live data. |
| Hover/lock states | "Unsurveyed" regions are the same island art with a CSS sepia/fade filter + SVG fog. No second set of images. |

---

## 2. Asset list — summary

Folder root: `art/raw/`. **Tier 1** gives the biggest visual jump; do it first.

| # | File | Aspect | Min px | Tier | Style |
|---|---|---|---|---|---|
| A1 | `paper/parchment.png` | 1:1 | 2048 | 1 | texture |
| A2 | `paper/foxing.png` | 16:9 | 2560×1440 | 2 | texture |
| A3 | `paper/journal-spread.png` | 16:9 | 2560×1440 | 1 | photo-real |
| A4 | `paper/ledger-page.png` | 3:4 | 1536×2048 | 3 | photo-real |
| A5 | `paper/card-back.png` | 3:4 | 1024×1365 | 3 | ink |
| B1 | `chart/compass-rose.png` | 1:1 | 1536 | 1 | tinted |
| B2 | `chart/cartouche.png` | 21:9 | 2520×1080 | 1 | ink |
| B3 | `chart/ship.png` | 1:1 | 1024 | 2 | ink |
| B4 | `chart/sea-serpent.png` | 3:2 | 1536×1024 | 2 | ink |
| B5 | `chart/wind-head.png` | 1:1 | 1024 | 3 | ink |
| B6 | `chart/frame-corner.png` | 1:1 | 1024 | 2 | ink |
| C0–C9 | `islands/p0.png` … `islands/cap.png` (10) | 1:1 | 1024 | P0,P1 = 1, rest = 2 | ink |
| D0–D9 | `plates/p0.png` … `plates/cap.png` (10) | 21:9 | 2560×1097 | P0,P1 = 1, rest = 3 | ink, faint |
| E1 | `plates/waypoint.png` | 1:1 | 768 | 2 | ink |
| E2 | `plates/customs-house.png` | 1:1 | 1024 | 2 | ink |
| F1 | `game/wax-seal.png` | 1:1 | 1024 | 1 | colour |
| F2–F7 | `game/rank-1.png` … `game/rank-6.png` (6) | 1:1 | 1024 | 2 | tinted |
| F8 | `game/lost.png` | 4:3 | 1600×1200 | 3 | ink |
| F9 | `game/favicon.png` | 1:1 | 1024 | 3 | colour |

**Total: 42 images** (Tier 1: 9 · Tier 2: 20 · Tier 3: 13).

---

## 3. Paper (folder `paper/`)

### A1 — `parchment.png` · 1:1 · ≥2048² · **Tier 1**
Base paper for the whole app and the sea. Tiled, so it must have **no** focal features.
Do **not** use the style preamble.

> Flat top-down scan of a sheet of aged Victorian rag paper, warm cream parchment (#efe3c6),
> extremely subtle fibre grain and faint mottling, very low contrast, perfectly even lighting,
> no stains, no folds, no edges, no vignette, no text, seamless tileable texture.

Notes: Gemini can't guarantee seamless edges. Claude makes it tile (offset + blend). If it comes back with
a big stain or a dark corner, regenerate; one blemish repeated 20× looks like wallpaper.

### A2 — `foxing.png` · 16:9 · ≥2560×1440 · Tier 2
Overlay laid on top of the chart with `multiply`, stretched to the edges. Adds age without tiling repetition.

> Pure white image with only age damage on it: scattered faint brown foxing spots, a few soft
> tea-coloured water stains concentrated toward the corners and edges, slightly darker
> sun-browned edges fading to pure white in the centre. Centre 60% almost completely clean white.
> No paper texture, no objects, no text.

### A3 — `journal-spread.png` · 16:9 · ≥2560×1440 · **Tier 1**
The Field Journal (lesson view) is an open book. Lesson text, editor and notes sit **on** the pages, so
the pages must be blank and evenly lit.

> Top-down photograph of an open Victorian explorer's field journal lying flat, filling the
> frame edge to edge. Two blank cream pages with a soft gutter shadow down the centre, slight
> page curvature, worn dark-brown leather cover just visible around the edges, a faded ribbon
> bookmark hanging from the top of the gutter. Pages completely blank: no writing, no lines,
> no drawings, no stains in the middle. Even soft lighting, no harsh shadows. No text.

Notes: the usable writing area on each page should be at least ~40% of the image width. If the cover
border is thicker than ~6% of the width, regenerate.

### A4 — `ledger-page.png` · 3:4 · ≥1536×2048 · Tier 3
Captain's Log background.

> Top-down scan of a single page from a Victorian ship's logbook: cream paper with faint
> printed ruled columns in pale red and pale blue ink, empty, no handwriting, no printed
> headings, no numbers. Slightly foxed edges. Even lighting. No text.

### A5 — `card-back.png` · 3:4 · ≥1024×1365 · Tier 3
Back face of the checkpoint flip cards (before you reveal the model answer).

> [Style preamble] An ornate banknote-style guilloché pattern filling a portrait card:
> interlocking engraved rosettes and fine spirograph lines, a decorative border, and an
> empty oval in the centre. Symmetrical. No text, no numbers, no portraits.

---

## 4. Chart ornaments (folder `chart/`)

### B1 — `compass-rose.png` · 1:1 · ≥1536² · **Tier 1** · tinted
It rotates (it leans toward the region you hover), so it must be **perfectly centred and radially
symmetric**.

> [Style preamble + tinted] A 32-point compass rose seen straight-on, perfectly centred and
> symmetrical. Ornate fleur-de-lis at the north point, alternating dark and light half-shaded
> points, concentric rings with fine degree tick marks, a small engraved rosette at the centre.
> No letters (no N, E, S, W), no numbers.

### B2 — `cartouche.png` · 21:9 · ≥2520×1080 · **Tier 1**
The title frame at the top of the chart. "The Cartographer's Atlas of React" gets typeset into the empty middle.

> [Style preamble] A wide ornate Victorian map title cartouche: an empty unrolled parchment
> banner or framed panel in the centre (leave the centre completely empty, at least 60% of
> the width), flanked by allegorical decoration: a sextant, a telescope, dividers, a globe,
> rope and acanthus scrollwork, a small anchor. Horizontally symmetrical. No text inside.

### B3 — `ship.png` · 1:1 · ≥1024² · Tier 2
Your position marker. It sails along the route at about 40 px on screen, so it needs a bold silhouette.

> [Style preamble] A small three-masted Victorian survey ship in full sail seen from the side,
> bow facing right, sitting on a few engraved wave strokes. Strong, clear silhouette.
> Centred with generous empty margin.

### B4 — `sea-serpent.png` · 3:2 · ≥1536×1024 · Tier 2
Lurks in the margin near your current frontier; it gets a gentle bobbing animation.

> [Style preamble] A sea serpent from an antique map: coiling scaled body arching through
> the waves in three humps, dragon-like head with a curled snout and fins, facing left,
> spouting a little water. Engraved wave strokes around the coils. Menacing but whimsical.

### B5 — `wind-head.png` · 1:1 · ≥1024² · Tier 3
A puffing wind cherub for an empty sea corner. Claude mirrors it for the opposite corner.

> [Style preamble] A classical wind-head from an old sea chart: a cherubic face with puffed
> cheeks blowing a stream of wind lines toward the right, curly hair, surrounded by soft
> engraved clouds.

### B6 — `frame-corner.png` · 1:1 · ≥1024² · Tier 2
One corner of the chart border. Claude mirrors it to all four corners and joins them with SVG rules.

> [Style preamble] The top-left corner ornament of a Victorian map border: a square corner
> block with an engraved rosette, from which two straight double-rule border lines run
> exactly horizontally to the right edge and exactly vertically to the bottom edge of the
> image. The lines must touch the image edges. Everything else pure white.

Notes: the rules **must** be perfectly straight and run off the image edges, or the joins won't line up.

---

## 5. Islands (folder `islands/`) — one per phase · 1:1 · ≥1024²

Each one replaces an island outline + its glyph on the world chart. It appears at about 160 px, and up to
about 900 px while the camera zooms in, so draw it as a **self-contained island seen from above at an
oblique bird's-eye angle**, with its landmark clearly readable small.

Common prompt (put the specific line from the table after it):

> [Style preamble] A small island on an antique sea chart, seen from a high oblique
> bird's-eye angle, roughly circular, surrounded by engraved coastline ripple lines fading
> into white sea. Centred, the island fills about 70% of the frame. The landmark on it:
> **[landmark line]**

| File | Phase | Landmark line (what it teaches, made visible) |
|---|---|---|
| `p0.png` | The Isle of Closures (JS gaps) | A rocky island whose cliffs curve around and almost close into a ring, enclosing a sheltered lagoon with a single lit lighthouse inside it. *(A closure: something kept alive inside an enclosing scope.)* |
| `p1.png` | Render Falls (rendering model) | A tall plateau with a broad waterfall pouring in several stacked tiers down to a pool, with mist and a small waterwheel at the base. *(Render cascades top-down; commit is where it lands.)* |
| `p2.png` | The Effect Marshes | Low marshland with reeds, winding channels, a rickety boardwalk and a few will-o'-the-wisp lights hovering. *(Effects: syncing with the murky world outside React.)* |
| `p3.png` | The State Citadel | A walled hilltop citadel with a central keep and concentric ramparts, a single gate road spiralling up. *(One source of truth, guarded.)* |
| `p4.png` | Harbour of Data & Forms | A busy harbour with a curved breakwater, wooden quays, cargo cranes, crates and two moored ships. *(Data coming in and out.)* |
| `p5.png` | The Performance Peaks | A jagged mountain range with three sharp peaks, a narrow switchback pass, and a small flag on the highest summit. |
| `p6.png` | The Typed Fortress | A star-shaped Vauban fortress with angular bastions, a moat and a drawbridge. *(Strict shapes, everything checked at the gate.)* |
| `p7.png` | The Next Frontier | A frontier settlement on the coast: a timber stockade, a railway line with a small steam locomotive heading inland, telegraph poles. *(Server and client, a new country.)* |
| `p8.png` | The Proving Grounds | A walled training field with archery targets, a measured range with marker posts, and a watchtower. *(Testing.)* |
| `cap.png` | Summit of the Capstone | A single towering snow-capped mountain rising from the sea, a winding expedition trail up its flank, a large banner planted on the peak. |

---

## 6. Region plates (folder `plates/`) — zoomed-in view · 21:9 · ≥2560×1097

When you click an island, the camera zooms and a full-screen "survey plate" of that region appears.
Lesson waypoints, trails and labels are drawn **on top** of it, in a horizontal band through the middle
(roughly 30%–70% of the height). So the plate must be **light and sparse in the middle band**:
terrain detail goes to the top edge and the bottom edge.

Claude also renders it at reduced opacity under the waypoints, but a busy centre still kills
readability, so regenerate if the middle is cluttered.

Common prompt:

> [Style preamble] A wide, detailed close-up survey map of one region, seen from directly
> above like a topographic chart, in sparse, delicate line work. Keep the central horizontal
> band (the middle 40% of the height) almost empty: open plain, calm water or faint
> contour lines only. Put denser terrain detail along the top and bottom edges. No roads
> crossing the centre, no text. The region: **[plate line]**

| File | Plate line |
|---|---|
| `p0.png` | The interior of a ring-shaped island: curving cliffs along the top and bottom edges, a calm lagoon across the middle, the lighthouse at the far right edge. |
| `p1.png` | A river valley: tiered waterfalls and cliffs along the top edge, a wide calm river plain through the middle, mist pools and a waterwheel at the bottom edge. |
| `p2.png` | Marshland: reed beds along top and bottom, open still water with faint ripples across the middle. |
| `p3.png` | A citadel plan: rampart walls along the top and bottom, an open parade ground across the middle. |
| `p4.png` | A harbour plan: quays and warehouses along the bottom, open harbour water across the middle, a breakwater along the top. |
| `p5.png` | A mountain range in contour lines: peaks along the top, foothills along the bottom, a high plateau across the middle. |
| `p6.png` | A star-fort plan: angular bastions along top and bottom, the open inner courtyard across the middle. |
| `p7.png` | Frontier country: forest and hills along the top, a railway along the bottom edge, open prairie across the middle. |
| `p8.png` | A proving ground: targets and watchtowers along the edges, an open measured field across the middle. |
| `cap.png` | The mountain's flank: crags and glaciers along the top, base camp tents along the bottom, open snowfield across the middle. |

### E1 — `plates/waypoint.png` · 1:1 · ≥768² · Tier 2
The marker for each lesson. The wax seal (F1) gets stamped on top when a lesson is mastered.

> [Style preamble] A single surveyor's cairn: a small neat stack of flat stones with a short
> wooden survey stake and a tiny pennant on top, seen from a slight oblique angle. Small,
> bold, simple silhouette.

### E2 — `plates/customs-house.png` · 1:1 · ≥1024² · Tier 2
The checkpoint gate at the end of each region.

> [Style preamble] A small Victorian colonial customs house at a border crossing: a
> classical stone building with columns and a pediment, a striped barrier pole lowered
> across the road in front, a flagpole beside it. Oblique view.

---

## 7. Game (folder `game/`)

### F1 — `wax-seal.png` · 1:1 · ≥1024² · **Tier 1** · colour (no style preamble)
Stamped on mastered lessons, passed checkpoints and the rank badge. Claude engraves the letter or glyph
into it with SVG, so the face must be **blank**.

> Photorealistic top-down view of a single blob of deep oxblood-red sealing wax (#7d1f1a),
> pressed flat with a blank, smooth circular seal impression in the middle (no letter, no
> crest, no pattern), irregular organic edges with a few small drips, soft glossy highlights.
> Isolated on pure white, no shadow, no ribbon, no paper.

### F2–F7 — rank insignia · 1:1 · ≥1024² · Tier 2 · tinted
Shown in the header next to your rank. They should read as a **set**: same medal shape and same
hanging ribbon, with a different emblem on each. Generate rank 1, then attach it as the reference for
the rest.

Common prompt:

> [Style preamble + tinted] A Victorian expedition medal, front view, perfectly centred: a
> round medal hanging from a short striped ribbon, raised engraved emblem on the medal face:
> **[emblem]**. No text, no inscription on the rim.

| File | Rank | Emblem | Metal |
|---|---|---|---|
| `rank-1.png` | Deckhand | a coiled rope tied in a reef knot | iron |
| `rank-2.png` | Apprentice Surveyor | a brass pocket compass | bronze |
| `rank-3.png` | Surveyor | a theodolite on a tripod | bronze |
| `rank-4.png` | Cartographer | a quill crossed with map dividers over a scroll | silver |
| `rank-5.png` | Expedition Leader | a telescope crossed with a planted flag | silver |
| `rank-6.png` | Fellow of the RGS | a laurel wreath around a globe | gold |

### F8 — `lost.png` · 4:3 · ≥1600×1200 · Tier 3
For the "Off the edge of the map" page (a bad URL).

> [Style preamble] The edge of the world on an antique flat-earth chart: the sea pouring
> off a cliff edge into a starry void, a small ship teetering at the brink, a sea monster
> peering up from below the edge.

### F9 — `favicon.png` · 1:1 · ≥1024² · Tier 3 · colour
Browser tab icon. It must still read at 32 px.

> A single oxblood wax seal with a simple bold compass star pressed into it, flat front
> view, very simple, high contrast, isolated on pure white. No text.

---

## 8. Workflow

1. Do **Tier 1** first (9 images: A1, A3, B1, B2, C0, C1, D0, D1, F1; make C0 first, it is the
   style reference for the rest). That's enough to judge whether the look works before you spend time on the rest.
2. Name the files exactly as listed and drop them in `art/raw/<folder>/`, then `npm run art`.
3. Tell Claude: "art batch 1 is in". Claude will:
   - trim and convert to WebP, cut out the white on coloured assets;
   - wire each in through a single manifest, **with the current SVG as fallback** when a file is
     missing, so a half-delivered set never breaks the chart;
   - check every view at 2 screen shapes and report what doesn't fit (e.g. a cluttered plate centre).
4. Reject and regenerate rather than "fix it in code": wrong angle, text in the image, off-centre compass,
   or a non-white background cost more to patch than to re-roll.
