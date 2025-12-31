/**
 * Plant Energy Acquisition Methods
 *
 * How alien plants power themselves.
 * Because photosynthesis is just one option among many.
 */

export interface EnergyMethod {
  name: string;
  mechanism: string;
  requirements: string[];
  efficiency: 'poor' | 'moderate' | 'good' | 'excellent';
  byproducts: string[];
  flavorText: string;
}

export const ENERGY_METHODS: Record<string, EnergyMethod> = {
  'standard_photosynthesis': {
    name: 'Standard Photosynthesis',
    mechanism: 'Converts sunlight, water, CO2 into sugars via chlorophyll',
    requirements: ['Sunlight', 'Water', 'Carbon dioxide', 'Chlorophyll (green, usually)'],
    efficiency: 'good',
    byproducts: ['Oxygen (surprisingly useful)', 'Sugars'],
    flavorText: 'Classic. Reliable. Boring. Makes oxygen. Earth approves. Still works.',
  },
  'infrared_capture': {
    name: 'Infrared Photosynthesis',
    mechanism: 'Captures infrared spectrum, works in dim/red light conditions',
    requirements: ['Any light source', 'Modified chlorophyll', 'Patience'],
    efficiency: 'moderate',
    byproducts: ['Heat absorption', 'Unusual pigmentation'],
    flavorText: 'Sees the invisible. Uses the unusable. Makes do. Evolution finds a way.',
  },
  'chemosynthesis': {
    name: 'Chemosynthesis',
    mechanism: 'Extracts energy from chemical reactions, no light needed',
    requirements: ['Sulfur compounds', 'Volcanic activity', 'Strong stomach (metaphorical)'],
    efficiency: 'moderate',
    byproducts: ['Sulfur dioxide', 'Acidic secretions', 'Bad smell'],
    flavorText: 'Who needs sunlight? Eat rocks. Drink poison. Thrive anyway. Chemistry is magic.',
  },
  'bioluminescent_recycling': {
    name: 'Bioluminescent Recycling',
    mechanism: 'Generates light internally, photosynth from own glow',
    requirements: ['Bioluminescent organs', 'Chemical fuel', 'Energy investment'],
    efficiency: 'poor',
    byproducts: ['Glow (pretty)', 'Net energy loss (problematic)'],
    flavorText: 'Makes own light. Uses own light. Net loss. Still does it. Beauty over efficiency.',
  },
  'thermal_gradient': {
    name: 'Thermal Gradient Harvest',
    mechanism: 'Extracts energy from temperature differences',
    requirements: ['Temperature variation', 'Heat-sensitive tissues', 'Night-day cycle'],
    efficiency: 'moderate',
    byproducts: ['Temperature regulation', 'Ambient cooling'],
    flavorText: 'Hot side, cold side. Energy flows. Physics becomes biology. Thermodynamics surrenders.',
  },
  'electromagnetic_absorption': {
    name: 'EM Field Absorption',
    mechanism: 'Captures ambient electromagnetic radiation',
    requirements: ['Conductive tissues', 'EM field source', 'Tolerance for weirdness'],
    efficiency: 'moderate',
    byproducts: ['Magnetic properties', 'Radio interference', 'Compass confusion'],
    flavorText: 'Eats radiation. Drinks magnetism. Metal-rich tissues. Nature or technology? Yes.',
  },
  'parasitic_theft': {
    name: 'Direct Nutrient Parasitism',
    mechanism: 'Steals sugars directly from host plant roots',
    requirements: ['Host plant', 'Haustoria', 'No shame'],
    efficiency: 'excellent',
    byproducts: ['Dead hosts', 'Guilt (none)', 'Bad reputation'],
    flavorText: 'Why make food? Steal it. From neighbors. From friends. From anyone. Evolution approves.',
  },
  'carnivory': {
    name: 'Active Carnivory',
    mechanism: 'Traps and digests animals for nitrogen and minerals',
    requirements: ['Trap mechanism', 'Digestive enzymes', 'Patience', 'Hubris'],
    efficiency: 'moderate',
    byproducts: ['Nitrogen', 'Minerals', 'Small animal terror'],
    flavorText: 'Plants eat meat. Slowly. Methodically. Reversal of food chain. Animals unamused.',
  },
  'photovoltaic_leaves': {
    name: 'Biological Photovoltaics',
    mechanism: 'Directly converts light to electrical current, stores in bio-batteries',
    requirements: ['Organic semiconductors', 'Conductive sap', 'Evolutionary luck'],
    efficiency: 'excellent',
    byproducts: ['Electrical charge', 'Shock hazard', 'Free energy'],
    flavorText: 'Solar panels. Grown. Living. Efficient. Earth plants jealous. Human engineers confused.',
  },
  'gravitational_differential': {
    name: 'Gravity Differential Harvesting',
    mechanism: 'Extracts energy from gravitational gradients',
    requirements: ['Dense core', 'Variable gravity field', 'Physics tolerance'],
    efficiency: 'poor',
    byproducts: ['Mass fluctuation', 'Localized gravity anomalies', 'Confusion'],
    flavorText: 'Gravity provides. Slightly. Mass bends space. Energy trickles. Barely worth it. Does anyway.',
  },
  'temporal_photosynthesis': {
    name: 'Time-Dilated Photosynthesis',
    mechanism: 'Photosynthesizes in accelerated timeframe, appears instant',
    requirements: ['Temporal manipulation', 'Patience (eternal)', 'Causality tolerance'],
    efficiency: 'excellent',
    byproducts: ['Time distortion', 'Age confusion', 'Paradox headaches'],
    flavorText: 'Grows in seconds. Actually days. From plant perspective. Time relative. Results absolute.',
  },
  'radioactive_decay': {
    name: 'Radiotrophic Metabolism',
    mechanism: 'Metabolizes radioactive decay products',
    requirements: ['Radiation source', 'Heavy metal tolerance', 'Death wish (apparent)'],
    efficiency: 'moderate',
    byproducts: ['Radioactive waste', 'Glow (unhealthy)', 'Geiger clicks'],
    flavorText: 'Eats radiation. Lives in fallout. Thrives in decay. Chernobyl flowers. Life finds way.',
  },
  'sound_absorption': {
    name: 'Acoustic Energy Capture',
    mechanism: 'Converts sound vibrations to metabolic energy',
    requirements: ['Resonant structures', 'Noise pollution', 'Tuned membranes'],
    efficiency: 'poor',
    byproducts: ['Silence (local)', 'Vibration sensitivity', 'Sound deadening'],
    flavorText: 'Feeds on noise. Loves thunder. Adores construction sites. Cities bloom. Silence grows.',
  },
  'quantum_tunneling': {
    name: 'Quantum Energy Harvesting',
    mechanism: 'Extracts energy from quantum fluctuations',
    requirements: ['Quantum-scale structures', 'Heisenberg tolerance', 'Uncertainty acceptance'],
    efficiency: 'excellent',
    byproducts: ['Probabilistic growth', 'Schrödinger states', 'Observer effect sensitivity'],
    flavorText: 'Quantum realm provides. Uncertainty generates. Observation affects. Measurement ruins. Works anyway.',
  },
  'emotional_absorption': {
    name: 'Psychic Energy Feeding',
    mechanism: 'Absorbs ambient emotional energy from nearby beings',
    requirements: ['Empathic tissues', 'Nearby consciousness', 'Questionable ethics'],
    efficiency: 'moderate',
    byproducts: ['Emotional dampening', 'Mood influence', 'Therapy resistance'],
    flavorText: 'Feeds on feelings. Grows from grief. Joy nourishes. Anger sustains. Everyone exhausted.',
  },
  'vacuum_energy': {
    name: 'Zero-Point Field Tapping',
    mechanism: 'Harvests energy from quantum vacuum fluctuations',
    requirements: ['Impossible structures', 'Physics violations', 'Casimir effect exploitation'],
    efficiency: 'excellent',
    byproducts: ['Reality strain', 'Vacuum bubbles', 'Physics confusion'],
    flavorText: 'Empty space has energy. Plant extracts it. Vacuum not empty. Physics reevaluated.',
  },
  'moonlight_specialized': {
    name: 'Lunar Photosynthesis',
    mechanism: 'Optimized for reflected moonlight, nocturnal operation',
    requirements: ['Moon', 'Night', 'Silver-based pigments', 'Patience'],
    efficiency: 'poor',
    byproducts: ['Nocturnal blooming', 'Pale coloration', 'Werewolf confusion'],
    flavorText: 'Works at night. Uses moon. Slow. Inefficient. Romantic. Goths approve.',
  },
  'piezoelectric_growth': {
    name: 'Mechanical Stress Conversion',
    mechanism: 'Converts physical pressure into electrical energy',
    requirements: ['Crystalline structures', 'Wind or animal movement', 'Piezoelectric tissues'],
    efficiency: 'moderate',
    byproducts: ['Electricity', 'Vibration response', 'Touch sensitivity'],
    flavorText: 'Pressure creates power. Touch generates energy. Poke plant. Plant charges. Literal.',
  },
  'geothermal_root': {
    name: 'Deep Earth Heat Tapping',
    mechanism: 'Roots extend to geothermal sources',
    requirements: ['Deep roots', 'Geothermal activity', 'Heat tolerance', 'Ambition'],
    efficiency: 'good',
    byproducts: ['Surface heat', 'Mineral deposits', 'Volcanic association'],
    flavorText: 'Roots go deep. Miles deep. Touch magma. Harvest heat. Surface gardening is for amateurs.',
  },
  'tidal_energy': {
    name: 'Tidal Force Harvesting',
    mechanism: 'Captures energy from tidal movements and gravitational pull',
    requirements: ['Coastal location', 'Moon', 'Flexible tissues', 'Rhythmic tolerance'],
    efficiency: 'moderate',
    byproducts: ['Tidal rhythms', 'Salt tolerance', 'Moon dependency'],
    flavorText: 'Tides pull. Plant responds. Energy flows. Moon controls. Predictable. Reliable. Lunar.',
  },
  'bacterial_symbiosis': {
    name: 'Endosymbiotic Bacteria Colony',
    mechanism: 'Bacteria in tissues produce energy, plant provides shelter',
    requirements: ['Bacterial partnership', 'Mutual trust', 'Stable environment'],
    efficiency: 'good',
    byproducts: ['Bacterial products', 'Nitrogen fixation', 'Symbiotic dependency'],
    flavorText: 'Bacteria live inside. Make energy. Plant provides home. Symbiosis. Like mitochondria. Again.',
  },
  'cosmic_ray': {
    name: 'Cosmic Radiation Metabolism',
    mechanism: 'Processes high-energy particles from space',
    requirements: ['Exposure to sky', 'Radiation-sensitive tissues', 'Minimal atmosphere'],
    efficiency: 'poor',
    byproducts: ['Mutations (frequent)', 'Glow (subtle)', 'Space adaptation'],
    flavorText: 'Space rains particles. Plant eats them. Inefficient. Mutagenic. Changes constantly. Evolves fast.',
  },
  'lightning_storage': {
    name: 'Lightning Capacitor',
    mechanism: 'Attracts and stores lightning strikes',
    requirements: ['Conductive height', 'Storms', 'Insulated core', 'Courage'],
    efficiency: 'excellent',
    byproducts: ['Stored electricity', 'Fire risk', 'Electric field', 'Dramatic appearance'],
    flavorText: 'Attracts lightning. On purpose. Stores charge. Uses slowly. One strike lasts weeks. Dangerous.',
  },
  'methane_processing': {
    name: 'Methane Metabolism',
    mechanism: 'Processes methane into useful energy compounds',
    requirements: ['Methane source', 'Specialized bacteria', 'Anaerobic zones'],
    efficiency: 'moderate',
    byproducts: ['CO2', 'Water', 'Reduced methane', 'Slightly less smell'],
    flavorText: 'Eats methane. Makes energy. Reduces greenhouse gas. Accidentally helpful. Not intentional.',
  },
  'decay_feeding': {
    name: 'Necrophagic Absorption',
    mechanism: 'Absorbs nutrients from decomposing matter directly',
    requirements: ['Dead things', 'Decomposer partnerships', 'Low standards'],
    efficiency: 'good',
    byproducts: ['Rapid growth', 'Morbid associations', 'Graveyards full of them'],
    flavorText: 'Feeds on death. Grows from decay. Circle of life. Less circle. More spiral. Down.',
  },
};
