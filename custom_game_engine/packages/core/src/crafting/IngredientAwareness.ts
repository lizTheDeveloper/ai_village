/**
 * Ingredient Awareness System
 *
 * Determines what ingredients an agent is aware of and can use for experimentation.
 * Higher-skilled agents are aware of more ingredient sources:
 *
 * - Inventory (always)
 * - Nearby storage buildings (cooking skill 1+)
 * - Gatherable resources nearby (cooking skill 2+)
 * - Remembered locations from spatial memory (cooking skill 3+)
 *
 * This feeds into the LLM Recipe Generator to give agents contextual
 * ingredient options based on their knowledge and surroundings.
 */

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';
import type { SkillsComponent, SkillId } from '../components/SkillsComponent.js';
import type { SocialMemoryComponent } from '../components/SocialMemoryComponent.js';
import type { PreferenceComponent } from '../components/PreferenceComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import type { RecipeType } from './LLMRecipeGenerator.js';
import { itemRegistry } from '../items/ItemRegistry.js';

/**
 * Mapping from recipe type to the relevant skill
 */
export const RECIPE_TYPE_TO_SKILL: Record<RecipeType, SkillId> = {
  food: 'cooking',
  clothing: 'crafting',
  art: 'crafting',
  potion: 'medicine',
  tool: 'crafting',
  decoration: 'crafting',
};

/**
 * Information about a friend and their preferences
 */
export interface FriendPreference {
  name: string;
  entityId: string;
  relationship: number; // 0-1 how close they are
  favoriteIngredients: string[]; // Items they like
  dislikedIngredients: string[]; // Items they dislike
  recentMeals: string[]; // What they've eaten recently
  // Material preferences
  favoriteColor?: string;
  dislikedColor?: string;
  favoriteClothing?: string;
  favoriteWeapon?: string;
  favoriteMetal?: string;
  favoritePlant?: string;
}

/**
 * An ingredient the agent is aware of
 */
export interface AvailableIngredient {
  itemId: string;
  displayName: string;
  quantity: number;
  source: 'inventory' | 'storage' | 'nearby' | 'memory';
  /** Distance to source (0 for inventory) */
  distance: number;
  /** Entity ID of source (storage building, resource node, etc.) */
  sourceId?: string;
  /** Location if not in inventory */
  location?: { x: number; y: number };
}

/**
 * Summary of what an agent knows about available ingredients
 */
export interface IngredientAwarenessResult {
  /** All ingredients the agent is aware of */
  ingredients: AvailableIngredient[];
  /** Grouped by category for LLM context */
  byCategory: Record<string, AvailableIngredient[]>;
  /** Agent's cooking skill level */
  cookingSkill: number;
  /** What sources the agent can access */
  accessibleSources: ('inventory' | 'storage' | 'nearby' | 'memory')[];
}

/**
 * Configuration for ingredient awareness
 * Skill thresholds are the same across all craft types
 */
const AWARENESS_CONFIG = {
  /** Max distance to check for storage buildings */
  STORAGE_RANGE: 15,
  /** Max distance to check for gatherable resources */
  GATHER_RANGE: 10,
  /** Skill level required to check storage */
  STORAGE_SKILL: 1,
  /** Skill level required to notice nearby gatherables */
  GATHER_SKILL: 2,
  /** Skill level required to use spatial memory */
  MEMORY_SKILL: 3,
  /** Max memories to consider */
  MAX_MEMORY_LOCATIONS: 10,
};

/**
 * Get all ingredients an agent is aware of for a specific craft skill
 * @param skillId - The skill to use for awareness checks (defaults to cooking)
 */
export function getAvailableIngredients(
  world: World,
  agent: Entity,
  skillId: SkillId = 'cooking'
): IngredientAwarenessResult {
  const ingredients: AvailableIngredient[] = [];
  const accessibleSources: ('inventory' | 'storage' | 'nearby' | 'memory')[] = ['inventory'];

  // Get agent position and skills
  const pos = (agent as EntityImpl).getComponent<PositionComponent>(CT.Position);
  const skills = (agent as EntityImpl).getComponent<SkillsComponent>(CT.Skills);
  const relevantSkill = skills?.levels?.[skillId] ?? 0;

  // Always check inventory
  const inventoryIngredients = getInventoryIngredients(agent);
  ingredients.push(...inventoryIngredients);

  // Check storage if skill >= 1
  if (relevantSkill >= AWARENESS_CONFIG.STORAGE_SKILL && pos) {
    accessibleSources.push('storage');
    const storageIngredients = getStorageIngredients(world, pos, AWARENESS_CONFIG.STORAGE_RANGE);
    ingredients.push(...storageIngredients);
  }

  // Check nearby gatherables if skill >= 2
  if (relevantSkill >= AWARENESS_CONFIG.GATHER_SKILL && pos) {
    accessibleSources.push('nearby');
    const nearbyIngredients = getNearbyGatherables(world, pos, AWARENESS_CONFIG.GATHER_RANGE);
    ingredients.push(...nearbyIngredients);
  }

  // Check spatial memory if skill >= 3
  if (relevantSkill >= AWARENESS_CONFIG.MEMORY_SKILL && pos) {
    accessibleSources.push('memory');
    const memoryIngredients = getRememberedIngredients(agent, pos);
    ingredients.push(...memoryIngredients);
  }

  // Consolidate duplicates (same itemId from different sources - prefer closer)
  const consolidated = consolidateIngredients(ingredients);

  // Group by category
  const byCategory: Record<string, AvailableIngredient[]> = {};
  for (const ing of consolidated) {
    const item = itemRegistry.tryGet(ing.itemId);
    const category = item?.category || 'misc';
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(ing);
  }

  return {
    ingredients: consolidated,
    byCategory,
    cookingSkill: relevantSkill, // Note: field name kept for compatibility, but represents relevant skill
    accessibleSources,
  };
}

/**
 * Get ingredients from agent's inventory
 */
function getInventoryIngredients(agent: Entity): AvailableIngredient[] {
  const inventory = (agent as EntityImpl).getComponent<InventoryComponent>(CT.Inventory);
  if (!inventory) return [];

  const ingredients: AvailableIngredient[] = [];

  for (const slot of inventory.slots) {
    if (slot.itemId && slot.quantity > 0) {
      const item = itemRegistry.tryGet(slot.itemId);
      if (item) {
        ingredients.push({
          itemId: slot.itemId,
          displayName: item.displayName,
          quantity: slot.quantity,
          source: 'inventory',
          distance: 0,
        });
      }
    }
  }

  return ingredients;
}

/**
 * Get ingredients from nearby storage buildings
 */
function getStorageIngredients(
  world: World,
  agentPos: PositionComponent,
  maxRange: number
): AvailableIngredient[] {
  const ingredients: AvailableIngredient[] = [];

  // Find storage buildings
  const buildings = world.query()
    .with(CT.Building)
    .with(CT.Position)
    .with(CT.Inventory)
    .executeEntities();

  for (const building of buildings) {
    const buildingComp = (building as EntityImpl).getComponent<BuildingComponent>(CT.Building);
    const pos = (building as EntityImpl).getComponent<PositionComponent>(CT.Position);
    const inventory = (building as EntityImpl).getComponent<InventoryComponent>(CT.Inventory);

    if (!buildingComp?.isComplete || !pos || !inventory) continue;

    // Check if it's a storage type building
    const isStorage = buildingComp.buildingType.includes('storage') ||
                      buildingComp.buildingType.includes('chest') ||
                      buildingComp.buildingType.includes('pantry') ||
                      buildingComp.buildingType.includes('warehouse');

    if (!isStorage) continue;

    // Check distance
    const dx = pos.x - agentPos.x;
    const dy = pos.y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxRange) continue;

    // Get items from storage
    for (const slot of inventory.slots) {
      if (slot.itemId && slot.quantity > 0) {
        const item = itemRegistry.tryGet(slot.itemId);
        if (item) {
          ingredients.push({
            itemId: slot.itemId,
            displayName: item.displayName,
            quantity: slot.quantity,
            source: 'storage',
            distance: Math.round(distance),
            sourceId: building.id,
            location: { x: pos.x, y: pos.y },
          });
        }
      }
    }
  }

  return ingredients;
}

/**
 * Get gatherable resources nearby
 */
function getNearbyGatherables(
  world: World,
  agentPos: PositionComponent,
  maxRange: number
): AvailableIngredient[] {
  const ingredients: AvailableIngredient[] = [];

  // Find resource entities (plants, resource nodes)
  const resources = world.query()
    .with(CT.Resource)
    .with(CT.Position)
    .executeEntities();

  for (const resource of resources) {
    const pos = (resource as EntityImpl).getComponent<PositionComponent>(CT.Position);
    const resourceComp = (resource as EntityImpl).getComponent<any>(CT.Resource);

    if (!pos || !resourceComp) continue;

    // Check distance
    const dx = pos.x - agentPos.x;
    const dy = pos.y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxRange) continue;

    // Get resource type
    const resourceType = resourceComp.resourceType || resourceComp.type;
    if (!resourceType) continue;

    const item = itemRegistry.tryGet(resourceType);
    if (item && item.isGatherable) {
      ingredients.push({
        itemId: resourceType,
        displayName: item.displayName,
        quantity: resourceComp.amount || 1,
        source: 'nearby',
        distance: Math.round(distance),
        sourceId: resource.id,
        location: { x: pos.x, y: pos.y },
      });
    }
  }

  // Also check plants with harvestable fruit
  const plants = world.query()
    .with(CT.Plant)
    .with(CT.Position)
    .executeEntities();

  for (const plant of plants) {
    const pos = (plant as EntityImpl).getComponent<PositionComponent>(CT.Position);
    const plantComp = (plant as EntityImpl).getComponent<any>(CT.Plant);

    if (!pos || !plantComp) continue;

    // Check distance
    const dx = pos.x - agentPos.x;
    const dy = pos.y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > maxRange) continue;

    // Check if plant has harvestable fruit
    if (plantComp.fruitCount && plantComp.fruitCount > 0) {
      const fruitType = plantComp.fruitType || plantComp.speciesId;
      const item = itemRegistry.tryGet(fruitType);
      if (item) {
        ingredients.push({
          itemId: fruitType,
          displayName: item.displayName,
          quantity: plantComp.fruitCount,
          source: 'nearby',
          distance: Math.round(distance),
          sourceId: plant.id,
          location: { x: pos.x, y: pos.y },
        });
      }
    }
  }

  return ingredients;
}

/**
 * Get ingredients the agent remembers from spatial memory
 */
function getRememberedIngredients(
  agent: Entity,
  agentPos: PositionComponent
): AvailableIngredient[] {
  const ingredients: AvailableIngredient[] = [];

  const spatialMemory = (agent as EntityImpl).getComponent<SpatialMemoryComponent>(CT.SpatialMemory);
  if (!spatialMemory) return [];

  // Check resource memories using the getter
  const resourceMemories = spatialMemory.resourceMemories;
  let count = 0;

  for (const memory of resourceMemories) {
    if (count >= AWARENESS_CONFIG.MAX_MEMORY_LOCATIONS) break;

    const item = itemRegistry.tryGet(memory.resourceType);
    if (!item) continue;

    // Calculate distance to remembered location
    const dx = memory.position.x - agentPos.x;
    const dy = memory.position.y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    ingredients.push({
      itemId: memory.resourceType,
      displayName: item.displayName,
      quantity: 5, // Estimate - resource memories don't track amount
      source: 'memory',
      distance: Math.round(distance),
      location: { x: memory.position.x, y: memory.position.y },
    });

    count++;
  }

  return ingredients;
}

/**
 * Consolidate duplicate ingredients, preferring closer sources
 */
function consolidateIngredients(ingredients: AvailableIngredient[]): AvailableIngredient[] {
  const byItemId = new Map<string, AvailableIngredient>();

  for (const ing of ingredients) {
    const existing = byItemId.get(ing.itemId);

    if (!existing) {
      // First occurrence
      byItemId.set(ing.itemId, { ...ing });
    } else {
      // Add quantities, prefer closer source
      existing.quantity += ing.quantity;
      if (ing.distance < existing.distance) {
        existing.source = ing.source;
        existing.distance = ing.distance;
        existing.sourceId = ing.sourceId;
        existing.location = ing.location;
      }
    }
  }

  return Array.from(byItemId.values());
}

/**
 * Format available ingredients for LLM context
 */
export function formatIngredientsForPrompt(result: IngredientAwarenessResult): string {
  if (result.ingredients.length === 0) {
    return 'No ingredients available.';
  }

  const lines: string[] = [];

  // Group by source for clarity
  const bySource = new Map<string, AvailableIngredient[]>();
  for (const ing of result.ingredients) {
    const sourceList = bySource.get(ing.source) || [];
    sourceList.push(ing);
    bySource.set(ing.source, sourceList);
  }

  // Inventory first
  const inventoryItems = bySource.get('inventory');
  if (inventoryItems && inventoryItems.length > 0) {
    lines.push('CARRYING:');
    for (const ing of inventoryItems) {
      lines.push(`  - ${ing.quantity}x ${ing.displayName}`);
    }
  }

  // Storage
  const storageItems = bySource.get('storage');
  if (storageItems && storageItems.length > 0) {
    lines.push('IN STORAGE:');
    for (const ing of storageItems) {
      lines.push(`  - ${ing.quantity}x ${ing.displayName} (${ing.distance} tiles away)`);
    }
  }

  // Nearby gatherables
  const nearbyItems = bySource.get('nearby');
  if (nearbyItems && nearbyItems.length > 0) {
    lines.push('NEARBY (gatherable):');
    for (const ing of nearbyItems) {
      lines.push(`  - ${ing.quantity}x ${ing.displayName} (${ing.distance} tiles away)`);
    }
  }

  // Remembered
  const memoryItems = bySource.get('memory');
  if (memoryItems && memoryItems.length > 0) {
    lines.push('REMEMBERED LOCATIONS:');
    for (const ing of memoryItems) {
      lines.push(`  - ${ing.displayName} (~${ing.distance} tiles away)`);
    }
  }

  return lines.join('\n');
}

/**
 * Get the agent's closest friends and their food preferences
 * Limited to top 3 to avoid context overload
 */
export function getClosestFriendsPreferences(
  world: World,
  agent: Entity,
  maxFriends: number = 3
): FriendPreference[] {
  const friends: FriendPreference[] = [];

  const socialMemory = (agent as EntityImpl).getComponent<SocialMemoryComponent>(CT.SocialMemory);
  if (!socialMemory) return [];

  // Get relationships from socialMemories map, sorted by trust
  const socialMemoriesMap = socialMemory.socialMemories;
  const relationships: Array<{ entityId: string; trust: number }> = [];

  socialMemoriesMap.forEach((memory, entityId) => {
    relationships.push({
      entityId,
      trust: memory.trust,
    });
  });

  // Filter and sort to get closest friends
  const closestFriends = relationships
    .filter(r => r.trust > 0.6) // Only consider actual friends
    .sort((a, b) => b.trust - a.trust)
    .slice(0, maxFriends);

  for (const rel of closestFriends) {
    const friendEntity = world.getEntity(rel.entityId);
    if (!friendEntity) continue;

    const identity = (friendEntity as EntityImpl).getComponent<IdentityComponent>(CT.Identity);
    const preferences = (friendEntity as EntityImpl).getComponent<PreferenceComponent>(CT.Preference);

    if (!identity) continue;

    // Extract food preferences
    const favoriteIngredients: string[] = [];
    const dislikedIngredients: string[] = [];

    if (preferences) {
      // Get flavor preferences and map to ingredients
      const flavorPrefs = preferences.flavorPreferences;
      if (flavorPrefs) {
        // High preference flavors -> likely ingredients
        if ((flavorPrefs.sweet ?? 0) > 0.3) favoriteIngredients.push('berry', 'honey');
        if ((flavorPrefs.savory ?? 0) > 0.3) favoriteIngredients.push('meat', 'mushroom');
        if ((flavorPrefs.bitter ?? 0) < -0.3) dislikedIngredients.push('herbs');
      }

      // Check food memories for what they've enjoyed
      const foodMemories = preferences.foodMemories || [];
      for (const memory of foodMemories.slice(-5)) {
        // FoodMemory uses 'experience' and 'emotionalImpact', not 'enjoyment'
        if (memory.experience === 'positive' && memory.foodId) {
          favoriteIngredients.push(memory.foodId);
        } else if (memory.experience === 'negative' && memory.foodId) {
          dislikedIngredients.push(memory.foodId);
        }
      }
    }

    // Check episodic memory for recent meals
    const recentMeals: string[] = [];
    const episodicMemory = (friendEntity as EntityImpl).getComponent<EpisodicMemoryComponent>(CT.EpisodicMemory);
    if (episodicMemory) {
      // Use episodicMemories getter
      const memories = episodicMemory.episodicMemories;
      for (const memory of memories.slice(-10)) {
        // EpisodicMemory uses 'eventType' and 'summary', not 'type' and 'details'
        if (memory.eventType === 'ate' || memory.eventType === 'eating') {
          // Try to extract food type from summary
          recentMeals.push(memory.summary);
        }
      }
    }

    // Extract material preferences if available
    const materialPrefs = preferences?.materialPreferences;

    friends.push({
      name: identity.name,
      entityId: rel.entityId,
      relationship: rel.trust,
      favoriteIngredients: Array.from(new Set(favoriteIngredients)),
      dislikedIngredients: Array.from(new Set(dislikedIngredients)),
      recentMeals: Array.from(new Set(recentMeals)).slice(-3),
      // Material preferences
      favoriteColor: materialPrefs?.color.favorite,
      dislikedColor: materialPrefs?.color.disliked,
      favoriteClothing: materialPrefs?.clothing.favorite,
      favoriteWeapon: materialPrefs?.weapon.favorite,
      favoriteMetal: materialPrefs?.metal.favorite,
      favoritePlant: materialPrefs?.plant.favorite,
    });
  }

  return friends;
}

/**
 * Format friend preferences for LLM context
 */
export function formatFriendsForPrompt(friends: FriendPreference[]): string {
  if (friends.length === 0) return '';

  const lines: string[] = ['FRIENDS\' PREFERENCES:'];

  for (const friend of friends) {
    const parts: string[] = [`  ${friend.name}:`];

    // Food preferences
    if (friend.favoriteIngredients.length > 0) {
      parts.push(`loves ${friend.favoriteIngredients.slice(0, 3).join(', ')}`);
    }
    if (friend.dislikedIngredients.length > 0) {
      parts.push(`dislikes ${friend.dislikedIngredients.slice(0, 2).join(', ')}`);
    }

    // Material preferences (for non-food crafts)
    const materialParts: string[] = [];
    if (friend.favoriteColor) {
      materialParts.push(`favorite color: ${friend.favoriteColor}`);
    }
    if (friend.dislikedColor) {
      materialParts.push(`hates ${friend.dislikedColor}`);
    }
    if (friend.favoriteClothing) {
      materialParts.push(`loves ${friend.favoriteClothing} clothing`);
    }
    if (friend.favoriteWeapon) {
      materialParts.push(`prefers ${friend.favoriteWeapon}s`);
    }
    if (friend.favoriteMetal) {
      materialParts.push(`loves ${friend.favoriteMetal}`);
    }
    if (friend.favoritePlant) {
      materialParts.push(`loves ${friend.favoritePlant}`);
    }

    lines.push(parts.join(' '));
    if (materialParts.length > 0) {
      lines.push(`    (${materialParts.join(', ')})`);
    }
  }

  return lines.join('\n');
}

/**
 * Check if agent can experiment (has skill and ingredients)
 * @param recipeType - Type of recipe to experiment with (determines skill check)
 * @param minSkill - Minimum skill level required (default 3)
 */
export function canAgentExperiment(
  world: World,
  agent: Entity,
  recipeType: RecipeType = 'food',
  minSkill: number = 3
): { canExperiment: boolean; reason?: string; awareness?: IngredientAwarenessResult } {
  // Get the relevant skill for this recipe type
  const skillId = RECIPE_TYPE_TO_SKILL[recipeType];
  const skills = (agent as EntityImpl).getComponent<SkillsComponent>(CT.Skills);
  const skillLevel = skills?.levels?.[skillId] ?? 0;

  if (skillLevel < minSkill) {
    return {
      canExperiment: false,
      reason: `Requires ${skillId} skill ${minSkill}+ (current: ${skillLevel})`,
    };
  }

  // Get available ingredients using the relevant skill
  const awareness = getAvailableIngredients(world, agent, skillId);

  // Need at least 2 different ingredients to experiment
  const uniqueIngredients = new Set(awareness.ingredients.map(i => i.itemId));
  if (uniqueIngredients.size < 2) {
    return {
      canExperiment: false,
      reason: 'Need at least 2 different ingredients to experiment',
      awareness,
    };
  }

  // Check for appropriate ingredients based on recipe type
  const hasAppropriateIngredient = checkHasAppropriateIngredients(awareness.ingredients, recipeType);

  if (!hasAppropriateIngredient.has) {
    return {
      canExperiment: false,
      reason: hasAppropriateIngredient.reason,
      awareness,
    };
  }

  return {
    canExperiment: true,
    awareness,
  };
}

/**
 * Check if ingredients are appropriate for the recipe type
 */
function checkHasAppropriateIngredients(
  ingredients: AvailableIngredient[],
  recipeType: RecipeType
): { has: boolean; reason: string } {
  switch (recipeType) {
    case 'food': {
      const hasEdible = ingredients.some(ing => {
        const item = itemRegistry.tryGet(ing.itemId);
        return item?.isEdible || item?.category === 'food';
      });
      return {
        has: hasEdible,
        reason: 'No edible ingredients available',
      };
    }

    case 'clothing': {
      const hasTextile = ingredients.some(ing => {
        const id = ing.itemId.toLowerCase();
        return id.includes('fiber') || id.includes('leather') ||
               id.includes('cloth') || id.includes('wool') || id.includes('hide');
      });
      return {
        has: hasTextile,
        reason: 'No textile materials available (fiber, leather, cloth, wool)',
      };
    }

    case 'potion': {
      const hasAlchemical = ingredients.some(ing => {
        const item = itemRegistry.tryGet(ing.itemId);
        const id = ing.itemId.toLowerCase();
        return item?.category === 'consumable' ||
               id.includes('herb') || id.includes('flower') ||
               id.includes('mushroom') || id.includes('berry');
      });
      return {
        has: hasAlchemical,
        reason: 'No alchemical ingredients available (herbs, flowers, mushrooms)',
      };
    }

    case 'tool': {
      const hasMaterials = ingredients.some(ing => {
        const id = ing.itemId.toLowerCase();
        return id.includes('wood') || id.includes('stone') ||
               id.includes('iron') || id.includes('metal') || id.includes('ingot');
      });
      return {
        has: hasMaterials,
        reason: 'No crafting materials available (wood, stone, metal)',
      };
    }

    case 'art':
    case 'decoration':
      // Art and decoration can use almost any materials
      return {
        has: ingredients.length >= 2,
        reason: 'Need at least 2 ingredients for artistic work',
      };

    default:
      return { has: true, reason: '' };
  }
}
