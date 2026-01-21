/**
 * CrossRealmPhoneComponent - Entity component for owning and using cross-realm phones
 *
 * Attaches to entities (agents, buildings) that have phone devices for
 * cross-universe communication.
 */

import type {
  CrossRealmPhone,
  CrossRealmCall,
  CrossRealmMessage,
  CrossRealmAddress,
} from '../communication/CrossRealmCommunication.js';
import type { HilbertTimeCoordinate } from '../trade/HilbertTime.js';

export interface Component {
  readonly type: string;
}

/**
 * Voicemail message left when a call cannot be answered
 */
export interface VoicemailMessage {
  /** Message ID */
  id: string;

  /** Caller address */
  from: CrossRealmAddress;

  /** Recipient address */
  to: CrossRealmAddress;

  /** Voicemail content/transcript */
  content: string;

  /** When the voicemail was left (recipient's Hilbert time) */
  timestamp: HilbertTimeCoordinate;

  /** Original call that triggered this voicemail */
  callId: string;

  /** Call type that was attempted */
  callType: CrossRealmCall['type'];

  /** Whether the voicemail has been listened to */
  listened: boolean;

  /** Reason the call wasn't answered */
  missedReason: 'no_answer' | 'busy' | 'dnd' | 'offline';
}

export interface CrossRealmPhoneComponent extends Component {
  readonly type: 'cross_realm_phone';
  readonly version: number;

  /** Phone device owned by this entity */
  phone: CrossRealmPhone;

  /** Active call (if any) */
  activeCall: CrossRealmCall | null;

  /** Incoming call waiting to be answered */
  incomingCall: CrossRealmCall | null;

  /** Message inbox */
  inbox: CrossRealmMessage[];

  /** Sent messages */
  sentMessages: CrossRealmMessage[];

  /** Unread message count */
  unreadCount: number;

  /** Auto-answer calls from trusted contacts */
  autoAnswer: boolean;

  /** Do-not-disturb mode */
  doNotDisturb: boolean;

  /** Voicemail greeting message */
  voicemail: string | null;

  /** Voicemail inbox (missed call messages) */
  voicemails: VoicemailMessage[];

  /** Unlistened voicemail count */
  unlistenedVoicemailCount: number;

  /** Last time phone was charged */
  lastChargedTick: bigint;

  /** Charging rate per tick (when on charging station) */
  chargingRate: number;

  /** Is phone currently on a charging station */
  isCharging: boolean;
}

export function createCrossRealmPhoneComponent(
  phone: CrossRealmPhone
): CrossRealmPhoneComponent {
  return {
    type: 'cross_realm_phone',
    version: 1,
    phone,
    activeCall: null,
    incomingCall: null,
    inbox: [],
    sentMessages: [],
    unreadCount: 0,
    autoAnswer: false,
    doNotDisturb: false,
    voicemail: null,
    voicemails: [],
    unlistenedVoicemailCount: 0,
    lastChargedTick: 0n,
    chargingRate: 0,
    isCharging: false,
  };
}
