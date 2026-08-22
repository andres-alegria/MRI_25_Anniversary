// ICE, SNOW AND HAZARDS motif group — ink-on-paper survey-plate drawings.
// Registers on window.MRI_MOTIFS. Classic script, no imports.
(function () {
  const f = n => (+n).toFixed(1);

  // ---- small drawing helpers (all numbers fixed to 1 decimal) -------------
  // polyline path "M .. L .." from [[x,y],...]; closed=true appends Z
  function P(pts, closed) {
    let d = '';
    for (let i = 0; i < pts.length; i++) d += (i ? ' L' : 'M') + f(pts[i][0]) + ' ' + f(pts[i][1]);
    return d + (closed ? ' Z' : '');
  }
  // smooth-ish path through points using quadratic midpoints (hand curve)
  function Q(pts, closed) {
    if (pts.length < 3) return P(pts, closed);
    let d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ' Q' + f(pts[i][0]) + ' ' + f(pts[i][1]) + ' ' + f(mx) + ' ' + f(my);
    }
    const l = pts[pts.length - 1];
    d += ' L' + f(l[0]) + ' ' + f(l[1]);
    return d + (closed ? ' Z' : '');
  }
  // jitter a point list by +-a (uses ctx.rand)
  function wob(rand, pts, a) { return pts.map(p => [p[0] + (rand() - 0.5) * a, p[1] + (rand() - 0.5) * a]); }
  function path(d, stroke, w, extra) {
    return '<path d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + f(w) + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';
  }
  function fillPath(d, fill, stroke, w, extra) {
    return '<path d="' + d + '" fill="' + fill + '" stroke="' + (stroke || 'none') + '" stroke-width="' + f(w || 0) + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';
  }
  function ln(x1, y1, x2, y2, stroke, w, extra) {
    return '<line x1="' + f(x1) + '" y1="' + f(y1) + '" x2="' + f(x2) + '" y2="' + f(y2) + '" stroke="' + stroke + '" stroke-width="' + f(w) + '" stroke-linecap="round"' + (extra || '') + '/>';
  }
  function dot(x, y, r, fill) { return '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(r) + '" fill="' + fill + '"/>'; }
  // hand-drawn stone: irregular 5-6 gon around (x,y) radius r
  function stone(ctx, x, y, r, stroke, w, fill) {
    const n = 5 + Math.floor(ctx.rand() * 2), pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ctx.rand() * 0.5, rr = r * (0.7 + ctx.rand() * 0.5);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.75]);
    }
    return fillPath(P(pts, true), fill || 'none', stroke, w);
  }
  // a few hatch strokes: from (x,y) along direction (dx,dy) spacing s, count n, length len (tilted down-right)
  function hatch(ctx, x, y, dx, dy, n, len, stroke, w, ang) {
    let s = '';
    const a = ang == null ? Math.PI * 0.35 : ang;
    for (let i = 0; i < n; i++) {
      const px = x + dx * i + (ctx.rand() - 0.5) * 0.6, py = y + dy * i + (ctx.rand() - 0.5) * 0.6;
      const L = len * (0.7 + ctx.rand() * 0.5);
      s += ln(px, py, px + Math.cos(a) * L, py + Math.sin(a) * L, stroke, w);
    }
    return s;
  }
  // broken ground line centred on x at y, half-width hw
  function ground(ctx, x, y, hw, stroke, w) {
    let s = '';
    let cx = x - hw;
    while (cx < x + hw) {
      const L = hw * (0.25 + ctx.rand() * 0.4), gap = hw * (0.08 + ctx.rand() * 0.15);
      const e = Math.min(cx + L, x + hw);
      s += ln(cx, y + (ctx.rand() - 0.5) * 0.6, e, y + (ctx.rand() - 0.5) * 0.6, stroke, w);
      cx = e + gap;
    }
    return s;
  }
  function G(x, y, k, flip, inner) {
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(flip ? -k : k) + ' ' + f(k) + ')">' + inner + '</g>';
  }

  window.MRI_MOTIFS = Object.assign(window.MRI_MOTIFS || {}, {

    // ---- crevasseField: ~50x30 area of transverse crevasses on ice ----------
    // opts.w / opts.h override footprint (default 50 x 30)
    crevasseField(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const W = o.w || 50, H = o.h || 30;
      let s = '';
      // soft ice body (irregular blob), very light, with a soft edge line
      const body = [];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        body.push([Math.cos(a) * W / 2 * (0.85 + r() * 0.25), -H / 2 + Math.sin(a) * H / 2 * (0.8 + r() * 0.3)]);
      }
      s += fillPath(Q(body, true), S.ice, 'none', 0, ' fill-opacity="0.4"');
      // transverse crevasses: each is a lens (two bowed lines meeting at tapered ends),
      // the lower edge drawn heavier like a shadowed lip; lengths vary, some broken
      const n = 6;
      for (let i = 0; i < n; i++) {
        const yy = -H + 4 + (i + 0.5) * (H - 7) / n + (r() - 0.5) * 2;
        const half = W / 2 * (0.35 + r() * 0.5) * (1 - Math.abs(yy + H / 2) / H * 0.7);
        const sag = 1.2 + r() * 1.8, x0 = (r() - 0.5) * 8, gapW = 0.5 + r() * 0.8;
        const up = wob(r, [[x0 - half, yy], [x0 - half * 0.5, yy + sag * 0.6], [x0, yy + sag * 0.8], [x0 + half * 0.5, yy + sag * 0.6], [x0 + half, yy]], 0.5);
        const lo = up.map((p, j) => [p[0], p[1] + (j === 0 || j === 4 ? 0 : gapW + r() * 0.4)]);
        s += fillPath(Q(up, false) + ' ' + Q(lo.slice().reverse()).replace('M', 'L') + ' Z', S.iceLine, 'none', 0, ' fill-opacity="0.35"');
        s += path(Q(up), S.iceLine, 0.5);
        s += path(Q(lo), S.iceLine, 0.8);
      }
      // small secondary cracks and a few shadow dashes on the lower (right) side
      for (let i = 0; i < 4; i++) {
        const px = (r() - 0.5) * W * 0.8, py = -H * 0.2 - r() * H * 0.6;
        s += ln(px, py, px + 2 + r() * 3, py + (r() - 0.5) * 1.5, S.iceLine, 0.5);
      }
      for (let i = 0; i < 5; i++) {
        const px = W * 0.12 + r() * W * 0.3, py = -H * 0.15 - r() * H * 0.5;
        s += ln(px, py, px + 1.2, py + 1.6, S.iceLine, 0.45, ' opacity="0.6"');
      }
      return G(x, y, k, o.flip, s);
    },

    // ---- seracCliff: ice cliff with blocky seracs ----------------------------
    seracCliff(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      let s = '';
      // cliff face: one mass rising from the left, broken top edge, seracs as leaning
      // towers separated by deep vertical clefts; the face is in light, clefts shaded
      const top = wob(r, [[-26, -10], [-23, -20], [-18, -19], [-15, -24], [-9, -23], [-6, -26], [0, -25], [2, -20], [7, -21], [10, -17], [14, -18], [18, -12], [22, -8]], 0.8);
      const face = top.concat([[24, 0], [-28, 0]]);
      s += fillPath(P(face, true), S.paperHigh, 'none', 0);
      // ice tint on the lower third of the face (old dense ice)
      s += fillPath(P([[-27, -5], [23, -3], [24, 0], [-28, 0]], true), S.ice, 'none', 0, ' fill-opacity="0.7"');
      s += path(P(top), S.ink, 1.0);
      s += ln(-26, -10, -28, 0, S.ink, 0.9);
      s += ln(22, -8, 24, 0, S.ink, 0.9);
      // clefts between seracs: slightly leaning lines from the notches downward, not reaching the foot
      const clefts = [[-20, -19, -19, -4], [-12, -22, -11.5, -8], [-3, -23, -4, -3], [4, -20, 5, -9], [12, -17, 13, -5]];
      clefts.forEach(c => {
        s += path(Q(wob(r, [[c[0], c[1]], [(c[0] + c[2]) / 2 + (r() - 0.5) * 1.5, (c[1] + c[3]) / 2], [c[2], c[3]]], 0.5)), S.ink, 0.8);
        // shade the right wall of each cleft with short ice-blue hatches
        for (let i = 0; i < 4; i++) {
          const t = (i + 0.5) / 4, px = c[0] + (c[2] - c[0]) * t + 0.4, py = c[1] + (c[3] - c[1]) * t;
          s += ln(px, py, px + 1.6 + r(), py + 0.8, S.iceLine, 0.5);
        }
      });
      // horizontal ice banding (foliation) across the face, broken and faint
      for (let i = 0; i < 4; i++) {
        const yy = -16 + i * 3.6;
        s += path(Q(wob(r, [[-24 + r() * 4, yy], [-14, yy + 0.6], [-2, yy - 0.3], [10, yy + 0.5], [18 - r() * 4, yy]], 0.5)), S.iceLine, 0.45, ' stroke-dasharray="3 2"');
      }
      // one block toppling from the top-right notch, plus fallen blocks at the foot
      s += fillPath(P(wob(r, [[15, -21], [20, -23], [22, -18], [17, -16]], 0.4), true), S.paperHigh, S.ink, 0.8);
      s += stone(ctx, 27, 1, 2.4, S.ink, 0.7, S.paperHigh);
      s += stone(ctx, 31, 2.5, 1.4, S.ink, 0.6, S.paperHigh);
      s += stone(ctx, -31, 1.5, 1.6, S.ink, 0.6, S.paperHigh);
      s += hatch(ctx, 25, 4, 2, 0.3, 4, 1.4, S.inkSoft, 0.45, 0.2);
      s += ground(ctx, 0, 3, 34, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- moraineRidge: ridge of rubble with stones ---------------------------
    // opts.w footprint width (default 50)
    moraineRidge(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const W = o.w || 50, H = 11;
      let s = '';
      // crest line, slightly asymmetric (steeper on the right/shaded side)
      const crest = [];
      for (let i = 0; i <= 10; i++) {
        const t = i / 10, px = -W / 2 + t * W;
        const env = Math.sin(t * Math.PI);
        crest.push([px, -H * Math.pow(env, 0.8) + (r() - 0.5) * 1.4]);
      }
      s += fillPath(Q(crest, false) + ' L' + f(W / 2) + ' 0 L' + f(-W / 2) + ' 0 Z', ctx.MIX(S.paper, S.moraine, 0.18), 'none', 0);
      s += path(Q(crest), S.ink, 0.9);
      // right-flank hatching (light from upper left)
      for (let i = 0; i < 7; i++) {
        const t = 0.55 + i * 0.06, px = -W / 2 + t * W, top = -H * Math.pow(Math.sin(t * Math.PI), 0.8) + 1;
        s += ln(px + (r() - 0.5), top, px + 1.5 + r(), top + (0 - top) * (0.5 + r() * 0.4), S.moraine, 0.5);
      }
      // stones scattered over the ridge, bigger at the foot
      for (let i = 0; i < 11; i++) {
        const t = r(), px = -W / 2 + t * W * 0.96 + 1;
        const top = -H * Math.pow(Math.sin(t * Math.PI), 0.8);
        const py = top + r() * (0 - top) * 0.9;
        const rr = 0.8 + r() * 1.4 * (0.4 + (py - top) / (0.1 - top));
        s += stone(ctx, px, py, rr, S.ink, 0.55, r() > 0.5 ? S.paper : 'none');
      }
      // fine rubble dots
      for (let i = 0; i < 9; i++) {
        const t = r(), px = -W / 2 + t * W, top = -H * Math.pow(Math.sin(t * Math.PI), 0.8);
        s += dot(px, top + r() * (0 - top), 0.35, S.moraine);
      }
      s += ground(ctx, 0, 1, W / 2 + 3, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- rockGlacier: lobes with concentric furrows -------------------------
    rockGlacier(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      let s = '';
      // tongue outline: comes from upper left, bulges to a steep front at lower right
      const outline = wob(r, [[-26, -22], [-18, -24], [-8, -22], [2, -18], [12, -12], [20, -5], [22, 1], [16, 3], [4, 3], [-8, 1], [-18, -4], [-26, -10], [-28, -16]], 1.2);
      s += fillPath(Q(outline, true), ctx.MIX(S.paper, S.moraine, 0.14), 'none', 0);
      // front/side margin drawn heavy (the steep front), upstream edge left open and faint
      s += path(Q(outline.slice(2, 11)), S.ink, 0.9);
      s += path(Q(outline.slice(10).concat(outline.slice(0, 3))), S.inkSoft, 0.45, ' stroke-dasharray="2 2"');
      // concentric furrow-and-ridge arcs bowing toward the front (down-right)
      for (let i = 0; i < 6; i++) {
        const t = i / 6, cx = -18 + t * 24, cy = -18 + t * 14;
        const span = 10 + t * 7;
        const pts = [];
        for (let j = 0; j <= 6; j++) {
          const a = -1.9 + (j / 6) * 2.6;   // arc facing down-right
          pts.push([cx + Math.cos(a + 0.7) * span + (r() - 0.5) * 1.2, cy + Math.sin(a + 0.7) * span * 0.55 + (r() - 0.5) * 1.2]);
        }
        s += path(Q(pts), S.moraine, 0.6 + r() * 0.3);
      }
      // steep front: hatching under the lip
      for (let i = 0; i < 8; i++) {
        const t = i / 8, px = 4 + t * 17, py = 3 - t * 7;
        s += ln(px + (r() - 0.5), py, px + 1.5, py + 3 + r() * 1.5, S.ink, 0.5);
      }
      // a few surface boulders
      for (let i = 0; i < 7; i++) {
        s += stone(ctx, -20 + r() * 36, -20 + r() * 18, 0.7 + r() * 0.9, S.ink, 0.5, 'none');
      }
      s += ground(ctx, 2, 5, 26, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- thawSlump: scar with slumped toe and small pond --------------------
    thawSlump(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      let s = '';
      // headwall: arcuate scarp, ink, with short hatches hanging from it
      const head = wob(r, [[-20, -12], [-14, -18], [-4, -21], [6, -20], [14, -16], [18, -10]], 1);
      s += path(Q(head), S.ink, 1.0);
      for (let i = 1; i < head.length - 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const px = head[i][0] + j * 2.5, py = head[i][1] + 1 + Math.abs(j) * 0.5;
          s += ln(px, py, px + 0.6 + (r() - 0.5), py + 2.5 + r() * 1.5, S.ink, 0.5);
        }
      }
      // ice-rich exposed face band (ice tint) just below the headwall
      const band = head.map(p => [p[0] * 0.85, p[1] + 5]);
      s += fillPath(Q(head.concat(band.slice().reverse()), true), S.ice, 'none', 0, ' fill-opacity="0.8"');
      // slumped toe: lumpy lobes of mud below, sagging down-right
      const toe = wob(r, [[-19, -7], [-14, -10], [-8, -9.5], [-1, -10.5], [6, -9.5], [13, -10], [19, -7], [22, -2], [19, 1.5], [10, 2.5], [0, 3], [-10, 2], [-18, 0.5], [-21, -3]], 0.8);
      s += fillPath(Q(toe, true), ctx.MIX(S.paper, S.moraine, 0.2), 'none', 0);
      s += path(Q(toe.slice(6, 13)), S.moraine, 0.65);
      // lobe bulges on the toe front
      [[-14, -2, 6], [-2, 0, 7], [10, -1, 6]].forEach(L => {
        const pts = [];
        for (let i = 0; i <= 6; i++) {
          const a = Math.PI + (i / 6) * Math.PI;
          pts.push([L[0] + Math.cos(a) * L[2] + (r() - 0.5), L[1] + Math.sin(a) * L[2] * 0.4 + (r() - 0.5)]);
        }
        s += path(Q(pts), S.moraine, 0.55);
      });
      // flow wrinkles across the toe
      for (let i = 0; i < 4; i++) {
        const px = -12 + i * 7, py = -4 + r() * 2;
        s += path(Q(wob(r, [[px, py], [px + 3, py + 1], [px + 6, py]], 0.6)), S.moraine, 0.5);
      }
      // small pond at the toe, lower right
      const pond = wob(r, [[10, 1], [16, 0], [22, 1.5], [21, 4], [14, 5], [9, 3.5]], 0.8);
      s += fillPath(Q(pond, true), S.waterPale, S.water, 0.6);
      s += ln(13, 2.5, 18, 2.2, S.water, 0.45);
      s += ground(ctx, -4, 5, 22, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- avalancheTrack: fracture line, fan of debris, snow blocks ----------
    avalancheTrack(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      let s = '';
      // snow ground (wide soft wedge)
      s += fillPath(P([[-30, 2], [-14, -32], [8, -32], [30, 2]], true), S.paperHigh, 'none', 0);
      // crown fracture line at top: jagged bold ink with shadow hatching below
      const crown = wob(r, [[-14, -28], [-10, -29], [-6, -28.5], [-1, -29.5], [3, -29], [7, -30]], 0.5);
      s += path(Q(crown), S.ink, 1.1);
      s += path(Q(crown.map(p => [p[0] + 0.3, p[1] + 1.3])), S.iceLine, 0.5);
      for (let i = 0; i < 8; i++) {
        const px = -13 + i * 2.7 + (r() - 0.5);
        s += ln(px, -28.5 + (r() - 0.5), px + 0.4, -26 + r() * 1.5, S.ink, 0.5);
      }
      // flank lines of the track opening downward (hairline, dashed feel)
      s += path(Q(wob(r, [[-14, -27], [-18, -16], [-24, -6], [-28, 0]], 1)), S.inkSoft, 0.55);
      s += path(Q(wob(r, [[7, -29], [12, -18], [18, -8], [24, 0]], 1)), S.inkSoft, 0.55);
      // flow lines in the fan
      for (let i = 0; i < 5; i++) {
        const t = (i + 0.5) / 5, tx = -22 + t * 44;
        s += path(Q(wob(r, [[-4 + (tx + 4) * 0.2, -22], [(tx) * 0.55, -12], [tx, -2]], 1.5)), S.inkSoft, 0.45, ' stroke-dasharray="2.5 1.8"');
      }
      // debris: snow blocks of various sizes, heavier toward the bottom
      for (let i = 0; i < 12; i++) {
        const t = r(), px = (r() - 0.5) * (14 + t * 38), py = -20 + t * 20;
        const rr = 0.8 + t * 1.6 * r() + 0.4;
        s += stone(ctx, px, py, rr, S.ink, 0.6, S.paperHigh);
      }
      // a few larger blocks at the toe with a shaded side
      [[-12, 0, 2.4], [4, 0.5, 2.8], [18, -0.5, 2.0]].forEach(b => {
        s += stone(ctx, b[0], b[1], b[2], S.ink, 0.7, S.paperHigh);
        s += hatch(ctx, b[0] + b[2] * 0.3, b[1] - 0.5, 0.7, 0.3, 3, 1.4, S.inkSoft, 0.45, 1.1);
      });
      s += ground(ctx, 0, 3, 30, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- cornice: overhanging snow lip on a ridge ---------------------------
    cornice(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      let s = '';
      // rock ridge: gentle windward slope from the left, steep lee face dropping right
      const rock = wob(r, [[-32, 0], [-22, -6], [-12, -11], [-4, -14], [0, -15], [3, -12], [6, -6], [9, 0]], 0.6);
      s += fillPath(Q(rock, false) + ' Z', S.stone, 'none', 0, ' fill-opacity="0.3"');
      s += path(Q(rock), S.ink, 0.9);
      // lee-face hatch (shaded, steep)
      for (let i = 0; i < 6; i++) {
        const t = i / 6, px = 1 + t * 7, py = -13 + t * 12;
        s += ln(px + (r() - 0.5) * 0.6, py, px + 2.2 + r(), py + 2.5, S.ink, 0.5);
      }
      // snow slab: thick on the windward side, sweeping over the crest into a lip
      // that overhangs the lee face; drawn as one closed profile
      const snowTop = wob(r, [[-32, -1], [-23, -7.5], [-14, -13], [-6, -17], [0, -19.5], [6, -20.5], [11, -20], [14, -18], [14.5, -15.5], [12, -14]], 0.5);
      const snowUnder = wob(r, [[9, -13.5], [6, -14], [3, -13.5]], 0.3);
      const prof = snowTop.concat(snowUnder, [[0, -15], [-4, -14], [-12, -11], [-22, -6], [-32, 0]]);
      s += fillPath(Q(prof, true), S.paperHigh, 'none', 0);
      s += path(Q(snowTop.concat(snowUnder)), S.ink, 0.9);
      // shadow under the lip: ice-blue hatching on the underside
      for (let i = 0; i < 7; i++) {
        const px = 3.5 + i * 1.6, py = -13.6 - i * 0.25;
        s += ln(px, py, px + 1.0, py + 2.0 + r() * 0.8, S.iceLine, 0.5);
      }
      // wind striae on the slab (diagonal, light)
      for (let i = 0; i < 5; i++) {
        const t = i / 5, px = -27 + t * 22, py = -4 - t * 12;
        s += ln(px + (r() - 0.5), py + (r() - 0.5), px + 4, py - 2.5, S.inkSoft, 0.45);
      }
      // tension crack behind the lip, and a few flakes blown off
      s += path(Q(wob(r, [[3, -20], [3.5, -18], [2.5, -16.5]], 0.4)), S.iceLine, 0.6);
      for (let i = 0; i < 6; i++) s += dot(15 + r() * 9, -21 + r() * 8, 0.3 + r() * 0.2, S.inkSoft);
      s += ground(ctx, -8, 1.2, 26, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- snowPit: dug pit in section showing snow layers --------------------
    snowPit(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      let s = '';
      const W = 18, D = 20;
      // snow surface line either side
      s += path(Q(wob(r, [[-30, -D], [-22, -D - 0.5], [-W / 2, -D]], 0.5)), S.ink, 0.8);
      s += path(Q(wob(r, [[W / 2, -D], [22, -D + 0.6], [30, -D - 0.3]], 0.5)), S.ink, 0.8);
      // pit: open rectangle, back wall visible (section face)
      const face = [[-W / 2, -D], [W / 2, -D + (r() - 0.5) * 0.6], [W / 2 + 0.4, 0], [-W / 2 - 0.3, 0.3]];
      s += fillPath(P(face, true), S.paperHigh, S.ink, 0.9);
      // layers: alternating lines; a thick crust (double line), a depth-hoar band (dots)
      const layers = [-16.5, -13, -11.8, -8.5, -5, -2.5];
      layers.forEach((ly, i) => {
        const pts = wob(r, [[-W / 2 + 0.5, ly], [-3, ly], [3, ly], [W / 2 - 0.5, ly]], 0.6);
        s += path(Q(pts), i === 2 ? S.ink : S.iceLine, i === 2 ? 0.8 : 0.55);
      });
      // depth hoar: loose dotted band near the base
      for (let i = 0; i < 14; i++) s += dot(-W / 2 + 1.5 + r() * (W - 3), -4.3 + r() * 1.8, 0.3, S.iceLine);
      // wind slab: faint hatch in top layer
      s += hatch(ctx, -W / 2 + 1.5, -D + 1.2, 2.6, 0, 6, 1.6, S.iceLine, 0.45, 1.1);
      // shade on the right pit wall (interior shadow)
      s += fillPath(P([[W / 2 - 2.5, -D + 0.3], [W / 2, -D], [W / 2 + 0.4, 0], [W / 2 - 2.5, 0]], true), S.shade, 'none', 0, ' fill-opacity="0.08"');
      // spoil pile on the right (dug-out snow), lumpy
      const pile = wob(r, [[W / 2 + 1, -D], [W / 2 + 5, -D - 3], [W / 2 + 11, -D - 3.5], [W / 2 + 15, -D - 1], [W / 2 + 16, -D + 0.3]], 0.6);
      s += fillPath(Q(pile, false) + ' Z', S.paperHigh, S.ink, 0.7);
      // surveyor's red: a measuring tape/rule hanging down the face
      s += ln(-W / 2 + 2.5, -D + 0.5, -W / 2 + 2.5, -0.8, S.red, 0.6);
      for (let i = 0; i < 5; i++) s += ln(-W / 2 + 2.5, -D + 2 + i * 4, -W / 2 + 4, -D + 2 + i * 4, S.red, 0.5);
      // shovel lying on the surface at the left: shaft with a T-handle, rounded blade
      s += ln(-W / 2 - 4, -D - 1.5, -W / 2 - 17, -D - 2.5, S.ink, 0.7);
      s += ln(-W / 2 - 17, -D - 4, -W / 2 - 17.3, -D - 1, S.ink, 0.7);
      s += fillPath(Q(wob(r, [[-W / 2 - 4, -D - 3.5], [-W / 2 - 0.5, -D - 3.2], [0.5 - W / 2, -D - 1], [-W / 2 - 1, -D + 0.3], [-W / 2 - 4, -D + 0.2]], 0.3), true), S.paper, S.ink, 0.7);
      s += ground(ctx, 0, 1, 30, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- debrisFlow: mud tongue with boulders in a channel, levees either side
    debrisFlow(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      let s = '';
      // channel comes down from the upper left with a bend, and spreads into a lobate tongue
      const left = wob(r, [[-22, -32], [-17, -24], [-13, -16], [-12, -9], [-16, -3], [-22, 1]], 0.8);
      const right = wob(r, [[-9, -33], [-6, -25], [-3, -17], [2, -10], [12, -4], [20, 1]], 0.8);
      s += fillPath(Q(left, false) + ' L' + f(-16) + ' 4 L' + f(14) + ' 4 ' + Q(right.slice().reverse()).replace('M', 'L') + ' Z', ctx.MIX(S.paper, S.moraine, 0.26), 'none', 0);
      // channel banks (ink) and the levee crests just outside them (moraine), rubble on the levees
      s += path(Q(left), S.ink, 0.8);
      s += path(Q(right), S.ink, 0.8);
      s += path(Q(left.slice(0, 5).map(p => [p[0] - 2.4 + (r() - 0.5) * 0.6, p[1] + 0.4])), S.moraine, 0.6);
      s += path(Q(right.slice(0, 5).map(p => [p[0] + 2.4 + (r() - 0.5) * 0.6, p[1] + 0.4])), S.moraine, 0.6);
      for (let i = 0; i < 12; i++) {
        const L = i < 6, side = L ? left : right, p = side[i % 5], dir = L ? -1 : 1;
        s += stone(ctx, p[0] + dir * (1 + r() * 2.4), p[1] + (r() - 0.5) * 4, 0.5 + r() * 0.6, S.ink, 0.5, 'none');
      }
      // levee hatching on the outer (shaded) slopes
      for (let i = 0; i < 5; i++) {
        const p = right[i]; s += ln(p[0] + 2.6, p[1] + 0.6, p[0] + 4 + r(), p[1] + 2.2, S.moraine, 0.5);
      }
      // flow lines inside the tongue, following the bend
      for (let i = 0; i < 3; i++) {
        const t = (i + 1) / 4;
        const pts = left.slice(0, 5).map((p, j) => [p[0] + (right[j][0] - p[0]) * t + (r() - 0.5) * 1.2, p[1] + (right[j][1] - p[1]) * t]);
        s += path(Q(pts), S.moraine, 0.5, ' stroke-dasharray="3 2"');
      }
      // boulders carried in the flow, biggest at the snout
      [[-14, -27, 1.1], [-10, -19, 1.3], [-5, -12, 1.5], [4, -7, 1.7], [-9, -3, 1.6], [8, -1, 2.3], [-3, 2, 2.6], [14, 2, 1.9], [-16, 2.5, 1.4]].forEach(b => {
        s += stone(ctx, b[0], b[1], b[2], S.ink, 0.6, S.paper);
      });
      // snout: lobate front line with a thicker shaded edge
      s += path(Q(wob(r, [[-22, 1], [-17, 4.5], [-6, 5.5], [6, 5.5], [16, 4], [20, 1]], 0.7)), S.ink, 1.0);
      s += hatch(ctx, -14, 5.8, 4.2, 0, 8, 1.6, S.moraine, 0.5, 1.3);
      s += ground(ctx, 0, 8.5, 26, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- landslideScar: arcuate scar with displaced mass below --------------
    landslideScar(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      let s = '';
      // hillside contour lines (faint) to set the slope
      for (let i = 0; i < 3; i++) {
        const yy = -26 + i * 5;
        s += path(Q(wob(r, [[-30, yy + 4], [-22, yy], [-14, yy - 1], [-6, yy - 1], [2, yy + 1], [12, yy + 4]], 0.8)), S.inkSoft, 0.45, ' opacity="0.7"');
      }
      // main scarp: arcuate, bold, with hatching hanging down from it (hachures)
      const scarp = wob(r, [[-22, -8], [-20, -15], [-14, -21], [-6, -24], [4, -23], [12, -19], [16, -12]], 0.8);
      s += path(Q(scarp), S.ink, 1.1);
      for (let i = 0; i < scarp.length; i++) {
        for (let j = 0; j < 2; j++) {
          const p = scarp[i], nx = p[0] + (j ? 2 : 0) + (r() - 0.5), ny = p[1] + 1 + (j ? 0.6 : 0);
          // hachures point inward/downslope toward the body
          const cx = -4, cy = -10, ang = Math.atan2(cy - ny, cx - nx);
          const L = 2.5 + r() * 2;
          s += ln(nx, ny, nx + Math.cos(ang) * L, ny + Math.sin(ang) * L, S.ink, 0.5);
        }
      }
      // displaced mass: hummocky body sliding down-right, back-tilted blocks
      const mass = wob(r, [[-18, -6], [-12, -9], [-4, -10], [6, -9], [14, -7], [22, -2], [20, 3], [8, 5], [-6, 4], [-16, 1]], 1);
      s += fillPath(Q(mass, true), ctx.MIX(S.paper, S.moraine, 0.16), S.ink, 0.8);
      // minor scarps/cracks across the mass (transverse ridges)
      for (let i = 0; i < 4; i++) {
        const px = -12 + i * 7, py = -6 + i * 1.4;
        s += path(Q(wob(r, [[px, py], [px + 3, py - 2], [px + 7, py - 1]], 0.8)), S.moraine, 0.6);
      }
      // hummocky toe with small stones and a bulged toe line
      s += path(Q(wob(r, [[-14, 2], [-4, 6], [8, 7], [20, 4]], 0.8)), S.ink, 0.9);
      for (let i = 0; i < 6; i++) s += stone(ctx, -10 + r() * 28, -5 + r() * 9, 0.6 + r() * 0.8, S.ink, 0.5, 'none');
      s += ground(ctx, 4, 9, 26, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- rockfallBoulders: boulders at a cliff foot with dotted fall path ---
    // opts.count number of boulders (3..6, default 5)
    rockfallBoulders(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const n = Math.max(3, Math.min(6, o.count || 5));
      let s = '';
      // cliff at the left: tall vertical rock face with hachure
      const cliff = wob(r, [[-26, -36], [-22, -30], [-24, -22], [-21, -14], [-23, -6], [-20, 0]], 1);
      s += path(Q(cliff), S.ink, 1.0);
      s += fillPath(Q(cliff, false) + ' L-30 0 L-30 -36 Z', S.stone, 'none', 0, ' fill-opacity="0.35"');
      for (let i = 0; i < 8; i++) {
        const t = i / 8, py = -34 + t * 32;
        s += ln(-29 + r(), py, -25 + r() * 2, py + 2 + r() * 2, S.ink, 0.5);
      }
      // release niche: a small notch at the top with a fresh (paper-highlight) scar
      s += fillPath(P(wob(r, [[-24, -30], [-20, -27], [-22, -24], [-25, -26]], 0.4), true), S.paperHigh, S.ink, 0.6);
      // dotted fall path, bouncing out from the cliff to the far boulder
      const trail = [[-21, -27], [-17, -18], [-12, -10], [-6, -5], [2, -2], [10, -1], [18, -0.5]];
      for (let i = 0; i < trail.length; i++) {
        // short dot-dash segments
        const a = trail[i], b = trail[Math.min(i + 1, trail.length - 1)];
        for (let j = 0; j < 3; j++) {
          const t = j / 3;
          s += dot(a[0] + (b[0] - a[0]) * t + (r() - 0.5) * 0.5, a[1] + (b[1] - a[1]) * t + (r() - 0.5) * 0.5, 0.4, S.inkSoft);
        }
      }
      // impact marks: little V dents along the path
      [[-12, -9], [2, -1]].forEach(p => {
        s += ln(p[0] - 1.2, p[1] + 1.4, p[0], p[1] + 0.2, S.inkSoft, 0.5);
        s += ln(p[0], p[1] + 0.2, p[0] + 1.3, p[1] + 1.4, S.inkSoft, 0.5);
      });
      // boulders: sizes decreasing away from... actually biggest travels furthest
      const sizes = [1.6, 2.2, 3.0, 2.6, 3.6, 4.2].slice(0, n);
      const xs = [-14, -8, -1, 7, 15, 23];
      for (let i = 0; i < n; i++) {
        const bx = xs[i] + (r() - 0.5) * 2, rr = sizes[i];
        s += stone(ctx, bx, -rr * 0.45, rr, S.ink, 0.8, S.paper);
        // shaded right side
        s += hatch(ctx, bx + rr * 0.25, -rr * 0.9, rr * 0.28, rr * 0.12, 3, rr * 0.7, S.ink, 0.45, 1.2);
        // a tiny shadow under each on the right
        s += ln(bx - rr * 0.2, rr * 0.35, bx + rr * 0.9, rr * 0.4, S.ink, 0.5);
      }
      // small chips
      for (let i = 0; i < 6; i++) s += dot(-16 + r() * 40, 0.2 + r() * 1.5, 0.35, S.ink);
      s += ground(ctx, 2, 2, 28, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- floodWave: river section with a raised surge and splashes ---------
    // opts.w footprint width (default 56)
    floodWave(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const W = o.w || 56;
      let s = '';
      // banks: left bank low, right bank with a bit of a terrace
      s += path(Q(wob(r, [[-W / 2, -4], [-W / 2 + 8, -3], [-W / 2 + 14, -1]], 0.5)), S.ink, 0.8);
      s += path(Q(wob(r, [[W / 2 - 14, -1], [W / 2 - 8, -3], [W / 2, -5]], 0.5)), S.ink, 0.8);
      // water body: surface rising to a surge crest at about 1/3 from the left, bore face steep on the right
      const surf = wob(r, [[-W / 2 + 14, -1], [-W / 2 + 20, -2], [-W / 2 + 25, -6], [-W / 2 + 29, -11], [-W / 2 + 33, -12.5], [-W / 2 + 36, -10], [-W / 2 + 38, -5], [-W / 2 + 44, -2], [W / 2 - 14, -1]], 0.7);
      s += fillPath(Q(surf, false) + ' L' + f(W / 2 - 14) + ' 1 L' + f(-W / 2 + 14) + ' 1 Z', S.waterPale, 'none', 0);
      s += path(Q(surf), S.water, 0.9);
      // turbulent lines inside the surge
      for (let i = 0; i < 5; i++) {
        const px = -W / 2 + 18 + i * 5, py = -3 - i * 1.2;
        s += path(Q(wob(r, [[px, py], [px + 2.5, py - 1.5], [px + 5, py - 0.5]], 0.7)), S.water, 0.5);
      }
      // breaking crest: curl-over stroke and spray dots
      s += path(Q(wob(r, [[-W / 2 + 31, -12.5], [-W / 2 + 35, -14], [-W / 2 + 38, -12], [-W / 2 + 37, -9]], 0.5)), S.water, 0.8);
      for (let i = 0; i < 9; i++) s += dot(-W / 2 + 30 + r() * 12, -14 - r() * 6, 0.3 + r() * 0.3, S.water);
      for (let i = 0; i < 4; i++) {
        const px = -W / 2 + 34 + r() * 6, py = -13 - r() * 3;
        s += ln(px, py, px + 1 + r(), py - 2 - r() * 1.5, S.water, 0.5);
      }
      // debris carried: a log and a boulder in the surge face
      s += ln(-W / 2 + 36, -7, -W / 2 + 41, -4.5, S.ink, 0.9);
      s += stone(ctx, -W / 2 + 27, -5, 1.3, S.ink, 0.6, S.paper);
      // calmer water lines downstream right
      for (let i = 0; i < 3; i++) {
        const px = -W / 2 + 42 + i * 4, py = -1.5 - r();
        s += ln(px, py, px + 2.5 + r() * 2, py, S.water, 0.5);
      }
      s += ground(ctx, 0, 1.5, W / 2 + 2, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- glacialLake: lake dammed by a moraine, breach starting ------------
    glacialLake(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      let s = '';
      // glacier snout at the back (top-left): ice tint with a couple of crevasse lines
      const snout = wob(r, [[-30, -30], [-16, -33], [-2, -31], [4, -26], [-2, -22], [-14, -21], [-28, -24]], 1);
      s += fillPath(Q(snout, true), S.paperHigh, S.ink, 0.7);
      s += fillPath(Q(snout.slice(2, 6), false) + ' Z', S.ice, 'none', 0, ' fill-opacity="0.7"');
      s += path(Q(wob(r, [[-22, -29], [-14, -28], [-8, -29]], 0.5)), S.iceLine, 0.5);
      s += path(Q(wob(r, [[-20, -25], [-12, -24]], 0.5)), S.iceLine, 0.5);
      // lake body: between snout and the moraine dam
      const lake = wob(r, [[-26, -23], [-14, -21], [-2, -22], [8, -19], [14, -13], [12, -7], [2, -6], [-10, -7], [-20, -10], [-26, -16]], 1);
      s += fillPath(Q(lake, true), S.waterPale, S.water, 0.55);
      for (let i = 0; i < 4; i++) {
        const px = -18 + r() * 26, py = -19 + r() * 10;
        s += ln(px, py, px + 2 + r() * 3, py, S.water, 0.45);
      }
      // moraine dam: arc of rubble ridge across the front, stones
      const dam = wob(r, [[-24, -8], [-16, -4], [-6, -2], [6, -2], [16, -5], [22, -10]], 0.8);
      s += fillPath(Q(dam, false) + ' L22 -4 L14 0 L0 3 L-16 1 L-26 -4 Z', ctx.MIX(S.paper, S.moraine, 0.2), 'none', 0);
      s += path(Q(dam), S.ink, 1.0);
      for (let i = 0; i < 9; i++) s += stone(ctx, -20 + r() * 40, -6 + r() * 6, 0.6 + r() * 0.9, S.ink, 0.5, 'none');
      // the breach: a notch in the dam at the right, with water pouring through
      s += fillPath(P(wob(r, [[8, -2.5], [13, -3.5], [14, 1], [10, 1.5]], 0.4), true), S.paper, 'none', 0);
      s += path(P(wob(r, [[8, -2.5], [9.5, 0.5]], 0.3)), S.ink, 0.9);
      s += path(P(wob(r, [[13, -3.5], [14.2, 0.8]], 0.3)), S.ink, 0.9);
      s += path(Q(wob(r, [[10, -4], [11, 0], [11.5, 4], [13, 8], [16, 12]], 0.6)), S.water, 0.9);
      s += path(Q(wob(r, [[12, -3], [12.8, 1], [13.8, 5], [15.5, 9]], 0.5)), S.water, 0.55);
      for (let i = 0; i < 6; i++) s += dot(12 + r() * 6, 2 + r() * 9, 0.3, S.water);
      // surveyor's red: a stake pair marking the lake level
      s += ln(-24, -13, -24, -19, S.red, 0.6);
      s += fillPath(P([[-24, -19], [-21, -18], [-24, -17]], true), S.red, 'none', 0);
      s += ground(ctx, -4, 5, 26, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- icicles: under a rock lip -----------------------------------------
    icicles(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      let s = '';
      // rock lip: overhang from upper left, heavy contour, hatched underside
      const lip = wob(r, [[-22, -22], [-14, -20], [-4, -19], [6, -18.5], [14, -19], [18, -17]], 0.6);
      s += fillPath(Q(lip, false) + ' L18 -24 L-22 -26 Z', S.stone, 'none', 0, ' fill-opacity="0.45"');
      s += path(Q(lip), S.ink, 1.0);
      s += path(Q(wob(r, [[-22, -26], [-10, -25], [4, -24.5], [18, -24]], 0.6)), S.ink, 0.7);
      s += hatch(ctx, -18, -24, 3.2, 0.1, 11, 2.8, S.ink, 0.45, 0.9);
      // icicles: tapered spikes of different lengths, ice tinted, blue outline
      const xs = [-18, -14, -11, -7, -4, 0, 3, 7, 10, 14];
      xs.forEach((ix, i) => {
        const top = -19 + (i % 3) * 0.3, L = 4 + r() * 12, w = 0.8 + r() * 1.1;
        const px = ix + (r() - 0.5) * 1.2;
        const pts = [[px - w, top], [px + w * 0.9, top], [px + w * 0.2 + (r() - 0.5) * 0.6, top + L]];
        s += fillPath(Q([pts[0], [px + w, top + L * 0.3], pts[2], [px - w * 0.9, top + L * 0.35], pts[0]], true), S.ice, S.iceLine, 0.55);
        // highlight stroke on the left side
        if (L > 7) s += ln(px - w * 0.5, top + 1.5, px - w * 0.35, top + L * 0.55, S.paperHigh, 0.5);
      });
      // drips: a drop or two falling, and small splash rings on the ground
      s += dot(1.5, -2, 0.45, S.water);
      s += dot(10, -6, 0.4, S.water);
      s += path(Q(wob(r, [[-2, 0.5], [1.5, -0.3], [5, 0.5]], 0.3)), S.water, 0.5);
      // ice crust on the ground below
      s += fillPath(Q(wob(r, [[-14, 1], [-4, -0.5], [8, -0.2], [16, 1], [8, 2.2], [-6, 2.3]], 0.5), true), S.ice, 'none', 0);
      s += ground(ctx, -2, 2.5, 22, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- frostCrackedRock: boulder split by frost ---------------------------
    frostCrackedRock(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      let s = '';
      // two halves leaning apart around a V-shaped crack
      const leftHalf = wob(r, [[-13, 0], [-14, -6], [-11, -12], [-5, -15], [-1.5, -12], [-2.5, -6], [-2, 0]], 0.6);
      const rightHalf = wob(r, [[0.5, 0], [0.5, -6], [0, -11], [3, -14], [9, -12], [13, -6], [12, 0]], 0.6);
      s += fillPath(Q(leftHalf, true), ctx.MIX(S.paper, S.stone, 0.35), S.ink, 0.9);
      s += fillPath(Q(rightHalf, true), ctx.MIX(S.paper, S.stone, 0.35), S.ink, 0.9);
      // fresh fracture faces (paperHigh, inside the crack) and ice wedge in it
      s += fillPath(P([[-2, -12], [-1, -3], [0, 0], [0.5, -6], [0.8, -11], [-0.5, -13]], true), S.ice, 'none', 0);
      s += path(Q(wob(r, [[-1, -13], [-1.5, -8], [-0.3, -3], [-0.8, 0]], 0.4)), S.iceLine, 0.6);
      // a secondary crack starting on the right half
      s += path(Q(wob(r, [[6, -12.5], [5, -8], [6.5, -4]], 0.4)), S.ink, 0.5);
      // shading on the right sides of each half
      s += hatch(ctx, 8, -11, 0.8, 1.6, 5, 2.6, S.ink, 0.5, 1.15);
      s += hatch(ctx, -5, -12, 0.6, 1.7, 4, 2.2, S.inkSoft, 0.45, 1.15);
      // lichen/texture dots on the weathered top-left
      for (let i = 0; i < 6; i++) s += dot(-11 + r() * 7, -13 + r() * 5, 0.3, S.inkSoft);
      // spalled chips around the base
      for (let i = 0; i < 5; i++) s += stone(ctx, -14 + r() * 30, 0.8 + r() * 1.2, 0.5 + r() * 0.6, S.ink, 0.5, 'none');
      s += ln(-14, 0.4, 14, 0.6, S.ink, 0.6, ' opacity="0.8"');
      s += ground(ctx, 0, 1.8, 19, S.inkSoft, 0.55);
      return G(x, y, k, o.flip, s);
    },

    // ---- permafrostBorehole: borehole + temperature cable + logger ----------
    // opts.depth visible section depth (default 28)
    permafrostBorehole(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const D = o.depth || 28;
      let s = '';
      // ground surface with a cut-away section window below (left edge of the block)
      s += path(Q(wob(r, [[-22, 0], [-10, -0.5], [4, 0.3], [18, 0]], 0.5)), S.ink, 0.9);
      // section: ragged-edged window showing the ground
      const win = wob(r, [[-12, 0], [12, 0], [12.5, D], [-12.5, D]], 0.8);
      s += fillPath(P(win, true), ctx.MIX(S.paper, S.moraine, 0.14), 'none', 0);
      s += path(P([win[0], win[3]]), S.inkSoft, 0.5, ' stroke-dasharray="1.5 2"');
      s += path(P([win[1], win[2]]), S.inkSoft, 0.5, ' stroke-dasharray="1.5 2"');
      s += path(Q(wob(r, [[-12.5, D], [-4, D + 0.5], [5, D - 0.4], [12.5, D]], 0.5)), S.inkSoft, 0.5, ' stroke-dasharray="1.5 2"');
      // active layer on top: dotted soil; permafrost below: ice-rich lenses (blue dashes)
      const al = 6;
      s += path(Q(wob(r, [[-12, al], [-4, al + 0.5], [5, al - 0.3], [12, al]], 0.6)), S.moraine, 0.6, ' stroke-dasharray="2 1.5"');
      for (let i = 0; i < 10; i++) s += dot(-11 + r() * 22, 0.8 + r() * (al - 1.5), 0.32, S.moraine);
      for (let i = 0; i < 9; i++) {
        const px = -11 + r() * 20, py = al + 2 + r() * (D - al - 3);
        s += ln(px, py, px + 1.5 + r() * 2.5, py + (r() - 0.5) * 0.5, S.iceLine, 0.55);
      }
      // a few stones in the section
      s += stone(ctx, -6, 12, 1.2, S.ink, 0.5, 'none');
      s += stone(ctx, 7, 20, 1.5, S.ink, 0.5, 'none');
      s += stone(ctx, -3, 24, 0.9, S.ink, 0.5, 'none');
      // borehole: narrow double line (casing) from surface to depth
      s += ln(-0.9, -1, -0.9, D - 1, S.ink, 0.6);
      s += ln(0.9, -1, 0.9, D - 1, S.ink, 0.6);
      s += fillPath(P([[-0.9, -1], [0.9, -1], [0.9, D - 1], [-0.9, D - 1]], true), S.paper, 'none', 0);
      // thermistor cable: red line down the hole with sensor ticks at intervals
      s += ln(0, -3, 0, D - 2.5, S.red, 0.55);
      for (let i = 1; i <= 6; i++) {
        const yy = -1 + i * (D - 2) / 6;
        s += ln(-0.9, yy, 0.9, yy, S.red, 0.7);
      }
      // logger box at the surface on a short post, cable up into it
      s += ln(0, -3, 4, -3, S.red, 0.55);
      s += ln(4, -3, 4, -9, S.red, 0.55);
      s += ln(4, 0, 4, -8, S.ink, 0.8);
      s += fillPath(P(wob(r, [[2, -13], [7.5, -13], [7.5, -8.5], [2, -8.5]], 0.3), true), S.paper, S.ink, 0.8);
      s += ln(3, -11, 6.5, -11, S.ink, 0.5);
      s += ln(3, -10, 5.5, -10, S.ink, 0.5);
      s += dot(6.5, -12, 0.35, S.blue);
      // cap / collar at the hole mouth
      s += ln(-2, -0.8, 2, -0.8, S.ink, 1.0);
      // surface stones
      s += stone(ctx, -8, -0.6, 1.1, S.ink, 0.55, S.paper);
      s += stone(ctx, 11, -0.4, 0.8, S.ink, 0.55, S.paper);
      s += ground(ctx, 0, D + 1.5, 15, S.inkSoft, 0.5);
      return G(x, y, k, o.flip, s);
    }
  });
})();
