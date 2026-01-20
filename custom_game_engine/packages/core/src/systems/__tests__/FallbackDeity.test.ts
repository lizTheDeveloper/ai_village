/**
 * Test fallback deity functionality
 * Ensures prayers route to "The Unknown" deity when no other deity exists
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldImpl as World } from '../../ecs/World.js';
import { PrayerSystem } from '../PrayerSystem.js';
import { DeityComponent } from '../../components/DeityComponent.js';
import { createTagsComponent } from '../../components/TagsComponent.js';
import { createIdentityComponent } from '../../components/IdentityComponent.js';
import { createSpiritualComponent } from '../../components/SpiritualComponent.js';
import { createPersonalityComponent } from '../../components/PersonalityComponent.js';
import { ComponentType as CT } from '../../types/ComponentType.js';
import { EventBus } from '../../events/EventBus.js';

describe('Fallback Deity', () => {
  let world: World;
  let prayerSystem: PrayerSystem;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    prayerSystem = new PrayerSystem();
    prayerSystem.setEventBus(eventBus);
    prayerSystem.initialize(world);
  });

  it('should route unresolved prayers to fallback deity if one exists', () => {
    // Create fallback deity
    const fallbackDeity = world.createEntity('deity:unknown');
    const deityComp = new DeityComponent('The Unknown', 'dormant');
    deityComp.identity.domain = 'mystery';
    (fallbackDeity as any).addComponent(deityComp);
    (fallbackDeity as any).addComponent(createTagsComponent('deity', 'divine', 'fallback_deity'));
    (fallbackDeity as any).addComponent(createIdentityComponent('The Unknown', 'deity'));

    // Create agent with spiritual component (no specific deity belief)
    const agent = world.createEntity('agent:1');
    const spiritual = createSpiritualComponent('animist');
    spiritual.faith = 0.8;
    spiritual.prayerFrequency = 1; // Pray every tick
    spiritual.lastPrayerTime = -1000; // Long time ago
    (agent as any).addComponent(spiritual);

    const personality = createPersonalityComponent();
    personality.spirituality = 0.8;
    (agent as any).addComponent(personality);

    // Track prayer events
    let prayerOffered = false;
    let prayerDeityId = '';
    eventBus.on('prayer:offered', (data) => {
      prayerOffered = true;
      prayerDeityId = data.deityId;
    });

    // Run prayer system
    prayerSystem.update(world);

    // Verify prayer was routed to fallback deity
    expect(prayerOffered).toBe(true);
    expect(prayerDeityId).toBe('deity:unknown');

    // Verify fallback deity received the prayer
    const updatedDeity = world.query().with(CT.Deity).executeEntities()[0];
    const updatedDeityComp = updatedDeity?.getComponent<DeityComponent>(CT.Deity);
    expect(updatedDeityComp?.prayerQueue.length).toBeGreaterThan(0);
  });

  it('should emit proto_deity_belief event when no fallback deity exists', () => {
    // Create agent with spiritual component (no specific deity belief)
    const agent = world.createEntity('agent:1');
    const spiritual = createSpiritualComponent('animist');
    spiritual.faith = 0.8;
    spiritual.prayerFrequency = 1;
    spiritual.lastPrayerTime = -1000;
    (agent as any).addComponent(spiritual);

    const personality = createPersonalityComponent();
    personality.spirituality = 0.8;
    (agent as any).addComponent(personality);

    // Track proto_deity events
    let protoDeityEvent = false;
    eventBus.onGeneric('divinity:proto_deity_belief', () => {
      protoDeityEvent = true;
    });

    // Run prayer system (no fallback deity exists)
    prayerSystem.update(world);

    // Verify proto_deity event was emitted
    expect(protoDeityEvent).toBe(true);
  });

  it('should configure fallback deity with mystery domain', () => {
    const fallbackDeity = world.createEntity('deity:unknown');
    const deityComp = new DeityComponent('The Unknown', 'dormant');

    // Configure as described in requirements
    deityComp.identity.primaryName = 'The Unknown';
    deityComp.identity.epithets = ['The Unnamed One', 'The Silent Presence'];
    deityComp.identity.domain = 'mystery';
    deityComp.identity.secondaryDomains = ['fate', 'time', 'dreams'];
    deityComp.identity.perceivedPersonality = {
      benevolence: 0,
      interventionism: -0.8,
      wrathfulness: 0,
      mysteriousness: 1.0,
      generosity: 0,
      consistency: 0,
    };

    deityComp.belief.currentBelief = 10;

    (fallbackDeity as any).addComponent(deityComp);
    (fallbackDeity as any).addComponent(createTagsComponent('deity', 'fallback_deity'));

    // Verify configuration
    const retrievedDeity = world.query().with(CT.Deity).executeEntities()[0];
    const retrievedComp = retrievedDeity?.getComponent<DeityComponent>(CT.Deity);

    expect(retrievedComp?.identity.primaryName).toBe('The Unknown');
    expect(retrievedComp?.identity.domain).toBe('mystery');
    expect(retrievedComp?.identity.perceivedPersonality.mysteriousness).toBe(1.0);
    expect(retrievedComp?.identity.perceivedPersonality.interventionism).toBe(-0.8);
    expect(retrievedComp?.belief.currentBelief).toBe(10);

    const tags = retrievedDeity?.getComponent(CT.Tags);
    expect(tags?.tags.has('fallback_deity')).toBe(true);
  });
});
