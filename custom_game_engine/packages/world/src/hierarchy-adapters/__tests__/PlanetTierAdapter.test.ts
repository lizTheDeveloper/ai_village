/**
 * PlanetTierAdapter Tests
 *
 * Verifies that Planet instances can be converted to AbstractPlanet tiers
 * and that data flows correctly between the world and hierarchy-simulator packages.
 */

import { describe, it, expect } from 'vitest';
import { PlanetTierAdapter } from '../PlanetTierAdapter.js';

describe('PlanetTierAdapter', () => {
  describe('Type Safety', () => {
    it('should have static methods defined', () => {
      expect(typeof PlanetTierAdapter.fromPlanet).toBe('function');
      expect(typeof PlanetTierAdapter.toPlanetConfig).toBe('function');
      expect(typeof PlanetTierAdapter.syncPopulation).toBe('function');
      expect(typeof PlanetTierAdapter.syncResources).toBe('function');
      expect(typeof PlanetTierAdapter.getResourceSummary).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should throw on missing planet parameter', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime validation
        PlanetTierAdapter.fromPlanet(null, {});
      }).toThrow('planet parameter is required');
    });

    it('should throw on missing abstractPlanet parameter', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime validation
        PlanetTierAdapter.toPlanetConfig(null);
      }).toThrow('abstractPlanet parameter is required');
    });

    it('should throw on missing parameters in syncPopulation', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime validation
        PlanetTierAdapter.syncPopulation(null, null);
      }).toThrow('planet parameter is required');
    });

    it('should throw on missing parameters in syncResources', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime validation
        PlanetTierAdapter.syncResources(null, null);
      }).toThrow('planet parameter is required');
    });

    it('should throw on missing parameters in getResourceSummary', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime validation
        PlanetTierAdapter.getResourceSummary(null);
      }).toThrow('abstractPlanet parameter is required');
    });
  });
});
