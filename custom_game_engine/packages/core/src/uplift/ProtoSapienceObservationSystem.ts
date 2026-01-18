/**
 * ProtoSapienceObservationSystem - Tracks proto-sapient behaviors during uplift
 *
 * For animals in active uplift programs (generations 3+), this system:
 * - Monitors tool use (discovery and teaching)
 * - Tracks communication patterns (proto-language development)
 * - Observes problem-solving abilities
 * - Conducts self-awareness tests (mirror test)
 * - Records cultural transmission (traditions, teaching)
 *
 * Creates/updates ProtoSapienceComponent as intelligence increases.
 *
 * NOT YET INTEGRATED - Standalone implementation for testing
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World, Entity } from '../ecs/index.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import {
  ProtoSapienceComponent,
  type ToolUseRecord,
  type CommunicationPattern
} from '../components/ProtoSapienceComponent.js';
import type { UpliftProgramComponent } from '../components/UpliftProgramComponent.js';

/**
 * Intelligence thresholds for behavior emergence
 */
const EMERGENCE_THRESHOLDS = {
  TOOL_USE: 0.45,              // Simple tool use begins
  TOOL_CREATION: 0.55,         // Tool creation/modification
  PROTO_LANGUAGE: 0.60,        // Consistent communication patterns
  MIRROR_TEST: 0.65,           // Self-recognition possible
  ABSTRACT_THINKING: 0.68,     // Abstract problem-solving
  SAPIENCE: 0.70,              // Full sapience threshold
};

/**
 * Test types for behavioral observation
 */
type ObservationTest =
  | 'tool_puzzle'              // Can entity use tool to solve puzzle?
  | 'delayed_gratification'    // Can entity wait for better reward?
  | 'mirror_test'              // Does entity recognize self?
  | 'teaching_observation'     // Does entity teach others?
  | 'communication_pattern'    // Consistent sound/gesture patterns?
  | 'problem_solving';         // Novel problem-solving?

export class ProtoSapienceObservationSystem extends BaseSystem {
  readonly id = 'ProtoSapienceObservationSystem';
  readonly priority = 562;
  readonly requiredComponents = [CT.Animal] as const;
  // Only run when uplift_program components exist (O(1) activation check)
  readonly activationComponents = ['uplift_program'] as const;

  protected readonly throttleInterval = 100; // Every 5 seconds

  // Track ongoing tests
  private activeTests: Map<string, ObservationTest> = new Map();

  // Communication pattern tracking
  private observedPatterns: Map<string, Map<string, number>> = new Map();

  protected onUpdate(ctx: SystemContext): void {
    // Get all active uplift programs
    const programs = this.getActivePrograms(ctx.world);

    for (const programEntity of programs) {
      const program = programEntity.getComponent(CT.UpliftProgram) as UpliftProgramComponent;

      // Get animals in this program's breeding population
      const animals = this.getProgramAnimals(ctx.world, program);

      for (const animal of animals) {
        this.observeAnimal(ctx, animal, program);
      }
    }
  }

  protected onCleanup(): void {
    this.activeTests.clear();
    this.observedPatterns.clear();
  }

  /**
   * Observe a single animal for proto-sapient behaviors
   */
  private observeAnimal(ctx: SystemContext, animal: Entity, program: UpliftProgramComponent): void {
    // Create or get ProtoSapienceComponent
    let proto: ProtoSapienceComponent;

    if (!animal.hasComponent(CT.ProtoSapience)) {
      // Create new component
      proto = new ProtoSapienceComponent({
        intelligence: program.currentIntelligence,
        generationBorn: program.currentGeneration,
        expectedGenerationToSapience: program.acceleratedGenerations,
      });
      (animal as EntityImpl).addComponent(proto);
    } else {
      proto = animal.getComponent(CT.ProtoSapience) as ProtoSapienceComponent;
      // Update intelligence from program
      proto.intelligence = program.currentIntelligence;
    }

    // Check for behavior emergence based on intelligence
    this.checkBehaviorEmergence(ctx, animal, proto, program);

    // Run behavioral tests periodically
    if (ctx.tick % 500 === 0) { // Every 25 seconds
      this.runBehavioralTests(ctx, animal, proto);
    }

    // Update communication patterns
    this.observeCommunication(ctx, animal, proto);

    // Check for cultural transmission
    this.observeCulturalTransmission(ctx, animal, proto, program);
  }

  /**
   * Check if new behaviors should emerge based on intelligence
   */
  private checkBehaviorEmergence(
    ctx: SystemContext,
    animal: Entity,
    proto: ProtoSapienceComponent,
    program: UpliftProgramComponent
  ): void {
    proto.intelligence = program.currentIntelligence;

    // Tool use emergence
    if (!proto.usesTools && proto.intelligence >= EMERGENCE_THRESHOLDS.TOOL_USE) {
      proto.usesTools = true;
      this.recordToolUse(ctx, animal, proto, 'stick', 'food_extraction');

      this.events.emit('proto_sapience_milestone', {
        entityId: animal.id,
        milestone: 'first_tool_use',
        generation: program.currentGeneration,
        intelligence: proto.intelligence,
      });
    }

    // Tool creation emergence
    if (!proto.createsTools && proto.intelligence >= EMERGENCE_THRESHOLDS.TOOL_CREATION) {
      proto.createsTools = true;

      this.events.emit('proto_sapience_milestone', {
        entityId: animal.id,
        milestone: 'first_tool_creation',
        generation: program.currentGeneration,
        intelligence: proto.intelligence,
      });
    }

    // Proto-language emergence
    if (!proto.hasProtocolanguage && proto.intelligence >= EMERGENCE_THRESHOLDS.PROTO_LANGUAGE) {
      proto.hasProtocolanguage = true;
      proto.vocabularySize = 5; // Start with 5 basic "words"

      this.events.emit('proto_sapience_milestone', {
        entityId: animal.id,
        milestone: 'proto_language_emergence',
        generation: program.currentGeneration,
        intelligence: proto.intelligence,
      });
    }

    // Abstract thinking emergence
    if (!proto.abstractThinking && proto.intelligence >= EMERGENCE_THRESHOLDS.ABSTRACT_THINKING) {
      proto.abstractThinking = true;

      this.events.emit('proto_sapience_milestone', {
        entityId: animal.id,
        milestone: 'abstract_thinking',
        generation: program.currentGeneration,
        intelligence: proto.intelligence,
      });
    }
  }

  /**
   * Run behavioral tests
   */
  private runBehavioralTests(ctx: SystemContext, animal: Entity, proto: ProtoSapienceComponent): void {
    // Mirror test (only if intelligence high enough)
    if (!proto.passedMirrorTest && proto.intelligence >= EMERGENCE_THRESHOLDS.MIRROR_TEST) {
      const passed = this.conductMirrorTest(animal, proto);
      if (passed) {
        proto.passedMirrorTest = true;
        proto.recognizesSelf = true;

        this.events.emit('proto_sapience_milestone', {
          entityId: animal.id,
          milestone: 'mirror_test_passed',
          intelligence: proto.intelligence,
        });
      }
    }

    // Delayed gratification test
    if (!proto.plansFuture && proto.intelligence >= 0.55) {
      const passed = this.conductDelayedGratificationTest(animal, proto);
      if (passed) {
        proto.plansFuture = true;
      }
    }

    // Problem-solving test
    const problemScore = this.conductProblemSolvingTest(animal, proto);
    proto.problemSolvingScore = problemScore;

    if (problemScore > 0.7) {
      proto.solvesPuzzles = true;
    }
  }

  /**
   * Mirror test - self-recognition
   */
  private conductMirrorTest(_animal: Entity, proto: ProtoSapienceComponent): boolean {
    // Track attempt
    proto.mirrorTestAttempts++;
    if (!proto.behavioralTests.includes('mirror_test')) {
      proto.behavioralTests.push('mirror_test');
    }

    // Probability of passing based on intelligence
    const baseChance = (proto.intelligence - EMERGENCE_THRESHOLDS.MIRROR_TEST) / 0.05;
    const passChance = Math.max(0, Math.min(1, baseChance));

    return Math.random() < passChance;
  }

  /**
   * Delayed gratification test - future planning
   */
  private conductDelayedGratificationTest(_animal: Entity, proto: ProtoSapienceComponent): boolean {
    // Track test
    if (!proto.behavioralTests.includes('delayed_gratification')) {
      proto.behavioralTests.push('delayed_gratification');
    }

    // Can entity wait for better reward?
    const baseChance = (proto.intelligence - 0.5) / 0.2;
    const passChance = Math.max(0, Math.min(1, baseChance));

    return Math.random() < passChance;
  }

  /**
   * Problem-solving test
   */
  private conductProblemSolvingTest(_animal: Entity, proto: ProtoSapienceComponent): number {
    // Score based on intelligence with random variation
    const baseScore = proto.intelligence;
    const variation = (Math.random() - 0.5) * 0.2; // +/- 0.1
    return Math.max(0, Math.min(1, baseScore + variation));
  }

  /**
   * Record tool use
   */
  private recordToolUse(
    ctx: SystemContext,
    _animal: Entity,
    proto: ProtoSapienceComponent,
    toolType: string,
    purpose: string
  ): void {
    const record: ToolUseRecord = {
      toolType,
      purpose,
      observedAt: ctx.tick,
      teachingOthers: false,
    };

    proto.toolRecords.push(record);
  }

  /**
   * Observe communication patterns
   */
  private observeCommunication(ctx: SystemContext, animal: Entity, proto: ProtoSapienceComponent): void {
    if (!proto.hasProtocolanguage) return;

    // Generate random communication event (placeholder for actual observation)
    if (Math.random() < 0.01) { // 1% chance per update
      const pattern = this.generateCommunicationPattern(animal.id);

      // Check if pattern already exists
      const existing = proto.communicationPatterns.find(p => p.pattern === pattern.pattern);

      if (existing) {
        // Increase consistency
        existing.consistency = Math.min(1.0, existing.consistency + 0.1);
      } else {
        proto.communicationPatterns.push(pattern);
      }

      // Increase vocabulary
      proto.vocabularySize = proto.communicationPatterns.length;

      // Update communication complexity
      proto.communicationComplexity = Math.min(
        1.0,
        proto.vocabularySize / 50 // Complexity based on vocabulary size
      );
    }
  }

  /**
   * Generate communication pattern
   */
  private generateCommunicationPattern(entityId: string): CommunicationPattern {
    const patterns = [
      { pattern: 'low-pitched howl', meaning: 'food nearby' },
      { pattern: 'high-pitched bark', meaning: 'danger' },
      { pattern: 'rhythmic yip', meaning: 'play invitation' },
      { pattern: 'sustained whine', meaning: 'need help' },
      { pattern: 'short bark series', meaning: 'come here' },
      { pattern: 'growl-bark combination', meaning: 'share food' },
    ];

    const chosen = patterns[Math.floor(Math.random() * patterns.length)]!;

    return {
      pattern: chosen.pattern,
      meaning: chosen.meaning,
      consistency: 0.3,
      sharedBy: [entityId],
    };
  }

  /**
   * Observe cultural transmission
   */
  private observeCulturalTransmission(
    ctx: SystemContext,
    animal: Entity,
    proto: ProtoSapienceComponent,
    program: UpliftProgramComponent
  ): void {
    if (proto.intelligence < 0.55) return;

    // Check if entity teaches young
    if (!proto.teachesYoung && Math.random() < 0.05) {
      proto.teachesYoung = true;
      proto.socialLearningEvents++;
    }

    // Check if entity learns by observation
    if (!proto.learnsByObservation && Math.random() < 0.05) {
      proto.learnsByObservation = true;
      proto.socialLearningEvents++;
    }

    // Check for cultural traditions
    if (proto.intelligence >= 0.65 && !proto.hasCulturalTraditions) {
      if (proto.socialLearningEvents > 10) {
        proto.hasCulturalTraditions = true;
        proto.traditions.push(this.generateCulturalTradition());

        this.events.emit('proto_sapience_milestone', {
          entityId: animal.id,
          milestone: 'cultural_tradition_emerged',
          tradition: proto.traditions[0],
          generation: program.currentGeneration,
          intelligence: proto.intelligence,
        });
      }
    }
  }

  /**
   * Generate cultural tradition
   */
  private generateCulturalTradition(): string {
    const traditions = [
      'Ritual food sharing before meals',
      'Elder teaching ceremony for new skills',
      'Greeting dance when pack members reunite',
      'Stone-stacking to mark territory',
      'Moon howling on clear nights',
      'Tool-blessing before first use',
    ];

    return traditions[Math.floor(Math.random() * traditions.length)]!;
  }

  /**
   * Get active uplift programs
   */
  private getActivePrograms(world: World): Entity[] {
    return world.query()
      .with(CT.UpliftProgram)
      .executeEntities()
      .filter(entity => {
        const program = entity.getComponent(CT.UpliftProgram) as UpliftProgramComponent;
        return program.stage !== 'completed';
      });
  }

  /**
   * Get animals in program's breeding population
   */
  private getProgramAnimals(world: World, program: UpliftProgramComponent): Entity[] {
    const entities: Entity[] = [];

    for (const entityId of program.breedingPopulation) {
      const entity = world.getEntity(entityId);
      if (entity && entity.hasComponent(CT.Animal)) {
        entities.push(entity);
      }
    }

    return entities;
  }

  /**
   * Get all proto-sapient entities
   */
  getProtoSapientEntities(world: World): readonly Entity[] {
    return world.query()
      .with(CT.ProtoSapience)
      .executeEntities();
  }

  /**
   * Get entities ready for sapience
   */
  getReadyForSapience(world: World): Entity[] {
    return this.getProtoSapientEntities(world).filter(entity => {
      const proto = entity.getComponent(CT.ProtoSapience) as ProtoSapienceComponent;
      return proto.isReadyForSapience();
    });
  }
}
