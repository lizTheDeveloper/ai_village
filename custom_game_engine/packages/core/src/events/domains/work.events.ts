/**
 * Work and profession events.
 * Covers profession work simulation, work started/completed events.
 */
import type { EntityId } from '../../types.js';

export interface WorkEvents {
  /** Profession work started by agent */
  'profession:work_started': {
    agentId: EntityId;
    profession: string;
    workstation?: EntityId;
    shift: 'morning' | 'afternoon' | 'evening' | 'night';
  };

  /** Profession work completed by agent */
  'profession:work_completed': {
    agentId: EntityId;
    profession: string;
    outputItems?: string[];
    quality: number;
    workHours: number;
  };

  /** Profession output aggregated (city-level) */
  'profession:output_aggregated': {
    cityId?: EntityId;
    profession: string;
    outputCount: number;
    averageQuality: number;
    activeWorkers: number;
  };
}

export type WorkEventType = keyof WorkEvents;
export type WorkEventData = WorkEvents[WorkEventType];
