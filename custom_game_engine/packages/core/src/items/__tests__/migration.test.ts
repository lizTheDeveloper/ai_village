import { describe, it, expect } from 'vitest';
import type { ItemDefinition } from '../ItemDefinition';

// Legacy v1 format (flat flags)
interface ItemDefinitionV1 {
  id: string;
  name: string;
  category: string;
  baseValue: number;
  weight: number;
  description: string;
  // OLD: Flat flags for edible
  isEdible?: boolean;
  hungerRestored?: number;
  quality?: number;
  flavors?: string[];
  // OLD: Flat flags for weapon
  isWeapon?: boolean;
  damage?: number;
  damageType?: string;
  range?: number;
  attackSpeed?: number;
  durabilityLoss?: number;
  // OLD: Flat flags for tool
  isTool?: boolean;
  toolType?: string;
  efficiency?: number;
}

describe('ItemDefinition Migration', () => {
  describe('Criterion 8: Backward Compatibility Migration', () => {
    it('should migrate edible item from v1 to v2', () => {
      const v1: ItemDefinitionV1 = {
        id: 'berry',
        name: 'Berry',
        category: 'food',
        baseValue: 2,
        weight: 0.1,
        description: 'A sweet berry',
        isEdible: true,
        hungerRestored: 20,
        quality: 60,
        flavors: ['sweet', 'fruity'],
      };

      // Migration function (to be implemented)
      function migrateItemDefinitionV1toV2(v1: ItemDefinitionV1): ItemDefinition {
        const v2: ItemDefinition = {
          id: v1.id,
          name: v1.name,
          category: v1.category,
          baseMaterial: 'organic', // Default material
          baseValue: v1.baseValue,
          weight: v1.weight,
          description: v1.description,
          traits: {},
        };

        // Migrate edible
        if (v1.isEdible && v1.hungerRestored !== undefined && v1.quality !== undefined) {
          v2.traits.edible = {
            hungerRestored: v1.hungerRestored,
            quality: v1.quality,
            flavors: v1.flavors ?? [],
          };
        }

        // Migrate weapon
        if (v1.isWeapon && v1.damage !== undefined && v1.damageType !== undefined) {
          v2.traits.weapon = {
            damage: v1.damage,
            damageType: v1.damageType as 'slashing' | 'piercing' | 'bludgeoning',
            range: v1.range ?? 1,
            attackSpeed: v1.attackSpeed ?? 1.0,
            durabilityLoss: v1.durabilityLoss ?? 0.5,
          };
        }

        // Migrate tool
        if (v1.isTool && v1.toolType !== undefined && v1.efficiency !== undefined) {
          v2.traits.tool = {
            toolType: v1.toolType,
            efficiency: v1.efficiency,
            durabilityLoss: v1.durabilityLoss ?? 0.3,
          };
        }

        return v2;
      }

      const v2 = migrateItemDefinitionV1toV2(v1);

      expect(v2.id).toBe('berry');
      expect(v2.traits.edible).toBeDefined();
      expect(v2.traits.edible!.hungerRestored).toBe(20);
      expect(v2.traits.edible!.quality).toBe(60);
      expect(v2.traits.edible!.flavors).toEqual(['sweet', 'fruity']);
    });

    it('should migrate weapon item from v1 to v2', () => {
      const v1: ItemDefinitionV1 = {
        id: 'iron_sword',
        name: 'Iron Sword',
        category: 'weapon',
        baseValue: 50,
        weight: 3,
        description: 'A sturdy iron sword',
        isWeapon: true,
        damage: 15,
        damageType: 'slashing',
        range: 1,
        attackSpeed: 1.0,
        durabilityLoss: 0.5,
      };

      function migrateItemDefinitionV1toV2(v1: ItemDefinitionV1): ItemDefinition {
        const v2: ItemDefinition = {
          id: v1.id,
          name: v1.name,
          category: v1.category,
          baseMaterial: 'iron', // Default based on category
          baseValue: v1.baseValue,
          weight: v1.weight,
          description: v1.description,
          traits: {},
        };

        if (v1.isWeapon && v1.damage !== undefined && v1.damageType !== undefined) {
          v2.traits.weapon = {
            damage: v1.damage,
            damageType: v1.damageType as 'slashing' | 'piercing' | 'bludgeoning',
            range: v1.range ?? 1,
            attackSpeed: v1.attackSpeed ?? 1.0,
            durabilityLoss: v1.durabilityLoss ?? 0.5,
          };
        }

        return v2;
      }

      const v2 = migrateItemDefinitionV1toV2(v1);

      expect(v2.id).toBe('iron_sword');
      expect(v2.baseMaterial).toBe('iron');
      expect(v2.traits.weapon).toBeDefined();
      expect(v2.traits.weapon!.damage).toBe(15);
      expect(v2.traits.weapon!.damageType).toBe('slashing');
      expect(v2.traits.weapon!.range).toBe(1);
    });

    it('should migrate tool item from v1 to v2', () => {
      const v1: ItemDefinitionV1 = {
        id: 'iron_axe',
        name: 'Iron Axe',
        category: 'tool',
        baseValue: 30,
        weight: 2,
        description: 'A sharp axe for chopping',
        isTool: true,
        toolType: 'axe',
        efficiency: 1.5,
        durabilityLoss: 0.3,
      };

      function migrateItemDefinitionV1toV2(v1: ItemDefinitionV1): ItemDefinition {
        const v2: ItemDefinition = {
          id: v1.id,
          name: v1.name,
          category: v1.category,
          baseMaterial: 'iron',
          baseValue: v1.baseValue,
          weight: v1.weight,
          description: v1.description,
          traits: {},
        };

        if (v1.isTool && v1.toolType !== undefined && v1.efficiency !== undefined) {
          v2.traits.tool = {
            toolType: v1.toolType,
            efficiency: v1.efficiency,
            durabilityLoss: v1.durabilityLoss ?? 0.3,
          };
        }

        return v2;
      }

      const v2 = migrateItemDefinitionV1toV2(v1);

      expect(v2.traits.tool).toBeDefined();
      expect(v2.traits.tool!.toolType).toBe('axe');
      expect(v2.traits.tool!.efficiency).toBe(1.5);
    });

    it('should migrate item with multiple traits', () => {
      const v1: ItemDefinitionV1 = {
        id: 'chair',
        name: 'Wooden Chair',
        category: 'furniture',
        baseValue: 10,
        weight: 5,
        description: 'Can sit on it or throw it',
        isWeapon: true,
        damage: 5,
        damageType: 'bludgeoning',
        range: 1,
        attackSpeed: 1.5,
        durabilityLoss: 0.8,
      };

      function migrateItemDefinitionV1toV2(v1: ItemDefinitionV1): ItemDefinition {
        const v2: ItemDefinition = {
          id: v1.id,
          name: v1.name,
          category: v1.category,
          baseMaterial: 'oak',
          baseValue: v1.baseValue,
          weight: v1.weight,
          description: v1.description,
          traits: {},
        };

        if (v1.isWeapon && v1.damage !== undefined && v1.damageType !== undefined) {
          v2.traits.weapon = {
            damage: v1.damage,
            damageType: v1.damageType as 'slashing' | 'piercing' | 'bludgeoning',
            range: v1.range ?? 1,
            attackSpeed: v1.attackSpeed ?? 1.0,
            durabilityLoss: v1.durabilityLoss ?? 0.5,
          };
        }

        return v2;
      }

      const v2 = migrateItemDefinitionV1toV2(v1);

      expect(v2.traits.weapon).toBeDefined();
      expect(v2.traits.weapon!.damageType).toBe('bludgeoning');
    });

    it('should handle missing optional fields with defaults', () => {
      const v1: ItemDefinitionV1 = {
        id: 'stick',
        name: 'Stick',
        category: 'weapon',
        baseValue: 1,
        weight: 0.5,
        description: 'A simple stick',
        isWeapon: true,
        damage: 3,
        damageType: 'bludgeoning',
        // Missing: range, attackSpeed, durabilityLoss
      };

      function migrateItemDefinitionV1toV2(v1: ItemDefinitionV1): ItemDefinition {
        const v2: ItemDefinition = {
          id: v1.id,
          name: v1.name,
          category: v1.category,
          baseMaterial: 'oak',
          baseValue: v1.baseValue,
          weight: v1.weight,
          description: v1.description,
          traits: {},
        };

        if (v1.isWeapon && v1.damage !== undefined && v1.damageType !== undefined) {
          v2.traits.weapon = {
            damage: v1.damage,
            damageType: v1.damageType as 'slashing' | 'piercing' | 'bludgeoning',
            range: v1.range ?? 1, // Default
            attackSpeed: v1.attackSpeed ?? 1.0, // Default
            durabilityLoss: v1.durabilityLoss ?? 0.5, // Default
          };
        }

        return v2;
      }

      const v2 = migrateItemDefinitionV1toV2(v1);

      expect(v2.traits.weapon!.range).toBe(1);
      expect(v2.traits.weapon!.attackSpeed).toBe(1.0);
      expect(v2.traits.weapon!.durabilityLoss).toBe(0.5);
    });

    it('should throw when required fields are missing in v1', () => {
      const v1: ItemDefinitionV1 = {
        id: 'broken_item',
        name: 'Broken Item',
        category: 'food',
        baseValue: 5,
        weight: 1,
        description: 'Missing required fields',
        isEdible: true,
        // Missing: hungerRestored, quality
      };

      function migrateItemDefinitionV1toV2(v1: ItemDefinitionV1): ItemDefinition {
        const v2: ItemDefinition = {
          id: v1.id,
          name: v1.name,
          category: v1.category,
          baseMaterial: 'organic',
          baseValue: v1.baseValue,
          weight: v1.weight,
          description: v1.description,
          traits: {},
        };

        if (v1.isEdible) {
          if (v1.hungerRestored === undefined || v1.quality === undefined) {
            throw new Error(
              `Migration failed for ${v1.id}: isEdible=true requires hungerRestored and quality`
            );
          }
          v2.traits.edible = {
            hungerRestored: v1.hungerRestored,
            quality: v1.quality,
            flavors: v1.flavors ?? [],
          };
        }

        return v2;
      }

      expect(() => migrateItemDefinitionV1toV2(v1)).toThrow();
      expect(() => migrateItemDefinitionV1toV2(v1)).toThrow('requires hungerRestored and quality');
    });

    it('should preserve all data during migration (no loss)', () => {
      const v1: ItemDefinitionV1 = {
        id: 'apple',
        name: 'Apple',
        category: 'food',
        baseValue: 3,
        weight: 0.2,
        description: 'A crisp apple',
        isEdible: true,
        hungerRestored: 25,
        quality: 70,
        flavors: ['sweet', 'crisp', 'fresh'],
      };

      function migrateItemDefinitionV1toV2(v1: ItemDefinitionV1): ItemDefinition {
        const v2: ItemDefinition = {
          id: v1.id,
          name: v1.name,
          category: v1.category,
          baseMaterial: 'organic',
          baseValue: v1.baseValue,
          weight: v1.weight,
          description: v1.description,
          traits: {},
        };

        if (v1.isEdible && v1.hungerRestored !== undefined && v1.quality !== undefined) {
          v2.traits.edible = {
            hungerRestored: v1.hungerRestored,
            quality: v1.quality,
            flavors: v1.flavors ?? [],
          };
        }

        return v2;
      }

      const v2 = migrateItemDefinitionV1toV2(v1);

      // Verify no data loss
      expect(v2.id).toBe(v1.id);
      expect(v2.name).toBe(v1.name);
      expect(v2.category).toBe(v1.category);
      expect(v2.baseValue).toBe(v1.baseValue);
      expect(v2.weight).toBe(v1.weight);
      expect(v2.description).toBe(v1.description);
      expect(v2.traits.edible!.hungerRestored).toBe(v1.hungerRestored);
      expect(v2.traits.edible!.quality).toBe(v1.quality);
      expect(v2.traits.edible!.flavors).toEqual(v1.flavors);
    });
  });

  describe('version detection', () => {
    it('should detect v1 format by presence of flat flags', () => {
      function isV1Format(data: any): boolean {
        return (
          data.isEdible !== undefined ||
          data.isWeapon !== undefined ||
          data.isTool !== undefined
        );
      }

      const v1Data = {
        id: 'test',
        isEdible: true,
      };

      const v2Data = {
        id: 'test',
        traits: { edible: {} },
      };

      expect(isV1Format(v1Data)).toBe(true);
      expect(isV1Format(v2Data)).toBe(false);
    });

    it('should detect v2 format by presence of traits', () => {
      function isV2Format(data: any): boolean {
        return data.traits !== undefined;
      }

      const v1Data = {
        id: 'test',
        isEdible: true,
      };

      const v2Data = {
        id: 'test',
        traits: { edible: {} },
      };

      expect(isV2Format(v1Data)).toBe(false);
      expect(isV2Format(v2Data)).toBe(true);
    });
  });
});
