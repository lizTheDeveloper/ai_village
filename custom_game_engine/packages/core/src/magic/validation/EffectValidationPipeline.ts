import type {
  EffectExpression,
  EffectOperation,
  TargetSelector,
  Expression,
  BinaryOp,
  UnaryOp,
  FunctionName,
  DamageType,
} from '../EffectExpression.js';
import { EffectInterpreter, type EffectContext, type InterpreterOptions } from '../EffectInterpreter.js';
import type { Entity, World } from '@ai-village/core';

export interface ValidationIssue {
  severity: 'error' | 'warning';
  stage: 'schema' | 'security' | 'interpreter' | 'semantic';
  message: string;
  field?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stage?: string; // Stage where validation failed
}

/**
 * EffectValidationPipeline - Multi-stage validation for LLM-generated effects
 *
 * Validation stages:
 * 1. Schema: Verify structure and types match EffectExpression schema
 * 2. Security: Detect dangerous patterns, validate identifiers, check bounds
 * 3. Interpreter: Execute in sandbox with mock entities to catch runtime errors
 * 4. Semantic: Validate targeting coherence and operation logic
 *
 * Design:
 * - Defense in depth: Multiple layers prevent bypasses
 * - Fail fast: Early rejection saves computation
 * - Clear errors: Detailed messages for debugging
 */
export class EffectValidationPipeline {
  constructor(private interpreter: EffectInterpreter) {}

  /**
   * Run all validation stages.
   * Short-circuits on first error encountered.
   */
  validate(effect: EffectExpression): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Stage 1: Schema validation
    const schemaIssues = this.validateSchema(effect);
    issues.push(...schemaIssues);

    const schemaErrors = schemaIssues.filter((i) => i.severity === 'error');
    if (schemaErrors.length > 0) {
      return {
        valid: false,
        issues,
        stage: 'schema',
      };
    }

    // Stage 2: Security scanning
    const securityIssues = this.scanSecurity(effect);
    issues.push(...securityIssues);

    const securityErrors = securityIssues.filter((i) => i.severity === 'error');
    if (securityErrors.length > 0) {
      return {
        valid: false,
        issues,
        stage: 'security',
      };
    }

    // Stage 3: Interpreter dry run
    const interpreterIssues = this.validateWithInterpreter(effect);
    issues.push(...interpreterIssues);

    const interpreterErrors = interpreterIssues.filter((i) => i.severity === 'error');
    if (interpreterErrors.length > 0) {
      return {
        valid: false,
        issues,
        stage: 'interpreter',
      };
    }

    // Stage 4: Semantic validation
    const semanticIssues = this.validateSemantics(effect);
    issues.push(...semanticIssues);

    const semanticErrors = semanticIssues.filter((i) => i.severity === 'error');
    if (semanticErrors.length > 0) {
      return {
        valid: false,
        issues,
        stage: 'semantic',
      };
    }

    // All stages passed
    return {
      valid: true,
      issues, // May still have warnings
    };
  }

  /**
   * Stage 1: Schema validation
   * Checks:
   * - Required fields exist (target, operations, timing)
   * - Types are correct
   * - Enums are valid
   * - No unknown fields
   */
  private validateSchema(effect: EffectExpression): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check required fields
    if (!effect.target) {
      issues.push({
        severity: 'error',
        stage: 'schema',
        message: 'Missing required field: target',
        field: 'target',
      });
    }

    if (!effect.operations) {
      issues.push({
        severity: 'error',
        stage: 'schema',
        message: 'Missing required field: operations',
        field: 'operations',
      });
    }

    if (!effect.timing) {
      issues.push({
        severity: 'error',
        stage: 'schema',
        message: 'Missing required field: timing',
        field: 'timing',
      });
    }

    // Validate operations array
    if (effect.operations && !Array.isArray(effect.operations)) {
      issues.push({
        severity: 'error',
        stage: 'schema',
        message: 'Field "operations" must be an array',
        field: 'operations',
      });
    } else if (effect.operations && effect.operations.length === 0) {
      issues.push({
        severity: 'error',
        stage: 'schema',
        message: 'Field "operations" must contain at least one operation',
        field: 'operations',
      });
    }

    // Validate target schema
    if (effect.target) {
      const targetIssues = this.validateTargetSelector(effect.target);
      issues.push(...targetIssues);
    }

    // Validate timing schema
    if (effect.timing) {
      const timingIssues = this.validateTiming(effect.timing);
      issues.push(...timingIssues);
    }

    // Validate each operation
    if (effect.operations && Array.isArray(effect.operations)) {
      effect.operations.forEach((op, index) => {
        const opIssues = this.validateOperation(op, index);
        issues.push(...opIssues);
      });
    }

    return issues;
  }

  private validateTargetSelector(target: TargetSelector): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate target type
    const validTargetTypes = ['self', 'single', 'area', 'cone', 'line', 'all'];
    if (!validTargetTypes.includes(target.type)) {
      issues.push({
        severity: 'error',
        stage: 'schema',
        message: `Invalid target type: "${target.type}". Must be one of: ${validTargetTypes.join(', ')}`,
        field: 'target.type',
      });
    }

    // Validate radius for area/cone targeting
    if ((target.type === 'area' || target.type === 'cone') && target.radius === undefined) {
      issues.push({
        severity: 'warning',
        stage: 'schema',
        message: `Target type "${target.type}" should specify a radius`,
        field: 'target.radius',
      });
    }

    // Validate angle for cone targeting
    if (target.type === 'cone' && target.angle === undefined) {
      issues.push({
        severity: 'warning',
        stage: 'schema',
        message: 'Target type "cone" should specify an angle',
        field: 'target.angle',
      });
    }

    // Validate length for line targeting
    if (target.type === 'line' && target.length === undefined) {
      issues.push({
        severity: 'warning',
        stage: 'schema',
        message: 'Target type "line" should specify a length',
        field: 'target.length',
      });
    }

    return issues;
  }

  private validateTiming(timing: any): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Validate timing type
    const validTimingTypes = ['immediate', 'delayed', 'periodic'];
    if (!validTimingTypes.includes(timing.type)) {
      issues.push({
        severity: 'error',
        stage: 'schema',
        message: `Invalid timing type: "${timing.type}". Must be one of: ${validTimingTypes.join(', ')}`,
        field: 'timing.type',
      });
    }

    // Validate delay for delayed timing
    if (timing.type === 'delayed' && typeof timing.delay !== 'number') {
      issues.push({
        severity: 'error',
        stage: 'schema',
        message: 'Timing type "delayed" requires a numeric delay field',
        field: 'timing.delay',
      });
    }

    // Validate interval for periodic timing
    if (timing.type === 'periodic' && typeof timing.interval !== 'number') {
      issues.push({
        severity: 'error',
        stage: 'schema',
        message: 'Timing type "periodic" requires a numeric interval field',
        field: 'timing.interval',
      });
    }

    return issues;
  }

  private validateOperation(op: EffectOperation, index: number): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check that operation has 'op' field (should always be present given the type)
    if (!('op' in op)) {
      issues.push({
        severity: 'error',
        stage: 'schema',
        message: `Operation at index ${index} is missing "op" field`,
        field: `operations[${index}].op`,
      });
      return issues;
    }

    const opType = op.op;

    // Validate operation-specific fields
    switch (opType) {
      case 'modify_stat':
      case 'set_stat':
        if (!('stat' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "${opType}" requires "stat" field`,
            field: `operations[${index}].stat`,
          });
        }
        if (opType === 'modify_stat' && !('amount' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "modify_stat" requires "amount" field`,
            field: `operations[${index}].amount`,
          });
        }
        if (opType === 'set_stat' && !('value' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "set_stat" requires "value" field`,
            field: `operations[${index}].value`,
          });
        }
        break;

      case 'apply_status':
      case 'remove_status':
        if (!('status' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "${opType}" requires "status" field`,
            field: `operations[${index}].status`,
          });
        }
        if (opType === 'apply_status' && !('duration' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "apply_status" requires "duration" field`,
            field: `operations[${index}].duration`,
          });
        }
        break;

      case 'deal_damage':
        if (!('damageType' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "deal_damage" requires "damageType" field`,
            field: `operations[${index}].damageType`,
          });
        }
        if (!('amount' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "deal_damage" requires "amount" field`,
            field: `operations[${index}].amount`,
          });
        }
        // Validate damage type enum
        if ('damageType' in op && op.op === 'deal_damage') {
          const validDamageTypes: DamageType[] = [
            'physical', 'fire', 'ice', 'lightning', 'poison',
            'holy', 'unholy', 'void', 'psychic', 'force',
          ];
          if (!validDamageTypes.includes(op.damageType)) {
            issues.push({
              severity: 'error',
              stage: 'schema',
              message: `Invalid damage type: "${op.damageType}". Must be one of: ${validDamageTypes.join(', ')}`,
              field: `operations[${index}].damageType`,
            });
          }
        }
        break;

      case 'heal':
        if (!('amount' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "heal" requires "amount" field`,
            field: `operations[${index}].amount`,
          });
        }
        break;

      case 'spawn_entity':
        if (!('entityType' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "spawn_entity" requires "entityType" field`,
            field: `operations[${index}].entityType`,
          });
        }
        if (!('count' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "spawn_entity" requires "count" field`,
            field: `operations[${index}].count`,
          });
        }
        break;

      case 'conditional':
        if (!('condition' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "conditional" requires "condition" field`,
            field: `operations[${index}].condition`,
          });
        }
        if (!('then' in op)) {
          issues.push({
            severity: 'error',
            stage: 'schema',
            message: `Operation "conditional" requires "then" field`,
            field: `operations[${index}].then`,
          });
        }
        break;

      default:
        // Unknown operation type
        issues.push({
          severity: 'warning',
          stage: 'schema',
          message: `Unknown operation type: "${opType}"`,
          field: `operations[${index}].op`,
        });
    }

    return issues;
  }

  /**
   * Stage 2: Security scanning
   * Checks:
   * - Dangerous patterns (prototype pollution, eval, etc.)
   * - Identifier safety (valid variable names)
   * - Bounds checks (damage, spawns, operations)
   * - Depth limits (nesting)
   */
  private scanSecurity(effect: EffectExpression): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check operation count
    if (effect.operations.length > 100) {
      issues.push({
        severity: 'error',
        stage: 'security',
        message: `Too many operations: ${effect.operations.length} (max 100)`,
        field: 'operations',
      });
    }

    // Scan all operations for security issues
    effect.operations.forEach((op, index) => {
      const opIssues = this.scanOperationSecurity(op, index);
      issues.push(...opIssues);
    });

    // Scan all expressions in the effect
    const expressionIssues = this.scanExpressions(effect);
    issues.push(...expressionIssues);

    return issues;
  }

  private scanOperationSecurity(op: EffectOperation, index: number): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Helper to extract string from field
    const extractString = (obj: Record<string, unknown>, key: string): string | null => {
      const val = obj[key];
      return typeof val === 'string' ? val : null;
    };

    // Helper to extract number from field
    const extractNumber = (obj: Record<string, unknown>, key: string): number | null => {
      const val = obj[key];
      return typeof val === 'number' ? val : null;
    };

    const opRecord = op as Record<string, unknown>;

    // Check stat names for dangerous patterns
    if ('stat' in op) {
      const stat = extractString(opRecord, 'stat');
      if (stat !== null) {
        if (!this.isValidIdentifier(stat)) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Invalid stat name: "${stat}" must be a valid identifier`,
            field: `operations[${index}].stat`,
          });
        }
        if (this.hasDangerousPattern(stat)) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Stat name "${stat}" contains dangerous pattern`,
            field: `operations[${index}].stat`,
          });
        }
      }
    }

    // Check status names
    if ('status' in op) {
      const status = extractString(opRecord, 'status');
      if (status !== null) {
        if (!this.isValidIdentifier(status)) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Invalid status name: "${status}" must be a valid identifier`,
            field: `operations[${index}].status`,
          });
        }
        if (this.hasDangerousPattern(status)) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Status name "${status}" contains dangerous pattern`,
            field: `operations[${index}].status`,
          });
        }
      }
    }

    // Check damage amounts
    if ('amount' in op) {
      const amount = extractNumber(opRecord, 'amount');
      if (amount !== null) {
        if (amount > 10000) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Damage amount too high: ${amount} (max 10000)`,
            field: `operations[${index}].amount`,
          });
        }
        if (amount < -10000) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Damage amount too low: ${amount} (min -10000)`,
            field: `operations[${index}].amount`,
          });
        }
      }
    }

    // Check spawn counts
    if ('count' in op) {
      const count = extractNumber(opRecord, 'count');
      if (count !== null) {
        if (count > 100) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Spawn count too high: ${count} (max 100)`,
            field: `operations[${index}].count`,
          });
        }
        if (count < 0) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Spawn count cannot be negative: ${count}`,
            field: `operations[${index}].count`,
          });
        }
      }
    }

    // Check entity types
    if ('entityType' in op) {
      const entityType = extractString(opRecord, 'entityType');
      if (entityType !== null) {
        if (!this.isValidIdentifier(entityType)) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Invalid entity type: "${entityType}" must be a valid identifier`,
            field: `operations[${index}].entityType`,
          });
        }
        if (this.hasDangerousPattern(entityType)) {
          issues.push({
            severity: 'error',
            stage: 'security',
            message: `Entity type "${entityType}" contains dangerous pattern`,
            field: `operations[${index}].entityType`,
          });
        }
      }
    }

    // Check area radius
    if ('radius' in op) {
      const radius = extractNumber(opRecord, 'radius');
      if (radius !== null && radius > 1000) {
        issues.push({
          severity: 'error',
          stage: 'security',
          message: `Radius too large: ${radius} (max 1000)`,
          field: `operations[${index}].radius`,
        });
      }
    }

    return issues;
  }

  private scanExpressions(effect: EffectExpression): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Scan operations for expressions
    effect.operations.forEach((op, index) => {
      if ('amount' in op && op.amount !== undefined) {
        const exprIssues = this.scanExpression(op.amount, `operations[${index}].amount`);
        issues.push(...exprIssues);
      }
      if ('value' in op && op.value !== undefined) {
        const exprIssues = this.scanExpression(op.value, `operations[${index}].value`);
        issues.push(...exprIssues);
      }
      if ('count' in op && op.count !== undefined) {
        const exprIssues = this.scanExpression(op.count, `operations[${index}].count`);
        issues.push(...exprIssues);
      }
    });

    return issues;
  }

  private scanExpression(expr: Expression, path: string, depth: number = 0): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check nesting depth
    if (depth > 10) {
      issues.push({
        severity: 'error',
        stage: 'security',
        message: `Expression nesting too deep: ${depth} levels (max 10)`,
        field: path,
      });
      return issues;
    }

    // String expressions (variable references)
    if (typeof expr === 'string') {
      // Check for dangerous patterns
      if (this.hasDangerousPattern(expr)) {
        issues.push({
          severity: 'error',
          stage: 'security',
          message: `Expression "${expr}" contains dangerous pattern`,
          field: path,
        });
      }
    }

    // Binary expressions
    if (typeof expr === 'object' && expr !== null && 'op' in expr && 'left' in expr && 'right' in expr) {
      const leftIssues = this.scanExpression(expr.left, `${path}.left`, depth + 1);
      const rightIssues = this.scanExpression(expr.right, `${path}.right`, depth + 1);
      issues.push(...leftIssues, ...rightIssues);
    }

    // Function expressions
    if (typeof expr === 'object' && expr !== null && 'fn' in expr && 'args' in expr && Array.isArray(expr.args)) {
      expr.args.forEach((arg, index: number) => {
        const argIssues = this.scanExpression(arg, `${path}.args[${index}]`, depth + 1);
        issues.push(...argIssues);
      });
    }

    // Unary expressions
    if (typeof expr === 'object' && expr !== null && 'op' in expr && 'operand' in expr && !('left' in expr) && !('right' in expr)) {
      const operandIssues = this.scanExpression(expr.operand, `${path}.operand`, depth + 1);
      issues.push(...operandIssues);
    }

    return issues;
  }

  private isValidIdentifier(name: string): boolean {
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
  }

  private hasDangerousPattern(str: string): boolean {
    const dangerousPatterns = [
      '__proto__',
      'constructor',
      'prototype',
      '../',
      '<script>',
      '${',
      'process.',
      'require(',
      'import(',
      'eval(',
      'Function(',
    ];

    return dangerousPatterns.some((pattern) => str.includes(pattern));
  }

  /**
   * Stage 3: Interpreter dry run
   * Execute effect with mock entities to catch runtime errors
   */
  private validateWithInterpreter(effect: EffectExpression): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    try {
      // Create mock world and entities
      const mockWorld = this.createMockWorld();
      const mockCaster = this.createMockEntity(mockWorld, 'caster');
      const mockTarget = this.createMockEntity(mockWorld, 'target');

      // Create context
      const context: EffectContext = {
        caster: mockCaster,
        target: mockTarget,
        world: mockWorld,
        tick: 0,
      };

      // Execute effect
      const result = this.interpreter.execute(effect, context);

      // Check for execution errors
      if (!result.success && result.error) {
        issues.push({
          severity: 'error',
          stage: 'interpreter',
          message: `Effect execution failed: ${result.error}`,
        });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      issues.push({
        severity: 'error',
        stage: 'interpreter',
        message: `Effect execution threw exception: ${errorMessage}`,
      });
    }

    return issues;
  }

  private createMockWorld(): World {
    // Create a minimal mock world for testing
    const entities: Map<string, Entity> = new Map();

    const mockWorld = {
      entities,
      createEntity: () => {
        const entity = this.createMockEntity(mockWorld as any, `entity_${entities.size}`);
        entities.set(entity.id, entity);
        return entity;
      },
      getEntity: (id: string) => entities.get(id),
      addComponent: (entityId: string, component: any) => {
        const entity = entities.get(entityId);
        if (entity) {
          (entity.components as Map<string, any>).set(component.type, component);
        }
      },
      query: () => ({
        with: () => ({
          executeEntities: () => Array.from(entities.values()),
        }),
      }),
    } as any;

    return mockWorld;
  }

  private createMockEntity(world: World, id: string): Entity {
    const components = new Map<string, any>();

    const entity = {
      id,
      components,
      hasComponent: (type: string) => components.has(type),
      getComponent: (type: string) => components.get(type),
      addComponent: (comp: any) => {
        components.set(comp.type, comp);
      },
      removeComponent: (type: string) => {
        components.delete(type);
      },
    } as any;

    // Add default components
    entity.addComponent({
      type: 'position',
      x: 100,
      y: 100,
    });

    entity.addComponent({
      type: 'needs',
      health: 100,
      maxHealth: 100,
      mana: 50,
      maxMana: 50,
    });

    entity.addComponent({
      type: 'identity',
      name: id,
      faction: 'test',
    });

    return entity;
  }

  /**
   * Stage 4: Semantic validation
   * Checks:
   * - Targeting makes sense for operations
   * - Operations work together coherently
   * - Effect has clear purpose
   */
  private validateSemantics(effect: EffectExpression): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if effect has a name (good practice)
    if (!effect.name || effect.name.trim().length === 0) {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: 'Effect should have a descriptive name',
        field: 'name',
      });
    }

    // Check if effect has a description
    if (!effect.description || effect.description.trim().length < 10) {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: 'Effect should have a meaningful description (at least 10 characters)',
        field: 'description',
      });
    }

    // Check targeting coherence
    const targetingIssues = this.validateTargetingCoherence(effect);
    issues.push(...targetingIssues);

    // Check operation coherence
    const operationIssues = this.validateOperationCoherence(effect);
    issues.push(...operationIssues);

    return issues;
  }

  private validateTargetingCoherence(effect: EffectExpression): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check if area operations are used with single target
    const hasAreaOps = effect.operations.some((op) =>
      ['spawn_entity', 'spawn_item', 'emit_event'].includes((op as any).op)
    );
    const hasSingleTargetOps = effect.operations.some((op) =>
      ['deal_damage', 'heal', 'apply_status', 'modify_stat'].includes((op as any).op)
    );

    if (hasAreaOps && effect.target.type === 'single') {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: 'Effect uses area operations (spawn, emit) but targets a single entity',
        field: 'target',
      });
    }

    if (hasSingleTargetOps && effect.target.type === 'all') {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: 'Effect uses single-target operations but targets all entities',
        field: 'target',
      });
    }

    // Check if self-targeting makes sense
    if (effect.target.type === 'self') {
      const hasDamageOps = effect.operations.some((op) => (op as any).op === 'deal_damage');
      if (hasDamageOps) {
        issues.push({
          severity: 'warning',
          stage: 'semantic',
          message: 'Effect targets self but deals damage (may be intentional)',
          field: 'target',
        });
      }
    }

    return issues;
  }

  private validateOperationCoherence(effect: EffectExpression): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Check for conflicting operations
    const hasDamage = effect.operations.some((op) => (op as any).op === 'deal_damage');
    const hasHeal = effect.operations.some((op) => (op as any).op === 'heal');

    if (hasDamage && hasHeal) {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: 'Effect both damages and heals (may be intentional but unusual)',
      });
    }

    // Check for very simple effects (single trivial operation)
    if (effect.operations.length === 1) {
      const singleOp = effect.operations[0];
      if ((singleOp as any).op === 'emit_event') {
        issues.push({
          severity: 'warning',
          stage: 'semantic',
          message: 'Effect only emits an event with no other operations (may be too simple)',
        });
      }
    }

    // Check for overly complex effects
    if (effect.operations.length > 20) {
      issues.push({
        severity: 'warning',
        stage: 'semantic',
        message: `Effect has many operations (${effect.operations.length}). Consider splitting into multiple effects.`,
      });
    }

    return issues;
  }
}
