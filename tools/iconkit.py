"""
Surgery on a stock icon.

An icon arrives as path geometry, not as a picture, so it can be taken apart
and rebuilt. That is what makes a library usable here: the set needs a village
of three houses and the library has one of two, or an automatic weather station
that exists only as an anemometer in one icon and a mast in another.

A *part* is one subpath — in practice one house, one peak, one bird. parts()
splits an icon into them and measures each, so a part can be mirrored, scaled,
reproportioned or moved on its own, and parts from different icons can be
assembled into one.

Geometry is never rewritten. Everything is expressed as a transform on a group,
which the renderer applies exactly, so no curve is ever resampled and nothing
drifts. The cost is nesting, which no one sees.

    import iconkit as KIT
    ps = KIT.parts(open('house.svg').read())
    KIT.compose([ps[0],                                   # the two it came with
                 ps[1],
                 KIT.mirrored(KIT.scaled(ps[0], 0.86))],  # a third, a relative
                x=400, y=600, height=120, colour='#C3D3DD')

On line weight: an icon drawn with strokes can be re-weighted exactly, by one
number. An icon whose "line" is a filled outline — which most expanded line
icons are — cannot be thinned at all, because the centreline is gone. weight()
says which kind it is rather than guessing. The reliable way to make a set
agree is to pick for it: the API filters on line_weight at search time.
"""
import math
import re

CMD = re.compile(r'([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)')
NUM = re.compile(r'[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?')
ARGS = dict(M=2, L=2, T=2, H=1, V=1, C=6, S=4, Q=4, A=7, Z=0)


def _nums(s):
    return [float(v) for v in NUM.findall(s) if v not in ('+', '-', '.')]


def _walk(d):
    """Every subpath in a path, as (markup, points).

    The points include curve control points, so a bounding box built from them
    contains the curve — a little generously, which is the safe direction when
    the box is used to place something next to it."""
    out, cur, pts = [], [], []
    cx = cy = sx = sy = 0.0
    for m in CMD.finditer(d):
        c, rest = m.group(1), m.group(2)
        up = c.upper()
        rel = c.islower()
        n = ARGS[up]
        vals = _nums(rest)
        if up == 'Z':
            if cur:
                cur.append('Z')
            cx, cy = sx, sy
            continue
        if n and not vals:
            continue
        groups = [vals[i:i + n] for i in range(0, len(vals) - n + 1, n)] or [[]]
        for gi, g in enumerate(groups):
            if up == 'M' and gi == 0:
                cx, cy = (cx + g[0], cy + g[1]) if rel else (g[0], g[1])
                sx, sy = cx, cy
                if cur:
                    out.append((' '.join(cur), pts))
                cur, pts = ['M%g %g' % (cx, cy)], [(cx, cy)]
                continue
            # an M with extra pairs means an implicit L; everything else is itself
            cc = 'L' if up == 'M' else up
            if cc == 'H':
                cx = cx + g[0] if rel else g[0]
                cur.append('H%g' % cx); pts.append((cx, cy)); continue
            if cc == 'V':
                cy = cy + g[0] if rel else g[0]
                cur.append('V%g' % cy); pts.append((cx, cy)); continue
            abs_ = []
            for i in range(0, len(g), 2):
                if cc == 'A' and i == 2:          # rx ry rot flag flag x y
                    abs_ += [g[2], g[3], g[4]]
                    continue
                px = g[i] + (cx if rel else 0)
                py = g[i + 1] + (cy if rel else 0)
                abs_ += [px, py]
                pts.append((px, py))
            if cc == 'A':
                ex, ey = g[5] + (cx if rel else 0), g[6] + (cy if rel else 0)
                cur.append('A%g %g %g %g %g %g %g' % (g[0], g[1], g[2], g[3], g[4], ex, ey))
                pts.append((ex, ey)); cx, cy = ex, ey
                continue
            cur.append(cc + ' '.join('%g' % v for v in abs_))
            cx, cy = abs_[-2], abs_[-1]
    if cur:
        out.append((' '.join(cur), pts))
    return out


class Part:
    """One subpath, with its own box, and the transforms stacked on it."""

    def __init__(self, d, pts, tf=()):
        self.d, self.pts, self.tf = d, pts, tuple(tf)

    @property
    def box(self):
        xs = [p[0] for p in self.pts]; ys = [p[1] for p in self.pts]
        return (min(xs), min(ys), max(xs), max(ys))

    @property
    def size(self):
        x0, y0, x1, y1 = self.box
        return (x1 - x0, y1 - y0)

    @property
    def centre(self):
        x0, y0, x1, y1 = self.box
        return ((x0 + x1) / 2, (y0 + y1) / 2)

    def with_tf(self, t):
        return Part(self.d, self.pts, self.tf + (t,))

    def markup(self):
        inner = '<path d="%s"/>' % self.d
        for t in reversed(self.tf):
            inner = '<g transform="%s">%s</g>' % (t, inner)
        return inner


def parts(svg_text):
    """Every subpath of every path in an icon, in drawing order."""
    out = []
    for d in re.findall(r'<path[^>]*\sd="([^"]+)"', svg_text):
        for sub, pts in _walk(d):
            if len(pts) > 2:
                out.append(Part(sub, pts))
    return out


# --- making a relative, not a copy ------------------------------------------
def scaled(part, sx, sy=None, about=None):
    """Resized about its own centre unless told otherwise.

    sx alone keeps the proportions; sx and sy apart change them, which is what
    turns a copy into a sibling — the same house, narrower and taller."""
    sy = sx if sy is None else sy
    ax, ay = about or part.centre
    return part.with_tf('translate(%g %g) scale(%g %g) translate(%g %g)'
                        % (ax, ay, sx, sy, -ax, -ay))


def mirrored(part, about=None):
    """Flipped left to right about its own centre: the roof slopes the other way."""
    ax = (about if about is not None else part.centre[0])
    return part.with_tf('translate(%g 0) scale(-1 1) translate(%g 0)' % (ax, -ax))


def moved(part, dx, dy=0.0):
    return part.with_tf('translate(%g %g)' % (dx, dy))


def turned(part, deg, about=None):
    ax, ay = about or part.centre
    return part.with_tf('rotate(%g %g %g)' % (deg, ax, ay))


def bounds(ps):
    """The box around a set of parts, after their transforms."""
    xs, ys = [], []
    for p in ps:
        for (x, y) in p.pts:
            for t in reversed(p.tf):
                x, y = _apply(t, x, y)
            xs.append(x); ys.append(y)
    return (min(xs), min(ys), max(xs), max(ys))


def _apply(t, x, y):
    m = re.match(r'(\w+)\(([^)]*)\)', t)
    if not m:
        return x, y
    op, v = m.group(1), _nums(m.group(2))
    if op == 'translate':
        return x + v[0], y + (v[1] if len(v) > 1 else 0)
    if op == 'scale':
        return x * v[0], y * (v[1] if len(v) > 1 else v[0])
    if op == 'rotate':
        a = math.radians(v[0]); cx, cy = (v[1], v[2]) if len(v) > 2 else (0, 0)
        dx, dy = x - cx, y - cy
        return cx + dx * math.cos(a) - dy * math.sin(a), cy + dx * math.sin(a) + dy * math.cos(a)
    return x, y


def _apply_all(p, x, y):
    for t in reversed(p.tf):
        x, y = _apply(t, x, y)
    return x, y


# --- putting the result on the page -----------------------------------------
def compose(ps, x, y, height, colour, anchor='bottom', opacity=1.0):
    """A set of parts as one icon, scaled to `height` and set on (x, y).

    The parts are fitted by what they actually cover, not by the viewBox they
    came from, so an icon built out of two others still sits correctly."""
    x0, y0, x1, y1 = bounds(ps)
    h = (y1 - y0) or 1.0
    s = height / h
    ox = x - ((x0 + x1) / 2) * s
    oy = y - (y1 * s if anchor == 'bottom' else ((y0 + y1) / 2) * s)
    op = '' if opacity >= 1 else ' fill-opacity="%g"' % opacity
    return ('<g transform="translate(%.2f %.2f) scale(%.5f)" fill="%s"%s>%s</g>'
            % (ox, oy, s, colour, op, ''.join(p.markup() for p in ps)))


# --- line weight ------------------------------------------------------------
def weight(svg_text, factor):
    """Re-weight a stroked icon, and say so when the icon is not one.

    Returns (markup, note). An expanded outline has no stroke to change: its
    line is a filled shape and the centreline is gone, so it can be thickened
    by adding a stroke in the fill colour but never thinned. The dependable
    way to make a set agree on weight is to filter for it when searching."""
    found = re.findall(r'stroke-width="([\d.]+)"', svg_text)
    if found:
        out = re.sub(r'stroke-width="([\d.]+)"',
                     lambda m: 'stroke-width="%g"' % (float(m.group(1)) * factor), svg_text)
        return out, 'stroked: %d width%s scaled by %g' % (len(found), '' if len(found) == 1 else 's', factor)
    if factor >= 1:
        return svg_text, ('outline fill: no stroke to scale — thicken by adding a stroke in the '
                          'fill colour, or pick for line_weight at search time')
    return svg_text, ('outline fill: cannot be thinned, the centreline is gone — '
                      'search with a lower line_weight instead')


def describe(svg_text):
    """What an icon is made of, before deciding how to treat it."""
    ps = parts(svg_text)
    strokes = re.findall(r'stroke-width="([\d.]+)"', svg_text)
    return dict(parts=len(ps),
                construction='stroked' if strokes else 'outline fill',
                stroke_widths=sorted({float(v) for v in strokes}),
                sizes=[tuple(round(v, 1) for v in p.size) for p in ps])
