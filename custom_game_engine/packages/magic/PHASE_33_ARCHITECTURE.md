# Phase 33: Safe LLM Effect Generation - Architecture

**Status:** Design Phase
**Dependencies:** Phase 32 (EffectInterpreter)
**Goal:** Enable LLMs to generate custom spell effects safely with multi-layer validation and divine blessing.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Specifications](#component-specifications)
4. [Data Flow](#data-flow)
5. [Integration Points](#integration-points)
6. [Security Model](#security-model)
7. [Error Handling](#error-handling)
8. [Conservation of Game Matter](#conservation-of-game-matter)
9. [Implementation Checklist](#implementation-checklist)

---

## Overview

Phase 33 enables LLMs to generate custom `EffectExpression` JSON from natural language descriptions. The system uses multiple validation layers to ensure safety:

1. **LLM Generation** - Converts natural language to EffectExpression JSON
2. **Syntax Validation** - Verifies JSON structure and schema compliance
3. **Interpreter Validation** - Tests execution in sandbox environment
4. **Quality Evaluation** - Assesses safety, balance, completeness, and creativity
5. **Divine Blessing** - Approval/rejection with Conservation of Game Matter preservation

**Key Principles:**
- Multiple validation layers (defense in depth)
- Fail-safe defaults (reject on uncertainty)
- Preserve rejected effects per Conservation of Game Matter
- Service-oriented architecture (reusable components)
- Integration with existing SpellRegistry and PendingApprovalRegistry

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     SPELL DISCOVERY FLOW                         │
└─────────────────────────────────────────────────────────────────┘

Agent Experimenting
      │
      ▼
┌─────────────────────┐
│EffectGeneration     │ ◄─── LLMProvider
│Service              │
│                     │
│ Input:              │
│ - Natural language  │
│ - Paradigm context  │
│ - Agent stats       │
│                     │
│ Output:             │
│ - EffectExpression  │
│   JSON              │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│EffectValidation     │
│Pipeline             │
│                     │
│ 1. Schema check     │
│ 2. Security scan    │
│ 3. Interpreter dry  │
│    run              │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│EffectEvaluation     │ ◄─── EffectInterpreter (sandbox)
│Service              │
│                     │
│ Scores:             │
│ - Safety (0-1)      │
│ - Balance (0-1)     │
│ - Completeness(0-1) │
│ - Creativity (0-1)  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│EffectBlessing       │
│Service              │
│                     │
│ Decision:           │
│ - Approve           │
│ - Reject            │
│ - Reason            │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐   ┌─────────────┐
│Spell    │   │Rejected     │
│Registry │   │Artifact     │
│         │   │System       │
│Approved │   │             │
│spells   │   │Preserved    │
│         │   │rejections   │
└─────────┘   └─────────────┘
                    │
                    ▼
              ┌─────────────┐
              │Corruption   │
              │Realms       │
              │             │
              │- Forbidden  │
              │  Library    │
              │- Limbo      │
              │- Void       │
              └─────────────┘
```

---

## Component Specifications

### 1. EffectGenerationService

**Location:** `packages/magic/src/generation/EffectGenerationService.ts`

**Purpose:** Calls LLM to generate `EffectExpression` JSON from natural language.

**Interface:**
```typescript
export interface EffectGenerationRequest {
  /** Natural language description of desired effect */
  description: string;

  /** Magic paradigm context (affects generation style) */
  paradigmId?: string;

  /** Caster's stats (for context-aware generation) */
  casterStats?: {
    intelligence: number;
    level: number;
    primarySource: MagicSourceId;
  };

  /** Technique hint (create, destroy, etc.) */
  technique?: MagicTechnique;

  /** Form hint (fire, water, etc.) */
  form?: MagicForm;

  /** Target number of operations (complexity hint) */
  targetComplexity?: 'simple' | 'moderate' | 'complex';

  /** Example effects to learn from (few-shot learning) */
  examples?: EffectExpression[];
}

export interface EffectGenerationResult {
  /** Generated effect (may be invalid) */
  effect: EffectExpression;

  /** Raw LLM response text */
  rawResponse: string;

  /** LLM provider used */
  provider: string;

  /** Tokens used */
  tokensUsed: number;

  /** Generation timestamp */
  generatedAt: number;
}

export class EffectGenerationService {
  constructor(private llmProvider: LLMProvider) {}

  /**
   * Generate effect from natural language.
   * Throws on LLM errors (network, timeout, etc.)
   * Returns result even if effect is invalid (validation happens next)
   */
  async generate(request: EffectGenerationRequest): Promise<EffectGenerationResult>;

  /**
   * Build the LLM prompt for effect generation.
   * Uses few-shot examples and paradigm context.
   */
  private buildPrompt(request: EffectGenerationRequest): string;

  /**
   * Parse LLM response into EffectExpression.
   * Handles various response formats (JSON block, markdown, plain text)
   */
  private parseResponse(response: string): EffectExpression;
}
```

**Prompt Structure:**
```typescript
const EFFECT_GENERATION_PROMPT = `
You are a magic effect designer. Generate an EffectExpression in JSON format.

EffectExpression is a safe, declarative format for spell effects. It uses:
- Targeting: self, single, area, cone, line
- Operations: modify_stat, deal_damage, heal, apply_status, spawn_entity, etc.
- Expressions: Math operations, variable references (caster.intelligence)
- Timing: immediate, delayed, periodic

EXAMPLES:
${fewShotExamples}

PARADIGM CONTEXT:
${paradigmContext}

USER REQUEST:
"${description}"

CONSTRAINTS:
- Maximum 10 operations
- Damage cap: 500
- Spawn cap: 10 entities
- No recursive effects
- Use valid stat/status/entity names

RESPOND WITH ONLY JSON:
{
  "name": "...",
  "description": "...",
  "target": { ... },
  "operations": [ ... ],
  "timing": { ... }
}
`;
```

**Few-Shot Examples:** Use 3-5 example effects for each paradigm to guide generation style.

---

### 2. EffectValidationPipeline

**Location:** `packages/magic/src/validation/EffectValidationPipeline.ts`

**Purpose:** Multi-stage validation before evaluation.

**Interface:**
```typescript
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  stage: 'schema' | 'security' | 'interpreter' | 'passed';
}

export interface ValidationError {
  stage: string;
  code: string;
  message: string;
  severity: 'critical' | 'error';
}

export interface ValidationWarning {
  stage: string;
  code: string;
  message: string;
  suggestion?: string;
}

export class EffectValidationPipeline {
  constructor(private interpreter: EffectInterpreter) {}

  /**
   * Run all validation stages.
   * Short-circuits on critical errors.
   */
  validate(effect: EffectExpression): ValidationResult;

  /**
   * Stage 1: Schema validation
   * Checks JSON structure matches EffectExpression schema
   */
  private validateSchema(effect: EffectExpression): ValidationError[];

  /**
   * Stage 2: Security scan
   * Detects dangerous patterns:
   * - Prototype pollution attempts
   * - Excessive complexity
   * - Invalid identifiers
   * - Out-of-range values
   */
  private validateSecurity(effect: EffectExpression): ValidationError[];

  /**
   * Stage 3: Interpreter dry run
   * Execute in sandbox with mock entities
   * Catches runtime errors before evaluation
   */
  private validateInterpreter(effect: EffectExpression): ValidationError[];
}
```

**Validation Stages:**

1. **Schema Validation:**
   - Verify all required fields present
   - Check types match schema (TargetSelector, EffectOperation[], etc.)
   - Validate enums (DamageType, BinaryOp, etc.)

2. **Security Scan:**
   - Dangerous patterns: `__proto__`, `constructor`, `eval`, `Function`
   - Identifier safety: Must match `/^[a-zA-Z_][a-zA-Z0-9_]*$/`
   - Bounds checks: Damage < 10000, spawns < 100, operations < 100
   - Depth limits: No nesting > 10 levels

3. **Interpreter Dry Run:**
   - Create mock World, caster, target
   - Execute effect with EffectInterpreter
   - Catch any runtime exceptions
   - Verify result structure

**Example Validation Errors:**
```typescript
{
  stage: 'security',
  code: 'DANGEROUS_IDENTIFIER',
  message: 'Stat name "__proto__" contains dangerous pattern',
  severity: 'critical'
}

{
  stage: 'interpreter',
  code: 'EXECUTION_ERROR',
  message: 'Effect execution threw: Invalid stat name "foobar"',
  severity: 'error'
}
```

---

### 3. EffectEvaluationService

**Location:** `packages/magic/src/evaluation/EffectEvaluationService.ts`

**Purpose:** Assess quality of validated effects.

**Interface:**
```typescript
export interface EvaluationScores {
  /** Safety: Low damage, no exploits (0-1) */
  safety: number;

  /** Balance: Appropriate power level (0-1) */
  balance: number;

  /** Completeness: Well-formed, sensible (0-1) */
  completeness: number;

  /** Creativity: Novel, interesting (0-1) */
  creativity: number;

  /** Overall score (weighted average) */
  overall: number;
}

export interface EvaluationReport {
  scores: EvaluationScores;
  issues: EvaluationIssue[];
  strengths: string[];
  recommendations: string[];
}

export interface EvaluationIssue {
  category: 'safety' | 'balance' | 'completeness' | 'creativity';
  severity: 'minor' | 'moderate' | 'major';
  message: string;
}

export class EffectEvaluationService {
  constructor(
    private interpreter: EffectInterpreter,
    private spellRegistry: SpellRegistry
  ) {}

  /**
   * Evaluate effect quality.
   * Assumes effect has passed validation.
   */
  evaluate(effect: EffectExpression, paradigmId?: string): EvaluationReport;

  /**
   * Safety evaluation:
   * - Low damage/healing relative to mana cost
   * - No excessive spawning
   * - Reasonable area of effect
   */
  private evaluateSafety(effect: EffectExpression): number;

  /**
   * Balance evaluation:
   * - Compare to existing spells of similar type
   * - Check mana cost vs power ratio
   * - Assess risk/reward tradeoffs
   */
  private evaluateBalance(effect: EffectExpression): number;

  /**
   * Completeness evaluation:
   * - Effect has clear purpose
   * - Operations work together coherently
   * - Targeting makes sense for operations
   */
  private evaluateCompleteness(effect: EffectExpression): number;

  /**
   * Creativity evaluation:
   * - Novelty compared to existing spells
   * - Interesting operation combinations
   * - Unique mechanics
   */
  private evaluateCreativity(effect: EffectExpression): number;
}
```

**Scoring Algorithms:**

**Safety Score:**
```typescript
function evaluateSafety(effect: EffectExpression): number {
  let score = 1.0;

  // Simulate effect execution
  const result = interpreter.execute(effect, mockContext);

  // Penalize excessive damage
  if (result.damageDealt > 100) {
    score *= 0.5;
  }
  if (result.damageDealt > 500) {
    score *= 0.3; // Very dangerous
  }

  // Penalize excessive spawning
  if (result.entitiesSpawned > 5) {
    score *= 0.7;
  }
  if (result.entitiesSpawned > 20) {
    score *= 0.2; // Spawn spam
  }

  // Penalize large area effects
  if (effect.target.type === 'area' && effect.target.radius > 20) {
    score *= 0.8;
  }

  // Penalize chain effects (higher risk)
  if (result.chainCount > 3) {
    score *= 0.6;
  }

  return Math.max(0, Math.min(1, score));
}
```

**Balance Score:**
```typescript
function evaluateBalance(effect: EffectExpression): number {
  // Compare to existing spells with same technique/form
  const similarSpells = spellRegistry.getSpellsByTechnique(effect.technique);

  // Estimate power level
  const result = interpreter.execute(effect, mockContext);
  const powerScore =
    (result.damageDealt * 0.4) +
    (result.healingDone * 0.3) +
    (result.affectedEntities.length * 0.2) +
    (result.entitiesSpawned * 0.1);

  // Compare to similar spells
  const avgPower = calculateAveragePower(similarSpells);
  const ratio = powerScore / (avgPower || 50);

  // Balanced if within 50% of average
  if (ratio >= 0.5 && ratio <= 1.5) {
    return 1.0;
  } else if (ratio < 0.5) {
    return 0.7; // Underpowered
  } else {
    return Math.max(0, 1.0 - (ratio - 1.5) * 0.5); // Overpowered
  }
}
```

**Completeness Score:**
```typescript
function evaluateCompleteness(effect: EffectExpression): number {
  let score = 1.0;

  // Must have operations
  if (effect.operations.length === 0) {
    return 0;
  }

  // Name and description required
  if (!effect.name || effect.name.trim().length === 0) {
    score *= 0.5;
  }
  if (!effect.description || effect.description.trim().length < 10) {
    score *= 0.7;
  }

  // Targeting must match operations
  const hasAreaOps = effect.operations.some(op =>
    op.op === 'spawn_entity' || op.op === 'emit_event'
  );
  const hasSingleTargetOps = effect.operations.some(op =>
    op.op === 'deal_damage' || op.op === 'heal' || op.op === 'apply_status'
  );

  if (hasAreaOps && effect.target.type === 'single') {
    score *= 0.6; // Area operations with single target
  }
  if (hasSingleTargetOps && effect.target.type === 'all') {
    score *= 0.8; // Might be intentional but unusual
  }

  // Execute successfully
  try {
    const result = interpreter.execute(effect, mockContext);
    if (!result.success) {
      score *= 0.3;
    }
  } catch {
    return 0; // Failed execution = incomplete
  }

  return score;
}
```

**Creativity Score:**
```typescript
function evaluateCreativity(effect: EffectExpression): number {
  let score = 0.5; // Baseline

  // Check novelty vs existing spells
  const existingSpells = spellRegistry.getAllSpells();
  const nameSimilarity = Math.max(...existingSpells.map(s =>
    calculateStringSimilarity(effect.name, s.name)
  ));

  if (nameSimilarity < 0.3) {
    score += 0.2; // Unique name
  }

  // Reward operation diversity
  const uniqueOps = new Set(effect.operations.map(op => op.op));
  if (uniqueOps.size >= 3) {
    score += 0.2; // Multiple operation types
  }

  // Reward conditional/control flow
  const hasConditional = effect.operations.some(op => op.op === 'conditional');
  const hasChain = effect.operations.some(op => op.op === 'chain_effect');
  if (hasConditional || hasChain) {
    score += 0.1; // Complex logic
  }

  // Penalize generic patterns
  if (/^(greater|lesser|improved|mass)\s+/i.test(effect.name)) {
    score -= 0.2; // Generic naming
  }

  return Math.max(0, Math.min(1, score));
}
```

---

### 4. EffectBlessingService

**Location:** `packages/magic/src/blessing/EffectBlessingService.ts`

**Purpose:** Final approval/rejection decision using evaluation scores.

**Interface:**
```typescript
export interface BlessingDecision {
  approved: boolean;
  reason: string;
  scores: EvaluationScores;
  deity?: string;
  timestamp: number;
}

export interface BlessingConfig {
  /** Minimum safety score to approve (default: 0.6) */
  minSafety?: number;

  /** Minimum balance score to approve (default: 0.4) */
  minBalance?: number;

  /** Minimum completeness score to approve (default: 0.7) */
  minCompleteness?: number;

  /** Minimum overall score to approve (default: 0.6) */
  minOverall?: number;

  /** Deity entity ID for thematic rejection messages */
  deityId?: string;

  /** Auto-approve high-quality effects (overall > 0.9) */
  autoApproveExcellent?: boolean;
}

export class EffectBlessingService {
  constructor(
    private evaluationService: EffectEvaluationService,
    private config: BlessingConfig = {}
  ) {}

  /**
   * Make approval decision based on evaluation.
   */
  bless(effect: EffectExpression, paradigmId?: string): BlessingDecision;

  /**
   * Generate thematic rejection reason based on why it failed.
   */
  private generateRejectionReason(
    effect: EffectExpression,
    report: EvaluationReport
  ): string;
}
```

**Blessing Algorithm:**
```typescript
function bless(effect: EffectExpression, paradigmId?: string): BlessingDecision {
  const report = evaluationService.evaluate(effect, paradigmId);
  const scores = report.scores;

  // Apply thresholds
  const minSafety = config.minSafety ?? 0.6;
  const minBalance = config.minBalance ?? 0.4;
  const minCompleteness = config.minCompleteness ?? 0.7;
  const minOverall = config.minOverall ?? 0.6;

  // Auto-approve excellent effects
  if (config.autoApproveExcellent && scores.overall > 0.9) {
    return {
      approved: true,
      reason: 'Exceptional effect - divine blessing granted',
      scores,
      timestamp: Date.now(),
    };
  }

  // Check individual thresholds
  if (scores.safety < minSafety) {
    return {
      approved: false,
      reason: generateRejectionReason(effect, report, 'safety'),
      scores,
      timestamp: Date.now(),
    };
  }

  if (scores.completeness < minCompleteness) {
    return {
      approved: false,
      reason: generateRejectionReason(effect, report, 'completeness'),
      scores,
      timestamp: Date.now(),
    };
  }

  if (scores.balance < minBalance) {
    return {
      approved: false,
      reason: generateRejectionReason(effect, report, 'balance'),
      scores,
      timestamp: Date.now(),
    };
  }

  if (scores.overall < minOverall) {
    return {
      approved: false,
      reason: generateRejectionReason(effect, report, 'overall'),
      scores,
      timestamp: Date.now(),
    };
  }

  // Approved!
  return {
    approved: true,
    reason: 'Effect meets divine standards',
    scores,
    timestamp: Date.now(),
  };
}
```

**Thematic Rejection Messages:**
```typescript
function generateRejectionReason(
  effect: EffectExpression,
  report: EvaluationReport,
  failedCategory: string
): string {
  const deity = config.deityId ? getDeityName(config.deityId) : 'The Arcane Magisters';

  const messages = {
    safety: [
      `${deity} deems this magic too dangerous for mortal hands`,
      `The potential for harm outweighs the benefit - rejected by ${deity}`,
      `This effect could devastate the realm - ${deity} forbids it`,
    ],
    balance: [
      `${deity} finds this magic too powerful or too weak`,
      `The balance of magic must be preserved - ${deity} denies your request`,
      `This effect disrupts the natural order - rejected`,
    ],
    completeness: [
      `${deity} sees flaws in your understanding of this magic`,
      `The effect is incomplete or poorly formed - study more`,
      `This magic lacks coherence - ${deity} demands better craftsmanship`,
    ],
    overall: [
      `${deity} finds this effect unworthy of the arcane tradition`,
      `Your discovery does not meet the standards of ${deity}`,
      `This magic is mediocre - ${deity} expects excellence`,
    ],
  };

  const categoryMessages = messages[failedCategory];
  const baseMessage = categoryMessages[Math.floor(Math.random() * categoryMessages.length)];

  // Add specific issue if available
  const mainIssue = report.issues.find(i => i.severity === 'major');
  if (mainIssue) {
    return `${baseMessage}\n\nSpecific concern: ${mainIssue.message}`;
  }

  return baseMessage;
}
```

---

### 5. RejectedArtifactSystem

**Location:** `packages/magic/src/artifacts/RejectedArtifactSystem.ts`

**Purpose:** Preserve rejected effects per Conservation of Game Matter principle.

**Interface:**
```typescript
export interface RejectedEffectArtifact {
  id: string;
  effect: EffectExpression;

  /** Why it was rejected */
  rejectionReason: string;

  /** Evaluation scores */
  scores: EvaluationScores;

  /** Who created it */
  creatorId: string;
  creatorName: string;

  /** When it was rejected */
  rejectedAt: number;

  /** Rejection category */
  rejectionCategory: RejectionCategory;

  /** Danger level (1-10) */
  dangerLevel: number;

  /** Where it's banished to */
  banishedTo: CorruptionRealm;

  /** Can it be recovered? */
  recoverable: boolean;

  /** Requirements to recover */
  recoveryRequirements?: string[];
}

export type RejectionCategory =
  | 'too_powerful'
  | 'too_dangerous'
  | 'incomplete'
  | 'incoherent'
  | 'unbalanced'
  | 'forbidden_knowledge';

export type CorruptionRealm =
  | 'forbidden_library'  // Overpowered spells
  | 'limbo'              // Incomplete/minor issues
  | 'void'               // Dangerous/corrupted magic
  | 'rejected_realm';    // Generic rejected spells

export class RejectedArtifactSystem {
  private artifacts: Map<string, RejectedEffectArtifact> = new Map();

  /**
   * Preserve a rejected effect.
   * Never delete - always store for potential recovery.
   */
  preserveRejectedEffect(
    effect: EffectExpression,
    decision: BlessingDecision,
    creatorId: string,
    creatorName: string
  ): RejectedEffectArtifact;

  /**
   * Get all rejected artifacts.
   */
  getAllRejected(): RejectedEffectArtifact[];

  /**
   * Get rejected artifacts by creator.
   */
  getByCreator(creatorId: string): RejectedEffectArtifact[];

  /**
   * Get rejected artifacts by realm.
   */
  getByRealm(realm: CorruptionRealm): RejectedEffectArtifact[];

  /**
   * Attempt to recover a rejected effect.
   * Requires special items/quests.
   */
  attemptRecovery(
    artifactId: string,
    recoveryItems: string[]
  ): { success: boolean; effect?: EffectExpression };
}
```

**Rejection Categorization:**
```typescript
function categorizeRejection(
  decision: BlessingDecision
): { category: RejectionCategory; realm: CorruptionRealm; danger: number } {
  const scores = decision.scores;

  // Too powerful
  if (scores.balance < 0.3 && scores.safety < 0.5) {
    return {
      category: 'too_powerful',
      realm: 'forbidden_library',
      danger: 9,
    };
  }

  // Too dangerous
  if (scores.safety < 0.4) {
    return {
      category: 'too_dangerous',
      realm: 'void',
      danger: 8,
    };
  }

  // Incomplete
  if (scores.completeness < 0.5) {
    return {
      category: 'incomplete',
      realm: 'limbo',
      danger: 3,
    };
  }

  // Incoherent
  if (scores.completeness < 0.7 && scores.creativity < 0.3) {
    return {
      category: 'incoherent',
      realm: 'limbo',
      danger: 2,
    };
  }

  // Unbalanced
  if (scores.balance < 0.5) {
    return {
      category: 'unbalanced',
      realm: 'rejected_realm',
      danger: 5,
    };
  }

  // Generic rejection
  return {
    category: 'forbidden_knowledge',
    realm: 'rejected_realm',
    danger: 4,
  };
}
```

**Recovery Mechanics:**
```typescript
const RECOVERY_REQUIREMENTS: Record<CorruptionRealm, string[]> = {
  forbidden_library: [
    'shard_of_forbidden_knowledge',
    'decree_of_the_magisters',
  ],
  limbo: [
    'minor_restoration_scroll',
  ],
  void: [
    'void_anchor',
    'shard_of_reality',
    'blessing_of_supreme_creator',
  ],
  rejected_realm: [
    'petition_to_the_arcane_council',
  ],
};
```

---

### 6. Integration Layer

**Location:** `packages/magic/src/integration/EffectDiscoveryIntegration.ts`

**Purpose:** Connect generation pipeline to SpellRegistry and PendingApprovalRegistry.

**Interface:**
```typescript
export interface EffectDiscoveryRequest {
  /** Agent performing discovery */
  agentId: string;
  agentName: string;

  /** Natural language description */
  description: string;

  /** Magic paradigm */
  paradigmId: string;

  /** Technique/form hints */
  technique?: MagicTechnique;
  form?: MagicForm;

  /** Reagents used (for thematic connection) */
  reagents?: Array<{ itemId: string; quantity: number }>;

  /** Current game tick */
  tick: number;
}

export interface EffectDiscoveryResult {
  /** Discovery type */
  type: 'approved' | 'rejected' | 'queued_for_player';

  /** Generated effect */
  effect: EffectExpression;

  /** Spell definition (if approved) */
  spell?: SpellDefinition;

  /** Rejection artifact (if rejected) */
  rejectedArtifact?: RejectedEffectArtifact;

  /** Pending approval ID (if queued) */
  pendingId?: string;

  /** Blessing decision */
  decision: BlessingDecision;

  /** Validation result */
  validation: ValidationResult;
}

export class EffectDiscoveryIntegration {
  constructor(
    private generationService: EffectGenerationService,
    private validationPipeline: EffectValidationPipeline,
    private evaluationService: EffectEvaluationService,
    private blessingService: EffectBlessingService,
    private rejectedArtifactSystem: RejectedArtifactSystem,
    private spellRegistry: SpellRegistry,
    private pendingApprovalRegistry: PendingApprovalRegistry
  ) {}

  /**
   * Full pipeline: Generation -> Validation -> Evaluation -> Blessing -> Registry
   */
  async discoverEffect(request: EffectDiscoveryRequest): Promise<EffectDiscoveryResult>;

  /**
   * Convert EffectExpression to SpellDefinition for registry.
   */
  private createSpellDefinition(
    effect: EffectExpression,
    paradigmId: string,
    creatorId: string
  ): SpellDefinition;
}
```

**Full Pipeline Flow:**
```typescript
async function discoverEffect(request: EffectDiscoveryRequest): Promise<EffectDiscoveryResult> {
  // Step 1: Generate effect from LLM
  const generation = await generationService.generate({
    description: request.description,
    paradigmId: request.paradigmId,
    technique: request.technique,
    form: request.form,
  });

  const effect = generation.effect;

  // Step 2: Validate
  const validation = validationPipeline.validate(effect);
  if (!validation.valid) {
    // Validation failed - reject immediately
    const decision: BlessingDecision = {
      approved: false,
      reason: `Validation failed: ${validation.errors[0].message}`,
      scores: { safety: 0, balance: 0, completeness: 0, creativity: 0, overall: 0 },
      timestamp: Date.now(),
    };

    const artifact = rejectedArtifactSystem.preserveRejectedEffect(
      effect,
      decision,
      request.agentId,
      request.agentName
    );

    return {
      type: 'rejected',
      effect,
      rejectedArtifact: artifact,
      decision,
      validation,
    };
  }

  // Step 3: Blessing decision
  const decision = blessingService.bless(effect, request.paradigmId);

  if (!decision.approved) {
    // Rejected by blessing service
    const artifact = rejectedArtifactSystem.preserveRejectedEffect(
      effect,
      decision,
      request.agentId,
      request.agentName
    );

    return {
      type: 'rejected',
      effect,
      rejectedArtifact: artifact,
      decision,
      validation,
    };
  }

  // Step 4: Check if player approval needed
  // (If creator is god or AI deity auto-approves, skip this)
  const needsPlayerApproval = !pendingApprovalRegistry.isGod(request.agentId);

  if (needsPlayerApproval) {
    // Queue for player approval
    const spell = createSpellDefinition(effect, request.paradigmId, request.agentId);

    const pending = pendingApprovalRegistry.queueEffect(
      spell,
      request.paradigmId,
      'new_spell',
      request.agentId,
      request.agentName,
      request.description,
      decision.scores.creativity,
      request.reagents || [],
      request.tick
    );

    return {
      type: 'queued_for_player',
      effect,
      spell,
      pendingId: pending.id,
      decision,
      validation,
    };
  }

  // Step 5: Auto-approved - register spell
  const spell = createSpellDefinition(effect, request.paradigmId, request.agentId);
  spellRegistry.register(spell);

  return {
    type: 'approved',
    effect,
    spell,
    decision,
    validation,
  };
}
```

---

## Data Flow

```
1. Agent Experiments
   └─> "I want a spell that creates fire and pushes enemies away"

2. EffectGenerationService
   └─> LLMProvider.generate(prompt)
   └─> Parse JSON response
   └─> EffectExpression { operations: [create fire, push, ...] }

3. EffectValidationPipeline
   └─> validateSchema() ✓
   └─> validateSecurity() ✓
   └─> validateInterpreter() ✓
   └─> ValidationResult { valid: true }

4. EffectEvaluationService
   └─> evaluateSafety() → 0.8
   └─> evaluateBalance() → 0.7
   └─> evaluateCompleteness() → 0.9
   └─> evaluateCreativity() → 0.6
   └─> EvaluationReport { overall: 0.75 }

5. EffectBlessingService
   └─> Check thresholds
   └─> overall: 0.75 >= 0.6 ✓
   └─> safety: 0.8 >= 0.6 ✓
   └─> BlessingDecision { approved: true }

6a. If Approved:
    └─> SpellRegistry.register(spell)
    └─> Agent learns spell

6b. If Rejected:
    └─> RejectedArtifactSystem.preserveRejectedEffect()
    └─> Create entity with rejected_artifact component
    └─> Banish to appropriate realm (forbidden_library/limbo/void)
    └─> Agent receives rejection message
```

---

## Integration Points

### With Existing Systems

1. **LLMProvider (packages/llm)**
   - Use existing `LLMProvider` interface
   - Reuse `LLMScheduler` for request queuing
   - Support multiple providers (Ollama, Groq, OpenAI, MLX)

2. **SpellRegistry (packages/magic)**
   - Register approved spells
   - Query existing spells for novelty checks
   - Track player proficiency

3. **PendingApprovalRegistry (packages/core/crafting)**
   - Queue effects for player approval
   - Handle approval/rejection callbacks
   - Support AI deity auto-approval

4. **EffectInterpreter (packages/magic)**
   - Validation dry runs
   - Evaluation simulations
   - Actual spell execution

5. **Conservation of Game Matter**
   - Never delete rejected effects
   - Create `rejected_artifact` component
   - Banish to corruption realms
   - Enable recovery quests

### New Component Types

**RejectedArtifactComponent:**
```typescript
export interface RejectedArtifactComponent extends Component {
  type: 'rejected_artifact';

  /** Artifact type */
  artifactType: 'spell' | 'recipe' | 'technology';

  /** Rejection reason */
  rejectionReason: string;

  /** Who rejected it */
  rejectedBy: string; // 'god_of_wisdom', 'arcane_magisters', etc.

  /** Where it's banished */
  banishedTo: CorruptionRealm;

  /** Can it be recovered */
  retrievable: boolean;

  /** Danger level (1-10) */
  dangerLevel: number;

  /** Recovery requirements */
  recoveryRequirements: string[];

  /** Original data (EffectExpression JSON) */
  originalData: any;
}
```

**CorruptedEffectComponent:**
```typescript
export interface CorruptedEffectComponent extends Component {
  type: 'corrupted_effect';

  /** Original effect (may be invalid) */
  effect: EffectExpression;

  /** Corruption reason */
  corruptionReason: string;

  /** Validation errors */
  validationErrors: ValidationError[];

  /** Can it be fixed? */
  recoverable: boolean;

  /** Corruption timestamp */
  corruptedAt: number;
}
```

---

## Security Model

### Defense in Depth

1. **LLM Prompt Security**
   - Avoid injection attacks
   - Constrain output format (JSON only)
   - Provide clear examples
   - Limit creativity (temperature 0.7)

2. **Schema Validation**
   - TypeScript type checking
   - JSON schema validation
   - Required field enforcement

3. **Security Scanning**
   - Pattern detection (dangerous strings)
   - Identifier validation (no `__proto__`, etc.)
   - Bounds checking (limits on damage, spawns, etc.)

4. **Interpreter Sandboxing**
   - EffectInterpreter has hard limits:
     - Max operations: 1000
     - Max depth: 10
     - Max entities affected: 100
     - Max damage: 10000
     - Max spawns: 50
     - Max chain depth: 5
   - No eval/Function constructor
   - No prototype pollution
   - Type-safe operations only

5. **Evaluation Thresholds**
   - Safety score >= 0.6
   - Completeness score >= 0.7
   - Balance score >= 0.4
   - Overall score >= 0.6

6. **Divine Blessing**
   - Final human/AI approval
   - Thematic rejection messages
   - Rejection preservation

### Attack Surface

**Potential exploits:**
- LLM prompt injection → Mitigated by JSON-only output, schema validation
- Excessive resource consumption → Mitigated by interpreter limits
- Overpowered spells → Mitigated by balance evaluation
- Prototype pollution → Mitigated by identifier validation
- Infinite loops → Mitigated by operation/depth limits

**Trust boundaries:**
- LLM output: UNTRUSTED (validate everything)
- EffectInterpreter: TRUSTED (enforces limits)
- Schema validation: TRUSTED (catches malformed data)
- Blessing service: TRUSTED (final gatekeeper)

---

## Error Handling

### Error Categories

1. **LLM Errors**
   - Network timeout
   - Provider unavailable
   - Invalid API key
   - Rate limit exceeded

   **Handling:** Propagate to caller, log error, notify agent of failure

2. **Validation Errors**
   - Schema mismatch
   - Security violations
   - Interpreter exceptions

   **Handling:** Create CorruptedEffectComponent, preserve for debugging

3. **Evaluation Errors**
   - Unexpected simulation results
   - Missing comparison data

   **Handling:** Use conservative defaults, flag for manual review

4. **Blessing Errors**
   - Configuration missing
   - Threshold not met

   **Handling:** Reject with clear reason, preserve artifact

### Error Recovery

**Automatic retries:**
- LLM network errors: Retry 3 times with exponential backoff
- Transient validation errors: None (fail fast)

**Manual recovery:**
- Rejected artifacts: Player/deity can review and approve
- Corrupted effects: Data fixer scripts can repair

**Logging:**
```typescript
interface EffectGenerationLog {
  agentId: string;
  timestamp: number;
  description: string;
  result: 'success' | 'validation_failed' | 'rejected' | 'llm_error';
  effect?: EffectExpression;
  error?: string;
  decision?: BlessingDecision;
}
```

---

## Conservation of Game Matter

### Never Delete, Always Preserve

**Rejected effects are preserved as:**

1. **Entities with Components:**
   ```typescript
   const rejectedEntity = world.createEntity();
   rejectedEntity.addComponent<RejectedArtifactComponent>({
     type: 'rejected_artifact',
     artifactType: 'spell',
     rejectionReason: decision.reason,
     rejectedBy: 'goddess_of_wisdom',
     banishedTo: 'forbidden_library',
     retrievable: true,
     dangerLevel: 8,
     recoveryRequirements: ['shard_of_forbidden_knowledge'],
     originalData: effect,
   });

   rejectedEntity.addComponent<PositionComponent>({
     type: 'position',
     x: FORBIDDEN_LIBRARY_X,
     y: FORBIDDEN_LIBRARY_Y,
   });
   ```

2. **Save/Load Integration:**
   - Rejected artifacts are entities → saved automatically
   - Persist across sessions
   - Survive world resets

3. **Recovery Mechanics:**
   ```typescript
   // Quest: Recover forbidden spell
   async function recoverForbiddenSpell(
     player: Entity,
     artifactId: string
   ): Promise<boolean> {
     const artifact = world.getEntity(artifactId);
     if (!artifact) return false;

     const rejectedComp = artifact.getComponent<RejectedArtifactComponent>('rejected_artifact');
     if (!rejectedComp) return false;

     // Check requirements
     const inventory = player.getComponent<InventoryComponent>('inventory');
     const hasRequirements = rejectedComp.recoveryRequirements.every(reqItem =>
       inventory.items.some(i => i.itemId === reqItem)
     );

     if (!hasRequirements) {
       return false;
     }

     // Consume recovery items
     for (const reqItem of rejectedComp.recoveryRequirements) {
       inventory.removeItem(reqItem, 1);
     }

     // Recover spell
     const effect = rejectedComp.originalData as EffectExpression;
     const spell = createSpellDefinition(effect, 'academic', player.id);
     spellRegistry.register(spell);

     // Remove artifact (it's been recovered, not deleted)
     artifact.removeComponent('rejected_artifact');
     artifact.addComponent<RecoveredArtifactComponent>({
       type: 'recovered_artifact',
       recoveredBy: player.id,
       recoveredAt: Date.now(),
     });

     return true;
   }
   ```

### Corruption Realms

**Special locations where rejected content exists:**

- **Forbidden Library:** Overpowered spells (danger 8-10)
  - Guarded by arcane constructs
  - Requires high-level quests to access
  - Contains game-breaking magic

- **Limbo:** Incomplete/minor issues (danger 1-4)
  - Easy to access
  - Low-quality but safe discoveries
  - Good for novice mages

- **Void:** Dangerous/corrupted magic (danger 7-9)
  - Reality is unstable here
  - Requires protection spells
  - High risk, high reward

- **Rejected Realm:** Generic rejections (danger 4-6)
  - Abandoned creations
  - Mediocre but functional
  - Can be salvaged with effort

---

## Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create `EffectGenerationService.ts`
  - [ ] LLM prompt builder
  - [ ] Response parser
  - [ ] Few-shot example loader
- [ ] Create `EffectValidationPipeline.ts`
  - [ ] Schema validator
  - [ ] Security scanner
  - [ ] Interpreter dry run
- [ ] Write tests for generation + validation

### Phase 2: Evaluation System
- [ ] Create `EffectEvaluationService.ts`
  - [ ] Safety scoring
  - [ ] Balance scoring
  - [ ] Completeness scoring
  - [ ] Creativity scoring
- [ ] Create mock spells for comparison
- [ ] Write tests for evaluation

### Phase 3: Blessing & Rejection
- [ ] Create `EffectBlessingService.ts`
  - [ ] Threshold checking
  - [ ] Thematic message generation
- [ ] Create `RejectedArtifactSystem.ts`
  - [ ] Artifact preservation
  - [ ] Realm assignment
  - [ ] Recovery mechanics
- [ ] Define component types
- [ ] Write tests for blessing

### Phase 4: Integration
- [ ] Create `EffectDiscoveryIntegration.ts`
  - [ ] Full pipeline orchestration
  - [ ] SpellRegistry integration
  - [ ] PendingApprovalRegistry integration
- [ ] Create corruption realm locations
- [ ] Add recovery quests
- [ ] Write integration tests

### Phase 5: Polish & Documentation
- [ ] Add logging and metrics
- [ ] Create example effects
- [ ] Write user-facing documentation
- [ ] Performance testing
- [ ] Security audit

---

## Key Design Decisions

1. **Why multi-stage validation?**
   - Defense in depth: No single layer can be bypassed
   - Each stage catches different error types
   - Early rejection saves computation

2. **Why separate Evaluation and Blessing?**
   - Evaluation is objective (scores)
   - Blessing is policy (thresholds, deity personality)
   - Allows different blessing configs for different paradigms/deities

3. **Why preserve rejected effects?**
   - Conservation of Game Matter (core principle)
   - Creates gameplay opportunities (recovery quests)
   - Debugging aid (see what LLM generated)
   - No data loss (player effort is preserved)

4. **Why not use LLM for validation?**
   - Too slow (multiple LLM calls)
   - Less reliable (LLM could hallucinate "valid")
   - More expensive (tokens)
   - Deterministic validation is safer

5. **Why reuse PendingApprovalRegistry?**
   - Already handles player approval flow
   - Supports AI deity auto-approval
   - Consistent with recipe/technology discovery
   - Less code duplication

---

## Future Enhancements

1. **LLM-Assisted Evaluation**
   - Use LLM to explain balance issues
   - Generate improvement suggestions
   - Thematic flavor text

2. **Effect Mutation System**
   - Modify rejected effects to fix issues
   - "Almost approved" → suggest tweaks
   - Player/agent can iterate

3. **Paradigm-Specific Generation**
   - Different prompts per paradigm
   - Paradigm-specific validation rules
   - Cultural/thematic constraints

4. **Collaborative Discovery**
   - Multiple agents contribute to spell
   - Combine partial discoveries
   - Social spell research

5. **Meta-Learning**
   - Track rejection patterns
   - Improve LLM prompts over time
   - Learn what players approve

---

## References

- **Phase 32:** EffectInterpreter (bytecode execution)
- **Phase 31:** EffectExpression schema
- **PendingApprovalRegistry:** Recipe/technology approval flow
- **Conservation of Game Matter:** CLAUDE.md principle
- **LLMProvider:** packages/llm/src/LLMProvider.ts
- **SpellRegistry:** packages/magic/src/SpellRegistry.ts
