/**
 * Typed component accessor helpers.
 *
 * These eliminate the need for `as any` casts when accessing components.
 * Each function returns null if the component doesn't exist, making the
 * null check explicit and type-safe.
 *
 * @example
 * // BEFORE (unsafe, uses 'any'):
 * const agent = impl.getComponent('agent') as any;
 * const needs = impl.getComponent('needs') as any;
 *
 * // AFTER (type-safe):
 * const agent = getAgent(impl);
 * const needs = getNeeds(impl);
 * if (!agent || !needs) return; // TypeScript knows types after this
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { Component } from '../ecs/Component.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { MovementComponent } from '../components/MovementComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';
import type { InventoryComponent } from '../components/InventoryComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import type { MemoryComponent } from '../components/MemoryComponent.js';
import type { SteeringComponent } from '../components/SteeringComponent.js';
import type { VelocityComponent } from '../components/VelocityComponent.js';
import type { CircadianComponent } from '../components/CircadianComponent.js';
import type { TemperatureComponent } from '../components/TemperatureComponent.js';
import type { PlantComponent } from '../components/PlantComponent.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';
import type { BuildingComponent } from '../components/BuildingComponent.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import type { SpatialMemoryComponent } from '../components/SpatialMemoryComponent.js';
import type { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import type { SemanticMemoryComponent } from '../components/SemanticMemoryComponent.js';
import type { ReflectionComponent } from '../components/ReflectionComponent.js';
import type { ConversationComponent } from '../components/ConversationComponent.js';
import type { SocialGradientComponent } from '../components/SocialGradientComponent.js';
import type { TrustNetworkComponent } from '../components/TrustNetworkComponent.js';
import type { BeliefComponent } from '../components/BeliefComponent.js';
import type { RelationshipComponent } from '../components/RelationshipComponent.js';

/**
 * Helper to get typed component from entity (works with Entity or EntityImpl)
 */
function getTypedComponent<T extends Component>(entity: Entity | EntityImpl, type: string): T | null {
  // EntityImpl has getComponent, Entity interface doesn't expose it
  const impl = entity as EntityImpl;
  if (typeof impl.getComponent === 'function') {
    return impl.getComponent<T>(type) ?? null;
  }
  // Fallback to components map for Entity interface
  return (entity.components.get(type) as T) ?? null;
}

// ============================================================================
// Core Agent Components
// ============================================================================

/** Get AgentComponent - the agent's behavior and state */
export function getAgent(entity: Entity): AgentComponent | null {
  return getTypedComponent<AgentComponent>(entity, 'agent');
}

/** Get PositionComponent - entity's world position */
export function getPosition(entity: Entity): PositionComponent | null {
  return getTypedComponent<PositionComponent>(entity, 'position');
}

/** Get MovementComponent - basic movement state */
export function getMovement(entity: Entity): MovementComponent | null {
  return getTypedComponent<MovementComponent>(entity, 'movement');
}

/** Get NeedsComponent - hunger, energy, health */
export function getNeeds(entity: Entity): NeedsComponent | null {
  return getTypedComponent<NeedsComponent>(entity, 'needs');
}

/** Get InventoryComponent - items the agent carries */
export function getInventory(entity: Entity): InventoryComponent | null {
  return getTypedComponent<InventoryComponent>(entity, 'inventory');
}

// ============================================================================
// Perception Components
// ============================================================================

/** Get VisionComponent - what the agent can see */
export function getVision(entity: Entity): VisionComponent | null {
  return getTypedComponent<VisionComponent>(entity, 'vision');
}

/** Get MemoryComponent - agent's short-term memory */
export function getMemory(entity: Entity): MemoryComponent | null {
  return getTypedComponent<MemoryComponent>(entity, 'memory');
}

/** Get SpatialMemoryComponent - remembered locations */
export function getSpatialMemory(entity: Entity): SpatialMemoryComponent | null {
  return getTypedComponent<SpatialMemoryComponent>(entity, 'spatial_memory');
}

/** Get EpisodicMemoryComponent - specific remembered events */
export function getEpisodicMemory(entity: Entity): EpisodicMemoryComponent | null {
  return getTypedComponent<EpisodicMemoryComponent>(entity, 'episodic_memory');
}

/** Get SemanticMemoryComponent - beliefs and knowledge */
export function getSemanticMemory(entity: Entity): SemanticMemoryComponent | null {
  return getTypedComponent<SemanticMemoryComponent>(entity, 'semantic_memory');
}

/** Get ReflectionComponent - agent reflections */
export function getReflection(entity: Entity): ReflectionComponent | null {
  return getTypedComponent<ReflectionComponent>(entity, 'reflection');
}

// ============================================================================
// Social Components
// ============================================================================

/** Get ConversationComponent - conversation state and messages */
export function getConversation(entity: Entity): ConversationComponent | null {
  return getTypedComponent<ConversationComponent>(entity, 'conversation');
}

/** Get SocialGradientComponent - directional resource hints from other agents */
export function getSocialGradient(entity: Entity): SocialGradientComponent | null {
  return getTypedComponent<SocialGradientComponent>(entity, 'social_gradient');
}

/** Get TrustNetworkComponent - trust scores and verification history */
export function getTrustNetwork(entity: Entity): TrustNetworkComponent | null {
  return getTypedComponent<TrustNetworkComponent>(entity, 'trust_network');
}

/** Get BeliefComponent - agent beliefs formed from patterns */
export function getBelief(entity: Entity): BeliefComponent | null {
  return getTypedComponent<BeliefComponent>(entity, 'belief');
}

/** Get RelationshipComponent - relationship data with other entities */
export function getRelationship(entity: Entity): RelationshipComponent | null {
  return getTypedComponent<RelationshipComponent>(entity, 'relationship');
}

// ============================================================================
// Navigation Components
// ============================================================================

/** Get SteeringComponent - steering behavior for movement */
export function getSteering(entity: Entity): SteeringComponent | null {
  return getTypedComponent<SteeringComponent>(entity, 'steering');
}

/** Get VelocityComponent - current velocity */
export function getVelocity(entity: Entity): VelocityComponent | null {
  return getTypedComponent<VelocityComponent>(entity, 'velocity');
}

// ============================================================================
// Status Components
// ============================================================================

/** Get CircadianComponent - sleep/wake cycle */
export function getCircadian(entity: Entity): CircadianComponent | null {
  return getTypedComponent<CircadianComponent>(entity, 'circadian');
}

/** Get TemperatureComponent - body temperature */
export function getTemperature(entity: Entity): TemperatureComponent | null {
  return getTypedComponent<TemperatureComponent>(entity, 'temperature');
}

// ============================================================================
// Identity Components
// ============================================================================

/** Get IdentityComponent - agent's name and identity */
export function getIdentity(entity: Entity): IdentityComponent | null {
  return getTypedComponent<IdentityComponent>(entity, 'identity');
}

/** Get PersonalityComponent - agent's personality traits */
export function getPersonality(entity: Entity): PersonalityComponent | null {
  return getTypedComponent<PersonalityComponent>(entity, 'personality');
}

// ============================================================================
// World Entity Components
// ============================================================================

/** Get PlantComponent - plant entity state */
export function getPlant(entity: Entity): PlantComponent | null {
  return getTypedComponent<PlantComponent>(entity, 'plant');
}

/** Get AnimalComponent - animal entity state */
export function getAnimal(entity: Entity): AnimalComponent | null {
  return getTypedComponent<AnimalComponent>(entity, 'animal');
}

/** Get BuildingComponent - building entity state */
export function getBuilding(entity: Entity): BuildingComponent | null {
  return getTypedComponent<BuildingComponent>(entity, 'building');
}

/** Get ResourceComponent - resource deposit state */
export function getResource(entity: Entity): ResourceComponent | null {
  return getTypedComponent<ResourceComponent>(entity, 'resource');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if entity has all required components.
 * Useful for early returns in system update loops.
 *
 * @example
 * if (!hasComponents(entity, ['agent', 'position', 'needs'])) continue;
 */
export function hasComponents(entity: Entity, types: string[]): boolean {
  const impl = entity as EntityImpl;
  if (typeof impl.hasComponent === 'function') {
    return types.every(type => impl.hasComponent(type));
  }
  return types.every(type => entity.components.has(type));
}

/**
 * Require component or throw with helpful error message.
 * Use when component MUST exist (internal invariant).
 *
 * @example
 * const agent = requireAgent(entity); // throws if missing
 */
export function requireAgent(entity: Entity): AgentComponent {
  const agent = getAgent(entity);
  if (!agent) {
    throw new Error(`Entity ${entity.id} missing required 'agent' component`);
  }
  return agent;
}

export function requirePosition(entity: Entity): PositionComponent {
  const pos = getPosition(entity);
  if (!pos) {
    throw new Error(`Entity ${entity.id} missing required 'position' component`);
  }
  return pos;
}

export function requireNeeds(entity: Entity): NeedsComponent {
  const needs = getNeeds(entity);
  if (!needs) {
    throw new Error(`Entity ${entity.id} missing required 'needs' component`);
  }
  return needs;
}

export function requireInventory(entity: Entity): InventoryComponent {
  const inv = getInventory(entity);
  if (!inv) {
    throw new Error(`Entity ${entity.id} missing required 'inventory' component`);
  }
  return inv;
}

export function requireSteering(entity: Entity): SteeringComponent {
  const steering = getSteering(entity);
  if (!steering) {
    throw new Error(`Entity ${entity.id} missing required 'steering' component`);
  }
  return steering;
}

export function requireVelocity(entity: Entity): VelocityComponent {
  const velocity = getVelocity(entity);
  if (!velocity) {
    throw new Error(`Entity ${entity.id} missing required 'velocity' component`);
  }
  return velocity;
}
