# Realm System Implementation Plan
**Date:** 2025-12-29
**Goal:** Implement mythological realms as pocket dimensions

---

## Overview

Realms are pocket dimensions that exist alongside universes:
- **Cheaper to access** than universe crossing
- **Tied to presences** (gods create/maintain them)
- **Special laws** (unique rules per realm)
- **Afterlife integration** (death → realm)

---

## Implementation Phases

### Phase 1: Core Types & Components (Day 1)

**Files to create:**
1. `packages/core/src/realms/RealmTypes.ts`
2. `packages/core/src/components/RealmComponent.ts`
3. `packages/core/src/components/PortalComponent.ts`
4. `packages/core/src/components/RealmLocationComponent.ts`

**What Phase 1 delivers:**
- TypeScript types for all realm properties
- Component for realm entities
- Component for portal entities
- Component for tracking which realm an entity is in

---

### Phase 2: Realm Manager System (Day 2)

**Files to create:**
1. `packages/core/src/systems/RealmManager.ts`
2. `packages/core/src/realms/RealmRegistry.ts`
3. `packages/core/src/realms/RealmDefinitions.ts`

**What Phase 2 delivers:**
- System to manage all active realms
- Registry of realm definitions
- Realm creation/activation logic
- Realm-specific tick updates

---

### Phase 3: Portal & Transition (Days 3-4)

**Files to create:**
1. `packages/core/src/systems/PortalSystem.ts`
2. `packages/core/src/realms/RealmTransition.ts`
3. `packages/core/src/realms/AccessControl.ts`

**What Phase 3 delivers:**
- Portal detection and interaction
- Realm transition mechanics (entity movement between realms)
- Access control (who can enter)
- Portal rendering

---

### Phase 4: Time Dilation (Day 4-5)

**Files to modify:**
1. `packages/core/src/systems/RealmManager.ts` (add time tracking)
2. `packages/core/src/realms/RealmTypes.ts` (time flow types)

**What Phase 4 delivers:**
- Time flows differently per realm
- Time synchronization on realm exit
- Age tracking for mortal visitors

---

### Phase 5: First Realm - Underworld (Day 5-6)

**Files to create:**
1. `packages/core/src/realms/definitions/Underworld.ts`
2. `packages/core/src/realms/laws/RealmLawEnforcer.ts`

**What Phase 5 delivers:**
- Complete Underworld realm
- Death transitions to Underworld
- Realm law enforcement (no return for dead)
- Test portal in main world

---

### Phase 6: Integration & Testing (Day 7)

**Files to modify:**
1. `packages/core/src/systems/index.ts` (register systems)
2. `demo/src/main.ts` (create test portal)
3. `packages/renderer/` (portal/realm rendering)

**What Phase 6 delivers:**
- Full end-to-end testing
- Visual portal rendering
- Realm transition UI feedback
- Death integration

---

## Detailed Implementation

### Phase 1: Types & Components

#### RealmTypes.ts

```typescript
export type RealmCategory =
  | 'celestial'    // Divine courts, heavens
  | 'underworld'   // Death realms, afterlife
  | 'elemental'    // Fire, water, earth, air realms
  | 'dream'        // Dream/consciousness realms
  | 'liminal'      // Boundary/crossroads
  | 'personal'     // Individual divine domains
  | 'wild';        // Untamed, primordial

export type RealmSize =
  | 'pocket'       // Single room (0.50+)
  | 'domain'       // Village-scale (0.60+)
  | 'territory'    // Region-scale (0.70+)
  | 'kingdom'      // Nation-scale (0.80+)
  | 'infinite';    // Unbounded (0.90+)

export type TimeFlowType =
  | 'frozen'       // No time passes
  | 'crawling'     // 0.01-0.1 ratio
  | 'slow'         // 0.1-0.5 ratio
  | 'normal'       // 1.0 ratio
  | 'fast'         // 2-10 ratio
  | 'rushing'      // 10-100 ratio
  | 'subjective';  // Variable

export type AccessMethod =
  | 'death'        // Die to enter
  | 'dream'        // Sleep to enter
  | 'ritual'       // Perform ritual
  | 'portal'       // Physical gate
  | 'invitation'   // Invited by ruler
  | 'pilgrimage'   // Complete journey
  | 'ascension'    // Achieve worthiness
  | 'trance'       // Meditation/shamanic
  | 'physical_gate'// Walk through door
  | 'summoning';   // Called by inhabitant

export interface RealmProperties {
  // Identity
  id: string;
  name: string;
  category: RealmCategory;
  parentUniverseId: string;

  // Physical
  size: RealmSize;
  topology: string;  // 'mountain_peak', 'underground_world', etc.

  // Temporal
  timeFlow: TimeFlowType;
  timeRatio: number;  // 1.0 = same as parent

  // Environmental
  environment: string;  // 'eternal_spring', 'eternal_twilight', etc.
  stability: number;    // 0-1

  // Access
  accessMethods: AccessMethod[];
  accessRestrictions: AccessRestriction[];

  // Governance
  ruler?: string;  // Presence ID
  contested: boolean;
  laws: RealmLaw[];

  // Meta
  selfSustaining: boolean;
  maintenanceCost: number;  // Attention per tick
  subRealms?: string[];      // Child realm IDs
}

export interface AccessRestriction {
  type: 'identity' | 'state' | 'action' | 'permission' | 'knowledge' | 'time';
  requirement: string;
  description?: string;
}

export interface RealmLaw {
  name: string;
  effect: string;
  enforcement: 'automatic' | 'environmental' | 'guardian' | 'ruler';
  description?: string;
}
```

#### RealmComponent.ts

```typescript
import { ComponentBase } from './ComponentBase';
import type { RealmProperties } from '../realms/RealmTypes';

export class RealmComponent extends ComponentBase {
  public readonly type = 'realm';

  constructor(
    public properties: RealmProperties,
    public active: boolean = true,
    public currentTick: number = 0,
    public timeSinceCreation: number = 0,
    public attentionReserve: number = 0
  ) {
    super();
  }
}
```

#### PortalComponent.ts

```typescript
import { ComponentBase } from './ComponentBase';
import type { AccessMethod } from '../realms/RealmTypes';

export class PortalComponent extends ComponentBase {
  public readonly type = 'portal';

  constructor(
    public targetRealmId: string,
    public accessMethod: AccessMethod,
    public bidirectional: boolean = false,
    public exitRealmId?: string,  // If bidirectional
    public active: boolean = true,
    public usesRemaining?: number  // Optional limited uses
  ) {
    super();
  }
}
```

#### RealmLocationComponent.ts

```typescript
import { ComponentBase } from './ComponentBase';

export class RealmLocationComponent extends ComponentBase {
  public readonly type = 'realm_location';

  constructor(
    public currentRealmId: string = 'mortal_world',  // Default to main world
    public enteredAt: number = 0,                     // Tick when entered
    public timeDilation: number = 1.0,                // Current time ratio
    public canExit: boolean = true                    // Can leave realm?
  ) {
    super();
  }
}
```

---

### Phase 2: Realm Manager

#### RealmManager.ts

```typescript
import { System } from './System';
import { World } from '../World';
import { RealmComponent } from '../components/RealmComponent';
import { RealmLocationComponent } from '../components/RealmLocationComponent';
import type { RealmProperties } from '../realms/RealmTypes';

export class RealmManager extends System {
  private realms: Map<string, RealmComponent> = new Map();
  private realmTicks: Map<string, number> = new Map();

  update(world: World, delta: number): void {
    // Update each active realm independently
    for (const [realmId, realm] of this.realms) {
      if (!realm.active) continue;

      // Calculate realm-specific delta based on time dilation
      const realmDelta = delta * realm.properties.timeRatio;

      // Update realm tick
      const currentTick = this.realmTicks.get(realmId) || 0;
      this.realmTicks.set(realmId, currentTick + realmDelta);

      // Drain maintenance cost
      realm.attentionReserve -= realm.properties.maintenanceCost * delta;

      // Check if realm should collapse
      if (!realm.properties.selfSustaining && realm.attentionReserve <= 0) {
        this.collapseRealm(realmId, world);
      }
    }
  }

  registerRealm(realmId: string, properties: RealmProperties): void {
    const realm = new RealmComponent(properties);
    this.realms.set(realmId, realm);
    this.realmTicks.set(realmId, 0);
  }

  getRealm(realmId: string): RealmComponent | undefined {
    return this.realms.get(realmId);
  }

  getRealmTime(realmId: string): number {
    return this.realmTicks.get(realmId) || 0;
  }

  private collapseRealm(realmId: string, world: World): void {
    console.warn(`Realm ${realmId} is collapsing due to lack of maintenance!`);
    // Eject all entities
    // Mark realm as inactive
    // Trigger collapse events
  }
}
```

---

### Phase 3: Portal & Transition

#### PortalSystem.ts

```typescript
import { System } from './System';
import { World } from '../World';
import { PortalComponent } from '../components/PortalComponent';
import { PositionComponent } from '../components/PositionComponent';

export class PortalSystem extends System {
  update(world: World, delta: number): void {
    const entities = world.getEntitiesWithComponent('portal');

    for (const entity of entities) {
      const portal = entity.getComponent('portal') as PortalComponent;
      const position = entity.getComponent('position') as PositionComponent;

      if (!portal.active || !position) continue;

      // Check for nearby entities
      const nearbyEntities = world.getEntitiesInRadius(
        position.x,
        position.y,
        2 // Portal interaction radius
      );

      for (const nearby of nearbyEntities) {
        if (nearby.id === entity.id) continue; // Skip self
        if (!nearby.hasComponent('realm_location')) continue;

        // Check if entity is trying to use portal
        this.attemptPortalUse(nearby, portal, world);
      }
    }
  }

  private attemptPortalUse(entity: any, portal: PortalComponent, world: World): void {
    // Access control checks
    // Realm transition
    // Visual effects
  }
}
```

---

## First Implementation: Underworld

The Underworld is the simplest realm to start with:
- **Access:** Death (automatic) or ritual (advanced)
- **Time:** Normal (1.0 ratio)
- **Size:** Infinite
- **Law:** Dead cannot leave without permission

### Underworld Definition

```typescript
export const UnderworldRealm: RealmProperties = {
  id: 'underworld',
  name: 'The Underworld',
  category: 'underworld',
  parentUniverseId: 'main',
  size: 'infinite',
  topology: 'underground_cavern',
  timeFlow: 'normal',
  timeRatio: 1.0,
  environment: 'eternal_twilight',
  stability: 0.99,
  accessMethods: ['death', 'ritual'],
  accessRestrictions: [
    { type: 'state', requirement: 'dead_or_sponsored' }
  ],
  ruler: undefined,  // No ruler yet
  contested: false,
  laws: [
    {
      name: 'no_return',
      effect: 'dead_cannot_leave',
      enforcement: 'automatic',
      description: 'The dead cannot leave the Underworld without divine intervention'
    }
  ],
  selfSustaining: true,
  maintenanceCost: 0,
  subRealms: []
};
```

---

## Testing Plan

### Day 7: Integration Tests

1. **Create portal** in main world
2. **Agent walks through** portal
3. **Verify realm transition** (entity moves to Underworld)
4. **Check time dilation** (if implemented)
5. **Test death transition** (dying agent goes to Underworld)
6. **Test return restrictions** (dead can't leave)
7. **Render portals** (visual feedback)

---

## Success Criteria

✅ Agent can walk through portal to Underworld
✅ Agent location tracked correctly
✅ Time flows correctly in realm
✅ Dead agents automatically go to Underworld
✅ Realm laws enforced (dead can't leave)
✅ Portal visually distinct
✅ No crashes or errors

---

## Future Enhancements (Post-MVP)

- More realms (Celestial, Faerie, Elemental)
- Realm inhabitants (angels, demons, shades)
- Complex access restrictions
- Realm-to-realm transitions
- Nested sub-realms
- Divine realm creation UI
- Realm conflict/war mechanics
