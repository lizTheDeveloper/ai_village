/**
 * ScriptGenerator - LLM-powered script generation
 *
 * Generates TV scripts using language models with:
 * - Character consistency (voice, catchphrases)
 * - Plot coherence (story arcs, callbacks)
 * - Format-appropriate structure (sitcom vs drama vs news)
 * - Emotional beats and pacing
 */

import type { Storyline } from '../TVShow.js';
import type { ScriptAct, Scene, DialogueLine } from '../TVContent.js';
import { createDialogueLine, createScene } from '../TVContent.js';

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

export interface ScriptGenerationRequest {
  /** Show identifier */
  showId: string;

  /** Show title for context */
  showTitle: string;

  /** Show format (sitcom, drama, news, etc.) */
  format: string;

  /** Show premise/logline */
  premise: string;

  /** Tone guidelines */
  tone: string[];

  /** Available characters with personalities */
  characters: Array<{
    name: string;
    personality: string;
    catchphrases: string[];
  }>;

  /** Season number */
  season: number;

  /** Episode number */
  episode: number;

  /** Episode title */
  episodeTitle: string;

  /** Active storylines to continue */
  storylines: Storyline[];

  /** Summary of previous episode (if any) */
  previousEpisodeSummary: string;

  /** Optional specific scene requirements */
  sceneRequirements?: string[];

  /** Target runtime in minutes */
  targetRuntime?: number;
}

export interface ScriptGenerationResult {
  success: boolean;
  error?: string;

  /** Episode logline */
  logline?: string;

  /** Episode synopsis */
  synopsis?: string;

  /** Generated acts with scenes */
  acts?: ScriptAct[];

  /** Suggested title if different from request */
  suggestedTitle?: string;

  /** Notes for production */
  productionNotes?: string[];

  /** Callbacks to previous episodes */
  continuityNotes?: string[];
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const SCRIPT_SYSTEM_PROMPT = `You are a television script writer. Generate scripts that:
- Stay true to character voices and personalities
- Maintain continuity with ongoing storylines
- Include appropriate emotional beats
- Follow the show's established tone
- Create compelling dialogue and visual moments

Output format should be structured with clear act breaks and scene descriptions.`;

const FORMAT_GUIDELINES: Record<string, string> = {
  sitcom: `SITCOM FORMAT:
- 22 minutes runtime (3 acts)
- Comedic timing with setup/punchline structure
- A-plot (main story) and B-plot (secondary story)
- Cold open teaser before credits
- Tag scene after resolution
- Character-driven humor
- Callbacks to running gags`,

  drama: `DRAMA FORMAT:
- 42-60 minutes runtime (4-5 acts)
- Emotional stakes and character development
- Multiple interweaving storylines
- Cliffhangers at act breaks
- Subtext in dialogue
- Visual storytelling opportunities`,

  soap_opera: `SOAP OPERA FORMAT:
- 45 minutes runtime (5-6 acts)
- Serialized storytelling, no standalone resolution
- Multiple cliffhangers per episode
- Dramatic reveals and confrontations
- Love triangles and family conflicts
- Heavy use of emotional closeups`,

  news: `NEWS FORMAT:
- 30 minutes runtime
- Anchor desk segments
- Field reporter packages
- Breaking news interruptions
- Interview segments
- Weather and sports briefs`,

  talk_show: `TALK SHOW FORMAT:
- 60 minutes runtime
- Opening monologue
- Desk segment with banter
- 2-3 guest interviews
- Musical/performance segment
- Audience interaction moments`,

  game_show: `GAME SHOW FORMAT:
- 30-60 minutes runtime
- Clear round structure
- Contestant introductions
- Building tension per round
- Final challenge/jackpot round
- Prizes and reveals`,

  variety: `VARIETY FORMAT:
- 60 minutes runtime
- Multiple sketch segments
- Musical performances
- Host transitions
- Celebrity appearances
- Recurring characters/bits`,

  documentary: `DOCUMENTARY FORMAT:
- 45-60 minutes runtime
- Voiceover narration
- Interview soundbites
- B-roll descriptions
- Chronological or thematic structure
- Opening hook and conclusion`,

  reality: `REALITY FORMAT:
- 45 minutes runtime
- Confessional interviews
- Challenge/competition scenes
- Drama between cast members
- Cliffhanger eliminations
- Producer-driven narrative beats`,

  animated: `ANIMATED FORMAT:
- 22 minutes runtime (3 acts)
- Visual gag descriptions
- Exaggerated character reactions
- Fantasy/impossible sequences allowed
- Action sequences with timing notes`,
};

// ============================================================================
// SCRIPT GENERATOR
// ============================================================================

import type { LLMProvider } from '../../types/LLMTypes.js';

export class ScriptGenerator {
  private llmProvider: LLMProvider | null = null;

  /**
   * Set the LLM provider for script generation
   */
  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
  }

  /**
   * Generate a script for an episode
   */
  async generateScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResult> {
    if (!this.llmProvider) {
      // Return placeholder content when no LLM available
      return this.generatePlaceholderScript(request);
    }

    try {
      const prompt = this.buildPrompt(request);
      const response = await this.llmProvider.generate(SCRIPT_SYSTEM_PROMPT, prompt);
      return this.parseResponse(response, request);
    } catch (error) {
      return {
        success: false,
        error: `Script generation failed: ${error}`,
      };
    }
  }

  /**
   * Build the generation prompt
   */
  private buildPrompt(request: ScriptGenerationRequest): string {
    const formatGuide = FORMAT_GUIDELINES[request.format] ?? FORMAT_GUIDELINES['drama'];

    const characterDescriptions = request.characters
      .map(c => {
        const phrases = c.catchphrases.length > 0
          ? `Catchphrases: "${c.catchphrases.join('", "')}"`
          : '';
        return `- ${c.name}: ${c.personality}${phrases ? `. ${phrases}` : ''}`;
      })
      .join('\n');

    const storylineDescriptions = request.storylines
      .map(s => `- "${s.title}": ${s.plot} (Status: ${s.status})`)
      .join('\n');

    let prompt = `
SHOW: ${request.showTitle}
PREMISE: ${request.premise}
TONE: ${request.tone.join(', ')}

${formatGuide}

EPISODE: Season ${request.season}, Episode ${request.episode}
TITLE: ${request.episodeTitle}

CHARACTERS:
${characterDescriptions}

ONGOING STORYLINES:
${storylineDescriptions || 'None - establish new storylines'}
`;

    if (request.previousEpisodeSummary) {
      prompt += `\nPREVIOUSLY: ${request.previousEpisodeSummary}\n`;
    }

    if (request.sceneRequirements?.length) {
      prompt += `\nREQUIRED SCENES:\n${request.sceneRequirements.map(r => `- ${r}`).join('\n')}\n`;
    }

    prompt += `
Generate a complete script with:
1. A compelling logline (one sentence)
2. A synopsis (2-3 paragraphs)
3. Act-by-act breakdown with scenes
4. Key dialogue for important moments
5. Stage directions and emotional beats

Format each scene as:
SCENE [number]: [location] - [time]
[Description of action]
[CHARACTER NAME]: [dialogue]
`;

    return prompt;
  }

  /**
   * Parse LLM response into structured result
   */
  private parseResponse(response: string, request: ScriptGenerationRequest): ScriptGenerationResult {
    // Basic parsing - in production would use more sophisticated extraction
    const lines = response.split('\n');
    let logline = '';
    let synopsis = '';
    const acts: ScriptAct[] = [];
    let currentAct: ScriptAct | null = null;
    let currentScene: Scene | null = null;
    let currentAction = '';

    for (const line of lines) {
      const trimmed = line.trim();

      // Extract logline
      if (trimmed.toLowerCase().startsWith('logline:')) {
        logline = trimmed.substring(8).trim();
        continue;
      }

      // Extract synopsis
      if (trimmed.toLowerCase().startsWith('synopsis:')) {
        synopsis = trimmed.substring(9).trim();
        continue;
      }

      // Detect act breaks
      if (trimmed.match(/^act\s+(\d+|one|two|three|four|five)/i)) {
        if (currentAct) {
          if (currentScene) {
            currentScene.action = currentAction;
            currentAct.scenes.push(currentScene);
            currentScene = null;
            currentAction = '';
          }
          acts.push(currentAct);
        }
        currentAct = {
          actNumber: acts.length + 1,
          scenes: [],
        };
        continue;
      }

      // Detect scenes
      const sceneMatch = trimmed.match(/^scene\s+(\d+):\s*(.+)/i);
      if (sceneMatch) {
        if (currentScene && currentAct) {
          currentScene.action = currentAction;
          currentAct.scenes.push(currentScene);
          currentAction = '';
        }
        const locationParts = sceneMatch[2]!.split('-');
        currentScene = createScene(
          parseInt(sceneMatch[1]!, 10),
          locationParts[0]?.trim() ?? 'INT. UNKNOWN',
          [], // characters filled later
          'development',
          'story progression'
        );
        continue;
      }

      // Parse dialogue lines
      const dialogueMatch = trimmed.match(/^([A-Z][A-Z\s]+):\s*(.+)/);
      if (dialogueMatch && currentScene) {
        const characterName = dialogueMatch[1]!.trim();
        const character = request.characters.find(
          c => c.name.toUpperCase() === characterName
        );
        if (character) {
          currentScene.dialogue.push(createDialogueLine(
            character.name,
            dialogueMatch[2]!.trim()
          ));
          // Add character to scene if not already there
          if (!currentScene.characters.includes(character.name)) {
            currentScene.characters.push(character.name);
          }
        }
        continue;
      }

      // Add to scene action
      if (currentScene && trimmed && !trimmed.startsWith('[')) {
        currentAction += (currentAction ? ' ' : '') + trimmed;
      }
    }

    // Push final scene and act
    if (currentScene && currentAct) {
      currentScene.action = currentAction;
      currentAct.scenes.push(currentScene);
    }
    if (currentAct) {
      acts.push(currentAct);
    }

    // Ensure at least one act exists
    if (acts.length === 0) {
      const defaultScene = createScene(
        1,
        'INT. MAIN SET',
        request.characters.slice(0, 2).map(c => c.name),
        'introduction',
        'establish setting'
      );
      defaultScene.action = synopsis || 'Scene to be developed.';
      acts.push({
        actNumber: 1,
        scenes: [defaultScene],
      });
    }

    return {
      success: true,
      logline: logline || `${request.showTitle} - S${request.season}E${request.episode}`,
      synopsis: synopsis || `Episode ${request.episode} of ${request.showTitle}`,
      acts,
    };
  }

  /**
   * Generate placeholder script when no LLM available
   */
  private generatePlaceholderScript(request: ScriptGenerationRequest): ScriptGenerationResult {
    const mainCharacters = request.characters.slice(0, 3);
    const characterNames = mainCharacters.map(c => c.name);

    // Create dialogue for each character
    const dialogue1: DialogueLine[] = mainCharacters.slice(0, 2).map(char =>
      createDialogueLine(
        char.name,
        char.catchphrases[0] ?? `Hello, this is ${char.name}.`
      )
    );

    const dialogue2: DialogueLine[] = mainCharacters.slice(1, 3).map(char =>
      createDialogueLine(
        char.name,
        char.catchphrases[0] ?? `I have thoughts about this.`
      )
    );

    const dialogue3: DialogueLine[] = mainCharacters.map(char =>
      createDialogueLine(
        char.name,
        char.catchphrases[0] ?? `Things are getting interesting.`
      )
    );

    // Create scenes
    const scene1 = createScene(
      1,
      'INT. MAIN SET',
      characterNames.slice(0, 2),
      'introduction',
      'establish characters'
    );
    scene1.action = `Opening scene for ${request.episodeTitle}. The main characters gather.`;
    scene1.dialogue = dialogue1;

    const scene2 = createScene(
      2,
      'EXT. LOCATION',
      characterNames.slice(1, 3),
      'development',
      'introduce conflict'
    );
    scene2.action = 'The story develops as characters face a new challenge.';
    scene2.dialogue = dialogue2;

    const scene3 = createScene(
      3,
      'INT. SECONDARY SET',
      characterNames,
      'climax',
      'build tension'
    );
    scene3.action = 'Tension builds as the main conflict emerges.';
    scene3.dialogue = dialogue3;

    const scene4 = createScene(
      4,
      'INT. MAIN SET',
      characterNames.slice(0, 2),
      'resolution',
      'wrap up and tease next episode'
    );
    scene4.action = 'Resolution and setup for next episode.';
    scene4.dialogue = dialogue1;

    const acts: ScriptAct[] = [
      {
        actNumber: 1,
        scenes: [scene1, scene2],
      },
      {
        actNumber: 2,
        scenes: [scene3],
      },
      {
        actNumber: 3,
        scenes: [scene4],
      },
    ];

    return {
      success: true,
      logline: `${request.showTitle} - S${request.season}E${request.episode}: ${request.episodeTitle}`,
      synopsis: request.premise,
      acts,
      productionNotes: ['Placeholder script - LLM generation not available'],
    };
  }
}

// ============================================================================
// DIALOGUE GENERATOR
// ============================================================================

export interface DialogueCharacter {
  name: string;
  personality: string;
  catchphrases: string[];
}

export interface DialogueGenerationRequest {
  /** Character speaking */
  character: DialogueCharacter;

  /** Scene context */
  context: string;

  /** Other characters in scene */
  otherCharacters: string[];

  /** Emotional state */
  emotion: string;

  /** Previous line (if responding) */
  previousLine?: string;
}

export interface DialogueGenerationResult {
  success: boolean;
  line?: string;
  direction?: string;
  error?: string;
}

export class DialogueGenerator {
  private llmProvider: LLMProvider | null = null;

  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
  }

  /**
   * Generate a single line of dialogue
   */
  async generateLine(request: DialogueGenerationRequest): Promise<DialogueGenerationResult> {
    if (!this.llmProvider) {
      // Return character's catchphrase or generic line
      const catchphrase = request.character.catchphrases[0];
      return {
        success: true,
        line: catchphrase ?? `I have something to say about that.`,
        direction: `(${request.emotion})`,
      };
    }

    try {
      const prompt = `
CHARACTER: ${request.character.name}
PERSONALITY: ${request.character.personality}
CATCHPHRASES: ${request.character.catchphrases.join(', ') || 'None'}
EMOTION: ${request.emotion}

SCENE CONTEXT: ${request.context}
OTHER CHARACTERS PRESENT: ${request.otherCharacters.join(', ')}

${request.previousLine ? `RESPONDING TO: "${request.previousLine}"` : 'Starting a new exchange.'}

Generate a single line of dialogue for ${request.character.name} that:
- Reflects their personality
- Matches the emotional tone
- Feels natural in context
- May include a catchphrase if appropriate

Format: [DIRECTION] "DIALOGUE"
`;

      const response = await this.llmProvider.generate(
        'You are a dialogue writer. Generate natural, character-appropriate dialogue.',
        prompt
      );

      // Parse response
      const directionMatch = response.match(/\[([^\]]+)\]/);
      const dialogueMatch = response.match(/"([^"]+)"/);

      return {
        success: true,
        line: dialogueMatch?.[1] ?? response.trim(),
        direction: directionMatch?.[1] ?? request.emotion,
      };
    } catch (error) {
      return {
        success: false,
        error: `Dialogue generation failed: ${error}`,
      };
    }
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a script generator function for TVWritingSystem
 */
export function createScriptGeneratorCallback(
  generator: ScriptGenerator
): (req: ScriptGenerationRequest) => Promise<ScriptGenerationResult> {
  return (req) => generator.generateScript(req);
}
