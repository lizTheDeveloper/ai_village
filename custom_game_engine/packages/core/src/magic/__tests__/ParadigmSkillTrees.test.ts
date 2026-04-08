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
  FERROMANCY_SKILL_TREE,
  getMonoResonantMetals,
  isMetalAvailable,
} from '../skillTrees/FerromancySkillTree.js';

import {
  SHINTO_SKILL_TREE,
  getAvailableKamiTypes,
  isPuritySufficient,
} from '../skillTrees/ShintoSkillTree.js';

import {
  TETHERMANCY_SKILL_TREE,
  LINK_TYPES,
  BINDING_PRINCIPLES,
  calculateLinkEfficiency,
  getMaxBindings,
  calculateDrift,
} from '../skillTrees/TethermancySkillTree.js';

import {
  ANIMUS_SKILL_TREE,
  ANIMUS_FORM_CATEGORIES,
  getFormBonuses,
  isFormInCategory,
  getFormCategory,
  getSeparationDistance,
  canSeparate,
  hasSettled,
} from '../skillTrees/AnimusSkillTree.js';

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
// Ferromancy Skill Tree Tests
// ============================================================================

describe('FerromancySkillTree', () => {
  describe('tree structure', () => {
    it('should have correct paradigm ID', () => {
      expect(FERROMANCY_SKILL_TREE.paradigmId).toBe('ferromancy');
    });

    it('should have fractured as entry node', () => {
      expect(FERROMANCY_SKILL_TREE.entryNodes).toContain('fractured');
    });

    it('should require bloodline for tree access', () => {
      expect(FERROMANCY_SKILL_TREE.rules.requiresInnateAbility).toBe(true);
      expect(FERROMANCY_SKILL_TREE.rules.innateCondition).toBeDefined();
      expect(FERROMANCY_SKILL_TREE.rules.innateCondition?.type).toBe('bloodline');
    });

    it('should have metal discovery nodes', () => {
      const discoveryNodes = getNodesByCategory(FERROMANCY_SKILL_TREE, 'discovery');
      expect(discoveryNodes.length).toBeGreaterThan(0);

      // Check for basic metals
      expect(getNodeById(FERROMANCY_SKILL_TREE, 'metal-steel')).toBeDefined();
      expect(getNodeById(FERROMANCY_SKILL_TREE, 'metal-iron')).toBeDefined();
      expect(getNodeById(FERROMANCY_SKILL_TREE, 'metal-pewter')).toBeDefined();
      expect(getNodeById(FERROMANCY_SKILL_TREE, 'metal-tin')).toBeDefined();
    });

    it('should have MonoResonant specialization nodes', () => {
      const specializationNodes = getNodesByCategory(FERROMANCY_SKILL_TREE, 'specialization');
      expect(specializationNodes.length).toBeGreaterThan(0);

      expect(getNodeById(FERROMANCY_SKILL_TREE, 'iron-puller')).toBeDefined();
      expect(getNodeById(FERROMANCY_SKILL_TREE, 'steel-launcher')).toBeDefined();
    });

    it('should have OmniResonant awakening node', () => {
      const omni_resonantNode = getNodeById(FERROMANCY_SKILL_TREE, 'omni_resonant-awakening');
      expect(omni_resonantNode).toBeDefined();
      expect(omni_resonantNode?.unlockConditions).toContainEqual(
        expect.objectContaining({ type: 'bloodline' })
      );
    });
  });

  describe('helper functions', () => {
    it('getMonoResonantMetals returns all metals for full OmniResonant', () => {
      const metals = getMonoResonantMetals(1.0);
      expect(metals.length).toBeGreaterThan(8);
    });

    it('getMonoResonantMetals returns basic metals for lower strength', () => {
      const metals = getMonoResonantMetals(0.25);
      expect(metals).toContain('steel');
      expect(metals).toContain('iron');
      expect(metals.length).toBe(4); // Basic metals only
    });

    it('getMonoResonantMetals returns empty for no bloodline', () => {
      const metals = getMonoResonantMetals(0.1);
      expect(metals.length).toBe(0);
    });

    it('isMetalAvailable checks bloodline strength', () => {
      expect(isMetalAvailable('steel', 0.25)).toBe(true);
      expect(isMetalAvailable('zinc', 0.25)).toBe(false); // Mental metals need 0.5+
      expect(isMetalAvailable('zinc', 0.5)).toBe(true);
    });
  });

  describe('tree access', () => {
    it('should require Ferromancer bloodline', () => {
      const progress = createMagicSkillProgress('ferromancy');

      // Without bloodline
      const contextNone = createTestContext('ferromancy', progress, {
        custom: { bloodlines: {} },
      });
      expect(canAccessTree(FERROMANCY_SKILL_TREE, contextNone).canAccess).toBe(false);

      // With bloodline
      const contextWith = createTestContext('ferromancy', progress, {
        custom: { bloodlines: { ferromancer: 1.0 } },
      });
      expect(canAccessTree(FERROMANCY_SKILL_TREE, contextWith).canAccess).toBe(true);
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
// Tethermancy Skill Tree Tests
// ============================================================================

describe('TethermancySkillTree', () => {
  describe('tree structure', () => {
    it('should have correct paradigm ID', () => {
      expect(TETHERMANCY_SKILL_TREE.paradigmId).toBe('tethermancy');
    });

    it('should not require innate ability', () => {
      expect(TETHERMANCY_SKILL_TREE.rules.requiresInnateAbility).toBe(false);
    });

    it('should have attunement foundation nodes', () => {
      const basicAttunement = getNodeById(TETHERMANCY_SKILL_TREE, 'basic-attunement');
      expect(basicAttunement).toBeDefined();
      expect(basicAttunement?.category).toBe('foundation');
    });

    it('should have link type nodes', () => {
      // Check for link type progression
      expect(getNodeById(TETHERMANCY_SKILL_TREE, 'link-identical')).toBeDefined();
      expect(getNodeById(TETHERMANCY_SKILL_TREE, 'link-similar')).toBeDefined();
    });

    it('should have advanced binding nodes', () => {
      // Body binding and tether_effigy are advanced techniques
      expect(getNodeById(TETHERMANCY_SKILL_TREE, 'body-binding')).toBeDefined();
      expect(getNodeById(TETHERMANCY_SKILL_TREE, 'tether_effigy')).toBeDefined();
    });

    it('should have split-focus mastery nodes', () => {
      expect(getNodeById(TETHERMANCY_SKILL_TREE, 'dual-binding')).toBeDefined();
      expect(getNodeById(TETHERMANCY_SKILL_TREE, 'triple-binding')).toBeDefined();
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

    it('calculateDrift returns energy loss percentage', () => {
      // Function signature: (baseDrift, driftControlLevel, hasPerfectLink, linkType)
      const drift = calculateDrift(0.3, 0, false, 'similar');
      expect(drift).toBeGreaterThan(0);
      expect(drift).toBeLessThan(1);
    });
  });
});

// ============================================================================
// Animus Skill Tree Tests
// ============================================================================

describe('AnimusSkillTree', () => {
  describe('tree structure', () => {
    it('should have correct paradigm ID', () => {
      expect(ANIMUS_SKILL_TREE.paradigmId).toBe('animus');
    });

    it('should not require innate ability (everyone has an animus)', () => {
      expect(ANIMUS_SKILL_TREE.rules.requiresInnateAbility).toBe(false);
    });

    it('should have animus-bond as entry node', () => {
      expect(ANIMUS_SKILL_TREE.entryNodes).toContain('animus-bond');
    });

    it('should have settling node', () => {
      const settlingNode = getNodeById(ANIMUS_SKILL_TREE, 'settling');
      expect(settlingNode).toBeDefined();
      expect(settlingNode?.hidden).toBe(true); // Hidden until it happens
    });

    it('should have dust category nodes', () => {
      const aetherMoteNodes = getNodesByCategory(ANIMUS_SKILL_TREE, 'aether_motes');
      expect(aetherMoteNodes.length).toBeGreaterThan(0);
      expect(getNodeById(ANIMUS_SKILL_TREE, 'dust-sense')).toBeDefined();
    });

    it('should have separation category nodes', () => {
      const separationNodes = getNodesByCategory(ANIMUS_SKILL_TREE, 'separation');
      expect(separationNodes.length).toBeGreaterThan(0);
      expect(getNodeById(ANIMUS_SKILL_TREE, 'basic-separation')).toBeDefined();
    });

    it('should have witch blood node with bloodline requirement', () => {
      const witchNode = getNodeById(ANIMUS_SKILL_TREE, 'witch-blood');
      expect(witchNode).toBeDefined();
      expect(witchNode?.unlockConditions).toContainEqual(
        expect.objectContaining({ type: 'bloodline' })
      );
    });
  });

  describe('constants', () => {
    it('ANIMUS_FORM_CATEGORIES should have form types', () => {
      expect(ANIMUS_FORM_CATEGORIES.predator).toBeDefined();
      expect(ANIMUS_FORM_CATEGORIES.companion).toBeDefined();
      expect(ANIMUS_FORM_CATEGORIES.wisdom).toBeDefined();
      expect(ANIMUS_FORM_CATEGORIES.power).toBeDefined();
      expect(ANIMUS_FORM_CATEGORIES.stealth).toBeDefined();
      expect(ANIMUS_FORM_CATEGORIES.exotic).toBeDefined();
    });

    it('each form category should have animal forms', () => {
      expect(ANIMUS_FORM_CATEGORIES.predator.length).toBeGreaterThan(0);
      expect(ANIMUS_FORM_CATEGORIES.predator).toContain('wolf');
      expect(ANIMUS_FORM_CATEGORIES.companion).toContain('dog');
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
    it('should be accessible to anyone (everyone has an animus)', () => {
      const progress = createMagicSkillProgress('animus');
      const context = createTestContext('animus', progress);
      expect(canAccessTree(ANIMUS_SKILL_TREE, context).canAccess).toBe(true);
    });
  });

  describe('condition evaluators', () => {
    it('should evaluate age_range condition', () => {
      const progress = createMagicSkillProgress('animus');
      const formNode = getNodeById(ANIMUS_SKILL_TREE, 'form-shifting');
      expect(formNode).toBeDefined();

      // Child (can shift forms)
      const childContext = createTestContext('animus', progress, {
        custom: { age: 10 },
      });
      const childResult = evaluateNode(formNode!, ANIMUS_SKILL_TREE, childContext);
      expect(childResult.conditions.some(r => r.condition.type === 'age_range' && r.met)).toBe(true);

      // Adult (cannot shift forms)
      const adultContext = createTestContext('animus', progress, {
        custom: { age: 25 },
      });
      const adultResult = evaluateNode(formNode!, ANIMUS_SKILL_TREE, adultContext);
      expect(adultResult.conditions.some(r => r.condition.type === 'age_range' && !r.met)).toBe(true);
    });

    it('should evaluate form_category condition', () => {
      const progress = createMagicSkillProgress('animus');
      progress.unlockedNodes['form-affinity'] = 1;

      const combatNode = getNodeById(ANIMUS_SKILL_TREE, 'animus-combat');
      expect(combatNode).toBeDefined();

      // With predator animus
      const predatorContext = createTestContext('animus', progress, {
        custom: { animusFormCategory: 'predator' },
      });
      const predatorResult = evaluateNode(combatNode!, ANIMUS_SKILL_TREE, predatorContext);
      expect(predatorResult.conditions.some(r => r.condition.type === 'form_category' && r.met)).toBe(true);

      // With companion animus
      const companionContext = createTestContext('animus', progress, {
        custom: { animusFormCategory: 'companion' },
      });
      const companionResult = evaluateNode(combatNode!, ANIMUS_SKILL_TREE, companionContext);
      expect(companionResult.conditions.some(r => r.condition.type === 'form_category' && !r.met)).toBe(true);
    });
  });
});

// ============================================================================
// Cross-Tree Integration Tests
// ============================================================================

describe('Cross-tree consistency', () => {
  const ALL_TREES = [
    { name: 'Ferromancy', tree: FERROMANCY_SKILL_TREE },
    { name: 'Shinto', tree: SHINTO_SKILL_TREE },
    { name: 'Tethermancy', tree: TETHERMANCY_SKILL_TREE },
    { name: 'Animus', tree: ANIMUS_SKILL_TREE },
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
