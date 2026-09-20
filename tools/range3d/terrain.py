"""
MRI 25 — the mountain range, as a heightfield.

The world is a unit square: x runs west to east, y runs from the front of the
block (south, the lowlands) to the back (north, the high range). Heights are
in metres above sea level. Everything that belongs to the ground — height,
rivers, lakes, glaciers, land cover — is computed here on one world grid, so
the block diagram, the linework and the close-ups all read the same terrain.

Only numpy is needed.
"""
import numpy as np

N = 512                     # world grid resolution (N x N)
SEED = 25                   # change for a different range with the same layout


# ---------------------------------------------------------------------------
# noise
# ---------------------------------------------------------------------------
def _perm(seed):
    rng = np.random.default_rng(seed)
    p = rng.permutation(256)
    ang = rng.random(256) * 2 * np.pi
    return np.concatenate([p, p]), np.cos(ang), np.sin(ang)


def perlin(x, y, seed=0):
    """2-D gradient noise, roughly in [-0.7, 0.7]."""
    perm, gx, gy = _perm(seed)
    x0 = np.floor(x); y0 = np.floor(y)
    xf = x - x0; yf = y - y0
    xi = x0.astype(np.int64) & 255; yi = y0.astype(np.int64) & 255
    fade = lambda t: t * t * t * (t * (t * 6 - 15) + 10)
    u, v = fade(xf), fade(yf)

    def g(ix, iy, dx, dy):
        h = perm[perm[ix] + iy]
        return gx[h] * dx + gy[h] * dy

    n00 = g(xi, yi, xf, yf)
    n10 = g((xi + 1) & 255, yi, xf - 1, yf)
    n01 = g(xi, (yi + 1) & 255, xf, yf - 1)
    n11 = g((xi + 1) & 255, (yi + 1) & 255, xf - 1, yf - 1)
    nx0 = n00 + u * (n10 - n00)
    nx1 = n01 + u * (n11 - n01)
    return nx0 + v * (nx1 - nx0)


def fbm(x, y, octaves=5, lac=2.0, gain=0.5, seed=0):
    amp, freq, tot, norm = 1.0, 1.0, 0.0, 0.0
    for o in range(octaves):
        tot = tot + amp * perlin(x * freq, y * freq, seed + o * 17)
        norm += amp
        amp *= gain; freq *= lac
    return tot / norm


def ridged(x, y, octaves=6, lac=2.05, gain=0.52, seed=0):
    """Ridged multifractal: sharp crests, the texture of alpine ranges."""
    tot = np.zeros_like(x); amp = 1.0; freq = 1.0; w = np.ones_like(x); norm = 0.0
    for o in range(octaves):
        n = 1.0 - np.abs(perlin(x * freq, y * freq, seed + 101 + o * 13) * 1.4)
        n = n * n
        n = n * w
        w = np.clip(n * 1.6, 0, 1)
        tot = tot + n * amp
        norm += amp
        amp *= gain; freq *= lac
    return tot / norm


def smoothstep(a, b, t):
    t = np.clip((t - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def blur(f, r):
    """Separable box blur, applied three times (≈ gaussian). r in cells."""
    if r < 1:
        return f
    out = f.copy()
    for _ in range(3):
        for ax in (0, 1):
            c = np.cumsum(np.pad(out, [(r + 1, r) if a == ax else (0, 0) for a in (0, 1)], mode='edge'), axis=ax)
            if ax == 0:
                out = (c[2 * r + 1:, :] - c[:-2 * r - 1, :]) / (2 * r + 1)
            else:
                out = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return out


# ---------------------------------------------------------------------------
# the layout of the range — adjust the landscape here
# ---------------------------------------------------------------------------
# peaks: (x, y, height m, radius, sharpness). The central peak is the highest
# and the most isolated; the others join it by ridges.
PEAKS = [
    (0.70, 0.80, 6300, 0.31, 1.00),   # the central peak: on the view's diagonal, screen centre
    (0.24, 0.84, 4800, 0.24, 1.00),   # western massif
    (0.93, 0.47, 5000, 0.24, 1.00),   # eastern massif
    (0.44, 0.97, 4300, 0.20, 1.00),   # back, north
    (0.95, 0.96, 3500, 0.20, 1.00),   # back, north-east (the far corner) — kept low: far ground rises on screen
    (0.02, 0.86, 4800, 0.20, 1.00),   # north-west massif, sliced by the west face
    (0.59, 0.86, 5500, 0.16, 1.00),   # fore-summit west of the central peak
    (0.79, 0.70, 5300, 0.16, 1.00),   # fore-summit south-east of it
    (0.03, 0.56, 3300, 0.20, 0.85),   # western shoulder, cut by the west face
    (0.30, 0.47, 2700, 0.13, 0.95),   # western foothills
    (0.84, 0.27, 2300, 0.13, 0.95),   # eastern foothills
    (0.47, 0.25, 1350, 0.08, 0.90),   # the hill in front (viewpoint, monastery)
]
# ridges between peaks: (peak a, peak b, saddle height as a share of the lower peak)
RIDGES = [(0, 1, 0.84), (0, 3, 0.90), (0, 4, 0.90), (0, 2, 0.86), (3, 1, 0.90),
          (4, 2, 0.90), (1, 5, 0.90), (0, 6, 0.93), (0, 7, 0.93),
          (5, 8, 0.78), (1, 9, 0.74), (2, 10, 0.74)]

# valley centrelines, upstream to downstream
# the main glacier comes off the central peak's south-west face, toward the reader
MAIN_GLACIER = [(0.60, 0.845), (0.555, 0.73), (0.50, 0.625), (0.455, 0.535)]
MAIN_RIVER = [(0.455, 0.535), (0.42, 0.45), (0.38, 0.37), (0.36, 0.29), (0.40, 0.21),
              (0.50, 0.155), (0.60, 0.12), (0.67, 0.07), (0.72, 0.00)]
EAST_VALLEY = [(0.86, 0.64), (0.83, 0.55), (0.79, 0.46), (0.75, 0.37), (0.71, 0.26),
               (0.67, 0.16), (0.63, 0.105)]
WEST_TRIB = [(0.22, 0.72), (0.22, 0.60), (0.26, 0.48), (0.33, 0.36), (0.365, 0.31)]

# small glaciers hanging in the high cirques of the other peaks: (centreline, width)
SMALL_GLACIERS = [
    ([(0.40, 0.935), (0.41, 0.88), (0.42, 0.84)], 0.028),     # below the north peak
    ([(0.05, 0.84), (0.09, 0.80), (0.12, 0.77)], 0.030),      # the north-west massif's cirque
    ([(0.925, 0.925), (0.89, 0.865), (0.865, 0.815)], 0.030),    # below the north-east peak
    ([(0.245, 0.815), (0.262, 0.760), (0.272, 0.715)], 0.028),   # the western massif's face
    ([(0.06, 0.905), (0.085, 0.855), (0.10, 0.815)], 0.024),     # north-west
    ([(0.745, 0.765), (0.785, 0.715), (0.815, 0.675)], 0.026),   # the central peak's east flank
    ([(0.895, 0.505), (0.865, 0.495), (0.84, 0.49)], 0.022),     # the eastern massif
]

PROGLACIAL_LAKE = (0.44, 0.505, 0.045, 0.030)        # centre, radii (x, y)
RESERVOIR = (0.795, 0.485, 0.030, 0.050)
LOWLAND_Y = 0.27            # the plain lies in front of this line


def _polyline_dist(X, Y, pts):
    """Distance from every grid point to a polyline, and the position along it (0..1)."""
    pts = np.asarray(pts, float)
    best = np.full(X.shape, np.inf); along = np.zeros(X.shape)
    seglen = np.hypot(*(pts[1:] - pts[:-1]).T); total = seglen.sum(); acc = 0.0
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        d = b - a; L2 = (d ** 2).sum()
        t = np.clip(((X - a[0]) * d[0] + (Y - a[1]) * d[1]) / L2, 0, 1)
        px, py = a[0] + t * d[0], a[1] + t * d[1]
        dist = np.hypot(X - px, Y - py)
        m = dist < best
        best[m] = dist[m]; along[m] = (acc + t[m] * seglen[i]) / total
        acc += seglen[i]
    return best, along


def build(seed=SEED, n=N):
    xs = np.linspace(0, 1, n)
    X, Y = np.meshgrid(xs, xs)          # Y[j, i]: row j = north-south, col i = west-east

    # --- the mountain mass: peaks joined by ridges, combined by a soft maximum
    parts = []
    rng = np.random.default_rng(seed + 7)
    for k_, (px, py, h, r, s) in enumerate(PEAKS):
        # a faceted pyramid: the distance to the summit is measured against
        # 3–5 face normals, so the flanks are planar faces meeting in straight
        # aretes — the silhouette of a horn rather than a cone
        nf = 3 + (k_ % 3)
        rot = rng.random() * 2 * np.pi
        dx, dy = X - px, Y - py
        dpyr = np.full(X.shape, -np.inf)
        for f in range(nf):
            a_ = rot + f * 2 * np.pi / nf + rng.normal(0, 0.18)
            w_ = 1 + rng.normal(0, 0.12)                     # faces of unequal steepness
            dpyr = np.maximum(dpyr, (dx * np.cos(a_) + dy * np.sin(a_)) * w_)
        dpyr = dpyr / (r * np.cos(np.pi / nf))
        dround = np.hypot(dx, dy) / (r * 1.25)
        d = np.maximum(dpyr, 0.55 * dpyr + 0.45 * dround)     # faces up top, rounder toes
        parts.append(h * np.clip(1 - d, 0, 1) ** s)
    for a, b, share in RIDGES:
        (ax, ay, ah, ar, _), (bx, by, bh, br, _) = PEAKS[a], PEAKS[b]
        dist, t = _polyline_dist(X, Y, [(ax, ay), (bx, by)])
        crest = ah + (bh - ah) * t
        sag = 1 - (1 - share) * np.sin(np.pi * t) ** 0.8          # the saddle dips mid-way
        width = 0.075 + 0.04 * np.sin(np.pi * t)
        parts.append(crest * sag * np.clip(1 - dist / width, 0, 1) ** 1.2)
    P = np.stack(parts)
    k = 1 / 900.0                                                  # softness of the maximum
    mass = np.log(np.exp((P - P.max(0)) / (1 / k)).sum(0)) / k + P.max(0)
    mass = np.maximum(mass, 0)

    # --- alpine texture: ridged noise, stronger with height; domain-warped so
    #     crests are not aligned with the grid
    wx = X + 0.035 * fbm(X * 3, Y * 3, 3, seed=seed + 3)
    wy = Y + 0.035 * fbm(X * 3 + 5.2, Y * 3 + 1.3, 3, seed=seed + 4)
    rid = ridged(wx * 4.3, wy * 4.3, 7, seed=seed)
    lo_, hi_ = np.percentile(rid, 5), np.percentile(rid, 97)
    rid = np.clip((rid - lo_) / (hi_ - lo_), 0, 1)
    hi = smoothstep(900, 5200, mass)
    # crests are cut into the mass: the texture can only lower the ground, so
    # no peak grows past its designed height
    # summits are protected from the texture, so each peak keeps its
    # designed height and the central one stays the highest
    protect = np.zeros_like(X)
    for (px, py, h, r, _) in PEAKS:
        protect = np.maximum(protect, np.exp(-(np.hypot(X - px, Y - py) / (0.22 * r)) ** 2))
    # the texture cuts a fixed depth in metres (not a share of the height),
    # so it can carve crests and couloirs without hollowing out a massif
    relief = mass - 820 * (1 - rid) * smoothstep(400, 3200, mass) * (1 - 0.8 * protect)
    # gentle rolling hills everywhere, the plain almost flat
    rolling = 260 * fbm(X * 7, Y * 7, 4, seed=seed + 9)
    base = 260 + 380 * smoothstep(0.18, 0.55, Y) + rolling * (0.3 + 0.7 * smoothstep(0.15, 0.4, Y))
    H = np.maximum(relief, 0) + base

    # --- carve the valleys. Each valley is cut down to a designed floor that
    #     always descends downstream (floor at the head -> floor at the mouth),
    #     with walls rising away from the centreline: U for glacial troughs,
    #     V for rivers. A soft minimum blends the cut into the slopes.
    def carve(pts, width, head, mouth, shape, curve=1.3):
        nonlocal H
        dist, t = _polyline_dist(X, Y, pts)
        w = width * (1 + 0.22 * fbm(X * 9, Y * 9, 2, seed=seed + 21))
        floor = mouth + (head - mouth) * (1 - t) ** curve
        u = dist / w
        wall = 3200 * (u ** 2 if shape == 'U' else u ** 1.15)
        V_ = floor + wall
        k = 180.0
        H = -k * np.log(np.exp(-H / k) + np.exp(-V_ / k))          # soft minimum

    # the zonation this implies: glacier snout and proglacial lake near 2,900 m,
    # treeline a little below, farmland and the town on the plain
    carve(MAIN_GLACIER, 0.09, 4700, 2950, 'U', 1.1)
    carve(MAIN_RIVER, 0.085, 2880, 250, 'V', 1.9)
    carve(EAST_VALLEY, 0.08, 3300, 330, 'V', 1.7)
    carve(WEST_TRIB, 0.06, 3300, 1150, 'V', 1.5)

    # --- drainage: a few passes of stream-power erosion cut dendritic valleys
    #     into the slopes, so spurs and gullies read as a real drainage net
    edge = smoothstep(0.0, 0.035, np.minimum(np.minimum(X, 1 - X), np.minimum(Y, 1 - Y)))
    for _ in range(3):
        acc, _, _ = flow(H)
        cut = np.sqrt(acc) * 17.0 * smoothstep(700, 3200, H) * edge
        H = H - np.minimum(cut, 380)
        H = 0.75 * H + 0.25 * blur(H, 2)

    # --- the lowland: flatten the front of the block toward a floodplain
    plain = 1 - smoothstep(LOWLAND_Y - 0.12, LOWLAND_Y + 0.05, Y)
    H = H * (1 - 0.85 * plain) + (230 + 110 * fbm(X * 5, Y * 5, 3, seed=seed + 31)) * 0.85 * plain

    # --- smooth numerical grit, keep the crests
    H = 0.65 * H + 0.35 * blur(H, 1)

    # --- heights: the central summit is 6,400 m; the plain keeps its level
    top = 6400.0                                  # adjust the summit height here
    lo = np.percentile(H, 2)
    H = lo + (H - lo) * (top - lo) / (H.max() - lo)

    # --- lakes: flat water surfaces set a little below their banks
    def lake(c, level_drop=12):
        """Flood the valley floor from the lake's centre up to a level set by its
        banks, so the water takes the shape of the ground it fills."""
        cx, cy, rx, ry = c
        d = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2
        rim = H[(d > 0.9) & (d < 1.6)]
        level = np.percentile(rim, 18) - level_drop
        allowed = (H < level) & (d < 3.0)
        seed = (d < 0.05) & allowed
        if not seed.any():
            seed = (d == d.min())
        inside = seed.copy()
        for _ in range(400):                              # grow through connected low ground
            g = inside.copy()
            g[1:] |= inside[:-1]; g[:-1] |= inside[1:]; g[:, 1:] |= inside[:, :-1]; g[:, :-1] |= inside[:, 1:]
            g &= allowed
            if (g == inside).all():
                break
            inside = g
        H[inside] = level
        return inside, level

    lake1, lvl1 = lake(PROGLACIAL_LAKE)
    lake2, lvl2 = lake(RESERVOIR)

    return dict(X=X, Y=Y, H=H, lakes=[(lake1, lvl1, 'proglacial'), (lake2, lvl2, 'reservoir')])


def slope_aspect(H, n=N, span_m=60000.0):
    """Slope (degrees, at true scale) and aspect. span_m: the block's width on the ground."""
    dx = span_m / (n - 1)
    gy, gx = np.gradient(H, dx)
    slope = np.degrees(np.arctan(np.hypot(gx, gy)))
    return slope, gx, gy


def flow(H, iters=None):
    """D8 flow accumulation (steepest descent), for streams and drainage."""
    n = H.shape[0]
    Hp = np.pad(H, 1, mode='edge')
    offs = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
    drops = np.stack([(H - Hp[1 + dj:1 + dj + n, 1 + di:1 + di + n]) / np.hypot(dj, di) for dj, di in offs])
    best = drops.argmax(0)
    has = drops.max(0) > 0
    order = np.argsort(-H, axis=None)              # highest first
    acc = np.ones(n * n)
    dj = np.array([o[0] for o in offs]); di = np.array([o[1] for o in offs])
    jj, ii = np.unravel_index(order, H.shape)
    tj = np.clip(jj + dj[best.ravel()[order]], 0, n - 1)
    ti = np.clip(ii + di[best.ravel()[order]], 0, n - 1)
    target = tj * n + ti
    hv = has.ravel()[order]
    for k in range(len(order)):                    # one pass, highest to lowest
        if hv[k]:
            acc[target[k]] += acc[order[k]]
    return acc.reshape(n, n), best, has
