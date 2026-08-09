#!/usr/bin/env python3
"""Wire stories-data.js into the bundled index.html.

The Claude Design export stores the whole page as a JSON-escaped string inside
<script type="__bundler/template">. This decodes that string, patches the
component so it takes its story content from window.MRI_CONTENT instead of the
generated "Story one..twenty-five" placeholders, and re-encodes it.

Idempotent: running it twice is a no-op (it detects the marker and skips).
Re-run after dropping a fresh Claude Design export over index.html.

Usage:  python3 tools/apply-content.py
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INDEX = ROOT / "index.html"
MARKER = "/* __MRI_CONTENT_WIRED__ */"

TEMPLATE_RE = re.compile(
    r'(<script type="__bundler/template"[^>]*>)(.*?)(</script>)', re.S
)

# --- 1. pull editorial content out of the generated placeholders ------------
MERGE_ANCHOR = "\n    this.placeholderImgs ="
MERGE_CODE = """
    %s
    // Editorial content comes from stories-data.js so that a fresh Claude
    // Design export cannot overwrite it. Edit story text in that file.
    const _c = window.MRI_CONTENT || {};
    const _byNum = {};
    (_c.STORIES || []).forEach(s => { _byNum[s.num] = s; });
    this.stories.forEach(s => {
      const d = _byNum[s.num];
      if (!d) return;
      if (d.title) s.title = d.title;
      if (d.tags && d.tags.length) s.tags = d.tags;
      s.topic = d.topic || '';
      s.authors = d.authors || [];
      s.status = d.status || 'pending';
      s.lead = d.lead || '';
      s.body = d.body || [];
    });
    if (_c.TAG_VOCABULARY) this.allTags = ['All'].concat(_c.TAG_VOCABULARY);
    if (_c.TAG_COLORS) this.themeColors = _c.TAG_COLORS;
    this.pendingText = _c.PENDING_TEXT || 'This story is in development.';
""" % MARKER

# --- 2. feed the open story's own text into the existing panel slots --------
RENDER_ANCHOR = "\n    return {\n      tagChips,"
RENDER_CODE = """
    // Map the story's body blocks onto the slots the panel markup already has:
    // a lead, the paragraphs before the pull quote, the quote, and the rest.
    let _lead = '', _pA = [], _pB = [], _quote = '', _authors = '';
    if (openStory) {
      _authors = (openStory.authors || [])
        .map(a => (a.institution ? a.name + ', ' + a.institution : a.name))
        .join('  \\u00b7  ');
      if (openStory.status === 'draft') {
        _lead = openStory.lead || '';
        const _b = openStory.body || [];
        // Paragraphs may carry inline <em>/<strong>. The template DSL escapes
        // strings, so hand back React nodes instead to keep the emphasis.
        const _html = s => React.createElement('span', {
          dangerouslySetInnerHTML: { __html: s }
        });
        const _txt = b => _html(b.t === 'sub' ? b.x.toUpperCase() : b.x);
        const _qi = _b.findIndex(b => b.t === 'quote');
        if (_qi >= 0) {
          _quote = _b[_qi].x;
          _pA = _b.slice(0, _qi).map(_txt);
          _pB = _b.slice(_qi + 1).map(_txt);
        } else {
          _pA = _b.map(_txt);
        }
      } else {
        _lead = this.pendingText;
      }
    }
"""

REPLACEMENTS = [
    # per-story text instead of the single shared block
    (
        "      lead: this.lead,\n      parasA: this.parasA,\n      parasB: this.parasB,",
        "      lead: _lead,\n      parasA: _pA,\n      parasB: _pB,\n"
        "      authorLine: _authors,\n      quote: _quote,\n"
        "      hasQuote: !!_quote,\n      storyTopic: openStory ? (openStory.topic || '') : '',",
    ),
    # author byline: "Name, Institution", standard across all stories
    (
        ">A. Author &amp; B. Author — Placeholder Institution<",
        ">{{ authorLine }}<",
    ),
    # hide the pull-quote box when the story has no quote (e.g. not yet drafted)
    (
        '<div style="border:1.5px solid #0067b2;background:#e9f0f6;'
        'padding:20px 24px;margin:8px 0 26px">',
        '<sc-if value="{{ hasQuote }}" hint-placeholder-val="{{ true }}">\n'
        '        <div style="border:1.5px solid #0067b2;background:#e9f0f6;'
        'padding:20px 24px;margin:8px 0 26px">',
    ),
    (
        '        </div>\n        <sc-for list="{{ parasB }}"',
        '        </div>\n        </sc-if>\n        <sc-for list="{{ parasB }}"',
    ),
]


# --- 3. scenery: a river and a town painted into the mountain -------------
# The bundled SVG passes camelCase attributes through as sc-camel-* , so any
# new SVG has to follow that convention (gradientUnits -> sc-camel-gradient-units).
# The icons are drawn in a 160x140 space and placed with translate()/scale(),
# so the filters below use a displacement tuned for that size rather than the
# scene-sized one used by the mountain itself.
SCENERY_DEFS = """
            <filter id="mjIco" x="-12%" y="-12%" width="124%" height="124%">
              <feTurbulence type="fractalNoise" sc-camel-base-frequency="0.055" sc-camel-num-octaves="4" seed="7" result="ni"></feTurbulence>
              <feColorMatrix in="ni" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0.45" result="ai"></feColorMatrix>
              <feComposite in="SourceGraphic" in2="ai" operator="in" result="ti"></feComposite>
              <feDisplacementMap in="ti" in2="ni" scale="3.4"></feDisplacementMap>
            </filter>
            <filter id="mjIcoSoft" x="-16%" y="-16%" width="132%" height="132%">
              <feTurbulence type="fractalNoise" sc-camel-base-frequency="0.04" sc-camel-num-octaves="3" seed="12" result="ni2"></feTurbulence>
              <feColorMatrix in="ni2" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.9 0.35" result="ai2"></feColorMatrix>
              <feComposite in="SourceGraphic" in2="ai2" operator="in" result="ti2"></feComposite>
              <feDisplacementMap in="ti2" in2="ni2" scale="2.2"></feDisplacementMap>
            </filter>
            <linearGradient id="mjIcoTown" sc-camel-gradient-units="userSpaceOnUse" x1="0" y1="52" x2="0" y2="128">
              <stop offset="0" stop-color="#b08a3e" stop-opacity="0"></stop>
              <stop offset="1" stop-color="#b08a3e" stop-opacity="0.30"></stop>
            </linearGradient>
            <linearGradient id="mjIcoRiver" sc-camel-gradient-units="userSpaceOnUse" x1="0" y1="16" x2="0" y2="140">
              <stop offset="0" stop-color="#9fc0d2" stop-opacity="0.55"></stop>
              <stop offset="1" stop-color="#33698f" stop-opacity="0.78"></stop>
            </linearGradient>
"""

# translate() sets where each icon sits in the 1200x600 scene; scale() sets how
# big it reads. Both are safe to nudge — the story markers are HTML drawn on
# top, so moving these cannot disturb them.
SCENERY = """
          <!-- town on the lower slopes, left of the scene -->
          <g transform="translate(120,478) scale(0.56)">
            <ellipse cx="80" cy="122" rx="66" ry="9" fill="#eef2ea" opacity="0.85" filter="url(#mjIcoSoft)"></ellipse>
            <g filter="url(#mjIcoSoft)">
              <polygon points="18,120 18,78 34,68 50,78 50,120" fill="#ede6d5"></polygon>
              <polygon points="104,120 104,62 120,52 136,62 136,120" fill="#ede6d5"></polygon>
              <rect x="62" y="58" width="16" height="62" fill="#ede6d5"></rect>
            </g>
            <g filter="url(#mjIco)" stroke="#3a3630" stroke-width="1.5" stroke-linejoin="round">
              <rect x="30" y="86" width="26" height="34" fill="#e7e0cd"></rect>
              <polygon points="52,86 52,54 68,44 84,54 84,86" fill="#fbf9f2"></polygon>
              <rect x="84" y="72" width="24" height="48" fill="#e7e0cd"></rect>
              <polygon points="106,72 106,58 118,50 130,58 130,120 106,120" fill="#fbf9f2"></polygon>
            </g>
            <g fill="#c9d3d6" opacity="0.9" filter="url(#mjIcoSoft)">
              <rect x="36" y="94" width="5" height="7"></rect><rect x="46" y="94" width="5" height="7"></rect>
              <rect x="36" y="106" width="5" height="7"></rect>
              <rect x="60" y="64" width="5" height="7"></rect><rect x="71" y="64" width="5" height="7"></rect>
              <rect x="60" y="76" width="5" height="7"></rect><rect x="71" y="76" width="5" height="7"></rect>
              <rect x="90" y="82" width="5" height="7"></rect><rect x="100" y="82" width="5" height="7"></rect>
              <rect x="90" y="98" width="5" height="7"></rect>
              <rect x="113" y="70" width="5" height="7"></rect><rect x="113" y="86" width="5" height="7"></rect>
            </g>
            <rect x="14" y="52" width="132" height="70" fill="url(#mjIcoTown)" filter="url(#mjIco)"></rect>
            <path d="M12 120 H148" stroke="#3a3630" stroke-width="1.5" fill="none" stroke-linecap="round" filter="url(#mjIcoSoft)"></path>
          </g>

          <!-- distant town, high on the right-hand slope.
               Smaller and without window marks: at this size they would only
               read as mud, and dropping them reads as aerial perspective. -->
          <g transform="translate(940,330) scale(0.46)">
            <ellipse cx="80" cy="122" rx="60" ry="8" fill="#eef2ea" opacity="0.7" filter="url(#mjIcoSoft)"></ellipse>
            <g filter="url(#mjIcoSoft)">
              <polygon points="18,120 18,78 34,68 50,78 50,120" fill="#ede6d5"></polygon>
              <polygon points="104,120 104,62 120,52 136,62 136,120" fill="#ede6d5"></polygon>
            </g>
            <g filter="url(#mjIco)" stroke="#3a3630" stroke-width="2" stroke-linejoin="round">
              <rect x="30" y="86" width="26" height="34" fill="#e7e0cd"></rect>
              <polygon points="52,86 52,54 68,44 84,54 84,86" fill="#fbf9f2"></polygon>
              <rect x="84" y="72" width="24" height="48" fill="#e7e0cd"></rect>
              <polygon points="106,72 106,58 118,50 130,58 130,120 106,120" fill="#fbf9f2"></polygon>
            </g>
            <rect x="14" y="52" width="132" height="70" fill="url(#mjIcoTown)" filter="url(#mjIco)"></rect>
            <path d="M12 120 H148" stroke="#3a3630" stroke-width="2" fill="none" stroke-linecap="round" filter="url(#mjIcoSoft)"></path>
          </g>

          <!-- river, centre of the scene.
               Its source (local 73,6) is placed on the valley notch at scene
               520,395 — the low point between the peaks at x=470 and x=600 —
               so the water reads as issuing from that valley. Both banks
               converge on that single point rather than meeting a flat top
               edge, which is what gives the channel its recession. -->
          <g transform="translate(456,390) scale(0.88)">
            <path d="M73 6
                     C 73 17, 75 29, 75 40 C 75 52, 54 63, 54 75
                     C 54 87, 73 98, 73 110 C 73 122, 44 133, 44 145
                     C 44 157, 69 168, 69 180 C 69 192, 43 203, 43 215
                     C 43 225, 63 235, 63 245
                     L 121 245
                     C 121 235, 88 225, 88 215 C 88 203, 103 192, 103 180
                     C 103 168, 72 157, 72 145 C 72 133, 95 122, 95 110
                     C 95 98, 70 87, 70 75 C 70 63, 85 52, 85 40
                     C 85 29, 73 17, 73 6 Z"
                  fill="url(#mjIcoRiver)" stroke="#3a3630" stroke-width="1.5" stroke-linejoin="round" filter="url(#mjIco)"></path>
            <path d="M76 26 C 76 42, 58 56, 58 76 C 58 94, 75 100, 75 112 C 75 126, 48 136, 48 146"
                  fill="none" stroke="#fbf9f2" stroke-width="2" opacity="0.45" stroke-linecap="round" filter="url(#mjIcoSoft)"></path>
            <!-- gravel bars on the inside of each bend -->
            <g fill="#ede6d5" opacity="0.9" filter="url(#mjIcoSoft)">
              <ellipse cx="59" cy="78" rx="5" ry="3" transform="rotate(18 59 78)"></ellipse>
              <ellipse cx="90" cy="112" rx="6" ry="3.2" transform="rotate(-18 90 112)"></ellipse>
              <ellipse cx="51" cy="147" rx="7" ry="3.6" transform="rotate(16 51 147)"></ellipse>
              <ellipse cx="53" cy="216" rx="8" ry="4" transform="rotate(14 53 216)"></ellipse>
            </g>
          </g>
"""


def patch_template(doc: str) -> str:
    if MARKER in doc:
        print("Already wired — nothing to do.")
        return doc

    if MERGE_ANCHOR not in doc:
        sys.exit("Could not find the constructor anchor; bundle layout changed.")
    doc = doc.replace(MERGE_ANCHOR, MERGE_CODE + MERGE_ANCHOR, 1)

    if RENDER_ANCHOR not in doc:
        sys.exit("Could not find the renderVals anchor; bundle layout changed.")
    doc = doc.replace(RENDER_ANCHOR, RENDER_CODE + RENDER_ANCHOR, 1)

    for old, new in REPLACEMENTS:
        if doc.count(old) != 1:
            sys.exit(f"Expected exactly one occurrence of:\n  {old[:70]}...\n"
                     f"found {doc.count(old)}")
        doc = doc.replace(old, new, 1)

    # pull quote in the "MOUNTAIN SNAPSHOT" box
    quote_re = re.compile(
        r'(MOUNTAIN SNAPSHOT</div>\s*<div style="font:italic 600 18px/1\.5[^"]*">)(.*?)(</div>)',
        re.S,
    )
    doc, n = quote_re.subn(r'\1{{ quote }}\3', doc, count=1)
    if n != 1:
        sys.exit("Could not find the pull-quote block.")

    # scenery: filters/gradients into the mountain's <defs>, artwork before </svg>
    if doc.count("</defs>") != 1:
        sys.exit(f"Expected one </defs>, found {doc.count('</defs>')}")
    doc = doc.replace("</defs>", SCENERY_DEFS + "          </defs>", 1)

    svg_end = "          </g>\n\n        </svg>"
    if doc.count(svg_end) != 1:
        sys.exit(f"Expected one mountain <svg> tail, found {doc.count(svg_end)}")
    doc = doc.replace(svg_end, "          </g>\n" + SCENERY + "\n        </svg>", 1)

    # load the content file before the component runs
    head = re.search(r"<head[^>]*>", doc)
    if not head:
        sys.exit("No <head> in template.")
    i = head.end()
    doc = doc[:i] + '<script src="stories-data.js"></script>' + doc[i:]

    return doc


def main() -> int:
    html = INDEX.read_text(encoding="utf-8")
    m = TEMPLATE_RE.search(html)
    if not m:
        sys.exit("No __bundler/template block found in index.html.")

    doc = json.loads(m.group(2).strip())
    patched = patch_template(doc)
    if patched == doc:
        return 0

    enc = json.dumps(patched)
    # "</script>" inside the string would close the surrounding <script> tag
    enc = enc.replace("</", "<\\u002F")

    INDEX.write_text(
        html[: m.start(2)] + "\n" + enc + "\n" + html[m.end(2):],
        encoding="utf-8",
    )
    print("Wired stories-data.js into index.html.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
