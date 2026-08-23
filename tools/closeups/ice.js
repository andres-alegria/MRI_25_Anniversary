// ICE, SNOW AND HAZARDS motif group — ink-on-paper survey-plate drawings.
// Registers on window.MRI_MOTIFS. Classic script, no imports.
// Stroke weights are CLASSES (0.45 hairline / 0.7 secondary / 1.0 contour).
// The ink engine classifies a stroke by its width IN SHEET UNITS (width × the
// motif's scale), so G() below divides every width by k before handing the
// drawing over: a hairline stays a hairline on a hero drawn at k = 2.7.
// Nothing here jitters vertices; rand() is used for VARIATION between calls.
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
  // kept for signature compatibility: vertex jitter is the ink engine's job now
  function wob(rand, pts, a) { a = Math.min(a, 0.05); return pts.map(p => [p[0] + (rand() - 0.5) * a, p[1] + (rand() - 0.5) * a]); }
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
  // several short segments [[x1,y1,x2,y2],...] as ONE path element (keeps the element count down)
  function segs(list, stroke, w, extra) {
    let d = '';
    list.forEach(q => { d += 'M' + f(q[0]) + ' ' + f(q[1]) + ' L' + f(q[2]) + ' ' + f(q[3]) + ' '; });
    return path(d.trim(), stroke, w, extra);
  }
  // many dots as ONE path (stipple): each dot a very short stroke with round caps
  function stipple(list, stroke, w) {
    let d = '';
    list.forEach(q => { d += 'M' + f(q[0]) + ' ' + f(q[1]) + ' l' + f(q[2] || 0.3) + ' 0.1 '; });
    return path(d.trim(), stroke, w);
  }
  // n positions between a and b with IRREGULAR gaps (never an equal pitch)
  function spread(rand, n, a, b) {
    const w = []; let sum = 0;
    for (let i = 0; i < n; i++) { const v = 0.55 + rand() * 0.9; w.push(v); sum += v; }
    const out = []; let acc = 0;
    for (let i = 0; i < n; i++) { acc += w[i] / 2; out.push(a + (b - a) * acc / sum); acc += w[i] / 2; }
    return out;
  }
  // point and unit tangent at fraction t (0..1 of length) along a polyline
  function along(line, t) {
    const L = []; let tot = 0;
    for (let i = 1; i < line.length; i++) { const d = Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]); L.push(d); tot += d; }
    let s = t * tot;
    for (let i = 0; i < L.length; i++) {
      if (s <= L[i] || i === L.length - 1) {
        const u = L[i] ? Math.max(0, Math.min(1, s / L[i])) : 0, a = line[i], b = line[i + 1];
        const tx = (b[0] - a[0]) / (L[i] || 1), ty = (b[1] - a[1]) / (L[i] || 1);
        return { x: a[0] + (b[0] - a[0]) * u, y: a[1] + (b[1] - a[1]) * u, tx, ty };
      }
      s -= L[i];
    }
    return { x: line[0][0], y: line[0][1], tx: 1, ty: 0 };
  }
  // the classic scarp symbol: hachures hanging from a crest line, of VARYING length.
  //   line  crest polyline;  n  number of ticks;  Lmin..Lmax  length range
  //   dir   [dx,dy] downslope direction (unit-ish); null = right-hand normal of the line
  //   env   0..1 weight of a mid-line bulge (long in the middle, short at the ends)
  function hachures(ctx, line, n, Lmin, Lmax, stroke, w, dir, env) {
    const r = ctx.rand, list = [], ts = spread(r, n, 0.02, 0.98);
    ts.forEach((t, i) => {
      const p = along(line, t);
      let dx = dir ? dir[0] : -p.ty, dy = dir ? dir[1] : p.tx;
      if (dir) { dx = dx * 0.75 + -p.ty * 0.25; dy = dy * 0.75 + p.tx * 0.25; }   // lean a little off the crest's own normal
      const m = Math.hypot(dx, dy) || 1; dx /= m; dy /= m;
      const bulge = env ? 1 - env * (1 - Math.pow(Math.sin(Math.PI * t), 0.6)) : 1;
      const alt = i % 2 ? 0.45 + r() * 0.2 : 0.8 + r() * 0.2;            // long, short, long, short …
      const L = (Lmin + (Lmax - Lmin) * alt) * bulge;
      const o = 0.35;
      list.push([p.x + dx * o, p.y + dy * o, p.x + dx * (o + L), p.y + dy * (o + L)]);
    });
    return segs(list, stroke, w);
  }
  // a band of hatch strokes: n strokes starting along the segment (x,y)->(x+dx*n, y+dy*n),
  // each of length len at angle ang (default ~55 deg, down-right); spacing irregular, length varies
  function hatch(ctx, x, y, dx, dy, n, len, stroke, w, ang) {
    const a = ang == null ? Math.PI * 0.3 : ang, list = [];
    const ts = spread(ctx.rand, n, 0, n);
    for (let i = 0; i < n; i++) {
      const px = x + dx * ts[i], py = y + dy * ts[i];
      const L = len * (0.65 + ctx.rand() * 0.5);
      list.push([px, py, px + Math.cos(a) * L, py + Math.sin(a) * L]);
    }
    return segs(list, stroke, w);
  }
  // broken ground line — kept for signature compatibility; the composer ties the
  // motif to the sheet's own hachures, so this draws nothing
  function ground() { return ''; }
  // the outer group. Every stroke-width inside is snapped to its class and divided
  // by k so the ink engine sees the intended weight in sheet units at any scale.
  function G(x, y, k, flip, inner) {
    const kk = Math.max(0.2, k);
    inner = inner.replace(/stroke-width="([\d.]+)"/g, (m, v) => {
      const w = parseFloat(v); if (!(w > 0)) return m;
      const cls = w < 0.58 ? 0.45 : w < 0.92 ? 0.75 : 1.1;          // adjust the three line weights here (sheet units)
      return 'stroke-width="' + (cls / kk).toFixed(2) + '"';
    });
    return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(flip ? -k : k) + ' ' + f(k) + ')">' + inner + '</g>';
  }

  // ---- an observed boulder: four shape families --------------------------------
  // (x,y) = centre of the ground contact, w = width, h = height above ground.
  //   round    a rounded, weathered boulder
  //   angular  a sharp-cornered block with a pointed top
  //   slab     a flat slab lying on the ground, its thin edge face showing
  //   split    a block cracked in two, the right half dropped a little
  // The contour runs from the left shoulder over the top and down the shaded right
  // side; the lit left flank is open (a short hairline at most). Two to four hatch
  // strokes sit on the right flank. No contact shadow — the sheet grounds it.
  //   o.fam    one of the four names (default: random, never the same family twice running)
  //   o.fill   knock-out fill behind the rock (paper / paperHigh) — hides what is behind
  //   o.buried true for a stone sunk in the ground: widest at the ground line
  //   o.lean   -1..1 tilt of the top (default random)
  //   o.soft   draw with inkSoft (small / distant rubble)
  //   o.w      contour weight (default 1.0 / 0.7 for small ones)
  const FAMS = ['round', 'angular', 'slab', 'split'];
  let lastFam = '';
  function rock(ctx, x, y, w, h, o) {
    const r = ctx.rand, S = ctx.S; o = o || {};
    const ink = o.soft ? S.inkSoft : S.ink;
    let fam = o.fam;
    if (!fam) { const c = FAMS.filter(q => q !== lastFam); fam = c[Math.floor(r() * c.length)]; }
    lastFam = fam;
    const lean = o.lean != null ? o.lean : (r() - 0.5) * 0.8;
    const bur = !!o.buried, bw = bur ? 1.0 : 0.8;
    const top = y - h;
    const pts = [];
    let extra = '';
    if (fam === 'round') {
      const n = 7;
      for (let i = 0; i <= n; i++) {
        const a = Math.PI * (1 - i / n), sn = Math.sin(a), rr = 0.86 + r() * 0.14;
        pts.push([x + Math.cos(a) * w / 2 * rr * (bur ? 1 : bw + (1 - bw) * sn) + lean * h * 0.3 * sn, y - sn * h * rr * (bur ? 1.2 : 1)]);
      }
    } else if (fam === 'angular') {
      pts.push([x - w * 0.5 * bw, y], [x - w * 0.46 + lean * h * 0.2, y - h * (0.5 + r() * 0.15)],
               [x - w * (0.08 + r() * 0.18) + lean * h * 0.4, top], [x + w * (0.18 + r() * 0.14) + lean * h * 0.3, y - h * (0.68 + r() * 0.24)],
               [x + w * 0.48, y - h * (0.25 + r() * 0.12)], [x + w * 0.5 * bw, y]);
    } else if (fam === 'slab') {
      h = Math.min(h, w * 0.42);
      const t = lean * w * 0.12;
      pts.push([x - w * 0.5, y], [x - w * 0.48 + t, y - h * 0.55], [x - w * (0.28 + r() * 0.1) + t, y - h], [x + w * (0.42 + r() * 0.06), y - h * (0.78 + r() * 0.15)],
               [x + w * 0.5, y - h * 0.3], [x + w * 0.46, y]);
      // the slab's thin end face: a line along its front edge, a touch below the top
      extra += path(P([[x - w * 0.42 + t, y - h * 0.5], [x + w * 0.1, y - h * 0.36], [x + w * 0.47, y - h * 0.3]]), ink, 0.45);
    } else {   // split
      const cx = x + (r() - 0.5) * w * 0.2, drop = h * 0.12;
      pts.push([x - w * 0.5 * bw, y], [x - w * 0.44 + lean * h * 0.15, y - h * 0.55], [x - w * 0.2, top + h * 0.05], [cx - w * 0.04, top],
               [cx + w * 0.06, top + drop], [x + w * 0.3, top + drop + h * 0.05], [x + w * 0.48, y - h * 0.35], [x + w * 0.5 * bw, y]);
      const g = 0.1 + w * 0.03;
      const cL = [[cx - w * 0.03, top + 0.1], [cx - w * 0.01 + (r() - 0.5) * w * 0.08, y - h * 0.55], [cx + w * 0.02, y - h * 0.2], [cx, y]];
      const cR = cL.map((p, i) => [p[0] + g * (i === 0 ? 0.4 : 1), p[1] + (i === 0 ? 0.3 : 0)]);
      extra += fillPath(P(cL.concat(cR.slice().reverse()), true), ink, 'none', 0);
    }
    let s = '';
    if (o.fill) s += fillPath(P(pts, true), o.fill, 'none', 0);
    const tiny = w < 1.9;
    s += path(fam === 'round' ? Q(pts.slice(1)) : P(pts.slice(1)), ink, o.w || (tiny ? 0.7 : 1.0));
    if (!tiny && r() < 0.7) s += path(P([pts[0], [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]]), ink, 0.45);
    s += extra;
    // shadow hatch on the right flank: 2–4 strokes at ~55°, tightening toward the foot
    const A = pts[pts.length - 3], B = pts[pts.length - 1];
    const n = tiny ? 1 : 2 + Math.floor(r() * 3);
    const dxh = Math.cos(Math.PI * 0.3), dyh = Math.sin(Math.PI * 0.3), list = [];
    for (let i = 0; i < n; i++) {
      const u = 0.2 + 0.7 * Math.pow((i + 0.6) / n, 0.8);
      const fx = A[0] + (B[0] - A[0]) * u - w * 0.05, fy = A[1] + (B[1] - A[1]) * u - h * 0.03;
      let L = w * (0.22 + 0.2 * Math.sin(Math.PI * u)) * (0.8 + r() * 0.4);
      L = Math.min(L, (fy - top - h * 0.15) / dyh, (fx - (x - w * 0.4)) / dxh);
      if (L > w * 0.1) list.push([fx - dxh * L, fy - dyh * L, fx, fy]);
    }
    if (list.length) s += segs(list, ink, 0.45);
    return s;
  }
  // a field of rocks: list of {x,y,w,h,...}; far (higher up) ones first so near ones knock out behind
  function rocks(ctx, list) {
    return list.slice().sort((a, b) => a.y - b.y).map(q => rock(ctx, q.x, q.y, q.w, q.h, q)).join('');
  }
  // a dark tapered slit (crevasse) along a centre line; wmax = full width at mid-length.
  // The width is laid across the line's own normal, so a slit may run in any direction.
  // pieces: optional [[t0,t1],...] fractions to draw (gaps between = snow bridges)
  function slit(ctx, c, wmax, fill, pieces) {
    const m = c.length - 1;
    const nrm = i => { const a = c[Math.max(0, i - 1)], b = c[Math.min(m, i + 1)]; const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; };
    if (!pieces) {
      const up = c.map((p, j) => { const n = nrm(j), w = wmax * Math.sin(Math.PI * j / m) * 0.4; return [p[0] - n[0] * w, p[1] - n[1] * w]; });
      const lo = c.map((p, j) => { const n = nrm(j), w = wmax * Math.sin(Math.PI * j / m) * 0.6; return [p[0] + n[0] * w, p[1] + n[1] * w]; });
      return fillPath(Q(up, false) + ' ' + Q(lo.slice().reverse()).replace('M', 'L') + ' Z', fill, 'none', 0);
    }
    let d = '';
    pieces.forEach(pc => {
      const a = [], b = [];
      for (let j = 0; j <= 6; j++) {
        const t = pc[0] + (pc[1] - pc[0]) * j / 6, i0 = Math.min(m - 1, Math.floor(t * m)), u = t * m - i0;
        const ww = wmax * Math.sin(Math.PI * t) * Math.sin(Math.PI * j / 6), n = nrm(i0);
        const px = c[i0][0] + (c[i0 + 1][0] - c[i0][0]) * u, py = c[i0][1] + (c[i0 + 1][1] - c[i0][1]) * u;
        a.push([px - n[0] * ww * 0.4, py - n[1] * ww * 0.4]); b.push([px + n[0] * ww * 0.6, py + n[1] * ww * 0.6]);
      }
      d += Q(a) + ' ' + Q(b.slice().reverse()).replace('M', 'L') + ' Z ';
    });
    return fillPath(d.trim(), fill, 'none', 0);
  }

  window.MRI_MOTIFS = Object.assign(window.MRI_MOTIFS || {}, {

    // ---- crevasseField: a band of transverse crevasses crossing the tongue ------
    // Seen obliquely from the side/above. Each crevasse is a narrow tapered slit,
    // convex down-glacier, lit upper lip, shadowed lower lip; the set roughly
    // parallel with varying spacing and a few en-echelon offsets; flow lines on
    // the ice between; the slits shorten and die out at the band's edges.
    // At k > 1.8: marginal shear crevasses at ~45° and a few snow bridges.
    // opts.w / opts.h override footprint (default 36 x 24)
    crevasseField(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const W = o.w || 36, H = o.h || 24, big = k > 1.8;
      let s = '';
      // faint flow lines on the ice, running down-glacier, bowing with the flow
      const fl = [], nf = 3 + (big ? 3 : 0), xs = spread(r, nf, -W * 0.42, W * 0.42);
      xs.forEach(px => {
        const L = H * (0.25 + r() * 0.4), y0 = -H + 1 + r() * (H - L - 2), y1 = y0 + L, bow = (1 - Math.abs(px / (W / 2))) * 2;
        const lean = (px / (W / 2)) * 2.5;   // flow lines converge a little toward the centre line
        fl.push([[px - lean * 0.5, y0], [px + (r() - 0.5) * 1.2, (y0 + y1) / 2 + bow * 0.4], [px + lean * 0.5, y1]]);
      });
      if (big) fl.forEach(pts => { s += path(Q(pts), S.inkSoft, 0.45, ' opacity="0.4" stroke-dasharray="3 2.2"'); });
      // the crevasses themselves
      const n = 6 + (r() < 0.5 ? 1 : 0) + (big ? 2 : 0);
      const ys = spread(r, n, -H + 3, -3);
      const lips = [], shade = [];
      ys.forEach((yy, i) => {
        const env = 1 - Math.pow(Math.abs((yy + H / 2) / (H / 2)), 1.6) * 0.6;   // shorter at the band's edges
        const half = W / 2 * (0.3 + r() * 0.65) * env;
        const x0 = (r() - 0.5) * W * 0.35;
        const sag = (0.6 + r() * 3.2) * half / (W / 2);                      // convex down-glacier, some nearly straight
        const m = 6, c = [];
        for (let j = 0; j <= m; j++) { const t = j / m; c.push([x0 - half + 2 * half * t, yy + sag * Math.sin(Math.PI * t)]); }
        const wmax = (0.35 + r() * 0.35) * (big ? 0.8 : 1) * (0.6 + env * 0.4);   // adjust slit width here
        // a snow bridge: the slit interrupted by a gap (big only, some of them)
        let pieces = null;
        if (big && r() < 0.4) { const g = 0.3 + r() * 0.4, gw = 0.06 + r() * 0.06; pieces = [[0, g - gw], [g + gw, 1]]; }
        s += slit(ctx, c, wmax, S.ink, pieces);
        // lit upper lip (paper hairline) and the shadow lower lip (ink hairline, a touch below)
        lips.push(c.slice(2, m - 1).map(p => [p[0], p[1] - wmax * 0.45]));
        if (!big) shade.push(c.slice(1, m).map(p => [p[0] + 0.3, p[1] + wmax * 0.75]));
        // en-echelon: a short offset companion slit stepping off one end
        if (r() < 0.45) {
          const e = r() < 0.5 ? 0 : m, d = e === 0 ? -1 : 1, p = c[e], L = half * (0.25 + r() * 0.3);
          const c2 = []; for (let j = 0; j <= 4; j++) { const t = j / 4; c2.push([p[0] - d * L * 0.2 + d * L * t, p[1] + 1.2 + r() * 0.8 + sag * 0.3 * Math.sin(Math.PI * t)]); }
          s += slit(ctx, c2, wmax * 0.7, S.ink);
        }
      });
      lips.forEach(l => { s += path(Q(l), S.paperHigh, 0.45); });
      shade.forEach(l => { s += path(Q(l), S.ink, 0.45, ' opacity="0.6"'); });
      // hairline cracks where a crevasse is only just opening
      const cr = [], nc = 3 + (big ? 3 : 0);
      for (let i = 0; i < nc; i++) { const px = (r() - 0.5) * W * 0.8, py = -H * 0.12 - r() * H * 0.76, L = 2 + r() * 4; cr.push([px, py, px + L, py + (r() - 0.5) * 0.8]); }
      s += segs(cr, S.ink, 0.45);
      if (big) {
        // marginal shear crevasses: short slits angled ~45°, pointing up-glacier toward the centre
        [-1, 1].forEach(side => {
          const nm = 3 + Math.floor(r() * 2), ys2 = spread(r, nm, -H * 0.85, -H * 0.15);
          ys2.forEach(yy => {
            const L = 2.5 + r() * 3, x0 = side * (W / 2 - 1 - r() * 2);
            const c = []; for (let j = 0; j <= 4; j++) { const t = j / 4; c.push([x0 - side * L * t * 0.75, yy - L * t * 0.7]); }
            s += slit(ctx, c, 0.25 + r() * 0.15, S.ink);
          });
        });
      }
      return G(x, y, k, o.flip, s);
    },

    // ---- seracCliff: an icefall step — the tongue's surface breaks over a step into
    // a skyline of leaning pinnacles, deep clefts between them, tilted slabs and fallen
    // blocks at the foot. Open strokes: the lit left faces are left open, the right
    // faces carry the hatch, the clefts are the only fills.
    seracCliff(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const big = k > 1.8;
      let s = '';
      const edgeY = -10 - r() * 2;
      // the skyline: notches and peaks at irregular spacing, peaks of different heights,
      // some with a shoulder; the first and last teeth are lower (the step dies out)
      const sky = [[-28, edgeY + 1]];
      const teeth = [];
      let xx = -26 + r() * 2;
      while (xx < 24) {
        const w = 4 + Math.pow(r(), 1.2) * 12, env = 1 - Math.pow(Math.abs((xx + w / 2) / 27), 2.2) * 0.7;
        const hgt = (1.5 + Math.pow(r(), 0.8) * 7) * env, lean = (r() - 0.5) * w * 0.5;
        const px = xx + w * (0.35 + r() * 0.3) + lean, py = edgeY - hgt;
        const nL = sky[sky.length - 1];
        if (r() < 0.55) sky.push([xx + w * (0.15 + r() * 0.15), edgeY - hgt * (0.3 + r() * 0.4)]);      // a shoulder on the way up
        sky.push([px, py]);
        const kind = r();
        if (kind < 0.45) sky.push([px + w * 0.3, py + (r() - 0.3) * 1.5]);                                 // a flat, tilted top
        else if (kind < 0.55) sky.push([px + w * 0.2, py + hgt * 0.25], [px + w * 0.32, py + hgt * 0.1]);   // a split summit
        const nx = xx + w, ny = edgeY + (r() < 0.3 ? -hgt * 0.35 : r() * 3);   // some notches stay high (a saddle), others drop
        sky.push([nx, ny]);
        teeth.push({ x0: nL[0], peak: [px, py], notch: [nx, ny], w, hgt });
        xx = nx + r() * 1.2;
      }
      sky.push([28, edgeY + 1.5]);
      // the face: a knock-out behind the pinnacles (the tongue's own ice), then the skyline
      const foot = [[28, 1 + r() * 2], [22, 4 + r()], [14, 1.5 + r()], [6, 4.5], [-2, 2 + r()], [-10, 4.5 + r()], [-18, 2], [-24, 4 + r()], [-28, 1.5]];
      s += fillPath(P(sky.concat(foot), true), S.ice, 'none', 0);
      s += path(P(sky.slice(0, Math.floor(sky.length * 0.55))), S.ink, 1.0);
      s += path(P(sky.slice(Math.floor(sky.length * 0.55) - 1)), S.ink, 0.7);
      // the terrace above: a couple of crevasses running into the step, and the upper surface's edge
      [[-18, -28, -12, -21, -9, edgeY - 6], [5, -27, 9, -22, 11, edgeY - 5]].forEach(c => {
        s += slit(ctx, [[c[0], c[1]], [c[2], c[3]], [c[4], c[5]]], 0.5 + r() * 0.3, S.ink);
      });
      if (big) s += path(Q([[-26, edgeY - 9], [-14, edgeY - 10.5], [0, edgeY - 9.5], [14, edgeY - 11], [26, edgeY - 9]]), S.iceLine, 0.45);
      // each pinnacle: a cleft falling from its notch, hatch on its right face, a facet line on the left
      teeth.forEach((t, i) => {
        const p = t.peak, n = t.notch;
        // the cleft: a dark sliver from the notch down toward the foot, slanting with the lean
        const fy = r() < 0.5 ? 1.5 + r() * 1.5 : n[1] + 3 + r() * 5, dxc = (r() - 0.5) * 2;   // some clefts reach the foot, some die out half way
        if (r() < 0.75) s += slit(ctx, [[n[0], n[1] + 0.2], [n[0] + dxc * 0.5, (n[1] + fy) / 2], [n[0] + dxc, fy]], 0.7 + r() * 0.7, S.ink);
        // shaded right face: hatch strokes between the peak→notch edge and the foot, at ~60° (not every tooth)
        const nh = r() < 0.25 ? 0 : 2 + Math.floor(r() * 3) + (big ? 1 : 0), list = [], ts = spread(r, Math.max(1, nh), 0.12, 0.92);
        const bot = [n[0] + dxc * 0.6, fy];
        ts.forEach((u, j) => {
          const ax = p[0] + (bot[0] - p[0]) * u, ay = p[1] + (bot[1] - p[1]) * u;
          const L = t.w * (0.12 + 0.3 * Math.sin(Math.PI * u)) * (j % 2 ? 0.6 : 1) * (0.7 + r() * 0.5);
          list.push([ax - 0.4, ay + 0.2, ax - 0.4 - L * 0.5, ay + 0.2 + L * 0.87]);
        });
        if (nh) s += segs(list, S.ink, 0.45);
        // lit left face: one short facet hairline, not always
        if (r() < 0.6) s += path(P([[p[0] - t.w * 0.12, p[1] + t.hgt * 0.3], [t.x0 + t.w * 0.3, edgeY + 1.5 + r()]]), S.ink, 0.45);
        // ice foliation: a faint banding line across one tooth in three
        if (r() < 0.35) s += path(Q([[t.x0 + 0.8, edgeY - t.hgt * 0.3], [p[0], edgeY - t.hgt * 0.45 + r()], [n[0] - 0.6, edgeY - t.hgt * 0.2]]), S.iceLine, 0.45);
      });
      // the foot: fallen blocks of different families
      s += rocks(ctx, [{ x: 26 + r() * 3, y: 3, w: 4 + r(), h: 2.6 + r(), fill: S.ice, fam: 'angular', lean: 0.5 },
                       { x: -28 - r() * 2, y: 3.5, w: 3.2 + r(), h: 2.2, fill: S.ice, fam: 'split', lean: -0.4 },
                       { x: -2 + r() * 8, y: 4.5, w: 2.4, h: 1.6, fill: S.ice, fam: 'round' },
                       { x: 10 + r() * 6, y: 4, w: 3.6, h: 1.2, fill: S.ice, fam: 'slab', lean: 0.6 }]);
      return G(x, y - 4, k, o.flip, s);
    },

    // ---- moraineRidge: asymmetric ridge of rubble, hachured both flanks, few boulders ----
    // opts.w footprint width (default 50)
    moraineRidge(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const W = o.w || 50, H = 10 + r() * 2, big = k > 1.8;
      let s = '';
      // crest: peak left of centre so the right (shaded) flank is the steeper one
      const pk = 0.38 + r() * 0.08;
      const top = t => -H * Math.pow(Math.sin(Math.PI * (t < pk ? t / pk * 0.5 : 0.5 + (t - pk) / (1 - pk) * 0.5)), 0.85);
      const crest = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12; crest.push([-W / 2 + t * W, top(t) + (i > 0 && i < 12 ? (r() - 0.5) * 1.6 : 0)]); }
      s += fillPath(Q(crest, false) + ' L' + f(W / 2) + ' 0 L' + f(-W / 2) + ' 0 Z', ctx.MIX(S.paper, S.moraine, 0.16), 'none', 0);
      // the crest line, broken in three: the rubble crest of a moraine is never one clean line
      const b1 = 3 + Math.floor(r() * 2), b2 = 7 + Math.floor(r() * 2);
      s += path(Q(crest.slice(0, b1 + 1)), S.ink, 1.0);
      s += path(Q(crest.slice(b1 + 1, b2 + 1)), S.ink, 1.0);
      s += path(Q(crest.slice(b2 + 1)), S.ink, 0.7);
      // hachures on both flanks: dense and longer on the steep right side, sparse on the left
      const hl = [];
      spread(r, 10 + (big ? 5 : 0), pk + 0.05, 0.96).forEach((t, i) => { const px = -W / 2 + t * W, ty = top(t) + 0.5, L = (0 - ty) * (i % 2 ? 0.35 + r() * 0.2 : 0.7 + r() * 0.28); hl.push([px, ty, px + L * 0.5, ty + L]); });
      spread(r, 5 + (big ? 3 : 0), 0.04, pk - 0.05).forEach((t, i) => { const px = -W / 2 + t * W, ty = top(t) + 0.5, L = (0 - ty) * (i % 2 ? 0.3 + r() * 0.2 : 0.55 + r() * 0.3); hl.push([px, ty, px - L * 0.45, ty + L]); });
      s += segs(hl, S.ink, 0.45);
      if (big) s += path(Q([[-W * 0.4, -H * 0.2], [-W * 0.3, -H * 0.5], [-W * 0.18, -H * 0.75]]), S.moraine, 0.45);   // an older crest on the left flank
      // a few boulders only, of different shapes
      const list2 = [], nb = 4 + Math.floor(r() * 3);
      const fams = ['angular', 'round', 'slab', 'split', 'round', 'angular'];
      for (let i = 0; i < nb; i++) {
        const t = 0.08 + r() * 0.84, px = -W / 2 + t * W, ty = top(t), dep = r();
        const py = ty + dep * (0 - ty) * 0.95 + 0.4, w = 1.6 + r() * 1.4 + dep * 1.8;
        list2.push({ x: px, y: py, w, h: w * (0.5 + r() * 0.35), fill: S.paper, fam: fams[i], buried: dep > 0.6 && r() < 0.5, soft: w < 1.9 });
      }
      s += rocks(ctx, list2);
      // fine rubble: a few short dashes lying along the slope
      const rub = [];
      for (let i = 0; i < 5; i++) { const t = r(), px = -W / 2 + t * W, ty = top(t), py = ty + r() * (0 - ty); rub.push([px, py, px + 0.8 + r() * 0.6, py + (t > pk ? 0.4 : -0.3) * r()]); }
      s += segs(rub, S.moraine, 0.45);
      return G(x, y, k, o.flip, s);
    },

    // ---- rockGlacier: lobate tongue, transverse furrow-and-ridge arcs, steep hachured front ----
    // No closed outline: the front's crest is the only contour; the lateral furrows are
    // secondary lines that fade out toward the talus the tongue comes from (upper left).
    rockGlacier(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const big = k > 1.8;
      let s = '';
      // tongue axis: from the source (upper left) to the front centre (lower right)
      const src = [-18, -21], tip = [9 + r() * 2, 3];
      const dxA = tip[0] - src[0], dyA = tip[1] - src[1], LA = Math.hypot(dxA, dyA);
      const d = [dxA / LA, dyA / LA], nrm = [-d[1], d[0]];            // d = downslope, nrm = across
      const hw = t => 9 + 5 * Math.pow(Math.max(0, t), 0.7);                        // half-width grows toward the front
      const at = (t, u, bow) => {                                      // point at fraction t along the axis, u across (-1..1), bowed forward
        const bx = src[0] + dxA * t, by = src[1] + dyA * t, w = hw(t), fwd = bow * (1 - u * u);
        return [bx + nrm[0] * w * u + d[0] * fwd, by + nrm[1] * w * u + d[1] * fwd];
      };
      // the front: crest line (contour), arc convex downslope, and the talus slope below it
      // rendered with hachures of varying length — long in the middle, short toward the flanks
      const front = []; for (let j = 0; j <= 8; j++) front.push(at(1, -1 + j / 4, 5 + r() * 0.4));
      s += path(Q(front), S.ink, 1.0);
      s += hachures(ctx, front, 14 + (big ? 8 : 0), 1.5, 7, S.ink, 0.45, d, 0.7);
      // lateral furrows: each side a secondary line from about a third of the way down to the front
      [-1, 1].forEach(side => {
        const l = []; for (let j = 0; j <= 4; j++) l.push(at(0.6 + 0.4 * j / 4, side * (0.94 + (j === 4 ? 0 : r() * 0.05)), 0));
        s += path(Q(l), S.moraine, 0.45);
        s += path(Q([at(0.2, side * 0.86, 0), at(0.4, side * 0.9, 0), at(0.6, side * 0.94, 0)]), S.moraine, 0.45, ' stroke-dasharray="2.5 2"');
      });
      // transverse ridges: arcs convex toward the front, unevenly spaced, a short hatch on the downslope side of each
      const na = 5 + (big ? 3 : 0), ts = spread(r, na, 0.22, 0.9);
      ts.forEach((t, i) => {
        const span = 0.55 + 0.35 * t, bow = 3.5 + 3.5 * t + r() * 1.2, arc = [];
        const a0 = r() < 0.3 ? -span * 0.45 : -span, a1 = r() < 0.3 ? span * 0.5 : span;   // some ridges only span part of the tongue
        for (let j = 0; j <= 6; j++) arc.push(at(t, a0 + (a1 - a0) * j / 6, bow));
        s += path(Q(arc), S.ink, i % 2 ? 0.45 : 0.7);
        const hl = [], nh = 3 + Math.floor(r() * 3), us = spread(r, nh, 0.15, 0.85);
        us.forEach(u => { const p = along(arc, u), L = 0.8 + r() * 1.2; hl.push([p.x + d[0] * 0.3, p.y + d[1] * 0.3, p.x + d[0] * (0.3 + L), p.y + d[1] * (0.3 + L)]); });
        s += segs(hl, S.moraine, 0.45);
      });
      // boulders of different families on the surface, rubble where the tongue merges into the talus
      const bl = [], nb = 5 + (big ? 3 : 0), fams = ['angular', 'slab', 'round', 'split', 'angular', 'round', 'slab', 'split'];
      for (let i = 0; i < nb; i++) { const p = at(0.2 + r() * 0.72, (r() - 0.5) * 1.5, 1), w = 1.4 + r() * 1.6; bl.push({ x: p[0], y: p[1], w, h: w * (0.45 + r() * 0.3), fam: fams[i], soft: w < 1.9 }); }
      const pb = at(0.88, 0.25 + r() * 0.3, 2); bl.push({ x: pb[0], y: pb[1], w: 3 + r(), h: 1.8, fam: 'angular' });
      s += rocks(ctx, bl);
      const rub = [];
      for (let i = 0; i < 8 + (big ? 5 : 0); i++) { const p = at(-0.15 + r() * 0.3, (r() - 0.5) * 1.8, 0); rub.push([p[0], p[1], p[0] + 0.6 + r() * 0.8, p[1] + 0.2]); }
      s += segs(rub, S.moraine, 0.45);
      return G(x, y - 10, k, o.flip, s);
    },

    // ---- thawSlump: horseshoe headwall scarp with an exposed-ice band, a slumped mud tongue below ----
    thawSlump(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const big = k > 1.8;
      let s = '';
      // the headwall: an amphitheatre open downslope — crest line as the classic scarp
      // symbol, hachures hanging downslope of varying length
      const rim = [[-21, -6], [-21, -11], [-18, -16], [-11, -19.5 - r()], [-2, -21], [7, -20], [13 + r(), -16.5], [17, -11], [18, -5]];
      // the band of exposed ground ice under the back of the headwall (pale, flat) — not along the arms
      const back = rim.slice(2, 7);
      const band = back.map(p => [p[0] * 0.88, p[1] + 2.6]);
      s += fillPath(Q(back.concat(band.slice().reverse()), true), S.ice, 'none', 0);
      const ic = []; spread(r, 7 + (big ? 4 : 0), 0.1, 0.9).forEach(t => { const p = along(back, t); ic.push([p.x * 0.92, p.y + 0.8, p.x * 0.92 + 0.2, p.y + 2 + r() * 0.5]); });
      s += segs(ic, S.iceLine, 0.45);
      s += path(Q(rim), S.ink, 1.1);
      s += hachures(ctx, rim, 15 + (big ? 9 : 0), 1.5, 7.5, S.ink, 0.45, [0, 1], 0.45);
      // the slump floor narrows into a mud tongue that runs downslope to a lobate toe.
      // Its sides start short of the headwall arms (the floor is open), secondary weight;
      // the toe is the contour, hatched under; flow lines down the tongue
      const sideL = [[-16, -1], [-12, 4], [-9 - r() * 2, 9], [-8, 13]];
      const sideR = [[13, 0], [10, 5], [8 + r() * 2, 9], [7, 13]];
      const toe = [[7, 13], [5, 15 + r()], [2, 14.5], [0, 16.5], [-3, 15], [-6, 15.5 + r() * 0.5], [-8, 13]];
      s += path(Q(sideL.slice(0, 3)), S.moraine, 0.7);
      s += path(Q(sideR.slice(1)), S.moraine, 0.7);
      s += path(P([sideL[3], [sideL[2][0] - 0.3, sideL[2][1] + 2]]), S.moraine, 0.7);
      s += path(P([sideR[0], [sideR[1][0] + 0.5, sideR[1][1] - 1.5]]), S.moraine, 0.7);
      s += path(Q(toe), S.ink, 1.0);
      s += hachures(ctx, toe.slice().reverse(), 7 + (big ? 4 : 0), 1.0, 2.4, S.moraine, 0.45, [0, 1], 0.2);
      spread(r, 3 + (big ? 2 : 0), -6, 5).forEach(px => { s += path(Q([[px * 1.2, -3 + r() * 3], [px * 0.9 + (r() - 0.5), 5], [px * 0.7, 12 + r()]]), S.moraine, 0.45, ' stroke-dasharray="2.5 1.6"'); });
      // slumped turf blocks: tilted slabs lying on the floor below the headwall, and one at the arm
      s += rocks(ctx, [{ x: -7 + r() * 5, y: -9 + r() * 2, w: 3.4, h: 1.3, fam: 'slab', lean: -0.9 },
                       { x: 3 + r() * 5, y: -6 + r() * 2, w: 2.8, h: 1.1, fam: 'slab', lean: 0.8 },
                       { x: -14 + r() * 2, y: 2 + r(), w: 2.2, h: 1.0, fam: 'angular', soft: true }]);
      if (big) { const cr = []; for (let i = 0; i < 6; i++) { const px = -9 + r() * 18, py = -2 + r() * 12; cr.push([px, py, px + 1 + r(), py - 0.4]); } s += segs(cr, S.moraine, 0.45); }
      return G(x, y - 16, k, o.flip, s);
    },

    // ---- avalancheTrack: fracture line, fan of debris, snow blocks ----------
    avalancheTrack(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const big = k > 1.8;
      let s = '';
      // snow ground (wide soft wedge)
      s += fillPath(P([[-30, 2], [-14, -32], [8, -32], [30, 2]], true), S.paperHigh, 'none', 0);
      // crown fracture line at top: jagged bold ink with the crown wall hachured below it
      const crown = [[-14, -28], [-10, -29 - r()], [-6, -28.5], [-1, -29.5], [3, -29 + r()], [7, -30]];
      s += path(Q(crown), S.ink, 1.1);
      s += hachures(ctx, crown, 8 + (big ? 4 : 0), 1.2, 3, S.ink, 0.45, [0.05, 1], 0.3);
      // flank lines of the track opening downward
      s += path(Q([[-14, -27], [-18 - r() * 2, -16], [-24, -6], [-28, 0]]), S.inkSoft, 0.7);
      s += path(Q([[7, -29], [12 + r() * 2, -18], [18, -8], [24, 0]]), S.inkSoft, 0.7);
      // flow lines in the fan, unevenly spaced
      const fs = spread(r, 4 + (big ? 3 : 0), -20, 20);
      fs.forEach(tx => s += path(Q([[-4 + (tx + 4) * 0.2, -22 + r() * 3], [tx * 0.55, -12], [tx, -2]]), S.inkSoft, 0.45, ' stroke-dasharray="2.5 1.8"'));
      // debris: snow blocks of various shapes, heavier toward the bottom
      const bl = [], nb = 6 + (big ? 4 : 0);
      for (let i = 0; i < nb; i++) { const t = r(), w = 1.0 + t * 2.2 * r() + 0.6; bl.push({ x: (r() - 0.5) * (14 + t * 38), y: -19 + t * 19, w, h: w * (0.6 + r() * 0.3), fill: S.paperHigh, soft: w < 1.9 }); }
      bl.push({ x: -12 + r() * 2, y: 0.5, w: 4.2, h: 2.6 + r(), fill: S.paperHigh, fam: 'angular', lean: -0.5 });
      bl.push({ x: 4 + r() * 2, y: 1, w: 4.8, h: 2.4 + r(), fill: S.paperHigh, fam: 'slab' });
      bl.push({ x: 18 + r() * 2, y: 0, w: 3.4, h: 2.2 + r(), fill: S.paperHigh, fam: 'split', lean: 0.6 });
      s += rocks(ctx, bl);
      return G(x, y, k, o.flip, s);
    },

    // ---- cornice: overhanging snow lip on a ridge, in section ----------------
    cornice(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const big = k > 1.8;
      let s = '';
      // rock ridge: gentle windward slope from the left, steep craggy lee face dropping right
      const ridge = [[-32, 0], [-22, -6], [-12, -11], [-4, -14], [0, -15 - r()], [2, -12], [3, -8], [6, -4], [9, 0]];
      s += fillPath(Q(ridge, false) + ' Z', S.stone, 'none', 0);
      s += path(Q(ridge), S.ink, 1.0);
      // lee-face hachures (steep, shaded), of uneven length
      s += hachures(ctx, ridge.slice(4), 6 + (big ? 4 : 0), 1.6, 3.4, S.ink, 0.45, [0.8, 0.5], 0.2);
      // snow slab: thick on the windward side, sweeping over the crest into a lip
      // that curls down over the lee face; drawn as one closed profile
      const hook = 12 + r() * 3, drop = -14 + r() * 1.5;
      const snowTop = [[-32, -1], [-23, -7.5], [-14, -13], [-6, -17], [0, -19.5], [6, -20.5 - r()], [hook - 1, -19.5], [hook + 2, -17], [hook + 2, drop - 1], [hook - 0.5, drop + 1]];
      const snowUnder = [[hook - 4, drop - 1.5], [hook - 7, drop - 1.2], [hook - 9, drop - 0.5]];
      const prof = snowTop.concat(snowUnder, [[0, -15], [-4, -14], [-12, -11], [-22, -6], [-32, 0]]);
      s += fillPath(Q(prof, true), S.paperHigh, 'none', 0);
      s += path(Q(snowTop.concat(snowUnder)), S.ink, 1.0);
      // shadow under the lip: ink hatching on the underside, tightest at the hook
      const ul = spread(r, 6 + (big ? 3 : 0), 0, 1), ull = [];
      ul.forEach(t => { const px = hook - 8.5 + t * 8; const py = drop - 1.4 - t * 0.4; ull.push([px, py, px + 1.2 + t * 0.8, py + 0.9 + t * 0.6]); });
      s += segs(ull, S.ink, 0.45);
      // wind striae on the slab (diagonal, light), irregular
      const ws = spread(r, 5 + (big ? 3 : 0), 0, 1), wl = [];
      ws.forEach(t => { const px = -27 + t * 22, py = -4 - t * 12; wl.push([px, py, px + 3 + r() * 2, py - 2 - r()]); });
      s += segs(wl, S.inkSoft, 0.45);
      // tension crack behind the lip (dashed), and snow blown off the crest
      s += path(Q([[3 + r() * 2, -20.2], [4, -18], [3, -16]]), S.ink, 0.45, ' stroke-dasharray="1.2 0.9"');
      const pl = [];
      for (let i = 0; i < 5; i++) { const px = hook + 3 + r() * 8, py = -22 + r() * 7; pl.push([px, py, px + 1.5 + r() * 1.5, py - 0.4 + r() * 0.6]); }
      s += segs(pl, S.inkSoft, 0.45);
      return G(x, y, k, o.flip, s);
    },

    // ---- snowPit: an oblique trench dug in the snow — the rim as a parallelogram on the
    // surface, the section face (far wall) seen below the far rim, the floor, the right wall
    // shaded; spoil heap thrown out to the right, shovel on the left, a folding rule in red --
    snowPit(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const big = k > 1.8;
      let s = '';
      const W = 12 + r() * 2, D = 6 + r(), dx = 5, dy = 10;      // W width, D depth; (dx,dy) = offset of the far rim (viewed from the front-left, above)
      const L = -W / 2, R = W / 2;
      const u = (dy - D) / dy;                                    // where the walls' floor edges pass under the near rim
      // far wall (the section face), floor, right wall — all inside the rim
      s += fillPath(P([[L + dx, -dy], [R + dx, -dy], [R + dx, -dy + D], [L + dx, -dy + D]], true), S.paperHigh, 'none', 0);
      s += fillPath(P([[L + dx, -dy + D], [R + dx, -dy + D], [R + dx * (1 - u), 0], [L + dx * (1 - u), 0]], true), S.paper, 'none', 0);
      s += fillPath(P([[R, 0], [R + dx, -dy], [R + dx, -dy + D], [R + dx * (1 - u), 0]], true), S.paper, 'none', 0);
      s += hatch(ctx, R + dx * 0.75, -dy + 1.5, dx * 0.05, (D + 2) / 5, 5 + (big ? 2 : 0), dx * 0.5, S.ink, 0.45, 2.2);
      // edges: the far rim is the cut (heavy), the near rim lighter, inner edges secondary
      s += path(P([[L + dx, -dy], [R + dx, -dy]]), S.ink, 1.0);
      s += path(P([[L, 0], [L + dx, -dy]]), S.ink, 0.7);
      s += path(P([[R, 0], [R + dx, -dy]]), S.ink, 1.0);
      s += path(P([[L, 0], [R, 0]]), S.ink, 0.7);
      s += path(P([[L + dx, -dy + D], [R + dx, -dy + D], [R + dx, -dy]]), S.ink, 0.7);
      s += path(P([[R + dx, -dy + D], [R + dx * (1 - u), 0]]), S.ink, 0.45);
      s += path(P([[L + dx, -dy + D], [L + dx * (1 - u), 0]]), S.ink, 0.45);
      // snow surface around: faint uneven lines
      s += path(Q([[-24, -dy * 0.9], [-16, -dy * 0.95], [L + dx - 1, -dy - 0.2]]), S.inkSoft, 0.45);
      s += path(Q([[R + 1, 0.5], [18, 0.2], [24, 0.8]]), S.inkSoft, 0.45);
      // layers on the section face, at irregular depths and of different character
      const ly = spread(r, 3 + (big ? 2 : 0), -dy + 1.2, -dy + D - 1);
      ly.forEach((yy, i) => {
        const pts = [[L + dx + 0.5, yy], [L + dx + W * 0.35, yy + (r() - 0.5) * 0.5], [L + dx + W * 0.7, yy + (r() - 0.5) * 0.5], [R + dx - 0.5, yy]];
        if (i === 1) { s += path(Q(pts), S.ink, 0.7); s += path(Q(pts.map(q => [q[0], q[1] + 0.7])), S.ink, 0.45); }  // a hard crust: double line
        else if (i === 3) { const dl = []; for (let j = 0; j < 7 + (big ? 4 : 0); j++) { const px = L + dx + 1 + r() * (W - 2), py = yy + (r() - 0.5) * 1; dl.push([px, py, px + 0.5, py + 0.1]); } s += segs(dl, S.iceLine, 0.45); }  // depth hoar: loose grains
        else s += path(Q(pts), i === 0 ? S.iceLine : S.ink, 0.45);
      });
      // surveyor's red: a folding rule standing against the face
      s += ln(L + dx + 1.5, -dy + 0.3, L + dx + 1.5, -dy + D - 0.2, S.red, 0.7);
      for (let yy = -dy + 1.6; yy < -dy + D - 0.5; yy += 2) s += ln(L + dx + 1.5, yy, L + dx + 2.4, yy, S.red, 0.45);
      // spoil heap thrown out beside the pit, to the right
      const hx = R + dx + 1;
      const pile = [[hx, -dy + 3], [hx + 3, -dy - 1 - r()], [hx + 7, -dy - 2], [hx + 10.5, -dy - 0.2], [hx + 12, -dy + 3.5]];
      s += fillPath(Q(pile, false) + ' Z', S.paperHigh, 'none', 0);
      s += path(Q(pile), S.ink, 0.7);
      s += hatch(ctx, hx + 7, -dy - 1.2, 1.0, 0.6, 4, 1.8, S.ink, 0.45);
      // the shovel lying on the snow at the left: shaft, T-handle, rounded blade nearest the pit
      const sl = 8 + r() * 2, sy = -dy * 0.55;
      s += ln(L - 2, sy, L - 2 - sl, sy - 1.2, S.ink, 0.7);
      s += ln(L - 2 - sl, sy - 2.4, L - 2.2 - sl, sy, S.ink, 0.7);
      s += fillPath(Q([[L - 2.2, sy - 1.6], [L + 0.4, sy - 1.3], [L + 1.2, sy], [L + 0.2, sy + 1.1], [L - 2, sy + 1]], true), S.paper, S.ink, 0.7);
      s += hatch(ctx, L - 0.4, sy - 0.4, 0.3, 0.5, 2, 0.9, S.ink, 0.45);
      return G(x, y, k, o.flip, s);
    },

    // ---- debrisFlow: source scarp, channel with levees, lobate depositional fan ----
    debrisFlow(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const big = k > 1.8;
      let s = '';
      // the source: a small arcuate scarp at the top with hachures hanging from it
      const sx = -8 + r() * 4;
      const scarp = [[sx - 7, -31], [sx - 5, -34.5], [sx - 1, -36 - r()], [sx + 4, -35], [sx + 7, -32]];
      s += path(Q(scarp), S.ink, 1.0);
      s += hachures(ctx, scarp, 7 + (big ? 3 : 0), 1.2, 3.2, S.ink, 0.45, [0.1, 1], 0.5);
      // the channel: two roughly parallel banks running downslope with a bend
      const left = [[sx - 3.5, -31], [sx - 3, -24], [sx - 4.5 - r(), -17], [sx - 3, -11], [sx - 2, -6]];
      const right = [[sx + 3.5, -31], [sx + 4, -24], [sx + 3 - r(), -17], [sx + 5, -11], [sx + 6, -6]];
      s += fillPath(Q(left, false) + ' ' + Q(right.slice().reverse()).replace('M', 'L') + ' Z', ctx.MIX(S.paper, S.moraine, 0.1), 'none', 0);
      s += path(Q(left), S.ink, 0.7);
      s += path(Q(right), S.ink, 0.7);
      // levees: lines of rubble (dots and short dashes) along the outside of each bank, hatched outward
      [[left, -1], [right, 1]].forEach(q => {
        const bank = q[0], d = q[1], rub = [], st = [];
        const n = 12 + (big ? 8 : 0);
        spread(r, n, 0.05, 0.95).forEach(t => {
          const p = along(bank, t), ox = d * (1.4 + r() * 1.8), L = r() < 0.45 ? 0 : 0.7 + r() * 0.9;
          if (L) rub.push([p.x + ox, p.y, p.x + ox + L, p.y + (r() - 0.5) * 0.5]); else st.push([p.x + ox, p.y]);
        });
        s += segs(rub, S.moraine, 0.45);
        s += stipple(st.map(q => [q[0], q[1], 0.4 + r() * 0.3]), S.ink, 0.7);
        const shifted = bank.map(p => [p[0] + d * 2.2, p[1]]);
        s += hachures(ctx, shifted, 3 + (big ? 2 : 0), 0.7, 1.6, S.moraine, 0.45, [d * 0.9, 0.45], 0);
      });
      // flow lines inside the channel
      s += path(Q(left.map((p, j) => [p[0] + (right[j][0] - p[0]) * (0.35 + r() * 0.1), p[1] + 1])), S.moraine, 0.45, ' stroke-dasharray="2.5 1.8"');
      if (big) s += path(Q(left.map((p, j) => [p[0] + (right[j][0] - p[0]) * (0.65 + r() * 0.1), p[1] + 1.5])), S.moraine, 0.45, ' stroke-dasharray="2.5 1.8"');
      // the depositional fan: flow lines curving outward from the channel mouth, a stippled
      // surface, and a lobate front that is only a line of dots — no outline
      const mx = (left[4][0] + right[4][0]) / 2, my = -6;
      const ff = spread(r, 4 + (big ? 2 : 0), -1, 1);
      ff.forEach(u => {
        const ex = mx + u * (17 + r() * 4), ey = my + 11 + (1 - Math.abs(u)) * 3 + r() * 2;
        s += path(Q([[mx + u * 2, my - 1], [mx + u * 3, my + 4], [mx + u * 8, my + 8 + (1 - Math.abs(u)) * 1.5], [ex, ey]]), S.moraine, 0.45, ' stroke-dasharray="2 1.6"');
      });
      const lobes = 3, front = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, ang = Math.PI * (1 + t), R0 = 21 + r() * 1.5;
        const lob = 1 + 0.14 * Math.sin(t * Math.PI * lobes * 2 - Math.PI / 2);
        front.push([mx + Math.cos(ang) * R0 * lob * 1.05, my + 4 - Math.sin(ang) * R0 * lob * 0.62]);
      }
      // the front: dense stipple along it (two staggered rows), thinning out into the terrain
      const fs = [], fs2 = [];
      spread(r, 22 + (big ? 12 : 0), 0.02, 0.98).forEach(t => {
        const p = along(front, t), L = 0.7 + r() * 1.3, oy = (r() - 0.5) * 0.8;
        fs.push([p.x - p.tx * L / 2, p.y + oy - p.ty * L / 2, p.x + p.tx * L / 2, p.y + oy + p.ty * L / 2]);
        if (r() < 0.6) fs2.push([p.x + (r() - 0.5) * 1.5, p.y + 1.2 + r() * 1.8, 0.4 + r() * 0.5]);
      });
      s += segs(fs, S.ink, 0.7);
      s += stipple(fs2, S.ink, 0.7);
      const sp = [];
      for (let i = 0; i < 30 + (big ? 18 : 0); i++) { const u = (r() - 0.5) * 2, v = r(); const p = along(front, (u + 1) / 2); sp.push([mx + (p.x - mx) * v * 0.9, my + 1 + (p.y - my - 1) * v * 0.9, 0.4 + r() * 0.5]); }
      s += stipple(sp, S.moraine, 0.7);
      // boulders: a few in the channel, concentrated at the snout, of different families
      const bl = [
        { x: sx + 1 + r() * 2, y: -20 + r() * 4, w: 2.0 + r(), h: 1.2, fam: 'angular' },
        { x: sx - 1 + r() * 2, y: -9 + r() * 2, w: 2.2 + r(), h: 1.3, fam: 'round' },
        { x: mx - 9 + r() * 3, y: my + 12 + r() * 2, w: 3.2 + r(), h: 2.0, fam: 'split', fill: S.paper },
        { x: mx + 7 + r() * 3, y: my + 13 + r() * 2, w: 3.8 + r(), h: 2.2, fam: 'angular', fill: S.paper, lean: 0.4 },
        { x: mx - 1 + r() * 3, y: my + 14.5 + r(), w: 2.8 + r(), h: 1.3, fam: 'slab', fill: S.paper },
        { x: mx + 13 + r() * 3, y: my + 9 + r() * 2, w: 2.4, h: 1.5, fam: 'round', fill: S.paper, buried: true },
        { x: mx - 14 + r() * 3, y: my + 8 + r() * 2, w: 2.2, h: 1.4, fam: 'slab', fill: S.paper }
      ];
      if (big) bl.push({ x: mx + 3 + r() * 4, y: my + 5 + r() * 3, w: 1.8, h: 1.1, fam: 'angular', soft: true }, { x: mx - 6 + r() * 3, y: my + 4 + r() * 2, w: 1.6, h: 0.9, fam: 'round', soft: true });
      s += rocks(ctx, bl);
      return G(x, y - 10, k, o.flip, s);
    },

    // ---- landslideScar: arcuate scar with displaced mass below --------------
    landslideScar(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const big = k > 1.8;
      let s = '';
      // hillside contour lines (faint) to set the slope, unevenly spaced
      spread(r, 3, -27, -15).forEach(yy => {
        s += path(Q([[-30, yy + 4], [-22, yy + (r() - 0.5)], [-14, yy - 1], [-6, yy - 1 + (r() - 0.5)], [2, yy + 1], [12, yy + 4]]), S.inkSoft, 0.45, ' opacity="0.7"');
      });
      // main scarp: arcuate, bold, with hachures of varying length hanging from it
      const scarp = [[-22, -8], [-20, -15], [-14, -21 - r()], [-6, -24], [4, -23 + r()], [12, -19], [16, -12]];
      s += path(Q(scarp), S.ink, 1.1);
      s += hachures(ctx, scarp, 11 + (big ? 7 : 0), 1.8, 4.6, S.ink, 0.45, [0.2, 1], 0.45);
      // displaced mass: a hummocky body sliding down-right. No closed outline: a wash,
      // the steep toe as a contour, the top left open
      const wash = ctx.MIX(S.paper, S.moraine, 0.16);
      const mass = [[-16, -9], [-10, -13], [-2, -14.5], [6, -13], [13, -10], [20, -4], [26, 2], [22, 6], [12, 8], [0, 8.5], [-12, 7], [-22, 3]];
      s += fillPath(Q(mass, true), wash, 'none', 0);
      const toe = [[20, -4], [26 + r(), 2], [22, 6.5], [15, 6], [12, 8.5 + r()], [4, 8], [0, 9.5], [-8, 8.5], [-12, 7 + r()], [-20, 5], [-23, 2]];
      s += path(Q(toe), S.ink, 1.0);
      // hummocky surface: short arched strokes scattered over the mass
      const hm = [];
      for (let i = 0; i < 8 + (big ? 6 : 0); i++) { const px = -14 + r() * 34, py = -9 + r() * 14; hm.push([px, py, px + 1.2, py - 1 - r() * 0.6], [px + 1.2, py - 1 - r() * 0.6, px + 2.6 + r(), py + 0.2]); }
      s += segs(hm, S.moraine, 0.45);
      // the bared slide surface between scarp and mass: a few striae running downslope
      const st = [];
      spread(r, 4 + (big ? 3 : 0), -14, 8).forEach(px => st.push([px, -17 + Math.abs(px + 3) * 0.25, px + 1.5, -12.5 + Math.abs(px + 3) * 0.2]));
      s += segs(st, S.inkSoft, 0.45);
      // transverse cracks across the mass (back-tilted blocks), uneven
      spread(r, 3 + (big ? 2 : 0), -10, 10).forEach(px => {
        const py = -8 + (px + 10) * 0.15;
        s += path(Q([[px, py], [px + 3, py - 2 - r()], [px + 6 + r() * 2, py - 1]]), S.moraine, 0.7);
      });
      // hatch under the toe (shaded front)
      s += hachures(ctx, toe.slice(1, 10).reverse(), 9 + (big ? 4 : 0), 1.0, 2.4, S.moraine, 0.45, [0.1, 1], 0.2);
      // blocks on the mass, back-tilted, of different families
      const bl = [], fams = ['slab', 'angular', 'split', 'round', 'slab', 'angular', 'round', 'split'];
      for (let i = 0; i < 4 + (big ? 3 : 0); i++) { const w = 1.5 + r() * 1.4; bl.push({ x: -10 + r() * 28, y: -5 + r() * 9, w, h: w * (0.45 + r() * 0.3), lean: -0.6 + r() * 0.4, fam: fams[i], soft: w < 1.9 }); }
      bl.push({ x: 16 + r() * 3, y: 2.5, w: 3.6, h: 2.2, fill: wash, fam: 'split', lean: -0.7 });
      s += rocks(ctx, bl);
      return G(x, y, k, o.flip, s);
    },

    // ---- rockfallBoulders: boulders at a cliff foot with dotted fall path ---
    // opts.count number of boulders (3..6, default 5)
    rockfallBoulders(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const n = Math.max(3, Math.min(6, o.count || 5)), big = k > 1.8;
      let s = '';
      // cliff at the left: tall rock face with hachure
      const cliff = [[-26, -36], [-22 - r() * 2, -30], [-24, -22], [-21 + r(), -14], [-23, -6], [-20, 0]];
      s += fillPath(Q(cliff, false) + ' L-30 0 L-30 -36 Z', S.stone, 'none', 0);
      s += path(Q(cliff), S.ink, 1.0);
      s += hachures(ctx, cliff, 8 + (big ? 5 : 0), 2.2, 5, S.ink, 0.45, [-0.7, 0.9], 0.2);
      // release niche: a fresh scar near the top, paler than the face
      s += fillPath(P([[-24, -30], [-20, -27], [-22, -24], [-25, -26]], true), S.paperHigh, S.ink, 0.7);
      // fall path: bouncing out from the cliff — short dashes, getting flatter
      const trail = [[-21, -27], [-17, -18], [-12, -10], [-6, -5], [2, -2], [10, -1], [18, -0.5]];
      const tl = [];
      for (let i = 0; i < trail.length - 1; i++) {
        const a = trail[i], b = trail[i + 1];
        const nd = 2 + Math.floor(r() * 2);
        spread(r, nd, 0.05, 0.9).forEach(t => { const px = a[0] + (b[0] - a[0]) * t, py = a[1] + (b[1] - a[1]) * t; tl.push([px, py, px + (b[0] - a[0]) * 0.1, py + (b[1] - a[1]) * 0.1]); });
      }
      s += segs(tl, S.inkSoft, 0.45);
      // impact marks: little V dents along the path
      s += segs([[-13.2, -7.6, -12, -8.8], [-12, -8.8, -10.7, -7.6], [0.8, 0.4, 2, -0.8], [2, -0.8, 3.3, 0.4]], S.inkSoft, 0.45);
      // boulders: the biggest travels furthest; every one a different shape
      const sizes = [2.4, 3.2, 4.2, 3.8, 5.2, 6.2].slice(0, n);
      const xs = [-14, -8, -1, 7, 15, 23];
      const fams = ['slab', 'round', 'split', 'angular', 'round', 'angular'];
      const bl = [];
      for (let i = 0; i < n; i++) { const w = sizes[i] * (0.9 + r() * 0.2) * (big ? 1.25 : 1); bl.push({ x: xs[i] + (r() - 0.5) * 2, y: 0.3 + r() * 0.6, w, h: w * (0.55 + r() * 0.25), fill: S.paper, fam: fams[i], lean: (r() - 0.5) }); }
      s += rocks(ctx, bl);
      // small chips
      const ch = [];
      for (let i = 0; i < 5 + (big ? 4 : 0); i++) { const px = -16 + r() * 40, py = 0.6 + r() * 1.4; ch.push([px, py, px + 0.6 + r() * 0.5, py + 0.2]); }
      s += segs(ch, S.ink, 0.45);
      return G(x, y, k, o.flip, s);
    },

    // ---- floodWave: river section with a raised surge and splashes ---------
    // opts.w footprint width (default 56)
    floodWave(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const W = o.w || 56, big = k > 1.8;
      let s = '';
      // banks: left bank low, right bank with a bit of a terrace
      s += path(Q([[-W / 2, -4], [-W / 2 + 8, -3 + (r() - 0.5)], [-W / 2 + 14, -1]]), S.ink, 0.7);
      s += path(Q([[W / 2 - 14, -1], [W / 2 - 8, -3 + (r() - 0.5)], [W / 2, -5]]), S.ink, 0.7);
      // water body: surface rising to a surge crest at about 1/3 from the left, bore face steep on the right
      const ch = 11 + r() * 3;
      const surf = [[-W / 2 + 14, -1], [-W / 2 + 20, -2], [-W / 2 + 25, -6], [-W / 2 + 29, -ch + 1.5], [-W / 2 + 33, -ch], [-W / 2 + 36, -ch + 2.5], [-W / 2 + 38, -5], [-W / 2 + 44, -2], [W / 2 - 14, -1]];
      s += fillPath(Q(surf, false) + ' L' + f(W / 2 - 14) + ' 1 L' + f(-W / 2 + 14) + ' 1 Z', S.waterPale, 'none', 0);
      s += path(Q(surf), S.water, 1.0);
      // turbulent lines inside the surge, uneven
      spread(r, 5 + (big ? 3 : 0), 0, 1).forEach(t => {
        const px = -W / 2 + 17 + t * 20, py = -2.5 - t * 6;
        s += path(Q([[px, py], [px + 2.5, py - 1.5 - r()], [px + 5, py - 0.5]]), S.water, 0.45);
      });
      // breaking crest: curl-over stroke and spray
      s += path(Q([[-W / 2 + 31, -ch], [-W / 2 + 35, -ch - 1.5], [-W / 2 + 38, -ch + 0.5], [-W / 2 + 37, -ch + 3.5]]), S.water, 0.7);
      for (let i = 0; i < 7 + (big ? 4 : 0); i++) s += dot(-W / 2 + 30 + r() * 12, -ch - 1.5 - r() * 6, 0.3 + r() * 0.3, S.water);
      const sp = [];
      for (let i = 0; i < 4; i++) { const px = -W / 2 + 34 + r() * 6, py = -ch - 0.5 - r() * 3; sp.push([px, py, px + 1 + r(), py - 2 - r() * 1.5]); }
      s += segs(sp, S.water, 0.45);
      // debris carried: a log and a boulder in the surge face
      s += ln(-W / 2 + 36, -7, -W / 2 + 41 + r(), -4.5, S.ink, 0.7);
      s += rock(ctx, -W / 2 + 27, -4.2, 2.6, 1.6, { fill: S.waterPale, fam: 'round', lean: 0.4 });
      // calmer water lines downstream right
      const cw = [];
      spread(r, 3 + (big ? 2 : 0), 0, 1).forEach(t => { const px = -W / 2 + 42 + t * 10, py = -1.5 - r(); cw.push([px, py, px + 2.5 + r() * 2, py]); });
      s += segs(cw, S.water, 0.45);
      return G(x, y, k, o.flip, s);
    },

    // ---- glacialLake: lake dammed by a moraine, breach starting ------------
    glacialLake(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const big = k > 1.8;
      let s = '';
      // glacier snout at the back (top-left): ice tint with a couple of crevasse slits
      const snout = [[-30, -30], [-16, -33 - r()], [-2, -31], [4, -26], [-2, -22], [-14, -21], [-28, -24]];
      s += fillPath(Q(snout, true), S.paperHigh, 'none', 0);
      s += fillPath(Q(snout.slice(2, 6), false) + ' Z', S.ice, 'none', 0);
      s += path(Q(snout.slice(1, 6)), S.ink, 0.7);
      s += path(Q(snout.slice(5).concat(snout.slice(0, 2))), S.ink, 0.45);
      s += slit(ctx, [[-22, -29], [-14, -27.6 + (r() - 0.5)], [-8, -29]], 0.5, S.ink);
      s += slit(ctx, [[-20, -25.5], [-16, -24.8], [-12, -25]], 0.4, S.ink);
      if (big) s += path(Q([[-26, -27], [-18, -26.5], [-12, -27]]), S.ink, 0.45);
      // lake body: between snout and the moraine dam
      const lake = [[-26, -23], [-14, -21], [-2, -22], [8, -19 + r()], [14, -13], [12, -7], [2, -6], [-10, -7], [-20, -10], [-26, -16]];
      s += fillPath(Q(lake, true), S.waterPale, S.water, 0.7);
      const wl = [];
      spread(r, 4 + (big ? 4 : 0), 0, 1).forEach(t => { const px = -18 + t * 22, py = -19 + r() * 10; wl.push([px, py, px + 2 + r() * 3, py]); });
      s += segs(wl, S.water, 0.45);
      // moraine dam: arc of rubble ridge across the front, hachured on its outer face, a few boulders on it
      const dam = [[-24, -8], [-16, -4 - r()], [-6, -2], [6, -2 - r()], [16, -5], [22, -10]];
      s += fillPath(Q(dam, false) + ' L22 -4 L14 0 L0 3 L-16 1 L-26 -4 Z', ctx.MIX(S.paper, S.moraine, 0.2), 'none', 0);
      s += path(Q(dam), S.ink, 1.0);
      s += hachures(ctx, dam, 9 + (big ? 5 : 0), 1.2, 3.2, S.moraine, 0.45, [0, 1], 0.3);
      const bl = [], fams = ['angular', 'slab', 'round', 'split', 'round', 'angular'];
      for (let i = 0; i < 4 + (big ? 2 : 0); i++) { const w = 1.4 + r() * 1.5; bl.push({ x: -20 + r() * 26, y: -5 + r() * 5, w, h: w * (0.5 + r() * 0.3), fill: ctx.MIX(S.paper, S.moraine, 0.2), fam: fams[i], soft: w < 1.9, buried: r() < 0.4 }); }
      s += rocks(ctx, bl);
      // the breach: a notch in the dam at the right, with water pouring through
      s += fillPath(P([[8, -2.5], [13, -3.5], [14, 1], [10, 1.5]], true), S.paper, 'none', 0);
      s += path(P([[8, -2.5], [9.5, 0.5]]), S.ink, 0.7);
      s += path(P([[13, -3.5], [14.2, 0.8]]), S.ink, 0.7);
      s += path(Q([[10, -4], [11, 0], [11.5, 4], [13, 8], [16 + r() * 2, 12]]), S.water, 0.7);
      s += path(Q([[12, -3], [12.8, 1], [13.8, 5], [15.5, 9]]), S.water, 0.45);
      for (let i = 0; i < 5; i++) s += dot(12 + r() * 6, 2 + r() * 9, 0.3, S.water);
      // surveyor's red: a stake with a flag marking the lake level
      s += ln(-24, -13, -24, -19, S.red, 0.7);
      s += fillPath(P([[-24, -19], [-21, -18], [-24, -17]], true), S.red, 'none', 0);
      return G(x, y, k, o.flip, s);
    },

    // ---- icicles: a fringe of icicles hanging from a rock overhang -----------
    icicles(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const big = k > 1.8;
      let s = '';
      // the host: a rock nose jutting from the slope at the left. Its top face runs
      // down to a lip; the undercut beneath the lip is the shaded face the icicles hang from
      const lipX = 12 + r() * 3, lipY = -22 + r() * 1.5;
      const nose = [[-24, -32], [-14, -30], [-6, -28 - r()], [4, -24], [lipX, lipY],                      // top face to the lip
                    [lipX - 4, lipY + 2.2], [lipX - 12, lipY + 3.5], [lipX - 19, lipY + 3],              // the undercut, retreating
                    [-12, -8], [-14, 0], [-28, 0], [-24, -32]];                                          // the wall below, back into the slope
      s += fillPath(Q(nose, true), S.stone, 'none', 0);
      s += path(Q(nose.slice(0, 5)), S.ink, 1.0);                     // top face: contour
      s += path(Q(nose.slice(4, 8)), S.ink, 1.0);                     // the lip's underside edge: contour
      s += path(Q(nose.slice(7, 10)), S.ink, 0.7);                    // the wall below
      // shading of the undercut: hatch that tightens under the lip
      const und = nose.slice(4, 8).reverse();
      s += hachures(ctx, und, 9 + (big ? 5 : 0), 1.4, 3.4, S.ink, 0.45, [-0.45, -1], 0.3);
      s += hachures(ctx, [[-12, -8], [-13.5, -1]], 4, 1.5, 3, S.ink, 0.45, [1, 0.3], 0);
      // icicles hang from the underside edge: varied length and thickness, a few fused
      // into a curtain at the root; ice fill, shaded right edge in ink, lit left edge open
      const n = 8 + (big ? 4 : 0), ts = spread(r, n, 0.06, 0.96);
      let prev = null;
      ts.forEach(t => {
        const p = along(und, t);
        const L = 3 + Math.pow(r(), 0.8) * 13 + (t > 0.6 ? 2 : 0), w = 0.6 + r() * 0.9, bend = (r() - 0.5) * 0.8;
        const tip = [p.x + bend, p.y + L];
        const left = [[p.x - w, p.y - 0.4], [p.x - w * 0.75, p.y + L * 0.35], tip];
        const right = [[p.x + w, p.y - 0.4], [p.x + w * 0.8, p.y + L * 0.3], tip];
        // fuse with the previous icicle when they nearly touch: a sheet of ice between the two roots
        if (prev && p.x - prev.x < w + prev.w + 0.6 && r() < 0.6) s += fillPath(P([[prev.x, prev.y - 0.4], [p.x, p.y - 0.4], [p.x, p.y + Math.min(L, prev.L) * 0.45], [prev.x, prev.y + Math.min(L, prev.L) * 0.45]], true), S.ice, 'none', 0);
        s += fillPath(Q(left, false) + ' ' + Q(right.slice().reverse()).replace('M', 'L') + ' Z', S.ice, 'none', 0);
        s += path(Q(right), S.ink, L > 6 ? 0.7 : 0.45);
        if (L > 7) s += path(Q([[p.x + w * 0.1, p.y + 1], [p.x + w * 0.2, p.y + L * 0.45], [p.x + bend * 0.6, p.y + L * 0.8]]), S.iceLine, 0.45);
        prev = { x: p.x, y: p.y, w, L };
      });
      // drips falling and a wet crust of ice on the ground below the lip
      s += dot(lipX - 8 + r() * 4, -4 - r() * 3, 0.4, S.water);
      s += dot(lipX - 2 + r() * 3, -7 + r() * 2, 0.35, S.water);
      s += fillPath(Q([[lipX - 16, 0.8], [lipX - 8, -0.6], [lipX + 2, -0.3], [lipX + 8, 0.8], [lipX + 2, 2], [lipX - 10, 2.2]], true), S.ice, 'none', 0);
      s += path(Q([[lipX - 6, 0.5], [lipX - 2, -0.2], [lipX + 3, 0.6]]), S.water, 0.45);
      return G(x, y, k, o.flip, s);
    },

    // ---- frostCrackedRock: one boulder split open by a frost wedge ---------
    frostCrackedRock(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const big = k > 1.8;
      let s = '';
      const W = 24 + r() * 4, H = 13 + r() * 3, cx = -2 + r() * 3;
      const wash = ctx.MIX(S.paper, S.stone, 0.35);
      // one big observed boulder, angular ...
      s += rock(ctx, 0, 0, W, H, { fill: wash, fam: 'angular', lean: 0.2 });
      // ... split by a jagged crack from the top to the ground; the right half has
      // dropped a little, the gap shows the ice wedge
      const cL = [[cx - 0.3, -H + 1.2], [cx - 1.6, -H * 0.72], [cx - 0.4, -H * 0.5], [cx - 1.8, -H * 0.25], [cx - 0.8, 0]];
      const gap = 0.7 + r() * 0.5;
      const cR = cL.map((p, i) => [p[0] + gap + (i === 0 ? 0.2 : 0.5), p[1] + (i === 0 ? 0.6 : 0.3)]);
      s += fillPath(P(cL.concat(cR.slice().reverse()), true), S.ice, 'none', 0);
      s += path(P(cL), S.ink, 1.0);
      s += path(P(cR), S.ink, 0.7);
      s += path(P([[cx + 0.1, -H * 0.8], [cx - 0.4, -H * 0.5], [cx - 0.2, -H * 0.2]]), S.iceLine, 0.45);
      // the dropped right half: its top edge re-drawn a touch lower, and a secondary crack
      s += path(P([[cx + W * 0.22, -H + 2.5], [cx + W * 0.2, -H * 0.6], [cx + W * 0.26, -H * 0.35]]), S.ink, 0.45);
      // weathering on the lit top-left: short flecks
      const fl = [];
      for (let i = 0; i < 5 + (big ? 4 : 0); i++) { const px = -W * 0.4 + r() * W * 0.3, py = -H * 0.95 + r() * H * 0.35; fl.push([px, py, px + 0.6 + r() * 0.5, py + 0.15]); }
      s += segs(fl, S.inkSoft, 0.45);
      // spalled slabs around the base, leaning against the boulder
      s += rocks(ctx, [{ x: -W * 0.5 - 1, y: 0.6, w: 3 + r(), h: 1.4 + r() * 0.6, fill: S.paper, fam: 'slab', lean: -0.8 },
                       { x: W * 0.5 + 1.5, y: 0.8, w: 2.4 + r(), h: 1.6, fill: S.paper, fam: 'split', lean: 0.7 },
                       { x: W * 0.3 + r() * 3, y: 1.4, w: 1.6, h: 0.7, fam: 'round', soft: true }]);
      return G(x, y, k, o.flip, s);
    },

    // ---- permafrostBorehole: borehole + temperature cable + logger ----------
    // opts.depth visible section depth (default 28)
    permafrostBorehole(ctx, x, y, k, opts) {
      const S = ctx.S, r = ctx.rand, o = opts || {};
      const D = o.depth || 28, big = k > 1.8;
      let s = '';
      // ground surface with a cut-away section window below
      s += path(Q([[-22, 0], [-10, -0.5 + (r() - 0.5) * 0.5], [4, 0.3], [18, 0]]), S.ink, 1.0);
      const win = [[-12, 0], [12, 0], [12.5, D], [-12.5, D]];
      s += fillPath(P(win, true), ctx.MIX(S.paper, S.moraine, 0.14), 'none', 0);
      s += path(P([win[0], win[3]]), S.inkSoft, 0.45, ' stroke-dasharray="1.5 2"');
      s += path(P([win[1], win[2]]), S.inkSoft, 0.45, ' stroke-dasharray="1.5 2"');
      s += path(Q([[-12.5, D], [-4, D + 0.5], [5, D - 0.4], [12.5, D]]), S.inkSoft, 0.45, ' stroke-dasharray="1.5 2"');
      // active layer on top: loose soil flecks; permafrost below: ice lenses as short blue dashes
      const al = 5 + r() * 2;
      s += path(Q([[-12, al], [-4, al + 0.5], [5, al - 0.3], [12, al]]), S.moraine, 0.7, ' stroke-dasharray="2 1.5"');
      const sf = [];
      for (let i = 0; i < 9; i++) { const px = -11 + r() * 22, py = 0.8 + r() * (al - 1.5); sf.push([px, py, px + 0.5 + r() * 0.4, py + 0.1]); }
      s += segs(sf, S.moraine, 0.45);
      const il = [];
      for (let i = 0; i < 8 + (big ? 5 : 0); i++) { const px = -11 + r() * 20, py = al + 2 + r() * (D - al - 3); il.push([px, py, px + 1.5 + r() * 2.5, py + (r() - 0.5) * 0.5]); }
      s += segs(il, S.iceLine, 0.45);
      // stones in the section, sunk in the ground
      s += rocks(ctx, [{ x: -6 + r() * 2, y: 13, w: 2.4, h: 1.4, buried: true, fam: 'round', soft: true },
                       { x: 7 - r() * 2, y: 21, w: 2.8, h: 1.8, buried: true, fam: 'angular', soft: true },
                       { x: -3, y: 25, w: 1.8, h: 1.0, buried: true, fam: 'slab', soft: true }]);
      // borehole: narrow casing from surface to depth
      s += fillPath(P([[-0.9, -1], [0.9, -1], [0.9, D - 1], [-0.9, D - 1]], true), S.paper, 'none', 0);
      s += ln(-0.9, -1, -0.9, D - 1, S.ink, 0.7);
      s += ln(0.9, -1, 0.9, D - 1, S.ink, 0.7);
      // thermistor cable: red line down the hole with sensor ticks at intervals
      s += ln(0, -3, 0, D - 2.5, S.red, 0.45);
      for (let i = 1; i <= 6; i++) { const yy = -1 + i * (D - 2) / 6; s += ln(-0.9, yy, 0.9, yy, S.red, 0.7); }
      // logger box at the surface on a short post, cable up into it
      const side = r() < 0.5 ? 1 : -1;
      s += ln(0, -3, 4 * side, -3, S.red, 0.45);
      s += ln(4 * side, -3, 4 * side, -9, S.red, 0.45);
      s += ln(4 * side, 0, 4 * side, -8, S.ink, 0.7);
      s += fillPath(P([[4 * side - 2.8, -13], [4 * side + 2.8, -13.3], [4 * side + 2.8, -8.5], [4 * side - 2.8, -8.3]], true), S.paper, S.ink, 0.7);
      s += ln(4 * side - 1.8, -11, 4 * side + 1.6, -11, S.ink, 0.45);
      s += ln(4 * side - 1.8, -10, 4 * side + 0.8, -10, S.ink, 0.45);
      s += dot(4 * side + 1.7, -12.1, 0.35, S.blue);
      // cap / collar at the hole mouth
      s += ln(-2, -0.8, 2, -0.8, S.ink, 1.0);
      // surface stones
      s += rocks(ctx, [{ x: -8 - r() * 2, y: -0.4, w: 2.4, h: 1.3, fill: S.paper, fam: 'angular' }, { x: 11 + r() * 2, y: -0.3, w: 1.7, h: 0.9, fill: S.paper, fam: 'round', soft: true }]);
      return G(x, y, k, o.flip, s);
    }
  });
})();
