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


def base_block(name, rng, recover=None):
    cfg = CL.CLIPS[name]
    w = T.build()
    L = LC.classify(w)
    wc, Lc = CL.window(w, L, cfg['x0'], cfg['y0'], cfg['size'])
    H = wc['H']
    if recover:
        Lc['cls'] = recover(wc, Lc)                    # a land use designed for the story, on the clip's own ground
    V.W, V.H_PX = CANVAS
    # heights: the overview's px-per-metre ratio, scaled so the clip's true
    # vertical exaggeration is CLIP_VE (its ground span is `size` of the block)
    V.SCALE = 1330.0
    V.ZK = 0.086 / (1.8 / CLIP_VE) / cfg['size'] * (1330.0 / 1330.0)
    V.ZBASE = float(H.min()) - 320.0
    V.fit(H, margin=(90, 110, 90, 260))
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
    GEO.draw(doc, H, P, np.random.default_rng(3), R._tone, frame=(cfg['x0'], cfg['y0'], cfg['size']))
    return cfg, wc, Lc, H, G, doc, hs


def draped(G, H, pts, lift=2.0):
    return F.draped(G, H, np.asarray(pts, float), lift)


def terraces_clip(doc, G, H, Lc):
    mask = Lc['cls'] == LC.TERRACE
    grow = K.box_blur(mask.astype(float), 1) > 0.25
    d = []
    lo = float(H.min())
    for lv, seg in R.world_lines(H, np.arange(lo + 20, lo + 1300, 14), grow):
        for run in R.visible_runs(G, seg[:, 0], seg[:, 1], V.sample(H, seg[:, 0], seg[:, 1]) + 1, 3):
            d.append(K.d_smooth(run, False, 1.2))
    doc.layer('Terraces').append(f'<path d="{"".join(d)}" fill="none" stroke="{P["terraceLine"]}" '
                                 f'stroke-width="1.1" stroke-opacity="0.85" stroke-linecap="round"/>')


def title(doc, cfg, sub, num):
    lay = doc.layer('Title')
    lay.append(f'<circle cx="112" cy="84" r="24" fill="{P["paper"]}" stroke="{P["red"]}" stroke-width="3"/>')
    lay.append(f'<text x="112" y="92" text-anchor="middle" font-family="{K.SANS}" font-weight="700" font-size="22" '
               f'fill="{P["light"]}">{num:02d}</text>')
    lay.append(LB.text(152, 80, cfg['title'].replace('&', '&amp;'), P, 30, italic=False, weight=600, col=P['light']))
    lay.append(LB.text(152, 108, sub, P, 17, col=P['inkSoft']))


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
    # terraces are cut where a village can work them: a band on the foot-slope,
    # in blocks rather than over every hillside, with rough ground between
    blocks = T.fbm(X * 11, Y * 11, 4, seed=407)
    ter = ((H > lo + 110) & (H < lo + 430 + 90 * noise) & (sl > 6) & (sl < 26)
           & (blocks > 0.02))
    cls[ter] = LC.TERRACE
    cls[(H > lo + 620 + 90 * noise) | (sl > 30) | ((sl > 17) & ~ter & (H > lo + 150))] = LC.FOREST
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
        if not (0.12 < x < 0.86 and 0.10 < y < 0.88):        # keep symbols off the block's edges
            continue
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
    F.trees(doc, G, H, Lc, P, rng, scale=1.45, step=0.0215)
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
            pl.append(buffalo(sx, sy, 1.5, 1 if k % 2 else -1))
            pl.append(ST.person(sx + 26, sy, P, staff=True, k=2.4))
        else:
            pl.append(farmer_bent(sx, sy, 1.6, 1 if k % 2 else -1))
            pl.append(farmer_bent(sx + 13, sy + 4, 1.5, -1 if k % 2 else 1))
            pl.append(farmer_bent(sx - 11, sy + 2, 1.4, 1))
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
        x_, y_ = tw
        sl_.append(
            f'<path d="M{f1(x_)} {f1(y_)}l0 -30" stroke="{P["concrete"]}" stroke-width="3"/>'
            f'<path d="M{f1(x_ + 5)} {f1(y_ - 12)}l26 -8l0 -15l-26 8Z" fill="{P["solar"]}" stroke="{P["solarFrame"]}" stroke-width="1.2"/>'
            f'<rect x="{f1(x_ - 22)}" y="{f1(y_ - 20)}" width="15" height="13" rx="2" fill="{P["sheet"]}" stroke="{P["concrete"]}" stroke-width="1"/>'
            f'<path d="M{f1(x_ - 22)} {f1(y_ - 20)}l7 -5l15 0l-7 5Z" fill="{P["concrete"]}"/>'
            f'<path d="M{f1(x_ - 15)} {f1(y_ - 7)}l0 5l-16 3" stroke="{P["waterLine"]}" stroke-width="2" fill="none"/>')
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
    title(doc, cfg, 'Food from the plain below the range: rice fed by glacier and monsoon water, a contour canal, terraced foot-slopes', 2)
    scale_bar(doc, cfg)
    open(out, 'w').write(doc.svg())
    return doc


def urban(out):
    rng = np.random.default_rng(16)
    cfg, wc, Lc, H, G, doc, hs = base_block('urban', rng)
    fr = wc['frame']
    cls, sl = Lc['cls'], Lc['slope']
    F.fields(doc, G, H, Lc, P, rng, k=1 / cfg['size'] * 0.75, v_range=(-0.3, 1.3))
    F.trees(doc, G, H, Lc, P, rng, scale=1.4, step=0.0215)
    # the river through town, in the clip's own coordinates
    riv = F.densify(world_to_local(T.MAIN_RIVER, fr), 0.003)
    riv = riv[(riv[:, 0] > 0.0) & (riv[:, 0] < 1.0) & (riv[:, 1] > 0.0) & (riv[:, 1] < 1.0)]
    mid = riv[len(riv) // 2]
    lay = doc.layer('Infrastructure')
    sl_ = doc.layer('Settlements')

    def road(pts, wide=5.5):
        for r in draped(G, H, F.densify(np.asarray(pts, float), 0.003), 3):
            d = K.d_smooth(r, False, 1.5)
            lay.append(f'<path d="{d}" fill="none" stroke="{P["shade"]}" stroke-width="{wide + 3.5}" stroke-opacity="0.7" stroke-linecap="round"/>')
            lay.append(f'<path d="{d}" fill="none" stroke="{P["road"]}" stroke-width="{wide}" stroke-linecap="round"/>')
            if wide > 4:
                lay.append(f'<path d="{d}" fill="none" stroke="{P["paper"]}" stroke-width="0.8" stroke-dasharray="6 6"/>')
    # the riverside road on the town bank, and the road over the bridge to the new quarter
    bank = np.clip(riv + np.array([0.0, -0.10]), 0.01, 0.99)
    road(bank)
    road([mid + np.array([0, -0.10]), mid + np.array([0, -0.035])], 4.5)
    road([mid + np.array([0, 0.035]), mid + np.array([0.01, 0.09])], 4.0)
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
    # the flood embankment along the town bank
    emb = np.clip(riv + np.array([0.0, -0.062]), 0.01, 0.99)   # on the town's bank, between water and houses
    for r in draped(G, H, emb, 10):
        lay.append(f'<path d="{K.d_smooth(r, False, 1.5)}" fill="none" stroke="{P["shade"]}" stroke-width="6" stroke-opacity="0.6"/>'
                   f'<path d="{K.d_smooth(r, False, 1.5)}" fill="none" stroke="{P["concrete"]}" stroke-width="3.4" stroke-linecap="round"/>')
    # the old town: dense, low, mixed roofs, between the embankment and the road
    js, is_ = np.nonzero(cls == LC.TOWN)
    N = cls.shape[0] - 1
    tx, ty = is_ / N, js / N
    oc = np.array([np.percentile(tx, 35), ty.mean()])                 # the old core, west part of the town ground
    F.settlement(doc, G, H, Lc, P, rng, oc[0], oc[1], 0.17, 360, 'town', k=1.7, gap=(11, 7))
    # the new quarter across the river: mid-rise blocks and a crane
    nq = np.array([np.percentile(tx, 78), np.percentile(ty, 55)])     # the new quarter, east end of town
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
    wt = at(H, *(mid + np.array([0.20, -0.21])))              # on land, downstream of the town
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
    callout(doc, *at(H, *emb[len(emb) // 4], 10), 'flood embankment', -60, 90)
    callout(doc, *((pa + pb) / 2), 'bridge', 50, 40)
    callout(doc, *wt, 'water treatment', 40, -50)
    callout(doc, *bs, 'bus station', -40, 60)
    title(doc, cfg, 'A valley town outgrowing its terrace: new blocks, self-built houses on the slopes, roads and flood defences', 1)
    scale_bar(doc, cfg)
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


import ice as _ice
ST_CANALS = _ice.CANALS

if __name__ == '__main__':
    which, out = sys.argv[1], sys.argv[2]
    {'agriculture': agriculture, 'urban': urban}[which](out)
    print('wrote', out)
