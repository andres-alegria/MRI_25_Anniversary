// MRI survey-plate motifs — group: INSTRUMENTS AND SCIENCE
// Ink-on-paper register: open strokes, hairlines, hand jitter via ctx.rand().
// All colours come from ctx.S (palette keys only). No text output.
(function () {
  const N = v => (+v).toFixed(1);

  // Shared helpers -----------------------------------------------------------
  function mk(ctx, x, y, k, opts) {
    const { S, rand, MIX } = ctx;
    const flip = opts && opts.flip ? -1 : 1;
    const j = a => (rand() - 0.5) * a * k;           // jitter of amplitude a (plate units at k=1)
    const X = dx => N(x + dx * k * flip);
    const Y = dy => N(y + dy * k);
    const W = w => N(w * k);                          // stroke width scaled softly
    const sw = w => N(Math.max(0.45, w * Math.pow(k, 0.5)));
    const base = `stroke-linecap="round" stroke-linejoin="round" fill="none"`;
    // polyline with jitter at every vertex
    const pl = (pts, col, w, jit, extra) => {
      const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0] + (rand() - 0.5) * (jit || 0)) + ' ' + Y(p[1] + (rand() - 0.5) * (jit || 0))).join('');
      return `<path d="${d}" stroke="${col}" stroke-width="${sw(w)}" ${base} ${extra || ''}/>`;
    };
    const line = (x1, y1, x2, y2, col, w, jit) => pl([[x1, y1], [x2, y2]], col, w, jit);
    const circ = (cx, cy, r, col, w, fill) => `<circle cx="${X(cx)}" cy="${Y(cy)}" r="${N(r * k)}" stroke="${col}" stroke-width="${sw(w)}" fill="${fill || 'none'}"/>`;
    const poly = (pts, col, w, fill, jit, extra) => {
      const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0] + (rand() - 0.5) * (jit || 0)) + ' ' + Y(p[1] + (rand() - 0.5) * (jit || 0))).join('') + 'Z';
      return `<path d="${d}" stroke="${col}" stroke-width="${sw(w)}" fill="${fill || 'none'}" stroke-linejoin="round" ${extra || ''}/>`;
    };
    // broken ground line + a couple of stones, centred at (0,0)
    const ground = (half, stones) => {
      let s = '';
      const segs = 2 + Math.floor(rand() * 2);
      let cur = -half + rand() * 2;
      for (let i = 0; i < segs; i++) {
        const len = (half * 2) / segs * (0.55 + rand() * 0.3);
        s += line(cur, j(0.6), cur + len, j(0.6), S.inkSoft, 0.55);
        cur += len + 1.2 + rand() * 1.5;
      }
      for (let i = 0; i < (stones || 0); i++) {
        const sx = -half + rand() * half * 2, sy = 0.4 + rand() * 1.2, r = 0.6 + rand() * 0.6;
        s += `<path d="M${X(sx - r)} ${Y(sy)} q${N(r * k)} ${N(-r * 1.3 * k)} ${N(r * 2 * k)} 0" stroke="${S.inkSoft}" stroke-width="${sw(0.5)}" ${base}/>`;
      }
      return s;
    };
    // hatching inside a rectangle region (x0,y0,x1,y1), diagonal, spacing sp
    const hatch = (x0, y0, x1, y1, sp, col, w) => {
      let s = '';
      for (let t = y0 - (x1 - x0); t < y1; t += sp) {
        const ax = x0, ay = t + (x1 - x0) * 0; // 45° lines from left edge
        let p1x = x0, p1y = t, p2x = x1, p2y = t + (x1 - x0);
        // clip to rect vertically
        if (p1y < y0) { p1x += (y0 - p1y); p1y = y0; }
        if (p2y > y1) { p2x -= (p2y - y1); p2y = y1; }
        if (p2x > p1x + 0.3) s += line(p1x, p1y, p2x, p2y, col, w || 0.45, 0.3);
      }
      return s;
    };
    const shadow = (pts) => poly(pts, 'none', 0, S.shade, 0, 'fill-opacity="0.07"');
    const redDot = (cx, cy, r) => `<circle cx="${X(cx)}" cy="${Y(cy)}" r="${N(r * k)}" fill="${S.red}"/>`;
    return { S, rand, MIX, j, X, Y, W, sw, base, pl, line, circ, poly, ground, hatch, shadow, redDot, flip };
  }
  const wrap = s => `<g>${s}</g>`;

  // Simple standing figure (head, torso, legs) with optional hat; facing +x
  function figure(h, ox, oy, hat) {
    const { S, line, circ, pl, j } = h;
    let s = '';
    s += circ(ox, oy - 19.5, 1.7, S.ink, 0.7);
    s += line(ox, oy - 17.8, ox + j(0.6), oy - 9, S.ink, 0.9);       // torso
    s += pl([[ox, oy - 9], [ox - 1.8, oy - 0.3]], S.ink, 0.8, 0.4);   // legs
    s += pl([[ox, oy - 9], [ox + 2.2, oy - 0.3]], S.ink, 0.8, 0.4);
    if (hat) s += line(ox - 2.2, oy - 21.2, ox + 2.2, oy - 21.4, S.ink, 0.7);
    return s;
  }

  window.MRI_MOTIFS = Object.assign(window.MRI_MOTIFS || {}, {

    // Automatic weather station: mast, booms, cup anemometer, radiation shield, solar panel, guys
    weatherStation(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, circ, pl, poly, ground, j, hatch, redDot, rand } = h;
      let s = '';
      const H = 34;
      // guy wires first (hairline)
      s += line(0, -H + 3, -11, 0.5, S.inkSoft, 0.45);
      s += line(0, -H + 3, 10.5, 0.8, S.inkSoft, 0.45);
      // mast (double line for body)
      s += line(0, 0, 0, -H, S.ink, 1.1, 0.3);
      // base plate / concrete pad
      s += line(-2.5, 0, 2.5, 0, S.ink, 0.8);
      s += line(-2.2, 1.2, 2.2, 1.2, S.inkSoft, 0.5);
      // top boom with anemometer cups
      s += line(0, -H + 1, 9, -H - 1, S.ink, 0.7, 0.3);
      s += line(9, -H - 1, 9, -H - 4.5, S.ink, 0.6);
      const ax = 9, ay = -H - 4.5;
      // crossbar with two cups seen side-on (one open left, one open right)
      s += line(ax - 3.2, ay - 1.2, ax + 3.2, ay - 0.8, S.ink, 0.6);
      s += circ(ax - 3.4, ay - 1.2, 0.9, S.ink, 0.65, S.paper);
      s += circ(ax + 3.4, ay - 0.8, 0.9, S.ink, 0.65, S.paper);
      s += line(ax, ay + 0.2, ax, ay - 1.0, S.ink, 0.55);
      // wind vane on other side
      s += line(0, -H + 4, -7, -H + 3, S.ink, 0.7, 0.3);
      s += pl([[-7, -H + 5.5], [-7, -H + 1], [-9.5, -H + 2]], S.ink, 0.55, 0.2);
      // radiation shield (stack of plates) on a short boom
      s += line(0, -21, 6, -21.3, S.ink, 0.7, 0.2);
      for (let i = 0; i < 4; i++) s += line(4.3, -20.8 + i * 1.1, 7.8, -20.8 + i * 1.1, S.ink, 0.6, 0.2);
      s += line(6, -20.8, 6, -17.2, S.inkSoft, 0.45);
      // solar panel (tilted) on the left
      s += line(0, -14, -3.5, -13.5, S.ink, 0.7);
      const panel = [[-3.5, -17.5], [-9.5, -14.5], [-9.5, -10.5], [-3.5, -13.5]];
      s += poly(panel, S.ink, 0.7, ctx.MIX(S.paper, S.ink, 0.1), 0.2);
      s += line(-6.5, -16, -6.5, -12, S.inkSoft, 0.45);
      s += line(-3.9, -15.5, -9.1, -12.5, S.inkSoft, 0.45);
      // datalogger box at chest height on mast
      s += poly([[0.8, -9], [4.2, -9], [4.2, -4.5], [0.8, -4.5]], S.ink, 0.7, S.paper, 0.2);
      s += hatch(2.6, -9, 4.2, -4.5, 0.9, S.inkSoft, 0.4);
      // guy anchors
      s += line(-11.8, 0.5, -10.2, 0.5, S.ink, 0.7);
      s += line(9.8, 0.8, 11.3, 0.8, S.ink, 0.7);
      s += ground(13, 2);
      return wrap(s);
    },

    // Graduated snow stake (red ticks), half-buried in a snow bank
    snowStake(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, poly, j, redDot, rand } = h;
      let s = '';
      // snow bank: soft mound filled with paperHigh
      const mound = [[-11, 0.5], [-7, -2.2], [-2, -3.6], [3, -3.2], [8, -1.6], [11, 0.5]];
      s += poly(mound, 'none', 0, S.paperHigh, 0.3);
      s += pl(mound, S.inkSoft, 0.6, 0.3);
      s += line(-11, 0.5, 11, 0.5, S.inkSoft, 0.45, 0.4);
      // stake
      s += line(0, -3.4, 0.4, -27, S.ink, 1.1, 0.2);
      s += line(0.4, -27, -0.9, -28.5, S.ink, 0.8);
      // graduations: red ticks every 2.4 units, longer each 5th
      for (let i = 0; i < 10; i++) {
        const yy = -5 - i * 2.4;
        const len = i % 5 === 4 ? 2.4 : 1.3;
        s += line(0.2, yy, 0.2 + len, yy + j(0.1), S.red, i % 5 === 4 ? 0.7 : 0.55);
      }
      // a shadow of the stake cast onto the snow (right side)
      s += line(0.6, -3, 5, -1.2, S.shade, 0.7, 0.2).replace('fill="none"', 'fill="none" opacity="0.18"');
      // small spindrift marks on the mound
      for (let i = 0; i < 3; i++) s += line(-7 + i * 5 + j(1), -1.5 + j(0.8), -5.5 + i * 5 + j(1), -1.8 + j(0.8), S.inkSoft, 0.45);
      return wrap(s);
    },

    // Standard rain gauge: funnel on a cylinder, mounted on a short post
    rainGauge(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, poly, ground, hatch, circ, j } = h;
      let s = '';
      // post
      s += line(0, 0, 0, -7, S.ink, 0.9, 0.2);
      s += line(-1.4, -7, 1.4, -7, S.ink, 0.7);
      // cylinder
      s += poly([[-3.2, -7], [3.2, -7], [3.2, -17], [-3.2, -17]], S.ink, 0.8, S.paper, 0.2);
      s += hatch(1.4, -17, 3.2, -7, 1.1, S.inkSoft, 0.45);
      // band line
      s += line(-3.2, -9.5, 3.2, -9.5, S.inkSoft, 0.45);
      // funnel on top
      s += `<ellipse cx="${h.X(0)}" cy="${h.Y(-22)}" rx="${N(5 * k)}" ry="${N(1.1 * k)}" stroke="${S.ink}" stroke-width="${h.sw(0.7)}" fill="${S.paper}"/>`;
      s += pl([[-5, -22], [-1.3, -17.6]], S.ink, 0.8, 0.2);
      s += pl([[5, -22], [1.3, -17.6]], S.ink, 0.8, 0.2);
      s += line(-1.3, -17.6, 1.3, -17.6, S.ink, 0.6);
      for (let i = 0; i < 3; i++) s += line(1.6 + i * 0.9, -21.2 + i * 0.2, 2.6 + i * 0.7, -19.6 + i * 0.5, S.inkSoft, 0.45, 0.2);
      // rain drops
      for (let i = 0; i < 5; i++) {
        const dx = -4 + i * 2 + j(1), dy = -28 + (i % 2) * 2.5 + j(1.5);
        s += line(dx, dy, dx - 0.4, dy + 1.6, S.water, 0.6);
      }
      // measuring tube glimpse: small tick marks on left of cylinder (red)
      for (let i = 0; i < 4; i++) s += line(-3.2, -10.5 - i * 1.6, -2.2, -10.5 - i * 1.6, S.red, 0.5);
      s += ground(8, 2);
      return wrap(s);
    },

    // Stevenson screen: louvred shelter on four legs
    thermometerPost(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, poly, ground, hatch, j, MIX } = h;
      let s = '';
      // legs (slight splay)
      s += line(-4.5, -9, -5.5, 0, S.ink, 0.8, 0.2);
      s += line(4.5, -9, 5.5, 0, S.ink, 0.8, 0.2);
      s += line(-1.5, -9, -2, 0, S.inkSoft, 0.6, 0.2);
      s += line(1.5, -9, 2, 0, S.inkSoft, 0.6, 0.2);
      s += line(-5, -3, -2, -3, S.inkSoft, 0.5);  // cross brace
      s += line(5, -3, 2, -3, S.inkSoft, 0.5);
      // box body
      s += poly([[-6, -9], [6, -9], [6, -19], [-6, -19]], S.ink, 0.9, S.paper, 0.25);
      // louvres: short slanted lines across the front
      for (let i = 0; i < 6; i++) {
        const yy = -17.8 + i * 1.55;
        s += line(-5.2, yy + j(0.15), 5.2, yy + 0.5 + j(0.15), S.inkSoft, 0.55);
      }
      // door edge
      s += line(0.3, -18.5, 0.3, -9.5, S.ink, 0.5, 0.2);
      // pitched roof, slight overhang, hatching on right slope
      s += poly([[-7.5, -19], [0, -23], [7.5, -19]], S.ink, 0.9, S.paper, 0.3);
      for (let i = 0; i < 4; i++) s += line(1 + i * 1.5, -22.4 + i * 0.8, 1.6 + i * 1.5, -19.4, S.inkSoft, 0.45, 0.2);
      // small shadow on right side of body
      s += poly([[6, -19], [7, -18.5], [7, -9.5], [6, -9]], 'none', 0, S.shade, 0, 'fill-opacity="0.08"');
      s += ground(9, 2);
      return wrap(s);
    },

    // Small tripod drilling rig with a cable and a winch
    boreholeRig(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, ground, j, hatch } = h;
      let s = '';
      const apex = [0, -30];
      // three legs
      s += line(apex[0], apex[1], -11, 0.5, S.ink, 1.0, 0.3);
      s += line(apex[0], apex[1], 11, 0.5, S.ink, 1.0, 0.3);
      s += line(apex[0], apex[1], 3, 1.5, S.inkSoft, 0.7, 0.3);
      // lashing at the apex
      s += circ(0, -29, 1.1, S.ink, 0.7);
      s += line(-1.5, -28, 1.5, -27.5, S.ink, 0.5);
      // sheave / pulley
      s += circ(0, -26.2, 1.3, S.ink, 0.7);
      // cable from pulley to winch on left leg, and down into the hole
      s += line(-1.1, -26.2, -7, -12, S.inkSoft, 0.55, 0.2);
      s += line(0.6, -25.5, 0.5, -2, S.ink, 0.6, 0.25);
      // winch drum
      s += circ(-7.3, -11.5, 1.9, S.ink, 0.7);
      s += circ(-7.3, -11.5, 0.7, S.ink, 0.5);
      s += line(-7.3, -11.5, -10, -13.5, S.ink, 0.6);   // handle
      s += line(-10, -13.5, -10.8, -12.6, S.ink, 0.6);
      // drill head / casing at the base
      s += poly([[-1.6, -2], [2.6, -2], [2.2, 1], [-1.2, 1]], S.ink, 0.8, S.paper, 0.2);
      s += hatch(0.8, -2, 2.6, 1, 0.9, S.inkSoft, 0.4);
      // spoil heap to the right
      s += pl([[3.5, 1], [6, -1.2], [9, -0.2], [11, 1]], S.inkSoft, 0.6, 0.4);
      for (let i = 0; i < 5; i++) s += circ(4.5 + i * 1.3 + j(0.8), -0.1 + j(0.6), 0.3, S.moraine, 0.5);
      s += ground(13, 1);
      return wrap(s);
    },

    // Satellite dish on a mast with feed horn
    satelliteDish(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, ground, hatch, j } = h;
      let s = '';
      // mast & foot
      s += line(0, 0, 0, -12, S.ink, 1.0, 0.2);
      s += line(-2.5, 0, 2.5, 0, S.ink, 0.8);
      s += line(-1.2, -1.2, 1.2, -1.2, S.inkSoft, 0.5);
      // mount bracket
      s += line(0, -12, 2.5, -15, S.ink, 0.8);
      // dish: a tilted ellipse (drawn as path of an ellipse rotated)
      const cx = 3.2, cy = -18.5;
      const rot = h.flip * -35;
      s += `<g transform="rotate(${N(rot)} ${h.X(cx)} ${h.Y(cy)})">`
        + `<ellipse cx="${h.X(cx)}" cy="${h.Y(cy)}" rx="${N(3.2 * k)}" ry="${N(8.5 * k)}" stroke="${S.ink}" stroke-width="${h.sw(0.9)}" fill="${S.paper}"/>`
        + `<ellipse cx="${h.X(cx + 1.1)}" cy="${h.Y(cy)}" rx="${N(1.5 * k)}" ry="${N(7 * k)}" stroke="${S.inkSoft}" stroke-width="${h.sw(0.45)}" fill="none"/>`
        + `</g>`;
      // rim hatching hint on lower-right of dish
      for (let i = 0; i < 4; i++) s += line(4.5 + i * 0.6, -13.5 + i * 0.4, 5.5 + i * 0.6, -15.5 + i * 0.5, S.inkSoft, 0.45, 0.2);
      // feed arm + LNB
      s += line(4.5, -12.5, 11, -21, S.ink, 0.7, 0.2);
      s += circ(11.3, -21.4, 0.9, S.ink, 0.7);
      // signal arcs (hairline)
      for (let i = 0; i < 2; i++) {
        const r = 3.2 + i * 2.4, cx0 = 11.3, cy0 = -21.4;
        const a0 = -110 * Math.PI / 180, a1 = -20 * Math.PI / 180;
        s += `<path d="M${h.X(cx0 + r * Math.cos(a0))} ${h.Y(cy0 + r * Math.sin(a0))} A${N(r * k)} ${N(r * k)} 0 0 ${h.flip > 0 ? 1 : 0} ${h.X(cx0 + r * Math.cos(a1))} ${h.Y(cy0 + r * Math.sin(a1))}" stroke="${S.inkSoft}" stroke-width="${h.sw(0.5)}" ${h.base}/>`;
      }
      s += ground(8, 2);
      return wrap(s);
    },

    // Theodolite on a tripod; opts.surveyor adds a figure peering into it
    theodoliteTripod(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, ground, j, redDot } = h;
      let s = '';
      const top = -17;
      // legs
      s += line(-1.2, top, -7.5, 0.5, S.ink, 0.9, 0.3);
      s += line(1.2, top, 7.5, 0.5, S.ink, 0.9, 0.3);
      s += line(0, top, 1.5, 1.2, S.inkSoft, 0.7, 0.3);
      // head plate
      s += line(-2.6, top, 2.6, top, S.ink, 0.9);
      // plumb bob string
      s += line(0, top, 0, -2, S.inkSoft, 0.45);
      s += pl([[-0.5, -2], [0, -0.5], [0.5, -2]], S.ink, 0.5);
      // instrument: base, standards, telescope
      s += poly([[-2, top], [2, top], [2, top - 2], [-2, top - 2]], S.ink, 0.7, S.paper, 0.15);
      s += circ(0, top - 2.8, 1.6, S.ink, 0.7, S.paper);
      s += line(-1.6, top - 3.2, -1.6, top - 8, S.ink, 0.7);
      s += line(1.6, top - 3.2, 1.6, top - 8, S.ink, 0.7);
      // telescope tube (slightly tilted)
      s += poly([[-4, top - 6.2], [4.5, top - 7.5], [4.5, top - 9.3], [-4, top - 8]], S.ink, 0.8, S.paper, 0.15);
      s += circ(4.6, top - 8.4, 0.9, S.ink, 0.6);
      // sight line (hairline dash to the right)
      s += `<path d="M${h.X(6)} ${h.Y(top - 8.6)} L${h.X(20)} ${h.Y(top - 10.6)}" stroke="${S.red}" stroke-width="${h.sw(0.45)}" ${h.base} stroke-dasharray="${N(1.5 * k)} ${N(1.6 * k)}"/>`;
      if (opts && opts.surveyor) {
        // figure standing behind/left, leaning to the eyepiece
        const ox = -7.5;
        s += circ(ox + 2.6, top - 8.2, 1.7, S.ink, 0.7);                 // head near eyepiece
        s += line(ox + 1.6, top - 6.6, ox - 0.5, top + 3, S.ink, 0.9, 0.3); // leaning torso
        s += pl([[ox - 0.5, top + 3], [ox - 2.5, 0.3]], S.ink, 0.8, 0.3);
        s += pl([[ox - 0.5, top + 3], [ox + 1.8, 0.3]], S.ink, 0.8, 0.3);
        s += pl([[ox + 1, top - 4.5], [ox + 4, top - 3.5], [ox + 5.2, top - 6]], S.ink, 0.7, 0.3); // arm to instrument
        s += line(ox + 0.8, top - 10, ox + 4.6, top - 10.3, S.ink, 0.7);   // hat brim
      }
      s += ground(10, 2);
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

    // Data logger: enclosure on a post with a small whip antenna and a cable
    dataLogger(ctx, x, y, k, opts) {
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, ground, hatch, j } = h;
      let s = '';
      s += line(0, 0, 0.3, -16, S.ink, 1.0, 0.2);
      // enclosure
      s += poly([[-4, -16], [4, -16], [4, -8], [-4, -8]], S.ink, 0.8, S.paper, 0.2);
      s += line(-4, -14, 4, -14, S.inkSoft, 0.5);       // lid line
      s += hatch(2.2, -13.6, 4, -8, 1.0, S.inkSoft, 0.4);
      s += circ(-1.5, -11, 0.5, S.ink, 0.5);            // latch
      // cable running down the post into ground
      s += `<path d="M${h.X(3.5)} ${h.Y(-8.2)} q${N(2 * k)} ${N(2 * k)} ${N(-1.5 * k)} ${N(4.5 * k)} q${N(-1.8 * k)} ${N(1.5 * k)} ${N(-0.5 * k)} ${N(3.8 * k)}" stroke="${S.inkSoft}" stroke-width="${h.sw(0.5)}" ${h.base}/>`;
      // whip antenna with small rings
      s += line(3, -16, 3.6, -25, S.ink, 0.6, 0.2);
      s += line(3.1, -17.5, 4, -17.6, S.ink, 0.5);
      s += circ(3.6, -25.3, 0.5, S.ink, 0.5);
      // side shadow
      s += poly([[4, -16], [4.8, -15.5], [4.8, -8.3], [4, -8]], 'none', 0, S.shade, 0, 'fill-opacity="0.08"');
      s += ground(6, 2);
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
      const h = mk(ctx, x, y, k, opts); const { S, line, pl, circ, poly, j, rand } = h;
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
      // thermometer glyph at the left, standing on the ground
      const tx = -19;
      s += `<path d="M${h.X(tx - 1.2)} ${h.Y(-19)} L${h.X(tx - 1.2)} ${h.Y(-4.5)} a${N(2.1 * k)} ${N(2.1 * k)} 0 1 0 ${N(h.flip * 2.4 * k)} 0 L${h.X(tx + 1.2)} ${h.Y(-19)} a${N(1.2 * k)} ${N(1.2 * k)} 0 0 0 ${N(h.flip * -2.4 * k)} 0 Z" stroke="${S.ink}" stroke-width="${h.sw(0.75)}" fill="${S.paper}" stroke-linejoin="round"/>`;
      s += line(tx, -13, tx, -3, S.red, 0.9);
      s += `<circle cx="${h.X(tx)}" cy="${h.Y(-2.4)}" r="${N(1.3 * k)}" fill="${S.red}"/>`;
      for (let i = 0; i < 5; i++) s += line(tx + 1.4, -16.5 + i * 2.3, tx + 2.4, -16.5 + i * 2.3, S.ink, 0.5);
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
