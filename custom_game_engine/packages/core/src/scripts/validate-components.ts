/**
 * Component Registration Validation Script
 *
 * Validates that all Phase 1-4 components are properly registered:
 * - ComponentType enum has entry
 * - Component file exists
 * - Component is exported in index.ts
 * - Component has TypeScript type
 * - Component has creation helper function
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Component definitions to validate
interface ComponentDefinition {
  name: string;
  componentType: string; // Value in ComponentType enum
  fileName: string; // Component file name (e.g., 'CityGovernanceComponent.ts')
  typeName: string; // TypeScript type name (e.g., 'CityGovernanceComponent')
  helperName: string; // Creation helper name (e.g., 'createCityGovernanceComponent')
  phase: string; // Which phase added this component
}

const COMPONENTS_TO_VALIDATE: ComponentDefinition[] = [
  // Phase 1: City Governance
  {
    name: 'City Governance',
    componentType: 'city_governance',
    fileName: 'CityGovernanceComponent.ts',
    typeName: 'CityGovernanceComponent',
    helperName: 'createCityGovernanceComponent',
    phase: 'Phase 1',
  },

  // Phase 2: Dynasty & Higher Governance
  {
    name: 'Dynasty',
    componentType: 'dynasty',
    fileName: 'DynastyComponent.ts',
    typeName: 'DynastyComponent',
    helperName: 'createDynastyComponent',
    phase: 'Phase 2',
  },
  {
    name: 'Federation Governance',
    componentType: 'federation_governance',
    fileName: 'FederationGovernanceComponent.ts',
    typeName: 'FederationGovernanceComponent',
    helperName: 'createFederationGovernanceComponent',
    phase: 'Phase 2',
  },
  {
    name: 'Galactic Council',
    componentType: 'galactic_council',
    fileName: 'GalacticCouncilComponent.ts',
    typeName: 'GalacticCouncilComponent',
    helperName: 'createGalacticCouncilComponent',
    phase: 'Phase 2',
  },

  // Phase 3: Trade & Logistics
  {
    name: 'Trade Network',
    componentType: 'trade_network',
    fileName: 'TradeNetworkComponent.ts',
    typeName: 'TradeNetworkComponent',
    helperName: 'createTradeNetworkComponent',
    phase: 'Phase 3',
  },
  {
    name: 'Blockade',
    componentType: 'blockade',
    fileName: 'BlockadeComponent.ts',
    typeName: 'BlockadeComponent',
    helperName: 'createBlockadeComponent',
    phase: 'Phase 3',
  },
  {
    name: 'Exploration Mission',
    componentType: 'exploration_mission',
    fileName: 'ExplorationMissionComponent.ts',
    typeName: 'ExplorationMissionComponent',
    helperName: 'createExplorationMissionComponent',
    phase: 'Phase 3',
  },
  {
    name: 'Mining Operation',
    componentType: 'mining_operation',
    fileName: 'MiningOperationComponent.ts',
    typeName: 'MiningOperationComponent',
    helperName: 'createMiningOperationComponent',
    phase: 'Phase 3',
  },

  // Phase 4: Multiverse & Timeline
  {
    name: 'Causal Chain',
    componentType: 'causal_chain',
    fileName: 'CausalChainComponent.ts',
    typeName: 'CausalChainComponent',
    helperName: 'createCausalChainComponent',
    phase: 'Phase 4',
  },
  {
    name: 'Timeline Merger Operation',
    componentType: 'timeline_merger_operation',
    fileName: 'TimelineMergerOperationComponent.ts',
    typeName: 'TimelineMergerOperationComponent',
    helperName: 'createTimelineMergerOperation',
    phase: 'Phase 4',
  },
  {
    name: 'Invasion',
    componentType: 'invasion',
    fileName: 'InvasionComponent.ts',
    typeName: 'InvasionComponent',
    helperName: 'createInvasionComponent',
    phase: 'Phase 4',
  },
];

// Validation results
interface ValidationResult {
  component: string;
  phase: string;
  checks: {
    enumExists: boolean;
    fileExists: boolean;
    typeExported: boolean;
    helperExported: boolean;
    hasJSDoc: boolean;
  };
  errors: string[];
}

// Paths
const COMPONENT_TYPE_PATH = path.resolve(__dirname, '../types/ComponentType.ts');
const COMPONENTS_DIR = path.resolve(__dirname, '../components');
const INDEX_PATH = path.resolve(COMPONENTS_DIR, 'index.ts');

/**
 * Check if ComponentType enum contains the type
 */
function checkEnumExists(componentType: string): boolean {
  const content = fs.readFileSync(COMPONENT_TYPE_PATH, 'utf-8');
  // Look for pattern like: CityGovernance = 'city_governance',
  const enumPattern = new RegExp(`\\w+\\s*=\\s*['"]${componentType}['"]`, 'g');
  return enumPattern.test(content);
}

/**
 * Check if component file exists
 */
function checkFileExists(fileName: string): boolean {
  const filePath = path.resolve(COMPONENTS_DIR, fileName);
  return fs.existsSync(filePath);
}

/**
 * Check if component has JSDoc comments
 */
function checkHasJSDoc(fileName: string): boolean {
  const filePath = path.resolve(COMPONENTS_DIR, fileName);
  if (!fs.existsSync(filePath)) return false;

  const content = fs.readFileSync(filePath, 'utf-8');
  // Check for JSDoc block before interface or type
  return content.includes('/**') && content.includes('*/');
}

/**
 * Check if type is exported in index.ts
 */
function checkTypeExported(typeName: string): boolean {
  const content = fs.readFileSync(INDEX_PATH, 'utf-8');

  // Check for various export patterns:
  // export type { TypeName }
  // export { TypeName }
  // export * from './TypeNameComponent.js'
  const patterns = [
    new RegExp(`export\\s+type\\s*\\{[^}]*\\b${typeName}\\b[^}]*\\}`, 'g'),
    new RegExp(`export\\s*\\{[^}]*\\b${typeName}\\b[^}]*\\}`, 'g'),
    new RegExp(`export\\s+\\*\\s+from\\s+['"].*${typeName.replace('Component', '')}Component\\.js['"]`, 'g'),
  ];

  return patterns.some((pattern) => pattern.test(content));
}

/**
 * Check if helper function is exported in index.ts
 */
function checkHelperExported(helperName: string): boolean {
  const content = fs.readFileSync(INDEX_PATH, 'utf-8');

  // Check for various export patterns:
  // export { helperName }
  // export * from './SomeComponent.js' (indirect export)
  const patterns = [
    new RegExp(`export\\s*\\{[^}]*\\b${helperName}\\b[^}]*\\}`, 'g'),
    new RegExp(`\\b${helperName}\\b`, 'g'), // Present anywhere in index
  ];

  return patterns.some((pattern) => pattern.test(content));
}

/**
 * Validate a single component
 */
function validateComponent(def: ComponentDefinition): ValidationResult {
  const errors: string[] = [];

  const enumExists = checkEnumExists(def.componentType);
  if (!enumExists) {
    errors.push(`ComponentType enum missing entry for '${def.componentType}'`);
  }

  const fileExists = checkFileExists(def.fileName);
  if (!fileExists) {
    errors.push(`Component file '${def.fileName}' not found`);
  }

  const hasJSDoc = fileExists ? checkHasJSDoc(def.fileName) : false;
  if (fileExists && !hasJSDoc) {
    errors.push(`Component file '${def.fileName}' missing JSDoc comments`);
  }

  const typeExported = checkTypeExported(def.typeName);
  if (!typeExported) {
    errors.push(`Type '${def.typeName}' not exported in index.ts`);
  }

  const helperExported = checkHelperExported(def.helperName);
  if (!helperExported) {
    errors.push(`Helper '${def.helperName}' not exported in index.ts`);
  }

  return {
    component: def.name,
    phase: def.phase,
    checks: {
      enumExists,
      fileExists,
      typeExported,
      helperExported,
      hasJSDoc,
    },
    errors,
  };
}

/**
 * Main validation function
 */
function validateAllComponents(): void {
  console.log('Component Registration Validation');
  console.log('==================================\n');

  const results = COMPONENTS_TO_VALIDATE.map(validateComponent);

  // Print results
  for (const result of results) {
    const allPassed = result.errors.length === 0;
    const icon = allPassed ? '✅' : '❌';

    console.log(`${icon} ${result.component} (${result.phase})`);

    if (!allPassed) {
      for (const error of result.errors) {
        console.log(`   - ${error}`);
      }
    }

    // Show detailed checks
    const checks = result.checks;
    if (!allPassed) {
      console.log(`   Checks: enum=${checks.enumExists} file=${checks.fileExists} type=${checks.typeExported} helper=${checks.helperExported} jsdoc=${checks.hasJSDoc}`);
      console.log('');
    }
  }

  // Summary
  const passed = results.filter((r) => r.errors.length === 0).length;
  const failed = results.length - passed;

  console.log('==================================');
  console.log(`Total: ${results.length} components checked`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  // Exit with error code if any failed
  if (failed > 0) {
    console.error('\n❌ Validation failed! Fix the issues above.');
    process.exit(1);
  } else {
    console.log('\n✅ All components properly registered!');
    process.exit(0);
  }
}

// Run validation
validateAllComponents();
