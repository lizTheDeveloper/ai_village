/**
 * Microgenerators - Core Types
 *
 * Types for the microgenerator system that allows external tools to create
 * legendary items, souls, quests, and other content that enters the multiverse
 * god-crafted queue.
 *
 * Based on: openspec/specs/microgenerators/spec.md
 */

// ============================================================================
// Content Types
// ============================================================================

export type GodCraftedContentType =
  | 'legendary_item'
  | 'soul'
  | 'quest'
  | 'alien_species'
  | 'magic_paradigm'
  | 'building'
  | 'spell'
  | 'recipe'
  | 'technology'
  | 'riddle'
  | 'deity'
  | 'religion';

// ============================================================================
// Divine Signature (Creator Attribution)
// ============================================================================

export interface DivineSignature {
  /** Creator's unique ID */
  id: string;

  /** Creator's name */
  name: string;

  /** What they are the god of (e.g., "Late Night Claude Code Coding Sessions") */
  godOf: string;

  /** When this signature was created */
  createdAt: number;

  /** Source of creation */
  source: 'microgenerator' | 'llm_collab' | 'manual';

  /** How many creations this god has made */
  previousCreations: number;
}

// ============================================================================
// Discovery Tracking
// ============================================================================

export interface Discovery {
  /** Universe ID where discovered */
  universeId: string;

  /** Agent/entity that discovered it */
  discoveredBy: string;

  /** When it was discovered */
  discoveredAt: number;

  /** How it was discovered */
  method: 'random_encounter' | 'quest_reward' | 'location' | 'achievement' | 'divine_gift' | 'research';
}

// ============================================================================
// Base God-Crafted Content
// ============================================================================

export interface GodCraftedContent {
  /** Unique content ID */
  id: string;

  /** Content type */
  type: GodCraftedContentType;

  /** Divine signature (creator attribution) */
  creator: DivineSignature;

  /** Tags for filtering/discovery */
  tags: string[];

  /** Human-readable lore/description */
  lore: string;

  /** Actual content data (type-specific) */
  data: unknown;

  /** Validation status */
  validated: boolean;

  /** Multiverse discovery tracking */
  discoveries: Discovery[];

  /** When this content was created */
  createdAt: number;
}

// ============================================================================
// Legendary Item Content
// ============================================================================

export interface LegendaryPower {
  id: string;
  name: string;
  description: string;
  effect: string;
}

export interface LegendaryItemData {
  /** Item ID that will be registered */
  itemId: string;

  /** Display name */
  displayName: string;

  /** Item category */
  category: string;

  /** Base item properties */
  weight: number;
  stackSize: number;
  baseValue: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'artifact';

  /** Legendary properties */
  legendary: {
    /** Backstory and lore */
    lore: string;

    /** How this item was forged/created */
    origin: string;

    /** Special powers or effects */
    powers: LegendaryPower[];

    /** Wielders throughout history */
    historicalWielders?: string[];

    /** Quest or prophecy tied to this item */
    destiny?: string;
  };
}

export interface LegendaryItemContent extends GodCraftedContent {
  type: 'legendary_item';
  data: LegendaryItemData;
}

// ============================================================================
// Soul Content
// ============================================================================

export interface MissionObjective {
  id: string;
  description: string;
  type: 'revenge' | 'redemption' | 'discovery' | 'protection' | 'legacy' | 'custom';
  required: boolean;
}

export interface SoulData {
  /** Soul identity */
  identity: {
    name: string;
    species: string;
    appearance: string;
  };

  /** Soul's backstory */
  backstory: string;

  /** Long-term mission/purpose */
  mission: {
    type: 'revenge' | 'redemption' | 'discovery' | 'protection' | 'legacy' | 'custom';
    description: string;
    objectives: MissionObjective[];
    timeLimit?: {
      ticks: number;
      description: string;
    };
  };

  /** Starting personality traits */
  personality: {
    traits: string[];
    fears: string[];
    desires: string[];
  };

  /** Narrative components used */
  narrativeComponents?: string[];
}

export interface SoulContent extends GodCraftedContent {
  type: 'soul';
  data: SoulData;
}

// ============================================================================
// Riddle Content
// ============================================================================

export interface RiddleData {
  /** The riddle question */
  question: string;

  /** Correct answer */
  correctAnswer: string;

  /** Alternative acceptable answers */
  alternativeAnswers?: string[];

  /** Difficulty level */
  difficulty: 'easy' | 'medium' | 'hard';

  /** Context for this riddle */
  context: {
    /** Who is this riddle for? */
    targetName?: string;

    /** What is the riddle about? */
    theme?: string;

    /** Why was this riddle created? */
    purpose?: string;
  };

  /** Whether LLM should judge creative answers */
  allowLLMJudgment: boolean;
}

export interface RiddleContent extends GodCraftedContent {
  type: 'riddle';
  data: RiddleData;
}

// ============================================================================
// Spell Content
// ============================================================================

export interface SpellData {
  /** Spell ID */
  spellId: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Techniques used */
  techniques: string[];

  /** Forms used */
  forms: string[];

  /** Reagents required */
  reagents?: string[];

  /** Mana cost */
  manaCost: number;

  /** Power level (0-10) */
  powerLevel: number;

  /** Effects */
  effects: {
    damage?: number;
    duration?: number;
    range?: number;
    areaOfEffect?: number;
    custom?: Record<string, unknown>;
  };

  /** Creativity score (0-1) */
  creativityScore: number;
}

export interface SpellContent extends GodCraftedContent {
  type: 'spell';
  data: SpellData;
}

// ============================================================================
// Recipe Content
// ============================================================================

export interface RecipeData {
  /** Recipe ID */
  recipeId: string;

  /** Item created */
  outputItemId: string;

  /** Display name */
  name: string;

  /** Recipe type */
  type: 'food' | 'potion' | 'clothing' | 'art' | 'tool' | 'custom';

  /** Ingredients */
  ingredients: Array<{
    itemId: string;
    amount: number;
  }>;

  /** Crafting time */
  craftingTime: number;

  /** Required station */
  stationRequired?: string;

  /** Output amount */
  outputAmount: number;

  /** Item properties */
  item: {
    category: string;
    weight: number;
    stackSize: number;
    baseValue: number;
    rarity: string;
    properties?: Record<string, unknown>;
  };

  /** Creativity score (0-100) */
  creativityScore: number;
}

export interface RecipeContent extends GodCraftedContent {
  type: 'recipe';
  data: RecipeData;
}

// ============================================================================
// God-Crafted Queue Entry
// ============================================================================

export interface QueueEntry {
  /** Unique queue entry ID */
  entryId: string;

  /** The content */
  content: GodCraftedContent;

  /** When added to queue */
  queuedAt: number;

  /** Discovery status per universe */
  discoveryStatus: Record<string, {
    discovered: boolean;
    discoveredAt?: number;
    discoveredBy?: string;
  }>;
}

// ============================================================================
// Discovery Conditions
// ============================================================================

export type DiscoveryCondition =
  | { type: 'random_encounter'; chance: number }
  | { type: 'quest_reward'; questId: string }
  | { type: 'location'; x: number; y: number; radius: number }
  | { type: 'achievement'; achievementId: string }
  | { type: 'divine_gift'; deityId: string }
  | { type: 'research'; researchId: string }
  | { type: 'always' };

// ============================================================================
// Content Filter
// ============================================================================

export interface ContentFilter {
  /** Filter by content type */
  types?: GodCraftedContentType[];

  /** Filter by creator */
  creatorId?: string;

  /** Filter by tags */
  tags?: string[];

  /** Filter by validation status */
  validated?: boolean;

  /** Filter by discovery status in universe */
  undiscoveredInUniverse?: string;

  /** Maximum rarity */
  maxRarity?: string;
}

// ============================================================================
// Content Query
// ============================================================================

export interface ContentQuery {
  /** Filter criteria */
  filter?: ContentFilter;

  /** Sort by field */
  sortBy?: 'createdAt' | 'discoveryCount' | 'creatorPopularity';

  /** Sort direction */
  sortDirection?: 'asc' | 'desc';

  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

// ============================================================================
// Validation Result
// ============================================================================

export interface MicrogeneratorValidationResult {
  /** Is content valid? */
  valid: boolean;

  /** Validation errors */
  errors: string[];

  /** Warnings (non-blocking) */
  warnings?: string[];

  /** Suggestions */
  suggestions?: string[];
}

// ============================================================================
// Microgenerator Input
// ============================================================================

export interface MicrogeneratorInput {
  /** Divine signature */
  creator: DivineSignature;

  /** Tags */
  tags?: string[];

  /** Content-specific input */
  data: unknown;
}

// ============================================================================
// Spawn Result
// ============================================================================

export interface SpawnResult {
  /** Was spawn successful? */
  success: boolean;

  /** Entity ID if spawned */
  entityId?: string;

  /** Error message if failed */
  error?: string;

  /** Spawn location */
  location?: {
    x: number;
    y: number;
  };
}
