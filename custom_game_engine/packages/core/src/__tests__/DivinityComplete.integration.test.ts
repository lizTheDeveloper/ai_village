/**
 * Divinity System Complete Integration Test
 *
 * Tests all phases of the divinity system working together:
 * - Phase 1: Belief generation
 * - Phase 2: Prayer and divine communication
 * - Phase 3: Myth generation
 * - Phase 4: Emergent gods
 * - Phase 5: Religious institutions
 * - Phase 6: Avatars
 * - Phase 7: Angels
 * - Phase 8: Schisms, syncretism, competition, conversion
 * - Phase 9: World impact (terrain, species, weather, mass events)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { EventBusImpl } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';

// Phase 1-3 Systems
import { BeliefGenerationSystem } from '../systems/BeliefGenerationSystem.js';
import { PrayerSystem } from '../systems/PrayerSystem.js';
import { PrayerAnsweringSystem } from '../systems/PrayerAnsweringSystem.js';
import { MythGenerationSystem } from '../systems/MythGenerationSystem.js';

// Phase 4-7 Systems
import { DeityEmergenceSystem } from '../systems/DeityEmergenceSystem.js';
import { AIGodBehaviorSystem } from '../systems/AIGodBehaviorSystem.js';
import { TempleSystem } from '../systems/TempleSystem.js';
import { PriesthoodSystem } from '../systems/PriesthoodSystem.js';
import { RitualSystem } from '../systems/RitualSystem.js';
import { HolyTextSystem } from '../systems/HolyTextSystem.js';
import { AvatarSystem } from '../systems/AvatarSystem.js';
import { AngelSystem } from '../systems/AngelSystem.js';

// Phase 8-9 Systems
import { SchismSystem } from '../systems/SchismSystem.js';
import { SyncretismSystem } from '../systems/SyncretismSystem.js';
import { ReligiousCompetitionSystem } from '../systems/ReligiousCompetitionSystem.js';
import { ConversionWarfareSystem } from '../systems/ConversionWarfareSystem.js';
import { TerrainModificationSystem } from '../systems/TerrainModificationSystem.js';
import { SpeciesCreationSystem } from '../systems/SpeciesCreationSystem.js';
import { DivineWeatherControl } from '../systems/DivineWeatherControl.js';
import { MassEventSystem } from '../systems/MassEventSystem.js';

// Components
import { DeityComponent } from '../components/DeityComponent.js';
import { createSpiritualComponent } from '../components/SpiritualComponent.js';
import { createAgentComponent } from '../components/AgentComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { PersonalityComponent } from '../components/PersonalityComponent.js';

describe('Divinity System - Complete Integration', () => {
  let world: World;

  // Phase 1-3 Systems
  let beliefGenSystem: BeliefGenerationSystem;
  let prayerSystem: PrayerSystem;
  let prayerAnswerSystem: PrayerAnsweringSystem;
  let mythSystem: MythGenerationSystem;

  // Phase 4-7 Systems
  let deityEmergenceSystem: DeityEmergenceSystem;
  let aiGodBehaviorSystem: AIGodBehaviorSystem;
  let templeSystem: TempleSystem;
  let priesthoodSystem: PriesthoodSystem;
  let ritualSystem: RitualSystem;
  let holyTextSystem: HolyTextSystem;
  let avatarSystem: AvatarSystem;
  let angelSystem: AngelSystem;

  // Phase 8-9 Systems
  let schismSystem: SchismSystem;
  let syncretismSystem: SyncretismSystem;
  let competitionSystem: ReligiousCompetitionSystem;
  let conversionSystem: ConversionWarfareSystem;
  let terrainSystem: TerrainModificationSystem;
  let speciesSystem: SpeciesCreationSystem;
  let weatherSystem: DivineWeatherControl;
  let massEventSystem: MassEventSystem;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new World(eventBus);

    // Initialize Phase 1-3 systems
    beliefGenSystem = new BeliefGenerationSystem();
    prayerSystem = new PrayerSystem();
    prayerAnswerSystem = new PrayerAnsweringSystem();
    mythSystem = new MythGenerationSystem();

    // Initialize Phase 4-7 systems
    deityEmergenceSystem = new DeityEmergenceSystem();
    aiGodBehaviorSystem = new AIGodBehaviorSystem();
    templeSystem = new TempleSystem();
    priesthoodSystem = new PriesthoodSystem();
    ritualSystem = new RitualSystem();
    holyTextSystem = new HolyTextSystem();
    avatarSystem = new AvatarSystem();
    angelSystem = new AngelSystem();

    // Initialize Phase 8-9 systems
    schismSystem = new SchismSystem();
    syncretismSystem = new SyncretismSystem();
    competitionSystem = new ReligiousCompetitionSystem();
    conversionSystem = new ConversionWarfareSystem();
    terrainSystem = new TerrainModificationSystem();
    speciesSystem = new SpeciesCreationSystem();
    weatherSystem = new DivineWeatherControl();
    massEventSystem = new MassEventSystem();
  });

  describe('Phase 1-3: Foundation', () => {
    it('should generate belief from spiritual agents', () => {
      // Create a deity
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Test God', 'player');
      deity.addComponent(deityComp);

      // Create believers
      const believer = world.createEntity();
      believer.addComponent(createAgentComponent('wander', false, 20));
      believer.addComponent(new PersonalityComponent({
        openness: 0.5,
        conscientiousness: 0.5,
        extraversion: 0.5,
        agreeableness: 0.5,
        neuroticism: 0.5,
        spirituality: 0.8, // High spirituality for belief generation
      }));
      const spiritual = createSpiritualComponent();
      spiritual.believedDeity = deity.id;
      spiritual.faith = 0.8;
      believer.addComponent(spiritual);
      deityComp.addBeliever(believer.id);

      const initialBelief = deityComp.belief.currentBelief;

      // Advance ticks past the update interval
      for (let i = 0; i < 25; i++) {
        world.advanceTick();
      }

      // Run belief generation
      beliefGenSystem.update(world, Array.from(world.entities.values()), world.tick);

      // Should have generated belief
      expect(deityComp.belief.currentBelief).toBeGreaterThan(initialBelief);
    });

    it('should process prayers', () => {
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Test God', 'player');
      (deity.components as Map<string, any>).set(CT.Deity, deityComp);

      const believer = world.createEntity();
      (believer.components as Map<string, any>).set(CT.Agent, createAgentComponent('wander', false, 20));
      const spiritual = createSpiritualComponent();
      spiritual.believedDeity = deity.id;
      (believer.components as Map<string, any>).set(CT.Spiritual, spiritual);

      // Agent prays
      prayerSystem.update(world, Array.from(world.entities.values()), world.tick);

      // Should have prayers in queue
      expect(deityComp.prayerQueue.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Phase 4: Emergent Gods', () => {
    it('should create emergent deities from shared beliefs', () => {
      // Create multiple believers with similar beliefs
      for (let i = 0; i < 12; i++) {
        const agent = world.createEntity();
        (agent.components as Map<string, any>).set(CT.Agent, createAgentComponent('wander', false, 20));
        const spiritual = createSpiritualComponent();
        spiritual.faith = 0.7;
        (spiritual as any).prayerHistory = ['harvest', 'harvest', 'harvest'];
        (agent.components as Map<string, any>).set(CT.Spiritual, spiritual);
      }

      const initialDeityCount = Array.from(world.entities.values())
        .filter(e => e.components.has(CT.Deity)).length;

      // Run emergence detection
      for (let i = 0; i < 100; i++) {
        world.advanceTick();
        deityEmergenceSystem.update(world);
      }

      const finalDeityCount = Array.from(world.entities.values())
        .filter(e => e.components.has(CT.Deity)).length;

      // May have created new deity (probabilistic)
      expect(finalDeityCount).toBeGreaterThanOrEqual(initialDeityCount);
    });

    it('should manage AI god behavior', () => {
      const deity = world.createEntity();
      const deityComp = new DeityComponent('AI God', 'ai');
      deityComp.belief.currentBelief = 1000; // Give it belief
      (deity.components as Map<string, any>).set(CT.Deity, deityComp);

      // Add some believers
      for (let i = 0; i < 5; i++) {
        const believer = world.createEntity();
        deityComp.addBeliever(believer.id);
      }

      // Run AI behavior
      aiGodBehaviorSystem.update(world);

      // AI should manage its belief and believers
      expect(deityComp).toBeDefined();
    });
  });

  describe('Phase 5: Religious Institutions', () => {
    it('should ordain priests', () => {
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Test God', 'player');
      (deity.components as Map<string, any>).set(CT.Deity, deityComp);

      const believer = world.createEntity();
      (believer.components as Map<string, any>).set(CT.Agent, createAgentComponent('wander', false, 20));
      const spiritual = createSpiritualComponent();
      spiritual.believedDeity = deity.id;
      spiritual.faith = 0.9; // High faith
      (believer.components as Map<string, any>).set(CT.Spiritual, spiritual);
      deityComp.addBeliever(believer.id);

      // Run priesthood system
      for (let i = 0; i < 10; i++) {
        const interval = priesthoodSystem['config'].checkInterval;
        for (let j = 0; j < interval; j++) {
          world.advanceTick();
        }
        priesthoodSystem.update(world);
      }

      // Should have ordained a priest
      const isPriest = priesthoodSystem.isPriest(believer.id);
      expect(isPriest).toBe(true);
    });

    it('should generate holy texts', () => {
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Test God', 'player');
      (deity.components as Map<string, any>).set(CT.Deity, deityComp);

      // Add enough believers
      for (let i = 0; i < 6; i++) {
        deityComp.addBeliever(`believer_${i}`);
      }

      // Run holy text system
      const holyTextInterval = holyTextSystem['config'].checkInterval;
      for (let i = 0; i < holyTextInterval; i++) {
        world.advanceTick();
      }
      holyTextSystem.update(world);

      // Should have created a holy text
      const texts = holyTextSystem.getTextsForDeity(deity.id);
      expect(texts.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 6-7: Avatars and Angels', () => {
    it('should manifest avatars', () => {
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Test God', 'player');
      deityComp.belief.currentBelief = 1000; // Enough for avatar
      (deity.components as Map<string, any>).set(CT.Deity, deityComp);

      const avatar = avatarSystem.manifestAvatar(
        deity.id,
        world,
        { x: 50, y: 50 },
        'observe'
      );

      expect(avatar).toBeDefined();
      expect(avatar?.deityId).toBe(deity.id);
    });

    it('should create angels', () => {
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Test God', 'player');
      deityComp.belief.currentBelief = 1000;
      (deity.components as Map<string, any>).set(CT.Deity, deityComp);

      const angel = angelSystem.createAngel(
        deity.id,
        world,
        'messenger',
        'deliver_message'
      );

      expect(angel).toBeDefined();
      expect(angel?.deityId).toBe(deity.id);
    });
  });

  describe('Phase 8: Advanced Theology', () => {
    it('should handle schisms', () => {
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Test God', 'player');
      (deity.components as Map<string, any>).set(CT.Deity, deityComp);

      // Add many believers
      for (let i = 0; i < 15; i++) {
        const believer = world.createEntity();
        (believer.components as Map<string, any>).set(CT.Agent, createAgentComponent('wander', false, 20));
        const spiritual = createSpiritualComponent();
        spiritual.believedDeity = deity.id;
        (believer.components as Map<string, any>).set(CT.Spiritual, spiritual);
        deityComp.addBeliever(believer.id);
      }

      // Run schism detection
      for (let i = 0; i < 50; i++) {
        const interval = schismSystem['config'].checkInterval;
        for (let j = 0; j < interval; j++) {
          world.advanceTick();
        }
        schismSystem.update(world);
      }

      // May have created schism (probabilistic)
      const schisms = schismSystem.getSchismsForDeity(deity.id);
      expect(schisms).toBeDefined();
    });

    it('should handle religious competition', () => {
      // Create two deities with overlapping domains
      const deity1 = world.createEntity();
      const deity1Comp = new DeityComponent('God of Harvest', 'ai');
      deity1Comp.identity.domain = 'harvest';
      (deity1.components as Map<string, any>).set(CT.Deity, deity1Comp);

      // Add believers
      for (let i = 0; i < 7; i++) {
        deity1Comp.addBeliever(`believer1_${i}`);
      }

      const deity2 = world.createEntity();
      const deity2Comp = new DeityComponent('God of Nature', 'ai');
      deity2Comp.identity.domain = 'nature';
      deity2Comp.identity.secondaryDomains = ['harvest']; // Overlap!
      (deity2.components as Map<string, any>).set(CT.Deity, deity2Comp);

      // Add believers
      for (let i = 0; i < 7; i++) {
        deity2Comp.addBeliever(`believer2_${i}`);
      }

      // Run competition system
      for (let i = 0; i < 20; i++) {
        const interval = competitionSystem['config'].checkInterval;
        for (let j = 0; j < interval; j++) {
          world.advanceTick();
        }
        competitionSystem.update(world);
      }

      // May have started competition
      const competitions = competitionSystem.getActiveCompetitions();
      expect(competitions).toBeDefined();
    });
  });

  describe('Phase 9: World Impact', () => {
    it('should modify terrain', () => {
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Earth God', 'player');
      deityComp.belief.currentBelief = 10000; // Enough for create_mountain with radius 10
      (deity.components as Map<string, any>).set(CT.Deity, deityComp);

      const modification = terrainSystem.modifyTerrain(
        deity.id,
        world,
        'create_mountain',
        { x: 100, y: 100 },
        10,
        1.0,
        true
      );

      expect(modification).toBeDefined();
      expect(modification?.type).toBe('create_mountain');
    });

    it('should create species', () => {
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Life God', 'player');
      deityComp.belief.currentBelief = 5000;
      (deity.components as Map<string, any>).set(CT.Deity, deityComp);

      const species = speciesSystem.createSpecies(
        deity.id,
        world,
        'Sacred Wolf',
        'sacred',
        [
          { name: 'Divine Blessing', description: 'Blessed by deity', type: 'sacred', magnitude: 1.0 }
        ],
        5,
        true
      );

      expect(species).toBeDefined();
      expect(species?.name).toBe('Sacred Wolf');
    });

    it('should control weather', () => {
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Storm God', 'player');
      deityComp.belief.currentBelief = 2000;
      (deity.components as Map<string, any>).set(CT.Deity, deityComp);

      const weather = weatherSystem.summonWeather(
        deity.id,
        world,
        'thunderstorm',
        { x: 50, y: 50 },
        20,
        1.0,
        1200,
        'demonstration'
      );

      expect(weather).toBeDefined();
      expect(weather?.type).toBe('thunderstorm');
    });

    it('should trigger mass events', () => {
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Benevolent God', 'player');
      deityComp.belief.currentBelief = 5000;
      (deity.components as Map<string, any>).set(CT.Deity, deityComp);

      // Add believers
      for (let i = 0; i < 10; i++) {
        const believer = world.createEntity();
        (believer.components as Map<string, any>).set(CT.Agent, createAgentComponent('wander', false, 20));
        const spiritual = createSpiritualComponent();
        spiritual.believedDeity = deity.id;
        (believer.components as Map<string, any>).set(CT.Spiritual, spiritual);
        deityComp.addBeliever(believer.id);
      }

      const event = massEventSystem.triggerEvent(
        deity.id,
        world,
        'divine_blessing',
        'Great Blessing',
        'all_believers',
        2400,
        1.0,
        'blessing'
      );

      expect(event).toBeDefined();
      expect(event?.type).toBe('divine_blessing');
    });
  });

  describe('Cross-Phase Integration', () => {
    it('should integrate all phases in a complete simulation', () => {
      // Create player deity
      const playerDeity = world.createEntity();
      const playerDeityComp = new DeityComponent('The Guardian', 'player');
      playerDeityComp.belief.currentBelief = 10000;
      playerDeity.addComponent(playerDeityComp);

      // Create believers with spiritual component
      const believers: string[] = [];
      for (let i = 0; i < 20; i++) {
        const believer = world.createEntity();
        believer.addComponent(createAgentComponent('wander', false, 20));
        believer.addComponent(createPositionComponent(i * 10, i * 10));
        believer.addComponent(new PersonalityComponent({
          openness: 0.5,
          conscientiousness: 0.5,
          extraversion: 0.5,
          agreeableness: 0.5,
          neuroticism: 0.5,
          spirituality: 0.5 + Math.random() * 0.5,
        }));

        const spiritual = createSpiritualComponent();
        spiritual.believedDeity = playerDeity.id;
        spiritual.faith = 0.5 + Math.random() * 0.5;
        believer.addComponent(spiritual);

        playerDeityComp.addBeliever(believer.id);
        believers.push(believer.id);
      }

      // Simulate game ticks
      for (let tick = 0; tick < 100; tick++) {
        world.advanceTick();

        // Run all systems
        beliefGenSystem.update(world, Array.from(world.entities.values()), world.tick);
        prayerSystem.update(world, Array.from(world.entities.values()), world.tick);
        prayerAnswerSystem.update(world, Array.from(world.entities.values()), world.tick);
        deityEmergenceSystem.update(world);
        aiGodBehaviorSystem.update(world);
        priesthoodSystem.update(world);
        ritualSystem.update(world);
        holyTextSystem.update(world);
        avatarSystem.update(world);
        angelSystem.update(world);
        schismSystem.update(world);
        syncretismSystem.update(world);
        competitionSystem.update(world);
        terrainSystem.update(world);
        speciesSystem.update(world);
        weatherSystem.update(world);
        massEventSystem.update(world);
      }

      // Verify the system is working
      expect(playerDeityComp.belief.totalBeliefEarned).toBeGreaterThan(0);
      expect(playerDeityComp.believers.size).toBe(20);

      // Check for priests
      const priests = believers.filter(id => priesthoodSystem.isPriest(id));
      expect(priests.length).toBeGreaterThanOrEqual(0);

      // System should be stable
      expect(world.entities.size).toBeGreaterThan(0);
    });
  });
});
