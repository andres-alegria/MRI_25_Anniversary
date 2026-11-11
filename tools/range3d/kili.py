"""
Figure 6 of story 23, "Kilimanjaro: The Water Pump of Life" (Marchant,
Waruingi & Supuk): the mountain as the source of Amboseli's swamps, drawn as
a block diagram in the art of the zoom clips.

Redrawn from the authors' hand sketch: Kilimanjaro behind, the savanna below
it, the swamps in front, and the water that links them. Cloud caught by the
montane forest becomes rain, the rain sinks into the porous lava, travels
underground beneath the plain and rises again as the springs that feed the
swamps. The authors' four labels — climate, human and wildlife, engineering
and management, hydrogeology — name the four forces the story says steer that
water.

The ground is designed, not measured: Kibo's flat summit with its last ice,
Mawenzi's jagged peak to the east, the Shira plateau to the west, a shield
of lava falling to the Amboseli plain some 60 km away. Heights are true;
the block is drawn with a vertical exaggeration (VE).

    python3 kili.py OUT.svg [--light] [--no-text]
"""
import sys
import numpy as np
import terrain as T
import view as V
import svgkit as K
import render as R
import marks as MK

f1 = K.f1
P = R.PAL

# --- the block — adjust here ---------------------------------------------------
CANVAS = (1800, 1200)          # px — adjust canvas size here
MARGIN = (90, 170, 90, 70)     # l, t, r, b: air around the block, px — adjust here
SPAN_M = 60000.0               # ground span of the block, m (Amboseli to the summit is ~45 km)
VE = 4.2                       # vertical exaggeration — adjust the mountain's height here
FLOOR = -450.0                 # the block's floor, m above sea level — adjust the depth of the cut here
N = 520                        # grid
TEXT = '--no-text' not in sys.argv     # the authors' four labels — False draws the picture alone

# where things are, in block coordinates (x right, y back; 0..1)
KIBO = (0.30, 0.80)            # Kibo's summit
MAWENZI = (0.11, 0.87)         # Mawenzi, to the east (left, seen from Amboseli)
SHIRA = (0.56, 0.80)           # the Shira plateau, to the west
SWAMP_Y = 0.135                # centre line of the swamp, at its west end — adjust here

# heights, m — the bands of the mountain (north side) — adjust here
PLAIN = 1120                   # Amboseli
FARM_TOP = 1950                # cultivation on the lower slopes (the drier north side: forest starts higher)
FOREST_TOP = 2800              # montane forest; Erica heath above it to ~4,000 m
HEATH_TOP = 4000               # heath and moorland
ICE_FROM = 5650                # the summit icefields
CLOUD_AT = 2700                # the cloud belt sits on the forest at this height

# extra colours for this figure, dark and light printing — adjust colours here
EXTRA = dict(
    dark=dict(swamp='#2F5A48', papyrus='#4F7A52', savanna='#5E5A3E', heath='#4A5A44', desert='#4B4F55',
              lava='#4A4650', tuff='#5C5242', base='#303A48', flow='#5FB4E8', cloud='#DCE8F1',
              labelInk='#DCE8F1', labelRule='#8AA2B2'),
    light=dict(swamp='#9CC4A0', papyrus='#6E9B6A', savanna='#D6C894', heath='#B4BF98', desert='#CBC8C2',
               lava='#B3AAB4', tuff='#D9CBA6', base='#9AA3AE', flow='#2E7EB5', cloud='#FFFFFF',
               labelInk='#26333C', labelRule='#64798A'),
)

# land cover codes
SAV, SWAMP, WATER, FARM, FOREST, HEATH, DESERT, ICE, ROCK = range(9)
COVER = {SAV: 'savanna', SWAMP: 'swamp', WATER: 'water', FARM: 'field', FOREST: 'forest',
         HEATH: 'heath', DESERT: 'desert', ICE: 'glacier', ROCK: 'rock'}


def smooth(a, b, t):
    return T.smoothstep(a, b, t)


# --- the ground ----------------------------------------------------------------
def swamp_line(x):
    """y of the swamp's centre line along x: it snakes across the plain."""
    return SWAMP_Y + 0.025 * np.sin(x * 5.2 + 0.4) + 0.06 * x


def swamp_field(X, Y):
    """0..1: how far inside the swamp a point is (1 on its centre line)."""
    half = 0.040 * (1 - smooth(0.45, 0.78, X)) + 0.004       # wide at the west, tapering east
    d = np.abs(Y - swamp_line(X))
    wob = 0.010 * T.fbm(X * 9, Y * 9, 3, seed=41)
    return np.clip(1 - (d + wob) / half, 0, 1) * (X < 0.80)


def build():
    xs = np.linspace(0, 1, N)
    X, Y = np.meshgrid(xs, xs)
    H = PLAIN + 280 * Y ** 1.5                                   # the plain, rising toward the mountain
    r = np.hypot((X - KIBO[0]) * 0.85, (Y - KIBO[1]) * 1.1)      # broader east-west than north-south
    H += 2900 * np.clip(1 - r / 0.62, 0, 1) ** 1.9              # the shield
    H += 2300 * smooth(0.0, 1.0, np.clip(1 - r / 0.26, 0, 1)) ** 0.8   # Kibo's dome, cut off below
    # the summit: a broad, flat top with a shallow crater, its rim near 5,900 m
    top = 5780 + 110 * smooth(0.035, 0.07, r)
    H = np.where(H > top, top + (H - top) * 0.03, H)
    H -= 110 * np.clip(1 - r / 0.03, 0, 1) ** 0.7               # the inner crater
    # Mawenzi: a jagged, eroded peak
    rm = np.hypot(X - MAWENZI[0], (Y - MAWENZI[1]) * 1.2)
    rough = 0.75 + 0.5 * T.ridged(X * 18, Y * 18, 4, seed=7)
    H += 1750 * np.clip(1 - rm / 0.13, 0, 1) ** 1.3 * rough
    # the Shira plateau
    rs = np.hypot(X - SHIRA[0], (Y - SHIRA[1]) * 1.3)
    H += 650 * np.clip(1 - rs / 0.12, 0, 1) ** 0.5
    # radial gullies on the flanks, and the small relief of the plain
    ang = np.arctan2(Y - KIBO[1], X - KIBO[0])
    flank = smooth(1500, 2600, H) * (1 - smooth(4800, 5600, H))
    H += 45 * flank * T.ridged(np.cos(ang) * 9 + X * 3, np.sin(ang) * 9 + Y * 3, 3, seed=11)
    H += 25 * T.fbm(X * 14, Y * 14, 4, seed=5) + 90 * flank * T.fbm(X * 30, Y * 30, 3, seed=9)
    # parasitic cones on the lower flank, as on the real mountain
    for cx, cy, h in [(0.53, 0.55, 140), (0.24, 0.60, 120), (0.70, 0.62, 110)]:
        H += h * np.clip(1 - np.hypot(X - cx, Y - cy) / 0.03, 0, 1) ** 1.3
    # the swamps lie in a shallow trough
    S = swamp_field(X, Y)
    H -= 8 * S
    return X, Y, H, S


def classify(X, Y, H, S):
    rng_ = T.fbm(X * 11, Y * 11, 3, seed=21) * 160                   # band edges wander
    C = np.full(H.shape, SAV)
    C[H > FARM_TOP + rng_ - 450] = FARM
    # farms only where the mountain's soils are: a patchy band, not a belt
    patchy = T.fbm(X * 16, Y * 16, 3, seed=31) > -0.15
    C[(C == FARM) & ~patchy & (H < FARM_TOP - 150)] = SAV
    C[H > FARM_TOP + rng_] = FOREST
    C[H > FOREST_TOP + rng_] = HEATH
    C[H > HEATH_TOP + rng_] = DESERT
    ys, xs = np.gradient(H, SPAN_M / (N - 1))
    slope = np.degrees(np.arctan(np.hypot(xs, ys)))
    C[(H > 3900) & (slope > 22)] = ROCK                              # Mawenzi's and Kibo's bare walls
    # the last ice: two fragments on Kibo's summit plateau
    for cx, cy, rad in [(KIBO[0] - 0.012, KIBO[1] - 0.034, 0.022), (KIBO[0] + 0.03, KIBO[1] + 0.02, 0.012), (KIBO[0] - 0.035, KIBO[1] + 0.012, 0.008)]:
        C[(np.hypot(X - cx, (Y - cy) * 1.4) < rad + 0.004 * T.fbm(X * 80, Y * 80, 2, seed=3)) & (H > ICE_FROM)] = ICE
    C[S > 0.02] = SWAMP
    C[S > 0.62] = WATER
    return C


# --- drawing -------------------------------------------------------------------
def at(H, x, y, lift=0.0):
    return V.project(x, y, V.sample(H, x, y) + lift)


def ground(doc, H, C, G):
    m = G.mask
    px, py = np.nan_to_num(G.px), np.nan_to_num(G.py)
    doc.defs.append(f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
                    f'<stop offset="0" stop-color="{P["sky0"]}"/><stop offset="1" stop-color="{P["sky1"]}"/></linearGradient>')
    doc.layer('Sky').append(f'<rect width="{V.W}" height="{V.H_PX}" fill="url(#sky)"/>')
    doc.layer('Ground').append(f'<path d="{K.trace(m, blur=0, step=1.5)}" fill="{P["savanna"]}"/>')
    CC = np.where(m, V.nearest(C, px, py), -1)
    for code, nm in COVER.items():
        if code == SAV:
            continue
        mk = CC == code
        if mk.sum() < 20:
            continue
        doc.layer('Cover').append(f'<path d="{K.trace(mk, blur=1, step=2.0)}" fill="{P[nm]}" fill-rule="evenodd"/>')
    # light and shade, from the north-west, as on every clip
    gy, gx = np.gradient(H, SPAN_M / (N - 1))
    nx, ny, nz = -gx * VE * 1.6, -gy * VE * 1.6, np.ones_like(H)
    hs = (nx * R.LIGHT[0] + ny * R.LIGHT[1] + nz * R.LIGHT[2]) / np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    Sh = np.where(m, V.sample(hs, px, py), 1.0)
    for lv, op in [(0.62, 0.12), (0.48, 0.12), (0.34, 0.13)]:      # shade bands — adjust shading here
        doc.layer('Shade').append(f'<path d="{K.trace(m & (Sh < lv), blur=2, step=2.2)}" fill="{P["shade"]}" '
                                  f'fill-opacity="{op}" fill-rule="evenodd"/>')
    # contours every 200 m, index every 1,000 m — adjust intervals here
    D = R.depth_image(G)
    jump = np.zeros_like(m)
    dd = np.abs(np.diff(np.nan_to_num(D, nan=9), axis=0)) > 0.012
    jump[1:] |= dd; jump[:-1] |= dd
    Z = np.where(m & ~jump, G.pz, np.nan)
    for lv, segs in K.lines(Z, list(range(1200, 6000, 200))).items():
        idx = lv % 1000 == 0
        d = ''.join(K.d_poly(sg, False, 2.0) for sg in segs)
        if d:
            doc.layer('Contours').append(f'<path d="{d}" fill="none" stroke="{P["ink"]}" stroke-width="{0.9 if idx else 0.5}" '
                                         f'stroke-opacity="{0.32 if idx else 0.16}"/>')
    top = np.where(m.any(0), m.argmax(0), -1)
    cols = np.nonzero(top >= 0)[0]
    doc.layer('Skyline').append(f'<path d="{K.d_smooth(np.stack([cols + 0.5, top[cols] + 0.5], 1), False, 2.0)}" '
                                f'fill="none" stroke="{P["ink"]}" stroke-width="1.4" stroke-opacity="0.7"/>')


def swamp_detail(doc, H, C, G, rng):
    """Papyrus tussocks across the swamp, and a pale sheen on its open water."""
    out = []
    for _ in range(2600):
        x, y = rng.uniform(0, 0.82), rng.uniform(0.05, 0.30)
        if V.nearest(C, x, y) != SWAMP:
            continue
        z = V.sample(H, x, y)
        if not G.visible(x, y, z + 1):
            continue
        sx, sy = V.project(x, y, z)
        h = rng.uniform(4, 8)                                         # tussock size, px — adjust here
        out.append(f'M{f1(sx - h * 0.5)} {f1(sy)}L{f1(sx - h * 0.15)} {f1(sy - h)}M{f1(sx)} {f1(sy)}L{f1(sx)} {f1(sy - h * 1.2)}'
                   f'M{f1(sx + h * 0.5)} {f1(sy)}L{f1(sx + h * 0.15)} {f1(sy - h)}')
    doc.layer('Swamp').append(f'<path d="{"".join(out)}" fill="none" stroke="{P["papyrus"]}" stroke-width="1.1" '
                              f'stroke-linecap="round"/>')


def trees(doc, H, C, G, rng):
    """The montane forest as a dense stand of round crowns, two-toned as on the clips."""
    X, Y = np.meshgrid(np.arange(0.002, 1, 0.0062), np.arange(0.002, 1, 0.0062))
    X = (X + rng.uniform(-0.003, 0.003, X.shape)).ravel(); Y = (Y + rng.uniform(-0.003, 0.003, Y.shape)).ravel()
    # the north side's forest is drier and more open than the south's, and cut
    # into by clearings — adjust its density here
    gaps = T.fbm(X * 22, Y * 22, 3, seed=61) < -0.25
    keep = (V.nearest(C, X, Y) == FOREST) & (rng.random(X.shape) > 0.35) & ~gaps
    X, Y = X[keep], Y[keep]
    Z = V.sample(H, X, Y)
    vis = G.visible(X, Y, Z + 2)
    X, Y, Z = X[vis], Y[vis], Z[vis]
    sx, sy = V.project(X, Y, Z)
    order = np.argsort(sy)
    lit, body = [], []
    for k in order:
        thin_ = np.clip((Z[k] - (FOREST_TOP - 500)) / 500, 0, 1)        # smaller toward the heath
        r = (3.2 + rng.random() * 1.6) * (1 - 0.4 * thin_)             # crown radius, px — adjust here
        cx, cy = sx[k], sy[k] - r * 1.1
        body.append(f'M{f1(cx - r)} {f1(cy)}a{f1(r)} {f1(r * 0.9)} 0 1 1 {f1(2 * r)} 0a{f1(r)} {f1(r * 0.9)} 0 1 1 {f1(-2 * r)} 0Z')
        lit.append(f'M{f1(cx - r * 0.1)} {f1(cy - r * 0.9)}A{f1(r)} {f1(r * 0.9)} 0 0 0 {f1(cx - r * 0.1)} {f1(cy + r * 0.9)}'
                   f'A{f1(r * 0.55)} {f1(r * 0.9)} 0 0 1 {f1(cx - r * 0.1)} {f1(cy - r * 0.9)}Z')
    doc.layer('Trees').append(f'<path d="{"".join(body)}" fill="{P["treeBody"]}"/>')
    doc.layer('Trees').append(f'<path d="{"".join(lit)}" fill="{P["treeLit"]}"/>')


def fields(doc, H, C, G, rng):
    """Small parcels on the lower slopes, set radially around the mountain."""
    out = {k: [] for k in ('fieldGreen', 'fieldOchre', 'fieldFallow', 'field')}
    for _ in range(5200):
        x, y = rng.uniform(0, 1), rng.uniform(0.25, 1)
        if V.nearest(C, x, y) != FARM:
            continue
        a = np.arctan2(y - KIBO[1], x - KIBO[0])
        u = np.array([np.cos(a), np.sin(a)]); v = np.array([-u[1], u[0]])
        du, dv = rng.uniform(0.006, 0.011), rng.uniform(0.004, 0.008)   # parcel size — adjust here
        pts = np.array([[x, y], [x, y] + u * du, [x, y] + u * du + v * dv, [x, y] + v * dv])
        z = V.sample(H, pts[:, 0], pts[:, 1]) + 1
        if not G.visible(pts[:, 0], pts[:, 1], z).all():
            continue
        sx, sy = V.project(pts[:, 0], pts[:, 1], z)
        out[['fieldGreen', 'fieldOchre', 'fieldFallow', 'field'][int(rng.integers(4))]].append(
            'M' + 'L'.join(f'{f1(a_)} {f1(b_)}' for a_, b_ in zip(sx, sy)) + 'Z')
    for k, ds in out.items():
        if ds:
            doc.layer('Fields').append(f'<path d="{"".join(ds)}" fill="{P[k]}" stroke="{P["shade"]}" '
                                       f'stroke-width="0.4" stroke-opacity="0.35"/>')


# --- the cut faces: the mountain's plumbing -----------------------------------
def face_line(face, n=600):
    s = np.linspace(0, 1, n)
    return (s, np.zeros_like(s), s) if face == 'west' else (s, s, np.zeros_like(s))


def layers_of(ztop):
    """The rock beneath a face, top to bottom: a skin of soil and ash, lava
    flows that are porous (the aquifers) between tighter beds of tuff, lake
    beds under the plain, and the old basement the volcano was built on."""
    k = np.ones(61) / 61
    zs = np.convolve(np.pad(ztop, 30, mode='edge'), k, 'valid')     # the flows follow the ground, smoothed
    basement = -250 + 150 * np.clip((zs - PLAIN) / 3000, 0, 1)        # top of the old basement, m — adjust here
    plain = np.clip((PLAIN + 260 - zs) / 260, 0, 1)                 # 1 under the plain
    frac = lambda f: basement + (zs - basement) * f
    soil = ztop - 35
    beds = [('lava', soil, frac(0.78)), ('tuff', frac(0.78), frac(0.64)), ('lava', frac(0.64), frac(0.40)),
            ('tuff', frac(0.40), frac(0.30)), ('lava', frac(0.30), basement)]
    lake = ztop - 35 - 170 * plain                                   # lake beds and silts under the plain
    return soil, beds, lake, plain, basement, frac


def faces(doc, H, rng):
    lay = doc.layer('Faces'); sym = doc.layer('Face-symbols')
    fl = doc.layer('Groundwater')
    out = {}
    for face in ('west', 'south'):
        s, x, y = face_line(face)
        ztop = V.sample(H, x, y)
        tone = 1.04 if face == 'west' else 0.86
        soil, beds, lake, plain, basement, frac = layers_of(ztop)
        base = np.full_like(ztop, V.ZBASE)
        def band(top_z, bot_z, col, op=1.0):
            top_z = np.minimum(top_z, ztop); bot_z = np.minimum(np.maximum(bot_z, base), top_z)
            if np.all(top_z - bot_z < 0.5):
                return
            t_ = np.stack(V.project(x, y, top_z), 1); b_ = np.stack(V.project(x, y, bot_z), 1)
            lay.append(f'<path d="{K.d_poly(np.concatenate([t_, b_[::-1]]), True, 1.0)}" fill="{R._tone(col, tone)}" '
                       f'fill-opacity="{op}" stroke="{P["shade"]}" stroke-width="0.4" stroke-opacity="0.45"/>')
        band(basement, base, P['base'])
        for nm, t_, b_ in beds:
            band(t_, b_, P[nm])
        band(np.where(plain > 0.02, soil, base), np.where(plain > 0.02, lake, base), P['alluvium'])
        band(ztop, soil, P['soil'])
        # symbols: vesicles in the lava, dots in the tuff, crosses in the basement
        along = np.array(V.project(x[8], y[8], 0)) - np.array(V.project(x[0], y[0], 0)); along /= np.hypot(*along)
        d_lava, d_tuff, d_base = [], [], []
        for si in range(4, len(s) - 4, 7):
            for z in np.arange(V.ZBASE + 30, ztop[si] - 50, 85):
                zz = z + rng.uniform(-20, 20)
                px_, py_ = V.project(x[si], y[si], zz)
                if zz < basement[si]:
                    d_base.append(f'M{f1(px_ - 2.2)} {f1(py_)}l4.4 0M{f1(px_)} {f1(py_ - 2.2)}l0 4.4')
                elif plain[si] > 0.02 and lake[si] < zz < soil[si]:
                    a = np.array([px_, py_]) - along * 3; b = a + along * 6
                    d_tuff.append(f'M{f1(a[0])} {f1(a[1])}L{f1(b[0])} {f1(b[1])}')
                else:
                    nm = next((n_ for n_, t_, b_ in beds if b_[si] <= zz < t_[si]), None)
                    if nm == 'lava':
                        rr = rng.uniform(0.8, 1.5)
                        d_lava.append(f'M{f1(px_ - rr)} {f1(py_)}a{f1(rr)} {f1(rr * 0.7)} 0 1 0 {f1(2 * rr)} 0'
                                      f'a{f1(rr)} {f1(rr * 0.7)} 0 1 0 {f1(-2 * rr)} 0')
                    elif nm == 'tuff':
                        d_tuff.append(f'M{f1(px_)} {f1(py_)}l0.1 0M{f1(px_ + 3)} {f1(py_ + 1)}l0.1 0')
        for d, wdt in ((d_lava, 0.6), (d_tuff, 1.2), (d_base, 0.6)):
            if d:
                sym.append(f'<path d="{"".join(d)}" fill="none" stroke="{P["ink"]}" stroke-width="{wdt}" '
                           f'stroke-opacity="0.28" stroke-linecap="round"/>')
        # the water table: deep under the mountain, at the surface in the swamp
        swamp = swamp_field(x, y) > 0.02
        depth = 40 + 0.22 * np.clip(ztop - PLAIN - 150, 0, None)
        wt = np.where(swamp, ztop + 2, ztop - depth)
        wt = np.convolve(np.pad(wt, 12, mode='edge'), np.ones(25) / 25, 'valid')
        wt = np.minimum(wt, ztop + 2)
        pts = np.stack(V.project(x, y, wt), 1)
        fl.append(f'<path d="{K.d_poly(pts, False, 1)}" fill="none" stroke="{P["flow"]}" stroke-width="1.2" '
                  f'stroke-dasharray="7 4" stroke-opacity="0.9"/>')
        # the outline of the face
        t_ = np.stack(V.project(x, y, ztop), 1); b_ = np.stack(V.project(x, y, base), 1)
        lay.append(f'<path d="{K.d_poly(np.concatenate([t_, b_[::-1]]), True, 1.0)}" fill="none" stroke="{P["ink"]}" '
                   f'stroke-width="1.2" stroke-opacity="0.8" stroke-linejoin="round"/>')
        out[face] = (s, x, y, ztop, beds, frac, swamp)
    return out


def arrowhead(p, q, size=9):
    """A filled arrowhead at q, pointing from p."""
    d = np.array(q, float) - np.array(p, float); d /= max(np.hypot(*d), 1e-6)
    n = np.array([-d[1], d[0]])
    a = q - d * size + n * size * 0.45; b = q - d * size - n * size * 0.45
    return f'M{f1(q[0])} {f1(q[1])}L{f1(a[0])} {f1(a[1])}L{f1(b[0])} {f1(b[1])}Z'


def groundwater(doc, H, F_, rng):
    """The pump of the title, in section on the west face: rain on the forest
    sinks into the lava, runs downslope within the porous flows, under the
    plain, and comes up as springs where the swamp meets the face."""
    s, x, y, ztop, beds, frac, swamp = F_['west']
    fl = doc.layer('Groundwater')
    col = P['flow']
    i_sw = int(np.argmax(swamp_field(x, y)))                      # the swamp's centre on the face
    forest = (ztop > FARM_TOP + 50) & (ztop < FOREST_TOP)
    heads = []
    for f_mid, start_f, w in [(0.71, 0.92, 2.6), (0.52, 0.80, 2.2), (0.35, 0.70, 1.8)]:   # one line per aquifer — adjust here
        # start under the forest, follow the aquifer toward the reader, rise at the swamp
        i0 = int(np.nonzero(forest)[0][int(len(np.nonzero(forest)[0]) * start_f) - 1])
        idx = np.arange(i0, i_sw - 1, -1)
        z = frac(f_mid)[idx]
        z = np.minimum(z, ztop[idx] - 60)
        rise = np.clip((idx - i_sw) / max(i0 - i_sw, 1), 0, 1)
        lift = np.clip(1 - (idx - i_sw) / 45.0, 0, 1) ** 2          # the last stretch: up to the spring
        z = z * (1 - lift) + (ztop[idx] - 4) * lift
        # infiltration: from the forest floor down into the aquifer
        zi = np.linspace(ztop[i0] - 10, z[0], 20)
        down = np.stack(V.project(x[[i0] * 20], y[[i0] * 20], zi), 1)
        path = np.stack(V.project(x[idx], y[idx], z), 1)
        pts = np.concatenate([down, path])
        fl.append(f'<path d="{K.d_smooth(pts, False, 2.0)}" fill="none" stroke="{col}" stroke-width="{w}" '
                  f'stroke-linecap="round" stroke-linejoin="round"/>')
        heads.append(arrowhead(pts[-4], pts[-1], 8 + w * 1.5))
        mid = len(path) // 2                                          # an arrow midway, so the direction reads
        heads.append(arrowhead(path[mid - 3], path[mid], 7 + w * 1.5))
    fl.append(f'<path d="{"".join(heads)}" fill="{col}"/>')
    # the spring: rings where the water reaches the swamp on the face
    sx, sy = V.project(x[i_sw], y[i_sw], ztop[i_sw])
    fl.append(f'<path d="M{f1(sx - 10)} {f1(sy - 2)}q10 -9 20 0M{f1(sx - 17)} {f1(sy + 1)}q17 -15 34 0" fill="none" '
              f'stroke="{col}" stroke-width="1.6" stroke-linecap="round"/>')


def cloud_belt(doc, H, G, rng):
    """Cloud caught on the forest, with rain falling into it: the mountain's
    water starts here, not on the ice. Returns the cloud centres, screen px."""
    lay = doc.layer('Clouds')
    puffs, rain, centres = [], [], []
    for a in np.radians(np.linspace(-165, -15, 7)):               # the near half of the ring — adjust count here
        # walk out from the summit until the ground falls to the cloud's level
        for rr in np.linspace(0.05, 0.7, 260):
            x, y = KIBO[0] + rr * np.cos(a) / 0.85, KIBO[1] + rr * np.sin(a) / 1.1
            if not (0.01 < x < 0.99 and 0.01 < y < 0.99):
                break
            if V.sample(H, x, y) < CLOUD_AT:
                break
        else:
            continue
        if not (0.01 < x < 0.99 and 0.01 < y < 0.99):
            continue
        z = V.sample(H, x, y)
        sx, sy = V.project(x, y, z + 700 + rng.uniform(-150, 250))                           # the cloud hangs over the canopy
        w = rng.uniform(44, 78)                                      # puff size, px — adjust here
        centres.append((sx, sy))
        for dx, dy, k in [(-0.55, 0.12, 0.55), (0, -0.05, 0.75), (0.5, 0.1, 0.6), (0.2, 0.25, 0.5), (-0.25, 0.25, 0.5)]:
            rx = w * k * 0.75
            puffs.append(f'<ellipse cx="{f1(sx + dx * w)}" cy="{f1(sy + dy * w)}" rx="{f1(rx)}" ry="{f1(rx * 0.62)}"/>')
        for j in range(2):                                           # a little drizzle: most of the water is cloud caught by the canopy
            qx = sx + rng.uniform(-0.55, 0.55) * w; qy = sy + 0.38 * w + rng.uniform(0, 8)
            ln = rng.uniform(10, 18)
            rain.append(f'M{f1(qx)} {f1(qy)}l{f1(-ln * 0.25)} {f1(ln)}')
    lay.append(f'<path d="{"".join(rain)}" fill="none" stroke="{P["flow"]}" stroke-width="1.1" stroke-opacity="0.55" '
               f'stroke-linecap="round"/>')
    lay.append(f'<g fill="{P["cloud"]}" fill-opacity="0.62">{"".join(puffs)}</g>')
    return centres


def moisture_loop(doc, H, clouds):
    """The loop in the authors' sketch: water rising from the swamps and the
    plain returns to the mountain as cloud."""
    # moist air from the Indian Ocean, arriving from the east (left, seen from Amboseli)
    b = np.array(min(clouds, key=lambda c: c[0])) + np.array([-62, -6])   # the cloud furthest left
    a = np.array([40.0, b[1] - 300])
    c1 = a + np.array([160, -60]); c2 = b + np.array([-160, -140])
    d = f'M{f1(a[0])} {f1(a[1])}C{f1(c1[0])} {f1(c1[1])} {f1(c2[0])} {f1(c2[1])} {f1(b[0])} {f1(b[1])}'
    t = 0.96
    q = (1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * c1 + 3 * (1 - t) * t ** 2 * c2 + t ** 3 * b
    lay = doc.layer('Water-cycle')
    lay.append(f'<path d="{d}" fill="none" stroke="{P["flow"]}" stroke-width="2.4" stroke-dasharray="1 8" '
               f'stroke-linecap="round" stroke-opacity="0.95"/>')
    lay.append(f'<path d="{arrowhead(q, b, 14)}" fill="{P["flow"]}"/>')
    return 0.125 * a + 0.375 * c1 + 0.375 * c2 + 0.125 * b      # the curve's midpoint


# --- life on the plain: Noun Project marks --------------------------------------
PERSON = 31.0        # height of a standing person on this figure, px (exaggerated, as on the clips) — adjust here
ICON_HALO = 0.35     # px of halo around each icon — adjust outline weight here
BOXES = []           # screen boxes of everything placed so far: icons, then labels


def _hits(box, pad=4):
    return any(box[0] - pad < o[2] and o[0] < box[2] + pad and box[1] - pad < o[3] and o[1] < box[3] + pad
               for o in BOXES)


def box_of(role, H, x, y, scale=1.0, pick=0):
    sx, sy = at(H, x, y)
    w, h = MK.size(role, PERSON, pick=pick, exag=1.0)
    w, h = w * scale, h * scale
    return (sx - w / 2, sy - h, sx + w / 2, sy)


def put(doc, role, H, x, y, flip=False, scale=1.0, pick=None, layer='People-animals', halo=None, solid=True):
    """A Noun Project mark standing on (x, y), drawn as a plain silhouette with
    a thin halo, and its box remembered so nothing else lands on it."""
    sx, sy = at(H, x, y)
    m = MK.mark(role, sx, sy, P, PERSON, flip=flip, scale=scale, pick=pick, exag=1.0,
                halo=ICON_HALO if halo is None else halo, solid=solid)
    if m:
        doc.layer(layer).append(m)
        BOXES.append(box_of(role, H, x, y, scale, pick or 0))
    return sx, sy


def life(doc, H, C, G, rng):
    """Animals, people and things first; the acacias then take the ground that
    is left, so no tree stands on an animal."""
    groups = {}
    # in and around the swamp: hippos in the open water, egrets, elephants on its edge
    for x in (0.14, 0.19):
        put(doc, 'hippo', H, x, swamp_line(x) - 0.004, flip=x > 0.15)
    for x, dy in [(0.30, 0.01), (0.34, -0.012), (0.45, 0.008)]:
        put(doc, 'egret', H, x, swamp_line(x) + dy, flip=x > 0.33, scale=1.3)
    for i, x in enumerate((0.50, 0.555, 0.61)):
        put(doc, 'elephant', H, x, swamp_line(x) + 0.040 - 0.006 * i, flip=True, scale=1.0 - 0.15 * (i == 2))
    # wildlife on the open plain
    n0 = len(BOXES)
    for x, y in [(0.69, 0.30), (0.745, 0.285), (0.715, 0.345)]:
        put(doc, 'zebra', H, x, y, flip=x > 0.71, solid=False)       # the stripes are the zebra: kept
    for x, y in [(0.81, 0.335), (0.87, 0.315), (0.835, 0.375)]:
        put(doc, 'wildebeest', H, x, y, flip=True)
    groups['wildlife'] = BOXES[n0:]
    # herders: a boma, its cattle and a herder walking them to water
    for x, y in [(0.88, 0.14), (0.925, 0.155)]:
        put(doc, 'hut', H, x, y)
    for x, y, k in [(0.745, 0.125, 0), (0.785, 0.10, 1), (0.82, 0.13, 0), (0.70, 0.10, 1)]:
        put(doc, 'cattle', H, x, y, flip=True, pick=k)
    put(doc, 'walker', H, 0.845, 0.11, flip=True, pick=0)
    # engineering: a borehole pump among the farms on the lower slope
    px, py = 0.035, 0.52
    put(doc, 'pump', H, px, py, scale=2.0)
    groups['pump'] = BOXES[-1:]
    # acacias scattered on the savanna, clear of everything above, far ones first
    pts, tries = [], 0
    while len(pts) < 26 and tries < 5000:
        tries += 1
        x, y = rng.uniform(0.03, 0.97), rng.uniform(0.05, 0.42)
        if V.nearest(C, x, y) != SAV or swamp_field(x, y) > 0 or abs(y - swamp_line(x)) < 0.06:
            continue
        k = rng.uniform(0.40, 0.55)                          # acacia size — adjust here
        bx = box_of('acacia', H, x, y, k)
        if _hits(bx, pad=6):
            continue
        pts.append((x, y, k)); BOXES.append(bx)
    for x, y, k in sorted(pts, key=lambda p: -p[1]):
        sx, sy = at(H, x, y)
        m = MK.mark('acacia', sx, sy, P, PERSON, flip=rng.random() < 0.5, scale=k, exag=1.0, halo=False, solid=True)
        if m:
            doc.layer('Trees-savanna').append(m)
    return (px, py), groups


def borehole(doc, H, F_, pump):
    """The pump's borehole, shown in section on the west face, drawing from the
    upper aquifer."""
    s, x, y, ztop, beds, frac, swamp = F_['west']
    i = int(np.argmin(np.abs(y - pump[1])))
    z0, z1 = ztop[i], frac(0.58)[i]
    a = V.project(0.0, y[i], z0); b = V.project(0.0, y[i], z1)
    lay = doc.layer('Groundwater')
    lay.append(f'<path d="M{f1(a[0])} {f1(a[1])}L{f1(b[0])} {f1(b[1])}" stroke="{P["ink"]}" stroke-width="3.2" stroke-opacity="0.9"/>')
    lay.append(f'<path d="M{f1(a[0])} {f1(a[1])}L{f1(b[0])} {f1(b[1])}" stroke="{P["flow"]}" stroke-width="1.2"/>')
    lay.append(f'<path d="{arrowhead(b, (a[0], a[1] + 24), 9)}" fill="{P["flow"]}"/>')
    return b


# --- the authors' labels ----------------------------------------------------------
LABEL = 23           # label size, px — adjust here


def label(doc, to, text_, prefer=(), reach=(70, 230)):
    """A label in the page's sans, with a hairline leader to what it names.
    It takes the first spot, nearest first in the preferred directions, where
    it covers no icon, no other label and stays on the canvas."""
    w, h = 0.56 * LABEL * len(text_.replace('&amp;', '&')), LABEL
    angles = list(prefer) + [a for a in range(-180, 180, 15) if a not in prefer]
    best = None
    for r in np.arange(reach[0], reach[1] + 1, 15):
        for a in angles:
            cx, cy = to[0] + r * np.cos(np.radians(a)), to[1] - r * np.sin(np.radians(a))
            x0 = cx - w / 2; y0 = cy - h / 2
            bx = (x0, y0, x0 + w, y0 + h)
            if x0 < 12 or y0 < 12 or x0 + w > V.W - 12 or y0 + h > V.H_PX - 12 or _hits(bx, pad=8):
                continue
            best = bx
            break
        if best:
            break
    if best is None:                                     # nowhere clear: above it, as before
        best = (to[0] - w / 2, to[1] - reach[0] - h, to[0] + w / 2, to[1] - reach[0])
    BOXES.append(best)
    x0, y0, x1, y1 = best
    # the leader meets the nearer side of the text block
    ex = min(max(to[0], x0), x1); ey = y1 + 4 if to[1] > y1 else (y0 - 4 if to[1] < y0 else (y0 + y1) / 2)
    if to[1] >= y0 and to[1] <= y1:
        ex = x0 - 6 if to[0] < x0 else x1 + 6
    lay = doc.layer('Labels')
    lay.append(f'<path d="M{f1(to[0])} {f1(to[1])}L{f1(ex)} {f1(ey)}" stroke="{P["labelRule"]}" stroke-width="1"/>'
               f'<circle cx="{f1(to[0])}" cy="{f1(to[1])}" r="2.6" fill="{P["labelRule"]}"/>')
    x, y = x0, y1 - 0.2 * h
    for fill, extra in ((P['paper'], f' stroke="{P["paper"]}" stroke-width="5" stroke-opacity="0.7" stroke-linejoin="round"'),
                        (P['labelInk'], '')):
        lay.append(f'<text x="{f1(x)}" y="{f1(y)}" font-family="{K.SANS}" font-weight="600" font-size="{LABEL}" '
                   f'fill="{fill}"{extra}>{text_}</text>')


def figure(out):
    rng = np.random.default_rng(23)
    X, Y, H, S = build()
    C = classify(X, Y, H, S)
    V.W, V.H_PX = CANVAS
    V.SCALE = 1330.0
    V.ZK = VE * V.SCALE / SPAN_M
    V.ZBASE = FLOOR
    V.fit(H, margin=MARGIN)
    G = V.GBuffer(H, V.W, V.H_PX)
    doc = K.Doc(V.W, V.H_PX, P['sky1'])
    for nm in ['Sky', 'Ground', 'Cover', 'Fields', 'Shade', 'Contours', 'Swamp', 'Skyline',
               'Trees', 'Faces', 'Face-symbols', 'Groundwater', 'Trees-savanna', 'People-animals', 'Clouds', 'Water-cycle', 'Labels']:
        doc.layer(nm)
    ground(doc, H, C, G)
    swamp_detail(doc, H, C, G, rng)
    fields(doc, H, C, G, rng)
    trees(doc, H, C, G, rng)
    F_ = faces(doc, H, rng)
    groundwater(doc, H, F_, rng)
    BOXES.clear()
    pump, groups = life(doc, H, C, G, rng)
    bh = borehole(doc, H, F_, pump)
    clouds = cloud_belt(doc, H, G, rng)
    loop = moisture_loop(doc, H, clouds)
    if TEXT:
        def centre(bs):
            return ((min(b[0] for b in bs) + max(b[2] for b in bs)) / 2, min(b[1] for b in bs) - 6)
        label(doc, (loop[0], loop[1]), 'Climate', prefer=(0, 30, -30))
        label(doc, centre(groups['wildlife']), 'Human &amp; wildlife', prefer=(60, 30, 90, 120))
        label(doc, centre(groups['pump']), 'Engineering &amp; management', prefer=(-20, 0, 20))
        w = F_['west']
        i = int(len(w[0]) * 0.42)
        q = V.project(0.0, w[2][i], w[5](0.52)[i])
        label(doc, q, 'Hydrogeology', prefer=(-150, -165, -135), reach=(120, 260))
    open(out, 'w').write(doc.svg())
    return doc


if __name__ == '__main__':
    theme = 'light' if '--light' in sys.argv else 'dark'
    if theme == 'light':
        R.use_light()
    P.update(EXTRA[theme])
    figure(sys.argv[1])
    print('wrote', sys.argv[1])
