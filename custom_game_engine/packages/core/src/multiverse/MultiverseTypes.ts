/**
 * MultiverseTypes - Shared type definitions for multiverse networking
 *
 * These types are used across MultiverseNetworkManager, NetworkProtocol,
 * and related modules. Centralized here to avoid circular dependencies
 * and inline type definitions.
 */

import type { VersionedEntity } from '../persistence/types.js';
import type { Entity } from '../ecs/Entity.js';
import type { Component } from '../ecs/Component.js';
import type { ComponentType } from '../types.js';

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * Structural type for WebSocket that works in both browser and Node.js.
 * Uses structural typing to avoid direct dependency on ws package.
 */
export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  onopen?: ((event: unknown) => void) | null;
  onclose?: ((event: unknown) => void) | null;
  onerror?: ((error: unknown) => void) | null;
  onmessage?: ((event: { data: string }) => void) | null;
}

/**
 * Structural type for WebSocket server.
 */
export interface WebSocketServerLike {
  close(): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

// ============================================================================
// Entity Mutation Types
// ============================================================================

/**
 * Entity with updateComponent method for mutation operations.
 * Used when we need to mutate entity components through the EntityImpl interface.
 */
export interface MutableEntity extends Entity {
  updateComponent<T extends Component>(
    type: string,
    updater: ((current: T) => T) | Partial<T>
  ): void;
  addComponent(component: Component): void;
  removeComponent(type: string): void;
}

/**
 * Type guard to check if an entity supports mutation.
 */
export function isMutableEntity(entity: Entity): entity is MutableEntity {
  return (
    typeof (entity as MutableEntity).updateComponent === 'function' &&
    typeof (entity as MutableEntity).addComponent === 'function'
  );
}

// ============================================================================
// Component Type Definitions
// ============================================================================

/**
 * Player control component - tracks deity possession state.
 */
export interface PlayerControlComponent extends Component {
  readonly type: 'player_control';
  isPossessed?: boolean;
  possessedAgentId?: string | null;
  possessionStartTick?: number | null;
  deityUniverseId?: string;
  deityMultiverseId?: string;
  possessedUniverseId?: string;
  possessedMultiverseId?: string;
}

/**
 * Deity component - tracks deity origin and controller.
 */
export interface DeityComponent extends Component {
  readonly type: 'deity';
  origin?: string;
  controller?: string;
}

/**
 * Avatar component - deity's physical manifestation.
 */
export interface AvatarComponent extends Component {
  readonly type: 'avatar';
  originMultiverseId?: string;
  currentMultiverseId?: string;
  divinePowersSuppressed?: boolean;
  suppressionReason?: string;
}

/**
 * Agent component - basic agent information.
 */
export interface AgentComponent extends Component {
  readonly type: 'agent';
  name?: string;
}

// ============================================================================
// World Serializer Types
// ============================================================================

/**
 * WorldSerializer interface for entity serialization.
 * Extracted from WorldSerializer class for type-safe usage.
 */
export interface WorldSerializerInterface {
  serializeEntity(entity: Entity): Promise<VersionedEntity>;
  deserializeEntity(data: VersionedEntity): Promise<Entity>;
}

// ============================================================================
// World Mutator Types
// ============================================================================

/**
 * Minimal world mutator interface for entity destruction.
 * Used when we need to destroy entities during transfer.
 */
export interface WorldWithDestroyEntity {
  destroyEntity(entityId: string, reason: string): void;
}

/**
 * World with direct entity access for low-level operations.
 * Used for entity transfer where we need to manipulate the entity map directly.
 */
export interface WorldWithEntityMap {
  _entities: Map<string, Entity>;
}

// ============================================================================
// Network Compatibility Types
// ============================================================================

/**
 * Universe compatibility information for passage creation.
 */
export interface UniverseCompatibility {
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
 * Pending operations for request/response pattern.
 */
export interface PendingOperation<T> {
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

// Re-export types from NetworkProtocol that are commonly used together
export type { StreamConfiguration, Bounds } from './NetworkProtocol.js';

// Import the types for use in this file (after re-export to avoid issues)
import type { StreamConfiguration as StreamConfig, Bounds as BoundsType } from './NetworkProtocol.js';

/**
 * Active universe subscription state.
 */
export interface UniverseSubscription {
  passageId: string;
  peerId: string;
  universeId: string;
  config: StreamConfig;
  viewport?: BoundsType;
  lastSentTick: bigint;
  updateInterval: ReturnType<typeof setInterval>;
}

// ============================================================================
// Component Delta Types
// ============================================================================

/**
 * Type-safe component data for deltas.
 * Uses Record<string, unknown> instead of Partial<any> for type safety.
 */
export type ComponentData = Record<string, unknown>;
