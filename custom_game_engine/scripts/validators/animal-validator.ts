#!/usr/bin/env tsx
/**
 * Animal Species Validator
 *
 * Validates animal species definitions for:
 * - Required fields
 * - Valid enum values (category, temperament, diet, etc.)
 * - Consistent lifecycle properties
 * - Valid property ranges
 * - Biome and temperature ranges
 */

export interface ValidationError {
  file: string;
  animalId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class AnimalValidator {
  private errors: ValidationError[] = [];

  validate(animal: any, fileName: string): ValidationError[] {
    this.errors = [];

    // Basic required fields
    this.validateRequired(animal, fileName, 'id');
    this.validateRequired(animal, fileName, 'name');
    this.validateRequired(animal, fileName, 'category');
    this.validateRequired(animal, fileName, 'temperament');
    this.validateRequired(animal, fileName, 'diet');
    this.validateRequired(animal, fileName, 'socialStructure');
    this.validateRequired(animal, fileName, 'activityPattern');

    // Category validation
    const validCategories = [
      'livestock', 'wild', 'pet', 'working', 'predator', 'prey'
    ];
    if (animal.category && !validCategories.includes(animal.category)) {
      this.addError(fileName, animal.id, 'category',
        `Invalid category: ${animal.category}`, 'error');
    }

    // Temperament validation
    const validTemperaments = [
      'docile', 'neutral', 'aggressive', 'skittish', 'curious', 'territorial'
    ];
    if (animal.temperament && !validTemperaments.includes(animal.temperament)) {
      this.addError(fileName, animal.id, 'temperament',
        `Invalid temperament: ${animal.temperament}`, 'error');
    }

    // Diet validation
    const validDiets = [
      'herbivore', 'carnivore', 'omnivore', 'insectivore', 'scavenger'
    ];
    if (animal.diet && !validDiets.includes(animal.diet)) {
      this.addError(fileName, animal.id, 'diet',
        `Invalid diet: ${animal.diet}`, 'error');
    }

    // Social structure validation
    const validSocialStructures = [
      'solitary', 'pair', 'pack', 'herd', 'flock', 'colony'
    ];
    if (animal.socialStructure && !validSocialStructures.includes(animal.socialStructure)) {
      this.addError(fileName, animal.id, 'socialStructure',
        `Invalid socialStructure: ${animal.socialStructure}`, 'error');
    }

    // Activity pattern validation
    const validActivityPatterns = [
      'diurnal', 'nocturnal', 'crepuscular', 'cathemeral'
    ];
    if (animal.activityPattern && !validActivityPatterns.includes(animal.activityPattern)) {
      this.addError(fileName, animal.id, 'activityPattern',
        `Invalid activityPattern: ${animal.activityPattern}`, 'error');
    }

    // Lifecycle validation
    this.validateLifecycle(animal, fileName);

    // Physical attributes validation
    this.validatePhysicalAttributes(animal, fileName);

    // Needs decay rates validation
    this.validateNeedsRates(animal, fileName);

    // Taming validation
    if (animal.canBeTamed) {
      this.validateTaming(animal, fileName);
    }

    // Temperature range validation
    this.validateTemperatureRange(animal, fileName);

    // Spawning validation
    this.validateSpawning(animal, fileName);

    return this.errors;
  }

  private validateLifecycle(animal: any, fileName: string) {
    if (animal.infantDuration !== undefined && (typeof animal.infantDuration !== 'number' || animal.infantDuration < 0)) {
      this.addError(fileName, animal.id, 'infantDuration',
        `Invalid infantDuration: ${animal.infantDuration}`, 'error');
    }

    if (animal.juvenileDuration !== undefined && (typeof animal.juvenileDuration !== 'number' || animal.juvenileDuration < 0)) {
      this.addError(fileName, animal.id, 'juvenileDuration',
        `Invalid juvenileDuration: ${animal.juvenileDuration}`, 'error');
    }

    if (animal.adultDuration !== undefined && (typeof animal.adultDuration !== 'number' || animal.adultDuration < 0)) {
      this.addError(fileName, animal.id, 'adultDuration',
        `Invalid adultDuration: ${animal.adultDuration}`, 'error');
    }

    if (animal.maxAge !== undefined && (typeof animal.maxAge !== 'number' || animal.maxAge < 0)) {
      this.addError(fileName, animal.id, 'maxAge',
        `Invalid maxAge: ${animal.maxAge}`, 'error');
    }

    // Logical lifecycle validation
    if (animal.infantDuration && animal.juvenileDuration && animal.adultDuration && animal.maxAge) {
      const totalDuration = animal.infantDuration + animal.juvenileDuration + animal.adultDuration;
      if (totalDuration > animal.maxAge) {
        this.addError(fileName, animal.id, 'lifecycle',
          `Sum of lifecycle stages (${totalDuration}) exceeds maxAge (${animal.maxAge})`, 'warning');
      }
    }
  }

  private validatePhysicalAttributes(animal: any, fileName: string) {
    if (animal.baseSize !== undefined && (typeof animal.baseSize !== 'number' || animal.baseSize <= 0)) {
      this.addError(fileName, animal.id, 'baseSize',
        `Invalid baseSize: ${animal.baseSize} (must be positive)`, 'error');
    }

    if (animal.baseSpeed !== undefined && (typeof animal.baseSpeed !== 'number' || animal.baseSpeed <= 0)) {
      this.addError(fileName, animal.id, 'baseSpeed',
        `Invalid baseSpeed: ${animal.baseSpeed} (must be positive)`, 'error');
    }
  }

  private validateNeedsRates(animal: any, fileName: string) {
    if (animal.hungerRate !== undefined && (typeof animal.hungerRate !== 'number' || animal.hungerRate < 0)) {
      this.addError(fileName, animal.id, 'hungerRate',
        `Invalid hungerRate: ${animal.hungerRate}`, 'error');
    }

    if (animal.thirstRate !== undefined && (typeof animal.thirstRate !== 'number' || animal.thirstRate < 0)) {
      this.addError(fileName, animal.id, 'thirstRate',
        `Invalid thirstRate: ${animal.thirstRate}`, 'error');
    }

    if (animal.energyRate !== undefined && (typeof animal.energyRate !== 'number' || animal.energyRate < 0)) {
      this.addError(fileName, animal.id, 'energyRate',
        `Invalid energyRate: ${animal.energyRate}`, 'error');
    }
  }

  private validateTaming(animal: any, fileName: string) {
    if (animal.tameDifficulty === undefined) {
      this.addError(fileName, animal.id, 'tameDifficulty',
        'Tameable animals must specify tameDifficulty', 'warning');
    } else if (typeof animal.tameDifficulty !== 'number' || animal.tameDifficulty < 0 || animal.tameDifficulty > 100) {
      this.addError(fileName, animal.id, 'tameDifficulty',
        `Invalid tameDifficulty: ${animal.tameDifficulty} (must be 0-100)`, 'error');
    }

    if (!animal.preferredFood || animal.preferredFood.length === 0) {
      this.addError(fileName, animal.id, 'preferredFood',
        'Tameable animals should specify preferredFood', 'warning');
    }
  }

  private validateTemperatureRange(animal: any, fileName: string) {
    if (animal.minComfortTemp !== undefined && animal.maxComfortTemp !== undefined) {
      if (animal.minComfortTemp > animal.maxComfortTemp) {
        this.addError(fileName, animal.id, 'temperatureRange',
          `Invalid temperature range: min (${animal.minComfortTemp}) > max (${animal.maxComfortTemp})`, 'error');
      }

      if (animal.minComfortTemp < -100 || animal.maxComfortTemp > 100) {
        this.addError(fileName, animal.id, 'temperatureRange',
          `Temperature range out of realistic bounds (-100 to 100 Celsius)`, 'warning');
      }
    }
  }

  private validateSpawning(animal: any, fileName: string) {
    if (!animal.spawnBiomes || animal.spawnBiomes.length === 0) {
      this.addError(fileName, animal.id, 'spawnBiomes',
        'Animal must specify at least one spawn biome', 'error');
    }

    if (animal.spawnDensity !== undefined) {
      if (typeof animal.spawnDensity !== 'number' || animal.spawnDensity < 0 || animal.spawnDensity > 1) {
        this.addError(fileName, animal.id, 'spawnDensity',
          `Invalid spawnDensity: ${animal.spawnDensity} (must be 0-1)`, 'error');
      }
    }
  }

  private validateRequired(animal: any, fileName: string, field: string) {
    if (!animal[field] && animal[field] !== false && animal[field] !== 0) {
      this.addError(fileName, animal.id || 'unknown', field,
        `Missing required field: ${field}`, 'error');
    }
  }

  private addError(file: string, animalId: string, field: string, message: string, severity: 'error' | 'warning') {
    this.errors.push({ file, animalId, field, message, severity });
  }
}

export function validateAnimal(animal: any, fileName: string): ValidationError[] {
  const validator = new AnimalValidator();
  return validator.validate(animal, fileName);
}
