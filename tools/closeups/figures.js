// MRI motifs — PEOPLE group. Period staffage for an ink-on-paper survey plate.
// Classic script: registers on window.MRI_MOTIFS. See MOTIF-CONTRACT.md, "Figures".
//
// Every person is ONE solid ink silhouette (hat, head, coat, legs as a single
// filled blot), the way engravers drew staffage on 19th-century sheets: no
// outline, no circle head, no faces, no interior lines. Loads are a second
// fill separated from the body by a paper hairline; tools are hairlines.
// A standing adult is 16 units tall at k = 1. The ink engine (ink.js) adds
// the slow hand-wobble afterwards, so nothing here is jittered.
//
// Exported helper (skipped by the contact sheet, usable by other groups):
//   window.MRI_MOTIFS._silhouette(ctx, x, y, k, pose)
//   pose = { stance: 'stand'|'walk'|'lean'|'bend'|'climb'|'sit',
//            facing: 1|-1,                 // +1 faces +x (right)
//            hat: 'brim'|'cap'|'scarf'|'none',
//            load: 'pack'|'basket'|'bundle'|'jug'|'none',
//            height: 16,                   // plate units at k = 1
//            armUp: bool,                  // hand raised to shade the eyes
//            stick: bool,                  // alpenstock, hairline, taller than the figure
//            skirt: bool,                  // long skirt to the ankle instead of coat + legs
//            lean: deg (optional override), riseFront: units the front foot is raised (climb) }
(function () {
  const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
  const HAIR = '0.45', SEC = '0.7';                    // stroke classes in sheet units (ink.js quantises)

  // ---- geometry -----------------------------------------------------------
  // Thick limb: polygon around a polyline, width w0 at the start, w1 at the end.
  function limb(pts, w0, w1) {
    const n = pts.length, L = [], R = [];
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1]; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
      const w = (w0 + (w1 - w0) * i / (n - 1)) / 2;
      L.push([pts[i][0] - dy * w, pts[i][1] + dx * w]);
      R.push([pts[i][0] + dy * w, pts[i][1] - dx * w]);
    }
    const out = L.concat(R.reverse());
    out[0] = out[0].concat([1]); out[n - 1] = out[n - 1].concat([1]); out[n] = out[n].concat([1]); out[2 * n - 1] = out[2 * n - 1].concat([1]);
    return out;
  }
  // Signed area (y-up local frame); used to give every subpath the same winding
  function area(pts) { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p[0] * q[1] - q[0] * p[1]; } return a; }
  // Smooth closed outline: quadratic through midpoints; a point with a third
  // element (corner flag) is kept sharp (brim tips, hem corners, toes).
  function blobD(pts, T) {
    if (area(pts) < 0) pts = pts.slice().reverse();
    const n = pts.length, P = p => { const q = T(p[0], p[1]); return f1(q[0]) + ' ' + f1(q[1]); };
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let d = 'M' + P(mid(pts[n - 1], pts[0]));
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n], m = mid(p, q);
      d += p[2] ? ' L' + P(p) + ' L' + P(m) : ' Q' + P(p) + ' ' + P(m);
    }
    return d + ' Z';
  }
  function rot(p, th, o) { const c = Math.cos(th), s = Math.sin(th); return [o[0] + p[0] * c + p[1] * s, o[1] - p[0] * s + p[1] * c].concat(p.slice(2)); }
  function lineD(pts, T) { return pts.map((p, i) => { const q = T(p[0], p[1]); return (i ? 'L' : 'M') + f1(q[0]) + ' ' + f1(q[1]); }).join(''); }
  function hair(pts, T, col, w) { return `<path d="${lineD(pts, T)}" fill="none" stroke="${col}" stroke-width="${w || HAIR}" stroke-linecap="butt" stroke-linejoin="round"/>`; }
  function curveD(a, c, b, T) { const A = T(a[0], a[1]), C = T(c[0], c[1]), B = T(b[0], b[1]); return `M${f1(A[0])} ${f1(A[1])} Q${f1(C[0])} ${f1(C[1])} ${f1(B[0])} ${f1(B[1])}`; }

  // ---- the silhouette -------------------------------------------------------
  // Local frame: origin at the base point (under the figure), y UP, units at k = 1.
  // Returns { svg, hand:[x,y], head:[x,y], top:[x,y], back:[x,y] } in local units.
  function silhouette(ctx, x, y, k, pose) {
    const { S, rand } = ctx; pose = pose || {};
    const face = pose.facing == null ? 1 : (pose.facing < 0 ? -1 : 1);
    const s = (pose.height || 16) / 16;                 // height scale: all local units are for a 16-tall adult
    const T = (px, py) => [x + px * k * s * face, y - py * k * s];
    const v = (b, pct) => b * (1 + (rand() - 0.5) * 2 * (pct == null ? 0.08 : pct));   // proportion variation, never jitter
    const stance = pose.stance || 'stand';
    const hat = pose.hat || 'brim';
    const load = pose.load || 'none';
    const skirt = !!pose.skirt;

    // --- proportions (torso frame: origin at the hip, y up) ---
    const shW = v(2.2), shB = v(2.3), hemF = v(2.3), hemB = v(2.7, 0.1);   // shoulder / hem half-widths
    const headR = v(1.15), brimF = v(2.7, 0.12), brimB = v(2.1, 0.12);
    const hemY = skirt ? -6.6 : -1.0;
    const hipY = stance === 'sit' ? 4.6 : 7.0;
    let lean = { stand: 0.02, walk: 0.10, lean: 0.32, bend: 1.22, climb: 0.36, sit: 0.12 }[stance] || 0;
    lean += (rand() - 0.5) * 0.08;
    if (pose.lean != null) lean = pose.lean * Math.PI / 180;
    const hip = [stance === 'stand' ? (rand() - 0.5) * 0.6 : 0, hipY];

    // --- upper body outline (front, up over the head, down the back, hem) ---
    const B = [];
    B.push([hemF, hemY, 1]);                                   // front hem corner
    if (skirt) { B.push([hemF * 0.7, hemY + 3.5]); B.push([1.7, 1.0]); }
    else B.push([1.5, 2.2]);
    B.push([1.7, 4.2]); B.push([shW * 0.9, 5.1]);                 // chest, front shoulder
    B.push([0.8, 5.8]); B.push([headR * 0.9, 6.3]);               // neck, chin
    // head and hat
    if (hat === 'brim') {
      B.push([headR * 1.1, 7.0]);
      B.push([brimF, 7.3, 1]); B.push([1.5, 7.8, 1]);              // brim front tip, crown front foot
      B.push([1.3, 8.7]); B.push([0.2, 9.1]); B.push([-1.0, 8.6]);
      B.push([-1.3, 7.8, 1]); B.push([-brimB, 7.3, 1]);            // crown back foot, brim back tip
      B.push([-headR * 1.05, 6.8]);
    } else if (hat === 'cap') {
      B.push([headR * 1.15, 7.1]); B.push([2.3, 7.5, 1]);           // short peak forward
      B.push([1.2, 7.9]); B.push([0.1, 8.5]); B.push([-1.2, 8.2]); B.push([-headR * 1.25, 7.2]);
    } else if (hat === 'scarf') {
      B.push([headR * 1.2, 7.2]); B.push([0.9, 8.3]); B.push([-0.2, 8.6]); B.push([-1.3, 8.0]);
      B.push([-2.0, 6.9, 1]); B.push([-2.4, 5.9, 1]); B.push([-1.2, 6.3]);   // tail of the scarf down the nape
    } else {
      B.push([headR * 1.15, 6.9]); B.push([headR * 1.05, 7.8]); B.push([0.2, 8.5]); B.push([-0.9, 8.2]); B.push([-headR * 1.2, 7.2]);
    }
    B.push([-0.9, 6.0]); B.push([-0.7, 5.6]);                     // nape, neck back
    B.push([-shB, 5.0]); B.push([-shB * 1.0, 3.0]);               // back shoulder, back
    if (skirt) { B.push([-hemB * 0.8, hemY + 3.2]); B.push([-hemB * 1.25, hemY, 1]); B.push([0, hemY - 0.3]); }
    else { B.push([-hemB, hemY, 1]); B.push([0, hemY - 0.25]); }
    const body = B.map(p => rot(p, lean, hip));
    const subs = [body];

    // --- arm (only when it carries meaning: stick, raised hand, bent at work) ---
    let hand = null;
    const shoulder = [0.9, 4.7];
    if (pose.armUp) { hand = [1.6, 7.4]; subs.push(limb([shoulder, [2.9, 5.9], hand], 1.2, 0.7).map(p => rot(p, lean, hip))); }
    else if (pose.stick || stance === 'bend') {
      hand = stance === 'bend' ? [2.6, 1.6] : [2.8, 2.4];
      subs.push(limb([shoulder, [2.3, 3.6], hand], 1.25, 0.75).map(p => rot(p, lean, hip)));
    }
    const handW = hand ? rot(hand, lean, hip) : rot([1.8, 2.3], lean, hip);

    // --- legs (ground frame): two tapered wedges, one forward of the other ---
    if (!skirt) {
      const st = { stand: [0.8, -0.8], walk: [2.2, -1.9], lean: [1.6, -1.7], bend: [0.6, -1.5], climb: [2.3, -1.6], sit: [2.8, 1.2] }[stance];
      const fx = v(st[0], 0.12), bx = v(st[1], 0.12);
      const rise = pose.riseFront != null ? pose.riseFront : (stance === 'climb' ? 2.4 : 0);
      const top = hipY + 0.6;
      if (stance === 'sit') {
        subs.push(limb([[-0.2, top], [fx, hipY - 0.4], [fx + 0.3, 0.4]], 2.0, 1.0));
        subs.push(limb([[-0.6, top - 0.2], [bx, hipY - 0.8], [bx + 0.6, 0.4]], 1.7, 0.9));
        subs.push([[fx - 0.5, 0.5], [fx + 1.1, 0.0, 1], [fx - 0.6, 0.0]]);
        subs.push([[bx - 0.1, 0.5], [bx + 1.3, 0.0, 1], [bx - 0.2, 0.0]]);
      } else {
        // front leg
        const kF = [fx * 0.45 + (stance === 'climb' ? 1.2 : 0), 3.7 + rise * 0.7];
        subs.push(limb([[0.3, top], kF, [fx, 0.4 + rise]], 1.9, 1.05));
        subs.push([[fx - 0.7, 0.6 + rise], [fx + 1.0, 0.05 + rise, 1], [fx - 0.8, 0.0 + rise]]);   // foot, toe forward
        // back leg (heel lifted when walking)
        const kB = [bx * 0.5, 3.5]; const heel = stance === 'walk' || stance === 'climb' ? 0.5 : 0;
        subs.push(limb([[-0.4, top], kB, [bx, 0.4 + heel * 0.5]], 1.8, 0.95));
        subs.push([[bx - 0.6, 0.5 + heel], [bx + 0.9, 0.05, 1], [bx - 0.7, 0.0 + heel * 0.8]]);
      }
    } else {
      subs.push([[1.2, 0.5], [2.1, 0.0, 1], [0.6, 0.0]]);   // one foot below the skirt
    }

    // --- the blot ---
    let svg = `<path d="${subs.map(p => blobD(p, T)).join(' ')}" fill="${S.ink}" stroke="none"/>`;

    // --- load: second fill, paper hairline between it and the body ---
    let loadSvg = '', gap = '';
    const LR = p => rot(p, lean, hip);
    if (load === 'pack') {
      const w = v(1.5), h = v(2.3), c = [-shB - w * 0.55, 3.3];
      const P = []; for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; P.push([c[0] + Math.cos(a) * w * (i % 2 ? 0.92 : 1), c[1] + Math.sin(a) * h]); }
      loadSvg = `<path d="${blobD(P.map(LR), T)}" fill="${S.ink}" stroke="none"/>`;
      gap = hair([LR([-shB - 0.1, 5.2]), LR([-shB - 0.3, 3.2]), LR([-shB + 0.1, 1.4])], T, S.paper);
    } else if (load === 'basket') {
      const P = [[-shB + 0.2, 5.3, 1], [-shB - 2.6, 5.0, 1], [-shB - 2.2, 1.9, 1], [-shB + 0.1, 2.0, 1]];
      loadSvg = `<path d="${blobD(P.map(LR), T)}" fill="${S.ink}" stroke="none"/>`;
      gap = hair([LR([-shB - 0.05, 5.3]), LR([-shB - 0.15, 3.5]), LR([-shB + 0.05, 1.9])], T, S.paper);
    } else if (load === 'bundle') {
      const c = [-1.4, 6.9], w = v(1.7), h = v(1.3);
      const P = []; for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; P.push([c[0] + Math.cos(a) * w, c[1] + Math.sin(a) * h * (i % 3 ? 1 : 0.85)]); }
      loadSvg = `<path d="${blobD(P.map(LR), T)}" fill="${S.ink}" stroke="none"/>`;
      gap = hair([LR([-2.0, 5.6]), LR([-0.8, 6.0]), LR([0.2, 6.6])], T, S.paper);
    } else if (load === 'jug') {
      const tY = hat === 'none' ? 8.3 : 8.6, w = v(1.1);
      const P = [[-w * 0.7, tY, 1], [w * 0.7, tY, 1], [w * 1.05, tY + 1.2], [w * 0.75, tY + 2.4], [w * 0.55, tY + 3.0, 1], [-w * 0.55, tY + 3.0, 1], [-w * 0.75, tY + 2.4], [-w * 1.05, tY + 1.2]];
      loadSvg = `<path d="${blobD(P.map(LR), T)}" fill="${S.ink}" stroke="none"/>`;
      gap = hair([LR([-1.0, tY + 0.05]), LR([0, tY - 0.05]), LR([1.0, tY + 0.05])], T, S.paper);
    }
    svg += loadSvg + gap;
    // collar: the one light line an engraver left on the figure (sometimes)
    if (rand() < 0.45 && stance !== 'bend') svg += hair([LR([-0.7, 5.55]), LR([0.2, 5.45]), LR([0.9, 5.6])], T, S.paper);

    // --- alpenstock: hairline, taller than the figure, planted ahead ---
    if (pose.stick) {
      const gx = handW[0] + v(1.4, 0.2), gy = pose.stickGround != null ? pose.stickGround : 0.2;
      const topY = 16 * 1.12;
      svg += hair([[gx + 0.4, gy], [gx - 0.8, topY]], T, S.ink);
    }
    return { svg, hand: handW, head: rot([0, 7.4], lean, hip), top: rot([0, 9.0], lean, hip), back: rot([-shB, 3.5], lean, hip), T, s };
  }

  // tiny grazing animal (sheep / goat) as a blot; (ax, ay) ground point, local frame of T
  function animal(ctx, T, ax, ay, face, kind) {
    const { S, rand } = ctx;
    const L = (kind === 'goat' ? 4.0 : 4.6) * (0.9 + rand() * 0.25), H = (kind === 'goat' ? 2.6 : 2.4) * (0.9 + rand() * 0.2), down = rand() < 0.6;   // head down = grazing
    const P = [[-L * 0.55, H * 0.5], [-L * 0.45, H * 1.0], [-L * 0.1, H * 1.3], [L * 0.3, H * 1.25], [L * 0.55, H * 1.0]];
    if (down) P.push([L * 0.7, H * 0.75], [L * 0.88, H * 0.45], [L * 0.98, H * 0.12, 1], [L * 0.8, H * 0.2], [L * 0.62, H * 0.45]);
    else P.push([L * 0.72, H * 1.2], [L * 0.82, H * 1.45, 1], [L * 1.0, H * 1.25, 1], [L * 0.85, H * 0.95], [L * 0.65, H * 0.5]);
    P.push([L * 0.3, H * 0.4], [-L * 0.35, H * 0.4]);
    if (kind === 'goat') P.push([-L * 0.62, H * 0.15, 1]);
    const TT = (px, py) => T(ax + px * face, ay + py);
    const legs = [[[L * 0.36, H * 0.6], [L * 0.5, 0, 1], [L * 0.22, 0]], [[-L * 0.2, H * 0.6], [-L * 0.12, 0, 1], [-L * 0.45, 0]]];
    return `<path d="${blobD(P, TT)} ${legs.map(l => blobD(l, TT)).join(' ')}" fill="${S.ink}" stroke="none"/>`;
  }

  // short broken ground line (the sheet's hachures do the rest)
  function ground(ctx, T, x0, x1, y) {
    const { S, rand } = ctx; let s = '';
    if (true) return s;   /* no private baseline: the composer ties the motif to the sheet's own hachures */
    const a = x0 + rand() * 1.5, b = a + (x1 - x0) * (0.3 + rand() * 0.25);
    s += hair([[a, y - 0.3], [b, y - 0.4]], T, S.inkSoft, HAIR);
    if (rand() < 0.7) s += hair([[b + 1.5 + rand(), y - 0.2], [x1 - rand(), y - 0.4]], T, S.inkSoft, HAIR);
    return s;
  }

  function sil(ctx, x, y, k, pose) { return silhouette(ctx, x, y, k, pose).svg; }
  const fx = (opts, d) => (opts && opts.flip ? -1 : 1) * d;

  // ---- motifs --------------------------------------------------------------
  window.MRI_MOTIFS = Object.assign(window.MRI_MOTIFS || {}, {
    _silhouette: sil,

    // opts.flip; opts.hat = 'brim'|'cap'|'scarf'|'none' (default brim). Standing, weight on one hip.
    person(ctx, x, y, k, opts) {
      opts = opts || {}; const face = fx(opts, 1);
      const hat = opts.hat === undefined ? 'brim' : opts.hat;
      const r = ctx.rand();
      const stance = r < 0.7 ? 'stand' : 'walk';
      const S = silhouette(ctx, x, y, k, { stance, facing: face, hat, armUp: r > 0.85, stick: r > 0.55 && r < 0.7 });
      return '<g>' + S.svg + ground(ctx, S.T, -4, 4, 0) + '</g>';
    },

    // opts.flip; opts.load = 'basket' (on back, default) | 'jar' (on head). Leaning forward under the weight.
    personCarrying(ctx, x, y, k, opts) {
      opts = opts || {}; const face = fx(opts, 1);
      const jar = opts.load === 'jar';
      const S = silhouette(ctx, x, y, k, jar
        ? { stance: 'walk', facing: face, hat: 'none', load: 'jug', armUp: true }
        : { stance: 'lean', facing: face, hat: ctx.rand() < 0.5 ? 'brim' : 'cap', load: ctx.rand() < 0.6 ? 'basket' : 'pack', stick: ctx.rand() < 0.5 });
      return '<g>' + S.svg + ground(ctx, S.T, -4, 4, 0) + '</g>';
    },

    // opts.flip (default walks to the right, uphill); opts.slope = rise per unit (default 0.35)
    hikerWithStick(ctx, x, y, k, opts) {
      opts = opts || {}; const face = fx(opts, 1);
      const sl = opts.slope == null ? 0.35 : opts.slope;
      const rise = Math.max(0, Math.min(3.4, sl * 4));
      const S = silhouette(ctx, x, y, k, { stance: sl > 0.25 ? 'climb' : 'walk', facing: face, hat: 'brim', load: ctx.rand() < 0.7 ? 'pack' : 'none', stick: true, riseFront: rise, stickGround: rise + 1.0 });
      // ground follows the slope
      const T = S.T; let g = hair([[-4.5, -4.5 * sl * 0.5], [-1.0, -1.0 * sl * 0.5]], T, ctx.S.inkSoft, SEC);
      g += hair([[1.6, rise * 0.6 + 0.1], [5.0, rise * 0.6 + 3.4 * sl * 0.6]], T, ctx.S.inkSoft, HAIR);
      return '<g>' + S.svg + g + '</g>';
    },

    // opts.flip — woman in a long skirt, headscarf, water jug carried on the head (or on the hip)
    womanWithJug(ctx, x, y, k, opts) {
      opts = opts || {}; const face = fx(opts, 1);
      const onHead = ctx.rand() < 0.7;
      const S = silhouette(ctx, x, y, k, { stance: 'walk', facing: face, hat: 'scarf', skirt: true, load: onHead ? 'jug' : 'none', armUp: onHead });
      let extra = '';
      if (!onHead) {
        // jug at the hip, held in the front arm: a second blot beside the skirt with a paper gap
        const T = S.T, P = [[2.0, 5.6, 1], [3.3, 5.6, 1], [3.6, 4.4], [3.3, 3.0], [2.9, 2.6, 1], [2.0, 2.6, 1], [1.8, 3.4], [1.7, 4.6]];
        extra = `<path d="${blobD(P, T)}" fill="${ctx.S.ink}" stroke="none"/>` + hair([[1.9, 5.4], [1.8, 4.2], [2.0, 2.9]], T, ctx.S.paper);
        extra += `<path d="${blobD(limb([[0.9, 9.8], [2.4, 7.6], [2.6, 5.8]], 1.1, 0.7), T)}" fill="${ctx.S.ink}" stroke="none"/>`;
      }
      return '<g>' + S.svg + extra + ground(ctx, S.T, -4, 4, 0) + '</g>';
    },

    // opts.flip — bent double over a short hoe; opts.furrows (default 3) short hairline furrows ahead
    farmerWithHoe(ctx, x, y, k, opts) {
      opts = opts || {}; const face = fx(opts, 1);
      const S = silhouette(ctx, x, y, k, { stance: 'bend', facing: face, hat: ctx.rand() < 0.6 ? 'brim' : 'cap' });
      const T = S.T, h = S.hand, ink = ctx.S.ink;
      // hoe: handle from the hands down to the soil ahead, blade as a short secondary stroke
      const gx = h[0] + 2.4 + ctx.rand() * 0.8, gy = 0.3;
      let s = hair([[h[0] - 1.2, h[1] + 0.6], [gx, gy]], T, ink);
      s += hair([[gx - 0.2, gy + 0.1], [gx + 1.2, gy - 0.3]], T, ink, SEC);
      const nf = opts.furrows == null ? 3 : opts.furrows;
      for (let i = 0; i < nf; i++) { const x0 = gx + 2.2 + i * 2.1; s += hair([[x0, 0.2 + (ctx.rand() - 0.5) * 0.4], [x0 + 1.3 + ctx.rand() * 0.8, 0.3]], T, ctx.S.inkSoft); }
      return '<g>' + S.svg + s + ground(ctx, T, -5, -1, 0) + '</g>';
    },

    // opts.flip; opts.animals = 0|1|2|3 (default 2). Leaning on a crook, flock grazing ahead.
    shepherd(ctx, x, y, k, opts) {
      opts = opts || {}; const face = fx(opts, 1);
      const na = opts.animals == null ? 2 : Math.max(0, Math.min(3, opts.animals));
      const S = silhouette(ctx, x, y, k, { stance: 'stand', facing: face, hat: 'brim', stick: true, load: ctx.rand() < 0.4 ? 'bundle' : 'none', lean: -4 + ctx.rand() * 4 });
      const T = S.T; let a = '';
      const slots = [[6.5, 0.2], [12.0, -0.3], [9.0, 1.6]];
      for (let i = 0; i < na; i++) a += animal(ctx, T, slots[i][0] + ctx.rand() * 1.2, slots[i][1], ctx.rand() < 0.7 ? -1 : 1, ctx.rand() < 0.3 ? 'goat' : 'sheep');
      return '<g>' + a + S.svg + ground(ctx, T, -4, 3, 0) + '</g>';
    },

    // opts.flip; opts.seated (default true). Plein-air painter at an easel, seen from behind.
    painterAtEasel(ctx, x, y, k, opts) {
      opts = opts || {}; const face = fx(opts, 1);
      const seated = opts.seated !== false;
      const { S: pal, rand } = ctx;
      const T = (px, py) => [x + px * k * face, y - py * k];
      // easel: three hairline legs, a cross-bar and a small canvas knocked out in paper
      const ex = 6.8 + rand() * 0.8, top = 17 + rand() * 1.5, cw = 3.6 + rand() * 0.8, cy0 = seated ? 7.5 : 10.5;
      let e = hair([[ex - 2.6, 0.2], [ex + 0.4, top]], T, pal.ink, HAIR);
      e += hair([[ex + 2.4, 0.1], [ex + 0.9, top]], T, pal.ink, HAIR);
      e += hair([[ex + 0.6, top - 1], [ex + 4.6, 0.3]], T, pal.inkSoft, HAIR);
      e += hair([[ex - 1.8, cy0 - 0.3], [ex + 2.8, cy0 - 0.1]], T, pal.ink, HAIR);        // ledge
      const cvs = [[ex - 1.6, cy0, 1], [ex + 2.0, cy0 + 0.2, 1], [ex + 2.0, cy0 + cw + 0.2, 1], [ex - 1.6, cy0 + cw, 1]];
      e += `<path d="${blobD(cvs, T)}" fill="${pal.paper}" stroke="${pal.ink}" stroke-width="${SEC}"/>`;
      // the painter: a blot with the brush arm raised to the canvas
      const P = silhouette(ctx, x, y, k, { stance: seated ? 'sit' : 'stand', facing: face, hat: seated ? 'brim' : (rand() < 0.5 ? 'brim' : 'cap'), armUp: false, lean: seated ? 8 : 4 });
      // brush arm as part of the blot, hand toward the canvas; the brush a hairline
      const hip = [0, seated ? 4.6 : 7.0], th = (seated ? 8 : 4) * Math.PI / 180;
      const arm = limb([[1.0, 4.6], [2.6, 4.2], [3.8, 4.9]], 1.2, 0.7).map(p => rot(p, th, hip));
      let s = `<path d="${blobD(arm, T)}" fill="${pal.ink}" stroke="none"/>`;
      const hx = arm[2][0], hy = arm[2][1];
      s += hair([[hx + 0.3, hy + 0.2], [hx + 2.2, hy + 0.9]], T, pal.ink);
      if (seated) {   // camp stool: two hairline legs under the hip, splayed
        s += hair([[-1.0, 4.3], [-2.3, 0.2]], T, pal.ink, HAIR) + hair([[-0.6, 4.3], [0.9, 0.2]], T, pal.ink, HAIR);
      }
      return '<g>' + e + P.svg + s + ground(ctx, T, -4, 2, 0) + '</g>';
    },

    // opts.flip — two (sometimes three) roped climbers ascending a slope to the right; opts.slope (default 0.55)
    climbersRoped(ctx, x, y, k, opts) {
      opts = opts || {}; const face = fx(opts, 1);
      const sl = opts.slope == null ? 0.55 : opts.slope;
      const { rand } = ctx;
      const three = rand() < 0.3;
      const n = three ? 3 : 2, gapX = 12 + rand() * 2.5;
      const T = (px, py) => [x + px * k * face, y - py * k];
      const rise = Math.max(0.8, Math.min(3.2, sl * 4.5));
      let s = '', prev = null;
      for (let i = 0; i < n; i++) {
        const px = (i - (n - 1) / 2) * gapX, py = px * sl;
        const F = silhouette(ctx, x + px * k * face, y - py * k, k, { stance: 'climb', facing: face, hat: i === n - 1 ? 'brim' : 'cap', height: 16 * (0.94 + rand() * 0.1), load: 'pack', stick: i === n - 1 || rand() < 0.5, riseFront: rise, stickGround: rise + 1.2 });
        // ground step under each
        s += hair([[px - 3.0, py - 3.0 * sl - 0.3], [px + 1.5, py + 1.5 * sl - 0.3]], T, ctx.S.inkSoft, HAIR);
        s += F.svg;
        const waist = [px + F.back[0] * 1.0 + 0.6, py + F.back[1]];
        if (prev) {   // rope: sagging hairline from the lower climber's chest to the upper one's waist
          const a = [prev[0] + 1.8, prev[1] + 1.2], b = [waist[0] - 2.3, waist[1] - 0.6];
          const c = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 1.6];
          s += `<path d="${curveD(a, c, b, T)}" fill="none" stroke="${ctx.S.ink}" stroke-width="${HAIR}" stroke-linecap="butt"/>`;
        }
        prev = waist;
      }
      return '<g>' + s + '</g>';
    },

    // opts.n = 4..6 figures (default 5); opts.flip. A ring of people seen from slightly above, the far ones smaller.
    groupInCircle(ctx, x, y, k, opts) {
      opts = opts || {}; const face = fx(opts, 1);
      const n = Math.max(4, Math.min(6, opts.n == null ? 5 : opts.n));
      const { rand } = ctx;
      const rx = 6.5 + n * 0.5, ry = 2.6;
      const ph = rand() * Math.PI * 2;
      const list = [];
      for (let i = 0; i < n; i++) { const a = ph + i / n * Math.PI * 2; list.push({ px: Math.cos(a) * rx, py: -Math.sin(a) * ry }); }   // py < 0 = nearer
      list.sort((a, b) => a.py - b.py);                                   // far first (higher on the sheet)
      const hats = ['brim', 'cap', 'none', 'brim', 'scarf', 'cap'];
      let s = '';
      list.forEach((p, i) => {
        const depth = (p.py + ry) / (2 * ry);                              // 0 far .. 1 near
        const h = 16 * (0.86 + depth * 0.18) * (0.96 + rand() * 0.08);
        const facing = (p.px < -0.5 ? 1 : p.px > 0.5 ? -1 : (rand() < 0.5 ? 1 : -1)) * face;
        const r = rand();
        s += sil(ctx, x + p.px * k * face, y - p.py * k, k, { stance: r < 0.55 ? 'stand' : 'lean', facing, hat: hats[(i + Math.floor(ph)) % hats.length], height: h, skirt: hats[(i + Math.floor(ph)) % hats.length] === 'scarf', stick: r > 0.8, load: r > 0.4 && r < 0.55 ? 'pack' : 'none' });
      });
      return '<g>' + s + '</g>';
    },

    // opts.flip — a child and an elder walking hand in hand (elder with a stick)
    childAndElder(ctx, x, y, k, opts) {
      opts = opts || {}; const face = fx(opts, 1);
      const { rand } = ctx;
      const childFront = rand() < 0.6;
      const dx = 5.2 + rand() * 1.0;
      const E = silhouette(ctx, x + (childFront ? -dx * 0.4 : dx * 0.4) * k * face, y, k, { stance: 'walk', facing: face, hat: rand() < 0.5 ? 'brim' : 'scarf', skirt: rand() < 0.4, stick: true, lean: 9 + rand() * 5, height: 16 * (0.95 + rand() * 0.08), load: rand() < 0.3 ? 'bundle' : 'none' });
      const C = silhouette(ctx, x + (childFront ? dx * 0.6 : -dx * 0.6) * k * face, y + 0.2 * k, k, { stance: 'walk', facing: face, hat: rand() < 0.5 ? 'cap' : 'none', height: 7.6 + rand() * 1.4, lean: 4 });
      return '<g>' + (childFront ? E.svg + C.svg : C.svg + E.svg) + ground(ctx, E.T, -5, 5, 0) + '</g>';
    },
  });
})();
