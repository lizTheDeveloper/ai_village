/**
 * ArchaeologicalSiteComponent - Tracks excavation sites and artifact discovery
 *
 * Created when megastructures transition to 'ruins' phase or when ancient ruins
 * are discovered through exploration. Sites contain potential technology/artifact
 * discoveries that can be excavated and reverse engineered.
 *
 * Integration:
 * - MegastructureMaintenanceSystem creates sites when phase becomes 'ruins'
 * - ArchaeologySystem processes excavation progress and discoveries
 * - TechnologyUnlockSystem handles reverse engineering artifacts
 *
 * @see MegastructureComponent
 * @see TechnologyEraComponent
 */

import type { Component } from '../ecs/Component.js';
import type { TechnologyEra } from './TechnologyEraComponent.js';

/**
 * Type of archaeological site
 */
export type SiteType =
  | 'megastructure_ruin'    // Collapsed megastructure (dyson sphere, wormhole gate)
  | 'ancient_city'          // Buried civilization ruins
  | 'buried_archive'        // Data storage facility or library
  | 'crash_site';           // Crashed spacecraft or orbital debris

/**
 * Excavation phase progression
 */
export type ExcavationPhase =
  | 'undiscovered'   // Site exists but not yet found
  | 'surveyed'       // Initial survey completed, site mapped
  | 'excavating'     // Active excavation in progress
  | 'analyzed'       // Excavation complete, artifacts catalogued
  | 'exhausted';     // All discoveries made, site depleted

/**
 * Artifact discovered at archaeological site
 */
export interface Artifact {
  /** Unique artifact ID */
  id: string;

  /** Human-readable name */
  name: string;

  /** Description of the artifact */
  description: string;

  /** Technology ID this artifact relates to */
  originTech: string;

  /** Era when this artifact was created */
  originEra: TechnologyEra;

  /** Reverse engineering progress (0-100) */
  reverseEngineeringProgress: number;

  /** Has this artifact been fully reverse engineered? */
  reverseEngineered: boolean;

  /** Tick when artifact was discovered */
  discoveredAtTick: number;

  /** Quality/condition of the artifact (0-1, affects reverse engineering) */
  condition: number;

  /** Complexity rating (1-10, affects reverse engineering difficulty) */
  complexity: number;
}

/**
 * ArchaeologicalSiteComponent - Excavation site with potential discoveries
 */
export interface ArchaeologicalSiteComponent extends Component {
  type: 'archaeological_site';

  // ============================================================================
  // IDENTITY
  // ============================================================================

  /** Unique site ID */
  siteId: string;

  /** Human-readable site name */
  siteName: string;

  /** Type of archaeological site */
  siteType: SiteType;

  // ============================================================================
  // ORIGIN
  // ============================================================================

  /** Era when the ruin was created (determines tech level of discoveries) */
  originEra: TechnologyEra;

  /** Entity ID of the megastructure/building that created this site (if applicable) */
  originEntityId?: string;

  /** Tick when the site was created (ruin collapsed, city buried, etc) */
  createdAtTick: number;

  /** Age of the site in ticks (current tick - createdAtTick) */
  ageInTicks: number;

  // ============================================================================
  // EXCAVATION STATE
  // ============================================================================

  /** Current excavation phase */
  excavationPhase: ExcavationPhase;

  /** Progress in current excavation phase (0-100) */
  excavationProgress: number;

  /** Tick when current phase started */
  phaseStartTick: number;

  /** Number of workers assigned to excavation */
  workersAssigned: number;

  /** Excavation difficulty multiplier (1-10, based on age and type) */
  excavationDifficulty: number;

  // ============================================================================
  // DISCOVERIES
  // ============================================================================

  /** Technology IDs that could potentially be found at this site */
  potentialDiscoveries: string[];

  /** Artifacts already discovered at this site */
  discoveredArtifacts: Artifact[];

  /** Number of discoveries remaining */
  remainingDiscoveries: number;

  // ============================================================================
  // LOGISTICS
  // ============================================================================

  /** Civilization/faction ID controlling this excavation */
  controlledBy?: string;

  /** Tick of last excavation activity */
  lastExcavationTick: number;

  /** Total work hours invested in excavation */
  workHoursInvested: number;

  // ============================================================================
  // METADATA
  // ============================================================================

  /** Archaeological value (1-10000+, from megastructure ruins) */
  archaeologicalValue: number;

  /** Discovery events (for history tracking) */
  discoveryEvents: Array<{
    tick: number;
    eventType: 'site_discovered' | 'phase_advanced' | 'artifact_found' | 'technology_unlocked';
    description: string;
    artifactId?: string;
    techId?: string;
  }>;
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a new archaeological site component
 */
export function createArchaeologicalSiteComponent(config: {
  siteId: string;
  siteName: string;
  siteType: SiteType;
  originEra: TechnologyEra;
  originEntityId?: string;
  currentTick: number;
  archaeologicalValue: number;
  potentialDiscoveries?: string[];
}): ArchaeologicalSiteComponent {
  // Calculate excavation difficulty based on site type and value
  let baseDifficulty = 1;
  switch (config.siteType) {
    case 'megastructure_ruin':
      baseDifficulty = 8; // Very difficult, massive scale
      break;
    case 'buried_archive':
      baseDifficulty = 6; // Difficult, requires careful excavation
      break;
    case 'ancient_city':
      baseDifficulty = 4; // Moderate, well-studied techniques
      break;
    case 'crash_site':
      baseDifficulty = 3; // Easier, modern/recent technology
      break;
  }

  // Archaeological value increases difficulty (more valuable = deeper/harder to access)
  const valueDifficultyMod = Math.min(2, config.archaeologicalValue / 10000);
  const excavationDifficulty = baseDifficulty + valueDifficultyMod;

  return {
    type: 'archaeological_site',
    version: 1,
    siteId: config.siteId,
    siteName: config.siteName,
    siteType: config.siteType,
    originEra: config.originEra,
    originEntityId: config.originEntityId,
    createdAtTick: config.currentTick,
    ageInTicks: 0,
    excavationPhase: 'undiscovered',
    excavationProgress: 0,
    phaseStartTick: config.currentTick,
    workersAssigned: 0,
    excavationDifficulty,
    potentialDiscoveries: config.potentialDiscoveries || [],
    discoveredArtifacts: [],
    remainingDiscoveries: config.potentialDiscoveries?.length || 0,
    lastExcavationTick: config.currentTick,
    workHoursInvested: 0,
    archaeologicalValue: config.archaeologicalValue,
    discoveryEvents: [
      {
        tick: config.currentTick,
        eventType: 'site_discovered',
        description: `Archaeological site discovered: ${config.siteName}`,
      },
    ],
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if site has discoveries remaining
 */
export function hasDiscoveriesRemaining(site: ArchaeologicalSiteComponent): boolean {
  return site.remainingDiscoveries > 0;
}

/**
 * Check if excavation is active
 */
export function isExcavationActive(site: ArchaeologicalSiteComponent): boolean {
  return site.excavationPhase === 'surveyed' || site.excavationPhase === 'excavating';
}

/**
 * Check if site is exhausted
 */
export function isSiteExhausted(site: ArchaeologicalSiteComponent): boolean {
  return site.excavationPhase === 'exhausted';
}

/**
 * Add a discovered artifact to the site
 */
export function addDiscoveredArtifact(
  site: ArchaeologicalSiteComponent,
  artifact: Artifact,
  tick: number
): void {
  site.discoveredArtifacts.push(artifact);
  site.remainingDiscoveries = Math.max(0, site.remainingDiscoveries - 1);

  site.discoveryEvents.push({
    tick,
    eventType: 'artifact_found',
    description: `Artifact discovered: ${artifact.name}`,
    artifactId: artifact.id,
    techId: artifact.originTech,
  });
}

/**
 * Advance to next excavation phase
 */
export function advanceExcavationPhase(
  site: ArchaeologicalSiteComponent,
  tick: number
): void {
  const phaseOrder: ExcavationPhase[] = ['undiscovered', 'surveyed', 'excavating', 'analyzed', 'exhausted'];
  const currentIndex = phaseOrder.indexOf(site.excavationPhase);

  if (currentIndex < phaseOrder.length - 1) {
    const newPhase = phaseOrder[currentIndex + 1];
    if (!newPhase) {
      throw new Error(`Invalid excavation phase index: ${currentIndex + 1}`);
    }

    site.excavationPhase = newPhase;
    site.excavationProgress = 0;
    site.phaseStartTick = tick;

    site.discoveryEvents.push({
      tick,
      eventType: 'phase_advanced',
      description: `Excavation phase advanced to: ${newPhase}`,
    });
  }
}

/**
 * Get artifact by ID
 */
export function getArtifactById(
  site: ArchaeologicalSiteComponent,
  artifactId: string
): Artifact | null {
  return site.discoveredArtifacts.find(a => a.id === artifactId) ?? null;
}

/**
 * Update artifact reverse engineering progress
 */
export function updateArtifactProgress(
  artifact: Artifact,
  progressDelta: number
): void {
  artifact.reverseEngineeringProgress = Math.min(
    100,
    artifact.reverseEngineeringProgress + progressDelta
  );

  if (artifact.reverseEngineeringProgress >= 100) {
    artifact.reverseEngineered = true;
  }
}

/**
 * Calculate excavation difficulty modifier based on age
 * Older sites are harder to excavate (erosion, degradation)
 */
export function calculateAgeDifficultyModifier(ageInYears: number): number {
  // Linear increase in difficulty: +10% per 1000 years, max 2x difficulty
  const modifier = 1 + Math.min(1, ageInYears / 10000);
  return modifier;
}
