/**
 * Component Registration Tests
 *
 * Tests that all Phase 1-4 components are properly registered and functional:
 * - Components can be created
 * - Components have correct type strings
 * - Components can be added to entities
 * - Components can be queried
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../World.js';
import { ComponentType as CT } from '../types/ComponentType.js';

// Phase 1
import {
  createCityGovernanceComponent,
  type CityGovernanceComponent,
} from '../components/CityGovernanceComponent.js';

// Phase 2
import {
  createDynastyComponent,
  type DynastyComponent,
} from '../components/DynastyComponent.js';
import {
  createFederationGovernanceComponent,
  type FederationGovernanceComponent,
} from '../components/FederationGovernanceComponent.js';
import {
  createGalacticCouncilComponent,
  type GalacticCouncilComponent,
} from '../components/GalacticCouncilComponent.js';

// Phase 3
import {
  createTradeNetworkComponent,
  type TradeNetworkComponent,
} from '../components/TradeNetworkComponent.js';
import {
  createBlockadeComponent,
  type BlockadeComponent,
} from '../components/BlockadeComponent.js';
import {
  createExplorationMissionComponent,
  type ExplorationMissionComponent,
} from '../components/ExplorationMissionComponent.js';
import {
  createMiningOperationComponent,
  type MiningOperationComponent,
} from '../components/MiningOperationComponent.js';

// Phase 4
import {
  createCausalChainComponent,
  type CausalChainComponent,
} from '../components/CausalChainComponent.js';
import {
  createTimelineMergerOperation,
  type TimelineMergerOperationComponent,
} from '../components/TimelineMergerOperationComponent.js';
import {
  createInvasionComponent,
  type InvasionComponent,
} from '../components/InvasionComponent.js';

describe('Component Registration - Phase 1-4', () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  describe('Phase 1: City Governance', () => {
    it('should create CityGovernanceComponent with correct type', () => {
      const component = createCityGovernanceComponent('test-city', 'Test City', 0);

      expect(component.type).toBe('city_governance');
      expect(component.type).toBe(CT.CityGovernance);
      expect(component.cityId).toBe('test-city');
      expect(component.cityName).toBe('Test City');
    });

    it('should add CityGovernanceComponent to entity', () => {
      const entity = world.createEntity();
      const component = createCityGovernanceComponent('test-city', 'Test City', 0);

      entity.addComponent(component);

      expect(entity.hasComponent(CT.CityGovernance)).toBe(true);
      const retrieved = entity.getComponent<CityGovernanceComponent>(CT.CityGovernance);
      expect(retrieved).toBeDefined();
      expect(retrieved.cityId).toBe('test-city');
    });

    it('should query entities with CityGovernanceComponent', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      entity1.addComponent(createCityGovernanceComponent('city-1', 'City 1', 0));

      const results = world.query().with(CT.CityGovernance).executeEntities();

      expect(results.length).toBe(1);
      expect(results[0].id).toBe(entity1.id);
    });
  });

  describe('Phase 2: Dynasty & Higher Governance', () => {
    it('should create DynastyComponent with correct type', () => {
      const component = createDynastyComponent('test-dynasty', 'Test Dynasty', 'heir', 0);

      expect(component.type).toBe('dynasty');
      expect(component.type).toBe(CT.Dynasty);
      expect(component.dynastyId).toBe('test-dynasty');
    });

    it('should create FederationGovernanceComponent with correct type', () => {
      const component = createFederationGovernanceComponent('Test Federation', 0);

      expect(component.type).toBe('federation_governance');
      expect(component.type).toBe(CT.FederationGovernance);
      expect(component.name).toBe('Test Federation');
    });

    it('should create GalacticCouncilComponent with correct type', () => {
      const component = createGalacticCouncilComponent('Test Council', 0);

      expect(component.type).toBe('galactic_council');
      expect(component.type).toBe(CT.GalacticCouncil);
      expect(component.name).toBe('Test Council');
    });

    it('should add Dynasty components to entities', () => {
      const entity = world.createEntity();
      const component = createDynastyComponent('test-dynasty', 'Test Dynasty', 'ruler', 0);

      entity.addComponent(component);

      expect(entity.hasComponent(CT.Dynasty)).toBe(true);
      const retrieved = entity.getComponent<DynastyComponent>(CT.Dynasty);
      expect(retrieved.position).toBe('ruler');
    });
  });

  describe('Phase 3: Trade & Logistics', () => {
    it('should create TradeNetworkComponent with correct type', () => {
      const component = createTradeNetworkComponent('test-network', 'Test Network', 'planet', 'planet-1');

      expect(component.type).toBe('trade_network');
      expect(component.type).toBe(CT.TradeNetwork);
      expect(component.networkId).toBe('test-network');
    });

    it('should create BlockadeComponent with correct type', () => {
      const component = createBlockadeComponent('test-blockade', 'node-1', 'network-1', 'fleet-1', 'faction-1', 0);

      expect(component.type).toBe('blockade');
      expect(component.type).toBe(CT.Blockade);
      expect(component.blockadeId).toBe('test-blockade');
    });

    it('should create ExplorationMissionComponent with correct type', () => {
      const component = createExplorationMissionComponent(
        'ship-1',
        'target-1',
        'planet',
        'survey',
        { x: 0, y: 0, z: 0 },
        'civ-1',
        0
      );

      expect(component.type).toBe('exploration_mission');
      expect(component.type).toBe(CT.ExplorationMission);
      expect(component.shipId).toBe('ship-1');
    });

    it('should create MiningOperationComponent with correct type', () => {
      const component = createMiningOperationComponent('location-1', 'planet', 'iron', 'civ-1', 0);

      expect(component.type).toBe('mining_operation');
      expect(component.type).toBe(CT.MiningOperation);
      expect(component.locationId).toBe('location-1');
    });

    it('should query entities with trade components', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();

      entity1.addComponent(createTradeNetworkComponent('net-1', 'Network 1', 'planet', 'planet-1'));

      entity2.addComponent(createBlockadeComponent('blockade-1', 'node-1', 'network-1', 'fleet-1', 'faction-1', 0));

      const networkResults = world.query().with(CT.TradeNetwork).executeEntities();
      const blockadeResults = world.query().with(CT.Blockade).executeEntities();

      expect(networkResults.length).toBe(1);
      expect(blockadeResults.length).toBe(1);
      expect(networkResults[0].id).toBe(entity1.id);
      expect(blockadeResults[0].id).toBe(entity2.id);
    });
  });

  describe('Phase 4: Multiverse & Timeline', () => {
    it('should create CausalChainComponent with correct type', () => {
      const component = createCausalChainComponent('universe-1', 0, 'entity_creation');

      expect(component.type).toBe('causal_chain');
      expect(component.type).toBe(CT.CausalChain);
      expect(component.originUniverseId).toBe('universe-1');
    });

    it('should create TimelineMergerOperationComponent with correct type', () => {
      const component = createTimelineMergerOperation('ship-1', 'universe-1', 'universe-2', 0);

      expect(component.type).toBe('timeline_merger_operation');
      expect(component.type).toBe(CT.TimelineMergerOperation);
      expect(component.sourceUniverseId).toBe('universe-1');
    });

    it('should create InvasionComponent with correct type', () => {
      const component = createInvasionComponent('universe-1');

      expect(component.type).toBe('invasion');
      expect(component.type).toBe(CT.Invasion);
      expect(component.universeId).toBe('universe-1');
    });

    it('should add multiverse components to entities', () => {
      const entity = world.createEntity();
      const component = createCausalChainComponent('universe-1', 0, 'entity_creation');

      entity.addComponent(component);

      expect(entity.hasComponent(CT.CausalChain)).toBe(true);
      const retrieved = entity.getComponent<CausalChainComponent>(CT.CausalChain);
      expect(retrieved.originUniverseId).toBe('universe-1');
    });

    it('should query entities with multiverse components', () => {
      const entity1 = world.createEntity();
      const entity2 = world.createEntity();
      const entity3 = world.createEntity();

      entity1.addComponent(createCausalChainComponent('universe-1', 0, 'entity_creation'));

      entity2.addComponent(createTimelineMergerOperation('ship-1', 'universe-1', 'universe-2', 0));

      entity3.addComponent(createInvasionComponent('universe-1'));

      const causalResults = world.query().with(CT.CausalChain).executeEntities();
      const mergerResults = world.query().with(CT.TimelineMergerOperation).executeEntities();
      const invasionResults = world.query().with(CT.Invasion).executeEntities();

      expect(causalResults.length).toBe(1);
      expect(mergerResults.length).toBe(1);
      expect(invasionResults.length).toBe(1);
    });
  });

  describe('Cross-Phase Integration', () => {
    it('should query entities with multiple phase components', () => {
      const entity = world.createEntity();

      // Add components from different phases
      entity.addComponent(createCityGovernanceComponent('city-1', 'City 1', 0));

      entity.addComponent(createDynastyComponent('dynasty-1', 'Dynasty 1', 'heir', 0));

      entity.addComponent(createTradeNetworkComponent('network-1', 'Network 1', 'planet', 'planet-1'));

      // Query with multiple components
      const results = world
        .query()
        .with(CT.CityGovernance)
        .with(CT.Dynasty)
        .with(CT.TradeNetwork)
        .executeEntities();

      expect(results.length).toBe(1);
      expect(results[0].id).toBe(entity.id);
    });

    it('should handle component removal', () => {
      const entity = world.createEntity();

      entity.addComponent(createCityGovernanceComponent('city-1', 'City 1', 0));

      expect(entity.hasComponent(CT.CityGovernance)).toBe(true);

      entity.removeComponent(CT.CityGovernance);

      expect(entity.hasComponent(CT.CityGovernance)).toBe(false);
    });

    it('should verify all components have unique type strings', () => {
      const types = [
        CT.CityGovernance,
        CT.Dynasty,
        CT.FederationGovernance,
        CT.GalacticCouncil,
        CT.TradeNetwork,
        CT.Blockade,
        CT.ExplorationMission,
        CT.MiningOperation,
        CT.CausalChain,
        CT.TimelineMergerOperation,
        CT.Invasion,
      ];

      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });
  });
});
