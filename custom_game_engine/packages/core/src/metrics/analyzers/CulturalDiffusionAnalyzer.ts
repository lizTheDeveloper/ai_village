/**
 * CulturalDiffusionAnalyzer - Behavior and cultural spread analysis
 *
 * Tracks how behaviors, ideas, and innovations spread through the population:
 * - Behavior adoption cascades
 * - Innovation tracking and diffusion rates
 * - Cultural trait transmission
 * - Adoption curves (S-curves)
 * - Influence network analysis
 *
 * Part of Phase 24: Sociological Metrics - Analysis Modules
 */

/**
 * Behavior adoption event
 */
export interface AdoptionEvent {
  timestamp: number;
  agentId: string;
  behavior: string;
  previousBehavior?: string;
  source?: string; // Agent they learned from
}

/**
 * Innovation (new behavior or trait)
 */
export interface Innovation {
  id: string;
  name: string;
  firstObserved: number;
  originator: string;
  currentAdopters: Set<string>;
  adoptionHistory: Array<{ timestamp: number; count: number }>;
}

/**
 * Diffusion cascade
 */
export interface DiffusionCascade {
  innovationId: string;
  nodes: Array<{
    agentId: string;
    adoptedAt: number;
    source?: string;
    depth: number;
  }>;
  maxDepth: number;
  totalAdopters: number;
  avgTimeToAdopt: number;
}

/**
 * Adoption curve data
 */
export interface AdoptionCurve {
  innovationId: string;
  points: Array<{ timestamp: number; adoptionRate: number }>;
  currentPhase: 'innovators' | 'early_adopters' | 'early_majority' | 'late_majority' | 'laggards';
  saturationRate: number;
  timeToHalfAdoption?: number;
}

/**
 * Influencer metrics
 */
export interface InfluencerMetrics {
  agentId: string;
  innovationsOriginated: number;
  timesInfluenced: number;
  avgCascadeSize: number;
  influenceReach: number;
}

/**
 * Cultural trait
 */
export interface CulturalTrait {
  name: string;
  carriers: Set<string>;
  prevalence: number;
  stability: number;
  firstObserved: number;
}

/**
 * Diffusion metrics summary
 */
export interface DiffusionSummary {
  totalInnovations: number;
  activeInnovations: number;
  avgDiffusionRate: number;
  avgCascadeSize: number;
  topInfluencers: InfluencerMetrics[];
  dominantBehaviors: Array<{ behavior: string; share: number }>;
}

/**
 * Transmission event
 */
export interface TransmissionEvent {
  timestamp: number;
  from: string;
  to: string;
  trait: string;
  success: boolean;
}

/**
 * CulturalDiffusionAnalyzer tracks behavior and cultural spread
 */
export class CulturalDiffusionAnalyzer {
  private innovations: Map<string, Innovation> = new Map();
  private adoptionEvents: AdoptionEvent[] = [];
  private transmissionEvents: TransmissionEvent[] = [];
  private currentBehaviors: Map<string, string> = new Map();
  private behaviorHistory: Map<string, Array<{ timestamp: number; behavior: string }>> = new Map();

  constructor() {
    // Future: May accept MetricsCollector and MetricsStorage when integration is needed
  }

  /**
   * Record a behavior adoption
   */
  recordAdoption(
    agentId: string,
    behavior: string,
    previousBehavior?: string,
    source?: string,
    timestamp: number = Date.now()
  ): void {
    const event: AdoptionEvent = {
      timestamp,
      agentId,
      behavior,
      previousBehavior,
      source,
    };

    this.adoptionEvents.push(event);
    this.currentBehaviors.set(agentId, behavior);

    // Track behavior history
    if (!this.behaviorHistory.has(agentId)) {
      this.behaviorHistory.set(agentId, []);
    }
    this.behaviorHistory.get(agentId)!.push({ timestamp, behavior });

    // Check if this is a new innovation
    if (!this.innovations.has(behavior)) {
      this.innovations.set(behavior, {
        id: behavior,
        name: behavior,
        firstObserved: timestamp,
        originator: agentId,
        currentAdopters: new Set([agentId]),
        adoptionHistory: [{ timestamp, count: 1 }],
      });
    } else {
      const innovation = this.innovations.get(behavior)!;
      innovation.currentAdopters.add(agentId);
      innovation.adoptionHistory.push({
        timestamp,
        count: innovation.currentAdopters.size,
      });
    }

    // Record transmission if there's a source
    if (source) {
      this.transmissionEvents.push({
        timestamp,
        from: source,
        to: agentId,
        trait: behavior,
        success: true,
      });
    }

    // Limit history size
    if (this.adoptionEvents.length > 10000) {
      this.adoptionEvents.shift();
    }
  }

  /**
   * Record a failed transmission attempt
   */
  recordFailedTransmission(from: string, to: string, trait: string, timestamp: number = Date.now()): void {
    this.transmissionEvents.push({
      timestamp,
      from,
      to,
      trait,
      success: false,
    });
  }

  /**
   * Get all tracked innovations
   */
  getInnovations(): Innovation[] {
    return Array.from(this.innovations.values());
  }

  /**
   * Calculate diffusion cascade for an innovation
   */
  calculateCascade(innovationId: string): DiffusionCascade | null {
    const innovation = this.innovations.get(innovationId);
    if (!innovation) return null;

    // Build cascade tree from adoption events
    const adoptions = this.adoptionEvents.filter(e => e.behavior === innovationId);
    const nodes: DiffusionCascade['nodes'] = [];
    const visited = new Set<string>();

    // Start with originator
    nodes.push({
      agentId: innovation.originator,
      adoptedAt: innovation.firstObserved,
      depth: 0,
    });
    visited.add(innovation.originator);

    // Build tree using BFS
    let currentDepth = 0;
    let maxDepth = 0;
    let totalTime = 0;
    let adoptionCount = 1;

    const queue: string[] = [innovation.originator];

    while (queue.length > 0) {
      const currentLevel = [...queue];
      queue.length = 0;
      currentDepth++;

      for (const source of currentLevel) {
        // Find agents who adopted from this source
        const influenced = adoptions.filter(e => e.source === source && !visited.has(e.agentId));

        for (const adoption of influenced) {
          visited.add(adoption.agentId);
          nodes.push({
            agentId: adoption.agentId,
            adoptedAt: adoption.timestamp,
            source,
            depth: currentDepth,
          });
          queue.push(adoption.agentId);
          maxDepth = Math.max(maxDepth, currentDepth);
          totalTime += adoption.timestamp - innovation.firstObserved;
          adoptionCount++;
        }
      }
    }

    return {
      innovationId,
      nodes,
      maxDepth,
      totalAdopters: nodes.length,
      avgTimeToAdopt: adoptionCount > 1 ? totalTime / (adoptionCount - 1) : 0,
    };
  }

  /**
   * Calculate adoption curve for an innovation
   */
  calculateAdoptionCurve(innovationId: string): AdoptionCurve | null {
    const innovation = this.innovations.get(innovationId);
    if (!innovation) return null;

    const totalPopulation = this.currentBehaviors.size || 1;
    const points: AdoptionCurve['points'] = [];

    // Generate time series of adoption rates
    for (const { timestamp, count } of innovation.adoptionHistory) {
      points.push({
        timestamp,
        adoptionRate: count / totalPopulation,
      });
    }

    // Determine current phase based on adoption rate
    const currentRate = innovation.currentAdopters.size / totalPopulation;
    let currentPhase: AdoptionCurve['currentPhase'];

    if (currentRate < 0.025) {
      currentPhase = 'innovators';
    } else if (currentRate < 0.16) {
      currentPhase = 'early_adopters';
    } else if (currentRate < 0.5) {
      currentPhase = 'early_majority';
    } else if (currentRate < 0.84) {
      currentPhase = 'late_majority';
    } else {
      currentPhase = 'laggards';
    }

    // Calculate time to half adoption
    let timeToHalfAdoption: number | undefined;
    for (const point of points) {
      if (point.adoptionRate >= 0.5) {
        timeToHalfAdoption = point.timestamp - innovation.firstObserved;
        break;
      }
    }

    return {
      innovationId,
      points,
      currentPhase,
      saturationRate: currentRate,
      timeToHalfAdoption,
    };
  }

  /**
   * Identify top influencers
   */
  identifyInfluencers(limit: number = 10): InfluencerMetrics[] {
    const influencerMap = new Map<string, InfluencerMetrics>();

    // Initialize all agents
    for (const agentId of this.currentBehaviors.keys()) {
      influencerMap.set(agentId, {
        agentId,
        innovationsOriginated: 0,
        timesInfluenced: 0,
        avgCascadeSize: 0,
        influenceReach: 0,
      });
    }

    // Count innovations originated
    for (const innovation of this.innovations.values()) {
      const metrics = influencerMap.get(innovation.originator);
      if (metrics) {
        metrics.innovationsOriginated++;
      }
    }

    // Count influence events
    const influenceCounts = new Map<string, Set<string>>();

    for (const event of this.adoptionEvents) {
      if (event.source) {
        if (!influenceCounts.has(event.source)) {
          influenceCounts.set(event.source, new Set());
        }
        influenceCounts.get(event.source)!.add(event.agentId);
      }
    }

    for (const [agentId, influenced] of influenceCounts) {
      const metrics = influencerMap.get(agentId);
      if (metrics) {
        metrics.timesInfluenced = influenced.size;
        metrics.influenceReach = influenced.size / Math.max(1, this.currentBehaviors.size);
      }
    }

    // Calculate avg cascade size for originators
    for (const innovation of this.innovations.values()) {
      const cascade = this.calculateCascade(innovation.id);
      if (cascade) {
        const metrics = influencerMap.get(innovation.originator);
        if (metrics && metrics.innovationsOriginated > 0) {
          metrics.avgCascadeSize =
            (metrics.avgCascadeSize * (metrics.innovationsOriginated - 1) + cascade.totalAdopters) /
            metrics.innovationsOriginated;
        }
      }
    }

    // Sort by influence reach
    const sorted = Array.from(influencerMap.values())
      .sort((a, b) => b.influenceReach - a.influenceReach)
      .slice(0, limit);

    return sorted;
  }

  /**
   * Analyze behavior distribution
   */
  analyzeBehaviorDistribution(): Array<{ behavior: string; count: number; share: number }> {
    const counts = new Map<string, number>();

    for (const behavior of this.currentBehaviors.values()) {
      counts.set(behavior, (counts.get(behavior) ?? 0) + 1);
    }

    const total = this.currentBehaviors.size;
    const results: Array<{ behavior: string; count: number; share: number }> = [];

    for (const [behavior, count] of counts) {
      results.push({
        behavior,
        count,
        share: total > 0 ? count / total : 0,
      });
    }

    return results.sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate transmission success rate
   */
  calculateTransmissionRate(trait?: string): number {
    const events = trait
      ? this.transmissionEvents.filter(e => e.trait === trait)
      : this.transmissionEvents;

    if (events.length === 0) return 0;

    const successes = events.filter(e => e.success).length;
    return successes / events.length;
  }

  /**
   * Track cultural trait stability
   */
  analyzeCulturalTraits(): CulturalTrait[] {
    const traits: CulturalTrait[] = [];

    for (const [behavior, innovation] of this.innovations) {
      // Calculate stability (how long carriers keep the trait)
      let totalDuration = 0;
      let carrierCount = 0;

      for (const [_agentId, history] of this.behaviorHistory) {
        const adoptions = history.filter(h => h.behavior === behavior);
        if (adoptions.length > 0) {
          // Find how long they held this behavior
          for (let i = 0; i < adoptions.length; i++) {
            const start = adoptions[i]!.timestamp;
            // Find when they switched away
            const nextDifferent = history.find(
              h => h.timestamp > start && h.behavior !== behavior
            );
            const end = nextDifferent?.timestamp ?? Date.now();
            totalDuration += end - start;
            carrierCount++;
          }
        }
      }

      const avgDuration = carrierCount > 0 ? totalDuration / carrierCount : 0;
      const maxDuration = 24 * 60 * 60 * 1000; // 24 hours as reference

      traits.push({
        name: behavior,
        carriers: innovation.currentAdopters,
        prevalence: innovation.currentAdopters.size / Math.max(1, this.currentBehaviors.size),
        stability: Math.min(1, avgDuration / maxDuration),
        firstObserved: innovation.firstObserved,
      });
    }

    return traits.sort((a, b) => b.prevalence - a.prevalence);
  }

  /**
   * Detect behavior clusters (groups with similar behaviors)
   */
  detectBehaviorClusters(): Array<{ behaviors: string[]; members: string[] }> {
    const clusters: Array<{ behaviors: string[]; members: string[] }> = [];
    const behaviorSets = new Map<string, string[]>();

    // Group agents by their behavior sequence
    for (const [agentId, history] of this.behaviorHistory) {
      const recentBehaviors = history.slice(-5).map(h => h.behavior);
      const key = recentBehaviors.join('|');

      if (!behaviorSets.has(key)) {
        behaviorSets.set(key, []);
      }
      behaviorSets.get(key)!.push(agentId);
    }

    // Filter to significant clusters
    for (const [key, members] of behaviorSets) {
      if (members.length >= 2) {
        clusters.push({
          behaviors: key.split('|'),
          members,
        });
      }
    }

    return clusters.sort((a, b) => b.members.length - a.members.length);
  }

  /**
   * Get diffusion summary
   */
  getDiffusionSummary(): DiffusionSummary {
    const behaviors = this.analyzeBehaviorDistribution();

    // Calculate average diffusion rate
    let totalRate = 0;
    let rateCount = 0;

    for (const innovation of this.innovations.values()) {
      const timeSinceStart = Date.now() - innovation.firstObserved;
      if (timeSinceStart > 0) {
        const rate = innovation.currentAdopters.size / (timeSinceStart / 1000);
        totalRate += rate;
        rateCount++;
      }
    }

    // Calculate average cascade size
    let totalCascadeSize = 0;
    for (const innovation of this.innovations.values()) {
      totalCascadeSize += innovation.currentAdopters.size;
    }

    const activeInnovations = Array.from(this.innovations.values())
      .filter(i => i.currentAdopters.size > 0).length;

    return {
      totalInnovations: this.innovations.size,
      activeInnovations,
      avgDiffusionRate: rateCount > 0 ? totalRate / rateCount : 0,
      avgCascadeSize: this.innovations.size > 0 ? totalCascadeSize / this.innovations.size : 0,
      topInfluencers: this.identifyInfluencers(5),
      dominantBehaviors: behaviors.slice(0, 5).map(b => ({
        behavior: b.behavior,
        share: b.share,
      })),
    };
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.innovations.clear();
    this.adoptionEvents = [];
    this.transmissionEvents = [];
    this.currentBehaviors.clear();
    this.behaviorHistory.clear();
  }

  /**
   * Export for visualization
   */
  exportForVisualization(): {
    innovations: Innovation[];
    cascades: Array<DiffusionCascade | null>;
    adoptionCurves: Array<AdoptionCurve | null>;
    behaviorDistribution: Array<{ behavior: string; count: number; share: number }>;
    influencers: InfluencerMetrics[];
    culturalTraits: CulturalTrait[];
    summary: DiffusionSummary;
  } {
    const innovations = this.getInnovations();

    return {
      innovations,
      cascades: innovations.map(i => this.calculateCascade(i.id)),
      adoptionCurves: innovations.map(i => this.calculateAdoptionCurve(i.id)),
      behaviorDistribution: this.analyzeBehaviorDistribution(),
      influencers: this.identifyInfluencers(),
      culturalTraits: this.analyzeCulturalTraits(),
      summary: this.getDiffusionSummary(),
    };
  }
}
