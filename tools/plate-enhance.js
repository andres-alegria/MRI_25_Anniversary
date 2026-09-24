/* ---------------------------------------------------------------------------
   Reading aids the bundled page does not ship with.

   This file is appended to plate.js by tools/make-plate-js.py, so it loads
   beside the artwork and survives a re-export of the design. Everything here
   is defensive: it reads the page as it finds it and gives up quietly when
   the shape it expects is not there.

   It adds: a page title and language; a skip link; an index of the 25
   stories that is always visible; dialog behaviour, keyboard control and an
   address for the open story; markers that say what they are and can be hit
   on a phone; a note on the stories still to come; and a few contrast and
   focus repairs.
--------------------------------------------------------------------------- */
(function () {
  'use strict';

  var SITE = 'Stories from Our Changing Mountains — MRI 25th Anniversary';
  var ROUND = /border-radius:\s*50%/;
  /* the panel's own prev / next / close buttons are round too, so a station
     is a round button whose label is its number */
  function isMarker(b) {
    return b && ROUND.test(b.getAttribute('style') || '') && /^\d{1,2}$/.test((b.textContent || '').trim());
  }

  if (!document.title) document.title = SITE;
  if (!document.documentElement.getAttribute('lang')) document.documentElement.setAttribute('lang', 'en');
  if (!document.querySelector('meta[name="description"]')) {
    var meta = document.createElement('meta');
    meta.name = 'description';
    meta.content = 'Twenty-five stories from a quarter-century of mountain research, told across one '
      + 'composite mountain landscape — from the lowlands to the cryosphere.';
    document.head.appendChild(meta);
  }

  /* --- styles: focus clear of the sticky header, a dimmed state that keeps
         its contrast, the index, and touch-sized stations on a phone ------ */
  var css = document.createElement('style');
  css.textContent = [
    'html { scroll-padding-top: 110px; }',
    /* "not in this theme" is now said with a paler ring, not with a fill the
       numeral sinks into — adjust the dimmed marker colour here */
    ':root { --mri-marker-dim: #7FA6C8; }',
    ':root[data-theme="light"] { --mri-marker-dim: #55646D; }',
    '.mri-skip { position: absolute; left: -9999px; top: 0; z-index: 100; background: var(--mri-panel);',
    '  color: var(--mri-text); padding: 10px 16px; border-radius: 0 0 8px 0;',
    '  font: 600 14px/1 Inter, system-ui, sans-serif; }',
    '.mri-skip:focus { left: 0; }',
    '[data-mri-marker] button:focus-visible { outline: 3px solid var(--mri-accent); outline-offset: 3px; }',
    /* a station whose story is still to come: lighter, dashed ring */
    '[data-mri-soon] button { opacity: .72; border-style: dashed !important; }',
    /* the index: plain titles, which every reader asked for before anything else */
    '.mri-index { margin: 26px auto 8px; max-width: 1180px; padding: 0 22px; }',
    '.mri-index h2 { font: 600 13px/1 "IBM Plex Mono", monospace; letter-spacing: .14em;',
    '  text-transform: uppercase; color: var(--mri-text-dim); margin: 0 0 12px; }',
    '.mri-index ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px;',
    '  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); }',
    '.mri-index button { width: 100%; min-height: 44px; display: flex; gap: 12px; align-items: center;',
    '  text-align: left; padding: 9px 12px; border-radius: 9px; cursor: pointer;',
    '  background: transparent; color: var(--mri-text); border: 1px solid transparent;',
    '  font: 400 15px/1.35 Inter, system-ui, sans-serif; }',
    '.mri-index button:hover { background: var(--mri-panel); border-color: var(--mri-line); }',
    '.mri-index button:focus-visible { outline: 3px solid var(--mri-accent); outline-offset: 2px; }',
    '.mri-index b { font: 600 13px/1 "IBM Plex Mono", monospace; color: var(--mri-accent); min-width: 22px; }',
    '.mri-index [data-soon] { color: var(--mri-text-dim); }',
    '.mri-index [data-soon] em { font-style: normal; font-size: 12px; opacity: .8; margin-left: auto; }',
    '@media (max-width: 900px) {',
    '  [data-mri-marker] { display: none !important; }',
    '  .mri-index ol { grid-template-columns: 1fr; }',
    '}'
  ].join('\n');
  document.head.appendChild(css);

  function onBody(fn) {
    if (document.body) { fn(); return; }
    document.addEventListener('DOMContentLoaded', fn);
  }

  onBody(function () {
    if (document.querySelector('.mri-skip')) return;
    var skip = document.createElement('a');
    skip.className = 'mri-skip';
    skip.href = '#mri-index';
    skip.textContent = 'Skip to the list of stories';
    document.body.insertBefore(skip, document.body.firstChild);
  });

  /* a quiet announcement when the filter or the story changes */
  var live = document.createElement('div');
  live.setAttribute('aria-live', 'polite');
  live.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap';
  onBody(function () { document.body.appendChild(live); });
  function say(msg) { live.textContent = ''; setTimeout(function () { live.textContent = msg; }, 30); }

  /* --- which stories are written, from the editorial data ---------------- */
  function pending(num) {
    try {
      var all = window.STORIES || (window.MRI_CONTENT && window.MRI_CONTENT.STORIES);
      if (!all) return false;
      for (var i = 0; i < all.length; i++) {
        if (all[i].num === num) return all[i].status && all[i].status !== 'draft';
      }
    } catch (e) {}
    return false;
  }

  function markers() {
    var out = [];
    document.querySelectorAll('button').forEach(function (b) {
      if (isMarker(b)) out.push(b);
    });
    return out.sort(function (a, b) { return parseInt(a.textContent, 10) - parseInt(b.textContent, 10); });
  }
  function storyNum(btn) {
    var climb = parseInt(btn.textContent.trim(), 10);
    var node = window.MRI_PLATE && window.MRI_PLATE.byClimb && window.MRI_PLATE.byClimb[climb];
    return node ? node.num : climb;
  }
  function titleOf(btn) {
    return (btn.getAttribute('aria-label') || '').replace(/^Station \d+:\s*/, '');
  }

  /* --- the artwork is decoration with a description ---------------------- */
  function describeArt() {
    var h = document.querySelector('svg[data-mri-plate="done"]');
    if (!h || h.getAttribute('role')) return;
    h.setAttribute('role', 'img');
    h.setAttribute('aria-label', 'A composite mountain landscape drawn as a cut block: a glaciated range with '
      + 'a river plain, farmland, forest and a dry rain-shadow side, with the rock beneath shown on two cut '
      + 'faces. The 25 stories are marked on it as numbered stations.');
    Array.prototype.forEach.call(h.children, function (g) { g.setAttribute('aria-hidden', 'true'); });
  }

  /* the fine cartographic labels are unreadable on a small plate */
  function labelsForWidth() {
    var h = document.querySelector('svg[data-mri-plate="done"]');
    if (!h) return;
    var small = h.getBoundingClientRect().width < 1100;
    ['Labels', 'Face-labels', 'Face-symbols', 'Key'].forEach(function (id) {
      var g = h.querySelector('#' + id);
      if (g) g.style.display = small ? 'none' : '';
    });
  }

  /* --- markers: a name a person can say, and a state a reader can see ---- */
  function nameMarkers() {
    markers().forEach(function (btn) {
      var n = btn.textContent.trim();
      if (btn.parentElement) {
        btn.parentElement.setAttribute('data-mri-marker', n);
        if (pending(storyNum(btn))) btn.parentElement.setAttribute('data-mri-soon', '');
      }
      var label = btn.getAttribute('aria-label') || '';
      if (label && label.indexOf('Station ') !== 0) {
        btn.setAttribute('aria-label', 'Station ' + n + ': ' + label
          + (pending(storyNum(btn)) ? ' — story still to come' : ''));
      }
    });
  }

  /* --- an index of the 25, always visible -------------------------------- */
  function buildIndex() {
    var h = document.querySelector('svg[data-mri-plate="done"]');
    var ms = markers();
    var had = document.querySelector('.mri-index');
    /* the page renders its markers in passes, so the index is rebuilt while
       their number is still growing */
    if (!h || ms.length < 5) return;
    if (had && had.querySelectorAll('li').length === ms.length) return;
    if (had) had.remove();
    var wrap = document.createElement('nav');
    wrap.className = 'mri-index';
    wrap.id = 'mri-index';
    wrap.setAttribute('aria-label', 'The 25 stories, in order along the route');
    var done = 0;
    ms.forEach(function (b) { if (!pending(storyNum(b))) done++; });
    var head = document.createElement('h2');
    head.textContent = 'The 25 stories, in route order · ' + done + ' published so far';
    wrap.appendChild(head);
    var ol = document.createElement('ol');
    ms.forEach(function (btn) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      var soon = pending(storyNum(btn));
      if (soon) b.setAttribute('data-soon', '');
      b.innerHTML = '<b>' + btn.textContent.trim() + '</b><span>' + (titleOf(btn) || 'Story') + '</span>'
        + (soon ? '<em>to come</em>' : '');
      b.addEventListener('click', function () { btn.click(); });
      li.appendChild(b);
      ol.appendChild(li);
    });
    wrap.appendChild(ol);
    var frame = h.parentElement;
    if (frame && frame.parentElement) frame.parentElement.insertBefore(wrap, frame.nextSibling);
  }

  /* --- the story panel: a dialog with an address ------------------------- */
  var opener = null, lastSlug = null;
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function panel() {
    var asides = document.querySelectorAll('aside');
    for (var i = 0; i < asides.length; i++) {
      if (asides[i].querySelector('button[aria-label="Close story"]')) return asides[i];
    }
    return null;
  }

  function dressPanel() {
    var p = panel();
    if (!p) {
      if (lastSlug) {
        lastSlug = null;
        document.title = SITE;
        document.body.style.overflow = '';
        if (location.hash.indexOf('#story/') === 0) {
          history.replaceState(null, '', location.pathname + location.search);
        }
        if (opener && document.contains(opener)) { try { opener.focus(); } catch (e) {} }
      }
      return;
    }
    var h = p.querySelector('h1, h2');
    var title = h ? h.textContent.trim() : '';
    if (!p.hasAttribute('role')) {
      p.setAttribute('role', 'dialog');
      p.setAttribute('aria-modal', 'true');
      p.style.overscrollBehavior = 'contain';
      document.body.style.overflow = 'hidden';
      if (h) {
        if (!h.id) h.id = 'mri-story-title';
        p.setAttribute('aria-labelledby', h.id);
        h.setAttribute('tabindex', '-1');
        /* the panel re-renders once after it opens, so the heading is focused
           again on the next tick rather than only now */
        [0, 150, 400].forEach(function (d) {
          setTimeout(function () {
            if (panel() && document.activeElement === document.body) {
              try { h.focus({ preventScroll: true }); } catch (e) { try { h.focus(); } catch (e2) {} }
            }
          }, d);
        });
      }
    }
    /* the label that follows the cursor on the mountain must not lie across
       the story it opened: anything outside the panel repeating its title goes */
    if (title) {
      document.querySelectorAll('div, span').forEach(function (n) {
        if (n.children.length || p.contains(n)) return;
        if ((n.textContent || '').trim() !== title) return;
        var cs = getComputedStyle(n);
        if (cs.position === 'absolute' || cs.position === 'fixed') n.style.display = 'none';
      });
    }
    document.body.style.overflow = 'hidden';
    /* the page re-renders the panel a moment after it opens, which throws
       focus back to the body; put it on the heading whenever that happens */
    if (h && document.activeElement === document.body) {
      try { h.focus({ preventScroll: true }); } catch (e) { try { h.focus(); } catch (e2) {} }
    }
    var s = slug(title);
    if (s && s !== lastSlug) {
      lastSlug = s;
      document.title = title + ' — ' + SITE;
      history.replaceState(null, '', '#story/' + s);
      p.scrollTop = 0;
      say(title + ' opened');
    }
  }

  document.addEventListener('keydown', function (e) {
    var p = panel();
    if (!p) return;
    if (e.key === 'Escape') {
      var c = p.querySelector('button[aria-label="Close story"]');
      if (c) { e.preventDefault(); c.click(); }
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      var b = p.querySelector('button[aria-label="' + (e.key === 'ArrowLeft' ? 'Previous' : 'Next') + ' story"]');
      if (b) { e.preventDefault(); b.click(); }
      return;
    }
    if (e.key !== 'Tab') return;
    var f = p.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, true);

  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('button');
    if (isMarker(b)) opener = b;
  }, true);

  /* --- the promised PDF is not a link until it exists -------------------- */
  function fixPdf() {
    document.querySelectorAll('a[href="#"]').forEach(function (a) {
      if (!/download pdf/i.test(a.textContent)) return;
      a.setAttribute('role', 'button');
      a.setAttribute('aria-disabled', 'true');
      a.style.opacity = '0.55';
      a.style.pointerEvents = 'none';
      a.textContent = 'PDF available 11 December 2026';
    });
  }

  /* --- the theme chips say whether they are on -------------------------- */
  function dressChips() {
    document.querySelectorAll('button[data-dc-tpl]').forEach(function (c) {
      var style = c.getAttribute('style') || '';
      if (!/gap:\s*7px/.test(style)) return;
      c.setAttribute('aria-pressed', /font-weight:\s*600/.test(style) ? 'true' : 'false');
    });
  }

  /* --- open the story named in the address ------------------------------ */
  function openFromHash() {
    var m = /^#story\/(.+)$/.exec(location.hash || '');
    if (!m) return;
    var want = m[1], tries = 0;
    (function look() {
      var hit = null;
      markers().forEach(function (btn) { if (slug(titleOf(btn)) === want) hit = btn; });
      if (hit) { hit.click(); return; }
      if (tries++ < 60) setTimeout(look, 120);
    })();
  }

  var busy = false;
  function enhance() {
    if (busy) return;
    busy = true;
    try { describeArt(); } catch (e) {}
    try { labelsForWidth(); } catch (e) {}
    try { nameMarkers(); } catch (e) {}
    try { buildIndex(); } catch (e) {}
    try { dressPanel(); } catch (e) {}
    try { dressChips(); } catch (e) {}
    try { fixPdf(); } catch (e) {}
    busy = false;
  }

  onBody(function () {
    new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
    setTimeout(function () { enhance(); openFromHash(); }, 600);
  });
  window.addEventListener('resize', function () { try { labelsForWidth(); } catch (e) {} });
  window.addEventListener('popstate', function () {
    var p = panel();
    if (location.hash.indexOf('#story/') !== 0 && p) {
      var c = p.querySelector('button[aria-label="Close story"]');
      if (c) c.click();
    } else { openFromHash(); }
  });
})();
