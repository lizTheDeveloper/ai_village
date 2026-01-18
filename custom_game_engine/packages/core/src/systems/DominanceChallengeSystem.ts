import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { SystemId, ComponentType } from '../types.js';
import type { World } from '../ecs/World.js';
import type { EventBus } from '../events/EventBus.js';
import type { Entity } from '../ecs/Entity.js';
import { EntityImpl } from '../ecs/Entity.js';
import type { Component } from '../ecs/Component.js';
import type { ConflictComponent } from '../components/ConflictComponent.js';
import type { DominanceRankComponent } from '../components/DominanceRankComponent.js';
import type { CombatStatsComponent } from '../components/CombatStatsComponent.js';

interface AgentComponent extends Component {
  readonly type: 'agent';
  readonly version: number;
  species: string;
  name: string;
}

interface SkillsComponent extends Component {
  readonly type: 'skills';
  readonly version: number;
  intimidation?: number;
  socializing?: number;
}

interface DeathComponent extends Component {
  readonly type: 'death';
  readonly version: number;
  cause: string;
  time: number;
}

type DominanceChallengeMethod =
  | 'combat'
  | 'display'
  | 'resource_seizure'
  | 'follower_theft'
  | 'humiliation'
  | 'assassination';

type DominanceOutcomeType = 'demotion' | 'exile' | 'death' | 'subordinate';

/**
 * DominanceChallengeSystem - Handles dominance challenges for dominance-based species
 *
 * Implements REQ-CON-004: Dominance Challenges
 * - Validates challenge validity (species type, can challenge above)
 * - Resolves challenges based on method
 * - Updates hierarchy immediately
 * - Checks for cascade effects
 */
export class DominanceChallengeSystem extends BaseSystem {
  public readonly id: SystemId = 'dominance_challenge';
  public readonly priority = 49;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = ['conflict'];
  protected readonly throttleInterval = 100; // SLOW - 5 seconds

  private eventBus?: EventBus;

  protected onInitialize(world: World, eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  protected onUpdate(ctx: SystemContext): void {
    for (const entity of ctx.activeEntities) {
      const conflict = ctx.world.getComponent<ConflictComponent>(entity.id, 'conflict');
      if (!conflict || conflict.conflictType !== 'dominance_challenge') {
        continue;
      }

      // Only process active challenges
      if (conflict.state !== 'active' && conflict.state !== 'attacking') {
        continue;
      }

      // Resolve the challenge
      this.resolveChallenge(ctx.world, entity, conflict, ctx.activeEntities);
    }
  }

  private resolveChallenge(
    world: World,
    challenger: Entity,
    conflict: ConflictComponent,
    allEntities: ReadonlyArray<Entity>
  ): void {
    // Validate challenger
    const challengerAgent = world.getComponent<AgentComponent>(challenger.id, 'agent');
    if (!challengerAgent) {
      throw new Error('Challenger missing required component: agent');
    }

    const challengerRank = world.getComponent<DominanceRankComponent>(challenger.id, 'dominance_rank');
    if (!challengerRank) {
      throw new Error('Challenger missing required component: dominance_rank');
    }

    // Validate species type
    if (!this.isDominanceSpecies(challengerAgent.species)) {
      throw new Error('Species does not support dominance challenges');
    }

    // Validate can challenge above
    if (!challengerRank.canChallengeAbove) {
      throw new Error('Challenger cannot challenge above rank');
    }

    // Get incumbent
    if (!conflict.target) {
      throw new Error('Challenge missing target');
    }

    const incumbent = allEntities.find(e => e.id === conflict.target);
    if (!incumbent) {
      throw new Error(`Target entity not found: ${conflict.target}`);
    }

    const incumbentAgent = world.getComponent<AgentComponent>(incumbent.id, 'agent');
    if (!incumbentAgent) {
      throw new Error('Incumbent missing required component: agent');
    }

    const incumbentRank = world.getComponent<DominanceRankComponent>(incumbent.id, 'dominance_rank');
    if (!incumbentRank) {
      throw new Error('Incumbent missing required component: dominance_rank');
    }

    // Verify incumbent is above challenger (lower rank number = higher status)
    if (incumbentRank.rank >= challengerRank.rank) {
      throw new Error('Can only challenge those of higher rank (lower rank number)');
    }

    // Verify species match
    if (challengerAgent.species !== incumbentAgent.species) {
      throw new Error('Can only challenge members of same species');
    }

    // Get challenge method
    const method = (conflict.method as DominanceChallengeMethod) || 'combat';

    // Resolve based on method
    const challengerWins = this.resolveByMethod(world, challenger, incumbent, method);

    // Apply consequences
    this.applyConsequences(
      world,
      challenger,
      incumbent,
      challengerRank,
      incumbentRank,
      challengerWins,
      method
    );

    // Update conflict state
    const challengerImpl = challenger as EntityImpl;
    challengerImpl.updateComponent<ConflictComponent>('conflict', (c) => ({
      ...c,
      state: 'resolved',
      outcome: challengerWins ? 'attacker_victory' : 'defender_victory',
      endTime: Date.now(),
    }));

    // Emit event
    this.events.emit('dominance:resolved', {
      challengerId: challenger.id,
      challengedId: incumbent.id,
      winner: challengerWins ? challenger.id : incumbent.id,
      hierarchyChanged: true,
    }, challenger.id);

    // Check for cascade effects
    this.checkCascadeEffects(world, challenger, incumbent, allEntities, challengerWins);
  }

  private isDominanceSpecies(species: string): boolean {
    // Species that use dominance hierarchies
    const dominanceSpecies = [
      'dominance_based',
      'kif', // From spec example
      'wolf',
      'gorilla',
      // Add other dominance-based species here
    ];
    return dominanceSpecies.includes(species.toLowerCase());
  }

  private resolveByMethod(
    world: World,
    challenger: Entity,
    incumbent: Entity,
    method: DominanceChallengeMethod
  ): boolean {
    switch (method) {
      case 'combat':
      case 'assassination':
        return this.resolveCombat(world, challenger, incumbent);

      case 'display':
        return this.resolveDisplay(world, challenger, incumbent);

      case 'resource_seizure':
        return this.resolveResourceSeizure(world, challenger, incumbent);

      case 'follower_theft':
        return this.resolveFollowerTheft(world, challenger, incumbent);

      case 'humiliation':
        return this.resolveHumiliation(world, challenger, incumbent);

      default:
        throw new Error(`Unknown challenge method: ${method}`);
    }
  }

  private resolveCombat(world: World, challenger: Entity, incumbent: Entity): boolean {
    // Combat + intimidation wins
    const challengerCombat = world.getComponent<CombatStatsComponent>(challenger.id, 'combat_stats');
    const incumbentCombat = world.getComponent<CombatStatsComponent>(incumbent.id, 'combat_stats');

    const challengerSkills = world.getComponent<SkillsComponent>(challenger.id, 'skills');
    const incumbentSkills = world.getComponent<SkillsComponent>(incumbent.id, 'skills');

    const challengerPower =
      (challengerCombat?.combatSkill || 0) + (challengerSkills?.intimidation || 0);
    const incumbentPower =
      (incumbentCombat?.combatSkill || 0) + (incumbentSkills?.intimidation || 0);

    const totalPower = challengerPower + incumbentPower;
    if (totalPower === 0) {
      return Math.random() < 0.5; // Equal chance if no skills
    }

    const challengerChance = challengerPower / totalPower;
    return Math.random() < challengerChance;
  }

  private resolveDisplay(world: World, challenger: Entity, incumbent: Entity): boolean {
    // Pure intimidation check
    const challengerSkills = world.getComponent<SkillsComponent>(challenger.id, 'skills');
    const incumbentSkills = world.getComponent<SkillsComponent>(incumbent.id, 'skills');

    const challengerIntimidation = challengerSkills?.intimidation || 0;
    const incumbentIntimidation = incumbentSkills?.intimidation || 0;

    const total = challengerIntimidation + incumbentIntimidation;
    if (total === 0) {
      return Math.random() < 0.5;
    }

    const challengerChance = challengerIntimidation / total;
    return Math.random() < challengerChance;
  }

  private resolveResourceSeizure(world: World, challenger: Entity, incumbent: Entity): boolean {
    // Stealth + combat vs guards
    const challengerCombat = world.getComponent<CombatStatsComponent>(challenger.id, 'combat_stats');
    const incumbentCombat = world.getComponent<CombatStatsComponent>(incumbent.id, 'combat_stats');

    const challengerPower =
      (challengerCombat?.stealthSkill || 0) + (challengerCombat?.combatSkill || 0);
    const incumbentPower = (incumbentCombat?.combatSkill || 0) * 1.5; // Defender advantage

    const totalPower = challengerPower + incumbentPower;
    if (totalPower === 0) {
      return Math.random() < 0.4; // Harder without skills
    }

    const challengerChance = challengerPower / totalPower;
    return Math.random() < challengerChance;
  }

  private resolveFollowerTheft(world: World, challenger: Entity, incumbent: Entity): boolean {
    // Socializing vs incumbent's hold
    const challengerSkills = world.getComponent<SkillsComponent>(challenger.id, 'skills');
    const incumbentSkills = world.getComponent<SkillsComponent>(incumbent.id, 'skills');

    const challengerSocial = challengerSkills?.socializing || 0;
    const incumbentSocial = (incumbentSkills?.socializing || 0) * 1.3; // Incumbent has existing relationships

    const total = challengerSocial + incumbentSocial;
    if (total === 0) {
      return Math.random() < 0.3; // Hard without social skills
    }

    const challengerChance = challengerSocial / total;
    return Math.random() < challengerChance;
  }

  private resolveHumiliation(world: World, challenger: Entity, incumbent: Entity): boolean {
    // Mix of intimidation and socializing
    const challengerSkills = world.getComponent<SkillsComponent>(challenger.id, 'skills');
    const incumbentSkills = world.getComponent<SkillsComponent>(incumbent.id, 'skills');

    const challengerPower =
      (challengerSkills?.intimidation || 0) + (challengerSkills?.socializing || 0);
    const incumbentPower =
      (incumbentSkills?.intimidation || 0) + (incumbentSkills?.socializing || 0);

    const total = challengerPower + incumbentPower;
    if (total === 0) {
      return Math.random() < 0.5;
    }

    const challengerChance = challengerPower / total;
    return Math.random() < challengerChance;
  }

  private applyConsequences(
    _world: World,
    challenger: Entity,
    incumbent: Entity,
    challengerRank: DominanceRankComponent,
    incumbentRank: DominanceRankComponent,
    challengerWins: boolean,
    method: DominanceChallengeMethod
  ): void {
    const challengerImpl = challenger as EntityImpl;
    const incumbentImpl = incumbent as EntityImpl;

    if (challengerWins) {
      // Challenger takes incumbent's rank
      const oldChallengerRank = challengerRank.rank;
      const newChallengerRank = incumbentRank.rank;

      // Update challenger rank
      challengerImpl.updateComponent<DominanceRankComponent>('dominance_rank', (r) => ({
        ...r,
        rank: newChallengerRank,
        subordinates: [...r.subordinates, ...incumbentRank.subordinates],
      }));

      // Determine loser fate based on method
      const loserFate = this.determineLoserFate(method, challengerWins);

      if (loserFate === 'death' || loserFate === 'exile') {
        // Incumbent loses all subordinates
        incumbentImpl.updateComponent<DominanceRankComponent>('dominance_rank', (r) => ({
          ...r,
          rank: 999, // Lowest rank
          subordinates: [],
          canChallengeAbove: false,
        }));

        // Mark as dead or exiled
        if (loserFate === 'death') {
          incumbentImpl.addComponent({
            type: 'death',
            version: 1,
            cause: method === 'assassination' ? 'assassination' : 'dominance_challenge',
            time: Date.now(),
          } as DeathComponent);
        }
      } else {
        // Incumbent is demoted
        incumbentImpl.updateComponent<DominanceRankComponent>('dominance_rank', (r) => ({
          ...r,
          rank: oldChallengerRank, // Takes challenger's old rank
          subordinates: [],
        }));
      }

      // Emit victory event
      if (this.eventBus) {
        this.eventBus.emit({
          type: 'dominance:challenge',
          source: challenger.id,
          data: {
            challengerId: challenger.id,
            challengedId: incumbent.id,
            method,
          },
        });
      }
    } else {
      // Challenger failed
      const challengerFate = this.determineLoserFate(method, challengerWins);

      if (challengerFate === 'death' || challengerFate === 'exile') {
        challengerImpl.updateComponent<DominanceRankComponent>('dominance_rank', (r) => ({
          ...r,
          rank: 999,
          subordinates: [],
          canChallengeAbove: false,
        }));

        if (challengerFate === 'death') {
          challengerImpl.addComponent({
            type: 'death',
            version: 1,
            cause: 'failed_dominance_challenge',
            time: Date.now(),
          } as DeathComponent);
        }
      } else if (challengerFate === 'subordinate') {
        // Challenger becomes subordinate of incumbent
        challengerImpl.updateComponent<DominanceRankComponent>('dominance_rank', (r) => ({
          ...r,
          canChallengeAbove: false,
        }));

        incumbentImpl.updateComponent<DominanceRankComponent>('dominance_rank', (r) => ({
          ...r,
          subordinates: [...r.subordinates, challenger.id],
        }));
      }

      // Emit defeat event
      if (this.eventBus) {
        this.eventBus.emit({
          type: 'dominance:challenge',
          source: challenger.id,
          data: {
            challengerId: challenger.id,
            challengedId: incumbent.id,
            method,
          },
        });
      }
    }
  }

  private determineLoserFate(method: DominanceChallengeMethod, challengerWon: boolean): DominanceOutcomeType {
    // Assassination attempts result in death
    if (method === 'assassination') {
      return 'death';
    }

    // Combat can be lethal
    if (method === 'combat') {
      const deathChance = challengerWon ? 0.3 : 0.5; // Failed challenger more likely to die
      if (Math.random() < deathChance) {
        return 'death';
      }
      return 'demotion';
    }

    // Display and humiliation rarely kill
    if (method === 'display' || method === 'humiliation') {
      return challengerWon ? 'demotion' : 'subordinate';
    }

    // Resource seizure and follower theft
    if (method === 'resource_seizure' || method === 'follower_theft') {
      return 'demotion';
    }

    return 'demotion';
  }

  private checkCascadeEffects(
    world: World,
    challenger: Entity,
    incumbent: Entity,
    entities: ReadonlyArray<Entity>,
    challengerWon: boolean
  ): void {
    // Find other dominance-ranked entities
    const dominanceEntities = entities.filter(
      e =>
        e.id !== challenger.id &&
        e.id !== incumbent.id &&
        world.hasComponent(e.id, 'dominance_rank') &&
        world.hasComponent(e.id, 'agent')
    );

    for (const entity of dominanceEntities) {
      const agent = world.getComponent<AgentComponent>(entity.id, 'agent');
      const rank = world.getComponent<DominanceRankComponent>(entity.id, 'dominance_rank');

      if (!agent || !rank) continue;

      // Check if this entity sees an opportunity
      const opportunityChance = this.calculateCascadeChance(rank, challengerWon);

      if (Math.random() < opportunityChance) {
        // Emit cascade effect event
        if (this.eventBus) {
          this.eventBus.emit({
            type: 'dominance:cascade',
            source: entity.id,
            data: {
              triggeredBy: challenger.id,
              affectedAgents: [entity.id],
            },
          });
        }
      }
    }
  }

  private calculateCascadeChance(rank: DominanceRankComponent, challengerWon: boolean): number {
    // Higher ranks (lower numbers) are more likely to see opportunities
    // Failed challenges create more instability
    let baseChance = 0.1;

    if (!challengerWon) {
      baseChance += 0.1; // Failed challenges create opportunities
    }

    if (rank.rank <= 3) {
      baseChance += 0.2; // High-ranked entities are ambitious
    }

    if (rank.canChallengeAbove) {
      baseChance += 0.1;
    }

    return Math.min(0.5, baseChance); // Cap at 50%
  }
}
