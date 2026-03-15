/**
 * Shared helper utilities for the MVEE demo.
 *
 * - Time helpers: calculatePhase, calculateLightLevel
 * - Content checkers: progressive disclosure guards used by panel lazy-loading
 *
 * Extracted from src/main.ts (MUL-1027)
 */

import { type World, ComponentType as CT } from '@ai-village/core';

// ============================================================================
// TIME HELPERS
// ============================================================================

export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night';

export function calculatePhase(timeOfDay: number): DayPhase {
  if (timeOfDay >= 5 && timeOfDay < 7) return 'dawn';
  if (timeOfDay >= 7 && timeOfDay < 17) return 'day';
  if (timeOfDay >= 17 && timeOfDay < 19) return 'dusk';
  return 'night'; // 19:00-5:00
}

export function calculateLightLevel(timeOfDay: number, phase: DayPhase): number {
  switch (phase) {
    case 'dawn': {
      const progress = (timeOfDay - 5) / 2;
      return 0.3 + (0.7 * progress);
    }
    case 'day':
      return 1.0;
    case 'dusk': {
      const progress = (timeOfDay - 17) / 2;
      return 1.0 - (0.9 * progress);
    }
    case 'night':
      return 0.1;
  }
}

// ============================================================================
// CONTENT CHECKERS - Progressive Disclosure
// These functions check if there's content to display in a panel.
// Panels only appear in menus when their content checker returns true.
// ============================================================================

/**
 * Check if any agents have relationships
 */
export function hasRelationships(world: unknown): boolean {
  const w = world as World;
  const entities = w.query().with(CT.Relationship).executeEntities();
  return entities.length > 0;
}

/**
 * Check if any agents have memories
 */
export function hasMemories(world: unknown): boolean {
  const w = world as World;
  const entities = w.query().with(CT.Memory).executeEntities();
  return entities.length > 0;
}

/**
 * Check if any agents have items in inventory
 */
export function hasInventoryItems(world: unknown): boolean {
  const w = world as World;
  const entities = w.query().with(CT.Inventory).executeEntities();
  // Check if any inventory actually has items
  for (const entity of entities) {
    const inv = entity.getComponent(CT.Inventory) as { items?: unknown[] } | undefined;
    if (inv?.items && inv.items.length > 0) {
      return true;
    }
  }
  return false;
}

/**
 * Check if there are any shops/merchants
 */
export function hasShops(world: unknown): boolean {
  const w = world as World;
  const entities = w.query().with(CT.Shop).executeEntities();
  return entities.length > 0;
}

/**
 * Check if crafting is available (recipes discovered)
 */
export function hasCrafting(_world: unknown): boolean {
  // Crafting is always available from start (basic recipes)
  return true;
}

/**
 * Check if governance structures exist
 */
export function hasGovernance(world: unknown): boolean {
  const w = world as World;
  // Check for any governance-related components
  const villages = w.query().with(CT.VillageGovernance).executeEntities();
  const cities = w.query().with(CT.CityGovernance).executeEntities();
  return villages.length > 0 || cities.length > 0;
}

/**
 * Check if there are wild animals to show
 */
export function hasAnimals(world: unknown): boolean {
  const w = world as World;
  const entities = w.query().with(CT.Animal).executeEntities();
  return entities.length > 0;
}

/**
 * Check if there are plants growing
 */
export function hasPlants(world: unknown): boolean {
  const w = world as World;
  const entities = w.query().with(CT.Plant).executeEntities();
  return entities.length > 0;
}
