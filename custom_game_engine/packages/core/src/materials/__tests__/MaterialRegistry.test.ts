import { describe, it, expect, beforeEach } from 'vitest';
import { MaterialRegistry } from '../MaterialRegistry';
import type { MaterialTemplate } from '../MaterialTemplate';

describe('MaterialRegistry', () => {
  let registry: MaterialRegistry;

  beforeEach(() => {
    registry = new MaterialRegistry();
  });

  describe('Criterion 1: MaterialTemplate System', () => {
    it('should register a metal material with physical properties', () => {
      const iron: MaterialTemplate = {
        id: 'iron',
        name: 'Iron',
        density: 7870,
        hardness: 80,
        flexibility: 20,
        meltingPoint: 1538,
        ignitePoint: undefined,
        heatConductivity: 80,
        magicAffinity: 10,
        resonantForms: [],
        categories: ['metal'],
      };

      registry.register(iron);

      const retrieved = registry.get('iron');
      expect(retrieved).toBeDefined();
      expect(retrieved.density).toBe(7870);
      expect(retrieved.hardness).toBe(80);
      expect(retrieved.categories).toContain('metal');
    });

    it('should register a wood material with organic properties', () => {
      const oak: MaterialTemplate = {
        id: 'oak',
        name: 'Oak Wood',
        density: 600,
        hardness: 30,
        flexibility: 50,
        meltingPoint: undefined,
        ignitePoint: 300,
        heatConductivity: 15,
        magicAffinity: 40,
        resonantForms: ['nature', 'growth'],
        categories: ['wood', 'organic'],
      };

      registry.register(oak);

      const retrieved = registry.get('oak');
      expect(retrieved).toBeDefined();
      expect(retrieved.density).toBe(600);
      expect(retrieved.hardness).toBe(30);
      expect(retrieved.categories).toContain('wood');
      expect(retrieved.categories).toContain('organic');
    });

    it('should register a leather material', () => {
      const leather: MaterialTemplate = {
        id: 'leather',
        name: 'Leather',
        density: 900,
        hardness: 15,
        flexibility: 70,
        meltingPoint: undefined,
        ignitePoint: 200,
        heatConductivity: 20,
        magicAffinity: 25,
        resonantForms: ['protection'],
        categories: ['leather', 'organic'],
      };

      registry.register(leather);

      const retrieved = registry.get('leather');
      expect(retrieved).toBeDefined();
      expect(retrieved.flexibility).toBe(70);
      expect(retrieved.categories).toContain('leather');
    });

    it('should throw when getting non-existent material', () => {
      expect(() => registry.get('nonexistent')).toThrow();
      expect(() => registry.get('nonexistent')).toThrow('Material not found');
    });

    it('should throw when registering duplicate material ID', () => {
      const iron: MaterialTemplate = {
        id: 'iron',
        name: 'Iron',
        density: 7870,
        hardness: 80,
        flexibility: 20,
        meltingPoint: 1538,
        ignitePoint: undefined,
        heatConductivity: 80,
        magicAffinity: 10,
        resonantForms: [],
        categories: ['metal'],
      };

      registry.register(iron);

      expect(() => registry.register(iron)).toThrow();
      expect(() => registry.register(iron)).toThrow('already registered');
    });

    it('should list all registered materials', () => {
      const iron: MaterialTemplate = {
        id: 'iron',
        name: 'Iron',
        density: 7870,
        hardness: 80,
        flexibility: 20,
        meltingPoint: 1538,
        ignitePoint: undefined,
        heatConductivity: 80,
        magicAffinity: 10,
        resonantForms: [],
        categories: ['metal'],
      };

      const oak: MaterialTemplate = {
        id: 'oak',
        name: 'Oak Wood',
        density: 600,
        hardness: 30,
        flexibility: 50,
        meltingPoint: undefined,
        ignitePoint: 300,
        heatConductivity: 15,
        magicAffinity: 40,
        resonantForms: ['nature'],
        categories: ['wood', 'organic'],
      };

      registry.register(iron);
      registry.register(oak);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.map(m => m.id)).toContain('iron');
      expect(all.map(m => m.id)).toContain('oak');
    });

    it('should check if material exists', () => {
      const iron: MaterialTemplate = {
        id: 'iron',
        name: 'Iron',
        density: 7870,
        hardness: 80,
        flexibility: 20,
        meltingPoint: 1538,
        ignitePoint: undefined,
        heatConductivity: 80,
        magicAffinity: 10,
        resonantForms: [],
        categories: ['metal'],
      };

      registry.register(iron);

      expect(registry.has('iron')).toBe(true);
      expect(registry.has('gold')).toBe(false);
    });
  });

  describe('error handling - no fallbacks', () => {
    it('should throw with clear message when material not found', () => {
      expect(() => registry.get('missing')).toThrow('Material not found: missing');
    });

    it('should not return undefined for missing materials', () => {
      // This test ensures we never use .get() with fallback
      expect(() => registry.get('missing')).toThrow();
    });
  });
});
