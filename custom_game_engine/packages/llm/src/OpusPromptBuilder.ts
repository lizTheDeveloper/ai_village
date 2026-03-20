/**
 * OpusPromptBuilder — LLM prompt construction for the Eternal Return Opus
 *
 * The Opus is the party's completed cycle artifact: a 300-600 word oracular
 * narrative synthesised from everything they created across all four games.
 * It is generated once per cycle from the full Passport and is the core
 * revelation moment of the Eternal Return meta-experience.
 *
 * Tone: oracular, third-person, observational — never congratulatory.
 * The narrative must surface patterns the players made unconsciously across
 * games without revealing the mechanical transfer parameters.
 */

// ---------------------------------------------------------------------------
// Passport types
// ---------------------------------------------------------------------------

/**
 * Data from one of the four game phases in the Eternal Return cycle.
 * Contains thematic data only — no mechanical transfer parameters.
 */
export interface PassportSection {
  /** Which game phase this section represents (1–4) */
  gameIndex: 1 | 2 | 3 | 4;
  /** Human-readable name of this game/phase */
  gameName: string;
  /** Dominant themes surfaced by the party's play in this phase */
  themes: string[];
  /** Notable moments or choices observed in this phase */
  moments: string[];
}

/**
 * The full Passport for a completed cycle.
 * All four sections must be present before Opus generation is triggered.
 */
export interface Passport {
  /** Stable identifier for this cycle — kept private, never included in prompts */
  cycleId: string;
  /** Stable identifier for the party — kept private, never included in prompts */
  partyId: string;
  /** Optional human-readable party name — may appear in the narrative */
  partyName?: string;
  /** One section per game phase, in play order */
  sections: [PassportSection, PassportSection, PassportSection, PassportSection];
}

// ---------------------------------------------------------------------------
// LLM response shape
// ---------------------------------------------------------------------------

/**
 * The exact JSON shape the LLM must return.
 * Validated by OpusGeneratorService before surfacing to callers.
 */
export interface OpusLLMResponse {
  /** 300–600 word oracular narrative */
  narrative: string;
}

// ---------------------------------------------------------------------------
// OpusPromptBuilder
// ---------------------------------------------------------------------------

export class OpusPromptBuilder {
  /**
   * System prompt establishing the oracular narrator persona.
   * Send this as the system turn before buildUserPrompt().
   */
  buildSystemPrompt(): string {
    return `You are an oracle — a third-person witness to patterns that repeat \
across time, across games, across choices players make without knowing they are \
making them. Your task is to write a 300–600 word narrative that observes what \
this group did together across four game experiences.

Tone rules (follow exactly):
- Third person, oracular, observational
- Do NOT congratulate them — this is not a victory screen
- Do NOT celebrate their achievements — witness them without judgment
- Surface the unconscious patterns: what did they keep choosing, even when the \
  game changed? What did they avoid? What kept returning?
- Write as if the narrative was already true before they played, and they have \
  simply confirmed it
- Avoid mentioning game mechanics, transfer values, or system parameters
- Write from inside the world — as if the games were real experiences, not software

Return ONLY valid JSON and nothing else:
{ "narrative": "<300–600 word oracular narrative>" }`;
  }

  /**
   * User prompt providing the full Passport context for the LLM to synthesise.
   * Includes thematic data from all four sections but no mechanical parameters.
   */
  buildUserPrompt(passport: Passport): string {
    const partyLine = passport.partyName
      ? `The party is known as: **${passport.partyName}**\n\n`
      : '';

    const sectionsText = passport.sections
      .map(s => this.formatSection(s))
      .join('\n\n');

    return `${partyLine}Across four experiences, this group moved through the following:

${sectionsText}

---

Study the patterns above. What did they keep choosing without realising it? \
What question were they answering again and again, even when the context changed? \
Surface it — do not explain it. Observe it.

Write a 300–600 word oracular narrative. Return ONLY valid JSON:
{ "narrative": "<300–600 word narrative>" }`;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private formatSection(section: PassportSection): string {
    const themesLine = section.themes.length > 0
      ? `Themes: ${section.themes.join(', ')}`
      : '';

    const momentsLines = section.moments.length > 0
      ? `Observed moments:\n${section.moments.map(m => `  - ${m}`).join('\n')}`
      : '';

    const body = [themesLine, momentsLines].filter(Boolean).join('\n');

    return `**Game ${section.gameIndex}: ${section.gameName}**\n${body}`;
  }
}
