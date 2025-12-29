import type { Component } from '../ecs/Component.js';

/**
 * HealthClinicComponent tracks population health and provides treatment.
 * Per work order: Requires staffing by healers (1 per 20 agents),
 * tracks health statistics, disease outbreaks, malnutrition, trauma,
 * leading causes of death.
 *
 * Staffing affects treatment effectiveness and data quality.
 */

export interface PopulationHealth {
  healthy: number; // health > 70
  sick: number; // health 30-70
  critical: number; // health < 30
}

export interface DiseaseOutbreak {
  name: string;
  infected: number;
  spreading: boolean;
}

export interface MalnutritionMetrics {
  affected: number;
  trend: 'improving' | 'stable' | 'worsening';
}

export interface TraumaMetrics {
  traumatized: number;
  severe: number;
  healing: number;
}

export interface MortalityCause {
  cause: string;
  count: number;
  percentage: number;
}

export type ClinicDataQuality = 'full' | 'basic';

export interface HealthClinicComponent extends Component {
  type: 'health_clinic';
  populationHealth: PopulationHealth;
  diseases: DiseaseOutbreak[];
  malnutrition: MalnutritionMetrics;
  trauma: TraumaMetrics;
  mortality: MortalityCause[];
  dataQuality: ClinicDataQuality;
  treatments: number; // Count of treatments performed
  recommendedStaff: number; // Based on population (1 per 20 agents)
}

export function createHealthClinicComponent(): HealthClinicComponent {
  return {
    type: 'health_clinic',
    version: 1,
    populationHealth: {
      healthy: 0,
      sick: 0,
      critical: 0,
    },
    diseases: [],
    malnutrition: {
      affected: 0,
      trend: 'stable',
    },
    trauma: {
      traumatized: 0,
      severe: 0,
      healing: 0,
    },
    mortality: [],
    dataQuality: 'basic',
    treatments: 0,
    recommendedStaff: 1,
  };
}
