/* ---------------------------------------------------------------------------
   MRI 25th Anniversary — the mountain plate
   ---------------------------------------------------------------------------
   Generates the massif as one drawing: a single peak, sectioned into altitude
   belts that carry their own texture (settled plain, cultivated, montane
   forest, alpine meadow, scree, nival), with rivers, treelines, snow patches
   and a city on the plain. The 25 stories are placed on an ascent path that
   climbs the face, and the path is what the reader follows.

   The geometry and the drawing come from the Ascent_25Stories study; this file
   adapts them to this publication's stories and loads beside stories-data.js
   so a Claude Design re-export cannot touch it.

   Two things are computed here and consumed elsewhere:
     window.MRI_PLATE.svg     the artwork, injected into the page's <svg> host
     window.MRI_PLATE.nodes   {storyNumber: {px, py}} as percentages of the
                              plate, which the page uses to place its markers

   The plate is 2400 x 1000 and is drawn with preserveAspectRatio="xMidYMid
   slice": it fills the full width and is cropped from the SIDES rather than
   scaled down. Every marker is therefore constrained to a band either side of
   the centre line, so the path stays on screen on a portrait phone.
--------------------------------------------------------------------------- */

/* Everything below lives in its own scope. stories-data.js already
   declares a top-level `STORIES`, and a duplicate top-level `const` in a
   second classic script is a parse-time error that kills the whole file
   silently — so nothing here is allowed to reach the global scope except
   window.MRI_PLATE. */
(function () {
  'use strict';

/* --- the elevation model -------------------------------------------------
   Each story sits at the mean elevation of the themes it carries, so the
   placement follows the tags already in stories-data.js rather than a
   separate hand-made list that could drift out of step with them.

   These are editorial positions, not measurements: they say where a subject
   belongs on a mountain, not where its fieldwork happened. Adjust a theme
   here and every story carrying it moves. */
const THEME_ELEVATION = {
  'Glaciers & Ice':    4900,   // nival, at the top
  'Snow & Permafrost': 4400,
  'Climate':           3600,   // where elevation-dependent warming is measured
  'Hazards':           3300,   // where they initiate, not where they land
  'Water':             2900,   // the water towers
  'Ecosystems':        2400,   // montane forest and the treeline
  'Knowledge':         2000,   // spans the whole climb, so it sits mid
  'Land Use':          1500,
  'Livelihoods':       1200,
  'Culture':           1000,
  'Equity':             900,
  'Governance':         700    // institutions, down on the plain
};

/* A story with no usable tags lands here rather than at zero. */
const DEFAULT_ELEVATION = 2000;

/* the smallest vertical separation allowed between two stories, in metres */
const MIN_ELEV_GAP = 95;

/* The band the 25 stories are spread across, once their relative order is
   settled. The theme table above fixes the ORDER and the rough grouping; this
   fixes how much of the mountain the climb actually occupies. `hi` sits above
   the nival line (4550) so the top of the path is plainly in the cryosphere,
   and `lo` sits down on the cultivated plain so it starts well below the
   treeline. Widen or narrow this to spread or gather the numbers. */
const PATH_SPAN = { lo: 320, hi: 4880 };

/* Individual nudges, in plate units, keyed by position on the climb. The path
   is drawn as a smooth curve through the nodes, so where it changes direction
   sharply the line bows slightly away from the number sitting there; a small
   push puts the circle back on the line. Positive is right. */
const NODE_NUDGE = { 18: -0.026, 24: 0.029 };   // as fractions of PLATE.base

/* --- palette and belts, carried over from the Ascent study ---------------- */
const MRI = {
  blue: "#0067B2", blue80: "#0F7BC4", blue60: "#4FA3D9", blue30: "#BFE0F5",
  navy: "#0F2E5E", teal: "#16A3B8", green: "#009E60",
  grey: "#6E7275", greyLight: "#C8CACB"
};

/* The climb is one gradient: colour is interpolated continuously with height.

   Two sets. Every colour in the drawing is derived from five roles, so a
   theme only has to re-pitch those and the whole plate follows:

     ink      the massif's structural dark — what belts are darkened toward
     haze     the atmosphere; distance is a mix toward this, and so is the sky
     accent   vegetation
     accent2  ice and water
     text     the drawn things that sit ON the terrain — buildings, cloud,
              and the light side of scree

   In daylight these are not the dark values lightened: `ink` has to stay a
   true mid-tone or the mountain becomes a black wall against a white sky, and
   `text` inverts outright, because buildings read dark on a pale ground and
   light on a dark one. */
const PALETTES = {
  dark: [
    { elev: 0,    ink: "#05192A", inkSoft: "#0A2740", haze: "#124B75", accent: MRI.green,  accent2: MRI.teal,   text: "#DAE7F0" },
    { elev: 1400, ink: "#062136", inkSoft: "#0C3052", haze: "#155C90", accent: MRI.teal,   accent2: MRI.blue60, text: "#DEEAF3" },
    { elev: 2800, ink: "#082B45", inkSoft: "#0F3E65", haze: MRI.blue,   accent: MRI.blue60, accent2: "#8CC4E9",  text: "#E3EEF7" },
    { elev: 4100, ink: "#0A3757", inkSoft: "#12507E", haze: MRI.blue80, accent: "#9CCBEA",  accent2: MRI.blue30, text: "#EAF3FA" },
    { elev: 5200, ink: "#0C4370", inkSoft: "#175E96", haze: "#6FB4E2", accent: MRI.blue30, accent2: "#FFFFFF",  text: "#F2F8FC" }
  ],
  light: [
    { elev: 0,    sky: "#E4F0F8", ink: "#3F5260", inkSoft: "#E7EEF3", haze: "#DDEBF4", accent: "#4E8B4A", accent2: "#6FA9CE", text: "#22333F" },
    { elev: 1400, sky: "#CFE4F3", ink: "#46596A", inkSoft: "#EAF1F5", haze: "#E3F0F8", accent: "#5F9A57", accent2: "#83BADB", text: "#2A3E4C" },
    { elev: 2800, sky: "#B4D6EC", ink: "#4E6474", inkSoft: "#EDF4F8", haze: "#E9F4FA", accent: "#86B184", accent2: "#9ECDE8", text: "#33495A" },
    { elev: 4100, sky: "#98C5E5", ink: "#57707F", inkSoft: "#F2F7FA", haze: "#F0F8FC", accent: "#A9C8DC", accent2: "#C4E0F0", text: "#3A5265" },
    { elev: 5200, sky: "#7FB3DA", ink: "#62808F", inkSoft: "#F7FBFD", haze: "#F6FBFE", accent: "#C6DCEB", accent2: "#FFFFFF", text: "#425B70" }
  ]
};

/* Which one the plate is drawn in. The page writes its theme onto <html>
   before anything paints; window.MRI_THEME is the override the offline
   renderer uses. Unlike the interface, none of this can be a CSS variable —
   the plate interpolates its colours in JavaScript — so a change of theme
   means regenerating the artwork. */
function currentTheme() {
  if (typeof window !== 'undefined' && window.MRI_THEME) return window.MRI_THEME;
  if (typeof document !== 'undefined' && document.documentElement) {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
  }
  return 'dark';
}

let PALETTE_STOPS = PALETTES[currentTheme()] || PALETTES.dark;

/* 'classic' is the flat-vector plate; 'survey' is the scientific-illustration
   rendering. Set window.MRI_PLATE_STYLE before plate.js loads to choose.
   window.MRI_SURVEY_DECOR additionally draws the sheet frame, cartouche and
   the annotated story layer INTO the artwork — used by the offline renderer
   for print-style plates; the website keeps its own HTML markers. */
function urlParam(name) {
  if (typeof location === 'undefined' || !location.search) return null;
  const m = new RegExp('[?&]' + name + '=([^&]+)').exec(location.search);
  return m ? decodeURIComponent(m[1]) : null;
}
const PLATE_STYLE = urlParam('style') ||
  (typeof window !== 'undefined' && window.MRI_PLATE_STYLE) || 'classic';
const SURVEY_DECOR = urlParam('decor') === '1' ||
  !!(typeof window !== 'undefined' && window.MRI_SURVEY_DECOR);

/* the altitude belts, each with its own texture — adjust the bands here */
const BELTS = [
  { key: "urban",  label: "SETTLED PLAIN",       lo: 0,    hi: 420  },
  { key: "crop",   label: "CULTIVATED",          lo: 420,  hi: 1300 },
  { key: "forest", label: "MONTANE FOREST",      lo: 1300, hi: 2700 },
  { key: "meadow", label: "ALPINE MEADOW",       lo: 2700, hi: 3700 },
  { key: "scree",  label: "SCREE & BARE ROCK",   lo: 3700, hi: 4550 },
  { key: "ice",    label: "NIVAL - SNOW & ICE",  lo: 4550, hi: 5200 }
];

/* the inversion layer that hangs on the face */
const CLOUD_SEA = { lo: 1750, hi: 2150 };

/* The sky. By default it is derived from the massif's own colours, which is
   what gives the dark plate its coherence. In daylight that derivation fails:
   `ink` has to stay mid-dark or the mountain vanishes against the page, and a
   sky made mostly of `ink` comes out grey. So a stop may name its own sky and
   the derivation is only a fallback — the dark palette names none, and is
   drawn exactly as before. */
function skyOf(st) {
  return st.sky || MIX(st.ink, st.haze, 0.42);
}

function paletteAt(elev) {
  const st = PALETTE_STOPS;
  if (elev <= st[0].elev) return st[0];
  if (elev >= st[st.length - 1].elev) return st[st.length - 1];
  let i = 0;
  while (i < st.length - 2 && elev > st[i + 1].elev) i++;
  const a = st[i], b = st[i + 1], t = (elev - a.elev) / (b.elev - a.elev), ip = gsap.utils.interpolate;
  return {
    elev, ink: ip(a.ink, b.ink, t), inkSoft: ip(a.inkSoft, b.inkSoft, t),
    haze: ip(a.haze, b.haze, t), accent: ip(a.accent, b.accent, t),
    accent2: ip(a.accent2, b.accent2, t), text: ip(a.text, b.text, t)
  };
}

/* --- the stories, placed on the mountain ---------------------------------
   Built from stories-data.js, sorted low to high. `index` is the position in
   the climb, which is what the path is drawn through; `num` is the story's
   own number, which is what the reader sees. The two deliberately differ —
   the numbering is editorial and the ordering is physical. */
function buildStories() {
  const src = (window.MRI_CONTENT && window.MRI_CONTENT.STORIES) || [];
  const placed = src.map(s => {
    const es = (s.tags || []).map(t => THEME_ELEVATION[t]).filter(e => typeof e === 'number');
    const elevation = es.length
      ? Math.round(es.reduce((a, b) => a + b, 0) / es.length)
      : DEFAULT_ELEVATION;
    return { num: s.num, title: s.title, elevation };
  });
  placed.sort((a, b) => a.elevation - b.elevation || a.num - b.num);
  /* Stories sharing a theme set land on identical elevations, which would
     stack their markers. Nudge each one clear of the last by a fixed minimum
     so the climb is strictly ordered — the shift is far smaller than the
     editorial uncertainty in the model itself. */
  for (let i = 1; i < placed.length; i++) {
    if (placed[i].elevation - placed[i - 1].elevation < MIN_ELEV_GAP) {
      placed[i].elevation = placed[i - 1].elevation + MIN_ELEV_GAP;
    }
  }
  /* Rescale onto the band the path is meant to occupy. This keeps the order
     and the relative gaps the theme table produced, and only changes how much
     of the mountain they are spread over. */
  const lo = placed[0].elevation, hi = placed[placed.length - 1].elevation;
  if (hi > lo) {
    const k = (PATH_SPAN.hi - PATH_SPAN.lo) / (hi - lo);
    placed.forEach(s => {
      s.themeElevation = s.elevation;          // what the tags alone implied
      s.elevation = Math.round(PATH_SPAN.lo + (s.elevation - lo) * k);
    });
  }
  placed.forEach((s, i) => { s.index = i; s.id = String(s.num).padStart(2, '0'); });
  return placed;
}

let PLATE_STORIES = [];

function makeRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const MIX = (a, b, t) => gsap.utils.interpolate(a, b, t);

function makeNoise1D(seed) {
  const rand = makeRandom(seed);
  const table = Array.from({ length: 256 }, () => rand());
  const fade = (t) => t * t * (3 - 2 * t);
  return function (x) {
    const i = Math.floor(x), f = x - i;
    const a = table[i & 255], b = table[(i + 1) & 255];
    return a + (b - a) * fade(f);
  };
}
function makeFbm(seed, octaves = 4) {
  const n = Array.from({ length: octaves }, (_, i) => makeNoise1D(seed + i * 1013));
  return function (x) {
    let v = 0, amp = 1, freq = 1, norm = 0;
    for (let o = 0; o < octaves; o++) { v += n[o](x * freq) * amp; norm += amp; amp *= 0.5; freq *= 2.15; }
    return v / norm;
  };
}
/** Ridge surface, normalised so it always uses its full amplitude. */
function ridgeSurface(rand, w, baseY, amplitude, peaks, sharpness, floor) {
  const fbm = makeFbm(Math.floor(rand() * 1e6), 5);
  const k = sharpness || 1.6, samples = 150, scale = (peaks || 6) / samples;
  const fl = floor == null ? 0 : floor;
  const raw = [];
  for (let i = 0; i <= samples; i++) raw.push(fbm(i * scale + 3.7));
  const lo = Math.min(...raw), hi = Math.max(...raw), span = (hi - lo) || 1;
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const x = (i / samples) * (w + 40) - 20;
    const n = fl + (1 - fl) * Math.pow((raw[i] - lo) / span, k);
    const env = 0.58 + 0.42 * Math.sin(Math.PI * (i / samples));
    pts.push([x, baseY - n * amplitude * env]);
  }
  return pts;
}
function surfaceToPath(pts, h, w) {
  let d = `M -20 ${(h + 20).toFixed(1)}`;
  pts.forEach(p => { d += ` L ${p[0].toFixed(1)} ${p[1].toFixed(1)}`; });
  return d + ` L ${(w + 20).toFixed(1)} ${(h + 20).toFixed(1)} Z`;
}
function ridgePath(rand, w, h, baseY, amp, peaks, sharp, floor) {
  return surfaceToPath(ridgeSurface(rand, w, baseY, amp, peaks, sharp, floor), h, w);
}

function beltColours(p) {
  return {
    ice:    MIX(p.accent2, "#FFFFFF", 0.62),
    iceDim: MIX(p.accent2, p.haze, 0.40),
    scree:  MIX(MIX(p.haze, p.text, 0.34), p.ink, 0.40),
    meadow: MIX(MIX(p.haze, p.accent, 0.58), p.ink, 0.30),
    forest: MIX(p.ink, p.accent, 0.38),
    crop:   MIX(MIX(p.haze, p.accent, 0.30), p.ink, 0.34),
    urban:  MIX(p.ink, p.haze, 0.30),
    river:  MIX(p.accent2, "#FFFFFF", 0.40),
    built:  MIX(p.text, p.haze, 0.35),
    cloud:  MIX(p.text, p.haze, 0.55)
  };
}
/** One engraved texture. Each belt can be built with its OWN altitude palette,
    which is how the mountain carries the whole colour journey vertically. */
function beltPattern(key, id, C, p, scale = 1) {
  const s = (n) => (n * scale).toFixed(2);
  switch (key) {
    /* The plain is a quiet ground of fields and lanes. Settlement is drawn as
       actual towns (drawSettlement) rather than tiled, because a tiling of
       little vertical blocks reads as a bar chart, not as a place. */
    case "urban": return `
      <pattern id="${id}" width="${s(72)}" height="${s(48)}" patternUnits="userSpaceOnUse" patternTransform="skewY(-3)">
        <rect width="${s(72)}" height="${s(48)}" fill="${C.urban}"/>
        <path d="M0 ${s(24)} H${s(72)} M${s(36)} 0 V${s(48)}"
              stroke="${MIX(C.urban, C.built, .16)}" stroke-width="${s(0.9)}" opacity="0.6"/>
        <path d="M0 ${s(11)} H${s(34)} M${s(40)} ${s(35)} H${s(72)}"
              stroke="${MIX(C.urban, C.built, .10)}" stroke-width="${s(0.7)}" opacity="0.5"/>
      </pattern>`;
    case "crop": return `
      <pattern id="${id}" width="${s(18)}" height="${s(11)}" patternUnits="userSpaceOnUse" patternTransform="skewY(-7)">
        <rect width="${s(18)}" height="${s(11)}" fill="${C.crop}"/>
        <path d="M0 0 H${s(18)} M0 ${s(5.5)} H${s(18)} M0 0 V${s(11)} M${s(9)} 0 V${s(11)}"
              stroke="${MIX(C.crop, p.ink, .45)}" stroke-width="${s(0.9)}" fill="none" opacity="0.55"/>
        <rect x="0" y="0" width="${s(9)}" height="${s(5.5)}" fill="${MIX(C.crop, p.accent, .22)}" opacity="0.32"/>
      </pattern>`;
    case "forest": return `
      <pattern id="${id}" width="${s(22)}" height="${s(20)}" patternUnits="userSpaceOnUse">
        <rect width="${s(22)}" height="${s(20)}" fill="${C.forest}"/>
        <path d="M${s(5)} ${s(16)} L${s(9)} ${s(6)} L${s(13)} ${s(16)} Z" fill="${MIX(C.forest, p.accent, .5)}"/>
        <path d="M${s(15)} ${s(20)} L${s(19)} ${s(10)} L${s(23)} ${s(20)} Z" fill="${MIX(C.forest, p.accent, .32)}"/>
        <path d="M${s(-7)} ${s(20)} L${s(-3)} ${s(10)} L${s(1)} ${s(20)} Z" fill="${MIX(C.forest, p.accent, .32)}"/>
      </pattern>`;
    case "meadow": return `
      <pattern id="${id}" width="${s(14)}" height="${s(14)}" patternUnits="userSpaceOnUse">
        <rect width="${s(14)}" height="${s(14)}" fill="${C.meadow}"/>
        <path d="M${s(3)} ${s(12)} V${s(6)} M${s(3)} ${s(8)} L${s(1)} ${s(5)} M${s(3)} ${s(8)} L${s(5)} ${s(5)} M${s(10)} ${s(13)} V${s(8)} M${s(10)} ${s(10)} L${s(8)} ${s(7)} M${s(10)} ${s(10)} L${s(12)} ${s(7)}"
              stroke="${MIX(C.meadow, p.accent, .55)}" stroke-width="${s(1)}" fill="none" opacity="0.85"/>
      </pattern>`;
    case "scree": return `
      <pattern id="${id}" width="${s(16)}" height="${s(16)}" patternUnits="userSpaceOnUse">
        <rect width="${s(16)}" height="${s(16)}" fill="${C.scree}"/>
        <circle cx="${s(3)}" cy="${s(4)}" r="${s(1.5)}" fill="${MIX(C.scree, p.text, .35)}"/>
        <circle cx="${s(11)}" cy="${s(9)}" r="${s(1.1)}" fill="${MIX(C.scree, p.text, .22)}"/>
        <circle cx="${s(7)}" cy="${s(14)}" r="${s(0.9)}" fill="${MIX(C.scree, p.text, .30)}"/>
        <circle cx="${s(14)}" cy="${s(2)}" r="${s(0.8)}" fill="${MIX(C.scree, p.text, .18)}"/>
      </pattern>`;
    default: return `
      <pattern id="${id}" width="${s(24)}" height="${s(24)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-18)">
        <rect width="${s(24)}" height="${s(24)}" fill="${C.ice}"/>
        <path d="M0 ${s(6)} H${s(24)} M0 ${s(15)} H${s(24)}" stroke="${C.iceDim}" stroke-width="${s(1.6)}" opacity="0.55"/>
        <path d="M${s(4)} 0 V${s(24)}" stroke="${C.iceDim}" stroke-width="${s(0.8)}" opacity="0.3"/>
      </pattern>`;
  }
}
function texturePatterns(uid, C, p, scale = 1) {
  return BELTS.map(b => beltPattern(b.key, `tx-${b.key}-${uid}`, C, p, scale)).join("");
}

/** A town, drawn rather than tiled: a terrace of pitched roofs, a couple of
    taller blocks, a church spire, and a lane running out of it. `k` scales the
    whole thing, so the same routine draws a city on the plain and a hamlet on
    the terraces. Adjust the built silhouette here. */
/* --- an environmental observatory -----------------------------------------
   The mountain carries instruments as well as stories. Drawn small and flat,
   in the same idiom as the city: a hut with a shallow roof, a lattice mast
   beside it carrying two sensor booms and a radiation ball, and a short guy
   line. It reads at plate scale as "there is a station here" rather than as a
   detailed rendering of one.

   `x`, `y` is the point it stands on; `k` scales the whole thing. Colours come
   from the belt it sits in, so an observatory in the snow is drawn in the snow
   belt's own values and the icon inverts with the theme along with everything
   else. */
/* Relative luminance, so a mark can be given a colour that survives the belt
   it is drawn on. The nival belt is near-white in BOTH themes, so a highlight
   that always tends toward white disappears there. */
function relLum(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return 0.5;
  const v = [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}

function drawObservatory(x, y, k, C, p) {
  const wall = MIX(C.built, p.ink, 0.18);
  const roof = MIX(C.built, p.ink, 0.42);
  const mast = MIX(C.built, p.text, 0.20);
  /* the instrument highlight, pitched against the belt rather than always
     toward white — on snow it goes dark, on rock and meadow it stays bright */
  const onPale = relLum(C.built) > 0.42;
  const lit = onPale ? MIX(p.ink, "#000000", 0.10)
                     : MIX(p.accent2, "#FFFFFF", 0.35);
  const u = (n) => (n * k).toFixed(1);
  let g = `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)})">`;

  /* the hut: a low box under a shallow gable, sitting on the slope */
  g += `<rect x="${u(-13)}" y="${u(-11)}" width="${u(20)}" height="${u(11)}" fill="${wall}"/>`;
  g += `<path d="M ${u(-15)} ${u(-11)} L ${u(-3)} ${u(-17)} L ${u(9)} ${u(-11)} Z" fill="${roof}"/>`;
  /* one lit window, so it reads as occupied */
  g += `<rect x="${u(-9)}" y="${u(-8)}" width="${u(4)}" height="${u(4)}" fill="${lit}" opacity="0.75"/>`;

  /* the mast: a plain shaft with two booms and a sensor ball on top */
  g += `<rect x="${u(11)}" y="${u(-30)}" width="${u(1.6)}" height="${u(30)}" fill="${mast}"/>`;
  g += `<rect x="${u(6)}" y="${u(-24)}" width="${u(12)}" height="${u(1.2)}" fill="${mast}"/>`;
  g += `<rect x="${u(7)}" y="${u(-17)}" width="${u(10)}" height="${u(1.2)}" fill="${mast}"/>`;
  g += `<circle cx="${u(11.8)}" cy="${u(-31.5)}" r="${u(2.2)}" fill="${lit}"/>`;
  /* a guy line back to the ground, which is what makes a mast read as a mast */
  g += `<path d="M ${u(11.8)} ${u(-28)} L ${u(19)} ${u(0)}" stroke="${mast}" stroke-width="${u(0.7)}" fill="none" opacity="0.7"/>`;

  return g + `</g>`;
}

/* --- the city on the plain -------------------------------------------------
   Fewer buildings, each actually shaped, rather than a long run of random
   bars. A real skyline reads through a handful of recognisable silhouettes —
   a slab, a stepped tower, a pitched block, a spire — set at different depths
   and heights, with a low mass of smaller roofs filling in behind them.

   Laid out on a fixed script rather than at random so the composition is the
   same every time: `w` is width, `h` height, `type` the silhouette, and `d`
   how far back it sits (which only affects its tone). */
const CITY_PLAN = [
  { x: -0.92, w: 0.075, h: 0.30, type: 'pitched', d: 0.55 },
  { x: -0.80, w: 0.055, h: 0.52, type: 'slab',    d: 0.35 },
  { x: -0.68, w: 0.085, h: 0.38, type: 'pitched', d: 0.10 },
  { x: -0.52, w: 0.060, h: 0.86, type: 'stepped', d: 0.00 },
  { x: -0.38, w: 0.048, h: 0.62, type: 'slab',    d: 0.22 },
  { x: -0.24, w: 0.030, h: 1.00, type: 'spire',   d: 0.05 },
  { x: -0.10, w: 0.070, h: 0.70, type: 'stepped', d: 0.15 },
  { x:  0.06, w: 0.055, h: 0.44, type: 'slab',    d: 0.42 },
  { x:  0.20, w: 0.090, h: 0.34, type: 'pitched', d: 0.08 },
  { x:  0.36, w: 0.050, h: 0.78, type: 'slab',    d: 0.28 },
  { x:  0.50, w: 0.075, h: 0.50, type: 'stepped', d: 0.48 },
  { x:  0.66, w: 0.065, h: 0.32, type: 'pitched', d: 0.20 },
  { x:  0.82, w: 0.045, h: 0.58, type: 'slab',    d: 0.60 }
];

function drawCity(rand, x, y, width, C, p, k) {
  const tallest = 46 * k;                 /* height of the tallest building */
  const wall = MIX(C.urban, p.text, 0.42);
  const back = MIX(C.urban, p.text, 0.16);
  const roof = MIX(C.urban, p.ink, 0.28);
  const lit  = MIX(p.accent, p.text, 0.45);
  let g = "";

  /* a low haze band, so the city sits in the plain rather than on it */
  g += `<rect x="${(x - width * 0.62).toFixed(1)}" y="${(y - tallest * 0.5).toFixed(1)}" width="${(width * 1.24).toFixed(1)}" height="${(tallest * 0.5).toFixed(1)}" fill="${MIX(C.urban, p.haze, .5)}" opacity="0.18"/>`;

  CITY_PLAN.forEach((b, i) => {
    const bw = b.w * width, bh = b.h * tallest;
    const bx = x + b.x * width * 0.5 - bw / 2, by = y - bh;
    const tone = MIX(wall, back, b.d);            /* further back, flatter */
    const rf = MIX(roof, back, b.d);

    if (b.type === 'spire') {
      /* a church or clock tower: a narrow shaft, a belfry, then a point */
      const shaft = bh * 0.72;
      g += `<rect x="${bx.toFixed(1)}" y="${(y - shaft).toFixed(1)}" width="${bw.toFixed(1)}" height="${shaft.toFixed(1)}" fill="${tone}"/>`;
      g += `<rect x="${(bx - bw * 0.22).toFixed(1)}" y="${(y - shaft - bh * 0.10).toFixed(1)}" width="${(bw * 1.44).toFixed(1)}" height="${(bh * 0.10).toFixed(1)}" fill="${rf}"/>`;
      g += `<path d="M ${(bx - bw * 0.22).toFixed(1)} ${(y - shaft - bh * 0.10).toFixed(1)}
             L ${(bx + bw * 0.5).toFixed(1)} ${(y - bh).toFixed(1)}
             L ${(bx + bw * 1.22).toFixed(1)} ${(y - shaft - bh * 0.10).toFixed(1)} Z" fill="${rf}"/>`;
    } else if (b.type === 'stepped') {
      /* a tower that loses width as it rises — two setbacks */
      const t1 = bh * 0.52, t2 = bh * 0.80;
      g += `<rect x="${bx.toFixed(1)}" y="${(y - t1).toFixed(1)}" width="${bw.toFixed(1)}" height="${t1.toFixed(1)}" fill="${tone}"/>`;
      g += `<rect x="${(bx + bw * 0.14).toFixed(1)}" y="${(y - t2).toFixed(1)}" width="${(bw * 0.72).toFixed(1)}" height="${(t2 - t1).toFixed(1)}" fill="${tone}"/>`;
      g += `<rect x="${(bx + bw * 0.30).toFixed(1)}" y="${(y - bh).toFixed(1)}" width="${(bw * 0.40).toFixed(1)}" height="${(bh - t2).toFixed(1)}" fill="${tone}"/>`;
      g += `<rect x="${(bx + bw * 0.44).toFixed(1)}" y="${(y - bh - bh * 0.10).toFixed(1)}" width="${(bw * 0.12).toFixed(1)}" height="${(bh * 0.10).toFixed(1)}" fill="${rf}"/>`;
    } else if (b.type === 'pitched') {
      /* a wide low block under a shallow gable */
      const body = bh * 0.74;
      g += `<rect x="${bx.toFixed(1)}" y="${(y - body).toFixed(1)}" width="${bw.toFixed(1)}" height="${body.toFixed(1)}" fill="${tone}"/>`;
      g += `<path d="M ${(bx - bw * 0.08).toFixed(1)} ${(y - body).toFixed(1)}
             L ${(bx + bw * 0.5).toFixed(1)} ${(y - bh).toFixed(1)}
             L ${(bx + bw * 1.08).toFixed(1)} ${(y - body).toFixed(1)} Z" fill="${rf}"/>`;
    } else {
      /* a plain slab with a parapet */
      g += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${tone}"/>`;
      g += `<rect x="${(bx - bw * 0.06).toFixed(1)}" y="${(by - tallest * 0.022).toFixed(1)}" width="${(bw * 1.12).toFixed(1)}" height="${(tallest * 0.022).toFixed(1)}" fill="${rf}"/>`;
    }

    /* lit windows, only on the nearer buildings and only a few */
    if (b.d < 0.36) {
      const rows = Math.max(2, Math.round(bh / (tallest * 0.14)));
      for (let r2 = 1; r2 < rows; r2++) {
        if (rand() > 0.62) continue;
        const wy = y - bh * (r2 / rows) - tallest * 0.012;
        const wx = bx + bw * (0.22 + rand() * 0.5);
        g += `<rect x="${wx.toFixed(1)}" y="${wy.toFixed(1)}" width="${(bw * 0.16).toFixed(1)}" height="${(tallest * 0.022).toFixed(1)}" fill="${lit}" opacity="${(0.35 + rand() * 0.35).toFixed(2)}"/>`;
      }
    }
  });

  /* the ground line the city stands on */
  g += `<rect x="${(x - width * 0.62).toFixed(1)}" y="${(y - 0.8 * k).toFixed(1)}" width="${(width * 1.24).toFixed(1)}" height="${(2.2 * k).toFixed(1)}" fill="${MIX(C.urban, p.ink, 0.5)}" opacity="0.55"/>`;
  return g;
}

function drawSettlement(rand, x, y, width, C, p, k, opts = {}) {
  /* Walls sit just above the ground tone and roofs just below it, so the town
     reads as a mass of buildings rather than a row of bright bars. */
  const wall = MIX(C.urban, p.text, 0.40);
  const roof = MIX(C.urban, p.text, 0.14);
  const lit  = MIX(p.accent, p.text, 0.35);
  let g = "";
  let cursor = x - width / 2;
  const end = x + width / 2;
  /* a handful of flat-roofed towers, spaced through the terrace, is what
     separates a city skyline from a village one */
  const towerAt = new Set();
  for (let t = 0; t < (opts.towers || 0); t++) towerAt.add(2 + Math.floor(rand() * 22));
  let i = 0;
  while (cursor < end) {
    const isTower = towerAt.has(i);
    const bw = (isTower ? 4.5 + rand() * 3 : 5 + rand() * 7) * k;
    const bh = (isTower ? 15 + rand() * 13 : 4 + rand() * 5.5) * k;
    const bx = cursor, by = y - bh;
    g += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}" fill="${wall}" opacity="0.92"/>`;
    if (isTower) {                                    /* flat roof + parapet */
      g += `<rect x="${(bx - 0.5 * k).toFixed(1)}" y="${(by - 1.2 * k).toFixed(1)}" width="${(bw + 1 * k).toFixed(1)}" height="${(1.2 * k).toFixed(1)}" fill="${roof}"/>`;
      for (let f = 1; f * 3.4 * k < bh - 2 * k; f++)   /* floor lines */
        g += `<rect x="${(bx + 0.8 * k).toFixed(1)}" y="${(by + f * 3.4 * k).toFixed(1)}" width="${(bw - 1.6 * k).toFixed(1)}" height="${(0.7 * k).toFixed(1)}" fill="${lit}" opacity="0.30"/>`;
    } else {                                          /* pitched roof */
      g += `<path d="M ${(bx - 0.8 * k).toFixed(1)} ${by.toFixed(1)} L ${(bx + bw / 2).toFixed(1)} ${(by - 2.6 * k).toFixed(1)} L ${(bx + bw + 0.8 * k).toFixed(1)} ${by.toFixed(1)} Z" fill="${roof}" opacity="0.95"/>`;
    }
    if (rand() > 0.62) g += `<rect x="${(bx + bw * 0.34).toFixed(1)}" y="${(by + bh * 0.34).toFixed(1)}" width="${(1.3 * k).toFixed(1)}" height="${(1.6 * k).toFixed(1)}" fill="${lit}" opacity="0.55"/>`;
    cursor += bw + (1.6 + rand() * 3) * k;
    i++;
  }
  /* the church, and the lane out of town */
  if (opts.church !== false) {
    const cx2 = x + (rand() - 0.5) * width * 0.4;
    const th = 12 * k;
    g += `<rect x="${(cx2 - 2.2 * k).toFixed(1)}" y="${(y - th).toFixed(1)}" width="${(4.4 * k).toFixed(1)}" height="${th.toFixed(1)}" fill="${wall}"/>`;
    g += `<path d="M ${(cx2 - 3.4 * k).toFixed(1)} ${(y - th).toFixed(1)} L ${cx2.toFixed(1)} ${(y - th - 6 * k).toFixed(1)} L ${(cx2 + 3.4 * k).toFixed(1)} ${(y - th).toFixed(1)} Z" fill="${roof}"/>`;
  }
  /* a shadow line seats the town on the plain */
  g = `<rect x="${(x - width / 2 - 4 * k).toFixed(1)}" y="${(y - 0.6 * k).toFixed(1)}" width="${(width + 8 * k).toFixed(1)}" height="${(1.8 * k).toFixed(1)}" fill="${MIX(C.urban, p.ink, 0.55)}" opacity="0.5"/>` + g;
  if (opts.lane !== false) {
    g += `<path d="M ${(x - width * 0.6).toFixed(1)} ${(y + 1.5 * k).toFixed(1)} L ${(x + width * 0.75).toFixed(1)} ${(y - 3 * k).toFixed(1)}"
          stroke="${MIX(C.urban, p.text, 0.22)}" stroke-width="${(1.6 * k).toFixed(1)}" fill="none" opacity="0.55"/>`;
  }
  return g;
}

/** A stand of conifers — the treeline is the most legible thing on a mountain,
    so the forest belt gets drawn individuals as well as its tiling texture. */
function drawTrees(rand, x, y, spread, count, C, p, k) {
  let g = "";
  for (let i = 0; i < count; i++) {
    const tx = x + (rand() - 0.5) * spread;
    const ty = y + (rand() - 0.5) * spread * 0.22;
    const h = (5 + rand() * 7) * k, w = h * 0.42;
    const tone = MIX(C.forest, p.accent, 0.35 + rand() * 0.35);
    g += `<path d="M ${(tx - w).toFixed(1)} ${ty.toFixed(1)} L ${tx.toFixed(1)} ${(ty - h).toFixed(1)} L ${(tx + w).toFixed(1)} ${ty.toFixed(1)} Z" fill="${tone}" opacity="${(0.7 + rand() * 0.3).toFixed(2)}"/>`;
  }
  return g;
}

/* =============================================================================
   D. THE MOUNTAIN PLATE
   The whole mountain, 0 to 5,200 m, seen at once — a Naturgemälde. Returns the
   SVG plus the geometry the page needs to hang numbered markers on it, all in
   the same viewBox units, so the markers stay welded to the terrain at any size.
   ========================================================================== */
/* 2400 x 1000 — deliberately wider than any viewport, so the sides can be
   cropped away as decoration. The mountain is centred at x = 1200, and the
   margins above the summit and below sea level absorb any vertical crop. */

/* Two plate shapes. A landscape plate is right on a desktop, but on a phone it
   leaves the ascent only a couple of hundred pixels of height to hold 25
   markers, so they overlap however thin their rings are made. The narrow
   layout is a portrait plate: the same mountain, drawn tall, with the path
   given room to climb.

   `base` is the massif's half-width at sea level; everything else that is
   measured across the plate is expressed as a multiple of it, so a layout only
   has to state its own proportions. `band` is how far either side of the
   centre line a marker may sit, and `marker` is the diameter of the numbered
   circles in CSS pixels at that size. */
const LAYOUTS = {
  wide:   { w: 2400, h: 1000, seaY: 900,  topY: 110, base: 620, band: 430, marker: 24, sep: 78, frame: 16 / 9 },
  /* The portrait plate is not just the landscape one turned on its side: a
     mountain drawn 1500 units tall on a 500-unit base reads as a needle, so
     the base is widened to keep it looking like a mountain, and there is more
     sky above the summit so the peak is not flush against the sticky header. */
  narrow: { w: 1000, h: 1900, seaY: 1780, topY: 300, base: 400, band: 178, marker: 18, sep: 62, frame: 1000 / 1900 }
};

/* the width at or below which the portrait plate is used */
const NARROW_AT = 720;

function layoutFor(width) {
  return (width || 1280) <= NARROW_AT ? LAYOUTS.narrow : LAYOUTS.wide;
}

/* the live one; replaced when the viewport crosses the breakpoint */
let PLATE = Object.assign({}, LAYOUTS.wide, { cx: LAYOUTS.wide.w / 2 });
const plateY = (e) => PLATE.seaY - (e / 5200) * (PLATE.seaY - PLATE.topY);
/* half-width of the massif at this altitude, and its leaning centre line */
function plateHW(e) {
  /* One smooth concave profile all the way down. A separate flare term near
     sea level put a kink in the slope and made the base look pinched, so the
     apron is part of the same curve: exponent < 1 gives concave flanks that
     splay out into the plain.

     BASE is the half-width at sea level. Narrowing it is what makes the
     mountain read as tall — the summit does not move, so the same height is
     carried on a smaller footprint and the sky opens out either side. */
  return 10 + PLATE.base * Math.pow((5200 - e) / 5200, 0.78);
}
const plateCX = (e) => PLATE.cx + PLATE.base * 0.113 * (e / 5200);

/* How the flanks are shaped. `roughness` is the raw displacement as a fraction
   of the cone's half-width at that height; `smoothing` is how many averaging
   passes run over it — more passes give a calmer, more natural ascent, fewer
   give a craggier one. `shoulder` sets how far the two shelves step out. */
/* The two rivers. `source` is the altitude each rises at and `width` scales
   its channel. The left one runs the length of the face; the right is a
   shorter, slighter stream rising three quarters of the way down. */
/* How far the drawn line runs past the first and last number, in plate units.
   `foot` is 0: the line begins exactly at circle 01, so the first number is
   the start of the climb rather than a stop along it. The summit keeps a short
   tail so the route carries into the snow instead of ending on a circle.

   Fixed lengths rather than a multiple of the gap to the neighbouring node:
   that gap grows towards the summit, so a multiple sent the line straight off
   the top of the mountain. */
const PATH_TAIL = {
  foot: 0, summitFrac: 0.094,
  /* the highest and lowest altitudes the drawn line may reach, and how far
     across the flanks it may run there — the line is held inside all three */
  ceiling: 4960, floor: 240, inset: 0.68
};

/* Where the instrument stations stand, in metres. `belt` picks the palette
   they are drawn in, and should match the belt the altitude falls in. */
const OBSERVATORIES = [
  { elev: 4650, belt: 'ice',    scale: 1.00 },   // in the snow, below the last station
  /* the anchor is the point the hut stands on and the icon draws upward from
     it, so the altitude is set a little below the band it should read in */
  { elev: 2880, belt: 'meadow', scale: 0.92 }    // between the 19th and 20th
];

const RIVERS = [
  { source: 4400, width: 1.00, offset: 0 },
  /* pushed east so its channel does not run under the ascent path */
  { source: 1300, width: 0.62, offset: 210 }
];

const SILHOUETTE = { roughness: 0.085, smoothing: 4, shoulder: 0.10 };   /* a slight lean, still centred */
/* the ascent path: a serpentine that stays on the face and narrows with it */
function plateNode(e) {
  const t = e / 5200;
  return [plateCX(e) + Math.sin(t * Math.PI * 5.0 - 0.15) * plateHW(e) * 0.56, plateY(e)];
}


/* ===========================================================================
   THE SURVEY RENDERER
   ---------------------------------------------------------------------------
   Draws the plate the way the historical glacier surveys were drawn: ink
   linework on paper, with colour reserved for water, ice and the red of the
   surveyor's measurements. Everything here is placed individually — trees,
   hachure strokes, crevasses, moraine stones — with the randomness seeded, so
   the drawing is identical on every load.

   The palette is the sheet's own and does NOT follow the site theme: this is
   the "map sheet" model, a paper document that keeps its own light and is
   framed by whichever interface surrounds it. Adjust the inks here.
   ======================================================================== */
/* The survey sheet in two printings. The day sheet is the historical idiom:
   ink on paper. The night sheet is the same drawing struck on a dark ground —
   light linework on deep navy, snow and ice luminous, the surveyor's red
   lifted so it carries. MRI's identity sits in both: the water and ice family
   is pitched around MRI blue, the vegetation leans toward MRI green, and the
   imprint line in the cartouche is set in the corporate blue.

   Adjust either printing here; the drawing code is identical for both. */
const SURVEYS = {
  light: {
    paper:     '#f2eddf', paperHigh: '#f7f4ea',
    sky0:      '#e3eae9', sky1:      '#f2eddf',
    ink:       '#3d3a31', inkSoft:   '#6b665a',
    shade:     '#3d3a31',
    wash:      '#e7e2cf', washHigh:  '#efece0',
    stone:     '#b5ab93',
    sage:      '#a4b18e', sageDeep:  '#7f9878',   // leaning toward MRI green
    ice:       '#e9f1f2', iceLine:   '#7fa3c0',   // MRI blue, weathered
    water:     '#4f83a8', waterPale: '#cfdfe6',   // MRI blue, toned to paper
    moraine:   '#8a7f68',
    red:       '#a83e35',
    blue:      '#0067B2',                          // the identity itself
    hazeFar:   '#dfe0d6', hazeNear:  '#d8d4bf'
  },
  dark: {
    paper:     '#0B1F2E', paperHigh: '#E6EFF5',
    sky0:      '#12303F', sky1:      '#0B1F2E',
    ink:       '#C3D3DD', inkSoft:   '#8AA2B2',
    shade:     '#000000',
    wash:      '#14293A', washHigh:  '#1B3448',
    stone:     '#3C5266',
    sage:      '#2E4A3C', sageDeep:  '#6D9179',
    ice:       '#A9C6DA', iceLine:   '#7FAcca',
    water:     '#5FA8D8', waterPale: '#2C4A63',
    moraine:   '#8B94A0',
    red:       '#E07A66',
    blue:      '#4FA3D9',
    hazeFar:   '#16293A', hazeNear:  '#1C3348'
  }
};

/* type sizes for the sheet — raised from the first draft, which read small
   at page scale. One set serves both printings. */
const SURVEY_TYPE = {
  note: 12.5, num: 10.5, zone: 24, spot: 15, margin: 14
};


/* text destined for SVG markup — ampersands in the belt names and story
   titles are entity errors in a standalone .svg file */
function esc(t) {
  return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* interpolate x on one flank of any massif at a given y */
function xAtY(list, y) {
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i];
    if ((y >= a[1] && y <= b[1]) || (y <= a[1] && y >= b[1])) {
      const f = b[1] === a[1] ? 0 : (y - a[1]) / (b[1] - a[1]);
      return a[0] + (b[0] - a[0]) * f;
    }
  }
  return list[list.length - 1][0];
}

/* Roughen a flank polyline: subdivide and displace perpendicular to the local
   direction, so the drawn silhouette is a serrated, observed-looking ridge
   while the LOGICAL flanks (marker placement, path clamps) stay smooth. The
   displacement is damped near the summit so the apex stays a single point,
   and its amplitude is far smaller than the path's clearance to the flank. */
function roughen(pts, seedKey, amp) {
  const f = makeFbm(hashString(seedKey), 3);
  const f2 = makeFbm(hashString(seedKey + 'x'), 2);
  const out = [pts[0].slice()];
  let t = 0;
  for (let i = 1; i < pts.length; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const n = Math.max(2, Math.round(len / 22));
    const nx = -(by - ay) / len, ny = (bx - ax) / len;
    for (let k = 1; k <= n; k++) {
      const u = k / n; t += len / n;
      const px = ax + (bx - ax) * u, py = ay + (by - ay) * u;
      const fromTop = Math.hypot(px - pts[0][0], py - pts[0][1]);
      const damp = Math.min(1, fromTop / 130);
      /* two scales: a slow swell and a fine serration */
      const d = ((f(t * 0.006) - 0.5) * 2 * amp + (f2(t * 0.045) - 0.5) * amp * 0.8) * damp;
      out.push([px + nx * d, py + ny * d]);
    }
  }
  return out;
}

function flankPathD(left, right, W, H) {
  let d = `M ${right[0][0].toFixed(1)} ${right[0][1].toFixed(1)}`;
  right.forEach(pt => { d += ` L ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`; });
  d += ` L ${W + 200} ${H + 60} L ${-200} ${H + 60}`;
  for (let i = left.length - 1; i >= 0; i--) d += ` L ${left[i][0].toFixed(1)} ${left[i][1].toFixed(1)}`;
  return d + ' Z';
}

function renderSurveyPlate(ctx) {
  const { W, H, rand, mFar, mMain, mNear, flankAt, nodes, pathD } = ctx;
  const S = SURVEYS[currentTheme()] || SURVEYS.light;
  const T = SURVEY_TYPE;
  /* text that lands on the snow needs the opposite pairing from text on the
     terrain — on the night sheet especially, light ink on the luminous cap
     ghosts. The snow is always paperHigh, so the pair is derivable. */
  const inkOn = overSnow => overSnow
    ? { fill: MIX(S.paper, '#10293c', 0.5), halo: S.paperHigh }
    : { fill: S.ink, halo: S.paper };
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;

  /* --- observed silhouettes ---------------------------------------------- */
  const dispL = roughen(mMain.left, 'main-L', 9);
  const dispR = roughen(mMain.right, 'main-R', 9);
  const mainD = flankPathD(dispL, dispR, W, H);
  const farD  = flankPathD(roughen(mFar.left, 'far-L', 6), roughen(mFar.right, 'far-R', 7), W, H);
  const nearL = roughen(mNear.left, 'near-L', 7), nearR = roughen(mNear.right, 'near-R', 6);
  const nearD = flankPathD(nearL, nearR, W, H);

  svg += `<defs>
    <linearGradient id="sv-wash" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${S.paperHigh}"/>
      <stop offset="0.18" stop-color="${MIX(S.washHigh, S.stone, 0.18)}"/>
      <stop offset="0.42" stop-color="${MIX(S.wash, S.stone, 0.12)}"/>
      <stop offset="0.62" stop-color="${MIX(S.wash, S.sage, 0.30)}"/>
      <stop offset="0.85" stop-color="${MIX(S.wash, S.sage, 0.44)}"/>
      <stop offset="1" stop-color="${MIX(S.wash, S.sage, 0.30)}"/>
    </linearGradient>
    <linearGradient id="sv-sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${S.sky0}"/>
      <stop offset="1" stop-color="${S.sky1}"/>
    </linearGradient>
    <clipPath id="sv-main"><path d="${mainD}"/></clipPath>
    <clipPath id="sv-near"><path d="${nearD}"/></clipPath>
  </defs>`;

  /* --- the sheet ---------------------------------------------------------- */
  svg += `<rect width="${W}" height="${H}" fill="${S.paper}"/>`;
  svg += `<rect width="${W}" height="${plateY(0).toFixed(1)}" fill="url(#sv-sky)" opacity="0.7"/>`;

  /* altitude rules live on the paper; the mountains will occlude them, and
     dashed tie-stubs re-enter the silhouette afterwards */
  for (let e = 1000; e <= 5000; e += 1000) {
    const y = plateY(e).toFixed(1);
    svg += `<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${S.ink}" stroke-width="0.6" opacity="0.14"/>`;
  }
  for (let e = 500; e <= 5000; e += 1000) {
    const y = plateY(e).toFixed(1);
    svg += `<line x1="0" y1="${y}" x2="12" y2="${y}" stroke="${S.ink}" stroke-width="0.6" opacity="0.25"/>`;
    svg += `<line x1="${W - 12}" y1="${y}" x2="${W}" y2="${y}" stroke="${S.ink}" stroke-width="0.6" opacity="0.25"/>`;
  }

  /* --- a distant range on the horizon ------------------------------------- */
  {
    const hf = makeFbm(hashString('horizon'), 3);
    const base = plateY(650);
    let d = `M -40 ${H}`;
    for (let x = -40; x <= W + 40; x += 22) {
      d += ` L ${x} ${(base - hf(x * 0.004) * 150 - hf(x * 0.03) * 18).toFixed(1)}`;
    }
    d += ` L ${W + 40} ${H} Z`;
    svg += `<path d="${d}" fill="${MIX(S.paper, S.hazeFar, 0.5)}" opacity="0.7"/>`;
    svg += `<path d="${d}" fill="none" stroke="${S.inkSoft}" stroke-width="0.5" opacity="0.25"/>`;
  }

  /* --- the far massif ----------------------------------------------------- */
  svg += `<path d="${farD}" fill="${S.hazeFar}"/>`;
  svg += `<path d="${farD}" fill="none" stroke="${S.ink}" stroke-width="0.7" opacity="0.5"/>`;
  {
    const top = mFar.summit[1], bottom = plateY(300);
    for (let i = 1; i <= 7; i++) {
      const y = top + (bottom - top) * (i / 8) + 6;
      const xl = xAtY(mFar.left, y), xr = xAtY(mFar.right, y);
      if (xr - xl < 12) continue;
      /* broken, wandering form lines even on the far peak */
      for (let x = xl + 6; x < xr - 20; x += 30 + rand() * 30) {
        const seg = 14 + rand() * 22;
        svg += `<path d="M ${x.toFixed(1)} ${(y + (rand() - 0.5) * 5).toFixed(1)} q ${(seg / 2).toFixed(1)} ${(1 + rand() * 2).toFixed(1)} ${seg.toFixed(1)} 0" fill="none" stroke="${S.ink}" stroke-width="0.45" opacity="0.10"/>`;
      }
    }
    const capY = top + (bottom - top) * 0.14;
    const cf = makeFbm(hashString('farcap'), 2);
    const xl = xAtY(mFar.left, capY), xr = xAtY(mFar.right, capY);
    let cap = `M ${xl.toFixed(1)} ${capY.toFixed(1)} L ${mFar.summit[0].toFixed(1)} ${top.toFixed(1)} L ${xr.toFixed(1)} ${capY.toFixed(1)}`;
    for (let i = 12; i >= 0; i--) {
      const x = xl + (xr - xl) * (i / 12);
      cap += ` L ${x.toFixed(1)} ${(capY - 3 - cf(x * 0.02) * 22).toFixed(1)}`;
    }
    svg += `<path d="${cap} Z" fill="${S.paperHigh}" opacity="0.9"/>`;
    /* hachures on its shaded eastern face */
    for (let i = 0; i < 60; i++) {
      const y = top + rand() * (bottom - top) * 0.55;
      const xl2 = xAtY(mFar.left, y), xr2 = xAtY(mFar.right, y);
      if (xr2 - xl2 < 16) continue;
      const x = xl2 + (xr2 - xl2) * (0.55 + rand() * 0.4);
      svg += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + 2 + rand() * 3).toFixed(1)}" y2="${(y + 6 + rand() * 9).toFixed(1)}" stroke="${S.ink}" stroke-width="0.45" opacity="${(0.08 + rand() * 0.1).toFixed(2)}"/>`;
    }
  }

  /* ======================================================================
     THE MAIN MASSIF
     =================================================================== */
  svg += `<path d="${mainD}" fill="url(#sv-wash)"/>`;
  svg += `<g clip-path="url(#sv-main)">`;

  const summitX = mMain.summit[0], summitY = mMain.summit[1];
  const snowE = 4390;
  const lineNoise = makeFbm(hashString('formlines'), 2);
  const gapNoise = makeFbm(hashString('gaps'), 2);

  /* --- the ridge-and-gully skeleton: structure before texture ------------- */
  const gullies = [];
  for (let g = 0; g < 7; g++) {
    const gf = makeFbm(hashString('gully' + g), 3);
    const startE = 5060 - g * 30 - rand() * 120;
    const endE = 2400 + rand() * 900;
    const spread = (g - 3) / 3;                    /* -1 .. 1 across the face */
    const pts = [];
    for (let e = startE; e > endE; e -= 70) {
      const t = (startE - e) / (startE - endE);
      const xl = flankAt(e, -1), xr = flankAt(e, 1);
      const cx2 = (xl + xr) / 2;
      const x = cx2 + spread * (xr - xl) * 0.5 * Math.pow(t, 0.8)
              + (gf(e * 0.003) - 0.5) * 46 * t;
      pts.push([x, plateY(e), e]);
    }
    if (pts.length > 3) gullies.push(pts);
  }
  /* shadow: light falls from the upper left, so each gully's eastern side
     carries a soft tone — two nested translucent strips */
  gullies.forEach(gu => {
    [14, 30].forEach((off, oi) => {
      let d = `M ${gu[0][0].toFixed(1)} ${gu[0][1].toFixed(1)}`;
      gu.forEach(pt => { d += ` L ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`; });
      for (let i = gu.length - 1; i >= 0; i--) {
        d += ` L ${(gu[i][0] + off * (0.4 + 0.6 * (i / gu.length))).toFixed(1)} ${gu[i][1].toFixed(1)}`;
      }
      svg += `<path d="${d} Z" fill="${S.shade}" opacity="${oi ? 0.03 : 0.055}"/>`;
    });
    /* the gully line itself */
    let d = `M ${gu[0][0].toFixed(1)} ${gu[0][1].toFixed(1)}`;
    gu.forEach(pt => { d += ` L ${(pt[0] + (rand() - 0.5) * 2).toFixed(1)} ${pt[1].toFixed(1)}`; });
    svg += `<path d="${d}" fill="none" stroke="${S.ink}" stroke-width="0.5" opacity="0.22"/>`;
  });

  /* --- form lines: undulating, broken, spacing tightening with height ----- */
  for (let e = 260; e < snowE - 40; e += 70 + (1 - e / 5200) * 110) {
    const y0 = plateY(e);
    const xl = flankAt(e, -1), xr = flankAt(e, 1);
    if (xr - xl < 40) continue;
    const sag = (xr - xl) * 0.035;
    const lw = (0.4 + rand() * 0.45).toFixed(2);
    const lo = (0.06 + rand() * 0.13).toFixed(2);
    let d = '', drawing = false;
    for (let x = xl + 6; x < xr - 6; x += 14) {
      const u = (x - xl) / (xr - xl);
      const y = y0 + sag * 4 * u * (1 - u) + (lineNoise(x * 0.008 + e * 0.11) - 0.5) * 9;
      if (gapNoise(x * 0.02 + e * 0.37) < 0.34) { drawing = false; continue; }
      d += (drawing ? ` L` : ` M`) + ` ${x.toFixed(1)} ${y.toFixed(1)}`;
      drawing = true;
    }
    if (d) svg += `<path d="${d}" fill="none" stroke="${S.ink}" stroke-width="${lw}" opacity="${lo}"/>`;
  }

  /* --- the glacier: the most worked surface on the sheet ------------------- */
  const glacier = [];
  {
    const gf = makeFbm(hashString('glacier'), 3);
    for (let e = snowE + 170; e >= 3450; e -= 26) {
      const t = (snowE + 170 - e) / (snowE + 170 - 3450);
      const x = plateCX(e) - 26 - t * 150 + (gf(e * 0.002) - 0.5) * 30;
      let w = 26 + t * 44;
      if (t > 0.88) w *= (1 - (t - 0.88) / 0.12) * 0.8 + 0.2;
      glacier.push([x, plateY(e), w, e, t]);
    }
    let d = `M ${(glacier[0][0] - glacier[0][2] / 2).toFixed(1)} ${glacier[0][1].toFixed(1)}`;
    glacier.forEach(g => { d += ` L ${(g[0] - g[2] / 2 + (rand() - 0.5) * 3).toFixed(1)} ${g[1].toFixed(1)}`; });
    for (let i = glacier.length - 1; i >= 0; i--) {
      const g = glacier[i]; d += ` L ${(g[0] + g[2] / 2 + (rand() - 0.5) * 3).toFixed(1)} ${g[1].toFixed(1)}`;
    }
    svg += `<path d="${d} Z" fill="${MIX(S.ice, '#cfe0e8', 0.45)}"/>`;
    svg += `<path d="${d} Z" fill="none" stroke="${S.iceLine}" stroke-width="0.6" opacity="0.7"/>`;

    /* transverse crevasse arcs: bowed down-glacier, tighter mid-tongue,
       fainter at the head, strong at the snout — never touching both edges */
    glacier.forEach((g, i) => {
      if (g[2] < 12) return;
      const steep = (i > glacier.length * 0.35 && i < glacier.length * 0.6);
      if (!steep && i % 2) return;
      const inset = g[2] * (0.12 + rand() * 0.1);
      const x0 = g[0] - g[2] / 2 + inset, x1 = g[0] + g[2] / 2 - inset;
      const bow = g[2] * (0.14 + rand() * 0.08);
      svg += `<path d="M ${x0.toFixed(1)} ${(g[1] + (rand() - 0.5) * 3).toFixed(1)} Q ${g[0].toFixed(1)} ${(g[1] + bow).toFixed(1)} ${x1.toFixed(1)} ${(g[1] + (rand() - 0.5) * 3).toFixed(1)}" fill="none" stroke="${S.iceLine}" stroke-width="${(0.4 + g[4] * 0.3).toFixed(2)}" opacity="${(0.3 + g[4] * 0.45).toFixed(2)}"/>`;
      /* marginal crevasses: short ticks angled up-glacier at the edges */
      if (i % 3 === 0) {
        [-1, 1].forEach(sd => {
          const mx = g[0] + sd * (g[2] / 2 - 3);
          svg += `<line x1="${mx.toFixed(1)}" y1="${g[1].toFixed(1)}" x2="${(mx - sd * 5).toFixed(1)}" y2="${(g[1] - 5).toFixed(1)}" stroke="${S.iceLine}" stroke-width="0.45" opacity="0.5"/>`;
        });
      }
    });
    /* medial moraine: a wandering dashed dark line down the lower tongue */
    {
      const half = glacier.filter((g, i) => i > glacier.length * 0.42);
      let d2 = '';
      half.forEach((g, i) => {
        d2 += (i ? ' L' : 'M') + ` ${(g[0] + (rand() - 0.5) * 4).toFixed(1)} ${g[1].toFixed(1)}`;
      });
      svg += `<path d="${d2}" fill="none" stroke="${S.moraine}" stroke-width="1" stroke-dasharray="2.5 3" opacity="0.65"/>`;
    }
    /* lateral moraines */
    glacier.forEach((g, i) => {
      if (i < 3 || i % 2) return;
      [-1, 1].forEach(sd => {
        svg += `<circle cx="${(g[0] + sd * (g[2] / 2 + 3.5) + (rand() - 0.5) * 2.5).toFixed(1)}" cy="${(g[1] + (rand() - 0.5) * 3).toFixed(1)}" r="${(0.7 + rand() * 0.8).toFixed(2)}" fill="${S.moraine}" opacity="0.55"/>`;
      });
    });
    /* the snout: terminal moraine arcs, rubble, and the meltwater stream */
    const tm = glacier[glacier.length - 1];
    for (let a = 0; a < 3; a++) {
      svg += `<path d="M ${(tm[0] - 18 - a * 5).toFixed(1)} ${(tm[1] + 6 + a * 6).toFixed(1)} q ${18 + a * 5} ${9 + a * 2} ${(18 + a * 5) * 2} 0" fill="none" stroke="${S.moraine}" stroke-width="0.7" opacity="${0.5 - a * 0.12}" stroke-dasharray="1.5 2.5"/>`;
    }
    for (let i = 0; i < 26; i++) {
      svg += `<circle cx="${(tm[0] + (rand() - 0.5) * 56).toFixed(1)}" cy="${(tm[1] + 4 + rand() * 26).toFixed(1)}" r="${(0.6 + rand() * 0.9).toFixed(2)}" fill="${S.moraine}" opacity="${(0.3 + rand() * 0.3).toFixed(2)}"/>`;
    }
    const sf2 = makeFbm(hashString('stream'), 3);
    let sd2 = `M ${tm[0].toFixed(1)} ${tm[1].toFixed(1)}`;
    for (let e = 3400; e >= 180; e -= 50) {
      sd2 += ` L ${(tm[0] - (3400 - e) * 0.02 + (sf2(e * 0.003) - 0.5) * 30 * (1 + (3400 - e) / 3200)).toFixed(1)} ${plateY(e).toFixed(1)}`;
    }
    svg += `<path d="${sd2}" fill="none" stroke="${S.water}" stroke-width="1.1" opacity="0.8"/>`;
  }
  const nearGlacier = (x, y) => glacier.some(g => Math.abs(g[1] - y) < 30 && Math.abs(g[0] - x) < g[2] / 2 + 10);

  /* --- hachures: seeded off the skeleton, following the fall line ---------- */
  gullies.forEach((gu, gi) => {
    gu.forEach((pt, i2) => {
      if (pt[2] < 2600) return;
      const y = pt[1];
      const xl = flankAt(pt[2], -1), xr = flankAt(pt[2], 1);
      const steep = Math.min(1, (pt[2] - 2400) / 2400);
      /* shaded (east) side dense, lit side sparse */
      [[1, 3], [-1, 1]].forEach(([sd, count]) => {
        for (let k = 0; k < count; k++) {
          const off = sd * (6 + k * 9 + rand() * 6);
          const x = pt[0] + off;
          if (x < xl + 8 || x > xr - 8 || nearGlacier(x, y)) continue;
          if (pt[2] > snowE && rand() < 0.7) continue;
          const lean = (x - (xl + xr) / 2) * 0.055 + (rand() - 0.5) * 2;
          const len = (8 + steep * 14) * (0.7 + rand() * 0.6);
          svg += `<line x1="${x.toFixed(1)}" y1="${(y + (rand() - 0.5) * 20).toFixed(1)}" x2="${(x + lean).toFixed(1)}" y2="${(y + len).toFixed(1)}" stroke="${S.ink}" stroke-width="${(0.4 + steep * 0.35 + rand() * 0.2).toFixed(2)}" opacity="${((sd > 0 ? 0.16 : 0.09) + rand() * 0.12).toFixed(2)}"/>`;
        }
      });
    });
  });
  /* free-standing outcrops between the gullies */
  for (let i = 0; i < 30; i++) {
    const e = 1600 + rand() * 2500;
    const y0 = plateY(e);
    const xl = flankAt(e, -1), xr = flankAt(e, 1);
    if (xr - xl < 40) continue;
    const x0 = xl + 10 + rand() * (xr - xl - 20);
    if (nearGlacier(x0, y0)) continue;
    let d = `M ${x0.toFixed(1)} ${y0.toFixed(1)}`;
    let x = x0, y = y0;
    for (let k = 0; k < 4 + Math.floor(rand() * 5); k++) {
      x += 2.5 + rand() * 5; y += (rand() - 0.62) * 5;
      d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    svg += `<path d="${d}" fill="none" stroke="${S.ink}" stroke-width="0.55" opacity="0.3"/>`;
    for (let k = 0; k < 3; k++) {
      const hx = x0 + rand() * (x - x0);
      svg += `<line x1="${hx.toFixed(1)}" y1="${(y0 + 2).toFixed(1)}" x2="${(hx + 1 + rand() * 2).toFixed(1)}" y2="${(y0 + 6 + rand() * 6).toFixed(1)}" stroke="${S.ink}" stroke-width="0.45" opacity="0.18"/>`;
    }
  }

  /* --- the permanent snow -------------------------------------------------
     Drawn as the region above a wandering snowline, clipped to the massif —
     so the cap's upper edge IS the serrated silhouette, and its lower edge is
     an uneven line that drops tongues down the gullies. */
  {
    const sf = makeFbm(hashString('snowline'), 3);
    const yS = plateY(snowE);
    const xl = flankAt(snowE, -1), xr = flankAt(snowE, 1);
    const linePts = [];
    for (let x = xl - 60; x <= xr + 60; x += 9) {
      let y = yS + (sf(x * 0.012) - 0.5) * 44 + (sf(x * 0.05) - 0.5) * 14;
      /* tongues of snow running down the gullies */
      gullies.forEach(gu => {
        gu.forEach(pt => {
          if (pt[1] < yS - 20 || pt[1] > yS + 130) return;
          const dx = Math.abs(pt[0] - x);
          if (dx < 24) y = Math.max(y, yS + (1 - dx / 24) * (40 + (pt[0] * 7 % 41)));
        });
      });
      linePts.push([x, y]);
    }
    let d = `M ${linePts[0][0].toFixed(1)} ${linePts[0][1].toFixed(1)}`;
    linePts.forEach(pt => { d += ` L ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`; });
    d += ` L ${(xr + 60).toFixed(1)} -60 L ${(xl - 60).toFixed(1)} -60 Z`;
    svg += `<path d="${d}" fill="${S.paperHigh}" opacity="0.96"/>`;
    /* the snowline itself, inked lightly */
    let ld = `M ${linePts[0][0].toFixed(1)} ${linePts[0][1].toFixed(1)}`;
    linePts.forEach(pt => { ld += ` L ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`; });
    svg += `<path d="${ld}" fill="none" stroke="${S.iceLine}" stroke-width="0.5" opacity="0.45"/>`;

    /* faint hand-traced contour lines inside the snow */
    for (let e = snowE + 90; e < 5150; e += 95) {
      const y0 = plateY(e);
      const l2 = flankAt(e, -1), r2 = flankAt(e, 1);
      if (r2 - l2 < 26) continue;
      let dd = '', drawing = false;
      for (let x = l2 + 5; x < r2 - 5; x += 12) {
        const y = y0 + (sf(x * 0.02 + e) - 0.5) * 6;
        if (gapNoise(x * 0.03 + e * 0.7) < 0.3) { drawing = false; continue; }
        dd += (drawing ? ' L' : ' M') + ` ${x.toFixed(1)} ${y.toFixed(1)}`;
        drawing = true;
      }
      if (dd) svg += `<path d="${dd}" fill="none" stroke="${S.iceLine}" stroke-width="0.45" opacity="0.35"/>`;
    }
    /* exposed rock windows above the snowline */
    for (let i = 0; i < 3; i++) {
      const e = snowE + 160 + rand() * 380;
      const l2 = flankAt(e, -1), r2 = flankAt(e, 1);
      if (r2 - l2 < 40) continue;
      const x = l2 + (r2 - l2) * (0.2 + rand() * 0.6);
      for (let k = 0; k < 8; k++) {
        svg += `<line x1="${(x + (rand() - 0.5) * 16).toFixed(1)}" y1="${(plateY(e) + (rand() - 0.5) * 10).toFixed(1)}" x2="${(x + (rand() - 0.5) * 16 + 2).toFixed(1)}" y2="${(plateY(e) + 8 + rand() * 6).toFixed(1)}" stroke="${S.ink}" stroke-width="0.5" opacity="0.3"/>`;
      }
    }
    /* snow patches below the line, thinning downhill */
    for (let i = 0; i < 30; i++) {
      const e = snowE - 40 - Math.pow(rand(), 1.6) * 520;
      const y = plateY(e);
      const l2 = flankAt(e, -1), r2 = flankAt(e, 1);
      if (r2 - l2 < 30) continue;
      const x = l2 + 10 + rand() * (r2 - l2 - 20);
      if (nearGlacier(x, y)) continue;
      const w2 = 7 + rand() * 14;
      svg += `<path d="M ${(x - w2 / 2).toFixed(1)} ${y.toFixed(1)} Q ${x.toFixed(1)} ${(y - 4 - rand() * 3).toFixed(1)} ${(x + w2 / 2).toFixed(1)} ${y.toFixed(1)} Q ${x.toFixed(1)} ${(y + 2.5).toFixed(1)} ${(x - w2 / 2).toFixed(1)} ${y.toFixed(1)} Z" fill="${S.paperHigh}" stroke="${S.iceLine}" stroke-width="0.35" opacity="0.85"/>`;
    }
    svg += `<path d="M ${(summitX - 34).toFixed(1)} ${(summitY + 46).toFixed(1)} q 18 7 40 3" fill="none" stroke="${S.iceLine}" stroke-width="0.8" opacity="0.55"/>`;
  }

  /* --- forest in stands, with a ragged treeline ---------------------------- */
  const TREE_INKS = [S.sageDeep, MIX(S.sageDeep, S.ink, 0.35), MIX(S.sageDeep, S.sage, 0.4)];
  const treeGlyph = (x, y, h, v, inkc) => {
    if (v === 0)      /* two-tier spruce */
      return `<path d="M ${x.toFixed(1)} ${(y - h).toFixed(1)} l ${(h * 0.3).toFixed(1)} ${(h * 0.45).toFixed(1)} l ${(-h * 0.14).toFixed(1)} 0 l ${(h * 0.26).toFixed(1)} ${(h * 0.55).toFixed(1)} l ${(-h * 0.84).toFixed(1)} 0 l ${(h * 0.26).toFixed(1)} ${(-h * 0.55).toFixed(1)} l ${(-h * 0.14).toFixed(1)} 0 Z" fill="none" stroke="${inkc}" stroke-width="0.55" opacity="0.8"/>`;
    if (v === 1)      /* plain conifer */
      return `<path d="M ${x.toFixed(1)} ${(y - h).toFixed(1)} l ${(h * 0.36).toFixed(1)} ${h.toFixed(1)} h ${(-h * 0.72).toFixed(1)} Z" fill="none" stroke="${inkc}" stroke-width="0.55" opacity="0.75"/>`;
    return `<g opacity="0.7"><line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(y - h * 0.5).toFixed(1)}" stroke="${inkc}" stroke-width="0.5"/><circle cx="${x.toFixed(1)}" cy="${(y - h * 0.72).toFixed(1)}" r="${(h * 0.3).toFixed(1)}" fill="none" stroke="${inkc}" stroke-width="0.5"/></g>`;
  };
  const tf = makeFbm(hashString('treeline'), 2);
  const treelineAt = x => 2520 + (tf(x * 0.006) - 0.5) * 300;
  {
    /* clump centres, biased toward the lower forest */
    const clumps = [];
    for (let i = 0; i < 34; i++) {
      const e = 600 + Math.pow(rand(), 1.3) * 1900;
      const xl = flankAt(e, -1), xr = flankAt(e, 1);
      if (xr - xl < 60) continue;
      clumps.push({ x: xl + 20 + rand() * (xr - xl - 40), e, n: 6 + Math.floor(rand() * 13) });
    }
    clumps.forEach(c => {
      /* a dark understorey blob beneath the bigger stands */
      if (c.n > 11) {
        svg += `<ellipse cx="${c.x.toFixed(1)}" cy="${plateY(c.e).toFixed(1)}" rx="${(c.n * 2.6).toFixed(1)}" ry="${(c.n * 1.1).toFixed(1)}" fill="${S.sageDeep}" opacity="0.10"/>`;
      }
      for (let k = 0; k < c.n; k++) {
        const gx = c.x + (rand() + rand() + rand() - 1.5) * 30;
        const ge = c.e + (rand() + rand() - 1) * 130;
        if (ge > treelineAt(gx)) continue;
        const y = plateY(ge);
        const xl = flankAt(ge, -1), xr = flankAt(ge, 1);
        if (gx < xl + 8 || gx > xr - 8 || nearGlacier(gx, y)) continue;
        const near2 = 1 - Math.min(1, Math.max(0, (treelineAt(gx) - ge)) / 500);
        const h = (7 + rand() * 6) * (1 - near2 * 0.5);
        svg += treeGlyph(gx, y + rand() * 12, h, rand() < 0.62 ? (rand() < 0.5 ? 0 : 1) : 2, TREE_INKS[Math.floor(rand() * 3)]);
      }
    });
    /* krummholz: dwarf stragglers above the treeline */
    for (let i = 0; i < 14; i++) {
      const x = flankAt(2600, -1) + rand() * (flankAt(2600, 1) - flankAt(2600, -1));
      const e = treelineAt(x) + rand() * 160;
      const y = plateY(e);
      if (nearGlacier(x, y)) continue;
      svg += treeGlyph(x, y, 3 + rand() * 2.5, 1, TREE_INKS[1]);
    }
  }
  /* alpine meadow ticks */
  for (let e = 2750; e < 3550; e += 60) {
    const y = plateY(e);
    const xl = flankAt(e, -1), xr = flankAt(e, 1);
    const n = Math.round((xr - xl) / 90);
    for (let i = 0; i < n; i++) {
      const x = xl + 10 + rand() * (xr - xl - 20);
      if (nearGlacier(x, y)) continue;
      svg += `<path d="M ${x.toFixed(1)} ${(y + rand() * 24).toFixed(1)} l 1.4 -3.4 m 1.2 3.4 l 1.4 -3.0" fill="none" stroke="${S.sageDeep}" stroke-width="0.5" opacity="0.5"/>`;
    }
  }
  /* cultivated terraces */
  for (let i = 0; i < 22; i++) {
    const e = 420 + rand() * 800;
    const side = rand() < 0.55 ? -1 : 1;
    const y = plateY(e);
    const x0 = flankAt(e, side) - side * (30 + rand() * 130);
    const wT = 34 + rand() * 46;
    for (let k = 0; k < 3 + Math.floor(rand() * 3); k++) {
      svg += `<line x1="${(x0 - wT / 2).toFixed(1)}" y1="${(y + k * 3.4).toFixed(1)}" x2="${(x0 + wT / 2).toFixed(1)}" y2="${(y + k * 3.4 - side * 1.4).toFixed(1)}" stroke="${S.sageDeep}" stroke-width="0.5" opacity="0.45"/>`;
    }
  }

  svg += `</g>`;   /* end main massif clip */
  svg += `<path d="${mainD}" fill="none" stroke="${S.ink}" stroke-width="1.3" opacity="0.75"/>`;

  /* dashed tie-stubs where the altitude rules meet the silhouette */
  for (let e = 1000; e <= 5000; e += 1000) {
    const y = plateY(e).toFixed(1);
    const xl = flankAt(e, -1), xr = flankAt(e, 1);
    if (xr - xl < 30) continue;
    svg += `<line x1="${xl.toFixed(1)}" y1="${y}" x2="${(xl + 18).toFixed(1)}" y2="${y}" stroke="${S.ink}" stroke-width="0.5" stroke-dasharray="2 2.5" opacity="0.35"/>`;
    svg += `<line x1="${(xr - 18).toFixed(1)}" y1="${y}" x2="${xr.toFixed(1)}" y2="${y}" stroke="${S.ink}" stroke-width="0.5" stroke-dasharray="2 2.5" opacity="0.35"/>`;
  }

  /* --- rivers: widening, meandering harder as they descend, one tributary -- */
  RIVERS.forEach((cfg, r) => {
    const rf = makeFbm(hashString('sv-river-' + r), 3);
    let x = plateCX(cfg.source) + (r ? 22 : -22) + (cfg.offset || 0);
    const pts = [];
    for (let e = cfg.source; e >= -40; e -= 50) {
      const spread = 1 - e / 5200;
      x += (rf(e * 0.0016) - 0.5) * 50 * spread * spread * 2 + (r ? 1 : -1) * spread * 8;
      pts.push([x, plateY(e), e]);
    }
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length;
      const w = (0.55 + t * 1.9) * cfg.width;
      svg += `<line x1="${pts[i - 1][0].toFixed(1)}" y1="${pts[i - 1][1].toFixed(1)}" x2="${pts[i][0].toFixed(1)}" y2="${pts[i][1].toFixed(1)}" stroke="${S.waterPale}" stroke-width="${(w * 2.4).toFixed(2)}" opacity="0.7"/>`;
      svg += `<line x1="${pts[i - 1][0].toFixed(1)}" y1="${pts[i - 1][1].toFixed(1)}" x2="${pts[i][0].toFixed(1)}" y2="${pts[i][1].toFixed(1)}" stroke="${S.water}" stroke-width="${w.toFixed(2)}" opacity="0.85"/>`;
    }
    /* a tributary joining at an acute upslope angle */
    const joinIdx = Math.floor(pts.length * (0.55 + rand() * 0.2));
    const join = pts[joinIdx];
    const side = r ? -1 : 1;
    let tx = join[0] + side * (70 + rand() * 60), te = join[2] + 420 + rand() * 260;
    let td = `M ${tx.toFixed(1)} ${plateY(te).toFixed(1)}`;
    for (let e = te - 40; e > join[2]; e -= 40) {
      const u = (te - e) / (te - join[2]);
      tx = tx + (join[0] - tx) * u * 0.5 + (rf(e * 0.01) - 0.5) * 10;
      td += ` L ${tx.toFixed(1)} ${plateY(e).toFixed(1)}`;
    }
    td += ` L ${join[0].toFixed(1)} ${join[1].toFixed(1)}`;
    svg += `<path d="${td}" fill="none" stroke="${S.water}" stroke-width="0.6" opacity="0.6"/>`;
    /* braids on the plain */
    pts.filter(pt => pt[2] < 420 && pt[2] > 60).forEach((pt, i2) => {
      if (i2 % 2) return;
      svg += `<path d="M ${pt[0].toFixed(1)} ${pt[1].toFixed(1)} q ${8 + rand() * 6} 9 ${(rand() - 0.3) * 10} 20" fill="none" stroke="${S.water}" stroke-width="0.55" opacity="0.5"/>`;
    });
  });

  /* --- the foreground shoulder --------------------------------------------- */
  svg += `<path d="${nearD}" fill="${S.hazeNear}"/>`;
  svg += `<g clip-path="url(#sv-near)">`;
  {
    const top = mNear.summit[1], bottom = plateY(200);
    for (let i = 1; i <= 9; i++) {
      const y = top + (bottom - top) * (i / 10) + 4;
      const xl = xAtY(nearL, y), xr = xAtY(nearR, y);
      if (xr - xl < 14) continue;
      for (let x = xl + 5; x < xr - 18; x += 26 + rand() * 26) {
        const seg = 12 + rand() * 20;
        svg += `<path d="M ${x.toFixed(1)} ${(y + (rand() - 0.5) * 6).toFixed(1)} q ${(seg / 2).toFixed(1)} ${(1.5 + rand() * 2).toFixed(1)} ${seg.toFixed(1)} 0" fill="none" stroke="${S.ink}" stroke-width="0.5" opacity="0.13"/>`;
      }
    }
    for (let i = 0; i < 60; i++) {
      const y = top + rand() * (bottom - top) * 0.45;
      const xl = xAtY(nearL, y), xr = xAtY(nearR, y);
      if (xr - xl < 12) continue;
      const x = xl + (xr - xl) * (0.45 + rand() * 0.5);
      svg += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + (x - (xl + xr) / 2) * 0.06).toFixed(1)}" y2="${(y + 7 + rand() * 8).toFixed(1)}" stroke="${S.ink}" stroke-width="0.5" opacity="${(0.09 + rand() * 0.12).toFixed(2)}"/>`;
    }
    const capY = top + (bottom - top) * 0.1;
    const cf2 = makeFbm(hashString('nearcap'), 2);
    const xl = xAtY(nearL, capY), xr = xAtY(nearR, capY);
    let cap = `M ${xl.toFixed(1)} ${capY.toFixed(1)} L ${mNear.summit[0].toFixed(1)} ${top.toFixed(1)} L ${xr.toFixed(1)} ${capY.toFixed(1)}`;
    for (let i = 10; i >= 0; i--) {
      const x = xl + (xr - xl) * (i / 10);
      cap += ` L ${x.toFixed(1)} ${(capY - 2 - cf2(x * 0.03) * 14).toFixed(1)}`;
    }
    svg += `<path d="${cap} Z" fill="${S.paperHigh}" opacity="0.9"/>`;
  }
  svg += `</g>`;
  svg += `<path d="${nearD}" fill="none" stroke="${S.ink}" stroke-width="0.9" opacity="0.6"/>`;

  /* --- the town: clustered around its church, not a bar chart -------------- */
  {
    const cx0 = PLATE.cx - PLATE.base * 0.226, cy0 = plateY(70);
    const k = PLATE.base / 620;
    svg += `<g stroke="${S.ink}" stroke-width="0.55" fill="${MIX(S.paper, S.ink, 0.05)}">`;
    /* the church at the centre */
    svg += `<rect x="${(cx0 - 4 * k).toFixed(1)}" y="${(cy0 - 26 * k).toFixed(1)}" width="${(8 * k).toFixed(1)}" height="${(26 * k).toFixed(1)}"/>`;
    svg += `<path d="M ${(cx0 - 6 * k).toFixed(1)} ${(cy0 - 26 * k).toFixed(1)} L ${cx0.toFixed(1)} ${(cy0 - 40 * k).toFixed(1)} L ${(cx0 + 6 * k).toFixed(1)} ${(cy0 - 26 * k).toFixed(1)}" fill="none"/>`;
    /* houses scattered around it, denser near the centre */
    for (let i = 0; i < 26; i++) {
      const ang = rand() * Math.PI * 2;
      const dist = (10 + Math.pow(rand(), 0.7) * 150) * k;
      const bx = cx0 + Math.cos(ang) * dist;
      const by = cy0 + (rand() - 0.5) * 6 - 0.5;
      const bw = (7 + rand() * 9) * k, bh = (5 + rand() * 7) * k;
      svg += `<rect x="${(bx - bw / 2).toFixed(1)}" y="${(by - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh.toFixed(1)}"/>`;
      if (rand() < 0.65) {
        svg += `<path d="M ${(bx - bw / 2 - 1).toFixed(1)} ${(by - bh).toFixed(1)} L ${bx.toFixed(1)} ${(by - bh - (2.5 + rand() * 2.5) * k).toFixed(1)} L ${(bx + bw / 2 + 1).toFixed(1)} ${(by - bh).toFixed(1)}" fill="none"/>`;
      }
    }
    svg += `</g>`;
    /* the old-town hatch */
    for (let i = 0; i < 4; i++) {
      svg += `<line x1="${(cx0 - 30 * k).toFixed(1)}" y1="${(cy0 - 4 - i * 3).toFixed(1)}" x2="${(cx0 + 30 * k).toFixed(1)}" y2="${(cy0 - 5.5 - i * 3).toFixed(1)}" stroke="${S.ink}" stroke-width="0.3" opacity="0.35"/>`;
    }
    /* fields: an irregular lattice on the plain */
    svg += `<g stroke="${S.sageDeep}" stroke-width="0.45" opacity="0.6">`;
    for (let i = 0; i < 12; i++) {
      const fx = cx0 + PLATE.base * 0.36 + i * 24 * k + rand() * 10;
      const fy = cy0 - 2 - (i % 3) * 8;
      const fw = 18 + rand() * 18, fh = 7 + rand() * 7;
      svg += `<rect x="${fx.toFixed(1)}" y="${(fy - fh).toFixed(1)}" width="${fw.toFixed(1)}" height="${fh.toFixed(1)}" fill="${i % 2 ? MIX(S.paper, S.sage, 0.25) : 'none'}" transform="rotate(${((rand() - 0.5) * 5).toFixed(1)} ${fx.toFixed(1)} ${fy.toFixed(1)})"/>`;
    }
    svg += `</g>`;
    svg += `<path d="M ${(cx0 - PLATE.base * 0.4).toFixed(1)} ${(cy0 + 6).toFixed(1)} L ${(cx0 + PLATE.base * 0.9).toFixed(1)} ${(cy0 - 2).toFixed(1)}" fill="none" stroke="${S.ink}" stroke-width="0.6" stroke-dasharray="4 3" opacity="0.4"/>`;
  }

  /* --- the observatories --------------------------------------------------- */
  OBSERVATORIES.forEach(o => {
    const k = (PLATE.base / 620) * o.scale;
    const x = Math.max(flankAt(o.elev, -1), flankAt(o.elev + 190, -1)) + 30 * k;
    svg += drawObservatory(x, plateY(o.elev), k,
      { built: S.inkSoft }, { ink: S.ink, accent2: S.iceLine, text: S.ink });
  });

  /* --- spot heights: the sheet finally carries measurements ----------------- */
  {
    const spots = [
      [summitX, summitY, 5200, 0, -8],
      [mFar.summit[0], mFar.summit[1], 4050, 0, -8],
      [mNear.summit[0], mNear.summit[1], 3180, 0, -8],
      [glacier[glacier.length - 1][0], glacier[glacier.length - 1][1], 3450, 14, 4]
    ];
    OBSERVATORIES.forEach(o => {
      const k = (PLATE.base / 620) * o.scale;
      const x = Math.max(flankAt(o.elev, -1), flankAt(o.elev + 190, -1)) + 30 * k;
      spots.push([x + 14, plateY(o.elev), o.elev, 12, 2]);
    });
    svg += `<g font-family="'Source Serif 4', Georgia, serif" font-style="italic" font-size="${T.spot}" fill="${S.ink}" opacity="0.8" style="paint-order:stroke" stroke="${S.paper}" stroke-width="2.8">`;
    spots.forEach(([x, y, e, dx, dy]) => {
      svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.1" fill="${S.ink}" stroke="none"/>`;
      svg += `<text x="${(x + 5 + dx).toFixed(1)}" y="${(y + dy).toFixed(1)}">${e.toLocaleString('en-CH').replace(/,/g, ' ')}</text>`;
    });
    svg += `</g>`;
  }

  /* --- the surveyor's red: traverse and stations ---------------------------- */
  const placedBoxes = [];
  /* the drawn instruments claim their space before any note is placed */
  OBSERVATORIES.forEach(o => {
    const k = (PLATE.base / 620) * o.scale;
    const x = Math.max(flankAt(o.elev, -1), flankAt(o.elev + 190, -1)) + 30 * k;
    const y = plateY(o.elev);
    placedBoxes.push({ x0: x - 20 * k, x1: x + 70 * k, y0: y - 36 * k, y1: y + 8 });
  });
  const collide = (bx) => placedBoxes.some(o =>
    !(bx.x1 < o.x0 || bx.x0 > o.x1 || bx.y1 < o.y0 || bx.y0 > o.y1));

  if (SURVEY_DECOR) {
    svg += `<path d="${pathD}" fill="none" stroke="${S.red}" stroke-width="0.9" stroke-dasharray="5 4" opacity="0.75"/>`;
    svg += `<g font-family="ui-monospace, Menlo, monospace" style="paint-order:stroke" stroke="${S.paper}" stroke-width="3">`;
    nodes.forEach((n, i) => {
      const st = PLATE_STORIES[n.index];
      svg += `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="2.6" fill="${S.paper}" stroke="${S.red}" stroke-width="0.9"/>`;
      /* the note is the story's TOPIC — the short label from stories-data.js,
         falling back to the full topic, then the title */
      const src = window.MRI_CONTENT && window.MRI_CONTENT.STORIES.find(x => x.num === st.num);
      const title = ((src && (src.label || src.topic)) || (st ? st.title : '')).replace(/’/g, "'").toUpperCase();
      let lines = [title];
      if (title.length > 22) {
        const mid = Math.floor(title.length / 2);
        let cut = title.lastIndexOf(' ', 24);
        if (cut < 6) cut = title.indexOf(' ', mid);
        if (cut > 0) lines = [title.slice(0, cut), title.slice(cut + 1)];
      }
      lines = lines.map(l2 => l2.length > 27 ? l2.slice(0, 25).replace(/\s+\S*$/, '') + '…' : l2);
      const wEst = Math.max(...lines.map(l2 => l2.length)) * T.note * 0.62 + 8;
      const hEst = lines.length * (T.note + 3) + 16;

      /* try sides and rungs until the note finds clear paper */
      let left = i % 2 === 0, ex = 0, ey = 0, ok = false;
      outer: for (let attempt = 0; attempt < 2 && !ok; attempt++) {
        for (let rung = 0; rung < 4; rung++) {
          const L = 58 + rung * 28;
          ex = n.x + (left ? -L : L);
          ey = n.y - (12 + rung * 22);
          const x0 = left ? ex - 16 - wEst : ex + 16;
          const box = { x0, x1: x0 + wEst, y0: ey - hEst + 6, y1: ey + 10 };
          if (!collide(box)) { placedBoxes.push(box); ok = true; break outer; }
        }
        left = !left;
      }
      svg += `<path d="M ${n.x.toFixed(1)} ${n.y.toFixed(1)} L ${ex.toFixed(1)} ${ey.toFixed(1)} l ${left ? -12 : 12} 0" fill="none" stroke="${S.inkSoft}" stroke-width="0.5" opacity="0.75" style="paint-order:normal"/>`;
      const tx = (ex + (left ? -16 : 16)).toFixed(1);
      const anchor = left ? 'end' : 'start';
      const pair = inkOn(n.y < plateY(snowE) + 6);
      lines.forEach((l2, li) => {
        svg += `<text x="${tx}" y="${(ey - 4 - (lines.length - 1 - li) * (T.note + 3)).toFixed(1)}" text-anchor="${anchor}" font-size="${T.note}" letter-spacing="1" fill="${pair.fill}" stroke="${pair.halo}" opacity="0.92">${esc(l2)}</text>`;
      });
      svg += `<text x="${tx}" y="${(ey + T.num + 1).toFixed(1)}" text-anchor="${anchor}" font-size="${T.num}" letter-spacing="1.5" fill="${S.red}">Nº ${String(i + 1).padStart(2, '0')}</text>`;
    });
    svg += `</g>`;
  }

  /* --- zone names, written on the terrain ----------------------------------- */
  svg += `<g font-family="'Source Serif 4', Georgia, serif" font-style="italic" font-size="${T.zone}" fill="${S.ink}" opacity="0.82" letter-spacing="3" style="paint-order:stroke" stroke="${S.paper}" stroke-width="4">`;
  BELTS.forEach((b, i) => {
    if (b.key === 'urban') return;
    const overSnow = b.key === 'ice';
    const e = (b.lo + b.hi) / 2 - (b.key === 'scree' ? 260 : 0);   /* scree name sits below the snow teeth */
    const y = plateY(e);
    const node = nodes.reduce((best, n) => Math.abs(n.y - y) < Math.abs(best.y - y) ? n : best, nodes[0]);
    const xl = flankAt(e, -1), xr = flankAt(e, 1);
    const leftRoom = node.x - xl, rightRoom = xr - node.x;
    const left = leftRoom > rightRoom;
    const x = left ? xl + leftRoom * 0.42 : node.x + rightRoom * 0.55;
    const label = b.label.charAt(0) + b.label.slice(1).toLowerCase().replace(' - ', ' — ');
    const wEst = label.length * T.zone * 0.58;
    const box = { x0: x - wEst / 2, x1: x + wEst / 2, y0: y - 12, y1: y + 8 };
    let yy = y;
    for (let t = 0; t < 3 && collide({ ...box, y0: yy - 14, y1: yy + 9 }); t++) yy += 26;
    placedBoxes.push({ x0: box.x0, x1: box.x1, y0: yy - 12, y1: yy + 8 });
    const pair = inkOn(overSnow);
    svg += `<text x="${x.toFixed(1)}" y="${(yy + 5).toFixed(1)}" text-anchor="middle" fill="${pair.fill}" stroke="${pair.halo}">${esc(label)}</text>`;
  });
  svg += `</g>`;

  /* margin altitude labels, consistent on both sides, over everything */
  svg += `<g font-family="ui-monospace, Menlo, monospace" font-size="${T.margin}" fill="${S.inkSoft}" style="paint-order:stroke" stroke="${S.paper}" stroke-width="2.8">`;
  for (let e = 1000; e <= 5000; e += 1000) {
    const y = (plateY(e) - 5).toFixed(1);
    svg += `<text x="18" y="${y}" opacity="0.75">${e} m</text>`;
    svg += `<text x="${W - 18}" y="${y}" text-anchor="end" opacity="0.75">${e} m</text>`;
  }
  svg += `</g>`;

  /* --- sheet frame ---------------------------------------------------------- */
  if (SURVEY_DECOR) {
    svg += `<rect x="10" y="10" width="${W - 20}" height="${H - 20}" fill="none" stroke="${S.ink}" stroke-width="2.2" opacity="0.8"/>`;
    svg += `<rect x="17" y="17" width="${W - 34}" height="${H - 34}" fill="none" stroke="${S.ink}" stroke-width="0.6" opacity="0.6"/>`;
  }

  svg += `</svg>`;
  return { svg, nodes, pathD, viewBox: `0 0 ${W} ${H}` };
}

function generateMountainPlate(seedKey) {
  const rand = makeRandom(hashString(seedKey));
  const uid = "plate";
  const W = PLATE.w, H = PLATE.h;
  const p = paletteAt(2600), C = beltColours(p);
  const beltPal = {}, beltC = {};
  BELTS.forEach(b => { beltPal[b.key] = paletteAt((b.lo + b.hi) / 2); beltC[b.key] = beltColours(beltPal[b.key]); });

  /* --- silhouette ----------------------------------------------------------
     Seen in profile a mountain is faceted, not wavy: a few long straight
     planes meeting at shoulders and arêtes. Each flank is therefore a polyline
     through a SMALL number of deliberate control points joined by straight
     segments — no per-facet noise, which is what previously read as a zig-zag.

     `k` multiplies the cone's own half-width at that height, so a value above
     1 steps the flank out into a shelf and a value below 1 pinches it into an
     arête. The two sides carry different sequences so the mountain is not
     symmetrical.

     The top of each flank is left alone: a multiplier other than 1 within a
     few hundred metres of the summit steps the ridge out into a small horn,
     and several of those together read as a crown rather than as a peak. The
     shelves only begin below SUMMIT_CLEAN. */
  const SUMMIT_CLEAN = 4200;
  const RIDGE_NODES = {
    left: [[5200, 1.00], [4600, 1.00], [4000, 0.97], [2900, 1.08],
           [1950, 0.99], [1080, 1.05], [380, 1.00], [0, 1.02]],
    right: [[5200, 1.00], [4600, 1.00], [4050, 1.06], [3050, 0.97],
            [2100, 1.05], [1150, 0.98], [430, 1.04], [0, 1.00]]
  };

  /* One massif: its own summit height, its own centre, and how far its colour
     is carried toward the haze. That last value is the distance cue — the
     further a peak is meant to read, the more of the sky is mixed into it. */
  function buildMassif(cfg) {
    const scale = cfg.summit / 5200;
    const flank = (side) => RIDGE_NODES[side < 0 ? 'left' : 'right'].map(([e, k]) => {
      const eh = e * scale;                       /* squash onto this summit */
      const base = plateHW(e) * cfg.spread;
      /* neutralise the shelf multipliers near the top, so the summit is one
         clean point rather than a cluster of little horns */
      const kk = e >= SUMMIT_CLEAN ? 1 : k;
      return [plateCX(eh) + cfg.dx + side * base * kk, plateY(eh)];
    });
    const L = flank(-1), R = flank(1);
    let d = `M ${R[0][0].toFixed(1)} ${R[0][1].toFixed(1)}`;
    R.forEach(pt => d += ` L ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`);
    d += ` L ${W + 200} ${H + 60} L ${-200} ${H + 60}`;
    for (let i = L.length - 1; i >= 0; i--) d += ` L ${L[i][0].toFixed(1)} ${L[i][1].toFixed(1)}`;
    d += " Z";
    /* the apex sits midway between the two flanks' top points, so a cap hung
       on it is centred rather than leaning to the left */
    return { d, left: L, right: R, cfg,
             summit: [(L[0][0] + R[0][0]) / 2, Math.min(L[0][1], R[0][1])] };
  }

  /* The shaded half. In the reference idiom the light is flat and hard-edged:
     one plane down the right side of every peak, not a gradient. Drawing it as
     its own polygon from summit to base keeps that edge crisp. */
  function shadedFace(m) {
    const R = m.right;
    let d = `M ${m.summit[0].toFixed(1)} ${m.summit[1].toFixed(1)}`;
    R.forEach(pt => d += ` L ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`);
    d += ` L ${m.summit[0].toFixed(1)} ${(H + 60).toFixed(1)} Z`;
    return d;
  }

  /* An angular cap, cut off by a jagged line rather than a horizontal one, so
     the snow reads as lying in the gullies rather than as a band. */
  function snowCap(m, drop, rnd) {
    const scale = m.cfg.summit / 5200;
    const yTop = m.summit[1], yCut = plateY((m.cfg.summit - drop));
    const at = (side) => {
      const arr = side < 0 ? m.left : m.right;
      for (let i = 1; i < arr.length; i++) {
        const a = arr[i - 1], b = arr[i];
        if (yCut >= a[1] && yCut <= b[1]) {
          const f = b[1] === a[1] ? 0 : (yCut - a[1]) / (b[1] - a[1]);
          return a[0] + (b[0] - a[0]) * f;
        }
      }
      return arr[arr.length - 1][0];
    };
    const xl = at(-1), xr = at(1);
    const span = yCut - yTop;
    let d = `M ${xl.toFixed(1)} ${yCut.toFixed(1)} L ${m.summit[0].toFixed(1)} ${yTop.toFixed(1)} L ${xr.toFixed(1)} ${yCut.toFixed(1)}`;
    /* The underside runs back right-to-left as a run of tongues of uneven
       depth — snow lying in the gullies. An even zig-zag read as a decorative
       border rather than as snow, so the depths are randomised and the teeth
       are deliberately not all the same width. */
    const teeth = 9;
    for (let i = teeth - 1; i >= 0; i--) {
      const t = i / (teeth - 1);
      /* No jitter on x. Displacing it could push a tooth past its neighbour,
         and the outline then doubled back on itself. */
      const x = xl + (xr - xl) * t;
      /* The two outermost points sit exactly on the flank, at the same height
         as the corner they meet. Without this the outline dropped from the
         corner straight back up to the first tooth, which drew a thin needle
         at each end of every cap — a horn on each side of all three peaks. */
      const edge = (i === teeth - 1 || i === 0);
      const deep = edge ? 0 : (i % 2 ? 0.05 + rnd() * 0.12 : 0.20 + rnd() * 0.18);
      d += ` L ${x.toFixed(1)} ${(yCut - span * deep).toFixed(1)}`;
    }
    return d + " Z";
  }

  /* Three peaks at three distances. The centre one is the mountain the stories
     climb and carries all the belts; the other two exist to give the frame
     depth, and are flat, hazier and capped only. Draw order is back to front:
     the right peak sits behind the main massif, the left one in front of it. */
  const MASSIFS = {
    far:  { summit: 4050, dx: PLATE.base * 1.00, spread: 0.58, haze: 0.62 },
    main: { summit: 5200, dx: 0,                  spread: 1.00, haze: 0.00 },
    /* the foreground shoulder is kept small and pushed well left: any bigger
       and it covers the bottom of the ascent path */
    near: { summit: 3180, dx: PLATE.base * -1.11, spread: 0.56, haze: 0.26 }
  };
  const mFar = buildMassif(MASSIFS.far);
  const mMain = buildMassif(MASSIFS.main);
  const mNear = buildMassif(MASSIFS.near);

  const left = mMain.left, right = mMain.right;
  const dM = mMain.d;


  /* linear interpolation along a flank, for anything that has to sit on it */
  function flankAt(e, side) {
    const arr = side < 0 ? left : right, y = plateY(e);
    for (let i = 1; i < arr.length; i++) {
      const a = arr[i - 1], b = arr[i];
      if ((y >= a[1] && y <= b[1]) || (y <= a[1] && y >= b[1])) {
        const f = b[1] === a[1] ? 0 : (y - a[1]) / (b[1] - a[1]);
        return a[0] + (b[0] - a[0]) * f;
      }
    }
    return plateCX(e) + side * plateHW(e);
  }

  /* slice, not meet: the plate is cropped from the sides rather than scaled
     down to fit, and layoutPlate() in render.js reproduces this same transform
     for the markers and the axis. */
  /* --- the ascent path and its 25 markers, in the same units --------------
     Dispatches are not evenly spaced in altitude, so two can land almost on
     top of each other. A relaxation pass pushes neighbours apart along x —
     staying on the face — and the path is then drawn THROUGH the final
     positions, so the line always connects the numbers it is meant to. */
  /* minimum spacing between consecutive markers, in plate units — raise this
     if numbers crowd, but remember the band below limits how far they can go.
     Set per layout: the portrait plate needs a larger floor because its
     markers sit closer together in screen pixels. */
  const MIN_SEP = PLATE.sep;
  const raw = PLATE_STORIES.map((st) => {
    const [x, y] = plateNode(st.elevation);
    return { index: st.index, id: st.id, elev: st.elevation, x, y };
  });
  for (let pass = 0; pass < 30; pass++) {
    for (let i = 1; i < raw.length; i++) {
      const a = raw[i - 1], b = raw[i];
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= MIN_SEP || dist === 0) continue;
      const push = (MIN_SEP - dist) * 0.5;
      const dir = dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx);
      a.x -= dir * push; b.x += dir * push;
    }
    raw.forEach((n) => {
      /* two constraints: stay on the face, and stay inside the 360-unit band
         either side of the plate's centre that a portrait phone still shows */
      const face = plateHW(n.elev) * 0.84, cx = plateCX(n.elev);
      n.x = Math.max(cx - face, Math.min(cx + face, n.x));
      /* the band either side of the centre line that a portrait phone still
         shows — widen with care, it is what keeps the path on a small screen */
      n.x = Math.max(PLATE.cx - PLATE.band, Math.min(PLATE.cx + PLATE.band, n.x));
    });
  }
  /* the hand-set corrections, applied last so nothing can undo them */
  raw.forEach((n, i) => {
    const d = NODE_NUDGE[i + 1];
    if (d) n.x += d * PLATE.base;
  });

  const nodes = raw.map(n => ({ ...n, xPct: (n.x / W) * 100, yPct: (n.y / H) * 100 }));

  /* the route runs from dispatch 01 to dispatch 25 and no further — a tail of
     path before the first number and after the last reads as unfinished */
  /* The line runs a little past both ends: below the first number so the
     climb reads as coming up out of the plain, and above the last so it
     carries clearly into the snow rather than stopping at a circle. */
  const via = nodes.map(n => [n.x, n.y]);
  const extend = (from, toward, len) => {
    const dx = from[0] - toward[0], dy = from[1] - toward[1];
    const m = Math.hypot(dx, dy) || 1;
    return [from[0] + (dx / m) * len, from[1] + (dy / m) * len];
  };

  /* Pull a point back onto the mountain. The tails are struck along the
     direction of travel, and near the summit that direction runs straight out
     of the peak — the line was ending above the apex, drawn in open sky. This
     converts the point's height back to an altitude, holds it inside the
     usable band, and then holds it inside the flanks at that altitude. */
  const onMassif = ([x, y]) => {
    const yTop = plateY(PATH_TAIL.ceiling), yFoot = plateY(PATH_TAIL.floor);
    const cy = Math.max(yTop, Math.min(yFoot, y));
    const e = 5200 * (PLATE.seaY - cy) / (PLATE.seaY - PLATE.topY);
    const half = plateHW(e) * PATH_TAIL.inset, c = plateCX(e);
    return [Math.max(c - half, Math.min(c + half, x)), cy];
  };

  const first = via[0], second = via[1] || via[0];
  const last = via[via.length - 1], penult = via[via.length - 2] || last;
  via.unshift(onMassif(extend(first, second, PATH_TAIL.foot)));
  via.push(onMassif(extend(last, penult, PLATE.base * PATH_TAIL.summitFrac)));

  let pathD = `M ${via[0][0].toFixed(1)} ${via[0][1].toFixed(1)}`;
  for (let i = 1; i < via.length - 1; i++) {
    const mx = (via[i][0] + via[i + 1][0]) / 2, my = (via[i][1] + via[i + 1][1]) / 2;
    pathD += ` Q ${via[i][0].toFixed(1)} ${via[i][1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  pathD += ` L ${via[via.length - 1][0].toFixed(1)} ${via[via.length - 1][1].toFixed(1)}`;

  /* --- the survey style ---------------------------------------------------
     A second rendering of the SAME geometry, in the idiom of the historical
     glacier survey plates: fine ink linework on paper, form lines, hachured
     rock, a drawn glacier with moraines, vegetation placed stem by stem, and
     the ascent as a red surveyor's traverse. The classic flat-vector style
     below is untouched; which one draws is chosen by window.MRI_PLATE_STYLE.
     Geometry, nodes and the path are shared, so the interaction layer cannot
     tell the difference. */
  if (PLATE_STYLE === 'survey') {
    return renderSurveyPlate({
      W, H, rand, mFar, mMain, mNear, flankAt, nodes, pathD
    });
  }

  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">`;
  svg += `<defs>
    <linearGradient id="sky-${uid}" x1="0" y1="0" x2="0" y2="1">
      ${PALETTE_STOPS.slice().reverse().map((st) =>
        `<stop offset="${((plateY(st.elev)) / H * 100).toFixed(1)}%" stop-color="${skyOf(st)}"/>`).join("")}
      <stop offset="100%" stop-color="${MIX(paletteAt(0).haze, paletteAt(0).accent, .30)}"/>
    </linearGradient>
    <linearGradient id="mist-${uid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${p.haze}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${p.haze}" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="shade-${uid}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.10"/>
      <stop offset="34%" stop-color="#FFFFFF" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.36"/>
    </linearGradient>
    <filter id="grain-${uid}" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    ${BELTS.map(b => beltPattern(b.key, `tx-${b.key}-${uid}`, beltC[b.key], beltPal[b.key], 0.62)).join("")}
    <clipPath id="massif-${uid}"><path d="${dM}"/></clipPath>
  </defs>`;

  svg += `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#sky-${uid})"/>`;

  /* distant ranges, low on the plate */
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    const pts = ridgeSurface(rand, W + 400, plateY(760 - i * 190), 300 - i * 70, 4 + i * 3, 2.0, 0.3)
      .map(pt => [pt[0] - 200, pt[1]]);
    let d = `M -220 ${H + 40}`;
    pts.forEach(pt => d += ` L ${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`);
    d += ` L ${W + 220} ${H + 40} Z`;
    svg += `<path d="${d}" fill="${MIX(MIX(p.haze, p.accent2, .2), p.ink, .3 + t * .4)}"/>`;
  }

  /* the far peak: flat, carried well toward the haze, capped */
  const farBody = MIX(MIX(p.ink, p.haze, .28), p.haze, MASSIFS.far.haze);
  svg += `<path d="${mFar.d}" fill="${farBody}"/>`;
  svg += `<path d="${shadedFace(mFar)}" fill="#000000" opacity="0.16"/>`;
  svg += `<path d="${snowCap(mFar, 330, rand)}" fill="${MIX(beltC.ice.ice, p.haze, MASSIFS.far.haze)}" opacity="0.9"/>`;

  /* --- the massif, sectioned into belts ----------------------------------- */
  svg += `<path d="${dM}" fill="${MIX(p.ink, p.haze, .28)}"/>`;
  svg += `<g clip-path="url(#massif-${uid})">`;
  BELTS.forEach((b) => {
    svg += `<rect x="-200" y="${plateY(b.hi).toFixed(1)}" width="${W + 400}" height="${(plateY(b.lo) - plateY(b.hi)).toFixed(1)}" fill="url(#tx-${b.key}-${uid})"/>`;
    svg += `<line x1="-200" y1="${plateY(b.hi).toFixed(1)}" x2="${W + 200}" y2="${plateY(b.hi).toFixed(1)}" stroke="${beltPal[b.key].text}" stroke-width="1.1" opacity="0.20"/>`;
  });
  /* snow patches lingering in the gullies just below the nival line — at this
     scale a glacier tongue reads as a drip, whereas patches read as snow */
  for (let g = 0; g < 9; g++) {
    const e = 4050 + rand() * 520;
    const xl = flankAt(e, -1), xr = flankAt(e, 1);
    const px = xl + (xr - xl) * (0.12 + rand() * 0.76);
    const pw = 8 + rand() * 22, ph = 4 + rand() * 12;
    svg += `<path d="M ${(px - pw).toFixed(1)} ${plateY(e).toFixed(1)}
      Q ${(px - pw * .4).toFixed(1)} ${(plateY(e) - ph).toFixed(1)} ${px.toFixed(1)} ${(plateY(e) - ph * .6).toFixed(1)}
      Q ${(px + pw * .5).toFixed(1)} ${(plateY(e) - ph * 1.2).toFixed(1)} ${(px + pw).toFixed(1)} ${plateY(e).toFixed(1)}
      Q ${px.toFixed(1)} ${(plateY(e) + ph * .5).toFixed(1)} ${(px - pw).toFixed(1)} ${plateY(e).toFixed(1)} Z"
      fill="${beltC.ice.ice}" opacity="${(0.55 + rand() * 0.4).toFixed(2)}"/>`;
  }

  /* hachures on the bare rock */
  svg += `<g opacity="0.20" stroke="${MIX(p.ink, "#000000", .45)}" stroke-width="1.4">`;
  for (let e = 4520; e > 3700; e -= 22) {
    const xl = flankAt(e, -1), xr = flankAt(e, 1);
    for (let k = 0; k < 5; k++) {
      const x = xl + (xr - xl) * ((k + .5) / 5) + (rand() - .5) * 24;
      svg += `<line x1="${x.toFixed(0)}" y1="${plateY(e).toFixed(0)}" x2="${(x + 4).toFixed(0)}" y2="${(plateY(e) + 15).toFixed(0)}"/>`;
    }
  }
  svg += `</g>`;
  /* rivers as tapering channels; their mouths are recorded so the city can be
     placed clear of them rather than sitting in the water */
  const riverMouths = [];
  RIVERS.forEach((cfg, r) => {
    const fbm = makeFbm(Math.floor(rand() * 1e6), 3);
    let x = plateCX(cfg.source) + (r ? 22 : -22) + (cfg.offset || 0);
    const mid = [];
    for (let e = cfg.source; e >= -120; e -= 60) {
      const spread = 1 - e / 5200;
      x += (fbm(e * 0.0016) - 0.5) * 46 * spread + (r ? 1 : -1) * spread * 9.5;
      mid.push([x, plateY(e), (0.8 + spread * spread * 7) * cfg.width]);
    }
    let d = `M ${(mid[0][0] - mid[0][2]).toFixed(1)} ${mid[0][1].toFixed(1)}`;
    for (let i = 1; i < mid.length; i++) d += ` L ${(mid[i][0] - mid[i][2]).toFixed(1)} ${mid[i][1].toFixed(1)}`;
    for (let i = mid.length - 1; i >= 0; i--) d += ` L ${(mid[i][0] + mid[i][2]).toFixed(1)} ${mid[i][1].toFixed(1)}`;
    svg += `<path d="${d} Z" fill="${beltC.crop.river}" opacity="0.45"/>`;
    mid.filter(m => m[1] > plateY(400)).forEach(m => riverMouths.push({ x: m[0], w: m[2] }));
  });
  /* forest: the tiling texture carries the belt, drawn stands carry the
     treeline — which is the most legible feature on any real mountain */
  for (let i = 0; i < 26; i++) {
    const e = 1300 + Math.pow(rand(), 0.7) * 1400;
    const xl = flankAt(e, -1), xr = flankAt(e, 1);
    svg += drawTrees(rand, xl + (xr - xl) * rand(), plateY(e), 90, 5 + Math.floor(rand() * 7),
                     beltC.forest, beltPal.forest, 1.5);
  }
  /* the treeline itself, thinning out at the top of the belt */
  for (let i = 0; i < 22; i++) {
    const e = 2450 + rand() * 260;
    const xl = flankAt(e, -1), xr = flankAt(e, 1);
    svg += drawTrees(rand, xl + (xr - xl) * rand(), plateY(e), 60, 1 + Math.floor(rand() * 3),
                     beltC.forest, beltPal.forest, 1.15);
  }

  /* one city, on the plain to the left of the massif */
  /* kept inside the crop-safe centre band, so the one city survives on a phone */
  svg += drawCity(rand, PLATE.cx - PLATE.base * 0.226, plateY(70),
                  PLATE.base * 0.74, beltC.urban, beltPal.urban, PLATE.base / 365);

  /* Two observatories on the western flank: one up in the nival belt, one down
     at the treeline. Their altitudes are chosen against the ascent — the high
     one sits just below the last station, the low one between the nineteenth
     and twentieth — so they read as part of the same climb. Each is set just
     inside the flank at its own height rather than at a fixed x, so it stays
     on the slope in either layout. */
  OBSERVATORIES.forEach(o => {
    const e = o.elev;
    const k = (PLATE.base / 620) * o.scale;
    /* Inset from the flank measured at the icon's TOP, not its base: the
       mountain narrows over the mast's 32 units of height, and at the first
       attempt the sensor ball ended up outside the silhouette and was clipped
       away. */
    const x = Math.max(flankAt(e, -1), flankAt(e + 190, -1)) + 30 * k;
    svg += drawObservatory(x, plateY(e), k, beltC[o.belt], beltPal[o.belt]);
  });
  svg += `<rect x="-200" y="0" width="${W + 400}" height="${H}" fill="url(#shade-${uid})"/>`;
  svg += `</g>`;
  /* the main peak's own shaded half and cap, over the belts. Kept light: the
     belts carry the altitude information and a solid plane would bury it. */
  svg += `<path d="${shadedFace(mMain)}" fill="#000000" opacity="0.13"/>`;
  svg += `<path d="${snowCap(mMain, 430, rand)}" fill="${MIX(beltC.ice.ice, p.haze, 0.14)}" opacity="0.95"/>`;
  svg += `<path d="${dM}" fill="none" stroke="${MIX(p.text, p.haze, .45)}" stroke-width="1.6" opacity="0.45"/>`;

  /* the near peak, in front of the main massif's lower left flank */
  const nearBody = MIX(MIX(p.ink, p.haze, .28), p.haze, MASSIFS.near.haze);
  svg += `<path d="${mNear.d}" fill="${nearBody}"/>`;
  svg += `<path d="${shadedFace(mNear)}" fill="#000000" opacity="0.20"/>`;
  svg += `<path d="${snowCap(mNear, 260, rand)}" fill="${MIX(beltC.ice.ice, p.haze, MASSIFS.near.haze)}" opacity="0.92"/>`;
  svg += `<path d="${mNear.d}" fill="none" stroke="${MIX(p.text, p.haze, .55)}" stroke-width="1.4" opacity="0.35"/>`;

  /* the inversion layer, drawn over the face */
  if (typeof CLOUD_SEA === "object" && CLOUD_SEA) {
    svg += `<g opacity="0.6">`;
    for (let i = 0; i < 30; i++) {
      const e = CLOUD_SEA.lo + rand() * (CLOUD_SEA.hi - CLOUD_SEA.lo);
      svg += `<ellipse cx="${(-80 + rand() * (W + 160)).toFixed(0)}" cy="${plateY(e).toFixed(0)}" rx="${(36 + rand() * 96).toFixed(0)}" ry="${(3 + rand() * 6).toFixed(0)}" fill="${beltC.forest.cloud}" opacity="${(0.14 + rand() * 0.22).toFixed(2)}"/>`;
    }
    svg += `</g>`;
  }

  svg += `<rect width="${W}" height="${H}" filter="url(#grain-${uid})" opacity="0.16" style="mix-blend-mode:overlay"/>`;
  svg += `</svg>`;

  return { svg, nodes, pathD, viewBox: `0 0 ${W} ${H}` };
}

/* =============================================================================
   E. LANDSCAPE PLATES — the four vistas and the summit
   ========================================================================== */
/**
 * @param opts { elev, massif, annotate, layers }
 *   massif:false → a vista: layered distant ranges seen from `elev`
 *   massif:true  → a dominant profile (used for the summit plate)
 */


/* --- boot -----------------------------------------------------------------
   Geometry is computed as soon as the story data exists, because the page
   needs the marker positions while it builds its component tree. The artwork
   is injected later, once the host <svg> has actually been rendered. */
(function () {
  'use strict';

  /* which layout the current geometry was built for */
  let builtFor = null;

  let builtTheme = null;

  function build(width) {
    if (typeof gsap === 'undefined' || !window.MRI_CONTENT) return false;
    builtTheme = currentTheme();
    PALETTE_STOPS = PALETTES[builtTheme] || PALETTES.dark;
    const L = layoutFor(width !== undefined ? width : window.innerWidth);
    PLATE = Object.assign({}, L, { cx: L.w / 2 });
    builtFor = L;
    PLATE_STORIES = buildStories();
    if (!PLATE_STORIES.length) return false;

    const plate = generateMountainPlate('mri-25');
    /* Two ways in to the same node. `nodes` is keyed by the story's editorial
       number from stories-data.js, which is what the page's own data uses.
       `byClimb` is keyed by position on the ascent, 1 at the foot to 25 at the
       summit — which is the number the reader actually sees on the marker, so
       it is the one anything reading a marker's label must use. */
    const nodes = {}, byClimb = {};
    plate.nodes.forEach(n => {
      const st = PLATE_STORIES[n.index];
      const node = { px: n.xPct, py: n.yPct, elevation: st.elevation,
                     num: st.num, climb: n.index + 1 };
      nodes[st.num] = node;
      byClimb[n.index + 1] = node;
    });
    window.MRI_PLATE = {
      svg: plate.svg, pathD: plate.pathD, viewBox: plate.viewBox,
      nodes, byClimb, stories: PLATE_STORIES, belts: BELTS,
      layout: builtFor, theme: builtTheme
    };
    return true;
  }

  if (!build()) {
    // stories-data.js or gsap not parsed yet — retry on a timer, not on an
    // animation frame, so a page opened in a background tab still builds
    const t0 = Date.now();
    (function retry() {
      if (build() || Date.now() - t0 > 20000) return;
      setTimeout(retry, 40);
    })();
  }


  /* --- putting the numbers where the path actually is ----------------------
     The plate is drawn with preserveAspectRatio="xMidYMid slice", so it is
     scaled to COVER its box and cropped at the sides. A marker positioned at
     "65% of the box" therefore does not sit at 65% of the plate — the two
     only agree at the centre line. This reproduces the browser's own slice
     transform and writes pixel positions, so every number stays welded to the
     terrain at any window size.

     The page sets those positions itself when it renders, so they are
     re-applied on resize and whenever it re-renders. */
  function placeMarkers() {
    const plate = window.MRI_PLATE;
    const host = document.querySelector('svg[data-mri-plate="done"]');
    if (!plate || !host) return;
    const box = host.getBoundingClientRect();
    if (!box.width || !box.height) return;

    const [, , VW, VH] = plate.viewBox.split(' ').map(Number);
    const scale = Math.max(box.width / VW, box.height / VH);
    const ox = (box.width - VW * scale) / 2;
    const oy = (box.height - VH * scale) / 2;

    const placed = [];
    document.querySelectorAll('button').forEach(btn => {
      if (!/border-radius:\s*50%/.test(btn.getAttribute('style') || '')) return;
      /* The label on a marker is its position on the climb, not its editorial
         number, so look it up that way. Reading it as an editorial number put
         every marker at the wrong altitude — the one labelled 01 went to the
         summit, because story 1 happens to be Glaciers. */
      const num = parseInt(btn.textContent.trim(), 10);
      const node = (plate.byClimb && plate.byClimb[num]) || plate.nodes[num];
      const wrap = btn.parentElement;
      if (!node || !wrap) return;
      const px = ox + (node.px / 100) * VW * scale;
      const py = oy + (node.py / 100) * VH * scale;
      wrap.style.left = px.toFixed(1) + 'px';
      wrap.style.top  = py.toFixed(1) + 'px';
      /* the circles shrink with the plate, so 25 of them still fit the climb */
      const dia = (plate.layout || LAYOUTS.wide).marker;
      btn.style.width = dia + 'px';
      btn.style.height = dia + 'px';
      btn.style.inset = ((40 - dia) / 2) + 'px';
      btn.style.fontSize = (dia <= 20 ? 8.5 : 10) + 'px';
      placed.push({ btn, px, py });
    });

    /* --- keeping the numbers legible as the path shortens ------------------
       The markers are a fixed size in CSS pixels, but the path they sit on
       shrinks with the window. Below a certain spacing their rings start to
       touch, and two heavy rings side by side read as one blob with digits
       lost inside it. So the ring thins as the markers close up — the number
       keeps its full contrast while the border gives way, rather than the
       other way round. */
    let nearest = Infinity;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const d = Math.hypot(placed[i].px - placed[j].px, placed[i].py - placed[j].py);
        if (d < nearest) nearest = d;
      }
    }
    if (isFinite(nearest)) {
      /* adjust the crowding response here: at COMFORT apart the ring is full
         weight, at TIGHT apart it is at its thinnest */
      const dia = (plate.layout || LAYOUTS.wide).marker;
      const COMFORT = dia * 1.9, TIGHT = dia * 0.92;
      const t = Math.max(0, Math.min(1, (COMFORT - nearest) / (COMFORT - TIGHT)));
      const w = (RING.full + (RING.thin - RING.full) * t).toFixed(2) + 'px';
      placed.forEach(({ btn }) => { btn.style.borderWidth = w; });
    }
  }

  /* --- the frame around the plate ------------------------------------------
     The plate used to sit in a bordered, rounded, tinted box the width of the
     text column. Now that it runs to the window edges, that box's own edges
     showed through underneath it as a second line inside the first — so the
     containers above the artwork are taken full-bleed and stripped of their
     frame and fill.

     The page owns these inline styles and rewrites them whenever it
     re-renders, so this is re-applied alongside the marker positions rather
     than done once. */
  function dressFrame() {
    const host = document.querySelector('svg[data-mri-plate="done"]');
    if (!host) return;
    const frame = host.parentElement;
    if (frame) {
      frame.style.width = '100vw';
      frame.style.maxWidth = '100vw';
      frame.style.marginLeft = 'calc(50% - 50vw)';
      frame.style.marginRight = 'calc(50% - 50vw)';
      /* Each layout states the shape of the box it wants. The wide one keeps
         the page's 16:9 frame and lets the plate be cropped at the sides, which
         is what makes the massif fill it. The portrait one asks for its own
         proportions so nothing is cropped and the ascent gets its full height —
         on a phone a 16:9 box leaves it nowhere to climb. */
      const L = (window.MRI_PLATE && window.MRI_PLATE.layout) || LAYOUTS.wide;
      frame.style.aspectRatio = String(L.frame);
      frame.style.height = 'auto';
    }
    /* Clear the frame off every wrapper between the artwork and the section.
       Walking by computed style rather than by a fixed depth: the box that
       carries the border is not always the same ancestor. */
    for (let n = host.parentElement, i = 0; n && i < 5; n = n.parentElement, i++) {
      if (n.tagName === 'SECTION' || n.tagName === 'BODY') break;
      n.style.setProperty('border', '0', 'important');
      n.style.setProperty('border-radius', '0', 'important');
      n.style.setProperty('background', 'transparent', 'important');
      n.style.setProperty('box-shadow', 'none', 'important');
      n.setAttribute('data-mri-undressed', String(i));
    }
  }

  /* Re-applying our own inline styles would retrigger the observer that
     called us, so the observer is paused for the duration. */
  let applying = false;
  function relayout() {
    if (applying) return;
    applying = true;
    // the two jobs are independent: if one fails the other must still run
    try { dressFrame(); } catch (e) { /* frame already dressed or gone */ }
    try { placeMarkers(); } catch (e) { /* markers not rendered yet */ }
    applying = false;
  }

  /* ring weights for the story markers, in CSS pixels */
  const RING = { full: 1.5, thin: 0.6 };

  /* Crossing the breakpoint means a different plate, not just a rescale: the
     artwork, the node positions and the marker size all change, so the whole
     thing is regenerated and re-injected. Within a layout, resizing only
     re-runs the cheap placement pass. */
  function onResize() {
    const want = layoutFor(window.innerWidth);
    if (window.MRI_PLATE && want !== window.MRI_PLATE.layout) {
      const host = document.querySelector('svg[data-mri-plate="done"]');
      if (host && build(window.innerWidth)) {
        host.removeAttribute('data-mri-plate');
        inject(host);
        return;
      }
    }
    relayout();
  }

  window.addEventListener('resize', onResize);

  /* The interface re-themes itself through CSS variables, but the plate is
     generated pixels — it has to be drawn again. */
  window.addEventListener('mri-theme', function () {
    const host = document.querySelector('svg[data-mri-plate="done"]');
    if (host && build(window.innerWidth)) {
      host.removeAttribute('data-mri-plate');
      inject(host);
    }
  });

  /* Put the artwork into the page's mountain host, and keep the host's own
     attributes in step with the plate's geometry. Called once when the host
     first appears, and again whenever the layout changes under it. */
  function inject(host) {
    if (!host || !window.MRI_PLATE) return false;

      const outer = document.createElement('div');
      outer.innerHTML = window.MRI_PLATE.svg;
      const art = outer.firstElementChild;
      host.setAttribute('viewBox', window.MRI_PLATE.viewBox);
      host.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      host.innerHTML = art.innerHTML;
      host.setAttribute('data-mri-plate', 'done');

      /* The massif's own silhouette is the last unfilled path in the drawing.
         Tagging it lets the opening animation draw that outline before the
         belts arrive, without motion.js needing to know how the plate is
         built. */
      const strokes = [...host.querySelectorAll('path[fill="none"][stroke]')];
      if (strokes.length) strokes[strokes.length - 1].setAttribute('data-mri-outline', '');

      /* the ascent path, drawn over the belts */
      const NS = 'http://www.w3.org/2000/svg';
      const g = document.createElementNS(NS, 'g');
      g.setAttribute('data-mri-route', '');
      const under = document.createElementNS(NS, 'path');
      under.setAttribute('d', window.MRI_PLATE.pathD);
      under.setAttribute('fill', 'none');
      under.setAttribute('stroke', '#05192A');
      under.setAttribute('stroke-width', '7');
      under.setAttribute('opacity', '.45');
      const line = document.createElementNS(NS, 'path');
      line.setAttribute('d', window.MRI_PLATE.pathD);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', '#DCE8F1');   // adjust route colour here
      line.setAttribute('stroke-width', '2.4');
      line.setAttribute('stroke-dasharray', '9 7');
      line.setAttribute('stroke-linecap', 'round');
      line.setAttribute('opacity', '.85');
      g.appendChild(under);
      g.appendChild(line);
      host.appendChild(g);

      /* Take the plate full-bleed. Its wrapper sits in a centred column with
         a max-width, so it is pulled back out to the viewport edges. The
         artwork is cropped from the sides rather than scaled, and the route
         is held near the centre line, so a wider frame only ever reveals more
         terrain — it never pushes the path off a narrow screen. */
      /* The page re-renders on hover and on filtering, rewriting the inline
         styles it owns — both the marker positions and the frame around the
         plate. Reassert ours whenever that happens.

         The watcher is attached BEFORE the first layout pass, so that a
         failure in either job cannot leave the page with no watcher at all —
         which is exactly what happened when the observer was created last. */
      const scope = host.closest('section') || host.parentElement.parentElement;
      if (scope) {
        new MutationObserver(() => relayout())
          .observe(scope, { childList: true, subtree: true, attributes: true,
                            attributeFilter: ['style'] });
      }

      relayout();

      /* The component can still re-render once or twice after we settle,
         restoring the styles it owns. Re-assert for a few seconds, then stop
         and leave it to the observer. */
      let ticks = 0;
      const settle = setInterval(() => {
        relayout();
        if (++ticks > 12) clearInterval(settle);
      }, 250);
    return true;
  }

  const t0 = Date.now();
  (function place() {
    const host = document.querySelector('svg[data-mri-plate]') ||
                 document.querySelector('svg[viewBox="0 0 1200 675"]');
    if (inject(host)) return;
    if (Date.now() - t0 > 20000) return;
    setTimeout(place, 60);
  })();
})();

})();
