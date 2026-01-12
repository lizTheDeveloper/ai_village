# Narrative System

Probabilistic story shaping through outcome attractors. Higher-dimensional entities (deities, plots, prophecies, curses) bias simulation outcomes without dictating paths.

## Overview

**NarrativePressureSystem** (priority 80) maintains outcome attractors that apply gentle biases to decision points, event spawning, and relationship dynamics. The system measures convergence toward goals and decays attractors based on configurable conditions.

## Core Concepts

### Outcome Attractors

Attractors define desired outcomes with:
- **Goal**: Target state (entity_death, relationship_formed, skill_mastery, etc.)
- **Strength**: Magnitude of pressure (0-2, values >1 for divine mandates)
- **Urgency**: Speed of convergence (0-1)
- **Scope**: Where it applies (global, entity, area, village)
- **Decay**: When it fades (on_achievement, time_limit, belief_decay, never)
- **Source**: Who created it (deity, plot, prophecy, curse, karma, player)

### Pressure Effects

Attractors generate effects on simulation targets:
- **Bias**: -1 to +1 (negative = suppress, positive = encourage)
- **Confidence**: 0-1 (path viability estimate)
- **Targets**: Behavior selection, event spawning, relationship changes, emotional states, weather, resources

### Plot Integration

`addPlotStageAttractors()`: Creates attractors when plot stages activate. Attractors auto-remove on stage exit via `decay: { type: 'stage_exit' }`.

## API

```typescript
const system = getNarrativePressureSystem();

// Add attractor
system.addAttractor(createOutcomeAttractor({
  id: 'prophecy_01',
  source: { type: 'prophecy', prophecyId: 'doom' },
  goal: { type: 'entity_death', parameters: { entityId: 'hero_123' } },
  strength: 0.8,
  urgency: 0.3,
  scope: { type: 'entity', entityId: 'hero_123' },
  decay: { type: 'time_limit', ticksRemaining: 12000 },
  createdAt: world.tick
}));

// Query pressure
const bias = system.getPressureBias({
  type: 'behavior_selection',
  agentId: 'hero_123',
  behavior: 'combat'
});

// Check active goals
if (system.hasActiveGoal('relationship_formed', agentId)) {
  // Adjust relationship logic
}

// Plot integration
system.addPlotStageAttractors(
  plotInstanceId, stageId, entityId, stageAttractors, world.tick
);
```

## Mechanics

**Update Cycle** (every tick):
1. Clear pressure cache if tick changed
2. Apply decay (time_limit, belief_decay, on_achievement)
3. Update convergence measurements

**Pressure Calculation**:
- Combine multiple attractors via weighted average (strength × confidence)
- Result clamped to [-1, 1]
- Systems query pressure and apply as decision modifiers

**Decay Types**:
- `on_achievement`: Remove when convergence >= 1.0
- `time_limit`: Remove after N ticks
- `belief_decay`: Reduce strength by rate/tick, remove at 0
- `stage_exit`: Manual removal via plot system
- `never`: Permanent (deity mandates, world laws)

## Goal Types

**Entity**: entity_death, entity_survival, entity_ascension, entity_transformation
**Relationship**: relationship_formed, relationship_broken, love, betrayal, mentorship
**Village**: village_crisis, village_prosperity, village_destruction, village_founding
**Event**: event_occurrence, event_prevention, discovery, invention, exploration
**Conflict**: conflict_escalation, conflict_resolution, mystery_revelation, justice, corruption
**Plot**: plot_stage_reached, skill_mastery, emotional_state

## Files

- `NarrativePressureSystem.ts`: Attractor management, pressure queries, plot integration
- `NarrativePressureTypes.ts`: Type definitions for attractors, goals, effects, sources
