/**
 * Belief Attribution System - End-to-End Integration Test
 *
 * Tests the complete flow of:
 * 1. Divine events occurring (miracles, smites, answered prayers)
 * 2. Witnesses attributing events to deities based on their beliefs
 * 3. Domain-specific belief accumulating based on perceived powers
 * 4. Gods accruing new domains through misattribution
 *
 * Uses Groq API with Qwen 32B for LLM-based attribution decisions.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { EventBusImpl } from '../events/EventBus.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { OpenAICompatProvider } from '@ai-village/llm';

// Divinity imports
import { DeityComponent } from '../components/DeityComponent.js';
import { createSpiritualComponent } from '../components/SpiritualComponent.js';
import { createAgentComponent } from '../components/AgentComponent.js';
import { createPositionComponent } from '../components/PositionComponent.js';
import { PersonalityComponent } from '../components/PersonalityComponent.js';

// Belief system imports
import {
  createInitialPerceivedIdentity,
  processMiracleWitness,
  processPrayerAnswered,
  processMisattributedEvent,
  calculateBeliefContribution,
  type DeityPerceivedIdentity,
  type DivineDomain,
} from '../divinity/index.js';

// Attribution system imports
import {
  calculateAttribution,
  createAttributableEvent,
  createCreatorInterventionSource,
  createSmiteEffect,
  EFFECT_DOMAIN_MAPPING,
  type AttributionFactors,
  type TrueSource,
  type ObservableEffect,
} from '../divinity/AttributionSystem.js';

// Load environment variables
const GROQ_API_KEY = process.env.GROQ_API_KEY;

describe('Belief Attribution System - E2E Integration', () => {
  let world: World;
  let llmProvider: OpenAICompatProvider;

  beforeEach(() => {
    const eventBus = new EventBusImpl();
    world = new World(eventBus);

    // Set up Groq with Qwen 32B
    llmProvider = new OpenAICompatProvider(
      'qwen/qwen3-32b',
      'https://api.groq.com/openai/v1',
      GROQ_API_KEY
    );
  });

  describe('Domain Belief Accumulation', () => {
    it('should accumulate domain-specific belief from perceived powers', () => {
      // Create a storm god deity
      const stormGod = world.createEntity();
      const stormDeityComp = new DeityComponent('Thunderax', 'ai');
      stormGod.addComponent(stormDeityComp);

      // Create perceived identity - believers think this god controls storms
      const identity = createInitialPerceivedIdentity();

      // Process a witnessed miracle - god summoned lightning
      const witnessResult = processMiracleWitness(
        'storm',
        'Called down lightning from the heavens',
        0.8, // High faith witness
        identity
      );

      // Should gain both general and domain belief
      expect(witnessResult.generalBeliefGained).toBeGreaterThan(0);
      expect(witnessResult.domainBeliefGained.storm).toBeGreaterThan(0);
      expect(witnessResult.isFirstWitness).toBe(true);
      expect(witnessResult.perceivedPower).not.toBeNull();
      expect(witnessResult.perceivedPower?.domain).toBe('storm');

      // Identity should now have storm as a perceived power
      expect(identity.perceivedPowers.length).toBe(1);
      expect(identity.perceivedPowers[0].domain).toBe('storm');
    });

    it('should split belief contribution based on perceived domains', () => {
      // Believer who thinks the god controls storm and war
      const perceivedDomains: DivineDomain[] = ['storm', 'war'];
      const powerStrengths: Partial<Record<DivineDomain, number>> = {
        storm: 0.8, // Strong storm association
        war: 0.4,   // Moderate war association
      };

      const contribution = calculateBeliefContribution(
        10.0, // Total belief
        perceivedDomains,
        powerStrengths
      );

      // Should split between general and domain
      expect(contribution.generalBelief).toBeGreaterThan(0);
      expect(contribution.generalBelief).toBeLessThan(10.0);

      // Domain belief should favor storm (stronger association)
      expect(contribution.domainBelief.storm).toBeGreaterThan(0);
      expect(contribution.domainBelief.war).toBeGreaterThan(0);
      expect(contribution.domainBelief.storm!).toBeGreaterThan(contribution.domainBelief.war!);

      // Total should equal input
      const total = contribution.generalBelief +
        (contribution.domainBelief.storm ?? 0) +
        (contribution.domainBelief.war ?? 0);
      expect(total).toBeCloseTo(10.0, 5);
    });
  });

  describe('Miracle and Prayer Bonuses', () => {
    it('should give larger bonus for first witnessed miracle in a domain', () => {
      const identity = createInitialPerceivedIdentity();

      // First miracle
      const first = processMiracleWitness('healing', 'Cured the plague', 0.7, identity);

      // Second miracle in same domain
      const second = processMiracleWitness('healing', 'Healed a broken leg', 0.7, identity);

      // First should have the bonus
      expect(first.isFirstWitness).toBe(true);
      expect(second.isFirstWitness).toBe(false);
      expect(first.totalBonus).toBeGreaterThan(second.totalBonus);
    });

    it('should give exact match bonus for answered prayers', () => {
      const identity = createInitialPerceivedIdentity();

      // Prayer was exactly answered
      const exactMatch = processPrayerAnswered(
        'harvest',
        'Rain came after praying for it',
        0.8,
        identity,
        true // Exact match
      );

      // Generic answered prayer
      const partialMatch = processPrayerAnswered(
        'harvest',
        'Crops grew well this season',
        0.8,
        identity,
        false // Not exact
      );

      // Exact match should give 2x bonus
      expect(exactMatch.exactMatch).toBe(true);
      expect(partialMatch.exactMatch).toBe(false);
      expect(exactMatch.totalBonus).toBeGreaterThan(partialMatch.totalBonus);
    });
  });

  describe('Misattribution System', () => {
    it('should attribute Supreme Creator actions to known deities', () => {
      // Set up: Supreme Creator smites someone
      const trueSource = createCreatorInterventionSource('smite');
      const effect = createSmiteEffect('fire', 'A pillar of fire consumed the blasphemer');

      // Witness factors - they know about a fire god
      const factors: AttributionFactors = {
        knownDeities: ['fire-god-123', 'harvest-god-456'],
        primaryDeity: 'fire-god-123',
        faithLevel: 0.8,
        domainKnowledge: new Map<DivineDomain, string>([
          ['fire', 'fire-god-123'],
          ['war', 'fire-god-123'],
          ['harvest', 'harvest-god-456'],
          ['nature', 'harvest-god-456'],
        ]),
        recentPrayers: [],
        skepticism: 0.1,
        religiousKnowledge: 0.6,
        previousAttributions: [],
      };

      const attribution = calculateAttribution(effect, trueSource, factors);

      // Should attribute to fire god, not creator
      expect(attribution.attributedTo.deityId).toBe('fire-god-123');
      expect(attribution.attributedTo.type).toBe('deity');
      expect(attribution.confidence).toBeGreaterThan(0.3);

      // True source tracking
      expect(trueSource.type).toBe('supreme_creator');
    });

    it('should create new domain perception from misattributed event', () => {
      // A god gets blamed for something they didn't do
      const identity = createInitialPerceivedIdentity();

      // Event: Strange weather happens, blamed on the local deity
      const result = processMisattributedEvent(
        'storm',
        'A sudden thunderstorm destroyed the enemy camp',
        5, // 5 witnesses
        0.6, // Average faith
        identity
      );

      // Should gain storm domain belief
      expect(result.domainBeliefGained).toBeGreaterThan(0);
      expect(result.isNewDomain).toBe(true);
      expect(result.perceivedPower.domain).toBe('storm');
      expect(result.perceivedPower.origin).toBe('misattributed_event');

      // Identity now includes storm
      expect(identity.perceivedPowers.some(p => p.domain === 'storm')).toBe(true);
    });

    it('should reinforce existing domain from repeated misattribution', () => {
      const identity = createInitialPerceivedIdentity();

      // First misattribution
      const first = processMisattributedEvent(
        'storm',
        'Lightning struck the old oak',
        3,
        0.5,
        identity
      );

      const initialStrength = first.perceivedPower.strength;

      // Second misattribution - same domain
      const second = processMisattributedEvent(
        'storm',
        'Rain came during the drought',
        10, // More witnesses this time
        0.7,
        identity
      );

      // Should be the same power, now reinforced
      expect(second.isNewDomain).toBe(false);
      expect(second.perceivedPower.strength).toBeGreaterThan(initialStrength);
      expect(second.perceivedPower.believerCount).toBeGreaterThan(3);
    });
  });

  describe('Effect-Domain Mapping', () => {
    it('should map weather effects to storm domain', () => {
      const domains = EFFECT_DOMAIN_MAPPING.weather;
      expect(domains).toContain('storm');
      expect(domains).toContain('nature');
    });

    it('should map fire effects to fire and war domains', () => {
      const domains = EFFECT_DOMAIN_MAPPING.fire;
      expect(domains).toContain('fire');
      expect(domains).toContain('war');
    });

    it('should map healing effects to healing domain', () => {
      const domains = EFFECT_DOMAIN_MAPPING.healing;
      expect(domains).toContain('healing');
    });
  });

  describe('Full Attribution Flow', () => {
    it('should complete full cycle: event -> attribution -> domain belief', () => {
      // 1. Create a deity
      const deity = world.createEntity();
      const deityComp = new DeityComponent('Stormcaller', 'ai');
      deity.addComponent(deityComp);

      // 2. Create perceived identity (initially empty)
      const identity = createInitialPerceivedIdentity();

      // 3. Supreme Creator does something
      const trueSource = createCreatorInterventionSource('smite');
      const effect = createSmiteEffect('weather', 'A tornado demolished the village');

      // 4. Witness factors - they believe in Stormcaller
      const factors: AttributionFactors = {
        knownDeities: [deity.id],
        primaryDeity: deity.id,
        faithLevel: 0.8,
        domainKnowledge: new Map<DivineDomain, string>([
          ['storm', deity.id],
        ]),
        recentPrayers: [{ deityId: deity.id, timestamp: Date.now() - 1000 }],
        skepticism: 0.1,
        religiousKnowledge: 0.5,
        previousAttributions: [],
      };

      // 5. Calculate attribution
      const attribution = calculateAttribution(effect, trueSource, factors);

      // 6. They blamed Stormcaller
      expect(attribution.attributedTo.deityId).toBe(deity.id);

      // 7. This creates misattributed domain belief
      const misattributionResult = processMisattributedEvent(
        'storm',
        attribution.reasoning.narrative,
        1, // Single witness
        0.7,
        identity
      );

      // 8. Stormcaller now has storm perception reinforced
      expect(misattributionResult.domainBeliefGained).toBeGreaterThan(0);
      expect(identity.perceivedPowers.some(p => p.domain === 'storm')).toBe(true);

      // 9. Future belief contributions include storm domain
      const contribution = calculateBeliefContribution(
        5.0,
        identity.primaryDomains.length > 0 ? identity.primaryDomains : ['storm'],
        { storm: identity.perceivedPowers.find(p => p.domain === 'storm')?.strength ?? 0.5 }
      );

      expect(contribution.domainBelief.storm).toBeGreaterThan(0);
    });
  });

  describe('LLM-Based Attribution (Groq/Qwen 32B)', { timeout: 30000 }, () => {
    // Skip in vitest due to AbortSignal compatibility issue
    // This test works when run via browser or direct node execution
    it.skip('should use LLM to generate attribution reasoning', async () => {
      // Skip if no API key
      if (!GROQ_API_KEY || GROQ_API_KEY.length < 10) {
        console.log('Skipping LLM test - no Groq API key');
        return;
      }

      // Check if LLM is available
      const isAvailable = await llmProvider.isAvailable();
      if (!isAvailable) {
        console.log('Skipping LLM test - Groq API not available');
        return;
      }

      // Test LLM can reason about attribution
      const prompt = `You are a villager who just witnessed a miraculous event. A bolt of lightning struck down a criminal who had been terrorizing the village.

You believe in two gods:
1. Thunderax, the Storm Lord - god of storms, lightning, and justice
2. Mara, the Harvest Mother - goddess of crops, fertility, and peace

Based on what you witnessed, which god do you think caused this? Answer in JSON format:
{
  "attributedGod": "name",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation"
}`;

      const response = await llmProvider.generate({
        prompt,
        temperature: 0.3,
        maxTokens: 200,
      });

      expect(response.text).toBeTruthy();
      expect(response.text.length).toBeGreaterThan(10);

      // Should attribute to storm god
      const lowerText = response.text.toLowerCase();
      expect(lowerText).toMatch(/thunderax|storm/i);
    });
  });
});
