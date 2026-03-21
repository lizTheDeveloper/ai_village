/**
 * SpellSandboxPromptBuilder - Player-authored spell casting via LLM composition
 *
 * Generates rich, flavourful spell descriptions from verb+noun token combinations
 * within a specific magical paradigm. Designed for the Research Casting Circle
 * (Drive 3 — Empowerment of Creativity & Feedback).
 *
 * All combinations produce interesting results — there are no "wrong" inputs.
 * Failed or unexpected combinations produce interesting flavour text rather than errors.
 *
 * When no `paradigmLore` is supplied in the composition, automatically falls back to
 * the rich template in SpellSandboxParadigmTemplates (if one exists for the paradigmId).
 */

import { getParadigmTemplate, formatParadigmLore } from './SpellSandboxParadigmTemplates.js';

/**
 * A player's spell composition: verb + noun within a paradigm.
 */
export interface SpellComposition {
  /** Verb token (e.g. "Ignite", "Bind", "Reveal", "Summon", "Transform", "Silence", "Grow") */
  verb: string;
  /** Noun token (e.g. "Stone", "Memory", "Rain", "Shadow", "Flame", "Bond", "Time") */
  noun: string;
  /** Paradigm ID from the magic system (e.g. "academic", "blood", "divine") */
  paradigmId: string;
  /** Human-readable paradigm name (e.g. "The Academies", "Blood Magic") */
  paradigmName: string;
  /** Short paradigm lore description for context (1-2 sentences) */
  paradigmLore?: string;
  /** Player's proficiency with this paradigm, 0–100 */
  playerProficiency?: number;
  /** Name of the universe this paradigm exists in, for added flavour */
  universeName?: string;
}

/**
 * Structured result from a spell casting attempt.
 */
export interface SpellResult {
  /** Auto-generated spell name (e.g. "Ember Thought", "Stone Dreaming") */
  title: string;
  /** 2–3 sentence flavourful description of the spell's effect */
  description: string;
  /**
   * Whether the combination resolved as a "true" discovered spell,
   * or as an interesting but non-standard effect.
   */
  isDiscovery: boolean;
  /** Relative power of the effect */
  powerLevel: 'minor' | 'moderate' | 'major' | 'legendary';
  /**
   * Optional world effect key that can be applied to the game world.
   * For example: "plant_tree", "reveal_hidden", "bind_entity"
   * Undefined if the spell is purely descriptive / flavour-only.
   */
  worldEffect?: string;
  /** Metadata for tracking unique spell discovery */
  compositionKey: string; // "{paradigmId}:{verb}:{noun}" normalised to lowercase
}

/**
 * Raw JSON shape the LLM must return.
 * Validated by SpellSandboxService before surfacing to callers.
 */
export interface SpellLLMResponse {
  title: string;
  description: string;
  is_discovery: boolean;
  power_level: 'minor' | 'moderate' | 'major' | 'legendary';
  world_effect?: string;
}

// ---------------------------------------------------------------------------
// Known verb and noun mappings to internal magic system vocabulary
// (used for world-effect hint generation in the prompt)
// ---------------------------------------------------------------------------

const VERB_HINTS: Record<string, string> = {
  ignite: 'create fire',
  kindle: 'create fire',
  extinguish: 'destroy fire',
  bind: 'control or restrict',
  reveal: 'perceive hidden things',
  unveil: 'perceive hidden things',
  summon: 'summon entities or forces',
  call: 'summon entities or forces',
  transform: 'transform the target',
  change: 'transform the target',
  silence: 'suppress or destroy sound',
  hush: 'suppress or destroy sound',
  grow: 'enhance or create plant life',
  wither: 'destroy plant life',
  protect: 'protect or shield',
  ward: 'protect or shield',
  shatter: 'destroy physical matter',
  mend: 'restore or heal',
  quicken: 'enhance speed or time flow',
  slow: 'diminish or slow',
  speak: 'communicate or create sound',
  draw: 'attract or summon',
  banish: 'destroy or send away',
  weave: 'transform or bind',
};

const NOUN_HINTS: Record<string, string> = {
  stone: 'earth or mineral',
  rock: 'earth or mineral',
  memory: 'mind or thought',
  dream: 'mind or spirit',
  rain: 'water or weather',
  water: 'water',
  shadow: 'darkness or void',
  darkness: 'void or shadow',
  flame: 'fire',
  fire: 'fire',
  bond: 'connection or emotion',
  time: 'time',
  wind: 'air',
  air: 'air',
  seed: 'plant',
  tree: 'plant',
  flesh: 'body',
  body: 'body',
  soul: 'spirit',
  spirit: 'spirit',
  metal: 'metal',
  iron: 'metal',
  sound: 'sound',
  word: 'text or language',
  name: 'text or language',
  emotion: 'emotion',
  grief: 'emotion',
  joy: 'emotion',
  light: 'energy or void',
  space: 'space',
  void: 'void',
  beast: 'animal',
  creature: 'animal',
};

function lookupHint(token: string, table: Record<string, string>): string | undefined {
  return table[token.toLowerCase().trim()];
}

// ---------------------------------------------------------------------------
// SpellSandboxPromptBuilder
// ---------------------------------------------------------------------------

export class SpellSandboxPromptBuilder {
  /**
   * Build a prompt that asks the LLM to describe the effect of casting
   * `verb` + `noun` within the given magical paradigm.
   *
   * The returned string is a complete user-turn message. Callers should send it
   * with the system prompt from `buildSystemPrompt()`.
   */
  buildUserPrompt(composition: SpellComposition): string {
    const { verb, noun, paradigmName, paradigmLore, playerProficiency = 50, universeName } = composition;

    const verbHint = lookupHint(verb, VERB_HINTS);
    const nounHint = lookupHint(noun, NOUN_HINTS);

    const proficiencyLabel =
      playerProficiency < 20 ? 'novice' :
      playerProficiency < 50 ? 'apprentice' :
      playerProficiency < 75 ? 'adept' :
      playerProficiency < 90 ? 'master' : 'grandmaster';

    const universeClause = universeName ? ` in the universe of ${universeName}` : '';

    const hintClause =
      verbHint && nounHint
        ? `\n\nMagic system context: "${verb}" relates to "${verbHint}" and "${noun}" relates to "${nounHint}".`
        : verbHint
          ? `\n\nMagic system context: "${verb}" relates to "${verbHint}".`
          : nounHint
            ? `\n\nMagic system context: "${noun}" relates to "${nounHint}".`
            : '';

    // Use caller-supplied lore first; fall back to rich template if available.
    const resolvedLore = paradigmLore ?? (() => {
      const template = getParadigmTemplate(composition.paradigmId);
      return template ? formatParadigmLore(template) : null;
    })();
    const loreClause = resolvedLore
      ? `\n\nParadigm lore: ${resolvedLore}`
      : '';

    return `A ${proficiencyLabel}-level practitioner of **${paradigmName}**${universeClause} casts a spell by combining the tokens:

**Verb:** ${verb}
**Noun:** ${noun}${hintClause}${loreClause}

Describe what happens. Return ONLY valid JSON in this exact shape:

{
  "title": "<evocative 2–4 word spell name>",
  "description": "<2–3 sentences of flavourful, in-world spell effect description. Be specific and immersive. Never use the words 'spell' or 'magic' — write from inside the world>",
  "is_discovery": <true if this is a coherent, intentional effect | false if the combination is strange but still produces a curious result>,
  "power_level": "<minor|moderate|major|legendary>",
  "world_effect": "<optional: one of plant_tree|reveal_hidden|bind_entity|create_fire|extinguish_fire|heal_wound|summon_creature|silence_area|alter_weather|transform_object — include ONLY if the effect maps clearly to one of these, otherwise omit>"
}`;
  }

  /**
   * System prompt establishing the creative writing persona.
   * Send this as the system/context turn before `buildUserPrompt()`.
   */
  buildSystemPrompt(): string {
    return `You are a master lorekeeper and creative writer for a living fantasy world. \
Your task is to write evocative, flavourful descriptions of magical effects. \
Every combination of tokens produces something interesting — unusual pairings produce curious, \
unexpected, or poetic results rather than failures. Write from inside the world; \
the player is discovering magic, not testing a system. \
Always return valid JSON and nothing else.`;
  }

  /**
   * Derive the stable composition key used for deduplication and spellbook storage.
   */
  compositionKey(composition: Pick<SpellComposition, 'paradigmId' | 'verb' | 'noun'>): string {
    return `${composition.paradigmId}:${composition.verb.toLowerCase().trim()}:${composition.noun.toLowerCase().trim()}`;
  }
}
