/**
 * DivineChatSystem - DEPRECATED
 *
 * @deprecated Use ChatRoomSystem instead. This is a thin wrapper for backwards compatibility.
 *
 * Migration:
 * ```typescript
 * // Old way
 * const divineChatSystem = new DivineChatSystem();
 * divineChatSystem.sendMessage(world, deityId, content);
 *
 * // New way
 * const chatRoomSystem = new ChatRoomSystem();
 * chatRoomSystem.sendMessage(world, 'divine_chat', deityId, content);
 * ```
 *
 * The divine chat is now just one instance of the general ChatRoomSystem.
 * This wrapper delegates to ChatRoomSystem for backwards compatibility.
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import {
  ChatRoomSystem,
  type ChatRoomComponent,
  DIVINE_CHAT_CONFIG,
} from '../communication/index.js';

/**
 * @deprecated Use ChatRoomSystem directly instead
 */
export class DivineChatSystem implements System {
  readonly id = 'divine_chat' as const;
  readonly priority: number = 50;
  readonly requiredComponents = [] as const;

  private chatRoomSystem: ChatRoomSystem;

  constructor() {
    console.error('[DivineChatSystem] DEPRECATED: Use ChatRoomSystem instead');
    this.chatRoomSystem = new ChatRoomSystem();
  }

  update(world: World, entities: ReadonlyArray<Entity>, deltaTime: number): void {
    // Delegate to ChatRoomSystem
    this.chatRoomSystem.update(world, entities, deltaTime);
  }

  /**
   * Send a message to the divine chat
   * @deprecated Use chatRoomSystem.sendMessage(world, 'divine_chat', speakerId, content)
   */
  sendMessage(world: World, speakerId: string, content: string): void {
    this.chatRoomSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, speakerId, content);
  }

  /**
   * Get the divine chat component
   * @deprecated Use chatRoomSystem.getRoom(world, 'divine_chat')
   */
  getChatComponent(world: World): ChatRoomComponent | null {
    return this.chatRoomSystem.getRoom(world, DIVINE_CHAT_CONFIG.id);
  }

  /**
   * Check if a deity is in the chat
   * @deprecated Use chatRoomSystem.isInRoom(world, 'divine_chat', deityId)
   */
  isDeityInChat(world: World, deityId: string): boolean {
    return this.chatRoomSystem.isInRoom(world, DIVINE_CHAT_CONFIG.id, deityId);
  }

  /**
   * Get all gods currently in the chat
   * @deprecated Use chatRoomSystem.getRoomMembers(world, 'divine_chat')
   */
  getObservingGods(world: World): string[] {
    return this.chatRoomSystem.getRoomMembers(world, DIVINE_CHAT_CONFIG.id)
      .map(m => m.name);
  }

  /**
   * Get the underlying ChatRoomSystem
   */
  getChatRoomSystem(): ChatRoomSystem {
    return this.chatRoomSystem;
  }
}
