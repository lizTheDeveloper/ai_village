/**
 * ThreatResponseSystem
 *
 * Automatically scans for threats and makes decisions based on:
 * - Agent personality (courage, aggression)
 * - Power differential (can they win?)
 * - Threat type (melee vs ranged)
 * - Available cover (for ranged threats)
 *
 * Responses:
 * - Auto-flee: Power differential too low + low courage
 * - Auto-attack: Power differential favorable + high aggression
 * - Auto-cover: Ranged threat detected + cover available
 * - Stand ground: Even match + moderate courage
 */

interface System {
  readonly id: string;
  readonly dependencies?: string[];
  update(world: World): void;
}

import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { ThreatDetectionComponent, DetectedThreat, ThreatResponse } from '../components/ThreatDetectionComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import type { SkillsComponent } from '../components/SkillsComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';
import type { VisionComponent } from '../components/VisionComponent.js';
import type { CombatStatsComponent } from '../components/CombatStatsComponent.js';
import type { EquipmentComponent } from '../components/EquipmentComponent.js';
import {
  calculatePowerDifferential,
  isCriticalThreat,
  canLikelyWin,
  isEvenMatch,
} from '../components/ThreatDetectionComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';

export class ThreatResponseSystem implements System {
  public readonly name = 'ThreatResponseSystem';
  private readonly UPDATE_INTERVAL = 5; // Every 5 ticks (~0.25 seconds)
  private lastUpdateTick = 0;

  update(world: World): void {
    // Throttle updates
    if (world.tick - this.lastUpdateTick < this.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = world.tick;

    // Get all entities with threat detection
    const entities = world.query()
      .with(CT.ThreatDetection)
      .with(CT.Position)
      .with(CT.Personality)
      .executeEntities();

    for (const entity of entities) {
      this.processEntity(entity, world);
    }
  }

  private processEntity(entity: Entity, world: World): void {
    const threatComp = entity.getComponent<ThreatDetectionComponent>(CT.ThreatDetection);
    const position = entity.getComponent<PositionComponent>(CT.Position);
    const personality = entity.getComponent<PersonalityComponent>(CT.Personality);

    if (!threatComp || !position || !personality) return;

    // Scan for threats if scan interval elapsed
    if (world.tick - threatComp.lastScanTime >= threatComp.scanInterval) {
      this.scanForThreats(entity, world, threatComp, position);
      threatComp.lastScanTime = world.tick;
    }

    // If threats detected, determine response
    if (threatComp.threats.length > 0) {
      const response = this.determineResponse(
        threatComp,
        personality,
        entity,
        world
      );

      threatComp.currentResponse = response;

      // Execute auto-response
      this.executeResponse(entity, response, world);
    } else {
      // Clear response if no threats
      threatComp.currentResponse = undefined;
    }
  }

  private scanForThreats(
    entity: Entity,
    world: World,
    threatComp: ThreatDetectionComponent,
    position: PositionComponent
  ): void {
    const threats: DetectedThreat[] = [];

    // Update own power level
    threatComp.ownPowerLevel = this.calculateAgentPower(entity);

    // Scan for hostile agents
    const vision = entity.getComponent<VisionComponent>(CT.Vision);
    if (vision?.seenAgents) {
      for (const agentId of vision.seenAgents) {
        const otherAgent = world.getEntity(agentId);
        if (!otherAgent || otherAgent.id === entity.id) continue;

        // Check if hostile (for now, check conflict component or wild animal)
        const isHostile = this.isHostile(entity, otherAgent, world);
        if (!isHostile) continue;

        const threat = this.createThreatFromAgent(otherAgent, position, world);
        if (threat) threats.push(threat);
      }
    }

    // Scan for wild animals
    const allAnimals = world.query()?.with?.(CT.Animal)?.executeEntities?.() ?? [];
    for (const animal of allAnimals) {
      const animalComp = animal.getComponent<any>(CT.Animal);
      if (!animalComp || animalComp.tamed) continue;

      const threat = this.createThreatFromAnimal(animal, position, world);
      if (threat) threats.push(threat);
    }

    // TODO: Scan for incoming projectiles (when projectile system exists)
    // This would check for entities with ProjectileComponent heading toward agent

    threatComp.threats = threats;
  }

  private calculateAgentPower(entity: Entity): number {
    let power = 50; // Base power

    // Combat skill contributes heavily
    const skills = entity.getComponent<SkillsComponent>(CT.Skills);
    if (skills) {
      const combatLevel = skills.levels.combat ?? 0;
      power += combatLevel * 10; // +10 per combat level
    }

    // Combat stats
    const combatStats = entity.getComponent<CombatStatsComponent>(CT.CombatStats);
    if (combatStats) {
      power += combatStats.attack;
      power += combatStats.defense / 2;
    }

    // Equipment bonus
    const equipment = entity.getComponent<EquipmentComponent>(CT.Equipment);
    if (equipment) {
      // Weapon adds power
      if (equipment.slots.weapon) {
        power += 15; // Basic weapon bonus
      }
      // Armor adds defensive power
      if (equipment.slots.armor) {
        power += 10;
      }
    }

    // Health percentage affects effective power
    const health = entity.getComponent<any>(CT.Health);
    if (health) {
      const healthPercent = health.current / health.max;
      power *= healthPercent;
    }

    return Math.min(100, Math.max(0, power));
  }

  private isHostile(agent: Entity, other: Entity, world: World): boolean {
    // Check for conflict component
    const conflict = other.getComponent<any>(CT.Conflict);
    if (conflict?.targetId === agent.id) return true;

    // Check for wild aggressive animals
    const animal = other.getComponent<any>(CT.Animal);
    if (animal && !animal.tamed && animal.danger > 3) {
      return true; // Dangerous wild animals are hostile
    }

    // TODO: Check faction/team relationships when those systems exist

    return false;
  }

  private createThreatFromAgent(
    hostile: Entity,
    agentPos: PositionComponent,
    world: World
  ): DetectedThreat | null {
    const hostilePos = hostile.getComponent<PositionComponent>(CT.Position);
    if (!hostilePos) return null;

    const dx = hostilePos.x - agentPos.x;
    const dy = hostilePos.y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only detect within 30 tiles
    if (distance > 30) return null;

    const direction = { x: dx / distance, y: dy / distance };

    // Calculate hostile's power
    const powerLevel = this.calculateAgentPower(hostile);

    // Determine attack type (check equipment for ranged weapons)
    const equipment = hostile.getComponent<EquipmentComponent>(CT.Equipment);
    const hasRangedWeapon = equipment?.slots.weapon?.itemId?.includes('bow') ||
                            equipment?.slots.weapon?.itemId?.includes('gun') ||
                            equipment?.slots.weapon?.itemId?.includes('crossbow');

    return {
      threatId: hostile.id,
      type: 'hostile_agent',
      attackType: hasRangedWeapon ? 'ranged' : 'melee',
      powerLevel,
      distance,
      direction,
      detectedAt: world.tick,
    };
  }

  private createThreatFromAnimal(
    animal: Entity,
    agentPos: PositionComponent,
    world: World
  ): DetectedThreat | null {
    const animalPos = animal.getComponent<PositionComponent>(CT.Position);
    const animalComp = animal.getComponent<any>(CT.Animal);
    if (!animalPos || !animalComp) return null;

    const dx = animalPos.x - agentPos.x;
    const dy = animalPos.y - agentPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Only detect aggressive animals within 20 tiles
    if (distance > 20 || animalComp.danger < 3) return null;

    const direction = { x: dx / distance, y: dy / distance };

    // Animal power based on danger level
    const powerLevel = animalComp.danger * 10; // danger 5 = 50 power

    return {
      threatId: animal.id,
      type: 'wild_animal',
      attackType: 'melee', // Most animals are melee
      powerLevel,
      distance,
      direction,
      detectedAt: world.tick,
    };
  }

  private determineResponse(
    threatComp: ThreatDetectionComponent,
    personality: PersonalityComponent,
    entity: Entity,
    world: World
  ): ThreatResponse {
    // Find most dangerous threat
    const primaryThreat = threatComp.threats.reduce((max, threat) =>
      threat.powerLevel > max.powerLevel ? threat : max
    );

    const differential = calculatePowerDifferential(
      threatComp.ownPowerLevel,
      primaryThreat.powerLevel
    );

    // Personality factors
    const courage = personality.courage ?? 0.5;
    const aggression = personality.aggression ?? 0.5;

    // Decision matrix based on power differential and personality

    // CRITICAL THREAT: Much stronger enemy
    if (isCriticalThreat(differential)) {
      // Even brave agents flee from overwhelming threats
      if (courage < 0.9) {
        return {
          action: 'flee',
          targetId: primaryThreat.threatId,
          fleeDirection: {
            x: -primaryThreat.direction.x,
            y: -primaryThreat.direction.y,
          },
          reason: `Critical threat detected (${differential} power diff), fleeing`,
        };
      }
      // Extremely brave (9/10) agents seek cover instead
      return this.findCoverResponse(primaryThreat, entity, world, differential);
    }

    // STRONG THREAT: Moderately stronger
    if (differential < -10) {
      // Low courage = flee
      if (courage < 0.4) {
        return {
          action: 'flee',
          fleeDirection: {
            x: -primaryThreat.direction.x,
            y: -primaryThreat.direction.y,
          },
          reason: `Outmatched (${differential} power diff) and low courage, fleeing`,
        };
      }

      // Ranged threat = seek cover
      if (primaryThreat.attackType === 'ranged' || primaryThreat.attackType === 'magic') {
        return this.findCoverResponse(primaryThreat, entity, world, differential);
      }

      // Moderate courage = stand ground
      return {
        action: 'stand_ground',
        reason: `Outmatched but courageous (${courage.toFixed(2)}), standing ground`,
      };
    }

    // CAN LIKELY WIN: Much stronger
    if (canLikelyWin(differential)) {
      // High aggression = attack
      if (aggression > 0.5) {
        return {
          action: 'attack',
          targetId: primaryThreat.threatId,
          reason: `Superior power (${differential} diff) and aggressive, attacking`,
        };
      }

      // Low aggression = stand ground (defensive posture)
      return {
        action: 'stand_ground',
        reason: `Superior power but low aggression, standing ground`,
      };
    }

    // EVEN MATCH
    if (isEvenMatch(differential)) {
      // Ranged threat = seek cover
      if (primaryThreat.attackType === 'ranged' || primaryThreat.attackType === 'magic') {
        return this.findCoverResponse(primaryThreat, entity, world, differential);
      }

      // High aggression = attack
      if (aggression > 0.6) {
        return {
          action: 'attack',
          targetId: primaryThreat.threatId,
          reason: `Even match but high aggression (${aggression.toFixed(2)}), attacking`,
        };
      }

      // Moderate = stand ground
      return {
        action: 'stand_ground',
        reason: `Even match, standing ground`,
      };
    }

    // Default: stand ground
    return {
      action: 'stand_ground',
      reason: `Threat detected, assessing situation`,
    };
  }

  private findCoverResponse(
    threat: DetectedThreat,
    entity: Entity,
    world: World,
    differential: number
  ): ThreatResponse {
    // Try to find cover (buildings, trees, terrain features)
    const position = entity.getComponent<PositionComponent>(CT.Position);
    if (!position) {
      return {
        action: 'flee',
        fleeDirection: {
          x: -threat.direction.x,
          y: -threat.direction.y,
        },
        reason: `Ranged threat but no cover found, fleeing`,
      };
    }

    // Look for nearby buildings
    const vision = entity.getComponent<VisionComponent>(CT.Vision);
    if (vision?.seenBuildings && vision.seenBuildings.length > 0) {
      // Find closest building
      let closestBuilding: Entity | null = null;
      let closestDist = Infinity;

      for (const buildingId of vision.seenBuildings) {
        const building = world.getEntity(buildingId);
        const buildingPos = building?.getComponent<PositionComponent>(CT.Position);
        if (!buildingPos) continue;

        const dx = buildingPos.x - position.x;
        const dy = buildingPos.y - position.y;
        const dist = dx * dx + dy * dy; // Squared distance

        if (dist < closestDist) {
          closestDist = dist;
          closestBuilding = building;
        }
      }

      if (closestBuilding) {
        const coverPos = closestBuilding.getComponent<PositionComponent>(CT.Position);
        if (coverPos) {
          return {
            action: 'seek_cover',
            coverPosition: { x: coverPos.x, y: coverPos.y },
            reason: `Ranged threat detected, seeking cover behind building`,
          };
        }
      }
    }

    // No cover found - flee perpendicular to threat direction
    const perpendicular = {
      x: -threat.direction.y,
      y: threat.direction.x,
    };

    return {
      action: 'flee',
      fleeDirection: perpendicular,
      reason: `Ranged threat, no cover available, fleeing sideways`,
    };
  }

  private executeResponse(entity: Entity, response: ThreatResponse, world: World): void {
    // Emit event for other systems to react
    world.eventBus.emit({
      type: 'threat:auto_response',
      source: 'threat-response-system',
      data: {
        agentId: entity.id,
        response: response.action,
        targetId: response.targetId,
        reason: response.reason,
      },
    });

    // Set behavior state based on response
    const agent = entity.getComponent<any>(CT.Agent);
    if (!agent) return;

    switch (response.action) {
      case 'flee':
        // Set flee behavior
        entity.updateComponent(CT.Agent, (a: any) => ({
          ...a,
          currentBehavior: 'flee',
          behaviorState: {
            direction: response.fleeDirection,
            reason: response.reason,
          },
        }));
        break;

      case 'attack':
        // Set attack behavior
        entity.updateComponent(CT.Agent, (a: any) => ({
          ...a,
          currentBehavior: 'attack',
          behaviorState: {
            targetId: response.targetId,
            reason: response.reason,
          },
        }));
        break;

      case 'seek_cover':
        // Set navigate behavior to cover position
        entity.updateComponent(CT.Agent, (a: any) => ({
          ...a,
          currentBehavior: 'navigate',
          behaviorState: {
            target: response.coverPosition,
            reason: response.reason,
          },
        }));
        break;

      case 'stand_ground':
        // Set defensive stance (could trigger guard behavior)
        entity.updateComponent(CT.Agent, (a: any) => ({
          ...a,
          currentBehavior: 'wander', // Stay in place, ready to react
          behaviorState: {
            defensive: true,
            reason: response.reason,
          },
        }));
        break;
    }
  }
}
