# Realm System

The Realm System implements mythological pocket dimensions where entities can exist in different planes of reality with unique laws, time flow, and access restrictions.

## Overview

Realms are separate dimensional spaces that entities can transition between:
- **Underworld**: Where souls go after death (time flows normally)
- **Celestial Realm**: Divine court/heaven (time flows slower - 10:1 ratio)
- **Dream Realm**: Consciousness space (subjective time, malleable reality)

## Quick Start

### 1. Initialize Realms

```typescript
import { initializeUnderworld, initializeAllRealms } from '@ai-village/core';

// Initialize just the Underworld
const underworldId = initializeUnderworld(world);

// Or initialize all predefined realms
const realmIds = initializeAllRealms(world);
```

### 2. Add Realm Systems

The realm system consists of multiple cooperating systems:

```typescript
import {
  RealmManager,
  PortalSystem,
  RealmTimeSystem,
  DeathTransitionSystem,
} from '@ai-village/core';

// Add to your game's system registry
world.addSystem(new RealmTimeSystem());       // Priority 5 - tracks time dilation
world.addSystem(new RealmManager());          // Priority 50 - manages realms
world.addSystem(new PortalSystem());          // Priority 55 - handles portals
world.addSystem(new DeathTransitionSystem()); // Priority 110 - death → Underworld
```

### 3. Give Entities Realm Location

All entities that can travel between realms need a `RealmLocationComponent`:

```typescript
import { createRealmLocationComponent } from '@ai-village/core';

// Entities start in the mortal world by default
const realmLocation = createRealmLocationComponent('mortal_world');
entity.addComponent(realmLocation);
```

## Features

### Time Dilation

Entities in different realms experience time at different rates:

```typescript
// Celestial realm: time flows 10x slower
// 10 years pass in mortal world = 1 year in Celestial realm
const celestialProperties = {
  timeRatio: 0.1,  // 10% speed
  // ...
};

// In your systems, get realm-adjusted deltaTime:
const adjustedDelta = RealmTimeSystem.getAdjustedDeltaTime(entity, deltaTime);
```

### Death Mechanics

The DeathTransitionSystem automatically transitions dead entities (health <= 0) to the Underworld:

```typescript
// When an entity dies:
needs.health = 0;

// DeathTransitionSystem will:
// 1. Detect death
// 2. Transition entity to Underworld via 'death' access method
// 3. Set canExit = false (trapped until resurrected)
// 4. Add 'dead' transformation marker
```

### Manual Realm Transitions

Use portals or direct transitions:

```typescript
import { transitionToRealm, returnToMortalWorld } from '@ai-village/core';

// Transition through a portal
const result = transitionToRealm(
  world,
  entityId,
  'celestial',  // target realm
  'invitation'  // access method
);

if (result.success) {
  console.log('Transition successful!', result.effects);
} else {
  console.error('Transition failed:', result.reason);
}

// Return from any realm to mortal world
returnToMortalWorld(world, entityId);
```

### Realm Laws and Effects

Realms can enforce automatic laws and transformations:

```typescript
// Celestial Realm laws:
laws: [
  {
    name: 'no_violence',
    effect: 'combat_impossible',
    enforcement: 'automatic',
  },
  {
    name: 'truth_binding',
    effect: 'lies_impossible',
    enforcement: 'automatic',
  }
]

// These become transformation markers on entities:
realmLocation.transformations; // ['combat_disabled', 'truthbound']
```

### Access Restrictions

Realms can restrict who can enter:

```typescript
accessRestrictions: [
  {
    type: 'state',
    requirement: 'dead_or_sponsored',
    description: 'Only the dead or those with divine sponsorship'
  },
  {
    type: 'permission',
    requirement: 'divine_invitation',
    description: 'Must be invited by a celestial being'
  }
]
```

## Creating Custom Realms

```typescript
import { createRealmEntity, type RealmProperties } from '@ai-village/core';

const customRealm: RealmProperties = {
  id: 'my_realm',
  name: 'My Custom Realm',
  category: 'personal',
  parentUniverseId: 'main',
  size: 'pocket',
  topology: 'floating_island',
  timeFlow: 'fast',
  timeRatio: 2.0,  // Time flows 2x faster
  environment: 'eternal_twilight',
  stability: 0.95,
  accessMethods: ['portal', 'ritual'],
  accessRestrictions: [],
  laws: [],
  selfSustaining: false,
  maintenanceCost: 10,  // Divine power/attention required
  subRealms: [],
};

const realmId = createRealmEntity(world, customRealm);
```

## Architecture

### Components

- **RealmComponent**: Attached to realm entities, contains realm properties and state
- **PortalComponent**: Marks entities as portals/gateways between realms
- **RealmLocationComponent**: Tracks which realm an entity is currently in

### Systems

- **RealmTimeSystem** (priority 5): Updates time tracking for entities based on realm time dilation
- **RealmManager** (priority 50): Manages realm state, maintenance costs, and inhabitants
- **PortalSystem** (priority 55): Detects entities near portals and handles transitions
- **DeathTransitionSystem** (priority 110): Automatically sends dead entities to Underworld

### Core Logic

- **RealmTransition**: Core transition validation and execution
- **RealmDefinitions**: Predefined realm configurations (Underworld, Celestial, Dream)
- **RealmInitializer**: Helper functions to create realm entities

## Future Extensions

- **Realm Rulers**: Entities that control/own realms
- **Sub-realms**: Nested pocket dimensions (e.g., Elysium within Underworld)
- **Realm Contests**: Multiple entities vying for control
- **Dynamic Access**: Realm laws that change based on conditions
- **Realm Collapse**: Self-sustaining failures leading to realm destruction
- **Cross-realm Interaction**: Viewing/affecting other realms from afar

## Testing

To test the realm system:

1. Initialize the Underworld
2. Create an entity with RealmLocation component
3. Set entity health to 0
4. Verify entity transitions to Underworld
5. Check that entity cannot exit (canExit = false)
6. Verify time dilation is applied correctly

```typescript
// Example test flow
const underworldId = initializeUnderworld(world);

const entity = world.createEntity();
const realmLocation = createRealmLocationComponent('mortal_world');
const needs = { health: 100, ...otherNeeds };

entity.addComponent(realmLocation);
entity.addComponent(needs);

// Simulate death
needs.health = 0;

// Run death transition system
deathTransitionSystem.update(world, [entity], 1.0);

// Verify transition
assert(realmLocation.currentRealmId === 'underworld');
assert(realmLocation.canExit === false);
assert(realmLocation.transformations.includes('dead'));
```
