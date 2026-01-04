/**
 * MagicalSkillBonuses.test.ts - Test magical skill bonuses from equipment
 *
 * Verifies that:
 * - Items with StatBonusTrait provide skill bonuses
 * - EquipmentSystem calculates total skill modifiers correctly
 * - Multiple items stack their bonuses
 * - Positive and negative bonuses work
 * - Bonuses are cleared when items are unequipped
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import { EquipmentSystem } from '../systems/EquipmentSystem.js';
import type { EquipmentComponent } from '../components/EquipmentComponent.js';
import type { BodyComponent } from '../components/BodyComponent.js';
import { itemRegistry } from '../items/index.js';
import { defineItem } from '../items/ItemDefinition.js';
import type { StatBonusTrait } from '../items/traits/StatBonusTrait.js';

describe('MagicalSkillBonuses', () => {
  let world: World;
  let equipmentSystem: EquipmentSystem;

  beforeEach(() => {
    world = new World();
    equipmentSystem = new EquipmentSystem();

    // Register test items with skill bonuses
    const ringOfCombatMastery = defineItem(
      'test:ring_combat_mastery',
      'Ring of Combat Mastery',
      'equipment',
      {
        weight: 0.1,
        stackSize: 1,
        traits: {
          statBonus: {
            skillModifiers: { combat: 5 },
            duration: 'permanent',
            description: '+5 Combat Skill',
          } as StatBonusTrait,
        },
      }
    );

    const glovesOfDexterity = defineItem(
      'test:gloves_dexterity',
      'Gloves of Dexterity',
      'equipment',
      {
        weight: 0.5,
        stackSize: 1,
        traits: {
          statBonus: {
            skillModifiers: { combat: 3, crafting: 2 },
            duration: 'permanent',
            description: '+3 Combat, +2 Crafting',
          } as StatBonusTrait,
        },
      }
    );

    const cursedHelm = defineItem(
      'test:cursed_helm',
      'Cursed Berserker Helm',
      'equipment',
      {
        weight: 2.0,
        stackSize: 1,
        traits: {
          armor: {
            defense: 8,
            armorClass: 'heavy',
            target: { bodyPartFunction: 'sensory' },
            weight: 2.0,
            durability: 1.0,
            durabilityLossPerHit: 0.1,
            movementPenalty: 0.1,
          },
          statBonus: {
            skillModifiers: { combat: 10, social: -5 },
            duration: 'permanent',
            description: '+10 Combat, -5 Social (Cursed)',
          } as StatBonusTrait,
        },
      }
    );

    itemRegistry.register(ringOfCombatMastery);
    itemRegistry.register(glovesOfDexterity);
    itemRegistry.register(cursedHelm);
  });

  it('single magical item provides skill bonus', () => {
    const entity = new EntityImpl('test-agent');

    const body: BodyComponent = {
      type: 'body',
      version: 1,
      species: 'human',
      size: 'medium',
      bodyParts: [
        {
          id: 'left_hand',
          type: 'hand',
          functions: ['manipulation', 'tool_use'],
          parent: 'left_arm',
          health: 100,
          maxHealth: 100,
          canEquip: true,
          size: 1.0,
        },
      ],
      flightCapable: false,
    };

    const equipment: EquipmentComponent = {
      type: 'equipment',
      version: 1,
      slots: {
        left_hand: {
          itemId: 'test:ring_combat_mastery',
          equippedAt: 0,
        },
      },
      maxWeight: 100,
      flightWeightThreshold: 50,
      canFly: false,
    };

    (entity as any).addComponent(body);
    (entity as any).addComponent(equipment);
    world.addEntity(entity);

    // Run equipment system
    equipmentSystem.update(world, 0);

    // Check cached skill modifiers
    const updatedEquipment = world.getComponent<EquipmentComponent>(entity.id, 'equipment');
    expect(updatedEquipment).toBeDefined();
    expect(updatedEquipment!.cached?.skillModifiers).toBeDefined();
    expect(updatedEquipment!.cached!.skillModifiers.combat).toBe(5);
  });

  it('multiple items stack their bonuses', () => {
    const entity = new EntityImpl('test-agent');

    const body: BodyComponent = {
      type: 'body',
      version: 1,
      species: 'human',
      size: 'medium',
      bodyParts: [
        {
          id: 'left_hand',
          type: 'hand',
          functions: ['manipulation'],
          parent: 'left_arm',
          health: 100,
          maxHealth: 100,
          canEquip: true,
          size: 1.0,
        },
        {
          id: 'right_hand',
          type: 'hand',
          functions: ['manipulation'],
          parent: 'right_arm',
          health: 100,
          maxHealth: 100,
          canEquip: true,
          size: 1.0,
        },
      ],
      flightCapable: false,
    };

    const equipment: EquipmentComponent = {
      type: 'equipment',
      version: 1,
      slots: {
        left_hand: {
          itemId: 'test:ring_combat_mastery',
          equippedAt: 0,
        },
        right_hand: {
          itemId: 'test:gloves_dexterity',
          equippedAt: 0,
        },
      },
      maxWeight: 100,
      flightWeightThreshold: 50,
      canFly: false,
    };

    (entity as any).addComponent(body);
    (entity as any).addComponent(equipment);
    world.addEntity(entity);

    // Run equipment system
    equipmentSystem.update(world, 0);

    // Check stacked skill modifiers
    const updatedEquipment = world.getComponent<EquipmentComponent>(entity.id, 'equipment');
    expect(updatedEquipment!.cached?.skillModifiers).toBeDefined();
    // Ring (+5) + Gloves (+3) = +8 combat
    expect(updatedEquipment!.cached!.skillModifiers.combat).toBe(8);
    // Gloves only provide crafting
    expect(updatedEquipment!.cached!.skillModifiers.crafting).toBe(2);
  });

  it('negative bonuses (curses) work correctly', () => {
    const entity = new EntityImpl('test-agent');

    const body: BodyComponent = {
      type: 'body',
      version: 1,
      species: 'human',
      size: 'medium',
      bodyParts: [
        {
          id: 'head',
          type: 'head',
          functions: ['sensory'],
          parent: 'torso',
          health: 100,
          maxHealth: 100,
          canEquip: true,
          size: 1.0,
        },
      ],
      flightCapable: false,
    };

    const equipment: EquipmentComponent = {
      type: 'equipment',
      version: 1,
      slots: {
        head: {
          itemId: 'test:cursed_helm',
          equippedAt: 0,
        },
      },
      maxWeight: 100,
      flightWeightThreshold: 50,
      canFly: false,
    };

    (entity as any).addComponent(body);
    (entity as any).addComponent(equipment);
    world.addEntity(entity);

    // Run equipment system
    equipmentSystem.update(world, 0);

    // Check cursed item modifiers
    const updatedEquipment = world.getComponent<EquipmentComponent>(entity.id, 'equipment');
    expect(updatedEquipment!.cached?.skillModifiers).toBeDefined();
    // Cursed helm grants +10 combat
    expect(updatedEquipment!.cached!.skillModifiers.combat).toBe(10);
    // But inflicts -5 social
    expect(updatedEquipment!.cached!.skillModifiers.social).toBe(-5);
  });

  it('bonuses are cleared when equipment is removed', () => {
    const entity = new EntityImpl('test-agent');

    const body: BodyComponent = {
      type: 'body',
      version: 1,
      species: 'human',
      size: 'medium',
      bodyParts: [
        {
          id: 'left_hand',
          type: 'hand',
          functions: ['manipulation'],
          parent: 'left_arm',
          health: 100,
          maxHealth: 100,
          canEquip: true,
          size: 1.0,
        },
      ],
      flightCapable: false,
    };

    const equipment: EquipmentComponent = {
      type: 'equipment',
      version: 1,
      slots: {
        left_hand: {
          itemId: 'test:ring_combat_mastery',
          equippedAt: 0,
        },
      },
      maxWeight: 100,
      flightWeightThreshold: 50,
      canFly: false,
    };

    (entity as any).addComponent(body);
    (entity as any).addComponent(equipment);
    world.addEntity(entity);

    // Run equipment system
    equipmentSystem.update(world, 0);

    // Verify bonus is present
    let updatedEquipment = world.getComponent<EquipmentComponent>(entity.id, 'equipment');
    expect(updatedEquipment!.cached!.skillModifiers.combat).toBe(5);

    // Remove equipment
    entity.updateComponent('equipment', (eq) => {
      const updated = { ...eq, slots: {} };
      return updated;
    });

    // Run equipment system again
    equipmentSystem.update(world, 1);

    // Verify bonus is cleared
    updatedEquipment = world.getComponent<EquipmentComponent>(entity.id, 'equipment');
    expect(updatedEquipment!.cached?.skillModifiers).toBeDefined();
    expect(updatedEquipment!.cached!.skillModifiers.combat).toBeUndefined();
  });

  it('complex stacking with positive and negative bonuses', () => {
    const entity = new EntityImpl('test-agent');

    const body: BodyComponent = {
      type: 'body',
      version: 1,
      species: 'human',
      size: 'medium',
      bodyParts: [
        {
          id: 'head',
          type: 'head',
          functions: ['sensory'],
          parent: 'torso',
          health: 100,
          maxHealth: 100,
          canEquip: true,
          size: 1.0,
        },
        {
          id: 'left_hand',
          type: 'hand',
          functions: ['manipulation'],
          parent: 'left_arm',
          health: 100,
          maxHealth: 100,
          canEquip: true,
          size: 1.0,
        },
        {
          id: 'right_hand',
          type: 'hand',
          functions: ['manipulation'],
          parent: 'right_arm',
          health: 100,
          maxHealth: 100,
          canEquip: true,
          size: 1.0,
        },
      ],
      flightCapable: false,
    };

    const equipment: EquipmentComponent = {
      type: 'equipment',
      version: 1,
      slots: {
        head: {
          itemId: 'test:cursed_helm',
          equippedAt: 0,
        },
        left_hand: {
          itemId: 'test:ring_combat_mastery',
          equippedAt: 0,
        },
        right_hand: {
          itemId: 'test:gloves_dexterity',
          equippedAt: 0,
        },
      },
      maxWeight: 100,
      flightWeightThreshold: 50,
      canFly: false,
    };

    (entity as any).addComponent(body);
    (entity as any).addComponent(equipment);
    world.addEntity(entity);

    // Run equipment system
    equipmentSystem.update(world, 0);

    // Check complex stacking
    const updatedEquipment = world.getComponent<EquipmentComponent>(entity.id, 'equipment');
    expect(updatedEquipment!.cached?.skillModifiers).toBeDefined();

    // Cursed Helm (+10) + Ring (+5) + Gloves (+3) = +18 combat
    expect(updatedEquipment!.cached!.skillModifiers.combat).toBe(18);

    // Gloves only: +2 crafting
    expect(updatedEquipment!.cached!.skillModifiers.crafting).toBe(2);

    // Cursed Helm only: -5 social
    expect(updatedEquipment!.cached!.skillModifiers.social).toBe(-5);
  });
});
