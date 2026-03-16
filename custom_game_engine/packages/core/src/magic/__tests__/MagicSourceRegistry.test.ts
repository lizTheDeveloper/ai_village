import { describe, it, expect, afterEach } from 'vitest';
import {
  MagicSourceRegistry,
  getMagicSourceRegistry,
  getMagicSource,
  isMagicSourceAccessible,
} from '../MagicSourceRegistry.js';

describe('MagicSourceRegistry', () => {
  afterEach(() => {
    MagicSourceRegistry.resetInstance();
  });

  describe('getInstance / singleton', () => {
    it('returns the same instance on repeated calls', () => {
      const a = MagicSourceRegistry.getInstance();
      const b = MagicSourceRegistry.getInstance();
      expect(a).toBe(b);
    });

    it('resetInstance causes a new instance to be created', () => {
      const a = MagicSourceRegistry.getInstance();
      MagicSourceRegistry.resetInstance();
      const b = MagicSourceRegistry.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('default sources', () => {
    it('registers arcane by default', () => {
      expect(MagicSourceRegistry.getInstance().has('arcane')).toBe(true);
    });

    it('registers divine by default', () => {
      expect(MagicSourceRegistry.getInstance().has('divine')).toBe(true);
    });

    it('registers void by default', () => {
      expect(MagicSourceRegistry.getInstance().has('void')).toBe(true);
    });

    it('registers blood by default', () => {
      expect(MagicSourceRegistry.getInstance().has('blood')).toBe(true);
    });

    it('registers nature by default', () => {
      expect(MagicSourceRegistry.getInstance().has('nature')).toBe(true);
    });

    it('registers ancestral by default', () => {
      expect(MagicSourceRegistry.getInstance().has('ancestral')).toBe(true);
    });

    it('listAll returns all 6 default sources', () => {
      expect(MagicSourceRegistry.getInstance().listAll()).toHaveLength(6);
    });
  });

  describe('get', () => {
    it('returns correct config for arcane', () => {
      const config = MagicSourceRegistry.getInstance().get('arcane');
      expect(config.id).toBe('arcane');
      expect(config.primaryCostType).toBe('mana');
      expect(config.requirements.freeAccess).toBe(true);
      expect(config.canCorrupt).toBe(false);
    });

    it('returns correct config for divine', () => {
      const config = MagicSourceRegistry.getInstance().get('divine');
      expect(config.id).toBe('divine');
      expect(config.primaryCostType).toBe('favor');
      expect(config.requirements.requiresDeity).toBe(true);
      expect(config.requirements.freeAccess).toBe(false);
      expect(config.canCorrupt).toBe(false);
    });

    it('returns correct config for void', () => {
      const config = MagicSourceRegistry.getInstance().get('void');
      expect(config.id).toBe('void');
      expect(config.primaryCostType).toBe('health');
      expect(config.requirements.freeAccess).toBe(true);
      expect(config.canCorrupt).toBe(true);
      expect(config.corruptionChance).toBe(0.1);
    });

    it('returns correct config for ancestral', () => {
      const config = MagicSourceRegistry.getInstance().get('ancestral');
      expect(config.id).toBe('ancestral');
      expect(config.requirements.minimumSkill).toBe(2);
      expect(config.requirements.freeAccess).toBe(true);
    });

    it('throws on unknown source id', () => {
      expect(() => MagicSourceRegistry.getInstance().get('nonexistent' as any)).toThrow();
    });
  });

  describe('has', () => {
    it('returns true for existing source', () => {
      expect(MagicSourceRegistry.getInstance().has('arcane')).toBe(true);
    });

    it('returns false for unknown source', () => {
      expect(MagicSourceRegistry.getInstance().has('nonexistent' as any)).toBe(false);
    });
  });

  describe('listAll', () => {
    it('returns array of MagicSourceConfig objects', () => {
      const all = MagicSourceRegistry.getInstance().listAll();
      expect(Array.isArray(all)).toBe(true);
      for (const source of all) {
        expect(source).toHaveProperty('id');
        expect(source).toHaveProperty('primaryCostType');
        expect(source).toHaveProperty('requirements');
      }
    });

    it('includes all expected source ids', () => {
      const ids = MagicSourceRegistry.getInstance().listAll().map(s => s.id);
      expect(ids).toContain('arcane');
      expect(ids).toContain('divine');
      expect(ids).toContain('void');
      expect(ids).toContain('blood');
      expect(ids).toContain('nature');
      expect(ids).toContain('ancestral');
    });
  });

  describe('register (custom sources)', () => {
    it('registers a custom source and makes it retrievable', () => {
      const registry = MagicSourceRegistry.getInstance();
      registry.register({
        id: 'shadow' as any,
        name: 'Shadow Magic',
        paradigmId: 'shadow',
        primaryCostType: 'mana',
        description: 'Magic drawn from shadows.',
        requirements: { freeAccess: true },
        powerMultiplier: 1.0,
        canCorrupt: false,
      });
      expect(registry.has('shadow' as any)).toBe(true);
      expect(registry.get('shadow' as any).name).toBe('Shadow Magic');
    });

    it('registered custom source appears in listAll', () => {
      const registry = MagicSourceRegistry.getInstance();
      registry.register({
        id: 'cosmic' as any,
        name: 'Cosmic Magic',
        paradigmId: 'cosmic',
        primaryCostType: 'mana',
        description: 'Magic drawn from the cosmos.',
        requirements: { freeAccess: true },
        powerMultiplier: 2.0,
        canCorrupt: false,
      });
      const all = registry.listAll();
      expect(all.some(s => s.id === ('cosmic' as any))).toBe(true);
      expect(all).toHaveLength(7);
    });
  });

  describe('resetInstance', () => {
    it('clears registered custom sources after reset', () => {
      const registry = MagicSourceRegistry.getInstance();
      registry.register({
        id: 'temporal' as any,
        name: 'Temporal Magic',
        paradigmId: 'temporal',
        primaryCostType: 'mana',
        description: 'Time-based magic.',
        requirements: { freeAccess: true },
        powerMultiplier: 1.0,
        canCorrupt: false,
      });
      expect(registry.has('temporal' as any)).toBe(true);

      MagicSourceRegistry.resetInstance();
      const newRegistry = MagicSourceRegistry.getInstance();
      expect(newRegistry.has('temporal' as any)).toBe(false);
    });

    it('restores default sources after reset', () => {
      MagicSourceRegistry.resetInstance();
      const registry = MagicSourceRegistry.getInstance();
      expect(registry.listAll()).toHaveLength(6);
      expect(registry.has('arcane')).toBe(true);
    });
  });

  describe('getMagicSourceRegistry (convenience)', () => {
    it('returns the singleton registry', () => {
      const registry = getMagicSourceRegistry();
      expect(registry).toBe(MagicSourceRegistry.getInstance());
    });

    it('has all default sources', () => {
      expect(getMagicSourceRegistry().has('arcane')).toBe(true);
      expect(getMagicSourceRegistry().has('divine')).toBe(true);
    });
  });

  describe('getMagicSource (convenience)', () => {
    it('returns arcane config', () => {
      const config = getMagicSource('arcane');
      expect(config.id).toBe('arcane');
    });

    it('throws for unknown id', () => {
      expect(() => getMagicSource('unknown' as any)).toThrow();
    });
  });

  describe('isMagicSourceAccessible', () => {
    it('arcane is accessible to anyone (no deity, skill 0)', () => {
      expect(isMagicSourceAccessible('arcane', false, 0)).toBe(true);
    });

    it('arcane is accessible with deity too', () => {
      expect(isMagicSourceAccessible('arcane', true, 0)).toBe(true);
    });

    it('divine is not accessible without deity', () => {
      expect(isMagicSourceAccessible('divine', false, 0)).toBe(false);
    });

    it('divine is accessible with deity', () => {
      expect(isMagicSourceAccessible('divine', true, 0)).toBe(true);
    });

    it('void is accessible without deity at any skill (no deity requirement)', () => {
      expect(isMagicSourceAccessible('void', false, 0)).toBe(true);
    });

    it('void is accessible with deity too', () => {
      expect(isMagicSourceAccessible('void', true, 0)).toBe(true);
    });

    it('ancestral is not accessible below skill 2', () => {
      expect(isMagicSourceAccessible('ancestral', false, 0)).toBe(false);
      expect(isMagicSourceAccessible('ancestral', false, 1)).toBe(false);
    });

    it('ancestral is accessible at skill 2', () => {
      expect(isMagicSourceAccessible('ancestral', false, 2)).toBe(true);
    });

    it('ancestral is accessible above skill 2', () => {
      expect(isMagicSourceAccessible('ancestral', false, 5)).toBe(true);
    });

    it('returns false for unknown source id', () => {
      expect(isMagicSourceAccessible('unknown' as any, false, 5)).toBe(false);
    });
  });
});
