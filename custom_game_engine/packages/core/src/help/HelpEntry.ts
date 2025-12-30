/**
 * HelpEntry - Self-documenting help system for items, effects, and game mechanics
 *
 * This module provides a standardized documentation format that can be embedded
 * directly into game objects (items, spells, effects, etc.) to create a self-
 * documenting wiki system.
 *
 * Design principles:
 * - Documentation lives with the code, not separate
 * - LLM-friendly structured format
 * - Human-readable markdown generation
 * - Searchable and queryable
 * - Progressive disclosure (summary → details → examples)
 */

/**
 * Core help entry that can be embedded in any game object
 */
export interface HelpEntry {
  /** Unique identifier for this help topic */
  id: string;

  /** Short one-line description (50-80 chars) */
  summary: string;

  /** Detailed description (supports markdown) */
  description: string;

  /** Category for grouping (e.g., 'items', 'magic', 'crafting') */
  category: string;

  /** Subcategory for finer grouping (e.g., 'tools', 'weapons', 'food') */
  subcategory?: string;

  /** Tags for search and filtering */
  tags: string[];

  /** Usage examples with explanations */
  examples?: HelpExample[];

  /** Related help topics (by ID) */
  relatedTopics?: string[];

  /** Gameplay tips and strategies */
  tips?: string[];

  /** Common mistakes or warnings */
  warnings?: string[];

  /** Mechanical details for LLM understanding */
  mechanics?: HelpMechanics;

  /** Lore/flavor text (optional, for immersion) */
  lore?: string;
}

/**
 * Usage example with context
 */
export interface HelpExample {
  /** Brief title for the example */
  title: string;

  /** Detailed explanation of the scenario */
  description: string;

  /** Optional code/pseudo-code showing usage */
  code?: string;
}

/**
 * Mechanical details for LLM consumption
 */
export interface HelpMechanics {
  /** Numeric values and their meanings */
  values?: Record<string, number | string>;

  /** Formulas (e.g., "damage = base * (1 + skill/100)") */
  formulas?: Record<string, string>;

  /** Conditions and their effects */
  conditions?: Record<string, string>;

  /** Dependencies (required items, skills, buildings, etc.) */
  dependencies?: string[];

  /** What this unlocks or enables */
  unlocks?: string[];

  /** Cooldowns, durations, ranges (with units) */
  timing?: Record<string, string>;

  /** Resource costs */
  costs?: Record<string, number | string>;
}

/**
 * Help entry for items specifically
 */
export interface ItemHelpEntry extends HelpEntry {
  category: 'items';

  /** How to obtain this item */
  obtainedBy?: string[];

  /** What this item is used for */
  usedFor?: string[];

  /** Crafting recipe summary (if craftable) */
  crafting?: {
    station?: string;
    ingredients: { item: string; amount: number }[];
    skill?: string;
    skillLevel?: number;
  };

  /** Quality ranges and their effects */
  qualityInfo?: {
    min: number;
    max: number;
    effects: string;
  };
}

/**
 * Help entry for spell effects
 */
export interface EffectHelpEntry extends HelpEntry {
  category: 'magic' | 'effects';

  /** Effect category (damage, healing, buff, etc.) */
  effectCategory: string;

  /** Target type (self, single, area, etc.) */
  targetType: string;

  /** Duration description */
  duration?: string;

  /** Range description */
  range?: string;

  /** Damage/heal type if applicable */
  damageType?: string;

  /** Scaling information */
  scaling?: {
    attribute: string;
    formula: string;
    description: string;
  };

  /** Counterplay and dispel information */
  counterplay?: string[];
}

/**
 * Help entry for crafting stations/buildings
 */
export interface BuildingHelpEntry extends HelpEntry {
  category: 'buildings';

  /** Construction requirements */
  construction?: {
    materials: { item: string; amount: number }[];
    skill?: string;
    skillLevel?: number;
    buildTime?: string;
  };

  /** What can be crafted here */
  craftsItems?: string[];

  /** Special functions or features */
  features?: string[];

  /** Placement restrictions */
  placement?: string[];
}

/**
 * Helper to create a basic help entry
 */
export function createHelpEntry(
  id: string,
  summary: string,
  description: string,
  category: string,
  tags: string[] = []
): HelpEntry {
  return {
    id,
    summary,
    description,
    category,
    tags,
  };
}

/**
 * Helper to create an item help entry
 */
export function createItemHelp(
  id: string,
  summary: string,
  description: string,
  subcategory: string,
  tags: string[] = []
): ItemHelpEntry {
  return {
    id,
    summary,
    description,
    category: 'items',
    subcategory,
    tags,
  };
}

/**
 * Helper to create an effect help entry
 */
export function createEffectHelp(
  id: string,
  summary: string,
  description: string,
  effectCategory: string,
  targetType: string,
  tags: string[] = []
): EffectHelpEntry {
  return {
    id,
    summary,
    description,
    category: 'magic',
    effectCategory,
    targetType,
    tags,
  };
}
