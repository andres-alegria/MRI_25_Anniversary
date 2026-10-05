"""
The chassis the flat vignettes are built on.

A scene is a ground line and things standing on it. That is nearly the whole
idea: `Scene.ground()` lays a profile across the frame and fills beneath it,
`Scene.y(x)` says how high the ground is at any point, and every pictogram is
placed by asking that question. Change the profile and the village, the forest
and the water move with it.

Three devices do most of the storytelling, because what these stories are about
is change rather than scenery:

  ghost()   a former state drawn over the present one — a dashed line where a
            surface used to be, with the difference hatched between them. It is
            how the glacier shows its thinning and the settlement its growth.
  bands()   zones painted along the ground with their names, for anything
            stacked by elevation: vegetation belts, fallow ages, who has access.
  sub()     layers below the ground line, for soil, permafrost and aquifers.

Tones are mixed toward the sky for distance and toward `shade` for weight,
never toward `ink` or `paper`, because those two swap places between the dark
plate and the paper one.
"""
import numpy as np

import svgkit as K
import labels as LB
import render as R

f1 = K.f1
W, H = 1800, 1300

# --- weights, adjusted here -------------------------------------------------
LINE = 3.2                     # pictogram line weight
DETAIL = 2.4                   # linework inside the landscape
LABEL = 23                     # the few words a vignette is allowed


def P():
    return R.PAL


def mix(a, b, t):
    a = a.lstrip('#'); b = b.lstrip('#')
    return '#%02x%02x%02x' % tuple(
        round(int(a[i:i + 2], 16) * (1 - t) + int(b[i:i + 2], 16) * t) for i in (0, 2, 4))


def recede(col, t):
    """Toward the sky: distance."""
    return mix(col, P()['sky1'], t)


def weigh(col, t):
    """Toward shade: nearness, mass, the ground under your feet."""
    return mix(col, P()['shade'], t)


def poly(pts, close=True):
    return 'M' + ' L'.join('%s %s' % (f1(x), f1(y)) for x, y in pts) + ('Z' if close else '')


def curve(pts, close=False):
    return K.d_smooth(np.asarray(pts, float), close, 1.0)


def at_x(profile, x):
    a = np.asarray(profile, float)
    return float(np.interp(x, a[:, 0], a[:, 1]))


class Scene:
    """One vignette: layers, a ground profile, and helpers to stand on it."""

    LAYERS = ['Sky', 'Far', 'Ground', 'Sub', 'Bands', 'Water', 'Detail', 'Ghost',
              'Flora', 'Built', 'Figures', 'Air', 'Fore', 'Labels', 'Title']

    def __init__(self):
        self.doc = K.Doc(W, H, P()['sky1'])
        for n in self.LAYERS:
            self.doc.layer(n)
        self.profile = [(0, 900), (W, 900)]
        self.air()

    def air(self, clouds=True, seed=5):
        """Sixty per cent of every frame is sky, so it is given something to do:
        a vertical fall of tone toward the top, and a few bars of cloud lying
        across the light. Not objects — atmosphere."""
        top, low = weigh(P()['sky1'], 0.34), P()['sky1']
        self.doc.defs.append(
            f'<linearGradient id="air" x1="0" y1="0" x2="0" y2="1">'
            f'<stop offset="0" stop-color="{top}"/>'
            f'<stop offset="0.72" stop-color="{low}"/>'
            f'<stop offset="1" stop-color="{mix(low, P()["light"], 0.07)}"/></linearGradient>')
        self.doc.layer('Sky').append(f'<rect width="{W}" height="{H}" fill="url(#air)"/>')
        if not clouds:
            return
        rng = np.random.default_rng(seed)
        col = mix(P()['sky1'], P()['light'], 0.5)
        for _ in range(4):
            cx = float(rng.uniform(120, W - 120))
            cy = float(rng.uniform(110, 430))
            op = float(rng.uniform(0.05, 0.085))
            # a cloud is a run of overlapping lozenges, not a bar: a rectangle at
            # this opacity reads as an underline across the sky
            parts = []
            n = int(rng.integers(4, 7))
            for i in range(n):
                t = i / (n - 1) - 0.5
                rx = float(rng.uniform(70, 150)) * (1.0 - 0.5 * abs(t))
                ry = float(rng.uniform(11, 20)) * (1.0 - 0.45 * abs(t))
                parts.append(f'<ellipse cx="{f1(cx + t * 300)}" cy="{f1(cy + rng.uniform(-6, 6))}" '
                             f'rx="{f1(rx)}" ry="{f1(ry)}"/>')
            self.doc.layer('Sky').append(
                f'<g fill="{col}" fill-opacity="{op:.3f}">{"".join(parts)}</g>')

    # -- helpers ------------------------------------------------------------
    def L(self, name):
        return self.doc.layer(name)

    def y(self, x):
        return at_x(self.profile, x)

    def put(self, layer, markup):
        self.L(layer).append(markup)

    def shape(self, layer, pts, fill, op=1.0, smooth=False):
        d = curve(pts, True) if smooth else poly(pts, True)
        self.L(layer).append(f'<path d="{d}" fill="{fill}" fill-opacity="{op}"/>')

    def stroke(self, layer, d, col, w=DETAIL, dash=None, op=1.0):
        da = f' stroke-dasharray="{dash}"' if dash else ''
        self.L(layer).append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" '
                             f'stroke-opacity="{op}"{da} stroke-linecap="round" stroke-linejoin="round"/>')

    def text(self, x, y, s, col=None, size=LABEL, anchor='start', italic=True):
        self.L('Labels').append(LB.halo(x, y, s, P(), size, col=col or P()['inkSoft'],
                                        italic=italic, anchor=anchor))

    # -- the landscape ------------------------------------------------------
    def sky(self, peaks, base=1340, snow=True):
        """Ranges rather than peaks.

        Each entry is still (centre, half-width, summit, distance), but it now
        produces a whole ridgeline across the frame that happens to be highest
        there — built from a fall-away curve with two octaves of ridge detail on
        it. A row of identical triangles was the most pasted-looking thing in
        the set; a skyline has silhouette interest of its own."""
        for (xm, half, top, t) in peaks:
            t = min(t, 0.60)
            rng = np.random.default_rng(int(abs(xm) * 13 + top))
            ph = rng.uniform(0, 6.3, 4)
            pts = []
            for x in range(-80, W + 160, 34):
                d = min(1.0, abs(x - xm) / max(half * 2.3, 1.0))
                y = top + (base - top) * d ** 1.25
                amp = (1 - d) * 0.55 + 0.45
                y -= amp * (46 * np.sin(x / 190.0 + ph[0]) + 24 * np.sin(x / 83.0 + ph[1])
                            + 11 * np.sin(x / 37.0 + ph[2]))
                pts.append((x, y))
            self.shape('Far', pts + [(W + 160, H), (-80, H)], recede(P()['rock'], t))
            if snow:
                cap, out = [], []
                for (x, y) in pts:
                    if abs(x - xm) < half * 0.8 and y < top + (base - top) * 0.30:
                        cap.append((x, y))
                        out.append((x, y + 38 + 26 * np.sin(x / 29.0 + ph[3])))
                if len(cap) > 2:
                    # distant snow is dulled hard: a bright cap on a far ridge
                    # reads as foreground and pulls the eye out of the picture
                    self.shape('Far', cap + list(reversed(out)), recede(P()['snow'], 0.30 + t * 0.62))

    def ground(self, profile, col=None, weight=0.30, outline=True, step=10, fore=True):
        """The ground line, and the mass beneath it."""
        self.profile = profile
        xs = list(range(0, W + 1, step))
        pts = [(x, self.y(x)) for x in xs]
        # The smoothing trims half a step off each end and rounds whatever it is
        # given, so the profile is carried past both edges and the mass is closed
        # with straight lines. Smoothing the closing corners turned every frame
        # into a boat hull.
        run = [(-40, self.y(0))] + pts + [(W + 40, self.y(W))]
        d = (curve(run) + 'L%s %s L%s %s Z' % (f1(W + 40), f1(H), f1(-40), f1(H)))
        self.L('Ground').append(f'<path d="{d}" fill="{col or weigh(P()["rock"], weight)}"/>')
        if outline:
            self.stroke('Ground', curve(run), P()['inkSoft'], 3.0, op=0.7)
        if fore and max(y for _x, y in pts) < 1150:
            self.near()

    def near(self, h=120, seed=9):
        """A dark, slightly warm edge of ground at the very bottom of the frame.

        The set had everything in one narrow band of cool mid-tones; this is the
        near end of a value ladder, and it gives the picture a floor to stand on."""
        rng = np.random.default_rng(seed)
        ph = rng.uniform(0, 6.3, 2)
        top = [(x, H - h + 16 * np.sin(x / 210.0 + ph[0]) + 7 * np.sin(x / 64.0 + ph[1]))
               for x in range(-40, W + 80, 40)]
        self.shape('Fore', top + [(W + 80, H + 10), (-40, H + 10)],
                   mix(weigh(P()['rock'], 0.62), P()['soil'], 0.22))

    def sub(self, layers, step=24):
        """Bands below the ground: soil, permafrost, an aquifer.
        Each is (depth below the surface, colour, optional name)."""
        xs = list(range(0, W + 1, step))
        depth = 0
        for d, col, name in layers:
            top = [(x, self.y(x) + depth) for x in xs]
            bot = [(x, self.y(x) + depth + d) for x in reversed(xs)]
            self.shape('Sub', top + bot, col, smooth=True)
            if name:
                self.text(70, self.y(70) + depth + d * 0.62, name, size=LABEL - 4)
            depth += d

    def bands(self, stops, thickness=86, names=True, step=10):
        """Zones along the ground, each (x0, x1, colour, name).

        Everything these stories stack by elevation goes here: vegetation
        belts, fallow ages, who is free to be where."""
        for (x0, x1, col, name) in stops:
            xs = list(range(int(x0), int(x1) + 1, step))
            if len(xs) < 2:
                continue
            top = [(x, self.y(x)) for x in xs]
            bot = [(x, self.y(x) + thickness) for x in reversed(xs)]
            self.shape('Bands', top + bot, col, smooth=True)
            if names and name:
                xm = (x0 + x1) / 2
                self.text(xm, self.y(xm) + thickness * 0.66, name, col=P()['ink'],
                          size=LABEL - 3, anchor='middle')

    def water(self, x0, x1, level, col=None, line=True):
        """A lake lying in a hollow, cut against the ground."""
        xs = [x for x in range(int(x0), int(x1) + 1, 6) if self.y(x) > level]
        if len(xs) < 3:
            return None
        xs = list(range(min(xs), max(xs) + 1, 6))
        self.shape('Water', [(x, level) for x in xs] + [(x, self.y(x)) for x in reversed(xs)],
                   col or P()['water'], smooth=True)
        if line:
            self.stroke('Water', poly([(xs[0], level), (xs[-1], level)], False),
                        P()['waterLine'], 3.0, op=0.85)
        return (xs[0], xs[-1])

    def river(self, pts, w=7):
        self.stroke('Water', curve(pts), P()['waterLine'], w, op=0.95)

    def ghost(self, former, x0, x1, label=None, hatch='gone', step=12, dash='17 11'):
        """A former state over the present one, with the difference hatched.

        The device the whole set leans on: the ice surface in 2000 above the
        ice surface now, last decade's settlement edge inside this one's."""
        xs = list(range(int(x0), int(x1) + 1, step))
        band = [(x, at_x(former, x)) for x in xs] + [(x, self.y(x)) for x in reversed(xs)]
        self.shape('Ghost', band, recede(P()['glacier'], 0.70), smooth=True)
        if hatch:
            self.doc.defs.append(
                f'<pattern id="{hatch}" width="17" height="17" patternTransform="rotate(40)" '
                f'patternUnits="userSpaceOnUse"><path d="M0 0 L0 17" stroke="{P()["iceLine"]}" '
                f'stroke-width="1.5" stroke-opacity="0.45"/></pattern>')
            self.shape('Ghost', band, f'url(#{hatch})', smooth=True)
        self.stroke('Ghost', curve([(x, at_x(former, x)) for x in xs]), P()['dateInk'], 3.6,
                    dash=dash)
        if label:
            xm = (x0 + x1) * 0.52
            self.text(xm, at_x(former, xm) - 20, label, col=P()['dateInk'])

    def marker(self, x, label, up=34, col=None):
        """A dated tick on the ground: where a front, an edge or a limit stood."""
        y = self.y(x)
        arc = [(x - 62, y + 10), (x - 32, y - 18), (x, y - 28), (x + 32, y - 16), (x + 58, y + 10)]
        self.stroke('Detail', curve([(a, b + 7) for a, b in arc]), P()['shade'], 16, op=0.42)
        self.stroke('Detail', curve(arc), P()['till'], 12)
        self.stroke('Detail', curve(arc), P()['moraineCrest'], 3.4)
        if label:
            self.text(x, y + 52, label, col=col or P()['dateInk'], size=LABEL, anchor='middle',
                      italic=False)

    def svg(self):
        return self.doc.svg()


# ---------------------------------------------------------------------------
# The marks. One weight, flat fills, no modelling: a vocabulary rather than a
# set of illustrations. Sizes are in page pixels; k scales the whole mark.
# ---------------------------------------------------------------------------
def figure(x, y, k=1.0, pose=None, staff=False, load=False, bent=False, flip=1, col=None, v=None):
    """A person.

    The old one was a round head on a featureless trapezoid, repeated
    identically wherever a person was needed, and in a vocabulary this spare it
    was the mark that let the set down. This one has a smaller head set forward
    of the shoulders, a torso that tapers to the waist, and three builds; the
    build is taken from the figure's own position unless asked for, so a row of
    people is a row of different people without the scene having to say so.
    """
    c = col or P()['figure']
    v = int(abs(x) / 7) % 3 if v is None else v % 3
    pose = pose or ('walk' if v == 1 else 'stand')
    h = 46 * k
    hr = 6.3 * k
    sh = (9.4, 8.6, 10.2)[v] * k                  # shoulder half-width
    wa = sh * 0.70                                 # waist
    tt, tb = y - h + 13 * k, y - 18 * k            # torso top and bottom
    g = []
    if bent:
        g.append(f'<circle cx="{f1(x + flip * 11 * k)}" cy="{f1(y - h + 9 * k)}" r="{f1(hr)}" fill="{c}"/>')
        g.append(f'<path d="{poly([(x - flip * 7 * k, y - 20 * k), (x + flip * 9 * k, y - h + 14 * k), (x + flip * 15 * k, y - h + 19 * k), (x - flip * 3 * k, y - 15 * k)])}" fill="{c}"/>')
        for sgn, dx in ((-1, -4.6), (1, 3.0)):
            g.append(f'<path d="M{f1(x + dx * k)} {f1(y - 17 * k)}L{f1(x + dx * k + sgn * 1.6 * k)} {f1(y)}" '
                     f'stroke="{c}" stroke-width="{5.0 * k:.1f}" stroke-linecap="round"/>')
        return ''.join(g)
    g.append(f'<circle cx="{f1(x + flip * 1.4 * k)}" cy="{f1(y - h + 5.2 * k)}" r="{f1(hr)}" fill="{c}"/>')
    g.append(f'<path d="{poly([(x - sh, tt + 1.2 * k), (x + sh, tt - 1.2 * k), (x + wa, tb), (x - wa, tb)])}" fill="{c}"/>')
    if pose == 'walk':
        g.append(f'<path d="M{f1(x - 1.0 * k)} {f1(tb - 1 * k)}L{f1(x - 5.4 * k)} {f1(y)}" '
                 f'stroke="{c}" stroke-width="{5.0 * k:.1f}" stroke-linecap="round"/>')
        g.append(f'<path d="M{f1(x + 1.6 * k)} {f1(tb - 1 * k)}L{f1(x + 6.0 * k)} {f1(y)}" '
                 f'stroke="{c}" stroke-width="{5.0 * k:.1f}" stroke-linecap="round"/>')
    else:
        for sgn in (-1, 1):
            g.append(f'<path d="M{f1(x + sgn * 3.4 * k)} {f1(tb - 1 * k)}L{f1(x + sgn * 3.4 * k)} {f1(y)}" '
                     f'stroke="{c}" stroke-width="{5.0 * k:.1f}" stroke-linecap="round"/>')
    if pose == 'point':
        g.append(f'<path d="M{f1(x + flip * wa * 0.6)} {f1(tt + 8 * k)}L{f1(x + flip * 19 * k)} {f1(tt + 2 * k)}" '
                 f'stroke="{c}" stroke-width="{3.6 * k:.1f}" stroke-linecap="round"/>')
    if staff:
        g.append(f'<path d="M{f1(x + flip * 13 * k)} {f1(y + 3 * k)}L{f1(x + flip * 9.5 * k)} {f1(y - h - 9 * k)}" '
                 f'stroke="{P()["ink"]}" stroke-width="{2.4 * k:.1f}" stroke-linecap="round"/>')
    if load:
        g.append(f'<path d="{poly([(x - flip * (wa + 1 * k), tt + 3 * k), (x - flip * (wa + 12 * k), tt + 5 * k), (x - flip * (wa + 11 * k), tt + 19 * k), (x - flip * (wa + 0.5 * k), tt + 17 * k)])}" '
                 f'fill="{P()["ink"]}"/>')
    return ''.join(g)

def house(x, y, k=1.0, roof='pitch', col=None, roofcol=None):
    w, h = 42 * k, 30 * k
    body = col or P()['wallLit']
    rc = roofcol or P()['roof']
    g = [f'<rect x="{f1(x - w / 2)}" y="{f1(y - h)}" width="{f1(w)}" height="{f1(h)}" fill="{body}"/>']
    if roof == 'pitch':
        g.append(f'<path d="{poly([(x - w / 2 - 4 * k, y - h), (x, y - h - 19 * k), (x + w / 2 + 4 * k, y - h)])}" fill="{rc}"/>')
    elif roof == 'flat':
        g.append(f'<rect x="{f1(x - w / 2 - 3 * k)}" y="{f1(y - h - 6 * k)}" width="{f1(w + 6 * k)}" height="{f1(6 * k)}" fill="{rc}"/>')
    elif roof == 'ruin':
        g.append(f'<path d="{poly([(x - w / 2, y - h), (x - 6 * k, y - h - 12 * k), (x + 4 * k, y - h + 3 * k), (x + w / 2, y - h - 7 * k)], False)}" '
                 f'fill="none" stroke="{rc}" stroke-width="{3 * k:.1f}"/>')
    return ''.join(g)


def conifer(x, y, k=1.0, col=None):
    h = 46 * k
    return (f'<path d="{poly([(x, y - h), (x - h * 0.33, y), (x + h * 0.33, y)])}" '
            f'fill="{col or P()["forest"]}"/>')


def broadleaf(x, y, k=1.0, col=None):
    r = 20 * k
    return (f'<path d="M{f1(x)} {f1(y)}l0 {f1(-18 * k)}" stroke="{P()["treeInk"]}" '
            f'stroke-width="{3.4 * k:.1f}"/>'
            f'<circle cx="{f1(x)}" cy="{f1(y - 28 * k)}" r="{f1(r)}" fill="{col or P()["treeBody"]}"/>')


def beast(x, y, k=1.0, kind='cattle', flip=1, col=None):
    c = col or P()['animal']
    b, l_ = 30 * k, 15 * k
    g = [f'<rect x="{f1(x - b / 2)}" y="{f1(y - l_ - 13 * k)}" width="{f1(b)}" height="{f1(13 * k)}" rx="{f1(5 * k)}" fill="{c}"/>']
    for s in (-1, 1):
        g.append(f'<path d="M{f1(x + s * b * 0.32)} {f1(y - l_)}l0 {f1(l_)}" stroke="{c}" stroke-width="{3.6 * k:.1f}"/>')
    g.append(f'<circle cx="{f1(x + flip * b * 0.58)}" cy="{f1(y - l_ - 14 * k)}" r="{f1(7 * k)}" fill="{c}"/>')
    if kind == 'elephant':
        g.append(f'<path d="M{f1(x + flip * b * 0.72)} {f1(y - l_ - 10 * k)}q{f1(flip * 8 * k)} {f1(10 * k)} {f1(flip * 2 * k)} {f1(16 * k)}" '
                 f'fill="none" stroke="{c}" stroke-width="{4 * k:.1f}" stroke-linecap="round"/>')
    return ''.join(g)


def bird(x, y, k=1.0, col=None):
    return (f'<path d="M{f1(x - 9 * k)} {f1(y)}q{f1(4.5 * k)} {f1(-7 * k)} {f1(9 * k)} 0'
            f'q{f1(4.5 * k)} {f1(-7 * k)} {f1(9 * k)} 0" fill="none" stroke="{col or P()["ink"]}" '
            f'stroke-width="{2.6 * k:.1f}" stroke-linecap="round"/>')


def mast(x, y, k=1.0, dish=False):
    h = 92 * k
    g = [f'<path d="M{f1(x)} {f1(y)}L{f1(x)} {f1(y - h)}" stroke="{P()["ink"]}" stroke-width="{4.6 * k:.1f}"/>',
         f'<path d="M{f1(x - 22 * k)} {f1(y)}L{f1(x)} {f1(y - h * 0.8)}L{f1(x + 22 * k)} {f1(y)}" '
         f'fill="none" stroke="{P()["ink"]}" stroke-width="{2.2 * k:.1f}" stroke-opacity="0.6"/>']
    if dish:
        g.append(f'<path d="M{f1(x - 11 * k)} {f1(y - h)}a{f1(11 * k)} {f1(11 * k)} 0 1 1 {f1(22 * k)} 0Z" fill="{P()["light"]}"/>')
    else:
        g.append(f'<path d="M{f1(x - 16 * k)} {f1(y - h + 7 * k)}L{f1(x + 16 * k)} {f1(y - h + 7 * k)}" '
                 f'stroke="{P()["ink"]}" stroke-width="{3 * k:.1f}"/>')
        for s in (-1, 1):
            g.append(f'<circle cx="{f1(x + s * 16 * k)}" cy="{f1(y - h + 7 * k)}" r="{f1(5.4 * k)}" '
                     f'fill="{P()["light"]}" stroke="{P()["ink"]}" stroke-width="{2 * k:.1f}"/>')
    return ''.join(g)


def pylon(x, y, k=1.0):
    h = 96 * k; w = 26 * k
    g = [f'<path d="{poly([(x - w / 2, y), (x - w * 0.18, y - h), (x + w * 0.18, y - h), (x + w / 2, y)], False)}" '
         f'fill="none" stroke="{P()["pylon"]}" stroke-width="{3.6 * k:.1f}"/>']
    for f_ in (0.46, 0.72):
        g.append(f'<path d="M{f1(x - w * 0.62)} {f1(y - h * f_)}L{f1(x + w * 0.62)} {f1(y - h * f_)}" '
                 f'stroke="{P()["pylon"]}" stroke-width="{3 * k:.1f}"/>')
    return ''.join(g)


def document(x, y, k=1.0, lines=4):
    w, h = 44 * k, 56 * k
    g = [f'<path d="{poly([(x - w / 2, y - h), (x + w / 2 - 11 * k, y - h), (x + w / 2, y - h + 11 * k), (x + w / 2, y), (x - w / 2, y)])}" '
         f'fill="{P()["light"]}" stroke="{P()["ink"]}" stroke-width="{2.4 * k:.1f}"/>']
    for i in range(lines):
        yy = y - h + (16 + i * 10) * k
        g.append(f'<path d="M{f1(x - w * 0.3)} {f1(yy)}L{f1(x + w * 0.28)} {f1(yy)}" '
                 f'stroke="{P()["ink"]}" stroke-width="{2.2 * k:.1f}" stroke-opacity="0.65"/>')
    return ''.join(g)


def scales(x, y, k=1.0):
    h = 58 * k; a = 30 * k
    g = [f'<path d="M{f1(x)} {f1(y)}l0 {f1(-h)}" stroke="{P()["ink"]}" stroke-width="{4 * k:.1f}"/>',
         f'<path d="M{f1(x - a)} {f1(y - h)}L{f1(x + a)} {f1(y - h)}" stroke="{P()["ink"]}" stroke-width="{3.4 * k:.1f}"/>',
         f'<path d="M{f1(x - 15 * k)} {f1(y)}L{f1(x + 15 * k)} {f1(y)}" stroke="{P()["ink"]}" stroke-width="{4 * k:.1f}"/>']
    for s in (-1, 1):
        g.append(f'<path d="M{f1(x + s * a - 11 * k)} {f1(y - h + 13 * k)}a{f1(11 * k)} {f1(9 * k)} 0 0 0 {f1(22 * k)} 0Z" '
                 f'fill="{P()["light"]}"/>')
        g.append(f'<path d="M{f1(x + s * a)} {f1(y - h)}l0 {f1(13 * k)}" stroke="{P()["ink"]}" stroke-width="{1.8 * k:.1f}"/>')
    return ''.join(g)


def warning(x, y, k=1.0):
    s = 36 * k
    return (f'<path d="{poly([(x, y - s), (x + s * 0.92, y + s * 0.5), (x - s * 0.92, y + s * 0.5)])}" '
            f'fill="{P()["hazard"]}" stroke="{P()["ink"]}" stroke-width="{2.4 * k:.1f}"/>'
            f'<path d="M{f1(x)} {f1(y - s * 0.46)}l0 {f1(s * 0.6)}" stroke="{P()["ink"]}" stroke-width="{3.6 * k:.1f}"/>'
            f'<circle cx="{f1(x)}" cy="{f1(y + s * 0.33)}" r="{f1(2.6 * k)}" fill="{P()["ink"]}"/>')


def flag(x, y, k=1.0, col=None):
    h = 54 * k
    return (f'<path d="M{f1(x)} {f1(y)}l0 {f1(-h)}" stroke="{P()["ink"]}" stroke-width="{3.4 * k:.1f}"/>'
            f'<path d="{poly([(x, y - h), (x + 30 * k, y - h + 9 * k), (x, y - h + 19 * k)])}" '
            f'fill="{col or P()["red"]}"/>')


def title(scene, num, station, topic):
    lay = scene.L('Title')
    lay.append(f'<circle cx="86" cy="70" r="27" fill="{P()["markerFill"]}" stroke="{P()["red"]}" stroke-width="3.2"/>')
    lay.append(f'<text x="86" y="79" text-anchor="middle" font-family="{K.SANS}" font-weight="700" '
               f'font-size="25" fill="{P()["markerText"]}">{station}</text>')
    lay.append(LB.halo(130, 80, topic.replace('&', '&amp;'), P(), 32, italic=False, weight=600,
                       col=P()['titleInk']))


# --- ground profiles, named -------------------------------------------------
# Each is a silhouette across the frame, left to right. Stories pick one and
# bend it; the library is here so twenty-five scenes are not twenty-five
# unrelated drawings.
def trough(lo=1030, hi=360, dip=None):
    """A glacial valley: a floor at the left rising to a head at the right."""
    p = [(0, lo), (170, lo - 4), (300, lo + 14), (400, lo + 54), (505, lo + 70),
         (600, lo + 42), (690, lo), (820, lo - 100), (980, lo - 204), (1150, lo - 316),
         (1330, lo - 428), (1520, lo - 536), (1680, lo - 626), (1800, lo - 674)]
    if dip is None:
        return p
    return [(x, y if not (380 < x < 620) else y + dip) for x, y in p]


def slope(left=1080, right=330, bow=70):
    """One hillside, climbed from left to right."""
    return [(x, left + (right - left) * (x / W) ** 0.92 - bow * np.sin(np.pi * x / W))
            for x in range(0, W + 1, 100)]


def valley(floor=1010, rim=430, width=0.46):
    """A cross-section looking up the valley: walls either side of a floor."""
    a = (1 - width) / 2
    return [(0, rim), (W * a * 0.45, rim + 150), (W * a, floor - 40), (W * (a + 0.12), floor),
            (W * 0.5, floor + 22), (W * (1 - a - 0.12), floor), (W * (1 - a), floor - 40),
            (W * (1 - a * 0.45), rim + 130), (W, rim - 30)]


def cone(peak=250, base=1040, half=760, flat=0):
    """A volcano. flat>0 gives it a truncated summit, as Kilimanjaro has."""
    cx = W * 0.52
    if flat:
        return [(0, base), (cx - half, base - 40), (cx - flat, peak), (cx + flat, peak),
                (cx + half, base - 40), (W, base)]
    return [(0, base), (cx - half, base - 30), (cx, peak), (cx + half, base - 30), (W, base)]


def ridges(hi=520, lo=760):
    """A run of forested ridges, as a border country looks."""
    out = []
    for i, x in enumerate(range(0, W + 1, 150)):
        out.append((x, hi + (lo - hi) * (0.5 + 0.5 * np.cos(i * 1.1)) * 0.6 + 60 * np.sin(i * 0.7)))
    return out


def plain_and_massif(plain=980, top=300):
    """Lowland on the left, the mountain rising on the right."""
    return [(0, plain), (300, plain - 10), (620, plain - 30), (820, plain - 120),
            (1040, plain - 300), (1270, plain - 480), (1520, plain - 600), (1800, top)]


def mirror(profile):
    """The same ground, the other way round. Eleven of the twenty-five scenes
    were the same rising diagonal; this is the cheapest way to break it."""
    return [(W - x, y) for (x, y) in reversed(list(profile))]


def shoulder(plain=1010, rise=520, lip=0.52):
    """Flat ground, a steep rise, and a bench above it — a different silhouette
    from a ramp, and the shape a monitoring network actually sits on."""
    return [(0, plain), (W * 0.18, plain - 6), (W * (lip - 0.20), plain - 24),
            (W * (lip - 0.06), plain - 190), (W * (lip + 0.08), rise + 90),
            (W * (lip + 0.22), rise + 20), (W * 0.82, rise - 10), (W, rise - 46)]


def twin(peak=340, col=620, base=1040):
    """Two summits and the saddle between them."""
    return [(0, base), (W * 0.12, base - 60), (W * 0.30, peak), (W * 0.42, col),
            (W * 0.50, col + 40), (W * 0.60, col - 20), (W * 0.74, peak + 70),
            (W * 0.90, base - 80), (W, base)]
