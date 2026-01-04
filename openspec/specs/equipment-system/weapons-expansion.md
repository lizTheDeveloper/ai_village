# Weapons Expansion Specification

**Created:** 2026-01-04
**Status:** Draft
**Version:** 0.1.0

---

## Overview

Expand the weapon system from the current narrow medieval melee focus (swords, daggers, scepters) to a comprehensive arsenal spanning multiple eras and genres:

- **Melee**: Swords, spears, axes, hammers, daggers, fist weapons, exotic (lightsabers, energy blades)
- **Ranged Traditional**: Bows, crossbows, throwing weapons, slings
- **Ranged Firearms**: Muskets, rifles, pistols, shotguns
- **Ranged Energy**: Lasers, beam weapons, plasma cannons, particle rifles
- **Magic Focus**: Staves, wands, orbs, grimoires
- **Exotic/Fantasy**: Lightsabers, force weapons, psionic blades, soul weapons

---

## Design Principles

### 1. Era-Agnostic Foundation

The base system supports any tech level. Research/unlocks gate higher-tier weapons:

```
Primitive → Medieval → Renaissance → Industrial → Modern → Clarketech
  (clubs)   (swords)    (muskets)    (rifles)    (lasers)  (plasma)
```

### 2. Damage Type Determines Counters

Weapons and armor interact through damage types. Futuristic weapons introduce new damage types:

```typescript
// Extended damage types (add to WeaponTrait.ts)
type DamageType =
  // Physical (existing)
  | 'slashing' | 'piercing' | 'bludgeoning'
  // Elemental (existing)
  | 'fire' | 'frost' | 'lightning' | 'poison'
  // Magic (existing)
  | 'magic'
  // NEW: Energy
  | 'laser'        // Concentrated light - burns, precise
  | 'plasma'       // Superheated gas - explosive, area
  | 'particle'     // Subatomic - ignores some armor
  | 'ion'          // Disrupts electronics/magic
  // NEW: Exotic
  | 'force'        // Pure kinetic/telekinetic
  | 'psionic'      // Mental damage
  | 'void'         // Entropy/antimatter
  | 'radiant'      // Holy/divine
  | 'necrotic';    // Death/soul damage
```

### 3. Ammo System for Ranged

Ranged weapons require ammunition (with exceptions for energy weapons with power cells):

```typescript
interface AmmoRequirement {
  ammoType: string;           // 'arrow', 'bullet_9mm', 'energy_cell'
  ammoPerShot: number;        // 1 for bow, 3 for burst fire
  magazineSize?: number;      // 0 = single shot, 30 = auto rifles
  reloadTime?: number;        // Ticks to reload
}
```

---

## WeaponTrait Extension

```typescript
// Updated WeaponTrait (extends existing)
interface WeaponTrait {
  // === Existing fields ===
  damage: number;
  damageType: DamageType;
  range: number;              // 1 = melee, 10+ = ranged
  attackSpeed: number;
  durabilityLoss: number;
  twoHanded?: boolean;
  critChance?: number;
  critMultiplier?: number;

  // === NEW fields ===

  /** Weapon category for skill bonuses and animations */
  category: WeaponCategory;

  /** Attack type determines combat behavior */
  attackType: 'melee' | 'ranged' | 'magic';

  /** Ammo requirement for ranged weapons */
  ammo?: AmmoRequirement;

  /** Power requirement for energy weapons */
  powerCost?: number;         // Energy per shot (drains power cell)

  /** Minimum range (can't fire at point blank) */
  minRange?: number;

  /** Area of effect radius (0 = single target) */
  aoeRadius?: number;

  /** Projectile properties */
  projectile?: {
    speed: number;            // Tiles per tick
    arc: boolean;             // Arcing projectile (arrows) vs straight (bullets)
    penetration: number;      // Targets hit before stopping
    dropoff?: number;         // Damage reduction per tile
  };

  /** Special weapon properties */
  special?: WeaponSpecial[];
}

type WeaponCategory =
  // Melee
  | 'sword' | 'axe' | 'mace' | 'hammer' | 'spear' | 'polearm'
  | 'dagger' | 'fist' | 'whip' | 'chain'
  // Ranged Traditional
  | 'bow' | 'crossbow' | 'throwing' | 'sling'
  // Ranged Firearms
  | 'pistol' | 'rifle' | 'shotgun' | 'smg' | 'heavy'
  // Ranged Energy
  | 'laser' | 'plasma' | 'particle' | 'beam'
  // Magic Focus
  | 'staff' | 'wand' | 'orb' | 'grimoire'
  // Exotic
  | 'energy_blade' | 'force_weapon' | 'psionic' | 'soul_weapon';

type WeaponSpecial =
  | 'armor_piercing'      // Ignores X% armor
  | 'bleeding'            // DoT
  | 'burning'             // Fire DoT
  | 'freezing'            // Slow effect
  | 'stunning'            // Stun chance
  | 'shield_breaker'      // Extra vs shields
  | 'anti_magic'          // Disrupts spells
  | 'lifesteal'           // Heals on hit
  | 'chain_lightning'     // Jumps to nearby targets
  | 'explosive'           // AoE on impact
  | 'silenced'            // No noise (stealth)
  | 'scatter'             // Multiple projectiles (shotgun)
  | 'homing'              // Tracks targets
  | 'overcharge';         // Charge for more damage
```

---

## Ammo System

### Ammo Definitions

```typescript
// Ammo as items in the item system
interface AmmoDefinition extends ItemDefinition {
  category: 'ammo';
  traits: {
    ammo: {
      ammoType: string;       // Matches weapon's ammo.ammoType
      damageModifier: number; // Multiplier to base weapon damage
      specialEffect?: string; // 'explosive', 'armor_piercing', etc.
    };
  };
}

// Example ammo types
const AMMO_ITEMS: ItemDefinition[] = [
  // Arrows
  defineItem('arrow_wood', 'Wooden Arrow', 'ammo', {
    weight: 0.05,
    stackSize: 50,
    traits: { ammo: { ammoType: 'arrow', damageModifier: 1.0 } }
  }),
  defineItem('arrow_iron', 'Iron Arrow', 'ammo', {
    weight: 0.08,
    stackSize: 50,
    traits: { ammo: { ammoType: 'arrow', damageModifier: 1.3 } }
  }),
  defineItem('arrow_explosive', 'Explosive Arrow', 'ammo', {
    weight: 0.15,
    stackSize: 20,
    traits: { ammo: { ammoType: 'arrow', damageModifier: 2.0, specialEffect: 'explosive' } }
  }),

  // Bullets
  defineItem('bullet_9mm', '9mm Rounds', 'ammo', {
    weight: 0.01,
    stackSize: 100,
    traits: { ammo: { ammoType: 'bullet_pistol', damageModifier: 1.0 } }
  }),
  defineItem('bullet_rifle', 'Rifle Rounds', 'ammo', {
    weight: 0.02,
    stackSize: 60,
    traits: { ammo: { ammoType: 'bullet_rifle', damageModifier: 1.0 } }
  }),
  defineItem('shell_shotgun', 'Shotgun Shells', 'ammo', {
    weight: 0.03,
    stackSize: 40,
    traits: { ammo: { ammoType: 'shell_shotgun', damageModifier: 1.0 } }
  }),

  // Energy cells
  defineItem('energy_cell_small', 'Small Energy Cell', 'ammo', {
    weight: 0.2,
    stackSize: 20,
    traits: { ammo: { ammoType: 'energy_cell', damageModifier: 1.0 } }
  }),
  defineItem('plasma_canister', 'Plasma Canister', 'ammo', {
    weight: 0.5,
    stackSize: 10,
    traits: { ammo: { ammoType: 'plasma_fuel', damageModifier: 1.0 } }
  }),
];
```

---

## Weapon Definitions by Category

### Melee Weapons - Primitive

```typescript
const PRIMITIVE_MELEE: ItemDefinition[] = [
  defineItem('club_wood', 'Wooden Club', 'equipment', {
    weight: 2.0,
    traits: {
      weapon: {
        damage: 4, damageType: 'bludgeoning', range: 1,
        attackSpeed: 1.3, durabilityLoss: 0.02,
        category: 'mace', attackType: 'melee'
      }
    }
  }),
  defineItem('stone_axe', 'Stone Axe', 'equipment', {
    weight: 2.5,
    traits: {
      weapon: {
        damage: 6, damageType: 'slashing', range: 1,
        attackSpeed: 1.0, durabilityLoss: 0.03,
        category: 'axe', attackType: 'melee'
      }
    }
  }),
  defineItem('flint_spear', 'Flint Spear', 'equipment', {
    weight: 1.8,
    traits: {
      weapon: {
        damage: 5, damageType: 'piercing', range: 2,
        attackSpeed: 1.1, durabilityLoss: 0.02,
        category: 'spear', attackType: 'melee'
      }
    }
  }),
];
```

### Melee Weapons - Medieval

```typescript
const MEDIEVAL_MELEE: ItemDefinition[] = [
  // Swords
  defineItem('iron_sword', 'Iron Sword', 'equipment', {
    weight: 3.0,
    baseMaterial: 'iron',
    traits: {
      weapon: {
        damage: 10, damageType: 'slashing', range: 1,
        attackSpeed: 1.2, durabilityLoss: 0.01,
        category: 'sword', attackType: 'melee',
        critChance: 0.05, critMultiplier: 1.5
      }
    }
  }),
  defineItem('steel_sword', 'Steel Sword', 'equipment', {
    weight: 3.0,
    baseMaterial: 'steel',
    traits: {
      weapon: {
        damage: 14, damageType: 'slashing', range: 1,
        attackSpeed: 1.3, durabilityLoss: 0.008,
        category: 'sword', attackType: 'melee',
        critChance: 0.08, critMultiplier: 1.8
      }
    }
  }),
  defineItem('greatsword_iron', 'Iron Greatsword', 'equipment', {
    weight: 5.0,
    baseMaterial: 'iron',
    traits: {
      weapon: {
        damage: 18, damageType: 'slashing', range: 1,
        attackSpeed: 0.7, durabilityLoss: 0.015, twoHanded: true,
        category: 'sword', attackType: 'melee',
        critChance: 0.10, critMultiplier: 2.0
      }
    }
  }),

  // Spears
  defineItem('iron_spear', 'Iron Spear', 'equipment', {
    weight: 2.5,
    baseMaterial: 'iron',
    traits: {
      weapon: {
        damage: 8, damageType: 'piercing', range: 2,
        attackSpeed: 1.1, durabilityLoss: 0.01,
        category: 'spear', attackType: 'melee'
      }
    }
  }),
  defineItem('pike', 'Pike', 'equipment', {
    weight: 4.0,
    baseMaterial: 'iron',
    traits: {
      weapon: {
        damage: 12, damageType: 'piercing', range: 3,
        attackSpeed: 0.8, durabilityLoss: 0.012, twoHanded: true,
        category: 'polearm', attackType: 'melee'
      }
    }
  }),
  defineItem('halberd', 'Halberd', 'equipment', {
    weight: 5.0,
    baseMaterial: 'steel',
    traits: {
      weapon: {
        damage: 16, damageType: 'slashing', range: 2,
        attackSpeed: 0.7, durabilityLoss: 0.015, twoHanded: true,
        category: 'polearm', attackType: 'melee',
        special: ['armor_piercing']
      }
    }
  }),

  // Axes
  defineItem('battleaxe_iron', 'Iron Battleaxe', 'equipment', {
    weight: 4.0,
    baseMaterial: 'iron',
    traits: {
      weapon: {
        damage: 14, damageType: 'slashing', range: 1,
        attackSpeed: 0.9, durabilityLoss: 0.012,
        category: 'axe', attackType: 'melee',
        critChance: 0.12, critMultiplier: 2.0
      }
    }
  }),

  // Hammers & Maces
  defineItem('warhammer_iron', 'Iron Warhammer', 'equipment', {
    weight: 5.0,
    baseMaterial: 'iron',
    traits: {
      weapon: {
        damage: 16, damageType: 'bludgeoning', range: 1,
        attackSpeed: 0.6, durabilityLoss: 0.008, twoHanded: true,
        category: 'hammer', attackType: 'melee',
        special: ['armor_piercing', 'stunning']
      }
    }
  }),
  defineItem('mace_iron', 'Iron Mace', 'equipment', {
    weight: 3.5,
    baseMaterial: 'iron',
    traits: {
      weapon: {
        damage: 10, damageType: 'bludgeoning', range: 1,
        attackSpeed: 1.0, durabilityLoss: 0.008,
        category: 'mace', attackType: 'melee',
        special: ['stunning']
      }
    }
  }),

  // Daggers
  defineItem('iron_dagger', 'Iron Dagger', 'equipment', {
    weight: 0.8,
    baseMaterial: 'iron',
    traits: {
      weapon: {
        damage: 5, damageType: 'piercing', range: 1,
        attackSpeed: 2.0, durabilityLoss: 0.01,
        category: 'dagger', attackType: 'melee',
        critChance: 0.15, critMultiplier: 2.5
      }
    }
  }),
];
```

### Ranged Weapons - Traditional

```typescript
const TRADITIONAL_RANGED: ItemDefinition[] = [
  // Bows
  defineItem('shortbow_wood', 'Wooden Shortbow', 'equipment', {
    weight: 1.0,
    baseMaterial: 'wood',
    traits: {
      weapon: {
        damage: 6, damageType: 'piercing', range: 15,
        attackSpeed: 1.2, durabilityLoss: 0.005, twoHanded: true,
        category: 'bow', attackType: 'ranged',
        ammo: { ammoType: 'arrow', ammoPerShot: 1 },
        projectile: { speed: 8, arc: true, penetration: 1 }
      }
    }
  }),
  defineItem('longbow_yew', 'Yew Longbow', 'equipment', {
    weight: 1.5,
    baseMaterial: 'yew_wood',
    traits: {
      weapon: {
        damage: 10, damageType: 'piercing', range: 25,
        attackSpeed: 0.9, durabilityLoss: 0.005, twoHanded: true,
        category: 'bow', attackType: 'ranged',
        ammo: { ammoType: 'arrow', ammoPerShot: 1 },
        projectile: { speed: 12, arc: true, penetration: 1, dropoff: 0.1 }
      }
    }
  }),
  defineItem('composite_bow', 'Composite Bow', 'equipment', {
    weight: 1.2,
    traits: {
      weapon: {
        damage: 12, damageType: 'piercing', range: 20,
        attackSpeed: 1.1, durabilityLoss: 0.006, twoHanded: true,
        category: 'bow', attackType: 'ranged',
        ammo: { ammoType: 'arrow', ammoPerShot: 1 },
        projectile: { speed: 10, arc: true, penetration: 1 },
        special: ['armor_piercing']
      }
    }
  }),

  // Crossbows
  defineItem('crossbow_light', 'Light Crossbow', 'equipment', {
    weight: 2.5,
    baseMaterial: 'wood',
    traits: {
      weapon: {
        damage: 12, damageType: 'piercing', range: 20,
        attackSpeed: 0.5, durabilityLoss: 0.008, twoHanded: true,
        category: 'crossbow', attackType: 'ranged',
        ammo: { ammoType: 'bolt', ammoPerShot: 1, reloadTime: 40 },
        projectile: { speed: 15, arc: false, penetration: 1 },
        special: ['armor_piercing']
      }
    }
  }),
  defineItem('crossbow_heavy', 'Heavy Crossbow', 'equipment', {
    weight: 5.0,
    baseMaterial: 'steel',
    traits: {
      weapon: {
        damage: 20, damageType: 'piercing', range: 30,
        attackSpeed: 0.3, durabilityLoss: 0.010, twoHanded: true,
        category: 'crossbow', attackType: 'ranged',
        ammo: { ammoType: 'bolt', ammoPerShot: 1, reloadTime: 80 },
        projectile: { speed: 18, arc: false, penetration: 2 },
        special: ['armor_piercing']
      }
    }
  }),

  // Throwing
  defineItem('throwing_knife', 'Throwing Knife', 'equipment', {
    weight: 0.3,
    stackSize: 10,
    traits: {
      weapon: {
        damage: 4, damageType: 'piercing', range: 8,
        attackSpeed: 2.0, durabilityLoss: 0.05,
        category: 'throwing', attackType: 'ranged',
        projectile: { speed: 10, arc: false, penetration: 1 }
      }
    }
  }),
  defineItem('javelin', 'Javelin', 'equipment', {
    weight: 1.0,
    stackSize: 5,
    traits: {
      weapon: {
        damage: 10, damageType: 'piercing', range: 12,
        attackSpeed: 0.8, durabilityLoss: 0.10,
        category: 'throwing', attackType: 'ranged',
        projectile: { speed: 8, arc: true, penetration: 1 }
      }
    }
  }),

  // Sling
  defineItem('sling_leather', 'Leather Sling', 'equipment', {
    weight: 0.2,
    traits: {
      weapon: {
        damage: 5, damageType: 'bludgeoning', range: 15,
        attackSpeed: 1.0, durabilityLoss: 0.002,
        category: 'sling', attackType: 'ranged',
        ammo: { ammoType: 'sling_stone', ammoPerShot: 1 },
        projectile: { speed: 12, arc: true, penetration: 1 }
      }
    }
  }),
];
```

### Ranged Weapons - Firearms

```typescript
const FIREARMS: ItemDefinition[] = [
  // Pistols
  defineItem('flintlock_pistol', 'Flintlock Pistol', 'equipment', {
    weight: 1.2,
    traits: {
      weapon: {
        damage: 15, damageType: 'piercing', range: 10,
        attackSpeed: 0.3, durabilityLoss: 0.02,
        category: 'pistol', attackType: 'ranged',
        ammo: { ammoType: 'bullet_musket', ammoPerShot: 1, magazineSize: 1, reloadTime: 100 },
        projectile: { speed: 25, arc: false, penetration: 1 },
        special: ['armor_piercing']
      }
    }
  }),
  defineItem('revolver', 'Revolver', 'equipment', {
    weight: 1.0,
    traits: {
      weapon: {
        damage: 18, damageType: 'piercing', range: 15,
        attackSpeed: 0.8, durabilityLoss: 0.01,
        category: 'pistol', attackType: 'ranged',
        ammo: { ammoType: 'bullet_pistol', ammoPerShot: 1, magazineSize: 6, reloadTime: 60 },
        projectile: { speed: 30, arc: false, penetration: 1 }
      }
    }
  }),
  defineItem('pistol_auto', 'Automatic Pistol', 'equipment', {
    weight: 0.9,
    traits: {
      weapon: {
        damage: 12, damageType: 'piercing', range: 12,
        attackSpeed: 1.5, durabilityLoss: 0.008,
        category: 'pistol', attackType: 'ranged',
        ammo: { ammoType: 'bullet_pistol', ammoPerShot: 1, magazineSize: 15, reloadTime: 30 },
        projectile: { speed: 35, arc: false, penetration: 1 }
      }
    }
  }),

  // Rifles
  defineItem('musket', 'Musket', 'equipment', {
    weight: 4.5,
    traits: {
      weapon: {
        damage: 25, damageType: 'piercing', range: 30,
        attackSpeed: 0.2, durabilityLoss: 0.02, twoHanded: true,
        category: 'rifle', attackType: 'ranged',
        ammo: { ammoType: 'bullet_musket', ammoPerShot: 1, magazineSize: 1, reloadTime: 150 },
        projectile: { speed: 30, arc: false, penetration: 1 },
        special: ['armor_piercing']
      }
    }
  }),
  defineItem('rifle_bolt', 'Bolt-Action Rifle', 'equipment', {
    weight: 4.0,
    traits: {
      weapon: {
        damage: 30, damageType: 'piercing', range: 50,
        attackSpeed: 0.5, durabilityLoss: 0.01, twoHanded: true,
        category: 'rifle', attackType: 'ranged',
        ammo: { ammoType: 'bullet_rifle', ammoPerShot: 1, magazineSize: 5, reloadTime: 40 },
        projectile: { speed: 50, arc: false, penetration: 2 },
        special: ['armor_piercing']
      }
    }
  }),
  defineItem('rifle_auto', 'Automatic Rifle', 'equipment', {
    weight: 3.5,
    traits: {
      weapon: {
        damage: 20, damageType: 'piercing', range: 40,
        attackSpeed: 1.5, durabilityLoss: 0.015, twoHanded: true,
        category: 'rifle', attackType: 'ranged',
        ammo: { ammoType: 'bullet_rifle', ammoPerShot: 1, magazineSize: 30, reloadTime: 50 },
        projectile: { speed: 45, arc: false, penetration: 1 }
      }
    }
  }),

  // Shotguns
  defineItem('shotgun_double', 'Double-Barrel Shotgun', 'equipment', {
    weight: 3.5,
    traits: {
      weapon: {
        damage: 35, damageType: 'piercing', range: 8,
        attackSpeed: 0.6, durabilityLoss: 0.015, twoHanded: true,
        category: 'shotgun', attackType: 'ranged',
        ammo: { ammoType: 'shell_shotgun', ammoPerShot: 1, magazineSize: 2, reloadTime: 60 },
        projectile: { speed: 25, arc: false, penetration: 1, dropoff: 0.3 },
        special: ['scatter']
      }
    }
  }),
  defineItem('shotgun_pump', 'Pump Shotgun', 'equipment', {
    weight: 3.8,
    traits: {
      weapon: {
        damage: 30, damageType: 'piercing', range: 10,
        attackSpeed: 0.8, durabilityLoss: 0.012, twoHanded: true,
        category: 'shotgun', attackType: 'ranged',
        ammo: { ammoType: 'shell_shotgun', ammoPerShot: 1, magazineSize: 8, reloadTime: 80 },
        projectile: { speed: 25, arc: false, penetration: 1, dropoff: 0.25 },
        special: ['scatter']
      }
    }
  }),

  // SMG
  defineItem('smg', 'Submachine Gun', 'equipment', {
    weight: 2.5,
    traits: {
      weapon: {
        damage: 10, damageType: 'piercing', range: 20,
        attackSpeed: 3.0, durabilityLoss: 0.02, twoHanded: false,
        category: 'smg', attackType: 'ranged',
        ammo: { ammoType: 'bullet_pistol', ammoPerShot: 3, magazineSize: 30, reloadTime: 35 },
        projectile: { speed: 35, arc: false, penetration: 1 }
      }
    }
  }),

  // Heavy
  defineItem('minigun', 'Minigun', 'equipment', {
    weight: 15.0,
    traits: {
      weapon: {
        damage: 8, damageType: 'piercing', range: 35,
        attackSpeed: 10.0, durabilityLoss: 0.05, twoHanded: true,
        category: 'heavy', attackType: 'ranged',
        ammo: { ammoType: 'bullet_heavy', ammoPerShot: 10, magazineSize: 200, reloadTime: 200 },
        projectile: { speed: 50, arc: false, penetration: 1 }
      }
    }
  }),
];
```

### Ranged Weapons - Energy

```typescript
const ENERGY_WEAPONS: ItemDefinition[] = [
  // Lasers
  defineItem('laser_pistol', 'Laser Pistol', 'equipment', {
    weight: 0.8,
    traits: {
      weapon: {
        damage: 15, damageType: 'laser', range: 20,
        attackSpeed: 1.2, durabilityLoss: 0.005,
        category: 'laser', attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 1, magazineSize: 20, reloadTime: 20 },
        projectile: { speed: 100, arc: false, penetration: 1 },
        special: ['burning']
      }
    }
  }),
  defineItem('laser_rifle', 'Laser Rifle', 'equipment', {
    weight: 2.5,
    traits: {
      weapon: {
        damage: 25, damageType: 'laser', range: 50,
        attackSpeed: 0.8, durabilityLoss: 0.008, twoHanded: true,
        category: 'laser', attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 2, magazineSize: 30, reloadTime: 30 },
        projectile: { speed: 100, arc: false, penetration: 2 },
        special: ['burning', 'armor_piercing']
      }
    }
  }),
  defineItem('laser_cannon', 'Laser Cannon', 'equipment', {
    weight: 8.0,
    traits: {
      weapon: {
        damage: 50, damageType: 'laser', range: 80,
        attackSpeed: 0.3, durabilityLoss: 0.015, twoHanded: true,
        category: 'beam', attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 10, magazineSize: 50, reloadTime: 80 },
        projectile: { speed: 100, arc: false, penetration: 5 },
        special: ['burning', 'armor_piercing', 'overcharge'],
        aoeRadius: 1
      }
    }
  }),

  // Plasma
  defineItem('plasma_pistol', 'Plasma Pistol', 'equipment', {
    weight: 1.2,
    traits: {
      weapon: {
        damage: 20, damageType: 'plasma', range: 15,
        attackSpeed: 0.8, durabilityLoss: 0.01,
        category: 'plasma', attackType: 'ranged',
        ammo: { ammoType: 'plasma_fuel', ammoPerShot: 1, magazineSize: 10, reloadTime: 40 },
        projectile: { speed: 20, arc: false, penetration: 1 },
        special: ['burning', 'explosive'],
        aoeRadius: 1
      }
    }
  }),
  defineItem('plasma_rifle', 'Plasma Rifle', 'equipment', {
    weight: 4.0,
    traits: {
      weapon: {
        damage: 35, damageType: 'plasma', range: 30,
        attackSpeed: 0.5, durabilityLoss: 0.015, twoHanded: true,
        category: 'plasma', attackType: 'ranged',
        ammo: { ammoType: 'plasma_fuel', ammoPerShot: 2, magazineSize: 20, reloadTime: 60 },
        projectile: { speed: 25, arc: false, penetration: 1 },
        special: ['burning', 'explosive', 'armor_piercing'],
        aoeRadius: 2
      }
    }
  }),
  defineItem('plasma_cannon', 'Plasma Cannon', 'equipment', {
    weight: 12.0,
    traits: {
      weapon: {
        damage: 80, damageType: 'plasma', range: 40,
        attackSpeed: 0.2, durabilityLoss: 0.025, twoHanded: true,
        category: 'plasma', attackType: 'ranged',
        ammo: { ammoType: 'plasma_fuel', ammoPerShot: 5, magazineSize: 25, reloadTime: 100 },
        projectile: { speed: 15, arc: true, penetration: 1 },
        special: ['burning', 'explosive', 'armor_piercing'],
        aoeRadius: 4
      }
    }
  }),

  // Particle
  defineItem('particle_rifle', 'Particle Rifle', 'equipment', {
    weight: 3.5,
    traits: {
      weapon: {
        damage: 30, damageType: 'particle', range: 60,
        attackSpeed: 0.6, durabilityLoss: 0.012, twoHanded: true,
        category: 'particle', attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 3, magazineSize: 30, reloadTime: 50 },
        projectile: { speed: 80, arc: false, penetration: 4 },
        special: ['armor_piercing']  // Ignores 50% armor
      }
    }
  }),

  // Ion (anti-tech/magic)
  defineItem('ion_pistol', 'Ion Pistol', 'equipment', {
    weight: 1.0,
    traits: {
      weapon: {
        damage: 10, damageType: 'ion', range: 15,
        attackSpeed: 1.0, durabilityLoss: 0.008,
        category: 'laser', attackType: 'ranged',
        ammo: { ammoType: 'energy_cell', ammoPerShot: 1, magazineSize: 15, reloadTime: 25 },
        projectile: { speed: 60, arc: false, penetration: 1 },
        special: ['anti_magic']  // Disrupts shields/magic
      }
    }
  }),

  // Beam (continuous)
  defineItem('beam_rifle', 'Continuous Beam Rifle', 'equipment', {
    weight: 5.0,
    traits: {
      weapon: {
        damage: 8, damageType: 'laser', range: 40,
        attackSpeed: 5.0, durabilityLoss: 0.02, twoHanded: true,
        category: 'beam', attackType: 'ranged',
        powerCost: 1,  // Drains power continuously
        projectile: { speed: 100, arc: false, penetration: 1 },
        special: ['burning']
      }
    }
  }),
];
```

### Exotic/Fantasy Weapons

```typescript
const EXOTIC_WEAPONS: ItemDefinition[] = [
  // Energy Blades (Lightsaber-style)
  defineItem('energy_blade', 'Energy Blade', 'equipment', {
    weight: 0.5,
    traits: {
      weapon: {
        damage: 40, damageType: 'plasma', range: 1,
        attackSpeed: 1.5, durabilityLoss: 0.001,
        category: 'energy_blade', attackType: 'melee',
        powerCost: 0.1,  // Drains slowly while active
        special: ['armor_piercing', 'burning']
      }
    }
  }),
  defineItem('double_energy_blade', 'Double Energy Blade', 'equipment', {
    weight: 1.0,
    traits: {
      weapon: {
        damage: 35, damageType: 'plasma', range: 1,
        attackSpeed: 2.0, durabilityLoss: 0.001, twoHanded: true,
        category: 'energy_blade', attackType: 'melee',
        powerCost: 0.2,
        special: ['armor_piercing', 'burning']
      }
    }
  }),

  // Force Weapons (telekinetic)
  defineItem('force_hammer', 'Force Hammer', 'equipment', {
    weight: 2.0,
    traits: {
      weapon: {
        damage: 25, damageType: 'force', range: 1,
        attackSpeed: 0.8, durabilityLoss: 0.005, twoHanded: true,
        category: 'force_weapon', attackType: 'melee',
        aoeRadius: 2,
        special: ['stunning', 'shield_breaker']
      }
    }
  }),
  defineItem('force_lance', 'Force Lance', 'equipment', {
    weight: 1.5,
    traits: {
      weapon: {
        damage: 20, damageType: 'force', range: 3,
        attackSpeed: 1.2, durabilityLoss: 0.003,
        category: 'force_weapon', attackType: 'melee',
        special: ['armor_piercing']
      }
    }
  }),

  // Psionic Weapons
  defineItem('psionic_blade', 'Psionic Blade', 'equipment', {
    weight: 0.1,  // Nearly weightless (made of thought)
    traits: {
      weapon: {
        damage: 25, damageType: 'psionic', range: 1,
        attackSpeed: 1.8, durabilityLoss: 0,  // Never breaks
        category: 'psionic', attackType: 'melee',
        special: ['armor_piercing']  // Ignores physical armor
      },
      magical: {
        magicType: 'psionic',
        manaPerUse: 5
      }
    }
  }),

  // Soul Weapons
  defineItem('soul_reaver', 'Soul Reaver', 'equipment', {
    weight: 2.0,
    traits: {
      weapon: {
        damage: 30, damageType: 'necrotic', range: 1,
        attackSpeed: 1.0, durabilityLoss: 0.002,
        category: 'soul_weapon', attackType: 'melee',
        special: ['lifesteal']  // Heals wielder
      },
      magical: {
        magicType: 'death',
        manaPerUse: 3
      }
    }
  }),

  // Holy/Radiant Weapons
  defineItem('blessed_blade', 'Blessed Blade', 'equipment', {
    weight: 2.5,
    traits: {
      weapon: {
        damage: 20, damageType: 'radiant', range: 1,
        attackSpeed: 1.2, durabilityLoss: 0.005,
        category: 'sword', attackType: 'melee',
        special: ['anti_magic']  // Bonus vs undead/demons
      },
      magical: {
        magicType: 'holy',
        manaPerUse: 0  // Powered by faith
      }
    }
  }),

  // Void Weapons
  defineItem('void_dagger', 'Void Dagger', 'equipment', {
    weight: 0.3,
    traits: {
      weapon: {
        damage: 35, damageType: 'void', range: 1,
        attackSpeed: 1.5, durabilityLoss: 0.01,
        category: 'dagger', attackType: 'melee',
        special: ['armor_piercing']  // Ignores ALL armor/shields
      },
      magical: {
        magicType: 'entropy',
        manaPerUse: 10,
        cursed: true
      }
    }
  }),
];
```

### Magic Focus Weapons

```typescript
const MAGIC_FOCUS: ItemDefinition[] = [
  // Staves
  defineItem('oak_staff', 'Oak Staff', 'equipment', {
    weight: 2.0,
    baseMaterial: 'wood',
    traits: {
      weapon: {
        damage: 5, damageType: 'bludgeoning', range: 1,
        attackSpeed: 0.9, durabilityLoss: 0.01, twoHanded: true,
        category: 'staff', attackType: 'melee'
      },
      magical: {
        magicType: 'nature',
        spellPowerBonus: 0.1,  // +10% spell power
        manaRegen: 0.05        // +5% mana regen
      }
    }
  }),
  defineItem('arcane_staff', 'Arcane Staff', 'equipment', {
    weight: 2.5,
    traits: {
      weapon: {
        damage: 8, damageType: 'magic', range: 1,
        attackSpeed: 0.8, durabilityLoss: 0.008, twoHanded: true,
        category: 'staff', attackType: 'melee'
      },
      magical: {
        magicType: 'arcane',
        spellPowerBonus: 0.25,
        manaRegen: 0.1
      }
    }
  }),

  // Wands
  defineItem('wand_basic', 'Wand', 'equipment', {
    weight: 0.3,
    traits: {
      weapon: {
        damage: 10, damageType: 'magic', range: 15,
        attackSpeed: 1.5, durabilityLoss: 0.003,
        category: 'wand', attackType: 'magic',
        projectile: { speed: 20, arc: false, penetration: 1 }
      },
      magical: {
        magicType: 'arcane',
        spellPowerBonus: 0.15
      }
    }
  }),
  defineItem('wand_fire', 'Wand of Fire', 'equipment', {
    weight: 0.3,
    traits: {
      weapon: {
        damage: 15, damageType: 'fire', range: 12,
        attackSpeed: 1.2, durabilityLoss: 0.005,
        category: 'wand', attackType: 'magic',
        projectile: { speed: 15, arc: false, penetration: 1 },
        special: ['burning']
      },
      magical: {
        magicType: 'fire',
        spellPowerBonus: 0.20
      }
    }
  }),

  // Orbs
  defineItem('crystal_orb', 'Crystal Orb', 'equipment', {
    weight: 1.0,
    traits: {
      weapon: {
        damage: 3, damageType: 'magic', range: 1,
        attackSpeed: 0.5, durabilityLoss: 0.001,
        category: 'orb', attackType: 'melee'
      },
      magical: {
        magicType: 'divination',
        spellPowerBonus: 0.30,
        manaRegen: 0.15
      }
    }
  }),

  // Grimoires
  defineItem('grimoire_necromancy', 'Grimoire of the Dead', 'equipment', {
    weight: 3.0,
    traits: {
      weapon: {
        damage: 1, damageType: 'necrotic', range: 1,
        attackSpeed: 0.3, durabilityLoss: 0.0001,
        category: 'grimoire', attackType: 'melee'
      },
      magical: {
        magicType: 'necromancy',
        spellPowerBonus: 0.40,
        grantsSpells: ['raise_dead', 'soul_drain', 'death_bolt']
      }
    }
  }),
];
```

---

## Research/Unlock Tree

Weapons are gated by research:

```
PRIMITIVE (start)
├── Hunting (stone spear, club)
│
MEDIEVAL (first research)
├── Metalworking → Iron weapons
├── Advanced Metalworking → Steel weapons
├── Archery → Bows, crossbows
│
RENAISSANCE
├── Gunpowder → Muskets, flintlock pistols
│
INDUSTRIAL
├── Machining → Revolvers, rifles
├── Advanced Firearms → Automatic weapons
│
MODERN
├── Electronics → Basic energy weapons (tasers)
│
CLARKETECH
├── Laser Technology → Laser weapons
├── Plasma Containment → Plasma weapons
├── Particle Physics → Particle weapons
├── Exotic Materials → Energy blades, force weapons
│
TRANSCENDENT (late game)
├── Soul Binding → Soul weapons
├── Reality Manipulation → Void weapons
├── Divine Intervention → Radiant weapons
```

---

## Combat System Updates

### Range Checks

```typescript
function canAttackTarget(
  attacker: Entity,
  target: Entity,
  weapon: WeaponTrait
): boolean {
  const distance = getDistance(attacker, target);

  // Check minimum range (can't snipe at point blank)
  if (weapon.minRange && distance < weapon.minRange) {
    return false;
  }

  // Check maximum range
  if (distance > weapon.range) {
    return false;
  }

  // Ranged weapons need line of sight
  if (weapon.attackType === 'ranged') {
    return hasLineOfSight(attacker, target);
  }

  return true;
}
```

### Ammo Consumption

```typescript
function consumeAmmo(
  attacker: Entity,
  weapon: WeaponTrait
): boolean {
  if (!weapon.ammo) return true;  // Melee doesn't need ammo

  const inventory = attacker.getComponent('inventory');
  const ammoCount = inventory.countItem(weapon.ammo.ammoType);

  if (ammoCount < weapon.ammo.ammoPerShot) {
    return false;  // Out of ammo!
  }

  inventory.removeItem(weapon.ammo.ammoType, weapon.ammo.ammoPerShot);
  return true;
}
```

### AoE Damage

```typescript
function applyAoeDamage(
  impact: Position,
  weapon: WeaponTrait,
  baseDamage: number
): void {
  if (!weapon.aoeRadius || weapon.aoeRadius <= 0) return;

  const targets = world.query()
    .with('health')
    .withinRadius(impact, weapon.aoeRadius)
    .executeEntities();

  for (const target of targets) {
    const distance = getDistance(impact, target);
    const falloff = 1 - (distance / weapon.aoeRadius);
    const aoeDamage = Math.floor(baseDamage * falloff * 0.5);

    applyDamage(target, aoeDamage, weapon.damageType);
  }
}
```

---

## Implementation Files

### New Files
- `packages/core/src/items/weapons/melee.ts` - Melee weapon definitions
- `packages/core/src/items/weapons/ranged.ts` - Traditional ranged weapons
- `packages/core/src/items/weapons/firearms.ts` - Gun definitions
- `packages/core/src/items/weapons/energy.ts` - Energy weapon definitions
- `packages/core/src/items/weapons/exotic.ts` - Exotic/fantasy weapons
- `packages/core/src/items/weapons/magic.ts` - Magic focus weapons
- `packages/core/src/items/ammo/index.ts` - Ammo definitions
- `packages/core/src/combat/RangedCombatSystem.ts` - Ranged attack handling

### Updates Required
- `packages/core/src/items/traits/WeaponTrait.ts` - Extend with new fields
- `packages/core/src/types/CombatTypes.ts` - Add new damage types
- `packages/core/src/systems/AgentCombatSystem.ts` - Handle ranged combat
- `packages/core/src/items/defaultItems.ts` - Register new weapons

---

## Success Criteria

- [ ] WeaponTrait extended with category, attackType, ammo, projectile fields
- [ ] New damage types added (laser, plasma, particle, ion, force, psionic, void, radiant, necrotic)
- [ ] Ammo system implemented (arrows, bullets, energy cells, plasma fuel)
- [ ] At least 10 melee weapons across primitive/medieval/exotic tiers
- [ ] At least 5 traditional ranged weapons (bows, crossbows, throwing)
- [ ] At least 8 firearms (pistols, rifles, shotguns)
- [ ] At least 6 energy weapons (lasers, plasma, particle)
- [ ] At least 5 exotic weapons (energy blades, force weapons, psionic)
- [ ] At least 4 magic focus weapons (staves, wands, orbs, grimoires)
- [ ] Combat system handles ranged attacks with range checks
- [ ] Combat system handles AoE weapons
- [ ] Research tree gates advanced weapons appropriately

---

## Related Specs

- `equipment-system/spec.md` - Body-based equipment system
- `conflict-system/spec.md` - Combat mechanics
- `research-system/spec.md` - Technology unlocks
- `clarketech/` - Advanced technology integration
