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
import type { EmpireComponent } from '../components/EmpireComponent.js';
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

    // Get agent component
    const agent = entity.getComponent<AgentComponent>(CT.Agent);
    if (!agent) {
      continue;
    }

    // Get identity for name and age
    const identity = entity.getComponent(CT.Identity);
    if (!identity) {
      continue;
    }

    // Calculate age from identity
    const age = (identity && 'age' in identity && typeof identity.age === 'number') ? identity.age : 25;

    // Get skills
    const skillsComp = entity.getComponent<SkillsComponent>(CT.Skills);
    const skills = skillsComp ? new Map(Object.entries(skillsComp.levels)) : new Map();

    // Get personality traits (using personality component properties as proxy for traits)
    const personality = entity.getComponent<PersonalityComponent>(CT.Personality);
    const traits: string[] = [];

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
      agentName: (identity && 'name' in identity && typeof identity.name === 'string') ? identity.name : 'Unknown',
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
 * Civil war claimant
 */
export interface CivilWarClaimant {
  agentId: string;
  agentName: string;
  legitimacy: number;
  supportingNations: string[];
  militaryStrength: number;
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

  // Get empire component
  const empire = empireEntity.getComponent<EmpireComponent>(CT.Empire);
  if (!empire) {
    console.error('[EmpireDynastyManager] Empire component not found for civil war');
    return;
  }

  // Find rival claimants (all dynasty members with legitimacy > 0.2)
  const claimants = findRivalClaimants(world, empire.leadership.dynasty?.dynastyId || '', tick);

  if (claimants.length === 0) {
    console.warn('[EmpireDynastyManager] No rival claimants found for civil war');
    return;
  }

  // Drop empire stability significantly
  const stabilityDrop = 0.3;
  const newStability = Math.max(0, (empire.stability.imperialLegitimacy / 100) - stabilityDrop);

  // Update empire component with stability drop
  (empireEntity as EntityImpl).updateComponent<EmpireComponent>(CT.Empire, (current) => ({
    ...current,
    stability: {
      ...current.stability,
      imperialLegitimacy: newStability * 100,
    },
    centralAuthority: Math.max(0, (current.centralAuthority || 0.7) - 0.2),
  }));

  // Nations pick sides based on loyalty, distance, and claimant legitimacy
  const nationAllegiances = assignNationAllegiances(world, empire, claimants, tick);

  // Update claimant support based on nation assignments
  for (const claimant of claimants) {
    claimant.supportingNations = [];
    claimant.militaryStrength = 0;
  }

  for (const [nationId, claimantId] of nationAllegiances.entries()) {
    const claimant = claimants.find(c => c.agentId === claimantId);
    if (claimant) {
      claimant.supportingNations.push(nationId);

      // Each nation adds military strength (simplified)
      const nationRecord = empire.nationRecords.find(n => n.nationId === nationId);
      if (nationRecord) {
        claimant.militaryStrength += nationRecord.militaryContribution;
      }
    }
  }

  // Emit civil war started event
  world.eventBus.emit({
    type: 'empire:civil_war_started',
    source: empireEntity.id,
    data: {
      empireName,
      claimantCount: claimants.length,
      crisisReason,
      tick,
    },
  });

  // Emit claimant declared events
  for (const claimant of claimants) {
    world.eventBus.emit({
      type: 'empire:claimant_declared',
      source: empireEntity.id,
      data: {
        empireName,
        claimantId: claimant.agentId,
        claimantName: claimant.agentName,
        legitimacy: claimant.legitimacy,
        supportingNations: claimant.supportingNations,
        tick,
      },
    });
  }
}

/**
 * Find rival claimants for civil war
 */
function findRivalClaimants(
  world: World,
  dynastyId: string,
  currentTick: number
): CivilWarClaimant[] {
  const claimants: CivilWarClaimant[] = [];

  // Query all dynasty members
  const dynastyEntities = world.query().with(CT.Dynasty).executeEntities();

  for (const entity of dynastyEntities) {
    const dynasty = entity.getComponent<DynastyComponent>(CT.Dynasty);
    if (!dynasty || dynasty.dynastyId !== dynastyId) {
      continue;
    }

    // Skip current ruler
    if (dynasty.isRuler) {
      continue;
    }

    // Only include claimants with minimum legitimacy threshold
    const legitimacy = calculateLegitimacy(dynasty, 'primogeniture');
    if (legitimacy < 0.2) {
      continue;
    }

    // Get agent name
    const identity = entity.getComponent(CT.Identity);
    const agentName = (identity && 'name' in identity && typeof identity.name === 'string') ? identity.name : 'Unknown Claimant';

    claimants.push({
      agentId: entity.id,
      agentName,
      legitimacy,
      supportingNations: [],
      militaryStrength: 0,
    });
  }

  return claimants;
}

/**
 * Assign nations to claimants based on various factors
 */
function assignNationAllegiances(
  world: World,
  empire: EmpireComponent,
  claimants: CivilWarClaimant[],
  tick: number
): Map<string, string> {
  const allegiances = new Map<string, string>();

  if (claimants.length === 0) {
    return allegiances;
  }

  // Each nation picks a side based on:
  // 1. Claimant legitimacy (40%)
  // 2. Nation loyalty to empire (30% - low loyalty = support rebellion)
  // 3. Random factor (30% - represents local politics, personalities)

  for (const nationRecord of empire.nationRecords) {
    const nationId = nationRecord.nationId;

    // Calculate scores for each claimant
    if (claimants.length === 0) {
      continue; // No claimants, skip this nation
    }

    let bestClaimant = claimants[0]!; // Safe: checked length above
    let bestScore = -Infinity;

    for (const claimant of claimants) {
      // Legitimacy factor (0-1)
      const legitimacyScore = claimant.legitimacy;

      // Loyalty factor (low loyalty = more likely to support rebellion)
      // Core nations more likely to stay loyal to strongest claimant
      const loyaltyFactor = nationRecord.isCore
        ? 0.8
        : 1.0 - (nationRecord.loyaltyToEmpire || 0.5);

      // Random factor (0-1)
      const randomFactor = Math.random();

      // Weighted score
      const score =
        legitimacyScore * 0.4 +
        loyaltyFactor * 0.3 +
        randomFactor * 0.3;

      if (score > bestScore) {
        bestScore = score;
        bestClaimant = claimant;
      }
    }

    // Assign nation to claimant
    allegiances.set(nationId, bestClaimant.agentId);

    // Get nation name for event
    const nationName = nationRecord.nationName || 'Unknown Nation';

    // Emit nation picked side event
    world.eventBus.emit({
      type: 'empire:nation_picked_side',
      source: empire.empireName,
      data: {
        empireName: empire.empireName,
        nationId,
        nationName,
        claimantId: bestClaimant.agentId,
        claimantName: bestClaimant.agentName,
        tick,
      },
    });
  }

  return allegiances;
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
