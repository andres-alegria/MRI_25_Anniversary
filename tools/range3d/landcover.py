"""
What covers the ground: ice, snow, rock, scree, alpine grassland, forest,
farmland, the town and water — one class per world-grid cell, decided from
height, steepness, the direction a slope faces, drainage and a few designed
places (the town, the terraces, the paddies).

The altitudinal zonation is deliberately generic, of a tropical-to-subtropical
high range rather than any one country: an irrigated plain with rice and
fields, montane forest, terraces cut into its lower slopes, a treeline near
2,900 m, alpine grassland grazed by herds, a periglacial belt of scree and
permafrost, and glaciers above a snowline near 4,300 m.
"""
import numpy as np
import terrain as T

# --- the zonation — adjust the altitudinal belts here (metres) ----------------
SNOWLINE = 4000          # permanent snow above this on slopes that can hold it
EAST_RISE = 380          # both climate lines sit this much higher in the dry east
def east(X):
    """How far into the rain shadow a point lies, 0 on the wet west side to 1 in the east."""
    return np.clip((np.asarray(X) - 0.42) / 0.40, 0, 1)
PERMAFROST_LOW = 3400    # frozen ground beneath the surface above this — well below the snowline
TREELINE = 2800          # the upper limit of closed forest (it wanders ±150 m)
ALPINE_TOP = 3900        # alpine grassland gives way to scree and snow
SCREE_LOW = 3300         # talus and periglacial ground from here up
FARM_TOP = 2200          # highest terraces
ROCK_SLOPE = 38          # degrees: steeper than this, bare rock (above 2,300 m)
SPAN_M = 25000.0         # the block is 25 km across on the ground

# class codes, in drawing order (low to high)
GROUND, ALPINE, SCREE, FOREST, TERRACE, FIELD, PADDY, TOWN, FOREFIELD, ROCK, SNOW, GLACIER, WATER = range(13)
NAMES = ['ground', 'alpine', 'scree', 'forest', 'terrace', 'field', 'paddy', 'town', 'forefield',
         'rock', 'snow', 'glacier', 'water']

# designed places (world coordinates)
TOWN_AREAS = [(0.47, 0.085, 0.085, 0.042), (0.60, 0.075, 0.05, 0.03)]  # ellipses: cx, cy, rx, ry
TERRACE_ZONES = [(0.27, 0.36, 0.13, 0.09), (0.80, 0.30, 0.12, 0.10), (0.12, 0.30, 0.10, 0.10)]
PADDY_ZONES = [(0.70, 0.095, 0.10, 0.038), (0.37, 0.175, 0.075, 0.032), (0.58, 0.155, 0.05, 0.03)]


def _ellipse(X, Y, c, soft=0.25):
    cx, cy, rx, ry = c
    return ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2


def classify(w, seed=T.SEED):
    X, Y, H = w['X'], w['Y'], w['H']
    n = H.shape[0]
    slope, gx, gy = T.slope_aspect(H, n, SPAN_M)
    # facing: +1 where a slope faces north (shade side in this light), -1 south
    mag = np.hypot(gx, gy) + 1e-9
    north = np.clip(-gy / mag, -1, 1) * np.clip(slope / 25, 0, 1)
    noise = T.fbm(X * 11, Y * 11, 3, seed=seed + 51)
    noise2 = T.fbm(X * 23, Y * 23, 2, seed=seed + 52)
    acc, _, _ = T.flow(H)

    cls = np.full(H.shape, GROUND, dtype=np.int8)

    # --- lowland and forest belt
    # both limits climb into the rain shadow: drier air, more sun, less snow
    treeline = TREELINE + 150 * noise * 3 - 120 * north + EAST_RISE * east(X)
    snowline = SNOWLINE - 260 * north + 120 * noise * 3 + EAST_RISE * east(X)
    # the humid side (west, facing the moist winds) carries closed forest; the
    # dry side (east) only open woodland — the trees module thins it out
    forest = (H > 650 + 250 * noise) & (H < treeline) & (slope < 50) & (noise2 > -0.18 - 0.2 * (X < 0.5)) \
        & ~((X > 0.58) & (noise2 < 0.04))                   # the dry east: open woodland, grass between the trees
    cls[forest] = FOREST
    alpine = (H >= treeline) & (H < ALPINE_TOP - 150 * north)
    cls[alpine] = ALPINE
    cls[(X > 0.58) & (H > 700) & (H < treeline) & (cls == GROUND)] = ALPINE   # grassland between the dry-side trees
    scree = (H > SCREE_LOW + 200 * noise) & (slope > 22) & (slope < ROCK_SLOPE + 8)
    cls[scree & (H < snowline + 300)] = SCREE

    # --- farming: fields on the plain, paddies by the river, terraces on slopes
    field = (Y < T.LOWLAND_Y + 0.06) & (H < 1000) & (slope < 14)
    cls[field] = FIELD
    for z in PADDY_ZONES:
        m = (_ellipse(X, Y, z) < 1 + 0.6 * noise + 0.4 * noise2) & (slope < 6) & (H < 700)
        cls[m] = PADDY
    for z in TERRACE_ZONES:
        m = (_ellipse(X, Y, z) < 1 + 0.7 * noise + 0.5 * noise2) & (H < FARM_TOP) & (H > 450) & (slope > 6) & (slope < 34)
        cls[m] = TERRACE

    # --- bare rock on steep ground
    # bare rock: cliffs, and the steep ground above the grassland; grassland and
    # scree keep the moderate slopes of the alpine belt
    rock = ((slope > ROCK_SLOPE + 9) & (H > 2300)) | ((H > ALPINE_TOP + 200) & (slope > 36))
    cls[rock] = ROCK

    # --- snow above the snowline, where the slope can hold it
    # high up, ice and snow cling to steeper faces than they can lower down
    # steep faces hold snow only in gullies and ledges (noise), which breaks the
    # snow on a planar face into tongues rather than a flat slab
    snow = ((H > snowline) & (slope < 44)) | ((H > snowline + 500) & (slope < 58) & (noise2 > 0.02)) | \
        ((H > snowline + 1700) & (slope < 62) & (noise2 > 0.0))
    cls[snow] = SNOW

    # --- glaciers: the main valley glacier, and cirque glaciers in the high
    #     hollows where drainage gathers and the ground is not too steep
    gdist, gt = T._polyline_dist(X, Y, T.MAIN_GLACIER)
    # the ice fills the floor of its trough: wide in the firn basin at the
    # head, narrowing to a tongue at the snout, never climbing the walls
    gw = 0.028 + 0.050 * (1 - gt) ** 1.5
    gfloor = 2950 + (4700 - 2950) * (1 - gt) ** 1.1
    glacier = (gdist < gw * (1 + 0.25 * noise)) & (H < gfloor + 420 + 900 * (1 - gt) ** 2) \
        & (H > w['lakes'][0][1] + 60)
    basin = (gt < 0.3) & (gdist < 0.12) & (H > SNOWLINE - 200) & (slope < 38)
    glacier |= basin
    cirque = (H > SNOWLINE - 350) & (slope < 30) & (np.log(acc) > 3.2) & (noise2 > -0.3)
    grow = np.zeros_like(cirque)
    grow[1:-1, 1:-1] = cirque[1:-1, 1:-1] | cirque[:-2, 1:-1] | cirque[2:, 1:-1] | cirque[1:-1, :-2] | cirque[1:-1, 2:]
    for pts, width in T.SMALL_GLACIERS:
        sd, st = T._polyline_dist(X, Y, pts)
        glacier |= (sd < width * (1 - 0.55 * st) * (1 + 0.3 * noise)) & (H > 3500)
    # close the small holes the noise leaves inside the ice, or the land cover
    # behind them paints forest onto the middle of the glacier
    glacier = glacier | ((T.blur(glacier.astype(float), 3) > 0.62)
                         & (gdist < gw * 1.05) & (H > w['lakes'][0][1] + 60))
    cls[glacier | (grow & (H > SNOWLINE - 450))] = GLACIER

    # --- coherent belts: a majority filter over the natural classes, so the
    #     cover reads as zones rather than following every bump of noise
    natural = [GROUND, ALPINE, SCREE, FOREST, ROCK, SNOW, FIELD]
    stack = np.stack([T.blur((cls == k).astype(float), 3) for k in natural])
    smooth = np.array(natural, dtype=np.int8)[stack.argmax(0)]
    keep = np.isin(cls, [GLACIER, TERRACE, PADDY])
    cls = np.where(keep, cls, smooth)
    # nothing grows in the trough the ice occupies: any forest the majority
    # filter left inside it becomes ice, or bare forefield near the snout
    introu = (gdist < gw * 0.95) & (H < gfloor + 900)
    cls[introu & (cls == FOREST) & (gt < 0.93)] = GLACIER
    cls[introu & (cls == FOREST)] = FOREFIELD

    # --- the glacier forefield: ground the ice left since 1850, still bare
    g = np.array(T.MAIN_GLACIER)
    S_ = g[-1]; dv = (g[-1] - g[-2]) / np.hypot(*(g[-1] - g[-2])); nv = np.array([-dv[1], dv[0]])
    along = (X - S_[0]) * dv[0] + (Y - S_[1]) * dv[1]
    across = (X - S_[0]) * nv[0] + (Y - S_[1]) * nv[1]
    fore = (along > -0.005) & (along < 0.085) & (np.abs(across) < 0.045 + 0.1 * along) & (cls != GLACIER)
    cls[fore] = FOREFIELD

    # --- the town
    town = np.zeros(H.shape, bool)
    for c in TOWN_AREAS:
        town |= _ellipse(X, Y, c) < 1 + 0.2 * noise
    cls[town & (slope < 12)] = TOWN

    # --- water: lakes, and the main river where it runs on the plain
    for (lake, level, kind) in w['lakes']:
        cls[lake] = WATER
    rdist, rt = T._polyline_dist(X, Y, T.MAIN_RIVER)
    river_w = 0.004 + 0.007 * rt ** 1.2                    # the river widens downstream
    cls[(rdist < river_w) & (rt > 0.12)] = WATER

    return dict(cls=cls, slope=slope, gx=gx, gy=gy, north=north, acc=acc,
                glacier_t=gt, glacier_d=gdist, river_t=rt, river_d=rdist)
