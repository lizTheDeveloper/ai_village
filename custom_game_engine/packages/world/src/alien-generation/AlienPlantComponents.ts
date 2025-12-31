/**
 * Alien Plant Generation Components
 *
 * Extensive libraries of plant traits, adaptations, and properties for generating
 * infinite varieties of alien flora. Mix and match components to create unique species.
 *
 * Philosophy: Evolution doesn't care about Earth's rules. These plants prove it.
 */

// ============================================================================
// GROWTH PATTERN LIBRARY
// ============================================================================

export interface GrowthPattern {
  name: string;
  structure: string;
  advantages: string[];
  disadvantages: string[];
  flavorText: string;
}

export const GROWTH_PATTERNS: Record<string, GrowthPattern> = {
  'vertical_tower': {
    name: 'Vertical Tower',
    structure: 'Single tall stem reaching skyward, minimal branching',
    advantages: ['Maximum sunlight capture', 'Minimal ground footprint', 'Impressive to look at'],
    disadvantages: ['Wind vulnerability', 'Single point of failure', 'Topples dramatically when it fails'],
    flavorText: 'Reaches for the sky. Falls like a tree. Because it is a tree. Tall tree.',
  },
  'radial_sprawl': {
    name: 'Radial Sprawl',
    structure: 'Spreads horizontally from central point, claiming territory',
    advantages: ['Maximum territory control', 'Redundant growth points', 'Difficult to eradicate completely'],
    disadvantages: ['Slow vertical growth', 'Vulnerable to trampling', 'Neighbors hate it'],
    flavorText: 'The botanical equivalent of urban sprawl. Less organized. More roots.',
  },
  'vine_climber': {
    name: 'Parasitic Climber',
    structure: 'Uses other plants as scaffolding, minimal self-support',
    advantages: ['Energy-efficient', 'Access to canopy', 'Lets others do the hard work'],
    disadvantages: ['Needs host plant', 'Host might object', 'Freeloading accusations'],
    flavorText: 'Why grow strong when neighbors exist? Evolutionary genius or botanical laziness. Both.',
  },
  'mat_former': {
    name: 'Ground Mat',
    structure: 'Dense horizontal network, smothers competition',
    advantages: ['Excellent ground cover', 'Prevents erosion', 'Monopolizes nutrients'],
    disadvantages: ['Limited height', 'Vulnerable to herbivores', 'Basically plant carpet'],
    flavorText: 'Covers ground thoroughly. Discourages walking. Nature\'s welcome mat. Unwelcoming.',
  },
  'colonial_cluster': {
    name: 'Colonial Cluster',
    structure: 'Multiple connected individuals, shares resources underground',
    advantages: ['Resource sharing', 'Distributed risk', 'Strength in numbers'],
    disadvantages: ['One disease affects all', 'Hard to tell where one plant ends', 'Identity crisis'],
    flavorText: 'Individual plants or collective consciousness? Question remains philosophical. Also botanical.',
  },
  'spiral_helix': {
    name: 'Spiral Helix',
    structure: 'Grows in helical pattern, maximum surface area per height',
    advantages: ['Efficient light capture', 'Structural integrity', 'Mathematically beautiful'],
    disadvantages: ['Complex growth programming', 'Confusing to herbivores', 'Also confusing to botanists'],
    flavorText: 'Evolution discovered the golden ratio. Uses it aggressively. Beauty is survival.',
  },
  'fractal_branching': {
    name: 'Fractal Branching',
    structure: 'Self-similar branching at multiple scales, mathematically optimal',
    advantages: ['Maximum surface area', 'Redundant pathways', 'Makes mathematicians happy'],
    disadvantages: ['Computationally expensive', 'Resource-intensive', 'Showing off'],
    flavorText: 'Branches have branches. Those branches branch. Pattern continues. Math approves.',
  },
  'fungal_network': {
    name: 'Mycelial Network',
    structure: 'Underground threadwork, fruiting bodies emerge seasonally',
    advantages: ['Vast underground presence', 'Difficult to kill completely', 'Can be miles wide'],
    disadvantages: ['Mostly invisible', 'Vulnerable to soil conditions', 'Hard to impress dates'],
    flavorText: 'Largest organism type on Earth. By mass. By area. Not by visibility. Or respect.',
  },
  'crystalline_array': {
    name: 'Crystalline Array',
    structure: 'Geometric growth following crystal patterns, silicon-based',
    advantages: ['Structural perfection', 'Heat resistance', 'Mineral storage'],
    disadvantages: ['Slow growth', 'Brittle', 'Technically not organic'],
    flavorText: 'Plant or mineral? Debate ongoing. It grows. That\'s plant-like. Technically.',
  },
  'blob_expansion': {
    name: 'Amoeboid Blob',
    structure: 'Shapeless mass that flows and expands in all directions',
    advantages: ['Ultimate flexibility', 'No weak points', 'Fills any space'],
    disadvantages: ['No structure', 'Easily divided', 'Aesthetically concerning'],
    flavorText: 'Shape optional. Form negotiable. Boundaries suggested. Not plant. Not not plant.',
  },
  'ring_growth': {
    name: 'Concentric Rings',
    structure: 'Grows in expanding circles, new ring each season',
    advantages: ['Age visible', 'Stable expansion', 'History preserved'],
    disadvantages: ['Predictable', 'Space-inefficient', 'Announces age to all'],
    flavorText: 'Each ring tells story. Every year recorded. Tree remembers. Whether it wants to or not.',
  },
  'modular_pods': {
    name: 'Modular Pod System',
    structure: 'Independent growth pods, connect and disconnect as needed',
    advantages: ['Reconfigurable', 'Distributed intelligence', 'Redundancy extreme'],
    disadvantages: ['Coordination complex', 'Identity unclear', 'Which pod is main?'],
    flavorText: 'Pods think independently. Act collectively. Sometimes. When they agree. Rarely agree.',
  },
  'reverse_pyramid': {
    name: 'Inverted Pyramid',
    structure: 'Narrow base, wide canopy - defies conventional stability',
    advantages: ['Maximum canopy spread', 'Impressive', 'Architecturally bold'],
    disadvantages: ['Obviously unstable', 'Falls over eventually', 'Physics disapproves'],
    flavorText: 'Top-heavy by design. Falls dramatically. Evolutionary mistake or genius? Both.',
  },
  'tendril_web': {
    name: 'Tendril Web Network',
    structure: 'Countless thin tendrils create living net',
    advantages: ['Flexible', 'Repairs easily', 'Catches things'],
    disadvantages: ['Individually weak', 'Tangled constantly', 'Catches unwanted things too'],
    flavorText: 'Web of life. Literal web. Things stick. Including botanists. Awkward.',
  },
  'hollow_sphere': {
    name: 'Hollow Sphere',
    structure: 'Grows as empty ball, photosynthesizes on all surfaces',
    advantages: ['Interior space', 'Omnidirectional light capture', 'Unique'],
    disadvantages: ['Structurally questionable', 'Interior rots sometimes', 'Hard to explain'],
    flavorText: 'Ball of plant. Hollow center. Why hollow? Unknown. Nature mysterious. Unhelpful.',
  },
};

// ============================================================================
// ENERGY ACQUISITION LIBRARY
// ============================================================================

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
};

// ============================================================================
// REPRODUCTION METHOD LIBRARY
// ============================================================================

export interface ReproductionMethod {
  name: string;
  mechanism: string;
  dispersalRange: 'minimal' | 'local' | 'regional' | 'global' | 'absurd';
  energyCost: 'low' | 'moderate' | 'high' | 'extreme';
  successRate: 'abysmal' | 'poor' | 'moderate' | 'good' | 'excellent';
  flavorText: string;
}

export const REPRODUCTION_METHODS: Record<string, ReproductionMethod> = {
  'wind_dispersed_spores': {
    name: 'Wind-Dispersed Spores',
    mechanism: 'Releases billions of microscopic spores, hopes for best',
    dispersalRange: 'global',
    energyCost: 'low',
    successRate: 'abysmal',
    flavorText: 'Quantity over quality. Billions of children. None get calls. Or survive. Mostly.',
  },
  'explosive_seed_pods': {
    name: 'Ballistic Seed Dispersal',
    mechanism: 'Pods explode under pressure, launching seeds violently',
    dispersalRange: 'local',
    energyCost: 'moderate',
    successRate: 'moderate',
    flavorText: 'Reproduction via artillery. Effective. Loud. Startles herbivores. Mission accomplished.',
  },
  'animal_ingestion': {
    name: 'Endozoochory',
    mechanism: 'Animals eat fruit, transport seeds, deposit them... elsewhere',
    dispersalRange: 'regional',
    energyCost: 'high',
    successRate: 'good',
    flavorText: 'Make fruit delicious. Animals eat. Seeds survive digestion. Travel in style. Through intestines.',
  },
  'symbiotic_carriers': {
    name: 'Symbiotic Transportation',
    mechanism: 'Specific animal species obligated to transport seeds',
    dispersalRange: 'regional',
    energyCost: 'moderate',
    successRate: 'good',
    flavorText: 'Mutual arrangement. Plant feeds animal. Animal plants seeds. Contract binding. Evolutionary.',
  },
  'aquatic_drift': {
    name: 'Hydrochory',
    mechanism: 'Seeds float, drift on water currents, sink eventually',
    dispersalRange: 'regional',
    energyCost: 'low',
    successRate: 'moderate',
    flavorText: 'Message in bottle. Bottle is seed. Message is DNA. Ocean as delivery service.',
  },
  'vegetative_cloning': {
    name: 'Vegetative Propagation',
    mechanism: 'Grows new individuals from fragments, roots, runners',
    dispersalRange: 'minimal',
    energyCost: 'low',
    successRate: 'excellent',
    flavorText: 'Why sex? Asexual reproduction. Clone thyself. Genetic diversity overrated. Survival guaranteed.',
  },
  'airborne_seeds': {
    name: 'Helicopter Seeds',
    mechanism: 'Winged seeds spin, glide, maximize air time',
    dispersalRange: 'local',
    energyCost: 'moderate',
    successRate: 'moderate',
    flavorText: 'Engineering marvel. Autorotation. Controlled descent. Plants invented helicopters. First.',
  },
  'teleportation_spores': {
    name: 'Quantum Spore Dispersal',
    mechanism: 'Spores exist in superposition, collapse into reality elsewhere',
    dispersalRange: 'absurd',
    energyCost: 'extreme',
    successRate: 'poor',
    flavorText: 'Physics uncertain. Spores don\'t care. Appear anywhere. Anywhere includes impossible places. Evolution gone mad.',
  },
  'time_delayed_germination': {
    name: 'Temporal Seed Banking',
    mechanism: 'Seeds remain dormant for years/decades/centuries until perfect conditions',
    dispersalRange: 'minimal',
    energyCost: 'high',
    successRate: 'excellent',
    flavorText: 'Patience weapon. Outlast competitors. Outlive disasters. Germinate when ready. Time is relative.',
  },
};

// ============================================================================
// DEFENSE MECHANISM LIBRARY
// ============================================================================

export interface DefenseMechanism {
  name: string;
  type: 'passive' | 'active' | 'chemical' | 'symbiotic' | 'terrifying';
  effectiveness: 'poor' | 'moderate' | 'good' | 'excellent' | 'overkill';
  sideEffects: string[];
  flavorText: string;
}

export const DEFENSE_MECHANISMS: Record<string, DefenseMechanism> = {
  'thorns_basic': {
    name: 'Sharp Thorns',
    type: 'passive',
    effectiveness: 'moderate',
    sideEffects: ['Makes harvesting difficult', 'Hurts gardeners', 'Point made clear'],
    flavorText: 'Simple. Effective. Pointy. Don\'t touch. Message received.',
  },
  'toxic_sap': {
    name: 'Caustic Toxins',
    type: 'chemical',
    effectiveness: 'good',
    sideEffects: ['Poison on contact', 'Soil contamination', 'Ecosystem unfriendliness'],
    flavorText: 'Chemical warfare. No Geneva Convention. Plants don\'t sign treaties. Plants win.',
  },
  'neurotoxic_coating': {
    name: 'Paralytic Neurotoxins',
    type: 'chemical',
    effectiveness: 'excellent',
    sideEffects: ['Paralyzes herbivores', 'Accumulates in food chain', 'Apex predators confused'],
    flavorText: 'Can\'t eat what can\'t move. Herbivore stops mid-bite. Permanent indigestion. Effective deterrent.',
  },
  'ant_symbiosis': {
    name: 'Ant Colony Alliance',
    type: 'symbiotic',
    effectiveness: 'excellent',
    sideEffects: ['Aggressive ant defenders', 'Housing requirements', 'Ant politics'],
    flavorText: 'Plant provides housing. Ants provide security. Living security system. Biting security system.',
  },
  'mirror_camouflage': {
    name: 'Reflective Camouflage',
    type: 'passive',
    effectiveness: 'moderate',
    sideEffects: ['Blends with surroundings', 'Hard to find', 'Also hard to photosynthesize'],
    flavorText: 'If herbivores can\'t find it, can\'t eat it. Also can\'t pollinate it. Trade-offs exist.',
  },
  'alarm_pheromones': {
    name: 'Distress Signal Emission',
    type: 'chemical',
    effectiveness: 'good',
    sideEffects: ['Attracts predators of herbivores', 'Chemical SOS', 'Neighbors eavesdrop'],
    flavorText: 'Being eaten? Call for help. Help arrives. Eats the eater. Circle of life continues.',
  },
  'explosive_defense': {
    name: 'Pressurized Pod Burst',
    type: 'active',
    effectiveness: 'excellent',
    sideEffects: ['Startles attackers', 'Spreads irritants', 'Dramatic exit'],
    flavorText: 'Touch plant. Plant explodes. Herbivore learns lesson. Dramatic. Effective. Messy.',
  },
  'electrical_discharge': {
    name: 'Bio-Electric Shock',
    type: 'active',
    effectiveness: 'overkill',
    sideEffects: ['Shocks attackers', 'Drains energy reserves', 'Violates expectations'],
    flavorText: 'Electric fence. Grown. Living. Shocking in multiple senses. Plants evolve creativity.',
  },
  'predatory_reversal': {
    name: 'Defensive Carnivory',
    type: 'terrifying',
    effectiveness: 'overkill',
    sideEffects: ['Eats attackers', 'Reverses food chain', 'Philosophical implications'],
    flavorText: 'You are what you eat. Herbivore learns this. Becomes plant food. Irony delicious.',
  },
  'psychoactive_emissions': {
    name: 'Hallucinogenic Compounds',
    type: 'chemical',
    effectiveness: 'good',
    sideEffects: ['Confuses herbivores', 'Creates addiction', 'Attracts seekers'],
    flavorText: 'Chemical manipulation. Herbivore experiences colors. Forgets eating. Wanders off. Problem solved.',
  },
};

// ============================================================================
// ENVIRONMENTAL ADAPTATION LIBRARY
// ============================================================================

export interface EnvironmentalAdaptation {
  name: string;
  environment: string;
  modifications: string[];
  extremeTolerance: string[];
  flavorText: string;
}

export const ENVIRONMENTAL_ADAPTATIONS: Record<string, EnvironmentalAdaptation> = {
  'desert_specialist': {
    name: 'Xerophyte Extreme',
    environment: 'Arid deserts, minimal water',
    modifications: ['Water storage tissues', 'Reduced leaf surface', 'Deep roots', 'Waxy coating'],
    extremeTolerance: ['Months without water', 'Temperature extremes', 'UV radiation'],
    flavorText: 'Water optional. Thrives on scarcity. Hoards moisture. Desert king. Cactus on steroids.',
  },
  'aquatic_complete': {
    name: 'Full Aquatic',
    environment: 'Completely submerged, permanent water',
    modifications: ['Flexible stems', 'Underwater pollination', 'Gas bladders', 'Filter roots'],
    extremeTolerance: ['Zero air exposure', 'Water pressure', 'Low light'],
    flavorText: 'Left land behind. No regrets. Fish curious. Breathes water. Sort of.',
  },
  'arctic_survivor': {
    name: 'Cryophyte',
    environment: 'Frozen tundra, permafrost',
    modifications: ['Antifreeze proteins', 'Low-profile growth', 'Rapid reproduction', 'Dark pigmentation'],
    extremeTolerance: ['Sub-zero temperatures', 'Ice crystal formation', 'Short growing seasons'],
    flavorText: 'Cold embraced. Ice tolerated. Grows in snow. Photosynthesis optional. Survival mandatory.',
  },
  'volcanic_tolerant': {
    name: 'Pyrophyte',
    environment: 'Volcanic slopes, lava fields',
    modifications: ['Heat-resistant tissues', 'Ash nutrient extraction', 'Rapid colonization', 'Fireproof seeds'],
    extremeTolerance: ['Extreme heat', 'Toxic gases', 'Molten rock proximity'],
    flavorText: 'Fire can\'t kill it. Lava fertilizes it. Thrives in hellscape. Metal. Literally.',
  },
  'pressure_adapted': {
    name: 'Barophyte',
    environment: 'Deep ocean trenches, extreme pressure',
    modifications: ['Pressure-resistant cells', 'No air spaces', 'Chemosynthetic', 'Bioluminescent'],
    extremeTolerance: ['Crushing pressure', 'Complete darkness', 'Extreme cold'],
    flavorText: 'Miles underwater. Pressure crushing. Darkness absolute. Grows anyway. Physics baffled.',
  },
  'aerial_floating': {
    name: 'Aerophyte',
    environment: 'Permanent flight, never touches ground',
    modifications: ['Gas-filled bladders', 'Lightweight structure', 'Aerial roots', 'Wind feeding'],
    extremeTolerance: ['No soil contact', 'Constant wind', 'Variable altitude'],
    flavorText: 'Roots in air. Nutrients from mist. Never lands. Airborne forever. Gravity optional.',
  },
  'radiation_resistant': {
    name: 'Radiotroph',
    environment: 'High radiation zones, near reactors',
    modifications: ['DNA repair mechanisms', 'Radiation-feeding', 'Melanin shielding', 'Mutation tolerance'],
    extremeTolerance: ['Lethal radiation', 'Genetic instability', 'Contaminated soil'],
    flavorText: 'Radiation kills most life. Feeds this. Thrives in Chernobyl. Makes biologists nervous.',
  },
  'vacuum_hardy': {
    name: 'Exophyte',
    environment: 'Space vacuum, no atmosphere',
    modifications: ['Sealed cell structures', 'Desiccation tolerance', 'Cosmic ray resistance', 'Metabolic suspension'],
    extremeTolerance: ['Vacuum', 'Extreme radiation', 'Temperature swings', 'No water'],
    flavorText: 'Survives space. No air needed. No water needed. No atmosphere needed. Life finds way. Stubborn way.',
  },
};

// ============================================================================
// UNUSUAL PROPERTIES LIBRARY
// ============================================================================

export interface UnusualProperty {
  name: string;
  description: string;
  scientificBasis: 'plausible' | 'speculative' | 'fictional' | 'impossible' | 'violation_of_physics';
  practicalUses: string[];
  impracticalSideEffects: string[];
  flavorText: string;
}

export const UNUSUAL_PROPERTIES: Record<string, UnusualProperty> = {
  'bioluminescence': {
    name: 'Bioluminescent Glow',
    description: 'Emits visible light through chemical reactions',
    scientificBasis: 'plausible',
    practicalUses: ['Night visibility', 'Pollinator attraction', 'Communication', 'Free lighting'],
    impracticalSideEffects: ['Predator attraction', 'Energy cost', 'Can\'t hide', 'Insomnia nearby'],
    flavorText: 'Glows in dark. Decorative. Useful. Impossible to sleep near. Trade-off accepted.',
  },
  'magnetic_field_generation': {
    name: 'Biomagnetic Field',
    description: 'Generates detectable magnetic field from metallic ions',
    scientificBasis: 'speculative',
    practicalUses: ['Navigation disruption', 'Metal accumulation', 'Compass confusion'],
    impracticalSideEffects: ['Attracts metal debris', 'Interferes with electronics', 'Weird sensations'],
    flavorText: 'Living magnet. Iron-rich tissues. Compasses hate it. Grows slowly. Powerfully magnetic.',
  },
  'sound_production': {
    name: 'Acoustic Emission',
    description: 'Produces audible sounds through specialized structures',
    scientificBasis: 'plausible',
    practicalUses: ['Wind detection', 'Insect deterrent', 'Musical qualities'],
    impracticalSideEffects: ['Constant noise', 'Attracts curious animals', 'Annoying'],
    flavorText: 'Plant sings. Wind plays it. Natural instrument. Concert endless. Neighbors complain.',
  },
  'color_changing_leaves': {
    name: 'Chromatophore Leaves',
    description: 'Changes color based on environmental conditions',
    scientificBasis: 'plausible',
    practicalUses: ['Temperature regulation', 'Camouflage', 'Warning displays'],
    impracticalSideEffects: ['Confuses herbivores', 'Confuses botanists', 'Identity crisis'],
    flavorText: 'Mood ring. Plant edition. Color indicates stress. Usually red. Often red. Always stressed.',
  },
  'memory_retention': {
    name: 'Environmental Memory',
    description: 'Retains and responds to past environmental stresses',
    scientificBasis: 'plausible',
    practicalUses: ['Improved stress response', 'Adaptive growth', 'Learning (sort of)'],
    impracticalSideEffects: ['Holds grudges', 'Overreacts to triggers', 'Plant PTSD'],
    flavorText: 'Remembers droughts. Remembers frost. Remembers trampling. Prepares accordingly. Never forgets.',
  },
  'reality_phasing': {
    name: 'Dimensional Shift',
    description: 'Partially exists in other dimensions, appears translucent',
    scientificBasis: 'impossible',
    practicalUses: ['Avoids physical damage', 'Nutrient access from elsewhere', 'Confuses physics'],
    impracticalSideEffects: ['Hard to water', 'May disappear', 'Violates conservation of matter'],
    flavorText: 'Not quite here. Not quite there. Exists anyway. Physics objects. Plant doesn\'t care.',
  },
  'time_dilation_field': {
    name: 'Temporal Anomaly Growth',
    description: 'Grows faster by experiencing accelerated local time',
    scientificBasis: 'violation_of_physics',
    practicalUses: ['Rapid growth', 'Quick fruit production', 'Time travel questions'],
    impracticalSideEffects: ['Ages surroundings', 'Causality concerns', 'Temporal mechanics headaches'],
    flavorText: 'Time flows differently here. Plant grows fast. Very fast. Physics unamused. Einstein confused.',
  },
  'symbiotic_consciousness': {
    name: 'Collective Intelligence',
    description: 'Network of plants shares distributed consciousness',
    scientificBasis: 'fictional',
    practicalUses: ['Resource sharing', 'Threat detection', 'Coordinated defense'],
    impracticalSideEffects: ['Philosophical questions', 'Sentience debates', 'Ethical harvesting concerns'],
    flavorText: 'Thinks. Collectively. Individual plants or one organism? Botanists argue. Plants don\'t care.',
  },
  'gravitational_anomaly': {
    name: 'Local Gravity Manipulation',
    description: 'Warps local spacetime slightly, affects nearby objects',
    scientificBasis: 'violation_of_physics',
    practicalUses: ['Seed dispersal enhancement', 'Herbivore discouragement', 'Physics violation'],
    impracticalSideEffects: ['Falling upward', 'Orbit irregularities', 'General relativity violations'],
    flavorText: 'Bends gravity. Slightly. Objects fall wrong direction. Einstein weeps. Plant thrives.',
  },
};

// ============================================================================
// APPEARANCE PATTERN LIBRARY
// ============================================================================

export interface AppearancePattern {
  name: string;
  colorSchemes: string[];
  textureOptions: string[];
  sizeRange: string;
  notableFeatures: string[];
  flavorText: string;
}

export const APPEARANCE_PATTERNS: Record<string, AppearancePattern> = {
  'crystalline_structure': {
    name: 'Crystalline Growth',
    colorSchemes: ['Translucent with internal refraction', 'Prismatic rainbow', 'Single pure color', 'Metallic sheen'],
    textureOptions: ['Faceted surfaces', 'Geometric patterns', 'Smooth crystal faces', 'Internal crystallization'],
    sizeRange: 'Tiny clusters to massive formations',
    notableFeatures: ['Refracts light', 'Geometric perfection', 'Mineral composition', 'Hard to touch'],
    flavorText: 'More mineral than plant. More plant than mineral. Classification uncertain. Beautiful regardless.',
  },
  'fungal_mesh': {
    name: 'Mycelial Network',
    colorSchemes: ['White threadwork', 'Bioluminescent veins', 'Dark decomposer', 'Colorful fruiting bodies'],
    textureOptions: ['Delicate filaments', 'Dense mat', 'Soft fuzz', 'Slimy coating'],
    sizeRange: 'Microscopic threads to acres-wide network',
    notableFeatures: ['Underground majority', 'Fruiting body eruptions', 'Network intelligence', 'Decay specialist'],
    flavorText: 'Largest organism type. Mostly hidden. Occasionally fruits. Always spreading. Silent conquest.',
  },
  'bioluminescent_display': {
    name: 'Living Light Show',
    colorSchemes: ['Soft blue-green glow', 'Pulsing patterns', 'Multi-color display', 'UV reactive'],
    textureOptions: ['Smooth luminous surface', 'Spotted light organs', 'Veined illumination', 'Translucent glow'],
    sizeRange: 'Dim individual to forest-scale illumination',
    notableFeatures: ['Glows perpetually', 'Pattern communication', 'Chemical light', 'Night garden'],
    flavorText: 'Natural nightlight. Perpetual rave. Energy expensive. Worth it. Beauty over efficiency.',
  },
  'metallic_foliage': {
    name: 'Metallized Leaves',
    colorSchemes: ['Silver sheen', 'Gold highlights', 'Copper patina', 'Bronze finish'],
    textureOptions: ['Polished metal', 'Brushed surface', 'Hammered texture', 'Reflective coating'],
    sizeRange: 'Small coins to shield-sized leaves',
    notableFeatures: ['Actual metal content', 'Reflective surface', 'Heavy weight', 'Valuable if processed'],
    flavorText: 'Concentrates metals. Makes leaves. Literal gold mine. Botanist dreams. Miner confusion.',
  },
  'flowing_appendages': {
    name: 'Tentacular Growth',
    colorSchemes: ['Fleshy pinks', 'Dark purples', 'Translucent amber', 'Venous red'],
    textureOptions: ['Smooth and motile', 'Muscular appearance', 'Pulsating movement', 'Suckers or hooks'],
    sizeRange: 'Thin tendrils to thick tentacles',
    notableFeatures: ['Active movement', 'Grasping ability', 'Unsettling appearance', 'Carnivorous tendencies'],
    flavorText: 'Moves deliberately. Grasps intentionally. Plant or animal? Both. Neither. Unsettling.',
  },
};

// ============================================================================
// COMPLETE ALIEN PLANT EXAMPLES
// ============================================================================
// Demonstrating how to combine components

export interface AlienPlantSpecies {
  id: string;
  name: string;
  scientificName: string;
  description: string;

  growthPattern: string;
  energyMethod: string;
  reproductionMethod: string;
  defenseMechanism: string;
  environmentalAdaptation: string;
  unusualProperty: string;
  appearancePattern: string;

  discovered: string;
  nativeWorld: string;
  edibility: 'toxic' | 'inedible' | 'edible' | 'delicious' | 'addictive';
  usefulness: string[];
}

export const EXAMPLE_ALIEN_PLANTS: AlienPlantSpecies[] = [
  {
    id: 'crystal_spire_01',
    name: 'Singing Crystal Spire',
    scientificName: 'Crystallus harmonicus',
    description: `Vertical towers of translucent crystal that photosynthesize through silicon-based structures. Wind passes through internal channels, producing harmonious tones. Native populations report the fields "singing" during storms—a phenomenon both beautiful and unsettling.

The crystals grow following perfect geometric patterns, adding new facets in Fibonacci sequences. They're technically alive, technically plants, and technically violating several assumptions about carbon-based life. Botanists have been arguing about classification for decades. The plants continue growing, unconcerned.

Harvesting is possible but controversial. The crystals may or may not be sentient. They definitely remember being harvested. Next year's growth shows stress patterns. Make of that what you will.`,

    growthPattern: 'vertical_tower',
    energyMethod: 'photovoltaic_leaves',
    reproductionMethod: 'time_delayed_germination',
    defenseMechanism: 'thorns_basic',
    environmentalAdaptation: 'desert_specialist',
    unusualProperty: 'sound_production',
    appearancePattern: 'crystalline_structure',

    discovered: 'Colony Ship Prospero, Year 127',
    nativeWorld: 'Kepler-442b Analog',
    edibility: 'inedible',
    usefulness: ['Ornamental', 'Musical instrument', 'Solar panels (living)', 'Philosophical debates'],
  },

  {
    id: 'void_creeper_01',
    name: 'Nightmare Vine',
    scientificName: 'Tenebris somnius',
    description: `What happens when evolution has no predators? This. Aggressive climbing vine that produces powerful psychoactive compounds to confuse herbivores. Side effect: also confuses humans. Severely.

The vine grows rapidly, using parasitic attachment to climb anything vertical. Trees. Buildings. Unfortunate animals that stood still too long. Once established, it emits a constant low-level hallucinogen that makes herbivores wander away confused. Humans experience vivid dreams near large colonies. Very vivid. Consensus is "avoid."

Local wildlife has adapted. Learned to avoid. Humans keep trying to study it. Researchers report excellent data, weird dreams, and recurring desire to live among the vines. Previous research teams not heard from. Current team optimistic.`,

    growthPattern: 'vine_climber',
    energyMethod: 'parasitic_theft',
    reproductionMethod: 'animal_ingestion',
    defenseMechanism: 'psychoactive_emissions',
    environmentalAdaptation: 'aerial_floating',
    unusualProperty: 'memory_retention',
    appearancePattern: 'flowing_appendages',

    discovered: 'Survey Team Delta, Status: Missing',
    nativeWorld: 'Gliese 667 Cc',
    edibility: 'toxic',
    usefulness: ['Pharmaceutical research', 'Recreational (illegal)', 'Nightmare fuel', 'Research team losses'],
  },

  {
    id: 'quantum_bloom_01',
    name: 'Schrödinger\'s Flower',
    scientificName: 'Quantus superpositus',
    description: `Exists and doesn't exist simultaneously. Observing it forces collapse into one state or the other. Watering schedule complicated. Existence questionable. Classification: yes.

The flower appears translucent, partially phased into another dimension. Touch passes through it. Sometimes. Other times it's solid. Quantum mechanics applied to botany produces headaches. And this. Mostly headaches.

Pollination occurs through quantum entanglement. Seeds appear elsewhere. Anywhere elsewhere. Including impossible locations. One seed germinated inside a sealed container. Another inside a research log. Physics department called. Physics department hung up.`,

    growthPattern: 'colonial_cluster',
    energyMethod: 'electromagnetic_absorption',
    reproductionMethod: 'teleportation_spores',
    defenseMechanism: 'mirror_camouflage',
    environmentalAdaptation: 'vacuum_hardy',
    unusualProperty: 'reality_phasing',
    appearancePattern: 'bioluminescent_display',

    discovered: 'Quantum Research Station, Year Unknown',
    nativeWorld: 'Origin Uncertain',
    edibility: 'edible',
    usefulness: ['Quantum computing', 'Philosophy papers', 'Existential crises', 'Grant applications'],
  },
];
