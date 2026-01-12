import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { EventBusImpl } from '@ai-village/core/events/EventBus';
import type { EventBus } from '@ai-village/core/events/EventBus';
import { CombatHUDPanel } from '../CombatHUDPanel.js';

describe('CombatHUDPanel', () => {
  let eventBus: EventBus;
  let panel: CombatHUDPanel;

  // Helper to emit and flush events
  const emitConflictStarted = (bus: EventBus, data: any) => {
    bus.emit({ type: 'conflict:started' as any, source: 'test', data });
    bus.flush();
  };

  const emitConflictResolved = (bus: EventBus, data: any) => {
    bus.emit({ type: 'conflict:resolved' as any, source: 'test', data });
    bus.flush();
  };

  const emitCombatAttack = (bus: EventBus, data: any) => {
    bus.emit({ type: 'combat:attack' as any, source: 'test', data });
    bus.flush();
  };

  beforeEach(() => {
    eventBus = new EventBusImpl();
    panel = new CombatHUDPanel(eventBus);
  });

  afterEach(() => {
    panel.cleanup();
  });

  describe('REQ-COMBAT-001: Combat HUD Overlay', () => {
    it('should implement IWindowPanel interface', () => {
      expect(panel.getId()).toBe('combat-hud-panel');
      expect(panel.getTitle()).toBe('Combat Status');
      const element = panel.render();
      expect(element).toBeInstanceOf(HTMLElement);
      expect(element.id).toBe('combat-hud-panel');
    });

    it('should subscribe to conflict:started events on construction', () => {
      const handler = vi.fn();
      const testBus = new EventBusImpl();
      testBus.on('conflict:started' as any, handler);

      testBus.emit({
        type: 'conflict:started' as any,
        source: 'test',
        data: {
          conflictId: 'test-conflict',
          type: 'agent_combat',
          participants: ['entity1', 'entity2'],
        },
      });

      testBus.flush();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'conflict:started',
          data: expect.objectContaining({
            conflictId: 'test-conflict',
            type: 'agent_combat',
          }),
        })
      );
    });

    it('should become visible when conflict starts', () => {
      expect(panel.isVisible()).toBe(false);

      emitConflictStarted(eventBus, {
        conflictId: 'conflict1',
        type: 'agent_combat',
        participants: ['agent1', 'agent2'],
      });

      expect(panel.isVisible()).toBe(true);
    });

    it('should hide when all conflicts are resolved', () => {
      // Start conflict
      emitConflictStarted(eventBus, {
        conflictId: 'conflict1',
        type: 'agent_combat',
        participants: ['agent1', 'agent2'],
      });

      expect(panel.isVisible()).toBe(true);

      // Resolve conflict
      emitConflictResolved(eventBus, {
        conflictId: 'conflict1',
        outcome: 'victory',
      });

      expect(panel.isVisible()).toBe(false);
    });

    it('should display multiple active conflicts', () => {
      emitConflictStarted(eventBus, {
        conflictId: 'conflict1',
        type: 'agent_combat',
        participants: ['agent1', 'agent2'],
      });

      emitConflictStarted(eventBus, {
        conflictId: 'conflict2',
        type: 'predator_attack',
        participants: ['wolf1', 'agent3'],
      });

      const element = panel.render();
      const conflictCount = element.querySelectorAll('.conflict-item').length;
      expect(conflictCount).toBe(2);
    });

    it('should show threat level indicator with color coding', () => {
      emitConflictStarted(eventBus, {
        conflictId: 'conflict1',
        type: 'predator_attack',
        participants: ['wolf1', 'agent1'],
        threatLevel: 'high',
      });

      const element = panel.render();
      const threatIndicator = element.querySelector('.threat-level');
      expect(threatIndicator?.classList.contains('threat-high')).toBe(true);
    });
  });

  describe('Criterion 1: Combat HUD Activation', () => {
    it('should activate HUD when combat:started event is emitted', () => {
      const handler = vi.fn();
      eventBus.on('conflict:started' as any, handler);

      emitConflictStarted(eventBus, {
        conflictId: 'test-1',
        type: 'agent_combat',
        participants: ['entity1', 'entity2'],
      });

      expect(handler).toHaveBeenCalled();
    });

    it('should display correct conflict type in HUD', () => {
      emitConflictStarted(eventBus, {
        conflictId: 'pred-1',
        type: 'predator_attack',
        participants: ['wolf', 'villager'],
      });

      const element = panel.render();
      const typeDisplay = element.querySelector('.conflict-type')?.textContent;
      expect(typeDisplay).toBeDefined();
      expect(typeDisplay).toContain('predator_attack');
    });

    it('should list all participants in active conflict', () => {
      emitConflictStarted(eventBus, {
        conflictId: 'combat-1',
        type: 'agent_combat',
        participants: ['warrior1', 'warrior2', 'warrior3'],
      });

      const element = panel.render();
      const participants = element.querySelectorAll('.participant');
      expect(participants.length).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should throw when EventBus is missing', () => {
      expect(() => {
        // @ts-expect-error Testing missing parameter
        new CombatHUDPanel(null);
      }).toThrow('CombatHUDPanel requires EventBus parameter');
    });

    it('should throw when conflict event is missing required fields', () => {
      // EventBus catches errors in handlers, so we spy on console.error
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      emitConflictStarted(eventBus, {
        conflictId: 'test',
        // Missing type and participants
      });

      // Check that an error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in event handler'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from events on cleanup', () => {
      // Start with a conflict to verify panel is listening
      emitConflictStarted(eventBus, {
        conflictId: 'test1',
        type: 'agent_combat',
        participants: ['a', 'b'],
      });

      expect(panel.isVisible()).toBe(true);

      // Cleanup should remove listeners
      panel.cleanup();

      // This should not affect the panel after cleanup
      emitConflictStarted(eventBus, {
        conflictId: 'test2',
        type: 'agent_combat',
        participants: ['c', 'd'],
      });

      // Panel visibility should remain unchanged after cleanup
      expect(panel.isVisible()).toBe(true);
    });
  });

  describe('visual elements', () => {
    it('should render translucent overlay that does not obstruct gameplay', () => {
      const element = panel.render();
      // Check the inline opacity style
      expect(element.style.opacity).toBe('0.9');
      const opacity = parseFloat(element.style.opacity);
      expect(opacity).toBeLessThan(1);
      expect(opacity).toBeGreaterThan(0);
    });

    it('should position HUD at top-center of screen', () => {
      const element = panel.render();
      expect(element.style.position).toBe('absolute');
      expect(element.style.top).toBe('0px');
      expect(element.style.left).toBe('50%');
      expect(element.style.transform).toContain('translateX(-50%)');
    });

    it('should display last 3 combat events in recent log', () => {
      // Emit multiple combat events
      for (let i = 0; i < 5; i++) {
        emitCombatAttack(eventBus, {
          attackerId: `attacker${i}`,
          defenderId: `defender${i}`,
        });
      }

      const element = panel.render();
      const logEntries = element.querySelectorAll('.recent-log-entry');
      expect(logEntries.length).toBeLessThanOrEqual(3);
      expect(logEntries.length).toBe(3);
    });
  });

  describe('user interactions', () => {
    it('should focus camera when conflict is clicked', () => {
      const handler = vi.fn();
      eventBus.on('ui:entity:selected' as any, handler);

      // Start a conflict first
      emitConflictStarted(eventBus, {
        conflictId: 'test-conflict',
        type: 'agent_combat',
        participants: ['entity1', 'entity2'],
      });

      const element = panel.render();
      const conflictItem = element.querySelector('.conflict-item') as HTMLElement;
      expect(conflictItem).not.toBeNull();

      const clickEvent = new MouseEvent('click', { bubbles: true });
      conflictItem.dispatchEvent(clickEvent);

      // Flush events emitted by click handler
      eventBus.flush();

      // Should emit entity selection event
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'ui:entity:selected',
          data: expect.objectContaining({
            entityId: 'entity1',
          }),
        })
      );
    });

    it('should change background on hover', () => {
      // Start a conflict first
      emitConflictStarted(eventBus, {
        conflictId: 'test-conflict',
        type: 'agent_combat',
        participants: ['entity1', 'entity2'],
      });

      const element = panel.render();
      const conflictItem = element.querySelector('.conflict-item') as HTMLElement;
      expect(conflictItem).not.toBeNull();

      const initialBg = conflictItem.style.background;

      const hoverEvent = new MouseEvent('mouseenter', { bubbles: true });
      conflictItem.dispatchEvent(hoverEvent);

      const hoverBg = conflictItem.style.background;
      expect(hoverBg).not.toBe(initialBg);

      const leaveEvent = new MouseEvent('mouseleave', { bubbles: true });
      conflictItem.dispatchEvent(leaveEvent);

      expect(conflictItem.style.background).toBe(initialBg);
    });
  });
});
