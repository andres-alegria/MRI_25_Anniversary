/* The composer: given a story number and the renderer's context, draws that
   story's scene from the motif library, plus a wash of local ground detail
   that only a close-up needs (the sheet's own texture is tuned for 1:1). */
(function () {
  const missing = new Set();

  /* The compositions were written at the sheet's own scale (a person is 22
     units). A close-up is three times the sheet, and at that scale the motifs
     read as specks against the terrain texture — so the whole scene is drawn
     larger and pulled in tighter around the station. Adjust the feel of every
     close-up here. */
  const MOTIF_SCALE = 1.9;     // how large the motifs are
  const SPREAD = 0.72;         // how far from the station they sit
  const HERO_SCALE = 1.45;     // the story's one hero motif, relative to the rest
  /* People on a survey sheet are small. The figure motifs are drawn 16 units
     tall at k = 1 and then scaled down again here, so a person ends up about
     a third of a chalet — roughly 5 mm in print. */
  const FIGURE_SCALE = 0.8;
  const FIGURES = /^(person|personCarrying|hikerWithStick|womanWithJug|farmerWithHoe|shepherd|painterAtEasel|climbersRoped|groupInCircle|childAndElder)$/;
  /* the ground contact: a few hachure ticks in the sheet's own register under
     a motif, so it stands in the terrain's texture rather than on a private
     baseline. Adjust density and reach here. */
  const CONTACT = { ticks: 4, reach: 1.7, len: [5, 11], opacity: 0.22, scatter: 9 };

  /* nearest point on any drawn watercourse at a given height on the sheet */
  function onRiver(ctx, x, y, which) {
    const rivers = ctx.rivers || [];
    let best = null, bd = Infinity;
    rivers.forEach((pts, ri) => {
      if (which !== undefined && which !== ri) return;
      pts.forEach(pt => {
        const d2 = Math.abs(pt[1] - y) * 3 + Math.abs(pt[0] - x);
        if (d2 < bd) { bd = d2; best = pt; }
      });
    });
    return best ? [best[0], best[1]] : [x, y];
  }
  /* nearest point on the glacier's centreline at a given height */
  function onGlacier(ctx, y) {
    let best = null, bd = Infinity;
    (ctx.glacier || []).forEach(g => { const dd = Math.abs(g[1] - y); if (dd < bd) { bd = dd; best = g; } });
    return best ? [best[0], best[1]] : null;
  }

  function groundDetail(ctx) {
    /* Stones, tufts and grass in CLUMPS — a meadow is patchy, not sprayed —
       thinning above the snowline and kept off the glacier. Each clump has
       its own character (stony, grassy, or a few long grasses) and its own
       density; marks vary in size and lean. Adjust the feel here. */
    const { S, rand, node, flankAt, plateY, snowE, nearGlacier } = ctx;
    const W = 660, H = 440;
    const x0 = node.x - W / 2, y0 = node.y - H * 0.56;
    let g = `<g data-ground-detail="">`;
    const clumps = 14;
    for (let c = 0; c < clumps; c++) {
      const cx = x0 + rand() * W, cy = y0 + rand() * H;
      const kind = rand();                      /* < .4 stony, < .85 grassy, else tall grass */
      const n = 4 + Math.floor(rand() * 9), rx = 18 + rand() * 40, ry = 6 + rand() * 14;
      const lean = (rand() - 0.5) * 1.2;
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2, r = Math.sqrt(rand());
        const x = cx + Math.cos(a) * rx * r, y = cy + Math.sin(a) * ry * r;
        const e = 5200 * (ctx.PLATE.seaY - y) / (ctx.PLATE.seaY - ctx.PLATE.topY);
        if (e < 0 || e > snowE - 40) continue;
        const xl = flankAt(e, -1), xr = flankAt(e, 1);
        if (x < xl + 6 || x > xr - 6 || nearGlacier(x, y)) continue;
        const sz = 0.7 + rand() * 0.8;
        if (kind < 0.4) {                /* a stone: open on the lit side, a short shadow stroke under */
          const s2 = (1.2 + rand() * 2.4) * sz;
          g += `<path d="M ${(x - s2).toFixed(1)} ${y.toFixed(1)} q ${(s2 * (0.4 + rand() * 0.5)).toFixed(1)} ${(-s2 * (0.9 + rand() * 0.5)).toFixed(1)} ${(s2 * 2).toFixed(1)} ${(rand() * 0.4).toFixed(1)} m ${(-s2 * 0.3).toFixed(1)} ${(0.6).toFixed(1)} l ${(-s2 * 0.9).toFixed(1)} ${(0.3).toFixed(1)}" fill="none" stroke="${S.ink}" stroke-width="0.45" opacity="${(0.3 + rand() * 0.2).toFixed(2)}"/>`;
        } else if (kind < 0.85 && e < 3600) {   /* a tuft: 2-4 blades of different length, leaning with the clump */
          const k2 = sz * (0.8 + rand() * 0.7), nb = 2 + Math.floor(rand() * 3);
          let d = '';
          for (let b = 0; b < nb; b++) { const dx = (b - (nb - 1) / 2) * 1.1 * k2 + lean * 1.5, L = (2.4 + rand() * 2.6) * k2; d += `M ${x.toFixed(1)} ${y.toFixed(1)} q ${(dx * 0.6).toFixed(1)} ${(-L * 0.5).toFixed(1)} ${dx.toFixed(1)} ${(-L).toFixed(1)} `; }
          g += `<path d="${d}" fill="none" stroke="${S.sageDeep}" stroke-width="0.45" opacity="${(0.45 + rand() * 0.25).toFixed(2)}"/>`;
        } else if (e < 3000) {           /* tall grass: a few long bent blades */
          const L = (5 + rand() * 5) * sz;
          g += `<path d="M ${x.toFixed(1)} ${y.toFixed(1)} q ${(lean * 3).toFixed(1)} ${(-L * 0.55).toFixed(1)} ${(lean * 6 + (rand() - 0.5) * 2).toFixed(1)} ${(-L).toFixed(1)}" fill="none" stroke="${S.sageDeep}" stroke-width="0.45" opacity="0.5"/>`;
        }
      }
    }
    return g + `</g>`;
  }

  window.MRI_VIGNETTES = {
    draw(num, ctx) {
      const data = window.MRI_VIGNETTES_DATA && window.MRI_VIGNETTES_DATA[num];
      const lib = window.MRI_MOTIFS || {};
      let out = groundDetail(ctx);
      if (!data) return out;
      out += `<g data-vignette="${num}">`;
      const { flankAt, plateY, nearGlacier, PLATE } = ctx;
      const elevOf = y => 5200 * (PLATE.seaY - y) / (PLATE.seaY - PLATE.topY);
      data.items.forEach(it => {
        const fn = lib[it.m];
        if (!fn) { missing.add(it.m); return; }
        /* Keep the motif on the terrain. Stations near a flank have little
           room on one side, and a composition written for the middle of the
           face would otherwise put things in the sky. Clamp into the massif
           at the motif's own altitude, then step off the glacier if it landed
           on the ice. Sky motifs (birds, the drone, the eagle) are exempt. */
        const k = (it.k || 1) * MOTIF_SCALE * (it.hero ? HERO_SCALE : 1) * (FIGURES.test(it.m) ? FIGURE_SCALE : 1);
        let x = ctx.node.x + it.dx * SPREAD, y = ctx.node.y + it.dy * SPREAD;
        const airborne = /birds|drone|eagle/i.test(it.m);
        /* water motifs sit ON a watercourse; ice motifs sit on the glacier */
        if (it.snap === 'river') { const p2 = onRiver(ctx, x, y, it.river); x = p2[0] + (it.rx || 0); y = p2[1]; }
        if (it.snap === 'glacier') { const p2 = onGlacier(ctx, y); if (p2) { x = p2[0] + (it.rx || 0); y = p2[1]; } }
        /* nothing stands above the summit: a station at the apex pushes its
           scene downslope instead of into the sky */
        if (!airborne && elevOf(y) > 5040) y = plateY(5040 - Math.abs(it.dx) * 0.6);
        if (airborne && elevOf(y) > 5160) y = plateY(5160);
        /* a motif snapped to the glacier is inside the massif by definition:
           the flank clamp below would drag it off the ice */
        if (!airborne && it.snap !== 'glacier') {
          const e = elevOf(y);
          const margin = 30 * k;
          const xl = flankAt(e, -1) + margin, xr = flankAt(e, 1) - margin;
          if (xr > xl) x = Math.max(xl, Math.min(xr, x));
          for (let t = 0; t < 4 && it.snap !== 'glacier' && nearGlacier(x, y); t++) {
            x += (x < ctx.node.x ? -1 : 1) * 34;
            if (xr > xl) x = Math.max(xl, Math.min(xr, x));
          }
        }
        /* Motifs knock out their background with `paper`, but on the massif
           the ground is the wash, which is darker than the sheet — a dam drawn
           with paper behind it sat in a pale rectangle. Hand each motif a
           palette whose `paper` is the terrain colour at its own altitude. */
        const e2 = elevOf(y);
        const t = Math.max(0, Math.min(1, e2 / 4200));
        const local = airborne ? ctx.S.paper
          : ctx.MIX(ctx.MIX(ctx.S.wash, ctx.S.sage, 0.40), ctx.MIX(ctx.S.washHigh, ctx.S.stone, 0.16), t);
        let SL = Object.assign({}, ctx.S, { paper: local });
        /* On the night printing the snow stays luminous, so a motif standing
           on it needs the opposite pairing — dark ink on the snow — exactly
           as the sheet already does for its lettering. (A luminance test on
           the sheet colour tells the two printings apart.) */
        const onSnow = !airborne && (e2 > ctx.snowE - 60 || it.snap === 'glacier' || nearGlacier(x, y));
        const lum = (() => { const m = /^#([0-9a-f]{6})$/i.exec(ctx.S.paper); if (!m) return 1; const v = parseInt(m[1], 16); return (0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255)) / 255; })();
        if (onSnow && lum < 0.5) {
          const ink = ctx.MIX(ctx.S.paper, '#10293c', 0.5);
          SL = Object.assign({}, ctx.S, {
            paper: ctx.S.paperHigh, ink, inkSoft: ctx.MIX(ink, ctx.S.paperHigh, 0.35), shade: '#10293c',
            water: ctx.MIX(ctx.S.water, ink, 0.35), iceLine: ctx.MIX(ctx.S.iceLine, ink, 0.3), sageDeep: ctx.MIX(ctx.S.sageDeep, ink, 0.4)
          });
        }
        try {
          let drawn = fn({ S: SL, rand: ctx.rand, MIX: ctx.MIX }, x, y, k, it.o || {});
          /* every motif goes through the ink engine (ink.js): slow wobble,
             engraved weights, tapered ribbons, no drop shadows */
          if (window.MRI_INK) {
            drawn = window.MRI_INK.process(drawn, { rand: ctx.rand, S: SL });
            const b = window.MRI_INK.bounds();
            /* ground contact under anything that stands on the terrain */
            if (b && !airborne && it.snap !== 'glacier' && elevOf(y) < ctx.snowE - 40) {
              const half = Math.max(6, (b.x1 - b.x0) / 2) * CONTACT.reach;
              const r = ctx.rand;
              let g = `<g data-contact="${it.m}">`;
              const n = Math.max(3, Math.round(CONTACT.ticks * half / 24));
              for (let i = 0; i < n; i++) {
                const tx = x - half + (i + 0.15 + r() * 0.7) / n * half * 2;
                /* scattered below the base rather than in a row, so they read
                   as the sheet's own hachures continuing under the object */
                const ty = y + 1 + r() * CONTACT.scatter;
                const lean = (tx - ctx.plateCX(elevOf(ty))) * 0.055 + (r() - 0.5) * 2;   /* same lean as the sheet's own hachures */
                const L = CONTACT.len[0] + r() * (CONTACT.len[1] - CONTACT.len[0]);
                g += `<line x1="${tx.toFixed(1)}" y1="${ty.toFixed(1)}" x2="${(tx + lean).toFixed(1)}" y2="${(ty + L).toFixed(1)}" stroke="${ctx.S.ink}" stroke-width="${(0.45 + r() * 0.15).toFixed(2)}" opacity="${(CONTACT.opacity * (0.7 + r() * 0.6)).toFixed(2)}"/>`;
              }
              drawn = g + `</g>` + drawn;
            }
          }
          out += drawn;
        } catch (e) {
          missing.add(it.m + ' (threw: ' + e.message + ')');
        }
      });
      return out + `</g>`;
    },
    missing: () => [...missing],
    SPREAD
  };
})();
