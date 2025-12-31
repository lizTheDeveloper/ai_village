# Magic Skill Tree System
## Paradigm-Specific Progression with Discovery and Relationships

> *Dedicated to:*
> - **Brandon Sanderson** - For magic systems with rules and costs
> - **Philip Pullman** - For daemons and external souls (*His Dark Materials*)
> - **Patrick Rothfuss** - For sympathy and the Alar (*The Name of the Wind*)
> - **Hayao Miyazaki** - For kami and spirits (*Princess Mononoke*, *Spirited Away*)
> - **Tarn Adams** and *Dwarf Fortress* - For emergent skill progression

---

## Overview

Design a **paradigm-specific skill tree system** that integrates with the existing `SkillsComponent` and `MagicComponent`. Each magic paradigm (Shinto, Allomancy, Sympathy, etc.) has its own unique progression path with custom unlock conditions.

### Core Philosophy

**Magic is not learned—it is discovered, unlocked, and earned.** Some magic comes from bloodline (Allomancy), some from trauma (Snapping), some from relationships (Kami favor), some from pure skill (Sympathy). The skill tree reflects this diversity with flexible unlock conditions that go beyond simple XP gates.

### Key Innovations

1. **Custom trees per paradigm** - Each magic system has unique progression paths
2. **Flexible unlock conditions** - Bloodline, trauma, discovery, attention/divinity, skill-based
3. **Extends SkillsComponent** - Adds `magicProgress` field to existing component
4. **Integrates with PresenceSpectrum** - Attention-based unlocks use existing divinity system
5. **Hidden discoveries** - Some nodes are hidden until prerequisites met
6. **Discovery-driven progression** - Meeting a kami, consuming a metal, learning a rune

---

## Part 1: Core Types

### Unlock Conditions

Magic abilities unlock through diverse conditions, not just XP:

```typescript
// packages/core/src/magic/MagicSkillTree.ts

export type UnlockConditionType =
  // Inherent: Born with it or fundamental transformation
  | 'bloodline'              // Must have specific bloodline (e.g., Allomancer)
  | 'snapping'               // Must experience trauma (Mistborn)
  | 'daemon_settled'         // Daemon settles at adulthood (His Dark Materials)
  | 'witch_birth'            // Born a witch (rare)

  // Discovery: Find something in the world
  | 'kami_met'               // Met a specific kami
  | 'metal_consumed'         // Consumed a specific metal (Allomancy)
  | 'rune_discovered'        // Discovered a rune
  | 'song_learned'           // Learned a song from someone
  | 'name_learned'           // Learned the true name of something

  // Attention/Divinity: Relationship with higher powers
  | 'attention_given'        // Received attention from deity
  | 'presence_level'         // Presence spectrum level
  | 'deity_favor'            // Favor with specific deity
  | 'pact_signed'            // Made a pact with entity

  // Skill: Traditional progression
  | 'skill_level'            // Skill level requirement
  | 'magic_proficiency'      // Magic-specific proficiency
  | 'node_unlocked'          // Other skill node unlocked
  | 'xp_accumulated'         // Total XP earned

  // Event: Specific actions or experiences
  | 'ritual_performed'       // Completed a ritual
  | 'trauma_experienced'     // Experienced specific trauma
  | 'teacher_found'          // Found a teacher
  | 'artifact_bonded'        // Bonded with magical artifact

  // State: Character state conditions
  | 'purity_level'           // Purity/corruption level
  | 'corruption_level'       // Corruption level
  | 'time_of_day'            // Can only unlock at night, etc.
  | 'moon_phase'             // Specific moon phase
  ;

export interface UnlockCondition {
  type: UnlockConditionType;
  params: Record<string, unknown>;  // Condition-specific parameters
  description: string;               // Human-readable requirement
  hidden?: boolean;                  // Hidden until prerequisite met (discovery mechanic)
  bypassable?: boolean;              // Can be bypassed with XP/divine intervention
}

// Example conditions:

// Allomancy: Must be born Allomancer
const allomancyBloodline: UnlockCondition = {
  type: 'bloodline',
  params: { bloodlineId: 'allomancer' },
  description: 'Must be born an Allomancer',
  hidden: false,
  bypassable: false  // Cannot bypass bloodline requirement
};

// Allomancy: Must experience Snapping trauma
const snappingTrauma: UnlockCondition = {
  type: 'snapping',
  params: { traumaType: 'near_death' },
  description: 'Must experience a near-death trauma to Snap',
  hidden: false,
  bypassable: false
};

// Allomancy: Discover tin metal
const tinDiscovery: UnlockCondition = {
  type: 'metal_consumed',
  params: { metalId: 'tin' },
  description: 'Consume tin to discover its properties',
  hidden: true,  // Hidden until you've Snapped
  bypassable: false
};

// Shinto: Meet a river kami
const riverKamiMet: UnlockCondition = {
  type: 'kami_met',
  params: { kamiType: 'river_kami' },
  description: 'Meet a river kami',
  hidden: true,  // Hidden until you meet one
  bypassable: false
};

// Shinto: Gain favor with kami
const kamiFavor: UnlockCondition = {
  type: 'deity_favor',
  params: { deityId: 'river_kami_01', minFavor: 50 },
  description: 'Earn 50+ favor with the river kami',
  hidden: false,
  bypassable: true  // Could bypass with offering/ritual
};

// Sympathy: Skill requirement
const alarStrength: UnlockCondition = {
  type: 'skill_level',
  params: { skill: 'sympathy', minLevel: 5 },
  description: 'Reach Sympathy skill level 5',
  hidden: false,
  bypassable: false
};
```

### Skill Nodes

Each node in a skill tree represents an ability, technique, or discovery:

```typescript
export type MagicSkillCategory =
  | 'foundation'      // Core abilities (entry points)
  | 'technique'       // Advanced techniques
  | 'form'            // Spell forms, shapes
  | 'discovery'       // Discovered abilities (metals, kami, runes)
  | 'relationship'    // Unlocked through relationships
  | 'mastery'         // High-level mastery abilities
  | 'forbidden'       // Dangerous or corrupting abilities
  ;

export interface MagicSkillNode {
  id: string;
  paradigmId: string;
  name: string;
  description: string;
  category: MagicSkillCategory;

  // Unlock requirements
  unlockConditions: UnlockCondition[];
  conditionMode: 'all' | 'any';      // Must meet all or just one?

  // Costs
  xpCost: number;                    // XP to unlock (after conditions met)
  maxLevel: number;                  // Can be leveled up multiple times

  // Effects of unlocking
  effects: MagicSkillEffect[];
}

export type MagicSkillEffect =
  | { type: 'unlock_spell'; spellId: string }
  | { type: 'improve_stat'; stat: string; amount: number }
  | { type: 'unlock_paradigm'; paradigmId: string }
  | { type: 'unlock_node'; nodeId: string }
  | { type: 'add_ability'; abilityId: string }
  | { type: 'modify_cost'; costType: string; multiplier: number }
  ;

// Example: Allomancy Tin Burning
const tinBurning: MagicSkillNode = {
  id: 'allomancy_tin',
  paradigmId: 'allomancy',
  name: 'Tin (Enhanced Senses)',
  description: 'Burn tin to enhance all five senses dramatically',
  category: 'discovery',
  unlockConditions: [
    {
      type: 'node_unlocked',
      params: { nodeId: 'allomancy_snapped' },
      description: 'Must have Snapped',
      hidden: false,
      bypassable: false
    },
    {
      type: 'metal_consumed',
      params: { metalId: 'tin' },
      description: 'Must consume tin metal',
      hidden: true,
      bypassable: false
    }
  ],
  conditionMode: 'all',
  xpCost: 0,  // Discovery is the unlock, no XP needed
  maxLevel: 5,  // Can improve burn efficiency
  effects: [
    { type: 'unlock_spell', spellId: 'burn_tin' },
    { type: 'improve_stat', stat: 'perception', amount: 2 }
  ]
};

// Example: Shinto River Blessing
const riverBlessing: MagicSkillNode = {
  id: 'shinto_river_blessing',
  paradigmId: 'shinto',
  name: 'River Kami Blessing',
  description: 'Call upon a river kami for purification and healing',
  category: 'relationship',
  unlockConditions: [
    {
      type: 'kami_met',
      params: { kamiType: 'river_kami' },
      description: 'Must have met a river kami',
      hidden: true,
      bypassable: false
    },
    {
      type: 'deity_favor',
      params: { kamiType: 'river_kami', minFavor: 30 },
      description: 'Must have 30+ favor with river kami',
      hidden: false,
      bypassable: false
    }
  ],
  conditionMode: 'all',
  xpCost: 10,  // Small XP cost after meeting conditions
  maxLevel: 1,
  effects: [
    { type: 'unlock_spell', spellId: 'river_blessing' }
  ]
};
```

### Progress Tracking

Extend `SkillsComponent` with magic progression data:

```typescript
// packages/core/src/components/SkillsComponent.ts

export interface SkillsComponent extends Component {
  type: 'skills';

  // Existing skill tracking
  skills: Map<string, SkillProgress>;

  // NEW: Magic progression per paradigm
  magicProgress?: Map<string, MagicSkillProgress>;
}

export interface MagicSkillProgress {
  paradigmId: string;

  // Unlocked nodes and their levels
  unlockedNodes: Map<string, number>;  // nodeId -> current level

  // XP tracking
  totalXpEarned: number;
  availableXp: number;                 // Unspent XP for this paradigm

  // Discovery tracking (what have we found?)
  discoveries: {
    kami?: string[];                   // Kami IDs met
    metals?: string[];                 // Metals consumed
    runes?: string[];                  // Runes discovered
    songs?: string[];                  // Songs learned
    names?: string[];                  // True names learned
    // Extensible for other discovery types
  };

  // Relationship tracking
  relationships: Map<string, number>;  // entityId -> favor/relationship

  // State tracking
  purityLevel?: number;                // 0-100
  corruptionLevel?: number;            // 0-100
  traumaHistory?: TraumaEvent[];       // Past traumas (for Snapping, etc.)
}

export interface TraumaEvent {
  type: string;       // 'near_death', 'loss', 'betrayal', etc.
  timestamp: number;  // Game tick
  severity: number;   // 0-100
  description: string;
}
```

---

## Part 2: Skill Tree Evaluator

### Condition Checking Logic

Determine if an agent meets unlock conditions:

```typescript
// packages/core/src/magic/MagicSkillTreeEvaluator.ts

export class MagicSkillTreeEvaluator {
  canUnlockNode(
    node: MagicSkillNode,
    agent: Entity,
    world: World
  ): { canUnlock: boolean; reason?: string } {
    const progress = this.getMagicProgress(agent, node.paradigmId);
    if (!progress) {
      return { canUnlock: false, reason: 'No progress in this paradigm' };
    }

    // Check all/any conditions
    const checkResults = node.unlockConditions.map(condition =>
      this.checkCondition(condition, agent, progress, world)
    );

    const allMet = checkResults.every(r => r.met);
    const anyMet = checkResults.some(r => r.met);

    const met = node.conditionMode === 'all' ? allMet : anyMet;

    if (!met) {
      const failedConditions = checkResults
        .filter(r => !r.met)
        .map(r => r.reason)
        .join(', ');
      return { canUnlock: false, reason: failedConditions };
    }

    // Check XP cost
    if (progress.availableXp < node.xpCost) {
      return {
        canUnlock: false,
        reason: `Need ${node.xpCost} XP (have ${progress.availableXp})`
      };
    }

    return { canUnlock: true };
  }

  private checkCondition(
    condition: UnlockCondition,
    agent: Entity,
    progress: MagicSkillProgress,
    world: World
  ): { met: boolean; reason?: string } {
    switch (condition.type) {
      case 'bloodline': {
        const bloodlineId = condition.params.bloodlineId as string;
        const bloodline = agent.getComponent<BloodlineComponent>('bloodline');
        if (bloodline?.lineageId === bloodlineId) {
          return { met: true };
        }
        return { met: false, reason: `Requires ${bloodlineId} bloodline` };
      }

      case 'snapping': {
        const requiredType = condition.params.traumaType as string;
        const traumas = progress.traumaHistory || [];
        const hasTrauma = traumas.some(t => t.type === requiredType && t.severity >= 70);
        if (hasTrauma) {
          return { met: true };
        }
        return { met: false, reason: `Requires ${requiredType} trauma` };
      }

      case 'metal_consumed': {
        const metalId = condition.params.metalId as string;
        const discovered = progress.discoveries.metals || [];
        if (discovered.includes(metalId)) {
          return { met: true };
        }
        return { met: false, reason: `Must consume ${metalId}` };
      }

      case 'kami_met': {
        const kamiType = condition.params.kamiType as string;
        const met = progress.discoveries.kami || [];
        if (met.some(k => k.includes(kamiType))) {
          return { met: true };
        }
        return { met: false, reason: `Must meet a ${kamiType}` };
      }

      case 'deity_favor': {
        const deityId = condition.params.deityId as string | undefined;
        const kamiType = condition.params.kamiType as string | undefined;
        const minFavor = condition.params.minFavor as number;

        if (deityId) {
          const favor = progress.relationships.get(deityId) || 0;
          if (favor >= minFavor) {
            return { met: true };
          }
          return { met: false, reason: `Need ${minFavor} favor with ${deityId}` };
        } else if (kamiType) {
          // Check if ANY kami of this type has sufficient favor
          const kami = progress.discoveries.kami || [];
          const relevantKami = kami.filter(k => k.includes(kamiType));
          const hasFavor = relevantKami.some(k => (progress.relationships.get(k) || 0) >= minFavor);
          if (hasFavor) {
            return { met: true };
          }
          return { met: false, reason: `Need ${minFavor} favor with a ${kamiType}` };
        }

        return { met: false, reason: 'Invalid deity_favor condition' };
      }

      case 'skill_level': {
        const skill = condition.params.skill as string;
        const minLevel = condition.params.minLevel as number;
        const skills = agent.getComponent<SkillsComponent>('skills');
        const skillProgress = skills?.skills.get(skill);
        if (skillProgress && skillProgress.level >= minLevel) {
          return { met: true };
        }
        return { met: false, reason: `Need ${skill} level ${minLevel}` };
      }

      case 'node_unlocked': {
        const nodeId = condition.params.nodeId as string;
        if (progress.unlockedNodes.has(nodeId)) {
          return { met: true };
        }
        return { met: false, reason: `Must unlock ${nodeId} first` };
      }

      case 'xp_accumulated': {
        const minXp = condition.params.minXp as number;
        if (progress.totalXpEarned >= minXp) {
          return { met: true };
        }
        return { met: false, reason: `Need ${minXp} total XP` };
      }

      case 'purity_level': {
        const minPurity = condition.params.minLevel as number;
        const purity = progress.purityLevel || 0;
        if (purity >= minPurity) {
          return { met: true };
        }
        return { met: false, reason: `Need purity level ${minPurity}` };
      }

      // Add more cases as needed...

      default:
        return { met: false, reason: `Unknown condition type: ${condition.type}` };
    }
  }

  private getMagicProgress(agent: Entity, paradigmId: string): MagicSkillProgress | null {
    const skills = agent.getComponent<SkillsComponent>('skills');
    if (!skills?.magicProgress) return null;
    return skills.magicProgress.get(paradigmId) || null;
  }

  unlockNode(
    node: MagicSkillNode,
    agent: Entity,
    world: World
  ): void {
    const { canUnlock, reason } = this.canUnlockNode(node, agent, world);
    if (!canUnlock) {
      throw new Error(`Cannot unlock ${node.id}: ${reason}`);
    }

    const skills = agent.getComponent<SkillsComponent>('skills');
    if (!skills) {
      throw new Error('Agent has no skills component');
    }

    const progress = skills.magicProgress?.get(node.paradigmId);
    if (!progress) {
      throw new Error(`No progress for paradigm ${node.paradigmId}`);
    }

    // Deduct XP
    progress.availableXp -= node.xpCost;

    // Unlock node
    progress.unlockedNodes.set(node.id, 1);  // Level 1

    // Apply effects
    this.applyNodeEffects(node, agent, world);

    // Emit event
    world.eventBus.emit({
      type: 'magic:node_unlocked',
      source: agent.id,
      data: {
        paradigmId: node.paradigmId,
        nodeId: node.id,
        nodeName: node.name
      }
    });
  }

  private applyNodeEffects(
    node: MagicSkillNode,
    agent: Entity,
    world: World
  ): void {
    for (const effect of node.effects) {
      switch (effect.type) {
        case 'unlock_spell': {
          const magic = agent.getComponent<MagicComponent>('magic');
          if (magic) {
            // Add spell to known spells
            // Implementation depends on MagicComponent structure
          }
          break;
        }

        case 'improve_stat': {
          // Apply stat bonus
          // Implementation depends on stats system
          break;
        }

        // Handle other effect types...
      }
    }
  }
}
```

---

## Part 3: Skill Tree Registry

### Registry and Tree Definitions

```typescript
// packages/core/src/magic/MagicSkillTreeRegistry.ts

export class MagicSkillTreeRegistry {
  private static instance: MagicSkillTreeRegistry;
  private trees: Map<string, MagicSkillNode[]> = new Map();

  static getInstance(): MagicSkillTreeRegistry {
    if (!this.instance) {
      this.instance = new MagicSkillTreeRegistry();
    }
    return this.instance;
  }

  registerTree(paradigmId: string, nodes: MagicSkillNode[]): void {
    this.trees.set(paradigmId, nodes);
  }

  getTree(paradigmId: string): MagicSkillNode[] {
    const tree = this.trees.get(paradigmId);
    if (!tree) {
      throw new Error(`No skill tree registered for paradigm: ${paradigmId}`);
    }
    return tree;
  }

  getNode(paradigmId: string, nodeId: string): MagicSkillNode {
    const tree = this.getTree(paradigmId);
    const node = tree.find(n => n.id === nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found in ${paradigmId} tree`);
    }
    return node;
  }

  getAvailableNodes(
    paradigmId: string,
    agent: Entity,
    world: World
  ): MagicSkillNode[] {
    const tree = this.getTree(paradigmId);
    const evaluator = new MagicSkillTreeEvaluator();

    return tree.filter(node => {
      const { canUnlock } = evaluator.canUnlockNode(node, agent, world);
      return canUnlock;
    });
  }
}
```

---

## Dependencies & Integration

### Depends On (Prerequisites)
These systems must be implemented before this spec:
- **Skills Component** - Foundation for skill tracking and XP
- **Magic System** - Existing magic paradigms and spell casting
- **XP/Progression System** - Agent experience and leveling mechanics

### Integrates With (Parallel Systems)
These systems work alongside this spec:
- **Research & Discovery** - Some magic unlocks come from research projects
- **Deity System** - Divine magic trees tied to god relationships
- **Divinity System** - God favor affects magic progression

### Enables (Dependent Systems)
These systems build on top of this spec:
- **Paradigm-Specific Progression** - Unique advancement paths for each magic system
- **Hidden Content Discovery** - Secret spells and abilities unlocked through specific actions
- **Flexible Magic Unlocks** - Multiple paths to the same abilities (skill, favor, discovery)

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `MagicSkillTree.ts` with core types
- [ ] Create `UnlockCondition` interface and types
- [ ] Create `MagicSkillNode` interface
- [ ] Create `MagicSkillProgress` interface
- [ ] Extend `SkillsComponent` with `magicProgress` field
- [ ] Create `MagicSkillTreeEvaluator` class
- [ ] Create `MagicSkillTreeRegistry` singleton
- [ ] Write unit tests for condition checking

**Dependencies:** Existing `SkillsComponent`, `MagicComponent`
**Integration Points:** `packages/core/src/components/SkillsComponent.ts`

### Phase 2: Allomancy Tree (Bloodline + Discovery)
- [ ] Define Allomancy bloodline system
- [ ] Create "Snapped" foundation node (trauma unlock)
- [ ] Create metal discovery nodes (tin, pewter, iron, steel, etc.)
- [ ] Implement `metal_consumed` discovery tracking
- [ ] Create advanced nodes (flaring, duralumin)
- [ ] Distinguish Misting vs Mistborn via bloodline params
- [ ] Write integration tests

**Dependencies:** Phase 1
**Integration Points:** Bloodline system, trauma events

### Phase 3: Shinto Tree (Relationship + Purity)
- [ ] Create foundation nodes (Basic Purity, Spirit Sense)
- [ ] Create kami discovery nodes (river, mountain, forest, etc.)
- [ ] Implement `kami_met` discovery tracking
- [ ] Create relationship nodes (favor-based unlocks)
- [ ] Add purity level tracking and gates
- [ ] Create offering/ritual mechanics
- [ ] Write integration tests

**Dependencies:** Phase 1
**Integration Points:** `PresenceSpectrum`, `AnimistTypes`, deity system

### Phase 4: Sympathy Tree (Skill + Knowledge)
- [ ] Create foundation nodes (Alar training)
- [ ] Create link type nodes (heat, kinetic, etc.)
- [ ] Create slippage reduction nodes
- [ ] Implement skill-based progression
- [ ] Add binding creation nodes
- [ ] Write integration tests

**Dependencies:** Phase 1
**Integration Points:** Existing sympathy magic system

### Phase 5: Daemon Tree (External Soul)
- [ ] Create daemon settlement mechanic (adulthood event)
- [ ] Create form nodes (animal forms daemon can take)
- [ ] Create separation nodes (painful but powerful)
- [ ] Add Dust sensitivity mechanics
- [ ] Write integration tests

**Dependencies:** Phase 1
**Integration Points:** Daemon component system (if exists)

### Phase 6: Discovery Systems
- [ ] Create song learning system (hear from others)
- [ ] Create rune discovery system (find in world)
- [ ] Create true name learning (rituals, research)
- [ ] Implement discovery event tracking
- [ ] Add discovery UI notifications
- [ ] Write integration tests

**Dependencies:** Phase 1-4
**Integration Points:** Event system, knowledge sharing

### Phase 7: Progression System Integration
- [ ] Create `MagicProgressionSystem` ECS system
- [ ] Hook into event system for XP earning
- [ ] Integrate with `PresenceSpectrum` for attention
- [ ] Add automatic node unlocking on condition met
- [ ] Emit unlock events for UI updates
- [ ] Write integration tests

**Dependencies:** All previous phases
**Integration Points:** Event system, existing progression

### Phase 8: UI Data Exports
- [ ] Create UI-friendly tree data format
- [ ] Add progress visualization data
- [ ] Add available nodes query
- [ ] Add unlock hints (show hidden nodes as "???")
- [ ] Create tree visualization JSON export
- [ ] Write UI integration tests

**Dependencies:** All previous phases
**Integration Points:** UI renderer, dashboard

---

## Research Questions

1. **Should XP be paradigm-specific or global?**
   - **Proposal:** Paradigm-specific. Earning XP in Allomancy doesn't help with Shinto. Prevents "master of all" characters.

2. **Can a character have multiple paradigms active?**
   - **Proposal:** Yes, but limit to 2-3. Some paradigms conflict (purity-based vs corruption-based).

3. **How do we handle bloodline inheritance?**
   - **Proposal:** Reproduction system checks both parents. If one is Allomancer, 50% chance child is Allomancer (or use Mendel's genetics).

4. **Can discoveries be shared between agents?**
   - **Proposal:** Yes! Songs, names, runes can be taught. Metals must be consumed individually. Kami relationships are personal.

5. **What happens if conditions are no longer met?**
   - **Proposal:** Node remains unlocked (can't un-learn), but effectiveness may decrease (e.g., lose kami favor → blessing weakens).

6. **How are hidden nodes revealed?**
   - **Proposal:** Show as "???" with vague hint. Once prerequisite met, reveal full description.

7. **Can nodes be "re-locked" (e.g., corruption)?**
   - **Proposal:** Some trees yes (purity/corruption are inversely related). Most trees no.

---

## Example Skill Trees

### Allomancy Tree (Simplified)

```
Foundation:
  - "Allomancer Heritage" (bloodline: allomancer)
    └─> "Snapped" (snapping trauma)
        ├─> "Tin Burning" (metal_consumed: tin)
        ├─> "Pewter Burning" (metal_consumed: pewter)
        ├─> "Iron Pulling" (metal_consumed: iron)
        ├─> "Steel Pushing" (metal_consumed: steel)
        └─> ...

Mastery:
  - "Flaring" (node_unlocked: any 3 metals, skill_level: allomancy >= 5)
  - "Duralumin Compounding" (metal_consumed: duralumin, node_unlocked: flaring)
```

### Shinto Tree (Simplified)

```
Foundation:
  - "Spirit Sense" (no prerequisites)
  - "Basic Purity" (no prerequisites)
    └─> "Cleansing Ritual" (purity_level: 20)

Discovery:
  - "River Kami Met" (kami_met: river_kami) [hidden]
    └─> "River Blessing" (deity_favor: river_kami >= 30)
  - "Mountain Kami Met" (kami_met: mountain_kami) [hidden]
    └─> "Mountain Endurance" (deity_favor: mountain_kami >= 30)

Mastery:
  - "Kami Channeling" (node_unlocked: 3+ kami nodes, purity_level: 70)
```

### Sympathy Tree (Simplified)

```
Foundation:
  - "Alar Training" (no prerequisites)
    └─> "Basic Link" (skill_level: sympathy >= 3)

Technique:
  - "Heat Link" (node_unlocked: basic_link)
  - "Kinetic Link" (node_unlocked: basic_link)
  - "Slippage Reduction I" (skill_level: sympathy >= 5)
    └─> "Slippage Reduction II" (skill_level: sympathy >= 8)

Mastery:
  - "Binding Creation" (skill_level: sympathy >= 10, node_unlocked: 5+ technique nodes)
```

---

## Files to Create

1. `packages/core/src/magic/MagicSkillTree.ts` - Core types
2. `packages/core/src/magic/MagicSkillTreeEvaluator.ts` - Condition logic
3. `packages/core/src/magic/MagicSkillTreeRegistry.ts` - Registry
4. `packages/core/src/magic/skillTrees/AllomancyTree.ts` - Allomancy definitions
5. `packages/core/src/magic/skillTrees/ShintoTree.ts` - Shinto definitions
6. `packages/core/src/magic/skillTrees/SymPathyTree.ts` - Sympathy definitions
7. `packages/core/src/magic/skillTrees/DaemonTree.ts` - Daemon definitions
8. `packages/core/src/systems/MagicProgressionSystem.ts` - XP and unlock handling
9. `packages/core/src/magic/__tests__/MagicSkillTree.test.ts` - Tests

## Files to Modify

1. `packages/core/src/components/SkillsComponent.ts` - Add `magicProgress` field
2. `packages/core/src/events/EventMap.ts` - Add magic progression events
3. `packages/core/src/magic/MagicComponent.ts` - Link to skill trees
4. `packages/core/src/divinity/PresenceSpectrum.ts` - Integrate attention unlocks
5. `packages/core/src/divinity/AnimistTypes.ts` - Integrate kami relationships

---

## Success Criteria

✅ Each paradigm has unique unlock conditions
✅ Bloodline-based magic requires correct bloodline
✅ Discovery-based magic requires finding things in world
✅ Relationship-based magic requires earning favor
✅ Skill-based magic requires leveling skills
✅ Hidden nodes are revealed when prerequisites met
✅ Unlocking a node applies effects (spells, stats)
✅ XP is tracked per-paradigm
✅ All tests pass

---

## Inspiration

This system draws from:
- **Brandon Sanderson** - Magic with rules and costs (*Mistborn*, *Stormlight*)
- **Philip Pullman** - Daemons and external souls (*His Dark Materials*)
- **Patrick Rothfuss** - Sympathy and naming (*The Kingkiller Chronicle*)
- **Hayao Miyazaki** - Kami and spirits (*Studio Ghibli films*)
- **Dwarf Fortress** - Emergent skill progression and discovery
