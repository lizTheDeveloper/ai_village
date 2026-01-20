/**
 * ThreatResponseSystem
 *
 * Automatically scans for threats and makes decisions based on:
 * - Agent personality (courage from neuroticism, aggression from agreeableness)
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

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';
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

export class ThreatResponseSystem extends BaseSystem {
  public readonly id = 'threat-response';
  public readonly priority = 900; // Late priority, after most game logic
  public readonly requiredComponents = ['threat_detection', 'position', 'personality'] as const;
  // Lazy activation: Skip entire system when no threat detection exists in world
  public readonly activationComponents = ['threat_detection'] as const;
  public readonly name = 'ThreatResponseSystem';

  protected readonly throttleInterval = 5; // Every 5 ticks (~0.25 seconds)

  protected onUpdate(ctx: SystemContext): void {
    this.ctx = ctx; // Store context for helper methods
    for (const entity of ctx.activeEntities) {
      this.processEntity(entity, ctx.world);
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
        const isHostile = this.isHostile(entity, otherAgent);
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
      power += combatStats.combatSkill;
      power += (combatStats.huntingSkill ?? 0) / 2;
    }

    // Equipment bonus
    const equipment = entity.getComponent<EquipmentComponent>(CT.Equipment);
    if (equipment) {
      // Weapon adds power
      if (equipment.weapons.mainHand) {
        power += 15; // Basic weapon bonus
      }
      // Armor adds defensive power (check any equipped armor)
      if (Object.keys(equipment.equipped).length > 0) {
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

  private isHostile(agent: Entity, other: Entity): boolean {
    // Check for conflict component
    const conflict = other.getComponent<any>(CT.Conflict);
    if (conflict?.targetId === agent.id) return true;

    // Check for wild aggressive animals
    const animal = other.getComponent<any>(CT.Animal);
    if (animal && !animal.tamed && animal.danger > 3) {
      return true; // Dangerous wild animals are hostile
    }

    // Check nation relationships (diplomatic relations between nations)
    // Note: This uses NationComponent.foreignPolicy.diplomaticRelations to determine hostility
    // Agents don't have direct nation membership yet - this will be expanded when citizen
    // components are added to track agent->village->city->province->nation hierarchy
    const agentNation = this.findAgentNation(agent);
    const otherNation = this.findAgentNation(other);

    if (agentNation && otherNation && agentNation !== otherNation) {
      const relationship = this.getNationRelationship(agentNation, otherNation);
      // Hostile or at war = treat as hostile
      if (relationship === 'hostile' || relationship === 'at_war') {
        return true;
      }
    }

    return false;
  }

  /**
   * Find the nation an agent belongs to by checking proximity to villages/cities
   * that are part of nations.
   *
   * TODO: Replace this with proper CitizenComponent when implemented
   * Future: agent -> village -> city -> province -> nation hierarchy
   */
  private findAgentNation(agent: Entity): string | null {
    // For now, check if agent has a position and find nearest governance structure
    const position = agent.getComponent<PositionComponent>(CT.Position);
    if (!position) return null;

    // Check if agent is within a village with nation membership
    const villages = this.ctx?.world.query()?.with?.(CT.VillageGovernance)?.executeEntities?.() ?? [];
    for (const village of villages) {
      const governance = village.getComponent<any>(CT.VillageGovernance);
      const villagePos = village.getComponent<PositionComponent>(CT.Position);

      if (!governance || !villagePos) continue;

      // Check if agent is within village bounds (rough proximity check)
      const dx = position.x - villagePos.x;
      const dy = position.y - villagePos.y;
      const distSq = dx * dx + dy * dy;

      // If within 50 tiles of village center, consider them part of that village
      if (distSq < 50 * 50) {
        // Check if village is part of a city
        if (governance.cityId) {
          const city = this.ctx?.world.getEntity(governance.cityId);
          const cityGovernance = city?.getComponent<any>(CT.CityGovernance);
          if (cityGovernance?.provinceId) {
            // Check if province is part of a nation
            const province = this.ctx?.world.getEntity(cityGovernance.provinceId);
            const provinceComp = province?.getComponent<any>(CT.Province);
            if (provinceComp?.nationId) {
              return provinceComp.nationId;
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Get the diplomatic relationship between two nations.
   *
   * @param nationId1 - First nation entity ID
   * @param nationId2 - Second nation entity ID
   * @returns Relationship type ('allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'at_war')
   */
  private getNationRelationship(
    nationId1: string,
    nationId2: string
  ): 'allied' | 'friendly' | 'neutral' | 'rival' | 'hostile' | 'at_war' | null {
    const nation1 = this.ctx?.world.getEntity(nationId1);
    if (!nation1) return null;

    const nationComp = nation1.getComponent<any>(CT.Nation);
    if (!nationComp) return null;

    // Check foreignPolicy.diplomaticRelations Map
    const relation = nationComp.foreignPolicy.diplomaticRelations.get(nationId2);
    if (relation) {
      return relation.relationship;
    }

    // Check if nations are at war (in enemies array)
    if (nationComp.foreignPolicy.enemies.includes(nationId2)) {
      return 'at_war';
    }

    // Check if nations are allied (in allies array)
    if (nationComp.foreignPolicy.allies.includes(nationId2)) {
      return 'allied';
    }

    // Default to neutral if no explicit relationship
    return 'neutral';
  }

  // Store context for use in helper methods
  private ctx: SystemContext | null = null;

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
    const weaponId = equipment?.weapons.mainHand?.itemId;
    const hasRangedWeapon = weaponId?.includes('bow') ||
                            weaponId?.includes('gun') ||
                            weaponId?.includes('crossbow');

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

    // Derive personality factors from Big Five traits
    // Courage = low neuroticism (resilient)
    const courage = 1 - personality.neuroticism;
    // Aggression = low agreeableness (competitive)
    const aggression = 1 - personality.agreeableness;

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
      return this.findCoverResponse(primaryThreat, entity, world);
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
        return this.findCoverResponse(primaryThreat, entity, world);
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
        return this.findCoverResponse(primaryThreat, entity, world);
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
    world: World
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
        const building = world.getEntity(buildingId) ?? null;
        if (!building) continue;
        const buildingPos = building.getComponent<PositionComponent>(CT.Position);
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

  private executeResponse(entity: Entity, response: ThreatResponse, _world: World): void {
    const impl = entity as EntityImpl;

    // Set behavior state based on response
    const agent = entity.getComponent<any>(CT.Agent);
    if (!agent) return;

    switch (response.action) {
      case 'flee':
        // Set flee behavior
        impl.updateComponent(CT.Agent, (a: any) => ({
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
        impl.updateComponent(CT.Agent, (a: any) => ({
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
        impl.updateComponent(CT.Agent, (a: any) => ({
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
        impl.updateComponent(CT.Agent, (a: any) => ({
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
