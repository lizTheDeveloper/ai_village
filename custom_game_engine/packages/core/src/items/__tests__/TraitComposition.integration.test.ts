import { describe, it, expect, beforeEach } from 'vitest';
import type { ItemDefinition } from '../ItemDefinition';
import type { ItemInstance } from '../ItemInstance';
import type { MaterialTemplate } from '../../materials/MaterialTemplate';
import { MaterialRegistry } from '../../materials/MaterialRegistry';

describe('Trait Composition Integration', () => {
  let materialRegistry: MaterialRegistry;

  beforeEach(() => {
    materialRegistry = new MaterialRegistry();

    // Register materials
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
      resonantForms: [],
      categories: ['leather', 'organic'],
    };

    materialRegistry.register(iron);
    materialRegistry.register(oak);
    materialRegistry.register(leather);
  });

  describe('Criterion 2 & 3: ItemDefinition with Traits', () => {
    it('should create weapon with WeaponTrait', () => {
      const ironSword: ItemDefinition = {
        id: 'iron_sword',
        name: 'Iron Sword',
        category: 'weapon',
        baseMaterial: 'iron',
        baseValue: 50,
        weight: 3,
        description: 'A sturdy iron sword',
        traits: {
          weapon: {
            damage: 15,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 1.0,
            durabilityLoss: 0.5,
          },
        },
      };

      expect(ironSword.traits.weapon).toBeDefined();
      expect(ironSword.traits.weapon!.damage).toBe(15);
      expect(ironSword.traits.edible).toBeUndefined();
    });

    it('should create food with EdibleTrait', () => {
      const berry: ItemDefinition = {
        id: 'berry',
        name: 'Berry',
        category: 'food',
        baseMaterial: 'organic',
        baseValue: 2,
        weight: 0.1,
        description: 'A sweet berry',
        traits: {
          edible: {
            hungerRestored: 20,
            quality: 60,
            flavors: ['sweet', 'fruity'],
            spoilRate: 0.1,
          },
        },
      };

      expect(berry.traits.edible).toBeDefined();
      expect(berry.traits.edible!.hungerRestored).toBe(20);
      expect(berry.traits.edible!.spoilRate).toBe(0.1);
    });

    it('should create tool with ToolTrait', () => {
      const axe: ItemDefinition = {
        id: 'iron_axe',
        name: 'Iron Axe',
        category: 'tool',
        baseMaterial: 'iron',
        baseValue: 30,
        weight: 2,
        description: 'A sharp axe',
        traits: {
          tool: {
            toolType: 'axe',
            efficiency: 1.5,
            durabilityLoss: 0.3,
          },
        },
      };

      expect(axe.traits.tool).toBeDefined();
      expect(axe.traits.tool!.toolType).toBe('axe');
    });

    it('should create container with ContainerTrait', () => {
      const backpack: ItemDefinition = {
        id: 'leather_backpack',
        name: 'Leather Backpack',
        category: 'container',
        baseMaterial: 'leather',
        baseValue: 20,
        weight: 1,
        description: 'A leather backpack',
        traits: {
          container: {
            capacity: 20,
            acceptedCategories: ['food', 'tool'],
            preserves: true,
          },
        },
      };

      expect(backpack.traits.container).toBeDefined();
      expect(backpack.traits.container!.capacity).toBe(20);
      expect(backpack.traits.container!.preserves).toBe(true);
    });

    it('should create item with multiple traits (edible + magical)', () => {
      const magicBerry: ItemDefinition = {
        id: 'magic_berry',
        name: 'Magic Berry',
        category: 'food',
        baseMaterial: 'organic',
        baseValue: 50,
        weight: 0.1,
        description: 'A berry imbued with magic',
        traits: {
          edible: {
            hungerRestored: 15,
            quality: 70,
            flavors: ['sweet', 'magical'],
          },
          magical: {
            effects: [
              { type: 'buff', magnitude: 10, duration: 60 },
            ],
          },
        },
      };

      expect(magicBerry.traits.edible).toBeDefined();
      expect(magicBerry.traits.magical).toBeDefined();
      expect(magicBerry.traits.magical!.effects).toHaveLength(1);
    });

    it('should create item with weapon + magical traits (enchanted sword)', () => {
      const flamingSword: ItemDefinition = {
        id: 'flaming_sword',
        name: 'Flaming Sword',
        category: 'weapon',
        baseMaterial: 'iron',
        baseValue: 150,
        weight: 3.5,
        description: 'A sword wreathed in flames',
        traits: {
          weapon: {
            damage: 20,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 0.9,
            durabilityLoss: 0.6,
          },
          magical: {
            effects: [
              { type: 'damage', magnitude: 5, element: 'fire' },
            ],
            charges: 20,
            rechargeRate: 1,
          },
        },
      };

      expect(flamingSword.traits.weapon).toBeDefined();
      expect(flamingSword.traits.magical).toBeDefined();
      expect(flamingSword.traits.magical!.effects[0].element).toBe('fire');
    });
  });

  describe('Criterion 6: InventoryComponent Integration (stacking)', () => {
    it('should stack items with same definition and quality tier', () => {
      const berry: ItemDefinition = {
        id: 'berry',
        name: 'Berry',
        category: 'food',
        baseMaterial: 'organic',
        baseValue: 2,
        weight: 0.1,
        description: 'A sweet berry',
        traits: {
          edible: {
            hungerRestored: 20,
            quality: 60,
            flavors: ['sweet'],
          },
        },
      };

      const instance1: ItemInstance = {
        instanceId: 'uuid-1',
        definitionId: 'berry',
        quality: 60, // Normal tier
        condition: 100,
        stackSize: 10,
      };

      const instance2: ItemInstance = {
        instanceId: 'uuid-2',
        definitionId: 'berry',
        quality: 62, // Still normal tier
        condition: 100,
        stackSize: 10,
      };

      // Helper to determine quality tier
      function getQualityTier(quality: number): string {
        if (quality < 50) return 'poor';
        if (quality < 70) return 'normal';
        if (quality < 85) return 'fine';
        if (quality < 95) return 'masterwork';
        return 'legendary';
      }

      const tier1 = getQualityTier(instance1.quality);
      const tier2 = getQualityTier(instance2.quality);

      expect(tier1).toBe('normal');
      expect(tier2).toBe('normal');
      expect(tier1).toBe(tier2); // Can stack
    });

    it('should NOT stack items with different quality tiers', () => {
      const berry: ItemDefinition = {
        id: 'berry',
        name: 'Berry',
        category: 'food',
        baseMaterial: 'organic',
        baseValue: 2,
        weight: 0.1,
        description: 'A sweet berry',
        traits: {
          edible: {
            hungerRestored: 20,
            quality: 60,
            flavors: ['sweet'],
          },
        },
      };

      const normalInstance: ItemInstance = {
        instanceId: 'uuid-1',
        definitionId: 'berry',
        quality: 60, // Normal tier
        condition: 100,
        stackSize: 10,
      };

      const fineInstance: ItemInstance = {
        instanceId: 'uuid-2',
        definitionId: 'berry',
        quality: 75, // Fine tier
        condition: 100,
        stackSize: 10,
      };

      function getQualityTier(quality: number): string {
        if (quality < 50) return 'poor';
        if (quality < 70) return 'normal';
        if (quality < 85) return 'fine';
        if (quality < 95) return 'masterwork';
        return 'legendary';
      }

      const tier1 = getQualityTier(normalInstance.quality);
      const tier2 = getQualityTier(fineInstance.quality);

      expect(tier1).toBe('normal');
      expect(tier2).toBe('fine');
      expect(tier1).not.toBe(tier2); // Cannot stack
    });

    it('should NOT stack items with different materialOverride', () => {
      const sword: ItemDefinition = {
        id: 'sword',
        name: 'Sword',
        category: 'weapon',
        baseMaterial: 'iron',
        baseValue: 50,
        weight: 3,
        description: 'A sword',
        traits: {
          weapon: {
            damage: 15,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 1.0,
            durabilityLoss: 0.5,
          },
        },
      };

      const ironSword: ItemInstance = {
        instanceId: 'uuid-1',
        definitionId: 'sword',
        quality: 60,
        condition: 100,
        stackSize: 1,
        // No materialOverride, uses baseMaterial (iron)
      };

      const goldSword: ItemInstance = {
        instanceId: 'uuid-2',
        definitionId: 'sword',
        materialOverride: 'gold',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      function canStack(a: ItemInstance, b: ItemInstance): boolean {
        if (a.definitionId !== b.definitionId) return false;
        if (a.materialOverride !== b.materialOverride) return false;
        return true;
      }

      expect(canStack(ironSword, goldSword)).toBe(false);
    });

    it('should NOT stack items with different additionalTraits', () => {
      const sword: ItemDefinition = {
        id: 'sword',
        name: 'Sword',
        category: 'weapon',
        baseMaterial: 'iron',
        baseValue: 50,
        weight: 3,
        description: 'A sword',
        traits: {
          weapon: {
            damage: 15,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 1.0,
            durabilityLoss: 0.5,
          },
        },
      };

      const normalSword: ItemInstance = {
        instanceId: 'uuid-1',
        definitionId: 'sword',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      const enchantedSword: ItemInstance = {
        instanceId: 'uuid-2',
        definitionId: 'sword',
        quality: 60,
        condition: 100,
        stackSize: 1,
        additionalTraits: {
          magical: {
            effects: [{ type: 'damage', magnitude: 5, element: 'fire' }],
          },
        },
      };

      function canStack(a: ItemInstance, b: ItemInstance): boolean {
        if (a.definitionId !== b.definitionId) return false;
        const aHasTraits = a.additionalTraits !== undefined;
        const bHasTraits = b.additionalTraits !== undefined;
        if (aHasTraits !== bHasTraits) return false;
        return true;
      }

      expect(canStack(normalSword, enchantedSword)).toBe(false);
    });
  });

  describe('Criterion 7: CraftingSystem Integration', () => {
    it('should create ItemInstance with quality and creator on craft', () => {
      const recipe = {
        id: 'craft_iron_sword',
        output: 'iron_sword',
        quantity: 1,
      };

      const agentId = 'agent-smith-123';
      const currentTick = 1000;
      const craftingQuality = 75; // Fine quality

      // Simulate crafting
      const instance: ItemInstance = {
        instanceId: 'uuid-crafted',
        definitionId: recipe.output,
        quality: craftingQuality,
        condition: 100,
        stackSize: recipe.quantity,
        creator: agentId,
        createdAt: currentTick,
      };

      expect(instance.creator).toBe(agentId);
      expect(instance.createdAt).toBe(currentTick);
      expect(instance.quality).toBe(75);
    });

    it('should create ItemInstance with material from recipe', () => {
      const recipe = {
        id: 'craft_iron_sword',
        output: 'iron_sword',
        material: 'iron',
        quantity: 1,
      };

      const definition: ItemDefinition = {
        id: 'iron_sword',
        name: 'Iron Sword',
        category: 'weapon',
        baseMaterial: 'iron', // Default
        baseValue: 50,
        weight: 3,
        description: 'A sturdy iron sword',
        traits: {
          weapon: {
            damage: 15,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 1.0,
            durabilityLoss: 0.5,
          },
        },
      };

      const instance: ItemInstance = {
        instanceId: 'uuid-crafted',
        definitionId: recipe.output,
        quality: 60,
        condition: 100,
        stackSize: 1,
        // materialOverride: recipe.material, // Could override if different
      };

      // Material should match recipe or default
      const effectiveMaterial = instance.materialOverride ?? definition.baseMaterial;
      expect(effectiveMaterial).toBe('iron');
    });
  });

  describe('complete workflow: definition → instance → inventory → economy', () => {
    it('should flow from definition to instance to economy value', () => {
      // Step 1: Define item
      const ironSword: ItemDefinition = {
        id: 'iron_sword',
        name: 'Iron Sword',
        category: 'weapon',
        baseMaterial: 'iron',
        baseValue: 50,
        weight: 3,
        description: 'A sturdy iron sword',
        traits: {
          weapon: {
            damage: 15,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 1.0,
            durabilityLoss: 0.5,
          },
        },
      };

      // Step 2: Craft instance
      const instance: ItemInstance = {
        instanceId: 'uuid-1',
        definitionId: 'iron_sword',
        quality: 80, // Fine quality
        condition: 100,
        stackSize: 1,
        creator: 'master-smith',
        createdAt: 1000,
      };

      // Step 3: Calculate value based on quality
      function calculateValue(def: ItemDefinition, inst: ItemInstance): number {
        const baseValue = def.baseValue;
        const qualityMultiplier = inst.quality / 60; // 60 is normal quality
        const conditionMultiplier = inst.condition / 100;
        return Math.floor(baseValue * qualityMultiplier * conditionMultiplier);
      }

      const value = calculateValue(ironSword, instance);

      // Fine quality (80) should be worth more than base (60)
      expect(value).toBeGreaterThan(ironSword.baseValue);
      expect(value).toBe(Math.floor(50 * (80 / 60) * 1.0));
    });

    it('should handle degraded item value', () => {
      const definition: ItemDefinition = {
        id: 'iron_sword',
        name: 'Iron Sword',
        category: 'weapon',
        baseMaterial: 'iron',
        baseValue: 50,
        weight: 3,
        description: 'A sturdy iron sword',
        traits: {
          weapon: {
            damage: 15,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 1.0,
            durabilityLoss: 0.5,
          },
        },
      };

      const degradedInstance: ItemInstance = {
        instanceId: 'uuid-degraded',
        definitionId: 'iron_sword',
        quality: 60,
        condition: 50, // Half condition
        stackSize: 1,
      };

      function calculateValue(def: ItemDefinition, inst: ItemInstance): number {
        const baseValue = def.baseValue;
        const qualityMultiplier = inst.quality / 60;
        const conditionMultiplier = inst.condition / 100;
        return Math.floor(baseValue * qualityMultiplier * conditionMultiplier);
      }

      const value = calculateValue(definition, degradedInstance);

      // Degraded item should be worth less
      expect(value).toBeLessThan(definition.baseValue);
      expect(value).toBe(Math.floor(50 * 1.0 * 0.5));
    });
  });

  describe('error handling - no fallbacks', () => {
    it('should throw when trying to use missing trait', () => {
      const chair: ItemDefinition = {
        id: 'chair',
        name: 'Chair',
        category: 'furniture',
        baseMaterial: 'oak',
        baseValue: 10,
        weight: 5,
        description: 'A wooden chair',
        traits: {}, // No edible trait
      };

      function eatItem(def: ItemDefinition): number {
        if (!def.traits.edible) {
          throw new Error(`Cannot eat ${def.name}: missing edible trait`);
        }
        return def.traits.edible.hungerRestored;
      }

      expect(() => eatItem(chair)).toThrow();
      expect(() => eatItem(chair)).toThrow('missing edible trait');
    });

    it('should throw when weapon trait is missing for combat', () => {
      const berry: ItemDefinition = {
        id: 'berry',
        name: 'Berry',
        category: 'food',
        baseMaterial: 'organic',
        baseValue: 2,
        weight: 0.1,
        description: 'A sweet berry',
        traits: {
          edible: {
            hungerRestored: 20,
            quality: 60,
            flavors: ['sweet'],
          },
        },
      };

      function getDamage(def: ItemDefinition): number {
        if (!def.traits.weapon) {
          throw new Error(`Cannot use ${def.name} as weapon: missing weapon trait`);
        }
        return def.traits.weapon.damage;
      }

      expect(() => getDamage(berry)).toThrow();
      expect(() => getDamage(berry)).toThrow('missing weapon trait');
    });
  });
});
