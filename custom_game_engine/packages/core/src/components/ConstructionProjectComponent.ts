/**
 * ConstructionProjectComponent - Active megastructure construction management
 *
 * This component tracks an active construction project for a megastructure.
 * It manages resource requirements, timeline, progress, coordination, and risks.
 *
 * Key Features:
 * - Multi-phase construction with milestones
 * - Resource delivery tracking
 * - Labor and energy allocation
 * - Multi-system coordination (for mega-projects)
 * - Risk management (collapse, budget overruns, delays)
 *
 * Lifecycle:
 * 1. Create project with requirements and timeline
 * 2. Deliver resources and allocate labor/energy
 * 3. Progress through construction phases
 * 4. Complete project → create operational MegastructureComponent
 *
 * Integration:
 * - Works with MegastructureComponent (creates upon completion)
 * - Uses SpaceflightItems.ts for resource requirements
 * - Coordinates across spatial tiers for mega-projects
 *
 * @see openspec/specs/grand-strategy/09-MEGASTRUCTURES.md
 * @see MegastructureComponent.ts
 */

import type { Component } from '../ecs/Component.js';

/**
 * Construction phase within a project
 */
export interface ConstructionPhase {
  name: string;                          // Phase name ("Planet Cracking", "Deployment")
  durationTicks: number;                 // Expected duration in ticks
  resourcesNeeded: Record<string, number>; // itemId → quantity required for this phase
  milestones: string[];                  // Key achievements in this phase
}

/**
 * Project requirements
 */
export interface ProjectRequirements {
  techLevelRequired: number;             // Minimum tech level (1-10)
  resources: Record<string, number>;     // itemId → total quantity needed
  totalMass: number;                     // Total mass in kg
  laborRequired: number;                 // Total person-years needed
  energyRequired: number;                // Total kWh needed

  // Special prerequisites
  planetCrackerRequired?: boolean;       // Must have planet cracker operational
  dysonSwarmRequired?: boolean;          // Must have Dyson swarm operational
  wormholeRequired?: boolean;            // Must have wormhole access
}

/**
 * Project timeline
 */
export interface ProjectTimeline {
  startTick: number;                     // When construction began
  estimatedCompletionTick: number;       // Expected completion tick
  phases: ConstructionPhase[];           // Construction phases
}

/**
 * Current progress tracking
 */
export interface ProjectProgress {
  currentPhase: number;                  // Current phase index (0-based)
  phaseProgress: number;                 // Progress in current phase (0-1)
  overallProgress: number;               // Overall project progress (0-1)

  // Resources delivered so far
  resourcesDelivered: Record<string, number>; // itemId → quantity delivered
  laborAllocated: number;                // Current workers assigned
  energyAllocated: number;               // Current energy allocation (kW)
}

/**
 * Multi-system coordination
 */
export interface ProjectCoordination {
  managerEntityId?: string;              // Agent managing this project
  workerCount: number;                   // Total workers assigned
  factoryCount: number;                  // Factories producing components

  // For mega-projects spanning multiple star systems
  contributingSystems?: string[];        // System IDs sending resources
}

/**
 * Project risks
 */
export interface ProjectRisks {
  collapseRisk: number;                  // 0-1 probability of catastrophic failure
  budgetOverrun: number;                 // % over original estimate (0-5+)
  delayTicks: number;                    // Ticks behind schedule
  vulnerableTo: string[];                // Events that can disrupt construction
}

/**
 * ConstructionProjectComponent - Tracks active megastructure construction
 */
export interface ConstructionProjectComponent extends Component {
  type: 'construction_project';

  // ============================================================================
  // IDENTITY
  // ============================================================================

  /** Unique project ID */
  projectId: string;

  /** Type of megastructure being built */
  megastructureType: string;  // 'dyson_swarm', 'wormhole_gate', etc.

  /** Entity that will have the megastructure (if planet/system-attached) */
  targetEntityId?: string;

  // ============================================================================
  // REQUIREMENTS
  // ============================================================================

  /** What's needed to build this */
  requirements: ProjectRequirements;

  // ============================================================================
  // TIMELINE
  // ============================================================================

  /** Construction timeline and phases */
  timeline: ProjectTimeline;

  // ============================================================================
  // PROGRESS
  // ============================================================================

  /** Current progress */
  progress: ProjectProgress;

  // ============================================================================
  // COORDINATION
  // ============================================================================

  /** Multi-system coordination */
  coordination: ProjectCoordination;

  // ============================================================================
  // RISKS
  // ============================================================================

  /** Project risks */
  risks: ProjectRisks;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new construction project
 */
export function createConstructionProjectComponent(config: {
  projectId: string;
  megastructureType: string;
  targetEntityId?: string;
  requirements: ProjectRequirements;
  timeline: ProjectTimeline;
}): ConstructionProjectComponent {
  return {
    type: 'construction_project',
    version: 1,
    projectId: config.projectId,
    megastructureType: config.megastructureType,
    targetEntityId: config.targetEntityId,
    requirements: config.requirements,
    timeline: config.timeline,
    progress: {
      currentPhase: 0,
      phaseProgress: 0,
      overallProgress: 0,
      resourcesDelivered: {},
      laborAllocated: 0,
      energyAllocated: 0,
    },
    coordination: {
      workerCount: 0,
      factoryCount: 0,
    },
    risks: {
      collapseRisk: 0.001,  // 0.1% base risk
      budgetOverrun: 0,
      delayTicks: 0,
      vulnerableTo: ['war', 'economic_collapse', 'solar_flare', 'sabotage'],
    },
  };
}

/**
 * Create a simple construction project with single phase
 */
export function createSimpleConstructionProject(config: {
  projectId: string;
  megastructureType: string;
  techLevelRequired: number;
  resources: Record<string, number>;
  totalMass: number;
  laborRequired: number;
  energyRequired: number;
  durationTicks: number;
  startTick: number;
}): ConstructionProjectComponent {
  const timeline: ProjectTimeline = {
    startTick: config.startTick,
    estimatedCompletionTick: config.startTick + config.durationTicks,
    phases: [
      {
        name: 'Construction',
        durationTicks: config.durationTicks,
        resourcesNeeded: config.resources,
        milestones: ['Foundation', 'Structure', 'Systems', 'Completion'],
      },
    ],
  };

  return createConstructionProjectComponent({
    projectId: config.projectId,
    megastructureType: config.megastructureType,
    requirements: {
      techLevelRequired: config.techLevelRequired,
      resources: config.resources,
      totalMass: config.totalMass,
      laborRequired: config.laborRequired,
      energyRequired: config.energyRequired,
    },
    timeline,
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Deliver resources to the project
 */
export function deliverResources(
  project: ConstructionProjectComponent,
  resources: Record<string, number>
): void {
  // Cache reference to avoid repeated property access
  const delivered = project.progress.resourcesDelivered;

  // Use for-in loop (faster than Object.entries)
  for (const itemId in resources) {
    const quantity = resources[itemId];
    if (quantity === undefined) {
      throw new Error(`Resource quantity undefined for itemId: ${itemId}`);
    }
    delivered[itemId] = (delivered[itemId] || 0) + quantity;
  }
}

/**
 * Allocate labor to the project
 */
export function allocateLabor(
  project: ConstructionProjectComponent,
  workerCount: number
): void {
  project.progress.laborAllocated = workerCount;
  project.coordination.workerCount = workerCount;
}

/**
 * Allocate energy to the project
 */
export function allocateEnergy(
  project: ConstructionProjectComponent,
  kW: number
): void {
  project.progress.energyAllocated = kW;
}

/**
 * Update construction progress
 */
export function updateProgress(
  project: ConstructionProjectComponent,
  deltaProgress: number
): void {
  // Cache references for faster access
  const progress = project.progress;
  const currentPhaseIdx = progress.currentPhase;

  // Validate current phase exists
  if (currentPhaseIdx >= project.timeline.phases.length) {
    throw new Error('No current phase available');
  }

  // Inline Math.min for hot path
  const newPhaseProgress = progress.phaseProgress + deltaProgress;
  progress.phaseProgress = newPhaseProgress > 1.0 ? 1.0 : newPhaseProgress;

  // Check if phase is complete
  if (newPhaseProgress >= 1.0) {
    advanceToNextPhase(project);
  }

  // Inline overall progress calculation to avoid function call
  const totalPhases = project.timeline.phases.length;
  progress.overallProgress = (progress.currentPhase + progress.phaseProgress) / totalPhases;
}

/**
 * Advance to next construction phase
 */
function advanceToNextPhase(project: ConstructionProjectComponent): void {
  const progress = project.progress;
  if (progress.currentPhase < project.timeline.phases.length - 1) {
    progress.currentPhase++;
    progress.phaseProgress = 0;
  }
}

/**
 * Update overall progress based on phase completion
 */
function updateOverallProgress(project: ConstructionProjectComponent): void {
  const totalPhases = project.timeline.phases.length;
  const progress = project.progress;

  progress.overallProgress = (progress.currentPhase + progress.phaseProgress) / totalPhases;
}

/**
 * Check if project is complete
 */
export function isComplete(project: ConstructionProjectComponent): boolean {
  return project.progress.overallProgress >= 1.0;
}

/**
 * Check if all resources have been delivered
 */
export function hasAllResources(project: ConstructionProjectComponent): boolean {
  // Cache references to avoid repeated property access
  const required = project.requirements.resources;
  const delivered = project.progress.resourcesDelivered;

  // Use for-in loop (faster than Object.entries)
  for (const itemId in required) {
    const requiredQty = required[itemId];
    if (requiredQty === undefined) {
      throw new Error(`Required quantity undefined for itemId: ${itemId}`);
    }
    if ((delivered[itemId] || 0) < requiredQty) {
      return false;
    }
  }
  return true;
}

/**
 * Calculate resource completion percentage
 */
export function getResourceCompletionPercent(project: ConstructionProjectComponent): number {
  // Cache references
  const required = project.requirements.resources;
  const delivered = project.progress.resourcesDelivered;

  let totalRequired = 0;
  let totalDelivered = 0;

  // Use for-in loop
  for (const itemId in required) {
    const requiredQty = required[itemId];
    if (requiredQty === undefined) {
      throw new Error(`Required quantity undefined for itemId: ${itemId}`);
    }
    totalRequired += requiredQty;
    totalDelivered += delivered[itemId] || 0;
  }

  // Early exit: avoid division by zero
  if (totalRequired === 0) {
    return 1.0;
  }

  // Inline Math.min
  const percent = totalDelivered / totalRequired;
  return percent > 1.0 ? 1.0 : percent;
}

// Reusable empty object to avoid allocations
const EMPTY_RESOURCES: Record<string, number> = {};

/**
 * Get missing resources (what's still needed)
 */
export function getMissingResources(
  project: ConstructionProjectComponent
): Record<string, number> {
  // Cache references
  const required = project.requirements.resources;
  const delivered = project.progress.resourcesDelivered;

  let hasMissing = false;
  const missing: Record<string, number> = {};

  // Use for-in loop
  for (const itemId in required) {
    const requiredQty = required[itemId];
    if (requiredQty === undefined) {
      throw new Error(`Required quantity undefined for itemId: ${itemId}`);
    }
    const remaining = requiredQty - (delivered[itemId] || 0);
    if (remaining > 0) {
      missing[itemId] = remaining;
      hasMissing = true;
    }
  }

  // Return empty singleton if nothing missing (avoid allocation)
  return hasMissing ? missing : EMPTY_RESOURCES;
}

/**
 * Add delay to the project
 */
export function addDelay(
  project: ConstructionProjectComponent,
  delayTicks: number
): void {
  project.risks.delayTicks += delayTicks;
  project.timeline.estimatedCompletionTick += delayTicks;
}

/**
 * Increase budget overrun
 */
export function addBudgetOverrun(
  project: ConstructionProjectComponent,
  overrunPercent: number
): void {
  project.risks.budgetOverrun += overrunPercent;
}

/**
 * Increase collapse risk
 */
export function increaseCollapseRisk(
  project: ConstructionProjectComponent,
  riskIncrease: number
): void {
  // Inline Math.min for hot path
  const newRisk = project.risks.collapseRisk + riskIncrease;
  project.risks.collapseRisk = newRisk > 1.0 ? 1.0 : newRisk;
}

/**
 * Assign a manager to the project
 */
export function assignManager(
  project: ConstructionProjectComponent,
  managerEntityId: string
): void {
  project.coordination.managerEntityId = managerEntityId;
}

/**
 * Add a contributing system
 */
export function addContributingSystem(
  project: ConstructionProjectComponent,
  systemId: string
): void {
  if (!project.coordination.contributingSystems) {
    project.coordination.contributingSystems = [];
  }

  if (!project.coordination.contributingSystems.includes(systemId)) {
    project.coordination.contributingSystems.push(systemId);
  }
}

/**
 * Assign factories to the project
 */
export function assignFactories(
  project: ConstructionProjectComponent,
  factoryCount: number
): void {
  project.coordination.factoryCount = factoryCount;
}

/**
 * Get current phase
 */
export function getCurrentPhase(project: ConstructionProjectComponent): ConstructionPhase | null {
  return project.timeline.phases[project.progress.currentPhase] || null;
}

/**
 * Get current phase name
 */
export function getCurrentPhaseName(project: ConstructionProjectComponent): string {
  const phase = getCurrentPhase(project);
  return phase ? phase.name : 'Unknown';
}

/**
 * Calculate estimated ticks remaining
 */
export function getEstimatedTicksRemaining(
  project: ConstructionProjectComponent,
  currentTick: number
): number {
  // Inline Math.max
  const remaining = project.timeline.estimatedCompletionTick - currentTick;
  return remaining > 0 ? remaining : 0;
}

// Precomputed constant for schedule slack
const SCHEDULE_SLACK = 0.9;

/**
 * Check if project is behind schedule
 */
export function isBehindSchedule(
  project: ConstructionProjectComponent,
  currentTick: number
): boolean {
  // Cache timeline reference
  const timeline = project.timeline;
  const elapsed = currentTick - timeline.startTick;
  const total = timeline.estimatedCompletionTick - timeline.startTick;

  // Inline Math.min
  let expectedProgress: number;
  if (total > 0) {
    const ratio = elapsed / total;
    expectedProgress = ratio > 1.0 ? 1.0 : ratio;
  } else {
    expectedProgress = 1.0;
  }

  return project.progress.overallProgress < expectedProgress * SCHEDULE_SLACK;
}

/**
 * Check if prerequisites are met
 */
export function hasPrerequisites(
  project: ConstructionProjectComponent,
  hasFeatures: {
    techLevel: number;
    hasPlanetCracker?: boolean;
    hasDysonSwarm?: boolean;
    hasWormhole?: boolean;
  }
): boolean {
  // Cache requirements reference
  const req = project.requirements;

  // Early exits: check cheapest conditions first (tech level is just a number comparison)
  if (hasFeatures.techLevel < req.techLevelRequired) {
    return false;
  }

  // Check optional prerequisites (undefined checks are fast)
  if (req.planetCrackerRequired && !hasFeatures.hasPlanetCracker) {
    return false;
  }

  if (req.dysonSwarmRequired && !hasFeatures.hasDysonSwarm) {
    return false;
  }

  if (req.wormholeRequired && !hasFeatures.hasWormhole) {
    return false;
  }

  return true;
}

/**
 * Calculate total labor needed vs allocated
 */
export function getLaborProgress(project: ConstructionProjectComponent): {
  required: number;
  allocated: number;
  percent: number;
} {
  const required = project.requirements.laborRequired;
  const allocated = project.progress.laborAllocated;

  // Inline Math.min and conditional
  let percent: number;
  if (required > 0) {
    const ratio = allocated / required;
    percent = ratio > 1.0 ? 1.0 : ratio;
  } else {
    percent = 1.0;
  }

  return { required, allocated, percent };
}

/**
 * Calculate total energy needed vs allocated
 */
export function getEnergyProgress(project: ConstructionProjectComponent): {
  required: number;
  allocated: number;
  percent: number;
} {
  const required = project.requirements.energyRequired;
  const allocated = project.progress.energyAllocated;

  // Inline Math.min and conditional
  let percent: number;
  if (required > 0) {
    const ratio = allocated / required;
    percent = ratio > 1.0 ? 1.0 : ratio;
  } else {
    percent = 1.0;
  }

  return { required, allocated, percent };
}
