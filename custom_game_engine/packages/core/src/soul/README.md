# Soul System

Eternal identity persistence across incarnations and universe forks. Inspired by Bill Murray's Groundhog Day - souls remember everything even when universes "reset".

## Components

### SoulIdentityComponent
Core eternal identity created by The Three Fates. Never changes across incarnations.

**Properties:**
- `true_name`: Discovered through Fate ceremony
- `purpose`, `core_interests`, `destiny`: From the Fates
- `archetype`: wanderer, protector, creator, etc.
- `wisdom_level`: 0-100+, increases with lessons learned
- `lessons_learned`: Permanent record across all lives
- `incarnation_count`: Total lives lived

**Wisdom Domains:** relationships, systems, self, transcendence, power, mortality

### SilverThreadComponent
Append-only personal timeline. Continues across incarnations and universe forks.

**Structure:**
- `segments[]`: One per universe visited (entry/exit transitions)
- `events[]`: Significant events only (plot changes, lessons, milestones)
- `head`: Current position (segment_index, personal_tick, universe)
- `totals`: personal_ticks, universes_visited, incarnations, forks_experienced

**Event Types:** soul_created, incarnated, died, universe_fork, lesson_learned, plot_stage_change, meaningful_choice, wisdom_threshold

### SoulLinkComponent
Lives on agent entities, links to soul entity.

**Properties:**
- `soul_id`: Reference to soul entity
- `is_primary_incarnation`: Current active incarnation?
- `soul_influence_strength`: 0-1 (how much wisdom guides decisions)
- `incarnation_number`: 1st life, 2nd life, etc.

## Lifecycle

**Creation:**
```typescript
const identity = createSoulIdentityComponent({
  true_name: 'Flame-Who-Wanders',
  created_at: multiverseTick,
  purpose: 'To bridge worlds',
  core_interests: ['exploration', 'connection'],
  archetype: 'wanderer'
});

const thread = createSilverThreadComponent({
  soul_id: soulEntity.id,
  universe_id: currentUniverseId,
  universe_tick: world.tick,
  created_at: multiverseTick
});
```

**Incarnation:**
```typescript
const link = createSoulLinkComponent({
  soul_id: soulEntity.id,
  link_formed_at: thread.head.personal_tick,
  incarnation_number: identity.incarnation_count + 1
});
agent.addComponent(link);
```

**Death:**
```typescript
severSoulLink(link);
// Soul persists, ready for next incarnation or afterlife realm
```

**Universe Fork:**
```typescript
forkToNewUniverse(thread, {
  to_universe_id: newUniverseId,
  to_universe_tick: 0,
  snapshot_id: snapshotKey
});
// Soul continues in new universe, remembers old one
```

## Systems

**SoulConsolidationSystem** (priority 106): Runs during sleep after MemoryConsolidationSystem. Extracts significant events from episodic memory to silver thread. Philosophy: "Don't trash up the soul with every time it was hungry or thirsty."

**SoulInfluencedDreams**: Generates dreams from soul's eternal perspective - past life echoes, wisdom hints, prophetic visions. Probability based on `soul_influence_strength` and `wisdom_level`.

## Usage

```typescript
import {
  createSoulIdentityComponent,
  createSilverThreadComponent,
  createSoulLinkComponent,
  addLessonToSoul,
  addSignificantEvent,
  incrementPersonalTick
} from '@ai-village/core';

// Each tick (via SoulConsolidationSystem or manual)
incrementPersonalTick(thread, world.tick);

// Record significant event
addSignificantEvent(thread, {
  type: 'lesson_learned',
  details: { lesson_id: 'trust_earned', wisdom: 5 }
});

// Add lesson to soul
addLessonToSoul(identity, {
  lesson_id: 'trust_earned',
  personal_tick: thread.head.personal_tick,
  universe_id: world.universeId,
  incarnation: link.incarnation_number,
  wisdom_gained: 5,
  domain: 'relationships',
  insight: 'Trust must be earned through consistent action',
  plot_source: 'village_betrayal'
});
```

## Conservation Principle

**NEVER delete souls.** Mark corrupted souls with `corrupted` component. Souls are eternal - corruption is part of their story. See `CORRUPTION_SYSTEM.md` for recovery procedures.
