"""
MRI 25 — the mountain range as a block diagram (dark printing).

    python3 render.py OUT.svg            the whole range
    python3 render.py OUT.svg --zoom agriculture|urban

Layers are named groups, so the file opens in Illustrator with a usable
Layers panel. All colours and weights sit in PAL / WEIGHT below.
"""
import sys, math
import numpy as np
import terrain as T
import view as V
import landcover as LC
import svgkit as K
import features as F
import story as ST
import labels as LB
import geology as GEO
import ice as ICE
f1 = K.f1

# --- palette, dark printing — adjust colours here -----------------------------
PAL = dict(
    sky0='#12303F', sky1='#0B1F2E',            # sky gradient, top to horizon
    ink='#C3D3DD', inkSoft='#8AA2B2', inkFaint='#5E788A',
    ground='#2B4046',
    alpine='#46584A', scree='#394C5B', forest='#1F3B32', terrace='#4E5E3A',
    field='#3C4B34', paddy='#34504A', town='#4B5157', rock='#3C5266',
    snow='#E1EAF1', glacier='#B4CADC', water='#2F6F9E',
    waterLine='#5FA8D8', iceLine='#7FACCA', crevasse='#3E6E8E', treeInk='#6D9179',
    red='#E07A66', blue='#4FA3D9',
    shade='#07131C', light='#DCE8F1',
    # trees, fields and buildings
    treeBody='#12281F', treeLit='#3E6B52',
    fieldGreen='#4A5E3A', fieldOchre='#6A6440', fieldFallow='#4A4538', paddyWater='#5E7F4A', paddyGreen2='#6F8F52', paddyFlood='#5A7F8C', bund='#7F9A7A',
    terraceLine='#8F9A6A',
    wallLit='#B9AE98', wallShade='#7F7766', roof='#8E5A48', roofFlat='#9C9280', dome='#C9B98E', window='#2A2A2A',
    forefield='#4E5250', waste='#7C7A74', wasteTop='#9A978F', yak='#2A231E', tentWhite='#E8E2D6',
    paddySheen='#8FB0C4', rgFront='#3E444A', rgRidge='#A9AEB3', dateInk='#B7C7D6', route='#D9705C', chevron='#FFD0C2', pitShadow='#3A2E24', benchMid='#6E5C48',
    pitWater='#5E8A86', seep='#B8A04A', penstock='#D6DCE3', powerRoof='#D8B660', pylon='#9FB0C4',
    metalRoof='#6F7F8C', sapling='#8FB08A', hat='#D8C79A', buffalo='#3A302A', thatch='#9A8458',
    awning2='#E3C16F', awning3='#4FA3D9', crane='#E3C16F', sheet='#8A9AA6', shackB='#9C8A74', shackC='#7C8C8A',
    bus='#E3C16F', solarFrame='#9FB3C8', haze='#1B3048', ogive='#8FB3CC', debris='#5D5A55', moraineCrest='#A89F92', hazard='#BFD8F0',
    paper='#0B1F2E', road='#C9BD9C', concrete='#A7AFB3', benchLight='#A88A6C', benchDark='#5E584D',
    tailings='#9FC7B8', whitewash='#E6EFF5', solar='#1D2A3A', animal='#D9CFBD', tent='#2A2622',
    figure='#E8DFCC', rockGlacier='#7F8489', snowlineInk='#E6EFF5', treelineInk='#8FB08A',
    # the cut faces: earth tones muted to sit on the night paper
    # the rock on the cut faces: navy-shifted tints with one warm band (the gravels)
    soil='#3A3228', alluvium='#6B5A3E', sandstone='#4E4B42', shale='#3E4658', limestone='#474B58',
    gneiss='#303A48', granite='#58505A', hornfels='#645C68', till='#524C45', permafrost='#A9D2EC',
)
# stroke weights, px at 2400 wide — adjust line weights here
WEIGHT = dict(skyline=1.6, silhouette=1.0, contour=0.5, index=0.8, stream=0.9, face=1.2)

LIGHT = np.array([-0.80, -0.15, 0.58]); LIGHT = LIGHT / np.linalg.norm(LIGHT)

# feature names: (x, y, label, leader dx, leader dy) — adjust here
FEATURES = [
    (0.52, 0.66, 'valley glacier', 70, -40),
    (0.445, 0.505, 'proglacial lake', 40, 70),
    (0.80, 0.47, 'reservoir', 60, -30),
    (0.70, 0.095, 'rice paddies', 60, 44),
    (0.28, 0.35, 'terraces', -70, 40),
    (0.215, 0.772, 'rock glacier', -70, -30),
    (0.905, 0.20, 'open-pit mine', 46, -64),
]

# settlements: (x, y, radius, houses, kind) in world coordinates — adjust here
SETTLEMENTS = [
    (0.50, 0.085, 0.070, 120, 'town'),      # the valley town on the plain
    (0.615, 0.070, 0.040, 40, 'town'),      # its newer quarter across the river
    (0.30, 0.325, 0.022, 12, 'village'),    # among the western terraces
    (0.775, 0.265, 0.022, 12, 'village'),   # among the eastern terraces
    (0.765, 0.395, 0.016, 8, 'village'),    # below the dam
    (0.405, 0.430, 0.016, 8, 'village'),    # the last village below the glacier
    (0.13, 0.30, 0.018, 8, 'village'),      # on the western spur
]


def hillshade(H, exag=3.0):
    gy, gx = np.gradient(H, LC.SPAN_M / (H.shape[0] - 1))
    nx, ny, nz = -gx * exag, -gy * exag, np.ones_like(H)
    return (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)


def depth_image(G):
    """View depth of the ground seen at each pixel (nan where there is none)."""
    return np.where(G.mask, V.to_view(np.nan_to_num(G.px), np.nan_to_num(G.py))[1], np.nan)


def chains(edge, max_dy=3):
    """Join edge pixels column to column into polylines (silhouettes run left-right)."""
    h, w = edge.shape
    active, done = [], []
    for c in range(w):
        ys = np.nonzero(edge[:, c])[0]
        used = set(); nxt = []
        for ch in active:
            ly = ch[-1][1]
            best = None
            for y in ys:
                if y in used:
                    continue
                if abs(y - ly) <= max_dy and (best is None or abs(y - ly) < abs(best - ly)):
                    best = y
            if best is None:
                done.append(ch)
            else:
                used.add(best); ch.append((c + 0.5, best + 0.5)); nxt.append(ch)
        for y in ys:
            if y not in used:
                nxt.append([(c + 0.5, y + 0.5)])
        active = nxt
    done += active
    return [np.array(ch) for ch in done if len(ch) >= 6]


def render(zoom=None):
    w = T.build()
    H = w['H']
    V.fit(H)
    L = LC.classify(w)
    cls = L['cls']
    G = V.GBuffer(H)
    doc = K.Doc(V.W, V.H_PX, PAL['sky1'])
    for name in ['Sky', 'Ground'] + ['Cover-' + nm for nm in LC.NAMES[1:]] + \
            ['Fields', 'Shade', 'Light', 'Contours', 'Terraces', 'Hachures', 'Glacier-detail', 'Moraines',
             'Streams', 'Silhouettes', 'Skyline', 'Trees', 'Haze', 'Isolines', 'Settlements', 'Infrastructure', 'People-animals',
             'Route', 'Faces', 'Face-symbols', 'Face-labels', 'Labels', 'Key', 'Stations']:
        doc.layer(name)
    m = G.mask
    px, py = np.nan_to_num(G.px), np.nan_to_num(G.py)

    # ------------------------------------------------------------------ sky
    doc.defs.append(f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
                    f'<stop offset="0" stop-color="{PAL["sky0"]}"/><stop offset="1" stop-color="{PAL["sky1"]}"/></linearGradient>')
    doc.layer('Sky').append(f'<rect width="{V.W}" height="{V.H_PX}" fill="url(#sky)"/>')

    # ------------------------------------------------------------------ ground: fills by class
    C = np.where(m, V.nearest(cls, px, py), -1)
    # a speck of forest left inside the painted ice reads as trees growing on
    # the glacier: give any such pixel to the ice it sits in
    surrounded = K.box_blur((C == LC.GLACIER).astype(float), 3) > 0.5
    C = np.where(np.isin(C, [LC.FOREST, LC.GROUND, LC.ALPINE]) & surrounded, LC.GLACIER, C)
    doc.layer('Ground').append(f'<path d="{K.trace(m, blur=0, step=1.5)}" fill="{PAL["ground"]}"/>')
    for code, name in enumerate(LC.NAMES):
        if code == LC.GROUND:
            continue
        mk = C == code
        if mk.sum() < 30:
            continue
        d = K.trace(mk, blur=1, step=2.0)
        if d:
            doc.layer('Cover-' + name).append(f'<path d="{d}" fill="{PAL[name]}" fill-rule="evenodd"/>')

    # ------------------------------------------------------------------ shading
    hs = hillshade(H)
    S = np.where(m, V.sample(hs, px, py), 1.0)
    # four stacked steps of shade, each light, so the tone builds in soft steps
    # rather than blotches — adjust the shading here
    lay = doc.layer('Shade')
    for lv, op in [(0.50, 0.12), (0.36, 0.12), (0.24, 0.13), (0.12, 0.13)]:
        d = K.trace(m & (S < lv), blur=2, step=2.2)
        lay.append(f'<path d="{d}" fill="{PAL["shade"]}" fill-opacity="{op}" fill-rule="evenodd"/>')
    d = K.trace(m & (S > 0.86) & ((C == LC.SNOW) | (C == LC.GLACIER) | (C == LC.ROCK)), blur=3, step=2.4)
    doc.layer('Light').append(f'<path d="{d}" fill="{PAL["light"]}" fill-opacity="0.07" fill-rule="evenodd"/>')

    # ------------------------------------------------------------------ contours (screen space, broken at occlusions)
    D = depth_image(G)
    jump = np.zeros_like(m)
    dd = np.abs(np.diff(np.nan_to_num(D, nan=9), axis=0)) > 0.012
    jump[1:] |= dd; jump[:-1] |= dd
    Z = np.where(m & ~jump, G.pz, np.nan)
    iso = K.lines(Z, list(range(500, 6400, 250)))
    lay = doc.layer('Contours')
    for lv, segs in iso.items():
        idx = lv % 1000 == 0
        wgt = WEIGHT['index'] if idx else WEIGHT['contour']
        op = 0.42 if idx else 0.22
        d = ''.join(K.d_poly(sg, False, 2.0) for sg in segs)
        if d:
            lay.append(f'<path d="{d}" fill="none" stroke="{PAL["ink"]}" stroke-width="{wgt}" stroke-opacity="{op}"/>')

    # ------------------------------------------------------------------ silhouettes: where a near ridge hides far ground
    Dn = np.nan_to_num(D, nan=99.0)
    edge = np.zeros_like(m)
    edge[1:] = m[1:] & ((Dn[:-1] - Dn[1:]) > 0.02)        # far ground just above a near ridge
    sil = chains(edge)
    lay = doc.layer('Silhouettes')
    for ch in sil:
        lay.append(f'<path d="{K.d_smooth(ch, False, 2.0)}" fill="none" stroke="{PAL["ink"]}" '
                   f'stroke-width="{WEIGHT["silhouette"]}" stroke-opacity="0.55" stroke-linecap="round"/>')
    # the skyline: the top of the ground in every column
    top = np.where(m.any(0), m.argmax(0), -1)
    cols = np.nonzero(top >= 0)[0]
    sky = np.stack([cols + 0.5, top[cols] + 0.5], 1)
    doc.layer('Skyline').append(f'<path d="{K.d_smooth(sky, False, 2.0)}" fill="none" stroke="{PAL["ink"]}" '
                                f'stroke-width="{WEIGHT["skyline"]}" stroke-opacity="0.75" stroke-linejoin="round"/>')

    # ------------------------------------------------------------------ draped linework
    rng = np.random.default_rng(T.SEED)
    hachures(doc, G, H, L, hs, rng)
    ICE.glacier(doc, G, H, L, PAL, rng)
    ICE.debris_cover(doc, G, L, PAL)
    ICE.rivers(doc, G, H, L, PAL, w)
    streams(doc, G, H, L, w)

    # ------------------------------------------------------------------ the living landscape
    F.fields(doc, G, H, L, PAL, rng)
    F.terraces(doc, G, H, L, PAL)
    F.trees(doc, G, H, L, PAL, rng)
    for (cx, cy, r, n_, kind) in SETTLEMENTS:
        F.settlement(doc, G, H, L, PAL, rng, cx, cy, r, n_, kind, k=(1.0 if kind == 'town' else 1.6),
                     gap=(6, 4) if kind == 'town' else (9, 6))

    # ------------------------------------------------------------------ built things, herds, the route
    roads = ST.road_layer(doc, G, H, L, PAL)
    ST.dam_and_power(doc, G, H, L, PAL, w, roads)
    ST.mine(doc, G, H, L, PAL)
    ST.monastery(doc, G, H, L, PAL)
    ST.observatory(doc, G, H, L, PAL, 0.355, 0.665)
    ST.solar(doc, G, H, L, PAL)
    ST.herd(doc, G, H, L, PAL, rng, 0.255, 0.585, 10, 'llama')
    ST.herd(doc, G, H, L, PAL, rng, 0.86, 0.62, 7, 'yak')
    ST.rock_glacier(doc, G, H, L, PAL)
    ICE.retreat(doc, G, H, PAL)
    stations = ST.story_route(doc, G, H, L, PAL)

    # ------------------------------------------------------------------ the scientific apparatus
    LB.ruler(doc, PAL)
    LB.isolines(doc, G, PAL, cls)
    LB.winds(doc, PAL)
    ST.pictograms(doc, G, H, PAL)
    LB.spot_heights(doc, G, H, PAL)
    LB.feature_labels(doc, G, H, PAL, FEATURES)
    LB.compass_and_scale(doc, PAL, 150, 1480)
    ST.station_key(doc, PAL, 1995, 1112, cols=1, colw=380, lh=19.0)
    doc.stations = stations

    # ------------------------------------------------------------------ aerial perspective
    # a navy haze that thickens with distance, so the back of the range recedes
    D2 = depth_image(G)
    dmax = np.nanmax(D2)
    hz = doc.layer('Haze')
    for frac, op in [(0.62, 0.10), (0.74, 0.10), (0.86, 0.10)]:
        d = K.trace(G.mask & (np.nan_to_num(D2) > frac * dmax), blur=3, step=2.4)
        hz.append(f'<path d="{d}" fill="{PAL["haze"]}" fill-opacity="{op}" fill-rule="evenodd"/>')

    # ------------------------------------------------------------------ cut faces
    GEO.draw(doc, H, PAL, np.random.default_rng(3), _tone)

    return doc



# ---------------------------------------------------------------------------
# linework draped on the ground
# ---------------------------------------------------------------------------
def visible_runs(G, x, y, z, min_len=2):
    """Split a ground polyline into the stretches the camera can see."""
    vis = G.visible(x, y, z)
    sx, sy = V.project(x, y, z)
    runs, cur = [], []
    for i in range(len(x)):
        if vis[i]:
            cur.append((sx[i], sy[i]))
        elif cur:
            if len(cur) >= min_len:
                runs.append(np.array(cur))
            cur = []
    if len(cur) >= min_len:
        runs.append(np.array(cur))
    return runs


def world_lines(field, levels, mask=None):
    """Iso-lines of a world-grid field, in world coordinates (0..1)."""
    import contourpy
    n = field.shape[0]
    z = np.where(mask, field, np.nan) if mask is not None else field
    gen = contourpy.contour_generator(z=z, line_type='Separate')
    out = []
    for lv in levels:
        for seg in gen.lines(lv):
            if len(seg) > 2:
                out.append((lv, seg / (n - 1)))
    return out


def hachures(doc, G, H, L, hs, rng):
    """Short strokes down the fall line on rock and scree: the engraver's relief."""
    cls = L['cls']
    step = 0.0042                                       # spacing of strokes — adjust density here
    g = np.arange(step / 2, 1, step)
    X, Y = np.meshgrid(g, g)
    X = (X + rng.uniform(-0.45, 0.45, X.shape) * step).ravel()
    Y = (Y + rng.uniform(-0.45, 0.45, Y.shape) * step).ravel()
    c = V.nearest(cls, X, Y)
    rock, scree = c == LC.ROCK, c == LC.SCREE
    keep = rock | (scree & (rng.random(X.shape) < 0.45))
    X, Y = X[keep], Y[keep]; isrock = rock[keep]
    n = H.shape[0]
    gy_, gx_ = np.gradient(H)
    gxv, gyv = V.sample(gx_, X, Y), V.sample(gy_, X, Y)
    mag = np.hypot(gxv, gyv) + 1e-9
    sl = V.sample(L['slope'], X, Y)
    Lw = (0.0014 + 0.0030 * np.clip((sl - 22) / 40, 0, 1)) * np.where(isrock, 1.0, 0.7)
    X2 = np.clip(X - gxv / mag * Lw, 0, 1); Y2 = np.clip(Y - gyv / mag * Lw, 0, 1)
    Z1, Z2 = V.sample(H, X, Y) + 4, V.sample(H, X2, Y2) + 4
    vis = G.visible(X, Y, Z1) & G.visible(X2, Y2, Z2)
    sx1, sy1 = V.project(X, Y, Z1); sx2, sy2 = V.project(X2, Y2, Z2)
    lit = V.sample(hs, X, Y)
    lay = doc.layer('Hachures')
    for lo, hi, op in [(-9, 0.25, 0.06), (0.25, 0.55, 0.13), (0.55, 9, 0.22)]:   # brighter on lit faces
        k = vis & (lit >= lo) & (lit < hi)
        d = ''.join(f'M{a:.1f} {b:.1f}L{c_:.1f} {e:.1f}' for a, b, c_, e in zip(sx1[k], sy1[k], sx2[k], sy2[k]))
        if d:
            lay.append(f'<path d="{d}" fill="none" stroke="{PAL["ink"]}" stroke-width="0.55" '
                       f'stroke-opacity="{op}" stroke-linecap="round"/>')


def glacier_marks(doc, G, H, L, rng):
    """Crevasses across the flow, bowed down-glacier; moraines along the margins."""
    cls = L['cls']; n = H.shape[0]
    ice = cls == LC.GLACIER
    gt, gd = L['glacier_t'], L['glacier_d']
    gw = 0.028 + 0.050 * (1 - gt) ** 1.5
    bowed = gt + 0.05 * np.clip(gd / gw, 0, 1.5) ** 2     # margins lag: arcs convex down-glacier
    main = ice & (gd < 0.16)
    lay = doc.layer('Glacier-detail')
    d = []
    for lv, seg in world_lines(bowed, np.arange(0.06, 1.0, 0.021), main):
        x, y = seg[:, 0], seg[:, 1]
        z = V.sample(H, x, y) + 6
        for run in visible_runs(G, x, y, z):
            # break each line into crevasse slits with gaps
            L_ = len(run); i = 0
            while i < L_ - 2:
                j = min(L_, i + int(rng.integers(3, 9)))
                d.append(K.d_poly(run[i:j], False, 1.0))
                i = j + int(rng.integers(2, 6))
    lay.append(f'<path d="{"".join(d)}" fill="none" stroke="{PAL["crevasse"]}" stroke-width="1.1" '
               f'stroke-opacity="0.9" stroke-linecap="round"/>')
    # margins of all ice: rubble on the edge (lateral and terminal moraines)
    iceb = K.box_blur(ice.astype(float), 1)
    d = []
    for lv, seg in world_lines(iceb, [0.35]):
        x, y = seg[:, 0], seg[:, 1]
        z = V.sample(H, x, y) + 6
        for run in visible_runs(G, x, y, z):
            d.append(K.d_poly(run, False, 1.5))
    doc.layer('Moraines').append(f'<path d="{"".join(d)}" fill="none" stroke="{PAL["inkSoft"]}" stroke-width="1.6" '
                                 f'stroke-dasharray="0.1 3.2" stroke-linecap="round" stroke-opacity="0.9"/>')


def streams(doc, G, H, L, w):
    """The drainage network, traced downstream from where channels begin."""
    acc = L['acc']; cls = L['cls']; n = H.shape[0]
    _, best, has = T.flow(H)
    offs = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    thr = 420                                            # channel initiation — adjust stream density here
    # on the plain the ground is too flat for its drainage to mean anything;
    # only the designed rivers run there
    stream = (acc > thr) & (cls != LC.GLACIER) & (cls != LC.WATER) & (w['Y'] > T.LOWLAND_Y - 0.02)
    down = {}
    js, is_ = np.nonzero(stream)
    for j, i in zip(js, is_):
        if has[j, i]:
            dj, di = offs[best[j, i]]
            down[(j, i)] = (j + dj, i + di)
    ups = {}
    for a, b in down.items():
        ups.setdefault(b, 0); ups[b] += 1
    heads = [c for c in zip(js, is_) if ups.get(c, 0) == 0]
    seen = set(); lines = []
    for h in heads:
        pts = [h]; c = h
        while c in down and c not in seen:
            seen.add(c); c = down[c]; pts.append(c)
            if not (0 <= c[0] < n and 0 <= c[1] < n) or not stream[c]:
                break
        if len(pts) > 4:
            lines.append(pts)
    lay = doc.layer('Streams')
    for pts in lines:
        pts = np.array(pts)
        x, y = pts[:, 1] / (n - 1), pts[:, 0] / (n - 1)
        z = V.sample(H, x, y) + 3
        a = acc[pts[-1][0] if pts[-1][0] < n else n - 1, pts[-1][1] if pts[-1][1] < n else n - 1]
        wgt = 0.5 + 0.35 * np.log10(max(a, 10))
        for run in visible_runs(G, x, y, z):
            lay.append(f'<path d="{K.d_smooth(run, False, 1.6)}" fill="none" stroke="{PAL["waterLine"]}" '
                       f'stroke-width="{wgt:.2f}" stroke-opacity="0.85" stroke-linecap="round" stroke-linejoin="round"/>')


# ---------------------------------------------------------------------------
# the cut faces: the block's two front sides, with the rock beneath
# ---------------------------------------------------------------------------
def faces(doc, H, rng=None):
    """The two front sides of the block, with the rock beneath: soil, the
    valley's gravels, folded sedimentary beds over a granite core, frozen
    ground under the high slopes and the water table under the plain. Units
    carry the standard geological-map symbols, drawn as plain linework."""
    import labels as LB
    rng = rng or np.random.default_rng(3)
    lay = doc.layer('Faces')
    sym = doc.layer('Face-symbols')
    lab = doc.layer('Face-labels')
    for face in ('west', 'south'):
        s = np.linspace(0, 1, 500)
        x, y = (np.zeros_like(s), s) if face == 'west' else (s, np.zeros_like(s))
        ztop = V.sample(H, x, y)
        tone = 1.06 if face == 'west' else 0.84              # the lit side, and the side away
        ph = 0.7 if face == 'west' else 2.3
        fold = lambda amp, lam, off: amp * np.sin(2 * np.pi * s / lam + ph + off)
        plain = np.clip((900 - ztop) / 600, 0, 1)             # 1 under the plain
        soil = ztop - (60 + 50 * plain)
        allu_base = ztop - 60 - 520 * plain
        sand = -150 + fold(380, 0.55, 0) + (900 * s if face == 'west' else 0)
        shale = sand - 420 + fold(120, 0.3, 1.1)
        lime = shale - 520 + fold(160, 0.45, 2.0)
        gran = (-1500 + 2600 * np.clip((s - 0.45) / 0.55, 0, 1) ** 1.5) if face == 'west' else np.full_like(s, -1650.0)
        base = np.full_like(s, V.ZBASE)
        units = [('granite', ztop, base), ('limestone', lime, gran), ('shale', shale, lime),
                 ('sandstone', sand, shale), ('alluvium', allu_base + 520, allu_base), ('soil', ztop, soil)]
        drawn = {}
        for name, top_z, bot_z in units:
            top_z = np.minimum(top_z, ztop); bot_z = np.minimum(np.maximum(bot_z, base), top_z)
            if name == 'alluvium':
                top_z = np.where(plain > 0.02, np.minimum(top_z, soil), bot_z)
            if np.all(top_z - bot_z < 1):
                continue
            drawn[name] = (top_z.copy(), bot_z.copy())
            tx, ty = V.project(x, y, top_z); bx, by = V.project(x, y, bot_z)
            pts = np.concatenate([np.stack([tx, ty], 1), np.stack([bx, by], 1)[::-1]])
            lay.append(f'<path d="{K.d_poly(pts, True, 1.0)}" fill="{_tone(PAL[name], tone)}" stroke="{PAL["shade"]}" '
                       f'stroke-width="0.4" stroke-opacity="0.5"/>')
        # what is visibly exposed of each unit: granite is overprinted by the beds
        order = ['granite', 'limestone', 'shale', 'sandstone', 'alluvium', 'soil']
        def exposed(name, si, z):
            t, b = drawn[name]
            if not (b[si] + 25 < z < t[si] - 25):
                return False
            for above in order[order.index(name) + 1:]:
                if above in drawn:
                    t2, b2 = drawn[above]
                    if b2[si] - 10 < z < t2[si] + 10:
                        return False
            return True
        # symbols — adjust spacing here
        marks = {k: [] for k in order}
        for si in range(3, len(s) - 3, 6):
            for z in np.arange(V.ZBASE + 40, ztop[si], 95):
                zz = z + rng.uniform(-25, 25)
                for name in order:
                    if name in drawn and exposed(name, si, zz):
                        px_, py_ = V.project(x[si], y[si], zz)
                        marks[name].append((px_, py_, si))
                        break
        dx_ = np.array(V.project(x[6], y[6], 0)) - np.array(V.project(x[0], y[0], 0))
        dx_ = dx_ / np.hypot(*dx_)                               # along the face, on screen
        ink = PAL['ink']
        for name, pts in marks.items():
            d = []
            for (px_, py_, si) in pts:
                if name == 'granite' and rng.random() < 0.8:        # crosses
                    d.append(f'M{f1(px_ - 2.2)} {f1(py_)}l4.4 0M{f1(px_)} {f1(py_ - 2.2)}l0 4.4')
                elif name == 'limestone':                             # brick courses
                    a = np.array([px_, py_]) - dx_ * 5; b = np.array([px_, py_]) + dx_ * 5
                    d.append(f'M{f1(a[0])} {f1(a[1])}L{f1(b[0])} {f1(b[1])}M{f1(px_)} {f1(py_)}l0 4')
                elif name == 'shale':                                 # dashes
                    a = np.array([px_, py_]) - dx_ * 3; b = np.array([px_, py_]) + dx_ * 3
                    d.append(f'M{f1(a[0])} {f1(a[1])}L{f1(b[0])} {f1(b[1])}')
                elif name == 'sandstone':                             # stipple
                    for _ in range(2):
                        qx, qy = px_ + rng.uniform(-3, 3), py_ + rng.uniform(-2, 2)
                        d.append(f'M{f1(qx)} {f1(qy)}l0.1 0')
                elif name == 'alluvium':                              # gravel
                    r = rng.uniform(0.9, 1.8)
                    d.append(f'M{f1(px_ - r)} {f1(py_)}a{f1(r)} {f1(r * 0.8)} 0 1 0 {f1(2 * r)} 0a{f1(r)} {f1(r * 0.8)} 0 1 0 {f1(-2 * r)} 0')
            if d:
                cap = ' stroke-linecap="round"' if name == 'sandstone' else ''
                wdt = 1.3 if name == 'sandstone' else 0.6
                sym.append(f'<path d="{"".join(d)}" fill="none" stroke="{ink}" stroke-width="{wdt}" stroke-opacity="0.35"{cap}/>')
        # frozen ground under the high slopes (active layer left thawed)
        PF = 3400
        if (ztop > PF).any():
            ptop = np.where(ztop > PF, ztop - 15, ztop)
            pbot = np.where(ztop > PF, ztop - 15 - np.clip((ztop - PF) * 0.55, 0, 1100), ztop)
            tx, ty = V.project(x, y, ptop); bx, by = V.project(x, y, pbot)
            pts = np.concatenate([np.stack([tx, ty], 1), np.stack([bx, by], 1)[::-1]])
            lay.append(f'<path d="{K.d_poly(pts, True, 1.0)}" fill="{PAL["permafrost"]}" fill-opacity="0.28" '
                       f'stroke="{PAL["permafrost"]}" stroke-width="0.7" stroke-opacity="0.8"/>')
            si = int(np.argmax(ztop))
            if ztop[si] > PF + 300:
                qx, qy = V.project(x[si], y[si], ztop[si] - 15 - (ztop[si] - PF) * 0.28)
                lab.append(LB.text(qx + 8, qy + 4, 'permafrost', PAL, LB.TYPE['face'], col=PAL['permafrost']))
        # the water table under the plain
        if face == 'south':
            wt = np.where(plain > 0.3, ztop - 70 - 30 * np.sin(s * 9), np.nan)
            seg = ~np.isnan(wt)
            if seg.any():
                tx, ty = V.project(x[seg], y[seg], wt[seg])
                lay.append(f'<path d="{K.d_poly(np.stack([tx, ty], 1), False, 1)}" fill="none" stroke="{PAL["waterLine"]}" '
                           f'stroke-width="1" stroke-dasharray="6 3"/>')
                i = int(len(tx) * 0.62)
                lab.append(LB.text(tx[i], ty[i] + 14, 'water table', PAL, LB.TYPE['face'], col=PAL['waterLine']))
        # unit names, where each unit is thickest
        for name in order:
            if name not in drawn or name == 'soil':
                continue
            t, b = drawn[name]
            thick = t - b
            si = int(np.argmax(thick[20:-20])) + 20
            if thick[si] < 260:
                continue
            qx, qy = V.project(x[si], y[si], (t[si] + b[si]) / 2)
            lab.append(LB.text(qx, qy + 4, name, PAL, LB.TYPE['face'], anchor='middle', col=PAL['ink'], op=0.8))
        # the outline of the face
        tx, ty = V.project(x, y, ztop); bx, by = V.project(x, y, base)
        outline = np.concatenate([np.stack([tx, ty], 1), np.stack([bx, by], 1)[::-1]])
        lay.append(f'<path d="{K.d_poly(outline, True, 1.0)}" fill="none" stroke="{PAL["ink"]}" '
                   f'stroke-width="{WEIGHT["face"]}" stroke-opacity="0.8" stroke-linejoin="round"/>')


def _tone(hexc, k):
    c = [int(hexc[i:i + 2], 16) for i in (1, 3, 5)]
    c = [max(0, min(255, int(round(v * k)))) for v in c]
    return '#%02X%02X%02X' % tuple(c)


if __name__ == '__main__':
    import json
    out = sys.argv[1]
    doc = render()
    open(out, 'w').write(doc.svg())
    # the stations' positions on the canvas, for placing interactive markers on the web
    with open(out.rsplit('.', 1)[0] + '-stations.json', 'w') as fh:
        json.dump(dict(width=V.W, height=V.H_PX, stations=doc.stations), fh, indent=1)
    print('wrote', out)
