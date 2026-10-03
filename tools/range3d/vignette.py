"""
Story clips, version 2: flat 2-D vignettes.

Nothing here is projected or sampled. The landscape is a stack of flat masses
— ridges, ice, forefield, lake — cut so the valley reads at a glance, and the
iconography is drawn as pictograms at one weight. It is a diagram *about* the
story rather than a view *of* the place: it gives up the terrain, the land
cover and the geology the block diagram carries for free, and buys clarity, a
file a hundredth the size, and icons that can be as elaborate as the story
needs without fighting a slope for attention.

The ice is built from an axis and a half-width, not from a shape, so moving
the curve moves the tongue, its crevasses, its moraines, the forefield and the
lake together.

    python3 vignette.py 1 OUT.svg [--light]

The argument is the story's own number (1 = Glaciers); the badge carries that
story's station number on the climb.
"""
import sys

import numpy as np

import svgkit as K
import labels as LB
import render as R
import story as ST

f1 = K.f1
P = R.PAL
W, H = 1800, 1300

# --- the drawing, in numbers — adjust the vignette here ----------------------
LINE = 3.2                     # the weight the pictograms are drawn at
DETAIL = 2.4                   # linework inside the diagram

# The valley in profile, looking across it: down-valley to the left, the head
# of the glacier off to the right. Three lines carry the whole story — the bed
# the ice sits in, the surface it has today, and the surface it had in 2000 —
# and everything else is cut against them.
BED = [(0, 1028), (165, 1024), (300, 1044), (400, 1096), (505, 1112), (600, 1084),
       (690, 1042), (820, 1002), (980, 950), (1150, 886), (1330, 814), (1520, 732),
       (1700, 650), (1800, 606)]
NOW = [(665, 1032), (720, 952), (840, 864), (1000, 762), (1180, 662), (1380, 562),
       (1600, 464), (1800, 388)]
THEN = [(350, 1046), (430, 964), (560, 880), (700, 792), (880, 702), (1080, 608),
        (1300, 508), (1540, 410), (1800, 320)]
LAKE_Y = 1030                  # the water surface in the overdeepening
SNOUT = 665                    # where the ice front stands today, in x
FRONTS = [('2000', 350), ('1975', 168)]    # where it stood before, in x


def mix(a, b, t):
    """Blend two hex colours."""
    a = a.lstrip('#'); b = b.lstrip('#')
    c = [round(int(a[i:i + 2], 16) * (1 - t) + int(b[i:i + 2], 16) * t) for i in (0, 2, 4)]
    return '#%02x%02x%02x' % tuple(c)


# The palette inverts between the two themes — on the dark plate `paper` is the
# dark ground and `ink` the light mark — so tones are mixed toward things that
# mean the same in both: the sky for distance, `shade` for weight.
def recede(col, t):
    return mix(col, P['sky1'], t)


def weigh(col, t):
    return mix(col, P['shade'], t)


def poly(pts, close=True):
    d = 'M' + ' L'.join('%s %s' % (f1(x), f1(y)) for x, y in pts)
    return d + ('Z' if close else '')


def curve(pts, close=False):
    return K.d_smooth(np.asarray(pts, float), close, 1.0)


def shape(lay, pts, fill, op=1.0, smooth=False):
    d = curve(pts, True) if smooth else poly(pts, True)
    lay.append(f'<path d="{d}" fill="{fill}" fill-opacity="{op}"/>')


def stroke(lay, d, col, w=DETAIL, dash=None, op=1.0):
    da = f' stroke-dasharray="{dash}"' if dash else ''
    lay.append(f'<path d="{d}" fill="none" stroke="{col}" stroke-width="{w}" stroke-opacity="{op}"'
               f'{da} stroke-linecap="round" stroke-linejoin="round"/>')


def at_x(pts, x):
    a = np.asarray(pts, float)
    return float(np.interp(x, a[:, 0], a[:, 1]))


def landscape(doc):
    back = doc.layer('Back'); rockl = doc.layer('Rock'); ice = doc.layer('Ice')
    grd = doc.layer('Ground'); det = doc.layer('Detail')
    rng = np.random.default_rng(7)

    back.append(f'<rect width="{W}" height="{H}" fill="{P["sky1"]}"/>')
    # the range behind, held well back so the section reads in front of it
    for (xm, half, y, t) in [(250, 330, 520, 0.76), (790, 300, 470, 0.82), (1390, 400, 392, 0.70)]:
        shape(back, [(xm - half, 1020), (xm, y), (xm + half, 1020)], recede(P['rock'], t))
        shape(back, [(xm - half * 0.34, y + half * 0.34), (xm, y), (xm + half * 0.34, y + half * 0.34),
                     (xm + half * 0.15, y + half * 0.42), (xm - half * 0.15, y + half * 0.42)],
              recede(P['snow'], t * 0.8))

    # the rock the ice sits in — drawn first, so the ice lies in it
    xs_all = list(range(0, 1801, 10))
    shape(rockl, [(x, at_x(BED, x)) for x in xs_all] + [(1800, 1300), (0, 1300)], weigh(P['rock'], 0.10))
    shape(rockl, [(x, at_x(BED, x) + 150) for x in xs_all] + [(1800, 1300), (0, 1300)],
          weigh(P['rock'], 0.40), smooth=True)
    stroke(rockl, curve([(x, at_x(BED, x)) for x in xs_all]), P['inkSoft'], 3.0, op=0.7)

    # the ice that has gone: everything between the 2000 surface and today's.
    # This wedge is the story — the measuring in the picture is what found it.
    xs = list(range(350, 1801, 12))
    lost = [(x, at_x(THEN, x)) for x in xs]
    lost += [(x, at_x(BED, x) if x < SNOUT else at_x(NOW, x)) for x in reversed(xs)]
    shape(ice, lost, recede(P['glacier'], 0.70), smooth=True)
    doc.defs.append(
        f'<pattern id="gone" width="17" height="17" patternTransform="rotate(40)" '
        f'patternUnits="userSpaceOnUse">'
        f'<path d="M0 0 L0 17" stroke="{P["iceLine"]}" stroke-width="1.5" stroke-opacity="0.45"/></pattern>')
    shape(ice, lost, 'url(#gone)', smooth=True)

    # the ice there is now
    xs2 = list(range(SNOUT, 1801, 10))
    shape(ice, [(x, at_x(NOW, x)) for x in xs2] + [(x, at_x(BED, x)) for x in reversed(xs2)],
          P['glacier'], smooth=True)
    shape(ice, [(x, at_x(NOW, x)) for x in xs2] + [(x, at_x(NOW, x) + 30) for x in reversed(xs2)],
          mix(P['snow'], P['glacier'], 0.35), smooth=True)
    stroke(ice, curve([(x, at_x(NOW, x)) for x in xs2]), mix(P['iceLine'], P['snow'], 0.3), 2.6, op=0.9)

    # crevasses, opening where the surface steepens
    d = []
    for x in range(770, 1740, 88):
        x += rng.integers(-22, 23)
        y = at_x(NOW, x)
        steep = min(1.0, abs(at_x(NOW, x + 70) - y) / 54)
        if steep < 0.42:
            continue                                   # the ice only splits where it is pulled
        h = (20 + 46 * steep) * rng.uniform(0.8, 1.2)
        d.append(poly([(x, y + 6), (x - h * 0.42, y + 6 + h)], False))
    stroke(det, ''.join(d), P['crevasse'], DETAIL + 0.6, op=0.8)

    # the 2000 surface, drawn as the measurement it is
    stroke(det, curve([(x, at_x(THEN, x)) for x in range(350, 1801, 12)]),
           P['dateInk'], 3.6, dash='17 11', op=0.95)
    doc.layer('Labels').append(
        LB.halo(1015, at_x(THEN, 1015) - 22, 'ice surface in 2000', P, 24, col=P['dateInk'], italic=True))

    # the lake left in the overdeepening as the front drew back
    lx = [x for x in range(290, SNOUT + 2, 6) if at_x(BED, x) > LAKE_Y]
    if lx:
        lx = list(range(min(lx), max(lx) + 1, 6))
        shape(grd, [(x, LAKE_Y) for x in lx] + [(x, at_x(BED, x)) for x in reversed(lx)],
              P['water'], smooth=True)
        stroke(grd, poly([(lx[0], LAKE_Y), (lx[-1], LAKE_Y)], False), P['waterLine'], 3.2, op=0.9)
        for _ in range(6):                                   # bergs calved off the front
            bx = rng.uniform(lx[0] + 60, lx[-1] - 30); bw = rng.uniform(13, 26)
            shape(grd, [(bx - bw, LAKE_Y), (bx - bw * 0.5, LAKE_Y - bw * 0.6),
                        (bx + bw * 0.4, LAKE_Y - bw * 0.42), (bx + bw, LAKE_Y)],
                  mix(P['snow'], P['glacier'], 0.2))

    # where the front stood before, as ridges on the valley floor, each named
    for year, x in FRONTS:
        y = at_x(BED, x)
        arc = [(x - 70, y + 12), (x - 36, y - 20), (x, y - 32), (x + 36, y - 18), (x + 66, y + 12)]
        stroke(grd, curve([(a, b + 7) for a, b in arc]), P['shade'], 17, op=0.45)
        stroke(grd, curve(arc), P['till'], 13)
        stroke(grd, curve(arc), P['moraineCrest'], 3.6)
        doc.layer('Labels').append(
            LB.halo(x, y + 56, year, P, 24, col=P['dateInk'], italic=False, anchor='middle'))

    # meltwater, away down the valley
    stroke(grd, curve([(292, LAKE_Y + 6), (236, 1040), (140, 1046), (30, 1042)]),
           P['waterLine'], 7, op=0.95)

    # forest on ground the ice gave up long ago, boulders on what it has just left
    for _ in range(22):
        x = rng.uniform(16, 128); y = at_x(BED, x) + rng.uniform(-4, 22)
        h = rng.uniform(26, 46)
        shape(rockl, [(x, y - h), (x - h * 0.40, y), (x + h * 0.40, y)], P['forest'])
    for _ in range(20):
        x = rng.uniform(150, 310); y = at_x(BED, x) + rng.uniform(4, 28)
        r_ = rng.uniform(5, 11)
        grd.append(f'<ellipse cx="{f1(x)}" cy="{f1(y + r_ * 0.4)}" rx="{r_ * 1.3:.1f}" ry="{r_ * 0.5:.1f}" '
                   f'fill="{P["shade"]}" fill-opacity="0.4"/>')
        grd.append(f'<ellipse cx="{f1(x)}" cy="{f1(y)}" rx="{r_:.1f}" ry="{r_ * 0.75:.1f}" fill="{P["till"]}"/>')


# --- the pictograms ---------------------------------------------------------
def figure(x, y, k=1.0, staff=False, load=False, flip=1):
    """A person, flat: one weight, no modelling, legs straight and parallel."""
    g = []
    h = 46 * k
    g.append(f'<circle cx="{f1(x)}" cy="{f1(y - h)}" r="{8.4 * k:.1f}" fill="{P["figure"]}"/>')
    g.append(f'<path d="{poly([(x - 9.5 * k, y - h + 12 * k), (x + 9.5 * k, y - h + 12 * k), (x + 7 * k, y - 17 * k), (x - 7 * k, y - 17 * k)])}" '
             f'fill="{P["figure"]}"/>')
    for s in (-1, 1):
        g.append(f'<path d="M{f1(x + s * 3.6 * k)} {f1(y - 18 * k)}L{f1(x + s * 3.6 * k)} {f1(y)}" '
                 f'stroke="{P["figure"]}" stroke-width="{5.4 * k:.1f}" stroke-linecap="round"/>')
    if staff:
        g.append(f'<path d="M{f1(x + flip * 13 * k)} {f1(y + 3 * k)}L{f1(x + flip * 10 * k)} {f1(y - h - 10 * k)}" '
                 f'stroke="{P["ink"]}" stroke-width="{2.6 * k:.1f}" stroke-linecap="round"/>')
    if load:
        g.append(f'<rect x="{f1(x - flip * 18 * k)}" y="{f1(y - h + 8 * k)}" width="{12 * k:.1f}" '
                 f'height="{15 * k:.1f}" rx="{2.5 * k:.1f}" fill="{P["ink"]}"/>')
    return ''.join(g)


def stake_flat(x, y, k=1.0):
    """An ablation stake: drilled into the ice, read off against the surface."""
    h = 46 * k
    return (f'<ellipse cx="{f1(x)}" cy="{f1(y)}" rx="{7 * k:.1f}" ry="{2.6 * k:.1f}" '
            f'fill="{P["shade"]}" fill-opacity="0.35"/>'
            f'<path d="M{f1(x)} {f1(y)}L{f1(x)} {f1(y - h)}" stroke="{P["ink"]}" '
            f'stroke-width="{3.8 * k:.1f}" stroke-linecap="round"/>'
            f'<path d="M{f1(x - 9 * k)} {f1(y - h)}L{f1(x + 9 * k)} {f1(y - h)}" stroke="{P["red"]}" '
            f'stroke-width="{6.6 * k:.1f}" stroke-linecap="round"/>'
            f'<path d="M{f1(x - 7 * k)} {f1(y - h * 0.5)}L{f1(x + 7 * k)} {f1(y - h * 0.5)}" '
            f'stroke="{P["light"]}" stroke-width="{2.6 * k:.1f}"/>')


def aws_flat(x, y, k=1.0):
    """Automatic weather station: mast, cups, radiation shield, solar panel —
    the instrument that keeps reading through a winter nobody is there for."""
    h = 124 * k
    g = [f'<path d="M{f1(x - 28 * k)} {f1(y)}L{f1(x)} {f1(y - h * 0.8)}L{f1(x + 28 * k)} {f1(y)}" '
         f'fill="none" stroke="{P["ink"]}" stroke-width="{2.4 * k:.1f}" stroke-opacity="0.6"/>',
         f'<path d="M{f1(x)} {f1(y)}L{f1(x)} {f1(y - h)}" stroke="{P["ink"]}" '
         f'stroke-width="{5.2 * k:.1f}" stroke-linecap="round"/>']
    ay = y - h + 6 * k
    g.append(f'<path d="M{f1(x - 22 * k)} {f1(ay)}L{f1(x + 22 * k)} {f1(ay)}" stroke="{P["ink"]}" '
             f'stroke-width="{3.4 * k:.1f}" stroke-linecap="round"/>')
    for s in (-1, 1):
        g.append(f'<circle cx="{f1(x + s * 22 * k)}" cy="{f1(ay)}" r="{6.4 * k:.1f}" fill="{P["light"]}" '
                 f'stroke="{P["ink"]}" stroke-width="{2.2 * k:.1f}"/>')
    g.append(f'<path d="M{f1(x)} {f1(y - h)}l0 {f1(-14 * k)}" stroke="{P["ink"]}" stroke-width="{3.2 * k:.1f}"/>')
    g.append(f'<circle cx="{f1(x)}" cy="{f1(y - h - 16 * k)}" r="{5.2 * k:.1f}" fill="{P["ink"]}"/>')
    g.append(f'<path d="{poly([(x - 10 * k, y - h * 0.57), (x + 10 * k, y - h * 0.57), (x + 7.5 * k, y - h * 0.45), (x - 7.5 * k, y - h * 0.45)])}" '
             f'fill="{P["light"]}" stroke="{P["ink"]}" stroke-width="{2.2 * k:.1f}"/>')
    g.append(f'<path d="{poly([(x + 5 * k, y - h * 0.35), (x + 40 * k, y - h * 0.41), (x + 40 * k, y - h * 0.27), (x + 5 * k, y - h * 0.21)])}" '
             f'fill="{P["solar"]}" stroke="{P["solarFrame"]}" stroke-width="{2.2 * k:.1f}"/>')
    return ''.join(g)


def drone_flat(x, y, k=1.0, drop=190):
    """A survey drone, with the line down to the patch of ice it is mapping."""
    g = [f'<path d="M{f1(x)} {f1(y + 16 * k)}L{f1(x)} {f1(y + drop)}" stroke="{P["inkSoft"]}" '
         f'stroke-width="{2.4 * k:.1f}" stroke-dasharray="8 10" stroke-opacity="0.7"/>',
         f'<ellipse cx="{f1(x)}" cy="{f1(y + drop)}" rx="{17 * k:.1f}" ry="{5.5 * k:.1f}" '
         f'fill="{P["shade"]}" fill-opacity="0.35"/>']
    arm = 36 * k
    for s in (-1, 1):
        for dy, f_ in ((-11 * k, 1.0), (8 * k, 0.72)):
            g.append(f'<path d="M{f1(x + s * 6 * k)} {f1(y)}L{f1(x + s * arm * f_)} {f1(y + dy)}" '
                     f'stroke="{P["ink"]}" stroke-width="{3.8 * k:.1f}" stroke-linecap="round"/>')
            g.append(f'<path d="M{f1(x + s * arm * f_ - 20 * k)} {f1(y + dy)}'
                     f'A{f1(20 * k)} {f1(5.5 * k)} 0 1 1 {f1(x + s * arm * f_ + 20 * k)} {f1(y + dy)}" '
                     f'fill="none" stroke="{P["ink"]}" stroke-width="{2.6 * k:.1f}" stroke-opacity="0.75"/>')
    g.append(f'<rect x="{f1(x - 18 * k)}" y="{f1(y - 11 * k)}" width="{36 * k:.1f}" height="{24 * k:.1f}" '
             f'rx="{7 * k:.1f}" fill="{P["ink"]}" stroke="{P["light"]}" stroke-width="{2.2 * k:.1f}"/>')
    g.append(f'<circle cx="{f1(x)}" cy="{f1(y + 17 * k)}" r="{7 * k:.1f}" fill="{P["light"]}"/>')
    return ''.join(g)


def satellite_flat(x, y, k=1.0, beam=None):
    """The other half of the observing system: the pass overhead that turned a
    few hundred measured glaciers into a quarter of a million mapped ones."""
    g = []
    if beam is not None:
        bx, by, bw = beam
        g.append(f'<path d="{poly([(x - 18 * k, y + 24 * k), (bx - bw, by), (bx + bw, by), (x + 18 * k, y + 24 * k)])}" '
                 f'fill="{P["light"]}" fill-opacity="0.045" stroke="{P["light"]}" stroke-width="2.4" '
                 f'stroke-dasharray="13 11" stroke-opacity="0.34"/>')
    g.append(f'<rect x="{f1(x - 18 * k)}" y="{f1(y - 16 * k)}" width="{36 * k:.1f}" height="{32 * k:.1f}" '
             f'rx="{5 * k:.1f}" fill="{P["ink"]}" stroke="{P["light"]}" stroke-width="{2.6 * k:.1f}"/>')
    for s in (-1, 1):
        g.append(f'<path d="M{f1(x + s * 18 * k)} {f1(y)}L{f1(x + s * 32 * k)} {f1(y)}" '
                 f'stroke="{P["solarFrame"]}" stroke-width="{2.8 * k:.1f}"/>')
        g.append(f'<rect x="{f1(x + (32 * k if s > 0 else -76 * k))}" y="{f1(y - 13 * k)}" '
                 f'width="{44 * k:.1f}" height="{26 * k:.1f}" fill="{P["solar"]}" '
                 f'stroke="{P["solarFrame"]}" stroke-width="{2.6 * k:.1f}"/>')
        for i in range(1, 3):
            xx = x + (32 * k if s > 0 else -76 * k) + i * 44 * k / 3
            g.append(f'<path d="M{f1(xx)} {f1(y - 13 * k)}l0 {f1(26 * k)}" stroke="{P["solarFrame"]}" '
                     f'stroke-width="{1.6 * k:.1f}"/>')
    g.append(f'<path d="M{f1(x)} {f1(y + 16 * k)}l0 {f1(13 * k)}" stroke="{P["light"]}" stroke-width="{3.2 * k:.1f}"/>')
    g.append(f'<path d="M{f1(x - 14 * k)} {f1(y + 44 * k)}A{f1(18 * k)} {f1(18 * k)} 0 0 1 {f1(x + 14 * k)} {f1(y + 44 * k)}Z" '
             f'fill="{P["light"]}" fill-opacity="0.9"/>')
    return ''.join(g)


def instruments(doc):
    """Story 1's iconography: what it now takes to watch a glacier.

    The narrative's centre is not the ice but the observing of it — a line of
    stakes and a roped party on the tongue, a weather station on the moraine, a
    drone over the front, a satellite above all of them. Together they make the
    story's own argument: the measuring has been transformed, and the ice is
    going anyway. The pale hatched wedge is what the measuring found."""
    air = doc.layer('Air'); ppl = doc.layer('People'); inf = doc.layer('Instruments')

    for x in (905, 1075, 1250, 1430):
        inf.append(stake_flat(x, at_x(NOW, x) + 3, 1.0))

    party = [(1545, at_x(NOW, 1545)), (1615, at_x(NOW, 1615)), (1685, at_x(NOW, 1685))]
    rope = ''.join(poly([(party[i][0], party[i][1] - 28), (party[i + 1][0], party[i + 1][1] - 28)], False)
                   for i in range(len(party) - 1))
    ppl.append(f'<path d="{rope}" stroke="{P["red"]}" stroke-width="3.6" stroke-linecap="round"/>')
    for i, (x, y) in enumerate(party):
        ppl.append(figure(x, y + 2, 0.95, staff=i == 0, load=i == 2, flip=-1))

    inf.append(aws_flat(222, at_x(BED, 222) + 4, 1.0))
    air.append(drone_flat(800, 690, 1.0, drop=at_x(NOW, 800) - 706))
    air.append(satellite_flat(1255, 150, 1.0, beam=(1120, 600, 225)))


def title(doc, num, station):
    lay = doc.layer('Title')
    lay.append(f'<circle cx="86" cy="70" r="27" fill="{P["markerFill"]}" stroke="{P["red"]}" stroke-width="3.2"/>')
    lay.append(f'<text x="86" y="79" text-anchor="middle" font-family="{K.SANS}" font-weight="700" '
               f'font-size="25" fill="{P["markerText"]}">{station}</text>')
    lay.append(LB.halo(130, 80, ST.TOPICS[num].replace('&', '&amp;'), P, 32, italic=False, weight=600,
                       col=P['titleInk']))


def vignette(num, out):
    doc = K.Doc(W, H, P['sky1'])
    for nm in ['Back', 'Rock', 'Ice', 'Ground', 'Detail', 'Instruments', 'People', 'Air',
               'Labels', 'Title']:
        doc.layer(nm)
    landscape(doc)
    instruments(doc)
    station = [i + 1 for i, s in enumerate(ST.STATIONS) if s[0] == num][0]
    title(doc, num, station)
    open(out, 'w').write(doc.svg())
    return doc


if __name__ == '__main__':
    if '--light' in sys.argv:
        R.use_light()
        P = R.PAL
    num, out = int(sys.argv[1]), sys.argv[2]
    vignette(num, out)
    print('wrote', out)
