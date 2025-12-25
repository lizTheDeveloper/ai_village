import { describe, it, expect, beforeEach } from 'vitest';
import { BeliefComponent } from '../BeliefComponent';

describe('BeliefComponent', () => {
  let component: BeliefComponent;

  beforeEach(() => {
    component = new BeliefComponent();
  });

  describe('AC6: Beliefs Form from Patterns', () => {
    it('should form character belief after 3 accurate claims', () => {
      const agentId = 'alice';

      component.recordEvidence('character', agentId, 'accurate_claim', 100);
      component.recordEvidence('character', agentId, 'accurate_claim', 200);
      component.recordEvidence('character', agentId, 'accurate_claim', 300);

      const beliefs = component.getBeliefs('character');
      const aliceBelief = beliefs.find(b => b.subject === agentId);

      expect(aliceBelief).toBeDefined();
      expect(aliceBelief?.description).toContain('trustworthy');
      expect(aliceBelief?.confidence).toBeGreaterThan(0.5);
    });

    it('should form negative character belief after 3 false claims', () => {
      const agentId = 'bob';

      component.recordEvidence('character', agentId, 'false_claim', 100);
      component.recordEvidence('character', agentId, 'false_claim', 200);
      component.recordEvidence('character', agentId, 'false_claim', 300);

      const beliefs = component.getBeliefs('character');
      const bobBelief = beliefs.find(b => b.subject === agentId);

      expect(bobBelief).toBeDefined();
      expect(bobBelief?.description).toContain('unreliable');
    });

    it('should form world belief after finding pattern 3 times', () => {
      const pattern = 'stone_near_mountains';

      component.recordEvidence('world', pattern, 'observation', 100);
      component.recordEvidence('world', pattern, 'observation', 200);
      component.recordEvidence('world', pattern, 'observation', 300);

      const beliefs = component.getBeliefs('world');
      const stoneBelief = beliefs.find(b => b.subject === pattern);

      expect(stoneBelief).toBeDefined();
      expect(stoneBelief?.description).toContain('stone');
    });

    it('should form social belief after observing pattern', () => {
      const pattern = 'sharing_increases_cooperation';

      component.recordEvidence('social', pattern, 'observation', 100);
      component.recordEvidence('social', pattern, 'observation', 200);
      component.recordEvidence('social', pattern, 'observation', 300);

      const beliefs = component.getBeliefs('social');
      const socialBelief = beliefs.find(b => b.subject === pattern);

      expect(socialBelief).toBeDefined();
    });

    it('should increase belief confidence with reinforcing evidence', () => {
      const agentId = 'alice';

      component.recordEvidence('character', agentId, 'accurate_claim', 100);
      component.recordEvidence('character', agentId, 'accurate_claim', 200);
      component.recordEvidence('character', agentId, 'accurate_claim', 300);

      const initialConfidence = component.getBeliefs('character')[0].confidence;

      component.recordEvidence('character', agentId, 'accurate_claim', 400);

      const updatedConfidence = component.getBeliefs('character')[0].confidence;

      expect(updatedConfidence).toBeGreaterThan(initialConfidence);
    });

    it('should decrease belief confidence with counter-evidence', () => {
      const agentId = 'alice';

      // Form positive belief
      component.recordEvidence('character', agentId, 'accurate_claim', 100);
      component.recordEvidence('character', agentId, 'accurate_claim', 200);
      component.recordEvidence('character', agentId, 'accurate_claim', 300);

      const initialConfidence = component.getBeliefs('character')[0].confidence;

      // Counter-evidence
      component.recordEvidence('character', agentId, 'false_claim', 400);

      const updatedConfidence = component.getBeliefs('character')[0].confidence;

      expect(updatedConfidence).toBeLessThan(initialConfidence);
    });

    it('should remove beliefs with confidence below 0.2', () => {
      const agentId = 'charlie';

      // Form belief
      component.recordEvidence('character', agentId, 'accurate_claim', 100);
      component.recordEvidence('character', agentId, 'accurate_claim', 200);
      component.recordEvidence('character', agentId, 'accurate_claim', 300);

      // Add lots of counter-evidence to drop confidence
      for (let i = 0; i < 10; i++) {
        component.recordEvidence('character', agentId, 'false_claim', 400 + i * 10);
      }

      const beliefs = component.getBeliefs('character');
      const charlieBelief = beliefs.find(b => b.subject === agentId);

      expect(charlieBelief).toBeUndefined();
    });
  });

  describe('belief queries', () => {
    it('should return all beliefs of a specific type', () => {
      component.recordEvidence('character', 'alice', 'accurate_claim', 100);
      component.recordEvidence('character', 'alice', 'accurate_claim', 200);
      component.recordEvidence('character', 'alice', 'accurate_claim', 300);

      component.recordEvidence('world', 'stone_near_mountains', 'observation', 100);
      component.recordEvidence('world', 'stone_near_mountains', 'observation', 200);
      component.recordEvidence('world', 'stone_near_mountains', 'observation', 300);

      const characterBeliefs = component.getBeliefs('character');
      const worldBeliefs = component.getBeliefs('world');

      expect(characterBeliefs.length).toBeGreaterThan(0);
      expect(worldBeliefs.length).toBeGreaterThan(0);
    });

    it('should return belief about specific subject', () => {
      component.recordEvidence('character', 'alice', 'accurate_claim', 100);
      component.recordEvidence('character', 'alice', 'accurate_claim', 200);
      component.recordEvidence('character', 'alice', 'accurate_claim', 300);

      const belief = component.getBeliefAbout('character', 'alice');

      expect(belief).toBeDefined();
      expect(belief?.subject).toBe('alice');
    });

    it('should return undefined when no belief exists about subject', () => {
      const belief = component.getBeliefAbout('character', 'unknown');

      expect(belief).toBeUndefined();
    });
  });

  describe('AC10: No Silent Fallbacks (CLAUDE.md Compliance)', () => {
    it('should throw error for invalid belief type', () => {
      expect(() => {
        component.recordEvidence('invalid' as any, 'subject', 'observation', 100);
      }).toThrow('belief type');
    });

    it('should throw error for missing subject', () => {
      expect(() => {
        component.recordEvidence('character', '', 'observation', 100);
      }).toThrow('subject');
    });

    it('should throw error for invalid evidence type', () => {
      expect(() => {
        component.recordEvidence('character', 'alice', '' as any, 100);
      }).toThrow('evidence');
    });

    it('should throw error for invalid tick value', () => {
      expect(() => {
        component.recordEvidence('character', 'alice', 'observation', -1);
      }).toThrow('tick');
    });
  });

  describe('belief metadata', () => {
    it('should track formation timestamp for beliefs', () => {
      component.recordEvidence('character', 'alice', 'accurate_claim', 100);
      component.recordEvidence('character', 'alice', 'accurate_claim', 200);
      component.recordEvidence('character', 'alice', 'accurate_claim', 300);

      const belief = component.getBeliefAbout('character', 'alice');

      expect(belief?.formedAt).toBe(300);
    });

    it('should track last updated timestamp', () => {
      component.recordEvidence('character', 'alice', 'accurate_claim', 100);
      component.recordEvidence('character', 'alice', 'accurate_claim', 200);
      component.recordEvidence('character', 'alice', 'accurate_claim', 300);
      component.recordEvidence('character', 'alice', 'accurate_claim', 400);

      const belief = component.getBeliefAbout('character', 'alice');

      expect(belief?.lastUpdated).toBe(400);
    });

    it('should track evidence count', () => {
      component.recordEvidence('character', 'alice', 'accurate_claim', 100);
      component.recordEvidence('character', 'alice', 'accurate_claim', 200);
      component.recordEvidence('character', 'alice', 'accurate_claim', 300);
      component.recordEvidence('character', 'alice', 'accurate_claim', 400);

      const belief = component.getBeliefAbout('character', 'alice');

      expect(belief?.evidenceCount).toBeGreaterThanOrEqual(4);
    });
  });
});
