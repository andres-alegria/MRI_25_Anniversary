/* ---------------------------------------------------------------------------
   Populations & hazards - assessment data
   ---------------------------------------------------------------------------
   Hand-transcribed from the published IPCC AR6 WGII Cross-Chapter Paper 5
   (Mountains; Adler et al. 2022). Verified 8 Oct 2026 (see
   REVIEW_accuracy_2026-10-08.md): every risk level matches the sub-region
   averaged values in SM Tables SMCCP5.16/5.17 (0 mismatches of 64), and
   every confidence count was re-read from 300-dpi renders of the published
   figures. The SM tables write WAFS/SAE where the figures and the WGI Atlas
   use WSAF/SEA; the figures' codes are used here.

     Figure CCP5.5a  risk to people and infrastructure from landslides and/or
                     floods, per AR6 WGI reference region, at three global
                     warming levels (GWL); confidence as 1-4 dots.
     Figure CCP5.5b  the same risk aggregated per IPCC continental region,
                     plus the principal hazards for which evidence was
                     assessed.
     Figure CCP5.6   risk to livelihoods and the economy from changing
                     mountain water resources, per WGI reference region,
                     between 1.5 and 2 degrees C GWL; confidence 1-3 dots.

   Population numbers ride in separately (hazards-geo.js, generated from the
   CCP5 Supplementary Material tables). Editorial wording lives in
   hazards-content.js; hazards.js only draws.

   Risk levels: "mod" moderate, "high", "vhigh" very high, null not assessed.
   haz arrays are ordered [1.3-1.7C, 2.0-2.5C, 4C], each [level, confidence].
   water is one [level, confidence] pair (1.5-2C), or null where CCP5.6
   shows no marker for the region.
--------------------------------------------------------------------------- */

const HAZARDS_DATA = {

  /* IPCC continental regions - Figure CCP5.5b; risk ordered [1.3-1.7, 2.0-2.5, 4] */
  continents: [
    { id: 'asia',   name: 'Asia',
      risk: ['high', 'vhigh', 'vhigh'], hazards: ['glof', 'landslide', 'flood'] },
    { id: 'africa', name: 'Africa',
      risk: ['mod', 'high', 'high'],    hazards: ['flood'] },
    { id: 'csa',    name: 'Central and South America',
      risk: ['mod', 'high', 'high'],    hazards: ['glof', 'flood'] },
    { id: 'europe', name: 'Europe',
      risk: ['mod', 'mod', 'mod'],      hazards: ['rainsnow', 'flood', 'landslide'] },
    { id: 'nam',    name: 'North America',
      risk: ['mod', 'mod', 'mod'],      hazards: ['rainsnow', 'flood'] },
    { id: 'small',  name: 'Small Islands',
      risk: null,                       hazards: null },   // not assessed in CCP5.5b
    { id: 'aus',    name: 'Australasia',
      risk: ['mod', 'mod', 'mod'],      hazards: ['flood'] }
  ],

  /* AR6 WGI reference regions - Figures CCP5.5a and CCP5.6 */
  subregions: [
    { id: 'NWN',  name: 'North-Western North America', cont: 'nam',
      haz: [['mod', 1], ['mod', 1], ['mod', 2]],   water: ['mod', 3] },
    { id: 'WNA',  name: 'Western North America',       cont: 'nam',
      haz: [['mod', 1], ['mod', 2], ['mod', 2]],   water: ['mod', 3] },
    { id: 'CNA',  name: 'Central North America',       cont: 'nam',
      haz: null,                                   water: ['low', 2] },
    { id: 'NCA',  name: 'North Central America',       cont: 'nam',
      haz: null,                                   water: ['mod', 2] },
    { id: 'NWS',  name: 'North-Western South America', cont: 'csa',
      haz: [['mod', 4], ['high', 3], ['high', 2]], water: ['high', 2] },
    { id: 'SWS',  name: 'South-Western South America', cont: 'csa',
      haz: [null, null, null],                     water: ['high', 2] },
    { id: 'NES',  name: 'North-Eastern South America', cont: 'csa',
      haz: null,                                   water: ['mod', 2] },
    { id: 'SES',  name: 'South-Eastern South America', cont: 'csa',
      haz: null,                                   water: ['mod', 2] },
    { id: 'WCE',  name: 'Western and Central Europe',  cont: 'europe',
      haz: [['mod', 3], ['mod', 3], ['mod', 2]],   water: ['mod', 3] },
    { id: 'EEU',  name: 'Eastern Europe',              cont: 'europe',
      haz: null,                                   water: ['low', 3] },
    { id: 'MED',  name: 'Mediterranean',               cont: 'europe',
      haz: null,                                   water: ['mod', 2] },
    { id: 'ESB',  name: 'East Siberia',                cont: 'asia',
      haz: null,                                   water: ['high', 2] },
    { id: 'SAH',  name: 'Sahara',                      cont: 'africa',
      haz: null,                                   water: ['low', 2] },
    { id: 'WAF',  name: 'Western Africa',              cont: 'africa',
      haz: null,                                   water: ['mod', 2] },
    { id: 'CAF',  name: 'Central Africa',              cont: 'africa',
      haz: null,                                   water: ['low', 2] },
    { id: 'NEAF', name: 'North-Eastern Africa',        cont: 'africa',
      haz: [['mod', 1], ['high', 1], ['high', 2]], water: ['mod', 2] },
    { id: 'SEAF', name: 'South-Eastern Africa',        cont: 'africa',
      haz: [['mod', 1], ['mod', 1], ['high', 1]],  water: ['mod', 2] },
    { id: 'WSAF', name: 'West Southern Africa',        cont: 'africa',
      haz: null,                                   water: ['mod', 2] },
    { id: 'ARP',  name: 'Arabian Peninsula',           cont: 'asia',
      haz: null,                                   water: ['high', 2] },
    { id: 'WCA',  name: 'West Central Asia',           cont: 'asia',
      haz: [['mod', 1], ['high', 1], ['high', 1]], water: ['high', 3] },
    { id: 'TIB',  name: 'Tibetan Plateau',             cont: 'asia',
      haz: [['mod', 1], ['vhigh', 2], ['vhigh', 3]], water: ['high', 3] },
    { id: 'SAS',  name: 'South Asia',                  cont: 'asia',
      haz: [['high', 3], ['vhigh', 3], ['vhigh', 4]], water: ['vhigh', 3] },
    { id: 'EAS',  name: 'East Asia',                   cont: 'asia',
      haz: [['high', 2], ['vhigh', 3], ['vhigh', 2]], water: ['high', 2] },
    { id: 'SEA',  name: 'South-East Asia',             cont: 'asia',
      haz: null,                                   water: ['mod', 2] },
    { id: 'SAU',  name: 'Southern Australia',          cont: 'aus',
      haz: [['mod', 1], ['mod', 1], null],         water: ['mod', 2] },
    { id: 'NZ',   name: 'New Zealand',                 cont: 'aus',
      haz: [['mod', 1], ['mod', 1], null],         water: null }
  ]
};

window.MRI_HAZARDS_DATA = HAZARDS_DATA;
