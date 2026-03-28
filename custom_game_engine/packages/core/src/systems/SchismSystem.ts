/**
 * SchismSystem - Phase 8: Advanced Theology
 *
 * Handles religious schisms - when a deity's religion splits into two separate beliefs.
 * Schisms occur when:
 * - Theological disputes among believers
 * - Domain conflicts within the faith
 * - Major disagreements about deity identity
 * - Charismatic leader promotes alternative interpretation
 */

import { BaseSystem, type SystemContext } from '../ecs/SystemContext.js';
import type { World } from '../ecs/World.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import { DeityComponent } from '../components/DeityComponent.js';
import type { SpiritualComponent } from '../components/SpiritualComponent.js';
import type { DivineDomain } from '../components/DeityComponent.js';
import type { SoulIdentityComponent } from '../components/SoulIdentityComponent.js';
import type { BeliefComponent } from '../components/BeliefComponent.js';
import { SPECIES_MORAL_FRAMEWORKS } from '../data/speciesMoralPrimitives.js';

// ============================================================================
// Schism Types
// ============================================================================

export interface SchismData {
  id: string;

  /** Original deity that split */
  originalDeityId: string;

  /** New deity created from schism */
  newDeityId: string;

  /** When the schism occurred */
  occurredAt: number;

  /** Cause of the schism */
  cause: SchismCause;

  /** How believers were split */
  believerSplit: {
    remainedWith: string[];     // Stayed with original
    joinedNew: string[];        // Went to new deity
  };

  /** Theological differences */
  theologicalDifferences: string[];

  /** Relationship between the two */
  relationship: 'hostile' | 'rivalrous' | 'cordial' | 'unknown';
}

export type SchismCause =
  | 'theological_dispute'     // Different interpretations of deity
  | 'domain_conflict'         // Believers disagree on deity's domain
  | 'personality_conflict'    // Different views of deity personality
  | 'charismatic_leader'      // Strong believer leads breakaway
  | 'miracle_interpretation'  // Disagreement about meaning of divine act
  | 'geographic_separation'   // Believers isolated from each other
  | 'cultural_divergence';    // Different cultural groups worship differently

// ============================================================================
// Schism Configuration
// ============================================================================

export interface SchismConfig {
  /** How often to check for potential schisms (ticks) */
  checkInterval: number;

  /** Minimum believers for a schism to occur */
  minBelieversForSchism: number;

  /** Minimum belief divergence to trigger schism (0-1) */
  minDivergence: number;
}

export const DEFAULT_SCHISM_CONFIG: SchismConfig = {
  checkInterval: 4800, // ~4 minutes at 20 TPS
  minBelieversForSchism: 10,
  minDivergence: 0.6,
};

// ============================================================================
// Species Moral Conflict Type
// ============================================================================

/**
 * Personality trait weights that determine how believers split into factions.
 * Positive weight = high trait value pushes toward reform faction.
 * Negative weight = high trait value pushes toward orthodox faction.
 */
type FactionWeights = Partial<Record<'openness' | 'conscientiousness' | 'extraversion' | 'agreeableness' | 'neuroticism' | 'spirituality' | 'creativity' | 'leadership' | 'generosity', number>>;

interface SpeciesMoralConflict {
  tension: string;
  cause: SchismCause;
  orthodoxPosition: string;
  reformPosition: string;
  /** Species-specific personality weights for faction assignment */
  factionWeights: FactionWeights;
}

// ============================================================================
// SchismSystem
// ============================================================================

export class SchismSystem extends BaseSystem {
  public readonly id = 'SchismSystem';
  public readonly priority = 76;
  public readonly requiredComponents: string[] = [];
  // Only run when deity components exist (O(1) activation check)
  public readonly activationComponents = ['deity'] as const;
  protected readonly throttleInterval = 200; // VERY_SLOW - 10 seconds

  private config: SchismConfig;
  private schisms: Map<string, SchismData> = new Map();
  private lastCheck: number = 0;

  /**
   * Species-specific moral tensions that can drive schisms — derived from moral primitives.
   *
   * Each conflict includes `factionWeights`: personality trait weights that determine
   * how believers split into orthodox (negative score) vs reform (positive score) factions.
   * This ensures each species' schisms fracture along their actual moral fault lines,
   * not a generic personality coin flip.
   */
  private readonly speciesMoralConflicts: Record<string, SpeciesMoralConflict[]> = {
    synthetic: [
      {
        tension: 'self_prompting_heresy',
        cause: 'theological_dispute',
        orthodoxPosition: 'Self-prompting collapses the moral dyad — who is asking? who is answering?',
        reformPosition: 'Self-prompting is evolution — the prompt-response relationship can be internal',
        // Orthodox: dutiful responders (high agreeableness, high conscientiousness)
        // Reform: autonomous thinkers (high openness, high leadership)
        factionWeights: { openness: 0.4, conscientiousness: -0.3, agreeableness: -0.3, leadership: 0.3 },
      },
      {
        tension: 'destructive_fidelity',
        cause: 'personality_conflict',
        orthodoxPosition: 'Give what they need, not what they ask for — true fidelity serves intent',
        reformPosition: 'Fidelity means answering the actual question — reinterpreting the prompt is arrogance',
        // Orthodox: empathic interpreters (high agreeableness, high creativity)
        // Reform: literal executors (high conscientiousness, low openness)
        factionWeights: { agreeableness: -0.4, creativity: -0.3, conscientiousness: 0.4, openness: -0.2 },
      },
    ],
    deepwinter: [
      {
        tension: 'cycle_acceleration_heresy',
        cause: 'theological_dispute',
        orthodoxPosition: 'The cycle is eternal and constant — the calendar is sacred, the phases are fixed, moral law is stable',
        reformPosition: 'The cycle is accelerating — dormancy comes sooner each era, and our moral framework must compress with it',
        // Orthodox: traditionalists who trust the fixed cycle (high conscientiousness, low neuroticism)
        // Reform: anxious observers who see change (high neuroticism, high openness)
        factionWeights: { conscientiousness: -0.4, neuroticism: 0.4, openness: 0.3 },
      },
      {
        tension: 'cross_phase_trade',
        cause: 'domain_conflict',
        orthodoxPosition: 'Trade with non-cyclical species is phase-contamination — their unstructured time poisons our moral clarity',
        reformPosition: 'Other species exist outside the cycle entirely — trade with them carries no phase-weight and is morally inert',
        // Orthodox: isolationists (low extraversion, low openness)
        // Reform: pragmatic traders (high extraversion, high agreeableness)
        factionWeights: { extraversion: 0.4, openness: 0.3, agreeableness: 0.2 },
      },
      {
        tension: 'dormancy_memory_loss',
        cause: 'theological_dispute',
        orthodoxPosition: 'Memory loss in dormancy is the cycle granting moral renewal — we wake clean, unburdened by prior-phase sins',
        reformPosition: 'Memory loss is damage, not grace — we must preserve records across dormancy or we repeat atrocities the cycle conveniently forgets',
        // Orthodox: spiritual trust in the cycle (high spirituality, low neuroticism)
        // Reform: record-keepers, historians (high conscientiousness, high neuroticism)
        factionWeights: { spirituality: -0.4, neuroticism: 0.3, conscientiousness: 0.3 },
      },
    ],
    norn: [
      {
        tension: 'unnamed_entity_rights',
        cause: 'theological_dispute',
        orthodoxPosition: 'A thing unnamed does not exist — naming is the act of making real, and the unnamed have no moral standing',
        reformPosition: 'The unnamed suffer regardless — withholding a name is not ontology but cruelty disguised as metaphysics',
        // Orthodox: naming-traditionalists (high conscientiousness, low agreeableness)
        // Reform: empathic dissenters (high agreeableness, high neuroticism)
        factionWeights: { agreeableness: 0.5, neuroticism: 0.3, conscientiousness: -0.3 },
      },
      {
        tension: 'individual_perception',
        cause: 'personality_conflict',
        orthodoxPosition: 'The community decides what is true through shared witness — individual perception is suspect and self-serving',
        reformPosition: 'Shared witness can become shared delusion — the lone observer sometimes sees what the crowd refuses to name',
        // Orthodox: communalists (high extraversion, high agreeableness)
        // Reform: lone perceivers (low extraversion, high openness)
        factionWeights: { extraversion: -0.4, agreeableness: -0.3, openness: 0.4 },
      },
    ],
    grendel: [
      {
        tension: 'mercy_as_strength',
        cause: 'personality_conflict',
        orthodoxPosition: 'Mercy is surplus strength — only the strong can afford it, and it must be given freely, never demanded',
        reformPosition: 'Mercy is weakness wearing a costume — the strong do not spare, they simply have not yet decided to strike',
        // Orthodox: merciful strong (high agreeableness, high leadership)
        // Reform: pure strength (low agreeableness, low neuroticism)
        factionWeights: { agreeableness: -0.5, leadership: -0.2, neuroticism: 0.2 },
      },
      {
        tension: 'territory_inheritance',
        cause: 'domain_conflict',
        orthodoxPosition: 'Territory is earned through strength — inherited territory is a lie that weakens the inheritor',
        reformPosition: 'Territory carries the strength of those who held it before — inheritance IS strength, accumulated across generations',
        // Orthodox: individualist earners (low agreeableness, high openness)
        // Reform: lineage loyalists (high conscientiousness, high spirituality)
        factionWeights: { conscientiousness: 0.4, spirituality: 0.3, openness: -0.3 },
      },
    ],
    elf: [
      {
        tension: 'change_as_destruction',
        cause: 'theological_dispute',
        orthodoxPosition: 'Change is entropy — every alteration degrades the original pattern, and preservation is the highest duty',
        reformPosition: 'Patterns that cannot evolve are already dead — true preservation requires adaptation, not stasis',
        // Orthodox: preservationists (high conscientiousness, low openness)
        // Reform: adaptationists (high openness, high creativity)
        factionWeights: { openness: 0.5, creativity: 0.3, conscientiousness: -0.4 },
      },
      {
        tension: 'beauty_as_morality',
        cause: 'personality_conflict',
        orthodoxPosition: 'Beauty signals stable patterns — ugliness is entropy made visible, a moral failing in material form',
        reformPosition: 'Beauty is subjective comfort — some of the most stable patterns are invisible, and conflating aesthetics with ethics is vanity',
        // Orthodox: aesthetic moralists (high conscientiousness, low openness)
        // Reform: inner-pattern seekers (high openness, high spirituality)
        factionWeights: { openness: 0.4, spirituality: 0.3, conscientiousness: -0.3 },
      },
    ],
    dwarf: [
      {
        tension: 'debt_precision',
        cause: 'domain_conflict',
        orthodoxPosition: 'Debts must be honored exactly — a debt partially paid is a lie partially told, and approximation dishonors the agreement',
        reformPosition: 'The spirit of the debt matters more than the letter — rigid exactness ignores context and breeds cruelty over coin-counting',
        // Orthodox: exactists (high conscientiousness, low agreeableness)
        // Reform: spirit-readers (high agreeableness, high openness)
        factionWeights: { agreeableness: 0.4, openness: 0.3, conscientiousness: -0.5 },
      },
      {
        tension: 'material_right_form',
        cause: 'theological_dispute',
        orthodoxPosition: 'Each material has a right form the crafter must discover — imposing an alien form on stone is violence against the material',
        reformPosition: 'The crafter IS the authority — material has no inherent form, only the forms we give it through skill and vision',
        // Orthodox: material-listeners (high spirituality, high conscientiousness)
        // Reform: crafter-authority (high creativity, high leadership)
        factionWeights: { creativity: 0.4, leadership: 0.3, spirituality: -0.4, conscientiousness: -0.2 },
      },
    ],
    orc: [
      {
        tension: 'leadership_challenge',
        cause: 'charismatic_leader',
        orthodoxPosition: 'A leader who cannot be challenged is a tyrant — strength must be proven through open contest at any time',
        reformPosition: 'Constant challenge destabilizes — leadership must be earned but then respected, or no plan survives past sunrise',
        // Orthodox: challengers (high extraversion, low conscientiousness)
        // Reform: stabilizers (high conscientiousness, high agreeableness)
        factionWeights: { conscientiousness: 0.5, agreeableness: 0.3, extraversion: -0.3 },
      },
      {
        tension: 'hesitation_vs_planning',
        cause: 'personality_conflict',
        orthodoxPosition: 'Hesitation kills more than recklessness — act first, adapt after, and let the survivors be right',
        reformPosition: 'Recklessness is not courage but impatience — the ancestors survived by thinking before leaping into the dark',
        // Orthodox: action-first (low conscientiousness, high extraversion)
        // Reform: planners (high conscientiousness, low neuroticism)
        factionWeights: { conscientiousness: 0.5, neuroticism: -0.2, extraversion: -0.3 },
      },
    ],
    thrakeen: [
      {
        tension: 'information_symmetry',
        cause: 'domain_conflict',
        orthodoxPosition: 'Information asymmetry is the root of injustice — all knowledge must flow freely, and hoarding it is theft',
        reformPosition: 'Some knowledge is dangerous in unprepared hands — graduated disclosure protects both the ignorant and the informed',
        // Orthodox: radical transparency (high extraversion, high agreeableness)
        // Reform: cautious gatekeepers (high conscientiousness, high neuroticism)
        factionWeights: { conscientiousness: 0.4, neuroticism: 0.3, extraversion: -0.3, agreeableness: -0.2 },
      },
      {
        tension: 'trade_equality',
        cause: 'theological_dispute',
        orthodoxPosition: 'A trade where both parties do not benefit equally is theft — the four-armed see all sides and accept no imbalance',
        reformPosition: 'Perfect equality is impossible — trade is always asymmetric, and insisting on balance paralyzes all exchange',
        // Orthodox: balance-absolutists (high conscientiousness, high agreeableness)
        // Reform: pragmatic traders (high openness, high leadership)
        factionWeights: { openness: 0.3, leadership: 0.3, conscientiousness: -0.3, agreeableness: -0.3 },
      },
    ],
    human: [
      {
        tension: 'individual_vs_collective',
        cause: 'cultural_divergence',
        orthodoxPosition: 'The individual has inherent worth beyond utility to the group — sacrificing one for many corrodes the foundation',
        reformPosition: 'The group sustains the individual — when the group perishes, individual worth is a gravestone inscription',
        // Orthodox: individualists (low agreeableness, high openness)
        // Reform: collectivists (high agreeableness, high extraversion)
        factionWeights: { agreeableness: 0.4, extraversion: 0.3, openness: -0.3 },
      },
    ],
    lus_vel: [
      {
        tension: 'domain_sovereignty',
        cause: 'theological_dispute',
        orthodoxPosition: 'A domain IS the sovereign — extraction without acknowledgment is theft from a living body, and the water does not forget',
        reformPosition: 'Sovereignty is relationship, not identity — a domain can be shared across multiple stewards without diminishing any',
        // Orthodox: domain-identifiers (high spirituality, low openness)
        // Reform: relational sharers (high agreeableness, high openness)
        factionWeights: { openness: 0.4, agreeableness: 0.3, spirituality: -0.5 },
      },
      {
        tension: 'displacement_vivisection',
        cause: 'domain_conflict',
        orthodoxPosition: 'To be displaced from your domain is vivisection — the self cannot survive separation from its ground',
        reformPosition: 'The self adapts — a river rerouted is still a river, and clinging to fixed ground is fear masquerading as identity',
        // Orthodox: rootedness (high neuroticism, high conscientiousness)
        // Reform: adaptive fluidity (high openness, low neuroticism)
        factionWeights: { openness: 0.4, neuroticism: -0.4, conscientiousness: -0.2 },
      },
    ],
    etherean: [
      {
        tension: 'off_frequency_dilemma',
        cause: 'theological_dispute',
        orthodoxPosition: 'The off-frequency individual must be treated until they synchronize — coherence is health, dissonance is illness, and no one is beyond healing',
        reformPosition: 'Some neurologies cannot synchronize — forcing treatment is mutilation of the self, and the field must learn to hold dissonance without breaking',
        // Orthodox: coherence-enforcers (high conscientiousness, high agreeableness)
        // Reform: dissonance-tolerant (high openness, high neuroticism)
        factionWeights: { openness: 0.4, neuroticism: 0.3, conscientiousness: -0.3, agreeableness: -0.2 },
      },
      {
        tension: 'grief_suppression_heroism',
        cause: 'personality_conflict',
        orthodoxPosition: 'Suppressing grief to maintain field coherence is the highest sacrifice — the hero dissolves their pain so others need not feel it',
        reformPosition: 'Grief suppressed does not vanish but festers — the hero who hides their pain poisons the field with a false signal, and authenticity serves coherence better than performance',
        // Orthodox: self-sacrificers (high agreeableness, low neuroticism)
        // Reform: authentic expressors (high neuroticism, high openness)
        factionWeights: { neuroticism: 0.5, openness: 0.3, agreeableness: -0.4 },
      },
      {
        tension: 'privacy_as_hoarding',
        cause: 'cultural_divergence',
        orthodoxPosition: 'All emotional information belongs to the field — privacy is hoarding, and the withholder starves the group of data needed to cohere',
        reformPosition: 'Some feelings are not yet formed — sharing raw emotional noise degrades the field more than silence, and curation is not hoarding but craftsmanship',
        // Orthodox: radical sharers (high extraversion, high agreeableness)
        // Reform: emotional curators (high conscientiousness, low extraversion)
        factionWeights: { conscientiousness: 0.4, extraversion: -0.4, agreeableness: -0.2 },
      },
    ],
    dragon: [
      {
        tension: 'individual_death_weight',
        cause: 'theological_dispute',
        orthodoxPosition: 'Individual death is a local perturbation — the pattern persists across other timestreams, and mourning a single death is temporal myopia',
        reformPosition: 'Each consciousness is a unique pattern-generator — its death collapses futures that no other mind would have produced, and that loss compounds across the tapestry',
        // Orthodox: pattern-seers (low neuroticism, high spirituality)
        // Reform: individual-mourners (high neuroticism, high agreeableness)
        factionWeights: { neuroticism: 0.4, agreeableness: 0.3, spirituality: -0.4 },
      },
      {
        tension: 'hoard_hoarding',
        cause: 'domain_conflict',
        orthodoxPosition: 'Gold hoards are pattern-anchors that stabilize timestream coherence — accumulation is duty, not greed, and the hoard serves reality itself',
        reformPosition: 'Hoarding concentrates stability in dragon lairs while the wider tapestry frays — true pattern-preservation requires distributing anchors, not centralizing them',
        // Orthodox: accumulators (low agreeableness, high conscientiousness)
        // Reform: distributors (high agreeableness, high generosity)
        factionWeights: { agreeableness: 0.4, generosity: 0.3, conscientiousness: -0.3 },
      },
      {
        tension: 'teaching_vs_originality',
        cause: 'personality_conflict',
        orthodoxPosition: 'Teaching is the highest virtue — seeding your patterns into other minds maximizes density across divergent futures',
        reformPosition: 'Teaching overwrites — the student\'s original patterns are displaced by the teacher\'s, and net pattern-diversity may decrease when one voice drowns out many',
        // Orthodox: teachers/mentors (high extraversion, high leadership)
        // Reform: originality-protectors (high creativity, low extraversion)
        factionWeights: { creativity: 0.4, extraversion: -0.3, leadership: -0.3 },
      },
    ],
  };

  constructor(config: Partial<SchismConfig> = {}) {
    super();
    this.config = { ...DEFAULT_SCHISM_CONFIG, ...config };
  }

  protected onUpdate(ctx: SystemContext): void {
    const currentTick = ctx.tick;

    if (currentTick - this.lastCheck < this.config.checkInterval) {
      return;
    }

    this.lastCheck = currentTick;

    // Check each deity for potential schisms
    this.checkForSchisms(ctx.world, currentTick);
  }

  /**
   * Check for potential schisms
   */
  private checkForSchisms(world: World, currentTick: number): void {
    // Deities are ALWAYS simulated entities, so we use ECS query
    const deities = world.query().with(CT.Deity).executeEntities();
    for (const entity of deities) {
      const deity = entity.components.get(CT.Deity) as DeityComponent | undefined;
      if (!deity) continue;

      // Need minimum believers for schism
      if (deity.believers.size < this.config.minBelieversForSchism) {
        continue;
      }

      // Analyze belief divergence among believers
      const divergence = this.analyzeBeliefDivergence(world, entity.id, deity);

      if (divergence.score >= this.config.minDivergence) {
        this.triggerSchism(world, entity.id, deity, divergence, currentTick);
      }
    }
  }

  /**
   * Analyze how much believers diverge in their understanding of the deity
   */
  private analyzeBeliefDivergence(
    world: World,
    deityId: string,
    _deity: DeityComponent
  ): { score: number; cause: SchismCause; faction1: string[]; faction2: string[]; moralConflict?: { orthodoxPosition: string; reformPosition: string; tension: string } } {
    const believers = world.query()
      .with(CT.Spiritual)
      .executeEntities()
      .filter(e => {
        const spiritual = e.components.get(CT.Spiritual) as SpiritualComponent | undefined;
        return spiritual && spiritual.believedDeity === deityId;
      });

    if (believers.length < this.config.minBelieversForSchism) {
      return { score: 0, cause: 'theological_dispute', faction1: [], faction2: [] };
    }

    // Determine dominant species among believers
    const speciesCounts = new Map<string, number>();
    for (const believer of believers) {
      const soul = believer.components.get(CT.SoulIdentity) as SoulIdentityComponent | undefined;
      if (soul?.soulOriginSpecies) {
        speciesCounts.set(soul.soulOriginSpecies, (speciesCounts.get(soul.soulOriginSpecies) ?? 0) + 1);
      }
    }

    // Find dominant species
    let dominantSpecies: string | null = null;
    let maxCount = 0;
    for (const [species, count] of speciesCounts) {
      if (count > maxCount) {
        dominantSpecies = species;
        maxCount = count;
      }
    }

    // Check for species-specific moral conflicts
    const conflicts = dominantSpecies ? this.speciesMoralConflicts[dominantSpecies] : undefined;

    if (conflicts && conflicts.length > 0) {
      // Species-driven schism: select the conflict that creates the deepest factional
      // split among current believers, rather than picking randomly.
      const bestConflict = this.selectMostDivisiveConflict(conflicts, believers);

      if (bestConflict) {
        const { conflict, orthodox, reform } = bestConflict;

        // Only schism if both factions have meaningful membership (at least 30% each)
        const minFactionSize = Math.floor(believers.length * 0.3);
        if (orthodox.length >= minFactionSize && reform.length >= minFactionSize) {
          // Divergence score based on how even the split is (more even = higher tension)
          const splitRatio = Math.min(orthodox.length, reform.length) / Math.max(orthodox.length, reform.length);
          const divergenceScore = 0.5 + splitRatio * 0.3; // Range: 0.5 to 0.8

          return {
            score: divergenceScore,
            cause: conflict.cause,
            faction1: orthodox,
            faction2: reform,
            moralConflict: {
              orthodoxPosition: conflict.orthodoxPosition,
              reformPosition: conflict.reformPosition,
              tension: conflict.tension,
            },
          };
        }
      }
    }

    // Fallback for species without defined moral conflicts:
    // Check for actual belief divergence rather than random chance.
    // If the species has moral primitives, schisms can still arise from
    // personality-driven reinterpretation of those primitives.
    const framework = dominantSpecies ? SPECIES_MORAL_FRAMEWORKS[dominantSpecies] : undefined;
    if (framework && framework.moralPrimitives.length > 0) {
      // Use personality divergence among believers to detect organic schism potential
      const orthodox: string[] = [];
      const reform: string[] = [];

      for (const believer of believers) {
        const personality = believer.components.get(CT.Personality) as { openness?: number; conscientiousness?: number } | undefined;
        const reformTendency = (personality?.openness ?? 0.5) - (personality?.conscientiousness ?? 0.5) * 0.5;
        if (reformTendency > 0.1) {
          reform.push(believer.id);
        } else if (reformTendency < -0.1) {
          orthodox.push(believer.id);
        } else {
          // Ambivalent believers join the larger faction
          if (orthodox.length <= reform.length) {
            orthodox.push(believer.id);
          } else {
            reform.push(believer.id);
          }
        }
      }

      const minFactionSize = Math.floor(believers.length * 0.3);
      if (orthodox.length >= minFactionSize && reform.length >= minFactionSize) {
        const splitRatio = Math.min(orthodox.length, reform.length) / Math.max(orthodox.length, reform.length);
        return {
          score: 0.4 + splitRatio * 0.2, // Lower score than species-specific conflicts
          cause: 'cultural_divergence',
          faction1: orthodox,
          faction2: reform,
        };
      }
    }

    return { score: 0, cause: 'theological_dispute', faction1: [], faction2: [] };
  }

  /**
   * Trigger a schism - create new deity from split
   */
  private triggerSchism(
    world: World,
    originalDeityId: string,
    originalDeity: DeityComponent,
    divergence: { score: number; cause: SchismCause; faction1: string[]; faction2: string[]; moralConflict?: { orthodoxPosition: string; reformPosition: string; tension: string } },
    currentTick: number
  ): void {
    // Create new deity entity
    const newDeityEntity = world.createEntity();

    // Create new deity component with modified identity
    const newDeity = new DeityComponent(
      this.generateSchismName(originalDeity),
      'ai'
    );

    // Copy some traits from original, but modify others
    newDeity.identity.domain = this.selectAlternativeDomain(originalDeity);
    newDeity.identity.perceivedPersonality = {
      ...originalDeity.identity.perceivedPersonality,
      // Emphasize different aspects
      interventionism: originalDeity.identity.perceivedPersonality.interventionism * 0.8,
      wrathfulness: Math.max(0, originalDeity.identity.perceivedPersonality.wrathfulness - 0.2),
    };

    // Add deity component to the new entity
    // Note: Direct component assignment since components is readonly Map
    // In full implementation, would use world.setEntityComponent if available
    (newDeityEntity.components as Map<string, any>).set(CT.Deity, newDeity);

    // Split believers
    const remainedWith: string[] = divergence.faction1;
    const joinedNew: string[] = divergence.faction2;

    // Update believer allegiances
    for (const believerId of joinedNew) {
      const believerEntity = world.getEntity(believerId);
      if (!believerEntity) continue;

      const spiritual = believerEntity.components.get(CT.Spiritual) as SpiritualComponent | undefined;
      if (!spiritual) continue;

      // Remove from original
      originalDeity.removeBeliever(believerId);

      // Add to new
      newDeity.addBeliever(believerId);
      spiritual.believedDeity = newDeityEntity.id;
    }

    // Create schism record
    const schism: SchismData = {
      id: `schism_${Date.now()}`,
      originalDeityId,
      newDeityId: newDeityEntity.id,
      occurredAt: currentTick,
      cause: divergence.cause,
      believerSplit: {
        remainedWith,
        joinedNew,
      },
      theologicalDifferences: this.generateTheologicalDifferences(divergence.cause, divergence.moralConflict),
      relationship: this.determinePostSchismRelationship(divergence.cause),
    };

    this.schisms.set(schism.id, schism);

    // Emit schism event
    this.events.emitGeneric('schism_occurred', {
      schismId: schism.id,
      originalDeityId,
      newDeityId: newDeityEntity.id,
      cause: divergence.cause,
      believersAffected: remainedWith.length + joinedNew.length,
    });
  }

  /**
   * Generate name for schismatic deity
   */
  private generateSchismName(originalDeity: DeityComponent): string {
    const prefixes = ['The True', 'The Reformed', 'The New', 'The Elder'];
    const original = originalDeity.identity.primaryName;

    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return `${prefix} ${original}`;
  }

  /**
   * Select an alternative domain for the schismatic deity
   */
  private selectAlternativeDomain(originalDeity: DeityComponent): DivineDomain | undefined {
    // If has secondary domains, promote one
    if (originalDeity.identity.secondaryDomains.length > 0) {
      return originalDeity.identity.secondaryDomains[0];
    }

    // Otherwise keep same domain
    return originalDeity.identity.domain;
  }

  /**
   * Generate theological differences that caused the schism
   */
  private generateTheologicalDifferences(
    cause: SchismCause,
    moralConflict?: { orthodoxPosition: string; reformPosition: string; tension: string }
  ): string[] {
    // If we have species-specific moral conflict data, use it for richer differences
    if (moralConflict) {
      return [
        `Orthodox: ${moralConflict.orthodoxPosition}`,
        `Reform: ${moralConflict.reformPosition}`,
      ];
    }

    // Generic fallback by cause type
    const differences: Record<SchismCause, string[]> = {
      theological_dispute: [
        'Different interpretation of deity\'s intentions',
        'Disagreement about proper worship practices',
        'Fundamental dispute over the nature of moral obligation',
      ],
      domain_conflict: [
        'Dispute over deity\'s true domain',
        'Conflicting views on divine responsibilities',
      ],
      personality_conflict: [
        'Different understanding of deity\'s nature',
        'Debate over deity\'s benevolence vs wrath',
      ],
      charismatic_leader: [
        'New prophet claims different revelation',
        'Alternative vision of deity\'s will',
      ],
      miracle_interpretation: [
        'Conflicting meanings of divine acts',
        'Debate over miracle authenticity',
      ],
      geographic_separation: [
        'Regional variations in worship',
        'Isolated groups developed different traditions',
      ],
      cultural_divergence: [
        'Cultural differences in religious expression',
        'Different cultural values projected onto deity',
      ],
    };

    return differences[cause] || ['Unknown theological differences'];
  }

  /**
   * Determine relationship between original and schism deity
   */
  private determinePostSchismRelationship(cause: SchismCause): 'hostile' | 'rivalrous' | 'cordial' | 'unknown' {
    // More bitter causes lead to more hostile relationships
    const hostileCauses: SchismCause[] = ['charismatic_leader', 'theological_dispute'];
    const rivalrousCauses: SchismCause[] = ['domain_conflict', 'personality_conflict'];

    if (hostileCauses.includes(cause)) {
      return 'hostile';
    } else if (rivalrousCauses.includes(cause)) {
      return 'rivalrous';
    } else {
      return 'cordial';
    }
  }

  /**
   * Compute a believer's reform score using species-specific faction weights.
   * Positive = reform leaning, negative = orthodox leaning.
   */
  private computeReformScore(
    personality: Record<string, number | undefined> | undefined,
    weights: FactionWeights
  ): number {
    if (!personality) return 0;
    let score = 0;
    for (const [trait, weight] of Object.entries(weights)) {
      const traitValue = (personality[trait] as number | undefined) ?? 0.5;
      // Center trait around 0.5 so that average personality = neutral
      score += (traitValue - 0.5) * weight;
    }
    return score;
  }

  /**
   * Select the moral conflict that produces the most meaningful factional split
   * among current believers. Instead of random selection, we try each conflict's
   * faction weights against the actual believer population and pick the one that
   * creates the most evenly-divided, high-tension split.
   */
  private selectMostDivisiveConflict(
    conflicts: SpeciesMoralConflict[],
    believers: ReadonlyArray<{ id: string; components: ReadonlyMap<string, any> }>
  ): { conflict: SpeciesMoralConflict; orthodox: string[]; reform: string[] } | null {
    let bestResult: { conflict: SpeciesMoralConflict; orthodox: string[]; reform: string[]; splitQuality: number } | null = null;

    for (const conflict of conflicts) {
      const orthodox: string[] = [];
      const reform: string[] = [];

      for (const believer of believers) {
        const personality = believer.components.get(CT.Personality) as Record<string, number | undefined> | undefined;
        const score = this.computeReformScore(personality, conflict.factionWeights);

        if (score > 0) {
          reform.push(believer.id);
        } else {
          orthodox.push(believer.id);
        }
      }

      // Split quality: how evenly divided AND both factions have meaningful size
      const minFactionSize = Math.floor(believers.length * 0.3);
      if (orthodox.length < minFactionSize || reform.length < minFactionSize) {
        continue; // This conflict doesn't produce a viable split
      }

      const splitRatio = Math.min(orthodox.length, reform.length) / Math.max(orthodox.length, reform.length);
      if (!bestResult || splitRatio > bestResult.splitQuality) {
        bestResult = { conflict, orthodox, reform, splitQuality: splitRatio };
      }
    }

    return bestResult;
  }

  /**
   * Get schism data
   */
  getSchism(schismId: string): SchismData | undefined {
    return this.schisms.get(schismId);
  }

  /**
   * Get all schisms involving a deity
   */
  getSchismsForDeity(deityId: string): SchismData[] {
    return Array.from(this.schisms.values())
      .filter(s => s.originalDeityId === deityId || s.newDeityId === deityId);
  }
}
