import type { System } from '../ecs/System.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus as CoreEventBus } from '../events/EventBus.js';

/**
 * PublishingUnlockSystem monitors research progress and grants technologies
 *
 * When research papers are published, this system checks if any publishing
 * technologies have been unlocked (using N-of-M logic from research sets).
 *
 * Responsibilities:
 * - Track published papers
 * - Check unlock conditions for publishing technologies
 * - Grant buildings, abilities, and recipes
 * - Emit unlock events
 */
export class PublishingUnlockSystem implements System {
  public readonly id: SystemId = 'publishing_unlock';
  public readonly priority = 15; // Early, to detect unlocks quickly
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];
  private eventBus: CoreEventBus;

  // Track published papers (paper ID → publication tick)
  private publishedPapers: Set<string> = new Set();

  // Track unlocked technologies
  private unlockedTechnologies: Set<string> = new Set();

  // Inject research set functions from world package
  private isPublishingTechnologyUnlocked:
    | ((techId: string, papers: Set<string>) => boolean)
    | null = null;
  private getAllPublishingSets: (() => any[]) | null = null;

  constructor(eventBus: CoreEventBus) {
    this.eventBus = eventBus;
    this.registerEventListeners();
  }

  /**
   * Set research set lookup functions (injected from world package)
   */
  public setResearchSetLookup(
    isUnlocked: (techId: string, papers: Set<string>) => boolean,
    getAllSets: () => any[]
  ): void {
    this.isPublishingTechnologyUnlocked = isUnlocked;
    this.getAllPublishingSets = getAllSets;
  }

  private registerEventListeners(): void {
    // Listen for paper publications
    this.eventBus.on('research:paper_published', (event) => {
      this.handlePaperPublished(event.data);
    });

    // Listen for manual unlock requests
    this.eventBus.on('publishing:check_unlocks', () => {
      this.checkAllUnlocks();
    });
  }

  public update(_world: World, _entities: Entity[], _deltaTime: number): void {
    // Mostly event-driven system
    // Could add periodic unlock checks if needed
  }

  /**
   * Handle paper publication event
   */
  private handlePaperPublished(event: any): void {
    const { paperId, authorId, field } = event;

    // Add to published papers
    if (this.publishedPapers.has(paperId)) {
      return; // Already published
    }

    this.publishedPapers.add(paperId);

    // Check if this unlocks any technologies
    this.checkAllUnlocks();

    this.eventBus.emit({
      type: 'publishing:paper_recorded',
      source: this.id,
      data: {
        paperId,
        authorId,
        field,
        totalPublished: this.publishedPapers.size,
      },
    });
  }

  /**
   * Check all publishing technologies for unlocks
   */
  private checkAllUnlocks(): void {
    if (!this.isPublishingTechnologyUnlocked || !this.getAllPublishingSets) {
      return; // Not configured yet
    }

    const allSets = this.getAllPublishingSets();

    // Check each set's unlock conditions
    for (const set of allSets) {
      for (const unlockCondition of set.unlocks) {
        const techId = unlockCondition.technologyId;

        // Skip if already unlocked
        if (this.unlockedTechnologies.has(techId)) {
          continue;
        }

        // Check if unlock conditions met
        const isUnlocked = this.isPublishingTechnologyUnlocked(
          techId,
          this.publishedPapers
        );

        if (isUnlocked) {
          this.unlockTechnology(techId, unlockCondition, set);
        }
      }
    }
  }

  /**
   * Unlock a technology and grant its benefits
   */
  private unlockTechnology(
    techId: string,
    unlockCondition: any,
    set: any
  ): void {
    this.unlockedTechnologies.add(techId);

    // Grant all benefits
    for (const grant of unlockCondition.grants) {
      this.grantUnlock(grant);
    }

    // Emit unlock event
    this.eventBus.emit({
      type: 'publishing:technology_unlocked',
      source: this.id,
      data: {
        technologyId: techId,
        setId: set.setId,
        setName: set.name,
        grants: unlockCondition.grants,
        papersPublished: this.publishedPapers.size,
      },
    });
  }

  /**
   * Grant a specific unlock (building, ability, recipe, etc.)
   */
  private grantUnlock(grant: any): void {
    switch (grant.type) {
      case 'building':
        this.eventBus.emit({
          type: 'research:unlocked',
          source: this.id,
          data: {
            researchId: grant.buildingId || grant.id,
            type: 'building',
            contentId: grant.buildingId || grant.id,
          },
        });
        break;

      case 'ability':
        this.eventBus.emit({
          type: 'research:unlocked',
          source: this.id,
          data: {
            researchId: grant.abilityId || grant.id,
            type: 'ability',
            contentId: grant.abilityId || grant.id,
          },
        });
        break;

      case 'recipe':
        this.eventBus.emit({
          type: 'research:unlocked',
          source: this.id,
          data: {
            researchId: grant.recipeId || grant.id,
            type: 'recipe',
            contentId: grant.recipeId || grant.id,
          },
        });
        break;

      case 'item':
        this.eventBus.emit({
          type: 'research:unlocked',
          source: this.id,
          data: {
            researchId: grant.itemId || grant.id,
            type: 'item',
            contentId: grant.itemId || grant.id,
          },
        });
        break;

      default:
        console.warn(`Unknown unlock type: ${grant.type}`);
    }
  }

  /**
   * Get current unlock status for a technology
   */
  public getTechnologyStatus(techId: string): {
    unlocked: boolean;
    progress: number;
  } {
    const unlocked = this.unlockedTechnologies.has(techId);

    // Calculate progress if not unlocked
    let progress = 0;
    if (!unlocked && this.isPublishingTechnologyUnlocked) {
      // Would need to calculate current progress vs required
      // For now, just return unlocked status
      progress = 0;
    }

    return { unlocked, progress };
  }

  /**
   * Get all unlocked technologies
   */
  public getUnlockedTechnologies(): string[] {
    return Array.from(this.unlockedTechnologies);
  }

  /**
   * Get all published papers
   */
  public getPublishedPapers(): string[] {
    return Array.from(this.publishedPapers);
  }

  public onAddEntity(_world: World, _entity: Entity): void {
    // No specific entity tracking needed
  }

  public onRemoveEntity(_world: World, _entity: Entity): void {
    // No specific entity tracking needed
  }
}
