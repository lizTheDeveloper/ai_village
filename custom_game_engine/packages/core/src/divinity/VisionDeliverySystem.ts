/**
 * VisionDeliverySystem - Divine vision delivery and interpretation
 *
 * Allows deities to send visions to believers, handles delivery costs,
 * and tracks interpretation and fulfillment.
 *
 * Vision types:
 * - dream: Appears during sleep, most common
 * - meditation: Appears during prayer/meditation
 * - sign: Appears as omen in the world
 * - direct: Direct divine contact (very expensive)
 */

import type { World } from '../ecs/World.js';
import type { EntityImpl } from '../ecs/Entity.js';
import type { DeityComponent } from '../components/DeityComponent.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { LLMVisionGenerator } from './LLMVisionGenerator.js';
import type { Prayer } from '../components/SpiritualComponent.js';

// ============================================================================
// Vision Types
// ============================================================================

export type VisionDeliveryMethod = 'dream' | 'meditation' | 'sign' | 'direct';

export type VisionClarity = 'obscure' | 'symbolic' | 'clear' | 'vivid';

export type VisionPurpose =
  | 'guidance'    // Help believer with decision
  | 'warning'     // Alert of danger
  | 'prophecy'    // Reveal future
  | 'command'     // Direct instruction
  | 'blessing'    // Bestow favor
  | 'revelation'; // Share divine knowledge

/**
 * Content for a vision
 */
export interface VisionContent {
  /** Main subject of the vision */
  subject: string;

  /** Detailed imagery */
  imagery: string[];

  /** Symbolic elements */
  symbols: string[];

  /** Emotional tone */
  tone: 'peaceful' | 'urgent' | 'fearful' | 'joyful' | 'mysterious';

  /** Hidden meaning (for interpretation) */
  hiddenMeaning?: string;
}

/**
 * A divine vision to be delivered
 */
export interface DivineVision {
  id: string;
  deityId: string;
  targetId: string;

  // Delivery
  method: VisionDeliveryMethod;
  clarity: VisionClarity;
  purpose: VisionPurpose;

  // Content
  content: VisionContent;

  // Costs
  beliefCost: number;

  // Status
  status: 'pending' | 'delivered' | 'received' | 'interpreted' | 'fulfilled' | 'failed';
  createdAt: number;
  deliveredAt?: number;
  interpretation?: string;
}

/**
 * Configuration for vision delivery costs
 */
export interface VisionCostConfig {
  baseCosts: Record<VisionDeliveryMethod, number>;
  clarityMultipliers: Record<VisionClarity, number>;
  distanceMultiplier: number; // For non-believers or distant targets
}

const DEFAULT_COST_CONFIG: VisionCostConfig = {
  baseCosts: {
    dream: 50,      // Cheapest - during natural sleep
    meditation: 75, // Target must be in prayer state
    sign: 100,      // Manifest in physical world
    direct: 250,    // Direct divine contact
  },
  clarityMultipliers: {
    obscure: 0.5,   // Barely coherent
    symbolic: 1.0,  // Requires interpretation
    clear: 1.5,     // Obvious meaning
    vivid: 2.0,     // Unforgettable, perfect clarity
  },
  distanceMultiplier: 2.0, // Cost for non-believers
};

// ============================================================================
// Vision Templates
// ============================================================================

/**
 * Pre-built vision templates for common scenarios
 */
export const VISION_TEMPLATES = {
  warning: {
    purpose: 'warning' as VisionPurpose,
    clarity: 'symbolic' as VisionClarity,
    content: {
      subject: 'Danger approaches',
      imagery: ['dark clouds gathering', 'a path forking', 'shadows creeping'],
      symbols: ['storm', 'crossroads', 'darkness'],
      tone: 'urgent' as const,
    },
  },
  guidance: {
    purpose: 'guidance' as VisionPurpose,
    clarity: 'symbolic' as VisionClarity,
    content: {
      subject: 'The way forward',
      imagery: ['a light in darkness', 'footsteps to follow', 'a door opening'],
      symbols: ['light', 'path', 'threshold'],
      tone: 'peaceful' as const,
    },
  },
  blessing: {
    purpose: 'blessing' as VisionPurpose,
    clarity: 'vivid' as VisionClarity,
    content: {
      subject: 'Divine favor',
      imagery: ['warmth surrounding', 'golden light', 'feeling of peace'],
      symbols: ['sun', 'hands', 'embrace'],
      tone: 'joyful' as const,
    },
  },
  prophecy: {
    purpose: 'prophecy' as VisionPurpose,
    clarity: 'obscure' as VisionClarity,
    content: {
      subject: 'What is to come',
      imagery: ['shifting shapes', 'distant echoes', 'time flowing'],
      symbols: ['hourglass', 'mirror', 'spiral'],
      tone: 'mysterious' as const,
    },
  },
};

// ============================================================================
// VisionDeliverySystem
// ============================================================================

export class VisionDeliverySystem {
  private world: World;
  private costConfig: VisionCostConfig;
  private pendingVisions: Map<string, DivineVision> = new Map();
  private visionIdCounter = 0;
  private llmGenerator?: LLMVisionGenerator;

  constructor(world: World, costConfig: VisionCostConfig = DEFAULT_COST_CONFIG, llmGenerator?: LLMVisionGenerator) {
    this.world = world;
    this.costConfig = costConfig;
    this.llmGenerator = llmGenerator;
  }

  /**
   * Set LLM vision generator (for dependency injection)
   */
  setLLMGenerator(generator: LLMVisionGenerator): void {
    this.llmGenerator = generator;
  }

  /**
   * Emit an event using generic type to avoid strict type checking
   */
  private emitEvent(type: string, source: string, data: Record<string, unknown>): void {
    (this.world.eventBus as unknown as { emit: (e: Record<string, unknown>) => void }).emit({
      type,
      source,
      data,
    });
  }

  /**
   * Calculate the cost of sending a vision
   */
  calculateVisionCost(
    method: VisionDeliveryMethod,
    clarity: VisionClarity,
    targetIsBeliever: boolean
  ): number {
    const baseCost = this.costConfig.baseCosts[method];
    const clarityMult = this.costConfig.clarityMultipliers[clarity];
    const distanceMult = targetIsBeliever ? 1.0 : this.costConfig.distanceMultiplier;

    return Math.ceil(baseCost * clarityMult * distanceMult);
  }

  /**
   * Queue a vision for delivery
   */
  queueVision(
    deityEntity: EntityImpl,
    targetId: string,
    method: VisionDeliveryMethod,
    clarity: VisionClarity,
    purpose: VisionPurpose,
    content: VisionContent
  ): { success: boolean; visionId?: string; error?: string } {
    const deity = deityEntity.getComponent<DeityComponent>(CT.Deity);
    if (!deity) {
      return { success: false, error: 'Entity is not a deity' };
    }

    const targetIsBeliever = deity.believers.has(targetId);
    const cost = this.calculateVisionCost(method, clarity, targetIsBeliever);

    // Check if deity can afford
    if (deity.belief.currentBelief < cost) {
      return {
        success: false,
        error: `Insufficient belief. Cost: ${cost}, Available: ${deity.belief.currentBelief}`,
      };
    }

    // Create vision
    const visionId = `vision_${++this.visionIdCounter}_${Date.now()}`;
    const vision: DivineVision = {
      id: visionId,
      deityId: deityEntity.id,
      targetId,
      method,
      clarity,
      purpose,
      content,
      beliefCost: cost,
      status: 'pending',
      createdAt: this.world.tick,
    };

    // Deduct cost
    deity.spendBelief(cost);

    // Queue for delivery
    this.pendingVisions.set(visionId, vision);

    // Track in deity component
    deity.sentVisions.push({
      visionId,
      targetId,
      targetName: this.getTargetName(targetId),
      content: content.subject,
      powerType: method,
      cost,
      timestamp: this.world.tick,
      wasReceived: false,
    });

    this.emitEvent('divinity:vision_queued', deityEntity.id, { vision });

    return { success: true, visionId };
  }

  /**
   * Queue a vision using a template
   */
  queueVisionFromTemplate(
    deityEntity: EntityImpl,
    targetId: string,
    templateName: keyof typeof VISION_TEMPLATES,
    method: VisionDeliveryMethod = 'dream',
    customContent?: Partial<VisionContent>
  ): { success: boolean; visionId?: string; error?: string } {
    const template = VISION_TEMPLATES[templateName];
    const content = {
      ...template.content,
      ...customContent,
    };

    return this.queueVision(
      deityEntity,
      targetId,
      method,
      template.clarity,
      template.purpose,
      content
    );
  }

  /**
   * Queue an LLM-generated vision responding to a prayer
   */
  async queueLLMPrayerResponse(
    deityEntity: EntityImpl,
    prayer: Prayer,
    targetId: string,
    method: VisionDeliveryMethod = 'dream',
    clarity: VisionClarity = 'clear'
  ): Promise<{ success: boolean; visionId?: string; error?: string }> {
    if (!this.llmGenerator) {
      // Fallback to template
      return this.queueVisionFromTemplate(deityEntity, targetId, 'guidance', method);
    }

    try {
      const visionContent = await this.llmGenerator.generatePrayerResponseVision(
        prayer,
        targetId,
        deityEntity.id,
        this.world,
        clarity
      );

      if (!visionContent) {
        return { success: false, error: 'Failed to generate LLM vision' };
      }

      // Map prayer type to purpose
      const purposeMap: Record<string, VisionPurpose> = {
        guidance: 'guidance',
        help: 'blessing',
        gratitude: 'blessing',
        question: 'revelation',
        confession: 'blessing',
        plea: 'command',
        praise: 'blessing',
        mourning: 'blessing',
      };

      const purpose = purposeMap[prayer.type] || 'guidance';

      return this.queueVision(
        deityEntity,
        targetId,
        method,
        clarity,
        purpose,
        visionContent
      );
    } catch (error) {
      console.error('[VisionDeliverySystem] LLM generation failed:', error);
      return this.queueVisionFromTemplate(deityEntity, targetId, 'guidance', method);
    }
  }

  /**
   * Queue an LLM-generated meditation vision
   */
  async queueLLMMeditationVision(
    deityEntity: EntityImpl,
    targetId: string,
    method: VisionDeliveryMethod = 'meditation'
  ): Promise<{ success: boolean; visionId?: string; error?: string }> {
    if (!this.llmGenerator) {
      return this.queueVisionFromTemplate(deityEntity, targetId, 'guidance', method);
    }

    try {
      const visionContent = await this.llmGenerator.generateMeditationVision(
        targetId,
        this.world,
        deityEntity.id
      );

      if (!visionContent) {
        return { success: false, error: 'Failed to generate LLM vision' };
      }

      return this.queueVision(
        deityEntity,
        targetId,
        method,
        'symbolic',
        'guidance',
        visionContent
      );
    } catch (error) {
      console.error('[VisionDeliverySystem] LLM generation failed:', error);
      return this.queueVisionFromTemplate(deityEntity, targetId, 'guidance', method);
    }
  }

  /**
   * Process pending visions - call each tick
   */
  update(): void {
    for (const [_visionId, vision] of this.pendingVisions) {
      if (vision.status !== 'pending') continue;

      const canDeliver = this.canDeliverVision(vision);
      if (canDeliver) {
        this.deliverVision(vision);
      }
    }

    // Clean up old delivered visions
    for (const [visionId, vision] of this.pendingVisions) {
      if (
        vision.status === 'delivered' &&
        this.world.tick - (vision.deliveredAt ?? 0) > 12000 // 10 minutes at 20 TPS
      ) {
        this.pendingVisions.delete(visionId);
      }
    }
  }

  /**
   * Check if a vision can be delivered now
   */
  private canDeliverVision(vision: DivineVision): boolean {
    const target = this.world.getEntity(vision.targetId);
    if (!target) return false;

    const agent = target.components.get(CT.Agent);
    if (!agent || typeof agent !== 'object') return false;

    const agentData = agent as { currentBehavior?: string; sleeping?: boolean };

    switch (vision.method) {
      case 'dream':
        return agentData.currentBehavior === 'sleep' || agentData.sleeping === true;

      case 'meditation':
        return (
          agentData.currentBehavior === 'pray' ||
          agentData.currentBehavior === 'meditate' ||
          agentData.currentBehavior === 'reflect'
        );

      case 'sign':
      case 'direct':
        return true;

      default:
        return false;
    }
  }

  /**
   * Deliver a vision to its target
   */
  private deliverVision(vision: DivineVision): void {
    const target = this.world.getEntity(vision.targetId) as EntityImpl | undefined;
    if (!target) {
      vision.status = 'failed';
      return;
    }

    vision.status = 'delivered';
    vision.deliveredAt = this.world.tick;

    // Add to target's memory (if they have one)
    const memory = target.components.get(CT.Memory);
    if (memory && typeof memory === 'object' && 'memories' in memory) {
      const memoryData = memory as { memories: unknown[] };
      memoryData.memories.push({
        id: `memory_vision_${vision.id}`,
        tick: this.world.tick,
        type: 'vision',
        content: this.formatVisionForMemory(vision),
        importance: this.getVisionImportance(vision),
        emotionalWeight: this.getVisionEmotionalWeight(vision),
        entities: [vision.deityId],
      });
      vision.status = 'received';
    }

    // Update deity tracking
    const deity = this.world.getEntity(vision.deityId);
    if (deity) {
      const deityComp = deity.components.get(CT.Deity) as DeityComponent | undefined;
      if (deityComp) {
        const tracked = deityComp.sentVisions.find((v: { visionId: string }) => v.visionId === vision.id);
        if (tracked) {
          tracked.wasReceived = true;
        }
      }
    }

    this.emitEvent('divinity:vision_delivered', vision.deityId, {
      vision,
      targetId: vision.targetId,
      targetName: this.getTargetName(vision.targetId),
    });
  }

  /**
   * Record an interpretation of a vision
   */
  recordInterpretation(visionId: string, interpretation: string): void {
    const vision = this.pendingVisions.get(visionId);
    if (!vision || vision.status !== 'received') return;

    vision.interpretation = interpretation;
    vision.status = 'interpreted';

    // Update deity tracking
    const deity = this.world.getEntity(vision.deityId);
    if (deity) {
      const deityComp = deity.components.get(CT.Deity) as DeityComponent | undefined;
      if (deityComp) {
        const tracked = deityComp.sentVisions.find((v: { visionId: string }) => v.visionId === vision.id);
        if (tracked) {
          tracked.interpretation = interpretation;
        }
      }
    }

    this.emitEvent('divinity:vision_interpreted', vision.targetId, {
      visionId,
      interpretation,
      matchesIntent: this.interpretationMatchesIntent(vision, interpretation),
    });
  }

  /**
   * Mark a vision/prophecy as fulfilled
   */
  markFulfilled(visionId: string): void {
    const vision = this.pendingVisions.get(visionId);
    if (!vision) return;

    vision.status = 'fulfilled';

    // Grant bonus belief to deity for prophecy fulfillment
    if (vision.purpose === 'prophecy') {
      const deity = this.world.getEntity(vision.deityId);
      if (deity) {
        const deityComp = deity.components.get(CT.Deity) as DeityComponent | undefined;
        if (deityComp) {
          const bonusBelief = vision.beliefCost * 2;
          deityComp.addBelief(bonusBelief, this.world.tick);
        }
      }
    }

    this.emitEvent('divinity:prophecy_fulfilled', vision.deityId, { visionId, vision });
  }

  /**
   * Get all pending visions for a deity
   */
  getDeityVisions(deityId: string): DivineVision[] {
    return Array.from(this.pendingVisions.values()).filter(v => v.deityId === deityId);
  }

  /**
   * Get all received but uninterpreted visions for an agent
   */
  getUninterpretedVisions(agentId: string): DivineVision[] {
    return Array.from(this.pendingVisions.values()).filter(
      v => v.targetId === agentId && v.status === 'received'
    );
  }

  // ========== Helper Methods ==========

  private getTargetName(targetId: string): string {
    const target = this.world.getEntity(targetId);
    if (!target) return 'Unknown';

    const agent = target.components.get(CT.Agent);
    if (agent && typeof agent === 'object' && 'name' in agent) {
      return (agent as { name?: string }).name ?? targetId;
    }
    return targetId;
  }

  private formatVisionForMemory(vision: DivineVision): string {
    const clarity = vision.clarity === 'vivid' ? 'crystal clear' :
                    vision.clarity === 'clear' ? 'clear' :
                    vision.clarity === 'symbolic' ? 'symbolic and mysterious' :
                    'vague and confusing';

    return `Had a ${clarity} vision about ${vision.content.subject}. ` +
           `Saw: ${vision.content.imagery.join(', ')}. ` +
           `Felt ${vision.content.tone}.`;
  }

  private getVisionImportance(vision: DivineVision): number {
    const clarityScore = { obscure: 0.3, symbolic: 0.5, clear: 0.7, vivid: 1.0 }[vision.clarity];
    const purposeScore = {
      guidance: 0.5, warning: 0.8, prophecy: 0.9, command: 0.85, blessing: 0.6, revelation: 0.95,
    }[vision.purpose];

    return Math.min(1.0, (clarityScore + purposeScore) / 2 + 0.2);
  }

  private getVisionEmotionalWeight(vision: DivineVision): number {
    const toneWeights = { peaceful: 0.4, urgent: 0.8, fearful: 0.9, joyful: 0.6, mysterious: 0.5 };
    return toneWeights[vision.content.tone];
  }

  private interpretationMatchesIntent(vision: DivineVision, interpretation: string): boolean {
    if (!vision.content.hiddenMeaning) return true;

    const meaning = vision.content.hiddenMeaning.toLowerCase();
    const interp = interpretation.toLowerCase();

    const keyWords = meaning.split(/\s+/).filter(w => w.length > 3);
    return keyWords.some(word => interp.includes(word));
  }
}

/**
 * Create and return a VisionDeliverySystem
 */
export function createVisionDeliverySystem(world: World, llmGenerator?: LLMVisionGenerator): VisionDeliverySystem {
  return new VisionDeliverySystem(world, undefined, llmGenerator);
}
