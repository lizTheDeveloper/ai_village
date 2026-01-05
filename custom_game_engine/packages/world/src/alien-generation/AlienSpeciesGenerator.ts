/**
 * AlienSpeciesGenerator - LLM-powered procedural alien species creation
 *
 * Combines body plans, locomotion methods, sensory systems, and other traits
 * from the alien component libraries to create coherent, unique alien species.
 *
 * Features:
 * - LLM-based trait selection for biological coherence
 * - Automatic name generation (scientific + common names)
 * - Rich descriptions and behavioral patterns
 * - PixelLab sprite description generation
 * - Species caching and reuse
 *
 * Usage:
 * ```typescript
 * const generator = new AlienSpeciesGenerator(llmProvider);
 * const alien = await generator.generateAlienSpecies({
 *   dangerLevel: 'moderate',
 *   intelligence: 'proto_sapient',
 *   nativeWorld: 'Kepler-442b'
 * });
 * ```
 */

import type { LLMProvider } from '@ai-village/core';
import type { AlienCreatureSpecies } from './AlienCreatureComponents.js';
import {
  BODY_PLANS,
  LOCOMOTION_METHODS,
  SENSORY_SYSTEMS,
  DIET_PATTERNS,
  SOCIAL_STRUCTURES,
  DEFENSIVE_SYSTEMS,
  REPRODUCTION_STRATEGIES,
  INTELLIGENCE_LEVELS,
} from './creatures/index.js';

/**
 * Constraints for alien generation
 */
export interface AlienGenerationConstraints {
  /** Preferred danger level */
  dangerLevel?: 'harmless' | 'minor' | 'moderate' | 'severe' | 'extinction_level';

  /** Preferred intelligence level */
  intelligence?: 'instinctual_only' | 'basic_learning' | 'problem_solver' | 'proto_sapient' | 'fully_sapient' | 'hive_intelligence' | 'incomprehensible_mind';

  /** Homeworld/native realm */
  nativeWorld?: string;

  /** Environment type (affects trait selection) */
  environment?: 'terrestrial' | 'aquatic' | 'aerial' | 'subterranean' | 'void' | 'exotic';

  /** Domestication potential */
  domesticationPotential?: 'none' | 'poor' | 'moderate' | 'good' | 'excellent';

  /** Should be sapient (intelligent enough for souls) */
  requireSapient?: boolean;
}

/**
 * Generated alien species data
 */
export interface GeneratedAlienSpecies extends AlienCreatureSpecies {
  /** PixelLab sprite generation prompt */
  spritePrompt: string;

  /** Detailed biological notes */
  biologyNotes: string;

  /** Behavioral patterns */
  behaviorNotes: string;

  /** Cultural notes (if sapient) */
  culturalNotes?: string;
}

/**
 * Trait combination for LLM evaluation
 */
interface TraitCombination {
  bodyPlan: string;
  locomotion: string;
  sensorySystem: string;
  diet: string;
  socialStructure: string;
  defense: string;
  reproduction: string;
  intelligence: string;
}

/**
 * AlienSpeciesGenerator - Procedurally creates unique alien species
 */
export class AlienSpeciesGenerator {
  private llmProvider: LLMProvider;
  private generatedSpecies: Map<string, GeneratedAlienSpecies> = new Map();
  private usedScientificNames = new Set<string>();

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  /**
   * Generate a new alien species with LLM-guided trait selection
   */
  async generateAlienSpecies(
    constraints: AlienGenerationConstraints = {}
  ): Promise<GeneratedAlienSpecies> {
    // Step 1: Select compatible trait combination
    const traits = await this.selectCoherentTraits(constraints);

    // Step 2: Generate names and descriptions
    const naming = await this.generateNaming(traits, constraints);

    // Step 3: Create full species definition
    const species = this.assembleSpecies(traits, naming, constraints);

    // Step 4: Cache for reuse
    this.generatedSpecies.set(species.id, species);
    this.usedScientificNames.add(species.scientificName);

    return species;
  }

  /**
   * Filter diets based on ecological weights and realm availability
   * Excludes deprecated diets and weights selection by resource spawn rates
   */
  private filterEcologicalDiets(constraints: AlienGenerationConstraints): string[] {
    // Get realm from nativeWorld if specified
    const realm = this.extractRealmFromWorld(constraints.nativeWorld);

    const validDiets: Array<{id: string, weight: number}> = [];

    for (const [dietId, diet] of Object.entries(DIET_PATTERNS)) {
      // Skip deprecated diets
      if (diet.deprecated) {
        continue;
      }

      // Get base ecological weight
      let weight = diet.ecologicalWeight ?? 0.5;

      // Apply realm-specific weights if available
      if (realm && diet.realmWeights) {
        weight = diet.realmWeights[realm] ?? weight;
      }

      // Skip diets with zero weight
      if (weight <= 0) {
        continue;
      }

      validDiets.push({id: dietId, weight});
    }

    // Sort by weight (descending) and return top 60%
    // This ensures LLM sees mostly common diets but some rare ones too
    validDiets.sort((a, b) => b.weight - a.weight);
    const cutoffIndex = Math.ceil(validDiets.length * 0.6);
    return validDiets.slice(0, cutoffIndex).map(d => d.id);
  }

  /**
   * Extract realm type from world name
   */
  private extractRealmFromWorld(worldName?: string): string | undefined {
    if (!worldName) return undefined;

    const lowerWorld = worldName.toLowerCase();

    // Check for realm keywords in world name
    if (lowerWorld.includes('dream') || lowerWorld.includes('nightmare')) {
      return 'dream_realm';
    }
    if (lowerWorld.includes('celestial') || lowerWorld.includes('heaven') || lowerWorld.includes('paradise')) {
      return 'celestial';
    }
    if (lowerWorld.includes('underworld') || lowerWorld.includes('hell') || lowerWorld.includes('abyss')) {
      return 'underworld';
    }

    return undefined;
  }

  /**
   * Select biologically coherent traits using LLM
   */
  private async selectCoherentTraits(
    constraints: AlienGenerationConstraints
  ): Promise<TraitCombination> {
    const bodyPlanOptions = Object.keys(BODY_PLANS);
    const locomotionOptions = Object.keys(LOCOMOTION_METHODS);
    const sensoryOptions = Object.keys(SENSORY_SYSTEMS);
    const dietOptions = this.filterEcologicalDiets(constraints); // ECOLOGICAL FILTERING
    const socialOptions = Object.keys(SOCIAL_STRUCTURES);
    const defenseOptions = Object.keys(DEFENSIVE_SYSTEMS);
    const reproductionOptions = Object.keys(REPRODUCTION_STRATEGIES);
    const intelligenceOptions = Object.keys(INTELLIGENCE_LEVELS);

    // Filter intelligence based on constraints
    const validIntelligence = constraints.intelligence
      ? [constraints.intelligence]
      : constraints.requireSapient
      ? intelligenceOptions.filter(i =>
          i === 'proto_sapient' ||
          i === 'fully_sapient' ||
          i === 'hive_intelligence' ||
          i === 'incomprehensible_mind'
        )
      : intelligenceOptions;

    const prompt = `You are a xenobiologist designing a coherent alien species.

Environment: ${constraints.environment ?? 'varied'}
Homeworld: ${constraints.nativeWorld ?? 'unknown exoplanet'}
Intelligence Requirement: ${constraints.requireSapient ? 'Must be sapient' : 'Any intelligence level'}

Available Traits:
- Body Plans: ${bodyPlanOptions.slice(0, 10).join(', ')}... (${bodyPlanOptions.length} total)
- Locomotion: ${locomotionOptions.slice(0, 10).join(', ')}... (${locomotionOptions.length} total)
- Sensory Systems: ${sensoryOptions.join(', ')}
- Diets: ${dietOptions.join(', ')}
- Social Structures: ${socialOptions.join(', ')}
- Defense Systems: ${defenseOptions.join(', ')}
- Reproduction: ${reproductionOptions.join(', ')}
- Intelligence: ${validIntelligence.join(', ')}

Select ONE trait from each category that would work together biologically.
For example:
- A "crystalline_lattice" body would make sense with "vibration_detection" senses
- "jet_propulsion" locomotion requires a suitable body plan
- "hive_intelligence" pairs well with "eusocial_colony"

Return ONLY valid JSON in this exact format:
{
  "bodyPlan": "one_of_the_body_plan_options",
  "locomotion": "one_of_the_locomotion_options",
  "sensorySystem": "one_of_the_sensory_options",
  "diet": "one_of_the_diet_options",
  "socialStructure": "one_of_the_social_options",
  "defense": "one_of_the_defense_options",
  "reproduction": "one_of_the_reproduction_options",
  "intelligence": "one_of_the_intelligence_options",
  "reasoning": "Brief explanation of why these traits work together"
}`;

    try {
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.8,
        maxTokens: 400,
      });

      // Extract JSON
      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Validate all traits exist
        if (
          bodyPlanOptions.includes(parsed.bodyPlan) &&
          locomotionOptions.includes(parsed.locomotion) &&
          sensoryOptions.includes(parsed.sensorySystem) &&
          dietOptions.includes(parsed.diet) &&
          socialOptions.includes(parsed.socialStructure) &&
          defenseOptions.includes(parsed.defense) &&
          reproductionOptions.includes(parsed.reproduction) &&
          intelligenceOptions.includes(parsed.intelligence)
        ) {
          return {
            bodyPlan: parsed.bodyPlan,
            locomotion: parsed.locomotion,
            sensorySystem: parsed.sensorySystem,
            diet: parsed.diet,
            socialStructure: parsed.socialStructure,
            defense: parsed.defense,
            reproduction: parsed.reproduction,
            intelligence: parsed.intelligence,
          };
        }
      }
    } catch (error) {
      console.warn('[AlienSpeciesGenerator] LLM trait selection failed, using random:', error);
    }

    // Fallback: Random selection
    return {
      bodyPlan: this.randomChoice(bodyPlanOptions),
      locomotion: this.randomChoice(locomotionOptions),
      sensorySystem: this.randomChoice(sensoryOptions),
      diet: this.randomChoice(dietOptions),
      socialStructure: this.randomChoice(socialOptions),
      defense: this.randomChoice(defenseOptions),
      reproduction: this.randomChoice(reproductionOptions),
      intelligence: this.randomChoice(validIntelligence),
    };
  }

  /**
   * Generate a detailed sprite prompt for PixelLab
   */
  private generateDetailedSpritePrompt(
    traits: TraitCombination,
    constraints: AlienGenerationConstraints = {}
  ): string {
    const bodyPlan = BODY_PLANS[traits.bodyPlan];
    const locomotion = LOCOMOTION_METHODS[traits.locomotion];
    const sensory = SENSORY_SYSTEMS[traits.sensorySystem];
    const defense = DEFENSIVE_SYSTEMS[traits.defense];
    const diet = DIET_PATTERNS[traits.diet];

    const parts: string[] = [];
    const environmentalNotes: string[] = [];

    // Start with overall form from body plan
    if (bodyPlan) {
      const { symmetry, limbCount } = bodyPlan;

      // Describe body structure
      if (symmetry === 'bilateral') {
        parts.push('bilateral symmetry body');
      } else if (symmetry === 'radial') {
        parts.push('radial symmetry with limbs radiating from center');
      } else if (symmetry === 'four-way radial') {
        parts.push('four-way radial symmetry, X-shaped body');
      } else if (symmetry === 'fractal') {
        parts.push('fractal branching structure with intricate patterns');
      } else if (symmetry === 'perfect sphere') {
        parts.push('spherical core body');
      } else if (symmetry === 'geometric') {
        parts.push('crystalline geometric body structure');
      } else if (symmetry === 'asymmetric') {
        parts.push('asymmetric irregular body form');
      } else if (symmetry === 'none') {
        parts.push('amorphous blob-like form');
      } else if (symmetry === 'none - energy field') {
        parts.push('translucent energy being with glowing aura');
      }

      // Add limb details
      if (limbCount.includes('4-6')) {
        parts.push('4-6 limbs');
      } else if (limbCount.includes('5-12')) {
        parts.push('5-12 radiating appendages');
      } else if (limbCount.includes('tentacle')) {
        parts.push('numerous tentacles');
      } else if (limbCount.includes('Thousands')) {
        parts.push('swarm of tiny units');
      } else if (limbCount.includes('Zero')) {
        parts.push('no visible limbs');
      } else if (limbCount.includes('branch')) {
        parts.push('branching limbs at multiple scales');
      } else if (limbCount.includes('Varies')) {
        parts.push('modular segmented body with variable limbs');
      } else if (limbCount.includes('Geometrically perfect')) {
        parts.push('geometric crystal appendages');
      } else if (limbCount.includes('Pseudopods')) {
        parts.push('shapeshifting pseudopods');
      } else {
        parts.push(limbCount.toLowerCase());
      }
    }

    // Add locomotion-specific features
    if (locomotion) {
      if (traits.locomotion.includes('wing')) {
        parts.push('wings for flight');
      } else if (traits.locomotion.includes('tentacle')) {
        parts.push('tentacles for movement');
      } else if (traits.locomotion.includes('jet')) {
        parts.push('jet propulsion vents');
      } else if (traits.locomotion.includes('magnetic')) {
        parts.push('magnetic field generators');
      } else if (traits.locomotion.includes('slither')) {
        parts.push('serpentine undulating body');
      } else if (traits.locomotion.includes('burrow')) {
        parts.push('digging appendages and streamlined head');
      } else if (traits.locomotion.includes('climbing')) {
        parts.push('gripping appendages for climbing');
      } else if (traits.locomotion.includes('swimming')) {
        parts.push('fins or tail for aquatic movement');
      }
    }

    // Add sensory features
    if (sensory) {
      if (traits.sensorySystem.includes('visual')) {
        parts.push('prominent eyes');
      } else if (traits.sensorySystem.includes('echolocation')) {
        parts.push('large sound-emitting organs');
      } else if (traits.sensorySystem.includes('electromagnetic')) {
        parts.push('electromagnetic sensing organs');
      } else if (traits.sensorySystem.includes('infrared')) {
        parts.push('heat-sensing pits');
      } else if (traits.sensorySystem.includes('telepathic')) {
        parts.push('cranial sensory nodes');
      } else if (traits.sensorySystem.includes('vibration')) {
        parts.push('vibration-sensing antennae');
      } else if (traits.sensorySystem.includes('chemical')) {
        parts.push('chemical-sensing tendrils');
      }
    }

    // Add defensive features
    if (defense) {
      if (traits.defense.includes('armor')) {
        parts.push('heavy armored plating');
      } else if (traits.defense.includes('spiny')) {
        parts.push('defensive spikes covering body');
      } else if (traits.defense.includes('shell')) {
        parts.push('protective shell');
      } else if (traits.defense.includes('camouflage')) {
        parts.push('color-shifting skin patterns');
      } else if (traits.defense.includes('toxic')) {
        parts.push('visible poison glands');
      } else if (traits.defense.includes('crystalline')) {
        parts.push('crystalline armor shards');
      } else if (traits.defense.includes('phase')) {
        parts.push('semi-transparent phasing form');
      } else if (traits.defense.includes('size')) {
        parts.push('massive intimidating size');
      }
    }

    // Add diet-related features
    if (diet) {
      if (traits.diet.includes('herbivore')) {
        parts.push('grinding mouthparts');
      } else if (traits.diet.includes('carnivore') || traits.diet.includes('predator')) {
        parts.push('sharp fangs and claws');
      } else if (traits.diet.includes('photosynthetic')) {
        parts.push('leaf-like photosynthetic surfaces');
      } else if (traits.diet.includes('energy_absorption')) {
        parts.push('energy absorption organs');
      } else if (traits.diet.includes('mineral')) {
        parts.push('rock-crushing mandibles');
      } else if (traits.diet.includes('filter')) {
        parts.push('filter-feeding apparatus');
      }
    }

    // Add environmental adaptations
    if (constraints.environment) {
      switch (constraints.environment) {
        case 'aquatic':
          environmentalNotes.push('aquatic coloring (blues/greens)');
          environmentalNotes.push('streamlined for water');
          break;
        case 'aerial':
          environmentalNotes.push('lightweight appearance');
          environmentalNotes.push('aerial adaptations');
          break;
        case 'subterranean':
          environmentalNotes.push('pale/dark earth tones');
          environmentalNotes.push('robust build for tunneling');
          break;
        case 'void':
          environmentalNotes.push('sealed/armored appearance');
          environmentalNotes.push('space-adapted features');
          environmentalNotes.push('no breathing apparatus visible');
          break;
        case 'terrestrial':
          environmentalNotes.push('earthy natural colors');
          break;
        case 'exotic':
          environmentalNotes.push('unusual otherworldly coloration');
          break;
      }
    }

    // Add native world context if specified
    if (constraints.nativeWorld) {
      const world = constraints.nativeWorld.toLowerCase();
      if (world.includes('ice') || world.includes('frozen') || world.includes('cryo')) {
        environmentalNotes.push('icy blue-white coloration');
        environmentalNotes.push('thick insulating features');
      } else if (world.includes('desert') || world.includes('arid')) {
        environmentalNotes.push('sandy/tan coloration');
        environmentalNotes.push('heat-resistant features');
      } else if (world.includes('volcanic') || world.includes('lava')) {
        environmentalNotes.push('dark/reddish heat-resistant coloring');
        environmentalNotes.push('potentially glowing elements');
      } else if (world.includes('jungle') || world.includes('forest')) {
        environmentalNotes.push('green/brown camouflage colors');
      } else if (world.includes('ocean') || world.includes('aquatic')) {
        environmentalNotes.push('aquatic blue-green tones');
      }
    }

    // Add danger level appearance cues
    const dangerLevel = constraints.dangerLevel ?? this.calculateDangerLevel(traits);
    switch (dangerLevel) {
      case 'harmless':
        environmentalNotes.push('non-threatening appearance');
        environmentalNotes.push('gentle features');
        break;
      case 'minor':
        environmentalNotes.push('slightly dangerous looking');
        break;
      case 'moderate':
        environmentalNotes.push('visibly dangerous features');
        break;
      case 'severe':
        environmentalNotes.push('intimidating and powerful appearance');
        environmentalNotes.push('prominent predatory features');
        break;
      case 'extinction_level':
        environmentalNotes.push('absolutely terrifying appearance');
        environmentalNotes.push('massive size and overwhelming power evident');
        break;
    }

    // Add diet-based context (in addition to physical features)
    if (diet) {
      const dietType = diet.name.toLowerCase();
      if (dietType.includes('photosynthetic')) {
        environmentalNotes.push('plant-like green coloration');
      } else if (dietType.includes('scavenger')) {
        environmentalNotes.push('opportunistic, scrappy appearance');
      } else if (dietType.includes('parasite')) {
        environmentalNotes.push('adapted for attachment');
      } else if (dietType.includes('energy')) {
        environmentalNotes.push('ethereal or glowing elements');
      }
    }

    // Add domestication appearance hints
    const domestication = constraints.domesticationPotential ?? this.calculateDomesticationPotential(traits);
    if (domestication === 'excellent' || domestication === 'good') {
      environmentalNotes.push('approachable, less threatening features');
    }

    // Compile into coherent prompt
    const physicalDescription = parts.join(', ');
    const contextualDescription = environmentalNotes.length > 0
      ? `. Environmental context: ${environmentalNotes.join(', ')}`
      : '';

    return `Pixel art alien creature: ${physicalDescription}${contextualDescription}. Top-down view, 48px, medium detail, visible limbs and body structure clearly defined. Use distinct colors to show different body parts and environmental adaptation.`;
  }

  /**
   * Generate scientific and common names for the species
   */
  private async generateNaming(
    traits: TraitCombination,
    constraints: AlienGenerationConstraints
  ): Promise<{ scientificName: string; commonName: string; description: string; spritePrompt: string }> {
    const bodyPlan = BODY_PLANS[traits.bodyPlan];
    const locomotion = LOCOMOTION_METHODS[traits.locomotion];
    const sensory = SENSORY_SYSTEMS[traits.sensorySystem];

    // Generate detailed sprite prompt with environmental context
    const detailedSpritePrompt = this.generateDetailedSpritePrompt(traits, constraints);

    const prompt = `You are naming a newly discovered alien species.

Traits:
- Body Plan: ${bodyPlan?.name} - ${bodyPlan?.flavorText}
- Movement: ${locomotion?.name} - ${locomotion?.flavorText}
- Senses: ${sensory?.name} - ${sensory?.flavorText}
- Diet: ${traits.diet.replace(/_/g, ' ')}
- Social: ${traits.socialStructure.replace(/_/g, ' ')}
- Intelligence: ${traits.intelligence.replace(/_/g, ' ')}
- Homeworld: ${constraints.nativeWorld ?? 'unknown'}

Generate:
1. A scientific name (Genus species format, Latin-style)
2. A memorable common name (like "Crystal Spider" or "Void Swimmer")
3. A 2-3 sentence description of the creature

Return ONLY valid JSON:
{
  "scientificName": "Genus species",
  "commonName": "Descriptive Name",
  "description": "Full description..."
}`;

    try {
      const response = await this.llmProvider.generate({
        prompt,
        temperature: 0.9,
        maxTokens: 300,
      });

      const jsonMatch = response.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);

        // Ensure uniqueness of scientific name
        let scientificName = parsed.scientificName;
        let suffix = 1;
        while (this.usedScientificNames.has(scientificName)) {
          scientificName = `${parsed.scientificName} ${suffix}`;
          suffix++;
        }

        return {
          scientificName,
          commonName: parsed.commonName,
          description: parsed.description,
          spritePrompt: detailedSpritePrompt, // Use detailed prompt instead of LLM-generated
        };
      }
    } catch (error) {
      console.warn('[AlienSpeciesGenerator] LLM naming failed, using fallback:', error);
    }

    // Fallback naming
    const fallbackName = this.generateFallbackName(traits);
    return {
      scientificName: fallbackName.scientific,
      commonName: fallbackName.common,
      description: `An alien creature with ${traits.bodyPlan} body structure.`,
      spritePrompt: detailedSpritePrompt, // Use detailed prompt for fallback too
    };
  }

  /**
   * Assemble the complete species definition
   */
  private assembleSpecies(
    traits: TraitCombination,
    naming: { scientificName: string; commonName: string; description: string; spritePrompt: string },
    constraints: AlienGenerationConstraints
  ): GeneratedAlienSpecies {
    const bodyPlan = BODY_PLANS[traits.bodyPlan];
    const locomotion = LOCOMOTION_METHODS[traits.locomotion];
    const sensory = SENSORY_SYSTEMS[traits.sensorySystem];

    // Generate unique ID
    const id = `alien_${naming.scientificName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;

    // Determine danger level
    const dangerLevel = constraints.dangerLevel ?? this.calculateDangerLevel(traits);

    // Determine domestication potential
    const domesticationPotential = constraints.domesticationPotential ??
      this.calculateDomesticationPotential(traits);

    return {
      id,
      name: naming.commonName,
      scientificName: naming.scientificName,
      description: naming.description,
      bodyPlan: traits.bodyPlan,
      locomotion: traits.locomotion,
      sensorySystem: traits.sensorySystem,
      diet: traits.diet,
      socialStructure: traits.socialStructure,
      defense: traits.defense,
      reproduction: traits.reproduction,
      intelligence: traits.intelligence,
      discovered: new Date().toISOString(),
      nativeWorld: constraints.nativeWorld ?? 'Unknown Exoplanet',
      domesticationPotential,
      dangerLevel,
      spritePrompt: naming.spritePrompt,
      biologyNotes: this.generateBiologyNotes(traits, bodyPlan, locomotion, sensory),
      behaviorNotes: this.generateBehaviorNotes(traits),
      culturalNotes: this.isSapient(traits.intelligence)
        ? this.generateCulturalNotes(traits)
        : undefined,
    };
  }

  /**
   * Calculate danger level based on traits
   */
  private calculateDangerLevel(traits: TraitCombination): 'harmless' | 'minor' | 'moderate' | 'severe' | 'extinction_level' {
    let dangerScore = 0;

    // Diet contributes to danger
    if (traits.diet === 'carnivore_ambush') dangerScore += 2;
    if (traits.diet === 'parasitic_drainer') dangerScore += 3;
    if (traits.diet === 'concept_consumer') dangerScore += 4;

    // Defense systems
    if (traits.defense === 'poison_secretion') dangerScore += 2;
    if (traits.defense === 'sonic_scream') dangerScore += 1;
    if (traits.defense === 'quantum_dodge') dangerScore += 2;

    // Intelligence
    if (traits.intelligence === 'fully_sapient') dangerScore += 1;
    if (traits.intelligence === 'incomprehensible_mind') dangerScore += 3;

    if (dangerScore === 0) return 'harmless';
    if (dangerScore <= 2) return 'minor';
    if (dangerScore <= 4) return 'moderate';
    if (dangerScore <= 6) return 'severe';
    return 'extinction_level';
  }

  /**
   * Calculate domestication potential
   */
  private calculateDomesticationPotential(traits: TraitCombination): 'none' | 'poor' | 'moderate' | 'good' | 'excellent' {
    let domesticationScore = 0;

    // Social structure affects domestication
    if (traits.socialStructure === 'pack_hierarchy') domesticationScore += 2;
    if (traits.socialStructure === 'herd_safety') domesticationScore += 2;
    if (traits.socialStructure === 'solitary_territorial') domesticationScore -= 2;
    if (traits.socialStructure === 'collective_consciousness') domesticationScore -= 3;

    // Intelligence helps
    if (traits.intelligence === 'basic_learning') domesticationScore += 1;
    if (traits.intelligence === 'problem_solver') domesticationScore += 2;

    // Diet matters
    if (traits.diet === 'herbivore_grazer') domesticationScore += 1;
    if (traits.diet === 'carnivore_ambush') domesticationScore -= 2;

    if (domesticationScore >= 4) return 'excellent';
    if (domesticationScore >= 2) return 'good';
    if (domesticationScore >= 0) return 'moderate';
    if (domesticationScore >= -2) return 'poor';
    return 'none';
  }

  /**
   * Check if intelligence level is sapient
   */
  private isSapient(intelligence: string): boolean {
    return intelligence === 'proto_sapient' ||
           intelligence === 'fully_sapient' ||
           intelligence === 'hive_intelligence' ||
           intelligence === 'incomprehensible_mind';
  }

  /**
   * Generate biology notes
   */
  private generateBiologyNotes(
    traits: TraitCombination,
    bodyPlan: any,
    locomotion: any,
    sensory: any
  ): string {
    return `Body Structure: ${bodyPlan?.description ?? 'Unknown structure'}. ` +
           `Locomotion: ${locomotion?.description ?? 'Unknown movement'}. ` +
           `Sensory Capabilities: ${sensory?.description ?? 'Unknown senses'}. ` +
           `Reproduction: ${traits.reproduction.replace(/_/g, ' ')}.`;
  }

  /**
   * Generate behavior notes
   */
  private generateBehaviorNotes(traits: TraitCombination): string {
    return `Social Behavior: ${traits.socialStructure.replace(/_/g, ' ')}. ` +
           `Feeding Strategy: ${traits.diet.replace(/_/g, ' ')}. ` +
           `Defense Mechanism: ${traits.defense.replace(/_/g, ' ')}.`;
  }

  /**
   * Generate cultural notes for sapient species
   */
  private generateCulturalNotes(traits: TraitCombination): string {
    const intelligence = traits.intelligence.replace(/_/g, ' ');
    const social = traits.socialStructure.replace(/_/g, ' ');

    return `Intelligence Level: ${intelligence}. ` +
           `Likely to form ${social} based societies. ` +
           `Communication methods and cultural practices require further study.`;
  }

  /**
   * Generate fallback name when LLM fails
   */
  private generateFallbackName(traits: TraitCombination): { scientific: string; common: string } {
    const bodyShort = traits.bodyPlan.split('_')[0] || 'xeno';
    const locShort = traits.locomotion.split('_')[0] || 'morph';

    const genus = this.capitalize(bodyShort);
    const species = locShort.toLowerCase();

    let suffix = 1;
    let scientific = `${genus} ${species}`;
    while (this.usedScientificNames.has(scientific)) {
      scientific = `${genus} ${species}${suffix}`;
      suffix++;
    }

    const common = `${this.capitalize(traits.bodyPlan.replace(/_/g, ' '))} ${this.capitalize(traits.locomotion.split('_')[0]!)}`;

    return { scientific, common };
  }

  /**
   * Random choice from array
   */
  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]!;
  }

  /**
   * Capitalize first letter
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Get a previously generated species by ID
   */
  getSpecies(id: string): GeneratedAlienSpecies | undefined {
    return this.generatedSpecies.get(id);
  }

  /**
   * Get all generated species
   */
  getAllSpecies(): GeneratedAlienSpecies[] {
    return Array.from(this.generatedSpecies.values());
  }

  /**
   * Clear the species cache
   */
  clearCache(): void {
    this.generatedSpecies.clear();
    this.usedScientificNames.clear();
  }
}

/**
 * Create a singleton instance (optional - can also instantiate directly)
 */
export function createAlienSpeciesGenerator(llmProvider: LLMProvider): AlienSpeciesGenerator {
  return new AlienSpeciesGenerator(llmProvider);
}
