import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type {
  PlayerControlComponent,
  DeityComponent,
  AgentComponent,
  NeedsComponent,
  DivineAbilityComponent,
} from '../components/index.js';
import {
  calculatePossessionCost,
  calculateCrossUniverseMultiplier,
  shouldEndPossession,
} from '../components/PlayerControlComponent.js';

/**
 * PossessionSystem - Manages player possession of agents (jack-in/jack-out)
 *
 * Phase 16: Polish & Player - Player Avatar System
 *
 * Responsibilities:
 * - Handle jack-in requests (possess agent, cost belief)
 * - Handle jack-out requests (return to god mode)
 * - Apply belief costs per tick while possessed
 * - Force jack-out when belief runs out or agent dies
 * - Update camera to follow possessed agent
 */
export class PossessionSystem extends BaseSystem {
  public readonly id = 'possession' as const;
  public readonly priority = 5; // High priority - runs before AgentBrainSystem
  public readonly requiredComponents = [] as const;
  // Only run when player_control components exist (O(1) activation check)
  public readonly activationComponents = ['player_control'] as const;
  protected readonly throttleInterval = 0; // EVERY_TICK - critical responsiveness

  private readonly maxPossessionTicks = 12000; // 10 minutes at 20 TPS
  private readonly baseCostPerTick = 0.1; // Base belief cost

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;
    const world = ctx.world;

    // Get player control entity (should be singleton deity entity)
    const playerControlEntities = world
      .query()
      .with('player_control', 'deity')
      .executeEntities();

    if (playerControlEntities.length === 0) {
      // No player control entity - system inactive
      return;
    }

    const playerEntity = playerControlEntities[0];
    if (!playerEntity) {
      return;
    }
    const playerControl = playerEntity.getComponent<PlayerControlComponent>('player_control');
    const deity = playerEntity.getComponent<DeityComponent>('deity');

    if (!playerControl || !deity) {
      return;
    }

    // If not currently possessed, nothing to update
    if (!playerControl.isPossessed || !playerControl.possessedAgentId) {
      return;
    }

    // Get the possessed agent
    const possessedAgent = world.getEntity(playerControl.possessedAgentId);
    if (!possessedAgent) {
      // Agent no longer exists - force jack-out
      this.jackOut(playerEntity, world, 'Agent no longer exists');
      return;
    }

    // Get agent components
    const agentComp = possessedAgent.getComponent<AgentComponent>('agent');
    const needs = possessedAgent.getComponent<NeedsComponent>('needs');

    if (!agentComp || !needs) {
      // Missing required components - force jack-out
      this.jackOut(playerEntity, world, 'Agent missing required components');
      return;
    }

    // Check if possession should end
    const endCheck = shouldEndPossession(
      playerControl,
      currentTick,
      deity.belief.currentBelief,
      needs.health,
      this.maxPossessionTicks
    );

    if (endCheck.shouldEnd) {
      this.jackOut(playerEntity, world, endCheck.reason);
      return;
    }

    // Calculate cross-universe multiplier if applicable
    const isCrossUniverse = !!(
      playerControl.deityUniverseId &&
      playerControl.possessedUniverseId &&
      playerControl.deityUniverseId !== playerControl.possessedUniverseId
    );

    const isSameMultiverse = !!(
      playerControl.deityMultiverseId &&
      playerControl.possessedMultiverseId &&
      playerControl.deityMultiverseId === playerControl.possessedMultiverseId
    );

    const crossUniverseMultiplier = calculateCrossUniverseMultiplier(
      isCrossUniverse,
      isSameMultiverse
    );

    // Calculate and apply belief cost
    const isMoving = playerControl.movementCommand !== null;
    // Combat-like behaviors that increase possession cost
    const isInCombat = agentComp.behavior === 'flee' || agentComp.behavior === 'flee_danger';
    // Check if using divine ability (within last tick)
    const divineAbility = playerEntity.getComponent<DivineAbilityComponent>('divine_ability');
    const isUsingAbility = divineAbility ?
      (currentTick - divineAbility.lastPowerUseTick <= 1) : false;

    const cost = calculatePossessionCost(
      this.baseCostPerTick,
      isMoving,
      isInCombat,
      isUsingAbility,
      crossUniverseMultiplier
    );

    // Apply cost - directly mutate components (class-based components are mutable)
    deity.belief.currentBelief = Math.max(0, deity.belief.currentBelief - cost);
    deity.belief.totalBeliefSpent += cost;
    playerControl.totalBeliefSpent += cost;

    // Emit tick event for UI updates
    this.events.emit('possession:tick', {
      agentId: playerControl.possessedAgentId!,
      beliefSpent: cost,
      beliefRemaining: deity.belief.currentBelief,
      ticksRemaining: this.maxPossessionTicks - (currentTick - playerControl.possessionStartTick),
    }, 'system');
  }

  /**
   * Jack in - possess an agent
   */
  public jackIn(
    playerEntity: Entity,
    agentEntity: Entity,
    world: World
  ): { success: boolean; reason?: string } {
    const playerControl = playerEntity.getComponent<PlayerControlComponent>('player_control');
    const deity = playerEntity.getComponent<DeityComponent>('deity');
    const agent = agentEntity.getComponent<AgentComponent>('agent');
    const needs = agentEntity.getComponent<NeedsComponent>('needs');

    if (!playerControl || !deity || !agent || !needs) {
      return { success: false, reason: 'Missing required components' };
    }

    // Check if already possessed
    if (playerControl.isPossessed) {
      return { success: false, reason: 'Already possessing another agent' };
    }

    // Check if agent is alive
    if (needs.health <= 0) {
      return { success: false, reason: 'Cannot possess dead agent' };
    }

    // Check if enough belief (initial cost)
    const initialCost = 10.0; // Initial possession cost
    if (deity.belief.currentBelief < initialCost) {
      return { success: false, reason: 'Insufficient belief' };
    }

    // Apply initial cost - directly mutate components
    deity.belief.currentBelief -= initialCost;
    deity.belief.totalBeliefSpent += initialCost;

    // Set possession state
    const currentTick = world.tick;
    playerControl.isPossessed = true;
    playerControl.possessedAgentId = agentEntity.id;
    playerControl.possessionStartTick = currentTick;
    playerControl.totalBeliefSpent = initialCost;
    playerControl.inputMode = 'possessed' as const;
    playerControl.lastInputTick = currentTick;
    playerControl.movementCommand = null;
    playerControl.pendingInteraction = null;

    // Mark agent as possessed
    agent.behavior = 'player_controlled' as const;
    agent.behaviorState = { possessedBy: playerEntity.id };

    // Emit event
    this.events.emit('possession:jack_in', {
      agentId: agentEntity.id,
      initialCost,
      beliefRemaining: deity.belief.currentBelief - initialCost,
    }, 'system');

    return { success: true };
  }

  /**
   * Jack out - return to god mode
   */
  public jackOut(playerEntity: Entity, world: World, reason?: string): void {
    const playerControl = playerEntity.getComponent<PlayerControlComponent>('player_control');

    if (!playerControl || !playerControl.isPossessed) {
      return; // Not currently possessed
    }

    const agentId = playerControl.possessedAgentId;
    const totalSpent = playerControl.totalBeliefSpent;

    // Get possessed agent (if still exists)
    if (agentId) {
      const agentEntity = world.getEntity(agentId);
      if (agentEntity) {
        const agentComp = agentEntity.getComponent<AgentComponent>('agent');
        if (agentComp) {
          // Restore normal behavior
          agentComp.behavior = 'idle' as const;
          agentComp.behaviorState = {};
        }
      }
    }

    // Clear possession state
    playerControl.isPossessed = false;
    playerControl.possessedAgentId = null;
    playerControl.possessionStartTick = 0;
    playerControl.totalBeliefSpent = 0;
    playerControl.inputMode = 'god' as const;
    playerControl.movementCommand = null;
    playerControl.pendingInteraction = null;

    // Emit event
    this.events.emit('possession:jack_out', {
      agentId,
      totalBeliefSpent: totalSpent,
      reason: reason || 'Player jack-out',
    }, 'system');
  }

  /**
   * Get currently possessed agent (if any)
   */
  public getPossessedAgent(world: World): Entity | null {
    const playerControlEntities = world
      .query()
      .with('player_control')
      .executeEntities();

    const playerEntity = playerControlEntities[0];
    if (!playerEntity) {
      return null;
    }

    const playerControl = playerEntity.getComponent<PlayerControlComponent>('player_control');

    if (!playerControl || !playerControl.isPossessed || !playerControl.possessedAgentId) {
      return null;
    }

    return world.getEntity(playerControl.possessedAgentId) ?? null;
  }

  /**
   * Check if an agent is currently possessed
   */
  public isAgentPossessed(agentId: string, world: World): boolean {
    const playerControlEntities = world
      .query()
      .with('player_control')
      .executeEntities();

    const playerEntity = playerControlEntities[0];
    if (!playerEntity) {
      return false;
    }

    const playerControl = playerEntity.getComponent<PlayerControlComponent>('player_control');

    return !!(playerControl && playerControl.isPossessed && playerControl.possessedAgentId === agentId);
  }

  /**
   * Get possession status for UI display
   */
  public getPossessionStatus(world: World): PossessionStatus | null {
    const playerControlEntities = world
      .query()
      .with('player_control', 'deity')
      .executeEntities();

    const playerEntity = playerControlEntities[0];
    if (!playerEntity) {
      return null;
    }

    const playerControl = playerEntity.getComponent<PlayerControlComponent>('player_control');
    const deity = playerEntity.getComponent<DeityComponent>('deity');

    if (!playerControl || !deity || !playerControl.isPossessed || !playerControl.possessedAgentId) {
      return null;
    }

    const currentTick = world.tick;
    const ticksInPossession = currentTick - playerControl.possessionStartTick;
    const ticksRemaining = this.maxPossessionTicks - ticksInPossession;

    return {
      agentId: playerControl.possessedAgentId!,
      beliefSpent: playerControl.totalBeliefSpent,
      beliefRemaining: deity.belief.currentBelief,
      beliefCostPerTick: playerControl.beliefCostPerTick,
      ticksInPossession,
      ticksRemaining,
      inputMode: playerControl.inputMode,
    };
  }
}

/**
 * Possession status for UI display
 */
export interface PossessionStatus {
  agentId: string;
  beliefSpent: number;
  beliefRemaining: number;
  beliefCostPerTick: number;
  ticksInPossession: number;
  ticksRemaining: number;
  inputMode: 'god' | 'possessed';
}
