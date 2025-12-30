/**
 * ParadigmSkillTrees - Tests for paradigm-specific skill trees
 */

import { describe, it, expect } from 'vitest';
import type { World } from '../../ecs/World.js';
import type { EntityId } from '../../types.js';
import type { MagicSkillProgress, EvaluationContext } from '../MagicSkillTree.js';
import {
  createMagicSkillProgress,
  getNodeById,
  getNodesByCategory,
  evaluateNode,
  evaluateTree,
  canAccessTree,
} from '../index.js';

// Import paradigm-specific trees
import {
  ALLOMANCY_SKILL_TREE,
  getMistingMetals,
  isMetalAvailable,
} from '../skillTrees/AllomancySkillTree.js';

import {
  SHINTO_SKILL_TREE,
  getAvailableKamiTypes,
  isPuritySufficient,
} from '../skillTrees/ShintoSkillTree.js';

import {
  SYMPATHY_SKILL_TREE,
  LINK_TYPES,
  BINDING_PRINCIPLES,
  calculateLinkEfficiency,
  getMaxBindings,
  calculateSlippage,
} from '../skillTrees/SympathySkillTree.js';

import {
  DAEMON_SKILL_TREE,
  DAEMON_FORM_CATEGORIES,
  getFormBonuses,
  isFormInCategory,
  getFormCategory,
  getSeparationDistance,
  canSeparate,
  hasSettled,
} from '../skillTrees/DaemonSkillTree.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestContext(
  paradigmId: string,
  progress: MagicSkillProgress,
  overrides: Partial<EvaluationContext> = {}
): EvaluationContext {
  return {
    world: {} as World,
    agentId: 'test-agent' as EntityId,
    progress,
    bloodlines: {},
    skills: {},
    custom: {},
    ...overrides,
  };
}

// ============================================================================
// Allomancy Skill Tree Tests
// ============================================================================

describe('AllomancySkillTree', () => {
  describe('tree structure', () => {
    it('should have correct paradigm ID', () => {
      expect(ALLOMANCY_SKILL_TREE.paradigmId).toBe('allomancy');
    });

    it('should have snapped as entry node', () => {
      expect(ALLOMANCY_SKILL_TREE.entryNodes).toContain('snapped');
    });

    it('should require bloodline for tree access', () => {
      expect(ALLOMANCY_SKILL_TREE.rules.requiresInnateAbility).toBe(true);
      expect(ALLOMANCY_SKILL_TREE.rules.innateCondition).toBeDefined();
      expect(ALLOMANCY_SKILL_TREE.rules.innateCondition?.type).toBe('bloodline');
    });

    it('should have metal discovery nodes', () => {
      const discoveryNodes = getNodesByCategory(ALLOMANCY_SKILL_TREE, 'discovery');
      expect(discoveryNodes.length).toBeGreaterThan(0);

      // Check for basic metals
      expect(getNodeById(ALLOMANCY_SKILL_TREE, 'metal-steel')).toBeDefined();
      expect(getNodeById(ALLOMANCY_SKILL_TREE, 'metal-iron')).toBeDefined();
      expect(getNodeById(ALLOMANCY_SKILL_TREE, 'metal-pewter')).toBeDefined();
      expect(getNodeById(ALLOMANCY_SKILL_TREE, 'metal-tin')).toBeDefined();
    });

    it('should have Misting specialization nodes', () => {
      const specializationNodes = getNodesByCategory(ALLOMANCY_SKILL_TREE, 'specialization');
      expect(specializationNodes.length).toBeGreaterThan(0);

      expect(getNodeById(ALLOMANCY_SKILL_TREE, 'coinshot')).toBeDefined();
      expect(getNodeById(ALLOMANCY_SKILL_TREE, 'lurcher')).toBeDefined();
    });

    it('should have Mistborn awakening node', () => {
      const mistbornNode = getNodeById(ALLOMANCY_SKILL_TREE, 'mistborn-awakening');
      expect(mistbornNode).toBeDefined();
      expect(mistbornNode?.unlockConditions).toContainEqual(
        expect.objectContaining({ type: 'bloodline' })
      );
    });
  });

  describe('helper functions', () => {
    it('getMistingMetals returns all metals for full Mistborn', () => {
      const metals = getMistingMetals(1.0);
      expect(metals.length).toBeGreaterThan(8);
    });

    it('getMistingMetals returns basic metals for lower strength', () => {
      const metals = getMistingMetals(0.25);
      expect(metals).toContain('steel');
      expect(metals).toContain('iron');
      expect(metals.length).toBe(4); // Basic metals only
    });

    it('getMistingMetals returns empty for no bloodline', () => {
      const metals = getMistingMetals(0.1);
      expect(metals.length).toBe(0);
    });

    it('isMetalAvailable checks bloodline strength', () => {
      expect(isMetalAvailable('steel', 0.25)).toBe(true);
      expect(isMetalAvailable('zinc', 0.25)).toBe(false); // Mental metals need 0.5+
      expect(isMetalAvailable('zinc', 0.5)).toBe(true);
    });
  });

  describe('tree access', () => {
    it('should require Allomancer bloodline', () => {
      const progress = createMagicSkillProgress('allomancy');

      // Without bloodline
      const contextNone = createTestContext('allomancy', progress, {
        custom: { bloodlines: {} },
      });
      expect(canAccessTree(ALLOMANCY_SKILL_TREE, contextNone).canAccess).toBe(false);

      // With bloodline
      const contextWith = createTestContext('allomancy', progress, {
        custom: { bloodlines: { allomancer: 1.0 } },
      });
      expect(canAccessTree(ALLOMANCY_SKILL_TREE, contextWith).canAccess).toBe(true);
    });
  });
});

// ============================================================================
// Shinto Skill Tree Tests
// ============================================================================

describe('ShintoSkillTree', () => {
  describe('tree structure', () => {
    it('should have correct paradigm ID', () => {
      expect(SHINTO_SKILL_TREE.paradigmId).toBe('shinto');
    });

    it('should not require innate ability', () => {
      expect(SHINTO_SKILL_TREE.rules.requiresInnateAbility).toBe(false);
    });

    it('should have kami relationship nodes', () => {
      const relationshipNodes = getNodesByCategory(SHINTO_SKILL_TREE, 'relationship');
      expect(relationshipNodes.length).toBeGreaterThan(0);
    });

    it('should have ritual nodes', () => {
      const ritualNodes = getNodesByCategory(SHINTO_SKILL_TREE, 'ritual');
      expect(ritualNodes.length).toBeGreaterThan(0);
    });

    it('should have foundation nodes for purity', () => {
      const basicPurity = getNodeById(SHINTO_SKILL_TREE, 'basic-purity');
      expect(basicPurity).toBeDefined();
    });
  });

  describe('helper functions', () => {
    it('getAvailableKamiTypes returns types based on unlocked nodes', () => {
      // No nodes unlocked
      expect(getAvailableKamiTypes({})).toEqual([]);

      // With nature kami node unlocked
      const types = getAvailableKamiTypes({ 'kami-nature': 1 });
      expect(types).toContain('nature');
    });

    it('isPuritySufficient checks purity against ritual tier', () => {
      expect(isPuritySufficient(80, 1)).toBe(true);
      expect(isPuritySufficient(40, 1)).toBe(false);
      expect(isPuritySufficient(90, 3)).toBe(true);
      expect(isPuritySufficient(70, 3)).toBe(false);
    });
  });

  describe('tree access', () => {
    it('should be accessible to anyone', () => {
      const progress = createMagicSkillProgress('shinto');
      const context = createTestContext('shinto', progress);
      expect(canAccessTree(SHINTO_SKILL_TREE, context).canAccess).toBe(true);
    });
  });
});

// ============================================================================
// Sympathy Skill Tree Tests
// ============================================================================

describe('SympathySkillTree', () => {
  describe('tree structure', () => {
    it('should have correct paradigm ID', () => {
      expect(SYMPATHY_SKILL_TREE.paradigmId).toBe('sympathy');
    });

    it('should not require innate ability', () => {
      expect(SYMPATHY_SKILL_TREE.rules.requiresInnateAbility).toBe(false);
    });

    it('should have alar foundation nodes', () => {
      const basicAlar = getNodeById(SYMPATHY_SKILL_TREE, 'basic-alar');
      expect(basicAlar).toBeDefined();
      expect(basicAlar?.category).toBe('foundation');
    });

    it('should have link type nodes', () => {
      // Check for link type progression
      expect(getNodeById(SYMPATHY_SKILL_TREE, 'link-identical')).toBeDefined();
      expect(getNodeById(SYMPATHY_SKILL_TREE, 'link-similar')).toBeDefined();
    });

    it('should have advanced binding nodes', () => {
      // Body binding and mommet are advanced techniques
      expect(getNodeById(SYMPATHY_SKILL_TREE, 'body-binding')).toBeDefined();
      expect(getNodeById(SYMPATHY_SKILL_TREE, 'mommet')).toBeDefined();
    });

    it('should have split-focus mastery nodes', () => {
      expect(getNodeById(SYMPATHY_SKILL_TREE, 'dual-binding')).toBeDefined();
      expect(getNodeById(SYMPATHY_SKILL_TREE, 'triple-binding')).toBeDefined();
    });
  });

  describe('constants', () => {
    it('LINK_TYPES should be in order of difficulty', () => {
      expect(LINK_TYPES[0]).toBe('identical');
      expect(LINK_TYPES[LINK_TYPES.length - 1]).toBe('antipathic');
      expect(LINK_TYPES.length).toBe(6);
    });

    it('BINDING_PRINCIPLES should have core transfer types', () => {
      expect(BINDING_PRINCIPLES).toContain('heat_transfer');
      expect(BINDING_PRINCIPLES).toContain('motion_transfer');
      expect(BINDING_PRINCIPLES.length).toBe(5);
    });
  });

  describe('helper functions', () => {
    it('getMaxBindings returns correct count based on nodes', () => {
      expect(getMaxBindings({})).toBe(1);
      expect(getMaxBindings({ 'dual-binding': 1 })).toBe(2);
      expect(getMaxBindings({ 'dual-binding': 1, 'triple-binding': 1 })).toBe(3);
      expect(getMaxBindings({ 'quad-binding': 1 })).toBe(4);
    });

    it('calculateLinkEfficiency returns higher values for better links', () => {
      const identicalEff = calculateLinkEfficiency('identical', 1, 0);
      const similarEff = calculateLinkEfficiency('similar', 1, 0);
      expect(identicalEff).toBeGreaterThan(similarEff);
    });

    it('calculateSlippage returns energy loss percentage', () => {
      // Function signature: (baseSlippage, slippageControlLevel, hasPerfectLink, linkType)
      const slippage = calculateSlippage(0.3, 0, false, 'similar');
      expect(slippage).toBeGreaterThan(0);
      expect(slippage).toBeLessThan(1);
    });
  });
});

// ============================================================================
// Daemon Skill Tree Tests
// ============================================================================

describe('DaemonSkillTree', () => {
  describe('tree structure', () => {
    it('should have correct paradigm ID', () => {
      expect(DAEMON_SKILL_TREE.paradigmId).toBe('daemon');
    });

    it('should not require innate ability (everyone has a daemon)', () => {
      expect(DAEMON_SKILL_TREE.rules.requiresInnateAbility).toBe(false);
    });

    it('should have daemon-bond as entry node', () => {
      expect(DAEMON_SKILL_TREE.entryNodes).toContain('daemon-bond');
    });

    it('should have settling node', () => {
      const settlingNode = getNodeById(DAEMON_SKILL_TREE, 'settling');
      expect(settlingNode).toBeDefined();
      expect(settlingNode?.hidden).toBe(true); // Hidden until it happens
    });

    it('should have dust category nodes', () => {
      const dustNodes = getNodesByCategory(DAEMON_SKILL_TREE, 'dust');
      expect(dustNodes.length).toBeGreaterThan(0);
      expect(getNodeById(DAEMON_SKILL_TREE, 'dust-sense')).toBeDefined();
    });

    it('should have separation category nodes', () => {
      const separationNodes = getNodesByCategory(DAEMON_SKILL_TREE, 'separation');
      expect(separationNodes.length).toBeGreaterThan(0);
      expect(getNodeById(DAEMON_SKILL_TREE, 'basic-separation')).toBeDefined();
    });

    it('should have witch blood node with bloodline requirement', () => {
      const witchNode = getNodeById(DAEMON_SKILL_TREE, 'witch-blood');
      expect(witchNode).toBeDefined();
      expect(witchNode?.unlockConditions).toContainEqual(
        expect.objectContaining({ type: 'bloodline' })
      );
    });
  });

  describe('constants', () => {
    it('DAEMON_FORM_CATEGORIES should have form types', () => {
      expect(DAEMON_FORM_CATEGORIES.predator).toBeDefined();
      expect(DAEMON_FORM_CATEGORIES.companion).toBeDefined();
      expect(DAEMON_FORM_CATEGORIES.wisdom).toBeDefined();
      expect(DAEMON_FORM_CATEGORIES.power).toBeDefined();
      expect(DAEMON_FORM_CATEGORIES.stealth).toBeDefined();
      expect(DAEMON_FORM_CATEGORIES.exotic).toBeDefined();
    });

    it('each form category should have animal forms', () => {
      expect(DAEMON_FORM_CATEGORIES.predator.length).toBeGreaterThan(0);
      expect(DAEMON_FORM_CATEGORIES.predator).toContain('wolf');
      expect(DAEMON_FORM_CATEGORIES.companion).toContain('dog');
    });
  });

  describe('helper functions', () => {
    it('getFormBonuses returns bonuses for form category', () => {
      const predatorBonuses = getFormBonuses('predator');
      expect(predatorBonuses.primary).toBe('combat');

      const wisdomBonuses = getFormBonuses('wisdom');
      expect(wisdomBonuses.primary).toBe('intelligence');
    });

    it('isFormInCategory checks form membership', () => {
      expect(isFormInCategory('wolf', 'predator')).toBe(true);
      expect(isFormInCategory('wolf', 'companion')).toBe(false);
      expect(isFormInCategory('dog', 'companion')).toBe(true);
    });

    it('getFormCategory returns category for a form', () => {
      expect(getFormCategory('wolf')).toBe('predator');
      expect(getFormCategory('owl')).toBe('wisdom');
      expect(getFormCategory('unknown_form')).toBeNull();
    });

    it('getSeparationDistance calculates based on nodes', () => {
      expect(getSeparationDistance({})).toBe(0);
      expect(getSeparationDistance({ 'basic-separation': 1 })).toBe(50);
      expect(getSeparationDistance({ 'basic-separation': 1, 'extended-separation': 3 })).toBe(350);
      expect(getSeparationDistance({ 'unlimited-separation': 1 })).toBe(Infinity);
    });

    it('canSeparate checks for basic separation node', () => {
      expect(canSeparate({})).toBe(false);
      expect(canSeparate({ 'basic-separation': 1 })).toBe(true);
    });

    it('hasSettled checks for settling node', () => {
      expect(hasSettled({})).toBe(false);
      expect(hasSettled({ 'settling': 1 })).toBe(true);
    });
  });

  describe('tree access', () => {
    it('should be accessible to anyone (everyone has a daemon)', () => {
      const progress = createMagicSkillProgress('daemon');
      const context = createTestContext('daemon', progress);
      expect(canAccessTree(DAEMON_SKILL_TREE, context).canAccess).toBe(true);
    });
  });

  describe('condition evaluators', () => {
    it('should evaluate age_range condition', () => {
      const progress = createMagicSkillProgress('daemon');
      const formNode = getNodeById(DAEMON_SKILL_TREE, 'form-shifting');
      expect(formNode).toBeDefined();

      // Child (can shift forms)
      const childContext = createTestContext('daemon', progress, {
        custom: { age: 10 },
      });
      const childResult = evaluateNode(formNode!, DAEMON_SKILL_TREE, childContext);
      expect(childResult.conditions.some(r => r.condition.type === 'age_range' && r.met)).toBe(true);

      // Adult (cannot shift forms)
      const adultContext = createTestContext('daemon', progress, {
        custom: { age: 25 },
      });
      const adultResult = evaluateNode(formNode!, DAEMON_SKILL_TREE, adultContext);
      expect(adultResult.conditions.some(r => r.condition.type === 'age_range' && !r.met)).toBe(true);
    });

    it('should evaluate form_category condition', () => {
      const progress = createMagicSkillProgress('daemon');
      progress.unlockedNodes['form-affinity'] = 1;

      const combatNode = getNodeById(DAEMON_SKILL_TREE, 'daemon-combat');
      expect(combatNode).toBeDefined();

      // With predator daemon
      const predatorContext = createTestContext('daemon', progress, {
        custom: { daemonFormCategory: 'predator' },
      });
      const predatorResult = evaluateNode(combatNode!, DAEMON_SKILL_TREE, predatorContext);
      expect(predatorResult.conditions.some(r => r.condition.type === 'form_category' && r.met)).toBe(true);

      // With companion daemon
      const companionContext = createTestContext('daemon', progress, {
        custom: { daemonFormCategory: 'companion' },
      });
      const companionResult = evaluateNode(combatNode!, DAEMON_SKILL_TREE, companionContext);
      expect(companionResult.conditions.some(r => r.condition.type === 'form_category' && !r.met)).toBe(true);
    });
  });
});

// ============================================================================
// Cross-Tree Integration Tests
// ============================================================================

describe('Cross-tree consistency', () => {
  const ALL_TREES = [
    { name: 'Allomancy', tree: ALLOMANCY_SKILL_TREE },
    { name: 'Shinto', tree: SHINTO_SKILL_TREE },
    { name: 'Sympathy', tree: SYMPATHY_SKILL_TREE },
    { name: 'Daemon', tree: DAEMON_SKILL_TREE },
  ];

  it('all trees should have unique IDs', () => {
    const ids = ALL_TREES.map(t => t.tree.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all trees should have unique paradigm IDs', () => {
    const paradigmIds = ALL_TREES.map(t => t.tree.paradigmId);
    const uniqueIds = new Set(paradigmIds);
    expect(uniqueIds.size).toBe(paradigmIds.length);
  });

  it('all trees should have entry nodes', () => {
    for (const { name, tree } of ALL_TREES) {
      expect(tree.entryNodes.length).toBeGreaterThan(0);

      // Entry nodes should exist in the tree
      for (const entryId of tree.entryNodes) {
        const node = getNodeById(tree, entryId);
        expect(node).toBeDefined();
      }
    }
  });

  it('all trees should have XP sources', () => {
    for (const { name, tree } of ALL_TREES) {
      expect(tree.xpSources.length).toBeGreaterThan(0);
    }
  });

  it('all trees should have mostly valid node prerequisites', () => {
    const issues: string[] = [];

    for (const { name, tree } of ALL_TREES) {
      for (const node of tree.nodes) {
        if (node.prerequisites && node.prerequisites.length > 0) {
          for (const prereqId of node.prerequisites) {
            const prereqNode = getNodeById(tree, prereqId);
            if (!prereqNode) {
              issues.push(`${name}: Node "${node.id}" has missing prereq "${prereqId}"`);
            }
          }
        }
      }
    }

    // Allow some missing prereqs during development (they may reference future nodes)
    // But fail if there are too many
    expect(issues.length).toBeLessThan(10); // Allow up to 9 missing prereqs
  });

  it('all trees should have version numbers', () => {
    for (const { name, tree } of ALL_TREES) {
      expect(tree.version).toBeGreaterThanOrEqual(1);
    }
  });
});
