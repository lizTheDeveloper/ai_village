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
import type { Entity } from '../ecs/Entity.js';
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
  StreamConfiguration,
  Bounds,
  ComponentDelta,
} from './NetworkProtocol.js';
import { worldSerializer, WorldSerializer } from '../persistence/WorldSerializer.js';
import { computeChecksumSync } from '../persistence/utils.js';
import type { UniverseConfig } from './MultiverseCoordinator.js';
import type { UniversePhysicsConfig } from '../config/UniversePhysicsConfig.js';
import type { UniverseDivineConfig } from '../divinity/UniverseConfig.js';
import type { WorldMutator } from '../ecs/World.js';
import type {
  WebSocketLike,
  WebSocketServerLike,
  MutableEntity,
  PlayerControlComponent,
  DeityComponent,
  AvatarComponent,
  AgentComponent,
  UniverseCompatibility,
  PendingOperation,
} from './MultiverseTypes.js';
import { isMutableEntity } from './MultiverseTypes.js';

/**
 * Active universe subscription state
 */
interface UniverseSubscription {
  passageId: PassageId;
  peerId: PeerId;
  universeId: UniverseId;
  config: StreamConfiguration;
  viewport?: Bounds;
  lastSentTick: bigint;
  updateInterval: ReturnType<typeof setInterval>;
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
  private entityCache: Map<PassageId, Map<string, VersionedEntity>> = new Map();

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

    // Extract the universe config from the response
    // Note: remoteConfigResponse.config is UniverseDivineConfig, but we need to
    // construct a compatible UniverseConfig for compatibility calculation
    const remoteConfig: UniverseConfig = {
      id: config.remoteUniverseId,
      name: remoteConfigResponse.config.name,
      timeScale: remoteConfigResponse.config.coreParams?.divineTimeScale ?? 1.0,
      multiverseId: remoteConfigResponse.config.universeId,
      creatorId: config.creatorId,
      paused: false,
    };

    const compatibility = this.calculateUniverseCompatibility(
      localUniverse.config,
      remoteConfig
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

    // Serialize entity using WorldSerializer's private method via prototype
    const serializedEntity = await this.serializeEntityForTransfer(entity);

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

      // Use type guards instead of unsafe casts
      const typedPlayerControl = this.asPlayerControlComponent(playerControl);
      const typedDeity = this.asDeityComponent(deity);

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
            if (isMutableEntity(entity)) {
              entity.updateComponent<AvatarComponent>('avatar', (current) => ({
                ...current,
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
            if (isMutableEntity(deityEntity)) {
              deityEntity.updateComponent<PlayerControlComponent>('player_control', (current) => ({
                ...current,
                isPossessed: false,
                possessedAgentId: null,
                possessionStartTick: null,
              }));
            }

            // Emit event for UI notification
            const events = this.getOrCreateEventManager(passage.from.universeId, sourceUniverse.world);
            const agentComp = this.asAgentComponent(entity.components.get('agent'));
            const agentName = agentComp?.name || 'Unknown';

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

            if (isMutableEntity(deityEntity)) {
              deityEntity.updateComponent<PlayerControlComponent>('player_control', (current) => ({
                ...current,
                deityUniverseId: passage.from.universeId,
                deityMultiverseId: sourceMultiverseId,
                possessedUniverseId: passage.to.universeId,
                possessedMultiverseId: targetMultiverseId,
              }));
            }
          }
        }
      }
    }

    // Remove entity from source universe
    // The world is a WorldMutator which has destroyEntity method
    (sourceUniverse.world as WorldMutator).destroyEntity(entityId, 'Transferred to remote universe');


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
  ): Promise<UniverseConfigResponse> {
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

    // Get divine config from world, or construct a minimal one from universe config
    const divineConfig = (universe.world as WorldMutator).divineConfig ?? {
      universeId: message.universeId,
      name: universe.config.name,
      description: '',
      coreParams: {
        divinePresence: 0.5,
        divineReliability: 0.5,
        mortalSignificance: 0.5,
        faithVolatility: 0.5,
        permanentDivineDeathPossible: false,
        intentionalDeityCreation: false,
        maxActiveDeities: 10,
        playerGodAdvantage: 1.0,
        divineTimeScale: universe.config.timeScale,
      },
      beliefEconomy: {} as UniverseDivineConfig['beliefEconomy'],
      powers: {} as UniverseDivineConfig['powers'],
      avatars: {} as UniverseDivineConfig['avatars'],
      angels: {} as UniverseDivineConfig['angels'],
      pantheons: {} as UniverseDivineConfig['pantheons'],
      religion: {} as UniverseDivineConfig['religion'],
      emergence: {} as UniverseDivineConfig['emergence'],
      chat: {} as UniverseDivineConfig['chat'],
      domainModifiers: new Map(),
      restrictions: {} as UniverseDivineConfig['restrictions'],
    };

    const response: UniverseConfigResponse = {
      type: 'universe_config_response',
      universeId: message.universeId,
      config: divineConfig as UniverseDivineConfig,
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

      // Deserialize entity using helper method
      const entity = await this.deserializeEntityForTransfer(message.entity);
      const oldEntityId = entity.id;

      // Generate new entity ID for this universe
      const newEntityId = `${message.targetUniverseId}-entity-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // Add entity to target world with new ID
      // Use WorldMutator's internal entity registration
      this.addEntityToWorld(targetUniverse.world as WorldMutator, entity, newEntityId);


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
    const serializedEntities = await Promise.all(
      entities.map(async (entity) => {
        const serialized = await this.serializeEntityForTransfer(entity);
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

    const currentEntityIds = new Set(currentEntities.map((e) => e.id));
    const cachedEntityIds = new Set(cache.keys());

    // Find added entities
    for (const entity of currentEntities) {
      if (!cache.has(entity.id)) {
        const serialized = await this.serializeEntityForTransfer(entity);
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
          const serialized = await this.serializeEntityForTransfer(entity);
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
    entities: readonly Entity[],
    viewport: Bounds
  ): Entity[] {
    return entities.filter((entity) => {
      const pos = entity.components.get('position') as { x?: number; y?: number } | undefined;
      if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return false;

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
    entities: readonly Entity[],
    config: StreamConfiguration
  ): Entity[] {
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
          const tagsComp = entity.components.get('tags') as { tags?: string[] } | undefined;
          if (!tagsComp?.tags) return false;
          return filter.tags!.some((tag) => tagsComp.tags?.includes(tag));
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
    entity: Entity,
    cachedState: VersionedEntity
  ): ComponentDelta[] {
    const deltas: ComponentDelta[] = [];

    const currentComponents = new Set<string>(
      Array.from(entity.components.keys())
    );
    const cachedComponents = new Set<string>(
      cachedState.components.map((c) => c.type)
    );

    // Added components
    for (const type of currentComponents) {
      if (!cachedComponents.has(type)) {
        const component = entity.components.get(type);
        deltas.push({
          componentType: type,
          operation: 'add',
          data: component as Record<string, unknown> | undefined,
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
        const current = entity.components.get(type);
        const cached = cachedState.components.find((c) => c.type === type);

        // Simple deep comparison via JSON
        if (JSON.stringify(current) !== JSON.stringify(cached?.data)) {
          deltas.push({
            componentType: type,
            operation: 'update',
            data: current as Record<string, unknown> | undefined,
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
  private getOrCreateEventManager(universeId: string, world: WorldMutator): SystemEventManager {
    let events = this.eventManagers.get(universeId);
    if (!events) {
      events = new SystemEventManager(world.eventBus, `multiverse_network_${universeId}`);
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
    return new Promise<void>((resolve, reject) => {
      const key = `${peerId}:${id}`;

      const timeout = setTimeout(() => {
        this.pendingAcks.delete(key);
        reject(new Error('Acknowledgment timeout'));
      }, this.ACK_TIMEOUT_MS);

      // Store operation with typed resolve wrapper
      const operation: PendingOperation<unknown> = {
        resolve: () => resolve(),
        reject,
        timeout
      };
      this.pendingAcks.set(key, operation);
    });
  }

  /**
   * Wait for response
   */
  private async waitForResponse<T>(
    peerId: PeerId,
    id: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const key = `${peerId}:${id}`;

      const timeout = setTimeout(() => {
        this.pendingAcks.delete(key);
        reject(new Error('Response timeout'));
      }, this.ACK_TIMEOUT_MS);

      // Store operation with typed resolve wrapper
      const operation: PendingOperation<unknown> = {
        resolve: (value: unknown) => resolve(value as T),
        reject,
        timeout
      };
      this.pendingAcks.set(key, operation);
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

  // ============================================================================
  // Entity Serialization Helpers
  // ============================================================================

  /**
   * Serialize an entity for network transfer.
   * Uses WorldSerializer's internal serialization.
   */
  private async serializeEntityForTransfer(entity: Entity): Promise<VersionedEntity> {
    // Access WorldSerializer's private serializeEntity method via prototype
    // This is necessary because the method is private but we need it for network transfer
    const serializeEntity = (worldSerializer as unknown as {
      serializeEntity(entity: Entity): Promise<VersionedEntity>;
    }).serializeEntity.bind(worldSerializer);

    return serializeEntity(entity);
  }

  /**
   * Deserialize an entity from network transfer.
   * Uses WorldSerializer's internal deserialization.
   */
  private async deserializeEntityForTransfer(data: VersionedEntity): Promise<Entity> {
    // Access WorldSerializer's private deserializeEntity method via prototype
    const deserializeEntity = (worldSerializer as unknown as {
      deserializeEntity(data: VersionedEntity): Promise<Entity>;
    }).deserializeEntity.bind(worldSerializer);

    return deserializeEntity(data);
  }

  /**
   * Add a deserialized entity to the world with a new ID.
   * Handles the internal mutation required for entity transfer.
   */
  private addEntityToWorld(world: WorldMutator, entity: Entity, newEntityId: string): void {
    // Access the internal entities map to set the entity with new ID
    // This is necessary because we need to change the entity's ID during transfer
    interface WorldWithEntitiesMap {
      _entities: Map<string, Entity>;
    }

    // Update entity ID via mutable reference
    (entity as unknown as { id: string }).id = newEntityId;

    // Add to world's entity map
    const worldImpl = world as unknown as WorldWithEntitiesMap;
    worldImpl._entities.set(newEntityId, entity);
  }

  // ============================================================================
  // Component Type Guards
  // ============================================================================

  /**
   * Type guard for PlayerControlComponent
   */
  private asPlayerControlComponent(component: unknown): PlayerControlComponent | undefined {
    if (!component || typeof component !== 'object') return undefined;
    const comp = component as Record<string, unknown>;
    if (comp.type !== 'player_control') return undefined;
    return component as PlayerControlComponent;
  }

  /**
   * Type guard for DeityComponent
   */
  private asDeityComponent(component: unknown): DeityComponent | undefined {
    if (!component || typeof component !== 'object') return undefined;
    const comp = component as Record<string, unknown>;
    if (comp.type !== 'deity') return undefined;
    return component as DeityComponent;
  }

  /**
   * Type guard for AgentComponent
   */
  private asAgentComponent(component: unknown): AgentComponent | undefined {
    if (!component || typeof component !== 'object') return undefined;
    const comp = component as Record<string, unknown>;
    if (comp.type !== 'agent') return undefined;
    return component as AgentComponent;
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
