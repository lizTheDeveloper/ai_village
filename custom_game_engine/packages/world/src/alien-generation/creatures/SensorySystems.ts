/**
 * Creature Sensory Systems
 *
 * How alien creatures perceive their universe.
 * Because vision is just one option among infinite sensory possibilities.
 */

export interface SensorySystem {
  name: string;
  mechanism: string;
  range: 'touch' | 'close' | 'medium' | 'long' | 'planetary' | 'cosmic';
  resolution: 'poor' | 'moderate' | 'good' | 'excellent' | 'perfect';
  limitations: string[];
  flavorText: string;
}

export const SENSORY_SYSTEMS: Record<string, SensorySystem> = {
  'visual_standard': {
    name: 'Optical Vision',
    mechanism: 'Light-sensitive cells detect photons',
    range: 'long',
    resolution: 'excellent',
    limitations: ['Requires light', 'Blocked by obstacles', 'Wavelength limited'],
    flavorText: 'Eyes see. Light bounces. Brain interprets. Works well. Darkness problem.',
  },
  'echolocation': {
    name: 'Sound Imaging',
    mechanism: 'Emits sounds, interprets echoes',
    range: 'medium',
    resolution: 'good',
    limitations: ['Loud environments', 'Sound-absorbing materials', 'Noisy'],
    flavorText: 'Scream. Listen. Build image. Effective. Annoying to neighbors. Bats approve.',
  },
  'electromagnetic_sense': {
    name: 'EM Field Detection',
    mechanism: 'Senses electrical and magnetic fields',
    range: 'medium',
    resolution: 'moderate',
    limitations: ['Interference from technology', 'Conductive materials required', 'Power lines confusing'],
    flavorText: 'Feel electricity. Sense magnets. Map fields. Navigation easy. Cities overwhelming.',
  },
  'infrared_vision': {
    name: 'Thermal Imaging',
    mechanism: 'Detects heat radiation',
    range: 'medium',
    resolution: 'good',
    limitations: ['Temperature contrast needed', 'Thermal barriers', 'Everything glows'],
    flavorText: 'See heat. Everything emits. Warm things bright. Cold things dim. Useful. Strange.',
  },
  'quantum_probability': {
    name: 'Probability Sensing',
    mechanism: 'Perceives quantum probability waves',
    range: 'close',
    resolution: 'excellent',
    limitations: ['Observation collapses states', 'Headaches', 'Paradoxes'],
    flavorText: 'See possibilities. Multiple futures. Until observed. Then one. Confusing. Useful.',
  },
  'time_vision': {
    name: 'Temporal Perception',
    mechanism: 'Sees past and future moments simultaneously',
    range: 'long',
    resolution: 'moderate',
    limitations: ['Temporal paradoxes', 'Present unclear', 'Spoilers everywhere'],
    flavorText: 'See now. See then. See will be. All at once. Present lost. Time confusing.',
  },
  'emotional_detection': {
    name: 'Empathic Sensing',
    mechanism: 'Directly perceives emotional states',
    range: 'close',
    resolution: 'excellent',
    limitations: ['Overwhelming crowds', 'No privacy', 'Others feelings intrusive'],
    flavorText: 'Feel what others feel. Know moods. Sense lies. Exhausting. Privacy nonexistent.',
  },
  'chemical_analysis': {
    name: 'Molecular Tasting',
    mechanism: 'Analyzes airborne/waterborne molecules',
    range: 'close',
    resolution: 'excellent',
    limitations: ['Must be airborne', 'Pollution confusing', 'Bad smells unavoidable'],
    flavorText: 'Taste air. Smell everything. Chemical composition known. Information rich. Often unpleasant.',
  },
  'pressure_waves': {
    name: 'Vibration Sense',
    mechanism: 'Detects minute pressure changes and vibrations',
    range: 'medium',
    resolution: 'good',
    limitations: ['Still environments useless', 'Noisy places chaotic', 'Must be grounded'],
    flavorText: 'Feel vibrations. Ground tells stories. Movement known. Distance estimated. Silent is blind.',
  },
  'gravitational_sense': {
    name: 'Gravity Mapping',
    mechanism: 'Detects local variations in gravitational fields',
    range: 'planetary',
    resolution: 'moderate',
    limitations: ['Weak signal', 'Mass required', 'Calculations intensive'],
    flavorText: 'Feel gravity. Mass shapes space. Large things visible. Small things invisible. Navigate by weight.',
  },
  'dimensional_awareness': {
    name: 'Higher Dimension Sight',
    mechanism: 'Perceives additional spatial dimensions',
    range: 'medium',
    resolution: 'poor',
    limitations: ['Incomprehensible to 3D beings', 'Description impossible', 'Mind-breaking'],
    flavorText: 'See beyond three. Dimensions fold. Space different. Explaining impossible. Understanding rare.',
  },
  'psychic_reception': {
    name: 'Thought Reading',
    mechanism: 'Directly receives neural patterns from other minds',
    range: 'medium',
    resolution: 'excellent',
    limitations: ['Constant mental noise', 'Unwanted thoughts', 'Privacy violations'],
    flavorText: 'Hear thoughts. All thoughts. Cannot stop. Privacy myth. Overwhelmed constantly.',
  },
  'radiation_detection': {
    name: 'Ionizing Radiation Sense',
    mechanism: 'Detects radioactive emissions',
    range: 'long',
    resolution: 'good',
    limitations: ['Dangerous to sense', 'Specific isotopes only', 'Usually bad news'],
    flavorText: 'Sense radiation. Know danger. Find isotopes. Useful. Usually means flee.',
  },
  'air_current': {
    name: 'Aerodynamic Sensing',
    mechanism: 'Incredibly sensitive to air movement',
    range: 'close',
    resolution: 'excellent',
    limitations: ['Wind dependent', 'Still air useless', 'Drafts distracting'],
    flavorText: 'Feel air. Every current. Every breath. Movement detected. Stillness is blindness.',
  },
  'magnetic_navigation': {
    name: 'Geomagnetic Orientation',
    mechanism: 'Senses planetary magnetic field for navigation',
    range: 'planetary',
    resolution: 'moderate',
    limitations: ['Magnetic storms', 'Poles confusing', 'Local anomalies'],
    flavorText: 'Know north. Always. Magnetic field visible. Never lost. Poles weird.',
  },
  'bioluminescence_sight': {
    name: 'Light Emission Detection',
    mechanism: 'Sees only living bioluminescence',
    range: 'long',
    resolution: 'good',
    limitations: ['Non-living invisible', 'Darkness for non-glowing', 'Incomplete picture'],
    flavorText: 'See only life. Glowing life. Rest is darkness. Living things bright. Rocks invisible.',
  },
  'sound_texture': {
    name: 'Acoustic Spectroscopy',
    mechanism: 'Determines material composition from sound resonance',
    range: 'close',
    resolution: 'excellent',
    limitations: ['Must make contact', 'Silent materials unknown', 'Tapping everything'],
    flavorText: 'Tap. Listen. Know material. Density. Composition. Structure. Tap everything. Annoying.',
  },
  'future_echoes': {
    name: 'Precognitive Flashes',
    mechanism: 'Brief glimpses of near-future events',
    range: 'close',
    resolution: 'poor',
    limitations: ['Unreliable', 'Seconds only', 'Changeable futures', 'Headaches'],
    flavorText: 'See moments ahead. Sometimes. Maybe. Future shifts. Helps anyway. Usually.',
  },
  'spatial_distortion': {
    name: 'Warped Space Detection',
    mechanism: 'Perceives curvature and distortion of spacetime',
    range: 'long',
    resolution: 'moderate',
    limitations: ['Requires mass', 'Subtle signals', 'Math intensive'],
    flavorText: 'Space curves. Mass bends it. Sense warping. Navigate better. Think harder.',
  },
  'electrical_discharge': {
    name: 'Active Electroreception',
    mechanism: 'Generates electric field, senses distortions',
    range: 'close',
    resolution: 'excellent',
    limitations: ['Conductive medium required', 'Insulation blocks', 'Energy intensive'],
    flavorText: 'Create field. Feel disruptions. Perfect image. Underwater ideal. Air poor.',
  },
  'phase_detection': {
    name: 'Matter Phase Sensing',
    mechanism: 'Detects objects in different phases of reality',
    range: 'medium',
    resolution: 'good',
    limitations: ['Confusing overlaps', 'Multiple realities', 'Sanity taxing'],
    flavorText: 'See here. See elsewhere. Phases overlap. Reality layered. Truth uncertain.',
  },
  'crystalline_resonance': {
    name: 'Crystal Lattice Sensing',
    mechanism: 'Detects crystalline structures through resonance',
    range: 'medium',
    resolution: 'excellent',
    limitations: ['Crystals only', 'Amorphous materials invisible', 'Specific minerals'],
    flavorText: 'Crystals sing. Each structure unique. Resonance reveals. Other materials silent.',
  },
  'chemical_trail': {
    name: 'Pheromone Tracking',
    mechanism: 'Follows molecular trails with extreme precision',
    range: 'long',
    resolution: 'excellent',
    limitations: ['Wind disperses', 'Rain washes away', 'Old trails fade'],
    flavorText: 'Smell paths. Follow molecules. Trail persists. Story told. Weather erases.',
  },
  'cosmic_ray': {
    name: 'Particle Shower Detection',
    mechanism: 'Senses high-energy particles from space',
    range: 'cosmic',
    resolution: 'poor',
    limitations: ['Atmosphere shields', 'Random signals', 'Rare events'],
    flavorText: 'Cosmic rays felt. Space visible. Through planet. Weak signals. Rare glimpses.',
  },
  'collective_mind': {
    name: 'Hive Sensing',
    mechanism: 'Shares perceptions across colony members',
    range: 'planetary',
    resolution: 'excellent',
    limitations: ['Requires colony', 'Individual view limited', 'Overwhelming data'],
    flavorText: 'See through thousands. Hear through millions. One mind. Many eyes. Individual lost.',
  },
};
