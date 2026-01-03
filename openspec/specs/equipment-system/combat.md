> **System:** equipment-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Equipment & Combat System Specification

**Phase:** 36 (Equipment System) + Combat Integration
**Status:** In Development
**Last Updated:** 2026-01-01

## Overview

The Equipment System integrates with the Combat System to provide:
1. **Equipment bonuses** - weapons and armor affect combat outcomes
2. **Magical skill modifiers** - enchanted items boost combat abilities
3. **Hero protection** - narrative magic protects those with destiny

## Current Implementation

### Combat Power Formula

```typescript
// Base combat power (skill is primary factor)
attackerPower = combatSkill × 3

// Equipment bonuses (secondary factor)
attackerPower += (weaponDamage × 0.4) + (armorDefense × 0.4)
```

**Balance:**
- Combat skill scaled ×3 (primary factor)
- Equipment scaled ×0.4 (secondary factor)
- Result: Skilled unarmored fighters can beat armored novices

**Example:**
- Skilled fighter (skill 10, no armor): 34 power
- Armored novice (skill 2, full steel): 24.8 power
- **Skilled fighter wins!** ✓

---

## Feature 1: Magical Skill Modifiers

**Status:** NOT YET IMPLEMENTED

### Problem

Currently, magical items that boost combat skill don't exist. A novice with a "Ring of Combat Mastery" (+5 skill) fights with the same skill as without it.

### Design

#### 1. Add Skill Modifier Trait

Create `StatBonusTrait` for items that boost skills:

```typescript
/**
 * Trait for items that provide stat/skill bonuses
 * Examples: Ring of Combat Mastery, Gloves of Dexterity, Scholar's Spectacles
 */
export interface StatBonusTrait {
  /** Skill modifiers provided by this item */
  skillModifiers?: {
    combat?: number;          // Combat skill bonus
    crafting?: number;        // Crafting skill bonus
    farming?: number;         // Farming skill bonus
    cooking?: number;         // Cooking skill bonus
    building?: number;        // Building skill bonus
    magic?: number;           // Magic skill bonus
    social?: number;          // Social skill bonus
    // ... other skills
  };

  /** Stat modifiers (optional future expansion) */
  statModifiers?: {
    maxHealth?: number;       // Max HP bonus
    moveSpeed?: number;       // Movement speed modifier
    carryWeight?: number;     // Carry capacity bonus
  };

  /** Duration of bonuses */
  duration?: 'permanent' | 'timed' | 'charged';

  /** Charges if duration is 'charged' */
  charges?: number;
}
```

#### 2. Track Bonuses in EquipmentComponent

Extend `EquipmentComponent.cached` to include skill modifiers:

```typescript
export interface EquipmentComponent extends Component {
  // ... existing fields ...

  cached?: {
    totalDefense: number;
    resistances: Record<string, number>;
    movementPenalty: number;

    /** NEW: Skill modifiers from all equipped items */
    skillModifiers: Record<string, number>;  // skillName -> total bonus

    /** NEW: Stat modifiers from all equipped items */
    statModifiers?: Record<string, number>;  // statName -> total bonus

    lastUpdateTick: number;
  };
}
```

#### 3. Calculate Total Bonuses (EquipmentSystem)

Add to `EquipmentSystem.update()`:

```typescript
private calculateSkillModifiers(equipment: EquipmentComponent): Record<string, number> {
  const modifiers: Record<string, number> = {};

  // Check all equipped items (armor, weapons, accessories)
  for (const item of getAllEquippedItems(equipment)) {
    const statBonus = item.traits?.statBonus;
    if (statBonus?.skillModifiers) {
      for (const [skill, bonus] of Object.entries(statBonus.skillModifiers)) {
        modifiers[skill] = (modifiers[skill] ?? 0) + bonus;
      }
    }
  }

  return modifiers;
}
```

#### 4. Apply Bonuses in Combat (AgentCombatSystem)

Modify combat power calculation:

```typescript
private calculateCombatPower(...) {
  // Get base combat skill
  let baseCombatSkill = attackerStats.combatSkill;

  // Add magical skill bonuses from equipment
  const attackerEquipment = world.getComponent(attacker.id, 'equipment') as EquipmentComponent;
  if (attackerEquipment?.cached?.skillModifiers?.combat) {
    baseCombatSkill += attackerEquipment.cached.skillModifiers.combat;
    modifiers.push({
      type: 'magical_skill_bonus',
      value: attackerEquipment.cached.skillModifiers.combat
    });
  }

  // Apply skill scaling (skill is primary factor)
  let attackerPower = baseCombatSkill * 3;

  // ... rest of combat power calculation
}
```

### Example Items

```typescript
// Ring of Combat Mastery - +5 combat skill
defineItem('ring_combat_mastery', 'Ring of Combat Mastery', 'accessory', {
  weight: 0.05,
  baseMaterial: 'gold',
  traits: {
    statBonus: {
      skillModifiers: { combat: 5 },
      duration: 'permanent',
    },
    magical: {
      effects: ['Grants the wearer supernatural combat awareness'],
      passive: true,
      school: 'enchantment',
    },
  },
})

// Gloves of Dexterity - +3 combat, +2 crafting
defineItem('gloves_dexterity', 'Gloves of Dexterity', 'equipment', {
  weight: 0.2,
  baseMaterial: 'leather',
  traits: {
    statBonus: {
      skillModifiers: {
        combat: 3,
        crafting: 2,
      },
      duration: 'permanent',
    },
    clothing: {
      slot: 'hands',
      warmth: 2,
    },
  },
})

// Cursed Helmet of the Berserker - +10 combat, -5 social
defineItem('cursed_berserker_helm', 'Cursed Helmet of the Berserker', 'equipment', {
  weight: 3.0,
  baseMaterial: 'iron',
  traits: {
    statBonus: {
      skillModifiers: {
        combat: 10,   // Huge combat boost
        social: -5,   // But you're terrifying to others
      },
      duration: 'permanent',
    },
    armor: {
      defense: 8,
      armorClass: 'heavy',
      target: { bodyPartType: 'head' },
    },
    magical: {
      effects: ['Fills wearer with battle rage'],
      passive: true,
      cursed: true,  // Can't remove easily
      school: 'enchantment',
    },
  },
})
```

### Balance Impact

With magical skill bonuses, combat power becomes:

```
effectiveCombatSkill = baseCombatSkill + magicalBonuses
attackerPower = effectiveCombatSkill × 3 + (equipment × 0.4)
```

**Example: Novice with Ring of Combat Mastery**
- Base skill: 2
- Ring bonus: +5
- Effective skill: 7
- Power: (7 × 3) + (10 × 0.4) = 21 + 4 = **25 power**

vs **Skilled unarmored fighter (skill 10):** 34 power
- Skilled fighter still wins, but it's closer!

---

## Feature 2: Hero Protection (Narrative Magic)

**Status:** NOT YET IMPLEMENTED

### Concept

Souls with **destiny** receive luck modifiers in combat. This is "narrative magic" - the universe protects heroes so they can fulfill their purpose.

**Not invincibility** - heroes can still die, but they:
- Have better luck in combat rolls
- Are less likely to be one-shot killed
- May survive critical failures that would kill others

### Soul System Integration

From `SoulIdentityComponent`:

```typescript
{
  /** Soul's potential destiny (may or may not be fulfilled) */
  destiny?: string;

  /** Cosmic alignment (-1 to 1) */
  cosmicAlignment: number;  // -1 = cursed, 0 = neutral, +1 = blessed

  /** Whether this soul has achieved its purpose */
  purposeFulfilled: boolean;

  /** Whether this soul's destiny has been realized */
  destinyRealized: boolean;
}
```

### Design

#### 1. Destiny Luck Modifier

Heroes with destiny get luck modifiers based on:
- **Has destiny?** - If `destiny` field is set
- **Destiny fulfilled?** - Protection fades after `destinyRealized = true`
- **Cosmic alignment** - Multiplies luck (blessed souls get more protection)

```typescript
/**
 * Calculate destiny luck modifier for combat
 * Returns a modifier to combat rolls (-0.2 to +0.2)
 */
function getDestinyLuckModifier(
  world: World,
  agentId: string
): number {
  // Get soul link
  const soulLink = world.getComponent(agentId, 'soul_link') as SoulLinkComponent;
  if (!soulLink?.soulEntityId) return 0;

  // Get soul identity
  const soulIdentity = world.getComponent(
    soulLink.soulEntityId,
    'soul_identity'
  ) as SoulIdentityComponent;

  if (!soulIdentity) return 0;

  // No protection if destiny is fulfilled
  if (soulIdentity.destinyRealized) return 0;

  // Base luck from having a destiny
  let luckModifier = 0;

  if (soulIdentity.destiny) {
    // Base destiny protection: +10% to combat rolls
    luckModifier = 0.10;

    // Multiply by cosmic alignment (-1 to +1)
    // Blessed souls (alignment +1.0): +10% luck
    // Neutral souls (alignment 0): +0% luck
    // Cursed souls (alignment -1.0): -10% luck (anti-luck!)
    luckModifier *= soulIdentity.cosmicAlignment;
  }

  // Explicit saturation at ±20% (game balance limit)
  if (luckModifier > 0.2) {
    console.warn(`[Combat] Luck modifier ${luckModifier} exceeds cap, saturating to 0.2`);
    return 0.2;
  }
  if (luckModifier < -0.2) {
    console.warn(`[Combat] Luck modifier ${luckModifier} below floor, saturating to -0.2`);
    return -0.2;
  }
  return luckModifier;
}
```

#### 2. Apply to Combat Rolls

Modify `AgentCombatSystem.rollOutcome()`:

```typescript
private rollOutcome(
  world: World,
  attacker: Entity,
  defender: Entity,
  attackerPower: number,
  defenderPower: number,
  lethal: boolean
): 'attacker_victory' | 'defender_victory' | 'draw' {
  // Base win chance formula (5% per point difference)
  const powerDiff = attackerPower - defenderPower;
  let attackerWinChance = 0.5 + (powerDiff * 0.05);

  // Apply destiny luck modifiers
  const attackerLuck = this.getDestinyLuckModifier(world, attacker.id);
  const defenderLuck = this.getDestinyLuckModifier(world, defender.id);

  attackerWinChance += attackerLuck - defenderLuck;

  // Track modifiers for debugging/narrative
  if (attackerLuck !== 0 || defenderLuck !== 0) {
    modifiers.push({
      type: 'destiny_luck',
      value: attackerLuck - defenderLuck,
      narrative: attackerLuck > 0 ? 'fate favors the destined' : 'cursed by fate'
    });
  }

  // Explicit bounds at 5%-95% (game design: never 100% certain outcomes)
  if (attackerWinChance > 0.95) {
    attackerWinChance = 0.95;  // Maximum 95% chance
  } else if (attackerWinChance < 0.05) {
    attackerWinChance = 0.05;  // Minimum 5% chance
  }

  const roll = Math.random();
  return roll < attackerWinChance ? 'attacker_victory' : 'defender_victory';
}
```

#### 3. Death Protection

Heroes with strong destiny also resist instant death:

```typescript
private applyInjuries(
  world: World,
  attacker: Entity,
  defender: Entity,
  outcome: string,
  attackerPower: number,
  defenderPower: number
) {
  // ... existing injury logic ...

  // Check for instant death scenario
  const loser = outcome === 'attacker_victory' ? defender : attacker;
  const powerDiff = Math.abs(attackerPower - defenderPower);

  // Normally: power difference >20 = instant death
  // But check for destiny protection
  if (powerDiff > 20) {
    const destinyLuck = this.getDestinyLuckModifier(world, loser.id);

    // Positive destiny luck provides death resistance
    // +0.1 luck = need 25 power diff for instant death
    // +0.2 luck = need 30 power diff for instant death
    const deathThreshold = 20 + (destinyLuck * 50);

    if (powerDiff < deathThreshold) {
      // Destiny saved them from instant death!
      // Apply severe injury instead
      this.applySevereInjury(world, loser);

      this.emitNarrative(world, loser,
        `Against all odds, ${loser.name} survives the fatal blow. Fate is not done with them yet.`
      );

      return; // Don't apply instant death
    }
  }

  // ... rest of injury application ...
}
```

### Examples

**Example 1: Blessed Hero vs Skilled Fighter**
- Hero (skill 5, cosmicAlignment +0.8, destiny "Unite the kingdoms"):
  - Base power: 19
  - Luck modifier: +0.08 (8% to rolls)
- Fighter (skill 10, no destiny):
  - Base power: 34
  - Luck modifier: 0
- Result: Fighter normally has ~82% win rate
- **With destiny luck:** Fighter has ~74% win rate
- Hero has better survival odds, but fighter is still heavily favored

**Example 2: Cursed Soul**
- Cursed (skill 8, cosmicAlignment -1.0, destiny "Bring ruin"):
  - Base power: 28
  - Luck modifier: -0.10 (10% penalty - anti-luck!)
- Normal fighter (skill 8):
  - Base power: 28
  - Luck modifier: 0
- Result: Equal power, but cursed soul has ~40% win rate
- **Cursed souls suffer for their dark destiny**

**Example 3: Destiny Fulfilled**
- Former hero (skill 10, destinyRealized = true):
  - Base power: 34
  - Luck modifier: 0 (no protection once destiny is fulfilled)
- Now fights as a normal person - narrative magic has moved on

### Integration with Events

Emit events when destiny affects combat:

```typescript
this.eventBus.emit('combat:destiny_intervention', {
  agentId: hero.id,
  destiny: soulIdentity.destiny,
  luckModifier: destinyLuck,
  survived: true,
  narrative: "The Fates are not done with them yet"
});
```

This allows:
- Journal entries about miraculous survival
- NPCs commenting on hero's luck
- Deities noticing their champions being protected
- Story generation around destiny

---

## Implementation Plan

### Phase 1: Magical Skill Bonuses
1. Create `StatBonusTrait` interface
2. Add `skillModifiers` to `EquipmentComponent.cached`
3. Implement calculation in `EquipmentSystem`
4. Apply bonuses in `AgentCombatSystem`
5. Create test magical items (Ring of Combat Mastery, etc.)
6. Write integration tests

### Phase 2: Hero Protection
1. Implement `getDestinyLuckModifier()` helper
2. Integrate with `AgentCombatSystem.rollOutcome()`
3. Add death protection in `applyInjuries()`
4. Emit destiny intervention events
5. Write tests for luck modifiers
6. Test cursed souls (negative luck)

### Phase 3: Balance Testing
1. Run combat simulations with magical items
2. Test hero vs skilled fighter scenarios
3. Verify destiny protection doesn't make heroes invincible
4. Test cursed souls suffer appropriately
5. Validate destiny protection fades after fulfillment

---

## Testing Requirements

### Magical Skill Bonuses Tests
```typescript
describe('Magical Skill Bonuses', () => {
  it('novice with +5 combat ring beats unarmored skill 5', () => {
    // Novice: skill 2 + ring 5 = 7 effective skill = 25 power
    // Unarmored: skill 5 = 19 power
    // Expect novice wins ~60% of time
  });

  it('cursed berserker helm (+10 combat, -5 social)', () => {
    // Verify combat skill is boosted
    // Verify social interactions are penalized
  });

  it('skill bonuses stack from multiple items', () => {
    // Ring +5, Gloves +3 = +8 total
  });
});
```

### Hero Protection Tests
```typescript
describe('Hero Protection', () => {
  it('blessed hero with destiny gets +8% luck', () => {
    // cosmicAlignment +0.8, has destiny
    // Should survive more often vs equal opponent
  });

  it('cursed soul with destiny gets -10% luck', () => {
    // cosmicAlignment -1.0, has dark destiny
    // Should die more often vs equal opponent
  });

  it('destiny protection fades after fulfillment', () => {
    // destinyRealized = true
    // No luck modifier
  });

  it('hero resists instant death', () => {
    // 25 power difference normally = instant death
    // Hero with +0.2 luck survives as severe injury
  });
});
```

---

## Notes

- **Skill bonuses don't break balance** - they just shift where "skill" comes from (innate vs magical)
- **Hero protection is subtle** - 8-10% luck doesn't make heroes invincible, just luckier
- **Cursed souls matter** - negative destiny creates anti-heroes who suffer more
- **Destiny completion is meaningful** - heroes become mortal again after fulfilling purpose
- **Narrative magic serves story** - not game-breaking power, but story-enhancing luck

---

## Related Systems

- **EquipmentSystem** - Calculates equipment bonuses
- **AgentCombatSystem** - Uses bonuses and luck in combat
- **SoulIdentityComponent** - Tracks destiny and cosmic alignment
- **ItemTraits** - Defines magical properties
- **MagicComponent** - May provide additional magical effects
- **EventBus** - Emits destiny intervention events for storytelling
