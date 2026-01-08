import type { Component } from '../ecs/Component.js';

/**
 * Identity component for agent names and basic info.
 */
export interface IdentityComponent extends Component {
  type: 'identity';
  name: string;
  age: number;
  species: 'human' | 'elf' | 'dwarf' | 'animal';
}

/**
 * Create an identity component with a given name, species, and age.
 */
export function createIdentityComponent(
  name: string,
  species?: 'human' | 'elf' | 'dwarf' | 'animal',
  age?: number
): IdentityComponent {
  // Validate and default species to 'human'
  const validSpecies: Array<'human' | 'elf' | 'dwarf' | 'animal'> = ['human', 'elf', 'dwarf', 'animal'];
  const finalSpecies = species && validSpecies.includes(species) ? species : 'human';

  // Random age between 20-35 if not specified
  const finalAge = age !== undefined ? age : Math.floor(Math.random() * 16) + 20;

  return {
    type: 'identity',
    version: 1,
    name,
    species: finalSpecies,
    age: finalAge,
  };
}

/**
 * Pool of available villager names - shared across all name generation.
 */
const allNames = [
  'Ada', 'Finn', 'Sage', 'River', 'Ash', 'Rowan', 'Luna', 'Oak',
  'Wren', 'Briar', 'Fern', 'Maple', 'Reed', 'Ivy', 'Hazel', 'Cedar',
  'Willow', 'Birch', 'Juniper', 'Pine', 'Lark', 'Dove', 'Sparrow', 'Robin',
  'Autumn', 'Brook', 'Clay', 'Dawn', 'Echo', 'Flint', 'Glen', 'Haven',
  'Indigo', 'Jasper', 'Kestrel', 'Linden', 'Meadow', 'North', 'Orion', 'Pebble',
];

/**
 * Set of names that have already been used in this session.
 */
const usedNames = new Set<string>();

/**
 * Generate a unique random villager name.
 * Returns a unique name from the pool if available, or adds a numeric suffix if all are used.
 */
export function generateRandomName(): string {
  // Find names that haven't been used yet
  const availableNames = allNames.filter(n => !usedNames.has(n));

  if (availableNames.length > 0) {
    // Pick a random unused name
    const name = availableNames[Math.floor(Math.random() * availableNames.length)] || 'Villager';
    usedNames.add(name);
    return name;
  }

  // All names used - add numeric suffix
  const baseName = allNames[Math.floor(Math.random() * allNames.length)] || 'Villager';
  let suffix = 2;
  while (usedNames.has(`${baseName} ${suffix}`)) {
    suffix++;
  }
  const uniqueName = `${baseName} ${suffix}`;
  usedNames.add(uniqueName);
  return uniqueName;
}

/**
 * Reset the used names (call when starting a new game session).
 */
export function resetUsedNames(): void {
  usedNames.clear();
}
