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
      s.image = d.image || null;
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

    // Cross-cutting figures, from figures-data.js. Independent of the stories.
    const _fg = window.MRI_FIGURES || {};
    const _figs = _fg.FIGURES || [];
    const _fi = Math.min(this.state.figIdx || 0, Math.max(0, _figs.length - 1));
    const _fcur = _figs[_fi] || null;
    const _figChips = _figs.map((f, i) => ({
      name: f.title,
      fw: i === _fi ? '600' : '500',
      bg: i === _fi ? '#3a3630' : 'transparent',
      color: i === _fi ? '#ffffff' : '#55503f',
      bc: i === _fi ? '#3a3630' : 'rgba(58,54,48,.35)',
      onPick: () => this.setState({ figIdx: i })
    }));
"""

# --- 4. the cross-cutting figures section ---------------------------------
# One figure on stage at a time, switched by a rail of labels reusing the tag
# chip styling. Sits after the hero and before "About the Publication".
FIGURES_SECTION = """
<!-- ============ FIGURES ============ -->
<section id="figures" data-screen-label="Figures" style="background:#f5f1e6;padding:clamp(48px,7vw,84px) clamp(20px,4vw,48px);border-top:1px solid rgba(58,54,48,.25);scroll-margin-top:95px">
  <div style="max-width:1000px;margin:0 auto">
    <div style="font:500 11px Jost,sans-serif;letter-spacing:.22em;color:#7d7666;margin-bottom:10px">{{ figEyebrow }}</div>
    <h2 style="margin:0 0 10px;font:700 clamp(26px,4vw,34px)/1.15 'Source Serif 4',Georgia,serif;color:#2b2721">{{ figHeading }}</h2>
    <p style="margin:0 0 26px;max-width:62ch;font:400 16px/1.62 'Source Serif 4',Georgia,serif;color:#55503f;text-wrap:pretty">{{ figStandfirst }}</p>

    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px">
      <sc-for list="{{ figChips }}" as="f" hint-placeholder-count="4">
        <button sc-camel-on-click="{{ f.onPick }}" style="cursor:pointer;white-space:nowrap;font:{{ f.fw }} 13.5px Jost,sans-serif;letter-spacing:.02em;padding:7px 16px;border-radius:999px;border:1px solid {{ f.bc }};background:{{ f.bg }};color:{{ f.color }}" style-hover="border-color:#3a3630">{{ f.name }}</button>
      </sc-for>
    </div>

    <div style="border:1.5px solid #3a3630;border-radius:6px;background:#e7e0cd;overflow:hidden">
      <div style="position:relative;width:100%;aspect-ratio:16/9">
        {{ figImg }}
      </div>
    </div>
    <div style="font:500 13px Jost,sans-serif;letter-spacing:.02em;color:#55503f;margin-top:14px">{{ figSubtitle }}</div>
    <div style="font:italic 400 14px/1.6 'Source Serif 4',Georgia,serif;color:#7d7666;margin-top:5px;max-width:66ch;text-wrap:pretty">{{ figCaption }}</div>
  </div>
</section>

"""

REPLACEMENTS = [
    # a slot in component state for which figure is on stage
    (
        "this.state = { activeTag: null, openId: null, hoverId: null };",
        "this.state = { activeTag: null, openId: null, hoverId: null, figIdx: 0 };",
    ),
    # per-story text instead of the single shared block
    (
        "      lead: this.lead,\n      parasA: this.parasA,\n      parasB: this.parasB,",
        "      lead: _lead,\n      parasA: _pA,\n      parasB: _pB,\n"
        "      authorLine: _authors,\n      quote: _quote,\n"
        "      hasQuote: !!_quote,\n      storyTopic: openStory ? (openStory.topic || '') : '',\n"
        "      figChips: _figChips,\n"
        "      figImg: _fcur ? React.createElement('img', {\n"
        "        src: _fcur.src, alt: _fcur.alt,\n"
        "        style: { position: 'absolute', inset: 0, width: '100%', height: '100%',\n"
        "                 objectFit: 'contain', display: 'block' }\n"
        "      }) : null,\n"
        "      figSubtitle: _fcur ? _fcur.subtitle : '',\n"
        "      figCaption: _fcur ? _fcur.caption : '',\n"
        "      figEyebrow: _fg.FIGURES_EYEBROW || '',\n"
        "      figHeading: _fg.FIGURES_HEADING || '',\n"
        "      figStandfirst: _fg.FIGURES_STANDFIRST || '',",
    ),
    # author byline: "Name, Institution", standard across all stories
    (
        ">A. Author &amp; B. Author — Placeholder Institution<",
        ">{{ authorLine }}<",
    ),
    # nav entry for the figures section, between Journey and About
    (
        '<a href="#journey" style="color:#2b2721">The Journey</a>\n'
        '    <a href="#about" style="color:#2b2721">About the Publication</a>',
        '<a href="#journey" style="color:#2b2721">The Journey</a>\n'
        '    <a href="#figures" style="color:#2b2721">Summary Figures</a>\n'
        '    <a href="#about" style="color:#2b2721">About the Publication</a>',
    ),
    # story photo: use the story's own image when it has one, otherwise fall
    # back to the generic photos bundled with the export. objectFit is
    # 'contain' for real images so figures and maps are never cropped.
    (
        "openImg: openStory ? React.createElement('img', {\n"
        "        src: this.placeholderImgs[(openStory.num - 1) % 4],\n"
        "        alt: 'Placeholder story photo',\n"
        "        style: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' }\n"
        "      }) : null,",
        "openImg: openStory ? React.createElement('img', {\n"
        "        src: (openStory.image && openStory.image.src) || this.placeholderImgs[(openStory.num - 1) % 4],\n"
        "        alt: (openStory.image && openStory.image.alt) || 'Placeholder story photo',\n"
        "        style: { width: '100%', height: '100%',\n"
        "                 objectFit: openStory.image ? 'contain' : 'cover', display: 'block' }\n"
        "      }) : null,\n"
        "      photoCaption: (openStory && openStory.image && openStory.image.caption) || '',",
    ),
    # caption under the photo
    (
        '<div style="font:italic 400 13px \'Source Serif 4\',Georgia,serif;'
        'color:#7d7666;margin-bottom:26px">Caption placeholder — captions '
        'should tell mini-stories of their own.</div>',
        '<div style="font:italic 400 13px \'Source Serif 4\',Georgia,serif;'
        'color:#7d7666;margin-bottom:26px">{{ photoCaption }}</div>',
    ),
    # map frame: 2:1 -> 16:9
    ("aspect-ratio:2/1", "aspect-ratio:16/9"),
    # hero box: same 16:9 frame, contents centred within it
    (
        'style="max-width:860px;text-align:center;border:1px solid rgba(58,54,48,.5);'
        'outline:1px solid rgba(58,54,48,.5);outline-offset:5px;'
        'padding:clamp(36px,6vw,64px) clamp(24px,6vw,72px)"',
        'style="max-width:860px;width:100%;aspect-ratio:16/9;box-sizing:border-box;'
        'display:flex;flex-direction:column;align-items:center;justify-content:center;'
        'text-align:center;border:1px solid rgba(58,54,48,.5);'
        'outline:1px solid rgba(58,54,48,.5);outline-offset:5px;'
        'padding:clamp(24px,4vw,48px) clamp(24px,6vw,72px)"',
    ),
    # marker coordinates, restretched onto the taller frame
    (
        "const coords = [[870,115],[895,185],[845,210],[915,250],[800,300],[1100,320],"
        "[605,330],[960,300],[770,345],[480,375],[655,375],[1040,380],[560,410],"
        "[880,390],[720,410],[1130,420],[345,450],[620,450],[990,460],[1160,500],"
        "[180,495],[780,480],[280,505],[430,470],[60,535]];",
        "const coords = [[870,120],[895,200],[845,229],[915,275],[800,332],[1100,355],"
        "[605,366],[960,332],[770,383],[480,418],[655,418],[1040,423],[560,458],"
        "[880,435],[720,458],[1130,469],[345,503],[620,503],[990,515],[1160,561],"
        "[180,555],[780,538],[280,566],[430,526],[60,601]];",
    ),
    # markers are positioned as a percentage of the viewBox height
    ("py: +(s.y / 6).toFixed(2),", "py: +(s.y / 6.75).toFixed(2),"),
    # altitude readout on the story cards
    (
        '<span style="font:500 10.5px Jost,sans-serif;letter-spacing:.1em;'
        'color:#7d7666" data-comment-anchor="e84f3e2f9d-span">~{{ s.elev }} m</span>',
        "",
    ),
    # altitude readout at the top of the story panel; the empty div is kept so
    # the close button stays where it is in the space-between row
    (
        '<div style="font:500 11.5px Jost,sans-serif;letter-spacing:.18em;'
        'color:#7d7666">~{{ open.elev }} M</div>',
        "<div></div>",
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


# --- 2b. taller frame, five peaks, one plateau -----------------------------
# The frame goes from 2:1 to 16:9. The viewBox grows 600 -> 675 while the
# summit stays at y=80, so one viewBox unit still renders at the same size:
# the sky band is untouched and the mountain simply gets taller. Every y below
# the summit was scaled by (675-80)/(600-80).
#
# The old leftmost peak (x=170) is gone — the slope now climbs smoothly from
# the left edge — leaving five peaks.
TERRAIN = """<rect x="0" y="0" width="1200" height="538" fill="url(#mjSky)" filter="url(#mjWatercolorSoft)"></rect>
          <ellipse cx="300" cy="480" rx="240" ry="25" fill="#eef2ea" opacity="0.7" filter="url(#mjWatercolorSoft)"></ellipse>
          <ellipse cx="950" cy="446" rx="220" ry="23" fill="#eef2ea" opacity="0.6" filter="url(#mjWatercolorSoft)"></ellipse>
          <g>
            <polygon points="0,561 80,503 160,469 250,423 330,446 420,400 500,423 580,378 660,332 740,355 810,309 900,286 980,320 1060,343 1140,366 1200,400 1200,675 0,675" fill="#ede6d5" filter="url(#mjWatercolorSoft)"></polygon>
            <polygon points="0,620 110,593 230,535 330,469 400,492 470,389 520,440 600,332 650,383 720,423 790,332 820,240 870,80 910,206 940,252 1000,332 1040,378 1100,320 1200,423 1200,675 0,675" fill="#e7e0cd" stroke="#3a3630" stroke-width="1.5" filter="url(#mjWatercolorSoft)"></polygon>
            <rect x="0" y="435" width="1200" height="240" fill="url(#mjGreenFade)" clip-path="url(#mjMountainClip)" filter="url(#mjWatercolor)"></rect>
            <rect x="0" y="80" width="1200" height="343" fill="url(#mjIceFade)" clip-path="url(#mjMountainClip)" filter="url(#mjWatercolor)"></rect>
            <polygon points="820,240 870,80 910,206 940,252 918,242 895,280 872,257 848,288 826,261" fill="#fbf9f2" stroke="#3a3630" stroke-width="1.5" filter="url(#mjWatercolorSoft)"></polygon>
            <polygon points="870,80 910,206 890,200 875,126" fill="#c9d3d6" opacity="0.55" filter="url(#mjWatercolorSoft)"></polygon>
            <polygon points="1078,349 1100,320 1126,352 1112,343 1099,361 1087,344" fill="#fbf9f2" stroke="#3a3630" stroke-width="1" filter="url(#mjWatercolorSoft)"></polygon>
            <polygon points="582,357 600,332 620,358 610,351 600,366 591,350" fill="#fbf9f2" stroke="#3a3630" stroke-width="1" filter="url(#mjWatercolorSoft)"></polygon>
          </g>"""

TERRAIN_RE = re.compile(
    r'<rect x="0" y="0" width="1200" height="480".*?\n          </g>', re.S
)

# The clip path has to follow the new ridge, and the gradients have to be
# restretched over the taller frame.
DEFS_FIXES = [
    ('<polygon points="0,540 90,505 170,470 240,485 330,420 400,440 470,350 520,395 '
     '600,300 650,345 720,380 790,300 820,220 870,80 910,190 940,230 1000,300 '
     '1040,340 1100,290 1200,380 1200,600 0,600"></polygon>',
     '<polygon points="0,620 110,593 230,535 330,469 400,492 470,389 520,440 600,332 '
     '650,383 720,423 790,332 820,240 870,80 910,206 940,252 1000,332 '
     '1040,378 1100,320 1200,423 1200,675 0,675"></polygon>'),
    ('x1="0" y1="390" x2="0" y2="530"', 'x1="0" y1="435" x2="0" y2="595"'),
    ('x1="0" y1="0" x2="0" y2="480"', 'x1="0" y1="0" x2="0" y2="538"'),
    ('x1="0" y1="80" x2="0" y2="380"', 'x1="0" y1="80" x2="0" y2="423"'),
    ('sc-camel-view-box="0 0 1200 600"', 'sc-camel-view-box="0 0 1200 675"'),
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
          <!-- town on the lower slopes, below the first peak (x=330) -->
          <g transform="translate(285,500) scale(0.56)">
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
          <g transform="translate(940,366) scale(0.46)">
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
               520,440 — the low point between the peak at x=470 and the
               plateau — so the water reads as issuing from that valley. Both
               banks converge on that single point rather than meeting a flat
               top edge, which is what gives the channel its recession. -->
          <g transform="translate(447,434) scale(1)">
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

    # taller frame: new ridge, restretched gradients, new clip path
    doc, n = TERRAIN_RE.subn(lambda m: TERRAIN, doc, count=1)
    if n != 1:
        sys.exit("Could not find the terrain block.")
    for old, new in DEFS_FIXES:
        if doc.count(old) != 1:
            sys.exit(f"Expected one of:\n  {old[:70]}...\nfound {doc.count(old)}")
        doc = doc.replace(old, new, 1)

    # the altitude axis down the right-hand side of the map
    scale_re = re.compile(
        r'\s*<sc-if value="\{\{ showScale \}\}".*?</sc-if>', re.S
    )
    doc, n = scale_re.subn("", doc, count=1)
    if n != 1:
        sys.exit("Could not find the elevation scale block.")

    # scenery: filters/gradients into the mountain's <defs>, artwork before </svg>
    if doc.count("</defs>") != 1:
        sys.exit(f"Expected one </defs>, found {doc.count('</defs>')}")
    doc = doc.replace("</defs>", SCENERY_DEFS + "          </defs>", 1)

    svg_end = "          </g>\n\n        </svg>"
    if doc.count(svg_end) != 1:
        sys.exit(f"Expected one mountain <svg> tail, found {doc.count(svg_end)}")
    doc = doc.replace(svg_end, "          </g>\n" + SCENERY + "\n        </svg>", 1)

    # the figures section, ahead of "About the Publication"
    about = "<!-- ============ ABOUT"
    if doc.count(about) != 1:
        sys.exit(f"Expected one ABOUT section marker, found {doc.count(about)}")
    doc = doc.replace(about, FIGURES_SECTION + about, 1)

    # load the content files before the component runs
    head = re.search(r"<head[^>]*>", doc)
    if not head:
        sys.exit("No <head> in template.")
    i = head.end()
    doc = (doc[:i]
           + '<script src="stories-data.js"></script>'
           + '<script src="figures-data.js"></script>'
           + doc[i:])

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
