# Afterlife Needs System Spec

## Overview

When agents die and transition to the Underworld, their physical needs (hunger, thirst, energy) become irrelevant. Instead, souls have **spiritual needs** unique to the afterlife that drive their behavior and ultimate fate.

## Design Philosophy

The afterlife should feel meaningfully different from mortal life:
- Physical survival is no longer a concern
- Identity and memory become the things at stake
- Connection to the living world matters
- Unfinished business creates unrest
- Other souls provide companionship (or conflict)

---

## Afterlife Needs

### 1. **Coherence** (0-1)
*How well the soul maintains its identity and memories*

- Starts at 1.0 on death
- **Decays slowly** in the Underworld (the `memory_fading` realm law)
- Consolidated memories decay slower than unconsolidated ones
- High emotional intensity memories resist fading longer
- At 0.0: Soul becomes a "shade" - loses personality, wanders aimlessly

**Decay Rate:**
- Base: 0.0001 per game minute (very slow)
- Accelerated by: loneliness, being forgotten by the living
- Slowed by: being remembered (prayers, offerings), visits from living

**Integration:** Ties into existing `EpisodicMemoryComponent.clarity` - as coherence drops, memory clarity decays faster.

---

### 2. **Tether** (0-1)
*Connection to the mortal world*

- Starts based on relationships left behind (family, friends, unfinished goals)
- **Decays** as the living forget the dead
- **Refreshed** by:
  - Prayers from the living mentioning the dead by name
  - Offerings at graves/shrines
  - Dreams where living remember the dead

- At 0.0: Soul fully "passes on" - no longer concerned with mortal affairs

**Integration:** Connect to `SpiritualComponent.prayers` - prayers for the dead (type: 'mourning') strengthen the tether.

---

### 3. **Peace** (0-1)
*Acceptance of death and resolution of unfinished business*

- Starts based on how the agent died and what they left undone
- Violent/sudden death = lower starting peace
- Unfinished goals from `GoalsComponent` = lower peace
- **Increases** when:
  - Goals are completed by successors
  - Agent comes to terms with death (reflection)
  - Receives closure from the living

- At low peace: Soul is "restless" - may attempt to escape, haunt, or become angry

**Integration:** Check `GoalsComponent` on death - uncompleted high-priority goals reduce starting peace.

---

### 4. **Solitude** (0-1, inverse of social)
*Loneliness in the realm of the dead*

- Increases over time without interaction
- **Decreases** when:
  - Interacting with other souls
  - Visited by living (necromancy, dreams, portals)
  - Receiving prayers

- At high solitude: Soul becomes withdrawn, incoherent faster

**Integration:** Mirrors living `NeedsComponent.social` but uses different sources of fulfillment.

---

## New Component: `AfterlifeComponent`

```typescript
interface AfterlifeComponent extends Component {
  type: 'afterlife';

  // Core afterlife needs
  coherence: number;      // 0-1, identity/memory integrity
  tether: number;         // 0-1, connection to mortal world
  peace: number;          // 0-1, acceptance of death
  solitude: number;       // 0-1, loneliness (inverse of fulfilled)

  // Death context
  causeOfDeath: string;           // 'starvation' | 'combat' | 'old_age' | etc
  deathTick: number;              // When they died
  deathLocation: { x: number; y: number };

  // Unfinished business
  unfinishedGoals: string[];      // Goal IDs from when alive
  unresolvedRelationships: string[]; // Entity IDs of important relationships

  // State
  isShade: boolean;               // True if coherence reached 0
  hasPassedOn: boolean;           // True if tether reached 0 and at peace
  isRestless: boolean;            // True if peace is critically low

  // Tracking
  timesRemembered: number;        // Prayers/offerings received
  lastRememberedTick: number;
  visitsFromLiving: number;
}
```

---

## New System: `AfterlifeNeedsSystem`

**Priority:** 16 (right after NeedsSystem at 15)
**Required Components:** `['afterlife', 'realm_location']`

### Update Logic:

```typescript
update(world, entities, deltaTime) {
  for (entity of entities) {
    const afterlife = entity.getComponent('afterlife');
    const realmLocation = entity.getComponent('realm_location');

    // Only process entities in the underworld
    if (realmLocation.currentRealmId !== 'underworld') continue;

    // Apply time dilation from realm
    const adjustedDelta = deltaTime * realmLocation.timeDilation;

    // Coherence decay
    let coherenceDecay = BASE_COHERENCE_DECAY * adjustedDelta;
    if (afterlife.solitude > 0.7) coherenceDecay *= 1.5; // Loneliness accelerates
    afterlife.coherence = Math.max(0, afterlife.coherence - coherenceDecay);

    // Tether decay
    const ticksSinceRemembered = currentTick - afterlife.lastRememberedTick;
    let tetherDecay = BASE_TETHER_DECAY * adjustedDelta;
    if (ticksSinceRemembered > FORGOTTEN_THRESHOLD) tetherDecay *= 2;
    afterlife.tether = Math.max(0, afterlife.tether - tetherDecay);

    // Solitude increases
    afterlife.solitude = Math.min(1, afterlife.solitude + SOLITUDE_INCREASE * adjustedDelta);

    // Peace slowly increases if no unfinished business
    if (afterlife.unfinishedGoals.length === 0) {
      afterlife.peace = Math.min(1, afterlife.peace + PEACE_GAIN * adjustedDelta);
    }

    // State transitions
    afterlife.isShade = afterlife.coherence < 0.1;
    afterlife.isRestless = afterlife.peace < 0.2;
    afterlife.hasPassedOn = afterlife.tether < 0.1 && afterlife.peace > 0.8;
  }
}
```

---

## Integration Points

### 1. DeathTransitionSystem
When agent dies, create `AfterlifeComponent`:
- Copy unfinished goals from `GoalsComponent`
- Set starting peace based on death circumstances
- Calculate tether from relationship count

### 2. PrayerSystem
Prayers of type `'mourning'` targeting a dead entity:
- Refresh their `tether`
- Reduce their `solitude`
- Increase `timesRemembered`

### 3. MemoryConsolidationSystem
For dead entities:
- Memory clarity decay rate modified by `coherence`
- Low coherence = faster memory loss

### 4. AgentBrainSystem
Dead agents with LLM:
- Include afterlife context in prompts
- Different available actions (haunt, wander, seek peace, etc.)
- No physical action options

---

## Possible Outcomes for Souls

| Coherence | Tether | Peace | Outcome |
|-----------|--------|-------|---------|
| High | High | Low | Restless ghost, may haunt |
| High | Low | High | Peacefully passed on |
| Low | Any | Any | Shade, lost identity |
| High | High | High | Ancestor spirit, can advise living |
| Low | High | Low | Angry shade, dangerous |

---

---

## Integration with Ancestor Magic (Shinto Paradigm)

The Shinto paradigm in `AnimistParadigms.ts` already defines ancestor spirits (`KamiType: 'ancestor'`). This creates a natural lifecycle:

### Living → Dead → Ancestor Spirit Progression

```
MORTAL LIFE
    ↓ (death)
UNDERWORLD (new soul)
  - coherence: 1.0
  - tether: based on relationships
  - peace: based on death/goals
    ↓ (time passes)
FADING SOUL
  - coherence dropping
  - tether depends on remembrance
    ↓
         ╱                    ╲
SHADE (coherence=0)    ANCESTOR KAMI (peace>0.8, coherence>0.5)
  - lost identity              - becomes protective spirit
  - wanders aimlessly          - can bless/curse descendants
  - no longer "them"           - gains Kami interface
```

### Soul → Kami Transformation

When a soul meets the criteria (high peace, maintained coherence), they can become an **Ancestor Kami**:

```typescript
interface AncestorKamiTransformation {
  // From the existing Kami interface in AnimistParadigms.ts
  id: string;                    // Soul's entity ID
  name: string;                  // Their mortal name + title
  type: 'ancestor';
  rank: 'minor' | 'local';       // Based on how many remember them
  domain: string;                // "The [family name] line and household"

  // Derived from their life
  preferredOfferings: string[];  // Favorite foods, meaningful items
  taboos: string[];              // Things they hated, moral violations
  blessings: string[];           // Skills they had, personality-based
  curses: string[];              // Opposite of blessings

  // Location
  shrineLocation?: string;       // Household shrine if one exists
}
```

### Offerings System Integration

The Shinto paradigm already defines offering mechanics. For ancestor spirits:

| Offering Type | Effect on Soul |
|---------------|----------------|
| Incense | +tether, minor |
| Favorite foods | +tether, +peace (they're remembered fondly) |
| News of descendants | +tether, +coherence (reminds them who they are) |
| Prayer (mourning type) | +tether, -solitude |
| Grave visit | +tether, +peace, -solitude (major) |

### Ancestor Blessings & Curses

When a soul becomes an Ancestor Kami, they can affect living descendants:

**Blessings** (when pleased):
- `family_luck` - Slight positive modifier to descendant rolls
- `wisdom_dreams` - Can appear in dreams with guidance
- `protection_from_spirits` - Ward against hostile spirits
- Skill bonuses based on what they were good at in life

**Curses** (when neglected/dishonored):
- `misfortune` - Slight negative modifier
- `guilt_dreams` - Disturbing dreams, reduces rest quality
- `ancestral_disappointment` - Mood penalty
- Withdrawal of protection

---

## Updated Component: `AfterlifeComponent`

```typescript
interface AfterlifeComponent extends Component {
  type: 'afterlife';

  // Core afterlife needs
  coherence: number;      // 0-1, identity/memory integrity
  tether: number;         // 0-1, connection to mortal world
  peace: number;          // 0-1, acceptance of death
  solitude: number;       // 0-1, loneliness

  // Death context
  causeOfDeath: string;
  deathTick: number;
  deathLocation: { x: number; y: number };
  deathMemory?: string;   // Summary of death for their memories

  // Unfinished business
  unfinishedGoals: string[];
  unresolvedRelationships: string[];

  // Family/Lineage tracking (for ancestor magic)
  descendants: string[];          // Living entity IDs
  familyName?: string;            // For shrine identification
  bloodlineId?: string;           // Connects to GeneticComponent lineage

  // Ancestor spirit state
  isShade: boolean;               // coherence < 0.1
  hasPassedOn: boolean;           // tether < 0.1 && peace > 0.8
  isRestless: boolean;            // peace < 0.2
  isAncestorKami: boolean;        // Transformed into protective spirit
  kamiRank?: 'minor' | 'local' | 'regional';  // If ancestor kami

  // What they can grant (populated on kami transformation)
  availableBlessings?: string[];
  availableCurses?: string[];
  preferredOfferings?: string[];
  taboos?: string[];

  // Tracking
  timesRemembered: number;
  lastRememberedTick: number;
  visitsFromLiving: number;
  offeringsReceived: Map<string, number>;  // offering type → count
}
```

---

## New System: `AncestorTransformationSystem`

**Priority:** 115 (after AfterlifeNeedsSystem)
**Required Components:** `['afterlife', 'realm_location']`

Checks if souls qualify to become Ancestor Kami:

```typescript
update(world, entities, deltaTime) {
  for (entity of entities) {
    const afterlife = entity.getComponent('afterlife');

    // Skip if already transformed or a shade
    if (afterlife.isAncestorKami || afterlife.isShade) continue;

    // Check transformation criteria
    const qualifies =
      afterlife.peace > 0.8 &&
      afterlife.coherence > 0.5 &&
      afterlife.tether > 0.3 &&  // Must still have connection
      afterlife.descendants.length > 0;  // Must have living family

    if (qualifies) {
      transformToAncestorKami(entity, afterlife);
    }
  }
}
```

---

## Future Expansions

1. **Resurrection mechanics** - high coherence + high tether = can be brought back
2. **Ancestor worship** - souls with high peace become protective spirits ✓ (integrated above)
3. **Necromancy** - forcibly strengthen tether, but damages peace
4. **Reincarnation** - souls that pass on may return as new agents
5. **Underworld society** - souls form communities, hierarchies
6. **Ancestral skill inheritance** - descendants can channel ancestor skills temporarily
7. **Shrine mechanics** - building/maintaining household shrines affects all ancestors

---

## Files to Create/Modify

### New Files:
- `packages/core/src/components/AfterlifeComponent.ts` - Soul state tracking
- `packages/core/src/systems/AfterlifeNeedsSystem.ts` - Decay/recovery of afterlife needs
- `packages/core/src/systems/AncestorTransformationSystem.ts` - Soul → Kami transition
- `packages/core/src/systems/AncestorBlessingSystem.ts` - Apply blessings/curses to descendants

### Modifications:
- `DeathTransitionSystem.ts` - Create AfterlifeComponent on death, populate from GoalsComponent
- `PrayerSystem.ts` - Handle 'mourning' prayers, refresh tether/reduce solitude
- `AnimistParadigms.ts` - Add helper to create Kami from deceased agent
- `AgentBrainSystem.ts` - Afterlife-aware prompts for dead LLM agents
- `registerAllSystems.ts` - Register new systems
- `StructuredPromptBuilder.ts` - Afterlife context for dead agents
- `GeneticComponent.ts` - Track bloodlineId for ancestor-descendant relationships
