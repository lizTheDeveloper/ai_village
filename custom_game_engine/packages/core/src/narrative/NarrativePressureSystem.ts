/**
 * NarrativePressureSystem - Manages outcome attractors and applies narrative pressure
 *
 * This system maintains active attractors and provides APIs for:
 * - Adding/removing attractors
 * - Querying pressure bias for decisions
 * - Evaluating convergence toward goals
 * - Cleaning up expired attractors
 *
 * Phase 3 focus: Integration with plot stages for plot-sourced attractors.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type {
  OutcomeAttractor,
  AttractorSource,
  PressureTarget,
  PressureEffect,
  PlotStageAttractor,
} from './NarrativePressureTypes.js';
import { createOutcomeAttractor, plotStageAttractorId } from './NarrativePressureTypes.js';

/**
 * Priority: 80 (runs before plot systems at 85-86)
 */
export class NarrativePressureSystem implements System {
  static readonly PRIORITY = 80;
  readonly id = 'narrative_pressure' as const;
  readonly priority = NarrativePressureSystem.PRIORITY;
  readonly requiredComponents = [] as const;

  // Active attractors by ID
  private attractors: Map<string, OutcomeAttractor> = new Map();

  // Index by source for efficient cleanup
  private attractorsBySource: Map<string, Set<string>> = new Map();

  // Cache of computed pressure effects for current tick
  private pressureCache: Map<string, PressureEffect[]> = new Map();
  private pressureCacheTick: number = -1;

  // ============================================================================
  // System Lifecycle
  // ============================================================================

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = this.getCurrentTick(world);

    // Clear pressure cache if tick changed
    if (currentTick !== this.pressureCacheTick) {
      this.pressureCache.clear();
      this.pressureCacheTick = currentTick;
    }

    // Apply decay to attractors
    this.applyDecay(currentTick);

    // Update convergence for each attractor
    this.updateConvergence(world);
  }

  // ============================================================================
  // Attractor Management
  // ============================================================================

  /**
   * Add an attractor to the system
   */
  addAttractor(attractor: OutcomeAttractor): void {
    this.attractors.set(attractor.id, attractor);

    // Index by source
    const sourceKey = this.getSourceKey(attractor.source);
    if (!this.attractorsBySource.has(sourceKey)) {
      this.attractorsBySource.set(sourceKey, new Set());
    }
    this.attractorsBySource.get(sourceKey)!.add(attractor.id);

  }

  /**
   * Remove an attractor by ID
   */
  removeAttractor(attractorId: string): void {
    const attractor = this.attractors.get(attractorId);
    if (!attractor) return;

    // Remove from source index
    const sourceKey = this.getSourceKey(attractor.source);
    this.attractorsBySource.get(sourceKey)?.delete(attractorId);

    // Remove from main map
    this.attractors.delete(attractorId);

  }

  /**
   * Get an attractor by ID
   */
  getAttractor(attractorId: string): OutcomeAttractor | undefined {
    return this.attractors.get(attractorId);
  }

  /**
   * Get all active attractors
   */
  getAllAttractors(): OutcomeAttractor[] {
    return Array.from(this.attractors.values());
  }

  /**
   * Remove all attractors from a specific source
   */
  removeAttractorsBySource(source: AttractorSource): void {
    const sourceKey = this.getSourceKey(source);
    const attractorIds = this.attractorsBySource.get(sourceKey);

    if (attractorIds) {
      for (const id of attractorIds) {
        this.attractors.delete(id);
      }
      this.attractorsBySource.delete(sourceKey);
    }
  }

  // ============================================================================
  // Plot Integration
  // ============================================================================

  /**
   * Add attractors for a plot stage
   */
  addPlotStageAttractors(
    plotInstanceId: string,
    stageId: string,
    entityId: string,
    stageAttractors: PlotStageAttractor[],
    currentTick: number
  ): void {
    for (const stageDef of stageAttractors) {
      const attractorId = plotStageAttractorId(plotInstanceId, stageId, stageDef.attractor_id);

      const attractor = createOutcomeAttractor({
        id: attractorId,
        source: { type: 'plot', plotInstanceId, stageId },
        goal: stageDef.goal,
        strength: stageDef.strength,
        urgency: stageDef.urgency,
        scope: stageDef.scope ?? { type: 'entity', entityId },
        decay: { type: 'stage_exit' },
        description: stageDef.description,
        createdAt: currentTick,
      });

      this.addAttractor(attractor);
    }
  }

  /**
   * Remove attractors for a plot stage (called on stage exit)
   */
  removePlotStageAttractors(plotInstanceId: string, stageId: string): void {
    const toRemove: string[] = [];

    for (const attractor of this.attractors.values()) {
      if (
        attractor.source.type === 'plot' &&
        attractor.source.plotInstanceId === plotInstanceId &&
        attractor.source.stageId === stageId
      ) {
        toRemove.push(attractor.id);
      }
    }

    for (const id of toRemove) {
      this.removeAttractor(id);
    }

    if (toRemove.length > 0) {
    }
  }

  // ============================================================================
  // Pressure Query API
  // ============================================================================

  /**
   * Get the combined pressure bias for a target
   *
   * Returns a value between -1 and 1:
   * - Negative values suppress the target
   * - Positive values encourage the target
   * - Zero means no narrative pressure
   */
  getPressureBias(target: PressureTarget): number {
    const effects = this.getEffectsForTarget(target);

    if (effects.length === 0) return 0;

    // Combine multiple pressures (weighted by strength × confidence)
    let totalBias = 0;
    let totalWeight = 0;

    for (const effect of effects) {
      const weight = effect.confidence;
      totalBias += effect.bias * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? Math.max(-1, Math.min(1, totalBias / totalWeight)) : 0;
  }

  /**
   * Get all pressure effects for a target
   */
  getEffectsForTarget(target: PressureTarget): PressureEffect[] {
    // For now, return any effects that match the target type
    // Future: Implement proper path analysis and effect generation
    const effects: PressureEffect[] = [];

    for (const attractor of this.attractors.values()) {
      const generatedEffects = this.generateEffectsForAttractor(attractor, target);
      effects.push(...generatedEffects);
    }

    return effects;
  }

  /**
   * Check if any attractor is pushing toward a specific goal type
   */
  hasActiveGoal(goalType: string, entityId?: string): boolean {
    for (const attractor of this.attractors.values()) {
      if (attractor.goal.type !== goalType) continue;

      // If entityId specified, check scope
      if (entityId) {
        if (attractor.scope.type === 'entity' && attractor.scope.entityId !== entityId) {
          continue;
        }
      }

      return true;
    }
    return false;
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private getCurrentTick(world: World): number {
    // Try to get tick from Time entity
    try {
      const timeEntities = world.query().with('time' as any).executeEntities();
      if (timeEntities.length > 0) {
        const timeComponent = timeEntities[0]?.getComponent('time' as any) as any;
        return timeComponent?.tick ?? 0;
      }
    } catch {
      // Fallback
    }
    return 0;
  }

  private getSourceKey(source: AttractorSource): string {
    switch (source.type) {
      case 'deity':
        return `deity:${source.deityId}`;
      case 'player':
        return `player:${source.playerId}`;
      case 'storyteller':
        return `storyteller:${source.narrativeForce}`;
      case 'prophecy':
        return `prophecy:${source.prophecyId}`;
      case 'curse':
        return `curse:${source.curseId}`;
      case 'karma':
        return `karma:${source.karmaPool}`;
      case 'plot':
        return `plot:${source.plotInstanceId}:${source.stageId}`;
    }
  }

  private applyDecay(currentTick: number): void {
    const toRemove: string[] = [];

    for (const attractor of this.attractors.values()) {
      switch (attractor.decay.type) {
        case 'time_limit': {
          const ticksElapsed = currentTick - attractor.createdAt;
          if (ticksElapsed >= attractor.decay.ticksRemaining) {
            toRemove.push(attractor.id);
          }
          break;
        }
        case 'belief_decay': {
          attractor.strength -= attractor.decay.ratePerTick;
          if (attractor.strength <= 0) {
            toRemove.push(attractor.id);
          }
          break;
        }
        case 'on_achievement': {
          if (attractor.convergence >= 1.0) {
            toRemove.push(attractor.id);
          }
          break;
        }
        // 'on_failure', 'stage_exit', 'never' are handled elsewhere
      }
    }

    for (const id of toRemove) {
      this.removeAttractor(id);
    }
  }

  private updateConvergence(_world: World): void {
    // Placeholder for convergence measurement
    // This would need goal-specific logic to measure progress
    // For now, convergence is set externally or remains at 0
  }

  /**
   * Generate pressure effects for a specific attractor and target
   *
   * This is a simplified implementation. A full implementation would:
   * 1. Analyze paths from current state to goal
   * 2. Generate appropriate effects for each path
   * 3. Score confidence based on path viability
   */
  private generateEffectsForAttractor(
    attractor: OutcomeAttractor,
    target: PressureTarget
  ): PressureEffect[] {
    const effects: PressureEffect[] = [];

    // Simple heuristic: Generate effects based on goal type
    switch (attractor.goal.type) {
      case 'emotional_state': {
        const params = attractor.goal.parameters as { emotion?: string; entityId?: string };
        if (target.type === 'emotional_bias' && params.emotion === target.emotion) {
          effects.push({
            target,
            bias: attractor.strength * 0.3,
            confidence: 0.7,
          });
        }
        break;
      }

      case 'relationship_formed': {
        const params = attractor.goal.parameters as { entity1?: string; entity2?: string };
        if (
          target.type === 'relationship_change' &&
          ((target.agentId === params.entity1 && target.targetId === params.entity2) ||
           (target.agentId === params.entity2 && target.targetId === params.entity1))
        ) {
          effects.push({
            target,
            bias: attractor.strength * 0.4,
            confidence: 0.6,
          });
        }
        break;
      }

      case 'skill_mastery': {
        const params = attractor.goal.parameters as { skill?: string; agentId?: string };
        if (
          target.type === 'behavior_selection' &&
          target.agentId === params.agentId &&
          target.behavior.includes(params.skill ?? '')
        ) {
          effects.push({
            target,
            bias: attractor.strength * 0.25,
            confidence: 0.5,
          });
        }
        break;
      }

      // Add more goal types as needed
    }

    return effects;
  }
}

// Export singleton instance for easy access
let _narrativePressureSystem: NarrativePressureSystem | null = null;

export function getNarrativePressureSystem(): NarrativePressureSystem {
  if (!_narrativePressureSystem) {
    _narrativePressureSystem = new NarrativePressureSystem();
  }
  return _narrativePressureSystem;
}

export function resetNarrativePressureSystem(): void {
  _narrativePressureSystem = null;
}
