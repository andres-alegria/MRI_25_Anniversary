// MRI motifs — PEOPLE group. Ink-on-paper survey-plate figures.
// Classic script: registers on window.MRI_MOTIFS. See CONTRACT.md.
(function () {
  // ---- helpers -------------------------------------------------------------
  // Local space: origin = base point, +y is UP, units = plate units at k=1.
  // A standing adult is ~22 units tall.
  function makeT(x, y, k, flip) {
    const sx = flip ? -1 : 1;
    return (px, py) => [x + px * k * sx, y - py * k];
  }
  const f1 = v => (Math.round(v * 10) / 10).toFixed(1);
  function makeDraw(ctx, T, k, jit) {
    const { S, rand } = ctx;
    const J = () => (rand() - 0.5) * jit;                   // hand jitter
    const p = (pt) => { const q = T(pt[0] + J(), pt[1] + J()); return f1(q[0]) + ' ' + f1(q[1]); };
    const w = v => f1(v * Math.max(0.75, Math.min(1.25, Math.sqrt(k)))); // strokes grow slowly with k
    const D = {
      // open stroke through points; smooth = quadratic through midpoints
      line(pts, sw, col, extra) {
        col = col || S.ink; extra = extra || '';
        let d = 'M' + p(pts[0]);
        if (pts.length === 2) d += ' L' + p(pts[1]);
        else {
          for (let i = 1; i < pts.length - 1; i++) {
            const a = pts[i], b = pts[i + 1];
            d += ' Q' + p(a) + ' ' + p([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
          }
          d += ' L' + p(pts[pts.length - 1]);
        }
        return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${w(sw)}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
      },
      poly(pts, sw, fill, col) {
        col = col || S.ink;
        let d = 'M' + p(pts[0]);
        for (let i = 1; i < pts.length; i++) d += ' L' + p(pts[i]);
        d += ' Z';
        return `<path d="${d}" fill="${fill}" stroke="${col}" stroke-width="${w(sw)}" stroke-linejoin="round"/>`;
      },
      circle(c, r, sw, fill, col) {
        const q = T(c[0] + J() * 0.5, c[1] + J() * 0.5);
        return `<circle cx="${f1(q[0])}" cy="${f1(q[1])}" r="${f1(r * k)}" fill="${fill || S.paper}" stroke="${col || S.ink}" stroke-width="${w(sw)}"/>`;
      },
      ellipse(c, rx, ry, sw, fill, col, op) {
        const q = T(c[0], c[1]);
        return `<ellipse cx="${f1(q[0])}" cy="${f1(q[1])}" rx="${f1(rx * k)}" ry="${f1(ry * k)}" fill="${fill}" stroke="${col || 'none'}" stroke-width="${w(sw)}" ${op != null ? 'fill-opacity="' + f1(op) + '"' : ''}/>`;
      },
      // a few short parallel hatch strokes inside a region: from (x,y) going dir, n strokes stepping by step
      hatch(x0, y0, len, n, step, angle, sw, col) {
        let s = '';
        const dx = Math.cos(angle) * len, dy = Math.sin(angle) * len;
        for (let i = 0; i < n; i++) {
          const ox = x0 + step[0] * i, oy = y0 + step[1] * i;
          const l = len * (0.7 + rand() * 0.5);
          s += D.line([[ox, oy], [ox + dx * l / len, oy + dy * l / len]], sw || 0.45, col || S.inkSoft);
        }
        return s;
      },
      // ground: broken line + a couple of stones + soft cast shadow
      ground(cx, halfw, opt) {
        opt = opt || {};
        let s = '';
        s += D.ellipse([cx + 0.6, 0.1], halfw * 0.9, 0.9, 0, S.shade, null, 0.07);
        const segs = 2 + Math.floor(rand() * 2);
        let xx = cx - halfw;
        for (let i = 0; i < segs; i++) {
          const l = halfw * 2 / segs;
          const a = xx + rand() * l * 0.25, b = xx + l * (0.6 + rand() * 0.35);
          s += D.line([[a, -0.1 + rand() * 0.3], [(a + b) / 2, 0.05 + rand() * 0.3], [b, -0.1 + rand() * 0.3]], 0.55, S.inkSoft);
          xx += l;
        }
        const ns = opt.stones == null ? 2 : opt.stones;
        for (let i = 0; i < ns; i++) {
          const sx = cx + (rand() - 0.5) * halfw * 2.4, r = 0.35 + rand() * 0.35;
          s += D.ellipse([sx, 0.15], r, r * 0.6, 0.45, S.paper, S.inkSoft);
        }
        return s;
      },
    };
    return D;
  }

  // ---- generic figure ------------------------------------------------------
  // pose: { head:[x,y], neck, hipL, hipR, shL, shR, elL, haL, elR, haR, knL, ftL, knR, ftR,
  //         lean (torso tilt, optional), hat: 'brim'|'cap'|'scarf'|none }
  // Arms drawn as two segments, legs too. Torso = a narrow coat shape knocked out
  // in paper, with a few hatch strokes on its right (shadow) side.
  function figure(D, ctx, pose) {
    const { S, rand } = ctx;
    let s = '';
    // far arm (R) is drawn first so the torso covers it
    if (pose.elR) s += D.line([pose.shR, pose.elR, pose.haR], 0.8, S.inkSoft);
    // far leg
    s += D.line([pose.hipR, pose.knR, pose.ftR], 1.0, S.ink);
    s += D.line([[pose.hipR[0] + 0.7, pose.hipR[1] - 0.4], [pose.knR[0] + 0.6, pose.knR[1]], [pose.ftR[0] + 0.6, pose.ftR[1] + 0.3]], 0.45, S.inkSoft);
    // torso (coat)
    const coat = [pose.shL, pose.neck, pose.shR, pose.hipR, pose.hipL];
    s += D.poly(coat, 0.7, pose.fill || S.paper);
    // shading hatch on the right side of the coat
    const mx = (pose.shR[0] + pose.hipR[0]) / 2, my = (pose.shR[1] + pose.hipR[1]) / 2;
    s += D.hatch(mx - 0.2, my + 1.6, 1.3, 3, [-0.35, -1.4], -0.9, 0.4, S.inkSoft);
    // near leg
    s += D.line([pose.hipL, pose.knL, pose.ftL], 1.05, S.ink);
    s += D.line([[pose.hipL[0] - 0.7, pose.hipL[1] - 0.4], [pose.knL[0] - 0.6, pose.knL[1]], [pose.ftL[0] - 0.6, pose.ftL[1] + 0.3]], 0.45, S.inkSoft);
    // feet: tiny tick
    const fd = pose.footDir == null ? 1 : pose.footDir;
    s += D.line([pose.ftL, [pose.ftL[0] + 1.1 * fd, pose.ftL[1] + 0.1]], 0.8, S.ink);
    s += D.line([pose.ftR, [pose.ftR[0] + 1.0 * fd, pose.ftR[1] + 0.1]], 0.7, S.inkSoft);
    // near arm
    if (pose.elL) s += D.line([pose.shL, pose.elL, pose.haL], 0.85, S.ink);
    // neck + head
    s += D.line([pose.neck, [pose.head[0], pose.head[1] - 1.4]], 0.8, S.ink);
    s += D.circle(pose.head, pose.headR || 1.6, 0.8, S.paper);
    // hair/shadow on the head's right-lower side: small arc
    const h = pose.head, r = pose.headR || 1.6;
    s += D.line([[h[0] + r * 0.55, h[1] - r * 0.75], [h[0] + r * 0.95, h[1] - r * 0.1]], 0.5, S.inkSoft);
    if (pose.hat === 'brim') {
      // crown + brim
      s += D.line([[h[0] - r * 0.9, h[1] + r * 0.55], [h[0] - r * 0.7, h[1] + r * 1.35], [h[0] + r * 0.7, h[1] + r * 1.35], [h[0] + r * 0.9, h[1] + r * 0.55]], 0.7, S.ink);
      s += D.line([[h[0] - r * 1.8, h[1] + r * 0.45], [h[0], h[1] + r * 0.6], [h[0] + r * 1.6, h[1] + r * 0.4]], 0.8, S.ink);
    } else if (pose.hat === 'cap') {
      s += D.line([[h[0] - r * 1.0, h[1] + r * 0.5], [h[0], h[1] + r * 1.25], [h[0] + r * 1.0, h[1] + r * 0.5]], 0.7, S.ink);
      s += D.line([[h[0] + r * 0.8, h[1] + r * 0.5], [h[0] + r * 2.0, h[1] + r * 0.35]], 0.7, S.ink);
    } else if (pose.hat === 'scarf') {
      // headscarf: arc over crown and a tail at the back
      s += D.line([[h[0] - r * 1.05, h[1] - r * 0.2], [h[0] - r * 0.9, h[1] + r * 0.9], [h[0], h[1] + r * 1.3], [h[0] + r * 0.9, h[1] + r * 0.9], [h[0] + r * 1.05, h[1] - r * 0.3]], 0.75, S.ink);
      s += D.line([[h[0] + r * 1.0, h[1] - r * 0.3], [h[0] + r * 1.6, h[1] - r * 1.6]], 0.6, S.inkSoft);
    } else if (pose.hat === 'bonnet') {
      s += D.line([[h[0] - r * 1.1, h[1] + r * 0.2], [h[0] - r * 0.6, h[1] + r * 1.3], [h[0] + r * 0.6, h[1] + r * 1.3], [h[0] + r * 1.1, h[1] + r * 0.2]], 0.7, S.ink);
    }
    return s;
  }

  // standard standing proportions (22 tall), offset by ox
  function standPose(ox, o) {
    o = o || {};
    return {
      head: [ox + 0.0, 20.3], neck: [ox, 18.0],
      shL: [ox - 2.1, 17.2], shR: [ox + 2.1, 17.2],
      hipL: [ox - 1.4, 10.6], hipR: [ox + 1.5, 10.6],
      elL: [ox - 2.6, 13.4], haL: [ox - 2.2, 9.6],
      elR: [ox + 2.7, 13.4], haR: [ox + 2.4, 9.6],
      knL: [ox - 1.2, 5.4], ftL: [ox - 1.6, 0.2],
      knR: [ox + 1.6, 5.4], ftR: [ox + 1.9, 0.2],
      hat: o.hat,
    };
  }

  function wrap(ctx, x, y, k, opts, body) {
    const flip = !!(opts && opts.flip);
    const T = makeT(x, y, k, flip);
    const D = makeDraw(ctx, T, k, 0.28);
    return '<g>' + body(D, T) + '</g>';
  }

  // ---- motifs --------------------------------------------------------------
  window.MRI_MOTIFS = Object.assign(window.MRI_MOTIFS || {}, {

    // opts.flip; opts.hat = 'brim'|'cap'|'none' (default brim)
    person(ctx, x, y, k, opts) {
      opts = opts || {};
      return wrap(ctx, x, y, k, opts, (D) => {
        const P = standPose(0, { hat: opts.hat === undefined ? 'brim' : (opts.hat === 'none' ? null : opts.hat) });
        // relaxed contrapposto: weight on the near leg, far leg slightly out, one hand at the hip
        P.hipR = [1.3, 10.8]; P.knR = [2.3, 5.4]; P.ftR = [3.0, 0.2];
        P.elL = [-3.0, 13.6]; P.haL = [-1.5, 10.9];
        P.elR = [3.1, 13.2]; P.haR = [3.6, 9.0];
        P.head = [0.3, 20.3];
        return D.ground(0.5, 4.2) + figure(D, ctx, P);
      });
    },

    // opts.flip; opts.load = 'basket' (on back, default) | 'jar' (on head)
    personCarrying(ctx, x, y, k, opts) {
      opts = opts || {};
      const { S } = ctx;
      return wrap(ctx, x, y, k, opts, (D) => {
        let s = D.ground(0.4, 4.4);
        if (opts.load === 'jar') {
          const P = standPose(0, { hat: 'scarf' });
          // one arm up steadying the jar
          P.elL = [-3.4, 16.8]; P.haL = [-1.6, 22.2];
          P.elR = [2.8, 13.2]; P.haR = [2.3, 9.2];
          P.knL = [-0.8, 5.4]; P.ftL = [-1.2, 0.2];
          P.knR = [1.9, 5.6]; P.ftR = [2.6, 0.2];
          s += figure(D, ctx, P);
          // water jar on the head: rounded body, narrow neck
          s += D.line([[-1.7, 22.3], [-2.2, 23.6], [-1.3, 25.4], [1.3, 25.4], [2.2, 23.6], [1.7, 22.3]], 0.8, S.ink);
          s += D.line([[-1.7, 22.25], [1.7, 22.25]], 0.6, S.ink);
          s += D.line([[-1.2, 25.4], [-1.0, 26.1], [1.0, 26.1], [1.2, 25.4]], 0.6, S.ink);
          s += D.hatch(1.1, 23.0, 1.2, 3, [-0.0, 0.6], 1.4, 0.4, S.inkSoft);
        } else {
          // bent forward under a tall back-basket held by a strap
          const P = {
            head: [-2.6, 19.2], neck: [-1.4, 17.2],
            shL: [-3.2, 16.0], shR: [0.6, 17.1],
            hipL: [-0.2, 10.2], hipR: [2.2, 10.8],
            elL: [-4.3, 13.5], haL: [-4.0, 15.8],   // hand holding the strap at the shoulder
            elR: [1.2, 13.2], haR: [0.8, 9.6],
            knL: [-1.2, 5.2], ftL: [-2.0, 0.2],
            knR: [2.6, 5.3], ftR: [3.4, 0.2],
            hat: 'cap', footDir: -1,
          };
          // basket first (behind the figure)
          s += D.poly([[0.9, 18.6], [5.6, 19.4], [5.0, 10.2], [1.6, 10.0]], 0.8, S.paper);
          // weave: 4 horizontal lines + slanted ticks
          for (let i = 0; i < 4; i++) s += D.line([[1.3 + i * 0.15, 11.9 + i * 1.9], [5.2 - i * 0.1, 12.2 + i * 1.9]], 0.45, S.inkSoft);
          s += D.hatch(2.2, 10.6, 1.0, 4, [0.9, 0.0], 1.2, 0.4, S.inkSoft);
          // hay / load sticking out of the top
          s += D.line([[1.6, 19.0], [2.4, 21.4], [3.6, 20.0], [4.6, 21.6], [5.4, 19.6]], 0.6, S.inkSoft);
          s += figure(D, ctx, P);
          // strap over the near shoulder
          s += D.line([[1.0, 18.3], [-2.6, 16.6], [-4.0, 15.8]], 0.6, S.ink);
        }
        return s;
      });
    },

    // opts.flip (default walks to the right, uphill); opts.slope = rise per unit (default 0.35)
    hikerWithStick(ctx, x, y, k, opts) {
      opts = opts || {};
      const { S } = ctx;
      const sl = opts.slope == null ? 0.35 : opts.slope;
      return wrap(ctx, x, y, k, opts, (D) => {
        let s = '';
        // sloping ground line under the feet (rises to the right)
        s += D.ellipse([0.6, 0.3], 4.2, 0.9, 0, S.shade, null, 0.07);
        s += D.line([[-6.0, -6.0 * sl - 0.2], [-2.5, -2.5 * sl + 0.1], [0.5, 0.5 * sl - 0.1], [3.5, 3.5 * sl + 0.2], [6.5, 6.5 * sl - 0.1]], 0.6, S.inkSoft);
        s += D.ellipse([-3.2, -3.2 * sl + 0.3], 0.5, 0.3, 0.45, S.paper, S.inkSoft);
        s += D.ellipse([5.0, 5.0 * sl + 0.2], 0.4, 0.25, 0.45, S.paper, S.inkSoft);
        // leaning forward into the hill
        const P = {
          head: [2.6, 20.0], neck: [1.6, 17.9],
          shL: [-0.2, 17.0], shR: [3.5, 17.5],
          hipL: [-1.0, 10.6], hipR: [1.8, 10.9],
          elL: [-0.6, 13.6], haL: [2.9, 12.6],        // near hand forward on the stick
          elR: [3.0, 14.0], haR: [1.8, 11.4],
          knL: [0.9, 6.2], ftL: [2.4, 2.4 * sl + 0.1],     // front leg up the slope
          knR: [-1.6, 5.0], ftR: [-3.6, -3.6 * sl + 0.2],  // back leg trailing
          hat: 'brim',
        };
        // pack on the back (behind)
        s += D.poly([[1.4, 17.6], [4.2, 17.0], [4.6, 12.4], [2.2, 12.6]], 0.7, S.paper);
        s += D.line([[2.3, 15.3], [4.4, 14.9]], 0.45, S.inkSoft);
        s += D.hatch(3.4, 12.9, 1.0, 3, [0.0, 0.9], 1.1, 0.4, S.inkSoft);
        s += figure(D, ctx, P);
        // alpenstock: tall, planted ahead
        s += D.line([[4.8, 24.0], [4.4, 4.4 * sl]], 0.9, S.ink);
        s += D.line([[2.9, 12.6], [4.55, 12.7]], 0.6, S.ink);  // hand reaching the stick
        // pack strap
        s += D.line([[1.6, 17.4], [0.0, 14.8]], 0.5, S.inkSoft);
        return s;
      });
    },

    // opts.flip
    womanWithJug(ctx, x, y, k, opts) {
      opts = opts || {};
      const { S } = ctx;
      return wrap(ctx, x, y, k, opts, (D) => {
        let s = D.ground(0.2, 4.2);
        // long skirt instead of legs: a flared shape from hips to ground
        const P = {
          head: [0.2, 20.2], neck: [0.1, 18.0],
          shL: [-2.0, 17.2], shR: [2.1, 17.2],
          hipL: [-1.5, 10.8], hipR: [1.6, 10.8],
          elL: [-3.4, 13.6], haL: [-3.3, 9.6],      // near arm down holding the jug
          elR: [3.3, 13.8], haR: [1.6, 11.6],       // far hand at the hip
          knL: [-1.5, 5.4], ftL: [-1.5, 0.6], knR: [1.6, 5.4], ftR: [1.6, 0.6],
          hat: 'scarf',
        };
        // draw skirt first? No: legs are hidden by the skirt, so draw figure then skirt on top.
        s += figure(D, ctx, P);
        s += D.poly([[-1.6, 11.0], [1.7, 11.0], [3.6, 0.3], [-3.6, 0.3]], 0.75, S.paper);
        // skirt folds
        s += D.line([[-0.6, 10.4], [-1.3, 0.6]], 0.45, S.inkSoft);
        s += D.line([[1.0, 10.2], [1.9, 0.7]], 0.45, S.inkSoft);
        s += D.hatch(2.4, 2.0, 1.6, 4, [0.15, 2.0], 1.35, 0.4, S.inkSoft);
        // apron hem
        s += D.line([[-3.2, 1.4], [0.0, 1.0], [3.2, 1.4]], 0.5, S.inkSoft);
        // jug in near hand: handle at the hand, body below
        s += D.line([[-3.3, 9.6], [-4.3, 9.2], [-4.6, 8.2]], 0.6, S.ink);
        s += D.poly([[-5.4, 8.4], [-3.6, 8.4], [-3.3, 5.2], [-5.8, 5.2]], 0.75, S.paper);
        s += D.line([[-5.7, 8.4], [-5.9, 8.9], [-5.4, 8.9]], 0.6, S.ink); // spout
        s += D.hatch(-3.9, 5.6, 0.9, 3, [0.0, 0.8], 1.3, 0.4, S.inkSoft);
        return s;
      });
    },

    // opts.flip — bent over a short hoe, working the soil; opts.furrows (default 3)
    farmerWithHoe(ctx, x, y, k, opts) {
      opts = opts || {};
      const { S, rand } = ctx;
      return wrap(ctx, x, y, k, opts, (D) => {
        let s = '';
        s += D.ellipse([1.5, 0.2], 5.5, 1.0, 0, S.shade, null, 0.07);
        // furrows: short broken lines of soil to the right where the hoe strikes
        const nf = opts.furrows == null ? 3 : opts.furrows;
        for (let i = 0; i < nf; i++) {
          const yy = -0.3 + i * 0.9 - 1.0;
          s += D.line([[4.0 + i * 0.6, yy], [6.5 + i * 0.5, yy + 0.4], [8.8 + i * 0.3, yy - 0.2]], 0.5, S.moraine);
        }
        for (let i = 0; i < 5; i++) s += D.ellipse([5.0 + rand() * 4.0, -0.3 + rand() * 1.5], 0.3 + rand() * 0.25, 0.2, 0, S.moraine, null, 0.9);
        // ground line
        s += D.line([[-5.5, 0.1], [-2.0, -0.2], [1.5, 0.2], [4.0, 0.0]], 0.6, S.inkSoft);
        // bent figure: torso nearly horizontal, legs braced apart
        const P = {
          head: [5.2, 14.6], neck: [3.8, 14.2],
          shL: [2.6, 12.8], shR: [3.2, 15.8],
          hipL: [-1.4, 10.8], hipR: [-0.6, 12.8],
          elL: [4.2, 9.8], haL: [6.2, 7.6],
          elR: [4.8, 11.6], haR: [7.0, 9.4],
          knL: [-2.4, 5.8], ftL: [-3.2, 0.2],
          knR: [0.8, 6.2], ftR: [1.8, 0.3],
          hat: 'brim', footDir: 1,
        };
        s += figure(D, ctx, P);
        // hoe: handle from the hands down to the blade in the soil
        s += D.line([[7.6, 10.2], [6.4, 7.8], [4.6, 1.6]], 0.9, S.ink);
        s += D.poly([[4.8, 1.9], [7.0, 0.9], [6.6, -0.2], [4.2, 1.0]], 0.7, S.paper);
        return s;
      });
    },

    // opts.flip; opts.animals = 0|1|2 (default 2)
    shepherd(ctx, x, y, k, opts) {
      opts = opts || {};
      const { S, rand } = ctx;
      const na = opts.animals == null ? 2 : opts.animals;
      return wrap(ctx, x, y, k, opts, (D) => {
        let s = D.ground(-0.5, 4.0);
        // sheep: small woolly loops, legs as ticks, head dipping to graze
        const sheep = (sx, sy, sc, graze) => {
          let t = '';
          t += D.ellipse([sx, sy + 0.1], 3.0 * sc, 0.5, 0, S.shade, null, 0.07);
          // woolly back: scalloped path
          const pts = [[sx - 2.6 * sc, sy + 1.0 * sc]];
          for (let i = 0; i < 6; i++) pts.push([sx - 2.6 * sc + (i + 0.5) * 0.87 * sc, sy + (2.6 + (i % 2 ? 0.45 : 0.0) + rand() * 0.3) * sc]);
          pts.push([sx + 2.4 * sc, sy + 1.0 * sc]);
          t += D.line(pts, 0.7, S.ink);
          t += D.line([[sx - 2.6 * sc, sy + 1.0 * sc], [sx - 1.5 * sc, sy + 0.8 * sc], [sx + 0.5 * sc, sy + 0.9 * sc], [sx + 2.4 * sc, sy + 1.0 * sc]], 0.55, S.inkSoft);
          // legs
          t += D.line([[sx - 1.8 * sc, sy + 0.9 * sc], [sx - 2.0 * sc, sy]], 0.6, S.ink);
          t += D.line([[sx - 0.9 * sc, sy + 0.8 * sc], [sx - 1.0 * sc, sy]], 0.6, S.inkSoft);
          t += D.line([[sx + 1.0 * sc, sy + 0.9 * sc], [sx + 1.1 * sc, sy]], 0.6, S.ink);
          t += D.line([[sx + 1.9 * sc, sy + 0.9 * sc], [sx + 2.1 * sc, sy]], 0.6, S.inkSoft);
          // head: grazing (down) or up
          if (graze) t += D.line([[sx + 2.4 * sc, sy + 1.6 * sc], [sx + 3.6 * sc, sy + 0.6 * sc], [sx + 3.4 * sc, sy + 0.1 * sc]], 0.75, S.ink);
          else t += D.line([[sx + 2.4 * sc, sy + 2.2 * sc], [sx + 3.6 * sc, sy + 2.8 * sc], [sx + 4.0 * sc, sy + 2.1 * sc]], 0.75, S.ink);
          t += D.hatch(sx + 0.4 * sc, sy + 1.2 * sc, 0.9 * sc, 3, [0.6 * sc, 0.0], 1.2, 0.4, S.inkSoft);
          return t;
        };
        if (na >= 1) s += sheep(7.6, 0.1, 1.0, true);
        if (na >= 2) s += sheep(-8.6, 0.4, 0.85, false);
        // the shepherd: standing, leaning on the crook, weight on one hip
        const P = standPose(-0.4, { hat: 'brim' });
        P.head = [-0.2, 20.1];
        P.elL = [-3.4, 13.6]; P.haL = [-3.4, 10.6];
        P.elR = [2.8, 14.2]; P.haR = [4.2, 15.6];  // far arm up holding the crook
        P.knR = [2.0, 5.6]; P.ftR = [3.0, 0.2];
        P.knL = [-1.6, 5.4]; P.ftL = [-1.9, 0.2];
        s += figure(D, ctx, P);
        // crook: tall staff with a hooked top
        s += D.line([[4.6, 0.0], [4.6, 21.6], [4.2, 23.4], [3.0, 23.8], [2.4, 22.8]], 0.9, S.ink);
        // cloak hint: a line from the far shoulder down
        s += D.line([[2.0, 17.0], [3.0, 13.0], [2.4, 10.6]], 0.5, S.inkSoft);
        return s;
      });
    },

    // opts.flip; opts.seated (default true). Plein-air painter seen from behind at an easel.
    painterAtEasel(ctx, x, y, k, opts) {
      opts = opts || {};
      const { S, rand } = ctx;
      const seated = opts.seated !== false;
      return wrap(ctx, x, y, k, opts, (D) => {
        let s = '';
        s += D.ellipse([3.0, 0.2], 7.0, 1.1, 0, S.shade, null, 0.07);
        s += D.line([[-5.0, -0.1], [-1.0, 0.2], [3.0, -0.2], [7.0, 0.1], [10.0, -0.2]], 0.6, S.inkSoft);
        s += D.ellipse([-3.8, 0.25], 0.45, 0.3, 0.45, S.paper, S.inkSoft);
        // easel: three legs, canvas board, slightly turned
        const ex = 7.2;
        s += D.line([[ex - 2.2, 0.2], [ex - 0.4, 15.0]], 0.8, S.ink);
        s += D.line([[ex + 2.4, 0.2], [ex + 0.6, 15.0]], 0.8, S.ink);
        s += D.line([[ex + 1.2, 0.3], [ex - 0.2, 9.0]], 0.6, S.inkSoft); // back leg
        s += D.line([[ex - 1.7, 8.2], [ex + 1.9, 8.2]], 0.6, S.ink);      // tray
        // canvas: knocked out paper, with a faint sketch of a mountain on it
        s += D.poly([[ex - 3.2, 8.4], [ex + 3.0, 8.4], [ex + 2.8, 16.0], [ex - 3.4, 16.0]], 0.8, S.paperHigh);
        s += D.line([[ex - 2.6, 10.6], [ex - 1.2, 13.4], [ex - 0.2, 12.2], [ex + 1.4, 14.6], [ex + 2.4, 12.6]], 0.5, S.inkSoft);
        s += D.line([[ex - 2.6, 10.4], [ex + 2.3, 10.7]], 0.4, S.inkSoft);
        // the painter, back to us, at the left of the easel
        let P;
        if (seated) {
          // folding stool
          s += D.line([[-1.6, 0.2], [0.6, 7.2]], 0.7, S.ink);
          s += D.line([[2.4, 0.2], [-0.4, 7.2]], 0.7, S.ink);
          s += D.line([[-1.2, 7.4], [2.0, 7.4]], 0.8, S.ink);
          P = {
            head: [1.2, 19.0], neck: [0.9, 16.8],
            shL: [-1.4, 15.8], shR: [3.0, 16.2],
            hipL: [-1.2, 8.0], hipR: [2.0, 8.0],
            elL: [-2.6, 12.0], haL: [-1.0, 10.4],        // near hand holding the palette
            elR: [4.6, 13.4], haR: [6.0, 12.6],          // far hand with brush reaching the canvas
            knL: [-3.6, 6.4], ftL: [-3.2, 0.2],
            knR: [4.2, 5.6], ftR: [4.6, 0.2],
            hat: 'brim', footDir: 1,
          };
        } else {
          P = standPose(0.4, { hat: 'brim' });
          P.head = [1.0, 20.4]; P.neck = [0.6, 18.2];
          P.elL = [-2.4, 13.6]; P.haL = [-1.0, 11.2];
          P.elR = [3.6, 14.8]; P.haR = [5.6, 13.0];
          P.knR = [2.2, 5.4]; P.ftR = [3.0, 0.2];
        }
        s += figure(D, ctx, P);
        // palette in the near hand (a rounded plate with a thumb hole) and a brush in the far hand
        const py = seated ? 10.4 : 11.2;
        s += D.line([[-1.4, py - 0.2], [-3.2, py + 0.6], [-4.0, py - 0.6], [-2.4, py - 1.6], [-0.8, py - 0.8]], 0.6, S.ink);
        for (let i = 0; i < 3; i++) s += D.ellipse([-3.0 + rand() * 1.6, py - 1.0 + rand() * 1.2], 0.25, 0.2, 0, i === 1 ? S.red : S.inkSoft, null, 0.85);
        const hy = seated ? 12.6 : 13.0;
        s += D.line([[6.0, hy], [ex - 1.6, hy + 0.3]], 0.6, S.ink);
        return s;
      });
    },

    // opts.flip — two roped climbers ascending a slope to the right; opts.slope (default 0.55)
    climbersRoped(ctx, x, y, k, opts) {
      opts = opts || {};
      const { S, rand } = ctx;
      const sl = opts.slope == null ? 0.55 : opts.slope;
      return wrap(ctx, x, y, k, opts, (D) => {
        let s = '';
        const g = xx => xx * sl;   // slope height at x
        // snow slope: a long rising line with a few crevasse dashes
        s += D.line([[-14.0, g(-14.0) - 0.3], [-8.0, g(-8.0) + 0.2], [-2.0, g(-2.0) - 0.2], [4.0, g(4.0) + 0.2], [10.0, g(10.0) - 0.1], [15.0, g(15.0) + 0.2]], 0.7, S.inkSoft);
        for (let i = 0; i < 4; i++) { const xx = -12 + rand() * 26; s += D.line([[xx, g(xx) - 0.9], [xx + 1.5, g(xx) - 1.2 + rand() * 0.4]], 0.45, S.iceLine); }
        // climber pose builder, standing on the slope at base x = bx
        const climber = (bx, lead) => {
          const b = g(bx);
          const P = {
            head: [bx + 2.2, b + 19.6], neck: [bx + 1.3, b + 17.6],
            shL: [bx - 0.5, b + 16.8], shR: [bx + 3.1, b + 17.3],
            hipL: [bx - 1.0, b + 10.6], hipR: [bx + 1.8, b + 10.9],
            elL: [bx - 0.2, b + 13.4], haL: [bx + 2.6, b + 12.0],
            elR: [bx + 3.4, b + 14.2], haR: [bx + 4.6, b + 16.0],
            knL: [bx + 1.2, b + 6.0], ftL: [bx + 2.6, g(bx + 2.6) + 0.1],
            knR: [bx - 1.4, b + 5.0], ftR: [bx - 2.6, g(bx - 2.6) + 0.2],
            hat: 'cap',
          };
          let t = D.ellipse([bx, b + 0.3], 3.6, 0.8, 0, S.shade, null, 0.07);
          // small pack
          t += D.poly([[bx + 1.2, b + 17.4], [bx + 3.8, b + 16.6], [bx + 4.0, b + 12.8], [bx + 2.0, b + 13.2]], 0.65, S.paper);
          t += D.hatch(bx + 3.0, b + 13.3, 0.8, 3, [0.0, 0.9], 1.1, 0.4, S.inkSoft);
          t += figure(D, ctx, P);
          if (lead) {
            // ice axe held high in the far hand, pick forward
            t += D.line([[bx + 4.6, b + 16.2], [bx + 6.2, b + 20.4]], 0.85, S.ink);
            t += D.line([[bx + 5.3, b + 20.8], [bx + 6.2, b + 20.4], [bx + 7.2, b + 19.6]], 0.8, S.ink);
          } else {
            // second: axe planted in the slope as a stick
            t += D.line([[bx + 4.5, g(bx + 4.5)], [bx + 5.2, b + 13.0]], 0.85, S.ink);
            t += D.line([[bx + 4.4, b + 13.4], [bx + 6.0, b + 12.8]], 0.7, S.ink);
            t += D.line([[bx + 2.6, b + 12.0], [bx + 4.9, b + 12.9]], 0.6, S.ink);
          }
          return t;
        };
        s += climber(-8.5, false);
        s += climber(5.5, true);
        // the rope: sagging curve between the two waists
        const a = [-8.5 + 1.8, g(-8.5) + 11.2], c = [5.5 - 1.0, g(5.5) + 11.0];
        const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 - 2.6];
        s += D.line([a, mid, c], 0.6, S.ink);
        // rope tail trailing behind the second
        s += D.line([[-8.5 - 1.0, g(-8.5) + 10.8], [-8.5 - 3.2, g(-8.5) + 9.0], [-8.5 - 4.8, g(-8.5) + 8.0]], 0.5, S.inkSoft);
        return s;
      });
    },

    // opts.n = 4..6 figures (default 5); opts.flip. Ring seen from slightly above.
    groupInCircle(ctx, x, y, k, opts) {
      opts = opts || {};
      const { S, rand } = ctx;
      const n = Math.max(4, Math.min(6, opts.n == null ? 5 : opts.n));
      return wrap(ctx, x, y, k, opts, (D) => {
        let s = '';
        const RX = 11.0, RY = 4.4;     // ring ellipse (foreshortened)
        s += D.ellipse([0, 0.2], RX + 3.0, RY + 1.2, 0, S.shade, null, 0.035);
        // faint trodden ring + a few stones
        s += D.line([[-RX - 1, 0.4], [-4.0, -RY + 0.2], [4.0, -RY - 0.2], [RX + 1, 0.6]], 0.45, S.inkSoft);
        for (let i = 0; i < 3; i++) s += D.ellipse([(rand() - 0.5) * 20, -RY + rand() * 3], 0.35, 0.22, 0.4, S.paper, S.inkSoft);
        // figures sorted back-to-front (larger y first) so nearer ones overlap
        const figs = [];
        for (let i = 0; i < n; i++) {
          const a = Math.PI / 2 + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.3;   // start at the back
          const cx = Math.cos(a) * RX, cy = Math.sin(a) * RY;       // cy>0 = far side
          figs.push({ cx, cy, a });
        }
        figs.sort((p, q) => q.cy - p.cy);
        figs.forEach((f, i) => {
          const sc = 0.78 + (RY - f.cy) / (2 * RY) * 0.22;  // far figures a touch smaller
          const ox = f.cx, oy = f.cy;
          // everyone faces the centre: arms folded / hands joined, slight lean-in
          const lean = -f.cx * 0.02;
          const P = {
            head: [ox + lean * 18, oy + 20.0 * sc], neck: [ox + lean * 16, oy + 17.8 * sc],
            shL: [ox - 2.0 * sc + lean * 15, oy + 17.0 * sc], shR: [ox + 2.0 * sc + lean * 15, oy + 17.0 * sc],
            hipL: [ox - 1.4 * sc, oy + 10.6 * sc], hipR: [ox + 1.4 * sc, oy + 10.6 * sc],
            elL: [ox - 2.8 * sc, oy + 13.6 * sc], haL: [ox + 0.6 * sc, oy + 12.4 * sc],
            elR: [ox + 2.8 * sc, oy + 13.4 * sc], haR: [ox - 0.6 * sc, oy + 12.0 * sc],
            knL: [ox - 1.3 * sc, oy + 5.4 * sc], ftL: [ox - 1.6 * sc, oy + 0.2],
            knR: [ox + 1.4 * sc, oy + 5.4 * sc], ftR: [ox + 1.8 * sc, oy + 0.2],
            hat: ['brim', 'cap', 'scarf', null, 'brim', 'bonnet'][i % 6],
            headR: 1.6 * sc,
            footDir: f.cx < 0 ? 1 : -1,
          };
          // far figures: show the back (no hatch difference needed), near figures: hidden hands
          s += D.ellipse([ox + 0.5, oy + 0.1], 2.6 * sc, 0.6, 0, S.shade, null, 0.06);
          s += figure(D, ctx, P);
        });
        return s;
      });
    },

    // opts.flip — a child and an elder walking hand in hand (elder with a stick)
    childAndElder(ctx, x, y, k, opts) {
      opts = opts || {};
      const { S } = ctx;
      return wrap(ctx, x, y, k, opts, (D) => {
        let s = D.ground(0.5, 6.0, { stones: 3 });
        // elder: slightly stooped, stick in the far hand, near hand down to the child
        const E = {
          head: [-2.2, 19.2], neck: [-2.6, 17.2],
          shL: [-4.4, 16.4], shR: [-0.6, 16.8],
          hipL: [-3.8, 10.4], hipR: [-1.2, 10.6],
          elL: [-5.6, 13.0], haL: [-7.4, 10.0],     // far (stick) hand — drawn as near arm for visibility
          elR: [0.4, 13.2], haR: [1.6, 9.2],        // hand reaching the child
          knL: [-3.4, 5.4], ftL: [-4.0, 0.2],
          knR: [-0.8, 5.6], ftR: [0.2, 0.2],
          hat: 'brim',
        };
        s += figure(D, ctx, E);
        // walking stick from far hand to ground
        s += D.line([[-7.4, 10.2], [-8.0, 0.2]], 0.85, S.ink);
        // shawl line across the elder's back
        s += D.line([[-4.2, 16.2], [-4.8, 12.4]], 0.5, S.inkSoft);
        // child: ~13 units tall, proportionally big head, arm raised to the elder's hand
        const c = 0.6, ox = 4.0;
        const C = {
          head: [ox + 0.2, 11.8], neck: [ox, 10.2], headR: 1.5,
          shL: [ox - 1.4 * c - 0.2, 9.6], shR: [ox + 1.6 * c + 0.2, 9.6],
          hipL: [ox - 1.1, 5.6], hipR: [ox + 1.1, 5.6],
          elL: [ox - 2.2, 7.8], haL: [ox - 2.6, 9.0],      // arm up to the elder's hand
          elR: [ox + 2.0, 7.6], haR: [ox + 2.4, 5.6],
          knL: [ox - 1.6, 2.8], ftL: [ox - 2.2, 0.2],
          knR: [ox + 1.4, 2.8], ftR: [ox + 2.0, 0.2],
          hat: 'cap',
        };
        s += figure(D, ctx, C);
        // joined hands: a short bridge between the two
        s += D.line([[1.6, 9.2], [ox - 2.6, 9.0]], 0.85, S.ink);
        return s;
      });
    },
  });
})();
