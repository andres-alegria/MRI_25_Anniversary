"""
Zoom clips for the stories: a small block cut out of the same landscape,
drawn as its own block diagram with the detail the overview cannot hold.

    python3 zoom.py agriculture OUT.svg
    python3 zoom.py urban OUT.svg
    python3 zoom.py 17 OUT.svg [--light] [--icons]     one clip, by route station
    python3 zoom.py all OUTDIR [--light] [--icons]     all 25, named by story number

--icons draws the people and animals from the Noun Project set (marks.py)
instead of the hand-drawn marks; see marks.py for why it is not the default.
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
import marks as MK

f1 = K.f1
P = R.PAL
CANVAS = (1800, 1300)          # clip canvas, px — adjust here
CLIP_VE = 0.75                 # vertical exaggeration of the clips (1 = true scale) — adjust here
SKIRT = 44                     # depth of the cut face below the ground, px — adjust here
ICON = 6.3                     # how much larger the motifs are than on the whole plate


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
    V.ZK = 0.086 / (1.8 / cfg.get('ve', CLIP_VE)) / cfg['size'] * (1330.0 / 1330.0)
    # The band of rock below the ground used to be a fraction of the clip's
    # relief, so the steeper the station the deeper the slab — on a summit it
    # swallowed two-thirds of the picture. It is now a fixed number of screen
    # pixels. fit() sets ZK, and ZK sets how many metres a pixel is worth, so
    # the two are solved by fitting twice: a provisional floor, then the real
    # one once the scale is known.
    # The floor hangs below the lowest point on the two cut edges the reader
    # sees (south, y = 0, and west, x = 0), not below the lowest point in the
    # window: a hollow in the middle or at the back is hidden by the faces, and
    # measuring from it added its whole depth to every visible face.
    relief = float(H.max() - H.min())
    lo = float(min(H[0, :].min(), H[:, 0].min()))
    V.ZBASE = lo - 0.04 * relief
    V.fit(H, margin=(90, 215, 90, 70))     # the title sits in the top margin
    skirt = cfg.get('skirt', SKIRT)
    V.ZBASE = lo - skirt / V.ZK
    V.fit(H, margin=(90, 215, 90, 70))
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
# library marks (marks.py), with the drawn ones as the fallback. The fallback
# path draws exactly what it drew before, random numbers included, so a render
# without --icons is the same picture as before the icons existed.
# ---------------------------------------------------------------------------
FIG = 4.6 * 1.3 * ICON          # height of a standing person on a story clip, px — adjust here
AG_FIG = 22.0                   # the same on the wider agriculture clip, px — adjust here

# Which animal a story's herd is. The herds used to be yak or llama at random,
# which put llamas on Kilimanjaro and yaks in the Naga Hills.
HERD = {18: 'gaur',             # the Naga Hills: mithun, the domestic gaur
        23: 'cattle'}           # below Kilimanjaro: herders' cattle at Amboseli
COMPANIONS = {23: ('elephant', 2)}   # and the wildlife that shares the water there


def figure(role, x, y, k, P_, flip=False, pick=None, **drawn):
    """A person: the library silhouette for the role when icons are on, the
    drawn figure (story.person, sized by k) otherwise."""
    return MK.mark(role, x, y, P_, 4.6 * k, flip=flip, pick=pick) or ST.person(x, y, P_, k=k, **drawn)


# Where a library animal may stand. Herds used to land wherever the site
# finder fell back to, which on a glacier window put cattle on the ice.
WOODS = [LC.ALPINE, LC.DRY, LC.GROUND, LC.FIELD, LC.TERRACE, LC.FOREST]


def _overlaps(sx, sy, w, h, items):
    return any(abs(sx - a) < 0.5 * (w + w2) and abs(sy - b) < 0.28 * (h + h2)
               for a, b, w2, h2, _, _ in items)


def herd_icons(doc, G, H, Lc, P_, rng, x0, y0, species, n=5, companions=None, story=None):
    """A herd at clip scale: animals on ground they would use, spread so none
    hides another, a herder at the edge, painted back to front."""
    pl = doc.layer('People-animals')
    cls, sl = Lc['cls'], Lc['slope']
    N = H.shape[0] - 1
    ok = np.isin(cls, WOODS) & (sl < 24)
    j0, i0 = int(round(y0 * N)), int(round(x0 * N))
    if not ok[j0, i0]:                             # the site finder settled for less: look again
        edge = np.zeros_like(ok)
        edge[int(0.10 * N):int(0.80 * N), int(0.12 * N):int(0.88 * N)] = True
        got = find(Lc, H, G, ok & edge, rng, n=1)
        if not got:
            print('story %s: no ground for a herd in this window; left out' % story, file=sys.stderr)
            return
        x0, y0 = got[0]

    def place(kind, count, spread, items):
        w, h = MK.size(kind, FIG)
        for _ in range(400):
            if count <= 0:
                break
            x, y = x0 + rng.normal(0, spread), y0 + rng.normal(0, spread * 0.7)
            if not (0.04 < x < 0.96 and 0.04 < y < 0.96) or not ok[int(round(y * N)), int(round(x * N))]:
                continue
            z = float(V.sample(H, x, y))
            if not G.visible(x, y, z + 1):
                continue
            sx, sy = V.project(x, y, z)
            if _overlaps(sx, sy, w, h, items):
                continue
            items.append((sx, sy, w, h, rng.random() < 0.5, kind)); count -= 1

    items = []
    w, _ = MK.size(species, FIG)
    spread = 1.4 * w / V.SCALE                     # world units: a few bodies across
    place(species, n, spread, items)
    place('walker', 1, 1.6 * spread, items)        # the herder, at the edge
    if companions:
        place(companions[0], companions[1], 3.5 * spread, items)
    for sx, sy, _, _, fl, kind in sorted(items, key=lambda q: q[1]):
        pl.append(MK.mark(kind, sx, sy, P_, FIG, flip=fl) or '')


def file_of(H, G, x, y, n, role, k):
    """n people in single file, spaced by their own width on screen, walking
    right and a little up the slope — where the icons face."""
    w, _ = MK.size(role, 4.6 * k)
    step = 1.35 * w / (np.cos(V.THETA) * V.SCALE)
    return [at(H, np.clip(x + i * step, 0.02, 0.98), np.clip(y + i * step * 0.18, 0.02, 0.98))
            for i in range(n)]


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
    """A row of market stalls: posts, a canopy on the block's own axes, and a
    striped valance along the front."""
    out = []
    ux, vy = F.axes()
    cols = [P['red'], P['awning2'], P['awning3'], P['red'], P['awning2']]
    for i_ in range(5):
        c = np.array([x, y]) + ux * i_ * 12 * k
        w_, d_, h_ = 5.0 * k, 3.4 * k, 7.0 * k
        corners = [c - ux * w_ - vy * d_, c + ux * w_ - vy * d_, c + ux * w_ + vy * d_, c - ux * w_ + vy * d_]
        for p_ in corners:                                   # the four posts
            out.append(f'<path d="M{f1(p_[0])} {f1(p_[1])}l0 {f1(-h_)}" stroke="{P["inkSoft"]}" '
                       f'stroke-width="{f1(0.7 * k)}"/>')
        top = [p_ - np.array([0, h_]) for p_ in corners]
        out.append('<path d="M' + 'L'.join(f'{f1(p_[0])} {f1(p_[1])}' for p_ in top)
                   + f'Z" fill="{cols[i_]}" fill-opacity="0.92" stroke="{P["shade"]}" stroke-width="0.5"/>')
        # the valance hangs from the front edge, where a buyer stands
        a_, b_ = top[3], top[2]
        out.append(f'<path d="M{f1(a_[0])} {f1(a_[1])}L{f1(b_[0])} {f1(b_[1])}L{f1(b_[0])} {f1(b_[1] + 2.2 * k)}'
                   f'L{f1(a_[0])} {f1(a_[1] + 2.2 * k)}Z" fill="{cols[(i_ + 2) % 5]}" fill-opacity="0.85"/>')
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
            pl.append(MK.mark('buffalo', sx, sy, P, AG_FIG, flip=k % 2 == 0) or buffalo(sx, sy, 2.4, 1 if k % 2 else -1))
            pl.append(MK.mark('walker', sx + 26, sy, P, AG_FIG, flip=True) or ST.person(sx + 26, sy, P, staff=True, k=2.4))
        else:
            pl.append(MK.mark('planter', sx, sy, P, AG_FIG, flip=k % 2 == 0) or farmer_bent(sx, sy, 2.5, 1 if k % 2 else -1))
            pl.append(MK.mark('planter', sx + 18, sy + 5, P, AG_FIG, flip=k % 2 == 1) or farmer_bent(sx + 18, sy + 5, 2.3, -1 if k % 2 else 1))
            pl.append(MK.mark('planter', sx - 16, sy + 3, P, AG_FIG) or farmer_bent(sx - 16, sy + 3, 2.2, 1))
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
# Read from the drafts in Stories_2026_10_03, not from the topic titles. Five
# of these were guessed before the texts existed and drew the wrong subject
# entirely — the worst had an open-pit mine standing in for a court case about
# a glacial lake. The reasoning is in Mountain_Art_v4/ICONOGRAPHY_BRIEF.md, and
# the full motif list in tools/story-motifs.json.
#
# Three of the corrected stories — equity, global frameworks, future scenarios —
# are about something a landscape cannot show at all. What is here is the
# honest nearest thing; their real treatment belongs in the flat vignette,
# which can draw a process.
MOTIFS = {                      # story number -> the things drawn on its clip
    1:  ('roped-party', 'stakes'),          # Glaciers
    2:  ('mast', 'hut'),                    # Mountain observation systems
    3:  ('mast', 'stakes'),                 # Elevation-dependent warming
    4:  ('village', 'people'),              # Social dimensions of glacier loss
    5:  ('canal', 'people'),                # Water towers & downstream dependencies
    6:  ('ecotypes', 'saplings', 'checkdams'),   # Ecosystems & nature-based solutions
    7:  ('saplings', 'people'),             # Forests, soils & carbon dynamics
    8:  ('terrace-farmers', 'village'),     # Adaptation & resilience
    9:  ('village', 'people'),              # Cascading hazards & risks
    11: ('stupa', 'village'),               # Cultural landscapes & heritage
    12: ('village', 'people', 'trekkers'),  # Gender & social equity: who belongs here
    13: ('lodge', 'trekkers'),              # Tourism
    14: ('village-emptying',),              # Demographic change & migration
    15: ('border', 'camp'),                 # Peacebuilding & transboundary cooperation
    17: ('falcons', 'village'),             # Indigenous & local knowledge: the Amur falcons
    18: ('corral', 'herd'),                 # Land tenure & mountain governance
    19: ('pylons', 'powerhouse'),           # Hydropower & energy transitions
    20: ('mast', 'hut'),                    # Mountains in global frameworks: what gets measured
    21: ('lake-works', 'village'),          # Legal action: Palcacocha, the lake and the town
    22: ('painter',),                       # Mountains & the arts
    23: ('springs', 'herd'),                # Future scenarios: Kilimanjaro's underground water
    24: ('stakes', 'people'),               # Snow dynamics
    25: ('boulders', 'mast'),               # Permafrost
}
BESPOKE = {10: 'agriculture', 16: 'urban'}      # the two clips drawn by hand
# How much of the world each window covers (default 0.065) — adjust framing here.
# A wider window is used where the station sits on a valley wall: it takes in
# the slope above as well as the drop below, so the ground can climb away.
CLIP_SIZE = {20: 0.042, 24: 0.040, 25: 0.06,
             1: 0.085, 2: 0.075, 4: 0.08, 8: 0.08, 9: 0.055, 15: 0.085, 18: 0.08}

# Where the station sits inside its own window, as a fraction from the near
# corner — one value for both axes, or (x, y). The default centres it, which
# puts high ground at the front and leaves the reader looking at a wall with a
# slab under it. Pushing a station back makes the ground climb away from the
# viewer instead. Values were chosen by measuring, for every framing, how much
# of the picture is cut face rather than ground, then checked by eye.
ANCHOR = {20: 0.74,
          1: (0.45, 0.75), 2: (0.15, 0.30), 3: (0.70, 0.55), 4: (0.50, 0.90), 5: (0.25, 0.55),
          7: (0.40, 0.85), 8: (0.85, 0.85), 9: (0.70, 0.85), 11: (0.85, 0.85), 12: (0.40, 0.85),
          13: (0.60, 0.15), 14: (0.70, 0.40), 15: (0.90, 0.60), 17: (0.60, 0.30), 18: (0.40, 0.25),
          19: (0.30, 0.30), 23: (0.85, 0.40)}
# And a deeper or shallower cut face where one clip needs it.
SKIRT_BY = {}
# Vertical exaggeration, per clip. A station on a summit or a headwall drops
# more than a kilometre inside its own window, and at the set's usual 0.75 the
# block comes out as a tower whose sides are most of the picture. Flattening
# the vertical is what trades cut face for ground — the last resort, after
# reframing, because it also flattens the mountains.
VE_BY = {20: 0.42, 24: 0.44, 4: 0.6, 13: 0.6, 15: 0.6, 17: 0.6, 19: 0.6}


def story_cfg(num):
    """The window for one story, placed so the ground rises away from the eye."""
    st = [s for s in ST.STATIONS if s[0] == num][0]
    size = CLIP_SIZE.get(num, 0.065)  # a close window: the motifs carry the clip
    a = ANCHOR.get(num, 0.5)
    ax, ay = a if isinstance(a, tuple) else (a, a)
    x0 = float(np.clip(st[1] - ax * size, 0.0, 1.0 - size))
    y0 = float(np.clip(st[2] - ay * size, 0.0, 1.0 - size))
    return dict(x0=x0, y0=y0, size=size, title=ST.TOPICS[num],
                skirt=SKIRT_BY.get(num, SKIRT), ve=VE_BY.get(num, CLIP_VE))


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
    # motifs sit in the front half of the window, clear of the block's edges,
    # so nothing is cut off or lost against the skyline
    edge = np.zeros_like(cond)
    edge[int(0.10 * N):int(0.66 * N), int(0.18 * N):int(0.82 * N)] = True
    got = find(Lc, H, G, cond & edge, rng, n=n, spacing=spacing)
    if got:
        return got
    # Nothing of that kind here. Fall back by degrees rather than once: a
    # station on a summit has no ground under twenty-six degrees anywhere in
    # its window, and a single lenient pass still found nothing, so the clip
    # came out with no motif at all and no complaint.
    for lim in (26, 34, 44, 90):
        loose = ~np.isin(cls, [LC.WATER]) & (sl < lim) & edge
        got = find(Lc, H, G, loose, rng, n=n, spacing=spacing)
        if got:
            return got
    return find(Lc, H, G, edge, rng, n=n, spacing=spacing)


def stupa(x, y, k=1.0):
    """A whitewashed dome on a plinth with a spire — a shrine, not a church."""
    return (f'<path d="M{f1(x - 9 * k)} {f1(y)}l{f1(18 * k)} 0l0 {f1(-3 * k)}l{f1(-18 * k)} 0Z" fill="{P["whitewash"]}" '
            f'stroke="{P["shade"]}" stroke-width="0.6"/>'
            f'<path d="M{f1(x - 7 * k)} {f1(y - 3 * k)}a{f1(7 * k)} {f1(7 * k)} 0 0 1 {f1(14 * k)} 0Z" fill="{P["whitewash"]}" '
            f'stroke="{P["shade"]}" stroke-width="0.6"/>'
            f'<path d="M{f1(x)} {f1(y - 10 * k)}l0 {f1(-7 * k)}" stroke="{P["whitewash"]}" stroke-width="{f1(1.6 * k)}"/>'
            f'<circle cx="{f1(x)}" cy="{f1(y - 18 * k)}" r="{f1(1.8 * k)}" fill="{P["dome"]}"/>')


def mast(x, y, k=1.0):
    """An automatic weather station, as a billboard standing on the ground.

    Slender: the instrument is a pole with a cross-arm, and what makes it read
    at this size is the silhouette of the cups against the slope, not the
    weight of the pole. It gets guys and a contact shadow so it stands on the
    ground rather than over it."""
    h = 54 * k
    pole = f'M{f1(x)} {f1(y)}l0 {f1(-h)}'
    guys = (f'M{f1(x - 15 * k)} {f1(y)}L{f1(x)} {f1(y - h * 0.74)}'
            f'M{f1(x + 15 * k)} {f1(y)}L{f1(x)} {f1(y - h * 0.74)}')
    arm = f'M{f1(x - 11 * k)} {f1(y - h + 4 * k)}l{f1(22 * k)} 0'
    g = [f'<ellipse cx="{f1(x)}" cy="{f1(y)}" rx="{f1(7 * k)}" ry="{f1(2.4 * k)}" '
         f'fill="{P["shade"]}" fill-opacity="0.45"/>',
         f'<path d="{guys}" stroke="{P["light"]}" stroke-width="{f1(0.8 * k)}" '
         f'stroke-opacity="0.55" fill="none"/>',
         f'<path d="{pole}" stroke="{P["shade"]}" stroke-width="{f1(3.0 * k)}" '
         f'stroke-opacity="0.5" fill="none"/>',
         f'<path d="{pole}{arm}" stroke="{P["light"]}" stroke-width="{f1(1.6 * k)}" '
         f'fill="none" stroke-linecap="round"/>']
    for sgn in (-1, 1):                                   # the cups
        g.append(f'<circle cx="{f1(x + sgn * 11 * k)}" cy="{f1(y - h + 4 * k)}" r="{f1(2.4 * k)}" '
                 f'fill="{P["light"]}"/>')
    g.append(f'<path d="M{f1(x)} {f1(y - h)}l0 {f1(-5 * k)}l{f1(9 * k)} {f1(2.6 * k)}Z" fill="{P["light"]}"/>')
    # the radiation shield, halfway down, which is what says weather station
    g.append(f'<path d="M{f1(x - 3.4 * k)} {f1(y - h * 0.52)}l{f1(6.8 * k)} 0'
             f'l{f1(-1.4 * k)} {f1(4.2 * k)}l{f1(-4 * k)} 0Z" fill="{P["light"]}"/>')
    return ''.join(g)



def pillar(x, y, k=1.0):
    """A survey pillar: a tapered column on a plinth."""
    return (f'<path d="M{f1(x - 5 * k)} {f1(y)}l{f1(10 * k)} 0l{f1(-2 * k)} {f1(-16 * k)}l{f1(-6 * k)} 0Z" '
            f'fill="{P["light"]}" stroke="{P["shade"]}" stroke-width="0.7"/>'
            f'<rect x="{f1(x - 7 * k)}" y="{f1(y)}" width="{f1(14 * k)}" height="{f1(3.5 * k)}" fill="{P["concrete"]}" '
            f'stroke="{P["shade"]}" stroke-width="0.6"/>')


def stake(x, y, k=1.0):
    """A snow stake: a graduated pole read off against the surface.

    Banded rather than dashed — alternating marks are what a reader
    recognises, and a dashed line at this size just looks like a broken pole.
    """
    h = 26 * k
    g = [f'<ellipse cx="{f1(x)}" cy="{f1(y)}" rx="{f1(3.4 * k)}" ry="{f1(1.2 * k)}" '
         f'fill="{P["shade"]}" fill-opacity="0.45"/>',
         f'<path d="M{f1(x)} {f1(y)}l0 {f1(-h)}" stroke="{P["shade"]}" '
         f'stroke-width="{f1(2.6 * k)}" stroke-opacity="0.5"/>',
         f'<path d="M{f1(x)} {f1(y)}l0 {f1(-h)}" stroke="{P["light"]}" stroke-width="{f1(1.5 * k)}"/>']
    n = 4
    for i in range(n):                                    # the graduations
        y0 = y - h * (i + 0.5) / n
        g.append(f'<path d="M{f1(x - 1.3 * k)} {f1(y0)}l{f1(2.6 * k)} 0" stroke="{P["red"]}" '
                 f'stroke-width="{f1(h / n * 0.46)}"/>')
    return ''.join(g)



def post(x, y, k=1.0):
    """A boundary post with a small plate."""
    return (f'<path d="M{f1(x)} {f1(y)}l0 {f1(-13 * k)}" stroke="{P["ink"]}" stroke-width="{f1(2 * k)}"/>'
            f'<rect x="{f1(x)}" y="{f1(y - 13 * k)}" width="{f1(9 * k)}" height="{f1(6 * k)}" fill="{P["red"]}"/>')


def checkdam(x, y, k=1.0):
    """A low stone bund across a gully, with a notch where the water crosses."""
    w_, h_ = 9 * k, 2.4 * k
    return (f'<path d="M{f1(x - w_)} {f1(y)}q{f1(w_)} {f1(-h_ * 2.2)} {f1(2 * w_)} 0'
            f'l0 {f1(h_)}q{f1(-w_)} {f1(-h_ * 1.4)} {f1(-2 * w_)} 0Z" fill="{P["wallLit"]}" '
            f'stroke="{P["shade"]}" stroke-width="0.6"/>'
            f'<path d="M{f1(x)} {f1(y - h_ * 1.1)}l0 {f1(h_ * 1.5)}" stroke="{P["waterLine"]}" '
            f'stroke-width="{f1(1.2 * k)}" stroke-opacity="0.8"/>')


def sapling(x, y, k=1.0):
    return (f'<path d="M{f1(x)} {f1(y)}l0 {f1(-7 * k)}" stroke="{P["sapling"]}" stroke-width="{f1(1.3 * k)}"/>'
            f'<circle cx="{f1(x)}" cy="{f1(y - 9 * k)}" r="{f1(3.2 * k)}" fill="{P["sapling"]}" stroke="{P["shade"]}" stroke-width="0.5"/>')


def motif(doc, kind, Lc, H, G, rng, P_, num=None):
    """Draw one story motif somewhere it belongs on this clip."""
    cls, sl = Lc['cls'], Lc['slope']
    sl_ = doc.layer('Settlements'); pl = doc.layer('People-animals'); inf = doc.layer('Infrastructure')
    farm = [LC.FIELD, LC.TERRACE, LC.PADDY, LC.ALPINE, LC.DRY, LC.GROUND]
    if kind == 'village':
        for (x, y) in _sites(Lc, H, G, rng, farm, 1, smax=14):
            F.settlement(doc, G, H, Lc, P_, rng, x, y, 0.20, 13, 'village', k=1.5 * ICON, gap=(9.5, 6.2))
            for dx, dy in ((-0.02, 0.012), (0.022, -0.008)):
                q = at(H, np.clip(x + dx, 0.02, 0.98), np.clip(y + dy, 0.02, 0.98))
                sl_.append(granary(q[0], q[1], 0.6 * ICON))
    elif kind == 'village-emptying':
        for (x, y) in _sites(Lc, H, G, rng, farm, 1, smax=14):
            F.settlement(doc, G, H, Lc, P_, rng, x, y, 0.20, 9, 'village', k=1.5 * ICON, gap=(10.5, 6.8))
            for dx, dy in ((-0.03, 0.02), (0.03, 0.015), (0.01, -0.03)):   # roofless, abandoned
                q = at(H, np.clip(x + dx, 0.02, 0.98), np.clip(y + dy, 0.02, 0.98))
                sl_.append(F.box(q[0], q[1], 7 * ICON, 5 * ICON, 2.4 * ICON, 'flat',
                                 dict(P_, wallLit=P_['wallShade'], wallShade=P_['shade'],
                                      roofFlat=P_['ground'])))
    elif kind == 'market':
        for (x, y) in _sites(Lc, H, G, rng, farm, 1, smax=12):
            q = at(H, x, y)
            sl_.append(market(q[0], q[1], 0.5 * ICON))
    elif kind == 'people':
        for (x, y) in _sites(Lc, H, G, rng, farm + [LC.FOREST], 3, spacing=0.05, smax=22):
            q = at(H, x, y)
            staff = rng.random() < 0.5
            pl.append(figure('walker', q[0], q[1], 1.3 * ICON, P_, flip=staff, staff=staff))
    elif kind == 'herd':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.DRY], 1, smax=18):
            drawn = 'yak' if rng.random() < 0.5 else 'llama'
            if num in HERD and MK.available(HERD[num]):
                herd_icons(doc, G, H, Lc, P_, rng, x, y, HERD[num], companions=COMPANIONS.get(num), story=num)
            else:
                ST.herd(doc, G, H, Lc, P_, rng, x, y, 8, drawn)
    elif kind == 'corral':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.DRY, LC.GROUND], 1, smax=16):
            c = at(H, x, y)
            ux, vy = F.axes()
            ring = np.array([c + ux * 22 * ICON * np.cos(t) + vy * 14 * ICON * np.sin(t) for t in np.linspace(0, 2 * np.pi, 26)])
            sl_.append(f'<path d="{K.d_poly(ring, True, 0.6)}" fill="{P_["alpine"]}" fill-opacity="0.35" '
                       f'stroke="{P_["wallLit"]}" stroke-width="1.6"/>')
            sl_.append(F.box(c[0] - 34 * ICON, c[1] - 4, 18 * ICON, 11 * ICON, 8 * ICON, 'flat', dict(P_, roofFlat=P_['thatch'])))
            for k_, (dx_, dy_) in enumerate(((-8 * ICON, 3 * ICON), (4 * ICON, -2 * ICON), (10 * ICON, 5 * ICON))):
                pl.append((MK.mark(HERD[num], c[0] + dx_, c[1] + dy_, P_, FIG, flip=k_ % 2 == 0)
                           if num in HERD else None)
                          or ST.animal(c[0] + dx_, c[1] + dy_, 'yak' if k_ else 'llama', 1 if k_ % 2 else -1, P_, 0.75 * ICON))
    elif kind == 'camp':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.DRY, LC.SCREE, LC.GROUND], 1, smax=16):
            q = at(H, x, y)
            pl.append(f'<path d="M{f1(q[0] - 9 * ICON)} {f1(q[1])}L{f1(q[0])} {f1(q[1] - 12 * ICON)}L{f1(q[0] + 9 * ICON)} {f1(q[1])}Z" '
                      f'fill="{P_["tentWhite"]}" stroke="{P_["shade"]}" stroke-width="0.6"/>')
            pl.append(f'<path d="M{f1(q[0] - 2 * ICON)} {f1(q[1])}L{f1(q[0])} {f1(q[1] - 5 * ICON)}L{f1(q[0] + 2 * ICON)} {f1(q[1])}Z" fill="{P_["tent"]}"/>')
            pl.append(figure('standing', q[0] + 15 * ICON, q[1], 1.3 * ICON, P_, staff=True))
    elif kind == 'trekkers':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.FOREST, LC.DRY], 1, smax=22):
            pts = (file_of(H, G, x, y, 3, 'trekker', 1.35 * ICON) if MK.available('trekker') else
                   [at(H, np.clip(x + i * 0.012, 0.02, 0.98), np.clip(y + i * 0.01, 0.02, 0.98)) for i in range(3)])
            for i, q in enumerate(pts):
                pl.append(figure('trekker', q[0], q[1], 1.35 * ICON, P_, pick=i, staff=True, load=True))
    elif kind == 'lodge':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.FOREST, LC.DRY], 1, smax=14):
            q = at(H, x, y)
            sl_.append(F.box(q[0], q[1], 30 * ICON, 17 * ICON, 12 * ICON, 'gable', dict(P_, roof=P_['metalRoof'])))
    elif kind == 'stupa':
        for (x, y) in _sites(Lc, H, G, rng, farm + [LC.FOREST], 1, smax=16):
            q = at(H, x, y)
            sl_.append(stupa(q[0], q[1], 1.2 * ICON))
    elif kind == 'mast':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ROCK, LC.SCREE, LC.ALPINE, LC.DRYROCK, LC.SNOW], 1, smax=26):
            q = at(H, x, y)
            inf.append(mast(q[0], q[1], 0.46 * ICON))
    elif kind == 'hut':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ROCK, LC.SCREE, LC.ALPINE, LC.DRYROCK], 1, smax=20):
            q = at(H, x, y)
            sl_.append(f'<ellipse cx="{f1(q[0])}" cy="{f1(q[1] + 1.2 * ICON)}" rx="{f1(7.5 * ICON)}" '
                       f'ry="{f1(2.4 * ICON)}" fill="{P_["shade"]}" fill-opacity="0.42"/>')
            sl_.append(F.box(q[0], q[1], 11 * ICON, 7 * ICON, 5 * ICON, 'gable',
                             dict(P_, roof=P_['metalRoof'])))
    elif kind == 'pillar':
        j, i = np.unravel_index(H.argmax(), H.shape)
        q = at(H, i / (H.shape[0] - 1), j / (H.shape[0] - 1))
        sl_.append(pillar(q[0], q[1], 1.2 * ICON))
    elif kind == 'stakes':
        # A transect reads as a transect only if it runs across the picture.
        # Stepping down the fall line projects almost vertically on an
        # axonometric slope, which stacked the stakes into a totem; stepping
        # in x alone is what spreads them.
        for (x, y) in _sites(Lc, H, G, rng, [LC.SNOW, LC.GLACIER, LC.SCREE], 1, smax=40):
            for i in range(5):
                xx = float(np.clip(x + (i - 2) * 0.052, 0.04, 0.96))
                yy = float(np.clip(y + (i - 2) * 0.010, 0.04, 0.96))
                q = at(H, xx, yy)
                if G.visible(xx, yy, float(V.sample(H, xx, yy)) + 2):
                    inf.append(stake(q[0], q[1], 0.52 * ICON))
    elif kind == 'roped-party':
        for (x, y) in _sites(Lc, H, G, rng, [LC.GLACIER, LC.SNOW], 1, smax=24):
            pts = (file_of(H, G, x, y, 3, 'trekker', 1.3 * ICON) if MK.available('trekker') else
                   [at(H, np.clip(x + i * 0.01, 0.02, 0.98), np.clip(y + i * 0.008, 0.02, 0.98)) for i in range(3)])
            ry = 0.45 * FIG if MK.available('trekker') else 6        # the rope at the harness
            for a_, b_ in zip(pts[:-1], pts[1:]):
                pl.append(f'<path d="M{f1(a_[0])} {f1(a_[1] - ry)}L{f1(b_[0])} {f1(b_[1] - ry)}" stroke="{P_["red"]}" stroke-width="1.1"/>')
            for i, q in enumerate(pts):
                pl.append(figure('trekker', q[0], q[1], 1.3 * ICON, P_, pick=i, staff=True))
    elif kind == 'boulders':
        for (x, y) in _sites(Lc, H, G, rng, [LC.SCREE, LC.ROCK, LC.DRYROCK], 1, smax=30):
            c = at(H, x, y)
            for i in range(26):
                a_ = c + np.array([rng.normal(0, 26 * ICON), rng.normal(0, 11 * ICON)])
                r_ = (1.6 + rng.random() * 2.4) * ICON
                inf.append(f'<ellipse cx="{f1(a_[0])}" cy="{f1(a_[1])}" rx="{f1(r_ * 1.5)}" ry="{f1(r_)}" '
                           f'fill="{P_["rockGlacier"]}" fill-opacity="0.8" stroke="{P_["shade"]}" stroke-width="0.4"/>')
    elif kind == 'ecotypes':
        # one slope, several communities: conifer stand, broadleaf grove, scrub
        # and a wet meadow, so the clip shows an ecosystem mosaic, not one wood
        ux, vy = F.axes()
        kinds = [
            ('conifer', P_['treeBody'], 24),
            ('broadleaf', P_['treeLit'], 20),
            ('scrub', P_['alpine'], 34),
            ('meadow', P_['paddyWater'], 1),
        ]
        spots = _sites(Lc, H, G, rng, [LC.FOREST, LC.ALPINE, LC.GROUND, LC.DRY, LC.TERRACE],
                       len(kinds), spacing=0.14, smax=28)
        for (name, col, n_), (x, y) in zip(kinds, spots):
            c = at(H, x, y)
            if name == 'meadow':
                ring = np.array([c + ux * 46 * np.cos(t) + vy * 26 * np.sin(t)
                                 for t in np.linspace(0, 2 * np.pi, 30)])
                pl.append(f'<path d="{K.d_smooth(ring, True, 1.4)}" fill="{col}" fill-opacity="0.55" '
                          f'stroke="{P_["waterLine"]}" stroke-width="1" stroke-opacity="0.6"/>')
                for _ in range(22):                       # tussocks in the wet ground
                    q = c + ux * rng.normal(0, 26) + vy * rng.normal(0, 14)
                    pl.append(f'<path d="M{f1(q[0])} {f1(q[1])}l0 {f1(-4 - rng.random() * 4)}" '
                              f'stroke="{P_["bund"]}" stroke-width="1.4" stroke-linecap="round"/>')
                continue
            for _ in range(n_):
                q = c + ux * rng.normal(0, 62) + vy * rng.normal(0, 30)
                h_ = (16 if name == 'conifer' else 13 if name == 'broadleaf' else 7) * (0.8 + rng.random() * 0.5)
                if name == 'conifer':
                    pl.append(f'<path d="M{f1(q[0])} {f1(q[1] - h_)}L{f1(q[0] + h_ * 0.34)} {f1(q[1])}'
                              f'L{f1(q[0] - h_ * 0.34)} {f1(q[1])}Z" fill="{col}" stroke="{P_["shade"]}" '
                              f'stroke-width="0.4"/>')
                elif name == 'broadleaf':
                    pl.append(f'<path d="M{f1(q[0])} {f1(q[1])}l0 {f1(-h_ * 0.45)}" stroke="{P_["treeBody"]}" '
                              f'stroke-width="{f1(h_ * 0.12)}"/>'
                              f'<ellipse cx="{f1(q[0])}" cy="{f1(q[1] - h_ * 0.72)}" rx="{f1(h_ * 0.46)}" '
                              f'ry="{f1(h_ * 0.38)}" fill="{col}" stroke="{P_["shade"]}" stroke-width="0.4"/>')
                else:
                    pl.append(f'<ellipse cx="{f1(q[0])}" cy="{f1(q[1] - h_ * 0.4)}" rx="{f1(h_ * 0.55)}" '
                              f'ry="{f1(h_ * 0.4)}" fill="{col}" fill-opacity="0.9"/>')
    elif kind == 'saplings':
        for (x, y) in _sites(Lc, H, G, rng, [LC.FOREST, LC.ALPINE, LC.GROUND, LC.DRY], 1, smax=26):
            for r_ in range(3):
                for c_ in range(5):
                    q = at(H, np.clip(x + c_ * 0.022 - 0.044, 0.02, 0.98),
                           np.clip(y + r_ * 0.022 - 0.022, 0.02, 0.98))
                    pl.append(sapling(q[0], q[1], 0.5 * ICON))
    elif kind == 'checkdams':
        for (x, y) in _sites(Lc, H, G, rng, [LC.GROUND, LC.ALPINE, LC.DRY, LC.SCREE], 3, spacing=0.03, smax=30):
            q = at(H, x, y)
            inf.append(checkdam(q[0], q[1], 0.45 * ICON))
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
                inf.append(post(q[0], q[1], 1.1 * ICON))
    elif kind == 'falcons':
        # Hundreds of thousands of Amur falcons stop in Nagaland on a 22,000 km
        # journey. Drawn as a skein over the forest, nearer birds larger.
        for (x, y) in _sites(Lc, H, G, rng, [LC.FOREST], 1, smax=30):
            q0 = at(H, x, y)
            for i in range(26):
                dx = rng.normal(0, 1) * 150 + (i - 13) * 26
                dy = rng.normal(0, 1) * 34 - 120 - abs(i - 13) * 7
                k_ = 3.4 + 2.6 * rng.random()
                bx, by = q0[0] + dx, q0[1] + dy
                pl.append(MK.mark('falcon', bx, by, P_, 0, pick=i, anchor='centre', shadow=False,
                                  width=3.2 * k_, halo=False)
                          or f'<path d="M{f1(bx - k_)} {f1(by)}q{f1(k_ * 0.5)} {f1(-k_ * 0.8)} {f1(k_)} 0'
                          f'q{f1(k_ * 0.5)} {f1(-k_ * 0.8)} {f1(k_)} 0" fill="none" '
                          f'stroke="{P_["ink"]}" stroke-width="{1.5:.1f}" stroke-linecap="round"/>')
    elif kind == 'lake-works':
        # Palcacocha: a moraine-dammed lake with siphons laid over the dam to
        # hold its level down, and the town in the flood path below.
        got = _sites(Lc, H, G, rng, [LC.WATER], 1, smax=40)
        if got:
            x, y = got[0]
            q = at(H, x, y)
            for i in (-1, 0, 1):                       # siphon pipes over the crest
                a_ = (q[0] + i * 13 * ICON * 0.5, q[1] + 2)
                b_ = (a_[0] + 4 * ICON, a_[1] + 7 * ICON)
                inf.append(f'<path d="M{f1(a_[0])} {f1(a_[1])}Q{f1(a_[0] + 2.4 * ICON)} '
                           f'{f1(a_[1] - 3.4 * ICON)} {f1(b_[0])} {f1(b_[1])}" fill="none" '
                           f'stroke="{P_["concrete"]}" stroke-width="{0.9 * ICON:.1f}" '
                           f'stroke-linecap="round"/>')
            inf.append(post(q[0] - 7 * ICON, q[1] + 2 * ICON, 1.3 * ICON))
            pl.append(figure('walker', q[0] - 4 * ICON, q[1] + 3 * ICON, 1.2 * ICON, P_, staff=True))
    elif kind == 'springs':
        # Kilimanjaro routes most of its water underground; it reappears as
        # springs on the plain, far from the peak.
        for (x, y) in _sites(Lc, H, G, rng, farm + [LC.GROUND], 3, spacing=0.07, smax=10):
            q = at(H, x, y)
            inf.append(f'<ellipse cx="{f1(q[0])}" cy="{f1(q[1])}" rx="{2.2 * ICON:.1f}" '
                       f'ry="{0.9 * ICON:.1f}" fill="{P_["water"]}" stroke="{P_["waterLine"]}" '
                       f'stroke-width="1.2"/>')
            for r_ in (1.0, 1.7, 2.5):
                inf.append(f'<ellipse cx="{f1(q[0])}" cy="{f1(q[1])}" rx="{r_ * ICON:.1f}" '
                           f'ry="{r_ * 0.4 * ICON:.1f}" fill="none" stroke="{P_["waterLine"]}" '
                           f'stroke-width="0.9" stroke-opacity="{0.8 - 0.2 * r_:.2f}"/>')
    elif kind == 'mine':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ROCK, LC.SCREE, LC.DRY, LC.DRYROCK, LC.ALPINE], 1, smax=24):
            ST.mine(doc, G, H, Lc, P_, x, y)
    elif kind == 'pylons':
        for (x, y) in _sites(Lc, H, G, rng, farm + [LC.FOREST], 1, smax=20):
            tops = []
            for i in range(4):
                q = at(H, np.clip(x + i * 0.035 - 0.05, 0.03, 0.97), np.clip(y + i * 0.02 - 0.03, 0.03, 0.97))
                hh = 26 * ICON
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
            sl_.append(F.box(q[0], q[1], 26 * ICON, 15 * ICON, 11 * ICON, 'flat', dict(P_, roofFlat=P_['metalRoof'])))
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
            fl = 1 if rng.random() < 0.5 else -1
            pl.append(MK.mark('planter', q[0], q[1], P_, FIG, flip=fl < 0) or farmer_bent(q[0], q[1], 1.5 * ICON, fl))
    elif kind == 'painter':
        for (x, y) in _sites(Lc, H, G, rng, [LC.ALPINE, LC.FOREST, LC.DRY, LC.SCREE], 1, smax=22):
            q = at(H, x, y)
            m = MK.mark('painter', q[0], q[1], P_, 4.6 * 1.5 * ICON)
            if m:                                          # the icon brings its own easel
                pl.append(m)
                continue
            pl.append(ST.person(q[0] - 8 * ICON, q[1], P_, k=1.5 * ICON))
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
        terraces_clip(doc, G, H, Lc, step=18)          # closer in, the risers read again
        F.trees(doc, G, H, Lc, P, rng, scale=2.6, step=0.05)
        for kind in MOTIFS.get(num, ('village',)):
            motif(doc, kind, Lc, H, G, rng, P, num)
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
        theme = 'light' if '--light' in sys.argv else 'dark'
        for r in range(1, 26):
            # A clip is drawn from its place in the route, but the page asks for
            # it by story number (stories-data.js keys on that), so the file is
            # named by the story. Naming by route order instead served 24 of the
            # 25 clips against the wrong story.
            p = os.path.join(out, 'story-%02d-%s.svg' % (ST.STATIONS[r - 1][0], theme))
            story(r, p)
            print('wrote', p, flush=True)
        raise SystemExit(0)
    if which.isdigit():
        story(int(which), out)
    else:
        {'agriculture': agriculture, 'urban': urban}[which](out)
    print('wrote', out)
