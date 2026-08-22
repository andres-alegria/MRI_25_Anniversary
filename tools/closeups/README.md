# Story close-ups

One featured image per story: the survey sheet windowed around that story's
station at three times the sheet's scale, with the story's own motifs drawn in.
They double as chapter-opener illustrations for the print edition.

    tools/closeups/render.sh light      # 25 SVG + PNG into closeups/
    tools/closeups/render.sh dark       # the night printing

- `figures.js`, `built.js`, `instruments.js`, `ice.js`, `land.js` — the motif
  library, 85 ink-on-paper drawings. Each is `name(ctx, x, y, k, opts)` and
  returns SVG. See `MOTIF-CONTRACT.md` before adding one, and preview a group
  with `node motif-contact-sheet.js <group.js>`.
- `compositions.js` — which motifs each story gets and where, relative to its
  station. `hero: true` marks the one motif drawn largest and last;
  `snap: 'river'` / `'glacier'` puts water and ice motifs on the drawn
  watercourses; `win: {dx, dy}` nudges the window.
- `composer.js` — places the scene: scales the motifs for the close-up, clamps
  them onto the terrain and off the glacier, gives each a local ground colour.

The renderer lives in `plate.js` (`SURVEY_FOCUS`). The site does not load any
of this yet: the close-ups are produced offline and shipped as files.
