/* ---------------------------------------------------------------------------
   MRI 25th Anniversary — the two live figures
   ---------------------------------------------------------------------------
   Draws the interactive figures into the empty hosts the page renders:

     [data-mri-globe]     the turning mountain globe beside the introduction
     [data-mri-timeline]  the policy timeline among the summary figures

   Each figure is a self-contained folder in figures/ (code, styles, words,
   data), the same files as its working copy outside the repo. Nothing there
   knows about this page; this file is the only link.

   The figures load after the page has drawn, so they never hold it up. The
   page asks for this file as embeds.js?v=<hash of it and both folders>, and
   that tag is passed on to every file loaded here, so a change to any of
   them reaches readers rather than a stale cached copy.

   The page re-renders on its own schedule — switching summary figures
   removes the timeline's host and later draws a fresh one — so each figure
   is built once and moved into whichever host is on the page. Like
   motion.js, this file sits outside the bundle: delete it and the page
   still works, without the two figures.
--------------------------------------------------------------------------- */
(function () {
  'use strict';

  var me = document.currentScript;
  var tag = (me && /[?&]v=([^&#]+)/.exec(me.src)) || null;
  var V = tag ? '?v=' + tag[1] : '';

  var FIGURES = [
    {
      host: '[data-mri-globe]',
      dir: 'figures/globe/',
      css: ['globe.css'],
      js: ['globe-content.js', 'globe-data.js', 'globe.js'],
      draw: function (el) {
        window.MRIGlobe.mount(el, { texture: 'figures/globe/globe-mountains.png' + V });
      }
    },
    {
      host: '[data-mri-timeline]',
      dir: 'figures/timeline/',
      css: ['timeline.css'],
      js: ['timeline-content.js', 'timeline-data.js', 'timeline.js'],
      draw: function (el) { window.MRITimeline.mount(el); }
    }
  ];

  function load(f) {
    if (f.loading) return f.loading;
    f.css.forEach(function (name) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = f.dir + name + V;
      document.head.appendChild(l);
    });
    /* fetched side by side, run in the order listed: words and data first */
    f.loading = Promise.all(f.js.map(function (name) {
      return new Promise(function (ok, fail) {
        var s = document.createElement('script');
        s.src = f.dir + name + V;
        s.async = false;
        s.onload = ok;
        s.onerror = fail;
        document.head.appendChild(s);
      });
    }));
    return f.loading;
  }

  /* A host counts once the page has drawn it. Until then it sits inside the
     unrendered <x-dc> template, and anything put there would be copied into
     the page as a dead duplicate when the template renders. */
  function hostOf(f) {
    var all = document.querySelectorAll(f.host);
    for (var i = 0; i < all.length; i++) if (!all[i].closest('x-dc')) return all[i];
    return null;
  }

  function place() {
    FIGURES.forEach(function (f) {
      var host = hostOf(f);
      if (!host) return;
      if (f.el) {
        if (f.el.parentNode !== host) host.appendChild(f.el);
        return;
      }
      if (f.failed) return;
      load(f).then(function () {
        if (f.el) return;
        var now = hostOf(f);
        if (!now) return;                      /* the host left while loading; the next render brings it back */
        f.el = document.createElement('div');
        now.appendChild(f.el);
        f.draw(f.el);
      }).catch(function () { f.failed = true; });
    });
  }

  function start() {
    place();
    new MutationObserver(place).observe(document.body, { childList: true, subtree: true });
  }
  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();
