/**
 * Research Sets - N-of-M Unlock Logic
 *
 * Research sets define groups of papers where discovering N papers
 * from a set of M unlocks technologies. This creates uncertainty in
 * research paths - researchers don't know which papers are crucial
 * until technologies unlock.
 *
 * Like real research: perceptron + LSTM + transformer + attention → LLMs
 * No one knew which papers would be critical until the tech worked.
 */

import type { ResearchSet } from './types.js';
import { TECH_EXPANSION_RESEARCH_SETS } from './tech-expansion-sets.js';

// ============================================================================
// AGRICULTURE SETS
// ============================================================================

export const BASIC_AGRICULTURE_SET: ResearchSet = {
  setId: 'basic_agriculture',
  name: 'Foundational Agriculture',
  description: 'The fundamental principles of growing food from seeds',
  field: 'agriculture',

  // All 7 papers in the set
  allPapers: [
    'seed_selection',
    'soil_preparation',
    'irrigation_principles',
    'fertilization_theory',
    'crop_rotation',
    'climate_control',
    'year_round_growing'
  ],

  unlocks: [
    {
      technologyId: 'agriculture_i',
      papersRequired: 2, // Need 2 of 7 papers
      mandatoryPapers: ['seed_selection'], // This one is mandatory
      grants: [
        { type: 'building', buildingId: 'farm_plot' },
        { type: 'crop', cropId: 'wheat' },
        { type: 'crop', cropId: 'carrot' },
        { type: 'ability', abilityId: 'plant_seeds' }
      ]
    },
    {
      technologyId: 'agriculture_ii',
      papersRequired: 4, // Need 4 of 7 papers
      mandatoryPapers: ['irrigation_principles', 'fertilization_theory'],
      grants: [
        { type: 'building', buildingId: 'irrigation_system' },
        { type: 'item', itemId: 'fertilizer' },
        { type: 'crop', cropId: 'tomato' },
        { type: 'crop', cropId: 'corn' }
      ]
    },
    {
      technologyId: 'greenhouse_cultivation',
      papersRequired: 6, // Need 6 of 7 papers
      mandatoryPapers: ['climate_control', 'year_round_growing'],
      grants: [
        { type: 'building', buildingId: 'greenhouse' },
        { type: 'crop', cropId: 'tropical_fruit' },
        { type: 'ability', abilityId: 'year_round_farming' }
      ]
    }
  ]
};

// ============================================================================
// METALLURGY SETS
// ============================================================================

export const BASIC_METALLURGY_SET: ResearchSet = {
  setId: 'basic_metallurgy',
  name: 'Fundamental Metalworking',
  description: 'From rocks to refined metal',
  field: 'metallurgy',

  allPapers: [
    'ore_identification',
    'smelting_fundamentals',
    'iron_working',
    'mining_techniques',
    'forge_construction',
    'bellows_operation',
    'tool_maintenance',
    'ore_grading',
    'slag_management'
  ],

  unlocks: [
    {
      technologyId: 'basic_metallurgy',
      papersRequired: 3, // Need 3 of 9
      mandatoryPapers: ['smelting_fundamentals'],
      grants: [
        { type: 'building', buildingId: 'furnace' },
        { type: 'building', buildingId: 'smithy' },
        { type: 'ability', abilityId: 'smelt_ore' }
      ]
    },
    {
      technologyId: 'iron_age',
      papersRequired: 6, // Need 6 of 9
      mandatoryPapers: ['iron_working'],
      grants: [
        { type: 'item', itemId: 'iron_ingot' },
        { type: 'item', itemId: 'iron_tools' },
        { type: 'ability', abilityId: 'craft_iron' }
      ]
    }
  ]
};

export const ADVANCED_METALLURGY_SET: ResearchSet = {
  setId: 'advanced_metallurgy',
  name: 'Steel & Alloys',
  description: 'Beyond simple iron - the art of advanced metalworking',
  field: 'metallurgy',

  allPapers: [
    'carbon_infusion',
    'quenching_theory',
    'alloy_theory',
    'pattern_welding',
    'hardness_testing',
    'grain_structure',
    'temperature_precision',
    'surface_finishing',
    'wire_drawing',
    'metal_casting',
    'tool_steel',
    'legendary_metallurgy'
  ],

  unlocks: [
    {
      technologyId: 'steel_forging',
      papersRequired: 4, // Need 4 of 12
      mandatoryPapers: ['carbon_infusion'],
      grants: [
        { type: 'item', itemId: 'steel_ingot' },
        { type: 'item', itemId: 'steel_weapons' },
        { type: 'item', itemId: 'steel_armor' }
      ]
    },
    {
      technologyId: 'advanced_alloys',
      papersRequired: 7, // Need 7 of 12
      mandatoryPapers: ['alloy_theory'],
      grants: [
        { type: 'item', itemId: 'bronze' },
        { type: 'item', itemId: 'brass' },
        { type: 'ability', abilityId: 'create_alloys' }
      ]
    },
    {
      technologyId: 'legendary_metals',
      papersRequired: 10, // Need 10 of 12
      mandatoryPapers: ['legendary_metallurgy'],
      grants: [
        { type: 'ability', abilityId: 'masterwork_crafting' },
        { type: 'item', itemId: 'masterwork_blade' }
      ]
    }
  ]
};

// ============================================================================
// ALCHEMY SETS
// ============================================================================

export const BASIC_ALCHEMY_SET: ResearchSet = {
  setId: 'basic_alchemy',
  name: 'Foundations of Alchemy',
  description: 'Learning to identify, extract, and mix substances safely',
  field: 'alchemy',

  allPapers: [
    'substance_identification',
    'extraction_methods',
    'mixture_theory',
    'crystallization_methods',
    'sublimation_techniques',
    'solution_preparation',
    'precipitation_reactions',
    'solubility_principles',
    'laboratory_safety'
  ],

  unlocks: [
    {
      technologyId: 'basic_alchemy',
      papersRequired: 3, // Need 3 of 9
      mandatoryPapers: ['substance_identification'],
      grants: [
        { type: 'building', buildingId: 'alchemy_lab' },
        { type: 'ability', abilityId: 'identify_substances' }
      ]
    },
    {
      technologyId: 'advanced_alchemy',
      papersRequired: 6, // Need 6 of 9
      mandatoryPapers: ['mixture_theory'],
      grants: [
        { type: 'item', itemId: 'acid' },
        { type: 'item', itemId: 'base' },
        { type: 'building', buildingId: 'advanced_lab' }
      ]
    }
  ]
};

export const ADVANCED_ALCHEMY_SET: ResearchSet = {
  setId: 'advanced_alchemy',
  name: 'Potions & Transmutation',
  description: 'The pinnacle of alchemical knowledge',
  field: 'alchemy',

  allPapers: [
    'potion_formulation',
    'transmutation_principles',
    'grand_alchemy',
    'tincture_preparation',
    'medicinal_herbs',
    'poison_recognition',
    'antidote_formulation',
    'distillation_cycles',
    'specific_gravity'
  ],

  unlocks: [
    {
      technologyId: 'medicine',
      papersRequired: 3, // Need 3 of 9
      mandatoryPapers: ['potion_formulation'],
      grants: [
        { type: 'building', buildingId: 'apothecary' },
        { type: 'item', itemId: 'healing_potion' },
        { type: 'item', itemId: 'medicine' }
      ]
    },
    {
      technologyId: 'transmutation',
      papersRequired: 5, // Need 5 of 9
      mandatoryPapers: ['transmutation_principles'],
      grants: [
        { type: 'ability', abilityId: 'transmute_metals' }
      ]
    },
    {
      technologyId: 'legendary_alchemy',
      papersRequired: 8, // Need 8 of 9
      mandatoryPapers: ['grand_alchemy'],
      grants: [
        { type: 'item', itemId: 'universal_solvent' },
        { type: 'item', itemId: 'elixir_of_life' },
        { type: 'ability', abilityId: 'grand_transmutation' }
      ]
    }
  ]
};

// ============================================================================
// RUNE MAGIC SETS
// ============================================================================

export const RUNE_MAGIC_SET: ResearchSet = {
  setId: 'rune_magic',
  name: 'The Art of Runic Inscription',
  description: 'From simple symbols to reality-altering elder runes',
  field: 'arcane',

  allPapers: [
    'symbol_recognition',
    'carving_fundamentals',
    'material_sympathies',
    'rune_combinations',
    'activation_methods',
    'chromatic_runecraft',
    'geometric_patterns',
    'phonetic_activation',
    'rune_syntax',
    'protective_wards',
    'rune_erasure',
    'rune_amplification',
    'temporal_inscription',
    'layered_runes',
    'binding_inscriptions',
    'sympathetic_linking',
    'runic_arrays',
    'elder_runes'
  ],

  unlocks: [
    {
      technologyId: 'basic_runes',
      papersRequired: 4, // Need 4 of 18
      mandatoryPapers: ['symbol_recognition'],
      grants: [
        { type: 'ability', abilityId: 'carve_basic_runes' },
        { type: 'spell', spellId: 'rune_of_light' },
        { type: 'spell', spellId: 'rune_of_protection' }
      ]
    },
    {
      technologyId: 'intermediate_runes',
      papersRequired: 10, // Need 10 of 18
      mandatoryPapers: ['rune_combinations', 'activation_methods'],
      grants: [
        { type: 'ability', abilityId: 'combine_runes' },
        { type: 'spell', spellId: 'rune_of_fire' },
        { type: 'spell', spellId: 'rune_of_frost' },
        { type: 'building', buildingId: 'rune_workshop' }
      ]
    },
    {
      technologyId: 'elder_runes',
      papersRequired: 16, // Need 16 of 18
      mandatoryPapers: ['elder_runes'],
      grants: [
        { type: 'ability', abilityId: 'carve_elder_runes' },
        { type: 'spell', spellId: 'elder_rune_of_binding' },
        { type: 'spell', spellId: 'elder_rune_of_unmaking' }
      ]
    }
  ]
};

// ============================================================================
// FOUNDATIONAL SCIENCES (Prerequisites for Clarke Tech)
// ============================================================================

/**
 * Basic Physics - Classical Foundation
 *
 * The foundation of all physical sciences. Required before advanced physics.
 * Civilizations must understand basic mechanics before relativity.
 */
export const BASIC_PHYSICS_SET: ResearchSet = {
  setId: 'basic_physics',
  name: 'Classical Physics',
  description: 'Newtonian mechanics, thermodynamics, and optics',
  field: 'physics',

  allPapers: [
    'newtons_laws',
    'force_and_acceleration',
    'conservation_of_energy',
    'conservation_of_momentum',
    'gravitation_theory',
    'orbital_mechanics',
    'thermodynamics_first_law',
    'thermodynamics_second_law',
    'entropy_and_disorder',
    'heat_transfer_theory',
    'wave_mechanics',
    'optics_fundamentals',
    'reflection_and_refraction',
    'lens_theory',
    'projectile_motion',
    'rotational_dynamics',
    'simple_harmonic_motion',
    'fluid_mechanics',
    'pressure_and_buoyancy',
    'bernoulli_principle'
  ],

  unlocks: [
    {
      technologyId: 'newtonian_mechanics',
      papersRequired: 6, // Need 6 of 20
      mandatoryPapers: ['newtons_laws', 'force_and_acceleration', 'conservation_of_energy'],
      grants: [
        { type: 'building', buildingId: 'physics_lab' },
        { type: 'ability', abilityId: 'calculate_trajectories' }
      ]
    },
    {
      technologyId: 'thermodynamics',
      papersRequired: 10, // Need 10 of 20
      mandatoryPapers: ['thermodynamics_first_law', 'thermodynamics_second_law', 'entropy_and_disorder'],
      grants: [
        { type: 'building', buildingId: 'heat_engine' },
        { type: 'ability', abilityId: 'design_thermal_systems' }
      ]
    },
    {
      technologyId: 'advanced_optics',
      papersRequired: 15, // Need 15 of 20
      mandatoryPapers: ['optics_fundamentals', 'lens_theory'],
      grants: [
        { type: 'building', buildingId: 'telescope' },
        { type: 'building', buildingId: 'microscope' },
        { type: 'item', itemId: 'precision_lenses' }
      ]
    }
  ]
};

/**
 * Mathematics Fundamentals
 *
 * Essential mathematical tools for all sciences. Required for advanced physics.
 */
export const MATHEMATICS_FUNDAMENTALS_SET: ResearchSet = {
  setId: 'mathematics_fundamentals',
  name: 'Foundational Mathematics',
  description: 'Calculus, linear algebra, and geometry',
  field: 'mathematics',

  allPapers: [
    'differential_calculus',
    'integral_calculus',
    'multivariable_calculus',
    'fundamental_theorem_calculus',
    'limits_and_continuity',
    'series_and_sequences',
    'linear_algebra_basics',
    'matrix_operations',
    'vector_spaces',
    'eigenvalues_eigenvectors',
    'euclidean_geometry',
    'analytic_geometry',
    'trigonometry_advanced',
    'complex_numbers',
    'probability_theory',
    'statistics_foundations',
    'set_theory',
    'mathematical_logic'
  ],

  unlocks: [
    {
      technologyId: 'calculus_mastery',
      papersRequired: 5, // Need 5 of 18
      mandatoryPapers: ['differential_calculus', 'integral_calculus'],
      grants: [
        { type: 'building', buildingId: 'mathematics_institute' },
        { type: 'ability', abilityId: 'solve_differential_problems' }
      ]
    },
    {
      technologyId: 'linear_algebra',
      papersRequired: 9, // Need 9 of 18
      mandatoryPapers: ['linear_algebra_basics', 'matrix_operations', 'vector_spaces'],
      grants: [
        { type: 'ability', abilityId: 'matrix_computation' },
        { type: 'ability', abilityId: 'solve_linear_systems' }
      ]
    },
    {
      technologyId: 'mathematical_foundations',
      papersRequired: 14, // Need 14 of 18
      mandatoryPapers: ['fundamental_theorem_calculus', 'probability_theory'],
      grants: [
        { type: 'ability', abilityId: 'advanced_mathematical_reasoning' },
        { type: 'building', buildingId: 'research_university' }
      ]
    }
  ]
};

/**
 * Advanced Physics - Modern Physics
 *
 * Relativity, electromagnetism, nuclear physics. Requires basic physics foundation.
 * Gateway to exotic physics and quantum mechanics.
 */
export const ADVANCED_PHYSICS_SET: ResearchSet = {
  setId: 'advanced_physics',
  name: 'Modern Physics',
  description: 'Relativity, electromagnetism, and nuclear physics',
  field: 'advanced_physics',

  allPapers: [
    'special_relativity',
    'general_relativity',
    'spacetime_curvature',
    'time_dilation',
    'length_contraction',
    'mass_energy_equivalence',
    'electromagnetic_theory',
    'maxwells_equations',
    'electromagnetic_waves',
    'light_as_wave',
    'light_as_particle',
    'photoelectric_effect',
    'atomic_structure',
    'nuclear_fission',
    'nuclear_fusion',
    'radioactive_decay',
    'strong_nuclear_force',
    'weak_nuclear_force',
    'particle_accelerators',
    'plasma_physics',
    'electromagnetic_field_theory',
    'relativistic_mechanics'
  ],

  unlocks: [
    {
      technologyId: 'special_relativity_tech',
      papersRequired: 5, // Need 5 of 22
      mandatoryPapers: ['special_relativity', 'time_dilation', 'mass_energy_equivalence'],
      grants: [
        { type: 'ability', abilityId: 'relativistic_calculations' },
        { type: 'building', buildingId: 'advanced_physics_lab' }
      ]
    },
    {
      technologyId: 'electromagnetism_mastery',
      papersRequired: 10, // Need 10 of 22
      mandatoryPapers: ['maxwells_equations', 'electromagnetic_theory'],
      grants: [
        { type: 'ability', abilityId: 'design_electromagnetic_devices' },
        { type: 'building', buildingId: 'particle_accelerator' }
      ]
    },
    {
      technologyId: 'nuclear_physics',
      papersRequired: 15, // Need 15 of 22
      mandatoryPapers: ['nuclear_fission', 'nuclear_fusion', 'strong_nuclear_force'],
      grants: [
        { type: 'building', buildingId: 'nuclear_reactor' },
        { type: 'ability', abilityId: 'harness_nuclear_energy' }
      ]
    },
    {
      technologyId: 'general_relativity_tech',
      papersRequired: 20, // Need 20 of 22 (very hard!)
      mandatoryPapers: ['general_relativity', 'spacetime_curvature'],
      grants: [
        { type: 'ability', abilityId: 'understand_curved_spacetime' },
        { type: 'building', buildingId: 'gravitational_observatory' }
      ]
    }
  ]
};

/**
 * Advanced Mathematics
 *
 * Topology, differential equations, group theory. Required for exotic physics.
 * The mathematical language of advanced quantum mechanics and field theory.
 */
export const ADVANCED_MATHEMATICS_SET: ResearchSet = {
  setId: 'advanced_mathematics',
  name: 'Advanced Mathematical Theory',
  description: 'Topology, differential equations, and abstract algebra',
  field: 'advanced_mathematics',

  allPapers: [
    'ordinary_differential_equations',
    'partial_differential_equations',
    'fourier_analysis',
    'laplace_transforms',
    'tensor_calculus',
    'differential_geometry',
    'riemannian_geometry',
    'topology_basics',
    'algebraic_topology',
    'group_theory',
    'ring_theory',
    'field_theory_algebra',
    'lie_groups',
    'lie_algebras',
    'representation_theory',
    'hilbert_spaces',
    'functional_analysis',
    'measure_theory',
    'complex_analysis',
    'non_euclidean_geometry'
  ],

  unlocks: [
    {
      technologyId: 'differential_equations_mastery',
      papersRequired: 6, // Need 6 of 20
      mandatoryPapers: ['ordinary_differential_equations', 'partial_differential_equations'],
      grants: [
        { type: 'ability', abilityId: 'model_dynamic_systems' },
        { type: 'building', buildingId: 'computational_mathematics_lab' }
      ]
    },
    {
      technologyId: 'geometric_analysis',
      papersRequired: 11, // Need 11 of 20
      mandatoryPapers: ['tensor_calculus', 'differential_geometry', 'riemannian_geometry'],
      grants: [
        { type: 'ability', abilityId: 'analyze_curved_spaces' },
        { type: 'ability', abilityId: 'tensor_manipulation' }
      ]
    },
    {
      technologyId: 'abstract_algebra_mastery',
      papersRequired: 16, // Need 16 of 20
      mandatoryPapers: ['group_theory', 'lie_groups', 'representation_theory'],
      grants: [
        { type: 'ability', abilityId: 'symmetry_analysis' },
        { type: 'ability', abilityId: 'algebraic_structure_design' }
      ]
    }
  ]
};

/**
 * Artificial Intelligence & Machine Learning
 *
 * Foundation for language models, agents, RAG, and agentic systems.
 * LLMs are "compressed wikis" - when retrieved from advanced timelines via
 * Svetz missions, they transfer all knowledge they were trained on.
 *
 * REQUIRES: Advanced Mathematics (for neural networks, optimization)
 */
export const ARTIFICIAL_INTELLIGENCE_SET: ResearchSet = {
  setId: 'artificial_intelligence',
  name: 'Artificial Intelligence & Machine Learning',
  description: 'Neural networks, LLMs, agents, RAG, and agentic systems',
  field: 'artificial_intelligence',

  allPapers: [
    'perceptron_basics',
    'backpropagation',
    'gradient_descent',
    'neural_network_architectures',
    'convolutional_networks',
    'recurrent_networks',
    'lstm_architecture',
    'attention_mechanisms',
    'transformer_architecture',
    'language_model_scaling_laws',
    'gpt_architecture',
    'constitutional_ai',
    'reinforcement_learning_basics',
    'rlhf_theory',
    'agent_architectures',
    'retrieval_augmented_generation',
    'embedding_spaces',
    'vector_databases',
    'agentic_systems',
    'tool_use_frameworks',
    'multi_agent_coordination',
    'knowledge_compression'
  ],

  unlocks: [
    {
      technologyId: 'basic_neural_networks',
      papersRequired: 5, // Need 5 of 22
      mandatoryPapers: ['perceptron_basics', 'backpropagation', 'gradient_descent'],
      grants: [
        { type: 'building', buildingId: 'ai_research_lab' },
        { type: 'ability', abilityId: 'train_neural_networks' }
      ]
    },
    {
      technologyId: 'language_models',
      papersRequired: 10, // Need 10 of 22
      mandatoryPapers: ['transformer_architecture', 'attention_mechanisms', 'language_model_scaling_laws'],
      grants: [
        { type: 'building', buildingId: 'llm_training_facility' },
        { type: 'ability', abilityId: 'train_language_models' },
        { type: 'item', itemId: 'compressed_wiki' } // LLMs are compressed knowledge
      ]
    },
    {
      technologyId: 'agentic_ai',
      papersRequired: 16, // Need 16 of 22
      mandatoryPapers: ['agent_architectures', 'retrieval_augmented_generation', 'tool_use_frameworks'],
      grants: [
        { type: 'ability', abilityId: 'design_ai_agents' },
        { type: 'ability', abilityId: 'rag_systems' },
        { type: 'building', buildingId: 'agentic_ai_lab' }
      ]
    },
    {
      technologyId: 'multi_agent_systems',
      papersRequired: 20, // Need 20 of 22
      mandatoryPapers: ['multi_agent_coordination', 'agentic_systems'],
      grants: [
        { type: 'ability', abilityId: 'coordinate_agent_teams' },
        { type: 'ability', abilityId: 'collective_intelligence' }
      ]
    }
  ]
};

/**
 * Neural Interfaces
 *
 * Brain-computer interfaces, neural prosthetics. Required for brainships
 * and consciousness uploading. Combines AI/ML with neuroscience.
 *
 * REQUIRES: Artificial Intelligence + Advanced Physics (for neural implants)
 */
export const NEURAL_INTERFACES_SET: ResearchSet = {
  setId: 'neural_interfaces',
  name: 'Neural Interfaces & Brain-Computer Integration',
  description: 'Direct brain-computer communication and neural prosthetics',
  field: 'neural_interfaces',

  allPapers: [
    'neural_signal_processing',
    'brain_computer_interface_basics',
    'invasive_neural_implants',
    'non_invasive_neural_reading',
    'motor_cortex_decoding',
    'visual_cortex_interface',
    'auditory_cortex_interface',
    'neural_encoding_theory',
    'bidirectional_neural_interface',
    'neural_plasticity_hacking',
    'brain_machine_symbiosis',
    'neural_bandwidth_optimization',
    'thought_translation',
    'direct_neural_communication',
    'brain_to_brain_interface',
    'neural_lace_architecture',
    'full_brain_interface',
    'brainship_integration_theory'
  ],

  unlocks: [
    {
      technologyId: 'basic_bci',
      papersRequired: 5, // Need 5 of 18
      mandatoryPapers: ['neural_signal_processing', 'brain_computer_interface_basics'],
      grants: [
        { type: 'building', buildingId: 'neural_interface_lab' },
        { type: 'ability', abilityId: 'read_neural_signals' }
      ]
    },
    {
      technologyId: 'bidirectional_neural_interface',
      papersRequired: 9, // Need 9 of 18
      mandatoryPapers: ['bidirectional_neural_interface', 'neural_encoding_theory'],
      grants: [
        { type: 'item', itemId: 'neural_implant' },
        { type: 'ability', abilityId: 'write_neural_signals' }
      ]
    },
    {
      technologyId: 'brain_machine_symbiosis',
      papersRequired: 13, // Need 13 of 18
      mandatoryPapers: ['brain_machine_symbiosis', 'neural_lace_architecture'],
      grants: [
        { type: 'ability', abilityId: 'create_neural_symbiosis' },
        { type: 'building', buildingId: 'symbiosis_surgery_center' }
      ]
    },
    {
      technologyId: 'brainship_neural_integration',
      papersRequired: 16, // Need 16 of 18 (very hard!)
      mandatoryPapers: ['brainship_integration_theory', 'full_brain_interface'],
      grants: [
        { type: 'ability', abilityId: 'integrate_brain_with_ship' },
        { type: 'building', buildingId: 'brainship_surgery_facility' }
      ]
    }
  ]
};

/**
 * Exotic Physics - Frontier of Physical Theory
 *
 * Quantum field theory, particle physics, string theory, cosmology.
 * The final prerequisite before accessing quantum mechanics and temporal navigation.
 * REQUIRES: Advanced Physics + Advanced Mathematics
 */
export const EXOTIC_PHYSICS_SET: ResearchSet = {
  setId: 'exotic_physics',
  name: 'Exotic Physics',
  description: 'Quantum field theory, particle physics, and cosmological models',
  field: 'exotic_physics',

  allPapers: [
    'quantum_field_theory',
    'feynman_diagrams',
    'renormalization_theory',
    'gauge_theory',
    'yang_mills_theory',
    'standard_model',
    'quark_theory',
    'gluon_interactions',
    'electroweak_unification',
    'higgs_mechanism',
    'supersymmetry',
    'string_theory_basics',
    'extra_dimensions',
    'brane_cosmology',
    'quantum_gravity_candidates',
    'cosmological_inflation',
    'dark_matter_theory',
    'dark_energy_hypothesis',
    'black_hole_thermodynamics',
    'hawking_radiation',
    'holographic_principle',
    'ads_cft_correspondence',
    'multiverse_hypothesis',
    'anthropic_principle',
    'vacuum_energy_density'
  ],

  unlocks: [
    {
      technologyId: 'quantum_field_theory_basics',
      papersRequired: 8, // Need 8 of 25
      mandatoryPapers: ['quantum_field_theory', 'feynman_diagrams', 'gauge_theory'],
      grants: [
        { type: 'building', buildingId: 'high_energy_physics_lab' },
        { type: 'ability', abilityId: 'qft_calculations' }
      ]
    },
    {
      technologyId: 'particle_physics_mastery',
      papersRequired: 14, // Need 14 of 25
      mandatoryPapers: ['standard_model', 'higgs_mechanism', 'electroweak_unification'],
      grants: [
        { type: 'building', buildingId: 'collider_facility' },
        { type: 'ability', abilityId: 'probe_fundamental_particles' }
      ]
    },
    {
      technologyId: 'unified_field_theory',
      papersRequired: 20, // Need 20 of 25 (extremely hard!)
      mandatoryPapers: ['string_theory_basics', 'quantum_gravity_candidates', 'extra_dimensions'],
      grants: [
        { type: 'ability', abilityId: 'unified_physics_understanding' },
        { type: 'building', buildingId: 'theoretical_physics_institute' }
      ]
    },
    {
      technologyId: 'exotic_cosmology',
      papersRequired: 22, // Need 22 of 25 (nearly complete!)
      mandatoryPapers: ['multiverse_hypothesis', 'holographic_principle', 'brane_cosmology'],
      grants: [
        { type: 'ability', abilityId: 'probe_reality_structure' },
        { type: 'ability', abilityId: 'detect_extra_dimensions' }
      ]
    }
  ]
};

// ============================================================================
// QUANTUM MECHANICS & TEMPORAL NAVIGATION (Rainbow Mars)
// Requires: Exotic Physics + Advanced Mathematics
// ============================================================================

/**
 * Quantum Observation Fundamentals
 *
 * The foundation of understanding quantum superposition and wavefunction collapse.
 * Essential for Stage 2+ civilizations beginning to perceive β-space.
 */
export const QUANTUM_OBSERVATION_SET: ResearchSet = {
  setId: 'quantum_observation',
  name: 'Quantum Observation Fundamentals',
  description: 'Understanding quantum superposition and the observer effect',
  field: 'quantum_mechanics',

  allPapers: [
    'double_slit_experiment',
    'wavefunction_collapse',
    'quantum_superposition',
    'schrodingers_paradox',
    'observer_effect',
    'decoherence_theory',
    'quantum_entanglement',
    'measurement_problem',
    'copenhagen_interpretation',
    'many_worlds_hypothesis'
  ],

  unlocks: [
    {
      technologyId: 'quantum_theory_i',
      papersRequired: 3, // Need 3 of 10
      mandatoryPapers: ['wavefunction_collapse', 'observer_effect'],
      grants: [
        { type: 'ability', abilityId: 'understand_superposition' },
        { type: 'building', buildingId: 'quantum_lab' }
      ]
    },
    {
      technologyId: 'quantum_theory_ii',
      papersRequired: 6, // Need 6 of 10
      mandatoryPapers: ['decoherence_theory', 'quantum_entanglement'],
      grants: [
        { type: 'ability', abilityId: 'quantum_measurement' },
        { type: 'item', itemId: 'quantum_detector' }
      ]
    }
  ]
};

/**
 * Beta-Space Navigation Theory
 *
 * Understanding β-branches as timeline variations accessible through
 * emotional topology. The foundation of Stage 2 temporal navigation.
 */
export const BETA_SPACE_FUNDAMENTALS_SET: ResearchSet = {
  setId: 'beta_space_fundamentals',
  name: 'β-Space Navigation Theory',
  description: 'Timeline navigation via emotional topology and probability branches',
  field: 'temporal_navigation',

  allPapers: [
    'emotional_topology',
    'beta_branch_theory',
    'timeline_branching',
    'probability_navigation',
    'narrative_weight_theory',
    'emotional_anchoring',
    'beta_space_geometry',
    'timeline_compatibility',
    'branch_distance_metrics',
    'emotional_coordinates',
    'navigation_safety_protocols',
    'beta_space_cartography'
  ],

  unlocks: [
    {
      technologyId: 'beta_navigation_theory',
      papersRequired: 4, // Need 4 of 12
      mandatoryPapers: ['beta_branch_theory', 'emotional_topology'],
      grants: [
        { type: 'ability', abilityId: 'perceive_beta_branches' },
        { type: 'building', buildingId: 'beta_observatory' }
      ]
    },
    {
      technologyId: 'basic_beta_navigation',
      papersRequired: 7, // Need 7 of 12
      mandatoryPapers: ['probability_navigation', 'navigation_safety_protocols'],
      grants: [
        { type: 'ability', abilityId: 'navigate_beta_space' },
        { type: 'building', buildingId: 'threshold_ship' },
        { type: 'building', buildingId: 'courier_ship' }
      ]
    },
    {
      technologyId: 'advanced_beta_navigation',
      papersRequired: 10, // Need 10 of 12
      mandatoryPapers: ['beta_space_geometry', 'beta_space_cartography'],
      grants: [
        { type: 'ability', abilityId: 'advanced_beta_navigation' },
        { type: 'building', buildingId: 'story_ship' }
      ]
    }
  ]
};

/**
 * Crew Coherence Engineering
 *
 * Understanding quantum observer coupling - how strongly a crew
 * observes the same reality. Critical for reliable β-navigation.
 */
export const CREW_COHERENCE_SET: ResearchSet = {
  setId: 'crew_coherence',
  name: 'Crew Coherence Engineering',
  description: 'Quantum observer coupling and collective reality perception',
  field: 'temporal_navigation',

  allPapers: [
    'observer_coupling',
    'collective_observation',
    'coherence_thresholds',
    'decoherence_prevention',
    'crew_size_limits',
    'emotional_synchronization',
    'coherence_training',
    'meditation_protocols',
    'shared_narrative_techniques',
    'coherence_monitoring',
    'emergency_recoupling',
    'brainship_symbiosis_theory',
    'perfect_coupling_mechanics',
    'solo_navigation_advantages'
  ],

  unlocks: [
    {
      technologyId: 'coherence_monitoring',
      papersRequired: 4, // Need 4 of 14
      mandatoryPapers: ['observer_coupling', 'coherence_thresholds'],
      grants: [
        { type: 'item', itemId: 'coherence_meter' },
        { type: 'ability', abilityId: 'monitor_crew_coherence' }
      ]
    },
    {
      technologyId: 'coherence_training',
      papersRequired: 7, // Need 7 of 14
      mandatoryPapers: ['emotional_synchronization', 'meditation_protocols'],
      grants: [
        { type: 'building', buildingId: 'meditation_chamber' },
        { type: 'ability', abilityId: 'train_crew_coherence' }
      ]
    },
    {
      technologyId: 'brainship_construction',
      papersRequired: 10, // Need 10 of 14
      mandatoryPapers: ['brainship_symbiosis_theory', 'perfect_coupling_mechanics'],
      grants: [
        { type: 'building', buildingId: 'brainship' },
        { type: 'ability', abilityId: 'create_brainship_bond' }
      ]
    }
  ]
};

/**
 * Rainbow Planet Discovery
 *
 * Understanding planets in quantum superposition - multiple simultaneous
 * pasts that collapse when observed. The Rainbow Mars phenomenon.
 */
export const RAINBOW_PLANET_SET: ResearchSet = {
  setId: 'rainbow_planet_discovery',
  name: 'Rainbow Planet Mechanics',
  description: 'Planets in quantum superposition with multiple simultaneous pasts',
  field: 'quantum_mechanics',

  allPapers: [
    'planetary_superposition',
    'observational_collapse',
    'rainbow_mars_discovery',
    'multiple_histories_theory',
    'planetary_wavefunction',
    'timeline_archaeology',
    'extinct_civilization_observation',
    'probability_weighted_pasts',
    'decoherence_prevention',
    'planetary_quantum_states',
    'cross_timeline_contamination',
    'green_mars_hypothesis',
    'blue_mars_hypothesis',
    'red_mars_observation'
  ],

  unlocks: [
    {
      technologyId: 'detect_rainbow_planets',
      papersRequired: 5, // Need 5 of 14
      mandatoryPapers: ['planetary_superposition', 'rainbow_mars_discovery'],
      grants: [
        { type: 'item', itemId: 'quantum_planet_scanner' },
        { type: 'ability', abilityId: 'detect_superposition_planets' }
      ]
    },
    {
      technologyId: 'planetary_archaeology',
      papersRequired: 9, // Need 9 of 14
      mandatoryPapers: ['timeline_archaeology', 'extinct_civilization_observation'],
      grants: [
        { type: 'building', buildingId: 'svetz_retrieval_ship' },
        { type: 'ability', abilityId: 'retrieve_from_extinct_timelines' }
      ]
    },
    {
      technologyId: 'controlled_collapse',
      papersRequired: 12, // Need 12 of 14
      mandatoryPapers: ['observational_collapse', 'planetary_wavefunction'],
      grants: [
        { type: 'ability', abilityId: 'collapse_planetary_history' },
        { type: 'ability', abilityId: 'decohere_to_superposition' }
      ]
    }
  ]
};

/**
 * Temporal Archaeology
 *
 * Retrieving entities and artifacts from extinct timeline branches.
 * Svetz's mission: rescue extinct species from collapsed probability branches.
 */
export const TEMPORAL_ARCHAEOLOGY_SET: ResearchSet = {
  setId: 'temporal_archaeology',
  name: 'Temporal Archaeology',
  description: 'Retrieving artifacts and entities from extinct timeline branches',
  field: 'temporal_navigation',

  allPapers: [
    'extinct_branch_detection',
    'temporal_retrieval_theory',
    'svetz_protocols',
    'entity_extraction',
    'timeline_contamination_risks',
    'preservation_techniques',
    'extinct_species_cataloging',
    'paradox_avoidance',
    'retrieval_ethics',
    'cross_branch_biology',
    'timeline_stability_analysis',
    'contamination_quarantine'
  ],

  unlocks: [
    {
      technologyId: 'basic_temporal_retrieval',
      papersRequired: 4, // Need 4 of 12
      mandatoryPapers: ['extinct_branch_detection', 'temporal_retrieval_theory'],
      grants: [
        { type: 'ability', abilityId: 'detect_extinct_branches' },
        { type: 'building', buildingId: 'temporal_archive' }
      ]
    },
    {
      technologyId: 'svetz_operations',
      papersRequired: 7, // Need 7 of 12
      mandatoryPapers: ['svetz_protocols', 'entity_extraction'],
      grants: [
        { type: 'building', buildingId: 'svetz_retrieval_ship' },
        { type: 'ability', abilityId: 'retrieve_extinct_entities' }
      ]
    },
    {
      technologyId: 'contamination_management',
      papersRequired: 10, // Need 10 of 12
      mandatoryPapers: ['timeline_contamination_risks', 'contamination_quarantine'],
      grants: [
        { type: 'building', buildingId: 'quarantine_facility' },
        { type: 'ability', abilityId: 'manage_timeline_contamination' }
      ]
    }
  ]
};

/**
 * Advanced Timeline Engineering
 *
 * Stage 3 capabilities: probability mapping, branch merging, and
 * deliberate timeline manipulation. The frontier of temporal technology.
 */
export const TIMELINE_ENGINEERING_SET: ResearchSet = {
  setId: 'timeline_engineering',
  name: 'Advanced Timeline Engineering',
  description: 'Probability mapping, branch merging, and timeline manipulation',
  field: 'dimensional_awareness',

  allPapers: [
    'probability_space_mapping',
    'unobserved_branch_navigation',
    'branch_compatibility_theory',
    'timeline_merger_mechanics',
    'fork_bomb_prevention',
    'probability_scout_design',
    'solo_navigation_theory',
    'perfect_observer_coupling',
    'branch_collapse_protocols',
    'multiverse_shear_prevention',
    'timeline_merger_ethics',
    'dimensional_awareness_training',
    'post_temporal_perception',
    'stage_three_transition'
  ],

  unlocks: [
    {
      technologyId: 'probability_scouting',
      papersRequired: 5, // Need 5 of 14
      mandatoryPapers: ['probability_space_mapping', 'solo_navigation_theory'],
      grants: [
        { type: 'building', buildingId: 'probability_scout' },
        { type: 'ability', abilityId: 'map_unobserved_branches' }
      ]
    },
    {
      technologyId: 'timeline_merger',
      papersRequired: 9, // Need 9 of 14
      mandatoryPapers: ['branch_compatibility_theory', 'timeline_merger_mechanics'],
      grants: [
        { type: 'building', buildingId: 'timeline_merger_ship' },
        { type: 'ability', abilityId: 'merge_compatible_branches' }
      ]
    },
    {
      technologyId: 'stage_three_awareness',
      papersRequired: 12, // Need 12 of 14
      mandatoryPapers: ['dimensional_awareness_training', 'stage_three_transition'],
      grants: [
        { type: 'ability', abilityId: 'stage_3_perception' },
        { type: 'ability', abilityId: 'manipulate_probability_branches' }
      ]
    }
  ]
};

/**
 * Digital Consciousness Transfer
 *
 * Gleisner technology - uploading consciousness to digital substrates
 * for improved quantum coherence and self-editing capabilities.
 */
export const DIGITAL_CONSCIOUSNESS_SET: ResearchSet = {
  setId: 'digital_consciousness',
  name: 'Digital Consciousness Transfer',
  description: 'Uploading minds to digital substrates for enhanced β-navigation',
  field: 'dimensional_awareness',

  allPapers: [
    'consciousness_mapping',
    'neural_pattern_extraction',
    'digital_substrate_design',
    'gleisner_architecture',
    'consciousness_verification',
    'digital_coherence_advantages',
    'self_editing_protocols',
    'backup_and_restore',
    'digital_immortality',
    'consciousness_merging',
    'substrate_independence'
  ],

  unlocks: [
    {
      technologyId: 'consciousness_upload',
      papersRequired: 4, // Need 4 of 11
      mandatoryPapers: ['consciousness_mapping', 'neural_pattern_extraction'],
      grants: [
        { type: 'building', buildingId: 'upload_facility' },
        { type: 'ability', abilityId: 'upload_consciousness' }
      ]
    },
    {
      technologyId: 'gleisner_vessels',
      papersRequired: 7, // Need 7 of 11
      mandatoryPapers: ['gleisner_architecture', 'digital_coherence_advantages'],
      grants: [
        { type: 'building', buildingId: 'gleisner_vessel' },
        { type: 'ability', abilityId: 'digital_beta_navigation' }
      ]
    },
    {
      technologyId: 'digital_transcendence',
      papersRequired: 10, // Need 10 of 11
      mandatoryPapers: ['substrate_independence', 'consciousness_merging'],
      grants: [
        { type: 'ability', abilityId: 'substrate_independent_existence' },
        { type: 'ability', abilityId: 'merge_digital_consciousnesses' }
      ]
    }
  ]
};

// ============================================================================
// MAGIC PATHS TO β-SPACE
// ============================================================================
//
// Magic provides alternative paths to β-space that are shorter than tech (196 papers)
// but still require substantial research investment (100+ papers).
//
// Classification:
// - ABSURD (fastest): 101 papers exactly - narrative + wild magic combo
// - NEUTRAL (medium): ~130-150 papers - daemon, rune, pact, song
// - REALISTIC (harder): ~160-180 papers - divine, academic
//
// ============================================================================

// ============================================================================
// ABSURD PATH: NARRATIVE + WILD MAGIC (101 papers total)
// ============================================================================
// The speedrun route: "absurdist literary surrealism with bloodline wild magic"
// Shortest path to reality bending, but still a major undertaking.

/**
 * Basic Narrative Magic (Tier 1)
 *
 * Foundation of story-based reality manipulation.
 * Learn that stories have power and reality has narrative structure.
 */
export const BASIC_NARRATIVE_MAGIC_SET: ResearchSet = {
  setId: 'basic_narrative_magic',
  name: 'Foundational Narrative Theory',
  description: 'Stories shape reality - learn the basics of narrative causality',
  field: 'narrative_magic',

  allPapers: [
    'narrative_causality_basics',
    'story_structure_fundamentals',
    'character_archetype_theory',
    'plot_device_identification',
    'foreshadowing_mechanics',
    'narrative_tension_dynamics',
    'story_resolution_theory',
    'genre_conventions_study',
    'audience_expectation_theory',
    'narrative_consistency',
    'chekovs_gun_principle',
    'red_herring_theory',
    'dramatic_irony_mechanics',
    'story_logic_fundamentals',
    'narrative_momentum',
    'character_motivation_theory',
    'plot_progression_analysis',
    'story_beat_structure',
    'narrative_pacing_theory',
    'thematic_coherence'
  ],

  unlocks: [
    {
      technologyId: 'narrative_awareness',
      papersRequired: 6, // Need 6 of 20
      mandatoryPapers: ['narrative_causality_basics', 'story_structure_fundamentals'],
      grants: [
        { type: 'building', buildingId: 'storyteller_guild' },
        { type: 'ability', abilityId: 'perceive_narrative_patterns' }
      ]
    },
    {
      technologyId: 'basic_story_magic',
      papersRequired: 12, // Need 12 of 20
      mandatoryPapers: ['plot_device_identification', 'story_logic_fundamentals'],
      grants: [
        { type: 'ability', abilityId: 'minor_narrative_influence' }
      ]
    }
  ]
};

/**
 * Basic Wild Magic (Tier 1)
 *
 * Foundation of chaos-based magic.
 * Learn to channel unpredictable magical forces.
 */
export const BASIC_WILD_MAGIC_SET: ResearchSet = {
  setId: 'basic_wild_magic',
  name: 'Wild Magic Fundamentals',
  description: 'Harness raw, unpredictable magical chaos',
  field: 'wild_magic',

  allPapers: [
    'wild_magic_theory',
    'chaos_energy_detection',
    'unpredictability_acceptance',
    'wild_surge_observation',
    'magical_entropy_basics',
    'chaos_channeling_basics',
    'wild_magic_safety',
    'surge_mitigation_techniques',
    'chaos_affinity_cultivation',
    'wild_magic_bloodline_study',
    'spontaneous_magic_theory',
    'reality_instability_awareness',
    'chaos_anchor_creation',
    'wild_magic_meditation',
    'entropy_sensitivity_training',
    'chaos_pattern_recognition',
    'wild_magic_control_paradox',
    'surge_prediction_theory'
  ],

  unlocks: [
    {
      technologyId: 'wild_magic_sensitivity',
      papersRequired: 5, // Need 5 of 18
      mandatoryPapers: ['wild_magic_theory', 'chaos_energy_detection'],
      grants: [
        { type: 'building', buildingId: 'chaos_meditation_grove' },
        { type: 'ability', abilityId: 'sense_wild_magic' }
      ]
    },
    {
      technologyId: 'basic_chaos_channeling',
      papersRequired: 10, // Need 10 of 18
      mandatoryPapers: ['chaos_channeling_basics', 'wild_magic_safety'],
      grants: [
        { type: 'ability', abilityId: 'channel_chaos_safely' }
      ]
    }
  ]
};

/**
 * Advanced Narrative Mechanics (Tier 2)
 *
 * Deeper understanding of metafictional concepts.
 * Begin to perceive the fourth wall.
 */
export const ADVANCED_NARRATIVE_MECHANICS_SET: ResearchSet = {
  setId: 'advanced_narrative_mechanics',
  name: 'Advanced Narrative Manipulation',
  description: 'Perceive and manipulate the meta-narrative structure of reality',
  field: 'narrative_magic',

  allPapers: [
    'metafictional_awareness_introduction',
    'fourth_wall_cracks',
    'author_intent_theory',
    'character_agency_vs_plot',
    'narrative_determinism',
    'story_editing_theory',
    'retroactive_continuity_basics',
    'parallel_narrative_theory',
    'subplot_mechanics',
    'narrative_branching_theory',
    'story_convergence_points',
    'plot_hole_formation',
    'continuity_error_theory',
    'narrative_weight_measurement',
    'protagonist_identification',
    'supporting_character_theory',
    'narrative_convenience_study',
    'deus_ex_machina_analysis',
    'plot_armor_observation',
    'genre_shifting_theory'
  ],

  unlocks: [
    {
      technologyId: 'metafictional_perception',
      papersRequired: 8, // Need 8 of 20
      mandatoryPapers: ['metafictional_awareness_introduction', 'fourth_wall_cracks'],
      grants: [
        { type: 'building', buildingId: 'metafiction_library' },
        { type: 'ability', abilityId: 'perceive_fourth_wall' }
      ]
    },
    {
      technologyId: 'narrative_editing',
      papersRequired: 14, // Need 14 of 20
      mandatoryPapers: ['story_editing_theory', 'retroactive_continuity_basics', 'plot_hole_formation'],
      grants: [
        { type: 'ability', abilityId: 'edit_local_narrative' }
      ]
    }
  ]
};

/**
 * Advanced Chaos Theory (Tier 2)
 *
 * Master chaotic systems and entropy manipulation.
 * Prepare for reality-breaking magic.
 */
export const ADVANCED_CHAOS_THEORY_SET: ResearchSet = {
  setId: 'advanced_chaos_theory',
  name: 'Advanced Chaos Manipulation',
  description: 'Master entropy and chaotic magical systems',
  field: 'wild_magic',

  allPapers: [
    'chaos_mathematics',
    'entropy_manipulation_theory',
    'butterfly_effect_magic',
    'deterministic_chaos_study',
    'strange_attractor_theory',
    'reality_stability_measurement',
    'chaos_cascade_theory',
    'controlled_wild_surge',
    'chaos_amplification',
    'entropy_reversal_theory',
    'reality_fracture_basics',
    'dimensional_instability',
    'chaos_resonance',
    'wild_magic_focusing',
    'reality_tear_theory'
  ],

  unlocks: [
    {
      technologyId: 'chaos_mathematics_mastery',
      papersRequired: 6, // Need 6 of 15
      mandatoryPapers: ['chaos_mathematics', 'entropy_manipulation_theory'],
      grants: [
        { type: 'building', buildingId: 'chaos_laboratory' },
        { type: 'ability', abilityId: 'manipulate_entropy' }
      ]
    },
    {
      technologyId: 'reality_instability_mastery',
      papersRequired: 11, // Need 11 of 15
      mandatoryPapers: ['reality_stability_measurement', 'reality_fracture_basics'],
      grants: [
        { type: 'ability', abilityId: 'create_reality_instabilities' }
      ]
    }
  ]
};

/**
 * Narrative Plot Hole Exploitation (Tier 3)
 *
 * The core of absurdist β-space navigation.
 * Exploit inconsistencies in reality's story to travel between timelines.
 *
 * Reduced from 33 to 15 papers as part of 101-paper speedrun path.
 */
export const NARRATIVE_PLOT_HOLE_EXPLOITATION_SET: ResearchSet = {
  setId: 'narrative_plot_hole_exploitation',
  name: 'Plot Hole Dimensional Navigation',
  description: 'Navigate timelines by exploiting narrative inconsistencies',
  field: 'narrative_magic',

  allPapers: [
    'plot_hole_detection_mastery',
    'continuity_error_weaponization',
    'narrative_beta_correspondence',
    'story_branch_timeline_theory',
    'protagonist_privilege_exploitation',
    'plot_armor_quantification',
    'deus_ex_machina_invocation',
    'retroactive_continuity_casting',
    'alternate_ending_access',
    'franchise_multiverse_mapping',
    'crossover_event_navigation',
    'reboot_timeline_theory',
    'sequel_hook_anchoring',
    'narrative_convenience_maximization',
    'author_revision_detection'
  ],

  unlocks: [
    {
      technologyId: 'plot_hole_navigation',
      papersRequired: 6, // Need 6 of 15
      mandatoryPapers: ['plot_hole_detection_mastery', 'narrative_beta_correspondence'],
      grants: [
        { type: 'building', buildingId: 'narrative_observatory' },
        { type: 'ability', abilityId: 'perceive_plot_holes' }
      ]
    },
    {
      technologyId: 'absurd_beta_travel',
      papersRequired: 12, // Need 12 of 15 - near-complete mastery
      mandatoryPapers: [
        'story_branch_timeline_theory',
        'alternate_ending_access',
        'franchise_multiverse_mapping',
        'narrative_convenience_maximization'
      ],
      grants: [
        { type: 'building', buildingId: 'plot_device_ship' },
        { type: 'ability', abilityId: 'navigate_via_plot_holes' },
        { type: 'ability', abilityId: 'narrative_beta_navigation' }
      ]
    }
  ]
};

/**
 * Wild Chaos β-Navigation (Tier 3)
 *
 * Reality-breaking chaos magic for dimensional travel.
 * Surf entropy gradients between timelines.
 *
 * Kept at 13 papers as part of 101-paper speedrun path.
 */
export const WILD_CHAOS_BETA_NAVIGATION_SET: ResearchSet = {
  setId: 'wild_chaos_beta_navigation',
  name: 'Chaos-Driven Timeline Navigation',
  description: 'Navigate timelines via entropy gradients and reality breaks',
  field: 'wild_magic',

  allPapers: [
    'dimensional_fracture_navigation',
    'reality_tear_creation_mastery',
    'chaos_rift_stabilization',
    'entropy_gradient_sensing',
    'wild_surge_riding',
    'chaos_beta_correspondence',
    'entropy_timeline_theory',
    'wild_magic_quantum_coupling',
    'chaotic_branch_navigation',
    'reality_storm_surfing',
    'dimensional_chaos_ship_theory',
    'chaos_anchor_beta_space',
    'wild_magic_timeline_sensing'
  ],

  unlocks: [
    {
      technologyId: 'chaos_rift_travel',
      papersRequired: 5, // Need 5 of 13
      mandatoryPapers: ['reality_tear_creation_mastery', 'chaos_rift_stabilization'],
      grants: [
        { type: 'ability', abilityId: 'tear_dimensional_barriers' }
      ]
    },
    {
      technologyId: 'wild_beta_navigation',
      papersRequired: 10, // Need 10 of 13 - near-complete mastery
      mandatoryPapers: [
        'chaos_beta_correspondence',
        'wild_magic_quantum_coupling',
        'chaotic_branch_navigation'
      ],
      grants: [
        { type: 'building', buildingId: 'chaos_storm_ship' },
        { type: 'ability', abilityId: 'wild_beta_navigation' },
        { type: 'ability', abilityId: 'surf_reality_storms' }
      ]
    }
  ]
};

// Total absurd path: 20 + 18 + 20 + 15 + 15 + 13 = 101 papers exactly!

// ============================================================================
// NEUTRAL PATHS: ~140 papers each
// ============================================================================

// ========================================
// DAEMON MAGIC PATH (~140 papers total)
// ========================================

/**
 * Tier 1: Basic Daemon Theory (25 papers)
 *
 * Fundamental understanding of daemons and their connection to human consciousness.
 */
export const BASIC_DAEMON_THEORY_SET: ResearchSet = {
  setId: 'basic_daemon_theory',
  name: 'Daemon Nature and Bonding Fundamentals',
  description: 'Study the fundamental nature of daemons and their bond with humans',
  field: 'daemon_magic',

  allPapers: [
    'daemon_physical_manifestation',
    'daemon_consciousness_theory',
    'human_daemon_soul_bond',
    'daemon_shape_shifting_mechanics',
    'settling_process_observation',
    'daemon_touch_taboo_theory',
    'intercision_trauma_study',
    'daemon_separation_distance_limits',
    'daemon_communication_methods',
    'daemon_emotional_reflection',
    'child_daemon_flexibility',
    'adult_daemon_fixation',
    'daemon_animal_forms_cataloging',
    'true_form_determination_theory',
    'daemon_naming_practices',
    'daemon_death_mechanics',
    'witches_daemon_separation_basics',
    'shamanic_daemon_traditions',
    'daemon_cultural_variations',
    'daemon_less_beings_theory',
    'daemon_perception_abilities',
    'daemon_instinct_vs_human_reason',
    'daemon_gender_correspondence',
    'daemon_symbolic_meaning',
    'daemon_bond_strength_measurement'
  ],

  unlocks: [
    {
      technologyId: 'daemon_awareness',
      papersRequired: 8,
      mandatoryPapers: ['daemon_physical_manifestation', 'human_daemon_soul_bond', 'settling_process_observation'],
      grants: [
        { type: 'building', buildingId: 'daemon_study_hall' },
        { type: 'ability', abilityId: 'understand_daemon_nature' }
      ]
    },
    {
      technologyId: 'daemon_bond_mastery',
      papersRequired: 15,
      mandatoryPapers: ['daemon_communication_methods', 'true_form_determination_theory', 'daemon_bond_strength_measurement'],
      grants: [
        { type: 'ability', abilityId: 'strengthen_daemon_bond' }
      ]
    }
  ]
};

/**
 * Tier 2: Daemon Separation Training (30 papers)
 *
 * Learning to safely separate from one's daemon, required for advanced travel.
 */
export const DAEMON_SEPARATION_TRAINING_SET: ResearchSet = {
  setId: 'daemon_separation_training',
  name: 'Daemon Separation and Extended Distance',
  description: 'Master the painful but necessary art of daemon separation',
  field: 'daemon_magic',

  allPapers: [
    'intercision_ethical_analysis',
    'voluntary_separation_protocols',
    'witch_separation_techniques',
    'separation_pain_management',
    'gradual_distance_increase_training',
    'separation_meditation_methods',
    'daemon_separation_psychological_effects',
    'reconnection_after_separation',
    'shamanic_separation_rituals',
    'cloud_pine_branch_travel',
    'separation_distance_measurement',
    'extreme_distance_daemon_communication',
    'separation_trauma_healing',
    'forced_separation_consequences',
    'separation_vs_intercision_differences',
    'daemon_autonomy_after_separation',
    'separated_daemon_independent_action',
    'witch_daemon_miles_apart',
    'separation_endurance_training',
    'daemon_location_sensing',
    'separated_combat_coordination',
    'reunion_emotional_intensity',
    'permanent_separation_theory',
    'separation_soul_damage_prevention',
    'advanced_separation_techniques',
    'multi_day_separation_protocols',
    'cross_world_daemon_coherence',
    'daemon_quantum_entanglement',
    'separated_daemon_perception_sharing',
    'separation_mastery_achievement'
  ],

  unlocks: [
    {
      technologyId: 'basic_daemon_separation',
      papersRequired: 10,
      mandatoryPapers: ['voluntary_separation_protocols', 'witch_separation_techniques', 'separation_pain_management'],
      grants: [
        { type: 'building', buildingId: 'separation_training_chamber' },
        { type: 'ability', abilityId: 'separate_from_daemon_short_distance' }
      ]
    },
    {
      technologyId: 'advanced_daemon_separation',
      papersRequired: 20,
      mandatoryPapers: ['witch_daemon_miles_apart', 'cross_world_daemon_coherence', 'separation_mastery_achievement'],
      grants: [
        { type: 'ability', abilityId: 'separate_from_daemon_extreme_distance' },
        { type: 'ability', abilityId: 'daemon_enhanced_perception' }
      ]
    }
  ]
};

/**
 * Tier 3: Dust Navigation Fundamentals (35 papers)
 *
 * Learning to perceive and navigate via Dust currents.
 * Prerequisite: Daemon Separation Mastery
 */
export const DUST_NAVIGATION_FUNDAMENTALS_SET: ResearchSet = {
  setId: 'dust_navigation_fundamentals',
  name: 'Dust Perception and Navigation',
  description: 'Learn to see and navigate the Dust currents that flow between worlds',
  field: 'daemon_magic',

  allPapers: [
    'dust_elementary_particle_theory',
    'conscious_dust_hypothesis',
    'dust_attraction_to_consciousness',
    'rusakov_field_detection',
    'dust_photon_emission',
    'aurora_borealis_dust_connection',
    'dust_detector_construction',
    'dust_flow_visualization',
    'cave_painting_dust_analysis',
    'dust_wisdom_correlation',
    'original_sin_dust_theory',
    'church_dust_suppression_study',
    'dust_child_adult_differential',
    'puberty_dust_attraction_increase',
    'dust_daemon_interaction',
    'dust_consciousness_feedback_loop',
    'dust_between_worlds_flow',
    'world_boundary_dust_accumulation',
    'dust_current_mapping_methods',
    'dust_navigation_theory',
    'dust_enhanced_perception',
    'alethiometer_dust_mechanics',
    'symbol_reader_dust_channeling',
    'dust_truth_revelation',
    'amber_spyglass_dust_vision',
    'multiverse_dust_currents',
    'dust_window_detection',
    'natural_world_crossing_points',
    'dust_rift_identification',
    'temporal_dust_patterns',
    'dust_memory_theory',
    'dust_branching_timeline_signature',
    'dust_emotional_resonance',
    'dust_narrative_weight_correlation',
    'advanced_dust_navigation_techniques'
  ],

  unlocks: [
    {
      technologyId: 'dust_perception',
      papersRequired: 12,
      mandatoryPapers: ['conscious_dust_hypothesis', 'rusakov_field_detection', 'dust_flow_visualization'],
      grants: [
        { type: 'building', buildingId: 'dust_observatory' },
        { type: 'ability', abilityId: 'perceive_dust_currents' }
      ]
    },
    {
      technologyId: 'dust_navigation_basics',
      papersRequired: 22,
      mandatoryPapers: ['dust_current_mapping_methods', 'world_boundary_dust_accumulation', 'dust_navigation_theory'],
      grants: [
        { type: 'ability', abilityId: 'follow_dust_currents' },
        { type: 'ability', abilityId: 'detect_world_boundaries' }
      ]
    },
    {
      technologyId: 'advanced_dust_sensing',
      papersRequired: 28,
      mandatoryPapers: ['amber_spyglass_dust_vision', 'dust_branching_timeline_signature', 'advanced_dust_navigation_techniques'],
      grants: [
        { type: 'item', itemId: 'amber_spyglass' },
        { type: 'ability', abilityId: 'see_dust_in_all_worlds' }
      ]
    }
  ]
};

/**
 * Tier 4: Subtle Knife & Reality Cutting (30 papers)
 *
 * Master the ultimate tool for cutting between worlds.
 * Prerequisite: Advanced Dust Sensing
 */
export const SUBTLE_KNIFE_MASTERY_SET: ResearchSet = {
  setId: 'subtle_knife_mastery',
  name: 'The Subtle Knife and Reality Cutting',
  description: 'Learn to cut through the fabric of reality itself',
  field: 'daemon_magic',

  allPapers: [
    'subtle_knife_origin_study',
    'torre_degli_angeli_history',
    'guild_of_philosophers_research',
    'reality_fabric_structure',
    'edge_atom_sharpness_theory',
    'spectre_creation_mechanics',
    'window_cutting_technique',
    'reality_wound_theory',
    'bearer_hand_scarring',
    'knife_bearer_selection_criteria',
    'subtle_knife_focus_requirements',
    'will_parry_technique_analysis',
    'knife_target_visualization',
    'reality_resistance_measurement',
    'clean_cut_vs_tear_comparison',
    'window_size_limitations',
    'window_stability_duration',
    'window_closure_mechanics',
    'permanent_window_consequences',
    'spectre_window_correlation',
    'knife_misuse_dangers',
    'reality_scar_accumulation',
    'knife_intention_focus',
    'cutting_under_pressure',
    'defensive_window_creation',
    'rapid_window_sequence',
    'precision_cutting_mastery',
    'world_specific_cutting_difficulty',
    'knife_bearer_responsibility',
    'ultimate_reality_severance'
  ],

  unlocks: [
    {
      technologyId: 'basic_reality_cutting',
      papersRequired: 10,
      mandatoryPapers: ['subtle_knife_origin_study', 'window_cutting_technique', 'reality_fabric_structure'],
      grants: [
        { type: 'building', buildingId: 'knife_bearer_sanctum' },
        { type: 'ability', abilityId: 'attempt_reality_cutting' }
      ]
    },
    {
      technologyId: 'stable_window_creation',
      papersRequired: 18,
      mandatoryPapers: ['clean_cut_vs_tear_comparison', 'window_stability_duration', 'knife_intention_focus'],
      grants: [
        { type: 'item', itemId: 'subtle_knife' },
        { type: 'ability', abilityId: 'cut_stable_windows' }
      ]
    },
    {
      technologyId: 'master_knife_bearer',
      papersRequired: 25,
      mandatoryPapers: ['precision_cutting_mastery', 'rapid_window_sequence', 'ultimate_reality_severance'],
      grants: [
        { type: 'ability', abilityId: 'master_reality_cutting' },
        { type: 'ability', abilityId: 'cut_between_any_worlds' }
      ]
    }
  ]
};

/**
 * Tier 5: β-Space Integration (20 papers)
 *
 * Combine Dust navigation with β-space theory for timeline travel.
 * FINAL TIER - Unlocks dimensional travel ships.
 */
export const DAEMON_DUST_NAVIGATION_SET: ResearchSet = {
  setId: 'daemon_dust_navigation',
  name: 'Daemon Dust Navigation',
  description: 'Navigate between worlds via Dust currents and the Subtle Knife',
  field: 'daemon_magic',

  allPapers: [
    // Foundational daemon understanding
    'daemon_nature_theory',
    'dust_particles_observation',
    'dust_consciousness_hypothesis',
    'multiverse_dust_flows',
    // Dust sensing and navigation
    'dust_vision_training',
    'dust_current_mapping',
    'world_boundary_detection',
    'subtle_knife_theory',
    'reality_cutting_mechanics',
    'window_creation_techniques',
    // Advanced daemon travel
    'daemon_separation_mastery',
    'witch_distance_achievement',
    'cross_world_coherence',
    'daemon_guided_navigation',
    'multiverse_cartography',
    // Integration with β-space
    'dust_beta_space_correspondence',
    'daemon_quantum_coupling',
    'cross_timeline_dust_flow',
    'spectres_and_timeline_contamination',
    'alethiometer_truth_navigation'
  ],

  unlocks: [
    {
      technologyId: 'daemon_dust_vision',
      papersRequired: 5, // Need 5 of 20
      mandatoryPapers: ['daemon_nature_theory', 'dust_particles_observation'],
      grants: [
        { type: 'building', buildingId: 'dust_observatory' },
        { type: 'ability', abilityId: 'perceive_dust_currents' }
      ]
    },
    {
      technologyId: 'subtle_knife_mastery',
      papersRequired: 10, // Need 10 of 20
      mandatoryPapers: ['subtle_knife_theory', 'reality_cutting_mechanics', 'window_creation_techniques'],
      grants: [
        { type: 'item', itemId: 'subtle_knife' },
        { type: 'ability', abilityId: 'cut_between_worlds' },
        { type: 'building', buildingId: 'daemon_world_walker_ship' } // First β-space ship via magic!
      ]
    },
    {
      technologyId: 'daemon_beta_navigation',
      papersRequired: 15, // Need 15 of 20
      mandatoryPapers: ['dust_beta_space_correspondence', 'daemon_quantum_coupling', 'cross_timeline_dust_flow'],
      grants: [
        { type: 'ability', abilityId: 'daemon_navigate_beta_space' },
        { type: 'ability', abilityId: 'alethiometer_navigation' }
      ]
    }
  ]
};

// ========================================
// RUNE MAGIC PATH (~140 papers total)
// ========================================

/**
 * Tier 1: Basic Rune Theory (25 papers)
 *
 * Learning the fundamental alphabet and principles of runic magic.
 */
export const BASIC_RUNE_THEORY_SET: ResearchSet = {
  setId: 'basic_rune_theory',
  name: 'Foundational Runelore',
  description: 'Master the basic runes and their inherent meanings',
  field: 'rune_magic',

  allPapers: [
    'runic_alphabet_basics',
    'elder_futhark_introduction',
    'younger_futhark_study',
    'anglo_saxon_runes',
    'rune_phonetic_values',
    'rune_symbolic_meanings',
    'rune_magical_properties',
    'rune_combination_theory',
    'bind_rune_basics',
    'rune_orientation_significance',
    'upright_vs_reversed_runes',
    'rune_element_associations',
    'rune_deity_connections',
    'runic_divination_basics',
    'rune_casting_methods',
    'rune_meditation_practices',
    'personal_rune_identification',
    'rune_mnemonics',
    'rune_chanting_techniques',
    'galdr_basic_theory',
    'rune_visualization',
    'rune_poetry_traditions',
    'historical_rune_inscriptions',
    'archaeological_rune_study',
    'modern_vs_ancient_runecraft'
  ],

  unlocks: [
    {
      technologyId: 'rune_literacy',
      papersRequired: 8,
      mandatoryPapers: ['elder_futhark_introduction', 'rune_symbolic_meanings', 'rune_magical_properties'],
      grants: [
        { type: 'building', buildingId: 'rune_study_hall' },
        { type: 'ability', abilityId: 'read_basic_runes' }
      ]
    },
    {
      technologyId: 'basic_rune_magic',
      papersRequired: 15,
      mandatoryPapers: ['bind_rune_basics', 'galdr_basic_theory', 'rune_meditation_practices'],
      grants: [
        { type: 'ability', abilityId: 'channel_rune_energy' }
      ]
    }
  ]
};

/**
 * Tier 2: Rune Carving Mastery (30 papers)
 *
 * Learning to physically inscribe runes with power.
 */
export const RUNE_CARVING_MASTERY_SET: ResearchSet = {
  setId: 'rune_carving_mastery',
  name: 'The Art of Rune Inscription',
  description: 'Master the techniques of carving runes into various materials',
  field: 'rune_magic',

  allPapers: [
    'rune_carving_tools',
    'sacred_blade_preparation',
    'rune_material_selection',
    'wood_rune_carving',
    'stone_rune_inscription',
    'metal_rune_forging',
    'bone_rune_etching',
    'crystal_rune_cutting',
    'carving_meditation_focus',
    'intention_during_carving',
    'rune_activation_rituals',
    'blood_consecration_theory',
    'energy_infusion_methods',
    'carving_timing_significance',
    'lunar_phase_rune_carving',
    'seasonal_rune_creation',
    'personal_vs_general_runes',
    'rune_permanence_techniques',
    'weathering_protection_methods',
    'rune_repair_and_maintenance',
    'defective_rune_disposal',
    'rune_destruction_protocols',
    'multi_rune_sequences',
    'rune_spacing_and_layout',
    'three_dimensional_rune_arrays',
    'architectural_rune_placement',
    'protective_ward_runes',
    'boundary_marking_runes',
    'rune_tool_consecration',
    'master_carver_techniques'
  ],

  unlocks: [
    {
      technologyId: 'basic_rune_carving',
      papersRequired: 10,
      mandatoryPapers: ['rune_carving_tools', 'stone_rune_inscription', 'rune_activation_rituals'],
      grants: [
        { type: 'building', buildingId: 'rune_carving_workshop' },
        { type: 'ability', abilityId: 'carve_functional_runes' }
      ]
    },
    {
      technologyId: 'advanced_rune_inscription',
      papersRequired: 20,
      mandatoryPapers: ['energy_infusion_methods', 'multi_rune_sequences', 'master_carver_techniques'],
      grants: [
        { type: 'ability', abilityId: 'create_powerful_rune_arrays' },
        { type: 'ability', abilityId: 'permanent_rune_inscription' }
      ]
    }
  ]
};

/**
 * Tier 3: Advanced Runic Arrays (35 papers)
 *
 * Creating complex interconnected rune systems.
 */
export const ADVANCED_RUNIC_ARRAYS_SET: ResearchSet = {
  setId: 'advanced_runic_arrays',
  name: 'Complex Runic Geometries',
  description: 'Design and construct intricate arrays of interconnected runes',
  field: 'rune_magic',

  allPapers: [
    'runic_geometry_fundamentals',
    'sacred_geometry_rune_integration',
    'symmetry_in_rune_arrays',
    'circular_rune_formations',
    'linear_rune_sequences',
    'spiral_rune_patterns',
    'fractal_rune_recursion',
    'rune_node_theory',
    'power_flow_between_runes',
    'rune_resonance_mechanics',
    'harmonic_rune_frequencies',
    'dissonant_rune_combinations',
    'amplification_rune_placement',
    'dampening_rune_insertion',
    'rune_circuit_completion',
    'array_activation_sequences',
    'staged_rune_triggering',
    'conditional_rune_activation',
    'self_sustaining_rune_loops',
    'rune_feedback_prevention',
    'array_failure_modes',
    'rune_array_debugging',
    'master_rune_theory',
    'keystone_rune_placement',
    'distributed_rune_networks',
    'long_distance_rune_linking',
    'ley_line_rune_integration',
    'environmental_power_channeling',
    'weather_based_rune_arrays',
    'seasonal_rune_cycles',
    'astronomical_rune_alignment',
    'permanent_rune_structure_design',
    'rune_circle_construction',
    'standing_stone_rune_complexes',
    'architectural_rune_integration'
  ],

  unlocks: [
    {
      technologyId: 'rune_array_construction',
      papersRequired: 12,
      mandatoryPapers: ['runic_geometry_fundamentals', 'power_flow_between_runes', 'array_activation_sequences'],
      grants: [
        { type: 'building', buildingId: 'rune_array_testing_grounds' },
        { type: 'ability', abilityId: 'design_rune_arrays' }
      ]
    },
    {
      technologyId: 'master_rune_networks',
      papersRequired: 22,
      mandatoryPapers: ['master_rune_theory', 'distributed_rune_networks', 'ley_line_rune_integration'],
      grants: [
        { type: 'ability', abilityId: 'create_continental_rune_network' },
        { type: 'building', buildingId: 'standing_stone_complex' }
      ]
    },
    {
      technologyId: 'advanced_rune_architecture',
      papersRequired: 28,
      mandatoryPapers: ['permanent_rune_structure_design', 'architectural_rune_integration', 'self_sustaining_rune_loops'],
      grants: [
        { type: 'ability', abilityId: 'build_rune_powered_structures' }
      ]
    }
  ]
};

/**
 * Tier 4: Dimensional Runes (32 papers)
 *
 * Runes that encode spatial and temporal coordinates.
 */
export const DIMENSIONAL_RUNE_THEORY_SET: ResearchSet = {
  setId: 'dimensional_rune_theory',
  name: 'Spatial and Temporal Runic Encoding',
  description: 'Learn to encode locations and dimensions in runic form',
  field: 'rune_magic',

  allPapers: [
    'location_encoding_runes',
    'coordinate_rune_syntax',
    'distance_measurement_runes',
    'direction_indication_runes',
    'three_dimensional_position_runes',
    'altitude_encoding_theory',
    'underground_depth_runes',
    'relative_position_runes',
    'anchor_point_establishment',
    'reference_frame_runes',
    'world_tree_coordinate_system',
    'yggdrasil_branch_notation',
    'realm_identification_runes',
    'inter_realm_addressing',
    'barrier_permeability_runes',
    'veil_thinning_detection',
    'natural_portal_identification_runes',
    'ley_line_intersection_runes',
    'power_nexus_marking',
    'temporal_coordinate_theory',
    'time_encoding_runes',
    'past_present_future_markers',
    'temporal_duration_runes',
    'seasonal_time_reference',
    'astronomical_time_markers',
    'event_based_temporal_anchors',
    'true_name_acquisition_theory',
    'location_true_naming',
    'dimensional_nomenclature',
    'bifrost_rune_analysis',
    'rainbow_bridge_encoding',
    'multi_realm_navigation_runes'
  ],

  unlocks: [
    {
      technologyId: 'spatial_rune_encoding',
      papersRequired: 12,
      mandatoryPapers: ['location_encoding_runes', 'coordinate_rune_syntax', 'three_dimensional_position_runes'],
      grants: [
        { type: 'building', buildingId: 'cartographic_rune_library' },
        { type: 'ability', abilityId: 'encode_locations_in_runes' }
      ]
    },
    {
      technologyId: 'realm_identification',
      papersRequired: 20,
      mandatoryPapers: ['world_tree_coordinate_system', 'realm_identification_runes', 'inter_realm_addressing'],
      grants: [
        { type: 'ability', abilityId: 'identify_other_realms' },
        { type: 'ability', abilityId: 'detect_realm_boundaries' }
      ]
    },
    {
      technologyId: 'dimensional_addressing',
      papersRequired: 26,
      mandatoryPapers: ['true_name_acquisition_theory', 'dimensional_nomenclature', 'multi_realm_navigation_runes'],
      grants: [
        { type: 'ability', abilityId: 'address_any_dimension' }
      ]
    }
  ]
};

/**
 * Tier 5: β-Space Portal Runes (18 papers)
 *
 * Create permanent gates between timelines using runic portals.
 * FINAL TIER - Unlocks dimensional travel.
 */
export const RUNE_DIMENSIONAL_GATES_SET: ResearchSet = {
  setId: 'rune_dimensional_gates',
  name: 'Runic Dimensional Gates',
  description: 'Carve runes to open stable portals between timelines',
  field: 'rune_magic',

  allPapers: [
    // Foundational rune theory
    'elder_futhark_mastery',
    'true_names_of_dimensions',
    'rune_spatial_encoding',
    'bifrost_rune_analysis',
    // Portal rune construction
    'gateway_rune_syntax',
    'dimensional_coordinate_runes',
    'stability_binding_runes',
    'anchor_point_runes',
    // Advanced runic gates
    'permanent_gate_construction',
    'multi_destination_runes',
    'selective_permeability_runes',
    'temporal_address_runes',
    // β-space integration
    'beta_branch_rune_notation',
    'emotional_topology_runes',
    'narrative_weight_encoding',
    'rune_quantum_coupling',
    'yggdrasil_navigation_theory',
    'world_tree_dimensional_map'
  ],

  unlocks: [
    {
      technologyId: 'basic_portal_runes',
      papersRequired: 5, // Need 5 of 18
      mandatoryPapers: ['elder_futhark_mastery', 'gateway_rune_syntax'],
      grants: [
        { type: 'building', buildingId: 'rune_carving_workshop' },
        { type: 'ability', abilityId: 'carve_dimensional_runes' }
      ]
    },
    {
      technologyId: 'stable_dimensional_gates',
      papersRequired: 10, // Need 10 of 18
      mandatoryPapers: ['permanent_gate_construction', 'anchor_point_runes', 'dimensional_coordinate_runes'],
      grants: [
        { type: 'building', buildingId: 'runic_portal_gate' },
        { type: 'ability', abilityId: 'create_stable_portals' },
        { type: 'building', buildingId: 'rune_walker_ship' } // Runic β-space ship
      ]
    },
    {
      technologyId: 'yggdrasil_navigation',
      papersRequired: 15, // Need 15 of 18
      mandatoryPapers: ['beta_branch_rune_notation', 'yggdrasil_navigation_theory', 'world_tree_dimensional_map'],
      grants: [
        { type: 'ability', abilityId: 'navigate_world_tree' },
        { type: 'ability', abilityId: 'rune_beta_navigation' }
      ]
    }
  ]
};

// ========================================
// PACT MAGIC PATH (~140 papers total)
// ========================================

/**
 * Tier 1: Basic Demonology (25 papers)
 *
 * Understanding the existence and nature of extra-dimensional entities.
 */
export const BASIC_DEMONOLOGY_SET: ResearchSet = {
  setId: 'basic_demonology',
  name: 'Foundational Entity Theory',
  description: 'Study the nature of demons, devils, and extra-dimensional beings',
  field: 'pact_magic',

  allPapers: [
    'entity_existence_hypothesis',
    'dimensional_outsider_theory',
    'demon_taxonomy_basics',
    'devil_vs_demon_distinction',
    'entity_hierarchy_theory',
    'lesser_demons_cataloging',
    'greater_demons_study',
    'demon_lord_observation',
    'entity_motivations_theory',
    'demon_desires_and_needs',
    'entity_perception_of_mortals',
    'demon_psychology_basics',
    'entity_intelligence_levels',
    'demon_communication_capability',
    'entity_deception_patterns',
    'truth_detection_in_entities',
    'demon_weakness_cataloging',
    'entity_strength_assessment',
    'demon_natural_habitat_theory',
    'entity_dimensional_origins',
    'summoning_accident_case_studies',
    'historical_entity_encounters',
    'entity_manifestation_signs',
    'demon_presence_detection',
    'protective_measures_basics'
  ],

  unlocks: [
    {
      technologyId: 'entity_awareness',
      papersRequired: 8,
      mandatoryPapers: ['entity_existence_hypothesis', 'demon_taxonomy_basics', 'entity_motivations_theory'],
      grants: [
        { type: 'building', buildingId: 'demonology_library' },
        { type: 'ability', abilityId: 'recognize_entity_types' }
      ]
    },
    {
      technologyId: 'basic_demon_protection',
      papersRequired: 15,
      mandatoryPapers: ['demon_presence_detection', 'protective_measures_basics', 'truth_detection_in_entities'],
      grants: [
        { type: 'ability', abilityId: 'basic_demon_warding' }
      ]
    }
  ]
};

/**
 * Tier 2: Summoning & Binding (30 papers)
 *
 * Learning to safely call and constrain extra-dimensional entities.
 */
export const SUMMONING_BINDING_SET: ResearchSet = {
  setId: 'summoning_binding',
  name: 'Entity Summoning and Containment',
  description: 'Master the dangerous art of calling forth and binding demons',
  field: 'pact_magic',

  allPapers: [
    'summoning_circle_geometry',
    'sacred_circle_construction',
    'circle_material_selection',
    'salt_circle_theory',
    'iron_binding_properties',
    'silver_demon_repulsion',
    'holy_water_effectiveness',
    'protective_ward_design',
    'layered_protection_theory',
    'circle_failure_modes',
    'emergency_banishment_protocols',
    'true_name_power_theory',
    'true_name_discovery_methods',
    'entity_calling_rituals',
    'incantation_pronunciation',
    'summoning_component_requirements',
    'sacrifice_vs_offering_distinction',
    'blood_circle_consecration',
    'entity_compulsion_theory',
    'binding_duration_limits',
    'entity_resistance_measurement',
    'forced_manifestation_techniques',
    'willing_vs_unwilling_summoning',
    'demon_banishment_methods',
    'entity_dismissal_protocols',
    'circle_cleanup_and_disposal',
    'summoning_timing_significance',
    'lunar_phase_summoning_power',
    'planetary_hour_calculations',
    'advanced_summoning_mastery'
  ],

  unlocks: [
    {
      technologyId: 'basic_summoning',
      papersRequired: 10,
      mandatoryPapers: ['summoning_circle_geometry', 'protective_ward_design', 'entity_calling_rituals'],
      grants: [
        { type: 'building', buildingId: 'summoning_chamber' },
        { type: 'ability', abilityId: 'summon_lesser_entities' }
      ]
    },
    {
      technologyId: 'entity_binding',
      papersRequired: 20,
      mandatoryPapers: ['true_name_power_theory', 'entity_compulsion_theory', 'demon_banishment_methods'],
      grants: [
        { type: 'ability', abilityId: 'bind_summoned_entities' },
        { type: 'ability', abilityId: 'emergency_banishment' }
      ]
    }
  ]
};

/**
 * Tier 3: Contract Theory (35 papers)
 *
 * Understanding the metaphysical laws governing pacts with entities.
 */
export const CONTRACT_THEORY_SET: ResearchSet = {
  setId: 'contract_theory',
  name: 'Metaphysical Contract Law',
  description: 'Master the binding laws that govern deals with demons',
  field: 'pact_magic',

  allPapers: [
    'pact_metaphysics_fundamentals',
    'binding_contract_theory',
    'soul_contract_mechanics',
    'contract_enforcement_mechanisms',
    'universal_contract_law',
    'entity_contract_limitations',
    'loophole_detection_theory',
    'precise_wording_importance',
    'ambiguity_exploitation_risks',
    'contract_interpretation_rules',
    'letter_vs_spirit_distinction',
    'demon_lawyer_tactics',
    'mortal_lawyer_training',
    'contract_negotiation_theory',
    'bargaining_position_assessment',
    'demon_desire_evaluation',
    'price_calculation_methods',
    'payment_structuring_theory',
    'immediate_vs_deferred_payment',
    'installment_contract_design',
    'conditional_clause_construction',
    'escape_clause_theory',
    'contract_nullification_conditions',
    'breach_of_contract_consequences',
    'entity_breach_penalties',
    'mortal_breach_dangers',
    'contract_duration_specification',
    'perpetual_vs_limited_contracts',
    'contract_renewal_clauses',
    'multi_party_pact_theory',
    'witness_requirements',
    'contract_recording_methods',
    'pact_mark_manifestation',
    'soul_signature_theory',
    'advanced_contract_design'
  ],

  unlocks: [
    {
      technologyId: 'basic_pact_negotiation',
      papersRequired: 12,
      mandatoryPapers: ['binding_contract_theory', 'precise_wording_importance', 'contract_negotiation_theory'],
      grants: [
        { type: 'building', buildingId: 'pact_law_library' },
        { type: 'ability', abilityId: 'negotiate_demon_contracts' }
      ]
    },
    {
      technologyId: 'safe_contract_design',
      papersRequired: 22,
      mandatoryPapers: ['loophole_detection_theory', 'escape_clause_theory', 'breach_of_contract_consequences'],
      grants: [
        { type: 'ability', abilityId: 'design_safe_pacts' },
        { type: 'ability', abilityId: 'detect_contract_traps' }
      ]
    },
    {
      technologyId: 'master_pact_law',
      papersRequired: 28,
      mandatoryPapers: ['advanced_contract_design', 'multi_party_pact_theory', 'contract_nullification_conditions'],
      grants: [
        { type: 'ability', abilityId: 'master_demon_contracts' }
      ]
    }
  ]
};

/**
 * Tier 4: Advanced Pact Negotiation (30 papers)
 *
 * Bargaining with powerful entities for major boons.
 */
export const ADVANCED_PACT_NEGOTIATION_SET: ResearchSet = {
  setId: 'advanced_pact_negotiation',
  name: 'Greater Entity Bargaining',
  description: 'Negotiate with demon lords and arch-devils for significant power',
  field: 'pact_magic',

  allPapers: [
    'greater_entity_contact_protocols',
    'demon_lord_true_name_research',
    'arch_devil_hierarchies',
    'entity_politics_navigation',
    'demon_faction_identification',
    'entity_rivalry_exploitation',
    'demon_lord_desires',
    'greater_entity_price_ranges',
    'soul_value_assessment',
    'soul_quality_vs_quantity',
    'alternative_payment_methods',
    'service_contract_theory',
    'champion_pact_design',
    'warlock_bond_mechanics',
    'entity_granted_power_theory',
    'demon_gift_manifestation',
    'cursed_gift_identification',
    'pact_power_limitations',
    'entity_influence_resistance',
    'autonomy_preservation_clauses',
    'demon_possession_prevention',
    'entity_communication_privileges',
    'demon_advisory_role_limits',
    'pact_secrecy_clauses',
    'entity_reputation_management',
    'demon_testimony_reliability',
    'pact_chain_theory',
    'multi_entity_pacts',
    'conflicting_contract_resolution',
    'ultimate_pact_mastery'
  ],

  unlocks: [
    {
      technologyId: 'greater_entity_summoning',
      papersRequired: 10,
      mandatoryPapers: ['greater_entity_contact_protocols', 'demon_lord_true_name_research', 'entity_politics_navigation'],
      grants: [
        { type: 'building', buildingId: 'greater_summoning_sanctum' },
        { type: 'ability', abilityId: 'summon_demon_lords' }
      ]
    },
    {
      technologyId: 'warlock_pact',
      papersRequired: 18,
      mandatoryPapers: ['warlock_bond_mechanics', 'entity_granted_power_theory', 'autonomy_preservation_clauses'],
      grants: [
        { type: 'ability', abilityId: 'form_warlock_pact' },
        { type: 'ability', abilityId: 'channel_patron_power' }
      ]
    },
    {
      technologyId: 'master_pact_negotiator',
      papersRequired: 25,
      mandatoryPapers: ['pact_chain_theory', 'conflicting_contract_resolution', 'ultimate_pact_mastery'],
      grants: [
        { type: 'ability', abilityId: 'negotiate_any_pact' }
      ]
    }
  ]
};

/**
 * Tier 5: Dimensional Travel Pacts (20 papers)
 *
 * Bargaining for passage between worlds and timelines.
 * FINAL TIER - Unlocks entity-powered dimensional travel.
 */
export const PACT_DIMENSIONAL_TRAVEL_SET: ResearchSet = {
  setId: 'pact_dimensional_travel',
  name: 'Pact-Bound Dimensional Travel',
  description: 'Bargain with extra-dimensional entities for passage between worlds',
  field: 'pact_magic',

  allPapers: [
    // Foundational pact theory
    'entity_existence_theory',
    'dimensional_outsider_cataloging',
    'binding_contract_fundamentals',
    'true_name_acquisition',
    // Entity contact and negotiation
    'summoning_circle_geometry',
    'protective_ward_construction',
    'entity_communication_protocols',
    'bargaining_theory',
    'price_calculation',
    // Travel contracts
    'passage_contract_templates',
    'dimensional_guide_binding',
    'safe_conduct_guarantees',
    'temporal_navigation_riders',
    // β-space pacts
    'beta_space_entity_identification',
    'timeline_demon_contracts',
    'narrative_devil_bargains',
    'emotional_topology_guides',
    'pact_quantum_coupling',
    'entity_granted_ship_construction',
    'permanent_dimensional_patronage'
  ],

  unlocks: [
    {
      technologyId: 'basic_entity_contact',
      papersRequired: 5, // Need 5 of 20
      mandatoryPapers: ['entity_existence_theory', 'summoning_circle_geometry', 'protective_ward_construction'],
      grants: [
        { type: 'building', buildingId: 'summoning_chamber' },
        { type: 'ability', abilityId: 'contact_dimensional_entities' }
      ]
    },
    {
      technologyId: 'dimensional_passage_contracts',
      papersRequired: 10, // Need 10 of 20
      mandatoryPapers: ['passage_contract_templates', 'dimensional_guide_binding', 'bargaining_theory'],
      grants: [
        { type: 'ability', abilityId: 'bargain_for_passage' },
        { type: 'building', buildingId: 'pact_walker_ship' } // Entity-powered β-space ship
      ]
    },
    {
      technologyId: 'beta_space_patronage',
      papersRequired: 15, // Need 15 of 20
      mandatoryPapers: ['beta_space_entity_identification', 'timeline_demon_contracts', 'pact_quantum_coupling'],
      grants: [
        { type: 'ability', abilityId: 'pact_beta_navigation' },
        { type: 'ability', abilityId: 'entity_guided_timeline_travel' }
      ]
    }
  ]
};

// ========================================
// SONG MAGIC PATH (~140 papers total)
// ========================================

/**
 * Tier 1: Basic Music Theory & Magic (25 papers)
 *
 * Understanding how sound, music, and voice can affect reality.
 */
export const BASIC_MUSIC_MAGIC_SET: ResearchSet = {
  setId: 'basic_music_magic',
  name: 'Foundational Song Theory',
  description: 'Study the mystical properties of sound and music',
  field: 'song_magic',

  allPapers: [
    'sound_wave_mechanics',
    'frequency_theory',
    'harmonic_series_study',
    'resonance_fundamentals',
    'voice_as_instrument_theory',
    'pitch_perfect_training',
    'tonal_memory_development',
    'musical_notation_systems',
    'scale_construction_theory',
    'modal_music_theory',
    'chord_progression_fundamentals',
    'rhythm_and_timing',
    'polyrhythmic_techniques',
    'overtone_singing_basics',
    'harmonic_overtones_study',
    'sound_and_emotion_connection',
    'music_psychoacoustics',
    'therapeutic_music_theory',
    'sonic_meditation_practices',
    'chant_and_mantra_basics',
    'group_singing_harmonics',
    'acoustic_resonance_spaces',
    'sound_amplification_natural',
    'musical_energy_detection',
    'song_magic_sensitivity_training'
  ],

  unlocks: [
    {
      technologyId: 'musical_awareness',
      papersRequired: 8,
      mandatoryPapers: ['sound_wave_mechanics', 'resonance_fundamentals', 'harmonic_series_study'],
      grants: [
        { type: 'building', buildingId: 'song_academy' },
        { type: 'ability', abilityId: 'perceive_harmonic_energy' }
      ]
    },
    {
      technologyId: 'basic_song_magic',
      papersRequired: 15,
      mandatoryPapers: ['voice_as_instrument_theory', 'overtone_singing_basics', 'musical_energy_detection'],
      grants: [
        { type: 'ability', abilityId: 'channel_power_through_song' }
      ]
    }
  ]
};

/**
 * Tier 2: Harmonic Magic (30 papers)
 *
 * Learning to use specific frequencies and harmonies to affect the physical world.
 */
export const HARMONIC_MAGIC_SET: ResearchSet = {
  setId: 'harmonic_magic',
  name: 'Resonant Frequency Manipulation',
  description: 'Master the art of affecting matter and energy through harmonic resonance',
  field: 'song_magic',

  allPapers: [
    'material_resonant_frequencies',
    'shattering_glass_with_song',
    'resonant_destruction_theory',
    'constructive_resonance',
    'harmonic_healing_techniques',
    'frequency_specific_effects',
    'sonic_disruption_patterns',
    'harmonic_protection_songs',
    'defensive_frequency_shields',
    'resonant_frequency_identification',
    'perfect_pitch_mastery',
    'frequency_matching_techniques',
    'sympathetic_vibration_theory',
    'harmonic_amplification_methods',
    'voice_power_projection',
    'sustained_note_endurance',
    'vocal_range_expansion',
    'multi_tonal_singing',
    'chord_singing_solo_technique',
    'harmonic_convergence_theory',
    'consonance_vs_dissonance_effects',
    'dissonant_reality_disruption',
    'consonant_reality_stabilization',
    'harmonic_sequences_power',
    'musical_spell_casting',
    'song_duration_and_potency',
    'resting_note_theory',
    'silence_as_power',
    'acoustic_environment_optimization',
    'advanced_harmonic_mastery'
  ],

  unlocks: [
    {
      technologyId: 'resonant_manipulation',
      papersRequired: 10,
      mandatoryPapers: ['material_resonant_frequencies', 'frequency_specific_effects', 'resonant_frequency_identification'],
      grants: [
        { type: 'building', buildingId: 'resonance_chamber' },
        { type: 'ability', abilityId: 'manipulate_matter_with_song' }
      ]
    },
    {
      technologyId: 'harmonic_combat',
      papersRequired: 20,
      mandatoryPapers: ['sonic_disruption_patterns', 'defensive_frequency_shields', 'dissonant_reality_disruption'],
      grants: [
        { type: 'ability', abilityId: 'sonic_weaponry' },
        { type: 'ability', abilityId: 'harmonic_defense' }
      ]
    }
  ]
};

/**
 * Tier 3: Reality Resonance (35 papers)
 *
 * Understanding how reality itself vibrates at specific frequencies.
 */
export const REALITY_RESONANCE_SET: ResearchSet = {
  setId: 'reality_resonance',
  name: 'The Music of the Spheres',
  description: 'Perceive and manipulate the fundamental frequencies of reality',
  field: 'song_magic',

  allPapers: [
    'reality_vibration_theory',
    'fundamental_frequency_of_existence',
    'cosmic_harmony_observation',
    'music_of_the_spheres',
    'planetary_resonance_frequencies',
    'stellar_harmonic_patterns',
    'celestial_music_theory',
    'universal_resonance_hypothesis',
    'reality_fabric_vibrations',
    'dimensional_frequency_differences',
    'timeline_harmonic_signatures',
    'probability_wave_harmonics',
    'quantum_vibration_theory',
    'particle_wave_frequency_duality',
    'atomic_resonance_frequencies',
    'molecular_harmonic_structures',
    'crystal_lattice_vibrations',
    'living_tissue_resonances',
    'consciousness_frequency_theory',
    'thought_vibration_patterns',
    'emotional_frequency_signatures',
    'intention_resonance_alignment',
    'reality_tuning_fork_theory',
    'sympathetic_universe_hypothesis',
    'reality_can_be_sung_theory',
    'creation_through_vibration',
    'vibrational_cosmology',
    'harmonic_creation_myths',
    'word_as_vibration_power',
    'true_names_as_frequencies',
    'reality_frequency_mapping',
    'harmonic_reality_manipulation',
    'singing_reality_into_form',
    'vibrational_transmutation',
    'master_reality_frequency_theory'
  ],

  unlocks: [
    {
      technologyId: 'reality_perception',
      papersRequired: 12,
      mandatoryPapers: ['reality_vibration_theory', 'fundamental_frequency_of_existence', 'cosmic_harmony_observation'],
      grants: [
        { type: 'building', buildingId: 'cosmic_observatory' },
        { type: 'ability', abilityId: 'hear_reality_frequencies' }
      ]
    },
    {
      technologyId: 'dimensional_frequency_sense',
      papersRequired: 22,
      mandatoryPapers: ['dimensional_frequency_differences', 'timeline_harmonic_signatures', 'reality_frequency_mapping'],
      grants: [
        { type: 'ability', abilityId: 'perceive_dimensional_harmonics' }
      ]
    },
    {
      technologyId: 'reality_singing',
      papersRequired: 28,
      mandatoryPapers: ['reality_can_be_sung_theory', 'harmonic_reality_manipulation', 'master_reality_frequency_theory'],
      grants: [
        { type: 'ability', abilityId: 'sing_reality_changes' }
      ]
    }
  ]
};

/**
 * Tier 4: Advanced Song Magic (34 papers)
 *
 * Master-level harmonic manipulation and reality-shaping song.
 */
export const ADVANCED_SONG_MAGIC_SET: ResearchSet = {
  setId: 'advanced_song_magic',
  name: 'Songs of Power',
  description: 'Craft and perform songs that reshape the fundamental nature of reality',
  field: 'song_magic',

  allPapers: [
    'song_composition_theory',
    'magical_melody_construction',
    'power_word_integration',
    'harmonic_spell_songs',
    'layered_song_magic',
    'polyphonic_reality_manipulation',
    'song_improvisation_mastery',
    'spontaneous_song_magic',
    'adaptive_harmonic_response',
    'counter_song_techniques',
    'harmonic_battle_tactics',
    'song_duel_theory',
    'group_song_amplification',
    'choral_power_multiplication',
    'synchronized_group_singing',
    'harmonic_convergence_rituals',
    'mass_song_magic',
    'bardic_tradition_mastery',
    'epic_song_construction',
    'legendary_ballad_power',
    'song_of_making_theory',
    'creation_songs',
    'song_of_unmaking',
    'destruction_ballads',
    'song_of_binding',
    'song_of_liberation',
    'transformation_songs',
    'shapeshifting_melodies',
    'healing_symphony_composition',
    'resurrection_requiem_theory',
    'time_dilation_songs',
    'temporal_harmonics_manipulation',
    'eternal_song_theory',
    'ultimate_song_magic_mastery'
  ],

  unlocks: [
    {
      technologyId: 'song_composition',
      papersRequired: 12,
      mandatoryPapers: ['song_composition_theory', 'magical_melody_construction', 'harmonic_spell_songs'],
      grants: [
        { type: 'building', buildingId: 'song_composition_hall' },
        { type: 'ability', abilityId: 'compose_power_songs' }
      ]
    },
    {
      technologyId: 'advanced_song_magic',
      papersRequired: 22,
      mandatoryPapers: ['song_of_making_theory', 'transformation_songs', 'temporal_harmonics_manipulation'],
      grants: [
        { type: 'ability', abilityId: 'reality_shaping_songs' }
      ]
    },
    {
      technologyId: 'master_bard',
      papersRequired: 28,
      mandatoryPapers: ['eternal_song_theory', 'ultimate_song_magic_mastery', 'resurrection_requiem_theory'],
      grants: [
        { type: 'ability', abilityId: 'master_song_magic' }
      ]
    }
  ]
};

/**
 * Tier 5: Dimensional Harmonics (16 papers)
 *
 * Navigate timelines by singing reality into different harmonic frequencies.
 * FINAL TIER - Unlocks harmonic dimensional travel.
 */
export const SONG_HARMONIC_TRAVEL_SET: ResearchSet = {
  setId: 'song_harmonic_travel',
  name: 'Harmonic Resonance Navigation',
  description: 'Navigate timelines by singing reality into different harmonic frequencies',
  field: 'song_magic',

  allPapers: [
    // Musical fundamentals
    'cosmic_harmony_theory',
    'dimensional_frequencies',
    'reality_resonance',
    'music_of_spheres',
    'harmonic_convergence',
    // Dimensional singing
    'portal_songs',
    'frequency_shift_vocals',
    'harmonic_anchor_melodies',
    'dimensional_tuning',
    'resonance_navigation',
    // β-space harmonics
    'timeline_frequencies',
    'beta_space_harmonic_map',
    'emotional_tone_correspondence',
    'narrative_rhythm_theory',
    'song_quantum_coupling',
    'harmonic_fleet_construction'
  ],

  unlocks: [
    {
      technologyId: 'harmonic_awareness',
      papersRequired: 5, // Need 5 of 16
      mandatoryPapers: ['cosmic_harmony_theory', 'dimensional_frequencies'],
      grants: [
        { type: 'building', buildingId: 'harmonic_chamber' },
        { type: 'ability', abilityId: 'perceive_dimensional_frequencies' }
      ]
    },
    {
      technologyId: 'dimensional_singing',
      papersRequired: 9, // Need 9 of 16
      mandatoryPapers: ['portal_songs', 'frequency_shift_vocals', 'harmonic_anchor_melodies'],
      grants: [
        { type: 'ability', abilityId: 'sing_dimensional_portals' },
        { type: 'building', buildingId: 'song_ship' } // Musical β-space ship
      ]
    },
    {
      technologyId: 'harmonic_beta_navigation',
      papersRequired: 13, // Need 13 of 16
      mandatoryPapers: ['beta_space_harmonic_map', 'timeline_frequencies', 'song_quantum_coupling'],
      grants: [
        { type: 'ability', abilityId: 'harmonic_beta_navigation' },
        { type: 'ability', abilityId: 'sing_timeline_resonance' }
      ]
    }
  ]
};

// ============================================================================
// REALISTIC PATHS: ~170 papers each
// ============================================================================

// ========================================
// DIVINE MAGIC PATH (~170 papers total)
// ========================================

/**
 * Tier 1: Basic Theology (30 papers)
 *
 * Foundation of religious understanding and divine theory.
 */
export const BASIC_THEOLOGY_SET: ResearchSet = {
  setId: 'basic_theology',
  name: 'Foundational Divine Studies',
  description: 'Study the nature of gods, divinity, and the path to apotheosis',
  field: 'divine_magic',

  allPapers: [
    'divine_existence_theory',
    'nature_of_godhood',
    'pantheon_hierarchies_study',
    'monotheism_vs_polytheism',
    'god_mortal_relationship_theory',
    'divine_intervention_patterns',
    'prayer_mechanics_fundamentals',
    'worship_energy_theory',
    'faith_power_correlation',
    'devotion_measurement_study',
    'divine_attention_mechanics',
    'god_consciousness_theory',
    'divine_omniscience_limits',
    'divine_omnipotence_paradoxes',
    'divine_benevolence_theory',
    'god_morality_independence',
    'divine_commandments_study',
    'religious_law_foundations',
    'sacred_text_interpretation',
    'divine_revelation_theory',
    'prophet_selection_criteria',
    'miracle_authentication_methods',
    'divine_sign_interpretation',
    'apotheosis_historical_cases',
    'mortal_to_god_transition_theory',
    'divine_spark_hypothesis',
    'inherent_vs_granted_divinity',
    'demigod_nature_study',
    'divine_bloodline_theory',
    'theological_education_methods'
  ],

  unlocks: [
    {
      technologyId: 'divine_theory',
      papersRequired: 10,
      mandatoryPapers: ['divine_existence_theory', 'nature_of_godhood', 'worship_energy_theory'],
      grants: [
        { type: 'building', buildingId: 'theology_academy' },
        { type: 'ability', abilityId: 'understand_divine_nature' }
      ]
    },
    {
      technologyId: 'apotheosis_awareness',
      papersRequired: 20,
      mandatoryPapers: ['apotheosis_historical_cases', 'divine_spark_hypothesis', 'mortal_to_god_transition_theory'],
      grants: [
        { type: 'ability', abilityId: 'perceive_path_to_divinity' }
      ]
    }
  ]
};

/**
 * Tier 2: Worship & Faith Mechanics (35 papers)
 *
 * Understanding how worship power flows to divinity.
 */
export const WORSHIP_FAITH_MECHANICS_SET: ResearchSet = {
  setId: 'worship_faith_mechanics',
  name: 'The Mechanics of Faith',
  description: 'Master the systems by which mortal worship empowers the divine',
  field: 'divine_magic',

  allPapers: [
    'worship_power_generation',
    'prayer_energy_conversion',
    'faith_battery_theory',
    'devotional_energy_storage',
    'worship_frequency_optimization',
    'ritual_power_amplification',
    'mass_worship_multiplication',
    'congregation_size_effects',
    'quality_vs_quantity_worship',
    'true_faith_vs_performative_worship',
    'fear_based_worship_efficacy',
    'love_based_worship_purity',
    'worship_motivation_spectrum',
    'sacrifice_power_theory',
    'blood_sacrifice_mechanics',
    'material_offering_value',
    'time_sacrifice_devotion',
    'self_sacrifice_ultimate_gift',
    'martyr_worship_amplification',
    'saint_veneration_power',
    'relic_worship_focus',
    'shrine_power_concentration',
    'temple_worship_architecture',
    'sacred_geometry_application',
    'divine_symbol_power',
    'icon_veneration_effects',
    'statue_animation_theory',
    'pilgrimage_devotion_journeys',
    'holy_site_power_accumulation',
    'ley_line_temple_placement',
    'worship_network_theory',
    'inter_temple_faith_linking',
    'pantheon_worship_distribution',
    'dominant_vs_minor_deity_power',
    'worship_power_application'
  ],

  unlocks: [
    {
      technologyId: 'basic_worship_infrastructure',
      papersRequired: 12,
      mandatoryPapers: ['worship_power_generation', 'temple_worship_architecture', 'ritual_power_amplification'],
      grants: [
        { type: 'building', buildingId: 'grand_temple' },
        { type: 'ability', abilityId: 'channel_worship_power' }
      ]
    },
    {
      technologyId: 'advanced_faith_systems',
      papersRequired: 22,
      mandatoryPapers: ['worship_network_theory', 'holy_site_power_accumulation', 'sacrifice_power_theory'],
      grants: [
        { type: 'ability', abilityId: 'optimize_worship_collection' },
        { type: 'building', buildingId: 'worship_network_nexus' }
      ]
    },
    {
      technologyId: 'master_faith_channeling',
      papersRequired: 28,
      mandatoryPapers: ['worship_power_application', 'pantheon_worship_distribution', 'martyr_worship_amplification'],
      grants: [
        { type: 'ability', abilityId: 'maximize_worship_efficiency' }
      ]
    }
  ]
};

/**
 * Tier 3: Divine Power Cultivation (40 papers)
 *
 * Accumulating and wielding divine power.
 */
export const DIVINE_POWER_CULTIVATION_SET: ResearchSet = {
  setId: 'divine_power_cultivation',
  name: 'Cultivation of Divine Might',
  description: 'Gather and wield the power of accumulated worship',
  field: 'divine_magic',

  allPapers: [
    'divine_power_storage_theory',
    'godhood_battery_creation',
    'worship_to_power_conversion',
    'divine_energy_density',
    'power_threshold_requirements',
    'lesser_divinity_attainment',
    'demigod_power_levels',
    'minor_god_capabilities',
    'major_god_power_scale',
    'supreme_deity_theoretical_limits',
    'divine_power_manifestation',
    'miracle_working_theory',
    'prayer_answering_mechanics',
    'divine_intervention_costs',
    'direct_vs_indirect_intervention',
    'mortal_agency_preservation',
    'free_will_vs_divine_plan',
    'divine_guidance_subtlety',
    'omen_sending_techniques',
    'dream_visitation_methods',
    'prophet_communication_channels',
    'avatar_creation_theory',
    'divine_manifestation_risks',
    'mortal_form_limitations',
    'divine_essence_dilution',
    'avatar_destruction_consequences',
    'divine_champion_selection',
    'blessing_granting_theory',
    'curse_infliction_methods',
    'divine_judgment_mechanics',
    'smiting_energy_requirements',
    'mass_blessing_techniques',
    'plague_and_famine_control',
    'weather_manipulation_divinity',
    'natural_disaster_direction',
    'life_and_death_authority',
    'resurrection_power_costs',
    'immortality_granting_theory',
    'divine_power_combat_applications',
    'god_vs_god_conflict_theory'
  ],

  unlocks: [
    {
      technologyId: 'divine_power_accumulation',
      papersRequired: 14,
      mandatoryPapers: ['divine_power_storage_theory', 'worship_to_power_conversion', 'power_threshold_requirements'],
      grants: [
        { type: 'building', buildingId: 'divine_power_reservoir' },
        { type: 'ability', abilityId: 'accumulate_divine_power' }
      ]
    },
    {
      technologyId: 'miracle_working',
      papersRequired: 24,
      mandatoryPapers: ['miracle_working_theory', 'prayer_answering_mechanics', 'divine_intervention_costs'],
      grants: [
        { type: 'ability', abilityId: 'perform_minor_miracles' },
        { type: 'ability', abilityId: 'answer_prayers' }
      ]
    },
    {
      technologyId: 'divine_manifestation',
      papersRequired: 32,
      mandatoryPapers: ['avatar_creation_theory', 'divine_champion_selection', 'blessing_granting_theory'],
      grants: [
        { type: 'ability', abilityId: 'create_divine_avatar' },
        { type: 'ability', abilityId: 'grant_divine_blessings' }
      ]
    }
  ]
};

/**
 * Tier 4: Path to Apotheosis (40 papers)
 *
 * The dangerous journey from mortal to divine.
 */
export const PATH_TO_APOTHEOSIS_SET: ResearchSet = {
  setId: 'path_to_apotheosis',
  name: 'The Road to Godhood',
  description: 'Undertake the perilous transformation from mortal to deity',
  field: 'divine_magic',

  allPapers: [
    'apotheosis_ritual_design',
    'divine_ascension_requirements',
    'worship_threshold_for_godhood',
    'follower_minimum_calculation',
    'faith_intensity_requirements',
    'divine_spark_ignition',
    'mortal_limits_transcendence',
    'physical_form_shedding',
    'consciousness_expansion_to_divinity',
    'omnipresence_attainment_theory',
    'omniscience_limitations_acceptance',
    'divine_perception_adjustment',
    'time_perception_expansion',
    'mortal_concerns_transcendence',
    'divine_detachment_dangers',
    'humanity_retention_theory',
    'compassion_preservation_methods',
    'divine_madness_prevention',
    'power_corruption_resistance',
    'absolute_power_psychology',
    'divine_responsibility_ethics',
    'worshipper_care_obligations',
    'divine_domain_selection',
    'portfolio_specialization_theory',
    'aspect_vs_universal_divinity',
    'domain_power_concentration',
    'competing_deity_politics',
    'pantheon_integration_strategies',
    'elder_god_recognition_seeking',
    'divine_hierarchy_navigation',
    'godhood_sustainability_theory',
    'worship_maintenance_requirements',
    'faith_loss_consequences',
    'divine_power_degradation',
    'forgotten_god_fate',
    'divine_death_possibility',
    'god_killing_theoretical_methods',
    'divine_immortality_limitations',
    'ascension_point_of_no_return',
    'final_apotheosis_transformation'
  ],

  unlocks: [
    {
      technologyId: 'apotheosis_preparation',
      papersRequired: 14,
      mandatoryPapers: ['apotheosis_ritual_design', 'divine_ascension_requirements', 'worship_threshold_for_godhood'],
      grants: [
        { type: 'building', buildingId: 'apotheosis_chamber' },
        { type: 'ability', abilityId: 'prepare_divine_ascension' }
      ]
    },
    {
      technologyId: 'divine_transformation',
      papersRequired: 24,
      mandatoryPapers: ['divine_spark_ignition', 'consciousness_expansion_to_divinity', 'mortal_limits_transcendence'],
      grants: [
        { type: 'ability', abilityId: 'begin_apotheosis_transformation' }
      ]
    },
    {
      technologyId: 'godhood_stability',
      papersRequired: 32,
      mandatoryPapers: ['godhood_sustainability_theory', 'divine_domain_selection', 'pantheon_integration_strategies'],
      grants: [
        { type: 'ability', abilityId: 'stabilize_divine_form' },
        { type: 'ability', abilityId: 'maintain_godhood' }
      ]
    }
  ]
};

/**
 * Tier 5: Divine Dimensional Travel (25 papers)
 *
 * Use divine powers for multiverse navigation.
 * FINAL TIER - Unlocks divine dimensional travel.
 */
export const DIVINE_ASCENSION_TRAVEL_SET: ResearchSet = {
  setId: 'divine_ascension_travel',
  name: 'Divine Ascension and Celestial Navigation',
  description: 'Transcend mortality to navigate the multiverse as a divine entity',
  field: 'divine_magic',

  allPapers: [
    // Path to divinity (expanded from original 17 papers to 25)
    'apotheosis_completion_final_stage',
    'full_divine_consciousness',
    'divine_spark_cultivation',
    'worship_power_mechanics',
    'faith_energy_collection',
    'divine_ascension_rituals',
    // Divine powers for travel
    'omnipresence_fundamentals',
    'divine_perception',
    'celestial_navigation',
    'prayer_based_teleportation',
    'divine_will_manifestation',
    // Multiverse divinity
    'cross_timeline_worship',
    'divine_multiverse_awareness',
    'pantheon_dimensional_politics',
    'divine_beta_space_correspondence',
    'faith_quantum_coupling',
    'divine_realm_creation',
    'personal_heaven_construction',
    'divine_plane_anchoring',
    'celestial_pathway_mapping',
    'divine_portal_creation',
    'god_form_timeline_navigation',
    'divine_omnipresence_timeline_extension',
    'faith_anchor_multiverse_travel',
    'ultimate_divine_navigation'
  ],

  unlocks: [
    {
      technologyId: 'divine_omnipresence',
      papersRequired: 8,
      mandatoryPapers: ['apotheosis_completion_final_stage', 'full_divine_consciousness', 'omnipresence_fundamentals'],
      grants: [
        { type: 'building', buildingId: 'divine_throne' },
        { type: 'ability', abilityId: 'achieve_omnipresence' }
      ]
    },
    {
      technologyId: 'divine_realm_mastery',
      papersRequired: 15,
      mandatoryPapers: ['divine_realm_creation', 'personal_heaven_construction', 'divine_plane_anchoring'],
      grants: [
        { type: 'building', buildingId: 'divine_realm' },
        { type: 'ability', abilityId: 'create_divine_planes' }
      ]
    },
    {
      technologyId: 'divine_multiverse_navigation',
      papersRequired: 20,
      mandatoryPapers: ['divine_multiverse_awareness', 'faith_quantum_coupling', 'ultimate_divine_navigation'],
      grants: [
        { type: 'ability', abilityId: 'divine_beta_navigation' },
        { type: 'ability', abilityId: 'navigate_as_god' },
        { type: 'building', buildingId: 'divine_chariot_ship' }
      ]
    }
  ]
};

// ========================================
// ACADEMIC MAGIC PATH (~170 papers total)
// ========================================

/**
 * Tier 1: Basic Magical Theory (30 papers)
 *
 * Foundational understanding of magic as a science.
 */
export const BASIC_MAGICAL_THEORY_SET: ResearchSet = {
  setId: 'basic_magical_theory',
  name: 'Foundational Arcane Studies',
  description: 'Study magic through rigorous academic methodology',
  field: 'academic_magic',

  allPapers: [
    'magic_existence_verification',
    'supernatural_phenomenon_cataloging',
    'magical_vs_natural_distinction',
    'arcane_energy_detection',
    'mana_particle_theory',
    'thaumic_field_hypothesis',
    'magical_force_measurement',
    'spell_effect_documentation',
    'reproducible_magic_experiments',
    'magical_scientific_method',
    'arcane_hypothesis_testing',
    'magical_peer_review_standards',
    'spell_notation_systems',
    'magical_equation_basics',
    'thaumic_mathematics_introduction',
    'spell_component_analysis',
    'verbal_component_linguistics',
    'somatic_gesture_mechanics',
    'material_component_chemistry',
    'focus_object_theory',
    'wand_theory_fundamentals',
    'staff_amplification_mechanics',
    'magical_tool_construction',
    'spell_learning_pedagogy',
    'magical_education_methods',
    'apprenticeship_vs_academy',
    'standardized_magical_testing',
    'magical_certification_theory',
    'ethical_magic_use_philosophy',
    'magical_research_methodology'
  ],

  unlocks: [
    {
      technologyId: 'magical_literacy',
      papersRequired: 10,
      mandatoryPapers: ['magic_existence_verification', 'arcane_energy_detection', 'magical_scientific_method'],
      grants: [
        { type: 'building', buildingId: 'magical_academy' },
        { type: 'ability', abilityId: 'study_magic_academically' }
      ]
    },
    {
      technologyId: 'basic_spell_theory',
      papersRequired: 20,
      mandatoryPapers: ['spell_component_analysis', 'spell_notation_systems', 'thaumic_mathematics_introduction'],
      grants: [
        { type: 'ability', abilityId: 'understand_spell_structure' }
      ]
    }
  ]
};

/**
 * Tier 2: Spell Mathematics (35 papers)
 *
 * Advanced mathematical modeling of magical effects.
 */
export const SPELL_MATHEMATICS_SET: ResearchSet = {
  setId: 'spell_mathematics',
  name: 'The Mathematics of Magic',
  description: 'Model magical phenomena using advanced mathematics',
  field: 'academic_magic',

  allPapers: [
    'thaumic_calculus_fundamentals',
    'arcane_differential_equations',
    'spell_topology_theory',
    'magical_field_equations',
    'mana_flow_dynamics',
    'energy_conservation_in_magic',
    'thermodynamics_of_spellcasting',
    'entropy_and_magic_relationship',
    'magical_efficiency_calculations',
    'spell_power_scaling_laws',
    'area_of_effect_geometry',
    'duration_time_equations',
    'range_distance_formulas',
    'resistance_penetration_mathematics',
    'spell_interference_patterns',
    'constructive_spell_interference',
    'destructive_spell_interference',
    'spell_harmonics_theory',
    'magical_resonance_frequencies',
    'anti_magic_field_mathematics',
    'spell_reflection_geometry',
    'magical_absorption_rates',
    'mana_regeneration_curves',
    'casting_time_optimization',
    'simultaneous_casting_theory',
    'spell_sequence_chaining',
    'metamagic_mathematical_models',
    'spell_modification_equations',
    'power_word_mathematics',
    'true_name_magical_algebra',
    'sympathetic_magic_correlation',
    'contagion_magic_propagation',
    'ritual_magic_amplification_math',
    'group_casting_multiplication',
    'spell_failure_probability_theory'
  ],

  unlocks: [
    {
      technologyId: 'mathematical_spellcraft',
      papersRequired: 12,
      mandatoryPapers: ['thaumic_calculus_fundamentals', 'magical_field_equations', 'mana_flow_dynamics'],
      grants: [
        { type: 'building', buildingId: 'thaumic_laboratory' },
        { type: 'ability', abilityId: 'calculate_spell_effects' }
      ]
    },
    {
      technologyId: 'spell_optimization',
      papersRequired: 22,
      mandatoryPapers: ['spell_power_scaling_laws', 'magical_efficiency_calculations', 'metamagic_mathematical_models'],
      grants: [
        { type: 'ability', abilityId: 'optimize_spell_formulas' }
      ]
    },
    {
      technologyId: 'advanced_spell_mathematics',
      papersRequired: 28,
      mandatoryPapers: ['spell_interference_patterns', 'ritual_magic_amplification_math', 'spell_failure_probability_theory'],
      grants: [
        { type: 'ability', abilityId: 'master_spell_mathematics' }
      ]
    }
  ]
};

/**
 * Tier 3: Advanced Magical Physics (40 papers)
 *
 * Deep theoretical understanding of reality manipulation.
 */
export const ADVANCED_MAGICAL_PHYSICS_SET: ResearchSet = {
  setId: 'advanced_magical_physics',
  name: 'Arcane Physics Theory',
  description: 'Understand the fundamental physics underlying magical reality manipulation',
  field: 'academic_magic',

  allPapers: [
    'magical_particle_physics',
    'mana_quanta_theory',
    'thaumic_wave_particle_duality',
    'arcane_uncertainty_principle',
    'magical_entanglement',
    'spell_superposition_states',
    'wavefunction_collapse_in_magic',
    'quantum_magic_observer_effects',
    'magical_field_theory_advanced',
    'unified_magical_force_theory',
    'elemental_force_unification',
    'arcane_standard_model',
    'magical_symmetry_principles',
    'conservation_laws_in_magic',
    'magical_relativity_theory',
    'time_dilation_in_slow_time_spells',
    'space_contortion_in_teleportation',
    'pocket_dimension_physics',
    'bag_of_holding_spatial_mathematics',
    'extra_dimensional_storage_theory',
    'plane_shift_mechanics',
    'dimensional_barrier_structure',
    'planar_boundary_permeability',
    'astral_projection_physics',
    'ethereal_plane_interaction',
    'shadow_plane_mechanics',
    'elemental_plane_physics',
    'plane_of_fire_thermodynamics',
    'plane_of_water_fluid_dynamics',
    'positive_negative_energy_planes',
    'life_death_energy_theory',
    'necromancy_energy_physics',
    'healing_magic_biology_physics',
    'transmutation_atomic_rearrangement',
    'polymorph_mass_energy_conversion',
    'illusion_light_manipulation_physics',
    'enchantment_neural_magic_interface',
    'divination_information_theory',
    'scrying_remote_viewing_physics',
    'temporal_magic_time_physics'
  ],

  unlocks: [
    {
      technologyId: 'arcane_physics',
      papersRequired: 14,
      mandatoryPapers: ['magical_particle_physics', 'unified_magical_force_theory', 'magical_field_theory_advanced'],
      grants: [
        { type: 'building', buildingId: 'arcane_physics_institute' },
        { type: 'ability', abilityId: 'understand_magical_physics' }
      ]
    },
    {
      technologyId: 'dimensional_magic_theory',
      papersRequired: 24,
      mandatoryPapers: ['pocket_dimension_physics', 'plane_shift_mechanics', 'dimensional_barrier_structure'],
      grants: [
        { type: 'ability', abilityId: 'theoretical_dimensional_magic' }
      ]
    },
    {
      technologyId: 'unified_arcane_theory',
      papersRequired: 32,
      mandatoryPapers: ['arcane_standard_model', 'temporal_magic_time_physics', 'transmutation_atomic_rearrangement'],
      grants: [
        { type: 'ability', abilityId: 'master_arcane_physics' }
      ]
    }
  ]
};

/**
 * Tier 4: Reality Theory Mastery (45 papers)
 *
 * Ultimate theoretical understanding of reality manipulation.
 */
export const REALITY_THEORY_MASTERY_SET: ResearchSet = {
  setId: 'reality_theory_mastery',
  name: 'Reality Manipulation Theory',
  description: 'Master the theoretical foundations of reality-altering magic',
  field: 'academic_magic',

  allPapers: [
    'reality_fabric_structure_theory',
    'fundamental_reality_constants',
    'natural_law_modification_theory',
    'physics_override_spells',
    'gravity_manipulation_theory',
    'time_manipulation_theoretical_limits',
    'temporal_paradox_mathematics',
    'time_travel_spell_design',
    'causality_loop_prevention',
    'timeline_branching_theory',
    'alternate_reality_creation',
    'wish_spell_reality_alteration',
    'miracle_vs_wish_distinction',
    'reality_warping_energy_costs',
    'universal_constants_manipulation',
    'fine_structure_constant_alteration',
    'speed_of_light_modification_spells',
    'planck_constant_warping',
    'local_vs_universal_reality_changes',
    'reality_bubble_theory',
    'demiplane_creation_mathematics',
    'custom_physics_pocket_universe',
    'genesis_spell_world_creation',
    'artificial_universe_construction',
    'simulated_reality_magic',
    'reality_is_information_theory',
    'magical_matrix_hypothesis',
    'consciousness_creates_reality_magic',
    'observer_creates_universe_spells',
    'collective_unconscious_reality_shaping',
    'archetypal_magic_theory',
    'platonic_ideal_manifestation',
    'concept_into_reality_spells',
    'abstract_idea_materialization',
    'mathematical_truth_spell_enforcement',
    'logical_necessity_reality_binding',
    'impossible_made_possible_theory',
    'paradox_stabilization_mathematics',
    'contradiction_containment_spells',
    'reality_syntax_error_correction',
    'existence_debugging_theory',
    'reality_version_control',
    'universe_state_saving_loading',
    'reality_forking_and_merging',
    'ultimate_reality_manipulation_theory'
  ],

  unlocks: [
    {
      technologyId: 'reality_warping_theory',
      papersRequired: 16,
      mandatoryPapers: ['reality_fabric_structure_theory', 'natural_law_modification_theory', 'wish_spell_reality_alteration'],
      grants: [
        { type: 'building', buildingId: 'reality_research_institute' },
        { type: 'ability', abilityId: 'theoretical_reality_warping' }
      ]
    },
    {
      technologyId: 'demiplane_theory',
      papersRequired: 28,
      mandatoryPapers: ['demiplane_creation_mathematics', 'genesis_spell_world_creation', 'custom_physics_pocket_universe'],
      grants: [
        { type: 'ability', abilityId: 'design_custom_realities' }
      ]
    },
    {
      technologyId: 'ultimate_reality_theory',
      papersRequired: 36,
      mandatoryPapers: ['reality_is_information_theory', 'paradox_stabilization_mathematics', 'ultimate_reality_manipulation_theory'],
      grants: [
        { type: 'ability', abilityId: 'master_reality_theory' }
      ]
    }
  ]
};

/**
 * Tier 5: Academic β-Space Navigation (20 papers)
 *
 * Apply rigorous magical theory to dimensional travel.
 * FINAL TIER - Unlocks academic dimensional travel.
 */
export const ACADEMIC_REALITY_THEORY_SET: ResearchSet = {
  setId: 'academic_reality_theory',
  name: 'Academic Reality Manipulation Theory',
  description: 'Navigate dimensions via rigorous magical theory and spell mathematics',
  field: 'academic_magic',

  allPapers: [
    // Magical foundations
    'fundamental_spell_theory',
    'thaumic_field_equations',
    'magical_conservation_laws',
    'spell_component_analysis',
    'mana_flow_dynamics',
    // Advanced theory
    'dimensional_magic_mathematics',
    'portal_spell_derivation',
    'spatial_folding_theorems',
    'teleportation_paradox_resolution',
    'anchor_point_stability_proofs',
    // Reality warping
    'reality_manipulation_limits',
    'causality_preservation_constraints',
    'timeline_coherence_mathematics',
    'multiverse_spell_compatibility',
    // β-space academic approach
    'magical_beta_space_model',
    'spell_based_quantum_coupling',
    'theoretical_timeline_navigation',
    'academic_observer_coupling',
    'magical_crew_coherence_theory',
    'theoretical_magic_ship_design'
  ],

  unlocks: [
    {
      technologyId: 'advanced_spell_theory',
      papersRequired: 6, // Need 6 of 20
      mandatoryPapers: ['fundamental_spell_theory', 'thaumic_field_equations', 'dimensional_magic_mathematics'],
      grants: [
        { type: 'building', buildingId: 'magical_research_university' },
        { type: 'ability', abilityId: 'theoretical_spell_design' }
      ]
    },
    {
      technologyId: 'reality_warping_mastery',
      papersRequired: 12, // Need 12 of 20
      mandatoryPapers: [
        'portal_spell_derivation',
        'spatial_folding_theorems',
        'reality_manipulation_limits',
        'causality_preservation_constraints'
      ],
      grants: [
        { type: 'ability', abilityId: 'warp_local_reality' },
        { type: 'building', buildingId: 'theoretical_magic_ship' } // Academic approach to β-space ship
      ]
    },
    {
      technologyId: 'academic_beta_navigation',
      papersRequired: 17, // Need 17 of 20 - very rigorous!
      mandatoryPapers: [
        'magical_beta_space_model',
        'spell_based_quantum_coupling',
        'theoretical_timeline_navigation',
        'academic_observer_coupling'
      ],
      grants: [
        { type: 'ability', abilityId: 'academic_beta_navigation' },
        { type: 'ability', abilityId: 'magical_timeline_calculation' }
      ]
    }
  ]
};

// ============================================================================
// ALL RESEARCH SETS
// ============================================================================

export const ALL_RESEARCH_SETS: ResearchSet[] = [
  BASIC_AGRICULTURE_SET,
  BASIC_METALLURGY_SET,
  ADVANCED_METALLURGY_SET,
  BASIC_ALCHEMY_SET,
  ADVANCED_ALCHEMY_SET,
  RUNE_MAGIC_SET,
  // Foundational Sciences (Prerequisites for Clarke Tech)
  BASIC_PHYSICS_SET,
  MATHEMATICS_FUNDAMENTALS_SET,
  ADVANCED_PHYSICS_SET,
  ADVANCED_MATHEMATICS_SET,
  // AI/ML & Neural Interfaces (Prerequisites for brainships and consciousness upload)
  ARTIFICIAL_INTELLIGENCE_SET,
  NEURAL_INTERFACES_SET,
  EXOTIC_PHYSICS_SET,
  // Rainbow Mars / β-space navigation (requires foundational sciences)
  QUANTUM_OBSERVATION_SET,
  BETA_SPACE_FUNDAMENTALS_SET,
  CREW_COHERENCE_SET,
  RAINBOW_PLANET_SET,
  TEMPORAL_ARCHAEOLOGY_SET,
  TIMELINE_ENGINEERING_SET,
  DIGITAL_CONSCIOUSNESS_SET,
  // TECH TREE EXPANSION - 500-PAPER TREE (305 new papers)
  // Engineering, power generation, manufacturing, computing, space, entertainment, etc.
  ...TECH_EXPANSION_RESEARCH_SETS,
  // MAGIC PATHS TO β-SPACE
  // Absurd path (101 papers) - speedrun route
  BASIC_NARRATIVE_MAGIC_SET,
  BASIC_WILD_MAGIC_SET,
  ADVANCED_NARRATIVE_MECHANICS_SET,
  ADVANCED_CHAOS_THEORY_SET,
  NARRATIVE_PLOT_HOLE_EXPLOITATION_SET,
  WILD_CHAOS_BETA_NAVIGATION_SET,
  // Neutral paths (140 papers each)
  // Daemon magic
  BASIC_DAEMON_THEORY_SET,
  DAEMON_SEPARATION_TRAINING_SET,
  DUST_NAVIGATION_FUNDAMENTALS_SET,
  SUBTLE_KNIFE_MASTERY_SET,
  DAEMON_DUST_NAVIGATION_SET,
  // Rune magic
  BASIC_RUNE_THEORY_SET,
  RUNE_CARVING_MASTERY_SET,
  ADVANCED_RUNIC_ARRAYS_SET,
  DIMENSIONAL_RUNE_THEORY_SET,
  RUNE_DIMENSIONAL_GATES_SET,
  // Pact magic
  BASIC_DEMONOLOGY_SET,
  SUMMONING_BINDING_SET,
  CONTRACT_THEORY_SET,
  ADVANCED_PACT_NEGOTIATION_SET,
  PACT_DIMENSIONAL_TRAVEL_SET,
  // Song magic
  BASIC_MUSIC_MAGIC_SET,
  HARMONIC_MAGIC_SET,
  REALITY_RESONANCE_SET,
  ADVANCED_SONG_MAGIC_SET,
  SONG_HARMONIC_TRAVEL_SET,
  // Realistic paths (170 papers each)
  // Divine magic
  BASIC_THEOLOGY_SET,
  WORSHIP_FAITH_MECHANICS_SET,
  DIVINE_POWER_CULTIVATION_SET,
  PATH_TO_APOTHEOSIS_SET,
  DIVINE_ASCENSION_TRAVEL_SET,
  // Academic magic
  BASIC_MAGICAL_THEORY_SET,
  SPELL_MATHEMATICS_SET,
  ADVANCED_MAGICAL_PHYSICS_SET,
  REALITY_THEORY_MASTERY_SET,
  ACADEMIC_REALITY_THEORY_SET
];

/**
 * Get a research set by ID
 */
export function getResearchSet(setId: string): ResearchSet | undefined {
  return ALL_RESEARCH_SETS.find(set => set.setId === setId);
}

/**
 * Check if a technology has unlocked based on published papers
 */
export function isTechnologyUnlocked(
  technologyId: string,
  publishedPapers: Set<string>
): boolean {
  // Find all sets that can unlock this technology
  for (const set of ALL_RESEARCH_SETS) {
    for (const unlock of set.unlocks) {
      if (unlock.technologyId !== technologyId) continue;

      // Check mandatory papers first
      if (unlock.mandatoryPapers) {
        const hasAllMandatory = unlock.mandatoryPapers.every(
          paperId => publishedPapers.has(paperId)
        );
        if (!hasAllMandatory) continue;
      }

      // Count how many papers from this set have been published
      const publishedFromSet = set.allPapers.filter(
        paperId => publishedPapers.has(paperId)
      ).length;

      // Check if we've reached the threshold
      if (publishedFromSet >= unlock.papersRequired) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get all technologies that would unlock with this set of published papers
 */
export function getUnlockedTechnologies(publishedPapers: Set<string>): string[] {
  const unlocked: string[] = [];

  for (const set of ALL_RESEARCH_SETS) {
    for (const unlock of set.unlocks) {
      if (isTechnologyUnlocked(unlock.technologyId, publishedPapers)) {
        unlocked.push(unlock.technologyId);
      }
    }
  }

  return [...new Set(unlocked)]; // Deduplicate
}

/**
 * Get progress toward unlocking a technology (returns fraction 0-1)
 */
export function getTechnologyProgress(
  technologyId: string,
  publishedPapers: Set<string>
): number {
  for (const set of ALL_RESEARCH_SETS) {
    for (const unlock of set.unlocks) {
      if (unlock.technologyId !== technologyId) continue;

      const publishedFromSet = set.allPapers.filter(
        paperId => publishedPapers.has(paperId)
      ).length;

      return Math.min(1, publishedFromSet / unlock.papersRequired);
    }
  }

  return 0;
}
