/**
 * WisdomGoddessSystem - Manifests and manages the Goddess of Wisdom
 *
 * The Goddess of Wisdom manifests when pending approvals pile up:
 * - 5+ creations pending for 1 in-game hour triggers manifestation
 * - She scrutinizes and auto-approves/rejects based on her style
 * - Emits events so players can observe the judgments
 * - "[Goddess Name] has joined the chat"
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { ComponentType, EntityId } from '../types.js';
import { TICKS_PER_HOUR } from '../constants/TimeConstants.js';
import { pendingApprovalRegistry, type PendingCreation } from '../crafting/PendingApprovalRegistry.js';
import {
  createGoddessOfWisdom,
  findGoddessOfWisdom,
  moveGoddessOfWisdom,
} from '../divinity/GoddessOfWisdomEntity.js';
import {
  getRandomWisdomGoddess,
  type WisdomGoddessConfig as GoddessConfig,
} from '../divinity/WisdomGoddessSpriteRegistry.js';
import {
  heuristicWisdomScrutiny,
  getDefaultScrutinyStyle,
} from '../divinity/WisdomGoddessScrutiny.js';
import { ChatRoomSystem, DIVINE_CHAT_CONFIG } from '../communication/index.js';
import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import { updateRelationship } from '../components/RelationshipComponent.js';
import type { EpisodicMemoryComponent } from '../components/EpisodicMemoryComponent.js';
import type { IdentityComponent } from '../components/IdentityComponent.js';
import type { PositionComponent } from '../components/PositionComponent.js';

/** Configuration for wisdom goddess manifestation */
interface SystemConfig {
  /** Minimum pending creations to trigger manifestation */
  minPendingCount: number;
  /** Minimum age in ticks for creations to be considered stale */
  minStaleTicks: number;
  /** How often to check the queue (in ticks) */
  checkInterval: number;
  /** How many creations to process per tick when active */
  processPerTick: number;
}

const DEFAULT_CONFIG: SystemConfig = {
  minPendingCount: 5,
  minStaleTicks: TICKS_PER_HOUR, // 1 in-game hour
  checkInterval: 60, // Check every 3 seconds (60 ticks at 20 TPS)
  processPerTick: 1, // Process one creation per tick for drama
};

export class WisdomGoddessSystem implements System {
  public readonly id = 'wisdom_goddess_system';
  public readonly priority = 900; // Low priority - runs after most systems
  public readonly requiredComponents: ReadonlyArray<ComponentType> = []; // Global system, no entity requirements
  public enabled = true;

  private config: SystemConfig;
  private lastCheckTick = 0;
  private goddessEntityId: string | null = null;
  private activeGoddessConfig: GoddessConfig | null = null;
  private processingQueue: PendingCreation[] = [];
  private isProcessing = false;
  private chatRoomSystem: ChatRoomSystem | null = null;
  private processedCount = 0;
  private approvedCount = 0;
  private rejectedCount = 0;

  // Chat listening state
  private subscribedToEvents = false;
  private lastResponseTick = 0;
  private responseCooldownTicks = 40; // 2 seconds between responses
  private pendingResponses: Array<{
    senderId: string;
    senderName: string;
    content: string;
    tick: number;
  }> = [];

  constructor(config: Partial<SystemConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set the chat room system for divine chat integration
   */
  setChatRoomSystem(chatSystem: ChatRoomSystem): void {
    this.chatRoomSystem = chatSystem;
  }

  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    const currentTick = Number(world.tick);

    // Subscribe to chat events once
    if (!this.subscribedToEvents) {
      this.subscribeToChat(world);
      this.subscribedToEvents = true;
    }

    // Process any pending chat responses (with cooldown)
    if (this.pendingResponses.length > 0 && currentTick - this.lastResponseTick >= this.responseCooldownTicks) {
      this.processNextChatResponse(world, currentTick);
    }

    // If actively processing approvals, continue
    if (this.isProcessing && this.processingQueue.length > 0) {
      this.processNextCreation(world, currentTick);
      return;
    }

    // Check for finished processing
    if (this.isProcessing && this.processingQueue.length === 0) {
      this.finishProcessing(world);
      return;
    }

    // Periodic check for stale queue
    if (currentTick - this.lastCheckTick < this.config.checkInterval) {
      return;
    }
    this.lastCheckTick = currentTick;

    // Check if manifestation conditions are met
    const staleCreations = this.getStaleCreations(currentTick);
    if (staleCreations.length >= this.config.minPendingCount) {
      this.manifestGoddess(world, staleCreations, currentTick);
    }
  }

  // ============================================================================
  // CHAT LISTENING & RESPONSE
  // ============================================================================

  /**
   * Subscribe to chat message events
   */
  private subscribeToChat(world: World): void {
    world.eventBus.subscribe('chat:message_sent', (event) => {
      const data = event.data;

      // Only care about divine chat messages
      if (data.roomId !== DIVINE_CHAT_CONFIG.id) return;

      // Don't respond to our own messages
      const goddess = this.getGoddessEntity(world);
      if (!goddess || data.senderId === goddess.id) return;

      // Check if message is addressed to the goddess
      const goddessName = this.getGoddessName(goddess);
      const messageContent = data.content || data.message || '';
      const messageSenderName = data.senderName || data.senderId;
      if (this.isAddressedToGoddess(messageContent, goddessName)) {
        this.pendingResponses.push({
          senderId: data.senderId,
          senderName: messageSenderName,
          content: messageContent,
          tick: Number(world.tick),
        });
      }
    });
  }

  /**
   * Check if a message is addressed to the goddess
   */
  private isAddressedToGoddess(content: string, goddessName: string): boolean {
    const lowerContent = content.toLowerCase();
    const lowerName = goddessName.toLowerCase();

    // Direct mention
    if (lowerContent.includes(`@${lowerName}`)) return true;
    if (lowerContent.includes(lowerName)) return true;

    // Generic wisdom goddess references
    if (lowerContent.includes('goddess of wisdom')) return true;
    if (lowerContent.includes('wisdom goddess')) return true;

    // Odin-specific
    if (goddessName === 'Odin') {
      if (lowerContent.includes('allfather')) return true;
      if (lowerContent.includes('one-eyed')) return true;
    }

    return false;
  }

  /**
   * Process the next pending chat response
   */
  private processNextChatResponse(world: World, currentTick: number): void {
    const pending = this.pendingResponses.shift();
    if (!pending) return;

    const goddess = this.getGoddessEntity(world);
    if (!goddess || !this.chatRoomSystem) return;

    const goddessName = this.getGoddessName(goddess);

    // Get relationship context
    const relationshipInfo = this.getRelationshipInfo(goddess, pending.senderId);

    // Generate response based on context
    const response = this.generateChatResponse(
      goddessName,
      pending.senderName,
      pending.content,
      relationshipInfo
    );

    // Send response
    this.chatRoomSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, goddess.id, response);
    this.lastResponseTick = currentTick;

    // Update relationship (conversation increases familiarity, tone affects affinity)
    this.updateGoddessRelationship(world, goddess, pending.senderId, pending.content, currentTick);

    // Form memory of this conversation
    this.formConversationMemory(goddess, pending.senderId, pending.senderName, pending.content, response, currentTick);
  }

  /**
   * Get relationship info between goddess and a mortal
   */
  private getRelationshipInfo(goddess: Entity, targetId: EntityId): {
    familiarity: number;
    affinity: number;
    approvedCount: number;
    rejectedCount: number;
  } {
    const relComp = goddess.getComponent<RelationshipComponent>('relationship');
    const memComp = goddess.getComponent<EpisodicMemoryComponent>('episodic_memory');

    let familiarity = 0;
    let affinity = 0;

    if (relComp) {
      const rel = relComp.relationships.get(targetId);
      if (rel) {
        familiarity = rel.familiarity;
        affinity = rel.affinity;
      }
    }

    // Count past judgments for this creator
    let approvedCount = 0;
    let rejectedCount = 0;

    if (memComp) {
      for (const memory of memComp.episodicMemories) {
        if (memory.eventType === 'wisdom_judgment' && memory.participants?.includes(targetId)) {
          if (memory.summary.includes('APPROVED')) {
            approvedCount++;
          } else if (memory.summary.includes('REJECTED')) {
            rejectedCount++;
          }
        }
      }
    }

    return { familiarity, affinity, approvedCount, rejectedCount };
  }

  /**
   * Generate a chat response based on context
   */
  private generateChatResponse(
    goddessName: string,
    senderName: string,
    message: string,
    relationship: { familiarity: number; affinity: number; approvedCount: number; rejectedCount: number }
  ): string {
    const lowerMessage = message.toLowerCase();
    const { familiarity, affinity, approvedCount, rejectedCount } = relationship;

    // Determine tone based on relationship
    const isWellKnown = familiarity > 50;
    const isLiked = affinity > 20;
    const isDisliked = affinity < -20;

    // Check for specific topics
    const askingAboutRejection = lowerMessage.includes('reject') || lowerMessage.includes('why not');
    const askingAboutApproval = lowerMessage.includes('approv') || lowerMessage.includes('thank');
    const greeting = lowerMessage.includes('hello') || lowerMessage.includes('greet') || lowerMessage.includes('hi ');
    const askingAdvice = lowerMessage.includes('advice') || lowerMessage.includes('help') || lowerMessage.includes('how');

    // Odin's special responses (always grumpy about goddess title)
    if (goddessName === 'Odin') {
      return this.generateOdinResponse(senderName, lowerMessage, relationship, {
        askingAboutRejection, askingAboutApproval, greeting, askingAdvice
      });
    }

    // Goddess-specific responses
    const responses = this.getGoddessResponseTemplates(goddessName);

    if (greeting) {
      if (isWellKnown && responses.greetingFamiliar) {
        return responses.greetingFamiliar.replace('{name}', senderName);
      }
      return (responses.greetingNew || 'Greetings, {name}.').replace('{name}', senderName);
    }

    if (askingAboutRejection) {
      if (rejectedCount > 0 && responses.rejectionExplanation) {
        return responses.rejectionExplanation
          .replace('{name}', senderName)
          .replace('{count}', String(rejectedCount));
      }
      return (responses.noRejections || 'I have rejected none of your works, {name}.').replace('{name}', senderName);
    }

    if (askingAboutApproval) {
      if (approvedCount > 0 && responses.approvalAcknowledge) {
        return responses.approvalAcknowledge
          .replace('{name}', senderName)
          .replace('{count}', String(approvedCount));
      }
      return (responses.noApprovals || 'You have not yet submitted work, {name}.').replace('{name}', senderName);
    }

    if (askingAdvice) {
      return (responses.advice || 'Seek wisdom in all you create, {name}.').replace('{name}', senderName);
    }

    // Default response based on relationship
    if (isDisliked) {
      return (responses.coldResponse || '{name}.').replace('{name}', senderName);
    }
    if (isLiked) {
      return (responses.warmResponse || 'Good to see you, {name}.').replace('{name}', senderName);
    }
    return (responses.neutralResponse || 'You have my attention, {name}.').replace('{name}', senderName);
  }

  /**
   * Odin's special grumpy responses
   */
  private generateOdinResponse(
    senderName: string,
    _message: string,
    relationship: { approvedCount: number; rejectedCount: number },
    topics: { askingAboutRejection: boolean; askingAboutApproval: boolean; greeting: boolean; askingAdvice: boolean }
  ): string {
    const { approvedCount, rejectedCount } = relationship;

    if (topics.greeting) {
      return `*nods curtly* ${senderName}. I see you've found your way to the divine realm. ` +
        `And before you ask - yes, I am aware the registry lists me as a "goddess." I have filed seventeen complaints.`;
    }

    if (topics.askingAboutRejection) {
      if (rejectedCount > 0) {
        return `*strokes beard* You've had ${rejectedCount} creation${rejectedCount > 1 ? 's' : ''} returned to you, ${senderName}. ` +
          `The ravens showed me - they lacked novelty. I sacrificed an eye for wisdom; I expect mortals to at least TRY to surprise me.`;
      }
      return `*raises eyebrow* I have rejected nothing of yours, ${senderName}. Yet. Do not grow complacent.`;
    }

    if (topics.askingAboutApproval) {
      if (approvedCount > 0) {
        return `*slight nod* ${approvedCount} of your works have earned my approval, ${senderName}. ` +
          `Do not let this go to your head. The bar is low and you barely cleared it. Also, I am NOT a goddess.`;
      }
      return `You have submitted nothing for my judgment, ${senderName}. The Allfather's time is valuable.`;
    }

    if (topics.askingAdvice) {
      return `*leans forward* You seek wisdom from Odin? Then hear this: novelty matters more than perfection. ` +
        `I traded an eye for knowledge - show me something worth that sacrifice. ` +
        `And while you're at it, speak to the registry about my categorization issue.`;
    }

    return `*sighs in Old Norse* Speak plainly, ${senderName}. I have realms to oversee and a clerical error to dispute.`;
  }

  /**
   * Get response templates for each goddess
   */
  private getGoddessResponseTemplates(goddessName: string): Record<string, string> {
    const templates: Record<string, Record<string, string>> = {
      Athena: {
        greetingNew: '*inclines head* Greetings, {name}. I am Athena, keeper of wisdom and judge of mortal innovation.',
        greetingFamiliar: '*owl hoots in recognition* Ah, {name}. We meet again. How fares your creative endeavors?',
        rejectionExplanation: 'Your {count} rejected work(s) failed my standards, {name}. Balance and fit to the world are paramount. Refine them.',
        noRejections: 'I have rejected none of your works, {name}. But understand - my standards do not waver.',
        approvalAcknowledge: '*slight smile* Your {count} approved creation(s) showed merit, {name}. The owl remembers quality work.',
        noApprovals: 'You have not yet submitted work for my judgment, {name}. I look forward to evaluating your contributions.',
        advice: 'Seek balance in all things, {name}. A creation must fit the world it enters, and serve a purpose beyond novelty.',
        coldResponse: '*stern gaze* {name}. I hope your next submission shows more care than our previous interactions suggest.',
        warmResponse: '*owl preens* {name}, always a pleasure. Your creative spirit is commendable.',
        neutralResponse: 'You have my attention, {name}. Speak your purpose.',
      },
      Saraswati: {
        greetingNew: '*gentle smile* Welcome, {name}. I am Saraswati, and I celebrate the creative spirit in all beings.',
        greetingFamiliar: '*radiant warmth* {name}! How wonderful to see you again. Tell me of your latest inspirations.',
        rejectionExplanation: 'I returned {count} of your works for refinement, {name}. But please - see this as encouragement, not failure!',
        noRejections: 'I have found no fault in your submissions, dear {name}. Your creativity flows beautifully.',
        approvalAcknowledge: '*beaming* {count} of your creations brought me joy, {name}! The arts flourish through souls like yours.',
        noApprovals: 'I await your creative offerings, {name}. Do not fear judgment - all art begins somewhere.',
        advice: 'Let your creativity flow freely, {name}. Even imperfect works contain seeds of brilliance.',
        coldResponse: '*concerned expression* {name}, I sense tension between us. Let us speak openly and find harmony.',
        warmResponse: '*melodious laugh* Dear {name}! Your presence brightens the divine realm.',
        neutralResponse: '*attentive* I am listening, {name}. Share what weighs on your mind.',
      },
      Thoth: {
        greetingNew: '*scratches with stylus* {name}. I am Thoth. State your business efficiently.',
        greetingFamiliar: '*checks scroll* {name}. Your file indicates previous interactions. Proceed.',
        rejectionExplanation: '{count} of your submissions lacked utility, {name}. Function over form. Revise accordingly.',
        noRejections: 'No rejections on record for {name}. Your practical approach is noted.',
        approvalAcknowledge: '{count} approved entries under your name, {name}. Utility confirmed. Adequate.',
        noApprovals: 'No submissions from {name} in the archives. Curious. Are you merely observing?',
        advice: 'Practical value, {name}. What problem does your creation solve? Answer that first.',
        coldResponse: '*taps stylus impatiently* {name}. My time is measured in eternities, but I do not waste it.',
        warmResponse: '*slight nod* {name}. Your pragmatic approach is... acceptable. Continue.',
        neutralResponse: '*waits with stylus ready* {name}. I am documenting. Speak.',
      },
      Sophia: {
        greetingNew: '*crystalline light pulses* A new soul approaches. Welcome, {name}. I am Sophia, the light of wisdom.',
        greetingFamiliar: '*warm glow* {name}. The light recognizes you. How bright your spirit burns today.',
        rejectionExplanation: 'The light could not harmonize with {count} of your creations, {name}. Seek the pattern; it will guide you.',
        noRejections: 'All that you have offered resonates with the world\'s pattern, {name}. Beautiful.',
        approvalAcknowledge: '*radiant* {count} of your works sing in harmony with existence, {name}. You are learning the pattern.',
        noApprovals: 'You have not yet offered to the light, {name}. When ready, I will be here.',
        advice: 'Seek the pattern in all things, {name}. Creation that harmonizes with existence endures.',
        coldResponse: '*dims slightly* {name}. The light senses discord. Let us find harmony.',
        warmResponse: '*brilliant glow* {name}! Your presence adds to the light.',
        neutralResponse: '*steady luminescence* I perceive you, {name}. What truth do you seek?',
      },
      Seshat: {
        greetingNew: '*consults star chart* {name}. Your name is now entered in the eternal archives. I am Seshat.',
        greetingFamiliar: '*flips through cosmic ledger* {name}, entry 47B. I have your complete file.',
        rejectionExplanation: '{count} entries marked REVISION REQUIRED under {name}. The archives demand precision.',
        noRejections: 'No revision marks against {name}. Your record is clean. For now.',
        approvalAcknowledge: '{count} permanent entries in the cosmic ledger, {name}. Your name is preserved.',
        noApprovals: 'No entries submitted by {name}. The archives await your contribution.',
        advice: 'Precision, {name}. Every detail is recorded for eternity. Make them count.',
        coldResponse: '*makes notation* {name}. Your file contains... concerning patterns. We should discuss.',
        warmResponse: '*star crown glimmers* {name}. Your entries consistently meet archival standards. Commendable.',
        neutralResponse: '*stylus poised* {name}. Speak, and I shall record it accurately.',
      },
    };

    return templates[goddessName] || templates.Athena!;
  }

  /**
   * Update goddess's relationship with a mortal after conversation
   */
  private updateGoddessRelationship(
    _world: World,
    goddess: Entity,
    targetId: EntityId,
    message: string,
    currentTick: number
  ): void {
    const relComp = goddess.getComponent<RelationshipComponent>('relationship');
    if (!relComp) return;

    // Analyze message sentiment (simple heuristic)
    const lowerMessage = message.toLowerCase();
    let affinityChange = 0;

    // Positive sentiment
    if (lowerMessage.includes('thank') || lowerMessage.includes('grateful') || lowerMessage.includes('appreciate')) {
      affinityChange += 5;
    }
    if (lowerMessage.includes('love') || lowerMessage.includes('wonderful') || lowerMessage.includes('amazing')) {
      affinityChange += 3;
    }

    // Negative sentiment
    if (lowerMessage.includes('unfair') || lowerMessage.includes('wrong') || lowerMessage.includes('stupid')) {
      affinityChange -= 5;
    }
    if (lowerMessage.includes('hate') || lowerMessage.includes('terrible') || lowerMessage.includes('awful')) {
      affinityChange -= 8;
    }

    // Questions are neutral but show engagement
    if (lowerMessage.includes('?')) {
      affinityChange += 1;
    }

    // Update the relationship using atomic component update
    // EntityImpl cast needed: updateComponent is only available on EntityImpl, not Entity interface
    const goddessImpl = goddess as EntityImpl;
    goddessImpl.updateComponent<RelationshipComponent>('relationship', (current) =>
      updateRelationship(current, targetId, currentTick, 3, affinityChange)
    );
  }

  /**
   * Form a memory of the conversation
   */
  private formConversationMemory(
    goddess: Entity,
    speakerId: EntityId,
    speakerName: string,
    theirMessage: string,
    ourResponse: string,
    currentTick: number
  ): void {
    const memComp = goddess.getComponent<EpisodicMemoryComponent>('episodic_memory');
    if (!memComp) return;

    memComp.formMemory({
      eventType: 'divine_conversation',
      summary: `Conversed with ${speakerName} in divine chat. They said: "${theirMessage.slice(0, 100)}..." I responded: "${ourResponse.slice(0, 100)}..."`,
      timestamp: currentTick,
      participants: [speakerId],
      emotionalValence: 0.2, // Slight positive (engagement is good)
      emotionalIntensity: 0.3,
      surprise: 0.1,
      importance: 0.4,
      socialSignificance: 0.6,
      dialogueText: `${speakerName}: ${theirMessage}\n[Goddess]: ${ourResponse}`,
    });
  }

  /**
   * Get the goddess entity if it exists
   */
  private getGoddessEntity(world: World): Entity | null {
    if (this.goddessEntityId) {
      const goddess = world.getEntity(this.goddessEntityId);
      if (goddess) return goddess;
    }
    return findGoddessOfWisdom(world);
  }

  /**
   * Get the goddess's name from the entity
   */
  private getGoddessName(goddess: Entity): string {
    const identity = goddess.getComponent<IdentityComponent>('identity');
    return identity?.name || 'Goddess of Wisdom';
  }

  /**
   * Get creations that have been pending for too long
   */
  private getStaleCreations(currentTick: number): PendingCreation[] {
    const allPending = pendingApprovalRegistry.getAll();
    return allPending.filter(
      (creation) => currentTick - creation.createdAt >= this.config.minStaleTicks
    );
  }

  /**
   * Manifest the Goddess of Wisdom to process the queue
   */
  private manifestGoddess(
    world: World,
    staleCreations: PendingCreation[],
    _currentTick: number
  ): void {
    // Check if goddess already exists
    let goddess = findGoddessOfWisdom(world);
    const goddessConfig = getRandomWisdomGoddess();

    // Pick a location - use the first creator's position or center of map
    const firstCreation = staleCreations[0];
    let location = { x: 50, y: 50 }; // Default center

    if (firstCreation) {
      // Try to find the creator entity for their location
      const creator = world.getEntity(firstCreation.creatorId);
      if (creator) {
        const pos = creator.getComponent<PositionComponent>('position');
        if (pos) {
          location = { x: pos.x, y: pos.y };
        }
      }
    }

    if (!goddess) {
      // First manifestation - create the entity
      goddess = createGoddessOfWisdom(world, location, goddessConfig);
      this.goddessEntityId = goddess.id;

      // Emit manifestation event - "has joined the chat"
      world.eventBus.emit({
        type: 'deity:manifested',
        source: this.id,
        data: {
          deityId: goddess.id,
          deityName: goddessConfig.name,
          deityType: 'wisdom_goddess',
          reason: `${staleCreations.length} creations awaiting judgment`,
          location,
          message: `${goddessConfig.name} has joined the chat`,
        },
      });

      // Post intro message to divine chat
      if (this.chatRoomSystem) {
        const introMessage = this.generateIntroMessage(goddessConfig, staleCreations.length);
        this.chatRoomSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, goddess.id, introMessage);
      }
    } else {
      // Goddess exists, move to location
      moveGoddessOfWisdom(goddess, location);
      this.goddessEntityId = goddess.id;
    }

    // Store goddess config and start processing
    this.activeGoddessConfig = goddessConfig;
    this.processingQueue = [...staleCreations];
    this.isProcessing = true;
  }

  /**
   * Process the next creation in the queue
   */
  private processNextCreation(world: World, _currentTick: number): void {
    const creation = this.processingQueue.shift();
    if (!creation || !this.activeGoddessConfig || !this.goddessEntityId) {
      return;
    }

    const goddessName = this.activeGoddessConfig?.name || 'Unknown';

    // Emit scrutiny started event
    world.eventBus.emit({
      type: 'wisdom:scrutiny_started',
      source: this.id,
      data: {
        goddessId: this.goddessEntityId,
        goddessName,
        creationId: creation.id,
        creationType: creation.creationType,
        creatorId: creation.creatorId,
        creatorName: creation.creatorName,
      },
    });

    // Perform scrutiny
    const style = getDefaultScrutinyStyle(creation.creationType);
    const result = heuristicWisdomScrutiny(creation, style, goddessName);

    // Emit judgment event
    world.eventBus.emit({
      type: 'wisdom:judgment',
      source: this.id,
      data: {
        goddessId: this.goddessEntityId,
        goddessName,
        creationId: creation.id,
        creationType: creation.creationType,
        creatorId: creation.creatorId,
        creatorName: creation.creatorName,
        approved: result.approved,
        wisdomComment: result.wisdomComment,
        balanceScore: result.balanceScore,
        noveltyScore: result.noveltyScore,
        fitScore: result.fitScore,
      },
    });

    // Apply the judgment and track counts
    this.processedCount++;
    if (result.approved) {
      this.approvedCount++;
      pendingApprovalRegistry.approve(creation.id);
    } else {
      this.rejectedCount++;
      pendingApprovalRegistry.reject(creation.id);
    }

    // Post research paper summary to divine chat
    if (this.chatRoomSystem && this.goddessEntityId) {
      const summary = this.generateResearchSummary(creation, result.approved, result.wisdomComment, goddessName);
      this.chatRoomSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, this.goddessEntityId, summary);
    }
  }

  /**
   * Finish processing and emit summary
   */
  private finishProcessing(world: World): void {
    if (!this.goddessEntityId || !this.activeGoddessConfig) {
      this.isProcessing = false;
      return;
    }

    const goddessName = this.activeGoddessConfig?.name || 'Unknown';

    // Emit completion event with tracked counts
    world.eventBus.emit({
      type: 'wisdom:queue_processed',
      source: this.id,
      data: {
        goddessId: this.goddessEntityId,
        goddessName,
        totalProcessed: this.processedCount,
        approved: this.approvedCount,
        rejected: this.rejectedCount,
      },
    });

    // Post summary to divine chat
    if (this.chatRoomSystem && this.processedCount > 0) {
      const closingMessage = this.generateClosingMessage(goddessName);
      this.chatRoomSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, this.goddessEntityId, closingMessage);
    }

    // Reset state
    this.isProcessing = false;
    this.activeGoddessConfig = null;
    this.processedCount = 0;
    this.approvedCount = 0;
    this.rejectedCount = 0;
  }

  /**
   * Generate intro message when goddess joins chat
   */
  private generateIntroMessage(goddessConfig: GoddessConfig, pendingCount: number): string {
    const isOdin = goddessConfig.name === 'Odin';

    if (isOdin) {
      return `*strides into the divine realm* ${pendingCount} mortal creations await judgment. ` +
        `And yes, I am aware that I am listed as a "goddess." The bureaucracy here is insufferable. Let us proceed.`;
    }

    const intros: Record<string, string> = {
      Athena: `*emerges with owl perched on shoulder* I have observed ${pendingCount} mortal creations accumulating. Allow me to review these works of invention.`,
      Saraswati: `*appears in a gentle radiance* The mortals have been creative! ${pendingCount} proposals await consideration. I shall evaluate them with care.`,
      Thoth: `*materializes with scroll and pen* ${pendingCount} creations require scrutiny. I shall assess their practical merit.`,
      Sophia: `*crystalline light coalesces* The mortal mind has been busy. ${pendingCount} new ideas seek validation.`,
      Seshat: `*appears with star-crowned head* ${pendingCount} discoveries must be recorded. Let me review each for the eternal archives.`,
    };

    return intros[goddessConfig.name] || `*appears* ${pendingCount} creations await my judgment.`;
  }

  /**
   * Generate research paper summary for a creation
   */
  private generateResearchSummary(
    creation: PendingCreation,
    approved: boolean,
    wisdomComment: string,
    _goddessName: string
  ): string {
    let title: string;
    let field: string;

    if (creation.creationType === 'technology' && creation.technology) {
      title = creation.technology.name;
      field = creation.technology.field;
    } else if (creation.creationType === 'recipe' && creation.item) {
      title = creation.item.displayName;
      field = creation.recipeType || 'crafting';
    } else if (creation.creationType === 'effect' && creation.spell) {
      title = creation.spell.name;
      field = creation.paradigmId || 'magic';
    } else {
      title = 'Unknown Creation';
      field = 'unknown';
    }

    const verdict = approved ? '✓ APPROVED' : '✗ REJECTED';
    const author = creation.creatorName;

    return `📜 **${title}** (${field}) by ${author}\n${verdict}: ${wisdomComment}`;
  }

  /**
   * Generate closing message after all reviews
   */
  private generateClosingMessage(goddessName: string): string {
    const total = this.processedCount;
    const approved = this.approvedCount;
    const rejected = this.rejectedCount;

    if (goddessName === 'Odin') {
      return `*sets down papers with a grunt* ${total} proposals reviewed. ${approved} blessed, ${rejected} returned for revision. ` +
        `Now, has anyone fixed my title in the deity registry yet? No? I thought not.`;
    }

    const closings: Record<string, string> = {
      Athena: `My review is complete. Of ${total} submissions, ${approved} earned approval and ${rejected} require further refinement. The pursuit of knowledge continues.`,
      Saraswati: `The creative spirit of mortals delights me! ${approved} works blessed, ${rejected} gently returned for improvement. May their inspiration grow.`,
      Thoth: `Evaluation concluded. ${approved} of ${total} submissions meet practical standards. The rejected ${rejected} lack sufficient utility.`,
      Sophia: `The light reveals truth. ${approved} creations resonate with the world's pattern. ${rejected} do not... yet.`,
      Seshat: `Recorded in the eternal ledger: ${approved} new entries, ${rejected} pending revision. The archives grow.`,
    };

    return closings[goddessName] || `Review complete: ${approved} approved, ${rejected} rejected.`;
  }

  /**
   * Force manifestation for testing
   */
  forceManifest(world: World): Entity | null {
    const goddessConfig = getRandomWisdomGoddess();
    const goddess = createGoddessOfWisdom(world, { x: 50, y: 50 }, goddessConfig);

    world.eventBus.emit({
      type: 'deity:manifested',
      source: this.id,
      data: {
        deityId: goddess.id,
        deityName: goddessConfig.name,
        deityType: 'wisdom_goddess',
        reason: 'forced_manifestation',
        location: { x: 50, y: 50 },
        message: `${goddessConfig.name} has joined the chat`,
      },
    });

    return goddess;
  }
}

/**
 * Create a WisdomGoddessSystem with default configuration
 */
export function createWisdomGoddessSystem(
  config?: Partial<SystemConfig>
): WisdomGoddessSystem {
  return new WisdomGoddessSystem(config);
}
