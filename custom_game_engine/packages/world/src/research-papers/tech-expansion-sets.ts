/**
 * Tech Tree Expansion Research Sets
 *
 * Expands the tech tree from 196 papers to 500 papers.
 * These sets cover engineering, power generation, computing, entertainment,
 * space industry, and other practical technologies between classical physics
 * and β-space navigation.
 */

import type { ResearchSet } from './types.js';

// ============================================================================
// TIER 1: ENGINEERING BASICS (22 papers)
// Papers 39-60 in the 500-paper tree
// ============================================================================

export const ENGINEERING_BASICS_SET: ResearchSet = {
  setId: 'engineering_basics',
  name: 'Foundational Engineering',
  description: 'Materials science, structural mechanics, and design principles',
  field: 'engineering',

  allPapers: [
    'materials_science_fundamentals',
    'stress_strain_relationships',
    'structural_analysis_basics',
    'beam_theory',
    'column_buckling',
    'material_properties_testing',
    'hardness_testing_methods',
    'tensile_strength_measurement',
    'fatigue_failure_analysis',
    'fracture_mechanics_introduction',
    'design_safety_factors',
    'engineering_drawing_standards',
    'geometric_dimensioning_tolerancing',
    'manufacturing_processes_overview',
    'casting_fundamentals',
    'forging_basics',
    'machining_principles',
    'precision_measurement_tools',
    'quality_control_fundamentals',
    'standardization_in_engineering',
    'engineering_ethics',
    'failure_analysis_methodology'
  ],

  unlocks: [
    {
      technologyId: 'engineering_fundamentals',
      papersRequired: 8,
      mandatoryPapers: ['materials_science_fundamentals', 'structural_analysis_basics'],
      grants: [
        { type: 'building', buildingId: 'engineering_lab' },
        { type: 'ability', abilityId: 'engineering_design' }
      ]
    },
    {
      technologyId: 'precision_manufacturing',
      papersRequired: 15,
      mandatoryPapers: ['precision_measurement_tools', 'quality_control_fundamentals'],
      grants: [
        { type: 'building', buildingId: 'precision_workshop' },
        { type: 'ability', abilityId: 'precision_crafting' }
      ]
    }
  ]
};

// ============================================================================
// TIER 2: POWER GENERATION I - STEAM & COAL (25 papers)
// Papers 61-85
// ============================================================================

export const POWER_GENERATION_I_STEAM_SET: ResearchSet = {
  setId: 'power_generation_i_steam',
  name: 'Steam Power and Early Electrical Generation',
  description: 'From steam engines to coal-fired power plants',
  field: 'power_generation',

  allPapers: [
    'steam_engine_principles',
    'boiler_design_fundamentals',
    'pressure_vessel_safety',
    'steam_turbine_theory',
    'condensers_heat_exchangers',
    'thermodynamic_cycles_rankine',
    'efficiency_optimization_heat_engines',
    'coal_combustion_chemistry',
    'coal_power_plant_design',
    'smoke_stack_emissions_control',
    'ash_handling_systems',
    'water_treatment_boilers',
    'steam_pressure_regulation',
    'governor_systems',
    'electrical_generator_basics',
    'faraday_electromagnetic_induction',
    'ac_vs_dc_generation',
    'voltage_regulation',
    'power_transmission_basics',
    'transformer_theory_introduction',
    'electrical_grid_topology',
    'load_balancing_fundamentals',
    'power_factor_correction',
    'grid_synchronization',
    'early_electrical_safety'
  ],

  unlocks: [
    {
      technologyId: 'steam_power',
      papersRequired: 8,
      mandatoryPapers: ['steam_engine_principles', 'boiler_design_fundamentals'],
      grants: [
        { type: 'building', buildingId: 'steam_generator' },
        { type: 'ability', abilityId: 'operate_steam_power' }
      ]
    },
    {
      technologyId: 'coal_power_generation',
      papersRequired: 15,
      mandatoryPapers: ['coal_power_plant_design', 'electrical_generator_basics'],
      grants: [
        { type: 'building', buildingId: 'coal_power_plant' },
        { type: 'building', buildingId: 'power_distribution_i' }
      ]
    },
    {
      technologyId: 'electrical_grid_i',
      papersRequired: 20,
      mandatoryPapers: ['electrical_grid_topology', 'grid_synchronization'],
      grants: [
        { type: 'building', buildingId: 'electrical_grid' },
        { type: 'building', buildingId: 'power_substation' }
      ]
    }
  ]
};

// ============================================================================
// TIER 2: MANUFACTURING & AUTOMATION I (20 papers)
// Papers 86-105
// ============================================================================

export const MANUFACTURING_AUTOMATION_I_SET: ResearchSet = {
  setId: 'manufacturing_automation_i',
  name: 'Assembly Lines and Early Automation',
  description: 'From hand assembly to mechanized production',
  field: 'manufacturing',

  allPapers: [
    'assembly_line_principles',
    'work_division_specialization',
    'time_motion_studies',
    'standardized_parts_interchangeability',
    'conveyor_belt_mechanics',
    'material_handling_automation',
    'sequential_assembly_stations',
    'quality_control_sampling',
    'statistical_process_control',
    'defect_detection_methods',
    'inventory_management_basics',
    'just_in_time_production_introduction',
    'batch_vs_continuous_production',
    'production_scheduling',
    'bottleneck_analysis',
    'throughput_optimization',
    'factory_layout_optimization',
    'workflow_efficiency',
    'worker_safety_automation',
    'early_mechanical_automation'
  ],

  unlocks: [
    {
      technologyId: 'assembly_line',
      papersRequired: 6,
      mandatoryPapers: ['assembly_line_principles', 'conveyor_belt_mechanics'],
      grants: [
        { type: 'building', buildingId: 'assembly_line' },
        { type: 'item', itemId: 'conveyor_belt_i' }
      ]
    },
    {
      technologyId: 'automated_assembly_i',
      papersRequired: 12,
      mandatoryPapers: ['material_handling_automation', 'early_mechanical_automation'],
      grants: [
        { type: 'building', buildingId: 'assembly_machine_i' },
        { type: 'ability', abilityId: 'automate_production' }
      ]
    },
    {
      technologyId: 'quality_control_systems',
      papersRequired: 15,
      mandatoryPapers: ['statistical_process_control', 'defect_detection_methods'],
      grants: [
        { type: 'building', buildingId: 'quality_control_station' },
        { type: 'ability', abilityId: 'quality_inspection' }
      ]
    }
  ]
};

// ============================================================================
// TIER 3: CLIMATE CONTROL TECHNOLOGY (15 papers)
// Papers 216-230
// Integrates with needs system - satisfies "warmth" need
// ============================================================================

export const CLIMATE_CONTROL_TECHNOLOGY_SET: ResearchSet = {
  setId: 'climate_control_technology',
  name: 'HVAC and Climate Systems',
  description: 'Heating, ventilation, air conditioning, and climate control',
  field: 'climate_control',

  allPapers: [
    'thermodynamics_heating_cooling',
    'heat_pump_principles',
    'refrigeration_cycle',
    'refrigerant_chemistry',
    'compressor_design',
    'evaporator_condenser_theory',
    'air_conditioning_basics',
    'humidity_control',
    'ventilation_air_quality',
    'duct_design_airflow',
    'thermal_insulation_principles',
    'radiant_heating_systems',
    'forced_air_heating',
    'climate_zone_adaptation',
    'integrated_climate_control_systems'
  ],

  unlocks: [
    {
      technologyId: 'basic_heating',
      papersRequired: 4,
      mandatoryPapers: ['thermodynamics_heating_cooling', 'radiant_heating_systems'],
      grants: [
        { type: 'building', buildingId: 'heater' },
        { type: 'ability', abilityId: 'control_temperature' }
      ]
    },
    {
      technologyId: 'air_conditioning',
      papersRequired: 8,
      mandatoryPapers: ['refrigeration_cycle', 'air_conditioning_basics'],
      grants: [
        { type: 'building', buildingId: 'air_conditioner' },
        { type: 'ability', abilityId: 'climate_cooling' }
      ]
    },
    {
      technologyId: 'hvac_systems',
      papersRequired: 12,
      mandatoryPapers: ['integrated_climate_control_systems', 'ventilation_air_quality'],
      grants: [
        { type: 'building', buildingId: 'climate_control_center' },
        { type: 'ability', abilityId: 'full_climate_control' }
      ]
    }
  ]
};

// ============================================================================
// TIER 3: ENTERTAINMENT & CULTURE (15 papers)
// Papers 231-245
// Integrates with needs system - satisfies "beauty" and "novelty" needs
// ============================================================================

export const ENTERTAINMENT_CULTURE_I_SET: ResearchSet = {
  setId: 'entertainment_culture_i',
  name: 'Games, Stories, and Early Entertainment',
  description: 'The creation of games, novels, theater, and recreational media',
  field: 'entertainment',

  allPapers: [
    'game_design_principles',
    'rules_systems_game_theory',
    'narrative_structure_storytelling',
    'character_development_writing',
    'plot_construction_techniques',
    'dialogue_writing_craft',
    'novel_publishing_process',
    'theater_performance_theory',
    'stage_design_lighting',
    'dramatic_arts_fundamentals',
    'music_composition_basics',
    'recreational_activity_design',
    'entertainment_venue_architecture',
    'audience_psychology',
    'cultural_narrative_transmission'
  ],

  unlocks: [
    {
      technologyId: 'board_games',
      papersRequired: 3,
      mandatoryPapers: ['game_design_principles', 'rules_systems_game_theory'],
      grants: [
        { type: 'item', itemId: 'board_game' },
        { type: 'ability', abilityId: 'design_games' }
      ]
    },
    {
      technologyId: 'literary_arts',
      papersRequired: 6,
      mandatoryPapers: ['narrative_structure_storytelling', 'novel_publishing_process'],
      grants: [
        { type: 'item', itemId: 'novel' },
        { type: 'building', buildingId: 'publishing_house' },
        { type: 'ability', abilityId: 'write_novels' }
      ]
    },
    {
      technologyId: 'performing_arts',
      papersRequired: 10,
      mandatoryPapers: ['theater_performance_theory', 'entertainment_venue_architecture'],
      grants: [
        { type: 'building', buildingId: 'theater' },
        { type: 'building', buildingId: 'entertainment_center' },
        { type: 'ability', abilityId: 'organize_performances' }
      ]
    }
  ]
};

// ============================================================================
// TIER 4: COMPUTING II - DIGITAL AGE (20 papers)
// Papers 251-270
// ============================================================================

export const COMPUTING_II_DIGITAL_AGE_SET: ResearchSet = {
  setId: 'computing_ii_digital_age',
  name: 'Modern Computing and Software Engineering',
  description: 'From mainframes to personal computers and beyond',
  field: 'computing',

  allPapers: [
    'transistor_based_computing',
    'integrated_circuits',
    'microprocessor_architecture',
    'memory_hierarchy_caching',
    'operating_system_design',
    'process_scheduling_algorithms',
    'virtual_memory_management',
    'file_systems',
    'database_theory',
    'relational_database_design',
    'sql_query_languages',
    'transaction_processing',
    'programming_language_design',
    'compiler_construction',
    'software_engineering_principles',
    'version_control_systems',
    'debugging_testing_methodologies',
    'algorithm_complexity_analysis',
    'data_structures_optimization',
    'computer_graphics_fundamentals'
  ],

  unlocks: [
    {
      technologyId: 'modern_computers',
      papersRequired: 6,
      mandatoryPapers: ['microprocessor_architecture', 'operating_system_design'],
      grants: [
        { type: 'building', buildingId: 'modern_computer' },
        { type: 'ability', abilityId: 'programming' }
      ]
    },
    {
      technologyId: 'databases',
      papersRequired: 10,
      mandatoryPapers: ['database_theory', 'relational_database_design'],
      grants: [
        { type: 'building', buildingId: 'data_center' },
        { type: 'ability', abilityId: 'database_management' }
      ]
    },
    {
      technologyId: 'software_engineering',
      papersRequired: 15,
      mandatoryPapers: ['software_engineering_principles', 'version_control_systems'],
      grants: [
        { type: 'building', buildingId: 'software_development_center' },
        { type: 'ability', abilityId: 'professional_programming' }
      ]
    }
  ]
};

// ============================================================================
// TIER 5: POWER GENERATION II - NUCLEAR & FUSION (25 papers)
// Papers 311-335
// ============================================================================

export const POWER_GENERATION_II_NUCLEAR_SET: ResearchSet = {
  setId: 'power_generation_ii_nuclear',
  name: 'Nuclear Fission and Fusion Power',
  description: 'From nuclear reactors to fusion energy',
  field: 'power_generation',

  allPapers: [
    'nuclear_fission_basics',
    'chain_reaction_control',
    'neutron_moderation',
    'reactor_core_design',
    'control_rod_mechanics',
    'reactor_coolant_systems',
    'nuclear_safety_systems',
    'radiation_shielding',
    'nuclear_waste_management',
    'radioactive_decay_heat_removal',
    'pressurized_water_reactor_design',
    'boiling_water_reactor_design',
    'breeder_reactor_theory',
    'nuclear_fuel_cycle',
    'plasma_physics_basics',
    'fusion_reaction_fundamentals',
    'magnetic_confinement_theory',
    'tokamak_design_principles',
    'plasma_heating_methods',
    'fusion_energy_gain',
    'inertial_confinement_fusion',
    'fusion_reactor_materials',
    'tritium_breeding_blankets',
    'fusion_power_plant_design',
    'advanced_fusion_concepts'
  ],

  unlocks: [
    {
      technologyId: 'nuclear_fission_power',
      papersRequired: 10,
      mandatoryPapers: ['nuclear_fission_basics', 'reactor_core_design', 'nuclear_safety_systems'],
      grants: [
        { type: 'building', buildingId: 'nuclear_reactor' },
        { type: 'building', buildingId: 'nuclear_power_plant' },
        { type: 'ability', abilityId: 'operate_nuclear_power' }
      ]
    },
    {
      technologyId: 'fusion_power',
      papersRequired: 18,
      mandatoryPapers: ['fusion_reaction_fundamentals', 'tokamak_design_principles', 'fusion_power_plant_design'],
      grants: [
        { type: 'building', buildingId: 'fusion_reactor' },
        { type: 'building', buildingId: 'fusion_power_plant' },
        { type: 'ability', abilityId: 'operate_fusion_power' }
      ]
    }
  ]
};

// ============================================================================
// TIER 5: SPACE INDUSTRY I - LAUNCH & ORBIT (25 papers)
// Papers 336-360
// Includes vector clocks for satellite coordination
// ============================================================================

export const SPACE_INDUSTRY_I_LAUNCH_SET: ResearchSet = {
  setId: 'space_industry_i_launch',
  name: 'Rockets, Satellites, and Orbital Infrastructure',
  description: 'From rocket science to orbital operations with distributed time coordination',
  field: 'space_industry',

  allPapers: [
    'rocket_propulsion_fundamentals',
    'tsiolkovsky_rocket_equation',
    'multi_stage_rocket_design',
    'liquid_fuel_propulsion',
    'solid_fuel_propulsion',
    'rocket_engine_nozzle_design',
    'combustion_chamber_design',
    'fuel_oxidizer_chemistry',
    'rocket_guidance_systems',
    'inertial_navigation',
    'orbital_mechanics_basics',
    'hohmann_transfer_orbits',
    'orbital_rendezvous_techniques',
    'satellite_design_principles',
    'satellite_power_systems',
    'satellite_communication_systems',
    'satellite_attitude_control',
    'orbital_debris_mitigation',
    'space_environment_effects',
    'radiation_hardened_electronics',
    'satellite_time_synchronization',  // Foundation for vector clocks
    'distributed_time_coordination',    // Vector clocks theory
    'relativistic_time_dilation_effects',
    'space_station_life_support',
    'orbital_infrastructure_assembly'
  ],

  unlocks: [
    {
      technologyId: 'rocket_launch',
      papersRequired: 8,
      mandatoryPapers: ['rocket_propulsion_fundamentals', 'multi_stage_rocket_design'],
      grants: [
        { type: 'building', buildingId: 'rocket_launch_pad' },
        { type: 'item', itemId: 'rocket' },
        { type: 'ability', abilityId: 'launch_rockets' }
      ]
    },
    {
      technologyId: 'satellites',
      papersRequired: 15,
      mandatoryPapers: ['satellite_design_principles', 'satellite_time_synchronization', 'distributed_time_coordination'],
      grants: [
        { type: 'building', buildingId: 'satellite' },
        { type: 'building', buildingId: 'ground_control_station' },
        { type: 'ability', abilityId: 'operate_satellites' },
        { type: 'item', itemId: 'vector_clock_module' }  // Vector clocks!
      ]
    },
    {
      technologyId: 'orbital_stations',
      papersRequired: 20,
      mandatoryPapers: ['space_station_life_support', 'orbital_infrastructure_assembly'],
      grants: [
        { type: 'building', buildingId: 'orbital_station' },
        { type: 'ability', abilityId: 'construct_orbital_infrastructure' }
      ]
    }
  ]
};

// ============================================================================
// TIER 5: DISTRIBUTED SYSTEMS (20 papers)
// Papers 361-380
// Foundation for task management and eventual hive minds
// ============================================================================

export const DISTRIBUTED_SYSTEMS_SET: ResearchSet = {
  setId: 'distributed_systems',
  name: 'Distributed Computing and Coordination',
  description: 'Vector clocks, consensus algorithms, and distributed coordination - foundation for collective intelligence',
  field: 'distributed_systems',

  allPapers: [
    'distributed_system_fundamentals',
    'clock_synchronization_problem',
    'lamport_timestamps',
    'vector_clock_theory',
    'causal_ordering_events',
    'distributed_consensus_problem',
    'two_phase_commit',
    'paxos_algorithm',
    'raft_consensus_algorithm',
    'byzantine_fault_tolerance',
    'distributed_locking',
    'distributed_transactions',
    'eventual_consistency',
    'cap_theorem',
    'distributed_hash_tables',
    'gossip_protocols',
    'distributed_coordination_services',
    'leader_election_algorithms',
    'distributed_monitoring',
    'cluster_coordination'
  ],

  unlocks: [
    {
      technologyId: 'distributed_coordination',
      papersRequired: 8,
      mandatoryPapers: ['vector_clock_theory', 'distributed_consensus_problem'],
      grants: [
        { type: 'building', buildingId: 'distributed_coordination_center' },
        { type: 'ability', abilityId: 'coordinate_distributed_systems' }
      ]
    },
    {
      technologyId: 'consensus_systems',
      papersRequired: 14,
      mandatoryPapers: ['paxos_algorithm', 'raft_consensus_algorithm'],
      grants: [
        { type: 'building', buildingId: 'consensus_system' },
        { type: 'building', buildingId: 'distributed_computing_cluster' },
        { type: 'ability', abilityId: 'implement_consensus' }
      ]
    }
  ]
};

// ============================================================================
// TIER 6: MANUFACTURING & AUTOMATION II (15 papers)
// Papers 381-395
// Integrates with factory systems - unlocks advanced assembly machines and belt tiers
// ============================================================================

export const MANUFACTURING_AUTOMATION_II_SET: ResearchSet = {
  setId: 'manufacturing_automation_ii',
  name: 'Advanced Robotics and Factory Automation',
  description: 'From basic automation to fully automated production lines',
  field: 'manufacturing',

  allPapers: [
    'industrial_robotics_fundamentals',
    'robotic_arm_kinematics',
    'end_effector_design',
    'robot_programming_languages',
    'machine_vision_quality_control',
    'adaptive_manufacturing',
    'flexible_manufacturing_systems',
    'computer_integrated_manufacturing',
    'automated_material_handling_ii',
    'high_speed_conveyor_systems',
    'precision_pick_and_place',
    'automated_assembly_techniques_ii',
    'lights_out_manufacturing',
    'predictive_maintenance',
    'factory_automation_networks'
  ],

  unlocks: [
    {
      technologyId: 'advanced_assembly_ii',
      papersRequired: 6,
      mandatoryPapers: ['industrial_robotics_fundamentals', 'automated_assembly_techniques_ii'],
      grants: [
        { type: 'building', buildingId: 'assembly_machine_ii' },  // Factory integration!
        { type: 'ability', abilityId: 'advanced_automation' }
      ]
    },
    {
      technologyId: 'high_speed_production',
      papersRequired: 10,
      mandatoryPapers: ['high_speed_conveyor_systems', 'machine_vision_quality_control'],
      grants: [
        { type: 'item', itemId: 'belt_tier_2' },  // Factory integration!
        { type: 'ability', abilityId: 'high_speed_manufacturing' }
      ]
    },
    {
      technologyId: 'full_automation',
      papersRequired: 13,
      mandatoryPapers: ['lights_out_manufacturing', 'factory_automation_networks'],
      grants: [
        { type: 'building', buildingId: 'assembly_machine_iii' },  // Factory integration!
        { type: 'item', itemId: 'belt_tier_3' },  // Factory integration!
        { type: 'ability', abilityId: 'fully_automated_factory' }
      ]
    }
  ]
};

// ============================================================================
// TIER 6: VIDEO GAME INDUSTRY (15 papers)
// Papers 406-420
// Requires power generators for game studios
// Integrates with needs system - enhanced entertainment
// ============================================================================

export const VIDEO_GAME_INDUSTRY_SET: ResearchSet = {
  setId: 'video_game_industry',
  name: 'Video Games and Interactive Entertainment',
  description: 'From early video games to VR and game development companies',
  field: 'entertainment',

  allPapers: [
    'interactive_media_theory',
    'video_game_design_principles',
    'game_engine_architecture',
    'real_time_rendering',
    'game_physics_simulation',
    'procedural_content_generation',
    'artificial_intelligence_for_games',
    'multiplayer_networking',
    'game_user_interface_design',
    'virtual_reality_fundamentals',
    'vr_motion_tracking',
    'immersive_experience_design',
    'game_development_workflows',
    'game_studio_management',
    'video_game_industry_economics'
  ],

  unlocks: [
    {
      technologyId: 'video_games',
      papersRequired: 5,
      mandatoryPapers: ['video_game_design_principles', 'game_engine_architecture'],
      grants: [
        { type: 'item', itemId: 'video_game' },
        { type: 'building', buildingId: 'arcade' },
        { type: 'ability', abilityId: 'develop_games' }
      ]
    },
    {
      technologyId: 'game_development_studios',
      papersRequired: 10,
      mandatoryPapers: ['game_development_workflows', 'game_studio_management'],
      grants: [
        { type: 'building', buildingId: 'video_game_company' },  // Video game companies!
        { type: 'building', buildingId: 'game_development_studio' },
        { type: 'ability', abilityId: 'run_game_studio' }
      ]
    },
    {
      technologyId: 'virtual_reality',
      papersRequired: 13,
      mandatoryPapers: ['virtual_reality_fundamentals', 'vr_motion_tracking', 'immersive_experience_design'],
      grants: [
        { type: 'item', itemId: 'vr_headset' },
        { type: 'item', itemId: 'vr_game' },
        { type: 'ability', abilityId: 'develop_vr_experiences' }
      ]
    }
  ]
};

// ============================================================================
// TIER 6: TASK MANAGEMENT & COLLABORATION (10 papers)
// Papers 421-430
// Precursor to hive minds - enables human collective intelligence
// ============================================================================

export const TASK_MANAGEMENT_COLLABORATION_SET: ResearchSet = {
  setId: 'task_management_collaboration',
  name: 'Project Management and Distributed Collaboration',
  description: 'Coordinating large teams on complex projects - foundation for emergent collective intelligence',
  field: 'collaboration',

  allPapers: [
    'project_management_fundamentals',
    'task_decomposition_theory',
    'work_breakdown_structures',
    'critical_path_analysis',
    'resource_allocation_algorithms',
    'collaborative_software_design',
    'distributed_team_coordination',
    'asynchronous_communication_patterns',
    'collective_intelligence_theory',
    'emergent_coordination_systems'
  ],

  unlocks: [
    {
      technologyId: 'project_management',
      papersRequired: 4,
      mandatoryPapers: ['project_management_fundamentals', 'task_decomposition_theory'],
      grants: [
        { type: 'building', buildingId: 'project_office' },
        { type: 'ability', abilityId: 'manage_projects' }
      ]
    },
    {
      technologyId: 'task_management_systems',
      papersRequired: 7,
      mandatoryPapers: ['collaborative_software_design', 'distributed_team_coordination'],
      grants: [
        { type: 'building', buildingId: 'task_management_app' },  // Task management!
        { type: 'building', buildingId: 'project_coordination_center' },
        { type: 'ability', abilityId: 'coordinate_large_teams' }
      ]
    },
    {
      technologyId: 'collective_intelligence_platforms',
      papersRequired: 9,
      mandatoryPapers: ['collective_intelligence_theory', 'emergent_coordination_systems'],
      grants: [
        { type: 'building', buildingId: 'distributed_work_platform' },
        { type: 'ability', abilityId: 'enable_collective_intelligence' }
      ]
    }
  ]
};

// ============================================================================
// TIER 7: POWER GENERATION III - MEGASTRUCTURES (10 papers)
// Papers 466-475
// Dyson swarms and stellar engineering
// ============================================================================

export const POWER_GENERATION_III_MEGASTRUCTURES_SET: ResearchSet = {
  setId: 'power_generation_iii_megastructures',
  name: 'Stellar Engineering and Dyson Swarms',
  description: 'Harvesting the energy of stars with orbital megastructures',
  field: 'power_generation',

  allPapers: [
    'stellar_energy_capture_theory',
    'dyson_sphere_concepts',
    'dyson_swarm_architecture',
    'orbital_solar_collectors',
    'microwave_power_transmission',
    'rectenna_technology',
    'space_based_power_beaming',
    'megastructure_materials_science',
    'self_replicating_manufacturing',
    'stellar_engineering_economics'
  ],

  unlocks: [
    {
      technologyId: 'dyson_swarm_basics',
      papersRequired: 5,
      mandatoryPapers: ['dyson_swarm_architecture', 'orbital_solar_collectors'],
      grants: [
        { type: 'building', buildingId: 'dyson_swarm_component' },  // Dyson swarm!
        { type: 'ability', abilityId: 'construct_megastructures' }
      ]
    },
    {
      technologyId: 'microwave_power_beaming',
      papersRequired: 8,
      mandatoryPapers: ['microwave_power_transmission', 'space_based_power_beaming'],
      grants: [
        { type: 'building', buildingId: 'microwave_receiver' },  // Microwave beaming!
        { type: 'building', buildingId: 'orbital_power_station' },
        { type: 'ability', abilityId: 'beam_power_from_orbit' }
      ]
    }
  ]
};

// ============================================================================
// TIER 2: TRANSPORTATION & LOGISTICS (20 papers)
// Papers 106-125
// ============================================================================

export const TRANSPORTATION_LOGISTICS_SET: ResearchSet = {
  setId: 'transportation_logistics',
  name: 'Transportation and Supply Chain',
  description: 'From internal combustion to modern logistics',
  field: 'transportation',

  allPapers: [
    'internal_combustion_engine_basics',
    'four_stroke_cycle',
    'fuel_injection_systems',
    'transmission_design',
    'vehicle_chassis_engineering',
    'suspension_systems',
    'automotive_manufacturing',
    'diesel_engine_principles',
    'electric_vehicle_basics',
    'battery_technology_vehicles',
    'logistics_network_theory',
    'warehouse_operations',
    'inventory_optimization',
    'supply_chain_management',
    'transportation_routing',
    'freight_systems',
    'container_standardization',
    'intermodal_transport',
    'logistics_information_systems',
    'distribution_network_design'
  ],

  unlocks: [
    {
      technologyId: 'automotive_vehicles',
      papersRequired: 6,
      mandatoryPapers: ['internal_combustion_engine_basics', 'transmission_design'],
      grants: [
        { type: 'item', itemId: 'truck' },
        { type: 'item', itemId: 'car' },
        { type: 'ability', abilityId: 'operate_vehicles' }
      ]
    },
    {
      technologyId: 'logistics_systems',
      papersRequired: 12,
      mandatoryPapers: ['supply_chain_management', 'warehouse_operations'],
      grants: [
        { type: 'building', buildingId: 'warehouse' },
        { type: 'building', buildingId: 'logistics_center' },
        { type: 'ability', abilityId: 'manage_supply_chains' }
      ]
    }
  ]
};

// ============================================================================
// TIER 2: COMMUNICATION SYSTEMS I (15 papers)
// Papers 126-140
// ============================================================================

export const COMMUNICATION_SYSTEMS_I_SET: ResearchSet = {
  setId: 'communication_systems_i',
  name: 'Telegraph to Radio',
  description: 'Early electrical communication systems',
  field: 'communication',

  allPapers: [
    'electrical_telegraphy',
    'morse_code_theory',
    'telegraph_networks',
    'telephone_invention',
    'voice_transmission_theory',
    'switchboard_technology',
    'electromagnetic_wave_theory',
    'radio_wave_propagation',
    'amplitude_modulation',
    'radio_transmitter_design',
    'radio_receiver_design',
    'antenna_theory',
    'broadcast_systems',
    'frequency_allocation',
    'wireless_communication_regulation'
  ],

  unlocks: [
    {
      technologyId: 'telegraph_systems',
      papersRequired: 4,
      mandatoryPapers: ['electrical_telegraphy', 'telegraph_networks'],
      grants: [
        { type: 'building', buildingId: 'telegraph_station' },
        { type: 'ability', abilityId: 'send_telegrams' }
      ]
    },
    {
      technologyId: 'telephone_networks',
      papersRequired: 7,
      mandatoryPapers: ['telephone_invention', 'switchboard_technology'],
      grants: [
        { type: 'building', buildingId: 'telephone_exchange' },
        { type: 'item', itemId: 'telephone' },
        { type: 'ability', abilityId: 'voice_communication' }
      ]
    },
    {
      technologyId: 'radio_broadcasting',
      papersRequired: 11,
      mandatoryPapers: ['radio_transmitter_design', 'broadcast_systems'],
      grants: [
        { type: 'building', buildingId: 'radio_tower' },
        { type: 'building', buildingId: 'radio_station' },
        { type: 'ability', abilityId: 'broadcast_radio' }
      ]
    }
  ]
};

// ============================================================================
// TIER 3: ELECTRICAL ENGINEERING (20 papers)
// Papers 141-160
// ============================================================================

export const ELECTRICAL_ENGINEERING_SET: ResearchSet = {
  setId: 'electrical_engineering',
  name: 'Circuit Theory and Power Distribution',
  description: 'From basic circuits to electrical grids',
  field: 'electrical_engineering',

  allPapers: [
    'circuit_theory_fundamentals',
    'ohms_law_applications',
    'kirchhoffs_circuit_laws',
    'ac_circuit_analysis',
    'complex_impedance',
    'resonant_circuits',
    'filter_design',
    'transformer_design',
    'three_phase_power',
    'electric_motor_theory',
    'dc_motor_design',
    'ac_motor_design',
    'motor_control_systems',
    'power_electronics',
    'rectifier_circuits',
    'inverter_technology',
    'electrical_distribution_systems',
    'substation_engineering',
    'circuit_protection_devices',
    'electrical_safety_codes'
  ],

  unlocks: [
    {
      technologyId: 'circuit_design',
      papersRequired: 6,
      mandatoryPapers: ['circuit_theory_fundamentals', 'ac_circuit_analysis'],
      grants: [
        { type: 'building', buildingId: 'electrical_lab' },
        { type: 'ability', abilityId: 'design_circuits' }
      ]
    },
    {
      technologyId: 'electric_motors',
      papersRequired: 11,
      mandatoryPapers: ['electric_motor_theory', 'motor_control_systems'],
      grants: [
        { type: 'item', itemId: 'electric_motor' },
        { type: 'building', buildingId: 'motor_factory' },
        { type: 'ability', abilityId: 'manufacture_motors' }
      ]
    },
    {
      technologyId: 'electrical_distribution',
      papersRequired: 16,
      mandatoryPapers: ['electrical_distribution_systems', 'substation_engineering'],
      grants: [
        { type: 'building', buildingId: 'electrical_substation' },
        { type: 'ability', abilityId: 'distribute_power' }
      ]
    }
  ]
};

// ============================================================================
// TIER 3: COMPUTING FUNDAMENTALS (18 papers)
// Papers 161-178
// ============================================================================

export const COMPUTING_FUNDAMENTALS_SET: ResearchSet = {
  setId: 'computing_fundamentals',
  name: 'Early Computing and Algorithms',
  description: 'From mechanical calculators to electronic computers',
  field: 'computing',

  allPapers: [
    'boolean_algebra',
    'logic_gates',
    'binary_number_systems',
    'digital_circuit_design',
    'flip_flops_memory_elements',
    'cpu_architecture_basics',
    'instruction_set_design',
    'assembly_language',
    'stored_program_concept',
    'algorithm_theory',
    'sorting_algorithms',
    'searching_algorithms',
    'data_structure_fundamentals',
    'stack_queue_theory',
    'linked_list_structures',
    'tree_data_structures',
    'hash_table_design',
    'computational_complexity_theory'
  ],

  unlocks: [
    {
      technologyId: 'digital_logic',
      papersRequired: 5,
      mandatoryPapers: ['boolean_algebra', 'logic_gates'],
      grants: [
        { type: 'building', buildingId: 'computer_lab' },
        { type: 'ability', abilityId: 'understand_digital_circuits' }
      ]
    },
    {
      technologyId: 'early_computers',
      papersRequired: 10,
      mandatoryPapers: ['cpu_architecture_basics', 'stored_program_concept'],
      grants: [
        { type: 'building', buildingId: 'early_computer' },
        { type: 'ability', abilityId: 'program_computers' }
      ]
    },
    {
      technologyId: 'algorithm_design',
      papersRequired: 14,
      mandatoryPapers: ['algorithm_theory', 'computational_complexity_theory'],
      grants: [
        { type: 'ability', abilityId: 'design_efficient_algorithms' }
      ]
    }
  ]
};

// ============================================================================
// TIER 4: COMMUNICATION II - INTERNET (15 papers)
// Papers 271-285
// ============================================================================

export const COMMUNICATION_II_INTERNET_SET: ResearchSet = {
  setId: 'communication_ii_internet',
  name: 'Networking and the Internet',
  description: 'From packet switching to the World Wide Web',
  field: 'communication',

  allPapers: [
    'packet_switching_theory',
    'network_protocols',
    'tcp_ip_protocol_suite',
    'routing_algorithms',
    'domain_name_system',
    'internet_architecture',
    'network_security_basics',
    'encryption_fundamentals',
    'world_wide_web_architecture',
    'http_protocol',
    'html_markup_language',
    'web_server_technology',
    'distributed_hypermedia_systems',
    'internet_service_infrastructure',
    'content_delivery_networks'
  ],

  unlocks: [
    {
      technologyId: 'networking',
      papersRequired: 6,
      mandatoryPapers: ['packet_switching_theory', 'tcp_ip_protocol_suite'],
      grants: [
        { type: 'building', buildingId: 'network_infrastructure' },
        { type: 'ability', abilityId: 'network_engineering' }
      ]
    },
    {
      technologyId: 'internet',
      papersRequired: 10,
      mandatoryPapers: ['internet_architecture', 'domain_name_system'],
      grants: [
        { type: 'building', buildingId: 'internet_backbone' },
        { type: 'building', buildingId: 'internet_exchange' },
        { type: 'ability', abilityId: 'operate_internet_infrastructure' }
      ]
    },
    {
      technologyId: 'world_wide_web',
      papersRequired: 13,
      mandatoryPapers: ['world_wide_web_architecture', 'http_protocol'],
      grants: [
        { type: 'building', buildingId: 'web_server' },
        { type: 'ability', abilityId: 'create_websites' }
      ]
    }
  ]
};

// ============================================================================
// TIER 6: MILITARY & DEFENSE (15 papers)
// Papers 396-410
// Reduced from 20 to 15 to balance total count
// ============================================================================

export const MILITARY_DEFENSE_SET: ResearchSet = {
  setId: 'military_defense',
  name: 'Military Technology and Strategic Defense',
  description: 'Advanced materials, coordination, and strategic capabilities',
  field: 'military',

  allPapers: [
    'advanced_materials_armor',
    'composite_materials_defense',
    'ballistic_protection_theory',
    'tactical_communication_systems',
    'encrypted_military_communications',
    'command_control_systems',
    'strategic_coordination_theory',
    'threat_detection_systems',
    'defensive_positioning_theory',
    'logistics_for_defense',
    'supply_chain_resilience',
    'defense_manufacturing_capabilities',
    'strategic_resource_allocation',
    'multi_agent_tactical_coordination',
    'defense_technology_integration'
  ],

  unlocks: [
    {
      technologyId: 'advanced_armor',
      papersRequired: 4,
      mandatoryPapers: ['advanced_materials_armor', 'composite_materials_defense'],
      grants: [
        { type: 'item', itemId: 'advanced_armor' },
        { type: 'ability', abilityId: 'craft_advanced_armor' }
      ]
    },
    {
      technologyId: 'tactical_systems',
      papersRequired: 8,
      mandatoryPapers: ['command_control_systems', 'tactical_communication_systems'],
      grants: [
        { type: 'building', buildingId: 'command_center' },
        { type: 'ability', abilityId: 'coordinate_tactical_operations' }
      ]
    },
    {
      technologyId: 'strategic_defense',
      papersRequired: 12,
      mandatoryPapers: ['multi_agent_tactical_coordination', 'strategic_coordination_theory'],
      grants: [
        { type: 'building', buildingId: 'strategic_defense_center' },
        { type: 'ability', abilityId: 'strategic_defense_planning' }
      ]
    }
  ]
};

// Export all new research sets
export const TECH_EXPANSION_RESEARCH_SETS = [
  ENGINEERING_BASICS_SET,                    // 22 papers
  POWER_GENERATION_I_STEAM_SET,              // 25 papers
  MANUFACTURING_AUTOMATION_I_SET,            // 20 papers
  TRANSPORTATION_LOGISTICS_SET,              // 20 papers
  COMMUNICATION_SYSTEMS_I_SET,               // 15 papers
  ELECTRICAL_ENGINEERING_SET,                // 20 papers
  COMPUTING_FUNDAMENTALS_SET,                // 18 papers
  CLIMATE_CONTROL_TECHNOLOGY_SET,            // 15 papers
  ENTERTAINMENT_CULTURE_I_SET,               // 15 papers
  COMPUTING_II_DIGITAL_AGE_SET,              // 20 papers
  COMMUNICATION_II_INTERNET_SET,             // 15 papers
  POWER_GENERATION_II_NUCLEAR_SET,           // 25 papers
  SPACE_INDUSTRY_I_LAUNCH_SET,               // 25 papers
  DISTRIBUTED_SYSTEMS_SET,                   // 20 papers
  MANUFACTURING_AUTOMATION_II_SET,           // 15 papers
  MILITARY_DEFENSE_SET,                      // 15 papers
  VIDEO_GAME_INDUSTRY_SET,                   // 15 papers
  TASK_MANAGEMENT_COLLABORATION_SET,         // 10 papers
  POWER_GENERATION_III_MEGASTRUCTURES_SET    // 10 papers
];

// Total new papers: 305 papers
// Existing tech papers: ~195 papers
// Grand total: ~500 papers
