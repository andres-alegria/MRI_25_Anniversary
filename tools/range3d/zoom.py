"""
Zoom clips for the stories: a small block cut out of the same landscape,
drawn as its own block diagram with the detail the overview cannot hold.

    python3 zoom.py agriculture OUT.svg
    python3 zoom.py urban OUT.svg
"""
import sys
import numpy as np
import terrain as T
import view as V
import landcover as LC
import svgkit as K
import features as F
import clip as CL
import geology as GEO
import labels as LB
import render as R
import story as ST

f1 = K.f1
P = R.PAL
CANVAS = (1800, 1300)          # clip canvas, px — adjust here
CLIP_VE = 1.8                  # true vertical exaggeration of the clips — adjust here


def world_to_local(pts, frame):
    return CL.to_local(np.asarray(pts, float), frame)


_WORLD = []                      # the world is the same for every clip: build it once


def world():
    if not _WORLD:
        w = T.build()
        _WORLD.append((w, LC.classify(w)))
    return _WORLD[0]


def base_block(name, rng, recover=None):
    cfg = CL.CLIPS[name] if isinstance(name, str) else name
    w, L = world()
    wc, Lc = CL.window(w, L, cfg['x0'], cfg['y0'], cfg['size'])
    H = wc['H']
    if recover:
        Lc['cls'] = recover(wc, Lc)                    # a land use designed for the story, on the clip's own ground
    V.W, V.H_PX = CANVAS
    # heights: the overview's px-per-metre ratio, scaled so the clip's true
    # vertical exaggeration is CLIP_VE (its ground span is `size` of the block)
    V.SCALE = 1330.0
    V.ZK = 0.086 / (1.8 / CLIP_VE) / cfg['size'] * (1330.0 / 1330.0)
    V.ZBASE = float(H.min()) - 130.0     # a low sediment band — adjust the clip's depth here
    V.fit(H, margin=(90, 150, 90, 90))     # the title sits in the top margin
    G = V.GBuffer(H, V.W, V.H_PX)
    doc = K.Doc(V.W, V.H_PX, P['sky1'])
    for nm in ['Sky', 'Ground'] + ['Cover-' + n for n in LC.NAMES[1:]] + \
            ['Fields', 'Shade', 'Contours', 'Terraces', 'Streams', 'Skyline', 'Trees', 'Isolines', 'Settlements',
             'Infrastructure', 'People-animals', 'Route', 'Faces', 'Face-symbols', 'Face-labels',
             'Labels', 'Title', 'Stations']:
        doc.layer(nm)
    m = G.mask
    px, py = np.nan_to_num(G.px), np.nan_to_num(G.py)
    doc.defs.append(f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
                    f'<stop offset="0" stop-color="{P["sky0"]}"/><stop offset="1" stop-color="{P["sky1"]}"/></linearGradient>')
    doc.layer('Sky').append(f'<rect width="{V.W}" height="{V.H_PX}" fill="url(#sky)"/>')
    doc.layer('Ground').append(f'<path d="{K.trace(m, blur=0, step=1.5)}" fill="{P["ground"]}"/>')
    C = np.where(m, V.nearest(Lc['cls'], px, py), -1)
    for code, nm in enumerate(LC.NAMES):
        if code == LC.GROUND:
            continue
        mk = C == code
        if mk.sum() < 30:
            continue
        doc.layer('Cover-' + nm).append(f'<path d="{K.trace(mk, blur=1, step=2.0)}" fill="{P[nm]}" fill-rule="evenodd"/>')
    # shading at the clip's own ground span
    span = LC.SPAN_M * cfg['size']
    gy, gx = np.gradient(H, span / (H.shape[0] - 1))
    nx, ny, nz = -gx * 3, -gy * 3, np.ones_like(H)
    hs = (nx * R.LIGHT[0] + ny * R.LIGHT[1] + nz * R.LIGHT[2]) / np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    S = np.where(m, V.sample(hs, px, py), 1.0)
    for lv, op in [(0.55, 0.12), (0.40, 0.12), (0.26, 0.13)]:
        doc.layer('Shade').append(f'<path d="{K.trace(m & (S < lv), blur=2, step=2.2)}" fill="{P["shade"]}" '
                                  f'fill-opacity="{op}" fill-rule="evenodd"/>')
    # contours every 20 m, index every 100 m
    D = R.depth_image(G)
    jump = np.zeros_like(m)
    dd = np.abs(np.diff(np.nan_to_num(D, nan=9), axis=0)) > 0.012
    jump[1:] |= dd; jump[:-1] |= dd
    Z = np.where(m & ~jump, G.pz, np.nan)
    iso = K.lines(Z, list(range(200, 3000, 20)))
    for lv, segs in iso.items():
        idx = lv % 100 == 0
        d = ''.join(K.d_poly(sg, False, 2.0) for sg in segs)
        if d:
            doc.layer('Contours').append(f'<path d="{d}" fill="none" stroke="{P["ink"]}" stroke-width="{0.8 if idx else 0.45}" '
                                         f'stroke-opacity="{0.35 if idx else 0.16}"/>')
    top = np.where(m.any(0), m.argmax(0), -1)
    cols = np.nonzero(top >= 0)[0]
    doc.layer('Skyline').append(f'<path d="{K.d_smooth(np.stack([cols + 0.5, top[cols] + 0.5], 1), False, 2.0)}" '
                                f'fill="none" stroke="{P["ink"]}" stroke-width="1.4" stroke-opacity="0.7"/>')
    GEO.draw(doc, H, P, np.random.default_rng(3), R._tone, frame=(cfg['x0'], cfg['y0'], cfg['size']),
             annotate=False)
    return cfg, wc, Lc, H, G, doc, hs


def draped(G, H, pts, lift=2.0):
    return F.draped(G, H, np.asarray(pts, float), lift)


def terraces_clip(doc, G, H, Lc, step=14):
    mask = Lc['cls'] == LC.TERRACE
    grow = K.box_blur(mask.astype(float), 1) > 0.25
    d = []
    lo = float(H.min())
    for lv, seg in R.world_lines(H, np.arange(lo + 20, lo + 1300, step), grow):
        for run in R.visible_runs(G, seg[:, 0], seg[:, 1], V.sample(H, seg[:, 0], seg[:, 1]) + 1, 3):
            d.append(K.d_smooth(run, False, 1.2))
    doc.layer('Terraces').append(f'<path d="{"".join(d)}" fill="none" stroke="{P["terraceLine"]}" '
                                 f'stroke-width="1" stroke-opacity="0.7" stroke-linecap="round"/>')


def title(doc, cfg, num):
    lay = doc.layer('Title')
    lay.append(f'<circle cx="112" cy="84" r="24" fill="{P["paper"]}" stroke="{P["red"]}" stroke-width="3"/>')
    lay.append(f'<text x="112" y="92" text-anchor="middle" font-family="{K.SANS}" font-weight="700" font-size="22" '
               f'fill="{P["titleInk"]}">{num:02d}</text>')
    lay.append(LB.text(152, 92, cfg['title'].replace('&', '&amp;'), P, 30, italic=False, weight=600, col=P['titleInk']))


def scale_bar(doc, cfg, x=90, y=1250):
    lay = doc.layer('Labels')
    span = LC.SPAN_M * cfg['size']
    L_m = 1000
    a = np.array(V.project(0.05, 0.0, V.ZBASE)); b = np.array(V.project(0.05 + L_m / span, 0.0, V.ZBASE))
    off = np.array([0, 30])
    lay.append(f'<path d="M{f1(a[0])} {f1(a[1] + off[1])}L{f1(b[0])} {f1(b[1] + off[1])}" stroke="{P["ink"]}" stroke-width="1.6"/>')
    for q in (a, b):
        lay.append(f'<path d="M{f1(q[0])} {f1(q[1] + off[1] - 5)}l0 10" stroke="{P["ink"]}" stroke-width="1.2"/>')
    mid = (a + b) / 2 + off
    ve = V.ZK / (np.cos(V.PHI) * V.SCALE / span)
    lay.append(LB.text(mid[0], mid[1] + 22, '1 km', P, 15, italic=False, anchor='middle'))
    lay.append(LB.text(mid[0], mid[1] + 40, f'heights exaggerated about ×{ve:.1f}', P, 13, anchor='middle', col=P['inkSoft']))


def callout(doc, x, y, text_, dx, dy, col=None):
    lay = doc.layer('Labels')
    ex, ey = x + dx, y + dy
    lay.append(f'<path d="M{f1(x)} {f1(y)}L{f1(ex)} {f1(ey)}" stroke="{P["inkSoft"]}" stroke-width="0.8"/>')
    lay.append(f'<circle cx="{f1(x)}" cy="{f1(y)}" r="2" fill="{P["ink"]}"/>')
    lay.append(LB.halo(ex + (6 if dx >= 0 else -6), ey + 5, text_, P, 16, anchor='start' if dx >= 0 else 'end', col=col))


def at(H, x, y, lift=0.0):
    return np.array(V.project(x, y, V.sample(H, x, y) + lift))


# ---------------------------------------------------------------------------
# people at work, animals, small built things (px sizes, clip scale)
# ---------------------------------------------------------------------------
def farmer_bent(x, y, k=2.2, fl=1):
    """A farmer bent over, planting: body folded at the hip, arm down to the water."""
    q = lambda a, b: f'{f1(x + a * k * fl)} {f1(y - b * k)}'
    d = (f'M{q(-1.4, 0)}L{q(-0.8, 3.4)}Q{q(0.5, 6.8)} {q(3.4, 6.2)}L{q(4, 5.2)}Q{q(1.8, 5.2)} {q(1.2, 3.2)}'
         f'L{q(1, 0)}L{q(0.2, 0)}L{q(0, 2.6)}L{q(-0.5, 0)}Z'
         f'M{q(3.4, 5.6)}L{q(4.6, 2)}L{q(4.1, 1.8)}L{q(3, 5.2)}Z')
    hat = f'M{q(3.2, 7.5)}L{q(6.4, 6.3)}L{q(4.9, 8.4)}Z'                  # a conical hat
    return f'<path d="{d}" fill="{P["figure"]}"/><path d="{hat}" fill="{P["hat"]}"/>'


def buffalo(x, y, k=2.0, fl=1):
    q = lambda a, b: f'{f1(x + a * k * fl)} {f1(y - b * k)}'
    d = (f'M{q(-6, 0)}L{q(-5.6, 3.4)}L{q(-6.8, 4.6)}Q{q(-6, 8.2)} {q(0, 8)}L{q(4.4, 7.6)}L{q(7.6, 6.4)}L{q(7.2, 4.6)}'
         f'L{q(5, 4.4)}L{q(4.6, 0)}L{q(3.4, 0)}L{q(3, 3.4)}L{q(-3.8, 3.4)}L{q(-4.6, 0)}Z'
         f'M{q(5.4, 7.4)}Q{q(4, 10.4)} {q(1.6, 9.6)}Q{q(3.6, 9.2)} {q(4.6, 7.2)}Z')
    return f'<path d="{d}" fill="{P["buffalo"]}" stroke="{P["shade"]}" stroke-width="0.5"/>'


def granary(x, y, k=1.0):
    """A raised grain store on stilts with a thatched cone roof."""
    w, h = 12 * k, 9 * k
    return (f'<path d="M{f1(x - w / 2 + 2)} {f1(y)}l0 {-5 * k}M{f1(x + w / 2 - 2)} {f1(y)}l0 {-5 * k}" stroke="{P["wallShade"]}" stroke-width="1.6"/>'
            f'<rect x="{f1(x - w / 2)}" y="{f1(y - 5 * k - h)}" width="{f1(w)}" height="{f1(h)}" fill="{P["wallLit"]}" stroke="{P["shade"]}" stroke-width="0.5"/>'
            f'<path d="M{f1(x - w / 2 - 3)} {f1(y - 5 * k - h)}L{f1(x)} {f1(y - 5 * k - h - 9 * k)}L{f1(x + w / 2 + 3)} {f1(y - 5 * k - h)}Z" '
            f'fill="{P["thatch"]}" stroke="{P["shade"]}" stroke-width="0.5"/>')


def market(x, y, k=1.0):
    """A row of market stalls under striped awnings."""
    out = []
    ux, vy = F.axes()
    cols = [P['red'], P['awning2'], P['awning3'], P['red'], P['awning2']]
    for i in range(5):
        c = np.array([x, y]) + ux * i * 11 * k
        a = c; b = c + ux * 9 * k
        out.append(f'<path d="M{f1(a[0])} {f1(a[1])}l0 {-7 * k}M{f1(b[0])} {f1(b[1])}l0 {-7 * k}" stroke="{P["inkSoft"]}" stroke-width="0.8"/>')
        out.append(f'<path d="M{f1(a[0] - 1)} {f1(a[1] - 7 * k)}L{f1(b[0] + 1)} {f1(b[1] - 7 * k)}L{f1(b[0] - 1)} {f1(b[1] - 11 * k)}'
                   f'L{f1(a[0] + 1)} {f1(a[1] - 11 * k)}Z" fill="{cols[i]}" fill-opacity="0.9"/>')
    return ''.join(out)


def tower(x, y, w, d, h, k=1.0):
    """A mid-rise block with window bands."""
    s = F.box(x, y, w * k, d * k, h * k, 'flat', P)
    ux, vy = F.axes()
    a = np.array([x, y]) - ux * w * k / 2 - vy * d * k / 2
    dd = vy * d * k
    out = [s]
    for fl in np.arange(4, h * k - 2, 4.2):
        p0 = a + np.array([0, -fl]); p1 = p0 + dd
        out.append(f'<path d="M{f1(p0[0])} {f1(p0[1])}L{f1(p1[0])} {f1(p1[1])}" stroke="{P["window"]}" stroke-width="1.1" stroke-opacity="0.55"/>')
    return ''.join(out)


def crane(x, y, k=1.0):
    h = 60 * k
    return (f'<path d="M{f1(x)} {f1(y)}L{f1(x)} {f1(y - h)}M{f1(x - 14 * k)} {f1(y - h + 4)}L{f1(x + 36 * k)} {f1(y - h + 4)}'
            f'M{f1(x + 30 * k)} {f1(y - h + 4)}l0 {f1(18 * k)}M{f1(x)} {f1(y - h - 8)}L{f1(x - 14 * k)} {f1(y - h + 4)}M{f1(x)} {f1(y - h - 8)}L{f1(x + 36 * k)} {f1(y - h + 4)}" '
            f'fill="none" stroke="{P["crane"]}" stroke-width="{f1(1.4 * k)}"/>'
            f'<rect x="{f1(x + 27 * k)}" y="{f1(y - h + 22 * k)}" width="{f1(6 * k)}" height="{f1(4 * k)}" fill="{P["crane"]}"/>')


def shack(x, y, k=1.0, c=None):
    """A self-built house: a small box with a sloping sheet-metal roof."""
    w, d, h = 7 * k, 5 * k, 4.5 * k
    s = F.box(x, y, w, d, h, 'flat', dict(P, wallLit=c or P['wallLit'], roofFlat=P['sheet']))
    return s


# ---------------------------------------------------------------------------
# the two clips
# ---------------------------------------------------------------------------
def agri_cover(wc, Lc):
    """Paddies on the lowest flats by the river, fields on the rest of the
    plain, a band of terraces on the foot-slope, forest above."""
    H = wc['H']; cls = Lc['cls'].copy(); sl = Lc['slope']
    X, Y = wc['X'], wc['Y']
    lo = np.percentile(H, 2)
    noise = T.fbm(X * 6, Y * 6, 3, seed=91)
    water = cls == LC.WATER
    cls[:] = LC.FIELD
    cls[(sl < 3.5) & (H < lo + 60 + 25 * noise)] = LC.PADDY
    ter = (H > lo + 70) & (H < lo + 560 + 120 * noise) & (sl > 4) & (sl < 32) & (noise > -0.2)
    cls[ter] = LC.TERRACE
    cls[(H > lo + 560 + 120 * noise) | (sl > 34) | ((sl > 8) & ~ter & (H > lo + 70))] = LC.FOREST
    cls[water] = LC.WATER
    return cls


def find(Lc, H, G, cond, rng, n=1, spacing=0.05):
    """Visible places where cond (a world-grid mask) holds, spread apart."""
    js, is_ = np.nonzero(cond)
    out = []
    order = rng.permutation(len(js))
    N = H.shape[0] - 1
    for k in order:
        x, y = is_[k] / N, js[k] / N
        if not G.visible(x, y, H[js[k], is_[k]] + 2):
            continue
        if any(np.hypot(x - a, y - b) < spacing for a, b in out):
            continue
        out.append((x, y))
        if len(out) >= n:
            break
    return out


def agriculture(out):
    rng = np.random.default_rng(10)
    cfg, wc, Lc, H, G, doc, hs = base_block('agriculture', rng, agri_cover)
    cls, sl = Lc['cls'], Lc['slope']
    lo = float(np.percentile(H, 2))
    F.fields(doc, G, H, Lc, P, rng, k=1 / cfg['size'] * 0.75, v_range=(-0.3, 1.3))
    terraces_clip(doc, G, H, Lc)
    F.trees(doc, G, H, Lc, P, rng, scale=2.1, step=0.017)
    # the canal: it follows a contour just above the paddies, as a real one must
    lay = doc.layer('Streams')
    segs = [seg for lv, seg in R.world_lines(H, [lo + 72]) if len(seg) > 40]
    canal = max(segs, key=len) if segs else None
    offtakes = []
    if canal is not None:
        for r in draped(G, H, canal, 2):
            lay.append(f'<path d="{K.d_smooth(r, False, 1.5)}" fill="none" stroke="{P["shade"]}" stroke-width="5.5" stroke-opacity="0.6"/>')
            lay.append(f'<path d="{K.d_smooth(r, False, 1.5)}" fill="none" stroke="{P["waterLine"]}" stroke-width="3" stroke-linecap="round"/>')
        gy_, gx_ = np.gradient(H)
        for i in range(10, len(canal) - 5, max(12, len(canal) // 9)):
            a = canal[i]
            g = np.array([V.sample(gx_, *a), V.sample(gy_, *a)]); g = -g / (np.hypot(*g) + 1e-9)
            b = a + g * 0.05
            for r in draped(G, H, F.densify(np.array([a, b]), 0.003), 2):
                lay.append(f'<path d="{K.d_poly(r, False, 1)}" fill="none" stroke="{P["waterLine"]}" stroke-width="1.4"/>')
            sa = at(H, a[0], a[1], 2)
            lay.append(f'<rect x="{f1(sa[0] - 3.5)}" y="{f1(sa[1] - 6)}" width="7" height="6" fill="{P["concrete"]}" stroke="{P["shade"]}" stroke-width="0.6"/>')
            offtakes.append(a)
    # farmers transplanting in the paddies; buffalo ploughing
    pl = doc.layer('People-animals')
    spots = find(Lc, H, G, cls == LC.PADDY, rng, n=12, spacing=0.07)
    for k, (x, y) in enumerate(sorted(spots, key=lambda q: -q[1])):
        sx, sy = at(H, x, y)
        if k % 4 == 3:
            pl.append(buffalo(sx, sy, 2.4, 1 if k % 2 else -1))
            pl.append(ST.person(sx + 26, sy, P, staff=True, k=2.4))
        else:
            pl.append(farmer_bent(sx, sy, 2.5, 1 if k % 2 else -1))
            pl.append(farmer_bent(sx + 18, sy + 5, 2.3, -1 if k % 2 else 1))
            pl.append(farmer_bent(sx - 16, sy + 3, 2.2, 1))
    # the village on the foot-slope between the paddies and the terraces
    vsites = find(Lc, H, G, (H > lo + 85) & (H < lo + 200) & (sl < 12), rng, n=1)
    sl_ = doc.layer('Settlements')
    vx, vy = vsites[0] if vsites else (0.5, 0.5)
    F.settlement(doc, G, H, Lc, P, rng, vx, vy, 0.07, 18, 'village', k=2.6, gap=(22, 14))
    for dx, dy in [(-0.05, -0.03), (0.06, 0.02), (0.03, -0.05)]:
        p_ = at(H, vx + dx, vy + dy)
        sl_.append(granary(p_[0], p_[1], 1.6))
    mk = at(H, vx - 0.03, vy - 0.045)
    sl_.append(market(mk[0] - 25, mk[1], 1.5))
    # a solar-powered tube well among the fields
    tsites = find(Lc, H, G, (cls == LC.FIELD) & (sl < 3), rng, n=1)
    if tsites:
        tw = at(H, *tsites[0])
        sl_.append(f'<path d="M{f1(tw[0])} {f1(tw[1])}l0 -18" stroke="{P["concrete"]}" stroke-width="2.2"/>'
                   f'<path d="M{f1(tw[0] + 4)} {f1(tw[1] - 5)}l16 -5l0 -9l-16 5Z" fill="{P["solar"]}" stroke="{P["solarFrame"]}" stroke-width="0.8"/>')
        callout(doc, *tw, 'solar-powered tube well', 70, 60)
    # labels, anchored on what they name
    if spots:
        callout(doc, *at(H, *spots[0]), 'transplanting rice in flooded paddies', 60, 70)
    if offtakes:
        callout(doc, *at(H, *offtakes[len(offtakes) // 2]), 'contour canal and offtakes', -60, -70, col=P['waterLine'])
    callout(doc, *at(H, vx, vy), 'village with raised granaries and a market', 70, -100)
    ts = find(Lc, H, G, cls == LC.TERRACE, rng, n=1)
    if ts:
        callout(doc, *at(H, *ts[0]), 'terraced slopes: millet, maize, vegetables', -50, -90)
    title(doc, cfg, 2)
    open(out, 'w').write(doc.svg())
    return doc


def urban(out):
    rng = np.random.default_rng(16)
    cfg, wc, Lc, H, G, doc, hs = base_block('urban', rng)
    fr = wc['frame']
    cls, sl = Lc['cls'], Lc['slope']
    F.fields(doc, G, H, Lc, P, rng, k=1 / cfg['size'] * 0.75, v_range=(-0.3, 1.3))
    F.trees(doc, G, H, Lc, P, rng, scale=2.0, step=0.018)
    # the river through town, in the clip's own coordinates
    riv = F.densify(world_to_local(T.MAIN_RIVER, fr), 0.003)
    riv = riv[(riv[:, 0] > 0.0) & (riv[:, 0] < 1.0) & (riv[:, 1] > 0.0) & (riv[:, 1] < 1.0)]
    mid = riv[len(riv) // 2]
    lay = doc.layer('Infrastructure')
    sl_ = doc.layer('Settlements')

    # (no roads drawn in the clips: the linework read as scratches at this scale)
    # the bridge: a deck on piers across the river
    a, b = mid + np.array([0, -0.035]), mid + np.array([0, 0.035])
    za = max(V.sample(H, *a), V.sample(H, *b)) + 12
    pa, pb = np.array(V.project(*a, za)), np.array(V.project(*b, za))
    for t in (0.33, 0.66):
        q = a + (b - a) * t
        top_ = np.array(V.project(*q, za)); bot = np.array(V.project(*q, V.sample(H, *q)))
        lay.append(f'<path d="M{f1(top_[0])} {f1(top_[1])}L{f1(bot[0])} {f1(bot[1])}" stroke="{P["concrete"]}" stroke-width="3"/>')
    lay.append(f'<path d="M{f1(pa[0])} {f1(pa[1])}L{f1(pb[0])} {f1(pb[1])}" stroke="{P["shade"]}" stroke-width="9" stroke-linecap="round"/>'
               f'<path d="M{f1(pa[0])} {f1(pa[1])}L{f1(pb[0])} {f1(pb[1])}" stroke="{P["concrete"]}" stroke-width="6" stroke-linecap="round"/>')
    # (no flood embankment line either)
    # the old town: dense, low, mixed roofs, between the embankment and the road
    js, is_ = np.nonzero(cls == LC.TOWN)
    N = cls.shape[0] - 1
    tx, ty = is_ / N, js / N
    oc = np.array([np.percentile(tx, 35), ty.mean()])                 # the old core, west part of the town ground
    F.settlement(doc, G, H, Lc, P, rng, oc[0], oc[1], 0.17, 360, 'town', k=1.7, gap=(11, 7))
    # the new quarter across the river: mid-rise blocks and a crane
    nq = np.array([np.percentile(tx, 88), np.percentile(ty, 55)])     # the new quarter, east end of town
    blocks = []
    for i in range(4):
        for j in range(3):
            x, y = nq[0] + i * 0.045 - 0.06, nq[1] + j * 0.04 - 0.03
            if not (0.02 < x < 0.98 and 0.02 < y < 0.98) or sl[int(y * 519), int(x * 519)] > 14:
                continue
            p_ = at(H, x, y)
            tint = dict(P, wallLit=['#B9B4A8', '#A9AEB2', '#C2B59C'][int(rng.integers(3))], wallShade='#77797A')
            blocks.append((p_[1], tower_p(p_[0], p_[1], 18, 14, 26 + rng.random() * 28, tint)))
    for _, b_ in sorted(blocks):
        sl_.append(b_)
    cp = at(H, min(nq[0] + 0.02, 0.95), nq[1] - 0.09)
    sl_.append(crane(cp[0], cp[1], 1.1))
    # self-built houses climbing the steep slope above the new quarter
    placed = []
    for _ in range(400):
        x, y = rng.uniform(0.15, 0.70), mid[1] + rng.uniform(0.06, 0.24)
        if sl[int(y * 519), int(x * 519)] < 10 or cls[int(y * 519), int(x * 519)] in (LC.FOREST, LC.WATER):
            continue
        z = V.sample(H, x, y)
        if not G.visible(x, y, z + 1):
            continue
        p_ = V.project(x, y, z)
        if any(abs(p_[0] - u) < 11 and abs(p_[1] - v) < 8 for u, v in placed):
            continue
        placed.append(p_)
        if len(placed) > 70:
            break
    for p_ in sorted(placed, key=lambda q: q[1]):
        sl_.append(shack(p_[0], p_[1], 1.6, [P['wallLit'], P['shackB'], P['shackC']][int(rng.integers(3))]))
    # water treatment and the bus station
    wt = at(H, *(mid + np.array([0.26, -0.05])))
    for dx in (0, 22, 44):
        lay.append(f'<ellipse cx="{f1(wt[0] + dx)}" cy="{f1(wt[1])}" rx="9" ry="4.5" fill="{P["water"]}" stroke="{P["concrete"]}" stroke-width="2"/>')
    bs = at(H, *(mid + np.array([-0.20, -0.16])))
    lay.append(F.box(bs[0], bs[1], 40, 16, 7, 'flat', P))
    for i in range(3):
        lay.append(f'<rect x="{f1(bs[0] - 30 + i * 16)}" y="{f1(bs[1] + 14)}" width="13" height="5" rx="1.5" fill="{P["bus"]}"/>')
    # labels
    callout(doc, *at(H, *oc), 'old town on the river terrace', -90, 160)
    callout(doc, *at(H, *nq), 'new quarter: mid-rise blocks', 90, -130)
    callout(doc, *cp, 'construction', 60, -30)
    if placed:
        u, v = placed[len(placed) // 3]
        callout(doc, u, v, 'self-built houses on the steep slope', -40, -90)
    callout(doc, *((pa + pb) / 2), 'bridge', 50, 40)
    callout(doc, *wt, 'water treatment', 40, -50)
    callout(doc, *bs, 'bus station', -40, 60)
    title(doc, cfg, 1)
    open(out, 'w').write(doc.svg())
    return doc


def tower_p(x, y, w, d, h, Pt):
    s_ = F.box(x, y, w, d, h, 'flat', Pt)
    ux, vy = F.axes()
    a = np.array([x, y]) - ux * w / 2 - vy * d / 2
    dd = vy * d
    out = [s_]
    for fl in np.arange(4, h - 2, 4.2):
        p0 = a + np.array([0, -fl]); p1 = p0 + dd
        out.append(f'<path d="M{f1(p0[0])} {f1(p0[1])}L{f1(p1[0])} {f1(p1[1])}" stroke="{P["window"]}" stroke-width="1.1" stroke-opacity="0.5"/>')
    return ''.join(out)


# ---------------------------------------------------------------------------
# a clip for every story: the window sits on that story's station, and a few
# motifs are placed on ground that suits them — adjust a story's motifs here
# ---------------------------------------------------------------------------
MOTIFS = {                      # story number -> the things drawn on its clip
    1:  ('roped-party', 'stakes'),          # Glaciers
    2:  ('mast', 'hut'),                    # Mountain observation systems
    3:  ('mast', 'stakes'),                 # Elevation-dependent warming
    4:  ('village', 'people'),              # Social dimensions of glacier loss
    5:  ('canal', 'people'),                # Water towers & downstream dependencies
    6:  ('saplings', 'checkdams'),          # Ecosystems & nature-based solutions
    7:  ('saplings', 'people'),             # Forests, soils & carbon dynamics
    8:  ('terrace-farmers', 'village'),     # Adaptation & resilience
    9:  ('village', 'people'),              # Cascading hazards & risks
    11: ('stupa', 'village'),               # Cultural landscapes & heritage
    12: ('village', 'market', 'people'),    # Gender & social equity
    13: ('lodge', 'trekkers'),              # Tourism
    14: ('village-emptying',),              # Demographic change & migration
    15: ('border', 'camp'),                 # Peacebuilding & transboundary cooperation
    17: ('herd', 'camp'),                   # Indigenous & local knowledge
    18: ('corral', 'herd'),                 # Land tenure & mountain governance
    19: ('pylons', 'powerhouse'),           # Hydropower & energy transitions
    20: ('pillar',),                        # Mountains in global frameworks
    21: ('mine', 'village'),                # Legal action & mountain justice
    22: ('painter',),                       # Mountains & the arts
    23: ('camp', 'mast'),                   # Future scenarios for mountain regions
    24: ('stakes', 'people'),               # Snow dynamics
    25: ('boulders', 'mast'),               # Permafrost
}
BESPOKE = {10: 'agriculture', 16: 'urban'}      # the two clips drawn by hand
CLIP_SIZE = {1: 0.17, 3: 0.17, 20: 0.15, 24: 0.18, 25: 0.17}   # tighter windows


def story_cfg(num):
    """The window for one story: centred on its station, inside the block."""
    st = [s for s in ST.STATIONS if s[0] == num][0]
    size = CLIP_SIZE.get(num, 0.21)
    x0 = float(np.clip(st[1] - size / 2, 0.0, 1.0 - size))
    y0 = float(np.clip(st[2] - size / 2, 0.0, 1.0 - size))
    return dict(x0=x0, y0=y0, size=size, title=ST.TOPICS[num])


def _sites(Lc, H, G, rng, kinds, n=1, spacing=0.09, lo=None, hi=None, smax=None):
    cls, sl = Lc['cls'], Lc['slope']
    cond = np.isin(cls, kinds)
    if lo is not None:
        cond &= H > lo
    if hi is not None:
        cond &= H < hi
    if smax is not None:
        cond &= sl < smax
    N = H.shape[0] - 1
    edge = np.zeros_like(cond)
    edge[int(0.14 * N):int(0.86 * N), int(0.14 * N):int(0.86 * N)] = True
    return find(Lc, H, G, cond & edge, rng, n=n, spacing=spacing)


def stupa(x, y, k=1.0):
    """A whitewashed dome on a plinth with a spire — a shrine, not a church."""
    return (f'<path d="M{f1(x - 9 * k)} {f1(y)}l{f1(18 * k)} 0l0 {f1(-3 * k)}l{f1(-18 * k)} 0Z" fill="{P["whitewash"]}" '
            f'stroke="{P["shade"]}" stroke-width="0.6"/>'
            f'<path d="M{f1(x - 7 * k)} {f1(y - 3 * k)}a{f1(7 * k)} {f1(7 * k)} 0 0 1 {f1(14 * k)} 0Z" fill="{P["whitewash"]}" '
            f'stroke="{P["shade"]}" stroke-width="0.6"/>'
            f'<path d="M{f1(x)} {f1(y - 10 * k)}l0 {f1(-7 * k)}" stroke="{P["whitewash"]}" stroke-width="{f1(1.6 * k)}"/>'
            f'<circle cx="{f1(x)}" cy="{f1(y - 18 * k)}" r="{f1(1.8 * k)}" fill="{P["dome"]}"/>')


def mast(x, y, k=1.0):
    """An automatic weather station: mast, cross-arms, cups and a vane."""
    m = (f'M{f1(x)} {f1(y)}l0 {f1(-30 * k)}M{f1(x - 7 * k)} {f1(y - 22 * k)}l{f1(14 * k)} 0'
         f'M{f1(x - 6 * k)} {f1(y - 15 * k)}l{f1(12 * k)} 0')
    return (f'<path d="{m}" stroke="{P["shade"]}" stroke-width="{f1(3.4 * k)}" stroke-opacity="0.6" fill="none"/>'
            f'<path d="{m}" stroke="{P["light"]}" stroke-width="{f1(1.7 * k)}" fill="none"/>'
            f'<circle cx="{f1(x - 6 * k)}" cy="{f1(y - 32 * k)}" r="{f1(2.2 * k)}" fill="none" stroke="{P["light"]}" stroke-width="{f1(1.2 * k)}"/>'
            f'<circle cx="{f1(x + 6 * k)}" cy="{f1(y - 32 * k)}" r="{f1(2.2 * k)}" fill="none" stroke="{P["light"]}" stroke-width="{f1(1.2 * k)}"/>'
            f'<path d="M{f1(x)} {f1(y - 30 * k)}l0 {f1(-5 * k)}l{f1(8 * k)} {f1(2.5 * k)}Z" fill="{P["light"]}"/>')


def pillar(x, y, k=1.0):
    """A survey pillar: a tapered column on a plinth."""
    return (f'<path d="M{f1(x - 5 * k)} {f1(y)}l{f1(10 * k)} 0l{f1(-2 * k)} {f1(-16 * k)}l{f1(-6 * k)} 0Z" '
            f'fill="{P["light"]}" stroke="{P["shade"]}" stroke-width="0.7"/>'
            f'<rect x="{f1(x - 7 * k)}" y="{f1(y)}" width="{f1(14 * k)}" height="{f1(3.5 * k)}" fill="{P["concrete"]}" '
            f'stroke="{P["shade"]}" stroke-width="0.6"/>')


def stake(x, y, k=1.0):
    """A snow stake: a graduated pole in the snow."""
    return (f'<path d="M{f1(x)} {f1(y)}l0 {f1(-22 * k)}" stroke="{P["shade"]}" stroke-width="{f1(2.6 * k)}"/>'
            f'<path d="M{f1(x)} {f1(y - 4 * k)}l0 {f1(-18 * k)}" stroke="{P["red"]}" stroke-width="{f1(1.4 * k)}" '
            f'stroke-dasharray="{f1(3 * k)} {f1(3 * k)}"/>')


def post(x, y, k=1.0):
    """A boundary post with a small plate."""
    return (f'<path d="M{f1(x)} {f1(y)}l0 {f1(-13 * k)}" stroke="{P["ink"]}" stroke-width="{f1(2 * k)}"/>'
            f'<rect x="{f1(x)}" y="{f1(y - 13 * k)}" width="{f1(9 * k)}" height="{f1(6 * k)}" fill="{P["red"]}"/>')


def checkdam(x, y, k=1.0):
    return f'<path d="M{f1(x - 6 * k)} {f1(y)}l{f1(12 * k)} {f1(-2 * k)}" stroke="{P["wallLit"]}" stroke-width="{f1(2.6 * k)}" stroke-linecap="round"/>'


def sapling(x, y, k=1.0):
    return (f'<path d="M{f1(x)} {f1(y)}l0 {f1(-7 * k)}" stroke="{P["sapling"]}" stroke-width="{f1(1.3 * k)}"/>'
            f'<circle cx="{f1(x)}" cy="{f1(y - 9 * k)}" r="{f1(3.2 * k)}" fill="{P["sapling"]}" stroke="{P["shade"]}" stroke-width="0.5"/>')


def motif(doc, kind, Lc, H, G, rng, P_):
    """Draw one story motif somewhere it belongs on this clip."""
    cls, sl = Lc['cls'], Lc['slope']
    sl_ = doc.layer('Settlements'); pl = doc.layer('People-animals'); inf = doc.layer('Infrastructure')
    farm = [LC.FIELD, LC.TERRACE, LC.PADDY, LC.ALPINE, LC.DRY, LC.GROUND]
    if kind == 'village':
        for (x, y) in _sites(Lc, H, G, rng, farm, 1, smax=14):
            F.settlement(doc, G, H, Lc, P_, rng, x, y, 0.055, 16, 'village', k=2.2, gap=(20, 13))
            for dx, dy in ((-0.02, 0.012), (0.022, -0.008)):
                q = at(H, np.clip(x + dx, 0.02, 0.98), np.clip(y + dy, 0.02, 0.98))
                sl_.append(granary(q[0], q[1], 1.3))
    elif kind == 'village-emptying':
        for (x, y) in _sites(Lc, H, G, rng, farm, 1, smax=14):
            F.settlement(doc, G, H, Lc, P_, rng, x, y, 0.05, 9, 'village', k=2.2, gap=(26, 17))
            for dx, dy in ((-0.03, 0.02), (0.03, 0.015), (0.01, -0.03)):   # roofless, abandoned
                q = at(H, np.clip(x + dx, 0.02, 0.98), np.clip(y + dy, 0.02, 0.98))
                sl_.append(f'<rect x="{f1(q[0] - 7)}" y="{f1(q[1] - 7)}" width="14" height="7" fill="none" '
                           f'stroke="{P_["wallShade"]}" stroke-width="1.3"/>')
    elif kind == 'market':
        for (x, y) in _sites(Lc, H, G, rng, farm, 1, smax=12):
            q = at(H, x, y)
            sl_.append(market(q[0], q[1], 1.4))
    elif kind == 'people':
        for (x, y) in _sites(Lc, H, G, rng, farm + [LC.FOREST], 3, spacing=0.05, smax=22):
            q = at(H, x, y)
            pl.append(ST.person(q[0], q[1], P_, staff=rng.random() < 0.5, k=1.3))
    elif kind == 'herd':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.DRY], 1, smax=18):
            ST.herd(doc, G, H, Lc, P_, rng, x, y, 8, 'yak' if rng.random() < 0.5 else 'llama')
    elif kind == 'corral':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.DRY, LC.GROUND], 1, smax=16):
            c = at(H, x, y)
            ux, vy = F.axes()
            ring = np.array([c + ux * 22 * np.cos(t) + vy * 14 * np.sin(t) for t in np.linspace(0, 2 * np.pi, 26)])
            sl_.append(f'<path d="{K.d_poly(ring, True, 0.6)}" fill="{P_["alpine"]}" fill-opacity="0.35" '
                       f'stroke="{P_["wallLit"]}" stroke-width="1.6"/>')
            sl_.append(F.box(c[0] - 34, c[1] - 4, 18, 11, 8, 'flat', dict(P_, roofFlat=P_['thatch'])))
            for k_, (dx_, dy_) in enumerate(((-8, 3), (4, -2), (10, 5))):
                pl.append(ST.animal(c[0] + dx_, c[1] + dy_, 'yak' if k_ else 'llama', 1 if k_ % 2 else -1, P_, 0.75))
    elif kind == 'camp':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.DRY, LC.SCREE, LC.GROUND], 1, smax=16):
            q = at(H, x, y)
            pl.append(f'<path d="M{f1(q[0] - 9)} {f1(q[1])}L{f1(q[0])} {f1(q[1] - 12)}L{f1(q[0] + 9)} {f1(q[1])}Z" '
                      f'fill="{P_["tentWhite"]}" stroke="{P_["shade"]}" stroke-width="0.6"/>')
            pl.append(f'<path d="M{f1(q[0] - 2)} {f1(q[1])}L{f1(q[0])} {f1(q[1] - 5)}L{f1(q[0] + 2)} {f1(q[1])}Z" fill="{P_["tent"]}"/>')
            pl.append(ST.person(q[0] + 15, q[1], P_, staff=True, k=1.3))
    elif kind == 'trekkers':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.FOREST, LC.DRY], 1, smax=22):
            for i in range(3):
                q = at(H, np.clip(x + i * 0.012, 0.02, 0.98), np.clip(y + i * 0.01, 0.02, 0.98))
                pl.append(ST.person(q[0], q[1], P_, staff=True, load=True, k=1.35))
    elif kind == 'lodge':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.FOREST, LC.DRY], 1, smax=14):
            q = at(H, x, y)
            sl_.append(F.box(q[0], q[1], 30, 17, 12, 'gable', dict(P_, roof=P_['metalRoof'])))
    elif kind == 'stupa':
        for (x, y) in _sites(Lc, H, G, rng, farm + [LC.FOREST], 1, smax=16):
            q = at(H, x, y)
            sl_.append(stupa(q[0], q[1], 1.2))
    elif kind == 'mast':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ROCK, LC.SCREE, LC.ALPINE, LC.DRYROCK, LC.SNOW], 1, smax=26):
            q = at(H, x, y)
            inf.append(mast(q[0], q[1], 1.15))
    elif kind == 'hut':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ROCK, LC.SCREE, LC.ALPINE, LC.DRYROCK], 1, smax=20):
            q = at(H, x, y)
            sl_.append(F.box(q[0], q[1], 20, 12, 9, 'flat', dict(P_, roofFlat=P_['metalRoof'])))
    elif kind == 'pillar':
        j, i = np.unravel_index(H.argmax(), H.shape)
        q = at(H, i / (H.shape[0] - 1), j / (H.shape[0] - 1))
        sl_.append(pillar(q[0], q[1], 1.2))
    elif kind == 'stakes':
        for (x, y) in _sites(Lc, H, G, rng, [LC.SNOW, LC.GLACIER, LC.SCREE], 4, spacing=0.035, smax=26):
            q = at(H, x, y)
            inf.append(stake(q[0], q[1], 1.1))
    elif kind == 'roped-party':
        for (x, y) in _sites(Lc, H, G, rng, [LC.GLACIER, LC.SNOW], 1, smax=24):
            pts = [at(H, np.clip(x + i * 0.01, 0.02, 0.98), np.clip(y + i * 0.008, 0.02, 0.98)) for i in range(3)]
            for a_, b_ in zip(pts[:-1], pts[1:]):
                pl.append(f'<path d="M{f1(a_[0])} {f1(a_[1] - 6)}L{f1(b_[0])} {f1(b_[1] - 6)}" stroke="{P_["red"]}" stroke-width="1.1"/>')
            for q in pts:
                pl.append(ST.person(q[0], q[1], P_, staff=True, k=1.3))
    elif kind == 'boulders':
        for (x, y) in _sites(Lc, H, G, rng, [LC.SCREE, LC.ROCK, LC.DRYROCK], 1, smax=30):
            c = at(H, x, y)
            for i in range(26):
                a_ = c + np.array([rng.normal(0, 26), rng.normal(0, 11)])
                r_ = 1.6 + rng.random() * 2.4
                inf.append(f'<ellipse cx="{f1(a_[0])}" cy="{f1(a_[1])}" rx="{f1(r_ * 1.5)}" ry="{f1(r_)}" '
                           f'fill="{P_["rockGlacier"]}" fill-opacity="0.8" stroke="{P_["shade"]}" stroke-width="0.4"/>')
    elif kind == 'saplings':
        for (x, y) in _sites(Lc, H, G, rng, [LC.FOREST, LC.ALPINE, LC.GROUND, LC.DRY], 1, smax=26):
            for r_ in range(3):
                for c_ in range(5):
                    q = at(H, np.clip(x + c_ * 0.009 - 0.018, 0.02, 0.98), np.clip(y + r_ * 0.009 - 0.009, 0.02, 0.98))
                    pl.append(sapling(q[0], q[1], 1.1))
    elif kind == 'checkdams':
        for (x, y) in _sites(Lc, H, G, rng, [LC.GROUND, LC.ALPINE, LC.DRY, LC.SCREE], 3, spacing=0.03, smax=30):
            q = at(H, x, y)
            inf.append(checkdam(q[0], q[1], 1.2))
    elif kind == 'border':
        n_ = H.shape[0] - 1
        col = int(np.clip(np.argmax(H.max(0)), 0.15 * n_, 0.85 * n_))
        pts = []
        for j in range(int(0.12 * n_), int(0.88 * n_), 6):
            x, y = col / n_, j / n_
            z = float(V.sample(H, x, y))
            if G.visible(x, y, z + 2):
                pts.append(V.project(x, y, z))
        if len(pts) > 5:
            inf.append(f'<path d="{K.d_smooth(np.array(pts), False, 1.4)}" fill="none" stroke="{P_["ink"]}" '
                       f'stroke-width="1.6" stroke-dasharray="10 4 2 4" stroke-opacity="0.85"/>')
            for q in (pts[2], pts[-3]):
                inf.append(post(q[0], q[1], 1.1))
    elif kind == 'mine':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ROCK, LC.SCREE, LC.DRY, LC.DRYROCK, LC.ALPINE], 1, smax=24):
            ST.mine(doc, G, H, Lc, P_, x, y)
    elif kind == 'pylons':
        for (x, y) in _sites(Lc, H, G, rng, farm + [LC.FOREST], 1, smax=20):
            tops = []
            for i in range(4):
                q = at(H, np.clip(x + i * 0.035 - 0.05, 0.03, 0.97), np.clip(y + i * 0.02 - 0.03, 0.03, 0.97))
                hh = 26
                inf.append(f'<path d="M{f1(q[0] - 5)} {f1(q[1])}L{f1(q[0])} {f1(q[1] - hh)}L{f1(q[0] + 5)} {f1(q[1])}'
                           f'M{f1(q[0] - 7)} {f1(q[1] - hh + 5)}L{f1(q[0] + 7)} {f1(q[1] - hh + 5)}" fill="none" '
                           f'stroke="{P_["pylon"]}" stroke-width="1" stroke-opacity="0.85"/>')
                tops.append((q[0], q[1] - hh + 4))
            for a_, b_ in zip(tops[:-1], tops[1:]):
                inf.append(f'<path d="M{f1(a_[0])} {f1(a_[1])}Q{f1((a_[0] + b_[0]) / 2)} {f1((a_[1] + b_[1]) / 2 + 5)} '
                           f'{f1(b_[0])} {f1(b_[1])}" fill="none" stroke="{P_["pylon"]}" stroke-width="1"/>')
    elif kind == 'powerhouse':
        for (x, y) in _sites(Lc, H, G, rng, farm + [LC.FOREST], 1, smax=12):
            q = at(H, x, y)
            sl_.append(F.box(q[0], q[1], 26, 15, 11, 'flat', dict(P_, roofFlat=P_['metalRoof'])))
            inf.append(f'<rect x="{f1(q[0] + 18)}" y="{f1(q[1] - 6)}" width="20" height="10" fill="{P_["shade"]}" '
                       f'fill-opacity="0.45" stroke="{P_["pylon"]}" stroke-width="0.8"/>')
    elif kind == 'canal':
        import render as _R
        for (x, y) in _sites(Lc, H, G, rng, farm, 1, smax=16):
            z0 = float(V.sample(H, x, y))
            best = None
            for lv, seg in _R.world_lines(H, [round(z0 / 20) * 20]):
                d2 = np.hypot(seg[:, 0] - x, seg[:, 1] - y)
                if best is None or d2.min() < best[0]:
                    best = (d2.min(), seg, int(np.argmin(d2)))
            if best and best[0] < 0.03:
                _, seg, k0 = best
                pth = seg[max(0, k0 - 70):k0 + 70]
                for r_ in F.draped(G, H, pth, 4):
                    inf.append(f'<path d="{K.d_smooth(r_, False, 1.4)}" fill="none" stroke="{P_["waterLine"]}" '
                               f'stroke-width="2.6" stroke-opacity="0.9"/>')
                for t_ in (0.3, 0.55, 0.8):
                    q = pth[int(t_ * (len(pth) - 1))]
                    zz = float(V.sample(H, q[0], q[1]))
                    if not G.visible(q[0], q[1], zz + 1):
                        continue
                    a_ = V.project(q[0], q[1], zz)
                    inf.append(f'<rect x="{f1(a_[0] - 4)}" y="{f1(a_[1] - 5)}" width="8" height="8" fill="{P_["concrete"]}" '
                               f'stroke="{P_["shade"]}" stroke-width="0.7"/>')
    elif kind == 'terrace-farmers':
        for (x, y) in _sites(Lc, H, G, rng, [LC.TERRACE, LC.FIELD, LC.DRY], 3, spacing=0.04, smax=26):
            q = at(H, x, y)
            pl.append(farmer_bent(q[0], q[1], 1.5, 1 if rng.random() < 0.5 else -1))
    elif kind == 'painter':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.FOREST, LC.DRY, LC.SCREE], 1, smax=22):
            q = at(H, x, y)
            pl.append(ST.person(q[0] - 8, q[1], P_, k=1.5))
            pl.append(f'<path d="M{f1(q[0] + 4)} {f1(q[1])}L{f1(q[0] + 8)} {f1(q[1] - 14)}L{f1(q[0] + 12)} {f1(q[1])}'
                      f'M{f1(q[0] + 8)} {f1(q[1] - 14)}l0 14" stroke="{P_["figure"]}" stroke-width="1" fill="none"/>')
            pl.append(f'<rect x="{f1(q[0] + 2.5)}" y="{f1(q[1] - 14)}" width="11" height="8" fill="{P_["light"]}" '
                      f'stroke="{P_["shade"]}" stroke-width="0.6"/>')


def story(order, out):
    """One clip for the story at this position in the route (1 = the first
    station). The badge carries the route number, the title its topic."""
    num = ST.STATIONS[order - 1][0]
    if num in BESPOKE:                                   # the two hand-drawn clips
        return {'agriculture': agriculture, 'urban': urban}[BESPOKE[num]](out)
    rng = np.random.default_rng(100 + num)
    cfg = story_cfg(num)
    keep = R.FACE_RECEDE
    R.FACE_RECEDE = 0.45                                 # the geology sits well back on a clip
    try:
        cfg, wc, Lc, H, G, doc, hs = base_block(cfg, rng)
        F.fields(doc, G, H, Lc, P, rng, k=1 / cfg['size'] * 0.75, v_range=(-0.3, 1.3))
        terraces_clip(doc, G, H, Lc, step=30)          # a quieter hillside at story scale
        F.trees(doc, G, H, Lc, P, rng, scale=1.2, step=0.026)
        for kind in MOTIFS.get(num, ('village',)):
            motif(doc, kind, Lc, H, G, rng, P)
        title(doc, cfg, order)
    finally:
        R.FACE_RECEDE = keep
    open(out, 'w').write(doc.svg())
    return doc


import ice as _ice
ST_CANALS = _ice.CANALS

if __name__ == '__main__':
    if '--light' in sys.argv:
        R.use_light()
    which, out = sys.argv[1], sys.argv[2]
    if which == 'all':                                   # all 25, into a folder
        import os
        os.makedirs(out, exist_ok=True)
        for r in range(1, 26):
            p = os.path.join(out, 'story-%02d-%s.svg' % (r, 'light' if '--light' in sys.argv else 'dark'))
            story(r, p)
            print('wrote', p, flush=True)
        raise SystemExit(0)
    if which.isdigit():
        story(int(which), out)
    else:
        {'agriculture': agriculture, 'urban': urban}[which](out)
    print('wrote', out)
