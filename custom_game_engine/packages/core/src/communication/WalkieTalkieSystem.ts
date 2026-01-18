/**
 * WalkieTalkieSystem - Short-range group radio communication
 *
 * Walkie talkies enable instant voice communication within range:
 * - Channel-based (multiple channels, anyone on same channel hears)
 * - Push-to-talk (one person talks at a time)
 * - Limited range (depends on power/terrain)
 * - Battery powered
 * - Common uses: security, construction, hunting, emergencies
 *
 * Key differences from other communication:
 * - Radio: One-to-many broadcast, requires station
 * - Phone: One-to-one, requires infrastructure
 * - Walkie Talkie: Many-to-many within range, no infrastructure
 */

import { World, Entity } from '../ecs/index.js';
import { EventBus } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { PositionComponent } from '../components/PositionComponent.js';

// =============================================================================
// TYPES
// =============================================================================

export interface WalkieTalkieDevice {
  id: string;
  ownerId: string;
  ownerName: string;

  // Hardware
  model: WalkieTalkieModel;
  batteryLevel: number; // 0-100
  maxRange: number; // tiles
  powerLevel: 'low' | 'medium' | 'high';

  // State
  currentChannel: number; // 1-22 typical
  isOn: boolean;
  isTransmitting: boolean;

  // Position (updated each tick)
  x: number;
  y: number;

  // Usage stats
  totalTransmissions: number;
  totalListenTime: number;
}

export type WalkieTalkieModel =
  | 'basic' // Short range, few channels
  | 'consumer' // Medium range, standard
  | 'professional' // Long range, many channels, encryption
  | 'military' // Extreme range, secure, rugged
  | 'emergency'; // Weather channels, emergency alerts

export interface WalkieTalkieChannel {
  number: number;
  name: string;
  isPrivate: boolean;
  encryptionKey?: string;
  activeDevices: Set<string>; // device IDs currently on this channel
  lastTransmission?: WalkieTalkieTransmission;
}

export interface WalkieTalkieTransmission {
  id: string;
  channel: number;
  senderId: string;
  senderName: string;
  senderDeviceId: string;
  message: string;
  timestamp: number;
  x: number;
  y: number;

  // Who actually received it (in range)
  receivedBy: string[]; // agent IDs
}

export interface WalkieTalkieGroup {
  id: string;
  name: string;
  channel: number;
  purpose: WalkieTalkieGroupPurpose;
  leaderId: string;
  memberIds: string[];
  createdAt: number;
}

export type WalkieTalkieGroupPurpose =
  | 'security' // Guards, patrols
  | 'construction' // Work crews
  | 'hunting' // Hunting parties
  | 'emergency' // Rescue teams
  | 'recreation' // Friends, family outings
  | 'business'; // Work coordination

// =============================================================================
// MODEL SPECS
// =============================================================================

const MODEL_SPECS: Record<
  WalkieTalkieModel,
  {
    maxRange: number;
    channels: number;
    batteryLife: number; // hours
    hasEncryption: boolean;
    hasWeatherChannels: boolean;
    cost: number;
  }
> = {
  basic: {
    maxRange: 15,
    channels: 8,
    batteryLife: 12,
    hasEncryption: false,
    hasWeatherChannels: false,
    cost: 20,
  },
  consumer: {
    maxRange: 30,
    channels: 22,
    batteryLife: 24,
    hasEncryption: false,
    hasWeatherChannels: true,
    cost: 50,
  },
  professional: {
    maxRange: 50,
    channels: 50,
    batteryLife: 36,
    hasEncryption: true,
    hasWeatherChannels: true,
    cost: 200,
  },
  military: {
    maxRange: 100,
    channels: 99,
    batteryLife: 48,
    hasEncryption: true,
    hasWeatherChannels: true,
    cost: 1000,
  },
  emergency: {
    maxRange: 40,
    channels: 22,
    batteryLife: 72, // Long battery for emergencies
    hasEncryption: false,
    hasWeatherChannels: true,
    cost: 75,
  },
};

// =============================================================================
// WALKIE TALKIE MANAGER
// =============================================================================

export class WalkieTalkieManager {
  private devices: Map<string, WalkieTalkieDevice> = new Map();
  private channels: Map<number, WalkieTalkieChannel> = new Map();
  private groups: Map<string, WalkieTalkieGroup> = new Map();
  private transmissionHistory: WalkieTalkieTransmission[] = [];

  constructor() {
    // Initialize standard channels
    this.initializeChannels();
  }

  private initializeChannels(): void {
    // Standard FRS/GMRS channels
    const channelNames: Record<number, string> = {
      1: 'General',
      2: 'Family',
      3: 'Work',
      4: 'Hunting',
      5: 'Construction',
      9: 'Emergency',
      14: 'Security',
      22: 'Open',
    };

    for (let i = 1; i <= 22; i++) {
      this.channels.set(i, {
        number: i,
        name: channelNames[i] || `Channel ${i}`,
        isPrivate: false,
        activeDevices: new Set(),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Device Management
  // ---------------------------------------------------------------------------

  createDevice(
    ownerId: string,
    ownerName: string,
    model: WalkieTalkieModel,
    x: number,
    y: number
  ): WalkieTalkieDevice {
    const specs = MODEL_SPECS[model];

    const device: WalkieTalkieDevice = {
      id: `walkie_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ownerId,
      ownerName,
      model,
      batteryLevel: 100,
      maxRange: specs.maxRange,
      powerLevel: 'medium',
      currentChannel: 1,
      isOn: false,
      isTransmitting: false,
      x,
      y,
      totalTransmissions: 0,
      totalListenTime: 0,
    };

    this.devices.set(device.id, device);
    return device;
  }

  getDevice(deviceId: string): WalkieTalkieDevice | undefined {
    return this.devices.get(deviceId);
  }

  getDeviceByOwner(ownerId: string): WalkieTalkieDevice | undefined {
    for (const device of this.devices.values()) {
      if (device.ownerId === ownerId) {
        return device;
      }
    }
    return undefined;
  }

  turnOn(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device || device.batteryLevel <= 0) return false;

    device.isOn = true;

    // Join current channel
    const channel = this.channels.get(device.currentChannel);
    if (channel) {
      channel.activeDevices.add(deviceId);
    }

    return true;
  }

  turnOff(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) return false;

    device.isOn = false;
    device.isTransmitting = false;

    // Leave current channel
    const channel = this.channels.get(device.currentChannel);
    if (channel) {
      channel.activeDevices.delete(deviceId);
    }

    return true;
  }

  changeChannel(deviceId: string, newChannel: number): boolean {
    const device = this.devices.get(deviceId);
    if (!device || !device.isOn) return false;

    // Validate channel
    if (newChannel < 1 || newChannel > 99) return false;

    // Leave old channel
    const oldChannel = this.channels.get(device.currentChannel);
    if (oldChannel) {
      oldChannel.activeDevices.delete(deviceId);
    }

    // Join new channel (create if needed for professional/military)
    let channel = this.channels.get(newChannel);
    if (!channel) {
      channel = {
        number: newChannel,
        name: `Channel ${newChannel}`,
        isPrivate: false,
        activeDevices: new Set(),
      };
      this.channels.set(newChannel, channel);
    }

    device.currentChannel = newChannel;
    channel.activeDevices.add(deviceId);

    return true;
  }

  updatePosition(deviceId: string, x: number, y: number): void {
    const device = this.devices.get(deviceId);
    if (device) {
      device.x = x;
      device.y = y;
    }
  }

  // ---------------------------------------------------------------------------
  // Transmission
  // ---------------------------------------------------------------------------

  transmit(
    deviceId: string,
    message: string,
    currentTick: number
  ): WalkieTalkieTransmission | null {
    const device = this.devices.get(deviceId);
    if (!device || !device.isOn || device.batteryLevel <= 0) return null;

    const channel = this.channels.get(device.currentChannel);
    if (!channel) return null;

    // Start transmitting
    device.isTransmitting = true;

    // Find all devices in range on same channel
    const receivedBy: string[] = [];
    const rangeSquared = device.maxRange * device.maxRange;

    for (const otherDeviceId of channel.activeDevices) {
      if (otherDeviceId === deviceId) continue;

      const otherDevice = this.devices.get(otherDeviceId);
      if (!otherDevice || !otherDevice.isOn) continue;

      // Check range
      const dx = otherDevice.x - device.x;
      const dy = otherDevice.y - device.y;
      const distSquared = dx * dx + dy * dy;

      if (distSquared <= rangeSquared) {
        receivedBy.push(otherDevice.ownerId);
      }
    }

    const transmission: WalkieTalkieTransmission = {
      id: `trans_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channel: device.currentChannel,
      senderId: device.ownerId,
      senderName: device.ownerName,
      senderDeviceId: deviceId,
      message,
      timestamp: currentTick,
      x: device.x,
      y: device.y,
      receivedBy,
    };

    // Update stats
    device.totalTransmissions++;
    device.batteryLevel = Math.max(0, device.batteryLevel - 0.1);

    // Store transmission
    this.transmissionHistory.push(transmission);
    channel.lastTransmission = transmission;

    // Clean old history (keep last 1000)
    if (this.transmissionHistory.length > 1000) {
      this.transmissionHistory = this.transmissionHistory.slice(-500);
    }

    // End transmission
    device.isTransmitting = false;

    return transmission;
  }

  // ---------------------------------------------------------------------------
  // Group Management
  // ---------------------------------------------------------------------------

  createGroup(
    name: string,
    channel: number,
    purpose: WalkieTalkieGroupPurpose,
    leaderId: string
  ): WalkieTalkieGroup {
    const group: WalkieTalkieGroup = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      channel,
      purpose,
      leaderId,
      memberIds: [leaderId],
      createdAt: Date.now(),
    };

    this.groups.set(group.id, group);

    // Set leader's device to group channel
    const leaderDevice = this.getDeviceByOwner(leaderId);
    if (leaderDevice && leaderDevice.isOn) {
      this.changeChannel(leaderDevice.id, channel);
    }

    return group;
  }

  joinGroup(groupId: string, agentId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    if (!group.memberIds.includes(agentId)) {
      group.memberIds.push(agentId);
    }

    // Set member's device to group channel
    const device = this.getDeviceByOwner(agentId);
    if (device && device.isOn) {
      this.changeChannel(device.id, group.channel);
    }

    return true;
  }

  leaveGroup(groupId: string, agentId: string): boolean {
    const group = this.groups.get(groupId);
    if (!group) return false;

    const index = group.memberIds.indexOf(agentId);
    if (index >= 0) {
      group.memberIds.splice(index, 1);
    }

    // If leader left, promote next member or disband
    if (agentId === group.leaderId) {
      if (group.memberIds.length > 0) {
        group.leaderId = group.memberIds[0]!;
      } else {
        this.groups.delete(groupId);
      }
    }

    return true;
  }

  getGroup(groupId: string): WalkieTalkieGroup | undefined {
    return this.groups.get(groupId);
  }

  getGroupsForAgent(agentId: string): WalkieTalkieGroup[] {
    return Array.from(this.groups.values()).filter((g) =>
      g.memberIds.includes(agentId)
    );
  }

  // ---------------------------------------------------------------------------
  // Battery & Maintenance
  // ---------------------------------------------------------------------------

  drainBattery(deviceId: string, amount: number): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    device.batteryLevel = Math.max(0, device.batteryLevel - amount);

    // Auto turn off if dead
    if (device.batteryLevel <= 0 && device.isOn) {
      this.turnOff(deviceId);
    }
  }

  chargeBattery(deviceId: string, amount: number): void {
    const device = this.devices.get(deviceId);
    if (!device) return;

    device.batteryLevel = Math.min(100, device.batteryLevel + amount);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  getDevicesOnChannel(channel: number): WalkieTalkieDevice[] {
    const ch = this.channels.get(channel);
    if (!ch) return [];

    return Array.from(ch.activeDevices)
      .map((id) => this.devices.get(id))
      .filter((d): d is WalkieTalkieDevice => d !== undefined);
  }

  getDevicesInRange(
    x: number,
    y: number,
    range: number
  ): WalkieTalkieDevice[] {
    const rangeSquared = range * range;
    return Array.from(this.devices.values()).filter((d) => {
      if (!d.isOn) return false;
      const dx = d.x - x;
      const dy = d.y - y;
      return dx * dx + dy * dy <= rangeSquared;
    });
  }

  getRecentTransmissions(
    channel: number,
    limit: number = 10
  ): WalkieTalkieTransmission[] {
    return this.transmissionHistory
      .filter((t) => t.channel === channel)
      .slice(-limit);
  }

  getAllGroups(): WalkieTalkieGroup[] {
    return Array.from(this.groups.values());
  }

  // ---------------------------------------------------------------------------
  // Stats
  // ---------------------------------------------------------------------------

  getChannelActivity(): { channel: number; name: string; activeCount: number }[] {
    return Array.from(this.channels.values())
      .map((ch) => ({
        channel: ch.number,
        name: ch.name,
        activeCount: ch.activeDevices.size,
      }))
      .filter((c) => c.activeCount > 0)
      .sort((a, b) => b.activeCount - a.activeCount);
  }

  // ---------------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------------

  reset(): void {
    this.devices.clear();
    this.groups.clear();
    this.transmissionHistory = [];
    this.channels.clear();
    this.initializeChannels();
  }
}

// =============================================================================
// WALKIE TALKIE SYSTEM
// =============================================================================

export class WalkieTalkieSystem extends BaseSystem {
  readonly id = 'WalkieTalkieSystem';
  readonly priority = 68;
  readonly requiredComponents = [] as const;

  protected readonly throttleInterval = 50; // MEDIUM - 2.5 seconds (communication can be slightly delayed)

  private manager: WalkieTalkieManager = new WalkieTalkieManager();

  protected onUpdate(ctx: SystemContext): void {
    // Update device positions from agent positions
    const agents = ctx.world.query().with(CT.Agent, CT.Position).executeEntities();

    for (const agent of agents) {
      const agentComp = agent.getComponent(CT.Agent);
      const posComp = agent.getComponent<PositionComponent>(CT.Position);
      if (!agentComp || !posComp) continue;

      const device = this.manager.getDeviceByOwner(agent.id);
      if (device) {
        this.manager.updatePosition(device.id, posComp.x, posComp.y);

        // Drain battery if on (very slowly)
        if (device.isOn) {
          this.manager.drainBattery(device.id, 0.01);
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

  getManager(): WalkieTalkieManager {
    return this.manager;
  }

  /**
   * Issue a walkie talkie to an agent
   */
  issueDevice(
    agentId: string,
    agentName: string,
    model: WalkieTalkieModel,
    x: number,
    y: number
  ): WalkieTalkieDevice {
    const device = this.manager.createDevice(agentId, agentName, model, x, y);

    this.events.emit('walkie_talkie_issued', {
      deviceId: device.id,
      agentId,
      model,
    });

    return device;
  }

  /**
   * Send a message over walkie talkie
   */
  sendMessage(
    agentId: string,
    message: string,
    currentTick: number
  ): WalkieTalkieTransmission | null {
    const device = this.manager.getDeviceByOwner(agentId);
    if (!device) return null;

    const transmission = this.manager.transmit(device.id, message, currentTick);

    if (transmission) {
      this.events.emit('walkie_talkie_transmission', {
        transmissionId: transmission.id,
        senderId: agentId,
        channel: transmission.channel,
        message,
        receiverCount: transmission.receivedBy.length,
      });
    }

    return transmission;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

let systemInstance: WalkieTalkieSystem | null = null;

export function getWalkieTalkieSystem(): WalkieTalkieSystem {
  if (!systemInstance) {
    systemInstance = new WalkieTalkieSystem();
  }
  return systemInstance;
}

export function resetWalkieTalkieSystem(): void {
  if (systemInstance) {
    systemInstance.cleanup();
    systemInstance = null;
  }
}
