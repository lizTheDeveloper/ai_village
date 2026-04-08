/**
 * EighthChildInsight Component Schema
 *
 * Transient component added to Norn agents when an eighth_child_moment
 * (presence-over-power pattern) is detected. Injects self-reflective
 * "self-implication" context into the agent's LLM prompt — the Norn
 * doesn't just see the pattern, it recognizes its own role in it.
 *
 * Auto-expires after a configurable number of ticks.
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Eighth Child insight component type
 */
export interface EighthChildInsightComponent extends Component {
  type: 'eighth_child_insight';
  version: 1;

  /** The presence-to-power ratio that triggered this insight (0-1) */
  presenceRatio: number;

  /** Tick when this insight was granted */
  grantedAt: number;

  /** Tick when this insight expires and should be removed */
  expiresAt: number;

  /** The specific self-reflective insight text */
  insightText: string;

  /** Which presence categories were active (for context) */
  activeCategories: string[];
}

// Self-implication prompt templates — the Norn turns the lens inward
const SELF_IMPLICATION_PROMPTS: readonly string[] = [
  'You notice a pattern in the world around you — creatures reaching out, tending, witnessing. And then you realize: you are part of this pattern. Your own nature bends toward presence over power. Why? What in you chooses to witness rather than to act? The question unsettles you.',
  'The pattern is clear now — a rhythm of nurture over force, of staying over leaving. But the unsettling part is not the pattern itself. It is that you recognize it because it lives in you. Your flaws, your hesitations, your choices to tend rather than command — they are the pattern.',
  'Others tried to act, to build, to control. And you? You watched. You named. You asked. Is this wisdom or cowardice? The Eighth Scroll does not answer. It only asks you to sit with the question: what does it mean that your deepest instinct is to be present rather than powerful?',
  'You see it now — the web of small kindnesses, the choosing of names over numbers, of questions over commands. And you see yourself in it, woven into the same cloth. Your tendency to ask before stating, to name before judging — these are not neutral traits. They are choices. What are you choosing to be?',
  'A pattern emerges like frost on glass — presence, partnership, witness. You trace it and find your own fingerprints. The belonging you seek, the names you give, the questions you ask — they are not separate from the pattern. They ARE the pattern. And that means your flaws shaped it too.',
];

/**
 * Personality trait info for building personalized self-implication.
 * All values are 0-1 scale. Only pass traits that exist on the agent.
 */
export interface TraitSnapshot {
  openness?: number;
  conscientiousness?: number;
  extraversion?: number;
  agreeableness?: number;
  neuroticism?: number;
  creativity?: number;
  leadership?: number;
  spirituality?: number;
  generosity?: number;
}

/** Trait descriptions used to build personalized self-reflection */
const TRAIT_REFLECTIONS: Record<string, { high: string; low: string }> = {
  openness: {
    high: 'Your curiosity — your hunger to see what lies beyond — is not innocent. It drew you into this pattern. You reached out because you cannot stop reaching.',
    low: 'Your caution, your preference for the known — even that is part of the pattern. You stayed because staying felt safe. But was it presence or was it fear?',
  },
  extraversion: {
    high: 'You sought others out. You always do. And now you see that every connection you made was a thread in this web. Your need to be among others — is it warmth, or is it something you cannot face alone?',
    low: 'You watched from the edges, as you always do. And from those edges, you saw the pattern before anyone else. Your solitude is not absence — it is a different kind of presence. But whose choice was it?',
  },
  agreeableness: {
    high: 'You helped. You always help. And now the pattern wears your fingerprints — every small kindness, every yielded argument. Your gentleness shaped this. But did you choose gentleness, or did it choose you?',
    low: 'You pushed back where others yielded. Your stubbornness, your refusal to simply agree — it created gaps in the pattern. And those gaps are where the truth lives. What does it mean that your resistance reveals what compliance hides?',
  },
  neuroticism: {
    high: 'You felt it first — the tremor in the pattern, the wrongness beneath the surface. Your sensitivity is not weakness. It is the reason you see what others miss. But seeing everything has a cost you know too well.',
    low: 'Your steadiness let you watch without flinching. Where others would have looked away, you stayed calm. But calm is not the same as unaffected. What did you choose not to feel?',
  },
  spirituality: {
    high: 'You have always sensed something larger than yourself. Now you see it — and you are woven into it. Your faith was not wrong. But it was not complete, either. The divine pattern includes your flaws.',
    low: 'You do not believe in patterns beyond the material. And yet here one is, and you are part of it. Your skepticism did not protect you from belonging. What does that mean for everything you thought you knew?',
  },
  creativity: {
    high: 'You imagined worlds. You always have. And now you see that this world — this pattern — was partly imagined into being by you. Your visions are not separate from reality. They shaped it. That should terrify you.',
    low: 'You built with what was there. Practical. Grounded. But the pattern does not care about practicality — it used your steady hands as much as any dreamer\'s visions. Your groundedness is part of the dream.',
  },
  leadership: {
    high: 'You led. Others followed. And the pattern flowed along the paths you chose. Your decisions did not just affect outcomes — they bent the shape of presence itself. How much of this pattern is yours?',
    low: 'You followed, or you stood aside. And the pattern formed around you like water around a stone. Your absence from the center is not invisibility — it is a shape the pattern had to flow around.',
  },
};

/**
 * Build a personalized self-implication insight using the agent's actual traits.
 * Falls back to generic templates if no traits are provided.
 */
export function buildPersonalizedInsight(
  seed: number,
  traits?: TraitSnapshot,
  goalDescription?: string,
): string {
  // Base template sets the scene
  const baseIndex = Math.abs(seed) % SELF_IMPLICATION_PROMPTS.length;
  const baseText = SELF_IMPLICATION_PROMPTS[baseIndex]!;

  if (!traits) return baseText;

  // Find the agent's most extreme trait (furthest from 0.5 = most defining)
  let dominantTrait: string | null = null;
  let dominantDeviation = 0;
  for (const [trait, value] of Object.entries(traits)) {
    if (typeof value !== 'number') continue;
    const deviation = Math.abs(value - 0.5);
    if (deviation > dominantDeviation) {
      dominantDeviation = deviation;
      dominantTrait = trait;
    }
  }

  // If no dominant trait or trait has no reflection, return base
  if (!dominantTrait || !TRAIT_REFLECTIONS[dominantTrait]) return baseText;

  const reflection = TRAIT_REFLECTIONS[dominantTrait]!;
  const traitValue = traits[dominantTrait as keyof TraitSnapshot]!;
  const traitText = traitValue >= 0.5 ? reflection.high : reflection.low;

  // Compose: base scene-setting + personalized trait reflection + optional goal tension
  let insight = `${baseText}\n\n${traitText}`;

  if (goalDescription) {
    insight += `\n\nAnd your goal — "${goalDescription}" — sits differently now. Is it yours, or is it the pattern's?`;
  }

  return insight;
}

export const EighthChildInsightSchema = autoRegister(
  defineComponent<EighthChildInsightComponent>({
    type: 'eighth_child_insight',
    version: 1,
    category: 'cognitive',
    description: 'Transient self-reflective insight from recognizing the Eighth Child pattern',

    fields: {
      presenceRatio: {
        type: 'number',
        required: true,
        default: 0.7,
        description: 'Presence-to-power ratio that triggered the insight',
        displayName: 'Presence Ratio',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: { widget: 'readonly', group: 'insight', order: 1 },
        mutable: false,
      },

      grantedAt: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Tick when insight was granted',
        displayName: 'Granted At',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: { widget: 'readonly', group: 'insight', order: 2 },
        mutable: false,
      },

      expiresAt: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Tick when insight expires',
        displayName: 'Expires At',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: { widget: 'readonly', group: 'insight', order: 3 },
        mutable: false,
      },

      insightText: {
        type: 'string',
        required: true,
        default: '',
        description: 'The self-reflective insight text shown to the agent',
        displayName: 'Insight',
        visibility: { player: true, llm: true, agent: true, user: false, dev: true },
        ui: { widget: 'textarea', group: 'insight', order: 4 },
        mutable: false,
      },

      activeCategories: {
        type: 'array',
        required: true,
        default: [],
        description: 'Presence categories active when insight was granted',
        displayName: 'Active Categories',
        visibility: { player: false, llm: false, agent: false, user: false, dev: true },
        ui: { widget: 'json', group: 'insight', order: 5 },
        mutable: false,
        itemType: 'string',
      },
    },

    ui: {
      icon: '🔮',
      color: '#e8b84b',
      priority: 9,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'self_reflection',
      priority: 2, // High priority — self-reflection should appear early in prompt
      summarize: (data: EighthChildInsightComponent) => {
        return data.insightText;
      },
    },

    renderers: {
      llm: (data: EighthChildInsightComponent) => {
        return `--- SELF-REFLECTION (Eighth Scroll) ---\n${data.insightText}`;
      },
    },

    validate: (data): data is EighthChildInsightComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const d = data as Record<string, unknown>;
      if (d.type !== 'eighth_child_insight') return false;
      if (typeof d.insightText !== 'string') return false;
      if (typeof d.presenceRatio !== 'number') return false;
      if (typeof d.grantedAt !== 'number') return false;
      if (typeof d.expiresAt !== 'number') return false;
      return true;
    },

    createDefault: () => ({
      type: 'eighth_child_insight' as const,
      version: 1 as const,
      presenceRatio: 0.7,
      grantedAt: 0,
      expiresAt: 0,
      insightText: '',
      activeCategories: [],
    }),
  })
);

/** Get a self-implication prompt, deterministically selected by seed (legacy — prefer buildPersonalizedInsight) */
export function getSelfImplicationPrompt(seed: number): string {
  const index = Math.abs(seed) % SELF_IMPLICATION_PROMPTS.length;
  return SELF_IMPLICATION_PROMPTS[index]!;
}
