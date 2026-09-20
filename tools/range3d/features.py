"""
The living landscape on the block: trees, fields, paddies, terraces, towns and
villages, drawn as symbols that share the block's own axonometry — a house is
a small box whose sides face the same way as the block's sides.

Symbols are sized in screen pixels (a real house would vanish on a 25 km
block); everything is placed on the ground and hidden behind ridges with the
same horizon test as the linework.
"""
import numpy as np
import terrain as T
import view as V
import landcover as LC
import svgkit as K

f1 = K.f1


def axes():
    """Screen directions of one pixel along world x (east) and world y (north)."""
    ux = np.array([np.cos(V.THETA), -np.sin(V.THETA) * np.sin(V.PHI)])
    vy = np.array([-np.sin(V.THETA), -np.cos(V.THETA) * np.sin(V.PHI)])
    return ux / np.hypot(*ux), vy / np.hypot(*vy)


def mix(a, b, t):
    ca = [int(a[i:i + 2], 16) for i in (1, 3, 5)]; cb = [int(b[i:i + 2], 16) for i in (1, 3, 5)]
    return '#%02X%02X%02X' % tuple(int(round(ca[k] + (cb[k] - ca[k]) * t)) for k in range(3))


def jittered(step, rng, x0=0, x1=1, y0=0, y1=1, j=0.45):
    gx = np.arange(x0 + step / 2, x1, step); gy = np.arange(y0 + step / 2, y1, step)
    X, Y = np.meshgrid(gx, gy)
    X = X + rng.uniform(-j, j, X.shape) * step; Y = Y + rng.uniform(-j, j, Y.shape) * step
    return X.ravel(), Y.ravel()


# ---------------------------------------------------------------------------
# trees
# ---------------------------------------------------------------------------
def trees(doc, G, H, L, P, rng, scale=1.0, step=0.0098):
    """Forest as individual trees: spire conifers high up, round crowns lower,
    thinning and shrinking toward the treeline. Stands clump — dense in the
    gullies and on shaded ground, thin on the spurs — and no two crowns are
    quite the same shape."""
    X, Y = jittered(step, rng)
    c = V.nearest(L['cls'], X, Y)
    Z = V.sample(H, X, Y)
    forest = c == LC.FOREST
    near_line = np.clip((Z - (LC.TREELINE - 450)) / 450, 0, 1)
    # clumping: a slow noise field, so the stand has dense cores and open gaps
    clump = T.fbm(X * 26, Y * 26, 4, seed=T.SEED + 311)
    clump = (clump - clump.min()) / (np.ptp(clump) + 1e-9)
    wet = np.clip(V.sample(L['acc'], X, Y) / 60.0, 0, 1)          # gullies hold more trees
    dens = np.clip(0.30 + 1.15 * clump + 0.45 * wet, 0, 1.35)
    # dense low down, thinning to scattered trees at the treeline; the dry
    # east side is open woodland
    dry = X > 0.55
    keep = forest & (rng.random(X.shape) * (0.35 + 0.65 * dens) > 0.12 + 0.70 * near_line + 0.30 * dry)
    X, Y, Z, near_line = X[keep], Y[keep], Z[keep], near_line[keep]
    vis = G.visible(X, Y, Z + 2)
    X, Y, Z, near_line = X[vis], Y[vis], Z[vis], near_line[vis]
    sx, sy = V.project(X, Y, Z)
    # a tree in front of the ice can still paint its crown onto the glacier
    # behind it; drop those, so no conifer appears to grow on a glacier
    ix = np.clip(sx.astype(int), 0, G.w - 1)
    iy = np.clip((sy - 9).astype(int), 0, G.h - 1)
    onice = np.zeros(len(sx), bool)
    ok = G.mask[iy, ix]
    if ok.any():
        onice[ok] = np.isin(V.nearest(L['cls'], G.px[iy[ok], ix[ok]], G.py[iy[ok], ix[ok]]),
                            [LC.GLACIER, LC.SNOW])
    sx, sy, Z, near_line = sx[~onice], sy[~onice], Z[~onice], near_line[~onice]
    order = np.argsort(sy)                              # far (higher on screen) first
    # each tree in two tones: the side toward the light and the side away,
    # so a stand reads as a mass of small crowns rather than as texture
    lit_c, shade_c = P['treeLit'], P['treeBody']
    out_l, out_s = [], []
    for k in order:
        x, y = sx[k], sy[k]
        # size falls off with height, continuously, with a little spread
        h = (6.8 + rng.random() * 5.6) * (1 - 0.45 * near_line[k]) * scale
        lean = (rng.random() - 0.5) * h * 0.22          # no tree stands perfectly straight
        conifer = Z[k] > 1500 + rng.normal(0, 250)
        if conifer:
            wdt = h * (0.26 + rng.random() * 0.16)
            yb = y - h * 0.08
            tipx = x + lean
            kind = rng.random()
            if kind < 0.38:                              # narrow spire
                out_l.append(f'M{f1(tipx)} {f1(y - h)}L{f1(x)} {f1(yb)}L{f1(x - wdt)} {f1(yb)}Z')
                out_s.append(f'M{f1(tipx)} {f1(y - h)}L{f1(x + wdt)} {f1(yb)}L{f1(x)} {f1(yb)}Z')
            elif kind < 0.72:                            # fir with a stepped skirt
                m1 = y - h * 0.52
                out_l.append(f'M{f1(tipx)} {f1(y - h)}L{f1(x - wdt * 0.62)} {f1(m1)}L{f1(x - wdt * 0.34)} {f1(m1)}'
                             f'L{f1(x - wdt)} {f1(yb)}L{f1(x)} {f1(yb)}Z')
                out_s.append(f'M{f1(tipx)} {f1(y - h)}L{f1(x + wdt * 0.62)} {f1(m1)}L{f1(x + wdt * 0.34)} {f1(m1)}'
                             f'L{f1(x + wdt)} {f1(yb)}L{f1(x)} {f1(yb)}Z')
            else:                                        # ragged, wind-cut crown
                s1, s2 = wdt * (0.5 + rng.random() * 0.3), wdt * (0.5 + rng.random() * 0.3)
                out_l.append(f'M{f1(tipx)} {f1(y - h)}L{f1(x - s1)} {f1(y - h * 0.58)}L{f1(x - wdt * 0.5)} {f1(y - h * 0.5)}'
                             f'L{f1(x - wdt)} {f1(yb)}L{f1(x)} {f1(yb)}Z')
                out_s.append(f'M{f1(tipx)} {f1(y - h)}L{f1(x + s2)} {f1(y - h * 0.62)}L{f1(x + wdt * 0.55)} {f1(y - h * 0.5)}'
                             f'L{f1(x + wdt)} {f1(yb)}L{f1(x)} {f1(yb)}Z')
        else:
            r = h * (0.33 + rng.random() * 0.14)
            ry = r * (0.78 + rng.random() * 0.34)        # some crowns tall, some spread
            cx, cy = x + lean * 0.5, y - h * 0.62
            out_s.append(f'M{f1(cx - r)} {f1(cy)}a{f1(r)} {f1(ry)} 0 1 1 {f1(2 * r)} 0'
                         f'a{f1(r)} {f1(ry)} 0 1 1 {f1(-2 * r)} 0Z')
            out_l.append(f'M{f1(cx - r * 0.1)} {f1(cy - ry)}A{f1(r)} {f1(ry)} 0 0 0 {f1(cx - r * 0.1)} {f1(cy + ry)}'
                         f'A{f1(r * 0.55)} {f1(ry)} 0 0 1 {f1(cx - r * 0.1)} {f1(cy - ry)}Z')
    lay = doc.layer('Trees')
    lay.append(f'<path d="{"".join(out_s)}" fill="{shade_c}"/>')
    lay.append(f'<path d="{"".join(out_l)}" fill="{lit_c}"/>')

# ---------------------------------------------------------------------------
# fields, paddies, terraces
# ---------------------------------------------------------------------------
def fields(doc, G, H, L, P, rng, k=1.0, v_range=(-0.2, 0.55)):
    """A patchwork of parcels on the plain, aligned with the valley, with
    furrows in some and flooded paddies by the river."""
    ang = np.radians(-18)                               # parcel grid orientation, world
    ca, sa = np.cos(ang), np.sin(ang)
    lay = doc.layer('Fields')
    tones = [P['field'], P['fieldGreen'], P['fieldOchre'], P['fieldFallow'], P['fieldGreen']]
    paths = {t: [] for t in tones + [P['paddyWater'], P['paddyGreen2'], P['paddyFlood']]}
    furrows, bunds = [], []
    u_step, v_step = 0.018 * k, 0.011 * k               # parcel size — k scales it for zoom clips
    for u in np.arange(-0.3, 1.3, u_step):
        for v in np.arange(v_range[0], v_range[1], v_step):
            du = u_step * (0.75 + rng.random() * 0.5); dv = v_step * (0.7 + rng.random() * 0.6)
            corners_uv = [(u, v), (u + du, v), (u + du, v + dv), (u, v + dv)]
            pts = np.array([(uu * ca - vv * sa, uu * sa + vv * ca) for uu, vv in corners_uv])
            pts = pts + rng.normal(0, 0.0008 * k, pts.shape)
            cx, cy = pts.mean(0)
            if not (0.01 < cx < 0.99 and 0.01 < cy < 0.99):
                continue
            c = int(V.nearest(L['cls'], cx, cy))
            if c not in (LC.FIELD, LC.PADDY):
                continue
            inner = pts * 0.9 + np.array([cx, cy]) * 0.1          # a hairline gap between parcels
            z = V.sample(H, inner[:, 0], inner[:, 1]) + 1
            if not G.visible(inner[:, 0], inner[:, 1], z).all():
                continue
            sx, sy = V.project(inner[:, 0], inner[:, 1], z)
            d = 'M' + 'L'.join(f'{f1(a)} {f1(b)}' for a, b in zip(sx, sy)) + 'Z'
            if c == LC.PADDY:
                # a paddy: bright green crop, its flooded edge a thin pale line
                paths[[P['paddyWater'], P['paddyGreen2'], P['paddyFlood']][int(rng.integers(3))]].append(d)
                inner2 = inner * 0.78 + inner.mean(0) * 0.22
                z2 = V.sample(H, inner2[:, 0], inner2[:, 1]) + 1
                sx2, sy2 = V.project(inner2[:, 0], inner2[:, 1], z2)
                bunds.append('M' + 'L'.join(f'{f1(a)} {f1(b)}' for a, b in zip(sx2, sy2)) + 'Z')
            else:
                # neighbouring parcels tend to carry the same crop, so the plain
                # reads as blocks of land use rather than confetti
                blk = T.fbm(np.array([cx * 14]), np.array([cy * 14]), 3, seed=T.SEED + 903)[0]
                idx = int(np.clip((blk * 0.5 + 0.5) * len(tones), 0, len(tones) - 1))
                if rng.random() < 0.28:
                    idx = int(rng.integers(0, len(tones)))
                tone = tones[idx]
                paths[tone].append(d)
                if rng.random() < 0.45:                          # furrows along the long side
                    for t in np.linspace(0.2, 0.8, 4):
                        a = inner[0] + (inner[3] - inner[0]) * t; b = inner[1] + (inner[2] - inner[1]) * t
                        za, zb = V.sample(H, a[0], a[1]) + 1, V.sample(H, b[0], b[1]) + 1
                        (xa, ya), (xb, yb) = V.project(a[0], a[1], za), V.project(b[0], b[1], zb)
                        furrows.append(f'M{f1(xa)} {f1(ya)}L{f1(xb)} {f1(yb)}')
    for tone, ds in paths.items():
        if ds:
            lay.append(f'<path d="{"".join(ds)}" fill="{tone}"/>')
    if furrows:
        lay.append(f'<path d="{"".join(furrows)}" fill="none" stroke="{P["shade"]}" stroke-width="0.5" stroke-opacity="0.35"/>')
    if bunds:
        lay.append(f'<path d="{"".join(bunds)}" fill="none" stroke="{P["paddySheen"]}" stroke-width="0.5" stroke-opacity="0.55"/>')


def terraces(doc, G, H, L, P):
    """Terraces as their risers: closely spaced lines along the contour."""
    import render
    mask = L['cls'] == LC.TERRACE
    grow = K.box_blur(mask.astype(float), 1) > 0.2
    d = []
    for lv, seg in render.world_lines(H, np.arange(400, LC.FARM_TOP + 50, 34), grow):
        x, y = seg[:, 0], seg[:, 1]
        z = V.sample(H, x, y) + 2
        for run in render.visible_runs(G, x, y, z, 3):
            d.append(K.d_poly(run, False, 1.2))
    # each riser drawn twice: a shadow under the step and a lit edge on top of
    # it, so a terraced slope reads as stairs and not as contour lines
    lay = doc.layer('Terraces')
    dd = "".join(d)
    lay.append(f'<path d="{dd}" fill="none" stroke="{P["shade"]}" stroke-width="1.5" stroke-opacity="0.35" '
               f'transform="translate(0 1.6)"/>')
    lay.append(f'<path d="{dd}" fill="none" stroke="{P["terraceLine"]}" '
               f'stroke-width="0.7" stroke-opacity="0.75" stroke-linecap="round"/>')


# ---------------------------------------------------------------------------
# buildings: small boxes in the block's own axonometry
# ---------------------------------------------------------------------------
def box(x, y, w, dpt, h, roof, P, rot=0.0):
    """One building standing at screen (x, y): w along world x, dpt along world
    y, h tall (all px). roof: 'flat' | 'gable' | 'dome' | 'tower'."""
    ux, vy = axes()
    if rot:
        ux, vy = vy * 1.0, -ux * 1.0 if rot > 0 else ux
    p0 = np.array([x, y])
    a = p0 - ux * w / 2 - vy * dpt / 2        # south-west corner (nearest)
    b = a + ux * w                             # south-east
    c = b + vy * dpt                           # north-east
    d_ = a + vy * dpt                          # north-west
    up = np.array([0, -h])
    P_ = lambda q: f'{f1(q[0])} {f1(q[1])}'
    wall_lit, wall_shade, roof_c = P['wallLit'], P['wallShade'], P['roof']
    out = []
    # west wall (lit) and south wall (the side turned from the light)
    out.append(f'<path d="M{P_(a)}L{P_(d_)}L{P_(d_ + up)}L{P_(a + up)}Z" fill="{wall_lit}"/>')
    out.append(f'<path d="M{P_(a)}L{P_(b)}L{P_(b + up)}L{P_(a + up)}Z" fill="{wall_shade}"/>')
    if roof == 'gable':
        rh = h * 0.55
        m1 = (a + d_) / 2 + up + np.array([0, -rh]); m2 = (b + c) / 2 + up + np.array([0, -rh])
        out.append(f'<path d="M{P_(a + up)}L{P_(d_ + up)}L{P_(m1)}Z" fill="{wall_lit}"/>')
        out.append(f'<path d="M{P_(a + up)}L{P_(b + up)}L{P_(m2)}L{P_(m1)}Z" fill="{roof_c}"/>')
    elif roof == 'dome':
        cx, cy = ((a + c) / 2 + up)
        r = w * 0.42
        out.append(f'<path d="M{P_(a + up)}L{P_(b + up)}L{P_(c + up)}L{P_(d_ + up)}Z" fill="{P["roofFlat"]}"/>')
        out.append(f'<path d="M{f1(cx - r)} {f1(cy)}A{f1(r)} {f1(r)} 0 0 1 {f1(cx + r)} {f1(cy)}Z" fill="{P["dome"]}"/>')
    else:
        out.append(f'<path d="M{P_(a + up)}L{P_(b + up)}L{P_(c + up)}L{P_(d_ + up)}Z" fill="{P["roofFlat"]}"/>')
    # a hairline for the near vertical edge and the eaves
    out.append(f'<path d="M{P_(a)}L{P_(a + up)}M{P_(d_ + up)}L{P_(a + up)}L{P_(b + up)}" fill="none" '
               f'stroke="{P["shade"]}" stroke-width="0.45" stroke-opacity="0.8"/>')
    if h > 5 and roof != 'dome':                        # windows on the lit wall
        for t in (0.3, 0.7):
            q = a + (d_ - a) * t + up * 0.55
            out.append(f'<path d="M{P_(q)}l0 {f1(-1.1)}" stroke="{P["window"]}" stroke-width="0.9" stroke-opacity="0.9"/>')
    return ''.join(out)


def settlement(doc, G, H, L, P, rng, cx, cy, radius, n, kind, layer='Settlements', lanes=True, k=1.0, gap=(6, 4)):
    """A cluster of houses around (cx, cy). kind: 'town' | 'village' | 'hamlet'."""
    items = []
    tries = 0
    while len(items) < n and tries < n * 12:
        tries += 1
        r = radius * np.sqrt(rng.random()) * (1.0 if kind != 'town' else 1.15)
        a = rng.random() * 2 * np.pi
        x, y = cx + r * np.cos(a), cy + r * np.sin(a) * 0.75
        if not (0.005 < x < 0.995 and 0.005 < y < 0.995):
            continue
        c = int(V.nearest(L['cls'], x, y))
        if c in (LC.WATER, LC.GLACIER, LC.ROCK, LC.SNOW):
            continue
        if V.sample(L['slope'], x, y) > (26 if kind != 'town' else 14):
            continue
        z = V.sample(H, x, y)
        if not G.visible(x, y, z + 3):
            continue
        sx, sy = V.project(x, y, z)
        if any(abs(sx - q[0]) < gap[0] * k and abs(sy - q[1]) < gap[1] * k for q in items):
            continue
        items.append((sx, sy, r / radius))
    items.sort(key=lambda q: q[1])                      # back to front
    out = []
    for sx, sy, rr in items:
        if kind == 'town':
            core = rr < 0.45
            w_ = 7 + rng.random() * 6; d_ = 5 + rng.random() * 5
            h_ = (9 + rng.random() * 12) if core and rng.random() < 0.5 else (4 + rng.random() * 4)
            roof = 'flat' if rng.random() < 0.75 else 'gable'
        else:
            w_ = 5 + rng.random() * 3; d_ = 4 + rng.random() * 2.5; h_ = 3.5 + rng.random() * 2.5
            roof = 'flat' if rng.random() < 0.6 else 'gable'
        roofs = [P['roof'], P.get('metalRoof', P['roof']), P['roofFlat'], '#A08C5B']
        Pb = dict(P, roof=roofs[int(rng.integers(len(roofs)))])     # mixed roofing: tile, sheet metal, flat, thatch
        out.append(box(sx, sy, w_ * k, d_ * k, h_ * k, roof, Pb))
    doc.layer(layer).append(''.join(out))
    return items


# ---------------------------------------------------------------------------
# routes across the terrain
# ---------------------------------------------------------------------------
def cost_grid(H, L, kind, n=170):
    """Cost of crossing each cell of a coarse grid. kind: 'road' | 'trail'."""
    xs = np.linspace(0, 1, n)
    X, Y = np.meshgrid(xs, xs)
    sl = V.sample(L['slope'], X, Y)
    c = V.nearest(L['cls'], X, Y)
    if kind == 'road':
        cost = 1 + (sl / 7.0) ** 2
        cost[np.isin(c, [LC.GLACIER, LC.SNOW, LC.ROCK])] = 400
        cost[c == LC.WATER] = 80
    else:
        cost = 1 + (sl / 16.0) ** 2
        cost[c == LC.WATER] = 60
        cost[np.isin(c, [LC.ROCK])] += 3
        cost[np.isin(c, [LC.GLACIER, LC.SNOW])] += 2
    return cost


def route(cost, a, b):
    """Least-cost path between two world points on the cost grid (Dijkstra)."""
    import heapq
    n = cost.shape[0]
    to = lambda p: (int(round(p[1] * (n - 1))), int(round(p[0] * (n - 1))))
    s, t = to(a), to(b)
    dist = np.full(cost.shape, np.inf); dist[s] = 0
    prev = {}
    pq = [(0.0, s)]
    nb = [(-1, -1, 1.414), (-1, 0, 1), (-1, 1, 1.414), (0, -1, 1), (0, 1, 1), (1, -1, 1.414), (1, 0, 1), (1, 1, 1.414)]
    while pq:
        d, u = heapq.heappop(pq)
        if u == t:
            break
        if d > dist[u]:
            continue
        for dj, di, ln in nb:
            v = (u[0] + dj, u[1] + di)
            if 0 <= v[0] < n and 0 <= v[1] < n:
                nd = d + ln * 0.5 * (cost[u] + cost[v])
                if nd < dist[v]:
                    dist[v] = nd; prev[v] = u; heapq.heappush(pq, (nd, v))
    path = [t]
    while path[-1] != s and path[-1] in prev:
        path.append(prev[path[-1]])
    path = path[::-1]
    pts = np.array([(i / (n - 1), j / (n - 1)) for j, i in path])
    # soften the grid steps
    if len(pts) > 5:
        k = np.ones(5) / 5
        sm = np.stack([np.convolve(np.pad(pts[:, 0], 2, mode='edge'), k, 'valid'),
                       np.convolve(np.pad(pts[:, 1], 2, mode='edge'), k, 'valid')], 1)
        sm[0], sm[-1] = pts[0], pts[-1]
        pts = sm
    return pts


def densify(pts, step=0.0015):
    out = [pts[0]]
    for a, b in zip(pts[:-1], pts[1:]):
        n = max(1, int(np.hypot(*(b - a)) / step))
        for t in np.linspace(0, 1, n + 1)[1:]:
            out.append(a + (b - a) * t)
    return np.array(out)


def draped(G, H, pts, lift=3.0):
    import render
    pts = densify(pts)
    x, y = pts[:, 0], pts[:, 1]
    z = V.sample(H, x, y) + lift
    return render.visible_runs(G, x, y, z, 2)
