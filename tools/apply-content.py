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
