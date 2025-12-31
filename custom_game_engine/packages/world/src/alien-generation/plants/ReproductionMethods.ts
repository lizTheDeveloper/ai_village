/**
 * Plant Reproduction Methods
 *
 * How alien plants make more alien plants.
 * Because biology gets creative when unconstrained by Earth.
 */

export interface ReproductionMethod {
  name: string;
  mechanism: string;
  offspringCount: string;
  success_rate: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' | 'guaranteed';
  requirements: string[];
  flavorText: string;
}

export const REPRODUCTION_METHODS: Record<string, ReproductionMethod> = {
  'spore_dispersal': {
    name: 'Spore Cloud',
    mechanism: 'Releases millions of microscopic spores into air',
    offspringCount: 'Millions per release',
    success_rate: 'low',
    requirements: ['Wind', 'Suitable landing sites', 'Luck'],
    flavorText: 'Quantity over quality. Million spores. Ten survive. Good enough. Evolution approves.',
  },
  'explosive_pods': {
    name: 'Ballistic Seed Dispersal',
    mechanism: 'Seed pods explode, launching seeds at high velocity',
    offspringCount: 'Hundreds per pod',
    success_rate: 'moderate',
    requirements: ['Pressure buildup', 'Explosive mechanism', 'Trajectory luck'],
    flavorText: 'Seeds launched. Violently. Far. Random directions. Some land well. Most don\'t.',
  },
  'animal_deception': {
    name: 'Fruit Mimicry',
    mechanism: 'Produces appealing fruit, seeds survive digestion',
    offspringCount: 'Dozens per fruit',
    success_rate: 'high',
    requirements: ['Attractive fruit', 'Digestive resistance', 'Animals'],
    flavorText: 'Make fruit. Taste good. Animals eat. Seeds fertilized. Delivered far. Free shipping.',
  },
  'fragmentation': {
    name: 'Vegetative Fragmentation',
    mechanism: 'Breaks apart, each piece becomes new plant',
    offspringCount: 'Varies by breakage',
    success_rate: 'very_high',
    requirements: ['Physical damage', 'Each fragment viable'],
    flavorText: 'Break apart. Each piece grows. Damage creates offspring. Herbivory backfires.',
  },
  'runners': {
    name: 'Underground Runners',
    mechanism: 'Extends underground stems, sprouts new plants',
    offspringCount: 'Dozens per season',
    success_rate: 'very_high',
    requirements: ['Soil', 'Space', 'Nutrients'],
    flavorText: 'Spreads underground. Pops up elsewhere. Same plant. Different location. Surprise.',
  },
  'time_delayed': {
    name: 'Delayed Germination',
    mechanism: 'Seeds wait decades for perfect conditions',
    offspringCount: 'Hundreds, eventually',
    success_rate: 'moderate',
    requirements: ['Patience', 'Specific trigger', 'Long-term survival'],
    flavorText: 'Seeds wait. Years. Decades. Centuries. Right moment. Then germinate. Worth waiting.',
  },
  'cloning': {
    name: 'Perfect Cloning',
    mechanism: 'Produces genetically identical offspring asexually',
    offspringCount: 'Dozens per cycle',
    success_rate: 'very_high',
    requirements: ['No partner needed', 'Stable environment'],
    flavorText: 'Clone self. Exactly. No variation. No sex. No partner. Efficient. Boring.',
  },
  'dimensional_scattering': {
    name: 'Cross-Dimensional Seeding',
    mechanism: 'Seeds dispersed through dimensional rifts',
    offspringCount: 'Unknown - across dimensions',
    success_rate: 'very_low',
    requirements: ['Dimensional rifts', 'Luck', 'Physics violations'],
    flavorText: 'Seeds to other dimensions. Most lost. Some succeed. Multiverse gardening.',
  },
  'symbiotic_birth': {
    name: 'Hosted Germination',
    mechanism: 'Seeds grow inside living hosts',
    offspringCount: 'Few per host',
    success_rate: 'high',
    requirements: ['Willing host', 'Unwilling host also works'],
    flavorText: 'Seed in host. Grows slowly. Emerges eventually. Host survives. Usually.',
  },
  'budding': {
    name: 'Vegetative Budding',
    mechanism: 'New plants grow as buds on parent',
    offspringCount: 'Dozens per year',
    success_rate: 'very_high',
    requirements: ['Mature parent', 'Energy reserves'],
    flavorText: 'Buds appear. Grow larger. Drop off. Independent plants. Still connected emotionally.',
  },
  'wind_dancing': {
    name: 'Aerial Pollination Dance',
    mechanism: 'Performs elaborate movements to scatter pollen on wind',
    offspringCount: 'Thousands of seeds if successful',
    success_rate: 'moderate',
    requirements: ['Wind', 'Timing', 'Choreography'],
    flavorText: 'Plant dances. Wind carries pollen. Elegant. Effective. Beautiful. Reproductive ballet.',
  },
  'parthenogenesis': {
    name: 'Virgin Birth',
    mechanism: 'Seeds develop without fertilization',
    offspringCount: 'Moderate numbers',
    success_rate: 'high',
    requirements: ['None - completely independent'],
    flavorText: 'No partner. No problem. Seeds anyway. Self-sufficient. Evolution finds loophole.',
  },
  'memory_seeds': {
    name: 'Genetic Memory Transfer',
    mechanism: 'Seeds contain parent\'s memories and experiences',
    offspringCount: 'Few, precious',
    success_rate: 'high',
    requirements: ['Conscious parent', 'Memory encoding'],
    flavorText: 'Seeds remember. Parent memories. Lessons learned. Mistakes avoided. Wisdom inherited.',
  },
  'time_loop': {
    name: 'Causal Loop Reproduction',
    mechanism: 'Offspring exist before parent, become own ancestor',
    offspringCount: 'Paradoxical',
    success_rate: 'guaranteed',
    requirements: ['Temporal manipulation', 'Causality tolerance', 'Headache tolerance'],
    flavorText: 'Child before parent. Becomes parent. Loop eternal. Causality weeps. Works though.',
  },
  'quantum_splitting': {
    name: 'Quantum State Division',
    mechanism: 'Plant exists in superposition, collapses into multiple instances',
    offspringCount: 'Multiple probable offspring',
    success_rate: 'moderate',
    requirements: ['Quantum instability', 'Observer', 'Physics degree'],
    flavorText: 'One plant. Multiple states. Observation creates offspring. Schrödinger confused.',
  },
  'broadcast_seeding': {
    name: 'Electromagnetic Seed Transmission',
    mechanism: 'Genetic information broadcast as radio waves',
    offspringCount: 'Unlimited range, low reception',
    success_rate: 'very_low',
    requirements: ['Radio transmission', 'Receiver plants', 'Clear signal'],
    flavorText: 'Broadcast DNA. Radio waves. Seeds reassemble. Reception poor. Occasional success.',
  },
  'crystalline_splitting': {
    name: 'Crystal Fracture Reproduction',
    mechanism: 'Crystalline structures split perfectly',
    offspringCount: 'Two per split',
    success_rate: 'very_high',
    requirements: ['Crystalline biology', 'Critical mass'],
    flavorText: 'Crystal grows. Reaches size. Splits perfectly. Two plants. Identical. Geometric.',
  },
  'emotional_conception': {
    name: 'Feeling-Based Generation',
    mechanism: 'Strong emotions nearby cause spontaneous seed generation',
    offspringCount: 'Varies by emotional intensity',
    success_rate: 'moderate',
    requirements: ['Emotional beings', 'Strong feelings', 'Proximity'],
    flavorText: 'Love nearby. Seeds form. Anger works too. Any emotion. Plant feeds. Creates.',
  },
  'sacrificial_reproduction': {
    name: 'Death Bloom',
    mechanism: 'Parent dies to create massive seed output',
    offspringCount: 'Thousands',
    success_rate: 'high',
    requirements: ['Mature plant', 'Triggers', 'Acceptance of death'],
    flavorText: 'Final act. Massive bloom. Seeds everywhere. Parent dies. Legacy continues.',
  },
  'neural_networking': {
    name: 'Thought-Sharing Propagation',
    mechanism: 'Connects to parent via neural network, grows copy',
    offspringCount: 'Limited by network capacity',
    success_rate: 'high',
    requirements: ['Neural connection', 'Bandwidth', 'Compatible substrate'],
    flavorText: 'Share thoughts. Download self. Grow copy. Elsewhere. Instant transmission. Biological internet.',
  },
};
