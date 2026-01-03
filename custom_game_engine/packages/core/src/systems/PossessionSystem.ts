import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type {
  PlayerControlComponent,
  DeityComponent,
  AgentComponent,
  NeedsComponent,
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
export class PossessionSystem implements System {
  public readonly id = 'possession' as const;
  public readonly priority = 5; // High priority - runs before AgentBrainSystem
  public readonly requiredComponents = [] as const;

  private readonly maxPossessionTicks = 12000; // 10 minutes at 20 TPS
  private readonly baseCostPerTick = 0.1; // Base belief cost

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = world.tick;

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
    const playerControl = playerEntity.components.get('player_control') as PlayerControlComponent;
    const deity = playerEntity.components.get('deity') as DeityComponent;

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
    const agentComp = possessedAgent.components.get('agent') as AgentComponent | undefined;
    const needs = possessedAgent.components.get('needs') as NeedsComponent | undefined;

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
    const isUsingAbility = false; // TODO: Check for divine ability use

    const cost = calculatePossessionCost(
      this.baseCostPerTick,
      isMoving,
      isInCombat,
      isUsingAbility,
      crossUniverseMultiplier
    );

    // Apply cost
    (playerEntity as any).updateComponent('deity', (current: DeityComponent) => ({
      ...current,
      belief: {
        ...current.belief,
        currentBelief: Math.max(0, current.belief.currentBelief - cost),
        totalBeliefSpent: current.belief.totalBeliefSpent + cost,
      },
    }));

    (playerEntity as any).updateComponent('player_control', (current: PlayerControlComponent) => ({
      ...current,
      totalBeliefSpent: current.totalBeliefSpent + cost,
    }));

    // Emit tick event for UI updates
    world.eventBus.emit({
      type: 'possession:tick',
      source: 'system',
      data: {
        agentId: playerControl.possessedAgentId!,
        beliefSpent: cost,
        beliefRemaining: deity.belief.currentBelief,
        ticksRemaining: this.maxPossessionTicks - (currentTick - playerControl.possessionStartTick),
      },
    });
  }

  /**
   * Jack in - possess an agent
   */
  public jackIn(
    playerEntity: Entity,
    agentEntity: Entity,
    world: World
  ): { success: boolean; reason?: string } {
    const playerControl = playerEntity.components.get('player_control') as PlayerControlComponent | undefined;
    const deity = playerEntity.components.get('deity') as DeityComponent | undefined;
    const agent = agentEntity.components.get('agent') as AgentComponent | undefined;
    const needs = agentEntity.components.get('needs') as NeedsComponent | undefined;

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

    // Apply initial cost
    (playerEntity as any).updateComponent('deity', (current: DeityComponent) => ({
      ...current,
      belief: {
        ...current.belief,
        currentBelief: current.belief.currentBelief - initialCost,
        totalBeliefSpent: current.belief.totalBeliefSpent + initialCost,
      },
    }));

    // Set possession state
    const currentTick = world.tick;
    (playerEntity as any).updateComponent('player_control', (current: PlayerControlComponent) => ({
      ...current,
      isPossessed: true,
      possessedAgentId: agentEntity.id,
      possessionStartTick: currentTick,
      totalBeliefSpent: initialCost,
      inputMode: 'possessed',
      lastInputTick: currentTick,
      movementCommand: null,
      pendingInteraction: null,
    }));

    // Mark agent as possessed
    (agentEntity as any).updateComponent('agent', (current: AgentComponent) => ({
      ...current,
      behavior: 'player_controlled',
      behaviorState: { possessedBy: playerEntity.id },
    }));

    // Emit event
    world.eventBus.emit({
      type: 'possession:jack_in',
      source: 'system',
      data: {
        agentId: agentEntity.id,
        initialCost,
        beliefRemaining: deity.belief.currentBelief - initialCost,
      },
    });

    return { success: true };
  }

  /**
   * Jack out - return to god mode
   */
  public jackOut(playerEntity: Entity, world: World, reason?: string): void {
    const playerControl = playerEntity.components.get('player_control') as PlayerControlComponent | undefined;

    if (!playerControl || !playerControl.isPossessed) {
      return; // Not currently possessed
    }

    const agentId = playerControl.possessedAgentId;
    const totalSpent = playerControl.totalBeliefSpent;

    // Get possessed agent (if still exists)
    if (agentId) {
      const agent = world.getEntity(agentId);
      if (agent) {
        // Restore normal behavior
        (agent as any).updateComponent('agent', (current: AgentComponent) => ({
          ...current,
          behavior: 'idle',
          behaviorState: {},
        }));
      }
    }

    // Clear possession state
    (playerEntity as any).updateComponent('player_control', (current: PlayerControlComponent) => ({
      ...current,
      isPossessed: false,
      possessedAgentId: null,
      possessionStartTick: 0,
      totalBeliefSpent: 0,
      inputMode: 'god',
      movementCommand: null,
      pendingInteraction: null,
    }));

    // Emit event
    world.eventBus.emit({
      type: 'possession:jack_out',
      source: 'system',
      data: {
        agentId,
        totalBeliefSpent: totalSpent,
        reason: reason || 'Player jack-out',
      },
    });
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

    const playerControl = playerEntity.components.get(
      'player_control'
    ) as PlayerControlComponent;

    if (!playerControl.isPossessed || !playerControl.possessedAgentId) {
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

    const playerControl = playerEntity.components.get(
      'player_control'
    ) as PlayerControlComponent;

    return playerControl.isPossessed && playerControl.possessedAgentId === agentId;
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

    const playerControl = playerEntity.components.get('player_control') as PlayerControlComponent;
    const deity = playerEntity.components.get('deity') as DeityComponent;

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
