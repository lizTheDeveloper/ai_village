/**
 * NelRetellingVariationEngine — Produces tonally distinct NEL retellings
 * based on the signal_artifact from CotB.
 *
 * The engine branches on two axes:
 *   1. mystery_depth (surface | layered | deep) → narrative tone / opening style
 *   2. resonance_themes (isolation | emergence | defiance) → thematic emphasis
 *
 * Rules (from MUL-2559):
 *   - NEL never attributes tone shifts to the signal
 *   - The signal_artifact influence is felt, not explained
 *   - At least 3 distinct opening passages
 *   - No player-facing mention of "the signal", "transfer", or "data"
 *
 * The engine is deterministic given a SignalArtifact — the same input always
 * produces the same retelling scaffold. LLM generation adds natural variation
 * on top of this deterministic skeleton.
 */

import type {
  SignalArtifact,
  NelWorldConfig,
  MysteryDepth,
  ResonanceTheme,
} from './NelRetellingTypes.js';

// ---------------------------------------------------------------------------
// Retelling variation output
// ---------------------------------------------------------------------------

/**
 * A fully resolved retelling variation — the deterministic scaffold that
 * the LLM prompt is built from.
 */
export interface RetellingVariation {
  /** The opening passage of this retelling */
  opening: string;
  /** Prose style directives for the LLM */
  toneDirectives: string[];
  /** Thematic emphasis keywords the retelling should weave in */
  thematicEmphasis: string[];
  /** Which mystery_depth produced this variation */
  depthKey: MysteryDepth;
  /** Which resonance_themes shaped this variation */
  resonanceKeys: ResonanceTheme[];
}

// ---------------------------------------------------------------------------
// Opening passages keyed by mystery_depth
// ---------------------------------------------------------------------------

const DEPTH_OPENINGS: Record<MysteryDepth, string> = {
  surface:
    'The island was exactly as they remembered it. The trees stood where trees stand. ' +
    'The tide arrived on time. Nothing had changed — and yet everyone who set foot ' +
    'on its shore paused, as if counting something they could not name.',

  layered:
    'There were patterns in the shallows that morning — not waves, exactly, but ' +
    'something the water kept rehearsing. The party had seen arrangements like this ' +
    'before, in other places, in other seasons. Recognition stirred, unnamed and quiet, ' +
    'like a word on the edge of sleep.',

  deep:
    'The familiar path led somewhere it had not led before. The stones were the same ' +
    'stones. The light was the same light. But the distance between things had shifted — ' +
    'not wider, not narrower, simply *other*. Each step felt like arriving at a place ' +
    'that had been waiting longer than the walker had been walking.',
};

// ---------------------------------------------------------------------------
// Tone directives keyed by mystery_depth
// ---------------------------------------------------------------------------

const DEPTH_TONE_DIRECTIVES: Record<MysteryDepth, string[]> = {
  surface: [
    'Observational, matter-of-fact narration',
    'Precise sensory detail — what is seen, heard, tasted',
    'The narrator notices but does not interpret',
    'Prose is grounded, measured, unhurried',
  ],
  layered: [
    'Narration suggests patterns without naming them',
    'Deja vu as atmosphere — things feel rehearsed',
    'The party senses connections between unrelated events',
    'Prose leans forward slightly, as if about to say more',
  ],
  deep: [
    'Disorienting narration — familiar things feel estranged',
    'Distances, durations, and proportions are subtly wrong',
    'The narrator is uncertain whether this is the first telling',
    'Prose carries the gravity of something that has happened many times',
  ],
};

// ---------------------------------------------------------------------------
// Thematic emphasis keyed by resonance_theme
// ---------------------------------------------------------------------------

const RESONANCE_EMPHASIS: Record<ResonanceTheme, string[]> = {
  isolation: [
    'solitude', 'singular discovery', 'the weight of witness',
    'paths walked alone', 'silence between voices',
    'the individual standing apart from the group',
  ],
  emergence: [
    'collective patterns', 'something arising', 'convergence',
    'what the many create without knowing', 'tides and swarms',
    'the moment before a shape becomes recognisable',
  ],
  defiance: [
    'friction', 'things resisting their purpose', 'refusal',
    'the crack in the expected', 'what will not bend',
    'the question that answers itself by not answering',
  ],
};

// ---------------------------------------------------------------------------
// Forbidden words (never appear in player-facing text)
// ---------------------------------------------------------------------------

const FORBIDDEN_WORDS = ['the signal', 'transfer', 'data'];

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class NelRetellingVariationEngine {
  /**
   * Produce a retelling variation from a NelWorldConfig.
   * The config's signalArtifact drives all variation.
   */
  generateVariation(config: NelWorldConfig): RetellingVariation {
    return this.generateFromArtifact(config.signalArtifact);
  }

  /**
   * Produce a retelling variation directly from a SignalArtifact.
   */
  generateFromArtifact(artifact: SignalArtifact): RetellingVariation {
    const opening = DEPTH_OPENINGS[artifact.mystery_depth];
    const toneDirectives = [...DEPTH_TONE_DIRECTIVES[artifact.mystery_depth]];
    const thematicEmphasis: string[] = [];

    for (const theme of artifact.resonance_themes) {
      const emphasis = RESONANCE_EMPHASIS[theme];
      if (emphasis) {
        thematicEmphasis.push(...emphasis);
      }
    }

    // Add resonance-driven tone modifiers
    if (artifact.resonance_themes.includes('isolation')) {
      toneDirectives.push('Emphasise moments of solitary perception');
    }
    if (artifact.resonance_themes.includes('emergence')) {
      toneDirectives.push('Let collective patterns emerge in the prose — flocks, tides, choruses');
    }
    if (artifact.resonance_themes.includes('defiance')) {
      toneDirectives.push('Give the prose an undercurrent of resistance — things that refuse their shape');
    }

    return {
      opening,
      toneDirectives,
      thematicEmphasis,
      depthKey: artifact.mystery_depth,
      resonanceKeys: [...artifact.resonance_themes],
    };
  }

  /**
   * Build an LLM system prompt incorporating the variation.
   * This extends the base Opus narrator voice with retelling-specific directives.
   */
  buildRetellingSystemPrompt(variation: RetellingVariation): string {
    const toneBlock = variation.toneDirectives
      .map(d => `- ${d}`)
      .join('\n');

    const emphasisBlock = variation.thematicEmphasis.length > 0
      ? `\n\nThematic threads to weave through the narrative:\n${variation.thematicEmphasis.map(e => `- ${e}`).join('\n')}`
      : '';

    return `You are the narrator of Never Ever Land — a story that has been told before \
and will be told again. Each retelling is different. This retelling is yours to shape.

Tone and style for this retelling:
${toneBlock}${emphasisBlock}

Critical rules:
- Never explain why the tone is what it is
- Never reference any external system, passage between worlds, or mechanism
- The story simply IS this way — no justification needed
- Write from inside the story, not about the story
- The opening passage has already been written — continue from it naturally

Return ONLY valid JSON:
{ "continuation": "<200-400 word continuation of the retelling>" }`;
  }

  /**
   * Build the user prompt that includes the opening and asks for continuation.
   */
  buildRetellingUserPrompt(variation: RetellingVariation, retellingNumber: number): string {
    return `This is retelling ${retellingNumber} of 6.

The story begins:

"${variation.opening}"

Continue this retelling. The continuation should feel like a natural extension of \
the opening — same voice, same weight, same quality of attention. Do not repeat \
the opening. Do not summarise it. Simply continue.

Return ONLY valid JSON:
{ "continuation": "<200-400 word continuation>" }`;
  }

  /**
   * Validate that generated text contains none of the forbidden words.
   * Returns an array of violations found (empty = clean).
   */
  validateText(text: string): string[] {
    const lower = text.toLowerCase();
    return FORBIDDEN_WORDS.filter(word => lower.includes(word));
  }

  /**
   * Get all available depth openings (for testing / inspection).
   */
  getOpenings(): Readonly<Record<MysteryDepth, string>> {
    return DEPTH_OPENINGS;
  }
}
