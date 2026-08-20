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
     image        { src, alt, caption } — the photo at the top of the panel.
                  Files live in images/. Omit it and the story falls back to
                  one of the four generic photos bundled with the export.
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
  'Water':             '#7096b1',
  'Climate':           '#c68268',
  'Hazards':           '#c4817c',
  'Ecosystems':        '#799d6a',
  'Land Use':          '#9f9175',
  'Livelihoods':       '#b28c42',
  'Culture':           '#9a8eae',
  'Governance':        '#81959f',
  'Equity':            '#ba8499',
  'Knowledge':         '#859679'
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
    status: 'draft',
    lead: 'On my first ascent of Kilimanjaro, I was amazed how a single mountain could contain so many different worlds.',
    body: [
      { t: 'p', x: 'In just a few days and a few kilometres, I walked through towns and savannah grassland; densely populated farmland and rainforest; giant heather and moorland; alpine desert; and then finally entered the realm of snow and ice. Ecosystems that would normally be separated by thousands of kilometres of latitude, from the tropics to the Arctic, appeared stacked one above another along the slope.' },
      { t: 'p', x: 'For generations the boundaries between these contrasting worlds seemed almost permanent — fixed features of mountain landscapes around the globe. Over the last 25 years, a more complex picture has emerged of ecological boundaries on the move.' },
      { t: 'sub', x: 'The lines that were supposed to hold still' },
      { t: 'p', x: 'The scientific term for these changes is <em>ecological zonation</em>: different life systems typically inhabit different elevation bands, some near the top, some halfway up, some near the bottom. Although the specific ecosystems depend on location, two features are almost universal — the treeline and the snowline. Above the treeline, trees will not grow because it is not warm enough. Higher still, it can be cold enough for snow to last permanently, and for glaciers to form.' },
      { t: 'p', x: 'These lines are so distinctive that we may feel they are immovable. But with warming they will logically move uphill: once-snowy areas may become snow-free, and open ground may eventually be dominated by trees. Twenty-five years ago these boundaries were relatively stable. Today we can observe them shifting in many mountain regions.' },
      { t: 'sub', x: 'Mountains do not warm evenly' },
      { t: 'p', x: 'If everywhere warmed at the same rate, ecological zones would shift upslope in parallel — and we previously assumed mountains warmed much like everywhere else. Then evidence began to emerge that they do not. Our work has shown that high mountains have warmed more rapidly than comparable lowland areas, with implications for snow loss, glacier retreat, biodiversity and water resources.' },
      { t: 'quote', x: 'In 25 years the community has gone from a limited understanding of elevation-dependent climate change to recognising it as a key aspect of mountain climate science.' },
      { t: 'p', x: 'That shift has driven an important effort to improve mountain observations through international collaboration.' },
      { t: 'sub', x: 'What it looks like on one mountain' },
      { t: 'p', x: 'Uneven warming means some ecosystems may be compressed while others expand. On Kilimanjaro, the summit ice fields are in rapid retreat, and above 5,000 m — where snow and ice are being lost — our 22-year records show amplified warming. Losing snow, which reflects sunlight, exposes bare rock that heats in the sun, and that creates a runaway effect.' },
      { t: 'p', x: 'At the treeline, around 3,000 m, the picture is less clear. Trees might be expected to move upslope, but increasing forest fires and population pressure have <em>lowered</em> the treeline in places, while the giant heather zone unique to tropical mountains has expanded both up and downslope.' },
      { t: 'p', x: 'The rainforest itself is sustained by clouds forming on the lower slopes, which release heat into the atmosphere while lowering temperatures beneath the canopy. Where forest has survived on Kilimanjaro, there is evidence that surface warming has been more limited.' },
      { t: 'p', x: 'The next time you climb a mountain and marvel at the changing plants and animals adapted to life in their different worlds, spare a thought for those that may be forced to move to keep up with the changing climate — and let us hope they manage to succeed.' }
    ]
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
  {
    num: 8,
    title: '“This Doesn’t Work Here”',
    topic: 'Adaptation & resilience: Communities responding to change',
    tags: ['Livelihoods', 'Equity', 'Knowledge'],
    authors: [
      { name: 'Aida Cuni-Sanchez', institution: 'Norwegian University of Life Sciences' },
      { name: 'Gerard Imani', institution: '' }
    ],
    status: 'draft',
    lead: '“Nothing,” the translator said to me in French. Nothing? How could “nothing” be the answer? I was shocked — the old man and the translator had been speaking for at least five minutes.',
    body: [
      { t: 'p', x: 'I was leading a small research project on local observations of climatic change in African mountains. Where there is no historical meteorological data, local people’s perceptions are the best we have. They help us understand not only how temperature, rainfall, snow and fog have changed over recent decades, but what those changes have done to rivers, animals, plants, crops and livelihoods. We also ask what people have done to adapt.' },
      { t: 'p', x: 'If yields decline because of reduced rainfall, a farmer can extend the area farmed, irrigate by hand, or try short-cycle varieties if they can afford the seed. They always try to do something. It is human nature to adapt.' },
      { t: 'p', x: 'The old man had described plenty of change: higher temperatures, less annual rainfall, a late start to the rainy season, dry spells within it, even more frequent showers during the dry season. All of which, he said, meant lower yields of cassava, the main staple. How could he not be trying <em>something</em>?' },
      { t: 'p', x: 'Tembo farmers, the neighbouring ethnic group, reported eight different strategies — from drying cassava over the fire in the dry season, to growing new crops such as pineapples to sell to the army for good money. But the old Batwa man said they had changed nothing. We try not to prompt answers, but when we asked whether he had started drying cassava over the fire, he said no.' },
      { t: 'quote', x: '“This doesn’t work here. We have no spare cassava to dry. Everything we get, we eat.”' },
      { t: 'p', x: 'The same answer came from the other 99 Batwa we interviewed. People do lie — but it is strange for a hundred people to lie in the same direction. Why were the Batwa not attempting what their Tembo neighbours were?' },
      { t: 'sub', x: 'Landless, and therefore option-less' },
      { t: 'p', x: 'The answer is complicated, and it took me a while to work out. The Batwa, traditionally hunter-gatherers, were expelled from their ancestral forest lands thirty years ago when a national park was created. Most remained landless — so there is nowhere to farm, and nowhere to implement any of these strategies.' },
      { t: 'p', x: 'Most also have limited skill in, or interest in, farming. Their culture is one of living inside the forest: hunting, gathering plants including wild yams, exchanging wild meat and plants with farmers for cassava. They do not want to become sedentary, or farmers. Being landless, they have fewer options than others — and fewer opportunities to diversify. Without schooling or numeracy, starting a business is difficult; without French, trading pineapples with the army is complicated, even if you manage to grow them.' },
      { t: 'sub', x: 'When conflict is the binding constraint' },
      { t: 'p', x: 'Across our study of ten African mountains, an absence of adaptation, or a very limited range of it, was reported in several places — often driven by context rather than climate, and particularly by armed conflict. In the Bamboutos Mountains of Cameroon, farmers were unwilling to invest in animal rearing because “animals can be easily stolen by the rebels”. In the Itombwe Mountains of the Democratic Republic of the Congo, few invested in soil conservation or agroforestry, because they were likely to abandon their villages during periods of violence, and preferred livestock they could move.' },
      { t: 'quote', x: '“You can move your cows, not your crops, when the rebels arrive.”' },
      { t: 'p', x: 'A Nyindu farmer told me that. Sadly, he was right.' },
      { t: 'p', x: 'We tend to treat climate change as the main challenge to farmers’ livelihoods. In some contexts there are compounding issues that matter more: landlessness, lack of market access, insecure tenure. Researchers and NGOs tend to avoid these extremely complex settings — but they are probably the ones requiring our attention most.' },
      { t: 'p', x: 'As of 2026, the eastern provinces of the DRC are under rebel control — not merely some villages, as was the case when we conducted this study. The conflict in Anglophone Africa continues, and several of the villages we studied remain fully deserted.' },
      { t: 'p', x: '<strong>Most Batwa remain landless.</strong>' }
    ]
  },
  { num: 9,  title: 'Cascading Hazards and Risks', topic: 'Impacts (e.g. cascading hazards & risks)', tags: ['Hazards', 'Climate'], authors: [{ name: 'Joyce Kimutai', institution: 'Imperial College London' }], status: 'pending' },
  { num: 10, title: 'Agriculture and Food Systems', topic: 'Agriculture & food systems', tags: ['Livelihoods', 'Land Use'], authors: [{ name: 'Theresa Tribaldos', institution: 'University of Bern' }], status: 'pending' },
  {
    num: 11,
    title: 'Walking Mount Sinai',
    topic: 'Cultural landscapes & heritage',
    tags: ['Culture', 'Land Use', 'Knowledge'],
    authors: [{ name: 'Ahmed Shams', institution: 'Sinai Peninsula Research' }],
    status: 'draft',
    lead: 'It would have been true to say that walking Mount Sinai and the surrounding High Mountains of the Sinai Peninsula did not change until the late 1970s, or even the early 2000s.',
    body: [
      { t: 'p', x: 'Monks, pilgrims, travellers, scholars and tourists had experienced the same cultural landscape since the mountain’s first mention in a historic account in 363 CE. Its protection was <em>de facto</em> — enshrined in local knowledge, in remoteness, and in the kind of visitor it drew — long before it became a protected area in 1986, effectively in 1996, and a UNESCO World Heritage Site in 2002. What made it mountainous came first; the legislation and the designation came after.' },
      { t: 'sub', x: 'The keepers of the landscape' },
      { t: 'p', x: 'The local Bedouins of the Gebaliya tribe have been, and remain, the source of knowledge about this cultural landscape. Theirs is a practical knowledge. It assigns place names and points of interest on maps. It harvests runoff and taps groundwater for orchard agriculture through an ancient Byzantine and Nabatean network — and a modern one — of terraces, conduits, reservoirs, wells, cisterns and retaining walls. It guides visitors along ancient paths through the valleys and to the summits. It regulates livelihoods through customary law governing land, water and pasture. It knows the medicinal plants.' },
      { t: 'p', x: 'The expanse of that local knowledge <em>is</em> the expanse of the cultural landscape.' },
      { t: 'sub', x: 'What twenty-five years have taught us' },
      { t: 'p', x: 'A quarter-century ago, walking Mount Sinai — physically and metaphorically — traversed a local knowledge that had mostly been documented by outsiders, in hundreds of accounts, studies, maps and photographic collections. The impact of that outside group on the landscape itself was marginal. But we knew little about the spatial pattern of local knowledge: how it had been compiled, altered or lost over the centuries, or how far it informs present governance and spatial planning.' },
      { t: 'p', x: 'The absence of a formalised notion of landscape, of mountains as a geographical category requiring particular legislation, of a distinction between strict protection and sustainable development, and of any requirement to consult local knowledge — all of it opened the way to exploitation-driven landscape investment in recent years.' },
      { t: 'p', x: 'The effectiveness of the protected area and the World Heritage designation was tied to a limited period of multilateral funding, and to the continuous presence of technical capacity on the ground. Without it came a local shift from a culture of commons towards the maximisation of personal benefit. An external NGO built numerous small water dams, later copied by a local government organisation. A mass tourism project was constructed on the most documented historic landscape in the region.' },
      { t: 'quote', x: 'Paradoxically, the local Bedouins think vertical, while the developers from the lowlands think lateral.' },
      { t: 'sub', x: 'Why it matters downstream' },
      { t: 'p', x: 'Developers around Mount Sinai, and NGOs that have reached into the high valleys, are exploiting the very resource they promote. The absence of local spatial planning, financial instruments, geo-databases and observations to support decisions — combined with the commodification of a historically significant landscape — leaves the door open to the same practices elsewhere in the country.' },
      { t: 'p', x: 'In a mountain region with cyclic droughts and no systematic long-term observation or modelling, it is hard to attribute impacts on water resources or biodiversity loss to climate change. Local knowledge and observation serve as a partial substitute — which means its loss multiplies the damage.' },
      { t: 'p', x: 'The kind of visitor a place receives is dictated by the kind of investment made in it. A long-proposed cable car to Mount Sinai or a nearby summit would alter the cultural landscape and deliver unprecedented numbers of tourists into sensitive habitats and heritage sites. Historically, walking Mount Sinai was an ascent in the sense of the sixth-century <em>Ladder of Divine Ascent</em>, while its benefits flowed downstream as tourism and cultural services.' },
      { t: 'sub', x: 'The next twenty-five years' },
      { t: 'p', x: 'The young Bedouin is tech-savvy, with a strong online presence and traditional entrepreneurial skill. Some are promoting the cultural landscape and the walk itself, connecting with a small but steadily growing community of hikers from the Nile Valley. Only a handful are involved in documenting and using local knowledge.' },
      { t: 'p', x: 'External funds — from developers and NGOs alike — dictate the course of action: a transition from conservation-led to exploitation-driven investment. It began between 2006 and 2010, when a component of a multilateral fund was allocated to individual projects rather than to the commons. The direction was not wholly unproductive, but its execution divided the community, at a moment when the protected area had become far less visible than during its funded management period between 1996 and 2003.' },
      { t: 'p', x: '<strong>Ultimately, it is a question of how local knowledge evolves, and who gets to make it.</strong>' },
      { t: 'p', x: 'The untraditional small dams are characterised by high elevation, solar exposure and silting — short-lived seasonal successes with long-lasting effects on water resources and on the look of the landscape. A local Bedouin once told me: <em>“But the seasonal lakes behind the water dams look good in the photographs.”</em> An unexpected win for the online promotion of the landscape. Not for the landscape.' }
    ]
  },
  { num: 12, title: 'Gender and Social Equity', topic: 'Gender & social equity', tags: ['Equity', 'Livelihoods'], authors: [{ name: 'Léa Sallenave', institution: 'University of Geneva' }, { name: 'Marie Oiry Varacca', institution: 'Université Gustave Eiffel' }], status: 'pending' },
  { num: 13, title: 'Tourism', topic: 'Tourism', tags: ['Livelihoods', 'Culture'], authors: [{ name: 'Emmanuel Salim', institution: 'University of Lausanne' }], status: 'pending' },
  {
    num: 14,
    title: 'Changing Migration Dynamics in the Hindu Kush Himalaya',
    topic: 'Demographic change & migration',
    tags: ['Livelihoods', 'Equity', 'Hazards'],
    authors: [{ name: 'Amina Maharjan', institution: 'ICIMOD' }],
    status: 'draft',
    image: {
      src: 'images/migration-sindhupalchowk.png',
      alt: 'Map of migration destinations from Sindhupalchowk district, Nepal.',
      caption: 'Migration destinations recorded from Sindhupalchowk district, Nepal — a spread that would have been unimaginable a generation ago.'
    },
    lead: 'Migration has always been part of mountain livelihoods. What has changed over three decades is its reach — how far people go, for how long, and what they leave behind.',
    body: [
      { t: 'sub', x: 'What is changing' },
      { t: 'p', x: 'Transhumance among pastoral communities, and the seasonal descent of high-altitude dwellers escaping harsh winters, are centuries-old traditions that made living at altitude possible in the first place. Most of that movement was short-distance and within national borders, because mountain areas were hard to reach.' },
      { t: 'p', x: 'As connectivity grew, distances grew with it. Roads, railways, electrification and education have been development priorities across the Hindu Kush Himalaya, and in the last decade digital infrastructure has connected remote communities to the wider world. Mountain communities are globalising rapidly, and the aspirations of the younger generation have changed with them. Subsistence farming meets neither those aspirations nor, increasingly, basic household needs in a market economy. Small holdings constrain commercialisation, and climate change adds uncertainty.' },
      { t: 'sub', x: 'What twenty-five years have taught us' },
      { t: 'p', x: 'The region is increasingly exposed to climatic disasters — intense floods, landslides, glacial lake outburst floods. These damage homes, farmland and infrastructure, and force people to relocate temporarily or permanently.' },
      { t: 'quote', x: 'Though migration in the mountains is largely voluntary and livelihood-oriented, disaster-induced displacement is increasingly becoming a new reality.' },
      { t: 'p', x: 'Such movement is often characterised by constrained choices, particularly for marginalised populations, and deepens existing vulnerabilities. Displacement also follows infrastructure and conservation projects, and conflict: a military operation in May 2009 displaced <strong>2.3 million people</strong> from Malakand Division, including Swat, for nearly six months — one of the largest population displacements in so short a time in modern history.' },
      { t: 'p', x: 'Rural-to-urban migration within countries has risen sharply, producing rapid urbanisation across the region, including in high mountain areas. International labour migration, long confined to cross-border movement, now reaches much further: over three decades the Gulf states have become a major destination.' },
      { t: 'p', x: 'In Nepal the international migrant population has <strong>tripled in 25 years</strong>. Remittances now contribute around <strong>26 per cent of GDP</strong>, and about <strong>56 per cent of households</strong> receive them — support for food, health and education, investment in assets, and a buffer against shocks. They have contributed to nearly eliminating extreme poverty.' },
      { t: 'p', x: 'That migration is highly gendered. Young men move; the rest of the family stays. The result is a growing feminisation of mountain societies.' },
      { t: 'sub', x: 'What is coming' },
      { t: 'p', x: 'Many internal migrants move repeatedly between origin and destination, holding on to social, economic and cultural ties and sustaining multi-local livelihoods. But permanent migration is growing, bringing depopulation, land left fallow and agrarian decline — driven not by migration alone but by the viability of agriculture, climate and market uncertainty, and better opportunities elsewhere.' },
      { t: 'p', x: 'Youth mobility to Europe, Australia and North America for study and work is rising: Australian authorities recorded <strong>13,406 Bhutanese students</strong> enrolled in Australian universities between January and September 2024.' },
      { t: 'p', x: 'And people are returning. Return migration follows new opportunities in tourism, economic crises such as COVID-19, health, retirement or simple preference — made possible by the same improved infrastructure. Alongside it comes a newer trend: second homes in the mountains, bought to escape pollution and heat stress in the cities, and as investment. It is visible in the Uttarakhand mountains, within reach of Delhi.' }
    ]
  },
  { num: 15, title: 'Conflict, Peacebuilding and Transboundary Cooperation', topic: 'Conflict, peacebuilding & transboundary cooperation', tags: ['Governance', 'Equity'], authors: [{ name: 'Mariana Melnykovych', institution: 'WSL Swiss Federal Institute for Forest, Snow and Landscape Research' }], status: 'pending' },
  { num: 16, title: 'Urbanisation and Infrastructure', topic: 'Urbanisation & infrastructure challenges', tags: ['Land Use', 'Governance'], authors: [{ name: 'Karen Seto', institution: 'Yale University' }], status: 'pending' },
  { num: 17, title: 'Indigenous and Local Knowledge', topic: 'Indigenous & local knowledge', tags: ['Knowledge', 'Culture'], authors: [{ name: 'Nand Kishor', institution: '' }], status: 'pending' },
  {
    num: 18,
    title: 'Who Owns the Fallow?',
    topic: 'Land tenure and Mountain Governance',
    tags: ['Governance', 'Land Use', 'Knowledge'],
    // Institutions not stated in the draft — to be confirmed with the authors
    authors: [{ name: 'Glenn Hunt', institution: '' }, { name: 'Athong Makury', institution: '' }],
    status: 'draft',
    lead: 'In the high hills of north-western Myanmar, near the Indian border, Indigenous Naga villages farm landscapes that do not stay still.',
    body: [
      { t: 'p', x: 'Fields move, forests regrow, and land passes through cycles of use and rest. To the state, these shifting patterns often appear unproductive, or even invisible. To Naga communities in Layshi Township, they are the foundation of food security, governance, and life in the mountains.' },
      { t: 'sub', x: 'A living landscape' },
      { t: 'p', x: 'In Layshi, one of the most remote parts of Myanmar, villages manage large mountain territories through collective institutions: village councils, clan leaders, elders, women’s groups. Their landscapes are mosaics — shifting cultivation fields (<em>jhum</em>), long fallows, forests, gardens, orchards, grazing areas and sacred sites — each with different roles at different times.' },
      { t: 'quote', x: 'A forest today may be a field tomorrow, and a field may return to forest over time.' },
      { t: 'p', x: 'Rather than fixed plots with permanent boundaries, land here is understood through use, season and social agreement. That flexibility is not accidental. It is how communities spread risk, maintain soil fertility and secure food in a rugged, climate-exposed environment.' },
      { t: 'sub', x: 'What twenty-five years have taught us' },
      { t: 'p', x: 'Twenty-five years ago, dominant policy narratives across much of Asia treated shifting cultivation as a problem to be solved. <em>Jhum</em> was framed as inefficient, environmentally destructive, or transitional — something to be replaced by permanent agriculture or forest conservation. Those assumptions shaped land laws, agricultural investment and conservation programmes, often without serious engagement with how upland communities actually used and valued their land.' },
      { t: 'p', x: 'Long-term research in the Naga hills tells a very different story. Participatory mapping in Layshi shows that <em>jhum</em> systems are neither chaotic nor unmanaged, but highly multifunctional. Asked how different land types contribute to their lives, villagers ranked fields and fallows highest across a wide range of needs: staple food, vegetables, medicinal plants, income, construction materials and cultural practice. Forests and home gardens complement them, forming one interdependent system rather than separate categories.' },
      { t: 'p', x: 'Resilience here does not come from maximising a single output. It comes from diversity and overlap. Different land types provide similar benefits at different times, spreading risk across space and season. When one crop fails, others compensate; when market access fluctuates, subsistence cushions the shock. That portfolio has allowed Naga communities to persist through ecological uncertainty and political marginalisation.' },
      { t: 'p', x: 'The same complexity makes these landscapes difficult for a state to govern. Land administration is designed to see permanent fields and static boundaries; rotational systems resist easy classification. So many of the most productive and culturally important lands in Layshi remain legally insecure, despite being central to everyday life.' },
      { t: 'sub', x: 'Why it matters beyond the mountains' },
      { t: 'p', x: 'This reflects a far wider challenge for Indigenous mountain communities across the Global South. From the Andes to the Himalayas, upland communities manage land in ways that do not fit standard policy boxes — multifunctional, seasonal, collectively governed. Precisely the qualities that make them resilient, and politically inconvenient.' },
      { t: 'p', x: 'Where fallows and communal lands lack legal recognition, households face pressure to make land “legible” by converting it into permanent plots or commercial orchards. In Layshi the early signs are visible. Some changes are driven by market opportunity, others are defensive responses to tenure insecurity. What appears as agricultural modernisation can quietly erode the ecological and social foundations that make mountain livelihoods resilient.' },
      { t: 'sub', x: 'A narrow window' },
      { t: 'p', x: 'Commercial agricultural expansion has slowed since Myanmar’s political crisis of 2021, temporarily easing pressure on customary lands, while Naga political representation has increased — opening fragile new space for Indigenous voices. That creates a rare window for preventive action.' },
      { t: 'p', x: 'The choice is not between tradition and development, but between development pathways. Strengthening customary tenure, recognising fallows as productive land and supporting collective governance could let Naga communities engage with markets on their own terms, without losing the diversity that defines their landscapes.' },
      { t: 'p', x: 'Once commons are enclosed and fallows disappear, rebuilding these systems becomes extraordinarily difficult. <strong>Resilient mountain futures depend not only on what land produces, but on who governs it, and how its complexity is allowed to endure.</strong>' }
    ]
  },
  { num: 19, title: 'Hydropower and Energy Transitions', topic: 'Energy security: Hydropower & energy transitions', tags: ['Water', 'Governance'], authors: [{ name: 'Marc Landry', institution: 'Tulane University' }, { name: 'Yan Zhong', institution: '' }], status: 'pending' },
  { num: 20, title: 'Mountains in Global Frameworks', topic: 'Mountains in global frameworks: From UNFCCC/IPCC to SDGs', tags: ['Governance', 'Knowledge'], authors: [{ name: 'Amlan Mishra', institution: '' }], status: 'pending' },
  { num: 21, title: 'Legal Action and Mountain Justice', topic: 'Legal Action (rights of nature, legal advocacy and mountain justice)', tags: ['Governance', 'Equity'], authors: [], status: 'pending' },
  { num: 22, title: 'Mountains and the Arts', topic: 'Mountains and Arts: connecting and dealing with change', tags: ['Culture', 'Knowledge'], authors: [{ name: 'Olivier Dangles', institution: 'Institut de Recherche pour le Développement' }], status: 'pending' },
  { num: 23, title: 'Future Scenarios for Mountain Regions', topic: 'Future scenarios for mountain regions', tags: ['Climate', 'Governance'], authors: [{ name: 'Rob Marchant', institution: 'University of York' }], status: 'pending' },
  { num: 24, title: 'Snow Dynamics', topic: 'Snow dynamics', tags: ['Snow & Permafrost', 'Water'], authors: [], status: 'pending' },
  {
    num: 25,
    title: 'Mountain Permafrost and the Blatten Catastrophe',
    topic: 'Permafrost',
    tags: ['Snow & Permafrost', 'Hazards', 'Knowledge'],
    authors: [
      { name: 'Wilfried Haeberli', institution: 'University of Zurich' },
      { name: 'Lukas U. Arenson', institution: 'BGC Engineering' },
      { name: 'Pratima Pandey', institution: 'Indian Institute of Remote Sensing, ISRO' }
    ],
    status: 'draft',
    image: {
      src: 'images/blatten-swisstopo.jpg',
      alt: 'Aerial view of the rock-ice avalanche that destroyed the village of Blatten in the Swiss Alps.',
      caption: 'The rock-ice avalanche which destroyed the historical village of Blatten on 28 May 2025. Photo © swisstopo, 30.05.2025'
    },
    lead: 'Warming permafrost is changing the stability, hydrology and hazard potential of icy peaks faster than many assessment frameworks have adapted.',
    body: [
      { t: 'p', x: 'Mountain permafrost must move from a specialised research topic to a routine component of hazard assessment, infrastructure planning and climate adaptation in high mountain regions.' },
      { t: 'sub', x: 'Weakening permafrost, and the Blatten catastrophe' },
      { t: 'p', x: 'Mean annual air temperatures at high altitude are commonly negative, and permafrost — defined as negative subsurface temperature throughout the year — is widespread. Such deep-frozen conditions exert a stabilising effect on steep rock faces. Warming-induced permafrost degradation reduces it.' },
      { t: 'p', x: 'On 28 May 2025, a devastating rock-ice avalanche destroyed the historical village of Blatten in the Swiss Alps. A destabilising permafrost slope had overloaded a small glacier, which ultimately collapsed. In the years before, collapsing permafrost slopes in connection with a hanging glacier at <em>Chamoli</em> in 2021, and with an enlarging glacier lake at <em>South Lhonak</em> in 2023, had already caused severe damage to people, livelihoods and hydropower infrastructure in the Indian Himalaya.' },
      { t: 'p', x: 'Three insights follow. Catastrophic damage cannot always be avoided. Careful observation and early warning can limit fatalities. And the application of what is already understood about mountain permafrost must improve — because this is a phenomenon of icy mountains that is not directly visible, and so often goes unnoticed even within the wider scientific community.' },
      { t: 'quote', x: 'Recent catastrophic events in India and in the Alps must be understood as a wake-up call.' },
      { t: 'sub', x: 'A young research field, rapidly matured' },
      { t: 'p', x: 'Research on mountain permafrost started late. After the seminal analysis of long-term permafrost creep in rock glaciers by Wahrhaftig and Cox in the 1950s, major steps in the 1980s included core drilling to analyse ice characteristics and climate-induced warming, followed by the first spatial models simulating permafrost occurrence in rugged terrain.' },
      { t: 'p', x: 'Around the turn of the century the EU-funded project <em>Permafrost and Climate in Europe</em> brought a breakthrough. It strengthened the geotechnical domain and established a unique north–south transect of 100-metre-deep boreholes through European mountains for long-term monitoring of permafrost temperatures. Together with the later Rock Glacier Inventories and Kinematics programme, mountain permafrost now forms an important part of the Essential Climate Variable Permafrost within the Global Climate Observing System.' },
      { t: 'p', x: 'That progress has been particularly influential in High Mountain Asia, where space-based datasets now provide near-continuous synoptic observation across large remote regions. Thermal infrared sensors are used routinely in regional permafrost assessments; interferometric radar missions offer new ways to monitor creep rates and rock glacier velocities; and machine-learning approaches are improving regional distribution models by integrating climatic, topographic and remote sensing data.' },
      { t: 'p', x: 'Water, meanwhile, is now recognised to play a far more active role within deep-frozen rock masses than previously thought. Infiltration into fracture networks accelerates degradation and promotes localised thaw zones, and pressurised groundwater flow is considered an important factor in destabilising steep frozen rock.' },
      { t: 'sub', x: 'The heating of icy peaks' },
      { t: 'p', x: 'Bedrock permafrost in steep mountain slopes is presently warming at unprecedented rates, reaching about <strong>5 °C per century</strong> in systematic European observations. But heat diffusion and latent heat exchange at depth are slow. Permafrost will therefore continue to exist inside mountain slopes — thermally far out of equilibrium — long after many glaciers have disappeared.' },
      { t: 'p', x: 'Millennia-old, ice-rich creeping permafrost in rock glaciers will continue to degrade, but only slowly, providing limited late-summer meltwater once lowland rivers are no longer fed by vanished glaciers. Many high-mountain settlements and infrastructure systems will face serious challenges of water supply and rock-ice avalanches, in some cases involving far-reaching cascading process chains, especially where lakes are expanding or newly forming.' },
      { t: 'p', x: 'The primary task is to overcome the underrepresentation of permafrost degradation in scientific assessments and adaptation strategies. Permafrost mapping and monitoring should systematically become part of environmental impact assessments, infrastructure planning and disaster risk reduction frameworks.' }
    ]
  }
];

window.MRI_CONTENT = { TAG_VOCABULARY, TAG_COLORS, PENDING_TEXT, STORIES };
