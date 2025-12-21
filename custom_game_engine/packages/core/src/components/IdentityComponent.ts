import type { Component } from '../ecs/Component.js';

/**
 * Identity component for agent names and basic info.
 */
export interface IdentityComponent extends Component {
  type: 'identity';
  name: string;
}

/**
 * Create an identity component with a given name.
 */
export function createIdentityComponent(name: string): IdentityComponent {
  return {
    type: 'identity',
    version: 1,
    name,
  };
}

/**
 * Generate a random villager name.
 */
export function generateRandomName(): string {
  const names = [
    'Ada', 'Finn', 'Sage', 'River', 'Ash', 'Rowan', 'Luna', 'Oak',
    'Wren', 'Briar', 'Fern', 'Maple', 'Reed', 'Ivy', 'Hazel', 'Cedar',
    'Willow', 'Birch', 'Juniper', 'Pine', 'Lark', 'Dove', 'Sparrow', 'Robin',
  ];
  return names[Math.floor(Math.random() * names.length)] || 'Villager';
}
