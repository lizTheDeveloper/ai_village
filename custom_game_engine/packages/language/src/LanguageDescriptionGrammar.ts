/**
 * Language Description Grammar
 *
 * Generates poetic descriptions of alien languages using Tracery based on
 * analyzed phoneme qualities. Creates descriptions like:
 * - "A harsh guttural language with sharp sounds"
 * - "Liquid and soft, like water over smooth stones"
 * - "Their speech is clicking and crisp, rapid like stones clicking together"
 *
 * @see PROCEDURAL_LANGUAGE_SYSTEM.md section 3 "Tracery Grammar Integration"
 */

import type { LanguageCharacter } from './PhonemeAnalyzer.js';
import type { BodyPlanPhonology } from './BodyPlanPhonology.js';

export interface TraceryGrammar {
  origin: string[];
  [key: string]: string[];
}

/**
 * Generates Tracery grammars to describe language character
 */
export class LanguageDescriptionGrammar {
  /**
   * Build Tracery grammar to describe the language's character
   */
  buildDescriptionGrammar(
    character: LanguageCharacter,
    planetType: string,
    bodyPhonology?: BodyPlanPhonology
  ): TraceryGrammar {
    // Build contextual adjectives based on planet type
    const contextAdjectives = this.getContextAdjectives(planetType);

    // Get metaphors based on texture + hardness + manner
    const metaphors = this.buildMetaphors(character, bodyPhonology);

    const grammar: TraceryGrammar = {
      origin: [
        'A #hardness# #texture# language with #manner# sounds',
        '#texture_capitalize# and #hardness#, like #metaphor#',
        'A #manner# tongue, #texture# and #hardness#',
        'Their speech is #texture# and #hardness#, #manner# like #metaphor#',
        '#context_adj# has shaped their #texture# #hardness# tongue',
      ],

      // Core qualities (from phoneme analysis)
      texture: [character.primaryTexture],
      hardness: [character.primaryHardness],
      manner: [character.primaryManner],

      // Capitalized texture for sentence starts
      texture_capitalize: [
        character.primaryTexture.charAt(0).toUpperCase() + character.primaryTexture.slice(1)
      ],

      // Context-specific adjectives
      context_adj: contextAdjectives,

      // Metaphors based on combinations
      metaphor: metaphors,
    };

    return grammar;
  }

  /**
   * Generate a description using Tracery
   *
   * Note: This returns the grammar structure. The actual Tracery library
   * will be used by the consumer to flatten it.
   */
  generateDescription(
    character: LanguageCharacter,
    planetType: string,
    bodyPhonology?: BodyPlanPhonology
  ): string {
    const grammar = this.buildDescriptionGrammar(character, planetType, bodyPhonology);

    // For now, return a simple template-based description
    // Real implementation will use tracery-grammar library
    const template = grammar.origin[0] || '';

    // Simple string replacement (will be replaced with actual Tracery)
    let result = template
      .replace(/#texture#/g, character.primaryTexture)
      .replace(/#hardness#/g, character.primaryHardness)
      .replace(/#manner#/g, character.primaryManner)
      .replace(/#texture_capitalize#/g,
        character.primaryTexture.charAt(0).toUpperCase() + character.primaryTexture.slice(1))
      .replace(/#context_adj#/g, this.getContextAdjectives(planetType)[0] || 'Their world')
      .replace(/#metaphor#/g, this.buildMetaphors(character, bodyPhonology)[0] || 'the sounds of their world');

    return result;
  }

  /**
   * Build metaphors based on language character
   */
  private buildMetaphors(character: LanguageCharacter, bodyPhonology?: BodyPlanPhonology): string[] {
    const metaphors: string[] = [];

    // Add body-plan-specific metaphors if available
    if (bodyPhonology?.phonemeBias.uniqueQualities) {
      for (const quality of bodyPhonology.phonemeBias.uniqueQualities) {
        if (quality === 'chittering') {
          metaphors.push('insect wings in summer heat', 'crickets in dry grass');
        } else if (quality === 'melodic' || quality === 'whistling') {
          metaphors.push('songbirds at dawn', 'wind through hollow reeds');
        } else if (quality === 'echoic' || quality === 'sonar') {
          metaphors.push('echoes in deep water', 'whale song across oceans');
        } else if (quality === 'rumbling') {
          metaphors.push('distant thunder', 'earthquakes beneath stone');
        } else if (quality === 'polyphonic') {
          metaphors.push('mountain echoes layered upon themselves', 'voices in harmony');
        } else if (quality === 'crystalline' || quality === 'chiming') {
          metaphors.push('crystal bells in frozen air', 'ice singing in the wind');
        }
      }
    }

    // Texture-based metaphors
    if (character.primaryTexture === 'guttural') {
      if (character.primaryHardness === 'harsh') {
        metaphors.push('stones grinding in a volcanic mill', 'thunder in deep valleys', 'fire crackling on obsidian');
      } else {
        metaphors.push('rumbling earth', 'distant avalanches');
      }
    }

    if (character.primaryTexture === 'liquid') {
      if (character.primaryManner === 'flowing') {
        metaphors.push('water over smooth stones', 'rivers finding their course', 'rain on leaves');
      } else {
        metaphors.push('droplets on glass', 'mist through branches');
      }
    }

    if (character.primaryTexture === 'percussive') {
      if (character.primaryManner === 'clipped') {
        metaphors.push('hammered metal', 'footfalls on stone', 'breaking ice');
      } else {
        metaphors.push('drumbeats', 'stones clicking together');
      }
    }

    if (character.primaryTexture === 'sibilant') {
      if (character.primaryManner === 'sharp') {
        metaphors.push('wind through narrow canyons', 'sand scouring rock', 'hissing steam');
      } else {
        metaphors.push('whispers in tall grass', 'waves on distant shores');
      }
    }

    if (character.primaryTexture === 'nasal') {
      metaphors.push('wind in hollow reeds', 'humming in deep caves', 'resonant chimes');
    }

    if (character.primaryTexture === 'breathy') {
      metaphors.push('sighs of wind', 'morning mist rising', 'breath on cold air');
    }

    if (character.primaryTexture === 'clicking') {
      metaphors.push('stones clicking together', 'beetles under bark', 'ice cracking');
    }

    if (character.primaryTexture === 'buzzing') {
      metaphors.push('bees in summer fields', 'cicadas at midday', 'vibrating wings');
    }

    if (character.primaryTexture === 'harmonic') {
      metaphors.push('layered voices in a canyon', 'multiple tones woven together', 'chord progressions');
    }

    if (character.primaryTexture === 'echoic') {
      metaphors.push('sounds reflecting off water', 'caves talking back', 'sonar pulses');
    }

    if (character.primaryTexture === 'chiming') {
      metaphors.push('crystal bells', 'ice formations ringing', 'glass harmonics');
    }

    // Fallback
    if (metaphors.length === 0) {
      metaphors.push('the sounds of their world');
    }

    return metaphors;
  }

  /**
   * Get context adjectives based on planet type
   */
  private getContextAdjectives(planetType: string): string[] {
    const contextMap: Record<string, string[]> = {
      volcanic: ['The volcanic wasteland', 'Fire and stone', 'Their harsh world'],
      ocean: ['The endless ocean', 'Water and tide', 'The depths'],
      forest: ['Dense forests', 'Ancient trees', 'Green shadow'],
      desert: ['The burning sands', 'Endless dunes', 'Scorching winds'],
      arctic: ['Frozen wastes', 'Ice and snow', 'The long dark'],
      mountain: ['High peaks', 'Stone and sky', 'Thin air'],
    };

    return contextMap[planetType] || ['Their world'];
  }
}
