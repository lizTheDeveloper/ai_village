/**
 * MultiverseNetworkManager - Manages peer-to-peer connections between game instances
 *
 * Responsibilities:
 * - WebSocket server/client management
 * - Remote passage creation and lifecycle
 * - Network message routing
 * - Peer discovery and connection
 */

import type { MultiverseCoordinator } from './MultiverseCoordinator.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';
import type { EventBus } from '../events/EventBus.js';
import type { VersionedEntity } from '../persistence/types.js';
import type {
  NetworkMessage,
  RemotePassage,
  RemotePassageConfig,
  PassageHandshakeMessage,
  PassageHandshakeAck,
  UniverseConfigRequest,
  UniverseConfigResponse,
  EntityTransferMessage,
  EntityTransferAckMessage,
  PeerId,
  PassageId,
  UniverseId,
  EntityId,
} from './NetworkProtocol.js';
import { worldSerializer } from '../persistence/WorldSerializer.js';
import { computeChecksumSync } from '../persistence/utils.js';
import type { UniverseConfig } from './MultiverseCoordinator.js';
import type { UniversePhysicsConfig } from '../config/UniversePhysicsConfig.js';
import type { UniverseDivineConfig } from '../divinity/UniverseConfig.js';

// WebSocket type (works in both browser and Node.js)
// Using structural typing to avoid direct dependency on ws package
interface WebSocketLike {
  send(data: string): void;
  close(): void;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  onopen?: ((event: unknown) => void) | null;
  onclose?: ((event: unknown) => void) | null;
  onerror?: ((error: unknown) => void) | null;
  onmessage?: ((event: { data: string }) => void) | null;
}

interface WebSocketServerLike {
  close(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

/**
 * Universe compatibility information
 */
interface UniverseCompatibility {
  /** Overall compatibility score (0-1, where 1 = fully compatible) */
  compatibilityScore: number;

  /** Individual factor scores */
  factors: {
    timeRateCompatibility: number;
    physicsCompatibility: number;
    realityStability: number;
    divergenceLevel: number;
  };

  /** Warnings about compatibility issues */
  warnings: string[];

  /** Whether passage creation is recommended */
  recommended: boolean;

  /** Estimated traversal cost multiplier (1.0 = normal) */
  traversalCostMultiplier: number;
}

/**
 * Pending operations (for request/response pattern)
 */
interface PendingOperation<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

/**
 * Active universe subscription state
 */
interface UniverseSubscription {
  passageId: PassageId;
  peerId: PeerId;
  universeId: UniverseId;
  config: import('./NetworkProtocol.js').StreamConfiguration;
  viewport?: import('./NetworkProtocol.js').Bounds;
  lastSentTick: bigint;
  updateInterval: ReturnType<typeof setInterval>;
}

/**
 * Entity with updateComponent method (for mutation operations)
 */
interface UpdateableEntity {
  updateComponent<T>(type: string, updater: ((current: T) => T) | Partial<T>): void;
}

/**
 * Entity with an id property
 */
interface EntityWithId {
  id: string;
}

export class MultiverseNetworkManager {
  private multiverseCoordinator: MultiverseCoordinator;

  // Event managers per universe
  private eventManagers: Map<string, SystemEventManager> = new Map();

  // WebSocket connections
  private wsServer: WebSocketServerLike | null = null;
  private wsConnections: Map<PeerId, WebSocketLike> = new Map();

  // Remote passages
  private remotePassages: Map<PassageId, RemotePassage> = new Map();

  // Pending operations
  private pendingAcks: Map<string, PendingOperation<unknown>> = new Map();

  // Active subscriptions (passageId -> subscription state)
  private activeSubscriptions: Map<PassageId, UniverseSubscription> = new Map();

  // Cached entity states for delta compression (passageId -> entityId -> last sent state)
  private entityCache: Map<PassageId, Map<string, unknown>> = new Map();

  // My peer ID
  private myPeerId: PeerId;

  // Configuration
  private readonly ACK_TIMEOUT_MS = 10000; // 10 seconds

  constructor(multiverseCoordinator: MultiverseCoordinator) {
    this.multiverseCoordinator = multiverseCoordinator;
    this.myPeerId = this.generatePeerId();
  }

  // ============================================================================
  // Server Management
  // ============================================================================

  /**
   * Start WebSocket server to accept incoming connections
   */
  async startServer(port: number = 8080): Promise<void> {
    if (this.wsServer) {
      throw new Error('Server already running');
    }

    // Dynamic import for Node.js environment
    try {
      const { WebSocketServer } = await import('ws');

      this.wsServer = new WebSocketServer({ port }) as unknown as WebSocketServerLike;

      this.wsServer.on('connection', (ws: unknown) => {
        this.handleNewConnection(ws as WebSocketLike);
      });

      this.wsServer.on('error', (...args: unknown[]) => {
        const error = args[0] as Error;
        console.error('[NetworkManager] Server error:', error);
      });

    } catch (error) {
      throw new Error(
        'WebSocket server requires Node.js environment. ' +
        'Install ws: npm install ws'
      );
    }
  }

  /**
   * Stop WebSocket server
   */
  stopServer(): void {
    if (!this.wsServer) return;

    this.wsServer.close();
    this.wsServer = null;

  }

  /**
   * Handle new incoming connection
   */
  private handleNewConnection(ws: WebSocketLike): void {
    const peerId = this.generatePeerId();
    this.wsConnections.set(peerId, ws);

    // Setup message handler (Node.js WebSocket style)
    if (ws.on) {
      ws.on('message', (data: unknown) => {
        try {
          const dataStr = typeof data === 'string' ? data : String(data);
          const message = JSON.parse(dataStr) as NetworkMessage;
          this.handleMessage(peerId, message);
        } catch (error) {
          console.error('[NetworkManager] Failed to parse message:', error);
        }
      });

      // Setup close handler
      ws.on('close', () => {
        this.handlePeerDisconnect(peerId);
      });

      // Setup error handler
      ws.on('error', (error: unknown) => {
        console.error(`[NetworkManager] WebSocket error for ${peerId}:`, error);
      });
    }
  }

  // ============================================================================
  // Client Connection
  // ============================================================================

  /**
   * Connect to a remote peer
   */
  async connectToPeer(address: string): Promise<PeerId> {
    // Try browser WebSocket first
    let WebSocketClass: new (address: string) => WebSocketLike;

    if (typeof WebSocket !== 'undefined') {
      // Browser environment
      WebSocketClass = WebSocket as unknown as new (address: string) => WebSocketLike;
    } else {
      // Node.js environment
      try {
        const ws = await import('ws');
        WebSocketClass = (ws.WebSocket || ws.default) as unknown as new (address: string) => WebSocketLike;
      } catch (error) {
        throw new Error(
          'WebSocket not available. ' +
          'Install ws in Node.js: npm install ws'
        );
      }
    }

    const ws = new WebSocketClass(address);

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      ws.onopen = () => resolve();
      ws.onerror = (error: unknown) => reject(error);

      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });

    const peerId = this.generatePeerId();
    this.wsConnections.set(peerId, ws);

    // Setup handlers (browser style)
    ws.onmessage = (event: { data: string }) => {
      try {
        const message = JSON.parse(event.data) as NetworkMessage;
        this.handleMessage(peerId, message);
      } catch (error) {
        console.error('[NetworkManager] Failed to parse message:', error);
      }
    };

    ws.onclose = () => {
      this.handlePeerDisconnect(peerId);
    };

    ws.onerror = (error: unknown) => {
      console.error(`[NetworkManager] WebSocket error:`, error);
    };

    return peerId;
  }

  /**
   * Disconnect from peer
   */
  disconnectFromPeer(peerId: PeerId): void {
    const ws = this.wsConnections.get(peerId);
    if (!ws) return;

    ws.close();
    this.wsConnections.delete(peerId);

    this.handlePeerDisconnect(peerId);
  }

  /**
   * Handle peer disconnect
   */
  private handlePeerDisconnect(peerId: PeerId): void {
    this.wsConnections.delete(peerId);

    // Clean up passages for this peer
    for (const [_passageId, passage] of this.remotePassages) {
      if (passage.remotePeerId === peerId) {
        passage.connectionState = 'disconnected';
      }
    }

    // Clean up subscriptions for this peer
    for (const [passageId, subscription] of this.activeSubscriptions) {
      if (subscription.peerId === peerId) {
        clearInterval(subscription.updateInterval);
        this.activeSubscriptions.delete(passageId);
        this.entityCache.delete(passageId);
      }
    }

    // Reject pending operations
    for (const [key, pending] of this.pendingAcks) {
      if (key.startsWith(peerId)) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Peer disconnected'));
        this.pendingAcks.delete(key);
      }
    }
  }

  // ============================================================================
  // Remote Passage Management
  // ============================================================================

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
    await this.requestUniverseConfig(
      config.remotePeerId,
      config.remoteUniverseId
    );

    // Get local universe
    const localUniverse = this.multiverseCoordinator.getUniverse(
      config.localUniverseId
    );

    if (!localUniverse) {
      throw new Error(`Local universe ${config.localUniverseId} not found`);
    }

    // Calculate compatibility between universes
    const remoteConfigResponse = await this.requestUniverseConfig(
      config.remotePeerId,
      config.remoteUniverseId
    );

    if (!remoteConfigResponse) {
      throw new Error(`Failed to get remote universe config for ${config.remoteUniverseId}`);
    }

    const compatibility = this.calculateUniverseCompatibility(
      localUniverse.config,
      remoteConfigResponse
    );

    // Log compatibility warnings
    if (compatibility.warnings.length > 0) {
      console.warn(
        `[NetworkManager] Compatibility warnings for ${config.localUniverseId} <-> ${config.remoteUniverseId}:`,
        compatibility.warnings
      );
    }

    if (!compatibility.recommended) {
      console.error(
        `[NetworkManager] Low compatibility (${(compatibility.compatibilityScore * 100).toFixed(1)}%) between universes - passage creation not recommended`
      );
    }

    // Calculate costs based on compatibility
    const baseCreationCost = 1000;
    const baseTraversalCost = 100;
    const creationCost = Math.ceil(baseCreationCost * compatibility.traversalCostMultiplier);
    const traversalCost = Math.ceil(baseTraversalCost * compatibility.traversalCostMultiplier);

    // Create passage
    const passageId = this.generatePassageId();
    const passage: RemotePassage = {
      id: passageId,
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

      connectionState: 'connecting',
      lastHeartbeat: localUniverse.universeTick,
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
      health: compatibility.compatibilityScore, // Health based on compatibility
      createdAt: localUniverse.universeTick,
    };

    // Send handshake
    await this.sendPassageHandshake(passage);

    // Register passage
    this.remotePassages.set(passageId, passage);

    passage.connectionState = 'connected';


    return passage;
  }

  /**
   * Get remote passage
   */
  getRemotePassage(passageId: PassageId): RemotePassage | undefined {
    return this.remotePassages.get(passageId);
  }

  /**
   * Get all remote passages
   */
  getAllRemotePassages(): ReadonlyMap<PassageId, RemotePassage> {
    return this.remotePassages;
  }

  /**
   * Close remote passage
   */
  closeRemotePassage(passageId: PassageId): void {
    const passage = this.remotePassages.get(passageId);
    if (!passage) return;

    passage.connectionState = 'disconnected';
    this.remotePassages.delete(passageId);

  }

  // ============================================================================
  // Entity Transfer
  // ============================================================================

  /**
   * Transfer entity to remote universe through passage
   */
  async transferEntity(
    entityId: EntityId,
    passageId: PassageId
  ): Promise<EntityId> {
    const passage = this.remotePassages.get(passageId);
    if (!passage) {
      throw new Error(`Passage ${passageId} not found`);
    }

    if (passage.connectionState !== 'connected') {
      throw new Error(
        `Passage ${passageId} not connected (state: ${passage.connectionState})`
      );
    }

    // Get source universe
    const sourceUniverse = this.multiverseCoordinator.getUniverse(
      passage.from.universeId
    );

    if (!sourceUniverse) {
      throw new Error(`Source universe ${passage.from.universeId} not found`);
    }

    // Get entity from source world
    const entity = sourceUniverse.world.getEntity(entityId);
    if (!entity) {
      throw new Error(
        `Entity ${entityId} not found in universe ${passage.from.universeId}`
      );
    }

    // Serialize entity
    type WorldSerializerWithEntity = { serializeEntity(entity: unknown): Promise<unknown> };
    const serializedEntity = await (worldSerializer as unknown as WorldSerializerWithEntity).serializeEntity(entity);

    // Compute checksum
    const checksum = computeChecksumSync(serializedEntity);

    // Send transfer message
    const message: EntityTransferMessage = {
      type: 'entity_transfer',
      passageId,
      targetUniverseId: passage.to.universeId,
      entity: serializedEntity as VersionedEntity,
      checksum,
    };

    this.send(passage.remotePeerId, message);

    // Wait for acknowledgment
    const ack = await this.waitForResponse<EntityTransferAckMessage>(
      passage.remotePeerId,
      entityId
    );

    if (!ack.success) {
      throw new Error(
        `Entity transfer failed: ${ack.error || 'Unknown error'}`
      );
    }

    // Check if entity is possessed - handle cross-universe possession rules
    // Cosmology: Deity powers are multiverse-specific, but avatars can cross
    const playerControlEntities = sourceUniverse.world
      .query()
      .with('player_control', 'deity')
      .executeEntities();

    for (const deityEntity of playerControlEntities) {
      const playerControl = deityEntity.components.get('player_control');
      const deity = deityEntity.components.get('deity');

      type PlayerControlComponent = { isPossessed?: boolean; possessedAgentId?: string | null };
      type DeityComponent = { origin?: string; controller?: string };

      const typedPlayerControl = playerControl as PlayerControlComponent | undefined;
      const typedDeity = deity as DeityComponent | undefined;

      if (typedPlayerControl?.isPossessed && typedPlayerControl.possessedAgentId === entityId) {
        // Check if entity is an avatar (deity's physical manifestation)
        const isAvatar = entity.components.has('avatar');

        if (isAvatar) {
          // Avatar can cross multiverse boundaries while maintaining possession
          // No divine powers in foreign multiverse, but physical control remains
          const isSameMultiverse = this.multiverseCoordinator.areUniversesInSameMultiverse(
            passage.from.universeId,
            passage.to.universeId
          );

          if (!isSameMultiverse) {

            // Add metadata to track multiverse origin for power suppression
            const sourceMultiverseId = this.multiverseCoordinator.getMultiverseId(
              passage.from.universeId
            );

            // Update avatar component with multiverse origin
            const avatarComp = entity.components.get('avatar');
            if (avatarComp && typeof avatarComp === 'object') {
              type AvatarComponent = {
                originMultiverseId?: string;
                currentMultiverseId?: string;
                divinePowersSuppressed?: boolean;
                suppressionReason?: string;
              };
              (entity as unknown as { updateComponent<T>(type: string, updater: (current: T) => T): void }).updateComponent<AvatarComponent & { type: string }>('avatar', (current) => ({
                ...current,
                ...avatarComp,
                originMultiverseId: sourceMultiverseId,
                currentMultiverseId: this.multiverseCoordinator.getMultiverseId(
                  passage.to.universeId
                ),
                divinePowersSuppressed: true,
                suppressionReason: 'foreign_multiverse',
              }));
            }
          } else {
          }
        } else {
          // Possessing a normal agent - check deity power scope
          const isMultiverseDeity = typedDeity?.origin === 'player' && typedDeity?.controller === 'player';

          // Check if target universe is in same multiverse or foreign
          const isSameMultiverse = this.multiverseCoordinator.areUniversesInSameMultiverse(
            passage.from.universeId,
            passage.to.universeId
          );

          if (!isMultiverseDeity || !isSameMultiverse) {
            // Auto jack-out: weak deity OR crossing to foreign multiverse

            // Force jack-out
            type UpdateableEntity = { updateComponent<T>(type: string, component: T): void };
            (deityEntity as unknown as UpdateableEntity).updateComponent('player_control', {
              ...(typedPlayerControl || {}),
              isPossessed: false,
              possessedAgentId: null,
              possessionStartTick: null,
            });

            // Emit event for UI notification
            const events = this.getOrCreateEventManager(passage.from.universeId, sourceUniverse.world);
            const agentComp = entity.components.get('agent');
            const agentName = (agentComp && typeof agentComp === 'object' && 'name' in agentComp)
              ? (agentComp as { name?: string }).name || 'Unknown'
              : 'Unknown';

            events.emitGeneric('possession:cross_universe_jackout', {
              deityId: deityEntity.id,
              entityId,
              entityName: agentName,
              targetUniverseId: passage.to.universeId,
            });
          } else {
            // Multiverse deity possessing across universes in same multiverse

            // Update player control component to track cross-universe possession
            const sourceMultiverseId = this.multiverseCoordinator.getMultiverseId(
              passage.from.universeId
            );
            const targetMultiverseId = this.multiverseCoordinator.getMultiverseId(
              passage.to.universeId
            );

            type CrossUniversePlayerControl = PlayerControlComponent & {
              deityUniverseId?: string;
              deityMultiverseId?: string;
              possessedUniverseId?: string;
              possessedMultiverseId?: string;
            };
            (deityEntity as unknown as UpdateableEntity).updateComponent<CrossUniversePlayerControl>('player_control', {
              ...(typedPlayerControl || {}),
              deityUniverseId: passage.from.universeId,
              deityMultiverseId: sourceMultiverseId,
              possessedUniverseId: passage.to.universeId,
              possessedMultiverseId: targetMultiverseId,
            });
          }
        }
      }
    }

    // Remove entity from source universe
    // Cast to WorldMutator to access destroyEntity method
    type WorldMutator = { destroyEntity(entityId: string, reason: string): void };
    const worldMutator = sourceUniverse.world as unknown as WorldMutator;
    worldMutator.destroyEntity(entityId, 'Transferred to remote universe');


    return ack.newEntityId!;
  }

  // ============================================================================
  // Message Handling
  // ============================================================================

  /**
   * Handle incoming message from peer
   */
  private handleMessage(peerId: PeerId, message: NetworkMessage): void {
    switch (message.type) {
      case 'passage_handshake':
        this.handlePassageHandshake(peerId, message);
        break;

      case 'passage_handshake_ack':
        this.handlePassageHandshakeAck(peerId, message);
        break;

      case 'entity_transfer':
        this.handleEntityTransfer(peerId, message);
        break;

      case 'entity_transfer_ack':
        this.handleEntityTransferAck(peerId, message);
        break;

      case 'universe_subscribe':
        this.handleUniverseSubscribe(peerId, message);
        break;

      case 'universe_unsubscribe':
        this.handleUniverseUnsubscribe(peerId, message);
        break;

      case 'universe_config_request':
        this.handleUniverseConfigRequest(peerId, message);
        break;

      case 'universe_config_response':
        this.handleUniverseConfigResponse(peerId, message);
        break;

      case 'heartbeat':
        // Respond to heartbeat
        this.send(peerId, { type: 'heartbeat', timestamp: Date.now() });
        break;

      default:
        // Type guard for unknown message
        const unknownType = typeof message === 'object' && message !== null && 'type' in message
          ? (message as { type: unknown }).type
          : 'unknown';
        console.warn(`[NetworkManager] Unknown message type: ${unknownType}`);
    }
  }

  /**
   * Send message to peer
   */
  private send(peerId: PeerId, message: NetworkMessage): void {
    const ws = this.wsConnections.get(peerId);
    if (!ws) {
      console.error(`[NetworkManager] Cannot send to disconnected peer: ${peerId}`);
      return;
    }

    ws.send(JSON.stringify(message));
  }

  // ============================================================================
  // Protocol Handlers
  // ============================================================================

  /**
   * Send passage handshake
   */
  private async sendPassageHandshake(passage: RemotePassage): Promise<void> {
    const handshake: PassageHandshakeMessage = {
      type: 'passage_handshake',
      passageId: passage.id,
      sourceUniverseId: passage.from.universeId,
      targetUniverseId: passage.to.universeId,
      viewMode: passage.viewMode,
      interactionMode: passage.interactionMode,
      streamConfig: passage.streamConfig,
    };

    this.send(passage.remotePeerId, handshake);

    // Wait for acknowledgment
    await this.waitForAck(passage.remotePeerId, passage.id);
  }

  /**
   * Handle incoming passage handshake
   */
  private handlePassageHandshake(
    peerId: PeerId,
    message: PassageHandshakeMessage
  ): void {

    // Verify target universe exists
    const targetUniverse = this.multiverseCoordinator.getUniverse(
      message.targetUniverseId
    );

    if (!targetUniverse) {
      // Reject
      const ack: PassageHandshakeAck = {
        type: 'passage_handshake_ack',
        passageId: message.passageId,
        accepted: false,
        reason: `Universe ${message.targetUniverseId} not found`,
      };

      this.send(peerId, ack);
      return;
    }

    // Accept
    const ack: PassageHandshakeAck = {
      type: 'passage_handshake_ack',
      passageId: message.passageId,
      accepted: true,
    };

    this.send(peerId, ack);
  }

  /**
   * Handle passage handshake acknowledgment
   */
  private handlePassageHandshakeAck(
    peerId: PeerId,
    message: PassageHandshakeAck
  ): void {
    const key = `${peerId}:${message.passageId}`;
    const pending = this.pendingAcks.get(key);

    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingAcks.delete(key);

    if (message.accepted) {
      pending.resolve(message);
    } else {
      pending.reject(new Error(message.reason || 'Handshake rejected'));
    }
  }

  /**
   * Request universe config from peer
   */
  private async requestUniverseConfig(
    peerId: PeerId,
    universeId: UniverseId
  ): Promise<any> {
    const request: UniverseConfigRequest = {
      type: 'universe_config_request',
      universeId,
    };

    this.send(peerId, request);

    // Wait for response
    return this.waitForResponse<UniverseConfigResponse>(peerId, universeId);
  }

  /**
   * Handle universe config request
   */
  private handleUniverseConfigRequest(
    peerId: PeerId,
    message: UniverseConfigRequest
  ): void {
    const universe = this.multiverseCoordinator.getUniverse(message.universeId);

    if (!universe) {
      console.error(
        `[NetworkManager] Universe ${message.universeId} not found for config request`
      );
      return;
    }

    const response: UniverseConfigResponse = {
      type: 'universe_config_response',
      universeId: message.universeId,
      config: universe.config, // TODO: May need to transform this
    };

    this.send(peerId, response);
  }

  /**
   * Handle universe config response
   */
  private handleUniverseConfigResponse(
    peerId: PeerId,
    message: UniverseConfigResponse
  ): void {
    const key = `${peerId}:${message.universeId}`;
    const pending = this.pendingAcks.get(key);

    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingAcks.delete(key);
    pending.resolve(message);
  }

  /**
   * Handle incoming entity transfer
   */
  private async handleEntityTransfer(
    peerId: PeerId,
    message: EntityTransferMessage
  ): Promise<void> {

    try {
      // Validate checksum
      const actualChecksum = computeChecksumSync(message.entity);
      if (actualChecksum !== message.checksum) {
        throw new Error(
          `Checksum mismatch! Expected ${message.checksum}, got ${actualChecksum}`
        );
      }

      // Get target universe
      const targetUniverse = this.multiverseCoordinator.getUniverse(
        message.targetUniverseId
      );

      if (!targetUniverse) {
        throw new Error(
          `Target universe ${message.targetUniverseId} not found`
        );
      }

      // Deserialize entity
      type WorldSerializerWithDeserialize = { deserializeEntity(data: unknown): Promise<{ id: string }> };
      const entity = await (worldSerializer as unknown as WorldSerializerWithDeserialize).deserializeEntity(message.entity);

      // Add entity to target world
      type WorldWithEntities = { _entities: Map<string, unknown> };
      const worldImpl = targetUniverse.world as unknown as WorldWithEntities;
      const oldEntityId = entity.id;

      // Generate new entity ID for this universe
      const newEntityId = `${message.targetUniverseId}-entity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Update entity ID
      type MutableEntity = { id: string };
      (entity as MutableEntity).id = newEntityId;

      // Add to world
      worldImpl._entities.set(newEntityId, entity);


      // Send acknowledgment
      const ack: EntityTransferAckMessage = {
        type: 'entity_transfer_ack',
        oldEntityId,
        newEntityId,
        success: true,
      };

      this.send(peerId, ack);
    } catch (error) {
      console.error('[NetworkManager] Entity transfer failed:', error);

      // Send error acknowledgment
      const ack: EntityTransferAckMessage = {
        type: 'entity_transfer_ack',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };

      this.send(peerId, ack);
    }
  }

  /**
   * Handle entity transfer acknowledgment
   */
  private handleEntityTransferAck(
    peerId: PeerId,
    message: EntityTransferAckMessage
  ): void {
    const key = `${peerId}:${message.oldEntityId}`;
    const pending = this.pendingAcks.get(key);

    if (!pending) return;

    clearTimeout(pending.timeout);
    this.pendingAcks.delete(key);
    pending.resolve(message);
  }

  // ============================================================================
  // Live Universe Streaming
  // ============================================================================

  /**
   * Subscribe to universe updates through passage
   */
  subscribeToUniverse(
    passageId: PassageId,
    viewport?: import('./NetworkProtocol.js').Bounds
  ): void {
    const passage = this.remotePassages.get(passageId);
    if (!passage) {
      throw new Error(`Passage ${passageId} not found`);
    }

    if (passage.connectionState !== 'connected') {
      throw new Error(
        `Passage ${passageId} not connected (state: ${passage.connectionState})`
      );
    }

    const message: import('./NetworkProtocol.js').UniverseSubscribeMessage = {
      type: 'universe_subscribe',
      passageId,
      universeId: passage.to.universeId,
      config: passage.streamConfig,
      viewport,
    };

    this.send(passage.remotePeerId, message);

  }

  /**
   * Unsubscribe from universe updates
   */
  unsubscribeFromUniverse(passageId: PassageId): void {
    const passage = this.remotePassages.get(passageId);
    if (!passage) return;

    const message: import('./NetworkProtocol.js').UniverseUnsubscribeMessage = {
      type: 'universe_unsubscribe',
      passageId,
    };

    this.send(passage.remotePeerId, message);

  }

  /**
   * Handle incoming universe subscription request
   */
  private handleUniverseSubscribe(
    peerId: PeerId,
    message: import('./NetworkProtocol.js').UniverseSubscribeMessage
  ): void {

    // Verify universe exists
    const universe = this.multiverseCoordinator.getUniverse(message.universeId);
    if (!universe) {
      console.error(
        `[NetworkManager] Universe ${message.universeId} not found for subscription`
      );
      return;
    }

    // Create subscription
    const subscription: UniverseSubscription = {
      passageId: message.passageId,
      peerId,
      universeId: message.universeId,
      config: message.config,
      viewport: message.viewport,
      lastSentTick: universe.universeTick,
      updateInterval: setInterval(() => {
        this.sendUniverseUpdate(message.passageId);
      }, 1000 / message.config.syncFrequency),
    };

    this.activeSubscriptions.set(message.passageId, subscription);
    this.entityCache.set(message.passageId, new Map());

    // Send initial snapshot
    this.sendUniverseSnapshot(message.passageId);
  }

  /**
   * Handle unsubscribe request
   */
  private handleUniverseUnsubscribe(
    _peerId: PeerId,
    message: import('./NetworkProtocol.js').UniverseUnsubscribeMessage
  ): void {
    const subscription = this.activeSubscriptions.get(message.passageId);
    if (!subscription) return;

    // Stop update interval
    clearInterval(subscription.updateInterval);

    // Clean up
    this.activeSubscriptions.delete(message.passageId);
    this.entityCache.delete(message.passageId);

  }

  /**
   * Send initial universe snapshot
   */
  private async sendUniverseSnapshot(passageId: PassageId): Promise<void> {
    const subscription = this.activeSubscriptions.get(passageId);
    if (!subscription) return;

    const universe = this.multiverseCoordinator.getUniverse(
      subscription.universeId
    );
    if (!universe) return;

    // Get all entities
    const allEntities = Array.from(universe.world.entities.values());

    // Filter by viewport if specified
    const filteredEntities = subscription.viewport
      ? this.filterEntitiesByViewport(allEntities, subscription.viewport)
      : allEntities;

    // Apply entity filter from config
    const entities = this.applyEntityFilter(
      filteredEntities,
      subscription.config
    );

    // Serialize entities
    type EntityWithId = { id: string };
    type WorldSerializerWithSerialize = { serializeEntity(entity: unknown): Promise<unknown> };
    const serializedEntities = await Promise.all(
      entities.map(async (entity) => {
        const serialized = await (worldSerializer as unknown as WorldSerializerWithSerialize).serializeEntity(entity);
        // Cache for delta compression
        const cache = this.entityCache.get(passageId);
        if (cache && typeof entity === 'object' && entity !== null && 'id' in entity) {
          cache.set((entity as EntityWithId).id, serialized);
        }
        return serialized;
      })
    );

    const snapshot: import('./NetworkProtocol.js').UniverseSnapshotMessage = {
      type: 'universe_snapshot',
      universeId: subscription.universeId,
      tick: universe.universeTick.toString(),
      entities: serializedEntities as VersionedEntity[],
    };

    this.send(subscription.peerId, snapshot);

  }

  /**
   * Send universe tick update (delta)
   */
  private async sendUniverseUpdate(passageId: PassageId): Promise<void> {
    const subscription = this.activeSubscriptions.get(passageId);
    if (!subscription) return;

    const universe = this.multiverseCoordinator.getUniverse(
      subscription.universeId
    );
    if (!universe) return;

    // Only send if universe has advanced
    if (universe.universeTick <= subscription.lastSentTick) {
      return;
    }

    // Get all entities
    const allEntities = Array.from(universe.world.entities.values());

    // Filter by viewport if specified
    const filteredEntities = subscription.viewport
      ? this.filterEntitiesByViewport(allEntities, subscription.viewport)
      : allEntities;

    // Apply entity filter
    const currentEntities = this.applyEntityFilter(
      filteredEntities,
      subscription.config
    );

    const cache = this.entityCache.get(passageId);
    if (!cache) return;

    // Compute deltas
    const entitiesAdded: unknown[] = [];
    const entitiesUpdated: import('./NetworkProtocol.js').EntityUpdate[] = [];
    const entitiesRemoved: string[] = [];

    const currentEntityIds = new Set(currentEntities.map((e) => (e as EntityWithId).id));
    const cachedEntityIds = new Set(cache.keys());

    // Find added entities
    type WorldSerializerWithSerialize = { serializeEntity(entity: unknown): Promise<unknown> };
    for (const entity of currentEntities) {
      const entityWithId = entity as EntityWithId;
      if (!cache.has(entityWithId.id)) {
        const serialized = await (worldSerializer as unknown as WorldSerializerWithSerialize).serializeEntity(entity);
        entitiesAdded.push(serialized);
        cache.set(entityWithId.id, serialized);
      } else if (subscription.config.deltaUpdatesOnly) {
        // Check for updates
        const deltas = this.computeEntityDeltas(entity, cache.get(entityWithId.id)!);
        if (deltas.length > 0) {
          entitiesUpdated.push({
            entityId: entityWithId.id,
            deltas,
          });
          // Update cache
          const serialized = await (worldSerializer as unknown as WorldSerializerWithSerialize).serializeEntity(entity);
          cache.set(entityWithId.id, serialized);
        }
      }
    }

    // Find removed entities
    for (const cachedId of cachedEntityIds) {
      if (!currentEntityIds.has(cachedId)) {
        entitiesRemoved.push(cachedId);
        cache.delete(cachedId);
      }
    }

    // Only send if there are changes
    if (
      entitiesAdded.length > 0 ||
      entitiesUpdated.length > 0 ||
      entitiesRemoved.length > 0
    ) {
      const update: import('./NetworkProtocol.js').UniverseTickUpdate = {
        type: 'universe_tick',
        universeId: subscription.universeId,
        tick: universe.universeTick.toString(),
        entitiesAdded: entitiesAdded as VersionedEntity[],
        entitiesUpdated,
        entitiesRemoved,
        events: [], // TODO: Add event streaming
      };

      this.send(subscription.peerId, update);

    }

    subscription.lastSentTick = universe.universeTick;
  }

  /**
   * Filter entities by viewport bounds
   */
  private filterEntitiesByViewport(
    entities: readonly unknown[],
    viewport: import('./NetworkProtocol.js').Bounds
  ): unknown[] {
    type EntityWithComponents = { getComponent(type: string): unknown };
    type PositionComponent = { x: number; y: number };

    return entities.filter((entity) => {
      if (typeof entity !== 'object' || entity === null || !('getComponent' in entity)) return false;

      const pos = (entity as EntityWithComponents).getComponent('position');
      if (!pos || typeof pos !== 'object' || !('x' in pos) || !('y' in pos)) return false;

      const typedPos = pos as PositionComponent;
      return (
        typedPos.x >= viewport.x &&
        typedPos.x < viewport.x + viewport.width &&
        typedPos.y >= viewport.y &&
        typedPos.y < viewport.y + viewport.height
      );
    });
  }

  /**
   * Apply entity filter from stream config
   */
  private applyEntityFilter(
    entities: readonly unknown[],
    config: import('./NetworkProtocol.js').StreamConfiguration
  ): unknown[] {
    let filtered = [...entities];

    type EntityWithComponents = {
      hasComponent(type: string): boolean;
      getComponent(type: string): unknown;
    };
    type TagsComponent = { tags?: string[] };

    if (config.entityFilter) {
      const filter = config.entityFilter;

      // Filter by types
      if (filter.types && filter.types.length > 0) {
        filtered = filtered.filter((entity) => {
          if (typeof entity !== 'object' || entity === null || !('hasComponent' in entity)) return false;
          return filter.types!.some((type) => (entity as EntityWithComponents).hasComponent(type));
        });
      }

      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        filtered = filtered.filter((entity) => {
          if (typeof entity !== 'object' || entity === null || !('getComponent' in entity)) return false;
          const tags = (entity as EntityWithComponents).getComponent('tags');
          if (!tags || typeof tags !== 'object' || !('tags' in tags)) return false;
          return filter.tags!.some((tag) => (tags as TagsComponent).tags?.includes(tag));
        });
      }
    }

    // Limit max entities
    if (config.maxEntities && filtered.length > config.maxEntities) {
      filtered = filtered.slice(0, config.maxEntities);
    }

    return filtered;
  }

  /**
   * Compute deltas between current and cached entity state
   */
  private computeEntityDeltas(
    entity: unknown,
    cachedState: unknown
  ): import('./NetworkProtocol.js').ComponentDelta[] {
    const deltas: import('./NetworkProtocol.js').ComponentDelta[] = [];

    // Type guards
    if (typeof entity !== 'object' || entity === null || !('components' in entity)) return deltas;
    if (typeof cachedState !== 'object' || cachedState === null || !('components' in cachedState)) return deltas;

    type EntityWithComponents = { components: Map<string, unknown>; getComponent(type: string): unknown };
    type CachedStateWithComponents = { components: Array<{ type: string; data: unknown }> };

    const typedEntity = entity as EntityWithComponents;
    const typedCached = cachedState as CachedStateWithComponents;

    const currentComponents = new Set<string>(
      Array.from(typedEntity.components.keys())
    );
    const cachedComponents = new Set<string>(
      typedCached.components.map((c) => c.type)
    );

    // Added components
    for (const type of currentComponents) {
      if (!cachedComponents.has(type)) {
        const component = typedEntity.getComponent(type);
        deltas.push({
          componentType: type,
          operation: 'add',
          data: component as Partial<any> | undefined,
        });
      }
    }

    // Removed components
    for (const type of cachedComponents) {
      if (!currentComponents.has(type)) {
        deltas.push({
          componentType: type,
          operation: 'remove',
        });
      }
    }

    // Updated components (simplified - check if serialized form differs)
    for (const type of currentComponents) {
      if (cachedComponents.has(type)) {
        const current = typedEntity.getComponent(type);
        const cached = typedCached.components.find((c) => c.type === type);

        // Simple deep comparison via JSON
        if (JSON.stringify(current) !== JSON.stringify(cached?.data)) {
          deltas.push({
            componentType: type,
            operation: 'update',
            data: current as Partial<any> | undefined,
          });
        }
      }
    }

    return deltas;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get or create event manager for a universe
   */
  private getOrCreateEventManager(universeId: string, world: unknown): SystemEventManager {
    let events = this.eventManagers.get(universeId);
    if (!events) {
      // Type guard for world with eventBus
      if (typeof world !== 'object' || world === null || !('eventBus' in world)) {
        throw new Error('World does not have eventBus property');
      }
      type WorldWithEventBus = { eventBus: EventBus };
      events = new SystemEventManager((world as WorldWithEventBus).eventBus, `multiverse_network_${universeId}`);
      this.eventManagers.set(universeId, events);
    }
    return events;
  }

  /**
   * Cleanup event managers
   */
  cleanup(): void {
    for (const events of this.eventManagers.values()) {
      events.cleanup();
    }
    this.eventManagers.clear();
  }

  /**
   * Wait for acknowledgment
   */
  private async waitForAck(peerId: PeerId, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const key = `${peerId}:${id}`;

      const timeout = setTimeout(() => {
        this.pendingAcks.delete(key);
        reject(new Error('Acknowledgment timeout'));
      }, this.ACK_TIMEOUT_MS);

      this.pendingAcks.set(key, { resolve: resolve as any, reject: reject as any, timeout });
    });
  }

  /**
   * Wait for response
   */
  private async waitForResponse<T>(
    peerId: PeerId,
    id: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const key = `${peerId}:${id}`;

      const timeout = setTimeout(() => {
        this.pendingAcks.delete(key);
        reject(new Error('Response timeout'));
      }, this.ACK_TIMEOUT_MS);

      this.pendingAcks.set(key, { resolve: resolve as any, reject: reject as any, timeout });
    });
  }

  // ============================================================================
  // Universe Compatibility Calculation
  // ============================================================================

  /**
   * Calculate compatibility between two universes for remote passage creation
   *
   * Compatibility considers:
   * - Time rate differences (time scale)
   * - Physical laws similarity (if physics configs available)
   * - Reality stability (based on pause state, forking depth)
   * - Divergence level (for forked universes)
   *
   * Returns compatibility info with score 0-1 where 1 = perfectly compatible
   */
  private calculateUniverseCompatibility(
    localConfig: UniverseConfig,
    remoteConfig: UniverseConfig
  ): UniverseCompatibility {
    const warnings: string[] = [];
    const factors = {
      timeRateCompatibility: 0,
      physicsCompatibility: 0,
      realityStability: 0,
      divergenceLevel: 0,
    };

    // 1. Time rate compatibility (25% weight)
    // Time scales within 2x of each other = good, wider gaps = problematic
    const timeRatio = localConfig.timeScale / remoteConfig.timeScale;
    if (timeRatio >= 0.5 && timeRatio <= 2.0) {
      factors.timeRateCompatibility = 1.0 - Math.abs(timeRatio - 1.0) / 1.0;
    } else if (timeRatio >= 0.1 && timeRatio <= 10.0) {
      factors.timeRateCompatibility = 0.5;
      warnings.push(
        `Significant time rate difference: ${localConfig.timeScale}x vs ${remoteConfig.timeScale}x`
      );
    } else {
      factors.timeRateCompatibility = 0.2;
      warnings.push(
        `Extreme time rate difference: ${localConfig.timeScale}x vs ${remoteConfig.timeScale}x - traversal may be dangerous`
      );
    }

    // 2. Physics compatibility (25% weight)
    // Same multiverse = similar physics assumed
    if (localConfig.multiverseId === remoteConfig.multiverseId) {
      factors.physicsCompatibility = 1.0;
    } else {
      // Different multiverses may have different physics
      factors.physicsCompatibility = 0.7;
      warnings.push('Cross-multiverse passage - physics laws may differ');
    }

    // 3. Reality stability (25% weight)
    // Paused universes or deeply forked timelines are less stable
    let stabilityScore = 1.0;

    if (localConfig.paused || remoteConfig.paused) {
      stabilityScore -= 0.3;
      warnings.push('One or both universes are paused - unstable connection');
    }

    // Count forking depth (how many ancestors)
    const localDepth = this.calculateForkingDepth(localConfig);
    const remoteDepth = this.calculateForkingDepth(remoteConfig);
    const maxDepth = Math.max(localDepth, remoteDepth);

    if (maxDepth > 5) {
      stabilityScore -= 0.4;
      warnings.push(`Deep timeline nesting (depth ${maxDepth}) - reality may be unstable`);
    } else if (maxDepth > 2) {
      stabilityScore -= 0.2;
      warnings.push(`Moderate timeline nesting (depth ${maxDepth})`);
    }

    factors.realityStability = Math.max(0, stabilityScore);

    // 4. Divergence level (25% weight)
    // If connecting related timelines, check if they've diverged significantly
    if (this.areRelatedTimelines(localConfig, remoteConfig)) {
      // Related timelines (parent/child or siblings)
      // Higher divergence makes passages more unstable
      const divergenceEstimate = this.estimateDivergence(localConfig, remoteConfig);
      factors.divergenceLevel = 1.0 - divergenceEstimate;

      if (divergenceEstimate > 0.7) {
        warnings.push('Timelines have diverged significantly - passage may be unstable');
      } else if (divergenceEstimate > 0.4) {
        warnings.push('Moderate timeline divergence detected');
      }
    } else {
      // Unrelated timelines - no divergence concerns
      factors.divergenceLevel = 1.0;
    }

    // Calculate overall compatibility score (weighted average)
    const compatibilityScore =
      factors.timeRateCompatibility * 0.25 +
      factors.physicsCompatibility * 0.25 +
      factors.realityStability * 0.25 +
      factors.divergenceLevel * 0.25;

    // Calculate traversal cost multiplier based on compatibility
    // Lower compatibility = higher cost
    const traversalCostMultiplier = compatibilityScore < 0.5
      ? 1.0 / compatibilityScore  // Very incompatible = much more expensive
      : 1.0 + (1.0 - compatibilityScore) * 0.5;  // Moderately incompatible = slightly more expensive

    // Recommend passage creation if compatibility >= 0.4
    const recommended = compatibilityScore >= 0.4;

    if (!recommended) {
      warnings.push(
        `Low compatibility (${(compatibilityScore * 100).toFixed(1)}%) - passage creation not recommended`
      );
    }

    return {
      compatibilityScore,
      factors,
      warnings,
      recommended,
      traversalCostMultiplier,
    };
  }

  /**
   * Calculate forking depth (how many generations from root universe)
   */
  private calculateForkingDepth(config: UniverseConfig): number {
    let depth = 0;
    let current = config;

    // Walk up the parent chain
    while (current.parentId) {
      depth++;
      // Try to find parent config (might not be available for remote universes)
      const parent = this.multiverseCoordinator.getUniverse(current.parentId);
      if (!parent) break;
      current = parent.config;

      // Safety: prevent infinite loops
      if (depth > 100) {
        console.error(`[NetworkManager] Suspicious forking depth > 100 for ${config.id}`);
        break;
      }
    }

    return depth;
  }

  /**
   * Check if two universes are related timelines (parent/child or siblings)
   */
  private areRelatedTimelines(config1: UniverseConfig, config2: UniverseConfig): boolean {
    // Same universe
    if (config1.id === config2.id) return true;

    // Parent-child relationship
    if (config1.parentId === config2.id || config2.parentId === config1.id) return true;

    // Sibling relationship (same parent)
    if (config1.parentId && config2.parentId && config1.parentId === config2.parentId) {
      return true;
    }

    return false;
  }

  /**
   * Estimate divergence between related timelines
   * Returns 0-1 where 0 = no divergence, 1 = completely different
   */
  private estimateDivergence(config1: UniverseConfig, config2: UniverseConfig): number {
    // If not forked, no divergence
    if (!config1.forkedAtTick && !config2.forkedAtTick) return 0;

    // If one is parent of other, use time since fork as divergence estimate
    let forkTime: bigint | undefined;
    if (config1.parentId === config2.id) {
      forkTime = config1.forkedAtTick;
    } else if (config2.parentId === config1.id) {
      forkTime = config2.forkedAtTick;
    } else if (config1.forkedAtTick && config2.forkedAtTick) {
      // Siblings - use difference in fork times
      forkTime = config1.forkedAtTick > config2.forkedAtTick
        ? config1.forkedAtTick - config2.forkedAtTick
        : config2.forkedAtTick - config1.forkedAtTick;
    }

    if (!forkTime) return 0.5; // Unknown, assume moderate divergence

    // Time-based divergence estimate
    // Assume 100,000 ticks (50 minutes real-time) = significant divergence
    const ticksSinceFork = Number(forkTime);
    const divergence = Math.min(1.0, ticksSinceFork / 100000);

    return divergence;
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Generate unique peer ID
   */
  private generatePeerId(): PeerId {
    return `peer-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate unique passage ID
   */
  private generatePassageId(): PassageId {
    return `passage-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get peer address (for display)
   */
  private getPeerAddress(peerId: PeerId): string {
    // TODO: Store actual addresses
    return `peer://${peerId}`;
  }

  /**
   * Get my peer ID
   */
  getMyPeerId(): PeerId {
    return this.myPeerId;
  }

  /**
   * Get connected peers
   */
  getConnectedPeers(): PeerId[] {
    return Array.from(this.wsConnections.keys());
  }
}

// Singleton instance
export let networkManager: MultiverseNetworkManager | null = null;

/**
 * Initialize the network manager
 */
export function initializeNetworkManager(
  multiverseCoordinator: MultiverseCoordinator
): MultiverseNetworkManager {
  if (networkManager) {
    console.warn('[NetworkManager] Already initialized, returning existing instance');
    return networkManager;
  }

  networkManager = new MultiverseNetworkManager(multiverseCoordinator);
  return networkManager;
}

/**
 * Get the network manager instance
 */
export function getNetworkManager(): MultiverseNetworkManager {
  if (!networkManager) {
    throw new Error(
      'NetworkManager not initialized. Call initializeNetworkManager first.'
    );
  }

  return networkManager;
}
