import { describe, it, expect, beforeEach } from 'vitest';
import {
  createHearsayMemoryComponent,
  addHearsay,
  getHearsayForResource,
  verifyHearsay,
  updateHearsayTrust,
  getTrustScore,
  getTrustedAgents,
  markExplored,
  hasExplored,
  getUnexploredInRadius,
  describeKnownResources,
  describeTrustRelationships,
  type HearsayMemoryComponent,
} from '../HearsayMemory.js';

describe('HearsayMemory', () => {
  let memory: HearsayMemoryComponent;

  beforeEach(() => {
    memory = createHearsayMemoryComponent();
  });

  describe('hearsay management', () => {
    it('creates empty memory component', () => {
      expect(memory.hearsay).toEqual([]);
      expect(memory.trustRatings.size).toBe(0);
      expect(memory.exploredSectors.size).toBe(0);
      expect(memory.defaultTrust).toBe(0.5);
    });

    it('adds hearsay from another agent', () => {
      addHearsay(
        memory,
        'food',
        'north',
        'medium',
        'agent-alice',
        'Alice',
        { x: 100, y: 100 },
        1000
      );

      expect(memory.hearsay.length).toBe(1);
      expect(memory.hearsay[0].resourceType).toBe('food');
      expect(memory.hearsay[0].direction).toBe('north');
      expect(memory.hearsay[0].sourceAgentName).toBe('Alice');
    });

    it('maintains FIFO order (newest first)', () => {
      addHearsay(memory, 'food', 'north', 'medium', 'agent-1', 'A', { x: 0, y: 0 }, 100);
      addHearsay(memory, 'wood', 'south', 'far', 'agent-2', 'B', { x: 0, y: 0 }, 200);

      expect(memory.hearsay[0].resourceType).toBe('wood'); // Newest first
      expect(memory.hearsay[1].resourceType).toBe('food');
    });

    it('caps hearsay at 20 entries', () => {
      for (let i = 0; i < 25; i++) {
        addHearsay(memory, 'food', 'north', 'medium', `agent-${i}`, `Agent${i}`, { x: 0, y: 0 }, i * 10);
      }

      expect(memory.hearsay.length).toBe(20);
      // Oldest should be evicted
      expect(memory.hearsay.find((h) => h.sourceAgentName === 'Agent0')).toBeUndefined();
    });
  });

  describe('hearsay queries', () => {
    beforeEach(() => {
      // Add some hearsay
      addHearsay(memory, 'food', 'north', 'close', 'agent-alice', 'Alice', { x: 0, y: 0 }, 100);
      addHearsay(memory, 'food', 'south', 'far', 'agent-bob', 'Bob', { x: 0, y: 0 }, 200);
      addHearsay(memory, 'wood', 'east', 'medium', 'agent-charlie', 'Charlie', { x: 0, y: 0 }, 150);
    });

    it('filters hearsay by resource type', () => {
      const foodHearsay = getHearsayForResource(memory, 'food', 300);
      expect(foodHearsay.length).toBe(2);
      expect(foodHearsay.every((h) => h.resourceType === 'food')).toBe(true);
    });

    it('excludes old hearsay', () => {
      const hearsay = getHearsayForResource(memory, 'food', 700, 100); // maxAge=100
      // Only hearsay from tick 200 should be included (within 100 of tick 700... wait that's wrong)
      // Actually tick 700 - 100 = 600, so tick 200 is too old
      expect(hearsay.length).toBe(0);
    });

    it('sorts by trust score', () => {
      // Give Alice high trust
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 300);
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 300);

      const hearsay = getHearsayForResource(memory, 'food', 300);
      // Alice should be first due to higher trust
      expect(hearsay[0].sourceAgentName).toBe('Alice');
    });

    it('excludes verified-false hearsay', () => {
      // Hearsay is stored newest first (unshift):
      // Index 0: Charlie's wood (tick 150) - added last
      // Index 1: Bob's food (tick 200) - added second
      // Index 2: Alice's food (tick 100) - added first
      verifyHearsay(memory, 1, false, 300); // Bob's food hearsay

      const hearsay = getHearsayForResource(memory, 'food', 300);
      // Should only have Alice's hearsay
      expect(hearsay.length).toBe(1);
      expect(hearsay[0].sourceAgentName).toBe('Alice');
    });
  });

  describe('trust management', () => {
    it('starts with default trust for unknown agents', () => {
      expect(getTrustScore(memory, 'unknown-agent')).toBe(0.5);
    });

    it('increases trust on successful verification', () => {
      const before = getTrustScore(memory, 'agent-alice');
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 100);
      const after = getTrustScore(memory, 'agent-alice');

      expect(after).toBeGreaterThan(before);
    });

    it('decreases trust on failed verification', () => {
      // Start with some trust
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 100);
      const before = getTrustScore(memory, 'agent-alice');

      updateHearsayTrust(memory, 'agent-alice', 'Alice', false, 200);
      const after = getTrustScore(memory, 'agent-alice');

      expect(after).toBeLessThan(before);
    });

    it('tracks success/failure counts', () => {
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 100);
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 200);
      updateHearsayTrust(memory, 'agent-alice', 'Alice', false, 300);

      const rating = memory.trustRatings.get('agent-alice')!;
      expect(rating.successCount).toBe(2);
      expect(rating.failureCount).toBe(1);
    });

    it('returns trusted agents sorted by score', () => {
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 100);
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 100);
      updateHearsayTrust(memory, 'agent-bob', 'Bob', false, 100);

      const trusted = getTrustedAgents(memory);
      expect(trusted[0].agentName).toBe('Alice');
      expect(trusted[0].score).toBeGreaterThan(trusted[1].score);
    });

    it('never reduces trust below 0.1', () => {
      // Many failures
      for (let i = 0; i < 20; i++) {
        updateHearsayTrust(memory, 'agent-liar', 'Liar', false, i * 10);
      }

      expect(getTrustScore(memory, 'agent-liar')).toBeGreaterThanOrEqual(0.1);
    });

    it('never increases trust above 1.0', () => {
      // Many successes
      for (let i = 0; i < 50; i++) {
        updateHearsayTrust(memory, 'agent-trusted', 'Trusted', true, i * 10);
      }

      expect(getTrustScore(memory, 'agent-trusted')).toBeLessThanOrEqual(1.0);
    });
  });

  describe('hearsay verification', () => {
    beforeEach(() => {
      addHearsay(memory, 'food', 'north', 'close', 'agent-alice', 'Alice', { x: 0, y: 0 }, 100);
    });

    it('marks hearsay as verified on success', () => {
      verifyHearsay(memory, 0, true, 200);

      expect(memory.hearsay[0].verified).toBe(true);
      expect(memory.hearsay[0].verificationResult).toBe(true);
    });

    it('updates trust on verification', () => {
      const before = getTrustScore(memory, 'agent-alice');
      verifyHearsay(memory, 0, true, 200);
      const after = getTrustScore(memory, 'agent-alice');

      expect(after).toBeGreaterThan(before);
    });
  });

  describe('fog-of-war (personal exploration)', () => {
    it('marks sectors as explored', () => {
      markExplored(memory, 5, 3, ['food', 'wood'], 100);

      expect(hasExplored(memory, 5, 3)).toBe(true);
      expect(hasExplored(memory, 5, 4)).toBe(false);
    });

    it('stores found resources', () => {
      markExplored(memory, 5, 3, ['food', 'stone'], 100);

      const sector = memory.exploredSectors.get('5,3')!;
      expect(sector.foundResources).toContain('food');
      expect(sector.foundResources).toContain('stone');
    });

    it('finds unexplored sectors in radius', () => {
      markExplored(memory, 5, 5, [], 100);
      markExplored(memory, 6, 5, [], 100);

      const unexplored = getUnexploredInRadius(memory, 5, 5, 1);

      // Should not include (5,5) or (6,5)
      expect(unexplored.find((s) => s.sectorX === 5 && s.sectorY === 5)).toBeUndefined();
      expect(unexplored.find((s) => s.sectorX === 6 && s.sectorY === 5)).toBeUndefined();

      // Should include other adjacent sectors
      expect(unexplored.length).toBeGreaterThan(0);
    });

    it('sorts unexplored sectors by distance', () => {
      const unexplored = getUnexploredInRadius(memory, 5, 5, 2);

      // Check that closer sectors come first
      for (let i = 1; i < unexplored.length; i++) {
        const prevDist =
          Math.abs(unexplored[i - 1].sectorX - 5) + Math.abs(unexplored[i - 1].sectorY - 5);
        const currDist = Math.abs(unexplored[i].sectorX - 5) + Math.abs(unexplored[i].sectorY - 5);
        expect(currDist).toBeGreaterThanOrEqual(prevDist);
      }
    });
  });

  describe('LLM context generation', () => {
    it('describes unknown resources', () => {
      const desc = describeKnownResources(memory, 'food', 100);
      expect(desc).toContain("don't know");
    });

    it('describes known resources from hearsay', () => {
      addHearsay(memory, 'food', 'north', 'close', 'agent-alice', 'Alice', { x: 0, y: 0 }, 100);

      const desc = describeKnownResources(memory, 'food', 150);
      expect(desc).toContain('Alice');
      expect(desc).toContain('north');
    });

    it('describes trust relationships', () => {
      // Need multiple successes to get trust above 0.6 threshold for "somewhat reliable"
      // Trust formula: boost = 0.1 * (1 - current_score)
      // Start: 0.5, after 1: 0.55, after 2: 0.595, after 3: 0.6355, after 4: 0.672
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 100);
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 100);
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 100);
      updateHearsayTrust(memory, 'agent-alice', 'Alice', true, 100);

      const desc = describeTrustRelationships(memory);
      expect(desc).toContain('Alice');
    });

    it('describes no relationships for empty trust', () => {
      const desc = describeTrustRelationships(memory);
      expect(desc).toContain("haven't formed");
    });
  });
});
