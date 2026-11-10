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
               embeds.js ('timeline', 'observatories', 'hazards')
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
    subtitle: 'Observing the world’s mountains',
    intro: 'Each dot is a record of sustained monitoring in the world’s mountains — a weather station, stream gauge, glacier stake or vegetation plot in the GEO Mountains In Situ Inventory. A coordinated network of observatories allows us to monitor and compare global changes in mountains comparable from range to range.',
    embed: 'observatories',
    caption: ''
  },
  {
    id: 'populations',
    title: 'Populations & Hazards',
    subtitle: 'Living with risk in the world’s mountains',
    intro: 'In 2015, 1.28 billion people lived in mountain regions. As the climate warms, ' +
           'the risks they face from hazards such as landslides, floods and changing water ' +
           'resources rise with it — fastest across Asia, the Andes and the African ' +
           'highlands, where mountain populations keep growing.',
    embed: 'hazards',
    caption: ''
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
