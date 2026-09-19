"""
Zoom clips: a small block cut out of the same landscape and drawn as its own
block diagram, several times larger, with detail the overview cannot hold.

A clip is a window of the world square (x0, y0, size). Its ground is the
world's ground resampled at a finer step, with a little extra relief added
at the scale the overview could not resolve; its land cover is the world's,
refined at the new resolution. The clip then becomes its own unit square, so
the same camera, tracing and symbol code draws it.
"""
import numpy as np
import terrain as T
import landcover as LC

# the clips — (world x0, y0, size) of the window. Adjust framing here.
CLIPS = {
    'agriculture': dict(x0=0.62, y0=0.00, size=0.25, title='Agriculture & food systems'),
    'urban':       dict(x0=0.39, y0=0.00, size=0.22, title='Urbanisation & infrastructure'),
}


def cubic(F, x, y):
    """Catmull-Rom sample of a world field at world coordinates — smooth enough
    that enlarging the overview's ground does not show its grid."""
    n = F.shape[0]
    fx = np.clip(x * (n - 1), 1, n - 3.0001); fy = np.clip(y * (n - 1), 1, n - 3.0001)
    i = np.floor(fx).astype(int); j = np.floor(fy).astype(int)
    tx = fx - i; ty = fy - j

    def w(t):
        return [((-t + 2) * t - 1) * t / 2, (((3 * t - 5) * t) * t + 2) / 2,
                ((-3 * t + 4) * t + 1) * t / 2, ((t - 1) * t * t) / 2]
    wx, wy = w(tx), w(ty)
    out = np.zeros_like(x, dtype=float)
    for a in range(4):
        row = np.zeros_like(out)
        for b in range(4):
            row += wx[b] * F[np.clip(j - 1 + a, 0, n - 1), np.clip(i - 1 + b, 0, n - 1)]
        out += wy[a] * row
    return out


def window(w, L, x0, y0, size, n=520, seed=T.SEED):
    """The world inside a window, as a new unit-square world."""
    xs = np.linspace(0, 1, n)
    U, Vv = np.meshgrid(xs, xs)
    X, Y = x0 + U * size, y0 + Vv * size
    H = cubic(w['H'], X, Y)
    # relief the overview could not resolve: small hummocks and rills,
    # stronger on slopes than on the plain
    slope = cubic(L['slope'], X, Y)
    fine = T.fbm(X * 180, Y * 180, 3, seed=seed + 77) * (12 + 55 * np.clip(slope / 30, 0, 1))
    H = H + fine
    # land cover: the world's classes at the window's finer step, lightly
    # smoothed so their edges are not the overview's grid
    ni = w['H'].shape[0]
    ci = np.clip(np.rint(X * (ni - 1)).astype(int), 0, ni - 1)
    cj = np.clip(np.rint(Y * (ni - 1)).astype(int), 0, ni - 1)
    cls = L['cls'][cj, ci]
    keep = np.isin(cls, [LC.WATER, LC.TOWN])
    order = list(range(len(LC.NAMES)))
    stack = np.stack([T.blur((cls == k).astype(float), 2) for k in order])
    cls = np.where(keep, cls, np.array(order, dtype=np.int8)[stack.argmax(0)])
    lakes = []
    for (lk, lvl, kind) in w['lakes']:
        lakes.append((lk[cj, ci], lvl, kind))
    Lc = dict(cls=cls, slope=cubic(L['slope'], X, Y), acc=cubic(L['acc'], X, Y),
              glacier_t=cubic(L['glacier_t'], X, Y), glacier_d=cubic(L['glacier_d'], X, Y) / size,
              river_t=cubic(L['river_t'], X, Y), river_d=cubic(L['river_d'], X, Y) / size)
    wc = dict(X=U, Y=Vv, H=H, lakes=lakes, frame=(x0, y0, size))
    return wc, Lc


def to_local(pts, frame):
    x0, y0, size = frame
    p = np.asarray(pts, float)
    return np.stack([(p[..., 0] - x0) / size, (p[..., 1] - y0) / size], -1)
