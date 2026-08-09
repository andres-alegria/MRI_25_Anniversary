#!/usr/bin/env python3
"""Summary Figure 1 v2 — Policy Process. Emits figures/policy-process-v2.svg (1600x900).

SHAPE
    Upper two thirds: two lanes, 1990–2026. A science lane (IPCC) above a policy
    lane (UNFCCC instruments and decisions), with connectors where one fed the
    other. The payoff: the science lane climbs from passing mentions to a
    dedicated chapter to a cross-chapter paper, while the policy lane's two
    operative agreements — Kyoto and Paris — name mountains not once. Then it
    reconnects at COP27 and the first Global Stocktake.

    Lower third: the 25 mountain-specific agreements as a grouped waffle, so the
    Alpine and Carpathian dominance is visible at a glance.

MOUNTAIN MENTIONS — all counted directly in the primary texts
    UNFCCC 1992                2   preamble recital 5; Art. 4.8(g)
    Kyoto Protocol 1997        0
    Paris Agreement 2015       0   counted across FCCC/CP/2015/10/Add.1
                                   (glacier 0, cryosphere 0; forest 11)
    COP27 2022                 1   FCCC/SBSTA/2022/L.20/Add.1, draft decision
                                   -/CP.27 para 3, observation gaps
    Global Stocktake 2023      5   decision -/CMA.5, incl. para 181 mandating an
                                   SBSTA expert dialogue on mountains and
                                   climate change (June 2024); cryosphere 1

TREATY DATA
    GEO Mountains (2026). Dataset on the spatialisation of Multilateral
    Environmental Agreements (MEAs) in mountain regions, v1.0. Zenodo.
    DOI 10.5281/zenodo.18386085. Recomputed from L1_L2_L3_treaties.csv and
    L1_L2_L3_members.csv; the gpkg `tot_l1` column is defective and unused.

Usage:  python3 figures/src/fig1_policy_process_v2.py
"""

from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "policy-process-v2.svg"
W, H = 1600, 900

# ---------------------------------------------------------------- palette ----
# adjust figure palette here — taken from the publication artwork
BG     = "#faf6ec"
INK    = "#2b2721"
BODY   = "#55503f"
MUTED  = "#8a8377"
RULE   = "#cfc6ae"
SCI    = "#33698f"   # science lane
POL    = "#0067b2"   # policy lane, mountains named
ABSENT = "#a8453e"   # mountains absent from the text
ICE    = "#6d9fb5"   # regional agreements
WARM   = "#b45a38"
PAPER  = "#f1ebdb"

SERIF = "Georgia, 'Source Serif 4', 'Times New Roman', serif"
SANS  = "'Jost', 'Futura', 'Helvetica Neue', Arial, sans-serif"

# ------------------------------------------------------------------ scale ----
X0, X1 = 214, 1418
Y0, Y1 = 1990, 2026
def x(yr):
    return X0 + (yr - Y0) * (X1 - X0) / (Y1 - Y0)

# ------------------------------------------------------------------- data ----
# Science: depth of mountain treatment. 1 = inside other chapters,
# 2 = its own chapter, 3 = a cross-cutting paper spanning the assessment.
SCIENCE = [
    (1990, "FAR",  1, "below"),
    (1995, "SAR",  1, "below"),
    (2001, "TAR",  1, "above"),
    (2007, "AR4",  1, "below"),
    (2014, "AR5",  1, "above"),
    (2018, "SR1.5", 1, "below"),
    (2019, "SROCC", 2, "above"),
    (2022, "AR6 WGII", 3, "above"),
]
LEVEL_Y = {1: 312, 2: 256, 3: 210}
LEVEL_LABEL = {
    1: "mountains inside other chapters",
    2: "a chapter of their own",
    3: "a cross-chapter paper",
}

# Policy: explicit mountain references counted in each text.
POLICY = [
    (1992, "UNFCCC",           2, "preamble and Art. 4.8(g)",              "middle"),
    (1997, "Kyoto Protocol",   0, "",                                       "middle"),
    (2015, "Paris Agreement",  0, "",                                       "middle"),
    (2022, "COP27",            1, "mountains named among\nsystematic observation gaps", "end"),
    (2023, "Global Stocktake", 5, "and an SBSTA expert dialogue\non mountains, June 2024", "start"),
]
BASE_Y = 566          # policy baseline
UNIT   = 16           # px per mountain mention

# science milestone -> policy instrument it fed
CONNECT = [(1990, 1992), (2014, 2015), (2019, 2022), (2022, 2023)]

# The 25 mountain-specific agreements, grouped by family
FAMILIES = [
    ("Alpine Convention\n+ 10 protocols", 11, ICE),
    ("Carpathian Convention\n+ 6 protocols", 7, ICE),
    ("UNFCCC · CBD · UNCCD\n(global, 1992–94)", 3, POL),
    ("Four one-off agreements\nW. Tien Shan · Central Asia · East African Community · Prespa Park", 4, ICE),
]
TOT_MEA, N_L1 = 1465, 25
MTN_COUNTRIES, COVERED = 180, 26
MTN_AREA_M, COVERED_AREA_M = 50.29, 2.41

# ---------------------------------------------------------------- helpers ----
out = []
def add(s): out.append(s)
def esc(t): return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def text(tx, ty, s, size=13, fill=INK, family=SANS, weight="400",
         anchor="start", ls=0, style="", lh=None):
    lines = s.split("\n")
    ls_a = f' letter-spacing="{ls}"' if ls else ""
    st = f' font-style="{style}"' if style else ""
    add(f'<text x="{tx:.1f}" y="{ty:.1f}" font-family="{family}" font-size="{size}" '
        f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}"{ls_a}{st}>')
    for i, ln in enumerate(lines):
        dy = "0" if i == 0 else f"{lh or size*1.28:.1f}"
        add(f'<tspan x="{tx:.1f}" dy="{dy}">{esc(ln)}</tspan>')
    add("</text>")

def lane_label(tx, ty, s, fill=MUTED):
    text(tx, ty, s, size=11, fill=fill, family=SANS, weight="600", ls="1.9")

# ----------------------------------------------------------------- canvas ----
add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
add(f'<rect width="{W}" height="{H}" fill="{BG}"/>')

# ------------------------------------------------------------------ title ----
text(72, 62, "SUMMARY FIGURE 1  ·  POLICY PROCESS", size=12, fill=POL,
     weight="600", ls="2.6")
text(72, 106, "The science climbed while the policy went quiet", size=37,
     fill=INK, family=SERIF, weight="700")
text(72, 138, "Mountains entered the climate regime in 1992, vanished from its two operative agreements, and returned three decades later —",
     size=16, fill=BODY, family=SERIF)
text(72, 160, "on the back of assessments that had meanwhile given them a chapter, then a cross-chapter paper, of their own.",
     size=16, fill=BODY, family=SERIF)

# ------------------------------------------------------------ science lane ---
lane_label(72, 196, "SCIENCE  ·  IPCC ASSESSMENTS", SCI)

# level guides
for lv, yy in LEVEL_Y.items():
    add(f'<line x1="{X0-34:.1f}" y1="{yy}" x2="{X1}" y2="{yy}" stroke="{RULE}" '
        f'stroke-width="1" stroke-dasharray="1 5"/>')
    text(X1, yy - 8, LEVEL_LABEL[lv], size=10.5, fill=MUTED, family=SANS,
         anchor="end", style="italic")

# the climbing step line
steps = []
prev_y = LEVEL_Y[1]
steps.append(f"M{X0-34:.1f} {prev_y}")
for yr, _, lv, _ in SCIENCE:
    yy = LEVEL_Y[lv]
    if yy != prev_y:
        steps.append(f"L{x(yr)-22:.1f} {prev_y} L{x(yr)-22:.1f} {yy}")
        prev_y = yy
steps.append(f"L{X1:.1f} {prev_y}")
add(f'<path d="{" ".join(steps)}" fill="none" stroke="{SCI}" stroke-width="2.4"/>')

for yr, label, lv, side in SCIENCE:
    cx, cy = x(yr), LEVEL_Y[lv]
    big = lv > 1
    add(f'<circle cx="{cx:.1f}" cy="{cy}" r="{6.5 if big else 4.5}" fill="{SCI}"/>')
    if big:
        add(f'<circle cx="{cx:.1f}" cy="{cy}" r="11" fill="none" stroke="{SCI}" '
            f'stroke-width="1.2" opacity="0.55"/>')
    ty = cy - 20 if side == "above" else cy + 26
    text(cx, ty, label, size=12.5, fill=INK, family=SANS,
         weight="600" if big else "500", anchor="middle")

text(x(2019), LEVEL_Y[2] - 38, "Ch. 2  High Mountain Areas", size=11,
     fill=SCI, family=SANS, anchor="middle", style="italic")
text(x(2022), LEVEL_Y[3] - 38, "Cross-Chapter Paper 5  Mountains", size=11,
     fill=SCI, family=SANS, anchor="middle", style="italic")

# ------------------------------------------------------------- connectors ----
for sy, py in CONNECT:
    x1_, y1_ = x(sy), LEVEL_Y[dict((a, c) for a, _, c, _ in SCIENCE)[sy]]
    cnt = dict((a, c) for a, _, c, _, _ in POLICY)[py]
    x2_, y2_ = x(py), BASE_Y - cnt * UNIT - 16
    my = (y1_ + y2_) / 2
    add(f'<path d="M{x1_:.1f} {y1_+14:.1f} C{x1_:.1f} {my:.1f} {x2_:.1f} {my:.1f} '
        f'{x2_:.1f} {y2_:.1f}" fill="none" stroke="{MUTED}" stroke-width="1.2" '
        f'opacity="0.65" stroke-dasharray="4 3"/>')
    add(f'<path d="M{x2_-3.5:.1f} {y2_-5:.1f} L{x2_:.1f} {y2_+1:.1f} '
        f'L{x2_+3.5:.1f} {y2_-5:.1f}" fill="{MUTED}" opacity="0.75"/>')
text((x(1999)+x(2013))/2, 432,
     "assessments feed the instruments — but for 18 years the instruments carry no mountains at all",
     size=12.5, fill=MUTED, family=SANS, anchor="middle", style="italic")

# ------------------------------------------------------------- policy lane ---
lane_label(72, 470, "POLICY  ·  UNFCCC INSTRUMENTS", POL)
lane_label(72, 486, "AND DECISIONS", POL)
text(72, 512, "explicit mountain\nreferences in the text", size=10.5, fill=MUTED,
     family=SANS, style="italic", lh=12)

add(f'<line x1="{X0-34:.1f}" y1="{BASE_Y}" x2="{X1}" y2="{BASE_Y}" stroke="{INK}" stroke-width="1.4"/>')

BW = 30
for yr, label, cnt, note, align in POLICY:
    cx = x(yr)
    lx = cx - 22 if align == "end" else (cx + 22 if align == "start" else cx)
    col = POL if cnt else ABSENT
    if cnt:
        h = cnt * UNIT
        add(f'<rect x="{cx-BW/2:.1f}" y="{BASE_Y-h:.1f}" width="{BW}" height="{h}" '
            f'fill="{col}" rx="2"/>')
        text(cx, BASE_Y - h - 10, str(cnt), size=15, fill=col, family=SANS,
             weight="700", anchor="middle")
    else:
        add(f'<circle cx="{cx:.1f}" cy="{BASE_Y-13:.1f}" r="10" fill="{BG}" '
            f'stroke="{col}" stroke-width="2"/>')
        for a, b in ((-5, -5, 5, 5), (5, -5, -5, 5))[:0]:
            pass
        add(f'<line x1="{cx-5:.1f}" y1="{BASE_Y-18:.1f}" x2="{cx+5:.1f}" y2="{BASE_Y-8:.1f}" stroke="{col}" stroke-width="1.9"/>')
        add(f'<line x1="{cx+5:.1f}" y1="{BASE_Y-18:.1f}" x2="{cx-5:.1f}" y2="{BASE_Y-8:.1f}" stroke="{col}" stroke-width="1.9"/>')
        text(cx, BASE_Y - 34, "0", size=15, fill=col, family=SANS, weight="700", anchor="middle")
    text(lx, BASE_Y + 22, label, size=12.5, fill=INK, family=SANS, weight="600",
         anchor=align, lh=14)
    if note:
        text(lx, BASE_Y + 40, note, size=10.5, fill=col, family=SANS,
             anchor=align, style="italic", lh=12)

# the silent span
add(f'<line x1="{x(1997)+16:.1f}" y1="{BASE_Y-13:.1f}" x2="{x(2015)-16:.1f}" '
    f'y2="{BASE_Y-13:.1f}" stroke="{ABSENT}" stroke-width="1" stroke-dasharray="3 4" opacity="0.7"/>')

# ---------------------------------------------------------------- year axis --
for yr in range(1990, 2027, 5):
    cx = x(yr)
    add(f'<line x1="{cx:.1f}" y1="{BASE_Y+62}" x2="{cx:.1f}" y2="{BASE_Y+68}" stroke="{MUTED}" stroke-width="1"/>')
    text(cx, BASE_Y + 84, str(yr), size=12, fill=MUTED, family=SANS, anchor="middle")

# ------------------------------------------------------------- lower third ---
DIV = 700
add(f'<line x1="72" y1="{DIV}" x2="{W-72}" y2="{DIV}" stroke="{RULE}" stroke-width="1"/>')
lane_label(72, DIV + 28, "THE EVIDENCE BASE  ·  ALL 25 MOUNTAIN-SPECIFIC AGREEMENTS, BY FAMILY")

CELL, GAPC, GAPF = 29, 4, 22
CY, CH = DIV + 46, 30
cx_ = 72
for name, n, col in FAMILIES:
    start = cx_
    for i in range(n):
        add(f'<rect x="{cx_:.1f}" y="{CY}" width="{CELL}" height="{CH}" rx="2" fill="{col}"/>')
        cx_ += CELL + GAPC
    span = cx_ - GAPC - start
    add(f'<line x1="{start:.1f}" y1="{CY+CH+7}" x2="{start+span:.1f}" y2="{CY+CH+7}" '
        f'stroke="{MUTED}" stroke-width="1"/>')
    text(start, CY + CH + 24, name, size=11, fill=BODY, family=SANS, lh=12.5)
    text(start + span, CY + CH + 24, str(n), size=11.5, fill=MUTED, family=SANS,
         weight="600", anchor="end")
    cx_ += GAPF

text(72, CY + CH + 68,
     f"{N_L1} of {TOT_MEA:,} multilateral environmental agreements name mountains — 1.7 per cent. Eighteen of the twenty-five come from two mountain ranges.",
     size=13, fill=INK, family=SERIF)

# right-hand stat
SX = 1122
pct = COVERED_AREA_M / MTN_AREA_M * 100
text(SX, DIV + 60, f"{pct:.1f}%", size=40, fill=WARM, family=SERIF, weight="700")
text(SX, DIV + 84, "of the world's mountain area sits in a", size=12.5, fill=BODY, family=SERIF)
text(SX, DIV + 102, "country with a regional mountain treaty", size=12.5, fill=BODY, family=SERIF)
bw2 = 348
add(f'<rect x="{SX}" y="{DIV+116}" width="{bw2}" height="14" fill="{RULE}"/>')
add(f'<rect x="{SX}" y="{DIV+116}" width="{bw2*pct/100:.1f}" height="14" fill="{WARM}"/>')
text(SX, DIV + 148, f"{COVERED} of {MTN_COUNTRIES} mountain countries  ·  {COVERED_AREA_M} of {MTN_AREA_M} M km²",
     size=11.5, fill=MUTED, family=SANS)
text(SX, DIV + 166, "nothing for the Andes, Himalaya, Rockies or Ethiopian Highlands",
     size=11, fill=WARM, family=SANS, style="italic")

# ----------------------------------------------------------------- sources ---
text(72, H - 20,
     "Mountain references counted in the primary texts: UNFCCC 1992; Kyoto Protocol 1997; Paris Agreement FCCC/CP/2015/10/Add.1; COP27 decision FCCC/SBSTA/2022/L.20/Add.1 para 3; first global stocktake decision -/CMA.5 (2023), para 181 mandating an SBSTA expert dialogue on mountains.",
     size=10, fill=MUTED)
text(72, H - 8,
     "Treaty counts and country coverage recomputed from GEO Mountains (2026), Dataset on the spatialisation of MEAs in mountain regions v1.0, Zenodo DOI 10.5281/zenodo.18386085 (IEA Database, Université Laval). Mountain area after Sayre et al. (2018), K1–K3 union.",
     size=10, fill=MUTED)

add("</svg>")
OUT.write_text("\n".join(out), encoding="utf-8")
print(f"wrote {OUT.name}  ({OUT.stat().st_size/1024:.0f} KB)")
