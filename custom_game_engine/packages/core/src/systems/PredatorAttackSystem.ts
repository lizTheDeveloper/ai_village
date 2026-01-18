import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { Component } from '../ecs/Component.js';
import { createConflictComponent, type ConflictComponent } from '../components/ConflictComponent.js';
import { createInjuryComponent } from '../components/InjuryComponent.js';
import type { CombatStatsComponent } from '../components/CombatStatsComponent.js';
import { SystemEventManager } from '../events/TypedEventEmitter.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';

// Simplified animal component interface for predator attacks
interface AnimalComponent extends Component {
  readonly type: 'animal';
  readonly version: number;
  species: string;
  danger: number;
  speed: number;
  awareness: number;
  aggression: number;
  hunger?: number;
}

interface PositionComponent extends Component {
  readonly type: 'position';
  readonly version: number;
  x: number;
  y: number;
  z: number;
}

interface AlertComponent extends Component {
  readonly type: 'alert';
  readonly version: number;
  alertType: string;
  location: { x: number; y: number; z: number };
}

interface TerritoryComponent extends Component {
  readonly type: 'territory';
  readonly version: number;
  center: { x: number; y: number; z: number };
  radius: number;
}


/**
 * PredatorAttackSystem - Handles predator attacks on agents
 *
 * Implements REQ-CON-002: Predator Attacks
 * - Evaluates attack triggers (hunger, territory, provocation)
 * - Performs detection checks based on stealth
 * - Resolves combat with skill checks
 * - Applies injuries on failed defense
 * - Alerts nearby agents
 * - Creates trauma memories for near-death experiences
 */
export class PredatorAttackSystem extends BaseSystem {
  public readonly id: SystemId = 'predator_attack';
  public readonly priority = 47;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['animal'] as const;

  /** Throttle to every 1 second (20 ticks at 20 TPS) */
  protected readonly throttleInterval = 20;

  protected onUpdate(ctx: SystemContext): void {
    // ctx.activeEntities are already filtered to animals via scheduler
    // We need to further filter for predators (danger >= 5)
    const predators: Entity[] = [];

    for (const entity of ctx.activeEntities) {
      const animal = ctx.world.getComponent<AnimalComponent>(entity.id, 'animal');
      if (animal && animal.danger >= 5) {
        predators.push(entity);
      }
    }

    // Get all agents for target checking (separate query since we need all agents, not just visible)
    const agents = ctx.world.query().with('agent').executeEntities();

    // Process each predator
    for (const predator of predators) {
      this.processPredator(ctx.world, predator, agents);
    }
  }

  private processPredator(world: World, predator: Entity, agents: Entity[]): void {
    const animal = world.getComponent<AnimalComponent>(predator.id, 'animal');
    const predatorPos = world.getComponent<PositionComponent>(predator.id, 'position');

    // Validate predator has required components
    if (!animal) {
      throw new Error('Predator missing required component: animal');
    }
    if (!predatorPos) {
      throw new Error('Predator missing required component: position');
    }

    // Validate danger level
    if (animal.danger < 0 || animal.danger > 10) {
      throw new Error(`Invalid danger level: must be 0-10, got ${animal.danger}`);
    }

    // Check if predator already has a conflict
    if (world.hasComponent(predator.id, 'conflict')) {
      const conflict = world.getComponent<ConflictComponent>(predator.id, 'conflict');
      if (conflict && conflict.state !== 'resolved') {
        return; // Already in combat
      }
    }

    // Find nearby agents
    const detectionRadius = 10;
    const nearbyAgents = agents.filter(agent => {
      const agentPos = world.getComponent<PositionComponent>(agent.id, 'position');
      if (!agentPos) {
        return false;
      }
      const distance = this.calculateDistance(predatorPos, agentPos);
      return distance <= detectionRadius;
    });

    if (nearbyAgents.length === 0) {
      return; // No targets
    }

    // Find closest agent
    const target = this.findClosestAgent(predatorPos, nearbyAgents, world);
    if (!target) {
      return;
    }

    const targetPos = world.getComponent<PositionComponent>(target.id, 'position');
    if (!targetPos) {
      throw new Error('Target missing required component: position');
    }

    // Evaluate attack trigger
    const shouldAttack = this.evaluateAttackTrigger(world, predator, target, animal);
    if (!shouldAttack) {
      return;
    }

    // Get trigger type
    const trigger = this.getAttackTrigger(world, predator, target, animal);

    // Perform detection check if agent has stealth
    const combatStats = world.getComponent<CombatStatsComponent>(target.id, 'combat_stats');
    if (combatStats && combatStats.stealthSkill) {
      const detected = this.performDetectionCheck(animal, combatStats);
      if (!detected) {
        return; // Agent successfully avoided detection
      }
    }

    // Create conflict component on predator
    const predatorImpl = predator as EntityImpl;
    predatorImpl.addComponent(createConflictComponent({
      conflictType: 'predator_attack',
      target: target.id,
      state: 'attacking',
      startTime: Date.now(),
      trigger,
      metadata: { trigger },
    }));

    // Emit predator:attack event
    this.events.emit('predator:attack', {
      predatorId: predator.id,
      targetId: target.id,
      predatorType: animal.species,
    }, predator.id);

    // Find allies within 5 units
    const allies = this.findAllies(world, target, targetPos, agents);

    // Resolve combat
    this.resolveCombat(world, predator, target, animal, combatStats ?? null, allies);

    // Alert nearby agents
    this.alertNearbyAgents(world, predator, target, targetPos, agents);
  }

  private evaluateAttackTrigger(
    world: World,
    predator: Entity,
    target: Entity,
    animal: AnimalComponent
  ): boolean {
    const hunger = animal.hunger ?? 50;

    // Check for provocation (agent attacking predator)
    if (world.hasComponent(target.id, 'conflict')) {
      const targetConflict = world.getComponent<ConflictComponent>(target.id, 'conflict');
      if (targetConflict && targetConflict.target === predator.id) {
        return true; // Provocation attack
      }
    }

    // Check for territory defense
    if (world.hasComponent(predator.id, 'territory')) {
      const territory = world.getComponent<TerritoryComponent>(predator.id, 'territory');
      const targetPos = world.getComponent<PositionComponent>(target.id, 'position');
      if (territory && targetPos) {
        const distance = this.calculateDistance(territory.center, targetPos);
        if (distance <= territory.radius) {
          return true; // Territory defense
        }
      }
    }

    // Hunger-based attack (hunger > 60 increases likelihood)
    if (hunger >= 80) {
      // Very hungry - always attack
      return true;
    } else if (hunger > 60) {
      const attackChance = (hunger - 60) / 40; // 0.0 to 1.0
      return Math.random() < attackChance * (animal.aggression / 10);
    }

    return false;
  }

  private getAttackTrigger(
    world: World,
    predator: Entity,
    target: Entity,
    _animal: AnimalComponent
  ): 'hunger' | 'territory' | 'provocation' {
    // Check provocation first
    if (world.hasComponent(target.id, 'conflict')) {
      const targetConflict = world.getComponent<ConflictComponent>(target.id, 'conflict');
      if (targetConflict && targetConflict.target === predator.id) {
        return 'provocation';
      }
    }

    // Check territory
    if (world.hasComponent(predator.id, 'territory')) {
      const territory = world.getComponent<TerritoryComponent>(predator.id, 'territory');
      const targetPos = world.getComponent<PositionComponent>(target.id, 'position');
      if (territory && targetPos) {
        const distance = this.calculateDistance(territory.center, targetPos);
        if (distance <= territory.radius) {
          return 'territory';
        }
      }
    }

    return 'hunger';
  }

  private performDetectionCheck(animal: AnimalComponent, combatStats: CombatStatsComponent): boolean {
    const awareness = animal.awareness;
    const stealth = combatStats.stealthSkill || 0;

    // Detection chance = awareness - stealth + terrain/weather modifiers
    // For simplicity, no terrain/weather modifiers in this implementation
    const detectionChance = (awareness - stealth + 10) / 20; // Normalized to 0-1

    return Math.random() < Math.max(0.1, Math.min(0.9, detectionChance));
  }

  private findAllies(
    world: World,
    target: Entity,
    targetPos: PositionComponent,
    agents: Entity[]
  ): Entity[] {
    const allyRadius = 5;
    return agents.filter(agent => {
      if (agent.id === target.id) {
        return false;
      }
      if (!world.hasComponent(agent.id, 'combat_stats')) {
        return false;
      }
      const agentPos = world.getComponent<PositionComponent>(agent.id, 'position');
      if (!agentPos) {
        return false;
      }
      const distance = this.calculateDistance(targetPos, agentPos);
      return distance <= allyRadius;
    });
  }

  private resolveCombat(
    world: World,
    predator: Entity,
    target: Entity,
    animal: AnimalComponent,
    combatStats: CombatStatsComponent | null,
    allies: Entity[]
  ): void {
    // Calculate combat power
    const predatorPower = animal.danger;
    let defenderPower = combatStats?.combatSkill || 0;

    // Weapon bonus
    if (combatStats?.weapon === 'club') {
      defenderPower += 1;
    } else if (combatStats?.weapon === 'spear') {
      defenderPower += 2;
    } else if (combatStats?.weapon === 'sword') {
      defenderPower += 3;
    }

    // Armor bonus
    if (combatStats?.armor === 'leather') {
      defenderPower += 1;
    } else if (combatStats?.armor === 'chainmail') {
      defenderPower += 2;
    }

    // Ally bonuses
    const predatorImpl = predator as EntityImpl;
    const combatants = [target.id];
    for (const ally of allies) {
      const allyStats = world.getComponent<CombatStatsComponent>(ally.id, 'combat_stats');
      if (allyStats) {
        defenderPower += allyStats.combatSkill * 0.5; // Allies contribute half their skill
        combatants.push(ally.id);
      }
    }

    // Update conflict with combatants
    predatorImpl.updateComponent<ConflictComponent>('conflict', (c) => ({
      ...c,
      combatants,
    }));

    // Determine outcome
    const totalPower = predatorPower + defenderPower;
    const predatorChance = predatorPower / totalPower;
    const predatorWins = Math.random() < predatorChance;

    if (predatorWins) {
      // Agent is injured
      this.applyInjury(world, target, animal);

      // Update conflict state
      predatorImpl.updateComponent<ConflictComponent>('conflict', (c) => ({
        ...c,
        state: 'resolved',
        outcome: 'attacker_victory',
      }));

      // Emit predator:attack event
      this.events.emit('predator:attack', {
        predatorId: predator.id,
        targetId: target.id,
        predatorType: animal.species,
      }, predator.id);
    } else {
      // Agent successfully defended - predator repelled
      predatorImpl.updateComponent<ConflictComponent>('conflict', (c) => ({
        ...c,
        state: 'repelled',
        outcome: 'defender_victory',
      }));

      // Emit predator:repelled event
      this.events.emit('predator:repelled', {
        predatorId: predator.id,
        defenderId: target.id,
      }, predator.id);
    }
  }

  private applyInjury(world: World, target: Entity, animal: AnimalComponent): void {
    const targetImpl = target as EntityImpl;

    // Determine injury type based on predator
    const injuryTypes: Array<'laceration' | 'puncture' | 'bite'> = ['laceration', 'puncture', 'bite'];
    const injuryType = injuryTypes[Math.floor(Math.random() * injuryTypes.length)] ?? 'bite';

    // Determine severity based on danger level
    let severity: 'minor' | 'major' | 'critical';
    if (animal.danger >= 8) {
      severity = Math.random() < 0.5 ? 'critical' : 'major';
    } else if (animal.danger >= 6) {
      severity = Math.random() < 0.5 ? 'major' : 'minor';
    } else {
      severity = 'minor';
    }

    // Determine location
    const locations: Array<'head' | 'torso' | 'arms' | 'legs'> = ['head', 'torso', 'arms', 'legs'];
    const location = locations[Math.floor(Math.random() * locations.length)] ?? 'torso';

    // Add injury component
    targetImpl.addComponent(createInjuryComponent({
      injuryType,
      severity,
      location,
    }));

    // Check for near-death (critical injury) - create trauma memory
    if (severity === 'critical') {
      const memoryComp = world.getComponent<EpisodicMemoryComponent>(target.id, 'episodic_memory');
      if (memoryComp) {
        memoryComp.formMemory({
          eventType: 'trauma',
          summary: `Near-death experience from ${animal.species} attack`,
          timestamp: Date.now(),
          emotionalValence: -1.0, // Extremely negative
          emotionalIntensity: 1.0, // Maximum intensity
          surprise: 0.9,
          importance: 1.0,
          survivalRelevance: 1.0,
          participants: [target.id],
        });
      }
    }

    // Emit injury:inflicted event
    this.events.emit('injury:inflicted', {
      entityId: target.id,
      injuryType,
      severity,
      location,
      cause: 'predator_attack',
    }, target.id);
  }

  private alertNearbyAgents(
    world: World,
    predator: Entity,
    target: Entity,
    targetPos: PositionComponent,
    agents: Entity[]
  ): void {
    const predatorAnimal = world.getComponent<AnimalComponent>(predator.id, 'animal');
    if (!predatorAnimal) {
      throw new Error('Predator missing required component: animal');
    }

    const alertRadius = 15;
    for (const agent of agents) {
      if (agent.id === target.id) {
        continue;
      }
      const agentPos = world.getComponent<PositionComponent>(agent.id, 'position');
      if (!agentPos) {
        continue;
      }
      const distance = this.calculateDistance(targetPos, agentPos);
      if (distance <= alertRadius) {
        const agentImpl = agent as EntityImpl;
        agentImpl.addComponent({
          type: 'alert',
          version: 1,
          alertType: 'predator_attack',
          location: { x: targetPos.x, y: targetPos.y, z: targetPos.z },
        } as AlertComponent);

        // Emit guard:threat_detected event
        this.events.emit('guard:threat_detected', {
          guardId: agent.id,
          threatId: predator.id,
          threatLevel: predatorAnimal.danger,
          distance,
          location: { x: targetPos.x, y: targetPos.y, z: targetPos.z },
        }, agent.id);
      }
    }
  }

  private findClosestAgent(
    predatorPos: PositionComponent,
    agents: Entity[],
    world: World
  ): Entity | null {
    let closest: Entity | null = null;
    let minDistance = Infinity;

    for (const agent of agents) {
      const agentPos = world.getComponent<PositionComponent>(agent.id, 'position');
      if (!agentPos) {
        continue;
      }
      const distance = this.calculateDistance(predatorPos, agentPos);
      if (distance < minDistance) {
        minDistance = distance;
        closest = agent;
      }
    }

    return closest;
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
