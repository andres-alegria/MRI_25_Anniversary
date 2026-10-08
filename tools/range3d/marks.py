"""
People and animals on the clips, from the Noun Project library.

A clip stands its people and animals upright on the ground, facing the reader,
as billboards: the ground is built in the projection, the things that are read
rather than seen are not. Until now each was drawn here by hand. This module
places a library silhouette instead, by *role* — a walker, a trekker, a gaur —
scaled to the role's size, standing on its point, turned to face either way,
with a contact shadow and a thin halo so it holds against snow as well as
forest.

A role draws on one or more *slots* in tools/noun-icons.json; a slot names the
Noun Project icon chosen for it and carries its credit. Slots are filled when
an icon is chosen (`python3 tools/noun.py use SLOT ID "note"`), never while
drawing, so parallel renders only ever read the manifest.

Icons are opt-in: `--icons` on the command line, or MRI_ICONS=1. Two licence
questions to Noun Project are still open — whether an icon may be modified, and
whether finished artwork carrying icon geometry may sit in a public repository
— so the clips the page serves keep the hand-drawn marks until both are
answered. The icon files live in the git-ignored cache; where a slot or its
file is missing, mark() returns None and the caller draws the old mark, so a
fresh clone of this repository still renders.

The set (October 2026): people by Gan Khoon Lay (leremy), one hand for every
human role; animals from izwarm's Mammal Glyph set, yaks from AmethystStudio
(izwarm has none); falcons from prosymbols' Eagles Glyph set. The weather mast
and the snow stakes stay drawn: the library has no stake at all, and its
weather stations are instrument close-ups that do not read as a field station
standing in a landscape.
"""
import os
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))   # tools/
import noun as N                                                             # noqa: E402
import iconkit as KIT                                                        # noqa: E402

ENABLED = '--icons' in sys.argv or os.environ.get('MRI_ICONS') == '1'

# role -> (slots, height as a share of a standing person, palette key)
# Heights are of the icon's whole silhouette, props included — adjust sizes here.
# The plate draws its marks at its own sizes (height=), using the same roles.
ROLES = {
    'walker':  (('walker/1', 'walker/2', 'walker/3'), 1.00, 'figure'),
    'trekker': (('trekker/1', 'trekker/2'), 1.02, 'figure'),
    'standing': (('trekker/3',), 1.02, 'figure'),
    'painter': (('painter',), 1.10, 'figure'),
    'planter': (('planter',), 0.62, 'figure'),
    'gaur':    (('gaur',), 0.92, 'animal'),
    'cattle':  (('cattle/1', 'cattle/2'), 0.84, 'animal'),
    'buffalo': (('buffalo',), 0.78, 'animal'),
    'elephant': (('elephant',), 1.40, 'animal'),
    'llama':   (('llama',), 1.00, 'animal'),
    'yak':     (('yak/1', 'yak/2'), 0.90, 'yak'),
    'falcon':  (tuple('falcon/%d' % i for i in range(1, 10)), 1.0, 'ink'),
}
# How much larger than true scale the library marks are drawn. At true scale a
# person on a clip is 38 px of an 1800 px drawing, which the page shows at a
# third of that: correct, and too small to see. The marks are read rather than
# measured, so they are exaggerated, as the motifs already are. One knob for
# the clips, one for the plate; MRI_ICON_SCALE / MRI_PLATE_ICON_SCALE override
# them for a test render — adjust here.
EXAG = float(os.environ.get('MRI_ICON_SCALE', '1.0'))
EXAG_PLATE = float(os.environ.get('MRI_PLATE_ICON_SCALE', '1.0'))
HALO = 0.8          # px of halo outside the silhouette, in the paper colour — adjust here
HALO_OPACITY = 0.8  # — adjust here
SHADOW = 0.42       # opacity of the contact shadow — adjust here
# Which way each icon faces as drawn, for callers that say which way an animal
# should face rather than whether to mirror it. Anything not listed faces right.
FACES_LEFT = {'yak/1', 'yak/2'}

_geo = {}


def _geometry(slot):
    """(inner markup, bounds) for a slot, or None if it is not chosen or not cached."""
    if slot in _geo:
        return _geo[slot]
    ent = N.manifest().get(slot)
    f = N.CACHE / 'svg' / ('%s.svg' % ent['id']) if ent else None
    if not f or not f.exists():
        _geo[slot] = None
        return None
    _, inner = N.normalise(f.read_text())
    pts = [p for d in re.findall(r'<path[^>]*\sd="([^"]+)"', inner)
           for _, ps in KIT._walk(d) for p in ps]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    _geo[slot] = (inner, (min(xs), min(ys), max(xs), max(ys)))
    return _geo[slot]


def available(role):
    return ENABLED and any(_geometry(s) for s in ROLES[role][0])


def mark(role, x, y, P, person_h, flip=False, pick=None, anchor='bottom', shadow=True,
         scale=1.0, colour=None, opacity=1.0, width=None, halo=True, height=None,
         halo_colour=None, halo_opacity=None, face=None, exag=None):
    """The silhouette for `role` standing on (x, y), or None to fall back.

    person_h is the height of a standing person at this spot, in px; the role's
    own share of it sets the icon's height. pick chooses among the role's
    variants (by index, wrapped); left to itself it varies with position, so a
    group is a group of different people without the caller saying so.
    width, when given, sizes by width instead — a bird is known by its span;
    height sets the height outright, as the plate does at its own scale.
    halo is True for the standard halo, a number for a halo of that many px,
    or False. face=+1/-1 asks for an animal facing right/left, whichever way
    its icon happens to be drawn; it overrides flip. exag is the exaggeration
    over true scale, EXAG unless the caller (the plate) says otherwise."""
    if not ENABLED:
        return None
    slots, share, key = ROLES[role]
    ok = [s for s in slots if _geometry(s)]
    if not ok:
        return None
    i = (int(abs(x) / 7) if pick is None else pick) % len(ok)
    inner, (x0, y0, x1, y1) = _geometry(ok[i])
    if face is not None:
        flip = (face < 0) != (ok[i] in FACES_LEFT)
    ex = EXAG if exag is None else exag
    h = (height if height else person_h * share * scale) * ex
    s = width * ex / max(x1 - x0, 1e-6) if width else h / max(y1 - y0, 1e-6)
    w = (x1 - x0) * s
    cx = (x0 + x1) / 2
    ty = y - (y1 if anchor == 'bottom' else (y0 + y1) / 2) * s
    tf = ('translate(%.2f %.2f) scale(%.5f %.5f)' % (x + cx * s, ty, -s, s) if flip else
          'translate(%.2f %.2f) scale(%.5f)' % (x - cx * s, ty, s))
    col = colour or P[key]
    out = []
    if shadow and anchor == 'bottom':
        rx = w * (0.30 if key == 'figure' else 0.42)
        out.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="%s" fill-opacity="%.2f"/>'
                   % (x, y, rx, rx * 0.30, P['shade'], SHADOW))
    # the halo is a stroke drawn behind the fill (paint-order), so the
    # silhouette keeps its own shape; its width is set in the icon's units
    op = '' if opacity >= 1 else ' opacity="%.2f"' % opacity
    if halo:
        hw = HALO if halo is True else float(halo)
        out.append('<g transform="%s" fill="%s" stroke="%s" stroke-width="%.3f" stroke-opacity="%.2f" '
                   'stroke-linejoin="round" paint-order="stroke"%s>%s</g>'
                   % (tf, col, halo_colour or P['paper'], 2 * hw / s,
                      HALO_OPACITY if halo_opacity is None else halo_opacity, op, inner))
    else:
        out.append('<g transform="%s" fill="%s"%s>%s</g>' % (tf, col, op, inner))
    return ''.join(out)


def size(role, person_h, pick=0, height=None, exag=None):
    """(width, height) in px that mark() would give, for spacing a group."""
    slots, share, _ = ROLES[role]
    ok = [s for s in slots if _geometry(s)]
    if not ok:
        return person_h * 0.5, person_h
    _, (x0, y0, x1, y1) = _geometry(ok[pick % len(ok)])
    h = (height if height else person_h * share) * (EXAG if exag is None else exag)
    return (x1 - x0) * h / (y1 - y0), h
