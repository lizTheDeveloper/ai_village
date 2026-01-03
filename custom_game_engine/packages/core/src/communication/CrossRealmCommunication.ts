/**
 * CrossRealmCommunication - Inter-universe phones and messaging
 *
 * High-tier Clarketech that enables real-time communication across universes
 * and even multiverses. Combines magical enchantments with advanced technology
 * to bridge β-space.
 *
 * Prerequisites:
 * - Stable inter-universe portals (Clarketech tier 5)
 * - Stable inter-multiverse portals (Clarketech tier 7)
 * - Cross-realm messaging research (Clarketech tier 7-8)
 *
 * Technical Challenges:
 * - β-space routing: Messages must traverse timeline branches
 * - Causal ordering: Use σ (sync time) to prevent paradoxes
 * - Signal degradation: Distance in β-space affects latency/quality
 * - Power requirements: Cross-multiverse calls use massive mana/energy
 */

import type { HilbertTimeCoordinate } from '../trade/HilbertTime.js';
import type { EntityId } from '../types.js';

// =============================================================================
// Communication Devices
// =============================================================================

/**
 * Inter-universe phone device
 */
export interface CrossRealmPhone {
  /** Device ID */
  id: string;

  /** Owner entity */
  ownerId: EntityId;

  /** Device tier (determines range and quality) */
  tier: CrossRealmPhoneTier;

  /** Current β-address this phone is registered at */
  address: CrossRealmAddress;

  /** Mana/energy charge remaining */
  charge: number;

  /** Maximum charge capacity */
  maxCharge: number;

  /** Contacts list */
  contacts: Map<string, CrossRealmContact>;

  /** Call history */
  callHistory: CrossRealmCall[];

  /** Device status */
  status: 'idle' | 'calling' | 'receiving' | 'in_call' | 'offline' | 'charging';

  /** Magical enchantments on this device */
  enchantments: PhoneEnchantment[];
}

/**
 * Phone tier determines capabilities
 */
export type CrossRealmPhoneTier =
  | 'basic' // Same universe only
  | 'advanced' // Cross-universe (same multiverse)
  | 'transcendent'; // Cross-multiverse

/**
 * β-space address for routing messages
 */
export interface CrossRealmAddress {
  /** β-coordinate (timeline branch) */
  beta: string;

  /** Universe ID */
  universeId: string;

  /** Device ID (unique within universe) */
  deviceId: string;

  /** Optional nickname for this address */
  nickname?: string;
}

/**
 * Contact entry
 */
export interface CrossRealmContact {
  /** Contact name */
  name: string;

  /** Their phone address */
  address: CrossRealmAddress;

  /** Trust level (affects call acceptance) */
  trustLevel: 'trusted' | 'known' | 'unknown' | 'blocked';

  /** Last contact time */
  lastContactTau?: bigint;

  /** Notes about this contact */
  notes?: string;
}

/**
 * Magical enchantments that enhance phones
 */
export interface PhoneEnchantment {
  /** Enchantment type */
  type:
    | 'range_boost' // Increases β-space range
    | 'clarity' // Reduces signal degradation
    | 'translation' // Auto-translates languages
    | 'privacy' // Prevents eavesdropping
    | 'recording' // Records calls
    | 'multi_party' // Enables conference calls
    | 'emergency_beacon'; // Sends distress signal across β-space

  /** Enchantment power level */
  power: number;

  /** Mana cost multiplier */
  manaCostMultiplier: number;
}

// =============================================================================
// Calls and Messages
// =============================================================================

/**
 * A cross-realm phone call
 */
export interface CrossRealmCall {
  /** Call ID */
  id: string;

  /** Caller address */
  from: CrossRealmAddress;

  /** Recipient address */
  to: CrossRealmAddress;

  /** Call type */
  type: 'voice' | 'video' | 'data' | 'emergency';

  /** Call status */
  status: 'ringing' | 'connected' | 'ended' | 'failed' | 'rejected';

  /** When call started (caller's τ) */
  startedAt: HilbertTimeCoordinate;

  /** When call ended (caller's τ) */
  endedAt?: HilbertTimeCoordinate;

  /** Duration in ticks (caller's perspective) */
  duration?: bigint;

  /** Signal quality (0.0 = dropped, 1.0 = perfect) */
  signalQuality: number;

  /** Latency in ticks (due to β-space distance) */
  latency: bigint;

  /** Mana/energy cost per tick */
  costPerTick: number;

  /** Total cost of call */
  totalCost?: number;

  /** Call transcript (if recording enchantment active) */
  transcript?: string[];

  /** Why call failed/was rejected */
  failureReason?: string;
}

/**
 * Text message across realms
 */
export interface CrossRealmMessage {
  /** Message ID */
  id: string;

  /** Sender address */
  from: CrossRealmAddress;

  /** Recipient address */
  to: CrossRealmAddress;

  /** Message content */
  content: string;

  /** When sent (sender's Hilbert time) */
  sentAt: HilbertTimeCoordinate;

  /** When received (recipient's Hilbert time) */
  receivedAt?: HilbertTimeCoordinate;

  /** Delivery status */
  status: 'sending' | 'delivered' | 'read' | 'failed';

  /** Message priority */
  priority: 'low' | 'normal' | 'high' | 'urgent';

  /** Mana cost to send */
  cost: number;

  /** Why delivery failed */
  failureReason?: string;
}

// =============================================================================
// Routing and Signal Propagation
// =============================================================================

/**
 * Calculate signal quality based on β-space distance
 */
export function calculateSignalQuality(
  sourceBeta: string,
  targetBeta: string,
  phoneEnchantments: PhoneEnchantment[]
): number {
  // Calculate β-space distance
  const distance = calculateBetaDistance(sourceBeta, targetBeta);

  // Base signal degradation: 10% per branch depth difference
  let quality = 1.0 - distance * 0.1;

  // Clarity enchantments reduce degradation
  const clarityBoost = phoneEnchantments
    .filter((e) => e.type === 'clarity')
    .reduce((sum, e) => sum + e.power * 0.05, 0);

  quality += clarityBoost;

  // Clamp to [0, 1]
  if (quality < 0) quality = 0;
  if (quality > 1) quality = 1;

  return quality;
}

/**
 * Calculate β-space distance (number of branches between addresses)
 */
function calculateBetaDistance(beta1: string, beta2: string): number {
  const parts1 = beta1.split('.');
  const parts2 = beta2.split('.');

  // Find common ancestor
  let commonDepth = 0;
  for (let i = 0; i < Math.min(parts1.length, parts2.length); i++) {
    if (parts1[i] === parts2[i]) {
      commonDepth++;
    } else {
      break;
    }
  }

  // Distance = steps to common ancestor + steps from ancestor to target
  const distance1 = parts1.length - commonDepth;
  const distance2 = parts2.length - commonDepth;

  return distance1 + distance2;
}

/**
 * Calculate call latency based on β-space routing
 */
export function calculateLatency(
  sourceBeta: string,
  targetBeta: string,
  phoneEnchantments: PhoneEnchantment[]
): bigint {
  const distance = calculateBetaDistance(sourceBeta, targetBeta);

  // Base latency: 1 tick per branch traversal
  let latency = distance;

  // Range boost enchantments reduce latency
  const rangeBoost = phoneEnchantments
    .filter((e) => e.type === 'range_boost')
    .reduce((sum, e) => sum + e.power, 0);

  latency = Math.floor(latency * (1 - rangeBoost * 0.1));

  // Minimum 0 ticks
  if (latency < 0) latency = 0;

  return BigInt(latency);
}

/**
 * Calculate mana/energy cost for a call
 */
export function calculateCallCost(
  tier: CrossRealmPhoneTier,
  callType: CrossRealmCall['type'],
  targetBeta: string,
  sourceBeta: string,
  enchantments: PhoneEnchantment[]
): number {
  // Base cost per tick
  let baseCost = 0;

  switch (tier) {
    case 'basic':
      baseCost = 1; // Very cheap for same universe
      break;
    case 'advanced':
      baseCost = 10; // Moderate for cross-universe
      break;
    case 'transcendent':
      baseCost = 100; // Expensive for cross-multiverse
      break;
  }

  // Video/data calls cost more
  switch (callType) {
    case 'voice':
      baseCost *= 1;
      break;
    case 'video':
      baseCost *= 5;
      break;
    case 'data':
      baseCost *= 10;
      break;
    case 'emergency':
      baseCost *= 2; // Emergency beacon
      break;
  }

  // Distance multiplier
  const distance = calculateBetaDistance(sourceBeta, targetBeta);
  const distanceMultiplier = 1 + distance * 0.5;

  baseCost *= distanceMultiplier;

  // Enchantment cost multipliers
  for (const ench of enchantments) {
    baseCost *= ench.manaCostMultiplier;
  }

  return Math.floor(baseCost);
}

// =============================================================================
// Call Management
// =============================================================================

/**
 * Initiate a cross-realm call
 */
export function initiateCall(
  phone: CrossRealmPhone,
  targetAddress: CrossRealmAddress,
  callType: CrossRealmCall['type'],
  currentTime: HilbertTimeCoordinate
): { success: boolean; call?: CrossRealmCall; reason?: string } {
  // Check phone status
  if (phone.status !== 'idle') {
    return { success: false, reason: 'Phone is busy' };
  }

  // Check if recipient is in contacts
  const contact = Array.from(phone.contacts.values()).find(
    (c) => c.address.deviceId === targetAddress.deviceId
  );

  // Check if blocked
  if (contact && contact.trustLevel === 'blocked') {
    return { success: false, reason: 'Contact is blocked' };
  }

  // Calculate costs and quality
  const costPerTick = calculateCallCost(
    phone.tier,
    callType,
    targetAddress.beta,
    phone.address.beta,
    phone.enchantments
  );

  const signalQuality = calculateSignalQuality(
    phone.address.beta,
    targetAddress.beta,
    phone.enchantments
  );

  const latency = calculateLatency(phone.address.beta, targetAddress.beta, phone.enchantments);

  // Check if we have enough charge for at least 10 ticks
  if (phone.charge < costPerTick * 10) {
    return { success: false, reason: 'Insufficient charge' };
  }

  // Create call
  const call: CrossRealmCall = {
    id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    from: phone.address,
    to: targetAddress,
    type: callType,
    status: 'ringing',
    startedAt: currentTime,
    signalQuality,
    latency,
    costPerTick,
    transcript: phone.enchantments.some((e) => e.type === 'recording') ? [] : undefined,
  };

  phone.status = 'calling';
  phone.callHistory.push(call);

  return { success: true, call };
}

/**
 * Answer an incoming call
 */
export function answerCall(
  _phone: CrossRealmPhone,
  call: CrossRealmCall
): { success: boolean; reason?: string } {
  if (_phone.status !== 'receiving') {
    return { success: false, reason: 'Not receiving a call' };
  }

  if (call.status !== 'ringing') {
    return { success: false, reason: 'Call is not ringing' };
  }

  call.status = 'connected';
  _phone.status = 'in_call';

  return { success: true };
}

/**
 * Reject an incoming call
 */
export function rejectCall(
  phone: CrossRealmPhone,
  call: CrossRealmCall,
  reason?: string
): { success: boolean } {
  call.status = 'rejected';
  call.failureReason = reason ?? 'Call rejected';
  phone.status = 'idle';

  return { success: true };
}

/**
 * End an active call
 */
export function endCall(
  phone: CrossRealmPhone,
  call: CrossRealmCall,
  currentTime: HilbertTimeCoordinate
): { success: boolean; totalCost: number } {
  if (call.status !== 'connected') {
    return { success: false, totalCost: 0 };
  }

  call.status = 'ended';
  call.endedAt = currentTime;

  // Calculate duration and total cost
  const duration = currentTime.tau - call.startedAt.tau;
  call.duration = duration;

  const totalCost = Number(duration) * call.costPerTick;
  call.totalCost = totalCost;

  // Deduct from phone charge
  phone.charge -= totalCost;
  if (phone.charge < 0) phone.charge = 0;

  phone.status = 'idle';

  return { success: true, totalCost };
}

// =============================================================================
// Messaging
// =============================================================================

/**
 * Send a text message across realms
 */
export function sendMessage(
  phone: CrossRealmPhone,
  targetAddress: CrossRealmAddress,
  content: string,
  priority: CrossRealmMessage['priority'],
  currentTime: HilbertTimeCoordinate
): { success: boolean; message?: CrossRealmMessage; reason?: string } {
  // Calculate cost (messages are cheaper than calls)
  const distance = calculateBetaDistance(phone.address.beta, targetAddress.beta);
  const baseCost = Math.floor(distance * 0.5);

  let cost = baseCost;
  switch (priority) {
    case 'low':
      cost *= 0.5;
      break;
    case 'normal':
      cost *= 1;
      break;
    case 'high':
      cost *= 2;
      break;
    case 'urgent':
      cost *= 5;
      break;
  }

  // Check charge
  if (phone.charge < cost) {
    return { success: false, reason: 'Insufficient charge' };
  }

  // Create message
  const message: CrossRealmMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    from: phone.address,
    to: targetAddress,
    content,
    sentAt: currentTime,
    status: 'sending',
    priority,
    cost,
  };

  // Deduct cost
  phone.charge -= cost;

  return { success: true, message };
}

/**
 * Receive a message
 */
export function receiveMessage(
  _phone: CrossRealmPhone,
  message: CrossRealmMessage,
  currentTime: HilbertTimeCoordinate
): { success: boolean } {
  message.receivedAt = currentTime;
  message.status = 'delivered';

  return { success: true };
}

// =============================================================================
// Device Management
// =============================================================================

/**
 * Create a new cross-realm phone
 */
export function createCrossRealmPhone(
  ownerId: EntityId,
  tier: CrossRealmPhoneTier,
  address: CrossRealmAddress
): CrossRealmPhone {
  // Charge capacity scales with tier
  let maxCharge = 0;
  switch (tier) {
    case 'basic':
      maxCharge = 1000;
      break;
    case 'advanced':
      maxCharge = 10000;
      break;
    case 'transcendent':
      maxCharge = 100000;
      break;
  }

  return {
    id: `phone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    ownerId,
    tier,
    address,
    charge: maxCharge,
    maxCharge,
    contacts: new Map(),
    callHistory: [],
    status: 'idle',
    enchantments: [],
  };
}

/**
 * Add a contact to phone
 */
export function addContact(
  phone: CrossRealmPhone,
  name: string,
  address: CrossRealmAddress,
  trustLevel: CrossRealmContact['trustLevel'],
  notes?: string
): CrossRealmContact {
  const contact: CrossRealmContact = {
    name,
    address,
    trustLevel,
    notes,
  };

  phone.contacts.set(address.deviceId, contact);

  return contact;
}

/**
 * Charge a phone with mana/energy
 */
export function chargePhone(phone: CrossRealmPhone, amount: number): number {
  const previousCharge = phone.charge;
  phone.charge += amount;

  if (phone.charge > phone.maxCharge) {
    phone.charge = phone.maxCharge;
  }

  return phone.charge - previousCharge; // Amount actually charged
}

/**
 * Add an enchantment to a phone
 */
export function addEnchantment(
  phone: CrossRealmPhone,
  enchantment: PhoneEnchantment
): { success: boolean; reason?: string } {
  // Check if already has this enchantment type
  const existing = phone.enchantments.find((e) => e.type === enchantment.type);
  if (existing) {
    return { success: false, reason: 'Phone already has this enchantment type' };
  }

  phone.enchantments.push(enchantment);

  return { success: true };
}

// =============================================================================
// Special Features
// =============================================================================

/**
 * Send an emergency beacon across all β-space
 *
 * Used by stranded travelers or civilizations under attack.
 * Broadcasts to all reachable phones, ignoring normal routing limits.
 */
export function sendEmergencyBeacon(
  phone: CrossRealmPhone,
  _distressMessage: string,
  _currentTime: HilbertTimeCoordinate
): { success: boolean; range: number; cost: number; reason?: string } {
  // Check for emergency beacon enchantment
  const hasBeacon = phone.enchantments.some((e) => e.type === 'emergency_beacon');
  if (!hasBeacon) {
    return { success: false, range: 0, cost: 0, reason: 'Phone lacks emergency beacon enchantment' };
  }

  // Emergency beacon has massive range but huge cost
  const range = 100; // β-space branches
  const cost = 50000; // Very expensive

  if (phone.charge < cost) {
    return { success: false, range: 0, cost, reason: 'Insufficient charge for emergency beacon' };
  }

  // Deduct cost
  phone.charge -= cost;

  // Broadcast is handled by the communication system
  return { success: true, range, cost };
}

/**
 * Conference call with multiple participants
 */
export interface ConferenceCall {
  /** Conference ID */
  id: string;

  /** Host */
  host: CrossRealmAddress;

  /** Participants */
  participants: CrossRealmAddress[];

  /** Conference status */
  status: 'waiting' | 'active' | 'ended';

  /** When conference started */
  startedAt: HilbertTimeCoordinate;

  /** Cost multiplier (N participants = N times base cost) */
  costMultiplier: number;
}

/**
 * Start a conference call
 */
export function startConference(
  hostPhone: CrossRealmPhone,
  participants: CrossRealmAddress[],
  currentTime: HilbertTimeCoordinate
): { success: boolean; conference?: ConferenceCall; reason?: string } {
  // Check for multi-party enchantment
  const hasMultiParty = hostPhone.enchantments.some((e) => e.type === 'multi_party');
  if (!hasMultiParty) {
    return { success: false, reason: 'Phone lacks multi-party enchantment' };
  }

  // Create conference
  const conference: ConferenceCall = {
    id: `conf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    host: hostPhone.address,
    participants,
    status: 'waiting',
    startedAt: currentTime,
    costMultiplier: participants.length,
  };

  hostPhone.status = 'calling';

  return { success: true, conference };
}
