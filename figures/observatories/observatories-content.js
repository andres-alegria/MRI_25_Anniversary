/* ---------------------------------------------------------------------------
   Mountain observatories figure - editorial content.
   All reader-facing text lives here, separate from the chart logic.
   Theme order must match THEME_ORDER in build_data.py (wx, cryo, hyd, eco,
   atm, obs).
--------------------------------------------------------------------------- */

window.MRI_OBS_CONTENT = {

  /* Theme labels and the variables each group watches (shown in tooltips
     and the About panel). The grouping of the inventory's 100 networks into
     these six themes is this figure's own - edit in build_data.py. */
  themes: [
    { id: "wx",   label: "Weather & climate",
      vars: "air temperature, precipitation, humidity, wind, radiation" },
    { id: "cryo", label: "Snow, ice & permafrost",
      vars: "snow depth and water equivalent, glacier mass balance, ground ice" },
    { id: "hyd",  label: "Rivers, lakes & soils",
      vars: "river discharge, lake levels, groundwater, soil moisture" },
    { id: "eco",  label: "Ecosystems & biodiversity",
      vars: "vegetation plots, species monitoring, soil & near-surface temperature" },
    { id: "atm",  label: "Atmosphere & carbon",
      vars: "greenhouse gases, aerosols, air quality, carbon & energy fluxes" },
    { id: "obs",  label: "Multi-domain observatories",
      vars: "integrated long-term monitoring across several disciplines at once" }
  ],

  allLabel: "All monitoring stations",

  /* Control / panel labels */
  ui: {
    networksSummary: "The networks behind the dots",
    elevationSummary: "Records by elevation",
    aboutSummary: "Essential variables",
    showAllNetworks: "Show all networks",
    showFewerNetworks: "Show fewer",
    elevationUnknownNote: "elevation not recorded for {n} records",
    elevFilterHint: "Click an elevation band to show only its records on the map; click again to release.",
    elevFilterNote: "elevation filter on ({n})",
    zoomIn: "Zoom in", zoomOut: "Zoom out", zoomReset: "Reset view",
    isolateHint: "Click a network to show only its sites on the map.",
    ranges: "Mountain ranges",
    dupNote: "One station can appear in several networks’ records."
  },

  /* Caption pieces - numbers are filled in from the data at run time. */
  caption: {
    tag: "Draft caption",
    /* {records} {networks} {ranges} {countries} {openPct} {v2} get replaced */
    text: "The GEO Mountains In Situ Inventory v3.2 locates {records} records of sustained environmental monitoring from {networks} networks and compilations, across {ranges} named mountain ranges in {countries} countries and territories; a station serving several networks appears once per network. The inventory has grown from over {v2} records in 2022, and {openPct}% of records point to openly available data."
  },

  sourceLine: "Data: GEO Mountains (2025), GMBA Mountain Inventory (2022)."
};
