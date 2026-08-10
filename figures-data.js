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
    subtitle: 'Mountains in global policy processes, through space and time',
    src: 'figures/policy-process.jpg',
    alt: 'A world map shading each country by the share of its territory that is mountainous — more than 30 per cent of global land — with 26 countries party to a regional mountain-specific agreement, and a timeline from 1990 to 2027 marking IPCC assessments, UNFCCC treaty decisions, UN General Assembly resolutions and global and regional instruments.',
    caption: 'More than 30% of the world’s land is mountainous, yet only 26 countries are party to an agreement written specifically for mountains — most of them in Europe. The timeline below tracks how scientific evidence has gradually underwritten the case for mountains in global policy.'
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
