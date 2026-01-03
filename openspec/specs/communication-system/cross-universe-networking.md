> **System:** communication-system
> **Version:** 1.0
> **Status:** Draft
> **Last Updated:** 2026-01-02

# Networked Multiverse - Peer-to-Peer Universe Collaboration

> *"Two universes, connected by a thread of light. What one god creates, another can witness."*

**Created:** 2026-01-02
**Status:** Design
**Version:** 1.0.0

---

## Overview

This specification extends the existing multiverse system to support **networked multiplayer** - allowing multiple game instances to connect, share universes, and collaborate in real-time.

### Core Capabilities

1. **Peer-to-Peer Connection** - Game clients connect directly to each other
2. **Remote Passages** - Portals that connect universes across the network
3. **Live Universe Viewing** - See what's happening in remote universes in real-time
4. **Entity Transfer** - Move entities between networses on different machines
5. **Interactive Modes** - Observe, participate, or fully collaborate
6. **God Chat Room** - Networked communication between creators
7. **Universe Sharing** - Share entire universe snapshots

### Integration Points

**Builds On:**
- `PERSISTENCE_MULTIVERSE_SPEC.md` - Universe serialization and multiverse coordination
- `PASSAGE_SYSTEM.md` - Passage mechanics and entity travel
- `IMAJICA_DIMENSIONAL_DESIGN.md` - God progression and chat room
- Existing `MetricsStreamClient` - WebSocket infrastructure
- Existing `MultiverseCoordinator` - Local multiverse management

---

## Part 1: Architecture Overview

### System Diagram

```
┌─────────────────────────────────────┐      ┌─────────────────────────────────────┐
│  Game Instance A (Player 1)         │      │  Game Instance B (Player 2)         │
│                                     │      │                                     │
│  ┌────────────────────────────┐    │      │  ┌────────────────────────────┐    │
│  │ Local Multiverse           │    │      │  │ Local Multiverse           │    │
│  │  ┌──────────┐ ┌──────────┐│    │      │  │ ┌──────────┐ ┌──────────┐│    │
│  │  │Universe  │ │Universe  ││    │      │  │  │Universe  │ │Universe  ││    │
│  │  │   A1     │ │   A2     ││    │      │  │  │   B1     │ │   B2     ││    │
│  │  └──────────┘ └──────────┘│    │      │  │  └──────────┘ └──────────┘│    │
│  └────────────────────────────┘    │      │  └────────────────────────────┘    │
│           │                         │      │           │                         │
│           │                         │      │           │                         │
│  ┌────────▼────────────────────┐   │      │  ┌────────▼────────────────────┐   │
│  │ MultiverseNetworkManager    │   │◄─────┼─►│ MultiverseNetworkManager    │   │
│  │  - WebSocket Server :8080   │   │ P2P  │  │  - WebSocket Client         │   │
│  │  - Universe Streams         │   │ WS   │  │  - Remote Passages          │   │
│  │  - Remote Passage Manager   │   │      │  │  - Universe Streams         │   │
│  └─────────────────────────────┘   │      │  └─────────────────────────────┘   │
│           │                         │      │           │                         │
│           │                         │      │           │                         │
│  ┌────────▼────────────────────┐   │      │  ┌────────▼────────────────────┐   │
│  │ Renderer                    │   │      │  │ Renderer                    │   │
│  │  - Local Universe View      │   │      │  │  - Local Universe View      │   │
│  │  - Remote Universe View     │   │      │  │  - Remote Universe View     │   │
│  │  - Portal Rendering         │   │      │  │  - Portal Rendering         │   │
│  └─────────────────────────────┘   │      │  └─────────────────────────────┘   │
└─────────────────────────────────────┘      └─────────────────────────────────────┘

                    ↓                                        ↓

              [God Chat Room]
       ┌─────────────────────────┐
       │  Shared Communication   │
       │  - Player A: "Watch"    │
       │  - Player B: "Amazing!" │
       └─────────────────────────┘
```

### Key Components

**1. MultiverseNetworkManager**
- Manages WebSocket connections
- Creates and maintains remote passages
- Handles entity transfers
- Coordinates state synchronization

**2. UniverseStreamServer**
- Broadcasts universe updates to subscribers
- Handles viewport filtering
- Delta compression for efficiency
- Event streaming

**3. UniverseStreamClient**
- Receives remote universe updates
- Maintains local cache of remote state
- Handles user interactions in remote view
- Reuses MetricsStreamClient pattern

**4. RemotePassage**
- Extension of base Passage type
- Links to remote peer
- Defines view mode and interaction level
- Manages connection state

**5. GodChatRoomNetwork**
- Distributed chat system
- Presence awareness
- Message synchronization
- Universe collaboration

---

## Part 2: Remote Passage System

### Remote Passage Type

Extends the passage system from `PASSAGE_SYSTEM.md`:

```typescript
interface RemotePassage extends BasePassage {
  type: 'remote';

  // Network connection
  remoteHost: string;           // "ws://192.168.1.100:8080"
  remotePeerId: string;         // UUID of remote peer
  remoteUniverseId: string;     // Universe ID on remote machine

  // Connection state
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastHeartbeat: bigint;        // Multiverse tick
  reconnectAttempts: number;

  // Live viewing configuration
  viewMode: ViewMode;
  viewportBounds?: Bounds;

  // Interaction level
  interactionMode: InteractionMode;

  // Stream settings
  streamConfig: StreamConfiguration;

  // Security
  authToken?: string;
  encryption: boolean;
  requiresAuthentication: boolean;

  // Access control (from base passage)
  owners: string[];
  accessPolicy: 'private' | 'shared' | 'public';

  // Passage costs (same as other passage types)
  creationCost: number;
  traversalCost: number;
  health: number;
  createdAt: bigint;
}

type ViewMode =
  | 'none'           // Not viewing
  | 'observe'        // Read-only view
  | 'participate';   // Can interact

type InteractionMode =
  | 'none'           // Cannot interact
  | 'limited'        // Can interact with own entities only
  | 'full'           // Can interact with any entities
  | 'collaborative'; // Shared control of all entities

interface StreamConfiguration {
  // Update frequency
  syncFrequency: number;      // Hz (1-60)

  // What to stream
  includeEntities: boolean;
  includeEvents: boolean;
  includeTerrain: boolean;

  // Filters
  entityFilter?: {
    types?: string[];         // Only these entity types
    tags?: string[];          // Only entities with these tags
    owned?: boolean;          // Only entities owned by viewer
  };

  // Optimization
  maxEntities?: number;       // Cap on streamed entities
  compressionLevel: number;   // 0-9
  deltaUpdatesOnly: boolean;  // Only send changes
}

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

### Creating a Remote Passage

```typescript
class MultiverseNetworkManager {
  private wsServer: WebSocketServer | null = null;
  private wsConnections: Map<string, WebSocket> = new Map();
  private remotePassages: Map<string, RemotePassage> = new Map();
  private universeStreams: Map<string, UniverseStreamServer> = new Map();

  /**
   * Start server to accept connections
   */
  startServer(port: number = 8080): void {
    if (this.wsServer) {
      throw new Error('Server already running');
    }

    this.wsServer = new WebSocketServer({ port });

    this.wsServer.on('connection', (ws: WebSocket, req) => {
      const peerId = crypto.randomUUID();
      this.wsConnections.set(peerId, ws);

      console.log(`[Network] Peer connected: ${peerId}`);

      ws.on('message', (data: string) => {
        this.handleMessage(peerId, JSON.parse(data));
      });

      ws.on('close', () => {
        console.log(`[Network] Peer disconnected: ${peerId}`);
        this.wsConnections.delete(peerId);
        this.cleanupPeerPassages(peerId);
      });

      ws.on('error', (error) => {
        console.error(`[Network] WebSocket error for ${peerId}:`, error);
      });
    });

    console.log(`[Network] Server listening on port ${port}`);
  }

  /**
   * Connect to a remote peer
   */
  async connectToPeer(address: string): Promise<string> {
    const ws = new WebSocket(address);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', (error) => reject(error));

      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });

    const peerId = crypto.randomUUID();
    this.wsConnections.set(peerId, ws);

    ws.on('message', (data: string) => {
      this.handleMessage(peerId, JSON.parse(data));
    });

    ws.on('close', () => {
      console.log(`[Network] Connection to ${address} closed`);
      this.wsConnections.delete(peerId);
      this.cleanupPeerPassages(peerId);
    });

    console.log(`[Network] Connected to peer: ${address}`);

    return peerId;
  }

  /**
   * Create a remote passage to peer's universe
   */
  async createRemotePassage(
    config: RemotePassageConfig
  ): Promise<RemotePassage> {
    const ws = this.wsConnections.get(config.remotePeerId);
    if (!ws) {
      throw new Error(`Not connected to peer ${config.remotePeerId}`);
    }

    // Request remote universe config for compatibility check
    const remoteConfig = await this.requestUniverseConfig(
      config.remotePeerId,
      config.remoteUniverseId
    );

    const localUniverse = multiverseCoordinator.getUniverse(
      config.localUniverseId
    );

    if (!localUniverse) {
      throw new Error(`Local universe ${config.localUniverseId} not found`);
    }

    // Use existing compatibility calculation from PASSAGE_SYSTEM.md
    const compatibility = calculateCompatibility(
      localUniverse.config,
      remoteConfig
    );

    if (compatibility.score > 5.0) {
      throw new Error(
        `Universes incompatible: ${compatibility.reason} (score: ${compatibility.score})`
      );
    }

    // Calculate costs (remote passages are expensive to maintain)
    const baseCost = calculateBaseCrossingCost('deity', compatibility.score);
    const creationCost = Math.floor(baseCost * 0.3); // 30% of cold crossing
    const traversalCost = Math.floor(baseCost * 0.1); // 10% per transfer

    // Create passage
    const passage: RemotePassage = {
      id: crypto.randomUUID(),
      type: 'remote',

      from: {
        universeId: config.localUniverseId,
        position: config.localPosition,
      },

      to: {
        universeId: config.remoteUniverseId,
        position: config.remotePosition,
      },

      remoteHost: this.getPeerAddress(config.remotePeerId),
      remotePeerId: config.remotePeerId,
      remoteUniverseId: config.remoteUniverseId,

      connectionState: 'connected',
      lastHeartbeat: multiverseCoordinator.getAbsoluteTick(),
      reconnectAttempts: 0,

      viewMode: config.viewMode ?? 'none',
      viewportBounds: config.viewportBounds,

      interactionMode: config.interactionMode ?? 'none',

      streamConfig: {
        syncFrequency: config.syncFrequency ?? 20,
        includeEntities: true,
        includeEvents: config.includeEvents ?? true,
        includeTerrain: config.includeTerrain ?? false,
        compressionLevel: 6,
        deltaUpdatesOnly: true,
      },

      encryption: true,
      requiresAuthentication: false,

      owners: [config.creatorId],
      accessPolicy: config.accessPolicy ?? 'private',

      creationCost,
      traversalCost,
      health: 1.0,
      createdAt: multiverseCoordinator.getAbsoluteTick(),
    };

    // Notify remote peer
    await this.sendPassageHandshake(passage);

    // Register locally
    this.remotePassages.set(passage.id, passage);

    // If viewing, start stream
    if (passage.viewMode !== 'none') {
      await this.startUniverseStream(passage);
    }

    console.log(
      `[Network] Remote passage created: ${passage.id} ` +
      `(${config.localUniverseId} → ${config.remoteUniverseId})`
    );

    return passage;
  }

  /**
   * Send passage handshake to remote peer
   */
  private async sendPassageHandshake(
    passage: RemotePassage
  ): Promise<void> {
    const ws = this.wsConnections.get(passage.remotePeerId);
    if (!ws) throw new Error('WebSocket not found');

    const handshake: PassageHandshakeMessage = {
      type: 'passage_handshake',
      passageId: passage.id,
      sourceUniverseId: passage.from.universeId,
      targetUniverseId: passage.to.universeId,
      viewMode: passage.viewMode,
      interactionMode: passage.interactionMode,
      streamConfig: passage.streamConfig,
    };

    ws.send(JSON.stringify(handshake));

    // Wait for acknowledgment
    await this.waitForAck(passage.remotePeerId, passage.id);
  }
}

interface RemotePassageConfig {
  localUniverseId: string;
  remoteUniverseId: string;
  remotePeerId: string;
  creatorId: string;

  localPosition?: Position;
  remotePosition?: Position;

  viewMode?: ViewMode;
  interactionMode?: InteractionMode;
  viewportBounds?: Bounds;

  syncFrequency?: number;
  includeEvents?: boolean;
  includeTerrain?: boolean;

  accessPolicy?: 'private' | 'shared' | 'public';
}
```

---

## Part 3: Live Universe Streaming

### Server-Side: Broadcasting Universe Updates

```typescript
class UniverseStreamServer {
  private universeId: string;
  private subscribers: Map<string, UniverseSubscription> = new Map();
  private lastTickState: Map<EntityId, SerializedEntity> = new Map();
  private updateInterval: NodeJS.Timer | null = null;

  constructor(universeId: string) {
    this.universeId = universeId;
  }

  /**
   * Add a subscriber
   */
  subscribe(
    peerId: string,
    passageId: string,
    config: StreamConfiguration,
    viewport?: Bounds
  ): void {
    const subscription: UniverseSubscription = {
      peerId,
      passageId,
      config,
      viewport,
      lastUpdate: Date.now(),
    };

    this.subscribers.set(peerId, subscription);

    // Start streaming if not already started
    if (!this.updateInterval) {
      this.startStreaming();
    }

    // Send initial snapshot
    this.sendInitialSnapshot(peerId);
  }

  /**
   * Remove a subscriber
   */
  unsubscribe(peerId: string): void {
    this.subscribers.delete(peerId);

    // Stop streaming if no more subscribers
    if (this.subscribers.size === 0 && this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Start periodic updates
   */
  private startStreaming(): void {
    const universe = multiverseCoordinator.getUniverse(this.universeId);
    if (!universe) {
      console.error(`[Stream] Universe ${this.universeId} not found`);
      return;
    }

    // Broadcast at 20 Hz (game tick rate)
    this.updateInterval = setInterval(() => {
      this.broadcastUpdate();
    }, 50);
  }

  /**
   * Broadcast universe state to all subscribers
   */
  private broadcastUpdate(): void {
    const universe = multiverseCoordinator.getUniverse(this.universeId);
    if (!universe) return;

    // Collect changes since last tick
    const changes = this.calculateDelta(universe);

    // Send to each subscriber
    for (const [peerId, sub] of this.subscribers) {
      // Filter by viewport and config
      const filteredChanges = this.filterChanges(changes, sub);

      if (filteredChanges.hasChanges) {
        const update: UniverseTickUpdate = {
          type: 'universe_tick',
          universeId: this.universeId,
          tick: universe.universeTick.toString(),

          entitiesAdded: filteredChanges.added,
          entitiesUpdated: filteredChanges.updated,
          entitiesRemoved: filteredChanges.removed,

          events: sub.config.includeEvents ? filteredChanges.events : [],
        };

        this.sendToSubscriber(peerId, update);
      }
    }

    // Update last tick state
    this.updateLastTickState(universe);
  }

  /**
   * Calculate delta since last tick
   */
  private calculateDelta(universe: UniverseInstance): DeltaChanges {
    const changes: DeltaChanges = {
      added: [],
      updated: [],
      removed: [],
      events: [],
      hasChanges: false,
    };

    const currentEntities = new Map<EntityId, Entity>();

    // Get all entities
    for (const entity of universe.world.entities.values()) {
      currentEntities.set(entity.id, entity);

      const lastState = this.lastTickState.get(entity.id);

      if (!lastState) {
        // New entity
        changes.added.push(worldSerializer.serializeEntity(entity));
        changes.hasChanges = true;
      } else {
        // Check if changed
        const delta = this.calculateEntityDelta(lastState, entity);
        if (delta) {
          changes.updated.push(delta);
          changes.hasChanges = true;
        }
      }
    }

    // Find removed entities
    for (const entityId of this.lastTickState.keys()) {
      if (!currentEntities.has(entityId)) {
        changes.removed.push(entityId);
        changes.hasChanges = true;
      }
    }

    // Get events (from event bus)
    // TODO: Capture events from universe.world.eventBus

    return changes;
  }

  /**
   * Calculate delta for a single entity
   */
  private calculateEntityDelta(
    oldState: SerializedEntity,
    newEntity: Entity
  ): EntityUpdate | null {
    const newState = worldSerializer.serializeEntity(newEntity);

    // Compare components
    const componentDeltas: ComponentDelta[] = [];

    for (const newComp of newState.components) {
      const oldComp = oldState.components.find(c => c.type === newComp.type);

      if (!oldComp) {
        // Component added
        componentDeltas.push({
          componentType: newComp.type,
          operation: 'add',
          data: newComp.data,
        });
      } else {
        // Check if component changed
        const changes = this.compareComponents(oldComp.data, newComp.data);
        if (Object.keys(changes).length > 0) {
          componentDeltas.push({
            componentType: newComp.type,
            operation: 'update',
            data: changes,
          });
        }
      }
    }

    // Check for removed components
    for (const oldComp of oldState.components) {
      if (!newState.components.find(c => c.type === oldComp.type)) {
        componentDeltas.push({
          componentType: oldComp.type,
          operation: 'remove',
        });
      }
    }

    if (componentDeltas.length === 0) {
      return null; // No changes
    }

    return {
      entityId: newEntity.id,
      deltas: componentDeltas,
    };
  }

  /**
   * Compare two component data objects
   */
  private compareComponents(oldData: any, newData: any): Partial<any> {
    const changes: any = {};

    for (const key in newData) {
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes[key] = newData[key];
      }
    }

    return changes;
  }

  /**
   * Filter changes by subscription config
   */
  private filterChanges(
    changes: DeltaChanges,
    sub: UniverseSubscription
  ): DeltaChanges {
    const filtered: DeltaChanges = {
      added: [],
      updated: [],
      removed: [],
      events: [],
      hasChanges: false,
    };

    // Filter by viewport
    if (sub.viewport) {
      filtered.added = changes.added.filter(e =>
        this.isInViewport(e, sub.viewport!)
      );
      filtered.updated = changes.updated.filter(u =>
        this.isEntityInViewport(u.entityId, sub.viewport!)
      );
    } else {
      filtered.added = changes.added;
      filtered.updated = changes.updated;
    }

    // Filter by entity type/tags
    if (sub.config.entityFilter) {
      // TODO: Implement entity filtering
    }

    // Limit max entities
    if (sub.config.maxEntities) {
      filtered.added = filtered.added.slice(0, sub.config.maxEntities);
    }

    filtered.removed = changes.removed;
    filtered.events = changes.events;
    filtered.hasChanges =
      filtered.added.length > 0 ||
      filtered.updated.length > 0 ||
      filtered.removed.length > 0;

    return filtered;
  }

  /**
   * Send initial snapshot to new subscriber
   */
  private sendInitialSnapshot(peerId: string): void {
    const sub = this.subscribers.get(peerId);
    if (!sub) return;

    const universe = multiverseCoordinator.getUniverse(this.universeId);
    if (!universe) return;

    // Get all entities in viewport
    const entities: SerializedEntity[] = [];

    for (const entity of universe.world.entities.values()) {
      if (!sub.viewport || this.isEntityInViewport(entity.id, sub.viewport)) {
        entities.push(worldSerializer.serializeEntity(entity));
      }
    }

    const snapshot: UniverseSnapshotMessage = {
      type: 'universe_snapshot',
      universeId: this.universeId,
      tick: universe.universeTick.toString(),
      entities,
    };

    this.sendToSubscriber(peerId, snapshot);
  }

  /**
   * Send message to subscriber
   */
  private sendToSubscriber(peerId: string, message: any): void {
    const ws = networkManager.wsConnections.get(peerId);
    if (!ws) return;

    ws.send(JSON.stringify(message));
  }

  private isInViewport(entity: SerializedEntity, viewport: Bounds): boolean {
    const posComp = entity.components.find(c => c.type === 'position');
    if (!posComp) return false;

    const pos = posComp.data as { x: number; y: number };

    return (
      pos.x >= viewport.x &&
      pos.x <= viewport.x + viewport.width &&
      pos.y >= viewport.y &&
      pos.y <= viewport.y + viewport.height
    );
  }

  private isEntityInViewport(entityId: EntityId, viewport: Bounds): boolean {
    const universe = multiverseCoordinator.getUniverse(this.universeId);
    if (!universe) return false;

    const entity = universe.world.getEntity(entityId);
    if (!entity) return false;

    const pos = entity.getComponent('position') as any;
    if (!pos) return false;

    return (
      pos.x >= viewport.x &&
      pos.x <= viewport.x + viewport.width &&
      pos.y >= viewport.y &&
      pos.y <= viewport.y + viewport.height
    );
  }

  private updateLastTickState(universe: UniverseInstance): void {
    this.lastTickState.clear();

    for (const entity of universe.world.entities.values()) {
      this.lastTickState.set(
        entity.id,
        worldSerializer.serializeEntity(entity)
      );
    }
  }
}

interface UniverseSubscription {
  peerId: string;
  passageId: string;
  config: StreamConfiguration;
  viewport?: Bounds;
  lastUpdate: number;
}

interface DeltaChanges {
  added: SerializedEntity[];
  updated: EntityUpdate[];
  removed: EntityId[];
  events: GameEvent[];
  hasChanges: boolean;
}

interface EntityUpdate {
  entityId: EntityId;
  deltas: ComponentDelta[];
}

interface ComponentDelta {
  componentType: ComponentType;
  operation: 'add' | 'update' | 'remove';
  data?: Partial<any>;
}
```

### Client-Side: Receiving Universe Updates

```typescript
class UniverseStreamClient {
  private passageId: string;
  private universeId: string;
  private remotePeerId: string;

  // Local cache of remote universe state
  private entityCache: Map<EntityId, Entity> = new Map();
  private eventBuffer: GameEvent[] = [];

  // Connection
  private ws: WebSocket | null = null;

  constructor(
    passageId: string,
    universeId: string,
    remotePeerId: string
  ) {
    this.passageId = passageId;
    this.universeId = universeId;
    this.remotePeerId = remotePeerId;
  }

  /**
   * Connect and subscribe to remote universe
   */
  async connect(config: StreamConfiguration, viewport?: Bounds): Promise<void> {
    this.ws = networkManager.wsConnections.get(this.remotePeerId)!;

    // Send subscription request
    const subscribe: UniverseSubscribeMessage = {
      type: 'universe_subscribe',
      passageId: this.passageId,
      universeId: this.universeId,
      config,
      viewport,
    };

    this.ws.send(JSON.stringify(subscribe));

    // Listen for updates
    this.ws.on('message', (data: string) => {
      this.handleMessage(JSON.parse(data));
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'universe_snapshot':
        this.handleSnapshot(message);
        break;

      case 'universe_tick':
        this.handleTickUpdate(message);
        break;

      default:
        console.warn(`[StreamClient] Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle initial snapshot
   */
  private handleSnapshot(message: UniverseSnapshotMessage): void {
    console.log(`[StreamClient] Received snapshot for ${this.universeId}`);

    // Clear cache
    this.entityCache.clear();

    // Deserialize all entities
    for (const serialized of message.entities) {
      const entity = worldSerializer.deserializeEntity(serialized);
      this.entityCache.set(entity.id, entity);
    }
  }

  /**
   * Handle tick update
   */
  private handleTickUpdate(message: UniverseTickUpdate): void {
    // Add new entities
    for (const serialized of message.entitiesAdded) {
      const entity = worldSerializer.deserializeEntity(serialized);
      this.entityCache.set(entity.id, entity);
    }

    // Update existing entities
    for (const update of message.entitiesUpdated) {
      const entity = this.entityCache.get(update.entityId);
      if (!entity) {
        console.warn(`[StreamClient] Entity ${update.entityId} not in cache`);
        continue;
      }

      this.applyEntityUpdate(entity, update);
    }

    // Remove entities
    for (const entityId of message.entitiesRemoved) {
      this.entityCache.delete(entityId);
    }

    // Buffer events
    this.eventBuffer.push(...message.events);
  }

  /**
   * Apply delta update to entity
   */
  private applyEntityUpdate(entity: Entity, update: EntityUpdate): void {
    for (const delta of update.deltas) {
      switch (delta.operation) {
        case 'add':
          // Add component
          // Note: This requires a way to create component from serialized data
          // Using the existing component serializers
          break;

        case 'update':
          // Update component fields
          const component = entity.getComponent(delta.componentType);
          if (component && delta.data) {
            Object.assign(component, delta.data);
          }
          break;

        case 'remove':
          // Remove component
          // Note: Entity interface doesn't expose removeComponent
          // May need to extend or use EntityImpl
          break;
      }
    }
  }

  /**
   * Get all cached entities for rendering
   */
  getRenderableEntities(): Entity[] {
    return Array.from(this.entityCache.values());
  }

  /**
   * Get buffered events
   */
  consumeEvents(): GameEvent[] {
    const events = [...this.eventBuffer];
    this.eventBuffer = [];
    return events;
  }

  /**
   * Send interaction to remote universe
   */
  sendInteraction(interaction: RemoteInteraction): void {
    if (!this.ws) return;

    const message: RemoteInteractionMessage = {
      type: 'remote_interaction',
      passageId: this.passageId,
      interaction,
    };

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Disconnect from stream
   */
  disconnect(): void {
    if (!this.ws) return;

    const unsubscribe: UniverseUnsubscribeMessage = {
      type: 'universe_unsubscribe',
      passageId: this.passageId,
    };

    this.ws.send(JSON.stringify(unsubscribe));

    this.entityCache.clear();
    this.eventBuffer = [];
  }
}

interface RemoteInteraction {
  type: 'click' | 'spell' | 'command';
  position?: Position;
  entityId?: EntityId;
  data?: any;
}
```

---

## Part 4: Entity Transfer

### Transfer Process

```typescript
class MultiverseNetworkManager {
  /**
   * Transfer entity through remote passage
   */
  async transferEntity(
    entityId: EntityId,
    passageId: string
  ): Promise<TransferResult> {
    const passage = this.remotePassages.get(passageId);
    if (!passage) {
      throw new Error(`Passage ${passageId} not found`);
    }

    if (passage.connectionState !== 'connected') {
      throw new Error('Passage not connected');
    }

    // Get source universe
    const sourceUniverse = multiverseCoordinator.getUniverse(
      passage.from.universeId
    );

    if (!sourceUniverse) {
      throw new Error(`Source universe not found`);
    }

    // Get entity
    const entity = sourceUniverse.world.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    // Check passage health
    if (passage.health <= 0) {
      throw new Error('Passage has collapsed');
    }

    // Check traversal cost
    const cost = passage.traversalCost;
    // TODO: Deduct cost from creator

    // Serialize entity (using existing WorldSerializer)
    const serialized = worldSerializer.serializeEntity(entity);

    // Compute checksum for integrity
    const checksum = computeChecksum(serialized);

    // Create transfer message
    const transfer: EntityTransferMessage = {
      type: 'entity_transfer',
      passageId: passage.id,
      targetUniverseId: passage.remoteUniverseId,
      entity: serialized,
      checksum,
    };

    // Send to remote peer
    const ws = this.wsConnections.get(passage.remotePeerId);
    if (!ws) {
      throw new Error('WebSocket not found');
    }

    ws.send(JSON.stringify(transfer));

    // Remove from source universe
    sourceUniverse.world.destroyEntity(entityId, 'transferred_remote');

    // Emit event
    sourceUniverse.world.eventBus.emit({
      type: 'entity:departed_remote',
      source: entityId,
      data: {
        passageId: passage.id,
        targetUniverse: passage.remoteUniverseId,
        remotePeer: passage.remotePeerId,
      },
    });

    // Wait for acknowledgment
    const ack = await this.waitForTransferAck(passage.remotePeerId, entityId);

    console.log(
      `[Network] Entity ${entityId} transferred through ${passageId}`
    );

    return {
      success: true,
      newEntityId: ack.newEntityId,
      costPaid: cost,
    };
  }

  /**
   * Handle incoming entity transfer
   */
  private handleEntityTransfer(
    peerId: string,
    message: EntityTransferMessage
  ): void {
    // Verify checksum
    if (message.checksum !== computeChecksum(message.entity)) {
      console.error('[Network] Entity transfer checksum mismatch');
      this.sendTransferNack(peerId, 'checksum_mismatch');
      return;
    }

    // Get target universe
    const targetUniverse = multiverseCoordinator.getUniverse(
      message.targetUniverseId
    );

    if (!targetUniverse) {
      console.error(`[Network] Target universe ${message.targetUniverseId} not found`);
      this.sendTransferNack(peerId, 'universe_not_found');
      return;
    }

    // Deserialize entity
    const entity = worldSerializer.deserializeEntity(message.entity);

    // Find passage
    const passage = Array.from(this.remotePassages.values()).find(
      p => p.id === message.passageId && p.remotePeerId === peerId
    );

    // Set position at passage exit
    if (passage?.to.position) {
      const posComp = entity.getComponent('position');
      if (posComp) {
        Object.assign(posComp, passage.to.position);
      }
    }

    // Add to target universe (using WorldMutator)
    const world = targetUniverse.world as WorldMutator;

    // Note: We need to manually add the entity since it's already created
    // This may require extending World interface
    (world as any)._addEntity(entity);

    // Emit event
    targetUniverse.world.eventBus.emit({
      type: 'entity:arrived_remote',
      source: entity.id,
      data: {
        passageId: message.passageId,
        sourcePeer: peerId,
      },
    });

    // Send acknowledgment
    this.sendTransferAck(peerId, message.entity.id, entity.id);

    console.log(
      `[Network] Entity arrived from remote: ${entity.id}`
    );
  }

  private sendTransferAck(
    peerId: string,
    oldEntityId: EntityId,
    newEntityId: EntityId
  ): void {
    const ws = this.wsConnections.get(peerId);
    if (!ws) return;

    const ack: EntityTransferAckMessage = {
      type: 'entity_transfer_ack',
      oldEntityId,
      newEntityId,
      success: true,
    };

    ws.send(JSON.stringify(ack));
  }

  private sendTransferNack(peerId: string, reason: string): void {
    const ws = this.wsConnections.get(peerId);
    if (!ws) return;

    const nack: EntityTransferAckMessage = {
      type: 'entity_transfer_ack',
      success: false,
      error: reason,
    };

    ws.send(JSON.stringify(nack));
  }
}

interface TransferResult {
  success: boolean;
  newEntityId?: EntityId;
  costPaid: number;
  error?: string;
}
```

---

## Part 5: God Chat Room Network

### Networked Chat System

```typescript
class GodChatRoomNetwork {
  private chatRooms: Map<string, ChatRoom> = new Map();
  private myPeerId: string;

  constructor(myPeerId: string) {
    this.myPeerId = myPeerId;
  }

  /**
   * Join a chat room (creates if doesn't exist)
   */
  joinChatRoom(roomId: string, displayName: string): void {
    let room = this.chatRooms.get(roomId);

    if (!room) {
      room = {
        id: roomId,
        members: new Map(),
        messages: [],
        createdAt: Date.now(),
      };
      this.chatRooms.set(roomId, room);
    }

    // Add self to room
    room.members.set(this.myPeerId, {
      peerId: this.myPeerId,
      displayName,
      joinedAt: Date.now(),
      lastSeen: Date.now(),
    });

    // Broadcast join to all connected peers
    this.broadcastChatMessage(roomId, {
      type: 'chat_join',
      roomId,
      peerId: this.myPeerId,
      displayName,
      timestamp: Date.now(),
    });

    // Request member list from others
    this.requestMemberList(roomId);
  }

  /**
   * Send a chat message
   */
  sendMessage(roomId: string, content: string): void {
    const room = this.chatRooms.get(roomId);
    if (!room) {
      throw new Error(`Not in chat room ${roomId}`);
    }

    const message: ChatMessage = {
      id: crypto.randomUUID(),
      roomId,
      peerId: this.myPeerId,
      content,
      timestamp: Date.now(),
    };

    // Add to local history
    room.messages.push(message);

    // Broadcast to all peers
    this.broadcastChatMessage(roomId, {
      type: 'chat_message',
      message,
    });
  }

  /**
   * Handle incoming chat message
   */
  handleChatMessage(peerId: string, data: any): void {
    switch (data.type) {
      case 'chat_join':
        this.handleChatJoin(data);
        break;

      case 'chat_message':
        this.handleMessage(data.message);
        break;

      case 'chat_member_list':
        this.handleMemberList(data);
        break;

      case 'chat_leave':
        this.handleChatLeave(data);
        break;
    }
  }

  private handleChatJoin(data: any): void {
    const room = this.chatRooms.get(data.roomId);
    if (!room) return;

    room.members.set(data.peerId, {
      peerId: data.peerId,
      displayName: data.displayName,
      joinedAt: data.timestamp,
      lastSeen: data.timestamp,
    });

    // Send our member info
    this.sendMemberInfo(data.roomId, data.peerId);
  }

  private handleMessage(message: ChatMessage): void {
    const room = this.chatRooms.get(message.roomId);
    if (!room) return;

    // Add to history (if not duplicate)
    if (!room.messages.find(m => m.id === message.id)) {
      room.messages.push(message);

      // Sort by timestamp
      room.messages.sort((a, b) => a.timestamp - b.timestamp);
    }

    // Update member last seen
    const member = room.members.get(message.peerId);
    if (member) {
      member.lastSeen = message.timestamp;
    }
  }

  private broadcastChatMessage(roomId: string, data: any): void {
    const room = this.chatRooms.get(roomId);
    if (!room) return;

    // Send to all members except self
    for (const member of room.members.values()) {
      if (member.peerId === this.myPeerId) continue;

      const ws = networkManager.wsConnections.get(member.peerId);
      if (ws) {
        ws.send(JSON.stringify(data));
      }
    }
  }

  /**
   * Get chat room
   */
  getChatRoom(roomId: string): ChatRoom | undefined {
    return this.chatRooms.get(roomId);
  }

  /**
   * Get recent messages
   */
  getRecentMessages(roomId: string, limit: number = 50): ChatMessage[] {
    const room = this.chatRooms.get(roomId);
    if (!room) return [];

    return room.messages.slice(-limit);
  }

  /**
   * Get active members
   */
  getActiveMembers(roomId: string): ChatMember[] {
    const room = this.chatRooms.get(roomId);
    if (!room) return [];

    const now = Date.now();
    const timeout = 60000; // 1 minute

    return Array.from(room.members.values()).filter(
      m => now - m.lastSeen < timeout
    );
  }
}

interface ChatRoom {
  id: string;
  members: Map<string, ChatMember>;
  messages: ChatMessage[];
  createdAt: number;
}

interface ChatMember {
  peerId: string;
  displayName: string;
  joinedAt: number;
  lastSeen: number;
}

interface ChatMessage {
  id: string;
  roomId: string;
  peerId: string;
  content: string;
  timestamp: number;
}
```

---

## Part 6: Network Protocol

### Message Types

```typescript
// Connection messages
interface PassageHandshakeMessage {
  type: 'passage_handshake';
  passageId: string;
  sourceUniverseId: string;
  targetUniverseId: string;
  viewMode: ViewMode;
  interactionMode: InteractionMode;
  streamConfig: StreamConfiguration;
}

interface PassageHandshakeAck {
  type: 'passage_handshake_ack';
  passageId: string;
  accepted: boolean;
  reason?: string;
}

// Entity transfer messages
interface EntityTransferMessage {
  type: 'entity_transfer';
  passageId: string;
  targetUniverseId: string;
  entity: SerializedEntity;
  checksum: string;
}

interface EntityTransferAckMessage {
  type: 'entity_transfer_ack';
  oldEntityId?: EntityId;
  newEntityId?: EntityId;
  success: boolean;
  error?: string;
}

// Universe streaming messages
interface UniverseSubscribeMessage {
  type: 'universe_subscribe';
  passageId: string;
  universeId: string;
  config: StreamConfiguration;
  viewport?: Bounds;
}

interface UniverseUnsubscribeMessage {
  type: 'universe_unsubscribe';
  passageId: string;
}

interface UniverseSnapshotMessage {
  type: 'universe_snapshot';
  universeId: string;
  tick: string;  // Serialized bigint
  entities: SerializedEntity[];
}

interface UniverseTickUpdate {
  type: 'universe_tick';
  universeId: string;
  tick: string;

  entitiesAdded: SerializedEntity[];
  entitiesUpdated: EntityUpdate[];
  entitiesRemoved: EntityId[];

  events: GameEvent[];
}

// Interaction messages
interface RemoteInteractionMessage {
  type: 'remote_interaction';
  passageId: string;
  interaction: RemoteInteraction;
}

// Universe config request
interface UniverseConfigRequest {
  type: 'universe_config_request';
  universeId: string;
}

interface UniverseConfigResponse {
  type: 'universe_config_response';
  universeId: string;
  config: UniverseDivineConfig;
}

// Heartbeat
interface HeartbeatMessage {
  type: 'heartbeat';
  timestamp: number;
}

// Chat messages (covered in Part 5)

type NetworkMessage =
  | PassageHandshakeMessage
  | PassageHandshakeAck
  | EntityTransferMessage
  | EntityTransferAckMessage
  | UniverseSubscribeMessage
  | UniverseUnsubscribeMessage
  | UniverseSnapshotMessage
  | UniverseTickUpdate
  | RemoteInteractionMessage
  | UniverseConfigRequest
  | UniverseConfigResponse
  | HeartbeatMessage;
```

---

## Part 7: UI/Rendering

### Remote Universe View Component

```typescript
class RemoteUniverseView {
  private passage: RemotePassage;
  private streamClient: UniverseStreamClient;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderBounds: Bounds;

  constructor(
    passage: RemotePassage,
    canvas: HTMLCanvasElement,
    renderBounds: Bounds
  ) {
    this.passage = passage;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.renderBounds = renderBounds;

    // Create stream client
    this.streamClient = new UniverseStreamClient(
      passage.id,
      passage.remoteUniverseId,
      passage.remotePeerId
    );

    // Connect
    this.streamClient.connect(
      passage.streamConfig,
      passage.viewportBounds
    );
  }

  /**
   * Render the remote universe
   */
  render(): void {
    const ctx = this.ctx;

    // Save context
    ctx.save();

    // Clip to render bounds
    ctx.beginPath();
    ctx.rect(
      this.renderBounds.x,
      this.renderBounds.y,
      this.renderBounds.width,
      this.renderBounds.height
    );
    ctx.clip();

    // Clear
    ctx.fillStyle = '#000';
    ctx.fillRect(
      this.renderBounds.x,
      this.renderBounds.y,
      this.renderBounds.width,
      this.renderBounds.height
    );

    // Render portal frame
    this.renderPortalFrame(ctx);

    // Get remote entities
    const remoteEntities = this.streamClient.getRenderableEntities();

    // Render entities
    for (const entity of remoteEntities) {
      this.renderEntity(ctx, entity);
    }

    // Render overlay
    this.renderOverlay(ctx);

    // Restore context
    ctx.restore();
  }

  private renderPortalFrame(ctx: CanvasRenderingContext2D): void {
    const { x, y, width, height } = this.renderBounds;

    // Portal shimmer effect
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, width, height);

    // Inner glow
    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
    gradient.addColorStop(0, 'rgba(100, 200, 255, 0.2)');
    gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.05)');
    gradient.addColorStop(1, 'rgba(100, 200, 255, 0.2)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, height);
  }

  private renderEntity(ctx: CanvasRenderingContext2D, entity: Entity): void {
    // Use existing entity rendering system
    const renderable = entity.getComponent('renderable') as any;
    const position = entity.getComponent('position') as any;

    if (!renderable || !position) return;

    // Transform to render bounds
    const screenX = this.renderBounds.x + position.x;
    const screenY = this.renderBounds.y + position.y;

    // TODO: Use existing sprite renderer
    ctx.fillStyle = '#fff';
    ctx.fillRect(screenX - 2, screenY - 2, 4, 4);
  }

  private renderOverlay(ctx: CanvasRenderingContext2D): void {
    const { x, y, width } = this.renderBounds;

    // Label
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(x, y - 20, width, 20);

    ctx.fillStyle = '#fff';
    ctx.font = '12px monospace';
    ctx.fillText(
      `Remote: ${this.passage.to.universeId}`,
      x + 5,
      y - 6
    );

    // Mode indicator
    let modeText = '';
    let modeColor = '#888';

    switch (this.passage.viewMode) {
      case 'observe':
        modeText = '[View Only]';
        modeColor = '#88f';
        break;
      case 'participate':
        modeText = '[Interactive]';
        modeColor = '#8f8';
        break;
    }

    if (modeText) {
      ctx.fillStyle = modeColor;
      ctx.fillText(modeText, x + width - 100, y - 6);
    }

    // Connection indicator
    const connected = this.passage.connectionState === 'connected';
    ctx.fillStyle = connected ? '#0f0' : '#f00';
    ctx.beginPath();
    ctx.arc(x + width - 10, y + 10, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  /**
   * Handle click in remote view
   */
  handleClick(x: number, y: number): void {
    if (this.passage.interactionMode === 'none') {
      console.log('[RemoteView] Interaction disabled');
      return;
    }

    // Convert screen coords to world coords
    const worldX = x - this.renderBounds.x;
    const worldY = y - this.renderBounds.y;

    // Send interaction
    this.streamClient.sendInteraction({
      type: 'click',
      position: { x: worldX, y: worldY },
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.streamClient.disconnect();
  }
}
```

### UI Layout Options

**Picture-in-Picture:**
```typescript
// Render remote universe in corner
const remoteView = new RemoteUniverseView(
  passage,
  canvas,
  { x: canvas.width - 300, y: 10, width: 290, height: 200 }
);
```

**Split Screen:**
```typescript
// Render local universe on left, remote on right
const localBounds = {
  x: 0,
  y: 0,
  width: canvas.width / 2,
  height: canvas.height
};

const remoteBounds = {
  x: canvas.width / 2,
  y: 0,
  width: canvas.width / 2,
  height: canvas.height
};
```

**Portal Effect:**
```typescript
// Render passage as portal in world
// Remote view shows through portal
const portalPos = { x: 100, y: 150 };
const portalSize = { width: 80, height: 120 };
```

---

## Part 8: Discovery & Connection UI

### Peer Discovery

```typescript
class PeerDiscoveryUI {
  /**
   * Show peer connection dialog
   */
  showConnectDialog(): void {
    // Show UI with:
    // 1. My address (for others to connect)
    // 2. Connect to peer (enter address)
    // 3. List of connected peers
  }

  /**
   * Get my connection address
   */
  getMyAddress(): string {
    // Return IP:port for others to connect to
    // e.g., "192.168.1.100:8080"
    return `${getLocalIP()}:8080`;
  }

  /**
   * Connect to peer
   */
  async connectToPeer(address: string): Promise<void> {
    try {
      const peerId = await networkManager.connectToPeer(`ws://${address}`);
      console.log(`Connected to ${address} (${peerId})`);

      // Update UI
      this.updatePeerList();
    } catch (error) {
      console.error('Failed to connect:', error);
      // Show error to user
    }
  }

  /**
   * Show passage creation dialog
   */
  showCreatePassageDialog(localUniverseId: string): void {
    // Show UI with:
    // 1. Select peer
    // 2. Select their universe
    // 3. Configure passage (view mode, interaction, etc.)
    // 4. Create
  }
}
```

---

## Part 9: Example User Flow

### Complete Multiplayer Setup

**Player A (Host):**
```typescript
// 1. Start server
networkManager.startServer(8080);

// 2. Create universe
const universeA = multiverseCoordinator.createUniverse({
  id: 'player-a-world',
  name: "Player A's Universe",
  timeScale: 1.0,
  paused: false,
});

// 3. Share address with Player B
console.log('Share this address: 192.168.1.100:8080');

// 4. Wait for Player B to connect...

// 5. When Player B connects, create passage
const passageToB = await networkManager.createRemotePassage({
  localUniverseId: 'player-a-world',
  remoteUniverseId: 'player-b-world',  // Will learn from B
  remotePeerId: '<peer-b-id>',
  creatorId: 'deity-a',
  viewMode: 'observe',
  interactionMode: 'limited',
  viewportBounds: { x: 0, y: 0, width: 100, height: 100 },
});

// 6. Now can see Player B's world!
const remoteView = new RemoteUniverseView(passageToB, canvas, bounds);

// 7. Join god chat
chatRoom.joinChatRoom('multiverse-chat', 'Player A');
chatRoom.sendMessage('multiverse-chat', 'Hello from Universe A!');
```

**Player B (Client):**
```typescript
// 1. Connect to Player A
const peerA = await networkManager.connectToPeer('ws://192.168.1.100:8080');

// 2. Create universe
const universeB = multiverseCoordinator.createUniverse({
  id: 'player-b-world',
  name: "Player B's Universe",
  timeScale: 1.0,
  paused: false,
});

// 3. Create passage back to A
const passageToA = await networkManager.createRemotePassage({
  localUniverseId: 'player-b-world',
  remoteUniverseId: 'player-a-world',
  remotePeerId: peerA,
  creatorId: 'deity-b',
  viewMode: 'participate',
  interactionMode: 'full',
  viewportBounds: { x: 0, y: 0, width: 100, height: 100 },
});

// 4. See Player A's world
const remoteView = new RemoteUniverseView(passageToA, canvas, bounds);

// 5. Join chat
chatRoom.joinChatRoom('multiverse-chat', 'Player B');
chatRoom.sendMessage('multiverse-chat', 'Amazing universe!');

// 6. Transfer entity to Player A's world
await networkManager.transferEntity('my-entity-123', passageToA.id);
```

---

## Part 10: Implementation Roadmap

### Phase 1: Core Networking (Week 1-2)
- [ ] Implement MultiverseNetworkManager
- [ ] WebSocket server/client setup
- [ ] Basic peer connection
- [ ] Passage handshake protocol
- [ ] Message routing
- [ ] Write unit tests for networking

### Phase 2: Entity Transfer (Week 2-3)
- [ ] Entity serialization/deserialization (reuse WorldSerializer)
- [ ] Transfer protocol
- [ ] Checksum validation
- [ ] Transfer acknowledgment
- [ ] Handle transfer errors
- [ ] Write integration tests

### Phase 3: Live Streaming (Week 3-5)
- [ ] Implement UniverseStreamServer
- [ ] Implement UniverseStreamClient
- [ ] Delta compression
- [ ] Viewport filtering
- [ ] Event streaming
- [ ] Optimize bandwidth
- [ ] Write streaming tests

### Phase 4: Rendering (Week 5-6)
- [ ] RemoteUniverseView component
- [ ] Portal frame rendering
- [ ] Entity rendering in remote view
- [ ] UI overlays
- [ ] Interaction handling
- [ ] Multiple layout modes

### Phase 5: God Chat Room (Week 6-7)
- [ ] GodChatRoomNetwork implementation
- [ ] Message synchronization
- [ ] Presence awareness
- [ ] Chat UI
- [ ] Message history
- [ ] Write chat tests

### Phase 6: Discovery & UI (Week 7-8)
- [ ] Peer discovery UI
- [ ] Passage creation dialog
- [ ] Connected peers list
- [ ] Universe browser
- [ ] Connection status indicators
- [ ] Polish and UX

### Phase 7: WebRTC Voice/Video (Week 8-9)
- [ ] Implement ProximityVoiceChat class
- [ ] WebRTC peer connection setup
- [ ] Spatial audio with Web Audio API
- [ ] Video feed rendering on canvas
- [ ] Signaling through WebSocket
- [ ] Mute/unmute controls
- [ ] Video on/off toggle
- [ ] Voice activity indicator
- [ ] Write WebRTC tests

### Phase 8: Polish & Testing (Week 9-10)
- [ ] Connection recovery
- [ ] Heartbeat system
- [ ] Passage health monitoring
- [ ] Error handling
- [ ] Performance optimization
- [ ] End-to-end testing
- [ ] Documentation

---

## Part 11: Security Considerations

### Authentication

```typescript
interface PassageAuthentication {
  // Optional password protection
  password?: string;

  // Whitelist of allowed peers
  allowedPeers?: string[];

  // Require handshake approval
  requireApproval: boolean;
}
```

### Data Validation

```typescript
// Always validate incoming data
function validateEntityTransfer(data: EntityTransferMessage): boolean {
  // Verify checksum
  if (data.checksum !== computeChecksum(data.entity)) {
    return false;
  }

  // Verify entity structure
  if (!isValidSerializedEntity(data.entity)) {
    return false;
  }

  // Check size limits (prevent huge transfers)
  const size = JSON.stringify(data.entity).length;
  if (size > MAX_ENTITY_SIZE) {
    return false;
  }

  return true;
}
```

### Rate Limiting

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  checkLimit(peerId: string, limit: number, window: number): boolean {
    const now = Date.now();
    const requests = this.requests.get(peerId) || [];

    // Remove old requests
    const recent = requests.filter(t => now - t < window);

    if (recent.length >= limit) {
      return false; // Rate limit exceeded
    }

    recent.push(now);
    this.requests.set(peerId, recent);
    return true;
  }
}

// Use rate limiter
if (!rateLimiter.checkLimit(peerId, 100, 60000)) {
  console.warn(`[Network] Rate limit exceeded for ${peerId}`);
  return;
}
```

---

## Part 12: Performance Optimization

### Bandwidth Optimization

**1. Delta Compression**
- Only send changed components
- Only send changed fields within components
- Use binary protocol for large data

**2. Viewport Culling**
- Only stream entities in viewport
- Reduce update frequency for distant entities
- Don't send entities behind walls

**3. Update Frequency Scaling**
```typescript
function getUpdateFrequency(entity: Entity, viewportCenter: Position): number {
  const distance = calculateDistance(entity.position, viewportCenter);

  if (distance < 20) return 20; // 20 Hz (close)
  if (distance < 50) return 10; // 10 Hz (medium)
  return 5; // 5 Hz (far)
}
```

**4. Entity Limit**
```typescript
// Limit streamed entities
const MAX_STREAMED_ENTITIES = 200;

function selectEntitiesToStream(
  entities: Entity[],
  viewport: Bounds
): Entity[] {
  // Sort by priority (distance, importance)
  const sorted = entities.sort((a, b) => {
    return getPriority(a, viewport) - getPriority(b, viewport);
  });

  return sorted.slice(0, MAX_STREAMED_ENTITIES);
}
```

### Memory Management

```typescript
class UniverseStreamClient {
  // Limit cache size
  private MAX_CACHED_ENTITIES = 500;

  private pruneCache(): void {
    if (this.entityCache.size <= this.MAX_CACHED_ENTITIES) {
      return;
    }

    // Remove oldest entities
    const sorted = Array.from(this.entityCache.entries())
      .sort((a, b) => getLastUpdate(a[1]) - getLastUpdate(b[1]));

    const toRemove = sorted.slice(0, sorted.length - this.MAX_CACHED_ENTITIES);

    for (const [id, _] of toRemove) {
      this.entityCache.delete(id);
    }
  }
}
```

---

## Part 13: Testing Strategy

### Unit Tests

```typescript
describe('MultiverseNetworkManager', () => {
  test('connects to peer', async () => {
    const manager = new MultiverseNetworkManager();
    const peerId = await manager.connectToPeer('ws://localhost:8080');
    expect(peerId).toBeDefined();
  });

  test('creates remote passage', async () => {
    const passage = await manager.createRemotePassage({
      localUniverseId: 'test-local',
      remoteUniverseId: 'test-remote',
      remotePeerId: 'test-peer',
      creatorId: 'test-deity',
    });

    expect(passage.type).toBe('remote');
    expect(passage.connectionState).toBe('connected');
  });
});
```

### Integration Tests

```typescript
describe('Entity Transfer', () => {
  test('transfers entity between universes', async () => {
    // Setup two game instances
    const instanceA = createGameInstance();
    const instanceB = createGameInstance();

    // Connect
    const peerB = await instanceA.networkManager.connectToPeer(
      instanceB.getAddress()
    );

    // Create passage
    const passage = await instanceA.networkManager.createRemotePassage({
      localUniverseId: 'universe-a',
      remoteUniverseId: 'universe-b',
      remotePeerId: peerB,
      creatorId: 'deity-a',
    });

    // Create entity in A
    const entity = instanceA.universe.world.createEntity();
    const entityId = entity.id;

    // Transfer to B
    await instanceA.networkManager.transferEntity(entityId, passage.id);

    // Verify removed from A
    expect(instanceA.universe.world.getEntity(entityId)).toBeUndefined();

    // Wait for transfer
    await sleep(100);

    // Verify in B
    const entities = Array.from(instanceB.universe.world.entities.values());
    expect(entities.length).toBe(1);
  });
});
```

---

## Part 14: Proximity Voice & Video Chat (WebRTC)

### Spatial Voice Chat

Add **proximity-based voice and video** using WebRTC - when your characters are near each other in-game, you can see and hear the other player!

```typescript
class ProximityVoiceChat {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private audioStreams: Map<string, MediaStream> = new Map();
  private videoStreams: Map<string, MediaStream> = new Map();

  // Spatial audio context
  private audioContext: AudioContext;
  private spatialNodes: Map<string, PannerNode> = new Map();

  constructor() {
    this.audioContext = new AudioContext();
  }

  /**
   * Start voice/video chat with another player
   */
  async startChat(
    peerId: string,
    options: { audio: boolean; video: boolean }
  ): Promise<void> {
    // Get local media stream
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: options.audio,
      video: options.video ? { width: 320, height: 240 } : false,
    });

    // Create peer connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    });

    // Add local stream
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Handle incoming stream
    pc.ontrack = (event) => {
      const remoteStream = event.streams[0];

      if (event.track.kind === 'audio') {
        this.setupSpatialAudio(peerId, remoteStream);
        this.audioStreams.set(peerId, remoteStream);
      } else if (event.track.kind === 'video') {
        this.videoStreams.set(peerId, remoteStream);
      }
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage(peerId, {
          type: 'ice_candidate',
          candidate: event.candidate,
        });
      }
    };

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send offer through WebSocket
    this.sendSignalingMessage(peerId, {
      type: 'offer',
      sdp: offer.sdp,
    });

    this.peerConnections.set(peerId, pc);
  }

  /**
   * Setup spatial audio for proximity-based volume
   */
  private setupSpatialAudio(
    peerId: string,
    stream: MediaStream
  ): void {
    // Create audio source from stream
    const source = this.audioContext.createMediaStreamSource(stream);

    // Create panner node for 3D audio
    const panner = this.audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 10;     // Start attenuating at 10 units
    panner.maxDistance = 100;    // Silent at 100 units
    panner.rolloffFactor = 2;    // How quickly volume drops

    // Connect: source -> panner -> destination
    source.connect(panner);
    panner.connect(this.audioContext.destination);

    this.spatialNodes.set(peerId, panner);
  }

  /**
   * Update spatial audio positions based on game entities
   */
  update(myPosition: Position, otherPlayers: Map<string, Position>): void {
    for (const [peerId, position] of otherPlayers) {
      const panner = this.spatialNodes.get(peerId);
      if (!panner) continue;

      // Calculate relative position
      const dx = position.x - myPosition.x;
      const dy = position.y - myPosition.y;

      // Set 3D position (Y is up in Web Audio API)
      panner.positionX.value = dx;
      panner.positionY.value = 0;
      panner.positionZ.value = -dy;  // Negative because facing +Z

      // Set listener position (camera)
      const listener = this.audioContext.listener;
      listener.positionX.value = 0;
      listener.positionY.value = 0;
      listener.positionZ.value = 0;
    }
  }

  /**
   * Render video feeds
   */
  renderVideoFeeds(
    canvas: CanvasRenderingContext2D,
    otherPlayers: Map<string, { position: Position; peerId: string }>
  ): void {
    for (const [playerId, player] of otherPlayers) {
      const stream = this.videoStreams.get(player.peerId);
      if (!stream) continue;

      // Create video element (cache it)
      let video = this.getOrCreateVideo(player.peerId);
      if (video.srcObject !== stream) {
        video.srcObject = stream;
        video.play();
      }

      // Draw video above player's character
      const x = player.position.x;
      const y = player.position.y - 40; // Above head

      canvas.save();

      // Draw border
      canvas.strokeStyle = '#0f0';
      canvas.lineWidth = 2;
      canvas.strokeRect(x - 16, y - 12, 32, 24);

      // Draw video
      canvas.drawImage(video, x - 16, y - 12, 32, 24);

      canvas.restore();
    }
  }

  private videoElements: Map<string, HTMLVideoElement> = new Map();

  private getOrCreateVideo(peerId: string): HTMLVideoElement {
    let video = this.videoElements.get(peerId);

    if (!video) {
      video = document.createElement('video');
      video.autoplay = true;
      video.muted = false;
      this.videoElements.set(peerId, video);
    }

    return video;
  }

  /**
   * Handle WebRTC signaling messages
   */
  async handleSignaling(peerId: string, message: any): Promise<void> {
    let pc = this.peerConnections.get(peerId);

    if (message.type === 'offer') {
      // Create peer connection if doesn't exist
      if (!pc) {
        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });

        // Setup handlers
        this.setupPeerConnection(pc, peerId);

        this.peerConnections.set(peerId, pc);
      }

      // Set remote description
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'offer',
        sdp: message.sdp,
      }));

      // Create answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Send answer
      this.sendSignalingMessage(peerId, {
        type: 'answer',
        sdp: answer.sdp,
      });

    } else if (message.type === 'answer') {
      if (!pc) return;

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: message.sdp,
      }));

    } else if (message.type === 'ice_candidate') {
      if (!pc) return;

      await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
    }
  }

  private setupPeerConnection(pc: RTCPeerConnection, peerId: string): void {
    pc.ontrack = (event) => {
      const stream = event.streams[0];

      if (event.track.kind === 'audio') {
        this.setupSpatialAudio(peerId, stream);
        this.audioStreams.set(peerId, stream);
      } else if (event.track.kind === 'video') {
        this.videoStreams.set(peerId, stream);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage(peerId, {
          type: 'ice_candidate',
          candidate: event.candidate,
        });
      }
    };
  }

  private sendSignalingMessage(peerId: string, message: any): void {
    // Send through existing WebSocket
    const ws = networkManager.wsConnections.get(peerId);
    if (!ws) return;

    ws.send(JSON.stringify({
      type: 'webrtc_signaling',
      ...message,
    }));
  }

  /**
   * Mute/unmute audio
   */
  setMuted(muted: boolean): void {
    for (const stream of this.audioStreams.values()) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
    }
  }

  /**
   * Enable/disable video
   */
  setVideoEnabled(enabled: boolean): void {
    for (const stream of this.videoStreams.values()) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  /**
   * Disconnect from peer
   */
  disconnect(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
    }

    this.audioStreams.delete(peerId);
    this.videoStreams.delete(peerId);
    this.spatialNodes.delete(peerId);

    const video = this.videoElements.get(peerId);
    if (video) {
      video.srcObject = null;
      this.videoElements.delete(peerId);
    }
  }
}
```

### Integration with Game

```typescript
class NetworkedGameInstance {
  private voiceChat: ProximityVoiceChat;
  private myEntityId: EntityId;

  constructor() {
    this.voiceChat = new ProximityVoiceChat();
  }

  /**
   * Update every frame
   */
  update(): void {
    // Get my position
    const myEntity = world.getEntity(this.myEntityId);
    const myPos = myEntity?.getComponent('position') as any;

    if (!myPos) return;

    // Get other players' positions
    const otherPlayers = new Map<string, Position>();

    for (const [peerId, passage] of networkManager.remotePassages) {
      // TODO: Get player entity position from remote universe
      const playerPos = this.getPlayerPosition(peerId);
      if (playerPos) {
        otherPlayers.set(peerId, playerPos);
      }
    }

    // Update spatial audio
    this.voiceChat.update(myPos, otherPlayers);
  }

  /**
   * Render video feeds
   */
  render(ctx: CanvasRenderingContext2D): void {
    // Render game world
    // ...

    // Get players with video
    const playersWithVideo = new Map();

    for (const [peerId, passage] of networkManager.remotePassages) {
      const pos = this.getPlayerPosition(peerId);
      if (pos) {
        playersWithVideo.set(peerId, { position: pos, peerId });
      }
    }

    // Render video feeds above characters
    this.voiceChat.renderVideoFeeds(ctx, playersWithVideo);
  }

  /**
   * Start voice chat when players connect
   */
  async onPeerConnected(peerId: string): Promise<void> {
    await this.voiceChat.startChat(peerId, {
      audio: true,
      video: true,  // Optional
    });
  }
}
```

### UI Controls

```typescript
class VoiceChatUI {
  private voiceChat: ProximityVoiceChat;

  render(): void {
    // Mute/unmute button
    const muteButton = this.createButton('Mute', () => {
      this.muted = !this.muted;
      this.voiceChat.setMuted(this.muted);
    });

    // Video on/off button
    const videoButton = this.createButton('Video', () => {
      this.videoEnabled = !this.videoEnabled;
      this.voiceChat.setVideoEnabled(this.videoEnabled);
    });

    // Volume indicator
    this.renderVolumeIndicator();
  }

  private renderVolumeIndicator(): void {
    // Show visual indicator when someone is talking
    // Based on audio level
  }
}
```

### How It Works

**1. Players Connect**
```typescript
// Player A starts server
networkManager.startServer(8080);

// Player B connects
const peerA = await networkManager.connectToPeer('ws://192.168.1.100:8080');

// Voice chat automatically starts
await voiceChat.startChat(peerA, { audio: true, video: true });
```

**2. Spatial Audio**
```
Player A's character at (100, 100)
Player B's character at (150, 120)

Distance = sqrt((150-100)² + (120-100)²) = ~54 units

Volume = function of distance:
- 0-10 units: 100% volume
- 10-100 units: Gradual falloff
- 100+ units: Silent

Also pans left/right based on horizontal position!
```

**3. Video Rendering**
```
     [Video Feed]
         ↓
        👤  ← Player's character
```

Video appears above the player's character in the game world, like a little bubble showing their face!

### Advantages

**WebRTC is PERFECT for this because:**

1. ✅ **Peer-to-peer** - No server needed, direct audio/video
2. ✅ **Low latency** - Real-time communication
3. ✅ **Built into browsers** - No plugins needed
4. ✅ **Web Audio API** - Perfect spatial audio
5. ✅ **Already has signaling** - Reuse WebSocket infrastructure

**Implementation is actually easy:**
- ~200 lines of code
- Use existing WebSocket for signaling
- Web Audio API handles spatial positioning
- Video renders on canvas

**The Result:**
- Walk near another player → hear their voice
- Walk away → voice fades
- Turn video on → see their face above their character
- Works with multiple players simultaneously
- Scales to 2-10 players easily

Should I add this to the implementation roadmap?

## Summary

This specification provides a complete **networked multiverse** system:

1. ✅ **Peer-to-peer connection** - No central server required
2. ✅ **Remote passages** - Portal links between universes
3. ✅ **Live viewing** - See remote universes in real-time
4. ✅ **Entity transfer** - Move entities across the network
5. ✅ **Interactive modes** - Observe, participate, or collaborate
6. ✅ **God chat room** - Networked communication
7. ✅ **Proximity voice/video** - WebRTC spatial audio and video bubbles
8. ✅ **Delta compression** - Efficient bandwidth usage
9. ✅ **Viewport culling** - Only stream visible entities
10. ✅ **Multiple layouts** - PiP, split-screen, portal views
11. ✅ **Security** - Authentication, validation, rate limiting

### Integration with Existing Systems

- **Reuses `MetricsStreamClient`** pattern for WebSocket infrastructure
- **Reuses `WorldSerializer`** for entity serialization
- **Extends `PASSAGE_SYSTEM.md`** with remote passage type
- **Builds on `PERSISTENCE_MULTIVERSE_SPEC.md`** multiverse coordination
- **Implements god chat** from `IMAJICA_DIMENSIONAL_DESIGN.md`

### Next Steps

1. Implement Phase 1 (core networking)
2. Test peer connection
3. Implement entity transfer
4. Add live streaming
5. Build rendering UI
6. Integrate god chat
7. Polish and optimize

The multiverse is now **multiplayer**. Players can connect their universes, watch each other's worlds, transfer entities, and chat with fellow gods. 🌌
