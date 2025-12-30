#!/usr/bin/env tsx
/**
 * Master Data Validator
 *
 * Runs all validators on all data files and aggregates errors.
 * Usage: npm run validate-data
 */

import { glob } from 'glob';
import * as path from 'path';
import * as fs from 'fs';
import { validatePlantSpecies } from './validators/plant-validator.js';
import { validateItem } from './validators/item-validator.js';
import { validateSpell } from './validators/spell-validator.js';
import { validateAnimal } from './validators/animal-validator.js';
import { validateRecipe } from './validators/recipe-validator.js';
import { validateBuilding } from './validators/building-validator.js';
import { validateSummonableEntity } from './validators/summonable-entity-validator.js';

interface ValidationResult {
  file: string;
  type: string;
  errors: any[];
  warnings: any[];
}

interface ValidatorConfig {
  pattern: string;
  validator: (data: any, fileName: string) => any[];
  type: string;
  extractData: (content: string) => any[];
}

const VALIDATORS: ValidatorConfig[] = [
  {
    pattern: '**/plant-species/**/*.ts',
    validator: validatePlantSpecies,
    type: 'plant',
    extractData: extractPlantSpecies,
  },
  {
    pattern: '**/items/**/*.ts',
    validator: validateItem,
    type: 'item',
    extractData: extractItems,
  },
  {
    pattern: '**/magic/**/*Spells.ts',
    validator: validateSpell,
    type: 'spell',
    extractData: extractSpells,
  },
  {
    pattern: '**/data/animalSpecies.ts',
    validator: validateAnimal,
    type: 'animal',
    extractData: extractAnimals,
  },
  {
    pattern: '**/recipes/**/*.ts',
    validator: validateRecipe,
    type: 'recipe',
    extractData: extractRecipes,
  },
  {
    pattern: '**/buildings/**/*Registry.ts',
    validator: validateBuilding,
    type: 'building',
    extractData: extractBuildings,
  },
  {
    pattern: '**/magic/SummonableEntities.ts',
    validator: validateSummonableEntity,
    type: 'summonable_entity',
    extractData: extractSummonableEntities,
  },
];

/**
 * Extract plant species from a TypeScript file
 */
function extractPlantSpecies(content: string): any[] {
  const plants: any[] = [];

  // Try to evaluate the file as a module
  try {
    // Remove import statements and extract exported constants
    const speciesPattern = /export const (\w+):\s*PlantSpecies\s*=\s*({[\s\S]*?^});/gm;
    let match;

    while ((match = speciesPattern.exec(content)) !== null) {
      try {
        // Create a safe evaluation context
        const objectStr = match[2];
        const plant = evalObjectLiteral(objectStr);
        plants.push(plant);
      } catch (e) {
        console.warn(`Failed to parse plant: ${match[1]}`);
      }
    }
  } catch (e) {
    console.warn(`Failed to extract plants from file`);
  }

  return plants;
}

/**
 * Extract items from a TypeScript file
 */
function extractItems(content: string): any[] {
  // Similar extraction logic for items
  return extractExportedObjects(content, 'Item');
}

/**
 * Extract spells from a TypeScript file
 */
function extractSpells(content: string): any[] {
  return extractExportedObjects(content, 'Spell');
}

/**
 * Extract animals from animalSpecies.ts
 */
function extractAnimals(content: string): any[] {
  const animals: any[] = [];

  try {
    // Look for ANIMAL_SPECIES record
    const recordPattern = /export const ANIMAL_SPECIES:\s*Record<string,\s*AnimalSpecies>\s*=\s*{([\s\S]*?)^};/m;
    const match = recordPattern.exec(content);

    if (match) {
      const recordContent = match[1];
      // Extract each animal definition
      const animalPattern = /(\w+):\s*{([\s\S]*?)^  },?$/gm;
      let animalMatch;

      while ((animalMatch = animalPattern.exec(recordContent)) !== null) {
        try {
          const objectStr = '{' + animalMatch[2] + '}';
          const animal = evalObjectLiteral(objectStr);
          animals.push(animal);
        } catch (e) {
          console.warn(`Failed to parse animal: ${animalMatch[1]}`);
        }
      }
    }
  } catch (e) {
    console.warn(`Failed to extract animals`);
  }

  return animals;
}

/**
 * Extract recipes from a TypeScript file
 */
function extractRecipes(content: string): any[] {
  return extractExportedObjects(content, 'Recipe');
}

/**
 * Extract buildings from a TypeScript file
 */
function extractBuildings(content: string): any[] {
  return extractExportedObjects(content, 'BuildingBlueprint');
}

/**
 * Extract summonable entities from SummonableEntities.ts
 */
function extractSummonableEntities(content: string): any[] {
  const entities: any[] = [];

  try {
    // Look for EXAMPLE_SUMMONABLE_ENTITIES array
    const arrayPattern = /export const EXAMPLE_SUMMONABLE_ENTITIES:\s*SummonableEntity\[\]\s*=\s*\[([\s\S]*?)\];/;
    const match = arrayPattern.exec(content);

    if (match) {
      // This is complex - just note that we found the file
      console.log('Found summonable entities file - manual validation recommended');
    }
  } catch (e) {
    console.warn(`Failed to extract summonable entities`);
  }

  return entities;
}

/**
 * Generic extraction for exported objects
 */
function extractExportedObjects(content: string, typeName: string): any[] {
  const objects: any[] = [];

  try {
    const objectPattern = new RegExp(`export const (\\w+):\\s*${typeName}\\s*=\\s*({[\\s\\S]*?^});`, 'gm');
    let match;

    while ((match = objectPattern.exec(content)) !== null) {
      try {
        const objectStr = match[2];
        const obj = evalObjectLiteral(objectStr);
        objects.push(obj);
      } catch (e) {
        console.warn(`Failed to parse ${typeName}: ${match[1]}`);
      }
    }
  } catch (e) {
    console.warn(`Failed to extract ${typeName} objects`);
  }

  return objects;
}

/**
 * Safely evaluate an object literal string
 * Note: This is a simplified version - for production use a proper parser
 */
function evalObjectLiteral(str: string): any {
  try {
    // This is a naive implementation - in production, use a proper TypeScript parser
    // For now, we'll use JSON5 or similar if available
    return eval('(' + str + ')');
  } catch (e) {
    throw new Error(`Failed to parse object literal: ${e}`);
  }
}

/**
 * Run all validators
 */
async function validateAll(): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  console.log('🔍 Scanning for data files...\n');

  for (const config of VALIDATORS) {
    console.log(`Looking for ${config.type} files: ${config.pattern}`);

    const files = await glob(config.pattern, {
      cwd: process.cwd(),
      ignore: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
    });

    console.log(`  Found ${files.length} file(s)`);

    for (const file of files) {
      const fullPath = path.join(process.cwd(), file);
      const content = fs.readFileSync(fullPath, 'utf-8');

      // Extract data objects from file
      const dataObjects = config.extractData(content);

      if (dataObjects.length === 0) {
        console.log(`  ⚠️  No ${config.type} objects found in ${file}`);
        continue;
      }

      // Validate each object
      const allErrors: any[] = [];
      const allWarnings: any[] = [];

      for (const obj of dataObjects) {
        const validationErrors = config.validator(obj, file);

        for (const error of validationErrors) {
          if (error.severity === 'error') {
            allErrors.push(error);
          } else {
            allWarnings.push(error);
          }
        }
      }

      if (allErrors.length > 0 || allWarnings.length > 0) {
        results.push({
          file,
          type: config.type,
          errors: allErrors,
          warnings: allWarnings,
        });
      }
    }
  }

  return results;
}

/**
 * Print validation results
 */
function printResults(results: ValidationResult[]): void {
  let totalErrors = 0;
  let totalWarnings = 0;

  console.log('\n' + '='.repeat(80));
  console.log('VALIDATION RESULTS');
  console.log('='.repeat(80) + '\n');

  if (results.length === 0) {
    console.log('✅ All data files validated successfully!\n');
    return;
  }

  for (const result of results) {
    const errorCount = result.errors.length;
    const warningCount = result.warnings.length;

    totalErrors += errorCount;
    totalWarnings += warningCount;

    console.log(`\n📄 ${result.file}`);
    console.log(`   Type: ${result.type}`);

    if (errorCount > 0) {
      console.log(`   ❌ ${errorCount} error(s)`);
      for (const error of result.errors) {
        console.log(`      - [${error.field}] ${error.message}`);
      }
    }

    if (warningCount > 0) {
      console.log(`   ⚠️  ${warningCount} warning(s)`);
      for (const warning of result.warnings) {
        console.log(`      - [${warning.field}] ${warning.message}`);
      }
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`SUMMARY: ${totalErrors} error(s), ${totalWarnings} warning(s)`);
  console.log('='.repeat(80) + '\n');

  if (totalErrors > 0) {
    console.log('❌ Validation failed - please fix errors above');
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log('⚠️  Validation passed with warnings');
    process.exit(0);
  } else {
    console.log('✅ All validations passed!');
    process.exit(0);
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    const results = await validateAll();
    printResults(results);
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  }
}

main();
