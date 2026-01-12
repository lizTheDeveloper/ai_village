# Behavior System

Agent behavior framework with registry-based execution and behavior queue integration.

## Overview

**Two directories:**
- `behavior/` - Core system, registry, agent behaviors, animal AI
- `behaviors/` - Navigation behaviors (navigate, explore, gradients)

**Architecture:**
- `BehaviorRegistry` - Central behavior handler registry with fallback support
- `BaseBehavior` - Abstract base class with movement, steering, and state utilities
- `AgentComponent.behavior` - Current behavior name
- `AgentComponent.behaviorState` - Behavior-specific state (progress, targets, etc.)
- `AgentComponent.queuePaused` - Autonomic override flag (prevents behavior switching)

## Behavior Types

**Resource:** gather, deposit_items, seek_food
**Work:** build, craft, till, plant, water, harvest, research
**Social:** talk, call_meeting, attend_meeting, follow_agent
**Combat:** initiate_combat, initiate_hunt, butcher
**Idle:** idle, wander, reflect, observe, sit_quietly, amuse_self, practice_skill
**Survival:** seek_sleep, forced_sleep, seek_warmth, seek_cooling, flee_to_home
**Navigation:** navigate, explore_frontier, explore_spiral, follow_gradient
**Magic:** cast_spell, pray, group_pray, meditate
**Maintenance:** repair, upgrade
**Voxel:** material_transport, tile_build
**Animal:** tame_animal, house_animal

## Execution Pattern

```typescript
// 1. Register behaviors (once at startup)
registerBehavior('gather', gatherBehavior);
registerBehavior('build', buildBehavior);

// 2. AgentBrainSystem executes current behavior each tick
const behavior = agent.behavior; // e.g., 'gather'
getBehaviorRegistry().execute(behavior, entity, world);

// 3. Behavior reads/updates behaviorState
const state = agent.behaviorState as { gatherTargetId?: string };
this.updateState(entity, { gatherTargetId: resourceId });

// 4. Complete or switch
this.complete(entity); // Signals DecisionProcessor to assign new behavior
this.switchTo(entity, 'deposit_items', { previousBehavior: 'gather' });
```

## Key Features

**Movement control:**
- `disableSteering()` - Disable steering system for direct behavior control
- `moveToward()` - Smooth arrival with hysteresis to prevent oscillation
- `setVelocity()` - Update both MovementComponent and VelocityComponent
- `hasReached()` - Check if within arrival threshold

**Behavior queue integration:**
- Behaviors respect `queuePaused` flag (autonomic needs override)
- `switchTo()` checks queue state before transitioning
- `complete()` signals DecisionProcessor for next decision

**Skill-based timing:**
- GatherBehavior: duration = baseTicks * difficulty / (1 + skillLevel * 0.2)
- Higher skills = faster gathering, crafting, building

**Animal AI:**
- `AnimalBrainSystem` - Separate brain for animals (graze, flee, rest)
- `BaseAnimalBehavior` - Animal-specific behavior base class
- State machine per animal type (herbivore, predator, prey)

## Architecture Notes

**Behavior vs. Action:**
- Behaviors = continuous AI loops (gather, wander, build)
- Actions = one-shot LLM decisions (chat, cast_spell, trade)
- Behaviors call actions when needed (GatherBehavior may call gather_resource action)

**State management:**
- Never store World/Entity references in state (serialize/deserialize breaks them)
- Store entity IDs as strings, look up each tick
- Use `updateState()` for incremental updates to preserve other state keys

**Navigation behaviors:**
- `navigate` - Move to specific coordinates
- `explore_frontier` - Expand known map boundaries
- `explore_spiral` - Systematic outward spiral search
- `follow_gradient` - Move toward resource-rich areas (uses MapKnowledge)
