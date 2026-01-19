/**
 * Tests for JSON data loading
 */

import { describe, it, expect } from 'vitest';
import { loadCoreParadigms, loadExampleKami, loadAllomanticMetals } from '../data-loader.js';

describe('DataLoader', () => {
  describe('loadCoreParadigms', () => {
    it('should load all core paradigms from JSON', () => {
      const paradigms = loadCoreParadigms();

      expect(paradigms).toBeDefined();
      expect(Object.keys(paradigms)).toHaveLength(7);
      expect(paradigms.academic).toBeDefined();
      expect(paradigms.pact).toBeDefined();
      expect(paradigms.names).toBeDefined();
      expect(paradigms.breath).toBeDefined();
      expect(paradigms.divine).toBeDefined();
      expect(paradigms.blood).toBeDefined();
      expect(paradigms.emotional).toBeDefined();
    });

    it('should have valid paradigm structure', () => {
      const paradigms = loadCoreParadigms();
      const academic = paradigms.academic;

      expect(academic.id).toBe('academic');
      expect(academic.name).toBe('The Academies');
      expect(academic.description).toBeDefined();
      expect(academic.sources).toBeInstanceOf(Array);
      expect(academic.costs).toBeInstanceOf(Array);
      expect(academic.channels).toBeInstanceOf(Array);
      expect(academic.laws).toBeInstanceOf(Array);
      expect(academic.risks).toBeInstanceOf(Array);
    });
  });

  describe('loadExampleKami', () => {
    it('should load example kami from JSON', () => {
      const kami = loadExampleKami();

      expect(kami).toBeInstanceOf(Array);
      expect(kami.length).toBeGreaterThan(0);
    });

    it('should have valid kami structure', () => {
      const kami = loadExampleKami();
      const first = kami[0];

      expect(first).toBeDefined();
      expect(first.id).toBeDefined();
      expect(first.name).toBeDefined();
      expect(first.type).toBeDefined();
      expect(first.rank).toBeDefined();
    });
  });

  describe('loadAllomanticMetals', () => {
    it('should load allomantic metals from JSON', () => {
      const metals = loadAllomanticMetals();

      expect(metals).toBeInstanceOf(Array);
      expect(metals.length).toBe(12);
    });

    it('should have valid metal structure', () => {
      const metals = loadAllomanticMetals();
      const steel = metals.find(m => m.id === 'steel');

      expect(steel).toBeDefined();
      expect(steel!.name).toBe('Steel');
      expect(steel!.type).toBe('physical');
      expect(steel!.direction).toBe('push');
      expect(steel!.effect).toBeDefined();
    });
  });
});
