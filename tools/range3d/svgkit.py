"""
Small SVG helpers: layers as named groups (Illustrator lists them as layers),
masks traced into smooth filled shapes, polylines thinned to what the eye
needs, and text with real font names so the file opens cleanly in Illustrator.
"""
import numpy as np
import contourpy

# fonts: real, installed faces only — Illustrator cannot resolve CSS keywords
SERIF = "'Source Serif 4', Georgia, 'Times New Roman', serif"
SANS = "'Open Sans', Helvetica, Arial, sans-serif"


def f1(v):
    return f"{v:.1f}"


def thin(pts, step=1.4):
    """Keep points at least `step` px apart along a polyline (keeps both ends)."""
    pts = np.asarray(pts, float)
    if len(pts) < 3:
        return pts
    keep = [0]; last = pts[0]
    for i in range(1, len(pts) - 1):
        if abs(pts[i, 0] - last[0]) + abs(pts[i, 1] - last[1]) >= step:
            keep.append(i); last = pts[i]
    keep.append(len(pts) - 1)
    return pts[keep]


def d_poly(pts, close=False, step=1.4):
    p = thin(pts, step)
    if len(p) < 2:
        return ''
    s = 'M' + f1(p[0, 0]) + ' ' + f1(p[0, 1])
    s += ''.join('L' + f1(x) + ' ' + f1(y) for x, y in p[1:])
    return s + ('Z' if close else '')


def d_smooth(pts, close=False, step=2.0):
    """Quadratic curve through midpoints: soft, hand-drawn-looking outlines."""
    p = thin(pts, step)
    if len(p) < 3:
        return d_poly(p, close, step)
    mids = (p[:-1] + p[1:]) / 2
    s = 'M' + f1(mids[0, 0]) + ' ' + f1(mids[0, 1])
    for i in range(1, len(p) - 1):
        s += 'Q' + f1(p[i, 0]) + ' ' + f1(p[i, 1]) + ' ' + f1(mids[i, 0]) + ' ' + f1(mids[i, 1])
    if close:
        s += 'Q' + f1(p[-1, 0]) + ' ' + f1(p[-1, 1]) + ' ' + f1(mids[0, 0]) + ' ' + f1(mids[0, 1]) + 'Z'
    return s


def box_blur(a, r):
    if r < 1:
        return a
    out = a.astype(float)
    for _ in range(2):
        for ax in (0, 1):
            pad = [(r + 1, r) if k == ax else (0, 0) for k in (0, 1)]
            c = np.cumsum(np.pad(out, pad, mode='edge'), axis=ax)
            out = (c[2 * r + 1:, :] - c[:-2 * r - 1, :]) / (2 * r + 1) if ax == 0 else \
                  (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return out


def trace(mask, blur=1, level=0.5, min_area=18.0, step=2.0, smooth=True):
    """A boolean screen mask -> one SVG path string (even-odd, holes kept)."""
    m = box_blur(mask.astype(float), blur) if blur else mask.astype(float)
    m = np.pad(m, 1)
    gen = contourpy.contour_generator(z=m, fill_type='OuterOffset')
    polys, offsets = gen.filled(level, 1e9)
    parts = []
    for pts, off in zip(polys, offsets):
        pts = pts - 1.0 + 0.5                          # undo the pad; pixel centres
        rings = [pts[off[i]:off[i + 1]] for i in range(len(off) - 1)]
        outer = rings[0]
        x, y = outer[:, 0], outer[:, 1]
        area = 0.5 * abs(np.dot(x, np.roll(y, 1)) - np.dot(y, np.roll(x, 1)))
        if area < min_area:
            continue
        for ring in rings:
            if len(ring) < 4:
                continue
            parts.append(d_smooth(ring[:-1], True, step) if smooth else d_poly(ring[:-1], True, step))
    return ''.join(parts)


def lines(field, levels, mask=None):
    """Iso-lines of a screen field (contour lines, snowline...) -> list of point arrays."""
    z = np.where(mask, field, np.nan) if mask is not None else field
    gen = contourpy.contour_generator(z=z, line_type='Separate')
    out = {}
    for lv in levels:
        out[lv] = [seg + 0.5 for seg in gen.lines(lv) if len(seg) > 3]
    return out


class Doc:
    """Named layers, written in the order they were created."""

    def __init__(self, w, h, bg):
        self.w, self.h, self.bg = w, h, bg
        self.layers = []
        self.defs = []

    def layer(self, name):
        for nm, items in self.layers:
            if nm == name:
                return items
        items = []
        self.layers.append((name, items))
        return items

    def svg(self):
        out = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" '
               f'width="{self.w}" height="{self.h}">']
        if self.defs:
            out.append('<defs>' + ''.join(self.defs) + '</defs>')
        for name, items in self.layers:
            if items:
                out.append(f'<g id="{name}">' + ''.join(items) + '</g>')
        out.append('</svg>')
        return ''.join(out)
