/**
 * Tile Construction Spells - Magic spells for instant tile-based building
 *
 * These spells allow mages to instantly place walls, doors, and windows
 * without the normal construction process (no material gathering, no build time).
 *
 * Cost is based on:
 * - Tile type: walls < doors < windows
 * - Material quality: common < rare materials
 *
 * Per VOXEL_BUILDING_SPEC.md Phase 8: Magic Integration
 */

import type { SpellDefinition } from './SpellRegistry.js';

// ============================================================================
// TILE CONSTRUCTION SPELLS
// ============================================================================

/**
 * Tile construction spells for the Architecture skill tree.
 * Available to Academic, Craft, and Divine paradigms.
 */
export const TILE_CONSTRUCTION_SPELLS: SpellDefinition[] = [
  // === Create Wall Spell ===
  {
    id: 'create_wall_tile',
    name: 'Conjure Wall',
    paradigmId: 'academic',
    technique: 'create',
    form: 'earth',
    source: 'arcane',
    manaCost: 20,
    castTime: 15, // Quick cast for single tile
    range: 5,
    effectId: 'create_wall_tile_effect',
    description:
      'Instantly conjure a wall tile at a target location. The wall appears fully formed, ' +
      'requiring no construction time or materials. Material type depends on caster proficiency. ' +
      'Novices create wood walls; masters can conjure stone or metal.',
    school: 'creation',
    baseMishapChance: 0.05,
    hotkeyable: true,
    icon: '🧱',
    tags: ['creation', 'construction', 'wall', 'tile', 'architecture'],
    creatorDetection: {
      detectionRisk: 'low',
      forbiddenCategories: [],
      powerLevel: 2,
      leavesMagicalSignature: false,
      detectionNotes: 'Single wall placement is minor reality manipulation. Barely noticeable.',
    },
  },

  // === Create Door Spell ===
  {
    id: 'create_door_tile',
    name: 'Conjure Door',
    paradigmId: 'academic',
    technique: 'create',
    form: 'earth',
    source: 'arcane',
    manaCost: 30,
    castTime: 20,
    range: 5,
    effectId: 'create_door_tile_effect',
    description:
      'Instantly conjure a door tile at a target location. The door appears closed and functional. ' +
      'Can be placed in existing walls to create passages. Material type depends on caster proficiency.',
    school: 'creation',
    baseMishapChance: 0.06,
    hotkeyable: true,
    icon: '🚪',
    tags: ['creation', 'construction', 'door', 'tile', 'architecture'],
    creatorDetection: {
      detectionRisk: 'low',
      forbiddenCategories: [],
      powerLevel: 2,
      leavesMagicalSignature: false,
      detectionNotes: 'Door creation is slightly more complex than walls due to moving parts.',
    },
  },

  // === Create Window Spell ===
  {
    id: 'create_window_tile',
    name: 'Conjure Window',
    paradigmId: 'academic',
    technique: 'create',
    form: 'earth',
    source: 'arcane',
    manaCost: 35,
    castTime: 25,
    range: 5,
    effectId: 'create_window_tile_effect',
    description:
      'Instantly conjure a window tile at a target location. The window allows light through ' +
      'but blocks movement. Can be placed in existing walls. Glass quality depends on caster proficiency.',
    school: 'creation',
    baseMishapChance: 0.08,
    hotkeyable: true,
    icon: '🪟',
    tags: ['creation', 'construction', 'window', 'tile', 'architecture'],
    creatorDetection: {
      detectionRisk: 'low',
      forbiddenCategories: [],
      powerLevel: 2,
      leavesMagicalSignature: false,
      detectionNotes: 'Window creation requires more precision for the transparent material.',
    },
  },

  // === Demolish Tile Spell ===
  {
    id: 'demolish_tile',
    name: 'Demolish Structure',
    paradigmId: 'academic',
    technique: 'destroy',
    form: 'earth',
    source: 'arcane',
    manaCost: 15,
    castTime: 10,
    range: 5,
    effectId: 'demolish_tile_effect',
    description:
      'Instantly destroy a wall, door, or window tile at the target location. ' +
      'Returns 50% of materials as debris. Useful for remodeling or emergency escape.',
    school: 'destruction',
    baseMishapChance: 0.03,
    hotkeyable: true,
    icon: '💥',
    tags: ['destruction', 'demolition', 'tile', 'architecture'],
    creatorDetection: {
      detectionRisk: 'low',
      forbiddenCategories: [],
      powerLevel: 1,
      leavesMagicalSignature: false,
      detectionNotes: 'Destruction is simpler than creation. Less suspicious.',
    },
  },

  // === Create Wall Line Spell (Advanced) ===
  {
    id: 'create_wall_line',
    name: 'Raise Wall',
    paradigmId: 'academic',
    technique: 'create',
    form: 'earth',
    source: 'arcane',
    manaCost: 80,
    castTime: 60,
    range: 8,
    effectId: 'create_wall_line_effect',
    description:
      'Conjure a line of wall tiles from your position to the target. ' +
      'Creates up to 8 connected wall tiles instantly. Ideal for rapid fortification.',
    school: 'creation',
    baseMishapChance: 0.10,
    hotkeyable: true,
    icon: '🏰',
    tags: ['creation', 'construction', 'wall', 'tile', 'architecture', 'line'],
    prerequisites: ['create_wall_tile'],
    minProficiency: 30,
    creatorDetection: {
      detectionRisk: 'moderate',
      forbiddenCategories: [],
      powerLevel: 4,
      leavesMagicalSignature: true,
      detectionNotes: 'Creating multiple tiles at once is more noticeable.',
    },
  },

  // === Create Room Spell (Master) ===
  {
    id: 'create_room',
    name: 'Architect\'s Manifestation',
    paradigmId: 'academic',
    technique: 'create',
    form: 'earth',
    source: 'arcane',
    manaCost: 200,
    castTime: 120,
    range: 10,
    effectId: 'create_room_effect',
    description:
      'Conjure an entire room of walls with a door. Creates a rectangular enclosure ' +
      'of the specified size (3x3 to 8x8 interior). The door is placed facing the caster.',
    school: 'creation',
    baseMishapChance: 0.15,
    hotkeyable: false,
    icon: '🏠',
    tags: ['creation', 'construction', 'room', 'tile', 'architecture', 'advanced'],
    prerequisites: ['create_wall_line', 'create_door_tile'],
    minProficiency: 60,
    creatorDetection: {
      detectionRisk: 'high',
      forbiddenCategories: ['academic_study'],
      powerLevel: 6,
      leavesMagicalSignature: true,
      detectionNotes: 'Creating entire rooms draws attention from the Supreme Creator.',
    },
  },
];

// ============================================================================
// DIVINE VARIANTS
// ============================================================================

/**
 * Divine paradigm versions - powered by deity favor.
 * Architecture gods especially favor these spells.
 */
export const DIVINE_TILE_CONSTRUCTION_SPELLS: SpellDefinition[] = TILE_CONSTRUCTION_SPELLS.map(spell => ({
  ...spell,
  id: spell.id.replace('academic', 'divine').replace('create_', 'divine_create_'),
  paradigmId: 'divine',
  source: 'divine' as const,
  manaCost: Math.floor(spell.manaCost * 0.8), // 20% cheaper with divine favor
  description: spell.description + ' Blessed by gods of architecture, craft, or civilization.',
  creatorDetection: {
    ...spell.creatorDetection!,
    detectionRisk: 'low' as const,
    detectionNotes: 'God-sanctioned construction. The Supreme Creator respects divine jurisdiction.',
  },
}));

// ============================================================================
// CRAFT VARIANTS
// ============================================================================

/**
 * Craft paradigm versions - requires material components but cheaper.
 */
export const CRAFT_TILE_CONSTRUCTION_SPELLS: SpellDefinition[] = TILE_CONSTRUCTION_SPELLS.map(spell => ({
  ...spell,
  id: spell.id.replace('academic', 'craft').replace('create_', 'craft_create_'),
  paradigmId: 'craft',
  source: 'nature' as const,
  manaCost: Math.floor(spell.manaCost * 0.5), // 50% cheaper with material components
  castTime: spell.castTime * 1.5, // But 50% slower
  baseMishapChance: spell.baseMishapChance! * 0.3, // Much safer with materials
  description: spell.description + ' Requires a sample of the target material as component.',
  creatorDetection: {
    ...spell.creatorDetection!,
    detectionRisk: 'low' as const,
    detectionNotes: 'Craft-based construction transforms existing materials. Natural and subtle.',
  },
}));

// ============================================================================
// EXPORT ALL SPELLS
// ============================================================================

export const ALL_TILE_CONSTRUCTION_SPELLS: SpellDefinition[] = [
  ...TILE_CONSTRUCTION_SPELLS,
  ...DIVINE_TILE_CONSTRUCTION_SPELLS,
  ...CRAFT_TILE_CONSTRUCTION_SPELLS,
];

/**
 * Get wall material based on caster proficiency.
 * Higher proficiency unlocks better materials.
 */
export function getWallMaterialForProficiency(proficiency: number): string {
  if (proficiency >= 80) return 'metal';
  if (proficiency >= 60) return 'stone';
  if (proficiency >= 40) return 'mud_brick';
  if (proficiency >= 20) return 'thatch';
  return 'wood';
}

/**
 * Get door material based on caster proficiency.
 */
export function getDoorMaterialForProficiency(proficiency: number): string {
  if (proficiency >= 70) return 'metal';
  if (proficiency >= 40) return 'stone';
  return 'wood';
}

/**
 * Get window material based on caster proficiency.
 */
export function getWindowMaterialForProficiency(proficiency: number): string {
  if (proficiency >= 60) return 'glass';
  if (proficiency >= 30) return 'hide';
  return 'cloth';
}
