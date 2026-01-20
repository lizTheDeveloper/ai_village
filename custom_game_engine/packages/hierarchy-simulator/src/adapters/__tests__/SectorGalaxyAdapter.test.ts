/**
 * Tests for Sector and Galaxy tier adapters
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SectorTierAdapter, SectorConfig } from '../SectorTierAdapter.js';
import { GalaxyTierAdapter, GalaxyConfig } from '../GalaxyTierAdapter.js';
import { AbstractSystem } from '../../abstraction/AbstractSystem.js';
import { AbstractSector } from '../../abstraction/AbstractSector.js';
import { AbstractGalaxy } from '../../abstraction/AbstractGalaxy.js';

describe('SectorTierAdapter', () => {
  let testSystems: AbstractSystem[];
  let sectorConfig: SectorConfig;

  beforeEach(() => {
    // Create test systems
    testSystems = [];
    for (let i = 0; i < 10; i++) {
      const system = new AbstractSystem(
        `test_system_${i}`,
        `Test System ${i}`,
        { gigasegment: 0, megasegment: 0 }
      );

      // Set varying tech levels
      system.tech.level = 7 + Math.floor(i / 3); // 7-10
      system.population.total = 1e9 * (i + 1); // 1-10 billion

      testSystems.push(system);
    }

    sectorConfig = {
      id: 'test_sector',
      name: 'Test Sector',
      address: { gigasegment: 0 },
      galacticCoords: { x: 10000, y: 5000, z: 100 },
    };
  });

  it('should create sector from multiple systems', () => {
    const sector = SectorTierAdapter.convertSystemsToSectorTier(testSystems, sectorConfig);

    expect(sector).toBeDefined();
    expect(sector.id).toBe('test_sector');
    expect(sector.name).toBe('Test Sector');
    expect(sector.tier).toBe('sector');
    expect(sector.children.length).toBe(10);
  });

  it('should aggregate population correctly', () => {
    const sector = SectorTierAdapter.convertSystemsToSectorTier(testSystems, sectorConfig);

    const expectedPopulation = testSystems.reduce((sum, s) => sum + s.population.total, 0);
    expect(sector.population.total).toBe(expectedPopulation);
  });

  it('should calculate max tech level', () => {
    const sector = SectorTierAdapter.convertSystemsToSectorTier(testSystems, sectorConfig);

    const maxTech = Math.max(...testSystems.map(s => s.tech.level));
    expect(sector.tech.level).toBe(maxTech);
  });

  it('should build wormhole network for FTL systems', () => {
    const sector = SectorTierAdapter.convertSystemsToSectorTier(testSystems, sectorConfig);

    // Count FTL-capable systems (tech level 9+)
    const ftlCount = testSystems.filter(s => s.tech.level >= 9).length;

    if (ftlCount >= 2) {
      expect(sector.infrastructure.wormholeGates.length).toBeGreaterThan(0);
    }
  });

  it('should identify political entities', () => {
    const sector = SectorTierAdapter.convertSystemsToSectorTier(testSystems, sectorConfig);

    expect(sector.politicalEntities.length).toBeGreaterThan(0);

    for (const entity of sector.politicalEntities) {
      expect(entity.id).toContain('test_sector');
      expect(entity.controlledSystems.length).toBeGreaterThan(0);
      expect(entity.population).toBeGreaterThan(0);
    }
  });

  it('should get sector resources summary', () => {
    const sector = SectorTierAdapter.convertSystemsToSectorTier(testSystems, sectorConfig);
    const resources = SectorTierAdapter.getSectorResources(sector);

    expect(resources.totalPopulation).toBeGreaterThan(0);
    expect(resources.systemCount).toBe(10);
    expect(resources.maxTechLevel).toBeGreaterThanOrEqual(7);
    expect(resources.spacefaringCount).toBeGreaterThan(0);
  });

  it('should throw error if systems array is empty', () => {
    expect(() => {
      SectorTierAdapter.convertSystemsToSectorTier([], sectorConfig);
    }).toThrow('systems array cannot be empty');
  });

  it('should throw error if systems parameter is null', () => {
    expect(() => {
      SectorTierAdapter.convertSystemsToSectorTier(null as any, sectorConfig);
    }).toThrow('systems parameter is required');
  });
});

describe('GalaxyTierAdapter', () => {
  let testSectors: AbstractSector[];
  let galaxyConfig: GalaxyConfig;

  beforeEach(() => {
    // Create test sectors (each with a few systems)
    testSectors = [];
    for (let i = 0; i < 100; i++) {
      const sector = new AbstractSector(
        `test_sector_${i}`,
        `Test Sector ${i}`,
        { gigasegment: 0, megasegment: i }
      );

      // Set varying tech levels
      sector.tech.level = 8 + Math.floor(i / 25); // 8-11
      sector.population.total = 1e11 * (i + 1); // 100B - 10T

      // Add some systems as children
      for (let j = 0; j < 5; j++) {
        const system = new AbstractSystem(
          `test_system_${i}_${j}`,
          `Test System ${i}-${j}`,
          { gigasegment: 0, megasegment: i }
        );
        system.tech.level = sector.tech.level;
        system.population.total = sector.population.total / 5;
        sector.addChild(system);
      }

      testSectors.push(sector);
    }

    galaxyConfig = {
      id: 'test_galaxy',
      name: 'Test Galaxy',
      address: { gigasegment: 0 },
      galaxyType: 'spiral',
    };
  });

  it('should create galaxy from multiple sectors', () => {
    const galaxy = GalaxyTierAdapter.convertSectorsToGalaxyTier(testSectors, galaxyConfig);

    expect(galaxy).toBeDefined();
    expect(galaxy.id).toBe('test_galaxy');
    expect(galaxy.name).toBe('Test Galaxy');
    expect(galaxy.tier).toBe('galaxy');
    expect(galaxy.structure.type).toBe('spiral');
    expect(galaxy.children.length).toBe(100);
  });

  it('should aggregate population correctly', () => {
    const galaxy = GalaxyTierAdapter.convertSectorsToGalaxyTier(testSectors, galaxyConfig);

    const expectedPopulation = testSectors.reduce((sum, s) => sum + s.population.total, 0);
    expect(galaxy.population.total).toBe(expectedPopulation);
  });

  it('should calculate max tech level', () => {
    const galaxy = GalaxyTierAdapter.convertSectorsToGalaxyTier(testSectors, galaxyConfig);

    const maxTech = Math.max(...testSectors.map(s => s.tech.level));
    expect(galaxy.tech.level).toBe(maxTech);
  });

  it('should identify galactic civilizations', () => {
    const galaxy = GalaxyTierAdapter.convertSectorsToGalaxyTier(testSectors, galaxyConfig);

    // With 100 advanced sectors, should have civilizations
    expect(galaxy.galacticCivilizations.length).toBeGreaterThan(0);

    for (const civ of galaxy.galacticCivilizations) {
      expect(civ.id).toContain('test_galaxy');
      expect(civ.controlledSectors.length).toBeGreaterThan(0);
      expect(civ.population).toBeGreaterThan(0);
      expect(civ.kardashevLevel).toBeGreaterThanOrEqual(2.0);
    }
  });

  it('should identify megastructures', () => {
    const galaxy = GalaxyTierAdapter.convertSectorsToGalaxyTier(testSectors, galaxyConfig);

    const megastructures = GalaxyTierAdapter.getAllMegastructures(galaxy);

    // With advanced civilizations, should have megastructures
    if (galaxy.galacticCivilizations.length > 0) {
      expect(megastructures.length).toBeGreaterThan(0);
    }
  });

  it('should get galaxy resources summary', () => {
    const galaxy = GalaxyTierAdapter.convertSectorsToGalaxyTier(testSectors, galaxyConfig);
    const resources = GalaxyTierAdapter.getGalaxyResources(galaxy);

    expect(resources.totalPopulation).toBeGreaterThan(0);
    expect(resources.totalSectors).toBe(100);
    expect(resources.totalSystems).toBe(500); // 100 sectors * 5 systems
    expect(resources.maxTechLevel).toBeGreaterThanOrEqual(8);
    expect(resources.activeCivilizations).toBeGreaterThanOrEqual(0);
  });

  it('should calculate average Kardashev level', () => {
    const galaxy = GalaxyTierAdapter.convertSectorsToGalaxyTier(testSectors, galaxyConfig);
    const resources = GalaxyTierAdapter.getGalaxyResources(galaxy);

    if (galaxy.galacticCivilizations.length > 0) {
      expect(resources.avgKardashevLevel).toBeGreaterThanOrEqual(2.0);
      expect(resources.avgKardashevLevel).toBeLessThanOrEqual(4.0);
    }
  });

  it('should establish galactic governance if conditions met', () => {
    const galaxy = GalaxyTierAdapter.convertSectorsToGalaxyTier(testSectors, galaxyConfig);

    // Governance is probabilistic, so we just check it's either defined or undefined
    if (galaxy.governance) {
      expect(galaxy.governance.type).toBeDefined();
      expect(galaxy.governance.memberCivilizations.length).toBeGreaterThan(0);
    }
  });

  it('should throw error if sectors array is empty', () => {
    expect(() => {
      GalaxyTierAdapter.convertSectorsToGalaxyTier([], galaxyConfig);
    }).toThrow('sectors array cannot be empty');
  });

  it('should throw error if sectors parameter is null', () => {
    expect(() => {
      GalaxyTierAdapter.convertSectorsToGalaxyTier(null as any, galaxyConfig);
    }).toThrow('sectors parameter is required');
  });
});

describe('Integration: System -> Sector -> Galaxy', () => {
  it('should create galaxy from systems through sectors', () => {
    // Create 10 systems
    const systems: AbstractSystem[] = [];
    for (let i = 0; i < 10; i++) {
      const system = new AbstractSystem(
        `system_${i}`,
        `System ${i}`,
        { gigasegment: 0, megasegment: 0 }
      );
      system.tech.level = 8 + Math.floor(i / 3);
      system.population.total = 1e9 * (i + 1);
      systems.push(system);
    }

    // Create sector from systems
    const sectorConfig: SectorConfig = {
      id: 'sector_0',
      name: 'Sector 0',
      address: { gigasegment: 0 },
      galacticCoords: { x: 10000, y: 5000, z: 100 },
    };
    const sector = SectorTierAdapter.convertSystemsToSectorTier(systems, sectorConfig);

    // Create more sectors for galaxy
    const sectors: AbstractSector[] = [sector];
    for (let i = 1; i < 15; i++) {
      const s = new AbstractSector(
        `sector_${i}`,
        `Sector ${i}`,
        { gigasegment: 0, megasegment: i }
      );
      s.tech.level = 9;
      s.population.total = 1e11;
      sectors.push(s);
    }

    // Create galaxy from sectors
    const galaxyConfig: GalaxyConfig = {
      id: 'galaxy_0',
      name: 'Test Galaxy',
      address: { gigasegment: 0 },
      galaxyType: 'spiral',
    };
    const galaxy = GalaxyTierAdapter.convertSectorsToGalaxyTier(sectors, galaxyConfig);

    // Verify hierarchy
    expect(galaxy.tier).toBe('galaxy');
    expect(galaxy.children.length).toBe(15);
    expect(galaxy.children[0].tier).toBe('sector');
    expect((galaxy.children[0] as AbstractSector).children.length).toBe(10);
    expect((galaxy.children[0] as AbstractSector).children[0].tier).toBe('system');
  });
});
