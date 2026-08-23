// MRI survey-plate motifs — group: BUILDINGS AND INFRASTRUCTURE
// Ink-on-paper register. Every motif: (ctx, x, y, k, opts) -> svg string.
// (x,y) is the ground point the motif stands on; k is scale (adult ~16 units at k=1).
// Supported opts: flip (all); length (stoneWall, fenceLine); slope (stoneWall, fenceLine);
//                 count (pylonLine, houseCluster); gap (pylonLine); span (bridge).
// Stroke weights are chosen by class (0.45 hairline / 0.7 secondary / 1.0 contour) and never
// scaled: the ink engine (ink.js) quantises them in sheet units and adds the hand wobble.
(function () {
  // ---------- shared drawing kit ----------
  function kit(ctx, x, y, k, opts) {
    const S = ctx.S, rand = ctx.rand, MIX = ctx.MIX;
    const sx = (opts && opts.flip) ? -1 : 1;
    const f = n => (Math.round(n * 10) / 10).toFixed(1);
    const X = u => x + sx * u * k;
    const Y = v => y + v * k;
    const R = (a, b) => a + rand() * (b - a);          // variation helper (proportions, counts, sides)
    const j = a => (rand() * 2 - 1) * a;               // small variation (stroke length / start), NOT per-vertex jitter
    const pick = arr => arr[Math.floor(rand() * arr.length)];
    const wall = MIX(S.paper, S.ink, 0.06);            // adjust wall tint here
    const base = (w, col) => `stroke="${col || S.ink}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"`;
    // polyline / polygon in local units (v up is negative). col 'none' → fill only.
    const poly = (pts, w, col, fill, close, extra) => {
      let d = '';
      pts.forEach((p, i) => { d += (i ? 'L' : 'M') + f(X(p[0])) + ' ' + f(Y(p[1])); });
      if (close) d += 'Z';
      if (col === 'none') return `<path d="${d}" fill="${fill || 'none'}" stroke="none"${extra || ''}/>`;
      return `<path d="${d}" fill="${fill || 'none'}" ${base(w, col)}${extra || ''}/>`;
    };
    const line = (a, b, c, d2, w, col) => poly([[a, b], [c, d2]], w, col);
    // ONE hatch direction per motif (a systematic family, not random ticks): tan of the angle from
    // vertical, 31°–41°, chosen once per call of the motif.  // adjust hatch angle range here
    const lean = R(0.6, 0.85);
    // Hatching inside the rectangle [x0,x0+w]×[y0,y0+h]: n hairlines at ~50–60° (leaning down-left),
    // clipped to the rectangle, spacing tightening toward the shadow core (the right edge by default;
    // ang < 0 mirrors the lean and tightens toward the left). Light comes from the upper left.
    // Use it for FLAT faces only — curved surfaces take cylHatch / domeHatch below.
    const dens = Math.max(1, Math.pow(k, 0.85));     // hatch count multiplier: sheet-unit hairlines need more of themselves on a big motif
    const hatch = (x0, y0, w, h, n, col, ang) => {
      n = Math.round(n * dens);
      const mirror = ang !== undefined && ang < 0;
      const span = w + lean * h;
      let s = '';
      for (let i = 0; i < n; i++) {
        let t = (i + 0.5) / n;
        t = 1 - Math.pow(1 - t, 1.55);                 // denser toward t = 1 (the shadow core)
        t += j(0.25 / n);
        const c = mirror ? (x0 + w + lean * h) - t * span : x0 + t * span;   // x where the line crosses y0 (extended)
        // the line x = c - lean*(y - y0); clip to the rectangle
        let yA = 0, yB = h;
        if (!mirror) { yA = Math.max(0, (c - x0 - w) / lean); yB = Math.min(h, (c - x0) / lean); }
        else { yA = Math.max(0, (x0 - c) / lean); yB = Math.min(h, (x0 + w - c) / lean); }
        if (yB - yA < 0.8) continue;
        const trim = R(0, 0.35);
        const ya = yA + trim, yb = yB - R(0, 0.35);
        const xa = mirror ? c + lean * ya : c - lean * ya, xb = mirror ? c + lean * yb : c - lean * yb;
        s += line(xa, y0 + ya, xb, y0 + yb, 0.45, col || S.inkSoft);
      }
      return s;
    };
    // broken ground line (no pebbles: the ground belongs to the sheet)
    const ground = half => {
      let s = '';
      if (true) return s;   /* no private baseline: the composer ties the motif to the sheet's own hachures */
      let u = -half + R(0, 3);
      while (u < half) {
        const len = 4 + rand() * 7;
        s += line(u, j(0.4), Math.min(u + len, half), j(0.4), 0.45, S.inkSoft);
        u += len + 2 + rand() * 4;
      }
      return s;
    };
    const dot = (u, v, r, col) => `<circle cx="${f(X(u))}" cy="${f(Y(v))}" r="${f(r * k)}" fill="${col || S.ink}" stroke="none"/>`;
    // flat shade polygon (fill-opacity 0.04–0.10)
    const shadePoly = (pts, op) => poly(pts, 0.01, 'none', S.shade, true, ` fill-opacity="${op || 0.07}"`);
    // recessed opening: dark fill with a hairline sill below it (u,v = bottom-left, w×h up)
    const opening = (u, v, w, h, op) => {
      let s = poly([[u, v], [u, v - h], [u + w, v - h], [u + w, v]], 0.01, 'none', S.ink, true, ` fill-opacity="${op || 0.72}"`);
      s += line(u - 0.4, v + 0.5, u + w + 0.4, v + 0.5, 0.45, S.ink);
      return s;
    };
    // rubble: a few wedge-shaped stones along a band
    const stones = (x0, y0, w, h, n) => {
      let s = '';
      for (let i = 0; i < n; i++) {
        const cx = x0 + rand() * w, cy = y0 + rand() * h, r = 0.7 + rand() * 0.9;
        s += poly([[cx - r, cy + r * 0.4], [cx - r * 0.4, cy - r * 0.6], [cx + r * 0.6, cy - r * 0.5], [cx + r, cy + r * 0.3]], 0.45, S.inkSoft);
      }
      return s;
    };
    // ---- hatching that wraps form (light from the upper left, shadow on the right) ----
    // Cylinder seen side-on, face spanning u0..u0+w, from v0 down h units: VERTICAL strokes whose
    // spacing tightens toward the terminator (at ~92 % of the width) and loosens toward the light;
    // nothing beyond the terminator, nothing in the lit left part. Strokes vary in length.
    const cylHatch = (u0, v0, w, h, n, col, from) => {
      let s = ''; n = Math.round(n * dens);
      const a = from === undefined ? 0.42 : from, b = 0.93;   // adjust lit/terminator fractions here
      for (let i = 0; i < n; i++) {
        let t = (i + 0.5) / n; t = 1 - Math.pow(1 - t, 1.7);
        const u = u0 + w * (a + (b - a) * t);
        const top = v0 + R(0.3, 1.6) * (1 - t * 0.6), bot = v0 + h - R(0.3, 1.4);
        if (bot - top < 1) continue;
        s += line(u, top, u + j(0.05), bot, 0.45, col || S.inkSoft);
      }
      // one deeper stroke just inside the terminator
      s += line(u0 + w * (b - 0.02), v0 + 0.8, u0 + w * (b - 0.02), v0 + h - 0.6, 0.7, col || S.inkSoft);
      return s;
    };
    // Dome (upper half of a sphere of radius r, centre (cu,cv), ry = r*sq): meridian arcs on the
    // shaded right side, curving with the surface, tightening toward the limb; they stop short of
    // the apex and of the spring line.
    const domeHatch = (cu, cv, r, n, col, sq) => {
      let s = ''; const ry = r * (sq || 1); n = Math.round(n * dens);
      for (let i = 0; i < n; i++) {
        let t = (i + 0.5) / n; t = 1 - Math.pow(1 - t, 1.6);
        const lam = (0.32 + 0.61 * t) * Math.PI / 2;        // longitude from 29° to 84°
        const rx = r * Math.sin(lam);
        const th0 = R(0.04, 0.12), th1 = R(0.62, 0.8) - t * 0.15;   // latitude span (0 = spring line)
        const pts = [];
        for (let q = 0; q <= 6; q++) { const th = (th0 + (th1 - th0) * q / 6) * Math.PI / 2; pts.push([cu + rx * Math.cos(th), cv - ry * Math.sin(th)]); }
        s += poly(pts, 0.45, col || S.inkSoft);
      }
      return s;
    };
    // Gable triangle: ridge (ru,rv), right eave corner (eu,ev) — strokes parallel to the right roof
    // slope inside the right half of the gable, tightening toward the eave corner (its shadow core).
    const gableHatch = (ru, rv, eu, ev, n, col) => {
      let s = ''; n = Math.round(n * dens);
      const H = ev - rv;
      for (let i = 0; i < n; i++) {
        let t = (i + 0.5) / n; t = 1 - Math.pow(1 - t, 1.5);
        const d = H * (0.18 + 0.78 * t);                       // vertical offset of this stroke below the ridge
        const u1 = ru + (eu - ru) * (H - d) / H;               // where it meets the eave line
        const u0 = ru + (u1 - ru) * R(0.06, 0.3);
        if (u1 - u0 < 0.8) continue;
        s += line(u0, rv + d + (u0 - ru) * (ev - rv) / (eu - ru), u1 - R(0, 0.5), ev - R(0, 0.5) * (ev - rv) / (eu - ru), 0.45, col || S.inkSoft);
      }
      return s;
    };
    // Tone under the eaves: a dark hairline band just below the overhang, u0..u1 at v (the wall top)
    const eaveBand = (u0, u1, v) => line(u0 + R(0, 0.6), v + 0.55, u1 - R(0, 0.6), v + 0.55, 0.7, S.ink) + line(u0 + R(0.4, 1.2), v + 1.25, u1 - R(0, 0.8), v + 1.25, 0.45, S.inkSoft);
    // A few strokes along a roof plane: from the ridge line (ru0,rv0)-(ru1,rv1) down the slope toward
    // the eave line (eu0,ev0)-(eu1,ev1), of varying length, denser toward the right (shaded) end
    const roofStrokes = (ru0, rv0, ru1, rv1, eu0, ev0, eu1, ev1, n, col) => {
      let s = '';
      for (let i = 0; i < n; i++) {
        let t = (i + 0.5) / n; t = 1 - Math.pow(1 - t, 1.35); t += j(0.3 / n);
        const a = [ru0 + (ru1 - ru0) * t, rv0 + (rv1 - rv0) * t], b = [eu0 + (eu1 - eu0) * t, ev0 + (ev1 - ev0) * t];
        const p = R(0.1, 0.35), q = R(0.7, 0.95);
        s += line(a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p, a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, 0.45, col || S.inkSoft);
      }
      return s;
    };
    return { S, rand, MIX, sx, f, X, Y, R, j, pick, wall, base, poly, line, hatch, ground, dot, shadePoly, opening, stones, cylHatch, domeHatch, gableHatch, eaveBand, roofStrokes, lean };
  }
  const G = s => `<g>${s}</g>`;

  // ---------- the house ----------
  // A small alpine building standing at (cx, cy) in local units, w wide, h to the ridge.
  // Every call draws a different house: opt fields override the rand() choices.
  //   opt.variant  'house' | 'barn' | 'stair' | 'cross' | 'end'   (end = seen from the eaves side)
  //   opt.tex      'stone' | 'log' | 'plaster'
  //   opt.storeys  1 | 2      opt.doorSide -1 | 0 | 1 (0 = door on the far side)
  //   opt.windows  0..3       opt.chimney  bool
  // The whole silhouette is knocked out in paper BEFORE any line, so a house drawn later
  // hides what stands behind it.
  function house(K, cx, cy, w, h, opt) {
    const { S, rand, R, j, pick, poly, line, hatch, dot, opening, wall, gableHatch, eaveBand, roofStrokes } = K;
    opt = opt || {};
    const variant = opt.variant || pick(['house', 'house', 'house', 'barn', 'stair', 'cross', 'end']);
    const tex = opt.tex || pick(['stone', 'log', 'log', 'plaster']);
    const storeys = opt.storeys || ((h > 13 && rand() < 0.55) ? 2 : 1);
    const hw = w / 2;
    const slope = R(0.22, 0.38);                       // roof pitch: rise per unit of half-width
    const roofH = hw * slope, over = w * R(0.08, 0.17);
    const eaveV = -h + roofH, wallH = h - roofH;
    const ridgeU = j(0.6);                             // the ridge is never dead centre
    const chimney = opt.chimney !== undefined ? opt.chimney : rand() < 0.45;
    let doorSide = opt.doorSide !== undefined ? opt.doorSide : pick([-1, 1, 1, -1, 0]);
    let nWin = opt.windows !== undefined ? opt.windows : pick([1, 2, 2, 3]);
    if (variant === 'barn') { nWin = 0; if (doorSide === 0) doorSide = pick([-1, 1]); }
    if (variant === 'cross') doorSide = 0;             // the wing carries the door
    const P = pts => pts.map(p => [cx + p[0], cy + p[1]]);
    const L = (a, b, c, d, wgt, col) => line(cx + a, cy + b, cx + c, cy + d, wgt, col);
    let s = '';

    // ---- silhouette knock-out (paper) ----
    const eaveDrop = over * slope;                     // how far the roof line falls past the wall
    let sil;
    if (variant === 'end') {
      sil = [[-hw, 0], [-hw, eaveV + 0.6], [-hw - over, eaveV + 0.6], [-hw * 0.78 + ridgeU, -h], [hw * 0.78 + ridgeU, -h], [hw + over, eaveV + 0.6], [hw, eaveV + 0.6], [hw, 0]];
    } else {
      sil = [[-hw, 0], [-hw, eaveV + eaveDrop + 1.2], [-hw - over, eaveV + eaveDrop + 1.2], [-hw - over, eaveV + eaveDrop], [ridgeU, -h - 0.8], [hw + over, eaveV + eaveDrop], [hw + over, eaveV + eaveDrop + 1.2], [hw, eaveV + eaveDrop + 1.2], [hw, 0]];
    }
    s += poly(P(sil), 0.01, 'none', S.paper, true);
    const chU = (rand() < 0.5 ? -1 : 1) * hw * R(0.3, 0.55);
    const chTop = variant === 'end' ? -h - 2.2 : -h + Math.abs(chU) * slope - 2.6;
    if (chimney) s += poly(P([[chU - 0.9, chTop + 3.5], [chU - 0.9, chTop], [chU + 0.9, chTop], [chU + 0.9, chTop + 3.5]]), 0.01, 'none', S.paper, true);

    // ---- walls: tint, shadow on the right, texture ----
    s += poly(P([[-hw, 0], [-hw, eaveV], [hw, eaveV], [hw, 0]]), 0.01, 'none', wall, true);
    const floorV = storeys === 2 ? -wallH * R(0.42, 0.5) : 0;   // first-floor line
    const texLines = (vTop, vBot, kind) => {
      let t = '';
      if (kind === 'log') {
        const n = Math.max(2, Math.round((vBot - vTop) / 2.3));
        for (let i = 1; i <= n; i++) {
          const v = vTop + i * ((vBot - vTop) / (n + 0.6));
          const a = -hw + 0.6 + R(0, 0.8), b = hw - 0.6 - R(0, 0.8);
          t += L(a, v, b, v + j(0.2), 0.45, S.inkSoft);
        }
      } else if (kind === 'stone') {
        const rows = Math.max(2, Math.round((vBot - vTop) / 2.1));
        for (let r = 0; r < rows; r++) {
          const v = vTop + (r + 0.7) * ((vBot - vTop) / rows);
          let u = -hw + 0.5 + R(0, 2.5);
          while (u < hw - 1.5) {
            const len = R(1.6, 3.4);
            if (rand() < 0.7) t += L(u, v + j(0.15), Math.min(u + len, hw - 0.5), v + j(0.15), 0.45, S.inkSoft);
            u += len + R(0.8, 2.2);
          }
        }
      }
      return t;
    };
    if (storeys === 2) {
      s += texLines(floorV, -0.6, tex);
      s += texLines(eaveV + 0.4, floorV - 0.3, tex === 'stone' ? 'log' : tex);
      s += L(-hw, floorV, hw, floorV, 0.7, S.inkSoft);
    } else {
      s += texLines(eaveV + 0.4, -0.6, tex);
    }

    // ---- openings: door, windows, loft ----
    const doorH = Math.min(wallH * 0.62, 5.6), doorW = variant === 'barn' ? w * R(0.3, 0.38) : Math.max(1.8, w * 0.14);
    const doorU = doorSide === 0 ? null : doorSide * (hw * R(0.35, 0.55)) - doorW / 2;
    if (doorU !== null) {
      s += poly(P([[doorU, 0], [doorU, -doorH], [doorU + doorW, -doorH], [doorU + doorW, 0]]), 0.7, null, S.ink, true, ' fill-opacity="0.35"');
      if (variant === 'barn') s += L(doorU + 0.4, -0.4, doorU + doorW - 0.4, -doorH + 0.4, 0.45, S.inkSoft);   // one diagonal brace
    }
    const winH = Math.max(1.3, Math.min(2.6, wallH * 0.22)), winW = winH * R(0.8, 1.05);
    const winRows = storeys === 2 ? [floorV + (eaveV - floorV) * 0.45, -wallH * 0.5 * 0.95] : [eaveV + wallH * R(0.42, 0.55)];
    winRows.forEach((wv, ri) => {
      const count = ri === 1 ? Math.max(1, nWin - 1) : nWin;
      for (let i = 0; i < count; i++) {
        let u = -hw + (i + 0.5) * (w / count) - winW / 2 + j(0.4);
        // avoid the door on the ground floor
        if (wv > -doorH - 0.5 && doorU !== null && u + winW > doorU - 0.8 && u < doorU + doorW + 0.8) u = doorSide > 0 ? doorU - winW - R(1, 2) : doorU + doorW + R(1, 2);
        if (u < -hw + 0.6 || u + winW > hw - 0.6) continue;
        s += opening(cx + u, cy + wv, winW, winH);
      }
    });
    if (variant === 'barn' && rand() < 0.8) s += opening(cx - 1 + ridgeU, cy + eaveV - roofH * 0.3, 2, Math.min(2, roofH * 0.45), 0.8);   // hay-loft hatch in the gable

    // ---- outline of the wall ----
    s += poly(P([[-hw, 0], [-hw, eaveV], [hw, eaveV], [hw, 0]]), 1.0);

    // ---- roof ----
    if (variant === 'end') {
      const ridge = [[-hw * 0.78 + ridgeU, -h], [hw * 0.78 + ridgeU, -h]];
      s += poly(P([[-hw - over, eaveV + 0.6], ridge[0], ridge[1], [hw + over, eaveV + 0.6]]), 1.0, null, S.paper, true);
      s += L(-hw - over, eaveV + 1.6, hw + over, eaveV + 1.6, 0.45, S.inkSoft);      // eaves board
      // shingle strokes down the slope, denser toward the shaded right end
      s += roofStrokes(cx + ridge[0][0], cy + ridge[0][1], cx + ridge[1][0], cy + ridge[1][1], cx - hw - over, cy + eaveV + 0.6, cx + hw + over, cy + eaveV + 0.6, Math.max(3, Math.round(w / 4)), S.inkSoft);
      s += eaveBand(cx - hw, cx + hw, cy + eaveV + 1.6);
      const ns = Math.round(R(2, 5));
      for (let i = 0; i < ns; i++) { const t = R(0.1, 0.9), d = R(0.25, 0.8); const u = -hw - over + t * (2 * hw + 2 * over); s += dot(cx + u * (1 - d * 0.2) + ridgeU * d, cy + eaveV + 0.6 + (-h - eaveV - 0.6) * d, 0.5); }   // weight stones on the roof plane
    } else {
      const rL = [-hw - over, eaveV + eaveDrop], rR = [hw + over, eaveV + eaveDrop], top = [ridgeU, -h - 0.8];
      s += poly(P([rL, top, rR]), 1.0);
      s += poly(P([[rL[0], rL[1] + 1.2], [ridgeU, -h + 0.4], [rR[0], rR[1] + 1.2]]), 0.45, S.inkSoft);
      // the shaded gable: strokes parallel to the right slope, tightening to the eave corner
      s += gableHatch(cx + ridgeU, cy - h + 1.4, cx + hw - 0.3, cy + eaveV - 0.4, Math.max(2, Math.round(hw / 3)), S.inkSoft);
      s += eaveBand(cx - hw, cx + hw, cy + eaveV);
      if (tex !== 'plaster' && rand() < 0.8) {
        const ns = Math.round(R(1, 4));
        for (let i = 0; i < ns; i++) {
          const t = R(-0.8, 0.8), u = ridgeU + t * (hw + over * 0.6);
          const v = -h - 0.8 + Math.abs(t) * (hw + over * 0.6) * (slope + 0.8 / (hw + over)) - 0.35;
          s += dot(cx + u, cy + v, 0.5);
        }
      }
    }
    if (chimney) {
      s += poly(P([[chU - 0.9, chTop + 3.5], [chU - 0.9, chTop], [chU + 0.9, chTop], [chU + 0.9, chTop + 3.5]]), 0.7);
      s += L(chU - 1.2, chTop, chU + 1.2, chTop, 0.7);
    }

    // ---- hatch the shaded right face (45–60°, tightening to the corner) ----
    s += hatch(cx + hw * 0.5, cy + eaveV + 0.8, hw * 0.5 - 0.5, wallH - 1.6, Math.max(2, Math.round(wallH / 3.2)), S.inkSoft);

    // ---- variants ----
    if (variant === 'stair' && storeys === 2) {
      // external stone stair climbing to a first-floor door: a stepped profile, solid against the wall
      const side = doorSide !== 0 ? -doorSide : pick([-1, 1]);
      const top = floorV, len = Math.min(Math.abs(top) * R(0.9, 1.2), w * 0.4);
      const steps = Math.max(3, Math.round(Math.abs(top) / 1.5));
      const prof = [[side * hw, top]];
      for (let i = 0; i < steps; i++) {
        const v0 = top * (1 - i / steps), v1 = top * (1 - (i + 1) / steps);
        const u0 = side * (hw + len * (i / steps)), u1 = side * (hw + len * ((i + 1) / steps));
        prof.push([u1, v0]); prof.push([u1, v1]);
      }
      s += poly(P(prof.concat([[side * hw, 0]])), 0.01, 'none', S.paper, true);
      s += poly(P(prof), 1.0);
      s += L(side * (hw + 0.8), top + 0.9, side * (hw + len - 1), -0.6, 0.45, S.inkSoft);       // the stair's underside / parapet line
      s += opening(cx + (side > 0 ? hw - 2.4 : -hw + 0.6), cy + top, 1.8, Math.min(3.6, Math.abs(top) * 0.8), 0.5);   // upper door at the stair head
    }
    if (variant === 'cross') {
      const side = pick([-1, 1]);
      s += house(K, cx + side * hw * 0.42, cy, w * R(0.48, 0.6), h * R(0.64, 0.74), { variant: 'house', tex, storeys: 1, chimney: false, doorSide: -side, windows: 1 });
    }
    return s;
  }

  window.MRI_MOTIFS = Object.assign(window.MRI_MOTIFS || {}, {

    // Alpine house: stone base, log upper storey, shallow roof weighted with stones. Different every call.
    alpineHouse(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const w = K.R(24, 30), h = w * K.R(0.78, 0.92);
      let s = house(K, 0, 0, w, h, { storeys: 2, variant: K.pick(['house', 'house', 'stair', 'cross']) });
      s += K.ground(w * 0.8);
      return G(s);
    },

    // Hamlet of 4–7 houses of varied size along a lane, far row first, near houses hiding what is behind. opts.count
    houseCluster(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const n = Math.min(7, Math.max(4, (opts && opts.count) || 5));
      const { S, rand, R, j, pick, line } = K;
      let s = '';
      const nFar = Math.floor(n / 2), nNear = n - nFar;
      const list = [];
      for (let i = 0; i < nFar; i++) {
        const u = -26 + (i + 0.5) * (52 / nFar) + j(4);
        const w = R(10, 14);
        list.push({ u, v: -R(8, 13), w, h: w * R(0.72, 0.9), near: false });
      }
      for (let i = 0; i < nNear; i++) {
        const u = -30 + (i + 0.5) * (60 / nNear) + j(4);
        const w = R(14, 20);
        list.push({ u, v: R(-2, 3), w, h: w * R(0.72, 0.9), near: true });
      }
      list.sort((a, b) => a.v - b.v);                  // far to near
      const endOn = list[Math.floor(rand() * list.length)];
      let laneDrawn = false;
      list.forEach(hs => {
        if (hs.near && !laneDrawn) {
          // the lane: broken ground strokes winding between the rows
          let u = -38;
          while (u < 38) { const len = R(4, 9); const v = -5 + u * 0.06 + j(0.8); s += line(u, v, u + len, v + j(0.6), 0.45, S.inkSoft); u += len + R(2, 5); }
          u = -36 + R(0, 4);
          while (u < 36) { const len = R(3, 7); const v = -2.5 + u * 0.06 + j(0.6); if (rand() < 0.7) s += line(u, v, u + len, v + j(0.5), 0.45, S.inkSoft); u += len + R(3, 6); }
          laneDrawn = true;
        }
        const o = hs === endOn ? { variant: 'end' } : (hs.near ? {} : { variant: pick(['house', 'house', 'barn', 'house']), chimney: rand() < 0.3 });
        s += house(K, hs.u, hs.v, hs.w, hs.h, o);
      });
      s += K.ground(40);
      return G(s);
    },

    // Monastery compound: walls, squat round tower with dome, gate — Sinai / Himalayan.
    monastery(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, hatch, wall, opening, j, cylHatch, domeHatch, eaveBand, roofStrokes } = K;
      let s = '';
      const wl = -34, wr = 34, wh = -14;
      // rear building with a low hipped roof, peeking over the wall
      const rb = [[-11, wh - 1], [-11, -24], [-8.5, -27], [2, -27], [4.5, -24], [4.5, wh - 1]];
      s += poly(rb, 0.01, 'none', S.paper, true);
      s += poly(rb, 0.01, 'none', wall, true);
      s += poly(rb, 1.0);
      s += line(-11.5, -24, 5, -24, 0.45, S.inkSoft);
      s += roofStrokes(-8.5, -27, 2, -27, -11, -24, 4.5, -24, 3, S.inkSoft);
      s += eaveBand(-11, 4.5, -24);
      s += cylHatch(-11, -23, 15.5, 8.5, 3, S.inkSoft, 0.55);         // the building's shaded right end
      s += opening(-5, -18, 1.8, 2.2);
      // round tower: a cylinder — vertical strokes tightening to the terminator, nothing beyond it
      const tl = 14, tr = 26, tw = tr - tl, tc = (tl + tr) / 2, tt = -30;
      s += poly([[tl, wh - 1], [tl, tt], [tr, tt], [tr, wh - 1]], 0.01, 'none', S.paper, true);
      s += poly([[tl, wh - 1], [tl, tt], [tr, tt], [tr, wh - 1]], 0.01, 'none', wall, true);
      s += line(tl, wh - 1, tl, tt, 1.0); s += line(tr, wh - 1, tr, tt, 1.0);
      s += cylHatch(tl, tt + 1, tw, (wh - 1) - tt - 1.5, 6, S.inkSoft);
      // a string course and the spring line, both bowed (seen slightly from below)
      s += `<path d="M${K.f(K.X(tl))} ${K.f(K.Y(tt))} Q${K.f(K.X(tc))} ${K.f(K.Y(tt + 1.4))} ${K.f(K.X(tr))} ${K.f(K.Y(tt))}" fill="none" ${K.base(0.7)}/>`;
      s += `<path d="M${K.f(K.X(tl + 0.3))} ${K.f(K.Y(-22))} Q${K.f(K.X(tc))} ${K.f(K.Y(-20.8))} ${K.f(K.X(tr - 0.3))} ${K.f(K.Y(-22))}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
      // dome: a half-sphere, meridian strokes curving with the surface on the shaded side
      const dr = tw / 2 + 1, dsq = R(0.88, 1.0);
      s += `<path d="M${K.f(K.X(tc - dr))} ${K.f(K.Y(tt))} A${K.f(dr * k)} ${K.f(dr * dsq * k)} 0 0 ${K.sx > 0 ? 1 : 0} ${K.f(K.X(tc + dr))} ${K.f(K.Y(tt))}" fill="${S.paper}" ${K.base(1.0)}/>`;
      s += domeHatch(tc, tt, dr - 0.4, 5, S.inkSoft, dsq);
      s += line(tc, tt - dr * dsq, tc, tt - dr * dsq - 3.2, 0.7);
      s += line(tc - 1, tt - dr * dsq - 2.2, tc + 1, tt - dr * dsq - 2.2, 0.45);
      s += opening(tl + 2.2, -22, 1.6, 3.2);
      // wall body: the fill IS the crenellated outline, so nothing behind shows through.
      // merlon widths vary, and a couple are broken (lower, or missing altogether)
      let cren = [[wl, 0], [wl, wh]];
      let u = wl + R(0, 1.5), iMer = 0;
      const broken = new Set([Math.floor(R(2, 6)), Math.floor(R(8, 14))]);
      while (u < wr - 2) {
        const mw = R(1.6, 4.6), gw = R(1.3, 2.8);
        let mv = wh - R(1.6, 2.6);
        const br = broken.has(iMer);
        if (br && rand() < 0.5) { u += mw + gw; iMer++; continue; }          // missing merlon
        if (br) mv = wh - R(0.5, 0.9);                                         // broken stump
        const u1 = Math.min(u + mw, wr);
        cren.push([u, wh]); cren.push([u + j(0.15), mv]); cren.push([u1, mv + (br ? R(-0.4, 0.4) : j(0.15))]); cren.push([u1, wh]);
        u += mw + gw; iMer++;
      }
      cren.push([wr, wh]); cren.push([wr, 0]);
      s += poly(cren, 0.01, 'none', S.paper, true);
      s += poly(cren, 0.01, 'none', wall, true);
      s += poly(cren, 1.0);
      // masonry joints, sparser to the left
      for (let r = 0; r < 3; r++) { const v = -3 - r * 3.6; let uu = wl + 1 + R(0, 3); while (uu < wr - 2) { const len = R(2, 4.5); if (rand() < 0.55) s += line(uu, v + j(0.2), uu + len, v + j(0.2), 0.45, S.inkSoft); uu += len + R(1.5, 4); } }
      // the wall's shaded right bay, one diagonal family tightening to the corner
      s += hatch(wr - 11, wh + 1, 10, 12, 5, S.inkSoft);
      s += line(wl + 0.6, wh + 0.6, wr - 0.6, wh + 0.6, 0.45, S.inkSoft);   // the parapet's shadow line
      // gate: arch, dark inside
      s += `<path d="M${K.f(K.X(-3.5))} ${K.f(K.Y(0))} L${K.f(K.X(-3.5))} ${K.f(K.Y(-7))} Q${K.f(K.X(0))} ${K.f(K.Y(-11.5))} ${K.f(K.X(3.5))} ${K.f(K.Y(-7))} L${K.f(K.X(3.5))} ${K.f(K.Y(0))}" fill="${S.ink}" fill-opacity="0.55" ${K.base(1.0)}/>`;
      // a couple of small windows in the wall
      s += opening(-24 + j(2), -7, 1.6, 2.4);
      s += opening(22 + j(2), -6, 1.6, 2.4);
      s += K.ground(40);
      return G(s);
    },

    // Small stupa / shrine with a line of prayer flags.
    stupaOrShrine(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, hatch, j, dot, pick, domeHatch, cylHatch } = K;
      let s = '';
      const bw = R(8, 10), bh = R(3.5, 4.5);
      const stepP = [[-bw, 0], [-bw, -bh], [-bw + 2.5, -bh], [-bw + 2.5, -bh - 3.5], [bw - 2.5, -bh - 3.5], [bw - 2.5, -bh], [bw, -bh], [bw, 0]];
      // dome first (behind the base), then the stepped base knocks out in front
      const dv = -bh - 3.5, dr = bw - 3;
      s += `<path d="M${K.f(K.X(-dr))} ${K.f(K.Y(dv + 1))} C${K.f(K.X(-dr - 0.5))} ${K.f(K.Y(dv - 9.5))} ${K.f(K.X(dr + 0.5))} ${K.f(K.Y(dv - 9.5))} ${K.f(K.X(dr))} ${K.f(K.Y(dv + 1))}" fill="${S.paper}" ${K.base(1.0)}/>`;
      s += domeHatch(0, dv + 0.6, dr - 0.3, 5, S.inkSoft, 0.78);          // meridian strokes on the shaded side of the dome
      s += poly(stepP, 0.01, 'none', S.paper, true);
      s += poly(stepP, 1.0);
      s += cylHatch(-bw + 2.5, -bh - 3.2, 2 * bw - 5, 3, 3, S.inkSoft, 0.55);   // upper step
      s += cylHatch(-bw, -bh + 0.3, 2 * bw, bh - 0.5, 3, S.inkSoft, 0.6);        // plinth
      s += line(-bw + 2.6, -bh - 3.5 + 0.6, bw - 2.6, -bh - 3.5 + 0.6, 0.45, S.inkSoft);   // shadow under the dome's lip
      // harmika + spire (rings)
      const sv = dv - 7;
      s += poly([[-2.2, sv], [-2.2, sv - 3], [2.2, sv - 3], [2.2, sv]], 0.7, null, S.paper, true);
      s += poly([[-1.6, sv - 3], [0, sv - 10.5], [1.6, sv - 3]], 0.7, null, S.paper, true);
      const rings = Math.round(R(3, 5));
      for (let i = 1; i <= rings; i++) s += line(-1.5 + i * (1.2 / rings), sv - 3 - i * (6.5 / rings), 1.5 - i * (1.2 / rings), sv - 3 - i * (6.5 / rings), 0.45, S.inkSoft);
      s += dot(0, sv - 11.3, 0.6);
      // flag line from the spire to a pole at right
      const px = R(19, 24), ph = R(16, 21);
      s += line(px, 0, px + 0.3, -ph, 0.7, S.inkSoft);
      s += `<path d="M${K.f(K.X(0))} ${K.f(K.Y(sv - 11))} Q${K.f(K.X(px * 0.55))} ${K.f(K.Y(-ph + 2))} ${K.f(K.X(px))} ${K.f(K.Y(-ph))}" fill="none" ${K.base(0.45)}/>`;
      const nf = Math.round(R(5, 7)), blueAt = Math.floor(rand() * nf);
      for (let i = 0; i < nf; i++) {
        const t = 0.1 + (i + R(-0.1, 0.1)) * (0.8 / nf);
        const fx = px * t, fy = (1 - t) * (1 - t) * (sv - 11) + 2 * (1 - t) * t * (-ph + 2) + t * t * -ph;
        const col = i === blueAt ? S.blue : (i % 2 ? S.inkSoft : S.ink);
        const fl = R(2.4, 3.4), fw = R(1.6, 2.4);
        s += poly([[fx, fy], [fx + 0.3, fy + fl], [fx + fw, fy + fl - 0.3], [fx + fw - 0.2, fy + 0.2]], 0.45, col, i % 3 === 1 ? col : 'none', true, i % 3 === 1 ? ' fill-opacity="0.35"' : '');
      }
      s += K.ground(26);
      return G(s);
    },

    // Church with a spire.
    church(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, hatch, wall, j, opening, gableHatch, eaveBand, cylHatch } = K;
      let s = '';
      const nh = R(13, 15), th = R(24, 28), sp = R(13, 16);
      // nave
      const nave = [[-6, 0], [-6, -nh], [4, -nh - 7], [14, -nh], [14, 0]];
      s += poly(nave, 0.01, 'none', S.paper, true);
      s += poly(nave, 0.01, 'none', wall, true);
      s += poly(nave, 1.0);
      s += poly([[-7, -nh + 0.5], [4, -nh - 7.5], [15, -nh + 0.5]], 0.45, S.inkSoft);
      s += gableHatch(4, -nh - 5.6, 13.7, -nh - 0.3, 3, S.inkSoft);        // the shaded gable
      s += eaveBand(-6, 14, -nh);
      s += hatch(8, -nh + 1.6, 5.5, nh - 2.6, 4, S.inkSoft);
      // tower + spire (knocked out in front of the nave)
      const twr = [[-14, 0], [-14, -th], [-6, -th], [-6, 0]];
      s += poly([[-15, 0], [-15, -th], [-10, -th - sp], [-5, -th], [-5, 0]], 0.01, 'none', S.paper, true);
      s += poly(twr, 0.01, 'none', wall, true);
      s += poly(twr, 1.0);
      s += poly([[-15, -th], [-10 + j(0.4), -th - sp], [-5, -th]], 1.0);
      s += hatch(-9, -th + 1, 2.5, th - 2, 3, S.inkSoft);
      s += gableHatch(-10, -th - sp + 1.5, -5.3, -th - 0.2, 4, S.inkSoft);   // spire: strokes down its right face
      s += eaveBand(-14, -6, -th);
      s += line(-10, -th - sp, -10, -th - sp - 3, 0.7); s += line(-11.2, -th - sp - 2, -8.8, -th - sp - 2, 0.7);
      // windows: arched, dark inside
      const arch = (u, v, ww, hh, op) => `<path d="M${K.f(K.X(u - ww))} ${K.f(K.Y(v))} L${K.f(K.X(u - ww))} ${K.f(K.Y(v - hh))} Q${K.f(K.X(u))} ${K.f(K.Y(v - hh - ww * 1.6))} ${K.f(K.X(u + ww))} ${K.f(K.Y(v - hh))} L${K.f(K.X(u + ww))} ${K.f(K.Y(v))}Z" fill="${S.ink}" fill-opacity="${op}" ${K.base(0.45)}/>`;
      s += arch(-10, -th + 6, 1.1, 2.6, 0.7);
      const nw = rand() < 0.5 ? 2 : 3;
      for (let i = 0; i < nw; i++) s += arch(-3 + (i + 0.5) * (16 / nw), -5.5, 1.1, 2.6, 0.7);
      s += arch(-10, 0, 1.6, 3.6, 0.4);             // door
      s += K.ground(22);
      return G(s);
    },

    // Border post: small hut, striped barrier pole, a flag.
    borderPost(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, hatch, shadePoly, wall, j, dot } = K;
      let s = '';
      s += house(K, -15, 0, R(12, 15), R(15, 18), { storeys: 1, variant: 'house', tex: 'plaster', windows: 1, doorSide: 1, chimney: rand() < 0.5 });
      // flag pole on the hut
      s += line(-20, -14, -20, -30, 0.7);
      s += poly([[-20, -30], [-12, -28.5 + j(0.5)], [-20, -26]], 0.7, S.red, 'none', true);
      // barrier: pivot post + pole, striped (the red stripes are the survey accent)
      const len = R(22, 27);
      s += line(2, 0, 2, -9, 1.0);
      s += line(0, -9, len, -11.5, 1.0);
      for (let i = 0; i < 5; i++) { const t = 3 + i * (len - 5) / 5; s += line(t, -9 - t * 0.1, t + 2.5, -9.25 - t * 0.1, 1.0, S.red); }
      s += dot(2, -9, 0.8);
      s += line(len - 1, 0, len - 1, -11, 0.7);
      s += K.ground(34);
      return G(s);
    },

    // Dry-stone wall along the slope. opts.length (default 60), opts.slope (v per u, default -0.18)
    stoneWall(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, wall, shadePoly } = K;
      const L = (opts && opts.length) || 60, sl = (opts && opts.slope !== undefined) ? opts.slope : -0.18;
      const h = R(6, 7.5);
      let s = '';
      const top = [], bot = [];
      for (let u = -L / 2; u <= L / 2; u += 5) { top.push([u, u * sl - h + j(0.5)]); bot.push([u, u * sl + j(0.3)]); }
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
          s += poly([[u, v + rh], [u + j(0.3), v], [uu + j(0.3), v + (uu - u) * sl], [uu, v + (uu - u) * sl + rh]], 0.45, S.inkSoft);
          u = uu + 0.3;
        }
        v0 += rh + 0.4;
      }
      // coping: tilted slabs along the top
      for (let u = -L / 2 + 1; u < L / 2 - 1; u += 2.2 + rand()) s += line(u, u * sl - h + 0.3, u + 1.2, u * sl - h - 1.6 + j(0.4), 0.7);
      s += poly(top, 1.0);
      s += poly(bot, 0.7, S.inkSoft);
      s += line(-L / 2, -L / 2 * sl - h, -L / 2, -L / 2 * sl, 1.0);
      s += line(L / 2, L / 2 * sl - h, L / 2, L / 2 * sl, 1.0);
      // grass tufts at the foot
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
          const py = p[1] - 9 + w * 3;
          if (!i) d += 'M' + K.f(K.X(p[0])) + ' ' + K.f(K.Y(py));
          else { const q = posts[i - 1]; const mx = (q[0] + p[0]) / 2, my = (q[1] + p[1]) / 2 - 9 + w * 3 + 0.9; d += 'Q' + K.f(K.X(mx)) + ' ' + K.f(K.Y(my)) + ' ' + K.f(K.X(p[0])) + ' ' + K.f(K.Y(py)); }
        });
        s += `<path d="${d}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
      }
      posts.forEach(p => {
        s += line(p[0] + j(0.3), p[1], p[0] + j(0.6), p[1] - 10 - rand() * 1.5, 0.7);
        s += line(p[0] - 1.5, p[1] + 0.3, p[0] + 1.5, p[1] + 0.3, 0.45, S.inkSoft);
      });
      return G(s);
    },

    // Signpost with fingerposts.
    signpost(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, pick } = K;
      let s = '';
      const ph = R(26, 32);
      s += line(0, 0, 0.3, -ph, 1.0);
      // fingers: pointed boards, two or three, a side each, lengths vary
      const nf = rand() < 0.6 ? 3 : 2;
      let v = -ph + 3;
      let dir = pick([-1, 1]);
      for (let i = 0; i < nf; i++) {
        const len = R(8, 13), bh = R(1.5, 2);
        const x0 = dir > 0 ? 0 : -len, x1 = dir > 0 ? len : 0, tipX = dir > 0 ? len + 2.2 : -len - 2.2;
        s += poly([[x0, v - bh], [x1, v - bh], [tipX, v], [x1, v + bh], [x0, v + bh]], 0.7, null, S.paper, true);
        v += bh * 2 + R(0.8, 2);
        dir = -dir;
      }
      // a stone or two wedged at the foot
      s += poly([[-2.8, 0.2], [-2.2, -1.4], [-0.4, -1.6], [0.6, 0.1]], 0.45, S.inkSoft);
      if (rand() < 0.6) s += poly([[1, 0.2], [1.8, -1], [3.2, -0.8], [3.6, 0.2]], 0.45, S.inkSoft);
      s += K.ground(12);
      return G(s);
    },

    // Footbridge over a gap — suspension style with planks. opts.span (default 40)
    bridge(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, hatch } = K;
      const span = (opts && opts.span) || 40, hs = span / 2;
      let s = '';
      // gap: two rock abutments sloping into a gorge
      s += poly([[-hs - 14, 0], [-hs - 6, -1], [-hs, 0.5], [-hs + 3, 8], [-hs + 5, 18]], 0.7);
      s += poly([[hs + 14, 0], [hs + 6, -0.5], [hs, 0.5], [hs - 3, 9], [hs - 5, 18]], 0.7);
      s += hatch(-hs - 6, 2, 7, 12, 5, S.inkSoft);
      s += hatch(hs - 1, 2, 7, 12, 5, S.inkSoft, -1);
      // towers
      const th = R(11, 13);
      s += line(-hs - 1, 0, -hs - 1, -th, 1.0); s += line(hs + 1, 0, hs + 1, -th, 1.0);
      // deck (sagging)
      const sag = R(3, 4);
      const deck = `M${K.f(K.X(-hs - 1))} ${K.f(K.Y(-1))} Q${K.f(K.X(0))} ${K.f(K.Y(-1 + sag * 2))} ${K.f(K.X(hs + 1))} ${K.f(K.Y(-1))}`;
      s += `<path d="${deck}" fill="none" ${K.base(1.0)}/>`;
      // planks as ticks
      for (let u = -hs + 2; u < hs - 1; u += 2.4 + j(0.4)) { const t = (u + hs) / span; const v = -1 + sag * 2 * 2 * t * (1 - t); s += line(u, v - 0.6, u, v + 0.9, 0.45, S.inkSoft); }
      // main cables
      const cab = `M${K.f(K.X(-hs - 1))} ${K.f(K.Y(-th))} Q${K.f(K.X(0))} ${K.f(K.Y(-4))} ${K.f(K.X(hs + 1))} ${K.f(K.Y(-th))}`;
      s += `<path d="${cab}" fill="none" ${K.base(0.7)}/>`;
      // hangers
      for (let u = -hs + 5; u < hs - 3; u += 6) { const t = (u + hs) / span; const vc = -th + (th - 4) * 2 * t * (1 - t); const vd = -1 + sag * 2 * 2 * t * (1 - t); s += line(u, vc, u, vd, 0.45, S.inkSoft); }
      // anchor lines to ground
      s += line(-hs - 1, -th, -hs - 9, -1, 0.45, S.inkSoft); s += line(hs + 1, -th, hs + 9, -0.5, 0.45, S.inkSoft);
      return G(s);
    },

    // Arch dam seen from downstream: gorge walls abut the flanks, a sliver of reservoir shows above the crest, river below.
    damWall(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, hatch, wall } = K;
      const P = (u, v) => K.f(K.X(u)) + ' ' + K.f(K.Y(v));
      let s = '';
      // reservoir first (wide; the gorge walls will cover its sides)
      s += `<path d="M${P(-44, -26)} C${P(-20, -21)} ${P(20, -21)} ${P(44, -26)} L${P(40, -40)} C${P(20, -46)} ${P(-20, -46)} ${P(-40, -40)} Z" fill="${S.waterPale}" stroke="none"/>`;
      for (let i = 0; i < 7; i++) { const u = -26 + rand() * 48, v = -42 + rand() * 12; s += line(u, v, u + 3 + rand() * 5, v, 0.45, S.water); }
      s += `<path d="M${P(-40, -40)} C${P(-20, -46)} ${P(20, -46)} ${P(40, -40)}" fill="none" ${K.base(0.45, S.water)}/>`;
      // gorge walls (paper-filled so they clip the lake), inner faces hatched
      const LW = [[-24, -25], [-22, -36], [-26, -48], [-34, -58], [-46, -58], [-46, -20], [-36, 14], [-28, 4], [-22, -4], [-22, -14]];
      const RW = LW.map(p => [-p[0], p[1]]);
      s += poly(LW, 0.01, 'none', S.paper, true); s += poly(RW, 0.01, 'none', S.paper, true);
      s += poly([[-36, 14], [-28, 4], [-22, -4], [-22, -14], [-24, -25], [-22, -36], [-26, -48], [-34, -58]], 0.7, S.inkSoft);
      s += poly([[36, 14], [28, 4], [22, -4], [22, -14], [24, -25], [22, -36], [26, -48], [34, -58]], 0.7, S.inkSoft);
      for (let i = 0; i < 7; i++) { const v = -52 + i * 7 + j(1); s += line(-25, v, -31 - rand() * 5, v + 2.5 + j(0.8), 0.45, S.inkSoft); s += line(25, v, 31 + rand() * 5, v + 2.5 + j(0.8), 0.45, S.inkSoft); }
      for (let i = 0; i < 3; i++) { const v = -2 + i * 5; s += line(-24, v, -30 - rand() * 4, v + 1.5, 0.45, S.inkSoft); s += line(24, v, 30 + rand() * 4, v + 1.5, 0.45, S.inkSoft); }
      // dam face: tall, slightly narrowing to the toe; crest bows toward the viewer
      s += `<path d="M${P(-24, -25)} C${P(-12, -22)} ${P(12, -22)} ${P(24, -25)} L${P(22, -4)} C${P(20, 1)} ${P(16, 3)} ${P(10, 4)} L${P(-10, 4)} C${P(-16, 3)} ${P(-20, 1)} ${P(-22, -4)} Z" fill="${wall}" stroke="none"/>`;
      s += `<path d="M${P(-24, -25)} C${P(-12, -22)} ${P(12, -22)} ${P(24, -25)}" fill="none" ${K.base(1.0)}/>`;
      s += `<path d="M${P(-23, -23.4)} C${P(-12, -20.5)} ${P(12, -20.5)} ${P(23, -23.4)}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
      s += `<path d="M${P(-24, -25)} L${P(-22, -4)} C${P(-20, 1)} ${P(-16, 3)} ${P(-10, 4)} L${P(10, 4)} C${P(16, 3)} ${P(20, 1)} ${P(22, -4)} L${P(24, -25)}" fill="none" ${K.base(1.0)}/>`;
      // course lines: arcs following the crest curve, the lower ones a little flatter
      const nc = Math.round(R(3, 4));
      for (let i = 1; i <= nc; i++) { const v = -25 + i * (24 / (nc + 0.6)); const w = 23.5 - i * (2.8 / nc); const bow = 2.8 - i * 0.25; s += `<path d="M${P(-w, v)} C${P(-w * 0.5, v + bow)} ${P(w * 0.5, v + bow)} ${P(w, v)}" fill="none" ${K.base(0.45, S.inkSoft)}/>`; }
      // the face is a cylinder: vertical strokes that follow it, spacing tightening toward the right
      // abutment where the gorge wall throws its shadow; none in the lit left half
      const crest = u => -25 + 3 * (1 - (u / 24) * (u / 24)) + 0.7, toe = u => u <= 10 ? 3.3 : 3.3 - Math.pow((u - 10) / 12, 1.5) * 7.5;
      const nv = Math.round(7 * Math.max(1, Math.pow(k, 0.85)));
      for (let i = 0; i < nv; i++) {
        let t = (i + 0.5) / nv; t = 1 - Math.pow(1 - t, 2.2);
        const u = 7 + 15.5 * t;
        const top = crest(u) + R(0.4, 2.5) * (1 - t * 0.7), bot = toe(u) - R(0.3, 1.2);
        s += line(u, top, u + j(0.05), bot, i === nv - 1 ? 0.7 : 0.45, S.inkSoft);
      }
      // outlet jets and the river running down the gorge
      s += `<path d="M${P(-4, 3.5)} Q${P(-5, 8)} ${P(-9, 12)}" fill="none" ${K.base(0.7, S.water)}/>`;
      s += `<path d="M${P(3, 3.5)} Q${P(2, 8)} ${P(-2, 12)}" fill="none" ${K.base(0.7, S.water)}/>`;
      s += `<path d="M${P(-12, 12)} C${P(-4, 16)} ${P(4, 16)} ${P(2, 22)}" fill="none" ${K.base(0.45, S.water)}/>`;
      s += `<path d="M${P(-2, 12)} C${P(2, 15)} ${P(7, 17)} ${P(6, 22)}" fill="none" ${K.base(0.45, S.water)}/>`;
      return G(s);
    },

    // Small powerhouse with a penstock pipe coming down the slope into it.
    turbineHouse(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, hatch, wall, opening, gableHatch, eaveBand } = K;
      let s = '';
      // slope behind, rising to upper-left
      s += poly([[-44, -30], [-34, -24], [-24, -16], [-16, -8], [-10, -2]], 0.45, S.inkSoft);
      s += hatch(-42, -29, 20, 7, 5, S.inkSoft, -1);
      // penstock: two parallel pipe lines with saddles
      s += poly([[-42, -30], [-30, -22], [-20, -14], [-12, -7.5]], 1.0);
      s += poly([[-41, -32.2], [-29, -24.2], [-19, -16.2], [-11, -9.7]], 1.0);
      [[-36, -26], [-26, -19], [-17, -12]].forEach(p => { s += line(p[0], p[1] + 1.3, p[0], p[1] + 4.5, 0.7); s += line(p[0] - 1.5, p[1] + 4.5, p[0] + 1.5, p[1] + 4.5, 0.45); });
      // powerhouse: a gabled hall with tall round-headed windows set into the wall
      const hw = R(13, 15), wh = R(14, 16), rh = R(3.5, 5), cx = 4;
      const sil = [[cx - hw, 0], [cx - hw, -wh], [cx - hw - 1.5, -wh + 0.5], [cx, -wh - rh - 0.6], [cx + hw + 1.5, -wh + 0.5], [cx + hw, -wh], [cx + hw, 0]];
      s += poly(sil, 0.01, 'none', S.paper, true);
      s += poly([[cx - hw, 0], [cx - hw, -wh], [cx + hw, -wh], [cx + hw, 0]], 0.01, 'none', wall, true);
      // windows IN the wall: dark recess, paper sill line
      const nw = rand() < 0.5 ? 3 : 4, ww = 2.6, wht = wh * 0.62;
      for (let i = 0; i < nw; i++) {
        const u = cx - hw + (i + 0.5) * (2 * hw / nw) - ww / 2;
        s += `<path d="M${K.f(K.X(u))} ${K.f(K.Y(-3.5))} L${K.f(K.X(u))} ${K.f(K.Y(-3.5 - wht + ww * 0.5))} Q${K.f(K.X(u + ww / 2))} ${K.f(K.Y(-3.5 - wht - ww * 0.3))} ${K.f(K.X(u + ww))} ${K.f(K.Y(-3.5 - wht + ww * 0.5))} L${K.f(K.X(u + ww))} ${K.f(K.Y(-3.5))}Z" fill="${S.ink}" fill-opacity="0.7" stroke="none"/>`;
        s += line(u - 0.4, -3, u + ww + 0.4, -3, 0.45, S.ink);
      }
      s += poly([[cx - hw, 0], [cx - hw, -wh], [cx + hw, -wh], [cx + hw, 0]], 1.0);
      s += poly([[cx - hw - 1.5, -wh + 0.5], [cx + j(0.4), -wh - rh - 0.6], [cx + hw + 1.5, -wh + 0.5]], 1.0);
      s += poly([[cx - hw - 1.5, -wh + 1.7], [cx, -wh - rh + 0.6], [cx + hw + 1.5, -wh + 1.7]], 0.45, S.inkSoft);
      s += line(cx - hw, -wh, cx + hw, -wh, 0.45, S.inkSoft);
      s += gableHatch(cx, -wh - rh + 0.8, cx + hw + 1.2, -wh + 0.3, 4, S.inkSoft);      // pediment: its right half in tone
      s += eaveBand(cx - hw, cx + hw, -wh);
      s += hatch(cx + hw * 0.55, -wh + 1.8, hw * 0.45 - 0.5, wh - 2.8, 4, S.inkSoft);
      // tailrace water leaving the building
      s += `<path d="M${K.f(K.X(cx + hw))} ${K.f(K.Y(-1.5))} Q${K.f(K.X(cx + hw + 8))} ${K.f(K.Y(1))} ${K.f(K.X(cx + hw + 16))} ${K.f(K.Y(4))}" fill="none" ${K.base(0.7, S.water)}/>`;
      s += `<path d="M${K.f(K.X(cx + hw + 1))} ${K.f(K.Y(0.5))} Q${K.f(K.X(cx + hw + 9))} ${K.f(K.Y(3))} ${K.f(K.X(cx + hw + 15))} ${K.f(K.Y(6))}" fill="none" ${K.base(0.45, S.water)}/>`;
      // pole for an outgoing line
      const pu = cx + hw + 6;
      s += line(pu, 0, pu, -14, 0.7); s += line(pu - 2, -13, pu + 2, -13, 0.45);
      s += `<path d="M${K.f(K.X(pu + 2))} ${K.f(K.Y(-13))} Q${K.f(K.X(pu + 10))} ${K.f(K.Y(-10))} ${K.f(K.X(pu + 18))} ${K.f(K.Y(-16))}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
      s += K.ground(30);
      return G(s);
    },

    // 2–3 electricity pylons with catenary wires, climbing the slope. opts.count (2–3), opts.gap (default 40)
    pylonLine(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, dot } = K;
      const n = Math.min(3, Math.max(2, (opts && opts.count) || 3)), gap = (opts && opts.gap) || 40;
      let s = '';
      const py = [];
      let u = -((n - 1) / 2) * gap;
      let gy = R(-1, 1);
      for (let i = 0; i < n; i++) {
        const h = R(26, 40), hw = R(3.6, 5), tw = R(0.9, 1.4), arm1 = R(5.5, 8), arm2 = R(4, 6);
        const ins = R(1.6, 2.4);                                                  // insulator string length
        py.push({ u, gy, h, arm1, arm2, ins, a1: 4.5, a2: 4.5 + R(5, 7) });
        // the lattice: two tapering legs, horizontal members at growing intervals, and ONE diagonal per
        // panel, alternating, so its angle changes with the panel's width — a real lattice, not an X-chain
        const wAt = t => hw - (hw - tw) * t;
        s += line(u - hw, gy, u - tw, gy - h, 0.7);
        s += line(u + hw, gy, u + tw, gy - h, 0.7);
        let t = 0, dir = rand() < 0.5 ? 1 : -1, panel = R(0.09, 0.12);
        while (t < 0.97) {
          const t2 = Math.min(0.98, t + panel);
          const w1 = wAt(t), w2 = wAt(t2), v1 = gy - h * t, v2 = gy - h * t2;
          if (t > 0) s += line(u - w1, v1, u + w1, v1, 0.45, S.inkSoft);
          s += line(u - dir * w1, v1, u + dir * w2, v2, 0.45, S.inkSoft);
          dir = -dir; t = t2; panel *= R(1.05, 1.2);
        }
        // cross-arms (two, the lower one longer) with insulator strings hanging from their ends
        [[py[i].a1, arm2], [py[i].a2, arm1]].forEach(o => {
          const v = gy - h + o[0];
          s += line(u - o[1], v, u + o[1], v, 0.7);
          [-1, 1].forEach(sd => { s += line(u + sd * (o[1] - 0.4), v, u + sd * (o[1] - 0.4), v + ins, 0.45); s += dot(u + sd * (o[1] - 0.4), v + ins * 0.45, 0.4); s += dot(u + sd * (o[1] - 0.4), v + ins, 0.35); });
        });
        // earth-wire peak
        s += line(u - tw, gy - h, u, gy - h - 2.6, 0.7); s += line(u + tw, gy - h, u, gy - h - 2.6, 0.7);
        // concrete feet
        [-1, 1].forEach(sd => s += line(u + sd * hw - 0.9, gy + 0.3, u + sd * hw + 0.9, gy + 0.3, 0.7));
        u += gap * R(0.82, 1.18);
        gy -= R(1.5, 5);                             // each pylon a little higher up-slope
      }
      // wires: from the foot of each insulator to the next pylon's, sagging in proportion to the span
      for (let i = 1; i < n; i++) {
        const a = py[i - 1], b = py[i];
        const spanL = b.u - a.u, sag = spanL * R(0.13, 0.19);
        [[-1, 'a1', 'arm2'], [1, 'a1', 'arm2'], [-1, 'a2', 'arm1'], [1, 'a2', 'arm1'], [0, null, null]].forEach(o => {
          const ax = a.u + o[0] * (o[2] ? a[o[2]] - 0.4 : 0), ay = o[1] ? a.gy - a.h + a[o[1]] + a.ins : a.gy - a.h - 2.6;
          const bx = b.u + o[0] * (o[2] ? b[o[2]] - 0.4 : 0), by = o[1] ? b.gy - b.h + b[o[1]] + b.ins : b.gy - b.h - 2.6;
          const sg = o[1] ? sag : sag * 0.8;
          s += `<path d="M${K.f(K.X(ax))} ${K.f(K.Y(ay))} Q${K.f(K.X((ax + bx) / 2))} ${K.f(K.Y((ay + by) / 2 + sg))} ${K.f(K.X(bx))} ${K.f(K.Y(by))}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
        });
      }
      return G(s);
    },

    // Cable car: a pylon, cable running up-slope, a gondola.
    cableCar(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, hatch, shadePoly } = K;
      let s = '';
      const ph = R(27, 33);
      // pylon (lattice A-frame)
      s += line(-4, 0, -1.5, -ph, 1.0); s += line(4, 0, 1.5, -ph, 1.0);
      { let t = 0, dir = rand() < 0.5 ? 1 : -1, panel = R(0.13, 0.17);            // lattice: rungs and one alternating diagonal per panel
        while (t < 0.96) { const t2 = Math.min(0.97, t + panel); const w1 = 4 - 2.5 * t, w2 = 4 - 2.5 * t2;
          if (t > 0) s += line(-w1, -ph * t, w1, -ph * t, 0.45, S.inkSoft);
          s += line(-dir * w1, -ph * t, dir * w2, -ph * t2, 0.45, S.inkSoft); dir = -dir; t = t2; panel *= R(1.0, 1.15); } }
      s += line(-6, -ph, 6, -ph, 0.7);
      // sheave wheels
      s += `<circle cx="${K.f(K.X(-5))}" cy="${K.f(K.Y(-ph - 1.5))}" r="${K.f(1.2 * k)}" fill="none" ${K.base(0.45)}/>`;
      s += `<circle cx="${K.f(K.X(5))}" cy="${K.f(K.Y(-ph - 1.5))}" r="${K.f(1.2 * k)}" fill="none" ${K.base(0.45)}/>`;
      // cables: down-left to valley and up-right to summit, slight sag
      s += `<path d="M${K.f(K.X(-5))} ${K.f(K.Y(-ph - 2.5))} Q${K.f(K.X(-26))} ${K.f(K.Y(-18))} ${K.f(K.X(-46))} ${K.f(K.Y(-12))}" fill="none" ${K.base(0.7)}/>`;
      s += `<path d="M${K.f(K.X(5))} ${K.f(K.Y(-ph - 2.5))} Q${K.f(K.X(24))} ${K.f(K.Y(-ph - 10))} ${K.f(K.X(46))} ${K.f(K.Y(-ph - 28))}" fill="none" ${K.base(0.7)}/>`;
      s += `<path d="M${K.f(K.X(-5))} ${K.f(K.Y(-ph - 0.5))} Q${K.f(K.X(-26))} ${K.f(K.Y(-16))} ${K.f(K.X(-46))} ${K.f(K.Y(-10))}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
      // gondola hanging on the lower cable, going up
      const t = R(0.35, 0.6);
      const gx = -5 + (-46 + 5) * t, gy = (1 - t) * (1 - t) * (-ph - 2.5) + 2 * (1 - t) * t * -18 + t * t * -12;
      s += line(gx, gy, gx + 0.4, gy + 5, 0.7);
      s += poly([[gx - 4, gy + 5], [gx - 4.5, gy + 12], [gx + 4.5, gy + 12], [gx + 4, gy + 5]], 0.01, 'none', S.paper, true);
      s += shadePoly([[gx + 1, gy + 5], [gx + 1, gy + 12], [gx + 4.5, gy + 12], [gx + 4, gy + 5]], 0.1);
      s += poly([[gx - 4, gy + 5], [gx - 4.5, gy + 12], [gx + 4.5, gy + 12], [gx + 4, gy + 5]], 1.0);
      s += poly([[gx - 3, gy + 6], [gx - 3, gy + 8.5], [gx + 3, gy + 8.5], [gx + 3, gy + 6]], 0.01, 'none', S.ink, true, ' fill-opacity="0.4"');   // window band
      s += `<circle cx="${K.f(K.X(gx))}" cy="${K.f(K.Y(gy - 0.4))}" r="${K.f(0.9 * k)}" fill="${S.paper}" ${K.base(0.45)}/>`;
      // concrete foot
      s += poly([[-6, 0], [-5, -2.5], [5, -2.5], [6, 0]], 0.7, null, S.paper, true);
      s += K.ground(14);
      return G(s);
    },

    // Construction crane over a half-built block.
    crane(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, hatch, shadePoly, wall, opening } = K;
      let s = '';
      // half-built block: walls to varying heights, dark openings, rebar
      const lh = R(14, 18), rh = R(9, 12), sil = [[-6, 0], [-6, -lh], [6, -lh], [6, -rh], [20, -rh], [20, 0]];
      s += poly(sil, 0.01, 'none', S.paper, true);
      s += poly(sil, 0.01, 'none', wall, true);
      s += shadePoly([[12, 0], [12, -rh], [20, -rh], [20, 0]], 0.07);
      s += line(-6, -8, 20, -8, 0.45, S.inkSoft);
      [[-4, -2], [0.5, -2], [-4, -10], [0.5, -10], [9, -2], [14, -2]].forEach(p => { if (p[1] - 4 > -Math.min(lh, p[0] > 6 ? rh : lh) + 0.5) s += opening(p[0], p[1], 2.5, 4, 0.6); });
      s += poly(sil, 1.0);
      s += hatch(13, -rh + 1, 6.5, rh - 2, 3, S.inkSoft);
      for (let i = 0; i < 4; i++) s += line(-4 + i * 2.6, -lh, -4 + i * 2.6 + j(0.4), -lh - 3 - rand() * 2, 0.45, S.inkSoft);
      // crane mast (lattice) behind the block
      const mx = 24, mh = R(38, 44);
      s += line(mx - 1.5, 0, mx - 1.5, -mh, 0.7); s += line(mx + 1.5, 0, mx + 1.5, -mh, 0.7);
      for (let z = 0; z * 4 < mh - 2; z++) s += line(mx - 1.5, -z * 4, mx + 1.5, -z * 4 - 4, 0.45, S.inkSoft);
      // jib and counter-jib
      const jl = R(22, 28);
      s += line(mx - jl, -mh, mx + 9, -mh, 0.7);
      s += line(mx - jl, -mh - 1.5, mx + 9, -mh - 1.5, 0.45, S.inkSoft);
      for (let u = mx - jl + 2; u < mx + 8; u += 3.5) s += line(u, -mh, u + 1.8, -mh - 1.5, 0.45, S.inkSoft);
      s += line(mx, -mh, mx, -mh - 6, 0.7);
      s += line(mx, -mh - 6, mx - jl + 2, -mh - 1.5, 0.45, S.inkSoft); s += line(mx, -mh - 6, mx + 8, -mh - 1.5, 0.45, S.inkSoft);
      // counterweight
      s += poly([[mx + 5, -mh + 2], [mx + 5, -mh], [mx + 9, -mh], [mx + 9, -mh + 2]], 0.7, null, S.ink, true);
      // trolley + hook + load
      const tu = mx - jl * R(0.45, 0.75), lv = -R(18, 26);
      s += line(tu, -mh, tu, lv, 0.45, S.inkSoft);
      s += poly([[tu - 2, lv], [tu - 2, lv + 4], [tu + 2, lv + 4], [tu + 2, lv]], 0.7, null, S.paper, true);
      // pile of materials
      s += K.stones(-16, -3, 8, 2.5, 5);
      s += K.ground(30);
      return G(s);
    },

    // Arched tunnel portal with a road going in.
    tunnelPortal(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, hatch, shadePoly, wall, stones } = K;
      let s = '';
      // rock face around the portal
      s += poly([[-30, 2], [-24, -6], [-20, -16], [-12, -22], [0, -25], [12, -23], [20, -17], [26, -8], [30, 1]], 0.7, S.inkSoft);
      s += hatch(-24, -16, 9, 11, 4, S.inkSoft, -1);
      s += hatch(13, -20, 10, 13, 6, S.inkSoft);
      // portal masonry frame
      s += poly([[-13, 0], [-13, -18], [13, -18], [13, 0]], 0.01, 'none', S.paper, true);
      s += poly([[-13, 0], [-13, -18], [13, -18], [13, 0]], 0.01, 'none', wall, true);
      s += poly([[-13, 0], [-13, -18], [13, -18], [13, 0]], 1.0);
      s += line(-14, -18, 14, -18, 0.7, S.inkSoft);
      // arch opening: dark inside, deepening to the crown
      const arch = `M${K.f(K.X(-8))} ${K.f(K.Y(0))} L${K.f(K.X(-8))} ${K.f(K.Y(-9))} C${K.f(K.X(-8))} ${K.f(K.Y(-16))} ${K.f(K.X(8))} ${K.f(K.Y(-16))} ${K.f(K.X(8))} ${K.f(K.Y(-9))} L${K.f(K.X(8))} ${K.f(K.Y(0))}Z`;
      s += `<path d="${arch}" fill="${S.ink}" fill-opacity="0.3" ${K.base(1.0)}/>`;
      for (let i = 0; i < 9; i++) { const u = -7 + i * 1.75; const top = Math.abs(u) < 5 ? -14.5 + Math.abs(u) * 0.5 : -9 - (8 - Math.abs(u)) * 1.6; s += line(u, top + 1 + R(0, 1.5), u, -0.5, 0.45, S.ink); }
      // voussoirs
      for (let i = 0; i < 7; i++) { const a = Math.PI * (1 + i / 6); const cy = -9; const r1 = 8, r2 = 10.5; s += line(Math.cos(a) * r1, cy + Math.sin(a) * r1 * 0.85, Math.cos(a) * r2, cy + Math.sin(a) * r2 * 0.85, 0.45, S.inkSoft); }
      s += stones(-12.5, -16, 4, 14, 4); s += stones(8.5, -16, 4, 14, 4);
      s += hatch(9.5, -16, 3, 15, 3, S.inkSoft);
      // road running in, widening to the foreground
      s += poly([[-7, 0], [-14, 14]], 0.7, S.inkSoft); s += poly([[7, 0], [14, 14]], 0.7, S.inkSoft);
      for (let i = 0; i < 4; i++) { const v = 3 + i * 3; s += line(-1, v, 1, v, 0.45, S.inkSoft); }
      s += K.ground(30);
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
      const edge = off => {
        let d = 'M' + P(legs[0][0], legs[0][1] + off);
        d += 'L' + P(legs[0][2], legs[0][3] + off);
        d += `A${K.f((r + off) * k)} ${K.f((r + off) * k)} 0 0 ${K.sx > 0 ? 0 : 1} ` + P(legs[1][0], legs[1][1] + off);
        d += 'L' + P(legs[1][2], legs[1][3] + off);
        d += `A${K.f((r - off) * k)} ${K.f((r - off) * k)} 0 0 ${K.sx > 0 ? 1 : 0} ` + P(legs[2][0], legs[2][1] + off);
        d += 'L' + P(legs[2][2], legs[2][3] + off);
        return d;
      };
      s += `<path d="${edge(-hw)}" fill="none" ${K.base(0.7)}/>`;
      s += `<path d="${edge(hw)}" fill="none" ${K.base(0.7)}/>`;
      // retaining wall ticks below the downhill edge of each leg
      legs.forEach(L => {
        const n = 9;
        for (let t = 0; t < n; t++) {
          const f = (t + 0.5) / n; const u = L[0] + (L[2] - L[0]) * f, v = L[1] + (L[3] - L[1]) * f + hw;
          s += line(u, v, u - 0.6 + j(0.3), v + 1.6 + rand() * 1.4, 0.45, S.inkSoft);
        }
      });
      // marker stones on the outside of the bends
      s += line(31.5, -13.5, 31.7, -15.5, 0.7); s += line(31.5, -17.5, 31.7, -19.5, 0.7); s += line(-31.5, -33.5, -31.7, -35.5, 0.7); s += line(-31.5, -37.5, -31.7, -39.5, 0.7);
      return G(s);
    },

    // Small bus / lorry on a road.
    bus(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, shadePoly, hatch } = K;
      let s = '';
      // road patch
      s += line(-24, 1.5, 24, 0.5, 0.45, S.inkSoft); s += line(-22, 4.5, 22, 3.5, 0.45, S.inkSoft);
      // body, bonnet forward (towards +u)
      const body = [[-14, -2], [-14, -12], [-12, -13.5], [6, -13.5], [8, -12], [12, -8], [14, -5], [14, -2]];
      s += poly(body, 0.01, 'none', S.paper, true);
      s += shadePoly([[-14, -2], [-14, -7], [14, -5], [14, -2]], 0.08);
      s += poly(body, 1.0);
      // windows: dark glass
      const nw = rand() < 0.5 ? 4 : 3, ww = 17 / nw;
      for (let i = 0; i < nw; i++) { const u = -12.5 + i * ww; s += poly([[u, -8], [u, -12], [u + ww - 1, -12], [u + ww - 1, -8]], 0.01, 'none', S.ink, true, ' fill-opacity="0.4"'); }
      s += poly([[7, -11.5], [9.5, -8.5], [11, -8]], 0.45);
      // wheels
      [[-9, -1.5], [9, -1.5]].forEach(p => { s += `<circle cx="${K.f(K.X(p[0]))}" cy="${K.f(K.Y(p[1]))}" r="${K.f(2.4 * k)}" fill="${S.paper}" ${K.base(1.0)}/>`; s += `<circle cx="${K.f(K.X(p[0]))}" cy="${K.f(K.Y(p[1]))}" r="${K.f(0.9 * k)}" fill="none" ${K.base(0.45)}/>`; });
      // roof rack with luggage
      s += line(-12, -14, 5, -14, 0.7); s += poly([[-10, -14], [-9, -17], [-2, -17], [-1, -14]], 0.45); if (rand() < 0.7) s += poly([[-2, -14], [-1.5, -16], [4, -16], [4.5, -14]], 0.45);
      s += hatch(-6, -7, 19, 4, 5, S.inkSoft);
      return G(s);
    },

    // Tent: ridge tent in three-quarter view, guyed out, a stone on a peg.
    tent(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, shadePoly, hatch } = K;
      let s = '';
      // front gable + right side receding to rear gable
      const th = R(12, 14), tl = R(20, 23);
      const A = [0, -th], B = [11, -th + 1.5], FL = [-12, 0], FR = [12, 0], BR = [tl, 0.8];
      s += poly([FL, A, FR], 0.01, 'none', S.paper, true);
      s += poly([A, B, BR, FR], 0.01, 'none', S.paper, true);
      s += shadePoly([A, B, BR, FR], 0.08);
      s += poly([FL, A, FR], 1.0);
      s += poly([A, B, BR, FR], 0.7);
      s += line(B[0], B[1], tl - 2, 0.5, 0.45, S.inkSoft);      // rear edge just showing
      // door flaps (one thrown open)
      const open = rand() < 0.7;
      s += line(-0.5, -th + 1.5, -6, -0.5, 0.45, S.inkSoft); s += line(0.5, -th + 1.5, 4, -0.5, 0.45, S.inkSoft);
      if (open) s += `<path d="M${K.f(K.X(-6))} ${K.f(K.Y(-0.5))} Q${K.f(K.X(-3))} ${K.f(K.Y(-5))} ${K.f(K.X(-2))} ${K.f(K.Y(-9))}" fill="none" ${K.base(0.45, S.inkSoft)}/>`;
      // fabric wrinkles on the shaded side
      s += hatch(7, -th + 3, 9, th - 4, 4, S.inkSoft);
      // guy lines + pegs
      s += line(0, -th, -18, 1, 0.45, S.inkSoft); s += line(-18, 1, -18.6, -0.6, 0.7);
      s += line(11, -th + 1.5, tl - 3, -2.5, 0.45, S.inkSoft); s += line(tl - 3, -2.5, tl - 2.4, -3.8, 0.7);
      s += line(11, -th + 1.5, 2, -2, 0.45, S.inkSoft);
      s += K.ground(26);
      return G(s);
    },

    // Memorial cross on a cairn: marker where a glacier once reached.
    memorialCross(ctx, x, y, k, opts) {
      const K = kit(ctx, x, y, k, opts);
      const { S, rand, R, poly, line, j, dot, hatch } = K;
      let s = '';
      // cairn: one irregular heap silhouette, knocked out, then a few internal stone lines
      const cw = R(6, 8), chh = R(5.5, 7.5);
      const heap = [];
      const nPts = 7;
      for (let i = 0; i <= nPts; i++) {
        const t = i / nPts;                          // left foot → right foot over the top
        const ang = Math.PI * (1 - t) + j(0.12);
        const rr = 1 + R(-0.2, 0.14);
        heap.push([Math.cos(ang) * cw * rr, -Math.sin(ang) * chh * rr * (0.75 + 0.25 * Math.sin(ang))]);
      }
      heap[0] = [-cw, 0.3]; heap[nPts] = [cw * R(0.85, 1.1), 0.3];
      s += poly(heap, 0.01, 'none', S.paper, true);
      s += poly(heap, 1.0);
      // individual stones inside the heap: small angular outlines, larger at the foot
      const ns = Math.round(R(4, 6));
      for (let i = 0; i < ns; i++) {
        const u = R(-cw * 0.6, cw * 0.5), v = -R(0.6, chh * 0.55), r = R(0.9, 1.6) * (1 - Math.abs(v) / chh * 0.4);
        s += poly([[u - r, v + r * 0.3], [u - r * 0.5, v - r * 0.6], [u + r * 0.5, v - r * 0.55], [u + r, v + r * 0.2]], 0.45, S.inkSoft);
      }
      s += hatch(cw * 0.15, -chh * 0.7, cw * 0.7, chh * 0.65, 3, S.inkSoft);
      // a wedge stone propped at the foot on the shaded side
      s += poly([[cw - 1, 0.2], [cw + 0.5, -1.6], [cw + 2.4, -1], [cw + 2.8, 0.2]], 0.45, S.inkSoft);
      // cross: two strokes plus a hairline for the timber's thickness
      const ch = R(15, 19), arm = R(4.5, 5.5), armV = -chh + 1 - ch * 0.72;
      s += line(0, -chh + 1, 0.3, -chh + 1 - ch, 1.0); s += line(-arm, armV, arm + 0.5, armV - 0.3, 1.0);
      s += line(1.2, -chh + 0.5, 1.4, -chh + 2 - ch, 0.45, S.inkSoft);
      s += line(-arm + 0.4, armV + 1.1, arm + 0.6, armV + 0.8, 0.45, S.inkSoft);
      // small plaque on the upright
      if (rand() < 0.7) s += poly([[-1.7, armV + 5.5], [-1.7, armV + 7.8], [1.7, armV + 7.8], [1.7, armV + 5.5]], 0.45, null, S.paper, true);
      // the red survey tick: the glacier-reach mark
      s += line(-cw - 4, 0.5, -cw - 1, 0.5, 0.7, S.red);
      s += K.ground(14);
      return G(s);
    }
  });
})();
