/**
 * Factory AI Component
 *
 * Autonomous AI that manages factory cities to keep production running.
 * Similar to City Director but for industrial management.
 *
 * The Factory AI:
 * - Monitors production bottlenecks
 * - Balances input/output flows
 * - Manages power distribution
 * - Requests resources via logistics
 * - Optimizes machine placement
 * - Handles resource shortages
 *
 * Unlocked via research: "Factory AI" (Tier 5)
 */

import type { Component } from '../ecs/Component.js';

/**
 * Production goals for the factory
 */
export type FactoryGoal =
  | 'maximize_output'      // Produce as much as possible
  | 'efficiency'           // Minimize waste and power usage
  | 'stockpile'           // Build up resource reserves
  | 'research'            // Produce items for research
  | 'emergency'           // Crisis mode - produce critical items only
  | 'shutdown';           // Graceful shutdown in progress

/**
 * Factory health status
 */
export type FactoryHealth =
  | 'optimal'      // All systems running smoothly
  | 'good'         // Minor issues, manageable
  | 'degraded'     // Significant bottlenecks
  | 'critical'     // Major failures, production halted
  | 'offline';     // No power or catastrophic failure

/**
 * Bottleneck detection
 */
export interface ProductionBottleneck {
  /** Type of bottleneck */
  type: 'power' | 'input' | 'output' | 'machine' | 'transport';

  /** Severity (0-1, where 1 is complete blockage) */
  severity: number;

  /** Item or resource affected */
  affectedItem?: string;

  /** Location of bottleneck (entity ID or coordinates) */
  location: string;

  /** Suggested fix */
  suggestion: string;

  /** When this bottleneck was first detected */
  detectedAt: number;
}

/**
 * Factory statistics tracked by AI
 */
export interface FactoryStats {
  // Production metrics
  totalMachines: number;
  activeMachines: number;
  idleMachines: number;

  // Resource flow
  totalInputsPerMinute: number;
  totalOutputsPerMinute: number;
  efficiency: number; // 0-1, actual vs theoretical output

  // Power metrics
  powerGeneration: number;
  powerConsumption: number;
  powerEfficiency: number; // 0-1, how well power is distributed

  // Transport metrics
  beltUtilization: number; // 0-1, how full belts are
  logisticsBottlenecks: number;

  // Storage
  inputStockpileDays: number; // How many days of production inputs remain
  outputStorageUtilization: number; // 0-1, how full output storage is
}

/**
 * AI decision made by the Factory AI
 */
export interface FactoryDecision {
  /** When this decision was made */
  timestamp: number;

  /** What the AI decided to do */
  action: 'request_resources' | 'adjust_production' | 'balance_power' |
          'expand_storage' | 'shutdown_machines' | 'activate_machines' |
          'optimize_layout' | 'emergency_mode';

  /** Reasoning behind the decision */
  reasoning: string;

  /** Parameters for the action */
  parameters: Record<string, any>;

  /** Expected outcome */
  expectedOutcome: string;

  /** Priority (0-1, where 1 is urgent) */
  priority: number;
}

/**
 * Resource request from Factory AI to logistics system
 */
export interface ResourceRequest {
  itemId: string;
  quantityNeeded: number;
  urgency: 'low' | 'normal' | 'high' | 'critical';
  reason: string;
  requestedAt: number;
  fulfilled: boolean;
}

export interface FactoryAIComponent extends Component {
  readonly type: 'factory_ai';
  readonly version: number;

  // === Identity ===
  /** Factory name */
  name: string;

  /** What this factory produces */
  primaryOutputs: string[];

  // === Goals & Strategy ===
  /** Current factory goal */
  goal: FactoryGoal;

  /** Target production rate (items per minute) */
  targetProductionRate: number;

  /** Should AI auto-expand the factory? */
  allowExpansion: boolean;

  /** Should AI request resources automatically? */
  allowLogisticsRequests: boolean;

  // === Health & Status ===
  /** Overall factory health */
  health: FactoryHealth;

  /** Last time AI made a decision (tick) */
  lastDecisionTick: number;

  /** How often AI should think (in ticks) */
  decisionInterval: number;

  // === Monitoring ===
  /** Current factory statistics */
  stats: FactoryStats;

  /** Detected bottlenecks */
  bottlenecks: ProductionBottleneck[];

  /** Recent AI decisions */
  recentDecisions: FactoryDecision[];

  /** Active resource requests */
  resourceRequests: ResourceRequest[];

  // === Configuration ===
  /** Minimum power efficiency before taking action (0-1) */
  minPowerEfficiency: number;

  /** Minimum input stockpile (in days of production) */
  minStockpileDays: number;

  /** Maximum output storage before reducing production (0-1) */
  maxOutputStorage: number;

  /** AI intelligence level (1-10, affects decision quality) */
  intelligenceLevel: number;

  // === Spatial ===
  /** Factory bounds (optional, for spatial filtering of entities) */
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };

  /** Fallback radius if bounds not set (in tiles) */
  radius?: number;

  // === Production Tracking ===
  /** Items produced per item type, tracked over time */
  productionHistory: Map<string, { count: number; lastUpdateTick: number }>;

  /** Items consumed per item type, tracked over time */
  consumptionHistory: Map<string, { count: number; lastUpdateTick: number }>;
}

/**
 * Create a Factory AI component
 */
export function createFactoryAI(
  name: string,
  primaryOutputs: string[],
  config?: Partial<FactoryAIComponent>
): FactoryAIComponent {
  return {
    type: 'factory_ai',
    version: 1,
    name,
    primaryOutputs,
    goal: config?.goal || 'maximize_output',
    targetProductionRate: config?.targetProductionRate || 100,
    allowExpansion: config?.allowExpansion ?? false,
    allowLogisticsRequests: config?.allowLogisticsRequests ?? true,
    health: 'good',
    lastDecisionTick: 0,
    decisionInterval: config?.decisionInterval || 100, // Think every 5 seconds at 20 TPS
    stats: {
      totalMachines: 0,
      activeMachines: 0,
      idleMachines: 0,
      totalInputsPerMinute: 0,
      totalOutputsPerMinute: 0,
      efficiency: 1.0,
      powerGeneration: 0,
      powerConsumption: 0,
      powerEfficiency: 1.0,
      beltUtilization: 0,
      logisticsBottlenecks: 0,
      inputStockpileDays: 7,
      outputStorageUtilization: 0,
    },
    bottlenecks: [],
    recentDecisions: [],
    resourceRequests: [],
    minPowerEfficiency: config?.minPowerEfficiency || 0.8,
    minStockpileDays: config?.minStockpileDays || 2,
    maxOutputStorage: config?.maxOutputStorage || 0.9,
    intelligenceLevel: config?.intelligenceLevel || 5,
    bounds: config?.bounds,
    radius: config?.radius || 100, // Default 100 tile radius if no bounds
    productionHistory: new Map(),
    consumptionHistory: new Map(),
  };
}

/**
 * Record a decision made by the Factory AI
 */
export function recordDecision(
  ai: FactoryAIComponent,
  action: FactoryDecision['action'],
  reasoning: string,
  parameters: Record<string, any>,
  expectedOutcome: string,
  priority: number = 0.5
): void {
  const decision: FactoryDecision = {
    timestamp: Date.now(),
    action,
    reasoning,
    parameters,
    expectedOutcome,
    priority,
  };

  ai.recentDecisions.unshift(decision);

  // Keep last 20 decisions
  if (ai.recentDecisions.length > 20) {
    ai.recentDecisions.length = 20;
  }
}

/**
 * Request resources from logistics
 */
export function requestResource(
  ai: FactoryAIComponent,
  itemId: string,
  quantity: number,
  urgency: ResourceRequest['urgency'],
  reason: string
): void {
  if (!ai.allowLogisticsRequests) {
    return;
  }

  const request: ResourceRequest = {
    itemId,
    quantityNeeded: quantity,
    urgency,
    reason,
    requestedAt: Date.now(),
    fulfilled: false,
  };

  ai.resourceRequests.push(request);
}

/**
 * Mark a resource request as fulfilled
 */
export function fulfillRequest(
  ai: FactoryAIComponent,
  itemId: string,
  quantity: number
): void {
  for (const request of ai.resourceRequests) {
    if (request.itemId === itemId && !request.fulfilled) {
      request.fulfilled = true;
      request.quantityNeeded -= quantity;

      if (request.quantityNeeded <= 0) {
        // Fully fulfilled, remove from list
        const index = ai.resourceRequests.indexOf(request);
        if (index >= 0) {
          ai.resourceRequests.splice(index, 1);
        }
      }
      break;
    }
  }
}

/**
 * Detect a bottleneck
 */
export function detectBottleneck(
  ai: FactoryAIComponent,
  type: ProductionBottleneck['type'],
  severity: number,
  location: string,
  suggestion: string,
  affectedItem?: string
): void {
  // Check if this bottleneck already exists
  const existing = ai.bottlenecks.find(
    b => b.type === type && b.location === location
  );

  if (existing) {
    // Update severity
    existing.severity = Math.max(existing.severity, severity);
  } else {
    // Add new bottleneck
    ai.bottlenecks.push({
      type,
      severity,
      affectedItem,
      location,
      suggestion,
      detectedAt: Date.now(),
    });
  }
}

/**
 * Clear bottlenecks that have been resolved
 */
export function clearResolvedBottlenecks(ai: FactoryAIComponent): void {
  // Remove bottlenecks with severity < 0.1
  ai.bottlenecks = ai.bottlenecks.filter(b => b.severity >= 0.1);
}

/**
 * Calculate overall factory health
 */
export function calculateFactoryHealth(ai: FactoryAIComponent): FactoryHealth {
  const { stats, bottlenecks } = ai;

  // No power = offline
  if (stats.powerEfficiency < 0.1) {
    return 'offline';
  }

  // Count critical bottlenecks
  const criticalBottlenecks = bottlenecks.filter(b => b.severity > 0.8).length;
  const majorBottlenecks = bottlenecks.filter(b => b.severity > 0.5).length;

  if (criticalBottlenecks > 0) {
    return 'critical';
  }

  if (majorBottlenecks > 2 || stats.efficiency < 0.5) {
    return 'degraded';
  }

  if (majorBottlenecks > 0 || stats.efficiency < 0.8) {
    return 'good';
  }

  return 'optimal';
}

/**
 * Get AI status summary (for UI/debugging)
 */
export function getAIStatusSummary(ai: FactoryAIComponent): string {
  const { name, health, stats, bottlenecks, goal } = ai;

  const healthIcon = {
    optimal: '✓',
    good: '◐',
    degraded: '⚠',
    critical: '✗',
    offline: '⊗',
  }[health];

  const effPercent = (stats.efficiency * 100).toFixed(0);
  const powerPercent = (stats.powerEfficiency * 100).toFixed(0);

  let summary = `${healthIcon} ${name} [${goal}]\n`;
  summary += `  Production: ${effPercent}% efficient (${stats.activeMachines}/${stats.totalMachines} machines)\n`;
  summary += `  Power: ${powerPercent}% (${stats.powerConsumption}/${stats.powerGeneration} kW)\n`;

  if (bottlenecks.length > 0) {
    summary += `  Bottlenecks: ${bottlenecks.length}\n`;
    for (const b of bottlenecks.slice(0, 3)) {
      const sevPercent = (b.severity * 100).toFixed(0);
      summary += `    - ${b.type}: ${sevPercent}% (${b.suggestion})\n`;
    }
  }

  return summary;
}

/**
 * Record item production
 */
export function recordProduction(
  ai: FactoryAIComponent,
  itemId: string,
  quantity: number,
  currentTick: number
): void {
  const existing = ai.productionHistory.get(itemId);
  if (existing) {
    existing.count += quantity;
    existing.lastUpdateTick = currentTick;
  } else {
    ai.productionHistory.set(itemId, { count: quantity, lastUpdateTick: currentTick });
  }
}

/**
 * Record item consumption
 */
export function recordConsumption(
  ai: FactoryAIComponent,
  itemId: string,
  quantity: number,
  currentTick: number
): void {
  const existing = ai.consumptionHistory.get(itemId);
  if (existing) {
    existing.count += quantity;
    existing.lastUpdateTick = currentTick;
  } else {
    ai.consumptionHistory.set(itemId, { count: quantity, lastUpdateTick: currentTick });
  }
}

/**
 * Calculate items per minute from tracked history
 * Uses time window of last N ticks to calculate rate
 */
export function calculateItemsPerMinute(
  history: Map<string, { count: number; lastUpdateTick: number }>,
  currentTick: number,
  windowTicks: number = 1200 // Default 1 minute at 20 TPS
): number {
  let totalItems = 0;
  const cutoffTick = currentTick - windowTicks;

  for (const [_itemId, record] of history) {
    // Only count items produced/consumed within the time window
    if (record.lastUpdateTick >= cutoffTick) {
      totalItems += record.count;
    }
  }

  // Convert to items per minute
  const minutesElapsed = windowTicks / (20 * 60); // 20 TPS, 60 seconds
  return minutesElapsed > 0 ? totalItems / minutesElapsed : 0;
}

/**
 * Reset production tracking (e.g., at start of new measurement period)
 */
export function resetProductionTracking(ai: FactoryAIComponent): void {
  ai.productionHistory.clear();
  ai.consumptionHistory.clear();
}
