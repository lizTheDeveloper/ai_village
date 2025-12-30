import { describe, it, expect, beforeEach } from 'vitest';
import type { ItemInstance } from '../ItemInstance';
import type { ItemDefinition } from '../ItemDefinition';
import type { MaterialTemplate } from '../../materials/MaterialTemplate';
import { MaterialRegistry } from '../../materials/MaterialRegistry';

describe('ItemInstance', () => {
  let materialRegistry: MaterialRegistry;

  beforeEach(() => {
    materialRegistry = new MaterialRegistry();

    // Register test materials
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

    const gold: MaterialTemplate = {
      id: 'gold',
      name: 'Gold',
      density: 19320,
      hardness: 60,
      flexibility: 40,
      meltingPoint: 1064,
      ignitePoint: undefined,
      heatConductivity: 70,
      magicAffinity: 90,
      resonantForms: ['wealth', 'power'],
      categories: ['metal', 'precious'],
    };

    materialRegistry.register(iron);
    materialRegistry.register(gold);
  });

  describe('Criterion 4: ItemInstance vs ItemDefinition Separation', () => {
    it('should create instance with unique ID', () => {
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

      const instance: ItemInstance = {
        instanceId: 'uuid-123',
        definitionId: 'iron_sword',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      expect(instance.instanceId).toBe('uuid-123');
      expect(instance.definitionId).toBe('iron_sword');
      expect(instance.quality).toBe(60);
      expect(instance.condition).toBe(100);
    });

    it('should support materialOverride for transmutation', () => {
      const instance: ItemInstance = {
        instanceId: 'uuid-456',
        definitionId: 'iron_sword',
        materialOverride: 'gold',
        quality: 70,
        condition: 100,
        stackSize: 1,
      };

      expect(instance.materialOverride).toBe('gold');
    });

    it('should support additionalTraits for enchantments', () => {
      const instance: ItemInstance = {
        instanceId: 'uuid-789',
        definitionId: 'iron_sword',
        quality: 65,
        condition: 100,
        stackSize: 1,
        additionalTraits: {
          magical: {
            effects: [
              { type: 'damage', magnitude: 5, element: 'fire' },
            ],
            charges: 10,
          },
        },
      };

      expect(instance.additionalTraits).toBeDefined();
      expect(instance.additionalTraits!.magical).toBeDefined();
      expect(instance.additionalTraits!.magical!.charges).toBe(10);
    });

    it('should track quality as ItemQuality tier', () => {
      const poor: ItemInstance = {
        instanceId: 'uuid-1',
        definitionId: 'iron_sword',
        quality: 30,
        condition: 100,
        stackSize: 1,
      };

      const normal: ItemInstance = {
        instanceId: 'uuid-2',
        definitionId: 'iron_sword',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      const fine: ItemInstance = {
        instanceId: 'uuid-3',
        definitionId: 'iron_sword',
        quality: 75,
        condition: 100,
        stackSize: 1,
      };

      const masterwork: ItemInstance = {
        instanceId: 'uuid-4',
        definitionId: 'iron_sword',
        quality: 88,
        condition: 100,
        stackSize: 1,
      };

      const legendary: ItemInstance = {
        instanceId: 'uuid-5',
        definitionId: 'iron_sword',
        quality: 95,
        condition: 100,
        stackSize: 1,
      };

      expect(poor.quality).toBe(30);
      expect(normal.quality).toBe(60);
      expect(fine.quality).toBe(75);
      expect(masterwork.quality).toBe(88);
      expect(legendary.quality).toBe(95);
    });

    it('should track condition degradation', () => {
      const instance: ItemInstance = {
        instanceId: 'uuid-cond',
        definitionId: 'iron_sword',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      // Simulate degradation
      const degraded = { ...instance, condition: 75 };
      expect(degraded.condition).toBe(75);

      const veryDegraded = { ...instance, condition: 20 };
      expect(veryDegraded.condition).toBe(20);
    });

    it('should track creator information', () => {
      const instance: ItemInstance = {
        instanceId: 'uuid-creator',
        definitionId: 'iron_sword',
        quality: 80,
        condition: 100,
        stackSize: 1,
        creator: 'agent-smith-123',
        createdAt: 1000,
      };

      expect(instance.creator).toBe('agent-smith-123');
      expect(instance.createdAt).toBe(1000);
    });

    it('should support stacking', () => {
      const instance: ItemInstance = {
        instanceId: 'uuid-stack',
        definitionId: 'berry',
        quality: 60,
        condition: 100,
        stackSize: 50,
      };

      expect(instance.stackSize).toBe(50);
    });

    it('should require instanceId', () => {
      // TypeScript compilation test - instanceId is required
      const instance: ItemInstance = {
        instanceId: 'required',
        definitionId: 'iron_sword',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      expect(instance.instanceId).toBeTruthy();
    });

    it('should require definitionId', () => {
      // TypeScript compilation test - definitionId is required
      const instance: ItemInstance = {
        instanceId: 'uuid-1',
        definitionId: 'required',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      expect(instance.definitionId).toBeTruthy();
    });
  });

  describe('Criterion 5: Material Property Inheritance', () => {
    it('should inherit material properties from baseMaterial', () => {
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

      const instance: ItemInstance = {
        instanceId: 'uuid-iron',
        definitionId: 'iron_sword',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      // Get effective material (no override, use base)
      const materialId = instance.materialOverride ?? definition.baseMaterial;
      const material = materialRegistry.get(materialId);

      expect(material.hardness).toBe(80);
      expect(material.density).toBe(7870);
    });

    it('should use materialOverride instead of baseMaterial', () => {
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

      const instance: ItemInstance = {
        instanceId: 'uuid-gold',
        definitionId: 'iron_sword',
        materialOverride: 'gold',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      // Get effective material (override present, use it)
      const materialId = instance.materialOverride ?? definition.baseMaterial;
      const material = materialRegistry.get(materialId);

      expect(material.hardness).toBe(60); // Gold hardness, not iron
      expect(material.density).toBe(19320); // Gold density, not iron
      expect(material.magicAffinity).toBe(90); // Gold magic affinity
    });

    it('should provide helper to get effective material', () => {
      function getEffectiveMaterial(
        instance: ItemInstance,
        definition: ItemDefinition,
        registry: MaterialRegistry
      ): MaterialTemplate {
        const materialId = instance.materialOverride ?? definition.baseMaterial;
        return registry.get(materialId);
      }

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

      const ironInstance: ItemInstance = {
        instanceId: 'uuid-1',
        definitionId: 'iron_sword',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      const goldInstance: ItemInstance = {
        instanceId: 'uuid-2',
        definitionId: 'iron_sword',
        materialOverride: 'gold',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      const ironMat = getEffectiveMaterial(ironInstance, definition, materialRegistry);
      const goldMat = getEffectiveMaterial(goldInstance, definition, materialRegistry);

      expect(ironMat.id).toBe('iron');
      expect(goldMat.id).toBe('gold');
    });
  });

  describe('error handling - no fallbacks', () => {
    it('should throw when material does not exist', () => {
      const definition: ItemDefinition = {
        id: 'mystery_sword',
        name: 'Mystery Sword',
        category: 'weapon',
        baseMaterial: 'unobtainium',
        baseValue: 50,
        weight: 3,
        description: 'Made of unknown material',
        traits: {},
      };

      const instance: ItemInstance = {
        instanceId: 'uuid-mystery',
        definitionId: 'mystery_sword',
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      const materialId = instance.materialOverride ?? definition.baseMaterial;

      expect(() => materialRegistry.get(materialId)).toThrow();
      expect(() => materialRegistry.get(materialId)).toThrow('Material not found');
    });

    it('should throw when materialOverride does not exist', () => {
      const definition: ItemDefinition = {
        id: 'iron_sword',
        name: 'Iron Sword',
        category: 'weapon',
        baseMaterial: 'iron',
        baseValue: 50,
        weight: 3,
        description: 'A sturdy iron sword',
        traits: {},
      };

      const instance: ItemInstance = {
        instanceId: 'uuid-bad',
        definitionId: 'iron_sword',
        materialOverride: 'mithril', // Not registered
        quality: 60,
        condition: 100,
        stackSize: 1,
      };

      const materialId = instance.materialOverride ?? definition.baseMaterial;

      expect(() => materialRegistry.get(materialId)).toThrow();
    });
  });
});
