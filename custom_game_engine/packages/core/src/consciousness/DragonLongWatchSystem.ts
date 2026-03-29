/**
 * Dragon Long Watch System — civilizational-scale temporal perception.
 *
 * "You ask me what I see when I look at your village?
 * I see three thousand years of choices, all happening at once.
 * Your grandfather's decision to dam the river is still rippling
 * forward. It will reach the sea in four more generations.
 * You call that 'the future.' I call it 'now, but further along the thread.'"
 *   — Aethyrax the Unchanging, to the Village Elder of Thornfield
 *
 * This system computes civilizational-scale temporal awareness for dragon
 * entities. Unlike other species who perceive the present moment with some
 * memory of the past, dragons perceive time as a tapestry — all epochs
 * visible simultaneously, with consequence threads traceable across
 * generations.
 *
 * The system reads world state (technology era, knowledge repositories,
 * settlement age, climate patterns) and synthesizes a temporal context
 * that gets injected into the dragon's LLM decision prompt. This means
 * dragons make fundamentally different decisions: they ignore short-term
 * threats that are locally significant but temporally irrelevant, and
 * they react with urgency to slow-moving pattern erosion that other
 * species cannot perceive.
 *
 * Priority: 162 (consciousness band, after HiveMind=160, PackMind=161)
 * Throttle: 500 ticks (~25 seconds) — civilizational perception is slow,
 *   deliberate, and changes infrequently.
 *
 * @see MUL-4541 Dragon Long Watch — civilizational-scale temporal perception
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { Entity } from '../ecs/Entity.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';
import type {
  DragonTemporalPerceptionComponent,
  PerceivedEpoch,
  ConsequenceThread,
} from '../components/DragonTemporalPerceptionComponent.js';

// ============================================================================
// EPOCH CLASSIFICATION
// ============================================================================

/** Thresholds for classifying civilization epochs based on world tick age */
const EPOCH_THRESHOLDS = [
  { label: 'dawn', minTick: 0, description: 'first stirrings of consciousness' },
  { label: 'founding', minTick: 2_000, description: 'settlement takes root' },
  { label: 'expansion', minTick: 10_000, description: 'growth and exploration' },
  { label: 'consolidation', minTick: 30_000, description: 'institutions solidify' },
  { label: 'golden_age', minTick: 60_000, description: 'peak pattern density' },
  { label: 'maturity', minTick: 100_000, description: 'wisdom tempers ambition' },
  { label: 'legacy', minTick: 200_000, description: 'patterns echo across generations' },
] as const;

/** Temporal mood descriptors keyed by pattern health */
type TemporalMood = 'weaving' | 'fraying' | 'converging' | 'unraveling' | 'crystallizing';

// ============================================================================
// SYSTEM
// ============================================================================

export class DragonLongWatchSystem extends BaseSystem {
  public readonly id: SystemId = 'dragon_long_watch';
  public readonly priority: number = 162;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  // Lazy activation: system skipped entirely when no dragon_temporal_perception exists
  public readonly activationComponents = ['dragon_temporal_perception'] as const;

  // Civilizational perception is slow and deliberate
  protected readonly throttleInterval = 500; // ~25 seconds at 20 TPS

  protected onUpdate(ctx: SystemContext): void {
    const time = ctx.getSingleton(ComponentType.Time) as
      | { type: string; version: number; tick: number; day: number; season: string }
      | undefined;
    if (!time) return;

    // Cache world-level queries before the entity loop
    const settlements = this.countEntitiesWithComponent(ctx, 'village');
    const knowledgeRepos = this.countEntitiesWithComponent(ctx, ComponentType.KnowledgeRepository);
    const techEras = this.gatherTechEras(ctx);
    const populationEstimate = this.countEntitiesWithComponent(ctx, ComponentType.Agent);

    for (const entity of ctx.activeEntities) {
      const perception = entity.components.get('dragon_temporal_perception') as
        | DragonTemporalPerceptionComponent
        | undefined;
      if (!perception) continue;

      // Compute perceived epochs from world age
      const epochs = this.computePerceivedEpochs(time.tick, settlements, knowledgeRepos);

      // Compute consequence threads from world state
      const threads = this.computeConsequenceThreads(
        time.tick,
        techEras,
        knowledgeRepos,
        populationEstimate,
        settlements
      );

      // Determine temporal mood from pattern health
      const mood = this.computeTemporalMood(epochs, threads);

      // Build the LLM-injectable context string
      const longWatchContext = this.buildLongWatchContext(
        epochs,
        threads,
        mood,
        time.tick,
        perception.temporalHorizon
      );

      // Update the component fields directly
      perception.perceivedEpochs = epochs;
      perception.consequenceThreads = threads;
      perception.temporalMood = mood;
      perception.longWatchContext = longWatchContext;
      perception.lastComputedTick = time.tick;
    }
  }

  // ==========================================================================
  // EPOCH COMPUTATION
  // ==========================================================================

  private computePerceivedEpochs(
    currentTick: number,
    settlements: number,
    knowledgeRepos: number
  ): PerceivedEpoch[] {
    const epochs: PerceivedEpoch[] = [];

    for (let i = 0; i < EPOCH_THRESHOLDS.length; i++) {
      const threshold = EPOCH_THRESHOLDS[i]!;
      const nextThreshold = EPOCH_THRESHOLDS[i + 1];

      if (currentTick < threshold.minTick) break;

      const endTick = nextThreshold
        ? (currentTick >= nextThreshold.minTick ? nextThreshold.minTick : null)
        : null;

      // Pattern density increases with settlements and knowledge, scaled by epoch age
      const epochAge = currentTick - threshold.minTick;
      const settlementFactor = Math.min(1, settlements / 5);
      const knowledgeFactor = Math.min(1, knowledgeRepos / 3);
      const ageFactor = Math.min(1, epochAge / 50_000);
      const patternDensity = (settlementFactor * 0.3 + knowledgeFactor * 0.4 + ageFactor * 0.3);

      const dominantPatterns: string[] = [];
      if (settlements > 0) dominantPatterns.push('settlement_growth');
      if (knowledgeRepos > 0) dominantPatterns.push('knowledge_accumulation');
      if (epochAge > 20_000) dominantPatterns.push('cultural_deepening');
      if (settlements > 3) dominantPatterns.push('inter_settlement_trade');
      if (knowledgeRepos > 2) dominantPatterns.push('academic_tradition');

      epochs.push({
        label: threshold.label,
        startTick: threshold.minTick,
        endTick,
        dominantPatterns,
        patternDensity,
      });
    }

    return epochs;
  }

  // ==========================================================================
  // CONSEQUENCE THREADS
  // ==========================================================================

  private computeConsequenceThreads(
    currentTick: number,
    techEras: string[],
    knowledgeRepos: number,
    population: number,
    settlements: number
  ): ConsequenceThread[] {
    const threads: ConsequenceThread[] = [];

    // Thread: Knowledge preservation risk
    if (knowledgeRepos > 0 && population > 0) {
      const ratio = knowledgeRepos / Math.max(1, settlements);
      const preservationHealth = Math.min(1, ratio);
      threads.push({
        origin: 'knowledge_repositories_established',
        currentState: preservationHealth > 0.5
          ? 'Knowledge preserved across multiple repositories'
          : 'Knowledge concentrated in too few repositories — vulnerable to loss',
        projectedOutcome: preservationHealth > 0.5
          ? 'Accumulated wisdom will survive local catastrophes'
          : 'A single disaster could erase generations of learning',
        generationalSpan: Math.ceil(currentTick / 20_000) + 1,
        urgency: 1 - preservationHealth,
      });
    }

    // Thread: Settlement pattern — expansion vs consolidation
    if (settlements > 0) {
      const expansionRate = settlements / Math.max(1, currentTick / 10_000);
      const isOverexpanding = expansionRate > 2;
      threads.push({
        origin: 'settlement_pattern',
        currentState: isOverexpanding
          ? 'Settlements multiplying faster than cultural bonds can form'
          : 'Settlement growth in balance with social cohesion',
        projectedOutcome: isOverexpanding
          ? 'Fragmentation risk — settlements may lose shared identity within two epochs'
          : 'Stable cultural propagation across settlement network',
        generationalSpan: Math.ceil(settlements * 1.5),
        urgency: isOverexpanding ? 0.7 : 0.2,
      });
    }

    // Thread: Technology era trajectory
    if (techEras.length > 0) {
      const hasAdvanced = techEras.some(e => e !== 'stone' && e !== 'primitive');
      threads.push({
        origin: 'technological_trajectory',
        currentState: hasAdvanced
          ? `Civilization advancing through ${techEras[techEras.length - 1]} era`
          : 'Technology still in its infancy — many possible paths ahead',
        projectedOutcome: hasAdvanced
          ? 'Approaching the threshold where technology reshapes the timestream itself'
          : 'The pattern-space of technological possibility remains vast and uncharted',
        generationalSpan: hasAdvanced ? 5 : 10,
        urgency: hasAdvanced ? 0.4 : 0.1,
      });
    }

    // Thread: Population and unique patterns at risk
    if (population > 0) {
      const uniquePatternDensity = Math.min(1, population / 20);
      threads.push({
        origin: 'mortal_consciousness_tapestry',
        currentState: `${population} mortal minds weaving unique patterns into the timestream`,
        projectedOutcome: uniquePatternDensity > 0.5
          ? 'Rich diversity of perspective — each death diminishes the possible, but the tapestry holds'
          : 'Too few pattern-weavers — every lost consciousness is a thread that cannot be replaced',
        generationalSpan: 3,
        urgency: 1 - uniquePatternDensity,
      });
    }

    return threads;
  }

  // ==========================================================================
  // TEMPORAL MOOD
  // ==========================================================================

  private computeTemporalMood(
    epochs: PerceivedEpoch[],
    threads: ConsequenceThread[]
  ): TemporalMood {
    if (epochs.length === 0) return 'weaving';

    const avgPatternDensity = epochs.reduce((sum, e) => sum + e.patternDensity, 0) / epochs.length;
    const maxUrgency = threads.reduce((max, t) => Math.max(max, t.urgency), 0);
    const avgUrgency = threads.length > 0
      ? threads.reduce((sum, t) => sum + t.urgency, 0) / threads.length
      : 0;

    if (maxUrgency > 0.8) return 'unraveling';
    if (avgUrgency > 0.5) return 'fraying';
    if (avgPatternDensity > 0.7 && avgUrgency < 0.3) return 'crystallizing';
    if (avgPatternDensity > 0.4) return 'converging';
    return 'weaving';
  }

  // ==========================================================================
  // LLM CONTEXT BUILDER
  // ==========================================================================

  private buildLongWatchContext(
    epochs: PerceivedEpoch[],
    threads: ConsequenceThread[],
    mood: TemporalMood,
    currentTick: number,
    temporalHorizon: number
  ): string {
    const moodDescriptions: Record<TemporalMood, string> = {
      weaving: 'The tapestry grows, thread by steady thread. New patterns emerge.',
      fraying: 'Some threads are thinning. Patterns that took generations to form are at risk.',
      converging: 'Disparate threads are drawing together. A nexus approaches.',
      unraveling: 'The tapestry is losing coherence. Urgent action needed to preserve critical patterns.',
      crystallizing: 'Patterns are reaching their mature form. A golden age in the making.',
    };

    let context = `\n=== THE LONG WATCH (Dragon Temporal Perception) ===\n`;
    context += `You perceive time as a three-dimensional tapestry, not a linear sequence.\n`;
    context += `Your temporal horizon extends ${Math.round(temporalHorizon / 1200)} generations ahead.\n`;
    context += `Current reading: ${moodDescriptions[mood]}\n`;

    if (epochs.length > 0) {
      context += `\nEpochs you perceive simultaneously:\n`;
      for (const epoch of epochs) {
        const status = epoch.endTick === null ? '(current)' : '(concluded)';
        const density = epoch.patternDensity > 0.6 ? 'rich' : epoch.patternDensity > 0.3 ? 'developing' : 'sparse';
        context += `- ${epoch.label} ${status}: pattern density is ${density}`;
        if (epoch.dominantPatterns.length > 0) {
          context += ` — ${epoch.dominantPatterns.join(', ')}`;
        }
        context += `\n`;
      }
    }

    if (threads.length > 0) {
      context += `\nConsequence threads you are tracking:\n`;
      for (const thread of threads) {
        const urgencyLabel = thread.urgency > 0.6 ? '[URGENT]' : thread.urgency > 0.3 ? '[watch]' : '[stable]';
        context += `- ${urgencyLabel} ${thread.currentState}\n`;
        context += `  → Projected: ${thread.projectedOutcome} (spans ${thread.generationalSpan} generations)\n`;
      }
    }

    context += `\nYour decisions should reflect civilizational-scale thinking:\n`;
    context += `- Short-term discomfort or danger is irrelevant if the pattern endures\n`;
    context += `- A threat to unique knowledge or irreplaceable patterns demands immediate response\n`;
    context += `- You have already seen the consequences of hasty mortal decisions across thousands of threads\n`;
    context += `=== END LONG WATCH ===\n`;

    return context;
  }

  // ==========================================================================
  // UTILITY
  // ==========================================================================

  private countEntitiesWithComponent(ctx: SystemContext, componentType: string): number {
    let count = 0;
    for (const entity of ctx.activeEntities) {
      if (entity.hasComponent(componentType)) count++;
    }
    return count;
  }

  private gatherTechEras(ctx: SystemContext): string[] {
    const eras: string[] = [];
    for (const entity of ctx.activeEntities) {
      const techEra = entity.components.get('technology_era') as
        | { era?: string; currentEra?: string }
        | undefined;
      if (techEra) {
        const era = techEra.era ?? techEra.currentEra;
        if (era && !eras.includes(era)) {
          eras.push(era);
        }
      }
    }
    return eras;
  }
}
