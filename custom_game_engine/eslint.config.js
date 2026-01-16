import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.js', '!eslint.config.js'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      // ============================================================
      // COMPLEXITY RULES - Prevent God Objects
      // ============================================================

      // Cyclomatic complexity - max branches per function
      'complexity': ['warn', { max: 15 }],

      // Max lines per function
      'max-lines-per-function': ['warn', {
        max: 100,
        skipBlankLines: true,
        skipComments: true
      }],

      // Max lines per file (God Object prevention)
      'max-lines': ['warn', {
        max: 500,
        skipBlankLines: true,
        skipComments: true
      }],

      // Max depth of nested blocks
      'max-depth': ['warn', { max: 4 }],

      // Max parameters per function
      'max-params': ['warn', { max: 5 }],

      // Max statements per function
      'max-statements': ['warn', { max: 30 }],

      // Max nested callbacks
      'max-nested-callbacks': ['warn', { max: 3 }],

      // ============================================================
      // TYPE SAFETY - CLAUDE.md Compliance
      // ============================================================

      // Disallow explicit 'any' type
      '@typescript-eslint/no-explicit-any': 'warn',

      // Require explicit return types on functions
      '@typescript-eslint/explicit-function-return-type': 'off', // Too noisy, enable later

      // No unused variables
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }],

      // ============================================================
      // ERROR HANDLING - No Silent Failures
      // ============================================================

      // No empty catch blocks
      'no-empty': ['error', { allowEmptyCatch: false }],

      // Require error handling in promises
      '@typescript-eslint/no-floating-promises': 'off', // Requires type checking, enable with project

      // No console.warn without justification (custom check in complexity script)
      'no-console': ['warn', { allow: ['error', 'info', 'debug'] }],

      // ============================================================
      // CODE QUALITY
      // ============================================================

      // Prefer const
      'prefer-const': 'warn',

      // No var
      'no-var': 'error',

      // Strict equality
      'eqeqeq': ['error', 'always'],

      // No duplicate imports
      'no-duplicate-imports': 'error',

      // ============================================================
      // PERFORMANCE RULES
      // ============================================================

      // Detect common performance anti-patterns
      'no-constant-binary-expression': 'error',

      // Catch performance issues and anti-patterns with restricted syntax
      'no-restricted-syntax': [
        'warn',  // Using 'warn' for global rules; 'error' for system-specific rules
        {
          selector: 'CallExpression[callee.object.name="Math"][callee.property.name="pow"][arguments.1.value=2]',
          message: 'Use x * x instead of Math.pow(x, 2) for better performance'
        },
        {
          selector: 'CallExpression[callee.object.name="Array"][callee.property.name="from"] > MemberExpression[property.name="values"]',
          message: 'Avoid Array.from(map.values()) - iterate directly with for-of loop'
        },
        {
          selector: 'CallExpression[callee.object.name="Object"][callee.property.name="keys"] > CallExpression[callee.property.name="getComponent"]',
          message: 'Avoid Object.keys() in hot paths - cache component access'
        },
        // ============================================================
        // ANTI-PATTERN DETECTION - CLAUDE.md Compliance
        // ============================================================
        {
          selector: 'CallExpression[callee.property.name="removeEntity"]',
          message: 'FORBIDDEN: Do not use removeEntity(). Mark entities as corrupted instead. See CORRUPTION_SYSTEM.md'
        },
        // NOTE: Silent fallback detection - these are warnings because some fallbacks are legitimate
        // (e.g., optional descriptions, UI text). For required data, always throw instead of defaulting.
        {
          selector: 'LogicalExpression[operator="||"][right.type="Literal"]',
          message: 'ANTI-PATTERN: Silent fallback with ||. If data is truly required, throw an error instead. See CLAUDE.md Code Quality Rules #2'
        },
        {
          selector: 'LogicalExpression[operator="??"][right.type="Literal"]',
          message: 'ANTI-PATTERN: Silent fallback with ??. If data is truly required, throw an error instead. See CLAUDE.md Code Quality Rules #2'
        },
      ],
    },
  },
  {
    // Performance-critical system code
    // NOTE: Systems with broad required components (e.g., only [CT.Position]) should use
    // SimulationScheduler.filterActiveEntities() to avoid processing off-screen entities.
    // See SIMULATION_SCHEDULER.md for details.
    //
    // Systems that don't run every tick should use throttling with UPDATE_INTERVAL and lastUpdate.
    // Add a comment explaining why throttling is not needed if the system runs every tick.
    // Example: "// NO_THROTTLE: Critical pathfinding updates required every tick"
    files: ['**/systems/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ForStatement > CallExpression[callee.property.name="query"]',
          message: 'PERFORMANCE: Never call world.query() inside a for loop - cache the result before the loop'
        },
        {
          selector: 'WhileStatement > CallExpression[callee.property.name="query"]',
          message: 'PERFORMANCE: Never call world.query() inside a while loop - cache the result before the loop'
        },
        {
          selector: 'CallExpression[callee.object.name="Math"][callee.property.name="sqrt"]',
          message: 'PERFORMANCE WARNING: Math.sqrt() in system code - consider using squared distance comparison'
        },
        {
          selector: 'CallExpression[callee.object.name="Math"][callee.property.name="pow"]',
          message: 'PERFORMANCE: Use direct multiplication (x * x) instead of Math.pow()'
        },
        {
          selector: 'CallExpression[callee.object.name="console"][callee.property.name=/^(log|debug|info)$/]',
          message: 'Remove console.log/debug/info from system code - use console.error/warn only for errors'
        },
        {
          selector: 'CallExpression[callee.property.name="removeEntity"]',
          message: 'FORBIDDEN: Do not use removeEntity(). Mark entities as corrupted instead. See CORRUPTION_SYSTEM.md'
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'world',
          property: 'query',
          message: 'Consider caching query results if called multiple times in update()'
        },
      ],
    },
  },
  {
    // Behavior files - enforce BehaviorContext patterns
    // These rules guide developers to use the correct, performant APIs
    files: ['**/behavior/behaviors/**/*.ts', '**/behaviors/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'warn',
        // ============================================================
        // SPATIAL QUERIES - Use BehaviorContext instead of world.query()
        // ============================================================
        {
          selector: 'CallExpression[callee.property.name="query"][callee.object.name="world"]',
          message: 'BEHAVIOR PATTERN: Avoid world.query() in behaviors - use ctx.getEntitiesInRadius() or ctx.getNearestEntity() for optimized chunk-based queries'
        },
        {
          selector: 'MemberExpression[property.name="query"][object.name="world"]',
          message: 'BEHAVIOR PATTERN: Avoid world.query() in behaviors - use ctx.getEntitiesInRadius() or ctx.getNearestEntity() for optimized chunk-based queries'
        },
        // ============================================================
        // COMPONENT ACCESS - Use ComponentType enum, not string literals
        // ============================================================
        {
          selector: 'CallExpression[callee.property.name="getComponent"][arguments.0.type="Literal"]',
          message: 'BEHAVIOR PATTERN: Use ComponentType enum (CT.Agent, CT.Position) instead of string literals for component access'
        },
        {
          selector: 'CallExpression[callee.property.name="hasComponent"][arguments.0.type="Literal"]',
          message: 'BEHAVIOR PATTERN: Use ComponentType enum (CT.Agent, CT.Position) instead of string literals for component access'
        },
        {
          selector: 'CallExpression[callee.property.name="updateComponent"][arguments.0.type="Literal"]',
          message: 'BEHAVIOR PATTERN: Use ComponentType enum (CT.Agent, CT.Position) instead of string literals for component access'
        },
        // ============================================================
        // DISTANCE CALCULATIONS - Use squared distance for comparisons
        // ============================================================
        {
          selector: 'CallExpression[callee.object.name="Math"][callee.property.name="sqrt"]',
          message: 'PERFORMANCE: Consider using squared distance (dx*dx + dy*dy) for comparisons instead of Math.sqrt(). Only use sqrt when you need the actual distance value (e.g., for display)'
        },
        // ============================================================
        // CONSERVATION OF MATTER - No entity removal
        // ============================================================
        {
          selector: 'CallExpression[callee.property.name="removeEntity"]',
          message: 'FORBIDDEN: Do not use removeEntity(). Mark entities as corrupted instead. See CORRUPTION_SYSTEM.md'
        },
      ],
    },
  },
  {
    // Relaxed rules for test files
    files: ['**/__tests__/**/*.ts', '**/*.test.ts', '**/__benchmarks__/**/*.bench.ts'],
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
      'no-restricted-syntax': 'off',
      'no-restricted-properties': 'off',
    },
  },
];
