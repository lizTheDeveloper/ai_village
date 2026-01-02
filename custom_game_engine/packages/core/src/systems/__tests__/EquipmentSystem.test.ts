import { describe, it, expect, beforeEach } from 'vitest';
import { EquipmentSystem } from '../EquipmentSystem.js';
import { createEquipmentComponent, calculateTotalWeight, getTotalDefense, getDamageResistance, getMovementPenalty, hasSetBonus } from '../../components/EquipmentComponent.js';
import type { EquipmentComponent } from '../../components/EquipmentComponent.js';
import type { BodyComponent, SizeCategory } from '../../components/BodyComponent.js';
import { itemRegistry } from '../../items/ItemRegistry.js';
import { defineItem } from '../../items/ItemDefinition.js';
import type { ArmorTrait } from '../../items/traits/ArmorTrait.js';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl } from '../../ecs/Entity.js';

/**
 * Helper to create a basic BodyComponent for testing
 */
function createTestBodyComponent(size: SizeCategory = 'medium'): BodyComponent {
  return {
    type: 'body',
    version: 1,
    parts: {},
    globalModifications: [],
    size,
    bloodType: 'red',
    skeletonType: 'internal',
    totalMass: 70,
  };
}

/**
 * EquipmentSystem Integration Tests
 *
 * Tests the dynamic body-based equipment system including:
 * - Equipment validation against body parts
 * - Weight tracking and flight capability
 * - Defense and resistance calculations
 * - Movement penalties
 * - Set bonuses
 */

describe('EquipmentSystem', () => {
  let system: EquipmentSystem;
  let world: WorldImpl;

  beforeEach(() => {
    // Reset registry
    itemRegistry.clear();

    // Create system and world
    system = new EquipmentSystem();
    world = new WorldImpl();

    // Register test armor items
    itemRegistry.register(
      defineItem('iron_helmet', 'Iron Helmet', 'equipment', {
        weight: 2.0,
        baseMaterial: 'iron',
        traits: {
          armor: {
            defense: 5,
            weight: 2.0,
            armorClass: 'heavy',
            movementPenalty: 0.05,
            resistances: {
              slashing: 0.1,
              bludgeoning: 0.15,
            },
            target: {
              bodyPartType: 'head',
            },
          } as ArmorTrait,
        },
      })
    );

    itemRegistry.register(
      defineItem('iron_chestplate', 'Iron Chestplate', 'equipment', {
        weight: 8.0,
        baseMaterial: 'iron',
        traits: {
          armor: {
            defense: 15,
            weight: 8.0,
            armorClass: 'heavy',
            movementPenalty: 0.15,
            resistances: {
              slashing: 0.2,
              bludgeoning: 0.25,
            },
            target: {
              bodyPartType: 'torso',
            },
          } as ArmorTrait,
        },
      })
    );

    itemRegistry.register(
      defineItem('iron_greaves', 'Iron Greaves', 'equipment', {
        weight: 3.0,
        baseMaterial: 'iron',
        traits: {
          armor: {
            defense: 8,
            weight: 3.0,
            armorClass: 'heavy',
            movementPenalty: 0.1,
            resistances: {
              slashing: 0.15,
            },
            target: {
              bodyPartType: 'legs',
            },
          } as ArmorTrait,
        },
      })
    );

    itemRegistry.register(
      defineItem('leather_tunic', 'Leather Tunic', 'equipment', {
        weight: 2.0,
        baseMaterial: 'leather',
        traits: {
          armor: {
            defense: 5,
            weight: 2.0,
            armorClass: 'light',
            movementPenalty: 0.02,
            resistances: {
              slashing: 0.05,
            },
            target: {
              bodyPartType: 'torso',
            },
          } as ArmorTrait,
        },
      })
    );

    itemRegistry.register(
      defineItem('wing_guard', 'Wing Guard', 'equipment', {
        weight: 0.5,
        baseMaterial: 'cloth',
        traits: {
          armor: {
            defense: 2,
            weight: 0.5,
            armorClass: 'light',
            movementPenalty: 0,
            target: {
              bodyPartFunction: 'flight',
              maxWeight: 1.0, // Light armor only for wings
            },
          } as ArmorTrait,
        },
      })
    );

    itemRegistry.register(
      defineItem('iron_sword', 'Iron Sword', 'equipment', {
        weight: 3.0,
        baseMaterial: 'iron',
        traits: {
          weapon: {
            damage: 10,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 1.0,
            durabilityLoss: 0.05,
          },
        },
      })
    );
  });

  describe('Equipment Validation', () => {
    it('should remove equipment when body part is destroyed', () => {
      const entity = new EntityImpl();
      const equipment = createEquipmentComponent();
      const body = createTestBodyComponent();

      // Add head and equip helmet
      body.parts = {
        head_1: {
          id: 'head_1',
          type: 'head',
          health: 100,
          maxHealth: 100,
          functions: [],
          subParts: [],
        },
      };
      equipment.equipped['head_1'] = { itemId: 'iron_helmet' };

      entity.components.set('equipment', equipment);
      entity.components.set('body', body);

      // Verify helmet is equipped
      expect(equipment.equipped['head_1']).toBeDefined();

      // Destroy the head (remove it)
      delete body.parts.head_1;

      // Run system
      system.update(world, [entity], 0.1);

      // Helmet should be removed
      expect(equipment.equipped['head_1']).toBeUndefined();
    });

    it('should remove equipment when body part type no longer matches', () => {
      const entity = new EntityImpl();
      const equipment = createEquipmentComponent();
      const body = createTestBodyComponent();

      // Add torso and equip chestplate
      body.parts = {
        torso_1: {
          id: 'torso_1',
          type: 'torso',
          health: 100,
          maxHealth: 100,
          functions: [],
          subParts: [],
        },
      };
      equipment.equipped['torso_1'] = { itemId: 'iron_chestplate' };

      entity.components.set('equipment', equipment);
      entity.components.set('body', body);

      // Change body part type
      body.parts.torso_1.type = 'head';

      // Run system
      system.update(world, [entity], 0.1);

      // Chestplate should be removed (wrong body part type)
      expect(equipment.equipped['torso_1']).toBeUndefined();
    });

    it('should remove heavy equipment from wings', () => {
      const entity = new EntityImpl();
      const equipment = createEquipmentComponent();
      const body = createTestBodyComponent();

      // Add wing
      body.parts = {
        left_wing_1: {
          id: 'left_wing_1',
          type: 'wing',
          health: 100,
          maxHealth: 100,
          functions: ['flight'],
          subParts: [],
        },
      };

      // Try to equip heavy iron chestplate on wing (invalid)
      equipment.equipped['left_wing_1'] = { itemId: 'iron_chestplate' };

      entity.components.set('equipment', equipment);
      entity.components.set('body', body);

      // Run system
      system.update(world, [entity], 0.1);

      // Heavy armor should be removed from wing
      expect(equipment.equipped['left_wing_1']).toBeUndefined();
    });

    it('should allow light equipment on wings', () => {
      const entity = new EntityImpl();
      const equipment = createEquipmentComponent();
      const body = createTestBodyComponent();

      // Add wing
      body.parts = {
        left_wing_1: {
          id: 'left_wing_1',
          type: 'wing',
          health: 100,
          maxHealth: 100,
          functions: ['flight'],
          subParts: [],
        },
      };

      // Equip light wing guard
      equipment.equipped['left_wing_1'] = { itemId: 'wing_guard' };

      entity.components.set('equipment', equipment);
      entity.components.set('body', body);

      // Run system
      system.update(world, [entity], 0.1);

      // Light armor should remain
      expect(equipment.equipped['left_wing_1']).toBeDefined();
      expect(equipment.equipped['left_wing_1'].itemId).toBe('wing_guard');
    });
  });

  describe('Weight Tracking and Flight', () => {
    it('should calculate total equipment weight', () => {
      const equipment = createEquipmentComponent();

      equipment.equipped['head_1'] = { itemId: 'iron_helmet' }; // 2 kg
      equipment.equipped['torso_1'] = { itemId: 'iron_chestplate' }; // 8 kg
      equipment.equipped['legs_1'] = { itemId: 'iron_greaves' }; // 3 kg
      equipment.weapons.mainHand = { itemId: 'iron_sword' }; // 3 kg

      const totalWeight = calculateTotalWeight(equipment);
      expect(totalWeight).toBe(16); // 2 + 8 + 3 + 3
    });

    it('should disable flight when weight exceeds limit', () => {
      const entity = new EntityImpl();
      const equipment = createEquipmentComponent();
      const body = createTestBodyComponent();
      body.size = 'medium'; // Max flight weight: 15 kg

      // Add wings and body parts for armor
      body.parts = {
        head_1: { id: 'head_1', type: 'head', health: 100, maxHealth: 100, functions: [], subParts: [] },
        torso_1: { id: 'torso_1', type: 'torso', health: 100, maxHealth: 100, functions: [], subParts: [] },
        legs_1: { id: 'legs_1', type: 'legs', health: 100, maxHealth: 100, functions: [], subParts: [] },
        left_wing_1: {
          id: 'left_wing_1',
          type: 'wing',
          health: 100,
          maxHealth: 100,
          functions: ['flight'],
          subParts: [],
        },
        right_wing_1: {
          id: 'right_wing_1',
          type: 'wing',
          health: 100,
          maxHealth: 100,
          functions: ['flight'],
          subParts: [],
        },
      };

      // Equip heavy armor (total 16 kg, exceeds 15 kg limit)
      equipment.equipped['head_1'] = { itemId: 'iron_helmet' };
      equipment.equipped['torso_1'] = { itemId: 'iron_chestplate' };
      equipment.equipped['legs_1'] = { itemId: 'iron_greaves' };
      equipment.weapons.mainHand = { itemId: 'iron_sword' };

      entity.components.set('equipment', equipment);
      entity.components.set('body', body);

      // Run system
      system.update(world, [entity], 0.1);

      // Flight should be disabled
      expect(equipment.canFly).toBe(false);
      expect(equipment.totalWeight).toBe(16);
    });

    it('should enable flight when weight is within limit', () => {
      const entity = new EntityImpl();
      const equipment = createEquipmentComponent();
      const body = createTestBodyComponent();
      body.size = 'medium'; // Max flight weight: 15 kg

      // Add wings and torso for armor
      body.parts = {
        torso_1: { id: 'torso_1', type: 'torso', health: 100, maxHealth: 100, functions: [], subParts: [] },
        left_wing_1: {
          id: 'left_wing_1',
          type: 'wing',
          health: 100,
          maxHealth: 100,
          functions: ['flight'],
          subParts: [],
        },
      };

      // Equip light armor (total 2 kg, well under limit)
      equipment.equipped['torso_1'] = { itemId: 'leather_tunic' };

      entity.components.set('equipment', equipment);
      entity.components.set('body', body);

      // Run system
      system.update(world, [entity], 0.1);

      // Flight should be enabled
      expect(equipment.canFly).toBe(true);
      expect(equipment.totalWeight).toBe(2);
    });

    it('should disable flight for entities without flight parts', () => {
      const entity = new EntityImpl();
      const equipment = createEquipmentComponent();
      const body = createTestBodyComponent();

      // No wings
      body.parts = {
        torso_1: {
          id: 'torso_1',
          type: 'torso',
          health: 100,
          maxHealth: 100,
          functions: [],
          subParts: [],
        },
      };

      equipment.equipped['torso_1'] = { itemId: 'leather_tunic' };

      entity.components.set('equipment', equipment);
      entity.components.set('body', body);

      // Run system
      system.update(world, [entity], 0.1);

      // Flight should be disabled (no wings)
      expect(equipment.canFly).toBe(false);
    });
  });

  describe('Defense Calculations', () => {
    it('should calculate total defense from all equipped armor', () => {
      const equipment = createEquipmentComponent();

      equipment.equipped['head_1'] = { itemId: 'iron_helmet' }; // 5 defense
      equipment.equipped['torso_1'] = { itemId: 'iron_chestplate' }; // 15 defense
      equipment.equipped['legs_1'] = { itemId: 'iron_greaves' }; // 8 defense

      const totalDefense = getTotalDefense(equipment);
      expect(totalDefense).toBe(28); // 5 + 15 + 8
    });

    it('should cache defense stats for performance', () => {
      const entity = new EntityImpl();
      const equipment = createEquipmentComponent();
      const body = createTestBodyComponent();

      body.parts = {
        head_1: { id: 'head_1', type: 'head', health: 100, maxHealth: 100, functions: [], subParts: [] },
      };
      equipment.equipped['head_1'] = { itemId: 'iron_helmet' };

      entity.components.set('equipment', equipment);
      entity.components.set('body', body);

      // Run system
      system.update(world, [entity], 0.1);

      // Check cached stats
      expect(equipment.cached).toBeDefined();
      expect(equipment.cached!.totalDefense).toBe(5);
      expect(equipment.cached!.lastUpdateTick).toBe(1);
    });
  });

  describe('Resistance Calculations', () => {
    it('should calculate damage resistance from equipped armor', () => {
      const equipment = createEquipmentComponent();

      equipment.equipped['head_1'] = { itemId: 'iron_helmet' }; // slashing: 0.1, bludgeoning: 0.15
      equipment.equipped['torso_1'] = { itemId: 'iron_chestplate' }; // slashing: 0.2, bludgeoning: 0.25

      const slashingResist = getDamageResistance(equipment, 'slashing');
      const bludgeoningResist = getDamageResistance(equipment, 'bludgeoning');

      expect(slashingResist).toBeCloseTo(0.3, 5); // 0.1 + 0.2
      expect(bludgeoningResist).toBeCloseTo(0.4, 5); // 0.15 + 0.25
    });

    it('should cap resistance at 90%', () => {
      const equipment = createEquipmentComponent();

      // Register super armor with high resistance
      itemRegistry.register(
        defineItem('super_armor', 'Super Armor', 'equipment', {
          weight: 10.0,
          traits: {
            armor: {
              defense: 100,
              weight: 10.0,
              armorClass: 'heavy',
              resistances: {
                fire: 0.95, // Try to exceed cap
              },
              target: {
                bodyPartType: 'torso',
              },
            } as ArmorTrait,
          },
        })
      );

      equipment.equipped['torso_1'] = { itemId: 'super_armor' };

      const fireResist = getDamageResistance(equipment, 'fire');
      expect(fireResist).toBe(0.9); // Capped at 90%
    });

    it('should return 0 for damage types with no resistance', () => {
      const equipment = createEquipmentComponent();
      equipment.equipped['head_1'] = { itemId: 'iron_helmet' };

      const fireResist = getDamageResistance(equipment, 'fire');
      expect(fireResist).toBe(0);
    });
  });

  describe('Movement Penalties', () => {
    it('should calculate total movement penalty from armor', () => {
      const equipment = createEquipmentComponent();

      equipment.equipped['head_1'] = { itemId: 'iron_helmet' }; // 0.05 penalty
      equipment.equipped['torso_1'] = { itemId: 'iron_chestplate' }; // 0.15 penalty
      equipment.equipped['legs_1'] = { itemId: 'iron_greaves' }; // 0.1 penalty

      const penalty = getMovementPenalty(equipment);
      expect(penalty).toBeCloseTo(0.3, 5); // 0.05 + 0.15 + 0.1
    });

    it('should cap movement penalty at 90%', () => {
      const equipment = createEquipmentComponent();

      // Register super heavy armor
      itemRegistry.register(
        defineItem('ultra_heavy_armor', 'Ultra Heavy Armor', 'equipment', {
          weight: 50.0,
          traits: {
            armor: {
              defense: 100,
              weight: 50.0,
              armorClass: 'heavy',
              movementPenalty: 0.95, // Try to exceed cap
              target: {
                bodyPartType: 'torso',
              },
            } as ArmorTrait,
          },
        })
      );

      equipment.equipped['torso_1'] = { itemId: 'ultra_heavy_armor' };

      const penalty = getMovementPenalty(equipment);
      expect(penalty).toBe(0.9); // Capped at 90%
    });
  });

  describe('Set Bonuses', () => {
    it('should detect set bonus with 3+ pieces of same material and class', () => {
      const equipment = createEquipmentComponent();

      // All iron heavy armor
      equipment.equipped['head_1'] = { itemId: 'iron_helmet' };
      equipment.equipped['torso_1'] = { itemId: 'iron_chestplate' };
      equipment.equipped['legs_1'] = { itemId: 'iron_greaves' };

      const hasSet = hasSetBonus(equipment);
      expect(hasSet).toBe(true);
    });

    it('should not detect set bonus with mixed materials', () => {
      const equipment = createEquipmentComponent();

      // Mixed materials
      equipment.equipped['head_1'] = { itemId: 'iron_helmet' }; // iron
      equipment.equipped['torso_1'] = { itemId: 'leather_tunic' }; // leather
      equipment.equipped['legs_1'] = { itemId: 'iron_greaves' }; // iron

      const hasSet = hasSetBonus(equipment);
      expect(hasSet).toBe(false);
    });

    it('should not detect set bonus with less than 3 pieces', () => {
      const equipment = createEquipmentComponent();

      // Only 2 pieces
      equipment.equipped['head_1'] = { itemId: 'iron_helmet' };
      equipment.equipped['torso_1'] = { itemId: 'iron_chestplate' };

      const hasSet = hasSetBonus(equipment);
      expect(hasSet).toBe(false);
    });

    it('should not detect set bonus with mixed armor classes', () => {
      const equipment = createEquipmentComponent();

      // Register iron light armor
      itemRegistry.register(
        defineItem('iron_light_helmet', 'Iron Light Helmet', 'equipment', {
          weight: 1.0,
          baseMaterial: 'iron',
          traits: {
            armor: {
              defense: 3,
              weight: 1.0,
              armorClass: 'light', // Different class
              target: {
                bodyPartType: 'head',
              },
            } as ArmorTrait,
          },
        })
      );

      // Same material, mixed classes
      equipment.equipped['head_1'] = { itemId: 'iron_light_helmet' }; // light
      equipment.equipped['torso_1'] = { itemId: 'iron_chestplate' }; // heavy
      equipment.equipped['legs_1'] = { itemId: 'iron_greaves' }; // heavy

      const hasSet = hasSetBonus(equipment);
      expect(hasSet).toBe(false);
    });
  });
});
