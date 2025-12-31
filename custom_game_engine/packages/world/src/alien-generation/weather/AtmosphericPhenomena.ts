/**
 * Atmospheric Phenomena
 *
 * Strange things that happen in alien skies.
 * Because atmospheres do more than just exist.
 */

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
    scientificExplanation: 'impossible',
    flavorText: 'Atmosphere opens. Void visible. Pressure drops. Air escapes. Close quickly. Or else.',
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
  'crystal_fog': {
    name: 'Suspended Diamonds',
    visualAppearance: 'Glittering particulate clouds',
    duration: 'hours',
    dangerLevel: 'hazardous',
    scientificExplanation: 'understood',
    flavorText: 'Fog of crystals. Sharp. Airborne. Breathe carefully. Lungs shredded. Beautiful death.',
  },
  'time_aurora': {
    name: 'Temporal Light Show',
    visualAppearance: 'Lights showing past and future events',
    duration: 'intermittent',
    dangerLevel: 'risky',
    scientificExplanation: 'impossible',
    flavorText: 'Aurora displays time. See yesterday. See tomorrow. Causality optional. Spoilers everywhere.',
  },
  'magnetic_sprites': {
    name: 'Field Line Flashes',
    visualAppearance: 'Dancing lights along magnetic patterns',
    duration: 'brief',
    dangerLevel: 'safe',
    scientificExplanation: 'theoretical',
    flavorText: 'Magnetic fields visible. Dance. Flash. Beautiful. Harmless. Navigation aid. Natural compass.',
  },
  'pressure_dome': {
    name: 'Invisible Barrier',
    visualAppearance: 'Nothing visible, solid air',
    duration: 'hours',
    dangerLevel: 'hazardous',
    scientificExplanation: 'baffling',
    flavorText: 'Air becomes solid. Invisible wall. Walk into it. Nose broken. Can\'t see. Can\'t pass.',
  },
  'dream_haze': {
    name: 'Hallucinogenic Clouds',
    visualAppearance: 'Shimmering, shifting formations',
    duration: 'days',
    dangerLevel: 'risky',
    scientificExplanation: 'baffling',
    flavorText: 'Clouds make visions. Hallucinate. Reality uncertain. Beautiful nightmares. Awake dreams.',
  },
  'gravity_lens': {
    name: 'Mass Distortion Display',
    visualAppearance: 'Warped light, stretched images',
    duration: 'permanent',
    dangerLevel: 'safe',
    scientificExplanation: 'understood',
    flavorText: 'Gravity bends light. Images stretched. Stars displaced. Weird view. Navigation confusing.',
  },
  'electric_web': {
    name: 'Lightning Network',
    visualAppearance: 'Persistent electrical arcs',
    duration: 'hours',
    dangerLevel: 'deadly',
    scientificExplanation: 'theoretical',
    flavorText: 'Lightning stays. Forms network. Continuous arcs. Touch anything. Electrocution. Everything conductive.',
  },
  'memory_shimmer': {
    name: 'Nostalgic Mirage',
    visualAppearance: 'Past events replaying visually',
    duration: 'intermittent',
    dangerLevel: 'safe',
    scientificExplanation: 'impossible',
    flavorText: 'See history. Past events visible. Ghosts of yesterday. Not real. Looks real. Confusing.',
  },
  'sound_clouds': {
    name: 'Acoustic Formations',
    visualAppearance: 'Clouds of solidified sound',
    duration: 'hours',
    dangerLevel: 'risky',
    scientificExplanation: 'impossible',
    flavorText: 'Sound becomes visible. Forms clouds. Touch them. Hear music. Disturb them. Sonic boom.',
  },
  'phase_flicker': {
    name: 'Reality Shimmer',
    visualAppearance: 'World flickering between states',
    duration: 'brief',
    dangerLevel: 'hazardous',
    scientificExplanation: 'impossible',
    flavorText: 'Reality flickers. Here. Not here. Alternate states. Existence uncertain. Terrifying strobe.',
  },
  'emotional_aurora': {
    name: 'Feeling Light Show',
    visualAppearance: 'Colors representing mass emotions',
    duration: 'intermittent',
    dangerLevel: 'risky',
    scientificExplanation: 'impossible',
    flavorText: 'Emotions visible. Sky shows feelings. Community mood. Privacy gone. Collective consciousness manifest.',
  },
  'data_smog': {
    name: 'Information Pollution',
    visualAppearance: 'Hazy clouds of visible data',
    duration: 'permanent',
    dangerLevel: 'risky',
    scientificExplanation: 'baffling',
    flavorText: 'Data clouds. Information everywhere. See streams. Read accidentally. Overwhelming. Can\'t unsee.',
  },
  'probability_fog': {
    name: 'Quantum Haze',
    visualAppearance: 'Superposition mist',
    duration: 'hours',
    dangerLevel: 'hazardous',
    scientificExplanation: 'impossible',
    flavorText: 'Fog of possibilities. Multiple states. Observe to collapse. Each observer sees different. Confusing.',
  },
  'shadow_corona': {
    name: 'Dark Halo',
    visualAppearance: 'Ring of darkness around sun',
    duration: 'permanent',
    dangerLevel: 'safe',
    scientificExplanation: 'baffling',
    flavorText: 'Sun surrounded by darkness. Bright center. Dark halo. Paradox visible. Science confused.',
  },
  'crystalline_aurora': {
    name: 'Solid Light Display',
    visualAppearance: 'Aurora that can be touched',
    duration: 'hours',
    dangerLevel: 'risky',
    scientificExplanation: 'impossible',
    flavorText: 'Aurora solid. Touch lights. Grab colors. Solid photons. Beautiful. Sharp. Cut carefully.',
  },
  'void_sphere': {
    name: 'Atmospheric Absence',
    visualAppearance: 'Perfect sphere of nothing',
    duration: 'hours',
    dangerLevel: 'deadly',
    scientificExplanation: 'impossible',
    flavorText: 'Sphere of void. No air. No light. No matter. Touch edge. Disappear. Gone. Completely.',
  },
  'plasma_river': {
    name: 'Ionized Flow',
    visualAppearance: 'Streams of glowing plasma in sky',
    duration: 'intermittent',
    dangerLevel: 'hazardous',
    scientificExplanation: 'theoretical',
    flavorText: 'Plasma flows. Across sky. Glowing rivers. Hot. Conductive. Beautiful. Deadly.',
  },
};
