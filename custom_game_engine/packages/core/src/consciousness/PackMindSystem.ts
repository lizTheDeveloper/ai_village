/**
 * Pack Mind System
 *
 * A single consciousness distributed across multiple bodies.
 * Based on consciousness-implementation-phases.md Phase 2 specification.
 *
 * "Imagine having six bodies and still not being able to find your keys."
 *   - Aria Pack-of-Four, On Distributed Consciousness
 *
 * "The pack thinks as one. The pack also argues with itself.
 * You'd be surprised how many bodies it takes to lose an argument with yourself."
 *   - Dr. Marcus Venn, Multi-Body Psychology
 *
 * Constraints (from spec):
 * - Max 6 bodies per pack
 * - Formations: cluster, line
 * - Binary coherence: coherent or not
 * - One LLM call per tick for whole pack
 * - Body loss = stat penalty, not personality change
 */

import type { System } from '../ecs/System.js';
import type { World } from '../ecs/World.js';
import type { Entity } from '../ecs/Entity.js';
import type { EventBus } from '../events/EventBus.js';
import { ComponentType } from '../types/ComponentType.js';
import type { SystemId } from '../types.js';

// ============================================================================
// PACK SPECIES CONFIGURATION
// ============================================================================

/**
 * Species-specific pack configuration.
 * No arbitrary limits - each species defines its own constraints.
 */
export interface PackSpeciesConfig {
  /** Species identifier */
  speciesId: string;
  /** Display name */
  speciesName: string;

  // Body capacity - biological, not arbitrary
  /** Maximum bodies this species can support (brain bandwidth, soul capacity) */
  maxBodies: number | 'unlimited';
  /** Minimum bodies needed to maintain consciousness */
  minBodies: number;

  // Range-based constraints
  /** Maximum distance between bodies before connection degrades */
  coherenceRange: number;
  /** How fast coherence degrades outside range (0 = instant disconnect) */
  coherenceDecayRate: number;

  // Available formations
  availableFormations: PackFormation[];

  // Reproduction
  /** Can new bodies be grown/added */
  canGrowBodies: boolean;
  /** Can bodies be merged from other entities */
  canMergeBodies: boolean;
  /** Time to grow a new body (ticks) */
  bodyGrowthTime: number;

  // Special abilities
  /** Whether bodies share senses in real-time */
  sharedSenses: boolean;
  /** Whether damage is distributed across all bodies */
  distributedDamage: boolean;
  /** Whether consciousness survives with any single body */
  canSurviveInOneBody: boolean;
  /** Whether the pack can split into sub-packs */
  canSplit: boolean;
}

/**
 * Default species configurations for pack minds
 */
export const PACK_SPECIES_CONFIGS: Record<string, PackSpeciesConfig> = {
  // Standard distributed consciousness - moderate limits
  distributed: {
    speciesId: 'distributed',
    speciesName: 'Distributed Mind',
    maxBodies: 'unlimited',
    minBodies: 1,
    coherenceRange: 100,
    coherenceDecayRate: 0.01,
    availableFormations: ['cluster', 'line', 'spread', 'defensive'],
    canGrowBodies: true,
    canMergeBodies: false,
    bodyGrowthTime: 1000,
    sharedSenses: true,
    distributedDamage: false,
    canSurviveInOneBody: true,
    canSplit: true,
  },

  // Gestalt entity - limited bodies but strong connection
  gestalt: {
    speciesId: 'gestalt',
    speciesName: 'Gestalt Being',
    maxBodies: 4,
    minBodies: 2,
    coherenceRange: 50,
    coherenceDecayRate: 0.05,
    availableFormations: ['cluster', 'line'],
    canGrowBodies: false,
    canMergeBodies: true,
    bodyGrowthTime: 0,
    sharedSenses: true,
    distributedDamage: true, // Damage spread across all bodies
    canSurviveInOneBody: false, // Dies if reduced to one body
    canSplit: false,
  },

  // Swarm intelligence - many bodies, simple connection
  swarm: {
    speciesId: 'swarm',
    speciesName: 'Swarm Consciousness',
    maxBodies: 'unlimited',
    minBodies: 10,
    coherenceRange: 30,
    coherenceDecayRate: 0,
    availableFormations: ['cluster', 'spread', 'defensive'],
    canGrowBodies: true,
    canMergeBodies: true,
    bodyGrowthTime: 50,
    sharedSenses: false, // Too many for full sharing
    distributedDamage: true,
    canSurviveInOneBody: false,
    canSplit: true,
  },

  // Projection mind - one real body, many projections
  projection: {
    speciesId: 'projection',
    speciesName: 'Projection Mind',
    maxBodies: 8,
    minBodies: 1,
    coherenceRange: 200,
    coherenceDecayRate: 0.02,
    availableFormations: ['cluster', 'line', 'spread'],
    canGrowBodies: true,
    canMergeBodies: false,
    bodyGrowthTime: 100,
    sharedSenses: true,
    distributedDamage: false, // Only real body takes damage
    canSurviveInOneBody: true,
    canSplit: false,
  },

  // Twins/triplets - biological multi-body
  biological: {
    speciesId: 'biological',
    speciesName: 'Multi-Body Organism',
    maxBodies: 3,
    minBodies: 2,
    coherenceRange: 500, // Long range pheromone/psychic bond
    coherenceDecayRate: 0.001,
    availableFormations: ['cluster', 'line'],
    canGrowBodies: false,
    canMergeBodies: false,
    bodyGrowthTime: 0,
    sharedSenses: false,
    distributedDamage: false,
    canSurviveInOneBody: true,
    canSplit: false,
  },
};

/**
 * Get or create a species config. Returns distributed default for unknown species.
 */
export function getPackSpeciesConfig(speciesId: string): PackSpeciesConfig {
  return PACK_SPECIES_CONFIGS[speciesId] ?? PACK_SPECIES_CONFIGS['distributed']!;
}

// ============================================================================
// PACK MIND TYPES
// ============================================================================

/**
 * Legacy pack limits - kept for compatibility but species config takes precedence
 * @deprecated Use PackSpeciesConfig instead
 */
export const PACK_LIMITS = {
  /** @deprecated - use species config maxBodies */
  maxBodies: 'unlimited' as const,
  formations: ['cluster', 'line', 'spread', 'defensive'] as const,
  coherenceSimple: false, // Now range-based
  llmCallsPerTick: 1,
  bodyLossSimple: false, // Now species-dependent
} as const;

/**
 * Pack formation types
 */
export type PackFormation = 'cluster' | 'line' | 'spread' | 'defensive';

/**
 * Pack body specialization
 */
export type PackBodyRole =
  | 'primary'      // Main decision-making body
  | 'scout'        // Reconnaissance
  | 'defender'     // Protection
  | 'carrier'      // Resource transport
  | 'communicator' // Social interactions
  | 'reserve';     // Backup/resting body

/**
 * A single body within the pack
 */
export interface PackBody {
  /** Body entity ID */
  entityId: string;
  /** Body's name within the pack */
  name: string;
  /** Role specialization */
  role: PackBodyRole;
  /** Body health (0-1) */
  health: number;
  /** Body stamina (0-1) */
  stamina: number;
  /** Current position */
  positionX: number;
  positionY: number;
  /** Whether this body is currently active */
  isActive: boolean;
  /** Whether this body can sense (eyes, ears working) */
  canSense: boolean;
  /** Whether this body can act (limbs working) */
  canAct: boolean;
  /** Formation offset from center */
  formationOffsetX: number;
  formationOffsetY: number;
}

/**
 * Pack mind collective state
 */
export interface PackMind {
  /** Unique pack ID */
  id: string;
  /** Pack's singular name */
  name: string;
  /** Species configuration (defines all limits) */
  speciesConfig: PackSpeciesConfig;
  /** All bodies in the pack */
  bodies: PackBody[];
  /** Current number of bodies */
  bodyCount: number;
  /** Pack coherence (0-1, range-based) */
  coherence: number;
  /** Whether all bodies are within coherence range */
  isCoherent: boolean;
  /** Bodies currently in range */
  bodiesInRange: Set<string>;
  /** Bodies out of range */
  bodiesOutOfRange: Set<string>;
  /** Current formation */
  formation: PackFormation;
  /** Formation center X */
  centerX: number;
  /** Formation center Y */
  centerY: number;
  /** Pack-wide shared memory */
  sharedMemory: PackMemory[];
  /** Combined stats (modified by body count) */
  combinedStrength: number;
  combinedPerception: number;
  combinedSpeed: number;
  /** Pack creation tick */
  formedAt: number;
  /** Current emotional state (shared) */
  sharedEmotion: 'focused' | 'anxious' | 'confident' | 'exhausted' | 'grieving';
  /** Bodies lost history */
  bodiesLost: number;
  /** Whether pack has ever been fragmented */
  hasExperiencedFragmentation: boolean;
}

/**
 * Shared pack memory
 */
export interface PackMemory {
  /** Memory ID */
  id: string;
  /** Type */
  type: 'location' | 'threat' | 'resource' | 'ally' | 'experience';
  /** Description */
  description: string;
  /** Location if applicable */
  locationX?: number;
  locationY?: number;
  /** Which body perceived this */
  perceivedByBodyId: string;
  /** When remembered */
  tick: number;
  /** Importance (for pruning) */
  importance: number;
}

// ============================================================================
// PACK MEMBER COMPONENT
// ============================================================================

/**
 * Component for entities that are part of a pack mind
 */
export interface PackMemberComponent {
  type: 'pack_member';
  version: number;
  /** Which pack this body belongs to */
  packId: string;
  /** Body index within pack (0 = primary) */
  bodyIndex: number;
  /** Body role */
  role: PackBodyRole;
  /** Connection to pack mind (should always be 1 when coherent) */
  connectionStrength: number;
  /** Distance from pack center */
  distanceFromCenter: number;
  /** Whether currently following formation */
  inFormation: boolean;
}

// ============================================================================
// HUMOROUS CONTENT
// ============================================================================

/**
 * Pack names (Pratchett/Adams/Gaiman style)
 */
export const PACK_NAMES: string[] = [
  'Self And Also Self',
  'The Distributed Argument',
  'We Who Are Also I',
  'Six Bodies, One Opinion (Allegedly)',
  'The Walking Quorum',
  'Me, Myself, And Also Those Four',
  'The Consensus That Walks',
  'Legion (But Friendly)',
  'Multiple Choice (One Answer)',
  'The Committee Made Flesh',
  'All Of Us Are Named Steve',
  'The Unanimous Waddle',
  'OneAndAlsoOne',
  'The Simultaneous Sneeze',
];

/**
 * Pack body nicknames (for the "primary" to call the others)
 */
export const BODY_NICKNAMES: string[] = [
  'The Tall One',
  'The One With The Hat',
  'The Clumsy One',
  'The One Who Remembers',
  'The Fast One',
  'The One Who Argues',
  'The Quiet One',
  'The One With The Limp',
  'The Pretty One',
  'The Practical One',
  'The One Who Gets Hungry First',
  'The Optimist',
];

/**
 * Pack internal monologue thoughts
 */
export const PACK_THOUGHTS: string[] = [
  'We see through six eyes. We still miss the obvious sometimes.',
  'Being in six places at once is less useful than you\'d think.',
  'We argued with ourselves. We won and lost simultaneously.',
  'The left two bodies want lunch. The right two disagree. We are at an impasse.',
  'We tried to sneak up on ourselves once. It did not go well.',
  'Some say we are lucky to never be lonely. Some have never shared a headache across six skulls.',
  'We are of one mind. That mind is currently thinking about cheese.',
  'Coordination is our strength. We still trip over our own feet sometimes.',
  'We remember being one body. It was so quiet. We miss it. We do not miss it.',
  'Today we realized we cannot hug ourselves. This was unexpected.',
  'Six bodies means six times the appetite. The logistics are challenging.',
  'We high-fived ourselves once. It was exactly as satisfying as you\'d expect.',
];

/**
 * Body loss grieving thoughts
 */
export const BODY_LOSS_THOUGHTS: string[] = [
  'We are fewer now. The silence where that voice was hurts.',
  'Five now. The formation feels wrong. There is a gap where comfort used to be.',
  'We lost a part of ourselves. We remember being whole. We remember.',
  'The others feel the absence. We all feel the absence. It is the same absence.',
  'One less perspective. One less heartbeat in our chorus.',
  'We will adapt. We always adapt. We do not want to adapt.',
  'The body is gone. The memories remain. They echo louder now.',
  'We are diminished. We are still us. We are less of us.',
];

/**
 * Formation change announcements
 */
export const FORMATION_ANNOUNCEMENTS: Record<PackFormation, string[]> = {
  cluster: [
    'We gather close. Comfort in proximity.',
    'Cluster formation. All bodies within arm\'s reach.',
    'We become a huddle. It feels like a hug we give ourselves.',
    'Tight formation. We can almost forget we are many.',
  ],
  line: [
    'We spread into a line. Maximum awareness, minimum comfort.',
    'Line formation. We see in all directions now.',
    'We become a procession of one mind.',
    'Stretched thin but still connected. The mental thread holds.',
  ],
  spread: [
    'We scatter to cover more ground. The world becomes wider.',
    'Spread formation. We are everywhere and nowhere.',
    'Maximum coverage. We can see everything. We can protect nothing.',
    'Like fingers on an open hand. Reaching. Grasping at what?',
  ],
  defensive: [
    'We form a circle. Nothing gets through without our knowledge.',
    'Defensive formation. Eyes outward. Trust inward.',
    'The perimeter is us. Threats will be observed.',
    'A ring of awareness. The center holds something precious: ourselves.',
  ],
};

// ============================================================================
// PACK MIND SYSTEM
// ============================================================================

/**
 * Pack Mind System
 * Manages distributed consciousness across multiple bodies
 */
export class PackMindSystem implements System {
  public readonly id: SystemId = 'pack_mind';
  public readonly priority: number = 161;
  public readonly requiredComponents: ReadonlyArray<ComponentType> = [];

  private eventBus: EventBus | null = null;

  // Active pack minds
  private packs: Map<string, PackMind> = new Map();

  // Tick throttling
  private lastUpdateTick = 0;
  private static readonly UPDATE_INTERVAL = 10;

  // Formation spacing
  private static readonly CLUSTER_SPACING = 2;
  private static readonly LINE_SPACING = 3;
  private static readonly SPREAD_SPACING = 8;

  public setEventBus(eventBus: EventBus): void {
    this.eventBus = eventBus;
  }

  /**
   * Create a new pack mind
   * @param speciesId - Species type determines all limits (bodies, range, abilities)
   */
  public createPack(
    world: World,
    bodyEntities: Entity[],
    centerX: number,
    centerY: number,
    speciesId: string = 'distributed'
  ): PackMind | null {
    const speciesConfig = getPackSpeciesConfig(speciesId);

    // Check minimum body requirement
    if (bodyEntities.length < speciesConfig.minBodies) {
      return null;
    }

    // Check maximum body limit (if not unlimited)
    if (speciesConfig.maxBodies !== 'unlimited' && bodyEntities.length > speciesConfig.maxBodies) {
      return null;
    }

    const name = PACK_NAMES[Math.floor(Math.random() * PACK_NAMES.length)]!;

    const bodies: PackBody[] = bodyEntities.map((entity, index) => ({
      entityId: entity.id,
      name: index === 0 ? 'Primary' : BODY_NICKNAMES[index % BODY_NICKNAMES.length]!,
      role: index === 0 ? 'primary' as PackBodyRole : this.assignRole(index),
      health: 1.0,
      stamina: 1.0,
      positionX: centerX,
      positionY: centerY,
      isActive: true,
      canSense: true,
      canAct: true,
      formationOffsetX: 0,
      formationOffsetY: 0,
    }));

    // All bodies start in range
    const bodiesInRange = new Set(bodies.map(b => b.entityId));

    const pack: PackMind = {
      id: `pack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      speciesConfig,
      bodies,
      bodyCount: bodies.length,
      coherence: 1.0,
      isCoherent: true,
      bodiesInRange,
      bodiesOutOfRange: new Set(),
      formation: speciesConfig.availableFormations[0] ?? 'cluster',
      centerX,
      centerY,
      sharedMemory: [],
      combinedStrength: bodies.length * 10,
      combinedPerception: bodies.length * 8,
      combinedSpeed: 10 + bodies.length,
      formedAt: world.tick,
      sharedEmotion: 'focused',
      bodiesLost: 0,
      hasExperiencedFragmentation: false,
    };

    // Calculate initial formation
    this.updateFormation(pack);

    this.packs.set(pack.id, pack);

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'pack:created' as any,
        source: 'pack-mind-system',
        data: {
          packId: pack.id,
          packName: name,
          speciesId,
          speciesName: speciesConfig.speciesName,
          bodyCount: pack.bodyCount,
          maxBodies: speciesConfig.maxBodies,
          coherenceRange: speciesConfig.coherenceRange,
          centerX,
          centerY,
        },
      });
    }

    return pack;
  }

  /**
   * Assign a role based on body index
   */
  private assignRole(index: number): PackBodyRole {
    const roles: PackBodyRole[] = ['scout', 'defender', 'carrier', 'communicator', 'reserve'];
    return roles[(index - 1) % roles.length]!;
  }

  /**
   * Update formation positions
   */
  private updateFormation(pack: PackMind): void {
    const clusterSpacing = PackMindSystem.CLUSTER_SPACING;
    const lineSpacing = PackMindSystem.LINE_SPACING;
    const spreadSpacing = PackMindSystem.SPREAD_SPACING;

    pack.bodies.forEach((body, index) => {
      switch (pack.formation) {
        case 'cluster':
          // Circular arrangement, tight
          if (index === 0) {
            body.formationOffsetX = 0;
            body.formationOffsetY = 0;
          } else {
            const angle = (2 * Math.PI * (index - 1)) / Math.max(1, pack.bodies.length - 1);
            body.formationOffsetX = Math.cos(angle) * clusterSpacing;
            body.formationOffsetY = Math.sin(angle) * clusterSpacing;
          }
          break;

        case 'line':
          // Horizontal line
          body.formationOffsetX = (index - pack.bodies.length / 2) * lineSpacing;
          body.formationOffsetY = 0;
          break;

        case 'spread':
          // Spread out in a larger circle
          const spreadAngle = (2 * Math.PI * index) / pack.bodies.length;
          body.formationOffsetX = Math.cos(spreadAngle) * spreadSpacing;
          body.formationOffsetY = Math.sin(spreadAngle) * spreadSpacing;
          break;

        case 'defensive':
          // Ring formation with primary in center
          if (index === 0) {
            body.formationOffsetX = 0;
            body.formationOffsetY = 0;
          } else {
            const defAngle = (2 * Math.PI * (index - 1)) / Math.max(1, pack.bodies.length - 1);
            body.formationOffsetX = Math.cos(defAngle) * lineSpacing * 1.5;
            body.formationOffsetY = Math.sin(defAngle) * lineSpacing * 1.5;
          }
          break;
      }
    });
  }

  /**
   * Change pack formation
   * Only allows formations defined in species config
   */
  public setFormation(packId: string, formation: PackFormation): boolean {
    const pack = this.packs.get(packId);
    if (!pack) return false;

    // Check if formation is available for this species
    if (!pack.speciesConfig.availableFormations.includes(formation)) {
      return false;
    }

    const oldFormation = pack.formation;
    pack.formation = formation;
    this.updateFormation(pack);

    const announcements = FORMATION_ANNOUNCEMENTS[formation];
    const announcement = announcements[Math.floor(Math.random() * announcements.length)]!;

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'pack:formation_changed' as any,
        source: 'pack-mind-system',
        data: {
          packId,
          oldFormation,
          newFormation: formation,
          announcement,
        },
      });
    }

    return true;
  }

  /**
   * Lose a body.
   * Respects species-specific minimum body requirements.
   */
  public loseBody(_world: World, packId: string, bodyEntityId: string): boolean {
    const pack = this.packs.get(packId);
    if (!pack) return false;

    const bodyIndex = pack.bodies.findIndex((b) => b.entityId === bodyEntityId);
    if (bodyIndex === -1) return false;

    const { minBodies, canSurviveInOneBody, distributedDamage } = pack.speciesConfig;

    const lostBody = pack.bodies[bodyIndex]!;
    pack.bodies.splice(bodyIndex, 1);
    pack.bodyCount--;
    pack.bodiesLost++;

    // Remove from range tracking
    pack.bodiesInRange.delete(bodyEntityId);
    pack.bodiesOutOfRange.delete(bodyEntityId);

    // Stat penalty for body loss
    // If distributed damage, other bodies also take damage
    if (distributedDamage && pack.bodies.length > 0) {
      const sharedDamage = 0.2 / pack.bodies.length;
      for (const body of pack.bodies) {
        body.health = Math.max(0.1, body.health - sharedDamage);
      }
    }

    pack.combinedStrength = Math.max(5, pack.combinedStrength - 10);
    pack.combinedPerception = Math.max(4, pack.combinedPerception - 8);
    pack.combinedSpeed = Math.max(5, pack.combinedSpeed - 1);

    // Emotional impact
    pack.sharedEmotion = 'grieving';

    // Get grieving thought
    const griefThought = BODY_LOSS_THOUGHTS[Math.floor(Math.random() * BODY_LOSS_THOUGHTS.length)]!;

    // Update formation
    this.updateFormation(pack);

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'pack:body_lost' as any,
        source: 'pack-mind-system',
        data: {
          packId,
          lostBodyId: bodyEntityId,
          lostBodyName: lostBody.name,
          remainingBodies: pack.bodyCount,
          minBodies,
          griefThought,
        },
      });
    }

    // Check for pack dissolution based on species rules
    const belowMinimum = pack.bodyCount < minBodies;
    const singleBodyDeath = pack.bodyCount === 1 && !canSurviveInOneBody;
    const noBodies = pack.bodyCount === 0;

    if (noBodies || singleBodyDeath || belowMinimum) {
      this.packs.delete(packId);
      if (this.eventBus) {
        this.eventBus.emit({
          type: 'pack:dissolved' as any,
          source: 'pack-mind-system',
          data: {
            packId,
            packName: pack.name,
            totalBodiesLost: pack.bodiesLost,
            reason: noBodies ? 'no_bodies' : singleBodyDeath ? 'cannot_survive_alone' : 'below_minimum',
          },
        });
      }
    }

    return true;
  }

  /**
   * Add a body to the pack.
   * Respects species-specific limits.
   */
  public addBody(
    _world: World,
    packId: string,
    bodyEntity: Entity,
    positionX?: number,
    positionY?: number
  ): boolean {
    const pack = this.packs.get(packId);
    if (!pack) return false;

    const { maxBodies, canGrowBodies, canMergeBodies, coherenceRange } = pack.speciesConfig;

    // Check if species allows adding bodies
    if (!canGrowBodies && !canMergeBodies) {
      return false;
    }

    // Check species-specific limit (if not unlimited)
    if (maxBodies !== 'unlimited' && pack.bodyCount >= maxBodies) {
      return false;
    }

    // Check if position is in range (if provided)
    const bodyX = positionX ?? pack.centerX;
    const bodyY = positionY ?? pack.centerY;
    const dx = bodyX - pack.centerX;
    const dy = bodyY - pack.centerY;
    const distanceSquared = dx * dx + dy * dy;
    const inRange = distanceSquared <= coherenceRange * coherenceRange;

    const newBody: PackBody = {
      entityId: bodyEntity.id,
      name: BODY_NICKNAMES[pack.bodies.length % BODY_NICKNAMES.length]!,
      role: this.assignRole(pack.bodies.length),
      health: 1.0,
      stamina: 1.0,
      positionX: bodyX,
      positionY: bodyY,
      isActive: true,
      canSense: true,
      canAct: true,
      formationOffsetX: 0,
      formationOffsetY: 0,
    };

    pack.bodies.push(newBody);
    pack.bodyCount++;

    // Track range status
    if (inRange) {
      pack.bodiesInRange.add(bodyEntity.id);
    } else {
      pack.bodiesOutOfRange.add(bodyEntity.id);
    }

    // Stat boost for new body
    pack.combinedStrength += 10;
    pack.combinedPerception += 8;
    pack.combinedSpeed += 1;

    this.updateFormation(pack);

    if (this.eventBus) {
      this.eventBus.emit({
        type: 'pack:body_added' as any,
        source: 'pack-mind-system',
        data: {
          packId,
          bodyId: bodyEntity.id,
          bodyName: newBody.name,
          inRange,
          totalBodies: pack.bodyCount,
          maxBodies: maxBodies === 'unlimited' ? 'unlimited' : maxBodies,
        },
      });
    }

    return true;
  }

  /**
   * Add a memory shared by all bodies
   */
  public addSharedMemory(
    packId: string,
    type: PackMemory['type'],
    description: string,
    perceivedByBodyId: string,
    tick: number,
    importance: number,
    locationX?: number,
    locationY?: number
  ): PackMemory | null {
    const pack = this.packs.get(packId);
    if (!pack) return null;

    const memory: PackMemory = {
      id: `pmem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      locationX,
      locationY,
      perceivedByBodyId,
      tick,
      importance,
    };

    pack.sharedMemory.push(memory);

    // Keep memory size reasonable
    if (pack.sharedMemory.length > 50) {
      pack.sharedMemory.sort((a, b) => b.importance - a.importance);
      pack.sharedMemory = pack.sharedMemory.slice(0, 50);
    }

    return memory;
  }

  /**
   * Get a pack thought (for LLM flavor text)
   */
  public getPackThought(): string {
    return PACK_THOUGHTS[Math.floor(Math.random() * PACK_THOUGHTS.length)]!;
  }

  /**
   * Move pack center
   */
  public movePack(packId: string, newCenterX: number, newCenterY: number): void {
    const pack = this.packs.get(packId);
    if (!pack) return;

    pack.centerX = newCenterX;
    pack.centerY = newCenterY;

    // Update all body positions based on formation
    for (const body of pack.bodies) {
      body.positionX = newCenterX + body.formationOffsetX;
      body.positionY = newCenterY + body.formationOffsetY;
    }
  }

  /**
   * Check/update coherence based on species range
   */
  public updateCoherence(packId: string): boolean {
    const pack = this.packs.get(packId);
    if (!pack) return false;

    const { coherenceRange, coherenceDecayRate } = pack.speciesConfig;

    // Track which bodies are in/out of range
    pack.bodiesInRange.clear();
    pack.bodiesOutOfRange.clear();

    let totalCoherence = 0;
    for (const body of pack.bodies) {
      const dx = body.positionX - pack.centerX;
      const dy = body.positionY - pack.centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= coherenceRange) {
        pack.bodiesInRange.add(body.entityId);
        // Full coherence for this body
        totalCoherence += 1.0;
      } else {
        pack.bodiesOutOfRange.add(body.entityId);
        // Degraded coherence based on decay rate
        const excessDistance = distance - coherenceRange;
        const bodyCoherence = Math.max(0, 1.0 - excessDistance * coherenceDecayRate);
        totalCoherence += bodyCoherence;
      }
    }

    // Average coherence across all bodies
    const wasCoherent = pack.isCoherent;
    const oldCoherence = pack.coherence;
    pack.coherence = pack.bodies.length > 0 ? totalCoherence / pack.bodies.length : 0;
    pack.isCoherent = pack.bodiesOutOfRange.size === 0;

    // Emit events on significant changes
    if (wasCoherent && !pack.isCoherent) {
      pack.hasExperiencedFragmentation = true;
      pack.sharedEmotion = 'anxious';

      if (this.eventBus) {
        this.eventBus.emit({
          type: 'pack:fragmented' as any,
          source: 'pack-mind-system',
          data: {
            packId,
            packName: pack.name,
            bodiesOutOfRange: pack.bodiesOutOfRange.size,
            coherence: pack.coherence,
          },
        });
      }
    } else if (!wasCoherent && pack.isCoherent) {
      pack.sharedEmotion = 'focused';

      if (this.eventBus) {
        this.eventBus.emit({
          type: 'pack:reunited' as any,
          source: 'pack-mind-system',
          data: {
            packId,
            packName: pack.name,
            coherence: pack.coherence,
          },
        });
      }
    } else if (Math.abs(oldCoherence - pack.coherence) > 0.1) {
      // Significant coherence change
      if (this.eventBus) {
        this.eventBus.emit({
          type: 'pack:coherence_changed' as any,
          source: 'pack-mind-system',
          data: {
            packId,
            oldCoherence,
            newCoherence: pack.coherence,
            bodiesInRange: pack.bodiesInRange.size,
            bodiesOutOfRange: pack.bodiesOutOfRange.size,
          },
        });
      }
    }

    return pack.isCoherent;
  }

  /**
   * Main update loop
   */
  update(world: World, _entities: ReadonlyArray<Entity>, _deltaTime: number): void {
    if (world.tick - this.lastUpdateTick < PackMindSystem.UPDATE_INTERVAL) {
      return;
    }
    this.lastUpdateTick = world.tick;

    for (const pack of Array.from(this.packs.values())) {
      // Update coherence
      this.updateCoherence(pack.id);

      // Recover from grieving over time
      if (pack.sharedEmotion === 'grieving') {
        // After some time, transition to another emotion
        if (Math.random() < 0.01) {
          pack.sharedEmotion = pack.isCoherent ? 'focused' : 'anxious';
        }
      }

      // Update stamina
      for (const body of pack.bodies) {
        if (body.stamina < 1.0 && body.isActive) {
          body.stamina = Math.min(1.0, body.stamina + 0.001);
        }
      }

      // Periodic status emit
      if (world.tick % 500 === 0) {
        if (this.eventBus) {
          this.eventBus.emit({
            type: 'pack:status_update' as any,
            source: 'pack-mind-system',
            data: {
              packId: pack.id,
              packName: pack.name,
              bodyCount: pack.bodyCount,
              isCoherent: pack.isCoherent,
              formation: pack.formation,
              emotion: pack.sharedEmotion,
              thought: this.getPackThought(),
            },
          });
        }
      }
    }
  }

  /**
   * Get all packs
   */
  public getPacks(): PackMind[] {
    return Array.from(this.packs.values());
  }

  /**
   * Get pack by ID
   */
  public getPack(packId: string): PackMind | undefined {
    return this.packs.get(packId);
  }

  /**
   * Get pack by body entity ID
   */
  public getPackByBody(bodyEntityId: string): PackMind | undefined {
    for (const pack of Array.from(this.packs.values())) {
      if (pack.bodies.some((b) => b.entityId === bodyEntityId)) {
        return pack;
      }
    }
    return undefined;
  }
}

// Singleton instance
let packMindSystemInstance: PackMindSystem | null = null;

/**
 * Get the singleton PackMindSystem instance
 */
export function getPackMindSystem(): PackMindSystem {
  if (!packMindSystemInstance) {
    packMindSystemInstance = new PackMindSystem();
  }
  return packMindSystemInstance;
}

/**
 * Reset the system (for testing)
 */
export function resetPackMindSystem(): void {
  packMindSystemInstance = null;
}
