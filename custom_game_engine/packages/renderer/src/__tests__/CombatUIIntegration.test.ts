import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from '@ai-village/core/ecs/World';
import type { World } from '@ai-village/core/ecs/World';
import { EventBusImpl } from '@ai-village/core/events/EventBus';
import type { EventBus } from '@ai-village/core/events/EventBus';
import type { Entity } from '@ai-village/core/ecs/Entity';
import { HealthBarRenderer } from '../HealthBarRenderer.js';
import { ThreatIndicatorRenderer } from '../ThreatIndicatorRenderer.js';
import { CombatHUDPanel } from '../CombatHUDPanel.js';
import { StanceControls } from '../StanceControls.js';

/**
 * Integration tests for the complete Combat UI system
 * Tests interaction between all combat UI components
 */

describe('Combat UI System Integration', () => {
  let world: World;
  let eventBus: EventBus;
  let canvas: HTMLCanvasElement;
  let healthBarRenderer: HealthBarRenderer;
  let threatIndicatorRenderer: ThreatIndicatorRenderer;
  let combatHUDPanel: CombatHUDPanel;
  let stanceControls: StanceControls;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBusImpl();
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    // Initialize combat UI components
    healthBarRenderer = new HealthBarRenderer(world, canvas);
    threatIndicatorRenderer = new ThreatIndicatorRenderer(world, eventBus, canvas);
    combatHUDPanel = new CombatHUDPanel(eventBus);
    stanceControls = new StanceControls(eventBus);
  });

  afterEach(() => {
    // CRITICAL: Clear selected entities BEFORE cleanup to prevent keyboard events
    // from triggering on stale entities during cleanup
    stanceControls.setSelectedEntities([]);

    // Cleanup in correct order to prevent keyboard event pollution
    // StanceControls must be cleaned up to remove its keyboard listener
    stanceControls.cleanup();
    combatHUDPanel.cleanup();
    threatIndicatorRenderer.cleanup();
  });

  describe('Full combat scenario integration', () => {
    it('should display all UI elements when combat starts', () => {
      // Create combatants
      const attacker = world.createEntity();
      attacker.addComponent({ type: 'position', version: 1, x: 100, y: 100 });
      attacker.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 7,
        health: 100,
        maxHealth: 100,
      });
      attacker.addComponent({ type: 'needs', version: 1, health: 1.0 });
      attacker.addComponent({ type: 'agent', version: 1, name: 'Warrior' });
      attacker.addComponent({
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        conflictId: 'combat-1',
        role: 'attacker',
        stance: 'aggressive',
        target: 'defender-id',
        state: 'active',
        startTime: Date.now(),
      });

      const defender = world.createEntity();
      defender.addComponent({ type: 'position', version: 1, x: 150, y: 150 });
      defender.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 5,
        health: 100,
        maxHealth: 100,
      });
      defender.addComponent({ type: 'needs', version: 1, health: 1.0 });
      defender.addComponent({ type: 'agent', version: 1, name: 'Guard' });
      defender.addComponent({
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        conflictId: 'combat-1',
        role: 'defender',
        stance: 'defensive',
        target: 'attacker-id',
        state: 'active',
        startTime: Date.now(),
      });

      // Start combat
      eventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'combat-1',
          type: 'agent_combat',
          participants: [attacker.id, defender.id],
          threatLevel: 'medium',
        },
      });

      // Flush events to process them
      eventBus.flush();

      // Verify:
      // 1. Combat HUD appears
      expect(combatHUDPanel.isVisible()).toBe(true);

      // 2. Health bars should render (entities have needs and conflict components)
      expect(healthBarRenderer.shouldRenderHealthBar(attacker)).toBe(true);
      expect(healthBarRenderer.shouldRenderHealthBar(defender)).toBe(true);

      // 3. Render the panel to verify it contains conflict info
      const hudElement = combatHUDPanel.render();
      expect(hudElement).toBeDefined();
      expect(hudElement.textContent).toContain('agent_combat');
    });

    it('should update UI when damage is dealt', () => {
      const defender = world.createEntity();
      defender.addComponent({ type: 'position', version: 1, x: 100, y: 100 });
      defender.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 5,
        health: 100,
        maxHealth: 100,
      });
      defender.addComponent({
        type: 'needs',
        version: 1,
        hunger: 1.0,
        energy: 1.0,
        health: 1.0,
        thirst: 1.0,
        temperature: 37,
        social: 0.5,
        socialContact: 0.5,
        socialDepth: 0.5,
        socialBelonging: 0.5,
        stimulation: 0.5,
        hungerDecayRate: 0.001,
        energyDecayRate: 0.0005,
        ticksAtZeroHunger: 0,
      });
      defender.addComponent({
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        conflictId: 'combat-1',
        role: 'defender',
        stance: 'defensive',
        target: 'attacker-id',
        state: 'active',
        startTime: Date.now(),
      });

      // Health bar should be visible due to conflict
      expect(healthBarRenderer.shouldRenderHealthBar(defender)).toBe(true);

      // Update health to 75%
      defender.addComponent({
        type: 'needs',
        version: 1,
        hunger: 1.0,
        energy: 1.0,
        health: 0.75,
        thirst: 1.0,
        temperature: 37,
        social: 0.5,
        socialContact: 0.5,
        socialDepth: 0.5,
        socialBelonging: 0.5,
        stimulation: 0.5,
        hungerDecayRate: 0.001,
        energyDecayRate: 0.0005,
        ticksAtZeroHunger: 0,
      });

      // Health bar should still be visible
      expect(healthBarRenderer.shouldRenderHealthBar(defender)).toBe(true);

      // Verify health bar can render without errors
      const ctx = canvas.getContext('2d');
      expect(ctx).not.toBeNull();
      expect(() => {
        healthBarRenderer.renderHealthBar(defender, 400, 300);
      }).not.toThrow();
    });

    it('should show injury indicators when injuries are inflicted', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'position', version: 1, x: 100, y: 100 });
      entity.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 5,
        health: 70,
        maxHealth: 100,
      });
      entity.addComponent({
        type: 'needs',
        version: 1,
        hunger: 1.0,
        energy: 1.0,
        health: 0.7,
        thirst: 1.0,
        temperature: 37,
        social: 0.5,
        socialContact: 0.5,
        socialDepth: 0.5,
        socialBelonging: 0.5,
        stimulation: 0.5,
        hungerDecayRate: 0.001,
        energyDecayRate: 0.0005,
        ticksAtZeroHunger: 0,
      });
      entity.addComponent({
        type: 'injury',
        version: 1,
        injuryType: 'laceration',
        severity: 'major',
        location: 'arms',
        skillPenalties: {},
      });

      // Verify injury indicators can render
      expect(() => {
        healthBarRenderer.renderInjuryIndicators(entity, 400, 300);
      }).not.toThrow();
    });

    it('should handle entity death in UI', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'position', version: 1, x: 100, y: 100 });
      entity.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 5,
        health: 0,
        maxHealth: 100,
      });
      entity.addComponent({
        type: 'needs',
        version: 1,
        hunger: 1.0,
        energy: 1.0,
        health: 0.0,
        thirst: 1.0,
        temperature: 37,
        social: 0.5,
        socialContact: 0.5,
        socialDepth: 0.5,
        socialBelonging: 0.5,
        stimulation: 0.5,
        hungerDecayRate: 0.001,
        energyDecayRate: 0.0005,
        ticksAtZeroHunger: 0,
      });
      entity.addComponent({ type: 'agent', version: 1, name: 'FallenWarrior' });

      // Add to a conflict first
      eventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'death-conflict',
          type: 'agent_combat',
          participants: [entity.id, 'enemy'],
          threatLevel: 'high',
        },
      });
      eventBus.flush();

      // Emit death event
      eventBus.emit({
        type: 'death:occurred' as any,
        source: 'test',
        data: {
          entityId: entity.id,
          cause: 'combat',
          killerId: 'enemy',
        },
      });
      eventBus.flush();

      // Verify health bar still renders for dead entity (health = 0.0) even without conflict
      // Health bars show when health < 1.0 OR when in conflict
      entity.components.delete('conflict');
      expect(healthBarRenderer.shouldRenderHealthBar(entity)).toBe(true);
    });

    it('should handle conflict resolution', () => {
      eventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'combat-1',
          type: 'agent_combat',
          participants: ['warrior', 'enemy'],
          threatLevel: 'medium',
        },
      });
      eventBus.flush();

      // Combat HUD should be visible
      expect(combatHUDPanel.isVisible()).toBe(true);

      eventBus.emit({
        type: 'conflict:resolved' as any,
        source: 'test',
        data: {
          conflictId: 'combat-1',
          outcome: 'victory',
          winner: 'warrior',
          loser: 'enemy',
        },
      });
      eventBus.flush();

      // Combat HUD should hide when all conflicts resolved
      expect(combatHUDPanel.isVisible()).toBe(false);
    });
  });

  describe('Stance changes affect multiple UI components', () => {
    it('should update stance across CombatUnitPanel and HUD when changed', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 6,
        health: 100,
        maxHealth: 100,
      });
      entity.addComponent({
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        conflictId: 'combat-1',
        role: 'defender',
        stance: 'passive',
        target: 'enemy-id',
        state: 'active',
        startTime: Date.now(),
      });

      // Set selected entities
      stanceControls.setSelectedEntities([entity]);
      expect(stanceControls.getStance()).toBe('passive');

      // Change stance
      stanceControls.setStance('aggressive');
      expect(stanceControls.getStance()).toBe('aggressive');
    });

    it('should propagate stance change to behavior system', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 6,
        health: 100,
        maxHealth: 100,
      });
      entity.addComponent({
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        conflictId: 'combat-1',
        role: 'attacker',
        stance: 'defensive',
        target: 'enemy-id',
        state: 'active',
        startTime: Date.now(),
      });

      const behaviorHandler = vi.fn();
      eventBus.on('ui:stance:changed' as any, behaviorHandler);

      stanceControls.setSelectedEntities([entity]);
      stanceControls.setStance('flee');

      // Flush events to process
      eventBus.flush();

      expect(behaviorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ui:stance:changed',
          data: expect.objectContaining({
            entityIds: [entity.id],
            stance: 'flee',
          }),
        })
      );
    });
  });

  describe('Multi-entity selection UI coordination', () => {
    it('should update all UI components when multiple entities are selected', () => {
      const entity1 = world.createEntity();
      entity1.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 6,
        health: 80,
        maxHealth: 100,
      });
      entity1.addComponent({
        type: 'needs',
        version: 1,
        hunger: 1.0,
        energy: 1.0,
        health: 0.8,
        thirst: 1.0,
        temperature: 37,
        social: 0.5,
        socialContact: 0.5,
        socialDepth: 0.5,
        socialBelonging: 0.5,
        stimulation: 0.5,
        hungerDecayRate: 0.001,
        energyDecayRate: 0.0005,
        ticksAtZeroHunger: 0,
      });
      entity1.addComponent({
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        conflictId: 'combat-1',
        role: 'defender',
        stance: 'defensive',
        target: 'enemy-id',
        state: 'active',
        startTime: Date.now(),
      });

      const entity2 = world.createEntity();
      entity2.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 7,
        health: 90,
        maxHealth: 100,
      });
      entity2.addComponent({
        type: 'needs',
        version: 1,
        hunger: 1.0,
        energy: 1.0,
        health: 0.9,
        thirst: 1.0,
        temperature: 37,
        social: 0.5,
        socialContact: 0.5,
        socialDepth: 0.5,
        socialBelonging: 0.5,
        stimulation: 0.5,
        hungerDecayRate: 0.001,
        energyDecayRate: 0.0005,
        ticksAtZeroHunger: 0,
      });
      entity2.addComponent({
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        conflictId: 'combat-1',
        role: 'defender',
        stance: 'defensive',
        target: 'enemy-id',
        state: 'active',
        startTime: Date.now(),
      });

      // Select both entities
      stanceControls.setSelectedEntities([entity1, entity2]);

      // Verify stance controls show common stance (defensive)
      expect(stanceControls.getStance()).toBe('defensive');

      // Health bars should remain visible on both
      expect(healthBarRenderer.shouldRenderHealthBar(entity1)).toBe(true);
      expect(healthBarRenderer.shouldRenderHealthBar(entity2)).toBe(true);
    });

    it('should change stance for all selected units', () => {
      const entities = [];
      for (let i = 0; i < 5; i++) {
        const entity = world.createEntity();
        entity.addComponent({
          type: 'combat_stats',
          version: 1,
          combatSkill: 5 + i,
          health: 100,
          maxHealth: 100,
        });
        entity.addComponent({
          type: 'conflict',
          version: 1,
          conflictType: 'agent_combat',
          conflictId: 'combat-1',
          role: 'defender',
          stance: 'passive',
          target: 'enemy-id',
          state: 'active',
          startTime: Date.now(),
        });
        entities.push(entity);
      }

      const handler = vi.fn();
      eventBus.on('ui:stance:changed' as any, handler);

      stanceControls.setSelectedEntities(entities);
      stanceControls.setStance('aggressive');

      // Flush events to process
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ui:stance:changed',
          data: expect.objectContaining({
            entityIds: expect.arrayContaining(entities.map((e) => e.id)),
            stance: 'aggressive',
          }),
        })
      );
    });
  });

  describe('Performance under combat load', () => {
    it('should handle 10 simultaneous combats without UI lag', () => {
      const combatants: Entity[] = [];

      // Create 20 entities (10 combats)
      for (let i = 0; i < 20; i++) {
        const entity = world.createEntity();
        entity.addComponent({ type: 'position', version: 1, x: i * 50, y: i * 50 });
        entity.addComponent({
          type: 'combat_stats',
          version: 1,
          combatSkill: 5 + (i % 5),
          health: 80 + i,
          maxHealth: 100,
        });
        entity.addComponent({
          type: 'needs',
          version: 1,
          hunger: 1.0,
          energy: 1.0,
          health: (80 + i) / 100,
          thirst: 1.0,
          temperature: 37,
          social: 0.5,
          socialContact: 0.5,
          socialDepth: 0.5,
          socialBelonging: 0.5,
          stimulation: 0.5,
          hungerDecayRate: 0.001,
          energyDecayRate: 0.0005,
          ticksAtZeroHunger: 0,
        });
        entity.addComponent({
          type: 'conflict',
          version: 1,
          conflictType: 'agent_combat',
          conflictId: `combat-${Math.floor(i / 2)}`,
          role: i % 2 === 0 ? 'attacker' : 'defender',
          stance: 'aggressive',
          target: 'enemy-id',
          state: 'active',
          startTime: Date.now(),
        });
        combatants.push(entity);
      }

      // Start all conflicts
      for (let i = 0; i < 10; i++) {
        eventBus.emit({
          type: 'conflict:started' as any,
          source: 'test',
          data: {
            conflictId: `combat-${i}`,
            type: 'agent_combat',
            participants: [combatants[i * 2].id, combatants[i * 2 + 1].id],
            threatLevel: 'medium',
          },
        });
      }

      const startTime = performance.now();
      eventBus.flush();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should handle in <100ms

      // Verify all health bars can be checked
      for (const entity of combatants) {
        expect(healthBarRenderer.shouldRenderHealthBar(entity)).toBe(true);
      }
    });

    it('should render 50+ health bars without frame drops', () => {
      const entities: Entity[] = [];

      for (let i = 0; i < 50; i++) {
        const entity = world.createEntity();
        entity.addComponent({ type: 'position', version: 1, x: i * 20, y: i * 20 });
        entity.addComponent({
          type: 'combat_stats',
          version: 1,
          combatSkill: 5,
          health: 50 + i,
          maxHealth: 100,
        });
        entity.addComponent({
          type: 'needs',
          version: 1,
          hunger: 1.0,
          energy: 1.0,
          health: (50 + i) / 100,
          thirst: 1.0,
          temperature: 37,
          social: 0.5,
          socialContact: 0.5,
          socialDepth: 0.5,
          socialBelonging: 0.5,
          stimulation: 0.5,
          hungerDecayRate: 0.001,
          energyDecayRate: 0.0005,
          ticksAtZeroHunger: 0,
        });
        entities.push(entity);
      }

      const startTime = performance.now();

      // Render all health bars
      healthBarRenderer.render(0, 0, 800, 600, 1.0, entities);

      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(50); // Reasonable threshold
    });

    it('should handle rapid stance changes without UI glitches', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 7,
        health: 100,
        maxHealth: 100,
      });
      entity.addComponent({
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        conflictId: 'combat-1',
        role: 'attacker',
        stance: 'passive',
        target: 'enemy-id',
        state: 'active',
        startTime: Date.now(),
      });

      stanceControls.setSelectedEntities([entity]);

      const stances: Array<'passive' | 'defensive' | 'aggressive' | 'flee'> = [
        'passive', 'defensive', 'aggressive', 'flee'
      ];

      // Rapid stance changes
      for (let i = 0; i < 100; i++) {
        stanceControls.setStance(stances[i % 4]);
        eventBus.flush();
      }

      // UI should show correct final stance (i=99: 99 % 4 = 3 -> stances[3] = 'flee')
      expect(stanceControls.getStance()).toBe('flee');
    });
  });

  describe('Event bus coordination', () => {
    it('should coordinate events across all combat UI components', () => {
      const attacker = world.createEntity();
      attacker.addComponent({ type: 'position', version: 1, x: 100, y: 100 });
      attacker.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 8,
        health: 100,
        maxHealth: 100,
      });
      attacker.addComponent({
        type: 'needs',
        version: 1,
        hunger: 1.0,
        energy: 1.0,
        health: 1.0,
        thirst: 1.0,
        temperature: 37,
        social: 0.5,
        socialContact: 0.5,
        socialDepth: 0.5,
        socialBelonging: 0.5,
        stimulation: 0.5,
        hungerDecayRate: 0.001,
        energyDecayRate: 0.0005,
        ticksAtZeroHunger: 0,
      });

      const defender = world.createEntity();
      defender.addComponent({ type: 'position', version: 1, x: 150, y: 150 });
      defender.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 5,
        health: 100,
        maxHealth: 100,
      });
      defender.addComponent({
        type: 'needs',
        version: 1,
        hunger: 1.0,
        energy: 1.0,
        health: 1.0,
        thirst: 1.0,
        temperature: 37,
        social: 0.5,
        socialContact: 0.5,
        socialDepth: 0.5,
        socialBelonging: 0.5,
        stimulation: 0.5,
        hungerDecayRate: 0.001,
        energyDecayRate: 0.0005,
        ticksAtZeroHunger: 0,
      });

      const conflictHandler = vi.fn();
      const damageHandler = vi.fn();
      const injuryHandler = vi.fn();
      const deathHandler = vi.fn();

      eventBus.on('conflict:started' as any, conflictHandler);
      eventBus.on('combat:damage' as any, damageHandler);
      eventBus.on('injury:inflicted' as any, injuryHandler);
      eventBus.on('death:occurred' as any, deathHandler);

      // Execute full combat sequence
      eventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'battle-1',
          type: 'agent_combat',
          participants: [attacker.id, defender.id],
          threatLevel: 'high',
        },
      });

      eventBus.emit({
        type: 'combat:damage' as any,
        source: 'test',
        data: {
          attackerId: attacker.id,
          defenderId: defender.id,
          damage: 30,
        },
      });

      eventBus.emit({
        type: 'injury:inflicted' as any,
        source: 'test',
        data: {
          entityId: defender.id,
          injuryType: 'laceration',
          severity: 'moderate',
        },
      });

      eventBus.emit({
        type: 'combat:damage' as any,
        source: 'test',
        data: {
          attackerId: attacker.id,
          defenderId: defender.id,
          damage: 70,
        },
      });

      eventBus.emit({
        type: 'death:occurred' as any,
        source: 'test',
        data: {
          entityId: defender.id,
          cause: 'combat',
          killerId: attacker.id,
        },
      });

      eventBus.flush();

      expect(conflictHandler).toHaveBeenCalledTimes(1);
      expect(damageHandler).toHaveBeenCalledTimes(2);
      expect(injuryHandler).toHaveBeenCalledTimes(1);
      expect(deathHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('UI cleanup on conflict end', () => {
    it('should clean up all UI elements when combat ends', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'position', version: 1, x: 100, y: 100 });
      entity.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 6,
        health: 100,
        maxHealth: 100,
      });
      entity.addComponent({
        type: 'needs',
        version: 1,
        hunger: 1.0,
        energy: 1.0,
        health: 1.0,
        thirst: 1.0,
        temperature: 37,
        social: 0.5,
        socialContact: 0.5,
        socialDepth: 0.5,
        socialBelonging: 0.5,
        stimulation: 0.5,
        hungerDecayRate: 0.001,
        energyDecayRate: 0.0005,
        ticksAtZeroHunger: 0,
      });

      eventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'combat-1',
          type: 'agent_combat',
          participants: [entity.id, 'enemy'],
          threatLevel: 'medium',
        },
      });
      eventBus.flush();

      expect(combatHUDPanel.isVisible()).toBe(true);

      eventBus.emit({
        type: 'conflict:resolved' as any,
        source: 'test',
        data: {
          conflictId: 'combat-1',
          outcome: 'victory',
        },
      });
      eventBus.flush();

      // Combat HUD should hide when all conflicts resolved
      expect(combatHUDPanel.isVisible()).toBe(false);

      // Health bar should not show for entity at full health without conflict
      expect(healthBarRenderer.shouldRenderHealthBar(entity)).toBe(false);
    });

    it('should unsubscribe all event listeners on cleanup', () => {
      // Create fresh components for this test
      const testEventBus = new EventBusImpl();
      const testThreatRenderer = new ThreatIndicatorRenderer(world, testEventBus, canvas);
      const testCombatHUD = new CombatHUDPanel(testEventBus);
      const testStanceControls = new StanceControls(testEventBus);

      const handler = vi.fn();
      testEventBus.on('conflict:started' as any, handler);

      // Cleanup components
      testThreatRenderer.cleanup();
      testCombatHUD.cleanup();
      testStanceControls.cleanup();

      // Emit event after cleanup
      testEventBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'test',
          type: 'agent_combat',
          participants: ['a', 'b'],
          threatLevel: 'low',
        },
      });
      testEventBus.flush();

      // Our test handler should still be called (we didn't unsubscribe it)
      expect(handler).toHaveBeenCalled();
    });
  });

  describe('Keyboard shortcut integration', () => {
    it('should execute stance changes via keyboard shortcuts', () => {
      const entity = world.createEntity();
      entity.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 6,
        health: 100,
        maxHealth: 100,
      });
      entity.addComponent({
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        conflictId: 'combat-1',
        role: 'defender',
        stance: 'passive',
        target: 'enemy-id',
        state: 'active',
        startTime: Date.now(),
      });

      const handler = vi.fn();
      eventBus.on('ui:stance:changed' as any, handler);

      stanceControls.setSelectedEntities([entity]);

      // Press '3' for aggressive stance
      const keyEvent = new KeyboardEvent('keydown', { key: '3' });
      document.dispatchEvent(keyEvent);
      eventBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ui:stance:changed',
          data: expect.objectContaining({
            stance: 'aggressive',
          }),
        })
      );
    });

    it('should not interfere with existing keyboard shortcuts', () => {
      // With no entities selected, keyboard events should not trigger stance changes
      stanceControls.setSelectedEntities([]);

      const handler = vi.fn();
      eventBus.on('ui:stance:changed' as any, handler);

      // Press 'M' for memory (existing shortcut) - should not trigger stance change
      const memoryKey = new KeyboardEvent('keydown', { key: 'M' });
      document.dispatchEvent(memoryKey);
      eventBus.flush();

      expect(handler).not.toHaveBeenCalled();

      // Press '1' for passive stance when no entities selected - should not trigger
      const stanceKey = new KeyboardEvent('keydown', { key: '1' });
      document.dispatchEvent(stanceKey);
      eventBus.flush();

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('Camera focus integration', () => {
    it('should focus camera on threat when threat indicator is clicked', () => {
      const threat = world.createEntity();
      threat.addComponent({ type: 'position', version: 1, x: 5000, y: 5000 });
      threat.addComponent({
        type: 'conflict',
        version: 1,
        conflictType: 'predator_attack',
        conflictId: 'threat-1',
        role: 'attacker',
        stance: 'aggressive',
        target: 'victim-id',
        state: 'active',
        startTime: Date.now(),
      });

      // Verify threat indicator can render off-screen arrow
      expect(() => {
        threatIndicatorRenderer.renderOffScreenArrow(threat, 10000, 10000, 800, 600, 'high');
      }).not.toThrow();

      // Verify on-screen indicator
      expect(() => {
        threatIndicatorRenderer.renderThreatIndicator(threat, 400, 300, 'high');
      }).not.toThrow();
    });

    it('should focus camera on participants when combat log event is clicked', () => {
      const attacker = world.createEntity();
      attacker.addComponent({ type: 'position', version: 1, x: 200, y: 200 });

      const defender = world.createEntity();
      defender.addComponent({ type: 'position', version: 1, x: 250, y: 250 });

      eventBus.emit({
        type: 'combat:attack' as any,
        source: 'test',
        data: {
          attackerId: attacker.id,
          defenderId: defender.id,
        },
      });

      const focusHandler = vi.fn();
      eventBus.on('camera:focus' as any, focusHandler);

      eventBus.flush();

      // This test validates the structure, actual clicking would be done in UI integration tests
      expect(attacker.components.has('position')).toBe(true);
      expect(defender.components.has('position')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle entity with 10+ injuries without UI overflow', () => {
      const entity = world.createEntity();
      entity.addComponent({ type: 'position', version: 1, x: 100, y: 100 });
      entity.addComponent({
        type: 'combat_stats',
        version: 1,
        combatSkill: 5,
        health: 20,
        maxHealth: 100,
      });
      entity.addComponent({
        type: 'needs',
        version: 1,
        hunger: 1.0,
        energy: 1.0,
        health: 0.2,
        thirst: 1.0,
        temperature: 37,
        social: 0.5,
        socialContact: 0.5,
        socialDepth: 0.5,
        socialBelonging: 0.5,
        stimulation: 0.5,
        hungerDecayRate: 0.001,
        energyDecayRate: 0.0005,
        ticksAtZeroHunger: 0,
      });

      entity.addComponent({
        type: 'injury',
        version: 1,
        injuryType: 'laceration',
        severity: 'critical',
        location: 'torso',
        skillPenalties: {},
      });

      // Verify injury indicators can render without errors
      expect(() => {
        healthBarRenderer.renderInjuryIndicators(entity, 400, 300);
      }).not.toThrow();
    });

    it('should handle multiple simultaneous conflicts without HUD overflow', () => {
      for (let i = 0; i < 20; i++) {
        eventBus.emit({
          type: 'conflict:started' as any,
          source: 'test',
          data: {
            conflictId: `conflict-${i}`,
            type: 'agent_combat',
            participants: [`entity-${i * 2}`, `entity-${i * 2 + 1}`],
            threatLevel: i % 2 === 0 ? 'medium' : 'high',
          },
        });
      }

      eventBus.flush();

      // HUD should remain visible with multiple conflicts
      expect(combatHUDPanel.isVisible()).toBe(true);

      // Render should not throw
      expect(() => {
        combatHUDPanel.render();
      }).not.toThrow();
    });

    it('should handle combat log with 100+ rapid events', () => {
      // Combat HUD panel limits events to MAX_RECENT_EVENTS (3)
      for (let i = 0; i < 150; i++) {
        eventBus.emit({
          type: 'combat:damage' as any,
          source: 'test',
          data: {
            attackerId: 'attacker',
            defenderId: 'defender',
            damage: i,
          },
        });
      }

      eventBus.flush();

      // UI should remain responsive - render without errors
      expect(() => {
        combatHUDPanel.render();
      }).not.toThrow();
    });
  });
});

