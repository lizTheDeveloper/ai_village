import { describe, it, expect, beforeEach } from 'vitest';
import { TrustNetworkComponent, VerificationResult } from '../TrustNetworkComponent';

describe('TrustNetworkComponent', () => {
  let component: TrustNetworkComponent;

  beforeEach(() => {
    component = new TrustNetworkComponent();
  });

  describe('AC5: Verification Updates Trust', () => {
    it('should increase trust by 0.1 for correct resource claims', () => {
      const agentId = 'agent-123';
      const initialTrust = component.getTrustScore(agentId);

      component.recordVerification(agentId, 'correct', 100);

      const newTrust = component.getTrustScore(agentId);
      expect(newTrust).toBeCloseTo(initialTrust + 0.1, 2);
    });

    it('should decrease trust by 0.2 for false claims', () => {
      const agentId = 'agent-123';
      component.setTrustScore(agentId, 0.5);

      component.recordVerification(agentId, 'false_report', 100);

      expect(component.getTrustScore(agentId)).toBeCloseTo(0.3, 2);
    });

    it('should apply minor penalty (-0.1) for stale information', () => {
      const agentId = 'agent-123';
      component.setTrustScore(agentId, 0.5);

      component.recordVerification(agentId, 'stale', 100);

      expect(component.getTrustScore(agentId)).toBeCloseTo(0.4, 2);
    });

    it('should apply moderate penalty (-0.4) for misidentified resources', () => {
      const agentId = 'agent-123';
      component.setTrustScore(agentId, 0.5);

      component.recordVerification(agentId, 'misidentified', 100);

      expect(component.getTrustScore(agentId)).toBeCloseTo(0.1, 2);
    });

    it('should apply severe penalty (-0.8) for pattern of unreliable reports', () => {
      const agentId = 'agent-123';
      component.setTrustScore(agentId, 1.0);

      component.recordVerification(agentId, 'unreliable', 100);

      expect(component.getTrustScore(agentId)).toBeCloseTo(0.2, 2);
    });
  });

  describe('AC7: Trust Affects Cooperation', () => {
    it('should track agents with trust below 0.3 as low-trust', () => {
      const agentId = 'agent-123';
      component.setTrustScore(agentId, 0.2);

      expect(component.isLowTrust(agentId)).toBe(true);
    });

    it('should track agents with trust above 0.3 as normal-trust', () => {
      const agentId = 'agent-123';
      component.setTrustScore(agentId, 0.5);

      expect(component.isLowTrust(agentId)).toBe(false);
    });

    it('should return verification history for agent', () => {
      const agentId = 'agent-123';
      component.recordVerification(agentId, 'correct', 100);
      component.recordVerification(agentId, 'false_report', 200);

      const history = component.getVerificationHistory(agentId);

      expect(history).toHaveLength(2);
      expect(history[0].result).toBe('correct');
      expect(history[1].result).toBe('false_report');
    });
  });

  describe('trust score bounds', () => {
    it('should clamp trust scores to 0.0 minimum', () => {
      const agentId = 'agent-123';
      component.setTrustScore(agentId, 0.1);

      component.recordVerification(agentId, 'unreliable', 100); // -0.8

      expect(component.getTrustScore(agentId)).toBeGreaterThanOrEqual(0.0);
    });

    it('should clamp trust scores to 1.0 maximum', () => {
      const agentId = 'agent-123';
      component.setTrustScore(agentId, 0.95);

      component.recordVerification(agentId, 'correct', 100); // +0.1

      expect(component.getTrustScore(agentId)).toBeLessThanOrEqual(1.0);
    });
  });

  describe('AC10: No Silent Fallbacks (CLAUDE.md Compliance)', () => {
    it('should throw error when setting trust score out of bounds', () => {
      expect(() => {
        component.setTrustScore('agent-123', 1.5);
      }).toThrow('trust score');
    });

    it('should throw error when setting negative trust score', () => {
      expect(() => {
        component.setTrustScore('agent-123', -0.5);
      }).toThrow('trust score');
    });

    it('should throw error for invalid verification result type', () => {
      expect(() => {
        const invalidType: unknown = 'invalid';
        component.recordVerification('agent-123', invalidType as VerificationResult, 100);
      }).toThrow('verification result');
    });

    it('should throw error for missing agent ID', () => {
      expect(() => {
        component.getTrustScore('');
      }).toThrow('agent ID');
    });
  });

  describe('trust decay', () => {
    it('should decay trust toward neutral (0.5) over time', () => {
      const agentId = 'agent-123';
      component.setTrustScore(agentId, 0.8);

      component.applyTrustDecay(agentId, 1000); // 1000 ticks

      const decayedTrust = component.getTrustScore(agentId);
      expect(decayedTrust).toBeLessThan(0.8);
      expect(decayedTrust).toBeGreaterThan(0.5);
    });

    it('should decay low trust toward neutral (0.5) over time', () => {
      const agentId = 'agent-123';
      component.setTrustScore(agentId, 0.2);

      component.applyTrustDecay(agentId, 1000);

      const decayedTrust = component.getTrustScore(agentId);
      expect(decayedTrust).toBeGreaterThan(0.2);
      expect(decayedTrust).toBeLessThan(0.5);
    });
  });

  describe('average trust calculation', () => {
    it('should calculate average trust across all agents', () => {
      component.setTrustScore('agent-1', 0.8);
      component.setTrustScore('agent-2', 0.6);
      component.setTrustScore('agent-3', 0.4);

      const average = component.getAverageTrustScore();

      expect(average).toBeCloseTo(0.6, 2);
    });

    it('should return 0.5 (neutral) when no trust scores exist', () => {
      const average = component.getAverageTrustScore();

      expect(average).toBe(0.5);
    });
  });
});
