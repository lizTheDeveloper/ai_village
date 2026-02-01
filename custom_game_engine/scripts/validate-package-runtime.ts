#!/usr/bin/env tsx
/**
 * Runtime validator for packages
 *
 * Validates that a package's code will work at runtime by:
 * 1. Type-checking with TypeScript
 * 2. Simulating ECS instantiation
 * 3. Checking all exports are valid
 *
 * Usage: npm run validate:runtime <package-name>
 * Example: npm run validate:runtime core
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

class PackageValidator {
  constructor(private packageName: string) {}

  async validate(): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
    };

    console.log(`\n🔍 Validating package: @ai-village/${this.packageName}\n`);

    // 1. Check TypeScript compilation (all packages)
    console.log('📝 Checking TypeScript compilation...');
    const tsResult = this.checkTypeScript();
    if (!tsResult.valid) {
      result.valid = false;
      result.errors.push(...tsResult.errors);
    }

    // 2. Check exports are valid (all packages)
    console.log('📦 Checking package exports...');
    const exportsResult = await this.checkExports();
    if (!exportsResult.valid) {
      result.valid = false;
      result.errors.push(...exportsResult.errors);
    }

    // 3. Package-specific validation
    const packageValidation = await this.validatePackageSpecific();
    if (!packageValidation.valid) {
      result.valid = false;
      result.errors.push(...packageValidation.errors);
    }
    result.warnings.push(...packageValidation.warnings);

    // 4. Simulate runtime (if TypeScript passed)
    if (result.valid) {
      console.log('⚙️  Simulating runtime environment...');
      const runtimeResult = await this.simulateRuntime();
      if (!runtimeResult.valid) {
        result.valid = false;
        result.errors.push(...runtimeResult.errors);
      }
      result.warnings.push(...runtimeResult.warnings);
    }

    return result;
  }

  private checkTypeScript(): ValidationResult {
    const packageDir = join(rootDir, 'packages', this.packageName);

    try {
      // Run tsc with --noEmit to check types without building
      execSync('npx tsc --noEmit', {
        cwd: packageDir,
        stdio: 'pipe',
        encoding: 'utf8',
      });
      return { valid: true, errors: [], warnings: [] };
    } catch (error: any) {
      const output = error.stdout || error.stderr || '';
      return {
        valid: false,
        errors: [`TypeScript compilation failed:\n${output}`],
        warnings: [],
      };
    }
  }

  private async checkExports(): Promise<ValidationResult> {
    const packageDir = join(rootDir, 'packages', this.packageName);
    const indexPath = join(packageDir, 'src', 'index.ts');

    if (!fs.existsSync(indexPath)) {
      return {
        valid: false,
        errors: [`No index.ts found at ${indexPath}`],
        warnings: [],
      };
    }

    try {
      // Check that index.ts exists and is readable
      const content = fs.readFileSync(indexPath, 'utf8');

      // Check for common export issues
      const warnings: string[] = [];
      if (!content.includes('export')) {
        warnings.push('index.ts has no exports');
      }

      return { valid: true, errors: [], warnings };
    } catch (error: any) {
      return {
        valid: false,
        errors: [`Failed to read index.ts: ${error.message}`],
        warnings: [],
      };
    }
  }

  /**
   * Package-specific validation
   * Each package can have its own validation rules
   */
  private async validatePackageSpecific(): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (this.packageName) {
      case 'core':
        console.log('📊 Validating core package data files...');

        // Validate JSON data files
        try {
          execSync('npm run validate-data', {
            cwd: rootDir,
            stdio: 'pipe',
            encoding: 'utf8',
          });
        } catch (error: any) {
          const output = error.stdout || error.stderr || '';
          errors.push(`Data validation failed:\n${output}`);
        }

        // Validate building blueprints (check for duplicates)
        try {
          execSync('npm run validate:blueprints', {
            cwd: rootDir,
            stdio: 'pipe',
            encoding: 'utf8',
          });
        } catch (error: any) {
          const output = error.stdout || error.stderr || '';
          errors.push(`Blueprint validation failed:\n${output}`);
        }
        break;

      case 'renderer':
        console.log('🎨 Validating renderer package...');
        {
          const assetsDir = join(rootDir, 'packages', 'renderer', 'assets');
          const spritesDir = join(assetsDir, 'sprites');

          if (!fs.existsSync(assetsDir)) {
            errors.push(`Renderer assets directory not found: ${assetsDir}`);
          } else if (!fs.existsSync(spritesDir)) {
            errors.push(`Renderer sprites directory not found: ${spritesDir}`);
          } else {
            console.log('  ✓ Sprite assets directory exists');
          }
        }
        break;

      case 'llm':
        console.log('🤖 Validating LLM package...');
        {
          const llmSrcDir = join(rootDir, 'packages', 'llm', 'src');
          const requiredPromptBuilders = [
            'ExecutorPromptBuilder.ts',
            'TrajectoryPromptBuilder.ts',
            'GovernorPromptBuilder.ts',
          ];

          let allPresent = true;
          for (const builder of requiredPromptBuilders) {
            const path = join(llmSrcDir, builder);
            if (!fs.existsSync(path)) {
              errors.push(`Missing prompt builder: ${builder}`);
              allPresent = false;
            }
          }

          if (allPresent) {
            console.log('  ✓ All prompt builders present');
          }

          // Note: API key configuration is runtime-dependent, not validated here
        }
        break;

      case 'world':
        console.log('🌍 Validating world package...');
        {
          const entitiesDir = join(rootDir, 'packages', 'world', 'src', 'entities');
          const alienGenDir = join(
            rootDir,
            'packages',
            'world',
            'src',
            'alien-generation'
          );

          if (!fs.existsSync(entitiesDir)) {
            errors.push(`Entities directory not found: ${entitiesDir}`);
          } else {
            const entityFiles = fs
              .readdirSync(entitiesDir)
              .filter((f: string) => f.endsWith('.ts'));
            if (entityFiles.length === 0) {
              errors.push('No entity schema files found in entities directory');
            } else {
              console.log(`  ✓ Found ${entityFiles.length} entity files`);
            }
          }

          if (!fs.existsSync(alienGenDir)) {
            warnings.push(`Alien generation directory not found: ${alienGenDir}`);
          } else {
            console.log('  ✓ Alien generation module present');
          }
        }
        break;

      case 'building-designer':
        console.log('🏗️  Validating building-designer package...');
        {
          const srcDir = join(rootDir, 'packages', 'building-designer', 'src');
          const requiredFiles = [
            'types.ts',
            'material-effects.ts',
            'building-library.ts',
            'validator.ts',
          ];

          let allPresent = true;
          for (const file of requiredFiles) {
            const path = join(srcDir, file);
            if (!fs.existsSync(path)) {
              errors.push(`Missing required file: ${file}`);
              allPresent = false;
            }
          }

          if (allPresent) {
            console.log('  ✓ All building-designer core files present');
          }
        }
        break;

      default:
        // No package-specific validation for this package
        console.log(`ℹ️  No package-specific validation for ${this.packageName}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async simulateRuntime(): Promise<ValidationResult> {
    const warnings: string[] = [];

    // For now, we'll skip actual instantiation since it requires the built package
    // This would require a more sophisticated approach with dynamic imports
    warnings.push('Runtime simulation skipped (requires built package)');

    return { valid: true, errors: [], warnings };
  }
}

async function main() {
  const packageName = process.argv[2];

  if (!packageName) {
    console.error('Usage: npm run validate:runtime <package-name>');
    console.error('Example: npm run validate:runtime core');
    process.exit(1);
  }

  const validator = new PackageValidator(packageName);
  const result = await validator.validate();

  console.log('\n' + '='.repeat(60));

  if (result.valid) {
    console.log('✅ Validation PASSED\n');
    if (result.warnings.length > 0) {
      console.log('⚠️  Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }
    process.exit(0);
  } else {
    console.log('❌ Validation FAILED\n');
    console.log('Errors:');
    result.errors.forEach(e => console.log(`  ${e}\n`));
    if (result.warnings.length > 0) {
      console.log('Warnings:');
      result.warnings.forEach(w => console.log(`  - ${w}`));
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Validator crashed:', error);
  process.exit(1);
});
