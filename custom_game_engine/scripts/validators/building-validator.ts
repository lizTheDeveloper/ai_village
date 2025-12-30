#!/usr/bin/env tsx
/**
 * Building Blueprint Validator
 *
 * Validates building blueprint definitions for:
 * - Required fields
 * - Valid categories and functions
 * - Dimension validation
 * - Resource costs
 * - Placement requirements
 */

export interface ValidationError {
  file: string;
  buildingId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class BuildingValidator {
  private errors: ValidationError[] = [];

  validate(building: any, fileName: string): ValidationError[] {
    this.errors = [];

    // Basic required fields
    this.validateRequired(building, fileName, 'id');
    this.validateRequired(building, fileName, 'name');
    this.validateRequired(building, fileName, 'description');
    this.validateRequired(building, fileName, 'category');
    this.validateRequired(building, fileName, 'width');
    this.validateRequired(building, fileName, 'height');

    // Category validation
    const validCategories = [
      'production', 'storage', 'residential', 'commercial', 'community',
      'farming', 'research', 'decoration', 'governance', 'religious'
    ];
    if (building.category && !validCategories.includes(building.category)) {
      this.addError(fileName, building.id, 'category',
        `Invalid category: ${building.category}`, 'error');
    }

    // Dimensions validation
    this.validateDimensions(building, fileName);

    // Resource costs validation
    if (building.resourceCost) {
      this.validateResourceCosts(building, fileName);
    } else {
      this.addError(fileName, building.id, 'resourceCost',
        'Building should specify resource costs', 'warning');
    }

    // Tech requirements validation
    if (building.techRequired && !Array.isArray(building.techRequired)) {
      this.addError(fileName, building.id, 'techRequired',
        'techRequired must be an array', 'error');
    }

    // Terrain validation
    if (building.terrainRequired && !Array.isArray(building.terrainRequired)) {
      this.addError(fileName, building.id, 'terrainRequired',
        'terrainRequired must be an array', 'error');
    }

    if (building.terrainForbidden && !Array.isArray(building.terrainForbidden)) {
      this.addError(fileName, building.id, 'terrainForbidden',
        'terrainForbidden must be an array', 'error');
    }

    // Skill requirement validation
    if (building.skillRequired) {
      this.validateSkillRequirement(building, fileName);
    }

    // Build time validation
    if (building.buildTime !== undefined) {
      if (typeof building.buildTime !== 'number' || building.buildTime < 0) {
        this.addError(fileName, building.id, 'buildTime',
          `Invalid buildTime: ${building.buildTime}`, 'error');
      }
    }

    // Tier validation
    if (building.tier !== undefined) {
      if (typeof building.tier !== 'number' || building.tier < 1 || building.tier > 5) {
        this.addError(fileName, building.id, 'tier',
          `Invalid tier: ${building.tier} (must be 1-5)`, 'error');
      }
    }

    // Functionality validation
    if (building.functionality) {
      this.validateFunctionality(building, fileName);
    }

    // Placement rules validation
    this.validatePlacementRules(building, fileName);

    return this.errors;
  }

  private validateDimensions(building: any, fileName: string) {
    if (building.width !== undefined) {
      if (typeof building.width !== 'number' || building.width <= 0) {
        this.addError(fileName, building.id, 'width',
          `Invalid width: ${building.width} (must be positive)`, 'error');
      }
    }

    if (building.height !== undefined) {
      if (typeof building.height !== 'number' || building.height <= 0) {
        this.addError(fileName, building.id, 'height',
          `Invalid height: ${building.height} (must be positive)`, 'error');
      }
    }
  }

  private validateResourceCosts(building: any, fileName: string) {
    if (!Array.isArray(building.resourceCost)) {
      this.addError(fileName, building.id, 'resourceCost',
        'resourceCost must be an array', 'error');
      return;
    }

    for (const cost of building.resourceCost) {
      if (!cost.resourceId) {
        this.addError(fileName, building.id, 'resourceCost',
          'Resource cost must specify resourceId', 'error');
      }
      if (cost.amountRequired === undefined) {
        this.addError(fileName, building.id, 'resourceCost',
          `Resource ${cost.resourceId} must specify amountRequired`, 'error');
      } else if (typeof cost.amountRequired !== 'number' || cost.amountRequired <= 0) {
        this.addError(fileName, building.id, 'resourceCost',
          `Invalid amountRequired for ${cost.resourceId}: ${cost.amountRequired}`, 'error');
      }
    }
  }

  private validateSkillRequirement(building: any, fileName: string) {
    const validSkills = [
      'building', 'farming', 'gathering', 'cooking', 'crafting',
      'social', 'exploration', 'combat', 'animal_handling', 'medicine'
    ];

    if (!building.skillRequired.skill) {
      this.addError(fileName, building.id, 'skillRequired',
        'Skill requirement must specify skill', 'error');
    } else if (!validSkills.includes(building.skillRequired.skill)) {
      this.addError(fileName, building.id, 'skillRequired',
        `Invalid skill: ${building.skillRequired.skill}`, 'error');
    }

    if (building.skillRequired.level === undefined) {
      this.addError(fileName, building.id, 'skillRequired',
        'Skill requirement must specify level', 'error');
    } else if (typeof building.skillRequired.level !== 'number' ||
               building.skillRequired.level < 0 || building.skillRequired.level > 5) {
      this.addError(fileName, building.id, 'skillRequired',
        `Invalid skill level: ${building.skillRequired.level} (must be 0-5)`, 'error');
    }
  }

  private validateFunctionality(building: any, fileName: string) {
    if (!Array.isArray(building.functionality)) {
      this.addError(fileName, building.id, 'functionality',
        'functionality must be an array', 'error');
      return;
    }

    const validFunctionTypes = [
      'crafting', 'storage', 'sleeping', 'shop', 'research', 'gathering_boost',
      'mood_aura', 'automation', 'governance', 'healing', 'social_hub',
      'vision_extension', 'job_board', 'knowledge_repository', 'prayer_site',
      'ritual_site', 'priest_quarters', 'pilgrimage_site', 'meditation_site',
      'pest_deterrent', 'irrigation', 'fertilizer_production', 'pollination',
      'climate_control', 'disease_prevention'
    ];

    for (const func of building.functionality) {
      if (!func.type) {
        this.addError(fileName, building.id, 'functionality',
          'Function must specify type', 'error');
      } else if (!validFunctionTypes.includes(func.type)) {
        this.addError(fileName, building.id, 'functionality',
          `Unknown function type: ${func.type}`, 'warning');
      }

      // Type-specific validation
      this.validateFunctionType(building, fileName, func);
    }
  }

  private validateFunctionType(building: any, fileName: string, func: any) {
    switch (func.type) {
      case 'crafting':
        if (!func.recipes || func.recipes.length === 0) {
          this.addError(fileName, building.id, 'functionality',
            'Crafting function must specify recipes', 'error');
        }
        if (func.speed !== undefined && (typeof func.speed !== 'number' || func.speed <= 0)) {
          this.addError(fileName, building.id, 'functionality',
            'Crafting speed must be positive number', 'error');
        }
        break;

      case 'storage':
        if (func.capacity === undefined) {
          this.addError(fileName, building.id, 'functionality',
            'Storage function must specify capacity', 'error');
        } else if (typeof func.capacity !== 'number' || func.capacity <= 0) {
          this.addError(fileName, building.id, 'functionality',
            'Storage capacity must be positive number', 'error');
        }
        break;

      case 'mood_aura':
      case 'gathering_boost':
        if (func.radius === undefined) {
          this.addError(fileName, building.id, 'functionality',
            `${func.type} function must specify radius`, 'error');
        } else if (typeof func.radius !== 'number' || func.radius <= 0) {
          this.addError(fileName, building.id, 'functionality',
            'Radius must be positive number', 'error');
        }
        break;
    }
  }

  private validatePlacementRules(building: any, fileName: string) {
    if (building.canRotate !== undefined && typeof building.canRotate !== 'boolean') {
      this.addError(fileName, building.id, 'canRotate',
        'canRotate must be boolean', 'error');
    }

    if (building.rotationAngles && !Array.isArray(building.rotationAngles)) {
      this.addError(fileName, building.id, 'rotationAngles',
        'rotationAngles must be an array', 'error');
    }

    if (building.snapToGrid !== undefined && typeof building.snapToGrid !== 'boolean') {
      this.addError(fileName, building.id, 'snapToGrid',
        'snapToGrid must be boolean', 'error');
    }

    if (building.requiresFoundation !== undefined && typeof building.requiresFoundation !== 'boolean') {
      this.addError(fileName, building.id, 'requiresFoundation',
        'requiresFoundation must be boolean', 'error');
    }
  }

  private validateRequired(building: any, fileName: string, field: string) {
    if (!building[field] && building[field] !== false && building[field] !== 0) {
      this.addError(fileName, building.id || 'unknown', field,
        `Missing required field: ${field}`, 'error');
    }
  }

  private addError(file: string, buildingId: string, field: string, message: string, severity: 'error' | 'warning') {
    this.errors.push({ file, buildingId, field, message, severity });
  }
}

export function validateBuilding(building: any, fileName: string): ValidationError[] {
  const validator = new BuildingValidator();
  return validator.validate(building, fileName);
}
