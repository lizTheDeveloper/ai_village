/**
 * Magical Buildings
 *
 * Buildings that interact with the magic paradigm system.
 * These buildings provide magical effects, paradigm bonuses,
 * and integrate with the core magic systems.
 *
 * MATERIAL-DRIVEN EFFECTS:
 * Building effects are now derived from their construction materials.
 * A crystal mana well provides mana regen because crystal conducts magic.
 * A blood shrine is terrifying because blood material has that atmosphere.
 *
 * See material-effects.ts for the full material property database.
 *
 * Integration with packages/core/src/magic/:
 * - Paradigm affinities align with ParadigmTypes.ts
 * - Effects align with SpellEffect.ts categories
 * - Feng shui elements align with FengShuiSkillTree.ts
 */

import { VoxelBuildingDefinition, MagicParadigm, MagicalEffect } from './types';
import {
  Material,
  MATERIAL_EFFECTS,
  calculateBuildingEffects,
  getDominantParadigm,
  getMoodModifier,
  getAtmosphere,
} from './material-effects';

// =============================================================================
// MATERIAL-BASED BUILDING HELPERS
// =============================================================================

/**
 * Calculate building dimensions from layout
 */
function getBuildingSize(layout: string[], floors?: number): { width: number; height: number; floors: number } {
  return {
    width: Math.max(...layout.map(row => row.length)),
    height: layout.length,
    floors: floors ?? 1,
  };
}

/**
 * Create a magic building with effects automatically calculated from materials.
 * Explicit magicalEffects in overrides will be merged with calculated ones.
 */
export function createMagicBuilding(
  base: Omit<VoxelBuildingDefinition, 'magicalEffects'> & {
    materials: { wall: Material; floor: Material; door: Material };
    magicalEffects?: MagicalEffect[];
  }
): VoxelBuildingDefinition {
  const size = getBuildingSize(base.layout, base.floors?.length);

  // Calculate effects from materials
  const calculatedEffects = calculateBuildingEffects(
    base.materials as { wall: Material; floor: Material; door: Material },
    size
  );

  // Merge with any explicit effects (explicit takes precedence for same type)
  const explicitEffects = base.magicalEffects ?? [];
  const explicitTypes = new Set(explicitEffects.map(e => `${e.type}-${e.paradigm ?? ''}-${e.element ?? ''}`));

  const mergedEffects = [
    ...explicitEffects,
    ...calculatedEffects.filter(e =>
      !explicitTypes.has(`${e.type}-${e.paradigm ?? ''}-${e.element ?? ''}`)
    ),
  ];

  return {
    ...base,
    magicalEffects: mergedEffects,
  } as VoxelBuildingDefinition;
}

/**
 * Get a description of what effects a material combination would provide
 */
export function describeMaterialEffects(
  materials: { wall: Material; floor: Material; door: Material }
): string {
  const wallProps = MATERIAL_EFFECTS[materials.wall];
  const floorProps = MATERIAL_EFFECTS[materials.floor];
  const doorProps = MATERIAL_EFFECTS[materials.door];

  const lines: string[] = [];

  const dominant = getDominantParadigm(materials);
  if (dominant) {
    lines.push(`Paradigm affinity: ${dominant}`);
  }

  const mood = getMoodModifier(materials);
  if (Math.abs(mood) > 5) {
    lines.push(`Mood effect: ${mood > 0 ? '+' : ''}${mood.toFixed(0)}`);
  }

  const atmosphere = getAtmosphere(materials);
  if (atmosphere !== 'neutral') {
    lines.push(`Atmosphere: ${atmosphere}`);
  }

  // Special effects
  const specials = [
    ...wallProps.specialEffects,
    ...floorProps.specialEffects,
    ...doorProps.specialEffects,
  ];
  if (specials.length > 0) {
    lines.push(`Special: ${specials.map(s => s.type).join(', ')}`);
  }

  return lines.join('\n');
}

// =============================================================================
// CORE MAGIC BUILDINGS (Academic Paradigm)
// =============================================================================

/**
 * Mana Well - Basic mana regeneration structure
 * A crystalline fountain that draws ambient magical energy.
 *
 * Materials: Crystal walls conduct magic and provide +2.0 mana regen.
 * The marble floor adds divine affinity and calming atmosphere.
 */
export const MANA_WELL: VoxelBuildingDefinition = createMagicBuilding({
  id: 'mana_well',
  name: 'Mana Well',
  description: 'A crystalline fountain that gathers and radiates magical energy, enhancing mana regeneration for nearby mages.',
  category: 'research',
  tier: 2,
  species: 'medium',
  layout: [
    '  ###  ',
    ' #~~~# ',
    '#~~~~~#',
    '#~~◊~~#',
    '#~~~~~#',
    ' #~~~# ',
    '  #D#  ',
  ],
  // Crystal walls = +2.0 mana regen, +15 spell power, academic affinity
  // Marble floor = divine affinity, +15 mood, calming
  materials: { wall: 'crystal', floor: 'marble', door: 'silver' },
  functionality: [
    { type: 'mana_well', params: { regenBonus: 2.0, radius: 15 } },
  ],
  paradigmAffinity: ['academic'],
  elementalAttunement: 'water',
  capacity: 0,
  style: 'arcane',
  lore: 'The well draws upon leyline energy, concentrating it into a form mages can absorb. The crystal walls amplify and purify the raw magical essence.',
});

/**
 * Leyline Nexus - Major magical power node
 * Built where multiple leylines intersect.
 */
export const LEYLINE_NEXUS: VoxelBuildingDefinition = {
  id: 'leyline_nexus',
  name: 'Leyline Nexus',
  description: 'A powerful structure built at the intersection of magical leylines, dramatically amplifying all magic in the area.',
  category: 'research',
  tier: 4,
  species: 'tall',
  layout: [
    '    #####    ',
    '  ##.....##  ',
    ' #.........# ',
    '#....~~~....#',
    '#...~~~~~...#',
    '#..~~~◊~~~..#',
    '#...~~~~~...#',
    '#....~~~....#',
    ' #.........# ',
    '  ##.....##  ',
    '    ##D##    ',
  ],
  floors: [
    {
      level: 1,
      name: 'Observation Platform',
      ceilingHeight: 6,
      layout: [
        '    #####    ',
        '  ##WWWWW##  ',
        ' #W.......W# ',
        '#W.........W#',
        '#W....^....W#',
        '#W.........W#',
        '#W.........W#',
        ' #W.......W# ',
        '  ##WWWWW##  ',
        '    #####    ',
      ],
    },
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'leyline_tap', params: { powerMultiplier: 3.0, radius: 30 } },
    { type: 'paradigm_amplifier', params: { paradigm: 'academic', bonus: 50 } },
    { type: 'research', params: { bonus: 2.0, fields: ['arcane', 'leyline_theory'] } },
  ],
  magicalEffects: [
    { type: 'mana_regen', magnitude: 5.0, radius: 30 },
    { type: 'spell_power', magnitude: 25, radius: 25 },
    { type: 'cost_reduction', magnitude: 15, radius: 20 },
    { type: 'range_extension', magnitude: 20, radius: 20 },
  ],
  paradigmAffinity: ['academic', 'dimensional'],
  elementalAttunement: 'water',
  capacity: 5,
  style: 'arcane',
  lore: 'Where leylines cross, reality grows thin. The Nexus harnesses this confluence, creating a beacon of magical power visible to those with the sight.',
};

/**
 * Spell Focus Tower - Casting enhancement
 */
export const SPELL_FOCUS_TOWER: VoxelBuildingDefinition = {
  id: 'spell_focus_tower',
  name: 'Spell Focus Tower',
  description: 'A tall tower designed to focus and amplify spellcasting, with enchanted crystals that reduce casting costs.',
  category: 'research',
  tier: 3,
  species: 'tall',
  layout: [
    ' ##### ',
    '#.....#',
    '#..K..#',
    '#.....#',
    '#..^..#',
    '###D###',
  ],
  floors: [
    {
      level: 1,
      name: 'Focus Chamber',
      ceilingHeight: 5,
      layout: [
        ' ##### ',
        '#WWWWW#',
        '#W.v.W#',
        '#W...W#',
        '###^###',
      ],
    },
    {
      level: 2,
      name: 'Crystal Apex',
      ceilingHeight: 8,
      layout: [
        '  ###  ',
        ' #...# ',
        '#..◊..#',
        ' #...# ',
        '  #v#  ',
      ],
    },
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'wood' },
  functionality: [
    { type: 'spell_focus', params: { costReduction: 20, rangeBonus: 30 } },
  ],
  magicalEffects: [
    { type: 'cost_reduction', magnitude: 20, radius: 0 },
    { type: 'range_extension', magnitude: 30, radius: 0 },
    { type: 'cast_speed', magnitude: 10, radius: 10 },
  ],
  paradigmAffinity: ['academic'],
  capacity: 3,
  style: 'arcane',
  lore: 'The crystalline apex catches and focuses ambient magic, allowing spellcasters within to achieve feats normally beyond their reach.',
};

// =============================================================================
// DIVINE MAGIC BUILDINGS
// =============================================================================

/**
 * Sacred Shrine - Basic divine magic focus
 */
export const SACRED_SHRINE: VoxelBuildingDefinition = {
  id: 'sacred_shrine',
  name: 'Sacred Shrine',
  description: 'A small shrine dedicated to divine powers, granting favor to the faithful and providing minor healing.',
  category: 'community',
  tier: 1,
  species: 'medium',
  layout: [
    ' ### ',
    '#...#',
    '#.T.#',
    '#...#',
    '##D##',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'wood' },
  functionality: [
    { type: 'spirit_anchor', params: { spiritType: 'divine', capacity: 1 } },
    { type: 'mood_aura', params: { bonus: 10, radius: 8 } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 10, radius: 10, paradigm: 'divine' },
    { type: 'protection', magnitude: 5, radius: 8 },
  ],
  paradigmAffinity: ['divine'],
  elementalAttunement: 'fire',
  capacity: 5,
  style: 'divine',
  lore: 'Even the smallest shrine can serve as a conduit for divine grace. The faithful who pray here find their spirits lifted.',
};

/**
 * Temple of Miracles - Major divine magic center
 */
export const TEMPLE_OF_MIRACLES: VoxelBuildingDefinition = {
  id: 'temple_of_miracles',
  name: 'Temple of Miracles',
  description: 'A grand temple where divine magic flows freely, enabling miracles and granting powerful blessings.',
  category: 'community',
  tier: 4,
  species: 'tall',
  layout: [
    '  #########  ',
    ' ##.......## ',
    '##...SSS...##',
    '#....SSS....#',
    '#.S.......S.#',
    '#.S...T...S.#',
    '#.S.......S.#',
    '#....SSS....#',
    '##...SSS...##',
    ' ##.......## ',
    '  ####D####  ',
  ],
  floors: [
    {
      level: 1,
      name: 'Bell Tower',
      ceilingHeight: 10,
      layout: [
        '  #####  ',
        ' #WWWWW# ',
        '#W.....W#',
        '#W..v..W#',
        '#W.....W#',
        ' #WWWWW# ',
        '  #####  ',
      ],
    },
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'spirit_anchor', params: { spiritType: 'divine', capacity: 5 } },
    { type: 'paradigm_amplifier', params: { paradigm: 'divine', bonus: 40 } },
    { type: 'mood_aura', params: { bonus: 25, radius: 25 } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 40, radius: 30, paradigm: 'divine' },
    { type: 'protection', magnitude: 20, radius: 25 },
    { type: 'mana_regen', magnitude: 2.0, radius: 20 }, // Divine favor regen
  ],
  paradigmAffinity: ['divine', 'belief'],
  elementalAttunement: 'fire',
  capacity: 30,
  style: 'divine',
  lore: 'The Temple stands as a beacon of faith. Within these walls, prayers are answered and miracles manifest for the truly devoted.',
};

// =============================================================================
// SHINTO / KAMI BUILDINGS
// =============================================================================

/**
 * Kami Shrine - Spirit house for kami
 *
 * Materials: Bamboo walls attract kami spirits and have shinto affinity.
 * Living wood floor maintains connection to nature. Bamboo door completes the harmony.
 */
export const KAMI_SHRINE: VoxelBuildingDefinition = createMagicBuilding({
  id: 'kami_shrine',
  name: 'Kami Shrine',
  description: 'A traditional shrine that attracts and houses kami spirits, who bless the surrounding area.',
  category: 'community',
  tier: 2,
  species: 'medium',
  layout: [
    '   ###   ',
    '  #...#  ',
    ' #.....# ',
    '#...T...#',
    '#.......#',
    ' #.....# ',
    '  ##D##  ',
  ],
  // Bamboo = shinto +15, spirit_attraction, calming
  // Living wood = shinto +25, alive, comforting
  materials: { wall: 'bamboo', floor: 'living_wood', door: 'bamboo' },
  functionality: [
    { type: 'spirit_anchor', params: { spiritType: 'kami', capacity: 3, kamiTypes: ['nature', 'place', 'ancestor'] } },
    { type: 'mood_aura', params: { bonus: 15, radius: 15 } },
  ],
  paradigmAffinity: ['shinto'],
  elementalAttunement: 'wood',
  capacity: 10,
  style: 'rustic',
  lore: 'The kami are everywhere, but they prefer places of beauty and respect. The living bamboo and wood invite them to dwell and share their blessings.',
});

/**
 * Torii Gate - Threshold between realms
 */
export const TORII_GATE: VoxelBuildingDefinition = {
  id: 'torii_gate',
  name: 'Torii Gate',
  description: 'A sacred gate marking the boundary between mundane and sacred space, purifying all who pass through.',
  category: 'decoration',
  tier: 1,
  species: 'tall',
  layout: [
    '#.....#',
    '#######',
    '#.....#',
    '..D.D..',
  ],
  materials: { wall: 'wood', floor: 'stone', door: 'wood' },
  functionality: [
    { type: 'ward', params: { type: 'purification', strength: 20 } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 10, radius: 5, paradigm: 'shinto' },
    { type: 'corruption_resist', magnitude: 30, radius: 10 },
  ],
  paradigmAffinity: ['shinto', 'threshold'],
  elementalAttunement: 'wood',
  capacity: 0,
  style: 'rustic',
  lore: 'The torii marks the transition from the profane to the sacred. Evil spirits cannot pass, and the pure find their burdens lightened.',
};

// =============================================================================
// DREAM MAGIC BUILDINGS
// =============================================================================

/**
 * Dream Sanctuary - Oneiromancy focus
 *
 * Materials: Dream-stuff walls blur reality, moonlight floor induces lunar dreams,
 * and mist door marks the threshold between waking and sleeping.
 */
export const DREAM_SANCTUARY: VoxelBuildingDefinition = createMagicBuilding({
  id: 'dream_sanctuary',
  name: 'Dream Sanctuary',
  description: 'A quiet sanctuary designed for dream magic, with beds arranged for lucid dreaming and shared visions.',
  category: 'research',
  tier: 3,
  species: 'medium',
  layout: [
    '#########',
    '#B.....B#',
    '#.......#',
    '#...T...#',
    '#.......#',
    '#B.....B#',
    '####D####',
  ],
  // Dreams = dream +50, dream_induction, illusion_enhancement, dreamy atmosphere
  // Moonlight = dream +30, spirit_attraction, lunar dreams
  // Mist = threshold +25, dream +20, blurs boundaries
  materials: { wall: 'dreams', floor: 'moonlight', door: 'mist' },
  functionality: [
    { type: 'dream_anchor', params: { stability: 80, sharedDreaming: true } },
    { type: 'sleeping', params: { beds: 4, restQuality: 1.5 } },
  ],
  paradigmAffinity: ['dream'],
  elementalAttunement: 'water',
  capacity: 4,
  style: 'ethereal',
  lore: 'Within these walls of crystallized thought, the boundary between waking and dreaming dissolves. Sleepers here may walk the realms of dream with purpose.',
});

/**
 * Nightmare Ward - Protection from dark dreams
 *
 * Materials: Silver walls repel malevolent spirits and provide corruption resistance.
 * Sunlight floor banishes darkness. Iron door blocks fae and dream entities.
 */
export const NIGHTMARE_WARD: VoxelBuildingDefinition = createMagicBuilding({
  id: 'nightmare_ward',
  name: 'Nightmare Ward',
  description: 'A protective structure that shields the area from nightmare incursions and dark dream entities.',
  category: 'military',
  tier: 3,
  species: 'medium',
  layout: [
    ' ##### ',
    '#.....#',
    '#..K..#',
    '#.....#',
    '###D###',
  ],
  // Silver = spirit_repulsion +20, corruption_resistance +25, divine +15
  // Sunlight = spirit_repulsion +30, healing_aura, corruption_resistance +40
  // Iron = spirit_repulsion +30 (cold iron repels fae)
  materials: { wall: 'silver', floor: 'sunlight', door: 'iron' },
  functionality: [
    { type: 'ward', params: { type: 'nightmare', strength: 50, radius: 25 } },
  ],
  paradigmAffinity: ['dream'],
  capacity: 2,
  style: 'arcane',
  lore: 'The ward burns with cold silver light during the night, its sunlit floor and iron threshold a beacon that repels the creatures that hunt through dreams.',
});

// =============================================================================
// SONG / BARDIC MAGIC BUILDINGS
// =============================================================================

/**
 * Harmony Hall - Bardic magic amplifier
 *
 * Materials: Music walls resonate with supernatural power, amplifying bardic spells.
 * Carpet floor dampens unwanted echoes. Bronze doors ring with perfect pitch.
 */
export const HARMONY_HALL: VoxelBuildingDefinition = createMagicBuilding({
  id: 'harmony_hall',
  name: 'Harmony Hall',
  description: 'A performance hall with perfect acoustics, where bardic magic resonates with supernatural power.',
  category: 'community',
  tier: 3,
  species: 'tall',
  layout: [
    '###########',
    '#.........#',
    '#...CCC...#',
    '#.........#',
    '#T.......T#',
    '#.........#',
    '#.........#',
    '#.........#',
    '####DDD####',
  ],
  // Music = song +60, sound_amplification, emotion_amplification, euphoric
  // Carpet = sound_dampening (controls echoes), comforting, +10 mood
  // Bronze = allomancy (Seeker detects magic), metal element
  materials: { wall: 'music', floor: 'carpet', door: 'bronze' },
  functionality: [
    { type: 'song_amplifier', params: { powerBonus: 40, harmonyBonus: 25 } },
    { type: 'mood_aura', params: { bonus: 20, radius: 30 } },
  ],
  paradigmAffinity: ['song'],
  elementalAttunement: 'metal',
  capacity: 50,
  style: 'rustic',
  lore: 'The Hall was designed by a legendary bard-architect who understood that space itself can be an instrument. Its walls hum with frozen music.',
});

/**
 * Echo Chamber - Sound magic focus
 */
export const ECHO_CHAMBER: VoxelBuildingDefinition = {
  id: 'echo_chamber',
  name: 'Echo Chamber',
  description: 'A domed chamber where sounds persist and echo with magical properties, perfect for voice-based magic.',
  category: 'research',
  tier: 2,
  species: 'tall',
  layout: [
    '  #####  ',
    ' #.....# ',
    '#.......#',
    '#...T...#',
    '#.......#',
    ' #.....# ',
    '  ##D##  ',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'wood' },
  functionality: [
    { type: 'song_amplifier', params: { echoStrength: 3, duration: 60 } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 20, radius: 0, paradigm: 'song' },
    { type: 'paradigm_bonus', magnitude: 15, radius: 0, paradigm: 'name' },
    { type: 'duration_extension', magnitude: 50, radius: 0 },
  ],
  paradigmAffinity: ['song', 'name', 'echo'],
  elementalAttunement: 'metal',
  capacity: 5,
  style: 'ancient',
  lore: 'Words spoken here do not die. They linger, repeating in harmonics that can last for days—or forever, if spoken with power.',
};

// =============================================================================
// RUNE MAGIC BUILDINGS
// =============================================================================

/**
 * Rune Forge - Inscription crafting
 */
export const RUNE_FORGE: VoxelBuildingDefinition = {
  id: 'rune_forge',
  name: 'Rune Forge',
  description: 'A workshop for carving magical runes, with specialized tools and enhanced inscription surfaces.',
  category: 'production',
  tier: 3,
  species: 'short', // Dwarven specialty
  layout: [
    '##########',
    '#K.......#',
    '#........#',
    '#...FF...#',
    '#........#',
    '#....T...#',
    '####DD####',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'rune_forge', params: { precisionBonus: 30, materialAffinity: ['stone', 'metal', 'bone'] } },
    { type: 'crafting', params: { station: 'rune_forge', speed: 1.3, recipes: ['runes', 'bindrunes', 'runic_items'] } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 35, radius: 0, paradigm: 'rune' },
  ],
  paradigmAffinity: ['rune'],
  elementalAttunement: 'earth',
  capacity: 4,
  style: 'dwarven',
  lore: 'The ancient dwarves knew that runes must be carved with precision and purpose. This forge provides both, and the spirits of old runesmiths guide worthy hands.',
};

/**
 * Standing Stones - Permanent rune installation
 */
export const STANDING_STONES: VoxelBuildingDefinition = {
  id: 'standing_stones',
  name: 'Standing Stones',
  description: 'A circle of carved standing stones that radiate permanent runic protection and power.',
  category: 'decoration',
  tier: 4,
  species: 'large',
  layout: [
    '   T...T   ',
    '  .......  ',
    ' T.......T ',
    '...........  ',
    '...........  ',
    '...........  ',
    ' T.......T ',
    '  .......  ',
    '   T...T   ',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'stone' },
  functionality: [
    { type: 'ward', params: { type: 'runic', strength: 40, radius: 35 } },
    { type: 'paradigm_amplifier', params: { paradigm: 'rune', bonus: 30 } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 30, radius: 35, paradigm: 'rune' },
    { type: 'protection', magnitude: 25, radius: 35 },
    { type: 'duration_extension', magnitude: 100, radius: 30 }, // Runes last twice as long
  ],
  paradigmAffinity: ['rune'],
  elementalAttunement: 'earth',
  capacity: 0,
  style: 'ancient',
  lore: 'The stones have stood for millennia, their runes worn but still potent. Those who understand the old ways find their own runework amplified here.',
};

// =============================================================================
// BLOOD MAGIC BUILDINGS (Ethical Focus)
// =============================================================================

/**
 * Vitality Font - Healing-focused blood magic
 */
export const VITALITY_FONT: VoxelBuildingDefinition = {
  id: 'vitality_font',
  name: 'Vitality Font',
  description: 'A sacred pool where blood magic is channeled for healing and restoration, never for harm.',
  category: 'community',
  tier: 3,
  species: 'medium',
  layout: [
    '  #####  ',
    ' #~~~~~# ',
    '#~~~~~~~#',
    '#~~~T~~~#',
    '#~~~~~~~#',
    ' #~~~~~# ',
    '  ##D##  ',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'wood' },
  functionality: [
    { type: 'blood_font', params: { purpose: 'healing', efficiency: 2.0 } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 25, radius: 0, paradigm: 'blood' },
    { type: 'blood_efficiency', magnitude: 50, radius: 10 },
    { type: 'mana_regen', magnitude: 1.0, radius: 10 }, // Life force regen
  ],
  paradigmAffinity: ['blood'],
  elementalAttunement: 'water',
  capacity: 6,
  style: 'ancient',
  lore: 'Blood carries life, and this font redirects that vital force toward healing. Those who donate here find their sacrifice magnified in the good it does.',
};

// =============================================================================
// PACT MAGIC BUILDINGS
// =============================================================================

/**
 * Pact Circle - Entity negotiation space
 */
export const PACT_CIRCLE: VoxelBuildingDefinition = {
  id: 'pact_circle',
  name: 'Pact Circle',
  description: 'A warded ritual space for negotiating contracts with supernatural entities.',
  category: 'research',
  tier: 4,
  species: 'tall',
  layout: [
    '  #######  ',
    ' #.......# ',
    '#.........#',
    '#....T....#',
    '#.........#',
    '#.........#',
    ' #.......# ',
    '  ###D###  ',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'pact_altar', params: { leverage: 20, safety: 80 } },
    { type: 'ward', params: { type: 'containment', strength: 60 } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 35, radius: 0, paradigm: 'pact' },
    { type: 'pact_leverage', magnitude: 20, radius: 0 },
    { type: 'protection', magnitude: 40, radius: 5 }, // Protection during negotiation
  ],
  paradigmAffinity: ['pact'],
  capacity: 3,
  style: 'arcane',
  lore: 'The circle binds both parties to fair negotiation. Entities cannot breach the wards, and practitioners are protected from unfavorable terms.',
};

// =============================================================================
// NAME MAGIC BUILDINGS
// =============================================================================

/**
 * True Name Vault - Name protection
 */
export const TRUE_NAME_VAULT: VoxelBuildingDefinition = {
  id: 'true_name_vault',
  name: 'True Name Vault',
  description: 'A heavily warded vault where true names are stored and protected from those who would misuse them.',
  category: 'storage',
  tier: 4,
  species: 'short',
  layout: [
    '#########',
    '#SSSSSSS#',
    '#S.....S#',
    '#S..K..S#',
    '#S.....S#',
    '#SSSSSSS#',
    '####D####',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'true_name_vault', params: { capacity: 100, protection: 90 } },
    { type: 'storage', params: { slots: 100, type: 'names' } },
  ],
  magicalEffects: [
    { type: 'name_protection', magnitude: 90, radius: 0 },
    { type: 'paradigm_bonus', magnitude: 20, radius: 0, paradigm: 'name' },
  ],
  paradigmAffinity: ['name'],
  capacity: 2,
  style: 'ancient',
  lore: 'Names are power. This vault keeps the most dangerous names locked away, their power dormant until legitimately needed.',
};

// =============================================================================
// ALLOMANCY BUILDINGS
// =============================================================================

/**
 * Metal Reserve - Allomantic metal storage
 */
export const METAL_RESERVE: VoxelBuildingDefinition = {
  id: 'metal_reserve',
  name: 'Metal Reserve',
  description: 'A secure facility storing pure allomantic metals for Mistings and Mistborn.',
  category: 'storage',
  tier: 3,
  species: 'medium',
  layout: [
    '###########',
    '#SSSSSSSSS#',
    '#S.......S#',
    '#S.......S#',
    '#S...K...S#',
    '#S.......S#',
    '#SSSSSSSSS#',
    '####DDD####',
  ],
  materials: { wall: 'metal', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'metal_reserve', params: { metals: ['iron', 'steel', 'tin', 'pewter', 'copper', 'bronze', 'zinc', 'brass'] } },
    { type: 'storage', params: { slots: 200, type: 'allomantic_metals' } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 15, radius: 5, paradigm: 'allomancy' },
  ],
  paradigmAffinity: ['allomancy'],
  elementalAttunement: 'metal',
  capacity: 4,
  style: 'modern',
  lore: 'Pure metals, properly stored and catalogued. Allomancers know that impure metals can kill—this reserve ensures that never happens.',
};

// =============================================================================
// FENG SHUI / ELEMENTAL BUILDINGS
// =============================================================================

/**
 * Harmony Garden - Chi optimization
 */
export const HARMONY_GARDEN: VoxelBuildingDefinition = {
  id: 'harmony_garden',
  name: 'Harmony Garden',
  description: 'A carefully designed garden that balances the five elements, optimizing chi flow for the entire area.',
  category: 'decoration',
  tier: 2,
  species: 'medium',
  layout: [
    '.............',
    '.~~~.T.T.~~~.',
    '.~~~.....~~~.',
    '.....T.T.....',
    '.T.........T.',
    '.....T.T.....',
    '.~~~.....~~~.',
    '.~~~.T.T.~~~.',
    '.............',
  ],
  materials: { wall: 'wood', floor: 'stone', door: 'wood' },
  functionality: [
    { type: 'harmony_resonator', params: { elements: ['wood', 'fire', 'earth', 'metal', 'water'], balance: 0.9 } },
    { type: 'mood_aura', params: { bonus: 15, radius: 20 } },
  ],
  magicalEffects: [
    { type: 'elemental_attune', magnitude: 15, radius: 25, element: 'wood' },
    { type: 'elemental_attune', magnitude: 15, radius: 25, element: 'water' },
    { type: 'mana_regen', magnitude: 1.0, radius: 20 },
  ],
  paradigmAffinity: ['shinto'],
  capacity: 0,
  style: 'rustic',
  lore: 'In perfect balance, all elements support each other. This garden embodies that principle, creating a space where magic flows naturally.',
};

/**
 * Elemental Fount - Single element amplifier
 *
 * Materials: Magma walls provide pure fire energy (+90 fire element).
 * Obsidian floor (volcanic glass) grounds the heat. Bronze door conducts magic.
 */
export const FIRE_FOUNT: VoxelBuildingDefinition = createMagicBuilding({
  id: 'fire_fount',
  name: 'Fire Fount',
  description: 'A blazing brazier that amplifies fire-element magic and provides warmth and inspiration.',
  category: 'decoration',
  tier: 2,
  species: 'medium',
  layout: [
    '  ###  ',
    ' #~~~# ',
    '#~~~~~#',
    '#~~F~~#',
    '#~~~~~#',
    ' #~~~# ',
    '  ###  ',
  ],
  // Magma = fire +90, light_emission, extreme heat, alive
  // Obsidian = dimensional_stability, scrying bonus
  // Bronze = allomancy, conducts magic
  materials: { wall: 'magma', floor: 'obsidian', door: 'bronze' },
  functionality: [
    { type: 'harmony_resonator', params: { elements: ['fire'], strength: 50 } },
  ],
  paradigmAffinity: ['academic'],
  elementalAttunement: 'fire',
  capacity: 0,
  style: 'ancient',
  lore: 'The eternal flame burns without fuel, its magma walls a pure expression of the fire element. Pyromancers find their power magnified in its presence.',
});

/**
 * Water Fount - Water element amplifier
 *
 * Materials: Crystal walls conduct magic and resonate with water energy.
 * Coral floor connects to ocean spirits. Pearl door adds divine water blessing.
 */
export const WATER_FOUNT: VoxelBuildingDefinition = createMagicBuilding({
  id: 'water_fount',
  name: 'Water Fount',
  description: 'A perpetual fountain that amplifies water-element magic and promotes healing and clarity.',
  category: 'decoration',
  tier: 2,
  species: 'medium',
  layout: [
    '  ###  ',
    ' #~~~# ',
    '#~~~~~#',
    '#~~◊~~#',
    '#~~~~~#',
    ' #~~~# ',
    '  ###  ',
  ],
  // Crystal = +2.0 mana regen, conducts magic, academic affinity
  // Coral = water element +80, shinto +20, living, spirit_attraction
  // Pearl = divine +15, dream +10, calming, lustrous
  materials: { wall: 'crystal', floor: 'coral', door: 'pearl' },
  functionality: [
    { type: 'harmony_resonator', params: { elements: ['water'], strength: 50 } },
  ],
  paradigmAffinity: ['academic'],
  elementalAttunement: 'water',
  capacity: 0,
  style: 'ancient',
  lore: 'The waters flow in an endless cycle through crystal and coral, purifying and renewing. Hydromancers and healers alike draw strength from its eternal flow.',
});

// =============================================================================
// DIMENSIONAL BUILDINGS
// =============================================================================

/**
 * Dimensional Anchor - Stabilizes local reality
 */
export const DIMENSIONAL_ANCHOR: VoxelBuildingDefinition = {
  id: 'dimensional_anchor',
  name: 'Dimensional Anchor',
  description: 'A massive crystalline structure that stabilizes the local dimensional fabric, preventing rifts and corruption.',
  category: 'military',
  tier: 5,
  species: 'large',
  layout: [
    '   #####   ',
    '  #.....#  ',
    ' #.......# ',
    '#....K....#',
    '#.........#',
    '#....◊....#',
    '#.........#',
    ' #.......# ',
    '  #.....#  ',
    '   ##D##   ',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'metal' },
  functionality: [
    { type: 'dimensional_fold', params: { stabilization: 90, radius: 50 } },
    { type: 'ward', params: { type: 'dimensional', strength: 80 } },
  ],
  magicalEffects: [
    { type: 'corruption_resist', magnitude: 80, radius: 50 },
    { type: 'paradigm_bonus', magnitude: 25, radius: 30, paradigm: 'dimensional' },
    { type: 'protection', magnitude: 30, radius: 40 },
  ],
  paradigmAffinity: ['dimensional'],
  capacity: 3,
  style: 'arcane',
  lore: 'Where reality grows thin, the Anchor holds it firm. Without it, this region would long ago have been swallowed by the spaces between.',
};

// =============================================================================
// WILD / CHAOS MAGIC BUILDINGS
// =============================================================================

/**
 * Chaos Nexus - Wild magic amplifier (dangerous!)
 */
export const CHAOS_NEXUS: VoxelBuildingDefinition = {
  id: 'chaos_nexus',
  name: 'Chaos Nexus',
  description: 'A dangerously unstable structure where wild magic runs rampant. Powerful but unpredictable.',
  category: 'research',
  tier: 5,
  species: 'tall',
  layout: [
    '  ?????  ',
    ' ?.....? ',
    '?.......?',
    '?...◊...?',
    '?.......?',
    ' ?.....? ',
    '  ??D??  ',
  ],
  materials: { wall: 'stone', floor: 'stone', door: 'wood' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'wild', bonus: 100, instability: 50 } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 100, radius: 15, paradigm: 'wild' },
    { type: 'spell_power', magnitude: 50, radius: 10 },
    { type: 'luck_modifier', magnitude: -20, radius: 20 }, // Unpredictable!
  ],
  paradigmAffinity: ['wild'],
  capacity: 1,
  style: 'whimsical',
  lore: 'WARNING: The Nexus is not for the faint of heart. Magic here is amplified beyond reason, but control is nearly impossible. Proceed at your own risk.',
};

// =============================================================================
// EMOTIONAL MAGIC BUILDINGS
// =============================================================================

/**
 * Passion Chamber - Emotional magic focus
 *
 * Materials: Emotion walls amplify feelings, carpet provides comfort,
 * and living wood door responds to the heart.
 */
export const PASSION_CHAMBER: VoxelBuildingDefinition = createMagicBuilding({
  id: 'passion_chamber',
  name: 'Passion Chamber',
  description: 'A space designed to amplify and channel emotional energy into magical power.',
  category: 'research',
  tier: 2,
  species: 'medium',
  layout: [
    ' ##### ',
    '#.....#',
    '#..K..#',
    '#.....#',
    '###D###',
  ],
  // Emotion = emotional +60, emotion_amplification, euphoric/terrifying
  materials: { wall: 'emotion', floor: 'carpet', door: 'living_wood' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'emotional', bonus: 40 } },
  ],
  paradigmAffinity: ['emotional'],
  capacity: 4,
  style: 'ethereal',
  lore: 'Here, feelings become fuel. Rage multiplies fire, love enhances healing, grief creates wards. The chamber responds to what you feel.',
});

/**
 * Catharsis Pool - Emotional cleansing
 */
export const CATHARSIS_POOL: VoxelBuildingDefinition = createMagicBuilding({
  id: 'catharsis_pool',
  name: 'Catharsis Pool',
  description: 'A tranquil pool where emotions can be released and transformed into pure magical energy.',
  category: 'community',
  tier: 3,
  species: 'medium',
  layout: [
    '  #####  ',
    ' #~~~~~# ',
    '#~~~~~~~#',
    '#~~~◊~~~#',
    '#~~~~~~~#',
    ' #~~~~~# ',
    '  ##D##  ',
  ],
  // Tears = emotional +60, sympathy +30, purifying
  materials: { wall: 'tears', floor: 'water', door: 'mist' },
  functionality: [
    { type: 'mood_aura', params: { bonus: 30, radius: 20 } },
    { type: 'healing', params: { type: 'emotional', strength: 50 } },
  ],
  paradigmAffinity: ['emotional', 'sympathy'],
  elementalAttunement: 'water',
  capacity: 8,
  style: 'ethereal',
  lore: 'The pool accepts all feelings - joy and sorrow, rage and peace. What you release returns as power, cleansed of its burden.',
});

// =============================================================================
// SYMPATHY MAGIC BUILDINGS
// =============================================================================

/**
 * Sympathy Link Chamber - Connection magic
 *
 * Materials: Amber preserves connections, copper conducts sympathy links.
 */
export const SYMPATHY_LINK_CHAMBER: VoxelBuildingDefinition = createMagicBuilding({
  id: 'sympathy_link_chamber',
  name: 'Sympathy Link Chamber',
  description: 'A workshop for creating and maintaining sympathetic connections between objects.',
  category: 'research',
  tier: 3,
  species: 'medium',
  layout: [
    '#######',
    '#.....#',
    '#..K..#',
    '#.....#',
    '#..T..#',
    '###D###',
  ],
  // Amber = echo +30, memory enhancement, time preservation
  // Copper = allomancy +30 (but conducts sympathy too)
  materials: { wall: 'amber', floor: 'copper', door: 'bronze' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'sympathy', bonus: 35 } },
    { type: 'research', params: { bonus: 1.5, fields: ['sympathy', 'connections'] } },
  ],
  paradigmAffinity: ['sympathy'],
  elementalAttunement: 'fire',
  capacity: 3,
  style: 'academic',
  lore: 'What touches here remains connected. Hair, blood, and belonging create links that distance cannot sever. Handle with care.',
});

// =============================================================================
// DEBT MAGIC BUILDINGS
// =============================================================================

/**
 * Debt Ledger Hall - Obligation magic
 *
 * Materials: Pages record debts, ink binds contracts.
 */
export const DEBT_LEDGER_HALL: VoxelBuildingDefinition = createMagicBuilding({
  id: 'debt_ledger_hall',
  name: 'Debt Ledger Hall',
  description: 'A hall where magical debts are recorded, tracked, and can be traded or called in.',
  category: 'commercial',
  tier: 3,
  species: 'medium',
  layout: [
    '###########',
    '#SSSSSSSSS#',
    '#S.......S#',
    '#S...K...S#',
    '#S.......S#',
    '#SSSSSSSSS#',
    '####DDD####',
  ],
  // Pages = literary +40, name +20, memory enhancement
  // Ink = literary +35, name +30, pact_binding, truth_compulsion
  materials: { wall: 'pages', floor: 'marble', door: 'ink' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'debt', bonus: 45 } },
    { type: 'storage', params: { slots: 100, type: 'contracts' } },
  ],
  paradigmAffinity: ['debt'],
  capacity: 6,
  style: 'modern',
  lore: 'Every favor owed is written here. The ledger never forgets, and debts must always be paid. The magic ensures it.',
});

// =============================================================================
// BUREAUCRATIC MAGIC BUILDINGS
// =============================================================================

/**
 * Bureau of Forms - Paperwork magic
 *
 * Materials: Pages upon pages, organized perfectly.
 */
export const BUREAU_OF_FORMS: VoxelBuildingDefinition = createMagicBuilding({
  id: 'bureau_of_forms',
  name: 'Bureau of Forms',
  description: 'A temple to bureaucracy where properly filed paperwork has magical power.',
  category: 'community',
  tier: 3,
  species: 'tall',
  layout: [
    '###########',
    '#SSSSSSSSS#',
    '#S.......S#',
    '#S.......S#',
    '#S...K...S#',
    '#S.......S#',
    '#SSSSSSSSS#',
    '####DDD####',
  ],
  // Pages = literary +40, memory enhancement
  materials: { wall: 'pages', floor: 'stone', door: 'iron' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'bureaucratic', bonus: 50 } },
    { type: 'storage', params: { slots: 1000, type: 'forms' } },
  ],
  paradigmAffinity: ['bureaucratic'],
  capacity: 10,
  style: 'modern',
  lore: 'Form 27-B/6 is not merely a request - it is a binding magical contract. File incorrectly and face the consequences.',
});

// =============================================================================
// LUCK MAGIC BUILDINGS
// =============================================================================

/**
 * Fortune's Wheel - Probability manipulation
 *
 * Materials: Gold attracts fortune, jade brings luck.
 */
export const FORTUNES_WHEEL: VoxelBuildingDefinition = createMagicBuilding({
  id: 'fortunes_wheel',
  name: "Fortune's Wheel",
  description: 'A gambling hall where luck itself can be bent, borrowed, and invested.',
  category: 'commercial',
  tier: 3,
  species: 'medium',
  layout: [
    '  #####  ',
    ' #.....# ',
    '#...◊...#',
    '#.......#',
    '#...T...#',
    ' #.....# ',
    '  ##D##  ',
  ],
  // Gold = luck +10, commerce +30, spirit_attraction
  // Jade = luck affinity (implicit), earth element, calming
  materials: { wall: 'gold', floor: 'jade', door: 'silver' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'luck', bonus: 40 } },
  ],
  magicalEffects: [
    { type: 'luck_modifier', magnitude: 25, radius: 15 },
  ],
  paradigmAffinity: ['luck'],
  capacity: 12,
  style: 'whimsical',
  lore: 'Fortune favors the bold - but fortune can also be convinced. Spend luck here, and the universe will balance it later.',
});

// =============================================================================
// SILENCE MAGIC BUILDINGS
// =============================================================================

/**
 * Void Chapel - Silence and negation
 *
 * Materials: Silence and void absorb all.
 */
export const VOID_CHAPEL: VoxelBuildingDefinition = createMagicBuilding({
  id: 'void_chapel',
  name: 'Void Chapel',
  description: 'A chapel of absolute silence where negation magic is practiced.',
  category: 'research',
  tier: 4,
  species: 'medium',
  layout: [
    ' ####### ',
    '#.......#',
    '#.......#',
    '#...K...#',
    '#.......#',
    '#.......#',
    '###DDD###',
  ],
  // Silence = name +30, threshold +25, sound_dampening 100
  // Void = dimensional +40, dimensional_flux, terrifying
  materials: { wall: 'silence', floor: 'void', door: 'shadow' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'silence', bonus: 60 } },
    { type: 'ward', params: { type: 'sound', strength: 100 } },
  ],
  paradigmAffinity: ['silence'],
  capacity: 4,
  style: 'ethereal',
  lore: 'In silence, all magic ends. Here, spells are unmade and voices fail. Enter only if you are prepared to hear nothing.',
});

// =============================================================================
// PARADOX MAGIC BUILDINGS
// =============================================================================

/**
 * Escher Observatory - Impossible architecture
 */
export const ESCHER_OBSERVATORY: VoxelBuildingDefinition = createMagicBuilding({
  id: 'escher_observatory',
  name: 'Escher Observatory',
  description: 'A building of impossible geometry where paradoxes are studied and weaponized.',
  category: 'research',
  tier: 5,
  species: 'tall',
  layout: [
    '  #####  ',
    ' #.....# ',
    '#..^^^..#',
    '#.......#',
    '#...K...#',
    '#.......#',
    ' #.....# ',
    '  ##D##  ',
  ],
  // Time = dimensional +40, echo +35, time_dilation
  // Crystal = academic +25, conducts_magic
  materials: { wall: 'time', floor: 'crystal', door: 'void' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'paradox', bonus: 70 } },
    { type: 'research', params: { bonus: 2.0, fields: ['paradox', 'logic', 'impossibility'] } },
  ],
  paradigmAffinity: ['paradox', 'dimensional'],
  capacity: 3,
  style: 'impossible',
  lore: 'The stairs go up and down simultaneously. The inside is larger than the outside. Those who study here learn to hold contradictions.',
});

// =============================================================================
// ECHO MAGIC BUILDINGS
// =============================================================================

/**
 * Memory Archive - Echo and temporal resonance
 */
export const MEMORY_ARCHIVE: VoxelBuildingDefinition = createMagicBuilding({
  id: 'memory_archive',
  name: 'Memory Archive',
  description: 'A library where magical echoes are stored and can be replayed.',
  category: 'research',
  tier: 3,
  species: 'tall',
  layout: [
    '###########',
    '#SSSSSSSSS#',
    '#S.......S#',
    '#S.......S#',
    '#S...K...S#',
    '#S.......S#',
    '#SSSSSSSSS#',
    '####DDD####',
  ],
  // Memory = echo +50, name +25, memory_enhancement +60
  materials: { wall: 'memory', floor: 'amber', door: 'crystal' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'echo', bonus: 50 } },
    { type: 'storage', params: { slots: 500, type: 'echoes' } },
  ],
  paradigmAffinity: ['echo'],
  capacity: 8,
  style: 'ancient',
  lore: 'Every spell cast leaves an echo. Here, those echoes are preserved, catalogued, and can be awakened again.',
});

// =============================================================================
// GAME MAGIC BUILDINGS
// =============================================================================

/**
 * Arcade Sanctum - Reality as game
 */
export const ARCADE_SANCTUM: VoxelBuildingDefinition = createMagicBuilding({
  id: 'arcade_sanctum',
  name: 'Arcade Sanctum',
  description: 'A mystical arcade where reality follows game rules that can be exploited.',
  category: 'research',
  tier: 4,
  species: 'medium',
  layout: [
    '#########',
    '#.......#',
    '#.CCCCC.#',
    '#.......#',
    '#...K...#',
    '#.......#',
    '####D####',
  ],
  // Crystal = academic +25, conducts_magic
  materials: { wall: 'crystal', floor: 'light', door: 'bronze' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'game', bonus: 45 } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 45, radius: 10, paradigm: 'game' },
  ],
  paradigmAffinity: ['game'],
  capacity: 6,
  style: 'modern',
  lore: 'In this sanctum, everything has stats. Find the exploits, level up, and remember: there is always a win condition.',
});

// =============================================================================
// CRAFT MAGIC BUILDINGS
// =============================================================================

/**
 * Maker's Sanctum - Magic through creation
 */
export const MAKERS_SANCTUM: VoxelBuildingDefinition = createMagicBuilding({
  id: 'makers_sanctum',
  name: "Maker's Sanctum",
  description: 'A sacred workshop where the act of creation itself becomes magical.',
  category: 'production',
  tier: 3,
  species: 'medium',
  layout: [
    '#########',
    '#...K...#',
    '#.......#',
    '#..CCC..#',
    '#.......#',
    '#...T...#',
    '####D####',
  ],
  // Living wood = shinto +25, alive, breath +15
  materials: { wall: 'living_wood', floor: 'stone', door: 'iron' },
  functionality: [
    { type: 'crafting', params: { station: 'sanctum', speed: 1.5, quality: 1.5 } },
    { type: 'paradigm_amplifier', params: { paradigm: 'craft', bonus: 40 } },
  ],
  paradigmAffinity: ['craft'],
  elementalAttunement: 'earth',
  capacity: 4,
  style: 'rustic',
  lore: 'Here, every hammer strike is a prayer. The better you craft, the more power you channel. Quality is magic.',
});

// =============================================================================
// COMMERCE MAGIC BUILDINGS
// =============================================================================

/**
 * Merchant's Exchange - Trade magic
 */
export const MERCHANTS_EXCHANGE: VoxelBuildingDefinition = createMagicBuilding({
  id: 'merchants_exchange',
  name: "Merchant's Exchange",
  description: 'A marketplace where the act of fair trade generates magical power.',
  category: 'commercial',
  tier: 3,
  species: 'tall',
  layout: [
    '#############',
    '#...........#',
    '#.C.......C.#',
    '#...........#',
    '#.....K.....#',
    '#...........#',
    '#.C.......C.#',
    '####DDDDD####',
  ],
  // Gold = commerce +30, luck +10, divine +20
  materials: { wall: 'gold', floor: 'marble', door: 'bronze' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'commerce', bonus: 45 } },
    { type: 'shop', params: { type: 'exchange', range: 30 } },
  ],
  paradigmAffinity: ['commerce'],
  capacity: 20,
  style: 'modern',
  lore: 'Every fair exchange creates power. The more value flows through these walls, the stronger the magic grows.',
});

// =============================================================================
// LUNAR MAGIC BUILDINGS
// =============================================================================

/**
 * Moon Temple - Lunar phase magic
 */
export const MOON_TEMPLE: VoxelBuildingDefinition = createMagicBuilding({
  id: 'moon_temple',
  name: 'Moon Temple',
  description: 'A temple aligned with lunar phases, its power waxing and waning with the moon.',
  category: 'community',
  tier: 3,
  species: 'tall',
  layout: [
    '   #####   ',
    '  #.....#  ',
    ' #.......# ',
    '#....◊....#',
    '#.........#',
    ' #.......# ',
    '  #.....#  ',
    '   ##D##   ',
  ],
  // Moonlight = dream +30, spirit_attraction, lunar dreams
  // Silver = dream +15, spirit_repulsion (protection), divine +15
  materials: { wall: 'moonlight', floor: 'silver', door: 'pearl' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'lunar', bonus: 50, lunar_phase_dependent: true } },
  ],
  magicalEffects: [
    { type: 'paradigm_bonus', magnitude: 50, radius: 25, conditions: { timeOfDay: 'night' } },
  ],
  paradigmAffinity: ['lunar', 'dream'],
  elementalAttunement: 'water',
  capacity: 15,
  style: 'divine',
  lore: 'As the moon waxes, so does this temple\'s power. At the full moon, miracles are possible. At the new moon, only shadows remain.',
});

// =============================================================================
// SEASONAL MAGIC BUILDINGS
// =============================================================================

/**
 * Solstice Circle - Seasonal power
 */
export const SOLSTICE_CIRCLE: VoxelBuildingDefinition = createMagicBuilding({
  id: 'solstice_circle',
  name: 'Solstice Circle',
  description: 'A stone circle aligned with the seasons, drawing power from the turning of the year.',
  category: 'community',
  tier: 3,
  species: 'medium',
  layout: [
    '  .###.  ',
    ' #.....# ',
    '#.......#',
    '#...◊...#',
    '#.......#',
    ' #.....# ',
    '  .###.  ',
  ],
  // Stone = rune +15, dimensional_stability
  // Living wood = alive, shinto +25
  materials: { wall: 'stone', floor: 'living_wood', door: 'wood' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'seasonal', bonus: 45, season_dependent: true } },
  ],
  paradigmAffinity: ['seasonal', 'shinto'],
  elementalAttunement: 'wood',
  capacity: 20,
  style: 'ancient',
  lore: 'Spring brings growth, summer brings fire, autumn brings wisdom, winter brings rest. The circle turns, and so does power.',
});

// =============================================================================
// DAEMON MAGIC BUILDINGS
// =============================================================================

/**
 * Daemon Sanctum - Soul-daemon communion
 */
export const DAEMON_SANCTUM: VoxelBuildingDefinition = createMagicBuilding({
  id: 'daemon_sanctum',
  name: 'Daemon Sanctum',
  description: 'A sacred space where humans commune with their daemons and Dust flows freely.',
  category: 'research',
  tier: 4,
  species: 'medium',
  layout: [
    ' ####### ',
    '#.......#',
    '#...T...#',
    '#.......#',
    '#...K...#',
    '#.......#',
    '###DDD###',
  ],
  // Soul stuff = breath +50, emotional +40, spirit_attraction
  materials: { wall: 'soul_stuff', floor: 'starlight', door: 'silver' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'daemon', bonus: 55 } },
    { type: 'research', params: { bonus: 1.5, fields: ['dust', 'daemon_bonds', 'multiverse'] } },
  ],
  paradigmAffinity: ['daemon'],
  capacity: 6,
  style: 'ethereal',
  lore: 'Here, the bond between human and daemon is strengthened. Dust swirls visibly, and the truth can be read in the Alethiometer.',
});

// =============================================================================
// CONSUMPTION MAGIC BUILDINGS
// =============================================================================

/**
 * Absorption Chamber - Power through consumption
 */
export const ABSORPTION_CHAMBER: VoxelBuildingDefinition = createMagicBuilding({
  id: 'absorption_chamber',
  name: 'Absorption Chamber',
  description: 'A dangerous facility where practitioners consume materials, creatures, or concepts to gain their properties.',
  category: 'research',
  tier: 4,
  species: 'medium',
  layout: [
    '#######',
    '#.....#',
    '#..◊..#',
    '#.....#',
    '#..K..#',
    '###D###',
  ],
  // Void = dimensional +40, absorbs things
  materials: { wall: 'void', floor: 'obsidian', door: 'iron' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'consumption', bonus: 50 } },
  ],
  paradigmAffinity: ['consumption'],
  capacity: 2,
  style: 'unsettling',
  lore: 'What you eat becomes part of you. But consume too much, and you may forget who you were. The void always hungers.',
});

// =============================================================================
// TALENT MAGIC BUILDINGS (Xanth-style)
// =============================================================================

/**
 * Talent Registry - One talent per person
 */
export const TALENT_REGISTRY: VoxelBuildingDefinition = createMagicBuilding({
  id: 'talent_registry',
  name: 'Talent Registry',
  description: 'An office where unique magical talents are identified, recorded, and occasionally enhanced.',
  category: 'community',
  tier: 2,
  species: 'medium',
  layout: [
    '#########',
    '#SSSSSSS#',
    '#S.....S#',
    '#S..K..S#',
    '#S.....S#',
    '####D####',
  ],
  materials: { wall: 'pages', floor: 'wood', door: 'wood' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'talent', bonus: 30 } },
  ],
  paradigmAffinity: ['talent'],
  capacity: 8,
  style: 'rustic',
  lore: 'Everyone has exactly one magical talent. Some change fingernail colors. Others transform reality. Come discover yours.',
});

// =============================================================================
// NARRATIVE MAGIC BUILDINGS (Discworld-style)
// =============================================================================

/**
 * Story Circle - Narrative power
 */
export const STORY_CIRCLE: VoxelBuildingDefinition = createMagicBuilding({
  id: 'story_circle',
  name: 'Story Circle',
  description: 'A theater where stories have real power and narrative conventions become binding laws.',
  category: 'community',
  tier: 4,
  species: 'tall',
  layout: [
    '  #######  ',
    ' #.......# ',
    '#.........#',
    '#....C....#',
    '#.........#',
    '#.........#',
    ' #.......# ',
    '  ###D###  ',
  ],
  // Pages = literary +40
  // Ink = truth_compulsion, pact_binding
  materials: { wall: 'pages', floor: 'ink', door: 'living_wood' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'narrative', bonus: 55 } },
  ],
  paradigmAffinity: ['narrative', 'literary'],
  capacity: 30,
  style: 'theatrical',
  lore: 'Here, the million-to-one chance succeeds every time. Heroes triumph, villains monologue, and stories write themselves into reality.',
});

// =============================================================================
// LITERARY SURREALISM BUILDINGS
// =============================================================================

/**
 * Library of Babel - Infinite words
 */
export const LIBRARY_OF_BABEL: VoxelBuildingDefinition = createMagicBuilding({
  id: 'library_of_babel',
  name: 'Library of Babel',
  description: 'A hexagonal library containing every possible book, where words have physical weight.',
  category: 'research',
  tier: 5,
  species: 'tall',
  layout: [
    '  #####  ',
    ' #SSSSS# ',
    '#SSSSSSS#',
    '#SS.K.SS#',
    '#SSSSSSS#',
    ' #SSSSS# ',
    '  ##D##  ',
  ],
  // Pages = literary +40, memory_enhancement
  // Thought = academic +30, memory_enhancement +30
  materials: { wall: 'pages', floor: 'thought', door: 'ink' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'literary', bonus: 70 } },
    { type: 'research', params: { bonus: 3.0, fields: ['everything', 'nothing', 'nonsense'] } },
  ],
  paradigmAffinity: ['literary', 'narrative'],
  capacity: 6,
  style: 'impossible',
  lore: 'Every book that could exist is here. Finding the one you need is the challenge. Beware: some books read you back.',
});

// =============================================================================
// BREATH MAGIC BUILDING (BioChromatic Awakening)
// =============================================================================

/**
 * Awakening Workshop - BioChromatic Breath
 */
export const AWAKENING_WORKSHOP: VoxelBuildingDefinition = createMagicBuilding({
  id: 'awakening_workshop',
  name: 'Awakening Workshop',
  description: 'A colorful workshop where BioChromatic Breath is invested into objects, bringing them to life.',
  category: 'production',
  tier: 4,
  species: 'medium',
  layout: [
    '#########',
    '#.......#',
    '#..CCC..#',
    '#.......#',
    '#...K...#',
    '#.......#',
    '####D####',
  ],
  // Breath = breath +100, name +30, breath_holding +50
  materials: { wall: 'breath', floor: 'carpet', door: 'cloth' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'breath', bonus: 60 } },
    { type: 'crafting', params: { station: 'awakening', speed: 1.0, quality: 2.0 } },
  ],
  paradigmAffinity: ['breath'],
  capacity: 4,
  style: 'colorful',
  lore: 'Color drains from the world when Breath is given. But the Awakened objects live, think, and serve. Each Breath is precious.',
});

// =============================================================================
// BLOOD MAGIC BUILDING (dedicated)
// =============================================================================

/**
 * Crimson Altar - Blood magic focus
 */
export const CRIMSON_ALTAR: VoxelBuildingDefinition = createMagicBuilding({
  id: 'crimson_altar',
  name: 'Crimson Altar',
  description: 'A dark altar where blood magic is practiced, trading life force for power.',
  category: 'research',
  tier: 4,
  species: 'medium',
  layout: [
    ' ##### ',
    '#.....#',
    '#..◊..#',
    '#.....#',
    '###D###',
  ],
  // Blood = blood +100, pact +30, blood_potency +100
  materials: { wall: 'blood', floor: 'obsidian', door: 'iron' },
  functionality: [
    { type: 'paradigm_amplifier', params: { paradigm: 'blood', bonus: 70 } },
  ],
  paradigmAffinity: ['blood'],
  capacity: 2,
  style: 'dark',
  lore: 'Blood is life, and life is power. What you sacrifice here returns tenfold - but the cost is never truly gone.',
});

// =============================================================================
// COLLECTIONS
// =============================================================================

export const CORE_MAGIC_BUILDINGS = [
  MANA_WELL,
  LEYLINE_NEXUS,
  SPELL_FOCUS_TOWER,
];

export const DIVINE_BUILDINGS = [
  SACRED_SHRINE,
  TEMPLE_OF_MIRACLES,
];

export const SPIRIT_BUILDINGS = [
  KAMI_SHRINE,
  TORII_GATE,
];

export const DREAM_BUILDINGS = [
  DREAM_SANCTUARY,
  NIGHTMARE_WARD,
];

export const SONG_BUILDINGS = [
  HARMONY_HALL,
  ECHO_CHAMBER,
];

export const RUNE_BUILDINGS = [
  RUNE_FORGE,
  STANDING_STONES,
];

export const SPECIALTY_BUILDINGS = [
  VITALITY_FONT,
  PACT_CIRCLE,
  TRUE_NAME_VAULT,
  METAL_RESERVE,
];

export const ELEMENTAL_BUILDINGS = [
  HARMONY_GARDEN,
  FIRE_FOUNT,
  WATER_FOUNT,
];

export const DIMENSIONAL_BUILDINGS = [
  DIMENSIONAL_ANCHOR,
  CHAOS_NEXUS,
];

// New paradigm buildings
export const EMOTIONAL_BUILDINGS = [
  PASSION_CHAMBER,
  CATHARSIS_POOL,
];

export const SYMPATHY_BUILDINGS = [
  SYMPATHY_LINK_CHAMBER,
];

export const DEBT_BUILDINGS = [
  DEBT_LEDGER_HALL,
];

export const BUREAUCRATIC_BUILDINGS = [
  BUREAU_OF_FORMS,
];

export const LUCK_BUILDINGS = [
  FORTUNES_WHEEL,
];

export const SILENCE_BUILDINGS = [
  VOID_CHAPEL,
];

export const PARADOX_BUILDINGS = [
  ESCHER_OBSERVATORY,
];

export const ECHO_BUILDINGS = [
  MEMORY_ARCHIVE,
];

export const GAME_BUILDINGS = [
  ARCADE_SANCTUM,
];

export const CRAFT_BUILDINGS = [
  MAKERS_SANCTUM,
];

export const COMMERCE_BUILDINGS = [
  MERCHANTS_EXCHANGE,
];

export const LUNAR_BUILDINGS = [
  MOON_TEMPLE,
];

export const SEASONAL_BUILDINGS = [
  SOLSTICE_CIRCLE,
];

export const DAEMON_BUILDINGS = [
  DAEMON_SANCTUM,
];

export const CONSUMPTION_BUILDINGS = [
  ABSORPTION_CHAMBER,
];

export const TALENT_BUILDINGS = [
  TALENT_REGISTRY,
];

export const NARRATIVE_BUILDINGS = [
  STORY_CIRCLE,
];

export const LITERARY_BUILDINGS = [
  LIBRARY_OF_BABEL,
];

export const BREATH_BUILDINGS = [
  AWAKENING_WORKSHOP,
];

export const BLOOD_BUILDINGS = [
  CRIMSON_ALTAR,
];

export const ALL_MAGIC_BUILDINGS = [
  ...CORE_MAGIC_BUILDINGS,
  ...DIVINE_BUILDINGS,
  ...SPIRIT_BUILDINGS,
  ...DREAM_BUILDINGS,
  ...SONG_BUILDINGS,
  ...RUNE_BUILDINGS,
  ...SPECIALTY_BUILDINGS,
  ...ELEMENTAL_BUILDINGS,
  ...DIMENSIONAL_BUILDINGS,
  // New paradigm buildings
  ...EMOTIONAL_BUILDINGS,
  ...SYMPATHY_BUILDINGS,
  ...DEBT_BUILDINGS,
  ...BUREAUCRATIC_BUILDINGS,
  ...LUCK_BUILDINGS,
  ...SILENCE_BUILDINGS,
  ...PARADOX_BUILDINGS,
  ...ECHO_BUILDINGS,
  ...GAME_BUILDINGS,
  ...CRAFT_BUILDINGS,
  ...COMMERCE_BUILDINGS,
  ...LUNAR_BUILDINGS,
  ...SEASONAL_BUILDINGS,
  ...DAEMON_BUILDINGS,
  ...CONSUMPTION_BUILDINGS,
  ...TALENT_BUILDINGS,
  ...NARRATIVE_BUILDINGS,
  ...LITERARY_BUILDINGS,
  ...BREATH_BUILDINGS,
  ...BLOOD_BUILDINGS,
];

/**
 * Get buildings that support a specific paradigm
 */
export function getBuildingsForParadigm(paradigm: MagicParadigm): VoxelBuildingDefinition[] {
  return ALL_MAGIC_BUILDINGS.filter(b => b.paradigmAffinity?.includes(paradigm));
}

/**
 * Get buildings with a specific magical effect type
 */
export function getBuildingsWithEffect(effectType: MagicalEffect['type']): VoxelBuildingDefinition[] {
  return ALL_MAGIC_BUILDINGS.filter(b =>
    b.magicalEffects?.some(e => e.type === effectType)
  );
}
