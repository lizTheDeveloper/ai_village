/**
 * Emergent Social Dynamics Tests
 *
 * Deep Conversation System - Phase 6
 *
 * Tests relationship growth, friendship emergence, and interest learning.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { RelationshipConversationSystem } from '../systems/RelationshipConversationSystem.js';
import { FriendshipSystem } from '../systems/FriendshipSystem.js';
import type { RelationshipComponent } from '../components/RelationshipComponent.js';
import { InterestsComponent } from '../components/InterestsComponent.js';
import { SocialMemoryComponent } from '../components/SocialMemoryComponent.js';
import { EventBusImpl } from '../events/EventBus.js';

describe('Phase 6: Emergent Social Dynamics', () => {
  let world: World;
  let agent1: EntityImpl;
  let agent2: EntityImpl;

  beforeEach(async () => {
    const eventBus = new EventBusImpl();
    world = new World(eventBus);

    // Create two test agents
    agent1 = world.createEntity() as EntityImpl;
    agent1.addComponent({ type: CT.Identity, name: 'Alice', appearance: 'A person' });
    agent1.addComponent({
      type: CT.Agent,
      behavior: 'wander',
      behaviorState: {},
      thinkInterval: 100,
      lastThinkTick: 0,
      useLLM: false,
      llmCooldown: 0,
      ageCategory: 'adult',
    });
    agent1.addComponent({
      type: CT.Position,
      x: 0,
      y: 0,
      chunkX: 0,
      chunkY: 0,
    });
    agent1.addComponent({
      type: CT.Relationship,
      relationships: new Map(),
    });

    const interests1 = new InterestsComponent();
    interests1.interests = [
      { topic: 'farming', intensity: 0.8, discussionHunger: 0.5, lastDiscussed: 0, source: 'skill', knownEnthusiasts: [] },
      { topic: 'the_gods', intensity: 0.6, discussionHunger: 0.7, lastDiscussed: 0, source: 'personality', knownEnthusiasts: [] },
    ];
    agent1.addComponent(interests1);

    agent1.addComponent(new SocialMemoryComponent());

    agent2 = world.createEntity() as EntityImpl;
    agent2.addComponent({ type: CT.Identity, name: 'Bob', appearance: 'A person' });
    agent2.addComponent({
      type: CT.Agent,
      behavior: 'wander',
      behaviorState: {},
      thinkInterval: 100,
      lastThinkTick: 0,
      useLLM: false,
      llmCooldown: 0,
      ageCategory: 'elder',
    });
    agent2.addComponent({
      type: CT.Position,
      x: 10,
      y: 10,
      chunkX: 0,
      chunkY: 0,
    });
    agent2.addComponent({
      type: CT.Relationship,
      relationships: new Map(),
    });

    const interests2 = new InterestsComponent();
    interests2.interests = [
      { topic: 'the_gods', intensity: 0.9, discussionHunger: 0.3, lastDiscussed: 0, source: 'personality', knownEnthusiasts: [] },
      { topic: 'mortality', intensity: 0.8, discussionHunger: 0.4, lastDiscussed: 0, source: 'personality', knownEnthusiasts: [] },
    ];
    agent2.addComponent(interests2);

    agent2.addComponent(new SocialMemoryComponent());

    // Initialize systems - modern pattern: systems auto-initialize when first update() is called
    const relSystem = new RelationshipConversationSystem();
    const friendSystem = new FriendshipSystem();

    // Systems initialize themselves on first update, no need to call .init()
    // Just ensure they're initialized with proper world/eventBus
    await relSystem.initialize(world, world.eventBus);
    await friendSystem.initialize(world, world.eventBus);
  });

  describe('RelationshipConversationSystem', () => {
    test('creates new relationship from conversation', () => {
      // Emit a conversation:ended event
      world.eventBus.emit({
        type: 'conversation:ended',
        source: agent1.id,
        data: {
          agent1: agent1.id,
          agent2: agent2.id,
          topicsDiscussed: ['the_gods'],
          overallQuality: 0.7,
          depth: 0.6,
        },
      });
      world.eventBus.flush();

      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      expect(relationships).toBeDefined();

      const relationship = relationships!.relationships.get(agent2.id);
      expect(relationship).toBeDefined();
      expect(relationship!.targetId).toBe(agent2.id);
      expect(relationship!.interactionCount).toBe(1);
    });

    test('increases familiarity after conversation', () => {
      world.eventBus.emit({
        type: 'conversation:ended',
        source: agent1.id,
        data: {
          agent1: agent1.id,
          agent2: agent2.id,
          topicsDiscussed: ['the_gods'],
          overallQuality: 0.8,
          depth: 0.7,
        },
      });
      world.eventBus.flush();

      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      const relationship = relationships!.relationships.get(agent2.id);

      expect(relationship!.familiarity).toBeGreaterThan(0);
      // High quality conversation: 2 + 0.8 * 3 = 4.4 familiarity gain
      expect(relationship!.familiarity).toBeGreaterThanOrEqual(4);
    });

    test('increases affinity for good conversations', () => {
      world.eventBus.emit({
        type: 'conversation:ended',
        source: agent1.id,
        data: {
          agent1: agent1.id,
          agent2: agent2.id,
          topicsDiscussed: ['the_gods'],
          overallQuality: 0.8,
          depth: 0.7,
        },
      });
      world.eventBus.flush();

      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      const relationship = relationships!.relationships.get(agent2.id);

      expect(relationship!.affinity).toBeGreaterThan(0);
      // Quality 0.8 > 0.5, so affinity gain = (0.8 - 0.3) * 5 = 2.5
      expect(relationship!.affinity).toBeGreaterThanOrEqual(2);
    });

    test('does not increase affinity for poor conversations', () => {
      world.eventBus.emit({
        type: 'conversation:ended',
        source: agent1.id,
        data: {
          agent1: agent1.id,
          agent2: agent2.id,
          topicsDiscussed: [],
          overallQuality: 0.3,
          depth: 0.2,
        },
      });
      world.eventBus.flush();

      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      const relationship = relationships!.relationships.get(agent2.id);

      // Affinity should be 0 (no gain for quality <= 0.5)
      expect(relationship!.affinity).toBe(0);
    });

    test('increases trust with emotional connection', () => {
      world.eventBus.emit({
        type: 'conversation:ended',
        source: agent1.id,
        data: {
          agent1: agent1.id,
          agent2: agent2.id,
          topicsDiscussed: ['the_gods'],
          overallQuality: 0.9,
          depth: 0.8,
        },
      });
      world.eventBus.flush();

      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      const relationship = relationships!.relationships.get(agent2.id);

      // Trust starts at 50, high quality adds emotional connection gain
      expect(relationship!.trust).toBeGreaterThan(50);
    });

    test('records known enthusiasts for discussed topics', () => {
      world.eventBus.emit({
        type: 'conversation:ended',
        source: agent1.id,
        data: {
          agent1: agent1.id,
          agent2: agent2.id,
          topicsDiscussed: ['the_gods'],
          overallQuality: 0.7,
          depth: 0.6,
        },
      });
      world.eventBus.flush();

      const interests = agent1.getComponent<InterestsComponent>(CT.Interests);
      const godsInterest = interests!.interests.find(i => i.topic === 'the_gods');

      expect(godsInterest).toBeDefined();
      expect(godsInterest!.knownEnthusiasts).toContain(agent2.id);
    });

    test('does not record enthusiasts for low quality conversations', () => {
      world.eventBus.emit({
        type: 'conversation:ended',
        source: agent1.id,
        data: {
          agent1: agent1.id,
          agent2: agent2.id,
          topicsDiscussed: ['the_gods'],
          overallQuality: 0.2, // Poor quality
          depth: 0.1,
        },
      });
      world.eventBus.flush();

      const interests = agent1.getComponent<InterestsComponent>(CT.Interests);
      const godsInterest = interests!.interests.find(i => i.topic === 'the_gods');

      expect(godsInterest!.knownEnthusiasts).not.toContain(agent2.id);
    });

    test('learns about partner interests through conversation', () => {
      world.eventBus.emit({
        type: 'conversation:ended',
        source: agent1.id,
        data: {
          agent1: agent1.id,
          agent2: agent2.id,
          topicsDiscussed: ['mortality', 'the_gods'],
          overallQuality: 0.7,
          depth: 0.6,
        },
      });
      world.eventBus.flush();

      const socialMemory = agent1.getComponent<SocialMemoryComponent>(CT.SocialMemory);
      const memory = socialMemory!.socialMemories.get(agent2.id);

      expect(memory).toBeDefined();
      expect(memory!.knownFacts.length).toBeGreaterThan(0);

      const mortalityFact = memory!.knownFacts.find(f => f.value === 'mortality');
      expect(mortalityFact).toBeDefined();
      expect(mortalityFact!.type).toBe('interest');
      expect(mortalityFact!.confidence).toBe(0.7);
    });

    test('reinforces existing interest knowledge', () => {
      // First conversation
      world.eventBus.emit({
        type: 'conversation:ended',
        source: agent1.id,
        data: {
          agent1: agent1.id,
          agent2: agent2.id,
          topicsDiscussed: ['the_gods'],
          overallQuality: 0.7,
          depth: 0.6,
        },
      });
      world.eventBus.flush();

      // Second conversation about same topic
      world.eventBus.emit({
        type: 'conversation:ended',
        source: agent1.id,
        data: {
          agent1: agent1.id,
          agent2: agent2.id,
          topicsDiscussed: ['the_gods'],
          overallQuality: 0.8,
          depth: 0.7,
        },
      });
      world.eventBus.flush();

      const socialMemory = agent1.getComponent<SocialMemoryComponent>(CT.SocialMemory);
      const memory = socialMemory!.socialMemories.get(agent2.id);

      const godsFact = memory!.knownFacts.find(f => f.value === 'the_gods');
      expect(godsFact!.confidence).toBeGreaterThan(0.7); // 0.7 + 0.1 = 0.8
    });

    test('updates relationships bidirectionally', () => {
      world.eventBus.emit({
        type: 'conversation:ended',
        source: agent1.id,
        data: {
          agent1: agent1.id,
          agent2: agent2.id,
          topicsDiscussed: ['the_gods'],
          overallQuality: 0.7,
          depth: 0.6,
        },
      });
      world.eventBus.flush();

      const relationships1 = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      const relationships2 = agent2.getComponent<RelationshipComponent>(CT.Relationship);

      expect(relationships1!.relationships.has(agent2.id)).toBe(true);
      expect(relationships2!.relationships.has(agent1.id)).toBe(true);
    });
  });

  describe('FriendshipSystem', () => {
    test('detects friendship when thresholds are met', async () => {
      let friendshipFormed = false;

      world.eventBus.on('friendship:formed', () => {
        friendshipFormed = true;
      });

      // Manually set relationship to meet friendship thresholds
      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      relationships!.relationships.set(agent2.id, {
        targetId: agent2.id,
        familiarity: 65, // Above threshold (60)
        affinity: 45, // Above threshold (40)
        trust: 70,
        lastInteraction: world.tick,
        interactionCount: 12, // Above threshold (10)
        sharedMemories: 5,
        sharedMeals: 2,
        perceivedSkills: [],
      });

      const friendSystem = new FriendshipSystem();
      await friendSystem.initialize(world, world.eventBus);

      // FriendshipSystem checks every 500 ticks, so advance world tick
      for (let i = 0; i < 500; i++) {
        world.advanceTick();
      }
      friendSystem.update(world, [agent1], 0);
      world.eventBus.flush();

      expect(friendshipFormed).toBe(true);

      const socialMemory = agent1.getComponent<SocialMemoryComponent>(CT.SocialMemory);
      const memory = socialMemory!.socialMemories.get(agent2.id);

      expect(memory).toBeDefined();
      expect(memory!.relationshipType).toBe('friend');
    });

    test('does not detect friendship with low familiarity', async () => {
      let friendshipFormed = false;

      world.eventBus.on('friendship:formed', () => {
        friendshipFormed = true;
      });

      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      relationships!.relationships.set(agent2.id, {
        targetId: agent2.id,
        familiarity: 40, // Below threshold
        affinity: 50,
        trust: 70,
        lastInteraction: world.tick,
        interactionCount: 15,
        sharedMemories: 5,
        sharedMeals: 2,
        perceivedSkills: [],
      });

      const friendSystem = new FriendshipSystem();
      await friendSystem.initialize(world, world.eventBus);
      friendSystem.update(world, [agent1], 0);

      expect(friendshipFormed).toBe(false);
    });

    test('does not detect friendship with low affinity', async () => {
      let friendshipFormed = false;

      world.eventBus.on('friendship:formed', () => {
        friendshipFormed = true;
      });

      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      relationships!.relationships.set(agent2.id, {
        targetId: agent2.id,
        familiarity: 70,
        affinity: 20, // Below threshold
        trust: 70,
        lastInteraction: world.tick,
        interactionCount: 15,
        sharedMemories: 5,
        sharedMeals: 2,
        perceivedSkills: [],
      });

      const friendSystem = new FriendshipSystem();
      await friendSystem.initialize(world, world.eventBus);
      friendSystem.update(world, [agent1], 0);

      expect(friendshipFormed).toBe(false);
    });

    test('does not detect friendship with few interactions', async () => {
      let friendshipFormed = false;

      world.eventBus.on('friendship:formed', () => {
        friendshipFormed = true;
      });

      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      relationships!.relationships.set(agent2.id, {
        targetId: agent2.id,
        familiarity: 70,
        affinity: 50,
        trust: 70,
        lastInteraction: world.tick,
        interactionCount: 5, // Below threshold
        sharedMemories: 2,
        sharedMeals: 1,
        perceivedSkills: [],
      });

      const friendSystem = new FriendshipSystem();
      await friendSystem.initialize(world, world.eventBus);
      friendSystem.update(world, [agent1], 0);

      expect(friendshipFormed).toBe(false);
    });

    test('only detects friendship once', async () => {
      let friendshipCount = 0;

      world.eventBus.on('friendship:formed', () => {
        friendshipCount++;
      });

      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      relationships!.relationships.set(agent2.id, {
        targetId: agent2.id,
        familiarity: 70,
        affinity: 50,
        trust: 70,
        lastInteraction: world.tick,
        interactionCount: 15,
        sharedMemories: 5,
        sharedMeals: 2,
        perceivedSkills: [],
      });

      const friendSystem = new FriendshipSystem();
      await friendSystem.initialize(world, world.eventBus);

      // First check - should detect friendship (after 500 ticks)
      for (let i = 0; i < 500; i++) {
        world.advanceTick();
      }
      friendSystem.update(world, [agent1], 0);
      world.eventBus.flush();
      expect(friendshipCount).toBe(1);

      // Second check - should not detect again (another 500 ticks)
      for (let i = 0; i < 500; i++) {
        world.advanceTick();
      }
      friendSystem.update(world, [agent1], 0);
      world.eventBus.flush();
      expect(friendshipCount).toBe(1);
    });

    test('emits friendship event with agent names', async () => {
      let eventData: any = null;

      world.eventBus.on('friendship:formed', (event: any) => {
        eventData = event.data;
      });

      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      relationships!.relationships.set(agent2.id, {
        targetId: agent2.id,
        familiarity: 65,
        affinity: 45,
        trust: 70,
        lastInteraction: world.tick,
        interactionCount: 12,
        sharedMemories: 5,
        sharedMeals: 2,
        perceivedSkills: [],
      });

      const friendSystem = new FriendshipSystem();
      await friendSystem.initialize(world, world.eventBus);

      // Advance world tick to trigger friendship check (throttle interval is 500)
      for (let i = 0; i < 500; i++) {
        world.advanceTick();
      }
      friendSystem.update(world, [agent1], 0);
      world.eventBus.flush();

      expect(eventData).toBeDefined();
      expect(eventData.agent1).toBe(agent1.id);
      expect(eventData.agent2).toBe(agent2.id);
      expect(eventData.agent1Name).toBe('Alice');
      expect(eventData.agent2Name).toBe('Bob');
    });
  });

  describe('Integration: Relationship → Friendship', () => {
    test('multiple quality conversations lead to friendship', async () => {
      let friendshipFormed = false;

      world.eventBus.on('friendship:formed', () => {
        friendshipFormed = true;
      });

      // Simulate 16 high-quality conversations
      // Familiarity gain = 2 + 0.8*3 = 4.4 per conversation (need 14 for 60)
      // Affinity gain = (0.8 - 0.3) * 5 = 2.5 per conversation (need 16 for 40)
      for (let i = 0; i < 16; i++) {
        world.eventBus.emit({
          type: 'conversation:ended',
          source: agent1.id,
          data: {
            agent1: agent1.id,
            agent2: agent2.id,
            topicsDiscussed: ['the_gods'],
            overallQuality: 0.8,
            depth: 0.7,
          },
        });
        world.eventBus.flush();
      }

      const relationships = agent1.getComponent<RelationshipComponent>(CT.Relationship);
      const relationship = relationships!.relationships.get(agent2.id);

      // Check if thresholds are met
      expect(relationship!.familiarity).toBeGreaterThanOrEqual(60);
      expect(relationship!.affinity).toBeGreaterThanOrEqual(40);
      expect(relationship!.interactionCount).toBeGreaterThanOrEqual(10);

      // Run friendship system (needs 500 ticks to trigger check)
      const friendSystem = new FriendshipSystem();
      await friendSystem.initialize(world, world.eventBus);
      for (let i = 0; i < 500; i++) {
        world.advanceTick();
      }
      friendSystem.update(world, [agent1], 0);
      world.eventBus.flush();

      expect(friendshipFormed).toBe(true);
    });
  });
});
