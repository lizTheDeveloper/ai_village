# VR System

**Location**: `packages/core/src/vr/`

## Overview

In-game Virtual Reality simulation system. Agents experience curated emotional scenarios in controlled environments. VR sessions affect mood, memory, and β-space navigation.

## VR Types

**shadow_realm** - Ultra-high fidelity (0.99), minimal narrative weight (0.01). Single-participant meditation/exploration. Low β-space impact.

**feeling_forge** - Emotional training environment. Targets specific emotions via `target_emotion` parameter. Medium fidelity, high narrative weight.

**shared_dream** - Collective experiences. Supports up to 100 concurrent participants. Medium-high fidelity.

**remembrance_space** - Memory replay/reconstruction scenarios.

**recursion_realm** - Meta-simulation environments.

## Core Mechanics

**Session Lifecycle**: Start → Update (every 1s) → End (maxDuration or emergency exit)

**Emotional Influence**: VR applies `target_emotion` via `fidelity × progress × 0.1` strength. Maps EmotionalSignature to mood adjustments (joy/happiness/excitement → +mood, sadness/grief → -mood, etc).

**Narrative Weight**: High values (>0.5) affect β-space topology. Low values (shadow_realm = 0.01) leave β-space unmodified.

**Capacity Limits**: `max_concurrent_sessions` (default 10), `max_participants_per_session` (1 for most, 100 for shared_dream).

## API

```typescript
import { VRSystem, createVRSystemComponent } from '@ai-village/core';

// Create VR system entity
const vrEntity = world.createEntity();
vrEntity.addComponent(createVRSystemComponent('feeling_forge', 'Emotion Lab'));

// Start session
const session = vrSystem.startSession(
  world,
  vrComponent,
  ['agent-id-1', 'agent-id-2'],
  'joy_cultivation',
  'Practice experiencing joy',
  { emotions: { joy: 0.8, peace: 0.6 } },  // target_emotion
  1200  // maxDuration (1 min @ 20 TPS)
);

// Emergency exit
vrSystem.emergencyExit(world, vrComponent, session.id);
```

## Integration

**System Priority**: 160 (after cognition, before utilities)

**Throttling**: Updates every 20 ticks (1 second @ 20 TPS)

**Events**: Emits `vr_session:started`, `vr_session:ended` via EventBus

**Dependencies**: Requires `mood` component on participants for emotional effects

## Session State

```typescript
interface VRSession {
  id: string;
  participant_ids: string[];
  scenario: {
    type: string;
    description: string;
    target_emotion?: EmotionalSignature;
  };
  start_time: number;
  duration: number;  // Auto-updated each tick
  max_duration: number;
  emergency_exit_available: boolean;
}
```

## Tests

**Component**: `__tests__/VRSystemComponent.test.ts`

**Integration**: `__tests__/VRSystem.integration.test.ts` - Session lifecycle, capacity limits, throttling, multi-participant
