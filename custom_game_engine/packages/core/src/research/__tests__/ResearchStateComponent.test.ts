/**
 * Unit tests for ResearchStateComponent functions
 *
 * Tests state management functions for research progress tracking.
 */

import { describe, it, expect } from 'vitest';
import {
  createResearchStateComponent,
  startResearch,
  updateResearchProgress,
  completeResearch,
  addInsight,
  queueResearch,
  dequeueResearch,
  recordDiscovery,
  resetDailyDiscoveries,
  resetSeasonalDiscoveries,
  isResearchCompleted,
  isResearchInProgress,
  getResearchProgress,
  getResearchers,
  serializeResearchState,
  deserializeResearchState,
} from '../../components/ResearchStateComponent.js';
import type { Insight } from '../types.js';

describe('ResearchStateComponent', () => {
  describe('createResearchStateComponent', () => {
    it('creates a component with default values', () => {
      const state = createResearchStateComponent();

      expect(state.type).toBe('research_state');
      expect(state.version).toBe(1);
      expect(state.completed.size).toBe(0);
      expect(state.completedAt.size).toBe(0);
      expect(state.inProgress.size).toBe(0);
      expect(state.queue).toHaveLength(0);
      expect(state.discoveredResearch).toHaveLength(0);
      expect(state.dailyDiscoveries).toBe(0);
      expect(state.seasonalDiscoveries).toBe(0);
      expect(state.lastDiscoveryTick).toBe(0);
    });
  });

  describe('startResearch', () => {
    it('starts a new research project', () => {
      const initial = createResearchStateComponent();
      const state = startResearch(initial, 'agriculture_i', 'agent-1', 100);

      expect(state.inProgress.has('agriculture_i')).toBe(true);

      const progress = state.inProgress.get('agriculture_i');
      expect(progress?.researchId).toBe('agriculture_i');
      expect(progress?.currentProgress).toBe(0);
      expect(progress?.startedAt).toBe(100);
      expect(progress?.researchers).toContain('agent-1');
      expect(progress?.insights).toHaveLength(0);
    });

    it('adds researcher to existing research (collaboration)', () => {
      let state = createResearchStateComponent();
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);
      state = startResearch(state, 'agriculture_i', 'agent-2', 150);

      const progress = state.inProgress.get('agriculture_i');
      expect(progress?.researchers).toHaveLength(2);
      expect(progress?.researchers).toContain('agent-1');
      expect(progress?.researchers).toContain('agent-2');
      expect(progress?.startedAt).toBe(100); // Original start time preserved
    });

    it('does not add duplicate researcher', () => {
      let state = createResearchStateComponent();
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);
      state = startResearch(state, 'agriculture_i', 'agent-1', 150);

      const progress = state.inProgress.get('agriculture_i');
      expect(progress?.researchers).toHaveLength(1);
    });

    it('throws for already completed research', () => {
      const state = createResearchStateComponent();
      state.completed.add('agriculture_i');

      expect(() => startResearch(state, 'agriculture_i', 'agent-1', 100)).toThrow(
        "Research 'agriculture_i' is already completed"
      );
    });
  });

  describe('updateResearchProgress', () => {
    it('updates progress for in-progress research', () => {
      let state = createResearchStateComponent();
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);
      state = updateResearchProgress(state, 'agriculture_i', 25);

      const progress = state.inProgress.get('agriculture_i');
      expect(progress?.currentProgress).toBe(25);
    });

    it('accumulates progress over multiple updates', () => {
      let state = createResearchStateComponent();
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);
      state = updateResearchProgress(state, 'agriculture_i', 25);
      state = updateResearchProgress(state, 'agriculture_i', 30);
      state = updateResearchProgress(state, 'agriculture_i', 15);

      const progress = state.inProgress.get('agriculture_i');
      expect(progress?.currentProgress).toBe(70);
    });

    it('throws for research not in progress', () => {
      const state = createResearchStateComponent();

      expect(() => updateResearchProgress(state, 'nonexistent', 25)).toThrow(
        "Research 'nonexistent' is not in progress"
      );
    });
  });

  describe('completeResearch', () => {
    it('marks research as completed', () => {
      let state = createResearchStateComponent();
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);
      state = updateResearchProgress(state, 'agriculture_i', 100);
      state = completeResearch(state, 'agriculture_i', 500);

      expect(state.completed.has('agriculture_i')).toBe(true);
      expect(state.completedAt.get('agriculture_i')).toBe(500);
      expect(state.inProgress.has('agriculture_i')).toBe(false);
    });

    it('removes research from queue when completed', () => {
      let state = createResearchStateComponent();
      state = queueResearch(state, 'agriculture_i');
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);
      state = completeResearch(state, 'agriculture_i', 500);

      expect(state.queue).not.toContain('agriculture_i');
    });
  });

  describe('addInsight', () => {
    it('adds insight to in-progress research', () => {
      let state = createResearchStateComponent();
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);

      const insight: Insight = {
        id: 'insight-1',
        content: 'Discovered that soil pH matters',
        relatedMaterials: ['soil', 'water'],
        breakthroughBonus: 10,
        timestamp: 200,
      };

      state = addInsight(state, 'agriculture_i', insight);

      const progress = state.inProgress.get('agriculture_i');
      expect(progress?.insights).toHaveLength(1);
      expect(progress?.insights[0].content).toBe('Discovered that soil pH matters');
    });

    it('accumulates multiple insights', () => {
      let state = createResearchStateComponent();
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);

      state = addInsight(state, 'agriculture_i', {
        id: 'i1',
        content: 'Insight 1',
        relatedMaterials: [],
        breakthroughBonus: 5,
        timestamp: 200,
      });
      state = addInsight(state, 'agriculture_i', {
        id: 'i2',
        content: 'Insight 2',
        relatedMaterials: [],
        breakthroughBonus: 10,
        timestamp: 300,
      });

      const progress = state.inProgress.get('agriculture_i');
      expect(progress?.insights).toHaveLength(2);
    });

    it('throws for research not in progress', () => {
      const state = createResearchStateComponent();
      const insight: Insight = {
        id: 'i1',
        content: 'Test',
        relatedMaterials: [],
        breakthroughBonus: 5,
        timestamp: 100,
      };

      expect(() => addInsight(state, 'nonexistent', insight)).toThrow(
        "Research 'nonexistent' is not in progress"
      );
    });
  });

  describe('queueResearch', () => {
    it('adds research to queue', () => {
      let state = createResearchStateComponent();
      state = queueResearch(state, 'agriculture_i');
      state = queueResearch(state, 'metallurgy_i');

      expect(state.queue).toHaveLength(2);
      expect(state.queue[0]).toBe('agriculture_i');
      expect(state.queue[1]).toBe('metallurgy_i');
    });

    it('does not add duplicates', () => {
      let state = createResearchStateComponent();
      state = queueResearch(state, 'agriculture_i');
      state = queueResearch(state, 'agriculture_i');

      expect(state.queue).toHaveLength(1);
    });
  });

  describe('dequeueResearch', () => {
    it('removes research from queue', () => {
      let state = createResearchStateComponent();
      state = queueResearch(state, 'agriculture_i');
      state = queueResearch(state, 'metallurgy_i');
      state = dequeueResearch(state, 'agriculture_i');

      expect(state.queue).toHaveLength(1);
      expect(state.queue).not.toContain('agriculture_i');
      expect(state.queue).toContain('metallurgy_i');
    });
  });

  describe('recordDiscovery', () => {
    it('records a procedural discovery', () => {
      let state = createResearchStateComponent();
      state = recordDiscovery(state, 'generated-research-1', 1000);

      expect(state.discoveredResearch).toContain('generated-research-1');
      expect(state.dailyDiscoveries).toBe(1);
      expect(state.seasonalDiscoveries).toBe(1);
      expect(state.lastDiscoveryTick).toBe(1000);
    });

    it('increments discovery counts', () => {
      let state = createResearchStateComponent();
      state = recordDiscovery(state, 'gen-1', 1000);
      state = recordDiscovery(state, 'gen-2', 2000);
      state = recordDiscovery(state, 'gen-3', 3000);

      expect(state.dailyDiscoveries).toBe(3);
      expect(state.seasonalDiscoveries).toBe(3);
      expect(state.lastDiscoveryTick).toBe(3000);
    });
  });

  describe('resetDailyDiscoveries', () => {
    it('resets daily count to zero', () => {
      let state = createResearchStateComponent();
      state = recordDiscovery(state, 'gen-1', 1000);
      state = recordDiscovery(state, 'gen-2', 2000);
      state = resetDailyDiscoveries(state);

      expect(state.dailyDiscoveries).toBe(0);
      expect(state.seasonalDiscoveries).toBe(2); // Unchanged
    });
  });

  describe('resetSeasonalDiscoveries', () => {
    it('resets seasonal count to zero', () => {
      let state = createResearchStateComponent();
      state = recordDiscovery(state, 'gen-1', 1000);
      state = recordDiscovery(state, 'gen-2', 2000);
      state = resetSeasonalDiscoveries(state);

      expect(state.seasonalDiscoveries).toBe(0);
      expect(state.dailyDiscoveries).toBe(2); // Unchanged
    });
  });

  describe('isResearchCompleted', () => {
    it('returns true for completed research', () => {
      const state = createResearchStateComponent();
      state.completed.add('agriculture_i');

      expect(isResearchCompleted(state, 'agriculture_i')).toBe(true);
    });

    it('returns false for incomplete research', () => {
      const state = createResearchStateComponent();

      expect(isResearchCompleted(state, 'agriculture_i')).toBe(false);
    });
  });

  describe('isResearchInProgress', () => {
    it('returns true for in-progress research', () => {
      let state = createResearchStateComponent();
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);

      expect(isResearchInProgress(state, 'agriculture_i')).toBe(true);
    });

    it('returns false for research not started', () => {
      const state = createResearchStateComponent();

      expect(isResearchInProgress(state, 'agriculture_i')).toBe(false);
    });
  });

  describe('getResearchProgress', () => {
    it('returns progress for in-progress research', () => {
      let state = createResearchStateComponent();
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);
      state = updateResearchProgress(state, 'agriculture_i', 50);

      const progress = getResearchProgress(state, 'agriculture_i');

      expect(progress?.currentProgress).toBe(50);
    });

    it('returns undefined for research not in progress', () => {
      const state = createResearchStateComponent();

      expect(getResearchProgress(state, 'agriculture_i')).toBeUndefined();
    });
  });

  describe('getResearchers', () => {
    it('returns researchers for in-progress research', () => {
      let state = createResearchStateComponent();
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);
      state = startResearch(state, 'agriculture_i', 'agent-2', 150);

      const researchers = getResearchers(state, 'agriculture_i');

      expect(researchers).toHaveLength(2);
      expect(researchers).toContain('agent-1');
      expect(researchers).toContain('agent-2');
    });

    it('returns empty array for research not in progress', () => {
      const state = createResearchStateComponent();

      expect(getResearchers(state, 'nonexistent')).toHaveLength(0);
    });
  });

  describe('serialization', () => {
    it('serializes and deserializes state correctly', () => {
      let state = createResearchStateComponent();
      state = startResearch(state, 'agriculture_i', 'agent-1', 100);
      state = updateResearchProgress(state, 'agriculture_i', 50);
      state = completeResearch(state, 'agriculture_i', 500);
      state = startResearch(state, 'metallurgy_i', 'agent-2', 600);
      state = queueResearch(state, 'alchemy_i');
      state = recordDiscovery(state, 'gen-1', 1000);

      const serialized = serializeResearchState(state);
      const deserialized = deserializeResearchState(serialized);

      expect(deserialized.type).toBe('research_state');
      expect(deserialized.completed.has('agriculture_i')).toBe(true);
      expect(deserialized.completedAt.get('agriculture_i')).toBe(500);
      expect(deserialized.inProgress.has('metallurgy_i')).toBe(true);
      expect(deserialized.queue).toContain('alchemy_i');
      expect(deserialized.discoveredResearch).toContain('gen-1');
      expect(deserialized.dailyDiscoveries).toBe(1);
    });

    it('handles empty state serialization', () => {
      const state = createResearchStateComponent();
      const serialized = serializeResearchState(state);
      const deserialized = deserializeResearchState(serialized);

      expect(deserialized.completed.size).toBe(0);
      expect(deserialized.inProgress.size).toBe(0);
      expect(deserialized.queue).toHaveLength(0);
    });
  });

  describe('immutability', () => {
    it('startResearch returns new state object', () => {
      const original = createResearchStateComponent();
      const updated = startResearch(original, 'agriculture_i', 'agent-1', 100);

      expect(updated).not.toBe(original);
      expect(original.inProgress.has('agriculture_i')).toBe(false);
    });

    it('updateResearchProgress returns new state object', () => {
      let original = createResearchStateComponent();
      original = startResearch(original, 'agriculture_i', 'agent-1', 100);
      const updated = updateResearchProgress(original, 'agriculture_i', 50);

      expect(updated).not.toBe(original);
    });

    it('completeResearch returns new state object', () => {
      let original = createResearchStateComponent();
      original = startResearch(original, 'agriculture_i', 'agent-1', 100);
      const updated = completeResearch(original, 'agriculture_i', 500);

      expect(updated).not.toBe(original);
    });
  });
});
