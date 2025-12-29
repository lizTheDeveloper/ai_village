/**
 * ThreatTargeting - Find predators and dangers (for animals and agents)
 *
 * This class provides perception-limited threat detection.
 * Used by animals to flee from predators and agents to avoid dangers.
 *
 * Part of Phase 2 of the AISystem decomposition (work-order: ai-system-refactor)
 */

import type { Entity, EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { ResourceComponent } from '../components/ResourceComponent.js';
import { rememberLocation, getRememberedLocation, forgetLocation } from '../services/TargetingAPI.js';
import { getMovement, getPosition, getVision, getAnimal, getAgent, getResource } from '../utils/componentHelpers.js';

/**
 * Options for threat targeting
 */
export interface ThreatTargetingOptions {
  /** Types of threats to look for (e.g., 'predator', 'fire', 'hostile') */
  threatTypes?: string[];
  /** Minimum threat level to consider */
  minThreatLevel?: number;
  /** Maximum distance to detect threats */
  maxDistance?: number;
  /** Entity IDs to exclude (known safe entities) */
  excludeIds?: Set<string>;
  /** Only consider moving threats */
  movingOnly?: boolean;
}

/**
 * Threat target result
 */
export interface ThreatTarget {
  entity: Entity;
  threatType: string;
  threatLevel: number;
  distance: number;
  position: { x: number; y: number };
  velocity?: { x: number; y: number };
  isMoving: boolean;
  isApproaching: boolean;
}

/**
 * Threat summary for an entity
 */
export interface ThreatAssessment {
  hasThreats: boolean;
  nearestThreat: ThreatTarget | null;
  highestThreatLevel: number;
  totalThreats: number;
  threats: ThreatTarget[];
  fleeDirection: { x: number; y: number } | null;
}

/**
 * ThreatTargeting Class
 *
 * Usage:
 * ```typescript
 * const targeting = new ThreatTargeting();
 *
 * // Check for any threats
 * const assessment = targeting.assessThreats(animal, world);
 * if (assessment.hasThreats) {
 *   movement.moveToward(animal, assessment.fleeDirection);
 * }
 *
 * // Find specific threat type
 * const predator = targeting.findNearest(animal, world, {
 *   threatTypes: ['predator'],
 * });
 * ```
 */
export class ThreatTargeting {
  /**
   * Find the nearest visible threat matching criteria.
   */
  findNearest(
    entity: EntityImpl,
    world: World,
    options: ThreatTargetingOptions = {}
  ): ThreatTarget | null {
    const position = getPosition(entity);
    const vision = getVision(entity);

    if (!position || !vision) return null;

    let nearest: ThreatTarget | null = null;
    let nearestDist = Infinity;

    // Check all visible entities for threats
    // Note: Vision component may have seenAnimals in the future
    // For now, we combine all visible entity types
    const allVisible = [
      ...(vision.seenAgents || []),
      ...(vision.seenResources || []), // Fire/hazards might be resources
    ];

    for (const entityId of allVisible) {
      if (options.excludeIds?.has(entityId)) continue;
      if (entityId === entity.id) continue; // Don't consider self a threat

      const visibleEntity = world.getEntity(entityId);
      if (!visibleEntity) continue;

      const threatPos = getPosition(visibleEntity);
      if (!threatPos) continue;

      // Determine if this entity is a threat
      const threatInfo = this.evaluateThreat(visibleEntity as EntityImpl, entity, options);
      if (!threatInfo) continue;

      // Calculate distance
      const dist = this.distance(position, threatPos);

      // Check max distance
      if (options.maxDistance !== undefined && dist > options.maxDistance) continue;

      // Check if moving only
      if (options.movingOnly && !threatInfo.isMoving) continue;

      // Track nearest
      if (dist < nearestDist) {
        nearest = {
          entity: visibleEntity,
          threatType: threatInfo.threatType,
          threatLevel: threatInfo.threatLevel,
          distance: dist,
          position: { x: threatPos.x, y: threatPos.y },
          velocity: threatInfo.velocity,
          isMoving: threatInfo.isMoving,
          isApproaching: this.isApproaching(position, threatPos, threatInfo.velocity),
        };
        nearestDist = dist;
      }
    }

    // Remember threat location
    if (nearest) {
      rememberLocation(
        entity,
        `threat:${nearest.threatType}`,
        nearest.position,
        world.tick
      );
    }

    return nearest;
  }

  /**
   * Find all visible threats matching criteria.
   */
  findAll(
    entity: EntityImpl,
    world: World,
    options: ThreatTargetingOptions = {}
  ): ThreatTarget[] {
    const position = getPosition(entity);
    const vision = getVision(entity);

    if (!position || !vision) return [];

    const results: ThreatTarget[] = [];

    const allVisible = [
      ...(vision.seenAgents || []),
      ...(vision.seenResources || []),
    ];

    for (const entityId of allVisible) {
      if (options.excludeIds?.has(entityId)) continue;
      if (entityId === entity.id) continue;

      const visibleEntity = world.getEntity(entityId);
      if (!visibleEntity) continue;

      const threatPos = getPosition(visibleEntity);
      if (!threatPos) continue;

      const threatInfo = this.evaluateThreat(visibleEntity as EntityImpl, entity, options);
      if (!threatInfo) continue;

      const dist = this.distance(position, threatPos);
      if (options.maxDistance !== undefined && dist > options.maxDistance) continue;
      if (options.movingOnly && !threatInfo.isMoving) continue;

      results.push({
        entity: visibleEntity,
        threatType: threatInfo.threatType,
        threatLevel: threatInfo.threatLevel,
        distance: dist,
        position: { x: threatPos.x, y: threatPos.y },
        velocity: threatInfo.velocity,
        isMoving: threatInfo.isMoving,
        isApproaching: this.isApproaching(position, threatPos, threatInfo.velocity),
      });
    }

    // Sort by distance (nearest first)
    results.sort((a, b) => a.distance - b.distance);

    return results;
  }

  /**
   * Assess all threats and calculate optimal flee direction.
   */
  assessThreats(
    entity: EntityImpl,
    world: World,
    options: ThreatTargetingOptions = {}
  ): ThreatAssessment {
    const position = getPosition(entity);

    if (!position) {
      return {
        hasThreats: false,
        nearestThreat: null,
        highestThreatLevel: 0,
        totalThreats: 0,
        threats: [],
        fleeDirection: null,
      };
    }

    const threats = this.findAll(entity, world, options);

    if (threats.length === 0) {
      return {
        hasThreats: false,
        nearestThreat: null,
        highestThreatLevel: 0,
        totalThreats: 0,
        threats: [],
        fleeDirection: null,
      };
    }

    // Calculate flee direction (weighted average away from threats)
    let fleeX = 0;
    let fleeY = 0;
    let highestThreatLevel = 0;

    for (const threat of threats) {
      // Direction away from threat
      const dx = position.x - threat.position.x;
      const dy = position.y - threat.position.y;
      const dist = threat.distance || 1;

      // Weight by threat level and inverse distance (closer = more weight)
      const weight = threat.threatLevel / dist;

      fleeX += (dx / dist) * weight;
      fleeY += (dy / dist) * weight;

      if (threat.threatLevel > highestThreatLevel) {
        highestThreatLevel = threat.threatLevel;
      }
    }

    // Normalize flee direction
    const fleeMag = Math.sqrt(fleeX * fleeX + fleeY * fleeY) || 1;
    const fleeDirection = {
      x: position.x + (fleeX / fleeMag) * 10,
      y: position.y + (fleeY / fleeMag) * 10,
    };

    return {
      hasThreats: true,
      nearestThreat: threats[0] || null,
      highestThreatLevel,
      totalThreats: threats.length,
      threats,
      fleeDirection,
    };
  }

  /**
   * Get remembered threat location.
   */
  getRemembered(
    entity: EntityImpl,
    threatType: string,
    maxAge?: number,
    currentTick?: number
  ): { x: number; y: number; tick: number } | null {
    const remembered = getRememberedLocation(entity, `threat:${threatType}`);

    if (!remembered) return null;

    if (maxAge !== undefined && currentTick !== undefined) {
      if (currentTick - remembered.tick > maxAge) {
        return null;
      }
    }

    return remembered;
  }

  /**
   * Forget remembered threat location.
   */
  forgetRemembered(entity: EntityImpl, threatType: string): void {
    forgetLocation(entity, `threat:${threatType}`);
  }

  /**
   * Evaluate if an entity is a threat.
   * Returns threat info if it is, null if not.
   */
  private evaluateThreat(
    potentialThreat: EntityImpl,
    observer: EntityImpl,
    options: ThreatTargetingOptions
  ): { threatType: string; threatLevel: number; isMoving: boolean; velocity?: { x: number; y: number } } | null {
    // TODO: AnimalComponent, AgentComponent, and ResourceComponent don't currently define
    // all threat-related properties (isPredator, isHostile, etc.).
    // This is future functionality that needs proper typing when implemented.

    // Check for predator component (animals)
    const animal = getAnimal(potentialThreat);
    if (animal) {
      // Get observer's species to check predator/prey relationships
      const observerAnimal = getAnimal(observer);
      const animalAny = animal as AnimalComponent & {
        isPredator?: boolean;
        preySpecies?: string[];
        threatLevel?: number;
      };
      const observerAnimalAny = observerAnimal as AnimalComponent & { speciesId?: string } | null;

      if (observerAnimalAny && animalAny.isPredator && animalAny.preySpecies?.includes(observerAnimalAny.speciesId || '')) {
        if (options.threatTypes && !options.threatTypes.includes('predator')) {
          return null;
        }
        if (options.minThreatLevel !== undefined && (animalAny.threatLevel || 0) < options.minThreatLevel) {
          return null;
        }

        const movement = getMovement(potentialThreat);
        const isMoving = movement !== null && (Math.abs(movement.velocityX) > 0.1 || Math.abs(movement.velocityY) > 0.1);

        return {
          threatType: 'predator',
          threatLevel: animalAny.threatLevel || 50,
          isMoving,
          velocity: movement ? { x: movement.velocityX, y: movement.velocityY } : undefined,
        };
      }
    }

    // Check for hostile agent
    const agent = getAgent(potentialThreat);
    const agentAny = agent as AgentComponent & { isHostile?: boolean } | null;
    if (agentAny && agentAny.isHostile) {
      if (options.threatTypes && !options.threatTypes.includes('hostile')) {
        return null;
      }

      const movement = getMovement(potentialThreat);
      const isMoving = movement !== null && (Math.abs(movement.velocityX) > 0.1 || Math.abs(movement.velocityY) > 0.1);

      return {
        threatType: 'hostile',
        threatLevel: 75,
        isMoving,
        velocity: movement ? { x: movement.velocityX, y: movement.velocityY } : undefined,
      };
    }

    // Check for fire/hazard
    const resource = getResource(potentialThreat);
    if (resource) {
      // Cast to access potential future fire/hazard properties
      const resourceWithHazard = resource as ResourceComponent & {
        isHazard?: boolean;
        dangerLevel?: number;
      };
      const resourceType = resource.resourceType as string;

      if (resourceType === 'fire' || resourceWithHazard.isHazard) {
        if (options.threatTypes && !options.threatTypes.includes('fire') && !options.threatTypes.includes('hazard')) {
          return null;
        }

        return {
          threatType: resourceType === 'fire' ? 'fire' : 'hazard',
          threatLevel: resourceWithHazard.dangerLevel || 100,
          isMoving: false,
        };
      }
    }

    return null;
  }

  /**
   * Check if threat is moving toward observer.
   */
  private isApproaching(
    observerPos: { x: number; y: number },
    threatPos: { x: number; y: number },
    velocity?: { x: number; y: number }
  ): boolean {
    if (!velocity) return false;

    // Vector from threat to observer
    const dx = observerPos.x - threatPos.x;
    const dy = observerPos.y - threatPos.y;

    // Dot product with velocity
    const dot = dx * velocity.x + dy * velocity.y;

    // Positive dot product means moving toward
    return dot > 0;
  }

  /**
   * Calculate distance between two positions.
   */
  private distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

// ============================================================================
// Standalone functions for simpler usage
// ============================================================================

const threatTargeting = new ThreatTargeting();

/**
 * Find nearest visible threat.
 */
export function findNearestThreat(
  entity: Entity,
  world: World,
  options?: ThreatTargetingOptions
): ThreatTarget | null {
  return threatTargeting.findNearest(entity as EntityImpl, world, options);
}

/**
 * Find all visible threats.
 */
export function findAllThreats(
  entity: Entity,
  world: World,
  options?: ThreatTargetingOptions
): ThreatTarget[] {
  return threatTargeting.findAll(entity as EntityImpl, world, options);
}

/**
 * Assess all threats and get flee direction.
 */
export function assessThreats(
  entity: Entity,
  world: World,
  options?: ThreatTargetingOptions
): ThreatAssessment {
  return threatTargeting.assessThreats(entity as EntityImpl, world, options);
}

/**
 * Check if entity has any visible threats.
 */
export function hasVisibleThreats(
  entity: Entity,
  world: World,
  options?: ThreatTargetingOptions
): boolean {
  const assessment = threatTargeting.assessThreats(entity as EntityImpl, world, options);
  return assessment.hasThreats;
}

/**
 * Get optimal flee direction from all threats.
 */
export function getFleeDirection(
  entity: Entity,
  world: World,
  options?: ThreatTargetingOptions
): { x: number; y: number } | null {
  const assessment = threatTargeting.assessThreats(entity as EntityImpl, world, options);
  return assessment.fleeDirection;
}
