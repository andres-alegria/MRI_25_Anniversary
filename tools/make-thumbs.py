#!/usr/bin/env python3
"""Square thumbnails of the story clips, for the gallery.

The clips themselves are 1.5-3 MB of SVG each; twenty-five of those on one
page is not a gallery, it is a download. This renders each one once and
crops the middle square.

    python3 tools/make-thumbs.py [dark|light]
"""
import pathlib
import subprocess
import sys
import tempfile
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
SIDE = 640                      # the thumbnail's side, px — adjust here

theme = sys.argv[1] if len(sys.argv) > 1 else 'dark'
out_dir = ROOT / 'art' / 'thumbs'
out_dir.mkdir(parents=True, exist_ok=True)

for n in range(1, 26):
    src = ROOT / 'art' / 'clips' / ('story-%02d-%s.svg' % (n, theme))
    if not src.exists():
        continue
    dst = out_dir / ('story-%02d-%s.png' % (n, theme))
    with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False) as fh:
        fh.write('<!doctype html><meta charset="utf-8">'
                 '<style>html,body{margin:0}svg{display:block}</style>' + src.read_text())
        page = fh.name
    png = tempfile.mktemp(suffix='.png')
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--hide-scrollbars',
                    '--screenshot=' + png, '--window-size=1800,1300', 'file://' + page],
                   check=True, capture_output=True)
    im = Image.open(png).convert('RGB')
    w, h = im.size
    # the block sits in the middle of the frame; take a square around it
    top = int(h * 0.10)
    side = min(w, h - top)
    left = (w - side) // 2
    im.crop((left, top, left + side, top + side)).resize((SIDE, SIDE), Image.LANCZOS).save(dst, optimize=True)
    pathlib.Path(page).unlink(missing_ok=True)
    pathlib.Path(png).unlink(missing_ok=True)
    print('wrote', dst.name, flush=True)
