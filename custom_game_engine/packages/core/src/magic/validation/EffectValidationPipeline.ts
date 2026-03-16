/**
 * EffectValidationPipeline - Multi-stage validation for EffectExpression objects
 *
 * Runs effects through four sequential validation stages:
 * 1. Schema - structural correctness (required fields, valid enum values)
 * 2. Security - safety checks (dangerous patterns, limits)
 * 3. Interpreter - semantic correctness (valid stat/status names)
 * 4. Semantic - design quality warnings (descriptive names, etc.)
 *
 * Stops at the first stage that produces errors. Warnings do not stop
 * further stages.
 */

import type { EffectExpression, EffectOperation, ExpressionNode } from '../EffectExpression.js';
import type { EffectInterpreter } from '../EffectInterpreter.js';

export type ValidationStage = 'schema' | 'security' | 'interpreter' | 'semantic';
export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  severity: IssueSeverity;
  stage: ValidationStage;
  message: string;
  field?: string;
}

export interface PipelineResult {
  valid: boolean;
  /** The stage where a fatal error was found; undefined if all stages passed */
  stage?: ValidationStage;
  issues: ValidationIssue[];
}

// ============================================================================
// Constants
// ============================================================================

const VALID_TARGET_TYPES = new Set(['self', 'single', 'area', 'cone', 'line', 'chain', 'aura', 'global']);
const VALID_TIMING_TYPES = new Set(['immediate', 'delayed', 'channeled', 'triggered']);
const VALID_DAMAGE_TYPES = new Set([
  'fire', 'ice', 'lightning', 'acid', 'poison', 'force', 'radiant', 'necrotic', 'psychic', 'physical', 'void', 'true',
]);
const VALID_OP_TYPES = new Set(['deal_damage', 'modify_stat', 'heal', 'apply_status', 'spawn_entity']);

const MAX_DAMAGE_AMOUNT = 10000;
const MAX_SPAWN_COUNT = 100;
const MAX_OPERATIONS_SECURITY = 100;
const MAX_OPERATIONS_SEMANTIC_WARN = 20;
const MAX_EXPRESSION_DEPTH = 10;
const MIN_DESCRIPTION_LENGTH = 10;

const DANGEROUS_PATTERNS = ['__proto__', 'constructor', 'prototype', 'toString', 'valueOf', 'hasOwnProperty'];

/**
 * Multi-stage validation pipeline for EffectExpression objects.
 */
export class EffectValidationPipeline {
  constructor(private readonly interpreter: EffectInterpreter) {}

  /**
   * Validate an effect expression through all pipeline stages.
   *
   * @param effect The effect to validate (may be a partial/unknown object)
   */
  validate(effect: EffectExpression | Record<string, unknown>): PipelineResult {
    // Stage 1: Schema
    const schemaIssues = this.runSchemaStage(effect);
    if (schemaIssues.some((i) => i.severity === 'error')) {
      return { valid: false, stage: 'schema', issues: schemaIssues };
    }

    // Cast is safe after schema validation passes
    const validEffect = effect as EffectExpression;

    // Stage 2: Security
    const securityIssues = this.runSecurityStage(validEffect);
    if (securityIssues.some((i) => i.severity === 'error')) {
      return { valid: false, stage: 'security', issues: securityIssues };
    }

    // Stage 3: Interpreter
    const interpreterIssues = this.runInterpreterStage(validEffect);
    if (interpreterIssues.some((i) => i.severity === 'error')) {
      return { valid: false, stage: 'interpreter', issues: interpreterIssues };
    }

    // Stage 4: Semantic (warnings only, never blocks validity)
    const semanticIssues = this.runSemanticStage(validEffect);

    const allIssues = [...schemaIssues, ...securityIssues, ...interpreterIssues, ...semanticIssues];

    return { valid: true, issues: allIssues };
  }

  // ============================================================================
  // Stage 1: Schema Validation
  // ============================================================================

  private runSchemaStage(effect: EffectExpression | Record<string, unknown>): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Required fields
    for (const field of ['target', 'operations', 'timing'] as const) {
      if (!(field in effect) || effect[field] === undefined || effect[field] === null) {
        issues.push({
          severity: 'error',
          stage: 'schema',
          message: `Missing required field: ${field}`,
          field,
        });
      }
    }

    if (issues.length > 0) return issues;

    // target.type
    const target = effect['target'] as Record<string, unknown>;
    if (typeof target === 'object' && target !== null) {
      const targetType = target['type'];
      if (!VALID_TARGET_TYPES.has(targetType as string)) {
        issues.push({
          severity: 'error',
          stage: 'schema',
          message: `Invalid target type: "${targetType}". Must be one of: ${[...VALID_TARGET_TYPES].join(', ')}`,
          field: 'target.type',
        });
      }
    }

    // timing.type
    const timing = effect['timing'] as Record<string, unknown>;
    if (typeof timing === 'object' && timing !== null) {
      const timingType = timing['type'];
      if (!VALID_TIMING_TYPES.has(timingType as string)) {
        issues.push({
          severity: 'error',
          stage: 'schema',
          message: `Invalid timing type: "${timingType}". Must be one of: ${[...VALID_TIMING_TYPES].join(', ')}`,
          field: 'timing.type',
        });
      }
    }

    // operations array
    const operations = effect['operations'];
    if (Array.isArray(operations)) {
      if (operations.length === 0) {
        issues.push({
          severity: 'error',
          stage: 'schema',
          message: 'Field "operations" must contain at least one operation',
          field: 'operations',
        });
      } else {
        for (let i = 0; i < operations.length; i++) {
          const op = operations[i] as Record<string, unknown>;
          const opIssues = this.validateOperationSchema(op, i);
          issues.push(...opIssues);
        }
      }
    }

    return issues;
  }

  private validateOperationSchema(op: Record<string, unknown>, index: number): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const opType = op['op'] as string;

    if (!VALID_OP_TYPES.has(opType)) {
      issues.push({
        severity: 'error',
        stage: 'schema',
        message: `Invalid operation type at index ${index}: "${opType}"`,
        field: `operations[${index}].op`,
      });
      return issues;
    }

    switch (opType) {
      case 'deal_damage': {
        const damageType = op['damageType'];
        if (!VALID_DAMAGE_TYPES.has(damageType as string)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Invalid damage type: "${damageType}". Must be one of: ${[...VALID_DAMAGE_TYPES].join(', ')}`,
            field: `operations[${index}].damageType`,
          });
        }
        break;
      }
      case 'modify_stat': {
        if (!('stat' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "modify_stat" at index ${index} requires "stat" field`,
            field: `operations[${index}].stat`,
          });
        }
        if (!('amount' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "modify_stat" at index ${index} requires "amount" field`,
            field: `operations[${index}].amount`,
          });
        }
        break;
      }
    }

    return issues;
  }

  // ============================================================================
  // Stage 2: Security Scanning
  // ============================================================================

  private runSecurityStage(effect: EffectExpression): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Too many operations
    if (effect.operations.length > MAX_OPERATIONS_SECURITY) {
      issues.push({
        severity: 'error',
        stage: 'security',
        message: `Too many operations: ${effect.operations.length} (max ${MAX_OPERATIONS_SECURITY})`,
        field: 'operations',
      });
      return issues; // Early return - can't safely process further
    }

    for (let i = 0; i < effect.operations.length; i++) {
      const op = effect.operations[i]!;
      const opIssues = this.scanOperationSecurity(op, i);
      issues.push(...opIssues);
    }

    return issues;
  }

  private scanOperationSecurity(op: EffectOperation, index: number): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    switch (op.op) {
      case 'deal_damage': {
        const amount = op.amount;
        if (this.containsDangerousPattern(amount)) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Operation at index ${index} contains dangerous pattern in "amount"`,
            field: `operations[${index}].amount`,
          });
        } else if (typeof amount === 'number' && amount > MAX_DAMAGE_AMOUNT) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Damage amount too high: ${amount} (max ${MAX_DAMAGE_AMOUNT})`,
            field: `operations[${index}].amount`,
          });
        } else if (typeof amount === 'object' && amount !== null) {
          const depthIssue = this.checkExpressionDepth(amount as ExpressionNode, 0);
          if (depthIssue) {
            issues.push({
              severity: 'error',
              stage: 'security',
              message: `Expression nesting too deep in operation at index ${index}`,
              field: `operations[${index}].amount`,
            });
          }
        }
        break;
      }
      case 'modify_stat': {
        if (this.isDangerousIdentifier(op.stat)) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Stat name "${op.stat}" contains dangerous pattern`,
            field: `operations[${index}].stat`,
          });
        } else if (!this.isValidIdentifier(op.stat)) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Stat name "${op.stat}" must be a valid identifier (letters, numbers, underscores only)`,
            field: `operations[${index}].stat`,
          });
        }
        break;
      }
      case 'spawn_entity': {
        if (this.isDangerousIdentifier(op.entityType)) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Entity type "${op.entityType}" contains dangerous pattern`,
            field: `operations[${index}].entityType`,
          });
        }
        if (op.count > MAX_SPAWN_COUNT) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Spawn count too high: ${op.count} (max ${MAX_SPAWN_COUNT})`,
            field: `operations[${index}].count`,
          });
        }
        if (op.count < 0) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Spawn count cannot be negative: ${op.count}`,
            field: `operations[${index}].count`,
          });
        }
        break;
      }
    }

    return issues;
  }

  private isDangerousIdentifier(value: string): boolean {
    return DANGEROUS_PATTERNS.some((p) => value.includes(p));
  }

  private isValidIdentifier(value: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value);
  }

  private containsDangerousPattern(value: unknown): boolean {
    if (typeof value === 'string') {
      return DANGEROUS_PATTERNS.some((p) => value.includes(p));
    }
    return false;
  }

  private checkExpressionDepth(node: ExpressionNode, depth: number): boolean {
    if (depth > MAX_EXPRESSION_DEPTH) return true;
    if (typeof node !== 'object' || node === null) return false;
    const exprNode = node as { op?: string; left?: ExpressionNode; right?: ExpressionNode };
    if (exprNode.left && this.checkExpressionDepth(exprNode.left, depth + 1)) return true;
    if (exprNode.right && this.checkExpressionDepth(exprNode.right, depth + 1)) return true;
    return false;
  }

  // ============================================================================
  // Stage 3: Interpreter Validation
  // ============================================================================

  private runInterpreterStage(effect: EffectExpression): ValidationIssue[] {
    const interpreterIssues = this.interpreter.interpret(effect);
    return interpreterIssues.map((issue) => ({
      severity: 'error' as const,
      stage: 'interpreter' as const,
      message: issue.message,
    }));
  }

  // ============================================================================
  // Stage 4: Semantic Validation (warnings only)
  // ============================================================================

  private runSemanticStage(effect: EffectExpression): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Warn when effect has no name
    if (!effect.name || effect.name.trim() === '') {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: 'Effect should have a descriptive name for readability',
        field: 'name',
      });
    }

    // Warn when description is short or missing
    if (!effect.description || effect.description.length < MIN_DESCRIPTION_LENGTH) {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: 'Effect should have a meaningful description (at least 10 characters)',
        field: 'description',
      });
    }

    // Warn when using spawn with single target
    const hasSpawn = effect.operations.some((op) => op.op === 'spawn_entity');
    if (hasSpawn && effect.target.type === 'single') {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: 'Effect has area operations (spawn_entity) but targets a single entity',
        field: 'target',
      });
    }

    // Warn when targeting self with damage
    const hasDamage = effect.operations.some((op) => op.op === 'deal_damage');
    if (hasDamage && effect.target.type === 'self') {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: 'Effect targets self but deals damage - this will hurt the caster',
        field: 'target',
      });
    }

    // Warn when effect both damages and heals
    const hasHeal = effect.operations.some((op) => op.op === 'heal');
    if (hasDamage && hasHeal) {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: 'Effect both damages and heals - consider separating into distinct effects',
        field: 'operations',
      });
    }

    // Warn when effect has too many operations (semantic limit lower than security)
    if (effect.operations.length > MAX_OPERATIONS_SEMANTIC_WARN) {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: `Effect has many operations (${effect.operations.length}) - consider splitting into multiple effects`,
        field: 'operations',
      });
    }

    return issues;
  }
}
