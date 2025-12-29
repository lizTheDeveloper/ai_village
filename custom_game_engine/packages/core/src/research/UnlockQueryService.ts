/**
 * UnlockQueryService - Central service for checking unlock status
 *
 * This service wraps existing registries (ItemRegistry, RecipeRegistry,
 * BuildingBlueprintRegistry) to provide research-aware unlock checking.
 *
 * Key design: Does NOT modify existing registries. Instead, wraps them
 * with filtering based on research state.
 *
 * Part of Phase 13: Research & Discovery
 */

import type { ResearchStateComponent } from '../components/ResearchStateComponent.js';
import type { ResearchDefinition, ResearchProgress } from './types.js';
import { ResearchRegistry } from './ResearchRegistry.js';

/**
 * Unlock progress info for UI display.
 */
export interface UnlockProgress {
  contentId: string;
  contentType: 'recipe' | 'building' | 'item' | 'research';
  isUnlocked: boolean;
  requiredResearch: string[];
  completedResearch: string[];
  missingResearch: string[];
  progress: number; // 0-1 percentage
}

/**
 * Central service for querying unlock status across all registries.
 * Wraps existing registries without modifying them.
 */
export class UnlockQueryService {
  constructor(
    private researchState: ResearchStateComponent,
    private researchRegistry: ResearchRegistry
  ) {}

  /**
   * Update the research state reference.
   * Called when research state changes.
   */
  updateResearchState(state: ResearchStateComponent): void {
    this.researchState = state;
  }

  // === Research State Queries ===

  /**
   * Check if a research project is completed.
   */
  isResearchCompleted(researchId: string): boolean {
    return this.researchState.completed.has(researchId);
  }

  /**
   * Check if a research project is available to start.
   * Available means all prerequisites are completed but not the research itself.
   */
  isResearchAvailable(researchId: string): boolean {
    if (this.researchState.completed.has(researchId)) {
      return false;
    }
    return this.researchRegistry.canStart(researchId, this.researchState.completed);
  }

  /**
   * Check if a research project is in progress.
   */
  isResearchInProgress(researchId: string): boolean {
    return this.researchState.inProgress.has(researchId);
  }

  /**
   * Get all completed research IDs.
   */
  getCompletedResearch(): string[] {
    return Array.from(this.researchState.completed);
  }

  /**
   * Get all in-progress research.
   */
  getInProgressResearch(): Map<string, ResearchProgress> {
    return this.researchState.inProgress;
  }

  // === Recipe Unlock Queries ===

  /**
   * Check if a recipe is unlocked based on research requirements.
   * @param researchRequirements - Array of research IDs required to unlock
   */
  isRecipeUnlocked(researchRequirements: string[]): boolean {
    if (researchRequirements.length === 0) {
      return true; // No research required
    }
    return researchRequirements.every((reqId) =>
      this.researchState.completed.has(reqId)
    );
  }

  /**
   * Check if a recipe with given ID is unlocked.
   * Requires passing the recipe's research requirements.
   */
  isRecipeUnlockedById(
    _recipeId: string,
    researchRequirements: string[]
  ): boolean {
    return this.isRecipeUnlocked(researchRequirements);
  }

  // === Building Unlock Queries ===

  /**
   * Check if a building is unlocked based on tech requirements.
   * @param techRequired - Array of research IDs required to unlock
   */
  isBuildingUnlocked(techRequired: string[]): boolean {
    if (techRequired.length === 0) {
      return true; // No tech required
    }
    return techRequired.every((techId) =>
      this.researchState.completed.has(techId)
    );
  }

  /**
   * Check if a building with given ID is unlocked.
   * Requires passing the building's tech requirements.
   */
  isBuildingUnlockedById(_buildingId: string, techRequired: string[]): boolean {
    return this.isBuildingUnlocked(techRequired);
  }

  // === Item Unlock Queries ===

  /**
   * Check if an item is unlocked.
   * Items are unlocked when their research requirements are met.
   * Most items have no requirements (base game items).
   */
  isItemUnlocked(itemId: string): boolean {
    // Check if any completed research unlocks this item
    for (const researchId of this.researchState.completed) {
      const research = this.researchRegistry.tryGet(researchId);
      if (research) {
        for (const unlock of research.unlocks) {
          if (unlock.type === 'item' && unlock.itemId === itemId) {
            return true;
          }
        }
      }
    }
    // Items without research requirements are always unlocked
    // Check if any research exists that unlocks this item
    const allResearch = this.researchRegistry.getAll();
    const hasRequirement = allResearch.some((r) =>
      r.unlocks.some((u) => u.type === 'item' && u.itemId === itemId)
    );
    return !hasRequirement; // Unlocked if no research unlocks it
  }

  // === Filtered Queries ===

  /**
   * Get all research that is available to start.
   */
  getAvailableResearch(): ResearchDefinition[] {
    return this.researchRegistry.getNextAvailable(this.researchState.completed);
  }

  /**
   * Get all completed research definitions.
   */
  getCompletedResearchDefinitions(): ResearchDefinition[] {
    return Array.from(this.researchState.completed)
      .map((id) => this.researchRegistry.tryGet(id))
      .filter((r): r is ResearchDefinition => r !== undefined);
  }

  /**
   * Get all items unlocked by completed research.
   */
  getUnlockedItems(): string[] {
    const unlocked: Set<string> = new Set();

    for (const researchId of this.researchState.completed) {
      const research = this.researchRegistry.tryGet(researchId);
      if (research) {
        for (const unlock of research.unlocks) {
          if (unlock.type === 'item') {
            unlocked.add(unlock.itemId);
          }
        }
      }
    }

    return Array.from(unlocked);
  }

  /**
   * Get all recipes unlocked by completed research.
   */
  getUnlockedRecipeIds(): string[] {
    const unlocked: Set<string> = new Set();

    for (const researchId of this.researchState.completed) {
      const research = this.researchRegistry.tryGet(researchId);
      if (research) {
        for (const unlock of research.unlocks) {
          if (unlock.type === 'recipe') {
            unlocked.add(unlock.recipeId);
          }
        }
      }
    }

    return Array.from(unlocked);
  }

  /**
   * Get all buildings unlocked by completed research.
   */
  getUnlockedBuildingIds(): string[] {
    const unlocked: Set<string> = new Set();

    for (const researchId of this.researchState.completed) {
      const research = this.researchRegistry.tryGet(researchId);
      if (research) {
        for (const unlock of research.unlocks) {
          if (unlock.type === 'building') {
            unlocked.add(unlock.buildingId);
          }
        }
      }
    }

    return Array.from(unlocked);
  }

  // === Progress Info for UI ===

  /**
   * Get unlock progress for a recipe.
   */
  getRecipeUnlockProgress(
    recipeId: string,
    researchRequirements: string[]
  ): UnlockProgress {
    const completed = researchRequirements.filter((id) =>
      this.researchState.completed.has(id)
    );
    const missing = researchRequirements.filter(
      (id) => !this.researchState.completed.has(id)
    );

    return {
      contentId: recipeId,
      contentType: 'recipe',
      isUnlocked: missing.length === 0,
      requiredResearch: researchRequirements,
      completedResearch: completed,
      missingResearch: missing,
      progress:
        researchRequirements.length === 0
          ? 1
          : completed.length / researchRequirements.length,
    };
  }

  /**
   * Get unlock progress for a building.
   */
  getBuildingUnlockProgress(
    buildingId: string,
    techRequired: string[]
  ): UnlockProgress {
    const completed = techRequired.filter((id) =>
      this.researchState.completed.has(id)
    );
    const missing = techRequired.filter(
      (id) => !this.researchState.completed.has(id)
    );

    return {
      contentId: buildingId,
      contentType: 'building',
      isUnlocked: missing.length === 0,
      requiredResearch: techRequired,
      completedResearch: completed,
      missingResearch: missing,
      progress:
        techRequired.length === 0 ? 1 : completed.length / techRequired.length,
    };
  }

  /**
   * Get unlock progress for a research project.
   */
  getResearchProgress(researchId: string): UnlockProgress {
    const research = this.researchRegistry.tryGet(researchId);
    if (!research) {
      return {
        contentId: researchId,
        contentType: 'research',
        isUnlocked: false,
        requiredResearch: [],
        completedResearch: [],
        missingResearch: [],
        progress: 0,
      };
    }

    const completed = research.prerequisites.filter((id) =>
      this.researchState.completed.has(id)
    );
    const missing = research.prerequisites.filter(
      (id) => !this.researchState.completed.has(id)
    );

    return {
      contentId: researchId,
      contentType: 'research',
      isUnlocked: this.researchState.completed.has(researchId),
      requiredResearch: research.prerequisites,
      completedResearch: completed,
      missingResearch: missing,
      progress:
        research.prerequisites.length === 0
          ? this.researchState.completed.has(researchId)
            ? 1
            : 0
          : completed.length / research.prerequisites.length,
    };
  }

  // === Discovery/Generation Queries ===

  /**
   * Get all procedurally discovered research.
   */
  getDiscoveredResearch(): string[] {
    return [...this.researchState.discoveredResearch];
  }

  /**
   * Check if discovery rate limit is exceeded.
   */
  isDiscoveryRateLimited(maxDaily: number): boolean {
    return this.researchState.dailyDiscoveries >= maxDaily;
  }

  /**
   * Get discovery counts.
   */
  getDiscoveryCounts(): { daily: number; seasonal: number } {
    return {
      daily: this.researchState.dailyDiscoveries,
      seasonal: this.researchState.seasonalDiscoveries,
    };
  }
}
