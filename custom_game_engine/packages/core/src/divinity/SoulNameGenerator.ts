/**
 * SoulNameGenerator - Generates unique, culturally-appropriate names for souls
 *
 * Soul names are persistent across reincarnations and reflect the culture/species
 * of the soul's origin, not its current incarnation body.
 *
 * Name Generation Progression:
 * 1. Human names (40 names) - English/nature names
 * 2. Elven names (40 names) - Flowing, nature-based
 * 3. Dwarven names (40 names) - Strong, stone-based
 * 4. Orcish names (40 names) - Harsh, powerful
 * 5. Thrakeen names (40 names) - Chittering, insectoid
 * 6. Exotic/Alien names (unlimited) - LLM-generated unique names
 *
 * Uses LLM with high presence penalty to ensure uniqueness.
 */

import type { LLMProvider } from '../types/LLMTypes.js';

export type SoulCulture =
  | 'human'
  | 'elven'
  | 'dwarven'
  | 'orcish'
  | 'thrakeen'
  | 'exotic';

export interface GeneratedSoulName {
  name: string;
  culture: SoulCulture;
  isReincarnated: boolean;
  generatedAt: number; // tick
}

/**
 * SoulNameGenerator - Manages unique soul name generation
 */
export class SoulNameGenerator {
  private llmProvider?: LLMProvider;
  private useLLM: boolean = true;
  private soulRepositorySystem?: any; // Reference to global soul repository

  // Track all used names globally (across all cultures)
  private usedNames = new Set<string>();

  // Track which names have been used per culture
  private usedNamesByCulture = new Map<SoulCulture, Set<string>>();

  // Current culture tier being generated
  private currentCulture: SoulCulture = 'human';

  // Predefined name pools (fallback if LLM fails)
  private namePools: Record<SoulCulture, string[]> = {
    human: [
      'Ada', 'Finn', 'Sage', 'River', 'Ash', 'Rowan', 'Luna', 'Oak',
      'Wren', 'Briar', 'Fern', 'Maple', 'Reed', 'Ivy', 'Hazel', 'Cedar',
      'Willow', 'Birch', 'Juniper', 'Pine', 'Lark', 'Dove', 'Sparrow', 'Robin',
      'Autumn', 'Brook', 'Clay', 'Dawn', 'Echo', 'Flint', 'Glen', 'Haven',
      'Indigo', 'Jasper', 'Kestrel', 'Linden', 'Meadow', 'North', 'Orion', 'Pebble',
    ],
    elven: [
      'Aelindra', 'Faelorn', 'Silvanis', 'Thalion', 'Aelar', 'Lirael',
      'Eldrin', 'Aerendyl', 'Galadrion', 'Thranduil', 'Celeborn', 'Elowen',
      'Miriel', 'Nimrodel', 'Finduilas', 'Arwen', 'Legolas', 'Haldir',
      'Gildor', 'Lindir', 'Orophin', 'Rumil', 'Saelethil', 'Vardamir',
      'Elladan', 'Elrohir', 'Glorfindel', 'Erestor', 'Aegnor', 'Angrod',
      'Aredhel', 'Caranthir', 'Curufin', 'Feanor', 'Fingolfin', 'Finrod',
      'Galadhon', 'Galathil', 'Idril', 'Maeglin',
    ],
    dwarven: [
      'Thorin', 'Dwalin', 'Balin', 'Kili', 'Fili', 'Dori', 'Nori', 'Ori',
      'Oin', 'Gloin', 'Bifur', 'Bofur', 'Bombur', 'Gimli', 'Thrain', 'Thror',
      'Durin', 'Dain', 'Gror', 'Nain', 'Fundin', 'Groin', 'Nar', 'Thrar',
      'Borin', 'Farin', 'Floi', 'Frerin', 'Grar', 'Kili', 'Loni', 'Nali',
      'Teli', 'Vili', 'Yngvi', 'Dvalinn', 'Alviss', 'Andvari', 'Hreidmar', 'Regin',
    ],
    orcish: [
      'Gorbag', 'Shagrat', 'Ugluk', 'Lugdush', 'Mauhur', 'Grishnakh', 'Snaga', 'Muzgash',
      'Azog', 'Bolg', 'Gothmog', 'Lagduf', 'Radbug', 'Ufthak', 'Gorbag', 'Shagrat',
      'Zagdush', 'Kruk', 'Grublik', 'Narzug', 'Ogduf', 'Pushkrig', 'Ragduk', 'Shakhbur',
      'Thrak', 'Ushnak', 'Varsh', 'Yaznog', 'Zorug', 'Ashnak', 'Burzog', 'Dushbag',
      'Ghashnak', 'Krakgor', 'Lugnak', 'Mogdug', 'Nazguk', 'Ogbur', 'Pushgol', 'Rakdug',
    ],
    thrakeen: [
      'Tchk\'rr', 'Kkt\'zss', 'Sszz\'krt', 'Tchkt\'rk', 'Kzz\'cht', 'Rkt\'szz',
      'Zzkt\'chr', 'Tkr\'kss', 'Chkt\'rzz', 'Kss\'tkt', 'Rzz\'kch', 'Tss\'rkk',
      'Kchk\'tzz', 'Szzt\'krr', 'Tzkr\'kss', 'Chss\'rkt', 'Ktzz\'ssk', 'Rkss\'tch',
      'Zskr\'ktt', 'Tchss\'krz', 'Kzss\'rkt', 'Sskr\'tzz', 'Trkz\'kss', 'Chkz\'tsr',
      'Kssz\'rkt', 'Rzkt\'szz', 'Tssk\'rzz', 'Zkch\'kss', 'Tkss\'rzk', 'Chrz\'kst',
      'Kzrt\'szz', 'Sszk\'tch', 'Tzrk\'kss', 'Chzz\'rks', 'Ksst\'rzk', 'Rzsz\'kkt',
      'Tzkk\'srs', 'Zchk\'tss', 'Tkzz\'rks', 'Chrk\'szz',
    ],
    exotic: [], // LLM-generated, no fallback pool
  };

  // Culture capacity limits (when to move to next tier)
  private cultureCapacity: Record<Exclude<SoulCulture, 'exotic'>, number> = {
    human: 40,
    elven: 40,
    dwarven: 40,
    orcish: 40,
    thrakeen: 40,
  };

  constructor() {
    // Initialize empty sets for each culture
    for (const culture of ['human', 'elven', 'dwarven', 'orcish', 'thrakeen', 'exotic'] as SoulCulture[]) {
      this.usedNamesByCulture.set(culture, new Set());
    }
  }

  /**
   * Set the LLM provider for name generation
   */
  setLLMProvider(provider: LLMProvider): void {
    this.llmProvider = provider;
  }

  /**
   * Set the soul repository system for global uniqueness checking
   */
  setSoulRepository(repository: any): void {
    this.soulRepositorySystem = repository;
  }

  /**
   * Enable or disable LLM usage
   */
  setUseLLM(enabled: boolean): void {
    this.useLLM = enabled;
  }

  /**
   * Generate a unique soul name for a new soul
   */
  async generateNewSoulName(currentTick: number): Promise<GeneratedSoulName> {
    // Check if current culture tier is exhausted
    if (this.currentCulture !== 'exotic') {
      const usedCount = this.usedNamesByCulture.get(this.currentCulture)?.size ?? 0;
      const capacity = this.cultureCapacity[this.currentCulture];

      if (usedCount >= capacity) {
        // Move to next tier
        this.currentCulture = this.getNextCulture(this.currentCulture);
      }
    }

    // Generate name for current culture
    const name = await this.generateNameForCulture(this.currentCulture);

    // Mark as used
    this.usedNames.add(name);
    this.usedNamesByCulture.get(this.currentCulture)?.add(name);

    return {
      name,
      culture: this.currentCulture,
      isReincarnated: false,
      generatedAt: currentTick,
    };
  }

  /**
   * Get the next culture in the progression
   */
  private getNextCulture(current: SoulCulture): SoulCulture {
    const progression: SoulCulture[] = ['human', 'elven', 'dwarven', 'orcish', 'thrakeen', 'exotic'];
    const currentIndex = progression.indexOf(current);
    if (currentIndex === -1 || currentIndex >= progression.length - 1) {
      return 'exotic';
    }
    return progression[currentIndex + 1]!;
  }

  /**
   * Generate a name for a specific culture
   */
  private async generateNameForCulture(culture: SoulCulture): Promise<string> {
    // For non-exotic cultures, try fallback pool first
    if (culture !== 'exotic') {
      const pool = this.namePools[culture];
      const usedInCulture = this.usedNamesByCulture.get(culture) ?? new Set();
      const availableNames = pool.filter(name => !usedInCulture.has(name));

      // If we have available fallback names, use them
      if (availableNames.length > 0) {
        const name = availableNames[Math.floor(Math.random() * availableNames.length)]!;
        return name;
      }
    }

    // No fallback names available or exotic culture - use LLM
    if (this.useLLM && this.llmProvider) {
      try {
        const name = await this.generateLLMName(culture);
        return name;
      } catch (error) {
        console.warn(`[SoulNameGenerator] LLM generation failed for ${culture}, using fallback:`, error);
      }
    }

    // Final fallback: generate a placeholder
    return this.generateFallbackName(culture);
  }

  /**
   * Generate a name using LLM
   */
  private async generateLLMName(culture: SoulCulture, retryAttempt: number = 0): Promise<string> {
    if (!this.llmProvider) {
      throw new Error('LLM provider not set');
    }

    // Get all existing names from repository (if available)
    const allExistingNames = this.soulRepositorySystem
      ? this.soulRepositorySystem.getAllSouls().map((soul: any) => soul.name)
      : Array.from(this.usedNames);

    // Get recently used names for context
    const usedInCulture = Array.from(this.usedNamesByCulture.get(culture) ?? []);
    const recentNames = usedInCulture.slice(-20); // Last 20 names

    const culturalDescriptions: Record<SoulCulture, string> = {
      human: 'English or nature-inspired names (e.g., River, Sage, Ash, Oak)',
      elven: 'Flowing, elegant elven names with soft sounds (e.g., Aelindra, Silvanis, Thalion)',
      dwarven: 'Strong, stone-like dwarven names (e.g., Thorin, Dwalin, Gimli)',
      orcish: 'Harsh, guttural orcish names (e.g., Gorbag, Ugluk, Shagrat)',
      thrakeen: 'Chittering insectoid names with clicks and hisses (e.g., Tchk\'rr, Kkt\'zss, Sszz\'krt)',
      exotic: 'Completely unique and alien names that don\'t fit any known culture',
    };

    let prompt = `Generate exactly ONE unique soul name for a ${culture} soul.

Cultural style: ${culturalDescriptions[culture]}

IMPORTANT RULES:
1. Return ONLY the name, nothing else
2. No quotes, no explanation, no punctuation
3. Must be unique and NOT similar to these recently used names: ${recentNames.join(', ')}
4. Single word/name only (no titles, no descriptions)

Name:`;

    const response = await this.llmProvider.generate({
      prompt,
      temperature: 0.9, // High creativity
      maxTokens: 20,
    });

    // Extract name (should be just the name, but clean it)
    let name = response.text.trim();

    // Remove quotes if present
    name = name.replace(/^["']|["']$/g, '');

    // Remove any extra text after the name
    name = name.split('\n')[0]?.split(' ')[0] ?? name;

    // Check uniqueness against global repository
    const isNameTaken = this.soulRepositorySystem
      ? this.soulRepositorySystem.soulNameExists(name)
      : this.usedNames.has(name);

    if (isNameTaken && retryAttempt < 3) {
      // Name is taken - re-prompt with context about existing names
      const firstLetter = name.charAt(0).toUpperCase();
      const namesWithSameLetter = allExistingNames.filter((n: string) =>
        n.charAt(0).toUpperCase() === firstLetter
      );

      const retryPrompt = `The name "${name}" is already taken.

Here are all existing ${culture} names starting with "${firstLetter}":
${namesWithSameLetter.slice(0, 20).join(', ')}

Please choose a NEW ${culture} name starting with "${firstLetter}" that is NOT in the list above.
Cultural style: ${culturalDescriptions[culture]}

Return ONLY the new name, nothing else.

New name:`;

      const retryResponse = await this.llmProvider.generate({
        prompt: retryPrompt,
        temperature: 0.9,
        maxTokens: 20,
      });

      let newName = retryResponse.text.trim().replace(/^["']|["']$/g, '');
      newName = newName.split('\n')[0]?.split(' ')[0] ?? newName;

      // Recursive check with retry limit
      return this.generateLLMName(culture, retryAttempt + 1);
    } else if (isNameTaken) {
      // Max retries reached - add a number suffix as fallback
      console.warn(`[SoulNameGenerator] Max retries reached for "${name}", using numbered suffix`);
      let suffix = 2;
      while (this.soulRepositorySystem?.soulNameExists(`${name}${suffix}`) || this.usedNames.has(`${name}${suffix}`)) {
        suffix++;
      }
      name = `${name}${suffix}`;
    }

    return name;
  }

  /**
   * Generate a fallback name when LLM fails
   */
  private generateFallbackName(culture: SoulCulture): string {
    const usedCount = this.usedNamesByCulture.get(culture)?.size ?? 0;
    return `${this.getCulturePrefix(culture)}-Soul-${usedCount + 1}`;
  }

  /**
   * Get a prefix for fallback names
   */
  private getCulturePrefix(culture: SoulCulture): string {
    const prefixes: Record<SoulCulture, string> = {
      human: 'Hum',
      elven: 'Elf',
      dwarven: 'Dwf',
      orcish: 'Orc',
      thrakeen: 'Thr',
      exotic: 'Xen',
    };
    return prefixes[culture];
  }

  /**
   * Check if a name is already used
   */
  isNameUsed(name: string): boolean {
    return this.usedNames.has(name);
  }

  /**
   * Get count of used names for a culture
   */
  getUsedCountForCulture(culture: SoulCulture): number {
    return this.usedNamesByCulture.get(culture)?.size ?? 0;
  }

  /**
   * Get current culture tier
   */
  getCurrentCulture(): SoulCulture {
    return this.currentCulture;
  }

  /**
   * Get all used names (for debugging)
   */
  getAllUsedNames(): string[] {
    return Array.from(this.usedNames);
  }

  /**
   * Reset the name generator (for testing or new sessions)
   */
  reset(): void {
    this.usedNames.clear();
    this.usedNamesByCulture.clear();
    this.currentCulture = 'human';

    for (const culture of ['human', 'elven', 'dwarven', 'orcish', 'thrakeen', 'exotic'] as SoulCulture[]) {
      this.usedNamesByCulture.set(culture, new Set());
    }
  }
}

/**
 * Global singleton instance
 */
export const soulNameGenerator = new SoulNameGenerator();
