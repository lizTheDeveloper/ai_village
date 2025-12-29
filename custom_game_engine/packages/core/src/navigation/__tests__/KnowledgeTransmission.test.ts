import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  processHeardSpeech,
  recordResourceDiscovery,
  recordResourceDepletion,
  verifyHearsayAtLocation,
  recordMovement,
  getBestResourceLocation,
  generateResourceKnowledgeContext,
} from '../KnowledgeTransmission.js';
import { createHearsayMemoryComponent, type HearsayMemoryComponent } from '../HearsayMemory.js';
import { resetMapKnowledge, getMapKnowledge } from '../MapKnowledge.js';

describe('KnowledgeTransmission', () => {
  let listenerMemory: HearsayMemoryComponent;

  beforeEach(() => {
    listenerMemory = createHearsayMemoryComponent();
    resetMapKnowledge();
  });

  afterEach(() => {
    resetMapKnowledge();
  });

  describe('processHeardSpeech', () => {
    it('adds hearsay when hearing resource announcement', () => {
      processHeardSpeech(
        listenerMemory,
        'agent-alice',
        'Alice',
        { x: 50, y: 50 },
        'Found berries to the north!',
        100
      );

      expect(listenerMemory.hearsay.length).toBe(1);
      expect(listenerMemory.hearsay[0].resourceType).toBe('food');
      expect(listenerMemory.hearsay[0].direction).toBe('north');
      expect(listenerMemory.hearsay[0].sourceAgentName).toBe('Alice');
    });

    it('ignores non-announcement speech', () => {
      processHeardSpeech(
        listenerMemory,
        'agent-bob',
        'Bob',
        { x: 50, y: 50 },
        'Hello, nice weather!',
        100
      );

      expect(listenerMemory.hearsay.length).toBe(0);
    });

    it('ignores negative announcements', () => {
      processHeardSpeech(
        listenerMemory,
        'agent-charlie',
        'Charlie',
        { x: 50, y: 50 },
        'No food around here',
        100
      );

      // Negative mentions are not added as hearsay (they're warnings, not tips)
      expect(listenerMemory.hearsay.length).toBe(0);
    });

    it('records speaker position', () => {
      processHeardSpeech(
        listenerMemory,
        'agent-alice',
        'Alice',
        { x: 100, y: 200 },
        "There's wood to the east",
        100
      );

      // Hearsay interface uses 'speakerPosition' (where the speaker was when they said it)
      expect(listenerMemory.hearsay[0].speakerPosition).toEqual({ x: 100, y: 200 });
    });

    it('records current tick', () => {
      processHeardSpeech(
        listenerMemory,
        'agent-alice',
        'Alice',
        { x: 50, y: 50 },
        'Found stone nearby',
        500
      );

      expect(listenerMemory.hearsay[0].heardAt).toBe(500);
    });
  });

  describe('recordResourceDiscovery', () => {
    it('updates map knowledge', () => {
      recordResourceDiscovery({ x: 100, y: 100 }, 'food', { x: 120, y: 100 }, 80, 100);

      const mapKnowledge = getMapKnowledge();
      const results = mapKnowledge.findResourceAreas('food', 100, 100, 5);

      expect(results.length).toBeGreaterThan(0);
    });

    it('returns announcement string', () => {
      const announcement = recordResourceDiscovery(
        { x: 100, y: 100 },
        'food',
        { x: 120, y: 100 },
        80,
        100
      );

      expect(typeof announcement).toBe('string');
      expect(announcement.length).toBeGreaterThan(0);
      expect(announcement.toLowerCase()).toContain('food');
    });

    it('uses direction words in announcement', () => {
      // Resource to the east
      const announcement = recordResourceDiscovery(
        { x: 100, y: 100 },
        'wood',
        { x: 200, y: 100 },
        80,
        100
      );

      expect(announcement.toLowerCase()).toContain('east');
    });

    it('uses close wording for nearby resources', () => {
      const announcement = recordResourceDiscovery(
        { x: 100, y: 100 },
        'stone',
        { x: 110, y: 100 },
        80,
        100
      );

      // Close resources use different wording
      expect(announcement).toMatch(/Found|right here/i);
    });
  });

  describe('recordResourceDepletion', () => {
    it('updates map knowledge with depletion', () => {
      // First record a sighting
      const mapKnowledge = getMapKnowledge();
      mapKnowledge.recordResourceSighting(100, 100, 'food', 80, 100);
      const initialAbundance = mapKnowledge.getSector(6, 6).resourceAbundance.get('food')!;

      // Then record depletion
      recordResourceDepletion({ x: 100, y: 100 }, 'food', 200);

      const newAbundance = mapKnowledge.getSector(6, 6).resourceAbundance.get('food')!;
      expect(newAbundance).toBeLessThan(initialAbundance);
    });

    it('returns depletion announcement', () => {
      const announcement = recordResourceDepletion({ x: 100, y: 100 }, 'wood', 100);

      expect(announcement.toLowerCase()).toContain('wood');
      expect(announcement.toLowerCase()).toContain('gone');
    });
  });

  describe('verifyHearsayAtLocation', () => {
    beforeEach(() => {
      // Add hearsay to verify
      processHeardSpeech(
        listenerMemory,
        'agent-alice',
        'Alice',
        { x: 50, y: 50 },
        'Found berries to the north!',
        100
      );
    });

    it('marks hearsay as verified on success', () => {
      verifyHearsayAtLocation(listenerMemory, { x: 50, y: 10 }, 0, true, 200);

      expect(listenerMemory.hearsay[0].verified).toBe(true);
      expect(listenerMemory.hearsay[0].verificationResult).toBe(true);
    });

    it('marks hearsay as verified on failure', () => {
      verifyHearsayAtLocation(listenerMemory, { x: 50, y: 10 }, 0, false, 200);

      expect(listenerMemory.hearsay[0].verified).toBe(true);
      expect(listenerMemory.hearsay[0].verificationResult).toBe(false);
    });

    it('increases trust on success', () => {
      const beforeTrust = listenerMemory.trustRatings.get('agent-alice')?.score ?? 0.5;

      verifyHearsayAtLocation(listenerMemory, { x: 50, y: 10 }, 0, true, 200);

      const afterTrust = listenerMemory.trustRatings.get('agent-alice')?.score ?? 0.5;
      expect(afterTrust).toBeGreaterThan(beforeTrust);
    });

    it('decreases trust on failure', () => {
      // First add some trust
      verifyHearsayAtLocation(listenerMemory, { x: 50, y: 10 }, 0, true, 200);
      const beforeTrust = listenerMemory.trustRatings.get('agent-alice')?.score ?? 0.5;

      // Add another hearsay to verify
      processHeardSpeech(
        listenerMemory,
        'agent-alice',
        'Alice',
        { x: 50, y: 50 },
        "There's wood to the east",
        250
      );

      verifyHearsayAtLocation(listenerMemory, { x: 50, y: 50 }, 0, false, 300);

      const afterTrust = listenerMemory.trustRatings.get('agent-alice')?.score ?? 0.5;
      expect(afterTrust).toBeLessThan(beforeTrust);
    });

    it('creates trust rating if none exists', () => {
      expect(listenerMemory.trustRatings.has('agent-alice')).toBe(false);

      verifyHearsayAtLocation(listenerMemory, { x: 50, y: 10 }, 0, true, 200);

      expect(listenerMemory.trustRatings.has('agent-alice')).toBe(true);
    });

    it('handles invalid hearsay index gracefully', () => {
      // Should not throw
      verifyHearsayAtLocation(listenerMemory, { x: 50, y: 10 }, 999, true, 200);

      // Trust should not be updated
      expect(listenerMemory.trustRatings.size).toBe(0);
    });
  });

  describe('recordMovement', () => {
    it('records traversal in map knowledge', () => {
      recordMovement({ x: 8, y: 8 }, { x: 24, y: 8 }, 100);

      const mapKnowledge = getMapKnowledge();
      const sector = mapKnowledge.getSector(0, 0);

      expect(sector.pathTraffic.get('e')).toBe(1);
    });

    it('accumulates traffic on repeated movements', () => {
      for (let i = 0; i < 5; i++) {
        recordMovement({ x: 8, y: 8 }, { x: 24, y: 8 }, 100 + i);
      }

      const mapKnowledge = getMapKnowledge();
      const sector = mapKnowledge.getSector(0, 0);

      expect(sector.pathTraffic.get('e')).toBe(5);
    });
  });

  describe('getBestResourceLocation', () => {
    it('returns null when no knowledge exists', () => {
      const result = getBestResourceLocation({ x: 100, y: 100 }, listenerMemory, 'food', 100);

      expect(result).toBeNull();
    });

    it('returns hearsay-based location when available', () => {
      // Add some hearsay with good trust
      processHeardSpeech(
        listenerMemory,
        'agent-alice',
        'Alice',
        { x: 100, y: 100 },
        'Found berries to the north!',
        100
      );

      // Give Alice high trust
      listenerMemory.trustRatings.set('agent-alice', {
        agentId: 'agent-alice',
        agentName: 'Alice',
        score: 0.9,
        successCount: 5,
        failureCount: 0,
        lastUpdated: 100,
      });

      const result = getBestResourceLocation({ x: 100, y: 100 }, listenerMemory, 'food', 150);

      expect(result).not.toBeNull();
      expect(result!.source).toBe('hearsay');
      expect(result!.direction).toBe('north');
    });

    it('falls back to map knowledge when hearsay is low confidence', () => {
      // Add map knowledge
      const mapKnowledge = getMapKnowledge();
      mapKnowledge.recordResourceSighting(150, 100, 'wood', 80, 100);

      const result = getBestResourceLocation({ x: 100, y: 100 }, listenerMemory, 'wood', 150);

      expect(result).not.toBeNull();
      expect(result!.source).toBe('map');
    });

    it('excludes verified hearsay', () => {
      processHeardSpeech(
        listenerMemory,
        'agent-alice',
        'Alice',
        { x: 100, y: 100 },
        'Found stone to the south',
        100
      );

      // Mark as verified
      listenerMemory.hearsay[0].verified = true;

      const result = getBestResourceLocation({ x: 100, y: 100 }, listenerMemory, 'stone', 150);

      // Should not return verified hearsay
      expect(result === null || result.source === 'map').toBe(true);
    });

    it('excludes old hearsay', () => {
      processHeardSpeech(
        listenerMemory,
        'agent-alice',
        'Alice',
        { x: 100, y: 100 },
        'Found water to the west',
        100
      );

      // Query much later (hearsay is 500+ ticks old)
      const result = getBestResourceLocation({ x: 100, y: 100 }, listenerMemory, 'water', 700);

      // Old hearsay should be excluded
      expect(result === null || result.source === 'map').toBe(true);
    });

    it('weights hearsay by trust score', () => {
      // Add hearsay from trusted and untrusted agents
      processHeardSpeech(
        listenerMemory,
        'agent-alice',
        'Alice',
        { x: 100, y: 100 },
        'Found food to the north!',
        100
      );
      processHeardSpeech(
        listenerMemory,
        'agent-bob',
        'Bob',
        { x: 100, y: 100 },
        'Found food to the south!',
        110
      );

      // Give Alice high trust, Bob low trust
      listenerMemory.trustRatings.set('agent-alice', {
        agentId: 'agent-alice',
        agentName: 'Alice',
        score: 0.9,
        successCount: 5,
        failureCount: 0,
        lastUpdated: 100,
      });
      listenerMemory.trustRatings.set('agent-bob', {
        agentId: 'agent-bob',
        agentName: 'Bob',
        score: 0.2,
        successCount: 1,
        failureCount: 4,
        lastUpdated: 100,
      });

      const result = getBestResourceLocation({ x: 100, y: 100 }, listenerMemory, 'food', 150);

      // Should prefer Alice's direction due to higher trust
      expect(result!.direction).toBe('north');
    });
  });

  describe('generateResourceKnowledgeContext', () => {
    it('returns context string', () => {
      const context = generateResourceKnowledgeContext({ x: 100, y: 100 }, listenerMemory, 100);

      expect(typeof context).toBe('string');
      expect(context.length).toBeGreaterThan(0);
    });

    it('includes header line', () => {
      const context = generateResourceKnowledgeContext({ x: 100, y: 100 }, listenerMemory, 100);

      expect(context).toContain('What you know about resource locations');
    });

    it('lists all resource types', () => {
      const context = generateResourceKnowledgeContext({ x: 100, y: 100 }, listenerMemory, 100);

      expect(context).toContain('food');
      expect(context).toContain('wood');
      expect(context).toContain('stone');
      expect(context).toContain('water');
    });

    it('shows unknown for resources with no knowledge', () => {
      const context = generateResourceKnowledgeContext({ x: 100, y: 100 }, listenerMemory, 100);

      expect(context).toContain('unknown');
    });

    it('includes hearsay information when available', () => {
      processHeardSpeech(
        listenerMemory,
        'agent-alice',
        'Alice',
        { x: 100, y: 100 },
        'Found berries to the north!',
        100
      );

      // Give Alice some trust
      listenerMemory.trustRatings.set('agent-alice', {
        agentId: 'agent-alice',
        agentName: 'Alice',
        score: 0.7,
        successCount: 3,
        failureCount: 0,
        lastUpdated: 100,
      });

      const context = generateResourceKnowledgeContext({ x: 100, y: 100 }, listenerMemory, 150);

      expect(context).toContain('north');
      expect(context).toContain('someone told you');
    });

    it('includes map knowledge when available', () => {
      const mapKnowledge = getMapKnowledge();
      mapKnowledge.recordResourceSighting(150, 100, 'wood', 80, 100);

      const context = generateResourceKnowledgeContext({ x: 100, y: 100 }, listenerMemory, 150);

      expect(context).toContain('known area');
    });
  });
});
