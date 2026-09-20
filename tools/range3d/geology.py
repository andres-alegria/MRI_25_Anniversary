"""
The rock beneath the range, shown on the block's two cut faces.

Every unit is defined as a field in three dimensions — unit(x, y, z) — so the
two faces are two slices of one geology and agree where they meet at the
corner. The story is a classic one for a young range: a sedimentary sequence
(sandstone over shale over limestone, on an old gneiss basement) folded and
cut by a thrust fault, intruded by a granite pluton under the north-west
massif with a baked contact aureole around it; a wedge of river gravels
under the plain resting on the eroded bedrock; frozen ground beneath the high
slopes; and a water table under the plain.

Each face is classified on a fine (along-face x depth) raster, traced into
shapes, and mapped onto the face, which is flat, so the mapping is exact.
Symbols are the standard geological-map ones, drawn as plain linework.
Adjust colours in PAL (render.py) and the structure in STRUCTURE below.
"""
import numpy as np
import view as V
import svgkit as K
import terrain as T

f1 = K.f1

UNITS = ['gneiss', 'limestone', 'shale', 'sandstone', 'granite', 'hornfels', 'alluvium', 'soil']

STRUCTURE = dict(
    fold_amp=650, fold_wl=0.42, fold_phase=0.6,       # folds: amplitude m, wavelength (world), phase
    regional_dip=1200,                                 # beds sink this much from front to back, m
    sand_base=-150, shale_thick=330, lime_thick=430,   # beds: sandstone 420 m, shale, limestone (m)
    thrust_z0=2600, thrust_dip=14400, thrust_y=0.45,   # thrust plane z = z0 - dip*(y - y0): ~30° true dip
    thrust_throw=610,                                  # the hanging wall (north) rides up this much
    thrust_flat=1500,                                  # above this the ramp flattens into a thrust flat
    pluton=(0.02, 0.90, 0.24, 0.20, -2700, 4600),      # granite dome: cx, cy, rx, ry, base z, rise
    aureole=380,                                       # baked zone around the granite, m
    gravel_top=950, gravel_max=380,                    # river gravels under ground below this height, max thickness
    permafrost=3400,                                   # frozen ground under ground above this
)


def unit_at(x, y, z, ztop):
    """Rock unit code at world (x, y) and height z, below a ground at ztop.

    The cover is a repeating sequence of beds — sandstone, shale, limestone,
    each a few hundred metres thick — folded into anticlines and synclines
    and offset along a thrust; below it lies the old gneiss basement."""
    S = STRUCTURE
    # folds with their axes running east-west, so the west face cuts across
    # them (anticlines and synclines) and the south face runs along them;
    # a regional dip to the north makes the beds cut the slopes at an angle
    fold = S['fold_amp'] * np.sin(2 * np.pi * (0.30 * x + 0.95 * y) / S['fold_wl'] + S['fold_phase']) \
        + 230 * np.sin(2 * np.pi * (0.95 * y) / 0.23 + 1.3) * np.exp(z / 5000.0) \
        - S['regional_dip'] * y
    # the thrust: a plane dipping ~30° north, surfacing near y = 0.45
    ramp = S['thrust_z0'] - S['thrust_dip'] * (y - S['thrust_y'])
    zf = np.where(ramp > S['thrust_flat'],
                  S['thrust_flat'] + (ramp - S['thrust_flat']) * 0.35, ramp)
    lift = np.where(z > zf, S['thrust_throw'], 0.0)          # the hanging wall rides up
    zr = z - fold - lift                                      # height within the unfolded pile
    period = S['shale_thick'] + S['lime_thick'] + 420         # one sandstone-shale-limestone cycle
    ph = np.mod(zr - S['sand_base'], period)
    code = np.where(ph < 420, 3, np.where(ph < 420 + S['shale_thick'], 2, 1))
    code = np.where(zr < -1700, 0, code)                      # the basement
    cx, cy, rx, ry, zb, rise = S['pluton']
    bump = 1 + 0.22 * np.sin(11.0 * x + 1.7) + 0.16 * np.sin(15.0 * y - 0.6)   # cupolas in the roof
    rr = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
    zg = zb + rise * bump * np.exp(-rr ** 2.0)
    bake = S['aureole'] * np.where(code == 2, 1.7, np.where(code == 3, 0.55, 1.0))   # hottest in the shale
    code = np.where((z < zg + bake) & (z >= zg), 5, code)
    code = np.where(z < zg, 4, code)
    gravel = np.clip((S['gravel_top'] - ztop) / 650, 0, 1) * S['gravel_max']
    code = np.where(z > ztop - gravel - 60, 6, code)
    code = np.where(z > ztop - 55, 7, code)
    return code, zf


def face_geometry(face):
    s = np.linspace(0, 1, 560)
    if face == 'west':
        return s, np.zeros_like(s), s
    return s, s, np.zeros_like(s)


PLACED = []


def draw(doc, H, P, rng, tone_of, frame=(0.0, 0.0, 1.0)):
    PLACED.clear()
    import labels as LB
    lay = doc.layer('Faces'); sym = doc.layer('Face-symbols'); lab = doc.layer('Face-labels')
    S = STRUCTURE
    for face in ('west', 'south'):
        s, x, y = face_geometry(face)
        ztop = V.sample(H, x, y)
        tone = 1.05 if face == 'west' else 0.84
        nz = 360
        zs = np.linspace(V.ZBASE, ztop.max() + 10, nz)
        Zg, Sg = np.meshgrid(zs, s, indexing='ij')                # (nz, ns)
        Xg = np.broadcast_to(x, Zg.shape); Yg = np.broadcast_to(y, Zg.shape)
        top = np.broadcast_to(ztop, Zg.shape)
        fx0, fy0, fsz = frame                                  # clips: local -> world coordinates
        code, zf = unit_at(fx0 + Xg * fsz, fy0 + Yg * fsz, Zg, top)
        below = Zg <= top
        # raster (row = z index, col = s index) -> screen: the face is planar
        def to_screen(pts):
            si = np.clip(pts[:, 0], 0, len(s) - 1); zi = np.clip(pts[:, 1], 0, nz - 1)
            ss = np.interp(si, np.arange(len(s)), s); zz = np.interp(zi, np.arange(nz), zs)
            xx = ss if face == 'south' else np.zeros_like(ss)
            yy = ss if face == 'west' else np.zeros_like(ss)
            return np.stack(V.project(xx, yy, zz), 1)
        import contourpy
        # paint every unit that occurs, oldest first
        for k, name in enumerate(UNITS):
            mask = (code == k) & below
            if mask.sum() < 20:
                continue
            m = np.pad(mask.astype(float), 1)
            gen = contourpy.contour_generator(z=m, fill_type='OuterOffset')
            polys, offs = gen.filled(0.5, 9)
            d = []
            for pts, off in zip(polys, offs):
                pts = pts - 1
                for i in range(len(off) - 1):
                    ring = to_screen(pts[off[i]:off[i + 1]])
                    d.append(K.d_poly(ring, True, 1.0))
            lay.append(f'<path d="{"".join(d)}" fill="{tone_of(P[name], tone)}" fill-rule="evenodd" '
                       f'stroke="{P["shade"]}" stroke-width="0.35" stroke-opacity="0.6"/>')
        # symbols, on a jittered grid in (s, z)
        marks = {n: [] for n in UNITS}
        for si in range(4, len(s) - 4, 7):
            for zi in range(3, nz - 3, 7):
                zi2 = min(nz - 1, max(0, zi + int(rng.integers(-2, 3))))
                if not below[zi2, si]:
                    continue
                name = UNITS[code[zi2, si]]
                marks[name].append(to_screen(np.array([[si, zi2]]))[0])
        along = to_screen(np.array([[10, 5], [20, 5]])); along = (along[1] - along[0]) / np.hypot(*(along[1] - along[0]))
        glyph = {
            'granite': lambda p: f'M{f1(p[0] - 2.2)} {f1(p[1])}l4.4 0M{f1(p[0])} {f1(p[1] - 2.2)}l0 4.4',
            'hornfels': lambda p: f'M{f1(p[0] - 2)} {f1(p[1] - 1.5)}l2 3l2 -3',
            'gneiss': lambda p: f'M{f1(p[0] - 5 * along[0])} {f1(p[1] - 5 * along[1])}q{f1(2.5 * along[0])} -2 {f1(5 * along[0])} {f1(5 * along[1])}t{f1(5 * along[0])} {f1(5 * along[1])}',
            'limestone': lambda p: f'M{f1(p[0] - 5 * along[0])} {f1(p[1] - 5 * along[1])}l{f1(10 * along[0])} {f1(10 * along[1])}M{f1(p[0])} {f1(p[1])}l0 4',
            'shale': lambda p: f'M{f1(p[0] - 3 * along[0])} {f1(p[1] - 3 * along[1])}l{f1(6 * along[0])} {f1(6 * along[1])}',
            'sandstone': lambda p: f'M{f1(p[0] + rng.uniform(-2, 2))} {f1(p[1] + rng.uniform(-1.5, 1.5))}l0.1 0M{f1(p[0] + rng.uniform(-2, 2))} {f1(p[1] + rng.uniform(-1.5, 1.5))}l0.1 0',
            'alluvium': lambda p: f'M{f1(p[0] - 1.4)} {f1(p[1])}a1.4 1.1 0 1 0 2.8 0a1.4 1.1 0 1 0 -2.8 0',
            'soil': lambda p: '',
        }
        for name, pts in marks.items():
            d = ''.join(glyph[name](p) for p in pts)
            if d:
                cap = ' stroke-linecap="round"' if name == 'sandstone' else ''
                sym.append(f'<path d="{d}" fill="none" stroke="{P["ink"]}" stroke-width="{1.4 if name == "sandstone" else 0.6}" '
                           f'stroke-opacity="0.28"{cap}/>')
        # the thrust fault: a heavier line with a half-arrow for the sense of motion
        zfc = zf[0]
        ok = (zfc > V.ZBASE) & (zfc < ztop - 60)
        if ok.sum() > 10:
            pts = np.stack(V.project(x[ok], y[ok], zfc[ok]), 1)
            lay.append(f'<path d="{K.d_poly(pts, False, 1)}" fill="none" stroke="{P["ink"]}" stroke-width="1.3" stroke-opacity="0.75"/>')
            mid = pts[len(pts) // 2]
            lab.append(LB.halo(mid[0] + 8, mid[1] - 8, 'thrust fault', P, LB.TYPE['face'], col=P['ink'], op=0.9))
            PLACED.append((mid[0] + 50, mid[1] - 8))
        # frozen ground under the high slopes, with its thawing active layer left out
        hi = ztop > S['permafrost']
        if hi.sum() > 5:
            ptop = np.where(hi, ztop - 18, ztop)
            pbot = np.where(hi, ztop - 18 - np.clip((ztop - S['permafrost']) * 0.6, 0, 1200), ztop)
            t_ = np.stack(V.project(x, y, ptop), 1); b_ = np.stack(V.project(x, y, pbot), 1)
            poly = np.concatenate([t_, b_[::-1]])
            lay.append(f'<path d="{K.d_poly(poly, True, 1.0)}" fill="{P["permafrost"]}" fill-opacity="0.34" '
                       f'stroke="{P["permafrost"]}" stroke-width="0.8" stroke-opacity="0.9"/>')
            hat = []
            for i in np.nonzero(hi)[0][::4]:                      # ice-lens hatching inside the frozen ground
                a_ = V.project(x[i], y[i], ptop[i] - 25); b_ = V.project(x[i], y[i], pbot[i] + 10)
                if b_[1] - a_[1] > 6:
                    hat.append(f'M{f1(a_[0])} {f1(a_[1])}L{f1(b_[0] + 4)} {f1(b_[1])}')
            lay.append(f'<path d="{"".join(hat)}" fill="none" stroke="{P["permafrost"]}" stroke-width="0.7" stroke-opacity="0.8"/>')
            i = int(np.argmax(ztop))
            q = V.project(x[i], y[i], ztop[i] - (ztop[i] - S['permafrost']) * 0.3)
            lab.append(LB.text(q[0] + 10, q[1] + 4, 'permafrost', P, LB.TYPE['face'], col=P['permafrost']))
        # the water table in the gravels under the plain
        plain = ztop < S['gravel_top'] - 150
        if face == 'south' and plain.sum() > 10:
            # a subdued replica of the surface — deeper under high ground,
            # rising to daylight at the river, as a gaining stream requires
            kern = np.ones(31) / 31
            zsm = np.convolve(np.pad(ztop, (15, 15), mode='edge'), kern, 'valid')
            z0 = float(ztop[plain].min())
            wt = z0 + 0.55 * (zsm - z0) - 15
            i0 = int(np.argmin(np.where(plain, ztop, 1e9)))     # the river: the lowest ground
            pull = np.exp(-((np.arange(len(ztop)) - i0) / 34.0) ** 2)
            wt = wt * (1 - pull) + (ztop - 3) * pull
            wt = np.clip(np.minimum(wt, ztop - 3), z0 - 45, None)
            pts = np.stack(V.project(x[plain], y[plain], wt[plain]), 1)
            lay.append(f'<path d="{K.d_poly(pts, False, 1)}" fill="none" stroke="{P["waterLine"]}" stroke-width="1.1" stroke-dasharray="6 3"/>')
            j = int(len(pts) * 0.30)
            lab.append(LB.halo(pts[j][0], pts[j][1] + 30, 'water table', P, LB.TYPE['face'], col=P['waterLine']))
        # unit names where each unit is thickest on this face
        for k, name in enumerate(UNITS):
            if name in ('soil',):
                continue
            mask = (code == k) & below
            if mask.sum() < 400:
                continue
            col_thick = mask.sum(0)
            si = int(np.argmax(col_thick[20:-20])) + 20
            zi = np.nonzero(mask[:, si])[0]
            if len(zi) < 8:
                continue
            q = to_screen(np.array([[si, zi.mean()]]))[0]
            qa = to_screen(np.array([[si, zi.min()]]))[0]; qb = to_screen(np.array([[si, zi.max()]]))[0]
            if abs(qa[1] - qb[1]) < 20:                        # too thin on the page to name
                continue
            if any(abs(q[0] - u) < 110 and abs(q[1] - v) < 26 for u, v in PLACED):
                continue                                         # keep clear of names already set
            PLACED.append((q[0], q[1]))
            nice = {'granite': 'granite pluton', 'hornfels': 'baked contact rock', 'gneiss': 'gneiss basement',
                    'alluvium': 'river gravels'}.get(name, name)
            lab.append(LB.halo(q[0], q[1] + 4, nice, P, LB.TYPE['face'], anchor='middle', col=P['ink'], op=0.9))
        # outline of the face
        t_ = np.stack(V.project(x, y, ztop), 1); b_ = np.stack(V.project(x, y, np.full_like(ztop, V.ZBASE)), 1)
        lay.append(f'<path d="{K.d_poly(np.concatenate([t_, b_[::-1]]), True, 1.0)}" fill="none" stroke="{P["ink"]}" '
                   f'stroke-width="1.2" stroke-opacity="0.8" stroke-linejoin="round"/>')
