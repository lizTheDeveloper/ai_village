/**
 * Navigation, exploration, and spatial events.
 */
import type { EntityId } from '../../types.js';

export interface NavigationEvents {
  'chunk_background_generated': {
    chunkX: number;
    chunkY: number;
    priority: string;
    requestedBy: string;
    tick: number;
  };
  'chunk_prediction_queued': {
    count: number;
    tick: number;
  };
  'terrain:modified': {
    x: number;
    y: number;
    z?: number;
  };
  'zone:menu:opened': Record<string, never>;
  'zone:menu:closed': Record<string, never>;
  'zone:type:selected': {
    zoneType: string;
  };
  'zone:painted': {
    zoneId: string;
    zoneType: string;
    tileCount: number;
  };
  'zone:erased': {
    tileCount: number;
  };
  'exploration:milestone': {
    agentId: EntityId;
    entityId?: EntityId;
    milestoneType: string;
    location: { x: number; y: number };
  };
  'navigation:arrived': {
    agentId: EntityId;
    entityId?: EntityId;
    destination: { x: number; y: number };
    target?: EntityId;
  };
  'spatial:snapshot': {
    agentId: EntityId;
    timestamp: number;
    features: unknown[];
  };
  'passage:activated': {
    passageId: string;
    sourceUniverse: string;
    targetUniverse: string;
  };
  'passage:entity_traversed': {
    passageId: string;
    sourceUniverse: string;
    targetUniverse: string;
    targetPosition?: { x: number; y: number; z: number };
    cost: number;
  };
  'passage:traversal_failed': {
    passageId: string;
    reason: string;
  };
  'passage:collapsed': {
    passageId: string;
  };
}

export type NavigationEventType = keyof NavigationEvents;
export type NavigationEventData = NavigationEvents[NavigationEventType];
