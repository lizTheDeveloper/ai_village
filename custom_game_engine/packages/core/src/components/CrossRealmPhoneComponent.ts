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
} from '../communication/CrossRealmCommunication.js';

export interface Component {
  readonly type: string;
}

export interface CrossRealmPhoneComponent extends Component {
  readonly type: 'cross_realm_phone';

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

  /** Voicemail recording (for missed calls) */
  voicemail: string | null;

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
    phone,
    activeCall: null,
    incomingCall: null,
    inbox: [],
    sentMessages: [],
    unreadCount: 0,
    autoAnswer: false,
    doNotDisturb: false,
    voicemail: null,
    lastChargedTick: 0n,
    chargingRate: 0,
    isCharging: false,
  };
}
