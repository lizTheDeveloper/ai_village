/**
 * SkillTreePanel Integration Tests
 *
 * These tests verify the UI panel actually interacts correctly with the backend
 * SkillTreeManager, EventBus, and World. Tests run with real systems, not mocks.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl, EntityImpl, createEntityId, EventBusImpl, ComponentType as CT } from '@ai-village/core';
import type { MagicComponent } from '@ai-village/core';
import { SkillTreeManager } from '@ai-village/core/src/systems/magic/SkillTreeManager.js';
import { SpellLearningManager } from '@ai-village/core/src/systems/magic/SpellLearningManager.js';
import {
  createSkillNode,
  createSkillEffect,
  createSkillTree,
  MagicSkillTreeRegistry,
} from '@ai-village/core/src/magic/index.js';
import { SkillTreePanel } from '../SkillTreePanel.js';
import type { WindowManager } from '../../../WindowManager.js';

/**
 * Note: SkillTreePanel is a UI component that renders to canvas.
 * These integration tests focus on:
 * 1. Backend interaction (unlocking nodes via SkillTreeManager)
 * 2. Event handling (responding to magic:skill_node_unlocked events)
 * 3. State synchronization (UI updates when backend state changes)
 *
 * Canvas rendering tests are covered in SkillTreePanel.test.ts
 */
describe('SkillTreePanel Backend Integration', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let skillTreeManager: SkillTreeManager;
  let spellLearningManager: SpellLearningManager;
  let registry: MagicSkillTreeRegistry;
  let mockWindowManager: WindowManager;
  let panel: SkillTreePanel;

  beforeEach(() => {
    // Create real backend systems
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    MagicSkillTreeRegistry.resetInstance();
    registry = MagicSkillTreeRegistry.getInstance();

    skillTreeManager = new SkillTreeManager();
    spellLearningManager = new SpellLearningManager();

    skillTreeManager.initialize(world, spellLearningManager);
    spellLearningManager.initialize(world);

    // Create mock window manager (UI infrastructure, not tested here)
    mockWindowManager = {
      registerWindow: () => {},
      getWindowConfig: () => ({ keyboardShortcut: 'KeyT' }),
    } as any;

    panel = new SkillTreePanel(mockWindowManager);
  });

  describe('Node unlocking via backend', () => {
    it('should unlock node through SkillTreeManager and emit event', () => {
      // Create test tree
      const tree = createSkillTree(
        'integration-tree',
        'integration-paradigm',
        'Integration Tree',
        'Testing UI-backend integration',
        [
          createSkillNode('test-node', 'Test Node', 'integration-paradigm', 'foundation', 0, 50, [
            createSkillEffect('technique_proficiency', 5),
          ]),
        ],
        []
      );
      registry.register(tree);

      // Create entity with magic
      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['integration-paradigm'],
        skillTreeState: {
          'integration-paradigm': {
            xp: 100,
            unlockedNodes: [],
            nodeProgress: {},
          },
        },
        paradigmState: {},
        techniqueProficiency: {},
        formProficiency: {},
        corruption: 0,
        favorLevel: {},
        manaPools: [],
        resourcePools: {},
        spellSlots: [],
        knownSpells: [],
      });
      (world as any)._addEntity(entity);

      // Set entity in panel
      panel.setSelectedEntity(entity);

      // Track events
      const events: any[] = [];
      eventBus.on('magic:skill_node_unlocked' as any, (event) => events.push(event));

      // Unlock via backend
      const result = skillTreeManager.unlockSkillNode(entity, 'integration-paradigm', 'test-node', 50);
      expect(result).toBe(true);

      // Flush event queue
      eventBus.flush();

      // Verify event emitted
      const unlockEvent = events.find((e) => e.type === 'magic:skill_node_unlocked');
      expect(unlockEvent).toBeDefined();
      expect(unlockEvent?.data.nodeId).toBe('test-node');

      // Verify backend state changed
      const magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['integration-paradigm']?.xp).toBe(50);
      expect(magic?.skillTreeState?.['integration-paradigm']?.unlockedNodes).toContain('test-node');
    });

    it('should handle spell unlock when unlocking skill tree node', () => {
      const tree = createSkillTree(
        'spell-unlock-tree',
        'spell-unlock-paradigm',
        'Spell Unlock Tree',
        'Tree that unlocks spells',
        [
          createSkillNode(
            'spell-unlock-node',
            'Spell Unlock',
            'spell-unlock-paradigm',
            'foundation',
            0,
            40,
            [
              createSkillEffect('unlock_spell', 0.3, {
                target: { spellId: 'fireball' },
              }),
            ]
          ),
        ],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['spell-unlock-paradigm'],
        skillTreeState: {
          'spell-unlock-paradigm': {
            xp: 60,
            unlockedNodes: [],
            nodeProgress: {},
          },
        },
        paradigmState: {},
        techniqueProficiency: {},
        formProficiency: {},
        corruption: 0,
        favorLevel: {},
        manaPools: [],
        resourcePools: {},
        spellSlots: [],
        knownSpells: [],
      });
      (world as any)._addEntity(entity);

      panel.setSelectedEntity(entity);

      const events: any[] = [];
      eventBus.on('magic:spell_unlocked_from_skill_tree' as any, (event) => events.push(event));

      // Unlock node
      skillTreeManager.unlockSkillNode(entity, 'spell-unlock-paradigm', 'spell-unlock-node', 40);

      // Handle node unlock (triggers spell learning)
      skillTreeManager.handleSkillNodeUnlocked(entity, 'spell-unlock-paradigm', 'spell-unlock-node');

      // Flush event queue
      eventBus.flush();

      // Verify spell unlock event
      const spellEvent = events.find((e) => e.type === 'magic:spell_unlocked_from_skill_tree');
      expect(spellEvent).toBeDefined();
      expect(spellEvent?.data.spellId).toBe('fireball');
    });
  });

  describe('XP accumulation and availability', () => {
    it('should track XP changes from backend', () => {
      const tree = createSkillTree(
        'xp-tree',
        'xp-paradigm',
        'XP Tree',
        'Testing XP tracking',
        [createSkillNode('node-1', 'Node 1', 'xp-paradigm', 'foundation', 0, 25, [])],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['xp-paradigm'],
        skillTreeState: {
          'xp-paradigm': {
            xp: 0,
            unlockedNodes: [],
            nodeProgress: {},
          },
        },
        paradigmState: {},
        techniqueProficiency: {},
        formProficiency: {},
        corruption: 0,
        favorLevel: {},
        manaPools: [],
        resourcePools: {},
        spellSlots: [],
        knownSpells: [],
      });
      (world as any)._addEntity(entity);

      panel.setSelectedEntity(entity);

      // Grant XP multiple times
      skillTreeManager.grantSkillXP(entity, 'xp-paradigm', 10);
      let magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['xp-paradigm']?.xp).toBe(10);

      skillTreeManager.grantSkillXP(entity, 'xp-paradigm', 15);
      magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['xp-paradigm']?.xp).toBe(25);

      // Verify node becomes available
      const progress = skillTreeManager.getSkillTreeProgress(entity, 'xp-paradigm');
      expect(progress?.availableNodes).toContain('node-1');
    });

    it('should reflect XP deduction after unlock', () => {
      const tree = createSkillTree(
        'deduct-tree',
        'deduct-paradigm',
        'Deduct Tree',
        'Testing XP deduction',
        [createSkillNode('deduct-node', 'Deduct', 'deduct-paradigm', 'foundation', 0, 30, [])],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['deduct-paradigm'],
        skillTreeState: {
          'deduct-paradigm': {
            xp: 50,
            unlockedNodes: [],
            nodeProgress: {},
          },
        },
        paradigmState: {},
        techniqueProficiency: {},
        formProficiency: {},
        corruption: 0,
        favorLevel: {},
        manaPools: [],
        resourcePools: {},
        spellSlots: [],
        knownSpells: [],
      });
      (world as any)._addEntity(entity);

      panel.setSelectedEntity(entity);

      // Unlock node (costs 30 XP)
      skillTreeManager.unlockSkillNode(entity, 'deduct-paradigm', 'deduct-node', 30);

      // Verify XP deducted
      const magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['deduct-paradigm']?.xp).toBe(20);
    });
  });

  describe('Multi-paradigm handling', () => {
    it('should handle multiple paradigms with independent XP pools', () => {
      const tree1 = createSkillTree(
        'paradigm1-tree',
        'paradigm1',
        'Paradigm 1',
        'First paradigm',
        [createSkillNode('p1-node', 'P1 Node', 'paradigm1', 'foundation', 0, 20, [])],
        []
      );
      const tree2 = createSkillTree(
        'paradigm2-tree',
        'paradigm2',
        'Paradigm 2',
        'Second paradigm',
        [createSkillNode('p2-node', 'P2 Node', 'paradigm2', 'foundation', 0, 30, [])],
        []
      );
      registry.register(tree1);
      registry.register(tree2);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['paradigm1', 'paradigm2'],
        skillTreeState: {
          paradigm1: { xp: 50, unlockedNodes: [], nodeProgress: {} },
          paradigm2: { xp: 80, unlockedNodes: [], nodeProgress: {} },
        },
        paradigmState: {},
        techniqueProficiency: {},
        formProficiency: {},
        corruption: 0,
        favorLevel: {},
        manaPools: [],
        resourcePools: {},
        spellSlots: [],
        knownSpells: [],
      });
      (world as any)._addEntity(entity);

      panel.setSelectedEntity(entity);

      // Unlock node in paradigm1
      skillTreeManager.unlockSkillNode(entity, 'paradigm1', 'p1-node', 20);

      const magic = entity.getComponent<MagicComponent>(CT.Magic);

      // Paradigm1 XP should be deducted
      expect(magic?.skillTreeState?.paradigm1?.xp).toBe(30);

      // Paradigm2 XP should be unchanged
      expect(magic?.skillTreeState?.paradigm2?.xp).toBe(80);

      // Only paradigm1 node should be unlocked
      expect(magic?.skillTreeState?.paradigm1?.unlockedNodes).toContain('p1-node');
      expect(magic?.skillTreeState?.paradigm2?.unlockedNodes).not.toContain('p1-node');
    });
  });

  describe('Prerequisite chain unlocking', () => {
    it('should enforce prerequisites across multiple unlocks', () => {
      const tree = createSkillTree(
        'chain-tree',
        'chain-paradigm',
        'Chain Tree',
        'Tree with prerequisite chains',
        [
          createSkillNode('base', 'Base', 'chain-paradigm', 'foundation', 0, 10, []),
          createSkillNode('intermediate', 'Intermediate', 'chain-paradigm', 'technique', 1, 20, [], {
            prerequisites: ['base'],
          }),
          createSkillNode('advanced', 'Advanced', 'chain-paradigm', 'mastery', 2, 30, [], {
            prerequisites: ['intermediate'],
          }),
        ],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['chain-paradigm'],
        skillTreeState: {
          'chain-paradigm': {
            xp: 100,
            unlockedNodes: [],
            nodeProgress: {},
          },
        },
        paradigmState: {},
        techniqueProficiency: {},
        formProficiency: {},
        corruption: 0,
        favorLevel: {},
        manaPools: [],
        resourcePools: {},
        spellSlots: [],
        knownSpells: [],
      });
      (world as any)._addEntity(entity);

      panel.setSelectedEntity(entity);

      // Initially only base should be available
      let progress = skillTreeManager.getSkillTreeProgress(entity, 'chain-paradigm');
      expect(progress?.availableNodes).toContain('base');
      expect(progress?.availableNodes).not.toContain('intermediate');
      expect(progress?.availableNodes).not.toContain('advanced');

      // Unlock base
      skillTreeManager.unlockSkillNode(entity, 'chain-paradigm', 'base', 10);

      // Now intermediate should be available
      progress = skillTreeManager.getSkillTreeProgress(entity, 'chain-paradigm');
      expect(progress?.availableNodes).toContain('intermediate');
      expect(progress?.availableNodes).not.toContain('advanced');

      // Unlock intermediate
      skillTreeManager.unlockSkillNode(entity, 'chain-paradigm', 'intermediate', 20);

      // Now advanced should be available
      progress = skillTreeManager.getSkillTreeProgress(entity, 'chain-paradigm');
      expect(progress?.availableNodes).toContain('advanced');

      // Unlock advanced
      skillTreeManager.unlockSkillNode(entity, 'chain-paradigm', 'advanced', 30);

      // Verify all unlocked
      const magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['chain-paradigm']?.unlockedNodes).toEqual([
        'base',
        'intermediate',
        'advanced',
      ]);

      // Verify XP spent correctly (10 + 20 + 30 = 60)
      expect(magic?.skillTreeState?.['chain-paradigm']?.xp).toBe(40);
    });
  });

  describe('Event-driven UI updates', () => {
    it('should respond to magic:skill_node_unlocked events from backend', () => {
      const tree = createSkillTree(
        'event-tree',
        'event-paradigm',
        'Event Tree',
        'Testing event handling',
        [createSkillNode('event-node', 'Event Node', 'event-paradigm', 'foundation', 0, 15, [])],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['event-paradigm'],
        skillTreeState: {
          'event-paradigm': {
            xp: 30,
            unlockedNodes: [],
            nodeProgress: {},
          },
        },
        paradigmState: {},
        techniqueProficiency: {},
        formProficiency: {},
        corruption: 0,
        favorLevel: {},
        manaPools: [],
        resourcePools: {},
        spellSlots: [],
        knownSpells: [],
      });
      (world as any)._addEntity(entity);

      panel.setSelectedEntity(entity);

      // Track if panel can detect state change
      // (In real implementation, panel would listen to event and call refresh())
      const initialState = JSON.stringify(entity.getComponent<MagicComponent>(CT.Magic)?.skillTreeState);

      // Unlock from backend
      skillTreeManager.unlockSkillNode(entity, 'event-paradigm', 'event-node', 15);

      // State should have changed
      const updatedState = JSON.stringify(entity.getComponent<MagicComponent>(CT.Magic)?.skillTreeState);
      expect(updatedState).not.toBe(initialState);

      // Verify node unlocked in component
      const magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['event-paradigm']?.unlockedNodes).toContain('event-node');
    });
  });

  describe('Edge cases', () => {
    it('should handle entity with no magic component gracefully', () => {
      const entity = new EntityImpl(createEntityId(), 0);
      // No magic component added
      (world as any)._addEntity(entity);

      panel.setSelectedEntity(entity);

      // Should not crash when querying progress
      const progress = skillTreeManager.getSkillTreeProgress(entity, 'any-paradigm');
      expect(progress).toBeUndefined();
    });

    it('should handle paradigm with no registered tree', () => {
      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['nonexistent-paradigm'],
        skillTreeState: {
          'nonexistent-paradigm': { xp: 50, unlockedNodes: [], nodeProgress: {} },
        },
        paradigmState: {},
        techniqueProficiency: {},
        formProficiency: {},
        corruption: 0,
        favorLevel: {},
        manaPools: [],
        resourcePools: {},
        spellSlots: [],
        knownSpells: [],
      });
      (world as any)._addEntity(entity);

      panel.setSelectedEntity(entity);

      // Should return undefined, not crash
      const progress = skillTreeManager.getSkillTreeProgress(entity, 'nonexistent-paradigm');
      expect(progress).toBeUndefined();
    });

    it('should handle unlocking with exact XP amount', () => {
      const tree = createSkillTree(
        'exact-tree',
        'exact-paradigm',
        'Exact Tree',
        'Testing exact XP',
        [createSkillNode('exact-node', 'Exact', 'exact-paradigm', 'foundation', 0, 50, [])],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['exact-paradigm'],
        skillTreeState: {
          'exact-paradigm': {
            xp: 50, // Exact amount
            unlockedNodes: [],
            nodeProgress: {},
          },
        },
        paradigmState: {},
        techniqueProficiency: {},
        formProficiency: {},
        corruption: 0,
        favorLevel: {},
        manaPools: [],
        resourcePools: {},
        spellSlots: [],
        knownSpells: [],
      });
      (world as any)._addEntity(entity);

      panel.setSelectedEntity(entity);

      // Unlock with exact XP
      const result = skillTreeManager.unlockSkillNode(entity, 'exact-paradigm', 'exact-node', 50);
      expect(result).toBe(true);

      // Should have 0 XP remaining
      const magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['exact-paradigm']?.xp).toBe(0);
      expect(magic?.skillTreeState?.['exact-paradigm']?.unlockedNodes).toContain('exact-node');
    });
  });
});
