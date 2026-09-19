"""
The block diagram's camera: a parallel (axonometric) view of the world square,
turned so its south-west corner points at the reader, as in a textbook block
diagram. Parallel projection keeps every symbol the same size wherever it
stands, which is what block diagrams do.

Hidden surfaces are resolved with a floating horizon, column by column: for
each screen column the terrain is sampled from the front of the block to the
back, and a sample is visible only if it rises above everything in front of
it. The same horizon answers "is this point visible?" for all the linework
and symbols, so they can be kept in their own editable layers and still be
hidden correctly behind ridges.
"""
import numpy as np

# --- the camera — adjust the view here ---------------------------------------
W, H_PX = 2400, 1600          # canvas, px
THETA = np.radians(30)        # turn of the block: 0 = square-on, 45 = diamond
PHI = np.radians(26)          # elevation of the eye above the horizon
SCALE = 1330.0                # px per world unit (the block is 1 x 1)
ZK = 0.086                    # px per metre at SCALE 1330 — the vertical exaggeration; fit() keeps the ratio
ZBASE = -900.0                # depth of the block's floor, metres
ORIGIN_X = 150 + 0.5 * SCALE  # screen x of the south-west corner
ORIGIN_Y = 1395.0             # screen y of the south-west corner at sea level
ND = 1700                     # depth samples per column


def fit(H, margin=(70, 70, 470, 120)):
    """Scale and place the block so the whole diagram — terrain, faces and
    floor — sits inside the canvas with the given margins (l, t, r, b)."""
    global SCALE, ZK, ORIGIN_X, ORIGIN_Y
    n = H.shape[0]
    xs = np.linspace(0, 1, n)
    X, Y = np.meshgrid(xs, xs)
    SCALE, ZK, ORIGIN_X, ORIGIN_Y = 1.0, ZK / SCALE, 0.0, 0.0
    sx, sy = project(X, Y, H)
    cx = np.array([0, 1, 1, 0]); cy = np.array([0, 0, 1, 1])
    bx, by = project(cx, cy, np.full(4, ZBASE))
    x0 = min(sx.min(), bx.min()); x1 = max(sx.max(), bx.max())
    y0 = min(sy.min(), by.min()); y1 = max(sy.max(), by.max())
    l, t, r, b = margin
    s = min((W - l - r) / (x1 - x0), (H_PX - t - b) / (y1 - y0))
    SCALE, ZK = s, ZK * s
    ORIGIN_X = l + (W - l - r - s * (x1 - x0)) / 2 - s * x0
    ORIGIN_Y = t + (H_PX - t - b - s * (y1 - y0)) / 2 - s * y0


def to_view(x, y):
    a = x * np.cos(THETA) - y * np.sin(THETA)
    d = x * np.sin(THETA) + y * np.cos(THETA)
    return a, d


def project(x, y, z):
    a, d = to_view(np.asarray(x, float), np.asarray(y, float))
    sx = ORIGIN_X + a * SCALE
    sy = ORIGIN_Y - d * np.sin(PHI) * SCALE - np.asarray(z, float) * ZK
    return sx, sy


def sample(F, x, y):
    """Bilinear sample of a world-grid field at world coordinates (0..1)."""
    n = F.shape[0]
    fx = np.clip(np.asarray(x) * (n - 1), 0, n - 1.0001)
    fy = np.clip(np.asarray(y) * (n - 1), 0, n - 1.0001)
    i0 = np.floor(fx).astype(int); j0 = np.floor(fy).astype(int)
    tx = fx - i0; ty = fy - j0
    f00 = F[j0, i0]; f10 = F[j0, i0 + 1]; f01 = F[j0 + 1, i0]; f11 = F[j0 + 1, i0 + 1]
    return (f00 * (1 - tx) + f10 * tx) * (1 - ty) + (f01 * (1 - tx) + f11 * tx) * ty


def nearest(F, x, y):
    n = F.shape[0]
    i = np.clip(np.rint(np.asarray(x) * (n - 1)).astype(int), 0, n - 1)
    j = np.clip(np.rint(np.asarray(y) * (n - 1)).astype(int), 0, n - 1)
    return F[j, i]


class GBuffer:
    """For every screen pixel: which ground point is seen there (if any)."""

    def __init__(self, H, w=W, h=H_PX, window=None):
        self.w, self.h = w, h
        cols = np.arange(w) + 0.5
        a = (cols - ORIGIN_X) / SCALE
        dmax = np.sin(THETA) + np.cos(THETA)
        d = np.linspace(0, dmax, ND)
        A, D = np.meshgrid(a, d, indexing='ij')                 # (w, ND)
        x = A * np.cos(THETA) + D * np.sin(THETA)
        y = -A * np.sin(THETA) + D * np.cos(THETA)
        inside = (x >= 0) & (x <= 1) & (y >= 0) & (y <= 1)
        z = sample(H, np.clip(x, 0, 1), np.clip(y, 0, 1))
        sy = ORIGIN_Y - D * np.sin(PHI) * SCALE - z * ZK
        sy = np.where(inside, sy, np.inf)
        self.hmin = np.minimum.accumulate(sy, axis=1)           # the horizon, front to back
        self.x, self.y, self.z, self.sy, self.inside, self.d = x, y, z, sy, inside, d
        # the front edge of each column: below it lies the cut face, not the ground
        first = np.where(inside.any(1), inside.argmax(1), ND - 1)
        self.front = sy[np.arange(w), first]

        rows = np.arange(h) + 0.5
        idx = np.empty((w, h), dtype=np.int64)
        for c in range(w):
            idx[c] = np.searchsorted(-self.hmin[c], -rows, side='left')
        covered = (idx < ND) & (rows[None, :] <= self.front[:, None] + 0.5)
        idx = np.clip(idx, 0, ND - 1)
        cc = np.arange(w)[:, None]
        self.px = np.where(covered, x[cc, idx], np.nan).T        # (h, w)
        self.py = np.where(covered, y[cc, idx], np.nan).T
        self.pz = np.where(covered, z[cc, idx], np.nan).T
        self.mask = covered.T

    def visible(self, x, y, z, tol=0.8):
        """Is a point on (or just above) the ground visible from the camera?"""
        x = np.asarray(x, float); y = np.asarray(y, float); z = np.asarray(z, float)
        sx, sy = project(x, y, z)
        c = np.clip(np.floor(sx).astype(int), 0, self.w - 1)
        _, d = to_view(x, y)
        k = np.clip(np.searchsorted(self.d, d) - 1, 0, ND - 1)   # the sample just in front
        front_h = np.where(k > 0, self.hmin[c, np.maximum(k - 1, 0)], np.inf)
        return sy <= front_h + tol
