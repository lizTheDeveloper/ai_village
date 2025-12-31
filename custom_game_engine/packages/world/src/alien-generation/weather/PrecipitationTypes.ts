/**
 * Precipitation Types
 *
 * What falls from alien skies.
 * Because water rain is just the beginning.
 */

export interface PrecipitationType {
  name: string;
  composition: string;
  fallPattern: string;
  impact: 'harmless' | 'annoying' | 'dangerous' | 'lethal' | 'reality_breaking';
  accumulation: string;
  flavorText: string;
}

export const PRECIPITATION_TYPES: Record<string, PrecipitationType> = {
  'standard_rain': {
    name: 'Water Rain',
    composition: 'H2O, standard Earth-type',
    fallPattern: 'Vertical descent, wind-affected',
    impact: 'harmless',
    accumulation: 'Puddles, eventually drainage',
    flavorText: 'Water falls. Ground gets wet. Boring. Reliable. Earth weather is simple.',
  },
  'acid_rain': {
    name: 'Caustic Precipitation',
    composition: 'Sulfuric acid, pH 1-2',
    fallPattern: 'Corrodes as it falls',
    impact: 'dangerous',
    accumulation: 'Corrosive puddles, damaged infrastructure',
    flavorText: 'Rain burns. Metal corrodes. Stone weakens. Umbrella dissolves. Stay inside.',
  },
  'metal_rain': {
    name: 'Molten Metal Downpour',
    composition: 'Vaporized metals, condensed at altitude',
    fallPattern: 'Heavy droplets, high terminal velocity',
    impact: 'lethal',
    accumulation: 'Solidified metal deposits',
    flavorText: 'Sky rains iron. Literally. Droplets molten. Impacts deadly. Metallurgy simplified.',
  },
  'upward_rain': {
    name: 'Inverse Precipitation',
    composition: 'Water, gravity-defying',
    fallPattern: 'Falls upward toward clouds',
    impact: 'annoying',
    accumulation: 'Sky lakes form, sometimes fall back',
    flavorText: 'Rain falls up. Physics objects. Rain doesn\'t care. Umbrellas useless. Point wrong direction.',
  },
  'crystalline_hail': {
    name: 'Gem Storm',
    composition: 'Crystallized carbon, silicon dioxide',
    fallPattern: 'Sharp-edged crystals, lethal velocity',
    impact: 'lethal',
    accumulation: 'Valuable but deadly deposits',
    flavorText: 'Hail gemstones. Beautiful. Sharp. Fast. Kills beautifully. Profitable for survivors.',
  },
  'living_rain': {
    name: 'Biological Precipitation',
    composition: 'Microorganisms, spores, tiny life',
    fallPattern: 'Squirms while falling',
    impact: 'dangerous',
    accumulation: 'Grows if given time',
    flavorText: 'Rain lives. Wriggles. Reproduces. Puddles become ecosystems. Quickly.',
  },
  'time_dilated_droplets': {
    name: 'Temporal Rain',
    composition: 'Water experiencing time differently',
    fallPattern: 'Falls at variable speeds, sometimes backwards',
    impact: 'reality_breaking',
    accumulation: 'Puddles age things. Or de-age. Unpredictable.',
    flavorText: 'Droplets exist in wrong time. Fall yesterday. Land tomorrow. Causality weeps.',
  },
  'sonic_precipitation': {
    name: 'Sound Crystallization',
    composition: 'Solidified sound waves',
    fallPattern: 'Harmonic descent, musical impacts',
    impact: 'annoying',
    accumulation: 'Deposits play melodies when disturbed',
    flavorText: 'Sound becomes solid. Falls. Shatters musically. Ground sings. Constant concert. Exhausting.',
  },
  'memory_rain': {
    name: 'Mnemonic Precipitation',
    composition: 'Crystallized memories from deceased',
    fallPattern: 'Drifts slowly, seeking living minds',
    impact: 'dangerous',
    accumulation: 'Pools of shared memories',
    flavorText: 'Rain remembers. Carries memories. Transfers to living. Suddenly remember dying. Someone else\'s dying.',
  },
  'glass_shards': {
    name: 'Silicate Precipitation',
    composition: 'Super-cooled molten glass',
    fallPattern: 'Shatters on impact',
    impact: 'lethal',
    accumulation: 'Glass dunes, sharp terrain',
    flavorText: 'Glass rain. Shatters everywhere. Sharp shards. Deadly beautiful. Beaches of broken glass.',
  },
  'probability_mist': {
    name: 'Quantum Drizzle',
    composition: 'Superposition droplets',
    fallPattern: 'Falls and doesn\'t fall simultaneously',
    impact: 'reality_breaking',
    accumulation: 'Uncertain puddles. Maybe.',
    flavorText: 'Rain exists. And doesn\'t. Both. Neither. Schrödinger confused. Everyone confused.',
  },
  'emotion_precipitation': {
    name: 'Feeling Downpour',
    composition: 'Crystallized emotions',
    fallPattern: 'Color-coded by emotion type',
    impact: 'dangerous',
    accumulation: 'Emotional residue, mood contamination',
    flavorText: 'Emotions fall. Sadness blue. Anger red. Touch rain. Feel feelings. Not yours.',
  },
  'magnetic_rain': {
    name: 'Ferrofluid Precipitation',
    composition: 'Magnetized liquid metal',
    fallPattern: 'Forms patterns in magnetic fields',
    impact: 'annoying',
    accumulation: 'Magnetic sculptures, stuck to metal',
    flavorText: 'Rain attracted to metal. Forms spikes. Beautiful patterns. Ruins electronics. Artistic destruction.',
  },
  'light_rain': {
    name: 'Photon Precipitation',
    composition: 'Condensed light',
    fallPattern: 'Falls at light speed, briefly',
    impact: 'harmless',
    accumulation: 'Glow puddles, illumination',
    flavorText: 'Light becomes liquid. Falls. Glows. Lights night. Harmless. Pretty. Physics confused.',
  },
  'void_drops': {
    name: 'Emptiness Precipitation',
    composition: 'Concentrated absence',
    fallPattern: 'Falls but isn\'t there',
    impact: 'reality_breaking',
    accumulation: 'Holes in reality',
    flavorText: 'Nothing falls. Absence rains. Hits ground. Creates void. Matter disappears. Concerning.',
  },
  'data_rain': {
    name: 'Information Downpour',
    composition: 'Condensed data streams',
    fallPattern: 'Binary patterns, organized',
    impact: 'annoying',
    accumulation: 'Knowledge puddles, information overload',
    flavorText: 'Information rains. Touch drop. Learn things. Random things. Too many things. Overwhelmed.',
  },
  'dream_drizzle': {
    name: 'Oneiric Precipitation',
    composition: 'Crystallized dreams',
    fallPattern: 'Drifts like feathers',
    impact: 'dangerous',
    accumulation: 'Sleeping puddles, hallucinations',
    flavorText: 'Dreams fall. Touch rain. See visions. Not awake. Not asleep. Both. Neither.',
  },
  'dust_storm_rain': {
    name: 'Abrasive Precipitation',
    composition: 'Charged dust particles in water',
    fallPattern: 'Sandblasts while falling',
    impact: 'dangerous',
    accumulation: 'Mud that cuts',
    flavorText: 'Rain plus sand. Falls together. Cuts skin. Erodes stone. Cleans thoroughly. Painfully.',
  },
  'gravity_droplets': {
    name: 'Dense Water',
    composition: 'Water with localized high gravity',
    fallPattern: 'Craters on impact',
    impact: 'dangerous',
    accumulation: 'Heavy pools, structural damage',
    flavorText: 'Drops weigh tons. Impact craters. Puddles crush. Walk carefully. Very carefully.',
  },
  'oil_rain': {
    name: 'Hydrocarbon Precipitation',
    composition: 'Liquid petroleum compounds',
    fallPattern: 'Viscous, slow descent',
    impact: 'dangerous',
    accumulation: 'Flammable puddles, pollution',
    flavorText: 'Oil rains. Slippery. Flammable. One spark. Inferno. Avoid ignition sources. All of them.',
  },
  'fog_solids': {
    name: 'Solidified Mist',
    composition: 'Crystalline water vapor',
    fallPattern: 'Gentle floating descent',
    impact: 'harmless',
    accumulation: 'Soft fog-snow',
    flavorText: 'Fog becomes solid. Falls softly. Fluffy. Harmless. Melts to fog. Circle continues.',
  },
  'anti_water': {
    name: 'Reverse Hydration',
    composition: 'Desiccating compound',
    fallPattern: 'Absorbs moisture while falling',
    impact: 'dangerous',
    accumulation: 'Drought zones, instant dehydration',
    flavorText: 'Rain removes water. Backwards rain. Touch it. Instantly dry. Everything dry. Dangerously dry.',
  },
  'phase_rain': {
    name: 'Multi-State Precipitation',
    composition: 'Water in all states simultaneously',
    fallPattern: 'Shifts between solid, liquid, gas',
    impact: 'annoying',
    accumulation: 'Confused puddles',
    flavorText: 'Liquid. Solid. Gas. All at once. Changes constantly. Physics protest. Works anyway.',
  },
  'singing_hail': {
    name: 'Harmonic Ice',
    composition: 'Crystalline ice, acoustically resonant',
    fallPattern: 'Rings like bells on impact',
    impact: 'annoying',
    accumulation: 'Musical ground cover',
    flavorText: 'Hail sings. Each impact note. Storm orchestra. Beautiful. Loud. Never stops.',
  },
  'shadow_rain': {
    name: 'Darkness Precipitation',
    composition: 'Condensed shadows',
    fallPattern: 'Falls silently, obscures light',
    impact: 'harmless',
    accumulation: 'Pools of darkness',
    flavorText: 'Shadows fall. Darkness rains. Lands. Spreads. Light fades. Temporary night.',
  },
};
