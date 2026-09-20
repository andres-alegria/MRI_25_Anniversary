"""
What people have built and do on the range — roads, the dam and its power
line, the mine, the monastery, the observatory, herders and their animals —
and the story route: 25 stations placed where each story happens, joined by a
trail that crosses the whole mountain system (plain, side valleys, forest,
glacier, high ridge) instead of climbing a single line.
"""
import numpy as np
import terrain as T
import view as V
import landcover as LC
import svgkit as K
import features as F

f1 = K.f1

# --- the stations — (editorial story number, x, y, what stands there) --------
# listed in route order: the trail visits them in this sequence. Adjust here.
STATIONS = [
    (16, 0.495, 0.095, 'town'),               # Urbanisation & infrastructure
    (10, 0.700, 0.100, 'paddies'),            # Agriculture & food systems
    (21, 0.895, 0.215, 'mine'),               # Legal action & mountain justice
    (12, 0.775, 0.270, 'village'),            # Gender & social equity
    (18, 0.835, 0.330, 'pastures'),           # Land tenure & mountain governance
    (19, 0.785, 0.410, 'dam'),                # Hydropower & energy transitions
    (7,  0.620, 0.360, 'forest'),             # Forests, soils & carbon dynamics
    (22, 0.545, 0.275, 'viewpoint'),          # Mountains & the arts
    (11, 0.470, 0.252, 'monastery'),          # Cultural landscapes & heritage
    (5,  0.372, 0.300, 'canal'),              # Water towers & downstream dependencies
    (8,  0.300, 0.330, 'terraces'),           # Adaptation & resilience
    (14, 0.130, 0.305, 'abandoned terraces'), # Demographic change & migration
    (6,  0.205, 0.440, 'restored slope'),     # Ecosystems & nature-based solutions
    (17, 0.255, 0.585, 'herders'),            # Indigenous & local knowledge
    (25, 0.215, 0.772, 'rock glacier'),       # Permafrost
    (24, 0.300, 0.812, 'snowfield'),          # Snow dynamics
    (2,  0.355, 0.665, 'weather station'),    # Mountain observation systems
    (13, 0.335, 0.505, 'lodge'),              # Tourism
    (4,  0.405, 0.405, 'village'),            # Social dimensions of glacier loss
    (9,  0.448, 0.505, 'moraine lake'),       # Cascading hazards & risks
    (23, 0.505, 0.560, 'retreat lines'),      # Future scenarios for mountain regions
    (1,  0.530, 0.690, 'glacier'),            # Glaciers
    (3,  0.600, 0.770, 'high station'),       # Elevation-dependent warming
    (15, 0.835, 0.650, 'border pass'),        # Peacebuilding & transboundary cooperation
    (20, 0.700, 0.800, 'summit'),             # Mountains in global frameworks
]

# the stories' short topics, for the key (from stories-data.js labels)
TOPICS = {1: 'Glaciers', 2: 'Mountain observation systems', 3: 'Elevation-dependent warming',
          4: 'Social dimensions of glacier loss', 5: 'Water towers & downstream dependencies',
          6: 'Ecosystems & nature-based solutions', 7: 'Forests, soils & carbon dynamics',
          8: 'Adaptation & resilience', 9: 'Cascading hazards & risks', 10: 'Agriculture & food systems',
          11: 'Cultural landscapes & heritage', 12: 'Gender & social equity', 13: 'Tourism',
          14: 'Demographic change & migration', 15: 'Peacebuilding & transboundary cooperation',
          16: 'Urbanisation & infrastructure', 17: 'Indigenous & local knowledge',
          18: 'Land tenure & mountain governance', 19: 'Hydropower & energy transitions',
          20: 'Mountains in global frameworks', 21: 'Legal action & mountain justice',
          22: 'Mountains & the arts', 23: 'Future scenarios for mountain regions', 24: 'Snow dynamics',
          25: 'Permafrost'}

ROADS = [   # road network, world coordinates — adjust here
    [(0.495, 0.095), (0.66, 0.14), (0.785, 0.395)],              # up the east valley to the dam
    [(0.66, 0.14), (0.775, 0.265)],                               # to the eastern terraces
    [(0.775, 0.265), (0.895, 0.215)],                             # to the mine
    [(0.495, 0.095), (0.372, 0.300), (0.300, 0.330)],            # west, to the terraces village
    [(0.300, 0.330), (0.410, 0.430)],                             # to the last village below the glacier
    [(0.495, 0.095), (0.470, 0.245)],                             # the monastery road
    [(0.300, 0.330), (0.130, 0.305)],                             # to the western spur
]


def road_layer(doc, G, H, L, P):
    cost = F.cost_grid(H, L, 'road')
    casing, core = [], []
    paths = []
    for leg in ROADS:
        pts = np.vstack([F.route(cost, a, b) for a, b in zip(leg[:-1], leg[1:])])
        paths.append(pts)
        for run in F.draped(G, H, pts, 2.5):
            d = K.d_smooth(run, False, 1.8)
            casing.append(d); core.append(d)
    lay = doc.layer('Infrastructure')
    lay.append(f'<path d="{"".join(casing)}" fill="none" stroke="{P["shade"]}" stroke-width="2.8" '
               f'stroke-opacity="0.7" stroke-linecap="round" stroke-linejoin="round"/>')
    lay.append(f'<path d="{"".join(core)}" fill="none" stroke="{P["road"]}" stroke-width="1.3" '
               f'stroke-opacity="0.95" stroke-linecap="round" stroke-linejoin="round"/>')
    return paths


def dam_and_power(doc, G, H, L, P, w, road_paths):
    """An arch dam across the east valley at the reservoir's outlet, the
    powerhouse below it, and a power line down to the town."""
    lake, level, _ = w['lakes'][1]
    n = H.shape[0]
    js, is_ = np.nonzero(lake)
    k = np.argmin(js)                                   # the front-most water: the outlet
    ox, oy = is_[k] / (n - 1), js[k] / (n - 1)
    # valley direction at the outlet, from the valley's centreline
    pts = np.array(T.EAST_VALLEY)
    seg = np.argmin(np.hypot(pts[:, 0] - ox, pts[:, 1] - oy))
    a_, b_ = pts[max(seg - 1, 0)], pts[min(seg + 1, len(pts) - 1)]
    dv = (b_ - a_) / np.hypot(*(b_ - a_)); perp = np.array([-dv[1], dv[0]])
    crest = level + 25
    ends = []
    for sgn in (-1, 1):
        t = 0.0
        while t < 0.06 and V.sample(H, ox + sgn * perp[0] * t, oy + sgn * perp[1] * t) < crest:
            t += 0.0008
        ends.append(np.array([ox, oy]) + sgn * perp * t)
    # the wall stands just downstream of the last water, arching into the
    # reservoir as an arch dam does — adjust its position with the offset
    off = dv * 0.004
    arc = [ends[0] + off + (ends[1] - ends[0]) * s - dv * 0.007 * np.sin(np.pi * s) for s in np.linspace(0, 1, 24)]
    arc = np.array(arc)
    top = np.stack(V.project(arc[:, 0], arc[:, 1], np.full(len(arc), crest)), 1)
    down = arc + dv * 0.0025
    bot = np.stack(V.project(down[:, 0], down[:, 1], np.full(len(arc), crest - 110)), 1)
    face = np.concatenate([top, bot[::-1]])
    lay = doc.layer('Infrastructure')
    lay.append(f'<path d="{K.d_poly(face, True, 0.6)}" fill="{P["concrete"]}" stroke="{P["shade"]}" stroke-width="0.6"/>')
    for e_ in (0, -1):                                       # the abutments, keyed into the rock
        a0, b0 = top[e_], bot[e_]
        wdt = 7 if e_ == 0 else -7
        lay.append(f'<path d="M{f1(a0[0])} {f1(a0[1])}L{f1(a0[0] - wdt)} {f1(a0[1] + 3)}'
                   f'L{f1(b0[0] - wdt)} {f1(b0[1] + 3)}L{f1(b0[0])} {f1(b0[1])}Z" fill="{P["concrete"]}" '
                   f'fill-opacity="0.85" stroke="{P["shade"]}" stroke-width="0.5"/>')
    lay.append(f'<path d="{K.d_poly(top, False, 0.6)}" fill="none" stroke="{P["concrete"]}" stroke-width="2.6" stroke-linecap="round"/>')
    mid = top[len(top) // 2]
    # the downstream face, shaded, so the wall reads as a wall and not a causeway
    lay.append(f'<path d="{K.d_poly(np.concatenate([top, bot[::-1]]), True, 0.6)}" fill="{P["shade"]}" '
               f'fill-opacity="0.5"/>')
    for s_ in np.linspace(0.12, 0.88, 7):                 # buttress lines down the face
        a_ = top[int(s_ * (len(top) - 1))]; b_ = bot[int(s_ * (len(bot) - 1))]
        lay.append(f'<path d="M{f1(a_[0])} {f1(a_[1])}L{f1(b_[0])} {f1(b_[1])}" stroke="{P["shade"]}" '
                   f'stroke-width="0.7" stroke-opacity="0.45"/>')
    # the spillway: a chute over one flank, with white water at its foot
    sp = top[int(0.93 * (len(top) - 1))]; sb = bot[int(0.93 * (len(bot) - 1))]
    lay.append(f'<path d="M{f1(sp[0] - 3)} {f1(sp[1])}L{f1(sb[0] - 2.5)} {f1(sb[1])}L{f1(sb[0] + 2.5)} {f1(sb[1])}'
               f'L{f1(sp[0] + 3)} {f1(sp[1])}Z" fill="{P["waterLine"]}" fill-opacity="0.7"/>')
    # powerhouse below
    phx, phy = ox + dv[0] * 0.022, oy + dv[1] * 0.022
    sx, sy = V.project(phx, phy, V.sample(H, phx, phy))
    # the penstock: a steel pipe on saddles, from the dam down to the powerhouse
    toe = bot[len(bot) // 2]
    a_ = np.array([toe[0] + 4, toe[1]]); b_ = np.array([sx, sy - 8])
    lay.append(f'<path d="M{f1(a_[0])} {f1(a_[1])}L{f1(b_[0])} {f1(b_[1])}" stroke="{P["shade"]}" stroke-width="5" stroke-opacity="0.5"/>')
    lay.append(f'<path d="M{f1(a_[0])} {f1(a_[1])}L{f1(b_[0])} {f1(b_[1])}" stroke="{P["penstock"]}" stroke-width="3"/>')
    for t_ in np.linspace(0.25, 0.75, 3):                 # saddles under the pipe
        q_ = a_ + (b_ - a_) * t_
        nq = (b_ - a_) / (np.hypot(*(b_ - a_)) + 1e-9)
        lay.append(f'<path d="M{f1(q_[0] - nq[1] * 3)} {f1(q_[1] + nq[0] * 3)}l{f1(nq[1] * 6)} {f1(-nq[0] * 6)}" '
                   f'stroke="{P["concrete"]}" stroke-width="1.6"/>')
    lay.append(F.box(sx, sy, 20, 12, 10, 'flat', dict(P, roofFlat=P['metalRoof'])))
    lay.append(f'<path d="M{f1(sx - 6)} {f1(sy + 4)}q-10 8 -16 18" fill="none" stroke="{P["waterLine"]}" '
               f'stroke-width="2" stroke-opacity="0.85"/>')                    # the tailrace back to the river
    # the switchyard beside it: a fenced platform with two transformers
    lay.append(f'<rect x="{f1(sx + 13)}" y="{f1(sy - 6)}" width="22" height="11" fill="{P["shade"]}" '
               f'fill-opacity="0.45" stroke="{P["pylon"]}" stroke-width="0.8"/>')
    for dx_ in (4, 13):
        lay.append(f'<rect x="{f1(sx + 13 + dx_)}" y="{f1(sy - 4)}" width="5" height="6" fill="{P["pylon"]}"/>'
                   f'<path d="M{f1(sx + 15.5 + dx_)} {f1(sy - 4)}l0 -5" stroke="{P["pylon"]}" stroke-width="0.8"/>')
    # the power line: pylons along the road back down to the town
    line = road_paths[0][::-1]
    line = line[(line[:, 1] < oy - 0.01)]
    cum = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(line, axis=0).T))])
    stops = np.arange(0.01, cum[-1], 0.06)
    tops = []
    for s in stops:
        i = np.searchsorted(cum, s)
        p = line[min(i, len(line) - 1)] + np.array([0.006, -0.004])
        z = V.sample(H, p[0], p[1])
        if not G.visible(p[0], p[1], z + 2):
            tops.append(None); continue
        x, y = V.project(p[0], p[1], z)
        hh = 22
        lay.append(f'<path d="M{f1(x - 4)} {f1(y)}L{f1(x)} {f1(y - hh)}L{f1(x + 4)} {f1(y)}'
                   f'M{f1(x - 6)} {f1(y - hh + 4)}L{f1(x + 6)} {f1(y - hh + 4)}M{f1(x - 2.6)} {f1(y - 8)}L{f1(x + 2.6)} {f1(y - 8)}'
                   f'M{f1(x - 3.3)} {f1(y - 4)}L{f1(x + 1.7)} {f1(y - 12)}M{f1(x + 3.3)} {f1(y - 4)}L{f1(x - 1.7)} {f1(y - 12)}" '
                   f'fill="none" stroke="{P["pylon"]}" stroke-width="0.8" stroke-opacity="0.7"/>')
        tops.append((x, y - hh + 3))
    wire = []
    for a, b in zip(tops[:-1], tops[1:]):
        if a and b:
            mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 3
            wire.append(f'M{f1(a[0])} {f1(a[1])}Q{f1(mx)} {f1(my)} {f1(b[0])} {f1(b[1])}')
    lay.append(f'<path d="{"".join(wire)}" fill="none" stroke="{P["pylon"]}" stroke-width="1" stroke-opacity="0.85"/>')
    return (ox, oy)


def mine(doc, G, H, L, P, x0=0.905, y0=0.200):
    """An open-pit mine: benches stepping down into the slope, a haul road
    zig-zagging out, a grey waste dump, and a tailings pond behind a straight dam."""
    lay = doc.layer('Infrastructure')
    rng = np.random.default_rng(11)
    z0 = V.sample(H, x0, y0)
    t = np.linspace(0, 2 * np.pi, 9)[:-1]
    rng2 = np.random.default_rng(12)
    wob = 1 + rng2.uniform(-0.18, 0.18, len(t))              # a polygonal, irregular pit outline
    out = []
    n = 6
    rim_r = 0.034
    rim = np.stack(V.project(x0 + rim_r * np.cos(t) * 1.35 * wob, y0 + rim_r * np.sin(t) * wob, np.full_like(t, z0 + 5)), 1)
    cid = f'pit{int(x0 * 1000)}'
    doc.defs.append(f'<clipPath id="{cid}"><path d="{K.d_poly(rim, True, 0.5)}"/></clipPath>')
    out.append(f'<path d="{K.d_poly(rim, True, 0.5)}" fill="{P["pitShadow"]}"/>')    # the pit, in shadow
    out.append(f'<g clip-path="url(#{cid})">')
    for i in range(1, n):                                  # benches step down; each deeper ring shows its lit far wall
        r = rim_r * (1 - i / n) ** 0.85
        pts = np.stack(V.project(x0 + r * np.cos(t) * 1.35 * wob, y0 + r * np.sin(t) * wob, np.full_like(t, z0 - i * 95)), 1)
        fill = P['benchLight'] if i % 2 else P['benchMid']
        out.append(f'<path d="{K.d_poly(pts, True, 0.5)}" fill="{fill}" stroke="{P["pitShadow"]}" stroke-width="1"/>')
    floor = np.stack(V.project(x0 + 0.004 * np.cos(t) * 1.35, y0 + 0.004 * np.sin(t), np.full_like(t, z0 - n * 95)), 1)
    out.append(f'<path d="{K.d_poly(floor, True, 0.5)}" fill="{P["pitWater"]}"/>')
    # the haul road, down the far wall
    hr = []
    for i in range(0, n):
        r = rim_r * (1 - i / n) ** 0.85; a_ = 1.2 + (i % 2) * 0.9
        hr.append(V.project(x0 + r * np.cos(a_) * 1.35, y0 + r * np.sin(a_), z0 - i * 95))
    out.append(f'<path d="{K.d_poly(np.array(hr), False, 0.5)}" fill="none" stroke="{P["road"]}" stroke-width="1.6"/>')
    out.append('</g>')
    out.append(f'<path d="{K.d_poly(rim, True, 0.5)}" fill="none" stroke="{P["benchLight"]}" stroke-width="1.4"/>')
    # the waste dump: one flat-topped heap on the downslope side
    wx, wy = x0 + 0.005, y0 - 0.048
    tt = np.linspace(0, 2 * np.pi, 40)
    zb = V.sample(H, wx, wy)
    base_ = np.stack(V.project(wx + 0.024 * np.cos(tt), wy + 0.013 * np.sin(tt), np.full_like(tt, zb)), 1)
    top_ = np.stack(V.project(wx + 0.017 * np.cos(tt), wy + 0.008 * np.sin(tt), np.full_like(tt, zb + 190)), 1)
    allp = np.vstack([base_, top_])
    hull = _hull(allp)
    out.append(f'<path d="{K.d_poly(hull, True, 0.5)}" fill="{P["waste"]}" stroke="{P["shade"]}" stroke-width="0.6"/>')
    out.append(f'<path d="{K.d_poly(top_, True, 0.5)}" fill="{P["wasteTop"]}"/>')
    # the tailings pond, milky, behind a straight dam on its downhill side
    cx, cy = x0 - 0.052, y0 + 0.006
    q = np.array([[cx - 0.022, cy - 0.012], [cx + 0.020, cy - 0.012], [cx + 0.024, cy + 0.010], [cx + 0.004, cy + 0.017],
                  [cx - 0.019, cy + 0.011]])
    zq = V.sample(H, q[:, 0], q[:, 1]).max() + 4
    pp = np.stack(V.project(q[:, 0], q[:, 1], np.full(len(q), zq)), 1)
    out.append(f'<path d="{K.d_poly(pp, True, 0.5)}" fill="{P["slurry"]}" stroke="{P["inkFaint"]}" '
               f'stroke-width="0.7" stroke-opacity="0.8"/>')
    dec = pp.mean(0) + (pp[3] - pp.mean(0)) * 0.55                            # the decant pond, upstream
    out.append(f'<ellipse cx="{f1(dec[0])}" cy="{f1(dec[1])}" rx="9" ry="4.5" fill="{P["tailings"]}" '
               f'fill-opacity="0.9"/>')
    a_, b_ = pp[0], pp[1]
    dn = np.array([0.0, 15.0])                               # the embankment steps downhill on the screen
    out.append(f'<path d="M{f1(a_[0])} {f1(a_[1])}L{f1(b_[0])} {f1(b_[1])}L{f1(b_[0] - 4)} {f1(b_[1] + dn[1])}'
               f'L{f1(a_[0] + 4)} {f1(a_[1] + dn[1])}Z" fill="{P["waste"]}" stroke="{P["shade"]}" stroke-width="0.6"/>')
    out.append(f'<path d="M{f1(a_[0])} {f1(a_[1])}L{f1(b_[0])} {f1(b_[1])}" stroke="{P["wasteTop"]}" stroke-width="3.4" stroke-linecap="round"/>')
    for t_ in np.linspace(0.15, 0.85, 6):                    # the face of the embankment
        u = a_ + (b_ - a_) * t_
        out.append(f'<path d="M{f1(u[0])} {f1(u[1])}l{f1(-1 + 2 * t_)} {f1(dn[1])}" stroke="{P["shade"]}" '
                   f'stroke-width="0.6" stroke-opacity="0.5"/>')
    # seepage from the tailings, down toward the paddies
    sp = np.array([[cx + 0.01, cy - 0.012], [cx - 0.01, cy - 0.05], [cx - 0.04, cy - 0.085], [cx - 0.07, cy - 0.11]])
    for r in F.draped(G, H, sp, 3):
        out.append(f'<path d="{K.d_smooth(r, False, 1.2)}" fill="none" stroke="{P["seep"]}" stroke-width="1.4" stroke-dasharray="2 3"/>')
    lay.append(''.join(out))


def _hull(pts):
    """Convex hull of screen points (monotone chain)."""
    p = sorted(map(tuple, pts))
    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
    lo, up = [], []
    for q in p:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], q) <= 0:
            lo.pop()
        lo.append(q)
    for q in reversed(p):
        while len(up) >= 2 and cross(up[-2], up[-1], q) <= 0:
            up.pop()
        up.append(q)
    return np.array(lo[:-1] + up[:-1])


def monastery(doc, G, H, L, P, x0=0.470, y0=0.252):
    lay = doc.layer('Settlements')
    z = V.sample(H, x0, y0)
    sx, sy = V.project(x0, y0, z)
    out = [F.box(sx - 16, sy + 5, 26, 14, 12, 'flat', P), F.box(sx + 14, sy + 2, 16, 10, 9, 'flat', P)]
    # a white stupa: dome on a stepped base, a spire (drawn at 1.6x)
    bx, by = sx - 1, sy - 16
    out.append(f'<g transform="translate({f1(bx)} {f1(by)}) scale(1.6) translate({f1(-bx)} {f1(-by)})">')
    out.append(f'<path d="M{f1(bx - 6)} {f1(by)}L{f1(bx + 6)} {f1(by)}L{f1(bx + 6)} {f1(by - 3)}L{f1(bx - 6)} {f1(by - 3)}Z" fill="{P["whitewash"]}"/>')
    out.append(f'<path d="M{f1(bx - 5)} {f1(by - 3)}A5 5 0 0 1 {f1(bx + 5)} {f1(by - 3)}Z" fill="{P["whitewash"]}"/>')
    out.append(f'<path d="M{f1(bx)} {f1(by - 8)}L{f1(bx)} {f1(by - 15)}" stroke="{P["dome"]}" stroke-width="1.6"/>')
    # prayer flags on lines running down from the spire
    for dx in (-22, 20):
        cols = ['#4FA3D9', '#E6EFF5', '#E07A66', '#7FB069', '#E3C16F']
        for i in range(9):
            t = (i + 1) / 10
            fx = bx + dx * t; fy = by - 14 + 13 * t + 4 * np.sin(np.pi * t)
            out.append(f'<rect x="{f1(fx - 0.9)}" y="{f1(fy)}" width="1.8" height="2.2" fill="{cols[i % 5]}"/>')
        out.append(f'<path d="M{f1(bx)} {f1(by - 14)}Q{f1(bx + dx / 2)} {f1(by - 4)} {f1(bx + dx)} {f1(by - 1)}" fill="none" stroke="{P["inkSoft"]}" stroke-width="0.4"/>')
    out.append('</g>')
    lay.append(''.join(out))


def observatory(doc, G, H, L, P, x0, y0):
    lay = doc.layer('Infrastructure')
    z = V.sample(H, x0, y0)
    sx, sy = V.project(x0, y0, z)
    lay.append(F.box(sx, sy, 22, 14, 10, 'dome', dict(P, dome=P['light'])))
    mx = sx + 15
    lay.append(f'<path d="M{f1(mx)} {f1(sy + 2)}L{f1(mx)} {f1(sy - 34)}M{f1(mx - 6)} {f1(sy - 30)}L{f1(mx + 6)} {f1(sy - 30)}" '
               f'stroke="{P["light"]}" stroke-width="1.2" fill="none"/>')
    for dx_ in (-6, 0, 6):                                     # the cup anemometer
        lay.append(f'<circle cx="{f1(mx + dx_)}" cy="{f1(sy - 30)}" r="1.6" fill="{P["light"]}"/>')
    lay.append(f'<path d="M{f1(mx)} {f1(sy - 20)}l7 -2l0 5l-7 -1Z" fill="{P["solar"]}" stroke="{P["light"]}" stroke-width="0.5"/>')


def solar(doc, G, H, L, P, x0=0.37, y0=0.115):
    lay = doc.layer('Infrastructure')
    ux, vy = F.axes()
    for r in range(4):
        for c in range(7):
            x, y = x0 + c * 0.006, y0 + r * 0.005
            z = V.sample(H, x, y)
            if not G.visible(x, y, z + 1):
                continue
            sx, sy = V.project(x, y, z)
            a = np.array([sx, sy]); b = a + ux * 6; c_ = b + vy * 3 + np.array([0, -1.5]); d = a + vy * 3 + np.array([0, -1.5])
            lay.append(f'<path d="M{f1(a[0])} {f1(a[1])}L{f1(b[0])} {f1(b[1])}L{f1(c_[0])} {f1(c_[1])}L{f1(d[0])} {f1(d[1])}Z" '
                       f'fill="{P["solar"]}" stroke="{P["solarFrame"]}" stroke-width="0.6"/>')


def animal(sx, sy, kind, fl, P, k=1.0):
    """A grazing animal in profile, as one silhouette. fl: +1 facing right."""
    def pt(x, y):
        return f'{f1(sx + x * fl * k)} {f1(sy - y * k)}'
    if kind == 'llama':        # long upright neck, small head, long legs
        d = (f'M{pt(-5, 0)}L{pt(-4.4, 6)}L{pt(-5.2, 9.5)}Q{pt(-2, 11)} {pt(3, 10)}L{pt(4, 16)}L{pt(6.5, 16.5)}'
             f'L{pt(6.4, 15)}L{pt(5, 14.6)}L{pt(4.8, 9)}Q{pt(5.4, 7)} {pt(4, 6)}L{pt(4.6, 0)}L{pt(3.4, 0)}L{pt(2.8, 5.8)}'
             f'L{pt(-2.6, 6)}L{pt(-3.4, 0)}Z')
        col = P['animal']
    else:                      # yak: low, heavy, humped, shaggy skirt, horns
        d = (f'M{pt(-7, 0)}L{pt(-6.6, 3.6)}L{pt(-8, 4.5)}Q{pt(-8, 10)} {pt(-2, 11)}Q{pt(2, 12.5)} {pt(5, 9.5)}'
             f'L{pt(8.5, 8.5)}L{pt(9, 6)}L{pt(6.5, 5.5)}L{pt(5.5, 3.6)}L{pt(5.8, 0)}L{pt(4.4, 0)}L{pt(3.6, 3)}'
             f'L{pt(-4.2, 3)}L{pt(-5.4, 0)}Z'
             f'M{pt(7, 9)}Q{pt(8.5, 12)} {pt(10.5, 11.5)}L{pt(8.4, 9.4)}Z')
        col = P['yak']
    return f'<path d="{d}" fill="{col}" stroke="{P["shade"]}" stroke-width="0.4"/>'


def herd(doc, G, H, L, P, rng, x0, y0, n=9, kind='llama'):
    """A herd grazing the alpine grassland, with the herder and a tent."""
    lay = doc.layer('People-animals')
    out = []
    items = []
    for i in range(n):
        x, y = x0 + rng.normal(0, 0.014), y0 + rng.normal(0, 0.009)
        z = V.sample(H, x, y)
        if not G.visible(x, y, z + 1):
            continue
        sx, sy = V.project(x, y, z)
        if any(abs(sx - a) < 14 and abs(sy - b) < 8 for a, b, _ in items):
            continue
        items.append((sx, sy, -1 if rng.random() < 0.5 else 1))
    for sx, sy, fl in sorted(items, key=lambda q: q[1]):
        out.append(animal(sx, sy, kind, fl, P, 1.0 if kind == 'llama' else 1.4))
    # the herder and a tent (a white cone with a dark door)
    tx, ty = x0 + 0.024, y0 - 0.006
    z = V.sample(H, tx, ty); sx, sy = V.project(tx, ty, z)
    out.append(f'<path d="M{f1(sx - 11)} {f1(sy)}L{f1(sx)} {f1(sy - 15)}L{f1(sx + 11)} {f1(sy)}Z" fill="{P["tentWhite"]}" stroke="{P["shade"]}" stroke-width="0.6"/>')
    out.append(f'<path d="M{f1(sx - 2.5)} {f1(sy)}L{f1(sx)} {f1(sy - 6)}L{f1(sx + 2.5)} {f1(sy)}Z" fill="{P["tent"]}"/>')
    out.append(person(sx + 18, sy, P, staff=True, k=1.7))
    lay.append(''.join(out))


def person(x, y, P, staff=False, load=False, k=1.0):
    """A small standing figure as one silhouette (head, coat, legs)."""
    q = lambda a, b: f'{f1(x + a * k)} {f1(y - b * k)}'
    d = (f'M{q(-1.2, 0)}L{q(-0.8, 3.2)}L{q(-1.5, 7.2)}Q{q(0, 8.4)} {q(1.5, 7.2)}L{q(0.8, 3.2)}L{q(1.2, 0)}L{q(0.4, 0)}'
         f'L{q(0, 3)}L{q(-0.4, 0)}Z')
    s_ = f'<path d="{d}" fill="{P["figure"]}"/><circle cx="{f1(x)}" cy="{f1(y - 9.3 * k)}" r="{f1(1.15 * k)}" fill="{P["figure"]}"/>'
    if staff:
        s_ += f'<path d="M{q(2, 0)}L{q(2.6, 10)}" stroke="{P["figure"]}" stroke-width="{f1(0.6 * k)}"/>'
    if load:
        s_ += f'<path d="M{q(-1.6, 7.4)}L{q(-3.4, 6.8)}L{q(-3.1, 3.6)}L{q(-1.2, 4)}Z" fill="{P["figure"]}"/>'
    return s_


def rock_glacier(doc, G, H, L, P, x0=0.215, y0=0.772):
    """A rock glacier: one blunt tongue of frozen debris creeping down the
    fall line from a scree slope, its surface ridged with arcs that bow
    downslope, ending in a steep dark front."""
    lay = doc.layer('Glacier-detail')
    gy_, gx_ = np.gradient(H)
    gx, gy = V.sample(gx_, x0, y0), V.sample(gy_, x0, y0)
    down = -np.array([gx, gy]); down /= np.hypot(*down); side = np.array([-down[1], down[0]])
    c = np.array([x0, y0])
    W_, Lf = 0.024, 0.038                                   # half-width, length of the tongue (world)
    # the outline: straight flanks from the root, a rounded front
    t = np.linspace(0, np.pi, 26)
    front = [c + down * (Lf * 0.5 + 0.35 * Lf * np.sin(a)) + side * W_ * np.cos(a) for a in t]
    left = [c - down * Lf * 0.5 - side * W_ * 0.85]
    right = [c - down * Lf * 0.5 + side * W_ * 0.85]
    outline = np.array(right + front + left)
    z = V.sample(H, outline[:, 0], outline[:, 1]) + 10
    pts = np.stack(V.project(outline[:, 0], outline[:, 1], z), 1)
    lay.append(f'<path d="{K.d_smooth(pts, False, 1.0)}" fill="{P["rockGlacier"]}" stroke="none"/>')
    # the steep front, dark
    fr = np.array(front)
    zf = V.sample(H, fr[:, 0], fr[:, 1]) + 10
    fp = np.stack(V.project(fr[:, 0], fr[:, 1], zf), 1)
    lay.append(f'<path d="{K.d_smooth(fp, False, 1.0)}" fill="none" stroke="{P["rgFront"]}" stroke-width="3.4" stroke-linecap="round"/>')
    # transverse ridges bowing downslope
    d = []
    for k in range(5):
        f = -0.35 + k * 0.2
        arc = np.array([c + down * Lf * (f + 0.22 * np.cos(a) ** 2 * 0 + 0.18 * np.sin(a)) + side * W_ * 0.9 * np.cos(a)
                        for a in np.linspace(0.25, np.pi - 0.25, 16)])
        za = V.sample(H, arc[:, 0], arc[:, 1]) + 12
        d.append(K.d_smooth(np.stack(V.project(arc[:, 0], arc[:, 1], za), 1), False, 1.0))
    lay.append(f'<path d="{"".join(d)}" fill="none" stroke="{P["rgRidge"]}" stroke-width="1.5" stroke-linecap="round"/>')


def retreat_lines(doc, G, H, L, P):
    """Where the glacier's snout stood before: dated arcs down the valley."""
    lay = doc.layer('Glacier-detail')
    lab = doc.layer('Labels')
    river = np.array(T.MAIN_RIVER)
    base = np.array(T.MAIN_GLACIER[-1])
    for year, t in [('1850', 0.14), ('1950', 0.085), ('2000', 0.04)]:
        # along the river below the present snout
        p = base + (river[1] - river[0]) * (t / np.hypot(*(river[1] - river[0]))) * 0.9
        dv = (river[1] - river[0]); dv = dv / np.hypot(*dv); perp = np.array([-dv[1], dv[0]])
        arc = np.array([p + perp * s * 0.04 + dv * 0.01 * (1 - s ** 2) for s in np.linspace(-1, 1, 20)])
        z = V.sample(H, arc[:, 0], arc[:, 1]) + 6
        runs = __import__('render').visible_runs(G, arc[:, 0], arc[:, 1], z, 2)
        for run in runs:
            lay.append(f'<path d="{K.d_poly(run, False, 1)}" fill="none" stroke="{P["iceLine"]}" stroke-width="1" '
                       f'stroke-dasharray="3 2.5" stroke-opacity="0.9"/>')
        if runs:
            ex, ey = runs[0][-1]
            lab.append(f'<text x="{f1(ex + 4)}" y="{f1(ey + 3)}" font-family="{K.SERIF}" font-style="italic" '
                       f'font-size="10" fill="{P["iceLine"]}">{year}</text>')


# ---------------------------------------------------------------------------
# the story route and its stations
# ---------------------------------------------------------------------------
def story_route(doc, G, H, L, P):
    """One continuous trail through the 25 stations; markers are nudged apart
    where they would collide and tied to their true spot by a short leader."""
    cost = F.cost_grid(H, L, 'trail')
    # nobody walks over a tailings impoundment: make that ground expensive
    n_ = cost.shape[0]
    gx_ = np.linspace(0, 1, n_)
    XX, YY = np.meshgrid(gx_, gx_)
    cost = cost + 60.0 * np.exp(-(((XX - 0.853) / 0.045) ** 2 + ((YY - 0.206) / 0.030) ** 2))
    pts = [np.array(s[1:3]) for s in STATIONS]
    lay = doc.layer('Route')
    runs_all = []
    for a, b in zip(pts[:-1], pts[1:]):
        path = F.route(cost, a, b)
        runs_all += F.draped(G, H, path, 5)
    # near parts of the trail are drawn heavier than far ones, so the path
    # carries the same depth as the ground it lies on
    bands = [(0.0, 0.34, 1.5, 3.1, 0.72), (0.34, 0.68, 1.9, 3.7, 0.82), (0.68, 1.01, 2.3, 4.3, 0.92)]
    for lo, hi, w, wo, op in bands:
        d = ''.join(K.d_smooth(r, False, 1.8) for r in runs_all
                    if lo <= float(np.mean(r[:, 1])) / V.H_PX < hi)
        if not d:
            continue
        lay.append(f'<path d="{d}" fill="none" stroke="{P["paper"]}" stroke-width="{wo}" stroke-opacity="0.75" '
                   f'stroke-linecap="round" stroke-linejoin="round"/>')
        lay.append(f'<path d="{d}" fill="none" stroke="{P["route"]}" stroke-width="{w}" stroke-opacity="{op}" '
                   f'stroke-linecap="round" stroke-linejoin="round"/>')
    # markers: anchors on the ground, positions pushed apart on screen
    anchors = []
    for (num, x, y, what) in STATIONS:
        z = V.sample(H, x, y)
        anchors.append(np.array(V.project(x, y, z)))
    anchors = np.array(anchors)
    # every marker stands clear of the thing it names, up-slope, so the symbol
    # underneath stays visible — adjust the stand-off here
    pos = anchors + np.array([0.0, -27.0])
    R = 11.5; gap = 2 * R + 17
    for _ in range(200):
        moved = False
        for i in range(len(pos)):
            for j in range(i + 1, len(pos)):
                dv = pos[j] - pos[i]; dd = np.hypot(*dv)
                if dd < gap:
                    push = (gap - dd) / 2 * (dv / (dd + 1e-9) if dd > 1e-6 else np.array([1.0, 0]))
                    pos[i] -= push; pos[j] += push; moved = True
        pos = anchors + np.clip(pos - anchors, -62, 62)
        if not moved:
            break
    st = doc.layer('Stations')
    coords = []
    for i, (num, x, y, what) in enumerate(STATIONS):
        (ax, ay), (sx, sy) = anchors[i], pos[i]
        g = f'<g id="station-{i + 1:02d}" data-story="{num}">'
        if np.hypot(sx - ax, sy - ay) > 5:
            # a grey leader, never the route's orange, so it cannot read as a path
            g += (f'<path d="M{f1(ax)} {f1(ay)}L{f1(sx)} {f1(sy)}" stroke="{P["inkSoft"]}" stroke-width="0.9" '
                  f'stroke-opacity="0.75"/>'
                  f'<circle cx="{f1(ax)}" cy="{f1(ay)}" r="2.2" fill="{P["inkSoft"]}"/>')
        # near stations are drawn larger than far ones, as everything else is
        depth = float(np.clip((sy - 120) / (V.H_PX - 260), 0, 1))
        r_ = R - 1.8 + 3.6 * depth + (2.0 if i == len(STATIONS) - 1 else 0)
        onice = V.nearest(L['cls'], x, y) in (LC.GLACIER, LC.SNOW)
        if onice:                                            # a dark halo keeps the ring off white ice
            g += (f'<circle cx="{f1(sx)}" cy="{f1(sy)}" r="{f1(r_ + 2.4)}" fill="none" stroke="{P["shade"]}" '
                  f'stroke-width="2.2" stroke-opacity="0.5"/>')
        g += (f'<circle cx="{f1(sx)}" cy="{f1(sy)}" r="{f1(r_)}" fill="{P["paper"]}" stroke="{P["red"]}" '
              f'stroke-width="{f1(1.5 + 0.7 * depth)}"/>'
              f'<text x="{f1(sx)}" y="{f1(sy + r_ * 0.38)}" text-anchor="middle" font-family="{K.SANS}" font-weight="700" '
              f'font-size="{f1(r_ * 1.02)}" fill="{P["light"]}">{i + 1:02d}</text></g>')
        st.append(g)
        coords.append(dict(order=i + 1, story=num, what=what, x=round(float(sx), 1), y=round(float(sy), 1),
                           anchor_x=round(float(ax), 1), anchor_y=round(float(ay), 1)))
    return coords


def station_key(doc, P, x, y, cols=2, colw=330, lh=21):
    """A key to the numbered stations, in route order."""
    import labels as LB
    lay = doc.layer('Key')
    out = [LB.text(x, y - 14, 'THE 25 STORIES, IN ROUTE ORDER', P, 12, italic=False, col=P['inkSoft'], spacing=1.6)]
    per = int(np.ceil(len(STATIONS) / cols))
    for i, (num, *_rest) in enumerate(STATIONS):
        cx = x + (i // per) * colw; cy = y + 12 + (i % per) * lh
        out.append(f'<circle cx="{f1(cx + 9)}" cy="{f1(cy - 4)}" r="8.5" fill="{P["paper"]}" stroke="{P["red"]}" stroke-width="1.2"/>')
        out.append(f'<text x="{f1(cx + 9)}" y="{f1(cy)}" text-anchor="middle" font-family="{K.SANS}" font-weight="600" '
                   f'font-size="9.5" fill="{P["ink"]}">{i + 1:02d}</text>')
        out.append(LB.text(cx + 24, cy, TOPICS[num].replace('&', '&amp;'), P, 14.5, italic=False, col=P['ink'], op=0.92))
    lay.append(''.join(out))


def pictograms(doc, G, H, P):
    """Small things that anchor stories that had nothing under their station:
    trekkers and a lodge (tourism), a painter at the viewpoint (arts), planted
    saplings and check dams (nature-based solutions), a survey pillar and flag
    on the summit (global frameworks)."""
    lay = doc.layer('People-animals')
    out = []
    # trekkers with packs on the trail above the lodge, and the lodge
    lx, ly = 0.335, 0.505
    p_ = V.project(lx, ly, V.sample(H, lx, ly))
    out.append(F.box(p_[0] - 14, p_[1] + 2, 22, 12, 9, 'gable', dict(P, roof=P['metalRoof'])))
    for i, (dx, dy) in enumerate([(0.012, 0.010), (0.018, 0.016), (0.024, 0.021)]):
        q = V.project(lx + dx, ly + dy, V.sample(H, lx + dx, ly + dy))
        out.append(person(q[0], q[1], P, staff=True, load=True, k=1.5))
    # the painter at an easel, at the viewpoint
    vx, vy = 0.545, 0.275
    q = V.project(vx, vy, V.sample(H, vx, vy))
    out.append(person(q[0] - 8, q[1], P, k=1.7))
    out.append(f'<path d="M{f1(q[0] + 2)} {f1(q[1])}L{f1(q[0] + 8)} {f1(q[1] - 24)}L{f1(q[0] + 14)} {f1(q[1])}M{f1(q[0] + 8)} {f1(q[1] - 24)}l0 24" '
               f'stroke="{P["figure"]}" stroke-width="1.3" fill="none"/>')
    out.append(f'<rect x="{f1(q[0] + 1)}" y="{f1(q[1] - 24)}" width="15" height="11" fill="{P["light"]}" stroke="{P["shade"]}" stroke-width="0.8"/>')
    # rows of planted saplings and check dams on the restored slope
    rx, ry = 0.205, 0.44
    for row in range(3):
        for c in range(5):
            x, y = rx - 0.02 + c * 0.011, ry - 0.012 + row * 0.011
            z = V.sample(H, x, y)
            if not G.visible(x, y, z + 1):
                continue
            a = V.project(x, y, z)
            out.append(f'<path d="M{f1(a[0])} {f1(a[1])}l0 -8" stroke="{P["sapling"]}" stroke-width="1.4"/>'
                       f'<circle cx="{f1(a[0])}" cy="{f1(a[1] - 10)}" r="3.4" fill="{P["sapling"]}" stroke="{P["shade"]}" stroke-width="0.6"/>')
    for k in range(3):
        a = V.project(rx + 0.03, ry - 0.02 + k * 0.012, V.sample(H, rx + 0.03, ry - 0.02 + k * 0.012))
        out.append(f'<path d="M{f1(a[0] - 5)} {f1(a[1])}l10 -2" stroke="{P["wallLit"]}" stroke-width="2.4" stroke-linecap="round"/>')
    # the summit: a survey pillar and a flag
    import terrain as T_
    n = H.shape[0]
    j, i = np.unravel_index(H.argmax(), H.shape)
    sx, sy = i / (n - 1), j / (n - 1)
    a = V.project(sx, sy, H[j, i])
    # (no flag on the summit: a survey pillar only, as a measurement, not a conquest)
    # a survey pillar: a tapered concrete column on a plinth, the summit as a
    # measured point rather than a conquest
    px_, py_ = a[0] + 15, a[1] - 2
    out.append(f'<path d="M{f1(px_ - 4)} {f1(py_)}l8 0l-1.6 -13l-4.8 0Z" fill="{P["light"]}" stroke="{P["shade"]}" stroke-width="0.7"/>'
               f'<rect x="{f1(px_ - 5.5)}" y="{f1(py_)}" width="11" height="3" fill="{P["concrete"]}" stroke="{P["shade"]}" stroke-width="0.6"/>'
               f'<circle cx="{f1(px_)}" cy="{f1(py_ - 15)}" r="2.2" fill="none" stroke="{P["light"]}" stroke-width="1.1"/>')
    # fenced pastures on the eastern shoulder: the land-tenure station
    gx, gy = 0.835, 0.330
    ux, vy = F.axes()
    for i_, (dx, dy) in enumerate([(-0.018, 0.004), (0.004, 0.012), (0.012, -0.010)]):
        cx_, cy_ = gx + dx, gy + dy
        z = V.sample(H, cx_, cy_)
        if not G.visible(cx_, cy_, z + 1):
            continue
        w_, h_ = 26 + i_ * 5, 17
        c = np.array(V.project(cx_, cy_, z))
        corners = [c - ux * w_ / 2 - vy * h_ / 2, c + ux * w_ / 2 - vy * h_ / 2,
                   c + ux * w_ / 2 + vy * h_ / 2, c - ux * w_ / 2 + vy * h_ / 2]
        d_ = 'M' + 'L'.join(f'{f1(p[0])} {f1(p[1])}' for p in corners) + 'Z'
        out.append(f'<path d="{d_}" fill="{P["alpine"]}" fill-opacity="0.35" stroke="{P["wallLit"]}" '
                   f'stroke-width="1" stroke-dasharray="4 2.5"/>')
        for p in corners:                                   # corner posts
            out.append(f'<path d="M{f1(p[0])} {f1(p[1])}l0 -4" stroke="{P["wallLit"]}" stroke-width="1.2"/>')
        for k_ in range(2):
            q = c + ux * (k_ * 8 - 5) + vy * 2
            out.append(animal(q[0], q[1], 'llama', 1 if k_ else -1, P, 0.8))
    # the contour canal and its offtake gates: the water-tower station.
    # It is traced on a real contour of the ground, so it cannot run uphill.
    import render as _R
    cxx, cyy = 0.372, 0.300
    z0 = float(V.sample(H, cxx, cyy))
    best = None
    for lv, seg in _R.world_lines(H, [round(z0 / 20) * 20]):
        d2 = np.hypot(seg[:, 0] - cxx, seg[:, 1] - cyy)
        if best is None or d2.min() < best[0]:
            best = (d2.min(), seg, int(np.argmin(d2)))
    if best is not None and best[0] < 0.02:
        _, seg, k0 = best
        pth = seg[max(0, k0 - 55):k0 + 55]
        for run in F.draped(G, H, pth, 4):
            out.append(f'<path d="{K.d_smooth(run, False, 1.4)}" fill="none" stroke="{P["waterLine"]}" '
                       f'stroke-width="2.4" stroke-opacity="0.9"/>')
        # the intake, where the canal leaves the stream, and gates along it
        head = pth[0]
        zz = float(V.sample(H, head[0], head[1]))
        if G.visible(head[0], head[1], zz + 1):
            hx, hy = V.project(head[0], head[1], zz)
            out.append(f'<rect x="{f1(hx - 5)}" y="{f1(hy - 5)}" width="10" height="7" fill="{P["concrete"]}" '
                       f'stroke="{P["shade"]}" stroke-width="0.7"/>')
        for t_ in (0.32, 0.56, 0.80):                       # sluice gates on the downhill bank
            q = pth[int(t_ * (len(pth) - 1))]
            zz = float(V.sample(H, q[0], q[1]))
            if not G.visible(q[0], q[1], zz + 1):
                continue
            sxx, syy = V.project(q[0], q[1], zz)
            out.append(f'<rect x="{f1(sxx - 3)}" y="{f1(syy - 4)}" width="6" height="6" fill="{P["concrete"]}" '
                       f'stroke="{P["shade"]}" stroke-width="0.6"/>'
                       f'<path d="M{f1(sxx)} {f1(syy + 2)}l0 7" stroke="{P["waterLine"]}" stroke-width="1.4"/>')
    # the high automatic weather station on the rock rib: elevation-dependent warming
    ax_, ay_ = 0.600, 0.770
    z = V.sample(H, ax_, ay_)
    if G.visible(ax_, ay_, z + 2):
        x_, y_ = V.project(ax_, ay_, z)
        out.append(f'<path d="M{f1(x_)} {f1(y_)}l0 -26" stroke="{P["light"]}" stroke-width="1.6"/>'
                   f'<path d="M{f1(x_ - 6)} {f1(y_ - 20)}l12 0M{f1(x_ - 5)} {f1(y_ - 14)}l10 0" '
                   f'stroke="{P["light"]}" stroke-width="1.1"/>'
                   f'<circle cx="{f1(x_ - 6)}" cy="{f1(y_ - 26)}" r="2" fill="none" stroke="{P["light"]}" stroke-width="1.1"/>'
                   f'<path d="M{f1(x_)} {f1(y_ - 26)}l7 -3" stroke="{P["light"]}" stroke-width="1.1"/>'
                   f'<rect x="{f1(x_ + 5)}" y="{f1(y_ - 9)}" width="11" height="8" fill="{P["wallLit"]}" '
                   f'stroke="{P["shade"]}" stroke-width="0.7"/>'
                   f'<path d="M{f1(x_ - 9)} {f1(y_)}l6 -4l6 4Z" fill="{P["solar"]}" stroke="{P["solarFrame"]}" stroke-width="0.7"/>')
    # the border over the pass: a boundary line with two posts
    bx, by = 0.835, 0.650
    bl = []
    for t_ in np.linspace(-0.055, 0.055, 26):
        q = np.array([bx + t_ * 0.9, by + t_ * 0.45])
        zz = V.sample(H, q[0], q[1])
        if G.visible(q[0], q[1], zz + 2):
            bl.append(V.project(q[0], q[1], zz))
    if len(bl) > 4:
        bl = np.array(bl)
        out.append(f'<path d="{K.d_smooth(bl, False, 1.4)}" fill="none" stroke="{P["ink"]}" stroke-width="1.5" '
                   f'stroke-dasharray="9 4 2 4" stroke-opacity="0.85"/>')
        for q in (bl[2], bl[-3]):
            out.append(f'<path d="M{f1(q[0])} {f1(q[1])}l0 -9" stroke="{P["ink"]}" stroke-width="1.6"/>'
                       f'<rect x="{f1(q[0])}" y="{f1(q[1] - 9)}" width="6" height="4" fill="{P["red"]}"/>')
    lay.append(''.join(out))
