/**
 * Translation Service
 *
 * LLM-powered translation of alien words using:
 * - Language character (texture, hardness, manner)
 * - Planet/species context
 * - Morpheme dictionary for consistency
 * - Carefully engineered prompts to ensure quality
 *
 * See TranslationBenchmark.test.ts for expected behaviors.
 */

import type { LLMProvider, LLMRequest, LLMResponse } from '@ai-village/llm';
import type { LanguageConfig, LanguageCharacter, PlanetConfig, BodyPlan } from './types.js';

/**
 * Translation response from LLM
 */
export interface TranslationResponse {
  word: string;
  translation: string;
  wordType: 'noun' | 'verb' | 'adjective' | 'adverb' | 'particle';
  morphemes: Morpheme[];
  culturalContext?: string;
  confidence: number;
}

/**
 * Morpheme (linguistic building block)
 */
export interface Morpheme {
  sound: string;
  meaning: string;
  type: 'root' | 'prefix' | 'suffix' | 'infix';
}

/**
 * Translation request context
 */
export interface TranslationRequest {
  word: string;
  languageConfig: LanguageConfig;
  existingMorphemes?: Morpheme[];
}

/**
 * Morpheme dictionary for consistency across translations
 */
export interface MorphemeDictionary {
  [sound: string]: Morpheme;
}

/**
 * Translation service using LLM
 */
export class TranslationService {
  constructor(
    private llmProvider: LLMProvider,
    private morphemeDictionary: MorphemeDictionary = {}
  ) {}

  /**
   * Translate an alien word using LLM
   *
   * @param request - Translation request with word and context
   * @returns Translation response with meaning and morphemes
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const prompt = this.buildTranslationPrompt(request);

    const llmRequest: LLMRequest = {
      prompt,
      temperature: 0.7,  // Creative but consistent
      maxTokens: 500,
      stopSequences: ['\n\n\n'],  // Stop at triple newline
    };

    const llmResponse: LLMResponse = await this.llmProvider.generate(llmRequest);

    return this.parseTranslationResponse(llmResponse.text, request.word);
  }

  /**
   * Build translation prompt with context
   *
   * This prompt is carefully engineered to follow TranslationBenchmark patterns:
   * - Cultural appropriateness (planet + species)
   * - Morpheme consistency
   * - Phoneme-to-meaning mapping
   * - Compound words preferred
   * - Avoid generic/Earth-centric terms
   */
  private buildTranslationPrompt(request: TranslationRequest): string {
    const { word, languageConfig } = request;
    const char = languageConfig.character!;

    // Build known morphemes list
    const knownMorphemes = Object.values(this.morphemeDictionary);
    const morphemeList = knownMorphemes.length > 0
      ? knownMorphemes.map(m => `  "${m.sound}" = ${m.meaning} (${m.type})`).join('\n')
      : '  (No morphemes learned yet)';

    // Build phoneme quality descriptions
    const textureDesc = this.getTextureDescription(char.primaryTexture);
    const hardnessDesc = this.getHardnessDescription(char.primaryHardness);
    const mannerDesc = this.getMannerDescription(char.primaryManner);

    // Build cultural context
    const planetContext = this.getPlanetContext(languageConfig.planetType);
    const bodyPlanContext = this.getBodyPlanContext(char.bodyPlanQualities || []);

    const prompt = `You are a xenolinguist translating an alien language.

## LANGUAGE CONTEXT

**Planet Type**: ${languageConfig.planetType}
**Environment**: ${planetContext}

**Species Body Plan**: ${char.bodyPlanQualities?.join(', ') || 'humanoid'}
**Biology**: ${bodyPlanContext}

**Language Character**:
- Primary Texture: ${char.primaryTexture} (${textureDesc})
- Primary Hardness: ${char.primaryHardness} (${hardnessDesc})
- Primary Manner: ${char.primaryManner} (${mannerDesc})

**Language Description**: ${languageConfig.description}

## PHONEME-TO-MEANING MAPPING GUIDE

The SOUND of phonemes influences their MEANING:

**Guttural phonemes** (kh, x, q, gh, rr):
  → Fire, stone, heat, ash, burn, volcanic, hard, rough, deep

**Liquid phonemes** (l, r, w, y):
  → Water, flow, river, stream, wave, rain, soft, smooth

**Percussive phonemes** (p, t, k, b, d, g):
  → Strike, hit, break, snap, sharp, quick, clipped

**Clicking phonemes** (!, |, ||, tk):
  → Strike, snap, click, burst, percussive, insect-like

**Sibilant phonemes** (s, sh, z, x):
  → Wind, hiss, air, whisper, sharp, cutting

**Nasal phonemes** (m, n, ng):
  → Resonate, hum, deep, hollow, echo

**Alien phonemes** (**, ◊, ○, ~, ↑, ↓):
  → Harmonic, layered, echo, sonar, whistle, trill

## KNOWN MORPHEMES (Reuse These for Consistency)

${morphemeList}

## TRANSLATION RULES

1. **Analyze the word phonetically**: Break "${word}" into morphemes based on sound patterns
2. **Reuse known morphemes** if they appear in the word
3. **Map new sounds to culturally appropriate meanings**:
   - Match planet environment (${languageConfig.planetType})
   - Match species biology (${char.bodyPlanQualities?.join(', ') || 'humanoid'})
   - Match language character (${char.primaryTexture}, ${char.primaryHardness})
4. **Prefer compound words**: "fire-stone" not "rock"
5. **Avoid Earth-centric concepts**: No "table", "chair", "car", "phone"
6. **Avoid generic terms**: No "thing", "object", "stuff", "item"
7. **Match texture to meaning**:
   - ${char.primaryTexture} language → ${textureDesc}
   - ${char.primaryHardness} sounds → ${hardnessDesc}

## WORD TO TRANSLATE

**Word**: "${word}"
**Phonemes**: ${word.split('').join(' ')}

## REQUIRED OUTPUT FORMAT (JSON)

Respond with ONLY valid JSON (no markdown, no explanation):

{
  "word": "${word}",
  "translation": "compound-word-translation",
  "wordType": "noun|verb|adjective|adverb|particle",
  "morphemes": [
    {
      "sound": "phoneme-sequence",
      "meaning": "specific-meaning",
      "type": "root|prefix|suffix|infix"
    }
  ],
  "culturalContext": "optional brief note on cultural significance",
  "confidence": 0.85
}

## EXAMPLES

**Harsh volcanic language** (kh, x, ak):
"khak" → {"word": "khak", "translation": "fire-stone", "wordType": "noun", "morphemes": [{"sound": "kh", "meaning": "fire", "type": "root"}, {"sound": "ak", "meaning": "stone", "type": "root"}], "confidence": 0.92}

**Soft aquatic language** (l, w, o):
"lowi" → {"word": "lowi", "translation": "water-glider", "wordType": "noun", "morphemes": [{"sound": "lo", "meaning": "water", "type": "root"}, {"sound": "wi", "meaning": "glider", "type": "suffix"}], "confidence": 0.88}

**Insectoid clicking language** (!, ||, zz):
"!||zzi" → {"word": "!||zzi", "translation": "hive-striker", "wordType": "noun", "morphemes": [{"sound": "!||", "meaning": "hive", "type": "prefix"}, {"sound": "zz", "meaning": "strike", "type": "root"}, {"sound": "i", "meaning": "agent", "type": "suffix"}], "confidence": 0.87}

Translate the word now. Respond with ONLY the JSON object:`;

    return prompt;
  }

  /**
   * Parse LLM response into TranslationResponse
   */
  private parseTranslationResponse(text: string, originalWord: string): TranslationResponse {
    // Remove markdown code blocks if present
    let jsonText = text.trim();

    // Remove ```json ... ``` or ``` ... ``` wrappers
    const jsonCodeBlockMatch = jsonText.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    if (jsonCodeBlockMatch) {
      jsonText = jsonCodeBlockMatch[1]!.trim();
    }

    try {
      const parsed = JSON.parse(jsonText);

      // Validate required fields
      if (!parsed.word || !parsed.translation || !parsed.wordType || !parsed.morphemes) {
        throw new Error('Missing required fields in translation response');
      }

      // Validate word types
      const validTypes = ['noun', 'verb', 'adjective', 'adverb', 'particle'];
      if (!validTypes.includes(parsed.wordType)) {
        throw new Error(`Invalid wordType: ${parsed.wordType}`);
      }

      // Validate morphemes
      if (!Array.isArray(parsed.morphemes)) {
        throw new Error('morphemes must be an array');
      }

      for (const morpheme of parsed.morphemes) {
        if (!morpheme.sound || !morpheme.meaning || !morpheme.type) {
          throw new Error('Morpheme missing required fields');
        }

        const validMorphemeTypes = ['root', 'prefix', 'suffix', 'infix'];
        if (!validMorphemeTypes.includes(morpheme.type)) {
          throw new Error(`Invalid morpheme type: ${morpheme.type}`);
        }
      }

      // Validate confidence
      if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
        parsed.confidence = 0.5;  // Default if invalid
      }

      // Update morpheme dictionary
      for (const morpheme of parsed.morphemes) {
        this.morphemeDictionary[morpheme.sound] = morpheme;
      }

      return parsed as TranslationResponse;
    } catch (error) {
      console.error('[TranslationService] Failed to parse LLM response:', error);
      console.error('[TranslationService] Raw response:', text);

      // Fallback response
      return {
        word: originalWord,
        translation: 'unknown-word',
        wordType: 'noun',
        morphemes: [
          {
            sound: originalWord,
            meaning: 'unknown',
            type: 'root',
          },
        ],
        confidence: 0.1,
      };
    }
  }

  /**
   * Get description of texture quality
   */
  private getTextureDescription(texture: string): string {
    const descriptions: Record<string, string> = {
      guttural: 'deep throat sounds like fire/stone/earth',
      liquid: 'flowing sounds like water/rivers/rain',
      percussive: 'sharp striking sounds like hammers/drums',
      sibilant: 'hissing sounds like wind/sand/snakes',
      nasal: 'resonant sounds through nose/chambers',
      breathy: 'airy sounds like whispers/sighs',
      clicking: 'sharp clicking sounds like insects/stones',
      buzzing: 'vibrating sounds like bees/wings',
      harmonic: 'layered tones like chords/music',
      echoic: 'reflecting sounds like sonar/caves',
      rumbling: 'deep vibrating sounds like earthquakes',
      chiming: 'ringing sounds like bells/crystals',
    };

    return descriptions[texture] || 'neutral sounds';
  }

  /**
   * Get description of hardness quality
   */
  private getHardnessDescription(hardness: string): string {
    const descriptions: Record<string, string> = {
      harsh: 'aggressive/violent concepts',
      soft: 'gentle/flowing concepts',
      crisp: 'sharp/precise concepts',
      smooth: 'even/polished concepts',
      rough: 'jagged/textured concepts',
      deep: 'profound/heavy concepts',
      resonant: 'echoing/sustained concepts',
    };

    return descriptions[hardness] || 'neutral concepts';
  }

  /**
   * Get description of manner quality
   */
  private getMannerDescription(manner: string): string {
    const descriptions: Record<string, string> = {
      flowing: 'continuous/gradual actions',
      clipped: 'sudden/brief actions',
      sharp: 'piercing/cutting actions',
      resonant: 'echoing/sustaining actions',
      rounded: 'smooth/curved concepts',
      rapid: 'quick/fast concepts',
      layered: 'complex/stacked concepts',
      sustained: 'long/maintained concepts',
    };

    return descriptions[manner] || 'neutral actions';
  }

  /**
   * Get planet environment context
   */
  private getPlanetContext(planetType: string): string {
    const contexts: Record<string, string> = {
      volcanic: 'Lava flows, ash clouds, obsidian fields, geysers, hot magma pools',
      ocean: 'Endless seas, deep trenches, coral reefs, tidal currents, bioluminescent creatures',
      desert: 'Sand dunes, scorching heat, oases, sandstorms, cacti, crystalline rock',
      forest: 'Dense canopy, ancient trees, moss, streams, wildlife, shadowy undergrowth',
      arctic: 'Ice sheets, frozen tundra, glaciers, auroras, blizzards, permafrost',
      mountain: 'High peaks, thin air, snow caps, valleys, cliffs, alpine meadows',
    };

    return contexts[planetType] || 'Varied terrain and climate';
  }

  /**
   * Get body plan biological context
   */
  private getBodyPlanContext(qualities: string[]): string {
    if (qualities.length === 0) {
      return 'Mammalian vocal cords, lips, tongue (humanoid baseline)';
    }

    const contextMap: Record<string, string> = {
      stridulant: 'Rubs body parts together for sound (like crickets)',
      buzzing: 'Vibrates wings or membranes (like bees)',
      chittering: 'Rapid mandible clicks (insect-like)',
      harmonic: 'Produces multiple simultaneous tones (like birds)',
      'dual-tone': 'Syrinx creates two independent frequencies',
      trilling: 'Rapid oscillating sounds',
      melodic: 'Musical, songbird-like vocalizations',
      whistling: 'High-frequency pure tones',
      echoic: 'Clicks that reflect for navigation (like dolphins)',
      subsonic: 'Infrasonic rumbles below human hearing',
      'pressure-based': 'Sound through water pressure changes',
      sonar: 'Echolocation for spatial awareness',
      rumbling: 'Deep resonance chambers (like elephants)',
      polyphonic: 'Multiple independent vocal sources',
      crystalline: 'Vibrates crystalline structures for sound',
      chiming: 'Resonant crystal formations',
    };

    return qualities.map(q => contextMap[q] || q).join(', ');
  }

  /**
   * Get morpheme dictionary
   */
  getMorphemeDictionary(): MorphemeDictionary {
    return { ...this.morphemeDictionary };
  }

  /**
   * Clear morpheme dictionary
   */
  clearMorphemeDictionary(): void {
    this.morphemeDictionary = {};
  }

  /**
   * Load morphemes into dictionary
   */
  loadMorphemes(morphemes: Morpheme[]): void {
    for (const morpheme of morphemes) {
      this.morphemeDictionary[morpheme.sound] = morpheme;
    }
  }
}
