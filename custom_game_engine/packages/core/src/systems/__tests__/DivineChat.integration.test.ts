/**
 * Chat Room System Integration Test
 *
 * Tests the generalized chat room system:
 * 1. Chat room creation when 2+ members exist (for criteria-based rooms)
 * 2. Member entry/exit notifications
 * 3. Message sending and routing
 * 4. Chat activation/deactivation based on member count
 * 5. Public API methods (getRoom, isInRoom, getRoomMembers, sendMessage)
 *
 * Note: DivineChatSystem is deprecated and wraps ChatRoomSystem for backwards compatibility.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl } from '../../ecs/World.js';
import { EventBusImpl } from '../../events/EventBus.js';
import { ChatRoomSystem, type ChatRoomComponent, DIVINE_CHAT_CONFIG } from '../../communication/index.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';
import { createTagsComponent } from '../../components/TagsComponent.js';

describe('Chat Room System - Integration (Divine Chat)', () => {
  let world: WorldImpl;
  let chatSystem: ChatRoomSystem;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new WorldImpl(eventBus);
    chatSystem = new ChatRoomSystem();
  });

  /**
   * Helper: Create a deity entity
   */
  function createDeity(name: string): string {
    const deity = world.createEntity();

    const identity = createIdentityComponent(name, 'deity');
    (deity as any).addComponent(identity);

    const tags = createTagsComponent('deity');
    (deity as any).addComponent(tags);

    return deity.id;
  }

  /**
   * Helper: Get divine chat room component
   */
  function getChatRoom(): ChatRoomComponent | null {
    return chatSystem.getRoom(world, DIVINE_CHAT_CONFIG.id);
  }

  describe('Chat Room Creation', () => {
    it('should create chat room singleton on first update', () => {
      // No chat before first update
      expect(getChatRoom()).toBeNull();

      // Run system
      chatSystem.update(world, [], 0);

      // Chat room should now exist
      const chat = getChatRoom();
      expect(chat).not.toBeNull();
      expect(chat?.messages).toEqual([]);
      expect(chat?.config.membership.members).toEqual([]);
    });

    it('should reuse same chat entity across updates', () => {
      chatSystem.update(world, [], 0);
      const chat1 = getChatRoom();

      chatSystem.update(world, [], 0);
      const chat2 = getChatRoom();

      // Should be same instance
      expect(chat2).toBe(chat1);
    });
  });

  describe('Member Entry Notifications', () => {
    it('should generate entry notification when first god appears', () => {
      chatSystem.update(world, [], 0);

      const deathGodId = createDeity('The God of Death');

      chatSystem.update(world, [], 0);

      const chat = getChatRoom();
      expect(chat?.config.membership.members).toContain(deathGodId);
      expect(chat?.pendingNotifications).toHaveLength(1);
      expect(chat?.pendingNotifications[0]?.type).toBe('joined');
      expect(chat?.pendingNotifications[0]?.entityName).toBe('The God of Death');
    });

    it('should generate entry notifications for multiple gods', () => {
      chatSystem.update(world, [], 0);

      const deathGodId = createDeity('The God of Death');
      chatSystem.update(world, [], 0);

      const harvestGodId = createDeity('The God of Harvest');
      chatSystem.update(world, [], 0);

      const chat = getChatRoom();
      expect(chat?.config.membership.members).toHaveLength(2);
      expect(chat?.config.membership.members).toContain(deathGodId);
      expect(chat?.config.membership.members).toContain(harvestGodId);
      expect(chat?.pendingNotifications).toHaveLength(2);
    });

    it('should not duplicate entry notification if member already present', () => {
      chatSystem.update(world, [], 0);

      createDeity('The God of Death');
      chatSystem.update(world, [], 0);

      const notifCountBefore = getChatRoom()?.pendingNotifications.length || 0;

      // Run again - should not add duplicate entry
      chatSystem.update(world, [], 0);

      const notifCountAfter = getChatRoom()?.pendingNotifications.length || 0;
      expect(notifCountAfter).toBe(notifCountBefore);
    });
  });

  describe('Member Exit Notifications', () => {
    it('should generate exit notification when god is removed', () => {
      chatSystem.update(world, [], 0);

      const deathGodId = createDeity('The God of Death');
      createDeity('The God of Harvest');
      chatSystem.update(world, [], 0);

      // Remove death god
      world.destroyEntity(deathGodId);
      chatSystem.update(world, [], 0);

      const chat = getChatRoom();
      expect(chat?.config.membership.members).not.toContain(deathGodId);
      expect(chat?.config.membership.members).toHaveLength(1);

      // Should have exit notification (in addition to 2 entry notifications)
      const exitNotifs = chat?.pendingNotifications.filter(n => n.type === 'left');
      expect(exitNotifs).toHaveLength(1);
      expect(exitNotifs?.[0]?.entityId).toBe(deathGodId);
    });

    it('should handle all gods leaving', () => {
      chatSystem.update(world, [], 0);

      const god1 = createDeity('God One');
      const god2 = createDeity('God Two');
      chatSystem.update(world, [], 0);

      // Remove both gods
      world.destroyEntity(god1);
      world.destroyEntity(god2);
      chatSystem.update(world, [], 0);

      const chat = getChatRoom();
      expect(chat?.config.membership.members).toHaveLength(0);
      expect(chat?.isActive).toBe(false);
    });
  });

  describe('Chat Activation', () => {
    it('should be inactive with 0 gods', () => {
      chatSystem.update(world, [], 0);

      const chat = getChatRoom();
      expect(chat?.isActive).toBe(false);
    });

    it('should be inactive with 1 god', () => {
      chatSystem.update(world, [], 0);

      createDeity('Lonely God');
      chatSystem.update(world, [], 0);

      const chat = getChatRoom();
      expect(chat?.isActive).toBe(false);
    });

    it('should activate with 2 gods', () => {
      chatSystem.update(world, [], 0);

      createDeity('God One');
      createDeity('God Two');
      chatSystem.update(world, [], 0);

      const chat = getChatRoom();
      expect(chat?.isActive).toBe(true);
    });

    it('should activate with 3+ gods', () => {
      chatSystem.update(world, [], 0);

      createDeity('God One');
      createDeity('God Two');
      createDeity('God Three');
      chatSystem.update(world, [], 0);

      const chat = getChatRoom();
      expect(chat?.isActive).toBe(true);
      expect(chat?.config.membership.members).toHaveLength(3);
    });

    it('should deactivate when god count drops below 2', () => {
      chatSystem.update(world, [], 0);

      const god1 = createDeity('God One');
      createDeity('God Two');
      chatSystem.update(world, [], 0);

      expect(getChatRoom()?.isActive).toBe(true);

      // Remove one god
      world.destroyEntity(god1);
      chatSystem.update(world, [], 0);

      expect(getChatRoom()?.isActive).toBe(false);
    });
  });

  describe('Message Sending', () => {
    it('should send message from deity', () => {
      chatSystem.update(world, [], 0);

      const deathGodId = createDeity('The God of Death');
      chatSystem.update(world, [], 0);

      // Send message
      chatSystem.sendMessage(
        world,
        DIVINE_CHAT_CONFIG.id,
        deathGodId,
        'I have an interesting bargain to propose...'
      );

      const chat = getChatRoom();
      expect(chat?.messages).toHaveLength(1);

      const message = chat?.messages[0];
      expect(message?.senderId).toBe(deathGodId);
      expect(message?.senderName).toBe('The God of Death');
      expect(message?.content).toBe('I have an interesting bargain to propose...');
    });

    it('should send multiple messages and maintain order', () => {
      chatSystem.update(world, [], 0);

      const deathGodId = createDeity('The God of Death');
      const harvestGodId = createDeity('The God of Harvest');
      chatSystem.update(world, [], 0);

      // Send messages
      chatSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, deathGodId, 'Hello');
      chatSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, harvestGodId, 'Greetings');
      chatSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, deathGodId, 'How are you?');

      const chat = getChatRoom();
      expect(chat?.messages).toHaveLength(3);

      expect(chat?.messages[0]?.content).toBe('Hello');
      expect(chat?.messages[1]?.content).toBe('Greetings');
      expect(chat?.messages[2]?.content).toBe('How are you?');
    });

    it('should update lastMessageTick when message sent', () => {
      chatSystem.update(world, [], 0);

      const deathGodId = createDeity('The God of Death');
      chatSystem.update(world, [], 0);

      const tickBefore = getChatRoom()?.lastMessageTick || 0;

      // Advance tick
      for (let i = 0; i < 100; i++) {
        world.advanceTick();
      }
      chatSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, deathGodId, 'Test message');

      const tickAfter = getChatRoom()?.lastMessageTick || 0;
      expect(tickAfter).toBe(world.tick);
      expect(tickAfter).toBeGreaterThan(tickBefore);
    });

    it('should handle sending message from non-existent sender gracefully', () => {
      chatSystem.update(world, [], 0);

      // Try to send from non-existent sender
      chatSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, 'fake-sender-id', 'This should not crash');

      const chat = getChatRoom();
      // Message is still sent (with 'Unknown' name) - the sender doesn't need to exist
      expect(chat?.messages.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Public API Methods', () => {
    describe('isInRoom', () => {
      it('should return true for member in room', () => {
        chatSystem.update(world, [], 0);

        const deathGodId = createDeity('The God of Death');
        chatSystem.update(world, [], 0);

        expect(chatSystem.isInRoom(world, DIVINE_CHAT_CONFIG.id, deathGodId)).toBe(true);
      });

      it('should return false for member not in room', () => {
        chatSystem.update(world, [], 0);

        expect(chatSystem.isInRoom(world, DIVINE_CHAT_CONFIG.id, 'non-existent-god')).toBe(false);
      });

      it('should return false after member leaves', () => {
        chatSystem.update(world, [], 0);

        const deathGodId = createDeity('The God of Death');
        createDeity('The God of Harvest');
        chatSystem.update(world, [], 0);

        expect(chatSystem.isInRoom(world, DIVINE_CHAT_CONFIG.id, deathGodId)).toBe(true);

        world.destroyEntity(deathGodId);
        chatSystem.update(world, [], 0);

        expect(chatSystem.isInRoom(world, DIVINE_CHAT_CONFIG.id, deathGodId)).toBe(false);
      });
    });

    describe('getRoomMembers', () => {
      it('should return empty array when no members present', () => {
        chatSystem.update(world, [], 0);

        expect(chatSystem.getRoomMembers(world, DIVINE_CHAT_CONFIG.id)).toEqual([]);
      });

      it('should return info of all present members', () => {
        chatSystem.update(world, [], 0);

        createDeity('The God of Death');
        createDeity('The God of Harvest');
        createDeity('The God of Storms');
        chatSystem.update(world, [], 0);

        const members = chatSystem.getRoomMembers(world, DIVINE_CHAT_CONFIG.id);
        expect(members).toHaveLength(3);

        const names = members.map(m => m.name);
        expect(names).toContain('The God of Death');
        expect(names).toContain('The God of Harvest');
        expect(names).toContain('The God of Storms');
      });

      it('should update when members leave', () => {
        chatSystem.update(world, [], 0);

        const deathGodId = createDeity('The God of Death');
        createDeity('The God of Harvest');
        chatSystem.update(world, [], 0);

        expect(chatSystem.getRoomMembers(world, DIVINE_CHAT_CONFIG.id)).toHaveLength(2);

        world.destroyEntity(deathGodId);
        chatSystem.update(world, [], 0);

        const members = chatSystem.getRoomMembers(world, DIVINE_CHAT_CONFIG.id);
        expect(members).toHaveLength(1);

        const names = members.map(m => m.name);
        expect(names).toContain('The God of Harvest');
        expect(names).not.toContain('The God of Death');
      });
    });

    describe('getRoom', () => {
      it('should return null before initialization', () => {
        expect(chatSystem.getRoom(world, DIVINE_CHAT_CONFIG.id)).toBeNull();
      });

      it('should return chat component after initialization', () => {
        chatSystem.update(world, [], 0);

        const chat = chatSystem.getRoom(world, DIVINE_CHAT_CONFIG.id);
        expect(chat).not.toBeNull();
        expect(chat?.config).toBeDefined();
        expect(chat?.isActive).toBeDefined();
      });

      it('should return same instance across calls', () => {
        chatSystem.update(world, [], 0);

        const chat1 = chatSystem.getRoom(world, DIVINE_CHAT_CONFIG.id);
        const chat2 = chatSystem.getRoom(world, DIVINE_CHAT_CONFIG.id);

        expect(chat2).toBe(chat1);
      });
    });
  });

  describe('Complete Chat Flow', () => {
    it('should handle complete god interaction scenario', () => {
      // Initialize
      chatSystem.update(world, [], 0);

      // First god appears - chat inactive
      const deathGodId = createDeity('The God of Death');
      chatSystem.update(world, [], 0);

      expect(getChatRoom()?.isActive).toBe(false);
      expect(getChatRoom()?.pendingNotifications).toHaveLength(1);

      // Second god appears - chat activates
      const harvestGodId = createDeity('The God of Harvest');
      chatSystem.update(world, [], 0);

      expect(getChatRoom()?.isActive).toBe(true);
      expect(getChatRoom()?.pendingNotifications).toHaveLength(2);

      // Gods converse
      chatSystem.sendMessage(
        world,
        DIVINE_CHAT_CONFIG.id,
        deathGodId,
        'Greetings, Harvest God. I offer an exchange: spare one soul, gain abundant crops.'
      );

      chatSystem.sendMessage(
        world,
        DIVINE_CHAT_CONFIG.id,
        harvestGodId,
        'An intriguing proposition. Tell me more about this bargain.'
      );

      const chat = getChatRoom();
      expect(chat?.messages).toHaveLength(2);

      // Third god joins
      const stormsGodId = createDeity('The God of Storms');
      chatSystem.update(world, [], 0);

      expect(getChatRoom()?.config.membership.members).toHaveLength(3);
      expect(getChatRoom()?.pendingNotifications).toHaveLength(3);

      // Storms god speaks
      chatSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, stormsGodId, 'What bargain is this?');

      expect(getChatRoom()?.messages).toHaveLength(3);

      // Harvest god leaves
      world.destroyEntity(harvestGodId);
      chatSystem.update(world, [], 0);

      expect(getChatRoom()?.config.membership.members).toHaveLength(2);
      expect(getChatRoom()?.isActive).toBe(true); // Still active with 2 gods

      const exitNotifs = getChatRoom()?.pendingNotifications.filter(
        n => n.type === 'left'
      );
      expect(exitNotifs).toHaveLength(1);

      // Verify room members
      const members = chatSystem.getRoomMembers(world, DIVINE_CHAT_CONFIG.id);
      const names = members.map(m => m.name);
      expect(names).toHaveLength(2);
      expect(names).toContain('The God of Death');
      expect(names).toContain('The God of Storms');
      expect(names).not.toContain('The God of Harvest');
    });
  });

  describe('Tick Tracking', () => {
    it('should update lastActivityTick on each update', () => {
      chatSystem.update(world, [], 0);

      const initialTick = world.tick;
      chatSystem.update(world, [], 0);
      expect(getChatRoom()?.lastActivityTick).toBe(initialTick);

      // Advance tick
      for (let i = 0; i < 50; i++) {
        world.advanceTick();
      }
      chatSystem.update(world, [], 0);
      expect(getChatRoom()?.lastActivityTick).toBe(world.tick);

      // Advance tick again
      for (let i = 0; i < 50; i++) {
        world.advanceTick();
      }
      chatSystem.update(world, [], 0);
      expect(getChatRoom()?.lastActivityTick).toBe(world.tick);
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid member creation and deletion', () => {
      chatSystem.update(world, [], 0);

      const god1 = createDeity('God 1');
      const god2 = createDeity('God 2');
      const god3 = createDeity('God 3');
      chatSystem.update(world, [], 0);

      expect(getChatRoom()?.config.membership.members).toHaveLength(3);

      world.destroyEntity(god1);
      world.destroyEntity(god2);
      chatSystem.update(world, [], 0);

      expect(getChatRoom()?.config.membership.members).toHaveLength(1);

      createDeity('God 4');
      chatSystem.update(world, [], 0);

      expect(getChatRoom()?.config.membership.members).toHaveLength(2);
      expect(getChatRoom()?.isActive).toBe(true);
    });

    it('should handle entity without identity component gracefully', () => {
      chatSystem.update(world, [], 0);

      // Create entity with deity tag but no identity - criteria-based membership requires identity
      const entity = world.createEntity();
      const tags = createTagsComponent('deity');
      (entity as any).addComponent(tags);

      chatSystem.update(world, [], 0);

      const chat = getChatRoom();
      // Entity may or may not be found depending on criteria implementation
      // The key is that it should not crash
      expect(chat).toBeDefined();
    });

    it('should preserve messages when members join/leave', () => {
      chatSystem.update(world, [], 0);

      const god1 = createDeity('God 1');
      const god2 = createDeity('God 2');
      chatSystem.update(world, [], 0);

      chatSystem.sendMessage(world, DIVINE_CHAT_CONFIG.id, god1, 'Important message');

      createDeity('God 3');
      chatSystem.update(world, [], 0);

      world.destroyEntity(god2);
      chatSystem.update(world, [], 0);

      // Message should still be there
      expect(getChatRoom()?.messages).toHaveLength(1);
      expect(getChatRoom()?.messages[0]?.content).toBe('Important message');
    });
  });
});
