/**
 * ConsciousnessEmergenceSystem - Handles the awakening of sapience
 *
 * When an uplifted animal reaches sapience threshold, this system:
 * - Detects readiness for consciousness emergence
 * - Generates awakening moment (LLM)
 * - Transforms Animal → Agent
 * - Creates initial memories and identity
 * - Emits awakening events
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World, Entity } from '../ecs/index.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { ProtoSapienceComponent } from '../components/ProtoSapienceComponent.js';
import type { UpliftProgramComponent } from '../components/UpliftProgramComponent.js';
import type { AwakeningMoment, UpliftAttitude } from '../components/UpliftedTraitComponent.js';
import { UpliftedTraitComponent } from '../components/UpliftedTraitComponent.js';
import type { AnimalComponent } from '../components/AnimalComponent.js';
import type { SpeciesComponent } from '../components/SpeciesComponent.js';
import { createAgentComponent } from '../components/AgentComponent.js';
import { createIdentityComponent } from '../components/IdentityComponent.js';
import { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import { SemanticMemoryComponent } from '../components/SemanticMemoryComponent.js';
import { BeliefComponent } from '../components/BeliefComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';

export class ConsciousnessEmergenceSystem extends BaseSystem {
  readonly id = 'ConsciousnessEmergenceSystem';
  readonly priority = 565;
  readonly requiredComponents = [CT.ProtoSapience, CT.Animal] as const;

  protected readonly throttleInterval = 100; // Every 5 seconds, check for readiness

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      // Skip if already awakened
      if (entity.hasComponent(CT.UpliftedTrait)) continue;

      const proto = entity.getComponent(CT.ProtoSapience) as ProtoSapienceComponent;

      // Check if ready for sapience
      if (proto.isReadyForSapience()) {
        this.triggerAwakening(ctx, entity, proto);
      }
    }
  }

  /**
   * Trigger sapience awakening
   */
  private triggerAwakening(
    ctx: SystemContext,
    entity: Entity,
    proto: ProtoSapienceComponent
  ): void {
    const animal = entity.getComponent(CT.Animal) as AnimalComponent;
    const species = entity.getComponent(CT.Species) as SpeciesComponent;

    // Find associated uplift program
    const program = this.findUpliftProgram(ctx.world, species.speciesId);

    if (!program) {
      console.error(`No uplift program found for species ${species.speciesId}`);
      return;
    }

    // Generate awakening moment
    const awakening = this.generateAwakeningMoment(ctx, entity, animal, proto, program);

    // Create UpliftedTraitComponent
    const upliftedTrait = new UpliftedTraitComponent({
      programId: program.programId,
      sourceSpeciesId: program.sourceSpeciesId,
      upliftedSpeciesId: program.targetSpeciesId,
      generation: proto.generationBorn,
      sapientSince: ctx.tick,
      awakeningMoment: awakening,
      naturalBorn: proto.generationBorn > program.acceleratedGenerations,
      givenName: animal.name || this.generateUpliftedName(animal, species),
      understandsOrigin: true,
      attitude: this.determineAttitude(proto, program),
      retainedInstincts: this.identifyRetainedInstincts(animal, species),
      enhancedAbilities: this.identifyEnhancedAbilities(proto),
      legalStatus: 'undefined',
      culturalIdentity: 'new',
      leadScientistId: program.leadScientistId,
    });

    (entity as EntityImpl).addComponent(upliftedTrait);

    // Transform Animal → Agent
    this.transformToAgent(ctx, entity, awakening, upliftedTrait);

    // Update program
    program.stage = 'awakening';
    program.notableEvents.push(
      `AWAKENING: ${awakening.firstWord} - First sapient ${species.speciesName} born (Gen ${proto.generationBorn})`
    );

    // Emit awakening event
    this.events.emit('consciousness_awakened', {
      entityId: entity.id,
      entityName: upliftedTrait.getDisplayName(),
      programId: program.programId,
      sourceSpecies: program.sourceSpeciesId,
      generation: proto.generationBorn,
      awakening,
    });
  }

  /**
   * Generate awakening moment
   */
  private generateAwakeningMoment(
    ctx: SystemContext,
    entity: Entity,
    _animal: AnimalComponent,
    proto: ProtoSapienceComponent,
    _program: UpliftProgramComponent
  ): AwakeningMoment {
    // Find nearby witnesses
    const position = entity.getComponent(CT.Position) as PositionComponent | undefined;
    const witnesses: string[] = [];

    if (position) {
      const nearby = ctx.world.query()
        .with(CT.Position)
        .with(CT.Agent)
        .executeEntities()
        .filter(e => {
          const otherPos = e.getComponent(CT.Position) as PositionComponent | undefined;
          if (!otherPos) return false;
          const dx = otherPos.x - position.x;
          const dy = otherPos.y - position.y;
          return dx * dx + dy * dy < 10 * 10; // Within 10 tiles
        });

      witnesses.push(...nearby.map(e => e.id));
    }

    // Generate awakening
    const awakening: AwakeningMoment = {
      tick: ctx.tick,
      generation: proto.generationBorn,
      firstThought: this.generateFirstThought(proto),
      firstQuestion: 'What am I?',
      firstEmotion: this.determineFirstEmotion(proto),
      firstWord: 'I',
      witnessIds: witnesses,
    };

    return awakening;
  }

  /**
   * Generate first thought (placeholder - would use LLM)
   */
  private generateFirstThought(_proto: ProtoSapienceComponent): string {
    const thoughts = [
      'I... I am. I think, therefore...',
      'These thoughts... they are mine. I am... myself.',
      'What is this? I see. I know. I *understand*.',
      'Before: darkness. Now: light. I... exist.',
      'The others... they do not think like this. I am... different.',
    ];

    return thoughts[Math.floor(Math.random() * thoughts.length)]!;
  }

  /**
   * Determine first emotion
   */
  private determineFirstEmotion(proto: ProtoSapienceComponent): string {
    // Based on intelligence and social context
    if (proto.intelligence > 0.8) {
      return Math.random() < 0.5 ? 'wonder' : 'clarity';
    } else if (proto.socialLearningEvents > 10) {
      return 'curiosity';
    } else {
      return Math.random() < 0.5 ? 'confusion' : 'fear';
    }
  }

  /**
   * Determine attitude toward uplifters
   */
  private determineAttitude(_proto: ProtoSapienceComponent, program: UpliftProgramComponent): UpliftAttitude {
    // Factors:
    // - How long the program took (longer = more suffering)
    // - Quality of life during uplift
    // - Social bonds formed

    const generationRatio = program.currentGeneration / program.baseGenerations;

    if (generationRatio < 0.5) {
      // Fast uplift = less suffering = more grateful
      return Math.random() < 0.7 ? 'grateful' : 'neutral';
    } else if (generationRatio < 0.8) {
      return Math.random() < 0.5 ? 'neutral' : 'conflicted';
    } else {
      // Long uplift = more suffering = possible resentment
      return Math.random() < 0.4 ? 'resentful' : 'conflicted';
    }
  }

  /**
   * Identify retained instincts
   */
  private identifyRetainedInstincts(_animal: AnimalComponent, species: SpeciesComponent): string[] {
    const instincts: string[] = [];

    // Pack animals retain pack instincts
    if (species.socialStructure?.includes('pack')) {
      instincts.push('pack_loyalty', 'hierarchical_thinking');
    }

    // TODO: Add diet property to AnimalComponent or retrieve from SpeciesComponent
    // For now, commented out diet-based instincts
    // Predators retain hunting instincts
    // if (animal.diet === 'carnivore') {
    //   instincts.push('predatory_focus', 'territorial_behavior');
    // }

    // Prey animals retain fear responses
    // if (animal.diet === 'herbivore') {
    //   instincts.push('heightened_vigilance', 'flight_response');
    // }

    return instincts;
  }

  /**
   * Identify enhanced abilities
   */
  private identifyEnhancedAbilities(proto: ProtoSapienceComponent): string[] {
    const abilities: string[] = [];

    abilities.push('abstract_reasoning', 'self_awareness');

    if (proto.hasProtocolanguage) {
      abilities.push('language_use', 'symbolic_thought');
    }

    if (proto.createsTools) {
      abilities.push('tool_creation', 'problem_solving');
    }

    if (proto.understandsOthersHaveMinds) {
      abilities.push('theory_of_mind', 'empathy');
    }

    if (proto.passedMirrorTest) {
      abilities.push('self_recognition', 'identity_formation');
    }

    return abilities;
  }

  /**
   * Transform entity from Animal to Agent
   */
  private transformToAgent(
    ctx: SystemContext,
    entity: Entity,
    awakening: AwakeningMoment,
    upliftedTrait: UpliftedTraitComponent
  ): void {
    const entityImpl = entity as EntityImpl;

    // Add AgentComponent
    const agent = createAgentComponent();
    entityImpl.addComponent(agent);

    // Add IdentityComponent
    const identity = createIdentityComponent(upliftedTrait.getDisplayName());
    entityImpl.addComponent(identity);

    // Add EpisodicMemoryComponent with awakening as first memory
    const episodic = new EpisodicMemoryComponent();
    episodic.formMemory({
      eventType: 'awakening',
      summary: `The moment of awakening. ${awakening.firstThought}`,
      timestamp: ctx.tick,
      location: { x: 0, y: 0 }, // Would get from position
      participants: awakening.witnessIds,
      emotionalValence: awakening.firstEmotion === 'wonder' ? 0.5 : awakening.firstEmotion === 'fear' ? -0.5 : 0,
      emotionalIntensity: 1.0,
      importance: 1.0, // Maximum importance for awakening
      surprise: 1.0,
      clarity: 1.0,
      consolidated: false,
      markedForConsolidation: true,
      timesRecalled: 0,
    });
    entityImpl.addComponent(episodic);

    // Add SemanticMemoryComponent with basic knowledge
    const semantic = new SemanticMemoryComponent();
    semantic.formKnowledge({
      type: 'factual',
      content: `I was uplifted from ${upliftedTrait.sourceSpeciesId} to sapience`,
      confidence: 1.0,
      sourceMemories: [], // No prior memories at awakening
    });
    entityImpl.addComponent(semantic);

    // Add BeliefComponent with initial belief evidence
    const belief = new BeliefComponent();
    // Record evidence that will form the "I am sapient" belief
    belief.recordEvidence('world', 'self_sapience', 'experience', ctx.tick);
    belief.recordEvidence('world', 'self_sapience', 'experience', ctx.tick);
    belief.recordEvidence('world', 'self_sapience', 'experience', ctx.tick);
    entityImpl.addComponent(belief);

    // Mark species as sapient
    if (entity.hasComponent(CT.Species)) {
      const species = entity.getComponent(CT.Species) as SpeciesComponent;
      species.sapient = true;
    }
  }

  /**
   * Generate uplifted name
   */
  private generateUpliftedName(_animal: AnimalComponent, species: SpeciesComponent): string {
    const prefixes = ['Neo', 'First', 'Nova', 'Prime', 'Lux'];
    const sourceBase = species.speciesName.slice(0, 4);

    return `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${sourceBase}`;
  }

  /**
   * Find uplift program for species
   */
  private findUpliftProgram(world: World, speciesId: string): UpliftProgramComponent | null {
    const programs = world.query()
      .with(CT.UpliftProgram)
      .executeEntities();

    for (const programEntity of programs) {
      const program = programEntity.getComponent(CT.UpliftProgram) as UpliftProgramComponent;
      if (program.sourceSpeciesId === speciesId) {
        return program;
      }
    }

    return null;
  }
}
