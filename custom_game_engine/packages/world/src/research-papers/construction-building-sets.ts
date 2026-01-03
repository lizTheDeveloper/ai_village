/**
 * Construction and Building Research Sets
 *
 * Extensive construction and architectural research trees that overlap with
 * engineering and magical construction systems.
 * Progression from basic materials to monumental magical architecture.
 *
 * Total: ~155 papers across construction materials, carpentry, masonry,
 * architectural design, structural engineering, and magical construction.
 */

import type { ResearchSet } from './types.js';

// ============================================================================
// TIER 1: BASIC CONSTRUCTION MATERIALS (20 papers)
// Material properties, sourcing, and basic preparation
// ============================================================================

export const BASIC_CONSTRUCTION_MATERIALS_SET: ResearchSet = {
  setId: 'basic_construction_materials',
  name: 'The Builder\'s Foundation',
  description: 'Understanding materials - wood, stone, clay, and their properties',
  field: 'construction',

  allPapers: [
    'wood_properties_construction',
    'timber_selection_criteria',
    'wood_grain_understanding',
    'wood_seasoning_drying',
    'lumber_dimensional_standards',
    'stone_types_construction',
    'stone_hardness_testing',
    'stone_quarrying_basics',
    'stone_splitting_techniques',
    'clay_properties_building',
    'adobe_brick_making',
    'fired_brick_fundamentals',
    'mortar_composition_basics',
    'lime_mortar_preparation',
    'natural_adhesives',
    'rope_cordage_construction',
    'thatch_roofing_materials',
    'material_weather_resistance',
    'material_load_bearing',
    'construction_material_storage'
  ],

  unlocks: [
    {
      technologyId: 'basic_materials',
      papersRequired: 5,
      mandatoryPapers: ['wood_properties_construction', 'stone_types_construction'],
      grants: [
        { type: 'building', buildingId: 'lumber_yard' },
        { type: 'ability', abilityId: 'select_materials' }
      ]
    },
    {
      technologyId: 'brick_making',
      papersRequired: 7,
      mandatoryPapers: ['adobe_brick_making'],
      grants: [
        { type: 'building', buildingId: 'brick_kiln' },
        { type: 'ability', abilityId: 'make_bricks' },
        { type: 'item', itemId: 'brick' }
      ]
    },
    {
      technologyId: 'advanced_materials',
      papersRequired: 12,
      mandatoryPapers: ['mortar_composition_basics', 'material_load_bearing'],
      grants: [
        { type: 'building', buildingId: 'materials_workshop' },
        { type: 'ability', abilityId: 'material_engineering' }
      ]
    }
  ]
};

// ============================================================================
// TIER 2: CARPENTRY & WOODWORKING (20 papers)
// Working with wood - joinery, framing, finishing
// ============================================================================

export const CARPENTRY_WOODWORKING_SET: ResearchSet = {
  setId: 'carpentry_woodworking',
  name: 'The Carpenter\'s Craft',
  description: 'Woodworking techniques from basic joints to fine furniture',
  field: 'construction',

  allPapers: [
    'saw_types_techniques',
    'hand_plane_mastery',
    'chisel_techniques',
    'joinery_fundamentals',
    'mortise_tenon_joints',
    'dovetail_joints',
    'lap_joints',
    'wood_glue_adhesives',
    'wooden_pegs_fasteners',
    'timber_framing_basics',
    'post_beam_construction',
    'roof_truss_design',
    'floor_joist_construction',
    'wood_finishing_techniques',
    'wood_staining',
    'wood_sealing_protection',
    'furniture_construction',
    'cabinet_making',
    'wood_carving_decorative',
    'wood_joinery_mastery'
  ],

  unlocks: [
    {
      technologyId: 'basic_carpentry',
      papersRequired: 5,
      mandatoryPapers: ['joinery_fundamentals'],
      grants: [
        { type: 'building', buildingId: 'carpentry_workshop' },
        { type: 'ability', abilityId: 'carpentry_basics' }
      ]
    },
    {
      technologyId: 'timber_framing',
      papersRequired: 9,
      mandatoryPapers: ['timber_framing_basics', 'floor_joist_construction'],
      grants: [
        { type: 'building', buildingId: 'timber_frame_structure' },
        { type: 'ability', abilityId: 'build_timber_frames' }
      ]
    },
    {
      technologyId: 'furniture_crafting',
      papersRequired: 11,
      mandatoryPapers: ['furniture_construction'],
      grants: [
        { type: 'ability', abilityId: 'craft_furniture' },
        { type: 'item', itemId: 'wooden_furniture' }
      ]
    },
    {
      technologyId: 'master_carpentry',
      papersRequired: 15,
      mandatoryPapers: ['wood_joinery_mastery'],
      grants: [
        { type: 'building', buildingId: 'master_carpentry_shop' },
        { type: 'ability', abilityId: 'master_woodworking' }
      ]
    }
  ]
};

// ============================================================================
// TIER 3: MASONRY & STONEWORK (20 papers)
// Stone cutting, laying, and structures
// ============================================================================

export const MASONRY_STONEWORK_SET: ResearchSet = {
  setId: 'masonry_stonework',
  name: 'The Mason\'s Art',
  description: 'Stone cutting, masonry techniques, and permanent structures',
  field: 'construction',

  allPapers: [
    'stone_cutting_fundamentals',
    'chisel_hammer_techniques',
    'stone_shaping_precision',
    'stone_surface_finishing',
    'mortar_mixing_ratios',
    'brick_laying_techniques',
    'stone_laying_methods',
    'coursed_rubble_masonry',
    'ashlar_masonry',
    'dry_stone_construction',
    'arch_construction_basics',
    'keystone_principles',
    'vault_construction',
    'dome_building_techniques',
    'foundation_excavation',
    'foundation_stone_laying',
    'wall_construction_stability',
    'buttress_support_theory',
    'stone_reinforcement',
    'masonry_waterproofing'
  ],

  unlocks: [
    {
      technologyId: 'basic_masonry',
      papersRequired: 5,
      mandatoryPapers: ['brick_laying_techniques'],
      grants: [
        { type: 'building', buildingId: 'mason_workshop' },
        { type: 'ability', abilityId: 'masonry_basics' }
      ]
    },
    {
      technologyId: 'stone_construction',
      papersRequired: 8,
      mandatoryPapers: ['stone_cutting_fundamentals', 'wall_construction_stability'],
      grants: [
        { type: 'building', buildingId: 'stone_building' },
        { type: 'ability', abilityId: 'build_stone_structures' }
      ]
    },
    {
      technologyId: 'arch_construction',
      papersRequired: 11,
      mandatoryPapers: ['arch_construction_basics', 'keystone_principles'],
      grants: [
        { type: 'building', buildingId: 'stone_arch' },
        { type: 'ability', abilityId: 'build_arches' }
      ]
    },
    {
      technologyId: 'advanced_masonry',
      papersRequired: 15,
      mandatoryPapers: ['vault_construction', 'dome_building_techniques'],
      grants: [
        { type: 'building', buildingId: 'stone_cathedral' },
        { type: 'ability', abilityId: 'master_masonry' }
      ]
    }
  ]
};

// ============================================================================
// TIER 4: ADVANCED CONSTRUCTION TECHNIQUES (25 papers)
// Complex building methods and construction systems
// Overlaps with engineering
// ============================================================================

export const ADVANCED_CONSTRUCTION_TECHNIQUES_SET: ResearchSet = {
  setId: 'advanced_construction_techniques',
  name: 'Engineering the Built Environment',
  description: 'Advanced construction methods and building systems',
  field: 'construction',

  allPapers: [
    'building_planning_layout',
    'site_preparation_leveling',
    'drainage_water_management',
    'scaffold_construction_safety',
    'pulley_lifting_systems',
    'crane_basic_mechanics',
    'concrete_formwork',
    'rammed_earth_construction',
    'cob_building_techniques',
    'wattle_daub_walls',
    'plaster_rendering',
    'insulation_techniques',
    'roofing_systems_design',
    'tile_roofing',
    'slate_roofing',
    'metal_roofing_techniques',
    'window_frame_construction',
    'door_frame_installation',
    'staircase_design_construction',
    'flooring_systems',
    'wall_cavity_construction',
    'building_ventilation',
    'chimney_flue_construction',
    'plumbing_basics_construction',  // Overlap with engineering
    'building_code_principles'
  ],

  unlocks: [
    {
      technologyId: 'advanced_building',
      papersRequired: 7,
      mandatoryPapers: ['building_planning_layout'],
      grants: [
        { type: 'building', buildingId: 'construction_site' },
        { type: 'ability', abilityId: 'advanced_construction' }
      ]
    },
    {
      technologyId: 'roofing_flooring',
      papersRequired: 10,
      mandatoryPapers: ['roofing_systems_design', 'flooring_systems'],
      grants: [
        { type: 'ability', abilityId: 'install_roofs_floors' }
      ]
    },
    {
      technologyId: 'building_systems',
      papersRequired: 14,
      mandatoryPapers: ['building_ventilation', 'plumbing_basics_construction'],
      grants: [
        { type: 'ability', abilityId: 'integrated_building_systems' }
      ]
    },
    {
      technologyId: 'construction_engineering',
      papersRequired: 18,
      mandatoryPapers: ['building_code_principles'],
      grants: [
        { type: 'building', buildingId: 'engineering_office' },
        { type: 'ability', abilityId: 'construction_engineering' }
      ]
    }
  ]
};

// ============================================================================
// TIER 5: ARCHITECTURAL DESIGN (20 papers)
// Design principles, aesthetics, and planning
// ============================================================================

export const ARCHITECTURAL_DESIGN_SET: ResearchSet = {
  setId: 'architectural_design',
  name: 'The Architect\'s Vision',
  description: 'Architectural design principles from form to function',
  field: 'construction',

  allPapers: [
    'architectural_drawing_basics',
    'blueprint_creation',
    'scale_model_construction',
    'proportion_symmetry_principles',
    'golden_ratio_architecture',
    'aesthetic_theory_buildings',
    'function_form_integration',
    'space_planning_theory',
    'room_layout_optimization',
    'natural_lighting_design',
    'facade_design_principles',
    'ornamentation_decoration',
    'columns_classical_orders',
    'architectural_styles_history',
    'vernacular_architecture',
    'climate_responsive_design',
    'urban_planning_basics',
    'city_layout_theory',
    'public_space_design',
    'landscape_architecture_integration'
  ],

  unlocks: [
    {
      technologyId: 'architectural_planning',
      papersRequired: 5,
      mandatoryPapers: ['architectural_drawing_basics', 'blueprint_creation'],
      grants: [
        { type: 'building', buildingId: 'architects_office' },
        { type: 'ability', abilityId: 'design_buildings' }
      ]
    },
    {
      technologyId: 'aesthetic_architecture',
      papersRequired: 10,
      mandatoryPapers: ['proportion_symmetry_principles'],
      grants: [
        { type: 'ability', abilityId: 'beautiful_design' }
      ]
    },
    {
      technologyId: 'urban_planning',
      papersRequired: 13,
      mandatoryPapers: ['urban_planning_basics'],
      grants: [
        { type: 'ability', abilityId: 'plan_cities' }
      ]
    },
    {
      technologyId: 'master_architecture',
      papersRequired: 16,
      mandatoryPapers: ['climate_responsive_design'],
      grants: [
        { type: 'building', buildingId: 'architectural_academy' },
        { type: 'ability', abilityId: 'master_architectural_design' }
      ]
    }
  ]
};

// ============================================================================
// TIER 6: STRUCTURAL ENGINEERING (20 papers)
// Engineering principles applied to buildings
// MAJOR overlap with engineering field
// ============================================================================

export const STRUCTURAL_ENGINEERING_SET: ResearchSet = {
  setId: 'structural_engineering',
  name: 'Engineering the Impossible',
  description: 'Structural engineering principles for ambitious construction',
  field: 'engineering',  // Field overlap!

  allPapers: [
    'load_bearing_calculations',
    'stress_distribution_analysis',
    'compression_tension_forces',
    'shear_force_understanding',
    'moment_force_calculations',
    'structural_stability_theory',
    'foundation_load_capacity',
    'soil_mechanics_foundations',
    'deep_foundation_techniques',
    'cantilever_principles',
    'suspension_structures',
    'truss_design_analysis',
    'frame_structure_engineering',
    'reinforcement_techniques',
    'earthquake_resistant_design',
    'wind_load_calculations',
    'material_strength_testing',
    'structural_failure_analysis',
    'bridge_engineering_basics',
    'tower_construction_engineering'
  ],

  unlocks: [
    {
      technologyId: 'structural_basics',
      papersRequired: 6,
      mandatoryPapers: ['load_bearing_calculations'],
      grants: [
        { type: 'building', buildingId: 'structural_engineering_office' },
        { type: 'ability', abilityId: 'structural_analysis' }
      ]
    },
    {
      technologyId: 'advanced_structures',
      papersRequired: 11,
      mandatoryPapers: ['cantilever_principles', 'truss_design_analysis'],
      grants: [
        { type: 'ability', abilityId: 'design_complex_structures' }
      ]
    },
    {
      technologyId: 'bridges_towers',
      papersRequired: 14,
      mandatoryPapers: ['bridge_engineering_basics'],
      grants: [
        { type: 'building', buildingId: 'suspension_bridge' },
        { type: 'ability', abilityId: 'build_bridges_towers' }
      ]
    },
    {
      technologyId: 'monumental_engineering',
      papersRequired: 17,
      mandatoryPapers: ['earthquake_resistant_design', 'structural_failure_analysis'],
      grants: [
        { type: 'building', buildingId: 'engineering_academy' },
        { type: 'ability', abilityId: 'engineer_monuments' }
      ]
    }
  ]
};

// ============================================================================
// TIER 7: MAGICAL CONSTRUCTION (15 papers)
// Enchanted buildings, arcane architecture
// MAJOR overlap with arcane field
// ============================================================================

export const MAGICAL_CONSTRUCTION_SET: ResearchSet = {
  setId: 'magical_construction',
  name: 'Arcane Architecture',
  description: 'Construction infused with magic - buildings that transcend physics',
  field: 'arcane',  // Full arcane field!

  allPapers: [
    'enchanted_materials_construction',
    'magical_foundation_laying_rituals',
    'geomantic_site_selection',
    'ley_line_building_placement',
    'structural_enchantments',
    'self_repairing_buildings',
    'magically_reinforced_stone',
    'weightless_material_enchantment',
    'impossible_geometry_construction',
    'pocket_dimension_integration',
    'teleportation_circle_architecture',
    'magical_climate_control_buildings',
    'sentient_building_enchantments',
    'living_architecture',
    'reality_warping_construction'
  ],

  unlocks: [
    {
      technologyId: 'enchanted_construction',
      papersRequired: 4,
      mandatoryPapers: ['enchanted_materials_construction'],
      grants: [
        { type: 'building', buildingId: 'enchanted_workshop' },
        { type: 'ability', abilityId: 'enchant_buildings' }
      ]
    },
    {
      technologyId: 'magical_reinforcement',
      papersRequired: 7,
      mandatoryPapers: ['structural_enchantments', 'magically_reinforced_stone'],
      grants: [
        { type: 'ability', abilityId: 'magically_strengthen_buildings' }
      ]
    },
    {
      technologyId: 'impossible_architecture',
      papersRequired: 10,
      mandatoryPapers: ['impossible_geometry_construction'],
      grants: [
        { type: 'building', buildingId: 'floating_tower' },
        { type: 'ability', abilityId: 'build_impossible_structures' }
      ]
    },
    {
      technologyId: 'living_architecture',
      papersRequired: 13,
      mandatoryPapers: ['sentient_building_enchantments', 'living_architecture'],
      grants: [
        { type: 'building', buildingId: 'living_castle' },
        { type: 'ability', abilityId: 'create_living_buildings' }
      ]
    }
  ]
};

// ============================================================================
// TIER 8: MONUMENTAL ARCHITECTURE (15 papers)
// Massive projects, wonders of the world
// Combines engineering and construction mastery
// ============================================================================

export const MONUMENTAL_ARCHITECTURE_SET: ResearchSet = {
  setId: 'monumental_architecture',
  name: 'Monuments for the Ages',
  description: 'Building wonders that stand for millennia',
  field: 'construction',

  allPapers: [
    'monumental_scale_planning',
    'large_workforce_coordination',
    'monument_material_sourcing',
    'massive_stone_transport',
    'pyramid_construction_techniques',
    'obelisk_raising_methods',
    'colossus_statue_engineering',
    'aqueduct_design_construction',
    'amphitheater_acoustics_design',
    'lighthouse_tower_engineering',
    'hanging_gardens_engineering',
    'temple_complex_planning',
    'fortress_castle_engineering',
    'wonder_durability_preservation',
    'monument_legacy_planning'
  ],

  unlocks: [
    {
      technologyId: 'monument_planning',
      papersRequired: 4,
      mandatoryPapers: ['monumental_scale_planning'],
      grants: [
        { type: 'building', buildingId: 'monument_planning_office' },
        { type: 'ability', abilityId: 'plan_monuments' }
      ]
    },
    {
      technologyId: 'workforce_coordination',
      papersRequired: 6,
      mandatoryPapers: ['large_workforce_coordination', 'monument_material_sourcing'],
      grants: [
        { type: 'ability', abilityId: 'coordinate_large_projects' }
      ]
    },
    {
      technologyId: 'ancient_wonders',
      papersRequired: 9,
      mandatoryPapers: ['pyramid_construction_techniques'],
      grants: [
        { type: 'building', buildingId: 'great_pyramid' },
        { type: 'ability', abilityId: 'build_wonders' }
      ]
    },
    {
      technologyId: 'eternal_monuments',
      papersRequired: 12,
      mandatoryPapers: ['wonder_durability_preservation'],
      grants: [
        { type: 'building', buildingId: 'world_wonder' },
        { type: 'ability', abilityId: 'create_eternal_monuments' }
      ]
    }
  ]
};

// ============================================================================
// TIER 9: UNDERGROUND CONSTRUCTION (15 papers)
// Tunneling, mining structures, subterranean architecture
// ============================================================================

export const UNDERGROUND_CONSTRUCTION_SET: ResearchSet = {
  setId: 'underground_construction',
  name: 'The Depths Below',
  description: 'Building beneath the earth - tunnels, mines, and subterranean cities',
  field: 'construction',

  allPapers: [
    'tunnel_excavation_basics',
    'rock_stability_analysis',
    'tunnel_support_systems',
    'timber_shoring_techniques',
    'rock_bolt_installation',
    'tunnel_ventilation_systems',
    'underground_water_management',
    'mine_shaft_construction',
    'underground_chamber_excavation',
    'cavern_stabilization',
    'subterranean_city_planning',
    'underground_lighting_systems',
    'underground_agriculture_chambers',
    'geothermal_heat_utilization',
    'deep_earth_construction_safety'
  ],

  unlocks: [
    {
      technologyId: 'basic_tunneling',
      papersRequired: 4,
      mandatoryPapers: ['tunnel_excavation_basics'],
      grants: [
        { type: 'building', buildingId: 'mine_tunnel' },
        { type: 'ability', abilityId: 'excavate_tunnels' }
      ]
    },
    {
      technologyId: 'tunnel_support',
      papersRequired: 6,
      mandatoryPapers: ['tunnel_support_systems', 'rock_stability_analysis'],
      grants: [
        { type: 'ability', abilityId: 'reinforce_tunnels' }
      ]
    },
    {
      technologyId: 'underground_chambers',
      papersRequired: 9,
      mandatoryPapers: ['underground_chamber_excavation'],
      grants: [
        { type: 'building', buildingId: 'underground_hall' },
        { type: 'ability', abilityId: 'build_underground' }
      ]
    },
    {
      technologyId: 'subterranean_cities',
      papersRequired: 12,
      mandatoryPapers: ['subterranean_city_planning'],
      grants: [
        { type: 'building', buildingId: 'underground_city' },
        { type: 'ability', abilityId: 'create_subterranean_civilization' }
      ]
    }
  ]
};

// Export all construction and building research sets
export const CONSTRUCTION_BUILDING_RESEARCH_SETS = [
  BASIC_CONSTRUCTION_MATERIALS_SET,         // 20 papers
  CARPENTRY_WOODWORKING_SET,                // 20 papers
  MASONRY_STONEWORK_SET,                    // 20 papers
  ADVANCED_CONSTRUCTION_TECHNIQUES_SET,     // 25 papers
  ARCHITECTURAL_DESIGN_SET,                 // 20 papers
  STRUCTURAL_ENGINEERING_SET,               // 20 papers - ENGINEERING OVERLAP
  MAGICAL_CONSTRUCTION_SET,                 // 15 papers - ARCANE OVERLAP
  MONUMENTAL_ARCHITECTURE_SET,              // 15 papers
  UNDERGROUND_CONSTRUCTION_SET              // 15 papers
];

// Total: 170 papers
// Basic Construction: 65 papers (20 + 20 + 25)
// Advanced Construction: 40 papers (20 + 20)
// Specialized: 65 papers (15 + 15 + 15 + 20 engineering)
