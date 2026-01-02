# Passage System - Cross-Universe Portals and Time

> *"The path between universes is not a door, but a wound in reality." - Unknown*

**Created:** 2025-12-29
**Status:** Design
**Version:** 1.0.0

---

## Overview

This document specifies the **Passage System** - the mechanism for crossing between universes in the multiverse. It integrates with:

- **Persistence** - How passages are saved/loaded
- **Time System** - How time flows through passages
- **Entity Travel** - How entities cross universes
- **Item Compatibility** - What can/cannot cross

---

## Part 1: Passage Types

### Passage Hierarchy

```
Passage Types (by strength):

Thread      - Fragile, low cost, decays fast
  ↓
Bridge      - Moderate, medium cost, stable
  ↓
Gate        - Strong, high cost, long-lasting
  ↓
Confluence  - Permanent, universe-merging
```

### Thread Passage

**Weakest passage type - a thin connection between universes.**

```typescript
interface ThreadPassage extends BasePassage {
  type: 'thread';

  /** Creation cost in multiverse attention/belief */
  creationCost: number;           // 5% of cold crossing

  /** Cost to traverse once established */
  traversalCost: number;          // 20% of cold crossing

  /** How many entities can use before breaking */
  uses: number;                   // 1-10 uses total

  /** Decay rate per multiverse tick */
  decayRate: number;              // 0.01 = 1% per tick

  /** Current health (0-1, breaks at 0) */
  health: number;

  /** When passage was created */
  createdAt: bigint;              // Multiverse tick

  /** Last maintenance */
  lastMaintenance?: bigint;

  /** Maintenance cost (1% of creation) */
  maintenanceCost: number;
}

// Example
const threadExample: ThreadPassage = {
  id: 'passage:thread:001',
  type: 'thread',
  from: { universeId: 'universe:a', position: { x: 100, y: 200 } },
  to: { universeId: 'universe:b', position: { x: 50, y: 75 } },
  creationCost: 5000,
  traversalCost: 2000,
  uses: 5,
  decayRate: 0.01,
  health: 0.8,
  createdAt: 1000000n,
  owners: ['entity:deity:001'],
  accessPolicy: 'private',
};
```

### Bridge Passage

**Moderate passage - reliable for repeated use.**

```typescript
interface BridgePassage extends BasePassage {
  type: 'bridge';

  creationCost: number;           // 20% of cold crossing
  traversalCost: number;          // 5% of cold crossing

  /** Max concurrent travelers */
  capacity: number;               // 1-10

  /** Current travelers */
  currentTraffic: number;

  /** Decay rate (slower than thread) */
  decayRate: number;              // 0.001 = 0.1% per tick

  health: number;
  createdAt: bigint;
  lastMaintenance?: bigint;
  maintenanceCost: number;        // 2% of creation cost

  /** Traffic history for analytics */
  trafficLog: TrafficRecord[];
}

interface TrafficRecord {
  multiverseTick: bigint;
  entityId: string;
  direction: 'forward' | 'reverse';
  costPaid: number;
}
```

### Gate Passage

**Strong passage - designed for high traffic.**

```typescript
interface GatePassage extends BasePassage {
  type: 'gate';

  creationCost: number;           // 50% of cold crossing
  traversalCost: number;          // 1% of cold crossing

  /** Unlimited capacity (can handle armies) */
  capacity: 'unlimited';

  /** Very slow decay */
  decayRate: number;              // 0.0001 = 0.01% per tick

  health: number;
  createdAt: bigint;
  lastMaintenance?: bigint;
  maintenanceCost: number;        // 5% of creation cost

  /** Guarded? */
  guards: EntityGuard[];

  /** Tolls */
  toll?: PassageToll;

  /** Is bidirectional? */
  bidirectional: boolean;
}

interface EntityGuard {
  entityId: string;
  position: 'source' | 'destination' | 'both';
  permissions: GuardPermissions;
}

interface GuardPermissions {
  canDenyEntry: boolean;
  canDemandToll: boolean;
  canInspectItems: boolean;
}

interface PassageToll {
  type: 'belief' | 'items' | 'permission';
  amount?: number;
  items?: ItemStack[];
}
```

### Confluence Passage

**Permanent passage - partial universe merger.**

```typescript
interface ConfluencePassage extends BasePassage {
  type: 'confluence';

  creationCost: number;           // 100% of cold crossing (split between universes)
  traversalCost: number;          // 0.1% of cold crossing (nearly free)

  /** No decay - permanent unless deliberately severed */
  decayRate: 0;

  health: 1.0;                    // Always perfect health
  createdAt: bigint;

  /** Requires consent from both universes */
  mutualConsent: {
    universeA: boolean;
    universeB: boolean;
  };

  /** Area of effect - how large is the merged zone */
  mergeRadius: number;            // Tiles

  /** Physical laws blend in merged zone */
  blendedLaws: BlendedPhysics;

  /** Can never be destroyed, only sealed */
  sealed: boolean;
}

interface BlendedPhysics {
  /** Time flows at average of both universes */
  timeScaleBlend: number;

  /** Magic availability is union of both */
  magicSourcesAvailable: string[];

  /** Physics constants are weighted average */
  gravityBlend: number;
  temperatureBlend: number;
}
```

---

## Part 2: Passage Creation

### Creation Process

```typescript
class PassageCreationService {
  /**
   * Create a new passage between universes.
   * Expensive operation - validates compatibility and pays costs.
   */
  async createPassage(
    config: PassageCreationConfig
  ): Promise<PassageCreationResult> {
    // 1. Validate universes exist
    const sourceUniverse = this.multiverse.getUniverse(config.sourceUniverseId);
    const targetUniverse = this.multiverse.getUniverse(config.targetUniverseId);

    if (!sourceUniverse || !targetUniverse) {
      throw new Error('Universe not found');
    }

    // 2. Check compatibility
    const compatibility = calculateCompatibility(
      sourceUniverse.config,
      targetUniverse.config
    );

    if (compatibility.score > 5.0) {
      throw new Error(
        `Universes too incompatible: ${compatibility.reason}. ` +
        `Score: ${compatibility.score} (max 5.0)`
      );
    }

    // 3. Calculate costs
    const baseCost = calculateBaseCrossingCost(
      config.creatorType,
      compatibility.score
    );

    const passageCost = calculatePassageCost(config.type, baseCost);

    // 4. Check creator has resources
    const creator = sourceUniverse.world.getEntity(config.creatorId);
    if (!this.hasEnoughResources(creator, passageCost)) {
      throw new Error(`Insufficient resources to create ${config.type} passage`);
    }

    // 5. Deduct costs
    this.deductResources(creator, passageCost);

    // 6. Create passage
    const passage = this.instantiatePassage(config, baseCost, compatibility);

    // 7. Register in multiverse
    this.multiverse.registerPassage(passage);

    // 8. Emit events
    sourceUniverse.world.eventBus.emit({
      type: 'passage:created',
      source: config.creatorId,
      data: { passageId: passage.id, targetUniverse: config.targetUniverseId },
    });

    return {
      success: true,
      passage,
      costPaid: passageCost,
    };
  }

  private instantiatePassage(
    config: PassageCreationConfig,
    baseCost: number,
    compatibility: CompatibilityResult
  ): Passage {
    switch (config.type) {
      case 'thread':
        return {
          id: crypto.randomUUID(),
          type: 'thread',
          from: {
            universeId: config.sourceUniverseId,
            position: config.sourcePosition,
          },
          to: {
            universeId: config.targetUniverseId,
            position: config.targetPosition,
          },
          creationCost: Math.floor(baseCost * 0.05),
          traversalCost: Math.floor(baseCost * 0.2),
          uses: 5,
          decayRate: 0.01 * compatibility.score,
          health: 1.0,
          createdAt: this.multiverse.time.absoluteTick,
          owners: [config.creatorId],
          accessPolicy: config.accessPolicy ?? 'private',
        };

      case 'bridge':
        return {
          id: crypto.randomUUID(),
          type: 'bridge',
          from: {
            universeId: config.sourceUniverseId,
            position: config.sourcePosition,
          },
          to: {
            universeId: config.targetUniverseId,
            position: config.targetPosition,
          },
          creationCost: Math.floor(baseCost * 0.2),
          traversalCost: Math.floor(baseCost * 0.05),
          capacity: config.capacity ?? 5,
          currentTraffic: 0,
          decayRate: 0.001 * compatibility.score,
          health: 1.0,
          createdAt: this.multiverse.time.absoluteTick,
          lastMaintenance: this.multiverse.time.absoluteTick,
          maintenanceCost: Math.floor(baseCost * 0.02 * 0.2),
          trafficLog: [],
          owners: [config.creatorId],
          accessPolicy: config.accessPolicy ?? 'private',
        };

      // ... other types
    }
  }
}
```

### Compatibility Calculation

```typescript
interface CompatibilityResult {
  score: number;          // 0.0 (perfect) to 5.0 (incompatible)
  reason: string;
  factors: CompatibilityFactor[];
}

interface CompatibilityFactor {
  name: string;
  weight: number;
  value: number;         // 0.0 to 1.0
  contribution: number;  // weight * value
}

function calculateCompatibility(
  universeA: UniverseDivineConfig,
  universeB: UniverseDivineConfig
): CompatibilityResult {
  const factors: CompatibilityFactor[] = [];

  // Magic paradigm compatibility
  const magicDiff = Math.abs(
    (universeA.coreParams?.divinePresence ?? 0.5) -
    (universeB.coreParams?.divinePresence ?? 0.5)
  );
  factors.push({
    name: 'Divine Presence Alignment',
    weight: 1.0,
    value: magicDiff,
    contribution: magicDiff * 1.0,
  });

  // Time scale compatibility
  const timeScaleDiff = Math.abs(
    (universeA.coreParams?.divineTimeScale ?? 1.0) -
    (universeB.coreParams?.divineTimeScale ?? 1.0)
  );
  // Normalize time scale difference to [0, 1] using sigmoid for smooth scaling
  // Small differences (< 5) scale linearly, large differences (> 10) asymptotically approach 1.0
  const timeScaleNormalized = timeScaleDiff < 10
    ? timeScaleDiff / 10
    : 1.0 / (1.0 + Math.exp(-(timeScaleDiff - 10)));
  factors.push({
    name: 'Time Scale Difference',
    weight: 0.5,
    value: timeScaleNormalized,
    contribution: timeScaleNormalized * 0.5,
  });

  // Belief economy compatibility
  const beliefDiff = Math.abs(
    (universeA.beliefEconomy?.generationMultiplier ?? 1.0) -
    (universeB.beliefEconomy?.generationMultiplier ?? 1.0)
  );
  // Normalize belief difference to [0, 1] - differences > 1.0 indicate major incompatibility
  // Use sigmoid for smooth transition: small differences linear, large differences saturate
  const beliefNormalized = beliefDiff < 1.0
    ? beliefDiff
    : 1.0 / (1.0 + Math.exp(-(beliefDiff - 1.0)));
  factors.push({
    name: 'Belief Economy Alignment',
    weight: 0.3,
    value: beliefNormalized,
    contribution: beliefNormalized * 0.3,
  });

  // Total score
  const score = factors.reduce((sum, f) => sum + f.contribution, 0);

  // Determine reason
  const dominant = factors.reduce((max, f) =>
    f.contribution > max.contribution ? f : max
  );

  return {
    score,
    reason: score > 3.0
      ? `Major incompatibility in ${dominant.name}`
      : score > 1.0
      ? `Moderate differences in ${dominant.name}`
      : 'Universes are compatible',
    factors,
  };
}
```

---

## Part 3: Entity Travel Through Passages

### Traversal Process

```typescript
class PassageTraversalService {
  /**
   * Move an entity through a passage to another universe.
   */
  async traverse(
    entityId: string,
    passageId: string
  ): Promise<TraversalResult> {
    const passage = this.multiverse.getPassage(passageId);
    if (!passage) {
      throw new Error(`Passage ${passageId} not found`);
    }

    const sourceUniverse = this.multiverse.getUniverse(passage.from.universeId);
    const targetUniverse = this.multiverse.getUniverse(passage.to.universeId);

    if (!sourceUniverse || !targetUniverse) {
      throw new Error('Universe not found');
    }

    const entity = sourceUniverse.world.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    // 1. Check passage health
    if (passage.health <= 0) {
      throw new Error('Passage has collapsed');
    }

    // 2. Check capacity (for bridge/gate)
    if ('currentTraffic' in passage && 'capacity' in passage) {
      if (passage.currentTraffic >= passage.capacity) {
        throw new Error('Passage at capacity');
      }
    }

    // 3. Check access permissions
    if (!this.hasAccess(entity, passage)) {
      throw new Error('Access denied to passage');
    }

    // 4. Calculate traversal cost
    const cost = this.calculateTraversalCost(entity, passage);

    // 5. Pay cost
    if (!this.payTraversalCost(entity, cost)) {
      throw new Error('Insufficient resources to traverse');
    }

    // 6. Check item compatibility
    const incompatibleItems = this.checkItemCompatibility(
      entity,
      sourceUniverse.config,
      targetUniverse.config
    );

    if (incompatibleItems.length > 0) {
      // Offer to leave items behind
      return {
        success: false,
        reason: 'incompatible_items',
        incompatibleItems,
      };
    }

    // 7. TRANSIT: Remove from source universe
    const serialized = serializeEntity(entity);
    sourceUniverse.world.removeEntity(entityId);

    // 8. TRANSFORM: Adjust entity for target universe
    const transformed = this.transformEntity(
      serialized,
      sourceUniverse.config,
      targetUniverse.config
    );

    // 9. ARRIVAL: Add to target universe
    const newEntity = deserializeEntity(transformed);
    targetUniverse.world.addEntity(newEntity);

    // Set position at passage exit
    if (passage.to.position) {
      newEntity.updateComponent('position', () => passage.to.position!);
    }

    // 10. Update passage state
    this.updatePassageAfterTraversal(passage);

    // 11. Emit events
    sourceUniverse.world.eventBus.emit({
      type: 'entity:departed',
      source: entityId,
      data: { passageId, targetUniverse: targetUniverse.id },
    });

    targetUniverse.world.eventBus.emit({
      type: 'entity:arrived',
      source: newEntity.id,
      data: { passageId, sourceUniverse: sourceUniverse.id },
    });

    return {
      success: true,
      newEntityId: newEntity.id,
      costPaid: cost,
      transformations: transformed.transformations,
    };
  }

  /**
   * Transform entity when crossing universes.
   */
  private transformEntity(
    entity: SerializedEntity,
    sourceConfig: UniverseDivineConfig,
    targetConfig: UniverseDivineConfig
  ): TransformedEntity {
    const transformations: string[] = [];

    // 1. Adjust divine powers based on target universe
    if (entity.components.some(c => c.type === 'deity')) {
      const newPowerCost =
        targetConfig.powers?.globalCostMultiplier ?? 1.0;
      transformations.push(
        `Divine power costs adjusted by ${newPowerCost}x`
      );
    }

    // 2. Adjust belief generation
    if (entity.components.some(c => c.type === 'belief')) {
      const newBeliefRate =
        targetConfig.beliefEconomy?.generationMultiplier ?? 1.0;
      transformations.push(
        `Belief generation rate adjusted to ${newBeliefRate}x`
      );
    }

    // 3. Mark as foreign entity
    entity.components.push({
      type: 'foreign_entity',
      $schema: 'https://aivillage.dev/schemas/component/v1',
      $version: 1,
      data: {
        originUniverseId: sourceConfig.universeId,
        originUniverseName: sourceConfig.name,
        arrivedAt: Date.now(),
      },
    });
    transformations.push('Marked as foreign entity');

    return {
      entity,
      transformations,
    };
  }
}
```

### Item Compatibility

```typescript
function checkItemCompatibility(
  entity: Entity,
  sourceConfig: UniverseDivineConfig,
  targetConfig: UniverseDivineConfig
): IncompatibleItem[] {
  const incompatible: IncompatibleItem[] = [];

  const inventory = entity.getComponent('inventory');
  if (!inventory) return incompatible;

  for (const slot of inventory.slots) {
    const item = getItemDefinition(slot.itemId);

    // Check if item tags are allowed in target universe
    const disallowedTags = item.tags.filter(tag =>
      targetConfig.rules?.bannedItemTags?.includes(tag)
    );

    if (disallowedTags.length > 0) {
      incompatible.push({
        itemId: slot.itemId,
        itemName: item.name,
        reason: `Contains banned tags: ${disallowedTags.join(', ')}`,
        tags: disallowedTags,
      });
    }

    // Check magic compatibility
    if (item.tags.includes('magical') && !targetConfig.rules?.magicEnabled) {
      incompatible.push({
        itemId: slot.itemId,
        itemName: item.name,
        reason: 'Magic not allowed in target universe',
        tags: ['magical'],
      });
    }

    // Check tech level
    if (item.tags.includes('electronic') &&
        targetConfig.rules?.techLevel === 'primitive') {
      incompatible.push({
        itemId: slot.itemId,
        itemName: item.name,
        reason: 'Technology level too advanced for target universe',
        tags: ['electronic'],
      });
    }
  }

  return incompatible;
}
```

---

## Part 4: Passage Persistence

### Serialization

```typescript
interface SerializedPassage extends Versioned {
  $schema: "https://aivillage.dev/schemas/passage/v1";
  $version: 1;

  id: string;
  type: PassageType;

  from: {
    universeId: string;
    position?: Position;
  };

  to: {
    universeId: string;
    position?: Position;
  };

  // Type-specific data
  data: ThreadPassageData | BridgePassageData | GatePassageData | ConfluencePassageData;

  // Ownership
  owners: string[];
  accessPolicy: 'private' | 'shared' | 'public';

  // Integrity
  checksum: string;
}

type ThreadPassageData = {
  creationCost: number;
  traversalCost: number;
  uses: number;
  decayRate: number;
  health: number;
  createdAt: string;  // Serialized bigint
  lastMaintenance?: string;
  maintenanceCost: number;
};

// ... other passage data types
```

### Passage Serializer

```typescript
const PassageSerializer: ComponentSerializer<Passage> = {
  serialize(passage: Passage): SerializedPassage {
    let data: any;

    switch (passage.type) {
      case 'thread':
        data = {
          creationCost: passage.creationCost,
          traversalCost: passage.traversalCost,
          uses: passage.uses,
          decayRate: passage.decayRate,
          health: passage.health,
          createdAt: passage.createdAt.toString(),
          lastMaintenance: passage.lastMaintenance?.toString(),
          maintenanceCost: passage.maintenanceCost,
        };
        break;

      // ... other types
    }

    const serialized: SerializedPassage = {
      $schema: "https://aivillage.dev/schemas/passage/v1",
      $version: 1,
      id: passage.id,
      type: passage.type,
      from: passage.from,
      to: passage.to,
      data,
      owners: passage.owners,
      accessPolicy: passage.accessPolicy,
      checksum: '', // Computed below
    };

    // Compute checksum
    serialized.checksum = computeChecksum(serialized);

    return serialized;
  },

  deserialize(data: SerializedPassage): Passage {
    // Verify checksum
    const expectedChecksum = computeChecksum({ ...data, checksum: '' });
    if (data.checksum !== expectedChecksum) {
      throw new Error(
        `Passage checksum mismatch. ` +
        `Expected ${expectedChecksum}, got ${data.checksum}. ` +
        `Save file may be corrupted.`
      );
    }

    // Reconstruct passage based on type
    switch (data.type) {
      case 'thread':
        const threadData = data.data as ThreadPassageData;
        return {
          id: data.id,
          type: 'thread',
          from: data.from,
          to: data.to,
          creationCost: threadData.creationCost,
          traversalCost: threadData.traversalCost,
          uses: threadData.uses,
          decayRate: threadData.decayRate,
          health: threadData.health,
          createdAt: BigInt(threadData.createdAt),
          lastMaintenance: threadData.lastMaintenance
            ? BigInt(threadData.lastMaintenance)
            : undefined,
          maintenanceCost: threadData.maintenanceCost,
          owners: data.owners,
          accessPolicy: data.accessPolicy,
        };

      // ... other types
    }
  },

  migrate(from: number, data: unknown): unknown {
    // No migrations yet (v1 is first version)
    return data;
  },

  validate(data: unknown): boolean {
    // Runtime validation
    if (typeof data !== 'object' || data === null) return false;
    const passage = data as any;

    if (typeof passage.id !== 'string') {
      throw new Error('passage.id must be string');
    }

    if (!['thread', 'bridge', 'gate', 'confluence'].includes(passage.type)) {
      throw new Error(`Invalid passage type: ${passage.type}`);
    }

    // ... more validation

    return true;
  },
};
```

---

## Part 5: Passage Maintenance

### Decay System

```typescript
class PassageMaintenanceSystem {
  update(multiverse: MultiverseCoordinator, deltaTime: number): void {
    const passages = multiverse.getAllPassages();

    for (const passage of passages) {
      // Skip confluences (no decay)
      if (passage.type === 'confluence') continue;

      // Apply decay
      const decayAmount = passage.decayRate * deltaTime;
      const newHealth = passage.health - decayAmount;

      // Explicit floor at 0 (health cannot be negative)
      if (newHealth < 0) {
        passage.health = 0;  // Passage has collapsed
      } else {
        passage.health = newHealth;
      }

      // Check if collapsed
      if (passage.health <= 0) {
        this.collapsePassage(passage, multiverse);
        continue;
      }

      // Check if maintenance needed
      if ('lastMaintenance' in passage) {
        const ticksSinceMaintenance =
          multiverse.time.absoluteTick - (passage.lastMaintenance ?? 0n);

        const maintenanceInterval = this.getMaintenanceInterval(passage.type);

        if (ticksSinceMaintenance > maintenanceInterval) {
          this.flagForMaintenance(passage);
        }
      }
    }
  }

  private collapsePassage(
    passage: Passage,
    multiverse: MultiverseCoordinator
  ): void {
    // Emit collapse events
    const sourceUniverse = multiverse.getUniverse(passage.from.universeId);
    const targetUniverse = multiverse.getUniverse(passage.to.universeId);

    sourceUniverse?.world.eventBus.emit({
      type: 'passage:collapsed',
      source: passage.id,
      data: { passageId: passage.id, targetUniverse: passage.to.universeId },
    });

    targetUniverse?.world.eventBus.emit({
      type: 'passage:collapsed',
      source: passage.id,
      data: { passageId: passage.id, sourceUniverse: passage.from.universeId },
    });

    // Remove passage
    multiverse.removePassage(passage.id);
  }

  private getMaintenanceInterval(type: PassageType): bigint {
    switch (type) {
      case 'thread': return 60n * 60n * 24n * 365n;  // Yearly
      case 'bridge': return 60n * 60n * 24n * 365n * 10n;  // Decade
      case 'gate': return 60n * 60n * 24n * 365n * 100n;  // Century
      default: return 0n;
    }
  }
}
```

---

## Summary

The Passage System provides:

1. ✅ **Four passage types** with different costs/durability
2. ✅ **Compatibility checking** to prevent impossible crossings
3. ✅ **Entity transformation** when crossing universes
4. ✅ **Item filtering** based on universe rules
5. ✅ **Decay and maintenance** for realistic passage lifecycle
6. ✅ **Full persistence** with checksums and migrations

**Integration Points:**
- **Persistence**: Passages saved in SaveFile format
- **Time**: Decay based on multiverse time
- **Universe**: Config determines compatibility
- **Events**: Emit creation/collapse/traversal events

**Next:** See `PERSISTENCE_MULTIVERSE_SPEC.md` for overall architecture.
