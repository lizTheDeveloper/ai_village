/**
 * Network Protocol - Message types for networked multiverse communication
 */

import type { Position } from '../types.js';
import type { VersionedEntity } from '../persistence/types.js';

// ============================================================================
// Core Types
// ============================================================================

export type EntityId = string;
export type ComponentType = string;
export type UniverseId = string;
export type PassageId = string;
export type PeerId = string;

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ============================================================================
// Passage Types
// ============================================================================

export type ViewMode = 'none' | 'observe' | 'participate';

export type InteractionMode = 'none' | 'limited' | 'full' | 'collaborative';

export interface StreamConfiguration {
  /** Update frequency in Hz (1-60) */
  syncFrequency: number;

  /** Include entities in stream */
  includeEntities: boolean;

  /** Include events in stream */
  includeEvents: boolean;

  /** Include terrain in stream */
  includeTerrain: boolean;

  /** Entity filter */
  entityFilter?: {
    types?: string[];
    tags?: string[];
    owned?: boolean;
  };

  /** Max entities to stream */
  maxEntities?: number;

  /** Compression level (0-9) */
  compressionLevel: number;

  /** Only send deltas */
  deltaUpdatesOnly: boolean;
}

export interface RemotePassage {
  id: PassageId;
  type: 'remote';

  // Network connection
  remoteHost: string;
  remotePeerId: PeerId;
  remoteUniverseId: UniverseId;

  // Connection state
  connectionState: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastHeartbeat: bigint;
  reconnectAttempts: number;

  // Endpoints
  from: {
    universeId: UniverseId;
    position?: Position;
  };

  to: {
    universeId: UniverseId;
    position?: Position;
  };

  // Viewing
  viewMode: ViewMode;
  viewportBounds?: Bounds;

  // Interaction
  interactionMode: InteractionMode;

  // Streaming
  streamConfig: StreamConfiguration;

  // Security
  authToken?: string;
  encryption: boolean;
  requiresAuthentication: boolean;

  // Access control
  owners: string[];
  accessPolicy: 'private' | 'shared' | 'public';

  // Costs (like other passage types)
  creationCost: number;
  traversalCost: number;
  health: number;
  createdAt: bigint;
}

// ============================================================================
// Network Messages
// ============================================================================

/**
 * Passage handshake - initial connection setup
 */
export interface PassageHandshakeMessage {
  type: 'passage_handshake';
  passageId: PassageId;
  sourceUniverseId: UniverseId;
  targetUniverseId: UniverseId;
  viewMode: ViewMode;
  interactionMode: InteractionMode;
  streamConfig: StreamConfiguration;
}

export interface PassageHandshakeAck {
  type: 'passage_handshake_ack';
  passageId: PassageId;
  accepted: boolean;
  reason?: string;
}

/**
 * Entity transfer - move entity to remote universe
 */
export interface EntityTransferMessage {
  type: 'entity_transfer';
  passageId: PassageId;
  targetUniverseId: UniverseId;
  entity: VersionedEntity;
  checksum: string;
}

export interface EntityTransferAckMessage {
  type: 'entity_transfer_ack';
  oldEntityId?: EntityId;
  newEntityId?: EntityId;
  success: boolean;
  error?: string;
}

/**
 * Universe streaming - subscribe to universe updates
 */
export interface UniverseSubscribeMessage {
  type: 'universe_subscribe';
  passageId: PassageId;
  universeId: UniverseId;
  config: StreamConfiguration;
  viewport?: Bounds;
}

export interface UniverseUnsubscribeMessage {
  type: 'universe_unsubscribe';
  passageId: PassageId;
}

export interface UniverseSnapshotMessage {
  type: 'universe_snapshot';
  universeId: UniverseId;
  tick: string; // Serialized bigint
  entities: VersionedEntity[];
}

export interface ComponentDelta {
  componentType: ComponentType;
  operation: 'add' | 'update' | 'remove';
  data?: Partial<any>;
}

export interface EntityUpdate {
  entityId: EntityId;
  deltas: ComponentDelta[];
}

export interface UniverseTickUpdate {
  type: 'universe_tick';
  universeId: UniverseId;
  tick: string; // Serialized bigint

  entitiesAdded: VersionedEntity[];
  entitiesUpdated: EntityUpdate[];
  entitiesRemoved: EntityId[];

  events: any[]; // GameEvent[]
}

/**
 * Remote interaction - player action in remote universe
 */
export interface RemoteInteraction {
  type: 'click' | 'spell' | 'command';
  position?: Position;
  entityId?: EntityId;
  data?: any;
}

export interface RemoteInteractionMessage {
  type: 'remote_interaction';
  passageId: PassageId;
  interaction: RemoteInteraction;
}

/**
 * Universe config request - get universe configuration
 */
export interface UniverseConfigRequest {
  type: 'universe_config_request';
  universeId: UniverseId;
}

export interface UniverseConfigResponse {
  type: 'universe_config_response';
  universeId: UniverseId;
  config: any; // UniverseDivineConfig
}

/**
 * Heartbeat - keep connection alive
 */
export interface HeartbeatMessage {
  type: 'heartbeat';
  timestamp: number;
}

/**
 * Union type of all network messages
 */
export type NetworkMessage =
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

// ============================================================================
// Configuration
// ============================================================================

export interface RemotePassageConfig {
  localUniverseId: UniverseId;
  remoteUniverseId: UniverseId;
  remotePeerId: PeerId;
  creatorId: EntityId;

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
