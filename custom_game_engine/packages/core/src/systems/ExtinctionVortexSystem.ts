import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { ExtinctionVortexMonitorComponent, ExtinctionVortexPhase, ExtinctionMetrics } from '../components/ExtinctionVortexMonitorComponent.js';
import { GeneticComponent } from '../components/GeneticComponent.js';
import { SpeciesComponent } from '../components/SpeciesComponent.js';
import type { EntityImpl } from '../ecs/Entity.js';

/**
 * ExtinctionVortexSystem monitors species-level genetic health and detects
 * extinction vortex conditions via two population metrics:
 *
 *   F_population  — mean inbreeding coefficient (0-1, higher = worse)
 *   D_cc_population — mean pairwise cosine distance of allele trait vectors (0-1, lower = worse)
 *
 * Phase transitions:
 *   none    → warning  : D_cc < 0.01 OR F > 0.20
 *   none    → grace    : D_cc < 0.005 AND F > 0.25  (skip warning)
 *   warning → grace    : D_cc < 0.005 AND F > 0.25
 *   warning → none     : D_cc >= 0.01 AND F <= 0.20  (recovered)
 *   grace   → extinct  : graceTicksRemaining <= 0
 *   grace   → warning  : D_cc >= 0.005 OR F <= 0.25  (partial recovery)
 *   grace   → none     : D_cc >= 0.01 AND F <= 0.20  (full recovery)
 *   extinct : terminal — no transitions out
 *
 * Priority: 850 (utility range, slow-changing ecological state)
 * Throttle: 200 ticks (every 10 seconds at 20 TPS)
 */
export class ExtinctionVortexSystem extends BaseSystem {
  public readonly id: SystemId = 'extinction_vortex_system';
  public readonly priority: number = 850;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [CT.Species, CT.Genetic];
  public readonly activationComponents = [CT.ExtinctionVortexMonitor] as const;
  protected readonly throttleInterval = 200;

  // Three generations — the trinity pattern: three chances before the vortex closes
  private static readonly GRACE_GENERATIONS = 3;

  protected onUpdate(ctx: SystemContext): void {
    // Cache the monitor query once before the loop (CLAUDE.md: cache queries before loops)
    const monitorEntities = ctx.world.query()
      .with(CT.ExtinctionVortexMonitor)
      .executeEntities() as EntityImpl[];

    // Hoist Species+Genetic query above monitor loop — 1 query + N filters
    // instead of N queries + N filters (Sylvia review MUL-4460)
    const allSpeciesEntities = ctx.world.query()
      .with(CT.Species)
      .with(CT.Genetic)
      .executeEntities() as EntityImpl[];

    for (const monitorEntity of monitorEntities) {
      const comps = ctx.components(monitorEntity);
      const monitor = comps.optional<ExtinctionVortexMonitorComponent>(CT.ExtinctionVortexMonitor);
      if (!monitor) continue;

      // Terminal state — nothing to do
      if (monitor.phase === 'extinct') continue;

      const { speciesId } = monitor;

      // Filter from cached query instead of re-querying per monitor
      const speciesMembers = allSpeciesEntities.filter(entity => {
        const speciesComp = entity.getComponent<SpeciesComponent>(CT.Species);
        return speciesComp?.speciesId === speciesId;
      });
      const populationSize = speciesMembers.length;

      const fPopulation = this.computeFPopulation(speciesMembers);
      const dccPopulation = this.computeDccPopulation(speciesMembers);

      const metrics: ExtinctionMetrics = { fPopulation, dccPopulation, populationSize };
      monitor.metrics = metrics;
      monitor.lastEvaluationTick = ctx.tick;

      this.evaluatePhase(ctx, monitor, metrics);
    }
  }

  // ============================================================================
  // Metric Computation
  // ============================================================================

  /**
   * Compute mean inbreeding coefficient across species members.
   * Returns 0 if fewer than 3 members (below threshold per spec).
   */
  private computeFPopulation(members: EntityImpl[]): number {
    if (members.length < 3) return 0;

    let sum = 0;
    for (const entity of members) {
      const genetic = entity.getComponent<GeneticComponent>(CT.Genetic);
      if (!genetic) {
        throw new Error(
          `[extinction_vortex_system] Entity ${entity.id} has Species+Genetic query match but missing GeneticComponent`
        );
      }
      sum += genetic.inbreedingCoefficient;
    }
    return sum / members.length;
  }

  /**
   * Compute mean pairwise cosine distance between allele trait vectors.
   * Returns 1.0 if fewer than 3 members (above threshold per spec).
   *
   * Trait vector per entity: each allele's expressedAllele mapped to:
   *   dominant  → 1.0
   *   recessive → 0.0
   *   both      → 0.5
   *
   * Cosine distance = 1 - (A·B / (|A|*|B|))
   * Uses squared magnitudes to avoid Math.sqrt in the hot path.
   */
  private computeDccPopulation(members: EntityImpl[]): number {
    if (members.length < 3) return 1.0;

    // Build trait vectors once (avoid re-computing per pair)
    const traitVectors: number[][] = members.map(entity => {
      const genetic = entity.getComponent<GeneticComponent>(CT.Genetic);
      if (!genetic) {
        throw new Error(
          `[extinction_vortex_system] Entity ${entity.id} has Species+Genetic query match but missing GeneticComponent`
        );
      }
      return this.buildTraitVector(genetic);
    });

    const n = traitVectors.length;
    let pairCount = 0;
    let distanceSum = 0;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const vecI = traitVectors[i];
        const vecJ = traitVectors[j];
        if (!vecI || !vecJ) {
          throw new Error(`[extinction_vortex_system] Unexpected undefined trait vector at index ${i} or ${j}`);
        }
        distanceSum += this.cosineDistance(vecI, vecJ);
        pairCount++;
      }
    }

    if (pairCount === 0) return 1.0;
    return distanceSum / pairCount;
  }

  /**
   * Map a GeneticComponent's genome to a numeric trait vector.
   * dominant=1, recessive=0, both(codominant)=0.5
   */
  private buildTraitVector(genetic: GeneticComponent): number[] {
    const vector: number[] = [];
    for (const allele of genetic.genome) {
      switch (allele.expressedAllele) {
        case 'dominant':
          vector.push(1.0);
          break;
        case 'recessive':
          vector.push(0.0);
          break;
        case 'both':
          vector.push(0.5);
          break;
        default:
          throw new Error(
            `[extinction_vortex_system] Unknown expressedAllele value: ${String(allele.expressedAllele)} on traitId ${allele.traitId}`
          );
      }
    }
    return vector;
  }

  /**
   * Cosine distance between two vectors: 1 - (A·B / (|A|*|B|))
   *
   * Uses |A|² and |B|² inline — no Math.sqrt per CLAUDE.md perf guidelines.
   * The cosine similarity formula requires √(|A|²*|B|²) = |A|*|B|,
   * so we compute Math.sqrt once per pair (unavoidable for cosine).
   * Still avoids sqrt inside inner loops over alleles.
   */
  private cosineDistance(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 0;

    let dot = 0;
    let magASq = 0;
    let magBSq = 0;

    for (let k = 0; k < len; k++) {
      const ak = a[k] ?? 0;
      const bk = b[k] ?? 0;
      dot += ak * bk;
      magASq += ak * ak;
      magBSq += bk * bk;
    }

    // Both vectors are zero-length → treat as identical (distance = 0)
    if (magASq === 0 && magBSq === 0) return 0;
    // One vector is zero → orthogonal by convention (distance = 1)
    if (magASq === 0 || magBSq === 0) return 1;

    const similarity = dot / Math.sqrt(magASq * magBSq);
    // Clamp to [-1, 1] to guard against floating-point drift
    const clampedSim = similarity < -1 ? -1 : similarity > 1 ? 1 : similarity;
    return 1 - clampedSim;
  }

  // ============================================================================
  // Phase Transitions
  // ============================================================================

  /**
   * Evaluate and apply phase transitions based on current metrics.
   * Mutates the monitor component and emits events as needed.
   */
  private evaluatePhase(
    ctx: SystemContext,
    monitor: ExtinctionVortexMonitorComponent,
    metrics: ExtinctionMetrics,
  ): void {
    const { fPopulation: F, dccPopulation: Dcc } = metrics;
    const currentPhase = monitor.phase;

    switch (currentPhase) {
      case 'none': {
        // Direct skip to grace: severe condition
        if (Dcc < 0.005 && F > 0.25) {
          this.enterGrace(ctx, monitor, metrics);
          return;
        }
        // Warning condition
        if (Dcc < 0.01 || F > 0.20) {
          monitor.phase = 'warning';
          monitor.warningStartTick = ctx.tick;
          ctx.emit('species:extinction_warning', {
            speciesId: monitor.speciesId,
            phase: 'warning',
            metrics,
          });
        }
        return;
      }

      case 'warning': {
        // Full recovery
        if (Dcc >= 0.01 && F <= 0.20) {
          const fromPhase: 'warning' = 'warning';
          monitor.phase = 'none';
          ctx.emit('species:extinction_recovered', {
            speciesId: monitor.speciesId,
            fromPhase,
            metrics,
          });
          return;
        }
        // Escalate to grace
        if (Dcc < 0.005 && F > 0.25) {
          this.enterGrace(ctx, monitor, metrics);
        }
        return;
      }

      case 'grace': {
        // Full recovery
        if (Dcc >= 0.01 && F <= 0.20) {
          const fromPhase: 'grace' = 'grace';
          monitor.phase = 'none';
          monitor.graceTicksRemaining = 0;
          ctx.emit('species:extinction_recovered', {
            speciesId: monitor.speciesId,
            fromPhase,
            metrics,
          });
          return;
        }

        // Partial recovery — back to warning
        if (Dcc >= 0.005 || F <= 0.25) {
          const fromPhase: 'grace' = 'grace';
          monitor.phase = 'warning';
          monitor.graceTicksRemaining = 0;
          // Reuse warningStartTick — already set when we first entered warning
          ctx.emit('species:extinction_recovered', {
            speciesId: monitor.speciesId,
            fromPhase,
            metrics,
          });
          return;
        }

        // Still in grace — decrement counter
        monitor.graceTicksRemaining -= 1;

        if (monitor.graceTicksRemaining <= 0) {
          // Extinct
          const survivorCount = metrics.populationSize;
          monitor.phase = 'extinct';
          ctx.emit('species:extinct', {
            speciesId: monitor.speciesId,
            finalMetrics: metrics,
            survivorCount,
          });
        } else {
          ctx.emit('species:extinction_grace_tick', {
            speciesId: monitor.speciesId,
            graceTicksRemaining: monitor.graceTicksRemaining,
          });
        }
        return;
      }

      // 'extinct' is handled early in onUpdate — should never reach here
      default:
        throw new Error(
          `[extinction_vortex_system] Unhandled ExtinctionVortexPhase: ${String(currentPhase)}`
        );
    }
  }

  /**
   * Transition to grace phase and emit grace_started event.
   */
  private enterGrace(
    ctx: SystemContext,
    monitor: ExtinctionVortexMonitorComponent,
    metrics: ExtinctionMetrics,
  ): void {
    monitor.phase = 'grace';
    monitor.graceTicksRemaining = ExtinctionVortexSystem.GRACE_GENERATIONS;
    monitor.graceStartTick = ctx.tick;
    ctx.emit('species:extinction_grace_started', {
      speciesId: monitor.speciesId,
      graceTicksRemaining: monitor.graceTicksRemaining,
      metrics,
    });
  }
}
