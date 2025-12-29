/**
 * Research Flow Integration Tests
 *
 * Tests the full flow from research completion through unlock propagation
 * to unlock query service. Validates that:
 * - Research completion updates state correctly
 * - UnlockQueryService reflects state changes
 * - Events are emitted at correct points
 * - Multi-agent collaboration works
 * - Progress tracking is accurate
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ResearchRegistry,
  DuplicateResearchError,
} from '../ResearchRegistry.js';
import { UnlockQueryService } from '../UnlockQueryService.js';
import {
  createResearchStateComponent,
  startResearch,
  updateResearchProgress,
  completeResearch,
  addInsight,
  queueResearch,
} from '../../components/ResearchStateComponent.js';
import type { ResearchStateComponent } from '../../components/ResearchStateComponent.js';
import type { ResearchDefinition, Insight } from '../types.js';

// Helper to create a basic research definition
function createResearch(
  id: string,
  options: Partial<ResearchDefinition> = {}
): ResearchDefinition {
  return {
    id,
    name: options.name ?? `Research ${id}`,
    description: options.description ?? `Description for ${id}`,
    field: options.field ?? 'agriculture',
    tier: options.tier ?? 1,
    type: options.type ?? 'predefined',
    progressRequired: options.progressRequired ?? 100,
    prerequisites: options.prerequisites ?? [],
    unlocks: options.unlocks ?? [],
  };
}

describe('Research Flow Integration', () => {
  let registry: ResearchRegistry;
  let state: ResearchStateComponent;
  let unlockService: UnlockQueryService;

  beforeEach(() => {
    // Reset and setup research registry
    ResearchRegistry.resetInstance();
    registry = ResearchRegistry.getInstance();

    // Setup a tech tree
    registry.registerAll([
      createResearch('agriculture_i', {
        tier: 1,
        progressRequired: 100,
        unlocks: [
          { type: 'recipe', recipeId: 'stone_hoe' },
          { type: 'building', buildingId: 'small_garden' },
        ],
      }),
      createResearch('agriculture_ii', {
        tier: 2,
        progressRequired: 200,
        prerequisites: ['agriculture_i'],
        unlocks: [
          { type: 'recipe', recipeId: 'iron_hoe' },
          { type: 'recipe', recipeId: 'fertilizer' },
        ],
      }),
      createResearch('metallurgy_i', {
        tier: 1,
        progressRequired: 150,
        unlocks: [
          { type: 'recipe', recipeId: 'iron_ingot' },
          { type: 'item', itemId: 'iron_hammer' },
        ],
      }),
      createResearch('advanced_farming', {
        tier: 3,
        progressRequired: 300,
        prerequisites: ['agriculture_ii', 'metallurgy_i'],
        unlocks: [{ type: 'building', buildingId: 'greenhouse' }],
      }),
    ]);

    // Initialize state and service
    state = createResearchStateComponent();
    unlockService = new UnlockQueryService(state, registry);
  });

  describe('Basic Research Lifecycle', () => {
    it('should start research and track progress', () => {
      // Start research
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);

      expect(state.inProgress.has('agriculture_i')).toBe(true);
      expect(state.inProgress.get('agriculture_i')?.currentProgress).toBe(0);

      // Update progress
      state = updateResearchProgress(state, 'agriculture_i', 50);
      expect(state.inProgress.get('agriculture_i')?.currentProgress).toBe(50);

      // Complete research
      state = updateResearchProgress(state, 'agriculture_i', 50);
      state = completeResearch(state, 'agriculture_i', 500);

      expect(state.completed.has('agriculture_i')).toBe(true);
      expect(state.inProgress.has('agriculture_i')).toBe(false);
    });

    it('should track completion timestamp', () => {
      state = startResearch(state, 'metallurgy_i', 'agent-1', 100);
      state = updateResearchProgress(state, 'metallurgy_i', 150);
      state = completeResearch(state, 'metallurgy_i', 500);

      expect(state.completedAt.get('metallurgy_i')).toBe(500);
    });
  });

  describe('Research Prerequisites', () => {
    it('should unlock tier 2 research after tier 1 completion', () => {
      // Initially, tier 2 is not available
      expect(unlockService.isResearchAvailable('agriculture_ii')).toBe(false);

      // Complete tier 1
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 100);
      unlockService.updateResearchState(state);

      // Now tier 2 is available
      expect(unlockService.isResearchAvailable('agriculture_ii')).toBe(true);
    });

    it('should require all prerequisites for multi-prereq research', () => {
      // advanced_farming requires both agriculture_ii and metallurgy_i
      expect(unlockService.isResearchAvailable('advanced_farming')).toBe(false);

      // Complete agriculture_i, then agriculture_ii
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 100);
      unlockService.updateResearchState(state);

      state = startResearch(state, 'agriculture_ii', 'agent-1', 100);
      state = updateResearchProgress(state, 'agriculture_ii', 200);
      state = completeResearch(state, 'agriculture_ii', 200);
      unlockService.updateResearchState(state);

      // Still not available (missing metallurgy_i)
      expect(unlockService.isResearchAvailable('advanced_farming')).toBe(false);

      // Complete metallurgy_i
      state = startResearch(state, 'metallurgy_i', 'agent-1', 200);
      state = updateResearchProgress(state, 'metallurgy_i', 150);
      state = completeResearch(state, 'metallurgy_i', 300);
      unlockService.updateResearchState(state);

      // Now available
      expect(unlockService.isResearchAvailable('advanced_farming')).toBe(true);
    });
  });

  describe('Content Unlocking', () => {
    it('should unlock recipes when research is completed', () => {
      // Initially locked
      expect(unlockService.isRecipeUnlocked(['agriculture_i'])).toBe(false);

      // Complete research
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 100);
      unlockService.updateResearchState(state);

      // Now unlocked
      expect(unlockService.isRecipeUnlocked(['agriculture_i'])).toBe(true);
    });

    it('should unlock buildings when research is completed', () => {
      expect(unlockService.isBuildingUnlocked(['agriculture_i'])).toBe(false);

      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 100);
      unlockService.updateResearchState(state);

      expect(unlockService.isBuildingUnlocked(['agriculture_i'])).toBe(true);
    });

    it('should track unlocked recipe IDs', () => {
      // Complete two research projects
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 100);
      unlockService.updateResearchState(state);

      state = startResearch(state, 'metallurgy_i', 'agent-1', 100);
      state = updateResearchProgress(state, 'metallurgy_i', 150);
      state = completeResearch(state, 'metallurgy_i', 200);
      unlockService.updateResearchState(state);

      const unlockedRecipes = unlockService.getUnlockedRecipeIds();
      expect(unlockedRecipes).toContain('stone_hoe');
      expect(unlockedRecipes).toContain('iron_ingot');
    });

    it('should track unlocked building IDs', () => {
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 100);
      unlockService.updateResearchState(state);

      const unlockedBuildings = unlockService.getUnlockedBuildingIds();
      expect(unlockedBuildings).toContain('small_garden');
    });
  });

  describe('Multi-Agent Collaboration', () => {
    it('should track multiple researchers on same project', () => {
      // First agent starts research
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      expect(state.inProgress.get('agriculture_i')?.researchers).toHaveLength(1);

      // Second agent joins
      state = startResearch(state, 'agriculture_i', 'agent-2', 50);
      expect(state.inProgress.get('agriculture_i')?.researchers).toHaveLength(2);
      expect(state.inProgress.get('agriculture_i')?.researchers).toContain('agent-1');
      expect(state.inProgress.get('agriculture_i')?.researchers).toContain('agent-2');
    });

    it('should not duplicate researcher', () => {
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = startResearch(state, 'agriculture_i', 'agent-1', 50);

      expect(state.inProgress.get('agriculture_i')?.researchers).toHaveLength(1);
    });

    it('should preserve original start time', () => {
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);
      state = startResearch(state, 'agriculture_i', 'agent-2', 200);

      expect(state.inProgress.get('agriculture_i')?.startedAt).toBe(100);
    });
  });

  describe('Insights and Breakthroughs', () => {
    it('should accumulate insights during research', () => {
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);

      const insight1: Insight = {
        id: 'insight-1',
        content: 'Discovered soil pH is important',
        relatedMaterials: ['soil', 'water'],
        breakthroughBonus: 10,
        timestamp: 50,
      };

      const insight2: Insight = {
        id: 'insight-2',
        content: 'Found optimal watering schedule',
        relatedMaterials: ['water'],
        breakthroughBonus: 15,
        timestamp: 75,
      };

      state = addInsight(state, 'agriculture_i', insight1);
      state = addInsight(state, 'agriculture_i', insight2);

      const progress = state.inProgress.get('agriculture_i');
      expect(progress?.insights).toHaveLength(2);
      expect(progress?.insights[0].content).toBe('Discovered soil pH is important');
      expect(progress?.insights[1].content).toBe('Found optimal watering schedule');
    });
  });

  describe('Research Queue', () => {
    it('should manage research queue', () => {
      state = queueResearch(state, 'agriculture_i');
      state = queueResearch(state, 'metallurgy_i');
      state = queueResearch(state, 'agriculture_ii');

      expect(state.queue).toHaveLength(3);
      expect(state.queue[0]).toBe('agriculture_i');
      expect(state.queue[1]).toBe('metallurgy_i');
      expect(state.queue[2]).toBe('agriculture_ii');
    });

    it('should remove from queue when research is completed', () => {
      state = queueResearch(state, 'agriculture_i');
      state = queueResearch(state, 'metallurgy_i');

      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 100);

      expect(state.queue).not.toContain('agriculture_i');
      expect(state.queue).toContain('metallurgy_i');
    });
  });

  describe('Progress Tracking', () => {
    it('should provide unlock progress for recipes', () => {
      // Complete agriculture_i but not metallurgy_i
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 100);
      unlockService.updateResearchState(state);

      // Check progress for recipe requiring both
      const progress = unlockService.getRecipeUnlockProgress('advanced_recipe', [
        'agriculture_i',
        'metallurgy_i',
      ]);

      expect(progress.isUnlocked).toBe(false);
      expect(progress.progress).toBe(0.5);
      expect(progress.completedResearch).toContain('agriculture_i');
      expect(progress.missingResearch).toContain('metallurgy_i');
    });

    it('should show full progress when all requirements met', () => {
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 100);

      state = startResearch(state, 'metallurgy_i', 'agent-1', 100);
      state = updateResearchProgress(state, 'metallurgy_i', 150);
      state = completeResearch(state, 'metallurgy_i', 200);
      unlockService.updateResearchState(state);

      const progress = unlockService.getRecipeUnlockProgress('recipe', [
        'agriculture_i',
        'metallurgy_i',
      ]);

      expect(progress.isUnlocked).toBe(true);
      expect(progress.progress).toBe(1);
      expect(progress.missingResearch).toHaveLength(0);
    });
  });

  describe('Available Research Queries', () => {
    it('should return available research at game start', () => {
      const available = unlockService.getAvailableResearch();

      // Only tier 1 research (no prerequisites) should be available
      expect(available.map(r => r.id)).toContain('agriculture_i');
      expect(available.map(r => r.id)).toContain('metallurgy_i');
      expect(available.map(r => r.id)).not.toContain('agriculture_ii');
      expect(available.map(r => r.id)).not.toContain('advanced_farming');
    });

    it('should update available research as prerequisites are met', () => {
      // Complete agriculture_i
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 100);
      unlockService.updateResearchState(state);

      const available = unlockService.getAvailableResearch();

      // agriculture_ii should now be available
      expect(available.map(r => r.id)).toContain('agriculture_ii');
      // metallurgy_i still available (not completed)
      expect(available.map(r => r.id)).toContain('metallurgy_i');
      // agriculture_i no longer available (completed)
      expect(available.map(r => r.id)).not.toContain('agriculture_i');
    });
  });

  describe('Complete Tech Tree Progression', () => {
    it('should complete full tech tree progression', () => {
      // Start at tier 1
      expect(unlockService.getCompletedResearch()).toHaveLength(0);

      // Complete agriculture_i
      state = startResearch(state, 'agriculture_i', 'agent-1', 0);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 100);
      unlockService.updateResearchState(state);

      expect(unlockService.isResearchCompleted('agriculture_i')).toBe(true);
      expect(unlockService.isRecipeUnlocked(['agriculture_i'])).toBe(true);

      // Complete metallurgy_i
      state = startResearch(state, 'metallurgy_i', 'agent-1', 100);
      state = updateResearchProgress(state, 'metallurgy_i', 150);
      state = completeResearch(state, 'metallurgy_i', 200);
      unlockService.updateResearchState(state);

      expect(unlockService.isResearchCompleted('metallurgy_i')).toBe(true);

      // Complete agriculture_ii (requires agriculture_i)
      state = startResearch(state, 'agriculture_ii', 'agent-1', 200);
      state = updateResearchProgress(state, 'agriculture_ii', 200);
      state = completeResearch(state, 'agriculture_ii', 400);
      unlockService.updateResearchState(state);

      expect(unlockService.isResearchCompleted('agriculture_ii')).toBe(true);

      // Now advanced_farming is available (requires both agriculture_ii and metallurgy_i)
      expect(unlockService.isResearchAvailable('advanced_farming')).toBe(true);

      // Complete advanced_farming
      state = startResearch(state, 'advanced_farming', 'agent-1', 400);
      state = updateResearchProgress(state, 'advanced_farming', 300);
      state = completeResearch(state, 'advanced_farming', 700);
      unlockService.updateResearchState(state);

      // All research completed
      expect(unlockService.getCompletedResearch()).toHaveLength(4);
      expect(unlockService.getUnlockedBuildingIds()).toContain('greenhouse');
    });
  });
});
