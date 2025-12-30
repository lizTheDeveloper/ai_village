import type { Component } from '../ecs/Component.js';

export interface VisionComponent extends Component {
  type: 'vision';
  range: number;          // How far the agent can see (in tiles)
  fieldOfView: number;    // Degrees (360 = full circle)
  canSeeAgents: boolean;  // Can detect other agents
  canSeeResources: boolean; // Can detect resources
  seenAgents: string[];   // Entity IDs of agents currently in vision range
  seenResources: string[]; // Entity IDs of resources currently in vision range
  seenPlants?: string[];  // Entity IDs of plants currently in vision range
  seenBuildings?: string[]; // Entity IDs of visible buildings
  heardSpeech: Array<{ speaker: string, text: string }>; // Speech heard from nearby agents
  terrainDescription?: string; // Natural language description of nearby terrain features (peaks, cliffs, etc.)
}

export function createVisionComponent(
  range: number = 25.0, // Increased from 10 to enable social interactions
  fieldOfView: number = 360,
  canSeeAgents: boolean = true,
  canSeeResources: boolean = true
): VisionComponent {
  return {
    type: 'vision',
    version: 1,
    range,
    fieldOfView,
    canSeeAgents,
    canSeeResources,
    seenAgents: [],
    seenResources: [],
    seenPlants: [],
    heardSpeech: [],
  };
}
