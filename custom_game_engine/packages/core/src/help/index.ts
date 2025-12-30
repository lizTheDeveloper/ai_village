/**
 * Help System - Self-documenting game wiki
 *
 * This module exports the complete help/documentation system that allows
 * items, effects, and other game objects to embed their own documentation
 * for automatic wiki generation.
 *
 * Usage:
 * 1. Import help types and add to your definitions
 * 2. Register help entries with the global registry
 * 3. Generate wikis using MarkdownWikiGenerator or JsonWikiGenerator
 *
 * Example:
 * ```typescript
 * import { createItemHelp } from '@ai-village/core/help';
 *
 * const ironSword = defineItem('iron_sword', 'Iron Sword', 'equipment', {
 *   help: createItemHelp(
 *     'iron_sword',
 *     'A sturdy iron blade forged for combat',
 *     'Made from iron ingots at a forge. Effective against unarmored foes.',
 *     'weapons',
 *     ['melee', 'craftable', 'metal']
 *   )
 * });
 * ```
 */

// Core types
export type {
  HelpEntry,
  ItemHelpEntry,
  EffectHelpEntry,
  BuildingHelpEntry,
  HelpExample,
  HelpMechanics,
} from './HelpEntry.js';

// Registry
export { HelpRegistry, helpRegistry, type HelpQuery } from './HelpRegistry.js';

// Generators
export {
  MarkdownWikiGenerator,
  JsonWikiGenerator,
  type WikiOptions,
} from './WikiGenerator.js';

// Helpers
export {
  createHelpEntry,
  createItemHelp,
  createEffectHelp,
} from './HelpEntry.js';
