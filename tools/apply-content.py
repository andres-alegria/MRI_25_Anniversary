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
    // The number a reader sees is the story's position on the climb, so the
    // path reads 01 at the bottom to 25 at the summit. The editorial number
    // from stories-data.js is kept as `storyNum`, because that is the key the
    // plate's marker table is built on — and because it is what the print
    // edition and any external reference use. The two are deliberately
    // separate: renumbering the climb must never renumber the content.
    const _plate = window.MRI_PLATE;
    if (_plate && _plate.stories && _plate.stories.length) {
      const _pos = {};
      _plate.stories.forEach((st, i) => { _pos[st.num] = i + 1; });
      this.stories.forEach(s => {
        s.storyNum = s.num;
        s.climbNum = _pos[s.num] || s.num;
      });
      // the index lists them in the same order the mountain does
      this.stories.sort((a, b) => a.climbNum - b.climbNum);
      this.stories.forEach(s => { s.num = s.climbNum; });
    } else {
      this.stories.forEach(s => { s.storyNum = s.num; });
    }

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

    <!-- Same hairline as an unselected chip, so the frame recedes and the
         figure carries itself. Adjust border weight/tint here. -->
    <div style="border:1px solid rgba(58,54,48,.35);border-radius:6px;background:#f5f1e6;overflow:hidden">
      <div style="position:relative;width:100%;aspect-ratio:16/9">
        {{ figImg }}
      </div>
    </div>
    <div style="font:500 13px Jost,sans-serif;letter-spacing:.02em;color:#55503f;margin-top:14px">{{ figSubtitle }}</div>
    <div style="font:italic 400 14px/1.6 'Source Serif 4',Georgia,serif;color:#7d7666;margin-top:5px;max-width:66ch;text-wrap:pretty">{{ figCaption }}</div>
  </div>
</section>

"""

LABEL_OLD = ("white-space:nowrap;pointer-events:none;font:italic 600 15px 'Source Serif 4',Georgia,serif;color:#134e7f;background:rgba(250,246,236,.88);padding:1px 7px;border-bottom:1px solid #134e7f")
LABEL_NEW = ("white-space:nowrap;pointer-events:none;font:600 15px 'Source Serif 4',Georgia,serif;color:#DCE8F1;background:rgba(6,26,41,.92);padding:2px 9px;border-radius:2px;border-bottom:1px solid #4FA3D9")

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
    # Marker positions come from the generated plate. plate.js builds its
    # geometry synchronously at load, before the component is constructed, so
    # the table is already there by the time this runs. The original
    # expression is kept as a fallback: if plate.js is removed the markers
    # fall back onto the old artwork's coordinates rather than stacking at 0.
    (
        "        px: +(mx / 12).toFixed(2),\n        py: +(s.y / 6).toFixed(2),",
        "        px: (window.MRI_PLATE && window.MRI_PLATE.nodes[s.storyNum])\n"
        "          ? window.MRI_PLATE.nodes[s.storyNum].px : +(mx / 12).toFixed(2),\n"
        "        py: (window.MRI_PLATE && window.MRI_PLATE.nodes[s.storyNum])\n"
        "          ? window.MRI_PLATE.nodes[s.storyNum].py : +(s.y / 6.75).toFixed(2),",
    ),
    # The colour-coded dot on each filter chip. The twelve-colour theme
    # palette is no longer used to carry meaning — selection is carried by the
    # chip's own fill — so the dot is removed rather than restyled.
    (
        '<span style="width:7px;height:7px;border-radius:50%;'
        'background:{{ t.dot }};display:{{ t.dotDisplay }}"></span>',
        '',
    ),
    # --- the hover label on the mountain ---------------------------------
    # Upright, not italic. Its cream ground also had to go: on the night plate
    # it held a light blue on near-white, which was unreadable.
    (
        'position:absolute;left:38px;top:50%;transform:translateY(-50%);' + LABEL_OLD,
        'position:absolute;left:38px;top:50%;transform:translateY(-50%);' + LABEL_NEW,
    ),
    (
        'position:absolute;right:38px;top:50%;transform:translateY(-50%);' + LABEL_OLD,
        'position:absolute;right:38px;top:50%;transform:translateY(-50%);' + LABEL_NEW,
    ),
    # The hotspot wrappers are siblings in document order, so a label belonging
    # to an early marker was painted under every later marker's circle. Give
    # the hovered one a stacking context above the rest.
    (
        'width:40px;height:40px;transform:translate(-50%,-50%);animation:mjPop',
        'width:40px;height:40px;z-index:{{ s.zIdx }};transform:translate(-50%,-50%);animation:mjPop',
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
        "        style: openStory.image\n"
        "          ? { maxWidth: '100%', maxHeight: '70vh', width: 'auto', height: 'auto', display: 'block' }\n"
        "          : { width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' },\n"
        "      }) : null,\n"
        "      photoCaption: (openStory && openStory.image && openStory.image.caption) || '',",
    ),
    # The photo frame was locked to 16:9, which pillarboxed portrait images
    # like the Blatten aerial. Let the frame follow the image instead; the
    # max-height keeps a tall photo from pushing the text off the panel.
    (
        '<div style="aspect-ratio:16/9;margin-bottom:8px;overflow:hidden;'
        'background:#e6e0d0">',
        '<div style="margin-bottom:8px;overflow:hidden;background:#e6e0d0;'
        'max-height:70vh;display:flex;align-items:center;justify-content:center">',
    ),
    # caption under the photo
    (
        '<div style="font:italic 400 13px \'Source Serif 4\',Georgia,serif;'
        'color:#7d7666;margin-bottom:26px">Caption placeholder — captions '
        'should tell mini-stories of their own.</div>',
        '<div style="font:italic 400 13px \'Source Serif 4\',Georgia,serif;'
        'color:#7d7666;margin-bottom:26px">{{ photoCaption }}</div>',
    ),
    # Titles on hover only. The bundle passes labelMode='auto' explicitly, so
    # the ?? fallback never fires — the decision itself has to change. 'auto'
    # showed every label whenever 12 or fewer stories matched, which with all
    # 25 markers now drawn meant 25 overlapping titles.
    (
        "const labelsAlways = labelMode === 'always' || "
        "(labelMode === 'auto' && visible.length > 0 && visible.length <= 12);",
        "const labelsAlways = labelMode === 'always';",
    ),
    (
        'font:600 10px Jost,sans-serif;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 0 0 2.5px rgba(250,246,236,.85)',
        "font:500 10px 'IBM Plex Mono',ui-monospace,monospace;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:0 0 0 2.5px rgba(255,255,255,.92)",
    ),
    (
        "dotLabel: numbers ? String(s.num) : ''",
        "dotLabel: numbers ? String(s.num).padStart(2, '0') : ''",
    ),
    (
        'border:1.5px solid {{ s.markerColor }}',
        'border:1px solid {{ s.markerColor }}',
    ),
    # Filtering highlights instead of hiding: all 25 markers stay on the
    # mountain, the matching thread turns MRI blue and the rest recede. The
    # list below still filters — the mountain shows the whole set, the list
    # shows the selection.
    (
        "const visibleStories = visible.map((s, i) => {",
        "const _matched = new Set(visible.map(v => v.num));\n"
        "    const _filtering = !!activeTag && activeTag !== 'All';\n"
        "    const visibleStories = this.stories.map((s, i) => {\n"
        "      const _hi = _filtering && _matched.has(s.num);\n"
        "      const _dim = _filtering && !_matched.has(s.num);",
    ),
    (
        "markerColor: mc,",
        "markerColor: _hi ? mc : (_dim ? '#e2e2da' : '#15150f'),\n"
        "        zIdx: hoverId === s.id ? 60 : 1,",
    ),
    (
        "dotColor: hoverId === s.id ? '#ffffff' : '#3a3630'",
        "dotColor: hoverId === s.id ? '#ffffff'\n"
        "          : (_hi ? '#0B2740' : (_dim ? '#b3b3aa' : '#15150f'))",
    ),
    (
        "dotBg: hoverId === s.id ? mc : '#fbf9f2'",
        "dotBg: hoverId === s.id ? (_hi ? mc : '#15150f') : (_hi ? mc : '#ffffff')",
    ),
    # the prompt overlay covered a mountain that is now always populated
    ("showPrompt: !activeTag,", "showPrompt: false,"),
    (
        "filterCaption = 'No theme selected yet — the mountain is waiting.';",
        "filterCaption = 'All 25 stories are marked on the mountain. "
        "Choose a theme to highlight a thread.';",
    ),
    (
        "'\\u201D. Other stories remain hidden on the mountain.'",
        "'\\u201D.'",
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
        "const coords = [[870,112],[895,176],[845,199],[915,236],[800,282],[1100,300],"
        "[605,309],[960,282],[770,322],[480,350],[655,350],[1040,354],[560,382],"
        "[880,364],[720,382],[1130,391],[345,418],[620,418],[990,428],[1160,465],"
        "[180,460],[780,446],[280,469],[430,437],[60,497]];",
    ),
    # (the old percentage-of-viewBox restretch is now folded into the plate
    #  fallback above, since the plate supplies these positions directly)
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
    # The story list becomes a numbered index. The card surface is deleted
    # rather than recoloured — #fcfaf3 was the last warm value, reading beige
    # against the neutral ground — and the same 01-25 numerals as the mountain
    # tie the list to the map. Tags lose their theme colour: five of the twelve
    # failed AA at this size.
    (
        '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px">\n          <sc-for list="{{ visibleStories }}" as="s" hint-placeholder-count="0">\n            <button sc-camel-on-click="{{ s.onOpen }}" style="cursor:pointer;text-align:left;background:#fcfaf3;border:1px solid rgba(58,54,48,.35);border-radius:6px;padding:12px 14px;display:flex;flex-direction:column;gap:4px" style-hover="border-color:#0067b2">\n              \n              <span style="font:600 16px \'Source Serif 4\',Georgia,serif;color:#2b2721">{{ s.title }}</span>\n              <span style="display:flex;flex-wrap:wrap;gap:6px;font:500 10.5px Jost,sans-serif;letter-spacing:.1em"><sc-for list="{{ s.tagList }}" as="tg" hint-placeholder-count="2"><sc-if value="{{ tg.notFirst }}" hint-placeholder-val="{{ false }}"><span style="color:#a89f8c">·</span></sc-if><span style="color:{{ tg.color }}">{{ tg.name }}</span></sc-for></span>\n            </button>',
        '<div style="border-bottom:1px solid #e6e6e0">\n          <sc-for list="{{ visibleStories }}" as="s" hint-placeholder-count="0">\n            <button sc-camel-on-click="{{ s.onOpen }}" style="cursor:pointer;text-align:left;width:100%;background:transparent;border:0;border-top:1px solid #e6e6e0;border-radius:0;padding:14px 4px;display:grid;grid-template-columns:44px 1fr;gap:14px;align-items:baseline" style-hover="background:#f2f2ee">\n              <span style="font:500 12px \'IBM Plex Mono\',ui-monospace,monospace;color:#9a9a90;font-variant-numeric:tabular-nums">{{ s.numLabel }}</span>\n              <span style="display:flex;flex-direction:column;gap:5px">\n                <span style="font:600 18px/1.3 \'Source Serif 4\',Georgia,serif;color:#15150f">{{ s.title }}</span>\n                <span style="display:flex;flex-wrap:wrap;gap:6px;font:400 10.5px \'IBM Plex Mono\',ui-monospace,monospace;letter-spacing:.07em;color:#5f5f58;text-transform:uppercase"><sc-for list="{{ s.tagList }}" as="tg" hint-placeholder-count="2"><sc-if value="{{ tg.notFirst }}" hint-placeholder-val="{{ false }}"><span>·</span></sc-if><span>{{ tg.name }}</span></sc-for></span>\n              </span>\n            </button>',
    ),
    ("num: s.num,", "num: s.num,\n        numLabel: String(s.num).padStart(2, '0'),"),
]

# --- 2b. taller frame, five peaks, one plateau -----------------------------
# The frame goes from 2:1 to 16:9. The viewBox grows 600 -> 675 while the
# summit stays at y=80, so one viewBox unit still renders at the same size:
# the sky band is untouched and the mountain simply gets taller. Every y below
# the summit was scaled by (675-80)/(600-80).
#
# The old leftmost peak (x=170) is gone — the slope now climbs smoothly from
# the left edge — leaving five peaks.
TERRAIN = """<rect x="0" y="0" width="1200" height="446" fill="url(#mjSky)" filter="url(#mjWatercolorSoft)"></rect>
          <ellipse cx="300" cy="400" rx="240" ry="20" fill="#eef2ea" opacity="0.7" filter="url(#mjWatercolorSoft)"></ellipse>
          <ellipse cx="950" cy="373" rx="220" ry="18" fill="#eef2ea" opacity="0.6" filter="url(#mjWatercolorSoft)"></ellipse>
          <g>
            <polygon points="0,465 80,418 160,391 250,354 330,373 420,336 500,354 580,318 660,282 740,300 810,263 900,245 980,272 1060,290 1140,309 1200,336 1200,675 0,675" fill="#ede6d5" filter="url(#mjWatercolorSoft)"></polygon>
            <polygon points="0,512 110,490 230,444 330,391 400,410 470,327 520,368 600,282 650,322 720,354 790,282 820,208 870,80 910,181 940,218 1000,282 1040,318 1100,272 1200,354 1200,675 0,675" fill="#e7e0cd" stroke="#3a3630" stroke-width="1.5" filter="url(#mjWatercolorSoft)"></polygon>
            <rect x="0" y="364" width="1200" height="311" fill="url(#mjGreenFade)" clip-path="url(#mjMountainClip)" filter="url(#mjWatercolor)"></rect>
            <rect x="0" y="80" width="1200" height="274" fill="url(#mjIceFade)" clip-path="url(#mjMountainClip)" filter="url(#mjWatercolor)"></rect>
            <polygon points="820,208 870,80 910,181 940,218 918,210 895,240 872,222 848,246 826,225" fill="#fbf9f2" stroke="#3a3630" stroke-width="1.5" filter="url(#mjWatercolorSoft)"></polygon>
            <polygon points="870,80 910,181 890,176 875,117" fill="#c9d3d6" opacity="0.55" filter="url(#mjWatercolorSoft)"></polygon>
            <polygon points="1078,295 1100,272 1126,298 1112,290 1099,305 1087,291" fill="#fbf9f2" stroke="#3a3630" stroke-width="1" filter="url(#mjWatercolorSoft)"></polygon>
            <polygon points="582,302 600,282 620,302 610,297 600,309 591,296" fill="#fbf9f2" stroke="#3a3630" stroke-width="1" filter="url(#mjWatercolorSoft)"></polygon>
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
     '<polygon points="0,512 110,490 230,444 330,391 400,410 470,327 520,368 600,282 '
     '650,322 720,354 790,282 820,208 870,80 910,181 940,218 1000,282 '
     '1040,318 1100,272 1200,354 1200,675 0,675"></polygon>'),
    ('x1="0" y1="390" x2="0" y2="530"', 'x1="0" y1="364" x2="0" y2="492"'),
    ('x1="0" y1="0" x2="0" y2="480"', 'x1="0" y1="0" x2="0" y2="446"'),
    ('x1="0" y1="80" x2="0" y2="380"', 'x1="0" y1="80" x2="0" y2="354"'),
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
          <g transform="translate(285,416) scale(0.56)">
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
          <g transform="translate(940,309) scale(0.46)">
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
          <g transform="translate(424,360) scale(1.31)">
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


# --- 5. interface register: neutral ground, contemporary sans ------------
# The illustration keeps its warm, hand-made character; everything around it
# becomes quiet and precise, so the contrast between the two carries the
# identity. Adjust the palette here.
#
# These replacements are applied ONLY outside the mountain <svg>: several
# colours (e.g. #fbf9f2 is snow inside the artwork and a card background
# outside it) mean different things in the two contexts.
MOUNTAIN_SVG_RE = re.compile(r'<svg sc-camel-view-box="0 0 1200 675".*?</svg>', re.S)

UI_RESTYLE = [
    # typography — Jost is Futura-derived and reads period; Inter is neutral
    ("Jost,system-ui,sans-serif", "Inter,system-ui,sans-serif"),
    ("Jost,sans-serif", "Inter,system-ui,sans-serif"),

    # grounds — warm off-white out, near-neutral in
    ("background:#f4efe3", "background:#fafaf8"),
    ("#efe9da", "#f2f2ee"),
    ("#f5f1e6", "#f7f7f4"),
    ("#fbf9f2", "#ffffff"),
    # the map frame stays warm: it is the one surface that belongs to the artwork
    ("#faf6ec", "#f6f2e8"),

    # contrast — #a89f8c was 2.29:1 and #7d7666 3.93:1 on the old ground,
    # both below AA for normal text
    ("#a89f8c", "#5f5f58"),
    ("#8f8878", "#5f5f58"),
    ("#7d7666", "#5f5f58"),

    # geometry — precision is most of what reads as contemporary
    ("border-radius:6px", "border-radius:2px"),
    ("1.5px solid #3a3630", "1px solid #dcdcd4"),
    ("rgba(58,54,48,.35)", "#d4d4cd"),
    ("rgba(58,54,48,.3)", "#e2e2da"),
    ("rgba(58,54,48,.25)", "#e2e2da"),

    # monospaced metadata reads as measurement rather than decoration
    ('font:400 13px Inter,system-ui,sans-serif;color:#5f5f58;margin-bottom:22px',
     "font:400 12px 'IBM Plex Mono',ui-monospace,monospace;color:#5f5f58;margin-bottom:22px"),
]

FONT_LINK = ('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>'
             '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?'
             'family=Inter:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500'
             '&family=Jost:wght@300;400;500;600&display=swap">')


# --- 6. brand: the register developed in Ascent_25Stories -----------------
#
# Colour derives from the MRI Corporate Identity Guide (Pantone 2935 / #0067B2
# and the secondary navy / teal / green set). The page turns nocturnal: an ink
# ground with light text, the way the plate in Ascent reads.
#
# Like UI_RESTYLE these run only outside the mountain SVG — several of these
# values mean something different inside the artwork.

# adjust the brand palette here; these are the tokens the whole page derives from
BRAND = {
    'ink':      '#061A29',   # page ground
    'ink_soft': '#0B2740',   # raised panels, cards, the figure well
    'ink_line': '#12395C',   # a panel edge that is felt more than seen
    'text':     '#DCE8F1',   # body text on the ground
    'text_dim': '#93A9BC',   # metadata — 7:1 on the ground, comfortably AA
    'blue':     '#0067B2',   # MRI blue: fills and selection
    'blue_lit': '#4FA3D9',   # blue as *text* on a dark ground, where #0067B2 fails
    'teal':     '#16A3B8',
    'green':    '#009E60',
}

BRAND_RESTYLE = [
    # --- typography ------------------------------------------------------
    # Body prose stops being a serif before the blanket rule below turns every
    # remaining Source Serif into Jost — order matters here.
    ("font:400 16px/1.72 'Source Serif 4',Georgia,serif",
     "font:300 16px/1.75 Inter,system-ui,sans-serif"),
    ("font:400 13px/1.6 'Source Serif 4',Georgia,serif",
     "font:300 13px/1.6 Inter,system-ui,sans-serif"),
    # Display face is Jost — the closest free stand-in for MRI's corporate
    # Futura. Substituting real Futura here changes every line break, because
    # its x-height is much smaller; Jost keeps all readers on the same page.
    ("'Source Serif 4',Georgia,serif", "Jost,'Century Gothic',system-ui,sans-serif"),

    # --- grounds ---------------------------------------------------------
    ("background:#fafaf8", f"background:{BRAND['ink']}"),
    ("#fafaf8", BRAND['ink']),
    ("#f2f2ee", BRAND['ink_soft']),
    ("#f7f7f4", BRAND['ink_soft']),
    ("#ffffff", BRAND['ink_soft']),
    # the map frame is the one surface that belongs to the artwork; it keeps a
    # little of the sky's warmth so the plate does not float free of the page
    ("#f6f2e8", "#0A2233"),
    # Warm near-whites used as *surfaces*, not as text: the story cards, the
    # COMPANION VOLUME panel and the story reader itself. Left light they hold
    # light text on a near-white ground — the reader panel was unreadable.
    ("#fcfaf3", BRAND['ink_soft']),
    ("#e6e0d0", "#0A2233"),
    ("#e9f0f6", "#0A2233"),

    # --- text ------------------------------------------------------------
    # As *text* on this ground #0067B2 is only 3.0:1, so every `color:` use —
    # the Print Edition link, the eyebrows, the reader's controls — takes the
    # lit blue instead. Fills keep the true brand blue, where white sits on it
    # at 4.6:1, and those are written `background:` so this cannot touch them.
    ("color:#0067b2", f"color:{BRAND['blue_lit']}"),
    ("#134e7f", BRAND['blue_lit']),

    ("#15150f", BRAND['text']),
    ("#5f5f58", BRAND['text_dim']),
    # the bundle's own inks, which the neutral pass never had to touch
    ("#2b2721", BRAND['text']),      # headings, nav, footer, inactive chip text
    ("#33302a", BRAND['text']),
    ("#55503f", BRAND['text_dim']),  # secondary text and the quieter chip label
    ("#44402f", BRAND['text_dim']),
    # #3a3630 is the *selected* chip's fill, and its paired text colour is
    # already the dark panel ink — so on this ground the fill has to become
    # light, not dark, or selection would read as a hole.
    ("#3a3630", BRAND['text']),

    # --- edges -----------------------------------------------------------
    ("#dcdcd4", BRAND['ink_line']),
    ("#e2e2da", BRAND['ink_line']),
    ("#d4d4cd", BRAND['ink_line']),
    # the greys a dimmed marker falls back to during filtering
    ("#b3b3aa", "#3E5F7E"),
]

# Fixed texture layers and the few rules that inline styles cannot express.
# Injected as a stylesheet rather than markup so no component has to change.
BRAND_STYLE = """<style id="mri-brand">
  /* Grain and contour overlay the finished page rather than sitting behind it.
     Behind would mean giving every top-level child a stacking context, and the
     bundle positions those itself — safer to lay the texture on top at a low
     enough strength that nothing underneath is harmed. Adjust strength here. */
  body::before, body::after {
    content: ''; position: fixed; inset: -10%;
    pointer-events: none; z-index: 9000;
  }
  body::before {                       /* topographic line motif */
    opacity: .04; mix-blend-mode: soft-light;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='600' viewBox='0 0 600 600'><g fill='none' stroke='%23ffffff' stroke-width='1.1'><path d='M-50 120 C 90 60, 200 190, 320 130 S 560 60, 660 140'/><path d='M-50 170 C 90 110, 200 240, 320 180 S 560 110, 660 190'/><path d='M-50 220 C 90 160, 200 290, 320 230 S 560 160, 660 240'/><path d='M-50 290 C 100 230, 210 360, 330 300 S 570 235, 660 315'/><path d='M-50 345 C 100 285, 210 415, 330 355 S 570 290, 660 370'/><path d='M-50 425 C 110 370, 220 495, 340 440 S 580 375, 660 455'/><path d='M-50 480 C 110 425, 220 550, 340 495 S 580 430, 660 510'/></g></svg>");
    background-size: clamp(420px, 45vw, 760px);
  }
  body::after {                        /* film grain */
    opacity: .08; mix-blend-mode: overlay;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='g'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/><feColorMatrix type='saturate' values='0'/></filter><rect width='100%25' height='100%25' filter='url(%23g)'/></svg>");
  }
  /* Jost sets tighter than the serif it replaced */
  h1, h2, h3 { letter-spacing: -.022em; }

  ::selection { background: __GREEN__; color: __INK__; }

  /* The watercolour plate was painted for a white page, so on this ground it
     would otherwise glare. Dimming and cooling it settles it into the night
     without rotating its hues — an earlier attempt used hue-rotate and turned
     the washes a dead grey-violet, losing the difference between rock, meadow
     and ice. Set filter:none to let the plate keep its daylight and read as a
     lit window in a dark page instead; that is the other legitimate answer. */
  /* The plate is taken full-bleed in plate.js rather than here: the <svg>
     carries an inline width:100% inside an absolutely-positioned wrapper, and
     an inline style always beats a stylesheet rule. */
</style>"""


def brand_style() -> str:
    return (BRAND_STYLE
            .replace('__GREEN__', BRAND['green'])
            .replace('__INK__', BRAND['ink']))


def asset(name: str) -> str:
    """A <script> tag whose URL changes when the file does.

    index.html, stories-data.js, plate.js and motion.js are separate requests,
    and a browser will happily pair a fresh index.html with a cached copy of
    the others — locally that shows up as edits that appear to do nothing, and
    on GitHub Pages it would serve readers a stale script against new markup.
    Hashing the contents into the query string makes that impossible.
    """
    f = ROOT / name
    tag = ""
    if f.exists():
        import hashlib
        tag = "?v=" + hashlib.sha1(f.read_bytes()).hexdigest()[:10]
    return f'<script src="{name}{tag}"></script>'


def restyle_ui(doc: str, rules=UI_RESTYLE) -> str:
    """Apply an interface restyle everywhere except inside the mountain SVG."""
    m = MOUNTAIN_SVG_RE.search(doc)
    if not m:
        sys.exit("Could not isolate the mountain SVG; refusing to restyle.")
    head, art, tail = doc[:m.start()], m.group(0), doc[m.end():]
    for old, new in rules:
        head = head.replace(old, new)
        tail = tail.replace(old, new)
    return head + art + tail


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

    # the paper texture tiled behind the journey section — the single
    # strongest source of the "aged paper" reading
    texture = ('background:linear-gradient(rgba(244,239,227,.2),rgba(244,239,227,.2)),'
               'url(&quot;b4252c89-0b9b-4a32-90ff-59fd6e3e3de8&quot;) #f4efe3;'
               'background-size:auto,1000px auto')
    if doc.count(texture) != 1:
        sys.exit(f"Expected one tiled paper texture, found {doc.count(texture)}")
    doc = doc.replace(texture, 'background:#fafaf8', 1)

    doc = restyle_ui(doc)
    # then the brand pass, on top of the neutral one
    doc = restyle_ui(doc, BRAND_RESTYLE)

    # load the content files before the component runs
    head = re.search(r"<head[^>]*>", doc)
    if not head:
        sys.exit("No <head> in template.")
    i = head.end()
    doc = (doc[:i]
           + FONT_LINK
           + brand_style()
           + asset('stories-data.js')
           + asset('figures-data.js')
           # GSAP is vendored rather than pulled from a CDN: this publication
           # has to keep working long after any CDN we picked today.
           + asset('vendor/gsap.min.js')
           + asset('vendor/DrawSVGPlugin.min.js')
           # plate.js must run before the component is constructed: it builds
           # the marker table the render reads. It needs gsap and the stories,
           # so it loads after both.
           + asset('plate.js')
           + asset('motion.js')
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
