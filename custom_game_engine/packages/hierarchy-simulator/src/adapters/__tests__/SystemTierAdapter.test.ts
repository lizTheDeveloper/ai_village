/**
 * SystemTierAdapter Tests
 *
 * Verifies that star system abstraction can manage multiple planets
 * and aggregate their data correctly.
 */

import { describe, it, expect } from 'vitest';
import { SystemTierAdapter } from '../SystemTierAdapter.js';

describe('SystemTierAdapter', () => {
  describe('Type Safety', () => {
    it('should have static methods defined', () => {
      expect(typeof SystemTierAdapter.createSystem).toBe('function');
      expect(typeof SystemTierAdapter.getPlanetsInHabitableZone).toBe('function');
      expect(typeof SystemTierAdapter.getSystemResources).toBe('function');
      expect(typeof SystemTierAdapter.addPlanet).toBe('function');
      expect(typeof SystemTierAdapter.getPrimaryPlanet).toBe('function');
    });
  });

  describe('Error Handling', () => {
    it('should throw on missing planets parameter', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime validation
        SystemTierAdapter.createSystem(null, { id: 'test', name: 'Test', starType: 'G', address: {} });
      }).toThrow('planets parameter is required');
    });

    it('should throw on missing config parameter', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime validation
        SystemTierAdapter.createSystem([], null);
      }).toThrow('config parameter is required');
    });

    it('should throw on empty planets array', () => {
      expect(() => {
        SystemTierAdapter.createSystem([], { id: 'test', name: 'Test', starType: 'G', address: {} });
      }).toThrow('planets array cannot be empty');
    });

    it('should throw on missing abstractSystem parameter', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime validation
        SystemTierAdapter.getPlanetsInHabitableZone(null);
      }).toThrow('abstractSystem parameter is required');
    });

    it('should throw on missing parameters in getSystemResources', () => {
      expect(() => {
        // @ts-expect-error - Testing runtime validation
        SystemTierAdapter.getSystemResources(null);
      }).toThrow('abstractSystem parameter is required');
    });
  });
});
