/**
 * SkillTreeManager Integration Tests
 *
 * These tests actually RUN the SkillTreeManager system with real World and EventBus,
 * testing the full behavior over time rather than just isolated calculations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../../ecs/Entity.js';
import { EventBusImpl } from '../../../events/EventBus.js';
import { SkillTreeManager } from '../SkillTreeManager.js';
import { SpellLearningManager } from '../SpellLearningManager.js';
import {
  createMagicSkillProgress,
  createSkillNode,
  createSkillEffect,
  createSkillTree,
  createUnlockCondition,
  MagicSkillTreeRegistry,
} from '../../../magic/index.js';
import type { MagicComponent } from '../../../components/MagicComponent.js';
import { ComponentType as CT } from '../../../types/ComponentType.js';

describe('SkillTreeManager Integration', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let skillTreeManager: SkillTreeManager;
  let spellLearningManager: SpellLearningManager;
  let registry: MagicSkillTreeRegistry;

  beforeEach(() => {
    // Create real world and event bus
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    // Reset registry for clean test state
    MagicSkillTreeRegistry.resetInstance();
    registry = MagicSkillTreeRegistry.getInstance();

    // Create managers
    skillTreeManager = new SkillTreeManager();
    spellLearningManager = new SpellLearningManager();

    // Initialize managers
    skillTreeManager.initialize(world, spellLearningManager);
    spellLearningManager.initialize(world);
  });

  describe('XP granting and progression', () => {
    it('should accumulate XP across multiple grants', () => {
      // Create test tree
      const tree = createSkillTree(
        'test-tree',
        'test-paradigm',
        'Test Tree',
        'A test skill tree',
        [
          createSkillNode('foundation-node', 'Foundation', 'test-paradigm', 'foundation', 0, 100, [
            createSkillEffect('technique_proficiency', 1),
          ]),
        ],
        [{ eventType: 'spell_cast', xpAmount: 10, description: 'Cast spell' }]
      );
      registry.register(tree);

      // Create entity with magic component
      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['test-paradigm'],
        skillTreeState: {
          'test-paradigm': {
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

      // Grant XP multiple times
      skillTreeManager.grantSkillXP(entity, 'test-paradigm', 25);
      let magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['test-paradigm']?.xp).toBe(25);

      skillTreeManager.grantSkillXP(entity, 'test-paradigm', 35);
      magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['test-paradigm']?.xp).toBe(60);

      skillTreeManager.grantSkillXP(entity, 'test-paradigm', 40);
      magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['test-paradigm']?.xp).toBe(100);
    });

    it('should initialize paradigm state if not present', () => {
      const tree = createSkillTree(
        'new-paradigm-tree',
        'new-paradigm',
        'New Paradigm',
        'New paradigm tree',
        [createSkillNode('node-1', 'Node 1', 'new-paradigm', 'foundation', 0, 50, [])],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['new-paradigm'],
        skillTreeState: {}, // Empty state
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

      // Grant XP to paradigm with no state
      skillTreeManager.grantSkillXP(entity, 'new-paradigm', 25);

      const magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['new-paradigm']?.xp).toBe(25);
      expect(magic?.skillTreeState?.['new-paradigm']?.unlockedNodes).toEqual([]);
    });
  });

  describe('node unlocking', () => {
    it('should unlock node and deduct XP', () => {
      const tree = createSkillTree(
        'unlock-tree',
        'unlock-paradigm',
        'Unlock Tree',
        'Tree for testing unlocks',
        [
          createSkillNode('unlock-node', 'Unlock Node', 'unlock-paradigm', 'foundation', 0, 50, [
            createSkillEffect('technique_proficiency', 5),
          ]),
        ],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['unlock-paradigm'],
        skillTreeState: {
          'unlock-paradigm': {
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

      // Unlock node
      const result = skillTreeManager.unlockSkillNode(entity, 'unlock-paradigm', 'unlock-node', 50);
      expect(result).toBe(true);

      // Verify XP deducted
      const magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['unlock-paradigm']?.xp).toBe(50);

      // Verify node unlocked
      expect(magic?.skillTreeState?.['unlock-paradigm']?.unlockedNodes).toContain('unlock-node');
    });

    it('should emit magic:skill_node_unlocked event when unlocking', () => {
      const tree = createSkillTree(
        'event-tree',
        'event-paradigm',
        'Event Tree',
        'Tree for testing events',
        [createSkillNode('event-node', 'Event Node', 'event-paradigm', 'foundation', 0, 30, [])],
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

      // Listen for event
      const events: any[] = [];
      eventBus.on('*', (event) => events.push(event));

      // Unlock node
      skillTreeManager.unlockSkillNode(entity, 'event-paradigm', 'event-node', 30);

      // Verify event emitted
      const unlockEvent = events.find((e) => e.type === 'magic:skill_node_unlocked');
      expect(unlockEvent).toBeDefined();
      expect(unlockEvent?.data.entityId).toBe(entity.id);
      expect(unlockEvent?.data.paradigmId).toBe('event-paradigm');
      expect(unlockEvent?.data.nodeId).toBe('event-node');
      expect(unlockEvent?.data.xpSpent).toBe(30);
    });

    it('should fail to unlock when XP insufficient', () => {
      const tree = createSkillTree(
        'expensive-tree',
        'expensive-paradigm',
        'Expensive Tree',
        'Tree with expensive nodes',
        [createSkillNode('expensive-node', 'Expensive', 'expensive-paradigm', 'foundation', 0, 200, [])],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['expensive-paradigm'],
        skillTreeState: {
          'expensive-paradigm': {
            xp: 50, // Not enough
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

      // Attempt unlock
      const result = skillTreeManager.unlockSkillNode(entity, 'expensive-paradigm', 'expensive-node', 200);
      expect(result).toBe(false);

      // Verify XP unchanged
      const magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['expensive-paradigm']?.xp).toBe(50);

      // Verify node not unlocked
      expect(magic?.skillTreeState?.['expensive-paradigm']?.unlockedNodes).not.toContain('expensive-node');
    });

    it('should fail to unlock already unlocked node', () => {
      const tree = createSkillTree(
        'dupe-tree',
        'dupe-paradigm',
        'Duplicate Tree',
        'Testing duplicate unlocks',
        [createSkillNode('dupe-node', 'Dupe', 'dupe-paradigm', 'foundation', 0, 25, [])],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['dupe-paradigm'],
        skillTreeState: {
          'dupe-paradigm': {
            xp: 100,
            unlockedNodes: ['dupe-node'], // Already unlocked
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

      // Attempt duplicate unlock
      const result = skillTreeManager.unlockSkillNode(entity, 'dupe-paradigm', 'dupe-node', 25);
      expect(result).toBe(false);

      // XP should remain unchanged
      const magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['dupe-paradigm']?.xp).toBe(100);
    });
  });

  describe('spell unlock integration', () => {
    it('should auto-learn spell when unlocking node with unlock_spell effect', () => {
      const tree = createSkillTree(
        'spell-tree',
        'spell-paradigm',
        'Spell Tree',
        'Tree that unlocks spells',
        [
          createSkillNode(
            'spell-node',
            'Spell Node',
            'spell-paradigm',
            'foundation',
            0,
            40,
            [
              createSkillEffect('unlock_spell', 0.5, {
                target: { spellId: 'test-spell' },
              }),
            ],
            { description: 'Unlocks a test spell' }
          ),
        ],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['spell-paradigm'],
        skillTreeState: {
          'spell-paradigm': {
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

      // Listen for spell unlock event
      const events: any[] = [];
      eventBus.on('*', (event) => events.push(event));

      // Unlock node
      skillTreeManager.unlockSkillNode(entity, 'spell-paradigm', 'spell-node', 40);

      // Handle the unlock (triggers spell learning)
      skillTreeManager.handleSkillNodeUnlocked(entity, 'spell-paradigm', 'spell-node');

      // Verify spell unlock event emitted
      const spellEvent = events.find((e) => e.type === 'magic:spell_unlocked_from_skill_tree');
      expect(spellEvent).toBeDefined();
      expect(spellEvent?.data.spellId).toBe('test-spell');
      expect(spellEvent?.data.paradigmId).toBe('spell-paradigm');
      expect(spellEvent?.data.nodeId).toBe('spell-node');
      expect(spellEvent?.data.initialProficiency).toBe(0.5);
    });
  });

  describe('skill tree progression queries', () => {
    it('should return progression stats for entity', () => {
      const tree = createSkillTree(
        'progress-tree',
        'progress-paradigm',
        'Progress Tree',
        'Tree for testing progress',
        [
          createSkillNode('node-1', 'Node 1', 'progress-paradigm', 'foundation', 0, 20, []),
          createSkillNode('node-2', 'Node 2', 'progress-paradigm', 'foundation', 0, 30, []),
          createSkillNode('node-3', 'Node 3', 'progress-paradigm', 'technique', 1, 50, [], {
            prerequisites: ['node-1'],
          }),
        ],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['progress-paradigm'],
        skillTreeState: {
          'progress-paradigm': {
            xp: 80,
            unlockedNodes: ['node-1'], // One unlocked
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

      const progress = skillTreeManager.getSkillTreeProgress(entity, 'progress-paradigm');

      expect(progress).toBeDefined();
      expect(progress?.xp).toBe(80);
      expect(progress?.unlockedNodes).toEqual(['node-1']);
      expect(progress?.totalNodes).toBe(3);
      // node-2 (30 XP, no prereqs) and node-3 (50 XP, prereq met) should be available
      expect(progress?.availableNodes.length).toBeGreaterThan(0);
    });

    it('should return undefined for non-existent paradigm', () => {
      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: [],
        skillTreeState: {},
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

      const progress = skillTreeManager.getSkillTreeProgress(entity, 'nonexistent');
      expect(progress).toBeUndefined();
    });
  });

  describe('prerequisite evaluation', () => {
    it('should only allow unlocking nodes when prerequisites are met', () => {
      const tree = createSkillTree(
        'prereq-tree',
        'prereq-paradigm',
        'Prerequisite Tree',
        'Tree with dependencies',
        [
          createSkillNode('base-node', 'Base', 'prereq-paradigm', 'foundation', 0, 10, []),
          createSkillNode('advanced-node', 'Advanced', 'prereq-paradigm', 'technique', 1, 20, [], {
            prerequisites: ['base-node'],
          }),
        ],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['prereq-paradigm'],
        skillTreeState: {
          'prereq-paradigm': {
            xp: 100,
            unlockedNodes: [], // No nodes unlocked yet
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

      // Try to unlock advanced node without prerequisite
      const progress1 = skillTreeManager.getSkillTreeProgress(entity, 'prereq-paradigm');
      expect(progress1?.availableNodes).toContain('base-node');
      expect(progress1?.availableNodes).not.toContain('advanced-node'); // Not available

      // Unlock base node
      skillTreeManager.unlockSkillNode(entity, 'prereq-paradigm', 'base-node', 10);

      // Now advanced node should be available
      const progress2 = skillTreeManager.getSkillTreeProgress(entity, 'prereq-paradigm');
      expect(progress2?.availableNodes).toContain('advanced-node');

      // Unlock advanced node
      const result = skillTreeManager.unlockSkillNode(entity, 'prereq-paradigm', 'advanced-node', 20);
      expect(result).toBe(true);

      const magic = entity.getComponent<MagicComponent>(CT.Magic);
      expect(magic?.skillTreeState?.['prereq-paradigm']?.unlockedNodes).toContain('advanced-node');
    });
  });

  describe('complex unlock conditions', () => {
    it('should evaluate custom unlock conditions', () => {
      const tree = createSkillTree(
        'condition-tree',
        'condition-paradigm',
        'Condition Tree',
        'Tree with complex conditions',
        [
          createSkillNode(
            'conditional-node',
            'Conditional',
            'condition-paradigm',
            'discovery',
            1,
            30,
            [],
            {
              unlockConditions: [
                createUnlockCondition('xp_accumulated', { xpRequired: 50 }, 'Must have earned 50 XP total'),
              ],
            }
          ),
        ],
        []
      );
      registry.register(tree);

      const entity = new EntityImpl(createEntityId(), 0);
      entity.addComponent<MagicComponent>({
        type: CT.Magic,
        magicUser: true,
        knownParadigmIds: ['condition-paradigm'],
        skillTreeState: {
          'condition-paradigm': {
            xp: 60, // Available XP: 60, but total earned needs to be tracked
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

      // Note: The evaluation context uses xp as totalXpEarned
      // So with 60 XP, the condition (50 required) should be met
      const progress = skillTreeManager.getSkillTreeProgress(entity, 'condition-paradigm');
      expect(progress?.availableNodes).toContain('conditional-node');
    });
  });
});
