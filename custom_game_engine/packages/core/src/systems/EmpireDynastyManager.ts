/**
 * EmpireDynastyManager - Dynasty succession logic for empires
 *
 * Handles:
 * - Heir selection based on succession law
 * - Legitimacy calculation
 * - Succession crisis detection
 * - Dynasty continuity
 *
 * Used by EmpireSystem for dynasty management.
 */

import type { World } from '../ecs/World.js';
import type { EntityImpl } from '../ecs/Entity.js';
import { ComponentType as CT } from '../types/ComponentType.js';
import type { DynastyComponent, SuccessionPosition } from '../components/DynastyComponent.js';
import type { AgentComponent } from '../components/AgentComponent.js';
import type { SkillsComponent } from '../components/SkillsComponent.js';
import type { PersonalityComponent } from '../components/PersonalityComponent.js';
import { calculateLegitimacy, updateLegitimacyFactors } from '../components/DynastyComponent.js';

/**
 * Succession algorithm type
 */
export type SuccessionAlgorithm = 'primogeniture' | 'election' | 'meritocracy' | 'divine_right';

/**
 * Heir candidate with calculated scores
 */
export interface HeirCandidate {
  agentId: string;
  agentName: string;
  dynastyComponent: DynastyComponent;
  legitimacy: number;
  age: number;
  skills: number;
  bloodlineCloseness: number;
  publicSupport: number;
}

/**
 * Succession result
 */
export interface SuccessionResult {
  heir: HeirCandidate | null;
  crisis: boolean;
  crisisReason?: string;
  candidates: HeirCandidate[];
}

/**
 * Select heir based on succession algorithm
 */
export function selectHeir(
  world: World,
  dynastyId: string,
  currentRulerId: string,
  algorithm: SuccessionAlgorithm,
  currentTick: number
): SuccessionResult {
  // Query all agents with this dynasty
  const candidates = getCandidates(world, dynastyId, currentTick);

  // No candidates = succession crisis
  if (candidates.length === 0) {
    return {
      heir: null,
      crisis: true,
      crisisReason: 'no_eligible_heirs',
      candidates: [],
    };
  }

  // Apply succession algorithm
  const heir = applySuccessionAlgorithm(candidates, algorithm);

  // Check for low legitimacy (crisis threshold = 0.3)
  const crisis = heir.legitimacy < 0.3;
  const crisisReason = crisis ? 'low_legitimacy' : undefined;

  return {
    heir,
    crisis,
    crisisReason,
    candidates,
  };
}

/**
 * Get all eligible heir candidates
 */
function getCandidates(
  world: World,
  dynastyId: string,
  currentTick: number
): HeirCandidate[] {
  const candidates: HeirCandidate[] = [];

  // Query all entities with Dynasty component
  const dynastyEntities = world.query().with(CT.Dynasty).executeEntities();

  for (const entity of dynastyEntities) {
    const dynasty = entity.getComponent<DynastyComponent>(CT.Dynasty);
    if (!dynasty || dynasty.dynastyId !== dynastyId) {
      continue;
    }

    // Skip if already ruling
    if (dynasty.isRuler) {
      continue;
    }

    // Get agent component for name and age
    const agent = entity.getComponent<AgentComponent>(CT.Agent);
    if (!agent) {
      continue;
    }

    // Calculate age (assume 1 tick = 1 day, 365 ticks/year)
    const age = agent.age ?? 25; // Default to 25 if not set

    // Get skills
    const skillsComp = entity.getComponent<SkillsComponent>(CT.Skills);
    const skills = skillsComp?.skills ?? new Map();

    // Get traits
    const personality = entity.getComponent<PersonalityComponent>(CT.Personality);
    const traits = personality?.traits ?? [];

    // Update legitimacy factors
    const updatedDynasty = updateLegitimacyFactors(
      dynasty,
      age,
      skills,
      traits,
      0.5 // Default public support
    );

    // Calculate legitimacy for this succession type
    const legitimacy = calculateLegitimacy(updatedDynasty, 'primogeniture');

    // Calculate skill score
    const governanceSkill = skills.get('governance') ?? 0;
    const diplomacySkill = skills.get('diplomacy') ?? 0;
    const militarySkill = skills.get('military') ?? 0;
    const skillScore = (governanceSkill + diplomacySkill + militarySkill) / 30;

    candidates.push({
      agentId: entity.id,
      agentName: agent.name,
      dynastyComponent: updatedDynasty,
      legitimacy,
      age,
      skills: skillScore,
      bloodlineCloseness: updatedDynasty.legitimacyFactors.bloodlineCloseness,
      publicSupport: updatedDynasty.legitimacyFactors.publicSupport,
    });
  }

  return candidates;
}

/**
 * Apply succession algorithm to select best heir
 */
function applySuccessionAlgorithm(
  candidates: HeirCandidate[],
  algorithm: SuccessionAlgorithm
): HeirCandidate {
  if (candidates.length === 0) {
    throw new Error('No candidates available for succession');
  }

  switch (algorithm) {
    case 'primogeniture':
      return selectByPrimogeniture(candidates);

    case 'election':
      return selectByElection(candidates);

    case 'meritocracy':
      return selectByMerit(candidates);

    case 'divine_right':
      return selectByDivineRight(candidates);

    default:
      return selectByPrimogeniture(candidates);
  }
}

/**
 * Primogeniture: Eldest child of direct line inherits
 */
function selectByPrimogeniture(candidates: HeirCandidate[]): HeirCandidate {
  // Sort by: lineageDistance (closer = better), then age (older = better)
  const sorted = [...candidates].sort((a, b) => {
    const aDistance = a.dynastyComponent.lineageDistance;
    const bDistance = b.dynastyComponent.lineageDistance;

    if (aDistance !== bDistance) {
      return aDistance - bDistance; // Closer lineage wins
    }

    // Same lineage distance, older wins
    return b.age - a.age;
  });

  return sorted[0]!;
}

/**
 * Elective: Council votes based on public support and skills
 */
function selectByElection(candidates: HeirCandidate[]): HeirCandidate {
  // Sort by: publicSupport (weighted 0.6) + skills (weighted 0.4)
  const sorted = [...candidates].sort((a, b) => {
    const aScore = a.publicSupport * 0.6 + a.skills * 0.4;
    const bScore = b.publicSupport * 0.6 + b.skills * 0.4;
    return bScore - aScore; // Higher score wins
  });

  return sorted[0]!;
}

/**
 * Meritocracy: Highest skill/stats candidate
 */
function selectByMerit(candidates: HeirCandidate[]): HeirCandidate {
  // Sort by: skills (weighted 0.7) + age factor (weighted 0.3)
  const sorted = [...candidates].sort((a, b) => {
    // Age factor: optimal 30-50
    const aAgeFactor = a.age < 30 ? a.age / 30 : a.age > 50 ? Math.max(0, 1 - (a.age - 50) / 30) : 1.0;
    const bAgeFactor = b.age < 30 ? b.age / 30 : b.age > 50 ? Math.max(0, 1 - (b.age - 50) / 30) : 1.0;

    const aScore = a.skills * 0.7 + aAgeFactor * 0.3;
    const bScore = b.skills * 0.7 + bAgeFactor * 0.3;
    return bScore - aScore; // Higher score wins
  });

  return sorted[0]!;
}

/**
 * Divine Right: Bloodline purity dominates
 */
function selectByDivineRight(candidates: HeirCandidate[]): HeirCandidate {
  // Sort by: bloodlineCloseness (weighted 0.8) + publicSupport (weighted 0.2)
  const sorted = [...candidates].sort((a, b) => {
    const aScore = a.bloodlineCloseness * 0.8 + a.publicSupport * 0.2;
    const bScore = b.bloodlineCloseness * 0.8 + b.publicSupport * 0.2;
    return bScore - aScore; // Higher score wins
  });

  return sorted[0]!;
}

/**
 * Handle succession crisis (civil war risk)
 */
export function handleSuccessionCrisis(
  world: World,
  empireEntity: EntityImpl,
  empireName: string,
  crisisReason: string,
  tick: number
): void {
  // Emit crisis event
  world.eventBus.emit({
    type: 'empire:succession_crisis',
    source: empireEntity.id,
    data: {
      empireName,
      crisisReason,
      tick,
    },
  });

  // TODO: Create civil war mechanics
  // - Rival claimants raise armies
  // - Nations choose sides
  // - Empire stability drops
}

/**
 * Execute succession (change ruler)
 */
export function executeSuccession(
  world: World,
  empireEntity: EntityImpl,
  empireName: string,
  newRulerId: string,
  tick: number
): void {
  // Emit succession event
  world.eventBus.emit({
    type: 'empire:ruler_changed',
    source: empireEntity.id,
    data: {
      empireName,
      newRulerId,
      tick,
    },
  });

  // Update dynasty component on new ruler
  const rulerEntity = world.getEntity(newRulerId);
  if (rulerEntity) {
    const dynasty = rulerEntity.getComponent<DynastyComponent>(CT.Dynasty);
    if (dynasty) {
      (rulerEntity as EntityImpl).updateComponent<DynastyComponent>(CT.Dynasty, (current) => ({
        ...current,
        isRuler: true,
        isHeir: false,
        reignStart: tick,
        titles: [...current.titles, `Emperor ${current.dynastyName}`],
        lastUpdatedTick: tick,
      }));
    }
  }
}
