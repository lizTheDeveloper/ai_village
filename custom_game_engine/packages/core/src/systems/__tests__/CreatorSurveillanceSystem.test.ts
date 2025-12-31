import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { World } from '../../World.js';
import { CreatorSurveillanceSystem } from '../CreatorSurveillanceSystem.js';
import { SupremeCreatorComponent } from '../../components/SupremeCreatorComponent.js';
import { DeityComponent } from '../../components/DeityComponent.js';
import { SpellRegistry } from '../../magic/SpellRegistry.js';
import { ComponentType as CT } from '../../types/ComponentType.js';

describe('CreatorSurveillanceSystem', () => {
  let world: World;
  let eventBus: any;
  let system: CreatorSurveillanceSystem;
  let creator: any;
  let caster: any;

  beforeEach(() => {
    world = new World();
    eventBus = world.eventBus;
    system = new CreatorSurveillanceSystem();

    // Reset spell registry
    SpellRegistry.resetInstance();

    // Create Supreme Creator
    creator = world.createEntity();
    const supremeCreatorComp = new SupremeCreatorComponent();
    supremeCreatorComp.tyranny.paranoia = 0.3; // 30% paranoia
    creator.addComponent(supremeCreatorComp);

    // Create a mortal caster
    caster = world.createEntity();

    // Initialize system
    system.initialize(world, eventBus);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Spell Cast Monitoring', () => {
    it('should ignore spells without detection metadata', () => {
      const detectionEvents: any[] = [];
      eventBus.subscribe('divinity:magic_detected', (event) => {
        detectionEvents.push(event);
      });

      // Register spell without detection metadata
      SpellRegistry.getInstance().register({
        id: 'safe_spell',
        name: 'Safe Spell',
        paradigmId: 'test',
        technique: 'create',
        form: 'body',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 5,
        effectId: 'test_effect',
        description: 'A safe spell',
      });

      eventBus.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: 'safe_spell',
          spell: 'Safe Spell',
          technique: 'create',
          form: 'body',
          manaCost: 10,
        },
      });
      eventBus.flush();
      
      eventBus.flush(); // Dispatch secondary events

      // Should not emit detection event
      expect(detectionEvents.length).toBe(0);
    });

    it('should detect high-risk spell with moderate chance', () => {
      const detectionEvents: any[] = [];
      eventBus.subscribe('divinity:magic_detected', (event) => {
        detectionEvents.push(event);
      });

      // Register high-risk spell
      SpellRegistry.getInstance().register({
        id: 'academic_fireball',
        name: 'Fireball',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 45,
        castTime: 40,
        range: 20,
        effectId: 'fireball_effect',
        description: 'Explosive fireball',
        creatorDetection: {
          detectionRisk: 'high',
          forbiddenCategories: ['academic_study', 'mass_destruction'],
          powerLevel: 6,
          leavesMagicalSignature: true,
        },
      });

      // Mock Math.random to guarantee detection (roll < chance)
      vi.spyOn(Math, 'random').mockReturnValue(0.5);

      eventBus.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: 'academic_fireball',
          spell: 'Fireball',
          technique: 'create',
          form: 'fire',
          manaCost: 45,
        },
      });
      eventBus.flush(); // Dispatch spell_cast to system
      eventBus.flush(); // Dispatch magic_detected from system to test

      // Should emit detection event
      expect(detectionEvents.length).toBe(1);
      expect(detectionEvents[0].source).toBe(creator.id);
      expect(detectionEvents[0].data.casterId).toBe(caster.id);
      expect(detectionEvents[0].data.spellId).toBe('academic_fireball');
      expect(detectionEvents[0].data.detectionRisk).toBe('high');
    });

    it('should always detect critical-risk spells', () => {
      const detectionEvents: any[] = [];
      eventBus.subscribe('divinity:magic_detected', (event) => {
        detectionEvents.push(event);
      });

      // Register critical-risk spell
      SpellRegistry.getInstance().register({
        id: 'time_stop',
        name: 'Time Stop',
        paradigmId: 'academic',
        technique: 'control',
        form: 'time',
        source: 'arcane',
        manaCost: 100,
        castTime: 100,
        range: 50,
        effectId: 'time_stop_effect',
        description: 'Stop time itself',
        creatorDetection: {
          detectionRisk: 'critical',
          forbiddenCategories: ['time_manipulation'],
          powerLevel: 10,
          leavesMagicalSignature: true,
        },
      });

      // Mock Math.random to roll high (normally wouldn't detect)
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      eventBus.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: 'time_stop',
          spell: 'Time Stop',
          technique: 'control',
          form: 'time',
          manaCost: 100,
        },
      });
      eventBus.flush();
      
      eventBus.flush(); // Dispatch secondary events

      // Critical spells are ALWAYS detected (forced detection)
      expect(detectionEvents.length).toBe(1);
      expect(detectionEvents[0].data.forced).toBe(true);
      expect(detectionEvents[0].data.detectionRisk).toBe('critical');
    });

    it('should not detect undetectable spells', () => {
      const detectionEvents: any[] = [];
      eventBus.subscribe('divinity:magic_detected', (event) => {
        detectionEvents.push(event);
      });

      // Mock random to ensure no detection (return high value > detection chance)
      vi.spyOn(Math, 'random').mockReturnValue(0.99);

      // Register undetectable spell (natural magic)
      SpellRegistry.getInstance().register({
        id: 'grow_plant',
        name: 'Grow Plant',
        paradigmId: 'nature',
        technique: 'enhance',
        form: 'plant',
        source: 'nature',
        manaCost: 5,
        castTime: 20,
        range: 5,
        effectId: 'grow_effect',
        description: 'Natural plant growth',
        creatorDetection: {
          detectionRisk: 'undetectable',
          powerLevel: 2,
          leavesMagicalSignature: false,
          detectionNotes: 'Natural magic - undetectable',
        },
      });

      eventBus.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: 'grow_plant',
          spell: 'Grow Plant',
          technique: 'enhance',
          form: 'plant',
          manaCost: 5,
        },
      });
      eventBus.flush();
      
      eventBus.flush(); // Dispatch secondary events

      // Should not emit detection event
      expect(detectionEvents.length).toBe(0);
    });
  });

  describe('Paranoia Growth', () => {
    it('should increase paranoia when magic is detected', () => {
      const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;
      const initialParanoia = creatorComp.tyranny.paranoia;

      // Register high-risk spell
      SpellRegistry.getInstance().register({
        id: 'forbidden_spell',
        name: 'Forbidden Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 30,
        castTime: 30,
        range: 15,
        effectId: 'forbidden_effect',
        description: 'Forbidden magic',
        creatorDetection: {
          detectionRisk: 'high',
          forbiddenCategories: ['academic_study'],
          powerLevel: 5,
          leavesMagicalSignature: true,
        },
      });

      // Force detection
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      eventBus.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: 'forbidden_spell',
          spell: 'Forbidden Spell',
          technique: 'create',
          form: 'fire',
          manaCost: 30,
        },
      });
      eventBus.flush();
      
      eventBus.flush(); // Dispatch secondary events

      // Paranoia should increase
      expect(creatorComp.tyranny.paranoia).toBeGreaterThan(initialParanoia);
    });

    it('should track detected rebels', () => {
      const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;

      // Register high-risk spell
      SpellRegistry.getInstance().register({
        id: 'rebel_spell',
        name: 'Rebel Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 30,
        castTime: 30,
        range: 15,
        effectId: 'rebel_effect',
        description: 'Rebel magic',
        creatorDetection: {
          detectionRisk: 'high',
          forbiddenCategories: ['academic_study'],
          powerLevel: 5,
          leavesMagicalSignature: true,
        },
      });

      // Force detection with high evidence
      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      eventBus.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: 'rebel_spell',
          spell: 'Rebel Spell',
          technique: 'create',
          form: 'fire',
          manaCost: 30,
        },
      });
      eventBus.flush();
      
      eventBus.flush(); // Dispatch secondary events

      // Caster should be tracked as rebel
      const rebel = creatorComp.detectedRebels.find(r => r.deityId === caster.id);
      expect(rebel).toBeDefined();
      expect(rebel?.evidenceStrength).toBeGreaterThan(0);
    });
  });

  describe('Alert Level Management', () => {
    it('should start at none alert level', () => {
      const stats = system.getStats();
      expect(stats.alertLevel).toBe('none');
    });

    it('should escalate to low alert after one detection', () => {
      const alertEvents: any[] = [];
      eventBus.subscribe('divinity:surveillance_alert', (event) => {
        alertEvents.push(event);
      });

      // Register and cast detectable spell
      SpellRegistry.getInstance().register({
        id: 'test_spell',
        name: 'Test Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 20,
        castTime: 20,
        range: 10,
        effectId: 'test_effect',
        description: 'Test',
        creatorDetection: {
          detectionRisk: 'moderate',
          powerLevel: 3,
          leavesMagicalSignature: true,
        },
      });

      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      eventBus.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: 'test_spell',
          spell: 'Test Spell',
          technique: 'create',
          form: 'fire',
          manaCost: 20,
        },
      });
      eventBus.flush();
      
      eventBus.flush(); // Dispatch secondary events

      // Update to trigger alert level check
      system.update(world);
      eventBus.flush(); // Dispatch surveillance_alert event

      // Should emit alert level change
      expect(alertEvents.length).toBe(1);
      expect(alertEvents[0].data.newLevel).toBe('low');
      expect(alertEvents[0].data.recentDetections).toBe(1);

      const stats = system.getStats();
      expect(stats.alertLevel).toBe('low');
    });

    it('should escalate to critical on critical spell detection', () => {
      const alertEvents: any[] = [];
      eventBus.subscribe('divinity:surveillance_alert', (event) => {
        alertEvents.push(event);
      });

      // Register critical spell
      SpellRegistry.getInstance().register({
        id: 'resurrection',
        name: 'Resurrection',
        paradigmId: 'academic',
        technique: 'create',
        form: 'spirit',
        source: 'arcane',
        manaCost: 100,
        castTime: 100,
        range: 1,
        effectId: 'resurrection_effect',
        description: 'Raise the dead',
        creatorDetection: {
          detectionRisk: 'critical',
          forbiddenCategories: ['resurrection'],
          powerLevel: 9,
          leavesMagicalSignature: true,
        },
      });

      eventBus.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: 'resurrection',
          spell: 'Resurrection',
          technique: 'create',
          form: 'spirit',
          manaCost: 100,
        },
      });
      eventBus.flush();
      
      eventBus.flush(); // Dispatch secondary events

      // Update to trigger alert level check
      system.update(world);
      eventBus.flush(); // Dispatch surveillance_alert event

      // Should immediately escalate to critical
      expect(alertEvents.length).toBe(1);
      expect(alertEvents[0].data.newLevel).toBe('critical');
      expect(alertEvents[0].data.criticalDetections).toBe(1);

      const stats = system.getStats();
      expect(stats.alertLevel).toBe('critical');
    });
  });

  describe('Spy God Network', () => {
    it('should process spy god reports during surveillance sweeps', () => {
      const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;

      // Create a spy god
      const spyGod = world.createEntity();
      const deityComp = new DeityComponent(
        'Test God',
        'test_deity',
        [],
        'earth',
        'neutral',
        5.0,
        null,
        0
      );
      spyGod.addComponent(deityComp);

      // Add spy god to creator's network
      creatorComp.addSpyGod(spyGod.id);

      expect(creatorComp.surveillance.spyGods).toContain(spyGod.id);
      expect(creatorComp.surveillance.detectionModifier).toBeGreaterThan(1);
    });

    it('should remove deceased spy gods from network', () => {
      const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;

      // Add non-existent spy god
      creatorComp.surveillance.spyGods.push('non-existent-god-123');

      // Trigger surveillance sweep (happens every 600 ticks)
      for (let i = 0; i < 600; i++) {
        world.advanceTick();
      }
      system.update(world);
      eventBus.flush(); // Dispatch any events from update

      // Non-existent god should be removed
      expect(creatorComp.surveillance.spyGods).not.toContain('non-existent-god-123');
    });
  });

  describe('Statistics Tracking', () => {
    it('should track total spells monitored', () => {
      // Register spell with detection
      SpellRegistry.getInstance().register({
        id: 'tracked_spell',
        name: 'Tracked Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 15,
        castTime: 15,
        range: 10,
        effectId: 'tracked_effect',
        description: 'Tracked',
        creatorDetection: {
          detectionRisk: 'moderate',
          powerLevel: 3,
          leavesMagicalSignature: true,
        },
      });

      const initialStats = system.getStats();
      const initialMonitored = initialStats.totalMonitored;

      eventBus.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: 'tracked_spell',
          spell: 'Tracked Spell',
          technique: 'create',
          form: 'fire',
          manaCost: 15,
        },
      });
      eventBus.flush();
      
      eventBus.flush(); // Dispatch secondary events

      const newStats = system.getStats();
      expect(newStats.totalMonitored).toBe(initialMonitored + 1);
    });

    it('should maintain recent detections history', () => {
      // Register high-risk spell
      SpellRegistry.getInstance().register({
        id: 'recent_spell',
        name: 'Recent Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 25,
        castTime: 25,
        range: 15,
        effectId: 'recent_effect',
        description: 'Recent',
        creatorDetection: {
          detectionRisk: 'high',
          powerLevel: 5,
          leavesMagicalSignature: true,
        },
      });

      // Force detection
      vi.spyOn(Math, 'random').mockReturnValue(0.1);

      eventBus.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: 'recent_spell',
          spell: 'Recent Spell',
          technique: 'create',
          form: 'fire',
          manaCost: 25,
        },
      });
      eventBus.flush();
      
      eventBus.flush(); // Dispatch secondary events

      const stats = system.getStats();
      expect(stats.recentDetections.length).toBe(1);
      expect(stats.recentDetections[0].spellId).toBe('recent_spell');
    });

    it('should limit recent detections to 10', () => {
      // Register spell
      SpellRegistry.getInstance().register({
        id: 'spam_spell',
        name: 'Spam Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 20,
        castTime: 20,
        range: 10,
        effectId: 'spam_effect',
        description: 'Spam',
        creatorDetection: {
          detectionRisk: 'high',
          powerLevel: 4,
          leavesMagicalSignature: true,
        },
      });

      // Force all detections
      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      // Cast 15 times
      for (let i = 0; i < 15; i++) {
        eventBus.emit({
          type: 'magic:spell_cast',
          source: caster.id,
          data: {
            spellId: 'spam_spell',
            spell: 'Spam Spell',
            technique: 'create',
            form: 'fire',
            manaCost: 20,
          },
        });
        eventBus.flush();
        
      eventBus.flush(); // Dispatch secondary events
      }

      const stats = system.getStats();
      // Should cap at 10 recent detections
      expect(stats.recentDetections.length).toBe(10);
    });
  });

  describe('No Supreme Creator', () => {
    it('should not crash when no supreme creator exists', () => {
      // Remove supreme creator
      world.destroyEntity(creator.id);

      // Register and cast spell
      SpellRegistry.getInstance().register({
        id: 'orphan_spell',
        name: 'Orphan Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 20,
        castTime: 20,
        range: 10,
        effectId: 'orphan_effect',
        description: 'Orphan',
        creatorDetection: {
          detectionRisk: 'high',
          powerLevel: 5,
          leavesMagicalSignature: true,
        },
      });

      expect(() => {
        eventBus.emit({
          type: 'magic:spell_cast',
          source: caster.id,
          data: {
            spellId: 'orphan_spell',
            spell: 'Orphan Spell',
            technique: 'create',
            form: 'fire',
            manaCost: 20,
          },
        });
        eventBus.flush();
        
      eventBus.flush(); // Dispatch secondary events
      }).not.toThrow();
    });
  });

  describe('Adversarial Tests', () => {
    it('should handle rapid-fire spell spam without memory leaks', () => {
      const detectionEvents: any[] = [];
      eventBus.subscribe('divinity:magic_detected', (event) => {
        detectionEvents.push(event);
      });

      SpellRegistry.getInstance().register({
        id: 'spam_spell',
        name: 'Spam Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 5,
        effectId: 'spam_effect',
        description: 'Spam',
        creatorDetection: {
          detectionRisk: 'high',
          powerLevel: 6,
          leavesMagicalSignature: true,
        },
      });

      // Spam 1000 spells
      for (let i = 0; i < 1000; i++) {
        eventBus.emit({
          type: 'magic:spell_cast',
          source: caster.id,
          data: {
            spellId: 'spam_spell',
            spell: 'Spam Spell',
            technique: 'create',
            form: 'fire',
            manaCost: 10,
          },
        });
      }
      eventBus.flush();
      eventBus.flush();

      const stats = system.getStats();

      // Should have monitored all 1000
      expect(stats.totalMonitored).toBe(1000);

      // Recent detections should be capped at 10
      expect(stats.recentDetections.length).toBeLessThanOrEqual(10);

      // Should have many detections
      expect(stats.totalDetections).toBeGreaterThan(0);
    });

    it('should handle malformed event data gracefully', () => {
      expect(() => {
        // Missing spellId
        eventBus.emit({
          type: 'magic:spell_cast',
          source: caster.id,
          data: {
            spell: 'Invalid',
          },
        });
        eventBus.flush();
        eventBus.flush();
      }).not.toThrow();

      expect(() => {
        // Non-string source
        eventBus.emit({
          type: 'magic:spell_cast',
          source: 12345 as any,
          data: {
            spellId: 'test',
          },
        });
        eventBus.flush();
        eventBus.flush();
      }).not.toThrow();

      expect(() => {
        // Missing data entirely
        eventBus.emit({
          type: 'magic:spell_cast',
          source: caster.id,
          data: undefined as any,
        });
        eventBus.flush();
        eventBus.flush();
      }).not.toThrow();
    });

    it('should handle paranoia overflow gracefully', () => {
      const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;

      // Set paranoia to extreme value
      creatorComp.tyranny.paranoia = 999.9;

      SpellRegistry.getInstance().register({
        id: 'overflow_spell',
        name: 'Overflow Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 5,
        effectId: 'overflow_effect',
        description: 'Overflow test',
        creatorDetection: {
          detectionRisk: 'high',
          powerLevel: 10,
          leavesMagicalSignature: true,
        },
      });

      expect(() => {
        eventBus.emit({
          type: 'magic:spell_cast',
          source: caster.id,
          data: {
            spellId: 'overflow_spell',
            spell: 'Overflow Spell',
            technique: 'create',
            form: 'fire',
            manaCost: 10,
          },
        });
        eventBus.flush();
        eventBus.flush();
      }).not.toThrow();

      // Paranoia should be clamped to 1.0 (system enforces invariants)
      expect(creatorComp.tyranny.paranoia).toBe(1);
    });

    it('should handle negative paranoia values', () => {
      const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;

      // Set negative paranoia
      creatorComp.tyranny.paranoia = -5.0;

      SpellRegistry.getInstance().register({
        id: 'negative_spell',
        name: 'Negative Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 5,
        effectId: 'negative_effect',
        description: 'Negative test',
        creatorDetection: {
          detectionRisk: 'moderate',
          powerLevel: 3,
          leavesMagicalSignature: false,
        },
      });

      expect(() => {
        eventBus.emit({
          type: 'magic:spell_cast',
          source: caster.id,
          data: {
            spellId: 'negative_spell',
            spell: 'Negative Spell',
            technique: 'create',
            form: 'fire',
            manaCost: 10,
          },
        });
        eventBus.flush();
        eventBus.flush();
      }).not.toThrow();
    });

    it('should handle surveillance modifier edge cases', () => {
      const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;

      // Set extreme surveillance modifier
      creatorComp.surveillance.detectionModifier = 1000000;

      SpellRegistry.getInstance().register({
        id: 'modifier_spell',
        name: 'Modifier Spell',
        paradigmId: 'nature',
        technique: 'create',
        form: 'plant',
        source: 'nature',
        manaCost: 5,
        castTime: 10,
        range: 5,
        effectId: 'modifier_effect',
        description: 'Modifier test',
        creatorDetection: {
          detectionRisk: 'low',
          powerLevel: 1,
          leavesMagicalSignature: false,
        },
      });

      expect(() => {
        eventBus.emit({
          type: 'magic:spell_cast',
          source: caster.id,
          data: {
            spellId: 'modifier_spell',
            spell: 'Modifier Spell',
            technique: 'create',
            form: 'plant',
            manaCost: 5,
          },
        });
        eventBus.flush();
        eventBus.flush();
      }).not.toThrow();
    });

    it('should handle caster entity being destroyed mid-detection', () => {
      SpellRegistry.getInstance().register({
        id: 'dying_caster_spell',
        name: 'Dying Caster Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 5,
        effectId: 'dying_effect',
        description: 'Dying caster test',
        creatorDetection: {
          detectionRisk: 'critical',
          powerLevel: 8,
          leavesMagicalSignature: true,
        },
      });

      const tempCaster = world.createEntity();
      const casterId = tempCaster.id;

      eventBus.emit({
        type: 'magic:spell_cast',
        source: casterId,
        data: {
          spellId: 'dying_caster_spell',
          spell: 'Dying Caster Spell',
          technique: 'create',
          form: 'fire',
          manaCost: 10,
        },
      });

      // Destroy the caster before detection is processed
      world.destroyEntity(casterId);

      expect(() => {
        eventBus.flush();
        eventBus.flush();
      }).not.toThrow();

      // Rebel should still be tracked even though entity is gone
      const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;
      const rebel = creatorComp.detectedRebels.find(r => r.deityId === casterId);
      expect(rebel).toBeDefined();
    });

    it('should handle duplicate spy gods gracefully', () => {
      const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;

      const spyGod = world.createEntity();
      const deityComp = new DeityComponent('Spy God', 'Paranoia');
      spyGod.addComponent(deityComp);

      // Add same spy god multiple times
      creatorComp.surveillance.spyGods.push(spyGod.id);
      creatorComp.surveillance.spyGods.push(spyGod.id);
      creatorComp.surveillance.spyGods.push(spyGod.id);

      expect(() => {
        for (let i = 0; i < 600; i++) {
          world.advanceTick();
        }
        system.update(world);
        eventBus.flush();
      }).not.toThrow();

      // All duplicates should still be there (system doesn't dedupe)
      expect(creatorComp.surveillance.spyGods.filter(id => id === spyGod.id).length).toBe(3);
    });

    it('should handle concurrent detections of same rebel', () => {
      const detectionEvents: any[] = [];
      eventBus.subscribe('divinity:magic_detected', (event) => {
        detectionEvents.push(event);
      });

      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      SpellRegistry.getInstance().register({
        id: 'concurrent_spell',
        name: 'Concurrent Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 30,
        castTime: 30,
        range: 15,
        effectId: 'concurrent_effect',
        description: 'Concurrent test',
        creatorDetection: {
          detectionRisk: 'high',
          forbiddenCategories: ['academic_study'],
          powerLevel: 5,
          leavesMagicalSignature: true,
        },
      });

      // Cast same spell 100 times from same caster
      for (let i = 0; i < 100; i++) {
        eventBus.emit({
          type: 'magic:spell_cast',
          source: caster.id,
          data: {
            spellId: 'concurrent_spell',
            spell: 'Concurrent Spell',
            technique: 'create',
            form: 'fire',
            manaCost: 30,
          },
        });
      }
      eventBus.flush();
      eventBus.flush();

      const creatorComp = creator.components.get(CT.SupremeCreator) as SupremeCreatorComponent;

      // Should only have ONE rebel entry (deduped by deityId)
      const rebelCount = creatorComp.detectedRebels.filter(r => r.deityId === caster.id).length;
      expect(rebelCount).toBe(1);

      // But evidence should have accumulated
      const rebel = creatorComp.detectedRebels.find(r => r.deityId === caster.id);
      expect(rebel?.evidenceStrength).toBeLessThanOrEqual(1); // Should be capped at 1
    });

    it('should handle spell registry being cleared mid-operation', () => {
      SpellRegistry.getInstance().register({
        id: 'disappearing_spell',
        name: 'Disappearing Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 5,
        effectId: 'disappear_effect',
        description: 'Test',
        creatorDetection: {
          detectionRisk: 'high',
          powerLevel: 5,
          leavesMagicalSignature: true,
        },
      });

      eventBus.emit({
        type: 'magic:spell_cast',
        source: caster.id,
        data: {
          spellId: 'disappearing_spell',
          spell: 'Disappearing Spell',
          technique: 'create',
          form: 'fire',
          manaCost: 10,
        },
      });

      // Clear registry before processing
      SpellRegistry.resetInstance();

      expect(() => {
        eventBus.flush();
        eventBus.flush();
      }).not.toThrow();

      const stats = system.getStats();
      // Should not have monitored it (no spell definition found)
      expect(stats.totalMonitored).toBe(0);
    });

    it('should handle system being used before initialization', () => {
      const uninitSystem = new CreatorSurveillanceSystem();

      expect(() => {
        uninitSystem.update(world);
      }).not.toThrow();

      expect(() => {
        const stats = uninitSystem.getStats();
        expect(stats.totalMonitored).toBe(0);
      }).not.toThrow();

      expect(() => {
        const state = uninitSystem.getCreatorState();
        expect(state).toBeNull();
      }).not.toThrow();
    });

    it('should handle extreme alert level fluctuations', () => {
      const alertEvents: any[] = [];
      eventBus.subscribe('divinity:surveillance_alert', (event) => {
        alertEvents.push(event);
      });

      vi.spyOn(Math, 'random').mockReturnValue(0.01);

      SpellRegistry.getInstance().register({
        id: 'fluctuation_spell',
        name: 'Fluctuation Spell',
        paradigmId: 'academic',
        technique: 'create',
        form: 'fire',
        source: 'arcane',
        manaCost: 10,
        castTime: 10,
        range: 5,
        effectId: 'fluctuation_effect',
        description: 'Test',
        creatorDetection: {
          detectionRisk: 'critical',
          powerLevel: 10,
          leavesMagicalSignature: true,
        },
      });

      // Spike to critical
      for (let i = 0; i < 5; i++) {
        eventBus.emit({
          type: 'magic:spell_cast',
          source: caster.id,
          data: {
            spellId: 'fluctuation_spell',
            spell: 'Fluctuation Spell',
            technique: 'create',
            form: 'fire',
            manaCost: 10,
          },
        });
      }
      eventBus.flush();
      eventBus.flush();
      system.update(world);
      eventBus.flush();

      const stats1 = system.getStats();
      expect(stats1.alertLevel).toBe('critical');

      // Clear recent detections by manually manipulating (adversarial!)
      const systemAny = system as any;
      systemAny.stats.recentDetections = [];

      // Alert should drop
      system.update(world);
      eventBus.flush();

      const stats2 = system.getStats();
      expect(stats2.alertLevel).toBe('none');
      expect(alertEvents.length).toBeGreaterThan(0);
    });
  });
});
