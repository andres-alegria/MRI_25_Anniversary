/* ---------------------------------------------------------------------------
   MRI 25th Anniversary — motion layer
   ---------------------------------------------------------------------------
   GSAP choreography, kept deliberately outside the page bundle. Like
   stories-data.js and figures-data.js, this file is never touched by a
   Claude Design re-export, so the animation survives a redesign of the page.

   Two behaviours live here:

     1. THE OVERTURE — the massif's silhouette draws itself once, the altitude
        belts fill in behind it, and the ascent route draws last, with the
        numbered stories landing on it in climb order. Off by default: the
        page shows the finished mountain immediately.

     2. THE LINK — the numbered markers on the mountain and the numbered rows
        in the index are treated as one object. Hovering either highlights
        both, and a ghost numeral flies between them so the relationship is
        seen rather than inferred.

   Nothing here owns any state. Highlighting is done by dispatching the events
   the page already listens for, so the interface stays the single source of
   truth for what is hovered. If this file is deleted the page still works.

   All tunable values sit in MOTION below.
--------------------------------------------------------------------------- */

const MOTION = {
  /* ---- the overture ------------------------------------------------ */
  // The mountain is there the moment the page is: no drawing-on, no fade-in,
  // no staggered arrival of the numbers. Set to true to play the opening
  // again — the timeline below is intact and MRI_MOTION.replay() runs it on
  // demand from the console whichever way this is set.
  overture: false,
  // seconds. Raise for a more languid draw, lower to get out of the way sooner
  drawFrontRidge: 1.45,   // the massif silhouette drawing itself
  drawRoute: 1.30,        // the ascent path drawing itself
  washFade: 1.20,         // each belt fading up behind the line
  beltStagger: 0.10,
  // how long each marker takes, and the gap between consecutive markers
  markerRise: 0.45,
  markerStagger: 0.028,

  /* ---- the link ---------------------------------------------------- */
  link: true,
  // accent used for the flying numeral — the interface's selection colour
  accent: '#0067b2',
  ghostFlight: 0.52,
  ghostHold: 0.30,
  ghostFade: 0.28,
  // the ghost only flies when at least this fraction of the mountain is on
  // screen; below that it would be flying somewhere the reader cannot see
  minMountainVisible: 0.25,
  // pause before a hover counts as intent, in ms
  hoverIntent: 90
};

(function () {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* --- finding things in a page this file does not own -------------------
     The page is rendered from a bundle and re-renders on its own schedule,
     so nothing is cached. Every helper re-queries, and every element is
     found by shape rather than by a class name that a re-export could
     rename underneath us.
  --------------------------------------------------------------------- */

  const isMarker = el =>
    el.tagName === 'BUTTON' &&
    /border-radius:\s*50%/.test(el.getAttribute('style') || '') &&
    /^\d{2}$/.test(el.textContent.trim());

  const markers = () => [...document.querySelectorAll('button')].filter(isMarker);

  const rows = () =>
    [...document.querySelectorAll('button')].filter(
      b => !isMarker(b) && /^\d{2}\b/.test(b.textContent.trim())
    );

  const numberOf = el => (el.textContent.trim().match(/^\d{2}/) || [null])[0];

  // the plate sets its own viewBox once generated, so find it by role
  const scene = () => document.querySelector('svg[data-mri-plate="done"]') ||
                      document.querySelector('svg');

  /* Waits for the bundle to finish swapping in the real document.

     Polls on a timer rather than requestAnimationFrame: a page opened in a
     background tab gets no animation frames at all, and the setup here has
     to complete whether or not anyone is looking at it yet. */
  function whenReady(test, done, timeout = 20000) {
    const t0 = Date.now();
    (function poll() {
      const found = test();
      if (found) return done(found);
      if (Date.now() - t0 > timeout) return;
      setTimeout(poll, 60);
    })();
  }

  function ready() {
    const svg = scene();
    // wait for the generated plate, not just any <svg>
    if (!svg || svg.getAttribute('data-mri-plate') !== 'done') return null;
    if (!svg.querySelector('[data-mri-route]')) return null;
    if (markers().length < 25) return null;
    return svg;
  }

  /* --- 1. the overture -------------------------------------------------- */

  // the running overture, so a replay can clear the one before it rather
  // than leave two timelines fighting over the same opacities
  let running = null;

  function overture(svg, reduced) {
    if (running) {
      running.kill();
      running = null;
    }

    // The plate is generated, so nothing here may depend on a fixed child
    // order. Three things are found by role and everything else is "the
    // drawing": the sky, which is never hidden because the page would flash
    // its ground through; the massif's silhouette, which is drawn as a line;
    // and the ascent route, which is drawn last.
    const kids = [...svg.children].filter(n => !n.hasAttribute('data-motion'));
    const sky = kids.find(n => n.tagName === 'rect') || null;
    const outline = svg.querySelector('[data-mri-outline]');
    const route = svg.querySelector('[data-mri-route]');
    const routeLine = route && route.querySelector('path:last-of-type');
    const painted = kids.filter(n =>
      n !== sky && n !== outline && n !== route && n.tagName !== 'defs');
    if (!painted.length) return null;

    const badges = markers();

    if (reduced) {
      // Reduced motion: no drawing, no staggered arrival. The page simply is.
      return null;
    }

    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete() {
        // Hand the DOM back exactly as it was found.
        gsap.set(painted, { clearProps: 'opacity' });
        if (outline) gsap.set(outline, { clearProps: 'opacity' });
        if (route) gsap.set(route, { clearProps: 'opacity' });
        gsap.set(badges, { clearProps: 'opacity,transform' });
        running = null;
      }
    });
    running = tl;

    tl.set(painted, { opacity: 0 })
      .set(badges, { opacity: 0 });

    // 1. the silhouette is drawn as a line, before anything is filled
    if (outline) {
      tl.set(outline, { opacity: 1 })
        .fromTo(outline, { drawSVG: '0% 0%' },
                         { drawSVG: '0% 100%', duration: MOTION.drawFrontRidge }, 0);
    }

    // 2. the belts, textures, rivers and settlements arrive behind it, low to
    //    high, so the mountain fills in the way it would be climbed
    tl.to(painted, {
      opacity: 1, duration: MOTION.washFade, stagger: MOTION.beltStagger
    }, outline ? MOTION.drawFrontRidge * 0.62 : 0);

    // 3. the ascent route draws itself last — it is the thing to follow
    if (routeLine) {
      tl.set(route, { opacity: 1 })
        .fromTo(route.querySelectorAll('path'), { drawSVG: '0% 0%' },
                { drawSVG: '0% 100%', duration: MOTION.drawRoute }, '>-0.35');
    }

    // 4. and the numbers land on it, in climb order
    const byHeight = badges.slice().sort(
      (a, b) => b.getBoundingClientRect().top - a.getBoundingClientRect().top
    );
    tl.to(byHeight, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: MOTION.markerRise,
      stagger: MOTION.markerStagger,
      ease: 'back.out(1.7)',
      startAt: { y: 10, scale: 0.8 }
    }, '>-0.55');

    // Safety net. The drawing starts by hiding the artwork, and GSAP only
    // advances while the browser is issuing animation frames — a tab opened in
    // the background gets none. If for any reason the timeline has not run to
    // the end on its own, force it there: a mountain that never appears is a
    // far worse failure than an opening that does not play.
    setTimeout(() => {
      if (running === tl && tl.progress() < 1) tl.progress(1);
    }, (tl.duration() + 5) * 1000);

    return tl;
  }

  /* --- 2. the link ------------------------------------------------------ */

  function link(svg, reduced) {
    // The page already tracks what is hovered. Rather than run a competing
    // highlight, forward the hover to the twin element and let the page's own
    // state light it up — one source of truth, and it survives a re-render.
    const forward = (el, type) =>
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, relatedTarget: document.body }));

    const twinMarker = n => markers().find(m => numberOf(m) === n);
    const twinRow = n => rows().find(r => numberOf(r) === n);

    let ghost = null;
    let timer = null;

    const clearGhost = () => {
      if (!ghost) return;
      const g = ghost;
      ghost = null;
      gsap.to(g, {
        opacity: 0, duration: MOTION.ghostFade,
        onComplete: () => g.remove()
      });
    };

    const mountainVisible = () => {
      const r = svg.getBoundingClientRect();
      const shown = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
      return r.height > 0 && shown / r.height >= MOTION.minMountainVisible;
    };

    /* A numeral lifted off the index row and flown to its peak. Flip.fit
       measures both positions and moves one onto the other, so the flight
       lands exactly on the marker however the page has been resized. */
    function fly(row, marker) {
      clearGhost();

      // Clone the numeral itself, not the whole row: the row is the full width
      // of the page, and fitting that onto a 24px marker would shrink the
      // digits to nothing.
      const numeral = [...row.querySelectorAll('span')]
        .find(s => !s.children.length && /^\d{2}$/.test(s.textContent.trim()));
      if (!numeral) return;

      const r = numeral.getBoundingClientRect();
      const g = document.createElement('div');
      g.textContent = numeral.textContent.trim();
      g.setAttribute('data-motion', 'ghost');

      const src = getComputedStyle(numeral);
      Object.assign(g.style, {
        position: 'fixed', margin: '0', zIndex: '60',
        left: r.left + 'px', top: r.top + 'px',
        width: r.width + 'px', height: r.height + 'px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        font: src.font, fontVariantNumeric: 'tabular-nums',
        lineHeight: '1', pointerEvents: 'none',
        color: MOTION.accent          // adjust flying numeral colour here
      });
      document.body.appendChild(g);
      ghost = g;

      Flip.fit(g, marker, {
        duration: MOTION.ghostFlight,
        ease: 'power3.inOut',
        scale: true,
        onComplete() {
          if (ghost !== g) return;
          gsap.to(g, {
            opacity: 0,
            duration: MOTION.ghostFade,
            delay: MOTION.ghostHold,
            onComplete: () => { g.remove(); if (ghost === g) ghost = null; }
          });
        }
      });
    }

    document.addEventListener('mouseover', e => {
      const row = e.target.closest && e.target.closest('button');
      if (!row || isMarker(row)) return;
      const n = numberOf(row);
      if (!n) return;
      const marker = twinMarker(n);
      if (!marker) return;

      forward(marker, 'mouseover');
      clearTimeout(timer);
      if (!reduced && mountainVisible()) {
        timer = setTimeout(() => fly(row, marker), MOTION.hoverIntent);
      }
    });

    document.addEventListener('mouseout', e => {
      const row = e.target.closest && e.target.closest('button');
      if (!row || isMarker(row)) return;
      const n = numberOf(row);
      if (!n) return;
      const marker = twinMarker(n);
      if (marker) forward(marker, 'mouseout');
      clearTimeout(timer);
      clearGhost();
    });

    // and the other direction: a marker lights its row in the index
    document.addEventListener('mouseover', e => {
      const marker = e.target.closest && e.target.closest('button');
      if (!marker || !isMarker(marker)) return;
      const row = twinRow(numberOf(marker));
      if (row) forward(row, 'mouseover');
    });

    document.addEventListener('mouseout', e => {
      const marker = e.target.closest && e.target.closest('button');
      if (!marker || !isMarker(marker)) return;
      const row = twinRow(numberOf(marker));
      if (row) forward(row, 'mouseout');
    });
  }

  /* --- boot ------------------------------------------------------------- */

  whenReady(ready, svg => {
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(DrawSVGPlugin, Flip);

    // A small handle on the drawing, so it can be watched again without a
    // reload — useful when tuning the timings in MOTION above.
    //   MRI_MOTION.replay()          play it through again
    //   MRI_MOTION.replay().pause(2) freeze it two seconds in
    window.MRI_MOTION = {
      replay: () => overture(svg, false),
      config: MOTION
    };

    // Readers who have asked their system for less motion get the finished
    // page with no drawing and no flight — everything still works.
    gsap.matchMedia().add(
      {
        full: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)'
      },
      ctx => {
        const reduced = !!ctx.conditions.reduced;
        if (MOTION.overture) overture(svg, reduced);
        if (MOTION.link) link(svg, reduced);
      }
    );
  });
})();
