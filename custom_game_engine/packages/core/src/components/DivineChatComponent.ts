/**
 * DivineChatComponent - Holds the divine chat room state
 *
 * This is a singleton component that tracks the IRC/Discord-style chat
 * where gods communicate with each other and with the player.
 */

import type { Component } from '../ecs/Component.js';
import type { DivineChatRoom } from '../divinity/DivineChatTypes.js';
import { createChatRoom } from '../divinity/DivineChatTypes.js';

/**
 * DivineChatComponent - Global chat room for deities
 *
 * Singleton: Only one chat room exists per world
 */
export interface DivineChatComponent extends Component {
  type: 'divine_chat';

  /** The chat room state */
  chatRoom: DivineChatRoom;

  /** Whether chat is currently active (2+ gods present) */
  isActive: boolean;

  /** Last tick when a message was sent */
  lastMessageTick: number;

  /** Last tick when chat state was updated */
  lastUpdateTick: number;
}

/**
 * Create a divine chat component
 */
export function createDivineChatComponent(currentTick: number): DivineChatComponent {
  return {
    type: 'divine_chat',
    version: 1,
    chatRoom: createChatRoom(),
    isActive: false,
    lastMessageTick: currentTick,
    lastUpdateTick: currentTick,
  };
}
