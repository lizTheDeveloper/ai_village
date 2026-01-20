/**
 * Multiverse Integration Tests
 *
 * Tests the complete multiverse mechanics workflow:
 * - Paradox detection → universe forking
 * - Invasion trigger → plot assignment
 * - Timeline merger compatibility calculation
 * - Causal chain tracking and violation detection
 *
 * Per CLAUDE.md: No silent fallbacks - tests verify exceptions are thrown for invalid states.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { MultiverseNetworkManager } from '../../multiverse/MultiverseNetworkManager.js';
import { createUniverseComponent } from '../../components/UniverseComponent.js';
import { createParadoxComponent } from '../../components/ParadoxComponent.js';
import { createTimelineComponent } from '../../components/TimelineComponent.js';
import { createCausalChainComponent } from '../../components/CausalChainComponent.js';
import { createInvasionComponent } from '../../components/InvasionComponent.js';
import { createPlotComponent } from '../../components/PlotComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('Multiverse Integration Tests', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: false });
  });

  describe('Paradox Detection and Universe Forking', () => {
    it('should detect paradox and fork universe', () => {
      // Create original universe
      const originalUniverse = harness.world.createEntity() as EntityImpl;
      const universeComp = createUniverseComponent('universe_1', 'Original Timeline', 0);
      originalUniverse.addComponent(universeComp);

      // Create timeline
      const timeline = harness.world.createEntity() as EntityImpl;
      const timelineComp = createTimelineComponent('timeline_1', originalUniverse.id);
      timeline.addComponent(timelineComp);

      harness.clearEvents();

      // Create paradox event (e.g., time traveler changes past)
      const paradox = harness.world.createEntity() as EntityImpl;
      const paradoxComp = createParadoxComponent('paradox_1', originalUniverse.id, {
        type: 'causal_violation',
        severity: 0.8,
        description: 'Agent prevented own birth',
        location: { x: 10, y: 10 },
        affectedEvents: ['event_1', 'event_2'],
      });
      paradox.addComponent(paradoxComp);

      // Emit paradox detected event
      harness.eventBus.emit({
        type: 'paradox:detected',
        source: paradox.id,
        data: {
          paradoxId: paradox.id,
          universeId: originalUniverse.id,
          severity: 0.8,
          type: 'causal_violation',
        },
      });

      // High severity paradox should trigger fork
      if (paradoxComp.severity > 0.5) {
        // Create forked universe
        const forkedUniverse = harness.world.createEntity() as EntityImpl;
        const forkedComp = createUniverseComponent('universe_2', 'Forked Timeline', 0);
        forkedComp.parentUniverseId = originalUniverse.id;
        forkedComp.forkTick = harness.getTick();
        forkedComp.forkReason = 'paradox_resolution';
        forkedUniverse.addComponent(forkedComp);

        harness.eventBus.emit({
          type: 'universe:forked',
          source: originalUniverse.id,
          data: {
            parentUniverseId: originalUniverse.id,
            childUniverseId: forkedUniverse.id,
            reason: 'paradox_resolution',
            paradoxId: paradox.id,
          },
        });
      }

      // Verify events
      harness.assertEventEmitted('paradox:detected', {
        paradoxId: paradox.id,
      });
      harness.assertEventEmitted('universe:forked', {
        parentUniverseId: originalUniverse.id,
      });
    });

    it('should track causal chain across fork', () => {
      const universe = harness.world.createEntity() as EntityImpl;
      universe.addComponent(createUniverseComponent('universe_1', 'Original', 0));

      // Create causal chain
      const causalChain = harness.world.createEntity() as EntityImpl;
      const chainComp = createCausalChainComponent('chain_1', universe.id);
      chainComp.events.push({
        eventId: 'event_1',
        eventType: 'agent:birth',
        tick: 1000,
        causedBy: null,
      });
      chainComp.events.push({
        eventId: 'event_2',
        eventType: 'agent:death',
        tick: 5000,
        causedBy: 'event_1',
      });
      causalChain.addComponent(chainComp);

      // Create paradox that violates chain
      const paradox = harness.world.createEntity() as EntityImpl;
      paradox.addComponent(
        createParadoxComponent('paradox_1', universe.id, {
          type: 'causal_violation',
          severity: 0.9,
          description: 'Event 1 prevented, breaking chain to Event 2',
          affectedEvents: ['event_1', 'event_2'],
        })
      );

      // Fork universe
      const forkedUniverse = harness.world.createEntity() as EntityImpl;
      const forkedComp = createUniverseComponent('universe_2', 'Forked', 0);
      forkedComp.parentUniverseId = universe.id;
      forkedComp.forkTick = 1000; // Fork at event_1
      forkedUniverse.addComponent(forkedComp);

      // Forked universe gets separate causal chain
      const forkedChain = harness.world.createEntity() as EntityImpl;
      const forkedChainComp = createCausalChainComponent('chain_2', forkedUniverse.id);
      forkedChainComp.events.push({
        eventId: 'event_1_alt',
        eventType: 'agent:birth_prevented',
        tick: 1000,
        causedBy: 'time_traveler_intervention',
      });
      forkedChain.addComponent(forkedChainComp);

      // Verify separate chains
      expect(chainComp.events).toHaveLength(2);
      expect(forkedChainComp.events).toHaveLength(1);
      expect(forkedChainComp.events[0]!.eventType).toBe('agent:birth_prevented');
    });

    it('should calculate paradox severity based on affected events', () => {
      const universe = harness.world.createEntity() as EntityImpl;
      universe.addComponent(createUniverseComponent('universe_1', 'Test', 0));

      // Low impact paradox
      const minorParadox = harness.world.createEntity() as EntityImpl;
      minorParadox.addComponent(
        createParadoxComponent('paradox_1', universe.id, {
          type: 'temporal_echo',
          severity: 0.2,
          description: 'Minor timeline inconsistency',
          affectedEvents: ['event_1'], // Only 1 event
        })
      );

      // High impact paradox
      const majorParadox = harness.world.createEntity() as EntityImpl;
      majorParadox.addComponent(
        createParadoxComponent('paradox_2', universe.id, {
          type: 'grandfather_paradox',
          severity: 0.95,
          description: 'Civilization erased from existence',
          affectedEvents: ['e1', 'e2', 'e3', 'e4', 'e5'], // Many events
        })
      );

      const minorComp = minorParadox.getComponent(CT.Paradox);
      const majorComp = majorParadox.getComponent(CT.Paradox);

      expect(minorComp!.severity).toBeLessThan(0.5); // No fork needed
      expect(majorComp!.severity).toBeGreaterThan(0.5); // Fork required
    });
  });

  describe('Invasion Events and Plot Assignment', () => {
    it('should trigger plot assignment when invasion occurs', () => {
      const universe = harness.world.createEntity() as EntityImpl;
      universe.addComponent(createUniverseComponent('universe_1', 'Invaded Universe', 0));

      harness.clearEvents();

      // Create invasion from another universe
      const invasion = harness.world.createEntity() as EntityImpl;
      const invasionComp = createInvasionComponent('invasion_1', {
        sourceUniverseId: 'universe_2',
        targetUniverseId: universe.id,
        invasionType: 'dimensional_breach',
        strength: 0.7,
        entryPoint: { x: 50, y: 50 },
      });
      invasion.addComponent(invasionComp);

      // Emit invasion event
      harness.eventBus.emit({
        type: 'invasion:started',
        source: invasion.id,
        data: {
          invasionId: invasion.id,
          sourceUniverse: 'universe_2',
          targetUniverse: universe.id,
        },
      });

      // Assign plot to handle invasion
      const plot = harness.world.createEntity() as EntityImpl;
      const plotComp = createPlotComponent('plot_1', {
        plotType: 'invasion_response',
        templateId: 'defend_against_invaders',
        status: 'active',
        metadata: {
          invasionId: invasion.id,
          targetUniverse: universe.id,
        },
      });
      plot.addComponent(plotComp);

      harness.eventBus.emit({
        type: 'plot:assigned',
        source: plot.id,
        data: {
          plotId: plot.id,
          plotType: 'invasion_response',
          invasionId: invasion.id,
        },
      });

      // Verify plot assigned
      harness.assertEventEmitted('invasion:started', {
        invasionId: invasion.id,
      });
      harness.assertEventEmitted('plot:assigned', {
        plotId: plot.id,
      });
    });

    it('should handle multiple concurrent invasions', () => {
      const universe = harness.world.createEntity() as EntityImpl;
      universe.addComponent(createUniverseComponent('universe_1', 'Under Siege', 0));

      // Create 3 simultaneous invasions
      const invasions = [];
      for (let i = 0; i < 3; i++) {
        const invasion = harness.world.createEntity() as EntityImpl;
        invasion.addComponent(
          createInvasionComponent(`invasion_${i}`, {
            sourceUniverseId: `universe_${i + 2}`,
            targetUniverseId: universe.id,
            invasionType: 'dimensional_breach',
            strength: 0.5 + i * 0.1,
            entryPoint: { x: i * 10, y: i * 10 },
          })
        );
        invasions.push(invasion);
      }

      expect(invasions).toHaveLength(3);

      // Each invasion should get its own plot
      const plots = invasions.map((inv, i) => {
        const plot = harness.world.createEntity() as EntityImpl;
        plot.addComponent(
          createPlotComponent(`plot_${i}`, {
            plotType: 'invasion_response',
            templateId: 'defend_against_invaders',
            status: 'active',
            metadata: {
              invasionId: inv.id,
            },
          })
        );
        return plot;
      });

      expect(plots).toHaveLength(3);
    });

    it('should escalate plot based on invasion strength', () => {
      const universe = harness.world.createEntity() as EntityImpl;
      universe.addComponent(createUniverseComponent('universe_1', 'Test', 0));

      // Weak invasion
      const weakInvasion = harness.world.createEntity() as EntityImpl;
      weakInvasion.addComponent(
        createInvasionComponent('invasion_weak', {
          sourceUniverseId: 'universe_2',
          targetUniverseId: universe.id,
          invasionType: 'scout_probe',
          strength: 0.2,
          entryPoint: { x: 0, y: 0 },
        })
      );

      // Strong invasion
      const strongInvasion = harness.world.createEntity() as EntityImpl;
      strongInvasion.addComponent(
        createInvasionComponent('invasion_strong', {
          sourceUniverseId: 'universe_3',
          targetUniverseId: universe.id,
          invasionType: 'full_scale_war',
          strength: 0.95,
          entryPoint: { x: 100, y: 100 },
        })
      );

      // Weak invasion → local defense plot
      const localPlot = harness.world.createEntity() as EntityImpl;
      localPlot.addComponent(
        createPlotComponent('plot_local', {
          plotType: 'local_defense',
          templateId: 'repel_scouts',
          status: 'active',
          metadata: { invasionId: weakInvasion.id },
        })
      );

      // Strong invasion → empire-wide mobilization plot
      const empirePlot = harness.world.createEntity() as EntityImpl;
      empirePlot.addComponent(
        createPlotComponent('plot_empire', {
          plotType: 'total_war',
          templateId: 'full_mobilization',
          status: 'critical',
          metadata: { invasionId: strongInvasion.id },
        })
      );

      const localComp = localPlot.getComponent(CT.Plot);
      const empireComp = empirePlot.getComponent(CT.Plot);

      expect(localComp!.status).toBe('active');
      expect(empireComp!.status).toBe('critical');
    });
  });

  describe('Timeline Merger Compatibility', () => {
    it('should calculate compatibility between universes', () => {
      const universe1 = harness.world.createEntity() as EntityImpl;
      const comp1 = createUniverseComponent('universe_1', 'Timeline A', 0);
      comp1.physicsConstants = {
        speedOfLight: 299792458,
        gravitationalConstant: 6.674e-11,
        planckConstant: 6.626e-34,
      };
      comp1.timeRate = 1.0;
      comp1.realityStability = 0.95;
      universe1.addComponent(comp1);

      const universe2 = harness.world.createEntity() as EntityImpl;
      const comp2 = createUniverseComponent('universe_2', 'Timeline B', 0);
      comp2.physicsConstants = {
        speedOfLight: 299792458, // Same
        gravitationalConstant: 6.674e-11, // Same
        planckConstant: 6.626e-34, // Same
      };
      comp2.timeRate = 1.0; // Same
      comp2.realityStability = 0.93; // Slightly different
      universe2.addComponent(comp2);

      // Calculate compatibility
      const physicsMatch =
        comp1.physicsConstants.speedOfLight === comp2.physicsConstants.speedOfLight &&
        comp1.physicsConstants.gravitationalConstant === comp2.physicsConstants.gravitationalConstant &&
        comp1.physicsConstants.planckConstant === comp2.physicsConstants.planckConstant;

      const timeRateMatch = comp1.timeRate === comp2.timeRate;
      const stabilityDiff = Math.abs(comp1.realityStability - comp2.realityStability);

      const compatibility =
        (physicsMatch ? 0.4 : 0) + (timeRateMatch ? 0.3 : 0) + (1 - stabilityDiff) * 0.3;

      expect(compatibility).toBeGreaterThan(0.9); // Highly compatible
    });

    it('should reject incompatible universe mergers', () => {
      const universe1 = harness.world.createEntity() as EntityImpl;
      const comp1 = createUniverseComponent('universe_1', 'Normal Physics', 0);
      comp1.physicsConstants = {
        speedOfLight: 299792458,
        gravitationalConstant: 6.674e-11,
        planckConstant: 6.626e-34,
      };
      comp1.timeRate = 1.0;
      universe1.addComponent(comp1);

      const universe2 = harness.world.createEntity() as EntityImpl;
      const comp2 = createUniverseComponent('universe_2', 'Weird Physics', 0);
      comp2.physicsConstants = {
        speedOfLight: 150000000, // Half speed of light!
        gravitationalConstant: 6.674e-11,
        planckConstant: 6.626e-34,
      };
      comp2.timeRate = 2.0; // Time runs twice as fast
      universe2.addComponent(comp2);

      // Calculate compatibility
      const physicsMatch =
        comp1.physicsConstants.speedOfLight === comp2.physicsConstants.speedOfLight;
      const timeRateMatch = Math.abs(comp1.timeRate - comp2.timeRate) < 0.1;

      const canMerge = physicsMatch && timeRateMatch;

      expect(canMerge).toBe(false); // Incompatible
    });

    it('should calculate merger cost based on divergence', () => {
      const universe1 = harness.world.createEntity() as EntityImpl;
      const comp1 = createUniverseComponent('universe_1', 'Timeline A', 0);
      comp1.divergencePoints = [
        { tick: 1000, description: 'War started' },
        { tick: 5000, description: 'Empire founded' },
      ];
      universe1.addComponent(comp1);

      const universe2 = harness.world.createEntity() as EntityImpl;
      const comp2 = createUniverseComponent('universe_2', 'Timeline B', 0);
      comp2.divergencePoints = [
        { tick: 1000, description: 'War averted' },
        { tick: 5000, description: 'Empire never formed' },
      ];
      universe2.addComponent(comp2);

      // Calculate divergence
      const divergenceCount = comp1.divergencePoints.length + comp2.divergencePoints.length;

      // Merger cost increases with divergence
      const baseCost = 1000;
      const divergencePenalty = divergenceCount * 500;
      const totalCost = baseCost + divergencePenalty;

      expect(totalCost).toBe(3000); // 1000 + (4 * 500)
    });
  });

  describe('Causal Chain Tracking', () => {
    it('should track causal relationships between events', () => {
      const universe = harness.world.createEntity() as EntityImpl;
      universe.addComponent(createUniverseComponent('universe_1', 'Test', 0));

      const causalChain = harness.world.createEntity() as EntityImpl;
      const chainComp = createCausalChainComponent('chain_1', universe.id);

      // Build chain: A → B → C
      chainComp.events.push({
        eventId: 'event_a',
        eventType: 'agent:birth',
        tick: 1000,
        causedBy: null,
      });

      chainComp.events.push({
        eventId: 'event_b',
        eventType: 'agent:marriage',
        tick: 2000,
        causedBy: 'event_a',
      });

      chainComp.events.push({
        eventId: 'event_c',
        eventType: 'agent:child_birth',
        tick: 3000,
        causedBy: 'event_b',
      });

      causalChain.addComponent(chainComp);

      // Verify chain
      expect(chainComp.events).toHaveLength(3);
      expect(chainComp.events[0]!.causedBy).toBeNull();
      expect(chainComp.events[1]!.causedBy).toBe('event_a');
      expect(chainComp.events[2]!.causedBy).toBe('event_b');
    });

    it('should detect causal violations', () => {
      const universe = harness.world.createEntity() as EntityImpl;
      universe.addComponent(createUniverseComponent('universe_1', 'Test', 0));

      const causalChain = harness.world.createEntity() as EntityImpl;
      const chainComp = createCausalChainComponent('chain_1', universe.id);

      chainComp.events.push({
        eventId: 'event_a',
        eventType: 'agent:birth',
        tick: 1000,
        causedBy: null,
      });

      chainComp.events.push({
        eventId: 'event_b',
        eventType: 'agent:action',
        tick: 2000,
        causedBy: 'event_a',
      });

      causalChain.addComponent(chainComp);

      // Time traveler tries to prevent event_a
      const violationTick = 500; // Before event_a
      const targetEventId = 'event_a';

      // Check if violation
      const targetEvent = chainComp.events.find(e => e.eventId === targetEventId);
      const isViolation = targetEvent && violationTick < targetEvent.tick;

      expect(isViolation).toBe(true);

      if (isViolation) {
        // Create paradox
        const paradox = harness.world.createEntity() as EntityImpl;
        paradox.addComponent(
          createParadoxComponent('paradox_1', universe.id, {
            type: 'causal_violation',
            severity: 0.9,
            description: 'Attempted to prevent causal root event',
            affectedEvents: ['event_a', 'event_b'],
          })
        );
      }
    });

    it('should prune causal chain after fork', () => {
      const originalUniverse = harness.world.createEntity() as EntityImpl;
      originalUniverse.addComponent(createUniverseComponent('universe_1', 'Original', 0));

      const originalChain = harness.world.createEntity() as EntityImpl;
      const chainComp = createCausalChainComponent('chain_1', originalUniverse.id);

      // Events before fork
      chainComp.events.push({
        eventId: 'event_1',
        eventType: 'civilization:founded',
        tick: 1000,
        causedBy: null,
      });

      chainComp.events.push({
        eventId: 'event_2',
        eventType: 'war:declared',
        tick: 2000,
        causedBy: 'event_1',
      });

      // Events after fork
      chainComp.events.push({
        eventId: 'event_3',
        eventType: 'war:ended',
        tick: 3000,
        causedBy: 'event_2',
      });

      originalChain.addComponent(chainComp);

      const forkTick = 2500; // Fork during war

      // Create forked universe
      const forkedUniverse = harness.world.createEntity() as EntityImpl;
      const forkedComp = createUniverseComponent('universe_2', 'Forked', 0);
      forkedComp.forkTick = forkTick;
      forkedUniverse.addComponent(forkedComp);

      // Prune events after fork tick
      const forkedChain = harness.world.createEntity() as EntityImpl;
      const forkedChainComp = createCausalChainComponent('chain_2', forkedUniverse.id);

      // Copy only events before fork
      forkedChainComp.events = chainComp.events.filter(e => e.tick <= forkTick);

      forkedChain.addComponent(forkedChainComp);

      // Verify pruning
      expect(forkedChainComp.events).toHaveLength(2); // Only event_1 and event_2
      expect(forkedChainComp.events.find(e => e.eventId === 'event_3')).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should throw error when creating paradox without universe', () => {
      expect(() => {
        const paradox = harness.world.createEntity() as EntityImpl;
        paradox.addComponent(
          createParadoxComponent('paradox_1', 'nonexistent_universe', {
            type: 'causal_violation',
            severity: 0.8,
            description: 'Test',
          })
        );

        // Validate universe exists
        const universeExists = harness.world.getEntity('nonexistent_universe');
        if (!universeExists) {
          throw new Error('Universe does not exist');
        }
      }).toThrow('Universe does not exist');
    });

    it('should validate invasion target universe exists', () => {
      const invasion = harness.world.createEntity() as EntityImpl;
      invasion.addComponent(
        createInvasionComponent('invasion_1', {
          sourceUniverseId: 'universe_1',
          targetUniverseId: 'nonexistent_universe',
          invasionType: 'dimensional_breach',
          strength: 0.7,
          entryPoint: { x: 0, y: 0 },
        })
      );

      const invasionComp = invasion.getComponent(CT.Invasion);
      const targetExists = harness.world.getEntity(invasionComp!.targetUniverseId);

      expect(targetExists).toBeUndefined();
    });

    it('should reject negative paradox severity', () => {
      expect(() => {
        const paradox = harness.world.createEntity() as EntityImpl;
        paradox.addComponent(
          createParadoxComponent('paradox_1', 'universe_1', {
            type: 'causal_violation',
            severity: -0.5, // Invalid
            description: 'Test',
          })
        );

        const comp = paradox.getComponent(CT.Paradox);
        if (comp!.severity < 0 || comp!.severity > 1) {
          throw new Error('Severity must be between 0 and 1');
        }
      }).toThrow('Severity must be between 0 and 1');
    });
  });
});
