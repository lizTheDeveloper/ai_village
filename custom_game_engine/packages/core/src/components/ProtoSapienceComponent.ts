/**
 * ProtoSapienceComponent - Tracks proto-sapient behaviors emerging during uplift
 *
 * Animals in late-stage uplift (generations N-3 to N-1) show proto-sapient
 * behaviors before full sapience emerges. This component tracks those.
 */

import { ComponentBase } from '../ecs/Component.js';

export interface ToolUseRecord {
  toolType: string;              // 'stick', 'rock', 'leaf', 'custom'
  purpose: string;               // 'food_extraction', 'defense', 'shelter'
  observedAt: number;            // Tick
  teachingOthers: boolean;       // Has taught this to others
}

export interface CommunicationPattern {
  pattern: string;               // Sound/gesture pattern
  meaning: string;               // Inferred meaning
  consistency: number;           // 0-1, how reliably used
  sharedBy: string[];            // Entity IDs using this pattern
}

export class ProtoSapienceComponent extends ComponentBase {
  public readonly type = 'proto_sapience';

  // Intelligence Markers
  public intelligence: number;           // 0-1, current intelligence level
  public preSapienceThreshold: number;   // Usually 0.6
  public sapienceThreshold: number;      // Usually 0.7

  // Tool Use
  public usesTools: boolean;
  public createsTools: boolean;          // Not just uses, but creates
  public toolRecords: ToolUseRecord[];
  public teachesToolUse: boolean;

  // Communication
  public communicationComplexity: number; // 0-1
  public hasProtocolanguage: boolean;
  public communicationPatterns: CommunicationPattern[];
  public vocabularySize: number;          // Number of distinct "words"

  // Problem Solving
  public solvesPuzzles: boolean;
  public plansFuture: boolean;            // Delayed gratification observed
  public abstractThinking: boolean;
  public problemSolvingScore: number;     // 0-1

  // Self-Awareness
  public passedMirrorTest: boolean;
  public recognizesSelf: boolean;
  public understandsOthersHaveMinds: boolean; // Theory of mind

  // Social Learning
  public teachesYoung: boolean;
  public learnsByObservation: boolean;
  public socialLearningEvents: number;

  // Cultural Transmission
  public hasCulturalTraditions: boolean;
  public traditions: string[];            // Observed cultural behaviors

  // Emergence Tracking
  public generationBorn: number;
  public parentIntelligence: number;      // Average of parents
  public expectedGenerationToSapience: number;

  constructor(options: Partial<ProtoSapienceComponent> = {}) {
    super();

    this.intelligence = options.intelligence ?? 0.5;
    this.preSapienceThreshold = options.preSapienceThreshold ?? 0.6;
    this.sapienceThreshold = options.sapienceThreshold ?? 0.7;

    this.usesTools = options.usesTools ?? false;
    this.createsTools = options.createsTools ?? false;
    this.toolRecords = options.toolRecords ?? [];
    this.teachesToolUse = options.teachesToolUse ?? false;

    this.communicationComplexity = options.communicationComplexity ?? 0;
    this.hasProtocolanguage = options.hasProtocolanguage ?? false;
    this.communicationPatterns = options.communicationPatterns ?? [];
    this.vocabularySize = options.vocabularySize ?? 0;

    this.solvesPuzzles = options.solvesPuzzles ?? false;
    this.plansFuture = options.plansFuture ?? false;
    this.abstractThinking = options.abstractThinking ?? false;
    this.problemSolvingScore = options.problemSolvingScore ?? 0;

    this.passedMirrorTest = options.passedMirrorTest ?? false;
    this.recognizesSelf = options.recognizesSelf ?? false;
    this.understandsOthersHaveMinds = options.understandsOthersHaveMinds ?? false;

    this.teachesYoung = options.teachesYoung ?? false;
    this.learnsByObservation = options.learnsByObservation ?? false;
    this.socialLearningEvents = options.socialLearningEvents ?? 0;

    this.hasCulturalTraditions = options.hasCulturalTraditions ?? false;
    this.traditions = options.traditions ?? [];

    this.generationBorn = options.generationBorn ?? 0;
    this.parentIntelligence = options.parentIntelligence ?? 0.3;
    this.expectedGenerationToSapience = options.expectedGenerationToSapience ?? 10;
  }

  /**
   * Check if at pre-sapience level
   */
  isPreSapient(): boolean {
    return this.intelligence >= this.preSapienceThreshold &&
           this.intelligence < this.sapienceThreshold;
  }

  /**
   * Check if ready for sapience emergence
   */
  isReadyForSapience(): boolean {
    return this.intelligence >= this.sapienceThreshold &&
           this.passedMirrorTest &&
           this.hasProtocolanguage &&
           this.createsTools;
  }

  /**
   * Get progress to sapience
   */
  getProgressToSapience(): number {
    return Math.min(1.0, this.intelligence / this.sapienceThreshold);
  }
}
