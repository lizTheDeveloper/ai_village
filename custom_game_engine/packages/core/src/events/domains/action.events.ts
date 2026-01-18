/**
 * Generic action events.
 */
import type { EntityId } from '../../types.js';

export interface ActionEvents {
  'action:till': {
    x: number;
    y: number;
    agentId?: EntityId;
    actorId?: EntityId;
    position?: { x: number; y: number };
  };
  'action:plant': {
    x: number;
    y: number;
    agentId?: EntityId;
    seedType?: string;
    speciesId?: string;
  };
  'action:water': {
    x?: number;
    y?: number;
    agentId?: EntityId;
    plantId?: EntityId;
    position?: { x: number; y: number };
  };
  'action:completed': {
    actionType: string;
    actionId?: string;
    agentId?: EntityId;
    actorId?: EntityId;
    position?: { x: number; y: number };
  };
  'action:failed': {
    actionType: string;
    actionId?: string;
    agentId?: EntityId;
    actorId?: EntityId;
    reason: string;
  };
  'action:gather_seeds': {
    actionId: string;
    actorId: EntityId;
    agentId?: EntityId;
    plantId: EntityId;
    speciesId: string;
    seedsGathered: number;
    position: { x: number; y: number };
  };
  'action:harvest': {
    actionId?: string;
    actorId?: EntityId;
    agentId?: EntityId;
    plantId?: EntityId;
    speciesId?: string;
    harvested?: Array<{ itemId: string; amount: number }>;
    position?: { x: number; y: number };
  };
  'action:fertilize': {
    x: number;
    y: number;
    fertilizerType?: string;
    agentId?: EntityId;
  };
  'action:walk': {
    agentId?: string;
    entityId?: string;
    position?: { x: number; y: number };
    destination?: { x: number; y: number };
  };
}
export type ActionEventType = keyof ActionEvents;
export type ActionEventData = ActionEvents[ActionEventType];
