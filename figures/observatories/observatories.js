/* ---------------------------------------------------------------------------
   Mountain observatories figure
   Canvas dot map of the GEO Mountains In Situ Inventory v3.0 (157k records),
   Robinson, pre-projected and quantized at build time (build_data.py).
   Vanilla JS, no dependencies. Draws synchronously (no rAF loops).

   window.MRIObservatories.mount(el) -> renders the figure into el.
   window.MRIObservatories.caption() -> computed caption string.
--------------------------------------------------------------------------- */
(function () {
  "use strict";

  var D = window.MRI_OBS_DATA;
  var C = window.MRI_OBS_CONTENT;
  var Q = 65535;

  /* ---------- decode ---------- */
  function bytes(b64) {
    var s = atob(b64), a = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
    return a;
  }
  var PX = new Uint16Array(bytes(D.x).buffer);
  var PY = new Uint16Array(bytes(D.y).buffer);
  var PN = bytes(D.net);
  var PB = bytes(D.band);   // elevation band per point (0-13, 14 = not recorded)
  var N = D.n;

  /* per-network index ranges (points were written grouped by network) */
  var nets = D.networks;
  var netStart = new Array(nets.length), netEnd = new Array(nets.length);
  (function () {
    var off = 0;
    for (var i = 0; i < nets.length; i++) { netStart[i] = off; off += nets[i].count; netEnd[i] = off; }
  })();

  var themeTotals = C.themes.map(function () { return 0; });
  nets.forEach(function (nw) { themeTotals[nw.theme] += nw.count; });

  function fmt(n) { return n.toLocaleString("en-US"); }

  /* ---------- caption ---------- */
  function caption() {
    var s = D.stats;
    return C.caption.text
      .replace("{records}", fmt(s.records))
      .replace("{networks}", String(s.networks))
      .replace("{ranges}", String(s.ranges))
      .replace("{countries}", String(s.countries))
      .replace("{openPct}", String(Math.round(100 * s.openYes / s.records)))
      .replace("{v2}", fmt(s.v2Records));
  }

  /* ---------- mount ---------- */
  function mount(root) {
    root.classList.add("mob");

    /* state */
    var theme = null;      // null = all, else theme index
    var isolate = null;    // null or network index (overrides theme)
    var bandSel = new Set();   // selected elevation bands; empty = no elevation filter
    var showRanges = true;
    var k = 1, cx = D.aspect / 2, cy = 0.5;   // zoom and view centre (world units)
    var expandedNets = false;

    /* ----- DOM scaffold ----- */
    root.innerHTML = "";
    var controls = el("div", "mob-controls");
    var mapWrap = el("div", "mob-map");
    var canvas = document.createElement("canvas");
    var zoomBox = el("div", "mob-zoom");
    var note = el("div", "mob-note"); note.hidden = true;
    var tip = el("div", "mob-tip"); tip.hidden = true;
    mapWrap.appendChild(canvas); mapWrap.appendChild(zoomBox); mapWrap.appendChild(note); mapWrap.appendChild(tip);
    var chipNote = el("p", "mob-chipnote");
    chipNote.textContent = C.ui.dupNote;
    root.appendChild(controls); root.appendChild(chipNote); root.appendChild(mapWrap);

    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "World map of " + fmt(D.stats.records) +
      " in situ mountain monitoring records, coloured by observation theme.");

    /* ----- chips ----- */
    var chips = [];
    function addChip(label, count, swatchVar, onClick) {
      var b = el("button", "mob-chip");
      b.type = "button";
      if (swatchVar) {
        var sw = el("span", "mob-swatch");
        sw.style.background = "var(" + swatchVar + ")";
        b.appendChild(sw);
      }
      b.appendChild(document.createTextNode(label + " "));
      if (count != null) { var n = el("span", "n"); n.textContent = fmt(count); b.appendChild(n); }
      b.addEventListener("click", onClick);
      controls.appendChild(b);
      chips.push(b);
      return b;
    }
    /* no count on the All chip: the total counts records, not stations */
    addChip(C.allLabel, null, null, function () { setTheme(null); });
    C.themes.forEach(function (t, i) {
      addChip(t.label, themeTotals[i], "--mob-" + t.id, function () { setTheme(i); });
    });
    /* the GMBA layer toggle lives on the map, styled apart from the filter chips */
    var rangesBtn = el("button", "mob-layer");
    rangesBtn.type = "button";
    rangesBtn.innerHTML = "<span class='sw'></span>" + esc(C.ui.ranges);
    rangesBtn.setAttribute("aria-pressed", "true");
    rangesBtn.addEventListener("click", function () {
      showRanges = !showRanges;
      rangesBtn.setAttribute("aria-pressed", String(showRanges));
      draw();
    });
    mapWrap.appendChild(rangesBtn);

    function syncChips() {
      chips.forEach(function (b, i) {
        var on = isolate == null && ((theme == null && i === 0) || theme === i - 1);
        b.setAttribute("aria-pressed", String(on));
      });
    }

    function refresh() { syncChips(); syncNetRows(); syncNote(); draw(); drawElev(); }

    function setTheme(t) {
      theme = t; isolate = null;
      refresh();
    }

    function setIsolate(netIdx) {
      isolate = isolate === netIdx ? null : netIdx;
      refresh();
    }

    function toggleBand(b) {
      if (bandSel.has(b)) bandSel.delete(b); else bandSel.add(b);
      refresh();
    }

    /* the banner on the map names every active filter beyond the theme chips */
    function syncNote() {
      var parts = [];
      if (isolate != null) parts.push(esc(nets[isolate].name) + " — " + fmt(nets[isolate].count) + " records");
      if (bandSel.size) parts.push(esc(C.ui.elevFilterNote.replace("{n}", String(bandSel.size))));
      if (!parts.length) { note.hidden = true; return; }
      note.innerHTML = parts.join(" · ") + " ";
      var clear = document.createElement("button");
      clear.type = "button"; clear.textContent = "show all";
      clear.addEventListener("click", function () { isolate = null; bandSel.clear(); refresh(); });
      note.appendChild(clear);
      note.hidden = false;
    }

    function bandMask() {
      if (!bandSel.size) return null;
      var m = new Uint8Array(15);
      bandSel.forEach(function (b) { m[b] = 1; });
      return m;
    }

    function netVisible(i) {
      if (isolate != null) return i === isolate;
      if (theme == null) return true;
      return nets[i].theme === theme;
    }

    /* ----- canvas ----- */
    var ctx = canvas.getContext("2d");
    var cw = 0, ch = 0, dpr = 1;

    function colors() {
      var cs = getComputedStyle(root);
      var o = { land: cs.getPropertyValue("--mob-land").trim(),
                gmbaFill: cs.getPropertyValue("--mob-gmba-fill").trim(),
                gmbaLine: cs.getPropertyValue("--mob-gmba-line").trim(),
                sphere: cs.getPropertyValue("--mob-sphere").trim(),
                surface: cs.getPropertyValue("--mob-surface").trim(),
                themes: [] };
      C.themes.forEach(function (t) { o.themes.push(cs.getPropertyValue("--mob-" + t.id).trim()); });
      return o;
    }

    function resize() {
      var w = mapWrap.clientWidth;
      if (!w) return;
      dpr = window.devicePixelRatio || 1;
      cw = w; ch = Math.round(w / D.aspect);
      canvas.style.height = ch + "px";
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      draw();
    }

    /* world units: wx in [0, aspect], wy in [0, 1] */
    function scale() { return (cw / D.aspect) * k * dpr; }
    function sxQ(q) { return ((q / Q) * D.aspect - cx) * scale() + canvas.width / 2; }
    function syQ(q) { return ((q / Q) - cy) * scale() + canvas.height / 2; }

    function ringPath(flat) {
      ctx.moveTo(sxQ(flat[0]), syQ(flat[1]));
      for (var i = 2; i < flat.length; i += 2) ctx.lineTo(sxQ(flat[i]), syQ(flat[i + 1]));
      ctx.closePath();
    }

    /* adjust dot sizes and opacities here (per theme, in CSS pixels) */
    var THEME_ALPHA = [0.50, 0.60, 0.65, 0.70, 0.90, 1.0];
    var THEME_SIZE  = [1.1, 1.2, 1.2, 1.2, 1.5, 3.0];

    function draw() {
      if (!cw) return;
      var col = colors();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      /* sphere + land + ranges */
      ctx.beginPath(); ringPath(D.sphere[0]);
      ctx.fillStyle = col.sphere; ctx.fill();
      ctx.beginPath();
      D.land.forEach(ringPath);
      ctx.fillStyle = col.land; ctx.fill();
      if (showRanges) {
        /* dissolved mountain area: one flat fill, no outlines */
        ctx.beginPath();
        D.gmba.forEach(ringPath);
        ctx.fillStyle = col.gmbaFill; ctx.fill();
      }

      /* points, network by network (already ordered big themes -> small) */
      var sc = scale();
      var mask = bandMask();
      for (var ni = 0; ni < nets.length; ni++) {
        if (!netVisible(ni)) continue;
        var th = nets[ni].theme;
        var size = Math.max(1, Math.round(THEME_SIZE[th] * dpr * (isolate != null ? 1.4 : 1)));
        var half = size / 2;
        ctx.globalAlpha = isolate != null ? 0.9 : THEME_ALPHA[th];
        ctx.fillStyle = col.themes[th];
        var ring = th === 5 && isolate == null;   /* observatories get a ring */
        for (var i = netStart[ni]; i < netEnd[ni]; i++) {
          if (mask && !mask[PB[i]]) continue;
          var x = ((PX[i] / Q) * D.aspect - cx) * sc + canvas.width / 2;
          var y = ((PY[i] / Q) - cy) * sc + canvas.height / 2;
          if (x < -4 || y < -4 || x > canvas.width + 4 || y > canvas.height + 4) continue;
          if (ring) {
            ctx.beginPath(); ctx.arc(x, y, half, 0, 6.2832); ctx.fill();
            ctx.globalAlpha = 1; ctx.strokeStyle = col.surface; ctx.lineWidth = dpr; ctx.stroke();
            ctx.globalAlpha = THEME_ALPHA[th];
          } else {
            ctx.fillRect(x - half, y - half, size, size);
          }
        }
      }
      ctx.globalAlpha = 1;
      zoomBox.classList.toggle("is-zoomed", k > 1.001);
      canvas.classList.toggle("is-pannable", k > 1.001);
    }

    /* ----- zoom & pan ----- */
    function clampView() {
      var m = 0.5 / k;
      cx = Math.min(D.aspect - m * D.aspect, Math.max(m * D.aspect, cx));
      cy = Math.min(1 - m, Math.max(m, cy));
      if (k <= 1.001) { cx = D.aspect / 2; cy = 0.5; }
    }
    function zoomAt(f, px, py) {
      /* keep the world point under (px, py) fixed while zooming */
      var wx = (px * dpr - canvas.width / 2) / scale() + cx;
      var wy = (py * dpr - canvas.height / 2) / scale() + cy;
      k = Math.min(12, Math.max(1, k * f));   /* adjust max zoom here */
      wxToCentre(wx, wy, px, py);
    }
    function wxToCentre(wx, wy, px, py) {
      cx = wx - (px * dpr - canvas.width / 2) / scale();
      cy = wy - (py * dpr - canvas.height / 2) / scale();
      clampView(); draw();
    }
    function zoomBtn(label, title, f) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = label; b.title = title;
      b.addEventListener("click", function () {
        if (f == null) { k = 1; clampView(); draw(); return; }
        zoomAt(f, cw / 2, ch / 2);
      });
      zoomBox.appendChild(b);
      return b;
    }
    zoomBtn("+", C.ui.zoomIn, 1.8);
    zoomBtn("−", C.ui.zoomOut, 1 / 1.8);
    zoomBtn("↺", C.ui.zoomReset, null).className = "reset";

    canvas.addEventListener("dblclick", function (e) {
      var r = canvas.getBoundingClientRect();
      zoomAt(e.shiftKey ? 1 / 1.8 : 1.8, e.clientX - r.left, e.clientY - r.top);
    });

    var panning = null;
    canvas.addEventListener("pointerdown", function (e) {
      if (k <= 1.001) return;
      panning = { x: e.clientX, y: e.clientY, cx: cx, cy: cy };
      canvas.classList.add("is-panning");
      canvas.setPointerCapture(e.pointerId);
      tip.hidden = true;
    });
    canvas.addEventListener("pointermove", function (e) {
      if (panning) {
        cx = panning.cx - (e.clientX - panning.x) * dpr / scale();
        cy = panning.cy - (e.clientY - panning.y) * dpr / scale();
        clampView(); draw();
      } else {
        hover(e);
      }
    });
    function endPan(e) {
      if (!panning) return;
      panning = null;
      canvas.classList.remove("is-panning");
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    canvas.addEventListener("pointerup", endPan);
    canvas.addEventListener("pointercancel", endPan);
    canvas.addEventListener("pointerleave", function () { tip.hidden = true; });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && (isolate != null || bandSel.size)) {
        isolate = null; bandSel.clear(); refresh();
      }
    });

    /* ----- hover tooltip (aggregates records near the pointer) ----- */
    function hover(e) {
      var r = canvas.getBoundingClientRect();
      var mx = (e.clientX - r.left) * dpr, my = (e.clientY - r.top) * dpr;
      var sc = scale();
      var rad = 10 * dpr;                            /* adjust hover radius here */
      var radQ = rad / sc / D.aspect * Q;            /* radius in quantized x units */
      var radQy = rad / sc * Q;
      var qmx = ((mx - canvas.width / 2) / sc + cx) / D.aspect * Q;
      var qmy = ((my - canvas.height / 2) / sc + cy) * Q;
      var byNet = {}, total = 0;
      var mask = bandMask();
      for (var ni = 0; ni < nets.length; ni++) {
        if (!netVisible(ni)) continue;
        var c = 0;
        for (var i = netStart[ni]; i < netEnd[ni]; i++) {
          if (mask && !mask[PB[i]]) continue;
          var dx = (PX[i] - qmx) / radQ, dy = (PY[i] - qmy) / radQy;
          if (dx > 1 || dx < -1 || dy > 1 || dy < -1) continue;
          if (dx * dx + dy * dy <= 1) c++;
        }
        if (c) { byNet[ni] = c; total += c; }
      }
      if (!total) { tip.hidden = true; return; }
      var order = Object.keys(byNet).sort(function (a, b) { return byNet[b] - byNet[a]; });
      var html = "<div class='h'>" + fmt(total) + (total === 1 ? " record" : " records") + "</div>";
      order.slice(0, 4).forEach(function (niStr) {
        var ni = +niStr, t = C.themes[nets[ni].theme];
        html += "<div class='row'><span class='key' style='background:var(--mob-" + t.id + ")'></span>" +
                "<span>" + esc(nets[ni].name) + "</span><b>" + fmt(byNet[ni]) + "</b></div>";
      });
      if (order.length > 4) html += "<div class='more'>+ " + (order.length - 4) + " more networks</div>";
      tip.innerHTML = html;
      tip.hidden = false;
      var tx = e.clientX - r.left + 14, ty = e.clientY - r.top + 14;
      tip.style.left = "0"; tip.style.top = "0";     /* reset before measuring */
      var tw = tip.offsetWidth, thh = tip.offsetHeight;
      if (tx + tw > cw - 4) tx = e.clientX - r.left - tw - 10;
      if (ty + thh > ch - 4) ty = e.clientY - r.top - thh - 10;
      tip.style.left = Math.max(2, tx) + "px"; tip.style.top = Math.max(2, ty) + "px";
    }

    /* ----- networks panel ----- */
    var netsPanel = el("details", "mob-panel");
    netsPanel.innerHTML = "<summary>" + esc(C.ui.networksSummary) + "</summary>" +
      "<p class='hint'>" + esc(C.ui.isolateHint) + "</p>";
    var netsList = el("ul", "mob-nets");
    netsPanel.appendChild(netsList);
    var moreBtn = el("button", "mob-more");
    moreBtn.type = "button";
    moreBtn.addEventListener("click", function () { expandedNets = !expandedNets; buildNetRows(); });
    netsPanel.appendChild(moreBtn);
    root.appendChild(netsPanel);

    var netOrder = nets.map(function (_, i) { return i; })
      .sort(function (a, b) { return nets[b].count - nets[a].count; });
    var maxCount = nets[netOrder[0]].count;
    var netRowBtns = {};

    function buildNetRows() {
      netsList.innerHTML = ""; netRowBtns = {};
      var show = expandedNets ? netOrder : netOrder.slice(0, 25);   /* adjust default row count here */
      show.forEach(function (ni) {
        var li = document.createElement("li");
        var b = el("button", "mob-net");
        b.type = "button";
        var t = C.themes[nets[ni].theme];
        b.innerHTML =
          "<span class='mob-swatch' style='background:var(--mob-" + t.id + ")'></span>" +
          "<span class='name'>" + esc(nets[ni].name) + "</span>" +
          "<span class='bar' style='background:var(--mob-" + t.id + ");width:" +
            (100 * nets[ni].count / maxCount).toFixed(2) + "%'></span>" +   /* linear scale */
          "<span class='count'>" + fmt(nets[ni].count) + "</span>";
        b.addEventListener("click", function () { setIsolate(ni); });
        netRowBtns[ni] = b;
        li.appendChild(b); netsList.appendChild(li);
      });
      moreBtn.textContent = expandedNets ? C.ui.showFewerNetworks
        : C.ui.showAllNetworks + " (" + nets.length + ")";
      syncNetRows();
    }
    function syncNetRows() {
      Object.keys(netRowBtns).forEach(function (ni) {
        netRowBtns[ni].setAttribute("aria-pressed", String(isolate === +ni));
      });
    }
    buildNetRows();

    /* ----- elevation panel ----- */
    var elevPanel = el("details", "mob-panel mob-elev");
    elevPanel.innerHTML = "<summary>" + esc(C.ui.elevationSummary) + "</summary>" +
      "<p class='hint'>" + esc(C.ui.elevFilterHint) + "</p>";
    var elevHost = el("div", "");
    elevPanel.appendChild(elevHost);
    root.appendChild(elevPanel);

    /* band rows and the no-elevation footnote are toggles (click or Enter/Space) */
    function bandTarget(e) {
      var t = e.target.closest ? e.target.closest("[data-band]") : null;
      return t && elevHost.contains(t) ? +t.getAttribute("data-band") : null;
    }
    elevHost.addEventListener("click", function (e) {
      var b = bandTarget(e);
      if (b != null) toggleBand(b);
    });
    elevHost.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var b = bandTarget(e);
      if (b != null) { e.preventDefault(); toggleBand(b); }
    });

    var BANDS = 14;
    function bandLabel(b) {
      if (b === 0) return "< 500 m";
      if (b === 13) return "≥ 6,500 m";
      return fmt(b * 500) + "–" + fmt(b * 500 + 499);
    }

    function drawElev() {
      /* sum the per-network elevation histograms under the current filter */
      var byBand = [];
      for (var b = 0; b <= BANDS; b++) byBand.push(C.themes.map(function () { return 0; }));
      for (var ni = 0; ni < nets.length; ni++) {
        if (!netVisible(ni)) continue;
        var ev = nets[ni].elev, th = nets[ni].theme;
        for (var b2 = 0; b2 <= BANDS; b2++) byBand[b2][th] += ev[b2];
      }
      var totals = byBand.map(function (row) { return row.reduce(function (a, v) { return a + v; }, 0); });
      var maxT = Math.max.apply(null, totals.slice(0, BANDS)) || 1;

      /* adjust elevation chart geometry here */
      var rowH = 20, labW = 92, numW = 70, w = 640, barW = w - labW - numW;
      var h = BANDS * rowH + 6;
      var svg = "<svg viewBox='0 0 " + w + " " + h + "' preserveAspectRatio='xMinYMin meet' role='img' " +
                "aria-label='Histogram of records by 500 metre elevation band'>";
      /* unfiltered, the bars take one neutral fill; a theme or network filter colours them */
      var neutral = theme == null && isolate == null;
      for (var b3 = BANDS - 1; b3 >= 0; b3--) {
        var y = (BANDS - 1 - b3) * rowH + 4;
        var cls = bandSel.size ? (bandSel.has(b3) ? "on" : "dim") : "";
        svg += "<g data-band='" + b3 + "' class='" + cls + "' role='button' tabindex='0' " +
               "aria-pressed='" + bandSel.has(b3) + "' aria-label='" + bandLabel(b3).replace(/'/g, "&#39;") + "'>";
        svg += "<rect class='hit' x='0' y='" + (y - 2) + "' width='" + w + "' height='" + rowH + "'></rect>";
        svg += "<text class='band-label' x='" + (labW - 8) + "' y='" + (y + 12) + "' text-anchor='end'>" +
               bandLabel(b3) + "</text>";
        var x = labW;
        if (neutral) {
          if (totals[b3]) {
            var nw = (totals[b3] / maxT) * barW;
            svg += "<rect x='" + x.toFixed(1) + "' y='" + y + "' width='" + Math.max(nw, 0.5).toFixed(2) +
                   "' height='" + (rowH - 7) + "' rx='1.5' fill='var(--mob-elevbar)'></rect>";
            x += nw;
          }
        } else {
          for (var t = 0; t < C.themes.length; t++) {
            var v = byBand[b3][t];
            if (!v) continue;
            var bw = (v / maxT) * barW;
            svg += "<rect x='" + x.toFixed(1) + "' y='" + y + "' width='" + Math.max(bw, 0.5).toFixed(2) +
                   "' height='" + (rowH - 7) + "' rx='1.5' fill='var(--mob-" + C.themes[t].id + ")'></rect>";
            x += bw;
          }
        }
        if (totals[b3]) {
          svg += "<text class='total' x='" + (x + 6).toFixed(1) + "' y='" + (y + 12) + "'>" +
                 fmt(totals[b3]) + "</text>";
        }
        svg += "</g>";
      }
      svg += "</svg>";
      var unknown = byBand[BANDS].reduce(function (a, v) { return a + v; }, 0);
      elevHost.innerHTML = svg +
        (unknown ? "<p class='unknown'><button type='button' data-band='14' aria-pressed='" +
          bandSel.has(14) + "'>" + esc(C.ui.elevationUnknownNote.replace("{n}", fmt(unknown))) +
          "</button></p>" : "");
    }

    /* ----- about panel ----- */
    var aboutPanel = el("details", "mob-panel mob-about");
    aboutPanel.innerHTML = "<summary>" + esc(C.ui.aboutSummary) + "</summary>" +
      "<p class='vars'>" + C.themes.map(function (t) {
        return "<span><span class='mob-swatch' style='background:var(--mob-" + t.id +
               ")'></span> <b>" + esc(t.label) + "</b></span> — " + esc(t.vars);
      }).join(" · ") + "</p>";
    root.appendChild(aboutPanel);

    var source = el("p", "mob-source");
    source.textContent = C.sourceLine;
    root.appendChild(source);

    /* ----- boot ----- */
    syncChips(); drawElev();
    resize();
    if (window.ResizeObserver) {
      /* redraw deferred to rAF: a synchronous redraw can trip the benign
         "ResizeObserver loop" error, which the site's bundler surfaces */
      var roPending = false;
      var ro = new ResizeObserver(function () {
        if (roPending || !mapWrap.clientWidth || mapWrap.clientWidth === cw) return;
        roPending = true;
        requestAnimationFrame(function () { roPending = false; resize(); });
      });
      ro.observe(mapWrap);
    } else {
      window.addEventListener("resize", resize);
    }
    /* the canvas colours don't react to CSS variable changes on their own */
    new MutationObserver(function () { draw(); })
      .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  }

  /* ---------- helpers ---------- */
  function el(tag, cls) { var e = document.createElement(tag); if (cls) e.className = cls; return e; }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  window.MRIObservatories = { mount: mount, caption: caption };
})();
