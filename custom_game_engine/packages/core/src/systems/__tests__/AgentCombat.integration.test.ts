import { describe, it, expect, vi } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { AgentCombatSystem } from '../AgentCombatSystem.js';
import { createConflictComponent } from '../../components/ConflictComponent.js';
import { createCombatStatsComponent } from '../../components/CombatStatsComponent.js';

/**
 * Integration tests for AgentCombatSystem
 *
 * These tests actually RUN the system with real entities and components.
 * Unlike unit tests with mocks, these verify the system works end-to-end.
 */

describe('AgentCombatSystem Integration', () => {
  it('should resolve agent vs agent combat with skill-based outcome', () => {
    // Create world with real EventBus
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    // Mock LLM provider for narrative generation
    const mockLLM = {
      generateNarrative: vi.fn().mockResolvedValue({
        narrative: 'The two fighters clashed. After a brief struggle, one emerged victorious.',
        memorable_details: ['clashed', 'brief struggle', 'victorious'],
      }),
    };

    // Create attacker entity with higher combat skill
    const attacker = new EntityImpl(createEntityId(), 0);
    attacker.addComponent({
      type: 'position' as const,
      version: 0,
      x: 0,
      y: 0,
      z: 0,
    });
    attacker.addComponent({
      type: 'agent' as const,
      version: 0,
      name: 'Warrior',
    });
    attacker.addComponent(
      createCombatStatsComponent({
        combatSkill: 8,
        huntingSkill: 5,
        stealthSkill: 6,
        weapon: 'sword',
        armor: 'chainmail',
      })
    );
    attacker.addComponent({
      type: 'relationship' as const,
      version: 0,
      relationships: {},
    });
    (world as any)._addEntity(attacker);

    // Create defender entity with lower combat skill
    const defender = new EntityImpl(createEntityId(), 0);
    defender.addComponent({
      type: 'position' as const,
      version: 0,
      x: 1,
      y: 1,
      z: 0,
    });
    defender.addComponent({
      type: 'agent' as const,
      version: 0,
      name: 'Novice',
    });
    defender.addComponent(
      createCombatStatsComponent({
        combatSkill: 3,
        huntingSkill: 2,
        stealthSkill: 4,
        weapon: 'club',
        armor: 'none',
      })
    );
    defender.addComponent({
      type: 'relationship' as const,
      version: 0,
      relationships: {},
    });
    (world as any)._addEntity(defender);

    // Add conflict component to initiate combat
    attacker.addComponent(
      createConflictComponent({
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      })
    );

    // Create and run the system
    const system = new AgentCombatSystem(mockLLM, eventBus);
    system.update(world, [attacker, defender], 1);

    // Verify combat was resolved
    const conflict = attacker.getComponent('conflict') as any;
    expect(conflict).toBeDefined();
    expect(conflict.state).toBe('resolved');
    expect(['attacker_victory', 'defender_victory', 'mutual_injury', 'stalemate']).toContain(
      conflict.outcome
    );

    // With such a skill difference (8 vs 3), attacker should likely win
    // But we don't enforce deterministic outcome - it's probability-based
  });

  it('should apply injuries when combat causes damage', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    const mockLLM = {
      generateNarrative: vi.fn().mockResolvedValue({
        narrative: 'The battle was fierce and both were wounded.',
        memorable_details: ['fierce', 'wounded'],
      }),
    };

    const attacker = new EntityImpl(createEntityId(), 0);
    attacker.addComponent({
      type: 'position' as const,
      version: 0,
      x: 0,
      y: 0,
      z: 0,
    });
    attacker.addComponent({
      type: 'agent' as const,
      version: 0,
      name: 'Fighter A',
    });
    attacker.addComponent(
      createCombatStatsComponent({
        combatSkill: 5,
        huntingSkill: 5,
        stealthSkill: 5,
        weapon: 'sword',
        armor: 'leather',
      })
    );
    attacker.addComponent({
      type: 'relationship' as const,
      version: 0,
      relationships: {},
    });
    (world as any)._addEntity(attacker);

    const defender = new EntityImpl(createEntityId(), 0);
    defender.addComponent({
      type: 'position' as const,
      version: 0,
      x: 1,
      y: 1,
      z: 0,
    });
    defender.addComponent({
      type: 'agent' as const,
      version: 0,
      name: 'Fighter B',
    });
    defender.addComponent(
      createCombatStatsComponent({
        combatSkill: 5,
        huntingSkill: 5,
        stealthSkill: 5,
        weapon: 'sword',
        armor: 'leather',
      })
    );
    defender.addComponent({
      type: 'relationship' as const,
      version: 0,
      relationships: {},
    });
    (world as any)._addEntity(defender);

    attacker.addComponent(
      createConflictComponent({
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'honor_duel',
        state: 'initiated',
        startTime: 0,
      })
    );

    const system = new AgentCombatSystem(mockLLM, eventBus);
    system.update(world, [attacker, defender], 1);

    // Check if injuries were applied
    const conflict = attacker.getComponent('conflict') as any;

    if (conflict.outcome === 'attacker_victory') {
      // Defender should have injury
      const defenderInjury = defender.getComponent('injury');
      expect(defenderInjury).toBeDefined();
      if (defenderInjury) {
        expect(['minor', 'major', 'critical']).toContain((defenderInjury as any).severity);
      }
    } else if (conflict.outcome === 'defender_victory') {
      // Attacker should have injury
      const attackerInjury = attacker.getComponent('injury');
      expect(attackerInjury).toBeDefined();
      if (attackerInjury) {
        expect(['minor', 'major', 'critical']).toContain((attackerInjury as any).severity);
      }
    } else if (conflict.outcome === 'mutual_injury') {
      // Both should have injuries
      expect(attacker.hasComponent('injury') || defender.hasComponent('injury')).toBe(true);
    }
  });

  it('should emit combat events through EventBus', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    const mockLLM = {
      generateNarrative: vi.fn().mockResolvedValue({
        narrative: 'Combat concluded.',
        memorable_details: ['concluded'],
      }),
    };

    // Track events
    const events: any[] = [];
    eventBus.on('combat:started', (data) => events.push({ type: 'started', data }));
    eventBus.on('combat:ended', (data) => events.push({ type: 'ended', data }));

    const attacker = new EntityImpl(createEntityId(), 0);
    attacker.addComponent({
      type: 'position' as const,
      version: 0,
      x: 0,
      y: 0,
      z: 0,
    });
    attacker.addComponent({
      type: 'agent' as const,
      version: 0,
      name: 'Attacker',
    });
    attacker.addComponent(
      createCombatStatsComponent({
        combatSkill: 6,
        huntingSkill: 5,
        stealthSkill: 5,
        weapon: 'spear',
        armor: 'leather',
      })
    );
    attacker.addComponent({
      type: 'relationship' as const,
      version: 0,
      relationships: {},
    });
    (world as any)._addEntity(attacker);

    const defender = new EntityImpl(createEntityId(), 0);
    defender.addComponent({
      type: 'position' as const,
      version: 0,
      x: 1,
      y: 1,
      z: 0,
    });
    defender.addComponent({
      type: 'agent' as const,
      version: 0,
      name: 'Defender',
    });
    defender.addComponent(
      createCombatStatsComponent({
        combatSkill: 6,
        huntingSkill: 5,
        stealthSkill: 5,
        weapon: 'spear',
        armor: 'leather',
      })
    );
    defender.addComponent({
      type: 'relationship' as const,
      version: 0,
      relationships: {},
    });
    (world as any)._addEntity(defender);

    attacker.addComponent(
      createConflictComponent({
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'revenge',
        state: 'initiated',
        startTime: 0,
      })
    );

    const system = new AgentCombatSystem(mockLLM, eventBus);
    system.update(world, [attacker, defender], 1);

    // Verify events were emitted
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'started')).toBe(true);
  });

  it('should update relationships after combat', () => {
    const eventBus = new EventBusImpl();
    const world = new WorldImpl(eventBus);

    const mockLLM = {
      generateNarrative: vi.fn().mockResolvedValue({
        narrative: 'The fight ended their friendship.',
        memorable_details: ['ended friendship'],
      }),
    };

    const attacker = new EntityImpl(createEntityId(), 0);
    attacker.addComponent({
      type: 'position' as const,
      version: 0,
      x: 0,
      y: 0,
      z: 0,
    });
    attacker.addComponent({
      type: 'agent' as const,
      version: 0,
      name: 'Former Friend A',
    });
    attacker.addComponent(
      createCombatStatsComponent({
        combatSkill: 7,
        huntingSkill: 5,
        stealthSkill: 5,
        weapon: 'sword',
        armor: 'chainmail',
      })
    );
    attacker.addComponent({
      type: 'relationship' as const,
      version: 0,
      relationships: {},
    });
    (world as any)._addEntity(attacker);

    const defender = new EntityImpl(createEntityId(), 0);
    defender.addComponent({
      type: 'position' as const,
      version: 0,
      x: 1,
      y: 1,
      z: 0,
    });
    defender.addComponent({
      type: 'agent' as const,
      version: 0,
      name: 'Former Friend B',
    });
    defender.addComponent(
      createCombatStatsComponent({
        combatSkill: 4,
        huntingSkill: 3,
        stealthSkill: 4,
        weapon: 'club',
        armor: 'leather',
      })
    );
    defender.addComponent({
      type: 'relationship' as const,
      version: 0,
      relationships: {},
    });
    (world as any)._addEntity(defender);

    // Set initial friendly relationship
    const attackerRel = attacker.getComponent('relationship') as any;
    attackerRel.relationships[defender.id] = { opinion: 60, trust: 70 };

    attacker.addComponent(
      createConflictComponent({
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'robbery',
        state: 'initiated',
        startTime: 0,
      })
    );

    const system = new AgentCombatSystem(mockLLM, eventBus);
    system.update(world, [attacker, defender], 1);

    // Relationship should have degraded after combat
    const updatedRel = attacker.getComponent('relationship') as any;
    if (updatedRel.relationships[defender.id]) {
      // Opinion should be worse than before
      expect(updatedRel.relationships[defender.id].opinion).toBeLessThan(60);
    }
  });
});
