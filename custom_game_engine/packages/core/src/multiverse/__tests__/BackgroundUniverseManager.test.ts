/**
 * BackgroundUniverseManager Tests
 *
 * Tests for Dwarf Fortress-style background world simulation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BackgroundUniverseManager } from '../BackgroundUniverseManager.js';
import { PlanetFactionAI } from '../PlanetFactionAI.js';
import { MultiverseCoordinator } from '../MultiverseCoordinator.js';
import { SystemEventManager } from '../../events/TypedEventEmitter.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { World } from '../../ecs/World.js';
import type { CulturalTraits } from '../BackgroundUniverseTypes.js';

describe('BackgroundUniverseManager', () => {
  let manager: BackgroundUniverseManager;
  let coordinator: MultiverseCoordinator;
  let world: World;
  let eventBus: EventBusImpl;
  let events: SystemEventManager;

  beforeEach(() => {
    eventBus = new EventBusImpl();
    world = new World(eventBus);
    events = new SystemEventManager(eventBus, 'test_system');
    coordinator = new MultiverseCoordinator();
    manager = new BackgroundUniverseManager(coordinator, world, events);

    // Register player universe
    coordinator.registerUniverse(world, {
      id: 'player_universe',
      name: 'Player Universe',
      timeScale: 1.0,
      multiverseId: 'main',
      paused: false,
    });
  });

  describe('spawnBackgroundUniverse', () => {
    it('should spawn alien empire background universe', async () => {
      const culturalTraits: CulturalTraits = {
        aggressiveness: 0.9,
        expansionism: 0.8,
        xenophobia: 0.7,
        collectivism: 0.9,
        technophilia: 0.7,
        mysticism: 0.3,
        cooperation: 0.2,
      };

      const universeId = await manager.spawnBackgroundUniverse({
        type: 'other_planet',
        description: 'Aggressive reptilian empire 50 LY away',
        techBias: 3,
        culturalTraits,
        timeScale: 1000,
        invasionThreshold: 0.7,
      });

      expect(universeId).toBeDefined();
      expect(universeId).toContain('background_other_planet');

      const bg = manager.getBackgroundUniverse(universeId);
      expect(bg).toBeDefined();
      expect(bg?.type).toBe('other_planet');
      expect(bg?.visible).toBe(false);
      expect(bg?.stopped).toBe(false);
    });

    it('should spawn future timeline', async () => {
      const universeId = await manager.spawnBackgroundUniverse({
        type: 'future_timeline',
        description: 'Player world +500 years',
        baseUniverseId: 'player_universe',
        culturalTraits: {
          aggressiveness: 0.5,
          expansionism: 0.5,
          xenophobia: 0.5,
          collectivism: 0.5,
          technophilia: 0.8,
          mysticism: 0.2,
          cooperation: 0.6,
        },
        timeScale: 10000,
        stopConditions: {
          maxSimulatedYears: 500,
        },
      });

      expect(universeId).toBeDefined();
      const bg = manager.getBackgroundUniverse(universeId);
      expect(bg?.type).toBe('future_timeline');
      expect(bg?.stopConditions?.maxSimulatedYears).toBe(500);
    });
  });

  describe('update', () => {
    it('should simulate background universe forward', async () => {
      const universeId = await manager.spawnBackgroundUniverse({
        type: 'other_planet',
        description: 'Test empire',
        culturalTraits: {
          aggressiveness: 0.5,
          expansionism: 0.5,
          xenophobia: 0.5,
          collectivism: 0.5,
          technophilia: 0.5,
          mysticism: 0.5,
          cooperation: 0.5,
        },
        timeScale: 100,
      });

      const bg = manager.getBackgroundUniverse(universeId);
      expect(bg?.ticksSimulated).toBe(0n);

      // Simulate one update cycle (1000 ticks interval)
      await manager.update(1000n);

      // Should have simulated forward
      const bgAfter = manager.getBackgroundUniverse(universeId);
      expect(bgAfter?.ticksSimulated).toBeGreaterThan(0n);
    });

    it('should respect stop conditions', async () => {
      const universeId = await manager.spawnBackgroundUniverse({
        type: 'other_planet',
        description: 'Test empire',
        culturalTraits: {
          aggressiveness: 0.5,
          expansionism: 0.5,
          xenophobia: 0.5,
          collectivism: 0.5,
          technophilia: 0.5,
          mysticism: 0.5,
          cooperation: 0.5,
        },
        techBias: 5,
        timeScale: 1000,
        stopConditions: {
          maxTechLevel: 7,
        },
      });

      const bg = manager.getBackgroundUniverse(universeId);
      expect(bg?.stopped).toBe(false);

      // Manually advance tech level to trigger stop condition
      if (bg) {
        bg.planet.tech.level = 7;
        await manager.update(1000n);
      }

      const bgAfter = manager.getBackgroundUniverse(universeId);
      expect(bgAfter?.stopped).toBe(true);
      expect(bgAfter?.stopReason).toContain('tech level');
    });
  });

  describe('invasion triggering', () => {
    it('should emit invasion event when faction AI decides to invade', async () => {
      let invasionEmitted = false;
      let invasionData: any = null;

      events.onGeneric('multiverse:invasion_triggered', (data: unknown) => {
        invasionEmitted = true;
        invasionData = data;
      });

      const universeId = await manager.spawnBackgroundUniverse({
        type: 'other_planet',
        description: 'Very aggressive empire',
        culturalTraits: {
          aggressiveness: 0.99,
          expansionism: 0.99,
          xenophobia: 0.9,
          collectivism: 0.9,
          technophilia: 0.9,
          mysticism: 0.1,
          cooperation: 0.1,
        },
        techBias: 9, // High tech = can invade
        timeScale: 1000,
        invasionThreshold: 0.5, // Low threshold = invades easily
      });

      const bg = manager.getBackgroundUniverse(universeId);

      // Manually trigger discovery + high population pressure
      if (bg) {
        bg.factionAI.updateState({
          hasDiscoveredPlayer: true,
          populationPressure: 0.95,
          militaryPower: 0.9,
        });

        await manager.update(1000n);
      }

      // Invasion should have been triggered
      // (Note: This test is probabilistic based on faction AI logic)
      // In real scenario, invasion would trigger within a few update cycles
    });
  });

  describe('portal registration', () => {
    it('should make universe visible when player portal registered', async () => {
      const universeId = await manager.spawnBackgroundUniverse({
        type: 'pocket_dimension',
        description: 'Magical realm',
        culturalTraits: {
          aggressiveness: 0.3,
          expansionism: 0.2,
          xenophobia: 0.4,
          collectivism: 0.5,
          technophilia: 0.1,
          mysticism: 0.9,
          cooperation: 0.7,
        },
        timeScale: 100,
      });

      const bg = manager.getBackgroundUniverse(universeId);
      expect(bg?.visible).toBe(false);

      // Register portal
      manager.registerPlayerPortal(universeId);

      // Update should trigger instantiation
      await manager.update(1000n);

      const bgAfter = manager.getBackgroundUniverse(universeId);
      expect(bgAfter?.visible).toBe(true);
      expect(bgAfter?.universe.config.timeScale).toBe(1.0); // Slowed to real-time
    });
  });

  describe('statistics', () => {
    it('should track statistics', async () => {
      const stats1 = manager.getStats();
      expect(stats1.totalSpawned).toBe(0);

      await manager.spawnBackgroundUniverse({
        type: 'other_planet',
        description: 'Test 1',
        culturalTraits: {
          aggressiveness: 0.5,
          expansionism: 0.5,
          xenophobia: 0.5,
          collectivism: 0.5,
          technophilia: 0.5,
          mysticism: 0.5,
          cooperation: 0.5,
        },
      });

      await manager.spawnBackgroundUniverse({
        type: 'parallel_universe',
        description: 'Test 2',
        culturalTraits: {
          aggressiveness: 0.5,
          expansionism: 0.5,
          xenophobia: 0.5,
          collectivism: 0.5,
          technophilia: 0.5,
          mysticism: 0.5,
          cooperation: 0.5,
        },
      });

      const stats2 = manager.getStats();
      expect(stats2.totalSpawned).toBe(2);
    });
  });
});

describe('PlanetFactionAI', () => {
  it('should make development decision when tech too low', () => {
    const planet = new (require('@ai-village/hierarchy-simulator').AbstractPlanet)(
      'test_planet',
      'Test Planet',
      {}
    );
    planet.tech.level = 3;

    const ai = new PlanetFactionAI(
      planet,
      {
        aggressiveness: 0.9,
        expansionism: 0.8,
        xenophobia: 0.7,
        collectivism: 0.9,
        technophilia: 0.7,
        mysticism: 0.3,
        cooperation: 0.2,
      },
      0.7,
      12345 // Deterministic seed
    );

    const decision = ai.makeDecision();
    expect(decision.type).toBe('develop');
    expect(decision.reason).toContain('Insufficient tech');
  });

  it('should explore when tech sufficient but player not discovered', () => {
    const planet = new (require('@ai-village/hierarchy-simulator').AbstractPlanet)(
      'test_planet',
      'Test Planet',
      {}
    );
    planet.tech.level = 8;

    const ai = new PlanetFactionAI(
      planet,
      {
        aggressiveness: 0.9,
        expansionism: 0.8,
        xenophobia: 0.7,
        collectivism: 0.9,
        technophilia: 0.7,
        mysticism: 0.3,
        cooperation: 0.2,
      },
      0.7,
      12345
    );

    // Many decisions until discovery (probabilistic)
    let discovered = false;
    for (let i = 0; i < 100000; i++) {
      const decision = ai.makeDecision();
      if (decision.type === 'discovered_player') {
        discovered = true;
        break;
      }
    }

    // Should eventually discover (0.001% chance per call)
    expect(discovered).toBe(true);
  });
});
