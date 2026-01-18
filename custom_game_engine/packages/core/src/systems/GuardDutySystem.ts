import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { Component } from '../ecs/Component.js';
import type { GuardDutyComponent } from '../components/GuardDutyComponent.js';
import type { ConflictComponent } from '../components/ConflictComponent.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';

interface PositionComponent extends Component {
  readonly type: 'position';
  readonly version: number;
  x: number;
  y: number;
  z: number;
}

interface AnimalComponent extends Component {
  readonly type: 'animal';
  readonly version: number;
  species: string;
  danger: number;
}

interface AlertComponent extends Component {
  readonly type: 'alert';
  readonly version: number;
  alertType: string;
  location: { x: number; y: number; z: number };
  threatId?: string;
}

/**
 * GuardDutySystem - Handles guard duty mechanics
 *
 * Implements REQ-CON-010: Guard Duty
 * - Manages guard assignments (location, person, patrol)
 * - Decays alertness over time
 * - Performs periodic threat checks
 * - Emits alerts to other guards
 * - Selects appropriate responses
 */
export class GuardDutySystem extends BaseSystem {
  public readonly id: SystemId = 'guard_duty';
  public readonly priority = 48;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['guard_duty'];
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private readonly ALERTNESS_DECAY_RATE = 0.0001; // Per millisecond
  private readonly THREAT_CHECK_INTERVAL = 5000; // 5 seconds
  private readonly LOW_ALERTNESS_THRESHOLD = 0.2;

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const duty = ctx.world.getComponent<GuardDutyComponent>(entity.id, 'guard_duty');
      if (!duty) continue;

      // Validate assignment - skip if invalid
      if (!this.validateAssignment(duty)) continue;

      // Decay alertness
      this.decayAlertness(entity, duty, ctx.deltaTime);

      // Perform threat checks
      this.performThreatCheck(ctx.world, entity, duty, ctx.activeEntities);

      // Update patrol position if needed
      if (duty.assignmentType === 'patrol') {
        this.updatePatrol(ctx.world, entity, duty);
      }
    }
  }

  /**
   * Validate guard assignment. Returns false if invalid (skip processing).
   */
  private validateAssignment(duty: GuardDutyComponent): boolean {
    if (!duty.assignmentType) {
      return false; // No assignment type - skip
    }

    switch (duty.assignmentType) {
      case 'location':
        if (!duty.targetLocation) {
          return false; // Invalid location guard - skip
        }
        break;
      case 'person':
        if (!duty.targetPerson) {
          return false; // Invalid person guard - skip
        }
        break;
      case 'patrol':
        if (!duty.patrolRoute || duty.patrolRoute.length === 0) {
          return false; // Invalid patrol - skip
        }
        break;
    }
    return true;
  }

  private decayAlertness(entity: Entity, duty: GuardDutyComponent, deltaTime: number): void {
    const entityImpl = entity as EntityImpl;

    const newAlertness = Math.max(0, duty.alertness - deltaTime * this.ALERTNESS_DECAY_RATE);

    entityImpl.updateComponent<GuardDutyComponent>('guard_duty', (d) => ({
      ...d,
      alertness: newAlertness,
    }));

    // Emit low alertness warning
    if (newAlertness < this.LOW_ALERTNESS_THRESHOLD && duty.alertness >= this.LOW_ALERTNESS_THRESHOLD) {
      this.events.emit('guard:alertness_low', {
        guardId: entity.id,
        alertness: newAlertness,
      }, entity.id);
    }
  }

  private performThreatCheck(
    world: World,
    guard: Entity,
    duty: GuardDutyComponent,
    entities: ReadonlyArray<Entity>
  ): void {
    const now = Date.now();
    const lastCheck = duty.lastCheckTime || 0;

    if (now - lastCheck < this.THREAT_CHECK_INTERVAL) {
      return; // Too soon for next check
    }

    // Update last check time
    const guardImpl = guard as EntityImpl;
    guardImpl.updateComponent<GuardDutyComponent>('guard_duty', (d) => ({
      ...d,
      lastCheckTime: now,
    }));

    // Get guard position
    const guardPos = world.getComponent<PositionComponent>(guard.id, 'position');
    if (!guardPos) {
      return;
    }

    // Determine watch location based on assignment type
    let watchLocation: { x: number; y: number; z: number } = guardPos;

    if (duty.assignmentType === 'location' && duty.targetLocation) {
      watchLocation = duty.targetLocation;
    } else if (duty.assignmentType === 'person' && duty.targetPerson) {
      const targetPos = world.getComponent<PositionComponent>(duty.targetPerson, 'position');
      if (targetPos) {
        watchLocation = targetPos;
      }
    }

    // Find threats within response radius
    const threats = this.findThreats(world, watchLocation, duty.responseRadius, entities, guard.id);

    // Process each threat
    for (const threat of threats) {
      this.handleThreat(world, guard, duty, threat, watchLocation);
    }
  }

  private findThreats(
    world: World,
    location: { x: number; y: number; z: number },
    radius: number,
    entities: ReadonlyArray<Entity>,
    guardId: string
  ): Array<{ entity: Entity; distance: number; threatLevel: number }> {
    const threats: Array<{ entity: Entity; distance: number; threatLevel: number }> = [];

    for (const entity of entities) {
      if (entity.id === guardId) continue;

      const pos = world.getComponent<PositionComponent>(entity.id, 'position');
      if (!pos) continue;

      const distance = this.calculateDistance(location, pos);
      if (distance > radius) continue;

      // Check if entity is a threat
      const threatLevel = this.assessThreatLevel(world, entity);
      if (threatLevel > 0) {
        threats.push({ entity, distance, threatLevel });
      }
    }

    // Sort by threat level (high to low) then distance (close to far)
    threats.sort((a, b) => {
      if (a.threatLevel !== b.threatLevel) {
        return b.threatLevel - a.threatLevel;
      }
      return a.distance - b.distance;
    });

    return threats;
  }

  private assessThreatLevel(world: World, entity: Entity): number {
    let threatLevel = 0;

    // Check for active conflicts
    if (world.hasComponent(entity.id, 'conflict')) {
      const conflict = world.getComponent<ConflictComponent>(entity.id, 'conflict');
      if (conflict && conflict.state !== 'resolved') {
        threatLevel += 5; // Active combatants are high priority
      }
    }

    // Check for dangerous animals
    if (world.hasComponent(entity.id, 'animal')) {
      const animal = world.getComponent<AnimalComponent>(entity.id, 'animal');
      if (animal && animal.danger >= 5) {
        threatLevel += animal.danger; // Predators are threats
      }
    }

    // Check for hostile agents (would need faction/relationship system)
    // For now, assume all unknowns are potential threats

    return threatLevel;
  }

  private handleThreat(
    world: World,
    guard: Entity,
    duty: GuardDutyComponent,
    threat: { entity: Entity; distance: number; threatLevel: number },
    watchLocation: { x: number; y: number; z: number }
  ): void {
    // Detection chance based on alertness
    const detectionChance = duty.alertness;

    if (Math.random() > detectionChance) {
      return; // Failed to detect threat
    }

    // Emit threat detected event
    this.events.emit('guard:threat_detected', {
      guardId: guard.id,
      threatId: threat.entity.id,
      threatLevel: threat.threatLevel,
      distance: threat.distance,
      location: watchLocation,
    }, guard.id);

    // Add alert component to guard
    const guardImpl = guard as EntityImpl;
    guardImpl.addComponent({
      type: 'alert',
      version: 1,
      alertType: 'threat_detected',
      location: watchLocation,
      threatId: threat.entity.id,
    } as AlertComponent);

    // Boost alertness
    guardImpl.updateComponent<GuardDutyComponent>('guard_duty', (d) => ({
      ...d,
      alertness: Math.min(1.0, d.alertness + 0.3),
    }));

    // Determine response
    const response = this.selectResponse(duty, threat);

    // Execute response
    this.executeResponse(world, guard, threat.entity, response);
  }

  private selectResponse(
    duty: GuardDutyComponent,
    threat: { entity: Entity; distance: number; threatLevel: number }
  ): 'alert_others' | 'intercept' | 'observe' | 'flee' {
    // High threat and close distance -> intercept
    if (threat.threatLevel >= 7 && threat.distance <= duty.responseRadius * 0.5) {
      return 'intercept';
    }

    // Medium threat -> alert others
    if (threat.threatLevel >= 4) {
      return 'alert_others';
    }

    // Low alertness -> observe
    if (duty.alertness < 0.5) {
      return 'observe';
    }

    // Default: alert others
    return 'alert_others';
  }

  private executeResponse(
    _world: World,
    guard: Entity,
    threat: Entity,
    response: 'alert_others' | 'intercept' | 'observe' | 'flee'
  ): void {
    this.events.emit('guard:response', {
      guardId: guard.id,
      threatId: threat.id,
      response,
    }, guard.id);

    // Actual response implementation would depend on other systems
    // For now, just emit the event
  }

  private updatePatrol(world: World, entity: Entity, duty: GuardDutyComponent): void {
    if (!duty.patrolRoute || duty.patrolRoute.length === 0) {
      return;
    }

    const entityPos = world.getComponent<PositionComponent>(entity.id, 'position');
    if (!entityPos) {
      return;
    }

    const currentWaypoint = duty.patrolRoute[duty.patrolIndex || 0];
    if (!currentWaypoint) {
      return;
    }

    // Check if arrived at waypoint
    const distance = this.calculateDistance(entityPos, currentWaypoint);
    if (distance < 1.0) {
      // Move to next waypoint
      const entityImpl = entity as EntityImpl;
      const nextIndex = ((duty.patrolIndex || 0) + 1) % duty.patrolRoute.length;

      entityImpl.updateComponent<GuardDutyComponent>('guard_duty', (d) => ({
        ...d,
        patrolIndex: nextIndex,
      }));
    }
  }

  private calculateDistance(
    pos1: { x: number; y: number; z: number },
    pos2: { x: number; y: number; z: number }
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
