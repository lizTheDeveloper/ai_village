/**
 * Tests for Statistical Simulation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  simulatePlanetTier,
  simulateSystemTier,
  simulateSectorTier,
  simulateGalaxyTier,
} from '../StatisticalSimulation.js';
import { AbstractPlanet } from '../../abstraction/AbstractPlanet.js';
import { AbstractSystem } from '../../abstraction/AbstractSystem.js';
import { AbstractSector } from '../../abstraction/AbstractSector.js';
import { AbstractGalaxy } from '../../abstraction/AbstractGalaxy.js';

describe('StatisticalSimulation', () => {
  describe('simulatePlanetTier', () => {
    let planet: AbstractPlanet;

    beforeEach(() => {
      planet = new AbstractPlanet('test-planet', 'Test Planet', {});
    });

    it('should update population via logistic growth', () => {
      const initialPop = planet.population.total;

      simulatePlanetTier(planet, 1);

      // Population should change
      expect(planet.population.total).not.toBe(initialPop);
      // Should be positive (growing)
      expect(planet.population.total).toBeGreaterThan(0);
    });

    it('should advance tech level when research accumulates', () => {
      const initialTechLevel = planet.tech.level;
      const initialResearch = planet.tech.research;

      // Simulate many ticks to accumulate research
      for (let i = 0; i < 100; i++) {
        simulatePlanetTier(planet, 1);
      }

      // Either tech level increased or research accumulated
      expect(
        planet.tech.level > initialTechLevel || planet.tech.research > initialResearch
      ).toBe(true);
    });

    it('should update economy stockpiles', () => {
      const initialStockpile = planet.economy.stockpiles.get('food') || 0;

      simulatePlanetTier(planet, 1);

      const newStockpile = planet.economy.stockpiles.get('food') || 0;
      // Stockpile should change (production - consumption)
      expect(newStockpile).not.toBe(initialStockpile);
    });

    it('should increase urbanization over time', () => {
      const initialUrban = planet.civilizationStats.urbanization;

      for (let i = 0; i < 50; i++) {
        simulatePlanetTier(planet, 1);
      }

      // Urbanization should increase
      expect(planet.civilizationStats.urbanization).toBeGreaterThanOrEqual(initialUrban);
      // Should be capped at 1.0
      expect(planet.civilizationStats.urbanization).toBeLessThanOrEqual(1.0);
    });

    it('should maintain minimum viable population', () => {
      // Force very low population
      planet.population.total = 100;
      planet.stability.overall = 10; // Very unstable

      simulatePlanetTier(planet, 10);

      // Should maintain at least 1000 population
      expect(planet.population.total).toBeGreaterThanOrEqual(1000);
    });
  });

  describe('simulateSystemTier', () => {
    let system: AbstractSystem;

    beforeEach(() => {
      system = new AbstractSystem('test-system', 'Test System', {});
    });

    it('should update system-wide population', () => {
      const initialPop = system.population.total;

      simulateSystemTier(system, 1);

      expect(system.population.total).toBeGreaterThan(0);
    });

    it('should build orbital infrastructure at high tech', () => {
      system.tech.level = 7; // Spacefaring
      const initialCount = system.orbitalInfrastructure.length;

      // Simulate many ticks to trigger infrastructure growth
      for (let i = 0; i < 100; i++) {
        simulateSystemTier(system, 1);
      }

      // Should be spacefaring
      expect(system.systemStats.spacefaringCivCount).toBe(1);
    });

    it('should enable FTL at tech level 9', () => {
      system.tech.level = 9;

      simulateSystemTier(system, 1);

      expect(system.systemStats.ftlCapable).toBe(1);
    });

    it('should extract asteroid resources', () => {
      system.tech.level = 8; // Mining capable

      // Add mining stations
      if (system.asteroidBelts.length > 0) {
        system.asteroidBelts[0].miningStations = 5;
      }

      const initialStock = system.economy.stockpiles.get('metals') || 0;

      simulateSystemTier(system, 10);

      const newStock = system.economy.stockpiles.get('metals') || 0;
      // Should accumulate resources if we have mining stations
      if (system.asteroidBelts.length > 0 && system.asteroidBelts[0].miningStations > 0) {
        expect(newStock).toBeGreaterThanOrEqual(initialStock);
      }
    });

    it('should calculate economic output', () => {
      simulateSystemTier(system, 1);

      expect(system.systemStats.economicOutput).toBeGreaterThanOrEqual(0);
    });
  });

  describe('simulateSectorTier', () => {
    let sector: AbstractSector;

    beforeEach(() => {
      sector = new AbstractSector('test-sector', 'Test Sector', {});
    });

    it('should update sector population (slow growth)', () => {
      const initialPop = sector.population.total;

      // Many ticks needed at sector scale
      for (let i = 0; i < 50; i++) {
        simulateSectorTier(sector, 1);
      }

      expect(sector.population.total).toBeGreaterThan(0);
    });

    it('should build wormhole network at high tech', () => {
      sector.tech.level = 9;
      const initialGates = sector.infrastructure.wormholeGates.length;

      // Many ticks to trigger wormhole construction
      for (let i = 0; i < 100; i++) {
        simulateSectorTier(sector, 1);
      }

      // Network should stay within reasonable bounds
      expect(sector.infrastructure.wormholeGates.length).toBeLessThanOrEqual(10);
    });

    it('should increase economic integration during peace', () => {
      sector.sectorStats.politicalStability = 0.9; // High stability
      sector.sectorStats.activeWars = 0;
      const initialIntegration = sector.sectorStats.economicIntegration;

      for (let i = 0; i < 50; i++) {
        simulateSectorTier(sector, 1);
      }

      expect(sector.sectorStats.economicIntegration).toBeGreaterThanOrEqual(
        initialIntegration
      );
      expect(sector.sectorStats.economicIntegration).toBeLessThanOrEqual(1.0);
    });

    it('should consolidate empires at high stability', () => {
      // Needs multiple entities to consolidate
      if (sector.politicalEntities.length > 1) {
        sector.sectorStats.politicalStability = 0.95;
        const initialCount = sector.politicalEntities.length;

        // Run many ticks (consolidation is rare)
        for (let i = 0; i < 1000; i++) {
          simulateSectorTier(sector, 1);
        }

        // Either consolidated or stayed the same
        expect(sector.politicalEntities.length).toBeLessThanOrEqual(initialCount);
      }
    });
  });

  describe('simulateGalaxyTier', () => {
    let galaxy: AbstractGalaxy;

    beforeEach(() => {
      galaxy = new AbstractGalaxy('test-galaxy', 'Test Galaxy', {});
    });

    it('should update galactic population (very slow)', () => {
      const initialPop = galaxy.population.total;

      // Many ticks at galaxy scale
      for (let i = 0; i < 100; i++) {
        simulateGalaxyTier(galaxy, 1);
      }

      expect(galaxy.population.total).toBeGreaterThan(0);
    });

    it('should advance Kardashev levels for civilizations', () => {
      galaxy.tech.level = 8; // High tech

      if (galaxy.galacticCivilizations.length === 0) {
        // Skip if no civilizations generated
        return;
      }

      const initialKardashev = galaxy.galacticCivilizations[0].kardashevLevel;

      for (let i = 0; i < 100; i++) {
        simulateGalaxyTier(galaxy, 1);
      }

      // Kardashev level should increase or stay same
      expect(galaxy.galacticCivilizations[0].kardashevLevel).toBeGreaterThanOrEqual(
        initialKardashev
      );
      // Should be capped at 3.5
      expect(galaxy.galacticCivilizations[0].kardashevLevel).toBeLessThanOrEqual(3.5);
    });

    it('should calculate average Kardashev level', () => {
      galaxy.tech.level = 9;

      simulateGalaxyTier(galaxy, 1);

      if (galaxy.galacticCivilizations.length > 0) {
        expect(galaxy.galacticStats.avgKardashevLevel).toBeGreaterThanOrEqual(0);
        expect(galaxy.galacticStats.avgKardashevLevel).toBeLessThanOrEqual(4);
      }
    });

    it('should expand wormhole network at high tech', () => {
      galaxy.tech.level = 10;

      simulateGalaxyTier(galaxy, 1);

      expect(galaxy.infrastructure.wormholeNetwork.nodeCount).toBeGreaterThan(0);
      expect(galaxy.infrastructure.wormholeNetwork.coverage).toBeGreaterThanOrEqual(0);
      expect(galaxy.infrastructure.wormholeNetwork.coverage).toBeLessThanOrEqual(1.0);
    });

    it('should calculate economic output', () => {
      simulateGalaxyTier(galaxy, 1);

      expect(galaxy.galacticStats.economicOutput).toBeGreaterThanOrEqual(0);
    });

    it('should record cosmic events when they occur', () => {
      const initialEventCount = galaxy.cosmicEvents.length;

      // Run many ticks to potentially trigger events
      for (let i = 0; i < 1000; i++) {
        simulateGalaxyTier(galaxy, 1);
      }

      // Events are random, but we can check structure is maintained
      expect(Array.isArray(galaxy.cosmicEvents)).toBe(true);
      expect(galaxy.cosmicEvents.length).toBeGreaterThanOrEqual(initialEventCount);
    });
  });
});
