import { PlantComponent, type PlantGenetics } from '../components/PlantComponent.js';
import { SeedComponent } from '../components/SeedComponent.js';

/**
 * Create a seed from a parent plant with inherited genetics
 */
export function createSeedFromPlant(parent: PlantComponent, speciesId: string): SeedComponent {
  // REQUIRED: parent must have genetics
  if (!parent.genetics) {
    throw new Error('Cannot create seed from plant - parent missing genetics');
  }

  // Get parent entity ID if available
  const parentEntityId = (parent as any).entityId;

  // Calculate seed quality based on parent health and care
  const quality = calculateSeedQuality(parent);
  const viability = calculateViability(parent);
  const vigor = calculateVigor(parent);

  // Apply mutations to genetics
  const inheritedGenetics = applyMutations(
    parent.genetics,
    parent.generation + 1
  );

  return new SeedComponent({
    speciesId,
    genetics: inheritedGenetics,
    generation: parent.generation + 1,
    viability,
    vigor,
    quality,
    source: 'cultivated',
    harvestedFrom: parentEntityId
  });
}

/**
 * Apply random mutations to genetics
 */
export function applyMutations(
  parentGenetics: PlantGenetics,
  generation: number
): PlantGenetics {
  const result: PlantGenetics = {
    growthRate: parentGenetics.growthRate,
    yieldAmount: parentGenetics.yieldAmount,
    diseaseResistance: parentGenetics.diseaseResistance,
    droughtTolerance: parentGenetics.droughtTolerance,
    coldTolerance: parentGenetics.coldTolerance,
    flavorProfile: parentGenetics.flavorProfile,
    mutations: [...parentGenetics.mutations]
  };

  // Mutation chance: 20% per trait
  const MUTATION_CHANCE = 0.2;
  const MUTATION_MAGNITUDE = 0.05; // ±5%

  const traits: Array<keyof PlantGenetics> = [
    'growthRate',
    'yieldAmount',
    'diseaseResistance',
    'droughtTolerance',
    'coldTolerance',
    'flavorProfile'
  ];

  for (const trait of traits) {
    if (Math.random() < MUTATION_CHANCE) {
      const currentValue = result[trait] as number;
      const delta = (Math.random() * 2 - 1) * MUTATION_MAGNITUDE * currentValue;

      let newValue = currentValue + delta;

      // Clamp values to reasonable ranges
      if (trait === 'growthRate' || trait === 'yieldAmount') {
        newValue = Math.max(0.3, Math.min(3.0, newValue));
      } else {
        // Resistance values (0-100)
        newValue = Math.max(0, Math.min(100, newValue));
      }

      (result[trait] as number) = newValue;

      // Record mutation
      result.mutations.push({
        trait,
        delta,
        generation
      });
    }
  }

  return result;
}

/**
 * Apply genetic traits to a calculation
 * @param plant The plant with genetics
 * @param type The type of calculation ('growth', 'yield', 'hydrationDecay', 'frostDamage')
 * @param baseValue Optional base value to modify
 */
export function applyGenetics(
  plant: PlantComponent,
  type: 'growth' | 'yield' | 'hydrationDecay' | 'frostDamage',
  baseValue?: number
): number {
  // REQUIRED: plant must have genetics
  if (!plant.genetics) {
    throw new Error('Cannot apply genetics - plant missing genetics');
  }

  switch (type) {
    case 'growth':
      return plant.genetics.growthRate;

    case 'yield':
      return plant.genetics.yieldAmount;

    case 'hydrationDecay': {
      const baseDecay = baseValue ?? 5; // Default 5% per day
      const tolerance = plant.genetics.droughtTolerance / 100;
      return baseDecay * (1 - tolerance * 0.5); // Drought tolerance reduces decay
    }

    case 'frostDamage': {
      const temperature = baseValue ?? 0;
      const tolerance = plant.genetics.coldTolerance / 100;

      // If cold tolerant enough, no damage
      if (tolerance >= 0.9) {
        return 0;
      }

      // Otherwise, damage based on temperature and tolerance
      const baseDamage = Math.abs(temperature) * 5;
      return baseDamage * (1 - tolerance);
    }

    default:
      return 1.0;
  }
}

/**
 * Check if a seed can germinate based on viability
 */
export function canGerminate(seed: SeedComponent): boolean {
  return Math.random() < seed.viability;
}

/**
 * Update seed viability based on age
 */
export function updateSeedViability(seed: SeedComponent): void {
  // Viability decreases with age
  const ageFactor = Math.max(0, 1 - seed.age / 365); // Loses viability over a year
  seed.viability = Math.max(0, seed.viability * ageFactor);
}

/**
 * Calculate seed quality based on parent plant health
 */
function calculateSeedQuality(parent: PlantComponent): number {
  const healthFactor = parent.health / 100;
  const careFactor = parent.careQuality / 100;
  const geneticFactor = parent.geneticQuality / 100;

  return (healthFactor + careFactor + geneticFactor) / 3 * 100;
}

/**
 * Calculate seed viability based on parent health
 */
function calculateViability(parent: PlantComponent): number {
  const healthFactor = parent.health / 100;
  const nutritionFactor = parent.nutrition / 100;

  // Base viability is 0.8, modified by parent condition
  return Math.max(0.1, Math.min(1.0, 0.8 * (healthFactor + nutritionFactor) / 2));
}

/**
 * Calculate seed vigor based on parent quality
 */
function calculateVigor(parent: PlantComponent): number {
  const geneticFactor = parent.geneticQuality / 100;
  const environmentFactor = parent.environmentMatch / 100;

  return Math.max(10, Math.min(100, 75 * (geneticFactor + environmentFactor) / 2));
}
