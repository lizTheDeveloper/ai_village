# LLM Budget Management - Specification

**Created:** 2026-01-03
**Status:** Draft
**Version:** 0.1.0

---

## Overview

The LLM Budget Management system provides real-time cost tracking, budget controls, and cost projections for language model usage in the game. Players can set spending limits, monitor actual costs across different providers, and receive estimates of hourly/daily costs based on current agent configurations and measured usage patterns.

---

## Dependencies

- `agent-system/spec.md` - Agent tiers, LLM configuration
- `ui-system/player-settings.md` - Settings panel integration
- `packages/llm/src/LLMProvider.ts` - Provider cost reporting
- `packages/core/src/systems/MetricsCollectionSystem.ts` - Usage metrics

---

## Requirements

### REQ-BUDGET-001: Budget Configuration

The system SHALL provide budget configuration in the settings panel.

```typescript
interface BudgetConfig {
  // Budget limits
  dailyBudgetUSD: number;           // Daily spending limit ($)
  monthlyBudgetUSD: number;         // Monthly spending limit ($)
  budgetWarningThreshold: number;   // Warning at % of budget (0.0-1.0)

  // Budget state
  enabled: boolean;                  // Whether budget enforcement is active
  pauseOnBudgetExceeded: boolean;   // Auto-pause LLM when budget exceeded

  // Tracking
  currentDailySpendUSD: number;      // Actual spend today
  currentMonthlySpendUSD: number;    // Actual spend this month
  lastResetTime: number;             // Timestamp of last daily reset
}
```

**Settings Panel Integration:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ⚙️ SETTINGS                                                         [X]   │
├───────────────┬─────────────────────────────────────────────────────────────┤
│ CATEGORIES    │  LLM BUDGET & COST MANAGEMENT                               │
│               │  ─────────────────────────────────────────────────────────  │
│ ● Controls    │                                                             │
│ ○ Display     │  BUDGET LIMITS                                              │
│ ○ Audio       │  ┌─────────────────────────────────────────────────────┐   │
│ ○ Gameplay    │  │ ☑ Enable budget enforcement                         │   │
│ ○ LLM Budget  │  │ ☑ Auto-pause when budget exceeded                   │   │
│ ○ Notifications│  └─────────────────────────────────────────────────────┘   │
│               │                                                             │
│               │  Daily Budget (USD)                                         │
│               │  ┌──────────────────────────────────────────────────────┐  │
│               │  │ $0 ────────●──────────────────────────────── $100    │  │
│               │  │                $25.00                                │  │
│               │  └──────────────────────────────────────────────────────┘  │
│               │                                                             │
│               │  Monthly Budget (USD)                                       │
│               │  ┌──────────────────────────────────────────────────────┐  │
│               │  │ $0 ──────────────●────────────────────────── $500    │  │
│               │  │                    $200.00                           │  │
│               │  └──────────────────────────────────────────────────────┘  │
│               │                                                             │
│               │  Budget Warning Threshold                                   │
│               │  ┌──────────────────────────────────────────────────────┐  │
│               │  │ 0% ──────────────────●──────────────────────── 100%  │  │
│               │  │                       75%                            │  │
│               │  └──────────────────────────────────────────────────────┘  │
│               │                                                             │
│               │  CURRENT SPENDING                                           │
│               │  ─────────────────────────────────────────────────────────  │
│               │  Today:     $3.42 / $25.00   [████████░░░░░░░░░░] 13.7%    │
│               │  This Month: $47.89 / $200.00 [████░░░░░░░░░░░░░░] 23.9%    │
│               │                                                             │
│               │  COST ESTIMATES                                             │
│               │  ─────────────────────────────────────────────────────────  │
│               │  Projected Per Hour:    $0.52                               │
│               │  Projected Per Day:     $12.48  (based on 24h avg)          │
│               │  Projected Per Month:   $374.40 ⚠️ EXCEEDS BUDGET            │
│               │                                                             │
│               │  Days until daily budget: 21 hours 18 minutes               │
│               │  Days until monthly budget: 6 days 5 hours                  │
│               │                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**GIVEN** the player opens the settings panel
**WHEN** they navigate to "LLM Budget"
**THEN** the system SHALL display current budget limits, spending, and projections

---

### REQ-BUDGET-002: Cost Tracking Per Provider

The system SHALL track costs from different LLM providers with provider-specific pricing.

```typescript
interface ProviderCost {
  providerId: string;              // 'ollama', 'groq', 'openai', 'mlx'
  providerName: string;            // Display name

  // Pricing (per 1M tokens)
  inputCostPer1M: number;          // Cost for input tokens
  outputCostPer1M: number;         // Cost for output tokens

  // Usage tracking
  totalInputTokens: number;        // Lifetime input tokens
  totalOutputTokens: number;       // Lifetime output tokens
  totalCalls: number;              // Lifetime API calls

  // Cost tracking
  totalCostUSD: number;            // Lifetime cost
  todayCostUSD: number;            // Cost today
  thisMonthCostUSD: number;        // Cost this month

  // Timing
  firstCallTime: number;           // Timestamp of first call
  lastCallTime: number;            // Timestamp of last call
}

interface CostTracker {
  // Per-provider tracking
  providers: Map<string, ProviderCost>;

  // Aggregate stats
  totalCostUSD: number;
  totalCalls: number;

  // Methods
  recordCall(
    providerId: string,
    inputTokens: number,
    outputTokens: number,
    costUSD: number
  ): void;

  getProviderCost(providerId: string): ProviderCost | null;
  getDailyCost(): number;
  getMonthlyCost(): number;
  resetDaily(): void;
  resetMonthly(): void;
}
```

**Provider Pricing (as of 2026-01-03):**

| Provider | Input $/1M | Output $/1M | Notes |
|----------|-----------|-------------|--------|
| Groq     | $0.05     | $0.10       | llama-3.3-70b-versatile |
| OpenAI   | $3.00     | $15.00      | gpt-4 |
| Anthropic| $3.00     | $15.00      | claude-3-opus |
| MLX      | $0.00     | $0.00       | Local inference |
| Ollama   | $0.00     | $0.00       | Local inference |

**GIVEN** an LLM call completes with token counts
**WHEN** the provider reports usage
**THEN** the system SHALL calculate cost using provider-specific pricing and record it

---

### REQ-BUDGET-003: Real-Time Cost Estimation

The system SHALL provide real-time cost estimates based on measured usage patterns.

```typescript
interface CostEstimate {
  // Current rate (measured)
  callsPerMinute: number;           // Measured LLM call rate
  avgInputTokensPerCall: number;    // Average input tokens
  avgOutputTokensPerCall: number;   // Average output tokens
  avgCostPerCall: number;           // Average cost per call

  // Projections
  estimatedCostPerHour: number;     // Projected $/hour
  estimatedCostPerDay: number;      // Projected $/day (24h)
  estimatedCostPerMonth: number;    // Projected $/month (30d)

  // Time to budget limits
  hoursUntilDailyBudget: number | null;    // Hours until daily limit
  hoursUntilMonthlyBudget: number | null;  // Hours until monthly limit

  // Confidence
  measurementWindow: number;        // Seconds of data used
  sampleSize: number;               // Number of calls measured
  confidence: 'low' | 'medium' | 'high';  // Estimate confidence
}

interface CostEstimator {
  // Update with new call data
  recordCall(
    timestampMs: number,
    inputTokens: number,
    outputTokens: number,
    costUSD: number
  ): void;

  // Get current estimate
  getEstimate(): CostEstimate;

  // Configuration
  measurementWindowSec: number;     // Default: 3600 (1 hour)
  minSampleSize: number;            // Default: 10 calls
}
```

**Estimation Algorithm:**

1. **Rolling Window**: Track last N calls within measurement window (default 1 hour)
2. **Calculate Averages**:
   - Calls per minute = sample size / (window duration in minutes)
   - Avg input tokens = sum(input tokens) / sample size
   - Avg output tokens = sum(output tokens) / sample size
   - Avg cost per call = sum(costs) / sample size
3. **Project Forward**:
   - Cost/hour = calls/min × 60 × avg cost/call
   - Cost/day = cost/hour × 24
   - Cost/month = cost/day × 30
4. **Time to Budget**:
   - Hours until daily = (daily budget - today's spend) / cost/hour
   - Hours until monthly = (monthly budget - month's spend) / cost/hour

**Confidence Levels:**
- **Low**: < 10 calls in window
- **Medium**: 10-50 calls in window
- **High**: > 50 calls in window

**GIVEN** the system has collected at least 10 LLM calls
**WHEN** the player views budget estimates
**THEN** the system SHALL display cost projections with confidence level

---

### REQ-BUDGET-004: Budget Warning System

The system SHALL warn players when approaching or exceeding budget limits.

```typescript
type BudgetWarningLevel = 'none' | 'warning' | 'critical' | 'exceeded';

interface BudgetWarning {
  level: BudgetWarningLevel;
  message: string;
  percentUsed: number;              // 0.0 - 1.0+
  budgetType: 'daily' | 'monthly';

  // Actions
  actionRequired: boolean;          // True if auto-pause triggered
  canContinue: boolean;             // False if budget exceeded & enforcement enabled
}

interface BudgetMonitor {
  // Check budget status
  checkBudget(): BudgetWarning[];

  // Get current warning level
  getWarningLevel(): BudgetWarningLevel;

  // Check if LLM calls should be allowed
  canMakeLLMCall(): boolean;
}
```

**Warning Thresholds:**
- **None**: < warning threshold (default 75%)
- **Warning**: ≥ warning threshold, < 100%
- **Critical**: ≥ 100%, < 110%
- **Exceeded**: ≥ 110%

**Warning Display:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️  BUDGET WARNING                                      [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You have used 78% of your daily LLM budget ($19.50 / $25.00) │
│                                                                 │
│  Current rate: $0.52/hour                                       │
│  Estimated time until budget: 10 hours 36 minutes               │
│                                                                 │
│  Actions:                                                       │
│  ☐ Reduce agent count                                          │
│  ☐ Switch to "reduced" tier (less frequent LLM calls)          │
│  ☐ Switch to local provider (Ollama/MLX - free)                │
│  ☐ Increase daily budget                                       │
│                                                                 │
│  [Dismiss]  [View Budget Settings]  [Switch to Local Provider] │
└─────────────────────────────────────────────────────────────────┘
```

**Critical Warning (Budget Exceeded):**
```
┌─────────────────────────────────────────────────────────────────┐
│  🛑 BUDGET EXCEEDED - LLM Calls Paused                   [X]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Daily budget exceeded: $27.34 / $25.00 (109%)                  │
│                                                                 │
│  LLM decision-making has been automatically paused.             │
│  Agents will use scripted behaviors until reset.                │
│                                                                 │
│  Options:                                                       │
│  • Wait until daily budget resets (7 hours 23 minutes)         │
│  • Increase your daily budget                                  │
│  • Switch to free local provider (Ollama/MLX)                  │
│                                                                 │
│  [Increase Budget]  [Switch to Local]  [Keep Paused]           │
└─────────────────────────────────────────────────────────────────┘
```

**GIVEN** daily spending reaches the warning threshold
**WHEN** budget enforcement is enabled
**THEN** the system SHALL display a warning notification

**GIVEN** daily spending exceeds the budget
**WHEN** auto-pause is enabled
**THEN** the system SHALL pause LLM calls and display critical warning

---

### REQ-BUDGET-005: Provider Cost Comparison

The system SHALL display cost comparison across providers based on measured usage.

```typescript
interface ProviderComparison {
  currentProvider: string;
  currentCostPerHour: number;

  // Alternative providers with projected costs
  alternatives: Array<{
    providerId: string;
    providerName: string;
    projectedCostPerHour: number;
    savingsPerHour: number;           // Compared to current
    savingsPercentage: number;        // 0.0 - 1.0
    isAvailable: boolean;             // Can switch now
    requiresSetup: string | null;     // Setup instructions if needed
  }>;
}
```

**Comparison Display:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  PROVIDER COST COMPARISON                                                   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Current: Groq (llama-3.3-70b-versatile)                                    │
│  Cost: $0.52/hour                                                           │
│                                                                             │
│  Alternative Providers (based on your usage):                               │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ MLX (Local)                                    FREE      [Switch] ✅  │ │
│  │ • Requires: MLX server running on macOS                              │ │
│  │ • Savings: $0.52/hour (100%)                                         │ │
│  │ • Quality: Similar to Groq                                           │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ Ollama (Local)                                 FREE      [Switch] ✅  │ │
│  │ • Requires: Ollama installed with qwen3:4b model                     │ │
│  │ • Savings: $0.52/hour (100%)                                         │ │
│  │ • Quality: Good for most tasks                                       │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ OpenAI (gpt-4)                            $31.20/hour    [Setup] ⚙️   │ │
│  │ • Requires: OpenAI API key                                           │ │
│  │ • Cost increase: +$30.68/hour (+5900%)                               │ │
│  │ • Quality: Best for complex reasoning                                │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**GIVEN** the player views provider comparison
**WHEN** cost data is available
**THEN** the system SHALL show projected costs for each provider with current usage patterns

---

### REQ-BUDGET-006: Historical Cost Analytics

The system SHALL provide historical cost data and trends.

```typescript
interface CostHistory {
  // Time series data
  hourly: Array<{
    timestamp: number;
    costUSD: number;
    calls: number;
  }>;

  daily: Array<{
    date: string;              // YYYY-MM-DD
    costUSD: number;
    calls: number;
  }>;

  monthly: Array<{
    month: string;             // YYYY-MM
    costUSD: number;
    calls: number;
  }>;

  // Analytics
  getAverageDailyCost(days: number): number;
  getTrend(period: 'day' | 'week' | 'month'): 'increasing' | 'stable' | 'decreasing';
  getPeakHours(): number[];  // Hours with highest cost
}
```

**Historical View:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COST HISTORY (Last 30 Days)                                                │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Daily Cost Trend                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │ $20 ┤                                    ╭─╮                           │ │
│  │     │                          ╭────╮    │ │    ╭─╮                   │ │
│  │ $15 ┤               ╭──╮       │    │╭───╯ │    │ │                   │ │
│  │     │         ╭─────╯  │  ╭────╯    ││     ╰────╯ ╰──╮                │ │
│  │ $10 ┤    ╭────╯        ╰──╯         ╰╯                ╰───╮            │ │
│  │     │ ╭──╯                                                ╰──╮         │ │
│  │  $5 ┤─╯                                                      ╰────     │ │
│  │     └┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┬────┤   │ │
│  │      1    5    10   15   20   25   30 (days ago)                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│  Summary                                                                    │
│  • Average daily cost: $12.34                                               │
│  • Peak day: Dec 28 ($18.92)                                                │
│  • Lowest day: Dec 15 ($4.23)                                               │
│  • Trend: Stable ─                                                          │
│  • Total (30 days): $370.20                                                 │
│                                                                             │
│  Peak Usage Hours                                                           │
│  7pm-10pm (47% of daily cost)                                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**GIVEN** cost data has been collected for at least 24 hours
**WHEN** the player views cost history
**THEN** the system SHALL display daily cost trends and analytics

---

### REQ-BUDGET-007: Cost Per Agent Analysis

The system SHALL break down costs by individual agents.

```typescript
interface AgentCostBreakdown {
  agentId: string;
  agentName: string;
  tier: 'full' | 'reduced' | 'autonomic';

  // Usage
  totalCalls: number;
  todayCalls: number;
  avgCallsPerHour: number;

  // Cost
  totalCostUSD: number;
  todayCostUSD: number;
  avgCostPerCall: number;
  percentOfTotal: number;        // This agent's % of total cost

  // Efficiency
  avgInputTokens: number;
  avgOutputTokens: number;
  avgResponseTime: number;       // Seconds
}
```

**Agent Cost View:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  COST PER AGENT (Today)                                                     │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  Agent         Tier     Calls   Cost      % Total   Actions                │
│  ───────────── ──────── ─────── ───────── ───────── ─────────────────────  │
│  Cedar         Full     142     $1.89     55.2%     [Switch to Reduced]    │
│  Wren          Full     98      $1.31     38.3%     [Switch to Reduced]    │
│  Fern          Reduced  12      $0.16     4.7%      ─                       │
│  Linden        Autonomic 4      $0.05     1.5%      ─                       │
│  Kestrel       Autonomic 1      $0.01     0.3%      ─                       │
│                                                                             │
│  Total                  257     $3.42     100%                              │
│                                                                             │
│  💡 Tip: Switching Cedar and Wren to "Reduced" tier would save ~$2.50/day   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**GIVEN** agents have made LLM calls
**WHEN** the player views per-agent costs
**THEN** the system SHALL display cost breakdown and optimization suggestions

---

### REQ-BUDGET-008: Budget Persistence

The system SHALL persist budget configuration and cost data.

```typescript
interface BudgetPersistence {
  // Save to localStorage
  save(): void;

  // Load from localStorage
  load(): void;

  // Export to JSON
  export(): string;

  // Import from JSON
  import(data: string): void;

  // Reset (clear all data)
  reset(): void;
}

// Stored data structure
interface BudgetSaveData {
  version: string;               // Data format version
  lastSaved: number;             // Timestamp

  // Configuration
  config: BudgetConfig;

  // Historical data (last 90 days)
  costHistory: CostHistory;

  // Provider data
  providers: Map<string, ProviderCost>;

  // Per-agent data
  agents: Map<string, AgentCostBreakdown>;
}
```

**Persistence Behavior:**
- **Auto-save**: Every 5 minutes
- **Save on close**: Before window unload
- **Daily reset**: Reset daily counters at midnight local time
- **Monthly reset**: Reset monthly counters on 1st of month
- **Data retention**: Keep 90 days of historical data

**GIVEN** budget data exists
**WHEN** the page reloads
**THEN** the system SHALL restore budget config and cost history

---

## UI Components

### Component: BudgetSlider

```typescript
interface BudgetSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;              // '$', '%', etc.
  onChange: (value: number) => void;

  // Visual indicators
  currentSpend?: number;     // Show current vs limit
  warningThreshold?: number; // Yellow zone
}
```

**Visual Design:**
```
Daily Budget (USD)
┌──────────────────────────────────────────────────────┐
│ $0 ────────●──────────────────────────────── $100    │
│            ↑           ↑                              │
│         $25.00    Current: $3.42                      │
│            ├───────────┤                              │
│            │ Used: 13.7%                              │
└──────────────────────────────────────────────────────┘
```

---

### Component: CostEstimateDisplay

```typescript
interface CostEstimateProps {
  estimate: CostEstimate;
  budget: BudgetConfig;
  showDetails?: boolean;
}
```

**Visual Design:**
```
COST ESTIMATES
─────────────────────────────────────────────────────────
Projected Per Hour:    $0.52     ⓘ Based on last 1 hour
Projected Per Day:     $12.48    ⓘ 24-hour projection
Projected Per Month:   $374.40   ⚠️ EXCEEDS BUDGET

Time until limits:
  Daily budget:   21h 18m remaining
  Monthly budget: 6d 5h remaining

Confidence: High (142 calls measured)
```

---

### Component: ProviderComparisonCard

```typescript
interface ProviderComparisonProps {
  currentProvider: string;
  comparison: ProviderComparison;
  onSwitch: (providerId: string) => void;
}
```

**Visual Design:**
```
┌───────────────────────────────────────────────────────┐
│ MLX (Local)                      FREE    [Switch] ✅  │
│ • Requires: MLX server on macOS                       │
│ • Savings: $0.52/hour (100%)                          │
│ • Quality: Similar to Groq                            │
└───────────────────────────────────────────────────────┘
```

---

## Implementation Notes

### Cost Calculation

**Per-call cost formula:**
```
cost = (inputTokens / 1_000_000) * inputCostPer1M
     + (outputTokens / 1_000_000) * outputCostPer1M
```

**Projection formula:**
```
callsPerMinute = sampleSize / (windowDurationSec / 60)
costPerHour = callsPerMinute * 60 * avgCostPerCall
costPerDay = costPerHour * 24
costPerMonth = costPerDay * 30
```

### Daily/Monthly Reset

**Daily reset (midnight local time):**
1. Save yesterday's data to history
2. Reset `currentDailySpendUSD` to 0
3. Reset all provider `todayCostUSD` to 0
4. Reset all agent `todayCalls` and `todayCostUSD` to 0
5. Update `lastResetTime`

**Monthly reset (1st of month):**
1. Save last month's data to history
2. Reset `currentMonthlySpendUSD` to 0
3. Reset all provider `thisMonthCostUSD` to 0

### Provider Detection

**Auto-detect available providers:**
```typescript
async function detectProviders(): Promise<string[]> {
  const available: string[] = [];

  // Check MLX (macOS only)
  if (process.platform === 'darwin') {
    try {
      const res = await fetch('http://localhost:8080/v1/models');
      if (res.ok) available.push('mlx');
    } catch {}
  }

  // Check Ollama
  try {
    const res = await fetch('http://localhost:11434/api/tags');
    if (res.ok) available.push('ollama');
  } catch {}

  // Check Groq (if API key configured)
  if (process.env.GROQ_API_KEY) {
    available.push('groq');
  }

  // Check OpenAI (if API key configured)
  if (process.env.OPENAI_API_KEY) {
    available.push('openai');
  }

  return available;
}
```

---

## Testing Requirements

### Test Cases

**TC-BUDGET-001: Budget slider updates**
- GIVEN slider is at $25
- WHEN user drags to $50
- THEN budget updates to $50
- AND estimate updates based on new budget

**TC-BUDGET-002: Warning at threshold**
- GIVEN daily budget is $25
- AND warning threshold is 75%
- WHEN spending reaches $18.75
- THEN warning notification appears

**TC-BUDGET-003: Auto-pause on exceed**
- GIVEN daily budget is $25
- AND auto-pause is enabled
- WHEN spending reaches $25.01
- THEN LLM calls are paused
- AND critical notification appears

**TC-BUDGET-004: Cost estimation accuracy**
- GIVEN 50+ LLM calls in last hour
- WHEN viewing estimates
- THEN confidence level is "high"
- AND projections are within 10% of actual

**TC-BUDGET-005: Provider comparison**
- GIVEN using Groq at $0.50/hour
- WHEN viewing alternatives
- THEN MLX shows $0.00/hour (100% savings)
- AND Ollama shows $0.00/hour (100% savings)

**TC-BUDGET-006: Daily reset**
- GIVEN spending of $15 today
- WHEN clock reaches midnight
- THEN daily spend resets to $0
- AND yesterday's data saved to history

**TC-BUDGET-007: Persistence**
- GIVEN budget config set to $50/day
- AND $10 spent today
- WHEN page reloads
- THEN budget is still $50/day
- AND today's spend is still $10

---

## REQ-BUDGET-009: Intelligent Call Rate Allocation

The system SHALL dynamically allocate LLM calls across agents based on budget constraints.

```typescript
interface CallRateAllocation {
  // Budget constraints
  monthlyBudgetUSD: number;
  affordableCallsPerHour: number;      // Based on current cost/call
  remainingBudgetUSD: number;

  // Current allocation
  allocatedCallsPerHour: number;       // Actually distributed
  reserveCallsPerHour: number;         // Held back for critical moments

  // Per-tier allocation
  tierAllocations: Map<AgentTier, {
    agentCount: number;
    callsPerHourPerAgent: number;
    totalCallsPerHour: number;
  }>;

  // Model selection strategy
  modelStrategy: ModelSelectionStrategy;
}

interface ModelSelectionStrategy {
  defaultModel: string;                // Qwen for routine (cheap, good)
  premiumModel: string;                // GPT-4 for critical (expensive, best)
  premiumCallPercentage: number;       // % of budget for premium calls

  // Triggers for premium model usage
  premiumTriggers: Array<
    | 'player_interaction'             // Player is talking to agent
    | 'critical_conversation'          // Important social moment
    | 'key_decision'                   // Major choice (building, conflict)
    | 'creative_moment'                // Writing, art, innovation
    | 'complex_reasoning'              // Multi-step planning
  >;
}

interface AgentPriority {
  agentId: string;
  priorityScore: number;               // 0-100
  factors: {
    playerFavorite: boolean;           // Player marked as favorite
    conversationActive: boolean;       // Currently in conversation
    keyFigure: boolean;                // Leader, historian, etc.
    recentActivity: number;            // Recent important actions
  };
}
```

**Allocation Algorithm:**

1. **Calculate Affordable Rate**:
   ```
   costPerCall = currentCostEstimate
   affordableCallsPerHour = (remainingDailyBudget / hoursLeftToday) / costPerCall
   reserveCalls = affordableCallsPerHour * 0.2  // Hold 20% for critical moments
   allocatableCalls = affordableCallsPerHour * 0.8
   ```

2. **Distribute Across Tiers**:
   ```
   fullTierAgents = agents with tier='full'
   reducedTierAgents = agents with tier='reduced'
   autonomicTierAgents = agents with tier='autonomic'

   // Full tier gets 60% of budget
   fullTierCalls = allocatableCalls * 0.6
   callsPerFullAgent = fullTierCalls / fullTierAgents.length

   // Reduced tier gets 30% of budget
   reducedTierCalls = allocatableCalls * 0.3
   callsPerReducedAgent = reducedTierCalls / reducedTierAgents.length

   // Autonomic tier gets 10% of budget (on-demand only)
   autonomicTierCalls = allocatableCalls * 0.1
   ```

3. **Apply Priority Weighting**:
   ```
   for each agent:
     baseCalls = callsPerTierAgent[agent.tier]
     priorityMultiplier = agent.priorityScore / 50  // 0.0 - 2.0
     agent.allocatedCalls = baseCalls * priorityMultiplier
   ```

4. **Dynamic Adjustment**:
   ```
   if remainingBudget < 25% of monthlyBudget:
     // Budget running low - reduce thinking frequency
     for each fullTierAgent:
       downgrade to 'reduced' tier temporarily
     for each reducedTierAgent:
       extend periodicThinkSec from 30min to 60min
   ```

**GIVEN** daily budget is $25 and current cost is $0.50/call
**WHEN** system calculates call rate allocation
**THEN** affordable rate is ~50 calls/hour (assuming 1 hour left)
**AND** full tier agents get ~30 calls/hour distributed among them
**AND** reduced tier agents get ~15 calls/hour distributed
**AND** ~10 calls/hour reserved for critical premium model usage

---

## REQ-BUDGET-010: Model Selection Strategy

The system SHALL intelligently select LLM models based on budget and importance.

```typescript
interface ModelSelector {
  /**
   * Select model for a given agent decision.
   */
  selectModel(context: DecisionContext): ModelChoice;

  /**
   * Get model recommendations based on current budget.
   */
  getRecommendedModels(): ModelRecommendation[];
}

interface DecisionContext {
  agentId: string;
  agentTier: AgentTier;
  agentPriority: number;
  trigger: 'idle' | 'task_complete' | 'conversation' | 'player_interaction' | 'periodic';
  conversationImportance?: number;    // 0-100
  isCreativeTask?: boolean;
  requiresComplexReasoning?: boolean;
}

interface ModelChoice {
  providerId: string;
  model: string;
  estimatedCostUSD: number;
  rationale: string;                  // Why this model was chosen
}

interface ModelRecommendation {
  providerId: string;
  model: string;
  pricePerformanceScore: number;      // 0-100
  useCases: string[];
  costPerCall: number;
}
```

**Model Selection Rules:**

| Situation | Model | Rationale |
|-----------|-------|-----------|
| Routine thinking (full tier, idle) | Qwen 7B | Cheap, fast, good quality |
| Routine thinking (reduced tier) | Qwen 7B | Cheap, adequate for periodic checks |
| Player conversation | Qwen 32B or GPT-3.5 | Better conversational quality |
| Critical decision (building, conflict) | Qwen 32B or GPT-4 (if budget allows) | Complex reasoning needed |
| Creative task (writing, art) | Qwen 32B or Claude | High quality output matters |
| Autonomic tier activation | Qwen 7B | Rare occurrence, keep cheap |

**GIVEN** agent has routine idle thinking trigger
**WHEN** budget is healthy (>50% remaining)
**THEN** system selects Qwen 7B ($0.05/1M tokens)

**GIVEN** agent has player conversation trigger
**WHEN** budget is low (<25% remaining)
**THEN** system selects Qwen 7B instead of premium model

**GIVEN** agent has critical decision trigger
**WHEN** budget allows and premium percentage not exceeded
**THEN** system selects GPT-4 or Claude for best reasoning

---

## REQ-BUDGET-011: Auto-Tier Adjustment

The system SHALL automatically adjust agent tiers when budget is constrained.

```typescript
interface TierAdjuster {
  /**
   * Check if tier adjustments are needed based on budget.
   */
  checkAdjustments(budgetStats: BudgetStats): TierAdjustment[];

  /**
   * Apply tier adjustments to agents.
   */
  applyAdjustments(adjustments: TierAdjustment[]): void;

  /**
   * Restore original tiers when budget recovers.
   */
  restoreTiers(): void;
}

interface TierAdjustment {
  agentId: string;
  originalTier: AgentTier;
  adjustedTier: AgentTier;
  reason: string;
  temporary: boolean;                 // Restore when budget recovers
}
```

**Adjustment Thresholds:**

| Budget Remaining | Action |
|------------------|--------|
| >75% of monthly | Normal operation - all tiers at configured levels |
| 50-75% | Reduce periodic frequency for 'reduced' tier (30min → 45min) |
| 25-50% | Downgrade lowest priority 'full' agents to 'reduced' tier |
| 10-25% | Downgrade all 'full' to 'reduced', extend all periodic times |
| <10% | Emergency mode: All agents to 'autonomic' except player favorites |

**GIVEN** monthly budget is $200 and $150 spent (75% used)
**WHEN** budget check runs
**THEN** system downgrades 50% of full tier agents to reduced tier

**GIVEN** budget recovers (resets at month start)
**WHEN** new month begins
**THEN** system restores all agents to original configured tiers

---

## Future Enhancements

### Phase 2: Advanced Analytics

- **Cost per behavior**: Track which agent behaviors cost the most
- **A/B testing**: Compare costs between prompt versions
- **Optimization suggestions**: ML-based recommendations for reducing costs

### Phase 3: Team Budgets

- **Shared budgets**: Multiple players sharing a budget pool
- **Per-player limits**: Individual limits within team budget
- **Budget allocation**: Distribute budget across projects/games

### Phase 4: Advanced Projections

- **Seasonal patterns**: Detect weekly/monthly usage patterns
- **Growth projections**: Predict future costs based on agent count trends
- **What-if analysis**: "What would cost be if I add 10 more agents?"

---

## Dependencies & Integration

### Modified Files

**New Files:**
- `packages/core/src/budget/BudgetManager.ts` - Core budget management
- `packages/core/src/budget/CostTracker.ts` - Provider cost tracking
- `packages/core/src/budget/CostEstimator.ts` - Estimation engine
- `packages/core/src/budget/BudgetMonitor.ts` - Warning system
- `packages/renderer/src/components/BudgetPanel.tsx` - UI component

**Modified Files:**
- `packages/llm/src/LLMProvider.ts` - Add cost reporting
- `packages/llm/src/OllamaProvider.ts` - Report $0 costs
- `packages/llm/src/OpenAICompatProvider.ts` - Calculate token costs
- `packages/core/src/decision/LLMDecisionQueue.ts` - Check budget before calls
- `packages/renderer/src/SettingsPanel.ts` - Add budget category

### Event Integration

**Events to emit:**
- `budget:warning` - When approaching limit
- `budget:exceeded` - When budget exceeded
- `budget:reset_daily` - When daily budget resets
- `budget:reset_monthly` - When monthly budget resets
- `llm:call_completed` - When LLM call finishes (with cost data)

---

## Implementation Phases

### Phase 1: Tracking Infrastructure
1. Add cost reporting to LLMProvider interface
2. Implement CostTracker
3. Implement CostEstimator
4. Test cost calculation accuracy

### Phase 2: Budget Management
1. Implement BudgetManager
2. Implement BudgetMonitor
3. Add budget enforcement to LLMDecisionQueue
4. Test warning/pause behavior

### Phase 3: UI Components
1. Create BudgetPanel component
2. Add to SettingsPanel
3. Implement sliders and displays
4. Add provider comparison view

### Phase 4: Polish & Testing
1. Add historical analytics
2. Add per-agent breakdown
3. Integration testing
4. Performance optimization

### Phase 5: Intelligent Allocation
1. Implement CallRateAllocator - calculate affordable calls and distribute across tiers
2. Implement ModelSelector - choose model based on situation and budget
3. Implement TierAdjuster - auto-downgrade tiers when budget is low
4. Implement AgentPriorityScorer - calculate priority scores for call allocation
5. Integrate with LLMDecisionQueue to enforce allocation limits
6. Test budget-aware tier adjustments and model selection

---

**Status:** Ready for Review
**Complexity:** 3 systems (Budget Management, Cost Tracking, UI Integration)
**Priority:** High (enables cost-conscious gameplay)
