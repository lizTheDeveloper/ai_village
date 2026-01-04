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

// WebSocket type (works in both browser and Node.js)
type WebSocket = any;
type WebSocketServer = any;

/**
 * Pending operations (for request/response pattern)
 */
interface PendingOperation<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
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
  updateInterval: NodeJS.Timeout;
}

export class MultiverseNetworkManager {
  private multiverseCoordinator: MultiverseCoordinator;

  // WebSocket connections
  private wsServer: WebSocketServer | null = null;
  private wsConnections: Map<PeerId, WebSocket> = new Map();

  // Remote passages
  private remotePassages: Map<PassageId, RemotePassage> = new Map();

  // Pending operations
  private pendingAcks: Map<string, PendingOperation<any>> = new Map();

  // Active subscriptions (passageId -> subscription state)
  private activeSubscriptions: Map<PassageId, UniverseSubscription> = new Map();

  // Cached entity states for delta compression (passageId -> entityId -> last sent state)
  private entityCache: Map<PassageId, Map<string, any>> = new Map();

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

      this.wsServer = new WebSocketServer({ port });

      this.wsServer.on('connection', (ws: WebSocket) => {
        this.handleNewConnection(ws);
      });

      this.wsServer.on('error', (error: Error) => {
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
  private handleNewConnection(ws: WebSocket): void {
    const peerId = this.generatePeerId();
    this.wsConnections.set(peerId, ws);


    // Setup message handler
    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data.toString()) as NetworkMessage;
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
    ws.on('error', (error: Error) => {
      console.error(`[NetworkManager] WebSocket error for ${peerId}:`, error);
    });
  }

  // ============================================================================
  // Client Connection
  // ============================================================================

  /**
   * Connect to a remote peer
   */
  async connectToPeer(address: string): Promise<PeerId> {
    // Try browser WebSocket first
    let WebSocketClass: any;

    if (typeof WebSocket !== 'undefined') {
      // Browser environment
      WebSocketClass = WebSocket;
    } else {
      // Node.js environment
      try {
        const ws = await import('ws');
        WebSocketClass = ws.WebSocket || ws.default;
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
      ws.onerror = (error: any) => reject(error);

      // Timeout after 10 seconds
      setTimeout(() => reject(new Error('Connection timeout')), 10000);
    });

    const peerId = this.generatePeerId();
    this.wsConnections.set(peerId, ws);

    // Setup handlers
    ws.onmessage = (event: any) => {
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

    ws.onerror = (error: any) => {
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

    // TODO: Calculate compatibility between universes
    // const remoteConfig = await this.requestUniverseConfig(...);
    // const compatibility = calculateCompatibility(localUniverse.config, remoteConfig);

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

      creationCost: 1000, // TODO: Calculate based on compatibility
      traversalCost: 100,
      health: 1.0,
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
    const serializedEntity = await (worldSerializer as any).serializeEntity(
      entity
    );

    // Compute checksum
    const checksum = computeChecksumSync(serializedEntity);

    // Send transfer message
    const message: EntityTransferMessage = {
      type: 'entity_transfer',
      passageId,
      targetUniverseId: passage.to.universeId,
      entity: serializedEntity,
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
      const playerControl = deityEntity.components.get('player_control') as any;
      const deity = deityEntity.components.get('deity') as any;

      if (playerControl?.isPossessed && playerControl.possessedAgentId === entityId) {
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
            const avatarComp = entity.components.get('avatar') as any;
            if (avatarComp) {
              (entity as any).updateComponent('avatar', {
                ...avatarComp,
                originMultiverseId: sourceMultiverseId,
                currentMultiverseId: this.multiverseCoordinator.getMultiverseId(
                  passage.to.universeId
                ),
                divinePowersSuppressed: true,
                suppressionReason: 'foreign_multiverse',
              });
            }
          } else {
          }
        } else {
          // Possessing a normal agent - check deity power scope
          const isMultiverseDeity = deity?.origin === 'player' && deity?.controller === 'player';

          // Check if target universe is in same multiverse or foreign
          const isSameMultiverse = this.multiverseCoordinator.areUniversesInSameMultiverse(
            passage.from.universeId,
            passage.to.universeId
          );

          if (!isMultiverseDeity || !isSameMultiverse) {
            // Auto jack-out: weak deity OR crossing to foreign multiverse

            // Force jack-out
            (deityEntity as any).updateComponent('player_control', {
              ...playerControl,
              isPossessed: false,
              possessedAgentId: null,
              possessionStartTick: null,
            });

            // Emit event for UI notification
            sourceUniverse.world.eventBus.emit({
              type: 'possession:cross_universe_jackout',
              source: 'multiverse-network-manager',
              data: {
                deityId: deityEntity.id,
                entityId,
                entityName: (entity.components.get('agent') as any)?.name || 'Unknown',
                targetUniverseId: passage.to.universeId,
              },
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

            (deityEntity as any).updateComponent('player_control', {
              ...playerControl,
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
    const worldMutator = sourceUniverse.world as any;
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
        console.warn(`[NetworkManager] Unknown message type: ${(message as any).type}`);
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
      const entity = await (worldSerializer as any).deserializeEntity(
        message.entity
      );

      // Add entity to target world
      const worldImpl = targetUniverse.world as any;
      const oldEntityId = entity.id;

      // Generate new entity ID for this universe
      const newEntityId = `${message.targetUniverseId}-entity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Update entity ID
      (entity as any).id = newEntityId;

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
      }, 1000 / message.config.syncFrequency) as any,
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
    const serializedEntities = await Promise.all(
      entities.map(async (entity) => {
        const serialized = await (worldSerializer as any).serializeEntity(
          entity
        );
        // Cache for delta compression
        const cache = this.entityCache.get(passageId);
        if (cache) {
          cache.set(entity.id, serialized);
        }
        return serialized;
      })
    );

    const snapshot: import('./NetworkProtocol.js').UniverseSnapshotMessage = {
      type: 'universe_snapshot',
      universeId: subscription.universeId,
      tick: universe.universeTick.toString(),
      entities: serializedEntities,
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
    const entitiesAdded: any[] = [];
    const entitiesUpdated: import('./NetworkProtocol.js').EntityUpdate[] = [];
    const entitiesRemoved: string[] = [];

    const currentEntityIds = new Set(currentEntities.map((e) => e.id));
    const cachedEntityIds = new Set(cache.keys());

    // Find added entities
    for (const entity of currentEntities) {
      if (!cache.has(entity.id)) {
        const serialized = await (worldSerializer as any).serializeEntity(
          entity
        );
        entitiesAdded.push(serialized);
        cache.set(entity.id, serialized);
      } else if (subscription.config.deltaUpdatesOnly) {
        // Check for updates
        const deltas = this.computeEntityDeltas(entity, cache.get(entity.id)!);
        if (deltas.length > 0) {
          entitiesUpdated.push({
            entityId: entity.id,
            deltas,
          });
          // Update cache
          const serialized = await (worldSerializer as any).serializeEntity(
            entity
          );
          cache.set(entity.id, serialized);
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
        entitiesAdded,
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
    entities: readonly any[],
    viewport: import('./NetworkProtocol.js').Bounds
  ): any[] {
    return entities.filter((entity) => {
      const pos = entity.getComponent('position') as any;
      if (!pos) return false;

      return (
        pos.x >= viewport.x &&
        pos.x < viewport.x + viewport.width &&
        pos.y >= viewport.y &&
        pos.y < viewport.y + viewport.height
      );
    });
  }

  /**
   * Apply entity filter from stream config
   */
  private applyEntityFilter(
    entities: readonly any[],
    config: import('./NetworkProtocol.js').StreamConfiguration
  ): any[] {
    let filtered = [...entities];

    if (config.entityFilter) {
      const filter = config.entityFilter;

      // Filter by types
      if (filter.types && filter.types.length > 0) {
        filtered = filtered.filter((entity) => {
          return filter.types!.some((type) => entity.hasComponent(type));
        });
      }

      // Filter by tags
      if (filter.tags && filter.tags.length > 0) {
        filtered = filtered.filter((entity) => {
          const tags = entity.getComponent('tags') as any;
          if (!tags) return false;
          return filter.tags!.some((tag) => tags.tags?.includes(tag));
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
    entity: any,
    cachedState: any
  ): import('./NetworkProtocol.js').ComponentDelta[] {
    const deltas: import('./NetworkProtocol.js').ComponentDelta[] = [];

    const currentComponents = new Set<string>(
      Array.from(entity.components.keys()) as string[]
    );
    const cachedComponents = new Set<string>(
      cachedState.components.map((c: any) => c.type as string)
    );

    // Added components
    for (const type of currentComponents) {
      if (!cachedComponents.has(type)) {
        const component = entity.getComponent(type);
        deltas.push({
          componentType: type as string,
          operation: 'add',
          data: component,
        });
      }
    }

    // Removed components
    for (const type of cachedComponents) {
      if (!currentComponents.has(type)) {
        deltas.push({
          componentType: type as string,
          operation: 'remove',
        });
      }
    }

    // Updated components (simplified - check if serialized form differs)
    for (const type of currentComponents) {
      if (cachedComponents.has(type)) {
        const current = entity.getComponent(type);
        const cached = cachedState.components.find((c: any) => c.type === type);

        // Simple deep comparison via JSON
        if (JSON.stringify(current) !== JSON.stringify(cached?.data)) {
          deltas.push({
            componentType: type as string,
            operation: 'update',
            data: current,
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
   * Wait for acknowledgment
   */
  private async waitForAck(peerId: PeerId, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const key = `${peerId}:${id}`;

      const timeout = setTimeout(() => {
        this.pendingAcks.delete(key);
        reject(new Error('Acknowledgment timeout'));
      }, this.ACK_TIMEOUT_MS);

      this.pendingAcks.set(key, { resolve, reject, timeout });
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

      this.pendingAcks.set(key, { resolve, reject, timeout });
    });
  }

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
