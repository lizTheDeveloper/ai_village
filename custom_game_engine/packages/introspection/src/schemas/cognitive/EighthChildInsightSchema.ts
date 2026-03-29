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

/** Get a self-implication prompt, deterministically selected by seed */
export function getSelfImplicationPrompt(seed: number): string {
  const index = Math.abs(seed) % SELF_IMPLICATION_PROMPTS.length;
  return SELF_IMPLICATION_PROMPTS[index]!;
}
