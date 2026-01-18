import type { Component } from '../ecs/Component.js';
import type { EntityId, Tick } from '../types.js';

/**
 * Perceived skill represents what one agent knows about another's skills.
 * Per progressive-skill-reveal-spec.md: Social skill gates knowledge about others' skills.
 */
export interface PerceivedSkill {
  skillId: string; // e.g., 'building', 'cooking', 'farming'
  level: number; // Perceived level (0-5) - may not match actual level
  confidence: number; // 0-100: How confident they are in this perception
  lastObserved: Tick; // When this skill was last observed
}

export interface RomanticMilestone {
  event: string;
  tick?: Tick;
}

export interface RomanticCourtship {
  initiator: EntityId;
  accepted: boolean;
  progress: number; // 0-100
  courtshipActions: number;
}

export interface RomanticIntimacy {
  encounters: number;
  physical: number; // 0-100
  emotional: number; // 0-100
  level: number; // 0-100 (average of physical and emotional)
}

export interface RomanticHistory {
  milestones: RomanticMilestone[];
  offspringCount: number;
  endedReason?: string;
  endedAt?: Tick;
}

export interface RomanticRelationship {
  attraction: number; // 0-100
  stage: 'none' | 'acquaintance' | 'attracted' | 'courting' | 'dating' | 'committed' | 'bonded' | 'estranged';
  bondType: 'none' | 'dating' | 'engaged' | 'married' | 'life_partner';
  bondStrength: number; // 0-100
  exclusive: boolean;
  courtship?: RomanticCourtship;
  intimacy: RomanticIntimacy;
  history: RomanticHistory;
}

export interface Relationship {
  targetId: EntityId;
  familiarity: number; // 0-100: How well they know each other
  affinity: number; // -100 to 100: Do they like each other? (negative = dislike, positive = like)
  trust: number; // 0-100: Do they trust each other?
  lastInteraction: Tick;
  interactionCount: number;
  sharedMemories: number; // Count of information shared
  sharedMeals: number; // Count of meals shared together (for social bonding)
  perceivedSkills: PerceivedSkill[]; // What skills they perceive the target to have
  romantic?: RomanticRelationship; // Romantic relationship tracking (optional)
}

export interface RelationshipComponent extends Component {
  type: 'relationship';
  relationships: Map<EntityId, Relationship>;
}

export function createRelationshipComponent(): RelationshipComponent {
  return {
    type: 'relationship',
    version: 1,
    relationships: new Map(),
  };
}

/**
 * Ensure an entity has a RelationshipComponent, creating it if needed.
 * Used for lazy initialization - components are only added when first relationship is formed.
 *
 * @param entity - The entity to ensure has a relationship component
 * @returns The relationship component (existing or newly created)
 */
export function ensureRelationshipComponent(entity: { getComponent: (type: string) => any; addComponent?: (comp: any) => void; updateComponent?: (type: string, updater: (comp: any) => any) => void }): RelationshipComponent {
  let comp = entity.getComponent('relationship') as RelationshipComponent | undefined;
  if (!comp) {
    comp = createRelationshipComponent();
    // Support both addComponent (EntityImpl) and generic entities
    if (entity.addComponent) {
      entity.addComponent(comp);
    }
  }
  return comp;
}

export function getRelationship(
  component: RelationshipComponent,
  targetId: EntityId
): Relationship | undefined {
  return component.relationships.get(targetId);
}

export function updateRelationship(
  component: RelationshipComponent,
  targetId: EntityId,
  currentTick: Tick,
  familiarityIncrease: number = 5,
  affinityChange: number = 0
): RelationshipComponent {
  const existing = component.relationships.get(targetId);

  const updated: Relationship = existing
    ? {
        ...existing,
        familiarity: Math.min(100, existing.familiarity + familiarityIncrease),
        affinity: Math.max(-100, Math.min(100, existing.affinity + affinityChange)),
        lastInteraction: currentTick,
        interactionCount: existing.interactionCount + 1,
      }
    : {
        targetId,
        familiarity: familiarityIncrease,
        affinity: affinityChange,
        trust: 0,
        lastInteraction: currentTick,
        interactionCount: 1,
        sharedMemories: 0,
        sharedMeals: 0,
        perceivedSkills: [],
      };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

export function shareMemory(
  component: RelationshipComponent,
  targetId: EntityId
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing) return component;

  const updated: Relationship = {
    ...existing,
    sharedMemories: existing.sharedMemories + 1,
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

export function getFamiliarity(
  component: RelationshipComponent,
  targetId: EntityId
): number {
  const relationship = component.relationships.get(targetId);
  return relationship ? relationship.familiarity : 0;
}

export function getAllRelationships(
  component: RelationshipComponent
): Relationship[] {
  return Array.from(component.relationships.values());
}

export function getStrongestRelationships(
  component: RelationshipComponent,
  count: number = 5
): Relationship[] {
  return getAllRelationships(component)
    .sort((a, b) => b.familiarity - a.familiarity)
    .slice(0, count);
}

/**
 * Get affinity (-100 to 100) for a target.
 * Positive = likes, negative = dislikes.
 */
export function getAffinity(
  component: RelationshipComponent,
  targetId: EntityId
): number {
  const relationship = component.relationships.get(targetId);
  return relationship ? relationship.affinity : 0;
}

/**
 * Update affinity for a target.
 */
export function updateAffinity(
  component: RelationshipComponent,
  targetId: EntityId,
  affinityDelta: number
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing) return component;

  const updated: Relationship = {
    ...existing,
    affinity: Math.max(-100, Math.min(100, existing.affinity + affinityDelta)),
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Update trust for a target.
 */
export function updateTrust(
  component: RelationshipComponent,
  targetId: EntityId,
  trustDelta: number
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing) return component;

  const updated: Relationship = {
    ...existing,
    trust: Math.max(0, Math.min(100, existing.trust + trustDelta)),
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Record a shared meal between agents.
 * Increases affinity and sharedMeals count.
 */
export function recordSharedMeal(
  component: RelationshipComponent,
  targetId: EntityId,
  currentTick: Tick
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing) {
    // Create new relationship if none exists
    const newRel: Relationship = {
      targetId,
      familiarity: 5,
      affinity: 5, // Shared meals create positive affinity
      trust: 2,
      lastInteraction: currentTick,
      interactionCount: 1,
      sharedMemories: 0,
      sharedMeals: 1,
      perceivedSkills: [],
    };
    const newRelationships = new Map(component.relationships);
    newRelationships.set(targetId, newRel);
    return { ...component, relationships: newRelationships };
  }

  const updated: Relationship = {
    ...existing,
    familiarity: Math.min(100, existing.familiarity + 3),
    affinity: Math.min(100, existing.affinity + 5), // Eating together builds affinity
    trust: Math.min(100, existing.trust + 1),
    lastInteraction: currentTick,
    sharedMeals: existing.sharedMeals + 1,
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Get relationships sorted by affinity (friends first).
 */
export function getFriends(
  component: RelationshipComponent,
  count: number = 5
): Relationship[] {
  return getAllRelationships(component)
    .filter((r) => r.affinity > 0)
    .sort((a, b) => b.affinity - a.affinity)
    .slice(0, count);
}

/**
 * Get relationships with negative affinity (rivals/enemies).
 */
export function getRivals(
  component: RelationshipComponent,
  count: number = 5
): Relationship[] {
  return getAllRelationships(component)
    .filter((r) => r.affinity < 0)
    .sort((a, b) => a.affinity - b.affinity) // Most negative first
    .slice(0, count);
}

// ============================================================================
// ROMANTIC RELATIONSHIP FUNCTIONS
// ============================================================================

/**
 * Initialize romantic tracking for a relationship
 */
export function initializeRomantic(
  component: RelationshipComponent,
  targetId: EntityId,
  initialAttraction: number = 0
): RelationshipComponent {
  const existing = component.relationships.get(targetId);

  const baseRelationship: Relationship = existing ?? {
    targetId,
    familiarity: 0,
    affinity: 0,
    trust: 0,
    lastInteraction: 0,
    interactionCount: 0,
    sharedMemories: 0,
    sharedMeals: 0,
    perceivedSkills: [],
  };

  const updated: Relationship = {
    ...baseRelationship,
    romantic: {
      attraction: Math.max(0, Math.min(100, initialAttraction)),
      stage: initialAttraction > 20 ? 'attracted' : 'acquaintance',
      bondType: 'none',
      bondStrength: 0,
      exclusive: false,
      intimacy: {
        encounters: 0,
        physical: 0,
        emotional: 0,
        level: 0,
      },
      history: {
        milestones: [],
        offspringCount: 0,
      },
    },
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Update attraction level in a romantic relationship
 */
export function updateAttraction(
  component: RelationshipComponent,
  targetId: EntityId,
  attractionChange: number
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing) {
    // No-op if relationship doesn't exist - must be initialized first
    return component;
  }

  if (!existing.romantic) {
    // Initialize romantic tracking if relationship exists but romantic tracking doesn't
    return initializeRomantic(component, targetId, attractionChange);
  }

  const newAttraction = Math.max(0, Math.min(100, existing.romantic.attraction + attractionChange));

  // Update stage based on attraction level
  let newStage = existing.romantic.stage;
  if (newAttraction < 20) newStage = 'acquaintance';
  else if (newAttraction < 40) newStage = 'attracted';

  const updated: Relationship = {
    ...existing,
    romantic: {
      ...existing.romantic,
      attraction: newAttraction,
      stage: newStage,
    },
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Start courtship process
 */
export function startCourtship(
  component: RelationshipComponent,
  targetId: EntityId,
  initiatorId: EntityId,
  currentTick: Tick = 0
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing) {
    // No-op if relationship doesn't exist
    return component;
  }
  if (!existing.romantic) {
    throw new Error('Cannot start courtship without romantic tracking');
  }

  const updated: Relationship = {
    ...existing,
    romantic: {
      ...existing.romantic,
      stage: 'courting',
      courtship: {
        initiator: initiatorId,
        accepted: false,
        progress: 0,
        courtshipActions: 0,
      },
      history: {
        ...existing.romantic.history,
        milestones: [
          ...existing.romantic.history.milestones,
          { event: 'courtship_started', tick: currentTick },
        ],
      },
    },
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Progress courtship (e.g., gifts, displays)
 */
export function progressCourtship(
  component: RelationshipComponent,
  targetId: EntityId,
  progressAmount: number = 25
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing?.romantic?.courtship) {
    throw new Error('Cannot progress courtship without active courtship');
  }

  const newProgress = Math.min(100, existing.romantic.courtship.progress + progressAmount);
  const newActions = existing.romantic.courtship.courtshipActions + 1;

  const updated: Relationship = {
    ...existing,
    romantic: {
      ...existing.romantic,
      courtship: {
        ...existing.romantic.courtship,
        progress: newProgress,
        courtshipActions: newActions,
      },
    },
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Accept courtship
 */
export function acceptCourtship(
  component: RelationshipComponent,
  targetId: EntityId,
  currentTick: Tick = 0
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing?.romantic?.courtship) {
    throw new Error('Cannot accept courtship without active courtship');
  }

  const updated: Relationship = {
    ...existing,
    romantic: {
      ...existing.romantic,
      stage: 'dating',
      bondType: 'dating',
      courtship: {
        ...existing.romantic.courtship,
        accepted: true,
      },
      history: {
        ...existing.romantic.history,
        milestones: [
          ...existing.romantic.history.milestones,
          { event: 'courtship_accepted', tick: currentTick },
        ],
      },
    },
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Reject courtship
 */
export function rejectCourtship(
  component: RelationshipComponent,
  targetId: EntityId,
  currentTick: Tick = 0
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing?.romantic) {
    throw new Error('Cannot reject courtship without romantic tracking');
  }

  const updated: Relationship = {
    ...existing,
    romantic: {
      ...existing.romantic,
      stage: 'acquaintance',
      courtship: undefined,
      history: {
        ...existing.romantic.history,
        milestones: [
          ...existing.romantic.history.milestones,
          { event: 'courtship_rejected', tick: currentTick },
        ],
      },
    },
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Form or strengthen romantic bond
 */
export function formBond(
  component: RelationshipComponent,
  targetId: EntityId,
  bondType: string,
  currentTick: Tick = 0,
  exclusive: boolean = false
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing) {
    throw new Error('Cannot form bond without a relationship');
  }

  // Initialize romantic tracking if it doesn't exist
  let workingComponent = component;
  if (!existing.romantic) {
    workingComponent = initializeRomantic(component, targetId, 50);
  }

  const currentRel = workingComponent.relationships.get(targetId)!;

  // Map bond types to bond strengths
  const bondStrengthMap: Record<string, number> = {
    'casual': 20,
    'dating': 40,
    'exclusive': 60,
    'married': 80,
    'soul_bound': 100,
    'pair_bonded': 100,
  };

  const newBondStrength = bondStrengthMap[bondType];
  if (newBondStrength === undefined) {
    throw new Error(`Unknown bond type: ${bondType}`);
  }

  // Update stage based on bond strength
  let newStage = currentRel.romantic!.stage;
  if (newBondStrength >= 100) {
    newStage = 'bonded';
  } else if (newBondStrength >= 80) {
    newStage = 'committed';
  } else if (newBondStrength >= 40) {
    newStage = 'dating';
  }

  const updated: Relationship = {
    ...currentRel,
    romantic: {
      ...currentRel.romantic!,
      bondStrength: newBondStrength,
      stage: newStage,
      bondType: bondType as 'none' | 'dating' | 'engaged' | 'married' | 'life_partner',
      exclusive: exclusive,
      history: {
        ...currentRel.romantic!.history,
        milestones: [
          ...currentRel.romantic!.history.milestones,
          { event: `bond_formed_${bondType}`, tick: currentTick },
        ],
      },
    },
  };

  const newRelationships = new Map(workingComponent.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...workingComponent,
    relationships: newRelationships,
  };
}

/**
 * Record intimacy encounter
 */
export function recordIntimacy(
  component: RelationshipComponent,
  targetId: EntityId,
  currentTick: Tick = 0,
  physical: number = 20,
  emotional: number = 10
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing?.romantic) {
    throw new Error('Cannot record intimacy without romantic tracking');
  }

  const newEncounters = existing.romantic.intimacy.encounters + 1;
  const newPhysical = Math.min(100, existing.romantic.intimacy.physical + physical);
  const newEmotional = Math.min(100, existing.romantic.intimacy.emotional + emotional);
  const newLevel = (newPhysical + newEmotional) / 2;

  const updated: Relationship = {
    ...existing,
    romantic: {
      ...existing.romantic,
      intimacy: {
        encounters: newEncounters,
        physical: newPhysical,
        emotional: newEmotional,
        level: newLevel,
      },
    },
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Record offspring from relationship
 */
export function recordOffspring(
  component: RelationshipComponent,
  targetId: EntityId,
  currentTick: Tick = 0
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing?.romantic) {
    throw new Error('Cannot record offspring without romantic tracking');
  }

  const updated: Relationship = {
    ...existing,
    romantic: {
      ...existing.romantic,
      history: {
        ...existing.romantic.history,
        offspringCount: existing.romantic.history.offspringCount + 1,
        milestones: [
          ...existing.romantic.history.milestones,
          { event: 'had_offspring', tick: currentTick },
        ],
      },
    },
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * End romantic relationship
 */
export function endRelationship(
  component: RelationshipComponent,
  targetId: EntityId,
  reason: string = 'unknown',
  currentTick: Tick = 0
): RelationshipComponent {
  const existing = component.relationships.get(targetId);
  if (!existing?.romantic) {
    throw new Error('Cannot end relationship without romantic tracking');
  }

  const updated: Relationship = {
    ...existing,
    romantic: {
      ...existing.romantic,
      stage: 'estranged',
      bondType: 'none',
      bondStrength: 0,
      exclusive: false,
      courtship: undefined,
      history: {
        ...existing.romantic.history,
        endedReason: reason,
        endedAt: currentTick,
      },
    },
  };

  const newRelationships = new Map(component.relationships);
  newRelationships.set(targetId, updated);

  return {
    ...component,
    relationships: newRelationships,
  };
}

/**
 * Get all romantic partners (current dating/committed/bonded relationships)
 */
export function getPartners(component: RelationshipComponent): Relationship[] {
  return getAllRelationships(component).filter(
    (r) =>
      r.romantic &&
      (r.romantic.stage === 'dating' ||
        r.romantic.stage === 'committed' ||
        r.romantic.stage === 'bonded')
  );
}

/**
 * Get primary partner (highest bond strength)
 */
export function getPrimaryPartner(component: RelationshipComponent): Relationship | undefined {
  const partners = getPartners(component);
  if (partners.length === 0) return undefined;

  return partners.reduce((primary, current) => {
    const primaryStrength = primary.romantic?.bondStrength ?? 0;
    const currentStrength = current.romantic?.bondStrength ?? 0;
    return currentStrength > primaryStrength ? current : primary;
  });
}

/**
 * Check if agent has an exclusive relationship
 */
export function hasExclusiveRelationship(component: RelationshipComponent): boolean {
  return getAllRelationships(component).some((r) => r.romantic?.exclusive);
}

/**
 * Get all romantic relationships (past and present)
 */
export function getRomanticRelationships(component: RelationshipComponent): Relationship[] {
  return getAllRelationships(component).filter((r) => r.romantic !== undefined);
}

/**
 * Get attraction level for a specific target
 */
export function getAttraction(
  component: RelationshipComponent,
  targetId: EntityId
): number {
  const relationship = component.relationships.get(targetId);
  return relationship?.romantic?.attraction ?? 0;
}
