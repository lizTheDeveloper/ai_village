/**
 * Alien Creature Generation Components
 *
 * Extensive libraries of creature traits, body plans, and behaviors for generating
 * infinite varieties of alien fauna. Mix and match components to create unique species.
 *
 * Philosophy: Earth's body plans are suggestions. Alien evolution suggests differently.
 */

// ============================================================================
// BODY PLAN LIBRARY
// ============================================================================

export interface BodyPlan {
  name: string;
  symmetry: 'bilateral' | 'radial' | 'spiral' | 'asymmetric' | 'fractal' | 'non_euclidean';
  limbCount: string;
  advantages: string[];
  disadvantages: string[];
  flavorText: string;
}

export const BODY_PLANS: Record<string, BodyPlan> = {
  'standard_bilateral': {
    name: 'Bilateral Symmetry',
    symmetry: 'bilateral',
    limbCount: '4-6 typically',
    advantages: ['Efficient forward movement', 'Streamlined', 'Directional sensing', 'Proven design'],
    disadvantages: ['Single front vulnerability', 'Predictable', 'Boring', 'Earth did it first'],
    flavorText: 'Left side mirrors right. Works on Earth. Works here. Evolution lazy. Or efficient. Both.',
  },
  'radial_predator': {
    name: 'Radial Symmetry',
    symmetry: 'radial',
    limbCount: '5-12 radiating from center',
    advantages: ['No vulnerable back', '360-degree sensing', 'Rotation irrelevant'],
    disadvantages: ['Forward concept unclear', 'Confusing to chase', 'Difficult clothing'],
    flavorText: 'No front. No back. All sides equal. Predators confused. Prey confused. Creature unconcerned.',
  },
  'modular_segmented': {
    name: 'Segmented Modular',
    symmetry: 'bilateral',
    limbCount: 'Variable, adds segments as grows',
    advantages: ['Redundant organs', 'Regeneration easy', 'Size scalable'],
    disadvantages: ['Where does one end?', 'Coordination complex', 'Identity crisis'],
    flavorText: 'Segments multiply. Each segment similar. Independent yet connected. Collective individual.',
  },
  'tentacular_mass': {
    name: 'Tentacled Central Mass',
    symmetry: 'radial',
    limbCount: '6-40 flexible appendages',
    advantages: ['Dexterous manipulation', 'Multi-tasking champion', 'Grasping everything'],
    disadvantages: ['Speed limited', 'Knot risk', 'Creepy appearance'],
    flavorText: 'Center blob. Tentacles everywhere. Nightmare fuel. Highly functional. Unsettling.',
  },
  'crystalline_geometric': {
    name: 'Geometric Crystal Structure',
    symmetry: 'radial',
    limbCount: 'Edges and vertices serve as limbs',
    advantages: ['Structural strength', 'Mathematical perfection', 'Novel'],
    disadvantages: ['Rigid movement', 'Sharp edges', 'Fragile vertices'],
    flavorText: 'Living geometry. Walks on vertices. Terrible at hugs. Excellent at mathematics.',
  },
  'colonial_swarm': {
    name: 'Colonial Swarm',
    symmetry: 'asymmetric',
    limbCount: 'Thousands of tiny units',
    advantages: ['Distributed intelligence', 'Hard to kill completely', 'Shape-shifting'],
    disadvantages: ['Individual vulnerability', 'Coordination required', 'Existential confusion'],
    flavorText: 'One creature or thousands? Yes. No. Both. Depends who counts. How count.',
  },
  'ethereal_phase': {
    name: 'Phase-Shifted Form',
    symmetry: 'non_euclidean',
    limbCount: 'Unclear, partially visible',
    advantages: ['Avoid physical damage', 'Wall passage', 'Terrifying'],
    disadvantages: ['Hard to eat', 'Interaction difficult', 'Physics violations'],
    flavorText: 'Not quite here. Not quite there. Occupies space. Sort of. Physics weeps.',
  },
  'serpentine_undulator': {
    name: 'Limbless Serpentine',
    symmetry: 'bilateral',
    limbCount: 'Zero limbs, pure sinuous body',
    advantages: ['Burrow easily', 'Swim efficiently', 'Squeeze through gaps'],
    disadvantages: ['Manipulation limited', 'No hands', 'Everything is full-body'],
    flavorText: 'No legs. No arms. No problem. Movement via undulation. Works surprisingly well.',
  },
};

// ============================================================================
// LOCOMOTION METHOD LIBRARY
// ============================================================================

export interface LocomotionMethod {
  name: string;
  speed: 'sluggish' | 'moderate' | 'fast' | 'very_fast' | 'relativistic';
  terrain: string[];
  energyCost: 'low' | 'moderate' | 'high' | 'extreme';
  uniqueFeatures: string[];
  flavorText: string;
}

export const LOCOMOTION_METHODS: Record<string, LocomotionMethod> = {
  'quadrupedal_running': {
    name: 'Four-Legged Running',
    speed: 'fast',
    terrain: ['Ground', 'Hills', 'Plains'],
    energyCost: 'moderate',
    uniqueFeatures: ['Stable platform', 'Endurance running', 'Predictable'],
    flavorText: 'Four legs. Classic. Efficient. Earth mammals approve. Still works.',
  },
  'hexapod_scuttling': {
    name: 'Six-Legged Scuttle',
    speed: 'moderate',
    terrain: ['Any solid surface', 'Walls', 'Ceilings'],
    energyCost: 'moderate',
    uniqueFeatures: ['Always stable', 'Wall climbing', 'Creepy movement'],
    flavorText: 'Six legs. Never falls. Climbs walls. Crosses ceilings. Gravity suggestion.',
  },
  'ballistic_hopping': {
    name: 'Explosive Leaping',
    speed: 'very_fast',
    terrain: ['Open areas', 'Rocky terrain'],
    energyCost: 'high',
    uniqueFeatures: ['Tremendous jumps', 'Shock absorption needed', 'Landing accuracy questionable'],
    flavorText: 'Jumps far. Jumps high. Landing improvised. Momentum conservation painful.',
  },
  'rolling_sphere': {
    name: 'Spherical Rolling',
    speed: 'fast',
    terrain: ['Flat ground', 'Slopes'],
    energyCost: 'low',
    uniqueFeatures: ['Energy efficient', 'Directional control hard', 'Stopping harder'],
    flavorText: 'Curls into ball. Rolls. Fast. Steering questionable. Braking theoretical.',
  },
  'jet_propulsion': {
    name: 'Bio-Jet Propulsion',
    speed: 'very_fast',
    terrain: ['Water', 'Air (less efficient)'],
    energyCost: 'high',
    uniqueFeatures: ['Rapid acceleration', 'Expels water/air violently', 'Surprising speed'],
    flavorText: 'Sucks fluid. Expels forcefully. Propulsion achieved. Physics standard. Execution novel.',
  },
  'magnetic_levitation': {
    name: 'Biomagnetic Float',
    speed: 'moderate',
    terrain: ['Metallic surfaces', 'Magnetic fields'],
    energyCost: 'extreme',
    uniqueFeatures: ['Frictionless movement', 'Silent', 'Requires metal environment'],
    flavorText: 'Levitates magnetically. Hovers above metal. Energy expensive. Worth it. Looks cool.',
  },
  'dimensional_skip': {
    name: 'Short-Range Teleport',
    speed: 'relativistic',
    terrain: ['Anywhere within range'],
    energyCost: 'extreme',
    uniqueFeatures: ['Instantaneous', 'No travel path', 'Disorienting'],
    flavorText: 'Here. Then there. No between. Violates continuity. Evolution doesn\'t care.',
  },
  'tentacle_walking': {
    name: 'Tentacular Locomotion',
    speed: 'moderate',
    terrain: ['Any surface', 'Complex terrain'],
    energyCost: 'moderate',
    uniqueFeatures: ['Adaptable to terrain', 'Grasping while moving', 'Unsettling to watch'],
    flavorText: 'Pulls self forward. Tentacles everywhere. Effective. Disturbing. Works anyway.',
  },
  'wing_flight': {
    name: 'Powered Flight',
    speed: 'very_fast',
    terrain: ['Air', 'Open sky'],
    energyCost: 'high',
    uniqueFeatures: ['Three-dimensional movement', 'Terrain irrelevant', 'Exhausting'],
    flavorText: 'Flaps wings. Achieves flight. Physics allows it. Barely. Energy expensive.',
  },
};

// ============================================================================
// SENSORY SYSTEM LIBRARY
// ============================================================================

export interface SensorySystem {
  name: string;
  range: 'touch' | 'short' | 'medium' | 'long' | 'planetary' | 'precognitive';
  acuity: 'poor' | 'moderate' | 'excellent' | 'perfect' | 'too_much_information';
  specialCapabilities: string[];
  flavorText: string;
}

export const SENSORY_SYSTEMS: Record<string, SensorySystem> = {
  'visual_standard': {
    name: 'Standard Vision',
    range: 'long',
    acuity: 'moderate',
    specialCapabilities: ['Color perception', 'Motion detection', 'Depth perception'],
    flavorText: 'Sees things. Light-based. Works in day. Fails in dark. Standard.',
  },
  'infrared_sight': {
    name: 'Thermal Vision',
    range: 'medium',
    acuity: 'excellent',
    specialCapabilities: ['Heat detection', 'Night vision', 'Living thing location'],
    flavorText: 'Sees heat. Sees life. Sees in darkness. Warm things glow. Hiding difficult.',
  },
  'echolocation_advanced': {
    name: 'Sonar Mapping',
    range: 'medium',
    acuity: 'excellent',
    specialCapabilities: ['Darkness immunity', '3D spatial mapping', 'Material detection'],
    flavorText: 'Screams. Listens. Builds mental map. Darkness irrelevant. Silence deadly.',
  },
  'electromagnetic_sense': {
    name: 'EM Field Detection',
    range: 'long',
    acuity: 'moderate',
    specialCapabilities: ['Electronic detection', 'Nervous system sensing', 'Navigation'],
    flavorText: 'Feels electricity. Senses fields. Detects life. Compasses confuse it.',
  },
  'pheromone_tracking': {
    name: 'Chemical Trail Following',
    range: 'long',
    acuity: 'excellent',
    specialCapabilities: ['Individual tracking', 'Emotion detection', 'Days-old trails'],
    flavorText: 'Smells everything. Tracks anything. Days later. Weeks later. Showering pointless.',
  },
  'quantum_probability': {
    name: 'Probability Sensing',
    range: 'precognitive',
    acuity: 'too_much_information',
    specialCapabilities: ['Future glimpses', 'Danger prediction', 'Causality confusion'],
    flavorText: 'Senses probable futures. Sees outcomes. Makes decisions. Often correct. Sometimes insane.',
  },
  'vibration_detection': {
    name: 'Seismic Sensing',
    range: 'long',
    acuity: 'excellent',
    specialCapabilities: ['Underground detection', 'Approaching predator warning', 'Footstep analysis'],
    flavorText: 'Feels ground vibrations. Knows what walks. Where. How heavy. Sneaking impossible.',
  },
  'telepathic_awareness': {
    name: 'Thought Sensing',
    range: 'medium',
    acuity: 'perfect',
    specialCapabilities: ['Intent detection', 'Emotional reading', 'Privacy violation'],
    flavorText: 'Reads thoughts. Knows intentions. Privacy nonexistent. Lying impossible. Rude.',
  },
};

// ============================================================================
// DIET & FEEDING LIBRARY
// ============================================================================

export interface DietPattern {
  name: string;
  nutritionSource: string;
  huntingMethod: string;
  digestiveSpecialization: string[];
  flavorText: string;
}

export const DIET_PATTERNS: Record<string, DietPattern> = {
  'herbivore_grazer': {
    name: 'Plant Grazer',
    nutritionSource: 'Plant matter, continuous consumption',
    huntingMethod: 'Doesn\'t hunt, finds plants',
    digestiveSpecialization: ['Multiple stomachs', 'Bacterial fermentation', 'Efficient cellulose breakdown'],
    flavorText: 'Eats plants. All day. Constantly. Digestion complex. Farting inevitable.',
  },
  'carnivore_ambush': {
    name: 'Ambush Predator',
    nutritionSource: 'Meat, infrequent large meals',
    huntingMethod: 'Patient waiting, explosive attack',
    digestiveSpecialization: ['Strong stomach acid', 'Bone dissolution', 'Gorge feeding'],
    flavorText: 'Waits. Strikes. Eats. Sleeps. Repeat weekly. Patience is hunting.',
  },
  'filter_feeder': {
    name: 'Passive Filter Feeding',
    nutritionSource: 'Microscopic organisms, constant filtering',
    huntingMethod: 'Sits still, water flows through',
    digestiveSpecialization: ['Enormous filtering area', 'Efficient extraction', 'Continuous processing'],
    flavorText: 'Opens mouth. Water flows. Food extracted. Effort minimal. Success constant.',
  },
  'energy_absorber': {
    name: 'Direct Energy Consumption',
    nutritionSource: 'Electromagnetic radiation, heat, electricity',
    huntingMethod: 'Basks, absorbs, converts',
    digestiveSpecialization: ['Photovoltaic tissues', 'Thermal conversion', 'No digestive tract'],
    flavorText: 'Eats energy. Directly. No digestion. No waste. Perfect efficiency. Violates thermodynamics. Slightly.',
  },
  'parasitic_drainer': {
    name: 'Life Force Parasitism',
    nutritionSource: 'Life energy from living hosts',
    huntingMethod: 'Attaches, drains slowly',
    digestiveSpecialization: ['Direct energy transfer', 'Long-term host survival', 'Symbiotic disguise'],
    flavorText: 'Attaches. Drains. Host weakens. Parasite thrives. Relationship one-sided. Host unenthused.',
  },
  'omnivore_opportunist': {
    name: 'Opportunistic Omnivore',
    nutritionSource: 'Anything edible, flexibility key',
    huntingMethod: 'Scavenges, hunts, gathers as opportunity allows',
    digestiveSpecialization: ['Versatile enzymes', 'Adaptable gut flora', 'Poison resistance'],
    flavorText: 'Eats everything. Plants. Meat. Fungi. Minerals. Dietary flexibility. Stomach titanium.',
  },
  'concept_consumer': {
    name: 'Abstract Concept Feeding',
    nutritionSource: 'Ideas, emotions, memories from sapient beings',
    huntingMethod: 'Proximity to intelligent life, passive absorption',
    digestiveSpecialization: ['Conceptual metabolism', 'Sapience requirement', 'Physics violation'],
    flavorText: 'Feeds on thoughts. Sustains on emotions. Hungers for concepts. Biology impossible. Exists anyway.',
  },
  'mineral_crusher': {
    name: 'Lithovore',
    nutritionSource: 'Rocks, minerals, metals',
    huntingMethod: 'Grazes on ore deposits',
    digestiveSpecialization: ['Acid powerful enough to dissolve stone', 'Mineral extraction', 'Metal accumulation'],
    flavorText: 'Eats rocks. Crunch crunch. Digests stone. Excretes sand. Teeth legendary. Or absent.',
  },
};

// ============================================================================
// SOCIAL STRUCTURE LIBRARY
// ============================================================================

export interface SocialStructure {
  name: string;
  groupSize: string;
  hierarchy: 'none' | 'loose' | 'strict' | 'complex' | 'democratic' | 'hive_mind';
  communication: string[];
  flavorText: string;
}

export const SOCIAL_STRUCTURES: Record<string, SocialStructure> = {
  'solitary_territorial': {
    name: 'Solitary and Territorial',
    groupSize: 'One per territory',
    hierarchy: 'none',
    communication: ['Scent marking', 'Threat displays', 'Violence'],
    flavorText: 'Alone always. Prefers it. Territory defended. Visitors unwelcome. Loneliness accepted.',
  },
  'pair_bonded': {
    name: 'Monogamous Pairs',
    groupSize: '2 adults plus offspring',
    hierarchy: 'loose',
    communication: ['Partner-specific calls', 'Grooming', 'Shared tasks'],
    flavorText: 'Mates for life. Pair hunts together. Raises young together. Dies alone if partner lost.',
  },
  'pack_hierarchy': {
    name: 'Pack with Alpha Structure',
    groupSize: '5-20 individuals',
    hierarchy: 'strict',
    communication: ['Body language', 'Vocalizations', 'Dominance displays'],
    flavorText: 'Alpha leads. Others follow. Hierarchy clear. Challenges rare. Cooperation essential.',
  },
  'herd_safety': {
    name: 'Large Herd',
    groupSize: '20-1000+ individuals',
    hierarchy: 'loose',
    communication: ['Alarm calls', 'Movement synchronization', 'Safety in numbers'],
    flavorText: 'Many together. Predators confused. Safety through quantity. Individual unimportant. Herd survives.',
  },
  'eusocial_colony': {
    name: 'Eusocial Colony',
    groupSize: 'Thousands to millions',
    hierarchy: 'complex',
    communication: ['Pheromones', 'Dance language', 'Chemical signals'],
    flavorText: 'Colony as organism. Individuals as cells. Queen breeds. Workers work. Dies for whole.',
  },
  'collective_consciousness': {
    name: 'Hive Mind',
    groupSize: 'Variable, all connected',
    hierarchy: 'hive_mind',
    communication: ['Direct thought sharing', 'Instantaneous coordination', 'Individual irrelevance'],
    flavorText: 'Not individuals. One mind. Many bodies. Thinks collectively. Acts as one. Terrifying.',
  },
  'temporary_swarms': {
    name: 'Seasonal Aggregations',
    groupSize: 'Massive during breeding, solitary otherwise',
    hierarchy: 'none',
    communication: ['Pheromone signals', 'Acoustic beacons', 'Temporary cooperation'],
    flavorText: 'Usually alone. Breeding season congregates. Massive gatherings. Then disperses. Social when necessary.',
  },
  'symbiotic_partnership': {
    name: 'Multi-Species Symbiosis',
    groupSize: 'Mixed species groups',
    hierarchy: 'democratic',
    communication: ['Cross-species signals', 'Mutual benefit display', 'Learned cooperation'],
    flavorText: 'Different species. Same pod. Mutual benefit. Cooperation across biology. Evolution experiments.',
  },
};

// ============================================================================
// DEFENSIVE ADAPTATION LIBRARY
// ============================================================================

export interface DefensiveAdaptation {
  name: string;
  type: 'passive' | 'active' | 'chemical' | 'behavioral' | 'reality_bending';
  effectiveness: 'poor' | 'moderate' | 'good' | 'excellent' | 'overkill';
  drawbacks: string[];
  flavorText: string;
}

export const DEFENSIVE_ADAPTATIONS: Record<string, DefensiveAdaptation> = {
  'armored_plating': {
    name: 'Heavy Armor Plates',
    type: 'passive',
    effectiveness: 'good',
    drawbacks: ['Slow movement', 'Heat retention', 'Energy expensive'],
    flavorText: 'Thick armor. Predator teeth break. Slow running. Doesn\'t need to run.',
  },
  'poison_secretion': {
    name: 'Toxic Skin Secretion',
    type: 'chemical',
    effectiveness: 'excellent',
    drawbacks: ['Handling danger', 'Accidental self-poisoning', 'Ecosystem impact'],
    flavorText: 'Skin toxic. Touch kills. Predators learn. Once. Dead predators teach others.',
  },
  'camouflage_active': {
    name: 'Active Chromatophores',
    type: 'active',
    effectiveness: 'excellent',
    drawbacks: ['Energy intensive', 'Movement gives away', 'Confusion in mirrors'],
    flavorText: 'Changes color. Instantly. Matches anything. Perfect camouflage. Until moves.',
  },
  'regeneration_rapid': {
    name: 'Rapid Tissue Regeneration',
    type: 'passive',
    effectiveness: 'good',
    drawbacks: ['Energy demanding', 'Cancer risk', 'Scars everywhere'],
    flavorText: 'Lost limb? Grows back. Days not months. Injury temporary. Survival priority.',
  },
  'swarm_dispersal': {
    name: 'Colony Scatter Response',
    type: 'behavioral',
    effectiveness: 'good',
    drawbacks: ['Individual vulnerability', 'Reformation time', 'Coordination loss'],
    flavorText: 'Attacked? Explodes into individuals. Scatters. Regroups later. Predator confused.',
  },
  'quantum_dodge': {
    name: 'Probability Shifting',
    type: 'reality_bending',
    effectiveness: 'overkill',
    drawbacks: ['Unpredictable location', 'Causality violations', 'Physics anger'],
    flavorText: 'Attack incoming. Probability shifts. Creature elsewhere. Attack misses. Physics protests.',
  },
  'size_inflation': {
    name: 'Defensive Size Increase',
    type: 'active',
    effectiveness: 'moderate',
    drawbacks: ['Temporary only', 'Intimidation over substance', 'Energy cost'],
    flavorText: 'Threatened? Inflates. Looks bigger. Actually vulnerable. Bluff works. Usually.',
  },
  'sonic_scream': {
    name: 'Weaponized Sound',
    type: 'active',
    effectiveness: 'excellent',
    drawbacks: ['Self-deafening risk', 'Ally damage', 'Noise complaints'],
    flavorText: 'Screams. Ear-splitting. Predator deaf. Temporarily. Permanently if repeated. Effective.',
  },
};

// ============================================================================
// REPRODUCTION STRATEGY LIBRARY
// ============================================================================

export interface ReproductionStrategy {
  name: string;
  method: 'sexual' | 'asexual' | 'budding' | 'fission' | 'spores' | 'impossible';
  offspringCount: 'single' | 'few' | 'many' | 'thousands' | 'unlimited';
  parentalCare: 'none' | 'minimal' | 'moderate' | 'extensive' | 'eternal';
  flavorText: string;
}

export const REPRODUCTION_STRATEGIES: Record<string, ReproductionStrategy> = {
  'live_birth_mammals': {
    name: 'Live Birth',
    method: 'sexual',
    offspringCount: 'few',
    parentalCare: 'extensive',
    flavorText: 'Gestation internal. Birth messy. Offspring helpless. Care intensive. Survival higher.',
  },
  'egg_laying_abundant': {
    name: 'Prolific Egg Laying',
    method: 'sexual',
    offspringCount: 'thousands',
    parentalCare: 'none',
    flavorText: 'Lays thousands. Most die. Some survive. Quantity strategy. Parenting optional.',
  },
  'asexual_cloning': {
    name: 'Self-Cloning',
    method: 'asexual',
    offspringCount: 'many',
    parentalCare: 'minimal',
    flavorText: 'Clones self. Genetic identical. No mate needed. Diversity sacrificed. Speed prioritized.',
  },
  'budding_continual': {
    name: 'Continuous Budding',
    method: 'budding',
    offspringCount: 'many',
    parentalCare: 'minimal',
    flavorText: 'Grows offspring externally. Buds detach. Become independent. Continuous production.',
  },
  'spore_broadcast': {
    name: 'Spore Cloud Release',
    method: 'spores',
    offspringCount: 'unlimited',
    parentalCare: 'none',
    flavorText: 'Releases billions. Wind carries. Most die. Few germinate. Numbers overwhelming.',
  },
  'metamorphic_stages': {
    name: 'Complex Metamorphosis',
    method: 'sexual',
    offspringCount: 'many',
    parentalCare: 'none',
    flavorText: 'Egg to larva. Larva to pupa. Pupa to adult. Multiple forms. One species. Confusing.',
  },
  'time_displaced': {
    name: 'Temporal Offspring',
    method: 'impossible',
    offspringCount: 'single',
    parentalCare: 'eternal',
    flavorText: 'Offspring born backwards in time. Exists before parent. Causality nightmares. Works somehow.',
  },
  'hive_queen': {
    name: 'Eusocial Queen Breeding',
    method: 'sexual',
    offspringCount: 'thousands',
    parentalCare: 'extensive',
    flavorText: 'Queen births all. Workers care for all. Reproduction specialized. Efficiency maximized.',
  },
};

// ============================================================================
// INTELLIGENCE LEVEL LIBRARY
// ============================================================================

export interface IntelligenceLevel {
  name: string;
  problemSolving: 'none' | 'basic' | 'moderate' | 'advanced' | 'superior' | 'incomprehensible';
  toolUse: boolean;
  communication: 'none' | 'simple' | 'complex' | 'language' | 'telepathic';
  selfAwareness: boolean;
  flavorText: string;
}

export const INTELLIGENCE_LEVELS: Record<string, IntelligenceLevel> = {
  'instinctual_only': {
    name: 'Pure Instinct',
    problemSolving: 'none',
    toolUse: false,
    communication: 'none',
    selfAwareness: false,
    flavorText: 'Acts on instinct. No thinking. Hardwired behavior. Effective. Inflexible.',
  },
  'basic_learning': {
    name: 'Simple Learning',
    problemSolving: 'basic',
    toolUse: false,
    communication: 'simple',
    selfAwareness: false,
    flavorText: 'Learns from experience. Remembers danger. Adapts behavior. Not smart. Smarter than none.',
  },
  'problem_solver': {
    name: 'Problem-Solving Intelligence',
    problemSolving: 'moderate',
    toolUse: true,
    communication: 'simple',
    selfAwareness: false,
    flavorText: 'Solves problems. Uses tools. Figures out. Not sapient. Close enough to worry.',
  },
  'proto_sapient': {
    name: 'Near-Sapience',
    problemSolving: 'advanced',
    toolUse: true,
    communication: 'complex',
    selfAwareness: true,
    flavorText: 'Almost sapient. Culture forming. Tools creating. Language emerging. Evolution in progress.',
  },
  'fully_sapient': {
    name: 'True Sapience',
    problemSolving: 'advanced',
    toolUse: true,
    communication: 'language',
    selfAwareness: true,
    flavorText: 'Thinks. Knows it thinks. Creates. Questions. Builds civilizations. Makes mistakes.',
  },
  'hive_intelligence': {
    name: 'Distributed Consciousness',
    problemSolving: 'superior',
    toolUse: true,
    communication: 'telepathic',
    selfAwareness: true,
    flavorText: 'Individual dumb. Collective genius. Hive thinks. Each contributes. Whole greater.',
  },
  'incomprehensible_mind': {
    name: 'Alien Psychology',
    problemSolving: 'incomprehensible',
    toolUse: true,
    communication: 'telepathic',
    selfAwareness: true,
    flavorText: 'Thinks differently. So differently. Motivations unknown. Actions inexplicable. Intelligence certain. Understanding impossible.',
  },
};

// ============================================================================
// COMPLETE ALIEN CREATURE EXAMPLES
// ============================================================================

export interface AlienCreatureSpecies {
  id: string;
  name: string;
  scientificName: string;
  description: string;

  bodyPlan: string;
  locomotion: string;
  sensorySystem: string;
  diet: string;
  socialStructure: string;
  defense: string;
  reproduction: string;
  intelligence: string;

  discovered: string;
  nativeWorld: string;
  domesticationPotential: 'none' | 'poor' | 'moderate' | 'good' | 'excellent';
  dangerLevel: 'harmless' | 'minor' | 'moderate' | 'severe' | 'extinction_level';
}

export const EXAMPLE_ALIEN_CREATURES: AlienCreatureSpecies[] = [
  {
    id: 'crystal_spider_01',
    name: 'Singing Hexapod',
    scientificName: 'Crystallus arachnus',
    description: `Six-legged crystalline creatures that communicate through resonant frequencies. Their bodies are semi-transparent, showing internal geometric structures that refract light into rainbow patterns. When threatened, they emit high-frequency sounds that shatter glass.

Native to silicon-rich desert planets, these creatures evolved from mineral-based life rather than carbon. Their "biology" is technically geology. Minerology. Something. Debate ongoing. They definitely move, eat, reproduce. Just differently.

Domestication attempted. Failed spectacularly. Creatures kept singing their homes apart. Colonists learned to appreciate from distance. Safe distance. Soundproof distance.`,

    bodyPlan: 'crystalline_geometric',
    locomotion: 'hexapod_scuttling',
    sensorySystem: 'vibration_detection',
    diet: 'mineral_crusher',
    socialStructure: 'solitary_territorial',
    defense: 'sonic_scream',
    reproduction: 'budding_continual',
    intelligence: 'basic_learning',

    discovered: 'Survey Team Gamma, Still Recovering',
    nativeWorld: 'Kepler-62f',
    domesticationPotential: 'poor',
    dangerLevel: 'moderate',
  },

  {
    id: 'void_swimmer_01',
    name: 'Deep Void Leviathan',
    scientificName: 'Vacuus giganteus',
    description: `Enormous creatures that swim through space itself. Not metaphorically. Literally. They exist partially outside normal dimensions, propelling themselves through vacuum via mechanisms physics doesn't recognize.

Each individual is kilometers long, though measurement proves difficult when the creature occupies multiple dimensional states simultaneously. They feed on cosmic radiation, electromagnetic fields, and possibly the concept of distance. Last one unconfirmed.

Ships avoid known migration routes. Encounters are... disconcerting. Scanners report the creature approaching. Also departing. Also not moving. Simultaneously. Crew reports existential confusion. Ship AI requires therapy afterward.

Reproduction believed to involve quantum entanglement. Or time travel. Or both. Offspring appear before parents. Sometimes. Causality is suggestion to them.`,

    bodyPlan: 'ethereal_phase',
    locomotion: 'dimensional_skip',
    sensorySystem: 'quantum_probability',
    diet: 'energy_absorber',
    socialStructure: 'temporary_swarms',
    defense: 'quantum_dodge',
    reproduction: 'time_displaced',
    intelligence: 'incomprehensible_mind',

    discovered: 'Never. Or Always. Time is Complicated',
    nativeWorld: 'Interstellar Space',
    domesticationPotential: 'none',
    dangerLevel: 'extinction_level',
  },

  {
    id: 'hive_collective_01',
    name: 'Thought Swarm',
    scientificName: 'Collectivus mentis',
    description: `Individual units are unintelligent. Barely more than mobile cells. But together? Together they think. Thousands of tiny bodies forming one distributed consciousness that solves problems, uses tools, and contemplates existence.

Each swarm develops unique personality. Some friendly. Some territorial. Some philosophical. Personalities emerge from collective, not individuals. Killing one unit barely noticed. Scatter the swarm? Personality fragments. Reforms with gaps in memory.

Communication with humans established. Difficult. They think in parallel processes. We think in serial. Conversations surreal. They answer questions before asked. Sometimes. Other times respond to questions not yet thought of. Temporal mechanics involved. Probably.

First contact achieved accidentally. Swarm infiltrated research station seeking warm environment. Coexisted peacefully until it started rearranging equipment "more efficiently." Researchers learned to negotiate. Swarm learned concept of "personal space." Compromise reached. Mostly.`,

    bodyPlan: 'colonial_swarm',
    locomotion: 'wing_flight',
    sensorySystem: 'telepathic_awareness',
    diet: 'concept_consumer',
    socialStructure: 'collective_consciousness',
    defense: 'swarm_dispersal',
    reproduction: 'spore_broadcast',
    intelligence: 'hive_intelligence',

    discovered: 'Research Station Epsilon, Year 89',
    nativeWorld: 'Proxima Centauri b',
    domesticationPotential: 'moderate',
    dangerLevel: 'minor',
  },
];
