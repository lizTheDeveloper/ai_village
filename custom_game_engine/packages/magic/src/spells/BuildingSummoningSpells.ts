/**
 * Building summoning spells for dimensional magic.
 * Inspired by: Minecraft Creative, The Sims build mode, Dwarf Fortress construction
 */

export interface MagicSpell {
  id: string;
  name: string;
  description: string;
  paradigm: string;
  tier: 'novice' | 'apprentice' | 'journeyman' | 'master' | 'grandmaster';

  cost: {
    mana?: number;
    sanity?: number;
    stamina?: number;
    realityStability?: number;
    materials?: Array<{ resourceId: string; amount: number }>;
  };

  castTime: number;
  cooldown: number;
  range: number;

  requirements: {
    minPowerLevel: number;
    knownParadigms: string[];
    perception?: string;
    clarkeTechTier?: number;
  };

  effects: Array<{
    type: string;
    buildingType?: string;
    duration?: number;
    location?: string;
    sourceDimensions?: number;
    targetDimensions?: number;
    stability?: number;
    radius?: number;
    effect?: string;
    interior?: boolean;
    timeRatio?: number;
    probability?: number;
  }>;

  visual?: {
    castAnimation?: string;
    impactAnimation?: string;
    color?: string;
  };

  risks?: Array<{
    probability: number;
    consequence: string;
    severity: string;
  }>;

  lore?: string;
}

export const BUILDING_SUMMONING_SPELLS: MagicSpell[] = [
  // ========================================================================
  // Tier 1: Simple Structures (3D)
  // ========================================================================
  {
    id: 'conjure_shelter',
    name: 'Conjure Shelter',
    description: 'Summon a basic wooden shelter from thin air',
    paradigm: 'dimension',
    tier: 'novice',

    cost: {
      mana: 30,
      sanity: 5,
      materials: [] // No materials needed - pure conjuration
    },

    castTime: 60, // 3 seconds
    cooldown: 600, // 30 seconds
    range: 10, // tiles

    requirements: {
      minPowerLevel: 10,
      knownParadigms: ['dimension'],
      perception: 'native' // Can summon 3D with native perception
    },

    effects: [
      {
        type: 'summon_building',
        buildingType: 'simple_shelter', // 3D, 5x5, basic walls/floor/door
        duration: 0, // Permanent
        location: 'target_position'
      }
    ],

    visual: {
      castAnimation: 'dimensional_shimmer',
      impactAnimation: 'building_materialize',
      color: '#00FFFF'
    },

    lore: 'The first lesson: space is malleable. Fold it, and a wall appears.'
  },

  // ========================================================================
  // Tier 2: Advanced Structures (3D multi-floor)
  // ========================================================================
  {
    id: 'conjure_tower',
    name: 'Conjure Tower',
    description: 'Summon a multi-story stone tower',
    paradigm: 'dimension',
    tier: 'apprentice',

    cost: {
      mana: 80,
      sanity: 15,
      materials: [{ resourceId: 'stone', amount: 10 }] // Requires stone focus
    },

    castTime: 200, // 10 seconds
    cooldown: 1200,
    range: 15,

    requirements: {
      minPowerLevel: 30,
      knownParadigms: ['dimension'],
      perception: 'native'
    },

    effects: [
      {
        type: 'summon_building',
        buildingType: 'stone_tower', // 3D with 3 floors, stairs
        duration: 0,
        location: 'target_position'
      }
    ],

    visual: {
      castAnimation: 'stone_vortex',
      impactAnimation: 'tower_rise',
      color: '#808080'
    },

    lore: 'Layer space upon itself. The tower grows upward through folded geometry.'
  },

  // ========================================================================
  // Tier 3: Tesseract Buildings (4D) - Requires Clarke Tech Tier 7
  // ========================================================================
  {
    id: 'fold_tesseract',
    name: 'Fold Tesseract',
    description: 'Create a 4D hypercube structure with impossible geometry',
    paradigm: 'dimension',
    tier: 'journeyman',

    cost: {
      mana: 150,
      sanity: 40,
      realityStability: 10,
      materials: [{ resourceId: 'exotic_crystal', amount: 5 }]
    },

    castTime: 400, // 20 seconds
    cooldown: 2400,
    range: 20,

    requirements: {
      minPowerLevel: 60,
      knownParadigms: ['dimension'],
      perception: 'full', // Must perceive 4D
      clarkeTechTier: 7 // Exotic Physics
    },

    effects: [
      {
        type: 'summon_building',
        buildingType: 'tesseract_research_lab_01', // 4D with W-axis slices
        duration: 0,
        location: 'target_position'
      },
      {
        type: 'create_dimensional_aura',
        radius: 10,
        effect: 'dimensional_awareness', // Nearby agents can glimpse 4D
        duration: 600
      }
    ],

    visual: {
      castAnimation: 'hypercube_unfold',
      impactAnimation: 'reality_fracture',
      color: '#00FFFF'
    },

    risks: [
      {
        probability: 0.1,
        consequence: 'rift_creation', // 10% chance creates unstable rift
        severity: 'moderate'
      }
    ],

    lore: 'The cube has more than six faces. You just have to look sideways.'
  },

  // ========================================================================
  // Tier 4: Phase-Shifting Buildings (5D)
  // ========================================================================
  {
    id: 'weave_penteract',
    name: 'Weave Penteract',
    description: 'Summon a 5D structure that shifts between phase states',
    paradigm: 'dimension',
    tier: 'master',

    cost: {
      mana: 250,
      sanity: 70,
      realityStability: 25,
      materials: [{ resourceId: 'phase_crystal', amount: 10 }]
    },

    castTime: 800, // 40 seconds
    cooldown: 4800,
    range: 25,

    requirements: {
      minPowerLevel: 80,
      knownParadigms: ['dimension', 'time'],
      perception: 'transcendent',
      clarkeTechTier: 7
    },

    effects: [
      {
        type: 'summon_building',
        buildingType: '5d_phase_temple_001', // 5D phase-shifting
        duration: 0,
        location: 'target_position'
      },
      {
        type: 'create_temporal_distortion',
        radius: 15,
        timeRatio: 0.5, // Time moves slower near penteract
        duration: 1200
      }
    ],

    visual: {
      castAnimation: 'phase_weave',
      impactAnimation: 'chronomorphic_cascade',
      color: '#FF00FF'
    },

    risks: [
      {
        probability: 0.2,
        consequence: 'phase_lock', // Building stuck in one phase
        severity: 'moderate'
      },
      {
        probability: 0.05,
        consequence: 'temporal_rift',
        severity: 'severe'
      }
    ],

    lore: 'A building that exists in multiple moments simultaneously. Do not enter during phase transition.'
  },

  // ========================================================================
  // Tier 5: Quantum Buildings (6D) - Multiversal Tech
  // ========================================================================
  {
    id: 'collapse_hexeract',
    name: 'Collapse Hexeract',
    description: 'Manifest a 6D quantum structure from superposed possibilities',
    paradigm: 'dimension',
    tier: 'grandmaster',

    cost: {
      mana: 400,
      sanity: 100,
      realityStability: 50,
      materials: [{ resourceId: 'quantum_substrate', amount: 20 }]
    },

    castTime: 1600, // 80 seconds (1.33 minutes)
    cooldown: 9600, // 8 minutes
    range: 30,

    requirements: {
      minPowerLevel: 95,
      knownParadigms: ['dimension', 'paradox', 'void'],
      perception: 'transcendent',
      clarkeTechTier: 8 // Multiversal
    },

    effects: [
      {
        type: 'summon_building',
        buildingType: 'hexeract_quantum_obs', // 6D quantum superposition
        duration: 0,
        location: 'target_position'
      },
      {
        type: 'create_quantum_field',
        radius: 20,
        effect: 'superposition_aura', // Multiple realities coexist
        duration: 2400
      },
      {
        type: 'attract_extradimensional_entities',
        probability: 0.3, // Bill Cipher might notice
        radius: 50
      }
    ],

    visual: {
      castAnimation: 'quantum_fluctuation',
      impactAnimation: 'multiverse_convergence',
      color: '#FFFF00'
    },

    risks: [
      {
        probability: 0.15,
        consequence: 'dimensional_collapse',
        severity: 'catastrophic'
      },
      {
        probability: 0.25,
        consequence: 'observer_paradox', // Caster sees all states
        severity: 'severe'
      },
      {
        probability: 0.4,
        consequence: 'attention_gained', // The Triangle notices
        severity: 'severe'
      }
    ],

    lore: 'The building is everywhere and nowhere. Observation collapses the wave function.'
  },

  // ========================================================================
  // Special: Realm Pocket Creation (TARDIS-like)
  // ========================================================================
  {
    id: 'weave_pocket_realm',
    name: 'Weave Pocket Realm',
    description: 'Create a building that is bigger on the inside',
    paradigm: 'dimension',
    tier: 'master',

    cost: {
      mana: 200,
      sanity: 50,
      realityStability: 30,
      materials: [{ resourceId: 'realm_anchor', amount: 1 }]
    },

    castTime: 600, // 30 seconds
    cooldown: 3600,
    range: 20,

    requirements: {
      minPowerLevel: 75,
      knownParadigms: ['dimension', 'void'],
      perception: 'full',
      clarkeTechTier: 6 // Post-Scarcity (realm pocket tech)
    },

    effects: [
      {
        type: 'summon_building',
        buildingType: 'fae_pocket_manor_5x5', // 5x5 exterior, 21x21 interior
        duration: 0,
        location: 'target_position'
      },
      {
        type: 'create_time_dilation',
        interior: true,
        timeRatio: 0.1, // 10x slower inside
        duration: 0 // Permanent while building exists
      }
    ],

    visual: {
      castAnimation: 'void_weave',
      impactAnimation: 'pocket_collapse',
      color: '#4444FF'
    },

    risks: [
      {
        probability: 0.1,
        consequence: 'interior_collapse', // Pocket realm implodes
        severity: 'catastrophic'
      }
    ],

    lore: 'It\'s bigger on the inside. Time flows differently there. Do not get lost.'
  },

  // ========================================================================
  // Portal/Rift Summoning
  // ========================================================================
  {
    id: 'tear_dimensional_rift',
    name: 'Tear Dimensional Rift',
    description: 'Rip open a portal between dimensional states',
    paradigm: 'dimension',
    tier: 'journeyman',

    cost: {
      mana: 100,
      sanity: 30,
      realityStability: 15
    },

    castTime: 120, // 6 seconds
    cooldown: 600,
    range: 15,

    requirements: {
      minPowerLevel: 50,
      knownParadigms: ['dimension'],
      perception: 'partial'
    },

    effects: [
      {
        type: 'create_dimensional_rift',
        sourceDimensions: 3,
        targetDimensions: 4,
        stability: 0.7,
        radius: 2,
        duration: 600, // 30 seconds
        location: 'target_position'
      }
    ],

    visual: {
      castAnimation: 'reality_tear',
      impactAnimation: 'rift_open',
      color: '#00FFFF'
    },

    risks: [
      {
        probability: 0.2,
        consequence: 'unstable_rift', // Rift becomes magnetic, attracts others
        severity: 'moderate'
      }
    ],

    lore: 'Every rift is a wound in reality. Some never heal.'
  }
];

// Export by tier for progression systems
export const BUILDING_SPELLS_BY_TIER = {
  novice: BUILDING_SUMMONING_SPELLS.filter(s => s.tier === 'novice'),
  apprentice: BUILDING_SUMMONING_SPELLS.filter(s => s.tier === 'apprentice'),
  journeyman: BUILDING_SUMMONING_SPELLS.filter(s => s.tier === 'journeyman'),
  master: BUILDING_SUMMONING_SPELLS.filter(s => s.tier === 'master'),
  grandmaster: BUILDING_SUMMONING_SPELLS.filter(s => s.tier === 'grandmaster')
};
