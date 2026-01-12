# Item System

Centralized item definitions, registry, and instance management. Supports compositional trait system for weapons, tools, armor, magic, and more.

## Core Concepts

**ItemDefinition**: Template defining an item type (id, category, weight, stackSize, traits). Registered in `ItemRegistry`.

**ItemInstance**: Runtime instance tracking quality, condition, material overrides, enchantments, creator, and provenance.

**ItemTraits**: Compositional trait bag. Items can have zero or more traits (edible, weapon, tool, armor, magical, container, ammo, statBonus).

## Item Structure

```typescript
const sword: ItemDefinition = {
  id: 'iron_sword',
  displayName: 'Iron Sword',
  category: 'equipment',
  weight: 3.5,
  stackSize: 1,
  baseMaterial: 'iron',
  traits: {
    weapon: {
      damage: 15,
      damageType: 'slashing',
      range: 1,
      attackSpeed: 1.2,
      durabilityLoss: 0.01,
      category: 'sword',
      attackType: 'melee'
    }
  },
  baseValue: 100,
  rarity: 'common'
};
```

## Categories

`resource | food | seed | tool | material | consumable | equipment | ammo | misc`

## Weapons

**DamageTypes**: Physical (slashing, piercing, bludgeoning), Elemental (fire, frost, lightning, poison), Magic, Energy (laser, plasma, particle, ion), Exotic (force, psionic, void, radiant, necrotic)

**Categories**: Melee (sword, axe, spear, dagger), Ranged (bow, crossbow, firearms), Energy (laser, plasma, beam), Magic (staff, wand, orb, grimoire), Exotic (energy_blade, force_weapon, soul_weapon)

**Ammo**: `AmmoRequirement` for ammo type, magazine size, reload time. `ProjectileConfig` for speed, arc, penetration, dropoff.

**Specials**: armor_piercing, bleeding, stunning, knockback, lifesteal, chain_lightning, explosive, homing, reach, overcharge, etc.

## Tools

**ToolTypes**: axe, pickaxe, hammer, saw, hoe, sickle, knife, needle, chisel, tongs, bellows

**Properties**: efficiency multiplier, durabilityLoss, qualityBonus, multiPurpose

## Other Traits

**Edible**: hungerRestored, quality, flavors (sweet, savory, bitter, spicy, umami, sour)

**Armor**: defenseValue, armorSlot (head, chest, legs, feet, hands, shield), resistances, weight penalty

**Magical**: spellEffects, manaBonus, castSpeedBonus, schoolAffinity (elemental, arcane, divine, necromantic, illusion, enchantment)

**Container**: capacity, allowedCategories, weightReduction

**Material**: hardness, density, conductivity, magical affinity for surreal building materials

## Usage

```typescript
import { itemRegistry, ItemInstance, itemInstanceRegistry } from './items';

// Query items
const sword = itemRegistry.get('iron_sword');
if (itemRegistry.isEdible('berry')) { /* ... */ }
const tools = itemRegistry.getByCategory('tool');

// Create instance
const instance: ItemInstance = {
  instanceId: uuid(),
  definitionId: 'iron_sword',
  quality: 75,  // fine quality
  condition: 100,
  stackSize: 1,
  creator: agentId,
  createdAt: world.tick
};

itemInstanceRegistry.register(instance);
```

## Quality System

Numeric 0-100 maps to tiers: poor (<40), normal (40-70), fine (70-85), masterwork (85-95), legendary (95+). Affects price multiplier, durability, and bonuses.

## Data Loading

Load from JSON via `ItemLoader.loadItemsFromJson()`. Supports validation, migration from v1 (flat flags) to v2 (traits), and dynamic registration.

## Artifacts

Dwarf Fortress-style artifacts with strange moods, decorations, engravings, history tracking, and rarity (common → unique → artifact → relic → mythical).
