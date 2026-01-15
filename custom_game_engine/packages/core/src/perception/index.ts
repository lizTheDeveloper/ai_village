/**
 * Perception Module
 *
 * This module contains processors for agent perception:
 * - VisionProcessor: Detects visible entities (resources, plants, agents)
 * - HearingProcessor: Collects speech from nearby agents
 * - MeetingDetector: Detects and responds to meeting calls
 *
 * Part of Phase 3 of the AISystem decomposition (work-order: ai-system-refactor)
 */

// Vision Processing
export {
  VisionProcessor,
  processVision,
  injectChunkSpatialQuery,
  type VisionResult,
} from './VisionProcessor.js';

// Hearing Processing
export {
  HearingProcessor,
  processHearing,
  canHear,
  getAgentsInHearingRange,
  injectChunkSpatialQueryForHearing,
  type HeardSpeech,
  type HearingResult,
} from './HearingProcessor.js';

// Meeting Detection
export {
  MeetingDetector,
  processMeetingCalls,
  isMeetingCall,
  type MeetingDetectionResult,
} from './MeetingDetector.js';

// Import classes for PerceptionProcessor
import { VisionProcessor as VisionProcessorClass, type VisionResult as VisionResultType } from './VisionProcessor.js';
import { HearingProcessor as HearingProcessorClass, type HearingResult as HearingResultType } from './HearingProcessor.js';
import { MeetingDetector as MeetingDetectorClass, type MeetingDetectionResult as MeetingDetectionResultType } from './MeetingDetector.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { World } from '../ecs/World.js';

/**
 * PerceptionProcessor - Orchestrates all perception processing
 *
 * Usage:
 * ```typescript
 * const perception = new PerceptionProcessor();
 *
 * // In system update loop
 * perception.processAll(entity, world);
 * ```
 */
export class PerceptionProcessor {
  private visionProcessor: VisionProcessorClass;
  private hearingProcessor: HearingProcessorClass;
  private meetingDetector: MeetingDetectorClass;

  constructor() {
    this.visionProcessor = new VisionProcessorClass();
    this.hearingProcessor = new HearingProcessorClass();
    this.meetingDetector = new MeetingDetectorClass();
  }

  /**
   * Process all perception for an entity.
   * Runs vision, hearing, and meeting detection in order.
   */
  processAll(
    entity: EntityImpl,
    world: World
  ): {
    vision: VisionResultType;
    hearing: HearingResultType;
    meeting: MeetingDetectionResultType;
  } {
    // Phase 1: Vision (detect entities)
    const vision = this.visionProcessor.process(entity, world);

    // Phase 2: Hearing (collect speech)
    const hearing = this.hearingProcessor.process(entity, world);

    // Phase 3: Meeting detection (respond to calls)
    const meeting = this.meetingDetector.process(entity, world);

    return { vision, hearing, meeting };
  }

  /**
   * Process only vision.
   */
  processVision(entity: EntityImpl, world: World): VisionResultType {
    return this.visionProcessor.process(entity, world);
  }

  /**
   * Process only hearing.
   */
  processHearing(entity: EntityImpl, world: World): HearingResultType {
    return this.hearingProcessor.process(entity, world);
  }

  /**
   * Process only meeting detection.
   */
  processMeeting(entity: EntityImpl, world: World): MeetingDetectionResultType {
    return this.meetingDetector.process(entity, world);
  }
}
