/* ---------------------------------------------------------------------------
   Mountain globe - a slowly rotating orthographic globe with coastlines and
   the USGS Global Mountain Explorer mountain areas.

   Two stacked canvases:
   - WebGL: the ocean and the mountain texture (globe-mountains.png, an
     equirectangular mask) wrapped onto the sphere in a fragment shader;
   - 2D: the coastlines (globe-data.js) projected in plain JS on top, crisp.
   Both turn the globe the same way (longitude, then tilt), so they stay aligned.

   Data: window.MRI_GLOBE_DATA (build_globe_data.py) · words: window.MRI_GLOBE_CONTENT
   No dependencies.                MRIGlobe.mount(element, { texture: 'path/to.png' })
   Turns on its own, can be dragged, pauses off screen or in a hidden tab, and
   stays still for readers who prefer reduced motion.
--------------------------------------------------------------------------- */
(function () {
  'use strict';

  const PAD = 2;   // px between the globe and its canvas edge

  const VERT = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  const FRAG = [
    'precision highp float;',
    'uniform sampler2D tex;',
    'uniform vec2 center; uniform float radius;',
    'uniform float lon0, tilt;',                       // radians
    'uniform vec3 ocean, mountain; uniform float limb;',
    'const float PI = 3.14159265358979;',
    'void main(){',
    '  vec2 p = (gl_FragCoord.xy - center) / radius;',
    '  float r = length(p);',
    '  float aa = clamp((1.0 - r) * radius, 0.0, 1.0);',   // anti-aliased rim
    '  if (aa <= 0.0) discard;',
    '  float zv = sqrt(max(0.0, 1.0 - r * r));',
    // undo the turn (longitude lon0, then tilt): view frame (X,Y,Z) -> geographic
    '  float c = cos(tilt), s = sin(tilt);',
    '  float X = zv, Y = p.x, Z = p.y;',
    '  float x = c * X + s * Z, z = -s * X + c * Z;',
    '  float lam = atan(Y, x) + lon0, phi = asin(clamp(z, -1.0, 1.0));',
    '  vec2 uv = vec2(lam / (2.0 * PI) + 0.5, 0.5 - phi / PI);',
    '  float m = texture2D(tex, uv).r;',
    '  vec3 col = mix(ocean, mountain, m);',
    '  col *= 1.0 - limb * pow(1.0 - zv, 1.6);',          // darken towards the rim for depth
    '  gl_FragColor = vec4(col * aa, aa);',
    '}'
  ].join('\n');

  function rgb(css) {                                     // any CSS colour -> [r,g,b] in 0..1
    const c = document.createElement('canvas').getContext('2d');
    c.fillStyle = '#000'; c.fillStyle = css; c.fillRect(0, 0, 1, 1);
    const d = c.getImageData(0, 0, 1, 1).data;
    return [d[0] / 255, d[1] / 255, d[2] / 255];
  }

  function mount(root, opts) {
    opts = opts || {};
    const D = opts.data || window.MRI_GLOBE_DATA;
    const C = opts.content || window.MRI_GLOBE_CONTENT;

    // ---- skeleton ------------------------------------------------------------
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'mtg';
    root.appendChild(wrap);
    const stage = document.createElement('div');
    stage.className = 'mtg-stage';
    stage.setAttribute('role', 'img');
    stage.setAttribute('aria-label', C.label);
    wrap.appendChild(stage);
    const glc = document.createElement('canvas');
    const lines = document.createElement('canvas');
    stage.appendChild(glc);
    stage.appendChild(lines);
    const key = document.createElement('div');
    key.className = 'mtg-key';
    const sw = document.createElement('span');
    sw.className = 'mtg-swatch';
    const kt = document.createElement('span');
    const kb = document.createElement('b');
    kb.textContent = C.legend;
    kt.appendChild(kb);
    if (C.legendNote) kt.appendChild(document.createTextNode(' · ' + C.legendNote));
    key.appendChild(sw);
    key.appendChild(kt);
    wrap.appendChild(key);
    if (C.source) {
      const src = document.createElement('div');
      src.className = 'mtg-source';
      src.textContent = C.source;
      wrap.appendChild(src);
    }

    const ctx = lines.getContext('2d');
    const coast = D.coast.type === 'LineString' ? [D.coast.coordinates] : D.coast.coordinates;
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let size = 0, dpr = 1, lon = C.start, colors = {}, texReady = false;

    // ---- WebGL layer ---------------------------------------------------------
    const gl = glc.getContext('webgl', { premultipliedAlpha: true, antialias: false });
    let prog, loc = {}, tex;
    if (gl) {
      const sh = (type, txt) => { const s = gl.createShader(type); gl.shaderSource(s, txt); gl.compileShader(s); return s; };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const a = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(a);
      gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
      ['tex', 'center', 'radius', 'lon0', 'tilt', 'ocean', 'mountain', 'limb']
        .forEach(n => { loc[n] = gl.getUniformLocation(prog, n); });
      tex = gl.createTexture();
    }
    const img = new Image();
    img.onload = () => {
      if (gl) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);           // wraps across 180 degrees
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      }
      texReady = true;
      draw();
    };
    img.src = opts.texture || D.texture;

    function readColors() {                       // colours come from CSS tokens, so the theme switch follows
      const cs = getComputedStyle(wrap);
      const v = n => cs.getPropertyValue(n).trim();
      colors = { ocean: rgb(v('--mtg-sphere')), mountain: rgb(v('--mtg-mountain')),
                 limb: parseFloat(v('--mtg-limb')) || 0, coast: v('--mtg-coast'), outline: v('--mtg-outline') };
    }

    function resize() {
      const w = Math.min(root.clientWidth || 0, C.maxSize);
      if (!w || w === size) return;
      size = w;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      [glc, lines].forEach(c => {
        c.width = Math.round(w * dpr); c.height = Math.round(w * dpr);
        c.style.width = w + 'px'; c.style.height = w + 'px';
      });
      stage.style.width = w + 'px'; stage.style.height = w + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }

    function drawSphereGL() {
      gl.viewport(0, 0, glc.width, glc.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1i(loc.tex, 0);
      gl.uniform2f(loc.center, glc.width / 2, glc.height / 2);
      gl.uniform1f(loc.radius, (size / 2 - PAD) * dpr);
      gl.uniform1f(loc.lon0, lon * Math.PI / 180);
      gl.uniform1f(loc.tilt, C.tilt * Math.PI / 180);
      gl.uniform3fv(loc.ocean, colors.ocean);
      gl.uniform3fv(loc.mountain, colors.mountain);
      gl.uniform1f(loc.limb, colors.limb);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    let fallback = null;                          // no WebGL: one still frame, same maths in JS
    function drawSphere2D() {
      if (!fallback) {
        const t = document.createElement('canvas');
        t.width = img.width; t.height = img.height;
        const tc = t.getContext('2d');
        tc.drawImage(img, 0, 0);
        fallback = tc.getImageData(0, 0, t.width, t.height);
      }
      const c2 = glc.getContext('2d');
      const W = glc.width, R = (size / 2 - PAD) * dpr, out = c2.createImageData(W, W);
      const ct = Math.cos(C.tilt * Math.PI / 180), st = Math.sin(C.tilt * Math.PI / 180), l0 = lon * Math.PI / 180;
      for (let j = 0; j < W; j++) for (let i = 0; i < W; i++) {
        const px = (i + 0.5 - W / 2) / R, py = (W / 2 - j - 0.5) / R, r2 = px * px + py * py;
        if (r2 > 1) continue;
        const zv = Math.sqrt(1 - r2), x = ct * zv + st * py, z = -st * zv + ct * py;
        const lam = Math.atan2(px, x) + l0, phi = Math.asin(Math.max(-1, Math.min(1, z)));
        const u = ((lam / (2 * Math.PI) + 0.5) % 1 + 1) % 1, v = 0.5 - phi / Math.PI;
        const m = fallback.data[4 * (Math.min(fallback.height - 1, Math.floor(v * fallback.height)) * fallback.width +
                                     Math.floor(u * fallback.width))] / 255;
        const k = 1 - colors.limb * Math.pow(1 - zv, 1.6), o = 4 * (j * W + i);
        for (let b = 0; b < 3; b++) out.data[o + b] = 255 * k * (colors.ocean[b] * (1 - m) + colors.mountain[b] * m);
        out.data[o + 3] = 255;
      }
      c2.putImageData(out, 0, 0);
    }

    // Coastlines: orthographic projection with the shader's turn run forwards.
    // A point is seen when it faces the viewer (X > 0); where a line runs over
    // the rim it is cut at the rim, so nothing from the far side shows through.
    function drawCoast() {
      const R = size / 2 - PAD, cx = size / 2, cy = size / 2;
      const l0 = lon * Math.PI / 180, t = C.tilt * Math.PI / 180, ct = Math.cos(t), st = Math.sin(t);
      const turn = p => {                          // [lon, lat] in degrees -> [X towards viewer, Y right, Z up]
        const lam = p[0] * Math.PI / 180 - l0, phi = p[1] * Math.PI / 180, cp = Math.cos(phi);
        const x = cp * Math.cos(lam), z = Math.sin(phi);
        return [ct * x - st * z, cp * Math.sin(lam), st * x + ct * z];
      };
      const rim = (a, b) => {                      // where the chord a-b crosses X = 0, pushed out to the rim
        const k = a[0] / (a[0] - b[0]), y = a[1] + k * (b[1] - a[1]), z = a[2] + k * (b[2] - a[2]);
        const n = Math.hypot(y, z) || 1;
        return [y / n, z / n];
      };
      const to = (y, z, move) => (move ? ctx.moveTo : ctx.lineTo).call(ctx, cx + R * y, cy - R * z);
      ctx.beginPath();
      coast.forEach(line => {
        let prev = null, pen = false;
        line.forEach(pt => {
          const q = turn(pt);
          if (q[0] > 0) {
            if (pen) to(q[1], q[2]);
            else {
              if (prev) { const e = rim(prev, q); to(e[0], e[1], true); to(q[1], q[2]); }
              else to(q[1], q[2], true);
              pen = true;
            }
          } else if (pen) {
            const e = rim(prev, q); to(e[0], e[1]); pen = false;
          }
          prev = q;
        });
      });
      ctx.lineWidth = 0.6; ctx.strokeStyle = colors.coast; ctx.stroke();      // adjust coastline weight here
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI);
      ctx.lineWidth = 1; ctx.strokeStyle = colors.outline; ctx.stroke();       // adjust rim weight here
    }

    function draw() {
      if (!size || !texReady) return;
      if (gl) drawSphereGL(); else drawSphere2D();
      ctx.clearRect(0, 0, size, size);
      drawCoast();
    }

    // ---- motion ---------------------------------------------------------------
    const still = reduce || !gl;
    let last = 0, raf = 0, visible = true, dragging = false, resumeAt = 0;
    function tick(t) {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min(t - last, 100) : 0;
      last = t;
      if (!dragging && t >= resumeAt) { lon = (lon + C.speed * dt / 1000) % 360; draw(); }
    }
    function start() { if (!still && !raf && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } }
    function stop() { cancelAnimationFrame(raf); raf = 0; }
    new IntersectionObserver(es => { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(stage);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

    // drag to turn (longitude only, so the tilt stays readable)
    let x0 = 0, lon0 = 0;
    lines.addEventListener('pointerdown', e => {
      dragging = true; x0 = e.clientX; lon0 = lon;
      lines.setPointerCapture(e.pointerId); stage.classList.add('is-dragging');
    });
    lines.addEventListener('pointermove', e => {
      if (!dragging) return;
      lon = lon0 - (e.clientX - x0) * 180 / size;
      if (!still || gl) draw();
    });
    const release = () => {
      if (!dragging) return;
      dragging = false; stage.classList.remove('is-dragging');
      resumeAt = performance.now() + C.resumeAfter;
      if (!gl) draw();
    };
    lines.addEventListener('pointerup', release);
    lines.addEventListener('pointercancel', release);

    new MutationObserver(() => { readColors(); draw(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    // resize in the next frame: sizing the stage changes the root's height, and
    // doing that inside the observer's callback trips a "ResizeObserver loop" error
    new ResizeObserver(() => requestAnimationFrame(resize)).observe(root);
    readColors();
    resize();
    start();
    return { draw, stop, start, get lon() { return lon; }, set lon(v) { lon = v; draw(); } };
  }

  window.MRIGlobe = { mount };
})();
