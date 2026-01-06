/**
 * Component category definitions for logical grouping
 *
 * Categories organize components by their conceptual domain.
 */

/**
 * Component categories for logical grouping and organization
 */
export type ComponentCategory =
  | 'core'        // Fundamental components: identity, position, sprite
  | 'agent'       // Agent-specific: personality, skills, needs
  | 'physical'    // Physical attributes: health, inventory, equipment
  | 'social'      // Social systems: relationships, reputation
  | 'cognitive'   // Cognitive systems: memory, goals, beliefs
  | 'magic'       // Magic systems: mana, spells, paradigms
  | 'world'       // World systems: time, weather, terrain
  | 'system'      // Internal systems: steering, pathfinding, debug
  | 'afterlife';  // Afterlife/spiritual systems: death, judgment, bargains
