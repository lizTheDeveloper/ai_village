/**
 * TimeCompressionSnapshotComponent - Era snapshots for time-travel archaeology
 *
 * When time jumps occur (fast-forward spanning years/centuries), this component
 * stores historical snapshots that enable time-travel archaeology and narrative
 * reconstruction.
 *
 * Each snapshot captures:
 * - Era metadata (name, period, civilization state)
 * - Major events that occurred during the compressed period
 * - Soul trajectories (what happened to individual souls)
 * - Cultural/technological developments
 *
 * Used by TimeCompressionSystem during processTimeJump.
 */

import type { Component } from '../ecs/Component.js';
import type { Tick } from '../types.js';

/**
 * Soul trajectory during compressed time
 */
export interface SoulTrajectory {
  /** Soul entity ID */
  soulId: string;

  /** Soul name for reference */
  soulName: string;

  /** Narrative summary of what happened to this soul */
  narrative: string;

  /** Major events this soul experienced */
  majorEvents: string[];

  /** Character development/growth */
  characterDevelopment: string;

  /** Skills/knowledge gained during this period */
  skillsGained: string[];

  /** Relationship changes */
  relationshipChanges: string[];

  /** Notable achievements */
  achievements: string[];
}

/**
 * Historical era snapshot
 */
export interface EraSnapshot {
  /** Era number (century count) */
  eraNumber: number;

  /** Poetic/historical name for this era */
  eraName: string;

  /** Starting tick of this era */
  startTick: number;

  /** Ending tick of this era */
  endTick: number;

  /** Years covered by this era */
  yearsCovered: number;

  /** Era summary (2-3 paragraphs) */
  summary: string;

  /** Major historical events */
  majorEvents: string[];

  /** Cultural developments (art, social structures, innovations) */
  culturalDevelopments: string[];

  /** Notable historical figures */
  notableFigures: string[];

  /** Major conflicts/wars */
  conflicts: string[];

  /** How this era influenced future generations */
  legacy: string;

  /** Population at end of era */
  populationAtEnd: number;

  /** Technology level descriptor */
  technologyLevel: string;

  /** Soul trajectories for souls that lived during this era */
  soulTrajectories: SoulTrajectory[];

  /** When this snapshot was created (real time) */
  createdAt: number;
}

/**
 * TimeCompressionSnapshotComponent - Stores era snapshots for archaeology
 *
 * This component lives on a singleton entity and accumulates era snapshots
 * as time compression occurs.
 */
export interface TimeCompressionSnapshotComponent extends Component {
  type: 'time_compression_snapshot';

  /** All era snapshots, ordered chronologically */
  snapshots: EraSnapshot[];

  /** Total number of time jumps that have occurred */
  totalTimeJumps: number;

  /** Total years compressed across all jumps */
  totalYearsCompressed: number;

  /** Last snapshot created (for quick access) */
  lastSnapshot?: EraSnapshot;
}

/**
 * Create a TimeCompressionSnapshotComponent
 */
export function createTimeCompressionSnapshotComponent(): TimeCompressionSnapshotComponent {
  return {
    type: 'time_compression_snapshot',
    version: 1,
    snapshots: [],
    totalTimeJumps: 0,
    totalYearsCompressed: 0,
  };
}

/**
 * Add an era snapshot to the component
 */
export function addEraSnapshot(
  component: TimeCompressionSnapshotComponent,
  snapshot: EraSnapshot
): TimeCompressionSnapshotComponent {
  return {
    ...component,
    snapshots: [...component.snapshots, snapshot],
    totalTimeJumps: component.totalTimeJumps + 1,
    totalYearsCompressed: component.totalYearsCompressed + snapshot.yearsCovered,
    lastSnapshot: snapshot,
  };
}

/**
 * Get snapshot by era number
 */
export function getSnapshotByEra(
  component: TimeCompressionSnapshotComponent,
  eraNumber: number
): EraSnapshot | undefined {
  return component.snapshots.find(s => s.eraNumber === eraNumber);
}

/**
 * Get snapshots in a time range
 */
export function getSnapshotsInRange(
  component: TimeCompressionSnapshotComponent,
  startTick: Tick,
  endTick: Tick
): EraSnapshot[] {
  return component.snapshots.filter(
    s => s.startTick <= endTick && s.endTick >= startTick
  );
}

/**
 * Get soul's trajectory across all eras
 */
export function getSoulHistoricalTrajectory(
  component: TimeCompressionSnapshotComponent,
  soulId: string
): SoulTrajectory[] {
  const trajectories: SoulTrajectory[] = [];

  for (const snapshot of component.snapshots) {
    const soulTrajectory = snapshot.soulTrajectories.find(t => t.soulId === soulId);
    if (soulTrajectory) {
      trajectories.push(soulTrajectory);
    }
  }

  return trajectories;
}

/**
 * Get a narrative summary of all compressed history
 */
export function getCompressedHistorySummary(
  component: TimeCompressionSnapshotComponent
): string {
  if (component.snapshots.length === 0) {
    return 'No time compression has occurred.';
  }

  const { totalTimeJumps, totalYearsCompressed, snapshots } = component;

  const lines: string[] = [
    `Time Compression Summary`,
    `Total Jumps: ${totalTimeJumps}`,
    `Total Years Compressed: ${totalYearsCompressed.toLocaleString()}`,
    ``,
    `Eras:`,
  ];

  for (const snapshot of snapshots) {
    lines.push(
      `- Era ${snapshot.eraNumber}: ${snapshot.eraName} (${snapshot.yearsCovered} years)`
    );
    lines.push(`  Summary: ${snapshot.summary.slice(0, 100)}...`);
  }

  return lines.join('\n');
}

/**
 * Create a soul trajectory record
 */
export function createSoulTrajectory(data: {
  soulId: string;
  soulName: string;
  narrative: string;
  majorEvents?: string[];
  characterDevelopment?: string;
  skillsGained?: string[];
  relationshipChanges?: string[];
  achievements?: string[];
}): SoulTrajectory {
  return {
    soulId: data.soulId,
    soulName: data.soulName,
    narrative: data.narrative,
    majorEvents: data.majorEvents ?? [],
    characterDevelopment: data.characterDevelopment ?? '',
    skillsGained: data.skillsGained ?? [],
    relationshipChanges: data.relationshipChanges ?? [],
    achievements: data.achievements ?? [],
  };
}

/**
 * Create an era snapshot
 */
export function createEraSnapshot(data: {
  eraNumber: number;
  eraName: string;
  startTick: number;
  endTick: number;
  yearsCovered: number;
  summary: string;
  majorEvents?: string[];
  culturalDevelopments?: string[];
  notableFigures?: string[];
  conflicts?: string[];
  legacy?: string;
  populationAtEnd: number;
  technologyLevel: string;
  soulTrajectories?: SoulTrajectory[];
}): EraSnapshot {
  return {
    eraNumber: data.eraNumber,
    eraName: data.eraName,
    startTick: data.startTick,
    endTick: data.endTick,
    yearsCovered: data.yearsCovered,
    summary: data.summary,
    majorEvents: data.majorEvents ?? [],
    culturalDevelopments: data.culturalDevelopments ?? [],
    notableFigures: data.notableFigures ?? [],
    conflicts: data.conflicts ?? [],
    legacy: data.legacy ?? 'The impact of this era on future generations remains to be seen.',
    populationAtEnd: data.populationAtEnd,
    technologyLevel: data.technologyLevel,
    soulTrajectories: data.soulTrajectories ?? [],
    createdAt: Date.now(),
  };
}
