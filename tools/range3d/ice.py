"""
The glacier and the water it feeds, drawn the way glaciologists draw them:
flow lines along the ice, a crevasse field at the icefall and splayed
crevasses at the margins, ogives below the icefall, a medial moraine, debris
cover on the lower tongue, lateral moraines and a trimline on the valley
walls; the dated moraines of past ice fronts with the bare forefield inside
them; the path an outburst flood from the moraine-dammed lake would take;
and the rivers and canals below.
"""
import numpy as np
import terrain as T
import view as V
import landcover as LC
import svgkit as K

f1 = K.f1


def centreline(pts, n=400):
    """Points, unit tangents and unit normals along a polyline, by arc length."""
    pts = np.asarray(pts, float)
    seg = np.hypot(*(pts[1:] - pts[:-1]).T)
    cum = np.concatenate([[0], np.cumsum(seg)]) / seg.sum()
    t = np.linspace(0, 1, n)
    x = np.interp(t, cum, pts[:, 0]); y = np.interp(t, cum, pts[:, 1])
    # a gentle smoothing so offsets do not kink at the vertices
    k = np.ones(21) / 21
    xs = np.convolve(np.pad(x, 10, mode='edge'), k, 'valid'); ys = np.convolve(np.pad(y, 10, mode='edge'), k, 'valid')
    tx, ty = np.gradient(xs), np.gradient(ys)
    L = np.hypot(tx, ty) + 1e-12
    tx, ty = tx / L, ty / L
    return t, np.stack([xs, ys], 1), np.stack([tx, ty], 1), np.stack([-ty, tx], 1)


def gw(t):
    """Half-width of the main glacier at position t (world units)."""
    return 0.028 + 0.050 * (1 - t) ** 1.5


def draped_runs(G, H, x, y, lift=7.0, keep=None):
    import render
    z = V.sample(H, x, y) + lift
    if keep is not None:
        x, y, z = x.copy(), y.copy(), z.copy()
        z[~keep] = -1e6                                # forces a break
    return render.visible_runs(G, x, y, z, 2)


def glacier(doc, G, H, L, P, rng):
    cls = L['cls']
    lay = doc.layer('Glacier-detail')
    t, p, tan, nor = centreline(T.MAIN_GLACIER)
    on_ice = lambda x, y: V.nearest(cls, x, y) == LC.GLACIER

    def line_at(fs, t0, t1, bow=0.0):
        """A line across or along the ice: fs = lateral offsets (in half-widths)."""
        pass

    # flow lines: the ice's own grain, running down-glacier
    d = []
    for f in (-0.62, -0.28, 0.28, 0.62):
        sel = (t > 0.06) & (t < 0.97)
        q = p[sel] + nor[sel] * (f * gw(t[sel]))[:, None]
        for run in draped_runs(G, H, q[:, 0], q[:, 1], 7, on_ice(q[:, 0], q[:, 1])):
            d.append(K.d_smooth(run, False, 1.5))
    lay.append(f'<path d="{"".join(d)}" fill="none" stroke="{P["iceLine"]}" stroke-width="0.9" stroke-opacity="0.7"/>')

    # the icefall: rows of crevasses across the whole width
    d = []
    for tt in np.arange(0.26, 0.50, 0.013):
        for f in np.arange(-0.85, 0.86, 0.22):
            if rng.random() < 0.3:
                continue
            ff = np.linspace(f - 0.10, f + 0.10, 9)
            tb = tt + 0.014 * (1 - ((ff - f) / 0.10) ** 2)       # bowed down-glacier
            i = np.clip((tb * (len(t) - 1)).astype(int), 0, len(t) - 1)
            q = p[i] + nor[i] * (ff * gw(tb))[:, None]
            for run in draped_runs(G, H, q[:, 0], q[:, 1], 7, on_ice(q[:, 0], q[:, 1])):
                d.append(K.d_smooth(run, False, 1.0))
    # marginal crevasses: short, splayed up-glacier at the edges, where the ice shears
    for tt in np.arange(0.30, 0.86, 0.045):          # shear cracks along the tongue's margins only
        for sgn in (-1, 1):
            i0 = int(tt * (len(t) - 1)); i1 = max(0, int((tt - 0.018) * (len(t) - 1)))
            a = p[i0] + nor[i0] * sgn * 0.93 * gw(tt)
            b = p[i1] + nor[i1] * sgn * 0.70 * gw(tt - 0.018)
            q = np.stack([np.linspace(a[0], b[0], 4), np.linspace(a[1], b[1], 4)], 1)
            for run in draped_runs(G, H, q[:, 0], q[:, 1], 7, on_ice(q[:, 0], q[:, 1])):
                d.append(K.d_poly(run, False, 0.8))
    # transverse crevasses down the tongue, bowed down-glacier, opening wider
    # where the bed steepens
    for tt in np.arange(0.52, 0.96, 0.028):
        ff = np.linspace(-0.88, 0.88, 26)
        tb = tt + 0.030 * (1 - ff ** 2)                       # convex down-glacier
        i = np.clip((tb * (len(t) - 1)).astype(int), 0, len(t) - 1)
        q = p[i] + nor[i] * (ff * gw(tb))[:, None]
        for run in draped_runs(G, H, q[:, 0], q[:, 1], 7, on_ice(q[:, 0], q[:, 1])):
            d.append(K.d_smooth(run, False, 1.2))
    lay.append(f'<path d="{"".join(d)}" fill="none" stroke="{P["crevasse"]}" stroke-width="1.4" '
               f'stroke-opacity="0.95" stroke-linecap="round"/>')
    # the bergschrund: the crack where moving ice pulls away from the headwall
    ff = np.linspace(-0.78, 0.78, 26)
    tb = 0.075 + 0.03 * (1 - ff ** 2)
    i = np.clip((tb * (len(t) - 1)).astype(int), 0, len(t) - 1)
    q = p[i] + nor[i] * (ff * gw(tb))[:, None]
    bs = ''.join(K.d_smooth(r, False, 1.4) for r in draped_runs(G, H, q[:, 0], q[:, 1], 7, on_ice(q[:, 0], q[:, 1])))
    lay.append(f'<path d="{bs}" fill="none" stroke="{P["crevasse"]}" stroke-width="2.4" stroke-opacity="0.9" '
               f'stroke-linecap="round"/>')

    # ogives: bands below the icefall, bowed down-glacier
    d = []
    for tt in np.arange(0.58, 0.86, 0.042):
        ff = np.linspace(-0.9, 0.9, 24)
        tb = tt + 0.035 * (1 - ff ** 2)
        i = np.clip((tb * (len(t) - 1)).astype(int), 0, len(t) - 1)
        q = p[i] + nor[i] * (ff * gw(tb))[:, None]
        for run in draped_runs(G, H, q[:, 0], q[:, 1], 7, on_ice(q[:, 0], q[:, 1])):
            d.append(K.d_smooth(run, False, 1.2))
    lay.append(f'<path d="{"".join(d)}" fill="none" stroke="{P["ogive"]}" stroke-width="2.2" stroke-opacity="0.5"/>')

    # the medial moraine: a dark stripe where two ice streams join
    sel = (t > 0.36) & (t < 0.985)
    q = p[sel] + nor[sel] * (0.10 * gw(t[sel]))[:, None]
    d = ''.join(K.d_smooth(r, False, 1.5) for r in draped_runs(G, H, q[:, 0], q[:, 1], 7, on_ice(q[:, 0], q[:, 1])))
    lay.append(f'<path d="{d}" fill="none" stroke="{P["debris"]}" stroke-width="2.6" stroke-dasharray="5 2.5" stroke-opacity="0.95"/>')

    # lateral moraines (sharp crests) and the trimline above them
    mor, trim = [], []
    for sgn in (-1, 1):
        sel = (t > 0.38) & (t <= 1.0)
        q = p[sel] + nor[sel] * (sgn * 1.12 * gw(t[sel]))[:, None]
        mor += [K.d_smooth(r, False, 1.5) for r in draped_runs(G, H, q[:, 0], q[:, 1], 9)]
        q = p[sel] + nor[sel] * (sgn * 1.55 * gw(t[sel]))[:, None]
        trim += [K.d_smooth(r, False, 1.5) for r in draped_runs(G, H, q[:, 0], q[:, 1], 6)]
    ml = doc.layer('Moraines')
    ml.append(f'<path d="{"".join(mor)}" fill="none" stroke="{P["shade"]}" stroke-width="4.2" stroke-opacity="0.55" stroke-linecap="round"/>')
    ml.append(f'<path d="{"".join(mor)}" fill="none" stroke="{P["moraineCrest"]}" stroke-width="2.2" stroke-linecap="round"/>')
    ml.append(f'<path d="{"".join(trim)}" fill="none" stroke="{P["iceLine"]}" stroke-width="0.9" stroke-dasharray="2 3" stroke-opacity="0.6"/>')


def ice_tone(doc, G, L, P):
    """Bright firn in the basin, greyer ice down the tongue: the ablation area
    reads darker, as it does in the field."""
    m = G.mask
    px, py = np.nan_to_num(G.px), np.nan_to_num(G.py)
    ice = V.nearest(L['cls'], px, py) == LC.GLACIER
    gt = V.sample(L['glacier_t'], px, py)
    lay = doc.layer('Glacier-detail')
    for lo, op in [(0.30, 0.10), (0.52, 0.10), (0.72, 0.10)]:    # adjust the tongue's tone here
        d = K.trace(m & ice & (gt > lo), blur=3, step=2.2)
        if d:
            lay.insert(0, f'<path d="{d}" fill="{P["shade"]}" fill-opacity="{op}" fill-rule="evenodd"/>')


def debris_cover(doc, G, L, P):
    """Rock debris on the lower tongue, from the screen buffer (so it follows
    the ice exactly): a dark stippled veneer."""
    m = G.mask
    px, py = np.nan_to_num(G.px), np.nan_to_num(G.py)
    ice = V.nearest(L['cls'], px, py) == LC.GLACIER
    gt = V.sample(L['glacier_t'], px, py)
    gd = V.sample(L['glacier_d'], px, py)
    mk = m & ice & (gt > 0.68) & (gd < 0.14)          # the lower third carries its own rock waste
    d = K.trace(mk, blur=2, step=2.0)
    lay = doc.layer('Glacier-detail')
    lay.insert(0, f'<path d="{d}" fill="{P["debris"]}" fill-opacity="0.72" fill-rule="evenodd"/>')
    ys, xs = np.nonzero(mk)
    if len(xs):
        rng = np.random.default_rng(5)
        k = rng.choice(len(xs), size=min(len(xs) // 18, 900), replace=False)
        dots = ''.join(f'M{f1(xs[i] + 0.5)} {f1(ys[i] + 0.5)}l0.1 0' for i in k)
        lay.insert(1, f'<path d="{dots}" fill="none" stroke="{P["ink"]}" stroke-width="1.3" stroke-opacity="0.35" stroke-linecap="round"/>')
        # supraglacial ponds in the hollows of the debris-covered ice
        pk = rng.choice(len(xs), size=min(9, len(xs)), replace=False)
        pond = ''.join(f'<ellipse cx="{f1(xs[i])}" cy="{f1(ys[i])}" rx="{f1(3 + (i % 4))}" ry="{f1(1.6 + (i % 3) * 0.7)}" '
                       f'fill="{P["water"]}" fill-opacity="0.75" stroke="{P["iceLine"]}" stroke-width="0.5"/>'
                       for i in pk)
        lay.insert(2, pond)


def snout_axis():
    """The snout (end of the ice) and the down-valley direction there."""
    t, p, tan, nor = centreline(T.MAIN_GLACIER)
    return p[-1], tan[-1], nor[-1]


def retreat(doc, G, H, P, cls=None):
    """Dated moraines of past ice fronts, bowed down-valley, each named."""
    import labels as LB
    S, dv, nv = snout_axis()
    lay = doc.layer('Moraines'); lab = doc.layer('Labels')
    # where the ice ends now: traced from the ice itself, not drawn as an arc
    import contourpy, landcover as _LC
    if cls is not None:
        n_ = cls.shape[0]
        gen = contourpy.contour_generator(z=(cls == _LC.GLACIER).astype(float), line_type='Separate')
        best = None
        for seg in gen.lines(0.5):
            q = seg / (n_ - 1)
            d2 = np.hypot(q[:, 0] - S[0], q[:, 1] - S[1])
            if d2.min() < 0.03:
                sel = q[d2 < 0.045]
                if best is None or len(sel) > len(best):
                    best = sel
        if best is not None and len(best) > 6:
            for r in draped_runs(G, H, best[:, 0], best[:, 1], 8):
                lay.append(f'<path d="{K.d_smooth(r, False, 1.2)}" fill="none" stroke="{P["iceLine"]}" '
                           f'stroke-width="2" stroke-dasharray="2 3" stroke-linecap="round"/>')
            q = best[len(best) // 2]
            zz = V.sample(H, q[0], q[1])
            sx_, sy_ = V.project(q[0], q[1], zz)
            lab.append(LB.halo(sx_ + 16, sy_ - 12, 'today', P, 13, col=P['iceLine'], italic=True))
    for k_, (year, dist, hw) in enumerate([('2000', 0.012, 0.040), ('1950', 0.034, 0.048), ('1850', 0.080, 0.058)]):
        ff = np.linspace(-1, 1, 30)
        q = S[None, :] + dv[None, :] * (dist + 0.014 * (1 - ff ** 2))[:, None] + nv[None, :] * (ff * hw)[:, None]
        runs = draped_runs(G, H, q[:, 0], q[:, 1], 8)
        d = ''.join(K.d_smooth(r, False, 1.2) for r in runs)
        lay.append(f'<path d="{d}" fill="none" stroke="{P["moraineCrest"]}" stroke-width="2.6" '
                   f'stroke-dasharray="0.1 4" stroke-linecap="round"/>')
        if runs:
            r_ = max(runs, key=len)
            right = r_[-1] if r_[-1][0] > r_[0][0] else r_[0]
            left = r_[0] if r_[-1][0] > r_[0][0] else r_[-1]
            # dates are set in ice blue, italic, each tied to its own
            # moraine by a tick, so they cannot be read as spot heights
            txt = f'{year} ice edge' if year == '1850' else year
            if year == '1950':                                  # 1950 named on the other side, so the dates never touch
                lab.append(f'<path d="M{f1(left[0] - 7)} {f1(left[1] + 1)}l-6 0" stroke="{P["iceLine"]}" stroke-width="1"/>')
                lab.append(LB.halo(left[0] - 15, left[1] + 5, txt, P, 13, col=P['iceLine'], italic=True, anchor='end'))
            else:
                lab.append(f'<path d="M{f1(right[0] + 4)} {f1(right[1] + 1)}l6 {f1(8 * k_)}" stroke="{P["iceLine"]}" stroke-width="1"/>')
                lab.append(LB.halo(right[0] + 12, right[1] + 5 + 8 * k_, txt, P, 13, col=P['iceLine'], italic=True))


def glof_path(doc, G, H, P):
    """Where an outburst from the moraine-dammed lake would run: down the gorge
    and onto the plain, through the town."""
    import labels as LB
    t, p, tan, nor = centreline(T.MAIN_RIVER)
    sel = (t > 0.02) & (t < 0.62)
    q = p[sel] + nor[sel] * 0.006                              # beside the water, not on it
    runs = draped_runs(G, H, q[:, 0], q[:, 1], 12)
    # where the river leaves its gorge the flood spreads out over the fan
    end, dv, nv = p[sel][-1], tan[sel][-1], nor[sel][-1]
    for ang in (-0.55, -0.2, 0.2, 0.55):
        v = dv * np.cos(ang) + nv * np.sin(ang)
        fan = np.array([end + v * s_ for s_ in np.linspace(0, 0.11, 30)])
        runs += draped_runs(G, H, fan[:, 0], fan[:, 1], 8)
    lay = doc.layer('Hazards')
    d = ''.join(K.d_smooth(r, False, 1.4) for r in runs)
    lay.append(f'<path d="{d}" fill="none" stroke="{P["hazard"]}" stroke-width="2" stroke-dasharray="2 4" stroke-linecap="round"/>')
    # arrowheads along the way
    for r in runs:
        if len(r) < 20:
            continue
        for i in range(12, len(r) - 2, 40):
            a, b = r[i - 3], r[i]
            v = (b - a) / (np.hypot(*(b - a)) + 1e-9); nrm = np.array([-v[1], v[0]])
            tip = b; l1 = b - v * 7 + nrm * 4; l2 = b - v * 7 - nrm * 4
            lay.append(f'<path d="M{f1(l1[0])} {f1(l1[1])}L{f1(tip[0])} {f1(tip[1])}L{f1(l2[0])} {f1(l2[1])}" '
                       f'fill="none" stroke="{P["hazard"]}" stroke-width="1.6" stroke-linejoin="round"/>')
    if runs:
        r = max(runs, key=len)
        m = r[len(r) // 3]
        doc.layer('Labels').append(LB.halo(m[0] + 16, m[1] + 4, 'outburst-flood path', P, LB.TYPE['feature'] - 1, col=P['hazard']))


def rivers(doc, G, H, L, P, w):
    """The designed rivers of each valley, widening downstream, and the canals."""
    lay = doc.layer('Streams')
    res_lake = w['lakes'][1][0]
    specs = [(T.MAIN_RIVER, 0.0, 0.14, 1.3, 2.0),            # the gorge below the lake (the plain part is water fill)
             (T.EAST_VALLEY, 0.02, 1.0, 1.0, 2.4),
             (T.WEST_TRIB, 0.02, 1.0, 0.9, 1.9)]
    for pts, t0, t1, w0, w1 in specs:
        t, p, tan, nor = centreline(pts)
        sel = (t >= t0) & (t <= t1)
        q = p[sel]; tt = t[sel]
        inres = V.nearest(res_lake.astype(np.int8), q[:, 0], q[:, 1]) > 0
        water = V.nearest(L['cls'], q[:, 0], q[:, 1]) == LC.WATER
        keep = ~inres & ~(water & (pts is T.MAIN_RIVER))
        runs = draped_runs(G, H, q[:, 0], q[:, 1], 4, keep)
        for r in runs:
            lay.append(f'<path d="{K.d_smooth(r, False, 1.6)}" fill="none" stroke="{P["waterLine"]}" '
                       f'stroke-width="{(w0 + w1) / 2:.2f}" stroke-linecap="round" stroke-linejoin="round"/>')
    # irrigation canals: along the slope from the river's gorge mouth to the fields
    for canal in CANALS:
        pts = np.array(canal)
        t, p, tan, nor = centreline(pts, 160)
        runs = draped_runs(G, H, p[:, 0], p[:, 1], 3)
        # a canal ends where it delivers: three distributaries into the fields
        end, dv_, nv_ = p[-1], tan[-1], nor[-1]
        for ang in (-0.6, 0.0, 0.6):
            v = dv_ * np.cos(ang) + nv_ * np.sin(ang)
            br = np.array([end + v * s_ for s_ in np.linspace(0, 0.022, 10)])
            for r in draped_runs(G, H, br[:, 0], br[:, 1], 3):
                lay.append(f'<path d="{K.d_smooth(r, False, 1.2)}" fill="none" stroke="{P["waterLine"]}" '
                           f'stroke-width="0.8" stroke-opacity="0.8"/>')
        for r in runs:
            lay.append(f'<path d="{K.d_smooth(r, False, 1.4)}" fill="none" stroke="{P["waterLine"]}" stroke-width="1.1" stroke-opacity="0.95"/>')
            for i in range(8, len(r) - 4, 10 ** 9):              # (sluice gates: shown in the zoom clip only)
                a, b = r[i - 2], r[i + 2]
                v = (b - a) / (np.hypot(*(b - a)) + 1e-9); nrm = np.array([-v[1], v[0]])
                c = r[i]
                lay.append(f'<path d="M{f1(c[0] - nrm[0] * 3)} {f1(c[1] - nrm[1] * 3)}L{f1(c[0] + nrm[0] * 3)} {f1(c[1] + nrm[1] * 3)}" '
                           f'stroke="{P["ink"]}" stroke-width="1"/>')


CANALS = [   # irrigation canals, world coordinates — adjust here
    [(0.372, 0.300), (0.352, 0.268), (0.330, 0.238), (0.312, 0.205), (0.300, 0.170)],
    [(0.560, 0.170), (0.590, 0.180), (0.625, 0.188), (0.670, 0.186)],
]
