// LAND AND LIFE motif group — ink-on-paper survey-plate drawings.
// Registers on window.MRI_MOTIFS. Classic script, no imports.
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
  const path = (d, stroke, w, extra) => `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${extra || ''}/>`;
  const fpath = (d, fill, stroke, w, extra) => `<path d="${d}" fill="${fill}" stroke="${stroke || 'none'}" stroke-width="${f(w || 0)}" stroke-linecap="round" stroke-linejoin="round"${extra || ''}/>`;
  // jittered straight line as a slightly bent path
  const jline = (ctx, x1, y1, x2, y2, stroke, w, j) => {
    j = j === undefined ? 0.4 : j;
    const mx = (x1 + x2) / 2 + (ctx.rand() - 0.5) * j * 2, my = (y1 + y2) / 2 + (ctx.rand() - 0.5) * j * 2;
    return path(`M${f(x1)} ${f(y1)} Q${f(mx)} ${f(my)} ${f(x2)} ${f(y2)}`, stroke, w);
  };
  // broken ground line + a couple of stones so motifs sit on terrain
  const ground = (ctx, x, y, k, half, stroke) => {
    const S = ctx.S; let s = '';
    const col = stroke || S.inkSoft;
    let cx = x - half * k;
    while (cx < x + half * k) {
      const len = (3 + ctx.rand() * 6) * k;
      if (ctx.rand() > 0.25) s += jline(ctx, cx, y + (ctx.rand() - 0.5) * 0.6 * k, Math.min(cx + len, x + half * k), y + (ctx.rand() - 0.5) * 0.6 * k, col, 0.5, 0.3 * k);
      cx += len + (1.5 + ctx.rand() * 2.5) * k;
    }
    for (let i = 0; i < 2; i++) {
      const sx = x + (ctx.rand() - 0.5) * half * 1.6 * k, sy = y + (ctx.rand() * 0.6) * k, r = (0.5 + ctx.rand() * 0.7) * k;
      s += path(`M${f(sx - r)} ${f(sy)} q${f(r * 0.3)} ${f(-r * 0.8)} ${f(r * 1.2)} ${f(-r * 0.4)} q${f(r * 0.6)} ${f(0.4 * r)} ${f(-r * 0.1)} ${f(r * 0.5)}`, S.inkSoft, 0.5);
    }
    return s;
  };
  // a few hatch strokes (shading, right/lower side)
  const hatch = (ctx, x, y, k, n, len, stroke, dx, dy) => {
    let s = '';
    for (let i = 0; i < n; i++) {
      const ox = x + dx * i, oy = y + dy * i;
      s += jline(ctx, ox, oy, ox + len * 0.5, oy + len * 0.85, stroke, 0.45, 0.2 * k);
    }
    return s;
  };
  const wrap = (x, y, k, flip, inner) => `<g transform="translate(${f(x)} ${f(y)}) scale(${flip ? -1 : 1} 1)">${inner}</g>`;
  // a "handsome" conifer drawn relative to base (0,0); h = height
  const conifer = (ctx, h, w, S) => {
    let s = '';
    // trunk
    s += path(`M0 0 Q${f(0.3 * w * 0.1)} ${f(-h * 0.4)} 0 ${f(-h * 0.92)}`, S.ink, 0.8);
    // tiers of boughs, drooping outward, each a pair of strokes
    // soft body wash behind the boughs so the tree has mass at small scale
    s += fpath(`M0 ${f(-h)} Q${f(-w * 0.4)} ${f(-h * 0.55)} ${f(-w * 1.05)} ${f(-h * 0.12)} L${f(w * 0.95)} ${f(-h * 0.1)} Q${f(w * 0.4)} ${f(-h * 0.55)} 0 ${f(-h)} Z`, S.sage, 'none', 0, ' fill-opacity="0.32"');
    const tiers = 8;
    for (let i = 0; i < tiers; i++) {
      const t = i / (tiers - 1);
      const yy = -h * (0.16 + 0.74 * t);
      const ww = w * (1 - t * 0.82) + ctx.rand() * 0.6;
      const dr = ww * 0.35;
      // left bough
      s += path(`M0 ${f(yy)} q${f(-ww * 0.5)} ${f(dr * 0.2)} ${f(-ww)} ${f(dr)}`, S.sageDeep, 0.7);
      // right bough (shaded side: add a short needle stroke)
      s += path(`M0 ${f(yy + 0.6)} q${f(ww * 0.45)} ${f(dr * 0.3)} ${f(ww * 0.95)} ${f(dr * 1.05)}`, S.sageDeep, 0.7);
      // a second, shorter inner bough on each side for density
      s += path(`M0 ${f(yy - 1.2)} q${f(-ww * 0.3)} ${f(dr * 0.1)} ${f(-ww * 0.6)} ${f(dr * 0.55)} M0 ${f(yy - 0.8)} q${f(ww * 0.3)} ${f(dr * 0.2)} ${f(ww * 0.6)} ${f(dr * 0.7)}`, S.sageDeep, 0.55);
      // needle suggestion
      s += path(`M${f(-ww * 0.55)} ${f(yy + dr * 0.45)} l${f(-1)} ${f(1.6)} M${f(ww * 0.55)} ${f(yy + dr * 0.6)} l${f(0.6)} ${f(1.8)} M${f(ww * 0.2)} ${f(yy + dr * 0.3)} l${f(0.4)} ${f(1.6)}`, S.sageDeep, 0.45);
    }
    // crown
    s += path(`M0 ${f(-h * 0.92)} l${f(-1.2)} ${f(2.5)} M0 ${f(-h * 0.9)} l${f(1.0)} ${f(2.8)} M0 ${f(-h)} l0 ${f(3)}`, S.sageDeep, 0.6);
    // shadow on right of trunk
    s += hatch(ctx, 0.6, -h * 0.35, 1, 3, 1.8, S.inkSoft, 0.3, 3.5);
    return s;
  };
  // broadleaf tree, base at (0,0)
  const broadleaf = (ctx, h, S, k) => {
    let s = '';
    const tw = 0.9 * k;
    // trunk with slight lean, forking
    s += path(`M${f(-tw)} 0 Q${f(-tw * 0.6)} ${f(-h * 0.25)} ${f(-tw * 0.3)} ${f(-h * 0.45)}`, S.ink, 0.9);
    s += path(`M${f(tw)} 0 Q${f(tw * 0.8)} ${f(-h * 0.25)} ${f(tw * 0.4)} ${f(-h * 0.45)}`, S.ink, 0.9);
    // branches
    const br = [[-0.3, -0.45, -0.3, -0.7, -0.25, -0.82], [0.1, -0.45, 0.2, -0.68, 0.3, -0.85], [-0.1, -0.45, 0.0, -0.75, 0.05, -0.95], [0.3, -0.5, 0.5, -0.6, 0.55, -0.7], [-0.4, -0.5, -0.6, -0.62, -0.7, -0.68]];
    br.forEach(b => s += path(`M${f(b[0] * h * 0.4)} ${f(b[1] * h)} Q${f(b[2] * h * 0.5)} ${f(b[3] * h)} ${f(b[4] * h * 0.6 + (ctx.rand() - 0.5) * k)} ${f(b[5] * h)}`, S.ink, 0.6));
    // canopy: a lumpy outline of scallops
    const cx = 0, cy = -h * 0.72, rx = h * 0.42, ry = h * 0.3;
    let d = '', n = 11;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const rr = 1 + (ctx.rand() - 0.5) * 0.18;
      const px = cx + Math.cos(a) * rx * rr, py = cy + Math.sin(a) * ry * rr;
      if (i === 0) d += `M${f(px)} ${f(py)}`;
      else {
        const a2 = a - Math.PI / n;
        const qx = cx + Math.cos(a2) * rx * 1.18, qy = cy + Math.sin(a2) * ry * 1.18;
        d += ` Q${f(qx)} ${f(qy)} ${f(px)} ${f(py)}`;
      }
    }
    s += fpath(d, S.sage, S.sageDeep, 0.7, ' fill-opacity="0.45"');
    // interior leaf-mass strokes (short arcs) and right-side hatch
    for (let i = 0; i < 6; i++) {
      const px = cx + (ctx.rand() - 0.5) * rx * 1.3, py = cy + (ctx.rand() - 0.5) * ry * 1.3;
      const w = (2 + ctx.rand() * 2) * k;
      s += path(`M${f(px)} ${f(py)} q${f(w * 0.5)} ${f(-w * 0.4)} ${f(w)} 0`, S.sageDeep, 0.5);
    }
    s += hatch(ctx, cx + rx * 0.35, cy + ry * 0.1, k, 4, 2.5 * k, S.sageDeep, 1.6 * k, 0.5 * k);
    return s;
  };
  // small goat/sheep body, base at feet (0,0), facing +x; type 'goat' | 'sheep'
  const goat = (ctx, S, k, type, bell) => {
    let s = '';
    const L = 6 * k, H = 3.6 * k;
    if (type === 'sheep') {
      // woolly body: scalloped outline
      let d = `M${f(-L * 0.5)} ${f(-H * 0.5)}`;
      const n = 7;
      for (let i = 1; i <= n; i++) {
        const t = i / n, a = Math.PI - t * Math.PI;
        const px = Math.cos(a) * L * 0.5, py = -H * 0.5 - Math.sin(a) * H * 0.55 * (1 + (ctx.rand() - 0.5) * 0.2);
        d += ` Q${f(px - 0.6 * k)} ${f(py - 1.1 * k)} ${f(px)} ${f(py)}`;
      }
      d += ` L${f(L * 0.5)} ${f(-H * 0.3)} Q0 ${f(-H * 0.15)} ${f(-L * 0.5)} ${f(-H * 0.3)} Z`;
      s += fpath(d, S.paperHigh, S.ink, 0.6);
    } else {
      s += fpath(`M${f(-L * 0.5)} ${f(-H * 0.45)} Q${f(-L * 0.45)} ${f(-H)} ${f(-L * 0.1)} ${f(-H * 1.05)} L${f(L * 0.45)} ${f(-H * 0.95)} Q${f(L * 0.55)} ${f(-H * 0.6)} ${f(L * 0.45)} ${f(-H * 0.35)} Q0 ${f(-H * 0.2)} ${f(-L * 0.5)} ${f(-H * 0.45)} Z`, S.paper, S.ink, 0.6);
    }
    // legs (two pairs, slight splay)
    const legs = [[-L * 0.38, 0.3], [-L * 0.28, -0.2], [L * 0.3, 0.4], [L * 0.4, -0.3]];
    legs.forEach(l => s += path(`M${f(l[0])} ${f(-H * 0.45)} l${f(l[1] * k)} ${f(H * 0.45)}`, S.ink, 0.6));
    // head + neck
    const hx = L * 0.45, hy = -H * 0.95;
    s += path(`M${f(hx)} ${f(hy)} l${f(1.6 * k)} ${f(-1.6 * k)}`, S.ink, 0.7);
    const nx = hx + 1.6 * k, ny = hy - 1.6 * k;
    s += fpath(`M${f(nx)} ${f(ny)} l${f(1.8 * k)} ${f(0.6 * k)} l${f(-0.2 * k)} ${f(1.0 * k)} l${f(-1.6 * k)} ${f(-0.5 * k)} Z`, S.paper, S.ink, 0.6);
    // horns or ear
    if (type === 'sheep') s += path(`M${f(nx)} ${f(ny)} l${f(-0.9 * k)} ${f(-0.5 * k)}`, S.ink, 0.5);
    else s += path(`M${f(nx + 0.2 * k)} ${f(ny)} q${f(-0.6 * k)} ${f(-1.6 * k)} ${f(-1.3 * k)} ${f(-1.9 * k)} M${f(nx + 0.5 * k)} ${f(ny)} q${f(0.1 * k)} ${f(-1.4 * k)} ${f(-0.5 * k)} ${f(-2.0 * k)}`, S.ink, 0.5);
    // tail
    s += path(`M${f(-L * 0.5)} ${f(-H * 0.9)} l${f(-0.7 * k)} ${f(-0.7 * k)}`, S.ink, 0.5);
    // beard for goat
    if (type !== 'sheep') s += path(`M${f(nx + 0.5 * k)} ${f(ny + 1.2 * k)} l${f(0.1 * k)} ${f(0.9 * k)}`, S.ink, 0.45);
    // bell: red accent, tiny
    if (bell) s += fpath(`M${f(hx + 0.5 * k)} ${f(hy + 0.9 * k)} l${f(0.5 * k)} ${f(0.8 * k)} l${f(-1.0 * k)} 0 Z`, S.red, S.red, 0.3);
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
      const W = 46 * k, stepH = 5.5 * k, stepIn = 7.5 * k;
      // hill silhouette behind, soft
      s += path(curve([[-W / 2 - 6 * k, -stepH * (n + 0.2)], [-W * 0.15, -stepH * (n + 0.9)], [W * 0.2, -stepH * (n - 0.4)], [W / 2 + 4 * k, -stepH * 1.2]]), S.inkSoft, 0.5, ' stroke-dasharray="5 3 2 3"');
      for (let i = 0; i < n; i++) {
        const ty = -i * stepH;
        const x0 = -W / 2 + i * 2 * k, x1 = W / 2 - i * stepIn;
        const riseL = stepH * 0.8, riseR = stepH * (0.55 + ctx.rand() * 0.2);
        // riser: a dry-stone wall, slightly battered, hand-jittered top
        const wall = `M${f(x0)} ${f(ty)} L${f(x0 + 0.8 * k)} ${f(ty - riseL)} ${curve([[x0 + 0.8 * k, ty - riseL], [(x0 + x1) / 2, ty - riseL + (ctx.rand() - 0.5) * k], [x1 - 0.6 * k, ty - riseR]]).slice(1)} L${f(x1 + 0.6 * k)} ${f(ty)}`;
        s += fpath(wall, ctx.MIX(S.paper, S.moraine, 0.16), S.ink, 0.7);
        // stones: a few horizontal courses with staggered joints
        for (let c = 0; c < 2; c++) {
          const cy = ty - riseL * (0.35 + c * 0.3);
          s += path(curve([[x0 + 1.2 * k, cy], [(x0 + x1) / 2, cy + (ctx.rand() - 0.5) * 0.8 * k], [x1 - 1 * k, cy + (riseL - riseR) * (0.35 + c * 0.3)]]), S.inkSoft, 0.45);
          for (let j = 0; j < 6; j++) {
            const jx = x0 + 2 * k + (j + (c ? 0.5 : 0)) * ((x1 - x0 - 4 * k) / 6) + (ctx.rand() - 0.5) * k;
            s += path(`M${f(jx)} ${f(cy)} l${f(0.1 * k)} ${f(riseL * 0.28)}`, S.inkSoft, 0.45);
          }
        }
        // terrace bed: the flat top, sage wash, crop rows running along the terrace
        const by0 = ty - riseL, by1 = ty - riseR;
        const bed = poly([[x0 + 0.8 * k, by0], [x0 + 2 * k, by0 - stepH], [x1 - stepIn - 0.5 * k, by1 - stepH * 0.9], [x1 - 0.6 * k, by1]], true);
        s += fpath(bed, S.sage, 'none', 0, ' fill-opacity="0.35"');
        for (let r = 0; r < 2; r++) {
          const ry0 = by0 - (1.3 + r * 2.2) * k, ry1 = by1 - (1.1 + r * 1.8) * k;
          const rx0 = x0 + (1.5 + r * 0.6) * k, rx1 = x1 - (2 + r * 5) * k;
          s += path(`M${f(rx0)} ${f(ry0)} L${f(rx1)} ${f(ry1)}`, S.sageDeep, 0.45, ' stroke-dasharray="0.8 1.4"');
          for (let c = rx0 + 1 * k; c < rx1; c += 2.6 * k) {
            const t = (c - rx0) / (rx1 - rx0), cy = ry0 + (ry1 - ry0) * t;
            const cx = c + (ctx.rand() - 0.5) * 0.7 * k, h = (1.3 + ctx.rand() * 0.7) * k;
            s += path(`M${f(cx)} ${f(cy)} l${f(-0.5 * k)} ${f(-h)} M${f(cx)} ${f(cy)} l${f(0.5 * k)} ${f(-h * 0.85)}`, S.sageDeep, 0.5);
          }
        }
      }
      s += ground(ctx, 2 * k, 0.5 * k, k, 26);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- cropRows: a field of short regular rows, slightly wonky ----------
    cropRows(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const rows = opts.rows || 5, W = 46 * k;
      // field boundary (open, hand-drawn)
      s += path(curve([[-W / 2, 0], [-W * 0.3, -0.5 * k], [W * 0.1, 0.3 * k], [W / 2, -0.3 * k]]), S.inkSoft, 0.55);
      for (let r = 0; r < rows; r++) {
        const t = r / (rows - 1);
        const ry = -r * 3.2 * k - 1 * k;
        const inset = t * 7 * k;
        const x0 = -W / 2 + inset + ctx.rand() * k, x1 = W / 2 - inset * 0.7 - ctx.rand() * k;
        // the furrow line
        s += path(curve([[x0, ry], [(x0 + x1) / 2, ry + (ctx.rand() - 0.5) * 1.2 * k], [x1, ry]]), S.moraine, 0.5);
        // plants: little V ticks with a leaf, spacing wobbles
        const sp = (2.6 - t * 0.6) * k;
        for (let c = x0 + 1 * k; c < x1; c += sp + (ctx.rand() - 0.5) * 0.8 * k) {
          const h = (1.6 + ctx.rand() * 0.8) * k * (1 - t * 0.3);
          s += path(`M${f(c)} ${f(ry)} l${f(-0.5 * k)} ${f(-h)} M${f(c)} ${f(ry)} l${f(0.4 * k)} ${f(-h * 0.9)} M${f(c)} ${f(ry - h * 0.5)} l${f(0.2 * k)} ${f(-h * 0.7)}`, S.sageDeep, 0.5);
        }
      }
      s += ground(ctx, 0, 0.8 * k, k, 25);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- orchard: 4-6 fruit trees in rows ----------
    orchard(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      const n = opts.count || 5;
      let s = '';
      // back row smaller (depth), front row larger
      const back = Math.floor(n / 2), front = n - back;
      const tree = (tx, ty, h) => {
        let t = '';
        t += path(`M${f(tx)} ${f(ty)} Q${f(tx + 0.3)} ${f(ty - h * 0.3)} ${f(tx)} ${f(ty - h * 0.5)}`, S.ink, 0.8);
        t += path(`M${f(tx)} ${f(ty - h * 0.45)} l${f(-2 * k)} ${f(-2 * k)} M${f(tx)} ${f(ty - h * 0.45)} l${f(2 * k)} ${f(-2.2 * k)} M${f(tx)} ${f(ty - h * 0.5)} l0 ${f(-2.5 * k)}`, S.ink, 0.55);
        // round canopy, lumpy
        const cx = tx, cy = ty - h * 0.75, r = h * 0.3;
        let d = ''; const m = 8;
        for (let i = 0; i <= m; i++) {
          const a = (i / m) * Math.PI * 2;
          const rr = r * (1 + (ctx.rand() - 0.5) * 0.2);
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr * 0.9;
          if (i === 0) d += `M${f(px)} ${f(py)}`;
          else { const a2 = a - Math.PI / m; d += ` Q${f(cx + Math.cos(a2) * r * 1.2)} ${f(cy + Math.sin(a2) * r * 1.1)} ${f(px)} ${f(py)}`; }
        }
        t += fpath(d, S.sage, S.sageDeep, 0.65, ' fill-opacity="0.45"');
        // fruit: three small circles
        for (let i = 0; i < 3; i++) {
          const fx = cx + (ctx.rand() - 0.5) * r * 1.2, fy = cy + (ctx.rand() - 0.5) * r * 1.1;
          t += `<circle cx="${f(fx)}" cy="${f(fy)}" r="${f(0.55 * k)}" fill="none" stroke="${S.ink}" stroke-width="0.5"/>`;
        }
        t += hatch(ctx, cx + r * 0.35, cy + r * 0.05, k, 3, 2 * k, S.sageDeep, 1.1 * k, 0.5 * k);
        // shadow patch on ground right of trunk
        t += path(`M${f(tx + 1 * k)} ${f(ty + 0.3 * k)} l${f(3.5 * k)} 0`, S.inkSoft, 0.5);
        return t;
      };
      const spacing = 14 * k;
      for (let i = 0; i < back; i++) tree(-spacing * (back - 1) / 2 + i * spacing + 4 * k, -7 * k, 12 * k);
      let out = '';
      for (let i = 0; i < back; i++) out += tree(-spacing * (back - 1) / 2 + i * spacing + 4 * k + (ctx.rand() - 0.5) * 2 * k, -7 * k, 11 * k);
      for (let i = 0; i < front; i++) out += tree(-spacing * (front - 1) / 2 + i * spacing + (ctx.rand() - 0.5) * 2 * k, 0, 15 * k);
      s += out;
      s += ground(ctx, 0, 0.6 * k, k, 28);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- yak: a shaggy yak, facing left by default ----------
    yak(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const L = 22 * k, H = 12 * k; // body length / shoulder height
      // body mass: hump at shoulder (left), lower rump (right); shaggy belly fringe
      const body = `M${f(-L * 0.42)} ${f(-H * 0.55)} Q${f(-L * 0.45)} ${f(-H * 1.05)} ${f(-L * 0.18)} ${f(-H * 1.12)} Q${f(L * 0.05)} ${f(-H * 1.15)} ${f(L * 0.25)} ${f(-H * 1.0)} Q${f(L * 0.45)} ${f(-H * 0.9)} ${f(L * 0.42)} ${f(-H * 0.55)}`;
      s += path(body, S.ink, 1.0);
      // shaggy fringe along belly: a run of hanging strokes
      let fringe = `M${f(L * 0.42)} ${f(-H * 0.55)}`;
      for (let fx = L * 0.42; fx > -L * 0.42; fx -= 2.2 * k) {
        const drop = (1.6 + ctx.rand() * 1.4) * k;
        fringe += ` l${f(-0.6 * k)} ${f(drop)} l${f(-1.2 * k)} ${f(-drop + 0.3 * k)}`;
      }
      s += path(fringe, S.ink, 0.7);
      s += fpath(body + ` L${f(L * 0.42)} ${f(-H * 0.45)} L${f(-L * 0.42)} ${f(-H * 0.45)} Z`, ctx.MIX(S.paper, S.ink, 0.08), 'none', 0);
      // long hair strokes on the flank (right/shaded side more)
      for (let i = 0; i < 9; i++) {
        const hx = -L * 0.3 + i * L * 0.07 + (ctx.rand() - 0.5) * k, hy = -H * (0.75 + ctx.rand() * 0.25);
        s += path(`M${f(hx)} ${f(hy)} q${f(0.3 * k)} ${f(2 * k)} ${f(-0.2 * k)} ${f((3 + ctx.rand() * 2) * k)}`, S.inkSoft, 0.5);
      }
      // legs, thick, with hair; rear legs angled
      const legs = [[-L * 0.3, -0.6], [-L * 0.18, 0.2], [L * 0.22, 0.2], [L * 0.36, 1.0]];
      legs.forEach(l => {
        s += path(`M${f(l[0] - 1.2 * k)} ${f(-H * 0.5)} L${f(l[0] + l[1] * k - 1.0 * k)} 0 M${f(l[0] + 1.2 * k)} ${f(-H * 0.5)} L${f(l[0] + l[1] * k + 1.0 * k)} 0`, S.ink, 0.7);
        s += path(`M${f(l[0] + l[1] * k - 1.3 * k)} 0 l${f(2.6 * k)} 0`, S.ink, 0.8); // hoof
      });
      // head: low-slung, heavy, at left
      const hx = -L * 0.5, hy = -H * 0.6;
      s += fpath(`M${f(-L * 0.42)} ${f(-H * 0.85)} Q${f(hx - 1 * k)} ${f(-H * 0.95)} ${f(hx - 3.5 * k)} ${f(hy)} Q${f(hx - 4 * k)} ${f(hy + 3 * k)} ${f(hx - 1.5 * k)} ${f(hy + 3.5 * k)} Q${f(hx + 1 * k)} ${f(hy + 2.5 * k)} ${f(-L * 0.42)} ${f(-H * 0.55)}`, ctx.MIX(S.paper, S.ink, 0.08), S.ink, 0.9);
      // horns: sweeping up and out
      s += path(`M${f(hx - 0.5 * k)} ${f(-H * 0.92)} q${f(-1 * k)} ${f(-4 * k)} ${f(3 * k)} ${f(-5.5 * k)}`, S.ink, 0.8);
      s += path(`M${f(hx + 1.5 * k)} ${f(-H * 0.92)} q${f(0.5 * k)} ${f(-3 * k)} ${f(3.5 * k)} ${f(-4 * k)}`, S.ink, 0.6);
      // eye (no face beyond a dot) and forehead fringe
      s += `<circle cx="${f(hx - 1.8 * k)}" cy="${f(hy + 0.4 * k)}" r="${f(0.4 * k)}" fill="${S.ink}"/>`;
      s += path(`M${f(hx - 1 * k)} ${f(-H * 0.85)} l${f(-0.6 * k)} ${f(1.5 * k)} M${f(hx)} ${f(-H * 0.88)} l${f(-0.3 * k)} ${f(1.6 * k)}`, S.inkSoft, 0.5);
      // tail: bushy
      s += path(`M${f(L * 0.42)} ${f(-H * 0.9)} q${f(2 * k)} ${f(1 * k)} ${f(1.5 * k)} ${f(5 * k)} M${f(L * 0.48)} ${f(-H * 0.6)} l${f(1.2 * k)} ${f(2.5 * k)} M${f(L * 0.5)} ${f(-H * 0.55)} l${f(0.3 * k)} ${f(3 * k)}`, S.ink, 0.6);
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
      s += path(curve([[-30 * k, slope(-1) + 1.5 * k], [-12 * k, slope(-0.4) + 0.3 * k], [8 * k, slope(0.3) - 0.4 * k], [30 * k, slope(1) + 0.5 * k]]), S.inkSoft, 0.55, ' stroke-dasharray="6 3 9 4"');
      // grass tufts
      for (let i = 0; i < 7; i++) {
        const gx = (ctx.rand() - 0.5) * 56 * k; const gy = slope(gx / (30 * k)) + (ctx.rand() - 0.5) * 3 * k;
        s += path(`M${f(gx)} ${f(gy)} l${f(-0.6 * k)} ${f(-1.6 * k)} M${f(gx)} ${f(gy)} l${f(0.7 * k)} ${f(-1.4 * k)} M${f(gx + 0.2 * k)} ${f(gy)} l${f(0.1 * k)} ${f(-2 * k)}`, S.sageDeep, 0.5);
      }
      // animals; varied scale for depth, some sheep some goats; bell on the first
      const placed = [];
      for (let i = 0; i < n; i++) {
        const px = -24 * k + (i + 0.5) * (48 * k / n) + (ctx.rand() - 0.5) * 4 * k;
        const back = i % 2 === 1;
        const py = slope(px / (30 * k)) + (back ? -3.5 * k : 0.5 * k);
        const sc = k * (back ? 0.78 : 1);
        const type = (i % 3 === 1) ? 'sheep' : 'goat';
        const facing = ctx.rand() > 0.35 ? -1 : 1;
        placed.push(`<g transform="translate(${f(px)} ${f(py)}) scale(${facing} 1)">${goat(ctx, S, sc, type, i === 0)}</g>`);
      }
      // back row first so front overlaps
      s += placed.filter((_, i) => i % 2 === 1).join('') + placed.filter((_, i) => i % 2 === 0).join('');
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- birdsFlying: 3-5 small birds, a few strokes each ----------
    birdsFlying(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      const n = Math.max(3, Math.min(5, opts.count || 4));
      let s = '';
      for (let i = 0; i < n; i++) {
        const bx = -14 * k + i * 7 * k + (ctx.rand() - 0.5) * 4 * k, by = -i * 3.5 * k + (ctx.rand() - 0.5) * 4 * k - 4 * k;
        const w = (3 + ctx.rand() * 2) * k, lift = (0.8 + ctx.rand() * 1.4) * k;
        // two wing strokes meeting at a body point; one wing slightly different (mid-flap)
        s += path(`M${f(bx - w)} ${f(by - lift * 0.6)} q${f(w * 0.5)} ${f(lift)} ${f(w)} 0 M${f(bx)} ${f(by)} q${f(w * 0.45)} ${f(-lift * 1.2)} ${f(w * 0.9)} ${f(-lift * 0.2 + 0.4 * k)}`, S.ink, 0.6);
        // body tick
        s += path(`M${f(bx)} ${f(by)} l${f(0.5 * k)} ${f(0.4 * k)}`, S.ink, 0.6);
      }
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- flowerMeadow: small flowers and grasses, with two bees ----------
    flowerMeadow(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const W = 36 * k;
      // grasses
      for (let i = 0; i < 16; i++) {
        const gx = (ctx.rand() - 0.5) * W, gy = (ctx.rand() - 0.5) * 2 * k;
        const h = (2.5 + ctx.rand() * 3) * k, lean = (ctx.rand() - 0.5) * 2 * k;
        s += path(`M${f(gx)} ${f(gy)} q${f(lean * 0.3)} ${f(-h * 0.6)} ${f(lean)} ${f(-h)}`, S.sageDeep, 0.5);
      }
      // flowers: thin stem, a small open head (5 petal ticks or a bell)
      for (let i = 0; i < 9; i++) {
        const fx = (ctx.rand() - 0.5) * W * 0.95, fy = (ctx.rand() - 0.5) * 2 * k;
        const h = (4 + ctx.rand() * 4) * k, lean = (ctx.rand() - 0.5) * 2 * k;
        s += path(`M${f(fx)} ${f(fy)} q${f(lean * 0.4)} ${f(-h * 0.5)} ${f(lean)} ${f(-h)}`, S.sageDeep, 0.5);
        const hx = fx + lean, hy = fy - h, r = (0.9 + ctx.rand() * 0.5) * k;
        if (i % 3 === 0) {
          // bell flower: drooping
          s += path(`M${f(hx)} ${f(hy)} q${f(-r)} ${f(r * 0.3)} ${f(-r * 0.9)} ${f(r * 1.2)} M${f(hx)} ${f(hy)} q${f(r * 0.2)} ${f(r * 0.5)} ${f(-r * 0.1)} ${f(r * 1.4)} M${f(hx)} ${f(hy)} q${f(r)} ${f(r * 0.4)} ${f(r * 0.7)} ${f(r * 1.3)}`, S.ink, 0.5);
        } else {
          // daisy: ring of short petal strokes around a dot
          let d = '';
          for (let p = 0; p < 6; p++) { const a = p / 6 * Math.PI * 2 + ctx.rand() * 0.4; d += `M${f(hx + Math.cos(a) * r * 0.35)} ${f(hy + Math.sin(a) * r * 0.35)} l${f(Math.cos(a) * r * 0.75)} ${f(Math.sin(a) * r * 0.75)}`; }
          s += path(d, S.ink, 0.5);
          s += `<circle cx="${f(hx)}" cy="${f(hy)}" r="${f(r * 0.28)}" fill="${S.ink}"/>`;
        }
        // leaf
        s += path(`M${f(fx + lean * 0.4)} ${f(fy - h * 0.45)} q${f(1.4 * k)} ${f(-0.4 * k)} ${f(1.8 * k)} ${f(-1.6 * k)}`, S.sageDeep, 0.5);
      }
      // two bees: small oval body with stripe, wing arcs, dotted flight trail
      for (let b = 0; b < 2; b++) {
        const bx = (b === 0 ? -8 : 10) * k + (ctx.rand() - 0.5) * 4 * k, by = -(9 + ctx.rand() * 4) * k;
        s += `<ellipse cx="${f(bx)}" cy="${f(by)}" rx="${f(1.1 * k)}" ry="${f(0.7 * k)}" fill="${S.paper}" stroke="${S.ink}" stroke-width="0.5"/>`;
        s += path(`M${f(bx - 0.3 * k)} ${f(by - 0.6 * k)} l0 ${f(1.2 * k)} M${f(bx + 0.3 * k)} ${f(by - 0.6 * k)} l0 ${f(1.2 * k)}`, S.ink, 0.45);
        s += path(`M${f(bx - 0.2 * k)} ${f(by - 0.6 * k)} q${f(-0.8 * k)} ${f(-1.3 * k)} ${f(-1.4 * k)} ${f(-0.4 * k)} M${f(bx + 0.2 * k)} ${f(by - 0.6 * k)} q${f(0.7 * k)} ${f(-1.3 * k)} ${f(1.3 * k)} ${f(-0.5 * k)}`, S.inkSoft, 0.45);
        // flight trail: a loopy dotted line
        s += path(`M${f(bx - 2 * k)} ${f(by + 0.8 * k)} q${f(-3 * k)} ${f(1.5 * k)} ${f(-4 * k)} ${f(4 * k)} q${f(-0.5 * k)} ${f(2 * k)} ${f(1.5 * k)} ${f(1.6 * k)}`, S.inkSoft, 0.45, ' stroke-dasharray="0.6 1.4"');
      }
      s += ground(ctx, 0, 1.2 * k, k, 19);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- beehive: traditional skep (or log hive with opts.type='log') on a stand ----------
    beehive(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      // stand: a plank on two short posts
      const sw = 11 * k, sy = -4 * k;
      s += path(`M${f(-sw / 2 - 1 * k)} ${f(sy)} l${f(sw + 2 * k)} ${f(0.3 * k)} l0 ${f(1.2 * k)} l${f(-sw - 2 * k)} ${f(-0.3 * k)} Z`, S.ink, 0.6);
      s += path(`M${f(-sw / 2 + 1 * k)} ${f(sy + 1.3 * k)} l${f(-0.4 * k)} ${f(4 * k)} M${f(sw / 2 - 1 * k)} ${f(sy + 1.5 * k)} l${f(0.5 * k)} ${f(3.8 * k)}`, S.ink, 0.7);
      s += hatch(ctx, sw / 2 - 1 * k, sy + 2 * k, k, 2, 1.3 * k, S.inkSoft, 0.4 * k, 0.9 * k);
      if (opts.type === 'log') {
        // log hive: a hollow trunk lying on the stand, a wooden lid, entrance slot
        const lw = 9 * k, lh = 7 * k, top = sy - lh;
        s += fpath(`M${f(-lw / 2)} ${f(sy)} L${f(-lw / 2 - 0.3 * k)} ${f(top + 1 * k)} Q${f(-lw / 2)} ${f(top - 0.4 * k)} ${f(-lw / 2 + 1.5 * k)} ${f(top)} L${f(lw / 2 - 1 * k)} ${f(top + 0.3 * k)} Q${f(lw / 2 + 0.3 * k)} ${f(top + 0.5 * k)} ${f(lw / 2 + 0.2 * k)} ${f(top + 1.8 * k)} L${f(lw / 2)} ${f(sy)} Z`, ctx.MIX(S.paper, S.moraine, 0.15), S.ink, 0.8);
        for (let i = 0; i < 4; i++) s += path(`M${f(-lw / 2 + 0.8 * k)} ${f(top + (1.5 + i * 1.4) * k)} q${f(lw * 0.5)} ${f((ctx.rand() - 0.5) * k)} ${f(lw - 1.6 * k)} ${f(0.2 * k)}`, S.inkSoft, 0.45);
        s += fpath(`M${f(-lw / 2 + 1.2 * k)} ${f(top - 0.5 * k)} l${f(lw - 2.4 * k)} ${f(0.3 * k)} l${f(0.5 * k)} ${f(-1.4 * k)} l${f(-lw + 1.4 * k)} ${f(-0.2 * k)} Z`, S.paper, S.ink, 0.6); // board lid
        s += path(`M${f(-1 * k)} ${f(sy - 1.6 * k)} l${f(2.2 * k)} 0`, S.ink, 0.9); // entrance
      } else {
        // skep: domed basket of coiled straw: stacked arcs narrowing to a top
        const bw = 10 * k, bh = 10 * k;
        const dome = `M${f(-bw / 2)} ${f(sy)} C${f(-bw / 2)} ${f(sy - bh * 0.75)} ${f(-bw * 0.22)} ${f(sy - bh)} 0 ${f(sy - bh)} C${f(bw * 0.22)} ${f(sy - bh)} ${f(bw / 2)} ${f(sy - bh * 0.75)} ${f(bw / 2)} ${f(sy)} Z`;
        s += fpath(dome, ctx.MIX(S.paper, S.moraine, 0.12), S.ink, 0.8);
        // coil lines: arcs across the dome, spacing tightening at the top
        for (let i = 1; i < 7; i++) {
          const t = i / 7; const yy = sy - bh * t * 0.92;
          // width of dome at this height (approx from the bezier): ease
          const hw = bw / 2 * Math.sqrt(1 - Math.pow(t, 2.4)) * 0.98;
          s += path(`M${f(-hw)} ${f(yy + 0.2 * k)} q${f(hw)} ${f((ctx.rand() - 0.6) * 1.2 * k)} ${f(hw * 2)} 0`, S.inkSoft, 0.5);
        }
        // knob at top, entrance arch at base
        s += path(`M${f(-1 * k)} ${f(sy - bh)} q${f(1 * k)} ${f(-1.5 * k)} ${f(2 * k)} 0`, S.ink, 0.6);
        s += fpath(`M${f(-1.2 * k)} ${f(sy)} q0 ${f(-2.2 * k)} ${f(1.2 * k)} ${f(-2.2 * k)} q${f(1.2 * k)} 0 ${f(1.2 * k)} ${f(2.2 * k)} Z`, S.ink, 'none', 0);
        s += hatch(ctx, bw * 0.28, sy - bh * 0.45, k, 4, 2 * k, S.inkSoft, 0.4 * k, 1.3 * k);
      }
      // a few bees around the entrance
      for (let i = 0; i < 4; i++) {
        const bx = (ctx.rand() - 0.5) * 14 * k, by = sy - (ctx.rand() * 14 + 1) * k;
        s += `<circle cx="${f(bx)}" cy="${f(by)}" r="${f(0.35 * k)}" fill="${S.ink}"/>`;
        s += path(`M${f(bx - 0.6 * k)} ${f(by - 0.5 * k)} l${f(0.4 * k)} ${f(0.3 * k)} M${f(bx + 0.6 * k)} ${f(by - 0.5 * k)} l${f(-0.4 * k)} ${f(0.3 * k)}`, S.inkSoft, 0.4);
      }
      s += ground(ctx, 0, 0.4 * k, k, 9);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- irrigationChannel: a channel with a sluice gate, water in waterPale ----------
    irrigationChannel(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const W = 56 * k, cw = 4.5 * k; // channel length, channel width
      // channel runs left->right with a gentle bend; drawn as two bank lines with a water body between
      const mid = [[-W / 2, 0], [-W * 0.2, -1.5 * k], [W * 0.15, 0.5 * k], [W / 2, -1 * k]];
      const offset = (pts, dy) => pts.map(p => [p[0], p[1] + dy]);
      const top = offset(mid, -cw / 2), bot = offset(mid, cw / 2);
      let wd = curve(top);
      const rb = bot.slice().reverse();
      wd += ' L' + rb.map(p => f(p[0]) + ' ' + f(p[1])).join(' L') + ' Z';
      s += fpath(wd, S.waterPale, 'none', 0);
      s += path(curve(top), S.ink, 0.8);
      s += path(curve(bot), S.ink, 0.8);
      // water flow lines
      for (let i = 0; i < 6; i++) {
        const fx = -W * 0.45 + ctx.rand() * W * 0.85, len = (4 + ctx.rand() * 5) * k;
        const t = (fx + W / 2) / W;
        const yy = -1.5 * k * Math.sin(t * Math.PI * 1.5) * 0.7 + (ctx.rand() - 0.5) * cw * 0.5;
        s += path(`M${f(fx)} ${f(yy)} q${f(len * 0.5)} ${f(-0.4 * k)} ${f(len)} 0`, S.water, 0.45);
      }
      // stone lining: dashes along both banks
      for (let i = 0; i < 14; i++) {
        const bx = -W / 2 + i * W / 14 + ctx.rand() * 2 * k;
        const t = (bx + W / 2) / W;
        const yy = -1.5 * k * Math.sin(t * Math.PI * 1.5) * 0.7;
        s += path(`M${f(bx)} ${f(yy - cw / 2 - 0.9 * k)} l${f(1.2 * k)} ${f(-0.3 * k)} M${f(bx + 1 * k)} ${f(yy + cw / 2 + 0.9 * k)} l${f(1.2 * k)} ${f(0.3 * k)}`, S.inkSoft, 0.45);
      }
      // sluice gate at x ~ -5k: two posts, a raised board, a crossbar with a handle
      const gx = -4 * k;
      const gy = 0.3 * k;
      s += path(`M${f(gx - 2.8 * k)} ${f(gy - cw / 2 - 1.2 * k)} l0 ${f(cw + 2.4 * k)} M${f(gx + 2.8 * k)} ${f(gy - cw / 2 - 1.2 * k)} l0 ${f(cw + 2.4 * k)}`, S.ink, 0.9);
      s += fpath(`M${f(gx - 2.2 * k)} ${f(gy - cw / 2 - 6 * k)} l${f(4.4 * k)} 0 l0 ${f(5.6 * k)} l${f(-4.4 * k)} 0 Z`, ctx.MIX(S.paper, S.moraine, 0.18), S.ink, 0.7); // raised board
      s += path(`M${f(gx - 1.2 * k)} ${f(gy - cw / 2 - 4.5 * k)} l${f(2.4 * k)} 0 M${f(gx - 1.2 * k)} ${f(gy - cw / 2 - 2.5 * k)} l${f(2.4 * k)} 0`, S.inkSoft, 0.45);
      s += path(`M${f(gx - 3.4 * k)} ${f(gy - cw / 2 - 1.6 * k)} l${f(6.8 * k)} 0`, S.ink, 0.8); // crossbar
      s += path(`M${f(gx - 2.8 * k)} ${f(gy - cw / 2 - 1.2 * k)} l0 ${f(-6 * k)} l${f(5.6 * k)} 0 l0 ${f(6 * k)}`, S.ink, 0.8); // gate frame uprights + top beam
      s += path(`M${f(gx)} ${f(gy - cw / 2 - 6 * k)} l0 ${f(-2.5 * k)} l${f(1.5 * k)} 0`, S.ink, 0.7); // handle
      // a little turbulence below the gate
      s += path(`M${f(gx + 3.5 * k)} ${f(gy - 0.8 * k)} q${f(1 * k)} ${f(-0.8 * k)} ${f(2 * k)} 0 q${f(1 * k)} ${f(0.8 * k)} ${f(2 * k)} 0`, S.water, 0.5);
      s += ground(ctx, 0, cw / 2 + 2.2 * k, k, 26);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- waterfall: a fall over a rock step into a pool ----------
    waterfall(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const H = 28 * k, W = 20 * k;
      // crag: irregular rock faces either side of a notch; jagged, ledged, no straight trapezoid
      const lface = [[-W / 2 - 12 * k, 1 * k], [-W / 2 - 10 * k, -H * 0.25], [-W / 2 - 6 * k, -H * 0.3], [-W / 2 - 7 * k, -H * 0.55], [-W / 2 - 2 * k, -H * 0.7], [-W / 2 - 3 * k, -H * 0.88], [-W / 2 + 1 * k, -H]];
      const rface = [[W / 2 - 1 * k, -H - 1 * k], [W / 2 + 3 * k, -H * 0.9], [W / 2 + 2 * k, -H * 0.72], [W / 2 + 7 * k, -H * 0.6], [W / 2 + 6 * k, -H * 0.35], [W / 2 + 11 * k, -H * 0.2], [W / 2 + 13 * k, 1 * k]];
      const jit = pts => pts.map(p => [p[0] + (ctx.rand() - 0.5) * k, p[1] + (ctx.rand() - 0.5) * k]);
      const L = jit(lface), R = jit(rface);
      s += fpath(poly(L) + ' L' + R.map(p => f(p[0]) + ' ' + f(p[1])).join(' L') + ' Z', ctx.MIX(S.paper, S.stone, 0.22), 'none', 0);
      s += path(poly(L), S.ink, 0.85);
      s += path(poly(R), S.ink, 0.85);
      // ledges and cracks: short strokes following the faces, heavier on the right (shade)
      for (let i = 0; i < 5; i++) {
        const p = L[i + 1];
        s += path(`M${f(p[0])} ${f(p[1])} l${f(-(2 + ctx.rand() * 3) * k)} ${f((0.6 + ctx.rand()) * k)}`, S.inkSoft, 0.5);
      }
      for (let i = 0; i < 6; i++) {
        const p = R[i];
        s += path(`M${f(p[0])} ${f(p[1])} l${f((2 + ctx.rand() * 3) * k)} ${f((0.8 + ctx.rand()) * k)}`, S.inkSoft, 0.5);
        s += hatch(ctx, p[0] + 1.5 * k, p[1] + 1.5 * k, k, 3, 1.8 * k, S.inkSoft, 0.9 * k, 0.6 * k);
      }
      // the fall: a sheet in paperHigh, narrowing then flaring at the foot; a mid-ledge breaks it
      const fw = W * 0.5, ledgeY = -H * 0.45;
      s += fpath(`M${f(-fw / 2)} ${f(-H)} Q${f(-fw / 2 + 0.5 * k)} ${f(ledgeY)} ${f(-fw / 2 - 1.5 * k)} ${f(ledgeY + 1 * k)} Q${f(-fw / 2 - 2 * k)} ${f(-H * 0.15)} ${f(-fw / 2 - 3.5 * k)} ${f(-2 * k)} L${f(fw / 2 + 3.5 * k)} ${f(-2 * k)} Q${f(fw / 2 + 2 * k)} ${f(-H * 0.15)} ${f(fw / 2 + 1.5 * k)} ${f(ledgeY + 1 * k)} Q${f(fw / 2 - 0.5 * k)} ${f(ledgeY)} ${f(fw / 2)} ${f(-H)} Z`, S.paperHigh, 'none', 0);
      // upper drop strokes
      for (let i = 0; i < 5; i++) {
        const fx = -fw / 2 + 0.5 * k + i * (fw - 1 * k) / 4 + (ctx.rand() - 0.5) * k;
        s += path(`M${f(fx)} ${f(-H + ctx.rand() * 2 * k)} Q${f(fx + (ctx.rand() - 0.5) * k)} ${f((-H + ledgeY) / 2)} ${f(fx + (i - 2) * 0.2 * k)} ${f(ledgeY - ctx.rand() * 2 * k)}`, S.water, 0.55);
      }
      // the ledge: a spray line, then the lower drop, spreading
      s += path(`M${f(-fw / 2 - 1.5 * k)} ${f(ledgeY + 0.8 * k)} q${f(fw * 0.5 + 1.5 * k)} ${f(1.5 * k)} ${f(fw + 3 * k)} 0`, S.water, 0.6);
      for (let i = 0; i < 6; i++) {
        const fx = -fw / 2 - 1 * k + i * (fw + 2 * k) / 5 + (ctx.rand() - 0.5) * k;
        s += path(`M${f(fx)} ${f(ledgeY + 1.5 * k)} Q${f(fx + (i - 2.5) * 0.3 * k)} ${f(ledgeY * 0.5)} ${f(fx + (i - 2.5) * 0.9 * k)} ${f(-H * (0.1 + ctx.rand() * 0.15))}`, S.water, 0.5);
      }
      // lip at the top
      s += path(`M${f(-fw / 2 - 1.5 * k)} ${f(-H - 1.2 * k)} q${f(fw * 0.5 + 1.5 * k)} ${f(1.6 * k)} ${f(fw + 3 * k)} ${f(-0.4 * k)}`, S.water, 0.6);
      // spray
      for (let i = 0; i < 7; i++) s += `<circle cx="${f((ctx.rand() - 0.5) * W * 0.9)}" cy="${f(-2.5 * k - ctx.rand() * 6 * k)}" r="${f(0.35 * k)}" fill="${S.water}"/>`;
      // plunge pool
      s += fpath(`M${f(-W / 2 - 6 * k)} ${f(1.2 * k)} Q${f(-W * 0.2)} ${f(-2.5 * k)} ${f(W * 0.1)} ${f(-1.8 * k)} Q${f(W * 0.5)} ${f(-2.6 * k)} ${f(W / 2 + 6 * k)} ${f(1.2 * k)} Q0 ${f(3.8 * k)} ${f(-W / 2 - 6 * k)} ${f(1.2 * k)} Z`, S.waterPale, S.water, 0.5);
      for (let i = 0; i < 4; i++) {
        const rx = (ctx.rand() - 0.5) * W * 0.9, ry = 0 + ctx.rand() * 1.6 * k, rw = (3 + ctx.rand() * 3) * k;
        s += path(`M${f(rx - rw / 2)} ${f(ry)} q${f(rw / 2)} ${f(-0.5 * k)} ${f(rw)} 0`, S.water, 0.45);
      }
      // a little sapling/tuft on a ledge and ground
      s += path(`M${f(-W / 2 - 6.5 * k)} ${f(-H * 0.3)} l${f(-0.5 * k)} ${f(-2 * k)} M${f(-W / 2 - 6.5 * k)} ${f(-H * 0.3)} l${f(0.6 * k)} ${f(-1.7 * k)}`, S.sageDeep, 0.5);
      s += ground(ctx, 0, 3.2 * k, k, 20);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- springAndTrough: spring from rock into a wooden trough ----------
    springAndTrough(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      // rock outcrop on the left
      const rock = `M${f(-22 * k)} ${f(0.5 * k)} L${f(-21 * k)} ${f(-6 * k)} L${f(-17 * k)} ${f(-12 * k)} L${f(-11 * k)} ${f(-13.5 * k)} L${f(-7 * k)} ${f(-10 * k)} L${f(-6 * k)} ${f(-4 * k)} L${f(-7 * k)} ${f(0.5 * k)}`;
      s += fpath(rock + ' Z', ctx.MIX(S.paper, S.stone, 0.25), 'none', 0);
      s += path(rock, S.ink, 0.8);
      // cracks and hatch on the rock (right/lower side)
      s += path(`M${f(-15 * k)} ${f(-11 * k)} l${f(1.5 * k)} ${f(3 * k)} l${f(-1 * k)} ${f(2.5 * k)} M${f(-19 * k)} ${f(-7 * k)} l${f(2.5 * k)} ${f(1 * k)}`, S.inkSoft, 0.5);
      s += hatch(ctx, -10 * k, -8 * k, k, 5, 2.2 * k, S.inkSoft, 0.5 * k, 1.4 * k);
      // spout: a hollowed half-log set into the rock
      s += path(`M${f(-8 * k)} ${f(-7 * k)} l${f(5 * k)} ${f(0.5 * k)} M${f(-8 * k)} ${f(-5.5 * k)} l${f(5.5 * k)} ${f(0.5 * k)} M${f(-3 * k)} ${f(-6.5 * k)} q${f(0.8 * k)} ${f(0.9 * k)} 0 ${f(1.5 * k)}`, S.ink, 0.7);
      // water jet: arcs from spout into trough, in water colour
      s += path(`M${f(-3.2 * k)} ${f(-6 * k)} q${f(2.5 * k)} ${f(0.5 * k)} ${f(3 * k)} ${f(4 * k)} M${f(-3.2 * k)} ${f(-6.4 * k)} q${f(3 * k)} ${f(0.8 * k)} ${f(3.8 * k)} ${f(3.8 * k)}`, S.water, 0.6);
      // trough: a hollowed log on two stone feet, water body inside
      const tx0 = -3 * k, tx1 = 19 * k, ty = -1.5 * k, th = 4 * k;
      s += fpath(`M${f(tx0)} ${f(ty - th * 0.5)} L${f(tx0 - 0.3 * k)} ${f(ty + th * 0.5)} Q${f(tx0 + 1 * k)} ${f(ty + th * 0.9)} ${f(tx0 + 2.5 * k)} ${f(ty + th * 0.9)} L${f(tx1 - 2 * k)} ${f(ty + th * 0.95)} Q${f(tx1 + 0.5 * k)} ${f(ty + th * 0.9)} ${f(tx1)} ${f(ty + th * 0.4)} L${f(tx1 + 0.4 * k)} ${f(ty - th * 0.6)}`, ctx.MIX(S.paper, S.moraine, 0.15), S.ink, 0.8);
      // water surface inside, slightly below rim
      s += fpath(`M${f(tx0 + 0.6 * k)} ${f(ty - th * 0.2)} L${f(tx1 - 0.3 * k)} ${f(ty - th * 0.25)} L${f(tx1 - 0.2 * k)} ${f(ty + 0.3 * k)} L${f(tx0 + 0.5 * k)} ${f(ty + 0.3 * k)} Z`, S.waterPale, S.water, 0.5);
      // rim line (front top edge)
      s += path(`M${f(tx0)} ${f(ty - th * 0.5)} Q${f((tx0 + tx1) / 2)} ${f(ty - th * 0.6 + (ctx.rand() - 0.5) * k)} ${f(tx1 + 0.4 * k)} ${f(ty - th * 0.6)}`, S.ink, 0.8);
      // wood grain
      for (let i = 0; i < 3; i++) s += path(`M${f(tx0 + 2 * k)} ${f(ty + (0.8 + i * 0.9) * k)} q${f(7 * k)} ${f((ctx.rand() - 0.5) * 0.8 * k)} ${f(14 * k)} ${f(0.2 * k)}`, S.inkSoft, 0.45);
      // overflow drip at far end, and feet stones
      s += path(`M${f(tx1 + 0.3 * k)} ${f(ty - th * 0.2)} q${f(1.5 * k)} ${f(1.5 * k)} ${f(1.2 * k)} ${f(4 * k)}`, S.water, 0.5, ' stroke-dasharray="1 1.2"');
      s += fpath(`M${f(tx0 + 1.5 * k)} ${f(ty + th * 0.9)} l${f(-1 * k)} ${f(2.3 * k)} l${f(4 * k)} 0 l${f(-1 * k)} ${f(-2.3 * k)} Z M${f(tx1 - 4 * k)} ${f(ty + th * 0.9)} l${f(-1 * k)} ${f(2.3 * k)} l${f(4 * k)} 0 l${f(-0.8 * k)} ${f(-2.3 * k)} Z`, S.paper, S.ink, 0.6);
      // wet ground / puddle under the overflow
      s += path(`M${f(tx1 - 1 * k)} ${f(1.2 * k)} q${f(3 * k)} ${f(-0.8 * k)} ${f(6 * k)} 0`, S.water, 0.45);
      s += ground(ctx, 0, 1.3 * k, k, 24);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- loggedStand: stumps and felled logs ----------
    loggedStand(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const stump = (sx, sy, r, h) => {
        let t = '';
        // cylinder: top ellipse (cut face, paperHigh-ish with rings), sides hatched
        t += fpath(`M${f(sx - r)} ${f(sy - h)} l${f(-0.2 * k)} ${f(h)} q${f(r)} ${f(1.2 * k)} ${f(2 * r + 0.3 * k)} 0 l${f(-0.1 * k)} ${f(-h)}`, ctx.MIX(S.paper, S.moraine, 0.2), S.ink, 0.7);
        t += fpath(`M${f(sx - r)} ${f(sy - h)} a${f(r)} ${f(r * 0.42)} 0 1 1 ${f(2 * r)} 0 a${f(r)} ${f(r * 0.42)} 0 1 1 ${f(-2 * r)} 0 Z`, S.paperHigh, S.ink, 0.7);
        // growth rings
        t += path(`M${f(sx - r * 0.6)} ${f(sy - h)} a${f(r * 0.6)} ${f(r * 0.25)} 0 1 1 ${f(r * 1.2)} 0 M${f(sx - r * 0.3)} ${f(sy - h + 0.05)} a${f(r * 0.3)} ${f(r * 0.12)} 0 1 1 ${f(r * 0.6)} 0`, S.inkSoft, 0.45);
        // bark hatch on right side
        for (let i = 0; i < 3; i++) t += path(`M${f(sx + r * (0.3 + i * 0.25))} ${f(sy - h + r * 0.4)} l${f(0.1 * k)} ${f(h - r * 0.4)}`, S.inkSoft, 0.45);
        // roots flare
        t += path(`M${f(sx - r - 0.2 * k)} ${f(sy)} l${f(-1.5 * k)} ${f(0.6 * k)} M${f(sx + r + 0.1 * k)} ${f(sy)} l${f(1.6 * k)} ${f(0.5 * k)}`, S.ink, 0.6);
        return t;
      };
      const log = (lx, ly, len, r, ang) => {
        let t = '';
        const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
        const nx = -Math.sin(ang) * r, ny = Math.cos(ang) * r;
        t += fpath(poly([[lx + nx, ly + ny], [lx - nx, ly - ny], [lx - nx + dx, ly - ny + dy], [lx + nx + dx, ly + ny + dy]], true), ctx.MIX(S.paper, S.moraine, 0.2), S.ink, 0.7);
        // end face (cut): small ellipse at the near end
        t += fpath(`M${f(lx + nx)} ${f(ly + ny)} a${f(r * 0.45)} ${f(r)} ${f(ang * 180 / Math.PI)} 1 0 ${f(-2 * nx)} ${f(-2 * ny)} a${f(r * 0.45)} ${f(r)} ${f(ang * 180 / Math.PI)} 1 0 ${f(2 * nx)} ${f(2 * ny)}`, S.paperHigh, S.ink, 0.6);
        // bark lines along the log, a lopped branch stub
        for (let i = 1; i < 3; i++) { const o = (i / 3 - 0.5) * 2 * r * 0.7; t += path(`M${f(lx + 1.5 * k - Math.sin(ang) * o)} ${f(ly + Math.cos(ang) * o)} l${f(dx * 0.8)} ${f(dy * 0.8)}`, S.inkSoft, 0.45); }
        t += path(`M${f(lx + dx * 0.6 - nx)} ${f(ly + dy * 0.6 - ny)} l${f(0.4 * k)} ${f(-1.8 * k)}`, S.ink, 0.6);
        return t;
      };
      s += stump(-14 * k, -1 * k, 2.4 * k, 4 * k);
      s += stump(8 * k, -4 * k, 1.9 * k, 3.2 * k);
      s += stump(16 * k, 0.3 * k, 2.6 * k, 4.5 * k);
      s += log(-8 * k, 0, 16 * k, 1.7 * k, -0.06);
      s += log(-2 * k, -5.5 * k, 12 * k, 1.3 * k, 0.12);
      // scattered chips / branches
      for (let i = 0; i < 6; i++) {
        const cx = (ctx.rand() - 0.5) * 40 * k, cy = (ctx.rand() - 0.3) * 3 * k;
        s += path(`M${f(cx)} ${f(cy)} l${f((ctx.rand() - 0.5) * 4 * k)} ${f((ctx.rand() - 0.5) * 1.2 * k)}`, S.inkSoft, 0.5);
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
      for (let i = 0; i < n; i++) {
        const sx = -sp * (n - 1) / 2 + i * sp + (ctx.rand() - 0.5) * 1.5 * k, sy = (ctx.rand() - 0.5) * 1.2 * k;
        const h = (8 + ctx.rand() * 4) * k;
        // planting mound / disturbed soil
        s += path(`M${f(sx - 2.5 * k)} ${f(sy + 0.3 * k)} q${f(2.5 * k)} ${f(-1.2 * k)} ${f(5 * k)} 0`, S.moraine, 0.55);
        s += path(`M${f(sx - 1.5 * k)} ${f(sy + 0.8 * k)} l${f(0.6 * k)} ${f(0.2 * k)} M${f(sx + 1 * k)} ${f(sy + 0.9 * k)} l${f(0.7 * k)} ${f(-0.1 * k)}`, S.moraine, 0.45);
        // stake: straight, slightly off-vertical, with a tie
        const lean = (ctx.rand() - 0.5) * 0.8 * k;
        s += path(`M${f(sx + 1.5 * k)} ${f(sy)} l${f(lean)} ${f(-h * 0.85)}`, S.ink, 0.8);
        // the sapling: a thin wobbly stem, a few leaves, top shoot
        const stem = curve([[sx, sy], [sx - 0.4 * k, sy - h * 0.4], [sx + 0.3 * k, sy - h * 0.75], [sx - 0.2 * k, sy - h]]);
        s += path(stem, S.sageDeep, 0.65);
        for (let l = 0; l < 4; l++) {
          const ly = sy - h * (0.3 + l * 0.17), dir = l % 2 ? 1 : -1;
          s += path(`M${f(sx)} ${f(ly)} q${f(dir * 1.2 * k)} ${f(-0.3 * k)} ${f(dir * 1.8 * k)} ${f(-1.5 * k)} q${f(-dir * 0.8 * k)} ${f(0.4 * k)} ${f(-dir * 1.8 * k)} ${f(1.5 * k)}`, S.sageDeep, 0.5);
        }
        // tie between stem and stake (a small loop), red: the surveyor's marker tape? no — keep ink
        s += path(`M${f(sx)} ${f(sy - h * 0.55)} q${f(0.8 * k)} ${f(-0.5 * k)} ${f(1.5 * k + lean * 0.6)} ${f(-0.2 * k)}`, S.inkSoft, 0.5);
        // protective tube hint: short vertical pair near base on every other one
        if (i % 2 === 0) s += path(`M${f(sx - 0.9 * k)} ${f(sy)} l0 ${f(-2.6 * k)} M${f(sx + 0.9 * k)} ${f(sy)} l0 ${f(-2.6 * k)} M${f(sx - 0.9 * k)} ${f(sy - 2.6 * k)} l${f(1.8 * k)} 0`, S.inkSoft, 0.5);
      }
      // one red survey tag on the last stake: a small flag
      const lastx = sp * (n - 1) / 2 + 1.5 * k;
      s += fpath(`M${f(lastx)} ${f(-9.5 * k)} l${f(2.2 * k)} ${f(0.7 * k)} l${f(-2.2 * k)} ${f(0.7 * k)} Z`, S.red, 'none', 0);
      s += ground(ctx, 0, 1.4 * k, k, (n * sp) / (2 * k) + 3);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- rootSystem: a tree with roots visible in a soil cutaway ----------
    rootSystem(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const H = 24 * k;
      // soil block: a cutaway, soil tint below the ground line, with a few stones and soil strata
      const D = 16 * k, W = 36 * k;
      s += fpath(`M${f(-W / 2)} 0 L${f(W / 2)} ${f(0.4 * k)} L${f(W / 2 - 1 * k)} ${f(D)} L${f(-W / 2 + 1.5 * k)} ${f(D - 0.5 * k)} Z`, S.moraine, 'none', 0, ' fill-opacity="0.14"');
      // strata lines
      for (let i = 1; i < 3; i++) s += path(curve([[-W / 2 + 1 * k, D * i / 3], [-W * 0.15, D * i / 3 + (ctx.rand() - 0.5) * 2 * k], [W * 0.2, D * i / 3 + (ctx.rand() - 0.5) * 2 * k], [W / 2 - 1 * k, D * i / 3]]), S.moraine, 0.5, ' stroke-dasharray="3 2"');
      // ground line, heavier
      s += path(curve([[-W / 2 - 2 * k, 0.2 * k], [-W * 0.2, -0.4 * k], [W * 0.2, 0.3 * k], [W / 2 + 2 * k, -0.2 * k]]), S.ink, 0.9);
      // soil stones and dots
      for (let i = 0; i < 7; i++) {
        const px = (ctx.rand() - 0.5) * W * 0.9, py = 2 * k + ctx.rand() * (D - 3 * k), r = (0.4 + ctx.rand() * 0.8) * k;
        s += path(`M${f(px - r)} ${f(py)} q${f(r * 0.5)} ${f(-r * 0.9)} ${f(2 * r)} ${f(-r * 0.1)} q${f(-r * 0.3)} ${f(r * 0.9)} ${f(-2 * r)} ${f(r * 0.1)}`, S.inkSoft, 0.45);
      }
      // roots: a tap root and several laterals branching, thinning, in ink
      const root = (x0, y0, x1, y1, w, depth) => {
        let t = path(`M${f(x0)} ${f(y0)} Q${f((x0 + x1) / 2 + (ctx.rand() - 0.5) * 3 * k)} ${f((y0 + y1) / 2 + (ctx.rand() - 0.5) * 2 * k)} ${f(x1)} ${f(y1)}`, S.ink, w);
        if (depth > 0) {
          const n2 = 2;
          for (let i = 0; i < n2; i++) {
            const tt = 0.45 + i * 0.35;
            const bx = x0 + (x1 - x0) * tt, by = y0 + (y1 - y0) * tt;
            const dir = (x1 - x0) >= 0 ? 1 : -1;
            const ex = bx + dir * (3 + ctx.rand() * 4) * k * (i ? 0.6 : 1) + (i ? -dir * 2 * k : 0), ey = by + (2 + ctx.rand() * 4) * k;
            t += root(bx, by, ex, ey, w * 0.6, depth - 1);
          }
        }
        return t;
      };
      s += root(-0.4 * k, 0, 0.6 * k, D * 0.9, 1.0, 1); // tap root
      s += root(-1.2 * k, 0.3 * k, -W * 0.38, D * 0.45, 0.9, 1);
      s += root(1.2 * k, 0.3 * k, W * 0.36, D * 0.5, 0.9, 1);
      s += root(-0.8 * k, 1 * k, -W * 0.2, D * 0.8, 0.7, 1);
      s += root(0.8 * k, 1 * k, W * 0.18, D * 0.85, 0.7, 1);
      // fine root hairs
      for (let i = 0; i < 10; i++) {
        const px = (ctx.rand() - 0.5) * W * 0.7, py = 3 * k + ctx.rand() * (D - 5 * k);
        s += path(`M${f(px)} ${f(py)} l${f((ctx.rand() - 0.5) * 2.5 * k)} ${f(ctx.rand() * 1.8 * k)}`, S.inkSoft, 0.45);
      }
      // the tree above
      s += broadleaf(ctx, H, S, k);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- braidedRiver: ~60 units long with gravel bars ----------
    braidedRiver(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const L = 60 * k, Wd = 14 * k; // length, corridor width
      // outer banks: broad wandering edges
      const topBank = [[-L / 2, -Wd * 0.4], [-L * 0.3, -Wd * 0.55], [-L * 0.05, -Wd * 0.45], [L * 0.25, -Wd * 0.6], [L / 2, -Wd * 0.4]];
      const botBank = [[-L / 2, Wd * 0.4], [-L * 0.25, Wd * 0.5], [0, Wd * 0.42], [L * 0.3, Wd * 0.55], [L / 2, Wd * 0.45]];
      // gravel corridor tint
      let cd = curve(topBank) + ' L' + botBank.slice().reverse().map(p => f(p[0]) + ' ' + f(p[1])).join(' L') + ' Z';
      s += fpath(cd, S.stone, 'none', 0, ' fill-opacity="0.22"');
      s += path(curve(topBank), S.inkSoft, 0.55);
      s += path(curve(botBank), S.inkSoft, 0.55);
      // channels: three threads that split and rejoin; each drawn as a thin waterPale ribbon with a water centre line
      const threads = [
        [[-L / 2, 0], [-L * 0.35, -Wd * 0.25], [-L * 0.15, -Wd * 0.05], [L * 0.05, -Wd * 0.3], [L * 0.3, -Wd * 0.1], [L / 2, -Wd * 0.05]],
        [[-L / 2, 0.5 * k], [-L * 0.3, Wd * 0.2], [-L * 0.1, Wd * 0.28], [L * 0.1, Wd * 0.05], [L * 0.3, Wd * 0.3], [L / 2, 0]],
        [[-L * 0.4, -Wd * 0.1], [-L * 0.2, Wd * 0.05], [0, -Wd * 0.15], [L * 0.2, Wd * 0.12], [L * 0.42, Wd * 0.05]]
      ];
      threads.forEach((th, i) => {
        const w = (i === 2 ? 1.6 : 2.4) * k;
        const jit = th.map(p => [p[0], p[1] + (ctx.rand() - 0.5) * k]);
        s += path(curve(jit), S.waterPale, w);
        s += path(curve(jit), S.water, 0.55);
      });
      // gravel bars: stipple dots in the gaps between threads
      for (let i = 0; i < 40; i++) {
        const px = (ctx.rand() - 0.5) * L * 0.95, py = (ctx.rand() - 0.5) * Wd * 0.8;
        s += `<circle cx="${f(px)}" cy="${f(py)}" r="${f(0.3 * k)}" fill="${S.inkSoft}" fill-opacity="0.7"/>`;
      }
      // a few bar outlines (the islands), dashed, with a willow tuft
      for (let i = 0; i < 3; i++) {
        const bx = -L * 0.3 + i * L * 0.3 + (ctx.rand() - 0.5) * 4 * k, by = (i % 2 ? 1 : -1) * Wd * 0.12;
        const bw = (6 + ctx.rand() * 4) * k, bh = 1.6 * k;
        s += path(`M${f(bx - bw / 2)} ${f(by)} q${f(bw / 2)} ${f(-bh * 1.6)} ${f(bw)} 0 q${f(-bw / 2)} ${f(bh * 1.4)} ${f(-bw)} 0`, S.inkSoft, 0.45);
        s += path(`M${f(bx)} ${f(by - bh * 0.3)} l${f(-0.6 * k)} ${f(-1.8 * k)} M${f(bx)} ${f(by - bh * 0.3)} l${f(0.5 * k)} ${f(-1.6 * k)} M${f(bx + 0.2 * k)} ${f(by - bh * 0.3)} l0 ${f(-2.1 * k)}`, S.sageDeep, 0.5);
      }
      // flow direction arrowless: short flow dashes in the main thread
      for (let i = 0; i < 6; i++) {
        const px = -L * 0.4 + i * L * 0.16 + ctx.rand() * 2 * k, py = (ctx.rand() - 0.5) * Wd * 0.5;
        s += path(`M${f(px)} ${f(py)} l${f(3 * k)} ${f((ctx.rand() - 0.5) * 0.6 * k)}`, S.water, 0.45);
      }
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- mountainLake: a lake with a reflection hint ----------
    mountainLake(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const W = 44 * k, H = 12 * k;
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
      s += fpath(d, S.waterPale, S.water, 0.7);
      // shore line, a second broken line just outside, and a few shore stones
      for (let i = 0; i < n; i++) {
        if (ctx.rand() < 0.35) continue;
        const a = i / n * Math.PI * 2, a2 = (i + 0.7) / n * Math.PI * 2;
        s += path(`M${f(Math.cos(a) * W / 2 * 1.06)} ${f(-H / 2 + Math.sin(a) * H / 2 * 1.14)} Q${f(Math.cos((a + a2) / 2) * W / 2 * 1.07)} ${f(-H / 2 + Math.sin((a + a2) / 2) * H / 2 * 1.16)} ${f(Math.cos(a2) * W / 2 * 1.06)} ${f(-H / 2 + Math.sin(a2) * H / 2 * 1.14)}`, S.inkSoft, 0.45);
      }
      // reflection hint: an inverted peak in a slightly deeper water tone, with broken horizontal ripples through it
      const px = -W * 0.1, top = -H / 2 - 0.5 * k;
      s += fpath(`M${f(px - 11 * k)} ${f(top)} L${f(px - 3 * k)} ${f(top + 7 * k)} L${f(px)} ${f(top + 5 * k)} L${f(px + 4 * k)} ${f(top + 8.5 * k)} L${f(px + 12 * k)} ${f(top)} Z`, ctx.MIX(S.waterPale, S.water, 0.5), 'none', 0, ' fill-opacity="0.9"');
      s += path(`M${f(px - 3 * k)} ${f(top + 7 * k)} L${f(px - 1.5 * k)} ${f(top + 3 * k)}`, S.water, 0.45);
      for (let i = 0; i < 4; i++) {
        const ry = -H * 0.85 + i * H * 0.16 + ctx.rand() * k, rx = (ctx.rand() - 0.5) * W * 0.5, rw = (4 + ctx.rand() * 8) * k;
        s += path(`M${f(rx - rw / 2)} ${f(ry)} l${f(rw)} 0`, S.paperHigh, 0.6);
      }
      // ripples
      for (let i = 0; i < 6; i++) {
        const rx = (ctx.rand() - 0.5) * W * 0.7, ry = -H / 2 + (ctx.rand() - 0.5) * H * 0.7, rw = (2.5 + ctx.rand() * 3) * k;
        s += path(`M${f(rx - rw / 2)} ${f(ry)} q${f(rw / 2)} ${f(-0.4 * k)} ${f(rw)} 0`, S.water, 0.45);
      }
      // a couple of shore rocks and sedge tufts in front
      for (let i = 0; i < 4; i++) {
        const gx = (ctx.rand() - 0.5) * W * 0.8, gy = 0.2 * k + ctx.rand() * 1.2 * k;
        s += path(`M${f(gx)} ${f(gy)} l${f(-0.6 * k)} ${f(-2 * k)} M${f(gx)} ${f(gy)} l${f(0.5 * k)} ${f(-1.7 * k)} M${f(gx + 0.3 * k)} ${f(gy)} l${f(0.2 * k)} ${f(-2.3 * k)}`, S.sageDeep, 0.5);
      }
      s += ground(ctx, 0, 1.2 * k, k, 24);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- detailedPine: a single handsome conifer, ~30 units at k=1 ----------
    detailedPine(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = conifer(ctx, 30 * k, 7 * k, S);
      // a few fallen needles / cones at base, and ground
      s += path(`M${f(-5 * k)} ${f(0.4 * k)} l${f(1.2 * k)} ${f(-0.4 * k)} M${f(4 * k)} ${f(0.6 * k)} l${f(1.5 * k)} ${f(0.2 * k)}`, S.inkSoft, 0.45);
      s += `<ellipse cx="${f(3.2 * k)}" cy="${f(-0.4 * k)}" rx="${f(0.5 * k)}" ry="${f(0.9 * k)}" fill="none" stroke="${S.ink}" stroke-width="0.45"/>`;
      s += ground(ctx, 0, 0.6 * k, k, 8);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- detailedDeciduous: a single broadleaf tree with branching canopy ----------
    detailedDeciduous(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = broadleaf(ctx, 28 * k, S, k);
      // root flare and ground
      s += path(`M${f(-0.9 * k)} 0 l${f(-2.2 * k)} ${f(0.5 * k)} M${f(0.9 * k)} 0 l${f(2 * k)} ${f(0.6 * k)}`, S.ink, 0.7);
      s += ground(ctx, 0, 0.6 * k, k, 9);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- shrubs: a cluster of low shrubs ----------
    shrubs(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      const n = opts.count || 4;
      let s = '';
      const bush = (bx, by, w, h) => {
        let t = '';
        // outline of twiggy mass: scalloped dome
        let d = `M${f(bx - w / 2)} ${f(by)}`;
        const m = 6;
        for (let i = 1; i <= m; i++) {
          const a = Math.PI - i / m * Math.PI;
          const px = bx + Math.cos(a) * w / 2, py = by - Math.sin(a) * h * (1 + (ctx.rand() - 0.5) * 0.3);
          const a2 = a + Math.PI / (2 * m);
          d += ` Q${f(bx + Math.cos(a2) * w / 2 * 1.15)} ${f(by - Math.sin(a2) * h * 1.25)} ${f(px)} ${f(py)}`;
        }
        t += fpath(d, S.sage, S.sageDeep, 0.6, ' fill-opacity="0.4"');
        // inner twigs: several stems from the base fanning up
        for (let i = 0; i < 4; i++) {
          const tx = bx + (i - 1.5) * w * 0.18, ex = tx + (i - 1.5) * w * 0.12 + (ctx.rand() - 0.5) * k, ey = by - h * (0.55 + ctx.rand() * 0.35);
          t += path(`M${f(bx + (ctx.rand() - 0.5) * k)} ${f(by)} Q${f(tx)} ${f(by - h * 0.5)} ${f(ex)} ${f(ey)}`, S.sageDeep, 0.5);
        }
        t += hatch(ctx, bx + w * 0.22, by - h * 0.45, k, 3, 1.6 * k, S.sageDeep, 0.9 * k, 0.4 * k);
        return t;
      };
      const arr = [];
      for (let i = 0; i < n; i++) {
        const w = (7 + ctx.rand() * 5) * k, h = (4 + ctx.rand() * 3) * k;
        const bx = (i - (n - 1) / 2) * 8 * k + (ctx.rand() - 0.5) * 3 * k, by = (i % 2 ? -2.5 : 0.3) * k + (ctx.rand() - 0.5) * k;
        arr.push({ bx, by, w, h });
      }
      arr.sort((a, b) => a.by - b.by).forEach(b => s += bush(b.bx, b.by, b.w, b.h));
      s += ground(ctx, 0, 1 * k, k, n * 4.5 + 3);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- marmot: on a rock, sitting up ----------
    marmot(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      // the rock: a boulder with a flat-ish top
      const rock = `M${f(-9 * k)} ${f(0.5 * k)} L${f(-8 * k)} ${f(-4 * k)} L${f(-4 * k)} ${f(-6.5 * k)} L${f(4 * k)} ${f(-6 * k)} L${f(8 * k)} ${f(-3.5 * k)} L${f(9 * k)} ${f(0.5 * k)} Z`;
      s += fpath(rock, ctx.MIX(S.paper, S.stone, 0.3), S.ink, 0.8);
      s += path(`M${f(-5 * k)} ${f(-5 * k)} l${f(2 * k)} ${f(3 * k)} l${f(-1 * k)} ${f(2 * k)}`, S.inkSoft, 0.5);
      s += hatch(ctx, 3.5 * k, -4 * k, k, 4, 2.2 * k, S.inkSoft, 0.8 * k, 0.9 * k);
      // marmot: stout, sitting upright on haunches; base at rock top (~-6k), slightly left of centre
      const mx = -1.5 * k, my = -6.2 * k, h = 7.5 * k;
      // body: rounded pear, filled with a soft paper/ink mix
      const body = `M${f(mx - 3.6 * k)} ${f(my)} Q${f(mx - 4.4 * k)} ${f(my - h * 0.5)} ${f(mx - 1.8 * k)} ${f(my - h * 0.74)} Q${f(mx - 0.6 * k)} ${f(my - h * 0.82)} ${f(mx + 0.8 * k)} ${f(my - h * 0.8)} Q${f(mx + 3.0 * k)} ${f(my - h * 0.5)} ${f(mx + 3.2 * k)} ${f(my)} Z`;
      s += fpath(body, ctx.MIX(S.paper, S.moraine, 0.22), S.ink, 0.8);
      // head: a blunt round head on top, small ears, nose toward the right (looking out)
      s += fpath(`M${f(mx - 1.4 * k)} ${f(my - h * 0.75)} Q${f(mx - 1.6 * k)} ${f(my - h * 1.05)} ${f(mx + 0.4 * k)} ${f(my - h * 1.05)} Q${f(mx + 2.3 * k)} ${f(my - h * 1.02)} ${f(mx + 2.2 * k)} ${f(my - h * 0.82)} Q${f(mx + 1.4 * k)} ${f(my - h * 0.72)} ${f(mx + 0.6 * k)} ${f(my - h * 0.78)}`, ctx.MIX(S.paper, S.moraine, 0.22), S.ink, 0.8);
      s += path(`M${f(mx - 0.9 * k)} ${f(my - h * 1.02)} q${f(-0.2 * k)} ${f(-0.9 * k)} ${f(0.7 * k)} ${f(-0.4 * k)}`, S.ink, 0.55); // ear
      s += `<circle cx="${f(mx + 1.2 * k)}" cy="${f(my - h * 0.93)}" r="${f(0.32 * k)}" fill="${S.ink}"/>`; // eye
      s += path(`M${f(mx + 2.2 * k)} ${f(my - h * 0.88)} l${f(0.3 * k)} ${f(0.1 * k)}`, S.ink, 0.8); // nose
      // forepaws held up at the chest
      s += path(`M${f(mx + 1.2 * k)} ${f(my - h * 0.55)} q${f(1.2 * k)} ${f(-0.2 * k)} ${f(1.3 * k)} ${f(-0.9 * k)} M${f(mx + 1.0 * k)} ${f(my - h * 0.45)} q${f(1.3 * k)} ${f(-0.1 * k)} ${f(1.6 * k)} ${f(-0.7 * k)}`, S.ink, 0.6);
      // haunch line and hind foot
      s += path(`M${f(mx - 2.4 * k)} ${f(my - h * 0.15)} q${f(1.5 * k)} ${f(-1.5 * k)} ${f(2.6 * k)} ${f(-0.3 * k)}`, S.inkSoft, 0.5);
      s += path(`M${f(mx + 0.4 * k)} ${f(my)} l${f(2.6 * k)} ${f(-0.1 * k)}`, S.ink, 0.6);
      // fur hatch on the right/back
      s += hatch(ctx, mx + 1.3 * k, my - h * 0.38, k, 3, 1.5 * k, S.inkSoft, 0.25 * k, 0.9 * k);
      // tail: hangs over the rock edge behind
      s += path(`M${f(mx - 2.9 * k)} ${f(my - 0.5 * k)} q${f(-2.5 * k)} ${f(0.5 * k)} ${f(-2.8 * k)} ${f(2.5 * k)}`, S.ink, 0.9);
      s += ground(ctx, 0, 0.9 * k, k, 11);
      return wrap(x, y, k, opts.flip, s);
    },

    // ---------- eagle: a large bird soaring, wings spread (drawn centred on (x,y), no ground) ----------
    eagle(ctx, x, y, k, opts) {
      const S = ctx.S; opts = opts || {};
      let s = '';
      const span = 32 * k;
      // Seen from below/side-on, wings held in a shallow V, tips splayed into primaries.
      const wing = dir => {
        let t = '';
        const tipx = dir * span / 2, tipy = -3 * k;
        // filled wing silhouette (knock-out paper tint), leading edge bowed up, trailing edge sagging
        const lead = `M${f(dir * 1.4 * k)} ${f(-1.6 * k)} C${f(dir * span * 0.12)} ${f(-5.2 * k)} ${f(dir * span * 0.3)} ${f(-6.6 * k)} ${f(tipx)} ${f(tipy)}`;
        // primaries: 5 separated finger strokes fanning from the tip region
        let prim = '';
        const fan = [];
        for (let i = 0; i < 5; i++) {
          const t2 = i / 4;
          const bx = tipx - dir * (1.2 + t2 * 7) * k, by = tipy + (0.3 + t2 * 0.4) * k - t2 * 2.2 * k;
          const ex = bx + dir * (1.2 - t2 * 0.4) * k, ey = by + (3.8 - t2 * 0.4) * k;
          fan.push([bx, by, ex, ey]);
        }
        // trailing edge runs from the last primary root back to the body, scalloped (secondaries)
        const lastRoot = fan[4];
        let trail = `M${f(lastRoot[2])} ${f(lastRoot[3])}`;
        const ns = 5;
        for (let i = 1; i <= ns; i++) {
          const t2 = i / ns;
          const px = lastRoot[2] + (dir * 1.4 * k - lastRoot[2]) * t2, py = lastRoot[3] + (3.0 * k - lastRoot[3]) * t2 + Math.sin(t2 * Math.PI) * 1.2 * k;
          trail += ` Q${f(px - dir * 1.4 * k)} ${f(py + 1.1 * k)} ${f(px)} ${f(py)}`;
        }
        // silhouette fill: lead edge to tip, down through fan tips, then trail back
        let sil = lead;
        fan.forEach(q => sil += ` L${f(q[2])} ${f(q[3])}`);
        sil += trail.slice(trail.indexOf(' '));
        sil += ' Z';
        t += fpath(sil, ctx.MIX(S.paper, S.ink, dir > 0 ? 0.07 : 0.04), 'none', 0);
        t += path(lead, S.ink, 0.9);
        fan.forEach((q, i) => t += path(`M${f(q[0])} ${f(q[1])} L${f(q[2])} ${f(q[3])}`, S.ink, 0.7));
        // tips joined by a soft scallop
        for (let i = 0; i < 4; i++) t += path(`M${f(fan[i][2])} ${f(fan[i][3])} Q${f((fan[i][2] + fan[i + 1][2]) / 2 - dir * 0.3 * k)} ${f((fan[i][3] + fan[i + 1][3]) / 2 + 0.9 * k)} ${f(fan[i + 1][2])} ${f(fan[i + 1][3])}`, S.ink, 0.55);
        t += path(trail, S.ink, 0.7);
        // a few feather lines across the secondaries
        for (let i = 1; i < 4; i++) {
          const t2 = i / 4;
          const lx = dir * 1.4 * k + (lastRoot[0] - dir * 1.4 * k) * t2, ly = -1.6 * k + (lastRoot[1] + 1.6 * k) * t2 - Math.sin(t2 * Math.PI) * 2.5 * k;
          t += path(`M${f(lx)} ${f(ly + 0.8 * k)} q${f(-dir * 0.3 * k)} ${f(1.2 * k)} ${f(-dir * 0.6 * k)} ${f((2.2 + ctx.rand() * 0.6) * k)}`, S.inkSoft, 0.45);
        }
        return t;
      };
      s += wing(-1) + wing(1);
      // body: a short spindle between the wings, head to the right with hooked beak, fanned tail below
      s += fpath(`M${f(-1.5 * k)} ${f(-2.0 * k)} Q${f(-1.9 * k)} ${f(1.5 * k)} ${f(-0.2 * k)} ${f(3.2 * k)} Q${f(1.8 * k)} ${f(1.6 * k)} ${f(1.5 * k)} ${f(-2.0 * k)} Q0 ${f(-3.0 * k)} ${f(-1.5 * k)} ${f(-2.0 * k)} Z`, S.paper, S.ink, 0.8);
      s += fpath(`M${f(-0.6 * k)} ${f(-2.6 * k)} Q${f(0.2 * k)} ${f(-4.6 * k)} ${f(1.6 * k)} ${f(-3.6 * k)} Q${f(1.2 * k)} ${f(-2.6 * k)} ${f(0.6 * k)} ${f(-2.4 * k)}`, S.paperHigh, S.ink, 0.7); // head (pale)
      s += path(`M${f(1.6 * k)} ${f(-3.6 * k)} q${f(0.9 * k)} ${f(0.1 * k)} ${f(0.7 * k)} ${f(0.9 * k)}`, S.ink, 0.7); // hooked beak
      s += fpath(`M${f(-2.4 * k)} ${f(2.6 * k)} Q${f(-1.6 * k)} ${f(6.4 * k)} ${f(-0.2 * k)} ${f(6.8 * k)} Q${f(1.4 * k)} ${f(6.4 * k)} ${f(2.2 * k)} ${f(2.6 * k)} Z`, S.paperHigh, S.ink, 0.7); // tail (pale, like a golden/bald eagle's)
      s += path(`M${f(-1.0 * k)} ${f(3.2 * k)} l${f(-0.2 * k)} ${f(3.0 * k)} M${f(0.2 * k)} ${f(3.2 * k)} l0 ${f(3.3 * k)} M${f(1.2 * k)} ${f(3.2 * k)} l${f(0.2 * k)} ${f(2.8 * k)}`, S.inkSoft, 0.5);
      return wrap(x, y, k, opts.flip, s);
    }
  });
})();
