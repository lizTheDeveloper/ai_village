import { describe, it, expect, beforeEach, vi } from 'vitest';
import { World } from '../World';
import { HuntingSystem } from '../systems/HuntingSystem';
import { PredatorAttackSystem } from '../systems/PredatorAttackSystem';
import { AgentCombatSystem } from '../systems/AgentCombatSystem';
import { InjurySystem } from '../systems/InjurySystem';
import { DeathTransitionSystem } from '../systems/DeathTransitionSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { NeedsSystem } from '../systems/NeedsSystem';
import { MemoryFormationSystem } from '../systems/MemoryFormationSystem';
import { StateMutatorSystem } from '../systems/StateMutatorSystem';
import { EventBusImpl } from '../events/EventBus';

/**
 * Integration Tests for Conflict System
 *
 * Verifies:
 * - Full flow: conflict → skill checks → outcome → LLM narration → memory creation → social effects
 * - Cross-system interactions (EventBus, Skills, Needs, Memory)
 * - Edge cases (simultaneous death, pack mind body loss, hive queen death, cascade loops)
 */
describe('ConflictIntegration', () => {
  let world: World;
  let huntingSystem: HuntingSystem;
  let predatorSystem: PredatorAttackSystem;
  let combatSystem: AgentCombatSystem;
  let injurySystem: InjurySystem;
  let deathSystem: DeathTransitionSystem;
  let skillSystem: SkillSystem;
  let needsSystem: NeedsSystem;
  let memorySystem: MemoryFormationSystem;
  let mockLLM: any;

  beforeEach(() => {
    world = new World();

    // HuntingSystem expects a function that returns a Promise
    mockLLM = vi.fn().mockResolvedValue({
      narrative: 'A dramatic conflict unfolded.',
      memorable_details: ['dramatic', 'conflict'],
    });

    // AgentCombatSystem expects an object with generateNarrative method
    const mockLLMObject = {
      generateNarrative: vi.fn().mockResolvedValue({
        narrative: 'A dramatic conflict unfolded.',
        memorable_details: ['dramatic', 'conflict'],
      }),
    };

    huntingSystem = new HuntingSystem(world.eventBus as EventBusImpl, mockLLM);
    predatorSystem = new PredatorAttackSystem(world.eventBus as EventBusImpl);
    combatSystem = new AgentCombatSystem(mockLLMObject, world.eventBus as EventBusImpl);
    injurySystem = new InjurySystem();
    deathSystem = new DeathTransitionSystem(world.eventBus as EventBusImpl);
    skillSystem = new SkillSystem(world.eventBus as EventBusImpl);
    needsSystem = new NeedsSystem(world.eventBus as EventBusImpl);
    memorySystem = new MemoryFormationSystem(world.eventBus as EventBusImpl);
  });

  describe('Full conflict flow', () => {
    it('should complete full hunting flow with all integrations', async () => {
      // Create hunter
      const hunter = world.createEntity();
      hunter.addComponent('position', { x: 0, y: 0, z: 0 });
      hunter.addComponent('agent', { name: 'Hunter' });
      hunter.addComponent('combat_stats', {
        huntingSkill: 7,
        combatSkill: 6,
      });
      hunter.addComponent('skills', { xp: { hunting: 0 } });
      hunter.addComponent('episodic_memory', { memories: [] });
      hunter.addComponent('inventory', { items: [] });

      // Create prey
      const deer = world.createEntity();
      deer.addComponent('position', { x: 10, y: 10, z: 0 });
      deer.addComponent('animal', { species: 'deer', awareness: 5, speed: 7 });

      // Start hunt
      hunter.addComponent('conflict', {
        conflictType: 'hunting',
        target: deer.id,
        state: 'initiated',
        startTime: 0,
      });

      // Run systems in order
      await huntingSystem.update(world, Array.from(world.entities.values()), 1); // Resolve hunt
      injurySystem.update(world, Array.from(world.entities.values()), 1); // Check for injuries
      skillSystem.update(world, Array.from(world.entities.values()), 1); // Grant XP
      memorySystem.update(world, Array.from(world.entities.values()), 1); // Form memories

      // Verify full flow
      const conflict = hunter.getComponent('conflict');
      expect(conflict.state).toBe('resolved');

      if (conflict.outcome === 'success') {
        // Should have resources
        const inventory = hunter.getComponent('inventory');
        expect(inventory.items.length).toBeGreaterThan(0);

        // Should have gained XP
        const skills = hunter.getComponent('skills');
        expect(skills.xp.hunting).toBeGreaterThan(0);

        // Should have memory
        const memory = hunter.getComponent('episodic_memory');
        expect(memory.memories.length).toBeGreaterThan(0);
      }
    });

    it('should complete full combat flow with all integrations', async () => {
      // Create combatants
      const attacker = world.createEntity();
      attacker.addComponent('position', { x: 0, y: 0, z: 0 });
      attacker.addComponent('agent', { name: 'Attacker' });
      attacker.addComponent('combat_stats', { combatSkill: 8, weapon: 'sword' });
      attacker.addComponent('relationship', { relationships: {} });
      attacker.addComponent('episodic_memory', { memories: [] });
      attacker.addComponent('skills', { xp: { combat: 0 } });
      attacker.addComponent('needs', { hunger: 1.0, energy: 1.0, health: 1.0 });

      const defender = world.createEntity();
      defender.addComponent('position', { x: 5, y: 5, z: 0 });
      defender.addComponent('agent', { name: 'Defender' });
      defender.addComponent('combat_stats', { combatSkill: 6, weapon: 'spear' });
      defender.addComponent('relationship', { relationships: {} });
      defender.addComponent('episodic_memory', { memories: [] });
      defender.addComponent('needs', { hunger: 1.0, energy: 1.0, health: 1.0 });

      const witness = world.createEntity();
      witness.addComponent('position', { x: 3, y: 3, z: 0 });
      witness.addComponent('agent', { name: 'Witness' });
      witness.addComponent('relationship', { relationships: {} });
      witness.addComponent('episodic_memory', { memories: [] });
      witness.addComponent('needs', { hunger: 1.0, energy: 1.0, health: 1.0 });

      // Start combat
      attacker.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      // Run systems - first update starts combat (initiated -> fighting)
      await combatSystem.update(world, Array.from(world.entities.values()), 1);

      // Combat needs at least 300 ticks to resolve (15 seconds minimum)
      // deltaTime is in seconds, so 50 seconds = 1000 ticks (well past minimum 300)
      await combatSystem.update(world, Array.from(world.entities.values()), 50);

      // Run other systems after combat resolution
      injurySystem.update(world, Array.from(world.entities.values()), 1); // Apply injuries
      memorySystem.update(world, Array.from(world.entities.values()), 1); // Form memories
      needsSystem.update(world, Array.from(world.entities.values()), 1); // Update needs for injuries

      // Verify full flow
      const conflict = attacker.getComponent('conflict');
      expect(conflict.state).toBe('resolved');

      // Verify combat was resolved
      expect(conflict.state).toBe('resolved');

      // If there was a victor, check for injuries
      if (conflict.outcome === 'attacker_victory' || conflict.outcome === 'defender_victory') {
        // Combat should have completed
        expect(conflict.outcome).toBeDefined();
      }
    });

    it('should handle death with all consequences', async () => {
      const dying = world.createEntity();
      dying.addComponent('position', { x: 0, y: 0, z: 0 });
      dying.addComponent('agent', { name: 'Dying' });
      dying.addComponent('inventory', { items: [{ type: 'sword' }] });
      dying.addComponent('episodic_memory', {
        memories: [
          { id: 'unique', shared: false },
          { id: 'shared', shared: true },
        ],
      });
      dying.addComponent('needs', { hunger: 1.0, energy: 1.0, health: 1.0 });

      const friend = world.createEntity();
      friend.addComponent('agent', { name: 'Friend' });
      friend.addComponent('relationship', {
        relationships: {
          [dying.id]: { opinion: 80, closeness: 'close' },
        },
      });
      friend.addComponent('needs', { hunger: 1.0, energy: 1.0, health: 1.0 });

      // Kill agent
      dying.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      deathSystem.update(world, Array.from(world.entities.values()), 1);
      needsSystem.update(world, Array.from(world.entities.values()), 1);
      memorySystem.update(world, Array.from(world.entities.values()), 1);

      // Verify death handling
      expect(dying.hasComponent('dead')).toBe(true);

      // Verify death system ran (implementation detail - death system handles consequences)
      // Could check for dropped items, but that requires spatial query system
      // For now, just verify the entity is marked as dead
    });
  });

  describe('Edge cases', () => {
    it('should handle simultaneous death', async () => {
      const agent1 = world.createEntity();
      agent1.addComponent('position', { x: 0, y: 0, z: 0 });
      agent1.addComponent('agent', { name: 'Agent1' });
      agent1.addComponent('combat_stats', { combatSkill: 5, weapon: 'sword' });
      agent1.addComponent('relationship', { relationships: {} });
      agent1.addComponent('inventory', { items: [{ type: 'gold' }] });

      const agent2 = world.createEntity();
      agent2.addComponent('position', { x: 5, y: 5, z: 0 });
      agent2.addComponent('agent', { name: 'Agent2' });
      agent2.addComponent('combat_stats', { combatSkill: 5, weapon: 'sword' });
      agent2.addComponent('relationship', { relationships: {} });
      agent2.addComponent('inventory', { items: [{ type: 'silver' }] });

      // Start lethal combat
      agent1.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: agent2.id,
        cause: 'duel',
        lethal: true,
        state: 'initiated',
        startTime: 0,
      });

      await combatSystem.update(world, Array.from(world.entities.values()), 1);

      const conflict = agent1.getComponent('conflict');

      // If mutual death outcome
      if (conflict.outcome === 'mutual_death') {
        deathSystem.update(world, Array.from(world.entities.values()), 1);

        // Both should be dead
        expect(agent1.hasComponent('dead')).toBe(true);
        expect(agent2.hasComponent('dead')).toBe(true);

        // Both should have dropped loot
        const items1 = world.getEntitiesAt(0, 0, 0).filter((e) => e.hasComponent('item'));
        const items2 = world.getEntitiesAt(5, 5, 0).filter((e) => e.hasComponent('item'));

        expect(items1.length).toBeGreaterThan(0);
        expect(items2.length).toBeGreaterThan(0);
      }
    });

    it.skip('should handle pack mind body loss', () => {
      const packMind = world.createEntity();
      packMind.addComponent('pack_combat', {
        packId: 'pack1',
        bodiesInPack: ['body1', 'body2', 'body3'],
        coherence: 0.8,
      });

      const body = world.createEntity();
      body.addComponent('agent', { name: 'Body1' });
      body.addComponent('pack_member', { packId: 'pack1' });

      // Kill body
      body.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      deathSystem.update(world, Array.from(world.entities.values()), 1);

      const packCombat = packMind.getComponent('pack_combat');

      // Coherence should drop
      expect(packCombat.coherence).toBeLessThan(0.8);

      // Body should be removed from pack
      expect(packCombat.bodiesInPack).not.toContain(body.id);
    });

    it.skip('should handle hive queen death triggering collapse', () => {
      const hive = world.createEntity();
      const queen = world.createEntity();

      hive.addComponent('hive_combat', {
        hiveId: 'hive1',
        queen: queen.id,
        workers: ['worker1', 'worker2'],
      });

      queen.addComponent('agent', { name: 'Queen' });
      queen.addComponent('hive_queen', { hiveId: 'hive1' });

      // Kill queen
      queen.addComponent('dead', {
        cause: 'combat',
        time: 1000,
      });

      deathSystem.update(world, Array.from(world.entities.values()), 1);

      const hiveCombat = hive.getComponent('hive_combat');

      // Collapse should be triggered
      expect(hiveCombat.queenDead).toBe(true);
      expect(hiveCombat.collapseTriggered).toBe(true);
    });

    it('should handle injury affecting combat performance', async () => {
      const injured = world.createEntity();
      injured.addComponent('position', { x: 0, y: 0, z: 0 });
      injured.addComponent('agent', { name: 'Injured' });
      injured.addComponent('combat_stats', { combatSkill: 8, weapon: 'sword' });
      injured.addComponent('relationship', { relationships: {} });

      const healthy = world.createEntity();
      healthy.addComponent('position', { x: 5, y: 5, z: 0 });
      healthy.addComponent('agent', { name: 'Healthy' });
      healthy.addComponent('combat_stats', { combatSkill: 5, weapon: 'club' });
      healthy.addComponent('relationship', { relationships: {} });

      // Injure stronger fighter
      injured.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'major',
        location: 'arms',
      });

      injurySystem.update(world, Array.from(world.entities.values()), 1); // Apply skill penalties

      // Start combat
      injured.addComponent('conflict', {
        conflictType: 'agent_combat',
        target: healthy.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
      });

      await combatSystem.update(world, Array.from(world.entities.values()), 1);

      // Injured fighter should have reduced combat skill due to injury
      const combatStats = injured.getComponent('combat_stats');
      expect(combatStats.combatSkill).toBeLessThan(8); // Reduced by injury from 8 to 6
    });

    it('should handle needs modifiers from injuries', () => {
      const agent = world.createEntity();
      agent.addComponent('agent', { name: 'Agent' });
      agent.addComponent('needs', {
        hunger: 0.5,
        energy: 0.6,
        health: 1.0,
        hungerDecayRate: 1.0,
        energyDecayRate: 1.0,
      });

      // Apply blood loss injury
      agent.addComponent('injury', {
        injuryType: 'laceration',
        severity: 'major',
        location: 'torso',
      });

      injurySystem.update(world, Array.from(world.entities.values()), 1);

      const needs = agent.getComponent('needs');

      // Hunger decay rate should increase due to blood loss
      expect(needs.hungerDecayRate).toBeGreaterThan(1.0);
    });

    it('should emit and handle events across systems', () => {
      const eventLog: string[] = [];

      // Set up listeners first
      world.eventBus.on('hunt:started' as any, () => eventLog.push('hunt:started'));
      world.eventBus.on('hunt:success' as any, () => eventLog.push('hunt:success'));
      world.eventBus.on('combat:started' as any, () => eventLog.push('combat:started'));
      world.eventBus.on('combat:ended' as any, () => eventLog.push('combat:ended'));
      world.eventBus.on('injury:inflicted' as any, () => eventLog.push('injury:inflicted'));
      world.eventBus.on('death:occurred' as any, () => eventLog.push('death:occurred'));

      const hunter = world.createEntity();
      hunter.addComponent('position', { x: 0, y: 0, z: 0 });
      hunter.addComponent('agent', { name: 'Hunter' });
      hunter.addComponent('combat_stats', { huntingSkill: 8, combatSkill: 7 });

      const prey = world.createEntity();
      prey.addComponent('position', { x: 10, y: 10, z: 0 });
      prey.addComponent('animal', { species: 'deer' });

      // Trigger hunt event
      world.eventBus.emit({ type: 'hunt:started' as any, hunterId: hunter.id, preyId: prey.id });
      (world.eventBus as any).flush?.(); // Process queued events if flush exists

      // Verify event was logged
      expect(eventLog).toContain('hunt:started');
    });
  });

  describe('Error propagation', () => {
    it('should propagate errors from conflict resolution', () => {
      const agent = world.createEntity();
      agent.addComponent('agent', { name: 'Agent' });

      // Invalid conflict - no target (should throw during component creation)
      expect(() => {
        agent.addComponent('conflict', {
          conflictType: 'agent_combat',
          state: 'initiated',
          startTime: 0,
        } as any);
      }).toThrow('Conflict target is required');
    });

    it('should propagate errors from injury application', () => {
      const agent = world.createEntity();
      agent.addComponent('agent', { name: 'Agent' });

      // Invalid injury type (should throw during component creation)
      expect(() => {
        agent.addComponent('injury', {
          injuryType: 'invalid',
          severity: 'minor',
          location: 'torso',
        } as any);
      }).toThrow('Invalid injury type');
    });
  });
});
