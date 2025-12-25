import { describe, it, expect, beforeEach } from 'vitest';
import { SocialGradientComponent } from '../SocialGradientComponent';

describe('SocialGradientComponent', () => {
  let component: SocialGradientComponent;

  beforeEach(() => {
    component = new SocialGradientComponent();
  });

  describe('AC4: Social Gradients Work', () => {
    it('should store gradient with direction, strength, confidence, source', () => {
      component.addGradient({
        resourceType: 'wood',
        bearing: 45,
        distance: 30,
        confidence: 0.8,
        sourceAgentId: 'alice',
        tick: 100,
      });

      const gradients = component.getGradients('wood');

      expect(gradients).toHaveLength(1);
      expect(gradients[0].bearing).toBe(45);
      expect(gradients[0].distance).toBe(30);
      expect(gradients[0].confidence).toBe(0.8);
      expect(gradients[0].sourceAgentId).toBe('alice');
    });

    it('should blend multiple gradients with vector sum', () => {
      component.addGradient({
        resourceType: 'wood',
        bearing: 0,   // North
        distance: 30,
        confidence: 0.8,
        sourceAgentId: 'alice',
        tick: 100,
      });

      component.addGradient({
        resourceType: 'wood',
        bearing: 90,  // East
        distance: 30,
        confidence: 0.8,
        sourceAgentId: 'bob',
        tick: 100,
      });

      const blended = component.getBlendedGradient('wood');

      // Vector sum of North and East should point NorthEast (~45°)
      expect(blended).toBeDefined();
      expect(blended?.bearing).toBeCloseTo(45, 0);
    });

    it('should weight gradients by source trust scores', () => {
      const trustScores = new Map([
        ['alice', 0.9],
        ['bob', 0.3],
      ]);

      component.addGradient({
        resourceType: 'wood',
        bearing: 0,
        distance: 30,
        confidence: 0.8,
        sourceAgentId: 'alice',
        tick: 100,
      });

      component.addGradient({
        resourceType: 'wood',
        bearing: 180, // Opposite direction
        distance: 30,
        confidence: 0.8,
        sourceAgentId: 'bob',
        tick: 100,
      });

      const blended = component.getBlendedGradient('wood', trustScores);

      // Alice's gradient should dominate due to higher trust
      expect(blended?.bearing).toBeCloseTo(0, 10);
    });

    it('should decay gradients over time (200 tick half-life)', () => {
      component.addGradient({
        resourceType: 'wood',
        bearing: 45,
        distance: 30,
        confidence: 1.0,
        sourceAgentId: 'alice',
        tick: 100,
      });

      component.applyDecay(300); // 200 ticks later

      const gradients = component.getGradients('wood');

      expect(gradients[0].confidence).toBeCloseTo(0.5, 1); // Half-life decay
    });

    it('should remove gradients when confidence drops below threshold', () => {
      component.addGradient({
        resourceType: 'wood',
        bearing: 45,
        distance: 30,
        confidence: 0.3,
        sourceAgentId: 'alice',
        tick: 100,
      });

      component.applyDecay(500); // Decay for 400 ticks

      const gradients = component.getGradients('wood');

      expect(gradients).toHaveLength(0); // Should be removed
    });
  });

  describe('gradient queries', () => {
    it('should return gradients for specific resource type', () => {
      component.addGradient({
        resourceType: 'wood',
        bearing: 45,
        distance: 30,
        confidence: 0.8,
        sourceAgentId: 'alice',
        tick: 100,
      });

      component.addGradient({
        resourceType: 'stone',
        bearing: 90,
        distance: 40,
        confidence: 0.7,
        sourceAgentId: 'bob',
        tick: 100,
      });

      const woodGradients = component.getGradients('wood');
      const stoneGradients = component.getGradients('stone');

      expect(woodGradients).toHaveLength(1);
      expect(stoneGradients).toHaveLength(1);
    });

    it('should return empty array when no gradients exist for resource', () => {
      const gradients = component.getGradients('wood');

      expect(gradients).toEqual([]);
    });

    it('should filter out stale gradients (>400 ticks old)', () => {
      component.addGradient({
        resourceType: 'wood',
        bearing: 45,
        distance: 30,
        confidence: 0.8,
        sourceAgentId: 'alice',
        tick: 100,
      });

      const gradients = component.getGradients('wood', 600);

      expect(gradients).toHaveLength(0);
    });
  });

  describe('AC10: No Silent Fallbacks (CLAUDE.md Compliance)', () => {
    it('should throw error for invalid bearing (not 0-360)', () => {
      expect(() => {
        component.addGradient({
          resourceType: 'wood',
          bearing: 400,
          distance: 30,
          confidence: 0.8,
          sourceAgentId: 'alice',
          tick: 100,
        });
      }).toThrow('bearing');
    });

    it('should throw error for negative bearing', () => {
      expect(() => {
        component.addGradient({
          resourceType: 'wood',
          bearing: -45,
          distance: 30,
          confidence: 0.8,
          sourceAgentId: 'alice',
          tick: 100,
        });
      }).toThrow('bearing');
    });

    it('should throw error for confidence out of bounds', () => {
      expect(() => {
        component.addGradient({
          resourceType: 'wood',
          bearing: 45,
          distance: 30,
          confidence: 1.5,
          sourceAgentId: 'alice',
          tick: 100,
        });
      }).toThrow('confidence');
    });

    it('should throw error for missing source agent ID', () => {
      expect(() => {
        component.addGradient({
          resourceType: 'wood',
          bearing: 45,
          distance: 30,
          confidence: 0.8,
          sourceAgentId: '',
          tick: 100,
        });
      }).toThrow('agent');
    });

    it('should throw error for invalid resource type', () => {
      expect(() => {
        component.addGradient({
          resourceType: '' as any,
          bearing: 45,
          distance: 30,
          confidence: 0.8,
          sourceAgentId: 'alice',
          tick: 100,
        });
      }).toThrow('resource');
    });
  });

  describe('gradient strength calculation', () => {
    it('should calculate strength based on confidence and distance', () => {
      component.addGradient({
        resourceType: 'wood',
        bearing: 45,
        distance: 10,  // Close
        confidence: 0.9,
        sourceAgentId: 'alice',
        tick: 100,
      });

      const gradients = component.getGradients('wood');

      expect(gradients[0].strength).toBeGreaterThan(0.5);
    });

    it('should reduce strength for distant resources', () => {
      component.addGradient({
        resourceType: 'wood',
        bearing: 45,
        distance: 100, // Far
        confidence: 0.9,
        sourceAgentId: 'alice',
        tick: 100,
      });

      const gradients = component.getGradients('wood');

      expect(gradients[0].strength).toBeLessThan(0.5);
    });
  });

  describe('gradient removal', () => {
    it('should allow manual removal of gradient by ID', () => {
      component.addGradient({
        resourceType: 'wood',
        bearing: 45,
        distance: 30,
        confidence: 0.8,
        sourceAgentId: 'alice',
        tick: 100,
      });

      const gradients = component.getGradients('wood');
      const gradientId = gradients[0].id;

      component.removeGradient(gradientId);

      expect(component.getGradients('wood')).toHaveLength(0);
    });

    it('should clear all gradients for resource type', () => {
      component.addGradient({
        resourceType: 'wood',
        bearing: 45,
        distance: 30,
        confidence: 0.8,
        sourceAgentId: 'alice',
        tick: 100,
      });

      component.addGradient({
        resourceType: 'wood',
        bearing: 90,
        distance: 40,
        confidence: 0.7,
        sourceAgentId: 'bob',
        tick: 100,
      });

      component.clearGradients('wood');

      expect(component.getGradients('wood')).toHaveLength(0);
    });
  });
});
