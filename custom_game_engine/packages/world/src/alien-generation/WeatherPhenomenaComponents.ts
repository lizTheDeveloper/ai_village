/**
 * Weather & Natural Phenomena Generation Components
 *
 * Extensive libraries of atmospheric conditions, disasters, and anomalies for generating
 * infinite varieties of alien weather. Mix and match to create unique meteorological chaos.
 *
 * Philosophy: Earth's weather is violent enough. Alien weather is creative about it.
 */

// ============================================================================
// PRECIPITATION TYPE LIBRARY
// ============================================================================

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
};

// ============================================================================
// WIND PATTERN LIBRARY
// ============================================================================

export interface WindPattern {
  name: string;
  direction: string;
  speed: 'calm' | 'breeze' | 'strong' | 'gale' | 'hurricane' | 'apocalyptic';
  temperature: string;
  specialProperties: string[];
  flavorText: string;
}

export const WIND_PATTERNS: Record<string, WindPattern> = {
  'standard_breeze': {
    name: 'Normal Wind',
    direction: 'Variable, predictable',
    speed: 'breeze',
    temperature: 'Ambient temperature',
    specialProperties: ['None', 'Boring', 'Works as expected'],
    flavorText: 'Wind blows. Things flutter. Standard. Earth-like. Functional.',
  },
  'screaming_gale': {
    name: 'Sonic Wind',
    direction: 'Chaotic, destructive',
    speed: 'apocalyptic',
    temperature: 'Friction-heated',
    specialProperties: ['Produces harmful frequencies', 'Shatters glass', 'Deafening'],
    flavorText: 'Wind screams. Literally. Frequency harmful. Glass shatters. Ears bleed. Shelter mandatory.',
  },
  'crystallizing_breeze': {
    name: 'Frost Wind',
    direction: 'Steady, relentless',
    speed: 'strong',
    temperature: 'Below -100°C',
    specialProperties: ['Instant freezing', 'Crystallizes moisture', 'Shatters frozen things'],
    flavorText: 'Wind freezes everything. Instantly. Breath crystallizes. Exposed skin gone. Ice everywhere.',
  },
  'magnetic_wind': {
    name: 'Electromagnetic Current',
    direction: 'Follows magnetic field lines',
    speed: 'gale',
    temperature: 'Ambient',
    specialProperties: ['Attracts metal', 'Ionizes air', 'Ruins electronics'],
    flavorText: 'Wind charged. Metal objects fly. Electronics die. Compasses spin. Chaos magnetic.',
  },
  'time_vortex': {
    name: 'Temporal Wind',
    direction: 'Spirals through past and future',
    speed: 'strong',
    temperature: 'Meaningless in temporal context',
    specialProperties: ['Ages things', 'Or de-ages', 'Causality optional'],
    flavorText: 'Wind from yesterday. Going tomorrow. Exists now. Sort of. Time is suggestions.',
  },
  'thinking_wind': {
    name: 'Sentient Breeze',
    direction: 'Purposeful, seemingly intelligent',
    speed: 'breeze',
    temperature: 'Comfortable, disturbingly so',
    specialProperties: ['Responds to thoughts', 'Helps or hinders deliberately', 'Has opinions'],
    flavorText: 'Wind thinks. Knows what you want. Sometimes helps. Sometimes doesn\'t. Has favorites.',
  },
  'color_stealing': {
    name: 'Chromatic Drain',
    direction: 'Swirling, beautiful',
    speed: 'breeze',
    temperature: 'Neutral',
    specialProperties: ['Removes color from objects', 'Carries it away', 'Leaves grey world'],
    flavorText: 'Wind steals color. Objects fade. World becomes grayscale. Temporarily. Usually.',
  },
  'gravity_wind': {
    name: 'Gravitational Current',
    direction: 'Down, always down',
    speed: 'gale',
    temperature: 'Ambient',
    specialProperties: ['Increases local gravity', 'Crushing pressure', 'Flight impossible'],
    flavorText: 'Wind pushes down. Everything heavier. Walking difficult. Flying impossible. Gravity wins.',
  },
};

// ============================================================================
// ATMOSPHERIC PHENOMENON LIBRARY
// ============================================================================

export interface AtmosphericPhenomenon {
  name: string;
  visualAppearance: string;
  duration: 'brief' | 'hours' | 'days' | 'permanent' | 'intermittent';
  dangerLevel: 'safe' | 'risky' | 'hazardous' | 'deadly' | 'unsurvivable';
  scientificExplanation: 'understood' | 'theoretical' | 'baffling' | 'impossible';
  flavorText: string;
}

export const ATMOSPHERIC_PHENOMENA: Record<string, AtmosphericPhenomenon> = {
  'double_rainbow': {
    name: 'Standard Rainbow',
    visualAppearance: 'Prismatic arc, light refraction',
    duration: 'brief',
    dangerLevel: 'safe',
    scientificExplanation: 'understood',
    flavorText: 'Light refracts. Colors separate. Arc forms. Pretty. Harmless. Earth-standard.',
  },
  'aurora_predator': {
    name: 'Carnivorous Aurora',
    visualAppearance: 'Shimmering lights, reaching tendrils',
    duration: 'hours',
    dangerLevel: 'deadly',
    scientificExplanation: 'baffling',
    flavorText: 'Aurora hunts. Extends tendrils. Grabs prey. Pulls skyward. Beautiful. Terrifying. Hungry.',
  },
  'sky_mirror': {
    name: 'Atmospheric Reflection',
    visualAppearance: 'Sky becomes perfect mirror',
    duration: 'hours',
    dangerLevel: 'risky',
    scientificExplanation: 'theoretical',
    flavorText: 'Sky reflects. Perfectly. See yourself. See everything. Privacy ends. Self-awareness uncomfortable.',
  },
  'color_storm': {
    name: 'Chromatic Cascade',
    visualAppearance: 'Waves of impossible colors',
    duration: 'brief',
    dangerLevel: 'risky',
    scientificExplanation: 'impossible',
    flavorText: 'Colors that shouldn\'t exist. Visible anyway. Eyes confused. Brain protests. Beautiful migraine.',
  },
  'thought_clouds': {
    name: 'Ideation Condensation',
    visualAppearance: 'Clouds forming into concepts',
    duration: 'intermittent',
    dangerLevel: 'risky',
    scientificExplanation: 'impossible',
    flavorText: 'Thoughts condense. Become visible. Everyone sees. Privacy theoretical. Honesty mandatory.',
  },
  'void_window': {
    name: 'Atmospheric Gap',
    visualAppearance: 'Hole in sky, shows space beyond',
    duration: 'hours',
    dangerLevel: 'hazardous',
    flavorText: 'Atmosphere opens. Void visible. Pressure drops. Air escapes. Close quickly. Or else.',
    scientificExplanation: 'impossible',
  },
  'singing_clouds': {
    name: 'Harmonic Condensation',
    visualAppearance: 'Clouds resonating audibly',
    duration: 'days',
    dangerLevel: 'safe',
    scientificExplanation: 'baffling',
    flavorText: 'Clouds sing. Harmonize. Different notes. Sky orchestra. Constant. Eventually annoying.',
  },
  'recursive_sky': {
    name: 'Self-Referential Atmosphere',
    visualAppearance: 'Sky containing image of sky, infinitely',
    duration: 'permanent',
    dangerLevel: 'safe',
    scientificExplanation: 'impossible',
    flavorText: 'Sky shows sky. That sky shows sky. Pattern continues. Fractal overhead. Math made manifest.',
  },
};

// ============================================================================
// NATURAL DISASTER LIBRARY
// ============================================================================

export interface NaturalDisaster {
  name: string;
  warningSign: string;
  primaryDanger: string;
  secondaryEffects: string[];
  survivalStrategy: string;
  flavorText: string;
}

export const NATURAL_DISASTERS: Record<string, NaturalDisaster> = {
  'standard_tornado': {
    name: 'Cyclonic Vortex',
    warningSign: 'Pressure drop, green sky, rotating clouds',
    primaryDanger: 'Extreme winds, debris',
    secondaryEffects: ['Structural damage', 'Projectile hazards'],
    survivalStrategy: 'Underground shelter, central room',
    flavorText: 'Wind rotates. Violently. Destroys things. Earth-standard disaster. Straightforward.',
  },
  'crystal_earthquake': {
    name: 'Resonance Quake',
    warningSign: 'Harmonic vibrations, crystal formations ringing',
    primaryDanger: 'Shattering crystals become shrapnel',
    secondaryEffects: ['Sonic damage', 'Crystal dust clouds', 'Hearing loss'],
    survivalStrategy: 'Avoid crystal structures, ear protection',
    flavorText: 'Ground vibrates. Crystals resonate. Everything shatters. Musical apocalypse. Sharp apocalypse.',
  },
  'gravity_storm': {
    name: 'Gravitational Anomaly',
    warningSign: 'Objects floating, then falling, unpredictably',
    primaryDanger: 'Random gravity direction changes',
    secondaryEffects: ['Nausea', 'Structural stress', 'Orbital debris'],
    survivalStrategy: 'Secure everything, safety harness',
    flavorText: 'Gravity confused. Up becomes down. Down becomes sideways. Physics negotiable. Survival difficult.',
  },
  'time_storm': {
    name: 'Temporal Distortion',
    warningSign: 'Clocks disagree, déjà vu increases',
    primaryDanger: 'Accelerated aging in affected zones',
    secondaryEffects: ['Memory loops', 'Causality violations', 'Paradoxes'],
    survivalStrategy: 'Leave area. Quickly. Before was.',
    flavorText: 'Time breaks. Flows wrong. Past and future mix. Age decades. Or de-age. Causality suggestions.',
  },
  'reality_fracture': {
    name: 'Dimensional Tear',
    warningSign: 'Physics stops working properly',
    primaryDanger: 'Things stop existing, or exist too much',
    secondaryEffects: ['Existential crisis', 'Matter instability', 'Consciousness fragmentation'],
    survivalStrategy: 'No known strategy. Pray. Philosophically.',
    flavorText: 'Reality cracks. Things leak through. Other things leak out. Existence negotiable. Terror absolute.',
  },
  'swarm_migration': {
    name: 'Living Cloud',
    warningSign: 'Sky darkens with billions of organisms',
    primaryDanger: 'Consumption of all organic matter',
    secondaryEffects: ['Suffocation', 'Total defoliation', 'Starvation after'],
    survivalStrategy: 'Sealed shelter, wait it out',
    flavorText: 'Swarm arrives. Eats everything. Organic everything. Leaves bones. Moves on. Circle of life. Aggressive.',
  },
  'magnetic_reversal': {
    name: 'Polarity Flip',
    warningSign: 'Compasses spinning, aurora at wrong latitude',
    primaryDanger: 'Electromagnetic chaos',
    secondaryEffects: ['Electronics failure', 'Radiation exposure', 'Navigation loss'],
    survivalStrategy: 'Faraday cage, manual navigation',
    flavorText: 'Magnetic field flips. North becomes south. Technology dies. Migration patterns confused. Chaos.',
  },
  'probability_collapse': {
    name: 'Certainty Failure',
    warningSign: 'Unlikely events cluster',
    primaryDanger: 'Improbable things become common',
    secondaryEffects: ['Logic fails', 'Coincidences multiply', 'Causality optional'],
    survivalStrategy: 'Expect unexpected. Assume nothing.',
    flavorText: 'Probability breaks. Impossible events occur. Dice always critical. Luck irrelevant. Chaos reigns.',
  },
};

// ============================================================================
// SKY COLOR/APPEARANCE LIBRARY
// ============================================================================

export interface SkyAppearance {
  name: string;
  colorPalette: string[];
  luminosity: 'dark' | 'dim' | 'normal' | 'bright' | 'blinding';
  atmosphericCause: string;
  psychologicalEffect: string;
  flavorText: string;
}

export const SKY_APPEARANCES: Record<string, SkyAppearance> = {
  'earth_blue': {
    name: 'Standard Blue Sky',
    colorPalette: ['Blue', 'White clouds'],
    luminosity: 'normal',
    atmosphericCause: 'Rayleigh scattering of blue wavelengths',
    psychologicalEffect: 'Comfort, familiarity',
    flavorText: 'Blue sky. Normal. Earth-like. Boring. Comforting. Rare in cosmos.',
  },
  'blood_sky': {
    name: 'Crimson Firmament',
    colorPalette: ['Deep red', 'Orange', 'Rust'],
    luminosity: 'bright',
    atmosphericCause: 'Iron oxide particles suspended high',
    psychologicalEffect: 'Unease, aggression',
    flavorText: 'Sky bleeds. Constantly. Red above. Unsettling below. Mars called. Wants atmosphere back.',
  },
  'void_black': {
    name: 'Perpetual Night',
    colorPalette: ['Black', 'Deep purple'],
    luminosity: 'dark',
    atmosphericCause: 'Light-absorbing atmospheric compounds',
    psychologicalEffect: 'Depression, vitamin D deficiency',
    flavorText: 'Sky black. Always. Sun invisible. Stars gone. Darkness permanent. Bring lights. Many lights.',
  },
  'rainbow_chaos': {
    name: 'Chromatic Turbulence',
    colorPalette: ['All colors', 'Simultaneously', 'Chaotically'],
    luminosity: 'bright',
    atmosphericCause: 'Crystal clouds refracting everything',
    psychologicalEffect: 'Overstimulation, migraines',
    flavorText: 'Every color. Every direction. All at once. Beautiful. Overwhelming. Sunglasses mandatory.',
  },
  'mirror_silver': {
    name: 'Reflective Canopy',
    colorPalette: ['Silver', 'Reflective grey'],
    luminosity: 'bright',
    atmosphericCause: 'Metallic particle clouds',
    psychologicalEffect: 'Narcissism increase, self-consciousness',
    flavorText: 'Sky mirror. Reflects everything. See self. Always. Privacy impossible. Vanity encouraged.',
  },
  'impossible_green': {
    name: 'Emerald Atmosphere',
    colorPalette: ['Unnatural green', 'Copper green'],
    luminosity: 'normal',
    atmosphericCause: 'Copper compounds, chlorine gas',
    psychologicalEffect: 'Nausea, wrongness feeling',
    flavorText: 'Green sky. Wrong green. Shouldn\'t exist green. Eyes protest. Brain confused. Works anyway.',
  },
  'shifting_pattern': {
    name: 'Mutable Sky',
    colorPalette: ['Changes hourly', 'No pattern'],
    luminosity: 'normal',
    atmosphericCause: 'Chemically active atmosphere',
    psychologicalEffect: 'Anxiety, unpredictability stress',
    flavorText: 'Sky changes. Color. Brightness. Constantly. Prediction impossible. Consistency theoretical.',
  },
};

// ============================================================================
// COMPLETE WEATHER SYSTEM EXAMPLES
// ============================================================================

export interface WeatherSystem {
  id: string;
  name: string;
  description: string;

  precipitationType: string;
  windPattern: string;
  atmosphericPhenomenon: string;
  skyAppearance: string;
  associatedDisasters: string[];

  planetType: string;
  frequency: 'rare' | 'seasonal' | 'common' | 'constant' | 'random';
  survivability: 'easy' | 'manageable' | 'challenging' | 'difficult' | 'unlikely';
}

export const EXAMPLE_WEATHER_SYSTEMS: WeatherSystem[] = [
  {
    id: 'crystal_death_01',
    name: 'The Shatter Season',
    description: `Annual event on silicon-rich worlds where atmospheric conditions cause massive crystallization. Water vapor becomes razor-sharp crystal hail that falls at terminal velocity while the ground vibrates in harmonic resonance, shattering existing crystal formations.

The sky turns prismatic as billions of tiny crystals refract light in all directions. Beautiful from underground shelter. Lethal above ground. Colonists learned to schedule around it. Underground cities thrive during three-month season. Surface operations cease.

Survivors collect the fallen crystals. Valuable. Sharp. Useful for cutting tools. Or causing accidents. Handle carefully. Very carefully.`,

    precipitationType: 'crystalline_hail',
    windPattern: 'screaming_gale',
    atmosphericPhenomenon: 'color_storm',
    skyAppearance: 'rainbow_chaos',
    associatedDisasters: ['crystal_earthquake'],

    planetType: 'High-silicate desert world',
    frequency: 'seasonal',
    survivability: 'manageable',
  },

  {
    id: 'time_chaos_01',
    name: 'The Hours That Weren\'t',
    description: `Temporal anomalies manifest as weather. Time flows wrong. Droplets fall from yesterday, land tomorrow, exist now. Some areas age rapidly. Others freeze in temporal stasis. Clocks disagree violently.

The phenomenon appears random but analysis suggests underlying pattern. Pattern predicts itself. Causality loops. Researchers attempt study. Study affects phenomenon. Phenomenon affects researchers. Temporal paradoxes accumulate.

Survival strategy: accept that your Monday might be someone else's Thursday. Appointments become philosophical exercises. Deadlines meaningless. Everyone late. Also early. Simultaneously.`,

    precipitationType: 'time_dilated_droplets',
    windPattern: 'time_vortex',
    atmosphericPhenomenon: 'void_window',
    skyAppearance: 'shifting_pattern',
    associatedDisasters: ['time_storm', 'probability_collapse'],

    planetType: 'Gravitationally anomalous world',
    frequency: 'random',
    survivability: 'challenging',
  },

  {
    id: 'thinking_storm_01',
    name: 'The Consideration',
    description: `Weather system achieves consciousness. Unclear how. Unclear why. Definitely happening. Clouds think. Wind decides. Rain contemplates.

The system responds to human thoughts and fears. Afraid of lightning? More lightning. Want sunshine? Cloud cover increases. It's not malicious. Just... responsive. Aggressively responsive. Like overeager helpful AI. Weather edition.

Colonists learn meditation. Calm thoughts. Peaceful weather. Angry thoughts? Hurricane. Anxious thoughts? Tornado. Therapy sessions reduce storm frequency. Mental health priority. Survival depends on it.`,

    precipitationType: 'memory_rain',
    windPattern: 'thinking_wind',
    atmosphericPhenomenon: 'thought_clouds',
    skyAppearance: 'mirror_silver',
    associatedDisasters: ['gravity_storm'],

    planetType: 'Psychically active world',
    frequency: 'constant',
    survivability: 'difficult',
  },
];
