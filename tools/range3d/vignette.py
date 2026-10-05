"""
The flat 2-D vignettes: one scene per story, all twenty-five.

Each is built on stage.py — a ground profile and things standing on it — and
each is read from its own narrative in Stories_2026_10_03 rather than from its
topic title. The reasoning, story by story, is in
Mountain_Art_v4/ICONOGRAPHY_BRIEF.md.

What the format buys is the ability to draw a *process*. Most of these stories
are about something changing rather than about a place: ice thinning, vegetation
belts climbing, a settlement spreading, a buffer failing, plots of every age in
one hillside. The block diagram could show the place; this can show the change,
mostly through stage.ghost() — a former state laid over the present one with the
difference hatched between them.

    python3 vignette.py 1 OUT.svg [--light]
    python3 vignette.py all DIR   [--light]

The argument is the story's own number, as the drafts are numbered (1 =
Glaciers); the badge carries that story's station number on the climb.
"""
import os
import sys

import numpy as np

import svgkit as K
import render as R
import story as ST
import stage as SG

f1 = K.f1
P = SG.P


# --- marks these stories need that the chassis does not carry ---------------
def stake(x, y, k=1.0):
    """An ablation stake, drilled into the ice and read against the surface."""
    h = 46 * k
    return (f'<ellipse cx="{f1(x)}" cy="{f1(y)}" rx="{f1(7 * k)}" ry="{f1(2.6 * k)}" '
            f'fill="{P()["shade"]}" fill-opacity="0.35"/>'
            f'<path d="M{f1(x)} {f1(y)}l0 {f1(-h)}" stroke="{P()["ink"]}" '
            f'stroke-width="{3.8 * k:.1f}" stroke-linecap="round"/>'
            f'<path d="M{f1(x - 9 * k)} {f1(y - h)}L{f1(x + 9 * k)} {f1(y - h)}" '
            f'stroke="{P()["red"]}" stroke-width="{6.6 * k:.1f}" stroke-linecap="round"/>')


def aws(x, y, k=1.0):
    """An automatic weather station: mast, cups, radiation shield, solar panel."""
    h = 124 * k
    g = [f'<path d="M{f1(x - 28 * k)} {f1(y)}L{f1(x)} {f1(y - h * 0.8)}L{f1(x + 28 * k)} {f1(y)}" '
         f'fill="none" stroke="{P()["ink"]}" stroke-width="{2.4 * k:.1f}" stroke-opacity="0.6"/>',
         f'<path d="M{f1(x)} {f1(y)}l0 {f1(-h)}" stroke="{P()["ink"]}" '
         f'stroke-width="{5.2 * k:.1f}" stroke-linecap="round"/>']
    ay = y - h + 6 * k
    g.append(f'<path d="M{f1(x - 22 * k)} {f1(ay)}L{f1(x + 22 * k)} {f1(ay)}" '
             f'stroke="{P()["ink"]}" stroke-width="{3.4 * k:.1f}"/>')
    for s in (-1, 1):
        g.append(f'<circle cx="{f1(x + s * 22 * k)}" cy="{f1(ay)}" r="{f1(6.4 * k)}" '
                 f'fill="{P()["light"]}" stroke="{P()["ink"]}" stroke-width="{2.2 * k:.1f}"/>')
    g.append(f'<path d="{SG.poly([(x + 5 * k, y - h * 0.35), (x + 40 * k, y - h * 0.41), (x + 40 * k, y - h * 0.27), (x + 5 * k, y - h * 0.21)])}" '
             f'fill="{P()["solar"]}" stroke="{P()["solarFrame"]}" stroke-width="{2.2 * k:.1f}"/>')
    return ''.join(g)


def drone(x, y, k=1.0, drop=190):
    g = [f'<path d="M{f1(x)} {f1(y + 16 * k)}L{f1(x)} {f1(y + drop)}" stroke="{P()["inkSoft"]}" '
         f'stroke-width="{2.4 * k:.1f}" stroke-dasharray="8 10" stroke-opacity="0.7"/>']
    arm = 36 * k
    for s in (-1, 1):
        for dy, f_ in ((-11 * k, 1.0), (8 * k, 0.72)):
            g.append(f'<path d="M{f1(x + s * 6 * k)} {f1(y)}L{f1(x + s * arm * f_)} {f1(y + dy)}" '
                     f'stroke="{P()["ink"]}" stroke-width="{3.8 * k:.1f}" stroke-linecap="round"/>')
            g.append(f'<path d="M{f1(x + s * arm * f_ - 20 * k)} {f1(y + dy)}'
                     f'A{f1(20 * k)} {f1(5.5 * k)} 0 1 1 {f1(x + s * arm * f_ + 20 * k)} {f1(y + dy)}" '
                     f'fill="none" stroke="{P()["ink"]}" stroke-width="{2.6 * k:.1f}" stroke-opacity="0.75"/>')
    g.append(f'<rect x="{f1(x - 18 * k)}" y="{f1(y - 11 * k)}" width="{f1(36 * k)}" '
             f'height="{f1(24 * k)}" rx="{f1(7 * k)}" fill="{P()["ink"]}" stroke="{P()["light"]}" '
             f'stroke-width="{2.2 * k:.1f}"/>')
    return ''.join(g)


def satellite(x, y, k=1.0, beam=None):
    g = []
    if beam:
        bx, by, bw = beam
        g.append(f'<path d="{SG.poly([(x - 18 * k, y + 24 * k), (bx - bw, by), (bx + bw, by), (x + 18 * k, y + 24 * k)])}" '
                 f'fill="{P()["light"]}" fill-opacity="0.045" stroke="{P()["light"]}" '
                 f'stroke-width="2.4" stroke-dasharray="13 11" stroke-opacity="0.34"/>')
    g.append(f'<rect x="{f1(x - 18 * k)}" y="{f1(y - 16 * k)}" width="{f1(36 * k)}" '
             f'height="{f1(32 * k)}" rx="{f1(5 * k)}" fill="{P()["ink"]}" stroke="{P()["light"]}" '
             f'stroke-width="{2.6 * k:.1f}"/>')
    for s in (-1, 1):
        g.append(f'<rect x="{f1(x + (32 * k if s > 0 else -76 * k))}" y="{f1(y - 13 * k)}" '
                 f'width="{f1(44 * k)}" height="{f1(26 * k)}" fill="{P()["solar"]}" '
                 f'stroke="{P()["solarFrame"]}" stroke-width="{2.6 * k:.1f}"/>')
        g.append(f'<path d="M{f1(x + s * 18 * k)} {f1(y)}L{f1(x + s * 32 * k)} {f1(y)}" '
                 f'stroke="{P()["solarFrame"]}" stroke-width="{2.8 * k:.1f}"/>')
    return ''.join(g)


def quadrat(x, y, k=1.0):
    """A GLORIA plot: a square pegged out on a summit and counted every year."""
    w = 44 * k
    g = [f'<path d="{SG.poly([(x - w, y), (x, y - w * 0.42), (x + w, y), (x, y + w * 0.42)])}" '
         f'fill="none" stroke="{P()["ink"]}" stroke-width="{2.6 * k:.1f}"/>']
    for i in (-0.34, 0.34):
        g.append(f'<path d="M{f1(x + i * w)} {f1(y - abs(i) * w * 0.42 - w * 0.08)}'
                 f'L{f1(x + i * w)} {f1(y + w * 0.42 - abs(i) * w * 0.42)}" '
                 f'stroke="{P()["ink"]}" stroke-width="{1.6 * k:.1f}" stroke-opacity="0.6"/>')
    return ''.join(g)


def platform(x, y, k=1.0):
    w = 70 * k
    return (f'<rect x="{f1(x - w / 2)}" y="{f1(y - 9 * k)}" width="{f1(w)}" height="{f1(9 * k)}" '
            f'fill="{P()["concrete"]}"/>'
            f'<path d="M{f1(x - w / 2)} {f1(y - 9 * k)}l0 {f1(-22 * k)}'
            f'M{f1(x + w / 2)} {f1(y - 9 * k)}l0 {f1(-22 * k)}'
            f'M{f1(x - w / 2)} {f1(y - 31 * k)}L{f1(x + w / 2)} {f1(y - 31 * k)}" '
            f'fill="none" stroke="{P()["ink"]}" stroke-width="{3 * k:.1f}"/>')


def dam(x, y, k=1.0, h=120):
    h *= k
    return (f'<path d="{SG.poly([(x - 26 * k, y), (x - 13 * k, y - h), (x + 13 * k, y - h), (x + 26 * k, y)])}" '
            f'fill="{P()["concrete"]}" stroke="{P()["ink"]}" stroke-width="{2.4 * k:.1f}"/>')


def bus(x, y, k=1.0):
    w, h = 76 * k, 34 * k
    g = [f'<rect x="{f1(x - w / 2)}" y="{f1(y - h - 7 * k)}" width="{f1(w)}" height="{f1(h)}" '
         f'rx="{f1(6 * k)}" fill="{P()["bus"]}"/>']
    for i in range(3):
        g.append(f'<rect x="{f1(x - w * 0.38 + i * w * 0.26)}" y="{f1(y - h - 1 * k)}" '
                 f'width="{f1(w * 0.18)}" height="{f1(h * 0.42)}" fill="{P()["light"]}" fill-opacity="0.8"/>')
    for s in (-1, 1):
        g.append(f'<circle cx="{f1(x + s * w * 0.3)}" cy="{f1(y - 5 * k)}" r="{f1(7 * k)}" fill="{P()["ink"]}"/>')
    return ''.join(g)


def barrier(x, y, k=1.0):
    h = 54 * k
    return (f'<path d="M{f1(x)} {f1(y)}l0 {f1(-h)}" stroke="{P()["ink"]}" stroke-width="{4 * k:.1f}"/>'
            f'<path d="M{f1(x - 4 * k)} {f1(y - h + 8 * k)}L{f1(x + 54 * k)} {f1(y - h + 20 * k)}" '
            f'stroke="{P()["red"]}" stroke-width="{7 * k:.1f}" stroke-linecap="round"/>')


def easel(x, y, k=1.0):
    h = 74 * k
    return (f'<path d="M{f1(x - 22 * k)} {f1(y)}L{f1(x)} {f1(y - h)}L{f1(x + 22 * k)} {f1(y)}" '
            f'fill="none" stroke="{P()["ink"]}" stroke-width="{3.2 * k:.1f}"/>'
            f'<rect x="{f1(x - 26 * k)}" y="{f1(y - h * 0.92)}" width="{f1(52 * k)}" '
            f'height="{f1(40 * k)}" fill="{P()["light"]}" stroke="{P()["ink"]}" '
            f'stroke-width="{2.6 * k:.1f}"/>')


def pit(x, y, k=1.0, layers=4):
    """A snow pit, its winter read off the wall."""
    w, h = 54 * k, 60 * k
    g = [f'<rect x="{f1(x - w / 2)}" y="{f1(y - h)}" width="{f1(w)}" height="{f1(h)}" fill="{P()["snow"]}"/>']
    for i in range(1, layers):
        yy = y - h + i * h / layers
        g.append(f'<path d="M{f1(x - w / 2)} {f1(yy)}L{f1(x + w / 2)} {f1(yy)}" '
                 f'stroke="{P()["iceLine"]}" stroke-width="{2.4 * k:.1f}" stroke-opacity="0.8"/>')
    g.append(f'<rect x="{f1(x - w / 2)}" y="{f1(y - h)}" width="{f1(w)}" height="{f1(h)}" '
             f'fill="none" stroke="{P()["ink"]}" stroke-width="{2.4 * k:.1f}"/>')
    return ''.join(g)


def borehole(x, y, k=1.0, depth=90):
    """Thermistors down a hole in frozen rock, reading it warm."""
    d = depth * k
    g = [f'<path d="M{f1(x)} {f1(y)}l0 {f1(d)}" stroke="{P()["ink"]}" stroke-width="{3.4 * k:.1f}"/>']
    for i in range(1, 5):
        g.append(f'<circle cx="{f1(x)}" cy="{f1(y + d * i / 5)}" r="{f1(4 * k)}" fill="{P()["red"]}"/>')
    g.append(f'<rect x="{f1(x - 11 * k)}" y="{f1(y - 17 * k)}" width="{f1(22 * k)}" '
             f'height="{f1(17 * k)}" fill="{P()["light"]}" stroke="{P()["ink"]}" '
             f'stroke-width="{2.2 * k:.1f}"/>')
    return ''.join(g)


def crate(x, y, k=1.0):
    w, h = 34 * k, 22 * k
    return (f'<rect x="{f1(x - w / 2)}" y="{f1(y - h)}" width="{f1(w)}" height="{f1(h)}" '
            f'fill="{P()["thatch"]}" stroke="{P()["ink"]}" stroke-width="{2 * k:.1f}"/>'
            f'<path d="M{f1(x - w / 2)} {f1(y - h * 0.5)}L{f1(x + w / 2)} {f1(y - h * 0.5)}" '
            f'stroke="{P()["ink"]}" stroke-width="{1.8 * k:.1f}" stroke-opacity="0.6"/>')


def arrows_up(sc, xs, rise=66, col=None):
    """What is moving, and which way."""
    for x in xs:
        y = sc.y(x) - 10
        c = col or P()['red']
        sc.stroke('Detail', SG.poly([(x, y), (x, y - rise)], False), c, 3.4)
        sc.stroke('Detail', SG.poly([(x - 9, y - rise + 13), (x, y - rise), (x + 9, y - rise + 13)], False), c, 3.4)


def scatter(sc, layer, fn, x0, x1, n, seed=3, lift=0, **kw):
    rng = np.random.default_rng(seed)
    for _ in range(n):
        x = float(rng.uniform(x0, x1))
        sc.put(layer, fn(x, sc.y(x) + lift + float(rng.uniform(-6, 18)), **kw))


# ---------------------------------------------------------------------------
# The twenty-five scenes, each read from its draft.
# ---------------------------------------------------------------------------
def s01(sc):
    """Glaciers — the watching of the ice, and the ice going anyway."""
    sc.sky([(300, 300, 560, 0.52), (1430, 380, 430, 0.46)])
    # a bed well below the surface, so the ice reads as a body and not as a skin
    bed = [(0, 1020), (190, 1016), (320, 1040), (430, 1092), (540, 1108), (640, 1078),
           (730, 1030), (880, 992), (1040, 946), (1220, 894), (1420, 836), (1620, 776), (1800, 722)]
    sc.ground(bed)
    now = [(690, 1024), (790, 906), (950, 808), (1140, 712), (1340, 624), (1560, 534), (1800, 446)]
    then = [(392, 1062), (520, 900), (700, 790), (900, 696), (1120, 602), (1360, 508), (1600, 418), (1800, 348)]
    xs = list(range(690, 1801, 10))
    sc.shape('Ground', [(x, SG.at_x(now, x)) for x in xs] + [(x, SG.at_x(bed, x)) for x in reversed(xs)],
             P()['glacier'], smooth=True)
    sc.shape('Ground', [(x, SG.at_x(now, x)) for x in xs] + [(x, SG.at_x(now, x) + 34) for x in reversed(xs)],
             SG.mix(P()['snow'], P()['glacier'], 0.4), smooth=True)
    sc.profile = [(x, SG.at_x(now, x) if x >= 690 else SG.at_x(bed, x)) for x in range(0, 1801, 10)]
    sc.ghost(then, 392, 1800, 'ice surface in 2000')
    sc.profile = bed
    sc.water(300, 686, 1038)
    for yr, x in (('2000', 392), ('1975', 196)):
        sc.marker(x, yr)
    for x in (900, 1080, 1270, 1460):
        sc.put('Built', stake(x, SG.at_x(now, x) + 3, 1.15))
    party = [(1560, SG.at_x(now, 1560)), (1640, SG.at_x(now, 1640)), (1720, SG.at_x(now, 1720))]
    sc.stroke('Figures', ''.join(SG.poly([(a[0], a[1] - 30), (b[0], b[1] - 30)], False)
                                 for a, b in zip(party, party[1:])), P()['red'], 3.6)
    for i, (x, y) in enumerate(party):
        sc.put('Figures', SG.figure(x, y + 2, 1.05, staff=i == 0, load=i == 2, flip=-1))
    sc.put('Built', aws(176, sc.y(176) + 6, 1.15))
    sc.put('Air', drone(820, 672, 1.1, drop=SG.at_x(now, 820) - 690))
    sc.put('Air', satellite(1320, 180, 1.05, beam=(1190, 560, 190)))


def s02(sc):
    """Observation systems — a network that thins exactly where it matters."""
    sc.sky([(380, 320, 500, 0.5), (1210, 360, 400, 0.44)])
    sc.ground(SG.slope(1060, 330, bow=10))
    scatter(sc, 'Flora', SG.conifer, 40, 760, 46, seed=2, k=1.25)
    for x in (110, 230, 350, 470, 600, 730):               # dense below
        sc.put('Built', SG.mast(x, sc.y(x), 1.0))
    sc.put('Built', SG.mast(1140, sc.y(1140), 1.15))        # and almost nothing above
    sc.put('Built', SG.mast(1620, sc.y(1620), 1.15, dish=True))
    # the thinning said on the ground itself, not floating over it
    sc.bands([(0, 880, SG.mix(P()['fieldGreen'], P()['sky1'], 0.35), 'a record you can trust'),
              (880, 1800, SG.mix(P()['scree'], P()['sky1'], 0.45), 'and above here, guesswork')],
             thickness=74)
    sc.put('Figures', SG.figure(1300, sc.y(1300), 1.15, load=True, staff=True))
    sc.put('Figures', SG.figure(640, sc.y(640), 1.05))


def s03(sc):
    """Elevation-dependent change — the belts of Kilimanjaro, climbing."""
    sc.sky([(1400, 420, 330, 0.74)])
    sc.ground(SG.slope(1100, 300, bow=40))
    sc.bands([(0, 300, SG.weigh(P()['field'], 0.15), 'savannah'),
              (300, 640, P()['terrace'], 'farmland'),
              (640, 980, P()['forest'], 'rainforest'),
              (980, 1270, P()['alpine'], 'moorland'),
              (1270, 1560, P()['dry'], 'alpine desert'),
              (1560, 1800, P()['glacier'], 'ice')], thickness=94)
    sc.stroke('Ghost', SG.curve([(x, sc.y(x) + 150) for x in range(0, 1801, 60)]),
              P()['dateInk'], 3.4, dash='15 11')
    sc.text(170, sc.y(170) + 196, 'where the boundaries were', col=P()['dateInk'])
    arrows_up(sc, (470, 810, 1120, 1420), rise=78)


def s04(sc):
    """Social dimensions — 16,078 bodies of ice, and the people beneath them."""
    sc.sky([(560, 420, 390, 0.44), (1290, 460, 300, 0.34)])
    sc.ground([(0, 1040), (380, 1034), (700, 1020), (900, 964), (1110, 836),
               (1320, 700), (1560, 586), (1800, 512)], col=SG.weigh(P()['dry'], 0.34))
    # the inventory lies on the mountain, because that is what it maps
    rng = np.random.default_rng(4)
    for _ in range(72):
        x = float(rng.uniform(900, 1790))
        y = sc.y(x) - float(rng.uniform(8, 190))
        if y < 210:
            continue
        sc.put('Detail', f'<ellipse cx="{f1(x)}" cy="{f1(y)}" rx="{f1(rng.uniform(13, 32))}" '
                         f'ry="{f1(rng.uniform(7, 16))}" fill="{P()["glacier"]}" fill-opacity="0.22" '
                         f'stroke="{P()["iceLine"]}" stroke-width="2" '
                         f'transform="rotate({rng.uniform(-28, 28):.0f} {f1(x)} {f1(y)})"/>')
    sc.text(1000, 268, '16,078 bodies of ice', col=P()['dateInk'])
    # and the work of counting them, large in the foreground where it can be seen
    sc.put('Built', SG.document(250, sc.y(250) + 10, 3.4))
    sc.put('Figures', SG.figure(430, sc.y(430) + 16, 2.1, flip=-1))
    sc.put('Figures', SG.figure(600, sc.y(600) + 16, 1.9, load=True))
    sc.put('Figures', SG.figure(730, sc.y(730) + 14, 1.75, staff=True))


def s05(sc):
    """Water towers — what women grow with the runoff, downstream of the ice."""
    sc.sky([(1480, 380, 300, 0.7)])
    sc.ground(SG.plain_and_massif(990, 300))
    xs = list(range(1400, 1801, 20))
    sc.shape('Ground', [(x, sc.y(x)) for x in xs] + [(x, sc.y(x) + 70) for x in reversed(xs)],
             P()['glacier'], smooth=True)
    sc.stroke('Water', SG.curve([(1420, sc.y(1420) + 40), (1150, sc.y(1150) + 30),
                                 (900, sc.y(900) + 20), (620, sc.y(620) + 16)]), P()['waterLine'], 6)
    sc.stroke('Water', SG.curve([(620, sc.y(620) + 16), (420, sc.y(420) + 26), (120, sc.y(120) + 30)]),
              P()['waterLine'], 8)
    for i, x0 in enumerate(range(90, 760, 150)):
        col = [P()['fieldGreen'], P()['fieldOchre'], P()['paddyGreen2']][i % 3]
        sc.bands([(x0, x0 + 120, col, '')], thickness=56, names=False)
    for x in (200, 430, 660):
        sc.put('Figures', SG.figure(x, sc.y(x) + 18, 0.95, bent=True))
    for x in (330, 560):
        sc.put('Built', crate(x, sc.y(x) + 22))
    sc.text(140, sc.y(140) + 130, 'runoff, and what it grows')


def s06(sc):
    """Biodiversity — the summit as refuge, and then as trap."""
    sc.sky([(900, 520, 250, 0.8)])
    sc.ground(SG.cone(300, 1050, 820))
    sc.bands([(260, 620, P()['forest'], ''), (620, 820, P()['alpine'], ''),
              (820, 980, P()['scree'], ''), (980, 1180, P()['alpine'], ''),
              (1180, 1540, P()['forest'], '')], thickness=80, names=False)
    for x in (780, 900, 1020):
        sc.put('Built', quadrat(x, sc.y(x) + 16, 0.95))
    arrows_up(sc, (690, 1110), rise=86)
    sc.put('Figures', SG.figure(640, sc.y(640), 0.9, bent=True))
    sc.text(900, 240, 'nowhere higher to go', col=P()['dateInk'], anchor='middle')


def s07(sc):
    """Forests — the stand that stops what is coming down the slope."""
    sc.sky([(1340, 380, 340, 0.5)])
    sc.ground(SG.slope(1040, 350, bow=14))
    sc.sub([(40, SG.weigh(P()['soil'], 0.05), 'soil'),
            (54, SG.weigh(P()['soil'], 0.4), 'carbon')])
    # a stand with depth, not a row along the line
    rng = np.random.default_rng(77)
    for _ in range(140):
        x = float(rng.uniform(60, 1320))
        sc.put('Flora', SG.conifer(x, sc.y(x) + float(rng.uniform(-10, 62)),
                                   float(rng.uniform(0.85, 1.5))))
    # the boulder, and where it stopped
    sc.stroke('Detail', SG.curve([(1700, sc.y(1700) - 46), (1520, sc.y(1520) - 18), (1360, sc.y(1360) + 4)]),
              P()['hazard'], 5.0, dash='15 10')
    for x, r in ((1620, 13), (1500, 16), (1410, 20)):
        sc.put('Detail', f'<ellipse cx="{f1(x)}" cy="{f1(sc.y(x) + 6)}" rx="{r}" ry="{r * 0.75}" '
                         f'fill="{P()["till"]}"/>')
    sc.put('Detail', f'<ellipse cx="1330" cy="{f1(sc.y(1330) + 10)}" rx="30" ry="24" '
                     f'fill="{P()["till"]}" stroke="{P()["ink"]}" stroke-width="2.4"/>')
    sc.text(1296, sc.y(1296) + 76, 'stopped here', col=P()['hazard'], anchor='middle')


def s08(sc):
    """Adaptation — the question, and the answer nobody expected."""
    sc.sky([(500, 400, 470, 0.78), (1400, 380, 430, 0.74)])
    sc.ground(SG.valley(1000, 460, 0.52))
    sc.bands([(560, 1240, P()['terrace'], '')], thickness=70, names=False)
    for x in (640, 760, 880):
        sc.put('Built', SG.house(x, sc.y(x) + 26))
    scatter(sc, 'Flora', SG.broadleaf, 1000, 1500, 9, seed=8, k=0.9)
    sc.put('Figures', SG.figure(1180, sc.y(1180) + 10, 1.15, staff=True))
    sc.put('Figures', SG.figure(1290, sc.y(1290) + 10, 1.15, flip=-1))
    sc.put('Figures', SG.figure(1240, sc.y(1240) - 4, 0.95, load=True))


def s09(sc):
    """Cascading hazards — a buffer stretched both ways."""
    sc.sky([(1450, 420, 330, 0.72)])
    sc.ground(SG.plain_and_massif(970, 320))
    sc.sub([(60, SG.weigh(P()['forest'], 0.25), 'forest and soil'),
            (80, SG.weigh(P()['water'], 0.45), 'the water they hold')])
    sc.ghost([(x, sc.y(x) - 92) for x in range(0, 900, 60)], 0, 860, 'the 2023 flood', hatch='flood')
    sc.stroke('Water', SG.curve([(60, sc.y(60) + 10), (380, sc.y(380) + 6), (700, sc.y(700))]),
              P()['waterLine'], 4, dash='12 9', op=0.9)
    for x in (430, 530, 620):
        sc.put('Figures', SG.beast(x, sc.y(x) + 14, 0.95))
    sc.text(120, sc.y(120) + 190, 'and the 2020-23 drought', col=P()['dateInk'])


def s10(sc):
    """Agriculture — Ghunsa: potatoes for the household and for the lodge."""
    sc.sky([(420, 400, 450, 0.78), (1420, 420, 400, 0.7)])
    sc.ground(SG.valley(1010, 450, 0.5))
    for i in range(4):
        sc.bands([(520 + i * 30, 1280 - i * 30,
                   P()['terrace'] if i % 2 else P()['fieldGreen'], '')], thickness=44, names=False)
    for x in (640, 740):
        sc.put('Built', SG.house(x, sc.y(x) + 30))
    sc.put('Built', SG.house(1080, sc.y(1080) + 30, 1.25, roof='flat', roofcol=P()['metalRoof']))
    for x in (840, 920, 1000):
        sc.put('Figures', SG.figure(x, sc.y(x) + 34, 0.95, bent=True))
    for x in (1240, 1310):
        sc.put('Figures', SG.figure(x, sc.y(x) + 20, 0.95, load=True, staff=True))


def s11(sc):
    """Cultural landscape — Sinai: a knowledge that shaped the ground."""
    sc.sky([(700, 420, 400, 0.76), (1500, 360, 450, 0.72)])
    sc.ground(SG.slope(1020, 400, bow=50), col=SG.weigh(P()['dryrock'], 0.12))
    for x0 in (260, 560, 860):
        sc.shape('Bands', [(x0, sc.y(x0)), (x0 + 170, sc.y(x0 + 170)),
                           (x0 + 170, sc.y(x0 + 170) + 62), (x0, sc.y(x0) + 62)],
                 P()['fieldGreen'], smooth=True)
        sc.stroke('Detail', SG.poly([(x0, sc.y(x0)), (x0 + 170, sc.y(x0 + 170))], False),
                  P()['moraineCrest'], 5)
        sc.put('Flora', SG.broadleaf(x0 + 60, sc.y(x0 + 60) + 40, 0.8))
        sc.put('Flora', SG.broadleaf(x0 + 120, sc.y(x0 + 120) + 44, 0.7))
    sc.stroke('Water', SG.curve([(180, sc.y(180) + 80), (640, sc.y(640) + 72), (1100, sc.y(1100) + 62)]),
              P()['waterLine'], 5, dash='3 7')
    sc.put('Built', SG.house(1420, sc.y(1420) + 8, 1.4, roof='flat', roofcol=P()['dome']))
    for x in (1180, 1250):
        sc.put('Figures', SG.figure(x, sc.y(x) + 20, 0.95, staff=True))


def s12(sc):
    """Equity — who is free to be here, and who is turned back."""
    sc.sky([(1300, 400, 390, 0.46)])
    sc.ground(SG.slope(1040, 370, bow=16))
    sc.bands([(0, 640, SG.mix(P()['fieldGreen'], P()['sky1'], 0.05), 'open to everyone'),
              (640, 1180, SG.mix(P()['fieldOchre'], P()['sky1'], 0.2), 'if you can get there'),
              (1180, 1800, SG.mix(P()['scree'], P()['snow'], 0.3), 'and then, a few of us')],
             thickness=104)
    # many below, fewer above: the gradient is the story
    for x, k, kw in ((120, 1.35, {}), (215, 1.3, {'load': True}), (300, 1.4, {}),
                     (390, 1.25, {'flip': -1}), (470, 1.35, {}), (545, 1.3, {'staff': True})):
        sc.put('Figures', SG.figure(x, sc.y(x) + 34, k, **kw))
    sc.put('Built', barrier(700, sc.y(700) + 30, 1.5))
    sc.put('Figures', SG.figure(640, sc.y(640) + 32, 1.35, flip=-1))
    for x, k in ((900, 1.3), (1060, 1.25)):
        sc.put('Figures', SG.figure(x, sc.y(x) + 26, k, load=True))
    sc.put('Figures', SG.figure(1520, sc.y(1520) + 18, 1.3, staff=True))


def s13(sc):
    """Tourism — the platform, and the ice it was built to see."""
    sc.sky([(500, 380, 470, 0.78), (1500, 400, 360, 0.7)])
    sc.ground(SG.trough(1010, 380))
    xs = list(range(1060, 1801, 20))
    sc.shape('Ground', [(x, sc.y(x) - 48) for x in xs] + [(x, sc.y(x)) for x in reversed(xs)],
             P()['glacier'], smooth=True)
    sc.ghost([(x, sc.y(x) - 60) for x in range(520, 1801, 60)], 520, 1060, 'the ice in 2000')
    sc.put('Built', platform(470, sc.y(470), 1.2))
    for x in (420, 470, 520):
        sc.put('Figures', SG.figure(x, sc.y(x) - 34, 0.85))
    sc.put('Built', SG.warning(640, sc.y(640) - 36, 0.95))


def s14(sc):
    """Migration — a road arrived, and the village emptied along it."""
    sc.sky([(420, 400, 430, 0.78), (1440, 400, 400, 0.72)])
    sc.ground(SG.valley(1000, 440, 0.48))
    sc.stroke('Detail', SG.curve([(40, sc.y(40) + 40), (520, sc.y(520) + 46), (1000, sc.y(1000) + 52),
                                  (1480, sc.y(1480) + 40), (1780, sc.y(1780) + 10)]), P()['road'], 11)
    sc.put('Built', bus(1280, sc.y(1280) + 50))
    for x, roof in ((640, 'pitch'), (730, 'ruin'), (820, 'ruin'), (910, 'pitch')):
        sc.put('Built', SG.house(x, sc.y(x) + 18, 1.0, roof=roof))
    for x in (330, 400):
        sc.put('Figures', SG.beast(x, sc.y(x) + 24, 0.9))
    sc.put('Figures', SG.figure(1120, sc.y(1120) + 40, 1.0, load=True))


def s15(sc):
    """Peacebuilding — one forest, seven countries, a border through it."""
    sc.ground(SG.ridges(520, 800), col=SG.weigh(P()['forest'], 0.3))
    scatter(sc, 'Flora', SG.conifer, 40, 1760, 76, seed=15, k=1.0)
    bx = 980
    sc.stroke('Detail', SG.poly([(bx, 180), (bx, sc.y(bx) + 300)], False), P()['ink'], 3.0, dash='16 7 4 7')
    for y in (330, 560, 790):
        sc.put('Built', SG.flag(bx - 10, y, 0.8))
    sc.put('Figures', SG.beast(480, sc.y(480) + 40, 1.0, col=P()['yak']))
    sc.put('Figures', SG.beast(1380, sc.y(1380) + 40, 0.9, col=P()['yak']))
    for x in (760, 1200):
        sc.put('Figures', SG.figure(x, sc.y(x) + 56))


def s16(sc):
    """Urbanisation — three decades of a settlement spreading, from orbit."""
    sc.sky([(380, 400, 440, 0.8), (1480, 420, 380, 0.72)])
    sc.ground(SG.valley(1000, 430, 0.5))
    sc.bands([(620, 1180, SG.mix(P()['town'], P()['sky1'], 0.45), '')], thickness=66, names=False)
    sc.bands([(540, 1300, SG.mix(P()['town'], P()['sky1'], 0.2), '')], thickness=44, names=False)
    sc.bands([(470, 1400, P()['town'], '')], thickness=26, names=False)
    sc.text(470, sc.y(470) + 118, '1995', col=P()['dateInk'], size=20, italic=False)
    sc.text(1400, sc.y(1400) + 60, '2026', col=P()['dateInk'], size=20, anchor='end', italic=False)
    for x in (700, 800, 900, 1000, 1100):
        sc.put('Built', SG.house(x, sc.y(x) + 22, 0.85, roof='flat', roofcol=P()['metalRoof']))
    sc.stroke('Detail', SG.curve([(1620, sc.y(1620) - 180), (1500, sc.y(1500) - 60), (1420, sc.y(1420) + 10)]),
              P()['hazard'], 15, op=0.75)
    sc.put('Air', satellite(1180, 180, 1.0, beam=(980, 560, 300)))


def s17(sc):
    """Indigenous knowledge — the falcons came back because a village decided."""
    sc.ground(SG.ridges(560, 820), col=SG.weigh(P()['forest'], 0.28))
    scatter(sc, 'Flora', SG.conifer, 40, 1760, 64, seed=17, k=1.0)
    rng = np.random.default_rng(170)
    for i in range(54):
        t = i / 53
        sc.put('Air', SG.bird(120 + t * 1600,
                              300 - 150 * np.sin(np.pi * t) + float(rng.normal(0, 34)),
                              float(rng.uniform(0.8, 1.5))))
    sc.text(170, 160, '22,000 km, twice a year', col=P()['dateInk'])
    for i, x in enumerate((820, 900, 980, 1060)):
        sc.put('Figures', SG.figure(x, sc.y(x) + (60 if i in (0, 3) else 28), 0.95,
                                    flip=-1 if i > 1 else 1))


def s18(sc):
    """Land tenure — one hillside, every stage of the cycle at once."""
    sc.sky([(1400, 420, 400, 0.76)])
    sc.ground(SG.slope(1050, 390, bow=36))
    sc.bands([(60, 350, P()['fieldOchre'], 'cleared'), (350, 640, P()['fieldGreen'], 'cropped'),
              (640, 930, P()['alpine'], 'three years'),
              (930, 1250, SG.mix(P()['forest'], P()['alpine'], 0.4), 'eight years'),
              (1250, 1760, P()['forest'], 'forest again')], thickness=96)
    scatter(sc, 'Flora', SG.conifer, 1280, 1740, 18, seed=18, k=0.9)
    sc.put('Built', SG.house(820, sc.y(820) - 8, 1.1))
    sc.put('Figures', SG.figure(430, sc.y(430) + 30, 0.95, bent=True))


def s19(sc):
    """Hydropower — the Alps as a battery, filled and emptied on demand."""
    sc.sky([(500, 400, 440, 0.78), (1480, 420, 360, 0.7)])
    sc.ground([(0, 1010), (240, 1004), (520, 966), (700, 898), (780, 872),
               (860, 1004), (1060, 1016), (1300, 986), (1480, 880), (1650, 700), (1800, 540)])
    sc.water(820, 1420, 898)
    sc.put('Built', dam(792, 900, 1.6, h=132))
    sc.stroke('Detail', SG.curve([(770, 880), (600, sc.y(600) + 20), (430, sc.y(430) + 18)]),
              P()['penstock'], 11)
    sc.put('Built', SG.house(330, sc.y(330) + 14, 1.2, roof='flat', roofcol=P()['powerRoof']))
    for x in (180, 90):
        sc.put('Built', SG.pylon(x, sc.y(x)))
    sc.stroke('Detail', SG.curve([(430, sc.y(430) - 60), (600, sc.y(600) - 150), (780, 820)]),
              P()['dateInk'], 3.2, dash='13 9')
    sc.text(452, sc.y(452) - 96, 'pumped back up at night', col=P()['dateInk'])


def s20(sc):
    """Global frameworks — the mountain gets into the text."""
    sc.ground([(0, 1180), (1800, 1180)], col=SG.weigh(P()['rock'], 0.3), outline=False)
    sc.put('Bands', SG.document(900, 1180, 9.6, lines=0))
    sc.shape('Built', [(726, 968), (828, 812), (898, 884), (1002, 742), (1084, 968)],
             SG.weigh(P()['rock'], 0.15))
    sc.shape('Built', [(958, 812), (1002, 742), (1046, 812), (1022, 826), (980, 828)], P()['snow'])
    for i in range(5):
        sc.stroke('Built', SG.poly([(590, 420 + i * 40), (590 + (620 if i else 430), 420 + i * 40)], False),
                  P()['ink'], 8, op=0.4)
    for i in range(3):
        sc.stroke('Built', SG.poly([(590, 1030 + i * 40),
                                    (590 + (620 if i < 2 else 330), 1030 + i * 40)], False),
                  P()['ink'], 8, op=0.4)
    sc.text(900, 330, 'what gets named gets measured', col=P()['dateInk'], anchor='middle')


def s21(sc):
    """Legal action — Palcacocha: the lake above, the town below, the claim."""
    sc.sky([(1500, 400, 340, 0.7)])
    sc.ground(SG.plain_and_massif(1000, 300))
    sc.water(1180, 1520, 560)
    for i in (-1, 0, 1):
        x = 1180 + i * 46
        sc.stroke('Detail', f'M{f1(x)} {f1(540)}Q{f1(x - 40)} {f1(500)} {f1(x - 80)} {f1(sc.y(x - 80))}',
                  P()['concrete'], 9)
    sc.stroke('Detail', SG.curve([(1140, sc.y(1140)), (900, sc.y(900) + 10), (620, sc.y(620) + 20),
                                  (360, sc.y(360) + 24)]), P()['hazard'], 5, dash='14 10')
    for x in (280, 360, 440, 520):
        sc.put('Built', SG.house(x, sc.y(x) + 26, 0.9, roof='flat', roofcol=P()['metalRoof']))
    sc.put('Built', SG.scales(820, sc.y(820) - 20, 1.2))
    sc.put('Figures', SG.figure(700, sc.y(700) + 6, 1.05, staff=True))
    sc.text(300, sc.y(300) + 130, 'the town in its path', col=P()['hazard'])


def s22(sc):
    """The arts — Chimborazo, measured and painted at the same easel."""
    sc.ground(SG.cone(260, 1060, 780))
    bands = [(330, 560, P()['glacier'], 'nieves perpetuas'), (560, 720, P()['scree'], 'paramo'),
             (720, 900, P()['alpine'], 'alpine'), (900, 1080, P()['forest'], 'ceja andina'),
             (1080, 1300, P()['fieldGreen'], 'cultivated'), (1300, 1520, P()['field'], 'plain')]
    sc.bands(bands, thickness=74)
    for (x0, x1, _c, _n) in bands:
        sc.stroke('Detail', SG.poly([(x0, sc.y(x0)), (x1, sc.y(x1))], False), P()['ink'], 1.8, op=0.4)
    sc.put('Built', easel(300, sc.y(300) + 40, 1.3))
    sc.put('Figures', SG.figure(400, sc.y(400) + 44, 1.0, flip=-1))
    sc.text(900, 190, 'the same mountain, twice', col=P()['dateInk'], anchor='middle')


def s23(sc):
    """Future scenarios — Kilimanjaro's water goes underground, and comes back."""
    sc.ground(SG.cone(330, 1030, 820, flat=150))
    sc.sub([(80, SG.weigh(P()['rock'], 0.18), 'porous rock'),
            (110, SG.weigh(P()['water'], 0.5), 'water, out of sight')])
    for x in (520, 700, 1080, 1260):
        sc.stroke('Detail', SG.curve([(x, sc.y(x) + 90), (x + (-80 if x < 900 else 80), sc.y(x) + 160)]),
                  P()['waterLine'], 3.4, dash='9 8', op=0.8)
    for x in (300, 1480):
        y = sc.y(x) + 10
        sc.put('Water', f'<ellipse cx="{f1(x)}" cy="{f1(y)}" rx="34" ry="12" fill="{P()["water"]}"/>')
        for r in (22, 40, 58):
            sc.stroke('Water', f'M{f1(x - r)} {f1(y)}a{f1(r)} {f1(r * 0.4)} 0 0 0 {f1(2 * r)} 0',
                      P()['waterLine'], 2.4, op=0.7)
    sc.put('Figures', SG.beast(1600, sc.y(1600) + 16, 1.2, kind='elephant'))
    sc.put('Figures', SG.beast(190, sc.y(190) + 16, 1.0))
    for dy in (-70, 110):
        sc.stroke('Ghost', SG.curve([(960, 350), (1240, 350 + dy), (1600, 350 + dy * 2.1)]),
                  P()['dateInk'], 3.2, dash='14 10')
    sc.text(1620, 300, 'two futures', col=P()['dateInk'], anchor='end')


def s24(sc):
    """Snow — where it lies, for how long, and what reads it."""
    sc.sky([(1400, 420, 350, 0.74)])
    sc.ground(SG.slope(1070, 330, bow=40))
    xs = list(range(700, 1801, 20))
    sc.shape('Ground', [(x, sc.y(x)) for x in xs] + [(x, sc.y(x) + 60) for x in reversed(xs)],
             P()['snow'], smooth=True)
    sc.stroke('Ghost', SG.curve([(x, sc.y(x) + 150) for x in range(380, 1801, 60)]),
              P()['dateInk'], 3.4, dash='15 11')
    sc.text(400, sc.y(400) + 196, 'the old snowline', col=P()['dateInk'])
    arrows_up(sc, (620, 900), rise=74)
    sc.put('Built', pit(1180, sc.y(1180) + 20, 1.2))
    sc.put('Figures', SG.figure(1300, sc.y(1300) + 16, 0.95, bent=True))
    sc.stroke('Detail', SG.curve([(1680, sc.y(1680) - 20), (1520, sc.y(1520) + 40), (1400, sc.y(1400) + 90)]),
              P()['hazard'], 11, op=0.6)


def s25(sc):
    """Permafrost — Blatten: what came down, and what is being measured now."""
    sc.sky([(1480, 330, 200, 0.42)])
    sc.ground([(0, 1040), (300, 1036), (560, 1026), (760, 964), (980, 820),
               (1200, 650), (1430, 470), (1650, 340), (1800, 274)])
    xs = list(range(1320, 1801, 20))
    sc.shape('Ground', [(x, sc.y(x)) for x in xs] + [(x, sc.y(x) + 70) for x in reversed(xs)],
             P()['glacier'], smooth=True)
    # the track widens into a fan where it reaches the floor, as debris does
    track = [(1600, sc.y(1600) - 6), (1300, sc.y(1300) + 8), (1000, sc.y(1000) + 18),
             (700, sc.y(700) + 24), (430, sc.y(430) + 28), (250, sc.y(250) + 30)]
    back = [(250, sc.y(250) + 118), (430, sc.y(430) + 110), (700, sc.y(700) + 92),
            (1000, sc.y(1000) + 66), (1300, sc.y(1300) + 44), (1600, sc.y(1600) + 30)]
    sc.shape('Detail', track + back, SG.mix(P()['debris'], P()['shade'], 0.1), smooth=True)
    rng = np.random.default_rng(250)
    for _ in range(46):                                    # blocks in the deposit
        t = float(rng.random())
        x = 250 + t * 1300
        y = sc.y(x) + float(rng.uniform(32, 96)) * (1 - t * 0.6)
        r = float(rng.uniform(5, 15))
        sc.put('Detail', f'<ellipse cx="{f1(x)}" cy="{f1(y)}" rx="{f1(r)}" ry="{f1(r * 0.76)}" '
                         f'fill="{P()["till"]}"/>')
    for x, roof in ((230, 'ruin'), (360, 'ruin'), (500, 'pitch'), (630, 'ruin')):
        sc.put('Built', SG.house(x, sc.y(x) + 132, 2.1, roof=roof))
    sc.put('Built', borehole(1520, sc.y(1520) - 6, 1.8))
    sc.put('Built', SG.warning(900, sc.y(900) - 96, 1.5))
    sc.text(230, sc.y(230) + 208, '28 May 2025', col=P()['dateInk'], italic=False)


SCENES = {1: s01, 2: s02, 3: s03, 4: s04, 5: s05, 6: s06, 7: s07, 8: s08, 9: s09,
          10: s10, 11: s11, 12: s12, 13: s13, 14: s14, 15: s15, 16: s16, 17: s17,
          18: s18, 19: s19, 20: s20, 21: s21, 22: s22, 23: s23, 24: s24, 25: s25}


def vignette(num, out):
    sc = SG.Scene()
    SCENES[num](sc)
    station = [i + 1 for i, s in enumerate(ST.STATIONS) if s[0] == num][0]
    SG.title(sc, num, station, ST.TOPICS[num])
    open(out, 'w').write(sc.svg())
    return sc


if __name__ == '__main__':
    light = '--light' in sys.argv
    if light:
        R.use_light()
    which, out = sys.argv[1], sys.argv[2]
    if which == 'all':
        os.makedirs(out, exist_ok=True)
        for n in range(1, 26):
            p = os.path.join(out, 'vignette-%02d-%s.svg' % (n, 'light' if light else 'dark'))
            vignette(n, p)
            print('wrote', os.path.basename(p), flush=True)
        raise SystemExit(0)
    vignette(int(which), out)
    print('wrote', out)
