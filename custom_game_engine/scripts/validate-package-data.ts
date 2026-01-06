#!/usr/bin/env tsx
/**
 * Package-Scoped Data Validator
 *
 * Validates only the data files within a specific package.
 * Usage: npx tsx scripts/validate-package-data.ts <package-path>
 * Example: npx tsx scripts/validate-package-data.ts packages/core
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

/**
 * Extract plant species from a TypeScript file
 */
function extractPlantSpecies(content: string): any[] {
  const plants: any[] = [];
  try {
    const speciesPattern = /export const (\w+):\s*PlantSpecies\s*=\s*({[\s\S]*?^});/gm;
    let match;
    while ((match = speciesPattern.exec(content)) !== null) {
      try {
        const objectStr = match[2];
        const plant = evalObjectLiteral(objectStr);
        plants.push(plant);
      } catch (e) {
        // Skip unparseable objects
      }
    }
  } catch (e) {
    // Skip file
  }
  return plants;
}

function extractItems(content: string): any[] {
  return extractExportedObjects(content, 'Item');
}

function extractSpells(content: string): any[] {
  return extractExportedObjects(content, 'Spell');
}

function extractAnimals(content: string): any[] {
  const animals: any[] = [];
  try {
    const recordPattern = /export const ANIMAL_SPECIES:\s*Record<string,\s*AnimalSpecies>\s*=\s*{([\s\S]*?)^};/m;
    const match = recordPattern.exec(content);
    if (match) {
      const recordContent = match[1];
      const animalPattern = /(\w+):\s*{([\s\S]*?)^  },?$/gm;
      let animalMatch;
      while ((animalMatch = animalPattern.exec(recordContent)) !== null) {
        try {
          const objectStr = '{' + animalMatch[2] + '}';
          const animal = evalObjectLiteral(objectStr);
          animals.push(animal);
        } catch (e) {
          // Skip
        }
      }
    }
  } catch (e) {
    // Skip
  }
  return animals;
}

function extractRecipes(content: string): any[] {
  return extractExportedObjects(content, 'Recipe');
}

function extractBuildings(content: string): any[] {
  return extractExportedObjects(content, 'BuildingBlueprint');
}

function extractSummonableEntities(content: string): any[] {
  return [];
}

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
        // Skip unparseable
      }
    }
  } catch (e) {
    // Skip
  }
  return objects;
}

function evalObjectLiteral(str: string): any {
  try {
    return eval('(' + str + ')');
  } catch (e) {
    throw new Error(`Failed to parse object literal`);
  }
}

/**
 * Validate data files in a specific package
 */
async function validatePackage(packagePath: string): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  const VALIDATORS: ValidatorConfig[] = [
    {
      pattern: `${packagePath}/src/**/plant-species/**/*.ts`,
      validator: validatePlantSpecies,
      type: 'plant',
      extractData: extractPlantSpecies,
    },
    {
      pattern: `${packagePath}/src/**/items/**/*.ts`,
      validator: validateItem,
      type: 'item',
      extractData: extractItems,
    },
    {
      pattern: `${packagePath}/src/**/magic/**/*Spells.ts`,
      validator: validateSpell,
      type: 'spell',
      extractData: extractSpells,
    },
    {
      pattern: `${packagePath}/src/**/data/animalSpecies.ts`,
      validator: validateAnimal,
      type: 'animal',
      extractData: extractAnimals,
    },
    {
      pattern: `${packagePath}/src/**/recipes/**/*.ts`,
      validator: validateRecipe,
      type: 'recipe',
      extractData: extractRecipes,
    },
    {
      pattern: `${packagePath}/src/**/buildings/**/*Registry.ts`,
      validator: validateBuilding,
      type: 'building',
      extractData: extractBuildings,
    },
  ];

  console.log(`🔍 Validating data in: ${packagePath}\n`);

  for (const config of VALIDATORS) {
    const files = await glob(config.pattern, {
      ignore: ['**/node_modules/**', '**/__tests__/**', '**/dist/**']
    });

    if (files.length === 0) continue;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');
      const dataObjects = config.extractData(content);

      if (dataObjects.length === 0) continue;

      for (const dataObj of dataObjects) {
        const validationErrors = config.validator(dataObj, file);

        if (validationErrors.length > 0) {
          const errors = validationErrors.filter(e => e.severity === 'error');
          const warnings = validationErrors.filter(e => e.severity === 'warning');

          if (errors.length > 0 || warnings.length > 0) {
            results.push({
              file,
              type: config.type,
              errors,
              warnings,
            });
          }
        }
      }
    }
  }

  return results;
}

/**
 * Print validation results
 */
function printResults(results: ValidationResult[], packageName: string) {
  let totalErrors = 0;
  let totalWarnings = 0;

  console.log('='.repeat(80));
  console.log(`VALIDATION RESULTS: ${packageName}`);
  console.log('='.repeat(80) + '\n');

  if (results.length === 0) {
    console.log(`✅ All data in ${packageName} validated successfully!\n`);
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
    console.log(`❌ Validation failed for ${packageName} - please fix errors above`);
    process.exit(1);
  } else if (totalWarnings > 0) {
    console.log(`⚠️  Validation passed with warnings for ${packageName}`);
    process.exit(0);
  } else {
    console.log(`✅ All validations passed for ${packageName}!`);
    process.exit(0);
  }
}

/**
 * Main entry point
 */
async function main() {
  const packagePath = process.argv[2];

  if (!packagePath) {
    console.error('Usage: npx tsx scripts/validate-package-data.ts <package-path>');
    console.error('Example: npx tsx scripts/validate-package-data.ts packages/core');
    process.exit(1);
  }

  if (!fs.existsSync(packagePath)) {
    console.error(`❌ Package path does not exist: ${packagePath}`);
    process.exit(1);
  }

  try {
    const packageName = path.basename(packagePath);
    const results = await validatePackage(packagePath);
    printResults(results, packageName);
  } catch (error) {
    console.error('❌ Validation failed with error:', error);
    process.exit(1);
  }
}

main();
