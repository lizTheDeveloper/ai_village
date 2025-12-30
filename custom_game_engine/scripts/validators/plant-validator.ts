#!/usr/bin/env tsx
/**
 * Plant Species Validator
 *
 * Validates all plant species definitions for:
 * - Required fields
 * - Valid enum values
 * - Consistent genetics
 * - Valid property ranges
 * - Cross-references (e.g., sprite mappings)
 */

import type { PlantSpecies } from '../../packages/core/src/types/PlantSpecies.js';

export interface ValidationError {
  file: string;
  plantId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class PlantValidator {
  private errors: ValidationError[] = [];

  validate(species: PlantSpecies, fileName: string): ValidationError[] {
    this.errors = [];

    // Basic required fields
    this.validateRequired(species, fileName, 'id');
    this.validateRequired(species, fileName, 'name');
    this.validateRequired(species, fileName, 'category');
    this.validateRequired(species, fileName, 'biomes');
    this.validateRequired(species, fileName, 'rarity');
    this.validateRequired(species, fileName, 'properties');

    // Category validation
    const validCategories = [
      'crop', 'herb', 'tree', 'flower', 'fungus', 'magical_herb',
      'grass', 'weed', 'vine', 'aquatic', 'succulent', 'cactus',
      'fern', 'moss', 'lichen', 'reed', 'carnivorous', 'shrub', 'grain'
    ];
    if (species.category && !validCategories.includes(species.category)) {
      this.addError(fileName, species.id, 'category',
        `Invalid category: ${species.category}`, 'error');
    }

    // Rarity validation
    const validRarities = ['common', 'uncommon', 'rare', 'legendary'];
    if (species.rarity && !validRarities.includes(species.rarity)) {
      this.addError(fileName, species.id, 'rarity',
        `Invalid rarity: ${species.rarity}`, 'error');
    }

    // Biomes validation
    if (species.biomes && species.biomes.length === 0) {
      this.addError(fileName, species.id, 'biomes',
        'Plant must specify at least one biome', 'error');
    }

    // Genetics validation
    if (species.baseGenetics) {
      this.validateGenetics(species.baseGenetics, fileName, species.id);
    } else if (species.genetics) {
      this.validateGenetics(species.genetics, fileName, species.id);
    } else {
      this.addError(fileName, species.id, 'baseGenetics',
        'Plant must specify genetics (baseGenetics or genetics)', 'warning');
    }

    // Lifecycle validation
    if (!species.stageTransitions && !species.lifecycle) {
      this.addError(fileName, species.id, 'lifecycle',
        'Plant must specify either stageTransitions or lifecycle', 'warning');
    }

    // Magical properties validation
    if (species.properties.magical) {
      this.validateMagicalProperties(species, fileName);
    }

    // Medicinal properties validation
    if (species.properties.medicinal) {
      this.validateMedicinalProperties(species, fileName);
    }

    // Sprites validation
    if (species.sprites) {
      this.validateSprites(species, fileName);
    }

    // Latitude/elevation range validation
    if (species.latitudeRange) {
      const [min, max] = species.latitudeRange;
      if (min < -90 || max > 90 || min > max) {
        this.addError(fileName, species.id, 'latitudeRange',
          `Invalid latitude range: [${min}, ${max}]`, 'error');
      }
    }

    return this.errors;
  }

  private validateRequired(species: any, fileName: string, field: string) {
    if (!species[field]) {
      this.addError(fileName, species.id || 'unknown', field,
        `Missing required field: ${field}`, 'error');
    }
  }

  private validateGenetics(genetics: any, fileName: string, plantId: string) {
    const requiredFields = [
      'growthRate', 'yieldAmount', 'diseaseResistance',
      'droughtTolerance', 'coldTolerance', 'flavorProfile'
    ];

    for (const field of requiredFields) {
      if (genetics[field] === undefined) {
        this.addError(fileName, plantId, `genetics.${field}`,
          `Missing required genetic field: ${field}`, 'warning');
      } else if (typeof genetics[field] !== 'number') {
        this.addError(fileName, plantId, `genetics.${field}`,
          `Genetic field must be a number: ${field}`, 'error');
      }
    }

    // Range validation
    if (genetics.growthRate !== undefined) {
      if (genetics.growthRate < 0.3 || genetics.growthRate > 3.0) {
        this.addError(fileName, plantId, 'genetics.growthRate',
          `Growth rate out of range (0.3-3.0): ${genetics.growthRate}`, 'warning');
      }
    }

    // Resistance values should be 0-100
    const resistanceFields = ['diseaseResistance', 'droughtTolerance', 'coldTolerance', 'flavorProfile'];
    for (const field of resistanceFields) {
      if (genetics[field] !== undefined) {
        if (genetics[field] < 0 || genetics[field] > 100) {
          this.addError(fileName, plantId, `genetics.${field}`,
            `${field} out of range (0-100): ${genetics[field]}`, 'warning');
        }
      }
    }
  }

  private validateMagicalProperties(species: PlantSpecies, fileName: string) {
    const magical = species.properties.magical!;

    if (!magical.universeTypes || magical.universeTypes.length === 0) {
      this.addError(fileName, species.id, 'magical.universeTypes',
        'Magical plants must specify universeTypes', 'error');
    }

    if (!magical.magicType) {
      this.addError(fileName, species.id, 'magical.magicType',
        'Magical plants must specify magicType', 'error');
    }

    if (magical.potency !== undefined && (magical.potency < 0 || magical.potency > 1)) {
      this.addError(fileName, species.id, 'magical.potency',
        `Potency out of range (0-1): ${magical.potency}`, 'warning');
    }

    if (magical.stability !== undefined && (magical.stability < 0 || magical.stability > 1)) {
      this.addError(fileName, species.id, 'magical.stability',
        `Stability out of range (0-1): ${magical.stability}`, 'warning');
    }

    if (!magical.effects || magical.effects.length === 0) {
      this.addError(fileName, species.id, 'magical.effects',
        'Magical plants should specify at least one effect', 'warning');
    }
  }

  private validateMedicinalProperties(species: PlantSpecies, fileName: string) {
    const medicinal = species.properties.medicinal!;

    // Check that either old structure or new structure is used
    const hasOldStructure = medicinal.treats || medicinal.effectiveness !== undefined;
    const hasNewStructure = medicinal.activeCompounds || medicinal.effects;

    if (!hasOldStructure && !hasNewStructure) {
      this.addError(fileName, species.id, 'medicinal',
        'Medicinal properties must specify either treats/effectiveness or activeCompounds/effects', 'warning');
    }

    if (medicinal.effectiveness !== undefined &&
        (medicinal.effectiveness < 0 || medicinal.effectiveness > 1)) {
      this.addError(fileName, species.id, 'medicinal.effectiveness',
        `Effectiveness out of range (0-1): ${medicinal.effectiveness}`, 'warning');
    }
  }

  private validateSprites(species: PlantSpecies, fileName: string) {
    const requiredStages = ['seed', 'sprout', 'vegetative', 'flowering', 'fruiting', 'mature', 'seeding', 'withered'];

    for (const stage of requiredStages) {
      if (!(species.sprites as any)[stage]) {
        this.addError(fileName, species.id, `sprites.${stage}`,
          `Missing sprite for stage: ${stage}`, 'warning');
      }
    }
  }

  private addError(file: string, plantId: string, field: string, message: string, severity: 'error' | 'warning') {
    this.errors.push({ file, plantId, field, message, severity });
  }
}

export function validatePlantSpecies(species: PlantSpecies, fileName: string): ValidationError[] {
  const validator = new PlantValidator();
  return validator.validate(species, fileName);
}
