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
  alertedBy?: string;
}

interface GuardResponseComponent extends Component {
  readonly type: 'guard_response';
  readonly version: number;
  action: 'alert_others' | 'intercept' | 'observe' | 'flee';
  threatId: string;
}

interface ThreatLevelComponent extends Component {
  readonly type: 'threat_level';
  readonly version: number;
  level: 'low' | 'moderate' | 'high' | 'critical';
}

interface CombatStatsComponent extends Component {
  readonly type: 'combat_stats';
  readonly version: number;
  combatSkill: number;
  stealthSkill?: number;
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
  // Only run when guard_duty components exist (O(1) activation check)
  public readonly activationComponents = ['guard_duty'] as const;
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private readonly ALERTNESS_DECAY_RATE = 0.0001; // Per millisecond
  private readonly THREAT_CHECK_INTERVAL = 5000; // 5 seconds
  private readonly LOW_ALERTNESS_THRESHOLD = 0.2;

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const duty = entity.getComponent('guard_duty') as GuardDutyComponent | undefined;
      if (!duty) continue;

      // Validate assignment - remove component if invalid
      if (!this.validateAssignment(duty)) {
        console.warn('[GuardDutySystem] Removing invalid guard_duty component from entity', entity.id);
        (entity as any).removeComponent('guard_duty');
        continue;
      }

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
   * Validate guard assignment. Returns false if invalid (component should be removed).
   */
  private validateAssignment(duty: GuardDutyComponent): boolean {
    if (!duty.assignmentType) {
      console.warn('[GuardDutySystem] Invalid guard duty: missing assignmentType');
      return false;
    }

    switch (duty.assignmentType) {
      case 'location':
        if (!duty.targetLocation) {
          console.warn('[GuardDutySystem] Invalid location guard: missing targetLocation');
          return false;
        }
        break;
      case 'person':
        if (!duty.targetPerson) {
          console.warn('[GuardDutySystem] Invalid person guard: missing targetPerson');
          return false;
        }
        break;
      case 'patrol':
        if (!duty.patrolRoute || duty.patrolRoute.length === 0) {
          console.warn('[GuardDutySystem] Invalid patrol guard: missing or empty patrolRoute');
          return false;
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
    const guardPos = guard.getComponent('position') as PositionComponent | undefined;
    if (!guardPos) {
      return;
    }

    // Determine watch location based on assignment type
    let watchLocation: { x: number; y: number; z: number } = guardPos;

    if (duty.assignmentType === 'location' && duty.targetLocation) {
      watchLocation = duty.targetLocation;
    } else if (duty.assignmentType === 'person' && duty.targetPerson) {
      const targetEntity = world.getEntity(duty.targetPerson);
      if (targetEntity) {
        const targetPos = targetEntity.getComponent('position') as PositionComponent | undefined;
        if (targetPos) {
          watchLocation = targetPos;
        }
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

      const pos = entity.getComponent('position') as PositionComponent | undefined;
      if (!pos) continue;

      const distance = this.calculateDistance(location, pos);
      if (distance > radius) continue;

      // Check if entity is a threat
      const threatLevel = this.assessThreatLevel(entity);
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

  private assessThreatLevel(entity: Entity): number {
    let threatLevel = 0;

    // Check for explicit threat_level component
    if (entity.hasComponent('threat_level')) {
      const threat = entity.getComponent('threat_level') as ThreatLevelComponent | undefined;
      if (threat) {
        switch (threat.level) {
          case 'low':
            threatLevel += 2;
            break;
          case 'moderate':
            threatLevel += 4;
            break;
          case 'high':
            threatLevel += 7;
            break;
          case 'critical':
            threatLevel += 10;
            break;
        }
      }
    }

    // Check for active conflicts
    if (entity.hasComponent('conflict')) {
      const conflict = entity.getComponent('conflict') as ConflictComponent | undefined;
      if (conflict && conflict.state !== 'resolved') {
        threatLevel += 5; // Active combatants are high priority
      }
    }

    // Check for dangerous animals
    if (entity.hasComponent('animal')) {
      const animal = entity.getComponent('animal') as AnimalComponent | undefined;
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
    // Detection chance based on alertness and threat's stealth
    let detectionChance = duty.alertness;

    // Factor in threat's stealth skill (reduces detection chance)
    const threatCombatStats = threat.entity.getComponent('combat_stats') as CombatStatsComponent | undefined;
    if (threatCombatStats && threatCombatStats.stealthSkill !== undefined) {
      // Higher stealth reduces detection chance (max 10 skill = -0.5 detection)
      const stealthModifier = threatCombatStats.stealthSkill * 0.05;
      detectionChance = Math.max(0.1, detectionChance - stealthModifier);
    }

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
    const response = this.selectResponse(world, guard, duty, threat);

    // Execute response
    this.executeResponse(world, guard, threat.entity, response);
  }

  private selectResponse(
    world: World,
    guard: Entity,
    duty: GuardDutyComponent,
    threat: { entity: Entity; distance: number; threatLevel: number }
  ): 'alert_others' | 'intercept' | 'observe' | 'flee' {
    // Get guard's combat skill
    const guardCombatStats = guard.getComponent('combat_stats') as CombatStatsComponent | undefined;
    const guardCombatSkill = guardCombatStats?.combatSkill || 5;

    // Check threat level from component
    const threatLevelComp = threat.entity.getComponent('threat_level') as ThreatLevelComponent | undefined;
    const threatLevelName = threatLevelComp?.level;

    // Critical threat and low combat skill -> flee
    if (threatLevelName === 'critical' && guardCombatSkill <= 5) {
      return 'flee';
    }

    // High threat and high combat skill -> intercept
    if (threatLevelName === 'high' && guardCombatSkill >= 8) {
      return 'intercept';
    }

    // High threat without high skill -> alert others
    if (threatLevelName === 'high') {
      return 'alert_others';
    }

    // Moderate threat -> alert others
    if (threatLevelName === 'moderate' || threat.threatLevel >= 4) {
      return 'alert_others';
    }

    // Low threat -> observe
    if (threatLevelName === 'low' || threat.threatLevel <= 2) {
      return 'observe';
    }

    // Default: alert others
    return 'alert_others';
  }

  private executeResponse(
    world: World,
    guard: Entity,
    threat: Entity,
    response: 'alert_others' | 'intercept' | 'observe' | 'flee'
  ): void {
    const guardImpl = guard as EntityImpl;

    // Add guard_response component
    guardImpl.addComponent({
      type: 'guard_response',
      version: 1,
      action: response,
      threatId: threat.id,
    } as GuardResponseComponent);

    this.events.emit('guard:response', {
      guardId: guard.id,
      threatId: threat.id,
      response,
    }, guard.id);

    // If response is to alert others, propagate to nearby guards
    if (response === 'alert_others') {
      this.propagateAlert(world, guard, threat);
    }

    // Actual response implementation would depend on other systems
    // For now, just emit the event and alert component
  }

  private propagateAlert(world: World, alertingGuard: Entity, threat: Entity): void {
    const alertingGuardPos = alertingGuard.getComponent('position') as PositionComponent | undefined;
    if (!alertingGuardPos) return;

    const alertingGuardDuty = alertingGuard.getComponent('guard_duty') as GuardDutyComponent | undefined;
    if (!alertingGuardDuty) return;

    // Find other guards within response radius
    const allEntities = Array.from(world.entities.values());
    for (const entity of allEntities) {
      if (entity.id === alertingGuard.id) continue;

      // Check if entity is a guard
      if (!entity.hasComponent('guard_duty')) continue;

      const guardPos = entity.getComponent('position') as PositionComponent | undefined;
      if (!guardPos) continue;

      const distance = this.calculateDistance(alertingGuardPos, guardPos);
      if (distance > alertingGuardDuty.responseRadius) continue;

      // Alert this guard
      const entityImpl = entity as EntityImpl;
      entityImpl.addComponent({
        type: 'alert',
        version: 1,
        alertType: 'threat_detected',
        location: alertingGuardPos,
        threatId: threat.id,
        alertedBy: alertingGuard.id,
      } as AlertComponent);

      // Boost their alertness
      entityImpl.updateComponent<GuardDutyComponent>('guard_duty', (d) => ({
        ...d,
        alertness: Math.min(1.0, d.alertness + 0.2),
      }));
    }
  }

  private updatePatrol(world: World, entity: Entity, duty: GuardDutyComponent): void {
    if (!duty.patrolRoute || duty.patrolRoute.length === 0) {
      return;
    }

    const entityPos = entity.getComponent('position') as PositionComponent | undefined;
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
