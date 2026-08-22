// MRI survey-plate motifs — group: BUILDINGS AND INFRASTRUCTURE
// Ink-on-paper register. Every motif: (ctx, x, y, k, opts) -> svg string.
// (x,y) is the ground point the motif stands on; k is scale (adult ~22 units at k=1).
// Supported opts: flip (all); length (stoneWall, fenceLine); count (pylonLine, houseCluster).
(function () {
  // ---------- shared drawing kit ----------
  function kit(ctx, x, y, k, opts) {
    const S = ctx.S, rand = ctx.rand, MIX = ctx.MIX;
    const sx = (opts && opts.flip) ? -1 : 1;
    const f = n => (Math.round(n * 10) / 10).toFixed(1);
    const X = u => x + sx * u * k;
    const Y = v => y + v * k;
    const W = w => w * (0.75 + 0.25 * k);           // stroke weights grow gently with scale
    const j = a => (rand() * 2 - 1) * a;             // hand jitter
    const wall = MIX(S.paper, S.ink, 0.06);          // adjust wall tint here
    const base = (w, col) => `stroke="${col || S.ink}" stroke-width="${f(W(w))}" stroke-linecap="round" stroke-linejoin="round"`;
    // polyline / polygon in local units (v up is negative)
    const poly = (pts, w, col, fill, close, extra) => {
      let d = '';
      pts.forEach((p, i) => { d += (i ? 'L' : 'M') + f(X(p[0] + j(0.25))) + ' ' + f(Y(p[1] + j(0.25))); });
      if (close) d += 'Z';
      if (col === 'none') return `<path d="${d}" fill="${fill || 'none'}" stroke="none"${extra || ''}/>`;
      return `<path d="${d}" fill="${fill || 'none'}" ${base(w, col)}${extra || ''}/>`;
    };
    const line = (a, b, c, d2, w, col) => poly([[a, b], [c, d2]], w, col);
    // hatching inside a quad-ish area: a fan of short parallel strokes (light from upper-left → hatch right side)
    const hatch = (x0, y0, w, h, n, col, ang) => {
      let s = ''; const a = ang === undefined ? 0.6 : ang;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const px = x0 + w * t + j(0.4), py = y0 + j(0.3);
        s += line(px, py, px - a * h, py + h, 0.45, col || S.inkSoft);
      }
      return s;
    };
    // broken ground line with a few stones
    const ground = (half, stones) => {
      let s = '';
      let u = -half;
      while (u < half) {
        const len = 4 + rand() * 7;
        s += line(u, j(0.4), Math.min(u + len, half), j(0.4), 0.5, S.inkSoft);
        u += len + 2 + rand() * 4;
      }
      for (let i = 0; i < (stones || 0); i++) {
        const sx0 = -half + rand() * half * 2, r = 0.6 + rand() * 0.8;
        s += `<circle cx="${f(X(sx0))}" cy="${f(Y(0.4 + j(0.6)))}" r="${f(r * k)}" fill="none" ${base(0.45, S.moraine)}/>`;
      }
      return s;
    };
    const dot = (u, v, r, col) => `<circle cx="${f(X(u))}" cy="${f(Y(v))}" r="${f(r * k)}" fill="${col || S.ink}" stroke="none"/>`;
    // shade fill polygon
    const shadePoly = (pts, op) => poly(pts, 0.01, 'none', S.shade, true, ` fill-opacity="${op || 0.07}"`);
    // rubble course: stone outlines along a band
    const stones = (x0, y0, w, h, n) => {
      let s = '';
      for (let i = 0; i < n; i++) {
        const cx = x0 + rand() * w, cy = y0 + rand() * h, r = 0.7 + rand() * 0.9;
        s += poly([[cx - r, cy + j(0.3)], [cx - r * 0.4, cy - r * 0.6], [cx + r * 0.6, cy - r * 0.5], [cx + r, cy + r * 0.3]], 0.45, S.inkSoft);
      }
      return s;
    };
    return { S, rand, MIX, sx, f, X, Y, W, j, wall, base, poly, line, hatch, ground, dot, shadePoly, stones };
  }
  const G = s => `<g>${s}</g>`;

  // A generic house: stone base, wood upper, shallow roof with stones. Local units around origin (cx at base).
  function house(K, cx, w, h, opt) {
    const { S, rand, j, poly, line, hatch, dot, shadePoly, wall } = K;
    opt = opt || {};
    const hw = w / 2, roofH = h * 0.2, over = w * 0.14;
    const baseH = h * 0.42;
    let s = '';
    // knock-out + wall tint
    s += poly([[cx - hw, 0], [cx - hw, -h + roofH], [cx, -h], [cx + hw, -h + roofH], [cx + hw, 0]], 0.01, 'none', S.paper, true);
    // stone base band
    s += poly([[cx - hw, 0], [cx - hw, -baseH], [cx + hw, -baseH], [cx + hw, 0]], 0.01, 'none', wall, true);
    // shadow right side
    s += shadePoly([[cx + hw * 0.35, 0], [cx + hw * 0.35, -h + roofH * 0.7], [cx + hw, -h + roofH], [cx + hw, 0]], 0.06);
    // outline
    s += poly([[cx - hw, 0], [cx - hw, -h + roofH], [cx, -h], [cx + hw, -h + roofH], [cx + hw, 0]], 0.9);
    s += line(cx - hw, -baseH, cx + hw, -baseH, 0.55);
    // stone joints on base
    for (let i = 0; i < Math.max(2, Math.round(w / 6)); i++) {
      const px = cx - hw + 1.5 + rand() * (w - 3), py = -rand() * (baseH - 1) - 0.5;
      s += line(px, py, px + 1.5 + rand() * 2, py + j(0.3), 0.45, S.inkSoft);
    }
    // wood boards on upper storey (horizontal logs)
    const logs = Math.max(2, Math.round((h - baseH - roofH) / 2.6));
    for (let i = 1; i <= logs; i++) {
      const py = -baseH - i * ((h - baseH - roofH) / (logs + 0.5));
      s += line(cx - hw + 0.8, py, cx + hw - 0.8, py + j(0.2), 0.45, S.inkSoft);
    }
    // roof: overhanging, shallow, ridge jittered
    s += poly([[cx - hw - over, -h + roofH + over * 0.45], [cx, -h - 0.8], [cx + hw + over, -h + roofH + over * 0.45]], 1.0);
    s += poly([[cx - hw - over, -h + roofH + over * 0.45 + 1.2], [cx, -h + 0.5], [cx + hw + over, -h + roofH + over * 0.45 + 1.2]], 0.5, S.inkSoft);
    // stones on roof
    for (let i = 0; i < Math.round(w / 4); i++) {
      const t = rand() * 2 - 1, px = cx + t * (hw + over * 0.6);
      const slope = (roofH + over * 0.45) / (hw + over);
      const py = -h - 0.8 + Math.abs(t) * (hw + over * 0.6) * slope - 0.9;
      s += dot(px, py, 0.5, S.ink);
    }
    // hatch the shaded right face a little
    s += hatch(cx + hw * 0.45, -h + roofH + 1, hw * 0.5, h - roofH - 2, 3, S.inkSoft, 0.15);
    // window(s) and door
    if (!opt.noDoor) s += poly([[cx - hw * 0.35, 0], [cx - hw * 0.35, -baseH * 0.75], [cx - hw * 0.05, -baseH * 0.75], [cx - hw * 0.05, 0]], 0.5);
    const wy = -baseH - (h - baseH - roofH) * 0.35, wh2 = Math.min(3, (h - baseH - roofH) * 0.45);
    s += poly([[cx - hw * 0.55, wy], [cx - hw * 0.55, wy - wh2], [cx - hw * 0.2, wy - wh2], [cx - hw * 0.2, wy]], 0.5, null, S.paper, true);
    if (w > 20) s += poly([[cx + hw * 0.2, wy], [cx + hw * 0.2, wy - wh2], [cx + hw * 0.55, wy - wh2], [cx + hw * 0.55, wy]], 0.5, null, S.paper, true);
    if (opt.chimney) s += poly([[cx + hw * 0.5, -h + roofH * 0.6], [cx + hw * 0.5, -h - 2], [cx + hw * 0.5 + 2, -h - 2], [cx + hw * 0.5 + 2, -h + roofH * 0.75]], 0.6, null, S.paper, true);
    return s;
  }

  window.MRI_MOTIFS = Object.assign(window.MRI_MOTIFS || {}, {

    // Alpine house: stone base, log upper storey, shallow roof weighted with stones.
    alpineHouse(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      let s = house(K, 0, 30, 26, { chimney: true });
      s += K.ground(22, 3);
      return G(s);
    },

    // Cluster of 4–7 houses of varied size around a lane. opts.count
    houseCluster(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const n = Math.min(7, Math.max(4, (opts && opts.count) || 5));
      const { S, rand, poly, line, j } = K;
      let s = '';
      // lane winding through, drawn first (behind)
      s += poly([[-34, 2], [-18, -2], [-6, -6], [8, -9], [22, -12], [36, -14]], 0.55, S.inkSoft);
      s += poly([[-34, 6], [-16, 2], [-4, -2], [10, -5], [24, -8], [38, -10]], 0.55, S.inkSoft);
      // houses: back row first (smaller, higher), then front
      const slots = [[-22, -10, 14, 12], [4, -13, 12, 11], [24, -16, 11, 10], [-8, -1, 18, 15], [16, 0, 16, 14], [32, -4, 12, 11], [-30, 2, 13, 11]];
      for (let i = 0; i < n; i++) {
        const sl = slots[i];
        s += `<g transform="translate(0 0)">` + houseAt(K, sl[0], sl[1] + j(0.8), sl[2], sl[3], i % 3 === 1) + `</g>`;
      }
      s += K.ground(38, 4);
      return G(s);
    },

    // Monastery compound: walls, squat tower with dome, gate — Sinai / Himalayan.
    monastery(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, hatch, shadePoly, wall, dot, stones, j } = K;
      let s = '';
      const wl = -34, wr = 34, wh = -14;
      // rear buildings peeking over the wall
      s += poly([[-10, wh], [-10, -26], [4, -26], [4, wh]], 0.01, 'none', S.paper, true);
      s += poly([[-10, wh], [-10, -26], [4, -26], [4, wh]], 0.7);
      s += line(-10, -23, 4, -23, 0.45, S.inkSoft);
      // tower with dome
      s += poly([[14, wh], [14, -30], [26, -30], [26, wh]], 0.01, 'none', S.paper, true);
      s += poly([[14, wh], [14, -30], [26, -30], [26, wh]], 0.8);
      s += `<path d="M${K.f(K.X(13))} ${K.f(K.Y(-30))} C${K.f(K.X(13))} ${K.f(K.Y(-38))} ${K.f(K.X(27))} ${K.f(K.Y(-38))} ${K.f(K.X(27))} ${K.f(K.Y(-30))}" fill="${S.paper}" ${K.base(0.8)}/>`;
      s += line(20, -37, 20, -40.5, 0.6);
      s += hatch(21, -29, 4.5, 14, 3, S.inkSoft, 0.1);
      s += line(16, -26, 16, -22.5, 0.5); s += line(23, -26, 23, -22.5, 0.5);
      // wall body
      s += poly([[wl, 0], [wl, wh], [wr, wh], [wr, 0]], 0.01, 'none', wall, true);
      s += shadePoly([[wr - 10, 0], [wr - 10, wh], [wr, wh], [wr, 0]], 0.06);
      // crenellations / coping
      let cren = [[wl, 0], [wl, wh]];
      for (let u = wl; u < wr; u += 5) { cren.push([u, wh - 2 + j(0.3)]); cren.push([u + 3, wh - 2 + j(0.3)]); cren.push([u + 3, wh]); cren.push([u + 5, wh]); }
      cren.push([wr, wh]); cren.push([wr, 0]);
      s += poly(cren, 0.9);
      // gate: arch
      s += `<path d="M${K.f(K.X(-3.5))} ${K.f(K.Y(0))} L${K.f(K.X(-3.5))} ${K.f(K.Y(-7))} Q${K.f(K.X(0))} ${K.f(K.Y(-11.5))} ${K.f(K.X(3.5))} ${K.f(K.Y(-7))} L${K.f(K.X(3.5))} ${K.f(K.Y(0))}" fill="${S.paper}" ${K.base(0.7)}/>`;
      s += shadePoly([[-3.5, 0], [-3.5, -7], [0, -10.5], [3.5, -7], [3.5, 0]], 0.12);
      // masonry joints on wall
      s += stones(wl + 2, -12, wr - wl - 4, 10, 9);
      // a couple of small windows
      s += poly([[-24, -8], [-24, -11], [-22, -11], [-22, -8]], 0.5);
      s += poly([[22, -6], [22, -9], [24, -9], [24, -6]], 0.5);
      s += K.ground(40, 3);
      return G(s);
    },

    // Small stupa / shrine with a line of prayer flags.
    stupaOrShrine(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, hatch, shadePoly, wall, j, dot } = K;
      let s = '';
      // stepped base
      s += poly([[-9, 0], [-9, -4], [-6.5, -4], [-6.5, -7.5], [6.5, -7.5], [6.5, -4], [9, -4], [9, 0]], 0.01, 'none', S.paper, true);
      s += poly([[-9, 0], [-9, -4], [-6.5, -4], [-6.5, -7.5], [6.5, -7.5], [6.5, -4], [9, -4], [9, 0]], 0.8);
      // dome
      s += `<path d="M${K.f(K.X(-6))} ${K.f(K.Y(-7.5))} C${K.f(K.X(-6.5))} ${K.f(K.Y(-17))} ${K.f(K.X(6.5))} ${K.f(K.Y(-17))} ${K.f(K.X(6))} ${K.f(K.Y(-7.5))}" fill="${S.paper}" ${K.base(0.8)}/>`;
      s += hatch(2, -8.5, 3.5, 3, 3, S.inkSoft, 0.2);
      // harmika + spire
      s += poly([[-2.2, -14.5], [-2.2, -17.5], [2.2, -17.5], [2.2, -14.5]], 0.6, null, S.paper, true);
      s += poly([[-1.6, -17.5], [0, -25], [1.6, -17.5]], 0.6, null, S.paper, true);
      for (let i = 1; i <= 4; i++) s += line(-1.4 + i * 0.15, -17.5 - i * 1.6, 1.4 - i * 0.15, -17.5 - i * 1.6, 0.45, S.inkSoft);
      s += dot(0, -25.8, 0.6);
      // flag line from spire to a pole at right
      s += line(22, 0, 22, -19, 0.6, S.inkSoft);
      s += `<path d="M${K.f(K.X(0))} ${K.f(K.Y(-25.5))} Q${K.f(K.X(12))} ${K.f(K.Y(-17))} ${K.f(K.X(22))} ${K.f(K.Y(-19))}" fill="none" ${K.base(0.45)}/>`;
      // small flags hanging (tiny open rectangles / pennants)
      for (let i = 0; i < 6; i++) {
        const t = 0.12 + i * 0.15;
        const px = 22 * t, py = (1 - t) * (1 - t) * -25.5 + 2 * (1 - t) * t * -17 + t * t * -19;
        const col = i % 3 === 0 ? S.red : (i % 3 === 1 ? S.blue : S.inkSoft);
        s += poly([[px, py], [px, py + 3], [px + 2.2 + j(0.4), py + 3.2], [px + 2.2, py + 0.2]], 0.45, col);
      }
      s += K.ground(24, 4);
      return G(s);
    },

    // Church with a spire.
    church(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, hatch, shadePoly, wall, j } = K;
      let s = '';
      // nave
      s += poly([[-6, 0], [-6, -14], [4, -21], [14, -14], [14, 0]], 0.01, 'none', S.paper, true);
      s += shadePoly([[7, 0], [7, -17], [14, -14], [14, 0]], 0.06);
      s += poly([[-6, 0], [-6, -14], [4, -21], [14, -14], [14, 0]], 0.9);
      s += poly([[-7, -13.5], [4, -21.5], [15, -13.5]], 0.55, S.inkSoft);
      // tower + spire
      s += poly([[-14, 0], [-14, -26], [-6, -26], [-6, 0]], 0.01, 'none', S.paper, true);
      s += poly([[-14, 0], [-14, -26], [-6, -26], [-6, 0]], 0.9);
      s += poly([[-15, -26], [-10, -40 + j(0.5)], [-5, -26]], 0.9, null, S.paper, true);
      s += hatch(-9, -27, 3, 11, 3, S.inkSoft, 0.35);
      s += line(-10, -40, -10, -43, 0.6); s += line(-11.2, -42, -8.8, -42, 0.6);
      // windows: arched
      [[-10, -19], [1, -9], [8, -9]].forEach(p => {
        s += `<path d="M${K.f(K.X(p[0] - 1.2))} ${K.f(K.Y(p[1] + 3))} L${K.f(K.X(p[0] - 1.2))} ${K.f(K.Y(p[1]))} Q${K.f(K.X(p[0]))} ${K.f(K.Y(p[1] - 2.2))} ${K.f(K.X(p[0] + 1.2))} ${K.f(K.Y(p[1]))} L${K.f(K.X(p[0] + 1.2))} ${K.f(K.Y(p[1] + 3))}" fill="none" ${K.base(0.5)}/>`;
      });
      // door
      s += `<path d="M${K.f(K.X(-11.6))} ${K.f(K.Y(0))} L${K.f(K.X(-11.6))} ${K.f(K.Y(-4))} Q${K.f(K.X(-10))} ${K.f(K.Y(-6))} ${K.f(K.X(-8.4))} ${K.f(K.Y(-4))} L${K.f(K.X(-8.4))} ${K.f(K.Y(0))}" fill="none" ${K.base(0.55)}/>`;
      s += hatch(8, -13, 5, 12, 3, S.inkSoft, 0.1);
      s += K.ground(22, 3);
      return G(s);
    },

    // Border post: small hut, striped barrier pole, a flag.
    borderPost(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, hatch, shadePoly, wall, j, dot } = K;
      let s = '';
      // hut
      s += poly([[-22, 0], [-22, -12], [-16, -17], [-8, -12], [-8, 0]], 0.01, 'none', S.paper, true);
      s += shadePoly([[-12, 0], [-12, -14], [-8, -12], [-8, 0]], 0.06);
      s += poly([[-22, 0], [-22, -12], [-16, -17], [-8, -12], [-8, 0]], 0.85);
      s += poly([[-23.5, -11.5], [-16, -17.5], [-6.5, -11.5]], 0.55, S.inkSoft);
      s += poly([[-19, -5], [-19, -8.5], [-15.5, -8.5], [-15.5, -5]], 0.5);
      s += poly([[-12.5, 0], [-12.5, -7], [-10, -7], [-10, 0]], 0.5);
      // flag pole on the hut
      s += line(-20, -16, -20, -30, 0.6);
      s += poly([[-20, -30], [-12, -28.5 + j(0.5)], [-20, -26]], 0.6, S.red, 'none', true);
      // barrier: pivot post + pole, striped with short dashes (red accent in stripes)
      s += line(2, 0, 2, -9, 0.9);
      s += line(0, -9, 26 + j(0.5), -11.5, 0.9);
      for (let i = 0; i < 5; i++) { const t = 3 + i * 5; s += line(t, -9 - t * 0.1, t + 2.5, -9.25 - t * 0.1, 1.4, S.red); }
      s += dot(2, -9, 0.8);
      // support post at far end
      s += line(25, 0, 25, -11, 0.6);
      // a small stone cairn / post
      s += K.ground(34, 3);
      return G(s);
    },

    // Dry-stone wall along the slope. opts.length (default 60), opts.slope (v per u, default -0.18)
    stoneWall(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, wall, shadePoly } = K;
      const L = (opts && opts.length) || 60, sl = (opts && opts.slope !== undefined) ? opts.slope : -0.18;
      const h = 7;
      let s = '';
      const top = [], bot = [];
      for (let u = -L / 2; u <= L / 2; u += 5) { top.push([u, u * sl - h + j(0.6)]); bot.push([u, u * sl + j(0.4)]); }
      s += poly(top.concat(bot.slice().reverse()), 0.01, 'none', wall, true);
      s += shadePoly([[-L / 2, -L / 2 * sl - h * 0.45], [L / 2, L / 2 * sl - h * 0.45], [L / 2, L / 2 * sl], [-L / 2, -L / 2 * sl]], 0.05);
      // irregular stones, packed in courses with broken joints
      let v0 = -h + 0.6;
      for (let row = 0; row < 3; row++) {
        const rh = 1.6 + rand() * 0.8;
        let u = -L / 2 + rand() * 2;
        while (u < L / 2 - 1) {
          const w = 2 + rand() * 3.2;
          const uu = Math.min(u + w, L / 2);
          const v = v0 + u * sl;
          s += poly([[u, v + rh + j(0.2)], [u + j(0.3), v + j(0.2)], [uu + j(0.3), v + (uu - u) * sl + j(0.2)], [uu, v + (uu - u) * sl + rh + j(0.2)]], 0.45, S.inkSoft);
          u = uu + 0.3;
        }
        v0 += rh + 0.4;
      }
      // coping: tilted slabs along the top
      for (let u = -L / 2 + 1; u < L / 2 - 1; u += 2.2 + rand()) s += line(u, u * sl - h + 0.3 + j(0.3), u + 1.2, u * sl - h - 1.6 + j(0.4), 0.7);
      s += poly(top, 0.8);
      s += poly(bot, 0.6, S.inkSoft);
      s += line(-L / 2, -L / 2 * sl - h, -L / 2, -L / 2 * sl, 0.8);
      s += line(L / 2, L / 2 * sl - h, L / 2, L / 2 * sl, 0.8);
      // fallen stones and grass tufts at the foot
      for (let i = 0; i < 5; i++) { const u = -L / 2 + rand() * L; s += `<circle cx="${K.f(K.X(u))}" cy="${K.f(K.Y(u * sl + 1.3))}" r="${K.f((0.5 + rand() * 0.6) * k)}" fill="none" ${K.base(0.45, S.moraine)}/>`; }
      for (let i = 0; i < 4; i++) { const u = -L / 2 + rand() * L; s += line(u, u * sl + 1.8, u - 0.8, u * sl + 0.2, 0.45, S.sageDeep); s += line(u, u * sl + 1.8, u + 0.7, u * sl + 0.4, 0.45, S.sageDeep); }
      return G(s);
    },

    // Fence: posts and wire. opts.length (default 50), opts.slope
    fenceLine(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j } = K;
      const L = (opts && opts.length) || 50, sl = (opts && opts.slope !== undefined) ? opts.slope : -0.12;
      let s = '';
      const posts = [];
      for (let u = -L / 2; u <= L / 2 + 0.1; u += 8 + j(1.5)) posts.push([u, u * sl + j(0.4)]);
      // wires (slightly sagging between posts)
      for (let w = 0; w < 3; w++) {
        let d = '';
        posts.forEach((p, i) => {
          const py = p[1] - 9 + w * 3 + j(0.2);
          if (!i) d += 'M' + K.f(K.X(p[0])) + ' ' + K.f(K.Y(py));
          else { const q = posts[i - 1]; const mx = (q[0] + p[0]) / 2, my = (q[1] + p[1]) / 2 - 9 + w * 3 + 0.9; d += 'Q' + K.f(K.X(mx)) + ' ' + K.f(K.Y(my)) + ' ' + K.f(K.X(p[0])) + ' ' + K.f(K.Y(py)); }
        });
        s += `<path d="${d}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
      }
      posts.forEach(p => {
        s += line(p[0] + j(0.3), p[1], p[0] + j(0.6), p[1] - 10 - rand() * 1.5, 0.8);
        s += line(p[0] - 1.5, p[1] + 0.3, p[0] + 1.5, p[1] + 0.3, 0.5, S.inkSoft);
      });
      return G(s);
    },

    // Signpost with fingerposts.
    signpost(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, dot } = K;
      let s = '';
      s += line(0, 0, 0.3, -30, 0.9);
      // fingers: pointed boards
      const fingers = [[-27, 1, 13], [-22.5, -1, 11], [-17, 1, 9]];
      fingers.forEach(fg => {
        const v = fg[0], dir = fg[1], len = fg[2];
        const x0 = dir > 0 ? 0 : -len, x1 = dir > 0 ? len : 0;
        const tipX = dir > 0 ? len + 2.2 : -len - 2.2;
        s += poly([[x0 + j(0.2), v - 1.8], [x1, v - 1.8], [tipX, v], [x1, v + 1.8], [x0 + j(0.2), v + 1.8]], 0.6, null, S.paper, true);
        // line of "text" as a short dash
        s += line(dir > 0 ? 2 : -len + 2, v, dir > 0 ? len - 2 : -2, v + j(0.15), 0.5, S.inkSoft);
      });
      // stones piled at the foot
      for (let i = 0; i < 4; i++) s += `<circle cx="${K.f(K.X(j(4)))}" cy="${K.f(K.Y(-0.6 - rand() * 1.2))}" r="${K.f((0.7 + rand() * 0.7) * k)}" fill="${S.paper}" ${K.base(0.5, S.moraine)}/>`;
      s += K.ground(12, 0);
      return G(s);
    },

    // Footbridge over a gap — suspension style with planks. opts.span (default 40)
    bridge(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, hatch } = K;
      const span = (opts && opts.span) || 40, hs = span / 2;
      let s = '';
      // gap: two rock abutments sloping into a gorge
      s += poly([[-hs - 14, 0], [-hs - 6, -1], [-hs, 0.5], [-hs + 3, 8], [-hs + 5, 18]], 0.7);
      s += poly([[hs + 14, 0], [hs + 6, -0.5], [hs, 0.5], [hs - 3, 9], [hs - 5, 18]], 0.7);
      s += hatch(-hs - 2, 3, 4, 10, 4, S.inkSoft, -0.3);
      s += hatch(hs - 4, 3, 4, 10, 4, S.inkSoft, 0.3);
      // towers
      s += line(-hs - 1, 0, -hs - 1, -12, 0.9); s += line(hs + 1, 0, hs + 1, -12, 0.9);
      // deck (sagging)
      const sag = 3.5;
      const deck = `M${K.f(K.X(-hs - 1))} ${K.f(K.Y(-1))} Q${K.f(K.X(0))} ${K.f(K.Y(-1 + sag * 2))} ${K.f(K.X(hs + 1))} ${K.f(K.Y(-1))}`;
      s += `<path d="${deck}" fill="none" ${K.base(0.9)}/>`;
      // planks as ticks
      for (let u = -hs + 2; u < hs - 1; u += 2.4) { const t = (u + hs) / span; const v = -1 + sag * 2 * 2 * t * (1 - t); s += line(u, v - 0.6 + j(0.2), u + j(0.3), v + 0.9, 0.45, S.inkSoft); }
      // main cables
      const cab = `M${K.f(K.X(-hs - 1))} ${K.f(K.Y(-12))} Q${K.f(K.X(0))} ${K.f(K.Y(-4))} ${K.f(K.X(hs + 1))} ${K.f(K.Y(-12))}`;
      s += `<path d="${cab}" fill="none" ${K.base(0.55)}/>`;
      // hangers
      for (let u = -hs + 5; u < hs - 3; u += 6) { const t = (u + hs) / span; const vc = -12 + 8 * 2 * t * (1 - t); const vd = -1 + sag * 2 * 2 * t * (1 - t); s += line(u, vc, u + j(0.2), vd, 0.45, S.inkSoft); }
      // anchor lines to ground
      s += line(-hs - 1, -12, -hs - 9, -1, 0.5, S.inkSoft); s += line(hs + 1, -12, hs + 9, -0.5, 0.5, S.inkSoft);
      return G(s);
    },

    // Arch dam seen from downstream: gorge walls abut the flanks, a sliver of reservoir shows above the crest, river below.
    damWall(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, hatch, shadePoly, wall } = K;
      const P = (u, v) => K.f(K.X(u)) + ' ' + K.f(K.Y(v));
      let s = '';
      // reservoir first (wide; the gorge walls will cover its sides)
      s += `<path d="M${P(-44, -26)} C${P(-20, -21)} ${P(20, -21)} ${P(44, -26)} L${P(40, -40)} C${P(20, -46)} ${P(-20, -46)} ${P(-40, -40)} Z" fill="${S.waterPale}" stroke="none"/>`;
      for (let i = 0; i < 7; i++) { const u = -26 + rand() * 48, v = -42 + rand() * 12; s += line(u, v, u + 3 + rand() * 5, v + j(0.15), 0.45, S.water); }
      s += `<path d="M${P(-40, -40)} C${P(-20, -46)} ${P(20, -46)} ${P(40, -40)}" fill="none" ${K.base(0.5, S.water)}/>`;
      // gorge walls (paper-filled so they clip the lake), inner faces hatched
      const LW = [[-24, -25], [-22, -36], [-26, -48], [-34, -58], [-46, -58], [-46, -20], [-36, 14], [-28, 4], [-22, -4], [-22, -14]];
      const RW = LW.map(p => [-p[0], p[1]]);
      s += poly(LW, 0.01, 'none', S.paper, true); s += poly(RW, 0.01, 'none', S.paper, true);
      s += poly([[-36, 14], [-28, 4], [-22, -4], [-22, -14], [-24, -25], [-22, -36], [-26, -48], [-34, -58]], 0.75, S.inkSoft);
      s += poly([[36, 14], [28, 4], [22, -4], [22, -14], [24, -25], [22, -36], [26, -48], [34, -58]], 0.75, S.inkSoft);
      for (let i = 0; i < 7; i++) { const v = -52 + i * 7; s += line(-25 + j(1), v, -31 - rand() * 5, v + 2 + j(1), 0.45, S.inkSoft); s += line(25 + j(1), v, 31 + rand() * 5, v + 2 + j(1), 0.45, S.inkSoft); }
      for (let i = 0; i < 3; i++) { const v = -2 + i * 5; s += line(-24 + j(1), v, -30 - rand() * 4, v + 1.5, 0.45, S.inkSoft); s += line(24 + j(1), v, 30 + rand() * 4, v + 1.5, 0.45, S.inkSoft); }
      // dam face: tall, slightly narrowing to the toe; crest bows toward the viewer
      s += `<path d="M${P(-24, -25)} C${P(-12, -22)} ${P(12, -22)} ${P(24, -25)} L${P(22, -4)} C${P(20, 1)} ${P(16, 3)} ${P(10, 4)} L${P(-10, 4)} C${P(-16, 3)} ${P(-20, 1)} ${P(-22, -4)} Z" fill="${wall}" stroke="none"/>`;
      s += shadePoly([[6, 3.5], [10, -22.5], [24, -25], [22, -4], [10, 4]], 0.08);
      s += `<path d="M${P(-24, -25)} C${P(-12, -22)} ${P(12, -22)} ${P(24, -25)}" fill="none" ${K.base(1.0)}/>`;
      s += `<path d="M${P(-23, -23.4)} C${P(-12, -20.5)} ${P(12, -20.5)} ${P(23, -23.4)}" fill="none" ${K.base(0.5, S.inkSoft)}/>`;
      s += `<path d="M${P(-24, -25)} L${P(-22, -4)} C${P(-20, 1)} ${P(-16, 3)} ${P(-10, 4)} L${P(10, 4)} C${P(16, 3)} ${P(20, 1)} ${P(22, -4)} L${P(24, -25)}" fill="none" ${K.base(0.85)}/>`;
      // lift lines following the crest curve
      for (let i = 1; i <= 4; i++) { const v = -25 + i * 5.5; const w = 23.5 - i * 0.5; s += `<path d="M${P(-w, v)} C${P(-w * 0.5, v + 2.6)} ${P(w * 0.5, v + 2.6)} ${P(w, v)}" fill="none" ${K.base(0.45, S.inkSoft)}/>`; }
      s += hatch(12, -22, 10, 22, 4, S.inkSoft, 0.1);
      // outlet jets and the river running down the gorge
      s += `<path d="M${P(-4, 3.5)} Q${P(-5, 8)} ${P(-9, 12)}" fill="none" ${K.base(0.6, S.water)}/>`;
      s += `<path d="M${P(3, 3.5)} Q${P(2, 8)} ${P(-2, 12)}" fill="none" ${K.base(0.6, S.water)}/>`;
      s += `<path d="M${P(-12, 12)} C${P(-4, 16)} ${P(4, 16)} ${P(2, 22)}" fill="none" ${K.base(0.55, S.water)}/>`;
      s += `<path d="M${P(-2, 12)} C${P(2, 15)} ${P(7, 17)} ${P(6, 22)}" fill="none" ${K.base(0.45, S.water)}/>`;
      return G(s);
    },

    // Small powerhouse with a penstock pipe coming down the slope into it.
    turbineHouse(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, hatch, shadePoly, wall } = K;
      let s = '';
      // slope behind, rising to upper-left
      s += poly([[-44, -30], [-34, -24], [-24, -16], [-16, -8], [-10, -2]], 0.55, S.inkSoft);
      s += hatch(-40, -28, 22, 6, 5, S.inkSoft, -0.9);
      // penstock: two parallel pipe lines with saddles
      s += poly([[-42, -30], [-30, -22], [-20, -14], [-12, -7.5]], 0.9);
      s += poly([[-41, -32.2], [-29, -24.2], [-19, -16.2], [-11, -9.7]], 0.9);
      [[-36, -26], [-26, -19], [-17, -12]].forEach(p => { s += line(p[0], p[1] + 1.3, p[0], p[1] + 4.5, 0.6); s += line(p[0] - 1.5, p[1] + 4.5, p[0] + 1.5, p[1] + 4.5, 0.5); });
      // powerhouse: flat-roofed block with tall windows
      s += poly([[-10, 0], [-10, -16], [-6, -19], [18, -19], [18, 0]], 0.01, 'none', S.paper, true);
      s += poly([[-10, 0], [-10, -16], [-6, -19], [18, -19], [18, 0]], 0.01, 'none', wall, true);
      s += shadePoly([[8, 0], [8, -19], [18, -19], [18, 0]], 0.07);
      s += poly([[-10, 0], [-10, -16], [-6, -19], [18, -19], [18, 0]], 0.9);
      s += poly([[-11.5, -16], [-6, -20.5], [19.5, -20.5]], 0.6, S.inkSoft);
      for (let i = 0; i < 3; i++) { const u = -4 + i * 7; s += poly([[u, -4], [u, -14], [u + 3, -14], [u + 3, -4]], 0.5, null, S.paper, true); s += line(u + 1.5, -4.5, u + 1.5, -13.5, 0.45, S.inkSoft); }
      s += hatch(12, -17, 5, 15, 3, S.inkSoft, 0.1);
      // tailrace water leaving the building
      s += `<path d="M${K.f(K.X(18))} ${K.f(K.Y(-1.5))} Q${K.f(K.X(26))} ${K.f(K.Y(1))} ${K.f(K.X(34))} ${K.f(K.Y(4))}" fill="none" ${K.base(0.6, S.water)}/>`;
      s += `<path d="M${K.f(K.X(19))} ${K.f(K.Y(0.5))} Q${K.f(K.X(27))} ${K.f(K.Y(3))} ${K.f(K.X(33))} ${K.f(K.Y(6))}" fill="none" ${K.base(0.45, S.water)}/>`;
      // pole for an outgoing line
      s += line(24, 0, 24, -14, 0.6); s += line(22, -13, 26, -13, 0.5);
      s += `<path d="M${K.f(K.X(26))} ${K.f(K.Y(-13))} Q${K.f(K.X(34))} ${K.f(K.Y(-10))} ${K.f(K.X(42))} ${K.f(K.Y(-16))}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
      s += K.ground(28, 3);
      return G(s);
    },

    // 2–3 electricity pylons with catenary wires. opts.count (2–3), opts.gap (default 40)
    pylonLine(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j } = K;
      const n = Math.min(3, Math.max(2, (opts && opts.count) || 3)), gap = (opts && opts.gap) || 40;
      let s = '';
      const tops = [];
      for (let i = 0; i < n; i++) {
        const u = (i - (n - 1) / 2) * gap, gy = j(1.5) - i * 3;   // each pylon a little higher up-slope
        const h = 34 + j(2);
        // lattice body: two legs converging, with cross bracing
        s += line(u - 4, gy, u - 1.2, gy - h, 0.8);
        s += line(u + 4, gy, u + 1.2, gy - h, 0.8);
        for (let z = 1; z < 6; z++) {
          const t = z / 6, w = 4 - 2.8 * t, v = gy - h * t;
          const w2 = 4 - 2.8 * ((z + 1) / 6), v2 = gy - h * ((z + 1) / 6);
          s += line(u - w, v, u + w2, v2, 0.45, S.inkSoft);
          s += line(u + w, v, u - w2, v2, 0.45, S.inkSoft);
        }
        // cross arms
        s += line(u - 7, gy - h + 4, u + 7, gy - h + 4, 0.7);
        s += line(u - 5, gy - h + 10, u + 5, gy - h + 10, 0.7);
        s += line(u, gy - h, u, gy - h - 2.5, 0.6);
        tops.push([u, gy - h]);
        s += line(u - 5, gy + 0.3, u + 5, gy + 0.3, 0.5, S.inkSoft);
      }
      // wires: from each arm end to the next
      for (let i = 1; i < n; i++) {
        const a = tops[i - 1], b = tops[i];
        [[-7, 4], [7, 4], [-5, 10], [5, 10], [0, -2.5]].forEach(o => {
          const ax = a[0] + o[0], ay = a[1] + o[1], bx = b[0] + o[0], by = b[1] + o[1];
          s += `<path d="M${K.f(K.X(ax))} ${K.f(K.Y(ay))} Q${K.f(K.X((ax + bx) / 2))} ${K.f(K.Y((ay + by) / 2 + 6))} ${K.f(K.X(bx))} ${K.f(K.Y(by))}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
        });
      }
      return G(s);
    },

    // Cable car: a pylon, cable running up-slope, a gondola.
    cableCar(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, hatch, shadePoly } = K;
      let s = '';
      // pylon (lattice A-frame)
      s += line(-4, 0, -1.5, -30, 0.9); s += line(4, 0, 1.5, -30, 0.9);
      for (let z = 1; z < 5; z++) { const t = z / 5; s += line(-4 + 2.5 * t, -30 * t, 4 - 2.5 * ((z + 1) / 5), -30 * ((z + 1) / 5), 0.45, S.inkSoft); s += line(4 - 2.5 * t, -30 * t, -4 + 2.5 * ((z + 1) / 5), -30 * ((z + 1) / 5), 0.45, S.inkSoft); }
      s += line(-6, -30, 6, -30, 0.8);
      // sheave wheels
      s += `<circle cx="${K.f(K.X(-5))}" cy="${K.f(K.Y(-31.5))}" r="${K.f(1.2 * k)}" fill="none" ${K.base(0.5)}/>`;
      s += `<circle cx="${K.f(K.X(5))}" cy="${K.f(K.Y(-31.5))}" r="${K.f(1.2 * k)}" fill="none" ${K.base(0.5)}/>`;
      // cables: down-left to valley and up-right to summit, slight sag
      s += `<path d="M${K.f(K.X(-5))} ${K.f(K.Y(-32.5))} Q${K.f(K.X(-26))} ${K.f(K.Y(-18))} ${K.f(K.X(-46))} ${K.f(K.Y(-12))}" fill="none" ${K.base(0.6)}/>`;
      s += `<path d="M${K.f(K.X(5))} ${K.f(K.Y(-32.5))} Q${K.f(K.X(24))} ${K.f(K.Y(-40))} ${K.f(K.X(46))} ${K.f(K.Y(-58))}" fill="none" ${K.base(0.6)}/>`;
      s += `<path d="M${K.f(K.X(-5))} ${K.f(K.Y(-30.5))} Q${K.f(K.X(-26))} ${K.f(K.Y(-16))} ${K.f(K.X(-46))} ${K.f(K.Y(-10))}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
      // gondola hanging on the lower cable, going up
      const gx = -24, gy = -21.5;
      s += line(gx, gy, gx + 0.4, gy + 5, 0.7);
      s += poly([[gx - 4, gy + 5], [gx - 4.5, gy + 12], [gx + 4.5, gy + 12], [gx + 4, gy + 5]], 0.8, null, S.paper, true);
      s += line(gx - 3.5, gy + 8, gx + 3.5, gy + 8, 0.45, S.inkSoft);
      s += shadePoly([[gx + 1, gy + 5], [gx + 1, gy + 12], [gx + 4.5, gy + 12], [gx + 4, gy + 5]], 0.1);
      s += `<circle cx="${K.f(K.X(gx))}" cy="${K.f(K.Y(gy - 0.4))}" r="${K.f(0.9 * k)}" fill="${S.paper}" ${K.base(0.5)}/>`;
      // concrete foot
      s += poly([[-6, 0], [-5, -2.5], [5, -2.5], [6, 0]], 0.6, null, S.paper, true);
      s += K.ground(14, 3);
      return G(s);
    },

    // Construction crane over a half-built block.
    crane(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, hatch, shadePoly, wall } = K;
      let s = '';
      // half-built block: walls to varying heights, with openings, rebar
      s += poly([[-6, 0], [-6, -16], [6, -16], [6, -11], [20, -11], [20, 0]], 0.01, 'none', wall, true);
      s += shadePoly([[12, 0], [12, -11], [20, -11], [20, 0]], 0.07);
      s += poly([[-6, 0], [-6, -16], [6, -16], [6, -11], [20, -11], [20, 0]], 0.9);
      s += line(-6, -8, 20, -8, 0.5, S.inkSoft);
      [[-4, -2], [0, -2], [-4, -10], [0, -10], [9, -2], [14, -2]].forEach(p => s += poly([[p[0], p[1]], [p[0], p[1] - 4], [p[0] + 2.5, p[1] - 4], [p[0] + 2.5, p[1]]], 0.5));
      for (let i = 0; i < 4; i++) s += line(-4 + i * 2.6, -16, -4 + i * 2.6 + j(0.4), -19 - rand() * 2, 0.45, S.inkSoft);
      // crane mast (lattice) behind the block
      const mx = 24;
      s += line(mx - 1.5, 0, mx - 1.5, -40, 0.8); s += line(mx + 1.5, 0, mx + 1.5, -40, 0.8);
      for (let z = 0; z < 10; z++) s += line(mx - 1.5, -z * 4, mx + 1.5, -z * 4 - 4, 0.45, S.inkSoft);
      // jib and counter-jib
      s += line(mx - 26, -40, mx + 9, -40, 0.8);
      s += line(mx - 26, -41.5, mx + 9, -41.5, 0.5, S.inkSoft);
      for (let u = mx - 24; u < mx + 8; u += 3.5) s += line(u, -40, u + 1.8, -41.5, 0.45, S.inkSoft);
      s += line(mx, -40, mx, -46, 0.7);
      s += line(mx, -46, mx - 24, -41.5, 0.45, S.inkSoft); s += line(mx, -46, mx + 8, -41.5, 0.45, S.inkSoft);
      // counterweight
      s += poly([[mx + 5, -38], [mx + 5, -40], [mx + 9, -40], [mx + 9, -38]], 0.6, null, S.ink, true);
      // trolley + hook + load
      s += line(mx - 15, -40, mx - 15, -22, 0.45, S.inkSoft);
      s += poly([[mx - 17, -22], [mx - 17, -18], [mx - 13, -18], [mx - 13, -22]], 0.6, null, S.paper, true);
      // pile of materials
      s += K.stones(-16, -3, 8, 2.5, 5);
      s += K.ground(30, 2);
      return G(s);
    },

    // Arched tunnel portal with a road going in.
    tunnelPortal(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, hatch, shadePoly, wall, stones } = K;
      let s = '';
      // rock face around the portal
      s += poly([[-30, 2], [-24, -6], [-20, -16], [-12, -22], [0, -25], [12, -23], [20, -17], [26, -8], [30, 1]], 0.7, S.inkSoft);
      s += hatch(-22, -15, 10, 10, 4, S.inkSoft, 0.4);
      s += hatch(12, -19, 10, 12, 5, S.inkSoft, 0.5);
      // portal masonry frame
      s += poly([[-13, 0], [-13, -18], [13, -18], [13, 0]], 0.01, 'none', wall, true);
      s += poly([[-13, 0], [-13, -18], [13, -18], [13, 0]], 0.9);
      s += line(-14, -18, 14, -18, 0.6, S.inkSoft);
      // arch opening: dark inside
      const arch = `M${K.f(K.X(-8))} ${K.f(K.Y(0))} L${K.f(K.X(-8))} ${K.f(K.Y(-9))} C${K.f(K.X(-8))} ${K.f(K.Y(-16))} ${K.f(K.X(8))} ${K.f(K.Y(-16))} ${K.f(K.X(8))} ${K.f(K.Y(-9))} L${K.f(K.X(8))} ${K.f(K.Y(0))}`;
      s += `<path d="${arch}" fill="${S.shade}" fill-opacity="0.18" ${K.base(0.9)}/>`;
      for (let i = 0; i < 9; i++) { const u = -7 + i * 1.75; const top = Math.abs(u) < 5 ? -14.5 + Math.abs(u) * 0.5 : -9 - (8 - Math.abs(u)) * 1.6; s += line(u + j(0.2), top + 1, u + j(0.2), -0.5, 0.55, S.ink); }
      // voussoirs
      for (let i = 0; i < 7; i++) { const a = Math.PI * (1 + i / 6); const cx = 0, cy = -9; const r1 = 8, r2 = 10.5; s += line(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.85, cx + Math.cos(a) * r2, cy + Math.sin(a) * r2 * 0.85, 0.5, S.inkSoft); }
      s += stones(-12.5, -16, 4, 14, 4); s += stones(8.5, -16, 4, 14, 4);
      // road running in, widening to the foreground
      s += poly([[-7, 0], [-14, 14]], 0.6, S.inkSoft); s += poly([[7, 0], [14, 14]], 0.6, S.inkSoft);
      for (let i = 0; i < 4; i++) { const v = 3 + i * 3; s += line(-1, v, 1, v + j(0.2), 0.45, S.inkSoft); }
      s += K.ground(30, 0);
      return G(s);
    },

    // Short stretch of hairpin road: three legs climbing, two tight bends, retaining-wall ticks on the downhill edge.
    roadSwitchbacks(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, hatch } = K;
      const P = (u, v) => K.f(K.X(u)) + ' ' + K.f(K.Y(v));
      let s = '';
      const hw = 1.9;                 // half road width
      // legs: [x0,y0,x1,y1]; bends are semicircles joining leg ends
      const legs = [[-38, 2, 22, -10], [22, -22, -22, -30], [-22, -42, 30, -52]];
      const r = 6;                    // bend radius (centreline)
      // edges as two continuous paths: offset vertically by ±hw (roads are shallow so this reads fine)
      const edge = off => {
        let d = 'M' + P(legs[0][0], legs[0][1] + off);
        d += 'L' + P(legs[0][2] + j(0.3), legs[0][3] + off);
        // bend 1 (turning back to the left, going up): arc from (22,-10+off) to (22,-22+off) bulging right
        d += `A${K.f((r + off) * k)} ${K.f((r + off) * k)} 0 0 ${K.sx > 0 ? 0 : 1} ` + P(legs[1][0], legs[1][1] + off);
        d += 'L' + P(legs[1][2] + j(0.3), legs[1][3] + off);
        d += `A${K.f((r - off) * k)} ${K.f((r - off) * k)} 0 0 ${K.sx > 0 ? 1 : 0} ` + P(legs[2][0], legs[2][1] + off);
        d += 'L' + P(legs[2][2], legs[2][3] + off);
        return d;
      };
      s += `<path d="${edge(-hw)}" fill="none" ${K.base(0.7)}/>`;
      s += `<path d="${edge(hw)}" fill="none" ${K.base(0.7)}/>`;
      // retaining wall ticks below the downhill edge of each leg
      legs.forEach((L, i) => {
        const n = 9;
        for (let t = 0; t < n; t++) {
          const f = (t + 0.5) / n; const u = L[0] + (L[2] - L[0]) * f, v = L[1] + (L[3] - L[1]) * f + hw;
          s += line(u, v, u + j(0.3) - 0.6, v + 1.6 + rand() * 1.4, 0.45, S.inkSoft);
        }
      });
      // marker stones on the outside of the bends
      s += line(31.5, -13.5, 31.7, -15.5, 0.6); s += line(31.5, -17.5, 31.7, -19.5, 0.6); s += line(-31.5, -33.5, -31.7, -35.5, 0.6); s += line(-31.5, -37.5, -31.7, -39.5, 0.6);
      return G(s);
    },

    // Small bus / lorry on a road.
    bus(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, shadePoly, hatch } = K;
      let s = '';
      // road patch
      s += line(-24, 1.5, 24, 0.5, 0.55, S.inkSoft); s += line(-22, 4.5, 22, 3.5, 0.55, S.inkSoft);
      // body, bonnet forward (towards +u)
      s += poly([[-14, -2], [-14, -12], [-12, -13.5], [6, -13.5], [8, -12], [12, -8], [14, -5], [14, -2]], 0.01, 'none', S.paper, true);
      s += shadePoly([[-14, -2], [-14, -7], [14, -5], [14, -2]], 0.08);
      s += poly([[-14, -2], [-14, -12], [-12, -13.5], [6, -13.5], [8, -12], [12, -8], [14, -5], [14, -2]], 0.9);
      // windows
      for (let i = 0; i < 4; i++) { const u = -12.5 + i * 4.4; s += poly([[u, -8], [u, -12], [u + 3.4, -12], [u + 3.4, -8]], 0.5); }
      s += poly([[7, -11.5], [9.5, -8.5], [11, -8]], 0.5);
      // wheels
      [[-9, -1.5], [9, -1.5]].forEach(p => { s += `<circle cx="${K.f(K.X(p[0]))}" cy="${K.f(K.Y(p[1]))}" r="${K.f(2.4 * k)}" fill="${S.paper}" ${K.base(0.8)}/>`; s += `<circle cx="${K.f(K.X(p[0]))}" cy="${K.f(K.Y(p[1]))}" r="${K.f(0.9 * k)}" fill="none" ${K.base(0.45)}/>`; });
      // roof rack with luggage
      s += line(-12, -14, 5, -14, 0.6); s += poly([[-10, -14], [-9, -17], [-2, -17], [-1, -14]], 0.5); s += poly([[-2, -14], [-1.5, -16], [4, -16], [4.5, -14]], 0.5);
      s += hatch(-13, -6, 27, 3, 6, S.inkSoft, 0.1);
      return G(s);
    },

    // Tent: ridge tent in three-quarter view, guyed out, a stone on a peg.
    tent(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, shadePoly, hatch } = K;
      let s = '';
      // front gable + right side receding to rear gable
      const A = [0, -13], B = [11, -11.5], FL = [-12, 0], FR = [12, 0], BR = [22, 0.8];
      s += poly([FL, A, FR], 0.01, 'none', S.paper, true);
      s += poly([A, B, BR, FR], 0.01, 'none', S.paper, true);
      s += shadePoly([A, B, BR, FR], 0.08);
      s += poly([FL, A, FR], 0.9);
      s += poly([A, B, BR, FR], 0.8);
      s += line(B[0], B[1], 20, 0.5, 0.5, S.inkSoft);      // rear edge just showing
      // door flaps (one thrown open)
      s += line(-0.5, -11.5, -6, -0.5, 0.55, S.inkSoft); s += line(0.5, -11.5, 4, -0.5, 0.55, S.inkSoft);
      s += `<path d="M${K.f(K.X(-6))} ${K.f(K.Y(-0.5))} Q${K.f(K.X(-3))} ${K.f(K.Y(-5))} ${K.f(K.X(-2))} ${K.f(K.Y(-9))}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
      // fabric wrinkles on the shaded side
      s += hatch(6, -9.5, 9, 7.5, 4, S.inkSoft, 0.55);
      // guy lines + pegs
      s += line(0, -13, -18, 1, 0.45, S.inkSoft); s += line(-18, 1, -18.6, -0.6, 0.7);
      s += line(11, -11.5, 19, -3.5 + 1, 0.45, S.inkSoft); s += line(19, -2.5, 19.6, -3.8, 0.7);
      s += line(11, -11.5, 2, -2, 0.45, S.inkSoft);
      s += K.ground(26, 2);
      return G(s);
    },

    // Memorial cross with stones: marker where a glacier once reached.
    memorialCross(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, poly, line, j, dot } = K;
      let s = '';
      // cairn of stones
      const cairn = [[-5, -1, 1.6], [-1.5, -1.2, 1.8], [2.5, -1, 1.5], [5.5, -0.6, 1.2], [-3, -3.8, 1.4], [1, -4, 1.5], [-1, -6.3, 1.2]];
      cairn.forEach(c => s += poly([[c[0] - c[2], c[1] + c[2] * 0.6], [c[0] - c[2] * 0.7, c[1] - c[2] * 0.5], [c[0] + c[2] * 0.4, c[1] - c[2] * 0.7], [c[0] + c[2], c[1] + j(0.3)], [c[0] + c[2] * 0.6, c[1] + c[2] * 0.7]], 0.55, S.ink, S.paper, true));
      // cross
      s += line(0, -6, 0.3, -24, 1.0); s += line(-5, -19, 5.5, -19.3, 1.0);
      s += line(1.2, -6.5, 1.4, -23, 0.45, S.inkSoft); // second edge for thickness
      // small plaque
      s += poly([[-2.5, -14], [-2.5, -11], [2.5, -11], [2.5, -14]], 0.5, null, S.paper, true);
      s += line(-1.5, -12.5, 1.5, -12.5, 0.45, S.inkSoft);
      // a red survey tick: the glacier-reach mark
      s += line(-10, 0.5, -7, 0.5, 0.8, S.red);
      s += K.ground(14, 2);
      return G(s);
    }
  });

  // small house variant used by houseCluster (scaled copy of house(), no chimney)
  function houseAt(K, cx, baseV, w, h, chimney) {
    const K2 = Object.assign({}, K);
    // shift base by baseV: wrap by offsetting Y
    const Y0 = K.Y;
    K2.Y = v => Y0(v + baseV);
    K2.poly = (pts, w2, col, fill, close, extra) => K.poly(pts.map(p => [p[0], p[1] + baseV]), w2, col, fill, close, extra);
    K2.line = (a, b, c, d, w2, col) => K2.poly([[a, b], [c, d]], w2, col);
    K2.hatch = (x0, y0, w2, h2, n, col, ang) => K.hatch(x0, y0 + baseV, w2, h2, n, col, ang);
    K2.dot = (u, v, r, col) => K.dot(u, v + baseV, r, col);
    K2.shadePoly = (pts, op) => K.shadePoly(pts.map(p => [p[0], p[1] + baseV]), op);
    return house(K2, cx, w, h, { chimney: chimney });
  }
})();
