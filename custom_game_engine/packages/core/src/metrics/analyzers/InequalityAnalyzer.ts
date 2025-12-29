/**
 * InequalityAnalyzer - Economic and social inequality analysis
 *
 * Provides comprehensive inequality metrics:
 * - Gini coefficient for wealth/resource distribution
 * - Lorenz curve calculation
 * - Wealth mobility tracking
 * - Social stratification analysis
 * - Resource concentration indices
 *
 * Part of Phase 24: Sociological Metrics - Analysis Modules
 */

/**
 * Lorenz curve data point
 */
export interface LorenzPoint {
  populationShare: number;
  wealthShare: number;
}

/**
 * Wealth distribution snapshot
 */
export interface WealthSnapshot {
  timestamp: number;
  agentId: string;
  wealth: number;
  percentile: number;
}

/**
 * Mobility tracking result
 */
export interface MobilityResult {
  agentId: string;
  startQuartile: number;
  endQuartile: number;
  direction: 'up' | 'down' | 'stable';
  change: number;
}

/**
 * Social stratum
 */
export interface Stratum {
  name: string;
  minPercentile: number;
  maxPercentile: number;
  population: number;
  avgWealth: number;
  wealthShare: number;
}

/**
 * Inequality summary
 */
export interface InequalitySummary {
  giniCoefficient: number;
  theilIndex: number;
  atkinsonIndex: number;
  palmaRatio: number;
  top1PercentShare: number;
  top10PercentShare: number;
  bottom50PercentShare: number;
  medianToMeanRatio: number;
}

/**
 * Wealth concentration metrics
 */
export interface ConcentrationMetrics {
  herfindahlIndex: number;
  top3Share: number;
  top10Share: number;
  entropy: number;
}

/**
 * Mobility matrix
 */
export interface MobilityMatrix {
  period: { start: number; end: number };
  transitions: number[][]; // [from_quartile][to_quartile]
  upwardMobility: number;
  downwardMobility: number;
  persistenceRate: number;
}

/**
 * InequalityAnalyzer provides economic inequality analysis
 */
export class InequalityAnalyzer {
  private wealthHistory: Map<string, Array<{ timestamp: number; wealth: number }>> = new Map();

  constructor() {
    // Future: May accept MetricsCollector and MetricsStorage when integration is needed
  }

  /**
   * Record wealth for an agent
   */
  recordWealth(agentId: string, wealth: number, timestamp: number = Date.now()): void {
    if (!this.wealthHistory.has(agentId)) {
      this.wealthHistory.set(agentId, []);
    }
    this.wealthHistory.get(agentId)!.push({ timestamp, wealth });

    // Keep only recent history (last 100 snapshots per agent)
    const history = this.wealthHistory.get(agentId)!;
    if (history.length > 100) {
      history.shift();
    }
  }

  /**
   * Get current wealth distribution
   */
  getCurrentDistribution(): WealthSnapshot[] {
    const snapshots: WealthSnapshot[] = [];

    for (const [agentId, history] of this.wealthHistory) {
      if (history.length > 0) {
        const latest = history[history.length - 1]!;
        snapshots.push({
          timestamp: latest.timestamp,
          agentId,
          wealth: latest.wealth,
          percentile: 0, // Will be calculated
        });
      }
    }

    // Sort by wealth and calculate percentiles
    snapshots.sort((a, b) => a.wealth - b.wealth);
    const n = snapshots.length;

    for (let i = 0; i < n; i++) {
      snapshots[i]!.percentile = ((i + 1) / n) * 100;
    }

    return snapshots;
  }

  /**
   * Calculate Gini coefficient
   */
  calculateGini(): number {
    const distribution = this.getCurrentDistribution();
    const n = distribution.length;

    if (n === 0) return 0;

    const totalWealth = distribution.reduce((sum, s) => sum + s.wealth, 0);
    if (totalWealth === 0) return 0;

    // Sort by wealth
    const sorted = [...distribution].sort((a, b) => a.wealth - b.wealth);

    // Calculate Gini using the formula: G = (2 * sum(i * xi)) / (n * sum(xi)) - (n + 1) / n
    let numerator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i + 1) * sorted[i]!.wealth;
    }

    const gini = (2 * numerator) / (n * totalWealth) - (n + 1) / n;

    return Math.max(0, Math.min(1, gini));
  }

  /**
   * Calculate Lorenz curve
   */
  calculateLorenzCurve(points: number = 20): LorenzPoint[] {
    const curve: LorenzPoint[] = [{ populationShare: 0, wealthShare: 0 }];
    const distribution = this.getCurrentDistribution();
    const n = distribution.length;

    if (n === 0) {
      curve.push({ populationShare: 1, wealthShare: 1 });
      return curve;
    }

    const sorted = [...distribution].sort((a, b) => a.wealth - b.wealth);
    const totalWealth = sorted.reduce((sum, s) => sum + s.wealth, 0);

    if (totalWealth === 0) {
      curve.push({ populationShare: 1, wealthShare: 1 });
      return curve;
    }

    // Generate points along the curve
    let cumulativeWealth = 0;

    for (let i = 0; i < points; i++) {
      const targetIndex = Math.floor((i + 1) * n / points);

      // Sum wealth up to this index
      while (cumulativeWealth < sorted.slice(0, targetIndex).reduce((s, x) => s + x.wealth, 0)) {
        cumulativeWealth = sorted.slice(0, targetIndex).reduce((s, x) => s + x.wealth, 0);
      }

      curve.push({
        populationShare: targetIndex / n,
        wealthShare: cumulativeWealth / totalWealth,
      });
    }

    // Ensure we end at (1, 1)
    curve.push({ populationShare: 1, wealthShare: 1 });

    return curve;
  }

  /**
   * Calculate Theil index (entropy-based inequality)
   */
  calculateTheilIndex(): number {
    const distribution = this.getCurrentDistribution();
    const n = distribution.length;

    if (n === 0) return 0;

    const totalWealth = distribution.reduce((sum, s) => sum + s.wealth, 0);
    const avgWealth = totalWealth / n;

    if (avgWealth === 0) return 0;

    let theil = 0;
    for (const snapshot of distribution) {
      if (snapshot.wealth > 0) {
        const ratio = snapshot.wealth / avgWealth;
        theil += ratio * Math.log(ratio);
      }
    }

    return theil / n;
  }

  /**
   * Calculate Atkinson index
   */
  calculateAtkinsonIndex(epsilon: number = 0.5): number {
    const distribution = this.getCurrentDistribution();
    const n = distribution.length;

    if (n === 0) return 0;

    const totalWealth = distribution.reduce((sum, s) => sum + s.wealth, 0);
    const avgWealth = totalWealth / n;

    if (avgWealth === 0) return 0;

    if (epsilon === 1) {
      // Special case: geometric mean
      let logSum = 0;
      for (const snapshot of distribution) {
        if (snapshot.wealth > 0) {
          logSum += Math.log(snapshot.wealth);
        }
      }
      const geometricMean = Math.exp(logSum / n);
      return 1 - geometricMean / avgWealth;
    }

    // General case
    let sum = 0;
    for (const snapshot of distribution) {
      if (snapshot.wealth > 0) {
        sum += Math.pow(snapshot.wealth / avgWealth, 1 - epsilon);
      }
    }

    return 1 - Math.pow(sum / n, 1 / (1 - epsilon));
  }

  /**
   * Calculate Palma ratio (top 10% / bottom 40%)
   */
  calculatePalmaRatio(): number {
    const distribution = this.getCurrentDistribution();
    const n = distribution.length;

    if (n === 0) return 0;

    const sorted = [...distribution].sort((a, b) => a.wealth - b.wealth);

    const bottom40Count = Math.ceil(n * 0.4);
    const top10Count = Math.ceil(n * 0.1);

    const bottom40Wealth = sorted.slice(0, bottom40Count).reduce((sum, s) => sum + s.wealth, 0);
    const top10Wealth = sorted.slice(-top10Count).reduce((sum, s) => sum + s.wealth, 0);

    return bottom40Wealth > 0 ? top10Wealth / bottom40Wealth : Infinity;
  }

  /**
   * Get comprehensive inequality summary
   */
  getInequalitySummary(): InequalitySummary {
    const distribution = this.getCurrentDistribution();
    const n = distribution.length;

    if (n === 0) {
      return {
        giniCoefficient: 0,
        theilIndex: 0,
        atkinsonIndex: 0,
        palmaRatio: 0,
        top1PercentShare: 0,
        top10PercentShare: 0,
        bottom50PercentShare: 0,
        medianToMeanRatio: 0,
      };
    }

    const sorted = [...distribution].sort((a, b) => a.wealth - b.wealth);
    const totalWealth = sorted.reduce((sum, s) => sum + s.wealth, 0);

    // Calculate percentile shares
    const top1Count = Math.max(1, Math.ceil(n * 0.01));
    const top10Count = Math.max(1, Math.ceil(n * 0.1));
    const bottom50Count = Math.floor(n * 0.5);

    const top1Wealth = sorted.slice(-top1Count).reduce((sum, s) => sum + s.wealth, 0);
    const top10Wealth = sorted.slice(-top10Count).reduce((sum, s) => sum + s.wealth, 0);
    const bottom50Wealth = sorted.slice(0, bottom50Count).reduce((sum, s) => sum + s.wealth, 0);

    const median = n % 2 === 0
      ? (sorted[n / 2 - 1]!.wealth + sorted[n / 2]!.wealth) / 2
      : sorted[Math.floor(n / 2)]!.wealth;
    const mean = totalWealth / n;

    return {
      giniCoefficient: this.calculateGini(),
      theilIndex: this.calculateTheilIndex(),
      atkinsonIndex: this.calculateAtkinsonIndex(),
      palmaRatio: this.calculatePalmaRatio(),
      top1PercentShare: totalWealth > 0 ? top1Wealth / totalWealth : 0,
      top10PercentShare: totalWealth > 0 ? top10Wealth / totalWealth : 0,
      bottom50PercentShare: totalWealth > 0 ? bottom50Wealth / totalWealth : 0,
      medianToMeanRatio: mean > 0 ? median / mean : 0,
    };
  }

  /**
   * Analyze social stratification
   */
  analyzeStratification(): Stratum[] {
    const distribution = this.getCurrentDistribution();
    const n = distribution.length;

    if (n === 0) return [];

    const sorted = [...distribution].sort((a, b) => a.wealth - b.wealth);
    const totalWealth = sorted.reduce((sum, s) => sum + s.wealth, 0);

    // Define strata (quintiles with names)
    const strata: Stratum[] = [
      { name: 'Lower', minPercentile: 0, maxPercentile: 20, population: 0, avgWealth: 0, wealthShare: 0 },
      { name: 'Lower-Middle', minPercentile: 20, maxPercentile: 40, population: 0, avgWealth: 0, wealthShare: 0 },
      { name: 'Middle', minPercentile: 40, maxPercentile: 60, population: 0, avgWealth: 0, wealthShare: 0 },
      { name: 'Upper-Middle', minPercentile: 60, maxPercentile: 80, population: 0, avgWealth: 0, wealthShare: 0 },
      { name: 'Upper', minPercentile: 80, maxPercentile: 100, population: 0, avgWealth: 0, wealthShare: 0 },
    ];

    // Assign agents to strata
    for (let i = 0; i < n; i++) {
      const percentile = ((i + 1) / n) * 100;
      const snapshot = sorted[i]!;

      for (const stratum of strata) {
        if (percentile > stratum.minPercentile && percentile <= stratum.maxPercentile) {
          stratum.population++;
          stratum.avgWealth += snapshot.wealth;
          break;
        }
      }
    }

    // Calculate averages and shares
    for (const stratum of strata) {
      if (stratum.population > 0) {
        const stratumWealth = stratum.avgWealth;
        stratum.avgWealth = stratumWealth / stratum.population;
        stratum.wealthShare = totalWealth > 0 ? stratumWealth / totalWealth : 0;
      }
    }

    return strata;
  }

  /**
   * Calculate wealth mobility matrix
   */
  calculateMobilityMatrix(periodStart: number, periodEnd: number): MobilityMatrix {
    const matrix: number[][] = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];

    const startQuartiles = new Map<string, number>();
    const endQuartiles = new Map<string, number>();

    // Get distributions at start and end periods
    for (const [agentId, history] of this.wealthHistory) {
      const startEntry = history.find(h => Math.abs(h.timestamp - periodStart) < 60000);
      const endEntry = history.find(h => Math.abs(h.timestamp - periodEnd) < 60000);

      if (startEntry) {
        startQuartiles.set(agentId, startEntry.wealth);
      }
      if (endEntry) {
        endQuartiles.set(agentId, endEntry.wealth);
      }
    }

    // Convert to actual quartiles
    const assignQuartile = (values: Map<string, number>): Map<string, number> => {
      const sorted = Array.from(values.entries()).sort((a, b) => a[1] - b[1]);
      const n = sorted.length;
      const quartiles = new Map<string, number>();

      for (let i = 0; i < n; i++) {
        const quartile = Math.min(3, Math.floor((i / n) * 4));
        quartiles.set(sorted[i]![0], quartile);
      }

      return quartiles;
    };

    const startQ = assignQuartile(startQuartiles);
    const endQ = assignQuartile(endQuartiles);

    // Build transition matrix
    for (const [agentId, fromQ] of startQ) {
      const toQ = endQ.get(agentId);
      if (toQ !== undefined) {
        matrix[fromQ]![toQ]!++;
      }
    }

    // Calculate mobility metrics
    let upward = 0, downward = 0, persistent = 0, total = 0;

    for (let from = 0; from < 4; from++) {
      for (let to = 0; to < 4; to++) {
        const count = matrix[from]![to]!;
        total += count;
        if (to > from) upward += count;
        if (to < from) downward += count;
        if (to === from) persistent += count;
      }
    }

    return {
      period: { start: periodStart, end: periodEnd },
      transitions: matrix,
      upwardMobility: total > 0 ? upward / total : 0,
      downwardMobility: total > 0 ? downward / total : 0,
      persistenceRate: total > 0 ? persistent / total : 0,
    };
  }

  /**
   * Track individual mobility
   */
  trackIndividualMobility(): MobilityResult[] {
    const results: MobilityResult[] = [];

    for (const [agentId, history] of this.wealthHistory) {
      if (history.length < 2) continue;

      const startWealth = history[0]!.wealth;
      const endWealth = history[history.length - 1]!.wealth;

      // Get quartiles
      const allWealths = Array.from(this.wealthHistory.values())
        .map(h => h.length > 0 ? h[h.length - 1]!.wealth : 0)
        .sort((a, b) => a - b);

      const getQuartile = (wealth: number): number => {
        const n = allWealths.length;
        for (let i = 0; i < n; i++) {
          if (wealth <= allWealths[i]!) {
            return Math.min(3, Math.floor((i / n) * 4));
          }
        }
        return 3;
      };

      const startQuartile = getQuartile(startWealth);
      const endQuartile = getQuartile(endWealth);

      let direction: 'up' | 'down' | 'stable';
      if (endQuartile > startQuartile) direction = 'up';
      else if (endQuartile < startQuartile) direction = 'down';
      else direction = 'stable';

      results.push({
        agentId,
        startQuartile,
        endQuartile,
        direction,
        change: endWealth - startWealth,
      });
    }

    return results;
  }

  /**
   * Calculate concentration metrics
   */
  calculateConcentration(): ConcentrationMetrics {
    const distribution = this.getCurrentDistribution();
    const n = distribution.length;

    if (n === 0) {
      return {
        herfindahlIndex: 0,
        top3Share: 0,
        top10Share: 0,
        entropy: 0,
      };
    }

    const sorted = [...distribution].sort((a, b) => b.wealth - a.wealth);
    const totalWealth = sorted.reduce((sum, s) => sum + s.wealth, 0);

    if (totalWealth === 0) {
      return {
        herfindahlIndex: 0,
        top3Share: 0,
        top10Share: 0,
        entropy: 0,
      };
    }

    // Herfindahl-Hirschman Index
    let hhi = 0;
    for (const snapshot of distribution) {
      const share = snapshot.wealth / totalWealth;
      hhi += share * share;
    }

    // Top shares
    const top3 = sorted.slice(0, 3).reduce((sum, s) => sum + s.wealth, 0);
    const top10 = sorted.slice(0, Math.max(1, Math.ceil(n * 0.1))).reduce((sum, s) => sum + s.wealth, 0);

    // Entropy (wealth distribution diversity)
    let entropy = 0;
    for (const snapshot of distribution) {
      if (snapshot.wealth > 0) {
        const share = snapshot.wealth / totalWealth;
        entropy -= share * Math.log(share);
      }
    }

    return {
      herfindahlIndex: hhi,
      top3Share: top3 / totalWealth,
      top10Share: top10 / totalWealth,
      entropy,
    };
  }

  /**
   * Clear wealth history
   */
  clear(): void {
    this.wealthHistory.clear();
  }

  /**
   * Export for visualization
   */
  exportForVisualization(): {
    distribution: WealthSnapshot[];
    lorenzCurve: LorenzPoint[];
    summary: InequalitySummary;
    stratification: Stratum[];
    concentration: ConcentrationMetrics;
  } {
    return {
      distribution: this.getCurrentDistribution(),
      lorenzCurve: this.calculateLorenzCurve(),
      summary: this.getInequalitySummary(),
      stratification: this.analyzeStratification(),
      concentration: this.calculateConcentration(),
    };
  }
}
