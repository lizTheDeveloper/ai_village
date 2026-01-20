/**
 * CrossRealmPhoneSystem - Manages cross-realm phone calls and messages
 *
 * Handles:
 * - Call routing and state management
 * - Message delivery
 * - Phone charging
 * - Contact management
 * - Auto-answer and DND logic
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { CrossRealmPhoneComponent, VoicemailMessage } from '../components/CrossRealmPhoneComponent.js';
import type { HilbertTimeCoordinate } from '../trade/HilbertTime.js';
import {
  initiateCall,
  answerCall,
  endCall,
  sendMessage,
  receiveMessage,
  chargePhone,
  type CrossRealmCall,
  type CrossRealmMessage,
  type CrossRealmAddress,
} from '../communication/CrossRealmCommunication.js';
import { multiverseCoordinator } from '../multiverse/MultiverseCoordinator.js';

export interface CrossRealmPhoneSystemConfig {
  /** Charge rate for phones on charging stations (per tick) */
  chargingStationRate: number;

  /** Ambient charge rate (very slow, for advanced phones) */
  ambientChargeRate: number;

  /** Ring duration before call fails (ticks) */
  ringTimeout: number;

  /** Enable debug logging */
  debug: boolean;
}

export class CrossRealmPhoneSystem extends BaseSystem {
  public readonly id = 'cross_realm_phone_system';
  public readonly priority = 800; // Late priority, after most game logic
  public readonly requiredComponents = ['cross_realm_phone'] as const;
  // Only run when cross_realm_phone components exist (O(1) activation check)
  public readonly activationComponents = ['cross_realm_phone'] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  /** Phone registry: address.deviceId -> entity */
  private phoneDirectory = new Map<string, Entity>();

  /** Pending calls waiting to be routed */
  private pendingCalls: CrossRealmCall[] = [];

  /** Configuration */
  private config: CrossRealmPhoneSystemConfig;

  /** Universe ID for this system instance */
  private universeId: string = 'universe:main';

  /** Sigma counter for sync events (increments on cross-universe communication) */
  private sigmaCounter: number = 0;

  constructor(config: Partial<CrossRealmPhoneSystemConfig> = {}) {
    super();
    this.config = {
      chargingStationRate: 100,
      ambientChargeRate: 1,
      ringTimeout: 200, // 10 seconds at 20 TPS
      debug: false,
      ...config,
    };
  }

  /**
   * Set the universe ID for this phone system.
   * Used to get proper Hilbert time coordinates from MultiverseCoordinator.
   */
  setUniverseId(universeId: string): void {
    this.universeId = universeId;
  }

  protected onUpdate(ctx: SystemContext): void {
    // Early exit if no phones exist and no pending calls
    if (ctx.activeEntities.length === 0 && this.pendingCalls.length === 0) {
      return;
    }

    const currentTick = this.getCurrentTick(ctx.world);

    // Build phone directory from already-filtered active entities
    // (avoids redundant world.query() since requiredComponents matches)
    this.updatePhoneDirectory(ctx.activeEntities);

    // Process pending calls
    this.processPendingCalls(ctx.world, currentTick);

    // Update all phones
    for (const entity of ctx.activeEntities) {
      const phoneComp = entity.getComponent('cross_realm_phone') as unknown as CrossRealmPhoneComponent;

      // Handle charging
      this.updateCharging(phoneComp, currentTick);

      // Handle incoming call timeout
      this.checkIncomingCallTimeout(phoneComp, currentTick);

      // Handle active call
      this.updateActiveCall(phoneComp, entity, currentTick);

      // Auto-answer logic
      this.checkAutoAnswer(phoneComp);
    }
  }

  // ==========================================================================
  // Public API
  // ==========================================================================

  /**
   * Make a call from one entity to another
   */
  public makeCall(
    world: World,
    callerId: string,
    targetAddress: CrossRealmAddress,
    callType: CrossRealmCall['type']
  ): { success: boolean; reason?: string } {
    const caller = world.getEntity(callerId);
    if (!caller) {
      return { success: false, reason: 'Caller entity not found' };
    }

    const phoneComp = caller.getComponent('cross_realm_phone') as CrossRealmPhoneComponent | undefined;
    if (!phoneComp) {
      return { success: false, reason: 'Caller does not have a phone' };
    }

    const currentTime = this.getCurrentHilbertTime(world);
    const result = initiateCall(phoneComp.phone, targetAddress, callType, currentTime);

    if (result.success && result.call) {
      // Add to pending calls for routing
      this.pendingCalls.push(result.call);

      if (this.config.debug) {
      }
    }

    return { success: result.success, reason: result.reason };
  }

  /**
   * Send a message from one entity to another
   */
  public sendTextMessage(
    world: World,
    senderId: string,
    targetAddress: CrossRealmAddress,
    content: string,
    priority: CrossRealmMessage['priority'] = 'normal'
  ): { success: boolean; reason?: string; message?: CrossRealmMessage } {
    const sender = world.getEntity(senderId);
    if (!sender) {
      return { success: false, reason: 'Sender entity not found' };
    }

    const phoneComp = sender.getComponent('cross_realm_phone') as CrossRealmPhoneComponent | undefined;
    if (!phoneComp) {
      return { success: false, reason: 'Sender does not have a phone' };
    }

    const currentTime = this.getCurrentHilbertTime(world);
    const result = sendMessage(phoneComp.phone, targetAddress, content, priority, currentTime);

    if (result.success && result.message) {
      // Add to sent messages
      phoneComp.sentMessages.push(result.message);

      // Deliver to recipient
      this.deliverMessage(world, result.message, currentTime);

      if (this.config.debug) {
      }
    }

    return result;
  }

  /**
   * Answer an incoming call
   */
  public answerIncomingCall(world: World, entityId: string): { success: boolean; reason?: string } {
    const entity = world.getEntity(entityId);
    if (!entity) {
      return { success: false, reason: 'Entity not found' };
    }

    const phoneComp = entity.getComponent('cross_realm_phone') as CrossRealmPhoneComponent | undefined;
    if (!phoneComp || !phoneComp.incomingCall) {
      return { success: false, reason: 'No incoming call' };
    }

    const result = answerCall(phoneComp.phone, phoneComp.incomingCall);

    if (result.success) {
      phoneComp.activeCall = phoneComp.incomingCall;
      phoneComp.incomingCall = null;

      if (this.config.debug) {
      }
    }

    return result;
  }

  /**
   * End an active call
   */
  public hangUp(world: World, entityId: string): { success: boolean; totalCost?: number } {
    const entity = world.getEntity(entityId);
    if (!entity) {
      return { success: false };
    }

    const phoneComp = entity.getComponent('cross_realm_phone') as CrossRealmPhoneComponent | undefined;
    if (!phoneComp || !phoneComp.activeCall) {
      return { success: false };
    }

    const currentTime = this.getCurrentHilbertTime(world);
    const result = endCall(phoneComp.phone, phoneComp.activeCall, currentTime);

    if (result.success) {
      phoneComp.activeCall = null;

      if (this.config.debug) {
      }
    }

    return result;
  }

  /**
   * Mark messages as read
   */
  public markMessagesRead(world: World, entityId: string): void {
    const entity = world.getEntity(entityId);
    if (!entity) return;

    const phoneComp = entity.getComponent('cross_realm_phone') as CrossRealmPhoneComponent | undefined;
    if (!phoneComp) return;

    // Mark all delivered messages as read
    for (const msg of phoneComp.inbox) {
      if (msg.status === 'delivered') {
        msg.status = 'read';
      }
    }

    phoneComp.unreadCount = 0;
  }

  /**
   * Get all voicemails for an entity
   */
  public getVoicemails(world: World, entityId: string): VoicemailMessage[] {
    const entity = world.getEntity(entityId);
    if (!entity) return [];

    const phoneComp = entity.getComponent('cross_realm_phone') as CrossRealmPhoneComponent | undefined;
    if (!phoneComp) return [];

    return [...phoneComp.voicemails];
  }

  /**
   * Mark voicemails as listened
   */
  public markVoicemailsListened(world: World, entityId: string, voicemailIds?: string[]): void {
    const entity = world.getEntity(entityId);
    if (!entity) return;

    const phoneComp = entity.getComponent('cross_realm_phone') as CrossRealmPhoneComponent | undefined;
    if (!phoneComp) return;

    // Mark specific voicemails or all if no IDs provided
    for (const vm of phoneComp.voicemails) {
      if (!voicemailIds || voicemailIds.includes(vm.id)) {
        if (!vm.listened) {
          vm.listened = true;
          phoneComp.unlistenedVoicemailCount = Math.max(0, phoneComp.unlistenedVoicemailCount - 1);
        }
      }
    }
  }

  /**
   * Delete voicemails
   */
  public deleteVoicemails(world: World, entityId: string, voicemailIds: string[]): void {
    const entity = world.getEntity(entityId);
    if (!entity) return;

    const phoneComp = entity.getComponent('cross_realm_phone') as CrossRealmPhoneComponent | undefined;
    if (!phoneComp) return;

    // Remove voicemails by ID
    const idsToDelete = new Set(voicemailIds);
    for (let i = phoneComp.voicemails.length - 1; i >= 0; i--) {
      const vm = phoneComp.voicemails[i]!;
      if (idsToDelete.has(vm.id)) {
        // Update unlistened count if deleting unlistened voicemail
        if (!vm.listened) {
          phoneComp.unlistenedVoicemailCount = Math.max(0, phoneComp.unlistenedVoicemailCount - 1);
        }
        phoneComp.voicemails.splice(i, 1);
      }
    }
  }

  /**
   * Set or update voicemail greeting
   */
  public setVoicemailGreeting(world: World, entityId: string, greeting: string | null): { success: boolean; reason?: string } {
    const entity = world.getEntity(entityId);
    if (!entity) {
      return { success: false, reason: 'Entity not found' };
    }

    const phoneComp = entity.getComponent('cross_realm_phone') as CrossRealmPhoneComponent | undefined;
    if (!phoneComp) {
      return { success: false, reason: 'Entity does not have a phone' };
    }

    phoneComp.voicemail = greeting;
    return { success: true };
  }

  // ==========================================================================
  // Private Helpers
  // ==========================================================================

  private updatePhoneDirectory(entities: ReadonlyArray<Entity>): void {
    this.phoneDirectory.clear();

    for (const entity of entities) {
      const phoneComp = entity.getComponent('cross_realm_phone') as unknown as CrossRealmPhoneComponent;
      this.phoneDirectory.set(phoneComp.phone.address.deviceId, entity);
    }
  }

  private processPendingCalls(_world: World, _currentTick: bigint): void {
    for (let i = this.pendingCalls.length - 1; i >= 0; i--) {
      const call = this.pendingCalls[i]!;

      // Find recipient
      const recipient = this.phoneDirectory.get(call.to.deviceId);
      if (!recipient) {
        // Call failed - no such device (offline)
        call.status = 'failed';
        call.failureReason = 'Device not found';
        this.pendingCalls.splice(i, 1);
        continue;
      }

      const recipientPhoneComp = recipient.getComponent('cross_realm_phone') as unknown as CrossRealmPhoneComponent;

      // Check if recipient is busy
      if (recipientPhoneComp.activeCall || recipientPhoneComp.incomingCall) {
        call.status = 'failed';
        call.failureReason = 'Recipient busy';

        // Create voicemail if configured
        if (recipientPhoneComp.voicemail !== null) {
          this.createVoicemail(recipientPhoneComp, call, 'busy');
        }

        this.pendingCalls.splice(i, 1);
        continue;
      }

      // Check DND
      if (recipientPhoneComp.doNotDisturb) {
        call.status = 'rejected';
        call.failureReason = 'Do not disturb';

        // Create voicemail if configured
        if (recipientPhoneComp.voicemail !== null) {
          this.createVoicemail(recipientPhoneComp, call, 'dnd');
        }

        this.pendingCalls.splice(i, 1);
        continue;
      }

      // Route call to recipient
      recipientPhoneComp.incomingCall = call;
      this.pendingCalls.splice(i, 1);

      if (this.config.debug) {
      }
    }
  }

  private checkIncomingCallTimeout(phoneComp: CrossRealmPhoneComponent, currentTick: bigint): void {
    if (!phoneComp.incomingCall) return;

    const callAge = currentTick - phoneComp.incomingCall.startedAt.tau;
    if (callAge > this.config.ringTimeout) {
      // Call timed out
      phoneComp.incomingCall.status = 'failed';
      phoneComp.incomingCall.failureReason = 'No answer';

      // Save to voicemail if configured (voicemail greeting exists)
      if (phoneComp.voicemail !== null) {
        this.createVoicemail(phoneComp, phoneComp.incomingCall, 'no_answer');
      }

      phoneComp.incomingCall = null;

      if (this.config.debug) {
      }
    }
  }

  private updateActiveCall(phoneComp: CrossRealmPhoneComponent, _entity: Entity, _currentTick: bigint): void {
    if (!phoneComp.activeCall) return;

    // Deduct charge per tick
    const cost = phoneComp.activeCall.costPerTick;
    phoneComp.phone.charge -= cost;

    // If charge runs out, drop call
    if (phoneComp.phone.charge <= 0) {
      phoneComp.phone.charge = 0;
      phoneComp.activeCall.status = 'failed';
      phoneComp.activeCall.failureReason = 'Insufficient charge';
      phoneComp.activeCall = null;

      if (this.config.debug) {
      }
    }
  }

  private checkAutoAnswer(phoneComp: CrossRealmPhoneComponent): void {
    if (!phoneComp.autoAnswer || !phoneComp.incomingCall) return;

    // Check if caller is trusted contact
    const callerDeviceId = phoneComp.incomingCall.from.deviceId;
    const contact = phoneComp.phone.contacts.get(callerDeviceId);

    if (contact && contact.trustLevel === 'trusted') {
      answerCall(phoneComp.phone, phoneComp.incomingCall);
      phoneComp.activeCall = phoneComp.incomingCall;
      phoneComp.incomingCall = null;

      if (this.config.debug) {
      }
    }
  }

  private deliverMessage(_world: World, message: CrossRealmMessage, currentTime: HilbertTimeCoordinate): void {
    const recipient = this.phoneDirectory.get(message.to.deviceId);
    if (!recipient) {
      message.status = 'failed';
      message.failureReason = 'Device not found';
      return;
    }

    const recipientPhoneComp = recipient.getComponent('cross_realm_phone') as unknown as CrossRealmPhoneComponent;
    receiveMessage(recipientPhoneComp.phone, message, currentTime);

    recipientPhoneComp.inbox.push(message);
    recipientPhoneComp.unreadCount++;

    if (this.config.debug) {
    }
  }

  private updateCharging(phoneComp: CrossRealmPhoneComponent, currentTick: bigint): void {
    let chargeAmount = 0;

    if (phoneComp.isCharging) {
      // On charging station
      chargeAmount = this.config.chargingStationRate;
    } else if (phoneComp.phone.tier === 'advanced' || phoneComp.phone.tier === 'transcendent') {
      // Ambient charging for advanced phones
      chargeAmount = this.config.ambientChargeRate;
    }

    if (chargeAmount > 0) {
      const actualCharge = chargePhone(phoneComp.phone, chargeAmount);
      if (actualCharge > 0) {
        phoneComp.lastChargedTick = currentTick;
      }
    }
  }

  private getCurrentTick(world: World): bigint {
    const timeEntities = world.query().with('time').executeEntities();
    if (timeEntities.length === 0) return 0n;

    const timeComp = timeEntities[0]!.getComponent('time') as unknown as { currentTick: bigint };
    return timeComp.currentTick;
  }

  private getCurrentHilbertTime(world: World): HilbertTimeCoordinate {
    const currentTick = this.getCurrentTick(world);

    // Get universe from multiverse coordinator
    const universe = multiverseCoordinator.getUniverse(this.universeId);

    if (!universe) {
      // Fallback if universe not registered with coordinator
      return {
        tau: currentTick,
        beta: 'root',
        sigma: this.sigmaCounter,
        origin: this.universeId,
        causalParents: [],
      };
    }

    // Build beta branch path by walking up the parent chain
    const beta = this.getBranchPath(universe);

    return {
      tau: currentTick,
      beta,
      sigma: this.sigmaCounter,
      origin: universe.config.id,
      causalParents: [],
    };
  }

  /**
   * Build the beta branch path for a universe by walking up its parent chain.
   * Returns format like "root" or "root.fork1.fork2"
   */
  private getBranchPath(startUniverse: NonNullable<ReturnType<typeof multiverseCoordinator.getUniverse>>): string {
    const segments: string[] = [];
    let currentId: string | undefined = startUniverse.config.id;

    // Walk up parent chain to build path segments
    while (currentId) {
      const current = multiverseCoordinator.getUniverse(currentId);
      if (!current) {
        // Universe not found, assume we're at root
        segments.unshift('root');
        break;
      }

      const parentId = current.config.parentId;
      if (!parentId) {
        // Root universe
        segments.unshift('root');
        break;
      }

      // Add this fork's name segment
      segments.unshift(current.config.id);

      // Move to parent
      currentId = parentId;
    }

    return segments.join('.');
  }

  /**
   * Create a voicemail message for a missed call
   */
  private createVoicemail(
    recipientPhoneComp: CrossRealmPhoneComponent,
    call: CrossRealmCall,
    missedReason: VoicemailMessage['missedReason']
  ): void {
    // Generate auto-voicemail content based on call type and reason
    let content = '';
    const callerName = recipientPhoneComp.phone.contacts.get(call.from.deviceId)?.name || call.from.deviceId;

    switch (missedReason) {
      case 'no_answer':
        content = `Missed ${call.type} call from ${callerName}. They did not leave a message.`;
        break;
      case 'busy':
        content = `${callerName} called while you were on another call.`;
        break;
      case 'dnd':
        content = `${callerName} called while Do Not Disturb was active.`;
        break;
      case 'offline':
        content = `${callerName} called while your phone was offline.`;
        break;
    }

    const voicemail: VoicemailMessage = {
      id: `vm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      from: call.from,
      to: call.to,
      content,
      timestamp: call.startedAt,
      callId: call.id,
      callType: call.type,
      listened: false,
      missedReason,
    };

    recipientPhoneComp.voicemails.push(voicemail);
    recipientPhoneComp.unlistenedVoicemailCount++;

    if (this.config.debug) {
    }
  }
}

/**
 * Create cross-realm phone system with default config
 */
export function createCrossRealmPhoneSystem(
  config?: Partial<CrossRealmPhoneSystemConfig>
): CrossRealmPhoneSystem {
  return new CrossRealmPhoneSystem(config);
}
