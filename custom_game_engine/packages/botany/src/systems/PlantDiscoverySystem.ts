import type {
  SystemId,
  ComponentType as CT,
  World,
  Entity,
  PlantSpecies,
  MedicinalProperties,
  MagicalProperties,
  CraftingProperties,
  MemoryComponent,
  Memory,
  PositionComponent,
  EventBus,
} from '@ai-village/core';
import {
  BaseSystem,
  type SystemContext,
  ComponentType,
  EntityImpl,
  PlantKnowledgeComponent,
  type KnownMedicinalProperties,
  type KnownMagicalProperties,
  type KnownCraftingProperties,
} from '@ai-village/core';

/**
 * Result of consuming/using a plant
 */
export interface PlantUseResult {
  success: boolean;
  effects: PlantEffect[];
  discoveredProperties: string[];
  sideEffects: string[];
}

/**
 * An effect from using a plant
 */
export interface PlantEffect {
  type: 'healing' | 'energy' | 'mood' | 'magical' | 'negative' | 'neutral';
  property: string;
  magnitude: number;
  description: string;
}

/**
 * System that handles plant property discovery through experimentation
 *
 * When agents consume, apply, or otherwise use plants, this system:
 * - Determines what properties are revealed based on skill and chance
 * - Applies effects (positive or negative)
 * - Updates the agent's plant knowledge
 * - Creates memories of the experience
 *
 * @dependencies None - Event-driven system that responds to plant consumption/use
 */
export class PlantDiscoverySystem extends BaseSystem {
  public readonly id: SystemId = 'plant_discovery' as SystemId;
  public readonly priority: number = 45; // After consumption, before memory formation
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [ComponentType.Agent, ComponentType.Position];
  protected readonly throttleInterval = 100; // SLOW - 5 seconds
  public readonly dependsOn = [] as const;

  /** Species registry for looking up plant properties */
  private speciesRegistry: Map<string, PlantSpecies> = new Map();

  protected onInitialize(): void {
    // Event-driven system - no initialization needed
  }

  /**
   * Register plant species for lookup
   */
  public registerSpecies(species: PlantSpecies[]): void {
    for (const s of species) {
      this.speciesRegistry.set(s.id, s);
    }
  }

  /**
   * Get species by ID
   */
  private getSpecies(speciesId: string): PlantSpecies | undefined {
    return this.speciesRegistry.get(speciesId);
  }

  protected onUpdate(_ctx: SystemContext): void {
    // This system primarily responds to events rather than ticking
    // Discovery happens when agents perform specific actions (eat, apply, etc.)
  }

  /**
   * Called when an agent consumes a plant
   * Returns the result of consumption including any discovered properties
   */
  public consumePlant(
    agent: Entity,
    plantSpeciesId: string,
    gameTime: number
  ): PlantUseResult {
    const impl = agent as EntityImpl;
    const species = this.getSpecies(plantSpeciesId);

    if (!species) {
      throw new Error(`Unknown plant species: ${plantSpeciesId}`);
    }

    // Get or create knowledge component
    let knowledge = impl.getComponent<PlantKnowledgeComponent>('plant_knowledge');
    if (!knowledge) {
      knowledge = new PlantKnowledgeComponent();
      impl.addComponent(knowledge);
    }

    const effects: PlantEffect[] = [];
    const discoveredProperties: string[] = [];
    const sideEffects: string[] = [];
    const props = species.properties;

    // Calculate discovery chance based on herbalist skill
    const discoveryChance = this.calculateDiscoveryChance(knowledge.herbalistSkill);

    // Record that we encountered this plant
    knowledge.recordEncounter(plantSpeciesId);

    // Check edibility
    if (props.edible !== undefined) {
      const existing = knowledge.getKnowledge(plantSpeciesId);
      if (!existing || existing.knowsEdible === 'unknown') {
        // Agent discovers if it's edible by eating it
        knowledge.discoverProperty(
          plantSpeciesId,
          'edible',
          props.edible,
          'experimentation',
          gameTime
        );
        discoveredProperties.push(props.edible ? 'edible' : 'not_edible');
      }

      if (props.edible && props.nutritionValue) {
        effects.push({
          type: 'neutral',
          property: 'nutrition',
          magnitude: props.nutritionValue / 100,
          description: `Provides ${props.nutritionValue} nutrition`
        });
      }
    }

    // Check toxicity
    if (props.toxic) {
      const existing = knowledge.getKnowledge(plantSpeciesId);
      const toxicityLevel = props.toxicityLevel ?? 0.5;

      // Chance to discover toxicity when it affects you
      if (Math.random() < toxicityLevel) {
        if (!existing || existing.knowsToxic === 'unknown') {
          knowledge.discoverProperty(
            plantSpeciesId,
            'toxic',
            true,
            'experimentation',
            gameTime
          );
          discoveredProperties.push('toxic');
        }

        effects.push({
          type: 'negative',
          property: 'toxicity',
          magnitude: toxicityLevel,
          description: `Causes illness (toxicity: ${Math.round(toxicityLevel * 100)}%)`
        });
        sideEffects.push('nausea');
      }
    }

    // Check medicinal properties
    if (props.medicinal) {
      this.processMedicinalDiscovery(
        knowledge,
        plantSpeciesId,
        props.medicinal,
        discoveryChance,
        gameTime,
        effects,
        discoveredProperties,
        sideEffects
      );
    }

    // Check magical properties
    if (props.magical) {
      this.processMagicalDiscovery(
        knowledge,
        plantSpeciesId,
        props.magical,
        discoveryChance,
        gameTime,
        effects,
        discoveredProperties
      );
    }

    // Record successful use
    knowledge.recordSuccessfulUse(plantSpeciesId);

    // Create memory of this experience
    this.createDiscoveryMemory(impl, plantSpeciesId, species.name, effects, discoveredProperties, gameTime);

    return {
      success: true,
      effects,
      discoveredProperties,
      sideEffects
    };
  }

  /**
   * Process medicinal property discovery
   */
  private processMedicinalDiscovery(
    knowledge: PlantKnowledgeComponent,
    plantSpeciesId: string,
    medicinal: MedicinalProperties,
    discoveryChance: number,
    gameTime: number,
    effects: PlantEffect[],
    discoveredProperties: string[],
    sideEffects: string[]
  ): void {
    const existing = knowledge.getKnowledge(plantSpeciesId);
    const knownMedicinal = existing?.medicinal;

    // Chance to discover what ailments it treats
    if (medicinal.treats && medicinal.treats.length > 0 && Math.random() < discoveryChance * 0.7) {
      // Discover 1-2 ailments it treats
      const unknownAilments = knownMedicinal === 'unknown'
        ? medicinal.treats
        : medicinal.treats.filter((a: string) =>
            !knownMedicinal.knownTreats?.includes(a)
          );

      if (unknownAilments && unknownAilments.length > 0) {
        const toDiscover = unknownAilments.slice(0, Math.min(2, unknownAilments.length));
        knowledge.discoverProperty(
          plantSpeciesId,
          'medicinal',
          { knownTreats: toDiscover },
          'experimentation',
          gameTime
        );
        for (const ailment of toDiscover) {
          discoveredProperties.push(`treats_${ailment}`);
        }
      }
    }

    // Chance to discover preparation methods
    const preparation = medicinal.preparation;
    if (preparation && preparation.length > 0 && Math.random() < discoveryChance * 0.5) {
      const currentPrep = knownMedicinal !== 'unknown' && knownMedicinal.knownPreparations
        ? knownMedicinal.knownPreparations
        : [];
      const unknownPrep = preparation.filter((p: string) => !currentPrep.includes(p));

      if (unknownPrep.length > 0) {
        const toDiscover = unknownPrep[0];
        knowledge.discoverProperty(
          plantSpeciesId,
          'medicinal',
          { knownPreparations: [...currentPrep, toDiscover] },
          'experimentation',
          gameTime
        );
        discoveredProperties.push(`preparation_${toDiscover}`);
      }
    }

    // Apply healing effects
    const effectiveness = medicinal.effectiveness ?? 0.5;
    effects.push({
      type: 'healing',
      property: 'medicinal',
      magnitude: effectiveness,
      description: `Medicinal effect (${Math.round(effectiveness * 100)}% effective)`
    });

    // Check for side effects
    if (medicinal.sideEffects) {
      for (const effect of medicinal.sideEffects) {
        if (Math.random() < effect.chance) {
          sideEffects.push(effect.type);

          // Chance to discover side effects when they happen
          if (Math.random() < discoveryChance) {
            const currentEffects = knownMedicinal !== 'unknown' && knownMedicinal.knownSideEffects
              ? knownMedicinal.knownSideEffects
              : [];
            if (!currentEffects.includes(effect.type)) {
              knowledge.discoverProperty(
                plantSpeciesId,
                'medicinal',
                { knownSideEffects: [...currentEffects, effect.type] },
                'experimentation',
                gameTime
              );
              discoveredProperties.push(`side_effect_${effect.type}`);
            }
          }
        }
      }
    }

    // Check toxicity from overuse
    if (medicinal.toxicIfOverused) {
      const existing = knowledge.getKnowledge(plantSpeciesId);
      if (existing && existing.usageCount >= (medicinal.toxicityThreshold ?? 3)) {
        sideEffects.push('toxicity_from_overuse');
        effects.push({
          type: 'negative',
          property: 'overdose',
          magnitude: 0.5,
          description: 'Toxicity from overuse'
        });

        // Discover that overuse is toxic
        if (knownMedicinal !== 'unknown' && !knownMedicinal.knowsToxicity) {
          knowledge.discoverProperty(
            plantSpeciesId,
            'medicinal',
            { knowsToxicity: true },
            'experimentation',
            gameTime
          );
          discoveredProperties.push('toxic_if_overused');
        }
      }
    }
  }

  /**
   * Process magical property discovery
   */
  private processMagicalDiscovery(
    knowledge: PlantKnowledgeComponent,
    plantSpeciesId: string,
    magical: MagicalProperties,
    discoveryChance: number,
    gameTime: number,
    effects: PlantEffect[],
    discoveredProperties: string[]
  ): void {
    const existing = knowledge.getKnowledge(plantSpeciesId);
    const knownMagical = existing?.magical;

    // Magical properties are harder to discover
    const magicDiscoveryChance = discoveryChance * magical.stability * 0.5;

    // Chance to discover magic type
    if (Math.random() < magicDiscoveryChance) {
      if (knownMagical === 'unknown' || !knownMagical.knownMagicType) {
        knowledge.discoverProperty(
          plantSpeciesId,
          'magical',
          { knownMagicType: magical.magicType },
          'experimentation',
          gameTime
        );
        discoveredProperties.push(`magic_type_${magical.magicType}`);
      }
    }

    // Apply magical effects
    for (const effect of magical.effects) {
      if (effect.trigger === 'consume') {
        effects.push({
          type: 'magical',
          property: effect.type,
          magnitude: effect.magnitude * magical.potency,
          description: effect.description
        });

        // Chance to discover specific effects
        if (Math.random() < magicDiscoveryChance * 0.8) {
          const currentEffects = knownMagical !== 'unknown' && knownMagical.knownEffects
            ? knownMagical.knownEffects
            : [];
          if (!currentEffects.includes(effect.type)) {
            knowledge.discoverProperty(
              plantSpeciesId,
              'magical',
              { knownEffects: [...currentEffects, effect.type] },
              'experimentation',
              gameTime
            );
            discoveredProperties.push(`magical_effect_${effect.type}`);
          }
        }
      }
    }
  }

  /**
   * Called when an agent applies a plant (as poultice, salve, etc.)
   */
  public applyPlant(
    agent: Entity,
    plantSpeciesId: string,
    applicationMethod: string,
    gameTime: number
  ): PlantUseResult {
    const impl = agent as EntityImpl;
    const species = this.getSpecies(plantSpeciesId);

    if (!species) {
      throw new Error(`Unknown plant species: ${plantSpeciesId}`);
    }

    let knowledge = impl.getComponent<PlantKnowledgeComponent>('plant_knowledge');
    if (!knowledge) {
      knowledge = new PlantKnowledgeComponent();
      impl.addComponent(knowledge);
    }

    const effects: PlantEffect[] = [];
    const discoveredProperties: string[] = [];
    const sideEffects: string[] = [];
    const props = species.properties;
    const discoveryChance = this.calculateDiscoveryChance(knowledge.herbalistSkill);

    // Check if this plant has medicinal properties that work with this application
    const medicinalPrep = props.medicinal?.preparation;
    if (props.medicinal && medicinalPrep?.includes(applicationMethod)) {
      const appEffectiveness = props.medicinal.effectiveness ?? 0.5;
      effects.push({
        type: 'healing',
        property: 'medicinal_application',
        magnitude: appEffectiveness * 1.2, // Applications often more effective
        description: `Applied as ${applicationMethod}`
      });

      // Discover application method
      if (Math.random() < discoveryChance) {
        const existing = knowledge.getKnowledge(plantSpeciesId);
        const knownMedicinal = existing?.medicinal;
        const currentPrep = knownMedicinal !== 'unknown' && knownMedicinal.knownPreparations
          ? knownMedicinal.knownPreparations
          : [];
        if (!currentPrep.includes(applicationMethod)) {
          knowledge.discoverProperty(
            plantSpeciesId,
            'medicinal',
            { knownPreparations: [...currentPrep, applicationMethod] },
            'experimentation',
            gameTime
          );
          discoveredProperties.push(`preparation_${applicationMethod}`);
        }
      }
    }

    // Check crafting properties for things like dyes
    if (props.crafting) {
      this.processCraftingDiscovery(
        knowledge,
        plantSpeciesId,
        props.crafting,
        discoveryChance,
        gameTime,
        effects,
        discoveredProperties
      );
    }

    knowledge.recordSuccessfulUse(plantSpeciesId);
    this.createDiscoveryMemory(impl, plantSpeciesId, species.name, effects, discoveredProperties, gameTime);

    return {
      success: true,
      effects,
      discoveredProperties,
      sideEffects
    };
  }

  /**
   * Process crafting property discovery
   */
  private processCraftingDiscovery(
    knowledge: PlantKnowledgeComponent,
    plantSpeciesId: string,
    crafting: CraftingProperties,
    discoveryChance: number,
    gameTime: number,
    effects: PlantEffect[],
    discoveredProperties: string[]
  ): void {
    const existing = knowledge.getKnowledge(plantSpeciesId);
    const knownCrafting = existing?.crafting;

    // Discover dye properties
    if (crafting.dye && Math.random() < discoveryChance) {
      if (knownCrafting === 'unknown' || !knownCrafting.knownDyeColor) {
        knowledge.discoverProperty(
          plantSpeciesId,
          'crafting',
          { knownDyeColor: crafting.dye.color },
          'experimentation',
          gameTime
        );
        discoveredProperties.push(`dye_${crafting.dye.color}`);
        effects.push({
          type: 'neutral',
          property: 'dye',
          magnitude: crafting.dye.intensity,
          description: `Produces ${crafting.dye.color} dye`
        });
      }
    }

    // Discover fiber properties
    if (crafting.fiber && Math.random() < discoveryChance) {
      if (knownCrafting === 'unknown' || !knownCrafting.knowsFiber) {
        knowledge.discoverProperty(
          plantSpeciesId,
          'crafting',
          { knowsFiber: true },
          'experimentation',
          gameTime
        );
        discoveredProperties.push('fiber');
      }
    }

    // Discover scent properties
    if (crafting.scent?.profile && Math.random() < discoveryChance * 1.5) { // Scent is more easily noticed
      if (knownCrafting === 'unknown' || !knownCrafting.knownScent) {
        knowledge.discoverProperty(
          plantSpeciesId,
          'crafting',
          { knownScent: crafting.scent.profile },
          'experimentation',
          gameTime
        );
        const scentLabel = crafting.scent.profile.split(',')[0]?.trim() ?? 'unknown';
        discoveredProperties.push(`scent_${scentLabel}`);
      }
    }
  }

  /**
   * Calculate discovery chance based on herbalist skill
   */
  private calculateDiscoveryChance(herbalistSkill: number): number {
    // Base 20% chance, up to 80% at max skill
    return 0.2 + (herbalistSkill / 100) * 0.6;
  }

  /**
   * Create a memory of the plant discovery experience
   */
  private createDiscoveryMemory(
    impl: EntityImpl,
    plantSpeciesId: string,
    plantName: string,
    effects: PlantEffect[],
    discovered: string[],
    gameTime: number
  ): void {
    const memoryComp = impl.getComponent<MemoryComponent>('memory');
    if (!memoryComp) return;

    // Build description of the experience
    let description = `Used ${plantName}`;
    if (effects.length > 0) {
      const effectDescs = effects.map(e => e.description).slice(0, 3);
      description += `. Effects: ${effectDescs.join(', ')}`;
    }
    if (discovered.length > 0) {
      description += `. Discovered: ${discovered.join(', ')}`;
    }

    // Get agent's current position for the memory location
    const posComp = impl.getComponent<PositionComponent>('position');
    const location = posComp ? { x: posComp.x, y: posComp.y } : { x: 0, y: 0 };

    const memory: Omit<Memory, 'id'> = {
      type: 'knowledge', // Plant discovery is a form of learned knowledge
      content: description,
      timestamp: gameTime,
      importance: discovered.length > 0 ? 0.7 : 0.3,
      location,
      metadata: {
        plantId: plantSpeciesId,
        discoveredProperties: discovered,
        effectCount: effects.length
      }
    };

    memoryComp.addMemory(memory as Memory);
  }

  /**
   * Handle teaching between agents
   */
  public teachPlantKnowledge(
    teacher: Entity,
    student: Entity,
    plantSpeciesId: string,
    gameTime: number
  ): boolean {
    const teacherImpl = teacher as EntityImpl;
    const studentImpl = student as EntityImpl;

    const teacherKnowledge = teacherImpl.getComponent<PlantKnowledgeComponent>('plant_knowledge');
    if (!teacherKnowledge) return false;

    let studentKnowledge = studentImpl.getComponent<PlantKnowledgeComponent>('plant_knowledge');
    if (!studentKnowledge) {
      studentKnowledge = new PlantKnowledgeComponent();
      studentImpl.addComponent(studentKnowledge);
    }

    const teacherId = teacher.id;
    return studentKnowledge.learnFrom(teacherKnowledge, plantSpeciesId, gameTime, teacherId);
  }

  /**
   * Handle observation-based learning
   */
  public observePlantUse(
    observer: Entity,
    plantSpeciesId: string,
    observedEffects: PlantEffect[],
    gameTime: number
  ): string[] {
    const impl = observer as EntityImpl;
    let knowledge = impl.getComponent<PlantKnowledgeComponent>('plant_knowledge');

    if (!knowledge) {
      knowledge = new PlantKnowledgeComponent();
      impl.addComponent(knowledge);
    }

    const discoveredProperties: string[] = [];
    const discoveryChance = this.calculateDiscoveryChance(knowledge.herbalistSkill) * 0.5; // Harder to learn by watching

    for (const effect of observedEffects) {
      if (Math.random() < discoveryChance) {
        if (effect.type === 'healing' || effect.type === 'negative') {
          knowledge.discoverProperty(
            plantSpeciesId,
            'medicinal',
            { estimatedEffectiveness: effect.magnitude },
            'observation',
            gameTime
          );
          discoveredProperties.push(`observed_${effect.property}`);
        } else if (effect.type === 'magical') {
          knowledge.discoverProperty(
            plantSpeciesId,
            'magical',
            { knownEffects: [effect.property] },
            'observation',
            gameTime
          );
          discoveredProperties.push(`observed_${effect.property}`);
        }
      }
    }

    return discoveredProperties;
  }
}
