/* ---------------------------------------------------------------------------
   MRI close-ups — the ink engine
   ---------------------------------------------------------------------------
   Every motif in the library draws with its own small helper kit, and every
   kit did the same three things that read as "made by code": constant-width
   strokes with round caps, white-noise jitter on each vertex, and a soft
   drop-shadow ellipse under the object. Rather than rewrite 85 motifs, the
   composer passes each motif's finished SVG through this engine, which

     - re-samples every stroke and bends it with SLOW wobble along its length
       (a hand drifts; it does not kink at control points),
     - quantises stroke weights to three engraved values — hairline, detail,
       contour — measured in SHEET units whatever the motif's own scale, so a
       hero drawn at 2.7× carries the same line as a hut drawn at 1×,
     - draws detail and contour lines as tapered filled ribbons, thinning at
       the ends the way a nib or graver does,
     - removes the translucent shadow ellipses (a screen idiom; a printed
       sheet has no feathered tone).

   The engine only touches elements it fully understands (path, line, circle,
   ellipse, rect, polygon, polyline with explicit fill/stroke); everything
   else passes through untouched. Groups with transform="translate() scale()"
   are tracked so the scale is accounted for.

   All tunable values sit in INK below.
--------------------------------------------------------------------------- */
(function () {
  const INK = {
    /* the three weights, in sheet units. At the print size of a third of an
       A4 page (≈150 mm for the 660-unit window) one unit is ≈0.23 mm, so the
       hairline is ≈0.10 mm — the practical floor for offset print. */
    weights: { hair: 0.45, detail: 0.72, contour: 1.08 },
    /* where a kit's own width falls into those classes (sheet units) */
    cut: { hair: 0.58, detail: 0.92 },
    /* wobble: amplitude and wavelength in sheet units */
    wobble: { amp: 0.21, lambda: 11, drift: 0.16 },
    /* re-sampling step along a stroke, sheet units */
    step: 1.1,
    /* taper: how far from a stroke's end the ribbon reaches full width, and
       what fraction of the width survives at the very tip */
    taper: { reach: 5.5, tip: 0.42, minLen: 3.0 },
    /* modulation of ribbon width along its length (slight pressure change) */
    modulate: 0.10,
    /* a nib's weight depends on direction: vertical (pulled) strokes this
       much heavier, horizontal (pushed) ones this much lighter */
    nib: 0.22,
    /* strokes lighter than this opacity stay plain strokes (texture, not line) */
    ribbonMinOpacity: 0.5,
    /* a circle is never drawn perfectly true */
    circleWarp: 0.028,
  };

  const f1 = v => (Math.round(v * 10) / 10).toFixed(1);

  /* ---- attribute parsing ------------------------------------------------- */
  function parseAttrs(s) {
    const a = {}; const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g; let m;
    while ((m = re.exec(s))) a[m[1]] = m[2];
    return a;
  }
  function attrStr(a) {
    return Object.keys(a).map(k => ` ${k}="${a[k]}"`).join('');
  }
  /* translate of a transform string (the kits only ever use translate+scale) */
  function translateOf(tr) {
    if (!tr) return [0, 0];
    const m = /translate\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+))?\s*\)/.exec(tr);
    return m ? [parseFloat(m[1]), parseFloat(m[2] || 0)] : [0, 0];
  }
  /* scale factor of a transform string: scale(sx sy) or scale(s) */
  function scaleOf(tr) {
    if (!tr) return 1;
    const m = /scale\(\s*(-?[\d.]+)(?:[\s,]+(-?[\d.]+))?\s*\)/.exec(tr);
    if (!m) return 1;
    return Math.abs(parseFloat(m[2] != null ? m[2] : m[1]));
  }

  /* ---- path data → list of subpaths (each a list of [x,y], closed flag) --- */
  function parsePath(d) {
    const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
    const subs = []; let cur = null;
    let x = 0, y = 0, sx = 0, sy = 0, cmd = null, i = 0;
    let lastCtrl = null, lastCmd = '';
    const num = () => parseFloat(tokens[i++]);
    const start = (px, py) => { cur = { pts: [[px, py]], closed: false }; subs.push(cur); sx = px; sy = py; };
    const lineTo = (px, py) => { if (!cur) start(x, y); cur.pts.push([px, py]); };
    const quadTo = (cx, cy, px, py) => {
      const x0 = x, y0 = y; const n = Math.max(3, Math.ceil(Math.hypot(px - x0, py - y0) / 1.5) + 2);
      for (let t = 1; t <= n; t++) { const u = t / n, v = 1 - u; lineTo(v * v * x0 + 2 * v * u * cx + u * u * px, v * v * y0 + 2 * v * u * cy + u * u * py); }
    };
    const cubicTo = (c1x, c1y, c2x, c2y, px, py) => {
      const x0 = x, y0 = y; const n = Math.max(4, Math.ceil(Math.hypot(px - x0, py - y0) / 1.5) + 3);
      for (let t = 1; t <= n; t++) { const u = t / n, v = 1 - u;
        lineTo(v * v * v * x0 + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * px,
               v * v * v * y0 + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * py); }
    };
    const arcTo = (rx, ry, rot, large, sweep, px, py) => {
      /* endpoint → centre parameterisation (SVG spec F.6.5), sampled */
      const x1 = x, y1 = y; if (rx === 0 || ry === 0) { lineTo(px, py); return; }
      const phi = rot * Math.PI / 180, cp = Math.cos(phi), sp = Math.sin(phi);
      const dx = (x1 - px) / 2, dy = (y1 - py) / 2;
      const x1p = cp * dx + sp * dy, y1p = -sp * dx + cp * dy;
      rx = Math.abs(rx); ry = Math.abs(ry);
      const lam = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
      if (lam > 1) { rx *= Math.sqrt(lam); ry *= Math.sqrt(lam); }
      const sign = large !== sweep ? 1 : -1;
      const numr = rx * rx * ry * ry - rx * rx * y1p * y1p - ry * ry * x1p * x1p;
      const den = rx * rx * y1p * y1p + ry * ry * x1p * x1p;
      const co = sign * Math.sqrt(Math.max(0, numr / den));
      const cxp = co * rx * y1p / ry, cyp = -co * ry * x1p / rx;
      const cx = cp * cxp - sp * cyp + (x1 + px) / 2, cy = sp * cxp + cp * cyp + (y1 + py) / 2;
      const ang = (ux, uy, vx, vy) => { const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy); return a; };
      const th1 = ang(1, 0, (x1p - cxp) / rx, (y1p - cyp) / ry);
      let dth = ang((x1p - cxp) / rx, (y1p - cyp) / ry, (-x1p - cxp) / rx, (-y1p - cyp) / ry);
      if (!sweep && dth > 0) dth -= 2 * Math.PI; else if (sweep && dth < 0) dth += 2 * Math.PI;
      const n = Math.max(4, Math.ceil(Math.abs(dth) * Math.max(rx, ry) / 1.5));
      for (let t = 1; t <= n; t++) { const th = th1 + dth * t / n;
        const ex = rx * Math.cos(th), ey = ry * Math.sin(th);
        lineTo(cp * ex - sp * ey + cx, sp * ex + cp * ey + cy); }
    };
    while (i < tokens.length) {
      const t = tokens[i];
      if (/[a-zA-Z]/.test(t)) { cmd = t; i++; if (cmd === 'Z' || cmd === 'z') { if (cur) { cur.closed = true; x = sx; y = sy; cur = null; } lastCmd = cmd; continue; } }
      if (cmd == null) break;
      const rel = cmd === cmd.toLowerCase();
      const C = cmd.toUpperCase();
      if (C === 'M') { let px = num(), py = num(); if (rel) { px += x; py += y; } x = px; y = py; start(x, y); cmd = rel ? 'l' : 'L'; }
      else if (C === 'L') { let px = num(), py = num(); if (rel) { px += x; py += y; } x = px; y = py; lineTo(x, y); }
      else if (C === 'H') { let px = num(); if (rel) px += x; x = px; lineTo(x, y); }
      else if (C === 'V') { let py = num(); if (rel) py += y; y = py; lineTo(x, y); }
      else if (C === 'Q') { let cx = num(), cy = num(), px = num(), py = num(); if (rel) { cx += x; cy += y; px += x; py += y; } quadTo(cx, cy, px, py); lastCtrl = [cx, cy]; x = px; y = py; }
      else if (C === 'T') { let px = num(), py = num(); if (rel) { px += x; py += y; }
        const c = (lastCtrl && /[QqTt]/.test(lastCmd)) ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y];
        quadTo(c[0], c[1], px, py); lastCtrl = c; x = px; y = py; }
      else if (C === 'C') { let a = num(), b = num(), c = num(), d2 = num(), px = num(), py = num(); if (rel) { a += x; b += y; c += x; d2 += y; px += x; py += y; } cubicTo(a, b, c, d2, px, py); lastCtrl = [c, d2]; x = px; y = py; }
      else if (C === 'S') { let c = num(), d2 = num(), px = num(), py = num(); if (rel) { c += x; d2 += y; px += x; py += y; }
        const c1 = (lastCtrl && /[CcSs]/.test(lastCmd)) ? [2 * x - lastCtrl[0], 2 * y - lastCtrl[1]] : [x, y];
        cubicTo(c1[0], c1[1], c, d2, px, py); lastCtrl = [c, d2]; x = px; y = py; }
      else if (C === 'A') { let rx = num(), ry = num(), rot = num(), large = num(), sweep = num(), px = num(), py = num(); if (rel) { px += x; py += y; } arcTo(rx, ry, rot, !!large, !!sweep, px, py); x = px; y = py; }
      else { i++; continue; }
      lastCmd = cmd;
      if (isNaN(x) || isNaN(y)) return null;
    }
    return subs.filter(s => s.pts.length >= 1);
  }

  /* ---- geometry helpers -------------------------------------------------- */
  function resample(pts, step, closed) {
    const src = closed ? pts.concat([pts[0]]) : pts;
    const out = [src[0].slice()];
    let carry = 0;
    for (let i = 1; i < src.length; i++) {
      const a = src[i - 1], b = src[i];
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (L === 0) continue;
      let s = step - carry;
      while (s < L) { const u = s / L; out.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]); s += step; }
      carry = L - (s - step);
      /* keep the real corner so the shape is not rounded off */
      const last = out[out.length - 1];
      if (Math.hypot(b[0] - last[0], b[1] - last[1]) > step * 0.35 || i === src.length - 1) out.push(b.slice());
      else { out[out.length - 1] = b.slice(); }
    }
    if (closed) out.pop();
    return out;
  }
  function lengthOf(pts, closed) {
    let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (closed && pts.length > 1) L += Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]);
    return L;
  }
  function normals(pts, closed) {
    const n = pts.length, out = [];
    for (let i = 0; i < n; i++) {
      const p = pts[(i - 1 + n) % n], q = pts[(i + 1) % n];
      let dx, dy;
      if (!closed && i === 0) { dx = pts[1][0] - pts[0][0]; dy = pts[1][1] - pts[0][1]; }
      else if (!closed && i === n - 1) { dx = pts[n - 1][0] - pts[n - 2][0]; dy = pts[n - 1][1] - pts[n - 2][1]; }
      else { dx = q[0] - p[0]; dy = q[1] - p[1]; }
      const L = Math.hypot(dx, dy) || 1;
      out.push([-dy / L, dx / L]);
    }
    return out;
  }
  /* slow wobble along the stroke: two sines of different wavelength plus one
     long drift, all phased at random per stroke. Closed strokes use integer
     periods so the wobble meets itself. */
  function wobbled(pts, closed, scale, rand) {
    const n = pts.length;
    if (n < 2) return pts;
    const L = lengthOf(pts, closed);
    /* no two strokes share a wavelength or an amplitude, and a short stroke
       is nearly straight — a hand is confident over a short distance and
       drifts over a long one */
    /* ...and a long ruled line (a cable, an eave, a wall top) drifts on a
       long wavelength with a small amplitude: the hand is steadiest when it
       has a straight edge or a long pull to follow */
    const Ls = L * scale;
    const lamS = INK.wobble.lambda * (0.7 + rand() * 0.8) * Math.max(1, Ls / 45);
    const conf = Math.min(1, Ls / 28);
    const longF = Ls > 60 ? Math.max(0.45, 60 / Ls) : 1;
    const ampS = INK.wobble.amp * (0.55 + rand() * 0.9) * (0.35 + 0.65 * conf) * longF;
    const lam = lamS / scale, amp = ampS / scale, drift = INK.wobble.drift * (0.5 + rand()) * conf / scale;
    if (L < lam * 0.35) return pts;
    const N = normals(pts, closed);
    const ph1 = rand() * 6.283, ph2 = rand() * 6.283, ph3 = rand() * 6.283;
    let k1 = 2 * Math.PI / (lam * (0.85 + rand() * 0.3)), k2 = 2 * Math.PI / (lam * 0.47);
    if (closed) { k1 = 2 * Math.PI * Math.max(1, Math.round(L / lam)) / L; k2 = 2 * Math.PI * Math.max(2, Math.round(L / (lam * 0.47))) / L; }
    const out = []; let s = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      let o = amp * (0.62 * Math.sin(s * k1 + ph1) + 0.38 * Math.sin(s * k2 + ph2));
      if (!closed) o += drift * Math.sin(Math.PI * s / L + ph3 * 0.25) * Math.min(1, L / (lam * 3));
      out.push([pts[i][0] + N[i][0] * o, pts[i][1] + N[i][1] * o]);
    }
    return out;
  }
  function pathD(pts, closed) {
    let d = 'M' + f1(pts[0][0]) + ' ' + f1(pts[0][1]);
    for (let i = 1; i < pts.length; i++) d += 'L' + f1(pts[i][0]) + ' ' + f1(pts[i][1]);
    return d + (closed ? 'Z' : '');
  }
  /* a tapered ribbon around a polyline: width (in local units) thins toward
     the ends and breathes a little along the way */
  function ribbon(pts, closed, w, scale, rand) {
    const n = pts.length, N = normals(pts, closed);
    const L = lengthOf(pts, closed);
    const reach = Math.min(INK.taper.reach / scale, L * 0.35);
    const ph = rand() * 6.283, kk = 2 * Math.PI / (INK.wobble.lambda * 1.7 / scale);
    const left = [], right = []; let s = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      let t = 1;
      if (!closed && reach > 0) { const e = Math.min(s, L - s); t = INK.taper.tip + (1 - INK.taper.tip) * Math.min(1, e / reach); }
      const dirW = 1 + INK.nib * (Math.abs(N[i][0]) - 0.5);   /* N is the normal: |Nx| ≈ 1 on a vertical stroke */
      const ww = w * t * dirW * (1 + INK.modulate * Math.sin(s * kk + ph)) / 2;
      left.push([pts[i][0] + N[i][0] * ww, pts[i][1] + N[i][1] * ww]);
      right.push([pts[i][0] - N[i][0] * ww, pts[i][1] - N[i][1] * ww]);
    }
    if (closed) {
      /* two rings: outer and inner, evenodd would leave a hole — draw as one
         path of the outer ring plus the reversed inner ring with nonzero fill
         so the band between them is painted */
      return pathD(left, true) + ' ' + pathD(right.slice().reverse(), true);
    }
    return pathD(left.concat(right.reverse()), true);
  }

  /* ---- element transform ------------------------------------------------- */
  function classify(w, scale) {
    const ws = w * scale;                     /* width in sheet units */
    if (ws < 0.2) return null;                 /* effectively no stroke */
    if (ws < INK.cut.hair) return 'hair';
    if (ws < INK.cut.detail) return 'detail';
    return 'contour';
  }

  function circlePts(cx, cy, rx, ry, rand) {
    const n = Math.max(14, Math.ceil((rx + ry) * Math.PI / 1.1));
    const ph = rand() * 6.283, ph2 = rand() * 6.283, out = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * 2 * Math.PI;
      const r = 1 + INK.circleWarp * (Math.sin(2 * a + ph) * 0.7 + Math.sin(3 * a + ph2) * 0.5);
      out.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    }
    return out;
  }

  /* the bounding box of the geometry seen by the last process() call —
     the composer uses it to size the ground contact under a motif */
  let lastBounds = null;
  const grow = (x, y) => {
    if (!lastBounds) lastBounds = { x0: x, y0: y, x1: x, y1: y };
    else { if (x < lastBounds.x0) lastBounds.x0 = x; if (x > lastBounds.x1) lastBounds.x1 = x; if (y < lastBounds.y0) lastBounds.y0 = y; if (y > lastBounds.y1) lastBounds.y1 = y; }
  };

  function process(svg, opts) {
    opts = opts || {};
    const rand = opts.rand || Math.random;
    const S = opts.S || {};
    lastBounds = null;
    const scaleStack = [1];
    const offStack = [[0, 0]];
    let scale = 1, off = [0, 0];
    const out = [];
    const re = /<(\/?)(g|path|line|circle|ellipse|rect|polygon|polyline)\b([^>]*?)(\/?)>/g;
    let last = 0, m;
    while ((m = re.exec(svg))) {
      out.push(svg.slice(last, m.index)); last = re.lastIndex;
      const closing = m[1] === '/', tag = m[2], attrs = parseAttrs(m[3]), selfClose = m[4] === '/';
      if (tag === 'g') {
        if (closing) { scaleStack.pop(); offStack.pop(); scale = scaleStack[scaleStack.length - 1] || 1; off = offStack[offStack.length - 1] || [0, 0]; out.push(m[0]); continue; }
        const s = scale * scaleOf(attrs.transform);
        const tr = translateOf(attrs.transform);
        const o = [off[0] + tr[0] * scale, off[1] + tr[1] * scale];
        scaleStack.push(s); offStack.push(o); scale = s; off = o; out.push(m[0]);
        if (selfClose) { scaleStack.pop(); offStack.pop(); scale = scaleStack[scaleStack.length - 1] || 1; off = offStack[offStack.length - 1] || [0, 0]; }
        continue;
      }
      if (closing) { out.push(m[0]); continue; }
      out.push(transform(tag, attrs, scale, rand, S, off) ?? m[0]);
    }
    out.push(svg.slice(last));
    return out.join('');
  }

  function transform(tag, a, scale, rand, S, off) {
    const stroke = a.stroke && a.stroke !== 'none' ? a.stroke : null;
    let fill = a.fill;
    if (fill === undefined) fill = (tag === 'path' || tag === 'line' || tag === 'polyline') ? 'none' : null;
    if (fill === null) return null;                       /* unknown default: leave alone */
    const sw = a['stroke-width'] !== undefined ? parseFloat(a['stroke-width']) : 1;
    const opacity = a.opacity !== undefined ? parseFloat(a.opacity) : 1;
    const fillOp = a['fill-opacity'] !== undefined ? parseFloat(a['fill-opacity']) : 1;
    const dashed = !!a['stroke-dasharray'];
    const hasFill = fill !== 'none';

    /* the drop shadow: a translucent ellipse with no line. Gone. */
    if (tag === 'ellipse' && !stroke && hasFill && (fillOp <= 0.14 || fill === S.shade)) return '';
    if (tag === 'circle' && !stroke && hasFill && fill === S.shade && fillOp <= 0.14) return '';
    /* flat translucent shade polygons (the kits' "shadePoly") end in ruler-
       straight edges on curved surfaces; the hatching already carries the
       shadow, so the wash goes too */
    if (!stroke && hasFill && fillOp <= 0.14 && (fill === S.shade || fill === '#10293c')) return '';
    if (a.transform && tag !== 'g') return null;          /* per-element transforms: leave alone */

    /* geometry */
    let subs = null;
    if (tag === 'path') subs = parsePath(a.d || '');
    else if (tag === 'line') subs = [{ pts: [[+a.x1, +a.y1], [+a.x2, +a.y2]], closed: false }];
    else if (tag === 'circle') subs = [{ pts: circlePts(+a.cx, +a.cy, +a.r, +a.r, rand), closed: true, round: true }];
    else if (tag === 'ellipse') subs = [{ pts: circlePts(+a.cx, +a.cy, +a.rx, +a.ry, rand), closed: true, round: true }];
    else if (tag === 'rect') { const x = +(a.x || 0), y = +(a.y || 0), w = +a.width, h = +a.height; subs = [{ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true }]; }
    else if (tag === 'polygon' || tag === 'polyline') {
      const nums = (a.points || '').match(/-?\d*\.?\d+/g) || []; const pts = [];
      for (let i = 0; i + 1 < nums.length; i += 2) pts.push([+nums[i], +nums[i + 1]]);
      subs = [{ pts, closed: tag === 'polygon' }];
    }
    if (!subs || !subs.length || subs.some(s => !s.pts.length || s.pts.some(p => isNaN(p[0]) || isNaN(p[1])))) return null;
    subs.forEach(s => s.pts.forEach(p => grow(off[0] + p[0] * scale, off[1] + p[1] * scale)));

    /* a filled shape with no line: a dot, a wash. Dots (tiny) stay; washes
       get the slow wobble so their edge is not ruler-straight. */
    const cls = stroke ? classify(sw, scale) : null;
    const keep = {};
    ['opacity', 'fill-opacity', 'stroke-opacity', 'class', 'transform'].forEach(k => { if (a[k] !== undefined) keep[k] = a[k]; });
    Object.keys(a).forEach(k => { if (k.startsWith('data-')) keep[k] = a[k]; });

    const step = INK.step / scale;
    const shaped = subs.map(s => {
      const tiny = lengthOf(s.pts, s.closed) < (INK.taper.minLen / scale) * 0.6;
      if (tiny || s.pts.length < 2) return { pts: s.pts, closed: s.closed, tiny: true };
      const r = resample(s.pts, step, s.closed);
      return { pts: wobbled(r, s.closed, scale, rand), closed: s.closed, tiny: false };
    });

    let out = '';
    if (hasFill) {
      const d = shaped.map(s => pathD(s.pts, s.closed || (tag !== 'path'))).join(' ');
      const fa = Object.assign({}, keep); delete fa['stroke-opacity'];
      out += `<path d="${d}" fill="${fill}" stroke="none"${attrStr(fa)}/>`;
    }
    if (stroke && cls) {
      const wSheet = INK.weights[cls];
      const wLocal = wSheet / scale;
      const sa = Object.assign({}, keep); delete sa['fill-opacity'];
      const asStroke = cls === 'hair' || dashed || opacity < INK.ribbonMinOpacity ||
                       (a['stroke-opacity'] !== undefined && parseFloat(a['stroke-opacity']) < INK.ribbonMinOpacity);
      if (asStroke) {
        const d = shaped.map(s => pathD(s.pts, s.closed)).join(' ');
        const extra = dashed ? ` stroke-dasharray="${a['stroke-dasharray']}"` : '';
        out += `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${f1(wLocal)}" stroke-linecap="butt" stroke-linejoin="round"${extra}${attrStr(sa)}/>`;
      } else {
        /* ribbon: each subpath its own tapered band */
        let d = '';
        shaped.forEach(s => {
          if (s.tiny) { d += (d ? ' ' : '') + ribbon(s.pts, s.closed, wLocal * INK.taper.tip * 1.3, scale, rand); return; }
          d += (d ? ' ' : '') + ribbon(s.pts, s.closed, wLocal, scale, rand);
        });
        /* the hairline stroke on the ribbon keeps anti-aliasing soft at the
           taper and hides the seam between the two rings of a closed band */
        if (sa.opacity !== undefined) { sa.opacity = sa.opacity; }
        out += `<path d="${d}" fill="${stroke}" stroke="${stroke}" stroke-width="${f1(0.12 / scale)}" stroke-linejoin="round" fill-rule="nonzero"${attrStr(sa)}/>`;
      }
    }
    return out;
  }

  window.MRI_INK = { process, INK, bounds: () => lastBounds };
})();
