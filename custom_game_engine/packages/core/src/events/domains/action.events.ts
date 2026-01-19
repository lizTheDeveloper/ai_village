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
  'action:move': {
    target: { x: number; y: number };
    entities: EntityId[];
  };
  'action:follow': {
    followerId: EntityId;
    targetId: EntityId | null;
  };
  'action:enter_building': {
    buildingId: EntityId | null;
    agentId?: EntityId;
    entities?: EntityId[];
  };
  'action:repair': {
    buildingId: EntityId | null;
  };
  'action:demolish': {
    buildingId: EntityId | null;
  };
  'action:assign_worker': {
    buildingId: EntityId | null;
    workerId: EntityId;
  };
  'action:set_priority': {
    buildingId?: EntityId | null;
    resourceId?: EntityId | null;
    priority: number | string;
  };
  'action:place_waypoint': {
    position: { x: number; y: number };
  };
  'action:create_group': {
    entities: EntityId[];
  };
  'action:set_formation': {
    groupId: EntityId;
    formation: string;
  };
}
export type ActionEventType = keyof ActionEvents;
export type ActionEventData = ActionEvents[ActionEventType];
