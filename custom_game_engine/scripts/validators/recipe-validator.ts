#!/usr/bin/env tsx
/**
 * Recipe Validator
 *
 * Validates recipe definitions for:
 * - Required fields
 * - Valid categories
 * - Ingredient and output validation
 * - Skill requirements
 * - Consistent properties
 */

export interface ValidationError {
  file: string;
  recipeId: string;
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export class RecipeValidator {
  private errors: ValidationError[] = [];

  validate(recipe: any, fileName: string): ValidationError[] {
    this.errors = [];

    // Basic required fields
    this.validateRequired(recipe, fileName, 'id');
    this.validateRequired(recipe, fileName, 'name');
    this.validateRequired(recipe, fileName, 'category');
    this.validateRequired(recipe, fileName, 'description');
    this.validateRequired(recipe, fileName, 'ingredients');
    this.validateRequired(recipe, fileName, 'output');

    // Category validation
    const validCategories = [
      'All', 'Tools', 'Weapons', 'Food', 'Materials', 'Building', 'Decorations'
    ];
    if (recipe.category && !validCategories.includes(recipe.category)) {
      this.addError(fileName, recipe.id, 'category',
        `Invalid category: ${recipe.category}`, 'error');
    }

    // Ingredients validation
    if (recipe.ingredients) {
      this.validateIngredients(recipe, fileName);
    }

    // Output validation
    if (recipe.output) {
      this.validateOutput(recipe, fileName);
    }

    // Crafting time validation
    if (recipe.craftingTime !== undefined) {
      if (typeof recipe.craftingTime !== 'number' || recipe.craftingTime < 0) {
        this.addError(fileName, recipe.id, 'craftingTime',
          `Invalid craftingTime: ${recipe.craftingTime} (must be non-negative)`, 'error');
      }
    }

    // XP gain validation
    if (recipe.xpGain !== undefined) {
      if (typeof recipe.xpGain !== 'number' || recipe.xpGain < 0) {
        this.addError(fileName, recipe.id, 'xpGain',
          `Invalid xpGain: ${recipe.xpGain} (must be non-negative)`, 'error');
      }
    }

    // Skill requirements validation
    if (recipe.skillRequirements) {
      this.validateSkillRequirements(recipe, fileName);
    }

    // Research requirements validation
    if (recipe.researchRequirements && !Array.isArray(recipe.researchRequirements)) {
      this.addError(fileName, recipe.id, 'researchRequirements',
        'researchRequirements must be an array', 'error');
    }

    return this.errors;
  }

  private validateIngredients(recipe: any, fileName: string) {
    if (!Array.isArray(recipe.ingredients)) {
      this.addError(fileName, recipe.id, 'ingredients',
        'ingredients must be an array', 'error');
      return;
    }

    if (recipe.ingredients.length === 0) {
      this.addError(fileName, recipe.id, 'ingredients',
        'Recipe must have at least one ingredient', 'error');
    }

    for (const ingredient of recipe.ingredients) {
      if (!ingredient.itemId) {
        this.addError(fileName, recipe.id, 'ingredients',
          'Ingredient must specify itemId', 'error');
      }
      if (ingredient.quantity === undefined) {
        this.addError(fileName, recipe.id, 'ingredients',
          `Ingredient ${ingredient.itemId} must specify quantity`, 'error');
      } else if (typeof ingredient.quantity !== 'number' || ingredient.quantity <= 0) {
        this.addError(fileName, recipe.id, 'ingredients',
          `Invalid quantity for ingredient ${ingredient.itemId}: ${ingredient.quantity}`, 'error');
      }
    }
  }

  private validateOutput(recipe: any, fileName: string) {
    if (!recipe.output.itemId) {
      this.addError(fileName, recipe.id, 'output',
        'Output must specify itemId', 'error');
    }
    if (recipe.output.quantity === undefined) {
      this.addError(fileName, recipe.id, 'output',
        'Output must specify quantity', 'error');
    } else if (typeof recipe.output.quantity !== 'number' || recipe.output.quantity <= 0) {
      this.addError(fileName, recipe.id, 'output',
        `Invalid output quantity: ${recipe.output.quantity}`, 'error');
    }
  }

  private validateSkillRequirements(recipe: any, fileName: string) {
    if (!Array.isArray(recipe.skillRequirements)) {
      this.addError(fileName, recipe.id, 'skillRequirements',
        'skillRequirements must be an array', 'error');
      return;
    }

    const validSkills = [
      'smithing', 'crafting', 'cooking', 'building', 'farming', 'gathering',
      'exploration', 'combat', 'animal_handling', 'medicine', 'social'
    ];

    for (const req of recipe.skillRequirements) {
      if (!req.skill) {
        this.addError(fileName, recipe.id, 'skillRequirements',
          'Skill requirement must specify skill', 'error');
      } else if (!validSkills.includes(req.skill)) {
        this.addError(fileName, recipe.id, 'skillRequirements',
          `Unknown skill: ${req.skill}`, 'warning');
      }

      if (req.level === undefined) {
        this.addError(fileName, recipe.id, 'skillRequirements',
          `Skill requirement for ${req.skill} must specify level`, 'error');
      } else if (typeof req.level !== 'number' || req.level < 0) {
        this.addError(fileName, recipe.id, 'skillRequirements',
          `Invalid level for skill ${req.skill}: ${req.level}`, 'error');
      }
    }
  }

  private validateRequired(recipe: any, fileName: string, field: string) {
    if (!recipe[field] && recipe[field] !== 0 && recipe[field] !== false) {
      this.addError(fileName, recipe.id || 'unknown', field,
        `Missing required field: ${field}`, 'error');
    }
  }

  private addError(file: string, recipeId: string, field: string, message: string, severity: 'error' | 'warning') {
    this.errors.push({ file, recipeId, field, message, severity });
  }
}

export function validateRecipe(recipe: any, fileName: string): ValidationError[] {
  const validator = new RecipeValidator();
  return validator.validate(recipe, fileName);
}
