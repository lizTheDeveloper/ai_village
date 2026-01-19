import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EntityImpl, createEntityId } from '../../ecs/Entity.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { AgentCombatSystem } from '../AgentCombatSystem.js';
import { EquipmentSystem } from '../EquipmentSystem.js';
import { createConflictComponent } from '../../components/ConflictComponent.js';
import { createCombatStatsComponent } from '../../components/CombatStatsComponent.js';
import { createEquipmentComponent, hasSetBonus } from '../../components/EquipmentComponent.js';
import type { EquipmentComponent } from '../../components/EquipmentComponent.js';
import type { BodyComponent, SizeCategory } from '../../components/BodyComponent.js';
import { itemRegistry } from '../../items/ItemRegistry.js';
import { defineItem } from '../../items/ItemDefinition.js';
import type { ArmorTrait } from '../../items/traits/ArmorTrait.js';

/**
 * Helper to create a basic BodyComponent for testing
 */
function createTestBodyComponent(size: SizeCategory = 'medium'): BodyComponent {
  return {
    type: 'body',
    version: 1,
    parts: {
      head_1: { id: 'head_1', type: 'head', health: 100, maxHealth: 100, functions: [], subParts: [] },
      torso_1: { id: 'torso_1', type: 'torso', health: 100, maxHealth: 100, functions: [], subParts: [] },
      legs_1: { id: 'legs_1', type: 'legs', health: 100, maxHealth: 100, functions: [], subParts: [] },
      left_arm_1: { id: 'left_arm_1', type: 'arm', health: 100, maxHealth: 100, functions: ['manipulation'], subParts: [] },
      right_arm_1: { id: 'right_arm_1', type: 'arm', health: 100, maxHealth: 100, functions: ['manipulation'], subParts: [] },
    },
    globalModifications: [],
    size,
    bloodType: 'red',
    skeletonType: 'internal',
    totalMass: 70,
  };
}

/**
 * Equipment + Combat Integration Tests
 *
 * These tests verify that the EquipmentSystem properly integrates with AgentCombatSystem.
 * We test various equipment configurations and their effects on combat outcomes.
 *
 * Test Coverage:
 * - Armor sets (iron, steel, leather, mixed)
 * - Weapon variety
 * - Set bonuses
 * - Damage reduction from armor
 * - Statistical outcomes (heavily armored should win more often)
 */

describe('Equipment + Combat Integration', () => {
  let world: WorldImpl;
  let eventBus: EventBusImpl;
  let combatSystem: AgentCombatSystem;
  let equipmentSystem: EquipmentSystem;
  let mockLLM: any;

  beforeEach(() => {
    // Clear item registry
    itemRegistry.clear();

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
      defineItem('steel_helmet', 'Steel Helmet', 'equipment', {
        weight: 2.5,
        baseMaterial: 'steel',
        traits: {
          armor: {
            defense: 7,
            weight: 2.5,
            armorClass: 'heavy',
            movementPenalty: 0.05,
            resistances: {
              slashing: 0.15,
              bludgeoning: 0.2,
            },
            target: {
              bodyPartType: 'head',
            },
          } as ArmorTrait,
        },
      })
    );

    itemRegistry.register(
      defineItem('steel_chestplate', 'Steel Chestplate', 'equipment', {
        weight: 9.0,
        baseMaterial: 'steel',
        traits: {
          armor: {
            defense: 20,
            weight: 9.0,
            armorClass: 'heavy',
            movementPenalty: 0.15,
            resistances: {
              slashing: 0.25,
              bludgeoning: 0.3,
            },
            target: {
              bodyPartType: 'torso',
            },
          } as ArmorTrait,
        },
      })
    );

    itemRegistry.register(
      defineItem('steel_greaves', 'Steel Greaves', 'equipment', {
        weight: 3.5,
        baseMaterial: 'steel',
        traits: {
          armor: {
            defense: 10,
            weight: 3.5,
            armorClass: 'heavy',
            movementPenalty: 0.1,
            resistances: {
              slashing: 0.2,
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
      defineItem('leather_cap', 'Leather Cap', 'equipment', {
        weight: 0.5,
        baseMaterial: 'leather',
        traits: {
          armor: {
            defense: 2,
            weight: 0.5,
            armorClass: 'light',
            movementPenalty: 0.01,
            resistances: {
              slashing: 0.03,
            },
            target: {
              bodyPartType: 'head',
            },
          } as ArmorTrait,
        },
      })
    );

    itemRegistry.register(
      defineItem('leather_pants', 'Leather Pants', 'equipment', {
        weight: 1.5,
        baseMaterial: 'leather',
        traits: {
          armor: {
            defense: 3,
            weight: 1.5,
            armorClass: 'light',
            movementPenalty: 0.02,
            resistances: {
              slashing: 0.04,
            },
            target: {
              bodyPartType: 'legs',
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

    itemRegistry.register(
      defineItem('steel_sword', 'Steel Sword', 'equipment', {
        weight: 3.5,
        baseMaterial: 'steel',
        traits: {
          weapon: {
            damage: 15,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 1.0,
            durabilityLoss: 0.03,
          },
        },
      })
    );

    itemRegistry.register(
      defineItem('war_hammer', 'War Hammer', 'equipment', {
        weight: 5.0,
        baseMaterial: 'iron',
        traits: {
          weapon: {
            damage: 12,
            damageType: 'bludgeoning',
            range: 1,
            attackSpeed: 0.8,
            durabilityLoss: 0.04,
          },
        },
      })
    );

    // Create world and systems
    eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);

    mockLLM = {
      generateNarrative: vi.fn().mockResolvedValue({
        narrative: 'The fighters clashed with determination.',
        memorable_details: ['clashed', 'determination'],
      }),
    };

    combatSystem = new AgentCombatSystem(mockLLM, eventBus);
    equipmentSystem = new EquipmentSystem();
  });

  /**
   * Helper to create a fighter entity with specified equipment
   */
  function createFighter(
    name: string,
    combatSkill: number,
    equipmentConfig: {
      helmet?: string;
      chestplate?: string;
      greaves?: string;
      weapon?: string;
    }
  ): EntityImpl {
    const fighter = new EntityImpl(createEntityId(), 0);

    fighter.addComponent({
      type: 'position' as const,
      version: 0,
      x: 0,
      y: 0,
      z: 0,
    });

    fighter.addComponent({
      type: 'agent' as const,
      version: 0,
      name,
    });

    fighter.addComponent(
      createCombatStatsComponent({
        combatSkill,
        huntingSkill: 5,
        stealthSkill: 5,
        weapon: 'sword', // Basic weapon string for combat system
        armor: 'heavy', // Basic armor string for combat system
      })
    );

    fighter.addComponent({
      type: 'relationship' as const,
      version: 0,
      relationships: {},
    });

    // Add body component
    fighter.addComponent(createTestBodyComponent());

    // Add equipment component with specified items
    const equipment = createEquipmentComponent();

    if (equipmentConfig.helmet) {
      equipment.equipped['head_1'] = { itemId: equipmentConfig.helmet };
    }
    if (equipmentConfig.chestplate) {
      equipment.equipped['torso_1'] = { itemId: equipmentConfig.chestplate };
    }
    if (equipmentConfig.greaves) {
      equipment.equipped['legs_1'] = { itemId: equipmentConfig.greaves };
    }
    if (equipmentConfig.weapon) {
      equipment.weapons.mainHand = { itemId: equipmentConfig.weapon };
    }

    fighter.addComponent(equipment);

    return fighter;
  }

  /**
   * Helper to run a combat simulation
   */
  function runCombat(attacker: EntityImpl, defender: EntityImpl): string {
    // Add conflict component to initiate combat
    attacker.addComponent(
      createConflictComponent({
        conflictType: 'agent_combat',
        target: defender.id,
        cause: 'territory_dispute',
        state: 'initiated',
        startTime: 0,
        lethal: false,
      })
    );

    // Add entities to world
    world.addEntity(attacker);
    world.addEntity(defender);

    // Run equipment system first to calculate defense stats
    equipmentSystem.update(world, [attacker, defender], 0.1);

    // Run combat system
    combatSystem.update(world, [attacker], 0.1);

    // Get combat outcome
    const conflict = world.getComponent(attacker.id, 'conflict') as any;
    return conflict.outcome;
  }

  describe('Iron Armor Set vs Unarmored', () => {
    it('should give significant advantage to fully armored fighter', () => {
      const wins = { armored: 0, unarmored: 0 };

      // Run 20 simulations with equal combat skill
      for (let i = 0; i < 20; i++) {
        const armored = createFighter('Armored Knight', 5, {
          helmet: 'iron_helmet',
          chestplate: 'iron_chestplate',
          greaves: 'iron_greaves',
          weapon: 'iron_sword',
        });

        const unarmored = createFighter('Unarmored Fighter', 5, {
          weapon: 'iron_sword',
        });

        const outcome = runCombat(armored, unarmored);

        if (outcome === 'attacker_victory' || outcome === 'attacker_victory_critical') {
          wins.armored++;
        } else if (outcome === 'defender_victory' || outcome === 'defender_victory_critical') {
          wins.unarmored++;
        }
      }

      // With balanced scaling (skill×3, equipment×0.4):
      // Armored: 15 + 4 + 11.2 = 30.2 power
      // Unarmored: 15 + 4 + 0 = 19 power
      // Difference: 11.2 points = ~80% win rate for armored
      expect(wins.armored).toBeGreaterThan(wins.unarmored);
      expect(wins.armored / 20).toBeGreaterThan(0.65); // Should win at least 65-70% of battles
    });
  });

  describe('Steel Armor Set vs Iron Armor Set', () => {
    it('should give advantage to better armor material', () => {
      const steelFighter = createFighter('Steel Knight', 5, {
        helmet: 'steel_helmet',
        chestplate: 'steel_chestplate',
        greaves: 'steel_greaves',
        weapon: 'steel_sword',
      });

      const ironFighter = createFighter('Iron Knight', 5, {
        helmet: 'iron_helmet',
        chestplate: 'iron_chestplate',
        greaves: 'iron_greaves',
        weapon: 'iron_sword',
      });

      // Run combat
      const outcome = runCombat(steelFighter, ironFighter);

      // Steel armor should provide better defense
      const steelEquipment = world.getComponent(steelFighter.id, 'equipment') as EquipmentComponent;
      const ironEquipment = world.getComponent(ironFighter.id, 'equipment') as EquipmentComponent;

      expect(steelEquipment.cached?.totalDefense).toBeGreaterThan(ironEquipment.cached!.totalDefense);
      expect(steelEquipment.cached?.resistances.slashing).toBeGreaterThan(ironEquipment.cached!.resistances.slashing);
    });
  });

  describe('Armor Set Bonuses', () => {
    it('should detect full iron set bonus', () => {
      const fighter = createFighter('Iron Knight', 5, {
        helmet: 'iron_helmet',
        chestplate: 'iron_chestplate',
        greaves: 'iron_greaves',
        weapon: 'iron_sword',
      });

      world.addEntity(fighter);
      equipmentSystem.update(world, [fighter], 0.1);

      const equipment = world.getComponent(fighter.id, 'equipment') as EquipmentComponent;

      expect(hasSetBonus(equipment)).toBe(true);
    });

    it('should not detect set bonus with mixed materials', () => {
      const fighter = createFighter('Mixed Armor Fighter', 5, {
        helmet: 'iron_helmet',
        chestplate: 'steel_chestplate',  // Different material
        greaves: 'iron_greaves',
        weapon: 'iron_sword',
      });

      world.addEntity(fighter);
      equipmentSystem.update(world, [fighter], 0.1);

      const equipment = world.getComponent(fighter.id, 'equipment') as EquipmentComponent;

      expect(hasSetBonus(equipment)).toBe(false);
    });

    it('should not detect set bonus with mixed armor classes', () => {
      const fighter = createFighter('Mixed Class Fighter', 5, {
        helmet: 'leather_cap',  // Light armor
        chestplate: 'iron_chestplate',  // Heavy armor
        greaves: 'iron_greaves',  // Heavy armor
        weapon: 'iron_sword',
      });

      world.addEntity(fighter);
      equipmentSystem.update(world, [fighter], 0.1);

      const equipment = world.getComponent(fighter.id, 'equipment') as EquipmentComponent;

      expect(hasSetBonus(equipment)).toBe(false);
    });
  });

  describe('Heavy vs Light Armor Trade-offs', () => {
    it('should show heavy armor has higher defense but more movement penalty', () => {
      const heavyFighter = createFighter('Heavy Knight', 5, {
        helmet: 'iron_helmet',
        chestplate: 'iron_chestplate',
        greaves: 'iron_greaves',
        weapon: 'iron_sword',
      });

      const lightFighter = createFighter('Scout', 5, {
        helmet: 'leather_cap',
        chestplate: 'leather_tunic',
        greaves: 'leather_pants',
        weapon: 'iron_sword',
      });

      world.addEntity(heavyFighter);
      world.addEntity(lightFighter);
      equipmentSystem.update(world, [heavyFighter, lightFighter], 0.1);

      const heavyEquipment = world.getComponent(heavyFighter.id, 'equipment') as EquipmentComponent;
      const lightEquipment = world.getComponent(lightFighter.id, 'equipment') as EquipmentComponent;

      // Heavy armor should have higher defense
      expect(heavyEquipment.cached?.totalDefense).toBeGreaterThan(lightEquipment.cached!.totalDefense);

      // Heavy armor should have higher movement penalty
      expect(heavyEquipment.cached?.movementPenalty).toBeGreaterThan(lightEquipment.cached!.movementPenalty);

      // Heavy armor should weigh more
      expect(heavyEquipment.totalWeight).toBeGreaterThan(lightEquipment.totalWeight);
    });
  });

  describe('Weapon Damage Type vs Armor Resistance', () => {
    it('should show slashing weapon less effective against high slashing resistance', () => {
      const slashingFighter = createFighter('Swordsman', 5, {
        helmet: 'iron_helmet',
        chestplate: 'iron_chestplate',
        greaves: 'iron_greaves',
        weapon: 'iron_sword',  // Slashing damage
      });

      const bludgeoningFighter = createFighter('Hammerer', 5, {
        helmet: 'iron_helmet',
        chestplate: 'iron_chestplate',
        greaves: 'iron_greaves',
        weapon: 'war_hammer',  // Bludgeoning damage
      });

      world.addEntity(slashingFighter);
      world.addEntity(bludgeoningFighter);
      equipmentSystem.update(world, [slashingFighter, bludgeoningFighter], 0.1);

      const equipment = world.getComponent(slashingFighter.id, 'equipment') as EquipmentComponent;

      // Iron armor has higher slashing resistance than bludgeoning (0.45 vs 0.4)
      expect(equipment.cached?.resistances.slashing).toBeGreaterThan(equipment.cached!.resistances.bludgeoning);
    });
  });

  describe('Statistical Combat Outcomes', () => {
    it('should show consistent advantage for superior equipment over many battles', () => {
      const results = {
        superiorWins: 0,
        inferiorWins: 0,
        draws: 0,
      };

      // Run 50 combat simulations
      for (let i = 0; i < 50; i++) {
        const superior = createFighter('Elite Warrior', 5, {
          helmet: 'steel_helmet',
          chestplate: 'steel_chestplate',
          greaves: 'steel_greaves',
          weapon: 'steel_sword',
        });

        const inferior = createFighter('Novice', 5, {
          helmet: 'leather_cap',
          chestplate: 'leather_tunic',
          greaves: 'leather_pants',
          weapon: 'iron_sword',
        });

        const outcome = runCombat(superior, inferior);

        if (outcome === 'attacker_victory' || outcome === 'attacker_victory_critical') {
          results.superiorWins++;
        } else if (outcome === 'defender_victory' || outcome === 'defender_victory_critical') {
          results.inferiorWins++;
        } else {
          results.draws++;
        }
      }

      // With balanced scaling (skill×3, equipment×0.4):
      // Steel: 15 + 6 + 14.8 = 35.8 power
      // Leather: 15 + 4 + 3.6 = 22.6 power
      // Difference: 13.2 points = ~66% win rate for steel
      const winRate = results.superiorWins / 50;
      expect(winRate).toBeGreaterThan(0.60); // Should win at least 60-65% of battles

      // Inferior equipment should still get some wins
      expect(results.inferiorWins).toBeLessThan(20); // Less than 40% of battles
    });
  });

  describe('Equipment Validation During Combat', () => {
    it('should remove equipment from destroyed body parts mid-combat', () => {
      const fighter = createFighter('Warrior', 5, {
        helmet: 'iron_helmet',
        chestplate: 'iron_chestplate',
        greaves: 'iron_greaves',
        weapon: 'iron_sword',
      });

      world.addEntity(fighter);

      // Verify equipment is equipped
      let equipment = world.getComponent(fighter.id, 'equipment') as EquipmentComponent;
      expect(equipment.equipped['head_1']).toBeDefined();

      // Destroy the head (simulate injury)
      const body = world.getComponent(fighter.id, 'body') as BodyComponent;
      delete body.parts.head_1;

      // Run equipment system
      equipmentSystem.update(world, [fighter], 0.1);

      // Helmet should be removed
      equipment = world.getComponent(fighter.id, 'equipment') as EquipmentComponent;
      expect(equipment.equipped['head_1']).toBeUndefined();
    });
  });

  describe('Comprehensive Equipment Configurations', () => {
    it('should properly calculate stats for various equipment combinations', () => {
      const configurations = [
        {
          name: 'Full Steel Set',
          config: {
            helmet: 'steel_helmet',
            chestplate: 'steel_chestplate',
            greaves: 'steel_greaves',
            weapon: 'steel_sword',
          },
          expectedMinDefense: 35,
        },
        {
          name: 'Full Iron Set',
          config: {
            helmet: 'iron_helmet',
            chestplate: 'iron_chestplate',
            greaves: 'iron_greaves',
            weapon: 'iron_sword',
          },
          expectedMinDefense: 25,
        },
        {
          name: 'Full Leather Set',
          config: {
            helmet: 'leather_cap',
            chestplate: 'leather_tunic',
            greaves: 'leather_pants',
            weapon: 'iron_sword',
          },
          expectedMinDefense: 8,
        },
        {
          name: 'Mixed Optimal',
          config: {
            helmet: 'steel_helmet',
            chestplate: 'steel_chestplate',
            greaves: 'iron_greaves',
            weapon: 'steel_sword',
          },
          expectedMinDefense: 30,
        },
      ];

      for (const config of configurations) {
        const fighter = createFighter('Test Fighter', 5, config.config);
        world.addEntity(fighter);
        equipmentSystem.update(world, [fighter], 0.1);

        const equipment = world.getComponent(fighter.id, 'equipment') as EquipmentComponent;

        expect(equipment.cached?.totalDefense).toBeGreaterThanOrEqual(config.expectedMinDefense);
      }
    });
  });
});
