# Magic Skill Trees

Paradigm-specific progression systems for 25+ magic paradigms. Each tree defines unlockable abilities, discovery paths, and mastery progression unique to its magic system.

## Core Structure

### Skill Node
```typescript
MagicSkillNode = {
  id: string;              // Unique identifier
  name: string;            // Display name
  category: MagicSkillCategory;  // foundation, technique, form, discovery, etc.
  tier: number;            // Visual depth (0 = entry)
  xpCost: number;          // Purchase cost
  maxLevel: number;        // 1 = single purchase, 5+ = leveling
  effects: MagicSkillEffect[];   // Granted bonuses/abilities
  unlockConditions: UnlockCondition[];  // Requirements to unlock
  prerequisites: string[]; // Required node IDs
}
```

### Node Categories
- **foundation**: Basic attunement (Name Sense, Basic Prayer)
- **discovery**: Unlocked elements (metals, runes, kami, names)
- **technique**: How to cast (Speaking Power, Flaring)
- **specialization**: Paradigm-specific paths (Coinshot, Life Domain)
- **mastery**: Advanced/capstone (Name of Names, Avatar Manifestation)
- **efficiency**: Cost reduction, regen bonuses
- **relationship**: Entity bonds (kami favor, daemon bond)

### Unlock Conditions
60+ condition types including:
- **Inherent**: bloodline, daemon_settled, innate_talent
- **Discovery**: metal_consumed, rune_discovered, name_learned, kami_met
- **Relationship**: attention_given, deity_favor, pact_signed
- **Skill**: xp_accumulated, magic_proficiency, nodes_unlocked
- **Event**: ritual_performed, trauma_experienced, teacher_found
- **State**: purity_level, time_of_day, moon_phase, emotion_state

### Skill Effects
40+ effect types:
- **Proficiency**: technique_proficiency, form_proficiency, paradigm_proficiency
- **Resources**: resource_max, resource_regen, cost_reduction
- **Unlocks**: unlock_technique, unlock_metal, unlock_kami_type, unlock_name_category
- **Paradigm-specific**: burn_rate_control, alar_strength, dust_sensitivity, purity_maintenance

## Paradigm Trees

25+ paradigms, each with unique progression:

**Allomancy**: Bloodline gating, metal discovery, Misting vs Mistborn paths
**Divine**: Deity worship, domain specialization, clerical ranks, miracles
**Name**: True speech learning, name category discovery, speaking power mastery
**Shinto**: Kami relationships, purity maintenance, ritual knowledge
**Rune**: Rune discovery, material affinity, bindrune complexity
**Song**: Harmony mastery, voice techniques, choir coordination
**Daemon**: Form flexibility, dust sensitivity, separation abilities
**Sympathy**: Alar training, link strength, slippage reduction
**Dream**: Lucidity, realm access, nightmare resistance
**Blood**: Sacrifice efficiency, corruption balance, vitae control

See individual files (`AllomancySkillTree.ts`, `DivineSkillTree.ts`, etc.) for complete trees.

## XP Sources

Each tree defines paradigm-specific XP gains:
```typescript
MagicXPSource = {
  eventType: string;       // 'metal_burned', 'prayer_offered', 'name_learned'
  xpAmount: number;        // Base XP
  description: string;     // UI text
  conditions?: UnlockCondition[];  // Optional gates
  qualityMultiplier?: boolean;     // Scale with action quality
}
```

## Tree Rules

```typescript
MagicTreeRules = {
  allowRespec: boolean;            // Can refund XP?
  permanentProgress: boolean;      // Can lose progress?
  requiresInnateAbility: boolean;  // Bloodline/birth requirement?
  innateCondition?: UnlockCondition;  // If required, what condition?
  maxNodes?: number;               // Optional node cap
  exclusiveWith?: string[];        // Conflicting paradigms
}
```

## Agent Progress

Stored in `SkillsComponent.magicProgress[paradigmId]`:
```typescript
MagicSkillProgress = {
  paradigmId: string;
  unlockedNodes: Record<nodeId, level>;
  totalXpEarned: number;
  availableXp: number;
  discoveries: { metals?, runes?, names?, kami?, ... };
  relationships: Record<entityId, favorLevel>;
  milestones: Record<eventId, timestamp>;
}
```

## Implementation

All trees follow pattern:
1. Define constants (categories, tiers, effects)
2. Create foundation nodes (entry points)
3. Create discovery/specialization nodes
4. Create technique/mastery nodes
5. Define XP sources
6. Assemble tree with rules

Helper functions in `MagicSkillTree.ts`: `createSkillNode()`, `createSkillEffect()`, `createUnlockCondition()`, `createDefaultTreeRules()`
