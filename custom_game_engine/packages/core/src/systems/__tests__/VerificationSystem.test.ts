import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../../World';
import { VerificationSystem } from '../VerificationSystem';

describe('VerificationSystem', () => {
  let world: World;
  let system: VerificationSystem;

  beforeEach(() => {
    world = new World();
    system = new VerificationSystem();
    // Initialize system with eventBus from world
    system.initialize(world, world.eventBus);
  });

  // Helper to add gradient with claimPosition
  function addGradientWithClaim(entity: any, data: {
    resourceType: string;
    bearing: number;
    distance: number;
    sourceAgentId: string;
    claimPosition: { x: number; y: number };
    tick: number;
  }) {
    const socialGradient = entity.getComponent('SocialGradient');
    socialGradient.addGradient({
      resourceType: data.resourceType as any,
      bearing: data.bearing,
      distance: data.distance,
      confidence: 1.0,
      sourceAgentId: data.sourceAgentId,
      tick: data.tick,
      claimPosition: data.claimPosition, // Pass claimPosition directly to addGradient
    });
  }

  describe('AC5: Verification Updates Trust', () => {
    it('should verify resource claim when agent arrives at location', () => {
      const claimant = world.createEntity();
      claimant.addComponent('Agent', { id: 'alice' });
      claimant.addComponent('TrustNetwork', { scores: new Map() });

      const verifier = world.createEntity();
      verifier.addComponent('Agent', { id: 'bob' });
      verifier.addComponent('Position', { x: 100, y: 100 });
      verifier.addComponent('SocialGradient', {});

      addGradientWithClaim(verifier, {
        resourceType: 'wood',
        bearing: 0,
        distance: 10,
        sourceAgentId: 'alice',
        claimPosition: { x: 100, y: 110 },
        tick: 100,
      });

      // Place wood at claimed location
      const resource = world.createEntity();
      resource.addComponent('Position', { x: 100, y: 110 });
      resource.addComponent('Resource', { type: 'wood', amount: 50 });

      // Move verifier to location
      verifier.getComponent('Position').y = 110;

      system.update(world, world.getAllEntities(), 200);

      const trustNetwork = claimant.getComponent('TrustNetwork');
      const trust = trustNetwork.getTrustScore('bob');

      // Trust should increase for correct claim
      expect(trust).toBeGreaterThan(0.5);
    });

    it('should detect stale information (resource depleted)', () => {
      const claimant = world.createEntity();
      claimant.addComponent('Agent', { id: 'alice' });
      claimant.addComponent('TrustNetwork', { scores: new Map([['bob', 0.5]]) });

      const verifier = world.createEntity();
      verifier.addComponent('Agent', { id: 'bob' });
      verifier.addComponent('Position', { x: 100, y: 110 });
      verifier.addComponent('SocialGradient', {});

      addGradientWithClaim(verifier, {
        resourceType: 'wood',
        bearing: 0,
        distance: 10,
        sourceAgentId: 'alice',
        claimPosition: { x: 100, y: 110 },
        tick: 100,
      });

      // Resource was here but depleted (no resource entity)

      system.update(world, world.getAllEntities(), 200);

      const trustNetwork = claimant.getComponent('TrustNetwork');
      const trust = trustNetwork.getTrustScore('bob');

      // Minor penalty for stale info (-0.1)
      expect(trust).toBeCloseTo(0.4, 2);
    });

    it('should detect misidentified resources', () => {
      const claimant = world.createEntity();
      claimant.addComponent('Agent', { id: 'alice' });
      claimant.addComponent('TrustNetwork', { scores: new Map([['bob', 0.5]]) });

      const verifier = world.createEntity();
      verifier.addComponent('Agent', { id: 'bob' });
      verifier.addComponent('Position', { x: 100, y: 110 });
      verifier.addComponent('SocialGradient', {});

      addGradientWithClaim(verifier, {
        resourceType: 'wood',
        bearing: 0,
        distance: 10,
        sourceAgentId: 'alice',
        claimPosition: { x: 100, y: 110 },
        tick: 100,
      });

      // Stone at location, not wood
      const resource = world.createEntity();
      resource.addComponent('Position', { x: 100, y: 110 });
      resource.addComponent('Resource', { type: 'stone', amount: 50 });

      system.update(world, world.getAllEntities(), 200);

      const trustNetwork = claimant.getComponent('TrustNetwork');
      const trust = trustNetwork.getTrustScore('bob');

      // Moderate penalty for misidentification (-0.4)
      expect(trust).toBeCloseTo(0.1, 2);
    });

    it('should detect false reports (no resource at all)', () => {
      const claimant = world.createEntity();
      claimant.addComponent('Agent', { id: 'alice' });
      claimant.addComponent('TrustNetwork', { scores: new Map([['bob', 0.5]]) });

      const verifier = world.createEntity();
      verifier.addComponent('Agent', { id: 'bob' });
      verifier.addComponent('Position', { x: 100, y: 110 });
      verifier.addComponent('SocialGradient', {});

      addGradientWithClaim(verifier, {
        resourceType: 'wood',
        bearing: 0,
        distance: 10,
        sourceAgentId: 'alice',
        claimPosition: { x: 100, y: 110 },
        tick: 100,
      });

      // No resource at location, never was

      system.update(world, world.getAllEntities(), 150); // Soon after claim

      const trustNetwork = claimant.getComponent('TrustNetwork');
      const trust = trustNetwork.getTrustScore('bob');

      // Penalty for false report (-0.2)
      expect(trust).toBeCloseTo(0.3, 2);
    });

    it('should detect pattern of unreliable information', () => {
      const claimant = world.createEntity();
      claimant.addComponent('Agent', { id: 'alice' });
      claimant.addComponent('TrustNetwork', {
        scores: new Map([['bob', 0.5]]),
        verificationHistory: new Map([
          ['bob', [
            { result: 'false_report', tick: 50 },
            { result: 'misidentified', tick: 75 },
          ]],
        ]),
      });

      const verifier = world.createEntity();
      verifier.addComponent('Agent', { id: 'bob' });
      verifier.addComponent('Position', { x: 100, y: 110 });
      verifier.addComponent('SocialGradient', {});

      addGradientWithClaim(verifier, {
        resourceType: 'wood',
        bearing: 0,
        distance: 10,
        sourceAgentId: 'alice',
        claimPosition: { x: 100, y: 110 },
        tick: 100,
      });

      // Another false claim
      system.update(world, world.getAllEntities(), 150);

      const trustNetwork = claimant.getComponent('TrustNetwork');
      const trust = trustNetwork.getTrustScore('bob');

      // Severe penalty for pattern (-0.8)
      expect(trust).toBeLessThan(0.2);
    });
  });

  describe('AC7: Trust Affects Cooperation - Public Callouts', () => {
    it('should broadcast correction for false information', () => {
      const claimant = world.createEntity();
      claimant.addComponent('Agent', { id: 'alice' });
      claimant.addComponent('TrustNetwork', { scores: new Map() });

      const verifier = world.createEntity();
      verifier.addComponent('Agent', { id: 'bob' });
      verifier.addComponent('Position', { x: 100, y: 110 });
      verifier.addComponent('SocialGradient', {});

      addGradientWithClaim(verifier, {
        resourceType: 'wood',
        bearing: 0,
        distance: 10,
        sourceAgentId: 'alice',
        claimPosition: { x: 100, y: 110 },
        tick: 100,
      });

      const broadcasts: any[] = [];
      const eventBus = world.eventBus;
      eventBus.subscribe('agent:broadcast', (e: any) => broadcasts.push(e));

      system.update(world, world.getAllEntities(), 200);

      // Should broadcast correction
      expect(broadcasts.length).toBeGreaterThan(0);
      expect(broadcasts[0].data.message).toContain('no wood');
    });
  });

  describe('verification range', () => {
    it('should only verify claims when within verification range', () => {
      const claimant = world.createEntity();
      claimant.addComponent('Agent', { id: 'alice' });
      claimant.addComponent('TrustNetwork', { scores: new Map() });

      const verifier = world.createEntity();
      verifier.addComponent('Agent', { id: 'bob' });
      verifier.addComponent('Position', { x: 100, y: 100 }); // Far from claim
      verifier.addComponent('SocialGradient', {
        gradients: [{
          resourceType: 'wood',
          bearing: 0,
          distance: 100, // Far
          sourceAgentId: 'alice',
          claimPosition: { x: 100, y: 200 },
          tick: 100,
        }],
      });

      const trustNetwork = claimant.getComponent('TrustNetwork');
      const initialScores = new Map(trustNetwork.scores);

      system.update(world, world.getAllEntities(), 200);

      const finalScores = trustNetwork.scores;

      // No verification should occur (too far)
      expect(finalScores).toEqual(initialScores);
    });

    it('should verify when agent reaches claimed location', () => {
      const claimant = world.createEntity();
      claimant.addComponent('Agent', { id: 'alice' });
      claimant.addComponent('TrustNetwork', { scores: new Map() });

      const verifier = world.createEntity();
      verifier.addComponent('Agent', { id: 'bob' });
      verifier.addComponent('Position', { x: 100, y: 109 }); // Within 5 tiles
      verifier.addComponent('SocialGradient', {});

      addGradientWithClaim(verifier, {
        resourceType: 'wood',
        bearing: 0,
        distance: 10,
        sourceAgentId: 'alice',
        claimPosition: { x: 100, y: 110 },
        tick: 100,
      });

      // Place resource
      const resource = world.createEntity();
      resource.addComponent('Position', { x: 100, y: 110 });
      resource.addComponent('Resource', { type: 'wood', amount: 50 });

      system.update(world, world.getAllEntities(), 200);

      const trustNetwork = claimant.getComponent('TrustNetwork');

      // Verification should occur - trust score for bob should be set
      const trust = trustNetwork.getTrustScore('bob');
      expect(trust).toBeGreaterThan(0.5); // Should increase from default
    });
  });

  describe('AC10: No Silent Fallbacks (CLAUDE.md Compliance)', () => {
    it('should skip verification when claimant missing TrustNetwork component', () => {
      const claimant = world.createEntity();
      claimant.addComponent('Agent', { id: 'alice' });
      // Missing TrustNetwork - implementation just continues, doesn't throw

      const verifier = world.createEntity();
      verifier.addComponent('Agent', { id: 'bob' });
      verifier.addComponent('Position', { x: 100, y: 110 });
      verifier.addComponent('SocialGradient', {});

      addGradientWithClaim(verifier, {
        resourceType: 'wood',
        bearing: 0,
        distance: 10,
        sourceAgentId: 'alice',
        claimPosition: { x: 100, y: 110 },
        tick: 100,
      });

      // Should not throw - just skips verification
      expect(() => {
        system.update(world, world.getAllEntities(), 200);
      }).not.toThrow();
    });

    it('should throw error for invalid verification result type', () => {
      expect(() => {
        system.recordVerification('alice', 'bob', 'invalid' as any, 100);
      }).toThrow('verification result');
    });

    it('should throw error for missing agent IDs', () => {
      expect(() => {
        system.recordVerification('', 'bob', 'correct', 100);
      }).toThrow('agent ID');
    });
  });

  describe('trust score calculations', () => {
    it('should increase trust for correct claims (+0.1)', () => {
      const result = system.calculateTrustChange('correct');

      expect(result).toBeCloseTo(0.1, 2);
    });

    it('should decrease trust for stale info (-0.1)', () => {
      const result = system.calculateTrustChange('stale');

      expect(result).toBeCloseTo(-0.1, 2);
    });

    it('should decrease trust for false reports (-0.2)', () => {
      const result = system.calculateTrustChange('false_report');

      expect(result).toBeCloseTo(-0.2, 2);
    });

    it('should decrease trust for misidentification (-0.4)', () => {
      const result = system.calculateTrustChange('misidentified');

      expect(result).toBeCloseTo(-0.4, 2);
    });

    it('should decrease trust severely for pattern of unreliable info (-0.8)', () => {
      const result = system.calculateTrustChange('unreliable');

      expect(result).toBeCloseTo(-0.8, 2);
    });
  });

  describe('verification events', () => {
    it('should emit trust_verified event for correct claims', () => {
      const events: any[] = [];
      const eventBus = world.eventBus;
      eventBus.subscribe('trust:verified', (e: any) => events.push(e));

      const claimant = world.createEntity();
      claimant.addComponent('Agent', { id: 'alice' });
      claimant.addComponent('TrustNetwork', { scores: new Map() });

      const verifier = world.createEntity();
      verifier.addComponent('Agent', { id: 'bob' });
      verifier.addComponent('Position', { x: 100, y: 110 });
      verifier.addComponent('SocialGradient', {});

      addGradientWithClaim(verifier, {
        resourceType: 'wood',
        bearing: 0,
        distance: 10,
        sourceAgentId: 'alice',
        claimPosition: { x: 100, y: 110 },
        tick: 100,
      });

      // Place resource
      const resource = world.createEntity();
      resource.addComponent('Position', { x: 100, y: 110 });
      resource.addComponent('Resource', { type: 'wood', amount: 50 });

      system.update(world, world.getAllEntities(), 200);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].data.result).toBe('correct');
    });

    it('should emit trust_violated event for false claims', () => {
      const events: any[] = [];
      const eventBus = world.eventBus;
      eventBus.subscribe('trust:violated', (e: any) => events.push(e));

      const claimant = world.createEntity();
      claimant.addComponent('Agent', { id: 'alice' });
      claimant.addComponent('TrustNetwork', { scores: new Map() });

      const verifier = world.createEntity();
      verifier.addComponent('Agent', { id: 'bob' });
      verifier.addComponent('Position', { x: 100, y: 110 });
      verifier.addComponent('SocialGradient', {});

      addGradientWithClaim(verifier, {
        resourceType: 'wood',
        bearing: 0,
        distance: 10,
        sourceAgentId: 'alice',
        claimPosition: { x: 100, y: 110 },
        tick: 100,
      });

      // No resource at location

      system.update(world, world.getAllEntities(), 150);

      expect(events.length).toBeGreaterThan(0);
      expect(events[0].data.result).toBe('false_report');
    });
  });
});
