/**
 * Serializer for ExplorationStateComponent - properly reconstructs Map and class instance
 */

import { BaseComponentSerializer } from '../ComponentSerializerRegistry.js';
import { ExplorationStateComponent, type SectorInfo } from '@ai-village/core';

interface SerializedExplorationState {
  exploredSectors: Array<[string, SectorInfo]>;
  explorationRadius: number;
  mode?: 'frontier' | 'spiral' | 'none';
  currentTarget?: { x: number; y: number };
  homeBase?: { x: number; y: number };
  spiralState?: {
    homeBase: { x: number; y: number };
    step: number;
    direction: number;
    stepSize: number;
    stepsInDirection: number;
  };
}

export class ExplorationStateSerializer extends BaseComponentSerializer<ExplorationStateComponent> {
  constructor() {
    super('exploration_state', 1);
  }

  protected serializeData(component: ExplorationStateComponent): SerializedExplorationState {
    const componentAny = component as unknown as {
      _exploredSectors: Map<string, SectorInfo>;
      _explorationRadius: number;
      _spiralState?: {
        homeBase: { x: number; y: number };
        step: number;
        direction: number;
        stepSize: number;
        stepsInDirection: number;
      };
    };

    return {
      exploredSectors: Array.from(componentAny._exploredSectors.entries()),
      explorationRadius: componentAny._explorationRadius,
      mode: component.mode,
      currentTarget: component.currentTarget,
      homeBase: component.homeBase,
      spiralState: componentAny._spiralState,
    };
  }

  protected deserializeData(data: unknown): ExplorationStateComponent {
    const serialized = data as SerializedExplorationState;

    // Create new component
    const component = new ExplorationStateComponent();

    // Access private fields
    const componentAny = component as unknown as {
      _exploredSectors: Map<string, SectorInfo>;
      _explorationRadius: number;
      _spiralState?: {
        homeBase: { x: number; y: number };
        step: number;
        direction: number;
        stepSize: number;
        stepsInDirection: number;
      };
    };

    // Restore explored sectors from array back to Map
    if (serialized.exploredSectors && Array.isArray(serialized.exploredSectors)) {
      componentAny._exploredSectors = new Map(serialized.exploredSectors);
    }

    // Restore other fields
    if (serialized.explorationRadius !== undefined) {
      componentAny._explorationRadius = serialized.explorationRadius;
    }
    if (serialized.mode !== undefined) {
      component.mode = serialized.mode;
    }
    if (serialized.currentTarget !== undefined) {
      component.currentTarget = serialized.currentTarget;
    }
    if (serialized.homeBase !== undefined) {
      component.homeBase = serialized.homeBase;
    }
    if (serialized.spiralState !== undefined) {
      componentAny._spiralState = serialized.spiralState;
    }

    return component;
  }

  validate(data: unknown): data is ExplorationStateComponent {
    if (typeof data !== 'object' || data === null) {
      throw new Error('ExplorationStateComponent data must be object');
    }
    return true;
  }
}
