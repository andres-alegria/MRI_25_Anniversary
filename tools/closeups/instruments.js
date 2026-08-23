// MRI survey-plate motifs — group: INSTRUMENTS AND SCIENCE
// Ink-on-paper register: open strokes, hairlines, hand jitter via ctx.rand().
// All colours come from ctx.S (palette keys only). No text output.
(function () {
  const N = v => (+v).toFixed(1);

  // Shared helpers -----------------------------------------------------------
  function mk(ctx, x, y, k, opts) {
    const { S, rand, MIX } = ctx;
    const flip = opts && opts.flip ? -1 : 1;
    const j = a => (rand() - 0.5) * a * k;           // VARIATION of a start point / length, never per-vertex jitter
    const X = dx => N(x + dx * k * flip);
    const Y = dy => N(y + dy * k);
    const W = w => N(w * k);
    // stroke weights are classes (0.45 hairline / 0.7 secondary / 1.0 contour) in sheet units; ink.js
    // quantises them whatever the scale, so they are NOT scaled with k
    const sw = w => N(Math.max(0.45, w));
    const base = `stroke-linecap="round" stroke-linejoin="round" fill="none"`;
    const R = (a, b) => a + rand() * (b - a);
    // polyline (the jit argument is kept for the old call sites and ignored)
    const pl = (pts, col, w, jit, extra) => {
      const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1])).join('');
      return `<path d="${d}" stroke="${col}" stroke-width="${sw(w)}" ${base} ${extra || ''}/>`;
    };
    const line = (x1, y1, x2, y2, col, w, jit) => pl([[x1, y1], [x2, y2]], col, w, jit);
    const circ = (cx, cy, r, col, w, fill) => `<circle cx="${X(cx)}" cy="${Y(cy)}" r="${N(r * k)}" stroke="${col}" stroke-width="${sw(w)}" fill="${fill || 'none'}"/>`;
    const poly = (pts, col, w, fill, jit, extra) => {
      const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1])).join('') + 'Z';
      return `<path d="${d}" stroke="${col}" stroke-width="${sw(w)}" fill="${fill || 'none'}" stroke-linejoin="round" ${extra || ''}/>`;
    };
    // ---- the engraver's silhouette kit: solid ink blots, paper hairlines for the highlights ----
    // solid filled shape, no outline
    const blob = (pts, col) => poly(pts, 'none', 0, col || S.ink);
    // tapered solid bar from (x1,y1) to (x2,y2): width w1 at the start, w2 at the end (legs, masts, tubes)
    const bar = (x1, y1, x2, y2, w1, w2, col) => {
      const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const a = w1 / 2, b = (w2 === undefined ? w1 : w2) / 2;
      return blob([[x1 + nx * a, y1 + ny * a], [x2 + nx * b, y2 + ny * b], [x2 - nx * b, y2 - ny * b], [x1 - nx * a, y1 - ny * a]], col);
    };
    // paper hairline: the one light line an engraver leaves on a dark body
    const hi = (x1, y1, x2, y2) => line(x1, y1, x2, y2, S.paper, 0.45);
    const dotI = (cx, cy, r, col) => `<circle cx="${X(cx)}" cy="${Y(cy)}" r="${N(r * k)}" fill="${col || S.ink}" stroke="none"/>`;
    // broken ground line (disabled: the composer ties the motif to the sheet's own hachures)
    const ground = (half, stones) => '';
    // systematic hatching inside a rectangle region (x0,y0,x1,y1): ONE lean per motif, spacing sp,
    // tightening toward the right edge (the shadow core; light from the upper left)
    const lean = R(0.6, 0.85);      // tan of the angle from vertical  // adjust hatch angle range here
    const hatch = (x0, y0, x1, y1, sp, col, w) => {
      let s = '';
      const wdt = x1 - x0, hgt = y1 - y0, n = Math.max(1, Math.round((wdt + lean * hgt) / sp));
      for (let i = 0; i < n; i++) {
        let t = (i + 0.5) / n; t = 1 - Math.pow(1 - t, 1.5);
        const c = x0 + t * (wdt + lean * hgt);                     // x where the line crosses y0 (extended)
        const ya = Math.max(0, (c - x1) / lean), yb = Math.min(hgt, (c - x0) / lean);
        if (yb - ya < 0.6) continue;
        s += line(c - lean * ya, y0 + ya, c - lean * yb, y0 + yb, col, w || 0.45);
      }
      return s;
    };
    const shadow = (pts) => '';                        // washes are deleted by the ink engine: tone is hatch only
    const redDot = (cx, cy, r) => `<circle cx="${X(cx)}" cy="${Y(cy)}" r="${N(r * k)}" fill="${S.red}"/>`;
    return { S, rand, MIX, j, R, X, Y, W, sw, base, pl, line, circ, poly, ground, hatch, shadow, redDot, flip, blob, bar, hi, dotI };
  }
  const wrap = s => `<g>${s}</g>`;

  // Simple standing figure (head, torso, legs) with optional hat; facing +x
  function figure(h, ox, oy, hat) {
    // period staffage: a solid ink silhouette from figures.js (loaded before this file); nothing if absent
    const sil = window.MRI_MOTIFS && window.MRI_MOTIFS._silhouette;
    if (!sil) return '';
    return sil({ S: h.S, rand: h.rand, MIX: h.MIX }, parseFloat(h.X(ox)), parseFloat(h.Y(oy)), parseFloat(h.W(1)),
               { stance: 'lean', facing: h.flip, hat: hat ? 'brim' : 'cap', height: 16 });
  }

  window.MRI_MOTIFS = Object.assign(window.MRI_MOTIFS || {}, {

    // Automatic weather station: a dark mast with its booms; the cup anemometer is the one detail
    weatherStation(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, blob, bar, hi, dotI, R, j, rand } = h;
      let s = '';
      const H = R(31, 36);
      // guy wires first (hairline), anchored on small dark pegs
      s += line(0, -H + 3, -11, 0.5, S.inkSoft, 0.45); s += line(0, -H + 3, 10.5, 0.8, S.inkSoft, 0.45);
      s += bar(-11.3, 1.2, -10.7, -0.6, 0.7, 0.4); s += bar(10.8, 1.4, 11.3, -0.4, 0.7, 0.4);
      // mast: one tapered bar, a paper hairline down its lit left side
      s += bar(0, 0.2, 0, -H, 1.3, 0.8);
      s += hi(-0.3, -2, -0.2, -H + 4);
      s += blob([[-2.2, 0.3], [2.2, 0.3], [1.6, -1.0], [-1.6, -1.0]]);            // base plate
      // top boom with the cup anemometer: crossbar and two solid cups, one seen open, one closed
      s += bar(0, -H + 1, 9, -H - 1, 0.8, 0.6);
      s += bar(9, -H - 1, 9, -H - 4.6, 0.7, 0.5);
      const ax = 9, ay = -H - 4.9;
      s += bar(ax - 3.4, ay - 0.3, ax + 3.4, ay + 0.3, 0.55, 0.55);
      // the cups: two solid half-discs, one open toward us, one seen from its back
      s += `<path d="M${h.X(ax - 4.6)} ${h.Y(ay - 0.4)} a${N(1.2 * k)} ${N(1.2 * k)} 0 0 ${h.flip > 0 ? 1 : 0} ${N(h.flip * 2.4 * k)} 0 Z" fill="${S.ink}" stroke="none"/>`;
      s += hi(ax - 4.2, ay - 0.55, ax - 2.8, ay - 0.55);
      s += `<path d="M${h.X(ax + 2.2)} ${h.Y(ay + 0.2)} a${N(1.2 * k)} ${N(1.2 * k)} 0 0 ${h.flip > 0 ? 0 : 1} ${N(h.flip * 2.4 * k)} 0 Z" fill="${S.ink}" stroke="none"/>`;
      s += dotI(ax, ay - 0.3, 0.5);
      // wind vane on the other side: a solid arrow
      s += bar(0, -H + 4, -7, -H + 3, 0.7, 0.5);
      s += blob([[-7, -H + 3], [-9.8, -H + 1.6], [-8.6, -H + 3.1], [-9.8, -H + 4.5]]);
      s += blob([[-7, -H + 5.6], [-7, -H + 0.8], [-5.8, -H + 1.4], [-5.8, -H + 5]]);
      // radiation shield: a dark stack on a short boom, louvres as paper hairlines
      const sv = -R(19, 22);
      s += bar(0, sv, 5.2, sv - 0.3, 0.7, 0.5);
      s += blob([[4.2, sv - 0.3], [7.6, sv - 0.3], [7.2, sv + 3.6], [4.6, sv + 3.6]]);
      for (let i = 1; i < 4; i++) s += hi(4.5, sv + i * 0.95, 7.3, sv + i * 0.95 + 0.1);
      // solar panel, tilted, a single paper hairline for the frame
      const pv = -R(12.5, 15);
      s += bar(0, pv, -3.2, pv + 0.4, 0.7, 0.5);
      s += blob([[-3.3, pv - 2.6], [-8.4, pv - 0.3], [-8.4, pv + 2.6], [-3.3, pv + 0.3]]);
      s += hi(-7.9, pv - 0.1, -3.9, pv - 1.9); s += hi(-7.9, pv + 1.3, -3.9, pv - 0.5);
      s += hi(-5.9, pv - 1.2, -5.9, pv + 1.6);
      // data-logger box at chest height, lid line in paper
      s += blob([[0.7, -8.8], [3.8, -8.8], [3.8, -4.8], [0.7, -4.8]]);
      s += hi(1.1, -7.6, 3.4, -7.6); s += dotI(3.1, -6.2, 0.3, S.paper);
      return wrap(s);
    },

    // Graduated snow stake (red ticks), half-buried in a snow bank
    snowStake(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, poly, bar, hi, j, R, rand } = h;
      let s = '';
      // snow bank: soft mound filled with paperHigh, a few shade strokes on its right flank
      const mound = [[-11, 0.5], [-7, -2.2], [-2, -3.6], [3, -3.2], [8, -1.6], [11, 0.5]];
      s += poly(mound, 'none', 0, S.paperHigh);
      s += pl(mound, S.inkSoft, 0.6);
      s += line(-11, 0.5, 11, 0.5, S.inkSoft, 0.45);
      for (let i = 0; i < 3; i++) s += line(4.5 + i * 1.6, -2.2 + i * 0.45, 3.6 + i * 1.6, 0, S.inkSoft, 0.45);
      // the stake: one dark tapered bar, lit edge as a paper hairline, a wedge point at the top
      const top = -R(25, 29);
      s += bar(0, -3.4, 0.3, top, 1.6, 0.9);
      s += hi(-0.45, -5, -0.15, top + 2);
      s += pl([[0.3 - 0.45, top], [0.3, top - 1.4], [0.3 + 0.45, top]], S.ink, 0.7);
      // graduations: red ticks to the right, longer each 5th — the survey mark
      const nT = Math.floor((-5 - top) / 2.4);
      for (let i = 0; i < nT; i++) {
        const yy = -5 - i * 2.4, len = i % 5 === 4 ? 2.3 : 1.3;
        s += line(0.5, yy, 0.5 + len, yy, S.red, i % 5 === 4 ? 0.7 : 0.5);
      }
      // the stake's shadow on the snow: three hatch strokes, not a wash
      for (let i = 0; i < 3; i++) s += line(1 + i * 0.9, -2.8 + i * 0.5, 3.2 + i * 1.2, -1.6 + i * 0.55, S.inkSoft, 0.45);
      return wrap(s);
    },

    // Standard rain gauge: a dark cylinder with its funnel, on a short post
    rainGauge(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, blob, bar, hi, pl, R, j } = h;
      let s = '';
      const bh = R(9, 11), r = R(2.8, 3.3);
      s += bar(0, 0.3, 0, -7, 1.2, 0.9);                                 // post
      s += blob([[-1.6, -6.6], [1.6, -6.6], [1.6, -7.4], [-1.6, -7.4]]);  // bracket
      // body: solid, with the lit strip and a band as paper hairlines
      s += blob([[-r, -7], [r, -7], [r, -7 - bh], [-r, -7 - bh]]);
      s += hi(-r + 0.8, -7.6, -r + 0.8, -7 - bh + 0.8);
      s += hi(-r + 0.4, -9.6, r - 0.4, -9.6);
      // funnel: a dark cone under a flat rim seen nearly edge-on
      const ft = -7 - bh, rim = ft - 4.6;
      s += blob([[-1.2, ft], [1.2, ft], [r + 1.7, rim + 0.6], [-r - 1.7, rim + 0.6]]);
      s += `<ellipse cx="${h.X(0)}" cy="${h.Y(rim)}" rx="${N((r + 1.8) * k)}" ry="${N(1.0 * k)}" stroke="${S.ink}" stroke-width="${h.sw(0.7)}" fill="${S.paper}"/>`;
      s += hi(-r - 0.6, rim + 1.5, -0.4, ft - 0.6);
      // the measuring tube glimpsed beside the post: red graduations (the survey mark)
      for (let i = 0; i < 4; i++) s += line(r + 0.8, -9.5 - i * 1.7, r + 1.8, -9.5 - i * 1.7, S.red, 0.5);
      s += line(r + 1.3, -8.6, r + 1.3, -15.5, S.inkSoft, 0.45);
      // three drops
      for (let i = 0; i < 3; i++) { const dx = -3 + i * 3 + j(1.2), dy = rim - 4 + (i % 2) * 2 + j(1.5); s += line(dx, dy, dx - 0.3, dy + 1.4, S.water, 0.6); }
      return wrap(s);
    },

    // Stevenson screen: louvred instrument shelter on four legs, seen a little from the side
    thermometerPost(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, poly, blob, bar, hi, R, j, MIX } = h;
      let s = '';
      const bw = R(5.5, 6.5), bt = -R(18, 20), bb = -9, d = R(2.4, 3.2), sk = 0.55;    // half width, top, bottom, return depth, skew
      // legs: tapered bars, the rear pair thinner and a shade lighter
      s += bar(bw + d - 0.4, bb - 0.6, bw + d + 0.6, 0, 0.7, 0.45, S.inkSoft);
      s += bar(-bw + d - 0.4, bb - 0.6, -bw + d - 0.9, -0.3, 0.7, 0.45, S.inkSoft);
      s += bar(-bw + 0.5, bb, -bw - 0.7, 0.4, 1.1, 0.6);
      s += bar(bw - 0.5, bb, bw + 0.7, 0.4, 1.1, 0.6);
      s += line(-bw - 0.2, -3.6, bw + 0.2, -3.6, S.inkSoft, 0.45);         // cross brace
      // the return (right) face: solid ink, louvres as paper hairlines
      s += blob([[bw, bb], [bw + d, bb - d * sk], [bw + d, bt - d * sk], [bw, bt]]);
      for (let i = 1; i < 6; i++) { const v = bt + (bb - bt) * i / 6; s += hi(bw + 0.4, v - 0.4 * sk, bw + d - 0.3, v - (d - 0.3) * sk); }
      // front face: paper, louvre slats as a systematic family of slanted ink hairlines
      s += poly([[-bw, bb], [bw, bb], [bw, bt], [-bw, bt]], S.ink, 0.9, S.paper);
      const nL = Math.round(R(6, 8));
      for (let i = 0; i < nL; i++) { const v = bt + 1.2 + i * ((bb - bt - 2) / nL); s += line(-bw + 0.7, v, bw - 0.7, v + 0.45, S.inkSoft, 0.45); }
      s += line(0.2, bt + 0.8, 0.2, bb - 0.6, S.ink, 0.45);                  // the door's edge
      // roof: overhanging slab, its top edge seen, dark band under the eaves
      s += blob([[-bw - 1.4, bt], [bw + d + 1.2, bt - d * sk], [bw + d + 1.2, bt - d * sk - 1.2], [-bw - 1.4, bt - 1.2]]);
      s += blob([[-bw - 1.4, bt - 1.2], [bw + 1.2, bt - 1.2], [bw + d + 1.2, bt - d * sk - 1.2], [-bw + d - 0.6, bt - d * sk - 2.2]], S.inkSoft);
      s += line(-bw - 1.2, bt + 0.6, bw + 0.4, bt + 0.6, S.ink, 0.45);       // eave shadow on the face
      return wrap(s);
    },

    // Tripod drilling rig: three dark tapered legs to a lashed apex, the winch drum the one detail
    boreholeRig(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, blob, bar, hi, dotI, R, j, rand } = h;
      let s = '';
      const apex = [0, -R(28, 32)];
      // rear leg first, lighter; then the two near legs as heavy tapered bars
      s += bar(apex[0] + 0.4, apex[1] + 1, 2.8, 1.6, 0.9, 0.6, S.inkSoft);
      s += bar(apex[0], apex[1], -11, 0.5, 1.5, 0.8);
      s += bar(apex[0], apex[1], 11.5, 0.5, 1.5, 0.8);
      s += hi(-0.6, apex[1] + 3, -9.6, -0.5);
      // lashing block at the apex, with the sheave hanging under it
      s += blob([[-2.2, apex[1] + 0.2], [2.2, apex[1] + 0.2], [1.8, apex[1] + 2.6], [-1.8, apex[1] + 2.6]]);
      s += hi(-1.4, apex[1] + 1.4, 1.4, apex[1] + 1.4);
      s += dotI(0, apex[1] + 4.2, 1.4); s += dotI(0, apex[1] + 4.2, 0.35, S.paper);
      // cable: over the sheave down the hole, and back to the winch on the left leg
      s += line(0.7, apex[1] + 5.2, 0.6, -2.2, S.ink, 0.6);
      s += line(-1.3, apex[1] + 4.6, -7.2, -13, S.inkSoft, 0.45);
      // winch drum: a solid disc with its axle in paper and a crank handle
      s += blob([[-9.4, -11.2], [-5.2, -11.2], [-5.6, -8.4], [-9.0, -8.4]]);     // frame bolted to the leg
      s += dotI(-7.3, -11.8, 2.1); s += dotI(-7.3, -11.8, 0.4, S.paper);
      s += line(-7.3, -11.8, -10.2, -14, S.ink, 0.6); s += bar(-10.2, -14, -11.2, -13, 0.9, 0.6);
      // casing at the collar of the hole
      s += blob([[-1.8, -2.2], [2.8, -2.2], [2.3, 1], [-1.3, 1]]);
      s += hi(-1.1, -1.6, -0.9, 0.5);
      // spoil heap to the right, a few strokes in its shade
      s += pl([[3.5, 1], [6, -1.3], [9, -0.3], [11.5, 1]], S.inkSoft, 0.6);
      for (let i = 0; i < 3; i++) s += line(7.2 + i * 1.2, -0.9 + i * 0.35, 6.6 + i * 1.2, 0.8, S.inkSoft, 0.45);
      return wrap(s);
    },

    // Satellite dish on a mast: the dish a dark bowl with a lit inside, the feed arm its detail
    satelliteDish(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, blob, bar, hi, dotI, R, j } = h;
      let s = '';
      s += bar(0, 0.3, 0, -12, 1.5, 1.0);                                   // mast
      s += blob([[-2.6, 0.3], [2.6, 0.3], [2.0, -1.0], [-2.0, -1.0]]);
      s += bar(0, -12, 2.6, -15.2, 1.0, 0.7);                                // mount bracket
      const cx = 3.2, cy = -R(17.5, 19.5), rot = h.flip * -R(30, 40);
      s += `<g transform="rotate(${N(rot)} ${h.X(cx)} ${h.Y(cy)})">`
        + `<ellipse cx="${h.X(cx)}" cy="${h.Y(cy)}" rx="${N(3.4 * k)}" ry="${N(8.6 * k)}" fill="${S.ink}" stroke="${S.ink}" stroke-width="${h.sw(0.7)}"/>`
        + `<ellipse cx="${h.X(cx + 1.2)}" cy="${h.Y(cy + 0.2)}" rx="${N(1.9 * k)}" ry="${N(7.0 * k)}" fill="${S.paper}" stroke="none"/>`
        + `<ellipse cx="${h.X(cx + 1.5)}" cy="${h.Y(cy + 0.2)}" rx="${N(1.0 * k)}" ry="${N(5.4 * k)}" fill="none" stroke="${S.inkSoft}" stroke-width="${h.sw(0.45)}"/>`
        + `</g>`;
      // feed arm + LNB
      s += bar(4.6, -12.6, 11, -21, 0.8, 0.5);
      s += dotI(11.3, -21.5, 1.0);
      s += hi(10.9, -21.9, 11.5, -21.3);
      return wrap(s);
    },

    // Theodolite on a tripod; opts.surveyor adds a figure peering into it.
    // Drawn from its silhouette: a compact dark instrument on three tapered legs, paper hairlines for the highlights.
    theodoliteTripod(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, blob, bar, hi, dotI, R, j } = h;
      let s = '';
      const top = -R(16, 18), spread = R(6.8, 8.2);
      // legs: the rear one lighter and shorter, the two near ones heavy, all tapering to the foot
      s += bar(0.2, top + 0.6, 1.8, 1.3, 0.8, 0.4, S.inkSoft);
      s += bar(-1.4, top, -spread, 0.5, 1.2, 0.5);
      s += bar(1.4, top, spread, 0.5, 1.2, 0.5);
      s += hi(-1.6, top + 1.5, -spread + 0.7, -0.2);
      // plumb line to the bob
      s += line(0, top + 0.4, 0.1, -1.6, S.inkSoft, 0.45);
      s += blob([[-0.45, -1.6], [0.45, -1.6], [0.1, -0.4]]);
      // the head plate: a flat disc seen edge-on
      s += blob([[-3.2, top + 0.45], [3.2, top + 0.45], [3.0, top - 0.45], [-3.0, top - 0.45]]);
      // tribrach and the horizontal circle (a thin disc edge-on, wider than the body)
      s += blob([[-1.6, top - 0.45], [1.6, top - 0.45], [1.3, top - 2.0], [-1.3, top - 2.0]]);
      s += blob([[-2.7, top - 2.0], [2.7, top - 2.0], [2.6, top - 2.8], [-2.6, top - 2.8]]);
      s += hi(-2.2, top - 2.4, 2.2, top - 2.4);
      // the alidade: standards rising from a base, one solid U
      s += blob([[-2.0, top - 2.8], [2.0, top - 2.8], [2.0, top - 3.6], [1.1, top - 3.6], [1.1, top - 7.6], [0.4, top - 7.6], [0.4, top - 3.6], [-0.4, top - 3.6], [-0.4, top - 7.6], [-1.1, top - 7.6], [-1.1, top - 3.6], [-2.0, top - 3.6]]);
      // telescope: a tilted tube through the trunnion, knurled focusing ring near the eyepiece, flared objective
      const tilt = R(0.1, 0.2), tv = top - 6.6;
      s += bar(-4.2, tv + 4.2 * tilt, 4.6, tv - 4.6 * tilt, 1.5, 1.7);
      s += blob([[-2.6, tv + 2.6 * tilt - 1.2], [-1.4, tv + 1.4 * tilt - 1.25], [-1.4, tv + 1.4 * tilt + 1.25], [-2.6, tv + 2.6 * tilt + 1.2]]);   // the knurled ring
      s += hi(-2.3, tv + 2.3 * tilt - 0.9, -1.7, tv + 1.7 * tilt + 0.9);
      s += blob([[4.4, tv - 4.4 * tilt - 1.1], [5.4, tv - 5.4 * tilt - 1.2], [5.4, tv - 5.4 * tilt + 1.2], [4.4, tv - 4.4 * tilt + 1.1]]);      // objective
      s += hi(-4.0, tv + 4.0 * tilt - 0.55, 4.2, tv - 4.2 * tilt - 0.6);
      s += dotI(0, tv, 0.35, S.paper);                                         // the trunnion axis
      // sight line (red hairline dash to the right)
      s += `<path d="M${h.X(6.4)} ${h.Y(tv - 6.4 * tilt)} L${h.X(20)} ${h.Y(tv - 20 * tilt)}" stroke="${S.red}" stroke-width="${h.sw(0.45)}" ${h.base} stroke-dasharray="${N(1.5 * k)} ${N(1.6 * k)}"/>`;
      if (opts && opts.surveyor) {
        // the observer: a silhouette standing just left of the tripod, leaning in to the eyepiece
        s += figure(h, -6.5, 0, true);
      }
      return wrap(s);
    },

    // Red measurement line between two small flags; opts.length (default 36)
    surveyTape(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, poly, circ, j, ground, rand } = h;
      const L = (opts && opts.length) || 36;
      let s = '';
      const flag = (fx) => {
        let f = line(fx, 0, fx + j(0.3), -9, S.ink, 0.8, 0.2);
        f += poly([[fx, -9], [fx + 3.5, -7.8], [fx, -6.6]], S.red, 0.55, S.red, 0.3, 'fill-opacity="0.8"');
        f += `<path d="M${h.X(fx - 1.5)} ${h.Y(0.3)} q${N(1.5 * k)} ${N(-1 * k)} ${N(3 * k)} 0" stroke="${S.inkSoft}" stroke-width="${h.sw(0.5)}" ${h.base}/>`;
        return f;
      };
      s += flag(-L / 2);
      s += flag(L / 2);
      // tape: a gently sagging red line with small tick marks
      const x0 = -L / 2 + 0.3, x1 = L / 2 - 0.3, yy = -4.5, sag = L * 0.05;
      s += `<path d="M${h.X(x0)} ${h.Y(yy)} Q${h.X(0)} ${h.Y(yy + sag)} ${h.X(x1)} ${h.Y(yy)}" stroke="${S.red}" stroke-width="${h.sw(0.6)}" ${h.base}/>`;
      const n = Math.max(3, Math.round(L / 6));
      for (let i = 1; i < n; i++) {
        const t = i / n, tx = x0 + (x1 - x0) * t, ty = yy + sag * 4 * t * (1 - t);
        s += line(tx, ty - 0.7, tx, ty + 0.7, S.red, 0.5);
      }
      // ground dashes between flags
      let cur = -L / 2 + 4;
      while (cur < L / 2 - 4) { const len = 3 + rand() * 4; s += line(cur, j(0.5), cur + len, j(0.5), S.inkSoft, 0.5); cur += len + 2 + rand() * 3; }
      return wrap(s);
    },

    // Data logger: a dark enclosure on a post, whip antenna, a cable running down into the ground
    dataLogger(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, blob, bar, hi, dotI, R } = h;
      let s = '';
      const bt = -R(15, 17);
      s += bar(0, 0.3, 0.3, bt + 1, 1.4, 0.9);
      // enclosure: solid, lid seam and latch in paper
      s += blob([[-4, bt], [4.2, bt], [4.2, bt + 8.2], [-4, bt + 8.2]]);
      s += hi(-3.4, bt + 2.1, 3.7, bt + 2.1);
      s += dotI(-1.6, bt + 5, 0.4, S.paper);
      // cable running down the post into the ground
      s += `<path d="M${h.X(3.6)} ${h.Y(bt + 8)} q${N(2 * k)} ${N(2 * k)} ${N(-1.5 * k)} ${N(4.5 * k)} q${N(-1.8 * k)} ${N(1.5 * k)} ${N(-0.5 * k)} ${N(3.8 * k)}" stroke="${S.inkSoft}" stroke-width="${h.sw(0.5)}" ${h.base}/>`;
      // whip antenna
      s += line(3, bt, 3.7, bt - 9, S.ink, 0.6);
      s += dotI(3.7, bt - 9.2, 0.45);
      return wrap(s);
    },

    // Soil profile: cut-away section with horizons and roots, ~40 wide
    soilProfile(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, j, rand, MIX } = h;
      let s = '';
      const W2 = 20, D = 24;
      // block fill: earth tones, faint
      s += poly([[-W2, 0], [W2, 0], [W2, -D], [-W2, -D]], 'none', 0, MIX(S.paper, S.moraine, 0.18), 0.3);
      // horizons as wavy lines: O/A, B, C
      const hz = (yy, amp, col, w) => {
        const pts = []; for (let i = 0; i <= 8; i++) pts.push([-W2 + i * (W2 * 2 / 8), yy + (rand() - 0.5) * amp]);
        return pl(pts, col, w, 0);
      };
      // top surface line with grass tufts
      s += hz(-D, 0.6, S.ink, 0.9);
      for (let i = 0; i < 9; i++) { const gx = -W2 + 2 + i * 4.4 + j(1); s += pl([[gx, -D + 0.2], [gx - 0.8, -D - 2.2]], S.sageDeep, 0.5); s += pl([[gx, -D + 0.2], [gx + 0.9, -D - 1.8]], S.sageDeep, 0.5); }
      // A horizon dark band: stipple
      for (let i = 0; i < 28; i++) circ;
      for (let i = 0; i < 30; i++) { const px = -W2 + 1 + rand() * (W2 * 2 - 2), py = -D + 0.6 + rand() * 3.8; s += `<circle cx="${h.X(px)}" cy="${h.Y(py)}" r="${N(0.28 * k)}" fill="${S.ink}"/>`; }
      s += hz(-D + 5, 1.0, S.inkSoft, 0.55);
      s += hz(-D + 12, 1.4, S.inkSoft, 0.55);
      // B horizon: faint diagonal hatch
      for (let i = 0; i < 9; i++) { const hx = -W2 + 2 + i * 4.2; s += line(hx, -D + 6, hx + 2.2, -D + 11, S.moraine, 0.45, 0.3); }
      // C horizon: stones
      for (let i = 0; i < 7; i++) {
        const sx = -W2 + 2 + rand() * (W2 * 2 - 4), sy = -D + 13.5 + rand() * 9, r = 0.8 + rand() * 1.1;
        s += poly([[sx - r, sy], [sx - r * 0.4, sy - r * 0.8], [sx + r * 0.7, sy - r * 0.6], [sx + r, sy + r * 0.3], [sx, sy + r * 0.7]], S.moraine, 0.5, 'none', 0.2);
      }
      // roots descending from the A horizon
      const root = (rx, depth) => {
        let d = `M${h.X(rx)} ${h.Y(-D + 0.5)}`, cx = rx, cy = -D + 0.5;
        const steps = 4;
        for (let i = 0; i < steps; i++) { const nx = cx + (rand() - 0.5) * 3, ny = cy + depth / steps; d += ` Q${h.X(cx + (rand() - 0.5) * 2)} ${h.Y(cy + depth / steps * 0.5)} ${h.X(nx)} ${h.Y(ny)}`; cx = nx; cy = ny; }
        let r = `<path d="${d}" stroke="${S.sageDeep}" stroke-width="${h.sw(0.55)}" ${h.base}/>`;
        // side rootlets
        r += line(rx + 0.5, -D + 4, rx + 3 + j(1), -D + 6.5 + j(1), S.sageDeep, 0.45);
        r += line(rx - 0.3, -D + 7, rx - 2.6 + j(1), -D + 9 + j(1), S.sageDeep, 0.45);
        return r;
      };
      s += root(-9, 11); s += root(4, 14); s += root(12, 8);
      // box outline: front face + right side (cut-away depth)
      s += poly([[-W2, 0], [W2, 0], [W2, -D], [-W2, -D]], S.ink, 0.9, 'none', 0.3);
      s += pl([[W2, -D], [W2 + 4, -D - 2.5], [W2 + 4, -2.5], [W2, 0]], S.ink, 0.7, 0.2);
      s += pl([[-W2, -D], [-W2 + 4, -D - 2.5], [W2 + 4, -D - 2.5]], S.inkSoft, 0.6, 0.3);
      s += poly([[W2, -D], [W2 + 4, -D - 2.5], [W2 + 4, -2.5], [W2, 0]], 'none', 0, S.shade, 0, 'fill-opacity="0.09"');
      return wrap(s);
    },

    // Open field notebook with a pencil, lying on a rock
    openNotebook(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, j, rand, MIX } = h;
      let s = '';
      // rock: lumpy outline, shaded right
      const rock = [[-13, 0.5], [-11, -3], [-7, -5.5], [0, -6.5], [7, -5.8], [11.5, -3.2], [13, 0.5]];
      s += poly(rock, S.ink, 0.8, MIX(S.paper, S.stone, 0.35), 0.5);
      for (let i = 0; i < 5; i++) s += line(4 + i * 1.7, -5.2 + i * 0.9, 6.5 + i * 1.7, -1.5 + i * 0.2, S.inkSoft, 0.45, 0.3);
      s += line(-9, -2, -5, -3.5, S.inkSoft, 0.45, 0.4);   // a crack
      // notebook: two pages in slight perspective, knocked out
      const L = [[-11, -7.2], [-1, -7.6], [0.4, -11.6], [-8.2, -11.2]];
      const R = [[-1, -7.6], [9, -7.2], [9.8, -11.2], [0.4, -11.6]];
      s += poly(L, S.ink, 0.7, S.paperHigh, 0.2);
      s += poly(R, S.ink, 0.7, S.paperHigh, 0.2);
      s += line(-1, -7.6, 0.4, -11.6, S.ink, 0.7);   // spine
      // line-hints (not text) on the left page
      for (let i = 0; i < 3; i++) s += line(-8.2 + i * 0.6, -10.6 + i * 1.1, -3.5 - rand() * 2, -10.7 + i * 1.1, S.inkSoft, 0.45);
      // sketch hint on the right page: a tiny mountain line
      s += pl([[1.6, -8.6], [3.4, -10.6], [4.8, -9.6], [6.6, -10.8], [8.4, -8.6]], S.inkSoft, 0.45, 0.2);
      // pencil lying across the right page corner
      s += pl([[2, -7.9], [9.5, -10.6]], S.ink, 0.9, 0.1);
      s += pl([[9.5, -10.6], [10.8, -11.1]], S.ink, 0.5);
      s += line(2.4, -8.5, 2.8, -7.4, S.red, 0.7);   // eraser band accent
      // small shadow under book (right side)
      s += poly([[-1, -7.2], [9.5, -6.8], [10, -6.2], [-0.5, -6.6]], 'none', 0, S.shade, 0, 'fill-opacity="0.12"');
      s += h.ground(14, 1);
      return wrap(s);
    },

    // Quadcopter in the air with dotted flight path; stands at (x,y) = ground under it
    drone(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, j, ground } = h;
      let s = '';
      const cy = -22;
      // flight path: dotted curve rising from the left, passing through the drone
      s += `<path d="M${h.X(-22)} ${h.Y(cy + 10)} C${h.X(-14)} ${h.Y(cy + 9)} ${h.X(-8)} ${h.Y(cy - 1)} ${h.X(-2)} ${h.Y(cy)} S${h.X(12)} ${h.Y(cy - 3)} ${h.X(20)} ${h.Y(cy - 9)}" stroke="${S.inkSoft}" stroke-width="${h.sw(0.5)}" ${h.base} stroke-dasharray="${N(0.6 * k)} ${N(1.6 * k)}"/>`;
      // body
      s += poly([[-2.2, cy - 1], [2.2, cy - 1], [2.6, cy + 1], [-2.6, cy + 1]], S.ink, 0.8, S.paper, 0.15);
      // arms
      s += line(-2.4, cy, -7, cy - 1.2, S.ink, 0.8);
      s += line(2.4, cy, 7, cy - 1.2, S.ink, 0.8);
      // rotors: thin ellipses (motion blur feel: two hairline arcs)
      const rotor = (rx) => `<ellipse cx="${h.X(rx)}" cy="${h.Y(cy - 1.6)}" rx="${N(3.4 * k)}" ry="${N(0.7 * k)}" stroke="${S.ink}" stroke-width="${h.sw(0.55)}" fill="none"/>`
        + line(rx, cy - 1.2, rx, cy - 2.2, S.ink, 0.6);
      s += rotor(-7); s += rotor(7);
      // camera gimbal underneath
      s += circ(0.4, cy + 2, 0.8, S.ink, 0.6);
      // landing skids
      s += line(-1.8, cy + 1, -1.8, cy + 2.6, S.inkSoft, 0.5); s += line(1.8, cy + 1, 1.8, cy + 2.6, S.inkSoft, 0.5);
      // a faint shadow spot on the ground beneath
      s += `<ellipse cx="${h.X(1)}" cy="${h.Y(0)}" rx="${N(4 * k)}" ry="${N(0.8 * k)}" fill="${S.shade}" fill-opacity="0.08"/>`;
      s += ground(6, 1);
      return wrap(s);
    },

    // Globe with meridians and parallels on a stand
    globe(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, j, ground, MIX } = h;
      let s = '';
      const R = 8, cy = -13;
      // stand: foot and pillar
      s += `<ellipse cx="${h.X(0)}" cy="${h.Y(-0.5)}" rx="${N(5 * k)}" ry="${N(1.2 * k)}" stroke="${S.ink}" stroke-width="${h.sw(0.8)}" fill="${S.paper}"/>`;
      s += line(0, -1.5, 0, -4.5, S.ink, 1.0);
      // meridian ring (semi-circle arc, tilted)
      s += `<g transform="rotate(${N(h.flip * 23)} ${h.X(0)} ${h.Y(cy)})">`
        + `<path d="M${h.X(0)} ${h.Y(cy + R + 1.6)} A${N((R + 1.6) * k)} ${N((R + 1.6) * k)} 0 0 0 ${h.X(0)} ${h.Y(cy - R - 1.6)}" stroke="${S.ink}" stroke-width="${h.sw(0.9)}" ${h.base}/>`
        + `<line x1="${h.X(0)}" y1="${h.Y(cy + R + 1.6)}" x2="${h.X(0)}" y2="${h.Y(cy + R + 4)}" stroke="${S.ink}" stroke-width="${h.sw(0.8)}"/>`
        // sphere
        + circ(0, cy, R, S.ink, 0.9, MIX(S.paper, S.waterPale, 0.45))
        // parallels: ellipses of varying ry
        + [[-4.6, 0.6], [0, 1], [4.6, 0.6]].map(p =>
            `<path d="M${h.X(-Math.sqrt(R * R - p[0] * p[0]))} ${h.Y(cy + p[0])} A${N(Math.sqrt(R * R - p[0] * p[0]) * k)} ${N(1.6 * p[1] * k)} 0 0 ${p[0] >= 0 ? 0 : 1} ${h.X(Math.sqrt(R * R - p[0] * p[0]))} ${h.Y(cy + p[0])}" stroke="${S.inkSoft}" stroke-width="${h.sw(0.45)}" ${h.base}/>`).join('')
        // meridians: ellipses of varying rx
        + [0.5].map(t => `<ellipse cx="${h.X(0)}" cy="${h.Y(cy)}" rx="${N(R * t * k)}" ry="${N(R * k)}" stroke="${S.inkSoft}" stroke-width="${h.sw(0.45)}" fill="none"/>`).join('')
        + line(0, cy - R, 0, cy + R, S.inkSoft, 0.45)
        // a continent-ish blob, open stroke only
        + pl([[-4, cy - 3], [-1.5, cy - 4.5], [1.5, cy - 3], [2.5, cy - 0.5], [0.5, cy + 2], [-2, cy + 3.5], [-3.5, cy + 1]], S.sageDeep, 0.55, 0.5)
        // shading on lower right of sphere (hatch arcs)
        + [0, 1, 2].map(i => `<path d="M${h.X(3 + i * 1.2)} ${h.Y(cy + 6.5 - i * 0.8)} q${N(2.6 * k)} ${N(-2 * k)} ${N(3 * k)} ${N(-5 * k)}" stroke="${S.inkSoft}" stroke-width="${h.sw(0.45)}" ${h.base}/>`).join('')
        + `</g>`;
      s += ground(7, 1);
      return wrap(s);
    },

    // Treaty document: a sheet with line-hints, seal and ribbon
    treatyDocument(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, j, rand, MIX } = h;
      let s = '';
      // sheet, slightly askew, with a curled corner
      const sheet = [[-8, -0.5], [8.5, 0], [8.2, -21], [-8.5, -20.6]];
      s += poly([[-7, 0.6], [9.3, 1.1], [9.1, -20], [-7.5, -19.6]], 'none', 0, S.shade, 0, 'fill-opacity="0.08"'); // shadow
      s += poly(sheet, S.ink, 0.8, S.paperHigh, 0.2);
      // header line-hints (heavier) and body line-hints
      s += line(-5.5, -17.5, 2.5, -17.6, S.ink, 0.8, 0.2);
      for (let i = 0; i < 6; i++) s += line(-5.5, -14.5 + i * 1.9, 5.5 - rand() * 3, -14.6 + i * 1.9, S.inkSoft, 0.45, 0.15);
      // signature squiggle
      s += `<path d="M${h.X(-5)} ${h.Y(-3.5)} c${N(1 * k)} ${N(-2.5 * k)} ${N(2 * k)} ${N(1 * k)} ${N(3 * k)} ${N(-1 * k)} s${N(2 * k)} ${N(-1.5 * k)} ${N(3.5 * k)} ${N(0.5 * k)}" stroke="${S.ink}" stroke-width="${h.sw(0.55)}" ${h.base}/>`;
      // ribbon tails from the seal
      s += pl([[4.5, -3], [3.2, 1.5], [4.6, 2.8]], S.red, 0.7, 0.2);
      s += pl([[6, -3], [7.5, 1.8], [6.2, 3.2]], S.red, 0.7, 0.2);
      // wax seal: double circle, with the one blue institutional accent in the centre
      s += circ(5.3, -4.5, 2.4, S.ink, 0.8, S.paper);
      s += circ(5.3, -4.5, 1.6, S.inkSoft, 0.5);
      s += `<circle cx="${h.X(5.3)}" cy="${h.Y(-4.5)}" r="${N(0.7 * k)}" fill="${S.blue}"/>`;
      // curled corner top-left
      s += pl([[-8.5, -20.6], [-6, -20.8], [-8.2, -18]], S.ink, 0.6, 0.2);
      return wrap(s);
    },

    // Scales of justice: beam, two hanging pans, on a pillar
    scalesOfJustice(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, j, ground } = h;
      let s = '';
      // base and pillar
      s += `<ellipse cx="${h.X(0)}" cy="${h.Y(-0.5)}" rx="${N(5 * k)}" ry="${N(1.2 * k)}" stroke="${S.ink}" stroke-width="${h.sw(0.8)}" fill="${S.paper}"/>`;
      s += line(0, -1.5, 0, -21, S.ink, 1.1, 0.2);
      s += line(-1.5, -2, 1.5, -2, S.inkSoft, 0.5);
      // finial
      s += circ(0, -22, 1, S.ink, 0.7);
      // beam, slightly tilted (one side heavier)
      const tilt = 1.2;
      s += line(-11, -19 + tilt, 11, -19 - tilt, S.ink, 0.9, 0.2);
      circ(0, -19, 0.8, S.ink, 0.6);
      s += circ(0, -19, 0.9, S.ink, 0.6, S.paper);
      // pans: chains as hairlines converging to a shallow dish
      const pan = (px, py) => {
        let p = '';
        p += line(px, py, px - 4, py + 8, S.inkSoft, 0.45);
        p += line(px, py, px + 4, py + 8, S.inkSoft, 0.45);
        p += line(px, py, px + 0.3, py + 8.4, S.inkSoft, 0.45);
        p += `<path d="M${h.X(px - 4.5)} ${h.Y(py + 8)} q${N(4.5 * k)} ${N(3.2 * k)} ${N(9 * k)} 0" stroke="${S.ink}" stroke-width="${h.sw(0.8)}" stroke-linecap="round" stroke-linejoin="round" fill="${S.paper}"/>`;
        p += line(px - 4.5, py + 8, px + 4.5, py + 8, S.ink, 0.6);
        return p;
      };
      s += pan(-11, -19 + tilt);
      s += pan(11, -19 - tilt);
      // a small stone on the lower pan (the weighted side)
      s += circ(-11.5, -19 + tilt + 7.3, 0.8, S.ink, 0.6);
      s += ground(7, 1);
      return wrap(s);
    },

    // Gavel resting on its sounding block
    gavel(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, j, ground, hatch, MIX } = h;
      let s = '';
      // sounding block: a low round disc
      s += `<ellipse cx="${h.X(-5)}" cy="${h.Y(-2.2)}" rx="${N(6 * k)}" ry="${N(1.7 * k)}" stroke="${S.ink}" stroke-width="${h.sw(0.8)}" fill="${S.paper}"/>`;
      s += line(-11, -2.2, -11, 0, S.ink, 0.8); s += line(1, -2.2, 1, 0, S.ink, 0.8);
      s += `<path d="M${h.X(-11)} ${h.Y(0)} a${N(6 * k)} ${N(1.7 * k)} 0 0 0 ${N(h.flip * 12 * k)} 0" stroke="${S.ink}" stroke-width="${h.sw(0.8)}" ${h.base}/>`;
      s += hatch(-3, -1.8, 1, 0, 0.9, S.inkSoft, 0.4);
      // handle + head drawn in a frame rotated -28° about the handle end (the head rests on the block's edge)
      const hx = -5, hy = -5.6, ang = -22 * h.flip;
      s += `<g transform="rotate(${N(ang)} ${h.X(hx)} ${h.Y(hy)})">`;
      const px = hx + 2.2, py = hy;
      s += line(px, py, px + 13, py, S.ink, 1.1, 0.2);                    // handle
      s += line(px + 0.5, py + 0.9, px + 11.5, py + 0.9, S.inkSoft, 0.5, 0.2);
      s += line(px + 13, py - 0.9, px + 13, py + 0.9, S.ink, 0.7);        // pommel
      // head: cylinder resting on the block, axis vertical in this frame
      s += poly([[hx - 1.8, hy - 4.5], [hx + 1.8, hy - 4.5], [hx + 1.8, hy + 4.5], [hx - 1.8, hy + 4.5]], S.ink, 0.9, S.paper, 0.15);
      s += `<ellipse cx="${h.X(hx)}" cy="${h.Y(hy - 4.5)}" rx="${N(1.8 * k)}" ry="${N(0.7 * k)}" stroke="${S.ink}" stroke-width="${h.sw(0.7)}" fill="${S.paper}"/>`;
      s += `<ellipse cx="${h.X(hx)}" cy="${h.Y(hy + 4.5)}" rx="${N(1.8 * k)}" ry="${N(0.7 * k)}" stroke="${S.ink}" stroke-width="${h.sw(0.7)}" fill="${S.paper}"/>`;
      s += line(hx - 1.8, hy - 3, hx + 1.8, hy - 3, S.inkSoft, 0.45);   // bands
      s += line(hx - 1.8, hy + 3, hx + 1.8, hy + 3, S.inkSoft, 0.45);
      for (let i = 0; i < 5; i++) s += line(hx + 0.6, hy - 2.5 + i * 1.2, hx + 1.5, hy - 2.2 + i * 1.2, S.inkSoft, 0.45, 0.2);
      s += `</g>`;
      // small impact marks
      s += line(-6, -4.5, -6.8, -6, S.inkSoft, 0.5); s += line(-4, -5, -3.8, -6.6, S.inkSoft, 0.5);
      s += ground(10, 1);
      return wrap(s);
    },

    // Isotherm lines: three dashed horizontals rising, with a small thermometer glyph
    isothermLines(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, j, rand, R } = h;
      let s = '';
      // three dashed lines at increasing heights, each slightly tilted upward to the right (warming uplift)
      const ys = [-4, -11, -18];
      ys.forEach((yy, i) => {
        const pts = []; for (let t = 0; t <= 6; t++) pts.push([-16 + t * 5, yy - t * 0.35 + (rand() - 0.5) * 0.5]);
        const d = pts.map((p, q) => (q ? 'L' : 'M') + h.X(p[0]) + ' ' + h.Y(p[1])).join('');
        s += `<path d="${d}" stroke="${i === 2 ? S.red : S.inkSoft}" stroke-width="${h.sw(i === 2 ? 0.7 : 0.6)}" ${h.base} stroke-dasharray="${N(2.6 * k)} ${N(1.4 * k)}"/>`;
      });
      // tiny upward arrows between lines (shift)
      for (let i = 0; i < 2; i++) { const ax = 8 + i * 5; s += line(ax, ys[i] - 1.2, ax, ys[i + 1] + 1.2, S.inkSoft, 0.45); s += pl([[ax - 0.8, ys[i + 1] + 2.3], [ax, ys[i + 1] + 1.2], [ax + 0.8, ys[i + 1] + 2.3]], S.inkSoft, 0.45); }
      // the instrument at the left: a graduated survey stake with a slim glass tube strapped to it —
      // the thermometer is a thin paper hairline with a small red bulb, not a clip-art glyph
      const tx = -19, st = -R(18, 21);
      s += h.bar(tx, 0.3, tx + 0.3, st, 0.9, 0.5);
      s += pl([[tx + 0.3 - 0.45, st], [tx + 0.3, st - 1.1], [tx + 0.3 + 0.45, st]], S.ink, 0.7);
            for (let i = 0; i < 6; i++) s += line(tx - 0.7, -4 - i * 2.5, tx - 1.4 - (i % 2 ? 0 : 0.6), -4 - i * 2.5, S.ink, 0.45);   // graduations, on the lit side
      s += line(tx + 2.0, st + 4, tx + 2.0, -3.2, S.ink, 0.45);                  // the glass tube, hairline
      s += line(tx + 2.0, -9.5 - R(0, 3), tx + 2.0, -3.2, S.red, 0.6);           // the mercury column
      s += `<circle cx="${h.X(tx + 2.0)}" cy="${h.Y(-2.7)}" r="${N(0.55 * k)}" fill="${S.red}"/>`;
      s += line(tx + 0.5, -12.5, tx + 3.0, -12.5, S.ink, 0.45); s += line(tx + 0.5, -5.5, tx + 3.0, -5.5, S.ink, 0.45);   // straps
      // ground hint
      s += h.ground(20, 0);
      return wrap(s);
    },

    // Ice core sample: a banded cylinder held upright (in a cradle)
    icecoreSample(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, j, rand, ground, MIX } = h;
      let s = '';
      const r = 3.2, top = -26, bot = -3;
      // cylinder body
      s += poly([[-r, bot], [r, bot], [r, top], [-r, top]], 'none', 0, S.ice, 0);
      s += line(-r, bot, -r, top, S.ink, 0.9, 0.2);
      s += line(r, bot, r, top, S.ink, 0.9, 0.2);
      s += `<ellipse cx="${h.X(0)}" cy="${h.Y(top)}" rx="${N(r * k)}" ry="${N(1.1 * k)}" stroke="${S.ink}" stroke-width="${h.sw(0.8)}" fill="${S.paperHigh}"/>`;
      s += `<path d="M${h.X(-r)} ${h.Y(bot)} a${N(r * k)} ${N(1.1 * k)} 0 0 0 ${N(h.flip * 2 * r * k)} 0" stroke="${S.ink}" stroke-width="${h.sw(0.8)}" ${h.base}/>`;
      // annual layers: curved bands of varying spacing/weight
      let yy = top + 2.2;
      while (yy < bot - 1) {
        const w = 0.45 + rand() * 0.35, dark = rand() < 0.3;
        s += `<path d="M${h.X(-r + 0.2)} ${h.Y(yy)} a${N(r * k)} ${N(1.0 * k)} 0 0 0 ${N(h.flip * (2 * r - 0.4) * k)} 0" stroke="${dark ? S.inkSoft : S.iceLine}" stroke-width="${h.sw(w)}" ${h.base}/>`;
        if (dark) { // a dust band: stipple
          for (let i = 0; i < 4; i++) s += `<circle cx="${h.X(-r + 0.8 + rand() * (2 * r - 1.6))}" cy="${h.Y(yy + 0.7 + rand() * 0.4)}" r="${N(0.22 * k)}" fill="${S.inkSoft}"/>`;
        }
        yy += 1.3 + rand() * 1.7;
      }
      // highlight on left, shade on right
      s += line(-r + 0.9, top + 2.5, -r + 0.9, bot - 2, S.paperHigh, 0.8, 0.3);
      for (let i = 0; i < 6; i++) s += line(r - 1.4, top + 3 + i * 3.6 + j(0.6), r - 0.4, top + 4.2 + i * 3.6 + j(0.6), S.inkSoft, 0.45);
      // cradle: two V supports at the base
      s += pl([[-6, 0], [-r - 0.5, bot - 1]], S.ink, 0.7, 0.2);
      s += pl([[6, 0], [r + 0.5, bot - 1]], S.ink, 0.7, 0.2);
      s += line(-6.5, 0, 6.5, 0, S.ink, 0.9, 0.2);
      // red depth tick at one band (sampled layer)
      s += line(r + 0.8, -14, r + 2.6, -14, S.red, 0.6);
      s += ground(9, 1);
      return wrap(s);
    }
  });
})();
