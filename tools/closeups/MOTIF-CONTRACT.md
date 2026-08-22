# Motif contract — ink-on-paper line drawings for a scientific survey plate

You are drawing small vector motifs that will be placed onto a hand-drawn-looking
mountain survey sheet (think 1918 Swiss glacier maps: fine ink linework on paper,
restrained colour). They must look DRAWN, not like flat icons or clip-art.

## Function signature (JavaScript, classic script — no modules, no imports)

    window.MRI_MOTIFS = Object.assign(window.MRI_MOTIFS || {}, {
      motifName(ctx, x, y, k, opts) { ... return svgString; },
      ...
    });

- `ctx`  = { S, rand, MIX }   S is the palette (below); rand() is a seeded 0..1
           random — USE IT for hand-jitter so lines are never perfectly regular;
           MIX(hexA, hexB, t) blends two hex colours.
- `(x, y)` = the point the motif STANDS ON (its base centre), in plate units.
- `k`    = scale. At k = 1 a standing adult is ~22 units tall. Draw everything
           relative to k so the composer can scale you.
- `opts` = optional object; support `opts.flip` (mirror horizontally) where it
           makes sense. You may read other opts you define; document them.
- Return a string of SVG elements (NO outer <svg>). Group in one <g>.
- Every number in the output must be fixed to 1 decimal: use `.toFixed(1)`.
- Escape nothing; output no text (no <text> elements at all).

## Palette — use ONLY these keys, via ctx.S
  ink        main drawing ink           (dark on the day sheet, light on the night sheet)
  inkSoft    secondary ink
  paper      the sheet colour  — use as the knock-out fill behind a motif
  paperHigh  snow / highlight white
  water      rivers, lakes, rain
  waterPale  water's light body colour
  ice        glacier body
  iceLine    crevasse / ice line colour
  sage       vegetation tint (light)
  sageDeep   vegetation line colour
  moraine    rubble, soil, earth
  stone      bare rock tint
  red        the SURVEYOR'S red — only for measurement marks: stakes, tape lines,
             survey flags, a single accent. Never for whole objects.
  blue       the institutional blue — at most one small accent, usually none.
  shade      shadow fill (use with fill-opacity 0.04–0.10)

NEVER hard-code colours. The same motif must print on a dark sheet too.

## Style rules
- Stroke weights 0.5 to 1.2 (in plate units). Hairlines 0.45–0.6 for detail,
  0.9–1.2 for a main contour. stroke-linecap round, stroke-linejoin round.
- Prefer open strokes to filled shapes. Fills: paper (to knock out texture
  behind a building), paperHigh (snow), waterPale/ice (water bodies), shade at
  low opacity, or MIX(paper, ink, 0.06) for a wall. No saturated fills.
- Use rand() for jitter: a roof ridge that is 0.5 off, strokes that vary in
  length, dots that scatter. Hand-drawn, not CAD.
- Suggest volume with a few hatching strokes on one side (light comes from the
  upper left: shade the RIGHT/lower side).
- Ground contact: draw a short broken ground line or a few stones at the base
  so the thing sits on the terrain rather than floating.
- Keep each motif under ~50 elements. Small and crisp beats elaborate.
- Figures: simple but human — head circle, torso line, limbs in motion; a hat,
  a load, a tool. No faces.

## Self-test (required)
Run:   node tools/closeups/motif-contact-sheet.js <yourfile.js>
It writes <yourfile>.contact.svg and rasterizes it to <yourfile>.contact.jpg
(light palette, every motif at k=1 and k=1.6 on a paper ground). READ the jpg
with your Read tool and LOOK at it. Fix what looks like clip-art, what floats,
what is too regular. Iterate at least twice. Then run it once with THEME=dark
(env var) and check the dark contact sheet reads too.

Reference of the sheet's drawing register (look at it before you start):
(render the survey sheet with ?style=survey and look at the summit)
