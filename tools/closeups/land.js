// LAND AND LIFE motif group — ink-on-paper survey-plate drawings.
// Registers on window.MRI_MOTIFS. Classic script, no imports.
// Every stroke is post-processed by ink.js (slow wobble, three quantised
// weights, tapered ribbons), so nothing here jitters vertices: rand() is used
// only for VARIATION between two calls of the same motif.
(function () {
  // ---------- shared helpers ----------
  const f = n => (+n).toFixed(1);
  // points -> path data (M then L), optionally closed
  const poly = (pts, close) => 'M' + pts.map(p => f(p[0]) + ' ' + f(p[1])).join(' L') + (close ? ' Z' : '');
  // smooth quadratic path through points (hand-drawn curve feel)
  const curve = pts => {
    if (pts.length < 3) return poly(pts);
    let d = 'M' + f(pts[0][0]) + ' ' + f(pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      d += ' Q' + f(pts[i][0]) + ' ' + f(pts[i][1]) + ' ' + f(mx) + ' ' + f(my);
    }
    const l = pts[pts.length - 1];
    d += ' T' + f(l[0]) + ' ' + f(l[1]);
    return d;
  };
  // line weights by class (sheet units; the ink engine quantises to these) — adjust here
  const HAIR = 0.45, SEC = 0.7, CONT = 1.05;
  const path = (d, stroke, w, extra) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra || ''}/>`;
  const fpath = (d, fill, stroke, w, extra) => `<path d="${d}" fill="${fill}" stroke="${stroke || 'none'}" stroke-width="${f(w || 0)}" stroke-linecap="round" stroke-linejoin="round"${extra || ''}/>`;
  const line = (x1, y1, x2, y2, stroke, w) => path(`M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`, stroke, w);
  // a value varied by ±p (proportion), e.g. vary(ctx, 10, 0.08) -> 9.2..10.8
  const vary = (ctx, v, p) => v * (1 + (ctx.rand() - 0.5) * 2 * p);
  // a tiny ink dot (stipple grain)
  const dot = (x, y, r, col) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${col}"/>`;
  // broken ground line so motifs sit on terrain (no pebbles: the ground belongs to the sheet)
  const ground = (ctx, x, y, k, half, stroke) => {
    const S = ctx.S; let s = '';
    if (true) return s;   /* no private baseline: the composer ties the motif to the sheet's own hachures */
    const col = stroke || S.inkSoft;
    let cx = x - half * k;
    while (cx < x + half * k) {
      const len = (3 + ctx.rand() * 7) * k;
      if (ctx.rand() > 0.3) s += line(cx, y + (ctx.rand() - 0.5) * 0.6 * k, Math.min(cx + len, x + half * k), y + (ctx.rand() - 0.5) * 0.6 * k, col, HAIR);
      cx += len + (2 + ctx.rand() * 3) * k;
    }
    return s;
  };
  // hatch strokes at ~55° (shade the right/lower side); spacing tightens toward the
  // shadow core as i grows. (x,y) is the first stroke's start; dx,dy step between strokes.
  const hatch = (ctx, x, y, k, n, len, stroke, dx, dy) => {
    let s = '';
    let ox = x, oy = y;
    for (let i = 0; i < n; i++) {
      const L = len * (0.75 + ctx.rand() * 0.5);
      s += line(ox, oy, ox + L * 0.55, oy + L * 0.8, stroke, HAIR);
      const tight = 1 - 0.11 * i;       // tighten toward the shadow core
      ox += dx * tight; oy += dy * tight;
    }
    return s;
  };
  // stipple tone: n tiny dots in the ellipse (cx,cy,rx,ry), biased toward its lower-right
  const stipple = (ctx, cx, cy, rx, ry, n, col, k) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const a = ctx.rand() * Math.PI * 2, r = Math.sqrt(ctx.rand());
      const bx = Math.cos(a) * r, by = Math.sin(a) * r;
      // bias: push toward +x,+y (lit from upper left)
      const px = cx + (bx * 0.6 + 0.35) * rx, py = cy + (by * 0.6 + 0.3) * ry;
      s += dot(px, py, 0.22 * k, col);
    }
    return s;
  };
  const wrap = (x, y, k, flip, inner) => `<g transform="translate(${f(x)} ${f(y)}) scale(${flip ? -1 : 1} 1)">${inner}</g>`;

  // ---------- a conifer drawn relative to base (0,0); h = height, w = half-width at the skirt ----------
  // tone is made of line: needle ticks and short hatch under the right-hand boughs, no wash
  const conifer = (ctx, h, w, S, k) => {
    let s = '';
    k = k || 1;
    const lean = (ctx.rand() - 0.5) * 0.08 * h;
    // trunk: contour
    s += path(`M0 0 Q${f(lean * 0.4)} ${f(-h * 0.45)} ${f(lean)} ${f(-h * 0.9)}`, S.ink, CONT);
    // tiers at IRREGULAR intervals: random steps normalised to fit the trunk
    const tiers = 6 + Math.floor(ctx.rand() * 3);
    const steps = []; let tot = 0;
    for (let i = 0; i < tiers; i++) { const st = 0.7 + ctx.rand() * 0.6; steps.push(st); tot += st; }
    let acc = 0;
    for (let i = 0; i < tiers; i++) {
      acc += steps[i];
      const t = 1 - acc / tot;                  // 1 at the skirt .. ~0 at the crown
      const yy = -h * (0.14 + 0.74 * (1 - t));
      const tx = lean * (1 - t);
      const ww = w * (0.22 + 0.78 * t) * (0.9 + ctx.rand() * 0.2);
      const wl = ww * (0.88 + ctx.rand() * 0.24), wr = ww * (0.88 + ctx.rand() * 0.24);
      const dl = wl * (0.3 + ctx.rand() * 0.2), dr = wr * (0.3 + ctx.rand() * 0.2);
      // the two boughs, secondary weight, each its own droop
      s += path(`M${f(tx)} ${f(yy)} q${f(-wl * 0.5)} ${f(dl * 0.15)} ${f(-wl)} ${f(dl)}`, S.sageDeep, SEC);
      s += path(`M${f(tx)} ${f(yy + 0.5 * k)} q${f(wr * 0.45)} ${f(dr * 0.3)} ${f(wr)} ${f(dr * 1.05)}`, S.sageDeep, SEC);
      // needle ticks hanging from the boughs: count and placement vary
      let nd = '';
      const nl = 2 + Math.floor(ctx.rand() * 3), nr = 3 + Math.floor(ctx.rand() * 3);
      for (let j = 0; j < nl; j++) { const u = 0.25 + ctx.rand() * 0.7; nd += `M${f(tx - wl * u)} ${f(yy + dl * u * u)} l${f(-0.4 * k)} ${f((1.2 + ctx.rand() * 0.8) * k)}`; }
      for (let j = 0; j < nr; j++) { const u = 0.2 + ctx.rand() * 0.75; nd += `M${f(tx + wr * u)} ${f(yy + 0.5 * k + dr * u * u)} l${f(0.3 * k)} ${f((1.4 + ctx.rand() * 1.0) * k)}`; }
      s += path(nd, S.sageDeep, HAIR);
      // shade under the right-hand bough: 2–3 short hatch strokes tightening toward the trunk
      if (i < tiers - 1) s += hatch(ctx, tx + wr * 0.55, yy + 0.5 * k + dr * 0.4, k, 2 + (ctx.rand() > 0.5 ? 1 : 0), 1.6 * k, S.sageDeep, -wr * 0.22, 0.15 * k);
    }
    // crown: a leader and two small boughs
    s += path(`M${f(lean)} ${f(-h * 0.9)} l${f(-0.9 * k)} ${f(2.4 * k)} M${f(lean)} ${f(-h * 0.88)} l${f(0.8 * k)} ${f(2.7 * k)} M${f(lean)} ${f(-h)} l${f(lean * 0.05)} ${f(h * 0.1)}`, S.sageDeep, SEC);
    // trunk shade on the right
    s += hatch(ctx, 0.6 * k, -h * 0.12, k, 3, 1.3 * k, S.inkSoft, 0.1 * k, -2.2 * k);
    return s;
  };

  // ---------- broadleaf tree, base at (0,0); canopy knocked out in paper, tone by line ----------
  const broadleaf = (ctx, h, S, k) => {
    let s = '';
    const tw = 0.9 * k;
    const cx = (ctx.rand() - 0.5) * 0.1 * h, cy = -h * (0.66 + ctx.rand() * 0.08), rx = h * vary(ctx, 0.4, 0.1), ry = h * vary(ctx, 0.29, 0.1);
    // canopy outline: lumpy scallops (closed for the knock-out, then drawn as broken runs)
    const n = 10 + Math.floor(ctx.rand() * 3);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rr = 1 + (ctx.rand() - 0.5) * 0.2;
      pts.push([cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr, a]);
    }
    const seg = (i, j) => {
      const p = pts[i % n], q = pts[j % n];
      const am = (p[2] + (q[2] < p[2] ? q[2] + Math.PI * 2 : q[2])) / 2;
      return ` Q${f(cx + Math.cos(am) * rx * 1.2)} ${f(cy + Math.sin(am) * ry * 1.22)} ${f(q[0])} ${f(q[1])}`;
    };
    let closed = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 0; i < n; i++) closed += seg(i, i + 1);
    s += fpath(closed + ' Z', S.paper, 'none', 0);
    // trunk: two contour lines that disappear into the canopy; a fork inside
    s += path(`M${f(-tw)} 0 Q${f(-tw * 0.7)} ${f(-h * 0.25)} ${f(-tw * 0.35 + cx * 0.5)} ${f(cy + ry * 0.7)}`, S.ink, CONT);
    s += path(`M${f(tw)} 0 Q${f(tw * 0.85)} ${f(-h * 0.25)} ${f(tw * 0.45 + cx * 0.5)} ${f(cy + ry * 0.7)}`, S.ink, CONT);
    const forks = 2 + Math.floor(ctx.rand() * 2);
    for (let i = 0; i < forks; i++) {
      const dir = (i % 2 ? 1 : -1) * (0.3 + ctx.rand() * 0.5);
      s += path(`M${f(cx * 0.5)} ${f(cy + ry * 0.7)} q${f(dir * rx * 0.2)} ${f(-ry * 0.3)} ${f(dir * rx * 0.45)} ${f(-ry * (0.15 + ctx.rand() * 0.35))}`, S.ink, SEC);
    }
    // outline drawn as broken runs (a gap every few scallops), secondary weight
    let run = '', i = 0;
    while (i < n) {
      const len = 2 + Math.floor(ctx.rand() * 3);
      let d = `M${f(pts[i % n][0])} ${f(pts[i % n][1])}`;
      for (let j = i; j < Math.min(i + len, n); j++) d += seg(j, j + 1);
      run += d + ' ';
      i += len + (ctx.rand() > 0.6 ? 1 : 0);
    }
    s += path(run.trim(), S.sageDeep, SEC);
    // leaf mass: clumps of stacked scallop arcs, denser toward the lower right; the upper
    // left is left almost bare so the light reads
    const clumps = 11 + Math.floor(ctx.rand() * 5);
    let lm = '';
    for (let j = 0; j < clumps; j++) {
      const a = ctx.rand() * Math.PI * 2, rr = 0.25 + Math.sqrt(ctx.rand()) * 0.65;
      const px = cx + Math.cos(a) * rx * rr + rx * 0.12, py = cy + Math.sin(a) * ry * rr + ry * 0.12;
      const w = (1.8 + ctx.rand() * 1.6) * k, rows = 2 + Math.floor(ctx.rand() * 2);
      for (let q = 0; q < rows; q++) {
        const ox = px + (q % 2 ? w * 0.45 : 0) + (ctx.rand() - 0.5) * 0.4 * k, oy = py + q * w * 0.5;
        lm += `M${f(ox)} ${f(oy)} q${f(w * 0.5)} ${f(-w * 0.5)} ${f(w)} 0 `;
        if (ctx.rand() < 0.6) lm += `M${f(ox + w)} ${f(oy)} q${f(w * 0.45)} ${f(-w * 0.45)} ${f(w * 0.9)} 0 `;
      }
    }
    s += path(lm.trim(), S.sageDeep, HAIR);
    // a row of scallops hugging the inside of the lower-right edge, and a hatch band behind it
    let edge = '';
    for (let a = 0.05; a < 1.9; a += 0.28 + ctx.rand() * 0.12) {
      const ex = cx + Math.cos(a) * rx * 0.82, ey = cy + Math.sin(a) * ry * 0.82, w = (1.4 + ctx.rand() * 0.8) * k;
      edge += `M${f(ex - w / 2)} ${f(ey)} q${f(w * 0.5)} ${f(-w * 0.5)} ${f(w)} 0 `;
    }
    s += path(edge.trim(), S.sageDeep, HAIR);
    const nh = 8 + Math.floor(ctx.rand() * 3);
    let hb = '';
    for (let i = 0; i < nh; i++) {
      const a = 0.25 + i * (1.2 / nh);
      const ex = cx + Math.cos(a) * rx * 0.72, ey = cy + Math.sin(a) * ry * 0.72, ll = (2.4 + ctx.rand() * 1.6) * k;
      hb += `M${f(ex - ll * 0.55)} ${f(ey - ll * 0.8)} L${f(ex)} ${f(ey)} `;
    }
    s += path(hb.trim(), S.sageDeep, HAIR);
    s += stipple(ctx, cx, cy, rx * 0.8, ry * 0.8, 16 + Math.floor(ctx.rand() * 8), S.sageDeep, k);
    return s;
  };

  // ---------- goat / sheep, base at feet (0,0), facing +x ----------
  // stance: 'stand' | 'graze' (head to the ground) | 'up' (head raised, looking)
  const goat = (ctx, S, k, type, bell, stance) => {
    let s = '';
    const L = 6 * vary(ctx, k, 0.09), H = 3.6 * vary(ctx, k, 0.09);
    stance = stance || 'stand';
    if (type === 'sheep') {
      // woolly body: scalloped back, flat belly
      let d = `M${f(-L * 0.5)} ${f(-H * 0.5)}`;
      const n = 5 + Math.floor(ctx.rand() * 3);
      for (let i = 1; i <= n; i++) {
        const t = i / n, a = Math.PI - t * Math.PI;
        const px = Math.cos(a) * L * 0.5, py = -H * 0.5 - Math.sin(a) * H * 0.55 * (1 + (ctx.rand() - 0.5) * 0.2);
        d += ` Q${f(px - 0.6 * k)} ${f(py - 1.1 * k)} ${f(px)} ${f(py)}`;
      }
      d += ` L${f(L * 0.5)} ${f(-H * 0.3)} Q0 ${f(-H * 0.15)} ${f(-L * 0.5)} ${f(-H * 0.3)} Z`;
      s += fpath(d, S.paperHigh, S.ink, SEC);
    } else {
      s += fpath(`M${f(-L * 0.5)} ${f(-H * 0.45)} Q${f(-L * 0.45)} ${f(-H)} ${f(-L * 0.1)} ${f(-H * 1.05)} L${f(L * 0.45)} ${f(-H * 0.95)} Q${f(L * 0.55)} ${f(-H * 0.6)} ${f(L * 0.45)} ${f(-H * 0.35)} Q0 ${f(-H * 0.2)} ${f(-L * 0.5)} ${f(-H * 0.45)} Z`, S.paper, S.ink, SEC);
      // a little hair hatch on the flank (lower right)
      s += hatch(ctx, L * 0.05, -H * 0.6, k, 2, 1.0 * k, S.inkSoft, 0.9 * k, 0.1 * k);
    }
    // legs: one fore leg forward, one hind leg back; splay varies per animal
    const fwd = ctx.rand() * 0.8;
    const legs = [[-L * 0.38, 0.2 - fwd * 0.5], [-L * 0.26, -0.3 + fwd * 0.2], [L * 0.28, 0.2 + fwd], [L * 0.4, -0.35]];
    legs.forEach(l => s += line(l[0], -H * 0.45, l[0] + l[1] * k, 0, S.ink, SEC));
    // head + neck by stance
    const hx = L * 0.45, hy = -H * 0.95;
    let nx, ny;
    if (stance === 'graze') { nx = hx + 1.9 * k; ny = -H * 0.25; s += path(`M${f(hx)} ${f(hy)} Q${f(hx + 1.6 * k)} ${f(hy + 0.6 * k)} ${f(nx)} ${f(ny)}`, S.ink, SEC); }
    else if (stance === 'up') { nx = hx + 1.2 * k; ny = hy - 2.4 * k; s += line(hx, hy, nx, ny, S.ink, SEC); }
    else { nx = hx + 1.6 * k; ny = hy - 1.5 * k; s += line(hx, hy, nx, ny, S.ink, SEC); }
    const mz = stance === 'graze' ? 0.9 : 0.3;        // muzzle angle: down when grazing
    s += fpath(`M${f(nx)} ${f(ny)} l${f(1.7 * k)} ${f(mz * k)} l${f(-0.3 * k)} ${f(0.9 * k)} l${f(-1.5 * k)} ${f(-0.4 * k)} Z`, S.paper, S.ink, SEC);
    // horns or ear
    if (type === 'sheep') s += path(`M${f(nx)} ${f(ny)} l${f(-0.9 * k)} ${f(-0.5 * k)}`, S.ink, HAIR);
    else { const hl = 1.4 + ctx.rand() * 0.9; s += path(`M${f(nx + 0.2 * k)} ${f(ny)} q${f(-0.6 * k)} ${f(-hl * 0.8 * k)} ${f(-1.2 * k)} ${f(-hl * k)} M${f(nx + 0.5 * k)} ${f(ny)} q${f(0.1 * k)} ${f(-hl * 0.7 * k)} ${f(-0.4 * k)} ${f(-hl * 1.05 * k)}`, S.ink, HAIR); }
    // tail
    s += path(`M${f(-L * 0.5)} ${f(-H * 0.9)} l${f(-0.7 * k)} ${f(-0.7 * k)}`, S.ink, HAIR);
    // beard for goat
    if (type !== 'sheep') s += path(`M${f(nx + 0.6 * k)} ${f(ny + 1.2 * k)} l${f(0.1 * k)} ${f(0.8 * k)}`, S.ink, HAIR);
    // bell: red accent, tiny
    if (bell) s += fpath(`M${f(hx + 0.5 * k)} ${f(hy + 0.9 * k)} l${f(0.5 * k)} ${f(0.8 * k)} l${f(-1.0 * k)} 0 Z`, S.red, S.red, 0.3);
    return s;
  };

  // ---------- dry-stone course with joints and the occasional missing stone ----------
  // from (x0,y0) to (x1,y1), stone length sl; returns strokes in inkSoft hairline
  const stoneCourse = (ctx, S, x0, y0, x1, y1, sl, k) => {
    let s = '';
    const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
    let t = 0; let d = `M${f(x0)} ${f(y0)}`;
    while (t < L) {
      const len = sl * (0.7 + ctx.rand() * 0.7);
      const e = Math.min(t + len, L);
      if (ctx.rand() < 0.1) {
        // missing stone: the course line breaks and a small dark hollow is drawn
        d += ` M${f(x0 + ux * e)} ${f(y0 + uy * e)}`;
        s += fpath(`M${f(x0 + ux * (t + 0.3 * k))} ${f(y0 + uy * t - 0.15 * k)} l${f(Math.min(e - t, 2.2 * k) * 0.6)} 0 l${f(-0.15 * k)} ${f(0.55 * k)} l${f(-Math.min(e - t, 2.2 * k) * 0.4)} 0 Z`, ctx.MIX(S.paper, S.ink, 0.55), 'none', 0);
      } else {
        d += ` L${f(x0 + ux * e)} ${f(y0 + uy * e)}`;
        // joint tick at the end of the stone
        if (e < L) d += ` m0 ${f(-0.5 * k)} l${f(0.1 * k)} ${f(1.1 * k)} M${f(x0 + ux * e)} ${f(y0 + uy * e)}`;
      }
      t = e;
    }
    s += path(d, S.inkSoft, HAIR);
    return s;
  };

  // ---------- a small bird in flight, a few strokes; w = span ----------
  const bird = (ctx, S, bx, by, w, k) => {
    const pose = ctx.rand();
    // body: a tiny filled teardrop
    let s = fpath(`M${f(bx - 0.5 * k)} ${f(by)} q${f(0.5 * k)} ${f(-0.45 * k)} ${f(1.2 * k)} ${f(-0.1 * k)} q${f(-0.5 * k)} ${f(0.5 * k)} ${f(-1.2 * k)} ${f(0.1 * k)} Z`, S.ink, 'none', 0);
    const hl = w * (0.45 + ctx.rand() * 0.1), hr = w * (0.45 + ctx.rand() * 0.1);
    let d;
    if (pose < 0.4) {
      // wings raised: a shallow V with drooping tips
      d = `M${f(bx)} ${f(by)} q${f(-hl * 0.5)} ${f(-hl * 0.5)} ${f(-hl)} ${f(-hl * 0.35)} M${f(bx)} ${f(by)} q${f(hr * 0.5)} ${f(-hr * 0.5)} ${f(hr)} ${f(-hr * 0.3)}`;
    } else if (pose < 0.7) {
      // gliding: wings out, one a little lower (banking)
      d = `M${f(bx)} ${f(by)} q${f(-hl * 0.5)} ${f(-hl * 0.2)} ${f(-hl)} ${f(-hl * 0.05)} M${f(bx)} ${f(by)} q${f(hr * 0.5)} ${f(-hr * 0.15)} ${f(hr)} ${f(hr * 0.2)}`;
    } else {
      // downstroke: wings below the body
      d = `M${f(bx)} ${f(by)} q${f(-hl * 0.5)} ${f(hl * 0.1)} ${f(-hl)} ${f(hl * 0.4)} M${f(bx)} ${f(by)} q${f(hr * 0.5)} ${f(hr * 0.15)} ${f(hr)} ${f(hr * 0.45)}`;
    }
    s += path(d, S.ink, SEC);
    return s;
  };

  window.MRI_MOTIFS = Object.assign(window.MRI_MOTIFS || {}, {

    // ---------- terracesWithCrops: 3-5 stepped terraces with crop rows ----------
    terracesWithCrops(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      const n = Math.max(3, Math.min(5, opts.steps || 4));
      let s = '';
      // a hillside: terraces cut into a slope rising to the LEFT. Each step keeps a
      // near-constant left edge (the cut bank) and recedes on the right (the fill).
      const W = 46 * k, stepH = 5.5 * vary(ctx, k, 0.08), stepIn = 7.5 * vary(ctx, k, 0.1);
      // hill silhouette behind, a broken hairline
      s += path(curve([[-W / 2 - 6 * k, -stepH * (n + 0.2)], [-W * 0.15, -stepH * (n + 0.9)], [W * 0.2, -stepH * (n - 0.4)], [W / 2 + 4 * k, -stepH * 1.2]]), S.inkSoft, HAIR, ' stroke-dasharray="5 3 2 3"');
      for (let i = 0; i < n; i++) {
        const ty = -i * stepH;
        const x0 = -W / 2 + i * 2 * k, x1 = W / 2 - i * stepIn;
        const riseL = stepH * 0.8, riseR = stepH * (0.55 + ctx.rand() * 0.2);
        // riser: a dry-stone wall, slightly battered, an uneven top
        const wall = `M${f(x0)} ${f(ty)} L${f(x0 + 0.8 * k)} ${f(ty - riseL)} ${curve([[x0 + 0.8 * k, ty - riseL], [(x0 + x1) / 2, ty - riseL + (ctx.rand() - 0.5) * k], [x1 - 0.6 * k, ty - riseR]]).slice(1)} L${f(x1 + 0.6 * k)} ${f(ty)}`;
        s += fpath(wall, ctx.MIX(S.paper, S.moraine, 0.16), S.ink, SEC);
        // stones: two courses with staggered joints and the odd missing stone
        for (let c = 0; c < 2; c++) {
          const cy0 = ty - riseL * (0.33 + c * 0.3), cy1 = ty - riseR * (0.33 + c * 0.3);
          s += stoneCourse(ctx, S, x0 + 1.2 * k, cy0, x1 - 1 * k, cy1, 3.2 * k, k);
        }
        // shade at the foot of the wall (right half)
        s += hatch(ctx, (x0 + x1) / 2, ty - riseL * 0.25, k, 3, 1.2 * k, S.inkSoft, 2.4 * k, -0.05 * k);
        // terrace bed: crops in rows; rows broken and plants varied
        const by0 = ty - riseL, by1 = ty - riseR;
        const rows = 1 + Math.floor(ctx.rand() * 2);
        for (let r = 0; r < rows; r++) {
          const ry0 = by0 - (1.3 + r * 2.2) * k, ry1 = by1 - (1.1 + r * 1.8) * k;
          const rx0 = x0 + (1.5 + r * 0.6) * k, rx1 = x1 - (2 + r * 5) * k;
          const gapAt = rx0 + (rx1 - rx0) * (0.3 + ctx.rand() * 0.4), gapW = ctx.rand() < 0.5 ? 0 : 3 * k;
          for (let c = rx0 + 1 * k; c < rx1; c += (2.2 + ctx.rand() * 1.2) * k) {
            if (Math.abs(c - gapAt) < gapW / 2) continue;        // a broken row
            const t = (c - rx0) / (rx1 - rx0), cy = ry0 + (ry1 - ry0) * t;
            const h = (1.1 + ctx.rand() * 0.9) * k;
            const kind = ctx.rand();
            if (kind < 0.5) s += path(`M${f(c)} ${f(cy)} l${f(-0.5 * k)} ${f(-h)} M${f(c)} ${f(cy)} l${f(0.5 * k)} ${f(-h * 0.85)}`, S.sageDeep, HAIR);
            else if (kind < 0.8) s += path(`M${f(c)} ${f(cy)} l${f(0.1 * k)} ${f(-h)} M${f(c + 0.1 * k)} ${f(cy - h * 0.5)} l${f(0.6 * k)} ${f(-0.5 * k)}`, S.sageDeep, HAIR);
            else s += path(`M${f(c)} ${f(cy)} q${f(-0.7 * k)} ${f(-h * 0.5)} ${f(-0.4 * k)} ${f(-h)} M${f(c)} ${f(cy)} q${f(0.6 * k)} ${f(-h * 0.4)} ${f(0.5 * k)} ${f(-h * 0.9)} M${f(c)} ${f(cy)} l0 ${f(-h * 0.7)}`, S.sageDeep, HAIR);
          }
        }
      }
      s += ground(ctx, 2 * k, 0.5 * k, k, 26);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- cropRows: a field of short rows, wonky, some broken ----------
    cropRows(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const rows = opts.rows || 5, W = 46 * vary(ctx, k, 0.08);
      // field boundary (open, hand-drawn), and a corner post on one side
      s += path(curve([[-W / 2, 0], [-W * 0.3, -0.5 * k], [W * 0.1, 0.3 * k], [W / 2, -0.3 * k]]), S.inkSoft, HAIR);
      const postSide = ctx.rand() < 0.5 ? -1 : 1;
      s += line(postSide * (W / 2 + 0.5 * k), 0.3 * k, postSide * (W / 2 + 0.5 * k), -3.5 * k, S.ink, SEC);
      const brokenRow = Math.floor(ctx.rand() * rows);
      const shortRow = Math.floor(ctx.rand() * rows);
      for (let r = 0; r < rows; r++) {
        const t = r / (rows - 1);
        const ry = -r * (2.8 + ctx.rand() * 0.8) * k - 1 * k;
        const inset = t * 7 * k;
        let x0 = -W / 2 + inset + ctx.rand() * 2 * k, x1 = W / 2 - inset * 0.7 - ctx.rand() * 2 * k;
        if (r === shortRow) x1 -= W * (0.2 + ctx.rand() * 0.2);
        // the furrow line, broken once on one row
        if (r === brokenRow) {
          const g0 = x0 + (x1 - x0) * (0.35 + ctx.rand() * 0.3), g1 = g0 + 4 * k;
          s += path(curve([[x0, ry], [(x0 + g0) / 2, ry + (ctx.rand() - 0.5) * 1.0 * k], [g0, ry]]), S.moraine, HAIR);
          s += path(curve([[g1, ry], [(g1 + x1) / 2, ry + (ctx.rand() - 0.5) * 1.0 * k], [x1, ry]]), S.moraine, HAIR);
        } else s += path(curve([[x0, ry], [(x0 + x1) / 2, ry + (ctx.rand() - 0.5) * 1.2 * k], [x1, ry]]), S.moraine, HAIR);
        // plants: spacing wobbles, each a different little mark, some missing
        const sp = (3.4 - t * 0.6) * k;
        for (let c = x0 + 1 * k; c < x1; c += sp + (ctx.rand() - 0.5) * 1.6 * k) {
          if (ctx.rand() < 0.15) continue;
          const h = (1.3 + ctx.rand() * 1.0) * k * (1 - t * 0.3);
          const kind = ctx.rand(), lean = (ctx.rand() - 0.5) * 0.6 * k;
          if (kind < 0.45) s += path(`M${f(c)} ${f(ry)} l${f(-0.5 * k + lean)} ${f(-h)} M${f(c)} ${f(ry)} l${f(0.4 * k + lean)} ${f(-h * 0.9)}`, S.sageDeep, HAIR);
          else if (kind < 0.75) s += path(`M${f(c)} ${f(ry)} l${f(lean)} ${f(-h)} M${f(c + lean * 0.5)} ${f(ry - h * 0.5)} l${f(0.5 * k)} ${f(-0.6 * k)} M${f(c + lean * 0.3)} ${f(ry - h * 0.35)} l${f(-0.5 * k)} ${f(-0.4 * k)}`, S.sageDeep, HAIR);
          else s += path(`M${f(c)} ${f(ry)} q${f(-0.6 * k)} ${f(-h * 0.4)} ${f(-0.6 * k + lean)} ${f(-h)} M${f(c)} ${f(ry)} q${f(0.5 * k)} ${f(-h * 0.3)} ${f(0.7 * k + lean)} ${f(-h * 0.8)}`, S.sageDeep, HAIR);
        }
      }
      s += ground(ctx, 0, 0.8 * k, k, 25);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- orchard: 4-6 fruit trees, each its own tree ----------
    orchard(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      const n = opts.count || 5;
      let s = '';
      const back = Math.floor(n / 2), front = n - back;
      const tree = (tx, ty, h) => {
        let t = '';
        const lean = (ctx.rand() - 0.5) * 1.6 * k;
        const cx = tx + lean, cy = ty - h * 0.72, r = h * vary(ctx, 0.3, 0.12), ry = r * (0.8 + ctx.rand() * 0.25);
        // canopy knock-out first so nothing behind shows through
        let d = ''; const m = 7 + Math.floor(ctx.rand() * 3);
        const pts = [];
        for (let i = 0; i < m; i++) { const a = (i / m) * Math.PI * 2; pts.push([cx + Math.cos(a) * r * (1 + (ctx.rand() - 0.5) * 0.22), cy + Math.sin(a) * ry * (1 + (ctx.rand() - 0.5) * 0.2), a]); }
        for (let i = 0; i <= m; i++) {
          const p = pts[i % m];
          if (i === 0) d += `M${f(p[0])} ${f(p[1])}`;
          else { const a2 = p[2] - Math.PI / m; d += ` Q${f(cx + Math.cos(a2) * r * 1.22)} ${f(cy + Math.sin(a2) * ry * 1.2)} ${f(p[0])} ${f(p[1])}`; }
        }
        t += fpath(d + ' Z', S.paper, 'none', 0);
        // trunk and a fork of branches reaching into the canopy
        t += path(`M${f(tx)} ${f(ty)} Q${f(tx + lean * 0.4)} ${f(ty - h * 0.3)} ${f(tx + lean)} ${f(ty - h * 0.55)}`, S.ink, CONT);
        const nb = 2 + Math.floor(ctx.rand() * 2);
        for (let i = 0; i < nb; i++) {
          const dir = (i % 2 ? 1 : -1) * (0.4 + ctx.rand() * 0.6);
          t += path(`M${f(tx + lean)} ${f(ty - h * 0.52)} q${f(dir * 0.8 * k)} ${f(-0.8 * k)} ${f(dir * 1.5 * k)} ${f(-(1.2 + ctx.rand() * 0.9) * k)}`, S.ink, SEC);
        }
        // canopy outline as a broken run (gap on the lit side)
        const gap = Math.floor(ctx.rand() * m);
        let run = '';
        for (let i = 0; i < m; i++) {
          if (i === gap) continue;
          const p = pts[i], q = pts[(i + 1) % m];
          const a2 = (p[2] + (i + 1 === m ? Math.PI * 2 : q[2])) / 2;
          run += `M${f(p[0])} ${f(p[1])} Q${f(cx + Math.cos(a2) * r * 1.22)} ${f(cy + Math.sin(a2) * ry * 1.2)} ${f(q[0])} ${f(q[1])} `;
        }
        t += path(run.trim(), S.sageDeep, SEC);
        // fruit: 0–4 small rings, never the same count
        const nf = Math.floor(ctx.rand() * 3.5);
        for (let i = 0; i < nf; i++) {
          const fx = cx + (ctx.rand() - 0.5) * r * 1.2, fy = cy + (ctx.rand() - 0.2) * ry * 1.0;
          t += dot(fx, fy, 0.32 * k, S.ink);
        }
        // tone by line: a band of hatch inside the lower-right edge, tightening toward it
        const na = 4 + Math.floor(ctx.rand() * 3);
        for (let i = 0; i < na; i++) {
          const a = 0.15 + i * (1.1 / na);
          const ex = cx + Math.cos(a) * r * 0.88, ey = cy + Math.sin(a) * ry * 0.88;
          const ll = (1.2 + ctx.rand() * 0.8) * k;
          t += line(ex - ll * 0.55, ey - ll * 0.8, ex, ey, S.sageDeep, HAIR);
        }
        // two or three scallop arcs inside the upper canopy (leaf clumps)
        for (let i = 0; i < 2 + Math.floor(ctx.rand() * 2); i++) { const px = cx + (ctx.rand() - 0.5) * r, py = cy - ctx.rand() * ry * 0.6; t += path(`M${f(px)} ${f(py)} q${f(0.7 * k)} ${f(-0.6 * k)} ${f(1.4 * k)} 0`, S.sageDeep, HAIR); }
        // shadow on the ground to the right of the trunk
        t += line(tx + 1 * k, ty + 0.3 * k, tx + (3 + ctx.rand() * 2) * k, ty + 0.3 * k, S.inkSoft, HAIR);
        return t;
      };
      const spacing = 14 * k;
      let out = '';
      for (let i = 0; i < back; i++) out += tree(-spacing * (back - 1) / 2 + i * spacing + 4 * k + (ctx.rand() - 0.5) * 5 * k, -7 * k, (9.5 + ctx.rand() * 3) * k);
      for (let i = 0; i < front; i++) out += tree(-spacing * (front - 1) / 2 + i * spacing + (ctx.rand() - 0.5) * 5 * k, 0, (13 + ctx.rand() * 4) * k);
      s += out;
      s += ground(ctx, 0, 0.6 * k, k, 28);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- yak: a shaggy yak, facing left by default ----------
    yak(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const L = 22 * vary(ctx, k, 0.08), H = 12 * vary(ctx, k, 0.07); // body length / shoulder height
      const headUp = ctx.rand() < 0.35;
      // body mass: hump at shoulder (left), lower rump (right)
      const body = `M${f(-L * 0.42)} ${f(-H * 0.55)} Q${f(-L * 0.45)} ${f(-H * 1.05)} ${f(-L * 0.18)} ${f(-H * 1.14)} Q${f(L * 0.05)} ${f(-H * 1.12)} ${f(L * 0.25)} ${f(-H * 1.0)} Q${f(L * 0.45)} ${f(-H * 0.9)} ${f(L * 0.42)} ${f(-H * 0.55)}`;
      s += fpath(body + ` L${f(L * 0.42)} ${f(-H * 0.45)} L${f(-L * 0.42)} ${f(-H * 0.45)} Z`, ctx.MIX(S.paper, S.ink, 0.07), 'none', 0);
      s += path(body, S.ink, CONT);
      // shaggy skirt along the belly: hanging locks of unequal length and spacing
      let fringe = `M${f(L * 0.42)} ${f(-H * 0.55)}`;
      for (let fx = L * 0.42; fx > -L * 0.4; fx -= (1.6 + ctx.rand() * 1.4) * k) {
        const drop = (1.4 + ctx.rand() * 1.8) * k;
        fringe += ` l${f(-0.5 * k)} ${f(drop)} l${f(-1.0 * k)} ${f(-drop + 0.3 * k)}`;
      }
      s += path(fringe, S.ink, SEC);
      // long hair strokes on the flank, denser toward the rump (shaded side)
      const nh = 8 + Math.floor(ctx.rand() * 4);
      for (let i = 0; i < nh; i++) {
        const u = Math.pow(ctx.rand(), 0.7);
        const hx = -L * 0.25 + u * L * 0.6, hy = -H * (0.7 + ctx.rand() * 0.3);
        s += path(`M${f(hx)} ${f(hy)} q${f(0.3 * k)} ${f(2 * k)} ${f(-0.2 * k)} ${f((2.5 + ctx.rand() * 2.5) * k)}`, S.inkSoft, HAIR);
      }
      s += hatch(ctx, L * 0.2, -H * 0.95, k, 4, 2.4 * k, S.inkSoft, 1.6 * k, 0.6 * k);
      // legs, thick, with hair; the near hind leg set back a little differently each time
      const stride = ctx.rand();
      const legs = [[-L * 0.3, -0.6 - stride * 0.6], [-L * 0.18, 0.2], [L * 0.22, 0.2 + stride * 0.4], [L * 0.36, 1.0]];
      legs.forEach(l => {
        s += path(`M${f(l[0] - 1.2 * k)} ${f(-H * 0.5)} L${f(l[0] + l[1] * k - 1.0 * k)} 0 M${f(l[0] + 1.2 * k)} ${f(-H * 0.5)} L${f(l[0] + l[1] * k + 1.0 * k)} 0`, S.ink, SEC);
        s += line(l[0] + l[1] * k - 1.3 * k, 0, l[0] + l[1] * k + 1.3 * k, 0, S.ink, SEC); // hoof
      });
      // head: low-slung and heavy, or raised a little
      const hx = -L * 0.5, hy = -H * (headUp ? 0.78 : 0.6);
      s += fpath(`M${f(-L * 0.42)} ${f(-H * 0.85)} Q${f(hx - 1 * k)} ${f(-H * 0.95)} ${f(hx - 3.5 * k)} ${f(hy)} Q${f(hx - 4 * k)} ${f(hy + 3 * k)} ${f(hx - 1.5 * k)} ${f(hy + 3.5 * k)} Q${f(hx + 1 * k)} ${f(hy + 2.5 * k)} ${f(-L * 0.42)} ${f(-H * 0.55)}`, ctx.MIX(S.paper, S.ink, 0.14), S.ink, SEC);
      s += hatch(ctx, hx - 2.2 * k, hy + 1.2 * k, k, 3, 1.4 * k, S.inkSoft, 0.9 * k, 0.3 * k);
      // horns: sweeping up and out, the far one lighter
      s += path(`M${f(hx - 0.5 * k)} ${f(-H * 0.92)} q${f(-1 * k)} ${f(-4 * k)} ${f(3 * k)} ${f(-5.5 * k)}`, S.ink, SEC);
      s += path(`M${f(hx + 1.5 * k)} ${f(-H * 0.92)} q${f(0.5 * k)} ${f(-3 * k)} ${f(3.5 * k)} ${f(-4 * k)}`, S.ink, HAIR);
      // eye (a dot) and forehead fringe
      s += dot(hx - 1.8 * k, hy + 0.3 * k, 0.3 * k, S.ink);
      s += path(`M${f(hx - 1 * k)} ${f(-H * 0.85)} l${f(-0.6 * k)} ${f(1.5 * k)} M${f(hx)} ${f(-H * 0.88)} l${f(-0.3 * k)} ${f(1.6 * k)} M${f(hx - 2 * k)} ${f(hy - 1 * k)} l${f(-0.5 * k)} ${f(1.2 * k)}`, S.inkSoft, HAIR);
      // tail: bushy
      s += path(`M${f(L * 0.42)} ${f(-H * 0.9)} q${f(2 * k)} ${f(1 * k)} ${f(1.5 * k)} ${f(5 * k)} M${f(L * 0.48)} ${f(-H * 0.6)} l${f(1.2 * k)} ${f(2.5 * k)} M${f(L * 0.5)} ${f(-H * 0.55)} l${f(0.3 * k)} ${f(3 * k)}`, S.ink, SEC);
      s += ground(ctx, 0, 0.5 * k, k, 16);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- goatFlock: 4-7 goats/sheep on a slope, one with a bell ----------
    goatFlock(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      const n = Math.max(4, Math.min(7, opts.count || 6));
      let s = '';
      // slope line rising to the left, broken
      const slope = t => -t * 9 * k; // y offset across x
      s += path(curve([[-30 * k, slope(-1) + 1.5 * k], [-12 * k, slope(-0.4) + 0.3 * k], [8 * k, slope(0.3) - 0.4 * k], [30 * k, slope(1) + 0.5 * k]]), S.inkSoft, HAIR, ' stroke-dasharray="6 3 9 4"');
      // grass tufts, each a different tuft
      const ng = 5 + Math.floor(ctx.rand() * 4);
      for (let i = 0; i < ng; i++) {
        const gx = (ctx.rand() - 0.5) * 56 * k; const gy = slope(gx / (30 * k)) + (ctx.rand() - 0.5) * 3 * k;
        const h = (1.2 + ctx.rand() * 1.2) * k;
        s += path(`M${f(gx)} ${f(gy)} l${f(-0.6 * k)} ${f(-h)} M${f(gx)} ${f(gy)} l${f(0.7 * k)} ${f(-h * 0.8)}` + (ctx.rand() > 0.4 ? ` M${f(gx + 0.2 * k)} ${f(gy)} l${f(0.1 * k)} ${f(-h * 1.3)}` : ''), S.sageDeep, HAIR);
      }
      // animals: uneven spacing, varied size, type and stance; sorted back-to-front
      const placed = [];
      let px = -24 * k + ctx.rand() * 3 * k;
      const bell = Math.floor(ctx.rand() * n);
      for (let i = 0; i < n; i++) {
        const back = ctx.rand() < 0.4;
        const py = slope(px / (30 * k)) + (back ? -(2.5 + ctx.rand() * 2) * k : (0.2 + ctx.rand() * 0.8) * k);
        const sc = k * (back ? 0.78 : 1) * (0.92 + ctx.rand() * 0.16);
        const type = ctx.rand() < 0.3 ? 'sheep' : 'goat';
        const r = ctx.rand();
        const stance = r < 0.45 ? 'graze' : (r < 0.7 ? 'up' : 'stand');
        const facing = ctx.rand() > 0.35 ? -1 : 1;
        placed.push({ py, svg: `<g transform="translate(${f(px)} ${f(py)}) scale(${facing} 1)">${goat(ctx, S, sc, type, i === bell, stance)}</g>` });
        px += (48 * k / n) * (0.6 + ctx.rand() * 0.8);
      }
      placed.sort((a, b) => a.py - b.py).forEach(p => s += p.svg);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- birdsFlying: 3-5 small birds, each in a different attitude ----------
    birdsFlying(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      const n = Math.max(3, Math.min(5, opts.count || 4));
      let s = '';
      // a loose string rising to the right, spacing and size uneven (the far ones smaller)
      let bx = -14 * k + ctx.rand() * 3 * k;
      for (let i = 0; i < n; i++) {
        const far = ctx.rand() < 0.35;
        const by = -i * (2.5 + ctx.rand() * 2.5) * k - 4 * k + (ctx.rand() - 0.5) * 3 * k;
        const w = (far ? 3.0 : 4.4) * k * (0.85 + ctx.rand() * 0.3);
        s += bird(ctx, S, bx, by, w, far ? 0.7 * k : k);
        bx += (5 + ctx.rand() * 5) * k;
      }
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- flowerMeadow: small flowers and grasses, with a bee or two ----------
    flowerMeadow(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const W = 36 * vary(ctx, k, 0.08);
      // grasses: blades of differing height and lean, some in pairs
      const ng = 12 + Math.floor(ctx.rand() * 8);
      for (let i = 0; i < ng; i++) {
        const gx = (ctx.rand() - 0.5) * W, gy = (ctx.rand() - 0.5) * 2 * k;
        const h = (2 + ctx.rand() * 3.5) * k, lean = (ctx.rand() - 0.5) * 2.4 * k;
        s += path(`M${f(gx)} ${f(gy)} q${f(lean * 0.3)} ${f(-h * 0.6)} ${f(lean)} ${f(-h)}` + (ctx.rand() < 0.4 ? ` M${f(gx + 0.5 * k)} ${f(gy)} q${f(-lean * 0.2)} ${f(-h * 0.4)} ${f(-lean * 0.5)} ${f(-h * 0.7)}` : ''), S.sageDeep, HAIR);
      }
      // flowers: thin stem, a small open head — three kinds, never a regular count
      const nf = 6 + Math.floor(ctx.rand() * 5);
      for (let i = 0; i < nf; i++) {
        const fx = (ctx.rand() - 0.5) * W * 0.95, fy = (ctx.rand() - 0.5) * 2 * k;
        const h = (3.5 + ctx.rand() * 4.5) * k, lean = (ctx.rand() - 0.5) * 2.4 * k;
        s += path(`M${f(fx)} ${f(fy)} q${f(lean * 0.4)} ${f(-h * 0.5)} ${f(lean)} ${f(-h)}`, S.sageDeep, HAIR);
        const hx = fx + lean, hy = fy - h, r = (0.8 + ctx.rand() * 0.6) * k;
        const kind = ctx.rand();
        if (kind < 0.3) {
          // bell flower: drooping, two or three lobes
          s += path(`M${f(hx)} ${f(hy)} q${f(-r)} ${f(r * 0.3)} ${f(-r * 0.9)} ${f(r * 1.2)} M${f(hx)} ${f(hy)} q${f(r * 0.2)} ${f(r * 0.5)} ${f(-r * 0.1)} ${f(r * 1.4)}` + (ctx.rand() < 0.6 ? ` M${f(hx)} ${f(hy)} q${f(r)} ${f(r * 0.4)} ${f(r * 0.7)} ${f(r * 1.3)}` : ''), S.ink, HAIR);
        } else if (kind < 0.55) {
          // umbel: a spray of short stalks ending in dots
          let d = '';
          const nu = 3 + Math.floor(ctx.rand() * 3);
          for (let p = 0; p < nu; p++) { const a = -Math.PI / 2 + (p / (nu - 1) - 0.5) * 1.6; d += `M${f(hx)} ${f(hy)} l${f(Math.cos(a) * r * 1.2)} ${f(Math.sin(a) * r * 1.2)}`; s += dot(hx + Math.cos(a) * r * 1.3, hy + Math.sin(a) * r * 1.3, 0.25 * k, S.ink); }
          s += path(d, S.ink, HAIR);
        } else {
          // daisy: an uneven ring of petal strokes around a dot
          let d = '';
          const np = 5 + Math.floor(ctx.rand() * 3);
          for (let p = 0; p < np; p++) { const a = p / np * Math.PI * 2 + ctx.rand() * 0.5; const pl = r * (0.6 + ctx.rand() * 0.3); d += `M${f(hx + Math.cos(a) * r * 0.35)} ${f(hy + Math.sin(a) * r * 0.35)} l${f(Math.cos(a) * pl)} ${f(Math.sin(a) * pl)}`; }
          s += path(d, S.ink, HAIR);
          s += dot(hx, hy, r * 0.28, S.ink);
        }
        // leaf, on one side or the other
        const ld = ctx.rand() < 0.5 ? 1 : -1;
        s += path(`M${f(fx + lean * 0.4)} ${f(fy - h * 0.45)} q${f(ld * 1.4 * k)} ${f(-0.4 * k)} ${f(ld * 1.8 * k)} ${f(-1.6 * k)}`, S.sageDeep, HAIR);
      }
      // bees: one or two tiny ink bodies with wing ticks and a looping flight line
      const nb = 1 + Math.floor(ctx.rand() * 2);
      for (let b = 0; b < nb; b++) {
        const bx = (b === 0 ? -8 : 10) * k + (ctx.rand() - 0.5) * 6 * k, by = -(8 + ctx.rand() * 5) * k;
        s += fpath(`M${f(bx - 1.0 * k)} ${f(by)} q${f(0.4 * k)} ${f(-0.7 * k)} ${f(2.0 * k)} ${f(-0.1 * k)} q${f(-0.5 * k)} ${f(0.8 * k)} ${f(-2.0 * k)} ${f(0.1 * k)} Z`, S.ink, 'none', 0);
        s += path(`M${f(bx - 0.2 * k)} ${f(by - 0.5 * k)} q${f(-0.8 * k)} ${f(-1.3 * k)} ${f(-1.4 * k)} ${f(-0.4 * k)} M${f(bx + 0.2 * k)} ${f(by - 0.5 * k)} q${f(0.7 * k)} ${f(-1.3 * k)} ${f(1.3 * k)} ${f(-0.5 * k)}`, S.inkSoft, HAIR);
        const dir = ctx.rand() < 0.5 ? -1 : 1;
        s += path(`M${f(bx - dir * 2 * k)} ${f(by + 0.8 * k)} q${f(-dir * 3 * k)} ${f(1.5 * k)} ${f(-dir * 4 * k)} ${f(4 * k)} q${f(-dir * 0.5 * k)} ${f(2 * k)} ${f(dir * 1.5 * k)} ${f(1.6 * k)}`, S.inkSoft, HAIR, ' stroke-dasharray="0.6 1.4"');
      }
      s += ground(ctx, 0, 1.2 * k, k, 19);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- beehive: traditional skep (or log hive with opts.type='log') on a stand ----------
    beehive(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      // stand: a plank on two short posts
      const sw = 11 * vary(ctx, k, 0.08), sy = -4 * k;
      s += fpath(`M${f(-sw / 2 - 1 * k)} ${f(sy)} l${f(sw + 2 * k)} ${f(0.3 * k)} l0 ${f(1.2 * k)} l${f(-sw - 2 * k)} ${f(-0.3 * k)} Z`, S.paper, S.ink, SEC);
      s += path(`M${f(-sw / 2 + 1 * k)} ${f(sy + 1.3 * k)} l${f(-0.4 * k)} ${f(4 * k)} M${f(sw / 2 - 1 * k)} ${f(sy + 1.5 * k)} l${f(0.5 * k)} ${f(3.8 * k)}`, S.ink, SEC);
      s += hatch(ctx, sw / 2 - 1 * k, sy + 2 * k, k, 2, 1.3 * k, S.inkSoft, 0.4 * k, 0.9 * k);
      if (opts.type === 'log') {
        // log hive: a hollow trunk standing on the stand, a board lid, an entrance slot
        const lw = 9 * k, lh = 7 * vary(ctx, k, 0.1), top = sy - lh;
        s += fpath(`M${f(-lw / 2)} ${f(sy)} L${f(-lw / 2 - 0.3 * k)} ${f(top + 1 * k)} Q${f(-lw / 2)} ${f(top - 0.4 * k)} ${f(-lw / 2 + 1.5 * k)} ${f(top)} L${f(lw / 2 - 1 * k)} ${f(top + 0.3 * k)} Q${f(lw / 2 + 0.3 * k)} ${f(top + 0.5 * k)} ${f(lw / 2 + 0.2 * k)} ${f(top + 1.8 * k)} L${f(lw / 2)} ${f(sy)} Z`, ctx.MIX(S.paper, S.moraine, 0.15), S.ink, CONT);
        const ng = 3 + Math.floor(ctx.rand() * 2);
        for (let i = 0; i < ng; i++) s += path(`M${f(-lw / 2 + 0.8 * k)} ${f(top + (1.5 + i * 1.4) * k)} q${f(lw * 0.5)} ${f((ctx.rand() - 0.5) * k)} ${f(lw - 1.6 * k)} ${f(0.2 * k)}`, S.inkSoft, HAIR);
        s += hatch(ctx, lw * 0.2, top + 2 * k, k, 4, 2 * k, S.inkSoft, 0.5 * k, 1.1 * k);
        s += fpath(`M${f(-lw / 2 + 1.2 * k)} ${f(top - 0.5 * k)} l${f(lw - 2.4 * k)} ${f(0.3 * k)} l${f(0.5 * k)} ${f(-1.4 * k)} l${f(-lw + 1.4 * k)} ${f(-0.2 * k)} Z`, S.paper, S.ink, SEC); // board lid
        s += line(-1 * k, sy - 1.6 * k, 1.2 * k, sy - 1.6 * k, S.ink, CONT); // entrance
      } else {
        // skep: domed basket of coiled straw: stacked arcs narrowing to a top
        const bw = 10 * vary(ctx, k, 0.08), bh = 10 * vary(ctx, k, 0.1);
        const dome = `M${f(-bw / 2)} ${f(sy)} C${f(-bw / 2)} ${f(sy - bh * 0.75)} ${f(-bw * 0.22)} ${f(sy - bh)} 0 ${f(sy - bh)} C${f(bw * 0.22)} ${f(sy - bh)} ${f(bw / 2)} ${f(sy - bh * 0.75)} ${f(bw / 2)} ${f(sy)} Z`;
        s += fpath(dome, ctx.MIX(S.paper, S.moraine, 0.12), S.ink, CONT);
        // coil lines: arcs across the dome, spacing tightening at the top, one or two broken
        const nc = 5 + Math.floor(ctx.rand() * 3);
        for (let i = 1; i < nc; i++) {
          const t = i / nc; const yy = sy - bh * t * 0.92;
          const hw = bw / 2 * Math.sqrt(1 - Math.pow(t, 2.4)) * 0.98;
          if (ctx.rand() < 0.25) s += path(`M${f(-hw)} ${f(yy + 0.2 * k)} q${f(hw * 0.4)} ${f(-0.5 * k)} ${f(hw * 0.8)} ${f(-0.3 * k)} M${f(hw * 0.1)} ${f(yy - 0.2 * k)} q${f(hw * 0.5)} ${f(0.1 * k)} ${f(hw * 0.9)} ${f(0.4 * k)}`, S.inkSoft, HAIR);
          else s += path(`M${f(-hw)} ${f(yy + 0.2 * k)} q${f(hw)} ${f((ctx.rand() - 0.6) * 1.2 * k)} ${f(hw * 2)} 0`, S.inkSoft, HAIR);
        }
        // knob at top, entrance arch at base
        s += path(`M${f(-1 * k)} ${f(sy - bh)} q${f(1 * k)} ${f(-1.5 * k)} ${f(2 * k)} 0`, S.ink, SEC);
        s += fpath(`M${f(-1.2 * k)} ${f(sy)} q0 ${f(-2.2 * k)} ${f(1.2 * k)} ${f(-2.2 * k)} q${f(1.2 * k)} 0 ${f(1.2 * k)} ${f(2.2 * k)} Z`, S.ink, 'none', 0);
        s += hatch(ctx, bw * 0.26, sy - bh * 0.5, k, 5, 2.2 * k, S.inkSoft, 0.45 * k, 1.2 * k);
      }
      // a few bees around the entrance: tiny bodies, wing ticks
      const nb = 2 + Math.floor(ctx.rand() * 3);
      for (let i = 0; i < nb; i++) {
        const bx = (ctx.rand() - 0.5) * 14 * k, by = sy - (ctx.rand() * 14 + 1) * k;
        s += dot(bx, by, 0.35 * k, S.ink);
        s += path(`M${f(bx - 0.6 * k)} ${f(by - 0.5 * k)} l${f(0.4 * k)} ${f(0.3 * k)} M${f(bx + 0.6 * k)} ${f(by - 0.5 * k)} l${f(-0.4 * k)} ${f(0.3 * k)}`, S.inkSoft, HAIR);
      }
      s += ground(ctx, 0, 0.4 * k, k, 9);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- irrigationChannel: a stone-lined channel with a sluice gate ----------
    irrigationChannel(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const W = 56 * k, cw = 4.5 * vary(ctx, k, 0.1); // channel length, channel width
      // channel runs left->right with a gentle bend; two bank lines with a flat water body between
      const mid = [[-W / 2, 0], [-W * 0.2, -1.5 * k], [W * 0.15, 0.5 * k], [W / 2, -1 * k]];
      const offset = (pts, dy) => pts.map(p => [p[0], p[1] + dy]);
      const top = offset(mid, -cw / 2), bot = offset(mid, cw / 2);
      let wd = curve(top);
      const rb = bot.slice().reverse();
      wd += ' L' + rb.map(p => f(p[0]) + ' ' + f(p[1])).join(' L') + ' Z';
      s += fpath(wd, S.waterPale, 'none', 0);
      s += path(curve(top), S.ink, SEC);
      s += path(curve(bot), S.ink, SEC);
      // water: flow lines in S.water, hairline, unequal lengths
      const nfl = 4 + Math.floor(ctx.rand() * 4);
      for (let i = 0; i < nfl; i++) {
        const fx = -W * 0.45 + ctx.rand() * W * 0.85, len = (3 + ctx.rand() * 7) * k;
        const t = (fx + W / 2) / W;
        const yy = -1.5 * k * Math.sin(t * Math.PI * 1.5) * 0.7 + (ctx.rand() - 0.5) * cw * 0.5;
        s += path(`M${f(fx)} ${f(yy)} q${f(len * 0.5)} ${f(-0.4 * k)} ${f(len)} 0`, S.water, HAIR);
      }
      // stone lining: a course of stones along each bank, with missing stones
      const bankY = (bx, side) => { const t = (bx + W / 2) / W; return -1.5 * k * Math.sin(t * Math.PI * 1.5) * 0.7 + side * (cw / 2 + 0.9 * k); };
      for (let side = -1; side <= 1; side += 2) {
        let bx = -W / 2 + ctx.rand() * 2 * k;
        while (bx < W / 2 - 2 * k) {
          const sl = (2 + ctx.rand() * 2.5) * k;
          if (ctx.rand() > 0.12) s += path(`M${f(bx)} ${f(bankY(bx, side))} L${f(bx + sl)} ${f(bankY(bx + sl, side))} l${f(-0.2 * k)} ${f(-side * 0.7 * k)}`, S.inkSoft, HAIR);
          else s += fpath(`M${f(bx + 0.3 * k)} ${f(bankY(bx, side))} l${f(sl * 0.6)} 0 l${f(-0.2 * k)} ${f(-side * 0.8 * k)} l${f(-sl * 0.4)} 0 Z`, S.inkSoft, 'none', 0);   // missing stone
          bx += sl + (0.3 + ctx.rand() * 0.8) * k;
        }
      }
      // sluice gate: two posts, a raised board, a crossbar with a handle; position varies
      const gx = (-8 + ctx.rand() * 8) * k;
      const gy = 0.3 * k;
      const lift = (4.5 + ctx.rand() * 2) * k;
      s += path(`M${f(gx - 2.8 * k)} ${f(gy - cw / 2 - 1.2 * k)} l0 ${f(cw + 2.4 * k)} M${f(gx + 2.8 * k)} ${f(gy - cw / 2 - 1.2 * k)} l0 ${f(cw + 2.4 * k)}`, S.ink, SEC);
      s += fpath(`M${f(gx - 2.2 * k)} ${f(gy - cw / 2 - lift - 0.4 * k)} l${f(4.4 * k)} 0 l0 ${f(lift)} l${f(-4.4 * k)} 0 Z`, ctx.MIX(S.paper, S.moraine, 0.18), S.ink, SEC); // raised board
      s += path(`M${f(gx - 1.2 * k)} ${f(gy - cw / 2 - lift * 0.7)} l${f(2.4 * k)} 0 M${f(gx - 1.2 * k)} ${f(gy - cw / 2 - lift * 0.35)} l${f(2.4 * k)} 0`, S.inkSoft, HAIR);
      s += hatch(ctx, gx + 0.6 * k, gy - cw / 2 - lift * 0.9, k, 3, 1.2 * k, S.inkSoft, 0.3 * k, 1.0 * k);
      s += line(gx - 3.4 * k, gy - cw / 2 - 1.6 * k, gx + 3.4 * k, gy - cw / 2 - 1.6 * k, S.ink, SEC); // crossbar
      s += path(`M${f(gx - 2.8 * k)} ${f(gy - cw / 2 - 1.2 * k)} l0 ${f(-6 * k)} l${f(5.6 * k)} 0 l0 ${f(6 * k)}`, S.ink, CONT); // gate frame uprights + top beam
      s += path(`M${f(gx)} ${f(gy - cw / 2 - lift - 0.4 * k)} L${f(gx)} ${f(gy - cw / 2 - 8.5 * k)} l${f(1.5 * k)} 0`, S.ink, SEC); // handle
      // a little turbulence below the gate
      s += path(`M${f(gx + 3.5 * k)} ${f(gy - 0.8 * k)} q${f(1 * k)} ${f(-0.8 * k)} ${f(2 * k)} 0 q${f(1 * k)} ${f(0.8 * k)} ${f(2 * k)} 0`, S.water, HAIR);
      s += ground(ctx, 0, cw / 2 + 2.2 * k, k, 26);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- waterfall: a fall over a rock step into a pool ----------
    waterfall(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const H = 28 * vary(ctx, k, 0.08), W = 20 * vary(ctx, k, 0.08);
      // crag: irregular rock faces either side of a notch; the ledge positions vary per call
      const v = () => (ctx.rand() - 0.5) * 2 * k;
      const lface = [[-W / 2 - 12 * k, 1 * k], [-W / 2 - 10 * k + v(), -H * 0.25 + v()], [-W / 2 - 6 * k + v(), -H * 0.3], [-W / 2 - 7 * k + v(), -H * 0.55 + v()], [-W / 2 - 2 * k + v(), -H * 0.7], [-W / 2 - 3 * k + v(), -H * 0.88], [-W / 2 + 1 * k, -H]];
      const rface = [[W / 2 - 1 * k, -H - 1 * k], [W / 2 + 3 * k + v(), -H * 0.9], [W / 2 + 2 * k + v(), -H * 0.72 + v()], [W / 2 + 7 * k + v(), -H * 0.6], [W / 2 + 6 * k + v(), -H * 0.35 + v()], [W / 2 + 11 * k + v(), -H * 0.2], [W / 2 + 13 * k, 1 * k]];
      const L = lface, R = rface;
      s += fpath(poly(L) + ' L' + R.map(p => f(p[0]) + ' ' + f(p[1])).join(' L') + ' Z', ctx.MIX(S.paper, S.stone, 0.22), 'none', 0);
      s += path(poly(L), S.ink, CONT);
      s += path(poly(R), S.ink, CONT);
      // ledges and cracks: short strokes following the faces, heavier on the right (shade)
      for (let i = 0; i < 5; i++) {
        const p = L[i + 1];
        s += path(`M${f(p[0])} ${f(p[1])} l${f(-(2 + ctx.rand() * 3) * k)} ${f((0.6 + ctx.rand()) * k)}`, S.inkSoft, SEC);
      }
      for (let i = 0; i < 6; i++) {
        const p = R[i];
        s += path(`M${f(p[0])} ${f(p[1])} l${f((2 + ctx.rand() * 3) * k)} ${f((0.8 + ctx.rand()) * k)}`, S.inkSoft, SEC);
        s += hatch(ctx, p[0] + 1.5 * k, p[1] + 1.5 * k, k, 3, 1.8 * k, S.inkSoft, 0.9 * k, 0.6 * k);
      }
      // the fall: a sheet in paperHigh, narrowing then flaring at the foot; a mid-ledge breaks it
      const fw = W * 0.5, ledgeY = -H * (0.4 + ctx.rand() * 0.12);
      s += fpath(`M${f(-fw / 2)} ${f(-H)} Q${f(-fw / 2 + 0.5 * k)} ${f(ledgeY)} ${f(-fw / 2 - 1.5 * k)} ${f(ledgeY + 1 * k)} Q${f(-fw / 2 - 2 * k)} ${f(-H * 0.15)} ${f(-fw / 2 - 3.5 * k)} ${f(-2 * k)} L${f(fw / 2 + 3.5 * k)} ${f(-2 * k)} Q${f(fw / 2 + 2 * k)} ${f(-H * 0.15)} ${f(fw / 2 + 1.5 * k)} ${f(ledgeY + 1 * k)} Q${f(fw / 2 - 0.5 * k)} ${f(ledgeY)} ${f(fw / 2)} ${f(-H)} Z`, S.paperHigh, 'none', 0);
      // upper drop strokes: hairlines, unequal starts and lengths
      const nd = 4 + Math.floor(ctx.rand() * 3);
      for (let i = 0; i < nd; i++) {
        const fx = -fw / 2 + 0.5 * k + i * (fw - 1 * k) / (nd - 1) + (ctx.rand() - 0.5) * k;
        s += path(`M${f(fx)} ${f(-H + ctx.rand() * 2 * k)} Q${f(fx + (ctx.rand() - 0.5) * k)} ${f((-H + ledgeY) / 2)} ${f(fx + (i - nd / 2) * 0.2 * k)} ${f(ledgeY - ctx.rand() * 3 * k)}`, S.water, HAIR);
      }
      // the ledge: a spray line (secondary), then the lower drop, spreading
      s += path(`M${f(-fw / 2 - 1.5 * k)} ${f(ledgeY + 0.8 * k)} q${f(fw * 0.5 + 1.5 * k)} ${f(1.5 * k)} ${f(fw + 3 * k)} 0`, S.water, SEC);
      const nl = 5 + Math.floor(ctx.rand() * 3);
      for (let i = 0; i < nl; i++) {
        const fx = -fw / 2 - 1 * k + i * (fw + 2 * k) / (nl - 1) + (ctx.rand() - 0.5) * k;
        s += path(`M${f(fx)} ${f(ledgeY + 1.5 * k)} Q${f(fx + (i - nl / 2) * 0.3 * k)} ${f(ledgeY * 0.5)} ${f(fx + (i - nl / 2) * 0.9 * k)} ${f(-H * (0.08 + ctx.rand() * 0.18))}`, S.water, HAIR);
      }
      // lip at the top
      s += path(`M${f(-fw / 2 - 1.5 * k)} ${f(-H - 1.2 * k)} q${f(fw * 0.5 + 1.5 * k)} ${f(1.6 * k)} ${f(fw + 3 * k)} ${f(-0.4 * k)}`, S.water, SEC);
      // spray: a scatter of dots, denser near the foot
      const ns = 5 + Math.floor(ctx.rand() * 5);
      for (let i = 0; i < ns; i++) s += dot((ctx.rand() - 0.5) * W * 0.9, -2.5 * k - Math.pow(ctx.rand(), 1.6) * 7 * k, 0.3 * k, S.water);
      // plunge pool
      s += fpath(`M${f(-W / 2 - 6 * k)} ${f(1.2 * k)} Q${f(-W * 0.2)} ${f(-2.5 * k)} ${f(W * 0.1)} ${f(-1.8 * k)} Q${f(W * 0.5)} ${f(-2.6 * k)} ${f(W / 2 + 6 * k)} ${f(1.2 * k)} Q0 ${f(3.8 * k)} ${f(-W / 2 - 6 * k)} ${f(1.2 * k)} Z`, S.waterPale, S.water, SEC);
      for (let i = 0; i < 4; i++) {
        const rx = (ctx.rand() - 0.5) * W * 0.9, ry = 0 + ctx.rand() * 1.6 * k, rw = (3 + ctx.rand() * 3) * k;
        s += path(`M${f(rx - rw / 2)} ${f(ry)} q${f(rw / 2)} ${f(-0.5 * k)} ${f(rw)} 0`, S.water, HAIR);
      }
      // a tuft on a ledge, on one side or the other
      const tside = ctx.rand() < 0.5 ? -1 : 1;
      const tx = tside * (W / 2 + 6.5 * k), tyy = -H * (0.25 + ctx.rand() * 0.2);
      s += path(`M${f(tx)} ${f(tyy)} l${f(-0.5 * k)} ${f(-2 * k)} M${f(tx)} ${f(tyy)} l${f(0.6 * k)} ${f(-1.7 * k)}`, S.sageDeep, HAIR);
      s += ground(ctx, 0, 3.2 * k, k, 20);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- springAndTrough: spring from rock into a wooden trough ----------
    springAndTrough(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      // rock outcrop on the left, its crown varying a little per call
      const rh = 13.5 * vary(ctx, k, 0.1);
      const rock = `M${f(-22 * k)} ${f(0.5 * k)} L${f(-21 * k)} ${f(-6 * k)} L${f(-17 * k)} ${f(-rh * 0.88)} L${f(-11 * k)} ${f(-rh)} L${f(-7 * k)} ${f(-rh * 0.72)} L${f(-6 * k)} ${f(-4 * k)} L${f(-7 * k)} ${f(0.5 * k)}`;
      s += fpath(rock + ' Z', ctx.MIX(S.paper, S.stone, 0.25), 'none', 0);
      s += path(rock, S.ink, CONT);
      // cracks and hatch on the rock (right/lower side), tightening toward the shadow
      s += path(`M${f(-15 * k)} ${f(-rh * 0.8)} l${f(1.5 * k)} ${f(3 * k)} l${f(-1 * k)} ${f(2.5 * k)} M${f(-19 * k)} ${f(-7 * k)} l${f(2.5 * k)} ${f(1 * k)}`, S.inkSoft, HAIR);
      s += hatch(ctx, -11 * k, -rh * 0.6, k, 6, 2.4 * k, S.inkSoft, 0.6 * k, 1.3 * k);
      // spout: a hollowed half-log set into the rock
      s += path(`M${f(-8 * k)} ${f(-7 * k)} l${f(5 * k)} ${f(0.5 * k)} M${f(-8 * k)} ${f(-5.5 * k)} l${f(5.5 * k)} ${f(0.5 * k)} M${f(-3 * k)} ${f(-6.5 * k)} q${f(0.8 * k)} ${f(0.9 * k)} 0 ${f(1.5 * k)}`, S.ink, SEC);
      // water jet: two hairline arcs from spout into trough, in water colour
      s += path(`M${f(-3.2 * k)} ${f(-6 * k)} q${f(2.5 * k)} ${f(0.5 * k)} ${f(3 * k)} ${f(4 * k)} M${f(-3.2 * k)} ${f(-6.4 * k)} q${f(3 * k)} ${f(0.8 * k)} ${f(3.8 * k)} ${f(3.8 * k)}`, S.water, HAIR);
      // trough: a hollowed log on two stone feet, water body inside
      const tx0 = -3 * k, tx1 = (17 + ctx.rand() * 4) * k, ty = -1.5 * k, th = 4 * k;
      s += fpath(`M${f(tx0)} ${f(ty - th * 0.5)} L${f(tx0 - 0.3 * k)} ${f(ty + th * 0.5)} Q${f(tx0 + 1 * k)} ${f(ty + th * 0.9)} ${f(tx0 + 2.5 * k)} ${f(ty + th * 0.9)} L${f(tx1 - 2 * k)} ${f(ty + th * 0.95)} Q${f(tx1 + 0.5 * k)} ${f(ty + th * 0.9)} ${f(tx1)} ${f(ty + th * 0.4)} L${f(tx1 + 0.4 * k)} ${f(ty - th * 0.6)}`, ctx.MIX(S.paper, S.moraine, 0.15), S.ink, CONT);
      // water surface inside, slightly below rim: flat waterPale, hairline edge
      s += fpath(`M${f(tx0 + 0.6 * k)} ${f(ty - th * 0.2)} L${f(tx1 - 0.3 * k)} ${f(ty - th * 0.25)} L${f(tx1 - 0.2 * k)} ${f(ty + 0.3 * k)} L${f(tx0 + 0.5 * k)} ${f(ty + 0.3 * k)} Z`, S.waterPale, S.water, HAIR);
      s += path(`M${f(tx0 + 3 * k)} ${f(ty - 0.2 * k)} q${f(2 * k)} ${f(-0.4 * k)} ${f(4 * k)} 0`, S.water, HAIR);
      // rim line (front top edge)
      s += path(`M${f(tx0)} ${f(ty - th * 0.5)} Q${f((tx0 + tx1) / 2)} ${f(ty - th * 0.6 + (ctx.rand() - 0.5) * k)} ${f(tx1 + 0.4 * k)} ${f(ty - th * 0.6)}`, S.ink, SEC);
      // wood grain and shade under the rim
      for (let i = 0; i < 3; i++) s += path(`M${f(tx0 + 2 * k)} ${f(ty + (0.8 + i * 0.9) * k)} q${f(7 * k)} ${f((ctx.rand() - 0.5) * 0.8 * k)} ${f(14 * k)} ${f(0.2 * k)}`, S.inkSoft, HAIR);
      s += hatch(ctx, tx1 - 5 * k, ty + 0.6 * k, k, 3, 1.2 * k, S.inkSoft, 1.2 * k, 0.1 * k);
      // overflow drip at far end, and feet stones
      s += path(`M${f(tx1 + 0.3 * k)} ${f(ty - th * 0.2)} q${f(1.5 * k)} ${f(1.5 * k)} ${f(1.2 * k)} ${f(4 * k)}`, S.water, HAIR, ' stroke-dasharray="1 1.2"');
      s += fpath(`M${f(tx0 + 1.5 * k)} ${f(ty + th * 0.9)} l${f(-1 * k)} ${f(2.3 * k)} l${f(4 * k)} 0 l${f(-1 * k)} ${f(-2.3 * k)} Z M${f(tx1 - 4 * k)} ${f(ty + th * 0.9)} l${f(-1 * k)} ${f(2.3 * k)} l${f(4 * k)} 0 l${f(-0.8 * k)} ${f(-2.3 * k)} Z`, S.paper, S.ink, SEC);
      // wet ground under the overflow
      s += path(`M${f(tx1 - 1 * k)} ${f(1.2 * k)} q${f(3 * k)} ${f(-0.8 * k)} ${f(6 * k)} 0`, S.water, HAIR);
      s += ground(ctx, 0, 1.3 * k, k, 24);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- loggedStand: stumps and felled logs ----------
    loggedStand(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const stump = (sx, sy, r, h) => {
        let t = '';
        // cylinder: cut face in paperHigh with rings, side hatched on the right
        t += fpath(`M${f(sx - r)} ${f(sy - h)} l${f(-0.2 * k)} ${f(h)} q${f(r)} ${f(1.2 * k)} ${f(2 * r + 0.3 * k)} 0 l${f(-0.1 * k)} ${f(-h)}`, ctx.MIX(S.paper, S.moraine, 0.2), S.ink, SEC);
        t += fpath(`M${f(sx - r)} ${f(sy - h)} a${f(r)} ${f(r * 0.42)} 0 1 1 ${f(2 * r)} 0 a${f(r)} ${f(r * 0.42)} 0 1 1 ${f(-2 * r)} 0 Z`, S.paperHigh, S.ink, SEC);
        // growth rings, one or two
        t += path(`M${f(sx - r * 0.6)} ${f(sy - h)} a${f(r * 0.6)} ${f(r * 0.25)} 0 1 1 ${f(r * 1.2)} 0` + (ctx.rand() < 0.6 ? ` M${f(sx - r * 0.3)} ${f(sy - h + 0.05)} a${f(r * 0.3)} ${f(r * 0.12)} 0 1 1 ${f(r * 0.6)} 0` : ''), S.inkSoft, HAIR);
        // bark hatch on the right side, tightening toward the edge
        t += hatch(ctx, sx + r * 0.2, sy - h + r * 0.5, k, 3, h * 0.7, S.inkSoft, r * 0.3, 0.1 * k);
        // roots flare
        t += path(`M${f(sx - r - 0.2 * k)} ${f(sy)} l${f(-1.5 * k)} ${f(0.6 * k)} M${f(sx + r + 0.1 * k)} ${f(sy)} l${f(1.6 * k)} ${f(0.5 * k)}`, S.ink, SEC);
        return t;
      };
      const log = (lx, ly, len, r, ang) => {
        let t = '';
        const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
        const nx = -Math.sin(ang) * r, ny = Math.cos(ang) * r;
        t += fpath(poly([[lx + nx, ly + ny], [lx - nx, ly - ny], [lx - nx + dx, ly - ny + dy], [lx + nx + dx, ly + ny + dy]], true), ctx.MIX(S.paper, S.moraine, 0.2), S.ink, SEC);
        // end face (cut): small ellipse at the near end
        t += fpath(`M${f(lx + nx)} ${f(ly + ny)} a${f(r * 0.45)} ${f(r)} ${f(ang * 180 / Math.PI)} 1 0 ${f(-2 * nx)} ${f(-2 * ny)} a${f(r * 0.45)} ${f(r)} ${f(ang * 180 / Math.PI)} 1 0 ${f(2 * nx)} ${f(2 * ny)}`, S.paperHigh, S.ink, SEC);
        // bark lines along the log, a lopped branch stub or two
        for (let i = 1; i < 3; i++) { const o = (i / 3 - 0.5) * 2 * r * 0.7; t += path(`M${f(lx + 1.5 * k - Math.sin(ang) * o)} ${f(ly + Math.cos(ang) * o)} l${f(dx * (0.5 + ctx.rand() * 0.35))} ${f(dy * 0.8)}`, S.inkSoft, HAIR); }
        const nst = 1 + Math.floor(ctx.rand() * 2);
        for (let i = 0; i < nst; i++) { const u = 0.3 + ctx.rand() * 0.5; t += path(`M${f(lx + dx * u - nx)} ${f(ly + dy * u - ny)} l${f((0.2 + ctx.rand() * 0.5) * k)} ${f(-(1.4 + ctx.rand()) * k)}`, S.ink, SEC); }
        t += hatch(ctx, lx + dx * 0.15, ly + dy * 0.15 + r * 0.1, k, 4, r * 1.2, S.inkSoft, dx * 0.2, dy * 0.2);
        return t;
      };
      // layout: three stumps and two logs, positions and sizes varied; far ones first
      s += stump(-14 * k + (ctx.rand() - 0.5) * 3 * k, -1 * k, 2.4 * vary(ctx, k, 0.12), 4 * vary(ctx, k, 0.15));
      s += stump(8 * k + (ctx.rand() - 0.5) * 4 * k, -4 * k, 1.9 * vary(ctx, k, 0.12), 3.2 * vary(ctx, k, 0.15));
      s += log(-2 * k + (ctx.rand() - 0.5) * 3 * k, -5.5 * k, 12 * vary(ctx, k, 0.12), 1.3 * k, 0.12 + (ctx.rand() - 0.5) * 0.15);
      s += stump(16 * k + (ctx.rand() - 0.5) * 3 * k, 0.3 * k, 2.6 * vary(ctx, k, 0.12), 4.5 * vary(ctx, k, 0.15));
      s += log(-8 * k + (ctx.rand() - 0.5) * 3 * k, 0, 16 * vary(ctx, k, 0.12), 1.7 * k, -0.06 + (ctx.rand() - 0.5) * 0.12);
      // scattered chips / branches
      const nc = 4 + Math.floor(ctx.rand() * 4);
      for (let i = 0; i < nc; i++) {
        const cx = (ctx.rand() - 0.5) * 40 * k, cy = (ctx.rand() - 0.3) * 3 * k;
        s += path(`M${f(cx)} ${f(cy)} l${f((ctx.rand() - 0.5) * 4 * k)} ${f((ctx.rand() - 0.5) * 1.2 * k)}`, S.inkSoft, HAIR);
      }
      s += ground(ctx, 0, 1.5 * k, k, 22);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- plantedSaplings: a row of staked saplings (restoration) ----------
    plantedSaplings(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      const n = opts.count || 5;
      let s = '';
      const sp = 9 * k;
      const tagAt = Math.floor(ctx.rand() * n);
      for (let i = 0; i < n; i++) {
        const sx = -sp * (n - 1) / 2 + i * sp + (ctx.rand() - 0.5) * 3 * k, sy = (ctx.rand() - 0.5) * 1.2 * k;
        const h = (7 + ctx.rand() * 5) * k;
        const side = ctx.rand() < 0.5 ? -1 : 1;          // stake on the left or right
        const bent = ctx.rand() < 0.3;                     // a sapling leaning away from its stake
        // planting mound / disturbed soil
        s += path(`M${f(sx - 2.5 * k)} ${f(sy + 0.3 * k)} q${f(2.5 * k)} ${f(-1.2 * k)} ${f(5 * k)} 0`, S.moraine, HAIR);
        s += path(`M${f(sx - 1.5 * k)} ${f(sy + 0.8 * k)} l${f(0.6 * k)} ${f(0.2 * k)} M${f(sx + 1 * k)} ${f(sy + 0.9 * k)} l${f(0.7 * k)} ${f(-0.1 * k)}`, S.moraine, HAIR);
        // stake: straight, slightly off-vertical
        const lean = (ctx.rand() - 0.5) * 0.8 * k;
        const stakeH = h * (0.7 + ctx.rand() * 0.25);
        s += line(sx + side * 1.5 * k, sy, sx + side * 1.5 * k + lean, sy - stakeH, S.ink, SEC);
        // the sapling: a thin stem, bent or not, leaves on alternating sides, a top shoot
        const bend = bent ? -side * 2.5 * k : (ctx.rand() - 0.5) * 0.8 * k;
        const stem = curve([[sx, sy], [sx + bend * 0.2, sy - h * 0.4], [sx + bend * 0.7, sy - h * 0.75], [sx + bend, sy - h]]);
        s += path(stem, S.sageDeep, SEC);
        const nl = 3 + Math.floor(ctx.rand() * 3);
        for (let l = 0; l < nl; l++) {
          const u = 0.3 + l * (0.6 / nl) + ctx.rand() * 0.05;
          const lx = sx + bend * u * u, ly = sy - h * u, dir = l % 2 ? 1 : -1;
          const ll = (1.4 + ctx.rand() * 0.8) * k;
          s += path(`M${f(lx)} ${f(ly)} q${f(dir * ll * 0.7)} ${f(-0.3 * k)} ${f(dir * ll)} ${f(-ll * 0.8)} q${f(-dir * ll * 0.45)} ${f(0.2 * k)} ${f(-dir * ll)} ${f(ll * 0.8)}`, S.sageDeep, HAIR);
        }
        // tie between stem and stake (a small loop)
        const ty = sy - h * (0.45 + ctx.rand() * 0.2);
        s += path(`M${f(sx + bend * 0.3)} ${f(ty)} q${f(side * 0.8 * k)} ${f(-0.5 * k)} ${f(side * 1.5 * k + lean * 0.6)} ${f(-0.2 * k)}`, S.inkSoft, HAIR);
        // protective collar on some
        if (ctx.rand() < 0.45) s += path(`M${f(sx - 0.9 * k)} ${f(sy)} l0 ${f(-2.6 * k)} M${f(sx + 0.9 * k)} ${f(sy)} l0 ${f(-2.6 * k)} M${f(sx - 0.9 * k)} ${f(sy - 2.6 * k)} l${f(1.8 * k)} 0`, S.inkSoft, HAIR);
        // one red survey tag on one stake: a small flag
        if (i === tagAt) s += fpath(`M${f(sx + side * 1.5 * k + lean * 0.9)} ${f(sy - stakeH * 0.9)} l${f(2.2 * k)} ${f(0.7 * k)} l${f(-2.2 * k)} ${f(0.7 * k)} Z`, S.red, 'none', 0);
      }
      s += ground(ctx, 0, 1.4 * k, k, (n * sp) / (2 * k) + 3);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- rootSystem: a tree with roots visible in a soil cutaway ----------
    rootSystem(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const H = 24 * vary(ctx, k, 0.08);
      // soil block: a cutaway below the ground line — flat printed tint, tone by stipple
      const D = 16 * k, W = 36 * k;
      s += fpath(`M${f(-W / 2)} 0 L${f(W / 2)} ${f(0.4 * k)} L${f(W / 2 - 1 * k)} ${f(D)} L${f(-W / 2 + 1.5 * k)} ${f(D - 0.5 * k)} Z`, ctx.MIX(S.paper, S.moraine, 0.1), 'none', 0);
      // strata lines
      for (let i = 1; i < 3; i++) s += path(curve([[-W / 2 + 1 * k, D * i / 3], [-W * 0.15, D * i / 3 + (ctx.rand() - 0.5) * 2 * k], [W * 0.2, D * i / 3 + (ctx.rand() - 0.5) * 2 * k], [W / 2 - 1 * k, D * i / 3]]), S.moraine, HAIR, ' stroke-dasharray="3 2"');
      // cut edges of the block: hairline, and the ground line, heavier
      s += path(`M${f(-W / 2 + 1.5 * k)} ${f(D - 0.5 * k)} L${f(W / 2 - 1 * k)} ${f(D)}`, S.inkSoft, HAIR);
      s += path(curve([[-W / 2 - 2 * k, 0.2 * k], [-W * 0.2, -0.4 * k], [W * 0.2, 0.3 * k], [W / 2 + 2 * k, -0.2 * k]]), S.ink, CONT);
      // soil grain: stipple, denser toward the bottom right; a few stones
      for (let i = 0; i < 40; i++) {
        const px = (ctx.rand() - 0.5) * W * 0.92 + ctx.rand() * 2 * k, py = 1.5 * k + Math.pow(ctx.rand(), 0.8) * (D - 2.5 * k);
        s += dot(px, py, 0.2 * k, S.moraine);
      }
      const nst = 4 + Math.floor(ctx.rand() * 4);
      for (let i = 0; i < nst; i++) {
        const px = (ctx.rand() - 0.5) * W * 0.9, py = 2 * k + ctx.rand() * (D - 3 * k), r = (0.4 + ctx.rand() * 0.8) * k;
        s += path(`M${f(px - r)} ${f(py)} q${f(r * 0.5)} ${f(-r * 0.9)} ${f(2 * r)} ${f(-r * 0.1)} q${f(-r * 0.3)} ${f(r * 0.9)} ${f(-2 * r)} ${f(r * 0.1)}`, S.inkSoft, HAIR);
      }
      // roots: a tap root and several laterals branching, thinning by weight class
      const root = (x0, y0, x1, y1, w, depth) => {
        let t = path(`M${f(x0)} ${f(y0)} Q${f((x0 + x1) / 2 + (ctx.rand() - 0.5) * 3 * k)} ${f((y0 + y1) / 2 + (ctx.rand() - 0.5) * 2 * k)} ${f(x1)} ${f(y1)}`, S.ink, w);
        if (depth > 0) {
          const n2 = 1 + Math.floor(ctx.rand() * 2);
          for (let i = 0; i < n2; i++) {
            const tt = 0.35 + ctx.rand() * 0.45;
            const bx = x0 + (x1 - x0) * tt, by = y0 + (y1 - y0) * tt;
            const dir = (x1 - x0) >= 0 ? 1 : -1;
            const ex = bx + dir * (2 + ctx.rand() * 5) * k * (i ? 0.6 : 1) + (i ? -dir * 2 * k : 0), ey = by + (2 + ctx.rand() * 4) * k;
            t += root(bx, by, ex, ey, w > 0.8 ? SEC : HAIR, depth - 1);
          }
        }
        return t;
      };
      s += root(-0.4 * k, 0, 0.6 * k + (ctx.rand() - 0.5) * 3 * k, D * (0.8 + ctx.rand() * 0.15), CONT, 1); // tap root
      s += root(-1.2 * k, 0.3 * k, -W * (0.3 + ctx.rand() * 0.1), D * (0.35 + ctx.rand() * 0.2), CONT, 1);
      s += root(1.2 * k, 0.3 * k, W * (0.3 + ctx.rand() * 0.1), D * (0.4 + ctx.rand() * 0.2), CONT, 1);
      s += root(-0.8 * k, 1 * k, -W * 0.2, D * 0.8, SEC, 1);
      s += root(0.8 * k, 1 * k, W * (0.12 + ctx.rand() * 0.1), D * 0.85, SEC, 1);
      // fine root hairs
      const nh = 8 + Math.floor(ctx.rand() * 6);
      for (let i = 0; i < nh; i++) {
        const px = (ctx.rand() - 0.5) * W * 0.7, py = 3 * k + ctx.rand() * (D - 5 * k);
        s += path(`M${f(px)} ${f(py)} q${f((ctx.rand() - 0.5) * 1.5 * k)} ${f(0.8 * k)} ${f((ctx.rand() - 0.5) * 2.5 * k)} ${f((0.8 + ctx.rand() * 1.4) * k)}`, S.inkSoft, HAIR);
      }
      // the tree above
      s += broadleaf(ctx, H, S, k);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- braidedRiver: ~60 units long with gravel bars ----------
    braidedRiver(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const L = 60 * k, Wd = 14 * vary(ctx, k, 0.1); // length, corridor width
      // outer banks: broad wandering edges
      const topBank = [[-L / 2, -Wd * 0.4], [-L * 0.3, -Wd * (0.5 + ctx.rand() * 0.1)], [-L * 0.05, -Wd * 0.45], [L * 0.25, -Wd * (0.55 + ctx.rand() * 0.1)], [L / 2, -Wd * 0.4]];
      const botBank = [[-L / 2, Wd * 0.4], [-L * 0.25, Wd * (0.45 + ctx.rand() * 0.1)], [0, Wd * 0.42], [L * 0.3, Wd * (0.5 + ctx.rand() * 0.1)], [L / 2, Wd * 0.45]];
      // gravel corridor: a flat printed tint
      let cd = curve(topBank) + ' L' + botBank.slice().reverse().map(p => f(p[0]) + ' ' + f(p[1])).join(' L') + ' Z';
      s += fpath(cd, ctx.MIX(S.paper, S.stone, 0.2), 'none', 0);
      s += path(curve(topBank), S.inkSoft, SEC);
      s += path(curve(botBank), S.inkSoft, SEC);
      // channels: three threads that split and rejoin; each a filled waterPale ribbon
      // (built as an offset polygon so the engine does not quantise it to a line) with a water hairline
      const threads = [
        [[-L / 2, 0], [-L * 0.35, -Wd * 0.25], [-L * 0.15, -Wd * 0.05], [L * 0.05, -Wd * 0.3], [L * 0.3, -Wd * 0.1], [L / 2, -Wd * 0.05]],
        [[-L / 2, 0.5 * k], [-L * 0.3, Wd * 0.2], [-L * 0.1, Wd * 0.28], [L * 0.1, Wd * 0.05], [L * 0.3, Wd * 0.3], [L / 2, 0]],
        [[-L * 0.4, -Wd * 0.1], [-L * 0.2, Wd * 0.05], [0, -Wd * 0.15], [L * 0.2, Wd * 0.12], [L * 0.42, Wd * 0.05]]
      ];
      threads.forEach((th, i) => {
        const w = (i === 2 ? 1.4 : 2.2) * k;
        const pts = th.map(p => [p[0], p[1] + (ctx.rand() - 0.5) * 2 * k]);
        // ribbon: width swells and narrows along the thread
        const up = pts.map(p => [p[0], p[1] - w / 2 * (0.7 + ctx.rand() * 0.6)]);
        const dn = pts.map(p => [p[0], p[1] + w / 2 * (0.7 + ctx.rand() * 0.6)]);
        s += fpath(curve(up) + ' L' + dn.slice().reverse().map(p => f(p[0]) + ' ' + f(p[1])).join(' L') + ' Z', S.waterPale, 'none', 0);
        s += path(curve(pts), S.water, HAIR);
      });
      // gravel bars: stipple in the gaps between threads, uneven density
      const ng = 30 + Math.floor(ctx.rand() * 20);
      for (let i = 0; i < ng; i++) {
        const px = (ctx.rand() - 0.5) * L * 0.95, py = (ctx.rand() - 0.5) * Wd * 0.8;
        s += dot(px, py, 0.22 * k, S.inkSoft);
      }
      // a few bar outlines (the islands), with a willow tuft on some
      const nb = 2 + Math.floor(ctx.rand() * 2);
      for (let i = 0; i < nb; i++) {
        const bx = -L * 0.3 + i * L * 0.3 + (ctx.rand() - 0.5) * 6 * k, by = (i % 2 ? 1 : -1) * Wd * 0.12;
        const bw = (5 + ctx.rand() * 5) * k, bh = 1.6 * k;
        s += path(`M${f(bx - bw / 2)} ${f(by)} q${f(bw / 2)} ${f(-bh * 1.6)} ${f(bw)} 0 q${f(-bw / 2)} ${f(bh * 1.4)} ${f(-bw)} 0`, S.inkSoft, HAIR);
        if (ctx.rand() < 0.7) s += path(`M${f(bx)} ${f(by - bh * 0.3)} l${f(-0.6 * k)} ${f(-1.8 * k)} M${f(bx)} ${f(by - bh * 0.3)} l${f(0.5 * k)} ${f(-1.6 * k)} M${f(bx + 0.2 * k)} ${f(by - bh * 0.3)} l0 ${f(-2.1 * k)}`, S.sageDeep, HAIR);
      }
      // flow dashes in the main thread
      const nfl = 4 + Math.floor(ctx.rand() * 4);
      for (let i = 0; i < nfl; i++) {
        const px = -L * 0.4 + i * L * 0.8 / nfl + ctx.rand() * 3 * k, py = (ctx.rand() - 0.5) * Wd * 0.5;
        s += line(px, py, px + (2 + ctx.rand() * 2) * k, py + (ctx.rand() - 0.5) * 0.6 * k, S.water, HAIR);
      }
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- mountainLake: a lake with a reflection hint ----------
    mountainLake(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const W = 44 * vary(ctx, k, 0.08), H = 12 * vary(ctx, k, 0.1);
      // lake outline: an irregular oval in plan-oblique view
      const pts = [];
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        const rr = 1 + (ctx.rand() - 0.5) * 0.16;
        pts.push([Math.cos(a) * W / 2 * rr, -H / 2 + Math.sin(a) * H / 2 * rr]);
      }
      pts.push(pts[0], pts[1]);
      const d = curve(pts) + ' Z';
      s += fpath(d, S.waterPale, S.water, SEC);
      // shore: a second broken hairline just outside
      for (let i = 0; i < n; i++) {
        if (ctx.rand() < 0.4) continue;
        const a = i / n * Math.PI * 2, a2 = (i + 0.7) / n * Math.PI * 2;
        s += path(`M${f(Math.cos(a) * W / 2 * 1.06)} ${f(-H / 2 + Math.sin(a) * H / 2 * 1.14)} Q${f(Math.cos((a + a2) / 2) * W / 2 * 1.07)} ${f(-H / 2 + Math.sin((a + a2) / 2) * H / 2 * 1.16)} ${f(Math.cos(a2) * W / 2 * 1.06)} ${f(-H / 2 + Math.sin(a2) * H / 2 * 1.14)}`, S.inkSoft, HAIR);
      }
      // reflection hint: an inverted peak in a deeper flat water tone, broken by ripples
      const px = (ctx.rand() - 0.5) * W * 0.3, top = -H / 2 - 0.5 * k, ph = (6 + ctx.rand() * 3) * k;
      s += fpath(`M${f(px - 11 * k)} ${f(top)} L${f(px - 3 * k)} ${f(top + ph)} L${f(px)} ${f(top + ph * 0.7)} L${f(px + 4 * k)} ${f(top + ph * 1.2)} L${f(px + 12 * k)} ${f(top)} Z`, ctx.MIX(S.waterPale, S.water, 0.5), 'none', 0);
      s += line(px - 3 * k, top + ph, px - 1.5 * k, top + ph * 0.45, S.water, HAIR);
      for (let i = 0; i < 4; i++) {
        const ry = -H * 0.85 + i * H * 0.16 + ctx.rand() * k, rx = (ctx.rand() - 0.5) * W * 0.5, rw = (4 + ctx.rand() * 8) * k;
        s += line(rx - rw / 2, ry, rx + rw / 2, ry, S.paperHigh, SEC);
      }
      // ripples: hairlines of unequal length
      const nr = 4 + Math.floor(ctx.rand() * 4);
      for (let i = 0; i < nr; i++) {
        const rx = (ctx.rand() - 0.5) * W * 0.7, ry = -H / 2 + (ctx.rand() - 0.5) * H * 0.7, rw = (2 + ctx.rand() * 4) * k;
        s += path(`M${f(rx - rw / 2)} ${f(ry)} q${f(rw / 2)} ${f(-0.4 * k)} ${f(rw)} 0`, S.water, HAIR);
      }
      // sedge tufts in front, each different
      const nt = 3 + Math.floor(ctx.rand() * 3);
      for (let i = 0; i < nt; i++) {
        const gx = (ctx.rand() - 0.5) * W * 0.8, gy = 0.2 * k + ctx.rand() * 1.2 * k, h = (1.5 + ctx.rand()) * k;
        s += path(`M${f(gx)} ${f(gy)} l${f(-0.6 * k)} ${f(-h)} M${f(gx)} ${f(gy)} l${f(0.5 * k)} ${f(-h * 0.85)}` + (ctx.rand() < 0.6 ? ` M${f(gx + 0.3 * k)} ${f(gy)} l${f(0.2 * k)} ${f(-h * 1.15)}` : ''), S.sageDeep, HAIR);
      }
      s += ground(ctx, 0, 1.2 * k, k, 24);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- detailedPine: a single handsome conifer, ~30 units at k=1 ----------
    detailedPine(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = conifer(ctx, 30 * vary(ctx, k, 0.08), 7 * vary(ctx, k, 0.1), S, k);
      // a few fallen needles at the base, a cone on one side or the other
      s += path(`M${f(-5 * k)} ${f(0.4 * k)} l${f(1.2 * k)} ${f(-0.4 * k)} M${f(4 * k)} ${f(0.6 * k)} l${f(1.5 * k)} ${f(0.2 * k)}`, S.inkSoft, HAIR);
      const cs = ctx.rand() < 0.5 ? -1 : 1;
      s += path(`M${f(cs * 3.2 * k)} ${f(-1.2 * k)} q${f(0.6 * k)} ${f(0.2 * k)} ${f(0.5 * k)} ${f(1.4 * k)} q${f(-0.6 * k)} ${f(0.1 * k)} ${f(-0.9 * k)} ${f(-0.2 * k)} M${f(cs * 3.2 * k + 0.1 * k)} ${f(-0.6 * k)} l${f(0.5 * k)} 0 M${f(cs * 3.2 * k + 0.1 * k)} ${f(-0.2 * k)} l${f(0.5 * k)} 0`, S.ink, HAIR);
      s += ground(ctx, 0, 0.6 * k, k, 8);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- detailedDeciduous: a single broadleaf tree with branching canopy ----------
    detailedDeciduous(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = broadleaf(ctx, 28 * vary(ctx, k, 0.08), S, k);
      // root flare and ground
      s += path(`M${f(-0.9 * k)} 0 l${f(-2.2 * k)} ${f(0.5 * k)} M${f(0.9 * k)} 0 l${f(2 * k)} ${f(0.6 * k)}`, S.ink, SEC);
      s += ground(ctx, 0, 0.6 * k, k, 9);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- shrubs: a cluster of low shrubs, drawn as twiggy masses ----------
    shrubs(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      const n = opts.count || 4;
      let s = '';
      const bush = (bx, by, w, h) => {
        let t = '';
        // outline of the twiggy mass: scalloped dome, knocked out in paper, drawn broken
        const m = 5 + Math.floor(ctx.rand() * 3);
        const pts = [[bx - w / 2, by]];
        for (let i = 1; i <= m; i++) {
          const a = Math.PI - i / m * Math.PI;
          pts.push([bx + Math.cos(a) * w / 2, by - Math.sin(a) * h * (1 + (ctx.rand() - 0.5) * 0.35), a]);
        }
        let closed = `M${f(pts[0][0])} ${f(pts[0][1])}`, run = '';
        for (let i = 1; i <= m; i++) {
          const a2 = pts[i][2] + Math.PI / (2 * m);
          const q = ` Q${f(bx + Math.cos(a2) * w / 2 * 1.15)} ${f(by - Math.sin(a2) * h * 1.25)} ${f(pts[i][0])} ${f(pts[i][1])}`;
          closed += q;
          if (ctx.rand() > 0.2) run += `M${f(pts[i - 1][0])} ${f(pts[i - 1][1])}` + q + ' ';
        }
        t += fpath(closed + ' Z', S.paper, 'none', 0);
        t += path(run.trim(), S.sageDeep, SEC);
        // inner twigs: stems from the base fanning up, forking once
        const nt = 3 + Math.floor(ctx.rand() * 3);
        for (let i = 0; i < nt; i++) {
          const u = (i + 0.5) / nt - 0.5;
          const tx = bx + u * w * 0.35, ex = tx + u * w * 0.3 + (ctx.rand() - 0.5) * k, ey = by - h * (0.5 + ctx.rand() * 0.4);
          t += path(`M${f(bx + u * w * 0.15)} ${f(by)} Q${f(tx)} ${f(by - h * 0.5)} ${f(ex)} ${f(ey)}`, S.sageDeep, HAIR);
          if (ctx.rand() < 0.5) t += path(`M${f((tx + ex) / 2)} ${f(by - h * 0.45)} l${f((ctx.rand() - 0.5) * 2 * k)} ${f(-h * 0.3)}`, S.sageDeep, HAIR);
        }
        // tone: hatch on the lower right, tightening toward the edge
        t += hatch(ctx, bx + w * 0.12, by - h * 0.5, k, 4, 1.6 * k, S.sageDeep, w * 0.1, 0.08 * k);
        return t;
      };
      const arr = [];
      for (let i = 0; i < n; i++) {
        const w = (6 + ctx.rand() * 6) * k, h = (3.5 + ctx.rand() * 3.5) * k;
        const bx = (i - (n - 1) / 2) * 8 * k + (ctx.rand() - 0.5) * 4 * k, by = (ctx.rand() < 0.45 ? -2.5 : 0.3) * k + (ctx.rand() - 0.5) * k;
        arr.push({ bx, by, w, h });
      }
      arr.sort((a, b) => a.by - b.by).forEach(b => s += bush(b.bx, b.by, b.w, b.h));
      s += ground(ctx, 0, 1 * k, k, n * 4.5 + 3);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- marmot: on a rock, sitting up (or crouched, by rand) ----------
    marmot(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      // the rock: a boulder with a flat-ish top; its shape varies a little
      const rt = -6 * vary(ctx, k, 0.1);
      const rock = `M${f(-9 * k)} ${f(0.5 * k)} L${f(-8 * k)} ${f(-4 * k)} L${f(-4 * k)} ${f(rt - 0.5 * k)} L${f(4 * k)} ${f(rt)} L${f(8 * k)} ${f(-3.5 * k)} L${f(9 * k)} ${f(0.5 * k)} Z`;
      s += fpath(rock, ctx.MIX(S.paper, S.stone, 0.3), S.ink, CONT);
      s += path(`M${f(-5 * k)} ${f(rt + 1 * k)} l${f(2 * k)} ${f(3 * k)} l${f(-1 * k)} ${f(2 * k)}`, S.inkSoft, HAIR);
      s += hatch(ctx, 3.5 * k, -4 * k, k, 5, 2.2 * k, S.inkSoft, 0.8 * k, 0.9 * k);
      const fillc = ctx.MIX(S.paper, S.ink, 0.16);
      const mx = -1.5 * k, my = rt - 0.2 * k;
      if (ctx.rand() < 0.35) {
        // crouched on all fours, head up: a long low loaf with a blunt head
        const Lm = 8 * vary(ctx, k, 0.08), Hm = 3.2 * k;
        s += fpath(`M${f(mx - Lm * 0.5)} ${f(my)} Q${f(mx - Lm * 0.55)} ${f(my - Hm)} ${f(mx - Lm * 0.1)} ${f(my - Hm * 1.05)} Q${f(mx + Lm * 0.3)} ${f(my - Hm * 1.0)} ${f(mx + Lm * 0.42)} ${f(my - Hm * 0.75)} Q${f(mx + Lm * 0.5)} ${f(my - Hm * 0.3)} ${f(mx + Lm * 0.45)} ${f(my)} Z`, fillc, S.ink, CONT);
        // head: rises from the shoulders, small ear, muzzle forward
        s += fpath(`M${f(mx + Lm * 0.3)} ${f(my - Hm * 0.95)} Q${f(mx + Lm * 0.32)} ${f(my - Hm * 1.6)} ${f(mx + Lm * 0.52)} ${f(my - Hm * 1.55)} Q${f(mx + Lm * 0.72)} ${f(my - Hm * 1.45)} ${f(mx + Lm * 0.7)} ${f(my - Hm * 1.1)} Q${f(mx + Lm * 0.6)} ${f(my - Hm * 0.85)} ${f(mx + Lm * 0.42)} ${f(my - Hm * 0.75)}`, fillc, S.ink, SEC);
        s += path(`M${f(mx + Lm * 0.4)} ${f(my - Hm * 1.5)} q${f(-0.1 * k)} ${f(-0.8 * k)} ${f(0.6 * k)} ${f(-0.5 * k)}`, S.ink, HAIR); // ear
        s += dot(mx + Lm * 0.58, my - Hm * 1.35, 0.3 * k, S.ink);
        s += path(`M${f(mx - Lm * 0.35)} ${f(my)} l${f(0.9 * k)} ${f(-0.2 * k)} M${f(mx + Lm * 0.2)} ${f(my)} l${f(1.2 * k)} ${f(-0.2 * k)}`, S.ink, SEC); // feet
        s += hatch(ctx, mx + Lm * 0.05, my - Hm * 0.8, k, 4, 1.6 * k, S.inkSoft, 0.9 * k, 0.15 * k);
        s += path(`M${f(mx - Lm * 0.5)} ${f(my - Hm * 0.3)} q${f(-2 * k)} ${f(0.2 * k)} ${f(-2.4 * k)} ${f(2.2 * k)}`, S.ink, SEC); // tail
      } else {
        // sitting upright on its haunches: a tall pear, head merging into the shoulders
        const h = 6.6 * vary(ctx, k, 0.08);
        // a rounded, bottom-heavy body: broad haunches, the back curving up to the shoulders
        const body = `M${f(mx - 4.0 * k)} ${f(my)} Q${f(mx - 4.8 * k)} ${f(my - h * 0.55)} ${f(mx - 2.2 * k)} ${f(my - h * 0.8)} Q${f(mx - 0.8 * k)} ${f(my - h * 0.9)} ${f(mx + 0.6 * k)} ${f(my - h * 0.82)} Q${f(mx + 2.6 * k)} ${f(my - h * 0.55)} ${f(mx + 3.0 * k)} ${f(my)} Z`;
        s += fpath(body, fillc, S.ink, CONT);
        // head: low and long, pushed forward from the shoulders, blunt muzzle to the right
        s += fpath(`M${f(mx - 1.6 * k)} ${f(my - h * 0.82)} Q${f(mx - 1.2 * k)} ${f(my - h * 1.08)} ${f(mx + 0.8 * k)} ${f(my - h * 1.06)} L${f(mx + 2.9 * k)} ${f(my - h * 0.93)} Q${f(mx + 3.2 * k)} ${f(my - h * 0.82)} ${f(mx + 2.5 * k)} ${f(my - h * 0.72)} Q${f(mx + 1.2 * k)} ${f(my - h * 0.7)} ${f(mx + 0.4 * k)} ${f(my - h * 0.8)}`, fillc, S.ink, SEC);
        s += path(`M${f(mx - 0.4 * k)} ${f(my - h * 1.06)} q${f(-0.3 * k)} ${f(-0.8 * k)} ${f(0.6 * k)} ${f(-0.45 * k)}`, S.ink, HAIR); // ear
        s += dot(mx + 1.5 * k, my - h * 0.95, 0.28 * k, S.ink); // eye
        s += dot(mx + 3.0 * k, my - h * 0.9, 0.28 * k, S.ink); // nose
        // forepaws held at the chest (one or two showing)
        s += path(`M${f(mx + 1.2 * k)} ${f(my - h * 0.55)} q${f(1.2 * k)} ${f(-0.2 * k)} ${f(1.3 * k)} ${f(-0.9 * k)}` + (ctx.rand() < 0.7 ? ` M${f(mx + 1.0 * k)} ${f(my - h * 0.45)} q${f(1.3 * k)} ${f(-0.1 * k)} ${f(1.6 * k)} ${f(-0.7 * k)}` : ''), S.ink, SEC);
        // haunch line and hind foot
        s += path(`M${f(mx - 2.4 * k)} ${f(my - h * 0.15)} q${f(1.5 * k)} ${f(-1.5 * k)} ${f(2.6 * k)} ${f(-0.3 * k)}`, S.inkSoft, HAIR);
        s += path(`M${f(mx + 0.4 * k)} ${f(my)} l${f(2.6 * k)} ${f(-0.1 * k)}`, S.ink, SEC);
        // fur: hatch on the back/right, tightening toward the outline
        s += hatch(ctx, mx + 0.9 * k, my - h * 0.45, k, 5, 1.8 * k, S.inkSoft, 0.45 * k, 0.7 * k);
        // tail: hangs over the rock edge behind
        s += path(`M${f(mx - 2.9 * k)} ${f(my - 0.5 * k)} q${f(-2.5 * k)} ${f(0.5 * k)} ${f(-2.8 * k)} ${f(2.5 * k)}`, S.ink, SEC);
      }
      s += ground(ctx, 0, 0.9 * k, k, 11);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- eagle: a large bird soaring, wings spread — a dark silhouette from below ----------
    eagle(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const span = 32 * vary(ctx, k, 0.08);
      const dihedral = (2 + ctx.rand() * 3) * k;          // how high the tips ride above the body
      const bank = (ctx.rand() - 0.5) * 3 * k;            // one wing a little lower: the bird is turning
      const tipY = d => -dihedral + d * bank;
      // the wing, d = -1 left / +1 right, as a list of points from shoulder (leading edge) out to the
      // tip, back along the splayed primaries and the sagging trailing edge to the body
      const wingPts = d => {
        const pts = [];
        // leading edge: sampled bow from shoulder to tip
        for (let i = 0; i <= 6; i++) {
          const u = i / 6, v = 1 - u;
          const c0 = [d * 1.6 * k, -2.2 * k], c1 = [d * span * 0.12, -4.2 * k], c2 = [d * span * 0.32, tipY(d) - 2.2 * k], c3 = [d * span / 2, tipY(d)];
          pts.push([v * v * v * c0[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * c3[0], v * v * v * c0[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * c3[1]]);
        }
        // primaries: five fingers, each a notch (root, tip)
        for (let i = 0; i < 5; i++) {
          const t = i / 4;
          const tip = [d * (span / 2 - (1.0 + t * 6.5) * k), tipY(d) + (3.4 - t * 1.2) * k + (i % 2 ? 0.5 * k : 0)];
          const root = [d * (span / 2 - (2.2 + t * 6.5) * k), tipY(d) + (1.0 + t * 0.9) * k];
          pts.push(tip, root);
        }
        // trailing edge: sampled sag back to the body
        const a = pts[pts.length - 1], b = [d * 1.6 * k, 2.6 * k], c = [d * span * 0.2, 3.6 * k];
        for (let i = 1; i <= 5; i++) { const u = i / 5, v = 1 - u; pts.push([v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]); }
        return pts;
      };
      const Lw = wingPts(-1), Rw = wingPts(1);
      // one closed silhouette, clockwise: left shoulder -> left wing -> tail -> right wing (reversed) -> head
      let d = poly(Lw);
      d += ` L${f(-2.2 * k)} ${f(3.0 * k)} Q${f(-1.4 * k)} ${f(6.6 * k)} 0 ${f(6.9 * k)} Q${f(1.4 * k)} ${f(6.6 * k)} ${f(2.2 * k)} ${f(3.0 * k)}`;
      d += ' L' + Rw.slice().reverse().map(p => f(p[0]) + ' ' + f(p[1])).join(' L');
      d += ` Q${f(1.2 * k)} ${f(-3.6 * k)} ${f(2.2 * k)} ${f(-3.9 * k)} L${f(3.4 * k)} ${f(-3.4 * k)} Q${f(3.0 * k)} ${f(-3.0 * k)} ${f(2.4 * k)} ${f(-3.0 * k)} Q${f(1.0 * k)} ${f(-2.6 * k)} 0 ${f(-2.4 * k)} Z`;
      s += fpath(d, S.ink, 'none', 0);
      // the engraver's light lines across the silhouette: paper hairlines between the primaries
      // and a few across the secondaries, so the dark shape reads as feathers
      for (let dd = -1; dd <= 1; dd += 2) {
        let pl = '';
        for (let i = 0; i < 4; i++) {
          const t = i / 4;
          const rx = dd * (span / 2 - (2.2 + t * 6.5) * k), ry = tipY(dd) + (1.0 + t * 0.9) * k;
          pl += `M${f(rx)} ${f(ry)} l${f(-dd * 1.0 * k)} ${f(-1.1 * k)}`;
        }
        const ns = 1 + Math.floor(ctx.rand() * 2);
        for (let i = 1; i <= ns; i++) {
          const t = i / (ns + 1);
          const sx = dd * (3 * k + t * span * 0.18), sy = 2.8 * k + t * 0.5 * k;
          pl += `M${f(sx)} ${f(sy)} q${f(dd * 0.2 * k)} ${f(-1.0 * k)} ${f(dd * 0.1 * k)} ${f(-2.0 * k)}`;
        }
        s += path(pl, S.paper, HAIR);
      }
      // tail feather lines
      s += path(`M${f(-0.8 * k)} ${f(3.6 * k)} l${f(-0.3 * k)} ${f(2.6 * k)} M${f(0.7 * k)} ${f(3.6 * k)} l${f(0.3 * k)} ${f(2.6 * k)}`, S.paper, HAIR);
      return wrap(x, y, k, opts.flip, s);
    }
  });
})();
