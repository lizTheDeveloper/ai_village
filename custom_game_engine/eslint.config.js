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

      // Catch performance issues with restricted syntax
      'no-restricted-syntax': [
        'error',
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
      ],
    },
  },
  {
    // Performance-critical system code
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
