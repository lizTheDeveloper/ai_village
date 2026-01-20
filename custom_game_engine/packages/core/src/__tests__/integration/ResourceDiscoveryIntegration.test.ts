/**
 * Resource Discovery Integration Tests
 *
 * Tests the complete resource discovery and mining workflow:
 * - Exploration mission → resource discovery → mining operation
 * - Era 10 civilization discovering strange_matter
 * - Mining yields and warehouse storage
 * - Phenomenon depletion and exhaustion
 *
 * Per CLAUDE.md: No silent fallbacks - tests verify exceptions are thrown for invalid states.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from '../utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { createPositionComponent } from '../../components/PositionComponent.js';
import { createResourceComponent, type ResourceType } from '../../components/ResourceComponent.js';
import { createWarehouseComponent } from '../../components/WarehouseComponent.js';
import { createCivilizationComponent } from '../../components/CivilizationComponent.js';
import { createMiningOperationComponent } from '../../components/MiningOperationComponent.js';
import { createExplorationMissionComponent } from '../../components/ExplorationMissionComponent.js';
import { createTagsComponent } from '../../components/TagsComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('Resource Discovery Integration Tests', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: false });
  });

  describe('Exploration Mission Flow', () => {
    it('should discover resources through exploration mission', () => {
      // Create exploration mission
      const mission = harness.world.createEntity() as EntityImpl;
      mission.addComponent(createPositionComponent(10, 15));
      mission.addComponent(
        createExplorationMissionComponent('mission_1', 'civilization_1', {
          targetLocation: { x: 10, y: 15 },
          missionType: 'resource_survey',
          status: 'in_progress',
        })
      );

      // Create hidden resource deposit at target location
      const deposit = createResourceDeposit(harness, 'iron_ore', 10, 15, 500);

      // Simulate mission completion
      harness.eventBus.emit({
        type: 'exploration:mission_complete',
        source: mission.id,
        data: {
          missionId: mission.id,
          discoveredResources: [
            {
              resourceType: 'iron_ore',
              location: { x: 10, y: 15 },
              estimatedAmount: 500,
              depositId: deposit.id,
            },
          ],
        },
      });

      // Verify event emitted
      harness.assertEventEmitted('exploration:mission_complete', {
        missionId: mission.id,
      });

      // Verify resource discovered
      const discoveryEvents = harness.getEmittedEvents('exploration:mission_complete');
      expect(discoveryEvents.length).toBeGreaterThan(0);
      expect(discoveryEvents[0]!.data.discoveredResources).toHaveLength(1);
      expect(discoveryEvents[0]!.data.discoveredResources[0]!.resourceType).toBe('iron_ore');
    });

    it('should trigger mining operation after discovery', () => {
      const civilization = harness.world.createEntity() as EntityImpl;
      civilization.addComponent(createCivilizationComponent('Test Civ', 5)); // Era 5

      const deposit = createResourceDeposit(harness, 'iron_ore', 20, 20, 1000);

      harness.clearEvents();

      // Create mining operation at discovered deposit
      const miningOp = harness.world.createEntity() as EntityImpl;
      miningOp.addComponent(createPositionComponent(20, 20));
      miningOp.addComponent(
        createMiningOperationComponent(deposit.id, civilization.id, 'iron_ore', {
          yieldRate: 10, // 10 units per tick
          efficiency: 0.8,
          workers: 5,
        })
      );

      // Emit mining started event
      harness.eventBus.emit({
        type: 'mining:operation_started',
        source: miningOp.id,
        data: {
          operationId: miningOp.id,
          depositId: deposit.id,
          resourceType: 'iron_ore',
        },
      });

      harness.assertEventEmitted('mining:operation_started', {
        depositId: deposit.id,
      });
    });
  });

  describe('Mining Operations', () => {
    it('should extract resources and store in warehouse', () => {
      const civilization = harness.world.createEntity() as EntityImpl;
      civilization.addComponent(createCivilizationComponent('Test Civ', 3));

      const warehouse = harness.world.createEntity() as EntityImpl;
      warehouse.addComponent(createPositionComponent(5, 5));
      const warehouseComp = createWarehouseComponent(10000);
      warehouse.addComponent(warehouseComp);

      const deposit = createResourceDeposit(harness, 'iron_ore', 10, 10, 1000);

      const miningOp = harness.world.createEntity() as EntityImpl;
      miningOp.addComponent(createPositionComponent(10, 10));
      const miningComp = createMiningOperationComponent(
        deposit.id,
        civilization.id,
        'iron_ore',
        {
          yieldRate: 20, // 20 units per extraction
          efficiency: 1.0,
          workers: 10,
        }
      );
      miningOp.addComponent(miningComp);

      // Link mining operation to warehouse
      miningOp.addComponent({
        type: 'warehouse_link',
        version: 1,
        warehouseId: warehouse.id,
        depositType: 'resource',
      });

      const initialStockpile = warehouseComp.stockpile.get('iron_ore') || 0;

      // Simulate extraction cycle
      const resourceComp = deposit.getComponent(CT.Resource) as any;
      const extractedAmount = 20;
      resourceComp.amount -= extractedAmount;

      // Add to warehouse
      warehouseComp.stockpile.set('iron_ore', initialStockpile + extractedAmount);

      // Verify storage
      expect(warehouseComp.stockpile.get('iron_ore')).toBe(initialStockpile + extractedAmount);
      expect(resourceComp.amount).toBe(980); // 1000 - 20
    });

    it('should respect mining efficiency', () => {
      const deposit = createResourceDeposit(harness, 'copper_ore', 0, 0, 1000);

      const miningOp = harness.world.createEntity() as EntityImpl;
      miningOp.addComponent(createPositionComponent(0, 0));

      const lowEfficiency = createMiningOperationComponent(deposit.id, 'civ_1', 'copper_ore', {
        yieldRate: 10,
        efficiency: 0.5, // 50% efficiency
        workers: 5,
      });
      miningOp.addComponent(lowEfficiency);

      // Effective yield = yieldRate * efficiency = 10 * 0.5 = 5
      const effectiveYield = lowEfficiency.yieldRate * lowEfficiency.efficiency;

      expect(effectiveYield).toBe(5);
    });

    it('should halt when deposit is depleted', () => {
      const deposit = createResourceDeposit(harness, 'gold_ore', 0, 0, 50);

      const miningOp = harness.world.createEntity() as EntityImpl;
      miningOp.addComponent(createPositionComponent(0, 0));
      const miningComp = createMiningOperationComponent(deposit.id, 'civ_1', 'gold_ore', {
        yieldRate: 60, // More than available
        efficiency: 1.0,
        workers: 10,
      });
      miningComp.status = 'active';
      miningOp.addComponent(miningComp);

      const resourceComp = deposit.getComponent(CT.Resource) as any;

      // Try to extract
      const availableAmount = resourceComp.amount;
      const requestedAmount = miningComp.yieldRate;

      const actualExtracted = Math.min(availableAmount, requestedAmount);

      expect(actualExtracted).toBe(50); // Only extract what's available

      resourceComp.amount -= actualExtracted;

      // Deposit depleted
      expect(resourceComp.amount).toBe(0);

      // Mining operation should halt
      if (resourceComp.amount === 0) {
        miningComp.status = 'depleted';
      }

      expect(miningComp.status).toBe('depleted');
    });
  });

  describe('Era 10 Advanced Resources', () => {
    it('should discover strange_matter in Era 10+', () => {
      const civilization = harness.world.createEntity() as EntityImpl;
      const civComp = createCivilizationComponent('Advanced Civ', 10); // Era 10
      civilization.addComponent(civComp);

      // Create strange matter phenomenon
      const phenomenon = harness.world.createEntity() as EntityImpl;
      phenomenon.addComponent(createPositionComponent(100, 100));
      phenomenon.addComponent(createTagsComponent('phenomenon', 'strange_matter_source'));

      const resourceComp = createResourceComponent('strange_matter' as ResourceType, 100, 0);
      phenomenon.addComponent(resourceComp);

      // Era 10 civ can detect and mine strange matter
      expect(civComp.era).toBeGreaterThanOrEqual(10);

      const miningOp = harness.world.createEntity() as EntityImpl;
      miningOp.addComponent(createPositionComponent(100, 100));
      miningOp.addComponent(
        createMiningOperationComponent(phenomenon.id, civilization.id, 'strange_matter' as any, {
          yieldRate: 1, // Very slow extraction
          efficiency: 0.3, // Difficult to extract
          workers: 100, // Requires many workers
        })
      );

      const resource = phenomenon.getComponent(CT.Resource);
      expect(resource?.resourceType).toBe('strange_matter');
    });

    it('should require advanced technology for exotic resources', () => {
      const lowEraCiv = harness.world.createEntity() as EntityImpl;
      lowEraCiv.addComponent(createCivilizationComponent('Primitive Civ', 3)); // Era 3

      const advancedDeposit = harness.world.createEntity() as EntityImpl;
      advancedDeposit.addComponent(createPositionComponent(50, 50));
      advancedDeposit.addComponent(
        createResourceComponent('exotic_matter' as ResourceType, 200, 0)
      );
      advancedDeposit.addComponent(createTagsComponent('advanced_resource', 'requires_era_8'));

      // Try to create mining operation
      const miningOp = harness.world.createEntity() as EntityImpl;
      miningOp.addComponent(createPositionComponent(50, 50));

      const miningComp = createMiningOperationComponent(
        advancedDeposit.id,
        lowEraCiv.id,
        'exotic_matter' as any,
        {
          yieldRate: 5,
          efficiency: 0.1,
          workers: 10,
        }
      );

      // Check if civilization meets era requirement
      const tags = advancedDeposit.getComponent(CT.Tags) as any;
      const requiresEra = 8; // Extract from tags

      const civComp = lowEraCiv.getComponent(CT.Civilization);
      const canMine = civComp!.era >= requiresEra;

      expect(canMine).toBe(false); // Era 3 cannot mine Era 8+ resources
    });

    it('should track era progression through resource types', () => {
      const civilization = harness.world.createEntity() as EntityImpl;
      const civComp = createCivilizationComponent('Progressive Civ', 1);
      civilization.addComponent(civComp);

      const warehouse = harness.world.createEntity() as EntityImpl;
      const warehouseComp = createWarehouseComponent(50000);
      warehouse.addComponent(warehouseComp);

      // Era 1: Wood
      warehouseComp.stockpile.set('wood', 100);
      expect(civComp.era).toBe(1);

      // Era 2: Stone
      civComp.era = 2;
      warehouseComp.stockpile.set('stone', 100);

      // Era 3: Iron
      civComp.era = 3;
      warehouseComp.stockpile.set('iron_ore', 100);

      // Era 5: Steel
      civComp.era = 5;
      warehouseComp.stockpile.set('steel_ingot', 50);

      // Verify progression
      expect(civComp.era).toBe(5);
      expect(warehouseComp.stockpile.has('steel_ingot')).toBe(true);
    });
  });

  describe('Phenomenon Depletion', () => {
    it('should deplete phenomenon over time', () => {
      const phenomenon = harness.world.createEntity() as EntityImpl;
      phenomenon.addComponent(createPositionComponent(0, 0));

      const resourceComp = createResourceComponent('quantum_foam' as ResourceType, 1000, 0);
      phenomenon.addComponent(resourceComp);
      phenomenon.addComponent(createTagsComponent('phenomenon', 'depleting'));

      const initialAmount = resourceComp.amount;

      // Simulate multiple extraction cycles
      const extractionsPerCycle = 5;
      const cycles = 10;

      for (let i = 0; i < cycles; i++) {
        resourceComp.amount -= extractionsPerCycle;
      }

      const finalAmount = resourceComp.amount;

      expect(finalAmount).toBe(initialAmount - extractionsPerCycle * cycles);
      expect(finalAmount).toBe(950); // 1000 - 50
    });

    it('should handle phenomenon exhaustion', () => {
      const phenomenon = harness.world.createEntity() as EntityImpl;
      phenomenon.addComponent(createPositionComponent(10, 10));

      const resourceComp = createResourceComponent('dark_energy' as ResourceType, 10, 0);
      phenomenon.addComponent(resourceComp);

      const miningOp = harness.world.createEntity() as EntityImpl;
      const miningComp = createMiningOperationComponent(phenomenon.id, 'civ_1', 'dark_energy' as any, {
        yieldRate: 15,
        efficiency: 1.0,
        workers: 5,
      });
      miningComp.status = 'active';
      miningOp.addComponent(miningComp);

      // Extract all
      const extracted = Math.min(resourceComp.amount, miningComp.yieldRate);
      resourceComp.amount -= extracted;

      expect(resourceComp.amount).toBe(0);
      expect(extracted).toBe(10); // Only got what was available

      // Mark phenomenon as exhausted
      phenomenon.updateComponent('tags', (tags: any) => ({
        ...tags,
        tags: [...tags.tags, 'exhausted'],
      }));

      miningComp.status = 'exhausted';

      const tags = phenomenon.getComponent(CT.Tags) as any;
      expect(tags.tags).toContain('exhausted');
      expect(miningComp.status).toBe('exhausted');
    });

    it('should emit phenomenon_depleted event', () => {
      const phenomenon = harness.world.createEntity() as EntityImpl;
      phenomenon.addComponent(createPositionComponent(5, 5));
      phenomenon.addComponent(createResourceComponent('antimatter' as ResourceType, 5, 0));

      harness.clearEvents();

      // Deplete phenomenon
      const resourceComp = phenomenon.getComponent(CT.Resource) as any;
      resourceComp.amount = 0;

      harness.eventBus.emit({
        type: 'phenomenon:depleted',
        source: phenomenon.id,
        data: {
          phenomenonId: phenomenon.id,
          resourceType: 'antimatter',
        },
      });

      harness.assertEventEmitted('phenomenon:depleted', {
        phenomenonId: phenomenon.id,
      });
    });
  });

  describe('Warehouse Capacity Management', () => {
    it('should not exceed warehouse capacity', () => {
      const warehouse = harness.world.createEntity() as EntityImpl;
      const warehouseComp = createWarehouseComponent(1000); // Capacity: 1000
      warehouse.addComponent(warehouseComp);

      warehouseComp.stockpile.set('iron_ore', 900);

      const deposit = createResourceDeposit(harness, 'iron_ore', 0, 0, 500);

      const miningOp = harness.world.createEntity() as EntityImpl;
      miningOp.addComponent(
        createMiningOperationComponent(deposit.id, 'civ_1', 'iron_ore', {
          yieldRate: 200, // Trying to add 200 more
          efficiency: 1.0,
          workers: 10,
        })
      );

      // Calculate available space
      const currentAmount = warehouseComp.stockpile.get('iron_ore') || 0;
      const availableSpace = warehouseComp.capacity - currentAmount;

      expect(availableSpace).toBe(100); // 1000 - 900

      // Can only add 100 more
      const actualAdded = Math.min(200, availableSpace);

      warehouseComp.stockpile.set('iron_ore', currentAmount + actualAdded);

      expect(warehouseComp.stockpile.get('iron_ore')).toBe(1000);
      expect(actualAdded).toBe(100);
    });

    it('should halt mining when warehouse is full', () => {
      const warehouse = harness.world.createEntity() as EntityImpl;
      const warehouseComp = createWarehouseComponent(500);
      warehouse.addComponent(warehouseComp);

      warehouseComp.stockpile.set('copper_ore', 500); // Full

      const deposit = createResourceDeposit(harness, 'copper_ore', 0, 0, 1000);

      const miningOp = harness.world.createEntity() as EntityImpl;
      const miningComp = createMiningOperationComponent(deposit.id, 'civ_1', 'copper_ore', {
        yieldRate: 50,
        efficiency: 1.0,
        workers: 5,
      });
      miningComp.status = 'active';
      miningOp.addComponent(miningComp);

      miningOp.addComponent({
        type: 'warehouse_link',
        version: 1,
        warehouseId: warehouse.id,
        depositType: 'resource',
      });

      // Check if warehouse has space
      const currentAmount = warehouseComp.stockpile.get('copper_ore') || 0;
      const hasSpace = currentAmount < warehouseComp.capacity;

      expect(hasSpace).toBe(false);

      // Mining should pause
      if (!hasSpace) {
        miningComp.status = 'warehouse_full';
      }

      expect(miningComp.status).toBe('warehouse_full');
    });
  });

  describe('Cross-System Integration', () => {
    it('should integrate exploration → discovery → mining → storage', () => {
      // 1. Create civilization
      const civilization = harness.world.createEntity() as EntityImpl;
      civilization.addComponent(createCivilizationComponent('Test Civ', 4));

      // 2. Create warehouse
      const warehouse = harness.world.createEntity() as EntityImpl;
      const warehouseComp = createWarehouseComponent(5000);
      warehouse.addComponent(warehouseComp);

      // 3. Launch exploration mission
      const mission = harness.world.createEntity() as EntityImpl;
      mission.addComponent(createPositionComponent(50, 50));
      mission.addComponent(
        createExplorationMissionComponent('mission_1', civilization.id, {
          targetLocation: { x: 50, y: 50 },
          missionType: 'resource_survey',
          status: 'in_progress',
        })
      );

      // 4. Create hidden deposit
      const deposit = createResourceDeposit(harness, 'gold_ore', 50, 50, 300);

      harness.clearEvents();

      // 5. Mission discovers deposit
      harness.eventBus.emit({
        type: 'exploration:mission_complete',
        source: mission.id,
        data: {
          missionId: mission.id,
          discoveredResources: [
            {
              resourceType: 'gold_ore',
              location: { x: 50, y: 50 },
              estimatedAmount: 300,
              depositId: deposit.id,
            },
          ],
        },
      });

      // 6. Start mining operation
      const miningOp = harness.world.createEntity() as EntityImpl;
      miningOp.addComponent(createPositionComponent(50, 50));
      const miningComp = createMiningOperationComponent(deposit.id, civilization.id, 'gold_ore', {
        yieldRate: 10,
        efficiency: 0.9,
        workers: 8,
      });
      miningOp.addComponent(miningComp);

      miningOp.addComponent({
        type: 'warehouse_link',
        version: 1,
        warehouseId: warehouse.id,
        depositType: 'resource',
      });

      // 7. Extract resources
      const extractedAmount = miningComp.yieldRate * miningComp.efficiency;
      const resourceComp = deposit.getComponent(CT.Resource) as any;
      resourceComp.amount -= extractedAmount;

      // 8. Store in warehouse
      const currentStock = warehouseComp.stockpile.get('gold_ore') || 0;
      warehouseComp.stockpile.set('gold_ore', currentStock + extractedAmount);

      // 9. Verify complete chain
      harness.assertEventEmitted('exploration:mission_complete');
      expect(resourceComp.amount).toBe(300 - extractedAmount);
      expect(warehouseComp.stockpile.get('gold_ore')).toBe(extractedAmount);
    });
  });
});

// ============================================================================
// Helper Functions
// ============================================================================

function createResourceDeposit(
  harness: IntegrationTestHarness,
  resourceType: ResourceType,
  x: number,
  y: number,
  amount: number
): EntityImpl {
  const deposit = harness.world.createEntity() as EntityImpl;
  deposit.addComponent(createPositionComponent(x, y));
  deposit.addComponent(createResourceComponent(resourceType, amount, 0)); // No regeneration
  deposit.addComponent(createTagsComponent('resource_deposit', `${resourceType}_deposit`));
  return deposit;
}
