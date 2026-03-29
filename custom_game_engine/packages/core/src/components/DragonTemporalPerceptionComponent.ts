import { ComponentBase } from '../ecs/Component.js';

/**
 * Dragon Long Watch — civilizational-scale temporal perception.
 *
 * Dragons perceive time as a tapestry, not a river. This component stores
 * a dragon's computed awareness of epochs, civilizational patterns, and
 * multi-generational consequences. The DragonLongWatchSystem computes this
 * state; the StructuredPromptBuilder injects it into LLM decision context
 * so that dragon agents make decisions at civilizational scale.
 *
 * Observable difference from other species: while a human agent sees
 * "it's raining and I'm hungry", a dragon agent sees "this settlement
 * is in its third generation of expansion; the knowledge repository is
 * degrading; the current rain pattern suggests a climate shift that will
 * test their food systems within two epochs."
 *
 * @see MUL-4541 Dragon Long Watch — civilizational-scale temporal perception
 */

/** A single epoch the dragon perceives in its Long Watch */
export interface PerceivedEpoch {
  /** Epoch identifier (e.g., 'founding', 'expansion', 'golden_age', 'decline') */
  label: string;
  /** Tick range this epoch spans */
  startTick: number;
  endTick: number | null; // null = current/ongoing
  /** Key patterns the dragon observes in this epoch */
  dominantPatterns: string[];
  /** Pattern density score (0-1): how many unique configurations exist */
  patternDensity: number;
}

/** A consequence thread the dragon tracks across time */
export interface ConsequenceThread {
  /** What action or event initiated this thread */
  origin: string;
  /** Current state of the consequence chain */
  currentState: string;
  /** Projected outcome if the pattern continues */
  projectedOutcome: string;
  /** How many generations this thread spans */
  generationalSpan: number;
  /** Urgency: how close to an irreversible state change (0-1) */
  urgency: number;
}

export interface DragonTemporalPerceptionData {
  /** How far ahead in ticks the dragon's awareness extends */
  temporalHorizon?: number;
  /** Epochs the dragon currently perceives */
  perceivedEpochs?: PerceivedEpoch[];
  /** Active consequence threads the dragon is tracking */
  consequenceThreads?: ConsequenceThread[];
  /** Pre-formatted LLM context string for prompt injection */
  longWatchContext?: string;
  /** World tick when the Long Watch was last computed */
  lastComputedTick?: number;
  /** The dragon's current temporal mood: how the tapestry looks to them */
  temporalMood?: 'weaving' | 'fraying' | 'converging' | 'unraveling' | 'crystallizing';
}

export class DragonTemporalPerceptionComponent extends ComponentBase {
  public readonly type = 'dragon_temporal_perception' as const;

  public temporalHorizon: number;
  public perceivedEpochs: PerceivedEpoch[];
  public consequenceThreads: ConsequenceThread[];
  public longWatchContext: string;
  public lastComputedTick: number;
  public temporalMood: 'weaving' | 'fraying' | 'converging' | 'unraveling' | 'crystallizing';

  constructor(data: DragonTemporalPerceptionData = {}) {
    super();
    // Default horizon: 100,000 ticks (~83 minutes of game time, representing centuries of dragon perception)
    this.temporalHorizon = data.temporalHorizon ?? 100_000;
    this.perceivedEpochs = data.perceivedEpochs ?? [];
    this.consequenceThreads = data.consequenceThreads ?? [];
    this.longWatchContext = data.longWatchContext ?? '';
    this.lastComputedTick = data.lastComputedTick ?? 0;
    this.temporalMood = data.temporalMood ?? 'weaving';
  }
}

export function createDragonTemporalPerceptionComponent(
  data: DragonTemporalPerceptionData = {}
): DragonTemporalPerceptionComponent {
  return new DragonTemporalPerceptionComponent(data);
}
