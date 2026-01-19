/**
 * MetricsLiveStream - Real-time metrics streaming
 *
 * Provides pub/sub interface for live metrics updates.
 * Can be used directly in-browser or wrapped with WebSocket for server deployment.
 *
 * Part of Phase 23: Sociological Metrics - Storage & API
 */

import type { MetricsCollector } from '../MetricsCollector.js';
import { RingBuffer } from '../RingBuffer.js';

/**
 * Metric types that can be subscribed to
 */
export type MetricType =
  | 'snapshot'
  | 'interaction'
  | 'behavior'
  | 'network'
  | 'resource'
  | 'agent'
  | 'alert';

/**
 * Alert severity levels
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Metric alert
 */
export interface MetricAlert {
  severity: AlertSeverity;
  metric: string;
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

/**
 * Snapshot data
 */
export interface SnapshotData {
  timestamp: number;
  population: number;
  avgHealth: number;
  avgEnergy: number;
  avgHunger: number;
  behaviorDistribution: Record<string, number>;
  networkDensity: number;
}

/**
 * Interaction data
 */
export interface InteractionData {
  timestamp: number;
  agent1Id: string;
  agent2Id: string;
  type: string;
  location?: { x: number; y: number };
}

/**
 * Behavior change data
 */
export interface BehaviorData {
  timestamp: number;
  agentId: string;
  from: string;
  to: string;
  location?: { x: number; y: number };
}

/**
 * Network update data
 */
export interface NetworkData {
  timestamp: number;
  density: number;
  clustering: number;
  nodeCount: number;
  edgeCount: number;
}

/**
 * Resource event data
 */
export interface ResourceData {
  timestamp: number;
  agentId: string;
  resourceType: string;
  amount: number;
  action: 'gathered' | 'consumed' | 'produced';
}

/**
 * Agent event data
 */
export interface AgentData {
  timestamp: number;
  agentId: string;
  event: 'birth' | 'death' | 'moved';
  data?: Record<string, unknown>;
}

/**
 * Live stream message
 */
export type LiveStreamMessage =
  | { type: 'snapshot'; data: SnapshotData }
  | { type: 'interaction'; data: InteractionData }
  | { type: 'behavior'; data: BehaviorData }
  | { type: 'network'; data: NetworkData }
  | { type: 'resource'; data: ResourceData }
  | { type: 'agent'; data: AgentData }
  | { type: 'alert'; data: MetricAlert };

/**
 * Subscription callback
 */
export type SubscriptionCallback = (message: LiveStreamMessage) => void;

/**
 * Subscriber info
 */
interface Subscriber {
  id: string;
  metrics: Set<MetricType>;
  callback: SubscriptionCallback;
  samplingRate: number;
}

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  metric: string;
  warningThreshold: number;
  criticalThreshold: number;
  comparison: 'above' | 'below';
}

/**
 * MetricsLiveStream provides real-time metrics streaming
 */
export class MetricsLiveStream {
  private collector: MetricsCollector;
  private subscribers: Map<string, Subscriber> = new Map();
  private messageBuffer: RingBuffer<LiveStreamMessage>;
  private alertThresholds: AlertThreshold[] = [];
  private paused: boolean = false;
  private nextSubscriberId: number = 0;
  private snapshotInterval: number = 1000; // 1 second default
  private snapshotTimer?: ReturnType<typeof setInterval>;

  constructor(collector: MetricsCollector, bufferSize: number = 1000) {
    this.collector = collector;
    this.messageBuffer = new RingBuffer<LiveStreamMessage>(bufferSize);

    // Set up default alert thresholds
    this.alertThresholds = [
      { metric: 'avgHealth', warningThreshold: 30, criticalThreshold: 15, comparison: 'below' },
      { metric: 'avgEnergy', warningThreshold: 20, criticalThreshold: 10, comparison: 'below' },
      { metric: 'population', warningThreshold: 1, criticalThreshold: 0, comparison: 'below' },
    ];
  }

  /**
   * Start the live stream (begins periodic snapshots)
   */
  start(snapshotIntervalMs: number = 1000): void {
    this.snapshotInterval = snapshotIntervalMs;
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
    }
    this.snapshotTimer = setInterval(() => this.emitSnapshot(), this.snapshotInterval);
    this.paused = false;
  }

  /**
   * Stop the live stream
   */
  stop(): void {
    if (this.snapshotTimer) {
      clearInterval(this.snapshotTimer);
      this.snapshotTimer = undefined;
    }
  }

  /**
   * Pause streaming (keeps subscriptions but stops emitting)
   */
  pause(): void {
    this.paused = true;
  }

  /**
   * Resume streaming
   */
  resume(): void {
    this.paused = false;
  }

  /**
   * Subscribe to metrics
   */
  subscribe(
    metrics: MetricType[],
    callback: SubscriptionCallback,
    samplingRate: number = 1.0
  ): string {
    const id = `sub-${this.nextSubscriberId++}`;
    this.subscribers.set(id, {
      id,
      metrics: new Set(metrics),
      callback,
      samplingRate: Math.max(0, Math.min(1, samplingRate)),
    });
    return id;
  }

  /**
   * Unsubscribe from metrics
   */
  unsubscribe(subscriberId: string): boolean {
    return this.subscribers.delete(subscriberId);
  }

  /**
   * Update subscription metrics
   */
  updateSubscription(subscriberId: string, metrics: MetricType[]): boolean {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) return false;
    subscriber.metrics = new Set(metrics);
    return true;
  }

  /**
   * Set sampling rate for a subscription
   */
  setSamplingRate(subscriberId: string, rate: number): boolean {
    const subscriber = this.subscribers.get(subscriberId);
    if (!subscriber) return false;
    subscriber.samplingRate = Math.max(0, Math.min(1, rate));
    return true;
  }

  /**
   * Add an alert threshold
   */
  addAlertThreshold(threshold: AlertThreshold): void {
    this.alertThresholds.push(threshold);
  }

  /**
   * Remove an alert threshold
   */
  removeAlertThreshold(metric: string): void {
    this.alertThresholds = this.alertThresholds.filter(t => t.metric !== metric);
  }

  /**
   * Get recent messages from buffer
   */
  getRecentMessages(count: number): LiveStreamMessage[] {
    return this.messageBuffer.getRecent(count);
  }

  /**
   * Emit an interaction event
   */
  emitInteraction(data: InteractionData): void {
    this.emit({ type: 'interaction', data });
  }

  /**
   * Emit a behavior change event
   */
  emitBehavior(data: BehaviorData): void {
    this.emit({ type: 'behavior', data });
  }

  /**
   * Emit a resource event
   */
  emitResource(data: ResourceData): void {
    this.emit({ type: 'resource', data });
  }

  /**
   * Emit an agent event
   */
  emitAgent(data: AgentData): void {
    this.emit({ type: 'agent', data });
  }

  /**
   * Emit a network update
   */
  emitNetwork(data: NetworkData): void {
    this.emit({ type: 'network', data });
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Check if streaming is active
   */
  isActive(): boolean {
    return !this.paused && this.snapshotTimer !== undefined;
  }

  /**
   * Emit periodic snapshot
   */
  private emitSnapshot(): void {
    if (this.paused) return;

    const allMetrics = this.collector.getAllMetrics();
    const needs = allMetrics.needs as Map<string, any> | undefined;

    // Calculate averages
    let avgHealth = 0;
    let avgEnergy = 0;
    let avgHunger = 0;
    let population = 0;
    const behaviorDistribution: Record<string, number> = {};

    if (needs) {
      for (const [, agentNeeds] of needs) {
        population++;
        avgHealth += agentNeeds.avgHealth ?? 50;
        avgEnergy += agentNeeds.avgEnergy ?? 50;
        avgHunger += agentNeeds.avgHunger ?? 50;
      }

      if (population > 0) {
        avgHealth /= population;
        avgEnergy /= population;
        avgHunger /= population;
      }
    }

    // Get behavior distribution
    const behavioral = allMetrics.behavioral as Record<string, any> | undefined;
    if (behavioral) {
      for (const [, agentData] of Object.entries(behavioral)) {
        const breakdown = agentData.activityBreakdown as Record<string, number> | undefined;
        if (breakdown) {
          for (const [behavior, time] of Object.entries(breakdown)) {
            behaviorDistribution[behavior] = (behaviorDistribution[behavior] || 0) + time;
          }
        }
      }
    }

    const snapshot: SnapshotData = {
      timestamp: Date.now(),
      population,
      avgHealth,
      avgEnergy,
      avgHunger,
      behaviorDistribution,
      networkDensity: (allMetrics.social as any)?.socialNetworkDensity ?? 0,
    };

    this.emit({ type: 'snapshot', data: snapshot });

    // Check alert thresholds
    this.checkAlerts(snapshot);
  }

  /**
   * Check and emit alerts based on thresholds
   */
  private checkAlerts(snapshot: SnapshotData): void {
    for (const threshold of this.alertThresholds) {
      // Access snapshot property dynamically but safely
      const snapshotRecord = snapshot as unknown as Record<string, unknown>;
      const value = snapshotRecord[threshold.metric] as number | undefined;
      if (value === undefined) continue;

      let triggered = false;
      let severity: AlertSeverity = 'info';

      if (threshold.comparison === 'below') {
        if (value <= threshold.criticalThreshold) {
          triggered = true;
          severity = 'critical';
        } else if (value <= threshold.warningThreshold) {
          triggered = true;
          severity = 'warning';
        }
      } else {
        if (value >= threshold.criticalThreshold) {
          triggered = true;
          severity = 'critical';
        } else if (value >= threshold.warningThreshold) {
          triggered = true;
          severity = 'warning';
        }
      }

      if (triggered) {
        const alert: MetricAlert = {
          severity,
          metric: threshold.metric,
          message: `${threshold.metric} is ${threshold.comparison === 'below' ? 'below' : 'above'} ${severity} threshold`,
          value,
          threshold: severity === 'critical' ? threshold.criticalThreshold : threshold.warningThreshold,
          timestamp: Date.now(),
        };
        this.emit({ type: 'alert', data: alert });
      }
    }
  }

  /**
   * Emit a message to subscribers
   */
  private emit(message: LiveStreamMessage): void {
    if (this.paused) return;

    // Add to buffer
    this.messageBuffer.push(message);

    // Notify subscribers
    for (const subscriber of this.subscribers.values()) {
      // Check if subscriber wants this message type
      if (!subscriber.metrics.has(message.type)) continue;

      // Apply sampling rate
      if (subscriber.samplingRate < 1.0 && Math.random() > subscriber.samplingRate) {
        continue;
      }

      try {
        subscriber.callback(message);
      } catch (error) {
        // Log but don't crash on subscriber errors
        console.error(`LiveStream subscriber error: ${error}`);
      }
    }
  }
}
