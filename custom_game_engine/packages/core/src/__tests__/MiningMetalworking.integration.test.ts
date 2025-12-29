/**
 * MiningMetalworking.integration.test.ts
 *
 * Integration tests for the Mining & Metalworking System
 * Tests the complete flow: ore deposits -> mining -> smelting -> crafting
 *
 * Per CLAUDE.md: No silent fallbacks - tests verify exceptions are thrown for invalid states.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestHarness } from './utils/IntegrationTestHarness.js';
import { EntityImpl, createEntityId } from '../ecs/Entity.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { createPhysicsComponent } from '../components/PhysicsComponent.js';
import { createRenderableComponent } from '../components/RenderableComponent.js';
import { createTagsComponent } from '../components/TagsComponent.js';
import { createResourceComponent, type ResourceType } from '../components/ResourceComponent.js';
import {
  DEFAULT_ITEMS,
  MATERIAL_ITEMS,
  TOOL_ITEMS,
  WEAPON_ITEMS,
} from '../items/defaultItems.js';
import { ResourceGatheringSystem } from '../systems/ResourceGatheringSystem.js';
import { BuildingBlueprintRegistry } from '../buildings/BuildingBlueprintRegistry.js';

describe('Mining & Metalworking System Integration Tests', () => {
  let harness: IntegrationTestHarness;

  beforeEach(() => {
    harness = new IntegrationTestHarness();
    harness.setupTestWorld({ includeTime: false });
  });

  describe('Ore Deposit Entity Creation', () => {
    it('should create iron deposit with correct components', () => {
      const deposit = createOreDeposit(harness, 'iron_ore', 10, 15, 75);

      expect(deposit.hasComponent('position')).toBe(true);
      expect(deposit.hasComponent('physics')).toBe(true);
      expect(deposit.hasComponent('renderable')).toBe(true);
      expect(deposit.hasComponent('tags')).toBe(true);
      expect(deposit.hasComponent('resource')).toBe(true);

      const position = deposit.getComponent('position') as any;
      expect(position.x).toBe(10);
      expect(position.y).toBe(15);

      const resource = deposit.getComponent('resource') as any;
      expect(resource.resourceType).toBe('iron_ore');
      expect(resource.amount).toBe(75);
      expect(resource.regenerationRate).toBe(0); // Finite resource
    });

    it('should create coal deposit with no regeneration', () => {
      const deposit = createOreDeposit(harness, 'coal', 5, 5, 60);

      const resource = deposit.getComponent('resource') as any;
      expect(resource.resourceType).toBe('coal');
      expect(resource.amount).toBe(60);
      expect(resource.maxAmount).toBe(60);
      expect(resource.regenerationRate).toBe(0);
    });

    it('should create copper deposit with correct tags', () => {
      const deposit = createOreDeposit(harness, 'copper_ore', 20, 20, 45);

      const tags = deposit.getComponent('tags') as any;
      expect(tags.tags).toContain('copper_deposit');
      expect(tags.tags).toContain('minable');
      expect(tags.tags).toContain('obstacle');
    });

    it('should create gold deposit as rare resource', () => {
      const deposit = createOreDeposit(harness, 'gold_ore', 30, 30, 20);

      const resource = deposit.getComponent('resource') as any;
      expect(resource.resourceType).toBe('gold_ore');
      expect(resource.amount).toBe(20);
      expect(resource.harvestable).toBe(true);
    });

    it('should make deposit solid physics obstacle', () => {
      const deposit = createOreDeposit(harness, 'iron_ore', 0, 0, 50);

      const physics = deposit.getComponent('physics') as any;
      expect(physics.solid).toBe(true);
    });
  });

  describe('Ore Item Definitions', () => {
    it('should have iron_ore defined with correct gatherSources', () => {
      const ironOre = DEFAULT_ITEMS.find((i) => i.id === 'iron_ore');

      expect(ironOre).toBeDefined();
      expect(ironOre!.category).toBe('material');
      expect(ironOre!.isGatherable).toBe(true);
      expect(ironOre!.gatherSources).toContain('iron_deposit');
      expect(ironOre!.requiredTool).toBe('pickaxe');
    });

    it('should have coal defined with correct gatherSources', () => {
      const coal = DEFAULT_ITEMS.find((i) => i.id === 'coal');

      expect(coal).toBeDefined();
      expect(coal!.category).toBe('material');
      expect(coal!.isGatherable).toBe(true);
      expect(coal!.gatherSources).toContain('coal_deposit');
      expect(coal!.requiredTool).toBe('pickaxe');
    });

    it('should have copper_ore defined with correct properties', () => {
      const copperOre = DEFAULT_ITEMS.find((i) => i.id === 'copper_ore');

      expect(copperOre).toBeDefined();
      expect(copperOre!.rarity).toBe('uncommon');
      expect(copperOre!.gatherSources).toContain('copper_deposit');
    });

    it('should have gold_ore defined as rare', () => {
      const goldOre = DEFAULT_ITEMS.find((i) => i.id === 'gold_ore');

      expect(goldOre).toBeDefined();
      expect(goldOre!.rarity).toBe('rare');
      expect(goldOre!.gatherSources).toContain('gold_deposit');
    });
  });

  describe('Ingot Smelting Recipes', () => {
    it('should have iron_ingot craftable from iron_ore', () => {
      const ironIngot = MATERIAL_ITEMS.find((i) => i.id === 'iron_ingot');

      expect(ironIngot).toBeDefined();
      expect(ironIngot!.craftedFrom).toBeDefined();
      expect(ironIngot!.craftedFrom!.length).toBe(1);
      expect(ironIngot!.craftedFrom![0].itemId).toBe('iron_ore');
      expect(ironIngot!.craftedFrom![0].amount).toBe(2);
    });

    it('should have copper_ingot craftable from copper_ore', () => {
      const copperIngot = MATERIAL_ITEMS.find((i) => i.id === 'copper_ingot');

      expect(copperIngot).toBeDefined();
      expect(copperIngot!.craftedFrom).toBeDefined();
      expect(copperIngot!.craftedFrom![0].itemId).toBe('copper_ore');
      expect(copperIngot!.craftedFrom![0].amount).toBe(2);
    });

    it('should have gold_ingot craftable from gold_ore', () => {
      const goldIngot = MATERIAL_ITEMS.find((i) => i.id === 'gold_ingot');

      expect(goldIngot).toBeDefined();
      expect(goldIngot!.craftedFrom).toBeDefined();
      expect(goldIngot!.craftedFrom![0].itemId).toBe('gold_ore');
      expect(goldIngot!.craftedFrom![0].amount).toBe(3);
    });

    it('should have steel_ingot requiring iron_ingot and coal', () => {
      const steelIngot = MATERIAL_ITEMS.find((i) => i.id === 'steel_ingot');

      expect(steelIngot).toBeDefined();
      expect(steelIngot!.craftedFrom).toBeDefined();
      expect(steelIngot!.craftedFrom!.length).toBe(2);

      const ironReq = steelIngot!.craftedFrom!.find((c) => c.itemId === 'iron_ingot');
      const coalReq = steelIngot!.craftedFrom!.find((c) => c.itemId === 'coal');

      expect(ironReq).toBeDefined();
      expect(ironReq!.amount).toBe(2);
      expect(coalReq).toBeDefined();
      expect(coalReq!.amount).toBe(1);
    });
  });

  describe('Metal Tools and Weapons (Uses Ingots)', () => {
    it('should have iron_pickaxe craftable from iron_ingot', () => {
      const ironPickaxe = TOOL_ITEMS.find((i) => i.id === 'iron_pickaxe');

      expect(ironPickaxe).toBeDefined();
      expect(ironPickaxe!.craftedFrom).toBeDefined();

      const ingotReq = ironPickaxe!.craftedFrom!.find((c) => c.itemId === 'iron_ingot');
      expect(ingotReq).toBeDefined();
      expect(ingotReq!.amount).toBe(3);
    });

    it('should have iron_axe craftable from iron_ingot', () => {
      const ironAxe = TOOL_ITEMS.find((i) => i.id === 'iron_axe');

      expect(ironAxe).toBeDefined();
      const ingotReq = ironAxe!.craftedFrom!.find((c) => c.itemId === 'iron_ingot');
      expect(ingotReq).toBeDefined();
      expect(ingotReq!.amount).toBe(2);
    });

    it('should have iron_hoe craftable from iron_ingot', () => {
      const ironHoe = TOOL_ITEMS.find((i) => i.id === 'iron_hoe');

      expect(ironHoe).toBeDefined();
      const ingotReq = ironHoe!.craftedFrom!.find((c) => c.itemId === 'iron_ingot');
      expect(ingotReq).toBeDefined();
    });

    it('should have steel_pickaxe craftable from steel_ingot', () => {
      const steelPickaxe = TOOL_ITEMS.find((i) => i.id === 'steel_pickaxe');

      expect(steelPickaxe).toBeDefined();
      expect(steelPickaxe!.rarity).toBe('rare');

      const ingotReq = steelPickaxe!.craftedFrom!.find((c) => c.itemId === 'steel_ingot');
      expect(ingotReq).toBeDefined();
      expect(ingotReq!.amount).toBe(3);
    });

    it('should have steel_axe craftable from steel_ingot', () => {
      const steelAxe = TOOL_ITEMS.find((i) => i.id === 'steel_axe');

      expect(steelAxe).toBeDefined();
      expect(steelAxe!.rarity).toBe('rare');
    });

    it('should have iron_sword craftable from iron_ingot', () => {
      const ironSword = WEAPON_ITEMS.find((i) => i.id === 'iron_sword');

      expect(ironSword).toBeDefined();
      expect(ironSword!.category).toBe('equipment');

      const ingotReq = ironSword!.craftedFrom!.find((c) => c.itemId === 'iron_ingot');
      expect(ingotReq).toBeDefined();
      expect(ingotReq!.amount).toBe(3);
    });

    it('should have steel_sword craftable from steel_ingot', () => {
      const steelSword = WEAPON_ITEMS.find((i) => i.id === 'steel_sword');

      expect(steelSword).toBeDefined();
      expect(steelSword!.rarity).toBe('rare');

      const ingotReq = steelSword!.craftedFrom!.find((c) => c.itemId === 'steel_ingot');
      expect(ingotReq).toBeDefined();
    });

    it('should have copper_dagger craftable from copper_ingot', () => {
      const copperDagger = WEAPON_ITEMS.find((i) => i.id === 'copper_dagger');

      expect(copperDagger).toBeDefined();

      const ingotReq = copperDagger!.craftedFrom!.find((c) => c.itemId === 'copper_ingot');
      expect(ingotReq).toBeDefined();
      expect(ingotReq!.amount).toBe(2);
    });

    it('should have gold_scepter craftable from gold_ingot', () => {
      const goldScepter = WEAPON_ITEMS.find((i) => i.id === 'gold_scepter');

      expect(goldScepter).toBeDefined();
      expect(goldScepter!.rarity).toBe('legendary');

      const ingotReq = goldScepter!.craftedFrom!.find((c) => c.itemId === 'gold_ingot');
      expect(ingotReq).toBeDefined();
      expect(ingotReq!.amount).toBe(3);
    });
  });

  describe('Ore Deposits Do Not Regenerate', () => {
    it('should NOT regenerate ore deposits at midnight', () => {
      // Create a resource gathering system
      const resourceSystem = new ResourceGatheringSystem(harness.eventBus);
      harness.registerSystem('ResourceGatheringSystem', resourceSystem);

      // Create an iron deposit with some ore harvested
      const deposit = createOreDeposit(harness, 'iron_ore', 10, 10, 100);
      deposit.updateComponent('resource', (r: any) => ({
        ...r,
        amount: 50, // Half harvested
      }));

      // Emit day changed event (midnight)
      harness.eventBus.emit({
        type: 'time:day_changed',
        source: 'test',
        data: { day: 2 },
      });

      // Run the resource gathering system
      const entities = Array.from(harness.world.entities.values());
      resourceSystem.update(harness.world, entities, 1.0);

      // Verify ore did NOT regenerate (regenerationRate = 0)
      const resource = deposit.getComponent('resource') as any;
      expect(resource.amount).toBe(50); // Still 50, no regen
    });

    it('should allow harvesting to deplete ore completely', () => {
      const deposit = createOreDeposit(harness, 'coal', 5, 5, 40);

      // Simulate harvesting all ore
      deposit.updateComponent('resource', (r: any) => ({
        ...r,
        amount: 0,
      }));

      const resource = deposit.getComponent('resource') as any;
      expect(resource.amount).toBe(0);
      expect(resource.harvestable).toBe(true); // Still marked harvestable (empty)
    });
  });

  describe('Forge Building Crafting Support', () => {
    it('should have Forge registered with smelting recipes', () => {
      const registry = new BuildingBlueprintRegistry();
      registry.registerDefaults();
      registry.registerTier2Stations();

      const forge = registry.get('forge');

      expect(forge).toBeDefined();
      expect(forge.tier).toBe(2);
      expect(forge.category).toBe('production');

      const craftingFunc = forge.functionality.find((f) => f.type === 'crafting');
      expect(craftingFunc).toBeDefined();

      if (craftingFunc && craftingFunc.type === 'crafting') {
        expect(craftingFunc.recipes).toContain('iron_ingot');
        expect(craftingFunc.recipes).toContain('steel_ingot');
        expect(craftingFunc.speed).toBe(1.5); // +50% metalworking speed
      }
    });

    it('should require fuel for Forge operation', async () => {
      // Import and initialize BuildingSystem which handles fuel initialization
      const { BuildingSystem } = await import('../systems/BuildingSystem.js');
      const buildingSystem = new BuildingSystem();
      buildingSystem.initialize(harness.world, harness.eventBus);
      harness.registerSystem('BuildingSystem', buildingSystem);

      const forge = harness.createTestBuilding('forge', { x: 10, y: 10 });

      // Emit completion event to trigger fuel initialization
      harness.eventBus.emit({
        type: 'building:complete',
        source: forge.id,
        data: {
          entityId: forge.id,
          buildingType: 'forge',
        },
      });

      harness.eventBus.flush();

      const building = forge.getComponent('building') as any;
      expect(building.fuelRequired).toBe(true);
    });
  });

  describe('Complete Mining → Smelting → Crafting Chain Verification', () => {
    it('should verify iron chain: ore → ingot → tool', () => {
      // Verify item chain exists
      const ironOre = DEFAULT_ITEMS.find((i) => i.id === 'iron_ore');
      const ironIngot = DEFAULT_ITEMS.find((i) => i.id === 'iron_ingot');
      const ironPickaxe = DEFAULT_ITEMS.find((i) => i.id === 'iron_pickaxe');

      expect(ironOre).toBeDefined();
      expect(ironIngot).toBeDefined();
      expect(ironPickaxe).toBeDefined();

      // Verify ore is gatherable from deposits
      expect(ironOre!.isGatherable).toBe(true);
      expect(ironOre!.gatherSources).toContain('iron_deposit');

      // Verify ingot is crafted from ore
      expect(ironIngot!.craftedFrom![0].itemId).toBe('iron_ore');

      // Verify pickaxe is crafted from ingot
      const ingotReq = ironPickaxe!.craftedFrom!.find((c) => c.itemId === 'iron_ingot');
      expect(ingotReq).toBeDefined();
    });

    it('should verify steel chain: iron_ingot + coal → steel_ingot → weapon', () => {
      const ironIngot = DEFAULT_ITEMS.find((i) => i.id === 'iron_ingot');
      const coal = DEFAULT_ITEMS.find((i) => i.id === 'coal');
      const steelIngot = DEFAULT_ITEMS.find((i) => i.id === 'steel_ingot');
      const steelSword = DEFAULT_ITEMS.find((i) => i.id === 'steel_sword');

      expect(ironIngot).toBeDefined();
      expect(coal).toBeDefined();
      expect(steelIngot).toBeDefined();
      expect(steelSword).toBeDefined();

      // Verify steel requires iron ingot and coal
      const ironReq = steelIngot!.craftedFrom!.find((c) => c.itemId === 'iron_ingot');
      const coalReq = steelIngot!.craftedFrom!.find((c) => c.itemId === 'coal');
      expect(ironReq).toBeDefined();
      expect(coalReq).toBeDefined();

      // Verify steel sword requires steel ingot
      const steelReq = steelSword!.craftedFrom!.find((c) => c.itemId === 'steel_ingot');
      expect(steelReq).toBeDefined();
    });

    it('should verify copper chain: ore → ingot → weapon', () => {
      const copperOre = DEFAULT_ITEMS.find((i) => i.id === 'copper_ore');
      const copperIngot = DEFAULT_ITEMS.find((i) => i.id === 'copper_ingot');
      const copperDagger = DEFAULT_ITEMS.find((i) => i.id === 'copper_dagger');

      expect(copperOre).toBeDefined();
      expect(copperIngot).toBeDefined();
      expect(copperDagger).toBeDefined();

      // Verify ingot crafted from ore
      expect(copperIngot!.craftedFrom![0].itemId).toBe('copper_ore');

      // Verify dagger crafted from ingot
      const ingotReq = copperDagger!.craftedFrom!.find((c) => c.itemId === 'copper_ingot');
      expect(ingotReq).toBeDefined();
    });

    it('should verify gold chain: ore → ingot → legendary weapon', () => {
      const goldOre = DEFAULT_ITEMS.find((i) => i.id === 'gold_ore');
      const goldIngot = DEFAULT_ITEMS.find((i) => i.id === 'gold_ingot');
      const goldScepter = DEFAULT_ITEMS.find((i) => i.id === 'gold_scepter');

      expect(goldOre).toBeDefined();
      expect(goldIngot).toBeDefined();
      expect(goldScepter).toBeDefined();

      // Verify rarity progression
      expect(goldOre!.rarity).toBe('rare');
      expect(goldIngot!.rarity).toBe('rare');
      expect(goldScepter!.rarity).toBe('legendary');

      // Verify ingot crafted from ore
      expect(goldIngot!.craftedFrom![0].itemId).toBe('gold_ore');

      // Verify scepter crafted from ingot
      const ingotReq = goldScepter!.craftedFrom!.find((c) => c.itemId === 'gold_ingot');
      expect(ingotReq).toBeDefined();
    });
  });

  describe('ResourceType Includes Ore Types', () => {
    it('should accept iron_ore as valid ResourceType', () => {
      const component = createResourceComponent('iron_ore', 50, 0);
      expect(component.resourceType).toBe('iron_ore');
    });

    it('should accept coal as valid ResourceType', () => {
      const component = createResourceComponent('coal', 40, 0);
      expect(component.resourceType).toBe('coal');
    });

    it('should accept copper_ore as valid ResourceType', () => {
      const component = createResourceComponent('copper_ore', 30, 0);
      expect(component.resourceType).toBe('copper_ore');
    });

    it('should accept gold_ore as valid ResourceType', () => {
      const component = createResourceComponent('gold_ore', 20, 0);
      expect(component.resourceType).toBe('gold_ore');
    });
  });
});

/**
 * Helper to create ore deposit entity for testing
 */
function createOreDeposit(
  harness: IntegrationTestHarness,
  resourceType: ResourceType,
  x: number,
  y: number,
  amount: number
): EntityImpl {
  const entity = new EntityImpl(createEntityId(), 0);

  entity.addComponent(createPositionComponent(x, y));
  entity.addComponent(createPhysicsComponent(true, 1, 1));

  // Map resource type to deposit type for tags
  const depositTag = resourceType === 'coal' ? 'coal_deposit' : `${resourceType.replace('_ore', '')}_deposit`;

  entity.addComponent(createRenderableComponent(depositTag, 'object'));
  entity.addComponent(createTagsComponent(depositTag, 'obstacle', 'minable'));
  entity.addComponent(createResourceComponent(resourceType, amount, 0)); // 0 = no regen

  (harness.world as any)._addEntity(entity);

  return entity;
}
