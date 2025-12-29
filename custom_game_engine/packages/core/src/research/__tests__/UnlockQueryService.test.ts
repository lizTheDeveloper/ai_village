/**
 * Unit tests for UnlockQueryService
 *
 * Tests unlock status checking for recipes, buildings, items,
 * and research projects.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { UnlockQueryService } from '../UnlockQueryService.js';
import { ResearchRegistry } from '../ResearchRegistry.js';
import { createResearchStateComponent } from '../../components/ResearchStateComponent.js';
import type { ResearchDefinition } from '../types.js';
import type { ResearchStateComponent } from '../../components/ResearchStateComponent.js';

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

describe('UnlockQueryService', () => {
  let registry: ResearchRegistry;
  let state: ResearchStateComponent;
  let service: UnlockQueryService;

  beforeEach(() => {
    ResearchRegistry.resetInstance();
    registry = ResearchRegistry.getInstance();
    state = createResearchStateComponent();
    service = new UnlockQueryService(state, registry);

    // Set up a basic tech tree
    registry.registerAll([
      createResearch('agriculture_i', {
        tier: 1,
        unlocks: [
          { type: 'recipe', recipeId: 'stone_hoe' },
          { type: 'building', buildingId: 'small_garden' },
        ],
      }),
      createResearch('metallurgy_i', {
        tier: 2,
        prerequisites: ['agriculture_i'],
        unlocks: [
          { type: 'recipe', recipeId: 'iron_ingot' },
          { type: 'item', itemId: 'iron_hammer' },
        ],
      }),
      createResearch('alchemy_i', {
        tier: 3,
        prerequisites: ['metallurgy_i'],
        unlocks: [{ type: 'building', buildingId: 'alchemy_lab' }],
      }),
    ]);
  });

  describe('isResearchCompleted', () => {
    it('returns false for incomplete research', () => {
      expect(service.isResearchCompleted('agriculture_i')).toBe(false);
    });

    it('returns true for completed research', () => {
      state.completed.add('agriculture_i');

      expect(service.isResearchCompleted('agriculture_i')).toBe(true);
    });
  });

  describe('isResearchAvailable', () => {
    it('returns true for tier 1 research (no prereqs)', () => {
      expect(service.isResearchAvailable('agriculture_i')).toBe(true);
    });

    it('returns false for research with unmet prerequisites', () => {
      expect(service.isResearchAvailable('metallurgy_i')).toBe(false);
    });

    it('returns true when prerequisites are met', () => {
      state.completed.add('agriculture_i');

      expect(service.isResearchAvailable('metallurgy_i')).toBe(true);
    });

    it('returns false for already completed research', () => {
      state.completed.add('agriculture_i');

      expect(service.isResearchAvailable('agriculture_i')).toBe(false);
    });
  });

  describe('isResearchInProgress', () => {
    it('returns false for research not started', () => {
      expect(service.isResearchInProgress('agriculture_i')).toBe(false);
    });

    it('returns true for in-progress research', () => {
      state.inProgress.set('agriculture_i', {
        researchId: 'agriculture_i',
        currentProgress: 50,
        startedAt: 100,
        researchers: ['agent-1'],
        insights: [],
      });

      expect(service.isResearchInProgress('agriculture_i')).toBe(true);
    });
  });

  describe('getCompletedResearch', () => {
    it('returns empty array when nothing completed', () => {
      expect(service.getCompletedResearch()).toHaveLength(0);
    });

    it('returns completed research IDs', () => {
      state.completed.add('agriculture_i');
      state.completed.add('metallurgy_i');

      const completed = service.getCompletedResearch();

      expect(completed).toHaveLength(2);
      expect(completed).toContain('agriculture_i');
      expect(completed).toContain('metallurgy_i');
    });
  });

  describe('isRecipeUnlocked', () => {
    it('returns true for recipes with no requirements', () => {
      expect(service.isRecipeUnlocked([])).toBe(true);
    });

    it('returns false when requirements not met', () => {
      expect(service.isRecipeUnlocked(['metallurgy_i'])).toBe(false);
    });

    it('returns true when all requirements met', () => {
      state.completed.add('metallurgy_i');

      expect(service.isRecipeUnlocked(['metallurgy_i'])).toBe(true);
    });

    it('returns false when only some requirements met', () => {
      state.completed.add('agriculture_i');

      expect(
        service.isRecipeUnlocked(['agriculture_i', 'metallurgy_i'])
      ).toBe(false);
    });

    it('returns true when all multiple requirements met', () => {
      state.completed.add('agriculture_i');
      state.completed.add('metallurgy_i');

      expect(
        service.isRecipeUnlocked(['agriculture_i', 'metallurgy_i'])
      ).toBe(true);
    });
  });

  describe('isBuildingUnlocked', () => {
    it('returns true for buildings with no tech requirements', () => {
      expect(service.isBuildingUnlocked([])).toBe(true);
    });

    it('returns false when tech not researched', () => {
      expect(service.isBuildingUnlocked(['alchemy_i'])).toBe(false);
    });

    it('returns true when tech is researched', () => {
      state.completed.add('alchemy_i');

      expect(service.isBuildingUnlocked(['alchemy_i'])).toBe(true);
    });
  });

  describe('isItemUnlocked', () => {
    it('returns true for items not locked by any research', () => {
      // 'basic_stick' is not unlocked by any research
      expect(service.isItemUnlocked('basic_stick')).toBe(true);
    });

    it('returns false for items locked by unfinished research', () => {
      // iron_hammer is unlocked by metallurgy_i
      expect(service.isItemUnlocked('iron_hammer')).toBe(false);
    });

    it('returns true for items when research is completed', () => {
      state.completed.add('metallurgy_i');

      expect(service.isItemUnlocked('iron_hammer')).toBe(true);
    });
  });

  describe('getAvailableResearch', () => {
    it('returns tier 1 research when nothing completed', () => {
      const available = service.getAvailableResearch();

      expect(available).toHaveLength(1);
      expect(available[0].id).toBe('agriculture_i');
    });

    it('returns newly available research after completion', () => {
      state.completed.add('agriculture_i');

      const available = service.getAvailableResearch();

      expect(available.map((r) => r.id)).toContain('metallurgy_i');
      expect(available.map((r) => r.id)).not.toContain('agriculture_i');
    });
  });

  describe('getUnlockedRecipeIds', () => {
    it('returns empty array when nothing completed', () => {
      expect(service.getUnlockedRecipeIds()).toHaveLength(0);
    });

    it('returns recipe IDs unlocked by completed research', () => {
      state.completed.add('agriculture_i');
      state.completed.add('metallurgy_i');

      const recipes = service.getUnlockedRecipeIds();

      expect(recipes).toContain('stone_hoe');
      expect(recipes).toContain('iron_ingot');
    });
  });

  describe('getUnlockedBuildingIds', () => {
    it('returns empty array when nothing completed', () => {
      expect(service.getUnlockedBuildingIds()).toHaveLength(0);
    });

    it('returns building IDs unlocked by completed research', () => {
      state.completed.add('agriculture_i');
      state.completed.add('alchemy_i');

      const buildings = service.getUnlockedBuildingIds();

      expect(buildings).toContain('small_garden');
      expect(buildings).toContain('alchemy_lab');
    });
  });

  describe('getUnlockedItems', () => {
    it('returns empty array when nothing completed', () => {
      expect(service.getUnlockedItems()).toHaveLength(0);
    });

    it('returns item IDs unlocked by completed research', () => {
      state.completed.add('metallurgy_i');

      const items = service.getUnlockedItems();

      expect(items).toContain('iron_hammer');
    });
  });

  describe('getRecipeUnlockProgress', () => {
    it('returns full progress for recipes with no requirements', () => {
      const progress = service.getRecipeUnlockProgress('basic_recipe', []);

      expect(progress.isUnlocked).toBe(true);
      expect(progress.progress).toBe(1);
      expect(progress.missingResearch).toHaveLength(0);
    });

    it('returns partial progress for partially met requirements', () => {
      state.completed.add('agriculture_i');

      const progress = service.getRecipeUnlockProgress('advanced_recipe', [
        'agriculture_i',
        'metallurgy_i',
      ]);

      expect(progress.isUnlocked).toBe(false);
      expect(progress.progress).toBe(0.5);
      expect(progress.completedResearch).toContain('agriculture_i');
      expect(progress.missingResearch).toContain('metallurgy_i');
    });

    it('returns complete progress when all requirements met', () => {
      state.completed.add('agriculture_i');
      state.completed.add('metallurgy_i');

      const progress = service.getRecipeUnlockProgress('advanced_recipe', [
        'agriculture_i',
        'metallurgy_i',
      ]);

      expect(progress.isUnlocked).toBe(true);
      expect(progress.progress).toBe(1);
      expect(progress.missingResearch).toHaveLength(0);
    });
  });

  describe('getBuildingUnlockProgress', () => {
    it('returns correct progress for building requirements', () => {
      state.completed.add('metallurgy_i');

      const progress = service.getBuildingUnlockProgress('advanced_building', [
        'metallurgy_i',
        'alchemy_i',
      ]);

      expect(progress.isUnlocked).toBe(false);
      expect(progress.progress).toBe(0.5);
      expect(progress.contentType).toBe('building');
    });
  });

  describe('getResearchProgress', () => {
    it('returns progress for research with prerequisites', () => {
      state.completed.add('agriculture_i');

      const progress = service.getResearchProgress('metallurgy_i');

      expect(progress.contentType).toBe('research');
      expect(progress.isUnlocked).toBe(false); // Not yet completed
      expect(progress.progress).toBe(1); // Prerequisites complete
    });

    it('returns zero progress for research with unmet prerequisites', () => {
      const progress = service.getResearchProgress('alchemy_i');

      expect(progress.isUnlocked).toBe(false);
      expect(progress.missingResearch).toContain('metallurgy_i');
    });

    it('returns empty progress for unknown research', () => {
      const progress = service.getResearchProgress('nonexistent');

      expect(progress.isUnlocked).toBe(false);
      expect(progress.progress).toBe(0);
    });
  });

  describe('updateResearchState', () => {
    it('updates the internal state reference', () => {
      // Initial state has no completions
      expect(service.isResearchCompleted('agriculture_i')).toBe(false);

      // Create new state with completion
      const newState = createResearchStateComponent();
      newState.completed.add('agriculture_i');

      service.updateResearchState(newState);

      expect(service.isResearchCompleted('agriculture_i')).toBe(true);
    });
  });

  describe('discovery queries', () => {
    it('getDiscoveredResearch returns discovered research', () => {
      state.discoveredResearch.push('discovered-1', 'discovered-2');

      const discovered = service.getDiscoveredResearch();

      expect(discovered).toHaveLength(2);
      expect(discovered).toContain('discovered-1');
      expect(discovered).toContain('discovered-2');
    });

    it('isDiscoveryRateLimited returns true when limit exceeded', () => {
      state.dailyDiscoveries = 5;

      expect(service.isDiscoveryRateLimited(3)).toBe(true);
      expect(service.isDiscoveryRateLimited(5)).toBe(true);
      expect(service.isDiscoveryRateLimited(10)).toBe(false);
    });

    it('getDiscoveryCounts returns discovery counts', () => {
      state.dailyDiscoveries = 3;
      state.seasonalDiscoveries = 15;

      const counts = service.getDiscoveryCounts();

      expect(counts.daily).toBe(3);
      expect(counts.seasonal).toBe(15);
    });
  });
});
