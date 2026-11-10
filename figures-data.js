/* ---------------------------------------------------------------------------
   MRI 25th Anniversary — cross-cutting figures
   ---------------------------------------------------------------------------
   The four infographics that sit alongside the 25 stories rather than inside
   them. In the report these are chapter-level figures, which is why they are
   not numbered on the mountain.

   Like stories-data.js, this file is NOT touched by a Claude Design export,
   so captions and titles survive a re-export.

   Add or remove entries freely — the section takes any number of figures.

     id        short slug, used only as a key
     title     label on the switcher rail; keep it short, it has to fit
     subtitle  the figure's title, one line above it while it is showing
     intro     optional: two or three sentences under the title presenting the figure
     src       path to the image, 16:9, relative to index.html
     alt       description for screen readers — say what the figure shows,
               not that it is a figure
     embed     instead of src/alt: the name of a live figure drawn by
               embeds.js (only 'timeline' so far, from figures/timeline/)
     caption   sits under the figure; should tell a small story of its own
               rather than repeating the title. Leave empty for none.
--------------------------------------------------------------------------- */

const FIGURES = [
  {
    id: 'policy',
    title: 'Policy Process',
    subtitle: 'Mountains in global policy through time',
    intro: 'Since the Alpine Convention of 1991, mountains have found a growing place in global environmental policy: 24 agreements have been written specifically for them, 10 in the past 25 years alone. Hover over a year to see what was agreed, or open the panels below the chart for the mountain-specific agreements by family.',
    embed: 'timeline',
    caption: ''
  },
  {
    id: 'observatories',
    title: 'Observatories & ECVs',
    subtitle: 'Measuring the mountain cryosphere',
    src: 'figures/observatories-ecvs.jpg',
    alt: 'Placeholder image for the observatories and Essential Climate Variables figure.',
    caption: 'The network of high-elevation observatories, and the Essential Climate Variables they record. Coverage thins with altitude — which is precisely where change is fastest.'
  },
  {
    id: 'populations',
    title: 'Populations & Hazards',
    subtitle: 'Who lives in the world’s mountains, and what threatens them',
    src: 'figures/populations-hazards.jpg',
    alt: 'Placeholder image for the global populations and hazards figure.',
    caption: 'Mountain populations set against the hazards they are exposed to, worldwide — and the water relationships that carry both risk and supply downstream.'
  },
  {
    id: 'glaciers',
    title: 'Glaciers',
    subtitle: 'A quarter-century of retreat',
    src: 'figures/glaciers.jpg',
    alt: 'Placeholder image for the glaciers figure.',
    caption: 'What 25 years of observation has shown about the world’s mountain glaciers, and what their loss commits us to.'
  }
];

/* Section heading — adjust wording here */
const FIGURES_EYEBROW = 'SUMMARY FIGURES';
const FIGURES_HEADING = 'The bigger picture';
const FIGURES_STANDFIRST =
  'Four data visualizations that cut across our 25 stories — the policy, the science and the lived experiences and hopes they all carry.';

window.MRI_FIGURES = { FIGURES, FIGURES_EYEBROW, FIGURES_HEADING, FIGURES_STANDFIRST };
