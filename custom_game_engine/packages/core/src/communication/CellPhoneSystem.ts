/**
 * CellPhoneSystem - Personal mobile communication with evolution
 *
 * Cell phones evolve through generations:
 * - 1G: Analog voice only (1980s)
 * - 2G: Digital voice + SMS text (1990s)
 * - 3G: Mobile internet, basic apps (2000s)
 * - 4G: Fast internet, app stores, social media (2010s)
 * - 5G: Ultra-fast, IoT, AR/VR (2020s)
 *
 * Features evolve:
 * - Calls: Always available
 * - Texts: 2G+
 * - Camera: 2.5G+ (basic), 4G+ (high quality)
 * - Apps: 3G+
 * - Internet: 3G+ (slow), 4G+ (fast)
 * - GPS: 3G+
 *
 * Cultural impact:
 * - Changed how people coordinate and socialize
 * - Created new addictions (checking phone constantly)
 * - Social media integration (4G+)
 * - Became extension of identity
 */

import { World, Entity } from '../ecs/index.js';
import { EventBus } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';

// =============================================================================
// TYPES
// =============================================================================

export type CellPhoneGeneration = '1G' | '2G' | '3G' | '4G' | '5G';

export interface CellPhone {
  id: string;
  ownerId: string;
  ownerName: string;
  phoneNumber: string;

  // Hardware
  generation: CellPhoneGeneration;
  model: string;
  manufacturer: string;
  batteryLevel: number; // 0-100
  storageUsed: number; // MB
  storageTotal: number; // MB

  // State
  isOn: boolean;
  hasSignal: boolean;
  signalStrength: number; // 0-5 bars
  inCall: boolean;
  currentCallWith?: string; // phone number

  // Features (based on generation)
  hasSMS: boolean;
  hasCamera: boolean;
  hasInternet: boolean;
  hasApps: boolean;
  hasGPS: boolean;

  // Installed apps (3G+)
  installedApps: string[]; // app IDs

  // Usage stats
  totalCalls: number;
  totalTexts: number;
  totalDataUsed: number; // MB
  screenTimeToday: number; // minutes

  // Social
  contacts: PhoneContact[];
  callHistory: CallRecord[];
  textHistory: TextConversation[];
}

export interface PhoneContact {
  name: string;
  phoneNumber: string;
  agentId?: string;
  relationship: 'family' | 'friend' | 'work' | 'acquaintance' | 'other';
  favorited: boolean;
  photoId?: string;
}

export interface CallRecord {
  id: string;
  otherNumber: string;
  otherName: string;
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number;
  duration: number; // seconds
  wasAnswered: boolean;
}

export interface TextMessage {
  id: string;
  fromNumber: string;
  toNumber: string;
  content: string;
  timestamp: number;
  isRead: boolean;
  hasMedia: boolean;
  mediaType?: 'image' | 'video' | 'audio';
}

export interface TextConversation {
  otherNumber: string;
  otherName: string;
  messages: TextMessage[];
  lastMessageAt: number;
  unreadCount: number;
}

export interface CellTower {
  id: string;
  x: number;
  y: number;
  generation: CellPhoneGeneration;
  range: number;
  capacity: number; // max simultaneous connections
  currentConnections: number;
  operatorId: string;
}

export interface PhoneCall {
  id: string;
  callerNumber: string;
  callerId: string;
  callerName: string;
  receiverNumber: string;
  receiverId: string;
  receiverName: string;
  startedAt: number;
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'rejected';
  duration: number;
}

// =============================================================================
// GENERATION SPECS
// =============================================================================

const GENERATION_SPECS: Record<
  CellPhoneGeneration,
  {
    hasSMS: boolean;
    hasCamera: boolean;
    hasInternet: boolean;
    hasApps: boolean;
    hasGPS: boolean;
    dataSpeed: number; // Kbps
    batteryLife: number; // hours
    storageBase: number; // MB
    typicalCost: number;
    yearIntroduced: number;
  }
> = {
  '1G': {
    hasSMS: false,
    hasCamera: false,
    hasInternet: false,
    hasApps: false,
    hasGPS: false,
    dataSpeed: 0,
    batteryLife: 2,
    storageBase: 0,
    typicalCost: 3000,
    yearIntroduced: 1983,
  },
  '2G': {
    hasSMS: true,
    hasCamera: false,
    hasInternet: false,
    hasApps: false,
    hasGPS: false,
    dataSpeed: 14,
    batteryLife: 8,
    storageBase: 4,
    typicalCost: 400,
    yearIntroduced: 1991,
  },
  '3G': {
    hasSMS: true,
    hasCamera: true,
    hasInternet: true,
    hasApps: true,
    hasGPS: true,
    dataSpeed: 2000,
    batteryLife: 6,
    storageBase: 512,
    typicalCost: 300,
    yearIntroduced: 2001,
  },
  '4G': {
    hasSMS: true,
    hasCamera: true,
    hasInternet: true,
    hasApps: true,
    hasGPS: true,
    dataSpeed: 100000,
    batteryLife: 12,
    storageBase: 64000,
    typicalCost: 800,
    yearIntroduced: 2009,
  },
  '5G': {
    hasSMS: true,
    hasCamera: true,
    hasInternet: true,
    hasApps: true,
    hasGPS: true,
    dataSpeed: 1000000,
    batteryLife: 10,
    storageBase: 256000,
    typicalCost: 1200,
    yearIntroduced: 2019,
  },
};

// =============================================================================
// PHONE NUMBER GENERATOR
// =============================================================================

let phoneNumberCounter = 1000000;

function generatePhoneNumber(): string {
  phoneNumberCounter++;
  const areaCode = 555; // Classic fake area code
  const exchange = Math.floor(phoneNumberCounter / 10000) % 1000;
  const subscriber = phoneNumberCounter % 10000;
  return `${areaCode}-${exchange.toString().padStart(3, '0')}-${subscriber.toString().padStart(4, '0')}`;
}

// =============================================================================
// CELL PHONE MANAGER
// =============================================================================

export class CellPhoneManager {
  private phones: Map<string, CellPhone> = new Map();
  private phonesByNumber: Map<string, CellPhone> = new Map();
  private towers: Map<string, CellTower> = new Map();
  private activeCalls: Map<string, PhoneCall> = new Map();

  // Technology level (affects what's available)
  private currentGeneration: CellPhoneGeneration = '2G';

  // ---------------------------------------------------------------------------
  // Phone Management
  // ---------------------------------------------------------------------------

  createPhone(
    ownerId: string,
    ownerName: string,
    generation?: CellPhoneGeneration,
    model?: string,
    manufacturer?: string
  ): CellPhone {
    const gen = generation || this.currentGeneration;
    const specs = GENERATION_SPECS[gen];

    const phone: CellPhone = {
      id: `phone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ownerId,
      ownerName,
      phoneNumber: generatePhoneNumber(),
      generation: gen,
      model: model || `Model ${gen}`,
      manufacturer: manufacturer || 'Generic',
      batteryLevel: 100,
      storageUsed: 0,
      storageTotal: specs.storageBase,
      isOn: true,
      hasSignal: false,
      signalStrength: 0,
      inCall: false,
      hasSMS: specs.hasSMS,
      hasCamera: specs.hasCamera,
      hasInternet: specs.hasInternet,
      hasApps: specs.hasApps,
      hasGPS: specs.hasGPS,
      installedApps: [],
      totalCalls: 0,
      totalTexts: 0,
      totalDataUsed: 0,
      screenTimeToday: 0,
      contacts: [],
      callHistory: [],
      textHistory: [],
    };

    this.phones.set(phone.id, phone);
    this.phonesByNumber.set(phone.phoneNumber, phone);

    return phone;
  }

  getPhone(phoneId: string): CellPhone | undefined {
    return this.phones.get(phoneId);
  }

  getPhoneByNumber(phoneNumber: string): CellPhone | undefined {
    return this.phonesByNumber.get(phoneNumber);
  }

  getPhoneByOwner(ownerId: string): CellPhone | undefined {
    for (const phone of this.phones.values()) {
      if (phone.ownerId === ownerId) {
        return phone;
      }
    }
    return undefined;
  }

  // ---------------------------------------------------------------------------
  // Power & Signal
  // ---------------------------------------------------------------------------

  turnOn(phoneId: string): boolean {
    const phone = this.phones.get(phoneId);
    if (!phone || phone.batteryLevel <= 0) return false;
    phone.isOn = true;
    return true;
  }

  turnOff(phoneId: string): boolean {
    const phone = this.phones.get(phoneId);
    if (!phone) return false;
    phone.isOn = false;
    phone.hasSignal = false;
    phone.signalStrength = 0;
    return true;
  }

  updateSignal(phoneId: string, x: number, y: number): void {
    const phone = this.phones.get(phoneId);
    if (!phone || !phone.isOn) return;

    let bestSignal = 0;
    let hasSignal = false;

    for (const tower of this.towers.values()) {
      // Check generation compatibility
      const phoneGenIndex = ['1G', '2G', '3G', '4G', '5G'].indexOf(
        phone.generation
      );
      const towerGenIndex = ['1G', '2G', '3G', '4G', '5G'].indexOf(
        tower.generation
      );

      // Phone can connect to its generation or lower
      if (towerGenIndex > phoneGenIndex) continue;

      // Check range
      const dx = x - tower.x;
      const dy = y - tower.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= tower.range) {
        hasSignal = true;
        // Signal strength based on distance (5 bars max)
        const signalRatio = 1 - dist / tower.range;
        const bars = Math.ceil(signalRatio * 5);
        if (bars > bestSignal) {
          bestSignal = bars;
        }
      }
    }

    phone.hasSignal = hasSignal;
    phone.signalStrength = bestSignal;
  }

  // ---------------------------------------------------------------------------
  // Calls
  // ---------------------------------------------------------------------------

  makeCall(
    callerPhoneId: string,
    receiverNumber: string,
    currentTick: number
  ): PhoneCall | null {
    const callerPhone = this.phones.get(callerPhoneId);
    if (!callerPhone || !callerPhone.isOn || !callerPhone.hasSignal) return null;
    if (callerPhone.inCall) return null;

    const receiverPhone = this.phonesByNumber.get(receiverNumber);
    if (!receiverPhone) return null; // Number doesn't exist

    const call: PhoneCall = {
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      callerNumber: callerPhone.phoneNumber,
      callerId: callerPhone.ownerId,
      callerName: callerPhone.ownerName,
      receiverNumber,
      receiverId: receiverPhone.ownerId,
      receiverName: receiverPhone.ownerName,
      startedAt: currentTick,
      status: 'ringing',
      duration: 0,
    };

    this.activeCalls.set(call.id, call);
    callerPhone.inCall = true;
    callerPhone.currentCallWith = receiverNumber;

    return call;
  }

  answerCall(callId: string): boolean {
    const call = this.activeCalls.get(callId);
    if (!call || call.status !== 'ringing') return false;

    const receiverPhone = this.phonesByNumber.get(call.receiverNumber);
    if (!receiverPhone || !receiverPhone.isOn || receiverPhone.inCall)
      return false;

    call.status = 'active';
    receiverPhone.inCall = true;
    receiverPhone.currentCallWith = call.callerNumber;

    return true;
  }

  rejectCall(callId: string): boolean {
    const call = this.activeCalls.get(callId);
    if (!call || call.status !== 'ringing') return false;

    call.status = 'rejected';
    this.endCallInternal(call);
    return true;
  }

  endCall(callId: string, currentTick: number): boolean {
    const call = this.activeCalls.get(callId);
    if (!call) return false;

    if (call.status === 'active') {
      call.duration = currentTick - call.startedAt;
    }

    call.status = 'ended';
    this.endCallInternal(call);
    return true;
  }

  private endCallInternal(call: PhoneCall): void {
    const callerPhone = this.phonesByNumber.get(call.callerNumber);
    const receiverPhone = this.phonesByNumber.get(call.receiverNumber);

    if (callerPhone) {
      callerPhone.inCall = false;
      callerPhone.currentCallWith = undefined;
      callerPhone.totalCalls++;

      // Add to call history
      callerPhone.callHistory.push({
        id: call.id,
        otherNumber: call.receiverNumber,
        otherName: call.receiverName,
        type: 'outgoing',
        timestamp: call.startedAt,
        duration: call.duration,
        wasAnswered: call.status === 'ended',
      });
    }

    if (receiverPhone) {
      receiverPhone.inCall = false;
      receiverPhone.currentCallWith = undefined;

      const type =
        call.status === 'ended'
          ? 'incoming'
          : call.status === 'missed'
            ? 'missed'
            : 'incoming';

      receiverPhone.callHistory.push({
        id: call.id,
        otherNumber: call.callerNumber,
        otherName: call.callerName,
        type,
        timestamp: call.startedAt,
        duration: call.duration,
        wasAnswered: call.status === 'ended',
      });
    }

    this.activeCalls.delete(call.id);
  }

  // ---------------------------------------------------------------------------
  // Texting
  // ---------------------------------------------------------------------------

  sendText(
    senderPhoneId: string,
    receiverNumber: string,
    content: string,
    currentTick: number,
    hasMedia: boolean = false,
    mediaType?: 'image' | 'video' | 'audio'
  ): TextMessage | null {
    const senderPhone = this.phones.get(senderPhoneId);
    if (!senderPhone || !senderPhone.isOn || !senderPhone.hasSMS) return null;

    const receiverPhone = this.phonesByNumber.get(receiverNumber);
    // Unlike calls, texts can be sent even if receiver is off (queued)

    const message: TextMessage = {
      id: `text_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromNumber: senderPhone.phoneNumber,
      toNumber: receiverNumber,
      content,
      timestamp: currentTick,
      isRead: false,
      hasMedia,
      mediaType,
    };

    // Update sender's conversation
    this.addMessageToConversation(senderPhone, receiverNumber, message, true);
    senderPhone.totalTexts++;

    // Update receiver's conversation if they exist
    if (receiverPhone && receiverPhone.hasSMS) {
      this.addMessageToConversation(
        receiverPhone,
        senderPhone.phoneNumber,
        message,
        false
      );
    }

    return message;
  }

  private addMessageToConversation(
    phone: CellPhone,
    otherNumber: string,
    message: TextMessage,
    isSender: boolean
  ): void {
    let conversation = phone.textHistory.find(
      (c) => c.otherNumber === otherNumber
    );

    if (!conversation) {
      const otherPhone = this.phonesByNumber.get(otherNumber);
      conversation = {
        otherNumber,
        otherName: otherPhone?.ownerName || 'Unknown',
        messages: [],
        lastMessageAt: message.timestamp,
        unreadCount: 0,
      };
      phone.textHistory.push(conversation);
    }

    conversation.messages.push(message);
    conversation.lastMessageAt = message.timestamp;

    if (!isSender) {
      conversation.unreadCount++;
    }
  }

  markConversationRead(phoneId: string, otherNumber: string): void {
    const phone = this.phones.get(phoneId);
    if (!phone) return;

    const conversation = phone.textHistory.find(
      (c) => c.otherNumber === otherNumber
    );
    if (conversation) {
      conversation.unreadCount = 0;
      for (const msg of conversation.messages) {
        if (msg.toNumber === phone.phoneNumber) {
          msg.isRead = true;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Contacts
  // ---------------------------------------------------------------------------

  addContact(
    phoneId: string,
    contact: Omit<PhoneContact, 'favorited'>
  ): boolean {
    const phone = this.phones.get(phoneId);
    if (!phone) return false;

    // Check for duplicate
    if (phone.contacts.some((c) => c.phoneNumber === contact.phoneNumber)) {
      return false;
    }

    phone.contacts.push({ ...contact, favorited: false });
    return true;
  }

  removeContact(phoneId: string, phoneNumber: string): boolean {
    const phone = this.phones.get(phoneId);
    if (!phone) return false;

    const index = phone.contacts.findIndex((c) => c.phoneNumber === phoneNumber);
    if (index >= 0) {
      phone.contacts.splice(index, 1);
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Apps (3G+)
  // ---------------------------------------------------------------------------

  installApp(phoneId: string, appId: string, appSize: number): boolean {
    const phone = this.phones.get(phoneId);
    if (!phone || !phone.hasApps) return false;

    // Check storage
    if (phone.storageUsed + appSize > phone.storageTotal) return false;

    // Check if already installed
    if (phone.installedApps.includes(appId)) return false;

    phone.installedApps.push(appId);
    phone.storageUsed += appSize;
    return true;
  }

  uninstallApp(phoneId: string, appId: string, appSize: number): boolean {
    const phone = this.phones.get(phoneId);
    if (!phone) return false;

    const index = phone.installedApps.indexOf(appId);
    if (index < 0) return false;

    phone.installedApps.splice(index, 1);
    phone.storageUsed = Math.max(0, phone.storageUsed - appSize);
    return true;
  }

  // ---------------------------------------------------------------------------
  // Cell Towers
  // ---------------------------------------------------------------------------

  buildTower(
    x: number,
    y: number,
    generation: CellPhoneGeneration,
    operatorId: string
  ): CellTower {
    const rangeByGen: Record<CellPhoneGeneration, number> = {
      '1G': 50,
      '2G': 40,
      '3G': 30,
      '4G': 25,
      '5G': 15, // 5G requires more towers (shorter range)
    };

    const tower: CellTower = {
      id: `tower_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x,
      y,
      generation,
      range: rangeByGen[generation],
      capacity: 100,
      currentConnections: 0,
      operatorId,
    };

    this.towers.set(tower.id, tower);
    return tower;
  }

  getTower(towerId: string): CellTower | undefined {
    return this.towers.get(towerId);
  }

  getAllTowers(): CellTower[] {
    return Array.from(this.towers.values());
  }

  // ---------------------------------------------------------------------------
  // Technology Evolution
  // ---------------------------------------------------------------------------

  setCurrentGeneration(gen: CellPhoneGeneration): void {
    this.currentGeneration = gen;
  }

  getCurrentGeneration(): CellPhoneGeneration {
    return this.currentGeneration;
  }

  upgradePhone(phoneId: string, newGeneration: CellPhoneGeneration): boolean {
    const phone = this.phones.get(phoneId);
    if (!phone) return false;

    const oldGenIndex = ['1G', '2G', '3G', '4G', '5G'].indexOf(phone.generation);
    const newGenIndex = ['1G', '2G', '3G', '4G', '5G'].indexOf(newGeneration);

    if (newGenIndex <= oldGenIndex) return false; // Can only upgrade

    const specs = GENERATION_SPECS[newGeneration];

    phone.generation = newGeneration;
    phone.hasSMS = specs.hasSMS;
    phone.hasCamera = specs.hasCamera;
    phone.hasInternet = specs.hasInternet;
    phone.hasApps = specs.hasApps;
    phone.hasGPS = specs.hasGPS;
    phone.storageTotal = specs.storageBase;

    return true;
  }

  // ---------------------------------------------------------------------------
  // Battery
  // ---------------------------------------------------------------------------

  drainBattery(phoneId: string, amount: number): void {
    const phone = this.phones.get(phoneId);
    if (!phone) return;

    phone.batteryLevel = Math.max(0, phone.batteryLevel - amount);

    if (phone.batteryLevel <= 0 && phone.isOn) {
      this.turnOff(phoneId);
    }
  }

  chargeBattery(phoneId: string, amount: number): void {
    const phone = this.phones.get(phoneId);
    if (!phone) return;

    phone.batteryLevel = Math.min(100, phone.batteryLevel + amount);
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  getPhoneStats(phoneId: string): {
    owner: string;
    number: string;
    generation: CellPhoneGeneration;
    battery: number;
    signal: number;
    totalCalls: number;
    totalTexts: number;
    contactCount: number;
    appCount: number;
  } | null {
    const phone = this.phones.get(phoneId);
    if (!phone) return null;

    return {
      owner: phone.ownerName,
      number: phone.phoneNumber,
      generation: phone.generation,
      battery: phone.batteryLevel,
      signal: phone.signalStrength,
      totalCalls: phone.totalCalls,
      totalTexts: phone.totalTexts,
      contactCount: phone.contacts.length,
      appCount: phone.installedApps.length,
    };
  }

  getNetworkStats(): {
    totalPhones: number;
    totalTowers: number;
    activeCalls: number;
    generationBreakdown: Record<CellPhoneGeneration, number>;
  } {
    const breakdown: Record<CellPhoneGeneration, number> = {
      '1G': 0,
      '2G': 0,
      '3G': 0,
      '4G': 0,
      '5G': 0,
    };

    for (const phone of this.phones.values()) {
      breakdown[phone.generation]++;
    }

    return {
      totalPhones: this.phones.size,
      totalTowers: this.towers.size,
      activeCalls: this.activeCalls.size,
      generationBreakdown: breakdown,
    };
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  reset(): void {
    this.phones.clear();
    this.phonesByNumber.clear();
    this.towers.clear();
    this.activeCalls.clear();
    this.currentGeneration = '2G';
    phoneNumberCounter = 1000000;
  }
}

// =============================================================================
// CELL PHONE SYSTEM
// =============================================================================

export class CellPhoneSystem extends BaseSystem {
  readonly id = 'CellPhoneSystem';
  readonly priority = 67;
  readonly requiredComponents = [] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  private manager: CellPhoneManager = new CellPhoneManager();
  private lastCallTimeoutCheck = 0;
  private lastSignalUpdate = 0;

  private readonly UPDATE_INTERVAL = 20; // Every second
  private readonly SIGNAL_UPDATE_INTERVAL = 100; // Every 5 seconds

  protected onUpdate(ctx: SystemContext): void {
    // Process timeouts on active calls
    if (ctx.tick - this.lastCallTimeoutCheck >= this.UPDATE_INTERVAL) {
      this.processCallTimeouts(ctx);
      this.lastCallTimeoutCheck = ctx.tick;
    }

    // Update signal strength less frequently
    if (ctx.tick - this.lastSignalUpdate >= this.SIGNAL_UPDATE_INTERVAL) {
      this.updateAllSignals(ctx);
      this.lastSignalUpdate = ctx.tick;
    }
  }

  private processCallTimeouts(ctx: SystemContext): void {
    // Missed call after 60 ticks (3 seconds) of ringing
    for (const call of Array.from(this.manager['activeCalls'].values())) {
      if (call.status === 'ringing') {
        if (ctx.tick - call.startedAt > 60) {
          call.status = 'missed';
          this.manager['endCallInternal'](call);
        }
      }
    }
  }

  private updateAllSignals(ctx: SystemContext): void {
    const agents = ctx.world.query().with(CT.Agent, CT.Position).executeEntities();

    for (const agent of agents) {
      const posComp = agent.getComponent(CT.Position) as { x: number; y: number } | undefined;
      if (!posComp) continue;

      const phone = this.manager.getPhoneByOwner(agent.id);
      if (phone && phone.isOn) {
        this.manager.updateSignal(phone.id, posComp.x, posComp.y);

        // Drain battery slowly when on
        this.manager.drainBattery(phone.id, 0.005);

        // More drain if in call
        if (phone.inCall) {
          this.manager.drainBattery(phone.id, 0.01);
        }
      }
    }
  }

  protected onCleanup(): void {
    this.manager.reset();
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  getManager(): CellPhoneManager {
    return this.manager;
  }

  /**
   * Give an agent a cell phone
   */
  issuePhone(
    agentId: string,
    agentName: string,
    generation?: CellPhoneGeneration
  ): CellPhone {
    const phone = this.manager.createPhone(agentId, agentName, generation);

    this.events.emit('cell_phone_issued' as any, {
      phoneId: phone.id,
      phoneNumber: phone.phoneNumber,
      agentId,
      generation: phone.generation,
    } as any);

    return phone;
  }

  /**
   * Agent makes a call
   */
  call(
    callerId: string,
    receiverNumber: string,
    currentTick: number
  ): PhoneCall | null {
    const phone = this.manager.getPhoneByOwner(callerId);
    if (!phone) return null;

    const call = this.manager.makeCall(phone.id, receiverNumber, currentTick);

    if (call) {
      this.events.emit('cell_phone_call_started' as any, {
        callId: call.id,
        caller: callerId,
        receiver: call.receiverId,
      } as any);
    }

    return call;
  }

  /**
   * Agent sends a text message
   */
  text(
    senderId: string,
    receiverNumber: string,
    content: string,
    currentTick: number
  ): TextMessage | null {
    const phone = this.manager.getPhoneByOwner(senderId);
    if (!phone) return null;

    const message = this.manager.sendText(
      phone.id,
      receiverNumber,
      content,
      currentTick
    );

    if (message) {
      this.events.emit('cell_phone_text_sent' as any, {
        messageId: message.id,
        sender: senderId,
        receiverNumber,
        hasMedia: message.hasMedia,
      } as any);
    }

    return message;
  }

  /**
   * Advance network technology
   */
  advanceTechnology(newGeneration: CellPhoneGeneration): void {
    this.manager.setCurrentGeneration(newGeneration);

    this.events.emit('cell_network_upgraded' as any, {
      generation: newGeneration,
    } as any);
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let systemInstance: CellPhoneSystem | null = null;

export function getCellPhoneSystem(): CellPhoneSystem {
  if (!systemInstance) {
    systemInstance = new CellPhoneSystem();
  }
  return systemInstance;
}

export function resetCellPhoneSystem(): void {
  if (systemInstance) {
    systemInstance.cleanup();
    systemInstance = null;
  }
}
