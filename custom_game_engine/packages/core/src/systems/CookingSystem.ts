/**
 * CookingSystem - Integrates cooking skill with crafting for food items
 *
 * Listens to crafting:completed events and for food recipes:
 * - Calculates food quality based on cooking skill, mood, and recipe familiarity
 * - Tracks recipe experience for quality bonuses
 * - Applies skill synergy bonuses (e.g., Farm to Table)
 * - Emits cooking:completed event with quality information
 *
 * Uses unified SkillsComponent for all skill tracking:
 * - domains.cooking.familiarity for recipe familiarity
 * - domains.cooking.specializations for cooking method specializations
 * - levels.cooking for base skill level
 * - synergies for cross-skill bonuses
 *
 * Part of Phase 4: Cooking Skill System (refactored to use unified skills)
 */

import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { Entity } from '../ecs/Entity.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { EntityId } from '../types.js';
import type { EventBus } from '../events/EventBus.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { RecipeRegistry } from '../crafting/RecipeRegistry.js';
import type { Recipe } from '../crafting/Recipe.js';
import type { MoodComponent } from '../components/MoodComponent.js';
import {
  type SkillsComponent,
  createSkillsComponent,
  getQualityMultiplier,
  getTotalSynergyQualityBonus,
  recordTaskCompletion,
  addSpecializationXP,
  getTaskFamiliarityBonus,
  getSpecializationBonus,
} from '../components/SkillsComponent.js';

/**
 * Map station types to cooking specializations.
 */
const STATION_SPECIALIZATIONS: Record<string, string> = {
  'oven': 'baking',
  'campfire': 'grilling',
  'grill': 'grilling',
  'cauldron': 'stewing',
  'pot': 'stewing',
  'smoker': 'preservation',
  'drying_rack': 'preservation',
  'butchering_table': 'butchering',
};

/**
 * Event data for cooking completion.
 */
export interface CookingCompletedEventData {
  agentId: EntityId;
  recipeId: string;
  itemId: string;
  quantity: number;
  quality: number;
  xpGained: number;
  leveledUp: boolean;
  newLevel?: number;
}

/**
 * CookingSystem processes food crafting to apply cooking skill effects.
 */
export class CookingSystem extends BaseSystem {
  public readonly id = 'cooking' as const;
  public readonly priority = 56; // Just after CraftingSystem (55)
  public readonly requiredComponents = [] as const;

  private recipeRegistry: RecipeRegistry | null = null;

  /**
   * Set the recipe registry for looking up recipes.
   */
  setRecipeRegistry(registry: RecipeRegistry): void {
    this.recipeRegistry = registry;
  }

  /**
   * Initialize the system and subscribe to events.
   */
  protected async onInitialize(world: World, eventBus: EventBus): Promise<void> {
    // Subscribe to crafting:completed events
    eventBus.subscribe('crafting:completed', (event) => {
      this.handleCraftingCompleted(
        world,
        event.data.agentId,
        event.data.recipeId,
        event.data.produced
      );
    });
  }

  /**
   * Handle crafting completion - apply cooking skill effects for food items.
   */
  private handleCraftingCompleted(
    world: World,
    agentId: EntityId,
    recipeId: string,
    produced: Array<{ itemId: string; amount: number }>
  ): void {
    // Check if this is a food recipe
    const recipe = this.getRecipe(recipeId);
    if (!recipe || recipe.category !== 'Food') {
      return; // Not a food recipe, nothing to do
    }

    // Get the agent
    const entity = world.getEntity(agentId);
    if (!entity) {
      throw new Error(`Agent entity ${agentId} not found`);
    }

    // Get or create skills component
    let skillsComp = this.getOrCreateSkillsComponent(entity as EntityImpl);

    // Get mood bonus from agent's current mood
    const moodBonus = this.getMoodBonus(entity);

    // Calculate food quality using unified skill system
    const quality = this.calculateCookingQuality(
      skillsComp,
      recipeId,
      recipe.stationRequired,
      moodBonus
    );

    // Determine XP gain based on recipe complexity
    const complexity = this.determineComplexity(recipe.craftingTime, recipe.xpGain);
    const baseXp = this.getXpForComplexity(complexity);

    // Record task completion (updates familiarity)
    const tick = world.tick;
    skillsComp = recordTaskCompletion(skillsComp, 'cooking', recipeId, quality, tick);

    // Update specialization if station-based recipe
    const specName = this.getSpecializationForStation(recipe.stationRequired);
    if (specName) {
      const specXp = Math.ceil(baseXp / 2);
      skillsComp = addSpecializationXP(skillsComp, 'cooking', specName, specXp);
    }

    // Update the component on the entity
    (entity as EntityImpl).updateComponent<SkillsComponent>(CT.Skills, () => skillsComp);

    // Calculate total produced
    const totalProduced = produced.reduce((sum, p) => sum + p.amount, 0);

    // Emit cooking:completed event
    const eventData: CookingCompletedEventData = {
      agentId,
      recipeId,
      itemId: recipe.output.itemId,
      quantity: totalProduced,
      quality,
      xpGained: baseXp,
      leveledUp: false, // XP is awarded by SkillSystem listening to events
      newLevel: undefined,
    };

    world.eventBus.emit({
      type: 'cooking:completed',
      source: 'cooking-system',
      data: eventData,
    });
  }

  /**
   * Get or create skills component for an entity.
   */
  private getOrCreateSkillsComponent(entity: EntityImpl): SkillsComponent {
    let skills = entity.getComponent<SkillsComponent>(CT.Skills);
    if (!skills) {
      skills = createSkillsComponent();
      entity.addComponent(skills);
    }
    return skills;
  }

  /**
   * Get recipe from registry.
   */
  private getRecipe(recipeId: string): Recipe | null {
    if (!this.recipeRegistry) {
      return null;
    }
    try {
      return this.recipeRegistry.getRecipe(recipeId);
    } catch {
      return null;
    }
  }

  /**
   * Get specialization name for a station type.
   */
  private getSpecializationForStation(stationRequired: string | null): string | null {
    if (!stationRequired) {
      return null;
    }
    return STATION_SPECIALIZATIONS[stationRequired] ?? null;
  }

  /**
   * Calculate cooking quality using unified skill system.
   *
   * Quality factors:
   * - Base quality from SkillsComponent cooking level (0.7 to 1.2 multiplier)
   * - Recipe familiarity bonus from domains.cooking.familiarity (0-20)
   * - Specialization bonus from domains.cooking.specializations (0-10)
   * - Synergy bonus from SkillsComponent (e.g., Farm to Table)
   * - Mood bonus (-10 to +10)
   *
   * Returns quality 0-100.
   */
  private calculateCookingQuality(
    skills: SkillsComponent,
    recipeId: string,
    stationRequired: string | null,
    moodBonus: number
  ): number {
    // Base quality: 50 points
    let quality = 50;

    // Apply cooking skill quality multiplier (0.7 to 1.2)
    const cookingLevel = skills.levels.cooking ?? 0;
    const qualityMultiplier = getQualityMultiplier(cookingLevel);
    quality *= qualityMultiplier;

    // Recipe familiarity bonus (0-20)
    const familiarityBonus = getTaskFamiliarityBonus(skills, 'cooking', recipeId);
    quality += familiarityBonus;

    // Specialization bonus (0-10)
    const specName = this.getSpecializationForStation(stationRequired);
    if (specName) {
      const specBonus = getSpecializationBonus(skills, 'cooking', specName);
      quality += specBonus;
    }

    // Synergy bonus (Farm to Table, Caretaker, etc.)
    const synergyBonus = getTotalSynergyQualityBonus(skills);
    quality *= 1 + synergyBonus;

    // Mood bonus (-10 to +10)
    quality += Math.max(-10, Math.min(10, moodBonus));

    // Random variance (-5 to +5)
    const variance = (Math.random() - 0.5) * 10;
    quality += variance;

    return Math.max(0, Math.min(100, Math.round(quality)));
  }

  /**
   * Get mood bonus for cooking quality.
   * Happy cooks make better food!
   */
  private getMoodBonus(entity: Entity): number {
    const mood = entity.getComponent<MoodComponent>(CT.Mood);
    if (!mood) {
      return 0;
    }

    // Convert mood (0-100) to bonus (-10 to +10)
    // 50 = neutral (0 bonus)
    // 100 = very happy (+10 bonus)
    // 0 = very unhappy (-10 bonus)
    return ((mood.currentMood - 50) / 50) * 10;
  }

  /**
   * Determine recipe complexity from crafting time and XP gain.
   */
  private determineComplexity(craftingTime: number, xpGain: number): 'simple' | 'intermediate' | 'advanced' | 'masterwork' {
    const score = craftingTime + xpGain;
    if (score >= 60) return 'masterwork';
    if (score >= 30) return 'advanced';
    if (score >= 15) return 'intermediate';
    return 'simple';
  }

  /**
   * Get XP gain for recipe complexity.
   */
  private getXpForComplexity(complexity: 'simple' | 'intermediate' | 'advanced' | 'masterwork'): number {
    switch (complexity) {
      case 'simple':
        return 5;
      case 'intermediate':
        return 15;
      case 'advanced':
        return 30;
      case 'masterwork':
        return 50;
    }
  }

  /**
   * System update - currently no per-tick processing needed.
   * All cooking logic is event-driven.
   */
  protected onUpdate(_ctx: SystemContext): void {
    // No per-tick updates needed - all logic is event-driven
  }
}
