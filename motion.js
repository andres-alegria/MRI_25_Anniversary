/* ---------------------------------------------------------------------------
   MRI 25th Anniversary — motion layer
   ---------------------------------------------------------------------------
   GSAP choreography, kept deliberately outside the page bundle. Like
   stories-data.js and figures-data.js, this file is never touched by a
   Claude Design re-export, so the animation survives a redesign of the page.

   Two behaviours live here:

     1. THE OVERTURE — the massif draws itself once, as a pencil line, before
        the watercolour washes bleed in behind it.

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
  // set to false to ship the page without an opening animation
  overture: true,
  // seconds. Raise for a more languid draw, lower to get out of the way sooner
  drawBackRidge: 1.10,
  drawFrontRidge: 1.45,
  drawRiver: 1.10,
  washFade: 1.20,
  // how long each marker takes, and the gap between consecutive markers
  markerRise: 0.45,
  markerStagger: 0.028,

  // adjust pencil line colour and weight here — these are the drawn strokes,
  // not the finished artwork, and they fade away once the washes arrive
  pencilColor: '#3a3630',
  pencilWidth: 1.4,
  // opacity the pencil lines settle at once the drawing is finished.
  // 0 leaves the artwork exactly as it looks with no animation at all;
  // raise it a little for a visible sketch underlay
  pencilRestOpacity: 0,

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

/* --- the ridge lines, as drawn rather than as filled ----------------------
   The artwork's silhouettes are closed polygons: their point lists run along
   the skyline and then back along the bottom of the frame to close the shape.
   Drawing those strokes directly would draw the frame too, so the skyline
   vertices are repeated here as open polylines. Keep these in step with the
   polygons in tools/apply-content.py if the terrain is ever reshaped.
------------------------------------------------------------------------- */
const RIDGE_BACK =
  '0,465 80,418 160,391 250,354 330,373 420,336 500,354 580,318 660,282 ' +
  '740,300 810,263 900,245 980,272 1060,290 1140,309 1200,336';

const RIDGE_FRONT =
  '0,512 110,490 230,444 330,391 400,410 470,327 520,368 600,282 650,322 ' +
  '720,354 790,282 820,208 870,80 910,181 940,218 1000,282 1040,318 ' +
  '1100,272 1200,354';

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

  const scene = () => document.querySelector('svg[viewBox="0 0 1200 675"]') ||
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
    if (!svg || svg.children.length < 8) return null;
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
    [...svg.querySelectorAll('[data-motion="pencil"]')].forEach(n => n.remove());

    // svg children, in paint order:
    //   0 defs · 1 sky · 2,3 cloud banks · 4 terrain · 5,6 towns · 7 river
    const kids = [...svg.children];
    const terrain = kids[4];
    const towns = [kids[5], kids[6]].filter(Boolean);
    const river = kids[7];
    const riverPath = river && river.querySelector('path');
    if (!terrain) return;

    // The pencil lines live in their own group so the artwork underneath is
    // never modified — removing this group restores the original drawing.
    const pencil = document.createElementNS(SVG_NS, 'g');
    pencil.setAttribute('data-motion', 'pencil');
    pencil.setAttribute('fill', 'none');
    pencil.setAttribute('stroke', MOTION.pencilColor);
    pencil.setAttribute('stroke-width', MOTION.pencilWidth);
    pencil.setAttribute('stroke-linejoin', 'round');
    pencil.setAttribute('stroke-linecap', 'round');

    const line = points => {
      const p = document.createElementNS(SVG_NS, 'polyline');
      p.setAttribute('points', points);
      pencil.appendChild(p);
      return p;
    };
    const back = line(RIDGE_BACK);
    const front = line(RIDGE_FRONT);
    svg.insertBefore(pencil, terrain);

    // A ghost of the river outline, drawn in the river's own placement so it
    // traces the banks rather than a straight line down the slope.
    let riverGhost = null;
    if (riverPath) {
      riverGhost = riverPath.cloneNode(false);
      riverGhost.setAttribute('fill', 'none');
      riverGhost.setAttribute('stroke', MOTION.pencilColor);
      riverGhost.setAttribute('stroke-width', '1.2');
      riverGhost.removeAttribute('filter');
      const holder = document.createElementNS(SVG_NS, 'g');
      holder.setAttribute('transform', river.getAttribute('transform') || '');
      holder.setAttribute('data-motion', 'pencil');
      holder.appendChild(riverGhost);
      svg.appendChild(holder);
    }

    const painted = [terrain, ...towns, river].filter(Boolean);
    const badges = markers();

    if (reduced) {
      // Reduced motion: no drawing, no staggered arrival. The page simply is.
      pencil.remove();
      if (riverGhost) riverGhost.parentNode.remove();
      return null;
    }

    const tl = gsap.timeline({
      defaults: { ease: 'power2.out' },
      onComplete() {
        // Hand the DOM back exactly as it was found.
        [...svg.querySelectorAll('[data-motion="pencil"]')].forEach(n => n.remove());
        gsap.set(painted, { clearProps: 'opacity' });
        gsap.set(badges, { clearProps: 'opacity,transform' });
        running = null;
      }
    });
    running = tl;

    tl.set(painted, { opacity: 0 })
      .set(badges, { opacity: 0 })
      .fromTo(back, { drawSVG: '0% 0%' },
                    { drawSVG: '0% 100%', duration: MOTION.drawBackRidge }, 0)
      .fromTo(front, { drawSVG: '0% 0%' },
                     { drawSVG: '0% 100%', duration: MOTION.drawFrontRidge }, 0.18);

    if (riverGhost) {
      tl.fromTo(riverGhost, { drawSVG: '0% 0%' },
                            { drawSVG: '0% 100%', duration: MOTION.drawRiver }, 0.9);
    }

    // washes bleed in behind the line, then the line itself recedes
    tl.to(painted, { opacity: 1, duration: MOTION.washFade, stagger: 0.12 }, 1.05)
      .to(pencil, { opacity: MOTION.pencilRestOpacity, duration: 0.9 }, 1.5);

    if (riverGhost) {
      tl.to(riverGhost.parentNode, { opacity: MOTION.pencilRestOpacity, duration: 0.9 }, 1.7);
    }

    // the markers arrive last, low to high, so the eye is led up the massif
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
    }, 1.85);

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
