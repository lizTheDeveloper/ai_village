/**
 * CivilizationComponent - stub component for civilization tracking
 */

export type CivilizationEra = number; // 1-10

export interface CivilizationTechnology {
  id: string;
  name: string;
  unlocked: boolean;
  researchProgress: number;
}

export interface CivilizationComponent {
  type: 'civilization';
  version: 1;
  name: string;
  era: CivilizationEra;
  population: number;
  technologies: CivilizationTechnology[];
  resources: Record<string, number>;
  discoveredPhenomena: string[];
  explorationRange: number;
}

export function createCivilizationComponent(
  name: string,
  era: CivilizationEra
): CivilizationComponent {
  return {
    type: 'civilization',
    version: 1,
    name,
    era,
    population: 100,
    technologies: [],
    resources: {},
    discoveredPhenomena: [],
    explorationRange: era * 10,
  };
}
