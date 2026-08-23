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
- Stroke weights: 0.45 hairline (detail), 0.7 secondary, 1.0–1.1 main contour.
  The ink engine (ink.js) quantises every stroke to exactly those three
  weights IN SHEET UNITS — a motif drawn at k = 2.7 gets the same line as one
  at k = 1 — bends each stroke with a slow hand-wobble, and draws contours as
  tapered ribbons. So: do NOT add per-vertex jitter yourself (a 0.05 nudge at
  most), and do not thicken strokes for big motifs. Use the three classes
  deliberately: contour for the object's silhouette, secondary for structure,
  hairline for texture.
- Prefer open strokes to filled shapes. Fills: paper (to knock out texture
  behind a building), paperHigh (snow), waterPale/ice (water bodies), shade at
  low opacity as a FLAT polygon, or MIX(paper, ink, 0.06) for a wall. No
  saturated fills. NEVER a translucent ellipse as a shadow — the engine deletes
  them; a printed sheet has no feathered tone.
- Use rand() for VARIATION, not jitter: a roof ridge that is 0.5 off, strokes
  that vary in length, a door on the other side, one window instead of two.
  Two calls of the same motif must not produce the same drawing.
- Suggest volume with a few hatching strokes on one side (light comes from the
  upper left: shade the RIGHT/lower side). Hatch at 45–60°, never 90°, and let
  the strokes tighten toward the shadow core.
- Ground contact: a short broken ground line only. NO pebbles, NO shadow
  ellipse. The composer ties the motif to the sheet's own hachures.
- Keep each motif under ~60 elements. Small and crisp beats elaborate.
- Overlap: when a motif has several parts (a hamlet, a group), draw the far
  ones first and knock out paper behind the near ones so nothing shows
  through. No outline may be visible through the thing in front of it.

## Figures — period staffage, NOT stick figures
A 19th-century survey engraver drew a person as a small SOLID INK SILHOUETTE:
hat, head, coat and legs as one filled blot, four to six strokes, no outline,
no circle for a head, no faces. That is the only way people appear on these
sheets. Recipe, at k = 1 (a standing adult is 16 units tall — smaller than
before; people on a survey sheet are small):
- ONE closed filled path in S.ink: a flat brimmed hat (a short wide wedge) or
  a cap, a small head blob that merges into it, a neck that narrows, shoulders,
  a coat widening to the hem at mid-thigh, and legs as two tapered wedges —
  one forward of the other so the figure has a stride or a stance. Hem and
  brim are the only straight-ish lines; everything else is a gentle curve.
- A second small filled shape for a load (rucksack, basket, jug, bundle)
  separated from the body by a hairline gap in S.paper (draw the gap as a
  paper stroke 0.45 wide between the two fills). At most one such gap on the
  figure itself (collar or hem) — engravers left a light line there.
- Tools are hairlines: an alpenstock 0.45 wide and taller than the figure,
  a hoe, a rope as a sagging hairline between two people.
- Posture is the whole expression: lean forward under a load, weight on one
  hip when standing, arm up to shade the eyes, bent double over a hoe, a child
  as a smaller blot with a shorter stride. Vary proportion by rand() ±8 %.
- No interior lines, no hatching, no eyes, no hands: the blot does the work.
  Read the old Agassiz/Whymper plates in your mind: tiny dark people against
  pale ice.
- Groups: 2–5 blots at slightly different sizes and stances, overlapping is
  fine (they are all ink), never two identical.

## Self-test (required)
Run:   node tools/closeups/motif-contact-sheet.js <yourfile.js>
It writes <yourfile>.contact.svg and rasterizes it to <yourfile>.contact.jpg
(light palette, every motif at k=1 and k=1.6 on a paper ground). READ the jpg
with your Read tool and LOOK at it. Fix what looks like clip-art, what floats,
what is too regular. Iterate at least twice. Then run it once with THEME=dark
(env var) and check the dark contact sheet reads too.

Reference of the sheet's drawing register (look at it before you start):
(render the survey sheet with ?style=survey and look at the summit)
