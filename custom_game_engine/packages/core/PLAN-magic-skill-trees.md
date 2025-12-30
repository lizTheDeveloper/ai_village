# Magic Skill Tree System - Implementation Plan

## Overview

Design a paradigm-specific skill tree system that integrates with the existing SkillsComponent and MagicComponent. Each magic paradigm has its own unique progression path with custom unlock conditions.

## Interface Design

### Core Types (src/magic/MagicSkillTree.ts)

```typescript
// ============================================================================
// Unlock Condition Types
// ============================================================================

/** What can unlock a magic skill node */
export type UnlockConditionType =
  // Inherent conditions
  | 'bloodline'        // Must have specific lineage (Allomancy)
  | 'snapping'         // Must experience trauma event (Allomancy)
  | 'daemon_settled'   // Daemon must have settled (Daemon paradigm)
  | 'witch_birth'      // Born into witch clan

  // Discovery conditions
  | 'kami_met'         // Must have encountered a specific kami
  | 'kami_favor'       // Must have favor with a kami type
  | 'metal_consumed'   // Must have consumed and survived the metal
  | 'rune_discovered'  // Must have discovered the rune (from artifact, teaching, vision)
  | 'song_learned'     // Must have heard/learned the song
  | 'name_learned'     // Must know the true name
  | 'dream_visited'    // Must have visited a dream location

  // Attention/Divinity conditions
  | 'attention_given'  // Spirit/presence must have received attention
  | 'presence_level'   // Must have reached presence level (for divine magic)
  | 'deity_favor'      // Must have deity favor level
  | 'pact_signed'      // Must have signed pact with entity

  // Skill conditions
  | 'skill_level'      // Must have skill at level X
  | 'magic_proficiency' // Must have technique/form proficiency
  | 'node_unlocked'    // Must have unlocked prerequisite node
  | 'xp_accumulated'   // Must have spent XP in this tree

  // Event conditions
  | 'ritual_performed' // Must have performed a specific ritual
  | 'trauma_experienced' // Must have experienced trauma (awakening)
  | 'teacher_found'    // Must have found a teacher
  | 'artifact_bonded'  // Must have bonded with magical artifact
  | 'location_visited' // Must have visited sacred location

  // State conditions
  | 'purity_level'     // Must maintain purity level (Shinto)
  | 'corruption_level' // Must have corruption level (Blood magic)
  | 'time_of_day'      // Only available at certain times (Dream)
  | 'moon_phase'       // Only available during certain moon phases;

/** A single unlock condition */
export interface UnlockCondition {
  type: UnlockConditionType;

  /** Parameters for this condition */
  params: {
    // For bloodline
    bloodlineId?: string;
    bloodlineStrength?: number; // 0-1, mistings vs mistborn

    // For kami/spirit
    kamiId?: string;
    kamiType?: string;
    favorLevel?: number;

    // For discovery
    runeId?: string;
    songId?: string;
    metalId?: string;
    nameId?: string;
    dreamLocationId?: string;

    // For divinity
    presenceId?: string;
    attentionThreshold?: number;
    deityId?: string;

    // For skills
    skillId?: string;
    skillLevel?: number;
    techniqueId?: string;
    formId?: string;
    proficiencyLevel?: number;
    nodeId?: string;
    xpRequired?: number;

    // For events
    ritualId?: string;
    traumaType?: string;
    teacherParadigm?: string;
    artifactId?: string;
    locationId?: string;

    // For state
    purityMin?: number;
    corruptionMin?: number;
    corruptionMax?: number;
    timeRange?: { start: number; end: number };
    moonPhases?: string[];
  };

  /** Human-readable description */
  description: string;

  /** Is this condition hidden until met? (discovery mechanic) */
  hidden?: boolean;

  /** Can this be bypassed? (e.g., with enough XP or divine intervention) */
  bypassable?: boolean;
}

// ============================================================================
// Skill Node Types
// ============================================================================

/** Category of magic skill */
export type MagicSkillCategory =
  | 'foundation'       // Basic understanding/attunement
  | 'technique'        // How to do magic (verbs)
  | 'form'             // What to affect (nouns)
  | 'specialization'   // Paradigm-specific abilities
  | 'mastery'          // Advanced techniques
  | 'discovery'        // Discovered/unlocked elements (runes, songs, kami)
  | 'relationship'     // Relationships with entities (kami favor, daemon bond)
  | 'resource'         // Expand resource pools
  | 'efficiency'       // Reduce costs, improve regeneration
  | 'ritual'           // Learned rituals
  | 'hybrid';          // Cross-paradigm abilities

/** A single node in the skill tree */
export interface MagicSkillNode {
  id: string;
  name: string;
  description: string;
  lore?: string;

  /** Which paradigm this belongs to */
  paradigmId: string;

  /** Category of skill */
  category: MagicSkillCategory;

  /** All conditions that must be met to unlock */
  unlockConditions: UnlockCondition[];

  /** Are all conditions required, or just one? */
  conditionMode: 'all' | 'any';

  /** XP cost to purchase (after unlocking) */
  xpCost: number;

  /** Can be leveled up? (1 = single purchase, 5 = can level 5 times) */
  maxLevel: number;

  /** XP cost multiplier per level (e.g., 1.5 = 50% more each level) */
  levelCostMultiplier?: number;

  /** Effects when this node is unlocked/leveled */
  effects: MagicSkillEffect[];

  /** Visual position in tree (for UI) */
  position?: { x: number; y: number; tier: number };

  /** Icon/glyph for display */
  icon?: string;
}

/** Effect granted by a skill node */
export interface MagicSkillEffect {
  type: MagicSkillEffectType;

  /** Base value at level 1 */
  baseValue: number;

  /** Additional value per level */
  perLevelValue?: number;

  /** Parameters */
  params?: {
    techniqueId?: string;
    formId?: string;
    spellId?: string;
    resourceType?: string;
    kamiType?: string;
    metalId?: string;
    runeId?: string;
    ritualId?: string;
  };
}

export type MagicSkillEffectType =
  // Proficiency bonuses
  | 'technique_proficiency'    // +X to technique
  | 'form_proficiency'         // +X to form
  | 'spell_proficiency'        // +X to specific spell

  // Resource bonuses
  | 'resource_max'             // +X to max resource
  | 'resource_regen'           // +X to regen rate
  | 'cost_reduction'           // -X% to costs

  // Unlock abilities
  | 'unlock_technique'         // Can now use technique
  | 'unlock_form'              // Can now affect form
  | 'unlock_spell'             // Learn specific spell
  | 'unlock_ritual'            // Learn ritual

  // Discovery unlocks
  | 'unlock_metal'             // Can burn this metal (Allomancy)
  | 'unlock_rune'              // Know this rune
  | 'unlock_song'              // Know this song
  | 'unlock_kami_type'         // Can interact with this kami type

  // Relationship bonuses
  | 'kami_favor_bonus'         // +X to kami favor gains
  | 'daemon_range'             // +X to daemon separation range
  | 'pact_leverage'            // Better pact terms

  // Paradigm-specific
  | 'alar_strength'            // Sympathy: mental focus strength
  | 'alar_split'               // Sympathy: can split focus X ways
  | 'burn_rate_control'        // Allomancy: control burn rate
  | 'flare_control'            // Allomancy: can flare safely
  | 'lucidity'                 // Dream: lucid dreaming control
  | 'purity_maintenance'       // Shinto: slower purity decay
  | 'rune_precision'           // Rune: carving quality bonus
  | 'harmony_bonus'            // Song: harmony power bonus
  | 'dust_sensitivity';        // Daemon: Dust reading ability

// ============================================================================
// Skill Tree Definition
// ============================================================================

/** Complete skill tree for a paradigm */
export interface MagicSkillTree {
  id: string;
  paradigmId: string;
  name: string;
  description: string;

  /** All nodes in this tree */
  nodes: MagicSkillNode[];

  /** Starting nodes (no prerequisites) */
  entryNodes: string[];

  /** Connections for visual display */
  connections: Array<{ from: string; to: string }>;

  /** XP sources for this tree */
  xpSources: MagicXPSource[];

  /** Special rules for this tree */
  rules?: MagicTreeRules;
}

/** How XP is earned in this tree */
export interface MagicXPSource {
  eventType: string;
  xpAmount: number;
  description: string;
  conditions?: UnlockCondition[];
}

/** Special rules for progression */
export interface MagicTreeRules {
  /** Can XP be refunded? */
  allowRespec: boolean;

  /** Is progression permanent or can be lost? */
  permanentProgress: boolean;

  /** Can this tree be learned from scratch or requires innate ability? */
  requiresInnateAbility: boolean;

  /** Maximum total nodes that can be unlocked */
  maxNodes?: number;

  /** Custom validation function name */
  customValidator?: string;
}

// ============================================================================
// Agent Progress Tracking
// ============================================================================

/** Tracks an agent's progress in a magic skill tree */
export interface MagicSkillProgress {
  paradigmId: string;
  treeId: string;

  /** Nodes unlocked and their levels */
  unlockedNodes: Record<string, number>;

  /** Total XP earned in this tree */
  totalXpEarned: number;

  /** XP available to spend */
  availableXp: number;

  /** Discovery state (what has been discovered) */
  discoveries: {
    kami?: string[];        // Kami IDs met
    metals?: string[];      // Metals discovered
    runes?: string[];       // Runes discovered
    songs?: string[];       // Songs learned
    names?: string[];       // True names learned
    dreams?: string[];      // Dream locations visited
    rituals?: string[];     // Rituals learned
  };

  /** Relationship levels */
  relationships: Record<string, number>;  // entityId -> favor level

  /** Achievement timestamps */
  milestones: Record<string, number>;  // milestoneId -> tick achieved

  /** Custom paradigm state */
  custom?: Record<string, unknown>;
}
```

### Extending SkillsComponent

Add to `SkillsComponent.ts`:

```typescript
/** Magic skill progression (extends regular skills) */
export interface SkillsComponent extends Component {
  // ... existing fields ...

  /** Magic skill tree progress by paradigm */
  magicProgress?: Record<string, MagicSkillProgress>;
}
```

### Integration with Divinity (Attention System)

The unlock conditions include `attention_given` and `presence_level` which integrate with the existing `PresenceSpectrum.ts`:

```typescript
// In MagicSkillTreeEvaluator.ts

function checkAttentionCondition(
  condition: UnlockCondition,
  world: World,
  agentId: string
): boolean {
  const presenceId = condition.params.presenceId;
  const presence = world.getPresenceById(presenceId);

  if (!presence) return false;

  // Check if agent has contributed attention
  const relationship = presence.relationships.find(r => r.entityId === agentId);
  if (!relationship) return false;

  return relationship.attentionContributed >= (condition.params.attentionThreshold ?? 0);
}
```

## Example Skill Trees

### Shinto Paradigm Tree (Relationship-Based)

Key features:
- Nodes for each kami type (nature, place, ancestor, etc.)
- Purity maintenance nodes
- Ritual knowledge nodes
- Festival mastery
- Discovery: Meeting new kami unlocks interaction nodes

Entry nodes:
- "Basic Purity" - Learn to maintain ritual cleanliness
- "Spirit Sense" - Can detect nearby kami

### Allomancy Tree (Discovery-Based)

Key features:
- Bloodline check as tree prerequisite
- Snapping event unlocks tree
- Each metal is a discovery node
- Burn rate control progression
- Flaring mastery
- Mistborn vs Misting paths (bloodline strength determines available metals)

Entry nodes:
- "Snapped" - Requires trauma event, unlocks tree
- First metal discovered (based on circumstance)

### Sympathy Tree (Skill-Based)

Key features:
- Alar strength progression
- Link type nodes
- Split focus mastery
- Slippage reduction
- Study-based progression (traditional skill tree)

Entry nodes:
- "Basic Alar" - Can hold simple mental focus
- "First Binding" - Can create simple sympathetic link

### Dream Paradigm Tree (Discovery + Time-Based)

Key features:
- Lucidity progression
- Dream location discoveries
- Nightmare resistance
- Shared dreaming
- Time-locked abilities (night only)

Entry nodes:
- "Lucid Glimpse" - First lucid dream
- "Remember Dreams" - Can recall dream content

### Song Paradigm Tree (Discovery-Based)

Key features:
- Individual songs as discovery nodes
- Harmony/discord control
- Instrument proficiencies
- Choir coordination
- Song composition mastery

Entry nodes:
- "Perfect Pitch" - Basic musical ability
- "First Melody" - Learn first magical song

### Rune Paradigm Tree (Discovery + Skill)

Key features:
- Individual runes as discovery nodes
- Carving precision progression
- Bindrune combinations
- Material affinity
- Teaching/learning from artifacts

Entry nodes:
- "Rune Sight" - Can recognize magical runes
- "First Carving" - Can carve basic rune

### Daemon Paradigm Tree (Relationship-Based)

Key features:
- Daemon bond strength
- Separation range progression
- Dust sensitivity
- Alethiometer reading (very advanced)
- Form flexibility (pre-settling)

Entry nodes:
- "Daemon Bond" - Basic communication with daemon
- "Dust Awareness" - Can sense Dust particles

## Files to Create

1. **`src/magic/MagicSkillTree.ts`** - Core types and interfaces (above)
2. **`src/magic/MagicSkillTreeEvaluator.ts`** - Logic for checking conditions
3. **`src/magic/MagicSkillTreeRegistry.ts`** - Registry of all skill trees
4. **`src/magic/skillTrees/ShintoSkillTree.ts`** - Shinto-specific tree
5. **`src/magic/skillTrees/AllomancySkillTree.ts`** - Allomancy-specific tree
6. **`src/magic/skillTrees/SympathySkillTree.ts`** - Sympathy-specific tree
7. **`src/magic/skillTrees/DreamSkillTree.ts`** - Dream-specific tree
8. **`src/magic/skillTrees/SongSkillTree.ts`** - Song-specific tree
9. **`src/magic/skillTrees/RuneSkillTree.ts`** - Rune-specific tree
10. **`src/magic/skillTrees/DaemonSkillTree.ts`** - Daemon-specific tree
11. **`src/systems/MagicProgressionSystem.ts`** - Handles XP, unlocks, events
12. **`src/magic/__tests__/MagicSkillTree.test.ts`** - Tests

## Implementation Order

### Phase 1: Interface (This PR)
1. Create `MagicSkillTree.ts` with all core types
2. Create `MagicSkillTreeEvaluator.ts` with condition checking logic
3. Create `MagicSkillTreeRegistry.ts`
4. Add `magicProgress` field to SkillsComponent
5. Write tests for evaluator

### Phase 2: Weird Trees (Manual Implementation)
Focus on paradigms with unique mechanics:
1. **Allomancy** - Bloodline + snapping + metal discovery
2. **Daemon** - External soul + separation + Dust
3. **Shinto** - Kami relationships + purity
4. **Sympathy** - Alar mechanics + link types

### Phase 3: Simpler Trees (Can Be Generated)
These follow more standard skill tree patterns:
1. **Song** - Standard discovery + skill progression
2. **Rune** - Standard discovery + crafting skill
3. **Dream** - Standard skill + time gating
4. **Academic** - Pure skill-based (already exists in standard skill system)
5. **Divine** - Standard attention-based (use existing divinity system)

### Phase 4: System Integration
1. Create `MagicProgressionSystem`
2. Hook into existing event system for XP
3. Integrate with PresenceSpectrum for attention conditions
4. Add UI data exports for renderer

## Notes

- The "weird" paradigms (Allomancy, Daemon, Shinto, Sympathy) need careful manual implementation because they have unique mechanics that don't fit standard skill tree patterns
- The simpler paradigms can potentially be auto-generated from the MagicParadigm definition
- Discovery mechanics should tie into the exploration and memory systems
- Attention-based unlocks integrate with the existing PresenceSpectrum divinity system
