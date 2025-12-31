/**
 * Wind Patterns
 *
 * How air moves on alien worlds.
 * Because gentle breezes are not universal.
 */

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
  'dust_devil_swarm': {
    name: 'Dancing Vortices',
    direction: 'Circular, multiple simultaneous',
    speed: 'strong',
    temperature: 'Hot from friction',
    specialProperties: ['Hundreds at once', 'Coordinated movement', 'Dust clouds'],
    flavorText: 'Whirlwinds everywhere. Dancing. Coordinated. Beautiful. Dangerous. Sand everywhere.',
  },
  'reverse_current': {
    name: 'Backward Wind',
    direction: 'Opposite to pressure gradients',
    speed: 'gale',
    temperature: 'Cold despite pressure',
    specialProperties: ['Defies physics', 'Moves wrong direction', 'Meteorologists cry'],
    flavorText: 'Wind blows wrong way. High to low pressure. Physics violated. Works anyway. Science confused.',
  },
  'plasma_wind': {
    name: 'Ionized Gale',
    direction: 'Electromagnetic, erratic',
    speed: 'hurricane',
    temperature: 'Thousands of degrees',
    specialProperties: ['Conducts electricity', 'Glows visibly', 'Vaporizes organics'],
    flavorText: 'Wind plasma. Glowing. Deadly. Conductive. Lightning everywhere. Stay inside. Far inside.',
  },
  'silent_storm': {
    name: 'Soundless Hurricane',
    direction: 'Circular, massive',
    speed: 'hurricane',
    temperature: 'Variable',
    specialProperties: ['Makes no noise', 'Absorbs sound', 'Eerie silence'],
    flavorText: 'Hurricane force. Complete silence. Destruction quiet. Surreal. Terrifying. Can\'t hear coming.',
  },
  'memory_breeze': {
    name: 'Nostalgic Wind',
    direction: 'Gentle, wandering',
    speed: 'breeze',
    temperature: 'Warm, comforting',
    specialProperties: ['Triggers memories', 'Smells of past', 'Emotional'],
    flavorText: 'Wind carries memories. Smell childhood. Feel past. Remember forgotten. Bittersweet.',
  },
  'razor_wind': {
    name: 'Cutting Current',
    direction: 'Straight lines, precise',
    speed: 'gale',
    temperature: 'Cold',
    specialProperties: ['Cuts like blades', 'Slices exposed skin', 'Surgical precision'],
    flavorText: 'Wind sharp. Cuts flesh. Slices clean. Lethal breeze. Bleeding everywhere. Cover everything.',
  },
  'phase_wind': {
    name: 'Intangible Current',
    direction: 'Through solid objects',
    speed: 'strong',
    temperature: 'Unfelt',
    specialProperties: ['Passes through matter', 'Felt inside body', 'Disturbing'],
    flavorText: 'Wind through walls. Through you. Feel it inside. Deeply uncomfortable. Can\'t block.',
  },
  'singing_current': {
    name: 'Harmonic Wind',
    direction: 'Flowing, musical',
    speed: 'breeze',
    temperature: 'Ambient',
    specialProperties: ['Creates melodies', 'Different tones', 'Never stops'],
    flavorText: 'Wind sings. Constant music. Beautiful. Eventually maddening. Sleep impossible.',
  },
  'vacuum_wind': {
    name: 'Absence Current',
    direction: 'Inward to void points',
    speed: 'hurricane',
    temperature: 'Absolute zero',
    specialProperties: ['Creates vacuum', 'Suffocation', 'Pressure drop'],
    flavorText: 'Wind removes air. Creates vacuum. Lungs empty. Suffocation. Pressure kills. Flee.',
  },
  'emotional_wind': {
    name: 'Feeling Current',
    direction: 'Toward or away from emotions',
    speed: 'strong',
    temperature: 'Emotional temperature',
    specialProperties: ['Carries feelings', 'Influences mood', 'Empathic'],
    flavorText: 'Wind feels. Carries emotion. Touch sadness wind. Become sad. Anger wind. Angry. Contagious feelings.',
  },
  'quantum_wind': {
    name: 'Superposition Current',
    direction: 'All directions simultaneously',
    speed: 'gale',
    temperature: 'Undefined until measured',
    specialProperties: ['Exists in multiple states', 'Observation affects it', 'Probabilistic'],
    flavorText: 'Wind blows everywhere. And nowhere. Both. Measure it. Changes. Quantum breeze. Confusing.',
  },
  'light_wind': {
    name: 'Photon Current',
    direction: 'Radiates from light sources',
    speed: 'breeze',
    temperature: 'Radiation heat',
    specialProperties: ['Pushes with light pressure', 'Solar sail effective', 'Minimal force'],
    flavorText: 'Light pushes. Gentle. Constant. Solar radiation. Navigate by stars. Literally.',
  },
  'crystal_wind': {
    name: 'Resonant Current',
    direction: 'Harmonic patterns',
    speed: 'strong',
    temperature: 'Vibration-heated',
    specialProperties: ['Shatters crystals', 'Resonance frequency', 'Harmonic destruction'],
    flavorText: 'Wind vibrates. Crystals resonate. Shatter. Harmonic frequency. Beautiful destruction. Musical apocalypse.',
  },
  'data_wind': {
    name: 'Information Current',
    direction: 'Network-dependent',
    speed: 'strong',
    temperature: 'Processing heat',
    specialProperties: ['Carries data', 'Transmits information', 'Corrupts occasionally'],
    flavorText: 'Wind transmits. Data flows. Information spreads. Sometimes corrupted. Digital breeze.',
  },
  'void_wind': {
    name: 'Emptiness Current',
    direction: 'From nowhere to nowhere',
    speed: 'apocalyptic',
    temperature: 'Absence of heat',
    specialProperties: ['Erases matter', 'Creates voids', 'Reality thinning'],
    flavorText: 'Wind of nothing. Erases things. Matter disappears. Voids created. Existence optional.',
  },
  'dream_wind': {
    name: 'Oneiric Current',
    direction: 'Drifting, dreamlike',
    speed: 'calm',
    temperature: 'Subjective',
    specialProperties: ['Causes drowsiness', 'Vivid dreams', 'Reality blur'],
    flavorText: 'Wind makes sleepy. Dreams while awake. Reality uncertain. Comfortable. Dangerous. Don\'t sleep.',
  },
  'pressure_wind': {
    name: 'Crushing Gale',
    direction: 'Inward compression',
    speed: 'hurricane',
    temperature: 'Compression-heated',
    specialProperties: ['Extreme pressure', 'Crushing force', 'Structural failure'],
    flavorText: 'Wind crushes. Inward pressure. Structures collapse. Bones creak. Everything compressed. Deadly.',
  },
};
