import type { Component } from '../ecs/Component.js';

export interface VisionComponent extends Component {
  type: 'vision';
  range: number;          // How far the agent can see (in tiles)
  fieldOfView: number;    // Degrees (360 = full circle)
  canSeeAgents: boolean;  // Can detect other agents
  canSeeResources: boolean; // Can detect resources
}

export function createVisionComponent(
  range: number = 10.0,
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
  };
}
