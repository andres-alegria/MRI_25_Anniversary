"""
Story closeups, version 1: a zoom into the range, not a block cut out of it.

The earlier clips each stood on their own isometric plinth, with limestone and
shale banded down the sides — twenty-five little block diagrams, each repeating
the geology the overview had already told. These do not. The camera simply
moves in until one station fills the frame: the ground runs to all four edges,
there are no cut faces and no floor, and what the reader sees is the same
mountain they just looked at, nearer.

It is a redrawing, not an enlargement. The window is resampled on a finer grid,
the contour interval closes up, the lines are set for the new scale and the
motifs are drawn large, because at this distance the iconography — not the
landform — is what carries the story.

    python3 closeup.py 1 OUT.svg [--light]

The argument is the story's own number (1 = Glaciers, as the drafts are
numbered); the badge carries that story's station number on the climb.
"""
import sys

import numpy as np

import terrain as T
import view as V
import landcover as LC
import svgkit as K
import features as F
import clip as CL
import ice as ICE
import labels as LB
import render as R
import story as ST

f1 = K.f1
P = R.PAL

# --- the clip, in numbers — adjust the framing and the drawing scale here ----
CANVAS = (1800, 1300)          # px
VE = 0.75                      # vertical exaggeration (1 = true scale)
SHOWN = 0.46                   # of the window's width that the canvas spans
GRID = 900                     # terrain samples across the window
ICON = 10.0                    # motif scale, against the overview's own symbols
LW = 1.9                       # line weight of the ice drawing, against the overview's
CONTOUR = 20                   # contour interval, m

# Where each story's closeup looks: centre (world x, y) and the window built
# around it, in world units (the block is 1 x 1 and 25 km across). The canvas
# shows roughly three-quarters of the window; the rest is the margin the camera
# crops, which is what keeps ground against every edge.
FRAME = {
    1: (0.462, 0.548, 0.170),          # Glaciers: the snout, its forefield and the new lake
}
WINDOW_DEFAULT = 0.115


def frame_for(num):
    """The window for one story: its own entry, or one centred on its station."""
    if num in FRAME:
        cx, cy, size = FRAME[num]
    else:
        st = [s for s in ST.STATIONS if s[0] == num][0]
        cx, cy, size = float(st[1]), float(st[2]), WINDOW_DEFAULT
    half = size / 2
    cx = float(np.clip(cx, half, 1 - half))
    cy = float(np.clip(cy, half, 1 - half))
    return cx, cy, size


def place(H, u, v, size):
    """Scale and centre the camera so the canvas is a window *inside* the
    surface: no block edge, no floor, nothing but ground at the margins."""
    wide = np.sin(V.THETA) + np.cos(V.THETA)          # the unit square's projected width
    V.SCALE = V.W / (SHOWN * wide)
    # the overview is 0.086 px/m at SCALE 1330 and exaggerated x1.8; hold the
    # same relation at this scale and this exaggeration
    V.ZK = 0.086 * (VE / 1.8) / size * (V.SCALE / 1330.0)
    V.ORIGIN_X = V.ORIGIN_Y = 0.0
    sx, sy = V.project(u, v, float(V.sample(H, u, v)))
    V.ORIGIN_X = V.W / 2 - float(sx)
    V.ORIGIN_Y = V.H_PX / 2 - float(sy)


_WORLD = []


def world():
    if not _WORLD:
        w = T.build()
        _WORLD.append((w, LC.classify(w)))
    return _WORLD[0]


LAYERS = ['Ground', 'Cover', 'Shade', 'Contours', 'Terraces', 'Streams', 'Moraines',
          'Glacier-detail', 'Isolines', 'Trees', 'Settlements', 'Infrastructure',
          'People-animals', 'Air', 'Labels', 'Title']


def build(num):
    """The ground of one closeup: cover, shading, contours — no faces, no floor."""
    cx, cy, size = frame_for(num)
    x0, y0 = cx - size / 2, cy - size / 2
    frame = (x0, y0, size)
    w, L = world()
    wc, Lc = CL.window(w, L, x0, y0, size, n=GRID)
    H = wc['H']
    V.W, V.H_PX = CANVAS
    place(H, 0.5, 0.5, size)
    G = V.GBuffer(H, V.W, V.H_PX)
    doc = K.Doc(V.W, V.H_PX, P['ground'])
    for nm in LAYERS:
        doc.layer(nm)
    m = G.mask
    px, py = np.nan_to_num(G.px), np.nan_to_num(G.py)
    # the ground is the page: anything the terrain does not cover (a sliver at a
    # corner) is still ground, never sky, because this is a view into a slope
    doc.layer('Ground').append(f'<rect width="{V.W}" height="{V.H_PX}" fill="{P["ground"]}"/>')
    C = np.where(m, V.nearest(Lc['cls'], px, py), -1)
    for code, nm in enumerate(LC.NAMES):
        if code == LC.GROUND:
            continue
        mk = C == code
        if mk.sum() < 40:
            continue
        doc.layer('Cover').append(f'<path d="{K.trace(mk, blur=1, step=1.6)}" fill="{P[nm]}" fill-rule="evenodd"/>')
    # hill shading at the window's own ground span
    span = LC.SPAN_M * size
    gy, gx = np.gradient(H, span / (H.shape[0] - 1))
    nx, ny, nz = -gx * 3, -gy * 3, np.ones_like(H)
    hs = (nx * R.LIGHT[0] + ny * R.LIGHT[1] + nz * R.LIGHT[2]) / np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    S = np.where(m, V.sample(hs, px, py), 1.0)
    for lv, op in [(0.55, 0.11), (0.40, 0.11), (0.26, 0.12)]:
        doc.layer('Shade').append(f'<path d="{K.trace(m & (S < lv), blur=2, step=1.8)}" fill="{P["shade"]}" '
                                  f'fill-opacity="{op}" fill-rule="evenodd"/>')
    # contours: the interval closes up at this distance, and the lines thin with it
    D = R.depth_image(G)
    jump = np.zeros_like(m)
    dd = np.abs(np.diff(np.nan_to_num(D, nan=9), axis=0)) > 0.012
    jump[1:] |= dd; jump[:-1] |= dd
    Z = np.where(m & ~jump, G.pz, np.nan)
    lo = int(np.nanmin(Z) // CONTOUR) * CONTOUR
    hi = int(np.nanmax(Z) // CONTOUR + 2) * CONTOUR
    iso = K.lines(Z, list(range(lo, hi, CONTOUR)))
    for lv, segs in iso.items():
        idx = lv % (CONTOUR * 5) == 0
        d = ''.join(K.d_poly(sg, False, 1.8) for sg in segs)
        if d:
            doc.layer('Contours').append(
                f'<path d="{d}" fill="none" stroke="{P["ink"]}" stroke-width="{0.9 if idx else 0.5}" '
                f'stroke-opacity="{0.38 if idx else 0.19}"/>')
    return dict(num=num, frame=frame, size=size, wc=wc, Lc=Lc, H=H, G=G, doc=doc, hs=hs,
                cover=float(m.mean()))


# --- the ice ----------------------------------------------------------------
def ice_detail(ctx, rng):
    """The overview's own glacier drawing, re-aimed at the window.

    ice.py works off the world centreline and a half-width in world units; move
    both into the window's coordinates and the same code draws the flow lines,
    crevasses, ogives, medial moraine, lateral moraines and trimline at this
    much closer scale."""
    size = ctx['size']
    axis = CL.to_local(np.array(T.MAIN_GLACIER), ctx['frame'])
    keep_axis, keep_gw = T.MAIN_GLACIER, ICE.gw
    T.MAIN_GLACIER = [tuple(q) for q in axis]
    ICE.gw = lambda t, _g=keep_gw, _s=size: _g(t) / _s
    try:
        ICE.glacier(ctx['doc'], ctx['G'], ctx['H'], ctx['Lc'], P, rng, lw=LW, flanks=False)
        termini(ctx)
    finally:
        T.MAIN_GLACIER, ICE.gw = keep_axis, keep_gw


def termini(ctx, years=(('2000', 0.024, 0.034), ('1975', 0.046, 0.040))):
    """Where the ice front stood. Each is a bank of rubble bulldozed up and
    then left behind, so it is drawn as a ridge — lit crest, shadow below —
    and not as a line. The dates are the only words on the clip, and they are
    the story: this glacier has walked back up its own valley."""
    size = ctx['size']
    S, dv, nv = ICE.snout_axis()
    lay = ctx['doc'].layer('Moraines'); lab = ctx['doc'].layer('Labels')
    for year, dist, hw in years:
        dist, hw = dist / size, hw / size
        ff = np.linspace(-1, 1, 44)
        q = (S[None, :] + dv[None, :] * (dist + 0.013 / size * (1 - ff ** 2))[:, None]
             + nv[None, :] * (ff * hw)[:, None])
        floor = np.isin(V.nearest(ctx['Lc']['cls'], q[:, 0], q[:, 1]),
                        [LC.FOREFIELD, LC.GROUND, LC.SCREE, LC.ROCK, LC.ALPINE])
        runs = ICE.draped_runs(ctx['G'], ctx['H'], q[:, 0], q[:, 1], 8, floor)
        runs = [r for r in runs if len(r) > 5]
        if not runs:
            continue
        d = ''.join(K.d_smooth(r, False, 1.2) for r in runs)
        lay.append(f'<path d="{d}" fill="none" stroke="{P["shade"]}" stroke-width="11" '
                   f'stroke-opacity="0.45" stroke-linecap="round" transform="translate(0 5)"/>')
        lay.append(f'<path d="{d}" fill="none" stroke="{P["till"]}" stroke-width="7" '
                   f'stroke-linecap="round"/>')
        lay.append(f'<path d="{d}" fill="none" stroke="{P["moraineCrest"]}" stroke-width="2.4" '
                   f'stroke-linecap="round"/>')
        r_ = max(runs, key=len)
        end = r_[-1] if r_[-1][0] > r_[0][0] else r_[0]
        lab.append(LB.halo(end[0] + 13, end[1] + 6, year, P, 21, col=P['dateInk'], italic=False))


def boulders(ctx, rng, n=22):
    """Erratics and till hummocks on the ground the ice has just left, so the
    forefield reads as fresh rubble and not as an empty grey apron."""
    Lc, H, G = ctx['Lc'], ctx['H'], ctx['G']
    cls = Lc['cls']; N = cls.shape[0] - 1
    j, i = np.nonzero(cls == LC.FOREFIELD)
    if not len(i):
        return
    lay = ctx['doc'].layer('Infrastructure')
    for k in rng.permutation(len(i))[:600]:
        if n <= 0:
            break
        x, y = i[k] / N, j[k] / N
        z = float(V.sample(H, x, y))
        if not bool(G.visible(np.array([x]), np.array([y]), np.array([z + 2]))[0]):
            continue
        sx, sy = V.project(x, y, z)
        if not (40 < sx < V.W - 40 and 120 < sy < V.H_PX - 30):
            continue
        r = float(rng.uniform(3.2, 7.0))
        lay.append(f'<ellipse cx="{f1(sx)}" cy="{f1(sy + r * 0.3)}" rx="{r * 1.25:.2f}" ry="{r * 0.45:.2f}" '
                   f'fill="{P["shade"]}" fill-opacity="0.45"/>')
        lay.append(f'<ellipse cx="{f1(sx)}" cy="{f1(sy)}" rx="{r:.2f}" ry="{r * 0.72:.2f}" '
                   f'fill="{P["till"]}" stroke="{P["shade"]}" stroke-width="0.7"/>')
        n -= 1


def meltwater(ctx):
    """The stream leaving the snout — the glacier as a reservoir, paying out."""
    pts = CL.to_local(np.array(T.MAIN_RIVER), ctx['frame'])
    t, p, tan, nor = ICE.centreline(pts, 300)
    inside = (p[:, 0] > -0.05) & (p[:, 0] < 1.05) & (p[:, 1] > -0.05) & (p[:, 1] < 1.05)
    q = p[inside]
    if len(q) < 4:
        return
    lay = ctx['doc'].layer('Streams')
    dry = V.nearest(ctx['Lc']['cls'], q[:, 0], q[:, 1]) != LC.WATER
    for r in ICE.draped_runs(ctx['G'], ctx['H'], q[:, 0], q[:, 1], 4, dry):
        lay.append(f'<path d="{K.d_smooth(r, False, 1.5)}" fill="none" stroke="{P["waterLine"]}" '
                   f'stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>')


# --- the instruments --------------------------------------------------------
def at(H, x, y, lift=0.0):
    return np.array(V.project(x, y, float(V.sample(H, x, y)) + lift))


def stake(x, y, k=1.0):
    """An ablation stake: a pole drilled into the ice, read against the surface.
    The in-situ network is a tenth of a per cent of the world's glaciers, and
    it is still what every satellite is checked against."""
    h = 13 * k
    return (f'<path d="M{f1(x)} {f1(y)}L{f1(x)} {f1(y - h)}" stroke="{P["ink"]}" stroke-width="{1.5 * k:.2f}" '
            f'stroke-linecap="round"/>'
            f'<path d="M{f1(x - 2.6 * k)} {f1(y - h)}L{f1(x + 2.6 * k)} {f1(y - h)}" stroke="{P["red"]}" '
            f'stroke-width="{2.2 * k:.2f}" stroke-linecap="round"/>'
            f'<ellipse cx="{f1(x)}" cy="{f1(y)}" rx="{2.2 * k:.2f}" ry="{1.0 * k:.2f}" '
            f'fill="{P["shade"]}" fill-opacity="0.45"/>')


def aws(x, y, k=1.0):
    """An automatic weather station: mast, guys, cup anemometer, radiation
    shield and the panel that keeps it alive through the winter."""
    h = 30 * k
    w = 1.6 * k
    g = []
    g.append(f'<path d="M{f1(x - 7 * k)} {f1(y)}L{f1(x)} {f1(y - h * 0.86)}L{f1(x + 7 * k)} {f1(y)}" '
             f'fill="none" stroke="{P["ink"]}" stroke-width="{0.8 * k:.2f}" stroke-opacity="0.75"/>')
    g.append(f'<path d="M{f1(x)} {f1(y)}L{f1(x)} {f1(y - h)}" stroke="{P["ink"]}" stroke-width="{w:.2f}"/>')
    # cross-arm with the cups
    ay = y - h + 2 * k
    g.append(f'<path d="M{f1(x - 6 * k)} {f1(ay)}L{f1(x + 6 * k)} {f1(ay)}" stroke="{P["ink"]}" '
             f'stroke-width="{1.1 * k:.2f}"/>')
    for s in (-1, 1):
        g.append(f'<circle cx="{f1(x + s * 6 * k)}" cy="{f1(ay)}" r="{1.9 * k:.2f}" fill="{P["light"]}"/>')
    g.append(f'<circle cx="{f1(x)}" cy="{f1(y - h - 1.5 * k)}" r="{1.6 * k:.2f}" fill="{P["ink"]}"/>')
    # radiation shield, and the solar panel facing the sun
    g.append(f'<path d="M{f1(x - 2.6 * k)} {f1(y - h * 0.56)}L{f1(x + 2.6 * k)} {f1(y - h * 0.56)}'
             f'L{f1(x + 2.0 * k)} {f1(y - h * 0.44)}L{f1(x - 2.0 * k)} {f1(y - h * 0.44)}Z" '
             f'fill="{P["light"]}" stroke="{P["ink"]}" stroke-width="{0.6 * k:.2f}"/>')
    g.append(f'<path d="M{f1(x + 1.5 * k)} {f1(y - h * 0.33)}L{f1(x + 10 * k)} {f1(y - h * 0.40)}'
             f'L{f1(x + 10 * k)} {f1(y - h * 0.28)}L{f1(x + 1.5 * k)} {f1(y - h * 0.21)}Z" '
             f'fill="{P["solar"]}" stroke="{P["solarFrame"]}" stroke-width="{0.6 * k:.2f}"/>')
    return ''.join(g)


def drone(x, y, k=1.0, up=46.0):
    """A survey drone over the ice, with the line down to the spot it is
    mapping — the scale between a stake and a satellite."""
    cy = y - up * k
    arm = 7.5 * k
    g = [f'<path d="M{f1(x)} {f1(cy + 3 * k)}L{f1(x)} {f1(y - 2 * k)}" stroke="{P["inkSoft"]}" '
         f'stroke-width="{0.8 * k:.2f}" stroke-dasharray="{2.5 * k:.1f} {3.5 * k:.1f}" stroke-opacity="0.7"/>',
         f'<ellipse cx="{f1(x)}" cy="{f1(y)}" rx="{3.4 * k:.2f}" ry="{1.4 * k:.2f}" fill="{P["shade"]}" '
         f'fill-opacity="0.4"/>']
    for s in (-1, 1):
        g.append(f'<path d="M{f1(x + s * 1.6 * k)} {f1(cy)}L{f1(x + s * arm)} {f1(cy - 2.4 * k)}" '
                 f'stroke="{P["ink"]}" stroke-width="{1.3 * k:.2f}" stroke-linecap="round"/>')
        g.append(f'<path d="M{f1(x + s * 1.6 * k)} {f1(cy + 1.2 * k)}L{f1(x + s * arm * 0.72)} {f1(cy + 3.4 * k)}" '
                 f'stroke="{P["ink"]}" stroke-width="{1.3 * k:.2f}" stroke-linecap="round"/>')
        for px_, py_ in ((s * arm, cy - 2.4 * k), (s * arm * 0.72, cy + 3.4 * k)):
            g.append(f'<ellipse cx="{f1(x + px_)}" cy="{f1(py_)}" rx="{4.2 * k:.2f}" ry="{1.1 * k:.2f}" '
                     f'fill="none" stroke="{P["inkSoft"]}" stroke-width="{0.8 * k:.2f}" stroke-opacity="0.8"/>')
    g.append(f'<rect x="{f1(x - 4.0 * k)}" y="{f1(cy - 2.6 * k)}" width="{8.0 * k:.2f}" height="{5.6 * k:.2f}" '
             f'rx="{1.6 * k:.2f}" fill="{P["ink"]}" stroke="{P["light"]}" stroke-width="{0.7 * k:.2f}"/>')
    g.append(f'<circle cx="{f1(x)}" cy="{f1(cy + 3.8 * k)}" r="{2.0 * k:.2f}" fill="{P["light"]}"/>')
    return ''.join(g)


def satellite(x, y, k=1.0, beam=None):
    """The other half of the observing system: the pass overhead that turned a
    few hundred measured glaciers into a quarter of a million mapped ones."""
    g = []
    if beam is not None:
        bx, by = beam
        g.append(f'<path d="M{f1(x - 5 * k)} {f1(y + 6 * k)}L{f1(bx - 52 * k)} {f1(by)}'
                 f'L{f1(bx + 52 * k)} {f1(by)}L{f1(x + 5 * k)} {f1(y + 6 * k)}Z" '
                 f'fill="{P["light"]}" fill-opacity="0.13" stroke="{P["light"]}" '
                 f'stroke-width="{0.7 * k:.2f}" stroke-dasharray="{5 * k:.1f} {4 * k:.1f}" stroke-opacity="0.45"/>')
    g.append(f'<rect x="{f1(x - 4.5 * k)}" y="{f1(y - 4.0 * k)}" width="{9 * k:.2f}" height="{8 * k:.2f}" '
             f'rx="{1.4 * k:.2f}" fill="{P["ink"]}" stroke="{P["light"]}" stroke-width="{0.7 * k:.2f}"/>')
    for s in (-1, 1):
        g.append(f'<rect x="{f1(x + (4.5 * k if s > 0 else -16.5 * k))}" y="{f1(y - 3.0 * k)}" '
                 f'width="{12 * k:.2f}" height="{6 * k:.2f}" fill="{P["solar"]}" '
                 f'stroke="{P["solarFrame"]}" stroke-width="{0.7 * k:.2f}"/>')
        g.append(f'<path d="M{f1(x + s * 4.5 * k)} {f1(y)}L{f1(x + s * 10.5 * k)} {f1(y)}" '
                 f'stroke="{P["solarFrame"]}" stroke-width="{0.6 * k:.2f}"/>')
    g.append(f'<path d="M{f1(x)} {f1(y + 4.0 * k)}L{f1(x)} {f1(y + 7.5 * k)}" stroke="{P["light"]}" '
             f'stroke-width="{1.0 * k:.2f}"/>')
    g.append(f'<path d="M{f1(x - 3.4 * k)} {f1(y + 11 * k)}A{f1(5 * k)} {f1(5 * k)} 0 0 1 {f1(x + 3.4 * k)} {f1(y + 11 * k)}Z" '
             f'fill="{P["light"]}" fill-opacity="0.85"/>')
    return ''.join(g)


def on_ice(Lc, H, G, rng, n, lo=None, hi=None, margin=0.22):
    """Points on the ice that the camera can actually see, spread apart."""
    cls = Lc['cls']
    N = cls.shape[0] - 1
    cond = cls == LC.GLACIER
    if lo is not None:
        cond &= H > lo
    if hi is not None:
        cond &= H < hi
    box = np.zeros_like(cond)
    box[int(margin * N):int((1 - margin) * N), int(margin * N):int((1 - margin) * N)] = True
    j, i = np.nonzero(cond & box)
    if not len(i):
        return []
    out = []
    for _ in range(400):
        if len(out) >= n:
            break
        k = rng.integers(len(i))
        x, y = i[k] / N, j[k] / N
        sx, sy = V.project(x, y, float(V.sample(H, x, y)))
        if not (120 < sx < V.W - 120 and 150 < sy < V.H_PX - 90):
            continue
        if not bool(G.visible(np.array([x]), np.array([y]), np.array([V.sample(H, x, y) + 4]))[0]):
            continue
        if any(np.hypot(x - a, y - b) < 0.11 for a, b in out):
            continue
        out.append((x, y))
    return out


def instruments(ctx, rng):
    """Story 1's iconography: what it now takes to watch a glacier.

    The narrative's centre is not the ice but the observing of it — stakes and a
    field party on the tongue, a weather station on the moraine, a drone over
    the snout and a satellite above all of them. Together they are the story's
    own argument: the measurement has been transformed; the ice is going anyway.
    """
    doc, H, G, Lc = ctx['doc'], ctx['H'], ctx['G'], ctx['Lc']
    inf = doc.layer('Infrastructure'); ppl = doc.layer('People-animals'); air = doc.layer('Air')

    # a line of ablation stakes down the tongue
    seeds = on_ice(Lc, H, G, rng, 1, margin=0.26)
    if seeds:
        sx0, sy0 = seeds[0]
        for i in range(5):
            x = np.clip(sx0 + (i - 2) * 0.042, 0.04, 0.96)
            y = np.clip(sy0 + (i - 2) * 0.024, 0.04, 0.96)
            if V.nearest(Lc['cls'], x, y) != LC.GLACIER:
                continue
            q = at(H, x, y)
            inf.append(stake(q[0], q[1], ICON * 0.30))

    # the roped party, higher up the ice
    pts = on_ice(Lc, H, G, rng, 1, margin=0.3)
    if pts:
        bx, by = pts[0]
        party = []
        for i in range(3):
            x = np.clip(bx + i * 0.026, 0.04, 0.96); y = np.clip(by - i * 0.013, 0.04, 0.96)
            party.append(at(H, x, y))
        for a_, b_ in zip(party[:-1], party[1:]):
            ppl.append(f'<path d="M{f1(a_[0])} {f1(a_[1] - 0.30 * ICON)}'
                       f'L{f1(b_[0])} {f1(b_[1] - 0.30 * ICON)}" stroke="{P["red"]}" '
                       f'stroke-width="2.4" stroke-opacity="0.9"/>')
        for i, q in enumerate(party):
            ppl.append(ST.person(q[0], q[1], P, staff=i == 0, load=i == 2, k=1.15 * ICON))

    # the weather station, on dry ground beside the ice
    cls = Lc['cls']; N = cls.shape[0] - 1
    near = np.isin(cls, [LC.FOREFIELD, LC.SCREE, LC.ROCK, LC.ALPINE, LC.GROUND])
    box = np.zeros_like(near)
    box[int(0.30 * N):int(0.74 * N), int(0.24 * N):int(0.76 * N)] = True
    j, i = np.nonzero(near & box)
    if len(i):
        best = None
        for k in rng.permutation(len(i))[:400]:
            x, y = i[k] / N, j[k] / N
            sx, sy = V.project(x, y, float(V.sample(H, x, y)))
            if not (180 < sx < V.W - 180 and 260 < sy < V.H_PX - 120):
                continue
            if bool(G.visible(np.array([x]), np.array([y]), np.array([V.sample(H, x, y) + 4]))[0]):
                best = (x, y); break
        if best:
            q = at(H, *best)
            inf.append(aws(q[0], q[1], ICON * 0.34))

    # the drone, over the snout
    S, _, _ = ICE.snout_axis()
    sx = float(np.clip(S[0], 0.06, 0.94)); sy = float(np.clip(S[1], 0.06, 0.94))
    q = at(H, sx, sy)
    if 60 < q[0] < V.W - 60:
        air.append(drone(q[0], q[1], ICON * 0.70, up=40.0))

    # and the satellite above, with its swath over the tongue
    air.append(satellite(252, 168, ICON * 0.78, beam=(700, 660)))


# --- the frame --------------------------------------------------------------
def title(doc, num, station):
    """A badge with the station number and the story's name, nothing else."""
    lay = doc.layer('Title')
    lay.append(f'<circle cx="86" cy="70" r="27" fill="{P["markerFill"]}" stroke="{P["red"]}" stroke-width="3.2"/>')
    lay.append(f'<text x="86" y="79" text-anchor="middle" font-family="{K.SANS}" font-weight="700" '
               f'font-size="25" fill="{P["markerText"]}">{station}</text>')
    lay.append(LB.halo(130, 80, ST.TOPICS[num].replace('&', '&amp;'), P, 32, italic=False, weight=600,
                       col=P['titleInk']))


def closeup(num, out):
    rng = np.random.default_rng(300 + num)
    ctx = build(num)
    doc, H, G, Lc = ctx['doc'], ctx['H'], ctx['G'], ctx['Lc']
    F.trees(doc, G, H, Lc, P, rng, scale=3.0, step=0.024)
    ice_detail(ctx, rng)
    boulders(ctx, rng)
    meltwater(ctx)
    instruments(ctx, rng)
    station = [i + 1 for i, s in enumerate(ST.STATIONS) if s[0] == num][0]
    title(doc, num, station)
    open(out, 'w').write(doc.svg())
    print('ground covers %.1f%% of the frame' % (100 * ctx['cover']))
    return doc


if __name__ == '__main__':
    if '--light' in sys.argv:
        R.use_light()
        P = R.PAL
    num, out = int(sys.argv[1]), sys.argv[2]
    closeup(num, out)
    print('wrote', out)
