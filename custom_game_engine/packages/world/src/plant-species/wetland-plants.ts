/**
 * Wetland Plants
 *
 * Wetlands are where water and land conduct their ongoing divorce proceedings.
 * Plants here tolerate flooding, enjoy anaerobic soil, and contain more medicinal
 * alkaloids per gram than seems strictly necessary.
 *
 * Adaptive Features:
 * - Aerenchyma tissue (internal snorkels for roots)
 * - Rhizomatic spreading (one plant or many? a philosophical question)
 * - Tannins and alkaloids (chemical warfare against decay)
 */

import type { PlantSpecies } from '@ai-village/core';

// ============================================================================
// CARNIVOROUS PLANTS
// ============================================================================

export const DROWNING_PITCHER: PlantSpecies = {
  id: 'drowning_pitcher',
  name: 'Drowning Pitcher',
  scientificName: 'Sarracenia profundus',
  category: 'carnivorous',
  description: 'Deep pitcher plant filled with enzyme-rich liquid. Insects drown, dissolve, become nutrients. The circle of life, verticalized.',
  lore: 'Drowning pitchers smell like hope to flies and despair to flies\' families. The plant doesn\'t care about tragedy—it cares about nitrogen, which is scarce in bog soil and abundant in dissolved insects.',
  biomes: ['wetland', 'swamp', 'bog'],
  rarity: 'uncommon',

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 30,
        growthConditions: { waterlogged: true, acidic: true },
        description: 'Seeds germinate in acidic bog'
      },
      {
        name: 'rosette',
        duration: 90,
        growthConditions: { lowNitrogen: true },
        description: 'Small pitchers form'
      },
      {
        name: 'mature',
        duration: 120,
        harvestYield: { min: 2, max: 6 },
        description: 'Full-sized pitchers, insect-filled'
      }
    ],
    maturityTime: 120,
    optimalTemperatureRange: [15, 28],
    optimalMoistureRange: [90, 100],
    requiresLowNitrogen: true
  },

  baseGenetics: {
    yieldAmount: 4,
    growthRate: 0.9,
    diseaseResistance: 0.8
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'dark-fantasy', 'standard'],
      magicType: 'consumption',
      potency: 0.7,
      stability: 0.6,
      effects: [
        {
          type: 'dissolution',
          magnitude: 0.8,
          duration: 240,
          trigger: 'consume_liquid',
          description: 'Accelerate breakdown of organic matter'
        },
        {
          type: 'nutrient_extraction',
          magnitude: 0.7,
          duration: 360,
          trigger: 'consume',
          description: 'Extract maximum nutrition from minimal food'
        },
        {
          type: 'acid_resistance',
          magnitude: 0.6,
          duration: 480,
          trigger: 'consume',
          description: 'Resist acidic environments and attacks'
        }
      ],
      harvestConditions: { full_of_insects: true },
      magicDecaysAfter: 5,
      preservationMethod: 'store in own digestive fluid'
    },
    medicinal: {
      activeCompounds: ['digestive_enzymes', 'sarracenin'],
      effects: [
        { condition: 'indigestion', efficacy: 0.8, preparation: 'tincture' },
        { condition: 'poison', efficacy: 0.5, preparation: 'tincture' }
      ],
      toxicity: 0.4,
      preparation: ['tincture'],
      warnings: 'Digestive enzymes are caustic'
    }
  },

  environmentalInteractions: {
    soilPreference: ['acidic_bog', 'peat'],
    companions: ['sphagnum_moss'],
    inhibits: [],
    specialProperties: ['carnivorous', 'insect_trap', 'enzyme_production']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_drowning_pitcher',
    seedling: 'plants/carnivorous/drowning_pitcher_young',
    mature: 'plants/carnivorous/drowning_pitcher_mature',
    harvest: 'items/herbs/drowning_pitcher'
  }
};

export const SNAP_MAW: PlantSpecies = {
  id: 'snap_maw',
  name: 'Snap-Maw',
  scientificName: 'Dionaea mordax',
  category: 'carnivorous',
  description: 'Oversized flytrap with jaws that snap shut faster than eye can follow. Occasionally catches small frogs.',
  lore: 'Snap-maws are flytraps that overachieved. Regular venus flytraps catch flies; snap-maws have ambitions. Frogs, small birds, occasionally a careless finger. Evolution via aggression.',
  biomes: ['wetland', 'swamp'],
  rarity: 'rare',

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 21,
        growthConditions: { waterlogged: true, sunlight: 0.7 },
        description: 'Seeds sprout in wet soil'
      },
      {
        name: 'trap_development',
        duration: 60,
        growthConditions: { insects: 'present' },
        description: 'Small traps form and practice'
      },
      {
        name: 'mature',
        duration: 90,
        harvestYield: { min: 1, max: 4 },
        description: 'Large traps, lightning reflexes'
      }
    ],
    maturityTime: 81,
    optimalTemperatureRange: [20, 30],
    optimalMoistureRange: [85, 100],
    requiresLowNitrogen: true
  },

  baseGenetics: {
    yieldAmount: 2.5,
    growthRate: 1.05,
    diseaseResistance: 0.7
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'whimsical', 'dark-fantasy'],
      magicType: 'reflex',
      potency: 0.8,
      stability: 0.5,
      effects: [
        {
          type: 'enhanced_reflexes',
          magnitude: 0.9,
          duration: 300,
          trigger: 'consume',
          description: 'Reaction time increases dramatically'
        },
        {
          type: 'catching_instinct',
          magnitude: 0.7,
          duration: 240,
          trigger: 'consume',
          description: 'Intuitive ability to catch thrown objects'
        },
        {
          type: 'bite_reflex',
          magnitude: 0.5,
          duration: 180,
          trigger: 'overconsumption',
          description: 'Involuntary snapping at movement'
        }
      ],
      harvestConditions: { recently_fed: false },
      magicDecaysAfter: 2,
      preservationMethod: 'keep trap mechanism active in water'
    }
  },

  environmentalInteractions: {
    soilPreference: ['wetland', 'bog'],
    companions: [],
    inhibits: ['insects', 'small_creatures'],
    specialProperties: ['carnivorous', 'rapid_movement', 'mechanosensitive']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_snap_maw',
    seedling: 'plants/carnivorous/snap_maw_young',
    mature: 'plants/carnivorous/snap_maw_mature',
    harvest: 'items/herbs/snap_maw'
  }
};

// ============================================================================
// WETLAND HERBS & REEDS
// ============================================================================

export const MARSH_MALLOW: PlantSpecies = {
  id: 'marsh_mallow',
  name: 'Marsh Mallow',
  scientificName: 'Althaea officinalis',
  category: 'herb',
  description: 'Soft pink flowers and mucilaginous roots. The original source of marshmallow confection, before corn syrup committed identity theft.',
  lore: 'Ancient healers used marsh mallow for everything: sore throats, burns, inflammation. Modern confectioners turned it into sugar foam. The plant is diplomatically silent about this betrayal.',
  biomes: ['wetland', 'marsh'],
  rarity: 'common',

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 14,
        growthConditions: { moisture: 0.8, temperature: [15, 25] },
        description: 'Seeds germinate in wet soil'
      },
      {
        name: 'vegetative',
        duration: 90,
        growthConditions: { waterlogged: true },
        description: 'Leaves and stems develop'
      },
      {
        name: 'flowering',
        duration: 30,
        harvestYield: { min: 4, max: 12 },
        description: 'Pink flowers, mucilaginous roots'
      }
    ],
    maturityTime: 104,
    optimalTemperatureRange: [18, 28],
    optimalMoistureRange: [75, 95],
    perennial: true
  },

  baseGenetics: {
    yieldAmount: 8,
    growthRate: 1.15,
    diseaseResistance: 0.77
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    medicinal: {
      activeCompounds: ['mucilage', 'althaeic_acid'],
      effects: [
        { condition: 'sore_throat', efficacy: 0.9, preparation: 'tea' },
        { condition: 'inflammation', efficacy: 0.8, preparation: 'poultice' },
        { condition: 'burns', efficacy: 0.7, preparation: 'salve' },
        { condition: 'digestive_irritation', efficacy: 0.8, preparation: 'tea' }
      ],
      toxicity: 0.0,
      preparation: ['tea', 'poultice', 'salve', 'raw']
    },
    edible: {
      nutrition: 25,
      taste: 'mild, slightly sweet',
      cookingRequired: false,
      shelfLife: 14
    }
  },

  environmentalInteractions: {
    soilPreference: ['marsh', 'wetland'],
    companions: ['cattails', 'reeds'],
    inhibits: [],
    specialProperties: ['mucilaginous', 'soothing']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_marsh_mallow',
    seedling: 'plants/herbs/marsh_mallow_young',
    mature: 'plants/herbs/marsh_mallow_flowering',
    harvest: 'items/herbs/marsh_mallow'
  }
};

export const FEVER_BULRUSH: PlantSpecies = {
  id: 'fever_bulrush',
  name: 'Fever Bulrush',
  scientificName: 'Scirpus febrifugus',
  category: 'reed',
  description: 'Tall wetland rushes whose pith contains powerful febrifuge compounds. Stems feel cool to touch even in summer heat.',
  lore: 'Fever bulrush grows in malarial swamps alongside the disease it treats, which is either cosmic irony or brilliant ecological design. The rushes don\'t philosophize—they just keep fevers down.',
  biomes: ['wetland', 'swamp', 'marsh'],
  rarity: 'uncommon',

  lifecycle: {
    stages: [
      {
        name: 'rhizome',
        duration: 30,
        growthConditions: { waterlogged: true, temperature: [15, 30] },
        description: 'Underground stems spread'
      },
      {
        name: 'shoots',
        duration: 21,
        growthConditions: { standing_water: true },
        description: 'Green shoots emerge from water'
      },
      {
        name: 'mature',
        duration: 60,
        harvestYield: { min: 6, max: 18 },
        description: 'Tall rushes with cool pith'
      }
    ],
    maturityTime: 51,
    optimalTemperatureRange: [20, 32],
    optimalMoistureRange: [90, 100],
    perennial: true
  },

  baseGenetics: {
    yieldAmount: 12,
    growthRate: 1.35,
    diseaseResistance: 0.87
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'standard'],
      magicType: 'cooling',
      potency: 0.6,
      stability: 0.8,
      effects: [
        {
          type: 'fever_reduction',
          magnitude: 0.9,
          duration: 360,
          trigger: 'consume',
          description: 'Rapidly reduces fever and infection'
        },
        {
          type: 'cooling_aura',
          magnitude: 0.5,
          duration: 240,
          trigger: 'proximity',
          description: 'Slight temperature reduction nearby'
        }
      ],
      harvestConditions: { swamp: true },
      magicDecaysAfter: 7,
      preservationMethod: 'dry in shade, keeps cool property'
    },
    medicinal: {
      activeCompounds: ['febrifugin', 'cooling_salicylates'],
      effects: [
        { condition: 'fever', efficacy: 0.95, preparation: 'tea' },
        { condition: 'malaria', efficacy: 0.7, preparation: 'tincture' },
        { condition: 'heat_stroke', efficacy: 0.8, preparation: 'compress' }
      ],
      toxicity: 0.1,
      preparation: ['tea', 'tincture', 'compress', 'poultice']
    }
  },

  environmentalInteractions: {
    soilPreference: ['swamp', 'marsh'],
    companions: ['mosquito_predators'],
    inhibits: [],
    specialProperties: ['temperature_regulation', 'disease_resistant']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_fever_bulrush',
    seedling: 'plants/reeds/fever_bulrush_shoots',
    mature: 'plants/reeds/fever_bulrush_mature',
    harvest: 'items/herbs/fever_bulrush'
  }
};

// ============================================================================
// MYSTICAL WETLAND FLORA
// ============================================================================

export const WILL_O_WISP_BLOOM: PlantSpecies = {
  id: 'will_o_wisp_bloom',
  name: "Will-o'-Wisp Bloom",
  scientificName: 'Phosphorus erratus',
  category: 'flower',
  description: 'Pale flowers that emit ghostly phosphorescent light at night. Allegedly lead travelers astray—or to safety, depending on the flower\'s mood.',
  lore: 'Will-o\'-wisp blooms glow with bog gases and bioluminescence, creating lights that drift through swamps. They don\'t lead travelers anywhere—they just glow. That travelers follow is not the flower\'s responsibility.',
  biomes: ['wetland', 'swamp', 'bog'],
  rarity: 'rare',

  lifecycle: {
    stages: [
      {
        name: 'seed',
        duration: 21,
        growthConditions: { bog: true, decay: 'high' },
        description: 'Seeds require decaying matter'
      },
      {
        name: 'growth',
        duration: 60,
        growthConditions: { methane: 'present', darkness: 0.5 },
        description: 'Stems develop gas-collection structures'
      },
      {
        name: 'blooming',
        duration: 14,
        harvestYield: { min: 2, max: 5 },
        description: 'Glowing flowers emit marsh light'
      }
    ],
    maturityTime: 81,
    optimalTemperatureRange: [12, 25],
    optimalMoistureRange: [95, 100],
    requiresDecay: true
  },

  baseGenetics: {
    yieldAmount: 3.5,
    growthRate: 0.95,
    diseaseResistance: 0.6
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'whimsical', 'dark-fantasy'],
      magicType: 'illusion',
      potency: 0.7,
      stability: 0.4,
      effects: [
        {
          type: 'ghostly_light',
          magnitude: 0.8,
          duration: 0,
          trigger: 'nighttime',
          description: 'Emit phosphorescent glow at night'
        },
        {
          type: 'misdirection',
          magnitude: 0.6,
          duration: 180,
          trigger: 'follow_light',
          description: 'Become lost, lose sense of direction'
        },
        {
          type: 'bioluminescence',
          magnitude: 0.7,
          duration: 240,
          trigger: 'consume',
          description: 'Glow softly in darkness'
        }
      ],
      harvestConditions: { timeOfDay: 'night', moonless: true },
      magicDecaysAfter: 1,
      preservationMethod: 'store in sealed glass with bog gas'
    }
  },

  environmentalInteractions: {
    soilPreference: ['bog', 'swamp'],
    companions: ['decomposers'],
    inhibits: [],
    specialProperties: ['phosphorescent', 'methane_collector', 'navigation_hazard']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_wisp_bloom',
    seedling: 'plants/flowers/wisp_bloom_young',
    mature: 'plants/flowers/wisp_bloom_glowing',
    harvest: 'items/herbs/wisp_bloom'
  }
};

export const MEMORY_REED: PlantSpecies = {
  id: 'memory_reed',
  name: 'Memory Reed',
  scientificName: 'Phragmites memoriae',
  category: 'reed',
  description: 'Wetland reeds that rustle with voices of the past. Each reed remembers everything said near the water where it grows.',
  lore: 'Confess secrets to memory reeds at your peril. They remember everything and whisper it to anyone who listens. The reeds aren\'t malicious—they just have terrible boundaries.',
  biomes: ['wetland', 'marsh'],
  rarity: 'uncommon',

  lifecycle: {
    stages: [
      {
        name: 'rhizome',
        duration: 21,
        growthConditions: { standing_water: true, voices: 'present' },
        description: 'Roots establish in vocal areas'
      },
      {
        name: 'shoots',
        duration: 30,
        growthConditions: { water: true },
        description: 'Hollow stems emerge'
      },
      {
        name: 'mature',
        duration: 90,
        harvestYield: { min: 5, max: 15 },
        description: 'Tall reeds, memory-saturated'
      }
    ],
    maturityTime: 51,
    optimalTemperatureRange: [15, 28],
    optimalMoistureRange: [85, 100],
    perennial: true
  },

  baseGenetics: {
    yieldAmount: 10,
    growthRate: 1.25,
    diseaseResistance: 0.77
  ,
    droughtTolerance: 50,
    coldTolerance: 50,
    flavorProfile: 50},

  properties: {
    magical: {
      universeTypes: ['high-magic', 'standard', 'whimsical'],
      magicType: 'memory',
      potency: 0.7,
      stability: 0.6,
      effects: [
        {
          type: 'sound_memory',
          magnitude: 0.8,
          duration: 0,
          trigger: 'wind',
          description: 'Whispers remembered conversations'
        },
        {
          type: 'perfect_recall',
          magnitude: 0.7,
          duration: 240,
          trigger: 'consume',
          description: 'Remember conversations verbatim'
        },
        {
          type: 'eavesdropping',
          magnitude: 0.6,
          duration: 360,
          trigger: 'listen',
          description: 'Hear past conversations from the area'
        }
      ],
      harvestConditions: { wind: 'gentle' },
      magicDecaysAfter: 14,
      preservationMethod: 'bundle and store near where secrets were told'
    }
  },

  environmentalInteractions: {
    soilPreference: ['marsh', 'wetland'],
    companions: ['whispering_plants'],
    inhibits: [],
    specialProperties: ['sound_recording', 'privacy_violation', 'acoustic_memory']
  },

  spriteMapping: {
    seed: 'items/seeds/seed_memory_reed',
    seedling: 'plants/reeds/memory_reed_shoots',
    mature: 'plants/reeds/memory_reed_mature',
    harvest: 'items/herbs/memory_reed'
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export const WETLAND_PLANTS: PlantSpecies[] = [
  DROWNING_PITCHER,
  SNAP_MAW,
  MARSH_MALLOW,
  FEVER_BULRUSH,
  WILL_O_WISP_BLOOM,
  MEMORY_REED
];
