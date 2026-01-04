/**
 * Creature Diet Patterns
 *
 * What alien creatures eat and how they process energy.
 * Because "eating" is a surprisingly flexible concept.
 */

export interface DietPattern {
  name: string;
  primarySource: string;
  processingMethod: string;
  efficiency: 'poor' | 'moderate' | 'good' | 'excellent' | 'perfect';
  byproducts: string[];
  flavorText: string;

  // Ecological coherence metadata
  /** Item IDs from the game that this diet consumes (e.g., ['berry', 'wheat', 'apple']) */
  relatedItems: string[];

  /** Base ecological spawn weight (0.0-1.0). Higher weight = more common predators.
   * Should match food source spawn rate. Common items → high weight, rare items → low weight */
  ecologicalWeight: number;

  /** Optional realm-specific weight overrides. Higher in realms where this diet's resources are abundant.
   * Example: dream_feeding has 0.8 in dream_realm but 0.05 elsewhere */
  realmWeights?: Record<string, number>;

  /** If true, this diet should be removed (no items exist, breaks ecology, etc.) */
  deprecated?: boolean;

  /** Reason for deprecation if deprecated=true */
  deprecationReason?: string;
}

export const DIET_PATTERNS: Record<string, DietPattern> = {
  'herbivore_standard': {
    name: 'Plant Matter Consumption',
    primarySource: 'Plants, vegetation, cellulose',
    processingMethod: 'Digestive enzymes break down plant cells',
    efficiency: 'moderate',
    byproducts: ['Waste matter', 'Methane', 'Fertilizer'],
    flavorText: 'Eat plants. Lots of plants. Digest slowly. Nutrients extracted. Vegetation everywhere.',
    relatedItems: ['berry', 'wheat', 'apple', 'carrot', 'leaves', 'fiber'],
    ecologicalWeight: 1.0, // Most common diet - all items are common
  },
  'carnivore_predator': {
    name: 'Meat Hunter',
    primarySource: 'Other living creatures',
    processingMethod: 'Protein digestion, nutrient absorption',
    efficiency: 'good',
    byproducts: ['Bones', 'Waste', 'Territory marking'],
    flavorText: 'Hunt. Kill. Eat. Protein efficient. Other creatures food. Circle of life.',
    relatedItems: ['raw_meat'], // Generated from hunting herbivores
    ecologicalWeight: 0.7, // Less common than herbivores (needs prey base)
  },
  'photosynthesis': {
    name: 'Light Feeding',
    primarySource: 'Stellar radiation',
    processingMethod: 'Converts light into chemical energy',
    efficiency: 'excellent',
    byproducts: ['Oxygen', 'Sugar storage', 'Chlorophyll waste'],
    flavorText: 'Stand in sun. Absorb light. Make food. No hunting. Peaceful. Slow.',
    relatedItems: [], // Uses sunlight (free resource in lit areas)
    ecologicalWeight: 0.4, // Uncommon - more plant-like than animal-like
  },
  'lithotroph': {
    name: 'Rock Eater',
    primarySource: 'Minerals and rocks',
    processingMethod: 'Chemical dissolution and mineral extraction',
    efficiency: 'poor',
    byproducts: ['Sand', 'Mineral dust', 'Eroded terrain'],
    flavorText: 'Eat rocks. Digest minerals. Slow process. Patient required. Teeth strong.',
    relatedItems: ['stone'], // Common but poor efficiency
    ecologicalWeight: 0.2, // Rare despite common food source (slow, inefficient)
  },
  'energy_absorption': {
    name: 'Pure Energy Feeding',
    primarySource: 'Ambient electromagnetic energy',
    processingMethod: 'Direct energy conversion',
    efficiency: 'excellent',
    byproducts: ['Heat radiation', 'Electromagnetic interference'],
    flavorText: 'Absorb energy. Direct conversion. No digestion. Efficient. Power lines tempting.',
    relatedItems: ['mana_crystal'], // Rare magical energy source
    ecologicalWeight: 0.2, // Rare - requires magical areas
  },
  'decomposer': {
    name: 'Decay Processor',
    primarySource: 'Dead organic matter',
    processingMethod: 'Enzymatic breakdown of corpses',
    efficiency: 'good',
    byproducts: ['Soil nutrients', 'Methane', 'Compost'],
    flavorText: 'Eat death. Recycle corpses. Ecosystem service. Unappreciated. Essential.',
    relatedItems: [], // Generated from creature deaths
    ecologicalWeight: 0.6, // Important for ecosystem recycling
  },
  'filter_feeder': {
    name: 'Passive Filtering',
    primarySource: 'Microscopic organisms in fluid',
    processingMethod: 'Filters large volumes, extracts nutrients',
    efficiency: 'moderate',
    byproducts: ['Filtered water', 'Expelled matter', 'Clean environment'],
    flavorText: 'Open mouth. Water flows. Filter particles. Close mouth. Repeat. Simple.',
    relatedItems: ['water'], // Common in aquatic environments
    ecologicalWeight: 0.5, // Moderate - aquatic only
  },
  'chemosynthesis': {
    name: 'Chemical Energy Extraction',
    primarySource: 'Inorganic chemical reactions',
    processingMethod: 'Oxidizes chemicals for energy',
    efficiency: 'good',
    byproducts: ['Chemical waste', 'Heat', 'Unusual compounds'],
    flavorText: 'Find chemicals. Oxidize. Extract energy. Light unnecessary. Darkness fine.',
    relatedItems: [], // Deep sea vents, underground
    ecologicalWeight: 0.25,
  },
  'parasitic': {
    name: 'Host Dependency',
    primarySource: 'Living host organisms',
    processingMethod: 'Absorbs nutrients from host',
    efficiency: 'excellent',
    byproducts: ['Weakened host', 'Dependency', 'Eventual death'],
    flavorText: 'Attach to host. Drain slowly. Live free. Host suffers. Symbiosis questionable.',
    relatedItems: [], // Requires living hosts
    ecologicalWeight: 0.3,
  },
  'emotional_vampirism': {
    name: 'Feeling Consumption',
    primarySource: 'Emotional energy from sentient beings',
    processingMethod: 'Psychic absorption of emotions',
    efficiency: 'good',
    byproducts: ['Emotional numbness', 'Depression', 'Therapy bills'],
    flavorText: 'Feed on feelings. Drain emotions. Leave emptiness. Nourished. Others exhausted.',
    relatedItems: [], // Abstract - emotions from sentient beings
    ecologicalWeight: 0.1,
  },
  'temporal_feeding': {
    name: 'Time Consumption',
    primarySource: 'Temporal energy from aging',
    processingMethod: 'Extracts time itself as nutrient',
    efficiency: 'excellent',
    byproducts: ['Accelerated aging', 'Time distortions', 'Premature death'],
    flavorText: 'Eat time. Steal years. Prey ages. Predator nourished. Cruel. Effective.',
    relatedItems: [], // No time-based consumable resources
    ecologicalWeight: 0.0,
    deprecated: true,
    deprecationReason: 'No time-based resources exist in game',
  },
  'radiation_metabolizer': {
    name: 'Radioactive Diet',
    primarySource: 'Ionizing radiation',
    processingMethod: 'Converts radiation into usable energy',
    efficiency: 'good',
    byproducts: ['Decay products', 'Secondary radiation', 'Glowing'],
    flavorText: 'Eat radiation. Glow slightly. Healthy. Others avoid. Solitary life.',
    relatedItems: [], // Radiation sources (rare)
    ecologicalWeight: 0.15,
  },
  'memory_consumption': {
    name: 'Thought Eating',
    primarySource: 'Memories and knowledge',
    processingMethod: 'Absorbs neural patterns as food',
    efficiency: 'moderate',
    byproducts: ['Amnesia', 'Confusion', 'Lost skills'],
    flavorText: 'Eat memories. Drain knowledge. Victims forget. Predator learns. Terrible trade.',
    relatedItems: ['material:memory_crystal'], // Legendary from surrealMaterials.ts
    ecologicalWeight: 0.05, // Very rare
    realmWeights: {
      'dream_realm': 0.4, // Memories form in dreams
      'celestial': 0.2, // Long-lived beings accumulate memories
    },
  },
  'quantum_sustenance': {
    name: 'Probability Feeding',
    primarySource: 'Quantum uncertainty',
    processingMethod: 'Collapses probability waves for energy',
    efficiency: 'excellent',
    byproducts: ['Certainty', 'Collapsed states', 'Determinism'],
    flavorText: 'Feed on uncertainty. Collapse probability. Energy released. Reality solidifies.',
    relatedItems: [], // No quantum items exist in game
    ecologicalWeight: 0.0,
    deprecated: true,
    deprecationReason: 'No quantum items exist in game. User feedback: "is that a real thing and can it be crafted or is that a bunch of random nonsense"',
  },
  'sound_digestion': {
    name: 'Acoustic Nutrition',
    primarySource: 'Sound vibrations',
    processingMethod: 'Converts acoustic energy to metabolic fuel',
    efficiency: 'moderate',
    byproducts: ['Silence', 'Dampened acoustics', 'Echo absorption'],
    flavorText: 'Eat sound. Absorb vibrations. Silence grows. Loud environments feast. Quiet starvation.',
    relatedItems: ['material:frozen_music'], // Rare sound crystal from surrealMaterials.ts
    ecologicalWeight: 0.08,
  },
  'dimensional_scavenging': {
    name: 'Cross-Dimensional Feeding',
    primarySource: 'Matter from parallel dimensions',
    processingMethod: 'Pulls food from alternate realities',
    efficiency: 'good',
    byproducts: ['Dimensional instability', 'Portal residue', 'Confused physics'],
    flavorText: 'Reach elsewhere. Grab food. Pull through. Dimensions leak. Convenient. Destabilizing.',
    relatedItems: [],
    ecologicalWeight: 0.0,
    deprecated: true,
    deprecationReason: 'Breaks ecology - pulling food from parallel dimensions bypasses resource constraints',
  },
  'symbiotic_farming': {
    name: 'Internal Agriculture',
    primarySource: 'Cultivated internal organisms',
    processingMethod: 'Farms bacteria/algae inside body',
    efficiency: 'excellent',
    byproducts: ['Excess organisms', 'Symbiont waste', 'Mutual benefit'],
    flavorText: 'Farm inside self. Organisms grow. Harvest internally. Mutual benefit. Walking ecosystem.',
    relatedItems: [], // Self-sustaining - farms bacteria inside
    ecologicalWeight: 0.3,
  },
  'dream_feeding': {
    name: 'Oneiric Consumption',
    primarySource: 'Dreams of sleeping beings',
    processingMethod: 'Absorbs dream energy while prey sleeps',
    efficiency: 'moderate',
    byproducts: ['Nightmares', 'Insomnia', 'Dream loss'],
    flavorText: 'Feed on dreams. Sleeping prey. Drain fantasies. Wake unrested. Dreams eaten.',
    relatedItems: ['material:dream_crystal'], // Legendary item from surrealMaterials.ts
    ecologicalWeight: 0.05, // Very rare in most realms
    realmWeights: {
      'dream_realm': 0.8, // Dreams are abundant in dream realm
      'celestial': 0.15, // Some dreams in celestial realm
    },
  },
  'magnetic_digestion': {
    name: 'Ferrous Diet',
    primarySource: 'Magnetic metals',
    processingMethod: 'Metabolizes iron and magnetic materials',
    efficiency: 'moderate',
    byproducts: ['Rust', 'Magnetic fields', 'Metal shortage'],
    flavorText: 'Eat metal. Digest iron. Magnetic attraction. Literal. Tools disappear.',
    relatedItems: ['material:forged_steel'], // Uncommon metal materials
    ecologicalWeight: 0.2,
  },
  'stellar_sipping': {
    name: 'Star Drinking',
    primarySource: 'Stellar plasma',
    processingMethod: 'Absorbs energy directly from stars',
    efficiency: 'perfect',
    byproducts: ['Heat radiation', 'Stellar wind', 'Dimmed stars'],
    flavorText: 'Drink from stars. Plasma consumed. Energy infinite. Heat extreme. Casual apocalypse.',
    relatedItems: [],
    ecologicalWeight: 0.0,
    deprecated: true,
    deprecationReason: 'Scale mismatch - drinking from stars breaks game ecology',
  },
  'pain_metabolizer': {
    name: 'Suffering Sustenance',
    primarySource: 'Pain and suffering',
    processingMethod: 'Converts anguish into nutrients',
    efficiency: 'good',
    byproducts: ['Increased suffering', 'Torture', 'Cruelty'],
    flavorText: 'Feed on pain. Cause suffering. Nourished by anguish. Evil. Effective.',
    relatedItems: [],
    ecologicalWeight: 0.0,
    deprecated: true,
    deprecationReason: 'Unethical mechanic - requires causing suffering',
  },
  'crystalline_consumption': {
    name: 'Mineral Lattice Digestion',
    primarySource: 'Crystalline structures',
    processingMethod: 'Breaks down crystal lattices',
    efficiency: 'moderate',
    byproducts: ['Crystal dust', 'Gem shortage', 'Mineral depletion'],
    flavorText: 'Eat crystals. Digest gems. Beautiful food. Jewelers weep. Delicious.',
    relatedItems: ['material:dream_crystal', 'material:memory_crystal', 'material:resonant_crystal'],
    ecologicalWeight: 0.15, // Rare/legendary crystals
  },
  'gravity_feeding': {
    name: 'Gravitational Consumption',
    primarySource: 'Gravitational potential energy',
    processingMethod: 'Extracts energy from mass-warped space',
    efficiency: 'excellent',
    byproducts: ['Weakened gravity', 'Orbital changes', 'Physics anomalies'],
    flavorText: 'Feed on gravity. Reduce mass attraction. Lighter world. Eventually. Problematic.',
    relatedItems: [],
    ecologicalWeight: 0.0,
    deprecated: true,
    deprecationReason: 'No gravitational resources exist in game',
  },
  'void_consumption': {
    name: 'Entropy Eating',
    primarySource: 'Heat death and decay',
    processingMethod: 'Accelerates entropy, feeds on disorder',
    efficiency: 'good',
    byproducts: ['Increased decay', 'Heat death', 'Universal end'],
    flavorText: 'Eat order. Create chaos. Feed on entropy. Universe decays faster. Thanks.',
    relatedItems: [],
    ecologicalWeight: 0.0,
    deprecated: true,
    deprecationReason: 'Eating entropy has no game representation',
  },
  'information_digestion': {
    name: 'Data Consumption',
    primarySource: 'Information and data',
    processingMethod: 'Absorbs knowledge as nutrients',
    efficiency: 'excellent',
    byproducts: ['Lost data', 'Corrupted files', 'Amnesia'],
    flavorText: 'Eat information. Digest data. Knowledge consumed. Books blank. Minds empty.',
    relatedItems: ['material:folded_parchment'], // Common paper material
    ecologicalWeight: 0.2,
  },
  'omnivore': {
    name: 'Mixed Diet',
    primarySource: 'Plants and meat',
    processingMethod: 'Versatile digestion handles both',
    efficiency: 'good',
    byproducts: ['Waste matter', 'Varied nutrients'],
    flavorText: 'Eat anything. Plants today. Meat tomorrow. Flexible. Adaptable. Survival high.',
    relatedItems: ['berry', 'wheat', 'apple', 'raw_meat', 'fish', 'egg'],
    ecologicalWeight: 0.9, // Very common - all food sources common
  },
  'insectivore': {
    name: 'Bug Eater',
    primarySource: 'Insects and arthropods',
    processingMethod: 'Crunchy protein digestion',
    efficiency: 'excellent',
    byproducts: ['Chitin fragments', 'Waste'],
    flavorText: 'Eat bugs. Abundant. Protein rich. Crunchy. Everywhere. Easy hunting.',
    relatedItems: [], // TODO: Add insect items to game
    ecologicalWeight: 0.85, // Should be very common once insects exist
  },
  'frugivore': {
    name: 'Fruit Consumer',
    primarySource: 'Fruits and berries',
    processingMethod: 'Sugar extraction, seed dispersal',
    efficiency: 'good',
    byproducts: ['Seeds', 'Fertilizer', 'Sugar crash'],
    flavorText: 'Eat fruit. Sweet. Seeds spread. Mutual benefit. Plants happy. Tasty.',
    relatedItems: ['berry', 'apple'],
    ecologicalWeight: 0.7, // Common fruits
  },
  'nectarivore': {
    name: 'Nectar Feeder',
    primarySource: 'Flower nectar',
    processingMethod: 'High-sugar liquid digestion',
    efficiency: 'moderate',
    byproducts: ['Pollen transfer', 'Waste liquid'],
    flavorText: 'Drink nectar. Pollinate flowers. Sweet energy. Frequent feeding. Mutual benefit.',
    relatedItems: ['honey'], // Uncommon
    ecologicalWeight: 0.4, // Less common - needs flowering plants
  },
  'piscivore': {
    name: 'Fish Eater',
    primarySource: 'Fish and aquatic creatures',
    processingMethod: 'Protein-rich seafood digestion',
    efficiency: 'good',
    byproducts: ['Bones', 'Scales', 'Fishy smell'],
    flavorText: 'Eat fish. Hunt water. Protein abundant. Omega-3 rich. Smell fishy.',
    relatedItems: ['fish'], // Common in aquatic biomes
    ecologicalWeight: 0.7, // Common where fish exist
  },
  'scavenger': {
    name: 'Carrion Eater',
    primarySource: 'Dead animals (not decomposed)',
    processingMethod: 'Digests fresh to slightly aged meat',
    efficiency: 'moderate',
    byproducts: ['Bones', 'Waste', 'Disease risk'],
    flavorText: 'Eat dead things. No hunting needed. Wait for death. Clean up. Ecosystem service.',
    relatedItems: ['raw_meat'], // From deaths
    ecologicalWeight: 0.55, // Moderate - depends on death rate
  },
  'hematophage': {
    name: 'Blood Drinker',
    primarySource: 'Blood from living creatures',
    processingMethod: 'Liquid nutrient extraction',
    efficiency: 'excellent',
    byproducts: ['Anticoagulant', 'Disease transmission'],
    flavorText: 'Drink blood. Pierce skin. Sip nutrients. Host survives. Usually. Vampiric.',
    relatedItems: [], // Generated from living entities
    ecologicalWeight: 0.4, // Moderate - parasitic but not lethal
  },
  'fungivore': {
    name: 'Fungus Eater',
    primarySource: 'Mushrooms and fungi',
    processingMethod: 'Enzymatic breakdown of chitin',
    efficiency: 'good',
    byproducts: ['Spore dispersal', 'Waste'],
    flavorText: 'Eat fungus. Mushrooms everywhere. Decomposers consumed. Ironic. Nutritious.',
    relatedItems: ['mushroom', 'material:giant_mushroom'], // Uncommon
    ecologicalWeight: 0.5, // Moderate - underground/dark biomes
  },
  'granivore': {
    name: 'Seed Eater',
    primarySource: 'Seeds and grains',
    processingMethod: 'Grinds and digests hard seeds',
    efficiency: 'excellent',
    byproducts: ['Hulls', 'Undigested seeds', 'Dispersal'],
    flavorText: 'Eat seeds. Crack shells. Grind hard. Protein and fat rich. Some survive.',
    relatedItems: ['wheat'], // Common
    ecologicalWeight: 0.8, // Common - seeds abundant
  },
  'folivore': {
    name: 'Leaf Specialist',
    primarySource: 'Leaves and foliage',
    processingMethod: 'Specialized leaf digestion',
    efficiency: 'moderate',
    byproducts: ['Cellulose waste', 'Fertilizer'],
    flavorText: 'Eat leaves. Only leaves. Specialized gut. Slow digestion. Green everything.',
    relatedItems: ['leaves', 'fiber'], // Common
    ecologicalWeight: 0.6, // Moderate - forest biomes
  },
};
