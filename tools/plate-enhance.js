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
  var ARRIVED = location.hash;   /* the address the reader arrived with, before the page rewrites it */
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
  [['og:title', SITE], ['og:type', 'website'],
   ['og:description', 'Twenty-five stories from a quarter-century of mountain research, told across one '
     + 'composite mountain landscape.'],
   ['twitter:card', 'summary_large_image'],
   ['og:image', location.origin + location.pathname.replace(/[^/]*$/, '') + 'art/share-card.png'],
   ['og:url', location.origin + location.pathname]].forEach(function (pair) {
    if (document.querySelector('meta[property="' + pair[0] + '"], meta[name="' + pair[0] + '"]')) return;
    var m = document.createElement('meta');
    m.setAttribute(pair[0].indexOf('og:') === 0 ? 'property' : 'name', pair[0]);
    m.content = pair[1];
    document.head.appendChild(m);
  });

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
    'aside[role="dialog"] button { min-width: 44px; min-height: 44px; }',
    /* the index: plain titles, which every reader asked for before anything else */
    '.mri-index { margin: 26px auto 8px; max-width: 1180px; padding: 0 22px; }',
    '.mri-index h2 { font: 600 13px/1 "IBM Plex Mono", monospace; letter-spacing: .14em;',
    '  text-transform: uppercase; color: var(--mri-text-dim); margin: 0 0 12px; }',
    '.mri-index ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px;',
    '  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); }',
    '.mri-index a { text-decoration: none; }',
    '.mri-index button, .mri-index a { width: 100%; min-height: 44px; display: flex; gap: 12px; align-items: center;',
    '  text-align: left; padding: 9px 12px; border-radius: 9px; cursor: pointer;',
    '  background: transparent; color: var(--mri-text); border: 1px solid transparent;',
    '  font: 400 15px/1.35 Inter, system-ui, sans-serif; }',
    '.mri-index a:hover, .mri-index button:hover { background: var(--mri-panel); border-color: var(--mri-line); }',
    '.mri-index a:focus-visible { outline: 3px solid var(--mri-accent); outline-offset: 2px; }',
    '.mri-index [data-off] { opacity: .38; }',
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

  var touched = false;
  ['wheel', 'touchstart', 'keydown', 'mousedown'].forEach(function (ev) {
    window.addEventListener(ev, function () { touched = true; }, { passive: true, once: true });
  });
  function startAtTop() {
    if (ARRIVED.indexOf('#story/') === 0) return;
    [500, 1100, 1900].forEach(function (d) {
      setTimeout(function () {
        if (!touched && !panel() && window.scrollY > 40) window.scrollTo(0, 0);
      }, d);
    });
  }

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
    return (btn.getAttribute('aria-label') || '')
      .replace(/^Station \d+:\s*/, '')
      .replace(/\s*\u2014 story still to come$/, '');   /* the note is not part of the name */
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
    var w = h.getBoundingClientRect().width;
    if (!w) return;
    var small = w < 1300;      /* below this the cap cannot reach 12px: keep them off */
    var k = 2400 / w;                       /* SVG units per CSS pixel */
    ['Labels', 'Face-labels', 'Face-symbols'].forEach(function (id) {
      var g = h.querySelector('#' + id);
      if (!g) return;
      g.style.display = small ? 'none' : '';
      if (small) return;
      /* a label drawn at 12 units renders at 12/k pixels; grow it until it
         reaches 12 px, but never past 1.7x its drawn size or the plate
         becomes a page of type */
      g.querySelectorAll('text').forEach(function (t) {
        var base = t.getAttribute('data-size') || t.getAttribute('font-size');
        if (!base) return;
        t.setAttribute('data-size', base);
        var want = Math.min(parseFloat(base) * 1.7, 12 * k);
        t.style.fontSize = Math.max(parseFloat(base), want) + 'px';
      });
    });
  }

  function luminance(c) {
    var v = rgbOf(c);
    if (!v) return null;
    var f = v.map(function (x) {
      x /= 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
  }
  function ratio(a, b) {
    var x = luminance(a), y = luminance(b);
    if (x === null || y === null) return 0;
    var hi = Math.max(x, y), lo = Math.min(x, y);
    return (hi + 0.05) / (lo + 0.05);
  }
  /* the highlighted markers take the theme's own colour as their fill, which
     differs per theme and per mode — so the numeral is whichever of ink or
     paper actually reads on it, measured, not guessed */
  var INK = '#0B2740', PAPER = '#FFFFFF';
  function markerContrast() {
    var worst = 99, worstBg = '';
    markers().forEach(function (btn) {
      var bg = getComputedStyle(btn).backgroundColor;
      if (luminance(bg) === null) return;
      var ink = ratio(INK, bg), paper = ratio(PAPER, bg);
      btn.style.color = ink >= paper ? INK : PAPER;
      var best = Math.max(ink, paper);
      if (best < worst) { worst = best; worstBg = bg; }
    });
    if (worst < 4.5 && window.console) {
      console.warn('[plate] a station numeral is only ' + worst.toFixed(2) + ':1 on ' + worstBg
        + ' — that fill needs changing, no text colour clears 4.5:1 on it');
    }
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
    wrap.setAttribute('tabindex', '-1');
    wrap.setAttribute('aria-label', 'The 25 stories, in order along the route');
    var done = 0;
    ms.forEach(function (b) { if (!pending(storyNum(b))) done++; });
    var head = document.createElement('h2');
    head.textContent = 'The 25 stories, in route order · ' + done + ' published so far';
    wrap.appendChild(head);
    var ol = document.createElement('ol');
    ms.forEach(function (btn) {
      var li = document.createElement('li');
      var b = document.createElement('a');
      var soon = pending(storyNum(btn));
      if (soon) b.setAttribute('data-soon', '');
      b.href = '#story/' + slug(titleOf(btn));
      b.setAttribute('data-for', btn.textContent.trim());
      b.innerHTML = '<b>' + btn.textContent.trim() + '</b><span>' + (titleOf(btn) || 'Story') + '</span>'
        + (soon ? '<em aria-hidden="true">to come</em>' : '');
      b.setAttribute('aria-label', 'Station ' + btn.textContent.trim() + ': ' + (titleOf(btn) || 'Story')
        + (soon ? ' \u2014 story still to come' : ''));
      b.addEventListener('click', function (ev) { ev.preventDefault(); opener = b; btn.click(); });
      li.appendChild(b);
      ol.appendChild(li);
    });
    wrap.appendChild(ol);
    var frame = h.parentElement;
    if (frame && frame.parentElement) frame.parentElement.insertBefore(wrap, frame.nextSibling);
  }

  function hideDuplicateList() {
    if (!document.querySelector('.mri-index')) return;
    document.querySelectorAll('h1, h2, h3, p, span, div').forEach(function (n) {
      if (n.children.length) return;
      if (!/^stories on this path$/i.test((n.textContent || '').trim())) return;
      var box = n.parentElement;
      for (var i = 0; box && i < 3; i++) {
        if (box.querySelectorAll('button, a').length > 10) break;
        box = box.parentElement;
      }
      (box || n.parentElement).style.display = 'none';
    });
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
        if (opener && document.contains(opener)) {
          try { opener.focus(); } catch (e) {}
          if (document.activeElement !== opener) {
            /* the marker is hidden at this width: go back to its row instead */
            var row = document.querySelector('#mri-index a[data-for="'
              + (opener.textContent || '').trim() + '"]');
            if (row) { try { row.focus(); } catch (e2) {} }
          }
        }
      }
      return;
    }
    var h = p.querySelector('h1, h2');
    var title = h ? h.textContent.trim() : '';
    if (!title || title.indexOf('{{') !== -1) return;   /* the panel is still a template */
    if (!p.hasAttribute('role')) {
      p.setAttribute('role', 'dialog');
      p.setAttribute('aria-modal', 'true');
      p.style.overscrollBehavior = 'contain';
      /* in a background tab the slide-in never runs, and its fill-mode would
         leave the panel parked 48px off the edge — drop it once it is due */
      if (document.hidden) p.style.animation = 'none';     /* frozen: never animate */
      setTimeout(function () { var q = panel(); if (q) q.style.animation = 'none'; }, 560);
      document.body.style.overflow = 'hidden';
      if (h) {
        if (!h.id) h.id = 'mri-story-title';
        p.setAttribute('aria-labelledby', h.id);
        h.setAttribute('tabindex', '-1');
        /* the panel re-renders once after it opens, so the heading is focused
           again on the next tick rather than only now */
        [0, 150, 400].forEach(function (d) {
          setTimeout(function () {
            var q = panel();
            if (q && !q.contains(document.activeElement)) {
              try { h.focus({ preventScroll: true }); } catch (e) { try { h.focus(); } catch (e2) {} }
            }
          }, d);
        });
      }
    }
    /* the label that follows the cursor on the mountain must not lie across
       the story it opened: anything outside the panel repeating its title goes */
    if (title) {
      var scope = (document.querySelector('svg[data-mri-plate="done"]') || {}).closest
        ? document.querySelector('svg[data-mri-plate="done"]').closest('section') || document
        : document;
      scope.querySelectorAll('div, span').forEach(function (n) {
        if (n.children.length || p.contains(n)) return;
        if ((n.textContent || '').trim() !== title) return;
        var cs = getComputedStyle(n);
        if (cs.position === 'absolute' || cs.position === 'fixed') n.style.display = 'none';
      });
    }
    document.body.style.overflow = 'hidden';
    /* the page re-renders the panel a moment after it opens, which throws
       focus back to the body; put it on the heading whenever that happens */
    if (h && !p.contains(document.activeElement)) {
      try { h.focus({ preventScroll: true }); } catch (e) { try { h.focus(); } catch (e2) {} }
    }
    var s = slug(title);
    if (s && s !== lastSlug) {
      lastSlug = s;
      document.title = title + ' — ' + SITE;
      history.replaceState(null, '', '#story/' + s);
      p.scrollTop = 0;
      if (title.indexOf('{{') === -1) say(title + ' opened');
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
    if (!p.contains(document.activeElement)) {        /* focus left behind outside */
      e.preventDefault(); (e.shiftKey ? last : first).focus(); return;
    }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }, true);

  document.addEventListener('click', function (e) {
    if (!e.isTrusted) return;            /* the index opens stories by calling click() */
    var b = e.target && e.target.closest && e.target.closest('button');
    if (isMarker(b) && b.offsetParent !== null) opener = b;   /* only if it is on screen */
  }, true);

  /* the story's zoom carries the story's name, not a template */
  function clipAlt() {
    var p = panel();
    if (!p) return;
    var h = p.querySelector('h1, h2');
    var title = h ? h.textContent.trim() : '';
    if (!title || title.indexOf('{{') !== -1) return;
    p.querySelectorAll('img[src*="art/clips/"]').forEach(function (img) {
      img.alt = 'A close view of the mountain where this story sits: ' + title;
    });
  }

  /* --- the promised PDF is not a link until it exists -------------------- */
  function fixPdf() {
    document.querySelectorAll('a[href="#"]').forEach(function (a) {
      if (!/download pdf/i.test(a.textContent)) return;
      a.setAttribute('role', 'button');
      a.setAttribute('aria-disabled', 'true');
      a.setAttribute('tabindex', '-1');
      a.removeAttribute('href');                 /* not a link until there is a file */
      a.style.opacity = '0.55';
      a.style.pointerEvents = 'none';
      a.textContent = 'PDF available 11 December 2026';
    });
  }

  /* the filter dims markers on the plate; the list says the same thing */
  function rgbOf(c) {
    if (!c) return null;
    if (c.charAt(0) === '#') {
      var h = c.length === 4 ? c.replace(/#(.)(.)(.)/, '#$1$1$2$2$3$3') : c;
      return [parseInt(h.substr(1, 2), 16), parseInt(h.substr(3, 2), 16), parseInt(h.substr(5, 2), 16)];
    }
    var m = c.match(/\d+/g);
    return m ? m.slice(0, 3).map(Number) : null;
  }
  function sameColour(a, b) {
    var x = rgbOf(a), y = rgbOf(b);
    if (!x || !y) return false;
    return Math.abs(x[0] - y[0]) < 10 && Math.abs(x[1] - y[1]) < 10 && Math.abs(x[2] - y[2]) < 10;
  }
  function syncIndexToFilter() {
    var idx = document.querySelector('.mri-index');
    if (!idx) return;
    var ms = markers();
    if (!ms.length) return;
    var rest = getComputedStyle(document.documentElement).getPropertyValue('--mri-panel').trim();
    var dim = getComputedStyle(document.documentElement).getPropertyValue('--mri-marker-dim').trim();
    var lit = ms.filter(function (b) {
      var bg = getComputedStyle(b).backgroundColor;
      return !sameColour(bg, rest) && !sameColour(bg, dim);
    });
    var filtering = lit.length > 0 && lit.length < ms.length;   /* a theme is chosen */
    ms.forEach(function (btn) {
      var row = idx.querySelector('[data-for="' + btn.textContent.trim() + '"]');
      if (!row) return;
      var bg = getComputedStyle(btn).backgroundColor;
      var off = filtering && (sameColour(bg, rest) || sameColour(bg, dim));
      if (off) row.setAttribute('data-off', ''); else row.removeAttribute('data-off');
    });
  }

  /* --- the theme chips say whether they are on -------------------------- */
  function dressChips() {
    document.querySelectorAll('button[data-dc-tpl]').forEach(function (c) {
      var style = c.getAttribute('style') || '';
      if (!/gap:\s*7px/.test(style)) return;
      var cs = getComputedStyle(c);
      var bg = rgbOf(cs.backgroundColor) || [0, 0, 0];
      var clear = /rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
      var ground = rgbOf(getComputedStyle(document.documentElement).getPropertyValue('--mri-ground')) || [0, 0, 0];
      var panelC = rgbOf(getComputedStyle(document.documentElement).getPropertyValue('--mri-panel')) || [0, 0, 0];
      var on = !clear && !sameColour('rgb(' + bg.join(',') + ')', 'rgb(' + ground.join(',') + ')')
        && !sameColour('rgb(' + bg.join(',') + ')', 'rgb(' + panelC.join(',') + ')');
      c.setAttribute('aria-pressed', on || /font-weight:\s*600/.test(style) ? 'true' : 'false');
    });
  }

  /* the page prints its own count when a theme is chosen; read it back out */
  function watchFilter() {
    document.addEventListener('click', function (e) {
      var c = e.target && e.target.closest && e.target.closest('button[data-dc-tpl]');
      if (!c || !/gap:\s*7px/.test(c.getAttribute('style') || '')) return;
      setTimeout(function () {
        var said = null;
        var all = document.querySelectorAll('p, div, span');
        for (var i = 0; i < all.length && !said; i++) {
          var n = all[i];
          if (n === live || live.contains(n) || n.contains(live) || n.children.length) continue;
          var t = (n.textContent || '').trim();
          if (/^Showing \d+ stor/i.test(t) || /^All 25 stories are/i.test(t)) said = t;
        }
        if (said) say(said);
      }, 260);
    }, true);
  }

  /* --- open the story named in the address ------------------------------ */
  function openFromHash(hash) {
    var m = /^#story\/(.+)$/.exec(hash || location.hash || '');
    if (!m) return;
    var want = m[1], tries = 0;
    (function look() {
      var hit = null;
      markers().forEach(function (btn) { if (slug(titleOf(btn)) === want) hit = btn; });
      if (hit) {
        window.scrollTo(0, 0);          /* the page behind the panel starts at the top */
        hit.click();
        return;
      }
      if (tries++ < 60) { setTimeout(look, 120); return; }
      /* no story of that name: say so, and put the reader at the list */
      history.replaceState(null, '', location.pathname + location.search);
      window.scrollTo(0, 0);
      say('That story is not here. All 25 are listed below the mountain.');
    })();
  }

  /* the instructions follow the layout: no markers, no "find them on the
     mountain" */
  var COPY = [
    ['Find the stories on the mountain', 'Pick a story from the list'],
    ['All 25 stories are marked on the mountain. Choose a theme to highlight a thread.',
     'All 25 stories are listed below. Choose a theme to narrow the list.']
  ];
  function copyForWidth() {
    var narrow = window.innerWidth < 900;
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var n;
    while ((n = walker.nextNode())) {
      if (!n.nodeValue || n.nodeValue.length > 200) continue;
      COPY.forEach(function (pair) {
        var from = narrow ? pair[0] : pair[1], to = narrow ? pair[1] : pair[0];
        if (n.nodeValue.indexOf(from) !== -1) n.nodeValue = n.nodeValue.split(from).join(to);
      });
    }
  }

  /* the page ships header, nav and footer but no main landmark */
  /* the export puts two h2s before its h1; ARIA levels put that right without
     moving anything on the page */
  function headingOrder() {
    var hs = document.querySelectorAll('h1, h2');
    if (!hs.length) return;
    var first = hs[0], h1 = document.querySelector('h1');
    if (!h1 || first === h1) return;
    if (!first.hasAttribute('aria-level')) {
      first.setAttribute('role', 'heading');
      first.setAttribute('aria-level', '1');
    }
    if (!h1.hasAttribute('aria-level')) {
      h1.setAttribute('role', 'heading');
      h1.setAttribute('aria-level', '2');
    }
  }

  function mainLandmark() {
    var had = document.querySelector('main, [role="main"]');
    if (had && !(had.querySelector('header') || had.querySelector('footer'))) return;
    if (had) had.removeAttribute('role');            /* it swallowed the header and footer */
    var h = document.querySelector('svg[data-mri-plate="done"]');
    var sec = h;
    while (sec && sec.tagName !== 'SECTION') sec = sec.parentElement;
    if (sec) sec.setAttribute('role', 'main');       /* the journey is the page's content */
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
    try { syncIndexToFilter(); } catch (e) {}
    try { markerContrast(); } catch (e) {}
    try { clipAlt(); } catch (e) {}
    try { copyForWidth(); } catch (e) {}
    try { mainLandmark(); } catch (e) {}
    try { headingOrder(); } catch (e) {}
    try { hideDuplicateList(); } catch (e) {}
    try { fixPdf(); } catch (e) {}
    busy = false;
  }

  onBody(function () {
    new MutationObserver(enhance).observe(document.body, { childList: true, subtree: true });
    watchFilter();
    setTimeout(function () { enhance(); openFromHash(ARRIVED); }, 600);
    startAtTop();
  });
  window.addEventListener('resize', function () {
    try { labelsForWidth(); } catch (e) {}
    try { copyForWidth(); } catch (e) {}
  });
  window.addEventListener('popstate', function () {
    var p = panel();
    if (location.hash.indexOf('#story/') !== 0 && p) {
      var c = p.querySelector('button[aria-label="Close story"]');
      if (c) c.click();
    } else { openFromHash(); }
  });
})();
