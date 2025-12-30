import { describe, it, expect } from 'vitest';
import type {
  ItemTraits,
  EdibleTrait,
  WeaponTrait,
  MagicalTrait,
  ContainerTrait,
  ToolTrait
} from '../ItemTraits';

describe('ItemTraits', () => {
  describe('Criterion 3: Trait Type Definitions', () => {
    describe('EdibleTrait', () => {
      it('should define edible properties with required fields', () => {
        const edible: EdibleTrait = {
          hungerRestored: 20,
          quality: 60,
          flavors: ['sweet', 'fruity'],
        };

        expect(edible.hungerRestored).toBe(20);
        expect(edible.quality).toBe(60);
        expect(edible.flavors).toEqual(['sweet', 'fruity']);
      });

      it('should support optional spoilRate', () => {
        const edible: EdibleTrait = {
          hungerRestored: 15,
          quality: 50,
          flavors: ['savory'],
          spoilRate: 0.1,
        };

        expect(edible.spoilRate).toBe(0.1);
      });

      it('should allow empty flavors array', () => {
        const edible: EdibleTrait = {
          hungerRestored: 10,
          quality: 40,
          flavors: [],
        };

        expect(edible.flavors).toEqual([]);
      });
    });

    describe('WeaponTrait', () => {
      it('should define weapon properties', () => {
        const weapon: WeaponTrait = {
          damage: 15,
          damageType: 'slashing',
          range: 1,
          attackSpeed: 1.0,
          durabilityLoss: 0.5,
        };

        expect(weapon.damage).toBe(15);
        expect(weapon.damageType).toBe('slashing');
        expect(weapon.range).toBe(1);
        expect(weapon.attackSpeed).toBe(1.0);
        expect(weapon.durabilityLoss).toBe(0.5);
      });

      it('should support different damage types', () => {
        const slashing: WeaponTrait = {
          damage: 10,
          damageType: 'slashing',
          range: 1,
          attackSpeed: 1.2,
          durabilityLoss: 0.3,
        };

        const piercing: WeaponTrait = {
          damage: 12,
          damageType: 'piercing',
          range: 2,
          attackSpeed: 0.8,
          durabilityLoss: 0.4,
        };

        const bludgeoning: WeaponTrait = {
          damage: 8,
          damageType: 'bludgeoning',
          range: 1,
          attackSpeed: 1.5,
          durabilityLoss: 0.2,
        };

        expect(slashing.damageType).toBe('slashing');
        expect(piercing.damageType).toBe('piercing');
        expect(bludgeoning.damageType).toBe('bludgeoning');
      });
    });

    describe('MagicalTrait', () => {
      it('should define magical properties with effects', () => {
        const magical: MagicalTrait = {
          effects: [
            { type: 'damage', magnitude: 10, element: 'fire' },
          ],
        };

        expect(magical.effects).toHaveLength(1);
        expect(magical.effects[0].type).toBe('damage');
        expect(magical.effects[0].magnitude).toBe(10);
      });

      it('should support optional charges and recharge', () => {
        const magical: MagicalTrait = {
          effects: [
            { type: 'heal', magnitude: 20 },
          ],
          charges: 5,
          rechargeRate: 1,
          manaCost: 10,
        };

        expect(magical.charges).toBe(5);
        expect(magical.rechargeRate).toBe(1);
        expect(magical.manaCost).toBe(10);
      });

      it('should support multiple effects', () => {
        const magical: MagicalTrait = {
          effects: [
            { type: 'damage', magnitude: 5, element: 'ice' },
            { type: 'slow', magnitude: 0.5, duration: 3 },
          ],
        };

        expect(magical.effects).toHaveLength(2);
      });
    });

    describe('ContainerTrait', () => {
      it('should define container properties', () => {
        const container: ContainerTrait = {
          capacity: 20,
        };

        expect(container.capacity).toBe(20);
      });

      it('should support optional accepted categories', () => {
        const container: ContainerTrait = {
          capacity: 10,
          acceptedCategories: ['food', 'potion'],
        };

        expect(container.acceptedCategories).toEqual(['food', 'potion']);
      });

      it('should support preservation property', () => {
        const container: ContainerTrait = {
          capacity: 15,
          preserves: true,
        };

        expect(container.preserves).toBe(true);
      });
    });

    describe('ToolTrait', () => {
      it('should define tool properties', () => {
        const tool: ToolTrait = {
          toolType: 'axe',
          efficiency: 1.5,
          durabilityLoss: 0.3,
        };

        expect(tool.toolType).toBe('axe');
        expect(tool.efficiency).toBe(1.5);
        expect(tool.durabilityLoss).toBe(0.3);
      });

      it('should support different tool types', () => {
        const axe: ToolTrait = {
          toolType: 'axe',
          efficiency: 1.5,
          durabilityLoss: 0.3,
        };

        const pickaxe: ToolTrait = {
          toolType: 'pickaxe',
          efficiency: 1.8,
          durabilityLoss: 0.5,
        };

        const hoe: ToolTrait = {
          toolType: 'hoe',
          efficiency: 1.2,
          durabilityLoss: 0.2,
        };

        expect(axe.toolType).toBe('axe');
        expect(pickaxe.toolType).toBe('pickaxe');
        expect(hoe.toolType).toBe('hoe');
      });
    });

    describe('trait composition', () => {
      it('should allow item with single trait', () => {
        const traits: ItemTraits = {
          edible: {
            hungerRestored: 20,
            quality: 60,
            flavors: ['sweet'],
          },
        };

        expect(traits.edible).toBeDefined();
        expect(traits.weapon).toBeUndefined();
      });

      it('should allow item with multiple traits', () => {
        const traits: ItemTraits = {
          edible: {
            hungerRestored: 15,
            quality: 50,
            flavors: ['magical'],
          },
          magical: {
            effects: [
              { type: 'buff', magnitude: 10, duration: 60 },
            ],
          },
        };

        expect(traits.edible).toBeDefined();
        expect(traits.magical).toBeDefined();
        expect(traits.weapon).toBeUndefined();
      });

      it('should allow item with weapon and magical traits', () => {
        const traits: ItemTraits = {
          weapon: {
            damage: 20,
            damageType: 'slashing',
            range: 1,
            attackSpeed: 1.0,
            durabilityLoss: 0.5,
          },
          magical: {
            effects: [
              { type: 'damage', magnitude: 5, element: 'fire' },
            ],
            charges: 10,
          },
        };

        expect(traits.weapon).toBeDefined();
        expect(traits.magical).toBeDefined();
      });

      it('should allow item with no traits', () => {
        const traits: ItemTraits = {};

        expect(traits.edible).toBeUndefined();
        expect(traits.weapon).toBeUndefined();
        expect(traits.magical).toBeUndefined();
        expect(traits.container).toBeUndefined();
        expect(traits.tool).toBeUndefined();
      });

      it('should allow all traits on one item (edge case)', () => {
        const traits: ItemTraits = {
          edible: {
            hungerRestored: 5,
            quality: 30,
            flavors: ['strange'],
          },
          weapon: {
            damage: 3,
            damageType: 'bludgeoning',
            range: 1,
            attackSpeed: 2.0,
            durabilityLoss: 0.1,
          },
          magical: {
            effects: [{ type: 'confusion', magnitude: 1 }],
          },
          container: {
            capacity: 1,
          },
          tool: {
            toolType: 'improvised',
            efficiency: 0.5,
            durabilityLoss: 0.8,
          },
        };

        expect(traits.edible).toBeDefined();
        expect(traits.weapon).toBeDefined();
        expect(traits.magical).toBeDefined();
        expect(traits.container).toBeDefined();
        expect(traits.tool).toBeDefined();
      });
    });
  });
});
