"""
How much of each clip is cut face rather than ground — measured from the
geometry alone, without drawing, so a framing can be judged in a fraction of a
second instead of a minute's render.

    python3 framing.py                 every clip with the current tables
    python3 framing.py sweep 17        candidate framings for ROUTE station 17

The share is the area of the two visible cut faces over the area of the whole
block on screen. On this camera a flat window comes out near 11 %; the clips
that read as "ground first" sit around 13-22 %.
"""
import sys
import numpy as np
import zoom as Z
import view as V
import clip as CL
import story as ST

_H = {}


def ground(x0, y0, size):
    k = (round(x0, 4), round(y0, 4), round(size, 4))
    if k not in _H:
        w, L = Z.world()
        _H[k] = CL.window(w, L, x0, y0, size)[0]['H']
    return _H[k]


def _ground_px(H, ncol=360, nd=700):
    """Screen area of the visible ground: skyline to front edge, column by column."""
    cols = np.linspace(0, V.W, ncol)
    a = (cols - V.ORIGIN_X) / V.SCALE
    d = np.linspace(0, np.sin(V.THETA) + np.cos(V.THETA), nd)
    A, D = np.meshgrid(a, d, indexing='ij')
    x = A * np.cos(V.THETA) + D * np.sin(V.THETA)
    y = -A * np.sin(V.THETA) + D * np.cos(V.THETA)
    inside = (x >= 0) & (x <= 1) & (y >= 0) & (y <= 1)
    z = V.sample(H, np.clip(x, 0, 1), np.clip(y, 0, 1))
    sy = np.where(inside, V.ORIGIN_Y - D * np.sin(V.PHI) * V.SCALE - z * V.ZK, np.inf)
    ok = inside.any(1)
    front = sy[np.arange(ncol), inside.argmax(1)]
    top = np.where(ok, sy.min(1), 0)
    return float(np.sum(np.where(ok, front - top, 0)) * V.W / (ncol - 1))


def face_share(st, size, ax, ay, ve, skirt=Z.SKIRT):
    """Mirrors base_block's fitting, then measures instead of drawing."""
    x0 = float(np.clip(st[1] - ax * size, 0, 1 - size))
    y0 = float(np.clip(st[2] - ay * size, 0, 1 - size))
    H = ground(x0, y0, size)
    V.W, V.H_PX = Z.CANVAS
    V.SCALE = 1330.0
    V.ZK = 0.086 / (1.8 / ve) / size
    lo = float(min(H[0, :].min(), H[:, 0].min()))
    V.ZBASE = lo - 0.04 * float(H.max() - H.min())
    V.fit(H, margin=Z.MARGIN)
    V.ZBASE = lo - skirt / V.ZK
    V.fit(H, margin=Z.MARGIN)
    n = H.shape[0]
    s = np.linspace(0, 1, n)
    face = 0.0
    for zt, xx, yy in ((H[0, :], s, np.zeros(n)), (H[:, 0], np.zeros(n), s)):
        tx, ty = V.project(xx, yy, zt)
        bx, by = V.project(xx, yy, np.full(n, V.ZBASE))
        px, py = np.concatenate([tx, bx[::-1]]), np.concatenate([ty, by[::-1]])
        face += 0.5 * abs(np.dot(px, np.roll(py, 1)) - np.dot(py, np.roll(px, 1)))
    return face / (face + _ground_px(H))


def rise(st, size, ax, ay):
    """Metres the back third stands above the front: positive climbs away."""
    x0 = float(np.clip(st[1] - ax * size, 0, 1 - size))
    y0 = float(np.clip(st[2] - ay * size, 0, 1 - size))
    H = ground(x0, y0, size)
    s = np.linspace(0, 1, H.shape[0])
    X, Y = np.meshgrid(s, s)
    d = X * np.sin(V.THETA) + Y * np.cos(V.THETA)
    return float(H[d > 0.9].mean() - H[d < 0.45].mean())


def current(num):
    a = Z.ANCHOR.get(num, 0.5)
    ax, ay = a if isinstance(a, tuple) else (a, a)
    return Z.CLIP_SIZE.get(num, 0.065), ax, ay, Z.VE_BY.get(num, Z.CLIP_VE)


if __name__ == '__main__':
    if len(sys.argv) > 2 and sys.argv[1] == 'sweep':
        st = ST.STATIONS[int(sys.argv[2]) - 1]
        rows = []
        for size in (0.055, 0.065, 0.075, 0.085):
            for ax in (0.15, 0.3, 0.45, 0.6, 0.75, 0.9):
                for ay in (0.15, 0.3, 0.45, 0.6, 0.75, 0.9):
                    for ve in (0.75, 0.6):
                        rows.append((face_share(st, size, ax, ay, ve), rise(st, size, ax, ay), size, ax, ay, ve))
            _H.clear()
        print('face%   rise m   size   anchor        ve')
        for f, r, size, ax, ay, ve in sorted(rows)[:15]:
            print(f'{100 * f:5.1f}  {r:+7.0f}   {size:.3f}  ({ax:.2f}, {ay:.2f})  {ve:.2f}')
        raise SystemExit(0)
    print('route story  face%   size   anchor        ve')
    for r in range(1, 26):
        num = ST.STATIONS[r - 1][0]
        if num in Z.BESPOKE:
            continue
        size, ax, ay, ve = current(num)
        f = face_share(ST.STATIONS[r - 1], size, ax, ay, ve)
        print(f'{r:5d} {num:5d}  {100 * f:5.1f}  {size:.3f}  ({ax:.2f}, {ay:.2f})  {ve:.2f}', flush=True)
