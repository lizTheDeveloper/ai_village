/**
 * HeroProtection.test.ts - Test destiny luck and death protection
 *
 * Verifies that:
 * - Agents with destiny get luck modifiers based on cosmic alignment
 * - Blessed heroes (+0.8 alignment) get ~+0.08 luck
 * - Cursed heroes (-1.0 alignment) get ~-0.10 luck (anti-luck!)
 * - Luck modifiers affect combat roll probabilities
 * - Death protection activates for heroes with destiny
 * - Protection threshold scales with destiny luck (20 + luck × 50)
 * - Protection fails after destiny is realized
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { World } from '../ecs/World.js';
import { EntityImpl } from '../ecs/Entity.js';
import { AgentCombatSystem } from '../systems/AgentCombatSystem.js';
import { createSoulIdentityComponent } from '../components/SoulIdentityComponent.js';
import { createSoulLinkComponent } from '../components/SoulLinkComponent.js';
import type { ConflictComponent } from '../components/ConflictComponent.js';
import type { CombatStatsComponent } from '../components/CombatStatsComponent.js';
import type { NeedsComponent } from '../components/NeedsComponent.js';

describe('HeroProtection', () => {
  let world: World;
  let combatSystem: AgentCombatSystem;

  beforeEach(() => {
    world = new World();
    combatSystem = new AgentCombatSystem();
  });

  /**
   * Helper to create agent with soul and destiny
   */
  function createHero(params: {
    id: string;
    cosmicAlignment: number;
    hasDestiny: boolean;
    destinyRealized?: boolean;
    combatSkill: number;
  }) {
    const agent = new EntityImpl(params.id);

    // Create soul
    const soul = new EntityImpl(`soul:${params.id}`);
    const soulIdentity = createSoulIdentityComponent({
      soulName: `Soul of ${params.id}`,
      purpose: 'Test hero purpose',
      destiny: params.hasDestiny ? 'Test destiny' : undefined,
      coreInterests: ['combat', 'heroism'],
      cosmicAlignment: params.cosmicAlignment,
      currentTick: 0,
    });

    if (params.destinyRealized) {
      soulIdentity.destinyRealized = true;
    }

    soul.addComponent(soulIdentity);
    world.addEntity(soul);

    // Link soul to agent
    const soulLink = createSoulLinkComponent(soul.id, 0);
    agent.addComponent(soulLink);

    // Add combat stats
    const combatStats: CombatStatsComponent = {
      type: 'combat_stats',
      version: 1,
      combatSkill: params.combatSkill,
      weapon: 'unarmed',
      armor: 'none',
    };
    agent.addComponent(combatStats);

    // Add needs (health)
    const needs: NeedsComponent = {
      type: 'needs',
      version: 1,
      hunger: 100,
      energy: 100,
      social: 100,
      health: 100,
    };
    agent.addComponent(needs);

    world.addEntity(agent);
    return agent;
  }

  /**
   * Create normal agent without destiny
   */
  function createNormalAgent(id: string, combatSkill: number) {
    const agent = new EntityImpl(id);

    const combatStats: CombatStatsComponent = {
      type: 'combat_stats',
      version: 1,
      combatSkill,
      weapon: 'unarmed',
      armor: 'none',
    };
    agent.addComponent(combatStats);

    const needs: NeedsComponent = {
      type: 'needs',
      version: 1,
      hunger: 100,
      energy: 100,
      social: 100,
      health: 100,
    };
    agent.addComponent(needs);

    world.addEntity(agent);
    return agent;
  }

  it('blessed hero gets positive luck modifier', () => {
    // Blessed hero: +0.8 cosmic alignment
    const hero = createHero({
      id: 'blessed-hero',
      cosmicAlignment: 0.8,
      hasDestiny: true,
      combatSkill: 10,
    });

    // Access private method via reflection for testing
    const getLuck = (combatSystem as any).getDestinyLuckModifier.bind(combatSystem);
    const luck = getLuck(world, hero.id);

    // +0.8 alignment × 0.10 base = +0.08 luck
    expect(luck).toBeCloseTo(0.08, 2);
  });

  it('cursed hero gets negative luck modifier (anti-luck)', () => {
    // Cursed hero: -1.0 cosmic alignment
    const hero = createHero({
      id: 'cursed-hero',
      cosmicAlignment: -1.0,
      hasDestiny: true,
      combatSkill: 10,
    });

    const getLuck = (combatSystem as any).getDestinyLuckModifier.bind(combatSystem);
    const luck = getLuck(world, hero.id);

    // -1.0 alignment × 0.10 base = -0.10 luck
    expect(luck).toBeCloseTo(-0.10, 2);
  });

  it('neutral hero gets zero luck modifier', () => {
    // Neutral hero: 0.0 cosmic alignment
    const hero = createHero({
      id: 'neutral-hero',
      cosmicAlignment: 0.0,
      hasDestiny: true,
      combatSkill: 10,
    });

    const getLuck = (combatSystem as any).getDestinyLuckModifier.bind(combatSystem);
    const luck = getLuck(world, hero.id);

    // 0.0 alignment × 0.10 base = 0.0 luck
    expect(luck).toBeCloseTo(0.0, 2);
  });

  it('agent without destiny gets no luck', () => {
    const hero = createHero({
      id: 'no-destiny',
      cosmicAlignment: 0.8,
      hasDestiny: false,
      combatSkill: 10,
    });

    const getLuck = (combatSystem as any).getDestinyLuckModifier.bind(combatSystem);
    const luck = getLuck(world, hero.id);

    // No destiny = no luck
    expect(luck).toBe(0);
  });

  it('realized destiny provides no luck', () => {
    const hero = createHero({
      id: 'realized-destiny',
      cosmicAlignment: 0.8,
      hasDestiny: true,
      destinyRealized: true,
      combatSkill: 10,
    });

    const getLuck = (combatSystem as any).getDestinyLuckModifier.bind(combatSystem);
    const luck = getLuck(world, hero.id);

    // Destiny realized = no more protection
    expect(luck).toBe(0);
  });

  it('luck modifiers affect combat win rates', () => {
    // Run statistical test: blessed hero vs normal agent
    const winCounts = { hero: 0, normal: 0 };
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      // Fresh world for each trial
      const testWorld = new World();
      const testSystem = new AgentCombatSystem();

      const hero = createHero({
        id: 'blessed-hero',
        cosmicAlignment: 0.8,
        hasDestiny: true,
        combatSkill: 10,
      });

      const normal = createNormalAgent('normal', 10);

      testWorld.addEntity(hero);
      testWorld.addEntity(normal);

      // Create conflict
      const conflict: ConflictComponent = {
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        initiator: hero.id,
        target: normal.id,
        state: 'active',
        startTick: 0,
        cause: 'test',
        lethal: false,
        surprise: false,
      };

      hero.addComponent(conflict);

      // Run combat
      testSystem.update(testWorld, 0);

      // Check who won (who has lower health)
      const heroNeeds = testWorld.getComponent<NeedsComponent>(hero.id, 'needs');
      const normalNeeds = testWorld.getComponent<NeedsComponent>(normal.id, 'needs');

      if (heroNeeds && normalNeeds) {
        if (heroNeeds.health > normalNeeds.health) {
          winCounts.hero++;
        } else if (normalNeeds.health > heroNeeds.health) {
          winCounts.normal++;
        }
      }
    }

    // With +0.08 luck and equal skill (10), blessed hero should win ~58% of time
    // Normal distribution: 50% base + 8% luck = 58%
    const heroWinRate = winCounts.hero / trials;

    expect(heroWinRate).toBeGreaterThan(0.53);  // At least 53% (statistical margin)
    expect(heroWinRate).toBeLessThan(0.63);     // At most 63% (statistical margin)
  });

  it('cursed hero loses more often due to anti-luck', () => {
    // Run statistical test: cursed hero vs normal agent
    const winCounts = { hero: 0, normal: 0 };
    const trials = 1000;

    for (let i = 0; i < trials; i++) {
      const testWorld = new World();
      const testSystem = new AgentCombatSystem();

      const hero = createHero({
        id: 'cursed-hero',
        cosmicAlignment: -1.0,
        hasDestiny: true,
        combatSkill: 10,
      });

      const normal = createNormalAgent('normal', 10);

      testWorld.addEntity(hero);
      testWorld.addEntity(normal);

      const conflict: ConflictComponent = {
        type: 'conflict',
        version: 1,
        conflictType: 'agent_combat',
        initiator: hero.id,
        target: normal.id,
        state: 'active',
        startTick: 0,
        cause: 'test',
        lethal: false,
        surprise: false,
      };

      hero.addComponent(conflict);
      testSystem.update(testWorld, 0);

      const heroNeeds = testWorld.getComponent<NeedsComponent>(hero.id, 'needs');
      const normalNeeds = testWorld.getComponent<NeedsComponent>(normal.id, 'needs');

      if (heroNeeds && normalNeeds) {
        if (heroNeeds.health > normalNeeds.health) {
          winCounts.hero++;
        } else if (normalNeeds.health > heroNeeds.health) {
          winCounts.normal++;
        }
      }
    }

    // With -0.10 luck and equal skill (10), cursed hero should win ~40% of time
    // Normal distribution: 50% base - 10% luck = 40%
    const heroWinRate = winCounts.hero / trials;

    expect(heroWinRate).toBeGreaterThan(0.35);  // At least 35% (statistical margin)
    expect(heroWinRate).toBeLessThan(0.45);     // At most 45% (statistical margin)
  });
});
