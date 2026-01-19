/**
 * CrossRealmPhone Component Schema
 *
 * Entity component for owning and using cross-realm phones.
 * Enables cross-universe communication.
 * Tier 16: Miscellaneous (world/communication).
 */

import { defineComponent, autoRegister, type Component } from '../../index.js';

/**
 * Cross realm phone component type
 */
export interface CrossRealmPhoneComponent extends Component {
  type: 'cross_realm_phone';
  version: 1;

  phone: {
    phoneId: string;
    ownerId: string;
    universeId: string;
    battery: number;
    maxBattery: number;
    powerPerCall: number;
    powerPerMessage: number;
    contacts: Array<{
      contactId: string;
      name: string;
      universeId: string;
      phoneId: string;
      trusted: boolean;
    }>;
  };
  activeCall: {
    callId: string;
    caller: string;
    recipient: string;
    startedAt: number;
    duration: number;
    powerCost: number;
    transcript: Array<{ speaker: string; text: string; timestamp: number }>;
  } | null;
  incomingCall: {
    callId: string;
    caller: string;
    recipient: string;
    startedAt: number;
    duration: number;
    powerCost: number;
    transcript: Array<{ speaker: string; text: string; timestamp: number }>;
  } | null;
  inbox: Array<{
    messageId: string;
    senderId: string;
    senderUniverseId: string;
    recipientId: string;
    recipientUniverseId: string;
    content: string;
    sentAt: number;
    receivedAt: number;
    read: boolean;
    powerCost: number;
  }>;
  sentMessages: Array<{
    messageId: string;
    senderId: string;
    senderUniverseId: string;
    recipientId: string;
    recipientUniverseId: string;
    content: string;
    sentAt: number;
    receivedAt: number;
    read: boolean;
    powerCost: number;
  }>;
  unreadCount: number;
  autoAnswer: boolean;
  doNotDisturb: boolean;
  voicemail: string | null;
  lastChargedTick: bigint;
  chargingRate: number;
  isCharging: boolean;
}

/**
 * Cross realm phone component schema
 */
export const CrossRealmPhoneSchema = autoRegister(
  defineComponent<CrossRealmPhoneComponent>({
    type: 'cross_realm_phone',
    version: 1,
    category: 'world',
    description: 'Enables cross-universe communication via phone device',

    fields: {
      phone: {
        type: 'object',
        required: true,
        default: {
          phoneId: '',
          ownerId: '',
          universeId: '',
          battery: 100,
          maxBattery: 100,
          powerPerCall: 1,
          powerPerMessage: 0.5,
          contacts: [],
        },
        description: 'Phone device owned by this entity',
        displayName: 'Phone Device',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'device', order: 1, icon: '📱' },
        mutable: true,
      },

      activeCall: {
        type: 'object',
        required: false,
        description: 'Active call (if any)',
        displayName: 'Active Call',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'calls', order: 1, icon: '☎️' },
        mutable: true,
      },

      incomingCall: {
        type: 'object',
        required: false,
        description: 'Incoming call waiting to be answered',
        displayName: 'Incoming Call',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'calls', order: 2, icon: '📞' },
        mutable: true,
      },

      inbox: {
        type: 'array',
        required: true,
        default: [],
        description: 'Message inbox',
        displayName: 'Inbox',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'messages', order: 1, icon: '📨' },
        mutable: true,
        itemType: 'object',
      },

      sentMessages: {
        type: 'array',
        required: true,
        default: [],
        description: 'Sent messages',
        displayName: 'Sent Messages',
        visibility: { player: false, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'json', group: 'messages', order: 2 },
        mutable: true,
        itemType: 'object',
      },

      unreadCount: {
        type: 'number',
        required: true,
        default: 0,
        description: 'Unread message count',
        displayName: 'Unread Messages',
        visibility: { player: true, llm: 'summarized', agent: false, user: true, dev: true },
        ui: { widget: 'readonly', group: 'messages', order: 3, icon: '🔔' },
        mutable: true,
      },

      autoAnswer: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Auto-answer calls from trusted contacts',
        displayName: 'Auto Answer',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'settings', order: 1 },
        mutable: true,
      },

      doNotDisturb: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Do-not-disturb mode',
        displayName: 'Do Not Disturb',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'settings', order: 2, icon: '🔕' },
        mutable: true,
      },

      isCharging: {
        type: 'boolean',
        required: true,
        default: false,
        description: 'Is phone currently on a charging station',
        displayName: 'Charging',
        visibility: { player: true, llm: false, agent: false, user: true, dev: true },
        ui: { widget: 'checkbox', group: 'power', order: 1, icon: '🔌' },
        mutable: true,
      },
    },

    ui: {
      icon: '📱',
      color: '#1E90FF',
      priority: 5,
      devToolsPanel: true,
    },

    llm: {
      promptSection: 'equipment',
      priority: 4,
      summarize: (data) => {
        const battery = data.phone.battery.toFixed(0);
        const callStatus = data.activeCall ? ' (on call)' : data.incomingCall ? ' (incoming call)' : '';
        const unread = data.unreadCount > 0 ? `, ${data.unreadCount} unread` : '';
        return `Cross-Realm Phone: ${battery}% battery${callStatus}${unread}`;
      },
    },

    validate: (data): data is CrossRealmPhoneComponent => {
      if (typeof data !== 'object' || data === null) return false;
      const c = data as Record<string, unknown>;

      return (
        c.type === 'cross_realm_phone' &&
        typeof c.phone === 'object' &&
        Array.isArray(c.inbox) &&
        typeof c.unreadCount === 'number'
      );
    },

    createDefault: () => ({
      type: 'cross_realm_phone',
      version: 1,
      phone: {
        phoneId: '',
        ownerId: '',
        universeId: '',
        battery: 100,
        maxBattery: 100,
        powerPerCall: 1,
        powerPerMessage: 0.5,
        contacts: [],
      },
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
    }),
  })
);
