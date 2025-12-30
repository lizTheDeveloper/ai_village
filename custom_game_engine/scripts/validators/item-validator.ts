#!/usr/bin/env tsx
/**
 * Item Validator
 *
 * Validates item definitions for:
 * - Required fields
 * - Valid categories and types
 * - Consistent properties
 * - Value ranges
 */

export interface ValidationError {
  file: string;
  itemId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class ItemValidator {
  private errors: ValidationError[] = [];

  validate(item: any, fileName: string): ValidationError[] {
    this.errors = [];

    // Basic required fields
    this.validateRequired(item, fileName, 'id');
    this.validateRequired(item, fileName, 'name');
    this.validateRequired(item, fileName, 'category');
    this.validateRequired(item, fileName, 'stackable');

    // Category validation
    const validCategories = [
      'resource', 'tool', 'weapon', 'food', 'building', 'seed',
      'medicine', 'magical', 'clothing', 'container', 'fuel'
    ];
    if (item.category && !validCategories.includes(item.category)) {
      this.addError(fileName, item.id, 'category',
        `Invalid category: ${item.category}`, 'error');
    }

    // Weight validation
    if (item.weight !== undefined) {
      if (typeof item.weight !== 'number' || item.weight < 0) {
        this.addError(fileName, item.id, 'weight',
          `Invalid weight: ${item.weight} (must be non-negative number)`, 'error');
      }
    }

    // Durability validation for tools/weapons
    if ((item.category === 'tool' || item.category === 'weapon') && item.durability !== undefined) {
      if (typeof item.durability !== 'number' || item.durability < 0) {
        this.addError(fileName, item.id, 'durability',
          `Invalid durability: ${item.durability}`, 'error');
      }
    }

    // Food properties validation
    if (item.category === 'food') {
      this.validateFoodItem(item, fileName);
    }

    // Tool properties validation
    if (item.category === 'tool') {
      this.validateToolItem(item, fileName);
    }

    // Seed properties validation
    if (item.category === 'seed') {
      this.validateSeedItem(item, fileName);
    }

    // Stack size validation
    if (item.stackable && item.maxStack !== undefined) {
      if (typeof item.maxStack !== 'number' || item.maxStack < 1) {
        this.addError(fileName, item.id, 'maxStack',
          `Invalid maxStack: ${item.maxStack}`, 'error');
      }
    }

    return this.errors;
  }

  private validateFoodItem(item: any, fileName: string) {
    if (item.nutrition === undefined) {
      this.addError(fileName, item.id, 'nutrition',
        'Food items should specify nutrition value', 'warning');
    } else if (typeof item.nutrition !== 'number' || item.nutrition < 0) {
      this.addError(fileName, item.id, 'nutrition',
        `Invalid nutrition: ${item.nutrition}`, 'error');
    }

    if (item.spoilTime !== undefined && (typeof item.spoilTime !== 'number' || item.spoilTime < 0)) {
      this.addError(fileName, item.id, 'spoilTime',
        `Invalid spoilTime: ${item.spoilTime}`, 'error');
    }
  }

  private validateToolItem(item: any, fileName: string) {
    if (!item.toolType) {
      this.addError(fileName, item.id, 'toolType',
        'Tool items must specify toolType', 'error');
    }

    const validToolTypes = ['axe', 'pickaxe', 'hoe', 'shovel', 'hammer', 'knife', 'bucket'];
    if (item.toolType && !validToolTypes.includes(item.toolType)) {
      this.addError(fileName, item.id, 'toolType',
        `Unknown toolType: ${item.toolType}`, 'warning');
    }

    if (item.efficiency !== undefined && (typeof item.efficiency !== 'number' || item.efficiency < 0)) {
      this.addError(fileName, item.id, 'efficiency',
        `Invalid efficiency: ${item.efficiency}`, 'error');
    }
  }

  private validateSeedItem(item: any, fileName: string) {
    if (!item.plantSpecies) {
      this.addError(fileName, item.id, 'plantSpecies',
        'Seed items must specify plantSpecies', 'error');
    }

    if (item.growthTime !== undefined && (typeof item.growthTime !== 'number' || item.growthTime < 0)) {
      this.addError(fileName, item.id, 'growthTime',
        `Invalid growthTime: ${item.growthTime}`, 'error');
    }
  }

  private validateRequired(item: any, fileName: string, field: string) {
    if (!item[field] && item[field] !== false) {
      this.addError(fileName, item.id || 'unknown', field,
        `Missing required field: ${field}`, 'error');
    }
  }

  private addError(file: string, itemId: string, field: string, message: string, severity: 'error' | 'warning') {
    this.errors.push({ file, itemId, field, message, severity });
  }
}

export function validateItem(item: any, fileName: string): ValidationError[] {
  const validator = new ItemValidator();
  return validator.validate(item, fileName);
}
