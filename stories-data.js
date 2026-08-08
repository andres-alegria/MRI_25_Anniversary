/* ---------------------------------------------------------------------------
   MRI 25th Anniversary — story content
   ---------------------------------------------------------------------------
   All editorial content lives here, separate from the page logic in index.html.
   This file is NOT overwritten by a fresh Claude Design export, so story text
   survives a re-export. Only the wiring has to be re-applied (tools/deploy.sh).

   Each story:
     num          position in the 25-story sequence (drives placement on the mountain)
     title        headline as it appears on the page
     topic        the topic name from the MRI topics spreadsheet
     tags         cross-cutting themes, used by the tag filter (see TAG_VOCABULARY)
     authors      [{ name, institution }] — rendered as "Name, Institution"
     status       'draft'  = real text below
                  'pending' = awaiting contribution; short placeholder is shown
     lead         opening standfirst paragraph (rendered larger)
     body         array of blocks: { t: 'p' | 'quote' | 'sub', x: '...' }
                  'p'     normal paragraph (supports <em> and <strong>)
                  'quote' pull quote, set apart from the flow
                  'sub'   subheading within the story
     images       [{ src, caption, credit }] — files live in images/
--------------------------------------------------------------------------- */

/* Cross-cutting themes used by the filter chips. Deliberately short and small
   in number: tags are for grouping stories, so they only work if several
   stories share one. The long descriptive name from the topics spreadsheet is
   kept separately on each story as `topic`. Adjust wording here. */
const TAG_VOCABULARY = [
  'Glaciers & Ice',
  'Snow & Permafrost',
  'Water',
  'Climate',
  'Hazards',
  'Ecosystems',
  'Land Use',
  'Livelihoods',
  'Culture',
  'Governance',
  'Equity',
  'Knowledge'
];

/* Colour per theme — adjust palette here */
const TAG_COLORS = {
  'Glaciers & Ice':    '#6d9fb5',
  'Snow & Permafrost': '#8fb2c4',
  'Water':             '#33698f',
  'Climate':           '#b45a38',
  'Hazards':           '#a8453e',
  'Ecosystems':        '#5f8a4e',
  'Land Use':          '#7d6b45',
  'Livelihoods':       '#b08a3e',
  'Culture':           '#7a6a94',
  'Governance':        '#55707d',
  'Equity':            '#9c4f6d',
  'Knowledge':         '#6a7f5c'
};

/* Shown in place of the body for stories not yet drafted. Adjust wording here. */
const PENDING_TEXT = 'This story is in development. Its text will appear here once the contribution is in.';

const STORIES = [
  {
    num: 1,
    title: 'Glaciers',
    topic: 'Glaciers',
    tags: ['Glaciers & Ice', 'Climate'],
    authors: [{ name: 'Shawn Marshall', institution: 'University of Calgary' }],
    status: 'pending'
  },
  {
    num: 2,
    title: 'Mountain Observation Systems',
    topic: '(High-elevation) Mountain observation systems',
    tags: ['Climate', 'Knowledge'],
    authors: [{ name: 'Maria Shahgedanova', institution: 'University of Reading' }],
    status: 'pending'
  },
  {
    num: 3,
    title: 'Elevation-Dependent Climate Change',
    topic: 'Climate dynamics in mountain regions / elevation-dependent warming',
    tags: ['Climate', 'Knowledge'],
    authors: [{ name: 'Nick Pepin', institution: 'University of Portsmouth' }],
    status: 'pending' // draft exists in Drive (EDCC article Draft 2) — not yet ingested
  },
  {
    num: 4,
    title: 'Welcoming the Social Dimensions of Glacier Loss',
    topic: 'Social dimensions of glacier loss',
    tags: ['Glaciers & Ice', 'Equity', 'Knowledge'],
    authors: [
      { name: 'Ignacio Palomo', institution: 'Institut de Recherche pour le Développement' },
      { name: 'Sofia Lana', institution: 'Institut de Recherche pour le Développement' }
    ],
    status: 'draft',
    lead: 'Science has a strange way of legitimating itself to the world. Often, the numbers and figures that have come to be associated with facts and truth in the West can silence other equally valid forms of generating knowledge.',
    body: [
      { t: 'p', x: 'While there is still a long road ahead in terms of incorporating multiple forms of knowledge on equal footing, the last 25 years have witnessed the rise of the social sciences within mountain and climate change research.' },
      { t: 'p', x: 'It all started, probably — as an irony of destiny — through the perception of an individual, or perhaps a community, that glaciers were retreating after the maximum of the so-called <em>Little Ice Age</em>. What that perception was, and whether it was linked to any particular livelihood, profession, or religious belief, will remain unknown. What we do know is that as science grew in numbers and social influence, particularly through the Intergovernmental Panel on Climate Change, the human dimensions of climate change remained a nearly forgotten “black box” within the ever-expanding complexity of atmospheric physics and chemistry — until several voices demanded a stronger consideration of social sciences in climate science in the 2010s.' },
      { t: 'sub', x: 'Sixteen thousand bodies of ice' },
      { t: 'p', x: 'Laura Zalazar, coordinator of Argentina’s National Glacier Inventory at IANIGLA-CONICET, was one of the scientists who inventoried all of Argentina’s glaciers — 16,078 bodies of ice — and over the years documented and witnessed their accelerated disappearance. She still recalls being told she had been hired to join the inventory team. Born and raised next to the Andes, with an early interest and professional training in geography, the job sounded like a dream come true. Little did she know then the role she would eventually play, or how her understanding of the cryosphere would shift over time.' },
      { t: 'p', x: 'In the beginning, inventorying glaciers felt methodical — first identifying them via satellite images, then verifying the findings through field campaigns. But soon enough it became clear that these difficult-to-access, often remote regions of the Andes were not just made of rock and ice. Dry mountainous regions in the Central Andes were also home to extensive high-mountain peatland ecosystems, or <em>vegas</em>, whose health, as she found in her doctoral research, was closely connected to glacial and snowmelt. And vegas were also pastoralists’ source of livelihood, and a location for ancestral practices like transhumance. Then there were the millions of people downstream — the cities dependent on glacial meltwater, especially in the dry season, and the rivers that irrigated several provinces’ grassy plains before reaching the Atlantic.' },
      { t: 'p', x: 'Easy entry into the high mountain regions they needed to monitor was not always a given. Indigenous communities were afraid the researchers had come to mine their territories; private landowners and mining companies preferred to keep their activities out of sight. It was not only the millions of cubic metres of ice that would be lost in the Andes, risking the water security of millions of inhabitants. These territories were inhabited and contested, placing at risk pastoralists’ ancestral practices and livelihoods, and vulnerable mountain communities’ land tenure.' },
      { t: 'quote', x: 'The numbers and figures that fit within the inventory made no room for the socio-environmental complexity of these high mountain environments.' },
      { t: 'p', x: 'Laura therefore decided to take matters into her own hands. Once the inventory was published, she expanded her own expertise through interdisciplinary collaborations with the social sciences.' },
      { t: 'sub', x: 'A law, and its unravelling' },
      { t: 'p', x: 'At the time, climate-change research funding bodies were increasingly asking for interdisciplinarity and transdisciplinarity — the integration of academic and non-academic knowledge. Indigenous scholars advocated for their active participation in these discussions and for the inclusion of Indigenous Knowledge Systems within climate change research, as opposed to their frequent portrayal as passive victims of climate change impacts. Then came the Intergovernmental Science-Policy Platform on Biodiversity and Ecosystem Services, which placed state and non-state institutions at the core of its conceptual framework — an unprecedented recognition for the social sciences in international science-policy circles.' },
      { t: 'p', x: 'In Laura’s homeland mountain communities, circumstances began to shift as well. Argentina’s Glacier Law had initially been drafted in response to contamination caused by the first high-altitude, binational gold mega-mine straddling the Andes between Chile and Argentina. The project proposed to remove glaciers by tow truck in order to protect them, and to bulldoze through periglacial environments to build roads to the mining pits — endangering a fragile ecosystem, freshwater sources, and the homes and livelihoods of those downstream.' },
      { t: 'p', x: 'While the approval of the law — the first of its kind in the world — was a major success for a coalition of socio-environmental movements, neighbourhood assemblies, certain politicians, and scientists, it has recently suffered setbacks. In early 2026 the Argentine state passed a reform that waters down its capacity to govern and protect glaciers and periglacial environments, removing obstacles for large-scale mining in the Andes. One of the main issues the original law suffered from was a lack of enforceability. Scientists were left to their own devices as they created an inventory of glaciers, with little support from the state that had legally assigned them the task, and little understanding of the social and political stakes of their work.' },
      { t: 'quote', x: 'The characteristic coupling of earth sciences and politics is insufficient to generate durable and transcendent public policy.' },
      { t: 'p', x: 'As we face the current climate crisis and the accelerated disappearance of the cryosphere, the social sciences, Indigenous Knowledge Systems, and transdisciplinary expertise are required to face an issue that is as much biophysical as it is social, political, and economic.' }
    ]
  },
  {
    num: 5,
    title: 'The Fruits of Everyday Women’s Work with Mountain Water',
    topic: 'Mountain water towers & downstream dependencies; water scarcity, quality & security beyond mountains',
    tags: ['Water', 'Livelihoods', 'Equity'],
    authors: [
      { name: 'Mark Carey', institution: 'University of Oregon' },
      { name: 'Holly Moulton', institution: 'University of Oregon' },
      { name: 'Inés Yanac León', institution: 'Universidad Nacional Santiago Antúnez de Mayolo' },
      { name: 'Heidi Thalman', institution: 'University of Oregon' }
    ],
    status: 'draft',
    lead: 'Despite widespread glacier loss in the Peruvian Andes, the fruits of everyday work with glacier runoff continue to yield, well, fruit.',
    body: [
      { t: 'p', x: 'From blueberries, grapes, and mangoes to tulips and chamomile, Peruvian farmers living downstream from shrinking glaciers have diversified and increased agricultural production. Amidst climate change and ice loss, women especially are producing blooms. Some of the crops women grow are for household and community use. In other cases, women work in Peru’s ever-expanding, multi-billion-dollar fruit, flower, and vegetable export industries — with many crops watered with glacier runoff.' },
      { t: 'p', x: 'In Peru’s Santa River watershed below Cordillera Blanca glaciers, women’s everyday work and relationships with mountain water are not defined by glacier catastrophes. Instead, their labour and relationships with water are characterised by creativity, adaptation, hope, family bonding, joy, care, and community — while maintaining a focus on the socioenvironmental obstacles that influence women’s lives and futures.' },
      { t: 'sub', x: 'The most glacierized tropical range in the world' },
      { t: 'p', x: 'With hundreds of glaciers, Peru’s Cordillera Blanca is the most glacierized tropical mountain range in the world. Glacial runoff flows both east into the Amazon and west into the Santa River, which drains into the Pacific. Like glacier-fed rivers everywhere, the Santa flows year-round because glaciers melt even during the dry season. Glaciers thus make good water towers, from Nepal and Switzerland to Canada and Peru. Of course, mountain water also comes from precipitation, snowpack, groundwater, springs, and wetlands.' },
      { t: 'p', x: 'More than a million people depend on the Santa River for drinking water, irrigation, hydropower, industry, mining, and recreation. Residents are Spanish- and Quechua-speaking small-scale farmers, tour guides, government workers, agricultural labourers for export crops, mining engineers, teachers, shopkeepers, hotel and restaurant staff, and thousands of other livelihoods. Consequently, people relate to mountain water in diverse ways: some irrigate crops and manage hydropower stations, while others simply turn on the tap without knowledge of how water arrives at their home.' },
      { t: 'sub', x: 'Huertas' },
      { t: 'p', x: 'In the upper areas of the watershed, women produce food and medicinal plants in household gardens called <em>huertas</em>, which also serve as spaces of joy, care, community, and meaning. The water may come from glacier-fed streams diverted into <em>acequias</em> — irrigation canals. However, acequias are not available to all women across the Santa River Valley, nor are they on-demand year-round sources of water. Instead, women may wait for rain or limited water from acequias in the dry season, or gather water from <em>puquiales</em> (springs), rain barrels, and purchased water, among other ad hoc sources.' },
      { t: 'p', x: 'The diverse relationships that women cultivate with plants through access to mountain water provide nutritious vegetables like <em>zapallo</em> (squash), ease headaches caused by the stress of social and climatic change with infusions of <em>muña</em> (Andean mint) and chamomile, and facilitate intergenerational learning as women pass down knowledge of how to tend plants throughout their lifecycles.' },
      { t: 'quote', x: 'When water flows through huertas, it unveils the importance of hyperlocal and intersectional research on glaciers as water towers that transcends simple narratives of doom.' },
      { t: 'sub', x: 'The fruit boom downstream' },
      { t: 'p', x: 'Farther downstream, an export-oriented agro-industrial fruit boom has blossomed this century. Peru’s coastal desert now blooms with farmland, particularly in the Chavimochic irrigation project that pipes Santa River water hundreds of kilometres into several adjacent valleys. This agrarian boon — partially produced with water from melting glaciers — has made Peru one of the world’s top exporters of blueberries, grapes, avocados, asparagus, and mangoes. Water and irrigation engineering are key to agribusiness, but so too are access to cheap land, abundant and inexpensive labour, favourable trade agreements, and global demand.' },
      { t: 'p', x: 'Women play a key role in these booming industries. In the Chavimochic project, women comprised the majority of the 113,000 agricultural workers in 2025, while at one company in Virú women recently made up 70 percent of the 10,000 workers. On blueberry farms, women can account for 60 percent or even two-thirds of farmworkers. Yet agribusiness work can be more precarious than in the upstream huertas and does not always yield wider household or community benefits. Agricultural labour is frequently seasonal, pays low wages, and lacks benefits and legal protections. Women also have to balance family commitments while working up to 14 hours a day. However, workers have mobilised in recent years and improved their wages and working conditions — showing once again how women adapt, and cannot be simplistically portrayed as victims working downstream from vanishing glaciers.' },
      { t: 'sub', x: 'Reframing the doomsday account' },
      { t: 'p', x: 'Exposing women’s everyday agricultural labour helps us more accurately understand mountain water towers and life below shrinking glaciers. While much of today’s climate change dialogue pushes a doomsday-esque narrative, mountain research focusing on women’s agricultural work helps correct simplistic stories that foreground climate-driven decline.' },
      { t: 'p', x: 'It is true that nearly 50 percent of Cordillera Blanca glacial ice has disappeared in the last 50 years, causing hydrologic decline particularly in the dry season. Yet putting women into a larger context of growth in crop production and agricultural exports reframes accounts of impending hydrological catastrophe. <strong>Even as glaciers shrink, there are still many mountain stories of inspiration and possibility.</strong>' }
    ]
  },
  { num: 6,  title: 'Mountain Ecosystems and Nature-Based Solutions', topic: 'Mountain ecosystems & Ecosystem Services & Nature Based Solutions', tags: ['Ecosystems', 'Land Use'], authors: [{ name: 'Christian Rixen', institution: 'WSL Institute for Snow and Avalanche Research SLF' }], status: 'pending' },
  { num: 7,  title: 'Forests, Soils and Carbon Dynamics', topic: 'Forests, soils & carbon dynamics', tags: ['Ecosystems', 'Climate'], authors: [{ name: 'Harald Bugmann', institution: 'ETH Zürich' }], status: 'pending' },
  { num: 8,  title: 'Beyond Mainstream Adaptation', topic: 'Adaptation & resilience: Communities responding to change', tags: ['Livelihoods', 'Equity'], authors: [{ name: 'Aida Cuni-Sanchez', institution: 'Norwegian University of Life Sciences' }], status: 'pending' }, // draft exists in Drive — not yet ingested
  { num: 9,  title: 'Cascading Hazards and Risks', topic: 'Impacts (e.g. cascading hazards & risks)', tags: ['Hazards', 'Climate'], authors: [{ name: 'Joyce Kimutai', institution: 'Imperial College London' }], status: 'pending' },
  { num: 10, title: 'Agriculture and Food Systems', topic: 'Agriculture & food systems', tags: ['Livelihoods', 'Land Use'], authors: [{ name: 'Theresa Tribaldos', institution: 'University of Bern' }], status: 'pending' },
  { num: 11, title: 'Walking Mount Sinai', topic: 'Cultural landscapes & heritage', tags: ['Culture', 'Land Use'], authors: [{ name: 'Ahmed Shams', institution: '' }], status: 'pending' }, // draft exists in Drive — not yet ingested
  { num: 12, title: 'Gender and Social Equity', topic: 'Gender & social equity', tags: ['Equity', 'Livelihoods'], authors: [{ name: 'Léa Sallenave', institution: 'University of Geneva' }, { name: 'Marie Oiry Varacca', institution: 'Université Gustave Eiffel' }], status: 'pending' },
  { num: 13, title: 'Tourism', topic: 'Tourism', tags: ['Livelihoods', 'Culture'], authors: [{ name: 'Emmanuel Salim', institution: 'University of Lausanne' }], status: 'pending' },
  { num: 14, title: 'Demographic Change and Migration', topic: 'Demographic change & migration', tags: ['Livelihoods', 'Equity'], authors: [{ name: 'Amina Maharjan', institution: 'ICIMOD' }], status: 'pending' }, // draft + 2 maps in Drive — not yet ingested
  { num: 15, title: 'Conflict, Peacebuilding and Transboundary Cooperation', topic: 'Conflict, peacebuilding & transboundary cooperation', tags: ['Governance', 'Equity'], authors: [{ name: 'Mariana Melnykovych', institution: 'WSL Swiss Federal Institute for Forest, Snow and Landscape Research' }], status: 'pending' },
  { num: 16, title: 'Urbanisation and Infrastructure', topic: 'Urbanisation & infrastructure challenges', tags: ['Land Use', 'Governance'], authors: [{ name: 'Karen Seto', institution: 'Yale University' }], status: 'pending' },
  { num: 17, title: 'Indigenous and Local Knowledge', topic: 'Indigenous & local knowledge', tags: ['Knowledge', 'Culture'], authors: [{ name: 'Nand Kishor', institution: '' }], status: 'pending' },
  { num: 18, title: 'Land Tenure and Mountain Governance', topic: 'Land tenure and Mountain Governance', tags: ['Governance', 'Land Use'], authors: [{ name: 'Glenn Hunt', institution: '' }, { name: 'Athong Makury', institution: '' }], status: 'pending' }, // draft exists in Drive — not yet ingested
  { num: 19, title: 'Hydropower and Energy Transitions', topic: 'Energy security: Hydropower & energy transitions', tags: ['Water', 'Governance'], authors: [{ name: 'Marc Landry', institution: 'Tulane University' }, { name: 'Yan Zhong', institution: '' }], status: 'pending' },
  { num: 20, title: 'Mountains in Global Frameworks', topic: 'Mountains in global frameworks: From UNFCCC/IPCC to SDGs', tags: ['Governance', 'Knowledge'], authors: [{ name: 'Amlan Mishra', institution: '' }], status: 'pending' },
  { num: 21, title: 'Legal Action and Mountain Justice', topic: 'Legal Action (rights of nature, legal advocacy and mountain justice)', tags: ['Governance', 'Equity'], authors: [], status: 'pending' },
  { num: 22, title: 'Mountains and the Arts', topic: 'Mountains and Arts: connecting and dealing with change', tags: ['Culture', 'Knowledge'], authors: [{ name: 'Olivier Dangles', institution: 'Institut de Recherche pour le Développement' }], status: 'pending' },
  { num: 23, title: 'Future Scenarios for Mountain Regions', topic: 'Future scenarios for mountain regions', tags: ['Climate', 'Governance'], authors: [{ name: 'Rob Marchant', institution: 'University of York' }], status: 'pending' },
  { num: 24, title: 'Snow Dynamics', topic: 'Snow dynamics', tags: ['Snow & Permafrost', 'Water'], authors: [], status: 'pending' },
  { num: 25, title: 'Mountain Permafrost and the Blatten Catastrophe', topic: 'Permafrost', tags: ['Snow & Permafrost', 'Hazards'], authors: [{ name: 'Wilfried Haeberli', institution: 'University of Zurich' }, { name: 'Lukas Arenson', institution: 'BGC Engineering' }, { name: 'Pandey', institution: '' }], status: 'pending' } // draft + 3 figures in Drive — not yet ingested
];

window.MRI_CONTENT = { TAG_VOCABULARY, TAG_COLORS, PENDING_TEXT, STORIES };
