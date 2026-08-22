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
    /* stones, tufts and a few longer grasses scattered through the window,
       thinning above the snowline and kept off the glacier */
    const { S, rand, node, flankAt, plateY, snowE, nearGlacier } = ctx;
    const W = 660, H = 440;
    const x0 = node.x - W / 2, y0 = node.y - H * 0.56;
    let g = `<g data-ground-detail="">`;
    for (let i = 0; i < 170; i++) {
      const x = x0 + rand() * W, y = y0 + rand() * H;
      const e = 5200 * (ctx.PLATE.seaY - y) / (ctx.PLATE.seaY - ctx.PLATE.topY);
      if (e < 0 || e > snowE - 40) continue;
      const xl = flankAt(e, -1), xr = flankAt(e, 1);
      if (x < xl + 6 || x > xr - 6 || nearGlacier(x, y)) continue;
      const r = rand();
      if (r < 0.45) {           /* a stone */
        const s = 1 + rand() * 2.2;
        g += `<path d="M ${(x - s).toFixed(1)} ${y.toFixed(1)} q ${(s * 0.6).toFixed(1)} ${(-s * 1.1).toFixed(1)} ${(s * 2).toFixed(1)} 0" fill="none" stroke="${S.ink}" stroke-width="0.45" opacity="0.35"/>`;
      } else if (r < 0.85 && e < 3600) {   /* a tuft */
        g += `<path d="M ${x.toFixed(1)} ${y.toFixed(1)} l -1.6 -3.6 m 1.6 3.6 l 0.4 -4.2 m -0.4 4.2 l 1.8 -3.2" fill="none" stroke="${S.sageDeep}" stroke-width="0.45" opacity="0.55"/>`;
      } else {                  /* a short hachure */
        g += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + 0.8).toFixed(1)}" y2="${(y + 4 + rand() * 4).toFixed(1)}" stroke="${S.ink}" stroke-width="0.4" opacity="0.22"/>`;
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
        const k = (it.k || 1) * MOTIF_SCALE * (it.hero ? HERO_SCALE : 1);
        let x = ctx.node.x + it.dx * SPREAD, y = ctx.node.y + it.dy * SPREAD;
        const airborne = /birds|drone|eagle/i.test(it.m);
        /* water motifs sit ON a watercourse; ice motifs sit on the glacier */
        if (it.snap === 'river') { const p2 = onRiver(ctx, x, y, it.river); x = p2[0] + (it.rx || 0); y = p2[1]; }
        if (it.snap === 'glacier') { const p2 = onGlacier(ctx, y); if (p2) { x = p2[0] + (it.rx || 0); y = p2[1]; } }
        /* nothing stands above the summit: a station at the apex pushes its
           scene downslope instead of into the sky */
        if (!airborne && elevOf(y) > 5040) y = plateY(5040 - Math.abs(it.dx) * 0.6);
        if (airborne && elevOf(y) > 5160) y = plateY(5160);
        if (!airborne) {
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
        const SL = Object.assign({}, ctx.S, { paper: local });
        try {
          out += fn({ S: SL, rand: ctx.rand, MIX: ctx.MIX }, x, y, k, it.o || {});
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
