# Spell Validation System

Multi-stage validation pipeline for LLM-generated spell effects. Prevents malformed, dangerous, or semantically invalid spells from executing.

## Overview

**Purpose**: Validate `EffectExpression` objects before execution to catch errors early and prevent security vulnerabilities.

**Defense-in-depth**: Four validation stages run sequentially, failing fast on first error.

## Validation Stages

### 1. Schema Validation
Verifies structure matches `EffectExpression` type:
- Required fields exist (`target`, `operations`, `timing`)
- Types are correct (arrays, strings, numbers)
- Enums are valid (target types, damage types, timing types)
- Operation-specific fields present (e.g., `deal_damage` requires `damageType` and `amount`)

### 2. Security Scanning
Detects injection attacks and dangerous patterns:
- **Prototype pollution**: Rejects `__proto__`, `constructor`, `prototype`
- **Code injection**: Blocks `eval(`, `Function(`, `require(`, `import(`
- **Identifier safety**: Validates stat/status names match `/^[a-zA-Z_][a-zA-Z0-9_]*$/`
- **Bounds checks**: Damage ≤10000, spawn count ≤100, operations ≤100
- **Depth limits**: Expression nesting ≤10 levels

### 3. Interpreter Dry Run
Executes effect with mock entities to catch runtime errors:
- Creates mock `World`, `caster`, and `target` entities
- Runs `EffectInterpreter.execute()` in sandbox
- Catches invalid stat names, missing components, malformed expressions
- Returns interpreter error messages

### 4. Semantic Validation
Checks logical coherence (warnings only):
- Effect has name and description (≥10 chars)
- Targeting matches operations (e.g., area ops with area target)
- Self-targeting with damage warns (intentional self-harm spells valid)
- Conflicting operations (damage + heal) warn
- Too many operations (>20) suggests splitting

## Usage

```typescript
import { EffectValidationPipeline } from './validation/EffectValidationPipeline.js';
import { EffectInterpreter } from './EffectInterpreter.js';

const interpreter = new EffectInterpreter();
const pipeline = new EffectValidationPipeline(interpreter);

const result = pipeline.validate(effectExpression);

if (!result.valid) {
  console.error(`Validation failed at stage: ${result.stage}`);
  result.issues.forEach(issue => {
    console.error(`[${issue.severity}] ${issue.message} (${issue.field})`);
  });
}
```

## Validation Result

```typescript
interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  stage?: string; // Stage where validation failed (schema, security, interpreter, semantic)
}

interface ValidationIssue {
  severity: 'error' | 'warning';
  stage: 'schema' | 'security' | 'interpreter' | 'semantic';
  message: string;
  field?: string; // JSON path (e.g., 'operations[0].stat')
}
```

## Error Handling

**Errors**: Block execution. Effect cannot run.
- Schema violations
- Security threats
- Runtime failures in interpreter

**Warnings**: Allow execution but flag concerns.
- Missing name/description
- Targeting mismatches
- Unusual operation combinations

**Short-circuit**: Validation stops at first error stage. Security scans only run if schema passes.

## Design Principles

**Fail fast**: Early rejection saves computation.
**Clear errors**: Detailed messages with field paths for debugging.
**Defense in depth**: Multiple layers prevent bypasses (LLM outputs both malformed JSON and injection attempts).
**Sandbox testing**: Interpreter dry run catches runtime errors before production execution.
