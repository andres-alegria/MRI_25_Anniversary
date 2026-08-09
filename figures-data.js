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
     subtitle  one line under the heading when this figure is showing
     src       path to the image, 16:9, relative to index.html
     alt       description for screen readers — say what the figure shows,
               not that it is a figure
     caption   sits under the image; should tell a small story of its own
               rather than repeating the title
--------------------------------------------------------------------------- */

const FIGURES = [
  {
    id: 'policy',
    title: 'Policy Process',
    subtitle: 'Mountains and climate change in the IPCC and the UNFCCC',
    // Draft, generated from figures/src/fig1_policy_process.py. SVG while it is
    // still being edited; swap to a 16:9 JPG once finalised in Illustrator.
    src: 'figures/policy-process.svg',
    alt: 'Timeline showing that global environmental law named mountains only between 1992 and 1994, with recognition since coming through IPCC assessments, UN years and regional agreements.',
    caption: 'How mountain science has travelled into international climate policy — through IPCC assessment cycles and the UNFCCC, alongside the UN years and decades that opened space for it.'
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
  'Four figures that cut across the stories — the systems, measurements and processes they all sit inside.';

window.MRI_FIGURES = { FIGURES, FIGURES_EYEBROW, FIGURES_HEADING, FIGURES_STANDFIRST };
