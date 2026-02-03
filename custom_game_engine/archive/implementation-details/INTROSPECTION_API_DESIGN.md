# GameIntrospectionAPI: Unified "Pit of Success" Design

## Problem Statement

Currently, game introspection is fragmented across three systems:
1. **Browser API** (`window.game`) - Direct ECS access, test API, UI controls
2. **Metrics Server** (`LiveEntityAPI`) - HTTP queries/actions, limited coverage
3. **Introspection** (`ComponentRegistry`, `MutationService`) - Schema-driven, not integrated with metrics

**Gap**: No unified class that combines all three with "pit of success" patterns like `BehaviorContext`.

## Design Goals

1. **Feature Parity**: Everything in browser should be available via API
2. **Pit of Success**: Hard to misuse, optimized by default, validated automatically
3. **Type Safety**: Full TypeScript support, no string-based component lookups
4. **Metrics Integration**: All operations tracked, cached, observable
5. **Reversibility**: Mutations support undo/redo, snapshots
6. **Consistency**: Same API in browser console, HTTP endpoints, admin dashboard

## Architecture

### Core Class: `GameIntrospectionAPI`

```typescript
/**
 * Unified "pit of success" API for game introspection and manipulation.
 * Combines LiveEntityAPI, ComponentRegistry, MutationService, and MetricsAPI.
 *
 * Design principles:
 * - Pre-validated: Type-checked, range-checked, permission-checked
 * - Auto-tracked: All operations emit metrics events
 * - Cached: Query results cached with scheduler-aware invalidation
 * - Reversible: Mutations support undo/redo with snapshots
 * - Observable: Subscribe to entity/component changes
 */
export class GameIntrospectionAPI {
  private world: World;
  private registry: ComponentRegistry;
  private mutations: MutationService;
  private metrics: MetricsAPI;
  private liveAPI: LiveEntityAPI;
  private cache: IntrospectionCache;

  // ===== Entity Queries (Optimized, Cached) =====

  /**
   * Get entity with schema-validated components.
   * Returns strongly-typed object with component metadata.
   *
   * @example
   * const agent = await api.getEntity('uuid', { components: ['agent', 'needs'] });
   * // Returns: { id, components: { agent: {...}, needs: {...} }, schemas: {...} }
   */
  async getEntity(
    entityId: string,
    options?: {
      components?: ComponentType[];  // Filter to specific components
      visibility?: 'full' | 'llm' | 'player';  // Schema visibility level
      includeMetadata?: boolean;  // Include schema metadata
    }
  ): Promise<EntityIntrospectionResult>;

  /**
   * Query entities with filters and pagination.
   * Uses SimulationScheduler to optimize for active entities.
   *
   * @example
   * const agents = await api.queryEntities({
   *   componentFilters: ['agent', 'conscious'],
   *   bounds: { x: 0, y: 0, width: 100, height: 100 },
   *   limit: 50
   * });
   */
  async queryEntities(query: EntityQuery): Promise<EntityIntrospectionResult[]>;

  // ===== Component Introspection =====

  /**
   * Get component schema with metadata.
   *
   * @example
   * const schema = api.getComponentSchema('agent');
   * // Returns: { type, fields, visibility, mutability, category }
   */
  getComponentSchema(type: ComponentType): ComponentSchema;

  /**
   * List all registered schemas with filtering.
   *
   * @example
   * const cognitiveSchemas = api.listSchemas({ category: 'cognitive' });
   */
  listSchemas(options?: {
    category?: ComponentCategory;
    mutable?: boolean;
  }): ComponentSchema[];

  // ===== Safe Mutations (Validated, Tracked, Reversible) =====

  /**
   * Mutate component field with validation, tracking, and undo support.
   *
   * @example
   * const result = await api.mutateField({
   *   entityId: 'uuid',
   *   componentType: 'needs',
   *   field: 'hunger',
   *   value: 0.5,
   *   reason: 'Admin action: feed agent'
   * });
   * // Automatically: validates range, tracks in metrics, adds to undo stack
   */
  async mutateField(mutation: SafeMutationRequest): Promise<MutationResult>;

  /**
   * Batch mutations with atomic rollback on failure.
   *
   * @example
   * const result = await api.mutateBatch([
   *   { entityId: 'uuid1', componentType: 'needs', field: 'hunger', value: 0.5 },
   *   { entityId: 'uuid2', componentType: 'needs', field: 'energy', value: 0.8 }
   * ]);
   * // If any fail, all rollback automatically
   */
  async mutateBatch(mutations: SafeMutationRequest[]): Promise<BatchMutationResult>;

  /**
   * Undo last N mutations.
   */
  async undo(count?: number): Promise<UndoResult>;

  /**
   * Redo last N undone mutations.
   */
  async redo(count?: number): Promise<RedoResult>;

  // ===== Building Management =====

  /**
   * Place building with validation and conflict detection.
   *
   * @example
   * const result = await api.placeBuilding({
   *   blueprintId: 'small_house',
   *   position: { x: 10, y: 20 },
   *   owner: 'agent-uuid',
   *   checkCollisions: true
   * });
   */
  async placeBuilding(request: PlaceBuildingRequest): Promise<PlaceBuildingResult>;

  /**
   * List buildings with filters.
   */
  async listBuildings(options?: {
    owner?: string;
    bounds?: Bounds;
    category?: string;
  }): Promise<BuildingInfo[]>;

  /**
   * Get building blueprints.
   */
  listBlueprints(options?: {
    category?: string;
  }): BlueprintInfo[];

  // ===== Skills & Progression =====

  /**
   * Grant skill XP with level-up handling.
   *
   * @example
   * await api.grantSkillXP('agent-uuid', 'farming', 100);  // 100 XP = 1 level
   */
  async grantSkillXP(
    entityId: string,
    skill: string,
    amount: number
  ): Promise<SkillProgressionResult>;

  /**
   * Get all skills for entity.
   */
  async getSkills(entityId: string): Promise<Record<string, number>>;

  // ===== Behavioral Control =====

  /**
   * Trigger behavior with validation.
   *
   * @example
   * await api.triggerBehavior({
   *   entityId: 'agent-uuid',
   *   behavior: 'hunt',
   *   params: { targetId: 'deer-uuid' }
   * });
   */
  async triggerBehavior(request: TriggerBehaviorRequest): Promise<BehaviorResult>;

  // ===== Observability & Metrics =====

  /**
   * Subscribe to entity changes with filters.
   *
   * @example
   * const unsubscribe = api.watchEntity('agent-uuid', {
   *   components: ['needs', 'position'],
   *   onChange: (changes) => console.log('Changed:', changes)
   * });
   */
  watchEntity(
    entityId: string,
    options: WatchOptions
  ): UnsubscribeFunction;

  /**
   * Get mutation history for entity/component.
   */
  async getMutationHistory(options: {
    entityId?: string;
    componentType?: ComponentType;
    limit?: number;
  }): Promise<MutationHistoryEntry[]>;

  /**
   * Get render cache statistics.
   */
  getCacheStats(): CacheStats;

  // ===== Snapshots & Time Travel =====

  /**
   * Create snapshot of entity state for rollback.
   */
  async createSnapshot(
    entityIds: string[],
    metadata?: Record<string, any>
  ): Promise<SnapshotId>;

  /**
   * Restore entities from snapshot.
   */
  async restoreSnapshot(snapshotId: SnapshotId): Promise<RestoreResult>;

  // ===== Economic & Environmental =====

  /**
   * Get resource prices and trade history.
   */
  async getEconomicMetrics(options?: {
    resources?: string[];
    timeRange?: TimeRange;
  }): Promise<EconomicMetrics>;

  /**
   * Get weather and environmental state.
   */
  async getEnvironmentalState(bounds?: Bounds): Promise<EnvironmentalState>;
}
```

## Type Definitions

```typescript
export interface EntityIntrospectionResult {
  id: string;
  components: Record<ComponentType, any>;
  schemas: Record<ComponentType, ComponentSchema>;
  metadata: {
    simulationMode: SimulationMode;  // ALWAYS, PROXIMITY, PASSIVE
    lastUpdate: number;  // tick
    cacheHit: boolean;
  };
}

export interface SafeMutationRequest {
  entityId: string;
  componentType: ComponentType;
  field: string;
  value: any;
  reason?: string;  // For audit trail
  validate?: boolean;  // Default true
}

export interface MutationResult {
  success: boolean;
  oldValue: any;
  newValue: any;
  validationErrors?: string[];
  undoId?: string;  // For undo()
  metrics: {
    latency: number;
    cacheInvalidations: number;
  };
}

export interface WatchOptions {
  components?: ComponentType[];
  fields?: string[];
  onChange: (changes: EntityChangeEvent) => void;
  throttle?: number;  // ms
}

export interface EntityChangeEvent {
  entityId: string;
  tick: number;
  changes: Array<{
    componentType: ComponentType;
    field: string;
    oldValue: any;
    newValue: any;
  }>;
}
```

## Implementation Strategy

### Phase 1: Core API (2-3 hours)
1. Create `GameIntrospectionAPI` class in `packages/introspection/src/`
2. Wire up existing services (ComponentRegistry, MutationService, LiveEntityAPI)
3. Implement entity queries with caching
4. Add mutation methods with validation

### Phase 2: Missing Features (3-4 hours)
1. Add building management methods (use existing BuildingRegistry)
2. Add skills/progression methods
3. Add economic/environmental queries
4. Add snapshot/restore functionality

### Phase 3: Metrics Integration (2 hours)
1. Emit metrics events on mutations
2. Track cache hit rates
3. Add mutation history tracking
4. Export cache stats

### Phase 4: Observability (2 hours)
1. Implement `watchEntity()` with EventEmitter
2. Add mutation history queries
3. Add cache statistics

### Phase 5: Admin Capability (1 hour)
1. Create `introspection.ts` capability
2. Register queries/actions that delegate to GameIntrospectionAPI
3. Add to admin dashboard

### Phase 6: Browser Integration (1 hour)
1. Export via `window.game.introspection`
2. Update DEBUG_API.md with new methods
3. Deprecate direct `game.world.query()` in docs

## Usage Examples

### Admin Dashboard Query
```bash
# Get agent with schema metadata
curl "http://localhost:8766/admin/queries/introspection-get-entity?id=uuid&visibility=full"

# List all mutable components
curl "http://localhost:8766/admin/queries/introspection-list-schemas?mutable=true"

# Mutate agent hunger
curl -X POST "http://localhost:8766/admin/actions/introspection-mutate-field" \
  -H "Content-Type: application/json" \
  -d '{"entityId":"uuid","componentType":"needs","field":"hunger","value":0.5}'
```

### Browser Console
```javascript
// Same API as HTTP
const agent = await game.introspection.getEntity('uuid', { visibility: 'full' });
await game.introspection.mutateField({
  entityId: 'uuid',
  componentType: 'needs',
  field: 'hunger',
  value: 0.5
});

// Watch for changes
game.introspection.watchEntity('uuid', {
  components: ['needs', 'position'],
  onChange: (changes) => console.log('Changed:', changes)
});
```

### TypeScript Client
```typescript
import { GameIntrospectionAPI } from '@ai-village/introspection';

const api = new GameIntrospectionAPI(world);

// Type-safe queries
const agents = await api.queryEntities({
  componentFilters: [ComponentType.Agent, ComponentType.Conscious],
  bounds: { x: 0, y: 0, width: 100, height: 100 }
});

// Type-safe mutations with validation
await api.mutateField({
  entityId: agent.id,
  componentType: ComponentType.Needs,
  field: 'hunger',
  value: 0.5  // Auto-validated: must be 0-1
});
```

## Benefits of This Design

### 1. Pit of Success
- **Can't forget validation**: `mutateField()` always validates
- **Can't skip caching**: `getEntity()` always uses cache
- **Can't miss tracking**: All operations emit metrics events
- **Can't break undo**: Mutations automatically add to undo stack

### 2. Feature Parity
- Browser and API use same class
- No more "browser-only" features
- Consistent behavior across all clients

### 3. Type Safety
- ComponentType enum (not strings)
- Strong typing for all methods
- IDE autocomplete for fields/values

### 4. Observability
- All mutations tracked in metrics
- Watch specific entities for changes
- Audit trail for debugging

### 5. Performance
- Scheduler-aware caching (85-99% hit rate)
- Batch mutations minimize ECS queries
- Query result caching with smart invalidation

## Comparison to BehaviorContext

| Feature | BehaviorContext | GameIntrospectionAPI |
|---------|----------------|---------------------|
| **Purpose** | Agent runtime behavior | External introspection |
| **Pre-fetching** | Yes (components) | Yes (entities) |
| **Validation** | Type + range | Type + range + mutability |
| **Caching** | No (runtime) | Yes (scheduler-aware) |
| **Undo/Redo** | No | Yes |
| **Metrics** | No | Yes (all operations) |
| **Observability** | No | Yes (watch entities) |
| **Spatial Queries** | Chunk-based | Chunk-based (inherited) |
| **Type Safety** | ComponentType enum | ComponentType enum |

Both follow "pit of success" but for different contexts:
- **BehaviorContext**: Runtime performance for agent AI
- **GameIntrospectionAPI**: Safe, observable, reversible external access

## Next Steps

1. **Review Design**: Get feedback on API surface, type definitions
2. **Prototype Core**: Implement Phase 1 (entity queries, mutations)
3. **Test Integration**: Wire up to metrics server, test in browser
4. **Add Missing Features**: Implement Phases 2-4 (buildings, skills, etc.)
5. **Documentation**: Update CLAUDE.md, DEBUG_API.md with new patterns
6. **Deprecation Plan**: Guide users from `game.world.query()` to `game.introspection`

## Open Questions

1. **Naming**: `GameIntrospectionAPI` vs `GameAPI` vs `UnifiedGameAPI`?
2. **Singleton vs Instance**: Singleton like BehaviorContext, or instance per world?
3. **Permission Model**: Should mutations check permissions (dev vs player)?
4. **Rate Limiting**: Should API have built-in rate limiting for HTTP endpoints?
5. **Async vs Sync**: Keep all async for consistency, or make queries sync when cached?
