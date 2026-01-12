# Budget System

LLM cost tracking and budget enforcement for agent decision-making.

## Overview

Tracks token usage, costs, and enforces daily/monthly budgets across LLM providers. Provides real-time cost estimation and warnings.

## Components

### BudgetManager
Central coordinator for budget tracking and enforcement.

```typescript
import { BudgetManager } from '@ai-village/core';

const manager = new BudgetManager();
manager.recordCall(providerId, providerName, inputTokens, outputTokens, costUSD, inputCostPer1M, outputCostPer1M);
const stats = manager.getStats();  // Current budget status
const canCall = manager.canMakeLLMCall();  // Check budget before calling
```

**Config**: Daily/monthly limits ($25/$200 default), warning threshold (75%), pause on exceeded.

### CostTracker
Per-provider token and cost tracking with daily/monthly breakdowns.

```typescript
const tracker = manager.getCostTracker();
const providers = tracker.getAllProviders();  // All provider stats
const dailyCost = tracker.getDailyCost();     // Today's spend
```

**Per Provider**: Total tokens (input/output), calls, cost (total/today/month), pricing, timing.

### CostEstimator
Rolling-window cost projection based on recent usage patterns (1-hour window default).

```typescript
const estimator = manager.getCostEstimator();
const estimate = estimator.getEstimate(dailyBudget, monthlyBudget, currentDaily, currentMonthly);
// Returns: calls/min, avg tokens/cost per call, projected hourly/daily/monthly cost, time to limits
```

**Confidence**: Low (<10 samples), medium (10-50), high (50+).

### BudgetMonitor
Warning system with severity levels.

```typescript
import { BudgetMonitor } from '@ai-village/core';

const monitor = new BudgetMonitor(manager);
const warnings = monitor.checkBudget();  // Array of warnings
const level = monitor.getWarningLevel();  // 'none' | 'warning' | 'critical' | 'exceeded'
```

**Levels**: Warning (≥75%), critical (≥100%), exceeded (≥110%).

## Persistence

Auto-saves to localStorage every 5 minutes. Auto-resets daily (midnight) and monthly (1st).

```typescript
manager.save();
manager.load();
const json = manager.export();  // JSON export
manager.import(json);           // JSON import
```

## Events

```typescript
window.addEventListener('budget:warning', e => console.log(e.detail));
window.addEventListener('budget:exceeded', e => console.log(e.detail));
window.addEventListener('budget:reset_daily', () => console.log('Daily reset'));
window.addEventListener('budget:reset_monthly', () => console.log('Monthly reset'));
```

## Integration

Used by `LLMScheduler` to enforce budgets before queueing requests. See `packages/llm/src/LLMScheduler.ts`.
