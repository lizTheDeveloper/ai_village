/**
 * ArtifactSystem - Legendary unique items created during strange moods
 *
 * Forward-compatibility module for Dwarf Fortress-style artifact creation.
 * Artifacts are unique items with history, decorations, and special properties.
 *
 * Part of Forward-Compatibility Phase
 */

import type { MagicForm } from '../components/MagicComponent.js';
import type { MaterialCategory } from '../materials/MaterialTemplate.js';

// ============================================================================
// Strange Mood System
// ============================================================================

/** Types of strange moods that can produce artifacts */
export type StrangeMoodType =
  | 'fey'           // Gleeful inspiration, highest quality
  | 'secretive'     // Quiet, won't share what they're making
  | 'possessed'     // No skill gain, but creates artifact
  | 'macabre'       // Requires bones/leather, dark artifacts
  | 'fell'          // Murderous, kills for materials (dangerous)
  | 'melancholy';   // Sad artifact creation

/** Materials required by a strange mood */
export interface MoodMaterialRequirement {
  category: MaterialCategory;
  specificMaterial?: string;
  quantity: number;
  acquired: boolean;
}

/** A strange mood in progress */
export interface StrangeMood {
  /** Agent experiencing the mood */
  agentId: string;

  /** Type of mood */
  type: StrangeMoodType;

  /** When the mood started (game tick) */
  startedAt: number;

  /** Deadline before insanity (game tick) */
  deadline: number;

  /** Required workshop type */
  requiredWorkshop: string;

  /** Materials needed */
  materials: MoodMaterialRequirement[];

  /** Whether all materials acquired */
  materialsGathered: boolean;

  /** Whether currently crafting */
  crafting: boolean;

  /** Progress (0-1) */
  progress: number;

  /** Skill being used */
  primarySkill: string;
}

// ============================================================================
// Artifact Decorations
// ============================================================================

/** Decoration types */
export type DecorationType =
  | 'engraving'     // Carved images
  | 'encrusting'    // Embedded gems/materials
  | 'hanging_rings' // Metal rings
  | 'bands'         // Material bands
  | 'spikes'        // Decorative spikes
  | 'inlay';        // Material inlay

/** An image/scene on an artifact */
export interface ArtifactImage {
  /** Description of the image */
  description: string;

  /** Subject of the image */
  subject: ArtifactImageSubject;

  /** Art quality (0-100) */
  quality: number;

  /** Material used for this image */
  material: string;
}

/** What the image depicts */
export interface ArtifactImageSubject {
  type: 'historical_event' | 'creature' | 'entity' | 'abstract' | 'landscape' | 'symbol';

  /** Reference ID (event ID, entity ID, etc.) */
  referenceId?: string;

  /** Text description */
  description: string;
}

/** A decoration on an artifact */
export interface ArtifactDecoration {
  type: DecorationType;
  material: string;
  images?: ArtifactImage[];
  quality: number;
}

// ============================================================================
// Artifact Definition
// ============================================================================

/** Artifact rarity levels */
export type ArtifactRarity =
  | 'masterwork'    // Exceptional quality item
  | 'artifact'      // Strange mood creation
  | 'legendary'     // Famous/named item
  | 'divine';       // Player/god-blessed

/**
 * A unique legendary item.
 */
export interface Artifact {
  /** Unique identifier */
  id: string;

  /** The artifact's name (generated or given) */
  name: string;

  /** Title/epithet (e.g., "the Burning Hatred") */
  epithet?: string;

  /** Full name with epithet */
  fullName: string;

  /** Base item type */
  baseItemType: string;

  /** Primary material */
  primaryMaterial: string;

  /** Rarity level */
  rarity: ArtifactRarity;

  // ============================================================================
  // History & Provenance
  // ============================================================================

  /** Creator entity ID */
  creatorId: string;

  /** Creator name (preserved even if entity dies) */
  creatorName: string;

  /** Universe where created */
  universeId: string;

  /** Game tick when created */
  createdAt: number;

  /** Strange mood that created it (if any) */
  creatingMood?: StrangeMoodType;

  /** Historical events involving this artifact */
  history: ArtifactHistoryEntry[];

  /** Current owner entity ID */
  currentOwnerId?: string;

  /** Previous owners */
  previousOwners: string[];

  // ============================================================================
  // Physical Properties
  // ============================================================================

  /** Decorations on this artifact */
  decorations: ArtifactDecoration[];

  /** Overall value multiplier from quality/decorations */
  valueMultiplier: number;

  /** Total material value */
  materialValue: number;

  /** Calculated total value */
  totalValue: number;

  // ============================================================================
  // Magical Properties
  // ============================================================================

  /** Whether this artifact is magical */
  magical: boolean;

  /** Magical effects (effect IDs) */
  magicalEffects?: string[];

  /** Magic forms this artifact resonates with */
  resonantForms?: MagicForm[];

  /** Mana storage capacity (if any) */
  manaCapacity?: number;

  /** Current stored mana */
  currentMana?: number;

  /** Whether this is a phylactery/soul vessel */
  soulVessel?: boolean;

  /** Bound soul (if soul vessel) */
  boundSoulId?: string;

  // ============================================================================
  // Legends & Fame
  // ============================================================================

  /** How famous this artifact is (0-100) */
  fame: number;

  /** Agents who know about this artifact */
  knownBy: string[];

  /** Tales told about this artifact */
  legends: string[];

  /** Whether currently lost/missing */
  lost: boolean;

  /** Last known location (if lost) */
  lastKnownLocation?: { x: number; y: number; z?: number };
}

/** A historical event involving an artifact */
export interface ArtifactHistoryEntry {
  /** Game tick */
  tick: number;

  /** Universe ID */
  universeId: string;

  /** What happened */
  event: ArtifactEvent;

  /** Entity involved (if any) */
  entityId?: string;

  /** Description */
  description: string;
}

/** Types of artifact events */
export type ArtifactEvent =
  | 'created'
  | 'claimed'
  | 'gifted'
  | 'stolen'
  | 'lost'
  | 'found'
  | 'used_in_battle'
  | 'killed_with'
  | 'blessed'
  | 'cursed'
  | 'enchanted'
  | 'displayed'
  | 'hidden'
  | 'destroyed'
  | 'imported';

// ============================================================================
// Artifact Registry
// ============================================================================

/** Registry interface for artifacts */
export interface ArtifactRegistry {
  /** Get artifact by ID */
  get(id: string): Artifact | undefined;

  /** Register a new artifact */
  register(artifact: Artifact): void;

  /** Get artifacts by owner */
  getByOwner(ownerId: string): Artifact[];

  /** Get lost artifacts */
  getLost(): Artifact[];

  /** Get most famous artifacts */
  getMostFamous(limit: number): Artifact[];

  /** Search artifacts by name */
  searchByName(query: string): Artifact[];

  /** Get all artifact IDs */
  getAllIds(): string[];
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Generate an artifact name based on Dwarf Fortress patterns.
 */
export function generateArtifactName(
  _material: string,
  _itemType: string,
  _creatorName?: string
): { name: string; epithet?: string; fullName: string } {
  // Simple name generation - would be expanded with real word lists
  // Future: Use material, itemType, and creatorName to influence naming
  const prefixes = ['The', 'Mighty', 'Ancient', 'Blessed', 'Cursed', 'Sacred'];
  const nouns = ['Wrath', 'Glory', 'Doom', 'Hope', 'Shadow', 'Light', 'Thunder'];
  const suffixes = ['of Ages', 'of the Deep', 'Eternal', 'Unbroken', 'the Destroyer'];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];

  // Sometimes add a suffix
  const hasSuffix = Math.random() > 0.5;
  const suffix = hasSuffix ? suffixes[Math.floor(Math.random() * suffixes.length)] : '';

  const name = `${prefix} ${noun}`;
  const epithet = suffix || undefined;
  const fullName = epithet ? `${name} ${epithet}` : name;

  return { name, epithet, fullName };
}

/**
 * Create a new artifact from a strange mood.
 */
export function createArtifactFromMood(
  mood: StrangeMood,
  baseItemType: string,
  primaryMaterial: string,
  creatorName: string,
  universeId: string,
  currentTick: number
): Artifact {
  const { name, epithet, fullName } = generateArtifactName(primaryMaterial, baseItemType, creatorName);

  return {
    id: crypto.randomUUID(),
    name,
    epithet,
    fullName,
    baseItemType,
    primaryMaterial,
    rarity: 'artifact',
    creatorId: mood.agentId,
    creatorName,
    universeId,
    createdAt: currentTick,
    creatingMood: mood.type,
    history: [{
      tick: currentTick,
      universeId,
      event: 'created',
      entityId: mood.agentId,
      description: `Created by ${creatorName} during a ${mood.type} mood`,
    }],
    currentOwnerId: mood.agentId,
    previousOwners: [],
    decorations: [],
    valueMultiplier: mood.type === 'fey' ? 3 : 2,
    materialValue: 100, // Would be calculated from materials
    totalValue: mood.type === 'fey' ? 300 : 200,
    magical: mood.type === 'possessed' || mood.type === 'macabre',
    fame: 10,
    knownBy: [mood.agentId],
    legends: [],
    lost: false,
  };
}

/**
 * Create a masterwork item (not from strange mood).
 */
export function createMasterwork(
  baseItemType: string,
  primaryMaterial: string,
  creatorId: string,
  creatorName: string,
  universeId: string,
  currentTick: number
): Artifact {
  const { name, epithet, fullName } = generateArtifactName(primaryMaterial, baseItemType, creatorName);

  return {
    id: crypto.randomUUID(),
    name,
    epithet,
    fullName,
    baseItemType,
    primaryMaterial,
    rarity: 'masterwork',
    creatorId,
    creatorName,
    universeId,
    createdAt: currentTick,
    history: [{
      tick: currentTick,
      universeId,
      event: 'created',
      entityId: creatorId,
      description: `Masterfully crafted by ${creatorName}`,
    }],
    currentOwnerId: creatorId,
    previousOwners: [],
    decorations: [],
    valueMultiplier: 1.5,
    materialValue: 100,
    totalValue: 150,
    magical: false,
    fame: 5,
    knownBy: [creatorId],
    legends: [],
    lost: false,
  };
}

/**
 * Record a historical event for an artifact.
 */
export function recordArtifactEvent(
  artifact: Artifact,
  event: ArtifactEvent,
  universeId: string,
  currentTick: number,
  description: string,
  entityId?: string
): Artifact {
  const entry: ArtifactHistoryEntry = {
    tick: currentTick,
    universeId,
    event,
    entityId,
    description,
  };

  // Fame increases based on event type
  const fameIncrease: Record<ArtifactEvent, number> = {
    created: 0,
    claimed: 2,
    gifted: 3,
    stolen: 5,
    lost: 3,
    found: 4,
    used_in_battle: 5,
    killed_with: 8,
    blessed: 10,
    cursed: 7,
    enchanted: 6,
    displayed: 2,
    hidden: 1,
    destroyed: 0,
    imported: 3,
  };

  return {
    ...artifact,
    history: [...artifact.history, entry],
    fame: Math.min(100, artifact.fame + fameIncrease[event]),
  };
}
