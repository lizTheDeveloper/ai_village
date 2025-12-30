/**
 * MagicSkillTree - Tests for magic skill tree system
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '../../ecs/World.js';
import type { EntityId } from '../../types.js';
import {
  // Types
  type MagicSkillTree,
  type MagicSkillNode,
  type MagicSkillProgress,
  type UnlockCondition,
  type EvaluationContext,

  // Factory functions
  createMagicSkillProgress,
  createUnlockCondition,
  createSkillNode,
  createSkillEffect,
  createDefaultTreeRules,
  createSkillTree,

  // Utility functions
  getNodeById,
  getNodesByTier,
  getNodesByCategory,
  getNodeLevelCost,
  getEffectValue,
  hasNodeUnlocked,
  getNodeLevel,
  countUnlockedNodes,
  calculateSpentXp,

  // Evaluator
  evaluateCondition,
  evaluateNode,
  evaluateTree,
  getPurchasableNodes,
  getVisibleNodes,
  canAccessTree,

  // Registry
  MagicSkillTreeRegistry,
  getSkillTreeRegistry,
  registerSkillTree,
  getSkillTree,
  hasSkillTree,
} from '../index.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestNode(
  id: string,
  paradigmId: string = 'test-paradigm',
  options: Partial<MagicSkillNode> = {}
): MagicSkillNode {
  return createSkillNode(
    id,
    `Test Node ${id}`,
    paradigmId,
    options.category ?? 'foundation',
    options.tier ?? 0,
    options.xpCost ?? 100,
    options.effects ?? [createSkillEffect('technique_proficiency', 1)],
    {
      description: `Test node ${id} description`,
      maxLevel: options.maxLevel ?? 1,
      ...options,
    }
  );
}

function createTestTree(
  nodes: MagicSkillNode[],
  options: Partial<MagicSkillTree> = {}
): MagicSkillTree {
  const paradigmId = options.paradigmId ?? 'test-paradigm';
  return createSkillTree(
    options.id ?? 'test-tree',
    paradigmId,
    options.name ?? 'Test Tree',
    options.description ?? 'A test skill tree',
    nodes,
    [
      { eventType: 'spell_cast', xpAmount: 10, description: 'Cast a spell' },
    ],
    options
  );
}

function createTestContext(
  progress: MagicSkillProgress,
  overrides: Partial<EvaluationContext> = {}
): EvaluationContext {
  return {
    world: {} as World,
    agentId: 'test-agent' as EntityId,
    progress,
    ...overrides,
  };
}

// ============================================================================
// Core Types Tests
// ============================================================================

describe('MagicSkillTree Core Types', () => {
  describe('createMagicSkillProgress', () => {
    it('creates empty progress with paradigm ID', () => {
      const progress = createMagicSkillProgress('shinto');
      expect(progress.paradigmId).toBe('shinto');
      expect(progress.treeVersion).toBe(1);
      expect(progress.unlockedNodes).toEqual({});
      expect(progress.totalXpEarned).toBe(0);
      expect(progress.availableXp).toBe(0);
      expect(progress.discoveries).toEqual({});
      expect(progress.relationships).toEqual({});
      expect(progress.milestones).toEqual({});
    });

    it('accepts custom tree version', () => {
      const progress = createMagicSkillProgress('allomancy', 3);
      expect(progress.treeVersion).toBe(3);
    });
  });

  describe('createUnlockCondition', () => {
    it('creates a condition with required fields', () => {
      const condition = createUnlockCondition(
        'skill_level',
        { skillId: 'farming', skillLevel: 3 },
        'Must have Farming level 3'
      );
      expect(condition.type).toBe('skill_level');
      expect(condition.params.skillId).toBe('farming');
      expect(condition.params.skillLevel).toBe(3);
      expect(condition.description).toBe('Must have Farming level 3');
    });

    it('creates condition with optional fields', () => {
      const condition = createUnlockCondition(
        'rune_discovered',
        { runeId: 'fehu' },
        'Must have discovered the Fehu rune',
        { hidden: true, bypassable: true, bypassCost: 500 }
      );
      expect(condition.hidden).toBe(true);
      expect(condition.bypassable).toBe(true);
      expect(condition.bypassCost).toBe(500);
    });
  });

  describe('createSkillNode', () => {
    it('creates a node with defaults', () => {
      const node = createSkillNode(
        'basic-alar',
        'Basic Alar',
        'sympathy',
        'foundation',
        0,
        100,
        [createSkillEffect('alar_strength', 1)]
      );
      expect(node.id).toBe('basic-alar');
      expect(node.name).toBe('Basic Alar');
      expect(node.paradigmId).toBe('sympathy');
      expect(node.category).toBe('foundation');
      expect(node.tier).toBe(0);
      expect(node.xpCost).toBe(100);
      expect(node.maxLevel).toBe(1);
      expect(node.conditionMode).toBe('all');
    });
  });

  describe('createSkillEffect', () => {
    it('creates effect with base value', () => {
      const effect = createSkillEffect('technique_proficiency', 5);
      expect(effect.type).toBe('technique_proficiency');
      expect(effect.baseValue).toBe(5);
      expect(effect.perLevelValue).toBeUndefined();
    });

    it('creates effect with per-level scaling', () => {
      const effect = createSkillEffect('resource_max', 10, {
        perLevelValue: 5,
        target: { resourceType: 'mana' },
      });
      expect(effect.baseValue).toBe(10);
      expect(effect.perLevelValue).toBe(5);
      expect(effect.target?.resourceType).toBe('mana');
    });
  });

  describe('createSkillTree', () => {
    it('auto-detects entry nodes', () => {
      const nodes = [
        createTestNode('node-a', 'test', { tier: 0 }),
        createTestNode('node-b', 'test', { tier: 1, prerequisites: ['node-a'] }),
      ];
      const tree = createTestTree(nodes);
      expect(tree.entryNodes).toContain('node-a');
      expect(tree.entryNodes).not.toContain('node-b');
    });

    it('auto-generates connections from prerequisites', () => {
      const nodes = [
        createTestNode('node-a'),
        createTestNode('node-b', 'test-paradigm', { prerequisites: ['node-a'] }),
      ];
      const tree = createTestTree(nodes);
      expect(tree.connections).toContainEqual({ from: 'node-a', to: 'node-b' });
    });

    it('calculates total XP required', () => {
      const nodes = [
        createTestNode('node-a', 'test', { xpCost: 100, maxLevel: 1 }),
        createTestNode('node-b', 'test', { xpCost: 200, maxLevel: 2 }),
      ];
      const tree = createTestTree(nodes);
      // node-a: 100
      // node-b: 200 (level 1) + 200 (level 2) = 400
      expect(tree.totalXpRequired).toBe(500);
    });
  });
});

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe('MagicSkillTree Utility Functions', () => {
  const nodes = [
    createTestNode('foundation-1', 'test', { tier: 0, category: 'foundation' }),
    createTestNode('foundation-2', 'test', { tier: 0, category: 'foundation' }),
    createTestNode('technique-1', 'test', { tier: 1, category: 'technique' }),
    createTestNode('mastery-1', 'test', { tier: 2, category: 'mastery' }),
  ];
  const tree = createTestTree(nodes);

  describe('getNodeById', () => {
    it('finds node by ID', () => {
      const node = getNodeById(tree, 'technique-1');
      expect(node?.name).toBe('Test Node technique-1');
    });

    it('returns undefined for unknown ID', () => {
      expect(getNodeById(tree, 'unknown')).toBeUndefined();
    });
  });

  describe('getNodesByTier', () => {
    it('returns nodes at specified tier', () => {
      const tier0 = getNodesByTier(tree, 0);
      expect(tier0).toHaveLength(2);
      expect(tier0.map(n => n.id)).toContain('foundation-1');
      expect(tier0.map(n => n.id)).toContain('foundation-2');
    });

    it('returns empty array for empty tier', () => {
      expect(getNodesByTier(tree, 5)).toHaveLength(0);
    });
  });

  describe('getNodesByCategory', () => {
    it('returns nodes in category', () => {
      const foundations = getNodesByCategory(tree, 'foundation');
      expect(foundations).toHaveLength(2);
    });
  });

  describe('getNodeLevelCost', () => {
    it('returns base cost for level 0', () => {
      const node = createTestNode('test', 'test', { xpCost: 100 });
      expect(getNodeLevelCost(node, 0)).toBe(100);
    });

    it('returns scaled cost with multiplier', () => {
      const node = createTestNode('test', 'test', {
        xpCost: 100,
        maxLevel: 3,
        levelCostMultiplier: 2,
      });
      expect(getNodeLevelCost(node, 0)).toBe(100);
      expect(getNodeLevelCost(node, 1)).toBe(200);
      expect(getNodeLevelCost(node, 2)).toBe(400);
    });

    it('returns Infinity when at max level', () => {
      const node = createTestNode('test', 'test', { maxLevel: 1 });
      expect(getNodeLevelCost(node, 1)).toBe(Infinity);
    });
  });

  describe('getEffectValue', () => {
    it('returns base value at level 1', () => {
      const effect = createSkillEffect('resource_max', 10, { perLevelValue: 5 });
      expect(getEffectValue(effect, 1)).toBe(10);
    });

    it('scales with level', () => {
      const effect = createSkillEffect('resource_max', 10, { perLevelValue: 5 });
      expect(getEffectValue(effect, 3)).toBe(20); // 10 + 5 * 2
    });

    it('returns 0 for level 0', () => {
      const effect = createSkillEffect('resource_max', 10);
      expect(getEffectValue(effect, 0)).toBe(0);
    });
  });

  describe('progress tracking utilities', () => {
    const progress: MagicSkillProgress = {
      paradigmId: 'test',
      treeVersion: 1,
      unlockedNodes: { 'node-a': 2, 'node-b': 1 },
      totalXpEarned: 500,
      availableXp: 200,
      discoveries: {},
      relationships: {},
      milestones: {},
    };

    it('hasNodeUnlocked checks if node is unlocked', () => {
      expect(hasNodeUnlocked(progress, 'node-a')).toBe(true);
      expect(hasNodeUnlocked(progress, 'node-c')).toBe(false);
    });

    it('getNodeLevel returns current level', () => {
      expect(getNodeLevel(progress, 'node-a')).toBe(2);
      expect(getNodeLevel(progress, 'node-c')).toBe(0);
    });

    it('countUnlockedNodes counts unlocked nodes', () => {
      expect(countUnlockedNodes(progress)).toBe(2);
    });

    it('calculateSpentXp returns spent XP', () => {
      expect(calculateSpentXp(progress)).toBe(300); // 500 - 200
    });
  });
});

// ============================================================================
// Condition Evaluator Tests
// ============================================================================

describe('MagicSkillTreeEvaluator', () => {
  describe('evaluateCondition', () => {
    describe('skill_level condition', () => {
      it('returns met when skill level is sufficient', () => {
        const condition = createUnlockCondition(
          'skill_level',
          { skillId: 'farming', skillLevel: 2 },
          'Requires Farming 2'
        );
        const context = createTestContext(createMagicSkillProgress('test'), {
          skillsComponent: { levels: { farming: 3 } },
        });
        const result = evaluateCondition(condition, context);
        expect(result.met).toBe(true);
        expect(result.currentValue).toBe(3);
      });

      it('returns not met when skill level is insufficient', () => {
        const condition = createUnlockCondition(
          'skill_level',
          { skillId: 'farming', skillLevel: 3 },
          'Requires Farming 3'
        );
        const context = createTestContext(createMagicSkillProgress('test'), {
          skillsComponent: { levels: { farming: 1 } },
        });
        const result = evaluateCondition(condition, context);
        expect(result.met).toBe(false);
        expect(result.progress).toBeCloseTo(0.333, 2);
      });
    });

    describe('node_unlocked condition', () => {
      it('returns met when prerequisite node is unlocked', () => {
        const condition = createUnlockCondition(
          'node_unlocked',
          { nodeId: 'basic-alar' },
          'Requires Basic Alar'
        );
        const progress = createMagicSkillProgress('test');
        progress.unlockedNodes['basic-alar'] = 1;
        const context = createTestContext(progress);
        const result = evaluateCondition(condition, context);
        expect(result.met).toBe(true);
      });

      it('returns not met when prerequisite is not unlocked', () => {
        const condition = createUnlockCondition(
          'node_unlocked',
          { nodeId: 'basic-alar' },
          'Requires Basic Alar'
        );
        const context = createTestContext(createMagicSkillProgress('test'));
        const result = evaluateCondition(condition, context);
        expect(result.met).toBe(false);
      });
    });

    describe('bloodline condition', () => {
      it('returns met when agent has bloodline', () => {
        const condition = createUnlockCondition(
          'bloodline',
          { bloodlineId: 'mistborn', bloodlineStrength: 0.5 },
          'Requires Mistborn bloodline'
        );
        const context = createTestContext(createMagicSkillProgress('test'), {
          custom: { bloodlines: { mistborn: 1.0 } },
        });
        const result = evaluateCondition(condition, context);
        expect(result.met).toBe(true);
        expect(result.currentValue).toBe(1.0);
      });

      it('returns not met when bloodline is too weak', () => {
        const condition = createUnlockCondition(
          'bloodline',
          { bloodlineId: 'mistborn', bloodlineStrength: 1.0 },
          'Requires full Mistborn bloodline'
        );
        const context = createTestContext(createMagicSkillProgress('test'), {
          custom: { bloodlines: { mistborn: 0.3 } },
        });
        const result = evaluateCondition(condition, context);
        expect(result.met).toBe(false);
        expect(result.progress).toBeCloseTo(0.3);
      });
    });

    describe('rune_discovered condition', () => {
      it('returns met when rune is discovered', () => {
        const condition = createUnlockCondition(
          'rune_discovered',
          { runeId: 'fehu' },
          'Must discover Fehu rune'
        );
        const progress = createMagicSkillProgress('test');
        progress.discoveries.runes = ['fehu', 'uruz'];
        const context = createTestContext(progress);
        const result = evaluateCondition(condition, context);
        expect(result.met).toBe(true);
      });

      it('marks hidden conditions as hidden when not met', () => {
        const condition = createUnlockCondition(
          'rune_discovered',
          { runeId: 'secret-rune' },
          'Must discover the secret rune',
          { hidden: true }
        );
        const context = createTestContext(createMagicSkillProgress('test'));
        const result = evaluateCondition(condition, context);
        expect(result.met).toBe(false);
        expect(result.hidden).toBe(true);
      });
    });

    describe('time_of_day condition', () => {
      it('returns met during valid time range', () => {
        const condition = createUnlockCondition(
          'time_of_day',
          { timeRange: { start: 0, end: 6 } },
          'Only available at night'
        );
        const context = createTestContext(createMagicSkillProgress('test'), {
          gameTime: { hour: 3, day: 1, season: 'winter', moonPhase: 'full' },
        });
        const result = evaluateCondition(condition, context);
        expect(result.met).toBe(true);
      });

      it('returns not met outside time range', () => {
        const condition = createUnlockCondition(
          'time_of_day',
          { timeRange: { start: 0, end: 6 } },
          'Only available at night'
        );
        const context = createTestContext(createMagicSkillProgress('test'), {
          gameTime: { hour: 12, day: 1, season: 'winter', moonPhase: 'full' },
        });
        const result = evaluateCondition(condition, context);
        expect(result.met).toBe(false);
      });
    });

    describe('xp_accumulated condition', () => {
      it('returns met when enough XP earned', () => {
        const condition = createUnlockCondition(
          'xp_accumulated',
          { xpRequired: 500 },
          'Must have earned 500 XP'
        );
        const progress = createMagicSkillProgress('test');
        progress.totalXpEarned = 750;
        const context = createTestContext(progress);
        const result = evaluateCondition(condition, context);
        expect(result.met).toBe(true);
      });
    });
  });

  describe('evaluateNode', () => {
    it('evaluates all conditions', () => {
      const node = createTestNode('advanced-node', 'test', {
        unlockConditions: [
          createUnlockCondition('skill_level', { skillId: 'farming', skillLevel: 2 }, 'Need Farming 2'),
          createUnlockCondition('xp_accumulated', { xpRequired: 100 }, 'Need 100 XP'),
        ],
        conditionMode: 'all',
      });
      const tree = createTestTree([node]);
      const progress = createMagicSkillProgress('test');
      progress.totalXpEarned = 150;
      progress.availableXp = 150;
      const context = createTestContext(progress, {
        skillsComponent: { levels: { farming: 3 } },
      });
      const result = evaluateNode(node, tree, context);
      expect(result.canUnlock).toBe(true);
      expect(result.metConditions).toHaveLength(2);
    });

    it('respects conditionMode any', () => {
      const node = createTestNode('flexible-node', 'test', {
        unlockConditions: [
          createUnlockCondition('skill_level', { skillId: 'farming', skillLevel: 5 }, 'Need Farming 5'),
          createUnlockCondition('xp_accumulated', { xpRequired: 100 }, 'Need 100 XP'),
        ],
        conditionMode: 'any',
      });
      const tree = createTestTree([node]);
      const progress = createMagicSkillProgress('test');
      progress.totalXpEarned = 150;
      progress.availableXp = 150;
      const context = createTestContext(progress, {
        skillsComponent: { levels: { farming: 2 } },
      });
      const result = evaluateNode(node, tree, context);
      expect(result.canUnlock).toBe(true);
      expect(result.metConditions).toHaveLength(1);
      expect(result.unmetConditions).toHaveLength(1);
    });

    it('checks XP availability for canPurchase', () => {
      const node = createTestNode('expensive-node', 'test', { xpCost: 200 });
      const tree = createTestTree([node]);
      const progress = createMagicSkillProgress('test');
      progress.availableXp = 100;
      const context = createTestContext(progress);
      const result = evaluateNode(node, tree, context);
      expect(result.canUnlock).toBe(true);
      expect(result.canPurchase).toBe(false);
      expect(result.xpCost).toBe(200);
      expect(result.availableXp).toBe(100);
    });

    it('respects maxLevel', () => {
      const node = createTestNode('limited-node', 'test', { maxLevel: 2, xpCost: 50 });
      const tree = createTestTree([node]);
      const progress = createMagicSkillProgress('test');
      progress.unlockedNodes['limited-node'] = 2;
      progress.availableXp = 100;
      const context = createTestContext(progress);
      const result = evaluateNode(node, tree, context);
      expect(result.canUnlock).toBe(false);
      expect(result.currentLevel).toBe(2);
      expect(result.maxLevel).toBe(2);
    });
  });

  describe('evaluateTree', () => {
    it('evaluates all nodes in tree', () => {
      const nodes = [
        createTestNode('node-1'),
        createTestNode('node-2'),
        createTestNode('node-3'),
      ];
      const tree = createTestTree(nodes);
      const progress = createMagicSkillProgress('test');
      progress.availableXp = 500;
      const context = createTestContext(progress);
      const results = evaluateTree(tree, context);
      expect(results.size).toBe(3);
      expect(results.get('node-1')?.canPurchase).toBe(true);
    });
  });

  describe('getPurchasableNodes', () => {
    it('returns only purchasable nodes', () => {
      const nodes = [
        createTestNode('cheap', 'test', { xpCost: 50 }),
        createTestNode('expensive', 'test', { xpCost: 500 }),
      ];
      const tree = createTestTree(nodes);
      const progress = createMagicSkillProgress('test');
      progress.availableXp = 100;
      const context = createTestContext(progress);
      const purchasable = getPurchasableNodes(tree, context);
      expect(purchasable).toHaveLength(1);
      expect(purchasable[0].id).toBe('cheap');
    });
  });

  describe('canAccessTree', () => {
    it('returns true for trees without innate requirement', () => {
      const tree = createTestTree([createTestNode('node')], {
        rules: createDefaultTreeRules(false),
      });
      const context = createTestContext(createMagicSkillProgress('test'));
      const result = canAccessTree(tree, context);
      expect(result.canAccess).toBe(true);
    });

    it('checks innate condition when required', () => {
      const tree = createTestTree([createTestNode('node')], {
        rules: {
          ...createDefaultTreeRules(true),
          innateCondition: createUnlockCondition(
            'bloodline',
            { bloodlineId: 'mistborn' },
            'Must be Mistborn'
          ),
        },
      });
      const context = createTestContext(createMagicSkillProgress('test'));
      const result = canAccessTree(tree, context);
      expect(result.canAccess).toBe(false);
      expect(result.reason).toContain('bloodline');
    });
  });
});

// ============================================================================
// Registry Tests
// ============================================================================

describe('MagicSkillTreeRegistry', () => {
  beforeEach(() => {
    MagicSkillTreeRegistry.resetInstance();
  });

  describe('singleton', () => {
    it('returns same instance', () => {
      const instance1 = MagicSkillTreeRegistry.getInstance();
      const instance2 = MagicSkillTreeRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('resetInstance creates new instance', () => {
      const instance1 = MagicSkillTreeRegistry.getInstance();
      MagicSkillTreeRegistry.resetInstance();
      const instance2 = MagicSkillTreeRegistry.getInstance();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('registration', () => {
    it('registers valid tree', () => {
      const registry = getSkillTreeRegistry();
      const tree = createTestTree([createTestNode('node')], { paradigmId: 'shinto' });
      registry.register(tree);
      expect(registry.hasTree('shinto')).toBe(true);
    });

    it('throws on invalid tree', () => {
      const registry = getSkillTreeRegistry();
      const invalidTree = { nodes: [] } as unknown as MagicSkillTree;
      expect(() => registry.register(invalidTree)).toThrow();
    });

    it('throws on version conflict', () => {
      const registry = getSkillTreeRegistry();
      const tree1 = createTestTree([createTestNode('node')], {
        paradigmId: 'test',
        version: 2,
      });
      const tree2 = createTestTree([createTestNode('node')], {
        paradigmId: 'test',
        version: 1,
      });
      registry.register(tree1);
      expect(() => registry.register(tree2)).toThrow(/version/);
    });
  });

  describe('lookup', () => {
    it('getTree returns registered tree', () => {
      const registry = getSkillTreeRegistry();
      const tree = createTestTree([createTestNode('node')], { paradigmId: 'sympathy' });
      registry.register(tree);
      expect(registry.getTree('sympathy')).toBe(tree);
    });

    it('getTreeOrThrow throws for unknown paradigm', () => {
      const registry = getSkillTreeRegistry();
      expect(() => registry.getTreeOrThrow('unknown')).toThrow(/unknown/);
    });

    it('getNode finds node in tree', () => {
      const registry = getSkillTreeRegistry();
      const node = createTestNode('special-node', 'test');
      const tree = createTestTree([node]);
      registry.register(tree);
      expect(registry.getNode('test-paradigm', 'special-node')).toBe(node);
    });

    it('findNodesByCategory finds across trees', () => {
      const registry = getSkillTreeRegistry();
      const tree1 = createTestTree(
        [createTestNode('node1', 'tree1', { category: 'foundation' })],
        { id: 'tree1', paradigmId: 'paradigm1' }
      );
      const tree2 = createTestTree(
        [createTestNode('node2', 'tree2', { category: 'foundation' })],
        { id: 'tree2', paradigmId: 'paradigm2' }
      );
      registry.register(tree1);
      registry.register(tree2);
      const foundations = registry.findNodesByCategory('foundation');
      expect(foundations).toHaveLength(2);
    });
  });

  describe('validation', () => {
    it('detects duplicate node IDs', () => {
      const registry = getSkillTreeRegistry();
      const tree = {
        id: 'test',
        paradigmId: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          createTestNode('duplicate'),
          createTestNode('duplicate'),
        ],
        entryNodes: ['duplicate'],
        connections: [],
        xpSources: [],
        rules: createDefaultTreeRules(),
        version: 1,
      };
      const result = registry.validate(tree);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Duplicate'))).toBe(true);
    });

    it('detects missing prerequisite references', () => {
      const registry = getSkillTreeRegistry();
      const tree = createTestTree([
        createTestNode('node', 'test', { prerequisites: ['nonexistent'] }),
      ]);
      const result = registry.validate(tree);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('nonexistent'))).toBe(true);
    });

    it('detects cycles in prerequisites', () => {
      const registry = getSkillTreeRegistry();
      const tree = {
        id: 'test',
        paradigmId: 'test',
        name: 'Test',
        description: 'Test',
        nodes: [
          createTestNode('node-a', 'test', { prerequisites: ['node-b'] }),
          createTestNode('node-b', 'test', { prerequisites: ['node-a'] }),
        ],
        entryNodes: [],
        connections: [],
        xpSources: [],
        rules: createDefaultTreeRules(),
        version: 1,
      };
      const result = registry.validate(tree);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('Cycle'))).toBe(true);
    });
  });

  describe('statistics', () => {
    it('getTreeStats returns stats', () => {
      const registry = getSkillTreeRegistry();
      const tree = createTestTree([
        createTestNode('f1', 'test', { tier: 0, category: 'foundation' }),
        createTestNode('f2', 'test', { tier: 0, category: 'foundation' }),
        createTestNode('t1', 'test', { tier: 1, category: 'technique' }),
      ]);
      registry.register(tree);
      const stats = registry.getTreeStats('test-paradigm');
      expect(stats?.totalNodes).toBe(3);
      expect(stats?.nodesByCategory['foundation']).toBe(2);
      expect(stats?.nodesByCategory['technique']).toBe(1);
      expect(stats?.nodesByTier[0]).toBe(2);
      expect(stats?.nodesByTier[1]).toBe(1);
      expect(stats?.maxTier).toBe(1);
    });
  });

  describe('convenience functions', () => {
    it('registerSkillTree uses global registry', () => {
      const tree = createTestTree([createTestNode('node')], { paradigmId: 'global-test' });
      registerSkillTree(tree);
      expect(hasSkillTree('global-test')).toBe(true);
      expect(getSkillTree('global-test')).toBe(tree);
    });
  });
});
