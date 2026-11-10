/* ---------------------------------------------------------------------------
   Populations & hazards - editorial content
   ---------------------------------------------------------------------------
   Everything a reader sees as words lives here; hazards.js only draws.
   hazards-data.js (assessment) and hazards-geo.js (map + population, built
   by build_assets.py) should not be edited by hand.

     gwl          labels for the three warming-level chips + the water chip
     legend       risk-level and confidence wording
     hazardNames  the principal-hazard icons, spelled out
     cards        extra wording for the continental cards
     notes        post-AR6 updates shown in tooltips (region id -> text)
     footer       the downstream line + the source line
--------------------------------------------------------------------------- */

const HAZARDS_CONTENT = {
  gwl: [
    { id: 0, label: '1.3–1.7°C', note: 'about today' },
    { id: 1, label: '2.0–2.5°C' },
    { id: 2, label: '4°C' }
  ],
  waterChip: 'Risk from changing water resources',
  gwlGroupLabel: 'Landslide & flood risk at different global warming levels',

  legend: {
    levels: [
      ['mod',   'Moderate'],
      ['high',  'High'],
      ['vhigh', 'Very high'],
      ['na',    'Not assessed']
    ],
    confidence: 'confidence',
    confWord: ['low', 'medium', 'high', 'very high'],
    mountains: 'Mountain regions'
  },

  hazardNames: {
    glof:      'Glacial lake outburst flood',
    landslide: 'Landslide',
    rainsnow:  'Rain on snow',
    flood:     'River or pluvial flood'
  },

  /* cards: name + 2015 population + the assessed-hazards line */
  cards: {
    hazardRow: 'Assessed hazards',              // label for the hazard list on each card
    notAssessed: 'Risk not assessed at the continental scale in CCP5'
  },

  /* post-AR6 updates, shown as a "Since AR6" line in the dot tooltips.
     Keyed by subregion id. Sources (every number re-verified against the
     primary documents, 3 Nov 2026 - see REVIEW_traceability_2026-11-03.md):
     Taylor et al. 2023 (Nat. Commun., GLOFs), Yao et al. 2022 (Nat. Rev.
     Earth Environ.). The continent-card notes (Rusk 2022 HKH multi-hazard,
     FAO 2025 Africa growth, the Andes GLOF-research gap, Ferrer 2025) left
     with the card tooltips on 10 Nov - caption candidates. */
  notes: {
    TIB:  'The Asian water tower, which supplies almost 2 billion people, is losing its ' +
          'balance: warming is turning its ice and snow into liquid water unevenly, and is ' +
          'expected to ease water scarcity in the Yellow and Yangtze basins while deepening ' +
          'it in the Indus and Amu Darya (2022).',
    SAS:  'The first global count of people exposed to glacial lake outburst floods ' +
          'finds 15 million worldwide — India and Pakistan together hold about a ' +
          'third of them (2023).',
    NWS:  'Peru’s Santa basin ranks second worldwide among glacial-lake basins for ' +
          'outburst-flood risk, with some 0.9 million people exposed — yet the Andes ' +
          'receive under 8% of the research on these floods (2023).'
  },

  tooltip: {
    updated: 'Newer research since IPCC AR6',
    water: 'Water risk (1.5–2°C)',
    subregions: 'Mountain areas in this region'
  },

  matrixSummary: 'All assessed mountain areas, region by region',
  matrixKey: 'Confidence of the assessment:',   // leads the graphical dot key
  matrixCols: {
    region: 'Region',
    haz: 'Landslides & floods',
    water: 'Water'
  },

  footer: {
    source: 'Data: IPCC AR6 (Adler et al. 2022), Gridded ' +
            'Population of the World v4.11 (2018), GMBA Mountain Inventory (2022), ' +
            'Taylor et al. (2023) and Yao et al. (2022).'
  }
};

window.MRI_HAZARDS_CONTENT = HAZARDS_CONTENT;
