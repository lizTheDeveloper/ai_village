/**
 * MaterialTemplate - Defines base properties for materials
 *
 * Forward-compatibility module for Phase 29: Item System Refactor.
 * Materials define properties that items inherit, enabling:
 * - Dwarf Fortress-style material system
 * - Magic affinity for enchantments
 * - Proper thermal/physical simulation
 *
 * Part of Forward-Compatibility Phase
 */

import type { MagicForm } from '../components/MagicComponent.js';

// ============================================================================
// Material Categories
// ============================================================================

/** Broad categories for recipe matching */
export type MaterialCategory =
  | 'metal'       // Iron, copper, gold, etc.
  | 'wood'        // Oak, pine, etc.
  | 'stone'       // Granite, marble, etc.
  | 'cloth'       // Woven fabrics
  | 'leather'     // Animal hides
  | 'organic'     // Plant/animal matter
  | 'magical'     // Inherently magical materials
  | 'liquid'      // Water, oil, etc.
  | 'gas'         // Air, smoke, etc.
  | 'gem'         // Precious stones
  | 'bone'        // Skeletal materials
  | 'crystal'     // Crystalline structures
  | 'ceramic'     // Fired clay
  | 'glass';      // Glass and silicates

// ============================================================================
// Extended Magic Forms for Materials
// ============================================================================

/**
 * Extended magic form type that includes material-specific forms.
 * These extend the base MagicForm from MagicComponent.
 */
export type MaterialMagicForm = MagicForm
  | 'transmutation'   // Changing one material to another
  | 'enchantment'     // Enhancing items
  | 'nature'          // Plant/nature magic
  | 'growth'          // Life/growth magic
  | 'shadow'          // Darkness/shadow magic
  | 'protection'      // Defensive/warding magic
  | 'necromancy';     // Death/undeath magic

// ============================================================================
// Material Template
// ============================================================================

/**
 * MaterialTemplate defines base properties that items inherit.
 *
 * Example: An iron sword inherits iron's hardness, density, and rust potential.
 * A mithril sword inherits mithril's magic affinity and lighter weight.
 */
export interface MaterialTemplate {
  /** Unique identifier (e.g., "iron", "oak", "leather") */
  id: string;

  /** Display name */
  name: string;

  /** Description */
  description: string;

  /** Material categories for recipe matching */
  categories: MaterialCategory[];

  // Physical Properties
  density: number;
  hardness: number;
  flexibility: number;
  brittleness?: number;

  // Thermal Properties
  meltingPoint?: number;
  boilingPoint?: number;
  ignitePoint?: number;
  heatConductivity: number;
  specificHeat?: number;

  // Magic Properties
  magicAffinity: number;
  resonantForms?: MaterialMagicForm[];
  resistantForms?: MaterialMagicForm[];
  inherentEffects?: string[];
  magical?: boolean;
  corruptionResistance?: number;

  // Crafting Properties
  valueMultiplier: number;
  craftingDifficulty?: number;
  requiredTools?: string[];
  requiredStation?: string;

  // Visual Properties (optional for forward-compatibility)
  color?: string;
  accentColor?: string;
  texture?: 'solid' | 'grainy' | 'shiny' | 'rough' | 'translucent' | 'glowing';
  emitsLight?: boolean;
  lightIntensity?: number;
  lightColor?: string;

  // Degradation Properties (optional)
  canRust?: boolean;
  rustRate?: number;
  canRot?: boolean;
  rotRate?: number;
  waterSensitive?: boolean;

  // Combat Properties (optional)
  damageBonus?: number;
  defenseBonus?: number;
  durabilityMultiplier?: number;
}
