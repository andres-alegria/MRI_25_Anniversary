"""
The scientific apparatus: an altitude scale standing at the block's back-left
corner with the life zones bracketed beside it, the snowline and treeline as
dashed isolines on the ground, spot heights, a few feature names and the rock
units named on the cut faces.

Type is set in real font names (Illustrator-safe). Adjust sizes in TYPE.
"""
import numpy as np
import terrain as T
import view as V
import landcover as LC
import svgkit as K

f1 = K.f1
TYPE = dict(tick=12, zone=14, feature=16.5, face=12, spot=13.5)   # px — adjust type sizes here


def text(x, y, s, P, size, italic=True, anchor='start', col=None, op=1.0, weight=None, spacing=None):
    it = ' font-style="italic"' if italic else ''
    wt = f' font-weight="{weight}"' if weight else ''
    sp = f' letter-spacing="{spacing}"' if spacing else ''
    return (f'<text x="{f1(x)}" y="{f1(y)}" font-family="{K.SERIF}"{it}{wt}{sp} font-size="{size}" '
            f'text-anchor="{anchor}" fill="{col or P["ink"]}" fill-opacity="{op}">{s}</text>')


def halo(x, y, s, P, size, col=None, italic=True, anchor='start', op=1.0, weight=None):
    """Text over a soft navy halo, so labels stay legible on busy ground."""
    it = ' font-style="italic"' if italic else ''
    wt = f' font-weight="{weight}"' if weight else ''
    base = (f'x="{f1(x)}" y="{f1(y)}" font-family="{K.SERIF}"{it}{wt} font-size="{size}" text-anchor="{anchor}"')
    return (f'<text {base} fill="none" stroke="{P["paper"]}" stroke-width="3.2" stroke-opacity="0.85" stroke-linejoin="round">{s}</text>'
            f'<text {base} fill="{col or P["ink"]}" fill-opacity="{op}">{s}</text>')


def ruler(doc, P, corner=(1.0, 0.0)):
    """An altitude scale standing on the block's front-right corner, where the
    ground is the plain — so heights read from sea level at the reader's side —
    with the life zones bracketed beside it."""
    lay = doc.layer('Labels')
    x0, y0 = corner
    bx, by = V.project(x0, y0, 0)
    tx, ty = V.project(x0, y0, 6400)
    out = [f'<path d="M{f1(bx)} {f1(by)}L{f1(tx)} {f1(ty)}" stroke="{P["ink"]}" stroke-width="0.9" stroke-opacity="0.75"/>']
    for m in range(0, 6500, 500):
        x, y = V.project(x0, y0, m)
        major = m % 1000 == 0
        out.append(f'<path d="M{f1(x)} {f1(y)}l{9 if major else 5} 0" stroke="{P["ink"]}" stroke-width="0.9" stroke-opacity="0.8"/>')
        if major:
            out.append(text(x + 14, y + 4, f'{m:,} m'.replace(',', '\u2009'), P, TYPE['tick'], italic=False, op=0.85))
    zones = [('Lowland farming', 250, 900), ('Montane forest', 900, LC.TREELINE),
             ('Alpine grassland', LC.TREELINE, LC.ALPINE_TOP), ('Nival: snow and ice', LC.SNOWLINE, 6400)]
    xb = bx + 82
    for name, lo, hi in zones:
        _, y1 = V.project(x0, y0, lo); _, y2 = V.project(x0, y0, hi)
        out.append(f'<path d="M{f1(xb - 4)} {f1(y1 - 1)}L{f1(xb)} {f1(y1 - 1)}L{f1(xb)} {f1(y2 + 1)}L{f1(xb - 4)} {f1(y2 + 1)}" '
                   f'fill="none" stroke="{P["inkSoft"]}" stroke-width="0.8"/>')
        out.append(text(xb + 8, (y1 + y2) / 2 + 5, name, P, TYPE['zone'], col=P['inkSoft']))
    # the periglacial belt overlaps grassland and snow: a thin second bracket
    _, y1 = V.project(x0, y0, LC.SCREE_LOW); _, y2 = V.project(x0, y0, LC.SNOWLINE)
    out.append(f'<path d="M{f1(xb + 170)} {f1(y1)}L{f1(xb + 174)} {f1(y1)}L{f1(xb + 174)} {f1(y2)}L{f1(xb + 170)} {f1(y2)}" '
               f'fill="none" stroke="{P["permafrost"]}" stroke-width="0.8"/>')
    out.append(text(xb + 180, (y1 + y2) / 2 + 5, 'periglacial', P, TYPE['zone'] - 1, col=P['permafrost']))
    lay.append(''.join(out))


def winds(doc, P, x=150, y=330):
    """Moist winds arrive from the west; the east side lies in the rain shadow."""
    lay = doc.layer('Labels')
    lay.append(text(x, y - 22, 'moist winds from the west', P, TYPE['tick'] + 1, col=P['ink'], op=0.9))
    for k in range(3):
        yy = y + k * 22
        lay.append(f'<path d="M{f1(x)} {f1(yy)}q40 -10 80 0t80 0" fill="none" stroke="{P["iceLine"]}" stroke-width="1.4" stroke-opacity="0.8"/>'
                   f'<path d="M{f1(x + 152)} {f1(yy - 6)}l10 6l-10 6" fill="none" stroke="{P["iceLine"]}" stroke-width="1.4" stroke-opacity="0.8"/>')


ICECLS = [None, ()]


def isolines(doc, G, P, cls=None):
    if cls is not None:
        ICECLS[0] = cls; ICECLS[1] = (LC.GLACIER, LC.SNOW, LC.WATER)
    """Snowline and treeline as dashed lines on the ground, from the visible surface."""
    lay = doc.layer('Isolines')
    names = doc.layer('Labels')
    import render
    D = render.depth_image(G)
    jump = np.zeros_like(G.mask)
    dd = np.abs(np.diff(np.nan_to_num(D, nan=9), axis=0)) > 0.012
    jump[1:] |= dd; jump[:-1] |= dd
    Z = np.where(G.mask & ~jump, G.pz, np.nan)
    iso = K.lines(Z, [LC.SNOWLINE, LC.TREELINE])
    for lv, col, name in [(LC.SNOWLINE, P['snowlineInk'], 'snowline'), (LC.TREELINE, P['treelineInk'], 'treeline')]:
        segs = [s for s in iso[lv] if len(s) > 25]
        d = ''.join(K.d_smooth(s, False, 2.0) for s in segs)
        dash = '9 5' if lv == LC.SNOWLINE else '1 4'             # snowline: long dash; treeline: dots
        cap = ' stroke-linecap="round"' if lv == LC.TREELINE else ''
        lay.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="1.5" stroke-dasharray="{dash}" stroke-opacity="0.9"{cap}/>')
        if segs:
            # name it where the line runs over plain ground, clear of the ice
            best = None
            for sg in sorted(segs, key=len, reverse=True)[:6]:
                for q in sg[len(sg) // 5: 4 * len(sg) // 5: 6]:
                    xi, yi = int(q[0]), int(q[1])
                    # the label's whole run of text must lie on plain ground
                    ok = q[0] < 1500
                    for dx in range(0, 200, 25):
                        xx = xi + dx
                        if not (0 <= yi < G.h and 0 <= xx < G.w and G.mask[yi, xx]):
                            ok = False; break
                        if V.nearest(ICECLS[0], G.px[yi, xx], G.py[yi, xx]) in ICECLS[1]:
                            ok = False; break
                    if ok:
                        best = q; break
                if best is not None:
                    break
            if best is None:
                continue
            x, y = best
            names.append(halo(x + 6, y - 6, f'{name} ~{lv:,} m'.replace(',', ' '), P, TYPE['feature'] - 3, col=col))


def spot_heights(doc, G, H, P):
    lay = doc.layer('Labels')
    for (px, py, h, r, s) in [T.PEAKS[i] for i in (0, 1, 2, 5)]:
        n = H.shape[0]
        # the true top near the designed peak
        i0, j0 = int(px * (n - 1)), int(py * (n - 1))
        win = H[max(j0 - 12, 0):j0 + 12, max(i0 - 12, 0):i0 + 12]
        jj, ii = np.unravel_index(win.argmax(), win.shape)
        x = (max(i0 - 12, 0) + ii) / (n - 1); y = (max(j0 - 12, 0) + jj) / (n - 1)
        z = H[max(j0 - 12, 0) + jj, max(i0 - 12, 0) + ii]
        if not G.visible(x, y, z + 1):
            continue
        sx, sy = V.project(x, y, z)
        lay.append(f'<path d="M{f1(sx)} {f1(sy - 6)}l3.4 5.5l-6.8 0Z" fill="{P["ink"]}" transform="translate(0 -4)"/>')
        lay.append(text(sx, sy - 14, f'{int(round(z, -1)):,}'.replace(',', ' '), P, TYPE['spot'], italic=False,
                        anchor='middle', op=0.9))


def feature_labels(doc, G, H, P, items):
    """items: (world x, world y, label, dx, dy) — a short leader to the feature."""
    lay = doc.layer('Labels')
    for (x, y, s, dx, dy) in items:
        z = V.sample(H, x, y)
        sx, sy = V.project(x, y, z)
        ex, ey = sx + dx, sy + dy
        lay.append(f'<path d="M{f1(sx)} {f1(sy)}L{f1(ex)} {f1(ey)}" stroke="{P["inkSoft"]}" stroke-width="0.6" stroke-opacity="0.8"/>')
        lay.append(f'<circle cx="{f1(sx)}" cy="{f1(sy)}" r="1.4" fill="{P["ink"]}"/>')
        anchor = 'start' if dx >= 0 else 'end'
        lay.append(halo(ex + (4 if dx >= 0 else -4), ey + 5, s, P, TYPE['feature'], anchor=anchor))



