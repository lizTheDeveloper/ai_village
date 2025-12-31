/**
 * Sky Appearances
 *
 * What alien skies look like.
 * Because blue is not universal.
 */

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
  'golden_dawn': {
    name: 'Perpetual Sunrise',
    colorPalette: ['Gold', 'Amber', 'Orange'],
    luminosity: 'bright',
    atmosphericCause: 'Dust particles scattering yellow wavelengths',
    psychologicalEffect: 'Eternal optimism, never relaxing',
    flavorText: 'Always sunrise. Never day. Never night. Eternal dawn. Beautiful. Exhausting. Sleep schedule impossible.',
  },
  'violet_shimmer': {
    name: 'Purple Heavens',
    colorPalette: ['Deep violet', 'Purple', 'Lavender'],
    luminosity: 'dim',
    atmosphericCause: 'Exotic gas composition',
    psychologicalEffect: 'Calm, occasional unease',
    flavorText: 'Purple sky. Deep purple. Royal. Alien. Beautiful. Unsettling. Not quite right.',
  },
  'crystal_prismatic': {
    name: 'Faceted Sky',
    colorPalette: ['Geometric color blocks', 'Sharp transitions'],
    luminosity: 'bright',
    atmosphericCause: 'Crystalline cloud formations',
    psychologicalEffect: 'Geometric thinking, order obsession',
    flavorText: 'Sky in facets. Geometric. Sharp edges. Colors blocked. Orderly. Too orderly. Unnatural.',
  },
  'smoke_grey': {
    name: 'Ashen Canopy',
    colorPalette: ['Grey', 'Darker grey', 'Ash'],
    luminosity: 'dim',
    atmosphericCause: 'Volcanic ash suspension',
    psychologicalEffect: 'Melancholy, hopelessness',
    flavorText: 'Grey sky. Ash everywhere. Permanent overcast. Depressing. Bleak. Sun rumored. Never seen.',
  },
  'electric_blue': {
    name: 'Charged Atmosphere',
    colorPalette: ['Electric blue', 'Crackling white'],
    luminosity: 'bright',
    atmosphericCause: 'Constant electrical discharge',
    psychologicalEffect: 'Anxiety, hypervigilance',
    flavorText: 'Sky charges. Electric blue. Crackling. Beautiful. Dangerous. Lightning constant. Grounding essential.',
  },
  'transparent': {
    name: 'No Atmosphere',
    colorPalette: ['Black space', 'Stars visible'],
    luminosity: 'bright',
    atmosphericCause: 'Insufficient atmosphere',
    psychologicalEffect: 'Exposure anxiety, agoraphobia',
    flavorText: 'No sky. Space visible. Stars always. No protection. Void above. Radiation below. Shelter needed.',
  },
  'copper_rust': {
    name: 'Oxidized Sky',
    colorPalette: ['Copper', 'Rust', 'Patina green'],
    luminosity: 'normal',
    atmosphericCause: 'Heavy metal oxides',
    psychologicalEffect: 'Industrial nostalgia, metallic taste',
    flavorText: 'Sky rusts. Copper tones. Patina green. Industrial. Metallic. Taste in air. Strange beauty.',
  },
  'oil_slick': {
    name: 'Iridescent Swirl',
    colorPalette: ['Rainbow sheen', 'Shifting patterns'],
    luminosity: 'normal',
    atmosphericCause: 'Hydrocarbon layers',
    psychologicalEffect: 'Fascination, nausea',
    flavorText: 'Sky like oil. Rainbow sheen. Swirls. Shifts. Beautiful. Nauseating. Pollution aesthetic.',
  },
  'white_void': {
    name: 'Blank Canvas',
    colorPalette: ['White', 'Pure white', 'Blinding white'],
    luminosity: 'blinding',
    atmosphericCause: 'Total light scattering',
    psychologicalEffect: 'Sensory deprivation, snow blindness',
    flavorText: 'White. Only white. Everywhere white. No features. No depth. Blinding. Disorienting. Wear goggles.',
  },
  'gradient_sunset': {
    name: 'Perpetual Dusk',
    colorPalette: ['Orange fading to purple', 'Gradient always'],
    luminosity: 'dim',
    atmosphericCause: 'Locked rotation, permanent terminator',
    psychologicalEffect: 'Nostalgia, reluctance to act',
    flavorText: 'Always sunset. Never ends. Gradient permanent. Beautiful. Melancholic. Time feels stopped.',
  },
  'star_field': {
    name: 'Transparent Day',
    colorPalette: ['Pale blue', 'Visible stars'],
    luminosity: 'bright',
    atmosphericCause: 'Thin atmosphere, minimal scattering',
    psychologicalEffect: 'Wonder, existential awareness',
    flavorText: 'Stars visible. Day and night. Both. Sky thin. Space close. Beautiful. Unsettling.',
  },
  'toxic_yellow': {
    name: 'Sulfur Sky',
    colorPalette: ['Sickly yellow', 'Mustard', 'Bile'],
    luminosity: 'normal',
    atmosphericCause: 'Sulfur compounds',
    psychologicalEffect: 'Nausea, illness association',
    flavorText: 'Yellow sky. Sick yellow. Sulfur everywhere. Smells wrong. Looks wrong. Is wrong. Avoid breathing.',
  },
  'aurora_permanent': {
    name: 'Eternal Light Show',
    colorPalette: ['Shifting aurora colors', 'Constantly moving'],
    luminosity: 'bright',
    atmosphericCause: 'Strong magnetic field, solar wind',
    psychologicalEffect: 'Distraction, wonder, sleeplessness',
    flavorText: 'Aurora always. Sky dances. Colors shift. Beautiful. Never stops. Sleep difficult. Eyes tired.',
  },
  'fractal_sky': {
    name: 'Recursive Patterns',
    colorPalette: ['Self-similar patterns', 'Infinite detail'],
    luminosity: 'normal',
    atmosphericCause: 'Unknown, possibly quantum',
    psychologicalEffect: 'Mathematical obsession, hypnosis',
    flavorText: 'Sky repeats. Patterns in patterns. Infinite detail. Hypnotic. Lose time. Stare forever.',
  },
  'binary_stars': {
    name: 'Two-Sun Sky',
    colorPalette: ['Overlapping shadows', 'Double highlights'],
    luminosity: 'bright',
    atmosphericCause: 'Binary star system',
    psychologicalEffect: 'Confusion, dual-time perception',
    flavorText: 'Two suns. Two shadows. Complex light. Never quite right. Time uncertain. Which sun sets?',
  },
  'striped_bands': {
    name: 'Atmospheric Layers',
    colorPalette: ['Horizontal color bands', 'Distinct layers'],
    luminosity: 'normal',
    atmosphericCause: 'Stratified atmospheric composition',
    psychologicalEffect: 'Order appreciation, predictability comfort',
    flavorText: 'Sky in stripes. Layers visible. Orderly. Predictable. Strange comfort. Artificial looking.',
  },
  'glowing_night': {
    name: 'Bioluminescent Atmosphere',
    colorPalette: ['Soft glow', 'Green-blue luminescence'],
    luminosity: 'dim',
    atmosphericCause: 'Airborne bioluminescent organisms',
    psychologicalEffect: 'Calm, mild unease at living sky',
    flavorText: 'Sky glows. Living glow. Organisms everywhere. Breathing life. Literally. Beautiful. Alive. Unsettling.',
  },
  'data_display': {
    name: 'Information Sky',
    colorPalette: ['Scrolling data', 'Matrix-like'],
    luminosity: 'normal',
    atmosphericCause: 'Unknown, possibly artificial',
    psychologicalEffect: 'Information overload, paranoia',
    flavorText: 'Sky shows data. Information streams. Can\'t not read. Overwhelming. What does it mean? Who watches?',
  },
};
