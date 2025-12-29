/**
 * Unit tests for ResearchRegistry
 *
 * Tests research registration, retrieval, prerequisite handling,
 * and tech tree traversal.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  ResearchRegistry,
  DuplicateResearchError,
  ResearchNotFoundError,
  InvalidPrerequisiteError,
  InvalidGeneratedResearchError,
} from '../ResearchRegistry.js';
import type { ResearchDefinition } from '../types.js';

// Helper to create a basic research definition
function createResearch(
  id: string,
  options: Partial<ResearchDefinition> = {}
): ResearchDefinition {
  return {
    id,
    name: options.name ?? `Research ${id}`,
    description: options.description ?? `Description for ${id}`,
    field: options.field ?? 'agriculture',
    tier: options.tier ?? 1,
    type: options.type ?? 'predefined',
    progressRequired: options.progressRequired ?? 100,
    prerequisites: options.prerequisites ?? [],
    unlocks: options.unlocks ?? [],
  };
}

describe('ResearchRegistry', () => {
  let registry: ResearchRegistry;

  beforeEach(() => {
    // Reset singleton before each test
    ResearchRegistry.resetInstance();
    registry = ResearchRegistry.getInstance();
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = ResearchRegistry.getInstance();
      const instance2 = ResearchRegistry.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('resetInstance creates a fresh registry', () => {
      registry.register(createResearch('test-research'));
      expect(registry.size).toBe(1);

      ResearchRegistry.resetInstance();
      const newRegistry = ResearchRegistry.getInstance();

      expect(newRegistry.size).toBe(0);
    });
  });

  describe('register', () => {
    it('registers a research definition', () => {
      const research = createResearch('agriculture_i');
      registry.register(research);

      expect(registry.has('agriculture_i')).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('throws DuplicateResearchError for duplicate ID', () => {
      const research1 = createResearch('duplicate');
      const research2 = createResearch('duplicate');

      registry.register(research1);

      expect(() => registry.register(research2)).toThrow(DuplicateResearchError);
      expect(() => registry.register(research2)).toThrow(
        "Research with ID 'duplicate' is already registered"
      );
    });
  });

  describe('registerAll', () => {
    it('registers multiple research definitions', () => {
      const definitions = [
        createResearch('r1'),
        createResearch('r2'),
        createResearch('r3'),
      ];

      registry.registerAll(definitions);

      expect(registry.size).toBe(3);
      expect(registry.has('r1')).toBe(true);
      expect(registry.has('r2')).toBe(true);
      expect(registry.has('r3')).toBe(true);
    });

    it('throws on first duplicate and stops', () => {
      const definitions = [
        createResearch('r1'),
        createResearch('r1'), // duplicate
        createResearch('r3'),
      ];

      expect(() => registry.registerAll(definitions)).toThrow(
        DuplicateResearchError
      );
      expect(registry.size).toBe(1); // Only first was registered
    });
  });

  describe('registerGenerated', () => {
    it('registers valid generated research', () => {
      const research = createResearch('generated-item', { type: 'generated' });
      const validation = { valid: true, errors: [] };

      registry.registerGenerated(research, validation);

      expect(registry.has('generated-item')).toBe(true);
    });

    it('throws InvalidGeneratedResearchError for invalid research', () => {
      const research = createResearch('invalid-gen', { type: 'generated' });
      const validation = {
        valid: false,
        errors: ['Tier too high', 'Power exceeds budget'],
      };

      expect(() => registry.registerGenerated(research, validation)).toThrow(
        InvalidGeneratedResearchError
      );
      expect(() => registry.registerGenerated(research, validation)).toThrow(
        /Tier too high/
      );
    });
  });

  describe('get', () => {
    it('returns registered research', () => {
      const research = createResearch('my-research', {
        name: 'My Research',
        tier: 3,
      });
      registry.register(research);

      const retrieved = registry.get('my-research');

      expect(retrieved.id).toBe('my-research');
      expect(retrieved.name).toBe('My Research');
      expect(retrieved.tier).toBe(3);
    });

    it('throws ResearchNotFoundError for unknown ID', () => {
      expect(() => registry.get('nonexistent')).toThrow(ResearchNotFoundError);
      expect(() => registry.get('nonexistent')).toThrow(
        "Research with ID 'nonexistent' not found"
      );
    });
  });

  describe('tryGet', () => {
    it('returns registered research', () => {
      const research = createResearch('try-get-test');
      registry.register(research);

      const retrieved = registry.tryGet('try-get-test');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('try-get-test');
    });

    it('returns undefined for unknown ID', () => {
      const retrieved = registry.tryGet('nonexistent');

      expect(retrieved).toBeUndefined();
    });
  });

  describe('getByField', () => {
    it('returns all research in a field', () => {
      registry.registerAll([
        createResearch('agri-1', { field: 'agriculture' }),
        createResearch('agri-2', { field: 'agriculture' }),
        createResearch('metal-1', { field: 'metallurgy' }),
        createResearch('agri-3', { field: 'agriculture' }),
      ]);

      const agricultureResearch = registry.getByField('agriculture');

      expect(agricultureResearch).toHaveLength(3);
      expect(agricultureResearch.map((r) => r.id)).toContain('agri-1');
      expect(agricultureResearch.map((r) => r.id)).toContain('agri-2');
      expect(agricultureResearch.map((r) => r.id)).toContain('agri-3');
    });

    it('returns empty array for field with no research', () => {
      registry.register(createResearch('test', { field: 'agriculture' }));

      const arcaneResearch = registry.getByField('arcane');

      expect(arcaneResearch).toHaveLength(0);
    });
  });

  describe('getByTier', () => {
    it('returns all research at a tier', () => {
      registry.registerAll([
        createResearch('t1-a', { tier: 1 }),
        createResearch('t2-a', { tier: 2 }),
        createResearch('t1-b', { tier: 1 }),
        createResearch('t3-a', { tier: 3 }),
      ]);

      const tier1Research = registry.getByTier(1);

      expect(tier1Research).toHaveLength(2);
      expect(tier1Research.map((r) => r.id)).toContain('t1-a');
      expect(tier1Research.map((r) => r.id)).toContain('t1-b');
    });
  });

  describe('getByType', () => {
    it('returns all research of a type', () => {
      registry.registerAll([
        createResearch('predef-1', { type: 'predefined' }),
        createResearch('gen-1', { type: 'generated' }),
        createResearch('predef-2', { type: 'predefined' }),
        createResearch('exp-1', { type: 'experimental' }),
      ]);

      const predefinedResearch = registry.getByType('predefined');
      const generatedResearch = registry.getByType('generated');

      expect(predefinedResearch).toHaveLength(2);
      expect(generatedResearch).toHaveLength(1);
    });
  });

  describe('getPrerequisitesFor', () => {
    it('returns prerequisite research definitions', () => {
      registry.registerAll([
        createResearch('base'),
        createResearch('advanced', { prerequisites: ['base'] }),
      ]);

      const prereqs = registry.getPrerequisitesFor('advanced');

      expect(prereqs).toHaveLength(1);
      expect(prereqs[0].id).toBe('base');
    });

    it('throws when research not found', () => {
      expect(() => registry.getPrerequisitesFor('nonexistent')).toThrow(
        ResearchNotFoundError
      );
    });

    it('throws when prerequisite not found', () => {
      registry.register(
        createResearch('orphan', { prerequisites: ['missing'] })
      );

      expect(() => registry.getPrerequisitesFor('orphan')).toThrow(
        ResearchNotFoundError
      );
    });
  });

  describe('getDependentsOf', () => {
    it('returns research that depends on given research', () => {
      registry.registerAll([
        createResearch('base'),
        createResearch('depends-1', { prerequisites: ['base'] }),
        createResearch('depends-2', { prerequisites: ['base'] }),
        createResearch('unrelated'),
      ]);

      const dependents = registry.getDependentsOf('base');

      expect(dependents).toHaveLength(2);
      expect(dependents.map((r) => r.id)).toContain('depends-1');
      expect(dependents.map((r) => r.id)).toContain('depends-2');
    });

    it('returns empty array when no dependents', () => {
      registry.register(createResearch('lonely'));

      const dependents = registry.getDependentsOf('lonely');

      expect(dependents).toHaveLength(0);
    });
  });

  describe('validatePrerequisites', () => {
    it('passes for valid prerequisites', () => {
      registry.registerAll([
        createResearch('base'),
        createResearch('mid', { prerequisites: ['base'] }),
        createResearch('advanced', { prerequisites: ['mid'] }),
      ]);

      expect(() => registry.validatePrerequisites()).not.toThrow();
    });

    it('throws for missing prerequisite', () => {
      registry.register(
        createResearch('orphan', { prerequisites: ['nonexistent'] })
      );

      expect(() => registry.validatePrerequisites()).toThrow(
        InvalidPrerequisiteError
      );
      expect(() => registry.validatePrerequisites()).toThrow(
        "Research 'orphan' has invalid prerequisite 'nonexistent'"
      );
    });
  });

  describe('getNextAvailable', () => {
    beforeEach(() => {
      // Set up a small tech tree
      registry.registerAll([
        createResearch('tier1-a', { tier: 1 }),
        createResearch('tier1-b', { tier: 1 }),
        createResearch('tier2-a', { tier: 2, prerequisites: ['tier1-a'] }),
        createResearch('tier2-b', {
          tier: 2,
          prerequisites: ['tier1-a', 'tier1-b'],
        }),
        createResearch('tier3', { tier: 3, prerequisites: ['tier2-a'] }),
      ]);
    });

    it('returns tier 1 research when nothing completed', () => {
      const available = registry.getNextAvailable(new Set());

      expect(available).toHaveLength(2);
      expect(available.map((r) => r.id)).toContain('tier1-a');
      expect(available.map((r) => r.id)).toContain('tier1-b');
    });

    it('returns unlocked tier 2 research when tier 1 completed', () => {
      const completed = new Set(['tier1-a']);

      const available = registry.getNextAvailable(completed);

      expect(available.map((r) => r.id)).toContain('tier1-b'); // Still available
      expect(available.map((r) => r.id)).toContain('tier2-a'); // Newly available
      expect(available.map((r) => r.id)).not.toContain('tier2-b'); // Missing tier1-b
    });

    it('excludes already completed research', () => {
      const completed = new Set(['tier1-a', 'tier1-b']);

      const available = registry.getNextAvailable(completed);

      expect(available.map((r) => r.id)).not.toContain('tier1-a');
      expect(available.map((r) => r.id)).not.toContain('tier1-b');
      expect(available.map((r) => r.id)).toContain('tier2-a');
      expect(available.map((r) => r.id)).toContain('tier2-b');
    });

    it('returns tier 3 when all prerequisites met', () => {
      const completed = new Set(['tier1-a', 'tier1-b', 'tier2-a']);

      const available = registry.getNextAvailable(completed);

      expect(available.map((r) => r.id)).toContain('tier3');
    });
  });

  describe('canStart', () => {
    beforeEach(() => {
      registry.registerAll([
        createResearch('base'),
        createResearch('advanced', { prerequisites: ['base'] }),
      ]);
    });

    it('returns true when all prerequisites met', () => {
      const completed = new Set(['base']);

      expect(registry.canStart('advanced', completed)).toBe(true);
    });

    it('returns false when prerequisites not met', () => {
      const completed = new Set<string>();

      expect(registry.canStart('advanced', completed)).toBe(false);
    });

    it('returns true for research with no prerequisites', () => {
      expect(registry.canStart('base', new Set())).toBe(true);
    });

    it('returns false for nonexistent research', () => {
      expect(registry.canStart('nonexistent', new Set())).toBe(false);
    });
  });

  describe('getTechTree', () => {
    it('returns root nodes with children', () => {
      registry.registerAll([
        createResearch('root1'),
        createResearch('root2'),
        createResearch('child1', { prerequisites: ['root1'] }),
        createResearch('child2', { prerequisites: ['root1'] }),
        createResearch('grandchild', { prerequisites: ['child1'] }),
      ]);

      const tree = registry.getTechTree();

      expect(tree).toHaveLength(2); // Two roots
      expect(tree.map((n) => n.research.id)).toContain('root1');
      expect(tree.map((n) => n.research.id)).toContain('root2');

      const root1 = tree.find((n) => n.research.id === 'root1');
      expect(root1?.children).toHaveLength(2);
      expect(root1?.depth).toBe(0);

      const child1 = root1?.children.find((n) => n.research.id === 'child1');
      expect(child1?.children).toHaveLength(1);
      expect(child1?.depth).toBe(1);

      const grandchild = child1?.children[0];
      expect(grandchild?.research.id).toBe('grandchild');
      expect(grandchild?.depth).toBe(2);
    });
  });

  describe('getAll', () => {
    it('returns all registered research', () => {
      registry.registerAll([
        createResearch('r1'),
        createResearch('r2'),
        createResearch('r3'),
      ]);

      const all = registry.getAll();

      expect(all).toHaveLength(3);
    });
  });
});
