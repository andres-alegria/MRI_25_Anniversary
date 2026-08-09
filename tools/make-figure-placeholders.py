#!/usr/bin/env python3
"""Generate 16:9 JPG placeholders for the four infographics.

Stand-ins until the real figures are drawn, so the section can be laid out
and reviewed at the correct aspect ratio and file format. Re-run after
editing FIGURES in figures-data.js if the titles change.

Usage:  python3 tools/make-figure-placeholders.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent.parent / "figures"
W, H = 1600, 900  # 16:9, the aspect the real figures will be delivered in

# adjust placeholder palette here. BG matches the figures section background
# so the placeholder reads as empty space rather than as a filled panel.
BG = "#f5f1e6"
INK = "#3a3630"
MUTED = "#8a8377"

SERIF = "/System/Library/Fonts/Supplemental/Georgia.ttf"
SANS = "/System/Library/Fonts/Supplemental/Futura.ttc"

FIGURES = [
    ("policy-process.jpg", "Policy Process"),
    ("observatories-ecvs.jpg", "Observatories & ECVs"),
    ("populations-hazards.jpg", "Populations & Hazards"),
    ("glaciers.jpg", "Glaciers"),
]


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.load_default()


def centred(draw, y, text, f, fill):
    left, top, right, bottom = draw.textbbox((0, 0), text, font=f)
    draw.text(((W - (right - left)) / 2 - left, y), text, font=f, fill=fill)
    return bottom - top


def build(filename: str, title: str) -> None:
    img = Image.new("RGB", (W, H), BG)
    d = ImageDraw.Draw(img)

    centred(d, 360, "PLACEHOLDER", font(SANS, 30), MUTED)
    centred(d, 415, f'Placeholder for “{title}”', font(SERIF, 76), INK)
    centred(d, 530, "16:9  ·  JPG  ·  1600 × 900", font(SANS, 28), MUTED)

    OUT.mkdir(exist_ok=True)
    img.save(OUT / filename, "JPEG", quality=88, optimize=True)
    print(f"  {filename}  {title}")


def main() -> int:
    print(f"Writing {len(FIGURES)} placeholders to {OUT.name}/")
    for filename, title in FIGURES:
        build(filename, title)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
