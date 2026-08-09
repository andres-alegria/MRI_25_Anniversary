#!/usr/bin/env python3
"""Summary Figure 1 — Policy Process. Emits figures/policy-process.svg (1600x900).

THESIS
    Global environmental law named mountains once, in a two-year window at Rio,
    and no global instrument has named them since. Recognition after 1994 came
    through science and observation, not new treaties — and through regional
    agreements covering a handful of ranges.

DATA PROVENANCE
    Treaty counts, families and country coverage recomputed from:
      GEO Mountains (2026). Dataset on the spatialisation of Multilateral
      Environmental Agreements (MEAs) in mountain regions, v1.0. Zenodo.
      DOI 10.5281/zenodo.18386085
    Derived from L1_L2_L3_treaties.csv and L1_L2_L3_members.csv.

    NB: the `tot_l1` column in agg_countries_treaties.gpkg undercounts and was
    NOT used — it reports 1 for Peru and Nepal, which are party to all three
    global L1 instruments. Country coverage below is recomputed from the
    membership table.

    Mountain-mention counts verified against primary texts, not the dataset:
      UNFCCC (1992)      2 mentions — preamble recital 5 and Art. 4.8(g)
      Kyoto Protocol     classified L2 (no explicit mountain reference)
      Paris Agreement    0 — verified against FCCC/CP/2015/10/Add.1
      COP27              FCCC/SBSTA/2022/L.20/Add.1, draft decision -/CP.27,
                         para 3 names mountains among systematic observation gaps

Usage:  python3 figures/src/fig1_policy_process.py
"""

from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "policy-process.svg"
W, H = 1600, 900

# ---------------------------------------------------------------- palette ----
# adjust figure palette here — taken from the publication artwork
BG      = "#faf6ec"
INK     = "#2b2721"
BODY    = "#55503f"
MUTED   = "#8a8377"
RULE    = "#cfc6ae"
ACCENT  = "#0067b2"   # recognition / mountains named
ABSENT  = "#a8453e"   # mountains absent
WARM    = "#b45a38"
GREEN   = "#5f8a4e"
ICE     = "#6d9fb5"
PAPER   = "#f2ecdd"

SERIF = "Georgia, 'Source Serif 4', 'Times New Roman', serif"
SANS  = "'Jost', 'Futura', 'Helvetica Neue', Arial, sans-serif"

# ------------------------------------------------------------------ scale ----
X0, X1 = 168, 1528          # 1990 .. 2027
Y0, Y1 = 1990, 2027
def x(year, frac=0.0):
    return X0 + (year + frac - Y0) * (X1 - X0) / (Y1 - Y0)

AXIS_Y = 372

# ------------------------------------------------------------------- data ----
# IPCC assessment products. `mountains` = has a dedicated mountain chapter.
IPCC = [
    (1990, 1990, "FAR",  False, ""),
    (1995, 1995, "SAR",  False, ""),
    (2001, 2001, "TAR",  False, ""),
    (2007, 2007, "AR4",  False, ""),
    (2014, 2014, "AR5",  False, ""),
    (2019, 2019, "SROCC", True, "Ch. 2\nHigh Mountain Areas"),
    (2022, 2022, "AR6", True, "Cross-Chapter\nPaper 5: Mountains"),
]

# UN recognition and COP decisions naming mountains
SOFT = [
    (2002, "International Year\nof Mountains", "middle", 0),
    (2022, "COP27: mountains named\namong observation gaps", "end", -15),
    (2025, "Five Years of Action\n2023–27", "middle", 0),
]

# Global instruments. mentions = explicit mountain references in the text.
GLOBAL = [
    (1992, "UNFCCC", 2,  "mountains in preamble\nand Art. 4.8(g)"),
    (1992, "CBD",    1,  ""),
    (1994, "UNCCD",  1,  ""),
    (1997, "Kyoto\nProtocol", 0, ""),
    (2015, "Paris\nAgreement", 0, "no mention of\nmountains, glaciers\nor the cryosphere"),
]

# Regional mountain-specific families: (label, first year, last year, count)
REGIONAL = [
    ("Alpine Convention + 10 protocols",        1991, 2000, 11),
    ("Carpathian Convention + 6 protocols",     2003, 2017, 7),
    ("West Tien Shan (KAZ·KGZ·UZB)",            1998, 1998, 1),
    ("Central Asia framework convention",       2006, 2006, 1),
    ("East African Community protocol",         2006, 2006, 1),
    ("Prespa Park agreement",                   2010, 2010, 1),
]

# Recomputed from the membership table
TOT_MEA, N_L1, N_L2, N_L3 = 1465, 25, 451, 989
MTN_COUNTRIES, COVERED = 180, 26
MTN_AREA_M, COVERED_AREA_M = 50.29, 2.41

# ------------------------------------------------------------------ helpers --
out = []
def add(s): out.append(s)

def esc(t):
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def text(tx, ty, s, size=13, fill=INK, family=SANS, weight="400",
         anchor="start", ls=0, style="", lh=None):
    """Multi-line text. \n becomes a tspan; lh defaults to 1.25em."""
    lines = s.split("\n")
    ls_attr = f' letter-spacing="{ls}"' if ls else ""
    st = f' font-style="{style}"' if style else ""
    add(f'<text x="{tx:.1f}" y="{ty:.1f}" font-family="{family}" font-size="{size}" '
        f'font-weight="{weight}" fill="{fill}" text-anchor="{anchor}"{ls_attr}{st}>')
    for i, ln in enumerate(lines):
        dy = "0" if i == 0 else f"{lh or size*1.25:.1f}"
        add(f'<tspan x="{tx:.1f}" dy="{dy}">{esc(ln)}</tspan>')
    add("</text>")

def lane_label(tx, ty, s):
    text(tx, ty, s, size=11, fill=MUTED, family=SANS, weight="500", ls="1.8")

# ------------------------------------------------------------------ canvas ---
add(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">')
add(f'<rect width="{W}" height="{H}" fill="{BG}"/>')

# ------------------------------------------------------------------- title ---
text(72, 66, "SUMMARY FIGURE 1  ·  POLICY PROCESS", size=12, fill=ACCENT,
     weight="500", ls="2.6")
text(72, 112, "Mountains got through the door once", size=38, fill=INK,
     family=SERIF, weight="700")
text(72, 146, "Global environmental law named mountains in a two-year window at Rio. No global instrument has named them since —",
     size=16.5, fill=BODY, family=SERIF)
text(72, 170, "recognition after 1994 came through science, observation and regional agreements instead.",
     size=16.5, fill=BODY, family=SERIF)

# ------------------------------------------------------- IPCC cycles lane ----
lane_label(72, 216, "IPCC ASSESSMENTS")
BLK_Y, BLK_H = 226, 46
for yr, _, label, has_mtn, note in IPCC:
    cx = x(yr)
    w = 62
    fill = ACCENT if has_mtn else "none"
    stroke = ACCENT if has_mtn else RULE
    tcol = "#ffffff" if has_mtn else MUTED
    add(f'<rect x="{cx-w/2:.1f}" y="{BLK_Y}" width="{w}" height="{BLK_H}" rx="3" '
        f'fill="{fill}" stroke="{stroke}" stroke-width="1.2"/>')
    text(cx, BLK_Y + 28, label, size=12.5, fill=tcol, weight="600", anchor="middle")
    if has_mtn:
        add(f'<line x1="{cx:.1f}" y1="{BLK_Y-6:.1f}" x2="{cx:.1f}" y2="{BLK_Y-18:.1f}" '
            f'stroke="{ACCENT}" stroke-width="1"/>')
# the two dedicated mountain chapters, called out once instead of twice
add(f'<line x1="{x(2019):.1f}" y1="{BLK_Y-18:.1f}" x2="{x(2022):.1f}" y2="{BLK_Y-18:.1f}" '
    f'stroke="{ACCENT}" stroke-width="1"/>')
text((x(2019)+x(2022))/2, BLK_Y - 28,
     "first dedicated mountain chapters:  SROCC Ch. 2 High Mountain Areas  ·  AR6 WGII Cross-Chapter Paper 5",
     size=11.5, fill=ACCENT, weight="500", anchor="end")
# the long stretch with no dedicated mountain chapter
add(f'<line x1="{x(1990)+34:.1f}" y1="{BLK_Y+BLK_H+14}" x2="{x(2019)-34:.1f}" '
    f'y2="{BLK_Y+BLK_H+14}" stroke="{MUTED}" stroke-width="1" stroke-dasharray="2 4"/>')
text(x(1990)+38, BLK_Y+BLK_H+30, "29 years, no dedicated mountain chapter",
     size=11.5, fill=MUTED, family=SANS, style="italic")

# ------------------------------------------- UN recognition / COP decisions --
lane_label(72, 336, "UN RECOGNITION")
for yr, label, anch, dy in SOFT:
    cx = x(yr)
    add(f'<circle cx="{cx:.1f}" cy="{AXIS_Y-18:.1f}" r="4.5" fill="{GREEN}"/>')
    add(f'<line x1="{cx:.1f}" y1="{AXIS_Y-14:.1f}" x2="{cx:.1f}" y2="{AXIS_Y-3:.1f}" '
        f'stroke="{GREEN}" stroke-width="1"/>')
    tx = cx - 8 if anch == "end" else cx
    text(tx, AXIS_Y-46+dy, label, size=11, fill=GREEN, weight="500",
         anchor=anch, lh=12.5)

# -------------------------------------------------------------------- axis ---
add(f'<line x1="{X0}" y1="{AXIS_Y}" x2="{X1}" y2="{AXIS_Y}" stroke="{INK}" stroke-width="1.4"/>')
for yr in range(1990, 2028, 5):
    cx = x(yr)
    add(f'<line x1="{cx:.1f}" y1="{AXIS_Y}" x2="{cx:.1f}" y2="{AXIS_Y+7}" stroke="{INK}" stroke-width="1"/>')
    text(cx, AXIS_Y+24, str(yr), size=12.5, fill=BODY, family=SANS, anchor="middle")

# MRI's own 25 years, as a quiet band behind the law lanes
BR = AXIS_Y + 40
add(f'<path d="M{x(2001):.1f} {BR+6} V{BR} H{x(2026):.1f} V{BR+6}" fill="none" '
    f'stroke="{MUTED}" stroke-width="1"/>')
text((x(2001)+x(2026))/2, BR+20, "MRI · 25 YEARS OF MOUNTAIN RESEARCH", size=10.5,
     fill=MUTED, family=SANS, weight="500", ls="1.6", anchor="middle")

# ------------------------------------------------------- global treaties -----
lane_label(72, AXIS_Y+92, "GLOBAL TREATIES")
GY = AXIS_Y + 104
RIO = {"UNFCCC", "CBD", "UNCCD"}
NUDGE = {"UNFCCC": -0.35, "CBD": 0.45}
for yr, label, mentions, note in GLOBAL:
    cx = x(yr + NUDGE.get(label, 0.0))
    named = mentions > 0
    col = ACCENT if named else ABSENT
    add(f'<circle cx="{cx:.1f}" cy="{GY:.1f}" r="8.5" fill="{col if named else BG}" '
        f'stroke="{col}" stroke-width="2"/>')
    if not named:
        add(f'<line x1="{cx-4.5:.1f}" y1="{GY-4.5:.1f}" x2="{cx+4.5:.1f}" y2="{GY+4.5:.1f}" '
            f'stroke="{col}" stroke-width="1.8"/>')
        add(f'<line x1="{cx+4.5:.1f}" y1="{GY-4.5:.1f}" x2="{cx-4.5:.1f}" y2="{GY+4.5:.1f}" '
            f'stroke="{col}" stroke-width="1.8"/>')
    if label in RIO:
        continue                      # labelled together, below
    text(cx, GY + 30, label, size=12.5, fill=INK, weight="600", anchor="middle", lh=14)
    if note:
        text(cx, GY + 62, note, size=11, fill=col, anchor="middle", lh=12.5, style="italic")

# The Rio cluster is labelled as a group, tucked under its own dots and clear
# of the Kyoto label further right.
SX, SY = x(1990.5), GY + 28
for i, (yr, lbl) in enumerate([(1992, "UNFCCC"), (1992, "CBD"), (1994, "UNCCD")]):
    yy = SY + i * 15
    add(f'<line x1="{x(yr + NUDGE.get(lbl, 0.0)):.1f}" y1="{GY+11:.1f}" x2="{SX+64:.1f}" '
        f'y2="{yy-4:.1f}" stroke="{ACCENT}" stroke-width="0.7" opacity="0.45"/>')
    text(SX, yy, str(yr), size=11, fill=MUTED, family=SANS)
    text(SX + 30, yy, lbl, size=11.5, fill=INK, family=SANS, weight="600")
text(SX, SY + 3 * 15 + 3,
     "the UNFCCC names mountains twice — preamble and Art. 4.8(g)",
     size=11, fill=ACCENT, family=SANS, style="italic")

# the silence
add(f'<line x1="{x(1994)+16:.1f}" y1="{GY}" x2="{x(2027):.1f}" y2="{GY}" '
    f'stroke="{MUTED}" stroke-width="1" stroke-dasharray="2 5"/>')
text(X1, GY - 17, "no global instrument has named mountains since 1994",
     size=12, fill=MUTED, style="italic", anchor="end")

# ---------------------------------------------------- regional agreements ----
lane_label(72, AXIS_Y+194, "REGIONAL MOUNTAIN")
lane_label(72, AXIS_Y+208, "AGREEMENTS")
RY = AXIS_Y + 198
for i, (label, y_from, y_to, n) in enumerate(REGIONAL):
    yy = RY + i * 17
    xa, xb = x(y_from), x(y_to)
    if xb - xa < 9:
        xb = xa + 9
    add(f'<rect x="{xa:.1f}" y="{yy:.1f}" width="{xb-xa:.1f}" height="9" rx="4.5" '
        f'fill="{ICE}"/>')
    text(xb + 9, yy + 8, f"{label}  ({n})", size=11.5, fill=BODY, family=SANS)

# ------------------------------------------------------------ bottom rule ----
BOT = 686
add(f'<line x1="72" y1="{BOT}" x2="{W-72}" y2="{BOT}" stroke="{RULE}" stroke-width="1"/>')

# --------------------------------------------------- panel A: how rare -------
ax_, aw = 72, 448
lane_label(ax_, BOT + 30, "HOW RARE")
text(ax_, BOT + 62, f"{N_L1} of {TOT_MEA:,}", size=27, fill=INK, family=SERIF, weight="700")
text(ax_ + 186, BOT + 62, "multilateral environmental", size=13, fill=BODY, family=SERIF)
text(ax_ + 186, BOT + 79, "agreements name mountains", size=13, fill=BODY, family=SERIF)
BARY, BARH = BOT + 100, 20
segs = [(N_L3, RULE, "not relevant"), (N_L2, ICE, "possibly relevant"), (N_L1, ACCENT, "mountain-specific")]
cx_ = ax_
for val, col, lbl in segs:
    wseg = aw * val / TOT_MEA
    add(f'<rect x="{cx_:.1f}" y="{BARY}" width="{max(wseg,2.5):.1f}" height="{BARH}" fill="{col}"/>')
    cx_ += wseg
add(f'<line x1="{ax_+aw-6:.1f}" y1="{BARY-8}" x2="{ax_+aw-6:.1f}" y2="{BARY+BARH+8}" '
    f'stroke="{ACCENT}" stroke-width="1.4"/>')
text(ax_, BARY + 40, f"1.7%", size=13, fill=ACCENT, weight="600")
text(ax_ + 48, BARY + 40, "mountain-specific  ·  30.8% possibly relevant", size=12, fill=MUTED)

# ------------------------------------- panel B: where the 25 come from -------
bx_ = 592
lane_label(bx_, BOT + 30, "WHERE THE 25 COME FROM")
text(bx_, BOT + 62, "18 of 25", size=27, fill=INK, family=SERIF, weight="700")
text(bx_ + 140, BOT + 62, "come from two", size=13, fill=BODY, family=SERIF)
text(bx_ + 140, BOT + 79, "mountain ranges", size=13, fill=BODY, family=SERIF)
FAM = [("Alps", 11, ICE), ("Carpathians", 7, ICE), ("Global (Rio)", 3, ACCENT),
       ("Four others", 4, RULE)]
fy = BOT + 100
for name, n, col in FAM:
    bw = n * 13
    add(f'<rect x="{bx_+96:.1f}" y="{fy:.1f}" width="{bw}" height="11" rx="2" fill="{col}"/>')
    text(bx_ + 90, fy + 10, name, size=11.5, fill=BODY, family=SANS, anchor="end")
    text(bx_ + 96 + bw + 7, fy + 10, str(n), size=11.5, fill=MUTED, family=SANS)
    fy += 17

# ----------------------------------------- panel C: who is covered -----------
cx0 = 1080
lane_label(cx0, BOT + 30, "WHO IS COVERED")
pct = COVERED_AREA_M / MTN_AREA_M * 100
text(cx0, BOT + 62, f"{pct:.1f}%", size=27, fill=WARM, family=SERIF, weight="700")
text(cx0 + 96, BOT + 62, "of the world's mountain", size=13, fill=BODY, family=SERIF)
text(cx0 + 96, BOT + 79, "area sits in a country with a", size=13, fill=BODY, family=SERIF)
text(cx0 + 96, BOT + 96, "regional mountain agreement", size=13, fill=BODY, family=SERIF)
cbw, cbh = 448, 20
cby = BOT + 112
add(f'<rect x="{cx0:.1f}" y="{cby}" width="{cbw}" height="{cbh}" fill="{RULE}"/>')
add(f'<rect x="{cx0:.1f}" y="{cby}" width="{cbw*pct/100:.1f}" height="{cbh}" fill="{WARM}"/>')
text(cx0, cby + 40, f"{COVERED} of {MTN_COUNTRIES} mountain countries  ·  "
     f"{COVERED_AREA_M} of {MTN_AREA_M} M km²", size=12, fill=MUTED)
text(cx0, cby + 56, "nothing for the Andes, Himalaya, Rockies or Ethiopian Highlands",
     size=12, fill=WARM, style="italic")

# ------------------------------------------------------------------ source ---
text(72, H - 22,
     "Treaty counts and country coverage recomputed from GEO Mountains (2026), Dataset on the spatialisation of MEAs in mountain regions v1.0, Zenodo DOI 10.5281/zenodo.18386085 (IEA Database, Université Laval).",
     size=10.5, fill=MUTED)
text(72, H - 9,
     "Mountain-mention counts verified against primary texts: UNFCCC 1992; Paris Agreement FCCC/CP/2015/10/Add.1; COP27 decision FCCC/SBSTA/2022/L.20/Add.1 para 3. Mountain area after Sayre et al. (2018) K1–K3 union.",
     size=10.5, fill=MUTED)

add("</svg>")

OUT.write_text("\n".join(out), encoding="utf-8")
print(f"wrote {OUT.relative_to(OUT.parents[2])}  ({OUT.stat().st_size/1024:.0f} KB)")
