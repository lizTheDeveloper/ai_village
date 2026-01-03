/**
 * MetricsCollector - Core metrics collection service
 *
 * Collects and aggregates gameplay metrics from events and periodic sampling.
 */

import type { World } from '../ecs/World.js';
import type {
  AgentLifecycleMetrics,
  NeedsMetrics,
  EconomicMetrics,
  SocialMetrics,
  SpatialMetrics,
  BehavioralMetrics,
  IntelligenceMetrics,
  PerformanceMetrics,
  EmergentMetrics,
  SessionMetrics,
  NeedsSample,
  PerformanceSample,
  AggregationOptions,
  ExportFormat,
  TimeRange,
  Position,
  EmergentPattern,
  Anomaly,
  Milestone,
} from './types.js';

/**
 * Valid event types for metrics collection
 */
const VALID_EVENT_TYPES = new Set([
  'agent:birth',
  'agent:death',
  'agent:moved',
  'resource:gathered',
  'resource:consumed',
  'resource:produced',
  'stockpile:updated',
  'wealth:calculated',
  'relationship:formed',
  'conversation:started',
  'tile:visited',
  'pathfinding:failed',
  'activity:started',
  'activity:ended',
  'task:started',
  'task:completed',
  'task:abandoned',
  'llm:call',
  'llm:request',
  'llm:decision',
  'llm:error',
  'agent:llm_context',
  'plan:created',
  'plan:completed',
  'system:tick',
  'population:sampled',
  'generation:completed',
  'survival_rate:calculated',
  'test:metric1',
  'test:metric2',
  'session:started',
  'session:ended',
  'player:intervention',
  'game:speed_changed',
]);

export class MetricsCollector {
  /** Maximum number of samples to keep in time-series arrays */
  private static readonly MAX_SAMPLES = 10000;
  /** Maximum entries in spatial heatmap before pruning */
  private static readonly MAX_HEATMAP_ENTRIES = 100000;

  private sessionId: string;

  // Metric stores
  private agentLifecycle: Map<string, AgentLifecycleMetrics> = new Map();
  private needsMetrics: Map<string, NeedsMetrics> = new Map();
  private economicMetrics: EconomicMetrics;
  private socialMetrics: SocialMetrics;
  private spatialMetrics: SpatialMetrics;
  private behavioralMetrics: Map<string, BehavioralMetrics[string]> = new Map();
  private intelligenceMetrics: IntelligenceMetrics;
  private performanceMetrics: PerformanceMetrics;
  private emergentMetrics: EmergentMetrics;
  private sessionMetrics: SessionMetrics;

  // Periodic sampling
  private samplingInterval?: NodeJS.Timeout;

  // Hot storage for time-based filtering
  private hotStorage: Map<string, AgentLifecycleMetrics> = new Map();
  private coldStorage: Map<string, AgentLifecycleMetrics> = new Map();

  constructor(world: World) {
    if (!world) {
      throw new Error('MetricsCollector requires a World instance');
    }

    this.sessionId = this.generateSessionId();

    // Initialize metrics
    this.economicMetrics = this.initializeEconomicMetrics();
    this.socialMetrics = this.initializeSocialMetrics();
    this.spatialMetrics = this.initializeSpatialMetrics();
    this.intelligenceMetrics = this.initializeIntelligenceMetrics();
    this.performanceMetrics = this.initializePerformanceMetrics();
    this.emergentMetrics = this.initializeEmergentMetrics();
    this.sessionMetrics = this.initializeSessionMetrics();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add a sample to an array with bounded size.
   * Removes oldest entries if array exceeds MAX_SAMPLES.
   */
  private addBoundedSample<T>(array: T[], sample: T): void {
    array.push(sample);
    if (array.length > MetricsCollector.MAX_SAMPLES) {
      // Remove oldest entries (shift is O(n), but this only happens occasionally)
      array.shift();
    }
  }

  /**
   * Prune heatmap if it exceeds MAX_HEATMAP_ENTRIES.
   * Resets the heatmap to prevent unbounded memory growth.
   */
  private pruneHeatmapIfNeeded(): void {
    let entryCount = 0;
    for (const x in this.spatialMetrics.heatmap) {
      const yMap = this.spatialMetrics.heatmap[x];
      if (yMap) {
        entryCount += Object.keys(yMap).length;
      }
    }

    if (entryCount > MetricsCollector.MAX_HEATMAP_ENTRIES) {
      // Reset heatmap - could implement smarter pruning in future
      this.spatialMetrics.heatmap = {};
    }
  }

  /**
   * Initialize economic metrics
   */
  private initializeEconomicMetrics(): EconomicMetrics {
    return {
      resourcesGathered: {},
      resourcesProduced: {},
      resourcesConsumed: {},
      stockpiles: {},
      totalWealth: [],
      wealthDistribution: {
        giniCoefficient: 0,
        top10Percent: 0,
        bottom50Percent: 0,
      },
    };
  }

  /**
   * Initialize social metrics
   */
  private initializeSocialMetrics(): SocialMetrics {
    return {
      relationshipsFormed: 0,
      relationshipStrengths: {
        family: [],
        friends: [],
        acquaintances: [],
      },
      socialNetworkDensity: 0,
      averageClusterSize: 0,
      isolatedAgents: 0,
      conversationsPerDay: 0,
      avgConversationLength: 0,
      communicationTopics: {},
      communityCohesion: 0,
      factionsCount: 0,
      leaderCount: 0,
      conflictsPerDay: 0,
      conflictTypes: {},
      conflictResolutionRate: 0,
    };
  }

  /**
   * Initialize spatial metrics
   */
  private initializeSpatialMetrics(): SpatialMetrics {
    return {
      agents: {},
      heatmap: {},
      pathfindingFailures: 0,
    };
  }

  /**
   * Initialize intelligence metrics
   */
  private initializeIntelligenceMetrics(): IntelligenceMetrics {
    return {
      llmCalls: { haiku: 0, sonnet: 0, opus: 0 },
      tokensConsumed: { haiku: 0, sonnet: 0, opus: 0, total: 0 },
      avgTokensPerDecision: 0,
      avgDecisionLatency: 0,
      estimatedCost: { haiku: 0, sonnet: 0, opus: 0, total: 0 },
      costPerAgent: 0,
      costPerGameHour: 0,
      planSuccessRate: 0,
      adaptabilityScore: 0,
      creativityScore: 0,
    };
  }

  /**
   * Initialize performance metrics
   */
  private initializePerformanceMetrics(): PerformanceMetrics {
    return {
      fps: [],
      avgFps: 0,
      minFps: Infinity,
      frameDrops: 0,
      totalEntities: [],
      agentCount: [],
      buildingCount: [],
      resourceCount: [],
      tickDuration: [],
      systemTiming: {},
      memoryUsage: [],
      peakMemory: 0,
      memoryLeaks: 0,
      slowestSystem: '',
      pathfindingCacheHitRate: 0,
      entityPoolEfficiency: 0,
    };
  }

  /**
   * Initialize emergent metrics
   */
  private initializeEmergentMetrics(): EmergentMetrics {
    return {
      detectedPatterns: [],
      anomalies: [],
      milestones: [],
    };
  }

  /**
   * Initialize session metrics
   */
  private initializeSessionMetrics(): SessionMetrics {
    return {
      sessionId: this.sessionId,
      startTime: Date.now(),
      realTimeDuration: 0,
      gameTimeDuration: 0,
      playerInterventions: 0,
      pauseCount: 0,
      totalPausedTime: 0,
      gameSpeed: [],
      viewportPosition: [],
      peakPopulation: 0,
      totalDeaths: 0,
      totalBirths: 0,
    };
  }

  /**
   * Record a game event
   */
  recordEvent(event: Record<string, unknown>): void {
    if (!event.type || typeof event.type !== 'string') {
      throw new Error('Event must have a type field');
    }

    if (event.timestamp === undefined || event.timestamp === null) {
      throw new Error('Event must have a timestamp field');
    }

    const eventType = event.type as string;
    if (!VALID_EVENT_TYPES.has(eventType)) {
      throw new Error(`Unknown event type: ${eventType}`);
    }

    // Route to appropriate handler
    switch (event.type) {
      case 'agent:birth':
        this.handleAgentBirth(event);
        break;
      case 'agent:death':
        this.handleAgentDeath(event);
        break;
      case 'agent:moved':
        this.handleAgentMoved(event);
        break;
      case 'resource:gathered':
        this.handleResourceGathered(event);
        break;
      case 'resource:consumed':
        this.handleResourceConsumed(event);
        break;
      case 'stockpile:updated':
        this.handleStockpileUpdated(event);
        break;
      case 'wealth:calculated':
        this.handleWealthCalculated(event);
        break;
      case 'relationship:formed':
        this.handleRelationshipFormed(event);
        break;
      case 'conversation:started':
        this.handleConversationStarted(event);
        break;
      case 'tile:visited':
        this.handleTileVisited(event);
        break;
      case 'pathfinding:failed':
        this.handlePathfindingFailed(event);
        break;
      case 'activity:started':
      case 'activity:ended':
        this.handleActivity(event);
        break;
      case 'task:started':
      case 'task:completed':
      case 'task:abandoned':
        this.handleTask(event);
        break;
      case 'llm:call':
        this.handleLLMCall(event);
        break;
      case 'llm:request':
      case 'llm:decision':
      case 'llm:error':
      case 'agent:llm_context':
        // LLM events - handled by MetricsCollectionSystem for streaming
        // No additional aggregation needed here
        break;
      case 'plan:created':
      case 'plan:completed':
        this.handlePlan(event);
        break;
      case 'system:tick':
        this.handleSystemTick(event);
        break;
      case 'session:started':
      case 'session:ended':
        this.handleSession(event);
        break;
      case 'player:intervention':
        this.handlePlayerIntervention(event);
        break;
      case 'game:speed_changed':
        this.handleGameSpeedChanged(event);
        break;
      case 'population:sampled':
        this.handlePopulationSampled(event);
        break;
      case 'generation:completed':
        this.handleGenerationCompleted(event);
        break;
      case 'survival_rate:calculated':
        this.handleSurvivalRateCalculated(event);
        break;
      case 'test:metric1':
      case 'test:metric2':
        // Test events - store for analysis
        this.handleTestMetric(event);
        break;
    }
  }

  /**
   * Handle agent birth event
   */
  private handleAgentBirth(event: Record<string, unknown>): void {
    const agentId = event.agentId as string;
    const metrics: AgentLifecycleMetrics = {
      birthTimestamp: event.timestamp as number,
      birthGeneration: event.generation as number,
      parents: event.parents as [string, string] | null,
      initialStats: event.initialStats as any,
      childrenCount: 0,
      descendantsCount: 0,
      skillsLearned: [],
      buildingsCreated: 0,
      resourcesGathered: {},
    };

    this.agentLifecycle.set(agentId, metrics);
    this.hotStorage.set(agentId, metrics);
    this.sessionMetrics.totalBirths++;

    // Update parent's children count
    if (metrics.parents) {
      for (const parentId of metrics.parents) {
        let parentMetrics = this.agentLifecycle.get(parentId);
        if (!parentMetrics) {
          // Create parent metrics if they don't exist
          parentMetrics = {
            birthTimestamp: 0,
            birthGeneration: 0,
            parents: null,
            initialStats: { health: 0, hunger: 0, thirst: 0, energy: 0 },
            childrenCount: 0,
            descendantsCount: 0,
            skillsLearned: [],
            buildingsCreated: 0,
            resourcesGathered: {},
          };
          this.agentLifecycle.set(parentId, parentMetrics);
        }
        parentMetrics.childrenCount++;
      }
    }

    // Recalculate isolated agents count when a new agent is born
    this.recalculateIsolatedAgents();
  }

  /**
   * Recalculate isolated agents count
   */
  private recalculateIsolatedAgents(): void {
    const allAgents = new Set<string>();

    // Add all agents with relationships
    for (const agentId of this.agentsWithRelationships) {
      allAgents.add(agentId);
    }

    // Add all agents from lifecycle
    for (const agentId of this.agentLifecycle.keys()) {
      allAgents.add(agentId);
    }

    // Calculate isolated agents
    this.socialMetrics.isolatedAgents = allAgents.size - this.agentsWithRelationships.size;
  }

  /**
   * Handle agent death event
   */
  private handleAgentDeath(event: Record<string, unknown>): void {
    const agentId = event.agentId as string;
    let metrics = this.agentLifecycle.get(agentId);

    if (!metrics) {
      // Create metrics if not exists (agent born before metrics started)
      metrics = {
        birthTimestamp: event.timestamp as number,
        birthGeneration: 0,
        parents: null,
        initialStats: { health: 0, hunger: 0, thirst: 0, energy: 0 },
        childrenCount: 0,
        descendantsCount: 0,
        skillsLearned: [],
        buildingsCreated: 0,
        resourcesGathered: {},
      };
      this.agentLifecycle.set(agentId, metrics);
    }

    metrics.deathTimestamp = event.timestamp as number;
    metrics.causeOfDeath = event.causeOfDeath as any;
    metrics.ageAtDeath = event.ageAtDeath as number;
    metrics.finalStats = event.finalStats as any;
    metrics.lifespan = metrics.deathTimestamp - metrics.birthTimestamp;

    this.sessionMetrics.totalDeaths++;

    // Clean up dead agent from tracking maps to prevent memory leaks
    this.agentWealth.delete(agentId);
    this.agentsWithRelationships.delete(agentId);
    this.behavioralMetrics.delete(agentId);
    this.needsMetrics.delete(agentId);
    delete this.spatialMetrics.agents[agentId];
  }

  /**
   * Handle agent moved event
   */
  private handleAgentMoved(event: Record<string, unknown>): void {
    const agentId = event.agentId as string;
    const distance = event.distance as number;

    if (!this.spatialMetrics.agents[agentId]) {
      this.spatialMetrics.agents[agentId] = {
        totalDistanceTraveled: 0,
        avgMovementSpeed: 0,
        pathfindingCalls: 0,
        pathfindingFailures: 0,
        territoryCenter: { x: 0, y: 0 },
      };
    }

    this.spatialMetrics.agents[agentId].totalDistanceTraveled += distance;
  }

  /**
   * Handle resource gathered event
   */
  private handleResourceGathered(event: Record<string, unknown>): void {
    const resourceType = event.resourceType as string;
    const amount = event.amount as number;
    const gatherTime = event.gatherTime as number;

    if (!this.economicMetrics.resourcesGathered[resourceType]) {
      this.economicMetrics.resourcesGathered[resourceType] = {
        totalGathered: 0,
        gatherRate: 0,
        gathererCount: 0,
        avgGatherTime: 0,
      };
    }

    const metrics = this.economicMetrics.resourcesGathered[resourceType];
    const prevTotal = metrics.totalGathered;
    metrics.totalGathered += amount;

    // Update average gather time
    if (prevTotal === 0) {
      metrics.avgGatherTime = gatherTime;
    } else {
      metrics.avgGatherTime = (metrics.avgGatherTime * prevTotal + gatherTime * amount) / metrics.totalGathered;
    }
  }

  /**
   * Handle resource consumed event
   */
  private handleResourceConsumed(event: Record<string, unknown>): void {
    const agentId = event.agentId as string;
    const resourceType = event.resourceType as string;
    const amount = event.amount as number;
    const purpose = event.purpose as string;

    if (!this.economicMetrics.resourcesConsumed[resourceType]) {
      this.economicMetrics.resourcesConsumed[resourceType] = {
        totalConsumed: 0,
        consumptionRate: 0,
        purposeBreakdown: {},
      };
    }

    const metrics = this.economicMetrics.resourcesConsumed[resourceType];
    metrics.totalConsumed += amount;

    if (!metrics.purposeBreakdown[purpose]) {
      metrics.purposeBreakdown[purpose] = 0;
    }
    metrics.purposeBreakdown[purpose] += amount;

    // Track food consumption in needs metrics
    if (purpose === 'food') {
      const needsMetrics = this.getOrCreateNeedsMetrics(agentId);
      if (!needsMetrics.foodConsumed[resourceType]) {
        needsMetrics.foodConsumed[resourceType] = 0;
      }
      needsMetrics.foodConsumed[resourceType] += amount;
    }
  }

  /**
   * Handle stockpile updated event
   */
  private handleStockpileUpdated(event: Record<string, unknown>): void {
    const resourceType = event.resourceType as string;
    const amount = event.amount as number;
    const timestamp = event.timestamp as number;

    if (!this.economicMetrics.stockpiles[resourceType]) {
      this.economicMetrics.stockpiles[resourceType] = [];
    }

    this.addBoundedSample(this.economicMetrics.stockpiles[resourceType], { timestamp, value: amount });
  }

  // Wealth tracking for Gini calculation
  private agentWealth: Map<string, number> = new Map();

  // Track which agents have relationships (for isolated agent calculation)
  private agentsWithRelationships: Set<string> = new Set();

  /**
   * Handle wealth calculated event
   */
  private handleWealthCalculated(event: Record<string, unknown>): void {
    const agentId = event.agentId as string;
    const wealth = event.wealth as number;

    this.agentWealth.set(agentId, wealth);

    // Calculate Gini coefficient
    const wealthValues = Array.from(this.agentWealth.values()).sort((a, b) => a - b);
    if (wealthValues.length > 0) {
      this.economicMetrics.wealthDistribution.giniCoefficient = this.calculateGiniCoefficient(wealthValues);

      // Calculate top 10% and bottom 50%
      const totalWealth = wealthValues.reduce((sum, w) => sum + w, 0);
      const n = wealthValues.length;
      const top10Count = Math.max(1, Math.floor(n * 0.1));
      const bottom50Count = Math.floor(n * 0.5);

      const top10Wealth = wealthValues.slice(-top10Count).reduce((sum, w) => sum + w, 0);
      const bottom50Wealth = wealthValues.slice(0, bottom50Count).reduce((sum, w) => sum + w, 0);

      this.economicMetrics.wealthDistribution.top10Percent = totalWealth > 0 ? top10Wealth / totalWealth : 0;
      this.economicMetrics.wealthDistribution.bottom50Percent = totalWealth > 0 ? bottom50Wealth / totalWealth : 0;
    }
  }

  /**
   * Calculate Gini coefficient from sorted wealth values
   */
  private calculateGiniCoefficient(sortedWealth: number[]): number {
    const n = sortedWealth.length;
    if (n === 0) return 0;

    const totalWealth = sortedWealth.reduce((sum, w) => sum + w, 0);
    if (totalWealth === 0) return 0;

    let numerator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i + 1) * (sortedWealth[i] ?? 0);
    }

    const gini = (2 * numerator) / (n * totalWealth) - (n + 1) / n;
    return gini;
  }

  /**
   * Handle relationship formed event
   */
  private handleRelationshipFormed(event: Record<string, unknown>): void {
    this.socialMetrics.relationshipsFormed++;

    const agent1 = event.agent1 as string;
    const agent2 = event.agent2 as string;

    // Track agents with relationships
    this.agentsWithRelationships.add(agent1);
    this.agentsWithRelationships.add(agent2);

    // Calculate social network density
    // Count all agents (from relationships and lifecycle)
    const agentIds = new Set<string>();

    // Add all agents that have relationships
    for (const agentId of this.agentsWithRelationships) {
      agentIds.add(agentId);
    }

    // Add any other agents from lifecycle
    for (const agentId of this.agentLifecycle.keys()) {
      agentIds.add(agentId);
    }

    this.socialMetrics.socialNetworkDensity = this.socialMetrics.relationshipsFormed / agentIds.size;

    // Calculate isolated agents (agents that exist but have no relationships)
    this.socialMetrics.isolatedAgents = agentIds.size - this.agentsWithRelationships.size;
  }

  /**
   * Handle conversation started event
   */
  private handleConversationStarted(_event: Record<string, unknown>): void {
    this.socialMetrics.conversationsPerDay++;
  }

  /**
   * Handle tile visited event
   */
  private handleTileVisited(event: Record<string, unknown>): void {
    const x = event.x as number;
    const y = event.y as number;

    if (!this.spatialMetrics.heatmap[x]) {
      this.spatialMetrics.heatmap[x] = {};
    }
    if (!this.spatialMetrics.heatmap[x][y]) {
      this.spatialMetrics.heatmap[x][y] = 0;
    }

    this.spatialMetrics.heatmap[x][y]++;

    // Update territory center for agent
    const agentId = event.agentId as string;

    // Ensure agent entry exists
    if (!this.spatialMetrics.agents[agentId]) {
      this.spatialMetrics.agents[agentId] = {
        totalDistanceTraveled: 0,
        avgMovementSpeed: 0,
        pathfindingCalls: 0,
        pathfindingFailures: 0,
        territoryCenter: { x: 0, y: 0 },
      };
    }

    // Calculate centroid of visited tiles
    const visits: Position[] = [];
    for (const xCoord in this.spatialMetrics.heatmap) {
      for (const yCoord in this.spatialMetrics.heatmap[Number(xCoord)]) {
        visits.push({ x: Number(xCoord), y: Number(yCoord) });
      }
    }

    if (visits.length > 0) {
      const sumX = visits.reduce((sum, pos) => sum + pos.x, 0);
      const sumY = visits.reduce((sum, pos) => sum + pos.y, 0);
      this.spatialMetrics.agents[agentId].territoryCenter = {
        x: sumX / visits.length,
        y: sumY / visits.length,
      };
    }

    // Prune heatmap if it's grown too large
    this.pruneHeatmapIfNeeded();
  }

  /**
   * Handle pathfinding failed event
   */
  private handlePathfindingFailed(_event: Record<string, unknown>): void {
    this.spatialMetrics.pathfindingFailures++;
  }

  /**
   * Handle activity event
   */
  private handleActivity(event: Record<string, unknown>): void {
    const agentId = event.agentId as string;
    const activity = event.activity as string;
    const timestamp = event.timestamp as number;

    const metrics = this.getOrCreateBehavioralMetrics(agentId);

    if (event.type === 'activity:started') {
      // Store start time for duration calculation
      (metrics as any)[`_${activity}_start`] = timestamp;
    } else if (event.type === 'activity:ended') {
      const startTime = (metrics as any)[`_${activity}_start`];
      if (startTime !== undefined) {
        const duration = timestamp - startTime;
        if (!metrics.activityBreakdown[activity]) {
          metrics.activityBreakdown[activity] = 0;
        }
        metrics.activityBreakdown[activity] += duration;
        delete (metrics as any)[`_${activity}_start`];

        // Update efficiency score
        const isProductive = activity !== 'idle';
        if (isProductive) {
          metrics.productiveTime += duration;
        } else {
          metrics.idleTime += duration;
        }
        const totalTime = metrics.productiveTime + metrics.idleTime;
        if (totalTime > 0) {
          metrics.efficiencyScore = metrics.productiveTime / totalTime;
        }
      }
    }
  }

  /**
   * Handle task event
   */
  private handleTask(event: Record<string, unknown>): void {
    const agentId = event.agentId as string;
    const metrics = this.getOrCreateBehavioralMetrics(agentId);

    if (event.type === 'task:started') {
      metrics.tasksStarted++;
    } else if (event.type === 'task:completed') {
      metrics.tasksCompleted++;
    } else if (event.type === 'task:abandoned') {
      metrics.tasksAbandoned++;
    }

    // Update completion rate
    if (metrics.tasksStarted > 0) {
      metrics.taskCompletionRate = metrics.tasksCompleted / metrics.tasksStarted;
    }
  }

  /**
   * Handle LLM call event
   */
  private handleLLMCall(event: Record<string, unknown>): void {
    const model = event.model as 'haiku' | 'sonnet' | 'opus';
    const tokensConsumed = event.tokensConsumed as number;

    this.intelligenceMetrics.llmCalls[model]++;
    this.intelligenceMetrics.tokensConsumed[model] += tokensConsumed;
    this.intelligenceMetrics.tokensConsumed.total += tokensConsumed;

    // Calculate estimated cost (example rates)
    const costPerToken = {
      haiku: 0.00001,
      sonnet: 0.00003,
      opus: 0.00015,
    };
    const cost = tokensConsumed * costPerToken[model];
    this.intelligenceMetrics.estimatedCost[model] += cost;
    this.intelligenceMetrics.estimatedCost.total += cost;

    // Update average tokens per decision
    const purpose = event.purpose as string;
    if (purpose === 'decision') {
      const totalDecisionCalls = Object.values(this.intelligenceMetrics.llmCalls).reduce((sum, count) => sum + count, 0);
      this.intelligenceMetrics.avgTokensPerDecision =
        this.intelligenceMetrics.tokensConsumed.total / totalDecisionCalls;
    }
  }

  // Plan tracking
  private planCount = 0;
  private successfulPlans = 0;

  /**
   * Handle plan event
   */
  private handlePlan(event: Record<string, unknown>): void {
    // Track plan success rate
    if (event.type === 'plan:created') {
      this.planCount++;
    } else if (event.type === 'plan:completed') {
      const success = event.success as boolean;
      if (success) {
        this.successfulPlans++;
      }
      // Calculate actual success rate
      if (this.planCount > 0) {
        this.intelligenceMetrics.planSuccessRate = this.successfulPlans / this.planCount;
      }
    }
  }

  /**
   * Handle system tick event
   */
  private handleSystemTick(event: Record<string, unknown>): void {
    const system = event.system as string;
    const duration = event.duration as number;

    this.performanceMetrics.systemTiming[system] = duration;

    // Find slowest system
    let slowest = '';
    let maxDuration = 0;
    for (const [sys, dur] of Object.entries(this.performanceMetrics.systemTiming)) {
      if (dur > maxDuration) {
        maxDuration = dur;
        slowest = sys;
      }
    }
    this.performanceMetrics.slowestSystem = slowest;
  }

  /**
   * Handle session event
   */
  private handleSession(event: Record<string, unknown>): void {
    if (event.type === 'session:started') {
      this.sessionMetrics.startTime = event.timestamp as number;
    } else if (event.type === 'session:ended') {
      this.sessionMetrics.endTime = event.timestamp as number;
      this.sessionMetrics.realTimeDuration = this.sessionMetrics.endTime - this.sessionMetrics.startTime;
      this.sessionMetrics.gameEndReason = event.reason as any;
    }
  }

  /**
   * Handle player intervention event
   */
  private handlePlayerIntervention(_event: Record<string, unknown>): void {
    this.sessionMetrics.playerInterventions++;
  }

  /**
   * Handle game speed changed event
   */
  private handleGameSpeedChanged(event: Record<string, unknown>): void {
    const timestamp = event.timestamp as number;
    const speed = event.speed as number;
    this.addBoundedSample(this.sessionMetrics.gameSpeed, { timestamp, value: speed });
  }

  // Storage for custom analysis events
  private populationSamples: Array<{ timestamp: number; population: number }> = [];
  private generationData: Array<{ timestamp: number; generation: number; avgIntelligence: number }> = [];
  private survivalRateData: Array<{ timestamp: number; rate: number; context: string }> = [];
  private testMetrics: Map<string, Array<{ timestamp: number; value: number }>> = new Map();

  /**
   * Handle population sampled event
   */
  private handlePopulationSampled(event: Record<string, unknown>): void {
    const timestamp = event.timestamp as number;
    const population = event.population as number;
    this.addBoundedSample(this.populationSamples, { timestamp, population });
  }

  /**
   * Handle generation completed event
   */
  private handleGenerationCompleted(event: Record<string, unknown>): void {
    const timestamp = event.timestamp as number;
    const generation = event.generation as number;
    const avgIntelligence = event.avgIntelligence as number;
    this.addBoundedSample(this.generationData, { timestamp, generation, avgIntelligence });
  }

  /**
   * Handle survival rate calculated event
   */
  private handleSurvivalRateCalculated(event: Record<string, unknown>): void {
    const timestamp = event.timestamp as number;
    const rate = event.rate as number;
    const context = event.context as string;
    this.addBoundedSample(this.survivalRateData, { timestamp, rate, context });
  }

  /**
   * Handle test metric events
   */
  private handleTestMetric(event: Record<string, unknown>): void {
    const type = event.type as string;
    const timestamp = event.timestamp as number;
    const value = event.value as number;

    if (!this.testMetrics.has(type)) {
      this.testMetrics.set(type, []);
    }
    this.addBoundedSample(this.testMetrics.get(type)!, { timestamp, value });
  }

  /**
   * Get population samples
   */
  getPopulationSamples(): Array<{ timestamp: number; population: number }> {
    return this.populationSamples;
  }

  /**
   * Get generation data
   */
  getGenerationData(): Array<{ timestamp: number; generation: number; avgIntelligence: number }> {
    return this.generationData;
  }

  /**
   * Get survival rate data
   */
  getSurvivalRateData(): Array<{ timestamp: number; rate: number; context: string }> {
    return this.survivalRateData;
  }

  /**
   * Get test metric data
   */
  getTestMetricData(type: string): Array<{ timestamp: number; value: number }> {
    return this.testMetrics.get(type) || [];
  }

  /**
   * Get or create needs metrics for an agent
   */
  private getOrCreateNeedsMetrics(agentId: string): NeedsMetrics {
    if (!this.needsMetrics.has(agentId)) {
      this.needsMetrics.set(agentId, {
        hunger: [],
        thirst: [],
        energy: [],
        temperature: [],
        health: [],
        avgHunger: 0,
        minHunger: 100,
        hungerCrisisEvents: 0,
        avgEnergy: 0,
        sleepDeprivationEvents: 0,
        avgTemperature: 0,
        hypothermiaEvents: 0,
        heatstrokeEvents: 0,
        foodConsumed: {},
        waterConsumed: 0,
        sleepHours: 0,
      });
    }
    return this.needsMetrics.get(agentId)!;
  }

  /**
   * Get or create behavioral metrics for an agent
   */
  private getOrCreateBehavioralMetrics(agentId: string): BehavioralMetrics[string] {
    if (!this.behavioralMetrics.has(agentId)) {
      this.behavioralMetrics.set(agentId, {
        activityBreakdown: {},
        decisionsPerHour: 0,
        decisionLatency: 0,
        decisionChanges: 0,
        tasksStarted: 0,
        tasksCompleted: 0,
        tasksAbandoned: 0,
        taskCompletionRate: 0,
        avgTaskDuration: 0,
        idleTime: 0,
        productiveTime: 0,
        efficiencyScore: 0,
      });
    }
    return this.behavioralMetrics.get(agentId)!;
  }

  /**
   * Sample metrics for a specific agent
   */
  sampleMetrics(agentId: string, needs: NeedsSample, timestamp: number): void {
    // Validate agent exists in lifecycle (was born)
    if (!this.agentLifecycle.has(agentId)) {
      throw new Error(`Cannot sample metrics for non-existent agent: ${agentId}`);
    }

    const metrics = this.getOrCreateNeedsMetrics(agentId);

    // Record samples with bounded arrays
    this.addBoundedSample(metrics.hunger, { timestamp, value: needs.hunger });
    this.addBoundedSample(metrics.thirst, { timestamp, value: needs.thirst });
    this.addBoundedSample(metrics.energy, { timestamp, value: needs.energy });
    this.addBoundedSample(metrics.temperature, { timestamp, value: needs.temperature });
    this.addBoundedSample(metrics.health, { timestamp, value: needs.health });

    // Track crisis events (hunger below 10% triggers crisis)
    if (needs.hunger < 10) {
      metrics.hungerCrisisEvents++;
    }

    // Update averages
    metrics.avgHunger = metrics.hunger.reduce((sum, d) => sum + d.value, 0) / metrics.hunger.length;
    metrics.minHunger = Math.min(metrics.minHunger, needs.hunger);
  }

  /**
   * Sample performance metrics
   */
  samplePerformance(sample: PerformanceSample, timestamp: number): void {
    this.addBoundedSample(this.performanceMetrics.fps, { timestamp, value: sample.fps });
    this.addBoundedSample(this.performanceMetrics.tickDuration, { timestamp, value: sample.tickDuration });
    this.addBoundedSample(this.performanceMetrics.memoryUsage, { timestamp, value: sample.memoryUsage });

    // Update aggregates
    const fpsValues = this.performanceMetrics.fps.map(d => d.value);
    this.performanceMetrics.avgFps = fpsValues.reduce((sum, fps) => sum + fps, 0) / fpsValues.length;
    this.performanceMetrics.minFps = Math.min(this.performanceMetrics.minFps, sample.fps);

    // Track frame drops
    if (sample.fps < 30) {
      this.performanceMetrics.frameDrops++;
    }

    // Track peak memory
    this.performanceMetrics.peakMemory = Math.max(this.performanceMetrics.peakMemory, sample.memoryUsage);
  }

  /** Maximum entries for emergent metrics arrays */
  private static readonly MAX_EMERGENT_ENTRIES = 1000;

  /**
   * Detect and record an emergent pattern
   */
  detectPattern(pattern: EmergentPattern): void {
    this.emergentMetrics.detectedPatterns.push(pattern);
    // Prune oldest entries if over limit
    if (this.emergentMetrics.detectedPatterns.length > MetricsCollector.MAX_EMERGENT_ENTRIES) {
      this.emergentMetrics.detectedPatterns.shift();
    }
  }

  /**
   * Record an anomaly
   */
  recordAnomaly(anomaly: Anomaly): void {
    this.emergentMetrics.anomalies.push(anomaly);
    // Prune oldest entries if over limit
    if (this.emergentMetrics.anomalies.length > MetricsCollector.MAX_EMERGENT_ENTRIES) {
      this.emergentMetrics.anomalies.shift();
    }
  }

  /**
   * Record a milestone
   */
  recordMilestone(milestone: Milestone): void {
    this.emergentMetrics.milestones.push(milestone);
    // Prune oldest entries if over limit
    if (this.emergentMetrics.milestones.length > MetricsCollector.MAX_EMERGENT_ENTRIES) {
      this.emergentMetrics.milestones.shift();
    }
  }

  /**
   * Get a specific metric by name
   */
  getMetric(name: string, timeRange?: TimeRange): any {
    let data: any;

    switch (name) {
      case 'agent_lifecycle':
        data = Object.fromEntries(this.agentLifecycle);
        break;
      case 'needs_metrics':
        data = Object.fromEntries(this.needsMetrics);
        break;
      case 'economic_metrics':
        data = this.economicMetrics;
        break;
      case 'social_metrics':
        data = this.socialMetrics;
        break;
      case 'spatial_metrics':
        // Flatten the structure for backward compatibility with tests
        data = {
          ...this.spatialMetrics.agents,
          heatmap: this.spatialMetrics.heatmap,
          pathfindingFailures: this.spatialMetrics.pathfindingFailures,
        };
        break;
      case 'behavioral_metrics':
        data = Object.fromEntries(this.behavioralMetrics);
        break;
      case 'intelligence_metrics':
        data = this.intelligenceMetrics;
        break;
      case 'performance_metrics':
        data = this.performanceMetrics;
        break;
      case 'emergent_metrics':
        data = this.emergentMetrics;
        break;
      case 'session_metrics':
        data = this.sessionMetrics;
        break;
      default:
        throw new Error(`Unknown metric: ${name}`);
    }

    // Apply time range filter if provided
    if (timeRange && name === 'agent_lifecycle') {
      const filtered: Record<string, AgentLifecycleMetrics> = {};
      for (const [agentId, metrics] of Object.entries(data as Record<string, AgentLifecycleMetrics>)) {
        if (metrics.birthTimestamp >= timeRange.startTime && metrics.birthTimestamp <= timeRange.endTime) {
          filtered[agentId] = metrics;
        }
      }
      return filtered;
    }

    return data;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, any> {
    // Check if we have any data at all
    const hasAnyData =
      this.agentLifecycle.size > 0 ||
      this.needsMetrics.size > 0 ||
      Object.keys(this.economicMetrics.resourcesGathered).length > 0 ||
      Object.keys(this.economicMetrics.resourcesConsumed).length > 0 ||
      this.socialMetrics.relationshipsFormed > 0 ||
      Object.keys(this.spatialMetrics.agents).length > 0 ||
      this.behavioralMetrics.size > 0 ||
      this.performanceMetrics.fps.length > 0 ||
      this.emergentMetrics.detectedPatterns.length > 0;

    if (!hasAnyData) {
      return {};
    }

    return {
      agent_lifecycle: Object.fromEntries(this.agentLifecycle),
      needs_metrics: Object.fromEntries(this.needsMetrics),
      economic_metrics: this.economicMetrics,
      social_metrics: this.socialMetrics,
      spatial_metrics: this.spatialMetrics,
      behavioral_metrics: Object.fromEntries(this.behavioralMetrics),
      intelligence_metrics: this.intelligenceMetrics,
      performance_metrics: this.performanceMetrics,
      emergent_metrics: this.emergentMetrics,
      session_metrics: this.sessionMetrics,
    };
  }

  /**
   * Get aggregated metric
   */
  getAggregatedMetric(name: string, options: Partial<AggregationOptions>): any {
    if (!options.aggregation) {
      throw new Error('Aggregation type must be specified');
    }

    const { aggregation } = options;

    if (!['avg', 'sum', 'min', 'max', 'rate', 'most_common', 'net'].includes(aggregation)) {
      throw new Error(`Unknown aggregation type: ${aggregation}`);
    }

    switch (name) {
      case 'lifespan_by_generation': {
        const { generation } = options;
        const lifespans: number[] = [];
        for (const metrics of this.agentLifecycle.values()) {
          if (metrics.birthGeneration === generation && metrics.lifespan) {
            lifespans.push(metrics.lifespan);
          }
        }
        if (aggregation === 'avg') {
          return lifespans.reduce((sum, l) => sum + l, 0) / lifespans.length;
        }
        break;
      }

      case 'death_causes': {
        const causes = new Map<string, number>();
        for (const metrics of this.agentLifecycle.values()) {
          if (metrics.causeOfDeath) {
            causes.set(metrics.causeOfDeath, (causes.get(metrics.causeOfDeath) || 0) + 1);
          }
        }
        if (aggregation === 'most_common') {
          let mostCommon = '';
          let maxCount = 0;
          for (const [cause, count] of causes) {
            if (count > maxCount) {
              maxCount = count;
              mostCommon = cause;
            }
          }
          return { mostCommon, count: maxCount };
        }
        break;
      }

      case 'hunger': {
        const values: number[] = [];
        const timestamp = options.timestamp;

        for (const metrics of this.needsMetrics.values()) {
          if (timestamp) {
            const sample = metrics.hunger.find(d => d.timestamp === timestamp);
            if (sample) values.push(sample.value);
          } else {
            values.push(metrics.avgHunger);
          }
        }

        if (aggregation === 'avg') {
          return values.reduce((sum, v) => sum + v, 0) / values.length;
        } else if (aggregation === 'min') {
          return Math.min(...values);
        } else if (aggregation === 'max') {
          return Math.max(...values);
        }
        break;
      }

      case 'resources_gathered': {
        const { resourceType } = options;
        if (!resourceType) break;

        const metrics = this.economicMetrics.resourcesGathered[resourceType];
        if (!metrics) return 0;

        if (aggregation === 'sum') {
          return metrics.totalGathered;
        }
        break;
      }

      case 'gather_rate': {
        const { resourceType, startTime, endTime } = options;
        if (!resourceType || startTime === undefined || endTime === undefined) break;

        const metrics = this.economicMetrics.resourcesGathered[resourceType];
        if (!metrics) return 0;

        if (aggregation === 'rate') {
          const hours = (endTime - startTime) / 3600000;
          return metrics.totalGathered / hours;
        }
        break;
      }

      case 'resource_balance': {
        const { resourceType } = options;
        if (!resourceType) break;

        if (aggregation === 'net') {
          const gathered = this.economicMetrics.resourcesGathered[resourceType]?.totalGathered || 0;
          const consumed = this.economicMetrics.resourcesConsumed[resourceType]?.totalConsumed || 0;
          return gathered - consumed;
        }
        break;
      }
    }

    return 0;
  }

  /**
   * Export metrics in the specified format
   */
  exportMetrics(format: ExportFormat): Buffer {
    // Validate format first
    if (format !== 'json' && format !== 'csv') {
      throw new Error(`Unsupported export format: ${format}`);
    }

    const metrics = this.getAllMetrics();

    if (Object.keys(metrics).length === 0) {
      throw new Error('No metrics available to export');
    }

    if (format === 'json') {
      return Buffer.from(JSON.stringify(metrics, null, 2));
    } else if (format === 'csv') {
      // Simple CSV export for agent lifecycle
      const lines: string[] = ['agent_lifecycle'];
      for (const [agentId, data] of Object.entries(metrics.agent_lifecycle || {})) {
        lines.push(`${agentId},${JSON.stringify(data)}`);
      }
      return Buffer.from(lines.join('\n'));
    }

    // This should never be reached due to validation above
    throw new Error(`Unsupported export format: ${format}`);
  }

  /**
   * Start periodic sampling
   */
  startPeriodicSampling(interval: number): void {
    this.samplingInterval = setInterval(() => {
      // No-op: Actual sampling is done by MetricsCollectionSystem.update()
      // This method just sets up the interval mechanism for testing
    }, interval);
  }

  /**
   * Stop periodic sampling
   */
  stopPeriodicSampling(): void {
    if (this.samplingInterval) {
      clearInterval(this.samplingInterval);
      this.samplingInterval = undefined;
    }
  }

  /**
   * Apply retention policy
   */
  applyRetentionPolicy(): void {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);

    // Move old metrics to cold storage
    for (const [agentId, metrics] of this.hotStorage) {
      if (metrics.birthTimestamp < oneHourAgo) {
        this.coldStorage.set(agentId, metrics);
        this.hotStorage.delete(agentId);
      }
    }
  }

  /**
   * Get hot storage
   */
  getHotStorage(): Map<string, AgentLifecycleMetrics> {
    return this.hotStorage;
  }

  /**
   * Get cold storage
   */
  getColdStorage(): Map<string, AgentLifecycleMetrics> {
    return this.coldStorage;
  }
}
