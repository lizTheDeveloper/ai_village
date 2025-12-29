import type { Component } from '../ecs/Component.js';

export type ResourceType = 'food' | 'wood' | 'stone' | 'water' | 'fiber' | 'leaves' | 'iron_ore' | 'coal' | 'copper_ore' | 'gold_ore';

export interface ResourceComponent extends Component {
  type: 'resource';
  resourceType: ResourceType;
  amount: number; // How much resource is available
  maxAmount: number;
  regenerationRate: number; // Amount per second (0 = doesn't regenerate)
  harvestable: boolean; // Can be harvested by agents

  // Gathering difficulty - multiplier on base gather time
  // 1.0 = normal (1 second base), 10.0 = rare/difficult (10 seconds)
  // Higher values mean longer gather times
  gatherDifficulty: number;
}

export function createResourceComponent(
  resourceType: ResourceType,
  amount: number,
  regenerationRate: number = 0,
  gatherDifficulty: number = 1.0
): ResourceComponent {
  return {
    type: 'resource',
    version: 1,
    resourceType,
    amount,
    maxAmount: amount,
    regenerationRate,
    harvestable: true,
    gatherDifficulty,
  };
}
