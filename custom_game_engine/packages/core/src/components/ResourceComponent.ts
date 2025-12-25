import type { Component } from '../ecs/Component.js';

export type ResourceType = 'food' | 'wood' | 'stone' | 'water' | 'fiber' | 'leaves';

export interface ResourceComponent extends Component {
  type: 'resource';
  resourceType: ResourceType;
  amount: number; // How much resource is available
  maxAmount: number;
  regenerationRate: number; // Amount per second (0 = doesn't regenerate)
  harvestable: boolean; // Can be harvested by agents
}

export function createResourceComponent(
  resourceType: ResourceType,
  amount: number,
  regenerationRate: number = 0
): ResourceComponent {
  return {
    type: 'resource',
    version: 1,
    resourceType,
    amount,
    maxAmount: amount,
    regenerationRate,
    harvestable: true,
  };
}
